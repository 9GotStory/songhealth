// Search on the public site (Feature 003 #63; spec #51 "Search", ADR 0002, `08`).
//
// EmDash's own search needs SQLite (emdash 1.1.0 src/search/fts-manager.ts), so a search reads the
// published entries of the nine searchable collections through EmDash's query functions when it
// is made, and src/lib/search-matcher.ts matches, ranks, builds the snippets and decides the
// outcome, a failed read included. A collection read
// without a `limit` returns every published entry, and stays published-only whatever a preview
// token or the editor's edit mode asks for (emdash 1.1.0 src/loader.ts: the status defaults to
// "published", `fetchLimit`). Songhealth configures no EmDash object cache, so each search reads
// the database (emdash 1.1.0 src/object-cache/index.ts), and nothing caches the results (spec #51
// "Search": no cache).
//
// Each collection's fields by tier follow spec #51 "Search" (Searchable collections). Personnel is
// not searched, because it has no page of its own. Rich text is read as plain text through
// EmDash's `extractPlainText` (emdash 1.1.0 src/search/text-extraction.ts), which needs no search
// index. A result shows the date and status the list of its kind shows (Product Owner,
// 2026-10-30: #63 comment 6518347225).

import { extractPlainText, getEmDashCollection, type ContentEntry } from "emdash";
import { activityDate, activityPath, type ActivityData } from "./activities";
import {
	announcementDate,
	announcementPath,
	statusOf,
	type AnnouncementData,
	type AnnouncementStatus,
} from "./announcements";
import { basicPagePath, type BasicPageData } from "./basic-pages";
import { listDate, type Instant } from "./dated-lists";
import {
	documentPath,
	listedDomainStatus,
	type DocumentData,
	type DomainStatus,
} from "./documents";
import { healthContentPath, type HealthContentData } from "./health-content";
import { healthReportDate, healthReportPath, type HealthReportData } from "./health-reports";
import {
	healthServicePath,
	isOutOfService,
	shownName,
	type OperationalStatus,
} from "./health-service-directory";
import type { HealthServiceData } from "./health-services";
import { newsPath, type NewsData } from "./news";
import {
	parseSearchRequest,
	searchOutcome,
	type CollectionRead,
	type Searchable,
	type SearchOutcome,
} from "./search-matcher";
import { servicePath } from "./service-catalog";
import type { ServiceData } from "./services";

/** The status a result states, by the kind whose status label shows it. */
type ResultStatus =
	| { kind: "announcement"; value: AnnouncementStatus }
	| { kind: "document"; value: DomainStatus }
	| { kind: "health_service"; value: OperationalStatus };

/** A published entry as a result shows it, with the text the search reads. */
export interface SearchEntry extends Searchable {
	/** The entry's canonical address. */
	href: string;
	/** The title the entry is shown by. */
	title: string;
	/** The date the result shows; none for a kind its list shows undated. */
	shownDate?: Instant;
	status?: ResultStatus;
}

/** The texts of these fields: a string as it is, rich text as plain text, anything else empty. */
function texts(...values: unknown[]): string[] {
	return values.map((value) =>
		typeof value === "string" ? value : Array.isArray(value) ? extractPlainText(value) : "",
	);
}

/** One searchable collection's published entries as results at `now`, or its read's error. */
type Source = (now: Date) => Promise<CollectionRead<SearchEntry>>;

/** A searchable collection, and how each of its published entries reads as a result. */
function source<D>(
	collection: string,
	toEntry: (entry: ContentEntry<D>, now: Date) => SearchEntry,
): Source {
	return async (now) => {
		const { entries, error } = await getEmDashCollection<string, D>(collection, {
			orderBy: { published_at: "desc" },
		});
		return { entries: entries.map((entry) => toEntry(entry, now)), error };
	};
}

/** The searchable collections (spec #51 "Search"). */
const SOURCES: Source[] = [
	source<NewsData>("news", ({ id, data }) => ({
		kind: "news",
		href: newsPath(id),
		title: data.title,
		text: { title: texts(data.title), summary: texts(data.summary), body: texts(data.body) },
		listDate: data.publishedAt,
		shownDate: data.publishedAt,
	})),
	source<ActivityData>("activities", ({ id, data }) => ({
		kind: "activity",
		href: activityPath(id),
		title: data.title,
		text: {
			title: texts(data.title),
			summary: texts(data.summary),
			body: texts(data.location_text, data.participants_text),
		},
		listDate: activityDate(data),
		shownDate: activityDate(data),
	})),
	source<AnnouncementData>("announcements", ({ id, data }, now) => {
		const status = statusOf(data, now);
		return {
			kind: "announcement",
			href: announcementPath(id),
			title: data.title,
			text: { title: texts(data.title), summary: [], body: texts(data.details) },
			listDate: announcementDate(data),
			shownDate: announcementDate(data),
			status: status && { kind: "announcement", value: status },
		};
	}),
	source<ServiceData>("services", ({ id, data }) => ({
		kind: "service",
		href: servicePath(id),
		title: data.title,
		text: {
			title: texts(data.title),
			summary: texts(data.summary),
			body: texts(data.eligibility, data.steps),
		},
		listDate: data.publishedAt,
	})),
	source<HealthServiceData>("health_services", ({ id, data }) => {
		const status = data.operational_status;
		return {
			kind: "health_service",
			href: healthServicePath(id),
			title: shownName(data),
			text: {
				title: texts(data.title, data.display_name),
				summary: texts(data.address),
				body: texts(data.affiliation_text),
			},
			listDate: data.publishedAt,
			status: isOutOfService(status) ? { kind: "health_service", value: status } : undefined,
		};
	}),
	source<HealthContentData>("health_content", ({ id, data }) => ({
		kind: "health_content",
		href: healthContentPath(id),
		title: data.title,
		text: { title: texts(data.title), summary: texts(data.summary), body: texts(data.body) },
		listDate: data.publishedAt,
		shownDate: data.publishedAt,
	})),
	source<HealthReportData>("health_reports", ({ id, data }) => ({
		kind: "health_report",
		href: healthReportPath(id),
		title: data.title,
		text: {
			title: texts(data.title),
			summary: texts(data.summary),
			body: texts(data.reporting_period),
		},
		listDate: healthReportDate(data),
		shownDate: healthReportDate(data),
	})),
	source<DocumentData>("documents", ({ id, data }) => {
		const status = listedDomainStatus(data.domain_status);
		return {
			kind: "document",
			href: documentPath(id),
			title: data.title,
			text: {
				title: texts(data.title),
				summary: texts(data.summary),
				body: texts(data.owner_source),
			},
			listDate: listDate(data.document_at, data.publishedAt),
			shownDate: data.document_at,
			status: status && { kind: "document", value: status },
		};
	}),
	source<BasicPageData>("pages", ({ id, data }) => ({
		kind: "page",
		href: basicPagePath(id),
		title: data.title,
		text: { title: texts(data.title), summary: texts(data.summary), body: texts(data.body) },
		listDate: data.publishedAt,
	})),
];

/**
 * The search an address asks for (`?q=`, `?group=`, `?page=`) at `now`, over the published entries
 * of the searchable collections (src/lib/search-matcher.ts searchOutcome). A failure is logged and
 * shows no detail.
 */
export function search(params: URLSearchParams, now: Date): Promise<SearchOutcome<SearchEntry>> {
	return searchOutcome(parseSearchRequest(params), () =>
		Promise.all(SOURCES.map((read) => read(now))),
	);
}

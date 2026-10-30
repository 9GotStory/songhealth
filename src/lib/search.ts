// Search on the public site (Feature 003 #63; spec #51 "Search", ADR 0002, `08`).
//
// EmDash 1.1.0's own search needs SQLite (emdash src/search/fts-manager.ts), so /search reads the
// published entries of the nine searchable collections through EmDash's query functions when a
// search is made, and src/lib/search-matcher.ts matches, ranks and builds snippets in code. A
// collection read without a `limit` returns every published entry, whatever a preview token or
// the editor's edit mode asks for (src/loader.ts: the status filter defaults to "published",
// `fetchLimit`). Songhealth configures no object cache, so each search reads the database
// (src/object-cache/index.ts), and nothing caches the results (spec #51 "Search": no cache).
//
// The fields of each tier follow spec #51 "Search" (Searchable collections). Personnel is not
// searched, because it has no page of its own. A rich-text field is read as plain text through
// EmDash's `extractPlainText` (src/search/text-extraction.ts), which needs no search index.

import { extractPlainText, getEmDashCollection, type ContentEntry } from "emdash";
import { activityDate, activityPath, type ActivityData } from "./activities";
import {
	announcementDate,
	announcementPath,
	statusOf,
	STATUS_LABELS,
	type AnnouncementData,
} from "./announcements";
import { basicPagePath, type BasicPageData } from "./basic-pages";
import type { Instant } from "./dated-lists";
import { DOMAIN_STATUS_LABELS, documentPath, type DocumentData } from "./documents";
import { healthContentPath, type HealthContentData } from "./health-content";
import { healthReportDate, healthReportPath, type HealthReportData } from "./health-reports";
import {
	healthServicePath,
	isOutOfService,
	OPERATIONAL_STATUS_LABELS,
	shownName,
} from "./health-service-directory";
import type { HealthServiceData } from "./health-services";
import { newsPath, type NewsData } from "./news";
import {
	searchPage,
	type SearchGroupId,
	type Searchable,
	type SearchKind,
	type SearchPage,
} from "./search-matcher";
import { servicePath } from "./service-catalog";
import type { ServiceData } from "./services";

/** Each kind of result as citizens read it, by the GLOSSARY's Thai names. */
export const KIND_LABELS: Record<SearchKind, string> = {
	news: "ข่าว",
	activity: "กิจกรรม",
	announcement: "ประกาศ",
	service: "บริการประชาชน",
	health_service: "หน่วยบริการสุขภาพ",
	health_content: "ความรู้สุขภาพ",
	health_report: "รายงานสุขภาพ",
	document: "เอกสารเผยแพร่",
	page: "หน้าข้อมูล",
};

/** A status a result states in text, and whether it needs attention. */
interface ResultStatus {
	label: string;
	attention: boolean;
}

/** A published entry as a result shows it, with the text the search reads. */
export interface SearchEntry extends Searchable {
	/** The entry's canonical address. */
	href: string;
	/** The title the entry is shown by. */
	shownTitle: string;
	/** The date the result shows, when its kind has one. */
	shownDate?: Instant;
	status?: ResultStatus;
}

/** The text of a field as the search reads it: a string as it is, rich text as plain text. */
function textOf(value: unknown): string {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return extractPlainText(value);
	return "";
}

/** The texts of these fields, rich text as plain text. */
function texts(...values: unknown[]): string[] {
	return values.map(textOf);
}

/** Every published entry of `collection`, newest publication first. */
async function published<D>(collection: string): Promise<ContentEntry<D>[]> {
	const { entries, error } = await getEmDashCollection<string, D>(collection, {
		orderBy: { published_at: "desc" },
	});
	if (error) throw error;
	return entries;
}

/** Every published entry of the searchable collections, as the search reads them, at `now`. */
async function searchableEntries(now: Date): Promise<SearchEntry[]> {
	const [
		news,
		activities,
		announcements,
		services,
		healthServices,
		content,
		reports,
		documents,
		pages,
	] = await Promise.all([
		published<NewsData>("news"),
		published<ActivityData>("activities"),
		published<AnnouncementData>("announcements"),
		published<ServiceData>("services"),
		published<HealthServiceData>("health_services"),
		published<HealthContentData>("health_content"),
		published<HealthReportData>("health_reports"),
		published<DocumentData>("documents"),
		published<BasicPageData>("pages"),
	]);
	return [
		...news.map(({ id, data }): SearchEntry => ({
			kind: "news",
			href: newsPath(id),
			shownTitle: data.title,
			title: texts(data.title),
			summary: texts(data.summary),
			body: texts(data.body),
			date: data.publishedAt,
			shownDate: data.publishedAt,
		})),
		...activities.map(({ id, data }): SearchEntry => ({
			kind: "activity",
			href: activityPath(id),
			shownTitle: data.title,
			title: texts(data.title),
			summary: texts(data.summary),
			body: texts(data.location_text, data.participants_text),
			date: activityDate(data),
			shownDate: activityDate(data),
		})),
		...announcements.map(({ id, data }): SearchEntry => {
			const status = statusOf(data, now);
			return {
				kind: "announcement",
				href: announcementPath(id),
				shownTitle: data.title,
				title: texts(data.title),
				summary: [],
				body: texts(data.details),
				date: announcementDate(data),
				shownDate: announcementDate(data),
				status: status && { label: STATUS_LABELS[status], attention: status === "closed" },
			};
		}),
		...services.map(({ id, data }): SearchEntry => ({
			kind: "service",
			href: servicePath(id),
			shownTitle: data.title,
			title: texts(data.title),
			summary: texts(data.summary),
			body: texts(data.eligibility, data.steps),
			date: data.publishedAt,
		})),
		...healthServices.map(({ id, data }): SearchEntry => {
			const status = data.operational_status;
			return {
				kind: "health_service",
				href: healthServicePath(id),
				shownTitle: shownName(data),
				title: texts(data.title, data.display_name),
				summary: texts(data.address),
				body: texts(data.affiliation_text),
				date: data.publishedAt,
				// Only a status that should stop a citizen from travelling there, as in the directory.
				status: isOutOfService(status)
					? { label: OPERATIONAL_STATUS_LABELS[status], attention: true }
					: undefined,
			};
		}),
		...content.map(({ id, data }): SearchEntry => ({
			kind: "health_content",
			href: healthContentPath(id),
			shownTitle: data.title,
			title: texts(data.title),
			summary: texts(data.summary),
			body: texts(data.body),
			date: data.publishedAt,
			shownDate: data.publishedAt,
		})),
		...reports.map(({ id, data }): SearchEntry => ({
			kind: "health_report",
			href: healthReportPath(id),
			shownTitle: data.title,
			title: texts(data.title),
			summary: texts(data.summary),
			body: texts(data.reporting_period),
			date: healthReportDate(data),
			shownDate: healthReportDate(data),
		})),
		...documents.map(({ id, data }): SearchEntry => {
			const status = data.domain_status;
			return {
				kind: "document",
				href: documentPath(id),
				shownTitle: data.title,
				title: texts(data.title),
				summary: texts(data.summary),
				body: texts(data.owner_source),
				date: data.document_at ?? data.publishedAt,
				shownDate: data.document_at,
				// Only a status that changes what a citizen should do, as in the Document list.
				status:
					status === "superseded" || status === "expired"
						? { label: DOMAIN_STATUS_LABELS[status], attention: true }
						: undefined,
			};
		}),
		...pages.map(({ id, data }): SearchEntry => ({
			kind: "page",
			href: basicPagePath(id),
			shownTitle: data.title,
			title: texts(data.title),
			summary: texts(data.summary),
			body: texts(data.body),
			date: data.publishedAt,
		})),
	];
}

/**
 * Page `page` of the published entries that match every term, in `group`, with the number of
 * results in each group. A failed read throws; the page shows its error state.
 */
export async function search(
	terms: string[],
	group: SearchGroupId,
	page: number,
	now: Date,
): Promise<SearchPage<SearchEntry>> {
	return searchPage(await searchableEntries(now), terms, group, page);
}

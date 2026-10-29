// Documents on the public site (Feature 003 #55; spec #51 "Public reads" (Documents), `03` §10 and
// §15).
//
// A Document is a public record about one authoritative published file (GLOSSARY). Every read goes
// through EmDash's query functions, which return published entries only unless a valid preview
// token asks for a draft (emdash 1.1.0 src/loader.ts, src/query.ts resolveEmDashEntry). Pages
// never pass a status.
//
// The list filters by Document Type, topic and fiscal year through GET parameters, so a filtered
// list has its own address. A `where` on a taxonomy matches the exact term, and one that does not
// exist matches nothing; a fiscal year is a four-digit Buddhist Era year, and any other value is
// ignored rather than sent to the database.

import {
	getEmDashCollection,
	type ContentEntry,
	type FileValue,
	type TaxonomyTerm,
	type WhereValue,
} from "emdash";
import { TOPIC_PARAM } from "./terms";

/** The fixed number of Documents a list page shows. */
const DOCUMENTS_PAGE_SIZE = 20;

/** The query parameter that narrows the list to one Document Type (`document_type` term). */
export const TYPE_PARAM = "type";

/** The query parameter that narrows the list to one fiscal year. */
export const FISCAL_YEAR_PARAM = "year";

/** A fiscal year as Songhealth writes it: four digits of the Buddhist Era, such as 2569. */
const FISCAL_YEAR = /^[0-9]{4}$/;

/** A Document's status in its own domain (`02` §13), not its publication state. */
export type DomainStatus = "current" | "superseded" | "expired";

/** Each Document status as citizens read it. */
export const DOMAIN_STATUS_LABELS: Record<DomainStatus, string> = {
	current: "ฉบับปัจจุบัน",
	superseded: "ถูกแทนที่แล้ว",
	expired: "หมดอายุแล้ว",
};

/** A Document's fields (seed/seed.json) and the system fields public pages read. */
export interface DocumentData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	title: string;
	summary?: string | null;
	file?: FileValue | null;
	document_at?: Date | string | null;
	fiscal_year?: number | null;
	owner_source?: string | null;
	domain_status?: DomainStatus | null;
	publishedAt?: Date | string | null;
	/** Taxonomy terms hydrated by the query functions, by taxonomy name. */
	terms?: Record<string, TaxonomyTerm[]>;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

export type DocumentEntry = ContentEntry<DocumentData>;

/** A Document's canonical address, `/documents/{slug}` (`03` §15), encoded as EmDash encodes it. */
export function documentPath(slug: string): string {
	return `/documents/${encodeURIComponent(slug)}`;
}

/** The list's filters, each a term slug or a fiscal year; empty means not filtered. */
export interface DocumentFilters {
	type: string;
	topic: string;
	year: string;
}

/** The filters a list address asks for. A fiscal year that is not one is ignored. */
export function parseDocumentFilters(params: URLSearchParams): DocumentFilters {
	const year = params.get(FISCAL_YEAR_PARAM) ?? "";
	return {
		type: params.get(TYPE_PARAM)?.trim() ?? "",
		topic: params.get(TOPIC_PARAM)?.trim() ?? "",
		year: FISCAL_YEAR.test(year) ? year : "",
	};
}

/** Whether any filter is set. */
export function isFiltered(filters: DocumentFilters): boolean {
	return filters.type !== "" || filters.topic !== "" || filters.year !== "";
}

/** The list's address with the filters that are set. */
export function documentsPath(filters?: DocumentFilters): string {
	const params = new URLSearchParams();
	if (filters?.type) params.set(TYPE_PARAM, filters.type);
	if (filters?.topic) params.set(TOPIC_PARAM, filters.topic);
	if (filters?.year) params.set(FISCAL_YEAR_PARAM, filters.year);
	const query = params.toString();
	return query === "" ? "/documents" : `/documents?${query}`;
}

export interface DocumentsPage {
	entries: DocumentEntry[];
	hasMore: boolean;
}

/** One page of published Documents matching every filter that is set, newest publication first. */
export async function listDocuments(
	page: number,
	filters: DocumentFilters,
): Promise<DocumentsPage> {
	const where: Record<string, WhereValue> = {};
	if (filters.type) where.document_type = filters.type;
	if (filters.topic) where.topic = filters.topic;
	if (filters.year) where.fiscal_year = filters.year;
	const { entries, hasMore, error } = await getEmDashCollection<"documents", DocumentData>(
		"documents",
		{
			limit: DOCUMENTS_PAGE_SIZE,
			offset: (page - 1) * DOCUMENTS_PAGE_SIZE,
			orderBy: { published_at: "desc" },
			where,
		},
	);
	if (error) throw error;
	return { entries, hasMore: hasMore === true };
}

/**
 * The fiscal years of published Documents, newest first, each once. EmDash's query functions offer
 * no distinct values, so this walks down the years: each step reads the one Document with the
 * highest year below the last one found (a range on a field column, emdash 1.1.0 src/loader.ts
 * buildFieldConditions), one read per year.
 */
export async function fiscalYears(): Promise<number[]> {
	const years: number[] = [];
	for (;;) {
		const below = years.at(-1);
		const { entries, error } = await getEmDashCollection<"documents", DocumentData>("documents", {
			limit: 1,
			orderBy: { fiscal_year: "desc" },
			where: { fiscal_year: below === undefined ? { gte: "0" } : { lt: String(below) } },
		});
		if (error) throw error;
		const year = entries[0]?.data.fiscal_year;
		if (typeof year !== "number") return years;
		years.push(year);
	}
}

// Documents on the public site (Feature 003 #55; spec #51 "Public reads" (Documents), `03` §10 and
// §15).
//
// A Document is a public record about one authoritative published file (GLOSSARY). Every read goes
// through EmDash's query functions, which return published entries only unless a valid preview
// token asks for a draft (emdash 1.1.0 src/loader.ts, src/query.ts resolveEmDashEntry). Pages
// never pass a status.
//
// The list filters by Document Type, Health Topic (the `topic` taxonomy, GLOSSARY) and fiscal year
// through GET parameters, so a filtered list has its own address. A `where` on a taxonomy matches
// the exact term, and a term that does not exist matches nothing (emdash 1.1.0 src/loader.ts
// resolveTermGroups), as on Health News. A fiscal year is a whole number as the integer field
// stores it; any other value is ignored rather than sent to the database.

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

/** Each filter of the list: its query parameter and the taxonomy or field it matches. */
const FILTERS = {
	type: { param: "type", field: "document_type" },
	topic: { param: TOPIC_PARAM, field: "topic" },
	year: { param: "year", field: "fiscal_year" },
} as const;

type FilterName = keyof typeof FILTERS;

/** The list's filters by name: a term slug or a fiscal year, empty when not set. */
export type DocumentFilters = Record<FilterName, string>;

/** The query parameter of each filter, for the filter form. */
export const FILTER_PARAMS = {
	type: FILTERS.type.param,
	topic: FILTERS.topic.param,
	year: FILTERS.year.param,
} as const;

/** A fiscal year as the integer field holds it: a whole number from 1 to 9999, such as 2569. */
const FISCAL_YEAR = /^[1-9][0-9]{0,3}$/;

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

/** The filters a list address asks for. A fiscal year that is not one is ignored. */
export function parseDocumentFilters(params: URLSearchParams): DocumentFilters {
	const valueOf = (name: FilterName) => params.get(FILTERS[name].param)?.trim() ?? "";
	const year = valueOf("year");
	return {
		type: valueOf("type"),
		topic: valueOf("topic"),
		year: FISCAL_YEAR.test(year) ? year : "",
	};
}

/** Whether any filter is set. */
export function isFiltered(filters: DocumentFilters): boolean {
	return Object.values(filters).some((value) => value !== "");
}

/** The list's address with the filters that are set. */
export function documentsPath(filters: Partial<DocumentFilters> = {}): string {
	const params = new URLSearchParams();
	for (const name of Object.keys(FILTERS) as FilterName[]) {
		const value = filters[name];
		if (value) params.set(FILTERS[name].param, value);
	}
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
	for (const name of Object.keys(FILTERS) as FilterName[]) {
		if (filters[name]) where[FILTERS[name].field] = filters[name];
	}
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
 * The published Documents with these database ids, in the order given. A page reads the Documents
 * a reference field links to through this, because EmDash loads reference targets without their
 * taxonomy terms (emdash 1.1.0 src/loader.ts loadEntriesByGroups), and a Document row shows its
 * Document Type. A `where` on the `id` column selects them (src/loader.ts buildFieldConditions),
 * published only like every list read, with their terms hydrated.
 */
export async function documentsById(ids: string[]): Promise<DocumentEntry[]> {
	if (ids.length === 0) return [];
	const { entries, error } = await getEmDashCollection<"documents", DocumentData>("documents", {
		where: { id: ids },
	});
	if (error) throw error;
	const byId = new Map(entries.map((entry) => [entry.data.id, entry]));
	return ids.flatMap((id) => byId.get(id) ?? []);
}

/**
 * The fiscal years of published Documents that the filter accepts, newest first, each once.
 * EmDash's query functions offer no distinct values, so this walks down the years: each step reads
 * the one Document with the highest year below the last one found (a range on a field column,
 * emdash 1.1.0 src/loader.ts buildFieldConditions), one read per year.
 */
export async function fiscalYears(): Promise<number[]> {
	const years: number[] = [];
	for (;;) {
		const below = years.at(-1);
		const { entries, error } = await getEmDashCollection<"documents", DocumentData>("documents", {
			limit: 1,
			orderBy: { fiscal_year: "desc" },
			where: {
				fiscal_year: {
					gte: "1",
					...(below === undefined ? { lte: "9999" } : { lt: String(below) }),
				},
			},
		});
		if (error) throw error;
		const year = entries[0]?.data.fiscal_year;
		if (typeof year !== "number") return years;
		years.push(year);
	}
}

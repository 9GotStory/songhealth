// Documents on the public site (Feature 003 #55; spec #51 "Public reads" (Documents), `03` §10 and
// §15).
//
// A Document is a public record about one authoritative published file (GLOSSARY). Every read goes
// through EmDash's query functions, which return published entries only unless a valid preview
// token asks for a draft (emdash 1.1.0 src/loader.ts, src/query.ts resolveEmDashEntry). Pages
// never pass a status.

import { getEmDashCollection, type ContentEntry, type FileValue, type TaxonomyTerm } from "emdash";

/** The fixed number of Documents a list page shows. */
const DOCUMENTS_PAGE_SIZE = 20;

/** A Document's status in its own domain (`02` §13), not its publication state. */
export type DomainStatus = "current" | "superseded" | "expired";

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

export interface DocumentsPage {
	entries: DocumentEntry[];
	hasMore: boolean;
}

/** One page of published Documents, newest publication first. */
export async function listDocuments(page: number): Promise<DocumentsPage> {
	const { entries, hasMore, error } = await getEmDashCollection<"documents", DocumentData>(
		"documents",
		{
			limit: DOCUMENTS_PAGE_SIZE,
			offset: (page - 1) * DOCUMENTS_PAGE_SIZE,
			orderBy: { published_at: "desc" },
		},
	);
	if (error) throw error;
	return { entries, hasMore: hasMore === true };
}

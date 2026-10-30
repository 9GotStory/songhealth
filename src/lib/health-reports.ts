// Health Reports on the public site (Feature 003 #59; spec #51 "Public reads" (Health Reports),
// `02` §16, `03` §9 and §15).
//
// A Health Report is a described report whose authoritative content is a Document (GLOSSARY): its
// page links to that report Document. Every read is a `getEmDashCollection` read, which returns
// published entries only, even with a preview token or in edit mode, so pages pass no status
// (docs/agents/emdash-1.1.0.md "Public reads"). The list orders by the report date, falling back to
// the publication, which EmDash cannot sort, so it reads every published Health Report (a query
// without a `limit` has none: emdash 1.1.0 src/loader.ts `fetchLimit`) and sorts it in
// src/lib/dated-lists.ts (ADR 0004).

import { getEmDashCollection, type ContentEntry, type TaxonomyTerm } from "emdash";
import { listDate, listPage, newestFirst, type Instant, type ListPage } from "./dated-lists";
import { HEALTH_REPORTS_PATH } from "./health";

/** The fixed number of Health Reports a list page shows, as many as Documents (src/lib/documents.ts). */
const HEALTH_REPORTS_PAGE_SIZE = 20;

/** A Health Report's fields (seed/seed.json) and the system fields public pages read. */
export interface HealthReportData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	title: string;
	summary?: string | null;
	reporting_period?: string | null;
	owner_source?: string | null;
	report_at?: Instant;
	fiscal_year?: number | null;
	publishedAt?: Instant;
	/** Taxonomy terms hydrated by the query functions, by taxonomy name. */
	terms?: Record<string, TaxonomyTerm[]>;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

export type HealthReportEntry = ContentEntry<HealthReportData>;

/**
 * A Health Report's canonical address, `/health/reports/{slug}` (`03` §15), encoded as EmDash
 * encodes it.
 */
export function healthReportPath(slug: string): string {
	return `${HEALTH_REPORTS_PATH}/${encodeURIComponent(slug)}`;
}

/** The date a Health Report is listed by: its report date, else when it was published. */
export function healthReportDate(data: HealthReportData): Instant {
	return listDate(data.report_at, data.publishedAt);
}

/** One page of published Health Reports, the latest report date first. */
export async function listHealthReports(page: number): Promise<ListPage<HealthReportEntry>> {
	const { entries, error } = await getEmDashCollection<"health_reports", HealthReportData>(
		"health_reports",
		{ orderBy: { published_at: "desc" } },
	);
	if (error) throw error;
	return listPage(
		newestFirst(entries, (data) => data.report_at),
		page,
		HEALTH_REPORTS_PAGE_SIZE,
	);
}

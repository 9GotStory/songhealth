// Health Services on the public site (Feature 003 #57; spec #51 "Public reads" (Health Service
// Directory), `03` §8 and §15).
//
// Every read goes through EmDash's query functions, which return published entries only unless a
// valid preview token asks for a draft (emdash 1.1.0 src/loader.ts, src/query.ts
// resolveEmDashEntry). Pages never pass a status. The directory's name filter is a substring match,
// which EmDash's `where` cannot express (src/loader.ts buildFieldConditions), so the list reads
// every published Health Service, a query without a `limit` (src/loader.ts `fetchLimit`), and
// src/lib/health-service-directory.ts filters and orders them. A district has a few dozen Health
// Services at most; the WordPress inventory lists 17 (`09` ANOM-006).

import { getEmDashCollection, type ContentEntry, type TaxonomyTerm } from "emdash";
import { listPage, type ListPage } from "./dated-lists";
import {
	areasInUse,
	byName,
	filterDirectory,
	type DirectoryFilters,
	type DirectoryTerm,
	type OperationalStatus,
} from "./health-service-directory";

/** The fixed number of Health Services a list page shows. */
const HEALTH_SERVICES_PAGE_SIZE = 20;

/** A Health Service's fields (seed/seed.json) and the system fields public pages read. */
export interface HealthServiceData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	/** The official name. */
	title: string;
	facility_code?: string | null;
	display_name?: string | null;
	operational_status?: OperationalStatus | null;
	address?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	opening_hours?: string | null;
	public_contact?: string | null;
	affiliation_text?: string | null;
	publishedAt?: Date | string | null;
	/** Taxonomy terms hydrated by the query functions, by taxonomy name. */
	terms?: Record<string, TaxonomyTerm[]>;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

export type HealthServiceEntry = ContentEntry<HealthServiceData>;

/** One page of the directory, and the Area terms its filter offers. */
export interface DirectoryPage extends ListPage<HealthServiceEntry> {
	areas: DirectoryTerm[];
}

/** One page of the published Health Services that match the filters, by name. */
export async function listHealthServices(
	page: number,
	filters: DirectoryFilters,
): Promise<DirectoryPage> {
	const { entries, error } = await getEmDashCollection<"health_services", HealthServiceData>(
		"health_services",
	);
	if (error) throw error;
	return {
		...listPage(byName(filterDirectory(entries, filters)), page, HEALTH_SERVICES_PAGE_SIZE),
		areas: areasInUse(entries),
	};
}

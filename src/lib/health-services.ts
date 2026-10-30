// Health Services on the public site (Feature 003 #57; spec #51 "Public reads" (Health Service
// Directory), `03` §8 and §15).
//
// Every read is a `getEmDashCollection` read, which returns published entries only, even with a
// preview token or in edit mode, so pages pass no status (docs/agents/emdash-1.1.0.md "Public
// reads"). The directory's name filter is a substring match, which EmDash's `where` cannot express
// (emdash 1.1.0 src/loader.ts buildFieldConditions), so the list reads every published Health
// Service, a query without a `limit` (src/loader.ts `fetchLimit`), and
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

/** Every published Health Service. */
async function publishedHealthServices(): Promise<HealthServiceEntry[]> {
	const { entries, error } = await getEmDashCollection<"health_services", HealthServiceData>(
		"health_services",
	);
	if (error) throw error;
	return entries;
}

/** One page of the published Health Services that match the filters, by name. */
export async function listHealthServices(
	page: number,
	filters: DirectoryFilters,
): Promise<DirectoryPage> {
	const entries = await publishedHealthServices();
	return {
		...listPage(byName(filterDirectory(entries, filters)), page, HEALTH_SERVICES_PAGE_SIZE),
		areas: areasInUse(entries),
	};
}

/**
 * The Area terms the Homepage's Health Service Discovery form offers (#64): those the published
 * Health Services use, as the directory's own filter does. Undefined while no Health Service is
 * published, so the Homepage leaves the form out.
 */
export async function discoveryAreas(): Promise<DirectoryTerm[] | undefined> {
	const entries = await publishedHealthServices();
	return entries.length === 0 ? undefined : areasInUse(entries);
}

/**
 * The published Health Services with these database ids, by name. A Service page reads the Health
 * Services that offer it through this, because EmDash loads reference targets without their
 * taxonomy terms (emdash 1.1.0 src/loader.ts loadEntriesByGroups), and a Health Service row shows
 * its type and Area. A `where` on the `id` column selects them (src/loader.ts
 * buildFieldConditions), published only like every list read, with their terms hydrated.
 */
export async function healthServicesById(ids: string[]): Promise<HealthServiceEntry[]> {
	if (ids.length === 0) return [];
	const { entries, error } = await getEmDashCollection<"health_services", HealthServiceData>(
		"health_services",
		{ where: { id: ids } },
	);
	if (error) throw error;
	return byName(entries);
}

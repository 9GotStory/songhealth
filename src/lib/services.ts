// Services on the public site (Feature 003 #58; spec #51 "Public reads" (Services), `03` §7).
//
// Every read goes through EmDash's query functions, which return published entries only unless a
// valid preview token asks for a draft (emdash 1.1.0 src/loader.ts, src/query.ts
// resolveEmDashEntry). Pages never pass a status.
//
// The catalog filters by Service Category through a `where` on the taxonomy, which matches the
// exact term; an unknown term matches nothing (src/loader.ts resolveTermGroups). It is ordered by
// name in the query (src/loader.ts buildOrderByClause, `id` breaking ties). PostgreSQL orders the
// text by the database collation: the pinned postgres 18.6 image initialises it as en_US.utf8
// (glibc). On the development database it ordered a sample of Thai names, leading vowels
// included, as `Intl.Collator("th")` does (2026-10-30).

import {
	getEmDashCollection,
	type ContentEntry,
	type PortableTextBlock,
	type TaxonomyTerm,
} from "emdash";
import type { ListPage } from "./dated-lists";
import type { OwnershipType, ServiceFilters } from "./service-catalog";

/** The fixed number of Services a catalog page shows: four rows of the three-column grid. */
const SERVICES_PAGE_SIZE = 12;

/** One way to receive a Service: a label and an optional link, as staff enter them. */
interface ServiceChannel {
	label?: string | null;
	url?: string | null;
}

/** A Service's fields (seed/seed.json) and the system fields public pages read. */
export interface ServiceData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	title: string;
	summary?: string | null;
	ownership_type?: OwnershipType | null;
	provider_text?: string | null;
	channels?: ServiceChannel[] | null;
	eligibility?: PortableTextBlock[] | null;
	steps?: PortableTextBlock[] | null;
	required_documents_guidance?: PortableTextBlock[] | null;
	contact_location_guidance?: PortableTextBlock[] | null;
	duration?: string | null;
	fees?: string | null;
	notes?: string | null;
	external_url?: string | null;
	publishedAt?: Date | string | null;
	/** Taxonomy terms hydrated by the query functions, by taxonomy name. */
	terms?: Record<string, TaxonomyTerm[]>;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

export type ServiceEntry = ContentEntry<ServiceData>;

/** One page of published Services, by name, in the filter's Service Category when it is set. */
export async function listServices(
	page: number,
	filters: ServiceFilters,
): Promise<ListPage<ServiceEntry>> {
	const { entries, hasMore, error } = await getEmDashCollection<"services", ServiceData>(
		"services",
		{
			limit: SERVICES_PAGE_SIZE,
			offset: (page - 1) * SERVICES_PAGE_SIZE,
			orderBy: { title: "asc" },
			...(filters.category ? { where: { service_category: filters.category } } : {}),
		},
	);
	if (error) throw error;
	return { entries, hasMore: hasMore === true };
}

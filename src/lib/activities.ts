// Activities on the public site (Feature 003 #56; spec #51 "Public reads" (Activities), `03` §15,
// `04` §10).
//
// Every read is a `getEmDashCollection` read, which returns published entries only, even with a
// preview token or in edit mode, so pages pass no status (docs/agents/emdash-1.1.0.md "Public
// reads"). The list orders by when each Activity was held, falling back to its publication, which
// EmDash cannot sort, so it reads every published Activity (a query without a `limit` has none:
// emdash 1.1.0 src/loader.ts `fetchLimit`) and sorts it in src/lib/dated-lists.ts (ADR 0004).

import { getEmDashCollection, type ContentEntry, type TaxonomyTerm } from "emdash";
import { listDate, listPage, newestFirst, type Instant, type ListPage } from "./dated-lists";
import type { ImageFieldValue } from "./news";

/** The fixed number of Activities a list page shows. */
const ACTIVITIES_PAGE_SIZE = 12;

/** The Activities list's title, also its crumb on each Activity page. */
export const ACTIVITIES_TITLE = "กิจกรรม";

/** The Activities list's address. */
export const ACTIVITIES_PATH = "/activities";

/** One picture of an Activity's gallery, as the repeater field holds it (seed/seed.json). */
interface GalleryItem {
	image?: ImageFieldValue | null;
	caption?: string | null;
}

/** An Activity's fields (seed/seed.json) and the system fields public pages read. */
export interface ActivityData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	title: string;
	summary?: string | null;
	activity_at?: Instant;
	location_text?: string | null;
	featured_image?: ImageFieldValue | null;
	gallery?: GalleryItem[] | null;
	participants_text?: string | null;
	publishedAt?: Instant;
	/** Taxonomy terms hydrated by the query functions, by taxonomy name. */
	terms?: Record<string, TaxonomyTerm[]>;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

export type ActivityEntry = ContentEntry<ActivityData>;

/**
 * An Activity's canonical address, `/activities/{slug}` (`03` §15), encoded as EmDash encodes it.
 */
export function activityPath(slug: string): string {
	return `${ACTIVITIES_PATH}/${encodeURIComponent(slug)}`;
}

/** The date an Activity is listed by: when it was held, else when it was published. */
export function activityDate(data: ActivityData): Instant {
	return listDate(data.activity_at, data.publishedAt);
}

/** Every published Activity, the most recently held first. */
async function activitiesNewestFirst(): Promise<ActivityEntry[]> {
	const { entries, error } = await getEmDashCollection<"activities", ActivityData>("activities", {
		orderBy: { published_at: "desc" },
	});
	if (error) throw error;
	return newestFirst(entries, (data) => data.activity_at);
}

/** One page of published Activities, the most recently held first. */
export async function listActivities(page: number): Promise<ListPage<ActivityEntry>> {
	return listPage(await activitiesNewestFirst(), page, ACTIVITIES_PAGE_SIZE);
}

/** The `count` most recently held published Activities, the Homepage's (#64). */
export async function latestActivities(count: number): Promise<ActivityEntry[]> {
	return (await activitiesNewestFirst()).slice(0, count);
}

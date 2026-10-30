// Health Content on the public site (Feature 003 #59; spec #51 "Public reads" (Health Content),
// `03` §9 and §15).
//
// Every read goes through EmDash's query functions, which return published entries only unless a
// valid preview token asks for a draft (emdash 1.1.0 src/loader.ts, src/query.ts
// resolveEmDashEntry). Pages never pass a status. The list is newest publication first and narrows
// to one Health Topic (`topic` term) with `?topic=`; a `where` on a taxonomy matches the exact
// term, and a term that does not exist matches nothing (src/loader.ts resolveTermGroups), as on
// Health News. Health Reports are their own collection, so they never mix into this list.

import {
	getEmDashCollection,
	type ContentEntry,
	type PortableTextBlock,
	type TaxonomyTerm,
} from "emdash";
import type { ListPage } from "./dated-lists";
import { HEALTH_CONTENT_PATH } from "./health";
import type { ImageFieldValue } from "./news";
import { TOPIC_PARAM } from "./terms";

/** The fixed number of Health Content items a list page shows. */
const HEALTH_CONTENT_PAGE_SIZE = 12;

/** A Health Content entry's fields (seed/seed.json) and the system fields public pages read. */
export interface HealthContentData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	title: string;
	summary?: string;
	body?: PortableTextBlock[];
	source_text?: string;
	featured_image?: ImageFieldValue;
	/** When staff last reviewed the content; shown as ทบทวนล่าสุด. */
	reviewed_at?: Date | string | null;
	publishedAt?: Date | string | null;
	/** Taxonomy terms hydrated by the query functions, by taxonomy name. */
	terms?: Record<string, TaxonomyTerm[]>;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

export type HealthContentEntry = ContentEntry<HealthContentData>;

/**
 * A Health Content item's canonical address, `/health/content/{slug}` (`03` §15), encoded as
 * EmDash encodes it.
 */
export function healthContentPath(slug: string): string {
	return `${HEALTH_CONTENT_PATH}/${encodeURIComponent(slug)}`;
}

/** The list's address, narrowed to one Health Topic by its `topic` term slug when given. */
export function healthContentListPath(topic?: string): string {
	return topic
		? `${HEALTH_CONTENT_PATH}?${new URLSearchParams({ [TOPIC_PARAM]: topic })}`
		: HEALTH_CONTENT_PATH;
}

/**
 * One page of published Health Content, newest publication first, narrowed to the Health Topic
 * with this `topic` term slug when one is given.
 */
export async function listHealthContent(
	page: number,
	topic: string,
): Promise<ListPage<HealthContentEntry>> {
	const { entries, hasMore, error } = await getEmDashCollection<
		"health_content",
		HealthContentData
	>("health_content", {
		limit: HEALTH_CONTENT_PAGE_SIZE,
		offset: (page - 1) * HEALTH_CONTENT_PAGE_SIZE,
		orderBy: { published_at: "desc" },
		...(topic === "" ? {} : { where: { topic } }),
	});
	if (error) throw error;
	return { entries, hasMore: hasMore === true };
}

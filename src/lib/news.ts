// News on the public site (Feature 003 #54; spec #51 "Public reads", `03` §15).
//
// Every read goes through EmDash's query functions, which return published entries only unless a
// valid preview token or the editor's edit mode asks for drafts (emdash 1.1.0 src/loader.ts: the
// status filter defaults to "published"; src/query.ts resolveEmDashEntry). Pages never pass a
// status. Health News is News with any `topic` term (`01` §11 treats Topic and Health Topic as one
// classification).

import {
	getEmDashCollection,
	type ContentEntry,
	type PortableTextBlock,
	type TaxonomyTerm,
} from "emdash";
import { TOPIC_PARAM } from "./terms";

/** The fixed number of News a list page shows. */
const NEWS_PAGE_SIZE = 12;

/** An image field value, as EmDash's Image component takes it. */
export interface ImageFieldValue {
	id: string;
	alt?: string;
	width?: number;
	height?: number;
}

/** A News entry's fields (seed/seed.json) and the system fields public pages read. */
export interface NewsData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	title: string;
	summary?: string;
	body?: PortableTextBlock[];
	featured_image?: ImageFieldValue;
	source_text?: string;
	publishedAt?: Date | string | null;
	/** Taxonomy terms hydrated by the query functions, by taxonomy name. */
	terms?: Record<string, TaxonomyTerm[]>;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

type NewsEntry = ContentEntry<NewsData>;

/** A News item's canonical address, `/news/{slug}` (`03` §15), encoded as EmDash encodes it. */
export function newsPath(slug: string): string {
	return `/news/${encodeURIComponent(slug)}`;
}

/** The Health News address, narrowed to one Health Topic by its `topic` term slug when given. */
export function healthNewsPath(topic?: string): string {
	return topic ? `/news/health?${new URLSearchParams({ [TOPIC_PARAM]: topic })}` : "/news/health";
}

export interface NewsPage {
	entries: NewsEntry[];
	hasMore: boolean;
}

/**
 * One page of published News, newest publication first. `topics` narrows the list to News with
 * any of these `topic` term slugs; an empty list matches nothing.
 */
export async function listNews(page: number, topics?: string[]): Promise<NewsPage> {
	const { entries, hasMore, error } = await getEmDashCollection<"news", NewsData>("news", {
		limit: NEWS_PAGE_SIZE,
		offset: (page - 1) * NEWS_PAGE_SIZE,
		orderBy: { published_at: "desc" },
		...(topics === undefined ? {} : { where: { topic: topics } }),
	});
	if (error) throw error;
	return { entries, hasMore: hasMore === true };
}

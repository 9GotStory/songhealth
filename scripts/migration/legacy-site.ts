// The Legacy site as its WordPress export describes it (#177; spec #174 "Source"): the items of the
// types the migration reads (scripts/migration/plan.ts ITEM_TYPES), with the attachments and the
// pages' slugs. Reading goes through EmDash's own WXR and date parsers, which the emdash 1.1.0
// package's main entry exports and plain Node loads (src/index.ts; `docs/agents/emdash-1.1.0.md`
// "WordPress import"), as ADR 0008 has them since its amendment, and HTML through EmDash's
// converter package (spec #174 "Source"). node:test loads this module, and both with it, with plain
// Node (Product Owner, #177 comment 6719251511, item 1, and #178 comment 6720200201, item 3).
// verify takes EmDash's content hash through here too, so this stays the one module of the script
// that loads EmDash.
//
// This module is where the export's personal data stops: it returns no author, no item's author
// (`dc:creator`), and nothing of any other post type, such as the form plugin's submission
// (`nf_sub`). The planning modules see only what it returns.

import { Readable } from "node:stream";

import { htmlToPortableText } from "@emdash-cms/gutenberg-to-portable-text";
import { computeContentHash, parseWxr, parseWxrDate, type WxrPost } from "emdash";

import type { Block } from "./import-plan.ts";
import { ITEM_TYPES, type ItemType } from "./plan.ts";

/** The taxonomy that holds each type's categories in the export. */
const CATEGORY_TAXONOMY: Record<ItemType, string> = {
	"public-new": "category-public-news",
	post: "category",
	directive: "category-directive",
	procurement: "category-procurement",
};

/** An item of a type the migration reads, published or not. */
export interface LegacyItem {
	type: ItemType;
	/** Its WordPress ID. */
	id: number;
	slug: string;
	title: string;
	/** Its WordPress status: `publish`, `draft` and so on. */
	status: string;
	/** When it was published, or for a draft when it was dated; none for an undated draft. */
	published: Date | undefined;
	/** Its categories' names, in the export's order. */
	categories: string[];
	/** The attachment ID of its featured image (`_thumbnail_id`). */
	featured: number | undefined;
	/** The attachment IDs of its ACF picture fields `image_1` to `image_5`, in order. */
	pictures: number[];
	/** Its ACF file fields `file_1` to `file_5`, in order, each with its `text_N` label. */
	files: { id: number; label: string }[];
	/** The block editor's HTML. */
	content: string;
	/** The ACF editor field's HTML (`editor`). */
	editor: string;
}

/** An attachment: its WordPress ID, its file's address on the Legacy site and its details. */
export interface LegacyAttachment {
	id: number;
	url: string;
	/** Its alt text (`_wp_attachment_image_alt`), or empty. */
	alt: string;
	/** Its caption, or empty. */
	caption: string;
}

/** A page, by its slug and status: the migration redirects pages and imports none. */
interface LegacyPage {
	slug: string;
	status: string;
}

export interface LegacySite {
	items: LegacyItem[];
	attachments: LegacyAttachment[];
	pages: LegacyPage[];
}

/** An attachment ID from a post meta value, or none for an empty or other value. */
function attachmentId(value: string | undefined): number | undefined {
	return value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined;
}

/**
 * A category's name: the item's label for it, else its slug as the export writes it. The parser
 * keeps the text of an item's `<category>` element as its label when it differs from the slug,
 * keyed by the taxonomy and the slug joined by U+0000, and a custom taxonomy's category, neither
 * `category` nor `post_tag`, by its slug under the taxonomy (emdash 1.1.0 src/cli/wxr/parser.ts
 * WxrPost taxonomyLabels, parseWxr, captureItemCategoryLabel).
 */
function categoryName(post: WxrPost, taxonomy: string, slug: string): string {
	return post.taxonomyLabels?.get(`${taxonomy}\u0000${slug}`) ?? slug;
}

function itemOf(post: WxrPost, type: ItemType): LegacyItem {
	const taxonomy = CATEGORY_TAXONOMY[type];
	const slugs =
		taxonomy === "category" ? post.categories : (post.customTaxonomies?.get(taxonomy) ?? []);
	const field = (name: string) => [1, 2, 3, 4, 5].map((n) => post.meta.get(`${name}_${n}`));
	const labels = field("text");
	// The GMT date first, then pubDate, then the site's own; a malformed GMT date gives an Invalid
	// Date rather than the next (emdash 1.1.0 src/import/sources/wxr.ts parseWxrDate).
	const published = parseWxrDate(post.postDateGmt, post.pubDate, post.postDate);
	return {
		type,
		id: post.id!,
		slug: post.postName ?? "",
		title: post.title ?? "",
		status: post.status ?? "",
		published: published && !Number.isNaN(published.getTime()) ? published : undefined,
		categories: slugs.map((slug) => categoryName(post, taxonomy, slug)),
		featured: attachmentId(post.meta.get("_thumbnail_id")),
		pictures: field("image").flatMap((value) => attachmentId(value) ?? []),
		files: field("file").flatMap((value, index) => {
			const id = attachmentId(value);
			return id === undefined ? [] : [{ id, label: labels[index] ?? "" }];
		}),
		content: post.content ?? "",
		editor: post.meta.get("editor") ?? "",
	};
}

/**
 * Each attachment's caption by its WordPress ID, for those that have one. WordPress keeps a caption
 * as the attachment's `post_excerpt` (`wp_get_attachment_caption`), and its export writes that in
 * CDATA as the item's `excerpt:encoded` (`export_wp`, WordPress 7.1.4, the Legacy site's). Neither
 * of EmDash's parsers gives an attachment that field (`docs/agents/emdash-1.1.0.md` "WordPress
 * import"), so this one field is read from the export's text.
 */
function captionsOf(xml: string): Map<number, string> {
	const captions = new Map<number, string>();
	for (const [item] of xml.matchAll(/<item>[\s\S]*?<\/item>/g)) {
		if (!item.includes("<wp:post_type><![CDATA[attachment]]></wp:post_type>")) continue;
		const id = /<wp:post_id>(\d+)<\/wp:post_id>/.exec(item)?.[1];
		const caption = /<excerpt:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/excerpt:encoded>/.exec(
			item,
		)?.[1];
		if (id !== undefined && caption) captions.set(Number(id), caption);
	}
	return captions;
}

/**
 * The Legacy site's items, attachments and pages, read from the text of its WXR export. The
 * streaming parser gives an attachment its post meta, where WordPress keeps its alt text, and the
 * string parser leaves that empty (emdash 1.1.0 src/cli/wxr/parser.ts parseWxr, parseWxrString).
 */
export async function readLegacySite(xml: string): Promise<LegacySite> {
	const wxr = await parseWxr(Readable.from(xml));
	const captions = captionsOf(xml);
	const isItemType = (type: string | undefined): type is ItemType =>
		(ITEM_TYPES as readonly (string | undefined)[]).includes(type);
	return {
		items: wxr.posts.flatMap((post) =>
			isItemType(post.postType) ? [itemOf(post, post.postType)] : [],
		),
		attachments: wxr.attachments.map((item) => ({
			id: item.id!,
			url: item.url ?? "",
			alt: item.meta.get("_wp_attachment_image_alt") ?? "",
			caption: captions.get(item.id!) ?? "",
		})),
		pages: wxr.posts
			.filter((post) => post.postType === "page")
			.map((post) => ({ slug: post.postName ?? "", status: post.status ?? "" })),
	};
}

export { computeContentHash };

/**
 * HTML as Portable Text blocks, through EmDash's converter (spec #174 "Source"). Its keys count up
 * from each call, unique within the body they belong to, so that a plan reads the same each time.
 */
export const blocksOf = (html: string): Block[] => {
	let key = 0;
	return htmlToPortableText(html, { keyGenerator: () => `key-${++key}` }) as Block[];
};

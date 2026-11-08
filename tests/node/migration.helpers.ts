// Synthetic Legacy site exports for the migration script's node tests (#177; spec #174 "Seam A"):
// a WordPress WXR 1.2 document built from the parts a test names, and a zip of synthetic files. No
// Legacy site content enters the repository, so every title, name and file here is made up.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

/** A category an item carries: its taxonomy (the WXR `domain`), its slug and its name. */
export interface SyntheticCategory {
	domain: string;
	slug: string;
	name: string;
	/** The parent category's slug. */
	parent?: string;
}

/** An item of the export: a post of any type, or an attachment. */
export interface SyntheticItem {
	type: string;
	id: number;
	slug?: string;
	title?: string;
	/** `publish` unless given. */
	status?: string;
	/**
	 * The publish instant in UTC, as WordPress writes `post_date_gmt`: "2025-03-14 03:00:00". A
	 * value that is no instant goes into every date field as it is.
	 */
	date?: string;
	categories?: SyntheticCategory[];
	/** Post meta by key, such as `_thumbnail_id` or the ACF fields `image_1` and `editor`. */
	meta?: Record<string, string>;
	/** The block editor's content. */
	content?: string;
	/** The excerpt, which is an attachment's caption. */
	excerpt?: string;
	/** An attachment's file address. */
	url?: string;
}

export const ACTIVITY: SyntheticCategory = {
	domain: "category-public-news",
	slug: "activity",
	name: "กิจกรรม",
};

/** ประชาสัมพันธ์, with a Thai slug percent-encoded as WordPress writes it. */
export const PUBLIC_RELATIONS: SyntheticCategory = {
	domain: "category-public-news",
	slug: encodeURIComponent("ประชาสัมพันธ์").toLowerCase(),
	name: "ประชาสัมพันธ์",
};

export const PM25: SyntheticCategory = {
	domain: "category-public-news",
	slug: "pm",
	name: "PM 2.5",
	parent: PUBLIC_RELATIONS.slug,
};

/** A category the defaults do not name. */
export const OTHER_NEWS: SyntheticCategory = {
	domain: "category-public-news",
	slug: "other",
	name: "ข่าวอื่น",
};

/** A news stream item `news-{id}` that a test fills in. */
export function newsItem(id: number, fields: Partial<SyntheticItem> = {}): SyntheticItem {
	return { type: "public-new", id, slug: `news-${id}`, title: `เรื่องที่ ${id}`, ...fields };
}

/** Runs scripts/migration.ts with `args`, as a command's test does. */
export const runMigration = (...args: string[]) =>
	spawnSync(
		process.execPath,
		[fileURLToPath(new URL("../../scripts/migration.ts", import.meta.url)), ...args],
		{ encoding: "utf8" },
	);

/** The Legacy site's address, as its export writes it. */
export const SITE = "https://songhealth.moph.go.th";

/** The author of every synthetic export and its items, whose details no output may carry. */
export const AUTHOR = {
	login: "synthetic-admin",
	email: "synthetic.author@example.org",
	displayName: "ผู้เขียนสังเคราะห์",
};

/** Text inside CDATA, split where it holds the section's end. */
const cdata = (text: string) => `<![CDATA[${text.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

/** "2025-03-14 03:00:00" in UTC, moved by `hours`, in the same form; a non-instant as it is. */
function shifted(date: string, hours: number): string {
	const instant = new Date(`${date.replace(" ", "T")}Z`);
	if (Number.isNaN(instant.getTime())) return date;
	return new Date(instant.getTime() + hours * 3_600_000)
		.toISOString()
		.slice(0, 19)
		.replace("T", " ");
}

/** An instant as RSS's pubDate writes it; a non-instant as it is. */
function rssDate(date: string): string {
	const instant = new Date(`${date.replace(" ", "T")}Z`);
	return Number.isNaN(instant.getTime()) ? date : instant.toUTCString();
}

function itemXml(item: SyntheticItem): string {
	const date = item.date ?? "2025-03-14 03:00:00";
	const lines = [
		`<title>${cdata(item.title ?? "")}</title>`,
		`<link>${SITE}/?p=${item.id}</link>`,
		`<pubDate>${rssDate(date)}</pubDate>`,
		`<dc:creator>${cdata(AUTHOR.login)}</dc:creator>`,
		`<guid isPermaLink="false">${SITE}/?p=${item.id}</guid>`,
		"<description></description>",
		`<content:encoded>${cdata(item.content ?? "")}</content:encoded>`,
		`<excerpt:encoded>${cdata(item.excerpt ?? "")}</excerpt:encoded>`,
		`<wp:post_id>${item.id}</wp:post_id>`,
		// The site's own time, Bangkok's (UTC+7), as WordPress writes `post_date`.
		`<wp:post_date>${cdata(shifted(date, 7))}</wp:post_date>`,
		`<wp:post_date_gmt>${cdata(date)}</wp:post_date_gmt>`,
		`<wp:post_modified>${cdata(shifted(date, 7))}</wp:post_modified>`,
		`<wp:post_modified_gmt>${cdata(date)}</wp:post_modified_gmt>`,
		`<wp:comment_status>${cdata("closed")}</wp:comment_status>`,
		`<wp:ping_status>${cdata("closed")}</wp:ping_status>`,
		`<wp:post_name>${cdata(item.slug ?? "")}</wp:post_name>`,
		`<wp:status>${cdata(item.status ?? "publish")}</wp:status>`,
		"<wp:post_parent>0</wp:post_parent>",
		"<wp:menu_order>0</wp:menu_order>",
		`<wp:post_type>${cdata(item.type)}</wp:post_type>`,
		`<wp:post_password>${cdata("")}</wp:post_password>`,
		"<wp:is_sticky>0</wp:is_sticky>",
		...(item.url === undefined
			? []
			: [`<wp:attachment_url>${cdata(item.url)}</wp:attachment_url>`]),
		...(item.categories ?? []).map(
			(category) =>
				`<category domain="${category.domain}" nicename="${category.slug}">${cdata(category.name)}</category>`,
		),
		...Object.entries(item.meta ?? {}).map(
			([key, value]) =>
				`<wp:postmeta><wp:meta_key>${cdata(key)}</wp:meta_key><wp:meta_value>${cdata(value)}</wp:meta_value></wp:postmeta>`,
		),
	];
	return `<item>\n${lines.join("\n")}\n</item>`;
}

/**
 * A category in the export's term list: a core one as `<wp:category>`, any other as `<wp:term>`.
 */
function termXml(term: SyntheticCategory, id: number): string {
	return term.domain === "category"
		? `<wp:category><wp:term_id>${id}</wp:term_id><wp:category_nicename>${cdata(term.slug)}</wp:category_nicename><wp:category_parent>${cdata(term.parent ?? "")}</wp:category_parent><wp:cat_name>${cdata(term.name)}</wp:cat_name></wp:category>`
		: `<wp:term><wp:term_id>${id}</wp:term_id><wp:term_taxonomy>${cdata(term.domain)}</wp:term_taxonomy><wp:term_slug>${cdata(term.slug)}</wp:term_slug><wp:term_parent>${cdata(term.parent ?? "")}</wp:term_parent><wp:term_name>${cdata(term.name)}</wp:term_name></wp:term>`;
}

/**
 * A WXR 1.2 document with the export's author, the term list of the categories the items carry,
 * and the items in the order given.
 */
export function wxrDocument(items: SyntheticItem[]): string {
	const terms = new Map<string, SyntheticCategory>();
	for (const category of items.flatMap((item) => item.categories ?? [])) {
		terms.set(`${category.domain} ${category.slug}`, category);
	}
	return [
		'<?xml version="1.0" encoding="UTF-8" ?>',
		'<rss version="2.0" xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:wp="http://wordpress.org/export/1.2/">',
		"<channel>",
		`<title>${cdata("สำนักงานสาธารณสุขอำเภอสอง")}</title>`,
		`<link>${SITE}</link>`,
		"<wp:wxr_version>1.2</wp:wxr_version>",
		`<wp:base_site_url>${SITE}</wp:base_site_url>`,
		`<wp:base_blog_url>${SITE}</wp:base_blog_url>`,
		`<wp:author><wp:author_id>1</wp:author_id><wp:author_login>${cdata(AUTHOR.login)}</wp:author_login><wp:author_email>${cdata(AUTHOR.email)}</wp:author_email><wp:author_display_name>${cdata(AUTHOR.displayName)}</wp:author_display_name><wp:author_first_name>${cdata("")}</wp:author_first_name><wp:author_last_name>${cdata("")}</wp:author_last_name></wp:author>`,
		...[...terms.values()].map((term, index) => termXml(term, index + 1)),
		...items.map(itemXml),
		"</channel>",
		"</rss>",
	].join("\n");
}

/**
 * An attachment item whose file is `path` under the site, such as "wp-content/uploads/a.webp", with
 * the alt text and caption WordPress keeps in its post meta and its excerpt.
 */
export function attachment(
	id: number,
	path: string,
	{ alt, caption }: { alt?: string; caption?: string } = {},
): SyntheticItem {
	return {
		type: "attachment",
		id,
		slug: `attachment-${id}`,
		title: `ไฟล์ ${id}`,
		url: `${SITE}/${path}`,
		excerpt: caption,
		meta: alt === undefined ? undefined : { _wp_attachment_image_alt: alt },
	};
}

/** A file a synthetic zip holds with its bytes, deflated unless `stored`. */
export interface SyntheticFile {
	path: string;
	bytes: Uint8Array;
	stored?: boolean;
}

/**
 * A zip holding an empty file at each path, as the uploads copy holds the site's files, or a given
 * file with its bytes. A path given as bytes is stored as those bytes, such as a name cut inside a
 * character.
 */
export function zipOf(entries: (string | Uint8Array | SyntheticFile)[]): Buffer {
	const local: Buffer[] = [];
	const central: Buffer[] = [];
	let offset = 0;
	for (const entry of entries) {
		const file = typeof entry === "string" || entry instanceof Uint8Array ? undefined : entry;
		const path = file === undefined ? (entry as string | Uint8Array) : file.path;
		const name = typeof path === "string" ? Buffer.from(path, "utf8") : Buffer.from(path);
		const bytes = Buffer.from(file?.bytes ?? []);
		const deflated = file !== undefined && !file.stored;
		const data = deflated ? deflateRawSync(bytes) : bytes;
		// General purpose flag bit 11 marks a UTF-8 name; the uploads copy sets it on most names.
		const flags = typeof path === "string" ? 0x0800 : 0;
		const method = deflated ? 8 : 0;
		const header = Buffer.alloc(30);
		header.writeUInt32LE(0x04034b50, 0);
		header.writeUInt16LE(20, 4);
		header.writeUInt16LE(flags, 6);
		header.writeUInt16LE(method, 8);
		header.writeUInt32LE(crc32(bytes), 14);
		header.writeUInt32LE(data.length, 18);
		header.writeUInt32LE(bytes.length, 22);
		header.writeUInt16LE(name.length, 26);
		local.push(header, name, data);
		const directoryEntry = Buffer.alloc(46);
		directoryEntry.writeUInt32LE(0x02014b50, 0);
		directoryEntry.writeUInt16LE(0x0314, 4);
		directoryEntry.writeUInt16LE(20, 6);
		directoryEntry.writeUInt16LE(flags, 8);
		directoryEntry.writeUInt16LE(method, 10);
		directoryEntry.writeUInt32LE(crc32(bytes), 16);
		directoryEntry.writeUInt32LE(data.length, 20);
		directoryEntry.writeUInt32LE(bytes.length, 24);
		directoryEntry.writeUInt16LE(name.length, 28);
		directoryEntry.writeUInt32LE(offset, 42);
		central.push(directoryEntry, name);
		offset += header.length + name.length + data.length;
	}
	const directory = Buffer.concat(central);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(entries.length, 8);
	end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...local, directory, end]);
}

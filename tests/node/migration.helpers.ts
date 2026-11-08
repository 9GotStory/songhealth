// Synthetic Legacy site exports for the migration script's node tests (#177; spec #174 "Seam A"):
// a WordPress WXR 1.2 document built from the parts a test names, and a zip of synthetic files. No
// Legacy site content enters the repository, so every title, name and file here is made up.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

import { planImport } from "../../scripts/migration/import-plan.ts";
import { blocksOf, readLegacySite } from "../../scripts/migration/legacy-site.ts";
import { plan } from "../../scripts/migration/plan.ts";

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
	/** When it was last modified, in the form of `date`: `date` unless given. */
	modified?: string;
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

/** The categories of a directive: an order, or a notice. */
export const ORDER: SyntheticCategory = {
	domain: "category-directive",
	slug: "order",
	name: "คำสั่ง",
};

export const NOTICE: SyntheticCategory = {
	domain: "category-directive",
	slug: "notice",
	name: "ประกาศ",
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

/** Runs scripts/migration.ts with `args` from the folder `cwd`, as a command's test does. */
export const runMigrationIn = (cwd: string | undefined, ...args: string[]) =>
	spawnSync(
		process.execPath,
		[fileURLToPath(new URL("../../scripts/migration.ts", import.meta.url)), ...args],
		{ cwd, encoding: "utf8" },
	);

/** Runs scripts/migration.ts with `args`, as a command's test does. */
export const runMigration = (...args: string[]) => runMigrationIn(undefined, ...args);

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
		`<wp:post_modified>${cdata(shifted(item.modified ?? date, 7))}</wp:post_modified>`,
		`<wp:post_modified_gmt>${cdata(item.modified ?? date)}</wp:post_modified_gmt>`,
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

/** The file of a synthetic directive or procurement notice, and its path in the uploads. */
export const NOTICE_PATH = "wp-content/uploads/2025/03/notice.pdf";
export const NOTICE_FILE = attachment(900, NOTICE_PATH);

/** A directive `directive-{id}` with one file, NOTICE_FILE. */
export function directive(id: number, fields: Partial<SyntheticItem> = {}): SyntheticItem {
	return {
		type: "directive",
		id,
		slug: `directive-${id}`,
		title: `ประกาศที่ ${id}`,
		meta: { file_1: "900" },
		...fields,
	};
}

/** A procurement notice `procurement-{id}` with one file, NOTICE_FILE. */
export function procurement(id: number, fields: Partial<SyntheticItem> = {}): SyntheticItem {
	return {
		type: "procurement",
		id,
		slug: `procurement-${id}`,
		title: `ประกาศผู้ชนะ ${id}`,
		meta: { file_1: "900" },
		...fields,
	};
}

/** A One Page attachment `id`, as the news stream's items use them. */
export const onePage = (id: number, details: { alt?: string; caption?: string } = {}) =>
	attachment(id, `wp-content/uploads/2025/03/one-page-${id}.webp`, details);

/** An item whose featured image is attachment `featured`, repeated in `image_1` as most are. */
export const featuring = (featured: number) => ({
	_thumbnail_id: String(featured),
	image_1: String(featured),
});

/** The category and tags of an ITA post, as the export writes them: its year and its MOIT. */
export const moitTags = (number: number, year: number): SyntheticCategory[] => [
	{ domain: "post_tag", slug: String(year), name: String(year) },
	{ domain: "category", slug: "ita", name: "ITA" },
	{ domain: "post_tag", slug: `moit-${number}`, name: `MOIT-${number}` },
];

/** A published ITA post `moit-{number}-{year}`, as the block editor saved `content`. */
export function moitPost(
	number: number,
	year: number,
	content: string,
	fields: Partial<SyntheticItem> = {},
): SyntheticItem {
	return {
		type: "post",
		id: year * 100 + number,
		slug: `moit-${number}-${year}`,
		title: `MOIT ${number} ตัวชี้วัดที่ ${number}`,
		categories: moitTags(number, year),
		content,
		...fields,
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

/** What reviewers wrote in a row of the list. */
type Review = { decision?: string; decision_type?: string; summary?: string };

/** A cell as the list's CSV writes it. */
const csvCell = (value: string) =>
	/[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** The list `text` with what reviewers wrote, by slug. Synthetic cells hold no comma or quote. */
function reviewed(text: string, reviews: Record<string, Review>): string {
	const [header, ...rows] = text.trimEnd().split("\r\n");
	const columns = header!.split(",");
	const at = (name: string) => columns.indexOf(name);
	const lines = rows.map((line) => {
		const cells = line.split(",");
		for (const [column, value] of Object.entries(reviews[cells[at("slug")]!] ?? {})) {
			cells[at(column)] = csvCell(value);
		}
		return cells.join(",");
	});
	return [header, ...lines, ""].join("\r\n");
}

/** The uploads copy's path of each attachment in `items`. */
export const uploadsOf = (items: SyntheticItem[]) =>
	items.flatMap((item) => (item.url === undefined ? [] : [new URL(item.url).pathname.slice(1)]));

export interface ImportOptions {
	reviews?: Record<string, Review>;
	/** The uploads copy's names, every attachment's file unless given. */
	uploads?: string[];
	final?: boolean;
	/** The items the list was made from, `items` unless given. */
	listItems?: SyntheticItem[];
	/** Whether the office's copy of ANOM-001's file lies beside the export. */
	hasOfficeFile?: boolean;
	/** What tells a file's bytes from another's, its path unless given. */
	fingerprintOf?: (path: string) => string;
}

/** What import plans for an export holding `items`, from its list with `reviews` written in. */
export async function importOf(
	items: SyntheticItem[],
	{
		reviews = {},
		uploads = uploadsOf(items),
		final = false,
		listItems = items,
		hasOfficeFile = false,
		fingerprintOf = (path) => path,
	}: ImportOptions = {},
) {
	const site = await readLegacySite(wxrDocument(items));
	const listed = plan({ site: await readLegacySite(wxrDocument(listItems)), uploads });
	const list = reviewed(listed.list, reviews);
	return planImport({
		site,
		uploads,
		list,
		final,
		toBlocks: blocksOf,
		hasOfficeFile,
		fingerprintOf,
	});
}

/** The API token of every synthetic run, which no output may carry. */
export const SYNTHETIC_TOKEN = "ec_pat_syntheticnotrealtoken";

/** Runs `use` in a folder with a synthetic export and uploads copy, and `plan`'s list. */
export async function withExport(
	items: SyntheticItem[],
	use: (paths: { folder: string; xml: string; zip: string; token: string }) => Promise<void> | void,
) {
	const folder = await mkdtemp(join(tmpdir(), "songhealth-migration-test-"));
	try {
		const xml = join(folder, "export.xml");
		const zip = join(folder, "wp-content.zip");
		const token = join(folder, "token");
		await writeFile(xml, wxrDocument(items));
		await writeFile(zip, zipOf(uploadsOf(items)));
		await writeFile(token, SYNTHETIC_TOKEN);
		await chmod(token, 0o600);
		assert.equal(runMigration("plan", xml, zip).status, 0);
		await use({ folder, xml, zip, token });
	} finally {
		await rm(folder, { recursive: true });
	}
}

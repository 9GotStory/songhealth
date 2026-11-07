// What the migration script's plan command makes of the Legacy site's export (#177; spec #174 "The
// migration script", "Mapping: the news stream" and "Mapping: directives and procurement
// notices"; grill Q3, Q4, Q16 and Q24): the Classification list, merged with an earlier one, and
// an inventory. scripts/migration.ts reads the files and writes the results; this module imports
// nothing at run time, so node:test checks it directly (tests/node/migration-plan.test.ts), as it
// checks the demo dataset's planner.

import type { LegacyAttachment, LegacyItem, LegacySite } from "./legacy-site.ts";

/**
 * The post types the migration reads, beside attachments and pages (spec #174 "Source"):
 * scripts/migration/legacy-site.ts reads no other.
 */
export const ITEM_TYPES = ["public-new", "post", "directive", "procurement"] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

/**
 * The Legacy site's host, which addresses its files and pages (GLOSSARY "Legacy site"). The export
 * names it too, but EmDash's string parser leaves the site's fields empty (emdash 1.1.0
 * src/cli/wxr/parser.ts parseWxrString).
 */
const LEGACY_HOST = "songhealth.moph.go.th";

/** The value of a row that waits for a reviewer's decision (spec #174, Q3). */
export const TO_CHOOSE = "ต้องเลือก";

/** The Classification list's columns, in the file's order. scripts/migration.ts documents each. */
const COLUMNS = [
	"legacy_type",
	"slug",
	"wp_id",
	"title",
	"published",
	"fiscal_year",
	"categories",
	"flags",
	"default_target",
	"default_type",
	"decision",
	"decision_type",
	"summary",
] as const;

type Column = (typeof COLUMNS)[number];

/** A row of the list, cell by column; a row read from a file keeps the columns reviewers added. */
export type ListRow = Record<Column, string> & Record<string, string>;

/** The types the list has a row for: every other type reaches no reviewer (spec #174). */
const LISTED_TYPES: readonly ItemType[] = ["public-new", "directive", "procurement"];

/**
 * The words that point a กิจกรรม row at News, an invitation or a notice before the event; the
 * match only points a reviewer at the row (spec #174 "Mapping: the news stream", `09` §17).
 */
const NEWS_WORDS = ["เชิญชวน", "ขอเชิญ", "ประชาสัมพันธ์"];

/** The words that make a directive's ประกาศ a recruitment notice (spec #174, Q24). */
const RECRUITMENT_WORDS = ["รับสมัคร", "สรรหา", "ลูกจ้าง"];

/** The news stream's categories that make an item News, PM 2.5 being ประชาสัมพันธ์'s child. */
const NEWS_CATEGORIES = ["ประชาสัมพันธ์", "PM 2.5"];

/**
 * The flags a row can carry, in the order a cell lists them. scripts/migration.ts documents each.
 */
const FLAGS = [
	"title-word",
	"no-category",
	"unmatched-categories",
	"pm25",
	"text",
	"no-file",
	"missing-file",
	"not-in-export",
] as const;

type Flag = (typeof FLAGS)[number];

/** A row's default: its target, its type by term slug, and the flags that explain it. */
interface Default {
	target: string;
	type: string;
	flags: Flag[];
}

/** The default of a news stream item (Q3): by its categories, then by its title's words. */
function newsDefault(item: LegacyItem): Default {
	const categories = new Set(item.categories);
	if (categories.size === 0) return { target: "News", type: "", flags: ["no-category"] };
	if ([...categories].every((name) => NEWS_CATEGORIES.includes(name))) {
		return { target: "News", type: "", flags: [] };
	}
	if (categories.size === 1 && categories.has("กิจกรรม")) {
		return NEWS_WORDS.some((word) => item.title.includes(word))
			? { target: TO_CHOOSE, type: "", flags: ["title-word"] }
			: { target: "Activity", type: "", flags: [] };
	}
	return { target: TO_CHOOSE, type: "", flags: ["unmatched-categories"] };
}

/** The default of a directive (Q4, Q24): an order is a Document, a notice an Announcement. */
function directiveDefault(item: LegacyItem): Default {
	const [category, ...others] = new Set(item.categories);
	if (category === undefined) return { target: TO_CHOOSE, type: "", flags: ["no-category"] };
	if (others.length === 0 && category === "คำสั่ง") {
		return { target: "Document", type: "order", flags: [] };
	}
	if (others.length === 0 && category === "ประกาศ") {
		const recruitment = RECRUITMENT_WORDS.some((word) => item.title.includes(word));
		return { target: "Announcement", type: recruitment ? "recruitment" : "general", flags: [] };
	}
	return { target: TO_CHOOSE, type: "", flags: ["unmatched-categories"] };
}

/** The default of an item: every procurement notice is an Announcement of จัดซื้อจัดจ้าง (Q24). */
function defaultOf(item: LegacyItem): Default {
	if (item.type === "public-new") return newsDefault(item);
	if (item.type === "directive") return directiveDefault(item);
	return {
		target: "Announcement",
		type: "procurement",
		flags: item.categories.length === 0 ? ["no-category"] : [],
	};
}

/** A date as the list writes it: the Bangkok calendar day, such as "2025-10-01". */
const BANGKOK_DAY = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Asia/Bangkok",
	calendar: "gregory",
	numberingSystem: "latn",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

function bangkokDay(instant: Date): string {
	const part = (type: string) => BANGKOK_DAY.formatToParts(instant).find((p) => p.type === type)!;
	return `${part("year").value}-${part("month").value}-${part("day").value}`;
}

/**
 * The Buddhist Era fiscal year of a Bangkok day: from October to September, 2569 from 2025-10-01.
 */
function fiscalYear(day: string): number {
	const [year, month] = day.split("-").map(Number) as [number, number];
	return (month >= 10 ? year + 1 : year) + 543;
}

/**
 * Whether HTML holds text: characters beside its markup, its non-breaking spaces and white space.
 */
const holdsText = (html: string) =>
	html
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;|&#160;/g, "")
		.trim() !== "";

/** The address in each `href` of an HTML text. */
const linksIn = (html: string) =>
	[...html.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(
		(match) => match[1] ?? match[2]!,
	);

/**
 * The path of an address on the Legacy site, as the uploads copy names its files
 * ("wp-content/uploads/2025/03/a.pdf"), or none for an address elsewhere. An address may be
 * absolute or root-relative, and percent-encoded or not.
 */
function sitePath(address: string): string | undefined {
	let url: URL;
	try {
		url = new URL(address, `https://${LEGACY_HOST}/`);
	} catch {
		return undefined;
	}
	if (url.host !== LEGACY_HOST) return undefined;
	try {
		return decodeURIComponent(url.pathname).slice(1);
	} catch {
		return url.pathname.slice(1);
	}
}

/** A path into the site's uploads, with `/wp-content` or without it (legacy-ita.md defect 3). */
const isUploadsPath = (path: string) => /(^|\/)uploads\//.test(path);

/** The export's attachments and the uploads copy, as the plan looks them up. */
interface Files {
	byId: Map<number, LegacyAttachment & { path: string | undefined }>;
	byPath: Map<string, number>;
	uploads: Set<string>;
}

/** What an item uses of the uploads: attachment IDs, and links into them that name none. */
interface Uses {
	attachments: number[];
	unlisted: { href: string; path: string }[];
}

/**
 * The attachments an item's featured image, ACF fields and links use, and its other upload links.
 */
function usesOf(item: LegacyItem, files: Files): Uses {
	const attachments = [item.featured, ...item.pictures, ...item.files.map((file) => file.id)];
	const unlisted: Uses["unlisted"] = [];
	for (const href of [...linksIn(item.content), ...linksIn(item.editor)]) {
		const path = sitePath(href);
		if (path === undefined || !isUploadsPath(path)) continue;
		const id = files.byPath.get(path);
		if (id === undefined) unlisted.push({ href, path });
		else attachments.push(id);
	}
	return {
		attachments: [...new Set(attachments.filter((id) => id !== undefined))],
		unlisted,
	};
}

/**
 * Whether an item uses a file the uploads copy lacks, or an attachment the export does not list.
 */
function missesFile(uses: Uses, files: Files): boolean {
	return (
		uses.attachments.some((id) => {
			const path = files.byId.get(id)?.path;
			return path === undefined || !files.uploads.has(path);
		}) || uses.unlisted.some(({ path }) => !files.uploads.has(path))
	);
}

/** An item's categories as a cell: their names in code point order, joined by a semicolon. */
const categoriesCell = (item: LegacyItem) => [...new Set(item.categories)].toSorted().join("; ");

/** The fresh row of a published item, with its defaults and empty decision and Summary. */
function rowOf(item: LegacyItem, files: Files): ListRow {
	const { target, type, flags } = defaultOf(item);
	if (item.published === undefined) throw new Error(`${item.slug} has no publish date`);
	const day = bangkokDay(item.published);
	if (item.categories.includes("PM 2.5")) flags.push("pm25");
	if (holdsText(item.editor) || holdsText(item.content)) flags.push("text");
	if (item.type !== "public-new" && item.files.length === 0) flags.push("no-file");
	if (missesFile(usesOf(item, files), files)) flags.push("missing-file");
	return {
		legacy_type: item.type,
		slug: item.slug,
		wp_id: String(item.id),
		title: item.title,
		published: day,
		fiscal_year: String(fiscalYear(day)),
		categories: categoriesCell(item),
		flags: FLAGS.filter((flag) => flags.includes(flag)).join(" "),
		default_target: target,
		default_type: type,
		decision: "",
		decision_type: "",
		summary: "",
	};
}

/** The targets a reviewer may give a row, by its legacy type (GLOSSARY "Classification list"). */
const TARGETS: Record<string, string[]> = {
	"public-new": ["News", "Activity"],
	directive: ["Announcement", "Document"],
	procurement: ["Announcement", "Document"],
};

/**
 * A row's target: its decision, in any case and with spaces around it, else its default. None for
 * a decision that names no target its legacy type can take.
 */
function targetOf(row: ListRow): string | undefined {
	const decision = row.decision.trim();
	if (decision === "") return row.default_target;
	if (decision === TO_CHOOSE) return TO_CHOOSE;
	return TARGETS[row.legacy_type]?.find(
		(target) => target.toLowerCase() === decision.toLowerCase(),
	);
}

/** The byte order mark that starts the list, so that a spreadsheet opens its Thai as UTF-8. */
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/**
 * A cell as CSV writes it (RFC 4180): quoted when it holds a comma, a double quote or a line break.
 */
const csvCell = (value: string) =>
	/[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** The records of a CSV text (RFC 4180), after a byte order mark, with CRLF or LF line endings. */
function csvRecords(text: string): string[][] {
	const records: string[][] = [];
	let record: string[] = [];
	let cell = "";
	let quoted = false;
	for (let at = text.startsWith(BYTE_ORDER_MARK) ? 1 : 0; at < text.length; at++) {
		const char = text[at]!;
		if (quoted) {
			if (char !== '"') cell += char;
			else if (text[at + 1] === '"') cell += text[++at];
			else quoted = false;
		} else if (char === '"') {
			quoted = true;
		} else if (char === ",") {
			record.push(cell);
			cell = "";
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && text[at + 1] === "\n") at++;
			records.push([...record, cell]);
			record = [];
			cell = "";
		} else {
			cell += char;
		}
	}
	if (quoted) throw new Error("the earlier list ends inside a quoted cell");
	if (cell !== "" || record.length > 0) records.push([...record, cell]);
	// A blank line holds no row.
	return records.filter((cells) => cells.length > 1 || cells[0] !== "");
}

/** An earlier list's header and rows. Refuses a list that would lose what reviewers wrote. */
function readList(text: string): { header: string[]; rows: ListRow[] } {
	const [header = [], ...records] = csvRecords(text);
	const missing = COLUMNS.filter((column) => !header.includes(column));
	if (missing.length > 0) throw new Error(`the earlier list has no column ${missing.join(", ")}`);
	if (new Set(header).size < header.length)
		throw new Error("the earlier list names a column twice");
	const ids = new Set<string>();
	const rows = records.map((cells, index) => {
		if (cells.length !== header.length) {
			throw new Error(
				`row ${index + 1} of the earlier list has ${cells.length} cells, not ${header.length}`,
			);
		}
		const row = Object.fromEntries(header.map((column, at) => [column, cells[at]!])) as ListRow;
		if (!/^\d+$/.test(row.wp_id))
			throw new Error(`row ${index + 1} of the earlier list has no WordPress ID`);
		if (ids.has(row.wp_id))
			throw new Error(`the earlier list holds WordPress ID ${row.wp_id} twice`);
		ids.add(row.wp_id);
		return row;
	});
	return { header, rows };
}

/**
 * The earlier list's rows, in its order, then the items it lacks. A row keeps what reviewers wrote
 * (its decision, type decision and Summary, and the columns they added) and takes everything else
 * from the export; a row whose item the export no longer holds stays as it was, flagged.
 */
function merged(fresh: ListRow[], earlier: ListRow[]) {
	const freshRows = new Map(fresh.map((row) => [row.wp_id, row]));
	const vanished: ListRow[] = [];
	const kept = earlier.map((row): ListRow => {
		const now = freshRows.get(row.wp_id);
		if (now === undefined) {
			const gone = { ...row, flags: "not-in-export" };
			vanished.push(gone);
			return gone;
		}
		return {
			...row,
			...now,
			decision: row.decision,
			decision_type: row.decision_type,
			summary: row.summary,
		};
	});
	const earlierIds = new Set(earlier.map((row) => row.wp_id));
	const added = fresh.filter((row) => !earlierIds.has(row.wp_id));
	return { rows: [...kept, ...added], added, vanished };
}

/** What the list holds after a plan, as the inventory reports it and the command prints it. */
interface ListReport {
	/** Whether plan merged an earlier list. */
	earlier: boolean;
	/** The rows in the file, those flagged not-in-export included. */
	rows: number;
	/** The rows of the export's items by target, a decision applied, ต้องเลือก for an unread one. */
	targets: Record<string, number>;
	/** The Announcements and Documents by type slug, a type decision applied. */
	types: Record<string, Record<string, number>>;
	/** The slugs of the rows still ต้องเลือก, by default or by decision. */
	toChoose: string[];
	/** The rows whose decision names no target their legacy type can take. */
	unreadable: { slug: string; decision: string }[];
	/** The slugs of the rows a merge appended. */
	added: string[];
	/** The slugs of the rows whose item the export no longer holds. */
	vanished: string[];
}

function listReport(merge: ReturnType<typeof merged>, earlier: boolean): ListReport {
	const current = merge.rows.filter((row) => !merge.vanished.includes(row));
	const targets: Record<string, number> = Object.fromEntries(
		["News", "Activity", "Announcement", "Document", TO_CHOOSE].map((target) => [target, 0]),
	);
	const types: Record<string, Record<string, number>> = { Announcement: {}, Document: {} };
	for (const row of current) {
		const target = targetOf(row) ?? TO_CHOOSE;
		targets[target] = (targets[target] ?? 0) + 1;
		const type = row.decision_type.trim() || row.default_type;
		if (type && types[target]) types[target][type] = (types[target][type] ?? 0) + 1;
	}
	return {
		earlier,
		rows: merge.rows.length,
		targets,
		types,
		toChoose: current.filter((row) => targetOf(row) === TO_CHOOSE).map((row) => row.slug),
		unreadable: current
			.filter((row) => targetOf(row) === undefined)
			.map((row) => ({ slug: row.slug, decision: row.decision })),
		added: earlier ? merge.added.map((row) => row.slug) : [],
		vanished: merge.vanished.map((row) => row.slug),
	};
}

/**
 * The inventory of the export, the uploads copy and the list (spec #174 "The migration script").
 */
interface Inventory {
	/** The items of each type the migration reads, and the pages, by their WordPress status. */
	items: Record<string, Record<string, number>>;
	/** Each type's published items by their categories, as the list's cell names them. */
	categories: Record<string, Record<string, number>>;
	attachments: {
		/** The export's attachments. */
		total: number;
		/**
		 * The attachments that published items use through their featured image, ACF fields and links,
		 * as `docs/research/legacy-site.md` counted them.
		 */
		used: number;
		/** The attachments each type's published items use; one attachment can serve several. */
		usedBy: Record<string, number>;
		/** The attachments no published item uses, and how many of each file extension. */
		unused: number;
		unusedByExtension: Record<string, number>;
	};
	/** The used attachments whose file the uploads copy lacks, and the IDs no attachment has. */
	missing: { id: number; path?: string; usedBy: string[] }[];
	/** The links of published items into the uploads that name no attachment of the export. */
	unlistedLinks: { item: string; href: string; inUploads: boolean }[];
	/** The uploads copy's entries, folders included, and its files under wp-content/uploads. */
	uploads: { entries: number; files: number };
	list: ListReport;
}

/** Adds one to `key`'s count. */
function count(counts: Record<string, number>, key: string): void {
	counts[key] = (counts[key] ?? 0) + 1;
}

/** A file's extension in lower case, or "(none)". */
function extensionOf(path: string | undefined): string {
	const name = path?.split("/").at(-1) ?? "";
	return name.includes(".") ? name.split(".").at(-1)!.toLowerCase() : "(none)";
}

function inventoryOf(
	site: LegacySite,
	files: Files,
	uploads: string[],
	list: ListReport,
): Inventory {
	const items: Inventory["items"] = Object.fromEntries(
		[...ITEM_TYPES, "page"].map((type) => [type, {}]),
	);
	for (const item of site.items) count(items[item.type]!, item.status);
	for (const page of site.pages) count(items.page!, page.status);
	const published = site.items.filter((item) => item.status === "publish");
	const categories: Inventory["categories"] = Object.fromEntries(
		ITEM_TYPES.map((type) => [type, {}]),
	);
	for (const item of published) count(categories[item.type]!, categoriesCell(item) || "(none)");
	const users = new Map<number, string[]>();
	const usedBy = Object.fromEntries(ITEM_TYPES.map((type) => [type, new Set<number>()]));
	const unlistedLinks: Inventory["unlistedLinks"] = [];
	for (const item of published) {
		const uses = usesOf(item, files);
		for (const id of uses.attachments) {
			users.set(id, [...(users.get(id) ?? []), item.slug]);
			if (files.byId.has(id)) usedBy[item.type]!.add(id);
		}
		for (const { href, path } of uses.unlisted) {
			unlistedLinks.push({ item: item.slug, href, inUploads: files.uploads.has(path) });
		}
	}
	const unused = site.attachments.filter((attachment) => !users.has(attachment.id));
	const unusedByExtension: Record<string, number> = {};
	for (const attachment of unused)
		count(unusedByExtension, extensionOf(files.byId.get(attachment.id)!.path));
	const missing = [...users]
		.toSorted(([a], [b]) => a - b)
		.flatMap(([id, slugs]) => {
			const attachment = files.byId.get(id);
			if (attachment === undefined) return [{ id, usedBy: slugs }];
			const { path } = attachment;
			return path !== undefined && files.uploads.has(path) ? [] : [{ id, path, usedBy: slugs }];
		});
	return {
		items,
		categories,
		attachments: {
			total: site.attachments.length,
			used: site.attachments.length - unused.length,
			usedBy: Object.fromEntries(ITEM_TYPES.map((type) => [type, usedBy[type]!.size])),
			unused: unused.length,
			unusedByExtension,
		},
		missing,
		unlistedLinks,
		uploads: {
			entries: uploads.length,
			files: uploads.filter((name) => name.startsWith("wp-content/uploads/") && !name.endsWith("/"))
				.length,
		},
		list,
	};
}

/** What the plan command makes of the export and the uploads copy's file list. */
export interface Plan {
	/** The Classification list's rows, in the file's order. */
	rows: ListRow[];
	/** The list as the text of its UTF-8 CSV file. */
	list: string;
	inventory: Inventory;
}

export interface PlanInput {
	site: LegacySite;
	/** The names of the uploads copy's entries, files and folders, as its zip lists them. */
	uploads: string[];
	/** The text of an earlier Classification list, to merge with. */
	earlier?: string;
}

/** The export's attachments by ID and by path, and the uploads copy's files. */
function filesOf(site: LegacySite, uploads: string[]): Files {
	const byId: Files["byId"] = new Map();
	const byPath: Files["byPath"] = new Map();
	for (const attachment of site.attachments) {
		const path = sitePath(attachment.url);
		byId.set(attachment.id, { ...attachment, path });
		if (path !== undefined) byPath.set(path, attachment.id);
	}
	return { byId, byPath, uploads: new Set(uploads) };
}

/**
 * Rows in the list's order: the news stream, directives, procurement notices, each oldest first.
 */
function inListOrder(a: LegacyItem, b: LegacyItem): number {
	return (
		LISTED_TYPES.indexOf(a.type) - LISTED_TYPES.indexOf(b.type) ||
		(a.published?.getTime() ?? 0) - (b.published?.getTime() ?? 0) ||
		a.id - b.id
	);
}

/** The plan of an export: its Classification list, merged with an earlier list when given. */
export function plan({ site, uploads, earlier }: PlanInput): Plan {
	const files = filesOf(site, uploads);
	const fresh = site.items
		.filter((item) => LISTED_TYPES.includes(item.type) && item.status === "publish")
		.toSorted(inListOrder)
		.map((item) => rowOf(item, files));
	const previous = earlier === undefined ? undefined : readList(earlier);
	const merge = merged(fresh, previous?.rows ?? []);
	const header = [
		...COLUMNS,
		...(previous?.header ?? []).filter(
			(column) => !(COLUMNS as readonly string[]).includes(column),
		),
	];
	// A row the merge appended has an empty cell in each column reviewers added.
	const rows = merge.rows.map((row): ListRow => ({
		...Object.fromEntries(header.map((column) => [column, ""])),
		...row,
	}));
	const lines = [header, ...rows.map((row) => header.map((column) => row[column]!))];
	return {
		rows,
		list: BYTE_ORDER_MARK + lines.map((cells) => `${cells.map(csvCell).join(",")}\r\n`).join(""),
		inventory: inventoryOf(site, files, uploads, listReport(merge, previous !== undefined)),
	};
}

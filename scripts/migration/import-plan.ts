// What the migration script's import command writes (#178; spec #174 "The migration script",
// "Mapping: the news stream" and "Redirects"): the plan of an export and its Classification list.
// scripts/migration.ts reads the files and scripts/migration/writer.ts applies the plan; this
// module imports nothing at run time, so node:test checks it directly
// (tests/node/migration-import.test.ts).

import type { LegacyItem, LegacySite } from "./legacy-site.ts";
import { filesOf, holdsText, linksIn, plan, targetOf, TO_CHOOSE, type ListRow } from "./plan.ts";

/** A Portable Text block, as EmDash's converter makes it. */
export interface Block {
	_type: string;
	children?: { text: string }[];
}

/** The Media Library folder of the news stream's pictures (spec #174 "Pages, media and links"). */
const NEWS_FOLDER = "เว็บไซต์เดิม: ข่าวและกิจกรรม";

/** An attachment that an entry's field holds, which the writer replaces with its media item. */
interface PictureRef {
	picture: number;
}

/** A used file, which the import uploads once. */
interface PlannedPicture {
	/** Its attachment's WordPress ID, by which the entries name it. */
	attachment: number;
	/** Its entry in the uploads copy. */
	path: string;
	filename: string;
	folder: string;
	alt: string;
	caption: string;
}

/** An entry the import creates and publishes. */
interface PlannedEntry {
	collection: "news" | "activities";
	slug: string;
	/** The legacy publish date, as an ISO 8601 instant. */
	publishedAt: string;
	data: Record<string, unknown>;
	taxonomies: Record<string, string[]>;
	/** Its canonical address on Songhealth. */
	page: string;
}

/** What the import report says of the plan (spec #174 user story 33). */
interface ImportReport {
	/** The used attachments without a file to upload, and the items that use each. */
	missing: { attachment: number; path?: string; usedBy: string[] }[];
	/** What the import could not carry, by item. */
	notes: { slug: string; note: string }[];
	/** The rows still ต้องเลือก that a trial took at their default. */
	atDefault: { slug: string; target: NewsTarget }[];
	/** The rows whose item the export no longer holds. */
	notInExport: string[];
}

/** A 301 from a legacy address to a page on Songhealth (spec #174 "Redirects"). */
interface PlannedRedirect {
	source: string;
	destination: string;
}

export interface ImportPlan {
	pictures: PlannedPicture[];
	entries: PlannedEntry[];
	redirects: PlannedRedirect[];
	report: ImportReport;
}

/** What the target holds that the import must not write over. */
export interface TargetState {
	/** The entries of the plan's collections, those in the trash included. */
	entries: { collection: string; slug: string | null; trashed: boolean }[];
	terms: { taxonomy: string; slug: string }[];
	/** The sources of its redirects. */
	redirects: string[];
}

export interface ImportInput {
	site: LegacySite;
	/** The names of the uploads copy's entries. */
	uploads: string[];
	/** The text of the Classification list. */
	list: string;
	/** Whether this is the final run, not a trial. */
	final: boolean;
	/** HTML as Portable Text blocks, which the run-time reader provides. */
	toBlocks: (html: string) => Block[];
}

type NewsTarget = "News" | "Activity";

const isNewsTarget = (target: string | undefined): target is NewsTarget =>
	target === "News" || target === "Activity";

/**
 * A news stream row's target: its decision, else its default. A trial takes a row still ต้องเลือก at
 * its default, and a title-word row, which starts as ต้องเลือก, at its category's default, an
 * Activity (spec #174 "The migration script"). A row with neither stops the run: none exists in
 * the export of 2026-11-06, and an item imported nowhere would leave the counts short.
 */
function targetFor(row: ListRow): { target: NewsTarget; atDefault: boolean } {
	const target = targetOf(row);
	if (isNewsTarget(target)) return { target, atDefault: false };
	if (isNewsTarget(row.default_target)) return { target: row.default_target, atDefault: true };
	if (row.flags.split(" ").includes("title-word")) return { target: "Activity", atDefault: true };
	throw new Error(`${row.slug} has no default: decide it in the Classification list`);
}

/** The file's name, the last part of its path. */
const filenameOf = (path: string) => path.split("/").at(-1)!;

/**
 * An item is about PM 2.5 by its category, or by its title, as the two reports without a category
 * are (spec #174 "Mapping: the news stream", ANOM-002).
 */
const isPm25 = (row: ListRow, title: string) =>
	row.flags.split(" ").includes("pm25") || /PM\s*2\.5/i.test(title);

/** Blocks as plain text: a line per block, keeping the line breaks inside one. */
const textOf = (blocks: Block[]) =>
	blocks
		.map((block) =>
			(block.children ?? [])
				.map((span) => span.text)
				.join("")
				.trim(),
		)
		.filter((line) => line !== "")
		.join("\n");

/** The elements of HTML that neither a body nor a Summary carries: pictures and embeds. */
const embedsIn = (html: string) =>
	[...html.matchAll(/<(?:img|iframe|embed|object|video|audio)\b[^>]*>/gi)].map(([tag]) => tag);

/** The plan of an export and its Classification list. */
export function planImport({ site, uploads, list, final, toBlocks }: ImportInput): ImportPlan {
	const { rows, inventory } = plan({ site, uploads, earlierList: list });
	const { added, toChoose, vanished } = inventory.list;
	if (added.length > 0)
		throw new Error(`the list has no row for ${added.join(", ")}: run plan again`);
	if (final && toChoose.length > 0) {
		throw new Error(
			`the final import refuses while these rows are "${TO_CHOOSE}": ${toChoose.join(", ")}`,
		);
	}
	const files = filesOf(site, uploads);
	// A row whose item has gone back to a draft stays out with the rows plan flags not-in-export.
	const items = new Map(
		site.items.filter((item) => item.status === "publish").map((item) => [String(item.id), item]),
	);
	const notes: ImportReport["notes"] = [];
	const newsRows = rows.filter((row) => row.legacy_type === "public-new" && items.has(row.wp_id));
	const atDefault: ImportReport["atDefault"] = [];
	/** The item whose featured image each attachment is. */
	const featuredIn = new Map<number, string>();
	for (const row of newsRows) {
		const item = items.get(row.wp_id)!;
		if (item.featured !== undefined && !featuredIn.has(item.featured)) {
			featuredIn.set(item.featured, item.slug);
		}
	}
	/** Each used attachment's items, in the order the entries first use it. */
	const usedBy = new Map<number, string[]>();
	const use = (id: number, slug: string) => {
		const slugs = usedBy.get(id) ?? [];
		if (!slugs.includes(slug)) slugs.push(slug);
		usedBy.set(id, slugs);
	};
	const available = (id: number) => {
		const path = files.byId.get(id)?.path;
		return path !== undefined && files.uploads.has(path);
	};
	/** A field's value for an attachment whose file exists, or none. */
	const refTo = (id: number | undefined): PictureRef | undefined =>
		id !== undefined && available(id) ? { picture: id } : undefined;
	/** The item's ACF pictures beside its featured image, each named once. */
	const otherPictures = (item: LegacyItem) =>
		[...new Set(item.pictures)].filter((id) => {
			if (id === item.featured) return false;
			const owner = featuredIn.get(id);
			if (owner === undefined || owner === item.slug) return true;
			notes.push({
				slug: item.slug,
				note: `picture ${id} is the featured image of ${owner}: left out`,
			});
			return false;
		});
	/** An item's text as HTML: its ACF editor's, else its block editor's. */
	const textHtmlOf = (item: LegacyItem) => {
		if (!holdsText(item.editor)) return item.content;
		if (holdsText(item.content)) {
			notes.push({
				slug: item.slug,
				note: "the block editor's text is not carried beside the ACF editor's",
			});
		}
		return item.editor;
	};
	const entries = newsRows.map((row): PlannedEntry => {
		const item = items.get(row.wp_id)!;
		const chosen = targetFor(row);
		if (chosen.atDefault) atDefault.push({ slug: item.slug, target: chosen.target });
		const collection = chosen.target === "News" ? "news" : "activities";
		if (item.featured !== undefined) use(item.featured, item.slug);
		for (const id of item.pictures) use(id, item.slug);
		const featured = refTo(item.featured);
		if (featured === undefined) notes.push({ slug: item.slug, note: "no featured picture" });
		const html = textHtmlOf(item);
		for (const element of embedsIn(html))
			notes.push({ slug: item.slug, note: `not carried: ${element}` });
		const blocks = holdsText(html) ? toBlocks(html) : [];
		// A picture's block would hold its address on the Legacy site (embedsIn reports it).
		const body = blocks.filter((block) => block._type !== "image");
		// Text, which only a row moved from News can have, gives an Activity its Summary, unless the
		// list holds one (spec #174 "Mapping: the news stream").
		const text = collection === "activities" ? textOf(body) : "";
		if (collection === "activities") {
			for (const { _type: type } of body) {
				if (type !== "block") notes.push({ slug: item.slug, note: `not carried: a ${type} block` });
			}
			for (const href of linksIn(html))
				notes.push({ slug: item.slug, note: `link not carried: ${href}` });
		}
		if (text !== "" && row.summary.trim() !== "") {
			notes.push({ slug: item.slug, note: "the list's Summary stands in for the item's text" });
		}
		const summary = row.summary.trim() || text;
		const others = otherPictures(item);
		if (collection === "news" && others.length > 0) {
			notes.push({
				slug: item.slug,
				note: `ACF pictures with no field on a News: ${others.join(", ")}`,
			});
		}
		const gallery = others.flatMap((id) => {
			const image = refTo(id);
			if (image === undefined) return [];
			const caption = files.byId.get(id)!.caption;
			return [caption === "" ? { image } : { image, caption }];
		});
		const data = {
			title: item.title,
			...(summary === "" ? {} : { summary }),
			...(featured === undefined ? {} : { featured_image: featured }),
			...(collection === "news"
				? { ...(body.length === 0 ? {} : { body }) }
				: { ...(gallery.length === 0 ? {} : { gallery }) }),
		};
		return {
			collection,
			slug: item.slug,
			publishedAt: item.published!.toISOString(),
			data,
			taxonomies: collection === "news" && isPm25(row, item.title) ? { topic: ["pm25"] } : {},
			page: `/${collection}/${item.slug}`,
		};
	});
	const pictures = [...usedBy.keys()].filter(available).map((id): PlannedPicture => {
		const { path, alt, caption } = files.byId.get(id)!;
		return {
			attachment: id,
			path: path!,
			filename: filenameOf(path!),
			folder: NEWS_FOLDER,
			alt,
			caption,
		};
	});
	const missing = [...usedBy]
		.filter(([id]) => !available(id))
		.map(([attachment, slugs]) => {
			const path = files.byId.get(attachment)?.path;
			return { attachment, ...(path === undefined ? {} : { path }), usedBy: slugs };
		});
	const redirects = entries.map(({ slug, page }) => ({
		source: `/public-new/${slug}/`,
		destination: page,
	}));
	return {
		pictures,
		entries,
		redirects,
		report: { missing, notes, atDefault, notInExport: vanished },
	};
}

/**
 * An address without its last slash, since EmDash's redirects match a path with or without it
 * (emdash 1.1.0 src/astro/middleware/redirect.ts).
 */
const withoutLastSlash = (path: string) => path.replace(/\/$/, "");

/**
 * Why the import must stop before it writes anything, or none (spec #174 "The migration script"):
 * the first target slug that exists, a slug in the trash staying taken
 * (`docs/agents/emdash-1.1.0.md` "Native API for tests"); a term the plan's entries need, which
 * only the model-update step adds; or a legacy address that already redirects, whose second rule
 * EmDash would refuse partway through (emdash 1.1.0 src/api/handlers/redirects.ts
 * handleRedirectCreate).
 */
export function firstStop(planned: ImportPlan, target: TargetState): string | undefined {
	const held = new Map(
		target.entries.map((entry) => [`${entry.collection}/${entry.slug}`, entry.trashed]),
	);
	for (const { collection, slug } of planned.entries) {
		const trashed = held.get(`${collection}/${slug}`);
		if (trashed !== undefined) {
			return `${slug} already exists in ${collection}${trashed ? " (in the trash)" : ""}`;
		}
	}
	const terms = new Set(target.terms.map(({ taxonomy, slug }) => `${taxonomy}/${slug}`));
	for (const [taxonomy, slugs] of planned.entries.flatMap((entry) =>
		Object.entries(entry.taxonomies),
	)) {
		for (const slug of slugs) {
			if (!terms.has(`${taxonomy}/${slug}`)) {
				return `the ${taxonomy} term ${slug} is missing: run the model-update step`;
			}
		}
	}
	const sources = new Set(target.redirects.map(withoutLastSlash));
	const taken = planned.redirects.find(({ source }) => sources.has(withoutLastSlash(source)));
	return taken && `a redirect from ${taken.source} already exists`;
}

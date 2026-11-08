// What the migration script's import command writes (#178, #179; spec #174 "The migration script",
// "Mapping: the news stream", "Mapping: directives and procurement notices" and "Redirects"): the
// plan of an export and its Classification list.
// scripts/migration.ts reads the files and scripts/migration/writer.ts applies the plan; at run
// time this module imports only the planner, which imports nothing, so node:test checks it directly
// (tests/node/migration-import.test.ts).

import type { LegacyItem, LegacySite } from "./legacy-site.ts";
import {
	count,
	filesOf,
	hasFlag,
	holdsText,
	linksIn,
	plan,
	targetOf,
	TO_CHOOSE,
	typeOf,
	usesOf,
	type ListRow,
	type Target,
} from "./plan.ts";

/** A Portable Text block, as EmDash's converter makes it. */
export interface Block {
	_type: string;
	children?: { text: string }[];
}

/** The Media Library folders of the items' files (spec #174 "Pages, media and links"). */
const NEWS_FOLDER = "เว็บไซต์เดิม: ข่าวและกิจกรรม";
const NOTICES_FOLDER = "เว็บไซต์เดิม: ประกาศและเอกสาร";

/** An attachment that an entry's field holds, which the writer replaces with its media item. */
interface PictureRef {
	picture: number;
}

/** A used file, which the import uploads once. */
interface PlannedFile {
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
	collection: "news" | "activities" | "announcements" | "documents";
	slug: string;
	/** The legacy publish date, as an ISO 8601 instant. */
	publishedAt: string;
	data: Record<string, unknown>;
	taxonomies: Record<string, string[]>;
	/** The Documents an Announcement references, by slug, which the plan places before it. */
	documents?: string[];
	/** Its canonical address on Songhealth. */
	page: string;
}

/** What the import report says of the plan (spec #174 user story 33). */
interface ImportReport {
	/** The items by legacy type and target. */
	groups: Record<string, Record<string, number>>;
	/** The used attachments without a file to upload, and the items that use each. */
	missing: { attachment: number; path?: string; usedBy: string[] }[];
	/** What the import could not carry, by item. */
	notes: { slug: string; note: string }[];
	/** The rows still ต้องเลือก that a trial took at their default. */
	atDefault: { slug: string; target: EntryTarget }[];
	/** The rows whose item the export no longer holds. */
	notInExport: string[];
}

/** A 301 from a legacy address to a page on Songhealth (spec #174 "Redirects"). */
interface PlannedRedirect {
	source: string;
	destination: string;
}

export interface ImportPlan {
	files: PlannedFile[];
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

type EntryTarget = Exclude<Target, typeof TO_CHOOSE>;

const isEntryTarget = (target: string | undefined): target is EntryTarget =>
	target === "News" || target === "Activity" || target === "Announcement" || target === "Document";

/**
 * A row's target: its decision, else its default. A trial takes a row still ต้องเลือก at its
 * default, and a title-word row, which starts as ต้องเลือก, at its category's default, an Activity
 * (spec #174 "The migration script"). A row with neither stops the run: none exists in the export
 * of 2026-11-06, and an item imported nowhere would leave the counts short (Product Owner, #178
 * comment 6720200201, item 2).
 */
function targetFor(row: ListRow): { target: EntryTarget; atDefault: boolean } {
	const target = targetOf(row);
	if (isEntryTarget(target)) return { target, atDefault: false };
	if (isEntryTarget(row.default_target)) return { target: row.default_target, atDefault: true };
	if (hasFlag(row, "title-word")) return { target: "Activity", atDefault: true };
	throw new Error(`${row.slug} has no default: decide it in the Classification list`);
}

/** The file's name, the last part of its path. */
const filenameOf = (path: string) => path.split("/").at(-1)!;

/**
 * An item is about PM 2.5 by its category, or by its title, as the two reports without a category
 * are (spec #174 "Mapping: the news stream", ANOM-002).
 */
const isPm25 = (row: ListRow, title: string) => hasFlag(row, "pm25") || /PM\s*2\.5/i.test(title);

/**
 * Blocks as plain text: a line per block, keeping the line breaks inside one. EmDash's
 * extractPlainText puts a blank line between blocks and adds a code block's text, which the report
 * names instead (`docs/agents/emdash-1.1.0.md` "Search and seeding").
 */
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

/**
 * The title of a Document made from one of an item's files: the item's, followed by the file's
 * label when the item has several files (spec #174 "Mapping: directives and procurement notices").
 */
const documentTitle = (item: LegacyItem, label: string) =>
	item.files.length > 1 && label.trim() !== "" ? `${item.title} – ${label.trim()}` : item.title;

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
	const legacyFiles = filesOf(site, uploads);
	// A row whose item has gone back to a draft stays out with the rows plan flags not-in-export.
	const items = new Map(
		site.items.filter((item) => item.status === "publish").map((item) => [String(item.id), item]),
	);
	const notes: ImportReport["notes"] = [];
	const newsRows = rows.filter((row) => row.legacy_type === "public-new" && items.has(row.wp_id));
	const directiveAndProcurementRows = rows.filter(
		(row) => row.legacy_type !== "public-new" && items.has(row.wp_id),
	);
	const atDefault: ImportReport["atDefault"] = [];
	const groups: ImportReport["groups"] = {};
	/**
	 * A row's target, which the report counts, and lists when a trial took the row at its default.
	 */
	const decide = (row: ListRow) => {
		const { target, atDefault: wasDefault } = targetFor(row);
		if (wasDefault) atDefault.push({ slug: row.slug, target });
		count((groups[row.legacy_type] ??= {}), target);
		return target;
	};
	/** The item whose featured image each attachment is. */
	const featuredIn = new Map<number, string>();
	for (const row of [...newsRows, ...directiveAndProcurementRows]) {
		const item = items.get(row.wp_id)!;
		if (item.featured !== undefined && !featuredIn.has(item.featured)) {
			featuredIn.set(item.featured, item.slug);
		}
	}
	/** Each used attachment's items, in the order the entries first use it. */
	const usedBy = new Map<number, string[]>();
	/** Each used attachment's folder: its first use's, as a file is uploaded once. */
	const folderOf = new Map<number, string>();
	const use = (id: number, slug: string, folder: string) => {
		const slugs = usedBy.get(id) ?? [];
		if (!slugs.includes(slug)) slugs.push(slug);
		usedBy.set(id, slugs);
		if (!folderOf.has(id)) folderOf.set(id, folder);
	};
	const available = (id: number) => {
		const path = legacyFiles.byId.get(id)?.path;
		return path !== undefined && legacyFiles.uploads.has(path);
	};
	/** A field's value for an attachment whose file exists, or none. */
	const refTo = (id: number | undefined): PictureRef | undefined =>
		id !== undefined && available(id) ? { picture: id } : undefined;
	/**
	 * The item's ACF pictures beside its featured image, each named once. A picture that is another
	 * item's featured image, such as news-252's, stays off the page and goes into the report
	 * (Product Owner, #178 comment 6720200201, item 2).
	 */
	const otherPictures = (item: LegacyItem) =>
		[...new Set(item.pictures)].filter((id) => {
			if (id === item.featured) return false;
			const owner = featuredIn.get(id);
			if (owner === undefined) return true;
			notes.push({
				slug: item.slug,
				note: `picture ${id} is the featured image of ${owner}: left out`,
			});
			return false;
		});
	/** A picture's image block, as a body or an Announcement's details holds one. */
	const pictureBlock = (id: number) => {
		const { alt, caption } = legacyFiles.byId.get(id)!;
		const picture = {
			_type: "image",
			_key: `legacy-picture-${id}`,
			asset: { bodyPicture: id },
		};
		return { ...picture, alt, ...(caption === "" ? {} : { caption }) };
	};
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
	const redirects: PlannedRedirect[] = [];
	/** Plans the 301 from a row's legacy address to the page that replaces it. */
	const redirect = ({ legacy_type: type, slug }: ListRow, destination: string) =>
		redirects.push({ source: `/${type}/${slug}/`, destination });
	const newsEntry = (row: ListRow): PlannedEntry => {
		const item = items.get(row.wp_id)!;
		const collection = decide(row) === "News" ? "news" : "activities";
		const uses = usesOf(item, legacyFiles);
		for (const id of uses.attachments) use(id, item.slug, NEWS_FOLDER);
		for (const { id } of item.files) {
			notes.push({ slug: item.slug, note: `ACF file ${id}: no field holds it` });
		}
		const featured = refTo(item.featured);
		if (featured === undefined) notes.push({ slug: item.slug, note: "no featured picture" });
		const html = textHtmlOf(item);
		for (const element of embedsIn(html))
			notes.push({ slug: item.slug, note: `not carried: ${element}` });
		const blocks = holdsText(html) ? toBlocks(html) : [];
		// A picture's block would hold its address on the Legacy site (embedsIn reports it).
		const body = blocks.filter((block) => block._type !== "image");
		// Text, which only a row moved from News can have, gives an Activity its Summary (spec #174
		// "Mapping: the news stream"), unless the list holds one (Product Owner, #178 comment
		// 6720200201, item 2).
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
		if (collection === "news") {
			for (const { href } of uses.unlisted) {
				notes.push({
					slug: item.slug,
					note: `a link into the uploads names no attachment: ${href}`,
				});
			}
		}
		const others = otherPictures(item).filter(available);
		const gallery = others.map((id) => {
			const image = refTo(id)!;
			const { caption } = legacyFiles.byId.get(id)!;
			return caption === "" ? { image } : { image, caption };
		});
		// A News has no gallery, so its other pictures follow its text in the body (Product Owner,
		// #178 comment 6720200201, item 1).
		const newsBody = [...body, ...others.map(pictureBlock)];
		const data = {
			title: item.title,
			...(summary === "" ? {} : { summary }),
			...(featured === undefined ? {} : { featured_image: featured }),
			...(collection === "news"
				? { ...(newsBody.length === 0 ? {} : { body: newsBody }) }
				: { ...(gallery.length === 0 ? {} : { gallery }) }),
		};
		const page = `/${collection}/${item.slug}`;
		redirect(row, page);
		return {
			collection,
			slug: item.slug,
			publishedAt: item.published!.toISOString(),
			data,
			taxonomies: collection === "news" && isPm25(row, item.title) ? { topic: ["pm25"] } : {},
			page,
		};
	};
	/**
	 * A directive's or a procurement notice's entries (spec #174 "Mapping: directives and procurement
	 * notices"): an Announcement after the Documents it references, or a Document per file. An
	 * order's address goes to its first Document. An order with no file to make one from stops the
	 * run, since a Document holds a file (Product Owner, #179 comment 6721447473, item 2). A featured
	 * image stays out, since no field holds it, which leaves the migration 999 files beside spec
	 * #174's 1,001 (the same comment, item 1).
	 */
	const directiveOrProcurementEntries = (row: ListRow): PlannedEntry[] => {
		const item = items.get(row.wp_id)!;
		const target = decide(row);
		const type = typeOf(row, target);
		const publishedAt = item.published!.toISOString();
		const noteUnheld = (what: string) =>
			notes.push({ slug: item.slug, note: `${what}: no field holds it` });
		if (item.featured !== undefined) noteUnheld(`featured image ${item.featured}`);
		if (holdsText(item.content) || holdsText(item.editor)) {
			notes.push({ slug: item.slug, note: "the item's text is not carried" });
		}
		const documents = item.files.flatMap(({ id, label }, at): PlannedEntry[] => {
			use(id, item.slug, NOTICES_FOLDER);
			if (!available(id)) return [];
			const slug = at === 0 ? item.slug : `${item.slug}-${at + 1}`;
			return [
				{
					collection: "documents",
					slug,
					publishedAt,
					data: {
						title: documentTitle(item, label),
						file: { fileField: id },
						document_at: publishedAt,
						fiscal_year: Number(row.fiscal_year),
					},
					// Only an order carries a type (spec #174).
					taxonomies: target === "Document" && type !== "" ? { document_type: [type] } : {},
					page: `/documents/${slug}`,
				},
			];
		});
		const pictures = otherPictures(item);
		if (target === "Document") {
			if (documents.length === 0) {
				throw new Error(`${item.slug} has no file to make a Document from`);
			}
			for (const id of pictures) noteUnheld(`ACF picture ${id}`);
			redirect(row, documents[0]!.page);
			return documents;
		}
		const page = `/announcements/${item.slug}`;
		redirect(row, page);
		for (const id of pictures) use(id, item.slug, NOTICES_FOLDER);
		const details = pictures.filter(available).map(pictureBlock);
		return [
			...documents,
			{
				collection: "announcements",
				slug: item.slug,
				publishedAt,
				data: {
					title: item.title,
					announcement_at: publishedAt,
					...(details.length === 0 ? {} : { details }),
				},
				taxonomies: type === "" ? {} : { announcement_type: [type] },
				...(documents.length === 0 ? {} : { documents: documents.map(({ slug }) => slug) }),
				page,
			},
		];
	};
	const entries = [
		...newsRows.map(newsEntry),
		...directiveAndProcurementRows.flatMap(directiveOrProcurementEntries),
	];
	// A numbered Document can meet another item's slug, and EmDash would refuse the second create
	// with the run half written (`docs/agents/emdash-1.1.0.md` "Native API for tests",
	// SLUG_CONFLICT).
	const names = entries.map(({ collection, slug }) => `${collection}/${slug}`);
	const twice = names.find((name, at) => names.indexOf(name) !== at);
	if (twice !== undefined) throw new Error(`${twice} is planned twice`);
	const files = [...usedBy.keys()].filter(available).map((id): PlannedFile => {
		const { path, alt, caption } = legacyFiles.byId.get(id)!;
		return {
			attachment: id,
			path: path!,
			filename: filenameOf(path!),
			folder: folderOf.get(id)!,
			alt,
			caption,
		};
	});
	const missing = [...usedBy]
		.filter(([id]) => !available(id))
		.map(([attachment, slugs]) => {
			const path = legacyFiles.byId.get(attachment)?.path;
			return { attachment, ...(path === undefined ? {} : { path }), usedBy: slugs };
		});
	return {
		files,
		entries,
		redirects,
		report: { groups, missing, notes, atDefault, notInExport: vanished },
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
 * only the model-update step adds; or a legacy address that already redirects. EmDash refuses a
 * second rule with the same source (emdash 1.1.0 src/api/handlers/redirects.ts
 * handleRedirectCreate), and its middleware takes the form without the last slash for the same
 * address (src/astro/middleware/redirect.ts).
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

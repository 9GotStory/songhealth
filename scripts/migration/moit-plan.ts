// What the import makes of the Legacy site's ITA posts (#180; spec #174 "Mapping: ITA posts" and
// "Redirects", ADR 0006): one MOIT per post, its Evidence as blocks in the post's order, with the
// defects of `docs/research/legacy-ita.md` fixed. scripts/migration/import-plan.ts places the
// result in the plan; at run time this module imports only the planner, which imports nothing, so
// node:test checks it directly (tests/node/migration-moit.test.ts).

import type { Block, PlannedEntry, PlannedRedirect } from "./import-plan.ts";
import type { LegacyItem } from "./legacy-site.ts";
import { isUploadsPath, sitePath, type Files } from "./plan.ts";

/**
 * The Round of a fiscal year's Evidence (spec #174 "Mapping: ITA posts"): a post's "รอบ" can mean a
 * content period, and upload months mislead (`docs/research/legacy-ita.md` defects 12 and 13). Any
 * other year stops the run, since nothing says which Round its Evidence belongs to.
 */
const NO_ROUND = "ไม่ระบุรอบ";
const ROUNDS = new Map([
	[2567, NO_ROUND],
	[2568, NO_ROUND],
	[2569, NO_ROUND],
	[2570, "รอบ 6 เดือน"],
]);

/** The most blocks a MOIT's Evidence holds (seed/seed.json `moit` `evidence`). */
const MAX_BLOCKS = 100;

/** The Media Library folder of the files that more than one fiscal year links (spec #174). */
const SHARED_FOLDER = "ITA ใช้ทุกปี";

/** The office's name, and how the words about ITA begin, in the card that ends every post. */
const OFFICE_NAME = "สำนักงานสาธารณสุขอำเภอสอง";
const ABOUT_ITA = "ITA (Integrity";

/** The pages of the site that Evidence links to, by path, and their new addresses (ANOM-004). */
const SITE_PAGES: [string, string][] = [
	["officer", "/about/personnel"],
	["public-news", "/activities"],
];

/** The fiscal year whose page takes the Legacy site's ethics page, which repeats it (ANOM-005). */
const ETHICS_YEAR = 2569;

/** The attachment whose file the uploads copy lacks (ANOM-001). */
const ANOM_001 = 1479;

/** The name of the office's copy of ANOM-001's file, when it lies beside the export. */
export const ANOM_001_FILE = "anom-001.pdf";

/**
 * The document's official source, which the MOIT links while the office's copy is not beside the
 * export (spec #174 "Fixes at import"; the address is the one the Product Owner confirms on #180).
 */
export const ANOM_001_SOURCE = "https://nscr.nesdc.go.th/";

/** Months labelled with the wrong year: 2569 MOIT 5 (`docs/research/legacy-ita.md` defect 4). */
const WRONG_YEAR = {
	slug: "moit-5-2569",
	numbers: ["1.4", "1.5", "1.6"],
	from: "2568",
	to: "2569",
};

/**
 * The 2568 files that 2569 MOIT 2 links again, by attachment: kept as submitted and noted
 * (`docs/research/legacy-ita.md` defect 12).
 */
const CARRIED_OVER: Record<string, number[]> = { "moit-2-2569": [4416, 4419] };

/**
 * A number at the start of a line: "1.", "1.1" or "3.3.", and the stray dots and spaces after it.
 * A lone number needs its dot, which tells it from a count such as "6 เดือน".
 */
const NUMBER = /^(\d+\.\d+(?:\.\d+)*|\d+(?=\.))\.?[\s.]*/;

/** Text as one line, without the breaks and non-breaking spaces of the editor's HTML. */
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** A line of a post's content: its text, its number, its wording after that, and its links. */
interface Line {
	text: string;
	number: string | undefined;
	wording: string;
	links: { href: string; text: string }[];
}

/**
 * A block as a line. The converter gives one link one mark per address, across as many runs of text
 * as the editor split it into, and an `<a>` with no text a mark and no run
 * (@emdash-cms/gutenberg-to-portable-text 1.1.0 dist/index.mjs walkNodes, getMarkForElement).
 */
function lineOf({ children = [], markDefs = [] }: Block): Line {
	const links: Line["links"] = [];
	const hrefOf = (marks: string[] = []) =>
		markDefs.find(({ _key, _type }) => marks.includes(_key) && _type === "link")?.href;
	children.forEach(({ text, marks }, at) => {
		const href = hrefOf(marks);
		if (href === undefined) return;
		if (at > 0 && hrefOf(children[at - 1]!.marks) === href) links.at(-1)!.text += text;
		else links.push({ href, text });
	});
	const inARun = new Set(children.flatMap(({ marks = [] }) => marks));
	for (const { _key, _type, href = "" } of markDefs) {
		if (_type === "link" && !inARun.has(_key)) links.push({ href, text: "" });
	}
	const text = clean(children.map((span) => span.text).join(""));
	const match = NUMBER.exec(text);
	return {
		text,
		number: match?.[1],
		wording: match ? text.slice(match[0].length) : text,
		links: links.map((link) => ({ ...link, text: clean(link.text) })),
	};
}

/**
 * A post's blocks without the card that ends it: its picture, the office's name and the words
 * about ITA. Whatever else follows the name stays, so that nothing leaves the post unreported.
 */
function withoutCard(blocks: Block[]): Block[] {
	const textOf = (block: Block | undefined) => (block?._type === "block" ? lineOf(block).text : "");
	const name = blocks.findIndex((block) => textOf(block) === OFFICE_NAME);
	if (name === -1) return blocks;
	const start = blocks[name - 1]?._type === "image" ? name - 1 : name;
	const end = textOf(blocks[name + 1]).startsWith(ABOUT_ITA) ? name + 2 : name + 1;
	return [...blocks.slice(0, start), ...blocks.slice(end)];
}

/** The fiscal year and the number a post's tags name, its slug and its Round. */
function identityOf(post: LegacyItem) {
	const years = post.tags.filter((tag) => /^\d{4}$/.test(tag));
	const numbers = post.tags.filter((tag) => /^moit-\d+$/.test(tag));
	if (years.length !== 1 || numbers.length !== 1) {
		throw new Error(`${post.slug} does not have one fiscal year tag and one MOIT tag`);
	}
	const year = Number(years[0]);
	const number = Number(numbers[0]!.slice("moit-".length));
	const slug = `moit-${number}-${year}`;
	const round = ROUNDS.get(year);
	if (round === undefined) throw new Error(`${slug} is of fiscal year ${year}, which has no Round`);
	if (post.published === undefined) throw new Error(`${post.slug} has no publish date`);
	return { post, published: post.published, year, number, slug, round };
}

/**
 * A post's address as EmDash's redirects meet it. The middleware matches `url.pathname` exactly
 * (emdash 1.1.0 src/astro/middleware/redirect.ts), and Astro decodes a request's path and sets it
 * back, so that URL writes a non-ASCII character in upper-case hex however the request wrote it
 * (astro 7.3.5 dist/core/fetch/fetch-state.js #normalizePathname), where a WordPress slug is in
 * lower case: stored as the export has it, a Thai slug's redirect would never match.
 */
const addressOf = (slug: string) => `/${encodeURI(decodeURIComponent(slug))}/`;

/** A site address as the key of its new address: decoded, without its last slash. */
const addressKey = (address: string) => sitePath(address)?.replace(/\/$/, "");

/** Whether `text` says nothing as a label, as ")" does: its line's wording stands in (defect 5). */
const saysNothing = (text: string) => !/[\p{L}\p{N}]/u.test(text);

/** A line with the months of defect 4 reading their year, in its wording and its links. */
function withYearFixed(slug: string, line: Line): Line {
	if (slug !== WRONG_YEAR.slug || !WRONG_YEAR.numbers.includes(line.number ?? "")) return line;
	const fixed = (text: string) => text.replaceAll(WRONG_YEAR.from, WRONG_YEAR.to);
	return {
		...line,
		wording: fixed(line.wording),
		links: line.links.map((link) => ({ ...link, text: fixed(link.text) })),
	};
}

/** Whether a link goes to Facebook, whose empty ones the 2567 posts carry (`legacy-ita.md`). */
const isFacebook = (href: string) => /^https?:\/\/(?:[\w-]+\.)?facebook\.com(?:\/|$)/i.test(href);

/**
 * `files` with the office's copy standing for ANOM-001's file, while the uploads copy lacks it. Its
 * own name was cut in the copy, at 255 bytes, and at 304 bytes it cannot sit on disk
 * (`docs/research/legacy-site.md`), so the copy goes under ANOM_001_FILE.
 */
export function withOfficeFile(files: Files): Files {
	const attachment = files.byId.get(ANOM_001);
	if (attachment?.path === undefined || files.uploads.has(attachment.path)) return files;
	return {
		...files,
		byId: new Map(files.byId).set(ANOM_001, { ...attachment, path: ANOM_001_FILE }),
		uploads: new Set(files.uploads).add(ANOM_001_FILE),
	};
}

interface MoitInput {
	/** The published ITA posts. */
	posts: LegacyItem[];
	files: Files;
	toBlocks: (html: string) => Block[];
	/** What tells a file's bytes from another's (ImportInput `contentOf`). */
	contentOf: (path: string) => string;
	/** The other items' redirects, whose pages a link can name by the item's legacy address. */
	redirects: PlannedRedirect[];
}

/** The MOITs of the posts, their redirects, the files they use, and what they could not carry. */
interface MoitPlan {
	entries: PlannedEntry[];
	redirects: PlannedRedirect[];
	/** Each use of an attachment, with the folder that the file goes into. */
	uses: { id: number; slug: string; folder: string }[];
	notes: { slug: string; note: string }[];
}

export function planMoits({ posts, files, toBlocks, contentOf, redirects }: MoitInput): MoitPlan {
	const moits = posts.map(identityOf);
	const years = [...new Set(moits.map(({ year }) => year))].toSorted();
	const ownRedirects = [
		...moits.map(({ post, slug }) => ({
			source: addressOf(post.slug),
			destination: `/ita/${slug}`,
		})),
		...years.map((year) => ({ source: `/ita-${year}/`, destination: `/ita/${year}` })),
		...(years.includes(ETHICS_YEAR)
			? [{ source: "/ethics/", destination: `/ita/${ETHICS_YEAR}` }]
			: []),
	];
	const newAddress = new Map([
		...SITE_PAGES,
		...[...redirects, ...ownRedirects].map(({ source, destination }): [string, string] => [
			addressKey(source)!,
			destination,
		]),
	]);
	const entries: PlannedEntry[] = [];
	const fileUses: { id: number; slug: string; year: number }[] = [];
	const notes: MoitPlan["notes"] = [];
	const hasFile = (id: number) => {
		const path = files.byId.get(id)?.path;
		return path !== undefined && files.uploads.has(path);
	};
	for (const { post, published, year, number, slug, round } of moits) {
		const evidence: Record<string, unknown>[] = [];
		const noteOut = (note: string) => notes.push({ slug, note });
		/** The Evidence a link becomes, or none for a link that stays out. */
		const evidenceOfLink = ({ href, text }: Line["links"][number], wording: string) => {
			const path = sitePath(href);
			if (path?.startsWith("tag/") || (text === "" && isFacebook(href))) return undefined;
			const label = saysNothing(text) ? wording : text;
			if (label === "") {
				noteOut(`a link with no text and no wording to take: ${href}`);
				return undefined;
			}
			if (path === undefined) return { _type: "ita_link", label, url: href, round, current: false };
			if (isUploadsPath(path)) {
				// A link can leave out /wp-content (`docs/research/legacy-ita.md` defect 3).
				const id = files.byPath.get(path.startsWith("uploads/") ? `wp-content/${path}` : path);
				if (id === undefined) throw new Error(`${slug} links ${href}, which names no attachment`);
				if (id === ANOM_001 && !hasFile(id)) {
					noteOut(
						"ANOM-001: the office's file is not beside the export, so the Evidence links the document's official source",
					);
					return { _type: "ita_link", label, url: ANOM_001_SOURCE, round, current: false };
				}
				fileUses.push({ id, slug, year });
				// A file the uploads copy lacks goes into the report, and fails verify.
				if (!hasFile(id)) return undefined;
				if (files.byId.get(id)?.path === ANOM_001_FILE) {
					noteOut("ANOM-001: uploaded from the office's file");
				}
				if (CARRIED_OVER[slug]?.includes(id)) {
					noteOut(`a 2568 file, kept as submitted (defect 12): ${label}`);
				}
				return { _type: "ita_file", label, file: { fileField: id }, round };
			}
			const url = newAddress.get(path.replace(/\/$/, ""));
			if (url === undefined) throw new Error(`${slug} links ${href}, which has no new address`);
			return { _type: "ita_link", label, url, round, current: true };
		};
		/** The wording of the last Requirement, which a link with no words of its own can take. */
		let requirementWording = "";
		for (const block of withoutCard(toBlocks(post.content))) {
			if (block._type !== "block") {
				noteOut(
					block._type === "image"
						? `picture not carried: ${block.asset?._ref}`
						: `not carried: a ${block._type} block`,
				);
				continue;
			}
			const line = withYearFixed(slug, lineOf(block));
			if (line.number !== undefined && line.wording !== "") {
				requirementWording = line.wording;
				evidence.push({ _type: "ita_requirement", number: line.number, title: line.wording });
			} else if (line.text !== "" && line.links.length === 0) {
				noteOut(`text not carried: ${line.text}`);
			}
			for (const link of line.links) {
				const piece = evidenceOfLink(
					link,
					saysNothing(line.wording) ? requirementWording : line.wording,
				);
				if (piece !== undefined) evidence.push(piece);
			}
		}
		if (evidence.length > MAX_BLOCKS) {
			throw new Error(`${slug} has ${evidence.length} blocks, over ${MAX_BLOCKS}`);
		}
		entries.push({
			collection: "moit",
			slug,
			publishedAt: published.toISOString(),
			data: {
				title: post.title.replace(/^MOIT\s*\d+\s*/, "") || post.title,
				fiscal_year: year,
				number,
				...(post.modified === undefined ? {} : { updated_on: post.modified.toISOString() }),
				evidence,
			},
			taxonomies: {},
			page: `/ita/${slug}`,
		});
	}
	/**
	 * What makes a file one file: its bytes, since EmDash answers an upload of the same bytes with
	 * the media item it holds (emdash 1.1.0 src/astro/routes/api/media.ts), and the office uploaded
	 * some documents once a year under different attachments.
	 */
	const contentKey = (id: number) => contentOf(files.byId.get(id)!.path!);
	const yearsOfFile = new Map<string, Set<number>>();
	for (const { id, year } of fileUses) {
		const key = contentKey(id);
		yearsOfFile.set(key, (yearsOfFile.get(key) ?? new Set()).add(year));
	}
	const uses = fileUses.map(({ id, slug, year }) => ({
		id,
		slug,
		folder: yearsOfFile.get(contentKey(id))!.size > 1 ? SHARED_FOLDER : `ITA ${year}`,
	}));
	return { entries, redirects: ownRedirects, uses, notes };
}

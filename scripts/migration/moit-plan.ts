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

/** The office's name, which opens the card that ends every post. */
const OFFICE_NAME = "สำนักงานสาธารณสุขอำเภอสอง";

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

/** A post's blocks before the card that ends it: its picture, the office's name and its text. */
function bodyOf(blocks: Block[]): Block[] {
	const card = blocks.findIndex(
		(block) => block._type === "block" && lineOf(block).text === OFFICE_NAME,
	);
	if (card === -1) return blocks;
	return blocks.slice(0, blocks[card - 1]?._type === "image" ? card - 1 : card);
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

/** A Requirement's title, the months of defect 4 reading their year. */
const titleOf = (slug: string, number: string, wording: string) =>
	slug === WRONG_YEAR.slug && WRONG_YEAR.numbers.includes(number)
		? wording.replaceAll(WRONG_YEAR.from, WRONG_YEAR.to)
		: wording;

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
			const label = saysNothing(text) ? wording : text;
			if (label === "") return undefined;
			const path = sitePath(href);
			if (path === undefined) return { _type: "ita_link", label, url: href, round, current: false };
			if (isUploadsPath(path)) {
				// A link can leave out /wp-content (`docs/research/legacy-ita.md` defect 3).
				const id = files.byPath.get(path.startsWith("uploads/") ? `wp-content/${path}` : path);
				if (id === undefined) throw new Error(`${slug} links ${href}, which names no attachment`);
				if (id === ANOM_001 && !hasFile(id)) {
					return { _type: "ita_link", label, url: ANOM_001_SOURCE, round, current: false };
				}
				fileUses.push({ id, slug, year });
				// A file the uploads copy lacks goes into the report, and fails verify.
				if (!hasFile(id)) return undefined;
				if (CARRIED_OVER[slug]?.includes(id)) {
					noteOut(`a 2568 file, kept as submitted (defect 12): ${label}`);
				}
				return { _type: "ita_file", label, file: { fileField: id }, round };
			}
			if (path.startsWith("tag/")) return undefined;
			const url = newAddress.get(path.replace(/\/$/, ""));
			if (url === undefined) throw new Error(`${slug} links ${href}, which has no new address`);
			return { _type: "ita_link", label, url, round, current: true };
		};
		for (const block of bodyOf(toBlocks(post.content))) {
			if (block._type !== "block") {
				noteOut(
					block._type === "image"
						? `picture not carried: ${block.asset?._ref}`
						: `not carried: a ${block._type} block`,
				);
				continue;
			}
			const line = lineOf(block);
			if (line.number !== undefined && line.wording !== "") {
				evidence.push({
					_type: "ita_requirement",
					number: line.number,
					title: titleOf(slug, line.number, line.wording),
				});
			} else if (line.text !== "" && line.links.length === 0) {
				noteOut(`text not carried: ${line.text}`);
			}
			for (const link of line.links) {
				const piece = evidenceOfLink(link, line.wording);
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
	const contentKey = (id: number) => {
		const path = files.byId.get(id)?.path;
		return path === undefined ? String(id) : contentOf(path);
	};
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

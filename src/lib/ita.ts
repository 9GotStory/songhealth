// ITA on the public site (Feature 004 #123; spec #121 "Content model" (the grouping rule) and
// "Public routes", ADR 0006).
//
// A MOIT keeps its Evidence as one blocks field: Requirement blocks, each followed by the file and
// link blocks of its Evidence (seed/seed.json `moit`, block types `ita_requirement`, `ita_file`,
// `ita_link`). This module turns those blocks into what the MOIT page shows. It imports no runtime
// module, so node:test checks it directly; the page passes in the read that decides whether a file
// can be served (src/lib/media.ts downloadableFile).

import type { FileValue } from "emdash";
import { isExternalHref } from "./links.ts";
import type { DownloadableFile } from "./media.ts";

/** A MOIT page's address, `/ita/{slug}` (the collection's urlPattern), encoded as EmDash does. */
export function moitPath(slug: string): string {
	return `/ita/${encodeURIComponent(slug)}`;
}

/** A MOIT's name by its number, such as "MOIT 2". */
export function moitLabel(number: number): string {
	return `MOIT ${number}`;
}

interface RequirementBlock {
	_type: "ita_requirement";
	_key: string;
	number: string;
	title: string;
}

interface FileBlock {
	_type: "ita_file";
	_key: string;
	label: string;
	file?: FileValue | null;
	round?: string | null;
	note?: string | null;
}

interface LinkBlock {
	_type: "ita_link";
	_key: string;
	label: string;
	url: string;
	round?: string | null;
	current?: boolean | null;
}

/** One block of a MOIT's `evidence` field, as EmDash stores it. */
export type EvidenceBlock = RequirementBlock | FileBlock | LinkBlock;

/** A MOIT's fields (seed/seed.json `moit`) and the system fields its page reads. */
export interface MoitData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	title: string;
	fiscal_year: number;
	number: number;
	summary?: string | null;
	/** "ปรับปรุงล่าสุด", set by staff when they publish a Round (spec #121 "Content model"). */
	updated_on?: Date | string | null;
	evidence?: EvidenceBlock[] | null;
	publishedAt?: Date | string | null;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

/**
 * The Rounds a pill names (seed/seed.json `ita_file`, `ita_link`). "ไม่ระบุรอบ", the default, names
 * none, and so does any other value.
 */
const ROUNDS = ["รอบ 6 เดือน", "รอบ 12 เดือน"] as const;

/** What every pill shows: its label and the Round it was published for, if it names one. */
interface PillBase {
	key: string;
	label: string;
	round?: (typeof ROUNDS)[number];
}

/** One piece of Evidence as a pill shows it. */
export type EvidencePill =
	| (PillBase & {
			/** A file the page offers for download at `href`, under its uploaded name. */
			kind: "file";
			href: string;
			/** The file's type and size, such as "PDF, 1.2 MB". */
			detail: string;
			filename?: string;
			/** What staff noted of the file, such as the months it covers. */
			note?: string;
	  })
	| (PillBase & {
			/** A file that cannot be served (src/lib/media.ts FILE_UNAVAILABLE). */
			kind: "unavailable";
			note?: string;
	  })
	| (PillBase & {
			/** A link to a page of this site, or to another website, at `href`. */
			kind: "page" | "external";
			href: string;
			/** SITE_PAGE for a page of this site, else the other website's host. */
			detail: string;
			/** Staff marked the link as current information, which changes over time. */
			current: boolean;
	  })
	| (PillBase & {
			/** A link whose address is not a web page the page can open safely: its label alone. */
			kind: "unlinked";
			current: boolean;
	  });

/** What a pill says of a link to a page of this site, where another website's shows its host. */
const SITE_PAGE = "หน้าเว็บของสำนักงาน";

/** A path on this site: one slash, not two, nor a slash and a backslash, which leave the site. */
const SITE_PATH = /^\/(?![/\\])/;

/**
 * Where a link block's address goes: a page of this site or another website, or nowhere the page
 * can open safely. Evidence is a web page, so only a path on this site or an http or https address
 * opens. The rules are those of EmDash's own check for an href, for those addresses (emdash 1.1.0
 * src/utils/url.ts isSafeHref): no control character, which a browser drops before it reads the
 * address, and a path that starts with one slash. An address on this site's host is a page of this
 * site (src/lib/links.ts isExternalHref).
 */
function linkTarget(url: string, siteOrigin: string): "page" | "external" | undefined {
	const control = [...url].some((character) => {
		const code = character.charCodeAt(0);
		return code <= 0x1f || code === 0x7f;
	});
	if (control) return undefined;
	if (SITE_PATH.test(url)) return "page";
	if (!/^https?:/i.test(url) || !URL.canParse(url)) return undefined;
	return isExternalHref(url, siteOrigin) ? "external" : "page";
}

/** A Requirement with the Evidence that follows its block. */
interface Requirement {
	key: string;
	number: string;
	title: string;
	pills: EvidencePill[];
}

/** A top-level Requirement, shown as a card, with its sub-Requirements. */
interface RequirementCard extends Requirement {
	subRequirements: Requirement[];
	/** The pieces of Evidence in the card, its sub-Requirements' included. */
	count: number;
}

/** A MOIT's Evidence as its page shows it. */
export interface MoitEvidence {
	/** The Evidence before any Requirement block, shown first and ungrouped. */
	lead: EvidencePill[];
	cards: RequirementCard[];
	/** Every piece of Evidence. */
	total: number;
	/** The files that cannot be served. */
	unavailable: number;
}

/** What the page passes in: the read that offers a file for download, as downloadableFile does. */
export interface EvidenceOptions {
	siteOrigin: string;
	readFile: (file: FileValue | null | undefined) => Promise<DownloadableFile | undefined>;
}

/** A file or link block as its pill. */
async function pillOf(
	block: FileBlock | LinkBlock,
	{ readFile, siteOrigin }: EvidenceOptions,
): Promise<EvidencePill> {
	const round = ROUNDS.find((name) => name === block.round);
	const base: PillBase = { key: block._key, label: block.label, ...(round ? { round } : {}) };
	if (block._type === "ita_link") {
		const current = block.current === true;
		const href = block.url ?? "";
		const target = linkTarget(href, siteOrigin);
		if (target === undefined) return { kind: "unlinked", ...base, current };
		const detail = target === "page" ? SITE_PAGE : new URL(href).hostname;
		return { kind: target, ...base, href, detail, current };
	}
	const note = block.note?.trim();
	const noted = note ? { ...base, note } : base;
	const file = await readFile(block.file);
	if (!file) return { kind: "unavailable", ...noted };
	return {
		kind: "file",
		...noted,
		href: file.href,
		detail: file.label,
		...(file.filename ? { filename: file.filename } : {}),
	};
}

/**
 * A MOIT's Evidence blocks grouped under their Requirements, in block order. The files are read
 * together, before the grouping.
 */
export async function moitEvidence(
	blocks: readonly EvidenceBlock[] | null | undefined,
	options: EvidenceOptions,
): Promise<MoitEvidence> {
	const read = await Promise.all(
		(blocks ?? []).map((block) =>
			block._type === "ita_requirement" ? block : pillOf(block, options),
		),
	);
	const lead: EvidencePill[] = [];
	const groups: Array<Requirement & { subRequirements: Requirement[] }> = [];
	/** Where the next Evidence goes: the last Requirement's pills, or the lead before any. */
	let pills = lead;
	for (const item of read) {
		if ("kind" in item) {
			pills.push(item);
			continue;
		}
		// A trailing dot is punctuation, as the manual writes "1.", not a level.
		const number = item.number.trim().replace(/\.+$/, "");
		pills = [];
		const requirement = { key: item._key, number, title: item.title, pills };
		const parent = groups.at(-1);
		if (number.includes(".") && parent) parent.subRequirements.push(requirement);
		else groups.push({ ...requirement, subRequirements: [] });
	}
	const cards = groups.map((group) => ({
		...group,
		count: [group, ...group.subRequirements].reduce((sum, { pills }) => sum + pills.length, 0),
	}));
	const all = [
		...lead,
		...groups
			.flatMap((group) => [group, ...group.subRequirements])
			.flatMap((requirement) => requirement.pills),
	];
	return {
		lead,
		cards,
		total: all.length,
		unavailable: all.filter((pill) => pill.kind === "unavailable").length,
	};
}

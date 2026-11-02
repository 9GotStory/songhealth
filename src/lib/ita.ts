// ITA on the public site (Feature 004 #123; spec #121 "Content model" (the grouping rule) and
// "Public routes", ADR 0006).
//
// A MOIT keeps its Evidence as one blocks field: Requirement blocks, each followed by the file and
// link blocks of its Evidence (seed/seed.json `moit`, block types `ita_requirement`, `ita_file`,
// `ita_link`). groupEvidence groups and counts them by the spec's rule and reads nothing;
// moitEvidence turns each piece into what its pill shows, with the read that decides whether a
// file can be served passed in by the page (src/lib/media.ts downloadableFile). The module imports
// no runtime module, so node:test checks it directly (CODING_STANDARDS "Tests").

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
	number: string;
	title: string;
}

interface FileBlock {
	_type: "ita_file";
	label: string;
	file?: FileValue | null;
	round?: string | null;
	note?: string | null;
}

interface LinkBlock {
	_type: "ita_link";
	label: string;
	url: string;
	round?: string | null;
	current?: boolean | null;
}

/**
 * One block of a MOIT's `evidence` field, as EmDash stores it. A block of any other type, such as
 * one whose type was retired (ADR 0006: a retired block type stays), is left out.
 */
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

/** A Requirement and the Evidence that follows its block, in block order. */
interface Requirement<E> {
	number: string;
	title: string;
	evidence: E[];
}

/** A top-level Requirement, shown as a card, with its sub-Requirements. */
interface RequirementCard<E> extends Requirement<E> {
	subRequirements: Requirement<E>[];
	/** The pieces of Evidence in the card, its sub-Requirements' included. */
	count: number;
}

/** A MOIT's Evidence grouped under its Requirements. */
interface EvidenceGroups<E> {
	/** The Evidence before any Requirement block, shown first and ungrouped. */
	lead: E[];
	cards: RequirementCard<E>[];
	/** Every piece of Evidence. */
	total: number;
}

/**
 * A MOIT's Evidence blocks grouped under their Requirements, in block order, by the spec's rule: a
 * Requirement block opens a group, and the Evidence blocks that follow belong to it; a Requirement
 * whose number has a dot is a sub-Requirement of the last Requirement without one, or a card of
 * its own while there is none; Evidence before any Requirement comes first, ungrouped. A trailing
 * dot is punctuation, as the manual writes "1.", not a level.
 */
export function groupEvidence(
	blocks: readonly EvidenceBlock[] | null | undefined,
): EvidenceGroups<FileBlock | LinkBlock> {
	const lead: Array<FileBlock | LinkBlock> = [];
	const cards: RequirementCard<FileBlock | LinkBlock>[] = [];
	/** The card of the last Requirement without a dot, which takes the sub-Requirements after it. */
	let parent: RequirementCard<FileBlock | LinkBlock> | undefined;
	/** Where the next Evidence goes: the last Requirement's, or the lead before any. */
	let evidence = lead;
	for (const block of blocks ?? []) {
		if (block._type === "ita_file" || block._type === "ita_link") {
			evidence.push(block);
		} else if (block._type === "ita_requirement") {
			const number = block.number.trim().replace(/\.+$/, "");
			evidence = [];
			const requirement = { number, title: block.title, evidence };
			if (number.includes(".") && parent) {
				parent.subRequirements.push(requirement);
			} else {
				const card = { ...requirement, subRequirements: [], count: 0 };
				cards.push(card);
				if (!number.includes(".")) parent = card;
			}
		}
	}
	for (const card of cards) {
		card.count = [card, ...card.subRequirements].reduce(
			(sum, requirement) => sum + requirement.evidence.length,
			0,
		);
	}
	return { lead, cards, total: cards.reduce((sum, card) => sum + card.count, lead.length) };
}

/** The Round a new Evidence block starts with, which names none (seed/seed.json). */
const NO_ROUND = "ไม่ระบุรอบ";

/** What every pill shows: its label and its Round, unless that is NO_ROUND. */
interface PillBase {
	label: string;
	round?: string;
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
			/** A link to a page of this site, to another website, or to an email or phone address. */
			kind: "page" | "external" | "contact";
			href: string;
			/** SITE_PAGE, the other website's host, or the email address or telephone number. */
			detail: string;
			/** Staff marked the link as current information, which changes over time. */
			current: boolean;
	  })
	| (PillBase & {
			/** A link whose address the page cannot open safely: its label alone. */
			kind: "unlinked";
			current: boolean;
	  });

/** What a pill says of a link to a page of this site, where another website's shows its host. */
const SITE_PAGE = "หน้าเว็บของสำนักงาน";

/** A path on this site: one slash, not two, nor a slash and a backslash, which leave the site. */
const SITE_PATH = /^\/(?![/\\])/;

/** An address that opens a web page, an email or a call. */
const SCHEME = /^(https?|mailto|tel):/i;

/** The address of a `mailto:` or `tel:` link as people write it, without its scheme or query. */
function contactAddress(pathname: string): string {
	try {
		return decodeURIComponent(pathname);
	} catch {
		return pathname;
	}
}

/**
 * Where a link block's address leads and what its pill says of it, or undefined when the page
 * cannot open it safely. A path on this site and an http or https address are web pages, of this
 * site when they are on its host (src/lib/links.ts isExternalHref); an email address or a telephone
 * number opens in place, as src/components/ContentLink.astro opens one.
 *
 * EmDash checks an href with isSafeHref (emdash 1.1.0 src/utils/url.ts), and a url inside a
 * block takes only an address that passes it (docs/agents/emdash-1.1.0.md "Admin input"). This
 * module cannot call it, because node:test cannot load `emdash` (CODING_STANDARDS "Tests"), so it
 * applies the same rules to the addresses it opens: no control character, since a URL parser
 * strips a tab or a line break anywhere and trims the others at the ends (so `/<tab>/host` would
 * read as `//host`); a path with one leading slash; an absolute address that parses. A fragment,
 * which isSafeHref also allows, is no Evidence a page can show.
 */
function linkTarget(
	url: string,
	siteOrigin: string,
): { kind: "page" | "external" | "contact"; detail: string } | undefined {
	const control = [...url].some((character) => {
		const code = character.charCodeAt(0);
		return code <= 0x1f || code === 0x7f;
	});
	if (control) return undefined;
	if (SITE_PATH.test(url)) return { kind: "page", detail: SITE_PAGE };
	if (!SCHEME.test(url) || !URL.canParse(url)) return undefined;
	const { protocol, hostname, pathname } = new URL(url);
	if (protocol === "mailto:" || protocol === "tel:") {
		return pathname === "" ? undefined : { kind: "contact", detail: contactAddress(pathname) };
	}
	return isExternalHref(url, siteOrigin)
		? { kind: "external", detail: hostname }
		: { kind: "page", detail: SITE_PAGE };
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
	const round = block.round?.trim();
	const base: PillBase = { label: block.label, ...(round && round !== NO_ROUND ? { round } : {}) };
	if (block._type === "ita_link") {
		const current = block.current === true;
		const href = block.url ?? "";
		const target = linkTarget(href, siteOrigin);
		if (target === undefined) return { kind: "unlinked", ...base, current };
		return { ...target, ...base, href, current };
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

/** A MOIT's Evidence as its page shows it. */
export interface MoitEvidence extends EvidenceGroups<EvidencePill> {
	/** The files that cannot be served. */
	unavailable: number;
}

/** A MOIT's Evidence grouped as groupEvidence groups it, each piece as its pill. */
export async function moitEvidence(
	blocks: readonly EvidenceBlock[] | null | undefined,
	options: EvidenceOptions,
): Promise<MoitEvidence> {
	const groups = groupEvidence(blocks);
	const pillsOf = (evidence: Array<FileBlock | LinkBlock>) =>
		Promise.all(evidence.map((block) => pillOf(block, options)));
	const [lead, cards] = await Promise.all([
		pillsOf(groups.lead),
		Promise.all(
			groups.cards.map(async (card) => ({
				number: card.number,
				title: card.title,
				count: card.count,
				evidence: await pillsOf(card.evidence),
				subRequirements: await Promise.all(
					card.subRequirements.map(async ({ number, title, evidence }) => ({
						number,
						title,
						evidence: await pillsOf(evidence),
					})),
				),
			})),
		),
	]);
	const pills = [
		lead,
		...cards.flatMap((card) => [card.evidence, ...card.subRequirements.map((sub) => sub.evidence)]),
	].flat();
	return {
		lead,
		cards,
		total: groups.total,
		unavailable: pills.filter((pill) => pill.kind === "unavailable").length,
	};
}

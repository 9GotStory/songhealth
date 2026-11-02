// PROTOTYPE (throwaway, branch prototype/ita): what the ITA prototype pages (src/pages/prototype/ita/)
// read and compute. Three variants of the MOIT page, switchable via `?variant=`, on the throwaway
// route /prototype/ita/{year}/{slug}; the data is the temporary "proto_moit" collection that
// scripts/prototype-ita.ts installs on the development runtime. Nothing here is production code.
import { getEmDashCollection, type FileValue } from "emdash";
import { downloadableFile, type MediaRuntime } from "./media";

export const PROTOTYPE_COLLECTION = "proto_moit";
export const ITA_PROTOTYPE_PATH = "/prototype/ita";
export const ITA_PROTOTYPE_TITLE = "ITA (ต้นแบบ)";

export const ROUNDS = ["รอบ 6 เดือน", "รอบ 12 เดือน"] as const;
type Round = (typeof ROUNDS)[number];

interface StoredBlock {
	_type: string;
	_key: string;
}
interface RequirementBlock extends StoredBlock {
	_type: "proto_ita_requirement";
	number: string;
	title: string;
}
interface FileBlock extends StoredBlock {
	_type: "proto_ita_file";
	label: string;
	file?: FileValue | null;
	round?: string | null;
	note?: string | null;
}
interface LinkBlock extends StoredBlock {
	_type: "proto_ita_link";
	label: string;
	url: string;
	round?: string | null;
	current?: boolean | null;
}
export type EvidenceBlock = RequirementBlock | FileBlock | LinkBlock;

export interface MoitData {
	id: string;
	title: string;
	fiscal_year: number;
	number: number;
	summary?: string | null;
	updated_on?: string | null;
	evidence?: EvidenceBlock[] | null;
	publishedAt?: string | null;
}

/** A published MOIT as a list page needs it: its slug (`id`) and data. */
export interface MoitEntry {
	id: string;
	data: MoitData;
}

/** One piece of Evidence as a page shows it. */
export interface EvidenceItem {
	key: string;
	kind: "file" | "link";
	label: string;
	/** Where the Evidence is; undefined when a file cannot be served. */
	href?: string;
	/** "PDF, 42 KB", the link's host, or "หน้าเว็บของสำนักงาน". */
	detail?: string;
	filename?: string;
	round?: Round;
	note?: string;
	current: boolean;
	external: boolean;
}

/** A Requirement with the Evidence that follows it in the block list. */
export interface RequirementGroup {
	key: string;
	/** "1", "1.1", or "" for Evidence before any Requirement. */
	number: string;
	title: string;
	/** 1 for "1", 2 for "1.1". */
	depth: number;
	items: EvidenceItem[];
}

/** A top-level Requirement with its sub-Requirements. */
export interface RequirementTree extends RequirementGroup {
	children: RequirementGroup[];
}

export const VARIANTS = [
	{ key: "A", name: "เอกสารเรียงตามข้อ" },
	{ key: "B", name: "ตารางตามรอบ" },
	{ key: "C", name: "สารบัญและการ์ด" },
] as const;
export type VariantKey = (typeof VARIANTS)[number]["key"];

export function variantOf(param: string | null): VariantKey {
	const found = VARIANTS.find((variant) => variant.key === param);
	return found ? found.key : "A";
}

export function yearPath(year: number): string {
	return `${ITA_PROTOTYPE_PATH}/${year}`;
}

export function moitPath(year: number, slug: string): string {
	return `${yearPath(year)}/${encodeURIComponent(slug)}`;
}

export function moitLabel(number: number): string {
	return `MOIT ${number}`;
}

function roundOf(value: string | null | undefined): Round | undefined {
	return ROUNDS.find((round) => round === value);
}

function linkDetail(url: string): { detail: string; external: boolean } {
	if (url.startsWith("/")) return { detail: "หน้าเว็บของสำนักงาน", external: false };
	try {
		return { detail: new URL(url).hostname, external: true };
	} catch {
		return { detail: url, external: true };
	}
}

/**
 * The blocks as Requirement groups, in order, with each file's availability read the way a
 * Document's file is (downloadableFile).
 */
export async function groupEvidence(
	blocks: readonly EvidenceBlock[] | null | undefined,
	runtime: MediaRuntime | undefined,
): Promise<RequirementGroup[]> {
	const groups: RequirementGroup[] = [];
	let current: RequirementGroup | undefined;
	for (const block of blocks ?? []) {
		if (block._type === "proto_ita_requirement") {
			current = {
				key: block._key,
				number: block.number,
				title: block.title,
				depth: block.number.split(".").length,
				items: [],
			};
			groups.push(current);
			continue;
		}
		if (!current) {
			current = { key: "lead", number: "", title: "", depth: 1, items: [] };
			groups.push(current);
		}
		if (block._type === "proto_ita_file") {
			const file = await downloadableFile(block.file, runtime);
			current.items.push({
				key: block._key,
				kind: "file",
				label: block.label,
				href: file?.href,
				detail: file?.label,
				filename: file?.filename,
				round: roundOf(block.round),
				note: block.note ?? undefined,
				current: false,
				external: false,
			});
		} else if (block._type === "proto_ita_link") {
			current.items.push({
				key: block._key,
				kind: "link",
				label: block.label,
				href: block.url,
				round: roundOf(block.round),
				current: block.current === true,
				...linkDetail(block.url),
			});
		}
	}
	return groups;
}

/** The groups as a tree: a depth-2 group hangs off the last depth-1 group before it. */
export function nestGroups(groups: readonly RequirementGroup[]): RequirementTree[] {
	const tree: RequirementTree[] = [];
	for (const group of groups) {
		const parent = tree.at(-1);
		if (group.depth > 1 && parent) parent.children.push(group);
		else tree.push({ ...group, children: [] });
	}
	return tree;
}

export interface EvidenceCounts {
	total: number;
	files: number;
	links: number;
	unavailable: number;
	byRound: Record<Round, number>;
}

export function countEvidence(groups: readonly RequirementGroup[]): EvidenceCounts {
	const counts: EvidenceCounts = {
		total: 0,
		files: 0,
		links: 0,
		unavailable: 0,
		byRound: { [ROUNDS[0]]: 0, [ROUNDS[1]]: 0 },
	};
	for (const group of groups) {
		for (const item of group.items) {
			counts.total += 1;
			if (item.kind === "file") counts.files += 1;
			else counts.links += 1;
			if (item.href === undefined) counts.unavailable += 1;
			if (item.round) counts.byRound[item.round] += 1;
		}
	}
	return counts;
}

/** Every published MOIT of the prototype collection, newest year first, then by MOIT number. */
export async function publishedMoits(): Promise<MoitEntry[]> {
	const { entries, error } = await getEmDashCollection<typeof PROTOTYPE_COLLECTION, MoitData>(
		PROTOTYPE_COLLECTION,
		{ limit: 100 },
	);
	if (error) throw error;
	return [...entries].sort(
		(a, b) => b.data.fiscal_year - a.data.fiscal_year || a.data.number - b.data.number,
	);
}

export function moitsOfYear(entries: readonly MoitEntry[], year: number): MoitEntry[] {
	return entries.filter((entry) => entry.data.fiscal_year === year);
}

export function yearsOf(entries: readonly MoitEntry[]): { year: number; count: number }[] {
	const years = new Map<number, number>();
	for (const entry of entries) {
		years.set(entry.data.fiscal_year, (years.get(entry.data.fiscal_year) ?? 0) + 1);
	}
	return [...years].map(([year, count]) => ({ year, count }));
}

// The Health Service Directory's rules (Feature 003 #57; spec #51 "Public reads" (Health Service
// Directory)).
//
// The directory filters by Area and by name. EmDash's `where` offers equality, `IN` and ranges
// but no substring match (emdash 1.1.0 src/loader.ts buildFieldConditions), so the list reads
// every published Health Service and this module filters and orders them. Names are compared as
// the search compares text (src/lib/search-matcher.ts normalizeText). The module imports no
// runtime module, so node:test checks it directly; src/lib/health-services.ts reads through EmDash
// and uses it.

import { normalizeText } from "./search-matcher.ts";

/** A taxonomy term as the query functions hydrate it on an entry. */
export interface DirectoryTerm {
	slug: string;
	label: string;
}

/** The fields of a Health Service the directory's rules read. */
export interface DirectoryData {
	/** The official name. */
	title: string;
	display_name?: string | null;
	terms?: Record<string, DirectoryTerm[]>;
}

/** Whether a Health Service is serving now (`02` §11), as the select field stores it. */
export type OperationalStatus = "active" | "temporarily_closed" | "inactive";

/** Each operational status as citizens read it. */
export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
	active: "เปิดให้บริการ",
	temporarily_closed: "ปิดให้บริการชั่วคราว",
	inactive: "ไม่เปิดให้บริการแล้ว",
};

/** A status that should stop a citizen from travelling there (#51 user story 41). */
export function isOutOfService(
	status: OperationalStatus | null | undefined,
): status is OperationalStatus {
	return status === "temporarily_closed" || status === "inactive";
}

/** The directory's filters: an Area term slug and a name, each empty when not set. */
export interface DirectoryFilters {
	area: string;
	name: string;
}

/** The directory's address. */
const DIRECTORY_PATH = "/health-services";

/**
 * The query parameter of each filter. The Homepage's Health Service Discovery form submits the
 * same parameters to the directory (#64).
 */
export const FILTER_PARAMS = { area: "area", name: "name" } as const;

/** A Health Service's canonical address, `/health-services/{slug}` (`03` §15), encoded as EmDash encodes it. */
export function healthServicePath(slug: string): string {
	return `${DIRECTORY_PATH}/${encodeURIComponent(slug)}`;
}

/** The filters a list address asks for, trimmed. */
export function parseDirectoryFilters(params: URLSearchParams): DirectoryFilters {
	return {
		area: params.get(FILTER_PARAMS.area)?.trim() ?? "",
		name: params.get(FILTER_PARAMS.name)?.trim() ?? "",
	};
}

/** Whether any filter is set. */
export function isFiltered(filters: DirectoryFilters): boolean {
	return filters.area !== "" || filters.name !== "";
}

/** The list's address with the filters that are set. */
export function directoryPath(filters: Partial<DirectoryFilters> = {}): string {
	const params = new URLSearchParams();
	if (filters.area) params.set(FILTER_PARAMS.area, filters.area);
	if (filters.name) params.set(FILTER_PARAMS.name, filters.name);
	const query = params.toString();
	return query === "" ? DIRECTORY_PATH : `${DIRECTORY_PATH}?${query}`;
}

/** Whether `name` appears in the Health Service's official name or display name. */
function matchesName(data: DirectoryData, name: string): boolean {
	const wanted = normalizeText(name);
	if (wanted === "") return true;
	return [data.title, data.display_name].some(
		(candidate) => typeof candidate === "string" && normalizeText(candidate).includes(wanted),
	);
}

/** A Health Service's Area terms, which are its service areas (`02` §11). */
function areasOf(data: DirectoryData): DirectoryTerm[] {
	return data.terms?.area ?? [];
}

/**
 * Whether the Health Service is tagged with the Area term `area`. The match is exact, as a `where`
 * on a taxonomy is (src/loader.ts resolveTermGroups): a parent Area does not take in its children.
 */
function matchesArea(data: DirectoryData, area: string): boolean {
	return area === "" || areasOf(data).some((term) => term.slug === area);
}

/** Thai collation, for names and term labels. Node 24.21.0 ships full ICU data. */
const THAI = new Intl.Collator("th");

/**
 * The Area terms the Health Services are tagged with, each once, by label in Thai order. The
 * Area filter offers these, not the whole taxonomy: `area` also classifies News, Activities and
 * Health Reports, and an Area no Health Service has would always give an empty list.
 */
export function areasInUse(entries: ReadonlyArray<{ data: DirectoryData }>): DirectoryTerm[] {
	const bySlug = new Map<string, DirectoryTerm>();
	for (const entry of entries) {
		for (const term of areasOf(entry.data)) {
			if (!bySlug.has(term.slug)) bySlug.set(term.slug, term);
		}
	}
	return [...bySlug.values()].sort((a, b) => THAI.compare(a.label, b.label));
}

/** The name a Health Service is shown by: its display name when set, else its official name. */
export function shownName(data: Pick<DirectoryData, "title" | "display_name">): string {
	return data.display_name?.trim() || data.title;
}

/**
 * The Health Services by their shown name in Thai order, a directory's natural order, then by
 * slug so the order is the same on every request.
 */
export function byName<E extends { id: string; data: DirectoryData }>(entries: readonly E[]): E[] {
	return entries.toSorted(
		(a, b) => THAI.compare(shownName(a.data), shownName(b.data)) || THAI.compare(a.id, b.id),
	);
}

/** The Health Services that match every filter that is set, in the order given. */
export function filterDirectory<E extends { data: DirectoryData }>(
	entries: readonly E[],
	filters: DirectoryFilters,
): E[] {
	return entries.filter(
		(entry) => matchesArea(entry.data, filters.area) && matchesName(entry.data, filters.name),
	);
}

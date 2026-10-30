// The Leadership and Personnel rules (Feature 003 #61; spec #51 "Public reads" (About), `03` §5,
// GLOSSARY Personnel and Leadership).
//
// Personnel is the office's public directory, and Leadership is a view of it, not another kind of
// record. Only a person with `public_visible` set appears; off or unset, they appear nowhere. The
// rules filter in code: EmDash binds a boolean `where` value, but its `WhereValue` type admits only
// strings (emdash 1.1.0 src/loader.ts bindableFilterValue, WhereValue), and the pages read every
// published Personnel entry either way. The module has no import, so node:test checks it directly;
// src/lib/personnel.ts reads through EmDash and uses it.

/** The fields of a Personnel entry the rules read (seed/seed.json). */
export interface PersonnelData {
	/** The display name. */
	title: string;
	prefix?: string | null;
	organizational_unit?: string | null;
	public_visible?: boolean | null;
	/** The person's rank among the Leadership, 1 first; empty when they are not Leadership. */
	leadership_order?: number | null;
}

/** Personnel in one organizational unit, by name. */
export interface UnitGroup<E> {
	/** The unit's name, or undefined for the Personnel whose unit is not set. */
	unit: string | undefined;
	people: E[];
}

/** Thai collation, for names and units. Node 24.21.0 ships full ICU data. */
const THAI = new Intl.Collator("th");

/** Whether the person may appear on the public site. */
function isVisible(data: PersonnelData): boolean {
	return data.public_visible === true;
}

/** The person's Leadership order, or undefined when they are not Leadership. */
function orderOf(data: PersonnelData): number | undefined {
	const order = data.leadership_order;
	return typeof order === "number" && Number.isFinite(order) ? order : undefined;
}

/** By display name in Thai order, then by id so the order is the same on every request. */
function compareNames<E extends { id: string; data: PersonnelData }>(a: E, b: E): number {
	return THAI.compare(a.data.title, b.data.title) || THAI.compare(a.id, b.id);
}

/**
 * A person as the site names them: the prefix before the display name, joined as Thai writes a
 * title such as นาย or นายแพทย์. A display name that already starts with the prefix is shown alone.
 */
export function shownName(data: Pick<PersonnelData, "title" | "prefix">): string {
	const prefix = data.prefix?.trim() ?? "";
	return prefix === "" || data.title.startsWith(prefix) ? data.title : `${prefix}${data.title}`;
}

/** The Leadership: the visible Personnel with a Leadership order, ascending, ties by name. */
export function leadership<E extends { id: string; data: PersonnelData }>(
	entries: readonly E[],
): E[] {
	return entries
		.filter((entry) => isVisible(entry.data) && orderOf(entry.data) !== undefined)
		.toSorted((a, b) => orderOf(a.data)! - orderOf(b.data)! || compareNames(a, b));
}

/**
 * The visible Personnel by organizational unit, the units in Thai order and each unit's people by
 * name. A unit is matched with the spaces around it trimmed. The Personnel without a unit come
 * last.
 */
export function personnelByUnit<E extends { id: string; data: PersonnelData }>(
	entries: readonly E[],
): UnitGroup<E>[] {
	const byUnit = new Map<string | undefined, E[]>();
	for (const entry of entries.filter((candidate) => isVisible(candidate.data))) {
		const unit = entry.data.organizational_unit?.trim() || undefined;
		byUnit.set(unit, [...(byUnit.get(unit) ?? []), entry]);
	}
	return [...byUnit]
		.toSorted(([a], [b]) => (a === undefined ? 1 : b === undefined ? -1 : THAI.compare(a, b)))
		.map(([unit, people]) => ({ unit, people: people.toSorted(compareNames) }));
}

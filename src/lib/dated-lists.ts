// Lists ordered by an optional date (Feature 003 #56; spec #51 "Public reads", ADR 0004).
//
// Activities order by their Activity date and Announcements by their announcement date, and an
// entry without that date takes its place by its publication (`04` §10). EmDash cannot sort that
// way: its `orderBy` is one column, and on PostgreSQL a descending sort puts the entries without
// the date first (emdash 1.1.0 src/loader.ts buildOrderByClause). So these lists read every
// published entry, sort it here and show one page of the result (ADR 0004). This module holds the
// ordering, the paging and the Announcement's current-or-closed rule, with no import, so node:test
// checks it directly.

/** A date as the query functions return a datetime field or the publication. */
export type Instant = Date | string | null | undefined;

/** The instant's time in milliseconds, or undefined when it is not set or not a date. */
function timeOf(value: Instant): number | undefined {
	if (value === null || value === undefined || value === "") return undefined;
	const time = new Date(value).getTime();
	return Number.isNaN(time) ? undefined : time;
}

/**
 * The entries newest first by their own date (`dateOf`), each without one placed by its
 * publication. The sort is stable, so entries with the same date keep the order they came in.
 */
export function newestFirst<E extends { data: { publishedAt?: Instant } }>(
	entries: readonly E[],
	dateOf: (data: E["data"]) => Instant,
): E[] {
	const keyOf = (entry: E) =>
		timeOf(dateOf(entry.data)) ?? timeOf(entry.data.publishedAt) ?? Number.NEGATIVE_INFINITY;
	return entries
		.map((entry) => ({ entry, key: keyOf(entry) }))
		.sort((a, b) => (a.key === b.key ? 0 : a.key < b.key ? 1 : -1))
		.map(({ entry }) => entry);
}

/** One page of a list in order, and whether a further page follows. */
export interface ListPage<E> {
	entries: E[];
	hasMore: boolean;
}

/** Page `page` (from 1) of `entries`, `size` to a page. */
export function listPage<E>(entries: readonly E[], page: number, size: number): ListPage<E> {
	const start = (page - 1) * size;
	return { entries: entries.slice(start, start + size), hasMore: entries.length > start + size };
}

/** A calendar day in Bangkok as "YYYY-MM-DD", which sorts as the days do. */
const BANGKOK_DAY = new Intl.DateTimeFormat("en-CA", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	timeZone: "Asia/Bangkok",
});

/**
 * Whether an Announcement with this close date is current at `now`: it has no close date, or its
 * close date is today or later on the Bangkok calendar (spec #51 "Public reads"). Pages show the
 * close date as a day, so the Announcement stays current through that whole day and is closed
 * from the next one.
 */
export function isCurrent(closesAt: Instant, now: Date): boolean {
	const closes = timeOf(closesAt);
	if (closes === undefined) return true;
	return BANGKOK_DAY.format(closes) >= BANGKOK_DAY.format(now);
}

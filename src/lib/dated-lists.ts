// Lists ordered by an optional date (Feature 003 #56; spec #51 "Public reads", ADR 0004).
//
// Activities order by their Activity date and Announcements by their announcement date, and an
// entry without that date takes its place by its publication (`04` §10). EmDash cannot sort that
// way: its `orderBy` is one column, and on PostgreSQL a descending sort puts the entries without
// the date first (emdash 1.1.0 src/loader.ts buildOrderByClause). So these lists read every
// published entry, a query without a `limit` (src/loader.ts `fetchLimit`), sort it here and show
// one page of the result (ADR 0004). This module holds the
// ordering, the paging and the Announcement's current-or-closed rule, with no import, so node:test
// checks it directly.

/** A date as the query functions return a datetime field or the publication; unset when empty. */
export type Instant = Date | string | null | undefined;

/** The instant's time in milliseconds, or undefined when it is not set or not a date. */
function timeOf(value: Instant): number | undefined {
	if (value === null || value === undefined || value === "") return undefined;
	const time = new Date(value).getTime();
	return Number.isNaN(time) ? undefined : time;
}

/** The date an entry is listed and shown by: its own date when it is one, else its publication. */
export function listDate(own: Instant, publishedAt: Instant): Instant {
	return timeOf(own) === undefined ? publishedAt : own;
}

/**
 * The entries newest first by their list date: their own date (`dateOf`), else their publication.
 * The sort is stable, so entries with the same date keep the order they came in.
 */
export function newestFirst<E extends { data: { publishedAt?: Instant } }>(
	entries: readonly E[],
	dateOf: (data: E["data"]) => Instant,
): E[] {
	const keyOf = (entry: E) =>
		timeOf(listDate(dateOf(entry.data), entry.data.publishedAt)) ?? Number.NEGATIVE_INFINITY;
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

/** The Gregorian year, month and day of an instant on the Bangkok calendar. */
const BANGKOK_DATE = new Intl.DateTimeFormat("en-US", {
	calendar: "gregory",
	numberingSystem: "latn",
	year: "numeric",
	month: "numeric",
	day: "numeric",
	timeZone: "Asia/Bangkok",
});

/** The instant's calendar day in Bangkok as a number YYYYMMDD, which orders as the days do. */
function bangkokDay(time: number | Date): number {
	const part = (type: string) =>
		Number(BANGKOK_DATE.formatToParts(time).find((p) => p.type === type)?.value);
	return part("year") * 10_000 + part("month") * 100 + part("day");
}

/**
 * Whether an Announcement with this close date is current at `now`: it has no close date, or its
 * close date is today or later on the Bangkok calendar (spec #51 "Public reads"). Pages show the
 * close date as a day, so the Announcement stays current through that whole day and is closed
 * from the next one, whatever time staff entered.
 */
export function isCurrent(closesAt: Instant, now: Date): boolean {
	const closes = timeOf(closesAt);
	if (closes === undefined) return true;
	return bangkokDay(closes) >= bangkokDay(now);
}

/** Where an Announcement with an open or close date stands: not open yet, open, or closed. */
export type AnnouncementStatus = "upcoming" | "open" | "closed";

/**
 * The status an Announcement states at `now`, by the Bangkok day like `isCurrent`: closed once its
 * close date has passed, not open yet before its open date, else open. An Announcement with
 * neither date, such as a plain notice, states none (Product Owner, 2026-10-29, #56).
 */
export function announcementStatus(
	opensAt: Instant,
	closesAt: Instant,
	now: Date,
): AnnouncementStatus | undefined {
	const opens = timeOf(opensAt);
	if (opens === undefined && timeOf(closesAt) === undefined) return undefined;
	if (!isCurrent(closesAt, now)) return "closed";
	if (opens !== undefined && bangkokDay(opens) > bangkokDay(now)) return "upcoming";
	return "open";
}

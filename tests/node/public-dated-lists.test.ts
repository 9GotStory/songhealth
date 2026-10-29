// Lists ordered by an optional date (#56; spec #51 "Public reads", ADR 0004).
//
// - Activities order by their Activity date and Announcements by their announcement date. An
//   entry without that date takes its place by its publication instead (`04` §10).
// - A list page is a fixed-size slice of that order.
// - An Announcement is current when it has no close date, or its close date is today or later on
//   the Bangkok calendar; it is closed from the next Bangkok day.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isCurrent, listPage, newestFirst } from "../../src/lib/dated-lists.ts";

/** A published entry as the query functions return it, with an optional own date. */
function entry(id: string, publishedAt: string, at?: string | null) {
	return { id, data: { publishedAt, at } };
}

const ids = (entries: ReadonlyArray<{ id: string }>) => entries.map(({ id }) => id);

describe("newestFirst", () => {
	it("orders by the entry's own date, newest first, falling back to its publication", () => {
		const entries = [
			entry("held-in-july", "2026-10-01T03:00:00.000Z", "2026-07-15T03:00:00.000Z"),
			entry("undated-published-in-august", "2026-08-10T03:00:00.000Z"),
			entry("held-in-september", "2026-06-01T03:00:00.000Z", "2026-09-02T03:00:00.000Z"),
			entry("undated-published-in-may", "2026-05-20T03:00:00.000Z", null),
		];
		assert.deepEqual(ids(newestFirst(entries, (data) => data.at)), [
			"held-in-september",
			"undated-published-in-august",
			"held-in-july",
			"undated-published-in-may",
		]);
	});

	it("keeps the order entries came in when their dates are equal", () => {
		const sameDay = "2026-09-02T03:00:00.000Z";
		const entries = [
			entry("first", "2026-10-03T03:00:00.000Z", sameDay),
			entry("second", "2026-10-02T03:00:00.000Z", sameDay),
			entry("third", sameDay),
			entry("no-dates-a", ""),
			entry("no-dates-b", ""),
		];
		assert.deepEqual(ids(newestFirst(entries, (data) => data.at)), [
			"first",
			"second",
			"third",
			"no-dates-a",
			"no-dates-b",
		]);
	});

	it("falls back to the publication when the own date is not a date", () => {
		const entries = [
			entry("bad-date", "2026-10-01T03:00:00.000Z", "not a date"),
			entry("held-in-september", "2026-06-01T03:00:00.000Z", "2026-09-02T03:00:00.000Z"),
		];
		assert.deepEqual(ids(newestFirst(entries, (data) => data.at)), [
			"bad-date",
			"held-in-september",
		]);
	});

	it("leaves the list it was given as it was", () => {
		const entries = [
			entry("older", "2026-01-01T03:00:00.000Z"),
			entry("newer", "2026-02-01T03:00:00.000Z"),
		];
		newestFirst(entries, (data) => data.at);
		assert.deepEqual(ids(entries), ["older", "newer"]);
	});
});

describe("listPage", () => {
	const all = ["a", "b", "c", "d", "e"];

	it("shows one fixed-size page of the order and says whether another follows", () => {
		assert.deepEqual(listPage(all, 1, 2), { entries: ["a", "b"], hasMore: true });
		assert.deepEqual(listPage(all, 2, 2), { entries: ["c", "d"], hasMore: true });
		assert.deepEqual(listPage(all, 3, 2), { entries: ["e"], hasMore: false });
	});

	it("has no further page when the last page is exactly full", () => {
		assert.deepEqual(listPage(all.slice(0, 4), 2, 2), { entries: ["c", "d"], hasMore: false });
	});

	it("is empty past the end", () => {
		assert.deepEqual(listPage(all, 4, 2), { entries: [], hasMore: false });
		assert.deepEqual(listPage([], 1, 2), { entries: [], hasMore: false });
	});
});

describe("isCurrent", () => {
	// 10:00 on 29 Oct 2026 in Bangkok (UTC+7).
	const now = new Date("2026-10-29T03:00:00.000Z");

	it("is current without a close date", () => {
		for (const none of [null, undefined, ""]) assert.equal(isCurrent(none, now), true);
	});

	it("is current all through its close date, in Bangkok", () => {
		// Midnight starting 29 Oct in Bangkok is still 28 Oct in UTC.
		assert.equal(isCurrent("2026-10-28T17:00:00.000Z", now), true);
		// Closing at 08:00 Bangkok, two hours before now: still the close date.
		assert.equal(isCurrent("2026-10-29T01:00:00.000Z", now), true);
		assert.equal(isCurrent(new Date("2026-10-29T16:59:59.000Z"), now), true);
	});

	it("is closed once its close date has passed in Bangkok", () => {
		// 23:59 on 28 Oct in Bangkok: yesterday.
		assert.equal(isCurrent("2026-10-28T16:59:59.000Z", now), false);
		assert.equal(isCurrent("2025-12-31T03:00:00.000Z", now), false);
	});

	it("is current while its close date is ahead", () => {
		assert.equal(isCurrent("2026-10-30T03:00:00.000Z", now), true);
	});

	it("turns at midnight in Bangkok, not at midnight UTC", () => {
		const closesOn29th = "2026-10-29T05:00:00.000Z";
		// 23:59 on 29 Oct in Bangkok.
		assert.equal(isCurrent(closesOn29th, new Date("2026-10-29T16:59:59.000Z")), true);
		// 00:00 on 30 Oct in Bangkok, while UTC is still on the 29th.
		assert.equal(isCurrent(closesOn29th, new Date("2026-10-29T17:00:00.000Z")), false);
	});
});

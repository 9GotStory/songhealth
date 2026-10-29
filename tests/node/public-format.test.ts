// Shared formatting for public pages (#54; spec #51, "Dates" and "Lists and filters").
//
// - Dates read in Thai with the Buddhist Era year, in Bangkok time, from the UTC instants
//   EmDash stores (#51 user story 12, for example "24 ก.ย. 2569").
// - A list's page number travels in the `page` query parameter. A value that is not a page
//   number is ignored and the first page is shown.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pageHref, parsePageNumber } from "../../src/lib/pagination.ts";
import { formatThaiDate } from "../../src/lib/thai-date.ts";

describe("formatThaiDate", () => {
	it("reads a date as day, abbreviated Thai month and Buddhist Era year", () => {
		assert.equal(formatThaiDate("2026-09-24T03:00:00.000Z"), "24 ก.ย. 2569");
	});

	it("takes the day in Bangkok time, seven hours ahead of UTC", () => {
		assert.equal(formatThaiDate("2026-09-23T16:59:59.000Z"), "23 ก.ย. 2569");
		assert.equal(formatThaiDate("2026-09-23T17:00:00.000Z"), "24 ก.ย. 2569");
		assert.equal(formatThaiDate("2026-12-31T17:30:00.000Z"), "1 ม.ค. 2570");
	});

	it("accepts a Date as well as an ISO string", () => {
		assert.equal(formatThaiDate(new Date("2026-01-05T00:00:00.000Z")), "5 ม.ค. 2569");
	});

	it("refuses a value that is not a date", () => {
		assert.throws(() => formatThaiDate("not a date"), RangeError);
	});
});

describe("parsePageNumber", () => {
	it("reads a positive whole number", () => {
		assert.equal(parsePageNumber("1"), 1);
		assert.equal(parsePageNumber("2"), 2);
		assert.equal(parsePageNumber("37"), 37);
	});

	it("shows the first page when the parameter is absent or empty", () => {
		assert.equal(parsePageNumber(null), 1);
		assert.equal(parsePageNumber(""), 1);
	});

	it("ignores a value that is not a page number", () => {
		for (const raw of ["0", "-1", "1.5", "2e3", "abc", " 2", "2 ", "+2", "02", "0x10", "١٢"]) {
			assert.equal(parsePageNumber(raw), 1, JSON.stringify(raw));
		}
	});

	it("ignores a page number too large to be a real page", () => {
		assert.equal(parsePageNumber("10000"), 10000);
		assert.equal(parsePageNumber("10001"), 1);
		assert.equal(parsePageNumber("99999999999999999999"), 1);
	});
});

describe("pageHref", () => {
	it("puts the page number in the query string and keeps the other parameters", () => {
		const url = new URL("http://site.test/news/health?topic=vaccine&page=2");
		assert.equal(pageHref(url, 3), "/news/health?topic=vaccine&page=3");
	});

	it("leaves the page number out for the first page", () => {
		assert.equal(pageHref(new URL("http://site.test/news?page=4"), 1), "/news");
		assert.equal(
			pageHref(new URL("http://site.test/news/health?page=2&topic=vaccine"), 1),
			"/news/health?topic=vaccine",
		);
	});

	it("encodes Thai parameter values", () => {
		const url = new URL("http://site.test/news/health");
		url.searchParams.set("topic", "วัคซีน");
		assert.equal(pageHref(url, 2), `/news/health?topic=${encodeURIComponent("วัคซีน")}&page=2`);
	});
});

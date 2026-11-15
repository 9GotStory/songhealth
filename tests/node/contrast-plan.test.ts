// What scripts/measure-text-contrast.ts prints after its readings (#287 retro):
// scripts/contrast/plan.ts, the lowest reading of each text over the widths and the page a
// fixtures module made.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fixturePath, lowestReadings, summaryLines } from "../../scripts/contrast/plan.ts";

describe("lowestReadings", () => {
	it("gives each text its lowest reading and the widths it was read at, in the order first seen", () => {
		assert.deepEqual(
			lowestReadings([
				{ width: 1440, text: "main h1", ratio: 8.72 },
				{ width: 1440, text: "the lead", ratio: 7.6 },
				{ width: 768, text: "main h1", ratio: 8.03 },
				{ width: 768, text: "the lead", ratio: 6.45 },
				{ width: 320, text: "main h1", ratio: 6.99 },
				{ width: 320, text: "the lead", ratio: 6.449 },
			]),
			[
				{ text: "main h1", lowest: 6.99, widths: [320] },
				{ text: "the lead", lowest: 6.45, widths: [768, 320] },
			],
		);
	});

	it("takes the lowest wherever it comes, and passes over a width that read nothing", () => {
		assert.deepEqual(
			lowestReadings([
				{ width: 1440, text: "summary", ratio: 9.1 },
				{ width: 375, text: "summary" },
				{ width: 1024, text: "summary", ratio: 8.84 },
			]),
			[{ text: "summary", lowest: 8.84, widths: [1024] }],
		);
	});

	it("names a text that no width read", () => {
		assert.deepEqual(
			lowestReadings([
				{ width: 1440, text: "category" },
				{ width: 320, text: "category" },
			]),
			[{ text: "category", widths: [] }],
		);
	});
});

describe("summaryLines", () => {
	it("writes a line for each text, with its ratio to two places and its widths", () => {
		assert.deepEqual(
			summaryLines([
				{ width: 1024, text: "the link", ratio: 6.45 },
				{ width: 768, text: "the lead", ratio: 6.45 },
				{ width: 768, text: "the link", ratio: 6.45 },
				{ width: 375, text: "the title", ratio: 7.5 },
				{ width: 320, text: "the lead", ratio: 6.45 },
				{ width: 320, text: "the link", ratio: 6.45 },
				{ width: 320, text: "category" },
			]),
			[
				"lowest  the link  6.45:1 at 1024, 768 and 320 px",
				"lowest  the lead  6.45:1 at 768 and 320 px",
				"lowest  the title  7.50:1 at 375 px",
				"lowest  category  not read at any width",
			],
		);
	});
});

describe("fixturePath", () => {
	const captures = [
		"/news@1440",
		{ name: "news-landscape-1440", path: "/news/synthetic-a@1440" },
		{ name: "news-landscape-320", path: "/news/synthetic-a@320" },
		{ name: "health-content-plain-1440", path: "/health/content/synthetic-b@1440>main" },
		{ name: "activity-photos-open-375", path: "/activities/synthetic-c@375!ดูรูปทั้งหมด (20 รูป)" },
		{ name: "activity-photos-375", path: "/activities/synthetic-d@375" },
	];

	it("gives the page of the first capture of that name, without its width, selector or click", () => {
		assert.equal(fixturePath(captures, "news-landscape"), "/news/synthetic-a");
		assert.equal(fixturePath(captures, "health-content-plain"), "/health/content/synthetic-b");
		assert.equal(fixturePath(captures, "activity-photos-open-375"), "/activities/synthetic-c");
	});

	it("matches a whole name, or the name before its width, never a longer name or part of a word", () => {
		assert.equal(fixturePath(captures, "activity-photos"), "/activities/synthetic-d");
		assert.equal(fixturePath(captures, "activity-photos-open"), "/activities/synthetic-c");
		assert.throws(
			() => fixturePath(captures, "news-land"),
			/no capture named news-land: news-landscape-1440, news-landscape-320, health-content-plain-1440/,
		);
	});
});

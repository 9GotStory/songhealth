// What scripts/measure-text-contrast.ts prints after its readings (#287 retro):
// scripts/contrast/plan.ts, the lowest reading of each text over the widths and the page a
// fixtures module made.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	fixturePath,
	foldedLines,
	lowestReadings,
	summaryLines,
} from "../../scripts/contrast/plan.ts";

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

describe("foldedLines", () => {
	it("folds the texts that differ only in their numbers or their repeat's count into one line", () => {
		assert.deepEqual(
			foldedLines([
				{ width: 1440, text: 'span "16"', ratio: 7.9 },
				{ width: 1440, text: 'span "พ.ย. 2569"', ratio: 5.52 },
				{ width: 1440, text: 'span "15"', ratio: 7.79 },
				{ width: 1440, text: 'span "พ.ย. 2569" (2)', ratio: 5.53 },
				{ width: 375, text: 'span "16"', ratio: 7.79 },
				{ width: 375, text: 'span "พ.ย. 2569"', ratio: 5.37 },
				{ width: 375, text: 'span "พ.ย. 2569" (2)', ratio: 5.37 },
				{ width: 320, text: 'span "พ.ย. 2569" (2)', ratio: 5.371 },
				{ width: 320, text: 'p "PDF, 11.8 KB"', ratio: 4.97 },
				{ width: 320, text: 'p "PDF, 2 KB"', ratio: 4.97 },
			]),
			[
				'folded  span "#"  7.79:1 at 1440 and 375 px (2 texts)',
				'folded  span "พ.ย. #"  5.37:1 at 375 and 320 px (2 texts)',
				'folded  p "PDF, # KB"  4.97:1 at 320 px (2 texts)',
			],
		);
	});

	it("keeps a text of its own on its own line, and names one that no width read", () => {
		assert.deepEqual(
			foldedLines([
				{ width: 1440, text: 'h1 "ประกาศ"', ratio: 8.9 },
				{ width: 320, text: 'h1 "ประกาศ"', ratio: 8.26 },
				{ width: 320, text: 'h2 "ประกาศ"', ratio: 15.47 },
				{ width: 320, text: "category" },
			]),
			[
				'folded  h1 "ประกาศ"  8.26:1 at 320 px',
				'folded  h2 "ประกาศ"  15.47:1 at 320 px',
				"folded  category  not read at any width",
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

	it("names the module's plain paths when no capture has the name, since those are measured as written (#341 retro)", () => {
		assert.throws(
			() => fixturePath(["/news@1440", "/news@320", ...captures], "news"),
			/; its plain paths, measured as written without "fixture:": \/news$/,
		);
	});
});

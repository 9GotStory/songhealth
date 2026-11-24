// Which before/after pairs scripts/evidence-branch.sh staged are identical, and where the others
// differ (#397 retro item 3): scripts/evidence-pairs/plan.ts, which scripts/evidence-pairs.ts
// feeds each pair's decoded pixels.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	againstReport,
	casesReport,
	comparePixels,
	pairsReport,
	unfilter,
	type Comparison,
} from "../../scripts/evidence-pairs/plan.ts";

/** An image of `width` × rows, one byte a pixel for brevity, each row given as its bytes. */
const image = (width: number, rows: number[][]) => ({
	width,
	height: rows.length,
	channels: 1,
	pixels: Uint8Array.from(rows.flat()),
});

describe("comparePixels", () => {
	it("counts the pixels that differ and bands the rows that hold them", () => {
		const before = image(2, [
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 0],
			[0, 0],
		]);
		const after = image(2, [
			[0, 0],
			[1, 1],
			[0, 1],
			[0, 0],
			[9, 0],
		]);
		assert.deepEqual(comparePixels(before, after), {
			kind: "differ",
			pixels: 4,
			bands: [
				[1, 2],
				[4, 4],
			],
		});
	});

	it("gives the heights and the rows the same from the top when the heights differ", () => {
		const before = image(1, [[0], [0], [5], [0]]);
		const after = image(1, [[0], [0], [0]]);
		assert.deepEqual(comparePixels(before, after), {
			kind: "heights",
			before: 4,
			after: 3,
			sameRows: 2,
		});
	});
});

describe("pairsReport", () => {
	it("writes a line per pair, more than four bands as their span, then how many are identical", () => {
		assert.deepEqual(
			pairsReport([
				{ name: "about-1440", result: { kind: "identical" } },
				{
					name: "home-1440",
					result: { kind: "differ", pixels: 3454, bands: [[2485, 2506]] },
				},
				{
					name: "home-375",
					result: { kind: "heights", before: 6344, after: 6320, sameRows: 2485 },
				},
				{
					name: "qa-375",
					result: {
						kind: "differ",
						pixels: 11,
						bands: [
							[259, 264],
							[300, 300],
						],
					},
				},
			]),
			[
				"about-1440  identical",
				"home-1440  3,454 px differ in rows 2,485–2,506",
				"home-375  6,344 → 6,320 px high; rows 0–2,484 the same",
				"qa-375  11 px differ in rows 259–264, 300",
				"1 of 4 pairs identical",
			],
		);
	});
});

// #421 retro item 1: the 145 pair lines were too many to quote, so the record paraphrased them
// and left a page out; the cases' block is short enough to quote whole.
const heights = (before: number, after: number, sameRows: number): Comparison => ({
	kind: "heights",
	before,
	after,
	sameRows,
});
const differ = (pixels: number, first: number, last: number): Comparison => ({
	kind: "differ",
	pixels,
	bands: [[first, last]],
});
const identical: Comparison = { kind: "identical" };

describe("casesReport", () => {
	it("groups the cases alike at every width and gives each other case its widths, widest first", () => {
		assert.deepEqual(
			casesReport([
				{ name: "about-1024", result: heights(1813, 1933, 61) },
				{ name: "about-1440", result: heights(1813, 1925, 404) },
				{ name: "doc-1440", result: identical },
				{ name: "doc-375", result: identical },
				{ name: "health-1440", result: differ(5, 382, 523) },
				{ name: "health-320", result: heights(900, 985, 356) },
				{ name: "list-1440", result: differ(9, 10, 20) },
				{ name: "list-375", result: differ(9, 30, 40) },
			]),
			[
				"identical at every width (1): doc",
				"differ at every width, at the same height (1): list",
				"about  1440: 1,813 → 1,925 px high; rows 0–403 the same  |  1024: 1,813 → 1,933 px high; rows 0–60 the same",
				"health  1440: 5 px differ in rows 382–523  |  320: 900 → 985 px high; rows 0–355 the same",
				"2 of 8 pairs identical",
			],
		);
	});
});

describe("againstReport", () => {
	it("groups each after image by the earlier ticket's branch that holds it, then by case", () => {
		assert.deepEqual(
			againstReport([
				{ name: "about-1440", ref: "evidence/014-420-screenshots", result: identical },
				{ name: "about-375", ref: "evidence/014-420-screenshots", result: identical },
				{ name: "home-1440", ref: "evidence/014-420-screenshots", result: identical },
				{ name: "page-1440", ref: "evidence/014-418-screenshots", result: differ(90, 715, 749) },
				{ name: "page-375", ref: "evidence/014-418-screenshots", result: identical },
				{ name: "new-1440" },
			]),
			[
				"identical to evidence/014-420-screenshots at every width (2): about, home",
				"page against evidence/014-418-screenshots  1440: 90 px differ in rows 715–749  |  375: identical",
				"no earlier after image (1): new",
				"4 of 5 after images identical to the earlier ticket's",
			],
		);
	});
});

describe("unfilter", () => {
	it("undoes each PNG filter type by its row's first byte", () => {
		// Two pixels of one channel a row: None, Sub, Up, Average and Paeth.
		const filtered = Uint8Array.from([0, 10, 20, 1, 5, 5, 2, 1, 1, 3, 4, 4, 4, 1, 1]);
		assert.deepEqual([...unfilter(filtered, 2, 5, 1)], [10, 20, 5, 10, 6, 11, 7, 13, 8, 14]);
	});
});

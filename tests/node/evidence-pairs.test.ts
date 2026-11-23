// Which before/after pairs scripts/evidence-branch.sh staged are identical, and where the others
// differ (#397 retro item 3): scripts/evidence-pairs/plan.ts, which scripts/evidence-pairs.ts
// feeds each pair's decoded pixels.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { comparePixels, pairsReport, unfilter } from "../../scripts/evidence-pairs/plan.ts";

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

describe("unfilter", () => {
	it("undoes each PNG filter type by its row's first byte", () => {
		// Two pixels of one channel a row: None, Sub, Up, Average and Paeth.
		const filtered = Uint8Array.from([0, 10, 20, 1, 5, 5, 2, 1, 1, 3, 4, 4, 4, 1, 1]);
		assert.deepEqual([...unfilter(filtered, 2, 5, 1)], [10, 20, 5, 10, 6, 11, 7, 13, 8, 14]);
	});
});

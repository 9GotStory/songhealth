// The table of page heights scripts/evidence-branch.sh prints for a folder of screenshots (#287
// retro): scripts/evidence-heights/plan.ts, which scripts/evidence-heights.ts feeds each PNG's
// height.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { heightsTable } from "../../scripts/evidence-heights/plan.ts";

describe("heightsTable", () => {
	it("writes a row for a page's before and its after, widest first, with thousands marked", () => {
		assert.deepEqual(
			heightsTable([
				{ file: "after-news-375.png", height: 1791 },
				{ file: "after-news-1440.png", height: 1801 },
				{ file: "before-news-1440.png", height: 1501 },
				{ file: "before-news-375.png", height: 3447 },
			]),
			[
				"| Page | | 1,440 px | 375 px |",
				"| --- | --- | ---: | ---: |",
				"| `news` | before | 1,501 | 3,447 |",
				"| | after | 1,801 | 1,791 |",
			],
		);
	});

	it("orders pages by name, leaves a width a page lacks empty and keeps a page with one state", () => {
		assert.deepEqual(
			heightsTable([
				{ file: "after-news-list-12-1440.png", height: 2627 },
				{ file: "after-news-list-12-320.png", height: 2721 },
				{ file: "before-news-landscape-1024.png", height: 900 },
				{ file: "after-news-landscape-1024.png", height: 929 },
			]),
			[
				"| Page | | 1,440 px | 1,024 px | 320 px |",
				"| --- | --- | ---: | ---: | ---: |",
				"| `news-landscape` | before | | 900 | |",
				"| | after | | 929 | |",
				"| `news-list-12` | after | 2,627 | | 2,721 |",
			],
		);
	});

	it("takes a file without before- or after- as a page's one capture, and leaves out a name without a width", () => {
		assert.deepEqual(
			heightsTable([
				{ file: "news-list-3-768.png", height: 1437 },
				{ file: "before-news-landscape-desktop.png", height: 900 },
				{ file: "before-news-landscape-320-menu.png", height: 1247 },
				{ file: "captures.txt", height: 0 },
			]),
			["| Page | | 768 px |", "| --- | --- | ---: |", "| `news-list-3` | | 1,437 |"],
		);
	});

	it("writes nothing for a folder without a page at a width", () => {
		assert.deepEqual(heightsTable([{ file: "before-x-desktop.png", height: 1 }]), []);
	});
});

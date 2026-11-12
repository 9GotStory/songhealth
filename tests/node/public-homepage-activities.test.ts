// How the Homepage lays out its latest Activities (Feature 008 #247; spec #239 "Activities").
//
// Five Activities stand as one large tile beside four small ones. Fewer are equal tiles in one row
// from 1,024 px. Below 1,024 px the tiles go two to a row, and the first spans the row only when
// the others are an even number, so no cell is empty (Product Owner, 2026-11-12: #247 comment
// 6820174924).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { activitiesLayout } from "../../src/lib/homepage-activities.ts";

describe("the Homepage's Activities layout", () => {
	it("is one large tile beside four small ones with five Activities", () => {
		assert.deepEqual(activitiesLayout(5), { large: true, columns: 4, firstSpansRow: true });
	});

	it("is equal tiles in one row with four, three, two and one", () => {
		assert.deepEqual(activitiesLayout(4), { large: false, columns: 4, firstSpansRow: false });
		assert.deepEqual(activitiesLayout(3), { large: false, columns: 3, firstSpansRow: true });
		assert.deepEqual(activitiesLayout(2), { large: false, columns: 2, firstSpansRow: false });
		assert.deepEqual(activitiesLayout(1), { large: false, columns: 1, firstSpansRow: true });
	});

	it("leaves no cell of two columns empty below 1,024 px, whatever the number", () => {
		for (const count of [1, 2, 3, 4, 5]) {
			const { firstSpansRow } = activitiesLayout(count);
			const cells = count + (firstSpansRow ? 1 : 0);
			assert.equal(cells % 2, 0, `${count} Activities fill their rows of two`);
		}
	});
});

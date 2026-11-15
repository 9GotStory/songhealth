// The first page of the News, Health News and Health Content lists (Feature 009 #284; spec #280
// "The first page").
//
// A first page that no Health Topic narrows shows its newest item as the large card: across the
// row from 1,024 px with one item, 440 px high or more; two columns wide with two, 380 px or more;
// two columns wide and two rows high with three or more, 520 px or more. From 640 px it spans the
// row, 380 px or more, and below 640 px it is 300 px or more. A later page, and a list narrowed by
// a Health Topic, show even cards.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { firstPageLargeCard, largeCardPictureSizes } from "../../src/lib/list-first-page.ts";

const firstPage = { page: 1, narrowed: false };

describe("the large card on a list's first page", () => {
	it("is across the row from 1,024 px, 440 px high or more, with one item", () => {
		assert.deepEqual(firstPageLargeCard(1, firstPage), {
			columnsFromLg: 3,
			rowsFromLg: 1,
			minHeight: { base: 300, sm: 380, lg: 440 },
		});
	});

	it("is two columns wide beside the other card from 1,024 px, 380 px high or more, with two", () => {
		assert.deepEqual(firstPageLargeCard(2, firstPage), {
			columnsFromLg: 2,
			rowsFromLg: 1,
			minHeight: { base: 300, sm: 380, lg: 380 },
		});
	});

	it("is two columns wide and two rows high beside the next two from 1,024 px, 520 px high or more, with three, four or a full page of twelve", () => {
		for (const count of [3, 4, 12]) {
			assert.deepEqual(
				firstPageLargeCard(count, firstPage),
				{ columnsFromLg: 2, rowsFromLg: 2, minHeight: { base: 300, sm: 380, lg: 520 } },
				`${count} items`,
			);
		}
	});

	it("is not shown on a page with no item", () => {
		assert.equal(firstPageLargeCard(0, firstPage), undefined);
	});

	it("is not shown on a second or later page, with any number of items", () => {
		for (const page of [2, 3]) {
			for (const count of [0, 1, 2, 3, 4, 12]) {
				assert.equal(
					firstPageLargeCard(count, { page, narrowed: false }),
					undefined,
					`page ${page}, ${count} items`,
				);
			}
		}
	});

	it("is not shown on a list narrowed by a Health Topic, on its first page or a later one", () => {
		for (const page of [1, 2]) {
			for (const count of [0, 1, 2, 3, 4, 12]) {
				assert.equal(
					firstPageLargeCard(count, { page, narrowed: true }),
					undefined,
					`page ${page}, ${count} items`,
				);
			}
		}
	});

	it("gives its picture the card's width: the 1,200 px container across the row, two of its three columns otherwise, and the row below 1,024 px", () => {
		assert.equal(
			largeCardPictureSizes(firstPageLargeCard(1, firstPage)!),
			"(min-width: 64rem) 75rem, 100vw",
		);
		for (const count of [2, 3, 12]) {
			assert.equal(
				largeCardPictureSizes(firstPageLargeCard(count, firstPage)!),
				"(min-width: 64rem) 50rem, 100vw",
				`${count} items`,
			);
		}
	});
});

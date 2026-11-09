// Screenshot content for the shared pager (#196; spec #190 "Pagination"): 25 published News under
// one Health Topic, which make three real pages of /news/health, and two pages of search results.
// Captures the pager alone at both sides of the 640 px edge, and a list and search page whole, so
// the phone height the Product Owner accepted shows beside the one-row layout.

import type { Fixtures } from "../capture-with-fixtures.ts";

const PAGER = 'nav[aria-label="การแบ่งหน้า"]';
const SEARCH_WORD = "รณรงค์สุขภาพชุมชน";

const fixtures: Fixtures = async ({ admin, helpers, term }) => {
	const topic = await term("topic", "ตัวอย่างการแบ่งหน้า");
	for (let number = 1; number <= 25; number += 1) {
		const { id } = await helpers.createSyntheticDraft(admin, "news", "ตัวอย่าง", "shot", {
			data: { title: `[ตัวอย่าง] ข่าว${SEARCH_WORD} ฉบับที่ ${number}` },
			taxonomies: { topic: [topic] },
		});
		await helpers.publishEntryAt(admin, "news", id);
	}

	const first = `/news/health?topic=${topic}`;
	const middle = `${first}&page=2`;
	const last = `${first}&page=3`;
	const search = `/search?${new URLSearchParams({ q: SEARCH_WORD, page: "2" })}`;
	return [
		...[320, 375, 639, 640, 1440].map((width) => ({
			name: `pager-middle-${width}`,
			path: `${middle}@${width}>${PAGER}`,
		})),
		{ name: "pager-first-320", path: `${first}@320>${PAGER}` },
		{ name: "pager-last-320", path: `${last}@320>${PAGER}` },
		{ name: "pager-search-375", path: `${search}@375>${PAGER}` },
		{ name: "list-middle", path: middle },
		{ name: "search-last", path: search },
	];
};

export default fixtures;

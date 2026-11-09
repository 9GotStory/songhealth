// Two-row phone pagination (Feature 007 #196; spec #190 "Pagination", Seam A; Product Owner,
// #190 comment 6707205912, Pagination B). The suite's own News make real first, middle, last and
// single-page results, and each case follows the pager's real links.

import type { Locator, Page } from "@playwright/test";

import {
	createOwnedTerm,
	createSyntheticDraft,
	devAdminActor,
	publishEntryAt,
	removeSuiteFixtures,
	type CmsActor,
	type DraftFixture,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	boxOf,
	expect,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	listedTitles,
	ownTitles,
	test,
	thaiWord,
} from "./public.helpers";

/** The News list's page size (src/lib/news.ts). */
const PAGE_SIZE = 12;
/** The search results' page size (src/lib/search-matcher.ts). */
const SEARCH_PAGE_SIZE = 20;
const PREVIOUS = "หน้าก่อนหน้า";
const NEXT = "หน้าถัดไป";

let admin: CmsActor;
let threePages: SyntheticTerm;
let fullPage: SyntheticTerm;
let onePastFull: SyntheticTerm;
const word = thaiWord();
const oneResultWord = thaiWord();
const news: DraftFixture[] = [];
const ownedTerms: SyntheticTerm[] = [];

const pager = (page: Page) => page.getByRole("navigation", { name: "การแบ่งหน้า" });
const listPath = (term: SyntheticTerm, number = 1) =>
	`/news/health?topic=${term.slug}${number > 1 ? `&page=${number}` : ""}`;
const searchPath = (query: Record<string, string>) => `/search?${new URLSearchParams(query)}`;

/** What the pager of one page of a list says and links to. */
interface PagerState {
	number: number;
	previous?: string;
	next?: string;
}

/** The pager names only its page number and the links that page has: no disabled link, no total. */
async function expectPager(page: Page, { number, previous, next }: PagerState): Promise<void> {
	const nav = pager(page);
	await expect(nav.getByRole("link")).toHaveText([
		...(previous === undefined ? [] : [PREVIOUS]),
		...(next === undefined ? [] : [NEXT]),
	]);
	if (previous !== undefined) {
		await expect(nav.getByRole("link", { name: PREVIOUS })).toHaveAttribute("href", previous);
	}
	if (next !== undefined) {
		await expect(nav.getByRole("link", { name: NEXT })).toHaveAttribute("href", next);
	}
	expect(await nav.evaluate((element) => element.textContent.replace(/\s+/g, ""))).toBe(
		`${previous === undefined ? "" : PREVIOUS}หน้า${number}${next === undefined ? "" : NEXT}`,
	);
}

/** Where `part`'s own text is drawn and how many lines it takes, whatever box holds it. */
function textOf(part: Locator) {
	return part.evaluate((element) => {
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		const rects: DOMRect[] = [];
		for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
			const range = document.createRange();
			range.selectNodeContents(node);
			rects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0));
		}
		return {
			left: Math.min(...rects.map((rect) => rect.left)),
			right: Math.max(...rects.map((rect) => rect.right)),
			top: Math.min(...rects.map((rect) => rect.top)),
			bottom: Math.max(...rects.map((rect) => rect.bottom)),
			lines: new Set(rects.map((rect) => Math.round(rect.top))).size,
		};
	});
}

/** The pager as the page lays it out now. */
async function measurePager(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const nav = pager(page);
	const link = async (name: string) => {
		const anchor = nav.getByRole("link", { name });
		if ((await anchor.count()) === 0) return undefined;
		return { box: await boxOf(anchor, name), label: await textOf(anchor) };
	};
	return {
		nav: await boxOf(nav, "the pager"),
		number: await textOf(nav.getByText(/^หน้า \d+$/)),
		previous: await link(PREVIOUS),
		next: await link(NEXT),
	};
}

type PagerLayout = Awaited<ReturnType<typeof measurePager>>;
type PagerLayouts = Array<[label: string, layout: PagerLayout]>;

function expectNear(actual: number, expected: number, label: string): void {
	expect(Math.abs(actual - expected), `${label} (${actual} against ${expected})`).toBeLessThan(1);
}

/** At every width: 44 px targets, one-line labels, Previous at the left end, Next at the right. */
function expectLinks({ nav, previous, next }: PagerLayout, label: string): void {
	for (const link of [previous, next]) {
		if (link === undefined) continue;
		expect(link.box.height, `${label}: a 44 px target`).toBeGreaterThanOrEqual(44);
		expect(link.label.lines, `${label}: a link's label stays on one line`).toBe(1);
	}
	if (previous !== undefined) expectNear(previous.box.x, nav.x, `${label}: Previous starts left`);
	if (next !== undefined) {
		expectNear(next.box.x + next.box.width, nav.x + nav.width, `${label}: Next ends right`);
	}
	if (previous !== undefined && next !== undefined) {
		expectNear(previous.box.y, next.box.y, `${label}: Previous and Next share a row`);
		expect(previous.box.x + previous.box.width, `${label}: the links stay apart`).toBeLessThan(
			next.box.x,
		);
	}
}

/** Below 640 px: the number centered on its own row, above the links. */
function expectNumberAbove({ nav, number, previous, next }: PagerLayout, label: string): void {
	for (const link of [previous, next]) {
		if (link === undefined) continue;
		expect(link.box.y, `${label}: the number is above the links`).toBeGreaterThanOrEqual(
			number.bottom,
		);
	}
	expectNear((number.left + number.right) / 2, nav.x + nav.width / 2, `${label}: centered number`);
}

/** From 640 px: the number between the links on their one row, with even space around it. */
function expectNumberBetween({ nav, number, previous, next }: PagerLayout, label: string): void {
	for (const link of [previous, next]) {
		if (link === undefined) continue;
		expectNear(
			(number.top + number.bottom) / 2,
			link.box.y + link.box.height / 2,
			`${label}: the number shares the links' row`,
		);
		expect(nav.height, `${label}: one row`).toBeLessThan(link.box.height + 1);
	}
	const left = previous === undefined ? nav.x : previous.box.x + previous.box.width;
	const right = next === undefined ? nav.x + nav.width : next.box.x;
	expectNear(number.left - left, right - number.right, `${label}: even space around the number`);
}

/** The links' placement on every measured page, then the number's arrangement at `width`. */
function expectLayouts(width: number, layouts: PagerLayouts): void {
	const measured = layouts.map(([label, layout]) => [`${label} at ${width} px`, layout] as const);
	for (const [label, layout] of measured) expectLinks(layout, label);
	const expectNumber = width < 640 ? expectNumberAbove : expectNumberBetween;
	for (const [label, layout] of measured) expectNumber(layout, label);
}

/** Move focus to the pager's link `name` and follow it with Enter. */
async function pressPagerLink(page: Page, name: string): Promise<void> {
	const link = pager(page).getByRole("link", { name });
	await link.focus();
	await expect(link).toBeFocused();
	await link.press("Enter");
}

test.beforeAll(async () => {
	admin = await devAdminActor();
	threePages = await createOwnedTerm(admin, "topic", "หัวข้อทดสอบการแบ่งหน้า", ownedTerms);
	fullPage = await createOwnedTerm(admin, "topic", "หัวข้อหนึ่งหน้าพอดี", ownedTerms);
	onePastFull = await createOwnedTerm(admin, "topic", "หัวข้อเกินหนึ่งหน้า", ownedTerms);
	for (let index = 0; index <= 2 * PAGE_SIZE; index += 1) {
		const kind = index === 0 ? `ข่าว${word} ${oneResultWord}` : `ข่าว${word}`;
		const item = await createSyntheticDraft(admin, "news", kind, `pager-${index}`, {
			taxonomies: {
				topic: [
					threePages.slug,
					...(index < PAGE_SIZE ? [fullPage.slug] : []),
					...(index <= PAGE_SIZE ? [onePastFull.slug] : []),
				],
			},
		});
		await publishEntryAt(admin, "news", item.id);
		news.push(item);
	}
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

// Both sides of the 640 px edge, the representative phone, and the wider layouts' own widths.
for (const width of [320, 375, 639, 640, 768, 1023, 1024, 1440]) {
	test(`at ${width} px a filtered list goes through its first, middle and last pages`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 });
		const first = listPath(threePages);
		const middle = listPath(threePages, 2);
		const last = listPath(threePages, 3);
		const states: Array<{ url: string; shows: number; state: PagerState }> = [
			{ url: first, shows: PAGE_SIZE, state: { number: 1, next: middle } },
			{ url: middle, shows: PAGE_SIZE, state: { number: 2, previous: first, next: last } },
			{ url: last, shows: 1, state: { number: 3, previous: middle } },
		];

		await page.goto(first);
		const layouts: PagerLayouts = [];
		const listed: string[] = [];
		for (const [index, { url, shows, state }] of states.entries()) {
			if (index > 0) await pager(page).getByRole("link", { name: NEXT }).click();
			await expect(page).toHaveURL(url);
			await expectPager(page, state);
			const titles = ownTitles(await listedTitles(page), news);
			expect(titles, `page ${state.number} shows its own News`).toHaveLength(shows);
			listed.push(...titles);
			layouts.push([`page ${state.number}`, await measurePager(page)]);
		}
		expect(listed, "the pages continue the newest-first order").toEqual(
			news.toReversed().map((item) => item.title),
		);
		for (const { url, state } of states.toReversed().slice(1)) {
			await pager(page).getByRole("link", { name: PREVIOUS }).click();
			await expect(page).toHaveURL(url);
			await expectPager(page, state);
		}

		expectLayouts(width, layouts);
	});
}

for (const width of [320, 1440]) {
	test(`at ${width} px exactly one full page has no pager, and one News more brings it`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto(listPath(fullPage));
		expect(ownTitles(await listedTitles(page), news), "a full page of News").toHaveLength(
			PAGE_SIZE,
		);
		await expect(pager(page)).toHaveCount(0);

		await page.goto(listPath(onePastFull));
		await expectPager(page, { number: 1, next: listPath(onePastFull, 2) });
		await pager(page).getByRole("link", { name: NEXT }).click();
		await expect(page).toHaveURL(listPath(onePastFull, 2));
		await expectPager(page, { number: 2, previous: listPath(onePastFull) });
		expect(ownTitles(await listedTitles(page), news), "the one News left").toHaveLength(1);
	});
}

for (const width of [320, 640]) {
	test(`at ${width} px search results keep their query and group through the pager`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 });
		const layouts: PagerLayouts = [];
		const queries: Array<Record<string, string>> = [{ q: word }, { q: word, group: "news" }];
		for (const query of queries) {
			const first = searchPath(query);
			const second = searchPath({ ...query, page: "2" });
			await page.goto(first);
			await expectPager(page, { number: 1, next: second });
			layouts.push([`${first} page 1`, await measurePager(page)]);
			const firstTitles = ownTitles(await listedTitles(page), news);
			expect(firstTitles, "a full page of results").toHaveLength(SEARCH_PAGE_SIZE);

			await pager(page).getByRole("link", { name: NEXT }).click();
			await expect(page).toHaveURL(second);
			await expectPager(page, { number: 2, previous: first });
			layouts.push([`${first} page 2`, await measurePager(page)]);
			const listed = [...firstTitles, ...ownTitles(await listedTitles(page), news)];
			expect(listed.toSorted(), "the two pages hold every result once").toEqual(
				news.map((item) => item.title).toSorted(),
			);

			await pager(page).getByRole("link", { name: PREVIOUS }).click();
			await expect(page).toHaveURL(first);
		}

		await page.goto(searchPath({ q: oneResultWord }));
		expect(ownTitles(await listedTitles(page), news), "the one result").toHaveLength(1);
		await expect(pager(page)).toHaveCount(0);

		expectLayouts(width, layouts);
	});
}

for (const width of [320, 375, 639, 640, 1440]) {
	test(`paged lists and search stay accessible and keep visible focus and reflow at ${width} px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 });
		for (const path of [
			listPath(threePages),
			listPath(threePages, 2),
			listPath(threePages, 3),
			searchPath({ q: word, page: "2" }),
		]) {
			await page.goto(path);
			await expectNoAxeViolations(page, `${path} at ${width} px`);
			await expectVisibleFocusOnEveryStop(page, `${path} at ${width} px`);
			await expectNoHorizontalScroll(page, `${path} at ${width} px`);
		}
	});
}

test("on a phone the keyboard goes from Previous to Next, and Enter follows the link", async ({
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 900 });
	await page.goto(listPath(threePages, 2));
	await pager(page).getByRole("link", { name: PREVIOUS }).focus();
	await page.keyboard.press("Tab");
	await expect(pager(page).getByRole("link", { name: NEXT })).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(listPath(threePages, 3));
});

test.describe("without client JavaScript", () => {
	test.use({ javaScriptEnabled: false });
	for (const width of [320, 640]) {
		test(`at ${width} px Enter follows the pager on a filtered list and on search results`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 900 });
			const layouts: PagerLayouts = [];
			for (const [first, second] of [
				[listPath(threePages), listPath(threePages, 2)],
				[searchPath({ q: word, group: "news" }), searchPath({ q: word, group: "news", page: "2" })],
			]) {
				await page.goto(first);
				layouts.push([first, await measurePager(page)]);
				await pressPagerLink(page, NEXT);
				await expect(page).toHaveURL(second);
				layouts.push([second, await measurePager(page)]);
				await pressPagerLink(page, PREVIOUS);
				await expect(page).toHaveURL(first);
			}
			expectLayouts(width, layouts);
		});
	}
});

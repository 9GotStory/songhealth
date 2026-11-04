// Thai titles keep compound words whole (Feature 006 #145; spec #144 "Shared: Thai titles keep
// compound words whole" and "Testing Decisions", Seam A).
//
// Titles keep whole the words of a curated list that the browser's Thai line breaking splits, such
// as "เบา|หวาน" and "อำเภอ|สอง" (src/lib/thai-title.ts says where that was seen), so a citizen
// reads them as written: a card's title never puts part of such a word on one line and the rest on
// the next, at any width, and on a 375 px phone the header's site title keeps "อำเภอสอง" on one
// line. A kept word cannot break, so even the longest listed word, "ความดันโลหิตสูง" (15
// characters), stays inside the narrowest card (spec #144: "a kept run fits the narrowest card
// column"): where the card keeps its column's width, the word stays within the card's padding, and
// where the column would widen to fit the word, the page would scroll sideways, so neither may
// happen. A title still shows its characters as written.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness. Its fixture is a synthetic Health Content item made through the native API and removed
// afterwards. Published last, it leads the Homepage's Health Information, whose cards are the
// narrowest the site shows, four to a row on a desktop. The card test sweeps the viewport from 320
// to 1440 px rather than trying one width, so it meets the widths at which a line would end inside
// a word, whatever the card's padding and type size.

import type { Locator, Page } from "@playwright/test";

import {
	createSyntheticEntry,
	devAdminActor,
	nativeRefusalOf,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	type CmsActor,
} from "./cms.helpers";
import { HOMEPAGE_HEADINGS, expect, homepageSection, siteTitleParts, test } from "./public.helpers";

/**
 * The listed words the card test checks, which the fixture's title holds: the two the ticket names,
 * and the longest listed word (#145 retro).
 */
const CHECKED_WORDS = ["เบาหวาน", "อำเภอสอง", "ความดันโลหิตสูง"];

let admin: CmsActor;
/** The fixture's title: the checked words, and characters that the page must escape. */
let fixtureTitle: string;

/** The fixture's card title in the Homepage's Health Information. */
const fixtureCardTitle = (page: Page) =>
	homepageSection(page, HOMEPAGE_HEADINGS.health).getByRole("heading", { name: fixtureTitle });

/**
 * How the occurrences of `word` in `element`'s text lie as the page is laid out now: how many
 * there are, how many of them span more than one line, and how many run out of the content box of
 * the card around the element, when it sits in one.
 */
function occurrencesOf(
	element: Locator,
	word: string,
): Promise<{ found: number; split: number; outside: number }> {
	return element.evaluate((root, word) => {
		const texts: Text[] = [];
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node as Text);
		/** The text node and offset of `index` in the element's text, a start or an end. */
		const position = (index: number, end: boolean): [Text, number] => {
			for (const text of texts) {
				if (end ? index <= text.length : index < text.length) return [text, index];
				index -= text.length;
			}
			throw new Error(`no text at ${index}`);
		};
		const whole = texts.map((text) => text.data).join("");
		const card = root.closest("article");
		const box = card && card.getBoundingClientRect();
		const style = card && getComputedStyle(card);
		const left = box && style ? box.left + parseFloat(style.paddingLeft) : -Infinity;
		const right = box && style ? box.right - parseFloat(style.paddingRight) : Infinity;
		let found = 0;
		let split = 0;
		let outside = 0;
		for (let from = whole.indexOf(word); from !== -1; from = whole.indexOf(word, from + 1)) {
			const range = document.createRange();
			range.setStart(...position(from, false));
			range.setEnd(...position(from + word.length, true));
			const rects = [...range.getClientRects()];
			const tops = rects.map((rect) => rect.top);
			found += 1;
			if (Math.max(...tops) - Math.min(...tops) > 4) split += 1;
			if (rects.some((rect) => rect.left < left - 0.5 || rect.right > right + 0.5)) outside += 1;
		}
		return { found, split, outside };
	}, word);
}

test.beforeAll(async () => {
	admin = await devAdminActor();
	const slug = syntheticSlug("thai-title");
	fixtureTitle = `${SYNTHETIC_FIXTURE_MARK} ความรู้สุขภาพ ตรวจคัดกรองเบาหวานและความดันโลหิตสูงให้ผู้สูงอายุทุกหลังคาเรือนในอำเภอสอง "ตรวจฟรี" & <b>ทุกวันพุธ</b> ${slug.slice(-6)}`;
	const created = await createSyntheticEntry(admin, "health_content", {
		slug,
		data: { title: fixtureTitle },
	});
	expect(created.entryId, `the fixture: ${nativeRefusalOf(created.result)}`).toBeDefined();
	await publishEntryAt(admin, "health_content", created.entryId!);
});

test.afterAll(() => removeSuiteFixtures(admin));

test("a card keeps เบาหวาน, อำเภอสอง and ความดันโลหิตสูง of its title whole and inside it, at any width from 320 to 1440 px", async ({
	page,
}) => {
	await page.goto("/");
	const title = fixtureCardTitle(page);
	await expect(title).toBeVisible();
	for (const word of CHECKED_WORDS) {
		expect((await occurrencesOf(title, word)).found, `${word} in the card's title`).toBe(1);
	}
	const splits: string[] = [];
	const overflows: string[] = [];
	for (let width = 320; width <= 1440; width += 8) {
		await page.setViewportSize({ width, height: 900 });
		for (const word of CHECKED_WORDS) {
			const { split, outside } = await occurrencesOf(title, word);
			if (split > 0) splits.push(`${word} at ${width} px`);
			if (outside > 0) overflows.push(`${word} at ${width} px`);
		}
		const sideways = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		if (sideways > 0) overflows.push(`the page scrolls sideways at ${width} px`);
	}
	expect(splits, "a kept word spans two lines").toEqual([]);
	expect(overflows, "a kept word runs out of the card or the page").toEqual([]);
});

test("a card's title shows its characters as written", async ({ page }) => {
	await page.goto("/");
	await expect(fixtureCardTitle(page)).toHaveText(fixtureTitle);
});

test("at 375 px the header's site title keeps อำเภอสอง on one line", async ({ page }) => {
	const { siteTitle } = await siteTitleParts(admin);
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto("/");
	const title = page.getByRole("banner").getByRole("link", { name: siteTitle });
	const { found, split } = await occurrencesOf(title, "อำเภอสอง");
	expect(found, `อำเภอสอง in the site title "${siteTitle}"`).toBeGreaterThan(0);
	expect(split, "อำเภอสอง spans two lines").toBe(0);
});

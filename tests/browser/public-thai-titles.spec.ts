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
// harness. Its fixtures are a synthetic Health Content item, Service and Activity made through the
// native API and removed afterwards, and each leads its Homepage section: the Health Content item
// is published last, the Activity is held in 2035, and the Service is the one item of the
// Frequently Used Services menu while its test runs. Their cards are the narrowest the site shows:
// Health Information's four to a row on a desktop, and below 640 px all three, two to a row in
// their compact form, with about 112 px for a title at 320 px (Feature 006 #146; #146 comment
// 6625101174). The card tests sweep the viewport from 320 to 1440 px rather than trying one width,
// so they meet the widths at which a line would end inside a word, whatever the card's padding and
// type size.

import type { Locator, Page } from "@playwright/test";

import {
	createSyntheticEntry,
	devAdminActor,
	nativeRefusalOf,
	pickedMenuItem,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	withHomepageMenus,
	type CmsActor,
} from "./cms.helpers";
import {
	HOMEPAGE_HEADINGS,
	PHONE_VIEWPORT,
	expect,
	homepageSection,
	siteTitleParts,
	test,
} from "./public.helpers";

/**
 * The listed words the card tests check, which the fixtures' titles hold: the two the ticket names,
 * and the longest listed word (#145 retro).
 */
const CHECKED_WORDS = ["เบาหวาน", "อำเภอสอง", "ความดันโลหิตสูง"];

/** The Homepage cards the fixtures lead, by collection: what each is called, and its section. */
const CARDS = {
	health_content: {
		name: "a Health Content card",
		kind: "ความรู้สุขภาพ",
		section: HOMEPAGE_HEADINGS.health,
	},
	services: { name: "a Service card", kind: "บริการ", section: HOMEPAGE_HEADINGS.services },
	activities: { name: "an Activity card", kind: "กิจกรรม", section: HOMEPAGE_HEADINGS.activities },
} as const;

type CardCollection = keyof typeof CARDS;

let admin: CmsActor;
/**
 * Each fixture's id and title, which holds the checked words. The Health Content item's title also
 * holds characters that the page must escape.
 */
const fixtures = {} as Record<CardCollection, { id: string; title: string }>;

/** The title of the fixture's card in its Homepage section. */
const fixtureCardTitle = (page: Page, collection: CardCollection) =>
	homepageSection(page, CARDS[collection].section).getByRole("heading", {
		name: fixtures[collection].title,
	});

/** Run `body` while the fixture's card shows on the Homepage. */
async function withCardShown(collection: CardCollection, body: () => Promise<void>) {
	if (collection !== "services") return body();
	return withHomepageMenus(
		admin,
		{ services: [pickedMenuItem("services", fixtures.services)] },
		body,
	);
}

/**
 * How the occurrences of `word` in `element`'s text lie as the page is laid out now: how many
 * there are, how many of them span more than one line, and how many run out of the content box of
 * the element that holds it, such as a card or a card's text column.
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
		const holder = root.parentElement!;
		const box = holder.getBoundingClientRect();
		const style = getComputedStyle(holder);
		const left = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
		const right = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
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
	const create = async (
		collection: CardCollection,
		data: Record<string, unknown> = {},
		ending = "",
	) => {
		const slug = syntheticSlug("thai-title");
		const title = `${SYNTHETIC_FIXTURE_MARK} ${CARDS[collection].kind} ตรวจคัดกรองเบาหวานและความดันโลหิตสูงให้ผู้สูงอายุทุกหลังคาเรือนในอำเภอสอง${ending} ${slug.slice(-6)}`;
		const created = await createSyntheticEntry(admin, collection, {
			slug,
			data: { title, ...data },
		});
		expect(
			created.entryId,
			`the ${collection} fixture: ${nativeRefusalOf(created.result)}`,
		).toBeDefined();
		await publishEntryAt(admin, collection, created.entryId!);
		fixtures[collection] = { id: created.entryId!, title };
	};
	await create("services");
	await create("activities", { activity_at: "2035-01-01T03:00:00.000Z" });
	await create("health_content", {}, ` "ตรวจฟรี" & <b>ทุกวันพุธ</b>`);
});

test.afterAll(() => removeSuiteFixtures(admin));

for (const [collection, card] of Object.entries(CARDS) as [
	CardCollection,
	(typeof CARDS)[CardCollection],
][]) {
	test(`${card.name} keeps เบาหวาน, อำเภอสอง and ความดันโลหิตสูง of its title whole and inside it, at any width from 320 to 1440 px`, async ({
		page,
	}) => {
		await withCardShown(collection, async () => {
			await page.goto("/");
			const title = fixtureCardTitle(page, collection);
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
	});
}

test("a card's title shows its characters as written", async ({ page }) => {
	await page.goto("/");
	await expect(fixtureCardTitle(page, "health_content")).toHaveText(fixtures.health_content.title);
});

test("at 375 px the header's site title keeps อำเภอสอง on one line", async ({ page }) => {
	const { siteTitle } = await siteTitleParts(admin);
	await page.setViewportSize(PHONE_VIEWPORT);
	await page.goto("/");
	const title = page.getByRole("banner").getByRole("link", { name: siteTitle });
	const { found, split } = await occurrencesOf(title, "อำเภอสอง");
	expect(found, `อำเภอสอง in the site title "${siteTitle}"`).toBeGreaterThan(0);
	expect(split, "อำเภอสอง spans two lines").toBe(0);
});

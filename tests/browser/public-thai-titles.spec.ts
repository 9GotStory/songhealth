// Thai titles keep compound words whole (Feature 006 #145; spec #144 "Shared: Thai titles keep
// compound words whole" and "Testing Decisions", Seam A), "ร้องเรียน" among them (Feature 007 #195;
// spec #190 "Thai-title word").
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
// Frequently Used Services menu while its test runs. Below 640 px the Health Content and Activity
// cards go two to a row in their compact form, with 112 px or more for a title at 320 px, and on a
// desktop Health Information's go four to a row: no card heading of theirs has less room (Feature
// 006 #146; #146 comment 6625101174). A Service card holds its name beside its icon tile and its
// arrow, with the least room where two go to a row, at 640 px (Feature 008 #242). A compact Quick
// Link label has that room too, above its arrow (Feature 007 #194), and
// public-homepage-curation.spec.ts checks the widest listed words there. The card tests sweep the
// viewport from 320 to 1440 px rather than trying one width, so they meet the widths at which a
// line would end inside a word, whatever the card's padding and type size.

import type { Page } from "@playwright/test";

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
	occurrencesOf,
	siteTitleParts,
	test,
} from "./public.helpers";

/** How many times the fixtures' titles hold "ร้องเรียน" (spec #190), one straight after another. */
const RONGRIAN_TIMES = 3;

/**
 * The listed words the card tests check and how many times the fixtures' titles hold each: the two
 * #145 names, the longest listed word (#145 retro) and "ร้องเรียน". A 112 px title has room for one
 * "ร้องเรียน" and "ร้อง" of the next, so three in a row leave a line ending inside one wherever the
 * text before them ends, unless the word is kept.
 */
const CHECKED_WORDS = [
	{ word: "เบาหวาน", times: 1 },
	{ word: "อำเภอสอง", times: 1 },
	{ word: "ความดันโลหิตสูง", times: 1 },
	{ word: "ร้องเรียน", times: RONGRIAN_TIMES },
];

/**
 * The Homepage cards the fixtures lead, by collection: what each is called, and its section. A
 * Service or Activity card is one link named by its title. The Homepage composes its Health
 * Content card itself, with no such link (docs/design/DESIGN.md §7.3).
 */
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

test.beforeAll(async () => {
	admin = await devAdminActor();
	const create = async (
		collection: CardCollection,
		data: Record<string, unknown> = {},
		ending = "",
	) => {
		const slug = syntheticSlug("thai-title");
		const title = `${SYNTHETIC_FIXTURE_MARK} ${CARDS[collection].kind} ตรวจคัดกรองเบาหวานและความดันโลหิตสูงให้ผู้สูงอายุทุกหลังคาเรือนในอำเภอสอง ${"ร้องเรียน".repeat(RONGRIAN_TIMES)}${ending} ${slug.slice(-6)}`;
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
	test(`${card.name} keeps เบาหวาน, อำเภอสอง, ความดันโลหิตสูง and ร้องเรียน of its title whole and inside it, at any width from 320 to 1440 px`, async ({
		page,
	}) => {
		await withCardShown(collection, async () => {
			await page.goto("/");
			const title = fixtureCardTitle(page, collection);
			await expect(title).toBeVisible();
			for (const { word, times } of CHECKED_WORDS) {
				expect((await occurrencesOf(title, word)).found, `${word} in the card's title`).toBe(times);
			}
			const splits: string[] = [];
			const overflows: string[] = [];
			for (let width = 320; width <= 1440; width += 8) {
				await page.setViewportSize({ width, height: 900 });
				for (const { word } of CHECKED_WORDS) {
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

test("at 320 px a compact card's title keeps every ร้องเรียน whole and inside it, and its link is named by the whole title", async ({
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 900 });
	await page.goto("/");
	const title = fixtureCardTitle(page, "activities");
	await expect(title).toBeVisible();
	await expect(
		homepageSection(page, CARDS.activities.section).getByRole("link", {
			name: fixtures.activities.title,
			exact: true,
		}),
	).toBeVisible();
	expect(await occurrencesOf(title, "ร้องเรียน")).toEqual({
		found: RONGRIAN_TIMES,
		split: 0,
		outside: 0,
	});
});

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

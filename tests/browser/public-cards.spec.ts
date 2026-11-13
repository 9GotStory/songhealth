// Shared single-destination cards (#193; spec #190, PO comment 6707205912), and the Homepage's own
// Service card, News cards and Announcement rows, which open from their whole surface as they do
// (Feature 008 #242, #244, #245). The News, Health News and Health Content lists' cards are the
// Homepage's small News card (Feature 009 #283; spec #280 "The cards"): they rise under the pointer
// with no ring, and their focus ring has a white band on both sides.
// The public HTTP/browser seam checks native activation across each card's surface, independent
// of its markup/classes. Fixtures belong to this suite; Homepage menus restore in finally.
import type { Locator, Page } from "@playwright/test";

import {
	createOwnedTerm,
	createSyntheticDraft,
	createSyntheticService,
	devAdminActor,
	publishEntryAt,
	removeSuiteFixtures,
	pickedMenuItem,
	uploadSyntheticPicture,
	withHomepageMenus,
	type CmsActor,
	type DraftFixture,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	expect,
	expectImageLoaded,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectRisesUnderPointer,
	expectVisibleFocusOnEveryStop,
	homepageSection,
	HOMEPAGE_HEADINGS,
	boxOf,
	listedItem,
	shownLines,
	shownOpacity,
	test,
	tokenColor,
} from "./public.helpers";

let admin: CmsActor;
let news: DraftFixture;
let service: DraftFixture;
let activity: DraftFixture;
let health: DraftFixture;
let announcement: DraftFixture;
const SUMMARY = "สรุปสำหรับทดสอบพื้นที่ลิงก์ โดยไม่ใช้สรุปเป็นชื่อลิงก์";
/** A title and a summary longer than a list's card shows: three lines of one, two of the other. */
const LONG_TITLE =
	"ข่าวที่มีชื่อเรื่องยาวมากเพื่อทดสอบว่าการ์ดของรายการแสดงชื่อเรื่องได้ไม่เกินสามบรรทัด ส่วนที่เหลือจะถูกตัดออกโดยไม่ทำให้การ์ดในแถวเดียวกันสูงไม่เท่ากัน และยังต่อด้วยข้อความอีกช่วงหนึ่งเพื่อให้ยาวเกินสามบรรทัดแน่นอนแม้บนจอกว้าง";
const LONG_SUMMARY =
	"สรุปที่ยาวกว่าสองบรรทัดของการ์ด เพื่อทดสอบว่าการ์ดแสดงสรุปได้ไม่เกินสองบรรทัดบนจอกว้าง และซ่อนสรุปทั้งหมดบนจอแคบ โดยข้อความส่วนนี้ต่อยาวออกไปอีกเพื่อให้เกินสองบรรทัดแน่นอน";
const longEntries: Partial<Record<"news" | "health_content", DraftFixture>> = {};
const ownedTerms: SyntheticTerm[] = [];
const extraActivities: DraftFixture[] = [];
const pictureEntries: Partial<Record<"news" | "health_content" | "activities", DraftFixture>> = {};

test.beforeAll(async () => {
	admin = await devAdminActor();
	const topic = await createOwnedTerm(admin, "topic", "หัวข้อทดสอบการ์ด", ownedTerms);
	news = await createSyntheticDraft(admin, "news", "ข่าว", "whole-card", {
		data: { summary: SUMMARY },
		taxonomies: { topic: [topic.slug] },
	});
	await publishEntryAt(admin, "news", news.id, "2035-01-01T03:00:00.000Z");
	service = await createSyntheticService(admin, "whole-card", {
		data: { summary: SUMMARY },
	});
	await publishEntryAt(admin, "services", service.id);
	activity = await createSyntheticDraft(admin, "activities", "กิจกรรม", "whole-card", {
		data: { activity_at: "2035-01-04T03:00:00.000Z", summary: SUMMARY },
	});
	await publishEntryAt(admin, "activities", activity.id);
	announcement = await createSyntheticDraft(admin, "announcements", "ประกาศ", "whole-card", {
		data: { announcement_at: "2035-01-01T03:00:00.000Z" },
	});
	await publishEntryAt(admin, "announcements", announcement.id);
	health = await createSyntheticDraft(admin, "health_content", "ความรู้สุขภาพ", "whole-card", {
		data: { summary: SUMMARY },
	});
	await publishEntryAt(admin, "health_content", health.id, "2035-01-01T03:00:00.000Z");
	const imageId = await uploadSyntheticPicture(admin, "ภาพสังเคราะห์สำหรับทดสอบการ์ด");
	for (const collection of ["news", "health_content", "activities"] as const) {
		const entry = await createSyntheticDraft(admin, collection, "ทดสอบภาพ", "whole-card-picture", {
			data: {
				summary: SUMMARY,
				featured_image: { id: imageId },
				...(collection === "activities" ? { activity_at: "2035-01-03T03:00:00.000Z" } : {}),
			},
			// A Health Topic puts the News on Health News too.
			...(collection === "activities" ? {} : { taxonomies: { topic: [topic.slug] } }),
		});
		pictureEntries[collection] = entry;
		await publishEntryAt(admin, collection, entry.id, "2034-01-01T03:00:00.000Z");
	}
	extraActivities.push(pictureEntries.activities!);
	for (const day of [2, 1]) {
		const entry = await createSyntheticDraft(admin, "activities", "กิจกรรม", `whole-card-${day}`, {
			data: { activity_at: `2035-01-0${day}T03:00:00.000Z` },
		});
		await publishEntryAt(admin, "activities", entry.id);
		extraActivities.push(entry);
	}
	for (const collection of ["news", "health_content"] as const) {
		const entry = await createSyntheticDraft(admin, collection, LONG_TITLE, "lines", {
			data: { summary: LONG_SUMMARY },
			taxonomies: { topic: [topic.slug] },
		});
		longEntries[collection] = entry;
		await publishEntryAt(admin, collection, entry.id, "2034-01-02T03:00:00.000Z");
	}
});
test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

/** Click the visible part a citizen points at, whether the link wraps it or covers it. */
async function clickCardSurface(page: Page, target: Locator) {
	await target.scrollIntoViewIfNeeded();
	const box = await target.boundingBox();
	expect(box).not.toBeNull();
	await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}

/**
 * Rest the pointer on the visible part a citizen points at, whether the link wraps it or covers it.
 */
async function pointAtCardSurface(page: Page, target: Locator) {
	await target.scrollIntoViewIfNeeded();
	const box = await boxOf(target, "the part pointed at");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

/** One title-named native target over the card's whole surface, and one keyboard stop. */
async function expectWholeCardLink(page: Page, card: Locator, title: string, level: 2 | 3) {
	const link = card.getByRole("link", { name: title, exact: true });
	const heading = card.getByRole("heading", { name: title, level, exact: true });
	await expect(card.getByRole("link")).toHaveCount(1);
	await expect(link).toHaveJSProperty("tagName", "A");
	await expect(link).toHaveAccessibleName(title);
	await expect(link.locator('a, button, input, select, textarea, [tabindex="0"]')).toHaveCount(0);
	await expect(heading).toBeVisible();
	await card.scrollIntoViewIfNeeded();
	await page.mouse.move(0, 0);
	expect(await link.boundingBox()).toEqual(await card.boundingBox());
	await link.focus();
	await page.keyboard.press("Tab");
	expect(
		await card.evaluate((el) => el.contains(document.activeElement)),
		"one stop per card",
	).toBe(false);
	await page.keyboard.press("Shift+Tab");
	await expect(link).toBeFocused();
	return link;
}

/**
 * A shared card's interaction: the whole-card link, the hover that marks it without moving it, and
 * keyboard focus around its whole visible surface.
 */
async function expectCardInteraction(page: Page, card: Locator, title: string, level: 2 | 3) {
	const link = await expectWholeCardLink(page, card, title, level);
	const heading = card.getByRole("heading", { name: title, level, exact: true });
	const green = await tokenColor(page, "brand-primary");
	await page.mouse.move(0, 0);
	const restingBox = await card.boundingBox();
	const restingShadow = await link.evaluate((el) => getComputedStyle(el).boxShadow);
	await link.hover();
	await expect(heading).toHaveCSS("color", green);
	await expect(heading).toHaveCSS("text-decoration-line", "underline");
	await expect(link).toHaveCSS("box-shadow", new RegExp(`${RegExp.escape(green)} 0px 0px 0px 2px`));
	expect(await card.boundingBox(), "hover must not move or resize a card").toEqual(restingBox);
	await page.mouse.move(0, 0);
	await expect(link).toHaveCSS("box-shadow", restingShadow);
	await link.focus();
	await expect(link).toHaveCSS("outline-width", "3px");
	await expect(link).toHaveCSS("outline-color", green);
	return link;
}

/**
 * A News, Health News or Health Content list's card (spec #280 "The cards"): the whole-card link,
 * no ring and no change to the title under the pointer, nothing that moves with reduced motion
 * preferred, and keyboard focus as the global 3 px outline with a white band on both sides (Product
 * Owner, 2026-11-13: #283 comment 6854670042).
 */
async function expectListCardInteraction(page: Page, card: Locator, title: string) {
	const link = await expectWholeCardLink(page, card, title, 2);
	const heading = card.getByRole("heading", { name: title, level: 2, exact: true });
	const surface = card.getByTestId("news-surface");
	// The link holds the keyboard's focus from the whole-card check; its band is focus's, not the
	// pointer's.
	await link.blur();
	await page.mouse.move(0, 0);
	const resting = {
		surface: await boxOf(surface, "the card's surface"),
		color: await heading.evaluate((el) => getComputedStyle(el).color),
	};
	await link.hover();
	await expect(link, "no ring under the pointer").toHaveCSS("box-shadow", "none");
	await expect(heading, "the title keeps its colour").toHaveCSS("color", resting.color);
	await expect(heading, "the title takes no underline").toHaveCSS("text-decoration-line", "none");
	expect(await boxOf(surface, "the card's surface"), "with reduced motion the card stays").toEqual(
		resting.surface,
	);
	await page.mouse.move(0, 0);
	await link.focus();
	await expect(link).toHaveCSS("outline-width", "3px");
	await expect(link).toHaveCSS("outline-color", await tokenColor(page, "brand-primary"));
	await expect(link, "the white band beside the ring").toHaveCSS(
		"box-shadow",
		new RegExp(`${RegExp.escape(await tokenColor(page, "surface-base"))} 0px 0px 0px 7px`),
	);
	return link;
}

/** Every changed card surface must perform real native navigation to the complete titled page. */
async function expectCardDestination(page: Page, path: string, fixture: DraftFixture) {
	await expect(page).toHaveURL(path);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(fixture.title);
	await expect(
		page.getByRole("navigation", { name: "เส้นทางนำทาง" }).locator('[aria-current="page"]'),
	).toHaveText(fixture.title);
	await expect(
		page
			.getByRole("navigation", { name: "เส้นทางนำทาง" })
			.getByRole("link", { name: "หน้าแรก", exact: true }),
	).toHaveAttribute("href", "/");
}

/**
 * The lists whose cards open from their whole surface. A News list's small card (`news`) is a row
 * below 640 px with a 4:3 picture and shows no summary there; its picture is 16:9 from 640 px. The
 * suite's newest News and Health Content, `news` and `health`, are each list's large card (Feature
 * 009 #284), so a small card's case reads the pictured item after them, and its visual is its
 * picture.
 */
const listCases = [
	{
		name: "News",
		list: "/news",
		fixture: () => pictureEntries.news!,
		visual: "picture",
		news: true,
	},
	{
		name: "Health News",
		list: "/news/health",
		fixture: () => pictureEntries.news!,
		visual: "picture",
		news: true,
	},
	{
		name: "Health Content",
		list: "/health/content",
		fixture: () => pictureEntries.health_content!,
		visual: "picture",
		news: true,
	},
	{ name: "Services", list: "/services", fixture: () => service, visual: "service-icon" },
	{
		name: "Activities",
		list: "/activities",
		fixture: () => activity,
		visual: "activity-visual",
		ratio: 16 / 9,
	},
];

/** A card's picture, or the visual in its place. */
function visualOf(context: (typeof listCases)[number], card: Locator): Locator {
	return context.visual === "picture" ? card.locator("img") : card.getByTestId(context.visual);
}

/** The shape of a card's picture, or the visual in its place, at `width`. */
function ratioOf(context: (typeof listCases)[number], width: number): number | undefined {
	if (!context.news) return context.ratio;
	return width < 640 ? 4 / 3 : 16 / 9;
}

for (const width of [320, 375, 1440]) {
	for (const context of listCases) {
		test(`${context.name} whole-card links preserve navigation, hover and focus at ${width}px`, async ({
			page,
		}, testInfo) => {
			await page.setViewportSize({ width, height: 900 });
			const fixture = context.fixture();
			const path =
				context.list === "/news/health"
					? `/news/${fixture.slug}`
					: `${context.list}/${fixture.slug}`;
			await page.goto(context.list);
			const card = listedItem(page, fixture.title);
			const link = context.news
				? await expectListCardInteraction(page, card, fixture.title)
				: await expectCardInteraction(page, card, fixture.title, 2);
			await expect(card).toContainText(SUMMARY);
			const visual = visualOf(context, card);
			await expect(visual).toBeVisible();
			const ratio = ratioOf(context, width);
			if (ratio) {
				const box = await visual.boundingBox();
				expect(box!.width / box!.height).toBeCloseTo(ratio, 1);
			}
			await expectNoAxeViolations(page, `${context.name} ${width}`);
			await expectNoHorizontalScroll(page, context.name);
			await page.screenshot({
				path: testInfo.outputPath(`${context.name}-${width}.png`),
				fullPage: true,
			});
			await link.press("Enter");
			await expectCardDestination(page, path, fixture);
			for (const target of ["visual", "summary", "metadata", "padding", "title"]) {
				if (target === "metadata" && context.name === "Services") continue;
				// A News list's card shows no summary below 640 px.
				if (target === "summary" && context.news && width < 640) continue;
				await page.goto(context.list);
				if (target === "visual") await clickCardSurface(page, visual);
				else if (target === "title")
					await clickCardSurface(page, card.getByRole("heading", { level: 2 }));
				else if (target === "summary")
					await clickCardSurface(page, card.getByText(SUMMARY, { exact: true }));
				else if (target === "metadata") await clickCardSurface(page, card.locator("time"));
				else {
					const box = await card.boundingBox();
					await card.click({ position: { x: box!.width - 8, y: box!.height - 8 } });
				}
				await expectCardDestination(page, path, fixture);
			}
		});
	}
}

for (const width of [320, 375, 639, 640, 768, 1023, 1024, 1440]) {
	test(`Homepage cards open from their whole surface and keep compact content, with five Activities, at ${width}px`, async ({
		page,
	}, testInfo) => {
		// Nine cards, each opened three ways: 15 to 24 seconds on a quiet host, and past the 30 of a
		// test while the host is busy (#247: three widths failed that way in one run).
		test.setTimeout(90_000);
		await withHomepageMenus(
			admin,
			{ services: [pickedMenuItem("services", service)], featured: [] },
			async () => {
				await page.setViewportSize({ width, height: 900 });
				await page.goto("/");
				const services = homepageSection(page, HOMEPAGE_HEADINGS.services);
				const activities = homepageSection(page, HOMEPAGE_HEADINGS.activities);
				const serviceCard = services.getByRole("article").filter({ hasText: service.title });
				const activityCard = activities.getByRole("article").filter({ hasText: activity.title });
				// The Homepage's own Service card (Feature 008 #242): its hover and focus ring are in
				// public-homepage-curation.spec.ts.
				await expectWholeCardLink(page, serviceCard, service.title, 3);
				// Latest News' own cards (Feature 008 #244): the newest News, without a picture, is
				// the large card, and the pictured one after it a small card.
				const latestNews = homepageSection(page, HOMEPAGE_HEADINGS.news).getByRole("article");
				const largeNewsCard = latestNews.filter({ hasText: news.title });
				const smallNewsCard = latestNews.filter({ hasText: pictureEntries.news!.title });
				await expect(latestNews.getByRole("heading", { level: 3 }).first()).toHaveText(news.title);
				await expectWholeCardLink(page, largeNewsCard, news.title, 3);
				await expectWholeCardLink(page, smallNewsCard, pictureEntries.news!.title, 3);
				// The Current Announcements' own rows (Feature 008 #245).
				const announcementRow = homepageSection(page, HOMEPAGE_HEADINGS.announcements)
					.getByRole("article")
					.filter({ hasText: announcement.title });
				await expectWholeCardLink(page, announcementRow, announcement.title, 3);
				// Health Information's own cards (Feature 008 #246): the newest Health Content,
				// without a picture, and the pictured one after it.
				const healthCards = homepageSection(page, HOMEPAGE_HEADINGS.health).getByRole("article");
				const healthCard = healthCards.filter({ hasText: health.title });
				const pictureHealthCard = healthCards.filter({
					hasText: pictureEntries.health_content!.title,
				});
				await expectWholeCardLink(page, healthCard, health.title, 3);
				await expectWholeCardLink(page, pictureHealthCard, pictureEntries.health_content!.title, 3);
				// The Activities' own tiles (Feature 008 #247): five at every width, this suite's four
				// leading them.
				await expectWholeCardLink(page, activityCard, activity.title, 3);
				await expect(activities.getByRole("article").getByRole("link")).toHaveCount(5);
				for (const [index, item] of [activity, ...extraActivities].entries()) {
					await expect(
						activities.getByRole("heading", { level: 3 }).nth(index),
						`the Activity in place ${index + 1}`,
					).toHaveText(item.title);
				}
				if (width < 640) await expect(serviceCard.getByText(SUMMARY, { exact: true })).toBeHidden();
				else await expect(serviceCard.getByText(SUMMARY, { exact: true })).toBeVisible();
				await expect(activityCard.getByText(SUMMARY, { exact: true })).toHaveCount(0);
				if ([320, 375, 1440].includes(width)) {
					await expectNoAxeViolations(page, `Homepage ${width}`);
					await page.goto("/");
					await expectVisibleFocusOnEveryStop(page, `Homepage ${width}`);
					await page.screenshot({
						path: testInfo.outputPath(`Homepage-${width}.png`),
						fullPage: true,
					});
				}
				await expectNoHorizontalScroll(page, "Homepage cards");
				// Each card with the part of it a citizen points at: an icon, a visual's tile, a picture.
				for (const [fixture, card, part, path] of [
					[service, serviceCard, serviceCard.getByTestId("service-icon"), "/services/"],
					[
						activity,
						activityCard,
						activityCard.getByTestId("activity-visual").locator("span"),
						"/activities/",
					],
					[news, largeNewsCard, largeNewsCard.getByTestId("news-visual").locator("span"), "/news/"],
					[pictureEntries.news!, smallNewsCard, smallNewsCard.locator("img"), "/news/"],
					[announcement, announcementRow, announcementRow.locator("time"), "/announcements/"],
					[
						health,
						healthCard,
						healthCard.getByTestId("health-visual").locator("span"),
						"/health/content/",
					],
					[
						pictureEntries.health_content!,
						pictureHealthCard,
						pictureHealthCard.locator("img"),
						"/health/content/",
					],
				] as const) {
					const destination = `${path}${fixture.slug}`;
					await page.goto("/");
					await clickCardSurface(page, part);
					await expectCardDestination(page, destination, fixture);
					await page.goto("/");
					const link = card.getByRole("link", { name: fixture.title, exact: true });
					await link.focus();
					await link.press("Enter");
					await expectCardDestination(page, destination, fixture);
					await page.goto("/");
					const box = await card.boundingBox();
					await card.click({ position: { x: box!.width - 8, y: box!.height - 8 } });
					await expectCardDestination(page, destination, fixture);
				}
				await page.goto("/");
				const pictureCard = activities
					.getByRole("article")
					.filter({ hasText: extraActivities[0].title });
				await expectImageLoaded(pictureCard.locator("img"), "Homepage Activity picture");
				await clickCardSurface(page, pictureCard.locator("img"));
				await expectCardDestination(
					page,
					`/activities/${extraActivities[0].slug}`,
					extraActivities[0],
				);
			},
		);
	});
}

test("an Activity card retains its decorative loaded picture and 16:9 crop", async ({ page }) => {
	const fixture = pictureEntries.activities!;
	await page.goto("/activities");
	const card = listedItem(page, fixture.title);
	const picture = card.locator("img");
	await picture.scrollIntoViewIfNeeded();
	await expectImageLoaded(picture, "activities");
	await expect(picture).toHaveAttribute("alt", "");
	await expect(picture).toHaveCSS("object-fit", "cover");
	const box = await picture.boundingBox();
	expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
	await clickCardSurface(page, picture);
	await expectCardDestination(page, `/activities/${fixture.slug}`, fixture);
});

const newsLists = [
	{ name: "News", list: "/news", collection: "news" },
	{ name: "Health News", list: "/news/health", collection: "news" },
	{ name: "Health Content", list: "/health/content", collection: "health_content" },
] as const;

for (const width of [375, 1440]) {
	for (const { name, list, collection } of newsLists) {
		test(`a ${name} card's decorative picture covers its box at ${width === 375 ? "4:3" : "16:9"} at ${width} px; under the pointer, with motion allowed, the picture grows by 6 % and the card rises 6 px, and with reduced motion neither moves`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 900 });
			const fixture = pictureEntries[collection]!;
			const path = `${collection === "news" ? "/news" : "/health/content"}/${fixture.slug}`;
			await page.goto(list);
			const card = listedItem(page, fixture.title);
			const picture = card.locator("img");
			await picture.scrollIntoViewIfNeeded();
			await expectImageLoaded(picture, name);
			await expect(picture).toHaveAttribute("alt", "");
			await expect(picture).toHaveCSS("object-fit", "cover");
			const box = (await picture.boundingBox())!;
			expect(box.width / box.height).toBeCloseTo(width < 640 ? 4 / 3 : 16 / 9, 1);
			await pointAtCardSurface(page, picture);
			expect(await picture.boundingBox(), "with reduced motion the picture stays").toEqual(box);
			await clickCardSurface(page, picture);
			await expectCardDestination(page, path, fixture);

			await page.goto(list);
			await expectRisesUnderPointer(page, card, card.getByTestId("news-surface"));
			await expectCardDestination(page, path, fixture);
			await page.goto(list);
			await card.scrollIntoViewIfNeeded();
			const resting = await boxOf(picture, "the picture at rest");
			const heading = card.getByRole("heading", { level: 2 });
			const color = await heading.evaluate((el) => getComputedStyle(el).color);
			await pointAtCardSurface(page, picture);
			await expect
				.poll(async () => (await boxOf(picture, "the picture")).width / resting.width, {
					message: "the picture grows by 6 % under the pointer",
				})
				.toBeCloseTo(1.06, 2);
			await expect(
				card.getByRole("link"),
				"no ring under the pointer, with motion allowed",
			).toHaveCSS("box-shadow", "none");
			await expect(heading, "the title keeps its colour, with motion allowed").toHaveCSS(
				"color",
				color,
			);
		});

		test(`a ${name} card's title shows three lines at most and its summary two, at ${width} px${width < 640 ? ", where the summary does not show" : ""}`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(list);
			const card = listedItem(page, longEntries[collection]!.title);
			expect(await shownLines(card.getByRole("heading", { level: 2 })), "the title").toEqual({
				lines: 3,
				clamped: true,
			});
			const summary = card.getByText(LONG_SUMMARY, { exact: true });
			if (width < 640) await expect(summary).toBeHidden();
			else expect(await shownLines(summary), "the summary").toEqual({ lines: 2, clamped: true });
		});
	}
}

test("native modified click opens a card in a new tab", async ({ page }) => {
	for (const [list, fixture, path] of [
		["/services", service, `/services/${service.slug}`],
		["/news", news, `/news/${news.slug}`],
		["/news/health", news, `/news/${news.slug}`],
		["/health/content", health, `/health/content/${health.slug}`],
	] as const) {
		await page.goto(list);
		const link = listedItem(page, fixture.title).getByRole("link", {
			name: fixture.title,
			exact: true,
		});
		const [opened] = await Promise.all([
			page.context().waitForEvent("page"),
			link.click({ modifiers: ["ControlOrMeta"] }),
		]);
		try {
			await expectCardDestination(opened, path, fixture);
			await expect(page).toHaveURL(list);
		} finally {
			await opened.close();
		}
	}
});

test.describe("native navigation without JavaScript", () => {
	test.use({ javaScriptEnabled: false });
	test("each shared kind opens by its visual and keyboard", async ({ page }) => {
		for (const context of listCases) {
			const fixture = context.fixture();
			const path =
				context.list === "/news/health"
					? `/news/${fixture.slug}`
					: `${context.list}/${fixture.slug}`;
			await page.goto(context.list);
			const card = listedItem(page, fixture.title);
			await clickCardSurface(page, visualOf(context, card));
			await expectCardDestination(page, path, fixture);
			await page.goto(context.list);
			await card.getByRole("link", { name: fixture.title, exact: true }).press("Enter");
			await expectCardDestination(page, path, fixture);
		}
		await withHomepageMenus(
			admin,
			{ services: [pickedMenuItem("services", service)] },
			async () => {
				for (const [fixture, heading, path] of [
					[service, HOMEPAGE_HEADINGS.services, `/services/${service.slug}`],
					[activity, HOMEPAGE_HEADINGS.activities, `/activities/${activity.slug}`],
				] as const) {
					await page.goto("/");
					const card = homepageSection(page, heading)
						.getByRole("article")
						.filter({ hasText: fixture.title });
					const box = await card.boundingBox();
					await card.click({ position: { x: box!.width - 8, y: box!.height - 8 } });
					await expectCardDestination(page, path, fixture);
				}
			},
		);
	});
});

// Last in the suite: these items are newer than every other fixture, so from here on they lead the
// News lists and Health Content as the large card (Feature 009 #284; spec #280 "The cards").
test.describe("the large card", () => {
	const largeEntries: Partial<Record<"news" | "health_content", DraftFixture>> = {};

	test.beforeAll(async () => {
		const topic = await createOwnedTerm(admin, "topic", "หัวข้อการ์ดใหญ่", ownedTerms);
		const imageId = await uploadSyntheticPicture(admin, "ภาพสังเคราะห์สำหรับการ์ดใหญ่");
		for (const collection of ["news", "health_content"] as const) {
			const entry = await createSyntheticDraft(admin, collection, LONG_TITLE, "large", {
				// A focal point off the middle, which the picture's crop centres on.
				data: {
					summary: LONG_SUMMARY,
					featured_image: { id: imageId, focalX: 0.25, focalY: 0.75 },
				},
				taxonomies: { topic: [topic.slug] },
			});
			largeEntries[collection] = entry;
			await publishEntryAt(admin, collection, entry.id, "2036-01-01T03:00:00.000Z");
		}
	});

	for (const width of [375, 1440]) {
		for (const { name, list, collection } of newsLists) {
			test(`the large card of ${name} opens from its whole surface by one link named by its title, its picture covers it around its focal point, its title shows three lines at most and ${width < 640 ? "its summary does not show" : "its summary two"} at ${width} px; under the pointer, with motion allowed, the picture grows by 6 % and the card stays in its place, and with reduced motion nothing moves; its focus ring has a white band on both sides`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height: 900 });
				const fixture = largeEntries[collection]!;
				const path = `${collection === "news" ? "/news" : "/health/content"}/${fixture.slug}`;
				await page.goto(list);
				const card = listedItem(page, fixture.title);
				await expect(page.getByRole("main").getByRole("article").first()).toHaveText(
					new RegExp(RegExp.escape(fixture.title)),
				);
				await expect(card.getByTestId("news-surface"), "no small card's surface").toHaveCount(0);
				const link = await expectWholeCardLink(page, card, fixture.title, 2);
				await expect(link).toHaveCSS("outline-width", "3px");
				await expect(link, "the white band beside the ring").toHaveCSS(
					"box-shadow",
					new RegExp(`${RegExp.escape(await tokenColor(page, "surface-base"))} 0px 0px 0px 7px`),
				);
				await link.blur();

				const picture = card.locator("img");
				await expectImageLoaded(picture, name);
				await expect(picture).toHaveAttribute("alt", "");
				await expect(picture).toHaveCSS("object-fit", "cover");
				await expect(picture, "the crop around the focal point").toHaveCSS(
					"object-position",
					"25% 75%",
				);
				const place = await boxOf(card, "the large card");
				const box = await boxOf(picture, "the picture");
				expect(
					[box.x, box.y, box.width, box.height].map(Math.round),
					"the picture covers the card",
				).toEqual([place.x, place.y, place.width, place.height].map(Math.round));
				expect(await shownLines(card.getByRole("heading", { level: 2 })), "the title").toEqual({
					lines: 3,
					clamped: true,
				});
				const summary = card.getByText(LONG_SUMMARY, { exact: true });
				if (width < 640) await expect(summary).toBeHidden();
				else expect(await shownLines(summary), "the summary").toEqual({ lines: 2, clamped: true });

				await pointAtCardSurface(page, picture);
				expect(
					await boxOf(picture, "the picture"),
					"with reduced motion the picture stays",
				).toEqual(box);
				for (const part of [
					picture,
					card.locator("time"),
					card.getByRole("heading", { level: 2 }),
				]) {
					await page.goto(list);
					await clickCardSurface(page, part);
					await expectCardDestination(page, path, fixture);
				}

				await page.emulateMedia({ reducedMotion: "no-preference" });
				await page.goto(list);
				await expect.poll(() => shownOpacity(card), { message: "the card has come in" }).toBe(1);
				const resting = await boxOf(picture, "the picture at rest");
				const cardAtRest = await boxOf(card, "the card at rest");
				await pointAtCardSurface(page, picture);
				await expect
					.poll(async () => (await boxOf(picture, "the picture")).width / resting.width, {
						message: "the picture grows by 6 % under the pointer",
					})
					.toBeCloseTo(1.06, 2);
				expect(await boxOf(card, "the card under the pointer"), "the card stays").toEqual(
					cardAtRest,
				);
				await expect(link, "no ring under the pointer").toHaveCSS("box-shadow", "none");
				const clip = await boxOf(picture.locator(".."), "the picture's box");
				expect(
					[clip.width, clip.height].map(Math.round),
					"the picture grows inside its box",
				).toEqual([cardAtRest.width, cardAtRest.height].map(Math.round));
			});
		}
	}
});

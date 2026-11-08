// Shared single-destination cards (#193; spec #190, PO comment 6707205912).
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
	expectVisibleFocusOnEveryStop,
	homepageSection,
	HOMEPAGE_HEADINGS,
	listedItem,
	test,
} from "./public.helpers";

let admin: CmsActor;
let news: DraftFixture;
let service: DraftFixture;
let activity: DraftFixture;
let health: DraftFixture;
const SUMMARY = "สรุปสำหรับทดสอบพื้นที่ลิงก์ โดยไม่ใช้สรุปเป็นชื่อลิงก์";
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
});
test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

/** Click the visible part a citizen points at, whether the link wraps it or covers it. */
async function clickCardSurface(page: Page, target: Locator) {
	await target.scrollIntoViewIfNeeded();
	const box = await target.boundingBox();
	expect(box).not.toBeNull();
	await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}

/** One title-named native target, with keyboard focus around its whole visible surface. */
async function expectCardInteraction(page: Page, card: Locator, title: string, level: 2 | 3) {
	const link = card.getByRole("link", { name: title, exact: true });
	const heading = card.getByRole("heading", { name: title, level, exact: true });
	await expect(card.getByRole("link")).toHaveCount(1);
	await expect(link).toHaveJSProperty("tagName", "A");
	await expect(link).toHaveAccessibleName(title);
	await expect(link.locator('a, button, input, select, textarea, [tabindex="0"]')).toHaveCount(0);
	await expect(heading).toBeVisible();
	await card.scrollIntoViewIfNeeded();
	await page.mouse.move(0, 0);
	const restingBox = await card.boundingBox();
	const restingShadow = await link.evaluate((el) => getComputedStyle(el).boxShadow);
	const linkBox = await link.boundingBox();
	expect(linkBox).toEqual(restingBox);
	await link.hover();
	await expect(heading).toHaveCSS("color", "rgb(11, 107, 87)");
	await expect(heading).toHaveCSS("text-decoration-line", "underline");
	await expect(link).toHaveCSS("box-shadow", /rgb\(11, 107, 87\) 0px 0px 0px 2px/);
	expect(await card.boundingBox(), "hover must not move or resize a card").toEqual(restingBox);
	await page.mouse.move(0, 0);
	await expect(link).toHaveCSS("box-shadow", restingShadow);
	await link.focus();
	await page.keyboard.press("Tab");
	expect(
		await card.evaluate((el) => el.contains(document.activeElement)),
		"one stop per card",
	).toBe(false);
	await page.keyboard.press("Shift+Tab");
	await expect(link).toBeFocused();
	await expect(link).toHaveCSS("outline-width", "3px");
	await expect(link).toHaveCSS("outline-color", "rgb(11, 107, 87)");
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

const listCases = [
	{ name: "News", list: "/news", fixture: () => news, visual: "card-visual", ratio: 1.6 },
	{
		name: "Health News",
		list: "/news/health",
		fixture: () => news,
		visual: "card-visual",
		ratio: 1.6,
	},
	{
		name: "Health Content",
		list: "/health/content",
		fixture: () => health,
		visual: "card-visual",
		ratio: 1.6,
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
			const link = await expectCardInteraction(page, card, fixture.title, 2);
			await expect(card).toContainText(SUMMARY);
			const visual = card.getByTestId(context.visual);
			await expect(visual).toBeVisible();
			if (context.ratio) {
				const box = await visual.boundingBox();
				expect(box!.width / box!.height).toBeCloseTo(context.ratio, 1);
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
	test(`Homepage shared cards keep compact content and Activity visibility at ${width}px`, async ({
		page,
	}, testInfo) => {
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
				await expectCardInteraction(page, serviceCard, service.title, 3);
				await expectCardInteraction(page, activityCard, activity.title, 3);
				const visible = width < 1024 ? 4 : 3;
				await expect(activities.getByRole("article").getByRole("link")).toHaveCount(visible);
				await expect(activities.getByRole("heading", { level: 3 })).toHaveText(
					[activity, ...extraActivities].slice(0, visible).map((item) => item.title),
				);
				const fourth = activities
					.getByRole("article", { includeHidden: true })
					.filter({ hasText: extraActivities[2].title });
				if (width < 1024) await expect(fourth).toBeVisible();
				else {
					await expect(fourth).toBeHidden();
					expect(
						await fourth.getByRole("link", { includeHidden: true }).evaluate((el) => {
							(el as HTMLElement).focus();
							return el === document.activeElement;
						}),
						"hidden Activity never takes focus",
					).toBe(false);
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
				for (const [fixture, card, visual, path] of [
					[service, serviceCard, "service-icon", `/services/${service.slug}`],
					[activity, activityCard, "activity-visual", `/activities/${activity.slug}`],
				] as const) {
					await page.goto("/");
					await clickCardSurface(page, card.getByTestId(visual));
					await expectCardDestination(page, path, fixture);
					await page.goto("/");
					const link = card.getByRole("link", { name: fixture.title, exact: true });
					await link.focus();
					await link.press("Enter");
					await expectCardDestination(page, path, fixture);
					await page.goto("/");
					const box = await card.boundingBox();
					await card.click({ position: { x: box!.width - 8, y: box!.height - 8 } });
					await expectCardDestination(page, path, fixture);
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

for (const collection of ["news", "health_content", "activities"] as const) {
	test(`${collection} card retains its decorative loaded picture and crop`, async ({ page }) => {
		const fixture = pictureEntries[collection]!;
		const list = { news: "/news", health_content: "/health/content", activities: "/activities" }[
			collection
		];
		await page.goto(list);
		const card = listedItem(page, fixture.title);
		const picture = card.locator("img");
		await picture.scrollIntoViewIfNeeded();
		await expectImageLoaded(picture, collection);
		await expect(picture).toHaveAttribute("alt", "");
		await expect(picture).toHaveCSS("object-fit", "cover");
		const box = await picture.boundingBox();
		expect(box!.width / box!.height).toBeCloseTo(collection === "activities" ? 16 / 9 : 1.6, 1);
		await clickCardSurface(page, picture);
		await expectCardDestination(page, `${list}/${fixture.slug}`, fixture);
	});
}

test("native modified click opens a card in a new tab", async ({ page }) => {
	await page.goto("/services");
	const link = listedItem(page, service.title).getByRole("link", {
		name: service.title,
		exact: true,
	});
	const [opened] = await Promise.all([
		page.waitForEvent("popup"),
		link.click({ modifiers: ["ControlOrMeta"] }),
	]);
	try {
		await expectCardDestination(opened, `/services/${service.slug}`, service);
		await expect(page).toHaveURL("/services");
	} finally {
		await opened.close();
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
			await clickCardSurface(page, card.getByTestId(context.visual));
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

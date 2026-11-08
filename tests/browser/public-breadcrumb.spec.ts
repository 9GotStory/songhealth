// Phone breadcrumbs (Feature 007 #192; spec #190 "Breadcrumb below 640 px", Seam A).
// Only the current label clips below 640 px; ancestors, full text and the H1 survive.
// Synthetic Health Content exercises the deeper public hierarchy through the existing harness.

import type { Locator } from "@playwright/test";

import {
	createSyntheticDraft,
	devAdminActor,
	publishEntryAt,
	removeSuiteFixtures,
	type CmsActor,
	type DraftFixture,
} from "./cms.helpers";
import {
	HOME_CRUMB,
	SECTION_CRUMBS,
	boxOf,
	expect,
	expectBreadcrumb,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	test,
} from "./public.helpers";

const ANCESTORS = [
	HOME_CRUMB,
	SECTION_CRUMBS.health,
	["ความรู้สุขภาพ", "/health/content"],
] as const;

let admin: CmsActor;
let content: DraftFixture;
const contentPath = () => `/health/content/${content.slug}`;

/** Measure rendered text lines and clipping, independently of classes or wrapper choices. */
async function textLayout(label: Locator) {
	return label.evaluate((element) => {
		const range = document.createRange();
		range.selectNodeContents(element);
		const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
		const box = element.getBoundingClientRect();
		const style = getComputedStyle(element);
		return {
			lines: new Set(rects.map((rect) => Math.round(rect.top))).size,
			clipped: element.scrollWidth > element.clientWidth,
			ellipsis: style.textOverflow === "ellipsis",
			outside: rects.some((rect) => rect.left < box.left - 1 || rect.right > box.right + 1),
			// Thai glyphs can extend beyond the line box while remaining fully visible.
			verticallyClipped:
				style.overflowY !== "visible" && element.scrollHeight > element.clientHeight,
		};
	});
}

test.beforeAll(async () => {
	admin = await devAdminActor();
	content = await createSyntheticDraft(
		admin,
		"health_content",
		"ความรู้สุขภาพ",
		"แนวทางดูแลสุขภาพและป้องกันโรคสำหรับประชาชนทุกช่วงวัยในอำเภอสอง ".repeat(4).trim(),
	);
	await publishEntryAt(admin, "health_content", content.id);
});

test.afterAll(() => removeSuiteFixtures(admin));

// Both sides of the phone breakpoint, plus the representative phone and desktop widths (#192).
for (const width of [320, 375, 639, 640, 1440]) {
	for (const long of [true, false]) {
		test(`at ${width} px the ${long ? "long" : "short"} breadcrumb preserves its text, ancestors and full H1`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 900 });
			const title = long ? content.title : "ความรู้สุขภาพ";
			const ancestors = long ? ANCESTORS : ANCESTORS.slice(0, -1);
			const response = await page.goto(long ? contentPath() : "/health/content");
			expect(response?.status()).toBe(200);
			await page.evaluate(() => document.fonts.ready);
			await expectBreadcrumb(page, ancestors, title);
			const trail = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
			const current = trail.locator('[aria-current="page"]');
			await expect(current).toHaveCount(1);
			await expect(current).not.toHaveAttribute("href");
			const layout = await textLayout(current);
			if (long && width < 640) {
				expect(layout).toMatchObject({ lines: 1, clipped: true, ellipsis: true });
				const first = await boxOf(trail.getByRole("link").first(), "root ancestor");
				const last = await boxOf(current, "current label");
				expect(last.y, "the trail still wraps into another row").toBeGreaterThan(first.y);
			} else {
				expect(layout).toMatchObject({ clipped: false, outside: false });
				if (long) {
					expect(layout.lines, "the wider current label wraps instead of clipping").toBeGreaterThan(
						1,
					);
					expect(layout.ellipsis).toBe(false);
				} else {
					expect(layout.lines, "a fitting short label remains complete on one line").toBe(1);
				}
			}
			const bounds = await boxOf(trail, "breadcrumb");
			for (const [name] of ancestors) {
				const link = trail.getByRole("link", { name, exact: true });
				expect(await textLayout(link), `${name} remains fully shown`).toMatchObject({
					clipped: false,
					ellipsis: false,
					outside: false,
				});
				const box = await boxOf(link, name);
				expect(box.x).toBeGreaterThanOrEqual(bounds.x);
				expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
			}
			const heading = page.getByRole("heading", { level: 1 });
			await expect(heading).toHaveText(title);
			const h1 = await textLayout(heading);
			expect(h1, "the complete H1 remains inside its box").toMatchObject({
				clipped: false,
				ellipsis: false,
				outside: false,
				verticallyClipped: false,
			});
			if (long) expect(h1.lines, "the full H1 still wraps").toBeGreaterThan(1);
			await expectNoHorizontalScroll(page, `${title} at ${width} px`);
		});
	}
}

for (const width of [320, 375, 639, 640, 1440]) {
	test(`the breadcrumb pages keep accessible names and visible keyboard focus at ${width} px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 });
		for (const path of [contentPath(), "/health/content"]) {
			await page.goto(path);
			await expectNoAxeViolations(page, path);
			await expectVisibleFocusOnEveryStop(page, path);
		}
	});
}

test.describe("without client JavaScript", () => {
	test.use({ javaScriptEnabled: false });
	for (const width of [320, 640]) {
		test(`the full current text and H1 remain and each ancestor navigates with Enter at ${width} px`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 900 });
			for (const [name, href] of ANCESTORS) {
				await page.goto(contentPath());
				await expectBreadcrumb(page, ANCESTORS, content.title);
				await expect(page.getByRole("heading", { level: 1 })).toHaveText(content.title);
				const trail = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
				await page.evaluate(() => document.fonts.ready);
				expect(await textLayout(trail.locator('[aria-current="page"]'))).toMatchObject({
					clipped: width < 640,
					ellipsis: width < 640,
				});
				const ancestor = trail.getByRole("link", { name, exact: true });
				await ancestor.focus();
				await expect(ancestor).toBeFocused();
				await ancestor.press("Enter");
				await expect(page).toHaveURL(new URL(href, admin.baseUrl).href);
				await expectNoHorizontalScroll(page, href);
			}
		});
	}
});

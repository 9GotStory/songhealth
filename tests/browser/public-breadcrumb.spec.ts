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
import { HOME_CRUMB, SECTION_CRUMBS, expect, expectBreadcrumb, test } from "./public.helpers";

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
		return {
			lines: new Set(rects.map((rect) => Math.round(rect.top))).size,
			clipped: element.scrollWidth > element.clientWidth,
			ellipsis: getComputedStyle(element).textOverflow === "ellipsis",
			outside: rects.some((rect) => rect.left < box.left - 1 || rect.right > box.right + 1),
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

test("at 320 px only the long current label clips to one line with ellipsis", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 900 });
	await page.goto(contentPath());
	await page.evaluate(() => document.fonts.ready);
	await expectBreadcrumb(page, ANCESTORS, content.title);
	const current = page
		.getByRole("navigation", { name: "เส้นทางนำทาง" })
		.locator('[aria-current="page"]');
	expect(await textLayout(current)).toMatchObject({ lines: 1, clipped: true, ellipsis: true });
});

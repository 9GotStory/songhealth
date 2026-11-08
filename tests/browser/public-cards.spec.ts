// Shared single-destination cards (#193; spec #190, PO comment 6707205912).
// The public HTTP/browser seam checks native activation across each card's surface, independent
// of its markup/classes. Fixtures belong to this suite; Homepage menus restore in finally.
import {
	createSyntheticDraft,
	createSyntheticService,
	devAdminActor,
	publishEntryAt,
	removeSuiteFixtures,
	type CmsActor,
	type DraftFixture,
} from "./cms.helpers";
import { expect, listedItem, test } from "./public.helpers";

let admin: CmsActor;
let news: DraftFixture;
let service: DraftFixture;

test.beforeAll(async () => {
	admin = await devAdminActor();
	news = await createSyntheticDraft(admin, "news", "ข่าว", "whole-card", {
		data: { summary: "สรุปข่าวสำหรับทดสอบพื้นที่ลิงก์" },
	});
	await publishEntryAt(admin, "news", news.id, "2035-01-01T03:00:00.000Z");
	service = await createSyntheticService(admin, "whole-card", {
		data: { summary: "สรุปบริการสำหรับทดสอบพื้นที่ลิงก์" },
	});
	await publishEntryAt(admin, "services", service.id);
});
test.afterAll(() => removeSuiteFixtures(admin));

test("ContentCard picture and padding open its real destination", async ({ page }) => {
	await page.goto("/news");
	const card = listedItem(page, news.title);
	await card.scrollIntoViewIfNeeded();
	await card.getByTestId("card-visual").click();
	await expect(page).toHaveURL(`/news/${news.slug}`);
	await page.goto("/news");
	const box = await card.boundingBox();
	expect(box).not.toBeNull();
	await card.click({ position: { x: box!.width - 8, y: box!.height - 8 } });
	await expect(page).toHaveURL(`/news/${news.slug}`);
});

test("ServiceCard icon and padding open its real destination", async ({ page }) => {
	await page.goto("/services");
	const card = listedItem(page, service.title);
	await card.getByTestId("service-icon").click();
	await expect(page).toHaveURL(`/services/${service.slug}`);
	await page.goto("/services");
	const box = await card.boundingBox();
	expect(box).not.toBeNull();
	await card.click({ position: { x: box!.width - 8, y: box!.height - 8 } });
	await expect(page).toHaveURL(`/services/${service.slug}`);
});

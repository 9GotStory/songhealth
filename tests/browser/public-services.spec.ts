// The Service catalog (#58; spec #51 "Public reads" (Services), `03` §7 and §14, `00` §8.1).
//
// A citizen finds a Service at /services, filtered by Service Category with the filter kept in the
// address, and opens each at its canonical /services/{slug} address. The page says in plain Thai
// who actually provides the Service, then the guidance that is set: channels, eligibility, steps,
// documents to prepare, contact and location, duration, fees and notes. Its external service link
// is marked as leaving the site and opens in a new tab. The related Documents follow in staff
// order, then the Health Services that offer it by name. Drafts, unpublished and trashed Services
// never show, and their addresses answer the site 404.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Services, Documents, Health Services and `service_category`
// terms, made through the native API the way the Admin makes them and removed afterwards. The
// runtime may hold other Services (the demo dataset, the Product Owner's own), so assertions look
// only at this suite's uniquely named fixtures.
//
// Platform behaviour relied on (emdash 1.1.0):
// - A Health Service create takes `references: { offered_services: [ids] }`, which links it from
//   the Service's child-side `offering_facilities` field too (src/api/handlers/relations.ts
//   writeReferenceSelection); the child side reads back in link order, not by name
//   (src/database/repositories/relation.ts getParentsPageById).
// - A reference target resolves only while it is published (src/references/resolve.ts).

import {
	cleanupOwnedFixtures,
	createOwnedTerm,
	createPatActor,
	createSyntheticEntry,
	deleteSyntheticTerms,
	loadDevAccessToken,
	nativeRefusalOf,
	NATIVE_ROLES,
	publishEntryAt,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	type CmsActor,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	expect,
	listedItem,
	listedTitles,
	ownTitles,
	test,
} from "./public.helpers";

/** The fixed number of Services a catalog page shows. */
const PAGE_SIZE = 12;

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];

/** A synthetic Service Category term, labelled in Thai so it reads like a real one. */
const createCategory = (label: string) =>
	createOwnedTerm(admin, "service_category", label, ownedTerms);

interface EntryFixture {
	id: string;
	slug: string;
	title: string;
}

/**
 * A synthetic Service draft. `name` follows the synthetic mark in its unique title, so a name that
 * starts with ก, ข, ค orders the fixtures in Thai whatever their random endings.
 */
async function createService(
	label: string,
	fields: {
		name?: string;
		data?: Record<string, unknown>;
		taxonomies?: Record<string, string[]>;
		references?: Record<string, string[]>;
		seo?: Record<string, unknown>;
	} = {},
): Promise<EntryFixture> {
	const slug = syntheticSlug(label);
	const title = `${SYNTHETIC_FIXTURE_MARK} ${fields.name ?? "บริการ"} ${label} ${slug.slice(-6)}`;
	const created = await createSyntheticEntry(admin, "services", {
		data: { title, ...fields.data },
		slug,
		...(fields.taxonomies ? { taxonomies: fields.taxonomies } : {}),
		...(fields.references ? { references: fields.references } : {}),
		...(fields.seo ? { seo: fields.seo } : {}),
	});
	expect(created.result.ok, `service ${label}: ${nativeRefusalOf(created.result)}`).toBe(true);
	return { id: created.entryId!, slug, title };
}

/** Publish now. */
async function publish(collection: string, fixture: EntryFixture): Promise<void> {
	await publishEntryAt(admin, collection, fixture.id);
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async ({}, testInfo) => {
	const baseURL = testInfo.project.use.baseURL;
	if (baseURL === undefined) {
		throw new Error("this suite needs a configured baseURL (PLAYWRIGHT_BASE_URL)");
	}
	origin = new URL(baseURL).origin;
	admin = await createPatActor({
		baseUrl: origin,
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
});

test.afterAll(async () => {
	if (admin === undefined) return;
	const failures: string[] = [];
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	if (!report.complete) failures.push(`owned fixtures left: ${JSON.stringify(report)}`);
	failures.push(...(await deleteSyntheticTerms(admin, ownedTerms)));
	expect(failures, "the suite's synthetic fixtures must all be removed").toEqual([]);
});

test("/services lists only published Services by name, each with its summary and a link to its page", async ({
	page,
}) => {
	const summary = `${SYNTHETIC_FIXTURE_MARK} แจ้งเรื่องร้องเรียนการให้บริการของเจ้าหน้าที่`;
	const first = await createService("listed-first", { name: "ก ร้องเรียน", data: { summary } });
	const second = await createService("listed-second", { name: "ข แจ้งปัญหาสุขภาพ" });
	const draft = await createService("draft", { name: "ก ฉบับร่าง" });
	const unpublished = await createService("unpublished", { name: "ก เลิกเผยแพร่" });
	const trashed = await createService("trashed", { name: "ก ถังขยะ" });
	// Published in reverse name order: the catalog orders by name, not by publication.
	for (const fixture of [second, first, unpublished, trashed]) await publish("services", fixture);
	expect((await unpublishEntry(admin, "services", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "services", trashed.id)).ok, "trash").toBe(true);

	const response = await page.goto("/services");
	expect(response?.status(), "GET /services").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("บริการประชาชน");
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "บริการประชาชน" }),
	).toHaveAttribute("aria-current", "page");
	const breadcrumb = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
	await expect(breadcrumb.getByRole("link")).toHaveText(["หน้าแรก"]);
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("บริการประชาชน");

	expect(
		ownTitles(await listedTitles(page), [first, second, draft, unpublished, trashed]),
		"published only, by name",
	).toEqual([first.title, second.title]);

	const card = listedItem(page, first.title);
	await expect(card.getByRole("link", { name: first.title })).toHaveAttribute(
		"href",
		`/services/${first.slug}`,
	);
	await expect(card).toContainText(summary);
	await expect(card.getByTestId("service-icon"), "one uniform decorative icon").toHaveAttribute(
		"aria-hidden",
		"true",
	);

	const main = page.getByRole("main");
	await expect(
		main.getByRole("link", { name: "ค้นหาหน่วยบริการสุขภาพที่เกี่ยวข้อง" }),
		"finding a Health Service is the directory, not a Service",
	).toHaveAttribute("href", "/health-services");
	await expect(
		main.getByRole("link", { name: "คู่มือและแบบฟอร์ม" }),
		"guides and forms are Documents, not Services",
	).toHaveAttribute("href", "/documents");
});

test("the Service Category filter narrows /services, stays in the address and reproduces from a shared address", async ({
	page,
	browser,
}) => {
	const complaints = await createCategory("ร้องเรียน เสนอแนะ");
	const volunteers = await createCategory("บริการสำหรับ อสม.");
	const unused = await createCategory("หมวดที่ยังไม่มีบริการ");
	const complaint = await createService("filter-complaint", {
		name: "ก ร้องเรียนการให้บริการ",
		taxonomies: { service_category: [complaints.slug] },
	});
	const both = await createService("filter-both", {
		name: "ข ช่องทางรับเรื่อง",
		taxonomies: { service_category: [complaints.slug, volunteers.slug] },
	});
	const volunteer = await createService("filter-volunteer", {
		name: "ค ยืนยันสิทธิ อสม.",
		taxonomies: { service_category: [volunteers.slug] },
	});
	const all = [complaint, both, volunteer];
	for (const fixture of all) await publish("services", fixture);

	await page.goto("/services");
	const filters = page.getByRole("form", { name: "กรองบริการ" });
	const categoryField = filters.getByLabel("หมวดบริการ");
	const offered = (await categoryField.locator("option").allTextContents()).map((text) =>
		text.trim(),
	);
	expect(offered[0], "the first choice is no filter").toBe("ทุกหมวด");
	expect(offered).toEqual(expect.arrayContaining([complaints.label, volunteers.label]));

	await categoryField.selectOption({ label: complaints.label });
	await filters.getByRole("button", { name: "แสดงผล" }).click();
	await page.waitForLoadState();
	expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
		category: complaints.slug,
	});
	expect(ownTitles(await listedTitles(page), all), "one category").toEqual([
		complaint.title,
		both.title,
	]);
	await expect(categoryField).toHaveValue(complaints.slug);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/services?category=${complaints.slug}`,
	);

	const context = await browser.newContext();
	try {
		const other = await context.newPage();
		await other.goto(page.url());
		expect(
			ownTitles(await listedTitles(other), all),
			"the shared address reproduces the results",
		).toEqual([complaint.title, both.title]);
	} finally {
		await context.close();
	}

	await page.goto(`/services?category=${volunteers.slug}`);
	expect(ownTitles(await listedTitles(page), all), "the other category").toEqual([
		both.title,
		volunteer.title,
	]);
	await filters.getByRole("link", { name: "ล้างตัวกรอง" }).click();
	await expect(page).toHaveURL("/services");

	for (const path of [
		`/services?category=${unused.slug}`,
		`/services?category=${syntheticSlug("no-such-category")}`,
	]) {
		const response = await page.goto(path);
		expect(response?.status(), `${path} is not an error`).toBe(200);
		const main = page.getByRole("main");
		await expect(main.getByRole("article")).toHaveCount(0);
		await expect(main.getByText("ไม่พบบริการในหมวดที่เลือก")).toBeVisible();
		await expect(main.getByRole("link", { name: "ดูบริการทั้งหมด" })).toHaveAttribute(
			"href",
			"/services",
		);
	}
});

test("a filtered catalog pages through with its filter kept", async ({ page }) => {
	const category = await createCategory("หมวดแบ่งหน้า");
	const fixtures: EntryFixture[] = [];
	for (let index = 0; index <= PAGE_SIZE; index += 1) {
		fixtures.push(
			await createService(`page-${index}`, {
				name: `บริการลำดับ ${String(index).padStart(2, "0")}`,
				taxonomies: { service_category: [category.slug] },
			}),
		);
	}
	for (const fixture of fixtures) await publish("services", fixture);
	const titles = fixtures.map((fixture) => fixture.title);

	await page.goto(`/services?category=${category.slug}`);
	expect(await listedTitles(page), "the first page").toEqual(titles.slice(0, PAGE_SIZE));
	await page
		.getByRole("navigation", { name: "การแบ่งหน้า" })
		.getByRole("link", { name: "หน้าถัดไป" })
		.click();
	await expect(page).toHaveURL(`/services?category=${category.slug}&page=2`);
	expect(await listedTitles(page), "the second page").toEqual(titles.slice(PAGE_SIZE));
	await expect(page.getByRole("form", { name: "กรองบริการ" }).getByLabel("หมวดบริการ")).toHaveValue(
		category.slug,
	);
});

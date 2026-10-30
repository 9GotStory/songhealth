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
	cmsRequest,
	createOwnedTerm,
	createPatActor,
	createSyntheticDocument,
	createSyntheticHealthService,
	createSyntheticService,
	deleteSyntheticTerms,
	loadDevAccessToken,
	nativeDataOf,
	nativeRefusalOf,
	NATIVE_ROLES,
	portableTextBlock,
	publishEntryAt,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPdf,
	type CmsActor,
	type DraftFixture,
	type SyntheticPdf,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	VIEWPORTS,
	detailOf,
	expect,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectSiteNotFound,
	expectVisibleFocusOnEveryStop,
	listedItem,
	listedTitles,
	ownTitles,
	siteTitleParts,
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

/** A synthetic Service draft (cms.helpers.ts createSyntheticService). */
const createService = (label: string, fields?: Parameters<typeof createSyntheticService>[2]) =>
	createSyntheticService(admin, label, fields);

/** Publish now. */
async function publish(collection: string, fixture: DraftFixture): Promise<void> {
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
	// Thai order puts "ไก่" between "กา" and "ขา": a leading vowel sorts after its consonant.
	const first = await createService("listed-first", { name: "กา ร้องเรียน", data: { summary } });
	const middle = await createService("listed-middle", { name: "ไก่ เสนอแนะ" });
	const last = await createService("listed-last", { name: "ขา แจ้งปัญหาสุขภาพ" });
	const draft = await createService("draft", { name: "กา ฉบับร่าง" });
	const unpublished = await createService("unpublished", { name: "กา เลิกเผยแพร่" });
	const trashed = await createService("trashed", { name: "กา ถังขยะ" });
	// Published in reverse name order: the catalog orders by name, not by publication.
	for (const fixture of [last, middle, first, unpublished, trashed]) {
		await publish("services", fixture);
	}
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
		ownTitles(await listedTitles(page), [first, middle, last, draft, unpublished, trashed]),
		"published only, by name in Thai order",
	).toEqual([first.title, middle.title, last.title]);

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
	const fixtures: DraftFixture[] = [];
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

/** The wording a Service page gives each ownership type: who actually provides it (`00` §8.1). */
const OWNERSHIP_WORDING = {
	direct: "สำนักงานสาธารณสุขอำเภอสองให้บริการเอง",
	coordinated: "สำนักงานสาธารณสุขอำเภอสองรับเรื่องและประสานให้ โดยมีหน่วยงานอื่นร่วมดำเนินการ",
	related_health_service:
		"หน่วยบริการสุขภาพที่เกี่ยวข้อง เช่น โรงพยาบาลหรือ รพ.สต. เป็นผู้ให้บริการ",
	external_digital: "หน่วยงานภายนอกให้บริการทางออนไลน์ เว็บไซต์นี้แนะนำช่องทางเข้าถึงเท่านั้น",
} as const;

test("a Service page says who actually provides it, in plain Thai, for each ownership type", async ({
	page,
}) => {
	const category = await createCategory("ร้องเรียน เสนอแนะ");
	const provider = `${SYNTHETIC_FIXTURE_MARK} สำนักงานหลักประกันสุขภาพแห่งชาติ เขต 1 เชียงใหม่`;
	const fixtures = [];
	for (const type of Object.keys(OWNERSHIP_WORDING) as (keyof typeof OWNERSHIP_WORDING)[]) {
		const service = await createService(`ownership-${type.replaceAll("_", "-")}`, {
			data: {
				ownership_type: type,
				...(type === "external_digital" ? { provider_text: provider } : {}),
			},
			taxonomies: { service_category: [category.slug] },
		});
		await publish("services", service);
		fixtures.push({ type, service });
	}

	for (const { type, service } of fixtures) {
		const response = await page.goto(`/services/${service.slug}`);
		expect(response?.status(), `GET the ${type} Service`).toBe(200);
		await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(
			service.title,
		);
		await expect(detailOf(page, "ผู้ให้บริการ"), type).toHaveText(OWNERSHIP_WORDING[type]);
		await expect(
			detailOf(page, "หมวดบริการ").getByRole("link", { name: category.label }),
		).toHaveAttribute("href", `/services?category=${category.slug}`);
		if (type === "external_digital") {
			await expect(detailOf(page, "หน่วยงานผู้ให้บริการ")).toHaveText(provider);
		} else {
			await expect(page.getByRole("term").filter({ hasText: "หน่วยงานผู้ให้บริการ" })).toHaveCount(
				0,
			);
		}
	}

	const breadcrumb = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
	await expect(breadcrumb.getByRole("link")).toHaveText(["หน้าแรก", "บริการประชาชน"]);
	await expect(breadcrumb.getByRole("link", { name: "บริการประชาชน" })).toHaveAttribute(
		"href",
		"/services",
	);
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
		fixtures.at(-1)!.service.title,
	);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "บริการประชาชน" }),
	).toHaveAttribute("aria-current", "true");
});

/** The guidance headings of a Service page, in the order the page gives them. */
const GUIDANCE_HEADINGS = [
	"ช่องทางรับบริการ",
	"คุณสมบัติและเงื่อนไข",
	"ขั้นตอนการรับบริการ",
	"เอกสารที่ต้องเตรียม",
	"สถานที่และช่องทางติดต่อ",
	"ระยะเวลาดำเนินการ",
	"ค่าธรรมเนียม",
	"หมายเหตุ",
];

test("a Service page shows each guidance field that is set, in order, and leaves out the empty ones", async ({
	page,
}) => {
	const text = (name: string) => `${SYNTHETIC_FIXTURE_MARK} ${name}`;
	const full = await createService("guidance-full", {
		data: {
			summary: text("ร้องเรียนการปฏิบัติงานของเจ้าหน้าที่"),
			channels: [
				{ label: "ยื่นเรื่องด้วยตนเองที่สำนักงาน" },
				{ label: "โทรศัพท์ 054 000 000", url: "tel:054000000" },
				{ label: "ดาวน์โหลดแบบคำร้อง", url: "/documents" },
			],
			eligibility: [portableTextBlock(text("ประชาชนทั่วไปที่ได้รับผลกระทบ"))],
			steps: [
				portableTextBlock(text("กรอกแบบคำร้อง")),
				portableTextBlock(text("ยื่นต่อเจ้าหน้าที่")),
			],
			required_documents_guidance: [portableTextBlock(text("สำเนาบัตรประจำตัวประชาชน"))],
			contact_location_guidance: [portableTextBlock(text("งานบริหารทั่วไป ชั้น 1"))],
			duration: text("ภายใน 15 วันทำการ"),
			fees: text("ไม่มีค่าธรรมเนียม"),
			notes: text("เก็บข้อมูลผู้ร้องเรียนเป็นความลับ"),
		},
	});
	const minimal = await createService("guidance-minimal");
	await publish("services", full);
	await publish("services", minimal);

	await page.goto(`/services/${full.slug}`);
	const main = page.getByRole("main");
	await expect(main.getByText(text("ร้องเรียนการปฏิบัติงานของเจ้าหน้าที่"))).toBeVisible();
	await expect(main.getByRole("heading", { level: 2 })).toHaveText(GUIDANCE_HEADINGS);
	const section = (name: string) => main.getByRole("region", { name });

	const channels = section("ช่องทางรับบริการ").getByRole("listitem");
	await expect(channels).toHaveText([
		"ยื่นเรื่องด้วยตนเองที่สำนักงาน",
		"โทรศัพท์ 054 000 000",
		"ดาวน์โหลดแบบคำร้อง",
	]);
	await expect(channels.nth(0).getByRole("link"), "a channel without a link").toHaveCount(0);
	const phone = channels.nth(1).getByRole("link", { name: "โทรศัพท์ 054 000 000" });
	await expect(phone).toHaveAttribute("href", "tel:054000000");
	await expect(phone, "a telephone number opens no new tab").not.toHaveAttribute("target");
	const onSite = channels.nth(2).getByRole("link", { name: "ดาวน์โหลดแบบคำร้อง", exact: true });
	await expect(onSite).toHaveAttribute("href", "/documents");
	await expect(onSite, "a link on this site opens no new tab").not.toHaveAttribute("target");

	await expect(section("คุณสมบัติและเงื่อนไข")).toContainText(
		text("ประชาชนทั่วไปที่ได้รับผลกระทบ"),
	);
	await expect(section("ขั้นตอนการรับบริการ")).toContainText(text("กรอกแบบคำร้อง"));
	await expect(section("ขั้นตอนการรับบริการ")).toContainText(text("ยื่นต่อเจ้าหน้าที่"));
	await expect(section("เอกสารที่ต้องเตรียม")).toContainText(text("สำเนาบัตรประจำตัวประชาชน"));
	await expect(section("สถานที่และช่องทางติดต่อ")).toContainText(text("งานบริหารทั่วไป ชั้น 1"));
	await expect(section("ระยะเวลาดำเนินการ")).toContainText(text("ภายใน 15 วันทำการ"));
	await expect(section("ค่าธรรมเนียม")).toContainText(text("ไม่มีค่าธรรมเนียม"));
	await expect(section("หมายเหตุ")).toContainText(text("เก็บข้อมูลผู้ร้องเรียนเป็นความลับ"));

	await page.goto(`/services/${minimal.slug}`);
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(minimal.title);
	await expect(main.getByRole("heading", { level: 2 }), "no empty guidance").toHaveCount(0);
	await expect(main.locator("dl"), "no empty details").toHaveCount(0);
	await expect(main.getByRole("link", { name: /เว็บไซต์ภายนอก/ })).toHaveCount(0);
});

test("the external service link and a channel on another website are marked as leaving the site and open with rel=noopener", async ({
	page,
}) => {
	const service = await createService("external", {
		data: {
			ownership_type: "external_digital",
			external_url: "https://www.nhso.go.th/page/service",
			channels: [{ label: "ยื่นคำขอออนไลน์", url: "https://eservice.example.go.th/form" }],
		},
	});
	await publish("services", service);

	await page.goto(`/services/${service.slug}`);
	const main = page.getByRole("main");
	const external = main.getByRole("link", { name: /^ไปยังเว็บไซต์ของบริการ/ });
	await expect(external).toHaveAttribute("href", "https://www.nhso.go.th/page/service");
	await expect(external).toHaveAccessibleName(/เว็บไซต์ภายนอก/);
	await expect(external).toHaveAttribute("target", "_blank");
	await expect(external).toHaveAttribute("rel", "noopener");
	await expect(
		main.getByText("ลิงก์นี้พาออกจากเว็บไซต์ของสำนักงานไปยัง www.nhso.go.th"),
	).toBeVisible();

	const channel = main
		.getByRole("region", { name: "ช่องทางรับบริการ" })
		.getByRole("link", { name: /^ยื่นคำขอออนไลน์/ });
	await expect(channel).toHaveAttribute("href", "https://eservice.example.go.th/form");
	await expect(channel).toHaveAccessibleName(/เว็บไซต์ภายนอก/);
	await expect(channel).toHaveAttribute("target", "_blank");
	await expect(channel).toHaveAttribute("rel", "noopener");
});

/** A synthetic Document draft with `file`. */
const createDocument = (label: string, file: SyntheticPdf) =>
	createSyntheticDocument(admin, label, { file });

/** A synthetic Health Service draft shown by `displayName`, offering `services`. */
const createHealthService = (
	label: string,
	displayName: string,
	{ data, services }: { data?: Record<string, unknown>; services?: string[] } = {},
) =>
	createSyntheticHealthService(admin, label, {
		displayName,
		data,
		...(services ? { references: { offered_services: services } } : {}),
	});

test("a Service page links its related Documents in staff order and the Health Services that offer it by name, leaving out drafts, unpublished and trashed ones", async ({
	page,
}) => {
	const file = await uploadSyntheticPdf(admin);
	const firstDocument = await createDocument("related-first", file);
	const secondDocument = await createDocument("related-second", file);
	const draftDocument = await createDocument("related-draft", file);
	const unpublishedDocument = await createDocument("related-unpublished", file);
	const trashedDocument = await createDocument("related-trashed", file);
	for (const document of [firstDocument, secondDocument, unpublishedDocument, trashedDocument]) {
		await publish("documents", document);
	}
	// Staff attach the second Document before the first: the page keeps that order.
	const service = await createService("related", {
		references: {
			documents: [
				secondDocument.id,
				draftDocument.id,
				unpublishedDocument.id,
				trashedDocument.id,
				firstDocument.id,
			],
		},
	});
	await publish("services", service);
	// "ข" links first and "ก" second: the page orders the offering side by name instead.
	const later = await createHealthService("offer-later", "ข รพ.สต.บ้านใต้", {
		data: { operational_status: "temporarily_closed" },
		services: [service.id],
	});
	const sooner = await createHealthService("offer-sooner", "ก โรงพยาบาลสอง", {
		services: [service.id],
	});
	const hidden = await createHealthService("offer-draft", "ก ฉบับร่าง", { services: [service.id] });
	const unpublishedOffer = await createHealthService("offer-unpublished", "ก เลิกเผยแพร่", {
		services: [service.id],
	});
	const trashedOffer = await createHealthService("offer-trashed", "ก ถังขยะ", {
		services: [service.id],
	});
	for (const healthService of [later, sooner, unpublishedOffer, trashedOffer]) {
		await publish("health_services", healthService);
	}
	for (const [collection, fixture] of [
		["documents", unpublishedDocument],
		["health_services", unpublishedOffer],
	] as const) {
		expect((await unpublishEntry(admin, collection, fixture.id)).ok, "unpublish").toBe(true);
	}
	for (const [collection, fixture] of [
		["documents", trashedDocument],
		["health_services", trashedOffer],
	] as const) {
		expect((await trashEntry(admin, collection, fixture.id)).ok, "trash").toBe(true);
	}

	await page.goto(`/services/${service.slug}`);
	const main = page.getByRole("main");
	const documents = main.getByRole("region", { name: "เอกสารที่เกี่ยวข้อง" });
	await expect(documents.getByRole("heading", { level: 3 })).toHaveText([
		secondDocument.title,
		firstDocument.title,
	]);
	await expect(documents.getByRole("link", { name: firstDocument.title })).toHaveAttribute(
		"href",
		`/documents/${firstDocument.slug}`,
	);
	for (const hidden of [draftDocument, unpublishedDocument, trashedDocument]) {
		await expect(documents.getByText(hidden.title), "an unavailable Document").toHaveCount(0);
	}

	const offering = main.getByRole("region", { name: "หน่วยบริการสุขภาพที่ให้บริการนี้" });
	await expect(offering.getByRole("heading", { level: 3 })).toHaveText([sooner.title, later.title]);
	await expect(offering.getByRole("link", { name: sooner.title })).toHaveAttribute(
		"href",
		`/health-services/${sooner.slug}`,
	);
	await expect(
		offering.getByRole("article").filter({ hasText: later.title }),
		"a temporarily closed Health Service says so in text",
	).toContainText("ปิดให้บริการชั่วคราว");
	for (const fixture of [hidden, unpublishedOffer, trashedOffer]) {
		await expect(offering.getByText(fixture.title), "an unavailable Health Service").toHaveCount(0);
	}
	expect((await page.content()).includes("ใกล้บ้าน"), 'a Service page never says "ใกล้บ้าน"').toBe(
		false,
	);
});

test("a draft, unpublished or trashed Service answers the site 404, and a signed preview renders a draft", async ({
	page,
}) => {
	const draft = await createService("hidden-draft");
	const unpublished = await createService("hidden-unpublished");
	const trashed = await createService("hidden-trashed");
	await publish("services", unpublished);
	await publish("services", trashed);
	expect((await unpublishEntry(admin, "services", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "services", trashed.id)).ok, "trash").toBe(true);
	for (const fixture of [draft, unpublished, trashed]) {
		await expectSiteNotFound(page, `/services/${fixture.slug}`, fixture.title);
	}

	const minted = await cmsRequest(
		admin,
		`/_emdash/api/content/services/${encodeURIComponent(draft.id)}/preview-url`,
		{ method: "POST", body: {} },
	);
	expect(minted.ok, nativeRefusalOf(minted)).toBe(true);
	// The signed token stays out of every message.
	const link = new URL(String(nativeDataOf(minted)?.url), origin);
	expect(link.pathname, "the preview link is the draft's canonical address").toBe(
		`/services/${draft.slug}`,
	);
	const preview = await page.goto(link.toString());
	expect(preview?.status(), "the preview renders").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(draft.title);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("the Service pages carry their title, description, absolute canonical address and OG tags, with the SEO fields first", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const meta = (selector: string) => page.locator(selector).first();
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปบริการสำหรับคำอธิบายหน้า`;
	const summarised = await createService("seo-summary", { data: { summary } });
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} ชื่อบริการสำหรับเครื่องมือค้นหา`;
	const seoDescription = `${SYNTHETIC_FIXTURE_MARK} คำอธิบายบริการจากช่อง SEO`;
	const tuned = await createService("seo-tuned", {
		data: { summary },
		seo: { title: seoTitle, description: seoDescription },
	});
	for (const fixture of [summarised, tuned]) await publish("services", fixture);

	await page.goto(`/services/${summarised.slug}`);
	await expect(page).toHaveTitle(`${summarised.title}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", summary);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/services/${summarised.slug}`,
	);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", summarised.title);
	await expect(meta('meta[name="robots"]')).toHaveCount(0);

	await page.goto(`/services/${tuned.slug}`);
	await expect(page).toHaveTitle(`${seoTitle}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", seoDescription);

	await page.goto("/services?page=1");
	await expect(page).toHaveTitle(`บริการประชาชน${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", /.+/);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/services`);
});

test.describe("accessibility and reflow", () => {
	let paths: string[];

	test.beforeAll(async () => {
		const category = await createCategory("แจ้งปัญหาสุขภาพ");
		const file = await uploadSyntheticPdf(admin);
		const document = await createDocument("a11y", file);
		await publish("documents", document);
		const detailed = await createService("a11y", {
			name: "แจ้งปัญหาผลิตภัณฑ์สุขภาพ",
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} แจ้งผลิตภัณฑ์สุขภาพที่ไม่ปลอดภัยหรือโฆษณาเกินจริง`,
				ownership_type: "coordinated",
				provider_text: `${SYNTHETIC_FIXTURE_MARK} สำนักงานสาธารณสุขจังหวัดแพร่`,
				channels: [
					{ label: "ยื่นเรื่องด้วยตนเองที่สำนักงาน" },
					{ label: "แจ้งทางออนไลน์", url: "https://www.example.go.th/report" },
				],
				steps: [portableTextBlock(`${SYNTHETIC_FIXTURE_MARK} แจ้งรายละเอียดผลิตภัณฑ์`)],
				duration: `${SYNTHETIC_FIXTURE_MARK} ภายใน 7 วันทำการ`,
				external_url: "https://www.example.go.th/service",
			},
			taxonomies: { service_category: [category.slug] },
			references: { documents: [document.id] },
		});
		await publish("services", detailed);
		const offering = await createHealthService("a11y", "รพ.สต.บ้านกลาง", {
			data: { operational_status: "temporarily_closed" },
			services: [detailed.id],
		});
		await publish("health_services", offering);
		const minimal = await createService("a11y-minimal");
		await publish("services", minimal);
		paths = [
			"/services",
			`/services?category=${category.slug}`,
			`/services?category=${syntheticSlug("no-such-category")}`,
			`/services/${detailed.slug}`,
			`/services/${minimal.slug}`,
		];
	});

	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on the Service pages at the ${width} width`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			for (const path of paths) {
				const response = await page.goto(path);
				expect(response?.status(), `GET ${path}`).toBe(200);
				await expectNoAxeViolations(page, `${path} at ${width}`);
				await expectVisibleFocusOnEveryStop(page, `${path} at ${width}`);
			}
		});
	}

	test("no Service page scrolls sideways at 320 px", async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		for (const path of paths) {
			await page.goto(path);
			await expectNoHorizontalScroll(page, path);
		}
	});
});

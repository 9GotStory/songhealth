// The Health Service Directory (#57; spec #51 "Public reads" (Health Service Directory) and
// "Maps", `03` §8).
//
// A citizen finds a related Health Service at /health-services, filtered by Area and by name with
// the filters kept in the address, and opens each at its canonical /health-services/{slug} address
// to read its names, type, affiliation, operational status, address, opening hours, public
// contact, Area and the Services it offers in staff order. A temporarily closed or inactive Health
// Service says so in text. "เปิดแผนที่" links out to a map app by the coordinates; no page embeds a
// map. Drafts, unpublished and trashed Health Services never show, and their addresses answer the
// site 404.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Health Services and Services with synthetic `area` and
// `facility_type` terms, made through the native API the way the Admin makes them and removed
// afterwards. The runtime may hold other Health Services (the demo dataset, the Product Owner's
// own), so assertions look only at this suite's uniquely named fixtures.
//
// Platform behaviour relied on (emdash 1.1.0):
// - A create takes `references: { offered_services: [ids] }` and keeps them in the order given,
//   which a reference page returns (src/references/staged.ts, src/references/resolve.ts).
// - A reference target resolves only while it is published (src/references/resolve.ts).

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createOwnedTerm,
	createSyntheticHealthService,
	createSyntheticService,
	deleteSyntheticTerms,
	devAdminActor,
	nativeDataOf,
	nativeRefusalOf,
	publishEntryAt,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	type CmsActor,
	type DraftFixture,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	MOBILE_VIEWPORT,
	SECTION_CRUMBS,
	VIEWPORTS,
	detailOf,
	expect,
	expectBreadcrumb,
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

/** The fixed number of Health Services a list page shows. */
const PAGE_SIZE = 20;

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];

/** A synthetic term of `taxonomy`, labelled in Thai so it reads like a real one. */
const createTerm = (taxonomy: string, label: string) =>
	createOwnedTerm(admin, taxonomy, label, ownedTerms);

/** A synthetic Health Service draft (cms.helpers.ts createSyntheticHealthService). */
const createHealthService = (
	label: string,
	fields?: Parameters<typeof createSyntheticHealthService>[2],
) => createSyntheticHealthService(admin, label, fields);

/** Publish now. */
async function publish(collection: string, fixture: DraftFixture): Promise<void> {
	await publishEntryAt(admin, collection, fixture.id);
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
});

test.afterAll(async () => {
	if (admin === undefined) return;
	const failures: string[] = [];
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	if (!report.complete) failures.push(`owned fixtures left: ${JSON.stringify(report)}`);
	failures.push(...(await deleteSyntheticTerms(admin, ownedTerms)));
	expect(failures, "the suite's synthetic fixtures must all be removed").toEqual([]);
});

test("/health-services lists only published Health Services by name, each with its type, Area, address and a closed status in text", async ({
	page,
}) => {
	const type = await createTerm("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล");
	const area = await createTerm("area", "ตำบลสอง");
	const address = `${SYNTHETIC_FIXTURE_MARK} 99 หมู่ 1 ตำบลสอง อำเภอสอง จังหวัดแพร่`;
	// "ก" and "ข" order the two published fixtures in Thai, whatever their random suffixes.
	const listed = await createHealthService("listed", {
		displayName: "ก รพ.สต.บ้านกลาง",
		data: { address, operational_status: "active" },
		taxonomies: { facility_type: [type.slug], area: [area.slug] },
	});
	const closed = await createHealthService("closed", {
		displayName: "ข รพ.สต.บ้านใต้",
		data: { operational_status: "temporarily_closed" },
	});
	const inactive = await createHealthService("inactive", {
		displayName: "ค สถานีอนามัยเดิม",
		data: { operational_status: "inactive" },
	});
	const draft = await createHealthService("draft");
	const unpublished = await createHealthService("unpublished");
	const trashed = await createHealthService("trashed");
	for (const fixture of [listed, closed, inactive, unpublished, trashed]) {
		await publish("health_services", fixture);
	}
	expect((await unpublishEntry(admin, "health_services", unpublished.id)).ok, "unpublish").toBe(
		true,
	);
	expect((await trashEntry(admin, "health_services", trashed.id)).ok, "trash").toBe(true);

	const response = await page.goto("/health-services");
	expect(response?.status(), "GET /health-services").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"หน่วยบริการสุขภาพที่เกี่ยวข้อง",
	);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "บริการประชาชน" }),
	).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.services],
		"หน่วยบริการสุขภาพที่เกี่ยวข้อง",
	);

	expect(
		ownTitles(await listedTitles(page), [listed, closed, inactive, draft, unpublished, trashed]),
		"published only, by the shown name",
	).toEqual([listed.title, closed.title, inactive.title]);

	const row = listedItem(page, listed.title);
	await expect(row.getByRole("link", { name: listed.title })).toHaveAttribute(
		"href",
		`/health-services/${listed.slug}`,
	);
	await expect(row).toContainText(listed.officialName);
	await expect(row).toContainText(type.label);
	await expect(row).toContainText(area.label);
	await expect(row).toContainText(address);
	await expect(row, "an open Health Service needs no status in a list").not.toContainText(
		"เปิดให้บริการ",
	);
	await expect(listedItem(page, closed.title)).toContainText("ปิดให้บริการชั่วคราว");
	await expect(listedItem(page, inactive.title)).toContainText("ไม่เปิดให้บริการแล้ว");

	const body = await page.content();
	for (const word of ["ใกล้บ้าน", "ในพื้นที่"]) {
		expect(body.includes(word), `the directory never says "${word}"`).toBe(false);
	}
});

test("the Area and name filters narrow /health-services alone and combined, and a shared filtered address reproduces the results", async ({
	page,
	browser,
}) => {
	const north = await createTerm("area", "ตำบลเหนือ");
	const south = await createTerm("area", "ตำบลใต้");
	const unused = await createTerm("area", "ตำบลที่ไม่มีหน่วยบริการ");
	const draftOnly = await createTerm("area", "ตำบลที่มีแต่ฉบับร่าง");
	// A word only this test's names contain, so a name filter selects exactly its fixtures.
	const word = `ทดสอบ${crypto.randomUUID().slice(0, 6)}`;
	const northClinic = await createHealthService("filter-north-clinic", {
		displayName: `ก รพ.สต.${word}เหนือ`,
		taxonomies: { area: [north.slug] },
	});
	const bothHospital = await createHealthService("filter-both-hospital", {
		displayName: `ข โรงพยาบาล${word}`,
		taxonomies: { area: [north.slug, south.slug] },
	});
	const southClinic = await createHealthService("filter-south-clinic", {
		displayName: `ค รพ.สต.${word}ใต้`,
		taxonomies: { area: [south.slug] },
	});
	await createHealthService("filter-draft", { taxonomies: { area: [draftOnly.slug] } });
	const all = [northClinic, bothHospital, southClinic];
	for (const fixture of all) await publish("health_services", fixture);

	await page.goto("/health-services");
	const filters = page.getByRole("form", { name: "ค้นหาหน่วยบริการ" });
	const areaField = filters.getByLabel("พื้นที่รับผิดชอบ");
	const nameField = filters.getByLabel("ชื่อหน่วยบริการ");
	const submit = async () => {
		await filters.getByRole("button", { name: "แสดงผล" }).click();
		await page.waitForLoadState();
	};
	const params = () => Object.fromEntries(new URL(page.url()).searchParams);

	const offered = (await areaField.locator("option").allTextContents()).map((text) => text.trim());
	expect(offered[0], "the first choice is no filter").toBe("ทุกพื้นที่");
	expect(offered).toEqual(expect.arrayContaining([north.label, south.label]));
	expect(offered, "an Area no Health Service uses is not offered").not.toContain(unused.label);
	expect(offered, "an Area only a draft uses is not offered").not.toContain(draftOnly.label);

	await areaField.selectOption({ label: north.label });
	await submit();
	expect(params()).toMatchObject({ area: north.slug });
	expect(ownTitles(await listedTitles(page), all), "by Area").toEqual([
		northClinic.title,
		bothHospital.title,
	]);
	await expect(areaField).toHaveValue(north.slug);

	await nameField.fill("รพ.สต.");
	await submit();
	expect(params()).toMatchObject({ area: north.slug, name: "รพ.สต." });
	expect(ownTitles(await listedTitles(page), all), "by Area and name").toEqual([northClinic.title]);
	await expect(nameField).toHaveValue("รพ.สต.");
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/health-services?${new URLSearchParams({ area: north.slug, name: "รพ.สต." })}`,
	);

	const shared = page.url();
	const context = await browser.newContext();
	try {
		const other = await context.newPage();
		await other.goto(shared);
		expect(
			ownTitles(await listedTitles(other), all),
			"the shared address reproduces the results",
		).toEqual([northClinic.title]);
	} finally {
		await context.close();
	}

	await areaField.selectOption({ label: "ทุกพื้นที่" });
	await nameField.fill(word);
	await submit();
	expect(params()).toMatchObject({ area: "", name: word });
	expect(ownTitles(await listedTitles(page), all), "by name alone").toEqual(
		all.map((fixture) => fixture.title),
	);

	// The official name counts too, in any Latin case.
	await page.goto(`/health-services?name=${encodeURIComponent("FILTER-BOTH-HOSPITAL")}`);
	expect(ownTitles(await listedTitles(page), all), "by the official name").toEqual([
		bothHospital.title,
	]);

	await page.goto(`/health-services?area=${south.slug}`);
	expect(ownTitles(await listedTitles(page), all), "by the other Area").toEqual([
		bothHospital.title,
		southClinic.title,
	]);
	await filters.getByRole("link", { name: "ล้างตัวกรอง" }).click();
	await expect(page).toHaveURL("/health-services");
});

test("an unmatched filter shows the empty state, and a filtered directory pages through with its filters kept", async ({
	page,
}) => {
	const word = `หน้า${crypto.randomUUID().slice(0, 6)}`;
	const fixtures: DraftFixture[] = [];
	for (let index = 0; index <= PAGE_SIZE; index += 1) {
		fixtures.push(
			await createHealthService(`page-${index}`, {
				displayName: `${word} ${String(index).padStart(2, "0")}`,
			}),
		);
	}
	for (const fixture of fixtures) await publish("health_services", fixture);
	const byName = fixtures.map((fixture) => fixture.title);

	await page.goto(`/health-services?name=${encodeURIComponent(word)}`);
	expect(await listedTitles(page), "the first page").toEqual(byName.slice(0, PAGE_SIZE));
	await page
		.getByRole("navigation", { name: "การแบ่งหน้า" })
		.getByRole("link", { name: "หน้าถัดไป" })
		.click();
	await expect(page).toHaveURL(`/health-services?name=${encodeURIComponent(word)}&page=2`);
	expect(await listedTitles(page), "the second page").toEqual(byName.slice(PAGE_SIZE));
	await expect(
		page.getByRole("form", { name: "ค้นหาหน่วยบริการ" }).getByLabel("ชื่อหน่วยบริการ"),
	).toHaveValue(word);

	for (const path of [
		`/health-services?area=${syntheticSlug("no-such-area")}`,
		`/health-services?name=${encodeURIComponent(`ไม่มีชื่อนี้${word}`)}`,
	]) {
		const response = await page.goto(path);
		expect(response?.status(), `${path} is not an error`).toBe(200);
		await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
		await expect(page.getByRole("main").getByText("ไม่พบหน่วยบริการตามที่ค้นหา")).toBeVisible();
		await expect(
			page.getByRole("main").getByRole("link", { name: "ดูหน่วยบริการทั้งหมด" }),
		).toHaveAttribute("href", "/health-services");
	}
});

/** A synthetic Service draft, which a Health Service can offer. */
const createService = (label: string) => createSyntheticService(admin, label);

/** The Google Maps link the page builds from these coordinates (Maps URLs, search action). */
const mapLinkOf = (latitude: number, longitude: number) =>
	`https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`;

test("a Health Service page shows its names, type, affiliation, status, address, hours, contact, Area, map link and offered Services in staff order", async ({
	page,
}) => {
	const type = await createTerm("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล");
	const area = await createTerm("area", "ตำบลบ้านกลาง");
	// Staff link "second" before "first": the page keeps that order, not the name order.
	const first = await createService("first");
	const second = await createService("second");
	const draftService = await createService("draft");
	await publish("services", first);
	await publish("services", second);
	const affiliation = `${SYNTHETIC_FIXTURE_MARK} องค์การบริหารส่วนจังหวัดแพร่`;
	const address = `${SYNTHETIC_FIXTURE_MARK} 12 หมู่ 3 ตำบลบ้านกลาง\nอำเภอสอง จังหวัดแพร่ 54120`;
	const hours = `${SYNTHETIC_FIXTURE_MARK} จันทร์–ศุกร์ 08.30–16.30 น.`;
	const contact = `${SYNTHETIC_FIXTURE_MARK} โทร 054 000 000`;
	const healthService = await createHealthService("detail", {
		displayName: "รพ.สต.บ้านกลาง",
		data: {
			facility_code: "07999",
			affiliation_text: affiliation,
			operational_status: "temporarily_closed",
			address,
			opening_hours: hours,
			public_contact: contact,
			latitude: 18.12345,
			longitude: 100.12346,
		},
		taxonomies: { facility_type: [type.slug], area: [area.slug] },
		references: { offered_services: [second.id, draftService.id, first.id] },
	});
	await publish("health_services", healthService);

	const response = await page.goto(`/health-services/${healthService.slug}`);
	expect(response?.status(), "GET the Health Service page").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(healthService.title);
	await expect(detailOf(page, "ชื่อทางการ")).toHaveText(healthService.officialName);
	await expect(detailOf(page, "รหัสหน่วยบริการ")).toHaveText("07999");
	await expect(detailOf(page, "ประเภทหน่วยบริการ")).toHaveText(type.label);
	await expect(detailOf(page, "สังกัด")).toHaveText(affiliation);
	await expect(detailOf(page, "สถานะการให้บริการ")).toHaveText("ปิดให้บริการชั่วคราว");
	await expect(detailOf(page, "ที่ตั้ง")).toContainText("12 หมู่ 3 ตำบลบ้านกลาง");
	await expect(detailOf(page, "ที่ตั้ง")).toContainText("อำเภอสอง จังหวัดแพร่ 54120");
	await expect(detailOf(page, "เวลาทำการ")).toHaveText(hours);
	await expect(detailOf(page, "ช่องทางติดต่อ")).toHaveText(contact);
	await expect(
		detailOf(page, "พื้นที่รับผิดชอบ").getByRole("link", { name: area.label }),
	).toHaveAttribute("href", `/health-services?area=${area.slug}`);

	const map = detailOf(page, "ที่ตั้ง").getByRole("link", { name: /เปิดแผนที่/ });
	await expect(map).toHaveAttribute("href", mapLinkOf(18.12345, 100.12346));
	await expect(map).toHaveAttribute("target", "_blank");
	await expect(map).toHaveAttribute("rel", "noopener");
	await expect(main.locator("iframe, embed, object"), "no map is embedded").toHaveCount(0);

	const offered = main.getByRole("region", { name: "บริการที่ให้" });
	await expect(offered.getByRole("link")).toHaveText([second.title, first.title]);
	await expect(offered.getByRole("link", { name: first.title })).toHaveAttribute(
		"href",
		`/services/${first.slug}`,
	);
	await expect(offered.getByText(draftService.title), "a draft Service is left out").toHaveCount(0);

	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.services, ["หน่วยบริการสุขภาพที่เกี่ยวข้อง", "/health-services"]],
		healthService.title,
	);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "บริการประชาชน" }),
	).toHaveAttribute("aria-current", "true");

	const body = await page.content();
	for (const word of ["ใกล้บ้าน", "ในพื้นที่"]) {
		expect(body.includes(word), `a Health Service page never says "${word}"`).toBe(false);
	}
});

test("a Health Service page leaves out what is not set, and the map link without both coordinates", async ({
	page,
}) => {
	const minimal = await createHealthService("minimal");
	const latitudeOnly = await createHealthService("latitude-only", {
		data: { address: `${SYNTHETIC_FIXTURE_MARK} ที่อยู่ไม่มีพิกัด`, latitude: 18.1 },
	});
	const inactive = await createHealthService("inactive-detail", {
		data: { operational_status: "inactive", latitude: 18.1, longitude: 100.1 },
	});
	for (const fixture of [minimal, latitudeOnly, inactive])
		await publish("health_services", fixture);

	await page.goto(`/health-services/${minimal.slug}`);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(minimal.title);
	for (const name of [
		"ชื่อทางการ",
		"รหัสหน่วยบริการ",
		"ประเภทหน่วยบริการ",
		"สังกัด",
		"สถานะการให้บริการ",
		"ที่ตั้ง",
		"เวลาทำการ",
		"ช่องทางติดต่อ",
		"พื้นที่รับผิดชอบ",
	]) {
		await expect(main.getByRole("term").filter({ hasText: name }), name).toHaveCount(0);
	}
	await expect(main.getByRole("link", { name: /เปิดแผนที่/ })).toHaveCount(0);
	await expect(main.getByRole("region", { name: "บริการที่ให้" })).toHaveCount(0);

	await page.goto(`/health-services/${latitudeOnly.slug}`);
	await expect(detailOf(page, "ที่ตั้ง")).toHaveText(`${SYNTHETIC_FIXTURE_MARK} ที่อยู่ไม่มีพิกัด`);
	await expect(main.getByRole("link", { name: /เปิดแผนที่/ })).toHaveCount(0);

	await page.goto(`/health-services/${inactive.slug}`);
	await expect(detailOf(page, "สถานะการให้บริการ")).toHaveText("ไม่เปิดให้บริการแล้ว");
	await expect(
		detailOf(page, "ที่ตั้ง").getByRole("link", { name: /เปิดแผนที่/ }),
		"coordinates alone give the map link",
	).toHaveAttribute("href", mapLinkOf(18.1, 100.1));
});

test("a draft, unpublished or trashed Health Service answers the site 404, and a signed preview renders a draft", async ({
	page,
}) => {
	const draft = await createHealthService("hidden-draft");
	const unpublished = await createHealthService("hidden-unpublished");
	const trashed = await createHealthService("hidden-trashed");
	await publish("health_services", unpublished);
	await publish("health_services", trashed);
	expect((await unpublishEntry(admin, "health_services", unpublished.id)).ok, "unpublish").toBe(
		true,
	);
	expect((await trashEntry(admin, "health_services", trashed.id)).ok, "trash").toBe(true);
	for (const fixture of [draft, unpublished, trashed]) {
		await expectSiteNotFound(page, `/health-services/${fixture.slug}`, fixture.title);
	}

	const minted = await cmsRequest(
		admin,
		`/_emdash/api/content/health_services/${encodeURIComponent(draft.id)}/preview-url`,
		{ method: "POST", body: {} },
	);
	expect(minted.ok, nativeRefusalOf(minted)).toBe(true);
	// The signed token stays out of every message.
	const link = new URL(String(nativeDataOf(minted)?.url), origin);
	expect(link.pathname, "the preview link is the draft's canonical address").toBe(
		`/health-services/${draft.slug}`,
	);
	const preview = await page.goto(link.toString());
	expect(preview?.status(), "the preview renders").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(draft.title);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("the directory pages carry their title, description, absolute canonical address and OG tags, with the SEO fields first", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const meta = (selector: string) => page.locator(selector).first();
	const plain = await createHealthService("seo-plain", { displayName: "รพ.สต.ค้นหาได้" });
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} ชื่อหน่วยบริการสำหรับเครื่องมือค้นหา`;
	const seoDescription = `${SYNTHETIC_FIXTURE_MARK} คำอธิบายหน่วยบริการจากช่อง SEO`;
	const tuned = await createHealthService("seo-tuned", {
		seo: { title: seoTitle, description: seoDescription },
	});
	await publish("health_services", plain);
	await publish("health_services", tuned);

	await page.goto(`/health-services/${plain.slug}`);
	await expect(page).toHaveTitle(`${plain.title}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute(
		"content",
		`ที่อยู่ เวลาทำการ ช่องทางติดต่อ และบริการของ ${plain.title}`,
	);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/health-services/${plain.slug}`,
	);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", plain.title);
	await expect(meta('meta[name="robots"]')).toHaveCount(0);

	await page.goto(`/health-services/${tuned.slug}`);
	await expect(page).toHaveTitle(`${seoTitle}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", seoDescription);

	await page.goto("/health-services?page=1");
	await expect(page).toHaveTitle(`หน่วยบริการสุขภาพที่เกี่ยวข้อง${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", /.+/);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/health-services`);
});

test.describe("accessibility and reflow", () => {
	let paths: string[];

	test.beforeAll(async () => {
		const type = await createTerm("facility_type", "โรงพยาบาลชุมชน");
		const area = await createTerm("area", "ตำบลสอง");
		const service = await createService("a11y");
		await publish("services", service);
		const detailed = await createHealthService("a11y", {
			displayName: "โรงพยาบาลสอง",
			data: {
				affiliation_text: `${SYNTHETIC_FIXTURE_MARK} สำนักงานปลัดกระทรวงสาธารณสุข`,
				operational_status: "temporarily_closed",
				address: `${SYNTHETIC_FIXTURE_MARK} 1 หมู่ 1 ตำบลสอง อำเภอสอง จังหวัดแพร่`,
				opening_hours: `${SYNTHETIC_FIXTURE_MARK} ทุกวัน 24 ชั่วโมง`,
				public_contact: `${SYNTHETIC_FIXTURE_MARK} โทร 054 000 001`,
				latitude: 18.48,
				longitude: 100.19,
			},
			taxonomies: { facility_type: [type.slug], area: [area.slug] },
			references: { offered_services: [service.id] },
		});
		await publish("health_services", detailed);
		const minimal = await createHealthService("a11y-minimal");
		await publish("health_services", minimal);
		paths = [
			"/health-services",
			`/health-services?area=${area.slug}&name=${encodeURIComponent("โรงพยาบาล")}`,
			`/health-services?area=${syntheticSlug("no-such-area")}`,
			`/health-services/${detailed.slug}`,
			`/health-services/${minimal.slug}`,
		];
	});

	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on the directory pages at the ${width} width`, async ({
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

	test("no directory page scrolls sideways at 320 px", async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		for (const path of paths) {
			await page.goto(path);
			await expectNoHorizontalScroll(page, path);
		}
	});
});

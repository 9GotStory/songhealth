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
	createPatActor,
	createSyntheticEntry,
	createSyntheticTerm,
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

/** The fixed number of Health Services a list page shows. */
const PAGE_SIZE = 20;

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];

/** A synthetic term of `taxonomy`, labelled in Thai so it reads like a real one. */
async function createTerm(taxonomy: string, label: string): Promise<SyntheticTerm> {
	const unique = crypto.randomUUID().slice(0, 6);
	const term = await createSyntheticTerm(
		admin,
		taxonomy,
		`${SYNTHETIC_FIXTURE_MARK} ${label} ${unique}`,
	);
	ownedTerms.push(term);
	return term;
}

interface EntryFixture {
	id: string;
	slug: string;
	/** The name the site shows: the display name when the fixture has one, else its title. */
	title: string;
}

/**
 * A synthetic Health Service draft. Its official name is unique; with `displayName`, the site
 * shows that unique display name instead.
 */
async function createHealthService(
	label: string,
	fields: {
		displayName?: string;
		data?: Record<string, unknown>;
		taxonomies?: Record<string, string[]>;
		references?: Record<string, string[]>;
		seo?: Record<string, unknown>;
	} = {},
): Promise<EntryFixture & { officialName: string }> {
	const slug = syntheticSlug(label);
	const officialName = `${SYNTHETIC_FIXTURE_MARK} หน่วยบริการ ${label} ${slug.slice(-6)}`;
	const displayName =
		fields.displayName && `${SYNTHETIC_FIXTURE_MARK} ${fields.displayName} ${slug.slice(-6)}`;
	const created = await createSyntheticEntry(admin, "health_services", {
		data: {
			title: officialName,
			...(displayName ? { display_name: displayName } : {}),
			...fields.data,
		},
		slug,
		...(fields.taxonomies ? { taxonomies: fields.taxonomies } : {}),
		...(fields.references ? { references: fields.references } : {}),
		...(fields.seo ? { seo: fields.seo } : {}),
	});
	expect(created.result.ok, `health service ${label}: ${nativeRefusalOf(created.result)}`).toBe(
		true,
	);
	return { id: created.entryId!, slug, title: displayName || officialName, officialName };
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
	const breadcrumb = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
	await expect(breadcrumb.getByRole("link")).toHaveText(["หน้าแรก"]);
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
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
	const fixtures: EntryFixture[] = [];
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

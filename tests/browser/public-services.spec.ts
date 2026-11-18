// The Service catalog (#58; spec #51 "Public reads" (Services), `03` §7 and §14, `00` §8.1).
//
// A citizen finds a Service at /services, filtered by Service Category with the filter kept in the
// address, and opens each at its canonical /services/{slug} address. The page says in plain Thai
// who actually provides the Service, then the guidance that is set: channels, eligibility, steps,
// documents to prepare, contact and location, duration, fees and notes. Its external service link
// is marked as leaving the site and opens in a new tab. The related Documents follow in staff
// order, then the Health Services that offer it by name. Drafts, unpublished and trashed Services
// never show, and their addresses answer the site 404. The filter offers only the Service
// Categories that published Services carry, in label order (spec #174 "Public list filters").
//
// /services opens on the deep field (Feature 011 #339; spec #338 "Decisions", 5, 6 and 15): its
// breadcrumb, the label บริการ, the H1 บริการประชาชน, its lead and its two related links under the
// lead, then over the field's lower edge its filter form, its cards and its pager
// (public.helpers.ts testListOnField). A Service's page opens on the field too (#344; spec #338
// "The three pages", decisions 3, 8 and 10): its breadcrumb, a pill for each Service Category,
// its H1 and its summary, then over the field's edge one card with its details and its external
// link, then on the page's colour its guidance, "เอกสารที่เกี่ยวข้อง" with each Document's download
// and "หน่วยบริการสุขภาพที่ให้บริการนี้" as the directory's rows, still by name (Product Owner, #344
// comment 6979384685).
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
// - A term made through the API takes the position after the last, and EmDash lists terms by
//   position (src/database/repositories/taxonomy.ts nextSortOrder, src/taxonomies/index.ts
//   loadTaxonomyTerms), so this suite's categories come back in the order it makes them.

import type { Locator } from "@playwright/test";
import {
	createOwnedTerm,
	createSyntheticDocument,
	createSyntheticHealthService,
	createSyntheticService,
	devAdminActor,
	portableTextBlock,
	publishEntryAt,
	removeSuiteFixtures,
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
	HEADER_WIDEST,
	HOME_CRUMB,
	LIST_END,
	MOBILE_VIEWPORT,
	SECTION_CRUMBS,
	PHONE_VIEWPORT,
	boxOf,
	cardList,
	cardOverFieldEdge,
	cardOverFieldEdgeAsSpecified,
	deepField,
	detailOf,
	entersAfter,
	expect,
	expectBreadcrumb,
	expectFilteredEmpty,
	expectPostTitleSizes,
	expectPreviewRenders,
	expectSecondLinkPlaces,
	expectServiceIcon,
	expectSiteNotFound,
	fieldEdge,
	fieldParts,
	gutterAt,
	heldBack,
	itemsPerRow,
	leadLinksOf,
	listedItem,
	listedTitles,
	offeredLabels,
	ownTitles,
	pillStyle,
	shownLines,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testListOnField,
	tokenColor,
	whileNonePublished,
	shownWhole,
} from "./public.helpers";

/** The fixed number of Services a catalog page shows. */
const PAGE_SIZE = 12;

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];

/** The lead of /services, under its heading. */
const SERVICES_LEAD =
	"บริการที่สำนักงานสาธารณสุขอำเภอสองให้บริการเอง ประสานให้ หรือแนะนำช่องทาง พร้อมผู้ให้บริการ ช่องทาง ขั้นตอน และเอกสารที่ต้องเตรียมก่อนไปรับบริการ";

/** /services' two related links under its lead, in order (spec #338 "The Service catalog"). */
const SERVICES_LEAD_LINKS = [
	["ค้นหาหน่วยบริการสุขภาพที่เกี่ยวข้อง", "/health-services"],
	["คู่มือและแบบฟอร์ม", "/documents"],
] as const;

/** What /services shows when its Service Category matches nothing. */
const FILTERED_EMPTY = {
	message: "ไม่พบบริการในหมวดที่เลือก",
	back: { label: "ดูบริการทั้งหมด", href: "/services" },
};

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

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

// First in the suite, while the runtime holds only its own Services. The catalog orders by name,
// so these Services are named with ฮ, the last Thai consonant, and follow every other test's.
testListOnField({
	path: "/services",
	crumbs: [HOME_CRUMB],
	heading: { label: "บริการ", title: "บริการประชาชน", lead: SERVICES_LEAD },
	icon: "users",
	leadLinks: SERVICES_LEAD_LINKS,
	collection: "services",
	pageSize: PAGE_SIZE,
	noneYet: "ยังไม่มีข้อมูลบริการ",
	pastLast: "ไม่พบบริการในหน้านี้",
	form: {
		name: "กรองบริการ",
		unmatched: `category=${syntheticSlug("no-such-category")}`,
		empty: FILTERED_EMPTY,
	},
	admin: () => admin,
	publishItem: async (label) => {
		const service = await createService(label, { name: "ฮ บริการ" });
		await publishEntryAt(admin, "services", service.id, LIST_END);
		return service;
	},
	itemsMove: "cards",
});

/** The demo dataset's longest Service name (scripts/demo-dataset/content.ts), without its mark. */
const LONGEST_SERVICE_NAME = "ร้องเรียนการปฏิบัติงานหรือการให้บริการ";

/** A summary longer than the three lines a card shows of it, at every width. */
const LONG_SUMMARY = `${SYNTHETIC_FIXTURE_MARK} ${"สรุปบริการที่ยาวกว่าสามบรรทัดของการ์ด เพื่อทดสอบว่าการ์ดตัดสรุปไว้ที่สามบรรทัด ".repeat(6)}`;

test("the catalog's card is the Homepage's: white, radius 22, 144 px high or more from 640 px, the Service's name an H2 at 18 / 30 semibold, the summary at 14 / 22 in text-secondary-on-soft, three lines at most from 640 px and hidden below, the 20 px arrow-right and the surface-soft circle in its lower right corner; below 640 px the icon, the name and the arrow sit centred on one line, with the demo dataset's longest Service name, on both sides of 640 px and down to 320 px", async ({
	page,
}) => {
	const service = await createService("card-parts", {
		name: `กา ${LONGEST_SERVICE_NAME}`,
		data: { summary: LONG_SUMMARY },
	});
	await publish("services", service);
	await page.goto("/services");
	const card = listedItem(page, service.title);
	const seen: Record<number, unknown> = {};
	const expected: Record<number, unknown> = {};
	for (const width of [1440, 768, 640, 639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		await card.scrollIntoViewIfNeeded();
		await page.mouse.move(0, 0);
		const phone = width < 640;
		// Read in the page, so a part today's card lacks reads as missing rather than stopping here.
		seen[width] = await card.evaluate((article, phone) => {
			const style = (element: Element) => getComputedStyle(element);
			const centre = (element: Element | null) => {
				if (!element) return undefined;
				const box = element.getBoundingClientRect();
				return box.y + box.height / 2;
			};
			const heading = article.querySelector("h2, h3");
			const summary = [...article.querySelectorAll("p")].find((p) =>
				p.textContent?.includes("สรุปบริการที่ยาว"),
			);
			const arrow = article.querySelector("svg.lucide-arrow-right");
			const icon = article.querySelector('[data-testid="service-icon"]');
			const surface = article.querySelector('[data-testid="service-surface"]');
			const box = (surface ?? article).getBoundingClientRect();
			// 16 px in from the corner, inside the card's 22 px rounding and the circle.
			const corner = document
				.elementsFromPoint(box.right - 16, box.bottom - 16)
				.find(
					(element) =>
						article.contains(element) &&
						!/^rgba\(.*,\s*0\)$|^transparent$/.test(style(element).backgroundColor),
				);
			const shown = summary !== undefined && summary.getClientRects().length > 0;
			return {
				heading: heading && {
					level: heading.tagName,
					type: [style(heading).fontSize, style(heading).lineHeight, style(heading).fontWeight],
				},
				surface: surface && {
					fill: style(surface).backgroundColor,
					radius: style(surface).borderTopLeftRadius,
					tall: phone ? undefined : box.height >= 144,
				},
				summary: shown
					? {
							colour: style(summary).color,
							type: [style(summary).fontSize, style(summary).lineHeight],
							lines: Math.round(
								summary.getBoundingClientRect().height /
									Number.parseFloat(style(summary).lineHeight),
							),
							clamped: summary.scrollHeight > summary.clientHeight,
						}
					: "hidden",
				arrow: arrow && [arrow.getBoundingClientRect().width, arrow.getBoundingClientRect().height],
				corner: corner && style(corner).backgroundColor,
				oneLine:
					phone && icon && heading && arrow
						? [centre(heading)! - centre(icon)!, centre(arrow)! - centre(icon)!].map((gap) =>
								Math.round(Math.abs(gap)),
							)
						: undefined,
			};
		}, phone);
		expected[width] = {
			heading: { level: "H2", type: ["18px", "30px", "600"] },
			surface: {
				fill: await tokenColor(page, "surface-base"),
				radius: "22px",
				tall: phone ? undefined : true,
			},
			summary: phone
				? "hidden"
				: {
						colour: await tokenColor(page, "text-secondary-on-soft"),
						type: ["14px", "22px"],
						lines: 3,
						clamped: true,
					},
			arrow: [20, 20],
			corner: await tokenColor(page, "surface-soft"),
			// From 640 px the parts sit at the card's top, which this does not read.
			oneLine: phone ? [0, 0] : undefined,
		};
	}
	expect(seen).toEqual(expected);
});

test("/services' two related links lie under its lead on the field, 16 px under it: surface-base words, semibold, at label size and underlined, each with a 16 px arrow-right after them and 44 px high; they sit 24 px apart on one row and, where they wrap, 4 px apart one under the other, and keep their colour under the pointer", async ({
	page,
}) => {
	await page.goto("/services");
	const lead = deepField(page).getByText(SERVICES_LEAD, { exact: true });
	const links = leadLinksOf(page, { leadLinks: SERVICES_LEAD_LINKS });
	const white = await tokenColor(page, "surface-base");
	for (const [label, link] of links) {
		await expect(link, label).toHaveCSS("color", white);
		await expect(link, label).toHaveCSS("font-weight", "600");
		await expect(link, label).toHaveCSS("font-size", "14px");
		await expect(link, label).toHaveCSS("text-decoration-line", "underline");
		const box = await boxOf(link, label);
		expect(box.height, `${label} is 44 px high`).toBeCloseTo(44, 0);
		const arrow = link.locator("svg.lucide-arrow-right");
		const arrowBox = await boxOf(arrow, `${label}'s arrow`);
		expect([arrowBox.width, arrowBox.height], `${label}'s arrow is 16 px`).toEqual([16, 16]);
		const words = await link.evaluate((element) => {
			const range = document.createRange();
			range.selectNodeContents(element.firstChild!);
			return range.getBoundingClientRect().right;
		});
		expect(arrowBox.x, `${label}'s arrow follows its words`).toBeGreaterThanOrEqual(words);
		await link.hover();
		await expect(link, `${label} under the pointer`).toHaveCSS("color", white);
	}

	const [first, second] = links.map(([, link]) => link) as [typeof lead, typeof lead];
	for (const [viewport, row] of [
		[DESKTOP_VIEWPORT, "one row"],
		[MOBILE_VIEWPORT, "two rows"],
	] as const) {
		await page.setViewportSize(viewport);
		const at = `at ${viewport.width} px`;
		const leadBox = await boxOf(lead, "the lead");
		const [one, two] = [await boxOf(first, "the first link"), await boxOf(second, "the second")];
		expect(
			one.y - (leadBox.y + leadBox.height),
			`the links 16 px under the lead ${at}`,
		).toBeCloseTo(16, 0);
		expect(one.x, `the first link starts with the lead ${at}`).toBeCloseTo(leadBox.x, 0);
		if (row === "one row") {
			expect(two.y, `the links on one row ${at}`).toBeCloseTo(one.y, 0);
			expect(two.x - (one.x + one.width), `24 px apart across ${at}`).toBeCloseTo(24, 0);
		} else {
			expect(two.x, `the second link under the first ${at}`).toBeCloseTo(one.x, 0);
			expect(two.y - (one.y + one.height), `4 px apart down ${at}`).toBeCloseTo(4, 0);
		}
	}
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
	await expectBreadcrumb(page, [HOME_CRUMB], "บริการประชาชน");

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

test("a Service's card shows the icon staff chose, or the standard icon without a choice, and the Service's name still names the card", async ({
	page,
}) => {
	// Staff choose an icon by the Thai name of its picture (#248 comment 6826430670).
	const unchosen = await createService("icon-unchosen", { name: "กา" });
	const chosen = await createService("icon-chosen", { name: "กา", data: { icon: "เข็มฉีดยา" } });
	for (const fixture of [unchosen, chosen]) await publish("services", fixture);

	await page.goto("/services");
	for (const [service, icon] of [
		[unchosen, "hand-heart"],
		[chosen, "syringe"],
	] as const) {
		await expectServiceIcon(listedItem(page, service.title), icon, service.title);
	}
});

/** The numbers of Services the catalog's grid is read with (spec #338 decision 13). */
const GRID_COUNTS = [1, 2, 4, 12];

test("the catalog's cards go three to a row from 1,024 px, two from 640 px and one below, 20 px apart from 640 px and 12 px below, at one, two, four and twelve Services, with no rule for four", async ({
	page,
}) => {
	test.setTimeout(240_000);
	const published: DraftFixture[] = [];
	const seen: unknown[] = [];
	const expected: unknown[] = [];
	try {
		await whileNonePublished(admin, "services", async () => {
			const cells = cardList(page).grid.getByRole("listitem");
			for (const count of GRID_COUNTS) {
				while (published.length < count) {
					const service = await createService(`grid-${String(published.length).padStart(2, "0")}`);
					await publish("services", service);
					published.push(service);
				}
				await page.setViewportSize(DESKTOP_VIEWPORT);
				await page.goto("/services");
				await expect(cells).toHaveCount(count);
				for (const width of [1440, 1024, 1023, 768, 640, 639, 375]) {
					await page.setViewportSize({ width, height: 900 });
					const rows = await itemsPerRow(cells);
					const boxes = [];
					for (const index of [0, 1, rows[0]!]) {
						boxes.push(
							index < count ? await boxOf(cells.nth(index), `card ${index + 1}`) : undefined,
						);
					}
					const [first, second, below] = boxes;
					seen.push({
						count,
						width,
						rows,
						across: rows[0]! > 1 ? Math.round(second!.x - (first!.x + first!.width)) : undefined,
						down: below ? Math.round(below.y - (first!.y + first!.height)) : undefined,
					});
					const perRow = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
					const gap = width >= 640 ? 20 : 12;
					const rowsExpected: number[] = [];
					for (let left = count; left > 0; left -= perRow)
						rowsExpected.push(Math.min(perRow, left));
					expected.push({
						count,
						width,
						rows: rowsExpected,
						across: rowsExpected[0]! > 1 ? gap : undefined,
						down: rowsExpected.length > 1 ? gap : undefined,
					});
				}
			}
		});
	} finally {
		for (const service of published) {
			expect
				.soft((await unpublishEntry(admin, "services", service.id)).ok, service.slug)
				.toBe(true);
		}
	}
	expect(seen).toEqual(expected);
});

test("the Service Category filter offers only the categories of published Services in label order, narrows /services, stays in the address and reproduces from a shared address", async ({
	page,
	browser,
}) => {
	// Made ร before บ, so EmDash lists them in that order, and the filter must offer them by label.
	const complaints = await createCategory("ร้องเรียน เสนอแนะ");
	const volunteers = await createCategory("บริการสำหรับ อสม.");
	const unused = await createCategory("หมวดที่ยังไม่มีบริการ");
	const draftOnly = await createCategory("หมวดที่มีแต่ฉบับร่าง");
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
	await createService("filter-draft", {
		name: "ง ร่างบริการ",
		taxonomies: { service_category: [draftOnly.slug] },
	});

	await page.goto("/services");
	const filters = page.getByRole("form", { name: "กรองบริการ" });
	const categoryField = filters.getByLabel("หมวดบริการ");
	await expect(categoryField.locator("option").first(), "the first choice is no filter").toHaveText(
		"ทุกหมวด",
	);
	expect(
		await offeredLabels(categoryField, [complaints, volunteers, unused, draftOnly]),
		"the categories of published Services in label order, without one that no Service or only a draft carries",
	).toEqual([volunteers.label, complaints.label]);

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
		`/services?category=${draftOnly.slug}`,
		`/services?category=${syntheticSlug("no-such-category")}`,
	]) {
		await expectFilteredEmpty(page, path, FILTERED_EMPTY);
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

	/** Each page's field and the terms its card holds, read in turn and compared at the end. */
	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};
	for (const { type, service } of fixtures) {
		const response = await page.goto(`/services/${service.slug}`);
		expect(response?.status(), `GET the ${type} Service`).toBe(200);
		await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(
			service.title,
		);
		// The page opens on the deep field, and its details lie in the card over its edge (#344).
		const parts = fieldParts(page);
		seen[type] = {
			field: await parts.field.count(),
			card:
				(await parts.card.count()) === 1 && (await parts.card.getByRole("term").allInnerTexts()),
		};
		expected[type] = {
			field: 1,
			card:
				type === "external_digital"
					? ["ผู้ให้บริการ", "หน่วยงานผู้ให้บริการ", "หมวดบริการ"]
					: ["ผู้ให้บริการ", "หมวดบริการ"],
		};
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

	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.services],
		fixtures.at(-1)!.service.title,
	);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "บริการประชาชน" }),
	).toHaveAttribute("aria-current", "true");
	expect(seen, "each page on the field, its details in the card").toEqual(expected);
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

/** A place in the district, which gives a Health Service its map. */
const AT_SONG = { latitude: 18.4719, longitude: 100.1953 };

test("a Service page links its related Documents in staff order, each with its download, and the Health Services that offer it by name, each with เปิดแผนที่ when it has coordinates, leaving out drafts, unpublished and trashed ones", async ({
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
		data: AT_SONG,
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
	await expect(
		documents.getByRole("link", { name: firstDocument.title, exact: true }),
	).toHaveAttribute("href", `/documents/${firstDocument.slug}`);
	for (const hidden of [draftDocument, unpublishedDocument, trashedDocument]) {
		await expect(documents.getByText(hidden.title), "an unavailable Document").toHaveCount(0);
	}

	const offering = main.getByRole("region", { name: "หน่วยบริการสุขภาพที่ให้บริการนี้" });
	await expect(offering.getByRole("heading", { level: 3 })).toHaveText([sooner.title, later.title]);
	await expect(offering.getByRole("link", { name: sooner.title, exact: true })).toHaveAttribute(
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

	// Each Document row has its download, named with the Document (#344; spec #338 decision 3), and
	// a Health Service with coordinates its map, named with the Health Service (decision 12).
	/** How many links of each row, in order, have an accessible name of `words` and its title. */
	const namedLinks = async (scope: Locator, words: string, fixtures: DraftFixture[]) => {
		const counts = [];
		for (const [index, fixture] of fixtures.entries()) {
			const name = new RegExp(`^${words} .*${RegExp.escape(fixture.title)}`);
			counts.push(await scope.getByRole("article").nth(index).getByRole("link", { name }).count());
		}
		return counts;
	};
	expect(
		{
			downloads: await namedLinks(documents, "ดาวน์โหลด", [secondDocument, firstDocument]),
			maps: await namedLinks(offering, "เปิดแผนที่", [sooner, later]),
		},
		"a download for each Document and a map for the Health Service with coordinates",
	).toEqual({ downloads: [1, 1], maps: [1, 0] });
});

test.describe("a Service's page on the field", () => {
	/** Two categories, a two-line summary, every detail, the external link, guidance, two
	 * Documents and two offering Health Services, the first with coordinates. */
	let full: DraftFixture & {
		categories: SyntheticTerm[];
		documents: DraftFixture[];
		offering: DraftFixture[];
	};
	/** Who provides it alone: a card of one row, without the external link. */
	let detailsOnly: DraftFixture;
	/** The external link alone: a card that holds the link and its note. */
	let externalOnly: DraftFixture;
	/** No category, no detail and no external link: no row of pills and no card. */
	let bare: DraftFixture;
	const pathOf = (fixture: DraftFixture) => `/services/${fixture.slug}`;
	const SUMMARY = `${SYNTHETIC_FIXTURE_MARK} ตรวจคัดกรองโรคเรื้อรังตามสิทธิ\nที่หน่วยบริการสุขภาพในพื้นที่`;
	const BARE_DURATION = `${SYNTHETIC_FIXTURE_MARK} ตอบกลับภายใน 3 วันทำการ`;
	const RELATED = { label: "เอกสารเผยแพร่", title: "เอกสารที่เกี่ยวข้อง" };
	const OFFERING = { label: "หน่วยบริการ", title: "หน่วยบริการสุขภาพที่ให้บริการนี้" };

	test.beforeAll(async () => {
		const categories = [
			await createCategory("ตรวจคัดกรอง"),
			await createCategory("ขอข้อมูลสุขภาพ"),
		];
		const file = await uploadSyntheticPdf(admin);
		const documents = [
			await createDocument("field-first", file),
			await createDocument("field-second", file),
		];
		for (const document of documents) await publish("documents", document);
		const text = (words: string) => `${SYNTHETIC_FIXTURE_MARK} ${words}`;
		const created = await createService("field-full", {
			data: {
				summary: SUMMARY,
				ownership_type: "coordinated",
				provider_text: text("สำนักงานสาธารณสุขจังหวัดแพร่"),
				external_url: "https://www.example.go.th/service",
				channels: [{ label: "ติดต่อหน่วยบริการสุขภาพที่ให้บริการด้วยตนเอง" }],
				steps: [portableTextBlock(text("นำบัตรประจำตัวประชาชนไปที่หน่วยบริการ"))],
				duration: text("ภายใน 1 วันทำการ"),
				fees: text("ไม่มีค่าธรรมเนียม"),
			},
			taxonomies: { service_category: categories.map((category) => category.slug) },
			references: { documents: documents.map((document) => document.id) },
		});
		await publish("services", created);
		const offering = [
			await createHealthService("field-first", "ก รพ.สต.บ้านกลาง", {
				data: { ...AT_SONG, address: text("45 หมู่ 3 ตำบลบ้านกลาง อำเภอสอง จังหวัดแพร่") },
				services: [created.id],
			}),
			await createHealthService("field-second", "ข โรงพยาบาลสอง", {
				data: { operational_status: "temporarily_closed" },
				services: [created.id],
			}),
		];
		for (const healthService of offering) await publish("health_services", healthService);
		full = { ...created, categories, documents, offering };
		detailsOnly = await createService("field-details-only", {
			data: { ownership_type: "direct" },
		});
		externalOnly = await createService("field-external-only", {
			data: { external_url: "https://www.example.go.th/form" },
		});
		bare = await createService("field-bare", { data: { duration: BARE_DURATION } });
		for (const fixture of [detailsOnly, externalOnly, bare]) await publish("services", fixture);
	});

	test("the page opens on the deep field: the breadcrumb in white, 24 px under it each Service Category in an outlined white pill, as text, then the title as the page's one H1 in today's sizes and the summary with the line breaks staff typed, each on the field, 48 rem wide at most, with no icon; without a category the row of pills is left out", async ({
		page,
	}) => {
		const parts = fieldParts(page);
		// What today's page already shows: one H1 in its sizes.
		await page.goto(pathOf(full));
		await expectPostTitleSizes(page);

		// The pills in the order the card's หมวดบริการ row lists the categories.
		const listed = await detailOf(page, "หมวดบริการ").getByRole("link").allInnerTexts();
		const pills = listed.map((label) => parts.field.getByText(label, { exact: true }));
		const onField = (await parts.field.count()) === 1;
		const seen: Record<string, unknown> = { field: onField };
		const expected: Record<string, unknown> = { field: true };
		const white = await tokenColor(page, "surface-base");
		for (const viewport of onField ? [MOBILE_VIEWPORT, PHONE_VIEWPORT, DESKTOP_VIEWPORT] : []) {
			await page.setViewportSize(viewport);
			const at = `at ${viewport.width} px`;
			const crumbs = await boxOf(parts.breadcrumb, `${at}: the breadcrumb`);
			const field = await boxOf(parts.field, `${at}: the field`);
			const [first, second] = [
				await boxOf(pills[0]!, `${at}: the first category's pill`),
				await boxOf(pills[1]!, `${at}: the second category's pill`),
			];
			const title = await boxOf(parts.title, `${at}: the title`);
			seen[viewport.width] = {
				onField: [crumbs, first, second, title].every(
					(box) => box.y >= field.y && box.y + box.height <= field.y + field.height,
				),
				pillsUnderCrumbs: Math.round(first.y - crumbs.y - crumbs.height),
				// The second follows the first 8 px beside it, or starts the next row 8 px under it.
				secondAfterFirst:
					Math.abs(second.y - first.y) <= 1
						? Math.round(second.x - first.x - first.width) === 8
						: Math.round(second.x - first.x) === 0 &&
							Math.round(second.y - first.y - first.height) === 8,
				titleUnderPills: title.y >= Math.max(first.y + first.height, second.y + second.height),
				headerWidth: Math.round((await boxOf(parts.header, `${at}: the header`)).width),
				pills: [await pillStyle(pills[0]!), await pillStyle(pills[1]!)],
				white: [
					await parts.breadcrumb
						.getByRole("link")
						.first()
						.evaluate((link) => getComputedStyle(link).color),
					await parts.title.evaluate((title) => getComputedStyle(title).color),
				],
			};
			const outlined = {
				fill: "rgba(0, 0, 0, 0)",
				colour: white,
				type: ["13px", "20px", "600"],
				edge: "1px",
			};
			expected[viewport.width] = {
				onField: true,
				pillsUnderCrumbs: 24,
				secondAfterFirst: true,
				titleUnderPills: true,
				headerWidth: Math.min(HEADER_WIDEST, viewport.width - 2 * gutterAt(viewport.width)),
				pills: [outlined, outlined],
				white: [white, white],
			};
		}

		await page.setViewportSize(DESKTOP_VIEWPORT);
		const summary = parts.header.getByText(SUMMARY.split("\n")[0]!);
		seen.summary = onField && {
			text: await summary.innerText(),
			shown: await shownLines(summary),
			colour: await summary.evaluate((text) => getComputedStyle(text).color),
			// body-large, 18 / 30.
			type: await summary.evaluate((text) => {
				const style = getComputedStyle(text);
				return [style.fontSize, style.lineHeight];
			}),
		};
		expected.summary = {
			text: SUMMARY,
			shown: { lines: 2, clamped: false },
			colour: white,
			type: ["18px", "30px"],
		};
		// The categories are words, not links, and the header shows no icon of the Service: the
		// breadcrumb's chevrons are the header's only icons.
		seen.pillLinks = onField && (await parts.header.getByRole("link").allInnerTexts()).length;
		expected.pillLinks = 2;
		// A pill for each category, in the card's order.
		seen.pills = onField && {
			shown: await pills[0]!.locator("xpath=..").locator("span").allInnerTexts(),
			categories: [...listed].sort(),
		};
		expected.pills = {
			shown: listed,
			categories: full.categories.map((category) => category.label).sort(),
		};
		seen.icons = onField && (await parts.header.locator("svg:not(nav svg)").count());
		expected.icons = 0;

		// No category: no row of pills, the title 24 px under the breadcrumb.
		await page.goto(pathOf(bare));
		const crumbs = onField && (await boxOf(parts.breadcrumb, "the bare Service's breadcrumb"));
		seen.bare =
			crumbs &&
			Math.round(
				(await boxOf(parts.title, "the bare Service's title")).y - crumbs.y - crumbs.height,
			);
		expected.bare = 24;
		expect(seen, "the header on the field").toEqual(expected);
	});

	test("the card starts 48 px above the field's lower edge below 640 px and 56 px from 640 px, where the header ends 80 and 96 px above it: white, radius 24, the deep shadow, 20 px inside, in the text column at most 48 rem wide; it holds the details that are set, then 20 px under them ไปยังเว็บไซต์ของบริการ, 44 px high, and its leaving note; a Service with neither has no card, its field reaching 40 px under the header below 640 px and 48 px from 640 px, and its guidance 32 px under the field below 1,024 px and 40 px from 1,024 px; nothing is past the window at 375 or 320 px", async ({
		page,
	}) => {
		const widths = [320, 375, 639, 640, 1440];
		const parts = fieldParts(page);
		const external = parts.card.getByRole("link", { name: /^ไปยังเว็บไซต์ของบริการ/ });
		const note = parts.card.getByText(/^ลิงก์นี้พาออกจากเว็บไซต์ของสำนักงานไปยัง /);
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		for (const [fixture, terms, linked] of [
			[full, ["ผู้ให้บริการ", "หน่วยงานผู้ให้บริการ", "หมวดบริการ"], true],
			[detailsOnly, ["ผู้ให้บริการ"], false],
			[externalOnly, [], true],
		] as const) {
			await page.goto(pathOf(fixture));
			const past: number[] = [];
			for (const width of [375, 320]) {
				await page.setViewportSize({ width, height: 900 });
				past.push(
					await page.evaluate(
						() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
					),
				);
			}
			const card = await cardOverFieldEdge(page, widths);
			const inCard = card !== "no card" && {
				terms: await parts.card.getByRole("term").allInnerTexts(),
				external: await external.count(),
				note: await note.count(),
				// Each category link in the card is a 44 px target (TermLinks).
				categoryLinks: await detailOf(page, "หมวดบริการ")
					.getByRole("link")
					.evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height)),
			};
			seen[fixture.title] = { card, past, inCard };
			expected[fixture.title] = {
				card: await cardOverFieldEdgeAsSpecified(page, widths),
				past: [0, 0],
				inCard: {
					terms,
					external: linked ? 1 : 0,
					note: linked ? 1 : 0,
					categoryLinks: fixture === full ? [44, 44] : [],
				},
			};
		}

		// The link 20 px under the details, 44 px high, at every width.
		await page.goto(pathOf(full));
		for (const width of [320, 640, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			const linkBox =
				(await external.count()) === 1 && (await boxOf(external, `${at}: the external link`));
			const details = parts.card.locator("dl");
			const detailsBox =
				(await details.count()) === 1 && (await boxOf(details, `${at}: the details`));
			seen[`link at ${width}`] = linkBox &&
				detailsBox && {
					underDetails: Math.round(linkBox.y - detailsBox.y - detailsBox.height),
					height: linkBox.height >= 44,
				};
			expected[`link at ${width}`] = { underDetails: 20, height: true };
		}

		// Neither details nor an external link: no card; the field is as high as the header, and the
		// guidance follows it.
		await page.goto(pathOf(bare));
		const barePast: number[] = [];
		for (const width of [375, 320]) {
			await page.setViewportSize({ width, height: 900 });
			barePast.push(
				await page.evaluate(
					() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
				),
			);
		}
		seen.bare = {
			field: await parts.field.count(),
			cards: await parts.card.count(),
			past: barePast,
		};
		expected.bare = { field: 1, cards: 0, past: [0, 0] };
		const guidance = page.getByRole("main").getByRole("heading", { level: 2 }).first();
		for (const width of [375, 639, 640, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const label = `${bare.title} at ${width} px`;
			if ((await parts.field.count()) === 0) break;
			const edge = await fieldEdge(parts.field, label);
			const title = await boxOf(parts.title, `${label}: the title`);
			seen[`bare at ${width}`] = {
				fieldUnderHeader: Math.round(edge - title.y - title.height),
				guidanceUnderField: Math.round((await boxOf(guidance, `${label}: the guidance`)).y - edge),
			};
			expected[`bare at ${width}`] = {
				fieldUnderHeader: width < 640 ? 40 : 48,
				guidanceUnderField: width < 1024 ? 32 : 40,
			};
		}
		expect(seen, "the card over the field's edge").toEqual(expected);
	});

	test("under the card the guidance follows 32 px below 1,024 px and 40 px from 1,024 px, its sections 32 px apart with today's H2s in text-h3 brand-dark; then เอกสารที่เกี่ยวข้อง and หน่วยบริการสุขภาพที่ให้บริการนี้, 32 px apart, each with the Homepage's section heading (the folder-open or hospital tile, the label เอกสารเผยแพร่ or หน่วยบริการ, the H2), its rows 24 px under the heading below 640 px and 28 px from 640 px and 14 px apart, each titled with an H3", async ({
		page,
	}) => {
		await page.goto(pathOf(full));
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const guidance = [
			"ช่องทางรับบริการ",
			"ขั้นตอนการรับบริการ",
			"ระยะเวลาดำเนินการ",
			"ค่าธรรมเนียม",
		];
		const sections = guidance.map((name) => main.getByRole("region", { name }));
		const listed = [
			{ ...RELATED, icon: "folder-open" },
			{ ...OFFERING, icon: "hospital" },
		].map(({ label, title, icon }) => {
			const region = main.getByRole("region", { name: title });
			return {
				title,
				region,
				heading: region.getByRole("heading", { level: 2, name: title }),
				label: region.getByText(label, { exact: true }),
				tile: region.locator(`svg.lucide-${icon}`).first().locator("xpath=.."),
				rows: region.getByRole("article"),
			};
		});
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		const guidanceHeading = sections[0]!.getByRole("heading", { level: 2 });
		seen.guidanceHeading = await guidanceHeading.evaluate((heading) => {
			const style = getComputedStyle(heading);
			return [style.fontSize, style.lineHeight, style.fontWeight, style.color];
		});
		// text-h3, 24 / 34 / 600, in brand-dark.
		expected.guidanceHeading = ["24px", "34px", "600", await tokenColor(page, "brand-dark")];
		for (const section of listed) {
			const hasLabel = (await section.label.count()) === 1;
			seen[section.title] = {
				label: hasLabel && (await section.label.evaluate((label) => getComputedStyle(label).color)),
				tile: hasLabel && {
					hidden: await section.tile.getAttribute("aria-hidden"),
					gradient: await section.tile.evaluate((tile) =>
						getComputedStyle(tile).backgroundImage.startsWith("linear-gradient"),
					),
				},
				rows: await section.rows.count(),
				h3: await section.rows.getByRole("heading", { level: 3 }).count(),
			};
			expected[section.title] = {
				label: await tokenColor(page, "brand-primary"),
				tile: { hidden: "true", gradient: true },
				rows: 2,
				h3: 2,
			};
		}
		// The widths are read only on a page with the card and the sections' headings.
		seen.parts = { card: await parts.card.count(), label: await listed[0]!.label.count() };
		expected.parts = { card: 1, label: 1 };
		for (const width of [320, 375, 639, 640, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			if ((await parts.card.count()) === 0 || (await listed[0]!.label.count()) === 0) break;
			const card = await boxOf(parts.card, `${at}: the card`);
			const boxes: Array<Awaited<ReturnType<typeof boxOf>>> = [];
			for (const [index, section] of sections.entries()) {
				boxes.push(await boxOf(section, `${at}: guidance ${index + 1}`));
			}
			const read = {
				guidanceUnderCard: Math.round(boxes[0]!.y - card.y - card.height),
				sectionsApart: boxes
					.slice(1)
					.map((box, index) => Math.round(box.y - boxes[index]!.y - boxes[index]!.height)),
			} as Record<string, unknown>;
			let above = boxes.at(-1)!;
			for (const section of listed) {
				const region = await boxOf(section.region, `${at}: ${section.title}`);
				const tile = await boxOf(section.tile, `${at}: ${section.title}'s tile`);
				const heading = await boxOf(section.heading, `${at}: ${section.title}'s H2`);
				const label = await boxOf(section.label, `${at}: ${section.title}'s label`);
				const first = await boxOf(section.rows.first(), `${at}: ${section.title}'s first row`);
				const second = await boxOf(section.rows.nth(1), `${at}: ${section.title}'s second row`);
				read[section.title] = {
					underAbove: Math.round(region.y - above.y - above.height),
					labelAboveHeading: label.y < heading.y,
					tileBeforeHeading: tile.x + tile.width <= heading.x,
					rowsUnderHeading: Math.round(
						first.y - Math.max(tile.y + tile.height, heading.y + heading.height),
					),
					rowsApart: Math.round(second.y - first.y - first.height),
					// In the text column, 48 rem wide at most, from the card's start.
					column: [Math.round(region.x - card.x), Math.round(region.width) <= HEADER_WIDEST],
				};
				above = region;
			}
			seen[at] = read;
			const sectionAsSpecified = {
				underAbove: 32,
				labelAboveHeading: true,
				tileBeforeHeading: true,
				rowsUnderHeading: width < 640 ? 24 : 28,
				rowsApart: 14,
				column: [0, true],
			};
			expected[at] = {
				guidanceUnderCard: width < 1024 ? 32 : 40,
				sectionsApart: [32, 32, 32],
				[RELATED.title]: sectionAsSpecified,
				[OFFERING.title]: sectionAsSpecified,
			};
		}
		expect(seen, "the guidance and the two sections under the card").toEqual(expected);
	});

	test("a row under หน่วยบริการสุขภาพที่ให้บริการนี้ is the directory's, its name an H3: its เปิดแผนที่, named with the Health Service, sits at the row's right from 1,024 px in the text column, under the text from 640 px and across the row below 640 px", async ({
		page,
	}) => {
		await page.goto(pathOf(full));
		const offering = page.getByRole("main").getByRole("region", { name: OFFERING.title });
		const row = offering.getByRole("article").first();
		const [first] = full.offering;
		await expect(row.getByRole("heading", { level: 3 })).toHaveText(first!.title);
		await expect(row.getByRole("link", { name: first!.title, exact: true })).toBeVisible();
		await expectSecondLinkPlaces(
			page,
			{
				row,
				tile: row.locator("svg.lucide-hospital").locator("xpath=.."),
				title: row.getByRole("heading", { level: 3 }),
				link: row.getByRole("link", {
					name: new RegExp(`^เปิดแผนที่ ${RegExp.escape(first!.title)}`),
				}),
			},
			"map link",
		);
	});

	test("with motion allowed the header rises in as the page opens and the card after it, while the breadcrumb, the guidance and the two sections show at once; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
		page,
	}) => {
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const related = main.getByRole("region", { name: RELATED.title });
		const offering = main.getByRole("region", { name: OFFERING.title });
		const entering: Array<[string, Locator]> = [
			["the title", parts.title],
			["a category's pill", parts.field.getByText(full.categories[0]!.label, { exact: true })],
			["the card", parts.card],
		];
		const atOnce: Array<[string, Locator]> = [
			["the breadcrumb", parts.breadcrumb],
			["the guidance", main.getByRole("region", { name: "ช่องทางรับบริการ" })],
			["เอกสารที่เกี่ยวข้อง", related],
			["a related Document's row", related.getByRole("article").first()],
			["หน่วยบริการสุขภาพที่ให้บริการนี้", offering],
			["an offering Health Service's row", offering.getByRole("article").first()],
		];
		const placed: Array<[string, Locator]> = [["the field", parts.field], ...entering, ...atOnce];
		/** When each part starts to enter, or "missing" for a part the page does not show. */
		const entries = async (list: Array<[string, Locator]>) => {
			const read: Record<string, number | string> = {};
			for (const [name, part] of list) {
				read[name] = (await part.count()) === 1 ? await entersAfter(part) : "missing";
			}
			return read;
		};
		const running = () => page.evaluate(() => document.getAnimations().length);
		const layouts = async () => {
			const read = [];
			for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
				await page.setViewportSize(viewport);
				await page.evaluate(() => window.scrollTo(0, 0));
				const places = [];
				for (const [name, part] of placed) {
					places.push([name, (await part.count()) === 1 ? await boxOf(part, name) : "missing"]);
				}
				read.push({
					height: await page.evaluate(() => document.documentElement.scrollHeight),
					places,
				});
			}
			return read;
		};

		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(pathOf(full));
		const reduced = { running: await running(), heldBack: await heldBack(main) };
		const still = await layouts();

		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(pathOf(full), { waitUntil: "commit" });
		await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
		const enters = await entries(entering);
		const shows = await entries(atOnce);
		await expect
			.poll(() => heldBack(main), { message: "the page shows whole after the entrance" })
			.toEqual([]);
		const moved = await layouts();

		await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
		await page.goto(pathOf(full));
		await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
		const onPaper = { running: await running(), heldBack: await heldBack(main) };
		await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });

		const card = enters["the card"];
		expect(
			{
				reduced,
				title: enters["the title"],
				pill: enters["a category's pill"],
				cardAfterHeader: typeof card === "number" && card > (enters["the title"] as number),
				shows,
				moved,
				onPaper,
			},
			"the header rises in as the page opens and the card after it; the rest shows at once",
		).toEqual({
			reduced: { running: 0, heldBack: [] },
			title: 0,
			pill: 0,
			cardAfterHeader: true,
			shows: Object.fromEntries(atOnce.map(([name]) => [name, -1])),
			moved: still,
			onPaper: { running: 0, heldBack: [] },
		});
	});
});

test.describe("a Service's page without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("a Service's page shows its header on the field, its card with the details and the external link, its guidance, and its related Documents and offering Health Services with their downloads and maps", async ({
		page,
	}) => {
		const category = await createCategory("ไม่ใช้สคริปต์");
		const file = await uploadSyntheticPdf(admin);
		const document = await createDocument("no-script", file);
		await publish("documents", document);
		const service = await createService("no-script", {
			data: {
				ownership_type: "direct",
				external_url: "https://www.example.go.th/no-script",
				duration: `${SYNTHETIC_FIXTURE_MARK} ภายใน 1 วันทำการ`,
			},
			taxonomies: { service_category: [category.slug] },
			references: { documents: [document.id] },
		});
		await publish("services", service);
		const healthService = await createHealthService("no-script", "ก รพ.สต.ไม่ใช้สคริปต์", {
			data: AT_SONG,
			services: [service.id],
		});
		await publish("health_services", healthService);

		await page.goto(`/services/${service.slug}`);
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const seen: Record<string, boolean> = {
			title: await shownWhole(parts.title.filter({ hasText: service.title })),
			pill: await shownWhole(parts.field.getByText(category.label, { exact: true })),
			details: await shownWhole(parts.card.getByRole("term").filter({ hasText: "ผู้ให้บริการ" })),
			external: await shownWhole(parts.card.getByRole("link", { name: /^ไปยังเว็บไซต์ของบริการ/ })),
			guidance: await shownWhole(
				main.getByRole("heading", { level: 2, name: "ระยะเวลาดำเนินการ" }),
			),
			download: await shownWhole(
				main.getByRole("region", { name: "เอกสารที่เกี่ยวข้อง" }).getByRole("link", {
					name: /^ดาวน์โหลด/,
				}),
			),
			map: await shownWhole(
				main
					.getByRole("region", { name: "หน่วยบริการสุขภาพที่ให้บริการนี้" })
					.getByRole("link", { name: /^เปิดแผนที่/ }),
			),
		};
		expect(
			seen,
			"the header, the card, the guidance and the two sections without JavaScript",
		).toEqual(Object.fromEntries(Object.keys(seen).map((name) => [name, true])));
	});
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

	await expectPreviewRenders(page, admin, "services", draft, `/services/${draft.slug}`);
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
			data: { ...AT_SONG, operational_status: "temporarily_closed" },
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

	testAccessibilityAndReflow("the Service pages", () => paths);
});

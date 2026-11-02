// The ITA landing, a fiscal year's page and moving between them (#124; spec #121 "Public routes"
// and "Testing Decisions", ADR 0006).
//
// A citizen reaches ITA from the main navigation, where it is the last item and stays marked on
// every ITA page. /ita lists each fiscal year that has a published MOIT, newest first, with how
// many MOITs it has, or says that there is none yet. /ita/{fiscal-year} lists that year's
// published MOITs by number, each with its "MOIT n" badge, its title, how much Evidence it holds
// and "ปรับปรุงล่าสุด" when staff set it; a year without a published MOIT answers the site 404. A
// MOIT page leads to the MOITs before and after it in its own year only, a draft in preview to
// those around its number, and the breadcrumb steps down หน้าแรก › ITA › ปีงบประมาณ › MOIT; a
// draft previewed in a year without a published MOIT, whose year has no page, steps from ITA to
// the MOIT. Quick Access may lead to /ita.
//
// The suite drives the single development runtime over public HTTP through the public-page harness
// (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px widths).
// Fixtures are synthetic MOITs made through the native API, in fiscal years no real MOIT has and
// apart from the MOIT page suite's (public-ita.spec.ts), removed afterwards. The runtime may hold
// other MOITs (the demo dataset, the Product Owner's own), so the landing's assertions look only at
// the suite's own years. The test of the empty landing returns every published MOIT to draft
// (public.helpers.ts BorrowedEntries) and gives it back afterwards.

import type { Page } from "@playwright/test";

import {
	createSyntheticMoit,
	devAdminActor,
	fileBlock,
	linkBlock,
	listPublishedEntries,
	mintPreviewLink,
	publishEntryAt,
	removeSuiteFixtures,
	requirementBlock,
	uploadSyntheticPdf,
	withHomepageMenus,
	type CmsActor,
	type DraftFields,
	type MoitFixture,
} from "./cms.helpers";
import {
	BorrowedEntries,
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	HOMEPAGE_HEADINGS,
	SECTION_CRUMBS,
	expect,
	expectBreadcrumb,
	expectSiteNotFound,
	homepageSection,
	listedItem,
	listedTitles,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	thaiDate,
} from "./public.helpers";

/** The fiscal years of the suite's MOITs, which no real MOIT has. */
const NEWER = 2403;
const OLDER = 2402;
/** A year whose only MOIT is a draft. */
const DRAFTS_ONLY = 2404;
/** A year without any MOIT. */
const NO_MOIT = 2405;

/** The ITA landing's heading. */
const LANDING_HEADING = "การประเมินคุณธรรมและความโปร่งใส (ITA)";

/** 23 Sep 2026 17:30 UTC is already 24 Sep in Bangkok. */
const UPDATED_ON = "2026-09-23T17:30:00.000Z";

let admin: CmsActor;
let origin: string;
/** The runtime's own published MOITs the empty-landing test returns to draft. */
const borrowed = new BorrowedEntries();

/** NEWER's published MOITs 1, 3 and 5, its draft MOIT 2, OLDER's one MOIT, and DRAFTS_ONLY's. */
let first: MoitFixture;
let third: MoitFixture;
let fifth: MoitFixture;
let draft: MoitFixture;
let older: MoitFixture;
let draftsOnly: MoitFixture;

/** A synthetic MOIT draft of `year`, numbered `number`, with `evidence` as its blocks. */
const createMoit = (
	label: string,
	year: number,
	number: number,
	evidence: Record<string, unknown>[] = [],
	fields?: DraftFields,
) => createSyntheticMoit(admin, label, { year, number, evidence }, fields);

/** The ITA landing's card for fiscal year `year`. */
function yearCard(page: Page, year: number) {
	return page
		.getByRole("main")
		.getByRole("link", { name: new RegExp(`^ปีงบประมาณ\\s*${year}\\b`) });
}

/** The suite's own fiscal years among those the ITA landing lists, in order. */
async function ownListedYears(page: Page): Promise<number[]> {
	const cards = await page
		.getByRole("main")
		.getByRole("link", { name: /^ปีงบประมาณ/ })
		.allInnerTexts();
	return cards
		.map((card) => Number(/\d+/.exec(card)?.[0]))
		.filter((year) => [NEWER, OLDER, DRAFTS_ONLY, NO_MOIT].includes(year));
}

/** The main navigation's ITA item. */
const itaItem = (page: Page) =>
	page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "ITA" });

/**
 * Fail unless the MOIT page open in `page` leads to `previous` and `next`, or has no such link
 * where there is none.
 */
async function expectNeighbours(
	page: Page,
	previous: MoitFixture | undefined,
	next: MoitFixture | undefined,
): Promise<void> {
	const neighbours = page.getByRole("navigation", { name: "ตัวชี้วัดอื่นในปีงบประมาณเดียวกัน" });
	for (const [label, moit] of [
		["ตัวชี้วัดก่อนหน้า", previous],
		["ตัวชี้วัดถัดไป", next],
	] as const) {
		const link = neighbours.getByRole("link", { name: new RegExp(`^${label}`) });
		if (moit === undefined) {
			await expect(link, `no ${label}`).toHaveCount(0);
		} else {
			await expect(link).toHaveAccessibleName(`${label} ${moit.heading}`);
			await expect(link).toHaveAttribute("href", `/ita/${moit.slug}`);
		}
	}
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
	const pdf = await uploadSyntheticPdf(admin);
	// Made and published out of number order, so the pages' order can only be the numbers'.
	fifth = await createMoit("fifth", NEWER, 5, [
		linkBlock("ข้อมูลจากเว็บไซต์กระทรวงสาธารณสุข", "https://www.moph.go.th/"),
	]);
	first = await createMoit("first", NEWER, 1);
	third = await createMoit(
		"third",
		NEWER,
		3,
		[
			requirementBlock("1", "ข้อกำหนดข้อแรก"),
			fileBlock("1.1 บันทึกข้อความเสนอ ผบห.", pdf),
			linkBlock("1.2 ข้อมูลการติดต่อหน่วยงาน", "/contact", { current: true }),
			requirementBlock("2", "ข้อกำหนดข้อที่สอง"),
			fileBlock("2.1 รายงานผลการดำเนินงาน", pdf, { round: "รอบ 12 เดือน" }),
		],
		{ data: { updated_on: UPDATED_ON } },
	);
	draft = await createMoit("draft", NEWER, 2);
	older = await createMoit("older", OLDER, 1);
	draftsOnly = await createMoit("drafts-only", DRAFTS_ONLY, 1);
	for (const moit of [fifth, first, third, older]) await publishEntryAt(admin, "moit", moit.id);
});

test.afterEach(() => borrowed.giveBack(admin));

test.afterAll(() => removeSuiteFixtures(admin));

test("the ITA landing lists each fiscal year that has a published MOIT once, newest first, with its MOIT count, and leaves out a year whose MOITs are drafts", async ({
	page,
}) => {
	const response = await page.goto("/ita");
	expect(response?.status(), "GET /ita").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(LANDING_HEADING);
	expect(await ownListedYears(page)).toEqual([NEWER, OLDER]);
	await expect(yearCard(page, NEWER)).toHaveAccessibleName(
		new RegExp(`^ปีงบประมาณ\\s*${NEWER}\\s*ตัวชี้วัด 3 รายการ$`),
	);
	await expect(yearCard(page, NEWER)).toHaveAttribute("href", `/ita/${NEWER}`);
	await expect(yearCard(page, OLDER)).toHaveAccessibleName(
		new RegExp(`^ปีงบประมาณ\\s*${OLDER}\\s*ตัวชี้วัด 1 รายการ$`),
	);
	await expect(yearCard(page, OLDER)).toHaveAttribute("href", `/ita/${OLDER}`);

	const { siteTitle, separator } = await siteTitleParts(admin);
	await expect(page).toHaveTitle(`${LANDING_HEADING}${separator}${siteTitle}`);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		/การประเมินคุณธรรมและความโปร่งใส/,
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/ita`);
});

test("the ITA landing says that nothing is published yet while no MOIT is", async ({ page }) => {
	for (const { id } of await listPublishedEntries(admin, "moit")) {
		await borrowed.borrow(admin, "moit", id);
	}
	const response = await page.goto("/ita");
	expect(response?.status(), "GET /ita").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByText("ยังไม่มีข้อมูล ITA")).toBeVisible();
	await expect(main.getByRole("link", { name: /^ปีงบประมาณ/ })).toHaveCount(0);
});

test("a fiscal year's page lists its published MOITs by number, each with its badge, title, Evidence count and last-updated date when set, and never a draft", async ({
	page,
}) => {
	const response = await page.goto(`/ita/${NEWER}`);
	expect(response?.status(), `GET /ita/${NEWER}`).toBe(200);
	const main = page.getByRole("main");
	const heading = `ITA ปีงบประมาณ พ.ศ. ${NEWER}`;
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(heading);
	expect(await listedTitles(page)).toEqual([first.heading, third.heading, fifth.heading]);
	await expect(main, "a draft never appears").not.toContainText(draft.title);

	for (const moit of [first, third, fifth]) {
		await expect(
			listedItem(page, moit.heading).getByRole("link", { name: moit.heading }),
		).toHaveAttribute("href", `/ita/${moit.slug}`);
	}
	await expect(listedItem(page, third.heading)).toContainText("หลักฐาน 3 รายการ");
	await expect(listedItem(page, third.heading)).toContainText(
		`ปรับปรุงล่าสุด ${thaiDate(UPDATED_ON)}`,
	);
	await expect(listedItem(page, first.heading)).toContainText("หลักฐาน 0 รายการ");
	await expect(listedItem(page, first.heading)).not.toContainText("ปรับปรุงล่าสุด");
	await expect(listedItem(page, fifth.heading)).toContainText("หลักฐาน 1 รายการ");

	const { siteTitle, separator } = await siteTitleParts(admin);
	await expect(page).toHaveTitle(`${heading}${separator}${siteTitle}`);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		new RegExp(`ตัวชี้วัด MOIT 3 รายการของปีงบประมาณ พ.ศ. ${NEWER}`),
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/ita/${NEWER}`,
	);
});

test("a fiscal year without a published MOIT answers the site 404, and its draft previewed leads back to ITA without the year", async ({
	page,
}) => {
	await expectSiteNotFound(page, `/ita/${DRAFTS_ONLY}`, "a year whose only MOIT is a draft");
	await expectSiteNotFound(page, `/ita/${NO_MOIT}`, "a year without MOITs");

	const preview = await page.goto((await mintPreviewLink(admin, "moit", draftsOnly.id)).toString());
	expect(preview?.status(), "the draft's preview renders").toBe(200);
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.ita], "MOIT 1");
});

test("a MOIT page leads to the MOITs before and after it in its fiscal year's number order, past a draft, never into another year, and to none past the year's ends, and a draft in preview to those around its number", async ({
	page,
}) => {
	await page.goto(`/ita/${third.slug}`);
	await expectNeighbours(page, first, fifth);
	await page.goto(`/ita/${first.slug}`);
	await expectNeighbours(page, undefined, third);
	await page.goto(`/ita/${fifth.slug}`);
	await expectNeighbours(page, third, undefined);
	await page.goto(`/ita/${older.slug}`);
	await expectNeighbours(page, undefined, undefined);

	const preview = await page.goto((await mintPreviewLink(admin, "moit", draft.id)).toString());
	expect(preview?.status(), "the draft's preview renders").toBe(200);
	await expectNeighbours(page, first, third);
	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.ita, [`ปีงบประมาณ ${NEWER}`, `/ita/${NEWER}`]],
		"MOIT 2",
	);
});

test("the main navigation ends with ITA and marks it on the landing, a year's page and a MOIT's, whose breadcrumb steps down หน้าแรก › ITA › ปีงบประมาณ › MOIT", async ({
	page,
}) => {
	await page.goto("/ita");
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link").last(),
	).toHaveAccessibleName("ITA");
	await expect(itaItem(page)).toHaveAttribute("aria-current", "page");
	await expectBreadcrumb(page, [HOME_CRUMB], "ITA");

	await page.goto(`/ita/${NEWER}`);
	await expect(itaItem(page)).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.ita], `ปีงบประมาณ ${NEWER}`);

	await page.goto(`/ita/${third.slug}`);
	await expect(itaItem(page)).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.ita, [`ปีงบประมาณ ${NEWER}`, `/ita/${NEWER}`]],
		"MOIT 3",
	);
});

test("a Quick Access item that points to /ita shows on the Homepage and leads to the ITA landing", async ({
	page,
}) => {
	await withHomepageMenus(admin, { quickAccess: [{ label: "ITA", url: "/ita" }] }, async () => {
		await page.goto("/");
		const shortcut = homepageSection(page, HOMEPAGE_HEADINGS.quickAccess).getByRole("link", {
			name: "ITA",
		});
		await expect(shortcut).toHaveAttribute("href", "/ita");
		await shortcut.click();
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(LANDING_HEADING);
	});
});

testAccessibilityAndReflow("the ITA landing and a fiscal year's page", () => [
	"/ita",
	`/ita/${NEWER}`,
]);

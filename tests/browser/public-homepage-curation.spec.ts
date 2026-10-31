// The Homepage's curated sections (#65; spec #51 "Homepage (`04`, Figma order)", approved Q11;
// `04` §5, §6, §10.1 and §17; docs/design/homepage-concept-v1.md §3, §5 and §10).
//
// Staff curate three native menus, and a citizen opening / sees:
//
// - the Featured hero: the first item of the Featured menu that is published content of a kind
//   that can be Featured, with its title, its summary (an Announcement: the start of its
//   details), its picture or the brand visual, a link to it and ค้นหาบริการ to /services. A closed
//   Announcement is not Featured. With no such item, the compact band with the site title stays.
//   The Featured item is not repeated as the News card or among the current Announcements;
// - the Frequently Used Services: the published Services of their menu, in menu order, at most 6,
//   each with its name, summary and the uniform icon, and ดูบริการทั้งหมด to /services;
// - Quick Access: up to 4 items of its menu, in menu order, each to a page of the site or a
//   published entry, each a label and an arrow.
//
// An item whose entry is a draft, unpublished or trashed is skipped, so unpublishing an entry takes
// it off the Homepage without a menu edit. So is an item of another kind, and a Quick Access item
// that leads nowhere on the site.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set). Each test sets the menus it
// reads through the native menu API and puts back what they held (cms.helpers.ts
// withHomepageMenus). Fixtures are synthetic entries and pictures, removed afterwards. A test that
// needs its News to be the newest publishes it after every earlier test's fixtures.

import type { Page } from "@playwright/test";

import {
	SYNTHETIC_FIXTURE_MARK,
	createSyntheticDocument,
	createSyntheticDraft,
	createSyntheticHealthService,
	createSyntheticService,
	devAdminActor,
	pickedMenuItem,
	portableTextBlock,
	publishEntryAt,
	removeSuiteFixtures,
	trashEntry,
	typedMenuItem,
	unpublishEntry,
	uploadSyntheticPicture,
	withHomepageMenus,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOMEPAGE_HEADINGS,
	MOBILE_VIEWPORT,
	expect,
	expectAccessibleAtEachWidth,
	expectImageLoaded,
	expectNoHorizontalScroll,
	homepageSection,
	siteTitleParts,
	test,
} from "./public.helpers";

/** The Featured hero's eyebrow, the design's interface text (docs/design/homepage-concept-v1.md §3). */
const FEATURED_EYEBROW = "เรื่องเด่นจากอำเภอสอง";
/** The heading of the current Announcements beside the News card. */
const ANNOUNCEMENTS_HEADING = "ประกาศ";
/** A close date long past, on any calendar. */
const CLOSED_AT = "2026-01-31T10:00:00.000Z";

let admin: CmsActor;
/** The site title the settings name, the page's H1. */
let siteTitle: string;

/** Thai names of each kind of content, for the fixtures' titles. */
const KIND = {
	news: "ข่าว",
	announcements: "ประกาศ",
	health_content: "ความรู้สุขภาพ",
	health_reports: "รายงานสุขภาพ",
} as const;

/** A synthetic draft of `collection`. Its title is unique, so the page shows it or does not. */
const create = (collection: keyof typeof KIND, label: string, fields?: DraftFields) =>
	createSyntheticDraft(admin, collection, KIND[collection], label, fields);

/** Publish fixtures now, in order. */
async function publish(collection: string, ...fixtures: DraftFixture[]): Promise<void> {
	for (const fixture of fixtures) await publishEntryAt(admin, collection, fixture.id);
}

/** The Featured hero, named by the Featured item's title. */
function hero(page: Page, fixture: DraftFixture) {
	return homepageSection(page, fixture.title);
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	({ siteTitle } = await siteTitleParts(admin));
});

test.afterAll(() => removeSuiteFixtures(admin));

test("Featured shows the first menu item that is published content of a Featured kind: its title, summary, picture, a link to it and ค้นหาบริการ", async ({
	page,
}) => {
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปเรื่องเด่น ${crypto.randomUUID().slice(0, 6)}`;
	const draft = await create("news", "featured-draft");
	const trashed = await create("news", "featured-trashed");
	const document = await createSyntheticDocument(admin, "featured-wrong-kind");
	const featured = await create("news", "featured", {
		data: {
			summary,
			featured_image: {
				id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพเรื่องเด่น`),
			},
		},
	});
	await publish("news", trashed, featured);
	await publish("documents", document);
	expect((await trashEntry(admin, "news", trashed.id)).ok, "trash").toBe(true);

	await withHomepageMenus(
		admin,
		{
			featured: [
				pickedMenuItem("news", draft),
				pickedMenuItem("news", trashed),
				pickedMenuItem("documents", document),
				pickedMenuItem("news", featured),
			],
		},
		async () => {
			await page.goto("/");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
			const shown = hero(page, featured);
			await expect(shown.getByRole("heading", { level: 2 })).toHaveText(featured.title);
			await expect(shown.getByText(FEATURED_EYEBROW, { exact: true })).toBeVisible();
			await expect(shown.getByText(summary, { exact: true })).toBeVisible();
			await expect(
				shown.getByRole("link", { name: `ดูเรื่องเด่น ${featured.title}` }),
			).toHaveAttribute("href", `/news/${featured.slug}`);
			await expect(shown.getByRole("link", { name: "ค้นหาบริการ" })).toHaveAttribute(
				"href",
				"/services",
			);
			await expectImageLoaded(shown.locator("img"), "the Featured picture");
			await expect(shown.getByTestId("featured-visual")).toHaveCount(0);
			for (const hidden of [draft, trashed, document]) {
				await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
			}
		},
	);
});

test("an Announcement without a picture is Featured with the start of its details and the brand visual, is not repeated among the current Announcements, and its Thai address opens it", async ({
	page,
}) => {
	const opening = `${SYNTHETIC_FIXTURE_MARK} เปิดรับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน`;
	const announcement = await create("announcements", "เรื่องเด่น", {
		data: {
			details: [
				portableTextBlock(`${opening} ${"ผู้สนใจสมัครได้ที่สำนักงาน ".repeat(12)}ท้ายรายละเอียด`),
			],
		},
	});
	await publish("announcements", announcement);

	await withHomepageMenus(
		admin,
		{ featured: [pickedMenuItem("announcements", announcement)] },
		async () => {
			await page.goto("/");
			const shown = hero(page, announcement);
			const lead = shown.getByText(opening);
			await expect(lead).toBeVisible();
			await expect(lead).toHaveText(/…$/);
			await expect(shown, "the lead is the start of the details").not.toContainText(
				"ท้ายรายละเอียด",
			);
			await expect(shown.locator("img")).toHaveCount(0);
			await expect(shown.getByTestId("featured-visual")).toHaveCount(1);
			// The newest current Announcement, so the list beside the News card would lead with it.
			await expect(
				homepageSection(page, HOMEPAGE_HEADINGS.news).getByRole("list", {
					name: ANNOUNCEMENTS_HEADING,
				}),
			).not.toContainText(announcement.title);
			await expectAccessibleAtEachWidth(page, "/ with the Featured visual");
			await page.setViewportSize(MOBILE_VIEWPORT);
			await expectNoHorizontalScroll(page, "/ with the Featured visual");
			await page.setViewportSize(DESKTOP_VIEWPORT);
			const link = shown.getByRole("link", { name: `ดูเรื่องเด่น ${announcement.title}` });
			await expect(link).toHaveAttribute(
				"href",
				`/announcements/${encodeURIComponent(announcement.slug)}`,
			);
			await link.click();
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(announcement.title);
		},
	);
});

test("with nothing in the Featured menu to show, the compact band with the site title stays", async ({
	page,
}) => {
	const draft = await create("news", "band-draft");
	const facility = await createSyntheticHealthService(admin, "band-wrong-kind");
	await publish("health_services", facility);

	await withHomepageMenus(
		admin,
		{
			featured: [
				pickedMenuItem("news", draft),
				pickedMenuItem("health_services", facility),
				typedMenuItem("เอกสารเผยแพร่", "/documents"),
			],
		},
		async () => {
			await page.goto("/");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
			await expect(page.getByText(FEATURED_EYEBROW)).toHaveCount(0);
			await expect(page.getByRole("link", { name: /^ดูเรื่องเด่น/ })).toHaveCount(0);
		},
	);
});

test("a closed Announcement is not Featured, and the next item in the menu is", async ({
	page,
}) => {
	const closed = await create("announcements", "featured-closed", {
		data: { closes_at: CLOSED_AT },
	});
	const service = await createSyntheticService(admin, "featured-after-closed");
	await publish("announcements", closed);
	await publish("services", service);

	await withHomepageMenus(
		admin,
		{
			featured: [pickedMenuItem("announcements", closed), pickedMenuItem("services", service)],
		},
		async () => {
			await page.goto("/");
			await expect(hero(page, service).getByRole("heading", { level: 2 })).toHaveText(
				service.title,
			);
			await expect(page.getByRole("main")).not.toContainText(closed.title);
		},
	);
});

test("unpublishing the Featured entry takes it off the Homepage without a menu edit, and the band comes back", async ({
	page,
}) => {
	// A Health Report requires its report Document (seed/seed.json report_document).
	const document = await createSyntheticDocument(admin, "featured-report-document");
	await publish("documents", document);
	const report = await create("health_reports", "featured-then-unpublished", {
		data: { summary: `${SYNTHETIC_FIXTURE_MARK} สรุปรายงานสุขภาพ` },
		references: { report_document: [document.id] },
	});
	await publish("health_reports", report);

	await withHomepageMenus(
		admin,
		{ featured: [pickedMenuItem("health_reports", report)] },
		async () => {
			await page.goto("/");
			await expect(hero(page, report).getByRole("heading", { level: 2 })).toHaveText(report.title);

			expect((await unpublishEntry(admin, "health_reports", report.id)).ok, "unpublish").toBe(true);
			await page.goto("/");
			await expect(page.getByRole("main")).not.toContainText(report.title);
			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		},
	);
});

test("the Featured News is not repeated as the News card, which shows the next newest News", async ({
	page,
}) => {
	const next = await create("news", "next-newest");
	const featured = await create("news", "featured-newest");
	await publish("news", next, featured);

	await withHomepageMenus(admin, { featured: [pickedMenuItem("news", featured)] }, async () => {
		await page.goto("/");
		await expect(hero(page, featured).getByRole("heading", { level: 2 })).toHaveText(
			featured.title,
		);
		const news = homepageSection(page, HOMEPAGE_HEADINGS.news);
		await expect(news.getByRole("article").getByRole("heading", { level: 3 })).toHaveText(
			next.title,
		);
		await expect(news).not.toContainText(featured.title);
	});
});

test("the Frequently Used Services are the menu's published Services, in menu order, at most 6, each with its name, summary and icon", async ({
	page,
}) => {
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปบริการที่ใช้บ่อย`;
	const services: DraftFixture[] = [];
	for (let index = 1; index <= 7; index++) {
		services.push(
			await createSyntheticService(admin, `frequent-${index}`, {
				data: index === 1 ? { summary } : {},
			}),
		);
	}
	const draft = await createSyntheticService(admin, "frequent-draft");
	const trashed = await createSyntheticService(admin, "frequent-trashed");
	const news = await create("news", "frequent-wrong-kind");
	await publish("services", ...services, trashed);
	await publish("news", news);
	expect((await trashEntry(admin, "services", trashed.id)).ok, "trash").toBe(true);
	const [first, second, third, fourth, fifth, sixth, seventh] = services as [
		DraftFixture,
		DraftFixture,
		DraftFixture,
		DraftFixture,
		DraftFixture,
		DraftFixture,
		DraftFixture,
	];

	await withHomepageMenus(
		admin,
		{
			services: [
				pickedMenuItem("services", first),
				pickedMenuItem("news", news),
				pickedMenuItem("services", draft),
				pickedMenuItem("services", second),
				pickedMenuItem("services", trashed),
				...[third, fourth, fifth, sixth, seventh].map((service) =>
					pickedMenuItem("services", service),
				),
			],
		},
		async () => {
			await page.goto("/");
			const frequent = homepageSection(page, HOMEPAGE_HEADINGS.services);
			const shown = [first, second, third, fourth, fifth, sixth];
			await expect(frequent.getByRole("heading", { level: 3 })).toHaveText(
				shown.map(({ title }) => title),
			);
			for (const service of shown) {
				await expect(frequent.getByRole("link", { name: service.title })).toHaveAttribute(
					"href",
					`/services/${service.slug}`,
				);
			}
			await expect(frequent.getByTestId("service-icon")).toHaveCount(6);
			await expect(
				frequent.getByRole("article").filter({ hasText: first.title }).getByText(summary),
			).toBeVisible();
			await expect(frequent.getByRole("link", { name: "ดูบริการทั้งหมด" })).toHaveAttribute(
				"href",
				"/services",
			);
			for (const hidden of [seventh, draft, trashed, news]) {
				await expect(frequent, hidden.title).not.toContainText(hidden.title);
			}
		},
	);
});

test("Quick Access shows up to 4 items in menu order, each to a page of the site or a published entry, as a label and an arrow", async ({
	page,
}) => {
	const document = await createSyntheticDocument(admin, "quick-access");
	const withdrawn = await create("health_content", "quick-access-unpublished");
	await publish("documents", document);
	await publish("health_content", withdrawn);
	expect((await unpublishEntry(admin, "health_content", withdrawn.id)).ok, "unpublish").toBe(true);

	await withHomepageMenus(
		admin,
		{
			quickAccess: [
				typedMenuItem("เอกสารเผยแพร่", "/documents"),
				pickedMenuItem("health_content", withdrawn),
				pickedMenuItem("documents", document),
				typedMenuItem("ระบบภายนอก", "https://example.org/eservice"),
				typedMenuItem("หน้าที่ไม่มีอยู่", "/songhealth-unknown-quick-access"),
				typedMenuItem("ข่าวสุขภาพ", "/news/health"),
				typedMenuItem("ข้อมูลสุขภาพ", "/health"),
				typedMenuItem("ติดต่อเรา", "/contact"),
			],
		},
		async () => {
			await page.goto("/");
			const quickAccess = homepageSection(page, HOMEPAGE_HEADINGS.quickAccess);
			const links = quickAccess.getByRole("link");
			const expected = [
				[`${SYNTHETIC_FIXTURE_MARK} เอกสารเผยแพร่`, "/documents"],
				[document.title, `/documents/${document.slug}`],
				[`${SYNTHETIC_FIXTURE_MARK} ข่าวสุขภาพ`, "/news/health"],
				[`${SYNTHETIC_FIXTURE_MARK} ข้อมูลสุขภาพ`, "/health"],
			];
			await expect(links).toHaveCount(expected.length);
			for (const [index, [name, href]] of expected.entries()) {
				await expect(links.nth(index)).toHaveAccessibleName(name!);
				await expect(links.nth(index)).toHaveAttribute("href", href!);
			}
			for (const hidden of [withdrawn.title, "ระบบภายนอก", "หน้าที่ไม่มีอยู่", "ติดต่อเรา"]) {
				await expect(quickAccess, hidden).not.toContainText(hidden);
			}
		},
	);
});

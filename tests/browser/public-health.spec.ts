// Health Information (#59; spec #51 "Public reads" (Health Content, Health Reports) and "Errors,
// redirects, preview and SEO", `03` §9 and §14).
//
// A citizen opens the Health Information hub at /health, which links to Health Content and to
// Health Reports. Health Content is listed at /health/content, newest publication first, and
// narrows to one Health Topic with ?topic=; each item's page at /health/content/{slug} shows its
// topics, source, last review date ("ทบทวนล่าสุด", only when set), picture and body. Health Reports
// are listed at /health/reports by their report date, an undated one placed by its publication
// (ADR 0004); each report's page at /health/reports/{slug} shows its summary, reporting period,
// fiscal year and source, and links to its report Document. Health Reports never appear among
// Health Content. Drafts, unpublished and trashed entries never show, and their addresses answer
// the site 404. An image in a body whose media item was deleted is left out. The topic filter of
// /health/content offers only the Health Topics that published Health Content carries (spec #174
// "Public list filters").
//
// /health/content opens on the deep field (Feature 009 #282; spec #280 "List heading", "What
// follows a list's heading"): its breadcrumb, the label สุขภาพ, the H1 ความรู้สุขภาพ and its lead, with
// its filter form first over the field's lower edge (public.helpers.ts testFilteredListOnField).
// /health and /health/reports open on it too (Feature 011 #339; spec #338 "Decisions", 5 and 13):
// /health under the label สุขภาพ with its two destinations as the Homepage's Quick Access tiles over
// the field's lower edge, and /health/reports under the same label with its rows and pager there
// (testListOnField), each report a white row with the report's tile and one link over the whole
// row (#342; spec #338 "The Health Reports list"). A Health Report's page opens on the field with
// the Post page's header and one white card over the field's edge, its report Document's file
// first, then a rule and its details (#343; spec #338 "The three pages: the header", "The card over
// the field's edge", decision 9); a report whose Document is unpublished or whose file cannot be
// served shows the report's unavailable notice there instead.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Health Content, Health Reports, Documents, topic and report-type
// terms and media made through the native API, and removed afterwards. The runtime may hold other
// entries (the demo dataset, the Product Owner's own), so assertions look only at this suite's
// uniquely titled fixtures, or at a list narrowed to this suite's own Health Topic. Health Reports
// that must lead the list are dated from 2030 on, after any real report; the paging test's are
// dated latest, since earlier tests' fixtures stay until the suite ends. A synthetic News item
// stands for another list that carries a topic. One test needs a list with no Health Content at
// all: it returns every published item to draft and publishes each again at its own date
// (public.helpers.ts BorrowedEntries).
//
// Platform behaviour relied on (emdash 1.1.0):
// - POST …/publish accepts `publishedAt` to backdate a publication
//   (src/astro/routes/api/content/[collection]/[id]/publish.ts).
// - A create takes `references: { report_document: [id] }`, and a page resolves the reference only
//   while the Document is published (src/query.ts attachReferences).
// - An image field saved with only a media id takes its alt text from the media library
//   (src/media/normalize.ts mergeProviderData).
// - Deleting a media item removes its stored file and leaves the content that uses it unchanged
//   (src/api/handlers/media.ts handleMediaDelete).
// - POST …/preview-url mints the signed preview link of a draft
//   (src/astro/routes/api/content/[collection]/[id]/preview-url.ts).

import type { Locator, Page } from "@playwright/test";

import {
	createOwnedTerm,
	createSyntheticDocument,
	createSyntheticDraft,
	createSyntheticHealthReport,
	deleteMedia,
	devAdminActor,
	nativeRefusalOf,
	portableTextBlock,
	portableTextImage,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	uploadSyntheticMedia,
	uploadSyntheticPdf,
	uploadSyntheticPicture,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
	type SyntheticPdf,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	LIST_END,
	LeadingEntries,
	isoDay,
	SECTION_CRUMBS,
	boxOf,
	cardList,
	detailOf,
	expect,
	expectArrowBesideLabel,
	expectBlocksOverFieldEdge,
	expectBreadcrumb,
	expectEmptyStateUnderForm,
	expectFilteredEmpty,
	expectFocusRingWhole,
	expectImageLoaded,
	expectLabelAboveArrow,
	expectListMovesOnlyWhenAllowed,
	expectNoHorizontalScroll,
	expectPreviewRenders,
	expectSiteNotFound,
	entersAfter,
	fieldParts,
	cardOverFieldEdge,
	cardOverFieldEdgeAsSpecified,
	fileBlockAt,
	fileBlockAsSpecified,
	fileBlockLook,
	fileBlockLookAsSpecified,
	fileBlockOf,
	expectPostTitleSizes,
	unavailableNoticeIn,
	gutterAt,
	HEADER_WIDEST,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	pillStyle,
	itemsPerRow,
	listHeading,
	listedItem,
	listedTitles,
	movingSurface,
	offeredLabels,
	ownTitles,
	pointAtRowEdge,
	pressInside,
	rowShadow,
	shownLines,
	shownOpacity,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testFilteredListOnField,
	testHeadingOnField,
	testListCards,
	testListOnField,
	textStyle,
	thaiDate,
	tokenColor,
	whileNonePublished,
} from "./public.helpers";

/** The fixed number of Health Content items a list page shows. */
const CONTENT_PAGE_SIZE = 12;
/** The fixed number of Health Reports a list page shows. */
const REPORTS_PAGE_SIZE = 20;

/** The lead of /health/content, under its heading. */
const CONTENT_LEAD = "ความรู้ด้านสุขภาพสำหรับประชาชนในอำเภอสอง เลือกประเด็นสุขภาพที่สนใจได้";

/** The heading of /health, the Health Information hub. */
const HEALTH_HEADING = {
	label: "สุขภาพ",
	title: "ข้อมูลสุขภาพ",
	lead: "ความรู้สุขภาพสำหรับประชาชน และรายงานสุขภาพของสำนักงานสาธารณสุขอำเภอสองและเครือข่าย",
};

/** /health's two tiles, in order, each the link to its area. */
const HEALTH_TILES = [
	["ความรู้สุขภาพ", "/health/content"],
	["รายงานสุขภาพ", "/health/reports"],
] as const;

/** The lead of /health/reports, under its heading. */
const REPORTS_LEAD =
	"รายงานด้านสุขภาพของสำนักงานสาธารณสุขอำเภอสองและเครือข่าย พร้อมเอกสารรายงานฉบับเต็ม";

/** The name of the filter form of /health/content. */
const CONTENT_FILTER_FORM = "กรองความรู้สุขภาพ";

/** What /health/content shows when its Health Topic matches nothing. */
const CONTENT_FILTERED_EMPTY = {
	message: "ไม่พบความรู้สุขภาพในประเด็นนี้",
	back: { label: "ดูความรู้สุขภาพทุกประเด็น", href: "/health/content" },
};

// Each area's crumb, which its own pages pass through after the section's.
const CONTENT_CRUMB = ["ความรู้สุขภาพ", "/health/content"] as const;
const REPORTS_CRUMB = ["รายงานสุขภาพ", "/health/reports"] as const;

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];
/** A published Document the suite's Health Reports point to. */
let reportDocument: DraftFixture & { file: SyntheticPdf };

/** A synthetic term of `taxonomy`, labelled in Thai so it reads like a real one. */
const createTerm = (taxonomy: string, label: string) =>
	createOwnedTerm(admin, taxonomy, label, ownedTerms);

/** A synthetic Health Content draft with a unique title. */
const createContent = (label: string, fields: DraftFields = {}) =>
	createSyntheticDraft(admin, "health_content", "ความรู้สุขภาพ", label, fields);

/** A synthetic Health Report draft pointing to `document`, by default the suite's own. */
const createReport = (
	label: string,
	{ document = reportDocument, ...fields }: DraftFields & { document?: DraftFixture } = {},
) => createSyntheticHealthReport(admin, label, { document, ...fields });

/** Publish now, or backdated to `publishedAt`. Returns the stored publication instant. */
const publishContent = (content: DraftFixture, publishedAt?: string) =>
	publishEntryAt(admin, "health_content", content.id, publishedAt);
const publishReport = (report: DraftFixture, publishedAt?: string) =>
	publishEntryAt(admin, "health_reports", report.id, publishedAt);

/** The list that holds /health's tiles. */
const healthTiles = (page: Page) =>
	page
		.getByRole("main")
		.getByRole("list")
		.filter({ has: page.getByRole("link", { name: HEALTH_TILES[0][0], exact: true }) });

/** The main navigation's ข้อมูลสุขภาพ item. */
const healthNavItem = (page: Page) =>
	page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "ข้อมูลสุขภาพ" });

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
	reportDocument = await createSyntheticDocument(admin, "health-report");
	await publishEntryAt(admin, "documents", reportDocument.id);
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

// First in the suite, while the runtime holds only its own Health Content: each item is returned to
// draft for this test and published again at its own date.
test("with no published Health Content, /health/content shows ยังไม่มีความรู้สุขภาพ under its filter form over the field's lower edge, with no card and no pager", async ({
	page,
}) => {
	test.setTimeout(90_000);
	await whileNonePublished(admin, "health_content", async () => {
		const response = await page.goto("/health/content");
		expect(response?.status(), "GET /health/content").toBe(200);
		await expect(cardList(page).cards).toHaveCount(0);
		await expectEmptyStateUnderForm(
			page,
			page.getByRole("form", { name: CONTENT_FILTER_FORM }),
			"ยังไม่มีความรู้สุขภาพ",
		);
	});
});

// Next, while the runtime holds only this suite's Health Reports and the demo dataset's: the list
// with none returns each to draft for its case (testListOnField). Its own reports, published at
// LIST_END without a report date, follow every other test's.
testListOnField({
	path: "/health/reports",
	crumbs: [HOME_CRUMB, SECTION_CRUMBS.health],
	heading: { label: "สุขภาพ", title: "รายงานสุขภาพ", lead: REPORTS_LEAD },
	icon: "file-chart-column",
	collection: "health_reports",
	pageSize: REPORTS_PAGE_SIZE,
	noneYet: "ยังไม่มีรายงานสุขภาพ",
	pastLast: "ไม่พบรายงานสุขภาพในหน้านี้",
	admin: () => admin,
	publishItem: async (label) => {
		const report = await createReport(label);
		await publishReport(report, LIST_END);
		return report;
	},
	// Each row reveals as it comes into the window (Feature 011 #342; spec #338 "Motion").
	itemsMove: "rows",
});

testHeadingOnField({
	path: "/health",
	crumbs: [HOME_CRUMB],
	heading: HEALTH_HEADING,
	icon: "heart-pulse",
});

test("/health shows its two destinations as the Homepage's Quick Access tiles over the field's lower edge, ความรู้สุขภาพ then รายงานสุขภาพ, each one link named by its H2: side by side at every width from 320 to 1,440 px, 12 px apart below 640 px and 20 px from 640 px, compact below 640 px, and each focus ring with its white band where it meets the field", async ({
	page,
}) => {
	await page.goto("/health");
	const tiles = healthTiles(page);
	const items = tiles.getByRole("listitem");
	await expect(items).toHaveCount(HEALTH_TILES.length);
	for (const [index, [label, href]] of HEALTH_TILES.entries()) {
		const link = items.nth(index).getByRole("link");
		await expect(link, `tile ${index + 1}: one link`).toHaveCount(1);
		await expect(link, `tile ${index + 1}`).toHaveAccessibleName(label);
		await expect(link, label).toHaveAttribute("href", href);
		await expect(link.getByRole("heading", { level: 2 }), `${label}: an H2`).toHaveText(label);
	}

	for (const width of [320, 375, 639, 640, 768, 1024, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		const at = `at ${width} px`;
		await expectNoHorizontalScroll(page, `/health ${at}`);
		expect(await itemsPerRow(items), `the two tiles side by side ${at}`).toEqual([2]);
		const [first, second] = [
			await boxOf(items.nth(0), "tile 1"),
			await boxOf(items.nth(1), "tile 2"),
		];
		expect(second.x - (first.x + first.width), `the tiles' gap ${at}`).toBeCloseTo(
			width < 640 ? 12 : 20,
			0,
		);
		for (const [index, [label]] of HEALTH_TILES.entries()) {
			const link = items.nth(index).getByRole("link");
			if (width < 640) await expectLabelAboveArrow(link, `${label} ${at}`);
			else await expectArrowBesideLabel(link, `${label} ${at}`);
		}
	}

	const heading = listHeading(page, HEALTH_HEADING);
	await expectBlocksOverFieldEdge(page, heading.field, [heading.lead], [["the tiles", tiles]]);
});

test("on /health the keyboard goes from the breadcrumb, on the field with its accent-warm focus ring drawn whole, to the two tiles, and each tile opens its page from its arrow and by Enter", async ({
	page,
}) => {
	await page.goto("/health");
	const crumb = listHeading(page, HEALTH_HEADING).breadcrumb.getByRole("link");
	const links = healthTiles(page).getByRole("link");
	await crumb.focus();
	await page.keyboard.press("Tab");
	for (const [index, [label]] of HEALTH_TILES.entries()) {
		await expect(links.nth(index), `the tile ${label}`).toBeFocused();
		await page.keyboard.press("Tab");
	}
	await expectFocusRingWhole(crumb, "the หน้าแรก crumb");
	await expect(crumb, "the หน้าแรก crumb: the field's focus ring").toHaveCSS(
		"outline-color",
		await tokenColor(page, "accent-warm"),
	);

	for (const [index, [label, href]] of HEALTH_TILES.entries()) {
		for (const [how, open] of [
			["its arrow", () => links.nth(index).locator("svg").click()],
			["Enter", () => links.nth(index).press("Enter")],
		] as const) {
			await page.goto("/health");
			await open();
			await expect(page, `${label} by ${how}`).toHaveURL(href);
		}
	}
});

test("/health moves only when motion is allowed: the heading and then the lead rise in as the page opens while the breadcrumb shows at once, each tile reveals as it comes into the window and shows whole while it holds the keyboard's focus, and nothing moves by itself for more than five seconds; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
	page,
}) => {
	test.setTimeout(90_000);
	await expectListMovesOnlyWhenAllowed(page, "/health", listHeading(page, HEALTH_HEADING), [], {
		grid: healthTiles(page),
	});

	// A window shorter than the field puts the tiles below it as the page opens, well below: just
	// under a 300 px window Chromium gives a tile's view timeline no progress, and it shows whole.
	const short = { width: 1440, height: 200 };
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.setViewportSize(short);
	await page.goto("/health");
	const items = healthTiles(page).getByRole("listitem");
	for (const tile of await items.all()) {
		expect((await boxOf(tile, "a tile")).y, "a tile lies below the window").toBeGreaterThan(
			short.height,
		);
	}
	// The two share a row, so both are read before either comes into the window.
	for (const tile of await items.all()) {
		expect(await shownOpacity(tile), "a tile below the window waits").toBe(0);
	}
	for (const tile of await items.all()) {
		await tile.scrollIntoViewIfNeeded();
		await expect.poll(() => shownOpacity(tile), { message: "a tile in the window shows" }).toBe(1);
	}
	await page.goto("/health");
	await items.last().getByRole("link").focus();
	await expect
		.poll(() => shownOpacity(items.last()), {
			message: "the last tile, focused, shows whole",
			timeout: 3_000,
		})
		.toBe(1);
});

test.describe("/health without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("/health shows its heading with its label and its lead, and its two tiles", async ({
		page,
	}) => {
		await page.goto("/health");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(HEALTH_HEADING.title);
		await expect(listHeading(page, HEALTH_HEADING).label, "the label above the H1").toBeVisible();
		await expect(listHeading(page, HEALTH_HEADING).lead).toBeVisible();
		for (const [label] of HEALTH_TILES) {
			await expect(
				healthTiles(page).getByRole("link", { name: label, exact: true }),
				label,
			).toBeVisible();
		}
	});

	test("a Health Report's page shows its header on the field, then its card with the report Document's file and download, the rule and the details", async ({
		page,
	}) => {
		const report = await createReport("no-script", {
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} สรุปรายงานที่อ่านได้โดยไม่ใช้สคริปต์`,
				report_at: "2026-09-23T17:30:00.000Z",
				owner_source: `${SYNTHETIC_FIXTURE_MARK} กลุ่มงาน`,
			},
		});
		await publishReport(report);
		await page.goto(`/health/reports/${report.slug}`);
		const parts = fieldParts(page);
		const block = fileBlockOf(parts.card, "เอกสารรายงาน", "PDF, 2 KB");
		const shown = async (part: Locator) => (await part.count()) === 1 && part.isVisible();
		const seen: Record<string, boolean> = {
			title: await shown(parts.title.filter({ hasText: report.title })),
			date: await shown(parts.field.getByText(`วันที่รายงาน ${REPORT_DAY}`, { exact: true })),
			document: await shown(
				parts.card.getByRole("link", { name: reportDocument.title, exact: true }),
			),
		};
		for (const name of ["tile", "heading", "download", "rule", "details"] as const) {
			seen[name] = await shown(block[name]);
		}
		expect(seen, "the header, the file and the details without JavaScript").toEqual(
			Object.fromEntries(Object.keys(seen).map((name) => [name, true])),
		);
	});
});

test("/health links to Health Content and to Health Reports under its own breadcrumb", async ({
	page,
}) => {
	const response = await page.goto("/health");
	expect(response?.status(), "GET /health").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("ข้อมูลสุขภาพ");
	await expect(healthNavItem(page)).toHaveAttribute("aria-current", "page");
	await expectBreadcrumb(page, [HOME_CRUMB], "ข้อมูลสุขภาพ");
	const main = page.getByRole("main");
	await expect(main.getByRole("link", { name: "ความรู้สุขภาพ", exact: true })).toHaveAttribute(
		"href",
		"/health/content",
	);
	await expect(main.getByRole("link", { name: "รายงานสุขภาพ", exact: true })).toHaveAttribute(
		"href",
		"/health/reports",
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/health`);
});

test("/health/content lists only published Health Content, newest first, each with its topic, date and own address, and never a Health Report", async ({
	page,
}) => {
	const topic = await createTerm("topic", "โรคไม่ติดต่อเรื้อรัง");
	const tagged = { taxonomies: { topic: [topic.slug] } };
	const older = await createContent("older", tagged);
	const newer = await createContent("newer");
	const draft = await createContent("draft", tagged);
	const unpublished = await createContent("unpublished", tagged);
	const trashed = await createContent("trashed", tagged);
	const report = await createReport("not-content", tagged);
	await publishContent(unpublished);
	await publishContent(trashed);
	await publishReport(report);
	const olderAt = await publishContent(older);
	const newerAt = await publishContent(newer);
	expect((await unpublishEntry(admin, "health_content", unpublished.id)).ok, "unpublish").toBe(
		true,
	);
	expect((await trashEntry(admin, "health_content", trashed.id)).ok, "trash").toBe(true);
	const all = [older, newer, draft, unpublished, trashed, report];

	const response = await page.goto("/health/content");
	expect(response?.status(), "GET /health/content").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("ความรู้สุขภาพ");
	await expect(healthNavItem(page)).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.health], "ความรู้สุขภาพ");
	expect(ownTitles(await listedTitles(page), all), "published only, newest first").toEqual([
		newer.title,
		older.title,
	]);

	for (const [content, at] of [
		[newer, newerAt],
		[older, olderAt],
	] as const) {
		const card = listedItem(page, content.title);
		await expect(card.getByRole("link", { name: content.title })).toHaveAttribute(
			"href",
			`/health/content/${content.slug}`,
		);
		await expect(card.locator("time")).toHaveText(thaiDate(at));
	}
	await expect(
		listedItem(page, older.title).getByText(topic.label),
		"the topic labels the card",
	).toBeVisible();

	await page.goto(`/health/content?topic=${topic.slug}`);
	expect(
		ownTitles(await listedTitles(page), all),
		"the topic's Health Content, without the Health Report that shares it",
	).toEqual([older.title]);
});

test("/health/content narrows to one Health Topic with ?topic=, keeps it in the address while paging, and shows the empty state for an unknown topic or page", async ({
	page,
}) => {
	const topic = await createTerm("topic", "สุขภาพจิต");
	const fixtures: DraftFixture[] = [];
	for (let index = 0; index <= CONTENT_PAGE_SIZE; index += 1) {
		fixtures.push(
			await createContent(`page-${String(index).padStart(2, "0")}`, {
				taxonomies: { topic: [topic.slug] },
			}),
		);
	}
	for (const content of fixtures) await publishContent(content);
	const newestFirst = fixtures.toReversed().map((content) => content.title);

	await page.goto("/health/content");
	// The filter is a plain GET form: it works without JavaScript and keeps the topic in the address.
	const filter = page.getByRole("form", { name: CONTENT_FILTER_FORM });
	await filter.getByLabel("ประเด็นสุขภาพ").selectOption({ label: topic.label });
	await filter.getByRole("button", { name: "แสดงผล" }).click();
	await expect(page).toHaveURL(`/health/content?topic=${topic.slug}`);
	await expect(filter.getByLabel("ประเด็นสุขภาพ")).toHaveValue(topic.slug);
	expect(await listedTitles(page), "the topic's first page").toEqual(
		newestFirst.slice(0, CONTENT_PAGE_SIZE),
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/health/content?topic=${topic.slug}`,
	);

	const pagination = page.getByRole("navigation", { name: "การแบ่งหน้า" });
	await expect(pagination.getByRole("link", { name: "หน้าก่อนหน้า" })).toHaveCount(0);
	await pagination.getByRole("link", { name: "หน้าถัดไป" }).click();
	await expect(page).toHaveURL(`/health/content?topic=${topic.slug}&page=2`);
	expect(await listedTitles(page), "the topic's second page").toEqual(
		newestFirst.slice(CONTENT_PAGE_SIZE),
	);
	await expect(
		page
			.getByRole("navigation", { name: "การแบ่งหน้า" })
			.getByRole("link", { name: "หน้าก่อนหน้า" }),
	).toHaveAttribute("href", `/health/content?topic=${topic.slug}`);

	await expectFilteredEmpty(
		page,
		`/health/content?topic=${syntheticSlug("no-such-topic")}`,
		CONTENT_FILTERED_EMPTY,
	);

	const beyond = await page.goto("/health/content?page=10000");
	expect(beyond?.status(), "a page past the end is not an error").toBe(200);
	await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("ไม่พบความรู้สุขภาพในหน้านี้")).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: "กลับไปหน้าแรกของรายการ" }),
	).toHaveAttribute("href", "/health/content");
});

test("the /health/content topic filter offers only the Health Topics that published Health Content carries, and an address naming another shows the empty state", async ({
	page,
}) => {
	const offered = await createTerm("topic", "การแพทย์แผนไทย");
	const draftOnly = await createTerm("topic", "สุขภาพช่องปาก");
	const newsOnly = await createTerm("topic", "ยาเสพติด");
	const content = await createContent("topics-published", {
		taxonomies: { topic: [offered.slug] },
	});
	await createContent("topics-draft", { taxonomies: { topic: [draftOnly.slug] } });
	const news = await createSyntheticDraft(admin, "news", "ข่าว", "topics-news", {
		taxonomies: { topic: [newsOnly.slug] },
	});
	await publishContent(content);
	await publishEntryAt(admin, "news", news.id);

	await page.goto("/health/content");
	expect(
		await offeredLabels(
			page.getByRole("form", { name: CONTENT_FILTER_FORM }).getByLabel("ประเด็นสุขภาพ"),
			[offered, draftOnly, newsOnly],
		),
		"a topic that only a draft or another list carries is not offered",
	).toEqual([offered.label]);

	for (const term of [draftOnly, newsOnly]) {
		await expectFilteredEmpty(page, `/health/content?topic=${term.slug}`, CONTENT_FILTERED_EMPTY);
	}
});

testFilteredListOnField({
	path: "/health/content",
	crumbs: [HOME_CRUMB, SECTION_CRUMBS.health],
	heading: { label: "สุขภาพ", title: "ความรู้สุขภาพ", lead: CONTENT_LEAD },
	icon: "heart-pulse",
	form: CONTENT_FILTER_FORM,
	pageSize: CONTENT_PAGE_SIZE,
	pastLast: "ไม่พบความรู้สุขภาพในหน้านี้",
	filteredEmpty: CONTENT_FILTERED_EMPTY,
	createTopic: (label) => createTerm("topic", label),
	publishItem: async (label, topic, picture) => {
		const content = await createContent(label, {
			...(picture ? { data: { featured_image: { id: picture } } } : {}),
			taxonomies: { topic: [topic.slug] },
		});
		await publishContent(content);
		return content;
	},
	uploadPicture: () => uploadSyntheticPicture(admin, "ภาพความรู้สุขภาพสำหรับทดสอบ"),
});

testListCards({
	path: "/health/content",
	icon: "heart-pulse",
	unlabelled: true,
	createLabel: (label) => createTerm("topic", label),
	uploadPicture: () => uploadSyntheticPicture(admin, "ภาพความรู้สุขภาพสำหรับทดสอบการ์ด"),
	pageSize: CONTENT_PAGE_SIZE,
	publishItem: async (label, { term, summary, picture }) => {
		const item = await createContent(label, {
			data: {
				...(summary ? { summary } : {}),
				...(picture ? { featured_image: { id: picture } } : {}),
			},
			...(term ? { taxonomies: { topic: [term.slug] } } : {}),
		});
		return { item, at: await publishContent(item) };
	},
});

test("a Health Content page shows its topics, source, last review date, picture with its alt text and body under its breadcrumb", async ({
	page,
}) => {
	const first = await createTerm("topic", "ผู้สูงอายุ");
	const second = await createTerm("topic", "โภชนาการ");
	const alt = `${SYNTHETIC_FIXTURE_MARK} ภาพประกอบความรู้สุขภาพ`;
	const source = `${SYNTHETIC_FIXTURE_MARK} กรมอนามัย กระทรวงสาธารณสุข`;
	const bodyText = `${SYNTHETIC_FIXTURE_MARK} เนื้อหาความรู้ย่อหน้าแรก`;
	const content = await createContent("detail", {
		data: {
			summary: `${SYNTHETIC_FIXTURE_MARK} สรุปความรู้สุขภาพ`,
			body: [portableTextBlock(bodyText)],
			source_text: source,
			featured_image: { id: await uploadSyntheticPicture(admin, alt) },
			// 23 Sep 2026 17:30 UTC is already 24 Sep in Bangkok.
			reviewed_at: "2026-09-23T17:30:00.000Z",
			next_review_at: "2027-03-01T03:00:00.000Z",
		},
		taxonomies: { topic: [first.slug, second.slug] },
	});
	const publishedAt = await publishContent(content, "2026-08-01T03:00:00.000Z");

	const response = await page.goto(`/health/content/${content.slug}`);
	expect(response?.status(), "GET the Health Content page").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(content.title);
	await expect(main.getByText(/^เผยแพร่/)).toHaveText(`เผยแพร่ ${thaiDate(publishedAt)}`);
	await expect(main.getByText(/^ทบทวนล่าสุด/)).toHaveText("ทบทวนล่าสุด 24 ก.ย. 2569");
	await expect(main.getByText("1 มี.ค. 2570"), "the next review date is for staff").toHaveCount(0);
	await expect(main.getByText(`แหล่งที่มา: ${source}`)).toBeVisible();
	await expect(main.getByText(bodyText)).toBeVisible();
	for (const topic of [first, second]) {
		await expect(main.getByRole("link", { name: topic.label })).toHaveAttribute(
			"href",
			`/health/content?topic=${topic.slug}`,
		);
	}
	await expectImageLoaded(main.getByRole("img", { name: alt }), "the picture");
	await expect(healthNavItem(page)).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.health, CONTENT_CRUMB], content.title);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/health/content/${content.slug}`,
	);

	const unreviewed = await createContent("unreviewed");
	await publishContent(unreviewed);
	await page.goto(`/health/content/${unreviewed.slug}`);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(unreviewed.title);
	await expect(
		page.getByRole("main").getByText(/ทบทวนล่าสุด/),
		"no review date, no ทบทวนล่าสุด",
	).toHaveCount(0);
});

test("a Health Content item whose featured image was deleted from the media library shows the plain visual with the heart-pulse icon on its list, and no broken image", async ({
	page,
}) => {
	const media = await uploadSyntheticMedia(admin);
	expect(media.mediaId, "the synthetic image must upload").toBeDefined();
	const content = await createContent("image-gone", {
		data: { featured_image: { id: media.mediaId } },
	});
	await publishContent(content);
	const removed = await deleteMedia(admin, media.mediaId!);
	expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);

	await page.goto("/health/content");
	const card = listedItem(page, content.title);
	await expect(card, "the list still lists the item").toHaveCount(1);
	await expect(card.locator("img"), "no picture for it").toHaveCount(0);
	await expect(
		card.getByTestId("news-visual").locator("svg.lucide-heart-pulse"),
		"the plain visual with the list's icon",
	).toHaveCount(1);
});

test("an image or gallery picture in a Health Content body whose media item was deleted is left out, and the rest of the body still shows", async ({
	page,
}) => {
	const goneAlt = `${SYNTHETIC_FIXTURE_MARK} ภาพในเนื้อหาที่ถูกลบ`;
	const goneInGalleryAlt = `${SYNTHETIC_FIXTURE_MARK} ภาพในแกลเลอรีที่ถูกลบ`;
	const keptAlt = `${SYNTHETIC_FIXTURE_MARK} ภาพในแกลเลอรีที่ยังอยู่`;
	const gone = await uploadSyntheticMedia(admin);
	const goneInGallery = await uploadSyntheticMedia(admin);
	const kept = await uploadSyntheticMedia(admin);
	const bodyText = `${SYNTHETIC_FIXTURE_MARK} เนื้อหาระหว่างภาพ`;
	const content = await createContent("body-image-gone", {
		data: {
			body: [
				portableTextImage(gone, goneAlt),
				portableTextBlock(bodyText),
				{
					_type: "gallery",
					_key: crypto.randomUUID().slice(0, 8),
					images: [
						portableTextImage(goneInGallery, goneInGalleryAlt),
						portableTextImage(kept, keptAlt),
					],
				},
			],
		},
	});
	await publishContent(content);
	for (const media of [gone, goneInGallery]) {
		const removed = await deleteMedia(admin, media.mediaId!);
		expect(removed.ok, `deleting a media item: ${nativeRefusalOf(removed)}`).toBe(true);
	}

	const response = await page.goto(`/health/content/${content.slug}`);
	expect(response?.status(), "the Health Content page still renders").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByText(bodyText)).toBeVisible();
	await expectImageLoaded(
		main.getByRole("img", { name: keptAlt }),
		"the gallery picture that remains",
	);
	for (const alt of [goneAlt, goneInGalleryAlt]) {
		await expect(main.getByRole("img", { name: alt }), `${alt} is left out`).toHaveCount(0);
	}
	await expect(main.locator("img"), "no other picture stands in for them").toHaveCount(1);
});

test("/health/reports lists only published Health Reports by report date, an undated one placed by its publication, each with its type, reporting period and fiscal year", async ({
	page,
}) => {
	const type = await createTerm("report_type", "รายงานผลการดำเนินงาน");
	const september = await createReport("dated-september", {
		data: {
			report_at: "2026-09-02T03:00:00.000Z",
			reporting_period: "ไตรมาสที่ 4 ปีงบประมาณ 2569",
			fiscal_year: 2569,
		},
		taxonomies: { report_type: [type.slug] },
	});
	const undatedAugust = await createReport("undated-august");
	// Dated in July, published long after it: the report date places it, not the publication.
	const july = await createReport("dated-july", {
		data: { report_at: "2026-07-15T03:00:00.000Z" },
	});
	const undatedMay = await createReport("undated-may");
	const draft = await createReport("draft", { data: { report_at: "2026-09-01T03:00:00.000Z" } });
	const unpublished = await createReport("unpublished");
	const trashed = await createReport("trashed");
	await publishReport(unpublished);
	await publishReport(trashed);
	expect((await unpublishEntry(admin, "health_reports", unpublished.id)).ok, "unpublish").toBe(
		true,
	);
	expect((await trashEntry(admin, "health_reports", trashed.id)).ok, "trash").toBe(true);
	const mayAt = await publishReport(undatedMay, "2026-05-20T03:00:00.000Z");
	await publishReport(july);
	const augustAt = await publishReport(undatedAugust, "2026-08-10T03:00:00.000Z");
	await publishReport(september, "2026-06-01T03:00:00.000Z");

	const response = await page.goto("/health/reports");
	expect(response?.status(), "GET /health/reports").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("รายงานสุขภาพ");
	await expect(healthNavItem(page)).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.health], "รายงานสุขภาพ");
	expect(
		ownTitles(await listedTitles(page), [
			september,
			undatedAugust,
			july,
			undatedMay,
			draft,
			unpublished,
			trashed,
		]),
		"published only, by report date, else by publication",
	).toEqual([september.title, undatedAugust.title, july.title, undatedMay.title]);

	for (const [report, shown] of [
		[september, "2026-09-02T03:00:00.000Z"],
		[undatedAugust, augustAt],
		[july, "2026-07-15T03:00:00.000Z"],
		[undatedMay, mayAt],
	] as const) {
		const row = listedItem(page, report.title);
		await expect(row.getByRole("link", { name: report.title })).toHaveAttribute(
			"href",
			`/health/reports/${report.slug}`,
		);
		await expect(row.locator("time"), `${report.title} is dated`).toHaveText(thaiDate(shown));
	}
	const dated = listedItem(page, september.title);
	await expect(dated.getByText(type.label)).toBeVisible();
	await expect(dated.getByText("ปีงบประมาณ 2569", { exact: true })).toBeVisible();
	await expect(dated.getByText("ไตรมาสที่ 4 ปีงบประมาณ 2569")).toBeVisible();
});

/** The `day`th of `month` 2032, after any real Health Report and the paging test's, so it leads. */
const in2032 = (month: number, day: number) => isoDay(2032, month, day);

/** The Health Reports a test published to lead the list, returned to draft after it. */
const leading = new LeadingEntries();

/** Publish `report` now, until the test ends (`LeadingEntries`). Returns its publication. */
async function publishLeading(report: DraftFixture): Promise<string> {
	const at = await publishReport(report);
	leading.hold("health_reports", report);
	return at;
}

test.afterEach(() => leading.release(admin));

/** A title longer than two lines of a report row at every width. */
const LONG_REPORT_TITLE =
	"สถานการณ์โรคไข้เลือดออกและโรคติดต่อนำโดยยุงลายในพื้นที่อำเภอสองทุกตำบล พร้อมผลการดำเนินงานควบคุมโรค การสำรวจลูกน้ำยุงลาย และข้อเสนอแนะต่อหน่วยบริการสุขภาพและองค์กรปกครองส่วนท้องถิ่นในพื้นที่ ตลอดไตรมาสแรกของปีงบประมาณ รวมถึงแผนการเฝ้าระวังโรคในช่วงฤดูฝนถัดไป";

/** A summary longer than two lines of a report row at every width from 640 px. */
const LONG_REPORT_SUMMARY = `${SYNTHETIC_FIXTURE_MARK} ${"สรุปจำนวนผู้ป่วย อัตราป่วยต่อแสนประชากร และพื้นที่ที่พบผู้ป่วยต่อเนื่อง พร้อมมาตรการที่หน่วยบริการดำเนินการแล้ว ".repeat(3)}`;

/**
 * A synthetic Health Report draft titled with `LONG_REPORT_TITLE`, pointing to the suite's
 * Document.
 */
const createLongReport = (label: string, fields: DraftFields = {}) =>
	createSyntheticDraft(admin, "health_reports", `รายงานสุขภาพ ${LONG_REPORT_TITLE}`, label, {
		...fields,
		references: { report_document: [reportDocument.id] },
	});

/**
 * The parts of a Health Report row a citizen meets, found by what they show: the tile by its icon,
 * the title by its heading, the arrow by its icon; and the row's white surface, which moves inside
 * the row's place under the pointer.
 */
function reportRowParts(row: Locator) {
	return {
		tile: row.locator("svg.lucide-file-chart-column").locator("xpath=.."),
		title: row.getByRole("heading", { level: 2 }),
		arrow: row.locator("svg.lucide-arrow-right"),
		surface: row.getByTestId("report-surface"),
	};
}

/** A row's facts line, found by `fact`, the words of one of its facts. */
const reportFacts = (row: Locator, fact: string) =>
	row.getByText(fact, { exact: true }).locator("xpath=..");

/** The row that follows `row` in its list, or none. */
const rowAfter = (row: Locator) =>
	row.locator("xpath=ancestor::li[1]/following-sibling::li[1]").getByRole("article");

/** Whether the row's one link covers the whole row. */
const linkCoversRow = (row: Locator) =>
	row.evaluate((article) => {
		const link = article.querySelector("a")?.getBoundingClientRect();
		const box = article.getBoundingClientRect();
		return (
			!!link &&
			(["x", "y", "width", "height"] as const).every((side) => Math.abs(link[side] - box[side]) < 1)
		);
	});

test("each /health/reports row: the file-chart-column tile, 68 px below 640 px and 92 px from 640 px, with the fiscal year under the icon in accent-warm, or the icon alone without one; the facts line with the Report Type, the date the list orders by and the fiscal year, each only when set; the title as an H2 in two lines at most; from 640 px the summary in two lines at most; the reporting period; from 640 px the round arrow; one link named by the title covers the row, and the rows are 14 px apart", async ({
	page,
}) => {
	const type = await createTerm("report_type", "รายงานสถานการณ์โรค");
	const period = "ไตรมาสที่ 1 ปีงบประมาณ 2569";
	const full = await createLongReport("row-full", {
		data: {
			summary: LONG_REPORT_SUMMARY,
			report_at: in2032(1, 2),
			reporting_period: period,
			fiscal_year: 2569,
		},
		taxonomies: { report_type: [type.slug] },
	});
	// Without a report date, a fiscal year, a type, a summary or a period: placed and dated by its
	// publication.
	const bare = await createReport("row-bare");
	await publishLeading(full);
	const bareAt = await publishLeading(bare);

	await page.goto("/health/reports");
	const row = listedItem(page, full.title);
	const bareRow = listedItem(page, bare.title);
	const parts = reportRowParts(row);
	const facts = reportFacts(row, type.label);
	const bareFacts = reportFacts(bareRow, thaiDate(bareAt));
	const summary = row.getByText(LONG_REPORT_SUMMARY.trim());
	const periodLine = row.getByText(`ช่วงเวลาของรายงาน: ${period}`);
	// The title as an H2 naming the one link, to the report's page.
	await expect(parts.title).toHaveText(full.title);
	await expect(row.getByRole("link")).toHaveAccessibleName(full.title);
	await expect(row.getByRole("link")).toHaveAttribute("href", `/health/reports/${full.slug}`);

	/** The tile as it shows now: decorative, its gradient, its icon, and the words under it. */
	const tileOf = async (tile: Locator) => {
		if ((await tile.count()) === 0) return undefined;
		return tile.evaluate((element) => {
			const icon = element.querySelector("svg");
			const year = element.querySelector("span");
			return {
				decorative: element.closest('[aria-hidden="true"]') !== null,
				gradient: getComputedStyle(element).backgroundImage.includes("linear-gradient"),
				icon: [icon?.getBoundingClientRect().width, getComputedStyle(icon ?? element).color],
				year: year && {
					text: year.textContent?.trim(),
					colour: getComputedStyle(year).color,
					size: parseFloat(getComputedStyle(year).fontSize),
					weight: getComputedStyle(year).fontWeight,
				},
			};
		});
	};
	const factsParts = (line: Locator) =>
		line.evaluate((element) => [...element.children].map((part) => part.textContent?.trim()));
	const [secondary, primary] = [
		await tokenColor(page, "text-secondary"),
		await tokenColor(page, "text-primary"),
	];
	const seen: Record<string, unknown> = {
		tile: await tileOf(parts.tile),
		bareTile: await tileOf(reportRowParts(bareRow).tile),
		factsParts: await factsParts(facts),
		factsStyle: await textStyle(facts),
		bareFacts: await factsParts(bareFacts),
		titleColour: (await textStyle(parts.title)).colour,
		summaryStyle: (await summary.count()) > 0 ? await textStyle(summary) : undefined,
		period: await textStyle(periodLine),
		bareText: (await bareRow.innerText())
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean),
		surface:
			(await parts.surface.count()) > 0
				? [
						...(await parts.surface.evaluate((element) => {
							const style = getComputedStyle(element);
							return [style.backgroundColor, style.borderTopLeftRadius];
						})),
						await rowShadow(parts.surface),
					]
				: undefined,
	};
	const expected: Record<string, unknown> = {
		tile: {
			decorative: true,
			gradient: true,
			icon: [24, await tokenColor(page, "surface-base")],
			year: {
				text: "2569",
				colour: await tokenColor(page, "accent-warm"),
				size: 13,
				weight: "600",
			},
		},
		bareTile: {
			decorative: true,
			gradient: true,
			icon: [24, await tokenColor(page, "surface-base")],
			year: null,
		},
		factsParts: [type.label, "•", thaiDate(in2032(1, 2)), "•", "ปีงบประมาณ 2569"],
		factsStyle: { size: 13, weight: "400", colour: secondary, underline: false },
		bareFacts: [thaiDate(bareAt)],
		// The title's colour as the Announcement row's.
		titleColour: primary,
		summaryStyle: { size: 14, weight: "500", colour: secondary, underline: false },
		period: { size: 13, weight: "400", colour: secondary, underline: false },
		// The bare row shows its publication date and its title, and nothing else.
		bareText: [thaiDate(bareAt), bare.title],
		// At rest, the `card` shadow.
		surface: [await tokenColor(page, "surface-base"), "22px", "card"],
	};
	for (const width of [1440, 1024, 1023, 768, 640, 639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		const wide = width >= 640;
		const [upper, lower] = [
			await boxOf(row, "the first row"),
			await boxOf(rowAfter(row), "the next row"),
		];
		const tile = (await parts.tile.count()) > 0 ? await boxOf(parts.tile, "the tile") : undefined;
		seen[width] = {
			tile: tile && [Math.round(tile.width), Math.round(tile.height)],
			yearUnderIcon:
				tile &&
				(await parts.tile.evaluate((element) => {
					const [icon, year] = [element.querySelector("svg"), element.querySelector("span")];
					return (
						!!icon &&
						!!year &&
						year.getBoundingClientRect().top >= icon.getBoundingClientRect().bottom
					);
				})),
			// The surface's padding: top, right, bottom, left.
			padding:
				(await parts.surface.count()) > 0
					? await parts.surface.evaluate((element) => {
							const style = getComputedStyle(element);
							return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
						})
					: undefined,
			titleSize: (await textStyle(parts.title)).size,
			title: await shownLines(parts.title),
			summary: (await summary.isVisible()) ? await shownLines(summary) : "hidden",
			arrow: await parts.arrow.isVisible(),
			links: await row.getByRole("link").count(),
			linkCoversRow: await linkCoversRow(row),
			gap: Math.round(lower.y - (upper.y + upper.height)),
		};
		expected[width] = {
			tile: wide ? [92, 92] : [68, 68],
			yearUnderIcon: true,
			// The Announcement row's.
			padding: wide ? ["18px", "22px", "18px", "18px"] : ["12px", "12px", "12px", "12px"],
			titleSize: wide ? 18 : 16,
			title: { lines: 2, clamped: true },
			summary: wide ? { lines: 2, clamped: true } : "hidden",
			arrow: wide,
			links: 1,
			linkCoversRow: true,
			gap: 14,
		};
	}
	expect(seen, "the row's parts").toEqual(expected);
});

test("a report row's facts line wraps between its facts, and inside a fact only when that fact alone is wider than the line", async ({
	page,
}) => {
	const shortType = await createTerm("report_type", "รายงานสถานการณ์โรค");
	const longType = await createTerm(
		"report_type",
		"รายงานที่มีชื่อประเภทรายงานยาวกว่าหนึ่งบรรทัดของแถวบนจอแคบและจอขนาดกลางของแท็บเล็ต",
	);
	const between = await createReport("facts-between", {
		data: { report_at: in2032(2, 2), fiscal_year: 2569 },
		taxonomies: { report_type: [shortType.slug] },
	});
	const inside = await createReport("facts-inside", {
		data: { report_at: in2032(2, 1) },
		taxonomies: { report_type: [longType.slug] },
	});
	for (const report of [between, inside]) await publishLeading(report);

	await page.goto("/health/reports");
	/** The line's lines, and each fact's lines and whether it alone is wider than the line. */
	const factsOf = (report: DraftFixture, fact: string) =>
		reportFacts(listedItem(page, report.title), fact).evaluate((line) => {
			const lineHeight = parseFloat(getComputedStyle(line).lineHeight);
			const lines = (part: Element) =>
				Math.round(part.getBoundingClientRect().height / lineHeight) > 1 ? "more" : 1;
			const facts = [...line.children].filter(
				(part) => part.getAttribute("aria-hidden") !== "true",
			);
			return {
				lines: lines(line),
				facts: facts.map((fact) => {
					// The fact on one line, in the line's own type.
					const alone = fact.cloneNode(true) as HTMLElement;
					alone.style.cssText = "position:absolute;white-space:nowrap;visibility:hidden";
					line.append(alone);
					const width = alone.getBoundingClientRect().width;
					alone.remove();
					return { lines: lines(fact), widerThanLine: width > line.clientWidth };
				}),
			};
		});
	/** Whether each fact takes more than one line exactly when it alone is wider than the line. */
	const ruleHolds = (line: Awaited<ReturnType<typeof factsOf>>) =>
		line.facts.every((fact) => (fact.lines === "more") === fact.widerThanLine);
	const seen: Record<string, unknown> = { rule: {} };
	const rule = seen.rule as Record<number, unknown>;
	for (const width of [1440, 640, 320]) {
		await page.setViewportSize({ width, height: 900 });
		const read = {
			between: await factsOf(between, shortType.label),
			inside: await factsOf(inside, longType.label),
		};
		rule[width] = [ruleHolds(read.between), ruleHolds(read.inside)];
		if (width !== 320) seen[width] = read;
	}
	const one = { lines: 1, widerThanLine: false };
	// A term's label opens with the suites' mark, so a synthetic fact is long: at 640 px the first
	// row's three facts fit the line apart, not together, and the second row's type alone is wider.
	const expected = {
		// At 320 px, with the least room, which facts wrap depends on the labels; the rule holds.
		rule: { 1440: [true, true], 640: [true, true], 320: [true, true] },
		1440: {
			between: { lines: 1, facts: [one, one, one] },
			inside: { lines: 1, facts: [one, one] },
		},
		640: {
			between: { lines: "more", facts: [one, one, one] },
			inside: { lines: "more", facts: [{ lines: "more", widerThanLine: true }, one] },
		},
	};
	expect(seen, "where the facts line wraps").toEqual(expected);
});

test("under the pointer a report row moves 10 px to the right with the deep shadow only when motion is allowed, and its title turns brand-primary either way; a press on the row away from its title, and on the strip the moved row left, opens the report; the keyboard reaches each row once, its ring banded over the field", async ({
	page,
}) => {
	const first = await createReport("hover-first", { data: { report_at: in2032(3, 2) } });
	const second = await createReport("hover-second", { data: { report_at: in2032(3, 1) } });
	for (const report of [first, second]) await publishLeading(report);
	const reportPage = `/health/reports/${first.slug}`;
	const surfaceOf = (row: Locator) => movingSurface(row, "report-surface");
	const pointAtEdge = (row: Locator) => pointAtRowEdge(page, row);
	/** What the row shows under the pointer: its surface, its title's colour, its arrow's circle. */
	const underPointer = async (row: Locator) => {
		const { title, arrow } = reportRowParts(row);
		return {
			surface: await surfaceOf(row),
			title: (await textStyle(title)).colour,
			arrow:
				(await arrow.count()) > 0
					? await arrow
							.locator("xpath=..")
							.evaluate((circle) => getComputedStyle(circle).backgroundColor)
					: undefined,
		};
	};
	/** Press `row` at `point`, and the page it opens, or the list when it opens none. */
	const opensFrom = async (row: Locator, point: { x: number; y: number }, label: string) => {
		await pressInside(page, row, point, label);
		// A press that opens nothing leaves the list: the reading follows either way.
		await page.waitForURL(/\/health\/reports\/./, { timeout: 5_000 }).catch(() => undefined);
		return new URL(page.url()).pathname;
	};

	// One focus stop each, in order; the first row lies over the field's edge.
	await page.goto("/health/reports");
	const firstRow = listedItem(page, first.title);
	await firstRow.getByRole("link").focus();
	await page.keyboard.press("Tab");
	await expect(
		listedItem(page, second.title).getByRole("link"),
		"the next row's link follows",
	).toBeFocused();
	await firstRow.getByRole("link").focus();
	const band = await firstRow
		.getByRole("link")
		.evaluate((link) => getComputedStyle(link).boxShadow);

	const still = await pointAtEdge(firstRow);
	const stillRow = await underPointer(firstRow);
	// Away from the title: the row's lower right, under the arrow and clear of the rounded corner.
	const place = await boxOf(firstRow, "the row's place");
	const fromCorner = await opensFrom(
		firstRow,
		{ x: place.x + place.width - 30, y: place.y + place.height - 8 },
		"the row's lower right",
	);

	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/health/reports");
	const row = listedItem(page, first.title);
	const moving = await pointAtEdge(row);
	const movedRow = await underPointer(row);
	const fromStrip = await opensFrom(row, moving.edge, "the part the row left");
	const [brandPrimary, accentWarm] = [
		await tokenColor(page, "brand-primary"),
		await tokenColor(page, "accent-warm"),
	];
	expect(
		{ band, stillRow, movedRow, fromCorner, fromStrip },
		"the row under the pointer, and its ring",
	).toEqual({
		// The first row lies over the field's edge: its ring has a white band on both sides.
		band: expect.stringContaining(`${await tokenColor(page, "surface-base")} 0px 0px 0px 7px`),
		stillRow: {
			surface: { x: still.x, shadow: "card" },
			title: brandPrimary,
			arrow: accentWarm,
		},
		movedRow: {
			surface: { x: moving.x + 10, shadow: "deep" },
			title: brandPrimary,
			arrow: accentWarm,
		},
		fromCorner: reportPage,
		fromStrip: reportPage,
	});
});

test("/health/reports pages through older Health Reports in the same order, with the page number in the address", async ({
	page,
}) => {
	const fixtures: DraftFixture[] = [];
	for (let index = 0; index <= REPORTS_PAGE_SIZE; index += 1) {
		const day = String(index + 1).padStart(2, "0");
		fixtures.push(
			await createReport(`page-${day}`, { data: { report_at: `2031-01-${day}T03:00:00.000Z` } }),
		);
	}
	// Published latest-dated first, so the publication order is the reverse of the report order.
	for (const report of fixtures.toReversed()) await publishReport(report);
	const latestFirst = fixtures.toReversed().map((report) => report.title);

	await page.goto("/health/reports");
	expect(ownTitles(await listedTitles(page), fixtures), "the first page").toEqual(
		latestFirst.slice(0, REPORTS_PAGE_SIZE),
	);
	const pagination = page.getByRole("navigation", { name: "การแบ่งหน้า" });
	await expect(pagination.getByRole("link", { name: "หน้าก่อนหน้า" })).toHaveCount(0);
	await pagination.getByRole("link", { name: "หน้าถัดไป" }).click();
	await expect(page).toHaveURL(/\/health\/reports\?page=2$/);
	expect(ownTitles(await listedTitles(page), fixtures), "the second page").toEqual(
		latestFirst.slice(REPORTS_PAGE_SIZE),
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/health/reports?page=2`,
	);
	await expect(
		page
			.getByRole("navigation", { name: "การแบ่งหน้า" })
			.getByRole("link", { name: "หน้าก่อนหน้า" }),
	).toHaveAttribute("href", "/health/reports");

	const beyond = await page.goto("/health/reports?page=10000");
	expect(beyond?.status(), "a page past the end is not an error").toBe(200);
	await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("ไม่พบรายงานสุขภาพในหน้านี้")).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: "กลับไปหน้าแรกของรายการ" }),
	).toHaveAttribute("href", "/health/reports");
});

test("a Health Report page shows its summary, type, report date, reporting period, fiscal year and source, and links to its report Document", async ({
	page,
}) => {
	const type = await createTerm("report_type", "รายงานประจำปี");
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปรายงานสถานการณ์สุขภาพ`;
	const source = `${SYNTHETIC_FIXTURE_MARK} กลุ่มงานควบคุมโรค`;
	const report = await createReport("detail", {
		data: {
			summary,
			// 23 Sep 2026 17:30 UTC is already 24 Sep in Bangkok.
			report_at: "2026-09-23T17:30:00.000Z",
			reporting_period: "ตุลาคม 2568 – กันยายน 2569",
			fiscal_year: 2569,
			owner_source: source,
		},
		taxonomies: { report_type: [type.slug] },
	});
	await publishReport(report);

	const response = await page.goto(`/health/reports/${report.slug}`);
	expect(response?.status(), "GET the Health Report page").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(report.title);
	await expect(main.getByText(summary)).toBeVisible();
	await expect(detailOf(page, "ประเภทรายงาน")).toHaveText(type.label);
	await expect(detailOf(page, "วันที่รายงาน")).toHaveText("24 ก.ย. 2569");
	await expect(detailOf(page, "ช่วงเวลาของรายงาน")).toHaveText("ตุลาคม 2568 – กันยายน 2569");
	await expect(detailOf(page, "ปีงบประมาณ")).toHaveText("2569");
	await expect(detailOf(page, "เจ้าของ/แหล่งที่มา")).toHaveText(source);

	const documentSection = main.getByRole("region", { name: "เอกสารรายงาน" });
	await expect(
		documentSection.getByRole("link", { name: reportDocument.title, exact: true }),
		"the report Document's own page",
	).toHaveAttribute("href", `/documents/${reportDocument.slug}`);
	// The report's file downloads from the report page itself (Product Owner, 2026-10-30: #59
	// comment 6515961560).
	const download = documentSection.getByRole("link", { name: /ดาวน์โหลด/ });
	await expect(download).toHaveAttribute(
		"href",
		`/_emdash/api/media/file/${reportDocument.file.storageKey}`,
	);
	await expect(download).toHaveAttribute("download", reportDocument.file.filename);
	await expect(download).toContainText("PDF, 2 KB");

	await expect(healthNavItem(page)).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.health, REPORTS_CRUMB], report.title);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/health/reports/${report.slug}`,
	);
	// The file's type and size under the Document's title, as a Document's page states them.
	await expect(documentSection.getByText("PDF, 2 KB", { exact: true })).toBeVisible();
});

/** A Health Report's summary in two lines, as staff typed them. */
const REPORT_SUMMARY = `${SYNTHETIC_FIXTURE_MARK} สรุปสถานการณ์โรคไข้เลือดออก\nรายตำบลประจำไตรมาส`;

/** The report date the page fixtures carry, 23 Sep 2026 17:30 UTC, already 24 Sep in Bangkok. */
const REPORT_AT = "2026-09-23T17:30:00.000Z";
const REPORT_DAY = "24 ก.ย. 2569";

test.describe("a Health Report's page on the field", () => {
	type WithDocument = DraftFixture & { document: DraftFixture & { file: SyntheticPdf } };
	/** Every field, its Document's file 11.8 KB: both pills, the summary, the file, every detail. */
	let full: WithDocument & { type: SyntheticTerm };
	/** A Report Type and no report date: the type's pill alone, never its publication date. */
	let typeOnly: DraftFixture & { type: SyntheticTerm };
	/** A report date and no Report Type: the date's pill alone. */
	let dateOnly: DraftFixture;
	/** No type, date, summary or detail: no row of pills, and a card that holds the file alone. */
	let bare: DraftFixture;
	/** Its Document unpublished: the report's unavailable notice, then its fiscal year. */
	let unpublished: WithDocument;
	/** Its Document's file deleted: the same notice. */
	let fileGone: WithDocument;
	const pathOf = (fixture: DraftFixture) => `/health/reports/${fixture.slug}`;

	test.beforeAll(async () => {
		const type = await createTerm("report_type", "รายงานสถานการณ์โรค");
		const document = await createSyntheticDocument(admin, "field-full", {
			// 11.8 KB, a size whose words take two lines of the download at 320 px.
			file: await uploadSyntheticPdf(admin, undefined, 12_083),
		});
		await publishEntryAt(admin, "documents", document.id);
		const created = await createReport("field-full", {
			document,
			data: {
				summary: REPORT_SUMMARY,
				report_at: REPORT_AT,
				reporting_period: "ตุลาคม 2568 – กันยายน 2569",
				fiscal_year: 2569,
				owner_source: `${SYNTHETIC_FIXTURE_MARK} กลุ่มงานควบคุมโรค`,
			},
			taxonomies: { report_type: [type.slug] },
		});
		full = { ...created, type, document };
		const typed = await createReport("field-type-only", {
			taxonomies: { report_type: [type.slug] },
		});
		typeOnly = { ...typed, type };
		dateOnly = await createReport("field-date-only", { data: { report_at: REPORT_AT } });
		bare = await createReport("field-bare");
		const draftDocument = await createSyntheticDocument(admin, "field-unpublished");
		unpublished = {
			...(await createReport("field-unpublished", {
				document: draftDocument,
				data: { fiscal_year: 2569 },
			})),
			document: draftDocument,
		};
		const goneDocument = await createSyntheticDocument(admin, "field-file-gone");
		await publishEntryAt(admin, "documents", goneDocument.id);
		fileGone = {
			...(await createReport("field-file-gone", {
				document: goneDocument,
				data: { fiscal_year: 2569 },
			})),
			document: goneDocument,
		};
		for (const fixture of [full, typeOnly, dateOnly, bare, unpublished, fileGone]) {
			await publishReport(fixture);
		}
		const removed = await deleteMedia(admin, goneDocument.file.mediaId);
		expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);
	});

	test("the page opens on the deep field: the breadcrumb in white, 24 px under it วันที่รายงาน and the report date in an accent-warm pill, only when the report has a report date and never its publication date, then its Report Type in an outlined white pill, the title as the page's one H1 in today's sizes and the summary with the line breaks staff typed, each on the field, 48 rem wide at most; a pill the report lacks is left out, and so is the row without a pill", async ({
		page,
	}) => {
		const parts = fieldParts(page);
		// What today's page already shows: one H1 in its sizes.
		await page.goto(pathOf(full));
		await expectPostTitleSizes(page);

		const white = await tokenColor(page, "surface-base");
		const onField = (await parts.field.count()) === 1;
		const date = parts.field.getByText(`วันที่รายงาน ${REPORT_DAY}`, { exact: true });
		const type = parts.field.getByText(full.type.label, { exact: true });
		const seen: Record<string, unknown> = { field: onField };
		const expected: Record<string, unknown> = { field: true };
		for (const viewport of [MOBILE_VIEWPORT, PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
			if (!onField) break;
			await page.setViewportSize(viewport);
			const at = `at ${viewport.width} px`;
			const field = await boxOf(parts.field, `${at}: the field`);
			const crumbs = await boxOf(parts.breadcrumb, `${at}: the breadcrumb`);
			const dateBox = await boxOf(date, `${at}: the report date's pill`);
			const typeBox = await boxOf(type, `${at}: the type's pill`);
			const title = await boxOf(parts.title, `${at}: the title`);
			seen[viewport.width] = {
				onField: [crumbs, dateBox, typeBox, title].every(
					(box) => box.y >= field.y && box.y + box.height <= field.y + field.height,
				),
				pillsUnderCrumbs: Math.round(dateBox.y - crumbs.y - crumbs.height),
				// The type follows the date on its row, or, with no room left on it, starts the next
				// row 8 px under it at the row's start.
				typeAfterDate:
					Math.abs(typeBox.y - dateBox.y) <= 1
						? typeBox.x > dateBox.x + dateBox.width
						: Math.round(typeBox.x - dateBox.x) === 0 &&
							Math.round(typeBox.y - dateBox.y - dateBox.height) === 8,
				titleUnderPills:
					title.y >= Math.max(dateBox.y + dateBox.height, typeBox.y + typeBox.height),
				headerWidth: Math.round((await boxOf(parts.header, `${at}: the header`)).width),
				pills: { date: await pillStyle(date), type: await pillStyle(type) },
				white: [
					await parts.breadcrumb
						.getByRole("link")
						.first()
						.evaluate((link) => getComputedStyle(link).color),
					await parts.breadcrumb
						.locator('[aria-current="page"]')
						.evaluate((crumb) => getComputedStyle(crumb).color),
					await parts.title.evaluate((title) => getComputedStyle(title).color),
				],
			};
			expected[viewport.width] = {
				onField: true,
				pillsUnderCrumbs: 24,
				typeAfterDate: true,
				titleUnderPills: true,
				headerWidth: Math.min(HEADER_WIDEST, viewport.width - 2 * gutterAt(viewport.width)),
				pills: {
					date: {
						fill: await tokenColor(page, "accent-warm"),
						colour: await tokenColor(page, "brand-dark"),
						type: ["13px", "20px", "600"],
						edge: "1px",
					},
					type: {
						fill: "rgba(0, 0, 0, 0)",
						colour: white,
						type: ["13px", "20px", "600"],
						edge: "1px",
					},
				},
				white: [white, white, white],
			};
		}

		await page.setViewportSize(DESKTOP_VIEWPORT);
		const summary = parts.header.getByText(REPORT_SUMMARY.split("\n")[0]!);
		seen.summary = onField && {
			text: await summary.innerText(),
			shown: await shownLines(summary),
			colour: await summary.evaluate((text) => getComputedStyle(text).color),
			// body-large, 18 / 30.
			type: await summary.evaluate((text) => {
				const style = getComputedStyle(text);
				return [style.fontSize, style.lineHeight];
			}),
			underTitle:
				(await boxOf(summary, "the summary")).y >=
				(await boxOf(parts.title, "the title")).y + (await boxOf(parts.title, "the title")).height,
		};
		expected.summary = {
			text: REPORT_SUMMARY,
			shown: { lines: 2, clamped: false },
			colour: white,
			type: ["18px", "30px"],
			underTitle: true,
		};

		/** The words of the row that holds `pill`, or "no pill". */
		/** The terms of the card's details, in order. */
		const terms = () => parts.card.locator("dl").getByRole("term").allInnerTexts();
		const rowOf = async (pill: Locator) =>
			(await pill.count()) === 1 ? (await pill.locator("xpath=..").innerText()).trim() : "no pill";
		// A report without a report date: its type's pill alone, and no date in the header, not even
		// its publication date.
		await page.goto(pathOf(typeOnly));
		seen.typeOnly = onField && {
			row: await rowOf(parts.field.getByText(typeOnly.type.label, { exact: true })),
			dates: await parts.header.locator("time").count(),
			details: await terms(),
		};
		expected.typeOnly = { row: typeOnly.type.label, dates: 0, details: ["ประเภทรายงาน"] };

		// A report date without a type: its date's pill alone.
		await page.goto(pathOf(dateOnly));
		seen.dateOnly = onField && {
			row: await rowOf(parts.field.getByText(/^วันที่รายงาน /)),
			details: await terms(),
		};
		expected.dateOnly = { row: `วันที่รายงาน ${REPORT_DAY}`, details: ["วันที่รายงาน"] };

		// Neither: no row of pills, the title 24 px under the breadcrumb.
		await page.goto(pathOf(bare));
		const crumbs = onField && (await boxOf(parts.breadcrumb, "the bare report's breadcrumb"));
		seen.bare =
			crumbs &&
			Math.round(
				(await boxOf(parts.title, "the bare report's title")).y - crumbs.y - crumbs.height,
			);
		expected.bare = 24;
		expect(seen, "the header on the field").toEqual(expected);
	});

	test("the card starts 48 px above the field's lower edge below 640 px and 56 px from 640 px, where the header ends 80 and 96 px above it: white, radius 24, the deep shadow, 20 px inside, in the text column at most 48 rem wide, whether it holds the file and the details, the file alone or the unavailable notice; nothing is past the window at 375 or 320 px", async ({
		page,
	}) => {
		const widths = [320, 375, 639, 640, 1440];
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		for (const fixture of [full, bare, unpublished]) {
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
			seen[fixture.title] = { card: await cardOverFieldEdge(page, widths), past };
			expected[fixture.title] = {
				card: await cardOverFieldEdgeAsSpecified(page, widths),
				past: [0, 0],
			};
		}
		expect(seen, "the card over the field's edge").toEqual(expected);
	});

	test("the card holds first the report Document: the tile with file-text and the type in accent-warm, 68 px below 640 px and 92 px from 640 px, beside it the H2 เอกสารรายงาน, the Document's title as a semibold brand-primary underlined link to its page and the type and size under it, and the download ดาวน์โหลดเอกสาร with the type and size, at the card's right and 52 px high from 640 px, across the card under them below 640 px; then a 1 px border-default rule and the details, 20 px apart", async ({
		page,
	}) => {
		await page.goto(pathOf(full));
		const block = fileBlockOf(fieldParts(page).card, "เอกสารรายงาน", "PDF, 11.8 KB");
		const title = block.card.getByRole("link", { name: full.document.title, exact: true });
		const look = await fileBlockLook(block);
		const seen: Record<string, unknown> = {
			parts: look,
			title:
				(await title.count()) === 1 &&
				(await title.evaluate((link) => {
					const style = getComputedStyle(link);
					return {
						href: link.getAttribute("href"),
						colour: style.color,
						underline: style.textDecorationLine,
						weight: style.fontWeight,
					};
				})),
		};
		const expected: Record<string, unknown> = {
			parts: await fileBlockLookAsSpecified(page, "PDF", full.document.file),
			title: {
				href: `/documents/${full.document.slug}`,
				colour: await tokenColor(page, "brand-primary"),
				underline: "underline",
				weight: "600",
			},
		};
		for (const width of [320, 375, 639, 640, 1023, 1024, 1440]) {
			if (!look || !seen.title) break;
			seen[width] = await fileBlockAt(block, [title.locator("xpath=.."), block.typeAndSize], width);
			// The type and size stay on one line, and the words take two lines at 320 px.
			expected[width] = fileBlockAsSpecified(width, { lines: 2, wordLines: width === 320 ? 2 : 1 });
		}
		expect(seen, "the card's file block, rule and details").toEqual(expected);
	});

	test("a report whose Document is not published, or whose Document's file was deleted, answers 200 and shows first in its card the H2 เอกสารรายงาน and the notice เอกสารรายงานไม่พร้อมให้บริการ with ติดต่อเรา, without a tile, a download or a link to the Document, then the rule and the details; a report with no detail has its file alone, without the rule", async ({
		page,
	}) => {
		const main = page.getByRole("main");
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		for (const [name, fixture] of [
			["unpublished", unpublished],
			["fileGone", fileGone],
		] as const) {
			const response = await page.goto(pathOf(fixture));
			const card = fieldParts(page).card;
			const notice = await unavailableNoticeIn(
				card,
				"เอกสารรายงาน",
				"เอกสารรายงานไม่พร้อมให้บริการ",
			);
			seen[name] = {
				status: response?.status(),
				notice: notice && {
					...notice,
					rule: await card.getByRole("separator").count(),
					fiscalYear: await card.locator("dl").getByText("2569", { exact: true }).count(),
				},
				fileNotices: await main.getByText("ไฟล์ไม่พร้อมให้บริการ").count(),
				tiles: await main.locator("svg.lucide-file-text").count(),
				downloads: await main.getByRole("link", { name: /ดาวน์โหลด/ }).count(),
				documentLinks: await main.locator(`a[href="/documents/${fixture.document.slug}"]`).count(),
			};
			expected[name] = {
				status: 200,
				notice: {
					headingFirst: 20,
					noticeUnderHeading: true,
					asks: 1,
					contact: "/contact",
					rule: 1,
					fiscalYear: 1,
				},
				fileNotices: 0,
				tiles: 0,
				downloads: 0,
				documentLinks: 0,
			};
		}

		await page.goto(pathOf(bare));
		const card = fieldParts(page).card;
		seen.bare = {
			downloads: await card.getByRole("link", { name: /^ดาวน์โหลดเอกสาร / }).count(),
			rules: await card.getByRole("separator").count(),
			details: await card.locator("dl").count(),
		};
		expected.bare = { downloads: 1, rules: 0, details: 0 };
		expect(seen, "the unavailable notice first in the card, and a card without details").toEqual(
			expected,
		);
	});

	test("with motion allowed the header rises in as the page opens and the card after it, while the breadcrumb shows at once", async ({
		page,
	}) => {
		const parts = fieldParts(page);
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(pathOf(full), { waitUntil: "commit" });
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		const onField = (await parts.field.count()) === 1 && (await parts.card.count()) === 1;
		const headerEnters = onField ? await entersAfter(parts.title) : "no field";
		const seen = {
			title: headerEnters,
			cardAfterHeader: onField && (await entersAfter(parts.card)) > Number(headerEnters),
			breadcrumb: onField ? await entersAfter(parts.breadcrumb) : "no field",
		};
		await page.emulateMedia({ reducedMotion: "reduce" });
		expect(seen, "the header and the card rise in; the breadcrumb shows at once").toEqual({
			title: 0,
			cardAfterHeader: true,
			breadcrumb: -1,
		});
	});
});

test("a draft, unpublished or trashed Health Content or Health Report answers the site 404 and stays out of every list", async ({
	page,
}) => {
	const topic = await createTerm("topic", "อนามัยแม่และเด็ก");
	const tagged = { taxonomies: { topic: [topic.slug] } };
	for (const [collection, create, publish, path, lists] of [
		[
			"health_content",
			(label: string) => createContent(label, tagged),
			publishContent,
			"/health/content",
			["/health/content", `/health/content?topic=${topic.slug}`],
		],
		[
			"health_reports",
			(label: string) => createReport(label, tagged),
			publishReport,
			"/health/reports",
			["/health/reports"],
		],
	] as const) {
		const draft = await create("hidden-draft");
		const unpublished = await create("hidden-unpublished");
		const trashed = await create("hidden-trashed");
		await publish(unpublished);
		await publish(trashed);
		expect((await unpublishEntry(admin, collection, unpublished.id)).ok, "unpublish").toBe(true);
		expect((await trashEntry(admin, collection, trashed.id)).ok, "trash").toBe(true);
		const hidden = [draft, unpublished, trashed];

		for (const entry of hidden) {
			await expectSiteNotFound(page, `${path}/${entry.slug}`, entry.title);
		}
		for (const list of lists) {
			await page.goto(list);
			expect(ownTitles(await listedTitles(page), hidden), `${list} hides them`).toEqual([]);
		}
	}
});

test("a signed preview link renders a draft Health Content or Health Report, kept out of search engines", async ({
	page,
}) => {
	for (const [collection, draft, path] of [
		["health_content", await createContent("preview"), "/health/content"],
		["health_reports", await createReport("preview"), "/health/reports"],
	] as const) {
		await expectPreviewRenders(page, admin, collection, draft, `${path}/${draft.slug}`);
	}
});

test("the Health Information pages carry their title and description, with the summary or the SEO fields on an entry's page", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปสำหรับเครื่องมือค้นหา`;
	const content = await createContent("seo-plain", { data: { summary } });
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} ชื่อรายงานสำหรับเครื่องมือค้นหา`;
	const seoDescription = `${SYNTHETIC_FIXTURE_MARK} คำอธิบายจากช่อง SEO`;
	const report = await createReport("seo-tuned", {
		data: { summary },
		seo: { title: seoTitle, description: seoDescription },
	});
	await publishContent(content);
	await publishReport(report);
	const description = page.locator('meta[name="description"]');

	for (const [path, title] of [
		["/health", "ข้อมูลสุขภาพ"],
		["/health/content", "ความรู้สุขภาพ"],
		["/health/reports", "รายงานสุขภาพ"],
	]) {
		await page.goto(path);
		await expect(page).toHaveTitle(`${title}${separator}${siteTitle}`);
		await expect(description, `${path} has a description`).toHaveAttribute("content", /\S/);
	}

	await page.goto(`/health/content/${content.slug}`);
	await expect(page).toHaveTitle(`${content.title}${separator}${siteTitle}`);
	await expect(description).toHaveAttribute("content", summary);

	await page.goto(`/health/reports/${report.slug}`);
	await expect(page).toHaveTitle(`${seoTitle}${separator}${siteTitle}`);
	await expect(description).toHaveAttribute("content", seoDescription);
});

test.describe("accessibility and reflow", () => {
	let content: DraftFixture;
	let report: DraftFixture;
	/** A report whose Document is not published: the card's unavailable notice. */
	let unavailable: DraftFixture;

	test.beforeAll(async () => {
		const topic = await createTerm("topic", "โรคติดต่อ");
		const type = await createTerm("report_type", "รายงานสถานการณ์โรค");
		content = await createContent("a11y", {
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} สรุปความรู้สำหรับตรวจการเข้าถึง`,
				body: [portableTextBlock(`${SYNTHETIC_FIXTURE_MARK} เนื้อหาความรู้`)],
				source_text: `${SYNTHETIC_FIXTURE_MARK} แหล่งที่มา`,
				featured_image: {
					id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพประกอบความรู้`),
				},
				reviewed_at: "2026-09-01T03:00:00.000Z",
			},
			taxonomies: { topic: [topic.slug] },
		});
		report = await createReport("a11y", {
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} สรุปรายงานสำหรับตรวจการเข้าถึง`,
				report_at: "2030-01-01T03:00:00.000Z",
				reporting_period: "ปีงบประมาณ 2569",
				fiscal_year: 2569,
				owner_source: `${SYNTHETIC_FIXTURE_MARK} กลุ่มงาน`,
			},
			taxonomies: { report_type: [type.slug], topic: [topic.slug] },
		});
		unavailable = await createReport("a11y-unavailable", {
			document: await createSyntheticDocument(admin, "a11y-unpublished"),
			data: { report_at: "2030-01-01T03:00:00.000Z" },
			taxonomies: { report_type: [type.slug] },
		});
		await publishContent(content);
		await publishReport(report);
		await publishReport(unavailable);
	});

	const paths = () => [
		"/health",
		"/health/content",
		`/health/content/${content.slug}`,
		"/health/reports",
		`/health/reports/${report.slug}`,
		`/health/reports/${unavailable.slug}`,
	];

	testAccessibilityAndReflow("the Health Information pages", paths);
});

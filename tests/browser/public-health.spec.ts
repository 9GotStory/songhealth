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
// the site 404. An image in a body whose media item was deleted is left out.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Health Content, Health Reports, Documents, topic and report-type
// terms and media made through the native API, and removed afterwards. The runtime may hold other
// entries (the demo dataset, the Product Owner's own), so assertions look only at this suite's
// uniquely titled fixtures, or at a list narrowed to this suite's own Health Topic. Health Reports
// that must lead the list are dated from 2030 on, after any real report; the paging test's are
// dated latest, since earlier tests' fixtures stay until the suite ends.
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

import type { Page } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	createOwnedTerm,
	createSyntheticDocument,
	createSyntheticDraft,
	deleteMedia,
	deleteSyntheticTerms,
	devAdminActor,
	nativeRefusalOf,
	portableTextBlock,
	portableTextImage,
	publishEntryAt,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	uploadSyntheticMedia,
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
	MOBILE_VIEWPORT,
	SECTION_CRUMBS,
	VIEWPORTS,
	detailOf,
	expect,
	expectBreadcrumb,
	expectImageLoaded,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectPreviewRenders,
	expectSiteNotFound,
	expectVisibleFocusOnEveryStop,
	listedItem,
	listedTitles,
	ownTitles,
	siteTitleParts,
	test,
	thaiDate,
} from "./public.helpers";

/** The fixed number of Health Content items a list page shows. */
const CONTENT_PAGE_SIZE = 12;
/** The fixed number of Health Reports a list page shows. */
const REPORTS_PAGE_SIZE = 20;

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
) =>
	createSyntheticDraft(admin, "health_reports", "รายงานสุขภาพ", label, {
		...fields,
		references: { report_document: [document.id] },
	});

/** Publish now, or backdated to `publishedAt`. Returns the stored publication instant. */
const publishContent = (content: DraftFixture, publishedAt?: string) =>
	publishEntryAt(admin, "health_content", content.id, publishedAt);
const publishReport = (report: DraftFixture, publishedAt?: string) =>
	publishEntryAt(admin, "health_reports", report.id, publishedAt);

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

test.afterAll(async () => {
	if (admin === undefined) return;
	const failures: string[] = [];
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	if (!report.complete) failures.push(`owned fixtures left: ${JSON.stringify(report)}`);
	failures.push(...(await deleteSyntheticTerms(admin, ownedTerms)));
	expect(failures, "the suite's synthetic fixtures must all be removed").toEqual([]);
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
	const filter = page.getByRole("form", { name: "กรองความรู้สุขภาพ" });
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

	const unknown = await page.goto(`/health/content?topic=${syntheticSlug("no-such-topic")}`);
	expect(unknown?.status(), "an unknown topic is not an error").toBe(200);
	await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("ไม่พบความรู้สุขภาพในประเด็นนี้")).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: "ดูความรู้สุขภาพทุกประเด็น" }),
	).toHaveAttribute("href", "/health/content");

	const beyond = await page.goto("/health/content?page=10000");
	expect(beyond?.status(), "a page past the end is not an error").toBe(200);
	await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("ไม่พบความรู้สุขภาพในหน้านี้")).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: "กลับไปหน้าแรกของรายการ" }),
	).toHaveAttribute("href", "/health/content");
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
		documentSection.getByRole("link", { name: reportDocument.title }),
		"the report Document's own page",
	).toHaveAttribute("href", `/documents/${reportDocument.slug}`);
	await expect(documentSection.getByText("ไฟล์ PDF, 2 KB")).toBeVisible();
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
});

test("a Health Report whose report Document is not published says the report Document is unavailable, without a link to it", async ({
	page,
}) => {
	const draftDocument = await createSyntheticDocument(admin, "report-draft");
	const report = await createReport("document-draft", { document: draftDocument });
	await publishReport(report);

	const response = await page.goto(`/health/reports/${report.slug}`);
	expect(response?.status(), "the Health Report page still renders").toBe(200);
	const documentSection = page.getByRole("main").getByRole("region", { name: "เอกสารรายงาน" });
	await expect(documentSection.getByText("เอกสารรายงานไม่พร้อมให้บริการ")).toBeVisible();
	await expect(documentSection.getByRole("link", { name: "ติดต่อเรา" })).toHaveAttribute(
		"href",
		"/contact",
	);
	await expect(documentSection.getByText(draftDocument.title)).toHaveCount(0);
	await expect(
		page.getByRole("main").locator(`a[href="/documents/${draftDocument.slug}"]`),
	).toHaveCount(0);
	await expect(documentSection.getByRole("link", { name: /ดาวน์โหลด/ })).toHaveCount(0);
});

test("a Health Report whose report Document's file was deleted says so once, without a download", async ({
	page,
}) => {
	const document = await createSyntheticDocument(admin, "report-file-gone");
	await publishEntryAt(admin, "documents", document.id);
	const removed = await deleteMedia(admin, document.file.mediaId);
	expect(removed.ok, `deleting the file: ${nativeRefusalOf(removed)}`).toBe(true);
	const report = await createReport("document-file-gone", { document });
	await publishReport(report);

	const response = await page.goto(`/health/reports/${report.slug}`);
	expect(response?.status(), "the Health Report page still renders").toBe(200);
	const documentSection = page.getByRole("main").getByRole("region", { name: "เอกสารรายงาน" });
	await expect(documentSection.getByRole("link", { name: document.title })).toHaveAttribute(
		"href",
		`/documents/${document.slug}`,
	);
	await expect(documentSection.getByText("ไฟล์ไม่พร้อมให้บริการ")).toHaveCount(1);
	await expect(documentSection.getByRole("link", { name: /ดาวน์โหลด/ })).toHaveCount(0);
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
		await publishContent(content);
		await publishReport(report);
	});

	const paths = () => [
		"/health",
		"/health/content",
		`/health/content/${content.slug}`,
		"/health/reports",
		`/health/reports/${report.slug}`,
	];

	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on the Health Information pages at the ${width} width`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			for (const path of paths()) {
				const response = await page.goto(path);
				expect(response?.status(), `GET ${path}`).toBe(200);
				await expectNoAxeViolations(page, `${path} at ${width}`);
				await expectVisibleFocusOnEveryStop(page, `${path} at ${width}`);
			}
		});
	}

	test("no Health Information page scrolls sideways at 320 px", async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		for (const path of paths()) {
			await page.goto(path);
			await expectNoHorizontalScroll(page, path);
		}
	});
});

// About pages, Basic Pages and About Document pages (#60; spec #51 "Public reads" (Basic Pages,
// About), `03` §3, §5, §14 and §17).
//
// A citizen reads a published Basic Page at /pages/{slug}; a draft, unpublished or unknown one
// answers the site 404. The reserved Basic Pages `about` and `organization` render at /about and
// /about/organization, and their /pages/ addresses redirect there permanently. /about links to
// every About sub-page whether or not its own Basic Page exists. The footer links to the reserved
// Basic Pages `privacy` and `accessibility` only while they are published. /about/policies,
// /about/plans and /about/results list the published Documents of the Document Type `policy`,
// `plan` and `result`, newest publication first. Each opens on the deep field under the label
// เกี่ยวกับเรา, with /documents' rows and their downloads, its pager and its empty states over the
// field's lower edge (Feature 012 #366; spec #365 decisions 4 and 5; public.helpers.ts
// testListOnField).
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Basic Pages and Documents made through the native API the way
// the Admin makes them, and removed afterwards. The Document Types are the reference terms the
// model-update step adds; the suite uses them and leaves them.
//
// The runtime may already hold its own Basic Pages at the reserved slugs, and its own Documents of
// the About types (the demo dataset, the Product Owner's). A test that needs one of them in draft
// borrows it (public.helpers.ts BorrowedEntries), and afterEach publishes it again at its own
// publication date. /about/organization is requested only while a Basic Page is published there,
// so the suite leaves no real address in EmDash's 404 log.
//
// Platform behaviour relied on (emdash 1.1.0):
// - POST …/preview-url mints a draft's signed preview link at its URL pattern, /pages/{slug}
//   (src/astro/routes/api/content/[collection]/[id]/preview-url.ts), and the preview token travels
//   in the query string (src/preview/tokens.ts).

import type { Locator, Page } from "@playwright/test";

import {
	createSyntheticDocument,
	createSyntheticEntry,
	devAdminActor,
	mintPreviewLink,
	nativeItemOf,
	nativeRefusalOf,
	portableTextBlock,
	publishEntryAt,
	readEntry,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	unpublishEntry,
	uploadSyntheticPdf,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
} from "./cms.helpers";
import {
	BorrowedEntries,
	DESKTOP_VIEWPORT,
	HEADER_WIDEST,
	HOME_CRUMB,
	LeadingEntries,
	LIST_END,
	LIST_FIELD_LOOK,
	SECTION_CRUMBS,
	selfRunningEnds,
	boxOf,
	deepField,
	documentRowParts,
	entersAfter,
	expect,
	expectAboutSubpage,
	expectAccessibleAtEachWidth,
	expectAttentionLabelsOnOwnLine,
	expectBreadcrumb,
	expectNoHorizontalScroll,
	expectSecondLinkPlaces,
	expectSiteNotFound,
	fieldEdge,
	FIELD_EDGE,
	fieldParts,
	gutterAt,
	heldBack,
	itemsPerRow,
	listedItem,
	listedTitles,
	PHONE_VIEWPORT,
	ownTitles,
	placesAtTwoWidths,
	readHeaderOnField,
	readListField,
	ringsOverFieldUnbanded,
	shownLines,
	shownOpacity,
	shownWhole,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testListOnField,
	thaiDate,
	tokenColor,
	tokenShadow,
} from "./public.helpers";

/** The About sub-pages /about links to, in `01` §3 order. */
const ABOUT_SUBPAGES = [
	["โครงสร้างองค์กร", "/about/organization"],
	["ผู้บริหาร", "/about/leadership"],
	["บุคลากร", "/about/personnel"],
	["นโยบาย", "/about/policies"],
	["แผนงาน", "/about/plans"],
	["ผลการดำเนินงาน", "/about/results"],
] as const;

/**
 * The About Document pages, each with the Document Type it lists (spec #51), its lead and the icon
 * of its heading on the deep field (Feature 012 #366; spec #365 decision 4).
 */
const ABOUT_DOCUMENT_PAGES = [
	{
		path: "/about/policies",
		type: "policy",
		title: "นโยบาย",
		lead: "เอกสารนโยบายของสำนักงานสาธารณสุขอำเภอสอง",
		icon: "scroll-text",
	},
	{
		path: "/about/plans",
		type: "plan",
		title: "แผนงาน",
		lead: "เอกสารแผนงานของสำนักงานสาธารณสุขอำเภอสอง",
		icon: "clipboard-list",
	},
	{
		path: "/about/results",
		type: "result",
		title: "ผลการดำเนินงาน",
		lead: "เอกสารผลการดำเนินงานของสำนักงานสาธารณสุขอำเภอสอง",
		icon: "chart-column",
	},
] as const;

/** A title longer than two lines at every width, as /documents' longest row title. */
const LONG_TITLE =
	"ซึ่งมีชื่อเรื่องยาวเกินกว่าสองบรรทัดของหน้าทุกความกว้างของหน้าจอ แม้บนจอกว้างที่สุดที่หัวเรื่องมีพื้นที่มากที่สุด เพื่อดูว่าชื่อเรื่องยังอ่านได้ครบถ้วนและไม่ล้นขอบหน้าจอ พร้อมสรุป เนื้อหา และเอกสารที่เกี่ยวข้องทั้งหมด";

/** The fixed number of Documents an About Document page shows. */
const DOCUMENT_PAGE_SIZE = 20;

/** The footer's Basic Page links, in footer order (docs/design/homepage-concept-v1.md §12). */
const FOOTER_PAGES = [
	{ slug: "privacy", label: "นโยบายความเป็นส่วนตัว" },
	{ slug: "accessibility", label: "การเข้าถึงเว็บไซต์" },
] as const;

let admin: CmsActor;
let origin: string;

/** A synthetic Basic Page draft titled `${mark} หน้า ${label} ${ending}`, under `slug` if given. */
async function createPage(
	label: string,
	{ slug = syntheticSlug(label), data, ...fields }: DraftFields & { slug?: string } = {},
): Promise<DraftFixture> {
	const title = `${SYNTHETIC_FIXTURE_MARK} หน้า ${label} ${crypto.randomUUID().slice(0, 6)}`;
	const created = await createSyntheticEntry(admin, "pages", {
		data: { title, ...data },
		slug,
		...fields,
	});
	expect(created.result.ok, `Basic Page ${slug}: ${nativeRefusalOf(created.result)}`).toBe(true);
	return { id: created.entryId!, slug, title };
}

type Collection = "pages" | "documents";

/** What the running test borrowed; afterEach gives it back. */
const borrowed = new BorrowedEntries();

/** The runtime's own entry at `slug`, returned to draft for the running test. */
const borrow = (collection: Collection, slug: string) => borrowed.borrow(admin, collection, slug);

/**
 * The Basic Page at a reserved slug, as a draft for the running test: the runtime's own, borrowed,
 * or else a synthetic one showing `content`. A borrowed page comes without `content`: the suite
 * does not know its body.
 */
async function reservedPage(
	slug: string,
	content?: ReturnType<typeof pageContent>,
): Promise<{ fixture: DraftFixture; content?: ReturnType<typeof pageContent> }> {
	const own = await borrow("pages", slug);
	if (own) return { fixture: own };
	return { fixture: await createPage(slug, { slug, data: content && pageData(content) }), content };
}

/** A synthetic Document draft of the given Document Type, or of none. */
const createDocument = (label: string, type?: string) =>
	createSyntheticDocument(admin, label, type ? { taxonomies: { document_type: [type] } } : {});

/** Publish now, or a borrowed entry at its own publication date. */
async function publish(collection: Collection, fixture: DraftFixture): Promise<void> {
	await publishEntryAt(admin, collection, fixture.id, borrowed.publishedAtOf(fixture.id));
}

/** Return a published fixture to draft. */
async function unpublish(collection: Collection, fixture: DraftFixture): Promise<void> {
	const result = await unpublishEntry(admin, collection, fixture.id);
	expect(result.ok, `unpublish ${fixture.slug}: ${nativeRefusalOf(result)}`).toBe(true);
}

/** A summary and a body with a heading, as staff write a Basic Page. */
function pageContent(label: string) {
	return {
		summary: `${SYNTHETIC_FIXTURE_MARK} สรุปหน้า ${label}`,
		heading: `${SYNTHETIC_FIXTURE_MARK} หัวข้อในหน้า ${label}`,
		paragraph: `${SYNTHETIC_FIXTURE_MARK} เนื้อหาของหน้า ${label}`,
	};
}

function pageData(content: ReturnType<typeof pageContent>): Record<string, unknown> {
	return {
		summary: content.summary,
		body: [portableTextBlock(content.heading, "h2"), portableTextBlock(content.paragraph)],
	};
}

/** Fail unless the page shows the Basic Page's title, and its summary and body when known. */
async function expectBasicPage(
	page: Page,
	fixture: DraftFixture,
	content: ReturnType<typeof pageContent> | undefined,
): Promise<void> {
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(fixture.title);
	if (content === undefined) return;
	await expect(main.getByText(content.summary)).toBeVisible();
	await expect(main.getByRole("heading", { level: 2, name: content.heading })).toBeVisible();
	await expect(main.getByText(content.paragraph)).toBeVisible();
}

/** The main-navigation link to `label`. */
function navigationLink(page: Page, label: string) {
	return page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: label });
}

/** The footer's page links, by their text. */
async function footerLinks(page: Page): Promise<string[]> {
	// The footer's page links end in ติดต่อเรา; its official channels are a list of their own (#62).
	const pageLinks = page
		.getByRole("contentinfo")
		.getByRole("list")
		.filter({ hasText: "ติดต่อเรา" });
	return (await pageLinks.getByRole("link").allTextContents()).map((text) => text.trim());
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
});

test.afterEach(async () => {
	await borrowed.giveBack(admin);
});

test.afterAll(() => removeSuiteFixtures(admin));

// First in the suite, while the runtime holds only its own Documents (Feature 012 #366; spec #365
// decision 5): each About Document page opens on the deep field under the label เกี่ยวกับเรา, with
// its Document rows, its pager and its empty states over the field's lower edge, as /documents
// without its filter form (public.helpers.ts testListOnField).
for (const { path, type, title, lead, icon } of ABOUT_DOCUMENT_PAGES) {
	testListOnField({
		path,
		crumbs: [HOME_CRUMB, SECTION_CRUMBS.about],
		heading: { label: "เกี่ยวกับเรา", title, lead },
		icon,
		collection: "documents",
		pageSize: DOCUMENT_PAGE_SIZE,
		noneYet: `ยังไม่มีเอกสาร${title}`,
		pastLast: "ไม่พบเอกสารในหน้านี้",
		admin: () => admin,
		publishItem: async (label) => {
			const document = await createDocument(label, type);
			await publishEntryAt(admin, "documents", document.id, LIST_END);
			return document;
		},
		itemsMove: "rows",
	});
}

test("/about/policies, /about/plans and /about/results list only the published Documents of their own type, newest first", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const policyOlder = await createDocument("policy-older", "policy");
	const policyNewer = await createDocument("policy-newer", "policy");
	const policyDraft = await createDocument("policy-draft", "policy");
	const plan = await createDocument("plan", "plan");
	const result = await createDocument("result", "result");
	const untyped = await createDocument("untyped");
	for (const document of [policyOlder, plan, result, untyped, policyNewer]) {
		await publish("documents", document);
	}
	const all = [policyOlder, policyNewer, policyDraft, plan, result, untyped];
	const expected: Record<string, DraftFixture[]> = {
		policy: [policyNewer, policyOlder],
		plan: [plan],
		result: [result],
	};

	for (const { path, type, title } of ABOUT_DOCUMENT_PAGES) {
		const response = await page.goto(path);
		expect(response?.status(), `GET ${path}`).toBe(200);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
		await expect(page).toHaveTitle(`${title}${separator}${siteTitle}`);
		await expectAboutSubpage(page, path, title);
		expect(ownTitles(await listedTitles(page), all), `${path}: its own type, newest first`).toEqual(
			expected[type].map((document) => document.title),
		);
		const first = expected[type][0];
		await expect(
			listedItem(page, first.title).getByRole("link", { name: first.title, exact: true }),
		).toHaveAttribute("href", `/documents/${first.slug}`);
		await expect(listedItem(page, first.title)).toContainText(title);
	}
});

/** A summary longer than two lines of a row at every width from 640 px. */
const LONG_SUMMARY = `${SYNTHETIC_FIXTURE_MARK} ${"สรุปเอกสารของสำนักงานสาธารณสุขอำเภอสองสำหรับประชาชนและเครือข่ายบริการสุขภาพทุกตำบล ".repeat(6)}`;

/** When a Document of the rows' cases was written, as its facts line shows it. */
const DOCUMENT_AT = "2026-09-23T17:30:00.000Z";

// Feature 012 #366 (spec #365 "The About Document pages"): each page's rows are /documents' rows
// with their downloads (DocumentDownloadRow), titles H2, 14 px apart.
test.describe("an About Document page's rows", () => {
	/** Each page's three Documents, newest first: superseded, expired and current. */
	const rows = new Map<string, Array<DraftFixture & { file: { storageKey: string } }>>();
	/**
	 * They lead their lists until the block ends, then go back to draft (CODING_STANDARDS "Tests").
	 */
	const leading = new LeadingEntries();

	test.beforeAll(async () => {
		for (const { type } of ABOUT_DOCUMENT_PAGES) {
			const made = [];
			for (const status of ["superseded", "expired", "current"]) {
				made.push(
					await createSyntheticDocument(admin, `row-${type}-${status}`, {
						// 11.8 KB, a size whose words take two lines of the download at 320 px.
						file: await uploadSyntheticPdf(admin, undefined, 12_083),
						data: {
							summary: LONG_SUMMARY,
							document_at: DOCUMENT_AT,
							fiscal_year: 2569,
							domain_status: status,
						},
						taxonomies: { document_type: [type] },
					}),
				);
			}
			// The current one first, so the superseded one is the newest.
			for (const document of made.toReversed()) {
				await publishEntryAt(admin, "documents", document.id);
				leading.hold("documents", document);
			}
			rows.set(type, made);
		}
	});

	test.afterAll(() => leading.release(admin));

	test("the field of each About Document page has the corner glow and, from 1,024 px only, the large ring", async ({
		page,
	}) => {
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		for (const { path } of ABOUT_DOCUMENT_PAGES) {
			await page.goto(path);
			seen[path] = await readListField(page);
			expected[path] = LIST_FIELD_LOOK;
		}
		expect(seen, "the field's glow and ring").toEqual(expected);
	});

	test("each row on an About Document page: the file's tile with file-text and PDF; the facts line with the Document Type, the date and the fiscal year; the title as an H2 linking to its page; from 640 px the summary in two lines at most; the download named ดาวน์โหลด, the file's type and size and the title, linking to the file; exactly two links; rows 14 px apart", async ({
		page,
	}) => {
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		for (const { path, type, title } of ABOUT_DOCUMENT_PAGES) {
			const [first, second] = rows.get(type)!;
			await page.setViewportSize(DESKTOP_VIEWPORT);
			await page.goto(path);
			const row = listedItem(page, first!.title);
			const parts = documentRowParts(row);
			const summary = row.getByText(LONG_SUMMARY.trim());
			const facts = [title, thaiDate(DOCUMENT_AT), "ปีงบประมาณ 2569"];
			const factsLine = (await parts.facts.textContent()) ?? "";
			seen[path] = {
				tile:
					(await parts.tile.count()) === 1 ? (await parts.tile.textContent())?.trim() : "no tile",
				// What today's row already shows: its facts line.
				facts: facts.filter((fact) => factsLine.includes(fact)),
				href: await parts.title.getByRole("link").getAttribute("href"),
				download:
					(await parts.download.count()) === 1
						? {
								name: await parts.download.evaluate((link) =>
									link.textContent?.replace(/\s+/g, " ").trim(),
								),
								href: await parts.download.getAttribute("href"),
							}
						: "no download",
				links: await row.getByRole("link").count(),
			};
			expected[path] = {
				tile: "PDF",
				facts,
				href: `/documents/${first!.slug}`,
				download: {
					name: `ดาวน์โหลด (PDF, 11.8 KB) ${first!.title}`,
					href: `/_emdash/api/media/file/${first!.file.storageKey}`,
				},
				links: 2,
			};
			for (const width of [1440, 640, 639, 320]) {
				await page.setViewportSize({ width, height: 900 });
				const upper = await boxOf(row, "the first row");
				const lower = await boxOf(listedItem(page, second!.title), "the second row");
				seen[`${path} at ${width}`] = {
					summary: (await summary.isVisible()) ? await shownLines(summary) : "hidden",
					gap: Math.round(lower.y - (upper.y + upper.height)),
				};
				expected[`${path} at ${width}`] = {
					summary: width >= 640 ? { lines: 2, clamped: true } : "hidden",
					gap: 14,
				};
			}
		}
		expect(seen, "the rows' parts").toEqual(expected);
	});

	for (const { path, type } of ABOUT_DOCUMENT_PAGES) {
		test(`a superseded or an expired Document's row on ${path} shows its attention label on its own line between the facts and the title, and a current one shows none`, async ({
			page,
		}) => {
			const [superseded, expired, current] = rows.get(type)!;
			await page.goto(path);
			await expect(listedItem(page, current!.title)).not.toContainText(/ถูกแทนที่แล้ว|หมดอายุแล้ว/);
			await expectAttentionLabelsOnOwnLine(
				page,
				(
					[
						[superseded!, "ถูกแทนที่แล้ว"],
						[expired!, "หมดอายุแล้ว"],
					] as const
				).map(([document, label]) => {
					const row = listedItem(page, document.title);
					return { ...documentRowParts(row), row, label };
				}),
			);
		});

		test(`a row's download on ${path} sits at the row's right from 1,024 px, under the text at its start from 640 px to 1,023 px, and across the row under the tile and the text below 640 px`, async ({
			page,
		}) => {
			const [, , current] = rows.get(type)!;
			await page.goto(path);
			const row = listedItem(page, current!.title);
			const { tile, title, download } = documentRowParts(row);
			await expect(row.getByRole("link", { name: current!.title, exact: true })).toBeVisible();
			await expectSecondLinkPlaces(page, { row, tile, title, link: download }, "download");
		});
	}
});

test("/pages/{slug} renders a published Basic Page with its summary, body and related Documents, and answers 404 otherwise", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const related = await createDocument("related");
	const relatedDraft = await createDocument("related-draft");
	await publish("documents", related);
	const content = pageContent("basic");
	const basic = await createPage("basic", {
		data: pageData(content),
		references: { documents: [related.id, relatedDraft.id] },
	});
	const path = `/pages/${basic.slug}`;

	await expectSiteNotFound(page, path, "a draft Basic Page");
	await publish("pages", basic);

	const response = await page.goto(path);
	expect(response?.status(), `GET ${path}`).toBe(200);
	await expectBasicPage(page, basic, content);
	await expect(page).toHaveTitle(`${basic.title}${separator}${siteTitle}`);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}${path}`);
	await expect(page.locator('meta[name="description"]').first()).toHaveAttribute(
		"content",
		content.summary,
	);
	await expectBreadcrumb(page, [HOME_CRUMB], basic.title);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).locator("[aria-current]"),
		"a Basic Page belongs to no main-navigation section",
	).toHaveCount(0);
	const documents = page.getByRole("region", { name: "เอกสารที่เกี่ยวข้อง" });
	await expect(documents.getByRole("link", { name: related.title, exact: true })).toHaveAttribute(
		"href",
		`/documents/${related.slug}`,
	);
	await expect(documents.getByText(relatedDraft.title)).toHaveCount(0);

	await unpublish("pages", basic);
	await expectSiteNotFound(page, path, "an unpublished Basic Page");
	await expectSiteNotFound(page, `/pages/${syntheticSlug("no-such-page")}`, "an unknown slug");
});

test("/pages/about and /pages/organization redirect permanently to /about and /about/organization", async ({
	request,
}) => {
	for (const [from, to] of [
		["/pages/about", "/about"],
		["/pages/organization", "/about/organization"],
	]) {
		for (const query of ["", "?ref=footer"]) {
			const response = await request.get(`${from}${query}`, { maxRedirects: 0 });
			expect(response.status(), `GET ${from}${query}`).toBe(301);
			expect(response.headers().location, `${from}${query} leads to`).toBe(`${to}${query}`);
		}
	}
});

/**
 * A page that opens with a header on the field, read for its motion (spec #365 "Motion"): with
 * reduced motion preferred nothing runs or waits, and with motion allowed `rising`, the header's
 * parts, enter as the page opens while each of `atOnce` shows at once, then nothing waits, on a
 * page with `revealing` parts once it is scrolled to its end; on paper nothing runs or waits; and
 * each of `placed` is where it is without motion, at 375 and 1440 px. The test compares `seen` with
 * `expected`. The page ends on a screen with reduced motion preferred.
 */
async function readHeaderMotion(
	page: Page,
	path: string,
	rising: Array<[string, Locator]>,
	atOnce: Array<[string, Locator]>,
	placed: Array<[string, Locator]>,
	revealing: boolean,
) {
	const main = page.getByRole("main");
	/** A part's entrance delay, or "missing" where the page lacks it. */
	const delayOf = async (part: Locator) =>
		(await part.count()) === 1 ? entersAfter(part) : "missing";
	const running = () => page.evaluate(() => document.getAnimations().length);
	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};

	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto(path);
	seen.reduced = { running: await running(), heldBack: await heldBack(main) };
	expected.reduced = { running: 0, heldBack: [] };
	const still = await placesAtTwoWidths(page, placed);

	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto(path, { waitUntil: "commit" });
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	const delays: Record<string, unknown> = {};
	for (const [name, part] of [...rising, ...atOnce]) delays[name] = await delayOf(part);
	seen.delays = delays;
	// The header rises in as the page opens; the rest shows at once.
	expected.delays = Object.fromEntries([
		...rising.map(([name]) => [name, 0]),
		...atOnce.map(([name]) => [name, -1]),
	]);
	// A part that reveals as it comes into the window shows once the window has passed it.
	if (revealing) {
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	}
	await expect
		.poll(() => heldBack(main), { message: "the page shows whole after the entrance" })
		.toEqual([]);
	seen.moving = await placesAtTwoWidths(page, placed);
	expected.moving = still;

	await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
	await page.goto(path);
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	seen.print = { running: await running(), heldBack: await heldBack(main) };
	expected.print = { running: 0, heldBack: [] };
	await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
	// The places are the same with motion and without only where the page has each part.
	seen.allPlaced = still.every(({ places }) => places.every(([, box]) => box !== "missing"));
	expected.allPlaced = true;
	return { seen, expected };
}

/**
 * Whether each of `parts` shows whole (`shownWhole`) at 375 and 1440 px, as a page without
 * JavaScript is laid out. The test compares `seen` with `expected`.
 */
async function readWholeAtTwoWidths(page: Page, parts: Array<[string, Locator]>) {
	const seen: Record<number, unknown> = {};
	const expected: Record<number, unknown> = {};
	for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
		await page.setViewportSize(viewport);
		const whole: Record<string, boolean> = {};
		for (const [name, part] of parts) whole[name] = await shownWhole(part);
		seen[viewport.width] = whole;
		expected[viewport.width] = Object.fromEntries(parts.map(([name]) => [name, true]));
	}
	return { seen, expected };
}

// /about opens on the list's deep field with a Basic Page's header, its six sub-pages as the
// Homepage's Quick Access tiles over the field's lower edge, then its body and related Documents
// (Feature 012 #371; spec #365 decisions 2, 3, 8 and 10, "`/about`", "Motion"). The runtime's own
// `about` Basic Page, the demo dataset's, takes the reserved slug, which is unique, so the tests
// that need the page published read it as it is, and a runtime without one gets a synthetic page.
test.describe("/about on the field", () => {
	/** The description /about's head gives while the `about` Basic Page gives none. */
	const ABOUT_DESCRIPTION =
		"ข้อมูลสำนักงานสาธารณสุขอำเภอสอง โครงสร้างองค์กร ผู้บริหาร บุคลากร นโยบาย แผนงาน และผลการดำเนินงาน";
	const RELATED_TITLE = "เอกสารที่เกี่ยวข้อง";

	/** The list that holds /about's tiles. */
	const aboutTiles = (page: Page) =>
		page
			.getByRole("main")
			.getByRole("list")
			.filter({ has: page.getByRole("link", { name: ABOUT_SUBPAGES[0][0], exact: true }) });

	/**
	 * The body's first and last blocks, found by the text `publishedAbout` gives for them, and the
	 * related Documents.
	 */
	function aboutText(page: Page, body: { firstText: string; lastText: string }) {
		const main = page.getByRole("main");
		return {
			first: main.getByText(body.firstText, { exact: true }),
			last: main.getByText(body.lastText, { exact: true }),
			related: main.getByRole("region", { name: RELATED_TITLE }),
		};
	}

	/** Where the page's own content ends, inside its padding: the bottom of main's last block. */
	const pageEnd = (page: Page) =>
		page
			.getByRole("main")
			.evaluate((main) => main.lastElementChild!.getBoundingClientRect().bottom);

	/**
	 * The `about` Basic Page, published for the running test: the runtime's own, borrowed and
	 * published again at its own date, or else a synthetic one whose body opens with a paragraph and
	 * which links one Document. Returns its fixture, its summary, its body's first and last blocks'
	 * text and whether its body opens with a heading, as the native API gives them.
	 */
	async function publishedAbout() {
		let about = await borrow("pages", "about");
		if (!about) {
			const document = await createSyntheticDocument(admin, "about-related");
			await publish("documents", document);
			about = await createPage("about", {
				slug: "about",
				data: {
					summary: `${SYNTHETIC_FIXTURE_MARK} สรุปหน้าเกี่ยวกับเรา`,
					body: [
						portableTextBlock(`${SYNTHETIC_FIXTURE_MARK} ย่อหน้าแรกของหน้าเกี่ยวกับเรา`),
						portableTextBlock(`${SYNTHETIC_FIXTURE_MARK} ย่อหน้าสุดท้ายของหน้าเกี่ยวกับเรา`),
					],
				},
				references: { documents: [document.id] },
			});
		}
		await publish("pages", about);
		const data = nativeItemOf(await readEntry(admin, "pages", about.id))?.data as
			| { summary?: string; body?: Array<{ style?: string; children?: Array<{ text?: string }> }> }
			| undefined;
		const body = data?.body ?? [];
		const textOf = (block: (typeof body)[number] | undefined) =>
			(block?.children ?? [])
				.map((span) => span.text ?? "")
				.join("")
				.trim();
		return {
			about,
			summary: data?.summary ?? "",
			firstText: textOf(body[0]),
			lastText: textOf(body.at(-1)),
			opensWithHeading: /^h[1-6]$/.test(String(body[0]?.style)),
		};
	}

	test("/about shows its six sub-pages as the Homepage's Quick Access tiles over the field's lower edge, in `01` §3 order to their addresses, each one link named by its H2: two to a row below 1,024 px and three from 1,024 px, 12 px apart below 640 px and 20 px from 640 px, compact below 640 px, white with the card shadow and no border; the field a list's, the header ending 96 px above its edge below 640 px and 128 px from 640 px, the tiles starting 64 and 88 px above it; each focus ring banded where it meets the field; ข้อมูลเกี่ยวกับสำนักงาน is gone", async ({
		page,
	}) => {
		const response = await page.goto("/about");
		expect(response?.status(), "GET /about").toBe(200);
		await expect(navigationLink(page, "เกี่ยวกับเรา")).toHaveAttribute("aria-current", "page");
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/about`);
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const tiles = aboutTiles(page);
		const items = tiles.getByRole("listitem");
		const onField = (await parts.field.count()) === 1;
		const seen: Record<string, unknown> = {
			oldRegion: await main.getByRole("region", { name: "ข้อมูลเกี่ยวกับสำนักงาน" }).count(),
			tiles: [],
		};
		const expected: Record<string, unknown> = {
			oldRegion: 0,
			tiles: ABOUT_SUBPAGES.map(([label, href]) => ({ links: 1, named: 1, href, h2: label })),
		};
		for (const [index, [label]] of ABOUT_SUBPAGES.entries()) {
			const item = items.nth(index);
			const links = item.getByRole("link");
			const h2 = links.getByRole("heading", { level: 2 });
			(seen.tiles as unknown[]).push({
				links: await links.count(),
				named: await item.getByRole("link", { name: label, exact: true }).count(),
				href: (await links.count()) === 1 ? await links.getAttribute("href") : "not one link",
				h2: (await h2.count()) === 1 ? (await h2.textContent())?.trim() : "no H2",
			});
		}

		seen.look = await readListField(page);
		expected.look = LIST_FIELD_LOOK;
		const surfaceBase = await tokenColor(page, "surface-base");
		const cardShadow = await tokenShadow(page, "card");
		for (const width of [320, 375, 639, 640, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await expectNoHorizontalScroll(page, `/about at ${width} px`);
			const boxes = [];
			for (const item of await items.all()) boxes.push(await boxOf(item, `at ${width} px: a tile`));
			const perRow = await itemsPerRow(items);
			const across = boxes[1]!.x - boxes[0]!.x - boxes[0]!.width;
			const below = boxes[perRow[0]!]!;
			const tile = items.first().getByRole("link");
			const read: Record<string, unknown> = {
				perRow,
				gaps: {
					across: Math.round(across),
					down: Math.round(below.y - boxes[0]!.y - boxes[0]!.height),
				},
				// The label across and the arrow on a row of its own under it, or the arrow beside it.
				forms: await items.getByRole("link").evaluateAll((links) =>
					links.map((link) => {
						const label = link.querySelector(":scope > :not(svg)")!.getBoundingClientRect();
						const arrow = link.querySelector("svg")!.getBoundingClientRect();
						if (arrow.top >= label.bottom + 7.5) return "arrow under the label";
						if (arrow.left >= label.right) return "arrow beside the label";
						return "neither";
					}),
				),
				tile: await tile.evaluate((link) => {
					const style = getComputedStyle(link);
					return {
						fill: style.backgroundColor,
						border: style.borderTopWidth,
						radius: style.borderTopLeftRadius,
						shadow: style.boxShadow,
					};
				}),
			};
			const expectedAt: Record<string, unknown> = {
				perRow: width < 1024 ? [2, 2, 2] : [3, 3],
				gaps: width < 640 ? { across: 12, down: 12 } : { across: 20, down: 20 },
				forms: ABOUT_SUBPAGES.map(() =>
					width < 640 ? "arrow under the label" : "arrow beside the label",
				),
				tile: {
					fill: surfaceBase,
					border: "0px",
					radius: width < 640 ? "18px" : "22px",
					shadow: cardShadow,
				},
			};
			if ([375, 639, 640, 1440].includes(width)) {
				const reach = width < 640 ? FIELD_EDGE.phone : FIELD_EDGE.fromSm;
				const edge = onField ? await fieldEdge(parts.field, `at ${width} px`) : Number.NaN;
				const header = await boxOf(
					parts.header.or(main.locator("header")).first(),
					`at ${width} px: the header`,
				);
				read.overField = {
					headerEndsAbove: Math.round(edge - header.y - header.height),
					tilesStartAbove: Math.round(edge - (await boxOf(tiles, `at ${width} px: the tiles`)).y),
					unbanded: onField
						? await ringsOverFieldUnbanded(tiles, parts.field, surfaceBase)
						: "no field",
				};
				expectedAt.overField = {
					headerEndsAbove: reach.room,
					tilesStartAbove: reach.overlap,
					unbanded: [],
				};
			}
			seen[width] = read;
			expected[width] = expectedAt;
		}

		// The keyboard goes from the breadcrumb's หน้าแรก to the six tiles, in order.
		const crumb = parts.breadcrumb.getByRole("link");
		const order: unknown[] = [];
		if ((await crumb.count()) === 1) {
			await crumb.focus();
			for (const _ of ABOUT_SUBPAGES) {
				await page.keyboard.press("Tab");
				order.push(
					await page.evaluate(() =>
						document.activeElement?.querySelector("h2")?.textContent?.trim(),
					),
				);
			}
		}
		seen.keyboard = order;
		expected.keyboard = ABOUT_SUBPAGES.map(([label]) => label);
		expect(seen, "/about's tiles over the field's edge").toEqual(expected);
	});

	test("/about opens on the deep field with the Basic Page's header, 48 rem wide at most: without its Basic Page the H1 เกี่ยวกับเรา and no lead, then the six tiles and the page's own 64 px, 80 px from 1,024 px; its draft's signed preview link opens it at /about on the field with noindex; once published its title as the H1 and its summary at body-large in white; the breadcrumb ends at เกี่ยวกับเรา either way, and the head's title and description stay", async ({
		page,
	}) => {
		const { siteTitle, separator } = await siteTitleParts(admin);
		const { fixture: about, content } = await reservedPage("about", pageContent("about"));
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const tiles = aboutTiles(page);
		const titleOnField = async () =>
			(await parts.field.count()) === 1 && (await parts.title.count()) === 1
				? (await parts.title.textContent())?.trim()
				: "no H1 on the field";
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};

		await page.goto("/about");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText("เกี่ยวกับเรา");
		await expect(page).toHaveTitle(`เกี่ยวกับเรา${separator}${siteTitle}`);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute(
			"content",
			ABOUT_DESCRIPTION,
		);
		await expectBreadcrumb(page, [HOME_CRUMB], "เกี่ยวกับเรา");
		// The accessibility checks at the end see /about with its Basic Page published.
		await expectAccessibleAtEachWidth(page, "/about without its Basic Page");
		const after: Record<number, unknown> = {};
		for (const width of [375, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const end = await pageEnd(page);
			const box = await boxOf(tiles, `at ${width} px: the tiles`);
			after[width] = Math.round(end - box.y - box.height);
		}
		seen.noPage = {
			title: await titleOnField(),
			lead:
				(await parts.field.count()) === 1 ? await parts.header.locator("p").count() : "no field",
			tiles: await tiles.getByRole("listitem").count(),
			related: await main.getByRole("region", { name: RELATED_TITLE }).count(),
			after,
		};
		expected.noPage = {
			title: "เกี่ยวกับเรา",
			lead: 0,
			tiles: ABOUT_SUBPAGES.length,
			related: 0,
			after: { 375: 64, 1023: 64, 1024: 80, 1440: 80 },
		};

		const link = await mintPreviewLink(admin, "pages", about.id);
		expect(link.pathname, "the preview link is the draft's URL pattern address").toBe(
			"/pages/about",
		);
		const preview = await page.goto(link.toString());
		seen.preview = {
			status: preview?.status(),
			at: new URL(page.url()).pathname,
			title: await titleOnField(),
			robots: await page.locator('meta[name="robots"]').getAttribute("content"),
		};
		expected.preview = {
			status: 200,
			at: "/about",
			title: about.title,
			robots: expect.stringMatching(/noindex/),
		};

		await publish("pages", about);
		await page.goto("/about");
		await expectBasicPage(page, about, content);
		// A borrowed page may carry an SEO title of its own.
		if (content) await expect(page).toHaveTitle(`${about.title}${separator}${siteTitle}`);
		await expectBreadcrumb(page, [HOME_CRUMB], "เกี่ยวกับเรา");
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
		const summary = String(
			(nativeItemOf(await readEntry(admin, "pages", about.id))?.data as { summary?: string })
				?.summary,
		);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", summary);
		const header = await readHeaderOnField(page, { pills: [] });
		seen.header = header.seen;
		expected.header = header.expected;
		const lead = parts.field.getByText(summary.split("\n")[0]!);
		seen.summary =
			(await lead.count()) === 1 &&
			(await lead.evaluate((text) => {
				const style = getComputedStyle(text);
				return {
					text: (text as HTMLElement).innerText,
					type: [style.fontSize, style.lineHeight],
					colour: style.color,
				};
			}));
		expected.summary = {
			text: summary,
			type: ["18px", "30px"],
			colour: await tokenColor(page, "surface-base"),
		};
		seen.title = await titleOnField();
		expected.title = about.title;
		expect(seen, "/about's header on the field, with and without its Basic Page").toEqual(expected);
	});

	test("on /about the body follows 48 px under the tiles in the 48 rem column, a body that opens with a heading 32 px lower (#380), then 48 px under it เอกสารที่เกี่ยวข้อง with each row's download, in the same column, then the page's own 64 px, 80 px from 1,024 px, at 320, 639, 640, 1,023, 1,024 and 1,440 px", async ({
		page,
	}) => {
		const published = await publishedAbout();
		const { opensWithHeading } = published;
		await page.goto("/about");
		const tiles = aboutTiles(page);
		const text = aboutText(page, published);
		const rows = text.related.getByRole("article");
		const shown = (await text.first.count()) === 1 && (await text.related.count()) === 1;
		const seen: Record<string, unknown> = {
			rows: await rows.evaluateAll((articles) =>
				articles.map(
					(row) =>
						[...row.querySelectorAll("a")].filter((link) =>
							link.textContent?.replace(/\s+/g, " ").trim().startsWith("ดาวน์โหลด"),
						).length,
				),
			),
		};
		const expected: Record<string, unknown> = {
			rows: Array.from({ length: Math.max(1, await rows.count()) }, () => 1),
		};
		for (const width of [320, 639, 640, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			if (!shown) {
				seen[width] = "no body or no เอกสารที่เกี่ยวข้อง after the tiles";
			} else {
				const tilesBox = await boxOf(tiles, `${at}: the tiles`);
				const first = await boxOf(text.first, `${at}: the body's first block`);
				const last = await boxOf(text.last, `${at}: the body's last block`);
				const related = await boxOf(text.related, `${at}: เอกสารที่เกี่ยวข้อง`);
				seen[width] = {
					bodyUnderTiles: Math.round(first.y - tilesBox.y - tilesBox.height),
					bodyWidth: Math.round(first.width),
					relatedUnderBody: Math.round(related.y - last.y - last.height),
					relatedWidth: Math.round(related.width),
					roomAfter: Math.round((await pageEnd(page)) - related.y - related.height),
				};
			}
			const column = Math.min(HEADER_WIDEST, width - 2 * gutterAt(width));
			expected[width] = {
				// A body that opens with a heading starts 32 px lower, its heading's margin (#380).
				bodyUnderTiles: opensWithHeading ? 80 : 48,
				bodyWidth: column,
				relatedUnderBody: 48,
				relatedWidth: column,
				roomAfter: width < 1024 ? 64 : 80,
			};
		}
		expect(seen, "/about's body and เอกสารที่เกี่ยวข้อง after the tiles").toEqual(expected);
	});

	test("/about moves only when motion is allowed: the header's title and summary rise in as the page opens while the breadcrumb, the body and the related Documents show at once, each tile reveals as it comes into the window and shows whole while it holds the keyboard's focus, and nothing moves by itself for more than five seconds; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const published = await publishedAbout();
		const { summary } = published;
		const parts = fieldParts(page);
		const items = aboutTiles(page).getByRole("listitem");
		const text = aboutText(page, published);
		const lead = parts.field.getByText(summary.split("\n")[0]!);
		const atOnce: Array<[string, Locator]> = [
			["the breadcrumb", parts.breadcrumb],
			["the body", text.first],
			["เอกสารที่เกี่ยวข้อง", text.related],
		];
		const placed: Array<[string, Locator]> = [
			["the field", parts.field],
			["the title", parts.title],
			["the tiles", aboutTiles(page)],
			...atOnce,
		];
		const { seen, expected } = await readHeaderMotion(
			page,
			"/about",
			[
				["the title", parts.title],
				["the summary", lead],
			],
			atOnce,
			placed,
			true,
		);
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto("/about", { waitUntil: "commit" });
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		// Read as the page opens, while the entrance runs: over within five seconds (WCAG 2.2 SC
		// 2.2.2), and the field's ring stands still.
		seen.selfRunning = Math.max(0, ...(await selfRunningEnds(page.locator("html")))) <= 5_000;
		expected.selfRunning = true;

		// A window shorter than the field puts every tile below it as the page opens, well below:
		// just under a 300 px window Chromium gives a tile's view timeline no progress (#339).
		const short = { width: 1440, height: 200 };
		await page.setViewportSize(short);
		await page.goto("/about");
		const waiting = [];
		for (const tile of await items.all()) {
			waiting.push({
				below: (await boxOf(tile, "a tile")).y > short.height,
				opacity: await shownOpacity(tile),
			});
		}
		seen.waiting = waiting;
		expected.waiting = ABOUT_SUBPAGES.map(() => ({ below: true, opacity: 0 }));
		const revealed = [];
		for (const tile of await items.all()) {
			await tile.scrollIntoViewIfNeeded();
			await expect
				.poll(() => shownOpacity(tile), { message: "a tile in the window shows", timeout: 3_000 })
				.toBe(1)
				.catch(() => undefined);
			revealed.push(await shownOpacity(tile));
		}
		seen.revealed = revealed;
		expected.revealed = ABOUT_SUBPAGES.map(() => 1);
		// Focused where it lies, below the window, as a tile reached by the keyboard is until the
		// page scrolls: only its focus shows it there.
		await page.goto("/about");
		await items
			.last()
			.getByRole("link")
			.evaluate((link) => (link as HTMLElement).focus({ preventScroll: true }));
		await expect
			.poll(() => shownOpacity(items.last()), { timeout: 3_000 })
			.toBe(1)
			.catch(() => undefined);
		seen.focused = {
			below: (await boxOf(items.last(), "the focused tile")).y > short.height,
			opacity: await shownOpacity(items.last()),
		};
		expected.focused = { below: true, opacity: 1 };
		await page.emulateMedia({ reducedMotion: "reduce" });
		expect(seen, "/about's motion, and nothing moving without it").toEqual(expected);
	});

	test.describe("without JavaScript", () => {
		test.use({ javaScriptEnabled: false });

		test("/about shows its header on the field, its six tiles, its body and its related Documents with their downloads whole, at 375 and 1440 px", async ({
			page,
		}) => {
			const published = await publishedAbout();
			const { summary } = published;
			await page.goto("/about");
			const parts = fieldParts(page);
			const tiles = aboutTiles(page);
			const text = aboutText(page, published);
			const { seen, expected } = await readWholeAtTwoWidths(page, [
				["the breadcrumb", parts.breadcrumb],
				["the title on the field", parts.field.getByRole("heading", { level: 1 })],
				["the summary on the field", parts.field.getByText(summary.split("\n")[0]!)],
				...ABOUT_SUBPAGES.map(
					([label]) =>
						[`the tile ${label}`, tiles.getByRole("link", { name: label, exact: true })] as [
							string,
							Locator,
						],
				),
				["the body", text.first],
				["เอกสารที่เกี่ยวข้อง", text.related],
				[
					"a related Document's download",
					text.related.getByRole("link", { name: /^ดาวน์โหลด/ }).first(),
				],
			]);
			expect(seen, "/about whole without JavaScript").toEqual(expected);
		});
	});
});

test("/about/organization renders the published organization Basic Page under เกี่ยวกับเรา, and /pages/organization leads there", async ({
	page,
}) => {
	const { fixture: organization, content } = await reservedPage(
		"organization",
		pageContent("organization"),
	);
	await publish("pages", organization);

	const response = await page.goto("/pages/organization");
	expect(response?.status(), "GET /pages/organization, redirected").toBe(200);
	expect(new URL(page.url()).pathname).toBe("/about/organization");
	await expectBasicPage(page, organization, content);
	await expectAboutSubpage(page, "/about/organization", organization.title);
	// The Post page's header on the field, as on /pages/{slug} (Feature 012 #368). A borrowed page
	// comes without the suite's knowing its summary.
	const { seen, expected } = await readHeaderOnField(page, {
		pills: [],
		under: content && { text: content.summary, lines: 1 },
	});
	expect(seen, "the organization page's header on the field").toEqual(expected);
});

// A Basic Page opens on the deep field with the Post page's header, its body in the 48 rem text
// column under the field, then its related Documents with their downloads under the Homepage's
// section heading (Feature 012 #368; spec #365 "A Basic Page", decisions 2, 3 and 9, "Motion").
test.describe("a Basic Page on the field", () => {
	/** The summary, with the line break staff typed. */
	const SUMMARY = `${SYNTHETIC_FIXTURE_MARK} สรุปของหน้าบรรทัดแรก\n${SYNTHETIC_FIXTURE_MARK} สรุปของหน้าบรรทัดที่สอง`;
	/** The body's first and last paragraphs, a heading between them. */
	const BODY_START = `${SYNTHETIC_FIXTURE_MARK} ย่อหน้าแรกของเนื้อหา`;
	const BODY_HEADING = `${SYNTHETIC_FIXTURE_MARK} หัวข้อในเนื้อหา`;
	const BODY_END = `${SYNTHETIC_FIXTURE_MARK} ย่อหน้าสุดท้ายของเนื้อหา`;
	const BODY = [
		portableTextBlock(BODY_START),
		portableTextBlock(BODY_HEADING, "h2"),
		portableTextBlock(BODY_END),
	];
	const RELATED = { title: "เอกสารที่เกี่ยวข้อง", label: "เอกสารเผยแพร่" };
	/** Its summary, body and two related Documents, the first superseded. */
	let full: DraftFixture;
	let related: DraftFixture[];
	/** A body and no summary. */
	let noSummary: DraftFixture;
	/** A summary and the related Documents, no body. */
	let documentsOnly: DraftFixture;
	/** Its title alone. */
	let titleOnly: DraftFixture;
	const pathOf = (fixture: DraftFixture) => `/pages/${fixture.slug}`;

	test.beforeAll(async () => {
		related = [];
		for (const status of ["superseded", "current"]) {
			const document = await createSyntheticDocument(admin, `page-related-${status}`, {
				// 11.8 KB, a size whose words take two lines of the download at 320 px.
				file: await uploadSyntheticPdf(admin, undefined, 12_083),
				data: { document_at: DOCUMENT_AT, fiscal_year: 2569, domain_status: status },
			});
			await publish("documents", document);
			related.push(document);
		}
		const references = { documents: related.map((document) => document.id) };
		full = await createPage("field-full", {
			data: { summary: SUMMARY, body: BODY },
			references,
		});
		noSummary = await createPage("field-no-summary", { data: { body: BODY } });
		documentsOnly = await createPage("field-documents", { data: { summary: SUMMARY }, references });
		titleOnly = await createPage("field-title");
		for (const fixture of [full, noSummary, documentsOnly, titleOnly]) {
			await publish("pages", fixture);
		}
	});

	test("a Basic Page opens on the deep field with the Post page's header: the breadcrumb in white, its title as the page's one H1 24 px under it, with no pill, icon tile or frame, in the Post page's sizes on both sides of 640 and 1,024 px, then its summary at body-large with its line breaks; the field has the small glow and no ring, and reaches 40 px under the header below 640 px and 48 px from 640 px; a page without a summary has no lead", async ({
		page,
	}) => {
		await page.goto(pathOf(full));
		const parts = fieldParts(page);
		await expect(page.getByRole("heading", { level: 1 }), "one H1").toHaveCount(1);
		const { seen, expected } = await readHeaderOnField(page, {
			pills: [],
			under: { text: SUMMARY, lines: 2 },
		});
		const look = await readListField(page);
		seen.look = look;
		expected.look = Object.fromEntries(
			Object.keys(look).map((width) => [width, { glow: true, rings: 0 }]),
		);
		/** How far the field reaches under the header's last part, by width. */
		const reach = async (last: Locator, widths: number[]) => {
			const read: Record<number, number> = {};
			for (const width of widths) {
				await page.setViewportSize({ width, height: 900 });
				if ((await parts.field.count()) !== 1) return "no field";
				const lastBox = await boxOf(last, `at ${width} px: the header's last part`);
				read[width] = Math.round(
					(await fieldEdge(parts.field, `at ${width} px`)) - lastBox.y - lastBox.height,
				);
			}
			return read;
		};
		const summary = parts.header.getByText(SUMMARY.split("\n")[0]!);
		seen.fieldUnderHeader = await reach(summary, [320, 639, 640, 1440]);
		expected.fieldUnderHeader = { 320: 40, 639: 40, 640: 48, 1440: 48 };
		const onField = (await parts.field.count()) === 1;
		seen.glow = {};
		for (const width of [639, 640]) {
			await page.setViewportSize({ width, height: 900 });
			(seen.glow as Record<number, string>)[width] = onField
				? await parts.field.evaluate((element) =>
						getComputedStyle(element).getPropertyValue("--deep-field-glow").trim(),
					)
				: "no field";
		}
		expected.glow = { 639: "45% 18rem at 100% 0%", 640: "28% 12rem at 100% 0%" };
		seen.titleSize = {};
		const title = page.getByRole("heading", { level: 1 });
		for (const width of [639, 640, 1023, 1024]) {
			await page.setViewportSize({ width, height: 900 });
			(seen.titleSize as Record<number, string>)[width] = await title.evaluate(
				(heading) => getComputedStyle(heading).fontSize,
			);
		}
		// H3 below 640 px, H2 from 640 px and H1 from 1,024 px.
		expected.titleSize = { 639: "24px", 640: "34px", 1023: "34px", 1024: "46px" };
		seen.noTileOrFrame = {
			// The breadcrumb's chevrons aside.
			icons: onField ? await parts.header.locator("svg:not(nav svg)").count() : "no field",
			frame: await page.getByTestId("picture-frame").count(),
		};
		expected.noTileOrFrame = { icons: 0, frame: 0 };

		await page.goto(pathOf(noSummary));
		seen.noSummary = {
			title: await title.textContent(),
			lead:
				(await parts.field.count()) === 1 ? await parts.header.locator("p").count() : "no field",
			fieldUnderHeader: await reach(parts.title, [639, 640]),
		};
		expected.noSummary = {
			title: noSummary.title,
			lead: 0,
			fieldUnderHeader: { 639: 40, 640: 48 },
		};
		expect(seen, "a Basic Page's header on the field").toEqual(expected);
	});

	test("the body follows on the page's colour in the 48 rem text column, 32 px under the field below 1,024 px and 40 px from 1,024 px; 48 px under it เอกสารที่เกี่ยวข้อง with the Homepage's section heading (the folder-open tile, the label เอกสารเผยแพร่ and the H2), its rows 24 px under the heading below 640 px and 28 px from 640 px and 14 px apart, each titled with an H3 and with its download, in the same column; then the page's own 64 px, 80 px from 1,024 px; without a body the Documents start where it would", async ({
		page,
	}) => {
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const region = main.getByRole("region", { name: RELATED.title });
		const heading = region.getByRole("heading", { level: 2, name: RELATED.title });
		const label = region.getByText(RELATED.label, { exact: true });
		const tile = region.locator("svg.lucide-folder-open").locator("xpath=..");
		const rows = region.getByRole("article");
		const article = main.getByRole("article").filter({ has: parts.title });
		/** From a part's bottom to the end of the article's content, inside its padding. */
		const room = async (part: Locator, at: string) => {
			const box = await boxOf(part, `${at}: the last part`);
			const end = await article.evaluate((element) => element.getBoundingClientRect().bottom);
			return Math.round(end - box.y - box.height);
		};
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};

		await page.goto(pathOf(full));
		const start = main.getByText(BODY_START, { exact: true });
		const end = main.getByText(BODY_END, { exact: true });
		const headingShown = (await label.count()) === 1 && (await tile.count()) === 1;
		seen.related = {
			rows: await rows.count(),
			h3Titles: await rows.getByRole("heading", { level: 3 }).count(),
			downloads: await rows.evaluateAll((articles) =>
				articles.map(
					(row) =>
						[...row.querySelectorAll("a")]
							.map((link) => link.textContent?.replace(/\s+/g, " ").trim())
							.filter((words) => words?.startsWith("ดาวน์โหลด")).length,
				),
			),
			labelColour: headingShown && (await label.evaluate((words) => getComputedStyle(words).color)),
			tileGradient:
				headingShown &&
				(await tile.evaluate((element) =>
					getComputedStyle(element).backgroundImage.includes("linear-gradient"),
				)),
			tileDecorative: headingShown && (await tile.getAttribute("aria-hidden")),
		};
		expected.related = {
			rows: 2,
			h3Titles: 2,
			downloads: [1, 1],
			labelColour: await tokenColor(page, "brand-primary"),
			tileGradient: true,
			tileDecorative: "true",
		};
		seen.rowNames = [];
		for (const [index, document] of related.entries()) {
			const row = rows.nth(index);
			const { title } = documentRowParts(row, 3);
			(seen.rowNames as unknown[]).push({
				title: (await title.count()) === 1 && (await title.textContent())?.trim(),
				download: await row
					.getByRole("link", { name: `ดาวน์โหลด (PDF, 11.8 KB) ${document.title}`, exact: true })
					.count(),
			});
		}
		expected.rowNames = related.map((document) => ({ title: document.title, download: 1 }));
		for (const width of [320, 639, 640, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			if (!headingShown || (await parts.field.count()) === 0) {
				seen[width] = "no field or no section heading";
			} else {
				const fieldEnd = await fieldEdge(parts.field, at);
				const startBox = await boxOf(start, `${at}: the body`);
				const endBox = await boxOf(end, `${at}: the body's end`);
				const regionBox = await boxOf(region, `${at}: เอกสารที่เกี่ยวข้อง`);
				const tileBox = await boxOf(tile, `${at}: the tile`);
				const headingBox = await boxOf(heading, `${at}: the H2`);
				const labelBox = await boxOf(label, `${at}: the label`);
				const first = await boxOf(rows.first(), `${at}: the first row`);
				const second = await boxOf(rows.nth(1), `${at}: the second row`);
				seen[width] = {
					bodyUnderField: Math.round(startBox.y - fieldEnd),
					// A paragraph takes the whole width of the column it is in.
					bodyWidth: Math.round(startBox.width),
					relatedUnderBody: Math.round(regionBox.y - endBox.y - endBox.height),
					relatedWidth: Math.round(regionBox.width),
					labelAboveHeading: labelBox.y < headingBox.y,
					tileBeforeHeading: tileBox.x + tileBox.width <= headingBox.x,
					rowsUnderHeading: Math.round(
						first.y - Math.max(tileBox.y + tileBox.height, headingBox.y + headingBox.height),
					),
					rowsApart: Math.round(second.y - first.y - first.height),
					roomAfterRelated: await room(rows.last(), at),
				};
			}
			const column = Math.min(HEADER_WIDEST, width - 2 * gutterAt(width));
			expected[width] = {
				bodyUnderField: width < 1024 ? 32 : 40,
				bodyWidth: column,
				relatedUnderBody: 48,
				relatedWidth: column,
				labelAboveHeading: true,
				tileBeforeHeading: true,
				rowsUnderHeading: width < 640 ? 24 : 28,
				rowsApart: 14,
				roomAfterRelated: width < 1024 ? 64 : 80,
			};
		}

		await page.goto(pathOf(documentsOnly));
		const documentsOnlyRead: Record<number, unknown> = {};
		for (const width of [1023, 1024]) {
			await page.setViewportSize({ width, height: 900 });
			documentsOnlyRead[width] =
				(await region.count()) === 0 || (await parts.field.count()) === 0
					? "no field or no section"
					: Math.round(
							(await boxOf(region, `at ${width} px: เอกสารที่เกี่ยวข้อง`)).y -
								(await fieldEdge(parts.field, `at ${width} px`)),
						);
		}
		seen.relatedUnderFieldWithoutBody = documentsOnlyRead;
		expected.relatedUnderFieldWithoutBody = { 1023: 32, 1024: 40 };
		expect(seen, "the body and เอกสารที่เกี่ยวข้อง under the field").toEqual(expected);
	});

	test("a Basic Page with its title alone ends with its field: no body and no เอกสารที่เกี่ยวข้อง, then the page's own 64 px below 1,024 px and 80 px from 1,024 px before the footer", async ({
		page,
	}) => {
		await page.goto(pathOf(titleOnly));
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const seen: Record<string, unknown> = {
			related: await main.getByRole("region", { name: RELATED.title }).count(),
		};
		const expected: Record<string, unknown> = { related: 0 };
		for (const width of [375, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			if ((await parts.field.count()) !== 1) {
				seen[width] = "no field";
			} else {
				const fieldEnd = await fieldEdge(parts.field, `at ${width} px`);
				const article = main.getByRole("article").filter({ has: parts.title });
				const [end, footer] = await Promise.all([
					article.evaluate((element) => element.getBoundingClientRect().bottom),
					page.getByRole("contentinfo").evaluate((element) => element.getBoundingClientRect().top),
				]);
				seen[width] = {
					roomAfterField: Math.round(end - fieldEnd),
					footerAfterPage: footer >= end - 0.5,
				};
			}
			expected[width] = { roomAfterField: width < 1024 ? 64 : 80, footerAfterPage: true };
		}
		expect(seen, "the page ends with its field").toEqual(expected);
	});

	test("with the longest title and a summary ending in a long web address, the header's breadcrumb, title and summary stay inside the window and show whole at 375 and 320 px, where the field would clip what passes it", async ({
		page,
	}) => {
		// An unbroken run of characters wraps anywhere (#368 comment 7028435491, item 2).
		const summary = `${SYNTHETIC_FIXTURE_MARK} ${LONG_TITLE} https://example.invalid/documents/annual-health-service-plan-of-the-district-public-health-office-2570.pdf`;
		const long = await createPage("field-long", {
			data: { title: `${SYNTHETIC_FIXTURE_MARK} หน้า ${LONG_TITLE}`, summary },
		});
		await publish("pages", long);
		await page.goto(pathOf(long));
		const parts = fieldParts(page);
		const seen: Record<number, unknown> = {};
		const expected: Record<number, unknown> = {};
		for (const width of [375, 320]) {
			await page.setViewportSize({ width, height: 900 });
			const read: Record<string, unknown> = {};
			for (const [name, part] of [
				["the breadcrumb", parts.breadcrumb],
				["the title", parts.title],
				["the summary", parts.header.getByText(summary)],
			] as Array<[string, Locator]>) {
				// Inside the window, and nothing of its text cut off at its own edge.
				read[name] =
					(await part.count()) === 1 &&
					(await part.evaluate(
						(element) =>
							element.getBoundingClientRect().right <= window.innerWidth &&
							element.getBoundingClientRect().left >= 0 &&
							element.scrollWidth <= element.clientWidth,
					));
			}
			seen[width] = read;
			expected[width] = { "the breadcrumb": true, "the title": true, "the summary": true };
		}
		expect(seen, "the header inside the window").toEqual(expected);
	});

	test("a draft Basic Page's signed preview link opens it at /pages/{slug} on the field, with noindex", async ({
		page,
	}) => {
		const draft = await createPage("field-preview", { data: { summary: SUMMARY } });
		const link = await mintPreviewLink(admin, "pages", draft.id);
		const response = await page.goto(link.toString());
		const title = deepField(page).getByRole("heading", { level: 1 });
		expect({
			address: link.pathname,
			status: response?.status(),
			onField: (await title.count()) === 1 && (await title.textContent())?.trim(),
			robots: await page.locator('meta[name="robots"]').getAttribute("content"),
		}).toEqual({
			address: pathOf(draft),
			status: 200,
			onField: draft.title,
			robots: expect.stringMatching(/noindex/),
		});
	});

	test("with motion allowed the header rises in as the page opens, while the breadcrumb, the body and the related Documents show at once; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
		page,
	}) => {
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const region = main.getByRole("region", { name: RELATED.title });
		const atOnce: Array<[string, Locator]> = [
			["the breadcrumb", parts.breadcrumb],
			["the body", main.getByText(BODY_START, { exact: true })],
			["เอกสารที่เกี่ยวข้อง", region],
			["a related Document's row", region.getByRole("article").first()],
		];
		const { seen, expected } = await readHeaderMotion(
			page,
			pathOf(full),
			[
				["the title", parts.title],
				["the summary", parts.field.getByText(SUMMARY.split("\n")[0]!)],
			],
			atOnce,
			[["the field", parts.field], ["the title", parts.title], ...atOnce],
			false,
		);
		expect(seen, "the motion, and nothing moving without it").toEqual(expected);
	});

	test.describe("without JavaScript", () => {
		test.use({ javaScriptEnabled: false });

		test("a Basic Page shows its header on the field, its body and its related Documents with their downloads whole, at 375 and 1440 px", async ({
			page,
		}) => {
			await page.goto(pathOf(full));
			const main = page.getByRole("main");
			const parts = fieldParts(page);
			const region = main.getByRole("region", { name: RELATED.title });
			const { seen, expected } = await readWholeAtTwoWidths(page, [
				["the breadcrumb", parts.breadcrumb],
				["the title on the field", parts.field.getByRole("heading", { level: 1 })],
				["the summary on the field", parts.field.getByText(SUMMARY.split("\n")[0]!)],
				["the body", main.getByText(BODY_START, { exact: true })],
				["เอกสารที่เกี่ยวข้อง", region],
				...related.map(
					(document) =>
						[
							`${document.title}'s download`,
							region.getByRole("link", { name: `ดาวน์โหลด (PDF, 11.8 KB) ${document.title}` }),
						] as [string, Locator],
				),
			]);
			expect(seen, "the page whole without JavaScript").toEqual(expected);
		});
	});
});

test("the footer links to the privacy and accessibility Basic Pages only while they are published", async ({
	page,
}) => {
	const [{ fixture: privacy }, { fixture: accessibility }] = [
		await reservedPage("privacy"),
		await reservedPage("accessibility"),
	];
	const [privacyLabel, accessibilityLabel] = FOOTER_PAGES.map(({ label }) => label);

	await page.goto("/");
	expect(await footerLinks(page), "drafts get no footer link").toEqual(["ติดต่อเรา"]);

	await publish("pages", privacy);
	await page.goto("/");
	expect(await footerLinks(page)).toEqual([privacyLabel, "ติดต่อเรา"]);

	await publish("pages", accessibility);
	await page.goto("/");
	expect(await footerLinks(page)).toEqual([privacyLabel, accessibilityLabel, "ติดต่อเรา"]);
	await expect(
		page.getByRole("contentinfo").getByRole("link", { name: accessibilityLabel }),
	).toHaveAttribute("href", "/pages/accessibility");
	await page.getByRole("contentinfo").getByRole("link", { name: privacyLabel }).click();
	await expect(page).toHaveURL("/pages/privacy");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(privacy.title);

	await unpublish("pages", privacy);
	await page.goto("/");
	expect(await footerLinks(page)).toEqual([accessibilityLabel, "ติดต่อเรา"]);
});

test.describe("accessibility and reflow", () => {
	let paths: string[];

	test.beforeAll(async () => {
		const policy = await createDocument("a11y", "policy");
		await publish("documents", policy);
		// The longest title a Basic Page's fixture holds, on the field and in its related row, so
		// nothing passes the window at 320 px (Feature 012 #368).
		const related = await createSyntheticDocument(admin, "a11y-related", {
			data: { title: `${SYNTHETIC_FIXTURE_MARK} เอกสาร ${LONG_TITLE}` },
		});
		await publish("documents", related);
		const basic = await createPage("a11y", {
			data: {
				...pageData(pageContent("a11y")),
				title: `${SYNTHETIC_FIXTURE_MARK} หน้า ${LONG_TITLE}`,
			},
			references: { documents: [related.id] },
		});
		await publish("pages", basic);
		const organization = nativeItemOf(await readEntry(admin, "pages", "organization"));
		paths = [
			"/about",
			`/pages/${basic.slug}`,
			"/about/policies",
			"/about/plans",
			"/about/results",
			// The empty page past the end of a list.
			"/about/policies?page=2",
			// Only while it is published, so that no real address lands in the 404 log.
			...(organization?.status === "published" ? ["/about/organization"] : []),
		];
	});

	testAccessibilityAndReflow("the About and Basic Pages", () => paths);
});

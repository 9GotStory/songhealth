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
	boxOf,
	deepField,
	documentRowParts,
	entersAfter,
	expect,
	expectAboutSubpage,
	expectAccessibleAtEachWidth,
	expectAttentionLabelsOnOwnLine,
	expectBreadcrumb,
	expectSecondLinkPlaces,
	expectSiteNotFound,
	fieldEdge,
	fieldParts,
	gutterAt,
	heldBack,
	listedItem,
	listedTitles,
	PHONE_VIEWPORT,
	ownTitles,
	placesAtTwoWidths,
	readHeaderOnField,
	readListField,
	shownLines,
	shownWhole,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testListOnField,
	thaiDate,
	tokenColor,
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

test("/about links to every About sub-page", async ({ page }) => {
	const response = await page.goto("/about");
	expect(response?.status(), "GET /about").toBe(200);
	await expect(navigationLink(page, "เกี่ยวกับเรา")).toHaveAttribute("aria-current", "page");
	const subpages = page.getByRole("main").getByRole("region", { name: "ข้อมูลเกี่ยวกับสำนักงาน" });
	const links = subpages.getByRole("link");
	await expect(links).toHaveCount(ABOUT_SUBPAGES.length);
	for (const [index, [label, href]] of ABOUT_SUBPAGES.entries()) {
		await expect(links.nth(index), "the icon is decorative").toHaveAccessibleName(label);
		await expect(links.nth(index)).toHaveAttribute("href", href);
	}
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/about`);
});

test("/about shows its sub-page links without the about Basic Page, and the page's own title, summary and body once it is published, under the เกี่ยวกับเรา crumb", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const { fixture: about, content } = await reservedPage("about", pageContent("about"));
	const subpages = page.getByRole("main").getByRole("region", { name: "ข้อมูลเกี่ยวกับสำนักงาน" });

	await page.goto("/about");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("เกี่ยวกับเรา");
	await expect(page).toHaveTitle(`เกี่ยวกับเรา${separator}${siteTitle}`);
	await expectBreadcrumb(page, [HOME_CRUMB], "เกี่ยวกับเรา");
	await expect(subpages.getByRole("link")).toHaveCount(ABOUT_SUBPAGES.length);
	// The accessibility checks at the end see /about with its Basic Page published.
	await expectAccessibleAtEachWidth(page, "/about without its Basic Page");

	const link = await mintPreviewLink(admin, "pages", about.id);
	expect(link.pathname, "the preview link is the draft's URL pattern address").toBe("/pages/about");
	const preview = await page.goto(link.toString());
	expect(preview?.status(), "the preview renders").toBe(200);
	expect(new URL(page.url()).pathname, "the preview opens at /about").toBe("/about");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(about.title);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

	await publish("pages", about);
	await page.goto("/about");
	await expectBasicPage(page, about, content);
	// A borrowed page may carry an SEO title of its own.
	if (content) await expect(page).toHaveTitle(`${about.title}${separator}${siteTitle}`);
	await expectBreadcrumb(page, [HOME_CRUMB], "เกี่ยวกับเรา");
	await expect(subpages.getByRole("link")).toHaveCount(ABOUT_SUBPAGES.length);
	await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
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
			lead: onField ? await parts.header.locator("p").count() : "no field",
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
				const column = await start.evaluate(
					(paragraph) => paragraph.parentElement!.parentElement!.getBoundingClientRect().width,
				);
				seen[width] = {
					bodyUnderField: Math.round(startBox.y - fieldEnd),
					bodyWidth: Math.round(column),
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
		const summary = parts.field.getByText(SUMMARY.split("\n")[0]!);
		const atOnce: Array<[string, Locator]> = [
			["the breadcrumb", parts.breadcrumb],
			["the body", main.getByText(BODY_START, { exact: true })],
			["เอกสารที่เกี่ยวข้อง", region],
			["a related Document's row", region.getByRole("article").first()],
		];
		const placed: Array<[string, Locator]> = [
			["the field", parts.field],
			["the title", parts.title],
			...atOnce,
		];
		/** A part's entrance delay, or "missing" where the page lacks it. */
		const delayOf = async (part: Locator) =>
			(await part.count()) === 1 ? entersAfter(part) : "missing";
		const running = () => page.evaluate(() => document.getAnimations().length);
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};

		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(pathOf(full));
		seen.reduced = { running: await running(), heldBack: await heldBack(main) };
		expected.reduced = { running: 0, heldBack: [] };
		const still = await placesAtTwoWidths(page, placed);

		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(pathOf(full), { waitUntil: "commit" });
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		const delays: Record<string, unknown> = {
			"the title": await delayOf(parts.title),
			"the summary": await delayOf(summary),
		};
		for (const [name, part] of atOnce) delays[name] = await delayOf(part);
		seen.delays = delays;
		// The header rises in as the page opens; the rest shows at once.
		expected.delays = Object.fromEntries(
			Object.keys(delays).map((name) => [
				name,
				["the title", "the summary"].includes(name) ? 0 : -1,
			]),
		);
		await expect
			.poll(() => heldBack(main), { message: "the page shows whole after the entrance" })
			.toEqual([]);
		seen.moving = await placesAtTwoWidths(page, placed);
		expected.moving = still;

		await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
		await page.goto(pathOf(full));
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		seen.print = { running: await running(), heldBack: await heldBack(main) };
		expected.print = { running: 0, heldBack: [] };
		await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
		// The places are the same with motion and without only where the page has each part.
		seen.allPlaced = still.every(({ places }) => places.every(([, box]) => box !== "missing"));
		expected.allPlaced = true;
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
			const seen: Record<number, unknown> = {};
			const expected: Record<number, unknown> = {};
			for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
				await page.setViewportSize(viewport);
				const whole: Record<string, boolean> = {};
				for (const [name, part] of [
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
							] as const,
					),
				] as Array<[string, Locator]>) {
					whole[name] = await shownWhole(part);
				}
				seen[viewport.width] = whole;
				expected[viewport.width] = Object.fromEntries(
					Object.keys(whole).map((name) => [name, true]),
				);
			}
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

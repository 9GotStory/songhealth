// About pages, Basic Pages and About Document pages (#60; spec #51 "Public reads" (Basic Pages,
// About), `03` §3, §5, §14 and §17).
//
// A citizen reads a published Basic Page at /pages/{slug}; a draft, unpublished or unknown one
// answers the site 404. The reserved Basic Pages `about` and `organization` render at /about and
// /about/organization, and their /pages/ addresses redirect there permanently. /about links to
// every About sub-page whether or not its own Basic Page exists. The footer links to the reserved
// Basic Pages `privacy` and `accessibility` only while they are published. /about/policies,
// /about/plans and /about/results list the published Documents of the Document Type `policy`,
// `plan` and `result`, newest publication first.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Basic Pages and Documents made through the native API the way
// the Admin makes them, and removed afterwards. The Document Types are the reference terms the
// model-update step adds; the suite uses them and leaves them.
//
// The runtime may already hold its own Basic Pages at the reserved slugs, and its own Documents of
// the About types (the demo dataset, the Product Owner's). A test that needs one of them in draft
// borrows it: the test returns it to draft, and afterEach publishes it again at its own publication
// date (CODING_STANDARDS "Tests", shared runtime state). Its revision history keeps the round trip,
// which the native API cannot undo. An entry that is scheduled, unpublished, or has unpublished
// changes that publishing would release, is left alone and the test skips. /about/organization is
// requested only while a Basic Page is published there, so the suite leaves no real address in
// EmDash's 404 log.
//
// Platform behaviour relied on (emdash 1.1.0):
// - A content read by slug finds an entry that is not in the trash
//   (src/database/repositories/content.ts findByIdOrSlug). It carries `draftRevisionId` while the
//   entry has changes not yet published (src/emdash-runtime.ts hydrateDraftData).
// - POST …/publish takes `publishedAt`, so a borrowed entry is published again at its own date
//   (src/astro/routes/api/content/[collection]/[id]/publish.ts).
// - POST …/preview-url mints a draft's signed preview link at its URL pattern, /pages/{slug}
//   (src/astro/routes/api/content/[collection]/[id]/preview-url.ts), and the preview token travels
//   in the query string (src/preview/tokens.ts).

import type { Page } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	createSyntheticDocument,
	createSyntheticEntry,
	loadDevAccessToken,
	nativeDataOf,
	nativeItemOf,
	nativeRefusalOf,
	NATIVE_ROLES,
	portableTextBlock,
	publishEntryAt,
	readEntry,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	unpublishEntry,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	VIEWPORTS,
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

/** The About sub-pages /about links to, in `01` §3 order. */
const ABOUT_SUBPAGES = [
	["โครงสร้างองค์กร", "/about/organization"],
	["ผู้บริหาร", "/about/leadership"],
	["บุคลากร", "/about/personnel"],
	["นโยบาย", "/about/policies"],
	["แผนงาน", "/about/plans"],
	["ผลการดำเนินงาน", "/about/results"],
] as const;

/** The About Document pages, each with the Document Type it lists (spec #51). */
const ABOUT_DOCUMENT_PAGES = [
	{ path: "/about/policies", type: "policy", title: "นโยบาย" },
	{ path: "/about/plans", type: "plan", title: "แผนงาน" },
	{ path: "/about/results", type: "result", title: "ผลการดำเนินงาน" },
] as const;

/** The footer's Basic Page links, in footer order (docs/design/homepage-concept-v1.md §12). */
const FOOTER_PAGES = [
	{ slug: "privacy", label: "นโยบายความเป็นส่วนตัว" },
	{ slug: "accessibility", label: "การเข้าถึงเว็บไซต์" },
] as const;

const HOME_CRUMB = ["หน้าแรก", "/"] as const;
const ABOUT_CRUMB = ["เกี่ยวกับเรา", "/about"] as const;

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

/** A published entry of the runtime's own that the running test returned to draft. */
interface Borrowed {
	collection: Collection;
	fixture: DraftFixture;
	publishedAt: string;
}

/** What the running test borrowed; afterEach gives it back. */
const borrowed: Borrowed[] = [];

/**
 * The runtime's own entry at `slug`, returned to draft for the running test, or undefined when
 * there is none. The test skips when the entry is not simply published.
 */
async function borrow(collection: Collection, slug: string): Promise<DraftFixture | undefined> {
	const read = await readEntry(admin, collection, slug);
	if (!read.ok) {
		expect(read.status, `reading ${collection}/${slug}: ${nativeRefusalOf(read)}`).toBe(404);
		return undefined;
	}
	const item = nativeItemOf(read)!;
	test.skip(
		item.status !== "published" || typeof item.draftRevisionId === "string",
		`the runtime's ${collection} entry "${slug}" is ${item.status}${item.draftRevisionId ? " with unpublished changes" : ""}; the suite leaves it alone`,
	);
	const fixture = {
		id: String(item.id),
		slug,
		title: String((item.data as { title?: unknown }).title),
	};
	borrowed.push({ collection, fixture, publishedAt: String(item.publishedAt) });
	await unpublish(collection, fixture);
	return fixture;
}

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
	const own = borrowed.find((entry) => entry.fixture.id === fixture.id);
	await publishEntryAt(admin, collection, fixture.id, own?.publishedAt);
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

/** The links of the footer, by their text. */
async function footerLinks(page: Page): Promise<string[]> {
	return (await page.getByRole("contentinfo").getByRole("link").allTextContents()).map((text) =>
		text.trim(),
	);
}

/** The slugs of the Documents an About Document page lists, over all its list pages. */
async function listedDocumentSlugs(page: Page, path: string): Promise<string[]> {
	const slugs: string[] = [];
	for (let number = 1; ; number += 1) {
		await page.goto(number === 1 ? path : `${path}?page=${number}`);
		const hrefs = await page
			.getByRole("main")
			.getByRole("article")
			.getByRole("heading")
			.getByRole("link")
			.evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
		slugs.push(...hrefs.map((href) => decodeURIComponent(href.replace(/^\/documents\//, ""))));
		const next = page
			.getByRole("navigation", { name: "การแบ่งหน้า" })
			.getByRole("link", { name: "หน้าถัดไป" });
		if ((await next.count()) === 0) return slugs;
	}
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

test.afterEach(async () => {
	const failures: string[] = [];
	for (const { collection, fixture, publishedAt } of borrowed.splice(0)) {
		try {
			const status = nativeItemOf(await readEntry(admin, collection, fixture.id))?.status;
			const stored =
				status === "published"
					? nativeItemOf(await readEntry(admin, collection, fixture.id))?.publishedAt
					: await publishEntryAt(admin, collection, fixture.id, publishedAt);
			if (Date.parse(String(stored)) !== Date.parse(publishedAt)) {
				failures.push(
					`${collection}/${fixture.slug} is published at ${stored}, not ${publishedAt}`,
				);
			}
		} catch (error) {
			failures.push(
				`${collection}/${fixture.slug}: ${error instanceof Error ? error.message : error}`,
			);
		}
	}
	expect(failures, "the runtime's own entries are published again as they were").toEqual([]);
});

test.afterAll(async () => {
	if (admin === undefined) return;
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	expect(report.complete, `owned fixtures left: ${JSON.stringify(report)}`).toBe(true);
});

test("each About Document page shows its empty state while no published Document has its type", async ({
	page,
}) => {
	for (const { path } of ABOUT_DOCUMENT_PAGES) {
		for (const slug of await listedDocumentSlugs(page, path)) await borrow("documents", slug);
	}

	for (const { path, title } of ABOUT_DOCUMENT_PAGES) {
		const response = await page.goto(path);
		expect(response?.status(), `GET ${path}`).toBe(200);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
		await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
		await expect(page.getByRole("main").getByText(`ยังไม่มีเอกสาร${title}`)).toBeVisible();
	}
});

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
		await expect(navigationLink(page, "เกี่ยวกับเรา")).toHaveAttribute("aria-current", "true");
		await expectBreadcrumb(page, [HOME_CRUMB, ABOUT_CRUMB], title);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}${path}`);
		expect(ownTitles(await listedTitles(page), all), `${path}: its own type, newest first`).toEqual(
			expected[type].map((document) => document.title),
		);
		const first = expected[type][0];
		await expect(
			listedItem(page, first.title).getByRole("link", { name: first.title }),
		).toHaveAttribute("href", `/documents/${first.slug}`);
		await expect(listedItem(page, first.title)).toContainText(title);
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
	await expect(documents.getByRole("link", { name: related.title })).toHaveAttribute(
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
		await expect(links.nth(index), "the arrow is decorative").toHaveAccessibleName(label);
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
	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		await page.setViewportSize(viewport);
		await expectNoAxeViolations(page, `/about without its Basic Page at ${width}`);
		await expectVisibleFocusOnEveryStop(page, `/about without its Basic Page at ${width}`);
	}
	await page.setViewportSize(DESKTOP_VIEWPORT);

	const minted = await cmsRequest(
		admin,
		`/_emdash/api/content/pages/${encodeURIComponent(about.id)}/preview-url`,
		{ method: "POST", body: {} },
	);
	expect(minted.ok, nativeRefusalOf(minted)).toBe(true);
	// The signed token stays out of every message.
	const link = new URL(String(nativeDataOf(minted)?.url), origin);
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
	await expect(navigationLink(page, "เกี่ยวกับเรา")).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, ABOUT_CRUMB], organization.title);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/about/organization`,
	);
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
		const related = await createDocument("a11y-related");
		await publish("documents", related);
		const basic = await createPage("a11y", {
			data: pageData(pageContent("a11y")),
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

	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on the About and Basic Pages at the ${width} width`, async ({
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

	test("no About or Basic Page scrolls sideways at 320 px", async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		for (const path of paths) {
			await page.goto(path);
			await expectNoHorizontalScroll(page, path);
		}
	});
});

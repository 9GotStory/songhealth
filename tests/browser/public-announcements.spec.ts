// Announcements (#56; spec #51 "Public reads" (Announcements) and "Errors, redirects, preview and
// SEO").
//
// A citizen reads published Announcements at /announcements: the current ones first, then the
// closed ones, each newest first by announcement date, where an Announcement without one takes its
// place by its publication. An Announcement is current when it has no close date, or its close
// date is today or later in Bangkok; a closed one says "ปิดแล้ว" in text. Each Announcement's page
// at /announcements/{slug} shows its type, its announcement, open and close dates, its details and
// the Documents attached to it, each linking to its Document page. Drafts, unpublished and trashed
// Announcements never show, and attached Documents that are not published are left out.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Announcements, Documents with synthetic PDF files and
// announcement_type terms, made through the native API and removed afterwards. The runtime may
// hold other Announcements (the demo dataset, the Product Owner's own), so assertions look only at
// this suite's uniquely titled fixtures. Close dates of "today" and "yesterday" are taken on the
// Bangkok calendar when a test starts, so a run across midnight in Bangkok can fail.
//
// Platform behaviour relied on (emdash 1.1.0):
// - POST …/publish accepts `publishedAt` to backdate a publication
//   (src/astro/routes/api/content/[collection]/[id]/publish.ts).
// - A reference field resolves a target only while it is published, in link order
//   (src/query.ts attachReferences, src/references/resolve.ts).

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	createSyntheticTerm,
	deleteSyntheticTerms,
	loadDevAccessToken,
	nativeDataOf,
	nativeRefusalOf,
	NATIVE_ROLES,
	portableTextBlock,
	publishEntryAt,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPdf,
	type CmsActor,
	type SyntheticPdf,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	VIEWPORTS,
	detailOf,
	expect,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectSiteNotFound,
	expectVisibleFocusOnEveryStop,
	listedItem,
	listedTitles,
	ownTitles,
	siteTitleParts,
	test,
	thaiDate,
} from "./public.helpers";

/** The fixed number of Announcements a list page shows. */
const PAGE_SIZE = 20;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];

interface Fixture {
	id: string;
	slug: string;
	title: string;
}

/** The instant today began in Bangkok (UTC+7), as an ISO string. */
function startOfBangkokToday(): string {
	const bangkok = new Date(Date.now() + 7 * HOUR);
	const midnight = Date.UTC(bangkok.getUTCFullYear(), bangkok.getUTCMonth(), bangkok.getUTCDate());
	return new Date(midnight - 7 * HOUR).toISOString();
}

/** Close dates on the Bangkok calendar: today at 00:00, yesterday at 23:59, and tomorrow. */
function closeDates() {
	const today = startOfBangkokToday();
	return {
		today,
		yesterday: new Date(Date.parse(today) - 60 * 1000).toISOString(),
		tomorrow: new Date(Date.parse(today) + DAY + HOUR).toISOString(),
	};
}

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

/** A synthetic Announcement draft. Its title is unique, so a page shows it or does not. */
async function createAnnouncement(
	label: string,
	fields: {
		data?: Record<string, unknown>;
		taxonomies?: Record<string, string[]>;
		references?: Record<string, string[]>;
		seo?: Record<string, unknown>;
	} = {},
): Promise<Fixture> {
	const slug = syntheticSlug(label);
	const title = `${SYNTHETIC_FIXTURE_MARK} ประกาศ ${label} ${slug.slice(-6)}`;
	const created = await createSyntheticEntry(admin, "announcements", {
		...fields,
		data: { title, ...fields.data },
		slug,
	});
	expect(created.result.ok, `announcement ${label}: ${nativeRefusalOf(created.result)}`).toBe(true);
	return { id: created.entryId!, slug, title };
}

/** A synthetic Document draft with `file`, and the terms given. */
async function createDocument(
	label: string,
	file: SyntheticPdf,
	taxonomies?: Record<string, string[]>,
): Promise<Fixture> {
	const slug = syntheticSlug(label);
	const title = `${SYNTHETIC_FIXTURE_MARK} เอกสาร ${label} ${slug.slice(-6)}`;
	const created = await createSyntheticEntry(admin, "documents", {
		data: { title, file: file.value },
		slug,
		...(taxonomies ? { taxonomies } : {}),
	});
	expect(created.result.ok, `document ${label}: ${nativeRefusalOf(created.result)}`).toBe(true);
	return { id: created.entryId!, slug, title };
}

/** Publish an entry of `collection` now, or backdated. Returns the stored publication instant. */
function publish(
	fixture: Fixture,
	publishedAt?: string,
	collection = "announcements",
): Promise<string> {
	return publishEntryAt(admin, collection, fixture.id, publishedAt);
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

test("/announcements lists current Announcements first and closed ones after, each newest first by announcement date with the publication as the fallback", async ({
	page,
}) => {
	const closes = closeDates();
	const currentUndated = await createAnnouncement("current-undated", {
		data: { closes_at: closes.tomorrow },
	});
	const currentRecent = await createAnnouncement("current-recent", {
		data: { announcement_at: "2026-10-20T03:00:00.000Z", closes_at: closes.today },
	});
	// Published before the recent one but announced after the old one, with no close date.
	const currentOld = await createAnnouncement("current-old", {
		data: { announcement_at: "2026-09-01T03:00:00.000Z" },
	});
	// Announced after the old current one, but closed: it comes after every current one.
	const closedRecent = await createAnnouncement("closed-recent", {
		data: { announcement_at: "2026-10-25T03:00:00.000Z", closes_at: closes.yesterday },
	});
	const closedOld = await createAnnouncement("closed-old", {
		data: {
			announcement_at: "2026-08-01T03:00:00.000Z",
			closes_at: "2026-08-31T03:00:00.000Z",
		},
	});
	const draft = await createAnnouncement("draft");
	const unpublished = await createAnnouncement("unpublished");
	const trashed = await createAnnouncement("trashed");
	await publish(unpublished);
	await publish(trashed);
	expect((await unpublishEntry(admin, "announcements", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "announcements", trashed.id)).ok, "trash").toBe(true);
	await publish(closedOld);
	await publish(closedRecent);
	await publish(currentOld, "2026-09-05T03:00:00.000Z");
	await publish(currentRecent, "2026-08-01T03:00:00.000Z");
	const undatedAt = await publish(currentUndated);

	const response = await page.goto("/announcements");
	expect(response?.status(), "GET /announcements").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("ประกาศ");
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "ข่าวสาร" }),
	).toHaveAttribute("aria-current", "true");
	const breadcrumb = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
	await expect(breadcrumb.getByRole("link")).toHaveText(["หน้าแรก", "ข่าวสาร"]);
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("ประกาศ");

	const all = [
		currentUndated,
		currentRecent,
		currentOld,
		closedRecent,
		closedOld,
		draft,
		unpublished,
		trashed,
	];
	expect(
		ownTitles(await listedTitles(page), all),
		"published only, current first, each newest first",
	).toEqual([
		currentUndated.title,
		currentRecent.title,
		currentOld.title,
		closedRecent.title,
		closedOld.title,
	]);

	for (const closed of [closedRecent, closedOld]) {
		await expect(listedItem(page, closed.title), `${closed.title} is marked`).toContainText(
			"ปิดแล้ว",
		);
	}
	for (const current of [currentUndated, currentRecent, currentOld]) {
		await expect(
			listedItem(page, current.title),
			`${current.title} is not marked`,
		).not.toContainText("ปิดแล้ว");
	}
	await expect(listedItem(page, closedRecent.title)).toContainText(
		`วันที่สิ้นสุด ${thaiDate(closes.yesterday)}`,
	);
	await expect(listedItem(page, currentRecent.title)).toContainText(
		`วันที่สิ้นสุด ${thaiDate(closes.today)}`,
	);
	await expect(listedItem(page, currentOld.title)).not.toContainText("วันที่สิ้นสุด");

	const row = listedItem(page, currentUndated.title);
	await expect(row.getByRole("link", { name: currentUndated.title })).toHaveAttribute(
		"href",
		`/announcements/${currentUndated.slug}`,
	);
	await expect(row.locator("time").first(), "dated by its publication").toHaveText(
		thaiDate(undatedAt),
	);
	await expect(listedItem(page, currentOld.title).locator("time")).toHaveText(
		thaiDate("2026-09-01T03:00:00.000Z"),
	);
});

test("an Announcement closing today is current, one that closed yesterday is closed, and one without a close date is current, on its own page too", async ({
	page,
}) => {
	const closes = closeDates();
	const today = await createAnnouncement("closes-today", { data: { closes_at: closes.today } });
	const yesterday = await createAnnouncement("closed-yesterday", {
		data: { closes_at: closes.yesterday },
	});
	const none = await createAnnouncement("no-close-date");
	for (const announcement of [today, yesterday, none]) await publish(announcement);

	await page.goto("/announcements");
	const listed = ownTitles(await listedTitles(page), [today, yesterday, none]);
	expect(listed.indexOf(yesterday.title), "the closed one comes after both current ones").toBe(2);
	await expect(listedItem(page, yesterday.title)).toContainText("ปิดแล้ว");
	await expect(listedItem(page, today.title)).not.toContainText("ปิดแล้ว");
	await expect(listedItem(page, none.title)).not.toContainText("ปิดแล้ว");

	await page.goto(`/announcements/${yesterday.slug}`);
	await expect(detailOf(page, "สถานะ")).toHaveText("ปิดแล้ว");
	await expect(detailOf(page, "วันที่สิ้นสุด")).toHaveText(thaiDate(closes.yesterday));
	for (const current of [today, none]) {
		await page.goto(`/announcements/${current.slug}`);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(current.title);
		await expect(page.getByRole("main").getByText("ปิดแล้ว"), current.title).toHaveCount(0);
	}
});

test("/announcements pages through its Announcements, current ones before closed ones across pages", async ({
	page,
}) => {
	// Announced in 2030, after any real Announcement, so the current ones lead the first page.
	const current: Fixture[] = [];
	for (let index = 0; index < PAGE_SIZE; index += 1) {
		const day = String(index + 1).padStart(2, "0");
		current.push(
			await createAnnouncement(`page-${day}`, {
				data: { announcement_at: `2030-01-${day}T03:00:00.000Z` },
			}),
		);
	}
	const closed = await createAnnouncement("page-closed", {
		data: {
			announcement_at: "2030-12-31T03:00:00.000Z",
			closes_at: "2026-01-31T03:00:00.000Z",
		},
	});
	for (const announcement of [closed, ...current]) await publish(announcement);
	const all = [...current, closed];

	await page.goto("/announcements");
	expect(ownTitles(await listedTitles(page), all), "the first page").toEqual(
		current.toReversed().map((announcement) => announcement.title),
	);
	await page
		.getByRole("navigation", { name: "การแบ่งหน้า" })
		.getByRole("link", { name: "หน้าถัดไป" })
		.click();
	await expect(page).toHaveURL(/\/announcements\?page=2$/);
	expect(ownTitles(await listedTitles(page), all), "the second page").toEqual([closed.title]);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/announcements?page=2`,
	);

	const beyond = await page.goto("/announcements?page=10000");
	expect(beyond?.status(), "a page past the end is not an error").toBe(200);
	await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("ไม่พบประกาศในหน้านี้")).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: "กลับไปหน้าแรกของรายการ" }),
	).toHaveAttribute("href", "/announcements");
});

test("an Announcement page shows its type, dates, details and its published attached Documents, each linking to its Document page", async ({
	page,
}) => {
	const type = await createTerm("announcement_type", "รับสมัคร");
	const documentType = await createTerm("document_type", "ใบสมัคร");
	const file = await uploadSyntheticPdf(admin);
	const first = await createDocument("attached-first", file, {
		document_type: [documentType.slug],
	});
	const second = await createDocument("attached-second", file);
	const draft = await createDocument("attached-draft", file);
	const unpublished = await createDocument("attached-unpublished", file);
	const trashed = await createDocument("attached-trashed", file);
	for (const document of [first, second, unpublished, trashed]) {
		await publish(document, undefined, "documents");
	}
	const detailsText = `${SYNTHETIC_FIXTURE_MARK} ผู้สนใจยื่นใบสมัครได้ที่สำนักงานสาธารณสุขอำเภอสอง`;
	const announcement = await createAnnouncement("detail", {
		data: {
			details: [portableTextBlock(detailsText)],
			// 23 Sep 2026 17:30 UTC is already 24 Sep in Bangkok.
			announcement_at: "2026-09-23T17:30:00.000Z",
			opens_at: "2026-10-01T02:00:00.000Z",
			closes_at: "2030-10-31T10:00:00.000Z",
		},
		taxonomies: { announcement_type: [type.slug] },
		references: { documents: [second.id, draft.id, first.id, unpublished.id, trashed.id] },
	});
	await publish(announcement);
	expect((await unpublishEntry(admin, "documents", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "documents", trashed.id)).ok, "trash").toBe(true);

	const response = await page.goto(`/announcements/${announcement.slug}`);
	expect(response?.status(), "GET the Announcement page").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(announcement.title);
	await expect(detailOf(page, "ประเภทประกาศ")).toHaveText(type.label);
	await expect(detailOf(page, "วันที่ประกาศ")).toHaveText("24 ก.ย. 2569");
	await expect(detailOf(page, "วันที่เริ่มต้น")).toHaveText("1 ต.ค. 2569");
	await expect(detailOf(page, "วันที่สิ้นสุด")).toHaveText("31 ต.ค. 2573");
	await expect(main.getByRole("term").filter({ hasText: "สถานะ" })).toHaveCount(0);
	await expect(main.getByText(detailsText)).toBeVisible();

	const attached = main.getByRole("region", { name: "เอกสารที่เกี่ยวข้อง" });
	expect(
		(await attached.getByRole("article").getByRole("heading").allTextContents()).map((text) =>
			text.trim(),
		),
		"the published Documents, in the order they were attached",
	).toEqual([second.title, first.title]);
	for (const document of [first, second]) {
		await expect(attached.getByRole("link", { name: document.title })).toHaveAttribute(
			"href",
			`/documents/${document.slug}`,
		);
	}
	const firstRow = attached.getByRole("article").filter({ hasText: first.title });
	await expect(firstRow, "a related Document's row names its type").toContainText(
		documentType.label,
	);
	await expect(firstRow).toContainText("PDF, 2 KB");
	for (const hidden of [draft, unpublished, trashed]) {
		await expect(main.getByText(hidden.title), hidden.title).toHaveCount(0);
	}

	const breadcrumb = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
	await expect(breadcrumb.getByRole("link")).toHaveText(["หน้าแรก", "ข่าวสาร", "ประกาศ"]);
	await expect(breadcrumb.getByRole("link", { name: "ประกาศ" })).toHaveAttribute(
		"href",
		"/announcements",
	);
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(announcement.title);
});

test("an Announcement page leaves out the details and Documents it does not have", async ({
	page,
}) => {
	const announcement = await createAnnouncement("minimal");
	const publishedAt = await publish(announcement);

	await page.goto(`/announcements/${announcement.slug}`);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(announcement.title);
	await expect(main.getByText(`เผยแพร่ ${thaiDate(publishedAt)}`)).toBeVisible();
	for (const name of ["ประเภทประกาศ", "วันที่ประกาศ", "วันที่เริ่มต้น", "วันที่สิ้นสุด", "สถานะ"]) {
		await expect(main.getByRole("term").filter({ hasText: name }), name).toHaveCount(0);
	}
	await expect(main.getByRole("region", { name: "เอกสารที่เกี่ยวข้อง" })).toHaveCount(0);
});

test("a draft, unpublished or trashed Announcement answers the site 404 and stays out of the list", async ({
	page,
}) => {
	const draft = await createAnnouncement("hidden-draft");
	const unpublished = await createAnnouncement("hidden-unpublished");
	const trashed = await createAnnouncement("hidden-trashed");
	await publish(unpublished);
	await publish(trashed);
	expect((await unpublishEntry(admin, "announcements", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "announcements", trashed.id)).ok, "trash").toBe(true);
	const hidden = [draft, unpublished, trashed];

	for (const announcement of hidden) {
		await expectSiteNotFound(page, `/announcements/${announcement.slug}`, announcement.title);
	}
	await page.goto("/announcements");
	expect(ownTitles(await listedTitles(page), hidden), "the list hides them").toEqual([]);
});

test("a signed preview link renders a draft Announcement, and the same address without a valid token answers 404", async ({
	page,
}) => {
	const draft = await createAnnouncement("preview");
	const minted = await cmsRequest(
		admin,
		`/_emdash/api/content/announcements/${encodeURIComponent(draft.id)}/preview-url`,
		{ method: "POST", body: {} },
	);
	expect(minted.ok, nativeRefusalOf(minted)).toBe(true);
	// The signed token stays out of every message.
	const link = new URL(String(nativeDataOf(minted)?.url), origin);
	expect(link.pathname, "the preview link is the draft's canonical address").toBe(
		`/announcements/${draft.slug}`,
	);

	const preview = await page.goto(link.toString());
	expect(preview?.status(), "the preview renders").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(draft.title);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

	await expectSiteNotFound(page, link.pathname, "the draft without a token");
});

test("the Announcement pages carry their title, description, absolute canonical address and OG tags, with the SEO fields first and the start of the details as the fallback", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const meta = (selector: string) => page.locator(selector).first();
	const opening = `${SYNTHETIC_FIXTURE_MARK} ประกาศรับสมัครอาสาสมัครสาธารณสุขประจำหมู่บ้าน`;
	const details = [portableTextBlock(opening), portableTextBlock("ย่อหน้าที่สอง ".repeat(30))];
	const plain = await createAnnouncement("seo-plain", { data: { details } });
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} ชื่อประกาศสำหรับเครื่องมือค้นหา`;
	const seoDescription = `${SYNTHETIC_FIXTURE_MARK} คำอธิบายประกาศจากช่อง SEO`;
	const tuned = await createAnnouncement("seo-tuned", {
		data: { details },
		seo: { title: seoTitle, description: seoDescription },
	});
	await publish(plain);
	await publish(tuned);

	await page.goto(`/announcements/${plain.slug}`);
	await expect(page).toHaveTitle(`${plain.title}${separator}${siteTitle}`);
	const description = await meta('meta[name="description"]').getAttribute("content");
	expect(description, "the description starts with the details").toMatch(
		new RegExp(`^${opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
	);
	expect(description!.length, "the description is short").toBeLessThanOrEqual(160);
	expect(description, "and marks where it was cut").toMatch(/…$/);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/announcements/${plain.slug}`,
	);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", plain.title);
	await expect(meta('meta[property="og:url"]')).toHaveAttribute(
		"content",
		`${origin}/announcements/${plain.slug}`,
	);
	await expect(meta('meta[name="robots"]')).toHaveCount(0);

	await page.goto(`/announcements/${tuned.slug}`);
	await expect(page).toHaveTitle(`${seoTitle}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", seoDescription);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", seoTitle);

	await page.goto("/announcements");
	await expect(page).toHaveTitle(`ประกาศ${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", /.+/);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/announcements`);
	await expect(meta('meta[property="og:type"]')).toHaveAttribute("content", "website");
});

test.describe("accessibility and reflow", () => {
	let paths: string[];

	test.beforeAll(async () => {
		const closes = closeDates();
		const type = await createTerm("announcement_type", "ประชาสัมพันธ์");
		const file = await uploadSyntheticPdf(admin);
		const document = await createDocument("a11y-attached", file);
		await publish(document, undefined, "documents");
		const detailed = await createAnnouncement("a11y", {
			data: {
				details: [
					portableTextBlock(`${SYNTHETIC_FIXTURE_MARK} รายละเอียดประกาศสำหรับตรวจการเข้าถึง`),
					portableTextBlock("ขั้นตอนการสมัคร", "h2"),
					portableTextBlock("ยื่นใบสมัครพร้อมสำเนาบัตรประชาชน"),
				],
				announcement_at: "2030-02-02T03:00:00.000Z",
				opens_at: "2030-02-03T03:00:00.000Z",
				closes_at: "2030-02-28T03:00:00.000Z",
			},
			taxonomies: { announcement_type: [type.slug] },
			references: { documents: [document.id] },
		});
		const closed = await createAnnouncement("a11y-closed", {
			data: { closes_at: closes.yesterday },
			taxonomies: { announcement_type: [type.slug] },
		});
		await publish(detailed);
		await publish(closed);
		paths = [
			"/announcements",
			"/announcements?page=10000",
			`/announcements/${detailed.slug}`,
			`/announcements/${closed.slug}`,
		];
	});

	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on the Announcement pages at the ${width} width`, async ({
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

	test("no Announcement page scrolls sideways at 320 px", async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		for (const path of paths) {
			await page.goto(path);
			await expectNoHorizontalScroll(page, path);
		}
	});
});

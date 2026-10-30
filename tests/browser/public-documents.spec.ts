// The Document repository (#55; spec #51 "Public reads" (Documents), `03` §10 and §17).
//
// A citizen finds Documents at /documents, filtered by Document Type, topic and fiscal year with
// the filters kept in the address, and opens each at its canonical /documents/{slug} address to
// read its details and download its file. A superseded or expired Document says so in text and
// links to its successor. A Document whose file is gone shows "ไฟล์ไม่พร้อมให้บริการ" and nothing
// about storage. Drafts, unpublished and trashed Documents never show anywhere, and their
// addresses answer the site 404.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Documents with synthetic PDF files, and synthetic
// document_type and topic terms, made through the native API the way the Admin makes them and
// removed afterwards. The runtime may hold other Documents (the demo dataset, the Product Owner's
// own), so assertions look only at this suite's uniquely titled fixtures, and tests about
// "newest first" publish their fixtures last.
//
// Platform behaviour relied on (emdash 1.1.0):
// - The upload route accepts application/pdf (src/api/handlers/media-allowlist.ts) and returns the
//   media item with its storage key (src/astro/routes/api/media.ts).
// - A file field value is saved the way the Admin's file picker sends it (@emdash-cms/admin 1.1.0
//   FileFieldRenderer); EmDash keeps its id, filename, MIME type and storage key
//   (src/media/normalize.ts).
// - Deleting a media item removes its stored file (src/api/handlers/media.ts handleMediaDelete);
//   the Document that uses it keeps the value (no published-reference veto, `02` §13).

import {
	createSyntheticDocument,
	createOwnedTerm,
	deleteMedia,
	devAdminActor,
	nativeRefusalOf,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	SYNTHETIC_PDF_BYTES,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPdf,
	type CmsActor,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	SECTION_CRUMBS,
	detailOf,
	expect,
	expectBreadcrumb,
	expectPreviewRenders,
	expectSiteNotFound,
	listedItem,
	listedTitles,
	ownTitles,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	thaiDate,
} from "./public.helpers";

/** The fixed number of Documents a list page shows. */
const PAGE_SIZE = 20;

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];

/** A synthetic term of `taxonomy`, labelled in Thai so it reads like a real one. */
const createTerm = (taxonomy: string, label: string) =>
	createOwnedTerm(admin, taxonomy, label, ownedTerms);

type DocumentFixture = Awaited<ReturnType<typeof createSyntheticDocument>>;

/** A synthetic Document draft with its own synthetic PDF unless `fields` gives one. */
const createDocument = (label: string, fields?: Parameters<typeof createSyntheticDocument>[2]) =>
	createSyntheticDocument(admin, label, fields);

/** Publish now. */
async function publish(document: DocumentFixture): Promise<void> {
	await publishEntryAt(admin, "documents", document.id);
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

test("/documents lists only published Documents, newest first, each row with its type, date, fiscal year, file type and size", async ({
	page,
}) => {
	const type = await createTerm("document_type", "แบบฟอร์ม");
	const documentAt = "2026-09-23T17:30:00.000Z";
	const older = await createDocument("older", {
		data: { document_at: documentAt, fiscal_year: 2569 },
		taxonomies: { document_type: [type.slug] },
	});
	const newer = await createDocument("newer");
	const draft = await createDocument("draft");
	const unpublished = await createDocument("unpublished");
	const trashed = await createDocument("trashed");
	await publish(unpublished);
	await publish(trashed);
	await publish(older);
	await publish(newer);
	expect((await unpublishEntry(admin, "documents", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "documents", trashed.id)).ok, "trash").toBe(true);

	const response = await page.goto("/documents");
	expect(response?.status(), "GET /documents").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("เอกสารเผยแพร่");
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "เอกสารเผยแพร่" }),
	).toHaveAttribute("aria-current", "page");
	await expectBreadcrumb(page, [HOME_CRUMB], "เอกสารเผยแพร่");

	expect(
		ownTitles(await listedTitles(page), [older, newer, draft, unpublished, trashed]),
		"published only, newest first",
	).toEqual([newer.title, older.title]);

	const row = listedItem(page, older.title);
	await expect(row.getByRole("link", { name: older.title })).toHaveAttribute(
		"href",
		`/documents/${older.slug}`,
	);
	await expect(row).toContainText(type.label);
	await expect(row.locator("time")).toHaveText(thaiDate(documentAt));
	await expect(row).toContainText("ปีงบประมาณ 2569");
	await expect(row).toContainText("PDF");
	await expect(row).toContainText("2 KB");
});

test("the Document Type, topic and fiscal year filters narrow /documents alone and combined, and stay in the address", async ({
	page,
}) => {
	const form = await createTerm("document_type", "แบบฟอร์ม");
	const plan = await createTerm("document_type", "แผนงาน");
	const topic = await createTerm("topic", "วัคซีน");
	const formVaccine = await createDocument("filter-form-vaccine", {
		data: { fiscal_year: 2569 },
		taxonomies: { document_type: [form.slug], topic: [topic.slug] },
	});
	const formOlder = await createDocument("filter-form-older", {
		data: { fiscal_year: 2568 },
		taxonomies: { document_type: [form.slug] },
	});
	const planVaccine = await createDocument("filter-plan-vaccine", {
		data: { fiscal_year: 2569 },
		taxonomies: { document_type: [plan.slug], topic: [topic.slug] },
	});
	const plain = await createDocument("filter-plain");
	const all = [formVaccine, formOlder, planVaccine, plain];
	for (const document of all) await publish(document);

	await page.goto("/documents");
	const filters = page.getByRole("form", { name: "กรองเอกสาร" });
	const submit = async () => {
		await filters.getByRole("button", { name: "แสดงผล" }).click();
		await page.waitForLoadState();
	};
	const params = () => Object.fromEntries(new URL(page.url()).searchParams);

	await filters.getByLabel("ประเภทเอกสาร").selectOption({ label: form.label });
	await submit();
	expect(params()).toMatchObject({ type: form.slug });
	expect(ownTitles(await listedTitles(page), all), "by type").toEqual([
		formOlder.title,
		formVaccine.title,
	]);
	await expect(filters.getByLabel("ประเภทเอกสาร")).toHaveValue(form.slug);

	await filters.getByLabel("ประเด็นสุขภาพ").selectOption({ label: topic.label });
	await submit();
	expect(params()).toMatchObject({ type: form.slug, topic: topic.slug });
	expect(ownTitles(await listedTitles(page), all), "by type and topic").toEqual([
		formVaccine.title,
	]);

	await filters.getByLabel("ประเภทเอกสาร").selectOption({ label: "ทุกประเภท" });
	await filters.getByLabel("ปีงบประมาณ").selectOption({ label: "2569" });
	await submit();
	expect(params()).toMatchObject({ type: "", topic: topic.slug, year: "2569" });
	expect(ownTitles(await listedTitles(page), all), "by topic and fiscal year").toEqual([
		planVaccine.title,
		formVaccine.title,
	]);
	await expect(filters.getByLabel("ปีงบประมาณ")).toHaveValue("2569");
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/documents?topic=${topic.slug}&year=2569`,
	);

	await page.goto(`/documents?year=2568`);
	expect(ownTitles(await listedTitles(page), all), "by fiscal year alone").toEqual([
		formOlder.title,
	]);

	await filters.getByRole("link", { name: "ล้างตัวกรอง" }).click();
	await expect(page).toHaveURL("/documents");
});

test("a filtered /documents pages through its Documents with the filters and page number kept in the address", async ({
	page,
}) => {
	const type = await createTerm("document_type", "รายงาน");
	const file = await uploadSyntheticPdf(admin);
	const fixtures: DocumentFixture[] = [];
	for (let index = 0; index <= PAGE_SIZE; index += 1) {
		fixtures.push(
			await createDocument(`page-${String(index).padStart(2, "0")}`, {
				file,
				taxonomies: { document_type: [type.slug] },
			}),
		);
	}
	for (const document of fixtures) await publish(document);
	const newestFirst = fixtures.toReversed().map((document) => document.title);

	await page.goto(`/documents?type=${type.slug}`);
	expect(await listedTitles(page), "the first page").toEqual(newestFirst.slice(0, PAGE_SIZE));
	await page
		.getByRole("navigation", { name: "การแบ่งหน้า" })
		.getByRole("link", { name: "หน้าถัดไป" })
		.click();
	await expect(page).toHaveURL(`/documents?type=${type.slug}&page=2`);
	expect(await listedTitles(page), "the second page").toEqual(newestFirst.slice(PAGE_SIZE));
	await expect(
		page.getByRole("form", { name: "กรองเอกสาร" }).getByLabel("ประเภทเอกสาร"),
	).toHaveValue(type.slug);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/documents?type=${type.slug}&page=2`,
	);

	const beyond = await page.goto(`/documents?type=${type.slug}&page=10000`);
	expect(beyond?.status(), "a page past the end is not an error").toBe(200);
	await expect(page.getByRole("main").getByText("ไม่พบเอกสารในหน้านี้")).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: "กลับไปหน้าแรกของรายการ" }),
	).toHaveAttribute("href", `/documents?type=${type.slug}`);
});

test("the fiscal year filter offers the years of published Documents, newest first", async ({
	page,
}) => {
	const recent = await createDocument("years-recent", { data: { fiscal_year: 2569 } });
	const older = await createDocument("years-older", { data: { fiscal_year: 2568 } });
	// A year written short, as staff might type it: offered, and choosing it filters by it.
	const short = await createDocument("years-short", { data: { fiscal_year: 69 } });
	await createDocument("years-draft", { data: { fiscal_year: 2401 } });
	await publish(recent);
	await publish(older);
	await publish(short);

	await page.goto("/documents");
	const years = (
		await page
			.getByRole("form", { name: "กรองเอกสาร" })
			.getByLabel("ปีงบประมาณ")
			.locator("option")
			.allTextContents()
	).map((text) => text.trim());
	expect(years[0], "the first choice is no filter").toBe("ทุกปีงบประมาณ");
	const numeric = years.slice(1).map(Number);
	expect(numeric, "newest first, each year once").toEqual(
		[...new Set(numeric)].sort((a, b) => b - a),
	);
	expect(numeric).toEqual(expect.arrayContaining([2569, 2568, 69]));
	expect(numeric, "a draft's fiscal year is not offered").not.toContain(2401);

	await page.goto("/documents?year=69");
	expect(
		ownTitles(await listedTitles(page), [recent, older, short]),
		"every offered year filters",
	).toEqual([short.title]);
});

test("an empty filtered result shows the empty state, and a fiscal year that is not one is ignored", async ({
	page,
}) => {
	const document = await createDocument("filter-safe");
	await publish(document);

	const unknown = await page.goto(`/documents?type=${syntheticSlug("no-such-type")}`);
	expect(unknown?.status(), "an unknown Document Type is not an error").toBe(200);
	await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("ไม่พบเอกสารตามตัวกรองที่เลือก")).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: "ดูเอกสารทั้งหมด" }),
	).toHaveAttribute("href", "/documents");

	for (const invalid of ["abc", "25690", "2569.5", "-2569", "0", "02569"]) {
		const response = await page.goto(`/documents?year=${encodeURIComponent(invalid)}`);
		expect(response?.status(), `?year=${invalid} is ignored, not an error`).toBe(200);
		expect(
			ownTitles(await listedTitles(page), [document]),
			`?year=${invalid} lists every Document`,
		).toEqual([document.title]);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			"href",
			`${origin}/documents`,
		);
	}
});

test("a Document page shows its details, its file for download at EmDash's media URL, and its breadcrumb", async ({
	page,
	request,
}) => {
	const type = await createTerm("document_type", "แผนงาน");
	const topic = await createTerm("topic", "ไข้เลือดออก");
	const file = await uploadSyntheticPdf(
		admin,
		`${SYNTHETIC_FIXTURE_MARK}-แผนปฏิบัติการ-${crypto.randomUUID().slice(0, 6)}.pdf`,
	);
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปแผนปฏิบัติการด้านสุขภาพ`;
	const ownerSource = `${SYNTHETIC_FIXTURE_MARK} กลุ่มงานควบคุมโรค`;
	const document = await createDocument("detail", {
		file,
		data: {
			summary,
			// 23 Sep 2026 17:30 UTC is already 24 Sep in Bangkok.
			document_at: "2026-09-23T17:30:00.000Z",
			fiscal_year: 2569,
			owner_source: ownerSource,
			domain_status: "current",
		},
		taxonomies: { document_type: [type.slug], topic: [topic.slug] },
	});
	await publish(document);

	const response = await page.goto(`/documents/${document.slug}`);
	expect(response?.status(), "GET the Document page").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(document.title);
	await expect(main.getByText(summary)).toBeVisible();
	await expect(detailOf(page, "ประเภทเอกสาร")).toHaveText(type.label);
	await expect(detailOf(page, "วันที่เอกสาร")).toHaveText("24 ก.ย. 2569");
	await expect(detailOf(page, "ปีงบประมาณ")).toHaveText("2569");
	await expect(detailOf(page, "เจ้าของ/แหล่งที่มา")).toHaveText(ownerSource);
	await expect(detailOf(page, "สถานะเอกสาร")).toHaveText("ฉบับปัจจุบัน");
	await expect(
		detailOf(page, "ประเด็นสุขภาพ").getByRole("link", { name: topic.label }),
	).toHaveAttribute("href", `/documents?topic=${topic.slug}`);

	const download = main.getByRole("link", { name: /ดาวน์โหลด/ });
	await expect(download).toHaveAttribute("href", `/_emdash/api/media/file/${file.storageKey}`);
	await expect(download).toHaveAttribute("download", file.filename);
	await expect(download).toContainText("PDF");
	await expect(download).toContainText("2 KB");
	const served = await request.get(`/_emdash/api/media/file/${file.storageKey}`);
	expect(served.status(), "EmDash serves the file at that address").toBe(200);
	expect(served.headers()["content-type"]).toBe("application/pdf");
	expect((await served.body()).length).toBe(SYNTHETIC_PDF_BYTES);

	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.documents], document.title);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "เอกสารเผยแพร่" }),
	).toHaveAttribute("aria-current", "true");
});

test("a Document page leaves out the optional details that are not set", async ({ page }) => {
	const document = await createDocument("minimal");
	await publish(document);

	await page.goto(`/documents/${document.slug}`);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(document.title);
	await expect(main.getByRole("link", { name: /ดาวน์โหลด/ })).toBeVisible();
	for (const name of [
		"ประเภทเอกสาร",
		"วันที่เอกสาร",
		"ปีงบประมาณ",
		"เจ้าของ/แหล่งที่มา",
		"สถานะเอกสาร",
		"ประเด็นสุขภาพ",
	]) {
		await expect(main.getByRole("term").filter({ hasText: name }), name).toHaveCount(0);
	}
	await expect(main.locator("time")).toHaveCount(0);
	await expect(main.getByText("เอกสารฉบับถัดไป")).toHaveCount(0);
});

test("a superseded or expired Document says so in text and links to its published successor", async ({
	page,
}) => {
	const successor = await createDocument("successor");
	await publish(successor);
	const draftSuccessor = await createDocument("successor-draft");
	const superseded = await createDocument("superseded", {
		data: { domain_status: "superseded" },
		references: { successor: [successor.id] },
	});
	const expired = await createDocument("expired", { data: { domain_status: "expired" } });
	const pointsAtDraft = await createDocument("superseded-by-draft", {
		data: { domain_status: "superseded" },
		references: { successor: [draftSuccessor.id] },
	});
	await publish(superseded);
	await publish(expired);
	await publish(pointsAtDraft);

	await page.goto(`/documents/${superseded.slug}`);
	await expect(detailOf(page, "สถานะเอกสาร")).toHaveText("ถูกแทนที่แล้ว");
	await expect(page.getByRole("main").getByRole("link", { name: successor.title })).toHaveAttribute(
		"href",
		`/documents/${successor.slug}`,
	);

	await page.goto(`/documents/${expired.slug}`);
	await expect(detailOf(page, "สถานะเอกสาร")).toHaveText("หมดอายุแล้ว");
	await expect(page.getByRole("main").getByText("เอกสารฉบับถัดไป")).toHaveCount(0);

	await page.goto(`/documents/${pointsAtDraft.slug}`);
	await expect(detailOf(page, "สถานะเอกสาร")).toHaveText("ถูกแทนที่แล้ว");
	await expect(page.getByRole("main").getByText(draftSuccessor.title)).toHaveCount(0);
	await expect(page.getByRole("main").getByText("เอกสารฉบับถัดไป")).toHaveCount(0);

	await page.goto("/documents");
	await expect(listedItem(page, superseded.title)).toContainText("ถูกแทนที่แล้ว");
	await expect(listedItem(page, expired.title)).toContainText("หมดอายุแล้ว");
});

test("a Document whose file was deleted shows the unavailable state with status 200 and no storage detail", async ({
	page,
}) => {
	const document = await createDocument("file-gone");
	await publish(document);
	const removed = await deleteMedia(admin, document.file.mediaId);
	expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);

	const response = await page.goto(`/documents/${document.slug}`);
	expect(response?.status(), "the page still renders").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(document.title);
	await expect(main.getByText("ไฟล์ไม่พร้อมให้บริการ")).toBeVisible();
	await expect(main.getByRole("link", { name: /ดาวน์โหลด/ })).toHaveCount(0);
	const html = await page.content();
	for (const detail of [
		document.file.storageKey,
		document.file.mediaId,
		document.file.filename,
		"/_emdash/api/media/file",
	]) {
		expect(html.includes(detail), `the page must not reveal ${detail}`).toBe(false);
	}

	await page.goto("/documents");
	await expect(listedItem(page, document.title)).toContainText("ไฟล์ไม่พร้อมให้บริการ");
});

test("a draft, unpublished or trashed Document answers the site 404 and stays out of the list", async ({
	page,
}) => {
	const type = await createTerm("document_type", "ประกาศ");
	const tagged = { taxonomies: { document_type: [type.slug] } };
	const draft = await createDocument("hidden-draft", tagged);
	const unpublished = await createDocument("hidden-unpublished", tagged);
	const trashed = await createDocument("hidden-trashed", tagged);
	await publish(unpublished);
	await publish(trashed);
	expect((await unpublishEntry(admin, "documents", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "documents", trashed.id)).ok, "trash").toBe(true);
	const hidden = [draft, unpublished, trashed];

	for (const document of hidden) {
		await expectSiteNotFound(page, `/documents/${document.slug}`, document.title);
	}
	for (const list of ["/documents", `/documents?type=${type.slug}`]) {
		await page.goto(list);
		expect(ownTitles(await listedTitles(page), hidden), `${list} hides them`).toEqual([]);
	}
});

test("a signed preview link renders a draft Document, and the same address without a valid token answers 404", async ({
	page,
}) => {
	const draft = await createDocument("preview");
	const link = await expectPreviewRenders(
		page,
		admin,
		"documents",
		draft,
		`/documents/${draft.slug}`,
	);

	await expectSiteNotFound(page, link.pathname, "the draft without a token");
});

test("the Document pages carry their title, description, absolute canonical address and OG tags, with the SEO fields first and the summary as the fallback", async ({
	page,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const meta = (selector: string) => page.locator(selector).first();
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปเอกสารสำหรับเครื่องมือค้นหา`;
	const plain = await createDocument("seo-plain", { data: { summary } });
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} ชื่อเอกสารสำหรับเครื่องมือค้นหา`;
	const seoDescription = `${SYNTHETIC_FIXTURE_MARK} คำอธิบายเอกสารจากช่อง SEO`;
	const tuned = await createDocument("seo-tuned", {
		data: { summary },
		seo: { title: seoTitle, description: seoDescription },
	});
	await publish(plain);
	await publish(tuned);

	await page.goto(`/documents/${plain.slug}`);
	await expect(page).toHaveTitle(`${plain.title}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", summary);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/documents/${plain.slug}`,
	);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", plain.title);
	await expect(meta('meta[property="og:url"]')).toHaveAttribute(
		"content",
		`${origin}/documents/${plain.slug}`,
	);
	await expect(meta('meta[name="robots"]')).toHaveCount(0);

	await page.goto(`/documents/${tuned.slug}`);
	await expect(page).toHaveTitle(`${seoTitle}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", seoDescription);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", seoTitle);

	await page.goto("/documents");
	await expect(page).toHaveTitle(`เอกสารเผยแพร่${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", /.+/);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/documents`);
	await expect(meta('meta[property="og:type"]')).toHaveAttribute("content", "website");
});

test.describe("accessibility and reflow", () => {
	let paths: string[];

	test.beforeAll(async () => {
		const type = await createTerm("document_type", "คู่มือ");
		const topic = await createTerm("topic", "ผู้สูงอายุ");
		const successor = await createDocument("a11y-successor", {
			taxonomies: { document_type: [type.slug] },
		});
		await publish(successor);
		const detailed = await createDocument("a11y", {
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} สรุปเอกสารสำหรับตรวจการเข้าถึง`,
				document_at: "2026-09-23T17:30:00.000Z",
				fiscal_year: 2569,
				owner_source: `${SYNTHETIC_FIXTURE_MARK} งานยุทธศาสตร์`,
				domain_status: "superseded",
			},
			taxonomies: { document_type: [type.slug], topic: [topic.slug] },
			references: { successor: [successor.id] },
		});
		await publish(detailed);
		const fileGone = await createDocument("a11y-file-gone", {
			data: { domain_status: "expired" },
		});
		await publish(fileGone);
		const removed = await deleteMedia(admin, fileGone.file.mediaId);
		expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);
		paths = [
			"/documents",
			`/documents?type=${type.slug}&topic=${topic.slug}&year=2569`,
			`/documents?type=${syntheticSlug("no-such-type")}`,
			`/documents/${detailed.slug}`,
			`/documents/${fileGone.slug}`,
		];
	});

	testAccessibilityAndReflow("the Document pages", () => paths);
});

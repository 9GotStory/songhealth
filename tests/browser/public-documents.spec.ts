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

import type { Page } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	loadDevAccessToken,
	nativeDataOf,
	nativeItemOf,
	nativeRefusalOf,
	NATIVE_ROLES,
	readEntry,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	uploadSyntheticMedia,
	type CmsActor,
} from "./cms.helpers";
import { DESKTOP_VIEWPORT, expect, test } from "./public.helpers";

/** The exact size of every synthetic PDF, which the pages state as "2 KB". */
const PDF_BYTES = 2048;

const THAI_MONTHS = [
	"ม.ค.",
	"ก.พ.",
	"มี.ค.",
	"เม.ย.",
	"พ.ค.",
	"มิ.ย.",
	"ก.ค.",
	"ส.ค.",
	"ก.ย.",
	"ต.ค.",
	"พ.ย.",
	"ธ.ค.",
];

/** A stored instant as citizens read it: the Bangkok (UTC+7) day with the Buddhist Era year. */
function thaiDate(iso: string): string {
	const bangkok = new Date(Date.parse(iso) + 7 * 60 * 60 * 1000);
	return `${bangkok.getUTCDate()} ${THAI_MONTHS[bangkok.getUTCMonth()]} ${bangkok.getUTCFullYear() + 543}`;
}

/** A valid one-page PDF of exactly PDF_BYTES bytes, padded with a comment that makes it unique. */
function syntheticPdf(): Uint8Array<ArrayBuffer> {
	const body = [
		"%PDF-1.4",
		"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
		"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
		"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj",
		"trailer << /Root 1 0 R >>",
		`% ${SYNTHETIC_FIXTURE_MARK} ${crypto.randomUUID()}`,
	].join("\n");
	const end = "\n%%EOF\n";
	const text = `${body}\n%${" ".repeat(PDF_BYTES - body.length - end.length - 2)}${end}`;
	const bytes = new TextEncoder().encode(text);
	expect(bytes.length, "the synthetic PDF has its fixed size").toBe(PDF_BYTES);
	return new Uint8Array(bytes);
}

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: Array<{ taxonomy: string; slug: string }> = [];

interface Term {
	slug: string;
	label: string;
}

/** A synthetic term of `taxonomy`, labelled in Thai so it reads like a real one. */
async function createTerm(taxonomy: string, label: string): Promise<Term> {
	const term = {
		slug: syntheticSlug(taxonomy.replaceAll("_", "-")),
		label: `${SYNTHETIC_FIXTURE_MARK} ${label} ${crypto.randomUUID().slice(0, 6)}`,
	};
	const created = await cmsRequest(admin, `/_emdash/api/taxonomies/${taxonomy}/terms`, {
		method: "POST",
		body: term,
	});
	expect(created.ok, `${taxonomy} term: ${nativeRefusalOf(created)}`).toBe(true);
	ownedTerms.push({ taxonomy, slug: term.slug });
	return term;
}

interface UploadedFile {
	mediaId: string;
	filename: string;
	storageKey: string;
	/** The file field value the Admin's picker saves for it. */
	value: Record<string, unknown>;
}

/** Upload a synthetic PDF named `filename` (a unique one by default). */
async function uploadPdf(filename?: string): Promise<UploadedFile> {
	const uploaded = await uploadSyntheticMedia(admin, {
		filename: filename ?? `${SYNTHETIC_FIXTURE_MARK}-${crypto.randomUUID().slice(0, 8)}.pdf`,
		file: { bytes: syntheticPdf(), type: "application/pdf" },
	});
	expect(uploaded.mediaId, `the synthetic PDF: ${nativeRefusalOf(uploaded.result)}`).toBeDefined();
	const item = nativeItemOf(uploaded.result) as {
		id: string;
		filename: string;
		mimeType: string;
		size: number;
		storageKey: string;
	};
	return {
		mediaId: item.id,
		filename: item.filename,
		storageKey: item.storageKey,
		value: {
			id: item.id,
			provider: "local",
			filename: item.filename,
			mimeType: item.mimeType,
			size: item.size,
			meta: { storageKey: item.storageKey },
		},
	};
}

interface DocumentFixture {
	id: string;
	slug: string;
	title: string;
	file: UploadedFile;
}

/** A synthetic Document draft with its own synthetic PDF. Its title is unique. */
async function createDocument(
	label: string,
	fields: {
		data?: Record<string, unknown>;
		taxonomies?: Record<string, string[]>;
		references?: Record<string, string[]>;
		seo?: Record<string, unknown>;
		file?: UploadedFile;
	} = {},
): Promise<DocumentFixture> {
	const slug = syntheticSlug(label);
	const title = `${SYNTHETIC_FIXTURE_MARK} เอกสาร ${label} ${slug.slice(-6)}`;
	const file = fields.file ?? (await uploadPdf());
	const created = await createSyntheticEntry(admin, "documents", {
		data: { title, file: file.value, ...fields.data },
		slug,
		...(fields.taxonomies ? { taxonomies: fields.taxonomies } : {}),
		...(fields.references ? { references: fields.references } : {}),
		...(fields.seo ? { seo: fields.seo } : {}),
	});
	expect(created.result.ok, `document ${label}: ${nativeRefusalOf(created.result)}`).toBe(true);
	return { id: created.entryId!, slug, title, file };
}

/** Publish now. Returns the stored publication instant. */
async function publish(document: DocumentFixture): Promise<string> {
	const read = await readEntry(admin, "documents", document.id);
	const rev = (nativeDataOf(read) as { _rev?: string } | undefined)?._rev;
	const published = await cmsRequest(
		admin,
		`/_emdash/api/content/documents/${encodeURIComponent(document.id)}/publish`,
		{ method: "POST", body: { _rev: rev } },
	);
	expect(published.ok, `publishing ${document.title}: ${nativeRefusalOf(published)}`).toBe(true);
	const stored = nativeItemOf(await readEntry(admin, "documents", document.id))?.publishedAt;
	expect(typeof stored, "publishing records publishedAt").toBe("string");
	return String(stored);
}

/** The titles of the Document rows a list page shows, in order. */
async function listedTitles(page: Page): Promise<string[]> {
	return (
		await page.getByRole("main").getByRole("article").getByRole("heading").allTextContents()
	).map((text) => text.trim());
}

/** Only the given fixtures' titles, in the order the page lists them. */
function ownTitles(titles: string[], fixtures: DocumentFixture[]): string[] {
	const own = new Set(fixtures.map((document) => document.title));
	return titles.filter((title) => own.has(title));
}

/** The row a list page shows for `document`. */
function rowOf(page: Page, document: DocumentFixture) {
	return page.getByRole("main").getByRole("article").filter({ hasText: document.title });
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
	for (const term of ownedTerms) {
		const removed = await cmsRequest(
			admin,
			`/_emdash/api/taxonomies/${term.taxonomy}/terms/${encodeURIComponent(term.slug)}`,
			{ method: "DELETE" },
		);
		if (!removed.ok)
			failures.push(`the ${term.taxonomy} term ${term.slug}: ${nativeRefusalOf(removed)}`);
	}
	expect(failures, "the suite's synthetic fixtures must all be removed").toEqual([]);
});

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
	const breadcrumb = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
	await expect(breadcrumb.getByRole("link")).toHaveText(["หน้าแรก"]);
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("เอกสารเผยแพร่");

	expect(
		ownTitles(await listedTitles(page), [older, newer, draft, unpublished, trashed]),
		"published only, newest first",
	).toEqual([newer.title, older.title]);

	const row = rowOf(page, older);
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

	await filters.getByLabel("หัวข้อ").selectOption({ label: topic.label });
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

test("the fiscal year filter offers the years of published Documents, newest first", async ({
	page,
}) => {
	const recent = await createDocument("years-recent", { data: { fiscal_year: 2569 } });
	const older = await createDocument("years-older", { data: { fiscal_year: 2568 } });
	await createDocument("years-draft", { data: { fiscal_year: 2401 } });
	await publish(recent);
	await publish(older);

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
	expect(numeric).toEqual(expect.arrayContaining([2569, 2568]));
	expect(numeric, "a draft's fiscal year is not offered").not.toContain(2401);
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

	for (const invalid of ["abc", "25690", "256", "2569.5", "-2569"]) {
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

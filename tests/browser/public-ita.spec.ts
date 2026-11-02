// The MOIT page (#123; spec #121 "Public routes" and "Testing Decisions", ADR 0006).
//
// A citizen or an assessor opens a MOIT at /ita/{slug} and reads its Evidence grouped under the
// manual's Requirements: one card per Requirement, with its sub-Requirements inside, and each piece
// of Evidence a pill that says what it is (a file with its type and size, a page of this site,
// another website), its Round, and whether it is current information. A file whose media is gone
// shows "ไฟล์ไม่พร้อมให้บริการ" and nothing about storage. A draft, unpublished or trashed MOIT
// answers the site 404 unless a signed preview asks for the draft.
//
// The suite drives the single development runtime over public HTTP through the public-page harness
// (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px widths).
// Fixtures are synthetic MOITs whose Evidence blocks hold synthetic PDFs, made through the native
// API the way the Admin makes them and removed afterwards; the block types are the runtime's own
// model. The runtime may hold other MOITs (the demo dataset, the Product Owner's own), so the
// fixtures take a fiscal year no real MOIT has, and assertions look only at their own pages.
//
// Platform behaviour relied on (emdash 1.1.0):
// - A new entry's blocks need no `_key` or `_version` (src/schema/block-values.ts
//   normalizeBlockArray). A file inside a block, sent as the Admin's file picker sends it, is
//   normalised on save as a file field's is (src/emdash-runtime.ts, the block-field loop).
// - Deleting a media item removes its stored file, and the blocks that hold it keep their value
//   (src/api/handlers/media.ts handleMediaDelete).
// - EmDash serves a PDF as an attachment (src/astro/routes/api/media/file/[...key].ts).

import type { Page } from "@playwright/test";

import {
	createSyntheticDraft,
	deleteMedia,
	devAdminActor,
	nativeRefusalOf,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPdf,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
	type SyntheticPdf,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	MOBILE_VIEWPORT,
	expect,
	expectBreadcrumb,
	expectPreviewRenders,
	expectSiteNotFound,
	siteTitleParts,
	sitemapLocations,
	test,
	testAccessibilityAndReflow,
	thaiDate,
} from "./public.helpers";

/** A fiscal year no real MOIT has, so the fixtures stay apart from the runtime's own. */
const FISCAL_YEAR = 2401;

/** The Round a new Evidence block starts with (seed/seed.json). */
const NO_ROUND = "ไม่ระบุรอบ";

let admin: CmsActor;
let origin: string;

/** A Requirement block, as the Admin's block picker adds one. */
const requirement = (number: string, title: string) => ({
	_type: "ita_requirement",
	number,
	title,
});

/** A file block holding `pdf`, with no Round unless `fields` sets one. */
const fileBlock = (label: string, pdf: SyntheticPdf, fields: Record<string, unknown> = {}) => ({
	_type: "ita_file",
	label,
	file: pdf.value,
	round: NO_ROUND,
	...fields,
});

/** A link block to `url`, with no Round and not current unless `fields` says so. */
const linkBlock = (label: string, url: string, fields: Record<string, unknown> = {}) => ({
	_type: "ita_link",
	label,
	url,
	round: NO_ROUND,
	current: false,
	...fields,
});

interface MoitFixture extends DraftFixture {
	/** The page's heading: the MOIT's number and its title. */
	heading: string;
}

/** A synthetic MOIT draft of FISCAL_YEAR, numbered `number`, with `evidence` as its blocks. */
async function createMoit(
	label: string,
	number: number,
	evidence: Record<string, unknown>[],
	{ data, ...fields }: DraftFields = {},
): Promise<MoitFixture> {
	const moit = await createSyntheticDraft(admin, "moit", "ตัวชี้วัด", label, {
		data: { fiscal_year: FISCAL_YEAR, number, evidence, ...data },
		...fields,
	});
	return { ...moit, heading: `MOIT ${number} ${moit.title}` };
}

/** Publish now. */
async function publish(moit: MoitFixture): Promise<void> {
	await publishEntryAt(admin, "moit", moit.id);
}

/** A card of the page: the Requirement headed `heading`, with its Evidence. */
function card(page: Page, heading: string) {
	return page
		.getByRole("main")
		.getByRole("group")
		.filter({ has: page.getByRole("heading", { level: 2, name: heading }) });
}

/** The page's table of contents. */
const tableOfContents = (page: Page) => page.getByRole("navigation", { name: "สารบัญข้อกำหนด" });

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
});

test.afterAll(() => removeSuiteFixtures(admin));

test("a MOIT page shows its header, and its Evidence grouped under its Requirements in block order, each pill with its Round, what it is and where it leads", async ({
	page,
	request,
}) => {
	const memo = await uploadSyntheticPdf(
		admin,
		`${SYNTHETIC_FIXTURE_MARK}-นโยบาย-${crypto.randomUUID().slice(0, 6)}.pdf`,
	);
	const report = await uploadSyntheticPdf(admin);
	const summary = `${SYNTHETIC_FIXTURE_MARK} ข้อมูลพื้นฐาน แผนและผลการดำเนินงาน`;
	// 23 Sep 2026 17:30 UTC is already 24 Sep in Bangkok.
	const updatedOn = "2026-09-23T17:30:00.000Z";
	const moit = await createMoit(
		"detail",
		2,
		[
			requirement("1", "ข้อมูลพื้นฐานที่เป็นปัจจุบัน"),
			linkBlock("1.1 ข้อมูลผู้บริหาร แสดงรายนาม", "/contact", { current: true }),
			fileBlock("1.2 นโยบายของผู้บริหาร", memo),
			linkBlock("1.3 กฎหมายที่เกี่ยวข้องกับการดำเนินงาน", "https://stopcorruption.moph.go.th/"),
			linkBlock("1.4 ช่องทางรับฟังความคิดเห็น", "mailto:saraban@example.go.th"),
			requirement("2", "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี"),
			requirement("2.1", "รายงานครึ่งปีแรก"),
			fileBlock("รายงานผลการดำเนินงานครึ่งปีแรก", report, {
				round: "รอบ 6 เดือน",
				note: "ต.ค. 2569 – มี.ค. 2570",
			}),
			requirement("2.2", "รายงานทั้งปี"),
			fileBlock("รายงานผลการดำเนินงานทั้งปี", report, { round: "รอบ 12 เดือน" }),
		],
		{ data: { summary, updated_on: updatedOn } },
	);
	await publish(moit);

	const response = await page.goto(`/ita/${moit.slug}`);
	expect(response?.status(), "GET the MOIT page").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(moit.heading);
	await expect(main.getByText(`ITA ปีงบประมาณ พ.ศ. ${FISCAL_YEAR}`)).toBeVisible();
	await expect(main.getByText(summary)).toBeVisible();
	await expect(main.getByText("หลักฐาน 6 รายการ ใน 2 ข้อ")).toContainText(
		`ปรับปรุงล่าสุด ${thaiDate(updatedOn)}`,
	);
	await expectBreadcrumb(page, [HOME_CRUMB], "MOIT 2");

	const entries = tableOfContents(page).getByRole("link");
	await expect(entries).toHaveCount(2);
	await expect(entries.nth(0)).toHaveAccessibleName(
		/^1\s*ข้อมูลพื้นฐานที่เป็นปัจจุบัน\s*4 รายการ$/,
	);
	await expect(entries.nth(1)).toHaveAccessibleName(
		/^2\s*รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี\s*2 รายการ$/,
	);

	await expect(main.getByRole("group").getByRole("heading", { level: 2 })).toHaveText([
		"1. ข้อมูลพื้นฐานที่เป็นปัจจุบัน",
		"2. รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี",
	]);
	const first = card(page, "1. ข้อมูลพื้นฐานที่เป็นปัจจุบัน");
	await expect(first).toContainText("4 รายการ");
	await expect(first.getByRole("link")).toHaveText([
		/1\.1 ข้อมูลผู้บริหาร แสดงรายนาม/,
		/1\.2 นโยบายของผู้บริหาร/,
		/1\.3 กฎหมายที่เกี่ยวข้องกับการดำเนินงาน/,
		/1\.4 ช่องทางรับฟังความคิดเห็น/,
	]);
	// Each sub-Requirement's heading, then its own Evidence, in the order the card reads.
	const second = card(page, "2. รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี");
	await expect(second.getByRole("heading", { level: 3 }).or(second.getByRole("link"))).toHaveText([
		"2.1 รายงานครึ่งปีแรก",
		/รายงานผลการดำเนินงานครึ่งปีแรก/,
		"2.2 รายงานทั้งปี",
		/รายงานผลการดำเนินงานทั้งปี/,
	]);

	const sitePage = first.getByRole("link", { name: /1\.1 ข้อมูลผู้บริหาร/ });
	await expect(sitePage, "a page of this site opens in place").toHaveAttribute("href", "/contact");
	await expect(sitePage).not.toHaveAttribute("target");
	await expect(sitePage).toContainText("หน้าเว็บของสำนักงาน");
	await expect(sitePage, "marked as current information").toContainText("ข้อมูลปัจจุบัน");

	const file = first.getByRole("link", { name: /1\.2 นโยบายของผู้บริหาร/ });
	await expect(file).toHaveAttribute("href", `/_emdash/api/media/file/${memo.storageKey}`);
	await expect(file, "downloads under its uploaded name").toHaveAttribute(
		"download",
		memo.filename,
	);
	await expect(file).toContainText("PDF, 2 KB");
	await expect(file, "ไม่ระบุรอบ shows no Round").not.toContainText("รอบ");
	await expect(file).not.toContainText("ข้อมูลปัจจุบัน");

	const external = first.getByRole("link", { name: /1\.3 กฎหมาย/ });
	await expect(external).toHaveAttribute("href", "https://stopcorruption.moph.go.th/");
	await expect(external, "another website opens in a new tab").toHaveAttribute("target", "_blank");
	await expect(external).toHaveAttribute("rel", "noopener");
	await expect(external).toContainText("stopcorruption.moph.go.th (เว็บไซต์ภายนอก)");
	await expect(external).not.toContainText("ข้อมูลปัจจุบัน");

	const mail = first.getByRole("link", { name: /1\.4 ช่องทางรับฟังความคิดเห็น/ });
	await expect(mail, "an email address opens in place").toHaveAttribute(
		"href",
		"mailto:saraban@example.go.th",
	);
	await expect(mail).not.toHaveAttribute("target");
	await expect(mail).toContainText("saraban@example.go.th");

	const firstHalf = second.getByRole("link", { name: /รายงานผลการดำเนินงานครึ่งปีแรก/ });
	await expect(firstHalf).toContainText("รอบ 6 เดือน");
	await expect(firstHalf, "the file's note").toContainText("ต.ค. 2569 – มี.ค. 2570");
	await expect(second.getByRole("link", { name: /รายงานผลการดำเนินงานทั้งปี/ })).toContainText(
		"รอบ 12 เดือน",
	);

	const served = await request.get(`/_emdash/api/media/file/${memo.storageKey}`);
	expect(served.status(), "EmDash serves the file at that address").toBe(200);
	expect(served.headers()["content-type"]).toBe("application/pdf");
	expect(served.headers()["content-disposition"], "as a download").toMatch(/^attachment/);
});

/**
 * The text and address of each link the page's lists hold, the table of contents' and the pills',
 * leaving out the pill that shows `pill`.
 */
async function listedLinks(page: Page, pill: string): Promise<string[]> {
	return page
		.getByRole("main")
		.getByRole("listitem")
		.filter({ hasNotText: pill })
		.getByRole("link")
		.evaluateAll((links) =>
			links.map(
				(link) =>
					`${link.textContent?.replace(/\s+/g, " ").trim()} -> ${link.getAttribute("href")}`,
			),
		);
}

test("a file deleted from the library shows the unavailable pill with status 200 and no storage detail, and the rest of the page stays as it was", async ({
	page,
}) => {
	const kept = await uploadSyntheticPdf(admin);
	const gone = await uploadSyntheticPdf(
		admin,
		`${SYNTHETIC_FIXTURE_MARK}-ฟอร์มเผยแพร่-${crypto.randomUUID().slice(0, 6)}.pdf`,
	);
	const goneLabel = "1.2 ฟอร์มเผยแพร่";
	const moit = await createMoit("file-gone", 1, [
		requirement("1", "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง"),
		fileBlock("1.1 บันทึกข้อความเสนอ ผบห.", kept),
		fileBlock(goneLabel, gone, { round: "รอบ 12 เดือน" }),
		linkBlock("1.3 ข้อมูลการติดต่อหน่วยงาน", "/contact", { current: true }),
	]);
	await publish(moit);
	await page.goto(`/ita/${moit.slug}`);
	const main = page.getByRole("main");
	await expect(main.getByRole("link", { name: new RegExp(goneLabel) })).toBeVisible();
	const linksBefore = await listedLinks(page, goneLabel);
	const headingsBefore = await main.getByRole("heading").allTextContents();

	const removed = await deleteMedia(admin, gone.mediaId);
	expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);

	const response = await page.goto(`/ita/${moit.slug}`);
	expect(response?.status(), "the page still renders").toBe(200);
	const pill = main.getByRole("listitem").filter({ hasText: goneLabel });
	await expect(pill).toContainText("ไฟล์ไม่พร้อมให้บริการ");
	await expect(pill, "the Round still shows").toContainText("รอบ 12 เดือน");
	await expect(pill.getByRole("link", { name: goneLabel })).toHaveCount(0);
	await expect(pill.getByRole("link", { name: "ติดต่อเรา" })).toHaveAttribute("href", "/contact");
	await expect(main.getByText("หลักฐาน 3 รายการ ใน 1 ข้อ")).toContainText(
		"ไฟล์ที่ไม่พร้อมให้บริการ 1",
	);
	const html = await page.content();
	for (const detail of [gone.storageKey, gone.mediaId, gone.filename]) {
		expect(html.includes(detail), `the page must not reveal ${detail}`).toBe(false);
	}
	expect(await listedLinks(page, goneLabel), "every other link stays").toEqual(linksBefore);
	expect(await main.getByRole("heading").allTextContents(), "every heading stays").toEqual(
		headingsBefore,
	);
});

test("a draft, unpublished or trashed MOIT answers the site 404, a signed preview renders the draft, and an unknown slug answers 404", async ({
	page,
}) => {
	const evidence = [requirement("1", "ข้อกำหนดของฉบับร่าง")];
	const draft = await createMoit("hidden-draft", 4, evidence);
	const unpublished = await createMoit("hidden-unpublished", 5, evidence);
	const trashed = await createMoit("hidden-trashed", 6, evidence);
	await publish(unpublished);
	await publish(trashed);
	expect((await unpublishEntry(admin, "moit", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "moit", trashed.id)).ok, "trash").toBe(true);

	for (const moit of [draft, unpublished, trashed]) {
		await expectSiteNotFound(page, `/ita/${moit.slug}`, moit.title);
	}
	await expectPreviewRenders(
		page,
		admin,
		"moit",
		{ ...draft, title: draft.heading },
		`/ita/${draft.slug}`,
	);
	await expect(card(page, "1. ข้อกำหนดของฉบับร่าง")).toBeVisible();
	await expectSiteNotFound(page, `/ita/${syntheticSlug("no-such-moit")}`, "an unknown MOIT");
});

test("a MOIT page carries its title, description, absolute canonical address and OG tags, with the SEO fields first, and the sitemap lists it but never a draft", async ({
	page,
	request,
}) => {
	const { siteTitle, separator } = await siteTitleParts(admin);
	const meta = (selector: string) => page.locator(selector).first();
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปตัวชี้วัดสำหรับเครื่องมือค้นหา`;
	const plain = await createMoit("seo-plain", 7, [], { data: { summary } });
	const seoTitle = `${SYNTHETIC_FIXTURE_MARK} ชื่อตัวชี้วัดสำหรับเครื่องมือค้นหา`;
	const seoDescription = `${SYNTHETIC_FIXTURE_MARK} คำอธิบายตัวชี้วัดจากช่อง SEO`;
	const tuned = await createMoit("seo-tuned", 8, [], {
		data: { summary },
		seo: { title: seoTitle, description: seoDescription },
	});
	const draft = await createMoit("seo-draft", 9, []);
	await publish(plain);
	await publish(tuned);

	const plainTitle = `MOIT 7 ${plain.title} · ITA ปีงบประมาณ ${FISCAL_YEAR}`;
	const plainAddress = `${origin}/ita/${plain.slug}`;
	await page.goto(`/ita/${plain.slug}`);
	await expect(page).toHaveTitle(`${plainTitle}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", summary);
	await expect(meta('link[rel="canonical"]')).toHaveAttribute("href", plainAddress);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", plainTitle);
	await expect(meta('meta[property="og:url"]')).toHaveAttribute("content", plainAddress);
	await expect(meta('meta[name="robots"]')).toHaveCount(0);

	await page.goto(`/ita/${tuned.slug}`);
	await expect(page).toHaveTitle(`${seoTitle}${separator}${siteTitle}`);
	await expect(meta('meta[name="description"]')).toHaveAttribute("content", seoDescription);
	await expect(meta('meta[property="og:title"]')).toHaveAttribute("content", seoTitle);
	await expect(page.getByRole("heading", { level: 1 }), "the heading keeps its own").toHaveText(
		tuned.heading,
	);

	expect(await sitemapLocations(request, "/sitemap.xml")).toContain(`${origin}/sitemap-moit.xml`);
	const listed = await sitemapLocations(request, "/sitemap-moit.xml");
	expect(listed).toEqual(expect.arrayContaining([plainAddress, `${origin}/ita/${tuned.slug}`]));
	expect(
		listed.filter((address) => address.endsWith(`/${draft.slug}`)),
		"the sitemap must not list the draft",
	).toEqual([]);
});

test("the table of contents leads to each card at the mobile width, and a card collapses and expands with the keyboard", async ({
	page,
}) => {
	await page.setViewportSize(MOBILE_VIEWPORT);
	const pdf = await uploadSyntheticPdf(admin);
	const moit = await createMoit("keyboard", 10, [
		requirement("1", "ข้อกำหนดข้อแรก"),
		fileBlock("หลักฐานของข้อแรก", pdf),
		requirement("2", "ข้อกำหนดข้อที่สอง"),
		fileBlock("หลักฐานของข้อที่สอง", pdf),
	]);
	await publish(moit);
	await page.goto(`/ita/${moit.slug}`);

	const second = card(page, "2. ข้อกำหนดข้อที่สอง");
	const evidence = second.getByRole("link", { name: /หลักฐานของข้อที่สอง/ });
	await expect(tableOfContents(page)).toBeVisible();
	await tableOfContents(page)
		.getByRole("link", { name: /ข้อกำหนดข้อที่สอง/ })
		.focus();
	await page.keyboard.press("Enter");
	await expect(second, "the card is in view").toBeInViewport();

	// The next stop after the card the link led to is the card's own toggle, its summary.
	await page.keyboard.press("Tab");
	await expect(second.locator("summary")).toBeFocused();
	await expect(evidence, "a card is open at first").toBeVisible();
	await page.keyboard.press("Enter");
	await expect(evidence, "Enter collapses it").toBeHidden();
	await page.keyboard.press("Space");
	await expect(evidence, "Space expands it again").toBeVisible();
});

/**
 * Evidence as long as the largest legacy MOIT's, about 60 blocks: 18 Requirements, some with a
 * sub-Requirement, files with and without a Round, and links to this site and another.
 */
function longEvidence(pdf: SyntheticPdf): Record<string, unknown>[] {
	const blocks: Record<string, unknown>[] = [];
	for (let number = 1; number <= 18; number += 1) {
		blocks.push(
			requirement(String(number), `ข้อกำหนดที่ ${number} ของตัวชี้วัดที่มีหลักฐานมาก`),
			fileBlock(`${number}.1 บันทึกข้อความเสนอ ผบห. ของข้อ ${number}`, pdf),
		);
		if (number % 2 === 0) {
			blocks.push(fileBlock(`${number}.2 รายงานผลของข้อ ${number}`, pdf, { round: "รอบ 6 เดือน" }));
		}
		if (number % 4 === 0) {
			blocks.push(
				requirement(`${number}.3`, `ข้อย่อยของข้อ ${number}`),
				linkBlock(`ข้อมูลปัจจุบันของข้อ ${number}`, "/news", { current: true }),
				linkBlock(`เว็บไซต์ภายนอกของข้อ ${number}`, "https://www.moph.go.th/", {
					round: "รอบ 12 เดือน",
				}),
			);
		}
	}
	return blocks;
}

test.describe("accessibility and reflow", () => {
	let paths: string[];

	test.beforeAll(async () => {
		const pdf = await uploadSyntheticPdf(admin);
		const gone = await uploadSyntheticPdf(admin);
		const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปตัวชี้วัดสำหรับตรวจการเข้าถึง`;
		const short = await createMoit(
			"a11y-short",
			11,
			[
				requirement("1", "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง"),
				fileBlock("1.1 บันทึกข้อความเสนอ ผบห.", pdf),
				linkBlock("1.2 ข้อมูลการติดต่อหน่วยงาน", "/contact", { current: true }),
				requirement("2", "รายงานการกำกับติดตาม"),
				fileBlock("2.1 รายงานผลการกำกับติดตาม", pdf, { round: "รอบ 12 เดือน" }),
			],
			{ data: { summary, updated_on: "2026-09-23T17:30:00.000Z" } },
		);
		const long = await createMoit("a11y-long", 12, longEvidence(pdf), { data: { summary } });
		const edge = await createMoit("a11y-edge", 13, [
			fileBlock("คู่มือการประเมินก่อนข้อแรก", pdf),
			requirement("1", "ข้อที่ยังไม่มีหลักฐาน"),
			requirement("2", "ข้อที่มีข้อย่อย"),
			requirement("2.1", "ข้อย่อยที่ยังไม่มีหลักฐาน"),
			requirement("2.2", "ข้อย่อยที่มีไฟล์ที่ถูกลบ"),
			fileBlock("ไฟล์ที่ถูกลบออกจากคลังสื่อ", gone, { round: "รอบ 6 เดือน" }),
			linkBlock("ลิงก์ที่เปิดเป็นหน้าเว็บไม่ได้", "mailto:saraban@example.go.th", {
				current: true,
			}),
		]);
		for (const moit of [short, long, edge]) await publish(moit);
		const removed = await deleteMedia(admin, gone.mediaId);
		expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);
		paths = [short, long, edge].map((moit) => `/ita/${moit.slug}`);
	});

	testAccessibilityAndReflow("the MOIT pages", () => paths);
});

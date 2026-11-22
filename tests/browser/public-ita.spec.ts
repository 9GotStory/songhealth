// The MOIT page (#123; spec #121 "Public routes" and "Testing Decisions", ADR 0006).
//
// A citizen or an assessor opens a MOIT at /ita/{slug} and reads its Evidence grouped under the
// manual's Requirements: one card per Requirement, with its sub-Requirements inside, and each piece
// of Evidence a pill that says what it is (a file with its type and size, a page of this site,
// another website, an email address or telephone number), its Round, and whether it is current
// information. A file whose media is gone
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

import type { Locator, Page } from "@playwright/test";

import {
	createSyntheticMoit,
	deleteMedia,
	devAdminActor,
	fileBlock,
	linkBlock,
	nativeRefusalOf,
	publishEntryAt,
	removeSuiteFixtures,
	requirementBlock,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPdf,
	type CmsActor,
	type DraftFields,
	type MoitFixture,
	type SyntheticPdf,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	MOBILE_VIEWPORT,
	SECTION_CRUMBS,
	expect,
	expectBreadcrumb,
	expectPreviewRenders,
	expectSiteNotFound,
	boxOf,
	expectFocusRingWhole,
	expectNoTextCutOff,
	fieldEdge,
	fieldParts,
	FIELD_EDGE,
	readHeaderMotion,
	readHeaderOnField,
	readListField,
	readWholeAtTwoWidths,
	ringsOverFieldUnbanded,
	LIST_FIELD_LOOK,
	siteTitleParts,
	sitemapLocations,
	test,
	testAccessibilityAndReflow,
	thaiDate,
	tokenColor,
	tokenShadow,
} from "./public.helpers";

/** A fiscal year no real MOIT has, so the fixtures stay apart from the runtime's own. */
const FISCAL_YEAR = 2401;

let admin: CmsActor;
let origin: string;

/** A synthetic MOIT draft of FISCAL_YEAR, numbered `number`, with `evidence` as its blocks. */
const createMoit = (
	label: string,
	number: number,
	evidence: Record<string, unknown>[],
	fields?: DraftFields,
) => createSyntheticMoit(admin, label, { year: FISCAL_YEAR, number, evidence }, fields);

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

/** The page's table of contents, its panel. */
const tableOfContents = (page: Page) => page.getByRole("navigation", { name: "สารบัญข้อกำหนด" });

/** The white card around the Evidence before the first Requirement, a part with no role. */
const leadCard = (page: Page) => page.getByTestId("lead-evidence");

/**
 * A Requirement title of 238 characters, the length of the longest the office has published (spec
 * #392 "Measured in the prototype"), in made-up words.
 */
const LONGEST_REQUIREMENT = "ข้อกำหนดทดสอบความยาวของชื่อข้อกำหนดที่ยาวที่สุดของตัวชี้วัด "
	.repeat(5)
	.slice(0, 237)
	.concat("ก");

/** A part's type (size, line height, weight) and colour. */
const textLook = (part: Locator) =>
	part.evaluate((element) => {
		const style = getComputedStyle(element);
		return { type: [style.fontSize, style.lineHeight, style.fontWeight], colour: style.color };
	});

/** A box's fill, shadow and corner. */
const boxLook = (part: Locator) =>
	part.evaluate((element) => {
		const style = getComputedStyle(element);
		return {
			fill: style.backgroundColor,
			shadow: style.boxShadow,
			radius: style.borderTopLeftRadius,
		};
	});

/** A box's padding, top, right, bottom and left, in px. */
const paddingOf = (part: Locator) =>
	part.evaluate((element) => {
		const style = getComputedStyle(element);
		return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(
			(side) => Math.round(Number.parseFloat(side)),
		);
	});

/**
 * The words of `part` that show, leaving out a visually hidden text: one inside a box of 1 px or
 * less that clips what it holds, as `sr-only` makes it.
 */
const visibleWords = (part: Locator) =>
	part.evaluate((element) => {
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		const words: string[] = [];
		const clipped = (box: Element) => {
			const { width, height } = box.getBoundingClientRect();
			return width <= 1 && height <= 1 && getComputedStyle(box).overflow !== "visible";
		};
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			let hidden = false;
			for (let box = node.parentElement; box && element.contains(box); box = box.parentElement) {
				hidden ||= clipped(box);
			}
			if (!hidden) words.push(node.textContent ?? "");
		}
		return words.join("").replace(/\s+/g, " ").trim();
	});

/** The parts of a Requirement card's head, its `summary`. */
function cardHead(group: Locator) {
	const head = group.locator("summary");
	return {
		head,
		tile: head.locator(':scope > [aria-hidden="true"]:not(svg)'),
		title: head.getByRole("heading", { level: 2 }),
		count: head.getByText(/^\d+ รายการ$/),
		chevron: head.locator("svg"),
	};
}

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
			requirementBlock("1", "ข้อมูลพื้นฐานที่เป็นปัจจุบัน"),
			linkBlock("1.1 ข้อมูลผู้บริหาร แสดงรายนาม", "/contact", { current: true }),
			fileBlock("1.2 นโยบายของผู้บริหาร", memo),
			linkBlock("1.3 กฎหมายที่เกี่ยวข้องกับการดำเนินงาน", "https://stopcorruption.moph.go.th/"),
			linkBlock("1.4 ช่องทางรับฟังความคิดเห็น", "mailto:saraban@example.go.th"),
			requirementBlock("2", "รายงานผลการดำเนินงานตามแผนปฏิบัติการประจำปี"),
			requirementBlock("2.1", "รายงานครึ่งปีแรก"),
			fileBlock("รายงานผลการดำเนินงานครึ่งปีแรก", report, {
				round: "รอบ 6 เดือน",
				note: "ต.ค. 2569 – มี.ค. 2570",
			}),
			requirementBlock("2.2", "รายงานทั้งปี"),
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
	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.ita, [`ปีงบประมาณ ${FISCAL_YEAR}`, `/ita/${FISCAL_YEAR}`]],
		"MOIT 2",
	);

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
		requirementBlock("1", "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง"),
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

test("a draft, unpublished or trashed MOIT and an unknown slug answer the site 404, and a signed preview renders the draft with the header on the field", async ({
	page,
}) => {
	const evidence = [requirementBlock("1", "ข้อกำหนดของฉบับร่าง")];
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
	await expectSiteNotFound(page, `/ita/${syntheticSlug("no-such-moit")}`, "an unknown MOIT");
	await expectPreviewRenders(
		page,
		admin,
		"moit",
		{ ...draft, title: draft.heading },
		`/ita/${draft.slug}`,
	);
	await expect(card(page, "1. ข้อกำหนดของฉบับร่าง")).toBeVisible();
	// The same header as a published MOIT's: the pill, "MOIT 4" opening the H1, the counts line.
	const { seen, expected } = await readHeaderOnField(page, {
		pills: [{ words: `ITA ปีงบประมาณ พ.ศ. ${FISCAL_YEAR}`, look: "outlined" }],
		titlePrefix: "MOIT 4",
	});
	seen.counts = await fieldParts(page)
		.header.getByText(/^หลักฐาน \d+ รายการ/)
		.allInnerTexts();
	expected.counts = ["หลักฐาน 0 รายการ ใน 1 ข้อ"];
	expect(seen, "the preview shows the header on the field").toEqual(expected);
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

test("the table of contents leads to each card at its #requirement-n address, as a row at the mobile width and as a column at 1,440 px, and a card collapses and expands with the keyboard, showing its head alone while closed", async ({
	page,
}) => {
	await page.setViewportSize(MOBILE_VIEWPORT);
	const pdf = await uploadSyntheticPdf(admin);
	const moit = await createMoit("keyboard", 10, [
		requirementBlock("1", "ข้อกำหนดข้อแรก"),
		fileBlock("หลักฐานของข้อแรก", pdf),
		requirementBlock("2", "ข้อกำหนดข้อที่สอง"),
		fileBlock("หลักฐานของข้อที่สอง", pdf),
	]);
	await publish(moit);
	await page.goto(`/ita/${moit.slug}`);

	const second = card(page, "2. ข้อกำหนดข้อที่สอง");
	const evidence = second.getByRole("link", { name: /หลักฐานของข้อที่สอง/ });
	const links = tableOfContents(page).getByRole("link");
	await expect(tableOfContents(page)).toBeVisible();
	await links.nth(1).focus();
	await page.keyboard.press("Enter");
	await expect(page, "the address names the card").toHaveURL(/#requirement-2$/);
	await expect(second, "the card is in view").toBeInViewport();

	// The next stop after the card the link led to is the card's own toggle, its summary.
	await page.keyboard.press("Tab");
	await expect(second.locator("summary")).toBeFocused();
	await expect(evidence, "a card is open at first").toBeVisible();
	await page.keyboard.press("Enter");
	await expect(evidence, "Enter collapses it").toBeHidden();
	const [closed, head] = [
		await boxOf(second, "the closed card"),
		await boxOf(second.locator("summary"), "its head"),
	];
	expect(Math.round(closed.height), "a closed card shows its head alone").toBe(
		Math.round(head.height),
	);
	await page.keyboard.press("Space");
	await expect(evidence, "Space expands it again").toBeVisible();

	await page.setViewportSize(DESKTOP_VIEWPORT);
	await page.goto(`/ita/${moit.slug}`);
	const reached: string[] = [];
	for (const [index, heading] of ["1. ข้อกำหนดข้อแรก", "2. ข้อกำหนดข้อที่สอง"].entries()) {
		await links.nth(index).click();
		await expect(card(page, heading), `${heading} is in view at 1,440 px`).toBeInViewport();
		reached.push(new URL(page.url()).hash);
	}
	expect(reached, "each link of the column leads to its card").toEqual([
		"#requirement-1",
		"#requirement-2",
	]);
});

/**
 * Evidence as long as the largest legacy MOIT's, about 60 blocks: 18 Requirements unless
 * `requirements` says how many, some with a sub-Requirement, files with and without a Round, and
 * links to this site and another.
 */
function longEvidence(pdf: SyntheticPdf, requirements = 18): Record<string, unknown>[] {
	const blocks: Record<string, unknown>[] = [];
	for (let number = 1; number <= requirements; number += 1) {
		blocks.push(
			requirementBlock(String(number), `ข้อกำหนดที่ ${number} ของตัวชี้วัดที่มีหลักฐานมาก`),
			fileBlock(`${number}.1 บันทึกข้อความเสนอ ผบห. ของข้อ ${number}`, pdf),
		);
		if (number % 2 === 0) {
			blocks.push(fileBlock(`${number}.2 รายงานผลของข้อ ${number}`, pdf, { round: "รอบ 6 เดือน" }));
		}
		if (number % 4 === 0) {
			blocks.push(
				requirementBlock(`${number}.3`, `ข้อย่อยของข้อ ${number}`),
				linkBlock(`ข้อมูลปัจจุบันของข้อ ${number}`, "/news", { current: true }),
				linkBlock(`เว็บไซต์ภายนอกของข้อ ${number}`, "https://www.moph.go.th/", {
					round: "รอบ 12 เดือน",
				}),
			);
		}
	}
	return blocks;
}

/**
 * A MOIT's page on the deep field (Feature 013 #395; spec #392 "A MOIT's page: the header",
 * decisions 3, 8 and 13): the Post page's header, with the fiscal year in its outlined pill and
 * the H1 no larger than H2 size; and its body over the field's lower edge (Feature 013 #396; spec
 * #392 "A MOIT's page: the body over the field's edge", decision 13; #396 comment 7080124411).
 */
test.describe("the page on the field", () => {
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปตัวชี้วัดบนพื้นสีเขียว`;
	const updatedOn = "2026-09-23T17:30:00.000Z";
	const yearPill = `ITA ปีงบประมาณ พ.ศ. ${FISCAL_YEAR}`;
	/** Summary, date, two Requirements and Evidence. */
	let full: MoitFixture;
	/** No summary, no date, and a file that cannot be served. */
	let bare: MoitFixture;
	/** Evidence and no Requirement. */
	let noRequirement: MoitFixture;
	/** Neither Evidence nor a summary. */
	let empty: MoitFixture;
	/** A Requirement without Evidence (#396 comment 7080124411, item 1). */
	let zero: MoitFixture;
	/**
	 * Evidence before the first Requirement; a Requirement of 238 characters with a sub-Requirement;
	 * one without a number; one without Evidence.
	 */
	let shapes: MoitFixture;
	/** Eighteen Requirements. */
	let many: MoitFixture;

	test.beforeAll(async () => {
		const pdf = await uploadSyntheticPdf(admin);
		const gone = await uploadSyntheticPdf(admin);
		full = await createMoit(
			"field-full",
			14,
			[
				requirementBlock("1", "ข้อกำหนดใต้ส่วนหัว"),
				fileBlock("1.1 หลักฐานใต้ส่วนหัว", pdf),
				requirementBlock("2", "ข้อกำหนดข้อที่สองใต้ส่วนหัว"),
				fileBlock("2.1 หลักฐานข้อที่สอง", pdf, { round: "รอบ 6 เดือน" }),
			],
			{ data: { summary, updated_on: updatedOn } },
		);
		bare = await createMoit("field-bare", 15, [
			requirementBlock("1", "ข้อกำหนดที่มีไฟล์ที่ถูกลบ"),
			fileBlock("1.1 ไฟล์ที่ยังอยู่", pdf),
			fileBlock("1.2 ไฟล์ที่ถูกลบ", gone),
		]);
		noRequirement = await createMoit(
			"field-no-requirement",
			16,
			[fileBlock("คู่มือการประเมินของตัวชี้วัด", pdf)],
			{ data: { updated_on: updatedOn } },
		);
		empty = await createMoit("field-empty", 17, []);
		zero = await createMoit("field-zero", 18, [
			requirementBlock("1", "ข้อกำหนดที่ยังไม่มีหลักฐานเลย"),
		]);
		shapes = await createMoit("field-shapes", 19, [
			fileBlock("คู่มือการประเมินก่อนข้อแรก", pdf),
			requirementBlock("1", LONGEST_REQUIREMENT),
			fileBlock("1.1 หลักฐานของข้อที่ยาวที่สุด", pdf),
			requirementBlock("1.2", "ข้อย่อยของข้อแรก"),
			fileBlock("หลักฐานของข้อย่อย", pdf, { round: "รอบ 6 เดือน" }),
			requirementBlock(".", "ข้อกำหนดที่ไม่มีเลขข้อ"),
			fileBlock("หลักฐานของข้อที่ไม่มีเลข", pdf),
			requirementBlock("2", "ข้อกำหนดที่ยังไม่มีหลักฐาน"),
		]);
		many = await createMoit("field-many", 20, longEvidence(pdf));
		for (const moit of [full, bare, noRequirement, empty, zero, shapes, many]) await publish(moit);
		const removed = await deleteMedia(admin, gone.mediaId);
		expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);
	});

	/** The header's counts line on the field. */
	const countsLine = (page: Page) => fieldParts(page).header.getByText(/^หลักฐาน \d+ รายการ/);

	test("a MOIT page opens on the deep field with the Post page's header: the breadcrumb in white; 24 px under it the fiscal year in the outlined pill; the H1 with MOIT n in accent-warm and the title in surface-base, H3 size at 639 px and H2 size at 640, 1,024 and 1,440 px; the summary at body-large and the counts line at body size, the parts 12 px apart; no icon tile or frame; the field with the small glow and no ring, its content ending 96 px above its edge below 640 px and 128 px from 640 px; the table of contents' panel, and from 1,024 px the first card beside it, starting 64 px above the edge below 640 px and 88 px from 640 px, as on a MOIT whose Requirements hold no Evidence", async ({
		page,
	}) => {
		await page.goto(`/ita/${full.slug}`);
		const parts = fieldParts(page);
		await expect(page.getByRole("heading", { level: 1 }), "one H1").toHaveCount(1);
		const { seen, expected } = await readHeaderOnField(page, {
			pills: [{ words: yearPill, look: "outlined" }],
			titlePrefix: "MOIT 14",
			under: { text: summary, lines: 1 },
		});
		const onField = (await parts.field.count()) === 1;
		const white = await tokenColor(page, "surface-base");
		const pill = parts.field.getByText(yearPill, { exact: true });
		const summaryLine = parts.header.getByText(summary, { exact: true });
		const counts = countsLine(page);
		const toc = tableOfContents(page);
		const firstCard = card(page, "1. ข้อกำหนดใต้ส่วนหัว");

		seen.look = await readListField(page);
		expected.look = Object.fromEntries(
			Object.keys(LIST_FIELD_LOOK).map((width) => [width, { glow: true, rings: 0 }]),
		);
		seen.counts = onField && {
			text: (await counts.innerText()).trim(),
			colour: await counts.evaluate((line) => getComputedStyle(line).color),
			// body, 16 / 26.
			type: await counts.evaluate((line) => {
				const style = getComputedStyle(line);
				return [style.fontSize, style.lineHeight];
			}),
		};
		expected.counts = {
			text: `หลักฐาน 2 รายการ ใน 2 ข้อ · ปรับปรุงล่าสุด ${thaiDate(updatedOn)}`,
			colour: white,
			type: ["16px", "26px"],
		};
		seen.decorations = onField && {
			// The breadcrumb's chevrons are its own; the header holds no other icon.
			icons: await parts.header
				.locator("svg")
				.evaluateAll((icons) => icons.filter((icon) => icon.closest("nav") === null).length),
			frame: await page.getByTestId("picture-frame").count(),
		};
		expected.decorations = { icons: 0, frame: 0 };

		const sizes: Record<number, unknown> = {};
		const places: Record<number, unknown> = {};
		const placesExpected: Record<number, unknown> = {};
		for (const width of [320, 375, 639, 640, 768, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			sizes[width] = await page
				.getByRole("heading", { level: 1 })
				.evaluate((title) => getComputedStyle(title).fontSize);
			if (!onField) {
				places[width] = "no field";
			} else {
				const [pillBox, titleBox, summaryBox, countsBox, tocBox, cardBox] = [
					await boxOf(pill, `${at}: the pill`),
					await boxOf(parts.title, `${at}: the H1`),
					await boxOf(summaryLine, `${at}: the summary`),
					await boxOf(counts, `${at}: the counts line`),
					await boxOf(toc, `${at}: the table of contents`),
					await boxOf(firstCard, `${at}: the first card`),
				];
				const edge = await fieldEdge(parts.field, at);
				places[width] = {
					apart: [
						titleBox.y - pillBox.y - pillBox.height,
						summaryBox.y - titleBox.y - titleBox.height,
						countsBox.y - summaryBox.y - summaryBox.height,
					].map(Math.round),
					room: Math.round(edge - countsBox.y - countsBox.height),
					overlap: {
						panel: Math.round(edge - tocBox.y),
						firstCard: width < 1024 ? "after the panel" : Math.round(edge - cardBox.y),
					},
				};
			}
			const { room, overlap } = width < 640 ? FIELD_EDGE.phone : FIELD_EDGE.fromSm;
			placesExpected[width] = {
				apart: [12, 12, 12],
				room,
				overlap: { panel: overlap, firstCard: width < 1024 ? "after the panel" : overlap },
			};
		}
		seen.titleSizes = sizes;
		// H3 size below 640 px and H2 size from 640 px, with no larger size from 1,024 px.
		expected.titleSizes = {
			320: "24px",
			375: "24px",
			639: "24px",
			640: "34px",
			768: "34px",
			1023: "34px",
			1024: "34px",
			1440: "34px",
		};
		seen.places = places;
		expected.places = placesExpected;

		// A MOIT whose Requirements hold no Evidence lies over the edge as well.
		await page.goto(`/ita/${zero.slug}`);
		const zeroOverlap: Record<number, number> = {};
		for (const width of [375, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const edge = await fieldEdge(parts.field, `${zero.slug} at ${width} px`);
			zeroOverlap[width] = Math.round(
				edge - (await boxOf(toc, `at ${width} px: the table of contents`)).y,
			);
		}
		seen.zeroEvidence = zeroOverlap;
		expected.zeroEvidence = { 375: FIELD_EDGE.phone.overlap, 1440: FIELD_EDGE.fromSm.overlap };
		expect(seen, "the MOIT's header on the field and its body over the edge").toEqual(expected);
	});

	test("a MOIT's header shows no summary where the MOIT has none, and its counts line without a date where staff set none, with the files that cannot be served, and without ใน m ข้อ for a MOIT without a Requirement; a MOIT without Evidence ends with its field, its neighbour links 32 px under it below 1,024 px and 40 px from 1,024 px", async ({
		page,
	}) => {
		/** The header's lines under the breadcrumb, in order. */
		const lines = async (moit: MoitFixture) => {
			await page.goto(`/ita/${moit.slug}`);
			const header = fieldParts(page).header;
			return header
				.locator(":scope > :not(nav) > *")
				.evaluateAll((parts) => parts.map((part) => part.textContent?.replace(/\s+/g, " ").trim()));
		};
		const seen: Record<string, unknown> = {
			bare: await lines(bare),
			noRequirement: await lines(noRequirement),
			empty: await lines(empty),
		};
		const expected: Record<string, unknown> = {
			bare: [yearPill, bare.heading, "หลักฐาน 2 รายการ ใน 1 ข้อ · ไฟล์ที่ไม่พร้อมให้บริการ 1"],
			noRequirement: [
				yearPill,
				noRequirement.heading,
				`หลักฐาน 1 รายการ · ปรับปรุงล่าสุด ${thaiDate(updatedOn)}`,
			],
			empty: [yearPill, empty.heading, "หลักฐาน 0 รายการ"],
		};

		// The MOIT without Evidence: its field, then the links to its neighbours in the year.
		const parts = fieldParts(page);
		const neighbours = page.getByRole("navigation", {
			name: "ตัวชี้วัดอื่นในปีงบประมาณเดียวกัน",
		});
		const reach: Record<number, unknown> = {};
		for (const width of [320, 639, 640, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			if ((await parts.field.count()) !== 1) {
				reach[width] = "no field";
				continue;
			}
			const edge = await fieldEdge(parts.field, at);
			const counts = await boxOf(countsLine(page), `${at}: the counts line`);
			reach[width] = {
				fieldUnderHeader: Math.round(edge - counts.y - counts.height),
				neighboursUnderField: Math.round(
					(await boxOf(neighbours, `${at}: the neighbours`)).y - edge,
				),
			};
		}
		seen.emptyPlaces = reach;
		expected.emptyPlaces = Object.fromEntries(
			[320, 639, 640, 1023, 1024, 1440].map((width) => [
				width,
				{ fieldUnderHeader: width < 640 ? 40 : 48, neighboursUnderField: width < 1024 ? 32 : 40 },
			]),
		);
		expect(seen, "the header's lines and the page without Evidence").toEqual(expected);
	});

	test("the body over the field's edge: below 1,024 px the table of contents' panel, then the cards 20 px under it, its links a row of 44 px boxes with a 1 px border-default edge and radius 14 showing the number and the count; from 1,024 px the 19 rem panel at the left and the cards 32 px beside it, its links a column 4 px apart without an edge, showing the title on two lines at most, on surface-soft under the pointer; the panel white with the deep shadow, radius 24 and 12 px inside, 16 px from 640 px, opening with สารบัญ after a 20 px list-checks; no ring over the field without its white band", async ({
		page,
	}) => {
		await page.goto(`/ita/${shapes.slug}`);
		const toc = tableOfContents(page);
		const links = toc.getByRole("link");
		const heading = toc.getByText("สารบัญ", { exact: true });
		const [white, soft, brandPrimary, secondary, edgeColour] = await Promise.all(
			["surface-base", "surface-soft", "brand-primary", "text-secondary", "border-default"].map(
				(name) => tokenColor(page, name),
			),
		);
		const surfaceBase = white;
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};

		seen.panel = { ...(await boxLook(toc)), heading: await textLook(heading) };
		seen.icon = await heading
			.locator("svg")
			.evaluateAll((icons) =>
				icons.map((icon) => [icon.getAttribute("width"), icon.getAttribute("aria-hidden")]),
			);
		expected.panel = {
			fill: white,
			shadow: await tokenShadow(page, "deep"),
			radius: "24px",
			heading: { type: ["14px", "22px", "600"], colour: brandPrimary },
		};
		expected.icon = [["20", "true"]];
		// The no-number Requirement's link shows "–"; the others their number.
		seen.numbers = await links.evaluateAll((all) =>
			all.map((link) => link.firstElementChild?.textContent?.trim()),
		);
		expected.numbers = ["1", "–", "2"];

		/** How the first link and the one after it look and lie at the width the page has now. */
		const readLinks = async (at: string) => {
			const [first, second] = [
				await boxOf(links.nth(0), `${at}: the first link`),
				await boxOf(links.nth(1), `${at}: the second link`),
			];
			const look = await links.nth(0).evaluate((link) => {
				const style = getComputedStyle(link);
				const [number, , count] = [...link.children].map((part) => getComputedStyle(part));
				return {
					height: Math.round(link.getBoundingClientRect().height),
					edge: [style.borderTopWidth, style.borderTopColor],
					radius: style.borderTopLeftRadius,
					number: [number!.backgroundColor, number!.color, number!.fontWeight],
					count: count!.color,
				};
			});
			const title = links.nth(0).getByText(LONGEST_REQUIREMENT, { exact: true });
			const titleBox = await title.boundingBox();
			const lineHeight = await title.evaluate((part) =>
				Number.parseFloat(getComputedStyle(part).lineHeight),
			);
			return {
				...look,
				line: Math.round(second.y) === Math.round(first.y) ? "row" : "column",
				apart:
					Math.round(second.y) === Math.round(first.y)
						? Math.round(second.x - first.x - first.width)
						: Math.round(second.y - first.y - first.height),
				titleLines:
					titleBox && titleBox.width > 1 ? Math.round(titleBox.height / lineHeight) : "hidden",
			};
		};
		const widths = [320, 639, 640, 1023, 1024, 1440];
		const tocLinks: Record<number, unknown> = {};
		const tocLinksExpected: Record<number, unknown> = {};
		for (const width of widths) {
			await page.setViewportSize({ width, height: 900 });
			tocLinks[width] = await readLinks(`at ${width} px`);
			tocLinksExpected[width] =
				width < 1024
					? {
							height: 44,
							edge: ["1px", edgeColour],
							radius: "14px",
							number: [soft, brandPrimary, "600"],
							count: secondary,
							line: "row",
							apart: 8,
							titleLines: "hidden",
						}
					: {
							height: expect.any(Number),
							edge: ["1px", "rgba(0, 0, 0, 0)"],
							radius: "14px",
							number: [soft, brandPrimary, "600"],
							count: secondary,
							line: "column",
							apart: 4,
							titleLines: 2,
						};
		}
		seen.links = tocLinks;
		expected.links = tocLinksExpected;
		// Under the pointer: surface-soft from 1,024 px, its edge still clear; the brand-primary edge
		// below it, as today.
		await page.setViewportSize(DESKTOP_VIEWPORT);
		await links.nth(1).hover();
		seen.hoverColumn = await links.nth(1).evaluate((link) => {
			const style = getComputedStyle(link);
			return [style.backgroundColor, style.borderTopColor];
		});
		expected.hoverColumn = [soft, "rgba(0, 0, 0, 0)"];
		await page.setViewportSize({ width: 375, height: 812 });
		await links.nth(1).hover();
		seen.hoverRow = await links.nth(1).evaluate((link) => getComputedStyle(link).borderTopColor);
		expected.hoverRow = brandPrimary;

		// The panel beside or above the first card, as the MOIT's Requirements open its body.
		await page.goto(`/ita/${full.slug}`);
		const field = fieldParts(page).field;
		const firstCard = card(page, "1. ข้อกำหนดใต้ส่วนหัว");
		const layout: Record<number, unknown> = {};
		const layoutExpected: Record<number, unknown> = {};
		const unbanded: Record<number, unknown> = {};
		for (const width of widths) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			const [panel, cardBox] = [
				await boxOf(toc, `${at}: the panel`),
				await boxOf(firstCard, `${at}: the first card`),
			];
			const beside = panel.x + panel.width <= cardBox.x;
			layout[width] = {
				order: beside ? "panel at the left" : panel.y < cardBox.y ? "panel above" : "other",
				gap: Math.round(
					beside ? cardBox.x - panel.x - panel.width : cardBox.y - panel.y - panel.height,
				),
				panelWidth: beside ? Math.round(panel.width) : "the column's",
				padding: await paddingOf(toc),
			};
			unbanded[width] = [
				...(await ringsOverFieldUnbanded(toc, field, surfaceBase)),
				...(await ringsOverFieldUnbanded(firstCard, field, surfaceBase)),
			];
			layoutExpected[width] =
				width < 1024
					? {
							order: "panel above",
							gap: 20,
							panelWidth: "the column's",
							padding: Array(4).fill(width < 640 ? 12 : 16),
						}
					: { order: "panel at the left", gap: 32, panelWidth: 304, padding: [16, 16, 16, 16] };
		}
		seen.layout = layout;
		expected.layout = layoutExpected;
		seen.unbanded = unbanded;
		expected.unbanded = Object.fromEntries(widths.map((width) => [width, []]));

		// The first card's head over the field keeps its white band under the pointer (#393 note).
		await page.setViewportSize(DESKTOP_VIEWPORT);
		const head = firstCard.locator("summary");
		await head.focus();
		await head.hover();
		seen.bandUnderPointer = await head.evaluate((part) => getComputedStyle(part).boxShadow);
		expected.bandUnderPointer = expect.stringContaining(`${surfaceBase} 0px 0px 0px 7px`);
		expect(seen, "the panel and the cards over the field's edge").toEqual(expected);
	});

	test("from 1,024 px the table of contents' panel stays in view under the header while the cards scroll, and with eighteen Requirements scrolls on its own; a focused link of the row at 375 px and of the column at 1,440 px is shown whole", async ({
		page,
	}) => {
		await page.goto(`/ita/${many.slug}`);
		const toc = tableOfContents(page);
		const links = toc.getByRole("link");
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		const stays: Record<number, unknown> = {};
		const staysExpected: Record<number, unknown> = {};
		for (const width of [1024, 1440]) {
			await page.setViewportSize({ width, height: 768 });
			const top = await page.evaluate(
				() =>
					Number.parseFloat(
						getComputedStyle(document.documentElement).getPropertyValue("--header-offset"),
					) *
						16 +
					24,
			);
			const end = await page.evaluate(
				() => document.documentElement.scrollHeight - window.innerHeight - 600,
			);
			const places = [];
			for (const share of [0.3, 0.6, 0.9]) {
				await page.evaluate((y) => window.scrollTo(0, y), Math.round(end * share));
				places.push(
					await toc.evaluate((panel) => {
						const box = panel.getBoundingClientRect();
						return [Math.round(box.top), box.bottom <= window.innerHeight + 1];
					}),
				);
			}
			stays[width] = {
				places,
				scrollsOnItsOwn: await toc.evaluate((panel) => {
					const before = window.scrollY;
					panel.scrollTop = 120;
					return (
						panel.scrollHeight > panel.clientHeight &&
						panel.scrollTop > 0 &&
						window.scrollY === before
					);
				}),
			};
			staysExpected[width] = {
				places: [0.3, 0.6, 0.9].map(() => [Math.round(top), true]),
				scrollsOnItsOwn: true,
			};
		}
		seen.stays = stays;
		expected.stays = staysExpected;

		// A focused link is scrolled whole into its row or column, its ring uncut.
		await page.setViewportSize(DESKTOP_VIEWPORT);
		await page.evaluate(() => window.scrollTo(0, 0));
		await expectFocusRingWhole(links.last(), "the column's last link at 1,440 px");
		const inside = () =>
			links.last().evaluate((link) => {
				const own = link.getBoundingClientRect();
				const panel = link.closest("nav")!.getBoundingClientRect();
				return (
					own.top >= panel.top &&
					own.bottom <= panel.bottom &&
					own.left >= panel.left &&
					own.right <= panel.right
				);
			});
		seen.wholeInColumn = await inside();
		await page.setViewportSize({ width: 375, height: 812 });
		await page.reload();
		await expectFocusRingWhole(links.last(), "the row's last link at 375 px");
		seen.wholeInRow = await inside();
		expected.wholeInColumn = true;
		expected.wholeInRow = true;
		expect(seen, "the panel in view and its focused links whole").toEqual(expected);
	});

	test("a Requirement card's head: white with the card shadow and radius 24, the cards 16 px apart; 16 px inside, 20 px from 640 px; the number on a 40 px surface-soft tile with radius 14, hidden from assistive technology; the H2 at body-large, semibold, in text-primary, reading the number, a full stop and the title; n รายการ on a surface-soft pill; the chevron turned while open; one line from 640 px, and below it the count's pill 8 px under the first line and the chevron on the tile, a one-line title centred on the tile; a Requirement without a number has no tile", async ({
		page,
	}) => {
		await page.goto(`/ita/${shapes.slug}`);
		const longest = card(page, `1. ${LONGEST_REQUIREMENT}`);
		const unnumbered = card(page, "ข้อกำหนดที่ไม่มีเลขข้อ");
		const parts = cardHead(longest);
		const bare = cardHead(unnumbered);
		// A title on one line below 640 px: centred on the tile, the pill 8 px under the tile's line,
		// as P3 B (Product Owner, #396 review).
		const short = cardHead(card(page, "2. ข้อกำหนดที่ยังไม่มีหลักฐาน"));
		const [white, soft, brandPrimary, brandDark, primary] = await Promise.all(
			["surface-base", "surface-soft", "brand-primary", "brand-dark", "text-primary"].map((name) =>
				tokenColor(page, name),
			),
		);
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		seen.card = await boxLook(longest);
		expected.card = { fill: white, shadow: await tokenShadow(page, "card"), radius: "24px" };
		const hasTile = (await parts.tile.count()) === 1;
		seen.tile = hasTile && {
			...(await boxLook(parts.tile)),
			size: await parts.tile.evaluate((tile) => [
				Math.round(tile.getBoundingClientRect().width),
				Math.round(tile.getBoundingClientRect().height),
			]),
			number: await textLook(parts.tile),
			words: (await parts.tile.textContent())?.trim(),
		};
		expected.tile = {
			fill: soft,
			shadow: "none",
			radius: "14px",
			size: [40, 40],
			number: { type: ["16px", "26px", "600"], colour: brandPrimary },
			words: "1",
		};
		seen.title = {
			look: await textLook(parts.title),
			shown: await visibleWords(parts.title),
		};
		expected.title = {
			look: { type: ["18px", "30px", "600"], colour: primary },
			shown: LONGEST_REQUIREMENT,
		};
		await expect(parts.title, "the H2 reads the number").toHaveAccessibleName(
			`1. ${LONGEST_REQUIREMENT}`,
		);
		seen.count = {
			...(await textLook(parts.count)),
			fill: await parts.count.evaluate((pill) => getComputedStyle(pill).backgroundColor),
		};
		expected.count = { type: ["13px", "20px", "400"], colour: brandDark, fill: soft };
		const turn = () => parts.chevron.evaluate((icon) => getComputedStyle(icon).rotate);
		seen.chevron = {
			size: await parts.chevron.getAttribute("width"),
			colour: await parts.chevron.evaluate((icon) => getComputedStyle(icon).color),
			open: await turn(),
		};
		await parts.head.click();
		seen.chevron = { ...(seen.chevron as object), closed: await turn() };
		await parts.head.click();
		expected.chevron = { size: "16", colour: brandPrimary, open: "180deg", closed: "none" };
		seen.unnumbered = { tiles: await bare.tile.count() };
		expected.unnumbered = { tiles: 0 };

		const centre = (box: { y: number; height: number }) => box.y + box.height / 2;
		const heads: Record<number, unknown> = {};
		const headsExpected: Record<number, unknown> = {};
		for (const width of [320, 639, 640, 1023, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			if (!hasTile) {
				heads[width] = "no tile";
				continue;
			}
			const [head, tile, title, count, chevron] = [
				await boxOf(parts.head, `${at}: the head`),
				await boxOf(parts.tile, `${at}: the tile`),
				await boxOf(parts.title, `${at}: the title`),
				await boxOf(parts.count, `${at}: the count`),
				await boxOf(parts.chevron, `${at}: the chevron`),
			];
			const bareTitle = await boxOf(bare.title, `${at}: the title without a number`);
			const bareChevron = await boxOf(bare.chevron, `${at}: its chevron`);
			const [shortTile, shortTitle, shortCount] = [
				await boxOf(short.tile, `${at}: the one-line title's tile`),
				await boxOf(short.title, `${at}: the one-line title`),
				await boxOf(short.count, `${at}: its count`),
			];
			const nextCard = await boxOf(unnumbered, `${at}: the card after it`);
			const thisCard = await boxOf(longest, `${at}: the card`);
			const round = (values: number[]) => values.map(Math.round);
			heads[width] = {
				padding: await paddingOf(parts.head),
				cardsApart: Math.round(nextCard.y - thisCard.y - thisCard.height),
				apart: round(
					width < 640
						? [title.x - tile.x - tile.width, chevron.x - title.x - title.width]
						: [
								title.x - tile.x - tile.width,
								count.x - title.x - title.width,
								chevron.x - count.x - count.width,
							],
				),
				places:
					width < 640
						? {
								firstLine: round([tile.y - head.y, title.y - head.y]),
								chevronOnTile: Math.round(centre(chevron) - centre(tile)),
								countUnder: round([count.y - title.y - title.height, count.x - title.x]),
								unnumberedChevron: Math.round(centre(bareChevron) - (bareTitle.y + 15)),
								oneLine: round([
									shortTitle.height,
									centre(shortTitle) - centre(shortTile),
									shortCount.y - shortTile.y - shortTile.height,
								]),
							}
						: {
								centres: round(
									[centre(tile), centre(count), centre(chevron)].map((y) => y - centre(title)),
								),
							},
			};
			const inside = width < 640 ? 16 : 20;
			headsExpected[width] = {
				padding: [inside, inside, inside, inside],
				cardsApart: 16,
				apart: width < 640 ? [14, 14] : [14, 14, 14],
				places:
					width < 640
						? {
								firstLine: [16, 16],
								chevronOnTile: 0,
								countUnder: [8, 0],
								unnumberedChevron: 0,
								oneLine: [30, 0, 8],
							}
						: { centres: [0, 0, 0] },
			};
		}
		seen.heads = heads;
		expected.heads = headsExpected;
		expect(seen, "a Requirement card's head").toEqual(expected);
	});

	test("a Requirement card's body, while open and holding Evidence or a sub-Requirement: a 1 px border-default rule under the head, 16 px inside and 20 px from 640 px, the Requirement's pills, then each sub-Requirement's section under an H3, semibold, in text-primary, 20 px apart; a card holding neither shows its head alone", async ({
		page,
	}) => {
		await page.goto(`/ita/${shapes.slug}`);
		const longest = card(page, `1. ${LONGEST_REQUIREMENT}`);
		const body = longest.locator(":scope > :not(summary)");
		const sub = longest.getByRole("heading", { level: 3, name: "1.2 ข้อย่อยของข้อแรก" });
		const [edgeColour, primary] = await Promise.all(
			["border-default", "text-primary"].map((name) => tokenColor(page, name)),
		);
		const seen: Record<string, unknown> = {
			rule: await body.evaluate((part) => {
				const style = getComputedStyle(part);
				return [style.borderTopWidth, style.borderTopStyle, style.borderTopColor];
			}),
			sub: await textLook(sub),
			empty: await card(page, "2. ข้อกำหนดที่ยังไม่มีหลักฐาน").evaluate(
				(group) => group.children.length,
			),
		};
		const expected: Record<string, unknown> = {
			rule: ["1px", "solid", edgeColour],
			sub: { type: ["16px", "26px", "600"], colour: primary },
			empty: 1,
		};
		const padding: Record<number, unknown> = {};
		for (const width of [375, 639, 640, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const pills = await boxOf(longest.getByRole("list").first(), `at ${width} px: the pills`);
			const section = await boxOf(sub, `at ${width} px: the sub-Requirement`);
			padding[width] = {
				inside: await paddingOf(body),
				apart: Math.round(section.y - pills.y - pills.height),
			};
		}
		seen.padding = padding;
		expected.padding = Object.fromEntries(
			[375, 639, 640, 1440].map((width) => [
				width,
				{ inside: Array(4).fill(width < 640 ? 16 : 20), apart: 20 },
			]),
		);
		expect(seen, "a card's body").toEqual(expected);
	});

	test("Evidence before the first Requirement lies in a white card with radius 24, 20 px inside and 24 px from 640 px: first in the cards' column with the card shadow, 16 px above the first Requirement, and alone over the field's edge with the deep shadow where the MOIT has no Requirement, which has no table of contents", async ({
		page,
	}) => {
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		await page.goto(`/ita/${shapes.slug}`);
		const white = await tokenColor(page, "surface-base");
		const first = card(page, `1. ${LONGEST_REQUIREMENT}`);
		const hasLead = (await leadCard(page).count()) === 1;
		const withRequirements: Record<number, unknown> = {};
		for (const width of [375, 639, 640, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			if (!hasLead) {
				withRequirements[width] = "no card";
				continue;
			}
			const [lead, next] = [
				await boxOf(leadCard(page), `at ${width} px: the Evidence card`),
				await boxOf(first, `at ${width} px: the first Requirement`),
			];
			withRequirements[width] = {
				padding: await paddingOf(leadCard(page)),
				above: [Math.round(next.y - lead.y - lead.height), Math.round(next.x - lead.x)],
			};
		}
		seen.withRequirements = hasLead && {
			look: await boxLook(leadCard(page)),
			pill: await leadCard(page)
				.getByRole("link", { name: /คู่มือการประเมินก่อนข้อแรก/ })
				.count(),
			widths: withRequirements,
		};
		expected.withRequirements = {
			look: { fill: white, shadow: await tokenShadow(page, "card"), radius: "24px" },
			pill: 1,
			widths: Object.fromEntries(
				[375, 639, 640, 1440].map((width) => [
					width,
					{ padding: Array(4).fill(width < 640 ? 20 : 24), above: [16, 0] },
				]),
			),
		};

		await page.goto(`/ita/${noRequirement.slug}`);
		const field = fieldParts(page).field;
		const aloneCard = (await leadCard(page).count()) === 1;
		const alone: Record<number, unknown> = {};
		for (const width of [375, 639, 640, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			if (!aloneCard) {
				alone[width] = "no card";
				continue;
			}
			const edge = await fieldEdge(field, `at ${width} px`);
			alone[width] = Math.round(edge - (await boxOf(leadCard(page), `at ${width} px`)).y);
		}
		seen.alone = {
			look: aloneCard && (await boxLook(leadCard(page))),
			toc: await tableOfContents(page).count(),
			overlap: alone,
		};
		expected.alone = {
			look: { fill: white, shadow: await tokenShadow(page, "deep"), radius: "24px" },
			toc: 0,
			overlap: {
				375: FIELD_EDGE.phone.overlap,
				639: FIELD_EDGE.phone.overlap,
				640: FIELD_EDGE.fromSm.overlap,
				1440: FIELD_EDGE.fromSm.overlap,
			},
		};
		expect(seen, "the Evidence before the first Requirement").toEqual(expected);
	});

	test("a Requirement title of 238 characters shows whole in its card's head and in the table of contents with nothing past the window at 320 px", async ({
		page,
	}) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		await page.goto(`/ita/${shapes.slug}`);
		await expect(
			card(page, `1. ${LONGEST_REQUIREMENT}`).getByRole("heading", { level: 2 }),
		).toBeVisible();
		await expectNoTextCutOff(page, "a MOIT with a title of 238 characters at 320 px");
		const past = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(past, "nothing is past the window at 320 px").toBeLessThanOrEqual(0);
		await page.setViewportSize({ width: 1024, height: 900 });
		await expectNoTextCutOff(page, "a MOIT with a title of 238 characters at 1,024 px");
	});

	test("a MOIT page moves only when motion is allowed: the header's pill, H1, summary and counts line rise in as the page opens while the breadcrumb, the table of contents, the cards, their Evidence pills and the neighbour links show at once, and a card the table of contents leads to is whole when the page arrives", async ({
		page,
	}) => {
		const parts = fieldParts(page);
		const first = card(page, "1. ข้อกำหนดใต้ส่วนหัว");
		const atOnce: Array<[string, Locator]> = [
			["the breadcrumb", parts.breadcrumb],
			["the table of contents", tableOfContents(page)],
			["the first card", first],
			["an Evidence pill", first.getByRole("link", { name: /1\.1 หลักฐานใต้ส่วนหัว/ })],
			[
				"the neighbour links",
				page.getByRole("navigation", { name: "ตัวชี้วัดอื่นในปีงบประมาณเดียวกัน" }),
			],
		];
		const { seen, expected } = await readHeaderMotion(
			page,
			`/ita/${full.slug}`,
			[
				["the pill", parts.field.getByText(yearPill, { exact: true })],
				["the H1", parts.title],
				["the summary", parts.header.getByText(summary, { exact: true })],
				["the counts line", countsLine(page)],
			],
			atOnce,
			[["the field", parts.field], ["the H1", parts.title], ...atOnce],
			false,
		);

		// A card the table of contents leads to is whole when the page arrives at it.
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(`/ita/${full.slug}`);
		await tableOfContents(page).getByRole("link").nth(1).click();
		const second = card(page, "2. ข้อกำหนดข้อที่สองใต้ส่วนหัว");
		await expect(second).toBeInViewport();
		seen.reached = await second.evaluate((group) => ({
			running: group.getAnimations({ subtree: true }).length,
			opacity: getComputedStyle(group).opacity,
		}));
		expected.reached = { running: 0, opacity: "1" };
		await page.emulateMedia({ reducedMotion: "reduce" });
		expect(seen, "the motion, and nothing moving without it").toEqual(expected);
	});

	test.describe("without JavaScript", () => {
		test.use({ javaScriptEnabled: false });

		test("a MOIT page shows its header on the field, its table of contents and its cards whole, at 375 and 1440 px", async ({
			page,
		}) => {
			await page.goto(`/ita/${full.slug}`);
			const parts = fieldParts(page);
			const { seen, expected } = await readWholeAtTwoWidths(page, [
				["the breadcrumb on the field", parts.breadcrumb],
				["the pill on the field", parts.field.getByText(yearPill, { exact: true })],
				["the H1 on the field", parts.title],
				["the summary on the field", parts.header.getByText(summary, { exact: true })],
				["the counts line on the field", countsLine(page)],
				["the table of contents", tableOfContents(page)],
				["the first card", card(page, "1. ข้อกำหนดใต้ส่วนหัว")],
			]);
			expect(seen, "each part whole without JavaScript").toEqual(expected);
		});
	});
});

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
				requirementBlock("1", "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง"),
				fileBlock("1.1 บันทึกข้อความเสนอ ผบห.", pdf),
				linkBlock("1.2 ข้อมูลการติดต่อหน่วยงาน", "/contact", { current: true }),
				requirementBlock("2", "รายงานการกำกับติดตาม"),
				fileBlock("2.1 รายงานผลการกำกับติดตาม", pdf, { round: "รอบ 12 เดือน" }),
			],
			{ data: { summary, updated_on: "2026-09-23T17:30:00.000Z" } },
		);
		const long = await createMoit("a11y-long", 12, longEvidence(pdf), { data: { summary } });
		const edge = await createMoit("a11y-edge", 13, [
			fileBlock("คู่มือการประเมินก่อนข้อแรก", pdf),
			requirementBlock("1", "ข้อที่ยังไม่มีหลักฐาน"),
			requirementBlock("2", "ข้อที่มีข้อย่อย"),
			requirementBlock("2.1", "ข้อย่อยที่ยังไม่มีหลักฐาน"),
			requirementBlock("2.2", "ข้อย่อยที่มีไฟล์ที่ถูกลบ"),
			fileBlock("ไฟล์ที่ถูกลบออกจากคลังสื่อ", gone, { round: "รอบ 6 เดือน" }),
			linkBlock("ลิงก์ที่เปิดเป็นหน้าเว็บไม่ได้", "mailto:saraban@example.go.th", {
				current: true,
			}),
		]);
		// The most Requirements the office has published in one MOIT, the first with the longest title.
		const most = await createMoit(
			"a11y-most",
			21,
			Array.from({ length: 37 }, (_, index) => [
				requirementBlock(
					String(index + 1),
					index === 0
						? LONGEST_REQUIREMENT
						: `ข้อกำหนดที่ ${index + 1} ของตัวชี้วัดที่มีข้อมากที่สุด`,
				),
				fileBlock(`${index + 1}.1 หลักฐานของข้อ ${index + 1}`, pdf),
			]).flat(),
		);
		for (const moit of [short, long, edge, most]) await publish(moit);
		const removed = await deleteMedia(admin, gone.mediaId);
		expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);
		paths = [short, long, edge, most].map((moit) => `/ita/${moit.slug}`);
	});

	testAccessibilityAndReflow("the MOIT pages", () => paths);
});

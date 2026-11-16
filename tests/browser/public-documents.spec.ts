// The Document repository (#55; spec #51 "Public reads" (Documents), `03` §10 and §17).
//
// A citizen finds Documents at /documents, filtered by Document Type, topic and fiscal year with
// the filters kept in the address, and opens each at its canonical /documents/{slug} address to
// read its details and download its file. A superseded or expired Document says so in text and
// links to its successor. A Document whose file is gone shows "ไฟล์ไม่พร้อมให้บริการ" and nothing
// about storage. Drafts, unpublished and trashed Documents never show anywhere, and their
// addresses answer the site 404. Each filter offers only the terms or fiscal years that published
// Documents carry (spec #174 "Public list filters"). The list opens on the deep field under the
// label เข้าถึงข้อมูล, with its filter form and then its rows over the field's lower edge (Feature 010
// #312; public.helpers.ts testListOnField). Each row has two links, its title and the file's
// download, named with the Document's title, and no link over the whole row (#315).
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic Documents with synthetic PDF files, and synthetic
// document_type and topic terms, made through the native API the way the Admin makes them and
// removed afterwards. The runtime may hold other Documents (the demo dataset, the Product Owner's
// own), so assertions look only at this suite's uniquely titled fixtures, and tests about
// "newest first" publish their fixtures last. A synthetic News item stands for another list that
// carries a topic.
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
	createSyntheticDraft,
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
	type DraftFixture,
	type SyntheticTerm,
} from "./cms.helpers";
import type { Locator } from "@playwright/test";
import {
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	LIST_END,
	LeadingEntries,
	SECTION_CRUMBS,
	boxOf,
	detailOf,
	expect,
	expectBreadcrumb,
	expectFilteredEmpty,
	expectPreviewRenders,
	expectSiteNotFound,
	expectVisuallyHidden,
	listedItem,
	listedTitles,
	offeredLabels,
	ownTitles,
	shownLines,
	shownOpacity,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testListOnField,
	thaiDate,
	tokenColor,
} from "./public.helpers";

/** The fixed number of Documents a list page shows. */
const PAGE_SIZE = 20;

/** The lead of /documents, under its heading. */
const DOCUMENTS_LEAD = "แบบฟอร์ม คู่มือ แผนงาน รายงาน และเอกสารอื่นของสำนักงานสาธารณสุขอำเภอสอง";

/** What /documents shows when its filters match nothing (#55's decision 3). */
const FILTERED_EMPTY = {
	message: "ไม่พบเอกสารตามตัวกรองที่เลือก",
	back: { label: "ดูเอกสารทั้งหมด", href: "/documents" },
};

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

// First in the suite, while the runtime holds only its own Documents (Feature 010 #312).
testListOnField({
	path: "/documents",
	crumbs: [HOME_CRUMB],
	heading: { label: "เข้าถึงข้อมูล", title: "เอกสารเผยแพร่", lead: DOCUMENTS_LEAD },
	icon: "folder-open",
	collection: "documents",
	pageSize: PAGE_SIZE,
	noneYet: "ยังไม่มีเอกสาร",
	pastLast: "ไม่พบเอกสารในหน้านี้",
	form: {
		name: "กรองเอกสาร",
		unmatched: `type=${syntheticSlug("no-such-type")}`,
		empty: FILTERED_EMPTY,
	},
	admin: () => admin,
	publishItem: async (label) => {
		const document = await createDocument(label);
		await publishEntryAt(admin, "documents", document.id, LIST_END);
		return document;
	},
	rowsMove: true,
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

/** The `day`th of `month` 2031, after any real Document, so the row leads the list. */
const in2031 = (month: number, day: number) =>
	`2031-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T03:00:00.000Z`;

/** The 2031 Documents a test published, returned to draft after it (`publishLeading`). */
const leading = new LeadingEntries();

/** Publish `fixture` at `at`, in 2031, until the test ends (`LeadingEntries`). */
async function publishLeading(fixture: DraftFixture, at: string): Promise<void> {
	await publishEntryAt(admin, "documents", fixture.id, at);
	leading.hold("documents", fixture);
}

test.afterEach(() => leading.release(admin));

/** A title longer than two lines of a row at every width. */
const LONG_TITLE =
	"ซึ่งมีชื่อเรื่องยาวเกินกว่าสองบรรทัดของแถวในรายการเอกสารทุกความกว้างของหน้าจอ แม้บนจอกว้างที่สุดที่แถวมีพื้นที่มากที่สุด เพื่อดูว่าชื่อเรื่องถูกตัดให้เหลือสองบรรทัดเสมอ และยังอ่านได้ครบถ้วนในหน้าเอกสารของตนเอง พร้อมรายละเอียด วันที่ และไฟล์สำหรับดาวน์โหลดทั้งหมด";

/** A summary longer than two lines of a row at every width from 640 px. */
const LONG_SUMMARY = `${SYNTHETIC_FIXTURE_MARK} ${"สรุปเอกสารแผนปฏิบัติการด้านสุขภาพของเครือข่ายบริการสุขภาพอำเภอ ฉบับปรับปรุงประจำปีงบประมาณ ".repeat(6)}`;

/** The parts of a Document row a citizen meets, found by what they say and do. */
function rowParts(row: Locator) {
	return {
		tile: row.locator("svg.lucide-file-text").locator("xpath=.."),
		title: row.getByRole("heading", { level: 2 }),
		download: row.getByRole("link", { name: /^ดาวน์โหลด/ }),
		facts: row.locator("time").locator("xpath=.."),
	};
}

/** The text styles of `part` as the page is laid out now. */
function textStyle(part: Locator) {
	return part.evaluate((element) => {
		const style = getComputedStyle(element);
		return {
			size: parseFloat(style.fontSize),
			weight: style.fontWeight,
			colour: style.color,
			underline: style.textDecorationLine.includes("underline"),
		};
	});
}

test("each /documents row: the file's tile with file-text and the file's type, 68 px below 640 px and 92 px from 640 px; the facts line; the title as an H2 in two lines at most, linking to its page; from 640 px the summary in two lines at most; exactly two links; rows 14 px apart", async ({
	page,
}) => {
	const type = await createTerm("document_type", "คู่มือ");
	const long = await createSyntheticDraft(admin, "documents", `เอกสาร ${LONG_TITLE}`, "row-long", {
		data: {
			file: (await uploadSyntheticPdf(admin)).value,
			summary: LONG_SUMMARY,
			document_at: "2026-09-23T17:30:00.000Z",
			fiscal_year: 2569,
		},
		taxonomies: { document_type: [type.slug] },
	});
	const plain = await createDocument("row-plain");
	await publishLeading(long, in2031(1, 2));
	await publishLeading(plain, in2031(1, 1));

	await page.goto("/documents");
	// What today's rows already show: the order, the title as an H2 linking to the page, the facts.
	expect(ownTitles(await listedTitles(page), [long, plain]), "newest first").toEqual([
		long.title,
		plain.title,
	]);
	const row = listedItem(page, long.title);
	const parts = rowParts(row);
	await expect(parts.title.getByRole("link")).toHaveAttribute("href", `/documents/${long.slug}`);
	await expect(parts.facts).toContainText(type.label);
	await expect(parts.facts).toContainText(thaiDate("2026-09-23T17:30:00.000Z"));
	await expect(parts.facts).toContainText("ปีงบประมาณ 2569");

	const summary = row.getByText(LONG_SUMMARY.trim());
	const tileOnce = async () => {
		if ((await parts.tile.count()) === 0) return undefined;
		return parts.tile.evaluate((tile) => ({
			decorative: tile.closest('[aria-hidden="true"]') !== null,
			gradient: getComputedStyle(tile).backgroundImage.includes("linear-gradient"),
			type: tile.textContent?.trim(),
			typeColour: getComputedStyle(tile.querySelector("span") ?? tile).color,
		}));
	};
	const seen: Record<string, unknown> = {
		tile: await tileOnce(),
		titleColour: (await textStyle(parts.title)).colour,
		summaryColour: (await textStyle(summary)).colour,
	};
	const expected: Record<string, unknown> = {
		tile: {
			decorative: true,
			gradient: true,
			type: "PDF",
			typeColour: await tokenColor(page, "accent-warm"),
		},
		// The title's colour and sizes as the prototype's (Product Owner, 2026-11-16: #315 comment
		// 6908747140, item 1).
		titleColour: await tokenColor(page, "text-primary"),
		summaryColour: await tokenColor(page, "text-secondary"),
	};
	for (const width of [1440, 1024, 768, 640, 639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		const wide = width >= 640;
		const [upper, lower] = [
			await boxOf(row, "the first row"),
			await boxOf(listedItem(page, plain.title), "the second row"),
		];
		const tile = (await parts.tile.count()) > 0 ? await boxOf(parts.tile, "the tile") : undefined;
		seen[width] = {
			tile: tile && [Math.round(tile.width), Math.round(tile.height)],
			titleSize: (await textStyle(parts.title)).size,
			title: await shownLines(parts.title),
			summary: (await summary.isVisible()) ? await shownLines(summary) : "hidden",
			links: [
				await row.getByRole("link").count(),
				await listedItem(page, plain.title).getByRole("link").count(),
			],
			gap: Math.round(lower.y - (upper.y + upper.height)),
		};
		expected[width] = {
			tile: wide ? [92, 92] : [68, 68],
			titleSize: wide ? 18 : 16,
			title: { lines: 2, clamped: true },
			summary: wide ? { lines: 2, clamped: true } : "hidden",
			links: [2, 2],
			gap: 14,
		};
	}
	expect(seen, "the row's parts").toEqual(expected);
});

test("a row's download is a 44 px brand-primary pill with the 20 px download icon reading ดาวน์โหลด and, in regular weight, the file's type and size, named by those words and then the Document's title, linking to the file at EmDash's media URL under its name, as the Document's page does", async ({
	page,
}) => {
	const file = await uploadSyntheticPdf(
		admin,
		`${SYNTHETIC_FIXTURE_MARK}-แบบคำร้อง-${crypto.randomUUID().slice(0, 6)}.pdf`,
	);
	const document = await createDocument("download", { file });
	await publishLeading(document, in2031(2, 1));

	await page.goto(`/documents/${document.slug}`);
	const onItsPage = page.getByRole("main").getByRole("link", { name: /ดาวน์โหลด/ });
	const pageLink = {
		href: await onItsPage.getAttribute("href"),
		download: await onItsPage.getAttribute("download"),
	};
	await page.goto("/documents");
	const row = listedItem(page, document.title);
	// Today's row names the file's type and size.
	await expect(row).toContainText("PDF, 2 KB");

	const { download } = rowParts(row);
	const seen: Record<string, unknown> = { links: await download.count() };
	const expected: Record<string, unknown> = {
		links: 1,
		href: `/_emdash/api/media/file/${file.storageKey}`,
		download: file.filename,
		asOnItsPage: pageLink,
		height: 44,
		fill: await tokenColor(page, "brand-primary"),
		words: { colour: await tokenColor(page, "surface-base"), weight: "600" },
		typeAndSize: "400",
		icon: [20, 20],
	};
	if ((await download.count()) === 1) {
		const box = await boxOf(download, "the download");
		const icon = await boxOf(download.locator("svg.lucide-download"), "the download icon");
		const style = await textStyle(download);
		const typeAndSize = download.getByText("(PDF, 2 KB)", { exact: true });
		Object.assign(seen, {
			href: await download.getAttribute("href"),
			download: await download.getAttribute("download"),
			asOnItsPage: {
				href: await download.getAttribute("href"),
				download: await download.getAttribute("download"),
			},
			height: Math.round(box.height),
			fill: await download.evaluate((link) => getComputedStyle(link).backgroundColor),
			words: { colour: style.colour, weight: style.weight },
			typeAndSize: (await typeAndSize.count()) === 1 ? (await textStyle(typeAndSize)).weight : 0,
			icon: [Math.round(icon.width), Math.round(icon.height)],
		});
		await expect(download).toHaveAccessibleName(`ดาวน์โหลด (PDF, 2 KB) ${document.title}`);
		await expectVisuallyHidden(download.getByText(document.title), "the title in the download");
	}
	expect(seen, "the row's download").toEqual(expected);
});

test("a row whose file cannot be served shows ไฟล์ on its tile and ไฟล์ไม่พร้อมให้บริการ in small semibold text-secondary in place of the download, and links only its title", async ({
	page,
}) => {
	const document = await createDocument("row-file-gone");
	await publishLeading(document, in2031(3, 1));
	const removed = await deleteMedia(admin, document.file.mediaId);
	expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);

	await page.goto("/documents");
	const row = listedItem(page, document.title);
	const unavailable = row.getByText("ไฟล์ไม่พร้อมให้บริการ", { exact: true });
	await expect(unavailable).toBeVisible();
	await expect(row.getByRole("link", { name: /ดาวน์โหลด/ })).toHaveCount(0);
	const { tile } = rowParts(row);
	expect(
		{
			tile: (await tile.count()) === 1 ? (await tile.textContent())?.trim() : undefined,
			unavailable: await textStyle(unavailable),
			links: await row
				.getByRole("link")
				.evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
		},
		"the row without its file",
	).toEqual({
		tile: "ไฟล์",
		unavailable: {
			size: 13,
			weight: "600",
			colour: await tokenColor(page, "text-secondary"),
			underline: false,
		},
		links: [`/documents/${document.slug}`],
	});
});

test("a superseded or an expired Document's row shows its attention label on its own line between the facts and the title, and a current one shows none", async ({
	page,
}) => {
	const at = { data: { document_at: "2026-09-23T17:30:00.000Z" } };
	const superseded = await createDocument("row-superseded", {
		data: { ...at.data, domain_status: "superseded" },
	});
	const expired = await createDocument("row-expired", {
		data: { ...at.data, domain_status: "expired" },
	});
	const current = await createDocument("row-current", {
		data: { ...at.data, domain_status: "current" },
	});
	await publishLeading(superseded, in2031(4, 3));
	await publishLeading(expired, in2031(4, 2));
	await publishLeading(current, in2031(4, 1));

	await page.goto("/documents");
	await expect(listedItem(page, superseded.title)).toContainText("ถูกแทนที่แล้ว");
	await expect(listedItem(page, expired.title)).toContainText("หมดอายุแล้ว");
	await expect(listedItem(page, current.title)).not.toContainText(
		/ถูกแทนที่แล้ว|หมดอายุแล้ว|ฉบับปัจจุบัน/,
	);
	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};
	for (const [document, label] of [
		[superseded, "ถูกแทนที่แล้ว"],
		[expired, "หมดอายุแล้ว"],
	] as const) {
		const row = listedItem(page, document.title);
		const { facts, title } = rowParts(row);
		const status = row.getByText(label, { exact: true });
		const [factsBox, statusBox, titleBox] = [
			await boxOf(facts, `${label}: the facts`),
			await boxOf(status, `${label}: the label`),
			await boxOf(title, `${label}: the title`),
		];
		seen[label] = {
			underFacts: statusBox.y >= factsBox.y + factsBox.height - 0.5,
			aboveTitle: titleBox.y >= statusBox.y + statusBox.height - 0.5,
			fill: await status.evaluate((element) => getComputedStyle(element).backgroundColor),
		};
		expected[label] = {
			underFacts: true,
			aboveTitle: true,
			fill: await tokenColor(page, "accent-warm"),
		};
	}
	expect(seen, "the attention label on its own line").toEqual(expected);
});

test("a row's download sits at the row's right from 1,024 px, under the text at its start from 640 px to 1,023 px, and across the row under the tile and the text below 640 px", async ({
	page,
}) => {
	const document = await createDocument("row-place", {
		data: { summary: `${SYNTHETIC_FIXTURE_MARK} สรุปเอกสารสำหรับประชาชน` },
	});
	await publishLeading(document, in2031(5, 1));

	await page.goto("/documents");
	const row = listedItem(page, document.title);
	const { tile, title, download } = rowParts(row);
	await expect(row.getByRole("link", { name: document.title })).toBeVisible();
	/** Where the download lies against the row, its tile and its text, rounded to the pixel. */
	const placeOf = async () => {
		if ((await download.count()) === 0) return "no download";
		const [rowBox, tileBox, textBox, linkBox] = [
			await boxOf(row, "the row"),
			await boxOf(tile, "the tile"),
			await boxOf(title, "the title"),
			await boxOf(download, "the download"),
		];
		const near = (a: number, b: number) => Math.abs(a - b) <= 1;
		const textBottom = Math.max(textBox.y + textBox.height, tileBox.y + tileBox.height);
		if (linkBox.x >= textBox.x + textBox.width - 0.5 && linkBox.y < textBox.y + textBox.height) {
			return "beside the text, at the row's right";
		}
		if (linkBox.y >= textBottom - 0.5 && near(linkBox.x, textBox.x)) {
			return "under the text, at its start";
		}
		if (
			linkBox.y >= textBottom - 0.5 &&
			near(linkBox.x, tileBox.x) &&
			near(linkBox.x + linkBox.width, rowBox.x + rowBox.width - (tileBox.x - rowBox.x))
		) {
			return "across the row, under the tile and the text";
		}
		return `elsewhere: ${JSON.stringify({ rowBox, tileBox, textBox, linkBox })}`;
	};
	const seen: Record<number, string> = {};
	const expected: Record<number, string> = {};
	for (const [width, place] of [
		[1440, "beside the text, at the row's right"],
		[1024, "beside the text, at the row's right"],
		[1023, "under the text, at its start"],
		[640, "under the text, at its start"],
		[639, "across the row, under the tile and the text"],
		[375, "across the row, under the tile and the text"],
		[320, "across the row, under the tile and the text"],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		seen[width] = await placeOf();
		expected[width] = place;
	}
	expect(seen, "the download's place by width").toEqual(expected);
});

test("a row's title and download are its two focus stops; under the pointer its title turns brand-primary and underlined on its own link only, the row takes the deep shadow only when motion is allowed, and a press elsewhere on the row opens nothing", async ({
	page,
}) => {
	const dated = { data: { document_at: "2026-09-23T17:30:00.000Z" } };
	const first = await createDocument("pointer-first", dated);
	const second = await createDocument("pointer-second", dated);
	await publishLeading(first, in2031(6, 2));
	await publishLeading(second, in2031(6, 1));
	/** The row's shadow: the `deep` one under the pointer, else the `card` one. */
	const shadowOf = (row: Locator) =>
		row.evaluate((article) => {
			const shadow = getComputedStyle(article).boxShadow;
			return shadow.includes("0px 30px 60px -20px")
				? "deep"
				: shadow.includes("0px 10px 15px")
					? "card"
					: shadow;
		});
	/** Point at the middle of `part` once its row has come in, and give a move 0.5 s. */
	const pointAt = async (part: Locator) => {
		const box = await boxOf(part, "where the pointer goes");
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.waitForTimeout(500);
	};
	/** Press `x`, `y` and say which address the page then shows. */
	const pressAt = async (x: number, y: number) => {
		await page.mouse.click(x, y);
		await page.waitForURL(/\/documents\/./, { timeout: 2_000 }).catch(() => undefined);
		const opened = new URL(page.url()).pathname;
		if (opened !== "/documents") await page.goBack();
		return opened;
	};

	await page.goto("/documents");
	const row = listedItem(page, first.title);
	const { tile, title, download, facts } = rowParts(row);
	// Today's row has no tile: its facts stand in, so a red run reaches the last assertion.
	const away = (await tile.count()) === 1 ? tile : facts;
	const titleLink = title.getByRole("link");
	const focused = (part: Locator) =>
		part.evaluate((element) => element === document.activeElement).catch(() => false);
	await titleLink.focus();
	await page.keyboard.press("Tab");
	const afterTitle = (await download.count()) === 1 && (await focused(download));
	await page.keyboard.press("Tab");
	const afterThat = await focused(rowParts(listedItem(page, second.title)).title.getByRole("link"));

	await pointAt(away);
	const onTile = { title: await textStyle(title), row: await shadowOf(row) };
	await pointAt(titleLink);
	const onTitle = await textStyle(titleLink);
	const tileBox = await boxOf(away, "the tile");
	const rowBox = await boxOf(row, "the row");
	const pressed = {
		tile: await pressAt(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2),
		corner: await pressAt(rowBox.x + rowBox.width - 4, rowBox.y + 4),
	};

	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/documents");
	await listedItem(page, first.title).scrollIntoViewIfNeeded();
	await expect
		.poll(() => shownOpacity(listedItem(page, first.title)), { message: "the row has come in" })
		.toBe(1);
	await pointAt(away);
	const moving = await shadowOf(listedItem(page, first.title));

	const [primary, text] = [
		await tokenColor(page, "brand-primary"),
		await tokenColor(page, "text-primary"),
	];
	expect(
		{ afterTitle, afterThat, onTile, onTitle, pressed, moving },
		"the row's links, under the pointer and the keyboard",
	).toEqual({
		// Tab goes from the title to its download, then to the next row's title.
		afterTitle: true,
		afterThat: true,
		onTile: {
			title: { size: 18, weight: "600", colour: text, underline: false },
			row: "card",
		},
		onTitle: { size: 18, weight: "600", colour: primary, underline: true },
		pressed: { tile: "/documents", corner: "/documents" },
		moving: "deep",
	});
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

test("the Document Type and topic filters offer only the terms that published Documents carry, and an address naming another shows the empty state", async ({
	page,
}) => {
	const offeredType = await createTerm("document_type", "คู่มือ");
	const draftType = await createTerm("document_type", "ระเบียบ");
	const offeredTopic = await createTerm("topic", "วัณโรค");
	const draftTopic = await createTerm("topic", "สุขภาพช่องปาก");
	const newsTopic = await createTerm("topic", "ยาเสพติด");
	const published = await createDocument("terms-published", {
		taxonomies: { document_type: [offeredType.slug], topic: [offeredTopic.slug] },
	});
	await createDocument("terms-draft", {
		taxonomies: { document_type: [draftType.slug], topic: [draftTopic.slug] },
	});
	const news = await createSyntheticDraft(admin, "news", "ข่าว", "terms-news", {
		taxonomies: { topic: [newsTopic.slug] },
	});
	await publish(published);
	await publishEntryAt(admin, "news", news.id);

	await page.goto("/documents");
	const filters = page.getByRole("form", { name: "กรองเอกสาร" });
	expect(
		await offeredLabels(filters.getByLabel("ประเภทเอกสาร"), [offeredType, draftType]),
		"a type that only a draft carries is not offered",
	).toEqual([offeredType.label]);
	expect(
		await offeredLabels(filters.getByLabel("ประเด็นสุขภาพ"), [offeredTopic, draftTopic, newsTopic]),
		"a topic that only a draft or another list carries is not offered",
	).toEqual([offeredTopic.label]);

	for (const path of [
		`/documents?type=${draftType.slug}`,
		`/documents?topic=${draftTopic.slug}`,
		`/documents?topic=${newsTopic.slug}`,
	]) {
		await expectFilteredEmpty(page, path, FILTERED_EMPTY);
	}
});

test("an empty filtered result shows the empty state, and a fiscal year that is not one is ignored", async ({
	page,
}) => {
	const document = await createDocument("filter-safe");
	await publish(document);

	await expectFilteredEmpty(
		page,
		`/documents?type=${syntheticSlug("no-such-type")}`,
		FILTERED_EMPTY,
	);

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
	// Its heading stays as it is until its own ticket (Feature 010 #316, #317).
	await expect(page.getByTestId("deep-field"), "no deep field under the heading").toHaveCount(0);
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

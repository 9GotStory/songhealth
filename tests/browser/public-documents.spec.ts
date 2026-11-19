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
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	HOME_CRUMB,
	LIST_END,
	LeadingEntries,
	isoDay,
	pointAt,
	pressOpens,
	SECTION_CRUMBS,
	boxOf,
	cardOverFieldEdge,
	cardOverFieldEdgeAsSpecified,
	detailOf,
	documentRowParts,
	entersAfter,
	expect,
	expectAttentionLabelsOnOwnLine,
	expectBreadcrumb,
	expectSecondLinkPlaces,
	expectFilteredEmpty,
	expectPreviewRenders,
	expectSiteNotFound,
	expectVisuallyHidden,
	fieldParts,
	fileBlockAt,
	fileBlockAsSpecified,
	fileBlockLook,
	fileBlockLookAsSpecified,
	fileBlockOf,
	expectPostTitleSizes,
	unavailableNoticeIn,
	gutterAt,
	HEADER_WIDEST,
	listedItem,
	listedTitles,
	offeredLabels,
	rowShadow,
	ownTitles,
	pillStyle,
	shownLines,
	shownOpacity,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testListOnField,
	textStyle,
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
	itemsMove: "rows",
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
	await expect(row.getByRole("link", { name: older.title, exact: true })).toHaveAttribute(
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
const in2031 = (month: number, day: number) => isoDay(2031, month, day);

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
	const parts = documentRowParts(row);
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
		titleColour: (await textStyle(parts.title.getByRole("link"))).colour,
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
			// The title's link holds its lines, so its focus ring is not cut where they are.
			title: await shownLines(parts.title.getByRole("link")),
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

	const { download } = documentRowParts(row);
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
	const { tile } = documentRowParts(row);
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
	await expectAttentionLabelsOnOwnLine(
		page,
		(
			[
				[superseded, "ถูกแทนที่แล้ว"],
				[expired, "หมดอายุแล้ว"],
			] as const
		).map(([document, label]) => {
			const row = listedItem(page, document.title);
			return { ...documentRowParts(row), row, label };
		}),
	);
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
	const { tile, title, download } = documentRowParts(row);
	await expect(row.getByRole("link", { name: document.title, exact: true })).toBeVisible();
	await expectSecondLinkPlaces(page, { row, tile, title, link: download }, "download");
});

test("a row's title and download are its two focus stops; under the pointer its title turns brand-primary and underlined on its own link only, the download's fill turns brand-dark, the row takes the deep shadow only when motion is allowed, and a press elsewhere on the row opens nothing", async ({
	page,
}) => {
	const dated = { data: { document_at: "2026-09-23T17:30:00.000Z" } };
	const first = await createDocument("pointer-first", dated);
	const second = await createDocument("pointer-second", dated);
	await publishLeading(first, in2031(6, 2));
	await publishLeading(second, in2031(6, 1));
	/** Press `x`, `y` on `target` and say which address the page then shows. */
	const pressAt = (target: Locator, x: number, y: number, label: string) =>
		pressOpens(page, target, { x, y }, label, "/documents");

	await page.goto("/documents");
	const row = listedItem(page, first.title);
	const { tile, title, download, facts } = documentRowParts(row);
	// Today's row has no tile: its facts stand in, so a red run reaches the last assertion.
	const away = (await tile.count()) === 1 ? tile : facts;
	const titleLink = title.getByRole("link");
	const focused = (part: Locator) =>
		part.evaluate((element) => element === document.activeElement).catch(() => false);
	await titleLink.focus();
	await page.keyboard.press("Tab");
	const afterTitle = (await download.count()) === 1 && (await focused(download));
	await page.keyboard.press("Tab");
	const afterThat = await focused(
		documentRowParts(listedItem(page, second.title)).title.getByRole("link"),
	);

	await pointAt(page, away);
	const onTile = { title: await textStyle(titleLink), row: await rowShadow(row) };
	await pointAt(page, titleLink);
	const onTitle = await textStyle(titleLink);
	await pointAt(page, download);
	const downloadFill = await download.evaluate((link) => getComputedStyle(link).backgroundColor);
	const tileBox = await boxOf(away, "the tile");
	const rowBox = await boxOf(row, "the row");
	const pressed = {
		tile: await pressAt(
			away,
			tileBox.x + tileBox.width / 2,
			tileBox.y + tileBox.height / 2,
			"the tile",
		),
		// Inside the row's rounded corner, 22 px across, where nothing is drawn but the row.
		corner: await pressAt(row, rowBox.x + rowBox.width - 12, rowBox.y + 12, "the row's corner"),
	};

	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/documents");
	await listedItem(page, first.title).scrollIntoViewIfNeeded();
	await expect
		.poll(() => shownOpacity(listedItem(page, first.title)), { message: "the row has come in" })
		.toBe(1);
	await pointAt(page, away);
	const moving = await rowShadow(listedItem(page, first.title));

	const [primary, text, dark] = [
		await tokenColor(page, "brand-primary"),
		await tokenColor(page, "text-primary"),
		await tokenColor(page, "brand-dark"),
	];
	expect(
		{ afterTitle, afterThat, onTile, onTitle, downloadFill, pressed, moving },
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
		downloadFill: dark,
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

test("a Document page shows its details in its card, its file for download at EmDash's media URL, and its breadcrumb", async ({
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
	await expect(download).toHaveAccessibleName("ดาวน์โหลดเอกสาร (PDF, 2 KB)");
	const served = await request.get(`/_emdash/api/media/file/${file.storageKey}`);
	expect(served.status(), "EmDash serves the file at that address").toBe(200);
	expect(served.headers()["content-type"]).toBe("application/pdf");
	expect((await served.body()).length).toBe(SYNTHETIC_PDF_BYTES);

	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.documents], document.title);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "เอกสารเผยแพร่" }),
	).toHaveAttribute("aria-current", "true");

	// The details and the download lie in the card over the field's edge (Feature 010 #317).
	const card = fieldParts(page).card;
	expect(
		{
			terms: await card.getByRole("term").allInnerTexts(),
			downloads: await card.getByRole("link", { name: /ดาวน์โหลด/ }).count(),
		},
		"the card's details and download",
	).toEqual({
		terms: [
			"ประเภทเอกสาร",
			"วันที่เอกสาร",
			"ปีงบประมาณ",
			"เจ้าของ/แหล่งที่มา",
			"สถานะเอกสาร",
			"ประเด็นสุขภาพ",
		],
		downloads: 1,
	});
});

test("a Document page leaves out the optional details that are not set, and its card then holds the file alone", async ({
	page,
}) => {
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
	const card = fieldParts(page).card;
	expect(
		{
			downloads: await card.getByRole("link", { name: /ดาวน์โหลด/ }).count(),
			rules: await card.getByRole("separator").count(),
			details: await card.locator("dl").count(),
		},
		"the card holds the file alone, with no rule",
	).toEqual({ downloads: 1, rules: 0, details: 0 });
});

test("a superseded or expired Document says so in text and links to its published successor in a note 32 px under the card below 1,024 px and 40 px from 1,024 px", async ({
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

	// The note follows the card, on the page's colour (Feature 010 #317).
	await page.goto(`/documents/${superseded.slug}`);
	const card = fieldParts(page).card;
	const note = page.getByRole("main").getByText("เอกสารฉบับถัดไป");
	const seen: Record<number, unknown> = {};
	const expected: Record<number, unknown> = {};
	for (const width of [375, 1023, 1024, 1440]) {
		expected[width] = [width < 1024 ? 32 : 40, 0];
		if ((await card.count()) === 0) continue;
		await page.setViewportSize({ width, height: 900 });
		const cardBox = await boxOf(card, `at ${width} px: the card`);
		const noteBox = await boxOf(note, `at ${width} px: the note`);
		seen[width] = [
			Math.round(noteBox.y - cardBox.y - cardBox.height),
			Math.round(noteBox.x - cardBox.x),
		];
	}
	expect(seen, "the successor's note under the card, at its start").toEqual(expected);
});

test("a Document whose file was deleted shows the unavailable notice first in its card, under the H2 ไฟล์เอกสาร and without a tile, with ติดต่อเรา, status 200 and no storage detail", async ({
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

	await page.goto(`/documents/${document.slug}`);
	const card = fieldParts(page).card;
	const notice = await unavailableNoticeIn(card, "ไฟล์เอกสาร", "ไฟล์ไม่พร้อมให้บริการ");
	expect(
		notice && { ...notice, tiles: await card.locator("svg.lucide-file-text").count() },
		"the unavailable notice first in the card",
	).toEqual({ headingFirst: 20, noticeUnderHeading: true, asks: 1, contact: "/contact", tiles: 0 });
});

/** A Document's summary in two lines, as staff typed them. */
const FIELD_SUMMARY = `${SYNTHETIC_FIXTURE_MARK} แผนปฏิบัติการด้านสุขภาพของเครือข่าย\nฉบับปรับปรุงประจำปีงบประมาณ`;

test.describe("a Document's page on the field", () => {
	/** A type, the summary, every detail, current: its type's pill alone. */
	let full: DocumentFixture & { type: SyntheticTerm };
	/** The same type, superseded by a published successor: both pills, and the note. */
	let superseded: DocumentFixture;
	let successor: DocumentFixture;
	/** No type, expired: its status's pill alone. */
	let expired: DocumentFixture;
	/** No type, summary or detail: no row of pills, and a card that holds the file alone. */
	let bare: DocumentFixture;
	/** Its file deleted: the card holds the unavailable notice. */
	let fileGone: DocumentFixture;
	const pathOf = (fixture: DraftFixture) => `/documents/${fixture.slug}`;

	test.beforeAll(async () => {
		const type = await createTerm("document_type", "แผนงาน");
		const created = await createDocument("field-full", {
			data: {
				summary: FIELD_SUMMARY,
				document_at: "2026-09-23T17:30:00.000Z",
				fiscal_year: 2569,
				owner_source: `${SYNTHETIC_FIXTURE_MARK} กลุ่มงานควบคุมโรค`,
				domain_status: "current",
			},
			taxonomies: { document_type: [type.slug] },
		});
		full = { ...created, type };
		successor = await createDocument("field-successor");
		await publish(successor);
		superseded = await createDocument("field-superseded", {
			// 11.8 KB, a size whose words take two lines of the download at 320 px.
			file: await uploadSyntheticPdf(admin, undefined, 12_083),
			data: { domain_status: "superseded" },
			taxonomies: { document_type: [type.slug] },
			references: { successor: [successor.id] },
		});
		expired = await createDocument("field-expired", { data: { domain_status: "expired" } });
		bare = await createDocument("field-bare");
		fileGone = await createDocument("field-file-gone");
		for (const fixture of [full, superseded, expired, bare, fileGone]) await publish(fixture);
		const removed = await deleteMedia(admin, fileGone.file.mediaId);
		expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);
	});

	test("the page opens on the deep field without a ring: the breadcrumb in white, 24 px under it the type in an outlined white pill and ถูกแทนที่แล้ว or หมดอายุแล้ว in an accent-warm pill, then the title as the page's one H1 in today's sizes and the summary with the line breaks staff typed, each on the field, 48 rem wide at most, with no publication date; a pill the Document lacks is left out, and so is the row without a pill", async ({
		page,
	}) => {
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		// What today's page already shows: one H1 in its sizes, and no publication date.
		await page.goto(pathOf(superseded));
		await expectPostTitleSizes(page);
		await expect(main.getByText(/^เผยแพร่ /), "no publication date").toHaveCount(0);

		const white = await tokenColor(page, "surface-base");
		const onField = (await parts.field.count()) === 1;
		const type = parts.field.getByText(full.type.label, { exact: true });
		const status = parts.field.getByText("ถูกแทนที่แล้ว", { exact: true });
		const seen: Record<string, unknown> = {
			field: onField,
			decorations: await parts.field.locator(':scope > [aria-hidden="true"] > *').count(),
		};
		const expected: Record<string, unknown> = {
			field: true,
			decorations: 0,
		};
		for (const viewport of [MOBILE_VIEWPORT, PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
			if (!onField) break;
			await page.setViewportSize(viewport);
			const at = `at ${viewport.width} px`;
			const field = await boxOf(parts.field, `${at}: the field`);
			const crumbs = await boxOf(parts.breadcrumb, `${at}: the breadcrumb`);
			const typeBox = await boxOf(type, `${at}: the type's pill`);
			const statusBox = await boxOf(status, `${at}: the status's pill`);
			const title = await boxOf(parts.title, `${at}: the title`);
			seen[viewport.width] = {
				onField: [crumbs, typeBox, statusBox, title].every(
					(box) => box.y >= field.y && box.y + box.height <= field.y + field.height,
				),
				pillsUnderCrumbs: Math.round(typeBox.y - crumbs.y - crumbs.height),
				// The status follows the type on its row, or, with no room left on it, starts the next
				// row 8 px under it at the row's start.
				statusAfterType:
					Math.abs(statusBox.y - typeBox.y) <= 1
						? statusBox.x > typeBox.x + typeBox.width
						: Math.round(statusBox.x - typeBox.x) === 0 &&
							Math.round(statusBox.y - typeBox.y - typeBox.height) === 8,
				titleUnderPills: title.y >= typeBox.y + typeBox.height,
				headerWidth: Math.round((await boxOf(parts.header, `${at}: the header`)).width),
				pills: { type: await pillStyle(type), status: await pillStyle(status) },
				white: [
					await parts.breadcrumb
						.getByRole("link")
						.first()
						.evaluate((link) => getComputedStyle(link).color),
					await parts.breadcrumb
						.locator('[aria-current="page"]')
						.evaluate((crumb) => getComputedStyle(crumb).color),
					await parts.title.evaluate((title) => getComputedStyle(title).color),
				],
			};
			expected[viewport.width] = {
				onField: true,
				pillsUnderCrumbs: 24,
				statusAfterType: true,
				titleUnderPills: true,
				headerWidth: Math.min(HEADER_WIDEST, viewport.width - 2 * gutterAt(viewport.width)),
				pills: {
					type: {
						fill: "rgba(0, 0, 0, 0)",
						colour: white,
						type: ["13px", "20px", "600"],
						edge: "1px",
					},
					status: {
						fill: await tokenColor(page, "accent-warm"),
						colour: await tokenColor(page, "brand-dark"),
						type: ["13px", "20px", "600"],
						edge: "1px",
					},
				},
				white: [white, white, white],
			};
		}

		// A current Document: its type's pill alone, then the title and the summary with its line
		// breaks, and no date in the header.
		await page.goto(pathOf(full));
		await page.setViewportSize(DESKTOP_VIEWPORT);
		const summary = parts.header.getByText(FIELD_SUMMARY.split("\n")[0]!);
		const rowOf = async (pill: Locator) =>
			(await pill.count()) === 1 ? (await pill.locator("xpath=..").innerText()).trim() : "no pill";
		seen.current = onField && {
			row: await rowOf(parts.field.getByText(full.type.label, { exact: true })),
			dates: await parts.header.locator("time").count(),
			summary: {
				text: await summary.innerText(),
				shown: await shownLines(summary),
				colour: await summary.evaluate((text) => getComputedStyle(text).color),
				underTitle:
					(await boxOf(summary, "the summary")).y >=
					(await boxOf(parts.title, "the title")).y +
						(await boxOf(parts.title, "the title")).height,
			},
		};
		expected.current = {
			row: full.type.label,
			dates: 0,
			summary: {
				text: FIELD_SUMMARY,
				shown: { lines: 2, clamped: false },
				colour: white,
				underTitle: true,
			},
		};

		// Expired without a type: its status's pill alone.
		await page.goto(pathOf(expired));
		seen.expired = onField && (await rowOf(parts.field.getByText("หมดอายุแล้ว", { exact: true })));
		expected.expired = "หมดอายุแล้ว";

		// Neither: no row of pills, the title 24 px under the breadcrumb.
		await page.goto(pathOf(bare));
		const crumbs = onField && (await boxOf(parts.breadcrumb, "the bare Document's breadcrumb"));
		seen.bare =
			crumbs &&
			Math.round(
				(await boxOf(parts.title, "the bare Document's title")).y - crumbs.y - crumbs.height,
			);
		expected.bare = 24;
		expect(seen, "the header on the field").toEqual(expected);
	});

	test("the card starts 48 px above the field's lower edge below 640 px and 56 px from 640 px, where the header ends 80 and 96 px above it: white, radius 24, the deep shadow, 20 px inside, in the text column at most 48 rem wide, whether it holds the file and the details, the file alone or the unavailable notice", async ({
		page,
	}) => {
		const widths = [320, 375, 639, 640, 1440];
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		for (const fixture of [full, bare, fileGone]) {
			await page.goto(pathOf(fixture));
			seen[fixture.title] = await cardOverFieldEdge(page, widths);
			expected[fixture.title] = await cardOverFieldEdgeAsSpecified(page, widths);
		}
		expect(seen, "the card over the field's edge").toEqual(expected);
	});

	test("the card holds first the file: the tile with file-text and the type in accent-warm, 68 px below 640 px and 92 px from 640 px, beside it the H2 ไฟล์เอกสาร with the type and size under it, and the download ดาวน์โหลดเอกสาร with the type and size, at the card's right and 52 px high from 640 px, across the card under them and 44 px high below 640 px; then a 1 px border-default rule and the details, 20 px apart", async ({
		page,
	}) => {
		// A superseded Document's download is a current one's (#315 comment 6909993217).
		await page.goto(pathOf(superseded));
		const block = fileBlockOf(fieldParts(page).card, "ไฟล์เอกสาร", "PDF, 11.8 KB");
		const look = await fileBlockLook(block);
		const seen: Record<string, unknown> = { parts: look };
		const expected: Record<string, unknown> = {
			parts: await fileBlockLookAsSpecified(page, "PDF", superseded.file),
		};
		for (const width of [320, 375, 639, 640, 1023, 1024, 1440]) {
			if (!look) break;
			seen[width] = await fileBlockAt(block, [block.typeAndSize], width);
			// The type and size stay on one line, and the words take two lines at 320 px.
			expected[width] = fileBlockAsSpecified(width, { lines: 1, wordLines: width === 320 ? 2 : 1 });
		}
		expect(seen, "the card's file block, rule and details").toEqual(expected);
	});

	test("with motion allowed the header rises in as the page opens and the card after it, while the breadcrumb and the successor's note show at once", async ({
		page,
	}) => {
		const parts = fieldParts(page);
		const note = page.getByRole("main").getByText("เอกสารฉบับถัดไป");
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(pathOf(superseded), { waitUntil: "commit" });
		await expect(parts.title).toBeVisible();
		const headerEnters = await entersAfter(parts.title);
		const seen = {
			title: headerEnters,
			cardAfterHeader: (await entersAfter(parts.card)) > headerEnters,
			breadcrumb: await entersAfter(parts.breadcrumb),
			note: await entersAfter(note),
		};
		await page.emulateMedia({ reducedMotion: "reduce" });
		expect(seen, "the header and the card rise in; the rest shows at once").toEqual({
			title: 0,
			cardAfterHeader: true,
			breadcrumb: -1,
			note: -1,
		});
	});
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

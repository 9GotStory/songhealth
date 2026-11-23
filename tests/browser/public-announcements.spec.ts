// Announcements (#56; spec #51 "Public reads" (Announcements) and "Errors, redirects, preview and
// SEO").
//
// A citizen reads published Announcements at /announcements: the current ones first, then the
// closed ones, each newest first by announcement date, where an Announcement without one takes its
// place by its publication. An Announcement is current when it has no close date, or its close
// date is today or later in Bangkok. One with open or close dates states in text whether it is not
// open yet, open or closed (ยังไม่เปิด, เปิดอยู่, ปิดแล้ว), by the Bangkok day. Each Announcement's page
// at /announcements/{slug} shows its type, its announcement, open and close dates, its details and
// the Documents attached to it, each linking to its Document page. Drafts, unpublished and trashed
// Announcements never show, and attached Documents that are not published are left out. The list
// opens on the deep field under the label แจ้งให้ทราบ, with its rows over the field's lower edge
// (Feature 010 #312; public.helpers.ts testListOnField). Each row is the Homepage's Announcement
// row, a closed one's date tile and status label in status-closed (Feature 010 #314).
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

import type { Locator, Page } from "@playwright/test";
import {
	createOwnedTerm,
	createSyntheticDocument,
	createSyntheticDraft,
	devAdminActor,
	mintPreviewLink,
	portableTextBlock,
	publishEntryAt,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPdf,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
	type SyntheticPdf,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HEADER_WIDEST,
	HOME_CRUMB,
	LIST_END,
	LeadingEntries,
	fileTileLines,
	isoDay,
	lightRowTile,
	pressInside,
	SECTION_CRUMBS,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	boxOf,
	cardOverFieldEdge,
	cardOverFieldEdgeAsSpecified,
	detailOf,
	entersAfter,
	expectStacked,
	fieldEdge,
	fieldParts,
	gutterAt,
	heldBack,
	expect,
	expectBreadcrumb,
	expectPreviewRenders,
	expectSiteNotFound,
	listedItem,
	listedTitles,
	movingSurface,
	ownTitles,
	pillStyle,
	pointAtRowEdge,
	rowTileLook,
	shownLines,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testListOnField,
	thaiDate,
	tokenColor,
} from "./public.helpers";

/** The fixed number of Announcements a list page shows. */
const PAGE_SIZE = 20;

/** The lead of /announcements, under its heading. */
const ANNOUNCEMENTS_LEAD = "ประกาศของสำนักงานสาธารณสุขอำเภอสองที่ประชาชนควรทราบหรือต้องดำเนินการ";
/** The label and the heading over an Announcement's related Documents. */
const RELATED = { label: "เอกสารเผยแพร่", title: "เอกสารที่เกี่ยวข้อง" };

/** The first and last paragraphs of an Announcement's details in the page's fixtures. */
const DETAILS_TEXT = `${SYNTHETIC_FIXTURE_MARK} ผู้สนใจยื่นใบสมัครได้ที่สำนักงานสาธารณสุขอำเภอสอง`;
const DETAILS_END = `${SYNTHETIC_FIXTURE_MARK} ยื่นใบสมัครพร้อมสำเนาบัตรประชาชน`;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];

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
const createTerm = (taxonomy: string, label: string) =>
	createOwnedTerm(admin, taxonomy, label, ownedTerms);

/** A synthetic Announcement draft. Its title is unique, so a page shows it or does not. */
const createAnnouncement = (label: string, fields: DraftFields = {}) =>
	createSyntheticDraft(admin, "announcements", "ประกาศ", label, fields);

/** A synthetic Document draft with `file`, and the terms given. */
const createDocument = (label: string, file: SyntheticPdf, taxonomies?: Record<string, string[]>) =>
	createSyntheticDocument(admin, label, { file, taxonomies });

/** Publish an entry of `collection` now, or backdated. Returns the stored publication instant. */
function publish(
	fixture: DraftFixture,
	publishedAt?: string,
	collection = "announcements",
): Promise<string> {
	return publishEntryAt(admin, collection, fixture.id, publishedAt);
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

// First in the suite, while the runtime holds only its own Announcements (Feature 010 #312).
testListOnField({
	path: "/announcements",
	crumbs: [HOME_CRUMB, SECTION_CRUMBS.news],
	heading: { label: "แจ้งให้ทราบ", title: "ประกาศ", lead: ANNOUNCEMENTS_LEAD },
	icon: "file-text",
	collection: "announcements",
	pageSize: PAGE_SIZE,
	noneYet: "ยังไม่มีประกาศ",
	pastLast: "ไม่พบประกาศในหน้านี้",
	admin: () => admin,
	itemsMove: "rows",
	publishItem: async (label) => {
		// Closed too, since the closed ones follow every current one.
		const announcement = await createAnnouncement(label, { data: { closes_at: LIST_END } });
		await publish(announcement, LIST_END);
		return announcement;
	},
});

test("/announcements lists current Announcements first and closed ones after, each newest first by announcement date with the publication as the fallback, and states their status in text", async ({
	page,
}) => {
	const closes = closeDates();
	const currentUndated = await createAnnouncement("current-undated", {
		data: { closes_at: closes.tomorrow },
	});
	const currentRecent = await createAnnouncement("current-recent", {
		data: { announcement_at: "2026-10-20T03:00:00.000Z", closes_at: closes.today },
	});
	// Not open until tomorrow, but not closed either: it is listed among the current ones.
	const upcoming = await createAnnouncement("upcoming", {
		data: {
			announcement_at: "2026-10-10T03:00:00.000Z",
			opens_at: closes.tomorrow,
			closes_at: "2030-11-30T10:00:00.000Z",
		},
	});
	// Published before the recent one but announced after the old one, with no open or close date.
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
	await publish(upcoming);
	await publish(currentRecent, "2026-08-01T03:00:00.000Z");
	const undatedAt = await publish(currentUndated);

	const response = await page.goto("/announcements");
	expect(response?.status(), "GET /announcements").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("ประกาศ");
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "ข่าวสาร" }),
	).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.news], "ประกาศ");

	const all = [
		currentUndated,
		currentRecent,
		upcoming,
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
		upcoming.title,
		currentOld.title,
		closedRecent.title,
		closedOld.title,
	]);

	for (const closed of [closedRecent, closedOld]) {
		await expect(listedItem(page, closed.title), `${closed.title} is marked`).toContainText(
			"ปิดแล้ว",
		);
	}
	for (const current of [currentUndated, currentRecent, upcoming, currentOld]) {
		await expect(
			listedItem(page, current.title),
			`${current.title} is not marked closed`,
		).not.toContainText("ปิดแล้ว");
	}
	for (const open of [currentUndated, currentRecent]) {
		await expect(listedItem(page, open.title), `${open.title} is open`).toContainText("เปิดอยู่");
	}
	await expect(listedItem(page, upcoming.title)).toContainText("ยังไม่เปิด");
	await expect(listedItem(page, upcoming.title)).toContainText(
		`วันที่เริ่มต้น ${thaiDate(closes.tomorrow)}`,
	);
	await expect(listedItem(page, upcoming.title)).not.toContainText("เปิดอยู่");
	const plain = listedItem(page, currentOld.title);
	for (const label of ["ยังไม่เปิด", "เปิดอยู่", "ปิดแล้ว"]) {
		await expect(plain, `an Announcement without dates states no ${label}`).not.toContainText(
			label,
		);
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

test("an Announcement closing today is current and open, one that closed yesterday is closed, and one without a close date is current, on its own page too", async ({
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
	await expect(listedItem(page, today.title)).toContainText("เปิดอยู่");
	await expect(listedItem(page, none.title)).not.toContainText("ปิดแล้ว");

	await page.goto(`/announcements/${yesterday.slug}`);
	await expect(detailOf(page, "สถานะ")).toHaveText("ปิดแล้ว");
	await expect(detailOf(page, "วันที่สิ้นสุด")).toHaveText(thaiDate(closes.yesterday));
	await page.goto(`/announcements/${today.slug}`);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(today.title);
	await expect(detailOf(page, "สถานะ")).toHaveText("เปิดอยู่");
	await page.goto(`/announcements/${none.slug}`);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(none.title);
	await expect(page.getByRole("main").getByRole("term").filter({ hasText: "สถานะ" })).toHaveCount(
		0,
	);
});

/** The `day`th of `month` 2031, after any real Announcement, so the row leads its group. */
const in2031 = (month: number, day: number) => isoDay(2031, month, day);

/** The 2031 Announcements a test published, returned to draft after it (`publishLeading`). */
const leading = new LeadingEntries();

/** Publish `fixture`, dated 2031, until the test ends (`LeadingEntries`). */
async function publishLeading(fixture: DraftFixture): Promise<void> {
	await publish(fixture);
	leading.hold("announcements", fixture);
}

test.afterEach(() => leading.release(admin));

/**
 * Open the page of /announcements that lists `title`: closed rows follow every current one, which
 * the suite's earlier tests leave published, so a closed row may be on a later page.
 */
async function gotoListing(page: Page, title: string): Promise<Locator> {
	for (let number = 1; number <= 5; number += 1) {
		await page.goto(number === 1 ? "/announcements" : `/announcements?page=${number}`);
		const row = listedItem(page, title);
		if ((await row.count()) > 0) return row;
	}
	throw new Error(`no page of /announcements lists ${title}`);
}

/**
 * What a citizen sees of an Announcement row as it is laid out now, read in one pass, so a part
 * the row lacks reads as missing rather than stopping the read: whether its one link covers it,
 * and its date tile's day, the day's place and size against the month and year under it, and the
 * colours of the tile and of both.
 */
function readRow(row: Locator) {
	return row.evaluate((article) => {
		const link = article.querySelector("a")?.getBoundingClientRect();
		const box = article.getBoundingClientRect();
		const date = article.querySelector("time");
		const [day, month] = [...(date?.children ?? [])].map((part) => ({
			text: part.textContent?.trim(),
			size: parseFloat(getComputedStyle(part).fontSize),
			top: part.getBoundingClientRect().top,
			bottom: part.getBoundingClientRect().bottom,
			color: getComputedStyle(part).color,
		}));
		const tile = getComputedStyle(date?.parentElement ?? article);
		return {
			linkCoversRow:
				!!link &&
				(["x", "y", "width", "height"] as const).every(
					(side) => Math.abs(link[side] - box[side]) < 1,
				),
			day: day?.text,
			dayLarge: !!day && !!month && day.size > month.size,
			monthUnderDay: !!day && !!month && month.top >= day.bottom - 1,
			tile: {
				gradient: tile.backgroundImage.includes("linear-gradient"),
				fill: tile.backgroundColor,
				day: day?.color,
				monthAndYear: month?.color,
			},
		};
	});
}

/** The fill and the words' colour of the part of `row` that reads `text`, if it shows one. */
async function coloursOf(row: Locator, text: string) {
	const part = row.getByText(text, { exact: true });
	if ((await part.count()) === 0) return undefined;
	return part.evaluate((element) => ({
		fill: getComputedStyle(element).backgroundColor,
		words: getComputedStyle(element).color,
		dot: element.querySelector('[data-testid="status-dot"]') !== null,
	}));
}

test("each /announcements row is the Homepage's row: the date tile with the day large and the month and year under it, the type's badge in its colour, the title as an H2 in two lines at most, the status after a dot when it has an open or close date, and from 640 px the round arrow; one link named by the title covers the row, and the rows are 14 px apart", async ({
	page,
}) => {
	const long =
		"ซึ่งมีชื่อเรื่องยาวเกินกว่าสองบรรทัดของแถวในรายการประกาศทุกความกว้างของหน้าจอ แม้บนจอกว้างที่สุดที่แถวมีพื้นที่มากที่สุด เพื่อดูว่าชื่อเรื่องถูกตัดให้เหลือสองบรรทัดเสมอ และยังอ่านได้ครบถ้วนในหน้าประกาศของตนเอง พร้อมรายละเอียด วันที่ และเอกสารที่เกี่ยวข้องทั้งหมด";
	const other = await createTerm("announcement_type", "ประชาพิจารณ์");
	const procurement = await createAnnouncement("row-procurement", {
		data: { announcement_at: in2031(1, 4), closes_at: in2031(12, 31) },
		taxonomies: { announcement_type: ["procurement"] },
	});
	const recruitment = await createSyntheticDraft(admin, "announcements", `ประกาศ ${long}`, "row", {
		data: { announcement_at: in2031(1, 3), opens_at: in2031(11, 1), closes_at: in2031(12, 31) },
		taxonomies: { announcement_type: ["recruitment"] },
	});
	const general = await createAnnouncement("row-other", {
		data: { announcement_at: in2031(1, 2) },
		taxonomies: { announcement_type: [other.slug] },
	});
	const plain = await createAnnouncement("row-plain", { data: { announcement_at: in2031(1, 1) } });
	const fixtures = [procurement, recruitment, general, plain];
	for (const announcement of fixtures) await publishLeading(announcement);
	const badges = [
		[procurement, "จัดซื้อจัดจ้าง", "procurement-text", "topic-blue"],
		[recruitment, "รับสมัครงาน", "brand-dark", "accent-warm"],
		[general, other.label, "brand-primary", "surface-soft"],
	] as const;

	await page.goto("/announcements");
	// What today's rows already show: the order, the title as an H2 that names the row's one link,
	// the date the list orders by, the type, and the status in words.
	expect(ownTitles(await listedTitles(page), fixtures), "newest first").toEqual(
		fixtures.map(({ title }) => title),
	);
	for (const [index, announcement] of fixtures.entries()) {
		const row = listedItem(page, announcement.title);
		const name = announcement.title;
		await expect(row.getByRole("heading", { level: 2 }), name).toHaveText(name);
		await expect(row.getByRole("link"), name).toHaveCount(1);
		await expect(row.getByRole("link"), name).toHaveAccessibleName(name);
		await expect(row.getByRole("link"), name).toHaveAttribute(
			"href",
			`/announcements/${announcement.slug}`,
		);
		await expect(row.locator("time").first(), name).toHaveText(thaiDate(in2031(1, 4 - index)));
	}
	for (const [announcement, label] of badges) {
		await expect(listedItem(page, announcement.title), label).toContainText(label);
	}
	await expect(listedItem(page, plain.title)).not.toContainText(
		new RegExp(badges.map(([, label]) => label).join("|")),
	);
	await expect(listedItem(page, procurement.title)).toContainText("เปิดอยู่");
	await expect(listedItem(page, recruitment.title)).toContainText(
		`วันที่เริ่มต้น ${thaiDate(in2031(11, 1))}`,
	);
	for (const announcement of [general, plain]) {
		await expect(listedItem(page, announcement.title), "no status line").not.toContainText(
			/ยังไม่เปิด|เปิดอยู่|ปิดแล้ว|วันที่/,
		);
	}

	// What the Homepage's row adds, read whole and compared once.
	/** An empty record of what the rows show, by label, status or width. */
	const record = () => ({
		badges: {} as Record<string, unknown>,
		dots: {} as Record<string, unknown>,
		widths: {} as Record<number, unknown>,
		arrows: {} as Record<number, boolean[]>,
	});
	const [seen, expected] = [record(), record()];
	for (const [announcement, label, words, fill] of badges) {
		const colours = await coloursOf(listedItem(page, announcement.title), label);
		seen.badges[label] = { fill: colours?.fill, words: colours?.words };
		expected.badges[label] = {
			fill: await tokenColor(page, fill),
			words: await tokenColor(page, words),
		};
	}
	for (const [announcement, status] of [
		[procurement, "เปิดอยู่"],
		[recruitment, "ยังไม่เปิด"],
	] as const) {
		seen.dots[status] = (await coloursOf(listedItem(page, announcement.title), status))?.dot;
		expected.dots[status] = true;
	}
	for (const announcement of [general, plain]) {
		seen.dots[announcement.title] = await listedItem(page, announcement.title)
			.getByTestId("status-dot")
			.count();
		expected.dots[announcement.title] = 0;
	}
	const longTitle = listedItem(page, recruitment.title).getByRole("heading", { level: 2 });
	for (const width of [1440, 1024, 768, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		const [upper, lower] = [
			await boxOf(listedItem(page, procurement.title), "the first row"),
			await boxOf(listedItem(page, recruitment.title), "the second row"),
		];
		const tiles = [];
		for (const announcement of fixtures) {
			const { linkCoversRow, day, dayLarge, monthUnderDay } = await readRow(
				listedItem(page, announcement.title),
			);
			tiles.push({ linkCoversRow, day, dayLarge, monthUnderDay });
		}
		seen.widths[width] = {
			title: await shownLines(longTitle),
			gap: Math.round(lower.y - (upper.y + upper.height)),
			tiles,
		};
		expected.widths[width] = {
			title: { lines: 2, clamped: true },
			gap: 14,
			tiles: fixtures.map((_, index) => ({
				linkCoversRow: true,
				day: String(4 - index),
				dayLarge: true,
				monthUnderDay: true,
			})),
		};
	}
	for (const [width, shown] of [
		[640, true],
		[639, false],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		seen.arrows[width] = [];
		expected.arrows[width] = fixtures.map(() => shown);
		for (const announcement of fixtures) {
			const arrow = listedItem(page, announcement.title).locator("svg.lucide-arrow-right");
			seen.arrows[width].push(await arrow.isVisible());
		}
	}
	expect(seen, "the Homepage's row").toEqual(expected);
});

test("a closed Announcement's row has its date tile and its ปิดแล้ว label in status-closed with text-primary, where a current one's tile keeps the gradient with the month and year in accent-warm", async ({
	page,
}) => {
	const closes = closeDates();
	const current = await createAnnouncement("tile-current", {
		data: { announcement_at: in2031(2, 1), closes_at: in2031(12, 31) },
	});
	const closed = await createAnnouncement("tile-closed", {
		data: { announcement_at: in2031(2, 2), closes_at: closes.yesterday },
	});
	await publishLeading(current);
	await publishLeading(closed);
	const colour = (name: string) => tokenColor(page, name);

	await page.goto("/announcements");
	await expect(listedItem(page, current.title)).toContainText("เปิดอยู่");
	const currentTile = (await readRow(listedItem(page, current.title))).tile;
	const row = await gotoListing(page, closed.title);
	await expect(row).toContainText("ปิดแล้ว");
	const closedTile = (await readRow(row)).tile;
	expect(
		{ currentTile, closedTile, label: await coloursOf(row, "ปิดแล้ว") },
		"a closed row greyed against a current one",
	).toEqual({
		currentTile: {
			gradient: true,
			// The gradient is the tile's image, over no fill.
			fill: "rgba(0, 0, 0, 0)",
			day: await colour("surface-base"),
			monthAndYear: await colour("accent-warm"),
		},
		closedTile: {
			gradient: false,
			fill: await colour("status-closed"),
			day: await colour("text-primary"),
			monthAndYear: await colour("text-primary"),
		},
		label: { fill: await colour("status-closed"), words: await colour("text-primary"), dot: true },
	});
});

test("under the pointer a row moves 10 px to the right with the deep shadow only when motion is allowed, a press on the strip it left still opens the Announcement, and the keyboard reaches each row once, its ring banded over the field", async ({
	page,
}) => {
	const first = await createAnnouncement("hover-first", {
		data: { announcement_at: in2031(3, 2) },
	});
	const second = await createAnnouncement("hover-second", {
		data: { announcement_at: in2031(3, 1) },
	});
	await publishLeading(first);
	await publishLeading(second);
	const surfaceOf = (row: Locator) => movingSurface(row, "announcement-surface");
	const pointAtEdge = (row: Locator) => pointAtRowEdge(page, row);

	// Today's rows: one focus stop each, in order.
	await page.goto("/announcements");
	await listedItem(page, first.title).getByRole("link").focus();
	await page.keyboard.press("Tab");
	await expect(
		listedItem(page, second.title).getByRole("link"),
		"the next row's link follows",
	).toBeFocused();
	const firstLink = page.getByRole("main").getByRole("article").first().getByRole("link");
	await firstLink.focus();
	const band = await firstLink.evaluate((link) => getComputedStyle(link).boxShadow);

	const still = await pointAtEdge(listedItem(page, first.title));
	const stillSurface = await surfaceOf(listedItem(page, first.title));

	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/announcements");
	const row = listedItem(page, first.title);
	const moving = await pointAtEdge(row);
	const movedSurface = await surfaceOf(row);
	await pressInside(page, row, moving.edge, "the part the row left");
	// Today's row opens nothing there: the reading follows either way.
	await page.waitForURL(/\/announcements\/./, { timeout: 5_000 }).catch(() => undefined);
	expect(
		{ band, stillSurface, movedSurface, opened: new URL(page.url()).pathname },
		"the row under the pointer, and its ring",
	).toEqual({
		// The first row lies over the field's edge: its ring has a white band on both sides.
		band: expect.stringContaining(`${await tokenColor(page, "surface-base")} 0px 0px 0px 7px`),
		stillSurface: { x: still.x, shadow: "card" },
		movedSurface: { x: moving.x + 10, shadow: "deep" },
		opened: `/announcements/${first.slug}`,
	});
});

test("/announcements pages through its Announcements, current ones before closed ones across pages", async ({
	page,
}) => {
	// Announced in 2030, after any real Announcement, so the current ones lead the first page.
	const current: DraftFixture[] = [];
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
	const closedTile = (await readRow(listedItem(page, closed.title))).tile.fill;
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
	expect(closedTile, "the closed one's grey tile on the second page").toBe(
		await tokenColor(page, "status-closed"),
	);
});

test("an Announcement page shows its type, dates, details and its published attached Documents, each on the light file tile and linking to its Document page", async ({
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
	const detailsText = DETAILS_TEXT;
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
	await expect(detailOf(page, "สถานะ"), "opened on 1 Oct 2026, closing in 2030").toHaveText(
		"เปิดอยู่",
	);
	await expect(main.getByText(detailsText)).toBeVisible();

	const attached = main.getByRole("region", { name: "เอกสารที่เกี่ยวข้อง" });
	expect(
		(await attached.getByRole("article").getByRole("heading", { level: 3 }).allTextContents()).map(
			(text) => text.trim(),
		),
		"the published Documents, in the order they were attached, each titled with an H3",
	).toEqual([second.title, first.title]);
	const firstRow = attached.getByRole("article").filter({ hasText: first.title });
	await expect(firstRow, "a related Document's row names its type").toContainText(
		documentType.label,
	);
	await expect(firstRow).toContainText("PDF, 2 KB");
	for (const hidden of [draft, unpublished, trashed]) {
		await expect(main.getByText(hidden.title), hidden.title).toHaveCount(0);
	}

	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.news, ["ประกาศ", "/announcements"]],
		announcement.title,
	);

	// Each row is the Document row with its own download, named by its Document, and the title lies
	// on the deep field (Feature 010 #316; spec #311 decisions 9, 16).
	const rows = [];
	for (const document of [second, first]) {
		const download = attached.getByRole("link", {
			name: `ดาวน์โหลด (PDF, 2 KB) ${document.title}`,
			exact: true,
		});
		const row = attached.getByRole("article").filter({ hasText: document.title });
		rows.push({
			title: await attached
				.getByRole("link", { name: document.title, exact: true })
				.getAttribute("href"),
			// The light file tile (Feature 014 #418; spec #417 decision 12, P1 A).
			tile: await rowTileLook(row.locator("svg.lucide-file-text").locator("xpath=..")),
			download:
				(await download.count()) === 1
					? {
							href: await download.getAttribute("href"),
							file: await download.getAttribute("download"),
						}
					: "no download",
		});
	}
	await expect(fieldParts(page).title, "the title on the deep field").toHaveText(
		announcement.title,
	);
	const lightFileTile = await lightRowTile(page, fileTileLines("PDF"));
	expect(rows, "each row's title link, its tile and its download").toEqual(
		[second, first].map((document) => ({
			title: `/documents/${document.slug}`,
			tile: lightFileTile,
			download: { href: `/_emdash/api/media/file/${file.storageKey}`, file: file.filename },
		})),
	);
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
	await expect(fieldParts(page).card, "no details card").toHaveCount(0);
	for (const name of ["ประเภทประกาศ", "วันที่ประกาศ", "วันที่เริ่มต้น", "วันที่สิ้นสุด", "สถานะ"]) {
		await expect(main.getByRole("term").filter({ hasText: name }), name).toHaveCount(0);
	}
	await expect(main.getByRole("region", { name: "เอกสารที่เกี่ยวข้อง" })).toHaveCount(0);
});

// An Announcement's page opens on the deep field with the Post page's header and lays its details
// card over the field's lower edge (Feature 010 #316; spec #311 "An Announcement's page and a
// Document's page: the header", "The card over the field's edge", "Motion").
test.describe("an Announcement's page on the field", () => {
	/** Type, three dates, details with a heading, and two attached Documents. */
	let full: DraftFixture & { publishedAt: string; type: SyntheticTerm; documents: DraftFixture[] };
	/** An announcement date and no type: its date's pill alone, and a card of one row. */
	let untyped: DraftFixture & { publishedAt: string };
	/** Neither a type nor a date: no card, its details under the field. */
	let bare: DraftFixture;
	/** Closed yesterday, and not open yet. */
	let closed: DraftFixture;
	let upcoming: DraftFixture;
	const pathOf = (fixture: DraftFixture) => `/announcements/${fixture.slug}`;

	test.beforeAll(async () => {
		const type = await createTerm("announcement_type", "รับสมัคร");
		const file = await uploadSyntheticPdf(admin);
		const documents = [
			await createDocument("field-first", file),
			await createDocument("field-second", file),
		];
		for (const document of documents) await publish(document, undefined, "documents");
		const created = await createAnnouncement("field-full", {
			data: {
				details: [
					portableTextBlock(DETAILS_TEXT),
					portableTextBlock("ขั้นตอนการสมัคร", "h2"),
					portableTextBlock(DETAILS_END),
				],
				announcement_at: "2026-09-23T17:30:00.000Z",
				opens_at: "2026-10-01T02:00:00.000Z",
				closes_at: "2030-10-31T10:00:00.000Z",
			},
			taxonomies: { announcement_type: [type.slug] },
			references: { documents: documents.map((document) => document.id) },
		});
		full = { ...created, publishedAt: await publish(created), type, documents };
		const dated = await createAnnouncement("field-untyped", {
			data: { announcement_at: "2026-09-23T17:30:00.000Z" },
		});
		untyped = { ...dated, publishedAt: await publish(dated) };
		bare = await createAnnouncement("field-bare", {
			data: { details: [portableTextBlock(DETAILS_TEXT)] },
		});
		closed = await createAnnouncement("field-closed", {
			data: { closes_at: closeDates().yesterday },
		});
		upcoming = await createAnnouncement("field-upcoming", {
			data: { opens_at: "2030-02-03T03:00:00.000Z" },
		});
		for (const fixture of [bare, closed, upcoming]) await publish(fixture);
	});

	test("the page opens on the deep field without a ring: the breadcrumb in white, 24 px under it เผยแพร่ and the publication date in an accent-warm pill and the type in an outlined white pill, then the title as the page's one H1 in today's sizes, each on the field, 48 rem wide at most; a pill the Announcement lacks is left out, and so is the row without a pill", async ({
		page,
	}) => {
		await page.goto(pathOf(full));
		const parts = fieldParts(page);
		const date = parts.field.getByText(`เผยแพร่ ${thaiDate(full.publishedAt)}`, { exact: true });
		const type = parts.field.getByText(full.type.label, { exact: true });
		await expect(page.getByRole("heading", { level: 1 }), "one H1").toHaveCount(1);
		await expect(
			parts.field.locator(':scope > [aria-hidden="true"] > *'),
			"the field has no ring or other decoration",
		).toHaveCount(0);
		const white = await tokenColor(page, "surface-base");
		const expectedPills = {
			date: {
				fill: await tokenColor(page, "accent-warm"),
				colour: await tokenColor(page, "brand-dark"),
				type: ["13px", "20px", "600"],
				edge: "1px",
			},
			type: { fill: "rgba(0, 0, 0, 0)", colour: white, type: ["13px", "20px", "600"], edge: "1px" },
		};
		for (const viewport of [MOBILE_VIEWPORT, PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
			await page.setViewportSize(viewport);
			const label = `at ${viewport.width} px`;
			await expectStacked(label, [
				["the breadcrumb", parts.breadcrumb],
				["the date's pill", date],
				["the title", parts.title],
			]);
			const field = await boxOf(parts.field, `${label}: the field`);
			for (const [name, part] of [
				["the breadcrumb", parts.breadcrumb],
				["the date's pill", date],
				["the type's pill", type],
				["the title", parts.title],
			] as const) {
				const box = await boxOf(part, `${label}: ${name}`);
				expect(box.y, `${label}: ${name} starts on the field`).toBeGreaterThanOrEqual(field.y);
				expect(box.y + box.height, `${label}: ${name} ends on the field`).toBeLessThanOrEqual(
					field.y + field.height,
				);
			}
			const crumbs = await boxOf(parts.breadcrumb, `${label}: the breadcrumb`);
			const dateBox = await boxOf(date, `${label}: the date's pill`);
			const typeBox = await boxOf(type, `${label}: the type's pill`);
			expect(
				dateBox.y - crumbs.y - crumbs.height,
				`${label}: the pills 24 px under the breadcrumb`,
			).toBeCloseTo(24, 0);
			// The type follows the date on its row, or, too long for what is left of it, starts the
			// next row 8 px under it.
			const sameRow = Math.abs(typeBox.y - dateBox.y) <= 1;
			expect(
				sameRow
					? typeBox.x > dateBox.x + dateBox.width
					: Math.round(typeBox.x - dateBox.x) === 0 &&
							Math.round(typeBox.y - dateBox.y - dateBox.height) === 8,
				`${label}: the type after the date, or 8 px under it at the row's start`,
			).toBe(true);
			expect(
				(await boxOf(parts.header, `${label}: the header`)).width,
				`${label}: the header 48 rem wide at most`,
			).toBeCloseTo(Math.min(HEADER_WIDEST, viewport.width - 2 * gutterAt(viewport.width)), 0);
			expect(
				{ date: await pillStyle(date), type: await pillStyle(type) },
				`${label}: the pills`,
			).toEqual(expectedPills);
			for (const [name, part] of [
				["a breadcrumb's link", parts.breadcrumb.getByRole("link").first()],
				["the breadcrumb's current page", parts.breadcrumb.locator('[aria-current="page"]')],
				["the title", parts.title],
			] as const) {
				await expect(part, `${label}: ${name} in surface-base`).toHaveCSS("color", white);
			}
		}
		// The title in today's sizes: H3 below 640 px, H2 from 640 px and H1 from 1,024 px.
		for (const [width, size] of [
			[639, "24px"],
			[640, "34px"],
			[1023, "34px"],
			[1024, "46px"],
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await expect(parts.title, `the title at ${width} px`).toHaveCSS("font-size", size);
		}

		// Without a type, the date's pill is alone on its row.
		await page.goto(pathOf(untyped));
		const alone = fieldParts(page).field.getByText(/^เผยแพร่ /);
		await expect(alone.locator("xpath=.."), "the row holds the date alone").toHaveText(
			`เผยแพร่ ${thaiDate(untyped.publishedAt)}`,
		);

		// A draft has no publication date: with a type its preview's row holds the type alone, and
		// without one it has no row, its title following the breadcrumb.
		const typedDraft = await createAnnouncement("field-typed-draft", {
			taxonomies: { announcement_type: [full.type.slug] },
		});
		await page.goto((await mintPreviewLink(admin, "announcements", typedDraft.id)).toString());
		const typedPill = fieldParts(page).field.getByText(full.type.label, { exact: true });
		await expect(
			typedPill.locator("xpath=.."),
			"the typed draft's row holds its type alone",
		).toHaveText(full.type.label);
		const draft = await createAnnouncement("field-draft");
		await page.goto((await mintPreviewLink(admin, "announcements", draft.id)).toString());
		const drafted = fieldParts(page);
		await expect(drafted.title, "the draft's title").toHaveText(draft.title);
		await expect(drafted.field.getByText(/เผยแพร่/), "no publication date").toHaveCount(0);
		const crumbs = await boxOf(drafted.breadcrumb, "the draft's breadcrumb");
		expect(
			(await boxOf(drafted.title, "the draft's title")).y - crumbs.y - crumbs.height,
			"the draft's title 24 px under the breadcrumb, with no row of pills between",
		).toBeCloseTo(24, 0);
	});

	test("the details card starts 48 px above the field's lower edge below 640 px and 56 px from 640 px, where the header ends 80 and 96 px above it: white, radius 24, the deep shadow, 20 px inside, in the text column at most 48 rem wide, with the status as the list's dotted label; an Announcement with no details row has no card, and its field reaches 40 px under the header below 640 px and 48 px from 640 px", async ({
		page,
	}) => {
		const widths = [320, 375, 639, 640, 1440];
		for (const fixture of [full, untyped]) {
			await page.goto(pathOf(fixture));
			expect(
				await cardOverFieldEdge(page, widths),
				`${fixture.title}: the card over the field's edge`,
			).toEqual(await cardOverFieldEdgeAsSpecified(page, widths));
		}

		// The status as the list's dotted label, in its own fill.
		for (const [fixture, words, fill, colour] of [
			[full, "เปิดอยู่", "brand-primary", "surface-base"],
			[closed, "ปิดแล้ว", "status-closed", "text-primary"],
			[upcoming, "ยังไม่เปิด", "accent-warm", "brand-dark"],
		] as const) {
			await page.goto(pathOf(fixture));
			const status = detailOf(page, "สถานะ");
			const label = status.getByText(words, { exact: true });
			await expect(status, `${words}: in words`).toHaveText(words);
			await expect(status.getByTestId("status-dot"), `${words}: after a dot`).toHaveCount(1);
			await expect(label, `${words}: its fill`).toHaveCSS(
				"background-color",
				await tokenColor(page, fill),
			);
			await expect(label, `${words}: its words`).toHaveCSS("color", await tokenColor(page, colour));
			await expect(fieldParts(page).card, `${words}: the card over the field's edge`).toBeVisible();
		}

		// No type and no date: no card; the field is as high as the header, and the details follow it
		// (Product Owner, #316 comment 6912742335).
		await page.goto(pathOf(bare));
		const parts = fieldParts(page);
		await expect(parts.card, "no card").toHaveCount(0);
		const details = page.getByRole("main").getByText(DETAILS_TEXT, { exact: true });
		for (const width of [375, 639, 640, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const label = `${bare.title} at ${width} px`;
			const edge = await fieldEdge(parts.field, label);
			const title = await boxOf(parts.title, `${label}: the title`);
			expect(
				{
					fieldUnderHeader: Math.round(edge - title.y - title.height),
					detailsUnderField: Math.round((await boxOf(details, `${label}: the details`)).y - edge),
				},
				`${label}: the field and the details without a card`,
			).toEqual({
				fieldUnderHeader: width < 640 ? 40 : 48,
				detailsUnderField: width < 1024 ? 32 : 40,
			});
		}
	});

	test("under the card the details follow 32 px below 1,024 px and 40 px from 1,024 px, then เอกสารที่เกี่ยวข้อง 32 px under them with the Homepage's section heading (the folder-open tile, the label เอกสารเผยแพร่ and the H2), its rows 24 px under the heading below 640 px and 28 px from 640 px and 14 px apart, each titled with an H3", async ({
		page,
	}) => {
		await page.goto(pathOf(full));
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const detailsStart = main.getByText(DETAILS_TEXT, { exact: true });
		const detailsEnd = main.getByText(DETAILS_END, { exact: true });
		const related = main.getByRole("region", { name: RELATED.title });
		const heading = related.getByRole("heading", { level: 2, name: RELATED.title });
		const label = related.getByText(RELATED.label, { exact: true });
		const tile = related.locator("svg.lucide-folder-open").locator("xpath=..");
		const rows = related.getByRole("article");
		await expect(rows, "a row for each attached Document").toHaveCount(2);
		await expect(
			rows.getByRole("heading", { level: 3 }),
			"each row's title an H3 under the section's H2",
		).toHaveCount(2);
		await expect(tile, "the folder-open tile is decorative").toHaveAttribute("aria-hidden", "true");
		await expect(label, "the label in brand-primary").toHaveCSS(
			"color",
			await tokenColor(page, "brand-primary"),
		);
		await expect(tile, "the tile's gradient, as a section heading on the page's colour").toHaveCSS(
			"background-image",
			/linear-gradient/,
		);
		for (const width of [320, 375, 639, 640, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const at = `at ${width} px`;
			const card = await boxOf(parts.card, `${at}: the card`);
			const start = await boxOf(detailsStart, `${at}: the details`);
			const end = await boxOf(detailsEnd, `${at}: the details' end`);
			const region = await boxOf(related, `${at}: เอกสารที่เกี่ยวข้อง`);
			const tileBox = await boxOf(tile, `${at}: the tile`);
			const headingBox = await boxOf(heading, `${at}: the H2`);
			const labelBox = await boxOf(label, `${at}: the label`);
			const first = await boxOf(rows.first(), `${at}: the first row`);
			const second = await boxOf(rows.nth(1), `${at}: the second row`);
			expect(
				{
					detailsUnderCard: Math.round(start.y - card.y - card.height),
					relatedUnderDetails: Math.round(region.y - end.y - end.height),
					labelAboveHeading: labelBox.y < headingBox.y,
					tileBeforeHeading: tileBox.x + tileBox.width <= headingBox.x,
					rowsUnderHeading: Math.round(
						first.y - Math.max(tileBox.y + tileBox.height, headingBox.y + headingBox.height),
					),
					rowsApart: Math.round(second.y - first.y - first.height),
				},
				`${at}: the details and เอกสารที่เกี่ยวข้อง`,
			).toEqual({
				detailsUnderCard: width < 1024 ? 32 : 40,
				relatedUnderDetails: 32,
				labelAboveHeading: true,
				tileBeforeHeading: true,
				rowsUnderHeading: width < 640 ? 24 : 28,
				rowsApart: 14,
			});
		}
	});

	test("with motion allowed the header rises in as the page opens and the card after it, while the breadcrumb, the details and the related Documents show at once; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
		page,
	}) => {
		const main = page.getByRole("main");
		const parts = fieldParts(page);
		const date = parts.field.getByText(/^เผยแพร่ /);
		const details = main.getByText(DETAILS_TEXT, { exact: true });
		const related = main.getByRole("region", { name: RELATED.title });
		const atOnce: Array<[string, Locator]> = [
			["the breadcrumb", parts.breadcrumb],
			["the details", details],
			["เอกสารที่เกี่ยวข้อง", related],
			["a related Document's row", related.getByRole("article").first()],
		];
		const placed: Array<[string, Locator]> = [
			["the field", parts.field],
			["the title", parts.title],
			["the card", parts.card],
			...atOnce,
		];
		const running = () => page.evaluate(() => document.getAnimations().length);
		const layouts = async () => {
			const read = [];
			for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
				await page.setViewportSize(viewport);
				await page.evaluate(() => window.scrollTo(0, 0));
				const places = [];
				for (const [name, part] of placed) places.push([name, await boxOf(part, name)]);
				read.push({
					height: await page.evaluate(() => document.documentElement.scrollHeight),
					places,
				});
			}
			return read;
		};

		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(pathOf(full));
		expect(await running(), "reduced: nothing is mid-animation").toBe(0);
		expect(await heldBack(main), "reduced: nothing waits for an effect").toEqual([]);
		const still = await layouts();

		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(pathOf(full), { waitUntil: "commit" });
		await expect(parts.title).toBeVisible();
		const headerEnters = await entersAfter(parts.title);
		expect(
			{
				title: headerEnters,
				date: await entersAfter(date),
				cardAfterHeader: (await entersAfter(parts.card)) > headerEnters,
			},
			"the header rises in as the page opens, the card after it",
		).toEqual({ title: 0, date: 0, cardAfterHeader: true });
		for (const [name, part] of atOnce) {
			expect(await entersAfter(part), `${name} shows at once`).toBe(-1);
		}
		await expect
			.poll(() => heldBack(main), { message: "the page shows whole after the entrance" })
			.toEqual([]);
		expect(await layouts(), "the page with motion, after its entrance").toEqual(still);

		await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
		await page.goto(pathOf(full));
		await expect(parts.title).toBeVisible();
		expect(await running(), "on paper: nothing is mid-animation").toBe(0);
		expect(await heldBack(main), "on paper: nothing waits for an effect").toEqual([]);
		await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
	});
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
	const link = await expectPreviewRenders(
		page,
		admin,
		"announcements",
		draft,
		`/announcements/${draft.slug}`,
	);

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

	testAccessibilityAndReflow("the Announcement pages", () => paths);
});

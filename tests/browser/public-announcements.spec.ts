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
	HOME_CRUMB,
	LIST_END,
	LeadingEntries,
	pressInside,
	SECTION_CRUMBS,
	boxOf,
	detailOf,
	expect,
	expectBreadcrumb,
	expectPreviewRenders,
	expectSiteNotFound,
	listedItem,
	listedTitles,
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

/** The fixed number of Announcements a list page shows. */
const PAGE_SIZE = 20;

/** The lead of /announcements, under its heading. */
const ANNOUNCEMENTS_LEAD = "ประกาศของสำนักงานสาธารณสุขอำเภอสองที่ประชาชนควรทราบหรือต้องดำเนินการ";
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
	rowsMove: true,
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
const in2031 = (month: number, day: number) =>
	`2031-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T03:00:00.000Z`;

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
	/** The row's white surface, which moves inside the row's place: its left edge and shadow. */
	const surfaceOf = async (row: Locator) => {
		const surface = row.getByTestId("announcement-surface");
		if ((await surface.count()) === 0) return undefined;
		return surface.evaluate((element) => ({
			x: Math.round(element.getBoundingClientRect().x),
			deepShadow: getComputedStyle(element).boxShadow.includes("0px 30px 60px -20px"),
		}));
	};
	/** Point at the row's left edge, where the moved row leaves a strip, once it has come in. */
	const pointAtEdge = async (row: Locator) => {
		await row.scrollIntoViewIfNeeded();
		await expect.poll(() => shownOpacity(row), { message: "the row has come in" }).toBe(1);
		const place = await boxOf(row, "the row's place");
		const edge = { x: place.x + 3, y: place.y + place.height / 2 };
		await page.mouse.move(edge.x, edge.y);
		// The move takes 0.3 s.
		await page.waitForTimeout(500);
		return { x: Math.round(place.x), edge };
	};

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
		stillSurface: { x: still.x, deepShadow: false },
		movedSurface: { x: moving.x + 10, deepShadow: true },
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
	// Its heading stays as it is until its own ticket (Feature 010 #316, #317).
	await expect(page.getByTestId("deep-field"), "no deep field under the heading").toHaveCount(0);
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

	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.news, ["ประกาศ", "/announcements"]],
		announcement.title,
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

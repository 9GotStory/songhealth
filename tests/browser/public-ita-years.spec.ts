// The ITA landing, a fiscal year's page and moving between them (#124; spec #121 "Public routes"
// and "Testing Decisions", ADR 0006).
//
// A citizen reaches ITA from the main navigation, where it is the last item and stays marked on
// every ITA page. /ita lists each fiscal year that has a published MOIT, newest first, with how
// many MOITs it has, or says that there is none yet. /ita/{fiscal-year} lists that year's
// published MOITs by number, each with its "MOIT n" badge, its title, how much Evidence it holds
// and "ปรับปรุงล่าสุด" when staff set it; a year without a published MOIT answers the site 404. A
// MOIT page leads to the MOITs before and after it in its own year only, a draft in preview to
// those around its number, and the breadcrumb steps down หน้าแรก › ITA › ปีงบประมาณ › MOIT; a
// draft previewed in a year without a published MOIT, whose year has no page, steps from ITA to
// the MOIT. Quick Access may lead to /ita.
//
// The suite drives the single development runtime over public HTTP through the public-page harness
// (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px widths).
// Fixtures are synthetic MOITs made through the native API, in fiscal years no real MOIT has and
// apart from the MOIT page suite's (public-ita.spec.ts), removed afterwards. The runtime may hold
// other MOITs (the demo dataset, the Product Owner's own), so the landing's assertions look only at
// the suite's own years. The test of the empty landing returns every published MOIT to draft
// (public.helpers.ts BorrowedEntries) and gives it back afterwards.

import type { Locator, Page } from "@playwright/test";

import {
	createSyntheticMoit,
	devAdminActor,
	fileBlock,
	linkBlock,
	listPublishedEntries,
	mintPreviewLink,
	nativeRefusalOf,
	publishEntryAt,
	removeSuiteFixtures,
	requirementBlock,
	unpublishEntry,
	uploadSyntheticPdf,
	withHomepageMenus,
	type CmsActor,
	type DraftFields,
	type MoitFixture,
} from "./cms.helpers";
import {
	BorrowedEntries,
	DESKTOP_VIEWPORT,
	HOME_CRUMB,
	FIELD_EDGE,
	HOMEPAGE_HEADINGS,
	LIST_FIELD_LOOK,
	SECTION_CRUMBS,
	boxOf,
	entersAfter,
	expect,
	expectBreadcrumb,
	expectListMovesOnlyWhenAllowed,
	expectNoHorizontalScroll,
	expectSiteNotFound,
	expectStartsOverFieldEdge,
	fieldEdge,
	homepageSection,
	itemsPerRow,
	listHeading,
	listedItem,
	listedTitles,
	pressInside,
	readListField,
	ringsOverFieldUnbanded,
	shownOpacity,
	shownWhole,
	siteTitleParts,
	test,
	testAccessibilityAndReflow,
	testHeadingOnField,
	thaiDate,
	tokenColor,
	tokenShadow,
	whileNonePublished,
	type ListHeadingText,
} from "./public.helpers";

/** The fiscal years of the suite's MOITs, which no real MOIT has. */
const NEWER = 2403;
const OLDER = 2402;
/** A year whose only MOIT is a draft. */
const DRAFTS_ONLY = 2404;
/** A year without any MOIT. */
const NO_MOIT = 2405;
/** The first of the four years the landing's layout is read with, one MOIT each. */
const BY_COUNT = 2408;

/** The ITA landing's heading. */
const LANDING_HEADING = "การประเมินคุณธรรมและความโปร่งใส (ITA)";

/** The ITA landing's heading on the deep field (#393; spec #392 "The ITA landing"). */
const LANDING: ListHeadingText = {
	label: "ITA",
	title: LANDING_HEADING,
	lead: "การประเมินคุณธรรมและความโปร่งใส (MOPH ITA) คือการประเมินสำนักงานสาธารณสุขอำเภอสองที่กระทรวงสาธารณสุขจัดทุกปี เว็บไซต์นี้เผยแพร่หลักฐานการประเมินของแต่ละปีงบประมาณ",
};

/** 23 Sep 2026 17:30 UTC is already 24 Sep in Bangkok. */
const UPDATED_ON = "2026-09-23T17:30:00.000Z";

let admin: CmsActor;
let origin: string;
/** The runtime's own published MOITs the empty-landing test returns to draft. */
const borrowed = new BorrowedEntries();

/** NEWER's published MOITs 1, 3 and 5, its draft MOIT 2, OLDER's one MOIT, and DRAFTS_ONLY's. */
let first: MoitFixture;
let third: MoitFixture;
let fifth: MoitFixture;
let draft: MoitFixture;
let older: MoitFixture;
let draftsOnly: MoitFixture;

/** A synthetic MOIT draft of `year`, numbered `number`, with `evidence` as its blocks. */
const createMoit = (
	label: string,
	year: number,
	number: number,
	evidence: Record<string, unknown>[] = [],
	fields?: DraftFields,
) => createSyntheticMoit(admin, label, { year, number, evidence }, fields);

/** The ITA landing's card for fiscal year `year`. */
function yearCard(page: Page, year: number) {
	return page
		.getByRole("main")
		.getByRole("link", { name: new RegExp(`^ปีงบประมาณ\\s*${year}\\b`) });
}

/** The list of year cards on the ITA landing. */
function yearCards(page: Page) {
	return page
		.getByRole("main")
		.getByRole("list")
		.filter({ has: page.getByRole("link", { name: /^ปีงบประมาณ/ }) });
}

/** The parts of a year card, `card` its link (spec #392 "The ITA landing"). */
function yearCardParts(card: Locator) {
	return {
		tile: card.locator("svg.lucide-calendar-check").locator("xpath=.."),
		year: card.getByRole("heading", { level: 2 }),
		count: card.getByText(/^ตัวชี้วัด \d+ รายการ$/),
		arrow: card.locator("svg.lucide-arrow-right"),
	};
}

/**
 * How a year card, `card` its link, looks as the page is laid out now: its surface, its tile, its
 * lines, its arrow and its circle, each "missing" where the card has none. `gradient` is the tile's
 * two colours. Measures in px.
 */
function readYearCard(card: Locator, gradient: [from: string, to: string]) {
	return card.evaluate((link, [from, to]) => {
		const own = link.getBoundingClientRect();
		const style = getComputedStyle(link);
		const padding = Number.parseFloat(style.paddingTop);
		const leaf = (pattern: RegExp) =>
			[...link.querySelectorAll("*")].find(
				(element) =>
					element.children.length === 0 && pattern.test(element.textContent?.trim() ?? ""),
			);
		const text = (element: Element | null | undefined) => {
			if (!element) return "missing";
			const read = getComputedStyle(element);
			return {
				size: Number.parseFloat(read.fontSize),
				weight: read.fontWeight,
				colour: read.color,
			};
		};
		const size = (element: Element) => {
			const box = element.getBoundingClientRect();
			return [Math.round(box.width), Math.round(box.height)];
		};
		const icon = link.querySelector("svg.lucide-calendar-check");
		const tile = icon?.parentElement;
		const eyebrow = leaf(/^ปีงบประมาณ$/);
		const year = link.querySelector("h2");
		const count = leaf(/^ตัวชี้วัด \d+ รายการ$/);
		const arrow = link.querySelector("svg.lucide-arrow-right");
		const circle = link.querySelector('[data-testid="year-circle"]');
		const box = (element: Element) => element.getBoundingClientRect();
		const { color: eyebrowColour, fontSize: eyebrowSize } = eyebrow
			? getComputedStyle(eyebrow)
			: { color: "missing", fontSize: "0" };
		return {
			card: {
				fill: style.backgroundColor,
				shadow: style.boxShadow,
				radius: style.borderTopLeftRadius,
				padding: style.paddingTop,
			},
			tile:
				tile && icon
					? {
							hidden: tile.getAttribute("aria-hidden"),
							size: size(tile),
							radius: getComputedStyle(tile).borderTopLeftRadius,
							gradient: [
								getComputedStyle(tile).backgroundImage.startsWith("linear-gradient"),
								getComputedStyle(tile).backgroundImage.includes(from),
								getComputedStyle(tile).backgroundImage.includes(to),
							],
							shadow: getComputedStyle(tile).boxShadow,
							icon: { size: size(icon), colour: getComputedStyle(icon).color },
							atCardStart:
								Math.abs(box(tile).left - own.left - padding) < 1 &&
								Math.abs(box(tile).top - own.top - padding) < 1,
						}
					: "missing",
			eyebrow: eyebrow
				? {
						text: eyebrow.textContent?.trim(),
						size: Number.parseFloat(eyebrowSize),
						colour: eyebrowColour,
					}
				: "missing",
			year:
				year && eyebrow
					? {
							size: Number.parseFloat(getComputedStyle(year).fontSize),
							colour: getComputedStyle(year).color,
							underEyebrow: Math.abs(box(year).top - box(eyebrow).bottom) < 1,
						}
					: "missing",
			count: text(count),
			arrow:
				arrow && count
					? {
							size: size(arrow),
							colour: getComputedStyle(arrow).color,
							besideCount:
								box(arrow).left >= box(count).right &&
								box(arrow).top < box(count).bottom &&
								box(arrow).bottom > box(count).top,
							atRowEnd: Math.abs(box(arrow).right - (own.right - padding)) < 1,
						}
					: "missing",
			gaps:
				tile && eyebrow && year && count
					? {
							tileToEyebrow: Math.round(box(eyebrow).top - box(tile).bottom),
							yearToCount: Math.round(box(count).top - box(year).bottom),
						}
					: "missing",
			circle: circle
				? {
						hidden: circle.getAttribute("aria-hidden"),
						size: size(circle),
						fill: getComputedStyle(circle).backgroundColor,
						cutByCorner:
							box(circle).right > own.right &&
							box(circle).bottom > own.bottom &&
							box(circle).left < own.right &&
							box(circle).top < own.bottom,
					}
				: "missing",
		};
	}, gradient);
}

/** The suite's own fiscal years among those the ITA landing lists, in order. */
async function ownListedYears(page: Page): Promise<number[]> {
	const cards = await page
		.getByRole("main")
		.getByRole("link", { name: /^ปีงบประมาณ/ })
		.allInnerTexts();
	return cards
		.map((card) => Number(/\d+/.exec(card)?.[0]))
		.filter((year) => [NEWER, OLDER, DRAFTS_ONLY, NO_MOIT].includes(year));
}

/** The main navigation's ITA item. */
const itaItem = (page: Page) =>
	page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "ITA" });

/**
 * Fail unless the MOIT page open in `page` leads to `previous` and `next`, or has no such link
 * where there is none.
 */
async function expectNeighbours(
	page: Page,
	previous: MoitFixture | undefined,
	next: MoitFixture | undefined,
): Promise<void> {
	const neighbours = page.getByRole("navigation", { name: "ตัวชี้วัดอื่นในปีงบประมาณเดียวกัน" });
	for (const [label, moit] of [
		["ตัวชี้วัดก่อนหน้า", previous],
		["ตัวชี้วัดถัดไป", next],
	] as const) {
		const link = neighbours.getByRole("link", { name: new RegExp(`^${label}`) });
		if (moit === undefined) {
			await expect(link, `no ${label}`).toHaveCount(0);
		} else {
			await expect(link).toHaveAccessibleName(`${label} ${moit.heading}`);
			await expect(link).toHaveAttribute("href", `/ita/${moit.slug}`);
		}
	}
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
	const pdf = await uploadSyntheticPdf(admin);
	// Made and published out of number order, so the pages' order can only be the numbers'.
	fifth = await createMoit("fifth", NEWER, 5, [
		linkBlock("ข้อมูลจากเว็บไซต์กระทรวงสาธารณสุข", "https://www.moph.go.th/"),
	]);
	first = await createMoit("first", NEWER, 1);
	third = await createMoit(
		"third",
		NEWER,
		3,
		[
			requirementBlock("1", "ข้อกำหนดข้อแรก"),
			fileBlock("1.1 บันทึกข้อความเสนอ ผบห.", pdf),
			linkBlock("1.2 ข้อมูลการติดต่อหน่วยงาน", "/contact", { current: true }),
			requirementBlock("2", "ข้อกำหนดข้อที่สอง"),
			fileBlock("2.1 รายงานผลการดำเนินงาน", pdf, { round: "รอบ 12 เดือน" }),
		],
		{ data: { updated_on: UPDATED_ON } },
	);
	draft = await createMoit("draft", NEWER, 2);
	older = await createMoit("older", OLDER, 1);
	draftsOnly = await createMoit("drafts-only", DRAFTS_ONLY, 1);
	for (const moit of [fifth, first, third, older]) await publishEntryAt(admin, "moit", moit.id);
});

test.afterEach(() => borrowed.giveBack(admin));

test.afterAll(() => removeSuiteFixtures(admin));

test("the ITA landing lists each fiscal year that has a published MOIT once, newest first, with its MOIT count, and leaves out a year whose MOITs are drafts", async ({
	page,
}) => {
	const response = await page.goto("/ita");
	expect(response?.status(), "GET /ita").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(LANDING_HEADING);
	expect(await ownListedYears(page)).toEqual([NEWER, OLDER]);
	await expect(yearCard(page, NEWER)).toHaveAccessibleName(
		new RegExp(`^ปีงบประมาณ\\s*${NEWER}\\s*ตัวชี้วัด 3 รายการ$`),
	);
	await expect(yearCard(page, NEWER)).toHaveAttribute("href", `/ita/${NEWER}`);
	await expect(yearCard(page, OLDER)).toHaveAccessibleName(
		new RegExp(`^ปีงบประมาณ\\s*${OLDER}\\s*ตัวชี้วัด 1 รายการ$`),
	);
	await expect(yearCard(page, OLDER)).toHaveAttribute("href", `/ita/${OLDER}`);

	const { siteTitle, separator } = await siteTitleParts(admin);
	await expect(page).toHaveTitle(`${LANDING_HEADING}${separator}${siteTitle}`);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		/การประเมินคุณธรรมและความโปร่งใส/,
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/ita`);
});

testHeadingOnField({
	path: "/ita",
	crumbs: [HOME_CRUMB],
	heading: LANDING,
	current: "ITA",
	icon: "shield-check",
});

test("each fiscal year's card on the ITA landing is one link over the field's lower edge, named by its three lines with the year an H2, and opens the year's page from its tile, its lower corner and by Enter; the field a list's, its content ending 96 px above its edge below 640 px and 128 px from 640 px, the cards starting 64 and 88 px above it, each focus ring banded where it meets the field", async ({
	page,
}) => {
	await page.goto("/ita");
	const heading = listHeading(page, LANDING);
	const items = yearCards(page).getByRole("listitem");
	const seen: Record<string, unknown> = { cards: [] };
	const expected: Record<string, unknown> = {
		cards: (await ownListedYears(page)).map((year) => ({ year, links: 1, h2: String(year) })),
	};
	for (const item of await items.all()) {
		const links = item.getByRole("link");
		const year = Number(/\d+/.exec(await item.innerText())?.[0]);
		if (![NEWER, OLDER].includes(year)) continue;
		const h2 = links.getByRole("heading", { level: 2 });
		(seen.cards as unknown[]).push({
			year,
			links: await links.count(),
			h2: (await h2.count()) === 1 ? (await h2.textContent())?.trim() : "no H2",
		});
	}

	// A press on the tile a citizen points at, on the card's lower corner, and Enter.
	const opened: string[] = [];
	for (const how of ["the tile", "the lower corner", "Enter"] as const) {
		await page.goto("/ita");
		const card = yearCard(page, NEWER);
		const tile = yearCardParts(card).tile;
		if (how === "Enter") await card.press("Enter");
		else if (how === "the tile" && (await tile.count()) === 0) {
			opened.push(`${how}: no tile`);
			continue;
		} else {
			const box = await boxOf(how === "the tile" ? tile : card, how);
			const point =
				how === "the tile"
					? { x: box.x + box.width / 2, y: box.y + box.height / 2 }
					: { x: box.x + box.width - 12, y: box.y + box.height - 12 };
			await pressInside(page, card, point, how);
		}
		await page.waitForURL(`**/ita/${NEWER}`, { timeout: 5_000 }).catch(() => undefined);
		opened.push(`${how}: ${new URL(page.url()).pathname}`);
	}
	seen.opened = opened;
	expected.opened = ["the tile", "the lower corner", "Enter"].map((how) => `${how}: /ita/${NEWER}`);

	await page.goto("/ita");
	seen.field = await readListField(page);
	expected.field = LIST_FIELD_LOOK;
	const onField = (await heading.field.count()) === 1;
	const surfaceBase = await tokenColor(page, "surface-base");
	for (const width of [375, 639, 640, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		const reach = width < 640 ? FIELD_EDGE.phone : FIELD_EDGE.fromSm;
		const cards = yearCards(page);
		if (onField) {
			const edge = await fieldEdge(heading.field, `at ${width} px`);
			const lead = await boxOf(heading.lead, `the lead at ${width} px`);
			seen[width] = {
				contentEndsAbove: Math.round(edge - lead.y - lead.height),
				cardsStartAbove: Math.round(edge - (await boxOf(cards, `the cards at ${width} px`)).y),
				unbanded: await ringsOverFieldUnbanded(cards, heading.field, surfaceBase),
			};
		} else seen[width] = "no field";
		expected[width] = {
			contentEndsAbove: reach.room,
			cardsStartAbove: reach.overlap,
			unbanded: [],
		};
	}
	expect(seen, "the year cards over the field's edge").toEqual(expected);
});

test("a fiscal year's card on the ITA landing is white with the card shadow, radius 24 and 24 px of padding, 28 px from 640 px: a 52 px gradient tile with calendar-check in accent-warm, ปีงบประมาณ at label size in text-secondary over the year as an H2 at H2 size in text-primary, and the count at label size, semibold, in brand-primary with a 20 px arrow-right at the row's right end, 20 px apart, and a 160 px surface-soft circle cut by the lower right corner; under the pointer the deep shadow and the year in brand-primary, and with focus the lists' white band", async ({
	page,
}) => {
	await page.goto("/ita");
	const card = yearCard(page, NEWER);
	const parts = yearCardParts(card);
	const [surfaceBase, surfaceSoft, textPrimary, textSecondary, brandPrimary, brandDark] =
		await Promise.all(
			[
				"surface-base",
				"surface-soft",
				"text-primary",
				"text-secondary",
				"brand-primary",
				"brand-dark",
			].map((name) => tokenColor(page, name)),
		);
	const accentWarm = await tokenColor(page, "accent-warm");
	const [cardShadow, deepShadow, tileShadow] = await Promise.all(
		["card", "deep", "tile"].map((name) => tokenShadow(page, name)),
	);
	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};
	for (const width of [320, 639, 640, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		seen[width] = await readYearCard(card, [brandPrimary, brandDark]);
		expected[width] = {
			card: {
				fill: surfaceBase,
				shadow: cardShadow,
				radius: "24px",
				padding: width < 640 ? "24px" : "28px",
			},
			tile: {
				hidden: "true",
				size: [52, 52],
				radius: "16px",
				gradient: [true, true, true],
				shadow: tileShadow,
				icon: { size: [24, 24], colour: accentWarm },
				atCardStart: true,
			},
			eyebrow: { text: "ปีงบประมาณ", size: 14, colour: textSecondary },
			year: { size: 34, colour: textPrimary, underEyebrow: true },
			count: { size: 14, weight: "600", colour: brandPrimary },
			arrow: { size: [20, 20], colour: brandPrimary, besideCount: true, atRowEnd: true },
			gaps: { tileToEyebrow: 20, yearToCount: 20 },
			circle: { hidden: "true", size: [160, 160], fill: surfaceSoft, cutByCorner: true },
		};
	}

	await page.setViewportSize(DESKTOP_VIEWPORT);
	await card.hover();
	seen.hover = {
		shadow: await card.evaluate((element) => getComputedStyle(element).boxShadow),
		year:
			(await parts.year.count()) === 1
				? await parts.year.evaluate((element) => getComputedStyle(element).color)
				: "no H2",
	};
	expected.hover = { shadow: deepShadow, year: brandPrimary };
	await page.mouse.move(0, 0);
	await card.focus();
	seen.focus = await card.evaluate((element) => {
		const style = getComputedStyle(element);
		return { outline: style.outlineWidth, colour: style.outlineColor, band: style.boxShadow };
	});
	expected.focus = {
		outline: "3px",
		colour: brandPrimary,
		band: expect.stringMatching(new RegExp(`${RegExp.escape(surfaceBase)} 0px 0px 0px 7px`)),
	};
	expect(seen, "the year card's look").toEqual(expected);
});

test("the ITA landing lays its year cards one to a row at 320 and 639 px, two at 640 and 1,023 px and three at 1,024 and 1,440 px, with one year, with three and with four, each a column wide, 12 px apart below 640 px and 20 px from 640 px, the count holding its arrow beside it at 320 px, and nothing past the window", async ({
	page,
}) => {
	test.setTimeout(180_000);
	const years = [BY_COUNT, BY_COUNT + 1, BY_COUNT + 2, BY_COUNT + 3];
	const moits: MoitFixture[] = [];
	for (const year of years) moits.push(await createMoit(`count-${year}`, year, 1));
	const seen: Record<string, unknown> = {};
	const expected: Record<string, unknown> = {};
	await whileNonePublished(admin, "moit", async () => {
		const published: MoitFixture[] = [];
		try {
			for (const count of [1, 3, 4]) {
				for (const moit of moits.slice(published.length, count)) {
					await publishEntryAt(admin, "moit", moit.id);
					published.push(moit);
				}
				await page.goto("/ita");
				const items = yearCards(page).getByRole("listitem");
				await expect(items, `${count} years`).toHaveCount(count);
				for (const width of [320, 639, 640, 1023, 1024, 1440]) {
					await page.setViewportSize({ width, height: 900 });
					await expectNoHorizontalScroll(page, `/ita with ${count} years at ${width} px`);
					const perRow = width < 640 ? 1 : width < 1024 ? 2 : 3;
					const gap = width < 640 ? 12 : 20;
					const boxes = [];
					for (const item of await items.all()) boxes.push(await boxOf(item, "a year card"));
					const grid = await boxOf(yearCards(page), "the year cards");
					const column = (grid.width - (perRow - 1) * gap) / perRow;
					const read: Record<string, unknown> = {
						perRow: await itemsPerRow(items),
						// `|| 0` reads a rounded -0 as 0.
						widths: boxes.map((box) => Math.round(box.width - column) || 0),
					};
					const expectedAt: Record<string, unknown> = {
						perRow: Array.from({ length: Math.ceil(count / perRow) }, (_, row) =>
							Math.min(perRow, count - row * perRow),
						),
						widths: boxes.map(() => 0),
					};
					if (count > 1) {
						const [first, second] = boxes as [(typeof boxes)[0], (typeof boxes)[0]];
						read.gap =
							perRow === 1
								? Math.round(second.y - first.y - first.height)
								: Math.round(second.x - first.x - first.width);
						expectedAt.gap = gap;
					}
					if (count > perRow) {
						const below = boxes[perRow]!;
						read.down = Math.round(below.y - boxes[0]!.y - boxes[0]!.height);
						expectedAt.down = gap;
					}
					if (width === 320) {
						const parts = yearCardParts(items.first().getByRole("link"));
						if ((await parts.arrow.count()) === 1) {
							const [line, arrow, card] = await Promise.all([
								boxOf(parts.count, "the count"),
								boxOf(parts.arrow, "the arrow"),
								boxOf(items.first(), "the card"),
							]);
							read.arrow = {
								beside: arrow.x >= line.x + line.width,
								level: arrow.y < line.y + line.height && arrow.y + arrow.height > line.y,
								inside: arrow.x + arrow.width <= card.x + card.width,
							};
						} else read.arrow = "no arrow-right";
						expectedAt.arrow = { beside: true, level: true, inside: true };
					}
					seen[`${count} at ${width}`] = read;
					expected[`${count} at ${width}`] = expectedAt;
				}
			}
		} finally {
			for (const moit of published) {
				const unpublished = await unpublishEntry(admin, "moit", moit.id);
				expect
					.soft(unpublished.ok, `unpublish ${moit.slug}: ${nativeRefusalOf(unpublished)}`)
					.toBe(true);
			}
		}
	});
	expect(seen, "the year cards by count and width").toEqual(expected);
});

test("the ITA landing says that nothing is published yet while no MOIT is, in today's empty state over the field's lower edge, shown at once with motion allowed", async ({
	page,
}) => {
	for (const { id } of await listPublishedEntries(admin, "moit")) {
		await borrowed.borrow(admin, "moit", id);
	}
	const response = await page.goto("/ita");
	expect(response?.status(), "GET /ita").toBe(200);
	const main = page.getByRole("main");
	const message = main.getByText("ยังไม่มีข้อมูล ITA", { exact: true });
	await expect(message).toBeVisible();
	await expect(main.getByRole("link", { name: /^ปีงบประมาณ/ })).toHaveCount(0);
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/ita");
	expect(await entersAfter(message), "the empty state shows at once").toBe(-1);
	// The message's white card is the block that follows the heading.
	await expectStartsOverFieldEdge(page, message.locator("xpath=.."), "the message's card");
});

test("/ita moves only when motion is allowed: the heading and then the lead rise in as the page opens while the breadcrumb shows at once, each year card reveals as it comes into the window and shows whole while it holds the keyboard's focus, and nothing moves by itself for more than five seconds; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way", async ({
	page,
}) => {
	test.setTimeout(90_000);
	await expectListMovesOnlyWhenAllowed(page, "/ita", listHeading(page, LANDING), [], {
		grid: yearCards(page),
	});

	// A window shorter than the field puts the cards well below it as the page opens: just under a
	// 300 px window Chromium gives a card's view timeline no progress, and it shows whole.
	const short = { width: 1440, height: 200 };
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.setViewportSize(short);
	await page.goto("/ita");
	const items = yearCards(page).getByRole("listitem");
	for (const card of await items.all()) {
		expect((await boxOf(card, "a card")).y, "a card lies below the window").toBeGreaterThan(
			short.height,
		);
	}
	// The cards share a row, so each is read before any comes into the window.
	for (const card of await items.all()) {
		expect(await shownOpacity(card), "a card below the window waits").toBe(0);
	}
	for (const card of await items.all()) {
		await card.scrollIntoViewIfNeeded();
		await expect.poll(() => shownOpacity(card), { message: "a card in the window shows" }).toBe(1);
	}
	await page.goto("/ita");
	await items.last().getByRole("link").focus();
	await expect
		.poll(() => shownOpacity(items.last()), {
			message: "the last card, focused, shows whole",
			timeout: 3_000,
		})
		.toBe(1);
});

test.describe("/ita without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("/ita shows its heading with its label and its lead, and each year card whole", async ({
		page,
	}) => {
		await page.goto("/ita");
		const heading = listHeading(page, LANDING);
		const seen = {
			title: await shownWhole(heading.title),
			lead: await shownWhole(heading.lead),
			cards: [await shownWhole(yearCard(page, NEWER)), await shownWhole(yearCard(page, OLDER))],
			label: await shownWhole(heading.label),
		};
		expect(seen).toEqual({ title: true, lead: true, cards: [true, true], label: true });
	});
});

test("a fiscal year's page lists its published MOITs by number, each with its badge, title, Evidence count and last-updated date when set, and never a draft", async ({
	page,
}) => {
	const response = await page.goto(`/ita/${NEWER}`);
	expect(response?.status(), `GET /ita/${NEWER}`).toBe(200);
	const main = page.getByRole("main");
	const heading = `ITA ปีงบประมาณ พ.ศ. ${NEWER}`;
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(heading);
	expect(await listedTitles(page)).toEqual([first.heading, third.heading, fifth.heading]);
	await expect(main, "a draft never appears").not.toContainText(draft.title);

	for (const moit of [first, third, fifth]) {
		await expect(
			listedItem(page, moit.heading).getByRole("link", { name: moit.heading }),
		).toHaveAttribute("href", `/ita/${moit.slug}`);
	}
	await expect(listedItem(page, third.heading)).toContainText("หลักฐาน 3 รายการ");
	await expect(listedItem(page, third.heading)).toContainText(
		`ปรับปรุงล่าสุด ${thaiDate(UPDATED_ON)}`,
	);
	await expect(listedItem(page, first.heading)).toContainText("หลักฐาน 0 รายการ");
	await expect(listedItem(page, first.heading)).not.toContainText("ปรับปรุงล่าสุด");
	await expect(listedItem(page, fifth.heading)).toContainText("หลักฐาน 1 รายการ");

	const { siteTitle, separator } = await siteTitleParts(admin);
	await expect(page).toHaveTitle(`${heading}${separator}${siteTitle}`);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		new RegExp(`ตัวชี้วัด MOIT 3 รายการของปีงบประมาณ พ.ศ. ${NEWER}`),
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${origin}/ita/${NEWER}`,
	);
});

test("a fiscal year without a published MOIT answers the site 404, and its draft previewed leads back to ITA without the year", async ({
	page,
}) => {
	await expectSiteNotFound(page, `/ita/${DRAFTS_ONLY}`, "a year whose only MOIT is a draft");
	await expectSiteNotFound(page, `/ita/${NO_MOIT}`, "a year without MOITs");

	const preview = await page.goto((await mintPreviewLink(admin, "moit", draftsOnly.id)).toString());
	expect(preview?.status(), "the draft's preview renders").toBe(200);
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.ita], "MOIT 1");
});

test("a MOIT page leads to the MOITs before and after it in its fiscal year's number order, past a draft, never into another year, and to none past the year's ends, and a draft in preview to those around its number", async ({
	page,
}) => {
	await page.goto(`/ita/${third.slug}`);
	await expectNeighbours(page, first, fifth);
	await page.goto(`/ita/${first.slug}`);
	await expectNeighbours(page, undefined, third);
	await page.goto(`/ita/${fifth.slug}`);
	await expectNeighbours(page, third, undefined);
	await page.goto(`/ita/${older.slug}`);
	await expectNeighbours(page, undefined, undefined);

	const preview = await page.goto((await mintPreviewLink(admin, "moit", draft.id)).toString());
	expect(preview?.status(), "the draft's preview renders").toBe(200);
	await expectNeighbours(page, first, third);
	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.ita, [`ปีงบประมาณ ${NEWER}`, `/ita/${NEWER}`]],
		"MOIT 2",
	);
});

test("the main navigation ends with ITA and marks it on the landing, a year's page and a MOIT's, whose breadcrumb steps down หน้าแรก › ITA › ปีงบประมาณ › MOIT", async ({
	page,
}) => {
	await page.goto("/ita");
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link").last(),
	).toHaveAccessibleName("ITA");
	await expect(itaItem(page)).toHaveAttribute("aria-current", "page");
	await expectBreadcrumb(page, [HOME_CRUMB], "ITA");

	await page.goto(`/ita/${NEWER}`);
	await expect(itaItem(page)).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.ita], `ปีงบประมาณ ${NEWER}`);

	await page.goto(`/ita/${third.slug}`);
	await expect(itaItem(page)).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(
		page,
		[HOME_CRUMB, SECTION_CRUMBS.ita, [`ปีงบประมาณ ${NEWER}`, `/ita/${NEWER}`]],
		"MOIT 3",
	);
});

test("a Quick Access item that points to /ita shows on the Homepage and leads to the ITA landing", async ({
	page,
}) => {
	await withHomepageMenus(admin, { quickAccess: [{ label: "ITA", url: "/ita" }] }, async () => {
		await page.goto("/");
		const shortcut = homepageSection(page, HOMEPAGE_HEADINGS.quickAccess).getByRole("link", {
			name: "ITA",
		});
		await expect(shortcut).toHaveAttribute("href", "/ita");
		await shortcut.click();
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(LANDING_HEADING);
	});
});

testAccessibilityAndReflow("the ITA landing and a fiscal year's page", () => [
	"/ita",
	`/ita/${NEWER}`,
]);

// Diagnostic phases for the all-sections case distinguish fixture, rendering and accessibility
// time (#192 retro; Product Owner comment 6719407526). The normal timeout and cleanup remain.
//
// The Homepage's automatic sections (#64; spec #51 "Homepage (`04`, Figma order)", `04` §3, §7–§11
// and §17; docs/design/homepage-concept-v1.md).
//
// A citizen opening / sees, in the Figma order: the hero, with the office summary as its headline
// and the site search, the site title being the page's H1 out of sight (Feature 008 #241; spec
// #239 "Hero and Featured"; its own tests are in public-homepage-curation.spec.ts); the Leadership
// strip, the first three Leadership in Leadership order, after the Frequently Used Services
// (Feature 008 #243; spec #239 "Leadership strip"); the five newest published News, the first as a
// large card (Feature 008 #244; spec #239 "Latest News"); four current Announcements as dated rows
// in a band of their own, three below 640 px (Feature 008 #245; spec #239 "Current
// Announcements"); a chip for each Health Topic the Health Content list's filter offers and the
// latest 4 Health Content items as cards with their first Health Topic as a badge, and the Health
// Service Discovery band with the directory's counts and a form that submits an Area and a name to
// /health-services (Feature 008 #246; spec #239 "Health Information", "Health Service Discovery");
// the hero's search and that form showing a spinner after submit (spec #239 "Motion and
// loading"); the latest Activities by Activity date,
// 3 on a desktop and 4 on a phone, each with its picture or a visual fallback and "กิจกรรม • date";
// and the Contact Summary from Office Contact. On a phone the sections keep that order, and
// Activities and Quick Access show their cards two to a row (Feature 006 #146; spec
// #144 "Homepage (`04`)"); the Frequently Used Services go one to a row there (Feature 008 #242;
// public-homepage-curation). An optional section with nothing to show disappears. The hero and the
// Contact Summary always render, and the page answers with no content at all. Closed Announcements,
// drafts, unpublished and trashed entries never show. The curated sections between them have their
// own suite (public-homepage-curation.spec.ts); the tests here that look at the whole page set the
// Homepage menus they need and put back what the menus held.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic entries, terms and pictures made through the native API and
// removed afterwards. Office Contact and the site title and tagline are saved first and restored.
// The runtime may hold its own published content (the demo dataset, the Product Owner's own). The
// tests of empty sections return all of it to draft (public.helpers.ts BorrowedEntries) and give
// it back afterwards; the others look only at their own uniquely titled fixtures, which lead their
// section: News and Health Content are published last, and Activities and Announcements are dated
// from 2032 on. A suite's fixtures stay until it ends, so a later test dates its own after the
// earlier tests'.

import type { Locator, Page } from "@playwright/test";

import {
	cmsRequest,
	createOwnedTerm,
	createSyntheticPerson,
	createSyntheticDraft,
	createSyntheticHealthService,
	createSyntheticService,
	devAdminActor,
	listPublishedEntries,
	nativeDataOf,
	nativeRefusalOf,
	pickedMenuItem,
	publishEntryAt,
	removeSuiteFixtures,
	withOfficeContact,
	SYNTHETIC_FIXTURE_MARK,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPicture,
	visiblePublishedPersonnel,
	withHomepageMenus,
	writeSiteSettings,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	BorrowedEntries,
	DESKTOP_VIEWPORT,
	HOMEPAGE_HEADINGS,
	HOMEPAGE_HEADLINE,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	VIEWPORTS,
	boxOf,
	detailOf,
	expect,
	expectAccessibleAtEachWidth,
	expectFocusRingWhole,
	expectImageLoaded,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	expectVisuallyHidden,
	homepageSection,
	itemsPerRow,
	listedItem,
	listedTitles,
	ownTitles,
	siteTitleParts,
	test,
	thaiDate,
	tokenColor,
} from "./public.helpers";

/** The Homepage menus with nothing in them, so no curated section shows. */
const EMPTY_MENUS = { featured: [], services: [], quickAccess: [] };

/** The office summary: the Homepage's description and the hero's headline. */
const OFFICE_SUMMARY = HOMEPAGE_HEADLINE;

/** The Contact Summary's button to /contact. */
const CONTACT_PAGE_LINK = "ข้อมูลติดต่อทั้งหมด";

/** The collections whose latest content the Homepage shows by itself. */
const AUTOMATIC_COLLECTIONS = [
	"news",
	"announcements",
	"health_content",
	"health_services",
	"activities",
] as const;

type Collection = (typeof AUTOMATIC_COLLECTIONS)[number];

/** A close date long past, and one far ahead, on any calendar. */
const CLOSED_AT = "2026-01-31T10:00:00.000Z";
const CLOSES_LATER = "2034-12-31T10:00:00.000Z";
/** An open date far ahead, so the Announcement is not open yet. */
const OPENS_LATER = "2033-06-01T03:00:00.000Z";

let admin: CmsActor;
let origin: string;
/** The site title the settings name, the page's H1, which also heads the Contact Summary. */
let siteTitle: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];
/** The runtime's own published entries a test returned to draft; afterEach gives them back. */
const borrowed = new BorrowedEntries();

/** Thai names of each kind of content, for the fixtures' titles. */
const KIND: Record<Exclude<Collection, "health_services">, string> = {
	news: "ข่าว",
	announcements: "ประกาศ",
	health_content: "ความรู้สุขภาพ",
	activities: "กิจกรรม",
};

/** A synthetic draft of `collection`. Its title is unique, so the page shows it or does not. */
const create = (
	collection: Exclude<Collection, "health_services">,
	label: string,
	fields?: DraftFields,
) => createSyntheticDraft(admin, collection, KIND[collection], label, fields);

/** Publish a fixture now. */
async function publish(
	collection: Collection | "personnel",
	...fixtures: DraftFixture[]
): Promise<void> {
	for (const fixture of fixtures) await publishEntryAt(admin, collection, fixture.id);
}

/** A synthetic Health Topic, Area or News category, labelled like a real one. */
const createTerm = (taxonomy: string, label: string) =>
	createOwnedTerm(admin, taxonomy, label, ownedTerms);

/** Return the runtime's own publicly visible Personnel to draft, for the running test. */
async function borrowPersonnel(): Promise<void> {
	for (const id of await visiblePublishedPersonnel(admin)) {
		await borrowed.borrow(admin, "personnel", id);
	}
}

/** Return every published entry the Homepage shows by itself to draft, for the running test. */
async function borrowAllContent(): Promise<void> {
	await borrowPersonnel();
	for (const collection of AUTOMATIC_COLLECTIONS) {
		for (const { id } of await listPublishedEntries(admin, collection)) {
			await borrowed.borrow(admin, collection, id);
		}
	}
}

/** Run `body` with the site title and tagline set as given, then put back what was there. */
async function withSiteIdentity(
	identity: { title: string; tagline: string },
	body: () => Promise<void>,
): Promise<void> {
	const read = await cmsRequest(admin, "/_emdash/api/settings");
	expect(read.ok, `the native settings read: ${nativeRefusalOf(read)}`).toBe(true);
	const before = (nativeDataOf(read) ?? {}) as { title?: string; tagline?: string };
	try {
		const written = await writeSiteSettings(admin, identity);
		expect(written.ok, `the native settings write: ${nativeRefusalOf(written)}`).toBe(true);
		await body();
	} finally {
		// The native API cannot delete a title or tagline, only empty it, which the site shows the
		// same way as unset (src/lib/site-identity.ts).
		const restored = await writeSiteSettings(admin, {
			title: before.title ?? "",
			tagline: before.tagline ?? "",
		});
		expect(restored.ok, `restoring the site identity: ${nativeRefusalOf(restored)}`).toBe(true);
	}
}

/** The headings of the Homepage's sections, in order. */
function sectionHeadings(page: Page) {
	return page.getByRole("main").getByRole("heading", { level: 2 });
}

/** The Leadership strip. */
function leadershipStrip(page: Page) {
	return homepageSection(page, HOMEPAGE_HEADINGS.leadership);
}

/**
 * The space the Leadership strip's section keeps below the strip's white surface, the box that
 * holds its list, as the page is laid out now.
 */
async function spaceBelowStrip(page: Page): Promise<number> {
	const section = await boxOf(leadershipStrip(page), "the Leadership section");
	const surface = await boxOf(
		leadershipStrip(page).getByRole("list").locator("xpath=.."),
		"the strip's surface",
	);
	return section.y + section.height - (surface.y + surface.height);
}

/** The Contact Summary. */
function contactSection(page: Page) {
	return homepageSection(page, HOMEPAGE_HEADINGS.contact);
}

/** The Activities' section. */
function activitiesSection(page: Page) {
	return homepageSection(page, HOMEPAGE_HEADINGS.activities);
}

/** The Activities' tiles, in order: the newest first. */
function activityTiles(page: Page) {
	return activitiesSection(page).getByRole("article");
}

/** The current Announcements' section. */
function announcementsSection(page: Page) {
	return homepageSection(page, HOMEPAGE_HEADINGS.announcements);
}

/** The current Announcements' rows, in order. */
function announcementRows(page: Page) {
	return announcementsSection(page).getByRole("article");
}

/** The current Announcements' links, in order. */
function announcementLinks(page: Page) {
	return announcementRows(page).getByRole("link");
}

/** Health Information. */
function healthSection(page: Page) {
	return homepageSection(page, HOMEPAGE_HEADINGS.health);
}

/** The Health Service Discovery band's section. */
function discoverySection(page: Page) {
	return homepageSection(page, HOMEPAGE_HEADINGS.discovery);
}

/** The Health Service Discovery band's lead, under its heading. */
const DISCOVERY_LEAD = "เลือกตำบลหรือพิมพ์ชื่อ เพื่อดูข้อมูลติดต่อ เวลาเปิดบริการ และแผนที่";

/**
 * Whether `part` shows all of its text inside `within`: nothing of it is cut off, and its box lies
 * within the other's.
 */
async function clipsNothing(part: Locator, within: Locator): Promise<boolean> {
	const whole = await part.evaluate(
		(element) =>
			element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight,
	);
	const inner = await boxOf(part, "the part");
	const outer = await boxOf(within, "what holds it");
	return (
		whole &&
		inner.x >= outer.x &&
		inner.x + inner.width <= outer.x + outer.width &&
		inner.y >= outer.y &&
		inner.y + inner.height <= outer.y + outer.height
	);
}

/**
 * Move the pointer to just above the resting lower edge of `card`, whose `surface` then rises 6 px,
 * and press there. The card rises only where motion is allowed.
 */
async function expectRisesUnderPointer(page: Page, card: Locator, surface: Locator): Promise<void> {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await card.scrollIntoViewIfNeeded();
	const place = await boxOf(card, "the card's place");
	expect((await boxOf(surface, "the card's surface")).y, "the card at rest").toBeCloseTo(
		place.y,
		0,
	);
	const edge = { x: place.x + place.width / 2, y: place.y + place.height - 3 };
	await page.mouse.move(edge.x, edge.y);
	await expect
		.poll(async () => (await boxOf(surface, "the card's surface")).y, {
			message: "the card under the pointer has risen 6 px",
		})
		.toBeCloseTo(place.y - 6, 0);
	await page.mouse.click(edge.x, edge.y);
}

/** The Announcements section's lead, beside its heading. */
const ANNOUNCEMENTS_LEAD = "ข้อมูลที่อาจมีวันสิ้นสุดหรือการดำเนินการ";

/** The seed's Announcement categories with a colour of their own (seed/seed.json), by slug. */
const ANNOUNCEMENT_CATEGORIES = {
	procurement: "จัดซื้อจัดจ้าง",
	recruitment: "รับสมัครงาน",
} as const;

/** How many lines a title shows, and whether more of it lies below them. */
function shownLines(title: Locator): Promise<{ lines: number; clamped: boolean }> {
	return title.evaluate((heading) => ({
		lines: Math.round(
			heading.getBoundingClientRect().height / parseFloat(getComputedStyle(heading).lineHeight),
		),
		clamped: heading.scrollHeight > heading.clientHeight,
	}));
}

/** The Latest News' cards, in order: the large card, then the small ones. */
function newsCards(page: Page) {
	return homepageSection(page, HOMEPAGE_HEADINGS.news).getByRole("article");
}

/**
 * Whether the `cards` in each row reach both sides of `list` as the page is laid out now, so no
 * cell of the grid is empty. Cards whose tops lie within 1 px of each other share a row.
 */
async function rowsFill(cards: Locator, list: Locator): Promise<boolean> {
	const { x, width } = await boxOf(list, "the list of cards");
	const rows = await cards.evaluateAll((elements) => {
		const rows: Array<{ top: number; left: number; right: number }> = [];
		for (const element of elements) {
			const { top, left, right } = element.getBoundingClientRect();
			const row = rows.find((candidate) => Math.abs(candidate.top - top) < 1);
			if (!row) rows.push({ top, left, right });
			else
				Object.assign(row, { left: Math.min(row.left, left), right: Math.max(row.right, right) });
		}
		return rows;
	});
	return rows.every(
		({ left, right }) => Math.abs(left - x) <= 1 && Math.abs(right - (x + width)) <= 1,
	);
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
	({ siteTitle } = await siteTitleParts(admin));
});

// Giving back everything a test of an empty Homepage borrowed publishes some 60 entries one by one,
// which under a full run's load outlasts the test's own 30 seconds and leaves the rest as drafts
// (#244 retro). The hook has two minutes more.
test.afterEach(async ({}, testInfo) => {
	testInfo.setTimeout(testInfo.timeout + 120_000);
	await borrowed.giveBack(admin);
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

test("with no published content at all, the Homepage still answers with the hero and the Contact Summary only", async ({
	page,
}) => {
	await borrowAllContent();
	await withHomepageMenus(admin, EMPTY_MENUS, async () => {
		await withOfficeContact(admin, {}, {}, async () => {
			const response = await page.goto("/");
			expect(response?.status(), "GET / with no content").toBe(200);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
			await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
			await expect(page.getByRole("main").getByRole("search")).toBeVisible();
			await expect(sectionHeadings(page)).toHaveText([HOMEPAGE_HEADINGS.contact]);
			await expect(
				homepageSection(page, HOMEPAGE_HEADLINE).getByText(HOMEPAGE_HEADLINE, { exact: true }),
			).toBeVisible();

			const contact = contactSection(page);
			await expect(contact.getByText(OFFICE_SUMMARY)).toHaveCount(0);
			await expect(contact.getByRole("term")).toHaveCount(0);
			await expect(
				contact.getByRole("link", { name: CONTACT_PAGE_LINK, exact: true }),
			).toHaveAttribute("href", "/contact");

			await expectAccessibleAtEachWidth(page, "/ with no content");
			await page.setViewportSize(MOBILE_VIEWPORT);
			await expectNoHorizontalScroll(page, "/ with no content");
		});
	});
});

test("closed Announcements alone leave the Announcements section out, and a current one brings it back without Latest News as a surface-soft band with its own space, below the Leadership strip's", async ({
	page,
}) => {
	await borrowAllContent();
	await publish("personnel", await createSyntheticPerson(admin, "วันดี", { leadership_order: 1 }));
	const closed = await create("announcements", "closed-only", {
		data: { closes_at: CLOSED_AT },
	});
	await publish("announcements", closed);
	await page.goto("/");
	await expect(announcementsSection(page)).toHaveCount(0);
	await expect(page.getByRole("main")).not.toContainText(closed.title);

	const current = await create("announcements", "current-only", {
		data: { closes_at: CLOSES_LATER },
	});
	await publish("announcements", current);
	await page.goto("/");
	await expect(homepageSection(page, HOMEPAGE_HEADINGS.news)).toHaveCount(0);
	await expect(page.getByRole("main")).not.toContainText(closed.title);
	await expect(announcementLinks(page)).toHaveCount(1);
	await expect(announcementLinks(page)).toHaveAttribute("href", `/announcements/${current.slug}`);
	await expect(announcementLinks(page)).toHaveAccessibleName(current.title);
	// The section is a band in its own colour, so it has its space above and below inside it, and
	// the Leadership strip before it keeps its own space below.
	const announcements = announcementsSection(page);
	await expect(announcements).toHaveCSS("background-color", await tokenColor(page, "surface-soft"));
	for (const [width, space] of [
		[1440, 80],
		[768, 64],
		[375, 32],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		await expect(announcements, `the space above at ${width} px`).toHaveCSS(
			"padding-top",
			`${space}px`,
		);
		await expect(announcements, `the space below at ${width} px`).toHaveCSS(
			"padding-bottom",
			`${space}px`,
		);
		expect(await spaceBelowStrip(page), `the strip's space below at ${width} px`).toBe(space);
	}
});

test("with fewer than five News the large card and the others fill every row: one alone, two side by side, three with the large card across the row, four two by two, and one below another under 640 px, with no Announcements section", async ({
	page,
}) => {
	await borrowAllContent();
	const published: DraftFixture[] = [];
	const cards = newsCards(page);
	const list = homepageSection(page, HOMEPAGE_HEADINGS.news).getByRole("list");
	for (const [count, rows] of [
		[1, [1]],
		[2, [2]],
		[3, [1, 2]],
		[4, [2, 2]],
	] as const) {
		const next = await create("news", `fewer-than-five-${count}`);
		await publish("news", next);
		published.unshift(next);
		await page.goto("/");
		await expect(cards.getByRole("heading", { level: 3 }), `${count} News`).toHaveText(
			published.map(({ title }) => title),
		);
		/** The large card's height, which is its least height while it has the row to itself. */
		const largeHeight = async () => (await boxOf(cards.first(), "the large card")).height;
		for (const width of [1440, 768, 640]) {
			await page.setViewportSize({ width, height: 900 });
			expect(await itemsPerRow(cards), `${count} News in rows at ${width} px`).toEqual(rows);
			expect(await rowsFill(cards, list), `${count} News fill each row at ${width} px`).toBe(true);
			if (count === 1) expect(await largeHeight(), `one News at ${width} px`).toBe(380);
		}
		for (const width of [639, 375]) {
			await page.setViewportSize({ width, height: 900 });
			expect(await itemsPerRow(cards), `${count} News at ${width} px`).toEqual(
				published.map(() => 1),
			);
			expect(await rowsFill(cards, list), `${count} News fill each row at ${width} px`).toBe(true);
			if (count === 1) expect(await largeHeight(), `one News at ${width} px`).toBe(300);
		}
		await page.setViewportSize(DESKTOP_VIEWPORT);
	}
	// The large card without a picture shows its visual, and the title stays in sight on it.
	await expect(cards.first().getByTestId("news-visual")).toBeVisible();
	await expect(cards.first().getByRole("heading", { level: 3 })).toBeVisible();
	await expect(announcementsSection(page)).toHaveCount(0);
	// With no Announcements section, Latest News keeps its space before Health Information.
	for (const [width, space] of [
		[1440, "80px"],
		[768, "64px"],
		[375, "32px"],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		await expect(
			homepageSection(page, HOMEPAGE_HEADINGS.news),
			`the News section's space below at ${width} px`,
		).toHaveCSS("padding-bottom", space);
	}
	await page.setViewportSize(DESKTOP_VIEWPORT);
	// The visual's tile lies in front of the gradient and is decoration: a press on it opens the
	// News.
	await cards.first().scrollIntoViewIfNeeded();
	const tile = await boxOf(
		cards.first().getByTestId("news-visual").locator("span"),
		"the visual's tile",
	);
	await page.mouse.click(tile.x + tile.width / 2, tile.y + tile.height / 2);
	await expect(page).toHaveURL(`/news/${published[0]!.slug}`);
});

test("the page's H1 is the site title from the site settings, and the hero shows neither it nor the tagline", async ({
	page,
}) => {
	const marker = crypto.randomUUID().slice(0, 8);
	const title = `${SYNTHETIC_FIXTURE_MARK} ชื่อเว็บไซต์ ${marker}`;
	const tagline = `${SYNTHETIC_FIXTURE_MARK} คำโปรย ${marker}`;
	await withHomepageMenus(admin, { featured: [] }, async () => {
		await withSiteIdentity({ title, tagline }, async () => {
			await page.goto("/");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/`);
			await expect(page.locator('meta[name="description"]')).toHaveAttribute(
				"content",
				OFFICE_SUMMARY,
			);
			await expectVisuallyHidden(page.getByRole("heading", { level: 1 }), "the site title");
			await expect(homepageSection(page, HOMEPAGE_HEADLINE)).not.toContainText(tagline);
		});
	});
});

test("the Leadership strip shows the first three Leadership in Leadership order with ties by name, each by shown name and current assignment, the first ringed in accent-warm, and links to the Leadership page alone", async ({
	page,
}) => {
	await borrowPersonnel();
	const run = crypto.randomUUID().slice(0, 6);
	const marked = (words: string) => `${SYNTHETIC_FIXTURE_MARK} ${words} ${run}`;
	const position = marked("สาธารณสุขอำเภอ");
	const unit = marked("หน่วยบริหาร");
	const contact = marked("โทร 000-000-0000");
	const chief = await createSyntheticPerson(admin, "สมหญิง", {
		prefix: "นาง",
		profile_image: {
			id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพผู้บริหาร`),
		},
		current_assignment: position,
		organizational_unit: unit,
		public_contact: contact,
		leadership_order: 1,
	});
	const khwan = await createSyntheticPerson(admin, "ขวัญ", { leadership_order: 2 });
	const ked = await createSyntheticPerson(admin, "เกด", { leadership_order: 2 });
	const fourth = await createSyntheticPerson(admin, "กมล", { leadership_order: 3 });
	const staff = await createSyntheticPerson(admin, "อรุณ");
	const hidden = await createSyntheticPerson(admin, "ซ่อน", {
		public_visible: false,
		leadership_order: 1,
	});
	// Published in an order the Leadership order must overturn.
	await publish("personnel", fourth, khwan, staff, hidden, chief, ked);
	// A published News, so the News section follows the strip whatever the runtime holds.
	await publish("news", await create("news", "after-leadership"));

	await page.goto("/");
	const strip = leadershipStrip(page);
	const people = strip.getByRole("listitem");
	await expect(
		strip.getByRole("heading", { level: 3 }),
		"the first three by Leadership order, เกด before ขวัญ at the same order",
	).toHaveText([chief.title, ked.title, khwan.title]);
	await expect(people).toHaveCount(3);
	for (const absent of [fourth, staff, hidden]) {
		await expect(strip, `no place for ${absent.displayName}`).not.toContainText(absent.displayName);
	}

	const first = people.first();
	await expect(first, "the current assignment").toContainText(position);
	await expect(strip, "no unit").not.toContainText(unit);
	await expect(strip, "no public contact").not.toContainText(contact);
	await expectImageLoaded(first.locator("img"), "the first person's picture");
	const plain = people.nth(1);
	await expect(plain.locator("img"), "no picture without an image").toHaveCount(0);
	await expect(plain.getByTestId("person-visual"), "the plain visual").toHaveCount(1);
	const ringOf = (person: typeof first) =>
		person.getByTestId("person-picture").evaluate((frame) => getComputedStyle(frame).boxShadow);
	const accentWarm = await tokenColor(page, "accent-warm");
	expect(await ringOf(first), "the first person's ring").toContain(accentWarm);
	expect(await ringOf(plain), "the second person's ring").not.toContain(accentWarm);

	const links = strip.getByRole("link");
	await expect(links, "no person is a link").toHaveCount(1);
	await expect(links).toHaveAccessibleName(`ดู${HOMEPAGE_HEADINGS.leadership}ทั้งหมด`);
	await expect(links).toHaveAttribute("href", "/about/leadership");
	await expect(links.getByText("ทั้งหมด", { exact: true })).toBeVisible();

	// One row with the heading at the left from 1,024 px, under its label; the heading above, the
	// first person across the row and the others sharing the next from 640 px, with the larger
	// picture; everyone stacked below.
	const heading = strip.getByRole("heading", { level: 2 });
	const label = strip.getByText("บุคลากร", { exact: true });
	for (const [width, rows, beside] of [
		[639, [1, 1, 1], false],
		[640, [1, 2], false],
		[1023, [1, 2], false],
		[1024, [3], true],
		[1440, [3], true],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		expect(await itemsPerRow(people), `the people's rows at ${width} px`).toEqual(rows);
		const title = await boxOf(heading, `the heading at ${width} px`);
		const person = await boxOf(first, `the first person at ${width} px`);
		const picture = await boxOf(first.locator("img"), `the first picture at ${width} px`);
		expect(picture.width, `the picture's width at ${width} px`).toBe(width < 640 ? 60 : 76);
		await expect(label, `the heading's label at ${width} px`).toBeVisible({ visible: beside });
		if (beside) {
			expect(title.x + title.width, `the heading at the left at ${width} px`).toBeLessThanOrEqual(
				person.x,
			);
			expect(title.y, `the heading in the people's row at ${width} px`).toBeLessThan(
				person.y + person.height,
			);
			expect(title.y + title.height).toBeGreaterThan(person.y);
		} else {
			expect(title.y + title.height, `the heading above at ${width} px`).toBeLessThanOrEqual(
				person.y,
			);
		}
		expect(
			await spaceBelowStrip(page),
			`the News section's space follows the strip at ${width} px`,
		).toBe(0);
	}
	await expectAccessibleAtEachWidth(page, "/ with three Leadership");
	await page.setViewportSize(MOBILE_VIEWPORT);
	await expectNoHorizontalScroll(page, "/ with three Leadership");
});

test("two Leadership divide the strip's row between them and one takes it whole, the strip keeps its own space below while the News section is left out, and with no Leadership the strip is left out", async ({
	page,
}) => {
	await borrowAllContent();
	const chief = await createSyntheticPerson(admin, "สมหญิง", { leadership_order: 1 });
	const deputy = await createSyntheticPerson(admin, "สมชาย", { leadership_order: 5 });
	await publish("personnel", deputy, chief, await createSyntheticPerson(admin, "อรุณ"));

	await page.goto("/");
	const people = leadershipStrip(page).getByRole("listitem");
	await expect(leadershipStrip(page).getByRole("heading", { level: 3 })).toHaveText([
		chief.title,
		deputy.title,
	]);
	for (const [width, rows] of [
		[1440, [2]],
		[768, [1, 1]],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		expect(await itemsPerRow(people), `the people's rows at ${width} px`).toEqual(rows);
		const [first, second] = [
			await boxOf(people.first(), "the first person"),
			await boxOf(people.last(), "the second person"),
		];
		expect(
			Math.abs(first.width - second.width),
			`the two take equal widths at ${width} px`,
		).toBeLessThanOrEqual(1);
	}
	// No News and no current Announcement is published, so the strip takes the News section's space.
	for (const [width, space] of [
		[1440, 80],
		[768, 64],
		[375, 32],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		expect(await spaceBelowStrip(page), `the strip's space below at ${width} px`).toBe(space);
	}

	const leave = async (person: DraftFixture) => {
		const unpublished = await unpublishEntry(admin, "personnel", person.id);
		expect(unpublished.ok, `unpublish ${person.slug}: ${nativeRefusalOf(unpublished)}`).toBe(true);
		await page.goto("/");
	};
	await leave(deputy);
	await expect(people).toHaveCount(1);
	for (const width of [1440, 768]) {
		await page.setViewportSize({ width, height: 900 });
		const alone = await boxOf(people, `the one person at ${width} px`);
		const list = await boxOf(leadershipStrip(page).getByRole("list"), "the people's row");
		expect(alone.width, `one person takes the row at ${width} px`).toBeCloseTo(list.width, 0);
	}

	// Staff without a Leadership order stay published: they make no Leadership.
	await leave(chief);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
	await expect(leadershipStrip(page), "no strip without Leadership").toHaveCount(0);
});

test("Latest News shows the five newest published News, newest first, each with its date and one link named by its title, a picture showing its middle or the visual in its place, and never a sixth, a draft, an unpublished or a trashed one", async ({
	page,
}) => {
	const pictured = async () => ({
		data: {
			featured_image: {
				id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพข่าว`),
			},
		},
	});
	const sixth = await create("news", "sixth");
	const fifth = await create("news", "fifth");
	const fourth = await create("news", "fourth");
	const third = await create("news", "third", await pictured());
	const second = await create("news", "second");
	const newest = await create("news", "newest", await pictured());
	const draft = await create("news", "draft");
	const unpublished = await create("news", "unpublished");
	const trashed = await create("news", "trashed");
	await publish("news", sixth, fifth, fourth, third, second, newest, unpublished, trashed);
	expect((await unpublishEntry(admin, "news", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "news", trashed.id)).ok, "trash").toBe(true);
	const today = thaiDate(new Date().toISOString());

	await page.goto("/");
	const news = homepageSection(page, HOMEPAGE_HEADINGS.news);
	const cards = newsCards(page);
	const shown = [newest, second, third, fourth, fifth];
	await expect(cards.getByRole("heading", { level: 3 })).toHaveText(
		shown.map(({ title }) => title),
	);
	for (const [index, item] of shown.entries()) {
		const card = cards.nth(index);
		await expect(card.locator("time"), item.title).toHaveText(today);
		await expect(card.getByRole("link"), item.title).toHaveCount(1);
		await expect(card.getByRole("link", { name: item.title, exact: true })).toHaveAttribute(
			"href",
			`/news/${item.slug}`,
		);
		const picture = card.locator("img");
		if (item === newest || item === third) {
			await picture.scrollIntoViewIfNeeded();
			await expectImageLoaded(picture, `the picture of ${item.title}`);
			// The picture covers its box from its middle, whatever its shape.
			expect(
				await picture.evaluate((element) => {
					const style = getComputedStyle(element);
					return [style.objectFit, style.objectPosition];
				}),
				`the crop of ${item.title}`,
			).toEqual(["cover", "50% 50%"]);
			if (item === third) {
				const box = await boxOf(picture, "a small card's picture");
				expect(box.width / box.height, "a small card's picture is 16:9").toBeCloseTo(16 / 9, 1);
			}
			await expect(card.getByTestId("news-visual"), item.title).toHaveCount(0);
		} else {
			await expect(picture, item.title).toHaveCount(0);
			await expect(card.getByTestId("news-visual"), item.title).toBeVisible();
		}
	}
	await expect(news.getByRole("link", { name: "ดูข่าวประชาสัมพันธ์ทั้งหมด" })).toHaveAttribute(
		"href",
		"/news",
	);
	for (const hidden of [sixth, draft, unpublished, trashed]) {
		await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
	}
});

test("from 1,024 px the large News card stands at the left beside the other four two by two, from 640 px it spans the row above them two to a row, below 640 px three compact rows follow it, and a small card keeps a long title to two lines", async ({
	page,
}) => {
	const long =
		"ซึ่งมีชื่อเรื่องยาวเกินกว่าสองบรรทัดของการ์ดใบเล็กในทุกความกว้างของหน้าจอ เพื่อดูว่าชื่อเรื่องถูกตัดให้เหลือสองบรรทัด";
	const items: DraftFixture[] = [];
	for (const label of ["layout-5", "layout-4", "layout-3", "layout-2", "layout-1"]) {
		const item = await createSyntheticDraft(admin, "news", `ข่าว ${long}`, label);
		await publish("news", item);
		items.unshift(item);
	}
	await page.goto("/");
	const cards = newsCards(page);
	const list = homepageSection(page, HOMEPAGE_HEADINGS.news).getByRole("list");
	await expect(cards.getByRole("heading", { level: 3 })).toHaveText(
		items.map(({ title }) => title),
	);
	const boxes = () =>
		cards.evaluateAll((elements) =>
			elements.map((element) => {
				const { left, top, right, bottom, width } = element.getBoundingClientRect();
				return { left, top, right, bottom, width, shown: width > 0 };
			}),
		);
	/** How many lines a card's title shows, and whether more of it lies below them. */
	const titleOf = (index: number) =>
		shownLines(cards.nth(index).getByRole("heading", { level: 3 }));

	for (const width of [1440, 1024]) {
		await page.setViewportSize({ width, height: 900 });
		const [large, ...small] = await boxes();
		const at = `at ${width} px`;
		expect(await itemsPerRow(cards), `the rows ${at}`).toEqual([3, 2]);
		expect(large!.right, `the large card is at the left ${at}`).toBeLessThan(small[0]!.left);
		expect(large!.top, `the large card starts with the first row ${at}`).toBeCloseTo(
			small[0]!.top,
			0,
		);
		expect(large!.bottom, `the large card ends with the second row ${at}`).toBeCloseTo(
			small[2]!.bottom,
			0,
		);
		expect(small[2]!.left, `the second row starts under the first ${at}`).toBeCloseTo(
			small[0]!.left,
			0,
		);
		expect(small[3]!.right, `the second row ends under the first ${at}`).toBeCloseTo(
			small[1]!.right,
			0,
		);
		expect(await titleOf(1), `a small card's title ${at}`).toEqual({ lines: 2, clamped: true });
		expect(await titleOf(0), `the large card's title ${at}`).toEqual({ lines: 3, clamped: true });
		expect(large!.bottom - large!.top, `the large card's height ${at}`).toBeGreaterThanOrEqual(520);
	}
	for (const width of [1023, 768, 640]) {
		await page.setViewportSize({ width, height: 900 });
		expect(await itemsPerRow(cards), `the rows at ${width} px`).toEqual([1, 2, 2]);
		expect(await rowsFill(cards, list), `each row is full at ${width} px`).toBe(true);
		expect(await titleOf(1), `a small card's title at ${width} px`).toEqual({
			lines: 2,
			clamped: true,
		});
		// From 640 px a small card's picture, or the visual in its place, is 16:9.
		const visual = await boxOf(cards.nth(1).getByTestId("news-visual"), "a small card's visual");
		expect(visual.width / visual.height, `the visual's shape at ${width} px`).toBeCloseTo(
			16 / 9,
			1,
		);
	}
	for (const width of [639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		const shown = (await boxes()).filter((box) => box.shown);
		expect(shown.length, `the large card and three rows at ${width} px`).toBe(4);
		await expect(cards.nth(4), `the fifth News at ${width} px`).toBeHidden();
		expect(await rowsFill(cards.locator("visible=true"), list), `rows at ${width} px`).toBe(true);
		// At 639 px the large card is wide enough for the whole title in three lines.
		if (width < 639) {
			expect(await titleOf(0), `the large card's title at ${width} px`).toEqual({
				lines: 3,
				clamped: true,
			});
		}
		for (const index of [1, 2, 3]) {
			// A compact row: a 120 px picture at 4:3 with the date and the title beside it.
			const visual = await boxOf(cards.nth(index).getByTestId("news-visual"), "a row's visual");
			const title = await boxOf(cards.nth(index).getByRole("heading", { level: 3 }), "its title");
			expect([visual.width, visual.height], `row ${index}'s visual at ${width} px`).toEqual([
				120, 90,
			]);
			expect(visual.x + visual.width, `row ${index}'s title beside it`).toBeLessThanOrEqual(
				title.x,
			);
			// "ความดันโลหิตสูง" is 107 px at body size, semibold (docs/design/DESIGN.md §7.3).
			expect(title.width, `row ${index}'s room for a title at ${width} px`).toBeGreaterThanOrEqual(
				107,
			);
			expect(await titleOf(index), `row ${index}'s title at ${width} px`).toEqual({
				lines: 2,
				clamped: true,
			});
		}
		await expectNoHorizontalScroll(page, `/ with five News at ${width} px`);
	}
});

test("under the pointer a small News card rises 6 px, and a press just above its resting lower edge still opens the News", async ({
	page,
}) => {
	const small = await create("news", "hover-small");
	await publish("news", small, await create("news", "hover-large"));
	await page.goto("/");
	const card = newsCards(page).nth(1);
	await expect(card.getByRole("heading", { level: 3 })).toHaveText(small.title);
	// The card's white surface, a box with no role of its own.
	await expectRisesUnderPointer(page, card, card.getByTestId("news-surface"));
	await expect(page).toHaveURL(`/news/${small.slug}`);
});

test("four current Announcements show as rows from 640 px and three below, newest first by announcement date, each with its date, the day large, its title as the row's one link and the status the list states after a dot, and never a fifth, a closed one or a draft", async ({
	page,
}) => {
	const at = (day: number) => `2032-01-${String(day).padStart(2, "0")}T03:00:00.000Z`;
	const fifth = await create("announcements", "fifth", { data: { announcement_at: at(1) } });
	const fourth = await create("announcements", "fourth", { data: { announcement_at: at(2) } });
	const third = await create("announcements", "third", {
		data: { announcement_at: at(3), closes_at: CLOSES_LATER },
	});
	const second = await create("announcements", "second", {
		data: { announcement_at: at(4), opens_at: OPENS_LATER, closes_at: CLOSES_LATER },
	});
	const first = await create("announcements", "first", { data: { announcement_at: at(5) } });
	// Announced last, but closed or a draft: neither shows.
	const closed = await create("announcements", "closed", {
		data: { announcement_at: at(6), closes_at: CLOSED_AT },
	});
	const draft = await create("announcements", "draft", { data: { announcement_at: at(7) } });
	await publish("announcements", first, closed, fifth, second, fourth, third);
	const shown = [first, second, third, fourth];

	await page.goto("/");
	const announcements = announcementsSection(page);
	// The heading's link to the list comes first, then each Announcement's own.
	const sectionLinks = announcements.getByRole("link");
	await expect(sectionLinks.first()).toHaveAccessibleName("ดูประกาศทั้งหมด");
	await expect(sectionLinks.first()).toHaveAttribute("href", "/announcements");
	// After Latest News the band keeps its own space above, inside its colour.
	await expect(announcements).toHaveCSS("padding-top", "80px");
	for (const hidden of [fifth, closed, draft]) {
		await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
	}
	await expect(announcements.getByText(ANNOUNCEMENTS_LEAD, { exact: true })).toBeVisible();
	const rows = announcementRows(page);
	await expect(rows.getByRole("heading", { level: 3 })).toHaveText(shown.map(({ title }) => title));
	await expect(sectionLinks).toHaveCount(1 + shown.length);
	for (const [index, announcement] of shown.entries()) {
		const row = rows.nth(index);
		await expect(row.getByRole("link")).toHaveAccessibleName(announcement.title);
		await expect(row.getByRole("link")).toHaveAttribute(
			"href",
			`/announcements/${announcement.slug}`,
		);
		// The date tile: the day large, the month and the year under it.
		const date = row.locator("time").first();
		await expect(date).toHaveText(thaiDate(at(5 - index)));
		await expect(date).toHaveAttribute("datetime", at(5 - index));
		const [day, monthAndYear] = await date.locator("span").evaluateAll((parts) =>
			parts.map((part) => ({
				text: part.textContent,
				size: parseFloat(getComputedStyle(part).fontSize),
				top: part.getBoundingClientRect().top,
			})),
		);
		expect(day!.text, `row ${index}'s day`).toBe(String(5 - index));
		expect(day!.size, `row ${index}'s day is the larger`).toBeGreaterThan(monthAndYear!.size);
		expect(day!.top, `row ${index}'s day is above the month`).toBeLessThan(monthAndYear!.top);
	}
	// Each states its status and dates as the Announcements list does, after a dot, so the status
	// is not told by colour alone; one without dates states none.
	for (const index of [0, 3]) {
		await expect(rows.nth(index)).not.toContainText(/ยังไม่เปิด|เปิดอยู่|วันที่/);
		await expect(rows.nth(index).getByTestId("status-dot")).toHaveCount(0);
	}
	await expect(rows.nth(1)).toContainText("ยังไม่เปิด");
	await expect(rows.nth(1)).toContainText(`วันที่เริ่มต้น ${thaiDate(OPENS_LATER)}`);
	await expect(rows.nth(1)).toContainText(`วันที่สิ้นสุด ${thaiDate(CLOSES_LATER)}`);
	await expect(rows.nth(2)).toContainText("เปิดอยู่");
	await expect(rows.nth(2)).toContainText(`วันที่สิ้นสุด ${thaiDate(CLOSES_LATER)}`);
	for (const [index, label, fill, text] of [
		[1, "ยังไม่เปิด", "accent-warm", "brand-dark"],
		[2, "เปิดอยู่", "brand-primary", "surface-base"],
	] as const) {
		const status = rows.nth(index).getByText(label, { exact: true });
		await expect(status.getByTestId("status-dot")).toBeVisible();
		await expect(status).toHaveCSS("background-color", await tokenColor(page, fill));
		await expect(status).toHaveCSS("color", await tokenColor(page, text));
	}

	// Four rows from 640 px, three below.
	for (const [width, count] of [
		[1024, 4],
		[640, 4],
		[639, 3],
		[375, 3],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		await expect(announcementLinks(page), `the rows at ${width} px`).toHaveCount(count);
		expect(await itemsPerRow(rows.locator("visible=true")), `one to a row at ${width} px`).toEqual(
			shown.slice(0, count).map(() => 1),
		);
	}
	await expect(
		announcements.getByRole("article", { includeHidden: true }).nth(3),
		"the fourth Announcement below 640 px",
	).toBeHidden();
});

test("an Announcement's row shows its category as a badge: procurement in blue on topic-blue, recruitment in brand-dark on accent-warm, any other in brand-primary on surface-soft, and none without a category; a long title keeps to two lines", async ({
	page,
}) => {
	const long =
		"ซึ่งมีชื่อเรื่องยาวเกินกว่าสองบรรทัดของแถวประกาศในทุกความกว้างของหน้าจอ เพื่อดูว่าชื่อเรื่องถูกตัดให้เหลือสองบรรทัดและยังอ่านได้ครบถ้วนในหน้าประกาศเอง";
	// A category added later, and one that follows it in label order.
	const other = await createTerm("announcement_type", "ก รับฟังความคิดเห็น");
	const later = await createTerm("announcement_type", "ข แจ้งเตือน");
	const at = (day: number) => `2032-02-${String(day).padStart(2, "0")}T03:00:00.000Z`;
	const none = await create("announcements", "no-category", { data: { announcement_at: at(1) } });
	const added = await create("announcements", "added-category", {
		data: { announcement_at: at(2) },
		// Its first category shows, in the order EmDash gives them, by label.
		taxonomies: { announcement_type: [later.slug, other.slug] },
	});
	const recruitment = await createSyntheticDraft(admin, "announcements", `ประกาศ ${long}`, "long", {
		data: { announcement_at: at(3) },
		taxonomies: { announcement_type: ["recruitment"] },
	});
	const procurement = await create("announcements", "procurement", {
		data: { announcement_at: at(4) },
		taxonomies: { announcement_type: ["procurement"] },
	});
	await publish("announcements", none, added, recruitment, procurement);

	await page.goto("/");
	const rows = announcementRows(page);
	await expect(rows.getByRole("heading", { level: 3 })).toHaveText(
		[procurement, recruitment, added, none].map(({ title }) => title),
	);
	const labels = [ANNOUNCEMENT_CATEGORIES.procurement, ANNOUNCEMENT_CATEGORIES.recruitment];
	await expect(rows.nth(2), "the first category alone").not.toContainText(later.label);
	for (const label of [...labels, other.label]) {
		await expect(rows.nth(3), "a row without a category").not.toContainText(label);
	}
	for (const [index, label, text, fill] of [
		[2, other.label, "brand-primary", "surface-soft"],
		[1, ANNOUNCEMENT_CATEGORIES.recruitment, "brand-dark", "accent-warm"],
		[0, ANNOUNCEMENT_CATEGORIES.procurement, "procurement-text", "topic-blue"],
	] as const) {
		const badge = rows.nth(index).getByText(label, { exact: true });
		await expect(badge, label).toBeVisible();
		await expect(badge, label).toHaveCSS("color", await tokenColor(page, text));
		await expect(badge, label).toHaveCSS("background-color", await tokenColor(page, fill));
		if (index === 0) {
			// The procurement badge alone has an edge, a 1 px line inside it.
			const edge = await tokenColor(page, "procurement-border");
			await expect(badge, label).toHaveCSS("box-shadow", new RegExp(RegExp.escape(edge)));
		}
		// The category stays outside the link's name.
		await expect(rows.nth(index).getByRole("link")).toHaveAccessibleName(
			[procurement, recruitment, added][index]!.title,
		);
	}
	for (const width of [1440, 1024, 768, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		expect(
			await shownLines(rows.nth(1).getByRole("heading", { level: 3 })),
			`a long title at ${width} px`,
		).toEqual({ lines: 2, clamped: true });
		await expectNoHorizontalScroll(page, `/ with a long Announcement title at ${width} px`);
	}
});

test("from 1,024 px the Announcements' heading, lead and link to the list stay in view below the header while the rows scroll, and below 1,024 px they scroll with the page", async ({
	page,
}) => {
	for (const day of [1, 2, 3, 4]) {
		await publish(
			"announcements",
			await create("announcements", `in-view-${day}`, {
				data: {
					announcement_at: `2032-03-0${day}T03:00:00.000Z`,
					closes_at: CLOSES_LATER,
				},
			}),
		);
	}
	const announcements = announcementsSection(page);
	const parts = [
		announcements.getByRole("heading", { level: 2 }),
		announcements.getByText(ANNOUNCEMENTS_LEAD, { exact: true }),
		announcements.getByRole("link", { name: "ดูประกาศทั้งหมด" }),
	];
	/** Scroll until the rows' list starts 100 px above the window, with rows still to come. */
	const scrollIntoRows = async (width: number) => {
		await page.setViewportSize({ width, height: 600 });
		await page.goto("/");
		await expect(announcementRows(page)).toHaveCount(4);
		const list = await boxOf(announcements.getByRole("list"), "the rows' list");
		await page.evaluate((top) => window.scrollBy({ top, behavior: "instant" }), list.y + 100);
		const scrolled = await boxOf(announcements.getByRole("list"), "the rows' list");
		expect(scrolled.y, `the list starts above the window at ${width} px`).toBeCloseTo(-100, 0);
		return (await boxOf(page.getByRole("banner"), "the header")).height;
	};
	await scrollIntoRows(1023);
	for (const part of parts) await expect(part, "at 1,023 px").not.toBeInViewport();

	// The link is a solid brand-primary pill: under the lead from 1,024 px, at the heading's right
	// from 640 px, and a round 44 px button below 640 px (#245 comment 6812117246, item 2).
	const [heading, lead, link] = parts as [Locator, Locator, Locator];
	await expect(link).toHaveCSS("background-color", await tokenColor(page, "brand-primary"));
	await expect(link).toHaveCSS("color", await tokenColor(page, "surface-base"));
	for (const width of [1023, 640, 639, 375]) {
		await page.setViewportSize({ width, height: 900 });
		const [title, text, pill] = [
			await boxOf(heading, "the heading"),
			await boxOf(lead, "the lead"),
			await boxOf(link, "the link"),
		];
		const at = `at ${width} px`;
		expect(pill.x, `the link is at the heading's right ${at}`).toBeGreaterThan(
			title.x + title.width,
		);
		expect(pill.y + pill.height, `the lead is under the link ${at}`).toBeLessThanOrEqual(text.y);
		if (width < 640) {
			expect([pill.width, pill.height], `a round button ${at}`).toEqual([44, 44]);
			await expect(link.getByText("ทั้งหมด", { exact: true }), `no words ${at}`).toBeHidden();
		} else {
			await expect(link.getByText("ทั้งหมด", { exact: true }), `its words ${at}`).toBeVisible();
		}
	}
	for (const width of [1024, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		const text = await boxOf(lead, "the lead");
		const pill = await boxOf(link, "the link");
		expect(pill.y, `the link is under the lead at ${width} px`).toBeGreaterThanOrEqual(
			text.y + text.height,
		);
		expect(pill.x, `the link starts with the lead at ${width} px`).toBeCloseTo(text.x, 0);
	}
	for (const width of [1024, 1440]) {
		const headerHeight = await scrollIntoRows(width);
		for (const part of parts) {
			await expect(part, `in view at ${width} px`).toBeInViewport({ ratio: 1 });
			const box = await boxOf(part, "a part of the heading");
			expect(box.y, `below the header at ${width} px`).toBeGreaterThanOrEqual(headerHeight);
		}
	}
});

test("under the pointer an Announcement's row moves 10 px to the right, and a press on the strip it left still opens the Announcement", async ({
	page,
}) => {
	const announcement = await create("announcements", "hover", {
		data: { announcement_at: "2032-04-01T03:00:00.000Z" },
	});
	await publish("announcements", announcement);
	// The row moves only where motion is allowed.
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/");
	const row = announcementRows(page).first();
	await expect(row.getByRole("heading", { level: 3 })).toHaveText(announcement.title);
	// The row's white surface, a box with no role of its own.
	const surface = row.getByTestId("announcement-surface");
	await row.scrollIntoViewIfNeeded();
	const place = await boxOf(row, "the row's place");
	expect((await boxOf(surface, "the row's surface")).x, "the row at rest").toBeCloseTo(place.x, 0);
	const edge = { x: place.x + 3, y: place.y + place.height / 2 };
	await page.mouse.move(edge.x, edge.y);
	await expect
		.poll(async () => (await boxOf(surface, "the row's surface")).x, {
			message: "the row under the pointer has moved 10 px",
		})
		.toBeCloseTo(place.x + 10, 0);
	await page.mouse.click(edge.x, edge.y);
	await expect(page).toHaveURL(`/announcements/${announcement.slug}`);
});

test("Health Information shows the latest 4 published Health Content, each with its picture or the visual in its place, its first Health Topic as a badge, its title, its summary and อ่านต่อ, four to a row from 1,024 px and two from 640 px, and below 640 px as compact rows without the summary, the badge whole", async ({
	page,
}) => {
	const firstTopic = await createTerm("topic", "ก วัคซีนและการสร้างเสริมภูมิคุ้มกันโรค");
	const secondTopic = await createTerm("topic", "ข เบาหวาน");
	const oldest = await create("health_content", "oldest", {
		taxonomies: { topic: [secondTopic.slug] },
	});
	const fourth = await create("health_content", "fourth", {
		taxonomies: { topic: [secondTopic.slug] },
	});
	const third = await create("health_content", "third", {
		taxonomies: { topic: [firstTopic.slug] },
	});
	const untopical = await create("health_content", "no-topic");
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปความรู้ ${crypto.randomUUID().slice(0, 6)}`;
	const newest = await create("health_content", "newest", {
		data: {
			summary,
			featured_image: {
				id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพความรู้สุขภาพ`),
			},
		},
		taxonomies: { topic: [secondTopic.slug, firstTopic.slug] },
	});
	const draft = await create("health_content", "draft", {
		taxonomies: { topic: [firstTopic.slug] },
	});
	await publish("health_content", oldest, fourth, third, untopical, newest);

	await page.goto("/");
	const health = healthSection(page);
	const cards = health.getByRole("article");
	await expect(cards.getByRole("heading", { level: 3 })).toHaveText([
		newest.title,
		untopical.title,
		third.title,
		fourth.title,
	]);
	const card = (fixture: DraftFixture) => cards.filter({ hasText: fixture.title });
	const badge = card(newest).getByText(firstTopic.label, { exact: true });
	await expect(badge).toBeVisible();
	await expect(card(newest)).not.toContainText(secondTopic.label);
	await expect(card(newest).getByText(summary, { exact: true })).toBeVisible();
	for (const topic of [firstTopic, secondTopic]) {
		await expect(card(untopical)).not.toContainText(topic.label);
	}
	await expect(card(third).getByText(firstTopic.label, { exact: true })).toBeVisible();
	for (const fixture of [newest, untopical, third, fourth]) {
		await expect(card(fixture).getByRole("link")).toHaveAccessibleName(fixture.title);
		await expect(card(fixture).getByRole("link")).toHaveAttribute(
			"href",
			`/health/content/${fixture.slug}`,
		);
		await expect(card(fixture).getByText("อ่านต่อ", { exact: true })).toBeVisible();
	}
	await card(newest).scrollIntoViewIfNeeded();
	await expectImageLoaded(card(newest).locator("img"), "the newest Health Content's picture");
	await expect(card(newest).getByTestId("health-visual")).toHaveCount(0);
	await expect(card(untopical).locator("img")).toHaveCount(0);
	await expect(card(untopical).getByTestId("health-visual")).toBeVisible();
	await expect(health.getByRole("link", { name: "ดูความรู้สุขภาพทั้งหมด" })).toHaveAttribute(
		"href",
		"/health/content",
	);
	for (const hidden of [oldest, draft]) {
		await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
	}

	for (const [width, rows] of [
		[1440, [4]],
		[1024, [4]],
		[1023, [2, 2]],
		[640, [2, 2]],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		expect(await itemsPerRow(cards), `the cards in rows at ${width} px`).toEqual(rows);
		await expect(badge, `the badge at ${width} px`).toBeVisible();
		expect(await clipsNothing(badge, card(newest)), `the badge is whole at ${width} px`).toBe(true);
	}
	for (const width of [639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		expect(await itemsPerRow(cards), `the rows at ${width} px`).toEqual([1, 1, 1, 1]);
		await expect(card(newest).getByText(summary), `the summary at ${width} px`).toBeHidden();
		await expect(
			card(newest).getByText("อ่านต่อ", { exact: true }),
			`อ่านต่อ at ${width} px`,
		).toBeHidden();
		await expect(badge, `the badge at ${width} px`).toBeVisible();
		expect(await clipsNothing(badge, card(newest)), `the badge is whole at ${width} px`).toBe(true);
		// The picture stands at the left of the title.
		const picture = await boxOf(card(newest).locator("img"), "the row's picture");
		const title = await boxOf(card(newest).getByRole("heading"), "the row's title");
		expect(picture.x + picture.width, `the picture left of the title at ${width} px`).toBeLessThan(
			title.x,
		);
	}
	await expectNoHorizontalScroll(page, "/ with a long Health Topic at 320 px");
});

test("a chip shows for each Health Topic the Health Content list's filter offers, in the filter's order, and each opens the list narrowed to its topic, which shows only that topic's items", async ({
	page,
}) => {
	const dengue = await createTerm("topic", "ก ไข้เลือดออก");
	const diabetes = await createTerm("topic", "ข เบาหวาน");
	const newsOnly = await createTerm("topic", "ค ฝุ่นควัน");
	const aboutDengue = await create("health_content", "chip-dengue", {
		taxonomies: { topic: [dengue.slug] },
	});
	const aboutDiabetes = await create("health_content", "chip-diabetes", {
		taxonomies: { topic: [diabetes.slug] },
	});
	await publish("health_content", aboutDengue, aboutDiabetes);
	// A Health Topic that only a News carries is not in the Health Content list's filter.
	await publish(
		"news",
		await create("news", "chip-news-only", { taxonomies: { topic: [newsOnly.slug] } }),
	);

	await page.goto("/health/content");
	const offered = (
		await page.getByLabel("ประเด็นสุขภาพ").locator("option:not([value=''])").allTextContents()
	).map((label) => label.trim());
	expect(offered, "the list's filter offers both topics").toEqual(
		expect.arrayContaining([dengue.label, diabetes.label]),
	);
	expect(offered, "and not the News' topic").not.toContain(newsOnly.label);

	await page.goto("/");
	const chips = healthSection(page).getByRole("list", { name: "ประเด็นสุขภาพ" }).getByRole("link");
	await expect(chips).toHaveText(offered);
	for (const [topic, shown, other] of [
		[dengue, aboutDengue, aboutDiabetes],
		[diabetes, aboutDiabetes, aboutDengue],
	] as const) {
		await page.goto("/");
		const chip = chips.filter({ hasText: topic.label });
		await expect(chip).toHaveAttribute("href", `/health/content?topic=${topic.slug}`);
		await chip.click();
		await expect(page).toHaveURL(`/health/content?topic=${topic.slug}`);
		expect(
			ownTitles(await listedTitles(page), [shown, other]),
			`the list narrowed to ${topic.label}`,
		).toEqual([shown.title]);
		await expect(page.getByLabel("ประเด็นสุขภาพ")).toHaveValue(topic.slug);
	}
	// A chip is 24 px high or more at every width, and the row wraps inside the page.
	await page.goto("/");
	for (const width of [1440, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		const heights = await chips.evaluateAll((links) =>
			links.map((link) => link.getBoundingClientRect().height),
		);
		expect(Math.min(...heights), `the lowest chip at ${width} px`).toBeGreaterThanOrEqual(24);
	}
	await expectNoHorizontalScroll(page, "/ with the Health Topic chips at 320 px");
});

test("under the pointer a Health Content card rises 6 px, and a press just above its resting lower edge still opens the Health Content", async ({
	page,
}) => {
	const item = await create("health_content", "hover");
	await publish("health_content", item);
	await page.goto("/");
	const card = healthSection(page).getByRole("article").first();
	await expect(card.getByRole("heading", { level: 3 })).toHaveText(item.title);
	await expectRisesUnderPointer(page, card, card.getByTestId("health-surface"));
	await expect(page).toHaveURL(`/health/content/${item.slug}`);
});

test("the Health Service Discovery band shows its heading and lead, the number of published Health Services and of the Areas the directory's filter offers, and its form opens the directory with the chosen Area and the typed name", async ({
	page,
}) => {
	const area = await createTerm("area", "ตำบลบ้านกลาง");
	const facility = await createSyntheticHealthService(admin, "discovery", {
		taxonomies: { area: [area.slug] },
	});
	await publish("health_services", facility);
	const name = facility.slug.slice(-6);
	const published = (await listPublishedEntries(admin, "health_services")).length;
	await page.goto("/health-services");
	const offeredAreas = await page
		.getByRole("form", { name: "ค้นหาหน่วยบริการ" })
		.getByLabel("พื้นที่รับผิดชอบ")
		.locator("option:not([value=''])")
		.count();

	await page.goto("/");
	const discovery = discoverySection(page);
	// The heading's small label, before the count that ends in the same word.
	await expect(discovery.getByText("หน่วยบริการ", { exact: true }).first()).toBeVisible();
	await expect(discovery.getByText(DISCOVERY_LEAD, { exact: true })).toBeVisible();
	await expect(discovery.getByRole("listitem")).toHaveText([
		`${published} หน่วยบริการ`,
		`${offeredAreas} พื้นที่`,
	]);
	const areaField = discovery.getByLabel("พื้นที่รับผิดชอบ");
	await expect(areaField.getByRole("option", { name: area.label })).toHaveCount(1);
	await expect(areaField.locator("option")).toHaveCount(offeredAreas + 1);
	// Each control of the form is 44 px high or more (spec #239 "Accessibility").
	for (const control of [
		areaField,
		discovery.getByLabel("ชื่อหน่วยบริการ"),
		discovery.getByRole("button", { name: "ค้นหา", exact: true }),
	]) {
		expect((await boxOf(control, "a control of the form")).height).toBeGreaterThanOrEqual(44);
	}
	await areaField.selectOption({ label: area.label });
	await discovery.getByLabel("ชื่อหน่วยบริการ").fill(name);
	await discovery.getByRole("button", { name: "ค้นหา", exact: true }).click();

	await expect(page).toHaveURL(`/health-services?area=${area.slug}&name=${name}`);
	await expect(listedItem(page, facility.title)).toBeVisible();
});

test("with one Health Service that has no Area the band counts it and shows no number of Areas; Health Information follows Latest News without space of its own and the Announcements band with it, and the band keeps Health Information's space above it and the same below", async ({
	page,
}) => {
	await borrowAllContent();
	await publish("health_services", await createSyntheticHealthService(admin, "no-area"));
	await publish("news", await create("news", "before-health"));
	await publish("health_content", await create("health_content", "spacing"));
	const spaces = [
		[1440, 80],
		[768, 64],
		[375, 32],
	] as const;
	/** The room between the lower edge of `above`'s box and the upper edge of `below`'s. */
	const roomBetween = async (above: Locator, below: Locator) => {
		const upper = await boxOf(above, "the part above");
		return (await boxOf(below, "the part below")).y - (upper.y + upper.height);
	};
	const health = healthSection(page);
	const discovery = discoverySection(page);
	const band = discovery.getByTestId("discovery-band");
	await withHomepageMenus(admin, EMPTY_MENUS, async () => {
		await page.goto("/");
		await expect(discovery.getByRole("listitem")).toHaveText(["1 หน่วยบริการ"]);
		await expect(discovery.getByLabel("พื้นที่รับผิดชอบ").locator("option")).toHaveText([
			"ทุกพื้นที่",
		]);
		for (const [width, space] of spaces) {
			await page.setViewportSize({ width, height: 900 });
			await expect(health, `Health Information's space above at ${width} px`).toHaveCSS(
				"padding-top",
				"0px",
			);
			expect(
				await roomBetween(health.getByRole("list").last(), band),
				`from the Health Content cards to the band at ${width} px`,
			).toBeCloseTo(space, 0);
			// With no Activities the Contact Summary follows the band.
			expect(
				await roomBetween(band, contactSection(page)),
				`from the band to the Contact Summary at ${width} px`,
			).toBeCloseTo(space, 0);
		}
		await page.setViewportSize(DESKTOP_VIEWPORT);

		await publish(
			"announcements",
			await create("announcements", "before-health", { data: { closes_at: CLOSES_LATER } }),
		);
		await page.goto("/");
		for (const [width, space] of spaces) {
			await page.setViewportSize({ width, height: 900 });
			await expect(health, `Health Information's space above at ${width} px`).toHaveCSS(
				"padding-top",
				`${space}px`,
			);
		}
	});
});

test("the page gives each section the space its place asks for: the Activities directly below the deep field have it above them, the band before them takes it and leaves its own below, and Health Information before the band takes it in turn", async ({
	page,
}) => {
	// tests/node/public-homepage-spacing.test.ts holds the rule for every combination; this reads
	// that the page applies it. Returning the runtime's content to draft and three page loads at
	// three widths took 21 of a test's 30 seconds (near-timeout-reporter, #247 retro).
	test.setTimeout(60_000);
	await borrowAllContent();
	await publish("activities", await create("activities", "spacing-chain"));
	const spaces = [
		[1440, 80],
		[768, 64],
		[375, 32],
	] as const;
	const health = healthSection(page);
	const discovery = discoverySection(page);
	const activities = activitiesSection(page);
	/** Read one side of `section`'s own space at each width. */
	const expectSpace = async (
		section: Locator,
		name: string,
		side: "top" | "bottom",
		own: boolean,
	) => {
		for (const [width, space] of spaces) {
			await page.setViewportSize({ width, height: 900 });
			await expect(section, `${name}'s space at its ${side} at ${width} px`).toHaveCSS(
				`padding-${side}`,
				own ? `${space}px` : "0px",
			);
		}
		await page.setViewportSize(DESKTOP_VIEWPORT);
	};
	await withHomepageMenus(admin, EMPTY_MENUS, async () => {
		await page.goto("/");
		await expect(discovery).toHaveCount(0);
		await expectSpace(activities, "the Activities", "top", true);
		await expectSpace(activities, "the Activities", "bottom", true);
		await expectSpace(contactSection(page), "the Contact Summary", "top", false);
		await expectSpace(contactSection(page), "the Contact Summary", "bottom", true);

		await publish("health_services", await createSyntheticHealthService(admin, "spacing-chain"));
		await page.goto("/");
		await expect(health).toHaveCount(0);
		await expectSpace(discovery, "the band", "top", true);
		await expectSpace(discovery, "the band", "bottom", true);
		await expectSpace(activities, "the Activities", "top", false);

		await publish("health_content", await create("health_content", "spacing-chain"));
		await page.goto("/");
		await expectSpace(health, "Health Information", "top", true);
		await expectSpace(discovery, "the band", "top", false);
	});
});

/** The Homepage's forms, which show their submit state (spec #239 "Motion and loading"). */
const SUBMIT_FORMS = [
	{
		name: "the hero's site search",
		find: (page: Page) => page.getByRole("main").getByRole("search"),
		fill: (found: Locator) => found.getByRole("searchbox").fill("วัคซีน"),
		destination: "/search",
	},
	{
		name: "the Health Service Discovery form",
		find: (page: Page) => discoverySection(page).getByRole("form"),
		fill: (found: Locator) => found.getByLabel("ชื่อหน่วยบริการ").fill("อนามัย"),
		destination: "/health-services",
	},
];

for (const form of SUBMIT_FORMS) {
	test(`after submit, the button of ${form.name} shows a spinner in place of its icon and a second press sends nothing more, and it shows its icon again when the page is shown from history, after ten seconds, and back from the result`, async ({
		page,
	}) => {
		await publish("health_services", await createSyntheticHealthService(admin, "submit-state"));
		// The page's timers run on a clock the test can move.
		await page.clock.install();
		await page.goto("/");
		const found = form.find(page);
		const button = found.getByRole("button", { name: "ค้นหา", exact: true });
		const spinner = button.getByTestId("submit-spinner");
		const icon = button.getByTestId("submit-icon");
		await expect(spinner).toBeHidden();
		await expect(icon).toBeVisible();

		// The result answers 204 No Content, so the browser keeps the page in sight after submit.
		const result = (url: URL) => url.pathname === form.destination;
		const sent: string[] = [];
		await page.route(result, async (route) => {
			sent.push(route.request().url());
			await route.fulfill({ status: 204 });
		});
		await form.fill(found);
		await button.click();
		await expect(spinner).toBeVisible();
		await expect(icon).toBeHidden();
		await button.click({ force: true });
		await found.locator("input").first().press("Enter");
		await expect(spinner).toBeVisible();
		// A second request would have reached the route by now.
		await page.waitForTimeout(500);
		expect(sent, "one request for the result").toHaveLength(1);
		// The spinner stands still when reduced motion is preferred, and turns otherwise.
		await expect(spinner).toHaveCSS("animation-name", "none");
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await expect(spinner).toBeVisible();
		await expect(spinner).not.toHaveCSS("animation-name", "none");
		await page.emulateMedia({ reducedMotion: "reduce" });
		// A page the browser kept and shows again from history gets `pageshow`. Playwright's Chromium
		// keeps no page that way, so the event is sent here.
		await page.evaluate(() =>
			window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })),
		);
		await expect(spinner).toBeHidden();
		await expect(icon).toBeVisible();

		// A result that never opens here leaves the form shut for ten seconds, no longer: counted
		// from this submit, six seconds after the first one, whose own ten seconds no longer count.
		await page.clock.fastForward(6_000);
		await button.click();
		await expect(spinner).toBeVisible();
		expect(sent, "a second request once the state has cleared").toHaveLength(2);
		await page.clock.fastForward(5_000);
		await expect(spinner, "five seconds after the second submit").toBeVisible();
		await page.clock.fastForward(6_000);
		await expect(spinner).toBeHidden();
		await expect(icon).toBeVisible();

		// The real way there and back: the result opens, and the browser's back button returns.
		await page.unroute(result);
		await button.click();
		await expect(page).toHaveURL(result);
		await page.goBack();
		await expect(page).toHaveURL("/");
		await expect(form.find(page).getByTestId("submit-spinner")).toBeHidden();
		await expect(form.find(page).getByTestId("submit-icon")).toBeVisible();
	});
}

test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	for (const form of SUBMIT_FORMS) {
		test(`${form.name} opens its result as a plain form, its button showing its icon`, async ({
			page,
		}) => {
			await publish("health_services", await createSyntheticHealthService(admin, "plain-form"));
			await page.goto("/");
			const found = form.find(page);
			const button = found.getByRole("button", { name: "ค้นหา", exact: true });
			await expect(button.getByTestId("submit-icon")).toBeVisible();
			await expect(button.getByTestId("submit-spinner")).toBeHidden();
			await form.fill(found);
			await button.click();
			await expect(page).toHaveURL((url) => url.pathname === form.destination);
		});
	}
});

test("the Activities show the latest five by Activity date at every width, each as its picture or the visual with its date and its title over it, one link named by the title, the newest large at the right of the others two by two from 1,024 px and across the row above them below, where a small tile shows no date under 640 px", async ({
	page,
}) => {
	const heldAt = (day: number) => `2032-03-${String(day).padStart(2, "0")}T03:00:00.000Z`;
	const activitySummary = `${SYNTHETIC_FIXTURE_MARK} สรุปกิจกรรมที่หน้าแรกไม่แสดง`;
	const latest = await create("activities", "latest", {
		data: {
			activity_at: heldAt(6),
			summary: activitySummary,
			featured_image: {
				id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพกิจกรรม`),
			},
		},
	});
	const others: DraftFixture[] = [];
	for (const day of [5, 4, 3, 2, 1]) {
		others.push(await create("activities", `day-${day}`, { data: { activity_at: heldAt(day) } }));
	}
	const sixth = others[4]!;
	// Published last, without an Activity date: placed by its publication, today, behind 2032.
	const undated = await create("activities", "undated");
	const draft = await create("activities", "draft", { data: { activity_at: heldAt(7) } });
	await publish("activities", ...others, latest, undated);

	await page.goto("/");
	const activities = activitiesSection(page);
	const tiles = activityTiles(page);
	const shown = [latest, ...others.slice(0, 4)];
	await expect(tiles.getByRole("heading", { level: 3 })).toHaveText(
		shown.map(({ title }) => title),
	);
	for (const [index, activity] of shown.entries()) {
		const tile = tiles.nth(index);
		await expect(tile.locator("time")).toHaveText(thaiDate(heldAt(6 - index)));
		await expect(tile.getByRole("link")).toHaveAccessibleName(activity.title);
		await expect(tile.getByRole("link")).toHaveAttribute("href", `/activities/${activity.slug}`);
		expect((await shownLines(tile.getByRole("heading"))).lines, activity.title).toBeLessThanOrEqual(
			2,
		);
	}
	const large = tiles.first();
	await large.scrollIntoViewIfNeeded();
	await expectImageLoaded(large.locator("img"), "the latest Activity's picture");
	// The picture is asked for at the large tile's width: half the container, the row below.
	await expect(large.locator("img")).toHaveAttribute("sizes", "(min-width: 64rem) 37.5rem, 100vw");
	for (const index of [0, 1]) {
		await expectFocusRingWhole(
			tiles.nth(index).getByRole("link"),
			`the tile in place ${index + 1}`,
		);
	}
	await expect(large.getByTestId("activity-visual")).toHaveCount(0);
	for (const index of [1, 2, 3, 4]) {
		await expect(tiles.nth(index).locator("img")).toHaveCount(0);
		await expect(tiles.nth(index).getByTestId("activity-visual")).toBeVisible();
	}
	await expect(activities, "the Homepage's tiles leave the summary out").not.toContainText(
		activitySummary,
	);
	await expect(activities.getByRole("link", { name: "ดูกิจกรรมทั้งหมด" })).toHaveAttribute(
		"href",
		"/activities",
	);
	for (const hidden of [sixth, undated, draft]) {
		await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
	}

	const list = activities.getByRole("list");
	for (const width of [1440, 1024]) {
		await page.setViewportSize({ width, height: 900 });
		const largeBox = await boxOf(large, "the large tile");
		const smallBoxes = await Promise.all(
			[1, 2, 3, 4].map((index) => boxOf(tiles.nth(index), "a small tile")),
		);
		// Two small tiles and the large one share the first row; two more lie under the first two.
		expect(await itemsPerRow(tiles), `the tiles in rows at ${width} px`).toEqual([3, 2]);
		for (const small of smallBoxes) {
			expect(
				small.x + small.width,
				`a small tile left of the large one at ${width} px`,
			).toBeLessThan(largeBox.x);
		}
		expect(largeBox.height, `the large tile is two rows high at ${width} px`).toBeGreaterThan(
			2 * smallBoxes[0]!.height,
		);
		// The grid reaches both sides of the list, and the large tile is as high as it.
		const listBox = await boxOf(list, "the list of tiles");
		expect(smallBoxes[0]!.x, `the first small tile at the left at ${width} px`).toBeCloseTo(
			listBox.x,
			0,
		);
		expect(largeBox.x + largeBox.width, `the large tile at the right at ${width} px`).toBeCloseTo(
			listBox.x + listBox.width,
			0,
		);
		expect(largeBox.height, `the large tile as high as the list at ${width} px`).toBeCloseTo(
			listBox.height,
			0,
		);
		await expect(tiles.nth(1).locator("time"), `a small tile's date at ${width} px`).toBeVisible();
	}
	for (const width of [1023, 640, 639, 375, 320]) {
		await page.setViewportSize({ width, height: 900 });
		expect(await itemsPerRow(tiles), `the tiles in rows at ${width} px`).toEqual([1, 2, 2]);
		expect(await rowsFill(tiles, list), `the tiles fill each row at ${width} px`).toBe(true);
		expect(
			(await boxOf(large, "the large tile")).height,
			`the large tile is two rows high at ${width} px`,
		).toBeGreaterThan(2 * (await boxOf(tiles.nth(1), "a small tile")).height);
		await expect(large.locator("time"), `the large tile's date at ${width} px`).toBeVisible();
		const smallDate = tiles.nth(1).locator("time");
		if (width >= 640) await expect(smallDate, `a small tile's date at ${width} px`).toBeVisible();
		else await expect(smallDate, `a small tile's date at ${width} px`).toBeHidden();
		await expect(tiles.nth(4).getByRole("heading"), `the fifth title at ${width} px`).toBeVisible();
	}
	await expectNoHorizontalScroll(page, "/ with five Activities at 320 px");
});

test("with fewer than five Activities the tiles are equal and fill one row from 1,024 px; below, they go two to a row with the first across the row when the others are an even number: one alone, two side by side, three with the first across, four two by two; and with none the section is left out", async ({
	page,
}) => {
	// Four counts, each at four widths, after returning the runtime's content to draft: 24 of a
	// test's 30 seconds (near-timeout-reporter, #247 retro).
	test.setTimeout(60_000);
	await borrowAllContent();
	await page.goto("/");
	await expect(activitiesSection(page)).toHaveCount(0);

	const tiles = activityTiles(page);
	const list = activitiesSection(page).getByRole("list");
	const published: DraftFixture[] = [];
	const datesBelow: Array<[number, boolean, boolean]> = [];
	for (const [count, rowsBelow] of [
		[1, [1]],
		[2, [2]],
		[3, [1, 2]],
		[4, [2, 2]],
	] as const) {
		const next = await create("activities", `fewer-than-five-${count}`, {
			data: { activity_at: `2033-05-0${count}T03:00:00.000Z` },
		});
		await publish("activities", next);
		published.unshift(next);
		await page.goto("/");
		await expect(tiles.getByRole("heading", { level: 3 }), `${count} Activities`).toHaveText(
			published.map(({ title }) => title),
		);
		for (const width of [1440, 1024]) {
			await page.setViewportSize({ width, height: 900 });
			expect(await itemsPerRow(tiles), `${count} Activities in one row at ${width} px`).toEqual([
				count,
			]);
			expect(await rowsFill(tiles, list), `${count} fill the row at ${width} px`).toBe(true);
			const widths = await tiles.evaluateAll((elements) =>
				elements.map((element) => Math.round(element.getBoundingClientRect().width)),
			);
			expect(new Set(widths).size, `${count} equal tiles at ${width} px`).toBe(1);
			await expect(tiles.last().locator("time"), `a date at ${width} px`).toBeVisible();
		}
		for (const width of [1023, 375]) {
			await page.setViewportSize({ width, height: 900 });
			expect(await itemsPerRow(tiles), `${count} Activities at ${width} px`).toEqual(rowsBelow);
			expect(await rowsFill(tiles, list), `${count} fill each row at ${width} px`).toBe(true);
		}
		// Still at 375 px: whether the first tile and the last one show their dates, read for every
		// count before any is judged, so a red run shows each count.
		const date = (tile: Locator) => tile.locator("time").isVisible();
		datesBelow.push([count, await date(tiles.first()), count > 1 && (await date(tiles.last()))]);
		await page.setViewportSize(DESKTOP_VIEWPORT);
	}
	// Below 640 px a tile across the row keeps its date, and one half the row wide shows none.
	expect(datesBelow, "each count, its first tile's date and its last tile's, at 375 px").toEqual([
		[1, true, false],
		[2, false, false],
		[3, true, false],
		[4, false, false],
	]);
});

test("the Contact Summary is one card under the heading ติดต่อสำนักงาน: Office Contact's telephone as a link, its address with the map link and its opening hours, each only when set, and a button to /contact; no map or stand-in shows, and below 1,024 px the card is one column", async ({
	page,
}) => {
	const marker = crypto.randomUUID().slice(0, 8);
	const values = {
		address: `${SYNTHETIC_FIXTURE_MARK} 99 หมู่ 1 ${marker}\nอำเภอสอง จังหวัดแพร่ 54120`,
		telephone: "054 591 234",
		email: `contact-${marker}@example.invalid`,
		opening_hours: `จันทร์–ศุกร์ 08:30–16:30 น. ${marker}`,
		latitude: 18.4686,
		longitude: 100.1834,
	};
	await withOfficeContact(admin, values, {}, async () => {
		await page.goto("/");
		const contact = contactSection(page);
		await expect(contact.getByRole("heading", { level: 2 })).toHaveText(HOMEPAGE_HEADINGS.contact);
		await expect(contact.getByText("ติดต่อ", { exact: true })).toBeVisible();
		const location = detailOf(page, "ที่ตั้ง");
		await expect(location).toContainText(values.address.split("\n")[0]!);
		await expect(location).toContainText("อำเภอสอง จังหวัดแพร่ 54120");
		const map = location.getByRole("link", { name: "เปิดแผนที่ (เปิดในแท็บใหม่)" });
		await expect(map).toHaveAttribute(
			"href",
			"https://www.google.com/maps/search/?api=1&query=18.4686%2C100.1834",
		);
		await expect(map).toHaveAttribute("rel", "noopener");
		const telephone = detailOf(page, "โทรศัพท์").getByRole("link", { name: "054 591 234" });
		await expect(telephone).toHaveAttribute("href", "tel:054591234");
		// Large and in accent-warm: 40 px from 640 px, the h2 size below.
		await expect(telephone).toHaveCSS("color", await tokenColor(page, "accent-warm"));
		for (const [width, size] of [
			[1440, "40px"],
			[640, "40px"],
			[639, "34px"],
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await expect(telephone, `the telephone's size at ${width} px`).toHaveCSS("font-size", size);
		}
		await page.setViewportSize(DESKTOP_VIEWPORT);
		await expect(detailOf(page, "เวลาทำการ")).toHaveText(values.opening_hours);
		await expect(contact, "the email stays on /contact").not.toContainText(values.email);
		const button = contact.getByRole("link", { name: CONTACT_PAGE_LINK, exact: true });
		await expect(button).toHaveAttribute("href", "/contact");
		await expect(page.locator("iframe, embed, object"), "no map is embedded").toHaveCount(0);
		await expect(contact, "no stand-in for a map").not.toContainText("แผนที่สำนักงาน");
		await expect(contact, "the office summary is not repeated").not.toContainText(OFFICE_SUMMARY);

		// Two columns from 1,024 px: the telephone at the left of the address. One column below.
		for (const [width, beside] of [
			[1440, true],
			[1024, true],
			[1023, false],
			[375, false],
			[320, false],
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			const number = await boxOf(telephone, "the telephone number");
			const place = await boxOf(location, "the address");
			if (beside) {
				expect(
					number.x + number.width,
					`the telephone left of the address at ${width} px`,
				).toBeLessThan(place.x);
			} else {
				expect(
					number.y + number.height,
					`the telephone above the address at ${width} px`,
				).toBeLessThanOrEqual(place.y);
			}
			for (const target of [telephone, map, button]) {
				expect(
					(await boxOf(target, "a link of the card")).height,
					`a link's target at ${width} px`,
				).toBeGreaterThanOrEqual(44);
			}
		}
		await expectNoHorizontalScroll(page, "/ with the contact card at 320 px");
		await page.setViewportSize(DESKTOP_VIEWPORT);
		await button.click();
		await expect(page).toHaveURL("/contact");
	});

	await withOfficeContact(
		admin,
		{ telephone: "054 591 234 ต่อ 12", latitude: 18.4686 },
		{},
		async () => {
			await page.goto("/");
			const contact = contactSection(page);
			await expect(contact.getByRole("term")).toHaveText(["โทรศัพท์"]);
			await expect(detailOf(page, "โทรศัพท์")).toHaveText("054 591 234 ต่อ 12");
			await expect(detailOf(page, "โทรศัพท์").getByRole("link")).toHaveCount(0);
			await expect(contact.getByRole("link", { name: /เปิดแผนที่/ })).toHaveCount(0);
			// With neither an address nor hours the card holds no list for them.
			await expect(contact.locator("dl")).toHaveCount(1);
			await page.setViewportSize(MOBILE_VIEWPORT);
			await expectNoHorizontalScroll(page, "/ with a long telephone text at 320 px");
		},
	);
});

test("with one shortcut Quick Access shows it on the Homepage's card surface, after the Activities and before the Contact Summary, and with an empty menu the section is left out", async ({
	page,
}) => {
	await publish("activities", await create("activities", "before-quick-access"));
	const shortcut = { label: "เอกสารเผยแพร่", url: "/documents" };
	await withHomepageMenus(admin, { quickAccess: [shortcut] }, async () => {
		await page.goto("/");
		const quickAccess = homepageSection(page, HOMEPAGE_HEADINGS.quickAccess);
		const link = quickAccess.getByRole("link");
		await expect(link).toHaveCount(1);
		await expect(link).toHaveAccessibleName(shortcut.label);
		await expect(link).toHaveAttribute("href", shortcut.url);
		await expect(link).toHaveCSS("background-color", await tokenColor(page, "surface-base"));
		await expect(link).toHaveCSS("border-top-width", "0px");
		await expect(link).not.toHaveCSS("box-shadow", "none");
		await expectFocusRingWhole(link, "the shortcut");
		// After the Activities it has the sections' space below it alone, and the Contact Summary
		// after it none above.
		for (const [width, space] of [
			[1440, "80px"],
			[768, "64px"],
			[375, "32px"],
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await expect(quickAccess, `Quick Access at ${width} px`).toHaveCSS("padding-top", "0px");
			await expect(quickAccess, `Quick Access at ${width} px`).toHaveCSS("padding-bottom", space);
			await expect(contactSection(page), `the Contact Summary at ${width} px`).toHaveCSS(
				"padding-top",
				"0px",
			);
		}
		await page.setViewportSize(DESKTOP_VIEWPORT);
		expect(
			(await sectionHeadings(page).allTextContents()).map((text) => text.trim()).slice(-3),
			"the last three sections",
		).toEqual([
			HOMEPAGE_HEADINGS.activities,
			HOMEPAGE_HEADINGS.quickAccess,
			HOMEPAGE_HEADINGS.contact,
		]);
	});
	await withHomepageMenus(admin, { quickAccess: [] }, async () => {
		await page.goto("/");
		await expect(homepageSection(page, HOMEPAGE_HEADINGS.quickAccess)).toHaveCount(0);
		await expect(sectionHeadings(page).last()).toHaveText(HOMEPAGE_HEADINGS.contact);
	});
});

/**
 * Run `body` on a runtime whose Homepage shows every section: published entries of each kind,
 * labelled with `label`, so every section shows whichever tests ran before, and three of each
 * card, so a row of two shows as two and not as more. The Featured News is published first, so
 * Latest News leads with the other one. The Homepage menus and Office Contact are put back
 * afterwards. `body` gets the Featured item and the headings of the page's sections in order.
 */
async function withEverySection(
	label: string,
	body: (shown: { featured: DraftFixture; order: string[] }) => Promise<void>,
): Promise<void> {
	const { featured, services } = await test.step("Prepare native fixtures", async () => {
		const featured = await create("news", `${label}-featured`, {
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} สรุปเรื่องเด่น`,
				featured_image: {
					id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพเรื่องเด่น`),
				},
			},
		});
		await publish("news", featured, await create("news", label));
		await publish("announcements", await create("announcements", label));
		await publish("health_services", await createSyntheticHealthService(admin, label));
		await publish(
			"personnel",
			await createSyntheticPerson(admin, "ทุกส่วน", { leadership_order: 1 }),
		);
		const services: DraftFixture[] = [];
		for (const each of [label, `${label}-second`, `${label}-third`]) {
			await publish("health_content", await create("health_content", each));
			await publish("activities", await create("activities", each));
			const service = await createSyntheticService(admin, each, {
				data: { summary: `${SYNTHETIC_FIXTURE_MARK} สรุปบริการ` },
			});
			await publishEntryAt(admin, "services", service.id);
			services.push(service);
		}
		return { featured, services };
	});
	const menus = {
		featured: [pickedMenuItem("news", featured)],
		services: services.map((service) => pickedMenuItem("services", service)),
		quickAccess: [
			{ label: "เอกสารเผยแพร่", url: "/documents" },
			{ label: "ข้อมูลสุขภาพ", url: "/health" },
			{ label: "ข่าวสุขภาพ", url: "/news/health" },
		],
	};
	const order = [
		featured.title,
		HOMEPAGE_HEADINGS.services,
		HOMEPAGE_HEADINGS.leadership,
		HOMEPAGE_HEADINGS.news,
		HOMEPAGE_HEADINGS.announcements,
		HOMEPAGE_HEADINGS.health,
		HOMEPAGE_HEADINGS.discovery,
		HOMEPAGE_HEADINGS.activities,
		HOMEPAGE_HEADINGS.quickAccess,
		HOMEPAGE_HEADINGS.contact,
	];
	await test.step("Apply and restore Homepage menus and Office Contact", async () => {
		await withHomepageMenus(admin, menus, async () => {
			await withOfficeContact(
				admin,
				{
					address: `${SYNTHETIC_FIXTURE_MARK} 99 หมู่ 1\nอำเภอสอง จังหวัดแพร่ 54120`,
					telephone: "054 591 234",
					opening_hours: "จันทร์–ศุกร์ 08:30–16:30 น.",
					latitude: 18.4686,
					longitude: 100.1834,
				},
				{},
				() => body({ featured, order }),
			);
		});
	});
}

test("with every section showing, the sections follow the Figma order on a desktop and a phone, the Contact Summary last, a phone shows Quick Access two to a row, and the page is accessible and reflows at 320 px", async ({
	page,
}) => {
	await withEverySection("every-section", async ({ order }) => {
		await test.step("Render Homepage", async () => {
			await page.goto("/");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
			await expect(sectionHeadings(page)).toHaveText(order);
		});
		// Keep the shared viewport order while naming axe and focus time separately.
		for (const [width, viewport] of Object.entries(VIEWPORTS)) {
			await page.setViewportSize(viewport);
			await test.step(`Axe at ${width}`, () =>
				expectNoAxeViolations(page, `/ with every section at ${width}`));
			await test.step(`Keyboard focus at ${width}`, () =>
				expectVisibleFocusOnEveryStop(page, `/ with every section at ${width}`));
		}
		await page.setViewportSize(DESKTOP_VIEWPORT);

		// A phone keeps every section in order, with Quick Access two to a row (spec #144
		// "Homepage (`04`)").
		await test.step("Phone layout at 375 px", async () => {
			await page.setViewportSize(PHONE_VIEWPORT);
			await expect(sectionHeadings(page)).toHaveText(order);
			const [firstRow] = await itemsPerRow(
				homepageSection(page, HOMEPAGE_HEADINGS.quickAccess).getByRole("listitem"),
			);
			expect(firstRow, "the Quick Access cards side by side at 375 px").toBe(2);
		});
		await test.step("Axe at 375 px", () =>
			expectNoAxeViolations(page, "/ with every section at 375 px"));
		await test.step("Reflow at 320 px", async () => {
			await page.setViewportSize(MOBILE_VIEWPORT);
			await expectNoHorizontalScroll(page, "/ with every section");
		});
	});
});

/**
 * The parts of `scope` an effect holds back as the page is now: any that is not fully opaque or
 * lies away from its place. Decorations, hidden from assistive technology, are left out.
 */
function heldBack(scope: Locator): Promise<string[]> {
	return scope.evaluate((root) =>
		[root, ...root.querySelectorAll("*")]
			.filter((part) => part.closest('[aria-hidden="true"]') === null)
			.filter((part) => {
				const style = getComputedStyle(part);
				return style.opacity !== "1" || style.translate !== "none";
			})
			.map((part) => `<${part.localName}> ${part.textContent?.trim().slice(0, 40)}`),
	);
}

/** How opaque `part` shows as the page is now, through everything that holds it: 0 to 1. */
function shownOpacity(part: Locator): Promise<number> {
	return part.evaluate((element) => {
		let opacity = 1;
		for (let node: Element | null = element; node; node = node.parentElement) {
			opacity *= Number(getComputedStyle(node).opacity);
		}
		return opacity;
	});
}

/**
 * After how many seconds `part` starts to enter when the page opens: the delay of the entrance
 * that it, or what holds it, has. -1 with no entrance.
 */
function entersAfter(part: Locator): Promise<number> {
	return part.evaluate((element) => {
		for (let node: Element | null = element; node; node = node.parentElement) {
			const style = getComputedStyle(node);
			if (style.animationName !== "none") return parseFloat(style.animationDelay);
		}
		return -1;
	});
}

/** The page's height and each section's place and size, as the page is laid out now. */
function pageLayout(page: Page) {
	return page.getByRole("main").evaluate((main) => ({
		height: document.documentElement.scrollHeight,
		sections: [...main.querySelectorAll("section")].map((section) => {
			const { top, height } = section.getBoundingClientRect();
			return { top: top + window.scrollY, height };
		}),
	}));
}

/** Scroll to each of the Homepage's sections in turn and fail on any part of it held back. */
async function expectEverySectionWhole(page: Page, order: string[], label: string): Promise<void> {
	// The first heading is the Featured card's, in the hero.
	for (const heading of order.slice(1)) {
		const section = homepageSection(page, heading);
		await section.scrollIntoViewIfNeeded();
		expect(await heldBack(section), `${label}: ${heading}, scrolled to, shows whole`).toEqual([]);
	}
}

test("the page moves only when motion is allowed: the hero's parts enter one after another and each section shows as it comes into the window, while with reduced motion preferred, and where the browser has no scroll-driven animation, every section shows whole at once; the page's height and each section's place are the same either way", async ({
	page,
}) => {
	test.setTimeout(90_000);
	await withEverySection("motion", async ({ featured, order }) => {
		const main = page.getByRole("main");
		const hero = page.getByRole("region", { name: OFFICE_SUMMARY, exact: true });
		const running = () => page.evaluate(() => document.getAnimations().length);

		const still = await test.step("Reduced motion", async () => {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.goto("/");
			await expect(sectionHeadings(page)).toHaveText(order);
			expect(await running(), "nothing is mid-animation").toBe(0);
			expect(await heldBack(main), "nothing waits for an effect").toEqual([]);
			await expectEverySectionWhole(page, order, "reduced motion");
			expect(await running(), "nothing is mid-animation after scrolling").toBe(0);
			await page.evaluate(() => window.scrollTo(0, 0));
			return pageLayout(page);
		});

		await test.step("The same layout with motion", async () => {
			await page.emulateMedia({ reducedMotion: "no-preference" });
			await page.goto("/");
			await expect(sectionHeadings(page)).toHaveText(order);
			expect(await pageLayout(page), "the page with motion").toEqual(still);
		});

		await test.step("The hero's entrance", async () => {
			const starts: number[] = [];
			for (const part of [
				hero.getByText("เว็บไซต์ทางการ · กระทรวงสาธารณสุข"),
				hero.getByText("ด้านสุขภาพ", { exact: true }),
				hero.getByRole("search"),
				hero.getByRole("heading", { name: featured.title }),
			]) {
				starts.push(await entersAfter(part));
			}
			expect(starts[0], "the chip enters as the page opens").toBe(0);
			expect(
				starts.every((start, index) => index === 0 || start > starts[index - 1]!),
				`the chip, the headline, the search and the Featured card enter in turn: ${starts}`,
			).toBe(true);
			await expect
				.poll(() => heldBack(hero), { message: "the hero shows whole after its entrance" })
				.toEqual([]);
		});

		await test.step("Each section's reveal", async () => {
			let revealed = 0;
			for (const heading of order.slice(1)) {
				const title = page.getByRole("heading", { level: 2, name: heading, exact: true });
				const below = (await boxOf(title, heading)).y > DESKTOP_VIEWPORT.height + 40;
				if (below) {
					expect(await shownOpacity(title), `${heading}, below the window, waits`).toBe(0);
					revealed += 1;
				}
				await title.scrollIntoViewIfNeeded();
				await expect
					.poll(() => shownOpacity(title), { message: `${heading}, in the window, shows` })
					.toBe(1);
			}
			expect(revealed, "sections that lay below the window").toBeGreaterThan(5);
			expect(await running(), "the decorations move").toBeGreaterThan(0);
		});

		await test.step("Without scroll-driven animation", async () => {
			// Chromium has scroll-driven animation and no switch for it, so the page is served with its
			// support queries naming a timeline no browser has, which is what such a browser makes of
			// them.
			let queries = 0;
			await page.route("/", async (route) => {
				const response = await route.fetch();
				const body = (await response.text()).replace(
					/@supports\s*\(\s*animation-timeline\s*:\s*view\(\)\s*\)/g,
					() => {
						queries += 1;
						return "@supports (animation-timeline: no-such-timeline())";
					},
				);
				await route.fulfill({ response, body });
			});
			await page.goto("/");
			await page.unroute("/");
			await expect(sectionHeadings(page)).toHaveText(order);
			expect(queries, "the page asks whether the browser has the timeline").toBeGreaterThan(0);
			await expect
				.poll(() => heldBack(main), {
					message: "after the hero's entrance nothing waits, the sections below the window too",
				})
				.toEqual([]);
			await expectEverySectionWhole(page, order, "without scroll-driven animation");
		});
	});
});

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
// Announcements"); the latest
// 4 Health Content items, each labelled with its first Health Topic; a Health Service Discovery
// form that submits an Area and a name to /health-services; the latest Activities by Activity date,
// 3 on a desktop and 4 on a phone, each with its picture or a visual fallback and "กิจกรรม • date";
// and the Contact Summary from Office Contact. On a phone the sections keep that order, and Health
// Information, Activities and Quick Access show their cards two to a row (Feature 006 #146; spec
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
	expectImageLoaded,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	expectVisuallyHidden,
	homepageSection,
	itemsPerRow,
	listedItem,
	siteTitleParts,
	test,
	thaiDate,
	tokenColor,
} from "./public.helpers";

/** The Homepage menus with nothing in them, so no curated section shows. */
const EMPTY_MENUS = { featured: [], services: [], quickAccess: [] };

/** The Contact Summary's lead, which is also the Homepage's description and the hero's headline. */
const CONTACT_LEAD = HOMEPAGE_HEADLINE;

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
			await expect(sectionHeadings(page)).toHaveText([siteTitle]);
			await expect(
				homepageSection(page, HOMEPAGE_HEADLINE).getByText(HOMEPAGE_HEADLINE, { exact: true }),
			).toBeVisible();

			const contact = homepageSection(page, siteTitle);
			await expect(contact.getByText(CONTACT_LEAD)).toBeVisible();
			await expect(contact.getByRole("term")).toHaveCount(0);
			await expect(contact.getByRole("link", { name: "ดูข้อมูลติดต่อทั้งหมด" })).toHaveAttribute(
				"href",
				"/contact",
			);

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
				CONTACT_LEAD,
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
	const surface = card.getByTestId("news-surface");
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

test("Health Information shows the latest 4 published Health Content items, each labelled with its first Health Topic", async ({
	page,
}) => {
	const firstTopic = await createTerm("topic", "ก ไข้เลือดออก");
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
		data: { summary },
		taxonomies: { topic: [secondTopic.slug, firstTopic.slug] },
	});
	const draft = await create("health_content", "draft", {
		taxonomies: { topic: [firstTopic.slug] },
	});
	await publish("health_content", oldest, fourth, third, untopical, newest);

	await page.goto("/");
	const health = homepageSection(page, HOMEPAGE_HEADINGS.health);
	await expect(health.getByRole("heading", { level: 3 })).toHaveText([
		newest.title,
		untopical.title,
		third.title,
		fourth.title,
	]);
	const card = (fixture: DraftFixture) =>
		health.getByRole("article").filter({ hasText: fixture.title });
	await expect(card(newest).getByText(firstTopic.label, { exact: true })).toBeVisible();
	await expect(card(newest)).not.toContainText(secondTopic.label);
	await expect(card(newest).getByText(summary, { exact: true })).toBeVisible();
	for (const topic of [firstTopic, secondTopic]) {
		await expect(card(untopical)).not.toContainText(topic.label);
	}
	await expect(card(third).getByText(firstTopic.label, { exact: true })).toBeVisible();
	for (const fixture of [newest, untopical, third, fourth]) {
		await expect(
			card(fixture).getByRole("link", { name: `อ่านเพิ่มเติม ${fixture.title}` }),
		).toHaveAttribute("href", `/health/content/${fixture.slug}`);
	}
	await expect(health.getByRole("link", { name: "ดูความรู้สุขภาพทั้งหมด" })).toHaveAttribute(
		"href",
		"/health/content",
	);
	for (const hidden of [oldest, draft]) {
		await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
	}
});

test("Health Service Discovery submits the chosen Area and the name to the Health Service Directory", async ({
	page,
}) => {
	const area = await createTerm("area", "ตำบลบ้านกลาง");
	const facility = await createSyntheticHealthService(admin, "discovery", {
		taxonomies: { area: [area.slug] },
	});
	await publish("health_services", facility);
	const name = facility.slug.slice(-6);

	await page.goto("/");
	const discovery = homepageSection(page, HOMEPAGE_HEADINGS.discovery);
	await expect(
		discovery.getByText("หน่วยบริการสุขภาพที่เกี่ยวข้อง", { exact: true }),
	).toBeVisible();
	const areaField = discovery.getByLabel("พื้นที่รับผิดชอบ");
	await expect(areaField.getByRole("option", { name: area.label })).toHaveCount(1);
	await areaField.selectOption({ label: area.label });
	await discovery.getByLabel("ชื่อหน่วยบริการ").fill(name);
	await discovery.getByRole("button", { name: "ค้นหาหน่วยบริการ" }).click();

	await expect(page).toHaveURL(`/health-services?area=${area.slug}&name=${name}`);
	await expect(listedItem(page, facility.title)).toBeVisible();
});

test("Activities shows the latest 3 by Activity date on a desktop and the latest 4 on a phone, each with its picture or the visual fallback and กิจกรรม • date", async ({
	page,
}) => {
	const heldAt = (day: number) => `2032-03-${String(day).padStart(2, "0")}T03:00:00.000Z`;
	const activitySummary = `${SYNTHETIC_FIXTURE_MARK} สรุปกิจกรรมที่หน้าแรกไม่แสดง`;
	const latest = await create("activities", "latest", {
		data: {
			activity_at: heldAt(4),
			summary: activitySummary,
			featured_image: {
				id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพกิจกรรม`),
			},
		},
	});
	const second = await create("activities", "second", { data: { activity_at: heldAt(3) } });
	const third = await create("activities", "third", { data: { activity_at: heldAt(2) } });
	const fourth = await create("activities", "fourth", { data: { activity_at: heldAt(1) } });
	// Published last, without an Activity date: placed by its publication, today, behind 2032.
	const undated = await create("activities", "undated");
	const draft = await create("activities", "draft", { data: { activity_at: heldAt(5) } });
	await publish("activities", second, latest, fourth, third, undated);

	await page.goto("/");
	const activities = homepageSection(page, HOMEPAGE_HEADINGS.activities);
	await expect(activities.getByRole("heading", { level: 3 })).toHaveText([
		latest.title,
		second.title,
		third.title,
	]);
	for (const [activity, day] of [
		[latest, 4],
		[second, 3],
		[third, 2],
	] as const) {
		const card = activities.getByRole("article").filter({ hasText: activity.title });
		await expect(card.getByText("กิจกรรม", { exact: true })).toBeVisible();
		await expect(card.locator("time")).toHaveText(thaiDate(heldAt(day)));
		await expect(card.getByRole("link", { name: activity.title })).toHaveAttribute(
			"href",
			`/activities/${activity.slug}`,
		);
	}
	const picture = activities.getByRole("article").filter({ hasText: latest.title }).locator("img");
	await picture.scrollIntoViewIfNeeded();
	await expectImageLoaded(picture, "the latest Activity's picture");
	for (const activity of [second, third]) {
		const card = activities.getByRole("article").filter({ hasText: activity.title });
		await expect(card.locator("img"), activity.title).toHaveCount(0);
		await expect(card.getByTestId("activity-visual"), activity.title).toHaveCount(1);
	}
	await expect(activities, "the Homepage's cards leave the summary out").not.toContainText(
		activitySummary,
	);
	await expect(activities.getByRole("link", { name: "ดูกิจกรรมทั้งหมด" })).toHaveAttribute(
		"href",
		"/activities",
	);
	await expect(activities.getByRole("article").filter({ hasText: fourth.title })).toBeHidden();

	// A phone shows the latest 4, two by two (spec #144 "Homepage (`04`)").
	await page.setViewportSize(PHONE_VIEWPORT);
	await expect(activities.getByRole("heading", { level: 3 })).toHaveText([
		latest.title,
		second.title,
		third.title,
		fourth.title,
	]);
	const card = activities.getByRole("article").filter({ hasText: fourth.title });
	await expect(card.locator("time")).toHaveText(thaiDate(heldAt(1)));
	await expect(card.getByRole("link", { name: fourth.title })).toHaveAttribute(
		"href",
		`/activities/${fourth.slug}`,
	);
	for (const hidden of [undated, draft]) {
		await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
	}
});

test("the Contact Summary reads Office Contact: address with the map link, telephone and opening hours, and leaves out what is not set", async ({
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
		const contact = homepageSection(page, siteTitle);
		await expect(contact.getByRole("heading", { level: 2 })).toHaveText(siteTitle);
		const location = detailOf(page, "ที่ตั้ง");
		await expect(location).toContainText(values.address.split("\n")[0]!);
		await expect(location).toContainText("อำเภอสอง จังหวัดแพร่ 54120");
		const map = location.getByRole("link", { name: "เปิดแผนที่ (เปิดในแท็บใหม่)" });
		await expect(map).toHaveAttribute(
			"href",
			"https://www.google.com/maps/search/?api=1&query=18.4686%2C100.1834",
		);
		await expect(map).toHaveAttribute("rel", "noopener");
		await expect(
			detailOf(page, "โทรศัพท์").getByRole("link", { name: "054 591 234" }),
		).toHaveAttribute("href", "tel:054591234");
		await expect(detailOf(page, "เวลาทำการ")).toHaveText(values.opening_hours);
		await expect(contact, "the email stays on /contact").not.toContainText(values.email);
		await expect(contact.getByRole("link", { name: "ดูข้อมูลติดต่อทั้งหมด" })).toHaveAttribute(
			"href",
			"/contact",
		);
		await expect(page.locator("iframe, embed, object"), "no map is embedded").toHaveCount(0);
	});

	await withOfficeContact(
		admin,
		{ telephone: "054 591 234 ต่อ 12", latitude: 18.4686 },
		{},
		async () => {
			await page.goto("/");
			const contact = homepageSection(page, siteTitle);
			await expect(contact.getByRole("term")).toHaveText(["โทรศัพท์"]);
			await expect(detailOf(page, "โทรศัพท์")).toHaveText("054 591 234 ต่อ 12");
			await expect(detailOf(page, "โทรศัพท์").getByRole("link")).toHaveCount(0);
			await expect(contact.getByRole("link", { name: /เปิดแผนที่/ })).toHaveCount(0);
		},
	);
});

test("with every section showing, the sections follow the Figma order on a desktop and a phone, a phone shows the card sections two to a row without the Contact Summary's lead, and the page is accessible and reflows at 320 px", async ({
	page,
}) => {
	// Published entries of each kind, so every section shows whichever tests ran before, and three of
	// each card, so a row of two shows as two and not as more. The Featured News is published first,
	// so Latest News leads with the other one.
	const { featured, services } = await test.step("Prepare native fixtures", async () => {
		const featured = await create("news", "every-section-featured", {
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} สรุปเรื่องเด่น`,
				featured_image: {
					id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพเรื่องเด่น`),
				},
			},
		});
		await publish("news", featured, await create("news", "every-section"));
		await publish("announcements", await create("announcements", "every-section"));
		await publish("health_services", await createSyntheticHealthService(admin, "every-section"));
		await publish(
			"personnel",
			await createSyntheticPerson(admin, "ทุกส่วน", { leadership_order: 1 }),
		);
		const services: DraftFixture[] = [];
		for (const label of ["every-section", "every-section-second", "every-section-third"]) {
			await publish("health_content", await create("health_content", label));
			await publish("activities", await create("activities", label));
			const service = await createSyntheticService(admin, label, {
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
				async () => {
					await test.step("Render Homepage", async () => {
						await page.goto("/");
						await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
						await expect(sectionHeadings(page)).toHaveText([...order, siteTitle]);
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

					// A phone keeps every section in order, with the cards two to a row (spec #144
					// "Homepage (`04`)").
					await test.step("Phone layout at 375 px", async () => {
						await page.setViewportSize(PHONE_VIEWPORT);
						await expect(sectionHeadings(page)).toHaveText([...order, siteTitle]);
						for (const heading of [
							HOMEPAGE_HEADINGS.health,
							HOMEPAGE_HEADINGS.activities,
							HOMEPAGE_HEADINGS.quickAccess,
						]) {
							const [firstRow] = await itemsPerRow(
								homepageSection(page, heading).getByRole("listitem"),
							);
							expect(firstRow, `the cards of "${heading}" side by side at 375 px`).toBe(2);
						}
						await expect(
							homepageSection(page, siteTitle).getByText(CONTACT_LEAD),
							"a phone leaves out the Contact Summary's lead",
						).toBeHidden();
					});
					await test.step("Axe at 375 px", () =>
						expectNoAxeViolations(page, "/ with every section at 375 px"));
					await test.step("Reflow at 320 px", async () => {
						await page.setViewportSize(MOBILE_VIEWPORT);
						await expectNoHorizontalScroll(page, "/ with every section");
					});
				},
			);
		});
	});
});

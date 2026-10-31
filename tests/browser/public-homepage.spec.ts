// The Homepage's automatic sections (#64; spec #51 "Homepage (`04`, Figma order)", `04` §3, §7–§11
// and §17; docs/design/homepage-concept-v1.md).
//
// A citizen opening / sees, in the Figma order: a compact band with the site title and tagline
// while nothing is Featured; a search form that submits to /search; the newest published News
// beside up to 3 current Announcements; the latest 4 Health Content items, each labelled with its
// first Health Topic; a Health Service Discovery form that submits an Area and a name to
// /health-services; the latest 3 Activities by Activity date, each with its picture or a visual
// fallback and "กิจกรรม • date"; and the Contact Summary from Office Contact. An optional section
// with nothing to show disappears. The search and the Contact Summary always render, and the page
// answers with no content at all. Closed Announcements, drafts, unpublished and trashed entries
// never show. The curated sections between them have their own suite
// (public-homepage-curation.spec.ts); the tests here that look at the whole page set the Homepage
// menus they need and put back what the menus held.
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

import type { Page } from "@playwright/test";

import {
	cmsRequest,
	createOwnedTerm,
	createSyntheticDraft,
	createSyntheticHealthService,
	createSyntheticService,
	devAdminActor,
	listPublishedEntries,
	nativeDataOf,
	nativeRefusalOf,
	publishEntryAt,
	removeSuiteFixtures,
	withOfficeContact,
	SYNTHETIC_FIXTURE_MARK,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPicture,
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
	MOBILE_VIEWPORT,
	detailOf,
	expect,
	expectAccessibleAtEachWidth,
	expectImageLoaded,
	expectNoHorizontalScroll,
	listedItem,
	siteTitleParts,
	test,
	thaiDate,
} from "./public.helpers";

/** The section headings, the design's interface text (docs/design/homepage-concept-v1.md). */
const SEARCH_HEADING = "คุณกำลังมองหาอะไร?";
const SERVICES_HEADING = "วันนี้คุณต้องการทำอะไร?";
const NEWS_HEADING = "เรื่องใหม่จากเครือข่ายสุขภาพอำเภอสอง";
const HEALTH_HEADING = "ความรู้ที่ใช้ได้ในชีวิตประจำวัน";
const DISCOVERY_HEADING = "ค้นหาหน่วยบริการสุขภาพในอำเภอสอง";
const ACTIVITIES_HEADING = "สุขภาพเกิดขึ้นในชุมชน";
const QUICK_ACCESS_HEADING = "ข้อมูลและเอกสารสำคัญ";

/** The Homepage menus with nothing in them, so no curated section shows. */
const EMPTY_MENUS = { featured: [], services: [], quickAccess: [] };

/** The heading of the current Announcements beside the News card, which names their list. */
const ANNOUNCEMENTS_HEADING = "ประกาศ";

/** The Contact Summary's lead, which is also the Homepage's description. */
const CONTACT_LEAD =
	"ศูนย์กลางข้อมูล บริการ และการประสานงานด้านสุขภาพของประชาชนในอำเภอสอง จังหวัดแพร่";

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
/** The site title the settings name, which heads the band and the Contact Summary. */
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
async function publish(collection: Collection, ...fixtures: DraftFixture[]): Promise<void> {
	for (const fixture of fixtures) await publishEntryAt(admin, collection, fixture.id);
}

/** A synthetic Health Topic, Area or News category, labelled like a real one. */
const createTerm = (taxonomy: string, label: string) =>
	createOwnedTerm(admin, taxonomy, label, ownedTerms);

/** Return every published entry the Homepage shows by itself to draft, for the running test. */
async function borrowAllContent(): Promise<void> {
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

/** A Homepage section, by its heading. */
function section(page: Page, heading: string) {
	return page.getByRole("region", { name: heading });
}

/** The current Announcements' links, in order. */
function announcementLinks(page: Page) {
	return section(page, NEWS_HEADING)
		.getByRole("list", { name: ANNOUNCEMENTS_HEADING })
		.getByRole("link");
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
	({ siteTitle } = await siteTitleParts(admin));
});

test.afterEach(async () => {
	await borrowed.giveBack(admin);
});

test.afterAll(() => removeSuiteFixtures(admin, { terms: ownedTerms }));

test("with no published content at all, the Homepage still answers with the band, the search and the Contact Summary only", async ({
	page,
}) => {
	await borrowAllContent();
	await withHomepageMenus(admin, EMPTY_MENUS, async () => {
		await withOfficeContact(admin, {}, {}, async () => {
			const response = await page.goto("/");
			expect(response?.status(), "GET / with no content").toBe(200);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
			await expect(sectionHeadings(page)).toHaveText([SEARCH_HEADING, siteTitle]);
			await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
			await expect(page.getByRole("main").getByRole("search")).toBeVisible();

			const contact = section(page, siteTitle);
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

test("closed Announcements alone leave the News section out, and a current one brings it back without a News card", async ({
	page,
}) => {
	await borrowAllContent();
	const closed = await create("announcements", "closed-only", {
		data: { closes_at: CLOSED_AT },
	});
	await publish("announcements", closed);
	await page.goto("/");
	await expect(section(page, NEWS_HEADING)).toHaveCount(0);
	await expect(page.getByRole("main")).not.toContainText(closed.title);

	const current = await create("announcements", "current-only", {
		data: { closes_at: CLOSES_LATER },
	});
	await publish("announcements", current);
	await page.goto("/");
	await expect(section(page, NEWS_HEADING).getByRole("article")).toHaveCount(0);
	await expect(
		section(page, NEWS_HEADING).getByRole("link", { name: "ดูข่าวทั้งหมด" }),
	).toHaveCount(0);
	await expect(announcementLinks(page)).toHaveCount(1);
	await expect(announcementLinks(page)).toHaveAccessibleName(`ดูรายละเอียด ${current.title}`);
	await expect(page.getByRole("main")).not.toContainText(closed.title);
});

test("a News without a current Announcement brings the News section back with its card alone", async ({
	page,
}) => {
	await borrowAllContent();
	const lone = await create("news", "without-announcements");
	await publish("news", lone);
	await page.goto("/");
	const news = section(page, NEWS_HEADING);
	await expect(news.getByRole("article").getByRole("heading", { level: 3 })).toHaveText(lone.title);
	await expect(news.getByRole("list", { name: ANNOUNCEMENTS_HEADING })).toHaveCount(0);
	await expect(news.getByRole("link", { name: "ดูประกาศทั้งหมด" })).toHaveCount(0);
});

test("the band shows the site title and tagline from the site settings, and the title alone without a tagline", async ({
	page,
}) => {
	const marker = crypto.randomUUID().slice(0, 8);
	const title = `${SYNTHETIC_FIXTURE_MARK} ชื่อเว็บไซต์ ${marker}`;
	const tagline = `${SYNTHETIC_FIXTURE_MARK} คำโปรย ${marker}`;
	await withHomepageMenus(admin, { featured: [] }, async () => {
		await withSiteIdentity({ title, tagline }, async () => {
			await page.goto("/");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
			await expect(page.getByRole("main").getByText(tagline, { exact: true })).toBeVisible();
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/`);
			await expect(page.locator('meta[name="description"]')).toHaveAttribute(
				"content",
				CONTACT_LEAD,
			);
		});
		await withSiteIdentity({ title, tagline: "" }, async () => {
			await page.goto("/");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
			await expect(page.getByRole("main")).not.toContainText(tagline);
		});
	});
});

test("the search form submits the query to /search", async ({ page }) => {
	await page.goto("/");
	const search = section(page, SEARCH_HEADING);
	await search.getByLabel("คำค้นหา").fill("วัคซีน");
	await search.getByRole("button", { name: "ค้นหา" }).click();
	await expect(page).toHaveURL(`/search?q=${encodeURIComponent("วัคซีน")}`);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("ค้นหา");
});

test("the News card shows the newest published News with its category, title and summary, and reads it with อ่านข่าว", async ({
	page,
}) => {
	const category = await createTerm("news_category", "ข่าวประชาสัมพันธ์");
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปข่าวล่าสุด ${crypto.randomUUID().slice(0, 6)}`;
	const older = await create("news", "older");
	const newest = await create("news", "newest", {
		data: { summary },
		taxonomies: { news_category: [category.slug] },
	});
	const draft = await create("news", "draft");
	const unpublished = await create("news", "unpublished");
	const trashed = await create("news", "trashed");
	await publish("news", older, newest, unpublished, trashed);
	expect((await unpublishEntry(admin, "news", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "news", trashed.id)).ok, "trash").toBe(true);

	await page.goto("/");
	const card = section(page, NEWS_HEADING).getByRole("article");
	await expect(card).toHaveCount(1);
	await expect(card.getByRole("heading", { level: 3 })).toHaveText(newest.title);
	await expect(card.getByText(category.label, { exact: true })).toBeVisible();
	await expect(card.getByText(summary, { exact: true })).toBeVisible();
	await expect(card.getByRole("link", { name: `อ่านข่าว ${newest.title}` })).toHaveAttribute(
		"href",
		`/news/${newest.slug}`,
	);
	await expect(
		section(page, NEWS_HEADING).getByRole("link", { name: "ดูข่าวทั้งหมด" }),
	).toHaveAttribute("href", "/news");
	for (const hidden of [older, draft, unpublished, trashed]) {
		await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
	}
});

test("up to 3 current Announcements show beside it, newest first by announcement date with the status the list states, and never a closed one or a draft", async ({
	page,
}) => {
	const at = (day: number) => `2032-01-${String(day).padStart(2, "0")}T03:00:00.000Z`;
	const fourth = await create("announcements", "fourth", { data: { announcement_at: at(1) } });
	const third = await create("announcements", "third", {
		data: { announcement_at: at(2), closes_at: CLOSES_LATER },
	});
	const second = await create("announcements", "second", {
		data: { announcement_at: at(3), opens_at: OPENS_LATER, closes_at: CLOSES_LATER },
	});
	const first = await create("announcements", "first", { data: { announcement_at: at(4) } });
	// Announced last, but closed or a draft: neither shows.
	const closed = await create("announcements", "closed", {
		data: { announcement_at: at(5), closes_at: CLOSED_AT },
	});
	const draft = await create("announcements", "draft", { data: { announcement_at: at(6) } });
	await publish("announcements", first, closed, second, fourth, third);

	await page.goto("/");
	const links = announcementLinks(page);
	await expect(links).toHaveCount(3);
	for (const [index, announcement] of [first, second, third].entries()) {
		await expect(links.nth(index)).toHaveAccessibleName(`ดูรายละเอียด ${announcement.title}`);
		await expect(links.nth(index)).toHaveAttribute("href", `/announcements/${announcement.slug}`);
	}
	// Each states its status and dates as the Announcements list does; one without dates, none.
	const items = section(page, NEWS_HEADING)
		.getByRole("list", { name: ANNOUNCEMENTS_HEADING })
		.getByRole("listitem");
	await expect(items.nth(0)).not.toContainText(/ยังไม่เปิด|เปิดอยู่|วันที่/);
	await expect(items.nth(1)).toContainText("ยังไม่เปิด");
	await expect(items.nth(1)).toContainText(`วันที่เริ่มต้น ${thaiDate(OPENS_LATER)}`);
	await expect(items.nth(1)).toContainText(`วันที่สิ้นสุด ${thaiDate(CLOSES_LATER)}`);
	await expect(items.nth(2)).toContainText("เปิดอยู่");
	await expect(items.nth(2)).toContainText(`วันที่สิ้นสุด ${thaiDate(CLOSES_LATER)}`);
	await expect(
		section(page, NEWS_HEADING).getByRole("link", { name: "ดูประกาศทั้งหมด" }),
	).toHaveAttribute("href", "/announcements");
	// Each list link follows its own box: the order a phone shows them in, and a screen reader reads.
	const order = [
		/^อ่านข่าว /,
		/^ดูข่าวทั้งหมด$/,
		/^ดูรายละเอียด /,
		/^ดูรายละเอียด /,
		/^ดูรายละเอียด /,
		/^ดูประกาศทั้งหมด$/,
	];
	const sectionLinks = section(page, NEWS_HEADING).getByRole("link");
	await expect(sectionLinks).toHaveCount(order.length);
	for (const [index, name] of order.entries()) {
		await expect(sectionLinks.nth(index)).toHaveAccessibleName(name);
	}
	for (const hidden of [fourth, closed, draft]) {
		await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
	}
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
	const health = section(page, HEALTH_HEADING);
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
	const discovery = section(page, DISCOVERY_HEADING);
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

test("Activities shows the latest 3 by Activity date, each with its picture or the visual fallback and กิจกรรม • date", async ({
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
	const activities = section(page, ACTIVITIES_HEADING);
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
	for (const hidden of [fourth, undated, draft]) {
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
		const contact = section(page, siteTitle);
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
			const contact = section(page, siteTitle);
			await expect(contact.getByRole("term")).toHaveText(["โทรศัพท์"]);
			await expect(detailOf(page, "โทรศัพท์")).toHaveText("054 591 234 ต่อ 12");
			await expect(detailOf(page, "โทรศัพท์").getByRole("link")).toHaveCount(0);
			await expect(contact.getByRole("link", { name: /เปิดแผนที่/ })).toHaveCount(0);
		},
	);
});

test("with every section showing, the sections follow the Figma order, and the page is accessible and reflows at 320 px", async ({
	page,
}) => {
	// One published entry of each kind, so every section shows whichever tests ran before. The
	// Featured News is published first, so the News card shows the other one.
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
	await publish("health_content", await create("health_content", "every-section"));
	await publish("health_services", await createSyntheticHealthService(admin, "every-section"));
	await publish("activities", await create("activities", "every-section"));
	const service = await createSyntheticService(admin, "every-section", {
		data: { summary: `${SYNTHETIC_FIXTURE_MARK} สรุปบริการ` },
	});
	await publishEntryAt(admin, "services", service.id);
	const menus = {
		featured: [{ label: featured.title, collection: "news", id: featured.id }],
		services: [{ label: service.title, collection: "services", id: service.id }],
		quickAccess: [
			{ label: `${SYNTHETIC_FIXTURE_MARK} เอกสารเผยแพร่`, url: "/documents" },
			{ label: `${SYNTHETIC_FIXTURE_MARK} ข้อมูลสุขภาพ`, url: "/health" },
		],
	};
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
				await page.goto("/");
				await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
				await expect(sectionHeadings(page)).toHaveText([
					featured.title,
					SEARCH_HEADING,
					SERVICES_HEADING,
					NEWS_HEADING,
					HEALTH_HEADING,
					DISCOVERY_HEADING,
					ACTIVITIES_HEADING,
					QUICK_ACCESS_HEADING,
					siteTitle,
				]);
				await expectAccessibleAtEachWidth(page, "/ with every section");
				await page.setViewportSize(MOBILE_VIEWPORT);
				await expectNoHorizontalScroll(page, "/ with every section");
			},
		);
	});
});

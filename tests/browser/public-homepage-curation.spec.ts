// The Homepage's curated sections (#65; spec #51 "Homepage (`04`, Figma order)", approved Q11;
// `04` §5, §6, §10.1 and §17; docs/design/homepage-concept-v1.md §3, §5 and §10).
//
// Staff curate three native menus, and a citizen opening / sees:
//
// - the Featured card in the hero (Feature 008 #241; spec #239 "Hero and Featured"): the first
//   item of the Featured menu that is published content of a kind that can be Featured, as a card
//   with its whole picture or the plain visual, "เรื่องเด่น" with the date its list shows it by,
//   and its title, the whole card a link to it. A closed Announcement is not Featured. With no
//   such item the hero shows no card, and its headline is larger. The Featured item is not
//   repeated as the News card or among the current Announcements. The picture shows whole, a
//   landscape banner and a portrait One Page alike (Feature 006 #146; spec #144 "Homepage
//   (`04`)"), and a title that keeps a long word whole stays inside the card. From 1,024 px the
//   card sits beside the headline without touching it, and below that under it;
// - the Frequently Used Services: the published Services of their menu, in menu order, at most 6,
//   each with its name, summary and the uniform icon, and ทั้งหมด to /services;
// - Quick Access: up to 4 items of its menu, in menu order, each to a page of the site or a
//   published entry, each a label and an arrow. Below 640 px, two to a row, the label lies across
//   the top of its card and the arrow on a row of its own at the lower right, and the card grows
//   with its label (Feature 007 #194; #190 "Compact Homepage Quick Access"). From 640 px the arrow
//   stays beside the label, as it does below 640 px on the full cards of /about, /health and /ita.
//
// An item whose entry is a draft, unpublished or trashed is skipped, so unpublishing an entry takes
// it off the Homepage without a menu edit. So is an item of another kind, and a Quick Access item
// that leads nowhere on the site.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set). Each test sets the menus
// it reads through the native menu API and puts back what they held (cms.helpers.ts
// withHomepageMenus). Fixtures are synthetic entries and pictures, removed afterwards. A test that
// needs its News to be the newest publishes it after every earlier test's fixtures.

import type { Locator, Page } from "@playwright/test";

import {
	SYNTHETIC_FIXTURE_MARK,
	createSyntheticDocument,
	createSyntheticDraft,
	createSyntheticHealthReport,
	createSyntheticHealthService,
	createSyntheticService,
	devAdminActor,
	gradientPng,
	ONE_PAGE_SIZE,
	pickedMenuItem,
	portableTextBlock,
	publishEntryAt,
	removeSuiteFixtures,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPicture,
	withHomepageMenus,
	withOfficeContact,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOMEPAGE_HEADINGS,
	HOMEPAGE_HEADLINE,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	expect,
	expectAccessibleAtEachWidth,
	expectArrowBesideLabel,
	expectImageLoaded,
	expectLabelAboveArrow,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	boxOf,
	expectPictureWhole,
	expectStacked,
	expectVisibleFocusOnEveryStop,
	expectVisuallyHidden,
	homepageSection,
	itemsPerRow,
	occurrencesOf,
	siteTitleParts,
	test,
	thaiDate,
	tokenColor,
} from "./public.helpers";

/** The Featured card's label, which its date follows (spec #239 "Hero and Featured"). */
const FEATURED_LABEL = "เรื่องเด่น";
/** A close date long past, on any calendar. */
const CLOSED_AT = "2026-01-31T10:00:00.000Z";

let admin: CmsActor;
/** The site title the settings name, the page's H1. */
let siteTitle: string;

/** Thai names of each kind of content, for the fixtures' titles. */
const KIND = {
	news: "ข่าว",
	announcements: "ประกาศ",
	health_content: "ความรู้สุขภาพ",
} as const;

/** A synthetic draft of `collection`. Its title is unique, so the page shows it or does not. */
const create = (collection: keyof typeof KIND, label: string, fields?: DraftFields) =>
	createSyntheticDraft(admin, collection, KIND[collection], label, fields);

/** Publish fixtures now, in order. */
async function publish(collection: string, ...fixtures: DraftFixture[]): Promise<void> {
	for (const fixture of fixtures) await publishEntryAt(admin, collection, fixture.id);
}

/** The Featured card, named by the Featured item's title. */
function hero(page: Page, fixture: DraftFixture) {
	return homepageSection(page, fixture.title);
}

/** The hero's headline, the office summary sentence. */
function headline(page: Page) {
	return homepageSection(page, HOMEPAGE_HEADLINE).getByText(HOMEPAGE_HEADLINE, { exact: true });
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
	({ siteTitle } = await siteTitleParts(admin));
});

test.afterAll(() => removeSuiteFixtures(admin));

test("Featured shows the first menu item that is published content of a Featured kind as a card: เรื่องเด่น with its date, its title and its picture, the whole card a link to it", async ({
	page,
}) => {
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปเรื่องเด่น ${crypto.randomUUID().slice(0, 6)}`;
	const draft = await create("news", "featured-draft");
	const trashed = await create("news", "featured-trashed");
	const document = await createSyntheticDocument(admin, "featured-wrong-kind");
	const featured = await create("news", "featured", {
		data: {
			summary,
			featured_image: {
				id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพเรื่องเด่น`),
			},
		},
	});
	await publish("news", trashed);
	const publishedAt = await publishEntryAt(admin, "news", featured.id);
	await publish("documents", document);
	expect((await trashEntry(admin, "news", trashed.id)).ok, "trash").toBe(true);

	await withHomepageMenus(
		admin,
		{
			featured: [
				pickedMenuItem("news", draft),
				pickedMenuItem("news", trashed),
				pickedMenuItem("documents", document),
				pickedMenuItem("news", featured),
			],
		},
		async () => {
			await page.goto("/");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
			const shown = hero(page, featured);
			await expect(shown.getByRole("heading", { level: 2 })).toHaveText(featured.title);
			await expectImageLoaded(shown.locator("img"), "the Featured picture");
			await expect(shown.getByTestId("featured-visual")).toHaveCount(0);
			for (const hidden of [draft, trashed, document]) {
				await expect(page.getByRole("main"), hidden.title).not.toContainText(hidden.title);
			}
			await expectVisuallyHidden(page.getByRole("heading", { level: 1 }), "the site title");
			await expect(headline(page)).toBeVisible();
			await expect(
				shown.getByText(`${FEATURED_LABEL} · ${thaiDate(publishedAt)}`, { exact: true }),
			).toBeVisible();
			await expect(shown.getByRole("link")).toHaveAccessibleName(featured.title);
			await expect(shown.getByRole("link")).toHaveAttribute("href", `/news/${featured.slug}`);
			await expect(shown, "the card leaves the summary to the item's page").not.toContainText(
				summary,
			);
		},
	);
});

test("the Featured picture shows whole inside the card, a landscape banner and a portrait One Page alike, at 375 and 1440 px, and the title names the item", async ({
	page,
}) => {
	const pictures = {
		landscape: gradientPng("#0b6b57", "#f2d17a"),
		portrait: gradientPng("#123c33", "#bae0cf", ONE_PAGE_SIZE),
	};
	for (const [shape, png] of Object.entries(pictures)) {
		const alt = `${SYNTHETIC_FIXTURE_MARK} ภาพเรื่องเด่น ${shape}`;
		const featured = await create("news", `featured-${shape}`, {
			data: { featured_image: { id: await uploadSyntheticPicture(admin, alt, png) } },
		});
		await publish("news", featured);
		await withHomepageMenus(admin, { featured: [pickedMenuItem("news", featured)] }, async () => {
			for (const viewport of [PHONE_VIEWPORT, DESKTOP_VIEWPORT]) {
				const label = `the ${shape} Featured picture at ${viewport.width} px`;
				await page.setViewportSize(viewport);
				await page.goto("/");
				const shown = hero(page, featured);
				await expect(shown.getByRole("heading", { level: 2 }), label).toHaveText(featured.title);
				await expectPictureWhole(shown.locator("img"), label);
				// The card holds the picture: neither a banner nor a One Page reaches past its edges.
				const card = await boxOf(shown.getByRole("link"), `${label}: the card`);
				const picture = await boxOf(shown.locator("img"), label);
				expect(picture.x, `${label}: inside the card's left edge`).toBeGreaterThanOrEqual(card.x);
				expect(
					picture.x + picture.width,
					`${label}: inside the card's right edge`,
				).toBeLessThanOrEqual(card.x + card.width);
			}
		});
	}
});

test("from 1024 to 1088 px a Featured title keeps ความดันโลหิตสูง whole, inside its card", async ({
	page,
}) => {
	// The longest listed word, which a line keeps whole (src/lib/thai-title.ts), in the card at its
	// narrowest beside the headline: lg's two columns at their minimum width (#146 comment
	// 6625101174).
	const alt = `${SYNTHETIC_FIXTURE_MARK} ภาพเรื่องเด่น`;
	const featured = await create("news", "ความดันโลหิตสูง", {
		data: {
			featured_image: {
				id: await uploadSyntheticPicture(admin, alt, gradientPng("#0b6b57", "#f2d17a")),
			},
		},
	});
	await publish("news", featured);
	await withHomepageMenus(admin, { featured: [pickedMenuItem("news", featured)] }, async () => {
		await page.goto("/");
		const title = hero(page, featured).getByRole("heading", { level: 2 });
		await expect(title).toHaveText(featured.title);
		const misplaced: string[] = [];
		for (let width = 1024; width <= 1088; width += 8) {
			await page.setViewportSize({ width, height: 900 });
			const { found, split, outside } = await occurrencesOf(title, "ความดันโลหิตสูง");
			if (found !== 1 || split > 0 || outside > 0) {
				misplaced.push(`at ${width} px: found ${found}, split ${split}, outside ${outside}`);
			}
		}
		expect(misplaced, "ความดันโลหิตสูง in the Featured title").toEqual([]);
	});
});

test("an Announcement without a picture is Featured with the plain visual and its announcement date, is not repeated among the current Announcements, and its Thai address opens it", async ({
	page,
}) => {
	const ending = "ท้ายรายละเอียด";
	const announcedAt = "2026-09-24T03:00:00.000Z";
	const announcement = await create("announcements", "เรื่องเด่น", {
		data: {
			announcement_at: announcedAt,
			details: [portableTextBlock(`${SYNTHETIC_FIXTURE_MARK} เปิดรับสมัคร ${ending}`)],
		},
	});
	await publish("announcements", announcement);

	await withHomepageMenus(
		admin,
		{ featured: [pickedMenuItem("announcements", announcement)] },
		async () => {
			await page.goto("/");
			const shown = hero(page, announcement);
			await expect(shown.getByRole("heading", { level: 2 })).toHaveText(announcement.title);
			await expect(shown.locator("img")).toHaveCount(0);
			await expect(shown.getByTestId("featured-visual")).toHaveCount(1);
			// The newest current Announcement, so the list beside the News card would lead with it.
			await expect(
				page.getByRole("main").getByRole("link", { name: `ดูรายละเอียด ${announcement.title}` }),
			).toHaveCount(0);
			await expect(
				shown.getByText(`${FEATURED_LABEL} · ${thaiDate(announcedAt)}`, { exact: true }),
				"the date the Announcements list shows it by, not its publication",
			).toBeVisible();
			await expect(shown, "the card leaves the details out").not.toContainText(ending);
			await expectAccessibleAtEachWidth(page, "/ with the Featured visual");
			await page.setViewportSize(MOBILE_VIEWPORT);
			await expectNoHorizontalScroll(page, "/ with the Featured visual");
			await page.setViewportSize(DESKTOP_VIEWPORT);
			const link = shown.getByRole("link", { name: announcement.title });
			await expect(link).toHaveAttribute(
				"href",
				`/announcements/${encodeURIComponent(announcement.slug)}`,
			);
			await link.click();
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(announcement.title);
		},
	);
});

test("a Featured Service shows เรื่องเด่น without a date", async ({ page }) => {
	const service = await createSyntheticService(admin, "featured-undated");
	await publish("services", service);
	await withHomepageMenus(admin, { featured: [pickedMenuItem("services", service)] }, async () => {
		await page.goto("/");
		const shown = hero(page, service);
		await expect(shown.getByRole("heading", { level: 2 })).toHaveText(service.title);
		await expect(shown.getByText(FEATURED_LABEL, { exact: true })).toBeVisible();
		await expect(shown.getByRole("time")).toHaveCount(0);
	});
});

test("with nothing in the Featured menu to show, the hero shows its headline alone, larger, with no card", async ({
	page,
}) => {
	const draft = await create("news", "band-draft");
	const facility = await createSyntheticHealthService(admin, "band-wrong-kind");
	await publish("health_services", facility);
	const featured = await create("news", "headline-with-card");
	await publish("news", featured);

	/** The headline's font size in px at `width`, as the page is now. */
	const headlineSize = async (width: number) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto("/");
		return headline(page).evaluate((element) =>
			Number.parseFloat(getComputedStyle(element).fontSize),
		);
	};
	const beside: Record<number, number> = {};
	await withHomepageMenus(admin, { featured: [pickedMenuItem("news", featured)] }, async () => {
		for (const width of [1440, 768]) beside[width] = await headlineSize(width);
	});

	await withHomepageMenus(
		admin,
		{
			featured: [
				pickedMenuItem("news", draft),
				pickedMenuItem("health_services", facility),
				{ label: "เอกสารเผยแพร่", url: "/documents" },
			],
		},
		async () => {
			await page.goto("/");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteTitle);
			await expect(page.getByRole("main").getByTestId("featured-visual")).toHaveCount(0);
			const shown = homepageSection(page, HOMEPAGE_HEADLINE);
			await expectVisuallyHidden(page.getByRole("heading", { level: 1 }), "the site title");
			await expect(headline(page)).toBeVisible();
			await expect(shown.getByText(FEATURED_LABEL)).toHaveCount(0);
			await expect(shown.getByRole("link")).toHaveCount(0);
			await expect(shown.getByRole("heading", { level: 2 })).toHaveCount(0);
			for (const width of [1440, 768]) {
				expect(
					await headlineSize(width),
					`the headline alone at ${width} px against ${beside[width]} px beside a card`,
				).toBeGreaterThan(beside[width]!);
			}
		},
	);
});

test("a closed Announcement is not Featured, and the next item in the menu is", async ({
	page,
}) => {
	const closed = await create("announcements", "featured-closed", {
		data: { closes_at: CLOSED_AT },
	});
	const service = await createSyntheticService(admin, "featured-after-closed");
	await publish("announcements", closed);
	await publish("services", service);

	await withHomepageMenus(
		admin,
		{
			featured: [pickedMenuItem("announcements", closed), pickedMenuItem("services", service)],
		},
		async () => {
			await page.goto("/");
			await expect(hero(page, service).getByRole("heading", { level: 2 })).toHaveText(
				service.title,
			);
			await expect(page.getByRole("main")).not.toContainText(closed.title);
		},
	);
});

test("unpublishing the Featured entry takes it off the Homepage without a menu edit, and the hero shows its headline alone", async ({
	page,
}) => {
	const report = await createSyntheticHealthReport(admin, "featured-then-unpublished", {
		data: { summary: `${SYNTHETIC_FIXTURE_MARK} สรุปรายงานสุขภาพ` },
	});
	await publish("health_reports", report);

	await withHomepageMenus(
		admin,
		{ featured: [pickedMenuItem("health_reports", report)] },
		async () => {
			await page.goto("/");
			await expect(hero(page, report).getByRole("heading", { level: 2 })).toHaveText(report.title);

			expect((await unpublishEntry(admin, "health_reports", report.id)).ok, "unpublish").toBe(true);
			await page.goto("/");
			await expect(page.getByRole("main")).not.toContainText(report.title);
			await expect(headline(page)).toBeVisible();
		},
	);
});

test("the Featured News is not repeated as the News card, which shows the next newest News", async ({
	page,
}) => {
	const next = await create("news", "next-newest");
	const featured = await create("news", "featured-newest");
	await publish("news", next, featured);

	await withHomepageMenus(admin, { featured: [pickedMenuItem("news", featured)] }, async () => {
		await page.goto("/");
		await expect(hero(page, featured).getByRole("heading", { level: 2 })).toHaveText(
			featured.title,
		);
		const news = homepageSection(page, HOMEPAGE_HEADINGS.news);
		await expect(news.getByRole("article").getByRole("heading", { level: 3 })).toHaveText(
			next.title,
		);
		await expect(news).not.toContainText(featured.title);
	});
});

/** The widths on both sides of `lg` and of `sm`, and the two phone widths (#241). */
const FIT_WIDTHS = [1024, 1023, 640, 639, 375, 320];

test("the headline reads the office summary with ด้านสุขภาพ in accent-warm, on three lines from 1,024 px, clear of the Featured card beside it and above the card below 1,024 px, and the hero fits each width", async ({
	page,
}) => {
	const featured = await create("news", "ความดันโลหิตสูง-beside-headline", {
		data: {
			featured_image: {
				id: await uploadSyntheticPicture(admin, `${SYNTHETIC_FIXTURE_MARK} ภาพเรื่องเด่น`),
			},
		},
	});
	await publish("news", featured);
	/** How many lines the headline takes: its height over its line height. */
	const lines = () =>
		headline(page).evaluate((element) =>
			Math.round(
				element.getBoundingClientRect().height /
					Number.parseFloat(getComputedStyle(element).lineHeight),
			),
		);
	await withHomepageMenus(admin, { featured: [pickedMenuItem("news", featured)] }, async () => {
		await page.goto("/");
		const card = hero(page, featured);
		await expect(headline(page)).toBeVisible();
		await expect(headline(page).getByText("ด้านสุขภาพ", { exact: true })).toHaveCSS(
			"color",
			await tokenColor(page, "accent-warm"),
		);
		for (const width of [1440, 1024]) {
			await page.setViewportSize({ width, height: 900 });
			expect(await lines(), `the headline's lines at ${width} px`).toBe(3);
			const text = await boxOf(headline(page), `the headline at ${width} px`);
			expect(
				await headline(page).evaluate((element) => element.scrollWidth - element.clientWidth),
				`no line of the headline runs past its column at ${width} px`,
			).toBeLessThanOrEqual(0);
			const beside = await boxOf(card, `the Featured card at ${width} px`);
			expect(
				text.x + text.width,
				`the headline ends before the Featured card at ${width} px`,
			).toBeLessThanOrEqual(beside.x);
		}
		await page.setViewportSize({ width: 1023, height: 900 });
		await expectStacked("at 1023 px", [
			["the headline", headline(page)],
			["the search", page.getByRole("main").getByRole("search")],
			["the Featured card", card],
		]);
		for (const width of FIT_WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			await expectNoHorizontalScroll(page, `/ with a Featured card at ${width} px`);
			for (const [name, part] of [
				["the headline", headline(page)],
				["the search", page.getByRole("main").getByRole("search")],
				["the Featured card", card.getByRole("link")],
			] as const) {
				const box = await boxOf(part, `${name} at ${width} px`);
				expect(box.x, `${name} starts inside the window at ${width} px`).toBeGreaterThanOrEqual(0);
				expect(
					box.x + box.width,
					`${name} ends inside the window at ${width} px`,
				).toBeLessThanOrEqual(width);
			}
		}
	});
	await withHomepageMenus(admin, { featured: [] }, async () => {
		await page.goto("/");
		for (const width of FIT_WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			await expectNoHorizontalScroll(page, `/ with nothing Featured at ${width} px`);
		}
		await page.setViewportSize({ width: 1024, height: 900 });
		expect(await lines(), "the headline's lines alone at 1024 px").toBe(3);
	});
});

test("the hero's search has an accessible name and a 44 px submit button at each width, and submits its query to the site search", async ({
	page,
}) => {
	await page.goto("/");
	const search = homepageSection(page, HOMEPAGE_HEADLINE).getByRole("search");
	const field = search.getByRole("searchbox", { name: "ค้นหาในเว็บไซต์" });
	const submit = search.getByRole("button", { name: "ค้นหา" });
	for (const width of [1440, 640, 639, 320]) {
		await page.setViewportSize({ width, height: 900 });
		const box = await boxOf(submit, `the submit button at ${width} px`);
		expect(
			Math.min(box.width, box.height),
			`the submit button's smaller side at ${width} px`,
		).toBeGreaterThanOrEqual(44);
	}
	await field.fill("วัคซีน");
	await submit.click();
	await expect(page).toHaveURL(`/search?q=${encodeURIComponent("วัคซีน")}`);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("ค้นหา");
});

test("the hero shows no telephone number and no hours, with or without a Featured card", async ({
	page,
}) => {
	const telephone = "054 591 234";
	const hours = "จันทร์–ศุกร์ 08:30–16:30 น.";
	const featured = await create("news", "hero-without-contact");
	await publish("news", featured);
	await withOfficeContact(admin, { telephone, opening_hours: hours }, {}, async () => {
		for (const menu of [[pickedMenuItem("news", featured)], []]) {
			await withHomepageMenus(admin, { featured: menu }, async () => {
				await page.goto("/");
				await expect(page.getByRole("main"), "the Contact Summary").toContainText(telephone);
				const shown = homepageSection(page, HOMEPAGE_HEADLINE);
				await expect(shown).toBeVisible();
				await expect(shown).not.toContainText(telephone);
				await expect(shown).not.toContainText(hours);
			});
		}
	});
});

test("a section heading's link reads ทั้งหมด, is named with its section and opens the section's list, and below 640 px is a round arrow button with the same name", async ({
	page,
}) => {
	const service = await createSyntheticService(admin, "heading-link");
	const health = await create("health_content", "heading-link");
	await publish("services", service);
	await publish("health_content", health);
	const lists = [
		[HOMEPAGE_HEADINGS.services, "/services"],
		[HOMEPAGE_HEADINGS.health, "/health/content"],
	] as const;
	await withHomepageMenus(admin, { services: [pickedMenuItem("services", service)] }, async () => {
		await page.goto("/");
		for (const [heading, href] of lists) {
			const section = homepageSection(page, heading);
			const link = section.getByRole("link", { name: `ดู${heading}ทั้งหมด`, exact: true });
			await expect(section.getByRole("heading", { level: 2 })).toHaveText(heading);
			await page.setViewportSize({ width: 640, height: 900 });
			await expect(link).toHaveAttribute("href", href);
			await expect(link.getByText("ทั้งหมด", { exact: true })).toBeVisible();
			const pill = await boxOf(link, `the ${heading} link at 640 px`);
			expect(pill.width, `the ${heading} link shows its text at 640 px`).toBeGreaterThan(
				pill.height,
			);
			await page.setViewportSize({ width: 639, height: 900 });
			await expect(link, `the ${heading} link at 639 px`).toHaveAccessibleName(
				`ดู${heading}ทั้งหมด`,
			);
			const round = await boxOf(link, `the ${heading} link at 639 px`);
			expect(round.width, `the ${heading} link is as wide as it is high at 639 px`).toBeCloseTo(
				round.height,
				0,
			);
			expect(round.width, `the ${heading} link's target at 639 px`).toBeGreaterThanOrEqual(44);
			await expect(
				link.getByText("ทั้งหมด", { exact: true }),
				`the ${heading} link's text at 639 px`,
			).toBeHidden();
		}
	});
});

test("the Frequently Used Services are the menu's published Services, in menu order, at most 6, each with its name, summary and icon", async ({
	page,
}) => {
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปบริการที่ใช้บ่อย`;
	const services: DraftFixture[] = [];
	for (let index = 1; index <= 7; index++) {
		services.push(
			await createSyntheticService(admin, `frequent-${index}`, {
				data: index === 1 ? { summary } : {},
			}),
		);
	}
	const draft = await createSyntheticService(admin, "frequent-draft");
	const trashed = await createSyntheticService(admin, "frequent-trashed");
	const news = await create("news", "frequent-wrong-kind");
	await publish("services", ...services, trashed);
	await publish("news", news);
	expect((await trashEntry(admin, "services", trashed.id)).ok, "trash").toBe(true);
	const [first, second, third, fourth, fifth, sixth, seventh] = services as [
		DraftFixture,
		DraftFixture,
		DraftFixture,
		DraftFixture,
		DraftFixture,
		DraftFixture,
		DraftFixture,
	];

	await withHomepageMenus(
		admin,
		{
			services: [
				pickedMenuItem("services", first),
				pickedMenuItem("news", news),
				pickedMenuItem("services", draft),
				pickedMenuItem("services", second),
				pickedMenuItem("services", trashed),
				...[third, fourth, fifth, sixth, seventh].map((service) =>
					pickedMenuItem("services", service),
				),
			],
		},
		async () => {
			await page.goto("/");
			const frequent = homepageSection(page, HOMEPAGE_HEADINGS.services);
			const shown = [first, second, third, fourth, fifth, sixth];
			await expect(frequent.getByRole("heading", { level: 3 })).toHaveText(
				shown.map(({ title }) => title),
			);
			for (const service of shown) {
				await expect(frequent.getByRole("link", { name: service.title })).toHaveAttribute(
					"href",
					`/services/${service.slug}`,
				);
			}
			await expect(frequent.getByTestId("service-icon")).toHaveCount(6);
			await expect(
				frequent.getByRole("article").filter({ hasText: first.title }).getByText(summary),
			).toBeVisible();
			await expect(
				frequent.getByRole("link", { name: `ดู${HOMEPAGE_HEADINGS.services}ทั้งหมด` }),
			).toHaveAttribute("href", "/services");
			for (const hidden of [seventh, draft, trashed, news]) {
				await expect(frequent, hidden.title).not.toContainText(hidden.title);
			}
		},
	);
});

test("Quick Access shows up to 4 items in menu order, each to a page of the site or a published entry, as a label and an arrow", async ({
	page,
}) => {
	const document = await createSyntheticDocument(admin, "quick-access");
	const withdrawn = await create("health_content", "quick-access-unpublished");
	await publish("documents", document);
	await publish("health_content", withdrawn);
	expect((await unpublishEntry(admin, "health_content", withdrawn.id)).ok, "unpublish").toBe(true);

	await withHomepageMenus(
		admin,
		{
			quickAccess: [
				{ label: "เอกสารเผยแพร่", url: "/documents" },
				pickedMenuItem("health_content", withdrawn),
				pickedMenuItem("documents", document),
				{ label: "ระบบภายนอก", url: "https://example.org/eservice" },
				{ label: "หน้าที่ไม่มีอยู่", url: "/songhealth-unknown-quick-access" },
				{ label: "ข่าวสุขภาพ", url: "/news/health" },
				{ label: "ข้อมูลสุขภาพ", url: "/health" },
				{ label: "ติดต่อเรา", url: "/contact" },
			],
		},
		async () => {
			await page.goto("/");
			const quickAccess = homepageSection(page, HOMEPAGE_HEADINGS.quickAccess);
			const links = quickAccess.getByRole("link");
			const expected = [
				["เอกสารเผยแพร่", "/documents"],
				[document.title, `/documents/${document.slug}`],
				["ข่าวสุขภาพ", "/news/health"],
				["ข้อมูลสุขภาพ", "/health"],
			];
			await expect(links).toHaveCount(expected.length);
			for (const [index, [name, href]] of expected.entries()) {
				await expect(links.nth(index)).toHaveAccessibleName(name!);
				await expect(links.nth(index)).toHaveAttribute("href", href!);
			}
			for (const hidden of [withdrawn.title, "ระบบภายนอก", "หน้าที่ไม่มีอยู่", "ติดต่อเรา"]) {
				await expect(quickAccess, hidden).not.toContainText(hidden);
			}
		},
	);
});

/** Shortcuts of the kind staff pick, each to a page of the site headed by its label. */
const SHORTCUTS = [
	{ label: "เอกสารเผยแพร่", url: "/documents" },
	{ label: "ข้อมูลสุขภาพ", url: "/health" },
	{ label: "ข่าวสุขภาพ", url: "/news/health" },
	{ label: "ติดต่อเรา", url: "/contact" },
];

/** The Homepage's Quick Access cards, in the order they show. */
function quickAccessCards(page: Page) {
	return homepageSection(page, HOMEPAGE_HEADINGS.quickAccess).getByRole("link");
}

/**
 * Fail on an axe violation, a focus stop that does not show, or sideways scrolling, as laid out
 * now.
 */
async function expectQuickAccessAccessible(page: Page, label: string): Promise<void> {
	await expectNoAxeViolations(page, label);
	await expectVisibleFocusOnEveryStop(page, label);
	await expectNoHorizontalScroll(page, label);
}

for (const width of [320, 375, 639]) {
	test(`at ${width} px Quick Access stays two cards to a row, each with its label across the top and its arrow on a row of its own at the lower right`, async ({
		page,
	}) => {
		await withHomepageMenus(admin, { quickAccess: SHORTCUTS }, async () => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto("/");
			const cards = quickAccessCards(page);
			await expect(cards).toHaveCount(SHORTCUTS.length);
			const items = homepageSection(page, HOMEPAGE_HEADINGS.quickAccess).getByRole("listitem");
			expect(await itemsPerRow(items), "two cards to a row").toEqual([2, 2]);
			for (const [index, { label, url }] of SHORTCUTS.entries()) {
				const card = cards.nth(index);
				await expect(card).toHaveAccessibleName(label);
				await expect(card).toHaveAttribute("href", url);
				await expect(card).toHaveCSS("font-size", "16px");
				await expect(card).toHaveCSS("border-top-width", "1px");
				await expect(card).toHaveCSS("border-top-left-radius", "18px");
				await expect(card).not.toHaveCSS("box-shadow", "none");
				await expectLabelAboveArrow(card, `${label} at ${width} px`);
			}
			await cards.first().focus();
			await page.keyboard.press("Tab");
			await expect(cards.nth(1), "a card is one keyboard stop").toBeFocused();
			await expect(cards.nth(1)).toHaveCSS("outline-width", "3px");
			await expectQuickAccessAccessible(page, `Quick Access at ${width} px`);
		});
	});
}

/**
 * The six words titles keep whole that are widest at body size, semibold
 * (scripts/thai-title-widths.ts), as labels of real pages. The Homepage shows 4 shortcuts at most,
 * so they take two menus.
 */
const LONG_WORD_MENUS = [
	[
		{ label: "ความดันโลหิตสูง", url: "/health" },
		{ label: "ตรวจคัดกรอง", url: "/services" },
		{ label: "ออกกำลังกาย", url: "/news/health" },
		{ label: "ประชาสัมพันธ์", url: "/news" },
	],
	[
		{ label: "ความดันโลหิต", url: "/health" },
		{ label: "ประจำหมู่บ้าน", url: "/services" },
	],
];

for (const width of [320, 375, 639, 640]) {
	test(`at ${width} px a Quick Access label keeps the widest listed words whole, inside its card and clear of its arrow`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 });
		const expectLayout = width < 640 ? expectLabelAboveArrow : expectArrowBesideLabel;
		for (const quickAccess of LONG_WORD_MENUS) {
			await withHomepageMenus(admin, { quickAccess }, async () => {
				await page.goto("/");
				const cards = quickAccessCards(page);
				await expect(cards).toHaveCount(quickAccess.length);
				for (const [index, { label, url }] of quickAccess.entries()) {
					const card = cards.nth(index);
					await expect(card).toHaveAccessibleName(label);
					await expect(card).toHaveAttribute("href", url);
					// Its holder is the card, so "outside" is measured against the card's content box.
					expect(
						await occurrencesOf(card.locator(":scope > span"), label),
						`${label} at ${width} px`,
					).toEqual({ found: 1, split: 0, outside: 0 });
					await expectLayout(card, `${label} at ${width} px`);
				}
				await expectNoHorizontalScroll(page, `long Quick Access labels at ${width} px`);
			});
		}
	});
}

test("at 320 px a Quick Access label that wraps makes its row of cards taller, with no one fixed height, and every arrow stays at its card's lower right", async ({
	page,
}) => {
	const quickAccess = [
		SHORTCUTS[0]!,
		SHORTCUTS[1]!,
		{ label: "คลินิกความดันโลหิตสูงประจำหมู่บ้านและการตรวจคัดกรองเบาหวาน", url: "/services" },
		SHORTCUTS[3]!,
	];
	await withHomepageMenus(admin, { quickAccess }, async () => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		await page.goto("/");
		const cards = quickAccessCards(page);
		await expect(cards).toHaveCount(quickAccess.length);
		const heights = await cards.evaluateAll((links) =>
			links.map((link) => link.getBoundingClientRect().height),
		);
		expect(heights[1], "the cards of a row are one height").toBeCloseTo(heights[0]!, 0);
		expect(heights[3], "the cards of a row are one height").toBeCloseTo(heights[2]!, 0);
		expect(heights[2]! - heights[0]!, "the wrapped label's row is taller").toBeGreaterThan(20);
		for (const [index, { label }] of quickAccess.entries()) {
			await expectLabelAboveArrow(cards.nth(index), label);
		}
	});
});

for (const width of [640, 1440]) {
	test(`at ${width} px a Quick Access card keeps its arrow beside its label at the H3 size`, async ({
		page,
	}) => {
		await withHomepageMenus(admin, { quickAccess: SHORTCUTS }, async () => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto("/");
			const cards = quickAccessCards(page);
			await expect(cards).toHaveCount(SHORTCUTS.length);
			for (const [index, { label }] of SHORTCUTS.entries()) {
				await expect(cards.nth(index)).toHaveCSS("font-size", "24px");
				await expect(cards.nth(index)).toHaveCSS("min-height", "88px");
				await expectArrowBesideLabel(cards.nth(index), `${label} at ${width} px`);
			}
			await expectQuickAccessAccessible(page, `Quick Access at ${width} px`);
		});
	});
}

/** Fail unless every shortcut opens its page natively, from its arrow and by Enter. */
async function expectShortcutsOpen(page: Page): Promise<void> {
	await page.setViewportSize(MOBILE_VIEWPORT);
	for (const { label, url } of SHORTCUTS) {
		for (const open of [
			(card: Locator) => card.locator("svg").click(),
			(card: Locator) => card.press("Enter"),
		]) {
			await page.goto("/");
			await open(
				homepageSection(page, HOMEPAGE_HEADINGS.quickAccess).getByRole("link", {
					name: label,
					exact: true,
				}),
			);
			await expect(page).toHaveURL(url);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(label);
		}
	}
}

test("at 320 px each Quick Access card opens its page from its arrow and by Enter", async ({
	page,
}) => {
	await withHomepageMenus(admin, { quickAccess: SHORTCUTS }, () => expectShortcutsOpen(page));
});

test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("at 320 px each Quick Access card opens its page from its arrow and by Enter", async ({
		page,
	}) => {
		await withHomepageMenus(admin, { quickAccess: SHORTCUTS }, () => expectShortcutsOpen(page));
	});
});

for (const [path, name] of [
	["/about", "โครงสร้างองค์กร"],
	["/health", "ความรู้สุขภาพ"],
] as const) {
	for (const width of [320, 639]) {
		test(`at ${width} px a Quick Link card on ${path} keeps its arrow beside its label at the H3 size`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(path);
			const card = page.getByRole("main").getByRole("link", { name, exact: true });
			await expect(card).toHaveCSS("font-size", "24px");
			await expectArrowBesideLabel(card, `${path} at ${width} px`);
		});
	}
}

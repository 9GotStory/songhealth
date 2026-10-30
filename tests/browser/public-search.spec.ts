// Search (#63; spec #51 "Search", ADR 0002, `08`).
//
// A citizen searches all public content at /search. Thai matches as a substring without word
// spaces, title matches rank above body-only matches, and results are grouped (ข่าวสาร,
// บริการประชาชน, ข้อมูลสุขภาพ, หน่วยบริการ, เอกสาร, เกี่ยวกับเรา) with a count and a filter per
// group. Each result shows its title, its kind in Thai, a plain-text snippet, a date or status, and
// links to its canonical address; the reserved Basic Pages link to their /about addresses. The
// query, group and page live in the address. Drafts, trashed and unpublished entries never appear,
// even straight after an unpublish. A query that is too short and one that finds nothing each say
// so in their own words.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic entries of every searchable collection made through the native
// API and removed afterwards. Each test searches for a word of random Thai letters that only its
// own fixtures carry, so the runtime's other content (the demo dataset, the Product Owner's own)
// never shows in its results.
//
// The error state is not driven here: the shared development runtime offers no way to make the
// search's reads fail without a fault seam in the page.

import type { Page } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	createPatActor,
	createSyntheticDocument,
	createSyntheticDraft,
	createSyntheticEntry,
	createSyntheticHealthService,
	createSyntheticService,
	loadDevAccessToken,
	NATIVE_ROLES,
	nativeItemOf,
	nativeRefusalOf,
	portableTextBlock,
	publishEntryAt,
	readEntry,
	SYNTHETIC_FIXTURE_MARK,
	trashEntry,
	unpublishEntry,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	VIEWPORTS,
	expect,
	expectBreadcrumb,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	HOME_CRUMB,
	listedItem,
	listedTitles,
	ownTitles,
	test,
	thaiDate,
} from "./public.helpers";

/** The fixed number of results a page shows. */
const PAGE_SIZE = 20;

/** Text a citizen-facing state must never show: what an exception, a stack or a database says. */
const INTERNAL_DETAIL =
	/error|exception|stack|undefined|null|sql|select |postgres|emdash|\.ts\b|at .+:\d+/i;

let admin: CmsActor;

/** A word of six random Thai consonants, which only the running test's fixtures carry. */
function thaiWord(): string {
	const letters = "กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ";
	return Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join(
		"",
	);
}

/** A synthetic draft of `collection` whose title names it as `kind`. */
const createDraft = (collection: string, kind: string, label: string, fields: DraftFields = {}) =>
	createSyntheticDraft(admin, collection, kind, label, fields);

/** Publish now, or backdated to `publishedAt`. Returns the stored publication instant. */
const publish = (collection: string, fixture: DraftFixture, publishedAt?: string) =>
	publishEntryAt(admin, collection, fixture.id, publishedAt);

/** Open /search with these query parameters, and fail unless it answers 200. */
async function search(page: Page, params: Record<string, string>): Promise<void> {
	const path = `/search?${new URLSearchParams(params)}`;
	const response = await page.goto(path);
	expect(response?.status(), `GET ${path}`).toBe(200);
}

/** The group filter's link to `label` with its count. */
function groupLink(page: Page, label: string, count: number) {
	return page
		.getByRole("navigation", { name: "กลุ่มผลการค้นหา" })
		.getByRole("link", { name: `${label} ${count} รายการ`, exact: true });
}

/** The search box of the page's search form. */
const searchBox = (page: Page) =>
	page.getByRole("search").getByRole("searchbox", { name: "คำค้นหา" });

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async ({}, testInfo) => {
	const baseURL = testInfo.project.use.baseURL;
	if (baseURL === undefined) {
		throw new Error("this suite needs a configured baseURL (PLAYWRIGHT_BASE_URL)");
	}
	admin = await createPatActor({
		baseUrl: new URL(baseURL).origin,
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
});

test.afterAll(async () => {
	if (admin === undefined) return;
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	expect(report.complete, `owned fixtures left: ${JSON.stringify(report)}`).toBe(true);
});

test("a Thai substring finds a title without word spaces, a title match ranks above a body-only match, and a result shows its kind, snippet, date and address", async ({
	page,
}) => {
	const word = thaiWord();
	const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปข่าวรณรงค์ในชุมชน`;
	const titled = await createDraft("news", `ข่าวรณรงค์${word}ชุมชน`, "title-hit", {
		data: { summary },
	});
	const bodyOnly = await createDraft("news", "ข่าว", "body-hit", {
		data: { body: [portableTextBlock(`เจ้าหน้าที่ลงพื้นที่ตำบลสอง${word}ร่วมกับ อสม.`)] },
	});
	// The title match is the older, so only its tier puts it first.
	const titledAt = await publish("news", titled, "2026-01-05T03:00:00.000Z");
	await publish("news", bodyOnly);

	const across = `งค์${word}ชุม`;
	await search(page, { q: across });
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("ค้นหา");
	await expectBreadcrumb(page, [HOME_CRUMB], "ค้นหา");
	await expect(searchBox(page)).toHaveValue(across);
	expect(
		ownTitles(await listedTitles(page), [titled, bodyOnly]),
		"a substring across Thai words, typed without spaces",
	).toEqual([titled.title]);

	await search(page, { q: word });
	expect(ownTitles(await listedTitles(page), [titled, bodyOnly]), "the title match first").toEqual([
		titled.title,
		bodyOnly.title,
	]);
	await expect(page.getByRole("main")).toContainText("พบ 2 รายการ");

	const row = listedItem(page, titled.title);
	await expect(row.getByRole("link", { name: titled.title })).toHaveAttribute(
		"href",
		`/news/${titled.slug}`,
	);
	await expect(row).toContainText("ข่าว");
	await expect(row).toContainText(thaiDate(titledAt));
	await expect(row, "a title match shows the summary").toContainText(summary);

	const body = listedItem(page, bodyOnly.title);
	await expect(body, "a body match shows the text around it").toContainText(
		`ตำบลสอง${word}ร่วมกับ`,
	);
	await expect(body.locator("mark"), "the matched word is marked").toHaveText(word);
});

test("results are grouped with a count each, and the query, group and page stay in the address through reload, back and forward", async ({
	page,
}) => {
	const word = thaiWord();
	const named = `เรื่อง${word}`;
	const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
	const activity = await createDraft("activities", `กิจกรรม${named}`, "group-activity");
	const announcement = await createDraft("announcements", `ประกาศ${named}`, "group-announcement", {
		data: { closes_at: lastWeek },
	});
	const service = await createSyntheticService(admin, "group-service", { name: `บริการ${named}` });
	const healthService = await createSyntheticHealthService(admin, "group-health-service", {
		displayName: `รพ.สต.${named}`,
		data: { operational_status: "temporarily_closed" },
	});
	const content = await createDraft("health_content", `ความรู้${named}`, "group-content");
	const document = await createSyntheticDocument(admin, "group-document", {
		data: { summary: `เอกสาร${named}`, domain_status: "superseded" },
	});
	const report = await createDraft("health_reports", `รายงาน${named}`, "group-report", {
		references: { report_document: [document.id] },
	});
	const basicPage = await createDraft("pages", `หน้า${named}`, "group-page");
	const news: DraftFixture[] = [];
	for (let index = 0; index < 21; index += 1) {
		news.push(await createDraft("news", `ข่าว${named}`, `group-news-${index}`));
	}
	const kinds: Array<[collection: string, fixture: DraftFixture, kind: string, href: string]> = [
		["activities", activity, "กิจกรรม", `/activities/${activity.slug}`],
		["announcements", announcement, "ประกาศ", `/announcements/${announcement.slug}`],
		["services", service, "บริการประชาชน", `/services/${service.slug}`],
		[
			"health_services",
			healthService,
			"หน่วยบริการสุขภาพ",
			`/health-services/${healthService.slug}`,
		],
		["health_content", content, "ความรู้สุขภาพ", `/health/content/${content.slug}`],
		["documents", document, "เอกสารเผยแพร่", `/documents/${document.slug}`],
		["health_reports", report, "รายงานสุขภาพ", `/health/reports/${report.slug}`],
		["pages", basicPage, "หน้าข้อมูล", `/pages/${basicPage.slug}`],
	];
	for (const [collection, fixture] of kinds) await publish(collection, fixture);
	// The News are published last, so they are the newest and lead ทุกประเภท.
	for (const item of news) await publish("news", item);

	await search(page, { q: named });
	for (const [label, count] of [
		["ทุกประเภท", 29],
		["ข่าวสาร", 23],
		["บริการประชาชน", 1],
		["ข้อมูลสุขภาพ", 2],
		["หน่วยบริการ", 1],
		["เอกสาร", 1],
		["เกี่ยวกับเรา", 1],
	] as const) {
		await expect(groupLink(page, label, count), `${label} counts ${count}`).toBeVisible();
	}
	await expect(groupLink(page, "ทุกประเภท", 29)).toHaveAttribute("aria-current", "true");
	await expect(page.getByRole("main")).toContainText("พบ 29 รายการ");
	expect(await listedTitles(page), "a page shows a fixed number of results").toHaveLength(
		PAGE_SIZE,
	);

	await page.getByRole("link", { name: "หน้าถัดไป" }).click();
	await expect(page).toHaveURL(`/search?${new URLSearchParams({ q: named, page: "2" })}`);
	for (const [, fixture, kind, href] of kinds) {
		const row = listedItem(page, fixture.title);
		await expect(row.getByRole("link", { name: fixture.title }), kind).toHaveAttribute(
			"href",
			href,
		);
		await expect(row, kind).toContainText(kind);
	}
	await expect(listedItem(page, announcement.title)).toContainText("ปิดแล้ว");
	await expect(listedItem(page, healthService.title)).toContainText("ปิดให้บริการชั่วคราว");
	await expect(listedItem(page, document.title)).toContainText("ถูกแทนที่แล้ว");

	await page.goto(`/search?${new URLSearchParams({ q: named })}`);
	await groupLink(page, "ข่าวสาร", 23).click();
	const newsGroup = `/search?${new URLSearchParams({ q: named, group: "news" })}`;
	await expect(page).toHaveURL(newsGroup);
	await expect(groupLink(page, "ข่าวสาร", 23)).toHaveAttribute("aria-current", "true");
	await expect(page.getByRole("main")).toContainText("พบ 23 รายการในกลุ่มข่าวสาร");
	await page.getByRole("link", { name: "หน้าถัดไป" }).click();
	const newsPage2 = `/search?${new URLSearchParams({ q: named, group: "news", page: "2" })}`;
	await expect(page).toHaveURL(newsPage2);
	const secondPage = ownTitles(await listedTitles(page), [...news, activity, announcement]);
	expect(secondPage, "the rest of ข่าวสาร").toHaveLength(3);
	expect(secondPage, "only ข่าวสาร's kinds").toEqual(
		expect.arrayContaining([activity.title, announcement.title]),
	);

	await page.reload();
	await expect(searchBox(page)).toHaveValue(named);
	expect(ownTitles(await listedTitles(page), [...news, activity, announcement])).toEqual(
		secondPage,
	);
	await page.goBack();
	await expect(page).toHaveURL(newsGroup);
	expect(await listedTitles(page)).toHaveLength(PAGE_SIZE);
	await page.goBack();
	await expect(page).toHaveURL(`/search?${new URLSearchParams({ q: named })}`);
	await expect(groupLink(page, "ทุกประเภท", 29)).toHaveAttribute("aria-current", "true");
	await page.goForward();
	await page.goForward();
	await expect(page).toHaveURL(newsPage2);
	expect(ownTitles(await listedTitles(page), [...news, activity, announcement])).toEqual(
		secondPage,
	);
});

test("a reserved Basic Page's result links to its /about address", async ({ page }) => {
	const own = await readEntry(admin, "pages", "organization");
	let title: string;
	if (own.ok) {
		const item = nativeItemOf(own)!;
		test.skip(item.status !== "published", "the runtime's own organization page is not published");
		title = String((item.data as { title?: unknown }).title);
	} else {
		expect(own.status, `reading pages/organization: ${nativeRefusalOf(own)}`).toBe(404);
		title = `${SYNTHETIC_FIXTURE_MARK} โครงสร้าง${thaiWord()}`;
		const created = await createSyntheticEntry(admin, "pages", {
			data: { title },
			slug: "organization",
		});
		expect(created.result.ok, `pages/organization: ${nativeRefusalOf(created.result)}`).toBe(true);
		await publishEntryAt(admin, "pages", created.entryId!);
	}
	await search(page, { q: title, group: "about" });
	await expect(listedItem(page, title).getByRole("link", { name: title })).toHaveAttribute(
		"href",
		"/about/organization",
	);
});

test("drafts, trashed and unpublished entries never appear, even straight after an unpublish", async ({
	page,
}) => {
	const word = thaiWord();
	const fields = { data: { summary: `สรุป${word}` } };
	const published = await createDraft("news", "ข่าว", "published", fields);
	const service = await createSyntheticService(admin, "published-service", fields);
	const draft = await createDraft("news", "ข่าว", "draft", fields);
	const unpublished = await createDraft("news", "ข่าว", "unpublished", fields);
	const trashed = await createDraft("news", "ข่าว", "trashed", fields);
	for (const fixture of [published, unpublished, trashed]) await publish("news", fixture);
	await publish("services", service);
	expect((await unpublishEntry(admin, "news", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "news", trashed.id)).ok, "trash").toBe(true);
	const all = [published, service, draft, unpublished, trashed];

	await search(page, { q: word });
	expect(ownTitles(await listedTitles(page), all)).toEqual(
		expect.arrayContaining([published.title, service.title]),
	);
	expect(ownTitles(await listedTitles(page), all), "published only").toHaveLength(2);

	expect((await unpublishEntry(admin, "news", published.id)).ok, "unpublish").toBe(true);
	await search(page, { q: word });
	expect(ownTitles(await listedTitles(page), all), "gone straight after an unpublish").toEqual([
		service.title,
	]);

	expect((await trashEntry(admin, "services", service.id)).ok, "trash").toBe(true);
	await search(page, { q: word });
	expect(await listedTitles(page)).toEqual([]);
	await expect(page.getByRole("main")).toContainText(`ไม่พบข้อมูลที่ตรงกับ “${word}”`);
});

test("a snippet shows the entry's text as plain text, so markup in it never renders", async ({
	page,
}) => {
	const word = thaiWord();
	const summary = `<b>ตัวหนา${word}</b> & <img src="/x" alt="ภาพแทรก">`;
	const news = await createDraft("news", "ข่าว", "markup", { data: { summary } });
	await publish("news", news);

	await search(page, { q: word });
	const row = listedItem(page, news.title);
	await expect(row).toContainText(summary);
	await expect(row.locator("mark")).toHaveText(word);
	await expect(row.locator("b, img")).toHaveCount(0);
});

test("the start page, a too-short query and a query that finds nothing each say so in their own words, revealing nothing internal", async ({
	page,
}) => {
	const main = page.getByRole("main");
	const groups = page.getByRole("navigation", { name: "กลุ่มผลการค้นหา" });

	await search(page, {});
	await expect(searchBox(page)).toHaveValue("");
	await expect(groups).toHaveCount(0);
	await expect(main.getByRole("article")).toHaveCount(0);
	await expect(main).not.toContainText("คำค้นหาสั้นเกินไป");

	await search(page, { q: " ก " });
	await expect(main).toContainText("คำค้นหาสั้นเกินไป");
	await expect(main).toContainText("อย่างน้อย 2 ตัวอักษร");
	await expect(searchBox(page)).toHaveValue("ก");
	await expect(groups).toHaveCount(0);
	expect(await main.innerText()).not.toMatch(INTERNAL_DETAIL);

	const nothing = `<img src=x onerror="document.title='x'">${thaiWord()}`;
	await search(page, { q: nothing });
	await expect(main).toContainText(`ไม่พบข้อมูลที่ตรงกับ “${nothing}”`);
	await expect(main.locator("img")).toHaveCount(0);
	await expect(groups).toHaveCount(0);
	for (const [label, href] of [
		["บริการประชาชน", "/services"],
		["หน่วยบริการสุขภาพที่เกี่ยวข้อง", "/health-services"],
		["เอกสารเผยแพร่", "/documents"],
		["ข่าวสาร", "/news"],
		["ข้อมูลสุขภาพ", "/health"],
	] as const) {
		await expect(main.getByRole("link", { name: label, exact: true }), label).toHaveAttribute(
			"href",
			href,
		);
	}
	expect(await main.innerText()).not.toMatch(INTERNAL_DETAIL);
	expect(await page.title()).not.toBe("x");
});

test.describe("accessibility and reflow", () => {
	let word: string;

	test.beforeAll(async () => {
		word = thaiWord();
		const news = await createDraft("news", `ข่าว${word}`, "a11y", {
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} สรุปข่าว${word}สำหรับตรวจการเข้าถึง`,
				body: [portableTextBlock(`${SYNTHETIC_FIXTURE_MARK} เนื้อหาข่าว`)],
			},
		});
		await publish("news", news);
		const service = await createSyntheticService(admin, "a11y-service", { name: `บริการ${word}` });
		await publish("services", service);
	});

	/** /search in each of its states: the start page, too short, nothing found, and results. */
	const states = (): Array<{ state: string; params: Record<string, string> }> => [
		{ state: "the start page", params: {} },
		{ state: "too short", params: { q: "ก" } },
		{ state: "nothing found", params: { q: `${word}${thaiWord()}` } },
		{ state: "results", params: { q: word } },
		{ state: "a group's results", params: { q: word, group: "services" } },
	];

	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on /search in each state at the ${width} width`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			for (const { state, params } of states()) {
				await search(page, params);
				await expectNoAxeViolations(page, `/search, ${state}, at ${width}`);
				await expectVisibleFocusOnEveryStop(page, `/search, ${state}, at ${width}`);
			}
		});
	}

	test("/search does not scroll sideways at 320 px in any state", async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		for (const { state, params } of states()) {
			await search(page, params);
			await expectNoHorizontalScroll(page, `/search, ${state}`);
		}
	});
});

// Search (#63, #125; spec #51 "Search", spec #121 "Public routes", ADR 0002, `08`).
//
// A citizen searches all public content at /search. Thai matches as a substring without word
// spaces, title matches rank above body-only matches, and results are grouped (ข่าวสาร,
// บริการประชาชน, ข้อมูลสุขภาพ, หน่วยบริการ, เอกสาร, เกี่ยวกับเรา, ITA) with a count and a filter per
// group. Each result shows its title, its kind in Thai, a plain-text snippet, a date or status, and
// links to its canonical address; the reserved Basic Pages link to their /about addresses. A MOIT
// is found by its title, its summary or the label of a piece of its Evidence, its result names it
// by its number and fiscal year instead of its kind, and MOITs that tie list the newest fiscal year
// first. The query, group and page live in the address. Drafts, trashed and unpublished entries
// never appear, even straight after an unpublish. A query that is too short and one that finds
// nothing each say so in their own words.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic entries of every searchable collection made through the native
// API and removed afterwards. Each test searches for a word of random Thai letters that only its
// own fixtures carry, so the runtime's other content (the demo dataset, the Product Owner's own)
// never shows in its results.
//
// Since Feature 015 #433 (spec #432 decisions 2, 4, 8 and 9) /search opens on a list's deep field:
// its breadcrumb, the label "ค้นหา", the H1 "ค้นหาข้อมูล" with the search icon's tile, the lead in
// the start state alone, and the Homepage hero's white search pill, which holds the query. Nothing
// lies over the field's edge in the start state; in every other state the empty state's card, or
// the groups' white card and then the results and the pager, lie over it. The cases on the field
// search 21 News of their own; the first result's place at 375 px is read on the demo dataset's
// "สุขภาพ", where the Product Owner's measure was taken (decision 4).
//
// The error state is not driven here: the shared development runtime offers no way to make the
// search's reads fail without a fault switch in the page. tests/node/public-search.test.ts makes a
// read fail instead, and the failed state reuses the nothing-found state's block, links and page,
// which this suite checks (Product Owner, 2026-10-30: #63 comment 6518347225).

import type { Locator, Page } from "@playwright/test";

import {
	createSyntheticDocument,
	createSyntheticDraft,
	createSyntheticEntry,
	createSyntheticHealthService,
	createSyntheticMoit,
	createSyntheticService,
	devAdminActor,
	fileBlock,
	linkBlock,
	nativeItemOf,
	nativeRefusalOf,
	portableTextBlock,
	publishEntryAt,
	readEntry,
	removeSuiteFixtures,
	requirementBlock,
	SYNTHETIC_FIXTURE_MARK,
	trashEntry,
	unpublishEntry,
	uploadSyntheticPdf,
	type CmsActor,
	type DraftFields,
	type DraftFixture,
} from "./cms.helpers";
import {
	cardList,
	deepField,
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	PHONE_VIEWPORT,
	VIEWPORTS,
	expect,
	expectBlocksOverFieldEdge,
	expectBreadcrumb,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectVisibleFocusOnEveryStop,
	HOME_CRUMB,
	LIST_FIELD_LOOK,
	listedItem,
	listedTitles,
	listHeading,
	ownTitles,
	pillStyle,
	readHeaderMotion,
	readListField,
	readWholeAtTwoWidths,
	test,
	testHeadingOnField,
	textStyle,
	thaiDate,
	thaiWord,
	tokenColor,
	tokenShadow,
} from "./public.helpers";

/** The fixed number of results a page shows. */
const PAGE_SIZE = 20;

/** The fiscal years of the suite's MOITs, which no real MOIT has (createSyntheticMoit). */
const FISCAL_YEAR = 2406;
const NEXT_FISCAL_YEAR = 2407;

/** Text a citizen-facing state must never show: what an exception, a stack or a database says. */
const INTERNAL_DETAIL =
	/error|exception|stack|undefined|null|sql|select |postgres|emdash|\.ts\b|at .+:\d+/i;

let admin: CmsActor;

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

/**
 * /search's heading on the deep field (spec #432 decision 2); the lead shows in the start state
 * alone.
 */
const HEADING = {
	label: "ค้นหา",
	title: "ค้นหาข้อมูล",
	lead: "ค้นหาข่าวสาร บริการประชาชน ข้อมูลสุขภาพ หน่วยบริการ เอกสาร และข้อมูลของสำนักงานสาธารณสุขอำเภอสองได้จากที่เดียว",
};

/** The name of the search pill's form and of its field (spec #432 "The search pill"). */
const SEARCH_NAME = "ค้นหาในเว็บไซต์";

/** The search pill's placeholder on /search, the earlier search form's own. */
const PLACEHOLDER = "ค้นหาบริการ ข่าวสาร หน่วยบริการ หรือเอกสาร…";

/** The query's longest length (src/lib/search-matcher.ts MAX_QUERY_LENGTH). */
const MAX_QUERY_LENGTH = 100;

/** The search pill in the page's main content: its search landmark, field, button and icons. */
function searchPill(page: Page) {
	const form = page.getByRole("main").getByRole("search", { name: SEARCH_NAME });
	const button = form.getByRole("button", { name: "ค้นหา", exact: true });
	return {
		form,
		field: form.getByRole("searchbox", { name: SEARCH_NAME }),
		button,
		icon: form.locator(":scope > svg.lucide-search"),
		arrow: button.locator("svg.lucide-arrow-right"),
	};
}

/** The search box of the page's search pill. */
const searchBox = (page: Page) => searchPill(page).field;

/** The groups' navigation, the white card that holds it, its links and the count line. */
function groupsOf(page: Page) {
	const navigation = page.getByRole("navigation", { name: "กลุ่มผลการค้นหา" });
	return {
		navigation,
		card: navigation.locator("xpath=.."),
		links: navigation.getByRole("link"),
		count: page.getByRole("main").getByText(/^พบ \d+ รายการ/),
	};
}

/** The white card of the empty state whose message reads `message`. */
const emptyStateOf = (page: Page, message: string) =>
	page.getByRole("main").getByText(message, { exact: true }).locator("xpath=..");

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async () => {
	admin = await devAdminActor();
});

test.afterAll(() => removeSuiteFixtures(admin));

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
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(HEADING.title);
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
		["ITA", 0],
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

	await search(page, { q: named, group: "ita" });
	await expect(page.getByRole("main"), "a group without results").toContainText(
		"ไม่พบผลการค้นหาในกลุ่ม ITA",
	);
	await expect(page.getByRole("link", { name: "ดูผลการค้นหาทุกประเภท" })).toHaveAttribute(
		"href",
		`/search?${new URLSearchParams({ q: named })}`,
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

test("MOITs are found by their titles and by an Evidence label alone, under ITA with its count, ties in the ITA pages' order, each result reading MOIT n, the fiscal year and its title and leading to its page, and a draft MOIT never appears", async ({
	page,
}) => {
	const word = thaiWord();
	const pdf = await uploadSyntheticPdf(admin);
	/** A MOIT of fiscal year `year`, numbered `number`, whose title carries the word. */
	const titledMoit = (label: string, year: number, number: number) =>
		createSyntheticMoit(admin, label, { year, number, name: `ตัวชี้วัด${word}`, evidence: [] });
	const nextYear = await titledMoit("moit-next-year", NEXT_FISCAL_YEAR, 5);
	const second = await titledMoit("moit-2", FISCAL_YEAR, 2);
	const first = await titledMoit("moit-1", FISCAL_YEAR, 1);
	const third = await titledMoit("moit-3", FISCAL_YEAR, 3);
	const labelled = await createSyntheticMoit(admin, "moit-label-hit", {
		year: FISCAL_YEAR,
		number: 4,
		evidence: [
			requirementBlock("1", "คำสั่ง / ประกาศ ที่ระบุกรอบแนวทาง"),
			fileBlock("1.1 บันทึกข้อความเสนอ ผบห.", pdf),
			fileBlock(`1.2 ฟอร์มเผยแพร่${word}`, pdf),
		],
	});
	const draft = await createSyntheticMoit(admin, "moit-draft", {
		year: FISCAL_YEAR,
		number: 6,
		name: `ตัวชี้วัด${word}`,
		evidence: [fileBlock(`ฟอร์มเผยแพร่${word}`, pdf)],
	});
	// Published in an order that is neither the ITA pages' order nor its reverse, so only that
	// order lists the title matches as expected: the next year's first, then MOIT 2, 1 and 3.
	for (const moit of [nextYear, second, first, third, labelled]) await publish("moit", moit);
	const rows = [
		[nextYear, 5, NEXT_FISCAL_YEAR],
		[first, 1, FISCAL_YEAR],
		[second, 2, FISCAL_YEAR],
		[third, 3, FISCAL_YEAR],
		[labelled, 4, FISCAL_YEAR],
	] as const;
	const own = [...rows.map(([moit]) => moit), draft];
	const expected = rows.map(([moit]) => moit.title);

	await search(page, { q: word });
	expect(
		ownTitles(await listedTitles(page), own),
		"the title matches in the ITA pages' order, then the label match, and never the draft",
	).toEqual(expected);
	await expect(groupLink(page, "ทุกประเภท", 5)).toBeVisible();
	await expect(groupLink(page, "ITA", 5)).toBeVisible();
	for (const [moit, number, year] of rows) {
		const row = listedItem(page, moit.title);
		await expect(row, "MOIT n · ปีงบประมาณ YYYY · title").toHaveText(
			new RegExp(`^\\s*MOIT ${number}[\\s•]*ปีงบประมาณ ${year}\\s*${SYNTHETIC_FIXTURE_MARK}`),
		);
		await expect(row.getByRole("link", { name: moit.title })).toHaveAttribute(
			"href",
			`/ita/${moit.slug}`,
		);
	}
	const byLabel = listedItem(page, labelled.title);
	await expect(byLabel, "the label it was found by").toContainText(`1.2 ฟอร์มเผยแพร่${word}`);
	await expect(byLabel.locator("mark")).toHaveText(word);

	await groupLink(page, "ITA", 5).click();
	await expect(page).toHaveURL(`/search?${new URLSearchParams({ q: word, group: "ita" })}`);
	await expect(groupLink(page, "ITA", 5)).toHaveAttribute("aria-current", "true");
	await expect(page.getByRole("main")).toContainText("พบ 5 รายการในกลุ่ม ITA");
	expect(ownTitles(await listedTitles(page), own)).toEqual(expected);
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

test("the start page, a too-short or empty query and a query that finds nothing each say so in their own words, revealing nothing internal", async ({
	page,
}) => {
	const main = page.getByRole("main");
	const groups = page.getByRole("navigation", { name: "กลุ่มผลการค้นหา" });

	await search(page, {});
	await expect(searchBox(page)).toHaveValue("");
	await expect(groups).toHaveCount(0);
	await expect(main.getByRole("article")).toHaveCount(0);
	await expect(main).not.toContainText("คำค้นหาสั้นเกินไป");

	for (const [q, shown] of [
		[" ก ", "ก"],
		["", ""],
	] as const) {
		await search(page, { q });
		await expect(main, `"${q}" is too short`).toContainText("คำค้นหาสั้นเกินไป");
		await expect(main).toContainText("อย่างน้อย 2 ตัวอักษร");
		await expect(searchBox(page)).toHaveValue(shown);
		await expect(groups).toHaveCount(0);
		expect(await main.innerText()).not.toMatch(INTERNAL_DETAIL);
	}

	const nothing = `<img src=x onerror="document.title='x'">${thaiWord()}`;
	await search(page, { q: nothing });
	await expect(main).toContainText(`ไม่พบข้อมูลที่ตรงกับ “${nothing}”`);
	await expect(main).toContainText("ตรวจสอบตัวสะกด");
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
	// The query is quoted back; the rest of the page must reveal nothing.
	expect((await main.innerText()).replace(nothing, "")).not.toMatch(INTERNAL_DETAIL);
	expect(await page.title()).not.toBe("x");
});

/** `/search` with `params`, as an address. */
const searchPath = (params: Record<string, string>) =>
	Object.keys(params).length === 0 ? "/search" : `/search?${new URLSearchParams(params)}`;

/** `part`'s box, or undefined where the page does not show it once. */
async function shownBox(part: Locator) {
	return (await part.count()) === 1 && (await part.isVisible())
		? ((await part.boundingBox()) ?? undefined)
		: undefined;
}

/** The address the page shows now, its path and query. */
const shownAddress = (page: Page) => {
	const url = new URL(page.url());
	return `${url.pathname}${url.search}`;
};

/** Fail unless the page keeps out of search engines and names /search its canonical address. */
async function expectSearchHead(page: Page): Promise<void> {
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		/^https?:\/\/[^/]+\/search$/,
	);
}

testHeadingOnField({
	path: "/search",
	crumbs: [HOME_CRUMB],
	current: "ค้นหา",
	heading: HEADING,
	icon: "search",
});

test("for สุขภาพ on the demo dataset the first result starts no lower than 706 px from the page's top at 375 px, where it started before Feature 015 (spec #432 decision 4)", async ({
	page,
}) => {
	await page.setViewportSize(PHONE_VIEWPORT);
	await search(page, { q: "สุขภาพ" });
	const first = page.getByRole("main").getByRole("article").first();
	const top = await first.evaluate((element) => element.getBoundingClientRect().top + scrollY);
	expect(top, "the first result's top at 375 px").toBeLessThanOrEqual(706);
});

test.describe("on the deep field", () => {
	/** A word 21 News of the cases' own carry: a page of results and one more, so a pager shows. */
	let word: string;
	/** A query that finds nothing. */
	let nothing: string;

	test.beforeAll(async () => {
		word = thaiWord();
		nothing = `${word}${thaiWord()}`;
		for (let index = 0; index <= PAGE_SIZE; index += 1) {
			await publish("news", await createDraft("news", `ข่าว${word}`, `field-${index}`));
		}
	});

	/**
	 * /search in each of its states, by what returns it (spec #432 "each state over the field's
	 * edge").
	 */
	const states = (): Array<{ state: string; params: Record<string, string> }> => [
		{ state: "the start page", params: {} },
		{ state: "a query too short", params: { q: "ก" } },
		{ state: "an empty query", params: { q: "" } },
		{ state: "nothing found", params: { q: nothing } },
		{ state: "results", params: { q: word } },
		{ state: "a group at 0", params: { q: word, group: "ita" } },
		{ state: "a page past the last", params: { q: word, page: "9" } },
	];

	test("in every state the search pill lies on the field under the heading block, 24 px below 640 px and 32 px from 640 px, holding the query, the lead between them in the start state alone, and no link on the field but the breadcrumb's", async ({
		page,
	}) => {
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		for (const { state, params } of states()) {
			await search(page, params);
			const field = deepField(page);
			const pill = searchPill(page);
			const lead = page.getByRole("main").getByText(HEADING.lead, { exact: true });
			const shownLead = (await lead.count()) > 0;
			// The heading block ends where the lower of its tile and its H1 does, or the lead under it.
			const above = [
				field.locator("span:has(> svg.lucide-search)"),
				field.getByRole("heading", { level: 1 }),
				...(shownLead ? [lead] : []),
			];
			const under: Record<number, unknown> = {};
			for (const width of [320, 639, 640, 1440]) {
				await page.setViewportSize({ width, height: 900 });
				const boxes = await Promise.all([pill.form, ...above].map(shownBox));
				const [pillBox, ...aboveBoxes] = boxes;
				under[width] = boxes.every(Boolean)
					? Math.round(pillBox!.y - Math.max(...aboveBoxes.map((box) => box!.y + box!.height)))
					: "missing";
			}
			seen[state] = {
				lead: await lead.count(),
				value: (await pill.field.count()) === 1 ? await pill.field.inputValue() : "missing",
				pillUnder: under,
				fieldLinks: await field.getByRole("link").allTextContents(),
			};
			expected[state] = {
				lead: state === "the start page" ? 1 : 0,
				value: params.q ?? "",
				pillUnder: { 320: 24, 639: 24, 640: 32, 1440: 32 },
				fieldLinks: ["หน้าแรก"],
			};
		}
		expect(seen, "the lead, the pill's place and value, and the field's links, by state").toEqual(
			expected,
		);
	});

	test("the search pill is the Homepage hero's: a white pill with the deep shadow, 60 px high and 68 px from 640 px, as wide as the column up to 540 px and from 1,024 px up to 640 px; the 20 px search icon in text-secondary; the field at body size, body-large from 640 px, in text-primary with its placeholder in text-secondary; the round accent-warm button, 44 px and 52 px from 640 px, with the 20 px arrow-right in brand-dark, which grows under the pointer only with motion allowed; and the field's focus ring brand-primary inside the pill", async ({
		page,
	}) => {
		await search(page, {});
		const pill = searchPill(page);
		const breadcrumb = deepField(page).getByRole("navigation", { name: "เส้นทางนำทาง" });
		const [white, secondary, primary, warm, dark, brand] = await Promise.all(
			[
				"surface-base",
				"text-secondary",
				"text-primary",
				"accent-warm",
				"brand-dark",
				"brand-primary",
			].map((name) => tokenColor(page, name)),
		);
		const deep = await tokenShadow(page, "deep");
		/** A part's size in px and its colour, or "missing". */
		const sizeAndColour = async (part: Locator) =>
			(await part.count()) === 1
				? await part.evaluate((element) => {
						const box = element.getBoundingClientRect();
						return {
							size: [Math.round(box.width), Math.round(box.height)],
							colour: getComputedStyle(element).color,
						};
					})
				: "missing";
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		for (const width of [320, 639, 640, 1023, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const fromSm = width >= 640;
			const column = await shownBox(breadcrumb);
			seen[width] = {
				pill:
					(await pill.form.count()) === 1
						? await pill.form.evaluate((element) => {
								const style = getComputedStyle(element);
								const box = element.getBoundingClientRect();
								return {
									fill: style.backgroundColor,
									shadow: style.boxShadow,
									height: Math.round(box.height),
									width: Math.round(box.width),
									round: parseFloat(style.borderTopLeftRadius) >= box.height / 2,
								};
							})
						: "missing",
				icon: await sizeAndColour(pill.icon),
				field:
					(await pill.field.count()) === 1
						? await pill.field.evaluate((element) => ({
								size: getComputedStyle(element).fontSize,
								colour: getComputedStyle(element).color,
								placeholder: getComputedStyle(element, "::placeholder").color,
							}))
						: "missing",
				button:
					(await pill.button.count()) === 1
						? await pill.button.evaluate((element) => {
								const style = getComputedStyle(element);
								const box = element.getBoundingClientRect();
								return {
									size: [Math.round(box.width), Math.round(box.height)],
									fill: style.backgroundColor,
									round: parseFloat(style.borderTopLeftRadius) >= box.height / 2,
								};
							})
						: "missing",
				arrow: await sizeAndColour(pill.arrow),
			};
			expected[width] = {
				pill: {
					fill: white,
					shadow: deep,
					height: fromSm ? 68 : 60,
					width: column
						? Math.min(Math.round(column.width), width >= 1024 ? 640 : 540)
						: "no column",
					round: true,
				},
				icon: { size: [20, 20], colour: secondary },
				field: { size: fromSm ? "18px" : "16px", colour: primary, placeholder: secondary },
				button: { size: fromSm ? [52, 52] : [44, 44], fill: warm, round: true },
				arrow: { size: [20, 20], colour: dark },
			};
		}

		// The button grows under the pointer only with motion allowed.
		const growth = async () => {
			await page.mouse.move(0, 0);
			await pill.button.hover();
			await page.waitForTimeout(400);
			return pill.button.evaluate((element) => getComputedStyle(element).scale);
		};
		seen.grows = { reduced: await growth() };
		await page.emulateMedia({ reducedMotion: "no-preference" });
		(seen.grows as Record<string, unknown>).allowed = (await growth()) !== "none";
		await page.emulateMedia({ reducedMotion: "reduce" });
		expected.grows = { reduced: "none", allowed: true };

		// The field's focus ring, brand-primary, lies inside the white pill.
		const searchbox = page.getByRole("main").getByRole("searchbox");
		await searchbox.focus();
		const [ring, around] = await Promise.all([
			searchbox.evaluate((element) => {
				const style = getComputedStyle(element);
				const box = element.getBoundingClientRect();
				const reach = parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth);
				return {
					colour: style.outlineColor,
					box: [box.left - reach, box.top - reach, box.right + reach, box.bottom + reach],
				};
			}),
			searchbox.evaluate((element) => {
				const box = element.closest("form")!.getBoundingClientRect();
				return [box.left, box.top, box.right, box.bottom];
			}),
		]);
		seen.focus = {
			colour: ring.colour,
			inside:
				ring.box[0]! >= around[0]! &&
				ring.box[1]! >= around[1]! &&
				ring.box[2]! <= around[2]! &&
				ring.box[3]! <= around[3]!,
		};
		expected.focus = { colour: brand, inside: true };
		expect(seen, "the search pill's look at each width").toEqual(expected);
	});

	test("the search pill is the page's one search landmark, named ค้นหาในเว็บไซต์ as its field is, for assistive technology alone, and its button ค้นหา shows an arrow in place of the word; it holds the query, shows its placeholder when empty and keeps a query to 100 characters; it sends the query alone to /search, so a new search starts from ทุกประเภท and the first page, and shows no spinner after the submit", async ({
		page,
	}) => {
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		const pill = searchPill(page);
		const searchbox = page.getByRole("main").getByRole("searchbox");

		// What a search from a group's second page sends: by Enter, then by the button.
		const other = `${word}ใหม่`;
		const fresh = searchPath({ q: other });
		for (const how of ["Enter", "the button"]) {
			await search(page, { q: word, group: "news", page: "2" });
			await searchbox.fill(other);
			if (how === "Enter") await searchbox.press("Enter");
			else await page.getByRole("main").getByRole("search").getByRole("button").click();
			await page.waitForURL(fresh, { timeout: 5_000 }).catch(() => undefined);
			seen[`sent by ${how}`] = shownAddress(page);
			expected[`sent by ${how}`] = fresh;
		}
		// The result answers 204 No Content, so the page stays in sight after the submit.
		await search(page, { q: word });
		const result = (url: URL) => url.pathname === "/search";
		await page.route(result, (route) => route.fulfill({ status: 204 }));
		await searchbox.fill(other);
		await searchbox.press("Enter");
		await page.waitForTimeout(500);
		seen.spinner = await page.getByTestId("submit-spinner").count();
		expected.spinner = 0;
		await page.unroute(result);

		await search(page, {});
		seen.placeholder = {
			text: await searchbox.getAttribute("placeholder"),
			shown: await searchbox.evaluate((element) => element.matches(":placeholder-shown")),
		};
		expected.placeholder = { text: PLACEHOLDER, shown: true };
		await searchbox.fill("ก".repeat(MAX_QUERY_LENGTH + 20));
		seen.longest = (await searchbox.inputValue()).length;
		expected.longest = MAX_QUERY_LENGTH;

		await search(page, { q: word, group: "news" });
		seen.landmarks = await page.getByRole("search").count();
		expected.landmarks = 1;
		seen.named = {
			form: await pill.form.count(),
			field: await pill.field.count(),
			button: await pill.button.count(),
		};
		expected.named = { form: 1, field: 1, button: 1 };
		seen.value = (await pill.field.count()) === 1 ? await pill.field.inputValue() : "missing";
		expected.value = word;
		// The field's name and the button's word take no room in sight; the arrow shows instead.
		seen.inSight = await page
			.getByRole("main")
			.getByRole("search")
			.evaluate((form) =>
				[...form.querySelectorAll("label, button span")]
					.filter((element) => element.childElementCount === 0)
					.filter((element) => {
						const box = element.getBoundingClientRect();
						return Math.max(box.width, box.height) > 1;
					})
					.map((element) => element.textContent?.trim()),
			);
		expected.inSight = [];
		seen.labelled = await page.getByRole("main").getByText("คำค้นหา", { exact: true }).count();
		expected.labelled = 0;
		seen.arrow = (await shownBox(pill.arrow)) ? "shown" : "missing";
		expected.arrow = "shown";
		expect(seen, "what the search pill sends, holds and is named").toEqual(expected);
	});

	test("in the start state nothing lies over the field's edge: the field is a list's, with the large ring from 1,024 px alone, and ends 40 px under the search pill below 640 px and 48 px from 640 px, and the footer follows 64 px under it below 1,024 px and 80 px from 1,024 px", async ({
		page,
	}) => {
		await search(page, {});
		const seen: Record<string, unknown> = { field: await readListField(page) };
		const expected: Record<string, unknown> = { field: LIST_FIELD_LOOK };
		const field = deepField(page);
		const edges: Record<number, unknown> = {};
		const expectedEdges: Record<number, unknown> = {};
		for (const width of [320, 639, 640, 1023, 1024, 1440]) {
			// A short window, so the page is taller than it and the footer follows the content.
			await page.setViewportSize({ width, height: 300 });
			const [fieldBox, pillBox, footerBox] = await Promise.all(
				[field, searchPill(page).form, page.getByRole("contentinfo")].map(shownBox),
			);
			const over =
				(await field.count()) === 1
					? await page.getByRole("main").evaluate(
							(main, fieldElement) => {
								const edge = fieldElement!.getBoundingClientRect().bottom;
								return [...main.querySelectorAll("*")]
									.filter((part) => !fieldElement!.contains(part))
									.filter((part) => {
										const box = part.getBoundingClientRect();
										return box.width * box.height > 0 && box.top < edge - 0.5;
									})
									.map((part) => `<${part.localName}> ${part.textContent?.trim().slice(0, 30)}`);
							},
							await field.elementHandle(),
						)
					: "no field";
			edges[width] =
				fieldBox && pillBox && footerBox
					? {
							fieldUnderPill: Math.round(
								fieldBox.y + fieldBox.height - (pillBox.y + pillBox.height),
							),
							footerUnderField: Math.round(footerBox.y - (fieldBox.y + fieldBox.height)),
							over,
						}
					: "missing";
			expectedEdges[width] = {
				fieldUnderPill: width >= 640 ? 48 : 40,
				footerUnderField: width >= 1024 ? 80 : 64,
				over: [],
			};
		}
		seen.edges = edges;
		expected.edges = expectedEdges;
		expect(seen, "the start state's field and what follows it").toEqual(expected);
	});

	/** The states whose empty state lies over the field's edge, alone or under the groups' card. */
	const EMPTY_OVER_EDGE: Array<{
		state: string;
		params: () => Record<string, string>;
		message: () => string;
		/** The empty state's way on, which leads to the query's results in ทุกประเภท, first page. */
		way?: string;
	}> = [
		{ state: "a query too short", params: () => ({ q: "ก" }), message: () => "คำค้นหาสั้นเกินไป" },
		{ state: "an empty query", params: () => ({ q: "" }), message: () => "คำค้นหาสั้นเกินไป" },
		{
			state: "nothing found",
			params: () => ({ q: nothing }),
			message: () => `ไม่พบข้อมูลที่ตรงกับ “${nothing}”`,
		},
		{
			state: "a group at 0",
			params: () => ({ q: word, group: "ita" }),
			message: () => "ไม่พบผลการค้นหาในกลุ่ม ITA",
			way: "ดูผลการค้นหาทุกประเภท",
		},
		{
			state: "a page past the last",
			params: () => ({ q: word, page: "9" }),
			message: () => "ไม่พบผลการค้นหาในหน้านี้",
			way: "กลับไปหน้าแรกของผลการค้นหา",
		},
	];

	for (const { state, params, message, way } of EMPTY_OVER_EDGE) {
		const withGroups = way !== undefined;
		test(`with ${state} /search answers 200 with noindex and the canonical address /search, and ${withGroups ? "the groups' card lies over the field's edge with the empty state 32 px under it" : "its empty state lies over the field's edge"}: the field's content ends 96 px above the edge below 640 px and 128 px from 640 px, and ${withGroups ? "the card" : "the empty state"} starts 64 px and 88 px above it`, async ({
			page,
		}) => {
			await search(page, params());
			await expectSearchHead(page);
			const empty = emptyStateOf(page, message());
			await expect(empty, "the empty state's message on its card").toBeVisible();
			if (way !== undefined) {
				await expect(empty.getByRole("link", { name: way })).toHaveAttribute(
					"href",
					searchPath({ q: word }),
				);
			}
			const blocks: Array<[string, Locator]> = withGroups
				? [
						["the groups' card", groupsOf(page).card],
						["the empty state", empty],
					]
				: [["the empty state", empty]];
			await expectBlocksOverFieldEdge(page, deepField(page), [searchPill(page).form], blocks);
		});
	}

	test("with results /search answers 200 with noindex and the canonical address /search, and the groups' card lies over the field's edge with the results 32 px under it and the pager 32 px under them: the field's content ends 96 px above the edge below 640 px and 128 px from 640 px, and the card starts 64 px and 88 px above it", async ({
		page,
	}) => {
		await search(page, { q: word });
		await expectSearchHead(page);
		const { grid, pager } = cardList(page);
		await expect(pager).toBeVisible();
		await expectBlocksOverFieldEdge(
			page,
			deepField(page),
			[searchPill(page).form],
			[
				["the groups' card", groupsOf(page).card],
				["the results", grid],
				["the pager", pager],
			],
		);
	});

	test("the groups' card is white with the card shadow, radius 24 and 20 px inside; its eight links as today, 44 px high and 8 px apart, wrapping inside it, the current one brand-primary with surface-base words and the others surface-soft with brand-dark words, border-default under the pointer, a group at 0 still a link with its count; and 16 px under them พบ n รายการ at label size in text-secondary", async ({
		page,
	}) => {
		await search(page, { q: word });
		const { navigation, card, links, count } = groupsOf(page);
		const [white, primary, soft, dark, border, secondary] = await Promise.all(
			[
				"surface-base",
				"brand-primary",
				"surface-soft",
				"brand-dark",
				"border-default",
				"text-secondary",
			].map((name) => tokenColor(page, name)),
		);
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		seen.links = {
			count: await links.count(),
			current: await navigation.locator('[aria-current="true"]').allTextContents(),
			atZero: await navigation
				.getByRole("link", { name: "ITA 0 รายการ", exact: true })
				.getAttribute("href"),
		};
		expected.links = {
			count: 8,
			current: [expect.stringMatching(/^\s*ทุกประเภท\s*21\s*รายการ\s*$/)],
			atZero: searchPath({ q: word, group: "ita" }),
		};
		for (const width of [320, 639, 640, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			const look = await card.evaluate((element) => {
				const style = getComputedStyle(element);
				return {
					fill: style.backgroundColor,
					shadow: style.boxShadow,
					radius: style.borderTopLeftRadius,
					padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
				};
			});
			const placed = await card.evaluate((element) => {
				const inner = element.getBoundingClientRect();
				const boxes = [...element.querySelectorAll("nav a")].map((link) =>
					link.getBoundingClientRect(),
				);
				const across: number[] = [];
				const down: number[] = [];
				for (const [index, box] of boxes.entries()) {
					const before = boxes[index - 1];
					if (!before) continue;
					if (Math.abs(box.top - before.top) < 1) across.push(Math.round(box.left - before.right));
					else down.push(Math.round(box.top - before.bottom));
				}
				const list = element.querySelector("nav ul")!.getBoundingClientRect();
				const line = [...element.querySelectorAll("p")].at(-1)!.getBoundingClientRect();
				return {
					heights: [...new Set(boxes.map((box) => Math.round(box.height)))],
					across: [...new Set(across)],
					down: [...new Set(down)],
					inside: boxes.every(
						(box) => box.left >= inner.left + 20 - 0.5 && box.right <= inner.right - 20 + 0.5,
					),
					countUnder: Math.round(line.top - list.bottom),
				};
			});
			seen[width] = { look, placed, count: await textStyle(count) };
			expected[width] = {
				look: {
					fill: white,
					shadow: await tokenShadow(page, "card"),
					radius: "24px",
					padding: ["20px", "20px", "20px", "20px"],
				},
				placed: {
					heights: [44],
					across: [8],
					// The eight links need some 911 px: they wrap below 1,024 px and keep one row at 1440.
					down: width < 1024 ? [8] : [],
					inside: true,
					countUnder: 16,
				},
				count: { size: 14, weight: "500", colour: secondary, underline: false },
			};
		}
		const current = navigation.locator('[aria-current="true"]');
		const another = navigation.getByRole("link", { name: "ITA 0 รายการ", exact: true });
		seen.current = await pillStyle(current);
		seen.another = await pillStyle(another);
		await another.hover();
		seen.anotherUnderPointer = (await pillStyle(another)).fill;
		expected.current = expect.objectContaining({ fill: primary, colour: white });
		expected.another = expect.objectContaining({ fill: soft, colour: dark });
		expected.anotherUnderPointer = border;
		expect(seen, "the groups' card, its links and the count line").toEqual(expected);
	});

	test("/search moves only when motion is allowed: the heading block, then the lead in the start state, then the search pill rise in as the page opens, while the breadcrumb, the groups' card, an empty state and the pager show at once; with reduced motion preferred, and on paper, nothing moves, and each part's place is the same either way", async ({
		page,
	}) => {
		const heading = listHeading(page, HEADING);
		const pill = searchPill(page).form;
		const { pager } = cardList(page);
		const rising: Array<[string, Locator, number?]> = [
			["the H1", heading.title],
			["the search pill", pill, 0.22],
		];
		const cases: Array<[string, Record<string, string>, typeof rising, Array<[string, Locator]>]> =
			[
				[
					"the start page",
					{},
					[
						["the H1", heading.title],
						["the lead", heading.lead, 0.1],
						["the search pill", pill, 0.22],
					],
					[["the breadcrumb", heading.breadcrumb]],
				],
				[
					"results",
					{ q: word },
					rising,
					[
						["the breadcrumb", heading.breadcrumb],
						["the groups' card", groupsOf(page).card],
						["the pager", pager],
					],
				],
				[
					"nothing found",
					{ q: nothing },
					rising,
					[
						["the breadcrumb", heading.breadcrumb],
						["the empty state", emptyStateOf(page, `ไม่พบข้อมูลที่ตรงกับ “${nothing}”`)],
					],
				],
			];
		const seen: Record<string, unknown> = {};
		const expected: Record<string, unknown> = {};
		for (const [state, params, risingParts, atOnce] of cases) {
			const read = await readHeaderMotion(
				page,
				searchPath(params),
				risingParts,
				atOnce,
				[
					["the field", heading.field],
					...risingParts.map(([name, part]): [string, Locator] => [name, part]),
					...atOnce,
				],
				false,
			);
			seen[state] = read.seen;
			expected[state] = read.expected;
		}
		expect(seen, "the motion by state, and nothing moving without it").toEqual(expected);
	});

	test.describe("without JavaScript", () => {
		test.use({ javaScriptEnabled: false });

		test("/search shows its heading, the lead in the start state and the search pill whole, and with results the groups' card, the results and the pager, at 375 and 1440 px; the pill sends its query alone to /search", async ({
			page,
		}) => {
			const heading = listHeading(page, HEADING);
			const pill = searchPill(page).form;
			await search(page, {});
			const start = await readWholeAtTwoWidths(page, [
				["the breadcrumb", heading.breadcrumb],
				["the H1", heading.title],
				["the lead", heading.lead],
				["the search pill", pill],
			]);
			await search(page, { q: word, group: "news", page: "2" });
			const found = await readWholeAtTwoWidths(page, [
				["the search pill", pill],
				["the groups' card", groupsOf(page).card],
				["the results", cardList(page).grid],
			]);
			await search(page, { q: word });
			const firstPage = await readWholeAtTwoWidths(page, [["the pager", cardList(page).pager]]);
			const other = `${word}ใหม่`;
			const searchbox = page.getByRole("main").getByRole("searchbox");
			await searchbox.fill(other);
			await searchbox.press("Enter");
			await page.waitForURL(searchPath({ q: other }), { timeout: 5_000 }).catch(() => undefined);
			expect(
				{
					start: start.seen,
					found: found.seen,
					firstPage: firstPage.seen,
					sent: shownAddress(page),
				},
				"the page whole without JavaScript, and what the pill sends",
			).toEqual({
				start: start.expected,
				found: found.expected,
				firstPage: firstPage.expected,
				sent: searchPath({ q: other }),
			});
		});
	});
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
		const moit = await createSyntheticMoit(
			admin,
			"a11y-moit",
			{
				year: FISCAL_YEAR,
				number: 4,
				name: `ตัวชี้วัด${word}`,
				evidence: [linkBlock("1.1 ข้อมูลการติดต่อหน่วยงาน", "/contact", { current: true })],
			},
			{ data: { summary: `${SYNTHETIC_FIXTURE_MARK} สรุปตัวชี้วัดสำหรับตรวจการเข้าถึง` } },
		);
		await publish("moit", moit);
	});

	/**
	 * /search in each of its states: the start page, too short, nothing found (with a query of the
	 * longest length too, which the empty state quotes and the search pill holds), results, a group
	 * at 0 and a page past the last.
	 */
	const states = (): Array<{ state: string; params: Record<string, string> }> => [
		{ state: "the start page", params: {} },
		{ state: "too short", params: { q: "ก" } },
		{ state: "an empty query", params: { q: "" } },
		{ state: "nothing found", params: { q: `${word}${thaiWord()}` } },
		{
			state: "nothing found for a query of 100 characters",
			params: { q: `${word}${"ก".repeat(MAX_QUERY_LENGTH)}`.slice(0, MAX_QUERY_LENGTH) },
		},
		{ state: "results", params: { q: word } },
		{ state: "a group's results", params: { q: word, group: "services" } },
		{ state: "ITA's results", params: { q: word, group: "ita" } },
		{ state: "a group at 0", params: { q: word, group: "documents" } },
		{ state: "a page past the last", params: { q: word, page: "9" } },
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

	test("/search does not scroll sideways at 375 or 320 px in any state", async ({ page }) => {
		for (const viewport of [PHONE_VIEWPORT, MOBILE_VIEWPORT]) {
			await page.setViewportSize(viewport);
			for (const { state, params } of states()) {
				await search(page, params);
				await expectNoHorizontalScroll(page, `/search, ${state}, at ${viewport.width} px`);
			}
		}
	});
});

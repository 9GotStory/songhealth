// News and Health News (#54; spec #51 "Public reads" and "Errors, redirects, preview and SEO").
//
// A citizen reads published News at /news (newest first, paginated), Health News at
// /news/health (News with any topic term, narrowed by ?topic=), and each News item at its
// canonical /news/{slug} address. Drafts, unpublished and trashed News never show anywhere,
// and their addresses answer the site 404.
//
// The suite drives the single development runtime over public HTTP through the public-page
// harness (third-party request guard, axe with the WCAG 2.2 AA tag set, desktop and 320 px
// widths). Fixtures are synthetic News, topic and category terms and media made through the
// native API, and removed afterwards together with the redirects their slug changes leave.
// The runtime may hold other News (the demo dataset, the Product Owner's own), so assertions
// look only at this suite's uniquely titled fixtures, and tests about "newest first" publish
// their fixtures last.
//
// Platform behaviour relied on (emdash 1.1.0):
// - POST …/publish accepts `publishedAt` to backdate a publication; the development PAT's
//   Administrator holds content:publish_any (src/astro/routes/api/content/[collection]/[id]/
//   publish.ts).
// - An image field saved with only a media id takes its alt text from the media library
//   (src/media/normalize.ts mergeProviderData).
// - POST …/preview-url mints the signed preview link of a draft, and the site's settings `seo`
//   object is patched key by key, where null removes a key (src/settings/index.ts).
// - Deleting a media item removes its stored file and leaves the News that uses it unchanged
//   (src/api/handlers/media.ts handleMediaDelete).

import type { Page } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	createSyntheticTerm,
	deleteMedia,
	deleteSyntheticTerms,
	loadDevAccessToken,
	nativeDataOf,
	nativeItemOf,
	nativeItemsOf,
	nativeRefusalOf,
	NATIVE_ROLES,
	portableTextBlock,
	publishEntry,
	readEntry,
	setMediaAlt,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	trashEntry,
	unpublishEntry,
	updateEntry,
	uploadSyntheticMedia,
	type CmsActor,
	type SyntheticTerm,
} from "./cms.helpers";
import {
	DEFAULT_SITE_TITLE,
	DESKTOP_VIEWPORT,
	MOBILE_VIEWPORT,
	VIEWPORTS,
	expect,
	expectNoAxeViolations,
	expectNoHorizontalScroll,
	expectSiteNotFound,
	expectVisibleFocusOnEveryStop,
	listedTitles,
	ownTitles,
	test,
	thaiDate,
} from "./public.helpers";

/** The fixed number of News a list page shows. */
const PAGE_SIZE = 12;

let admin: CmsActor;
let origin: string;
/** Synthetic terms this suite created, removed at the end. */
const ownedTerms: SyntheticTerm[] = [];
/** Old slugs of News whose slug a test changed: their redirects are removed at the end. */
const movedSlugs: string[] = [];

/** A synthetic term of `taxonomy`, labelled in Thai so it reads like a real one. */
async function createTerm(taxonomy: string, label: string): Promise<SyntheticTerm> {
	const unique = crypto.randomUUID().slice(0, 6);
	const term = await createSyntheticTerm(
		admin,
		taxonomy,
		`${SYNTHETIC_FIXTURE_MARK} ${label} ${unique}`,
	);
	ownedTerms.push(term);
	return term;
}

interface NewsFixture {
	id: string;
	slug: string;
	title: string;
}

/** A synthetic News draft. Its title is unique, so a page shows it or does not. */
async function createNews(
	label: string,
	fields: {
		data?: Record<string, unknown>;
		taxonomies?: Record<string, string[]>;
		seo?: Record<string, unknown>;
	} = {},
): Promise<NewsFixture> {
	const slug = syntheticSlug(label);
	const title = `${SYNTHETIC_FIXTURE_MARK} ข่าว ${label} ${slug.slice(-6)}`;
	const created = await createSyntheticEntry(admin, "news", {
		...fields,
		data: { title, ...fields.data },
		slug,
	});
	expect(created.result.ok, `news ${label}: ${nativeRefusalOf(created.result)}`).toBe(true);
	return { id: created.entryId!, slug, title };
}

/** Publish now, or backdated to `publishedAt`. Returns the stored publication instant. */
async function publish(news: NewsFixture, publishedAt?: string): Promise<string> {
	const published = await publishEntry(admin, "news", news.id, { publishedAt });
	expect(published.ok, `publishing ${news.title}: ${nativeRefusalOf(published)}`).toBe(true);
	const stored = nativeItemOf(await readEntry(admin, "news", news.id))?.publishedAt;
	expect(typeof stored, "publishing records publishedAt").toBe("string");
	return String(stored);
}

/** What the native settings name, with the shell's fallbacks. */
async function siteTitleParts(): Promise<{ siteTitle: string; separator: string }> {
	const read = await cmsRequest(admin, "/_emdash/api/settings");
	expect(read.ok, "the native settings read").toBe(true);
	const settings = (nativeDataOf(read) ?? {}) as {
		title?: string;
		seo?: { titleSeparator?: string };
	};
	return {
		siteTitle: settings.title?.trim() || DEFAULT_SITE_TITLE,
		separator: settings.seo?.titleSeparator || " | ",
	};
}

/** The head metadata a search engine or a social preview reads. */
async function headOf(page: Page) {
	const meta = (selector: string) =>
		page
			.locator(selector)
			.first()
			.getAttribute("content", { timeout: 1000 })
			.catch(() => null);
	return {
		title: await page.title(),
		description: await meta('meta[name="description"]'),
		canonical: await page
			.locator('link[rel="canonical"]')
			.first()
			.getAttribute("href", { timeout: 1000 })
			.catch(() => null),
		ogTitle: await meta('meta[property="og:title"]'),
		ogDescription: await meta('meta[property="og:description"]'),
		ogUrl: await meta('meta[property="og:url"]'),
		ogType: await meta('meta[property="og:type"]'),
		ogImage: await meta('meta[property="og:image"]'),
		robots: await meta('meta[name="robots"]'),
	};
}

test.use({ viewport: DESKTOP_VIEWPORT });

test.beforeAll(async ({}, testInfo) => {
	const baseURL = testInfo.project.use.baseURL;
	if (baseURL === undefined) {
		throw new Error("this suite needs a configured baseURL (PLAYWRIGHT_BASE_URL)");
	}
	origin = new URL(baseURL).origin;
	admin = await createPatActor({
		baseUrl: origin,
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
});

test.afterAll(async () => {
	if (admin === undefined) return;
	const failures: string[] = [];
	for (const slug of movedSlugs) {
		const listed = await cmsRequest(admin, "/_emdash/api/redirects", {
			searchParams: { search: slug, limit: "100" },
		});
		if (!listed.ok) {
			failures.push(`listing the redirects of ${slug}: ${nativeRefusalOf(listed)}`);
			continue;
		}
		const redirects = nativeItemsOf(listed) as Array<{ id: string; source: string; auto: boolean }>;
		for (const redirect of redirects.filter(
			({ source, auto }) => auto && source.endsWith(`/${slug}`),
		)) {
			const removed = await cmsRequest(
				admin,
				`/_emdash/api/redirects/${encodeURIComponent(redirect.id)}`,
				{ method: "DELETE" },
			);
			if (!removed.ok)
				failures.push(`the redirect from ${redirect.source}: ${nativeRefusalOf(removed)}`);
		}
	}
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	if (!report.complete) failures.push(`owned fixtures left: ${JSON.stringify(report)}`);
	failures.push(...(await deleteSyntheticTerms(admin, ownedTerms)));
	expect(failures, "the suite's synthetic fixtures must all be removed").toEqual([]);
});

test("/news lists only published News, newest first, each with its date and its own address", async ({
	page,
}) => {
	const older = await createNews("older");
	const newer = await createNews("newer");
	const draft = await createNews("draft");
	const unpublished = await createNews("unpublished");
	const trashed = await createNews("trashed");
	await publish(unpublished);
	await publish(trashed);
	const olderAt = await publish(older);
	const newerAt = await publish(newer);
	expect((await unpublishEntry(admin, "news", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "news", trashed.id)).ok, "trash").toBe(true);

	const response = await page.goto("/news");
	expect(response?.status(), "GET /news").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("ข่าวสาร");
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "ข่าวสาร" }),
	).toHaveAttribute("aria-current", "page");

	const titles = await listedTitles(page);
	expect(
		ownTitles(titles, [older, newer, draft, unpublished, trashed]),
		"published only, newest first",
	).toEqual([newer.title, older.title]);

	for (const [news, at] of [
		[newer, newerAt],
		[older, olderAt],
	] as const) {
		const card = page.getByRole("article").filter({ hasText: news.title });
		await expect(card.getByRole("link", { name: news.title })).toHaveAttribute(
			"href",
			`/news/${news.slug}`,
		);
		await expect(card.locator("time")).toHaveText(thaiDate(at));
	}
});

test("/news pages through older News with the page number in the address, and ignores a page number that is not one", async ({
	page,
}) => {
	const fixtures: NewsFixture[] = [];
	for (let index = 0; index <= PAGE_SIZE; index += 1) {
		fixtures.push(await createNews(`page-${String(index).padStart(2, "0")}`));
	}
	for (const news of fixtures) await publish(news);
	const newestFirst = fixtures.toReversed();

	await page.goto("/news");
	const firstPage = ownTitles(await listedTitles(page), fixtures);
	expect(firstPage[0], "the newest News leads the first page").toBe(newestFirst[0].title);
	expect(firstPage, "the oldest fixture is past the first page").not.toContain(fixtures[0].title);

	const pagination = page.getByRole("navigation", { name: "การแบ่งหน้า" });
	await expect(pagination.getByRole("link", { name: "หน้าก่อนหน้า" })).toHaveCount(0);
	await pagination.getByRole("link", { name: "หน้าถัดไป" }).click();
	await expect(page).toHaveURL(/\/news\?page=2$/);
	const secondPage = ownTitles(await listedTitles(page), fixtures);
	expect([...firstPage, ...secondPage], "the pages continue the newest-first order").toEqual(
		newestFirst.map((news) => news.title).slice(0, firstPage.length + secondPage.length),
	);
	expect(secondPage, "the oldest fixture is on the second page").toContain(fixtures[0].title);
	await expect(
		page
			.getByRole("navigation", { name: "การแบ่งหน้า" })
			.getByRole("link", { name: "หน้าก่อนหน้า" }),
	).toHaveAttribute("href", "/news");

	for (const invalid of ["abc", "0", "-3", "2.5", "1e1", "99999999999"]) {
		const response = await page.goto(`/news?page=${encodeURIComponent(invalid)}`);
		expect(response?.status(), `?page=${invalid} is ignored, not an error`).toBe(200);
		expect(
			ownTitles(await listedTitles(page), fixtures)[0],
			`?page=${invalid} shows the first page`,
		).toBe(newestFirst[0].title);
		expect((await headOf(page)).canonical, `?page=${invalid} names the first page canonical`).toBe(
			`${origin}/news`,
		);
	}

	const beyond = await page.goto("/news?page=10000");
	expect(beyond?.status(), "a page past the end is not an error").toBe(200);
	await expect(page.getByRole("article")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("ไม่พบข่าวในหน้านี้")).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: "กลับไปหน้าแรกของรายการ" }),
	).toHaveAttribute("href", "/news");
});

test("/news/health lists News with any topic, ?topic= narrows it, and an unknown topic shows the empty state", async ({
	page,
}) => {
	const vaccine = await createTerm("topic", "วัคซีน");
	const dengue = await createTerm("topic", "ไข้เลือดออก");
	const vaccineNews = await createNews("health-vaccine", { taxonomies: { topic: [vaccine.slug] } });
	const dengueNews = await createNews("health-dengue", { taxonomies: { topic: [dengue.slug] } });
	const plainNews = await createNews("health-none");
	const draftNews = await createNews("health-draft", { taxonomies: { topic: [vaccine.slug] } });
	await publish(plainNews);
	await publish(vaccineNews);
	await publish(dengueNews);
	const all = [vaccineNews, dengueNews, plainNews, draftNews];

	const response = await page.goto("/news/health");
	expect(response?.status(), "GET /news/health").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("ข่าวสุขภาพ");
	const breadcrumb = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
	await expect(breadcrumb.getByRole("link")).toHaveText(["หน้าแรก", "ข่าวสาร"]);
	await expect(breadcrumb.getByRole("link", { name: "ข่าวสาร" })).toHaveAttribute("href", "/news");
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("ข่าวสุขภาพ");
	expect(ownTitles(await listedTitles(page), all), "News with a topic, newest first").toEqual([
		dengueNews.title,
		vaccineNews.title,
	]);

	// The filter is a plain GET form: it works without JavaScript and keeps the topic in the address.
	const filter = page.getByRole("form", { name: "กรองข่าวสุขภาพ" });
	await filter.getByLabel("ประเด็นสุขภาพ").selectOption({ label: vaccine.label });
	await filter.getByRole("button", { name: "แสดงผล" }).click();
	await expect(page).toHaveURL(`/news/health?topic=${vaccine.slug}`);
	await expect(filter.getByLabel("ประเด็นสุขภาพ")).toHaveValue(vaccine.slug);
	expect(ownTitles(await listedTitles(page), all)).toEqual([vaccineNews.title]);
	expect((await headOf(page)).canonical).toBe(`${origin}/news/health?topic=${vaccine.slug}`);

	const unknown = await page.goto(`/news/health?topic=${syntheticSlug("no-such-topic")}`);
	expect(unknown?.status(), "an unknown topic is not an error").toBe(200);
	await expect(page.getByRole("article")).toHaveCount(0);
	await expect(page.getByRole("main").getByText("ไม่พบข่าวสุขภาพในประเด็นนี้")).toBeVisible();
});

test("a News page shows its title, Thai date, category, topics, image with its alt text, body and breadcrumb", async ({
	page,
}) => {
	const category = await createTerm("news_category", "ประชาสัมพันธ์");
	const topic = await createTerm("topic", "สุขภาพจิต");
	const media = await uploadSyntheticMedia(admin);
	expect(media.mediaId, "the synthetic image must upload").toBeDefined();
	const alt = `${SYNTHETIC_FIXTURE_MARK} ภาพกิจกรรมรณรงค์`;
	const described = await setMediaAlt(admin, media.mediaId!, alt);
	expect(described.ok, `the media alt text: ${nativeRefusalOf(described)}`).toBe(true);
	const bodyText = `${SYNTHETIC_FIXTURE_MARK} เนื้อหาข่าวย่อหน้าแรก`;
	const news = await createNews("detail", {
		data: {
			summary: `${SYNTHETIC_FIXTURE_MARK} สรุปข่าว`,
			body: [portableTextBlock(bodyText)],
			featured_image: { id: media.mediaId },
		},
		taxonomies: { topic: [topic.slug], news_category: [category.slug] },
	});
	// 23 Sep 2026 17:30 UTC is already 24 Sep in Bangkok.
	await publish(news, "2026-09-23T17:30:00.000Z");

	const response = await page.goto(`/news/${news.slug}`);
	expect(response?.status(), "GET the News page").toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("heading", { level: 1 })).toHaveText(news.title);
	await expect(main.locator("time").first()).toHaveText("24 ก.ย. 2569");
	await expect(main.getByText(category.label)).toBeVisible();
	await expect(main.getByRole("link", { name: topic.label })).toHaveAttribute(
		"href",
		`/news/health?topic=${topic.slug}`,
	);
	await expect(main.getByText(bodyText)).toBeVisible();

	const image = main.getByRole("img", { name: alt });
	await expect(image).toBeVisible();
	const sizing = await image.evaluate((element: HTMLImageElement) => ({
		loaded: element.complete && element.naturalWidth > 0,
		width: element.getAttribute("width"),
		height: element.getAttribute("height"),
		fits: element.getBoundingClientRect().width <= (element.closest("main")?.clientWidth ?? 0),
	}));
	expect(sizing.loaded, "the image loads").toBe(true);
	expect(sizing.width, "the image declares its width").toBeTruthy();
	expect(sizing.height, "the image declares its height").toBeTruthy();
	expect(sizing.fits, "the image fits the page").toBe(true);

	const breadcrumb = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
	await expect(breadcrumb.getByRole("link")).toHaveText(["หน้าแรก", "ข่าวสาร"]);
	await expect(breadcrumb.getByRole("link", { name: "หน้าแรก" })).toHaveAttribute("href", "/");
	await expect(breadcrumb.getByRole("link", { name: "ข่าวสาร" })).toHaveAttribute("href", "/news");
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(news.title);
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "ข่าวสาร" }),
	).toHaveAttribute("aria-current", "true");
});

test("a News item whose featured image was deleted from the media library shows no broken image on the lists or its page", async ({
	page,
}) => {
	const topic = await createTerm("topic", "อนามัยแม่และเด็ก");
	const media = await uploadSyntheticMedia(admin);
	expect(media.mediaId, "the synthetic image must upload").toBeDefined();
	const news = await createNews("image-gone", {
		data: { featured_image: { id: media.mediaId } },
		taxonomies: { topic: [topic.slug] },
	});
	await publish(news);
	const removed = await deleteMedia(admin, media.mediaId!);
	expect(removed.ok, `deleting the media item: ${nativeRefusalOf(removed)}`).toBe(true);

	for (const list of ["/news", `/news/health?topic=${topic.slug}`]) {
		await page.goto(list);
		const card = page.getByRole("article").filter({ hasText: news.title });
		await expect(card, `${list} still lists the News`).toHaveCount(1);
		await expect(card.locator("img"), `${list} shows no picture for it`).toHaveCount(0);
		await expect(card.getByTestId("card-visual"), `${list} shows the plain visual`).toHaveCount(1);
	}

	const response = await page.goto(`/news/${news.slug}`);
	expect(response?.status(), "the News page still renders").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(news.title);
	await expect(page.getByRole("main").locator("img"), "the page leaves the image out").toHaveCount(
		0,
	);
});

test("a draft, unpublished or trashed News item answers the site 404 and stays out of every list", async ({
	page,
}) => {
	const topic = await createTerm("topic", "โภชนาการ");
	const tagged = { taxonomies: { topic: [topic.slug] } };
	const draft = await createNews("hidden-draft", tagged);
	const unpublished = await createNews("hidden-unpublished", tagged);
	const trashed = await createNews("hidden-trashed", tagged);
	await publish(unpublished);
	await publish(trashed);
	expect((await unpublishEntry(admin, "news", unpublished.id)).ok, "unpublish").toBe(true);
	expect((await trashEntry(admin, "news", trashed.id)).ok, "trash").toBe(true);
	const hidden = [draft, unpublished, trashed];

	for (const news of hidden) {
		await expectSiteNotFound(page, `/news/${news.slug}`, news.title);
	}
	for (const list of ["/news", "/news/health", `/news/health?topic=${topic.slug}`]) {
		await page.goto(list);
		expect(ownTitles(await listedTitles(page), hidden), `${list} hides them`).toEqual([]);
	}
});

test("a signed preview link renders a draft, and the same address without a valid token answers 404", async ({
	page,
}) => {
	const draft = await createNews("preview");
	const minted = await cmsRequest(
		admin,
		`/_emdash/api/content/news/${encodeURIComponent(draft.id)}/preview-url`,
		{ method: "POST", body: {} },
	);
	expect(minted.ok, nativeRefusalOf(minted)).toBe(true);
	// The signed token stays out of every message.
	const link = new URL(String(nativeDataOf(minted)?.url), origin);
	expect(link.pathname, "the preview link is the draft's canonical address").toBe(
		`/news/${draft.slug}`,
	);

	const preview = await page.goto(link.toString());
	expect(preview?.status(), "the preview renders").toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(draft.title);
	expect((await headOf(page)).robots, "a preview is kept out of search engines").toContain(
		"noindex",
	);

	await expectSiteNotFound(page, link.pathname, "the draft without a token");
	const forged = new URL(link);
	forged.searchParams.set("_preview", "forged");
	await expectSiteNotFound(
		page,
		`${forged.pathname}${forged.search}`,
		"the draft with a forged token",
	);
});

test("after a slug change, the old address redirects with a 301 and the new address renders", async ({
	page,
	request,
}) => {
	const news = await createNews("renamed");
	await publish(news);
	const newSlug = syntheticSlug("renamed-new");
	movedSlugs.push(news.slug);
	const renamed = await updateEntry(admin, "news", news.id, { slug: newSlug });
	expect(renamed.ok, nativeRefusalOf(renamed)).toBe(true);
	await publish(news);

	// The native redirect list shows the move before the old address is requested, so a missing
	// redirect never leaves a synthetic path in the 404 log.
	const listed = await cmsRequest(admin, "/_emdash/api/redirects", {
		searchParams: { search: news.slug },
	});
	expect((nativeItemsOf(listed) as Array<{ source: string }>).map(({ source }) => source)).toEqual([
		`/news/${news.slug}`,
	]);

	const old = await request.get(`/news/${news.slug}`, { maxRedirects: 0 });
	expect(old.status(), "the old address").toBe(301);
	expect(old.headers().location).toBe(`/news/${newSlug}`);

	const response = await page.goto(`/news/${news.slug}`);
	expect(response?.status(), "the redirect lands on the new address").toBe(200);
	await expect(page).toHaveURL(`/news/${newSlug}`);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(news.title);
	expect((await headOf(page)).canonical).toBe(`${origin}/news/${newSlug}`);
});

test.describe("the head of each News page", () => {
	test("a News page carries its title, description, absolute canonical address and OG tags, with the SEO fields first and the summary as the fallback", async ({
		page,
	}) => {
		const { siteTitle, separator } = await siteTitleParts();
		const summary = `${SYNTHETIC_FIXTURE_MARK} สรุปข่าวสำหรับเครื่องมือค้นหา`;
		const plain = await createNews("seo-plain", { data: { summary } });
		const seoTitle = `${SYNTHETIC_FIXTURE_MARK} ชื่อสำหรับเครื่องมือค้นหา`;
		const seoDescription = `${SYNTHETIC_FIXTURE_MARK} คำอธิบายจากช่อง SEO`;
		const tuned = await createNews("seo-tuned", {
			data: { summary },
			seo: { title: seoTitle, description: seoDescription },
		});
		await publish(plain);
		await publish(tuned);

		await page.goto(`/news/${plain.slug}`);
		const plainHead = await headOf(page);
		expect(plainHead).toMatchObject({
			title: `${plain.title}${separator}${siteTitle}`,
			description: summary,
			canonical: `${origin}/news/${plain.slug}`,
			ogTitle: plain.title,
			ogDescription: summary,
			ogUrl: `${origin}/news/${plain.slug}`,
			ogType: "article",
		});
		expect(plainHead.robots, "a published News page is indexable").toBeNull();

		await page.goto(`/news/${tuned.slug}`);
		expect(await headOf(page)).toMatchObject({
			title: `${seoTitle}${separator}${siteTitle}`,
			description: seoDescription,
			canonical: `${origin}/news/${tuned.slug}`,
			ogTitle: seoTitle,
			ogDescription: seoDescription,
		});
	});

	test("the lists carry their title, a description, an absolute canonical address and the default OG image from settings", async ({
		page,
	}) => {
		const { siteTitle, separator } = await siteTitleParts();
		const saved = await cmsRequest(admin, "/_emdash/api/settings");
		expect(saved.ok, "the native settings read").toBe(true);
		const before = (nativeDataOf(saved) ?? {}) as {
			seo?: { defaultOgImage?: { mediaId: string; alt?: string } };
		};
		const media = await uploadSyntheticMedia(admin);
		expect(media.mediaId, "the synthetic OG image must upload").toBeDefined();
		try {
			const written = await cmsRequest(admin, "/_emdash/api/settings", {
				method: "POST",
				body: { seo: { defaultOgImage: { mediaId: media.mediaId } } },
			});
			expect(written.ok, nativeRefusalOf(written)).toBe(true);
			const ogImageUrl = (nativeDataOf(written) as { seo?: { defaultOgImage?: { url?: string } } })
				?.seo?.defaultOgImage?.url;
			expect(ogImageUrl, "the settings resolve the OG image").toBeTruthy();
			const absoluteOgImage = new URL(ogImageUrl!, origin).toString();

			for (const [path, title] of [
				["/news", "ข่าวสาร"],
				["/news/health", "ข่าวสุขภาพ"],
			]) {
				await page.goto(path);
				const head = await headOf(page);
				expect(head).toMatchObject({
					title: `${title}${separator}${siteTitle}`,
					canonical: `${origin}${path}`,
					ogUrl: `${origin}${path}`,
					ogTitle: title,
					ogType: "website",
					ogImage: absoluteOgImage,
				});
				expect(head.description, `${path} has a description`).toBeTruthy();
			}
			await page.goto("/news?page=2");
			expect((await headOf(page)).canonical).toBe(`${origin}/news?page=2`);
		} finally {
			const restored = await cmsRequest(admin, "/_emdash/api/settings", {
				method: "POST",
				body: {
					seo: {
						defaultOgImage:
							before.seo?.defaultOgImage === undefined
								? null
								: {
										mediaId: before.seo.defaultOgImage.mediaId,
										alt: before.seo.defaultOgImage.alt,
									},
					},
				},
			});
			expect(restored.ok, `restoring the default OG image: ${nativeRefusalOf(restored)}`).toBe(
				true,
			);
		}
	});
});

test.describe("accessibility and reflow", () => {
	let news: NewsFixture;

	test.beforeAll(async () => {
		const topic = await createTerm("topic", "ผู้สูงอายุ");
		const category = await createTerm("news_category", "กิจกรรม");
		const media = await uploadSyntheticMedia(admin);
		expect(media.mediaId, "the synthetic image must upload").toBeDefined();
		const described = await cmsRequest(
			admin,
			`/_emdash/api/media/${encodeURIComponent(media.mediaId!)}`,
			{ method: "PUT", body: { alt: `${SYNTHETIC_FIXTURE_MARK} ภาพประกอบข่าว` } },
		);
		expect(described.ok, `the media alt text: ${nativeRefusalOf(described)}`).toBe(true);
		news = await createNews("a11y", {
			data: {
				summary: `${SYNTHETIC_FIXTURE_MARK} สรุปข่าวสำหรับตรวจการเข้าถึง`,
				body: [portableTextBlock(`${SYNTHETIC_FIXTURE_MARK} เนื้อหาข่าว`)],
				featured_image: { id: media.mediaId },
			},
			taxonomies: { topic: [topic.slug], news_category: [category.slug] },
		});
		await publish(news);
	});

	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on the News pages at the ${width} width`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			for (const path of ["/news", "/news/health", `/news/${news.slug}`]) {
				const response = await page.goto(path);
				expect(response?.status(), `GET ${path}`).toBe(200);
				await expectNoAxeViolations(page, `${path} at ${width}`);
				await expectVisibleFocusOnEveryStop(page, `${path} at ${width}`);
			}
		});
	}

	test("no News page scrolls sideways at 320 px", async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		for (const path of ["/news", "/news/health", `/news/${news.slug}`]) {
			await page.goto(path);
			await expectNoHorizontalScroll(page, path);
		}
	});
});

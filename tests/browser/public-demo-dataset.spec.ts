// The demo dataset on the public site (#66; spec #51 "Demo dataset", approved Q4).
//
// While the dataset is installed (scripts/demo-dataset.ts add), every page and every Homepage
// section shows content: each list page lists entries titled "[ตัวอย่าง] …", and the first of them
// opens on its own page under that title; the Personnel lists and the Contact page show theirs;
// each reserved Basic Page's address shows the page published there, the dataset's or the
// office's own; and the Homepage shows a Featured item, both its News card and its Announcements,
// and every other section that hides while it has nothing to show. The suite only reads. It skips
// while the dataset is not installed, and fails while it is installed in part.

import { demoDataset } from "../../scripts/demo-dataset/content.ts";
import { DEMO_PREFIX } from "../../scripts/demo-dataset/plan.ts";
import {
	dataOfItem,
	devAdminActor,
	nativeItemOf,
	readEntry,
	statusOfItem,
	type CmsActor,
} from "./cms.helpers";
import {
	DESKTOP_VIEWPORT,
	HOMEPAGE_HEADINGS,
	expect,
	homepageSection,
	listedItem,
	listedTitles,
	siteTitleParts,
	test,
} from "./public.helpers";

/** The mark every demo title starts with (#66). */
const MARK = "[ตัวอย่าง]";

/** The list pages, each with the dataset's entries of its kind. */
const LIST_PAGES = [
	"/news",
	"/news/health",
	"/activities",
	"/announcements",
	"/services",
	"/health-services",
	"/health/content",
	"/health/reports",
	"/documents",
	"/about/policies",
	"/about/plans",
	"/about/results",
	`/search?q=${encodeURIComponent("วัคซีน")}`,
];

/** The addresses of the reserved Basic Pages, by slug (src/lib/basic-pages.ts). */
const BASIC_PAGES = {
	about: "/about",
	organization: "/about/organization",
	privacy: "/pages/privacy",
	accessibility: "/pages/accessibility",
};

/** The Personnel pages: a person has no page of their own (`03` §5). */
const PERSONNEL_PAGES = ["/about/leadership", "/about/personnel"];

test.use({ viewport: DESKTOP_VIEWPORT });

let admin: CmsActor;
/** The site title, which heads the Homepage's Contact Summary. */
let siteTitle: string;

test.beforeAll(async () => {
	admin = await devAdminActor();
	({ siteTitle } = await siteTitleParts(admin));
	// The reserved Basic Pages may be the office's own, so the dataset is told by its demo slugs.
	const entries = demoDataset(new Date()).entries.filter(({ slug }) =>
		slug.startsWith(DEMO_PREFIX),
	);
	const missing: string[] = [];
	for (const { collection, slug } of entries) {
		const item = nativeItemOf(await readEntry(admin, collection, slug));
		const title = String(dataOfItem(item).title ?? "");
		if (statusOfItem(item) !== "published" || !title.startsWith(MARK)) {
			missing.push(`${collection}/${slug}`);
		}
	}
	test.skip(
		missing.length === entries.length,
		"the demo dataset is not installed (scripts/demo-dataset.ts add)",
	);
	expect(missing, "the demo dataset's entries that are not published").toEqual([]);
});

for (const path of LIST_PAGES) {
	test(`${path} lists the dataset's entries, which open on their own pages`, async ({ page }) => {
		await page.goto(path);
		const [first] = (await listedTitles(page)).filter((title) => title.startsWith(MARK));
		expect(first, `${path} lists an entry titled "${MARK} …"`).toBeDefined();
		await listedItem(page, first!).getByRole("link", { name: first }).click();
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(first!);
	});
}

for (const path of PERSONNEL_PAGES) {
	test(`${path} lists the dataset's people`, async ({ page }) => {
		await page.goto(path);
		const people = (await listedTitles(page)).filter((name) => name.startsWith(MARK));
		expect(people.length, `${path} lists people named "${MARK} …"`).toBeGreaterThan(0);
	});
}

for (const [slug, path] of Object.entries(BASIC_PAGES)) {
	test(`${path} shows the Basic Page published at "${slug}"`, async ({ page }) => {
		const item = nativeItemOf(await readEntry(admin, "pages", slug));
		expect(statusOfItem(item), `the Basic Page at "${slug}"`).toBe("published");
		await page.goto(path);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			String(dataOfItem(item).title),
		);
	});
}

test("the Homepage shows a Featured item and every section", async ({ page }) => {
	await page.goto("/");
	// Without a Featured item, the Search heading comes first (src/pages/index.astro).
	await expect(
		page.getByRole("main").getByRole("heading", { level: 2 }).first(),
		"a Featured item heads the page",
	).not.toHaveText(HOMEPAGE_HEADINGS.search);
	for (const [section, heading] of Object.entries(HOMEPAGE_HEADINGS)) {
		await expect(homepageSection(page, heading), `the ${section} section`).toBeVisible();
	}
	// The News and Announcements section shows while either half has some (src/pages/index.astro).
	const news = homepageSection(page, HOMEPAGE_HEADINGS.news);
	await expect(news.getByRole("article"), "the News card").toContainText(MARK);
	await expect(
		news.getByRole("list", { name: "ประกาศ" }).getByRole("listitem").first(),
		"the current Announcements",
	).toContainText(MARK);
	await expect(
		homepageSection(page, siteTitle).getByRole("link", { name: "เปิดแผนที่" }),
		"the Contact Summary shows Office Contact",
	).toBeVisible();
	for (const name of ["นโยบายความเป็นส่วนตัว", "การเข้าถึงเว็บไซต์"]) {
		await expect(page.getByRole("contentinfo").getByRole("link", { name })).toBeVisible();
	}
});

test("/contact shows Office Contact", async ({ page }) => {
	await page.goto("/contact");
	await expect(page.getByRole("main")).toContainText(MARK);
	await expect(page.getByRole("main").getByRole("link", { name: "เปิดแผนที่" })).toBeVisible();
});

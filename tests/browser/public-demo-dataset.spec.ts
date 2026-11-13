// The demo dataset on the public site (#66; spec #51 "Demo dataset", approved Q4).
//
// While the dataset is installed (scripts/demo-dataset.ts add), every page and every Homepage
// section shows content: each entry carries the title the dataset defines (#289); each list page
// lists entries titled "[ตัวอย่าง] …", and the first of them opens on its own page under that
// title; the Personnel lists and the Contact page show theirs;
// each reserved Basic Page's address shows the page published there, the dataset's or the
// office's own; the Homepage shows a Featured item, Latest News and the current Announcements,
// and every other section that hides while it has nothing to show, its six Frequently Used
// Services each under an icon of its own (#248); and the ITA landing leads to the
// dataset's fiscal year, whose page lists its MOITs, one of them with a file removed from the
// library (#126). Every public template but the 404 page, as the dataset fills it, passes the axe
// and focus checks at both widths and does not scroll sideways at 320 px (#67). The suite only
// reads. It skips while the dataset is not installed, and fails while it is installed in part.

import { demoDataset } from "../../scripts/demo-dataset/content.ts";
import { DEMO_PREFIX } from "../../scripts/demo-dataset/plan.ts";
import { CANONICAL_URL_PATTERNS } from "../canonical-url-patterns";
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
	HOMEPAGE_HEADLINE,
	expect,
	homepageSection,
	listedItem,
	listedTitles,
	test,
	testAccessibilityAndReflow,
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

/**
 * The dataset's entries, told by their demo slugs. The reserved Basic Pages are left out: they keep
 * their reserved slugs and may be the office's own, so BASIC_PAGES checks them by address.
 */
const DEMO_ENTRIES = demoDataset(new Date()).entries.filter(({ slug }) =>
	slug.startsWith(DEMO_PREFIX),
);

/** The dataset's MOITs, in number order. */
const DEMO_MOITS = DEMO_ENTRIES.filter(({ collection }) => collection === "moit");

/**
 * The ITA pages the dataset fills: the landing, its fiscal year's page and each MOIT's, at the
 * MOIT collection's `/ita/{slug}` (seed/seed.json).
 */
const ITA_PAGES = [
	"/ita",
	...new Set(DEMO_MOITS.map(({ data }) => `/ita/${String(data.fiscal_year)}`)),
	...DEMO_MOITS.map(({ slug }) => `/ita/${slug}`),
];

/** The first dataset entry of each public collection, at its own address. */
const ENTRY_PAGES = Object.entries(CANONICAL_URL_PATTERNS).flatMap(([collection, pattern]) => {
	const entry = DEMO_ENTRIES.find((candidate) => candidate.collection === collection);
	return entry === undefined ? [] : [pattern.replace("{slug}", entry.slug)];
});

test.use({ viewport: DESKTOP_VIEWPORT });

let admin: CmsActor;
/** The addresses of the reserved Basic Pages that are published, the only ones to sweep. */
const publishedBasicPages: string[] = [];
/** The dataset's entries whose title on the runtime is not the one the dataset defines. */
const retitled: string[] = [];

test.beforeAll(async () => {
	admin = await devAdminActor();
	const missing: string[] = [];
	for (const { collection, slug, data } of DEMO_ENTRIES) {
		const item = nativeItemOf(await readEntry(admin, collection, slug));
		const title = String(dataOfItem(item).title ?? "");
		if (statusOfItem(item) !== "published" || !title.startsWith(MARK)) {
			missing.push(`${collection}/${slug}`);
		} else if (title !== data.title) {
			retitled.push(`${collection}/${slug}`);
		}
	}
	test.skip(
		missing.length === DEMO_ENTRIES.length,
		"the demo dataset is not installed (scripts/demo-dataset.ts add)",
	);
	expect(missing, "the demo dataset's entries that are not published").toEqual([]);
	// An office page at a reserved slug may be a draft; its address must not land in the 404 log.
	for (const [slug, path] of Object.entries(BASIC_PAGES)) {
		if (statusOfItem(nativeItemOf(await readEntry(admin, "pages", slug))) === "published") {
			publishedBasicPages.push(path);
		}
	}
});

test("each entry carries the title the dataset defines", () => {
	// `add` keeps an entry it finds as it is, so a reworded title arrives with `remove` and `add`
	// (docs/operations/development-quadlet.md "Demo dataset"; #289).
	expect(retitled, "the entries whose title the dataset has reworded").toEqual([]);
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
	// The Featured card is the hero's only link (src/components/HomeHero.astro).
	await expect(
		homepageSection(page, HOMEPAGE_HEADLINE).getByRole("link"),
		"a Featured item heads the page",
	).toHaveCount(1);
	// Every section but Quick Access, whose menu the dataset leaves empty (spec #239 "Quick
	// Access"; #247).
	for (const [section, heading] of Object.entries(HOMEPAGE_HEADINGS)) {
		const shown = homepageSection(page, heading);
		if (section === "quickAccess") await expect(shown, "Quick Access").toHaveCount(0);
		else await expect(shown, `the ${section} section`).toBeVisible();
	}
	const news = homepageSection(page, HOMEPAGE_HEADINGS.news);
	await expect(news.getByRole("article").first(), "the newest News").toContainText(MARK);
	await expect(
		homepageSection(page, HOMEPAGE_HEADINGS.announcements).getByRole("listitem").first(),
		"the current Announcements",
	).toContainText(MARK);
	await expect(
		homepageSection(page, HOMEPAGE_HEADINGS.contact).getByRole("link", { name: "เปิดแผนที่" }),
		"the Contact Summary shows Office Contact",
	).toBeVisible();
	for (const name of ["นโยบายความเป็นส่วนตัว", "การเข้าถึงเว็บไซต์"]) {
		await expect(page.getByRole("contentinfo").getByRole("link", { name })).toBeVisible();
	}
});

test("the Homepage's six Frequently Used Services each show an icon of their own", async ({
	page,
}) => {
	await page.goto("/");
	const icons = homepageSection(page, HOMEPAGE_HEADINGS.services)
		.getByTestId("service-icon")
		.locator("svg");
	await expect(icons).toHaveCount(6);
	// Lucide names each icon in its class, `lucide-<name>` (docs/agents/lucide-astro-1.59.0.md).
	const names = await icons.evaluateAll((svgs) =>
		svgs.map((svg) => [...svg.classList].find((name) => name.startsWith("lucide-"))),
	);
	expect(new Set(names).size, `six different icons among ${names.join(", ")}`).toBe(6);
});

test("/ita leads to the dataset's fiscal year, whose page lists its MOITs, each opening on its own page", async ({
	page,
}) => {
	const year = String(DEMO_MOITS[0]!.data.fiscal_year);
	await page.goto("/ita");
	await page.getByRole("main").getByRole("link", { name: year }).click();
	await expect(page).toHaveURL(new RegExp(`/ita/${year}$`));
	const yearPage = page.url();
	for (const { data } of DEMO_MOITS) {
		const heading = `MOIT ${String(data.number)} ${String(data.title)}`;
		await page.goto(yearPage);
		await page.getByRole("main").getByRole("link", { name: heading }).click();
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
	}
});

test("the dataset's MOIT 1 shows its removed file as unavailable, and its other files", async ({
	page,
}) => {
	const moit = DEMO_MOITS.find(({ data }) => data.number === 1)!;
	await page.goto(`/ita/${moit.slug}`);
	const main = page.getByRole("main");
	await expect(main.getByRole("listitem").filter({ hasText: "2.3 ฟอร์มเผยแพร่" })).toContainText(
		"ไฟล์ไม่พร้อมให้บริการ",
	);
	await expect(main.getByText("ไฟล์ไม่พร้อมให้บริการ", { exact: true })).toHaveCount(1);
	await expect(main.getByRole("link", { name: /^2\.2 / })).toHaveAttribute("download", /\.pdf$/);
});

test("/contact shows Office Contact", async ({ page }) => {
	await page.goto("/contact");
	await expect(page.getByRole("main")).toContainText(MARK);
	await expect(page.getByRole("main").getByRole("link", { name: "เปิดแผนที่" })).toBeVisible();
});

// Every public template with the dataset's content (#67), beside each suite's own sweep with its
// fixtures, in three groups that each finish within the test timeout. The 404 page answers 404, so
// public-shell.spec.ts sweeps it.
testAccessibilityAndReflow("the dataset's list pages", () => LIST_PAGES);
testAccessibilityAndReflow("the dataset's entry pages", () => ENTRY_PAGES);
testAccessibilityAndReflow("the dataset's ITA pages", () => ITA_PAGES);
testAccessibilityAndReflow("the Homepage, hub, About, Basic and Contact pages", () => [
	"/",
	"/health",
	"/contact",
	...PERSONNEL_PAGES,
	...publishedBasicPages,
]);

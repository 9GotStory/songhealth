// Feature 003 public-page test harness (#52; spec #51 "Testing Decisions").
//
// Shared by every public-page suite (Seam A: public pages over HTTP on the
// single development runtime, http://127.0.0.1:4324):
// - `test`: Playwright's test with an automatic third-party request guard.
//   Every request and WebSocket a page opens must stay on the configured
//   origin, so loading a page never sends the visit to a font host, map or
//   tracker elsewhere (#51 user story 11). The guard fails the test after it
//   has run.
// - `expectNoAxeViolations`: axe-core with the WCAG 2.2 AA tag set.
// - `DESKTOP_VIEWPORT` / `MOBILE_VIEWPORT`: the two widths every template is
//   checked at. The mobile width is 320 CSS px, the narrowest width the site
//   must reflow to without horizontal scrolling (WCAG 2.2 SC 1.4.10).
// - What the shell shows every page: the 404 page, the default site title, the
//   breadcrumb, Thai dates, the titles and items a list shows, and a record
//   page's details.
//
// Verified against the pinned @axe-core/playwright 4.14.0 (axe-core 4.14.0,
// node_modules/@axe-core/playwright/dist/index.d.ts): `new AxeBuilder({ page })
// .withTags(tags).analyze()` resolves to the axe results, whose `violations`
// lists each failed rule with the nodes it failed on.

import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

import { cmsRequest, nativeDataOf, type CmsActor } from "./cms.helpers";

export { expect };

/** WCAG 2.2 level A and AA, as axe-core tags (#51 Testing Decisions). */
const WCAG_22_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** The Figma Homepage Concept v1 desktop frame width. */
export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/** The narrowest width the site supports (WCAG 2.2 SC 1.4.10 reflow). */
export const MOBILE_VIEWPORT = { width: 320, height: 640 };

export const VIEWPORTS = { desktop: DESKTOP_VIEWPORT, mobile: MOBILE_VIEWPORT };

const NETWORK_PROTOCOLS = new Set(["http:", "https:", "ws:", "wss:"]);

export const test = base.extend<{ thirdPartyRequests: string[] }>({
	thirdPartyRequests: [
		async ({ page, baseURL }, use) => {
			if (baseURL === undefined) {
				throw new Error("the public-page suites need a configured baseURL (PLAYWRIGHT_BASE_URL)");
			}
			const siteHost = new URL(baseURL).host;
			const requests: string[] = [];
			const record = (url: string) => {
				const { protocol, host } = new URL(url);
				if (NETWORK_PROTOCOLS.has(protocol) && host !== siteHost) {
					requests.push(url);
				}
			};
			page.on("request", (request) => record(request.url()));
			page.on("websocket", (socket) => record(socket.url()));
			await use(requests);
			expect(requests, "a public page must not contact any third-party origin").toEqual([]);
		},
		{ auto: true },
	],
});

/**
 * Walk the page with the Tab key from the current focus starting point to the
 * end of the document. Every element that takes focus must show a focus
 * indicator (an outline of at least 2 px, or a box shadow) and must not be
 * covered by other content (WCAG 2.2 SC 2.4.7 and 2.4.11).
 */
export async function expectVisibleFocusOnEveryStop(page: Page, label: string): Promise<void> {
	const stops: string[] = [];
	for (let step = 0; step < 100; step += 1) {
		await page.keyboard.press("Tab");
		const stop = await page.evaluate(() => {
			const element = document.activeElement;
			if (element === null || element === document.body) return null;
			const style = getComputedStyle(element);
			// A link that wraps has one box per line, and the middle of its bounding box can fall
			// beside a short last line. The first line box always holds the element.
			const rect = element.getClientRects()[0] ?? element.getBoundingClientRect();
			const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
			return {
				name: `<${element.tagName.toLowerCase()}> ${(element.textContent ?? "").replace(/\s+/g, " ").trim()}`,
				indicator:
					(style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) >= 2) ||
					style.boxShadow !== "none",
				unobscured: rect.width > 0 && rect.height > 0 && hit !== null && element.contains(hit),
			};
		});
		if (stop === null) break;
		expect(stop.indicator, `${label}: ${stop.name} must show a focus indicator`).toBe(true);
		expect(stop.unobscured, `${label}: ${stop.name} must not be covered while focused`).toBe(true);
		stops.push(stop.name);
	}
	expect(stops.length, `${label}: the page must have focusable elements`).toBeGreaterThan(0);
}

/** Fail when the page as it is now scrolls sideways at the current viewport width. */
export async function expectNoHorizontalScroll(page: Page, label: string): Promise<void> {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
	);
	expect(overflow, `${label}: the page must not scroll horizontally`).toBeLessThanOrEqual(0);
}

/**
 * Run axe with the WCAG 2.2 AA tag set on the page as it is now, and fail with
 * a readable summary (rule, impact and the offending nodes) on any violation.
 */
export async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
	const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA_TAGS).analyze();
	const violations = results.violations.map(
		(violation) =>
			`${violation.id} (${violation.impact ?? "unknown impact"}): ${violation.help} — ${violation.nodes
				.map((node) => node.target.join(" "))
				.join(", ")}`,
	);
	expect(violations, `${label}: axe must report no WCAG 2.2 AA violations`).toEqual([]);
}

/** The heading of the site-designed 404 page. */
export const NOT_FOUND_HEADING = "ไม่พบหน้าที่คุณต้องการ";

/** The site title shown while the native site settings name none (src/lib/site-identity.ts). */
export const DEFAULT_SITE_TITLE = "สำนักงานสาธารณสุขอำเภอสอง";

const THAI_MONTHS = [
	"ม.ค.",
	"ก.พ.",
	"มี.ค.",
	"เม.ย.",
	"พ.ค.",
	"มิ.ย.",
	"ก.ค.",
	"ส.ค.",
	"ก.ย.",
	"ต.ค.",
	"พ.ย.",
	"ธ.ค.",
];

/** A stored instant as citizens read it: the Bangkok (UTC+7) day with the Buddhist Era year. */
export function thaiDate(iso: string): string {
	const bangkok = new Date(Date.parse(iso) + 7 * 60 * 60 * 1000);
	return `${bangkok.getUTCDate()} ${THAI_MONTHS[bangkok.getUTCMonth()]} ${bangkok.getUTCFullYear() + 543}`;
}

/** Fail unless `path` answers the site 404 page with status 404. */
export async function expectSiteNotFound(page: Page, path: string, label: string): Promise<void> {
	const response = await page.goto(path);
	expect(response?.status(), `${label} must answer 404`).toBe(404);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(NOT_FOUND_HEADING);
}

/**
 * Fail unless the breadcrumb links to `links` ([label, address] pairs, root first) and then names
 * the current page `current` as text.
 */
export async function expectBreadcrumb(
	page: Page,
	links: ReadonlyArray<readonly [label: string, href: string]>,
	current: string,
): Promise<void> {
	const breadcrumb = page.getByRole("navigation", { name: "เส้นทางนำทาง" });
	const crumbs = breadcrumb.getByRole("link");
	await expect(crumbs).toHaveText(links.map(([label]) => label));
	for (const [index, [label, href]] of links.entries()) {
		await expect(crumbs.nth(index), `the ${label} crumb`).toHaveAttribute("href", href);
	}
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(current);
}

/** The titles of the cards or rows a list page shows, in order. */
export async function listedTitles(page: Page): Promise<string[]> {
	return (
		await page.getByRole("main").getByRole("article").getByRole("heading").allTextContents()
	).map((text) => text.trim());
}

/** Only the given fixtures' titles, in the order the page lists them. */
export function ownTitles(titles: string[], fixtures: ReadonlyArray<{ title: string }>): string[] {
	const own = new Set(fixtures.map((fixture) => fixture.title));
	return titles.filter((title) => own.has(title));
}

/** The card or row a list page shows for the item titled `title`. */
export function listedItem(page: Page, title: string) {
	return page.getByRole("main").getByRole("article").filter({ hasText: title });
}

/** The value a record page states for one of its details, by the detail's Thai name. */
export function detailOf(page: Page, name: string) {
	return page
		.getByRole("main")
		.locator("dl > div")
		.filter({ has: page.getByRole("term").filter({ hasText: new RegExp(`^${name}$`) }) })
		.getByRole("definition");
}

/** The site title and title separator the native settings name, with the shell's fallbacks. */
export async function siteTitleParts(
	admin: CmsActor,
): Promise<{ siteTitle: string; separator: string }> {
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

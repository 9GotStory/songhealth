// Feature 003 public-page test harness (#52; spec #51 "Testing Decisions").
//
// Shared by every public-page suite (Seam A: public pages over HTTP on the
// single development runtime, http://127.0.0.1:4324):
// - `test`: Playwright's test with an automatic third-party request guard.
//   Every request and WebSocket a page opens must stay on the configured
//   origin, so loading a page never sends the visit to a font host, map or
//   tracker elsewhere (#51 user story 11). The guard fails the test after it
//   has run.
// - `expectNoAxeViolations`: axe-core with the WCAG 2.2 AA tag set and its page-structure rules,
//   and every icon hidden from assistive technology.
// - `DESKTOP_VIEWPORT` / `MOBILE_VIEWPORT`: the two widths every template is
//   checked at. The mobile width is 320 CSS px, the narrowest width the site
//   must reflow to without horizontal scrolling (WCAG 2.2 SC 1.4.10).
//   `PHONE_VIEWPORT`, 375 px, is where spec #144 measures the phone Homepage.
// - `testAccessibilityAndReflow`: the axe, focus and reflow tests of a
//   template's pages at those widths; `expectAccessibleAtEachWidth` checks
//   the page as it is now at both.
// - What the shell shows every page: the 404 page, the default site title, the
//   breadcrumb, Thai dates, the titles and items a list shows, the terms its
//   filter offers and its filtered empty state, and a record page's details;
//   whether an image loads, shows its whole picture and fills its box; a colour
//   token as the browser computes it; where parts of a page sit, one under
//   another or side by side in rows; and how a word of a title lies in its
//   lines and its box.
// - `expectPreviewRenders`: a draft's signed preview link (cms.helpers.ts
//   mintPreviewLink) at the draft's address, rendering it out of search engines.
// - `sitemapLocations`: the addresses a sitemap document lists.
// - `BorrowedEntries`: the runtime's own published entries a test returns to
//   draft, published again afterwards at their own publication date.
//
// Verified against the pinned @axe-core/playwright 4.14.0 (axe-core 4.14.0,
// node_modules/@axe-core/playwright/dist/index.d.ts): `new AxeBuilder({ page })
// .options(options).analyze()` resolves to the axe results, whose `violations`
// lists each failed rule with the nodes it failed on.

import AxeBuilder from "@axe-core/playwright";
import {
	expect,
	test as base,
	type APIRequestContext,
	type BrowserContext,
	type Locator,
	type Page,
} from "@playwright/test";

import {
	cmsRequest,
	mintPreviewLink,
	nativeDataOf,
	nativeItemOf,
	nativeRefusalOf,
	publishEntryAt,
	readEntry,
	unpublishEntry,
	type CmsActor,
	type DraftFixture,
} from "./cms.helpers.ts";

export { expect };

/** WCAG 2.2 level A and AA, as axe-core tags (#51 Testing Decisions). */
const WCAG_22_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * axe-core's page-structure rules, which it tags best practice rather than WCAG: one H1, headings
 * that step down one level at a time, one main landmark, all content inside a landmark, and
 * landmarks told apart (#51 user story 8). They run beside the WCAG 2.2 AA tag set on the Product
 * Owner's decision (2026-10-31: #64 comment 6535568373).
 */
const STRUCTURE_RULES = [
	"page-has-heading-one",
	"heading-order",
	"landmark-one-main",
	"region",
	"landmark-unique",
	"landmark-no-duplicate-banner",
	"landmark-no-duplicate-contentinfo",
];

/** The Figma Homepage Concept v1 desktop frame width. */
export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/** The narrowest width the site supports (WCAG 2.2 SC 1.4.10 reflow). */
export const MOBILE_VIEWPORT = { width: 320, height: 640 };

/** A common phone, the width spec #144 measures the phone Homepage at. */
export const PHONE_VIEWPORT = { width: 375, height: 812 };

export const VIEWPORTS = { desktop: DESKTOP_VIEWPORT, mobile: MOBILE_VIEWPORT };

const NETWORK_PROTOCOLS = new Set(["http:", "https:", "ws:", "wss:"]);

/** Native fixture contexts that cannot run axe's page scripts (#191 retro). */
const contextsWithoutJavaScript = new WeakSet<BrowserContext>();

export const test = base.extend<{ thirdPartyRequests: string[] }>({
	thirdPartyRequests: [
		async ({ page, baseURL, javaScriptEnabled }, use) => {
			if (!javaScriptEnabled) contextsWithoutJavaScript.add(page.context());
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
 * Run axe with the WCAG 2.2 AA tag set and the page-structure rules on the page as it is now,
 * scrolled back to its top, and
 * fail with a readable summary (rule, impact and the offending nodes) on any violation. Fail too on
 * an icon that assistive technology can reach: every icon on a public page is decorative, an
 * `<svg>` that is aria-hidden or inside an aria-hidden element (docs/design/DESIGN.md §5; #105).
 */
export async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
	if (contextsWithoutJavaScript.has(page.context())) {
		throw new Error(
			`${label}: axe requires a JavaScript-enabled context; audit accessibility with JavaScript enabled and test no-script navigation separately.`,
		);
	}
	// From the top of the page, where the sticky header covers nothing: scrolled, it can lie over
	// part of a control, and axe's target-size then measures the largest part of the control left
	// uncovered (axe-core 4.14.0 axe.js targetSizeEvaluate, getLargestUnobscuredArea; #240).
	await page.evaluate(() => window.scrollTo(0, 0));
	// A rule enabled by name runs beside a tag selection (axe-core 4.14.0 axe.js ruleShouldRun).
	const results = await new AxeBuilder({ page })
		.options({
			runOnly: { type: "tag", values: WCAG_22_AA_TAGS },
			rules: Object.fromEntries(STRUCTURE_RULES.map((rule) => [rule, { enabled: true }])),
		})
		.analyze();
	const violations = results.violations.map(
		(violation) =>
			`${violation.id} (${violation.impact ?? "unknown impact"}): ${violation.help} — ${violation.nodes
				.map((node) => node.target.join(" "))
				.join(", ")}`,
	);
	expect(violations, `${label}: axe must report no WCAG 2.2 AA violations`).toEqual([]);
	const exposedIcons = await page
		.locator("svg")
		.evaluateAll((icons) =>
			icons
				.filter((icon) => icon.closest('[aria-hidden="true"]') === null)
				.map((icon) => `<svg class="${icon.getAttribute("class") ?? ""}">`),
		);
	expect(exposedIcons, `${label}: every icon must be hidden from assistive technology`).toEqual([]);
}

/**
 * Fail unless the page as it is now has no WCAG 2.2 AA violation or exposed icon and keeps focus
 * visible at each of `VIEWPORTS`, named `label` in the failures. The viewport ends at the desktop
 * width.
 */
export async function expectAccessibleAtEachWidth(page: Page, label: string): Promise<void> {
	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		await page.setViewportSize(viewport);
		await expectNoAxeViolations(page, `${label} at ${width}`);
		await expectVisibleFocusOnEveryStop(page, `${label} at ${width}`);
	}
	await page.setViewportSize(DESKTOP_VIEWPORT);
}

/**
 * Declare the accessibility and reflow tests of a template's pages: at each of `VIEWPORTS`, every
 * path `paths` gives answers 200, axe reports no WCAG 2.2 AA violation on it, no icon on it is
 * exposed to assistive technology, and focus stays visible; at 320 px none scrolls sideways.
 * `pages` names them in the test titles, such as "the News pages". `paths` is called when the
 * tests run, after the suite's fixtures exist. Each width's paths share one test and its 30 s
 * timeout, which held 13 list pages at the desktop width but not 30 (#67), so split a longer list
 * into several calls.
 */
export function testAccessibilityAndReflow(pages: string, paths: () => readonly string[]): void {
	for (const [width, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe reports no WCAG 2.2 AA violation and focus stays visible on ${pages} at the ${width} width`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			for (const path of paths()) {
				const response = await page.goto(path);
				expect(response?.status(), `GET ${path}`).toBe(200);
				await expectNoAxeViolations(page, `${path} at ${width}`);
				await expectVisibleFocusOnEveryStop(page, `${path} at ${width}`);
			}
		});
	}

	test(`${pages} do not scroll sideways at 320 px`, async ({ page }) => {
		await page.setViewportSize(MOBILE_VIEWPORT);
		for (const path of paths()) {
			await page.goto(path);
			await expectNoHorizontalScroll(page, path);
		}
	});
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

/**
 * Fail unless `path` answers the site 404 page with status 404. The request carries the
 * songhealth-unknown- referrer every test request does (playwright.config.ts), so the miss counts
 * as the tests' even where `path` cannot carry the mark.
 */
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

/** The breadcrumb's root crumb, the Homepage. */
export const HOME_CRUMB = ["หน้าแรก", "/"] as const;

/**
 * Each main-navigation section's crumb, which follows หน้าแรก on every page inside the section but
 * its landing page, where the breadcrumb ends at the section itself.
 */
export const SECTION_CRUMBS = {
	about: ["เกี่ยวกับเรา", "/about"],
	news: ["ข่าวสาร", "/news"],
	services: ["บริการประชาชน", "/services"],
	health: ["ข้อมูลสุขภาพ", "/health"],
	documents: ["เอกสารเผยแพร่", "/documents"],
	ita: ["ITA", "/ita"],
} as const;

/**
 * Fail unless the page is an About sub-page at `path`: the main navigation marks เกี่ยวกับเรา as its
 * section, the breadcrumb leads through it to `current`, and the canonical address is `path`.
 */
export async function expectAboutSubpage(page: Page, path: string, current: string): Promise<void> {
	await expect(
		page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "เกี่ยวกับเรา" }),
	).toHaveAttribute("aria-current", "true");
	await expectBreadcrumb(page, [HOME_CRUMB, SECTION_CRUMBS.about], current);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		`${new URL(page.url()).origin}${path}`,
	);
}

/**
 * Fail unless `image` is visible and its file has loaded. A lazy image starts loading only as it
 * nears the viewport, which can be after the page's load event, so the check scrolls to it and
 * waits for it: on a long page it would otherwise never load (#244 retro).
 */
export async function expectImageLoaded(image: Locator, label: string): Promise<void> {
	await expect(image, label).toBeVisible();
	await image.scrollIntoViewIfNeeded();
	await expect
		.poll(
			() =>
				image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0),
			{ message: `${label} loads` },
		)
		.toBe(true);
}

/**
 * Fail unless `image` has loaded and shows its whole picture undistorted: the part of the picture
 * in view keeps the picture's own aspect ratio, so no edge is cropped and nothing is stretched
 * (spec #144 "Testing Decisions": a picture's rendered aspect ratio against its natural one). That
 * part follows from the image's content box and its `object-fit`, which scales the picture in the
 * box and crops what overflows it. Returns the size the picture shows at, in CSS px.
 */
export async function expectPictureWhole(
	image: Locator,
	label: string,
): Promise<{ width: number; height: number }> {
	await expectImageLoaded(image, label);
	const shown = await image.evaluate((element: HTMLImageElement) => {
		const style = getComputedStyle(element);
		const box = element.getBoundingClientRect();
		const inset = (side: string) =>
			Number.parseFloat(style.getPropertyValue(`padding-${side}`)) +
			Number.parseFloat(style.getPropertyValue(`border-${side}-width`));
		const width = box.width - inset("left") - inset("right");
		const height = box.height - inset("top") - inset("bottom");
		const [natural, naturalHeight] = [element.naturalWidth, element.naturalHeight];
		const contain = Math.min(width / natural, height / naturalHeight);
		const cover = Math.max(width / natural, height / naturalHeight);
		const [x, y] = {
			contain: [contain, contain],
			cover: [cover, cover],
			none: [1, 1],
			"scale-down": [Math.min(1, contain), Math.min(1, contain)],
		}[style.objectFit] ?? [width / natural, height / naturalHeight];
		const inView = {
			width: Math.min(natural * x!, width),
			height: Math.min(naturalHeight * y!, height),
		};
		return { natural: natural / naturalHeight, rendered: inView.width / inView.height, ...inView };
	});
	expect(shown.rendered, `${label}: the aspect ratio it shows at is its own`).toBeCloseTo(
		shown.natural,
		2,
	);
	return { width: shown.width, height: shown.height };
}

/**
 * Fail unless `image` shows its whole picture undistorted (expectPictureWhole) and fills its own
 * box with it, so nothing of the box shows beside the picture: neither what is behind the box nor
 * a dominant colour EmDash's Image paints as the image's background (docs/agents/emdash-1.1.0.md
 * "Media", which also says its blurhash placeholder does not show). Returns the size the picture
 * shows at, in CSS px.
 */
export async function expectPictureFillsBox(
	image: Locator,
	label: string,
): Promise<{ width: number; height: number }> {
	const shown = await expectPictureWhole(image, label);
	const box = (await image.boundingBox())!;
	expect(
		Math.abs(box.width - shown.width) + Math.abs(box.height - shown.height),
		`${label}: the picture fills its box`,
	).toBeLessThan(1);
	return shown;
}

/**
 * Fail unless the focus ring of `target`, which has focus, is drawn whole: no ancestor that clips
 * its content cuts into the outline, the element's box widened by the outline's offset and width.
 */
export async function expectFocusRingWhole(target: Locator, label: string): Promise<void> {
	await target.focus();
	const clippedBy = await target.evaluate((element) => {
		const style = getComputedStyle(element);
		const reach = Number.parseFloat(style.outlineOffset) + Number.parseFloat(style.outlineWidth);
		const ring = element.getBoundingClientRect();
		const clippers: string[] = [];
		for (let parent = element.parentElement; parent; parent = parent.parentElement) {
			const { overflowX, overflowY } = getComputedStyle(parent);
			if (overflowX === "visible" && overflowY === "visible") continue;
			const box = parent.getBoundingClientRect();
			const cut =
				(overflowX !== "visible" &&
					(ring.left - reach < box.left || ring.right + reach > box.right)) ||
				(overflowY !== "visible" &&
					(ring.top - reach < box.top || ring.bottom + reach > box.bottom));
			if (cut) clippers.push(`<${parent.tagName.toLowerCase()} class="${parent.className}">`);
		}
		return clippers;
	});
	expect(clippedBy, `${label}: what cuts into the focus ring`).toEqual([]);
}

/** `part`'s box in the window as the page is laid out and scrolled now, once it shows. */
export async function boxOf(part: Locator, label: string) {
	await expect(part, label).toBeVisible();
	return (await part.boundingBox())!;
}

/**
 * The colour token `--color-<name>` (src/styles/global.css) as the page's browser computes a
 * colour, such as "rgb(11, 107, 87)", to compare with an element's computed style. Throws when the
 * page's stylesheet does not define the token.
 */
export function tokenColor(page: Page, name: string): Promise<string> {
	return page.evaluate((token) => {
		const property = `--color-${token}`;
		if (getComputedStyle(document.documentElement).getPropertyValue(property).trim() === "") {
			throw new Error(`the page's stylesheet defines no ${property}`);
		}
		const probe = document.createElement("span");
		probe.style.color = `var(${property})`;
		document.body.append(probe);
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	}, name);
}

/**
 * Fail unless every one of `parts` shows, each one below the one before it, as the page is laid out
 * now.
 */
export async function expectStacked(
	label: string,
	parts: Array<[name: string, part: Locator]>,
): Promise<void> {
	let above: { name: string; bottom: number } | undefined;
	for (const [name, part] of parts) {
		const box = await boxOf(part, `${label}: ${name}`);
		if (above) {
			expect(box.y, `${label}: ${name} is below ${above.name}`).toBeGreaterThanOrEqual(
				above.bottom - 0.5,
			);
		}
		above = { name, bottom: box.y + box.height };
	}
}

/**
 * How many of `items` sit in each row as the page is laid out now, top to bottom: items whose tops
 * lie within 1 px of each other share a row. A role locator leaves out the hidden ones.
 */
export function itemsPerRow(items: Locator): Promise<number[]> {
	return items.evaluateAll((elements) => {
		const rows: Array<{ top: number; count: number }> = [];
		for (const element of elements) {
			const top = element.getBoundingClientRect().top;
			const row = rows.find((candidate) => Math.abs(candidate.top - top) < 1);
			if (row) row.count += 1;
			else rows.push({ top, count: 1 });
		}
		return rows.map((row) => row.count);
	});
}

/**
 * How the occurrences of `word` in `element`'s text lie as the page is laid out now: how many
 * there are, how many of them span more than one line, and how many run out of the content box of
 * the element that holds `element`, such as a card or a column of text. A Thai word a title keeps
 * whole (src/lib/thai-title.ts) must do neither.
 */
export function occurrencesOf(
	element: Locator,
	word: string,
): Promise<{ found: number; split: number; outside: number }> {
	return element.evaluate((root, word) => {
		const texts: Text[] = [];
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node as Text);
		/** The text node and offset of `index` in the element's text, a start or an end. */
		const position = (index: number, end: boolean): [Text, number] => {
			for (const text of texts) {
				if (end ? index <= text.length : index < text.length) return [text, index];
				index -= text.length;
			}
			throw new Error(`no text at ${index}`);
		};
		const whole = texts.map((text) => text.data).join("");
		const holder = root.parentElement!;
		const box = holder.getBoundingClientRect();
		const style = getComputedStyle(holder);
		const left = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
		const right = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
		let found = 0;
		let split = 0;
		let outside = 0;
		for (let from = whole.indexOf(word); from !== -1; from = whole.indexOf(word, from + 1)) {
			const range = document.createRange();
			range.setStart(...position(from, false));
			range.setEnd(...position(from + word.length, true));
			const rects = [...range.getClientRects()];
			const tops = rects.map((rect) => rect.top);
			found += 1;
			if (Math.max(...tops) - Math.min(...tops) > 4) split += 1;
			if (rects.some((rect) => rect.left < left - 0.5 || rect.right > right + 0.5)) outside += 1;
		}
		return { found, split, outside };
	}, word);
}

/**
 * Where a Quick Link card's parts lie in the window as the page is laid out now: its content box
 * inside the border and padding, the column that holds the label, the label's text and the arrow.
 * The text is the union of the label's line boxes, so a kept word wider than its column shows.
 */
function quickLinkParts(card: Locator) {
	return card.evaluate((element) => {
		const edges = ({ top, right, bottom, left }: DOMRect) => ({ top, right, bottom, left });
		const outer = element.getBoundingClientRect();
		const style = getComputedStyle(element);
		const column = element.querySelector(":scope > span")!;
		const lines: DOMRect[] = [];
		const range = document.createRange();
		const walker = document.createTreeWalker(column, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			range.selectNodeContents(node);
			lines.push(...range.getClientRects());
		}
		return {
			content: {
				top: outer.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop),
				right: outer.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
				bottom:
					outer.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom),
				left: outer.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
			},
			column: edges(column.getBoundingClientRect()),
			text: {
				top: Math.min(...lines.map((line) => line.top)),
				right: Math.max(...lines.map((line) => line.right)),
				bottom: Math.max(...lines.map((line) => line.bottom)),
				left: Math.min(...lines.map((line) => line.left)),
			},
			arrow: edges(element.querySelector("svg")!.getBoundingClientRect()),
		};
	});
}

/**
 * `card`'s parts as the page is laid out now, once the checks both forms of a Quick Link card share
 * have passed: a 24 px arrow that ends at the card's right content edge. `near` checks, for
 * failures named `label`, that two lengths agree within half a pixel.
 */
async function checkedQuickLink(card: Locator, label: string) {
	const parts = await quickLinkParts(card);
	const near = (actual: number, expected: number, what: string) =>
		expect(Math.abs(actual - expected), `${label}: ${what}`).toBeLessThanOrEqual(0.5);
	const { content, arrow } = parts;
	near(arrow.right, content.right, "the arrow ends at the card's right content edge");
	near(arrow.right - arrow.left, 24, "the arrow is 24 px wide");
	near(arrow.bottom - arrow.top, 24, "the arrow is 24 px tall");
	return { ...parts, near };
}

/**
 * Fail unless `card` shows a Quick Link card's phone form as the page is laid out now (spec #190
 * "Compact Homepage Quick Access"): the label across the card's whole content width, and the
 * 24 px arrow on a row of its own at the lower right, at least 8 px below the label. `label` names
 * the card in the failures.
 */
export async function expectLabelAboveArrow(card: Locator, label: string): Promise<void> {
	const { content, column, text, arrow, near } = await checkedQuickLink(card, label);
	near(column.left, content.left, "the label starts at the card's left content edge");
	near(column.right, content.right, "the label reaches the card's right content edge");
	expect(
		arrow.top - column.bottom,
		`${label}: the arrow is at least 8 px below the label`,
	).toBeGreaterThanOrEqual(7.5);
	expect(text.bottom, `${label}: the label's text ends above the arrow`).toBeLessThanOrEqual(
		arrow.top,
	);
	near(arrow.bottom, content.bottom, "the arrow ends at the card's bottom content edge");
}

/**
 * Fail unless `card` shows a Quick Link card's full form as the page is laid out now: the label's
 * text ending before the 24 px arrow, which sits at the right, level with the middle of the card's
 * content. `label` names the card in the failures.
 */
export async function expectArrowBesideLabel(card: Locator, label: string): Promise<void> {
	const { content, column, text, arrow, near } = await checkedQuickLink(card, label);
	expect(column.right, `${label}: the label's column ends before the arrow`).toBeLessThanOrEqual(
		arrow.left,
	);
	expect(text.right, `${label}: the label's text ends before the arrow`).toBeLessThanOrEqual(
		arrow.left,
	);
	near(
		(arrow.top + arrow.bottom) / 2,
		(content.top + content.bottom) / 2,
		"the arrow is level with the middle of the card's content",
	);
}

/**
 * Fail unless `draft`'s signed preview link is its address `path` and renders the draft, headed by
 * its title and kept out of search engines. Returns the link, whose token a test names in no
 * message.
 */
export async function expectPreviewRenders(
	page: Page,
	admin: CmsActor,
	collection: string,
	draft: DraftFixture,
	path: string,
): Promise<URL> {
	const link = await mintPreviewLink(admin, collection, draft.id);
	expect(link.pathname, "the preview link is the draft's canonical address").toBe(path);
	const preview = await page.goto(link.toString());
	expect(preview?.status(), `the ${collection} preview renders`).toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(draft.title);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
	return link;
}

/** The `<loc>` values of a sitemap document, which must be served. */
export async function sitemapLocations(
	request: APIRequestContext,
	path: string,
): Promise<string[]> {
	const response = await request.get(path);
	expect(response.status(), `GET ${path}`).toBe(200);
	const xml = await response.text();
	return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
}

/** A word of six random Thai consonants, which only the running test's fixtures carry. */
export function thaiWord(): string {
	const letters = "กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ";
	return Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join(
		"",
	);
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

/**
 * The labels of `terms` that a list filter's select offers, in its order. The runtime holds other
 * terms too (the seed's, the demo dataset's), so a suite looks only at its own.
 */
export async function offeredLabels(
	select: Locator,
	terms: ReadonlyArray<{ label: string }>,
): Promise<string[]> {
	const own = new Set(terms.map((term) => term.label));
	return (await select.locator("option").allTextContents())
		.map((label) => label.trim())
		.filter((label) => own.has(label));
}

/** What a list shows when its filters match nothing: a message and a way back to the whole list. */
export interface FilteredEmptyState {
	message: string;
	back: { label: string; href: string };
}

/** `path`, a list narrowed to nothing, answers 200 and shows no item, only its `empty` state. */
export async function expectFilteredEmpty(
	page: Page,
	path: string,
	empty: FilteredEmptyState,
): Promise<void> {
	const response = await page.goto(path);
	expect(response?.status(), `${path} is not an error`).toBe(200);
	const main = page.getByRole("main");
	await expect(main.getByRole("article"), path).toHaveCount(0);
	await expect(main.getByText(empty.message), path).toBeVisible();
	await expect(main.getByRole("link", { name: empty.back.label }), path).toHaveAttribute(
		"href",
		empty.back.href,
	);
}

/**
 * The Homepage hero's headline, the office summary sentence, which names the hero (spec #239 "Hero
 * and Featured"). It is also the page's description and the Contact Summary's lead.
 */
export const HOMEPAGE_HEADLINE =
	"ศูนย์กลางข้อมูล บริการ และการประสานงานด้านสุขภาพของประชาชนในอำเภอสอง จังหวัดแพร่";

/**
 * The Homepage sections' headings, the design's interface text. The Services, Leadership, Health
 * Information and Activities sections are named as the prototype of spec #239 names them, so the
 * link to each one's list reads "ดู…ทั้งหมด" with that name; the others keep the text of
 * docs/design/homepage-concept-v1.md until their own tickets.
 */
export const HOMEPAGE_HEADINGS = {
	services: "บริการประชาชน",
	leadership: "ผู้บริหาร",
	news: "ข่าวประชาสัมพันธ์",
	announcements: "ประกาศ",
	health: "ความรู้สุขภาพ",
	discovery: "หน่วยบริการสุขภาพในอำเภอสอง",
	activities: "กิจกรรม",
	quickAccess: "ข้อมูลและเอกสารสำคัญ",
	contact: "ติดต่อสำนักงาน",
} as const;

/**
 * A Homepage section, the region whose whole name is its heading: a Featured item's card is a
 * region named by its title, which can hold a section's name, as an Announcement's holds "ประกาศ"
 * (#245 retro).
 */
export function homepageSection(page: Page, heading: string) {
	return page.getByRole("region", { name: heading, exact: true });
}

/** The header's identity, the logo and the site title: its first link to the Homepage. */
export function siteIdentityLink(page: Page) {
	return page.getByRole("banner").locator('a[href="/"]').first();
}

/**
 * Fail unless `part` is on the page for assistive technology and out of sight: it takes no more
 * than a pixel of the page, as Tailwind's `sr-only` leaves it.
 */
export async function expectVisuallyHidden(part: Locator, label: string): Promise<void> {
	const box = await boxOf(part, label);
	expect(Math.max(box.width, box.height), `${label} takes no room in sight`).toBeLessThanOrEqual(1);
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

/**
 * The runtime's own published entries that a suite returns to draft for a test, such as the demo
 * dataset's or the Product Owner's, and publishes again when the test ends at their own
 * publication date (CODING_STANDARDS "Tests", shared runtime state). Their revision history keeps
 * the round trip, which the native API cannot undo. An entry that is scheduled, unpublished, or has
 * unpublished changes that publishing would release, is left alone and the test skips.
 *
 * Platform behaviour relied on (emdash 1.1.0): a content read by id or slug finds an entry outside
 * the trash, and carries `draftRevisionId` while the entry has changes not yet published
 * (src/database/repositories/content.ts findByIdOrSlug, src/emdash-runtime.ts hydrateDraftData).
 * POST …/publish takes `publishedAt` (src/astro/routes/api/content/[collection]/[id]/publish.ts).
 */
export class BorrowedEntries {
	readonly #entries: Array<{ collection: string; fixture: DraftFixture; publishedAt: string }> = [];

	/**
	 * The runtime's own entry `idOrSlug`, returned to draft for the running test, or undefined when
	 * there is none. The test skips when the entry is not simply published.
	 */
	async borrow(
		admin: CmsActor,
		collection: string,
		idOrSlug: string,
	): Promise<DraftFixture | undefined> {
		const read = await readEntry(admin, collection, idOrSlug);
		if (!read.ok) {
			expect(read.status, `reading ${collection}/${idOrSlug}: ${nativeRefusalOf(read)}`).toBe(404);
			return undefined;
		}
		const item = nativeItemOf(read)!;
		test.skip(
			item.status !== "published" || typeof item.draftRevisionId === "string",
			`the runtime's ${collection} entry "${idOrSlug}" is ${item.status}${item.draftRevisionId ? " with unpublished changes" : ""}; the suite leaves it alone`,
		);
		const fixture = {
			id: String(item.id),
			slug: typeof item.slug === "string" && item.slug !== "" ? item.slug : idOrSlug,
			title: String((item.data as { title?: unknown }).title),
		};
		this.#entries.push({ collection, fixture, publishedAt: String(item.publishedAt) });
		const unpublished = await unpublishEntry(admin, collection, fixture.id);
		expect(unpublished.ok, `unpublish ${fixture.slug}: ${nativeRefusalOf(unpublished)}`).toBe(true);
		return fixture;
	}

	/** A borrowed entry's own publication date, or undefined for any other entry. */
	publishedAtOf(id: string): string | undefined {
		return this.#entries.find((entry) => entry.fixture.id === id)?.publishedAt;
	}

	/** Publish every borrowed entry again at its own date, and fail unless each one is. */
	async giveBack(admin: CmsActor): Promise<void> {
		const failures: string[] = [];
		for (const { collection, fixture, publishedAt } of this.#entries.splice(0)) {
			try {
				const status = nativeItemOf(await readEntry(admin, collection, fixture.id))?.status;
				const stored =
					status === "published"
						? nativeItemOf(await readEntry(admin, collection, fixture.id))?.publishedAt
						: await publishEntryAt(admin, collection, fixture.id, publishedAt);
				if (Date.parse(String(stored)) !== Date.parse(publishedAt)) {
					failures.push(
						`${collection}/${fixture.slug} is published at ${stored}, not ${publishedAt}`,
					);
				}
			} catch (error) {
				failures.push(
					`${collection}/${fixture.slug}: ${error instanceof Error ? error.message : error}`,
				);
			}
		}
		expect(failures, "the runtime's own entries are published again as they were").toEqual([]);
	}
}

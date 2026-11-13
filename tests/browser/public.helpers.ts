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
//   lines and its box; the deep field, and what an entrance or a reveal holds
//   back, when a part enters and when what runs by itself ends.
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
	listPublishedEntries,
	mintPreviewLink,
	nativeDataOf,
	nativeItemOf,
	nativeRefusalOf,
	publishEntryAt,
	readEntry,
	syntheticSlug,
	unpublishEntry,
	type CmsActor,
	type DraftFixture,
	type SyntheticTerm,
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
		// The ring is whole: an ancestor that clips its content must not cut into it (#247 retro: a
		// tile that clipped itself cut the ring of the link inside it, and this walk passed).
		expect(
			await focusRingClippers(page.locator(":focus")),
			`${label}: what cuts into the focus ring of ${stop.name}`,
		).toEqual([]);
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
	// The picture asks for about the width of its box (CODING_STANDARDS "Public pages": "a `sizes`
	// that matches their box"; #247 retro: a tile asked for a third of its row's width).
	const asked = await image.evaluate((element: HTMLImageElement) => {
		const sizes = element.getAttribute("sizes");
		if (!sizes) return undefined;
		const px = (length: string) => {
			const value = Number.parseFloat(length);
			if (length.endsWith("vw")) return (value * window.innerWidth) / 100;
			if (length.endsWith("rem")) {
				return value * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
			}
			return value;
		};
		for (const entry of sizes.split(",").map((part) => part.trim())) {
			const conditional = /^(\(.*\))\s+(\S+)$/.exec(entry);
			if (!conditional) return { asked: px(entry), box: element.getBoundingClientRect().width };
			if (window.matchMedia(conditional[1]!).matches) {
				return { asked: px(conditional[2]!), box: element.getBoundingClientRect().width };
			}
		}
		return undefined;
	});
	if (asked) {
		const share = asked.asked / asked.box;
		expect(
			share,
			`${label}: its sizes asks for ${Math.round(asked.asked)} px in a ${Math.round(asked.box)} px box`,
		).toBeGreaterThanOrEqual(0.75);
		expect(
			share,
			`${label}: its sizes asks for ${Math.round(asked.asked)} px in a ${Math.round(asked.box)} px box`,
		).toBeLessThanOrEqual(1.5);
	}
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
 * The ancestors of `target` that cut into its focus ring: each one that clips its content where
 * the outline lies, the element's box widened by the outline's offset and width.
 */
function focusRingClippers(target: Locator): Promise<string[]> {
	return target.evaluate((element) => {
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
}

/**
 * Fail unless `target` shows a focus ring once it has focus and the ring is drawn whole: no
 * ancestor that clips its content cuts into the outline.
 */
export async function expectFocusRingWhole(target: Locator, label: string): Promise<void> {
	await target.focus();
	await expect(target, `${label}: a focus ring`).not.toHaveCSS("outline-style", "none");
	await expect(target, `${label}: a focus ring`).toHaveCSS("outline-width", "3px");
	expect(await focusRingClippers(target), `${label}: what cuts into the focus ring`).toEqual([]);
}

/** `part`'s box in the window as the page is laid out and scrolled now, once it shows. */
export async function boxOf(part: Locator, label: string) {
	await expect(part, label).toBeVisible();
	return (await part.boundingBox())!;
}

/** How opaque `part` shows as the page is now, through everything that holds it: 0 to 1. */
export function shownOpacity(part: Locator): Promise<number> {
	return part.evaluate((element) => {
		let opacity = 1;
		for (let node: Element | null = element; node; node = node.parentElement) {
			opacity *= Number(getComputedStyle(node).opacity);
		}
		return opacity;
	});
}

/**
 * The parts of `scope` an effect holds back as the page is now: any that is not fully opaque or
 * lies away from its place. Decorations, hidden from assistive technology, are left out.
 */
export function heldBack(scope: Locator): Promise<string[]> {
	return scope.evaluate((root) =>
		[root, ...root.querySelectorAll("*")]
			.filter((part) => part.closest('[aria-hidden="true"]') === null)
			.filter((part) => {
				const style = getComputedStyle(part);
				return style.opacity !== "1" || style.translate !== "none";
			})
			.map((part) => `<${part.localName}> ${part.textContent?.trim().slice(0, 40)}`),
	);
}

/**
 * After how many seconds `part` starts to enter when the page opens: the delay of the entrance
 * that it, or what holds it, has. -1 with no entrance.
 */
export function entersAfter(part: Locator): Promise<number> {
	return part.evaluate((element) => {
		for (let node: Element | null = element; node; node = node.parentElement) {
			const style = getComputedStyle(node);
			if (style.animationName !== "none") return parseFloat(style.animationDelay);
		}
		return -1;
	});
}

/**
 * When each effect that runs by itself, on the page's clock, is over, in milliseconds after it
 * began; Infinity for one that never ends. A reveal runs on the visitor's scrolling and is left
 * out. `scope` is the part of the page to read.
 */
export function selfRunningEnds(scope: Locator): Promise<number[]> {
	return scope.evaluate((root) =>
		root
			.getAnimations({ subtree: true })
			.filter((animation) => animation.timeline instanceof DocumentTimeline)
			.map((animation) => Number(animation.effect?.getComputedTiming().endTime)),
	);
}

/**
 * Move the pointer to just above the resting lower edge of `card`, whose `surface` then rises 6 px,
 * and press there. The card rises only where motion is allowed.
 */
export async function expectRisesUnderPointer(
	page: Page,
	card: Locator,
	surface: Locator,
): Promise<void> {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await card.scrollIntoViewIfNeeded();
	// With motion the card's reveal is over a frame after the scroll.
	await expect.poll(() => shownOpacity(card), { message: "the card has come in" }).toBe(1);
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
}

/** How many lines a title shows, and whether more of it lies below them. */
export function shownLines(title: Locator): Promise<{ lines: number; clamped: boolean }> {
	return title.evaluate((heading) => ({
		lines: Math.round(
			heading.getBoundingClientRect().height / parseFloat(getComputedStyle(heading).lineHeight),
		),
		clamped: heading.scrollHeight > heading.clientHeight,
	}));
}

/**
 * The deep field a page shows: the one the Homepage's hero and Frequently Used Services stand on,
 * or the one under a list's heading. A decoration with no role of its own.
 */
export function deepField(page: Page) {
	return page.getByTestId("deep-field");
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
 * How far, in px, a list's field reaches below its own content and below the top of what follows
 * its heading (src/components/ListHeading.astro, ListBody.astro).
 */
const FIELD_EDGE = {
	phone: { room: 96, overlap: 64 },
	fromSm: { room: 128, overlap: 88 },
};

/** What the heading of a list page on the deep field reads. */
export interface ListHeadingText {
	/** The small label above the H1. */
	label: string;
	title: string;
	lead: string;
}

/** The parts of the heading a list page opens with, on its deep field. */
export function listHeading(page: Page, { label, lead }: Pick<ListHeadingText, "label" | "lead">) {
	const field = deepField(page);
	return {
		field,
		breadcrumb: field.getByRole("navigation", { name: "เส้นทางนำทาง" }),
		// The label has no role, and a crumb can read the same.
		label: field.locator("p").filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }),
		title: field.getByRole("heading", { level: 1 }),
		lead: field.getByText(lead, { exact: true }),
	};
}

type ListHeadingParts = ReturnType<typeof listHeading>;

/** The cards a list page shows, the list that holds them, and the page's pager. */
export function cardList(page: Page) {
	const main = page.getByRole("main");
	return {
		cards: main.getByRole("article"),
		grid: main.getByRole("list").filter({ has: page.getByRole("article") }),
		pager: page.getByRole("navigation", { name: "การแบ่งหน้า" }),
	};
}

/**
 * Fail unless a list's heading lies on its deep field at 375 px: the breadcrumb, the label, the
 * H1, the lead and then each of `after`, one under another and each on the field, with every text
 * of the heading in surface-base. `name` names the page in the failures. The viewport ends at
 * 375 px.
 */
export async function expectHeadingOnField(
	page: Page,
	name: string,
	heading: ListHeadingParts,
	after: Array<[name: string, part: Locator]> = [],
): Promise<void> {
	await page.setViewportSize(PHONE_VIEWPORT);
	const parts: Array<[name: string, part: Locator]> = [
		["the breadcrumb", heading.breadcrumb],
		["the label", heading.label],
		["the H1", heading.title],
		["the lead", heading.lead],
		...after,
	];
	await expectStacked(`${name} at 375 px`, parts);
	const field = await boxOf(heading.field, "the deep field");
	for (const [partName, part] of parts) {
		const box = await boxOf(part, partName);
		expect(box.y, `${partName} starts on the field`).toBeGreaterThanOrEqual(field.y);
		expect(box.y + box.height, `${partName} ends on the field`).toBeLessThanOrEqual(
			field.y + field.height,
		);
	}

	const white = await tokenColor(page, "surface-base");
	for (const [partName, part] of [
		...(await heading.breadcrumb.getByRole("link").all()).map(
			(link) => ["a breadcrumb's link", link] as const,
		),
		["the breadcrumb's current page", heading.breadcrumb.locator('[aria-current="page"]')],
		["the label", heading.label],
		["the H1", heading.title],
		["the lead", heading.lead],
	] as const) {
		await expect(part, partName).toHaveCSS("color", white);
	}
}

/**
 * The widths a list's heading is read at, on both sides of 640 and 1,024 px, each with the H1's
 * size, the radius of the field's lower corners and how far the heading is under the breadcrumb.
 */
export const LIST_HEADING_WIDTHS = [
	[320, "26px", "24px", 24],
	[375, "26px", "24px", 24],
	[639, "26px", "24px", 24],
	[640, "36px", "32px", 32],
	[1023, "36px", "32px", 32],
	[1024, "42px", "32px", 32],
	[1440, "42px", "32px", 32],
] as const;

/**
 * Fail unless a list's heading has, at one of `LIST_HEADING_WIDTHS`, that width's H1 size, lower
 * corners and room under the breadcrumb, with nothing past the window. Returns where the label,
 * the H1, the lead and the breadcrumb, which spans the page's column, lie. The viewport stays at
 * the width.
 */
export async function expectHeadingAtWidth(
	page: Page,
	name: string,
	heading: ListHeadingParts,
	[width, titleSize, corner, gap]: (typeof LIST_HEADING_WIDTHS)[number],
) {
	await page.setViewportSize({ width, height: 900 });
	await expectNoHorizontalScroll(page, `${name} at ${width} px`);
	await expect(heading.title, `the H1 at ${width} px`).toHaveCSS("font-size", titleSize);
	for (const side of ["left", "right"]) {
		await expect(heading.field, `the field at ${width} px`).toHaveCSS(
			`border-bottom-${side}-radius`,
			corner,
		);
	}
	const [label, title, lead, column] = await Promise.all([
		boxOf(heading.label, "the label"),
		boxOf(heading.title, "the H1"),
		boxOf(heading.lead, "the lead"),
		boxOf(heading.breadcrumb, "the breadcrumb"),
	]);
	// The heading block starts where its label does.
	expect(
		label.y - (column.y + column.height),
		`the heading is ${gap} px under the breadcrumb at ${width} px`,
	).toBeCloseTo(gap, 0);
	return { label, title, lead, column };
}

/**
 * Fail unless `block`, the first of what follows a list's heading, starts over the field's lower
 * edge by the measure of each width, at the desktop width and 375 px. `name` names it in the
 * failures. The viewport ends at 375 px.
 */
export async function expectStartsOverFieldEdge(
	page: Page,
	block: Locator,
	name: string,
): Promise<void> {
	for (const [viewport, { overlap }] of [
		[DESKTOP_VIEWPORT, FIELD_EDGE.fromSm],
		[PHONE_VIEWPORT, FIELD_EDGE.phone],
	] as const) {
		await page.setViewportSize(viewport);
		const field = await boxOf(deepField(page), "the deep field");
		expect(
			field.y + field.height - (await boxOf(block, name)).y,
			`${name} starts ${overlap} px above the field's edge at ${viewport.width} px`,
		).toBeCloseTo(overlap, 0);
	}
}

/**
 * Fail unless, on both sides of 640 px, `blocks`, what follows a list's heading, lie 32 px one
 * under another and the first of them starts over the lower edge of `field` by that width's
 * measure, where the field's own content, which the lowest of `fieldContent` ends, stops that
 * width's room
 * above the edge. The viewport ends at the desktop width.
 */
export async function expectBlocksOverFieldEdge(
	page: Page,
	field: Locator,
	fieldContent: Locator[],
	blocks: Array<[name: string, block: Locator]>,
): Promise<void> {
	for (const [width, { room, overlap }] of [
		[375, FIELD_EDGE.phone],
		[639, FIELD_EDGE.phone],
		[640, FIELD_EDGE.fromSm],
		[1440, FIELD_EDGE.fromSm],
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		const boxes = [];
		for (const [name, block] of blocks) boxes.push(await boxOf(block, name));
		for (const [index, box] of boxes.entries()) {
			if (index === 0) continue;
			const above = boxes[index - 1]!;
			expect(
				box.y - (above.y + above.height),
				`${blocks[index]![0]} is 32 px under ${blocks[index - 1]![0]} at ${width} px`,
			).toBeCloseTo(32, 0);
		}
		const fieldBox = await boxOf(field, "the deep field");
		const edge = fieldBox.y + fieldBox.height;
		expect(
			edge - boxes[0]!.y,
			`${blocks[0]![0]} starts ${overlap} px above the field's edge at ${width} px`,
		).toBeCloseTo(overlap, 0);
		const ends = [];
		for (const part of fieldContent) {
			const box = await boxOf(part, "the field's content");
			ends.push(box.y + box.height);
		}
		expect(
			edge - Math.max(...ends),
			`the field's content ends ${room} px above its edge at ${width} px`,
		).toBeCloseTo(room, 0);
	}
}

/**
 * Fail unless a list with a filter form shows the empty state that reads `message` where its cards
 * would be: the message's card 32 px under `form`, which starts over the field's lower edge, and
 * no pager, at the desktop width and 375 px. The viewport ends at 375 px.
 */
export async function expectEmptyStateUnderForm(
	page: Page,
	form: Locator,
	message: string,
): Promise<void> {
	const state = page.getByRole("main").getByText(message, { exact: true });
	await expect(state).toBeVisible();
	await expect(cardList(page).pager).toHaveCount(0);
	// The message's white card is the block that follows the form.
	const card = state.locator("xpath=..");
	for (const viewport of [DESKTOP_VIEWPORT, PHONE_VIEWPORT]) {
		await page.setViewportSize(viewport);
		const formBox = await boxOf(form, "the filter form");
		expect(
			(await boxOf(card, "the message's card")).y - (formBox.y + formBox.height),
			`the message's card is 32 px under the filter form at ${viewport.width} px`,
		).toBeCloseTo(32, 0);
	}
	await expectStartsOverFieldEdge(page, form, "the filter form");
}

/** The cards of a list page that its motion case reads. */
export interface MovingCards {
	/** The list that holds the cards, whose place stands for theirs. */
	grid: Locator;
	/** Every card the page shows. */
	cards: Locator;
	/** A card with a picture, and one whose picture is missing. */
	pictured: Locator;
	plain: Locator;
}

/**
 * Fail unless the list page at `path` moves only when motion is allowed. With motion allowed its
 * heading block rises in as the page opens and its lead after it, while its breadcrumb and each of
 * `atOnce` show at once; each of its `cards` reveals as it comes into the window and shows whole
 * while it holds the keyboard's focus; a picture's box shimmers as the page opens while a missing
 * picture's visual does not; and nothing runs by itself for more than five seconds (WCAG 2.2 SC
 * 2.2.2). The empty state that `empty.path` shows, reading `empty.message`, shows at once too.
 * With reduced motion preferred, and on paper, nothing moves. The page's height and each part's
 * place are the same either way, at the desktop width, 375 px and 320 px. The page ends on a screen
 * with motion allowed.
 */
export async function expectListMovesOnlyWhenAllowed(
	page: Page,
	path: string,
	heading: ListHeadingParts,
	atOnce: Array<[name: string, part: Locator]>,
	{ grid, cards, pictured, plain }: MovingCards,
	empty: { path: string; message: string },
): Promise<void> {
	const main = page.getByRole("main");
	const running = () => page.evaluate(() => document.getAnimations().length);
	const parts: Array<[name: string, part: Locator]> = [
		["the deep field", heading.field],
		["the breadcrumb", heading.breadcrumb],
		["the label", heading.label],
		["the H1", heading.title],
		["the lead", heading.lead],
		...atOnce,
		// A card that waits for its reveal lies 28 px under its place; the list that holds the cards
		// does not move.
		["the cards", grid],
	];
	/** The page's height and each part's place at the desktop width, 375 px and 320 px. */
	const layouts = async () => {
		const read = [];
		for (const viewport of [PHONE_VIEWPORT, MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
			await page.setViewportSize(viewport);
			await page.evaluate(() => window.scrollTo(0, 0));
			const places: Array<[name: string, box: Awaited<ReturnType<typeof boxOf>>]> = [];
			for (const [name, part] of parts) places.push([name, await boxOf(part, name)]);
			read.push({
				width: viewport.width,
				height: await page.evaluate(() => document.documentElement.scrollHeight),
				places,
			});
		}
		return read;
	};

	const still = await test.step("Reduced motion", async () => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(path);
		for (const [name, part] of atOnce) await expect(part, name).toBeVisible();
		expect(await running(), "nothing is mid-animation").toBe(0);
		expect(await heldBack(main), "nothing waits for an effect").toEqual([]);
		return layouts();
	});

	await test.step("The heading's entrance", async () => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(path);
		expect(await entersAfter(heading.title), "the heading enters as the page opens").toBe(0);
		expect(await entersAfter(heading.label), "the label enters with the H1").toBe(0);
		expect(await entersAfter(heading.lead), "the lead enters after the heading").toBeGreaterThan(0);
		for (const [name, part] of [["the breadcrumb", heading.breadcrumb] as const, ...atOnce]) {
			expect(await entersAfter(part), `${name} shows at once`).toBe(-1);
		}
		for (const [name, part] of [["the heading", heading.field] as const, ...atOnce]) {
			await expect
				.poll(() => heldBack(part), { message: `${name} shows whole after the entrance` })
				.toEqual([]);
		}
	});

	await test.step("The same layout with motion", async () => {
		expect(await layouts(), "the page with motion, after its entrance").toEqual(still);
	});

	await test.step("An empty state", async () => {
		await page.goto(empty.path);
		const message = main.getByText(empty.message, { exact: true });
		await expect(message).toBeVisible();
		expect(await entersAfter(message), "the empty state shows at once").toBe(-1);
		await expect
			.poll(() => heldBack(main), { message: "the page shows whole after the entrance" })
			.toEqual([]);
	});

	await test.step("On paper", async () => {
		await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
		await page.goto(path);
		await expect(heading.title).toBeVisible();
		expect(await running(), "nothing is mid-animation").toBe(0);
		expect(await heldBack(main), "nothing waits for an effect").toEqual([]);
		await page.emulateMedia({ media: "screen" });
	});

	await test.step("Each card's reveal", async () => {
		await page.setViewportSize(DESKTOP_VIEWPORT);
		await page.goto(path);
		const last = cards.last();
		expect(
			(await boxOf(last, "the last card")).y,
			"the last card lies below the window as the page opens",
		).toBeGreaterThan(DESKTOP_VIEWPORT.height);
		expect(await shownOpacity(last), "the last card, below the window, waits").toBe(0);
		for (const card of await cards.all()) {
			await card.scrollIntoViewIfNeeded();
			await expect
				.poll(() => shownOpacity(card), { message: "a card, in the window, shows" })
				.toBe(1);
		}
		await page.goto(path);
		await last.getByRole("link").focus();
		await expect
			.poll(() => shownOpacity(last), {
				message: "the last card, focused, shows whole",
				timeout: 3_000,
			})
			.toBe(1);
	});

	await test.step("Nothing moves by itself for long", async () => {
		// Read as the page opens, while the entrance and a loading picture's shimmer run: each is
		// over within five seconds (WCAG 2.2 SC 2.2.2), and the field's decorations stand still.
		await page.goto(path, { waitUntil: "commit" });
		await expect(heading.title).toBeVisible();
		const ends = await selfRunningEnds(page.locator("html"));
		expect(Math.max(0, ...ends), "the last effect to end, in ms").toBeLessThanOrEqual(5_000);
		expect(
			(await selfRunningEnds(pictured)).length,
			"the box of a card's picture shimmers as the page opens",
		).toBeGreaterThan(0);
		expect(await selfRunningEnds(plain), "a missing picture's visual does not shimmer").toEqual([]);
	});
}

/**
 * Run `check` while the runtime shows no published entry of `collection`: each one is returned to
 * draft for it and published again at its own date (BorrowedEntries).
 */
export async function whileNonePublished(
	admin: CmsActor,
	collection: string,
	check: () => Promise<void>,
): Promise<void> {
	const borrowed = new BorrowedEntries();
	try {
		for (const { id } of await listPublishedEntries(admin, collection)) {
			await borrowed.borrow(admin, collection, id);
		}
		await check();
	} finally {
		await borrowed.giveBack(admin);
	}
}

/**
 * A list page that opens on the deep field with a filter form before its cards (Feature 009 #282;
 * spec #280 "List heading", "What follows a list's heading"): Health News and Health Content.
 */
export interface FilteredListOnField {
	path: string;
	/** The crumbs before the list's own, root first. */
	crumbs: ReadonlyArray<readonly [label: string, href: string]>;
	heading: ListHeadingText;
	/** The Lucide icon in the heading's tile. */
	icon: string;
	/** The filter form's accessible name. */
	form: string;
	/** The fixed number of items a page of the list shows. */
	pageSize: number;
	/** What a page past the last one says. */
	pastLast: string;
	/** What the list shows when its Health Topic matches nothing. */
	filteredEmpty: FilteredEmptyState;
	/** A new synthetic Health Topic. */
	createTopic: (label: string) => Promise<SyntheticTerm>;
	/**
	 * A new item of the list that carries `topic`, published now, with the picture of the media item
	 * `picture` when one is given.
	 */
	publishItem: (label: string, topic: SyntheticTerm, picture?: string) => Promise<DraftFixture>;
	/** A new synthetic picture in the media library: its media item's id. */
	uploadPicture: () => Promise<string>;
}

/**
 * Declare the tests of a list's heading on the deep field and of what follows it: the heading's
 * parts, their sizes on both sides of 640 and 1,024 px, the filter form before the cards over the
 * field's lower edge, the empty states where the cards would be, the keyboard's order with each
 * surface's focus ring, the motion case, and the page without JavaScript. The list's suite calls
 * it after the tests whose fixtures must lead the list, and tests the list with no item at all
 * itself (`whileNonePublished`, `expectEmptyStateUnderForm`).
 */
export function testFilteredListOnField(list: FilteredListOnField): void {
	const { path, heading: text } = list;
	const formOf = (page: Page) => page.getByRole("form", { name: list.form });
	const topicFieldOf = (page: Page) => formOf(page).getByLabel("ประเด็นสุขภาพ");

	test(`${path} opens on the deep field with its breadcrumb, the label ${text.label}, the H1 ${text.title} and its lead, one under another on a phone and each in surface-base, with the ${list.icon} icon in the heading's tile and no link on the field but the breadcrumb's`, async ({
		page,
	}) => {
		const response = await page.goto(path);
		expect(response?.status(), `GET ${path}`).toBe(200);
		const main = page.getByRole("main");
		await expect(main.getByRole("heading", { level: 1 })).toHaveText(text.title);
		await expectBreadcrumb(page, list.crumbs, text.title);
		await expect(main.getByText(text.lead, { exact: true })).toBeVisible();

		const heading = listHeading(page, text);
		await expect(heading.label, "the label above the H1").toBeVisible();
		await expect(
			heading.field.getByRole("link"),
			"the field's only links are the breadcrumb's",
		).toHaveText(list.crumbs.map(([label]) => label));
		// Lucide's class is the one thing that tells two icons apart (expectServiceIcon).
		const icon = await boxOf(heading.field.locator(`svg.lucide-${list.icon}`), "the tile's icon");
		expect([icon.width, icon.height], "the tile's icon is 24 px").toEqual([24, 24]);
		expect(icon.x + icon.width, "the tile is left of the H1").toBeLessThanOrEqual(
			(await boxOf(heading.title, "the H1")).x,
		);
		await expectHeadingOnField(page, path, heading);
	});

	test(`the H1 of ${path} is 26 px below 640 px, 36 px from 640 px and 42 px from 1,024 px, the field's lower corners 24 px and from 640 px 32 px, the heading 24 px under the breadcrumb and from 640 px 32 px, and nothing is past the window at any of these widths`, async ({
		page,
	}) => {
		await page.goto(path);
		const heading = listHeading(page, text);
		for (const row of LIST_HEADING_WIDTHS) await expectHeadingAtWidth(page, path, heading, row);
	});

	test(`what follows the heading of ${path} starts over the field's lower edge, 64 px above it below 640 px and 88 px from 640 px, where the field's own content ends 96 px and 128 px above it: the filter form, the cards 32 px under it and the pager 32 px under them`, async ({
		page,
	}) => {
		const topic = await list.createTopic("อนามัยสิ่งแวดล้อม");
		for (let index = 0; index <= list.pageSize; index += 1) {
			await list.publishItem(`edge-${String(index).padStart(2, "0")}`, topic);
		}

		await page.goto(`${path}?topic=${topic.slug}`);
		const heading = listHeading(page, text);
		const { cards, grid, pager } = cardList(page);
		await expect(cards).toHaveCount(list.pageSize);
		await expect(pager.getByRole("link", { name: "หน้าถัดไป" })).toBeVisible();
		await expectBlocksOverFieldEdge(
			page,
			heading.field,
			[heading.lead],
			[
				["the filter form", formOf(page)],
				["the cards", grid],
				["the pager", pager],
			],
		);
	});

	test(`${path} shows each empty state where its cards would be, 32 px under the filter form over the field's lower edge, with its way back and no pager: ${list.filteredEmpty.message} for a Health Topic that matches nothing, ${list.pastLast} for a page past the last`, async ({
		page,
	}) => {
		for (const [address, empty] of [
			[`${path}?topic=${syntheticSlug("no-such-topic")}`, list.filteredEmpty],
			[
				`${path}?page=10000`,
				{ message: list.pastLast, back: { label: "กลับไปหน้าแรกของรายการ", href: path } },
			],
		] as const) {
			await page.setViewportSize(DESKTOP_VIEWPORT);
			await expectFilteredEmpty(page, address, empty);
			await expectEmptyStateUnderForm(page, formOf(page), empty.message);
		}
	});

	test(`on ${path} the keyboard goes from the breadcrumb, on the field with its accent-warm focus ring, to the filter form's field and its button, each with the page's brand-primary ring on the form's white card, and then to the first card`, async ({
		page,
	}) => {
		const item = await list.publishItem("keyboard", await list.createTopic("สุขศึกษา"));
		await page.goto(path);
		const firstCard = cardList(page).cards.first().getByRole("link");
		await expect(firstCard).toHaveAccessibleName(item.title);

		const crumbs = page.getByRole("navigation", { name: "เส้นทางนำทาง" }).getByRole("link");
		await expectFocusRingWhole(crumbs.first(), "the breadcrumb's first link");
		for (const [index, [label]] of list.crumbs.entries()) {
			await expect(crumbs.nth(index), `the ${label} crumb`).toBeFocused();
			await page.keyboard.press("Tab");
		}

		const form = formOf(page);
		const formBox = await boxOf(form, "the filter form");
		const brandPrimary = await tokenColor(page, "brand-primary");
		await expect(topicFieldOf(page), "the form follows the breadcrumb").toBeFocused();
		await expectFocusRingWhole(topicFieldOf(page), "the form's field");
		for (const [name, control] of [
			["the form's field", topicFieldOf(page)],
			["the form's button", form.getByRole("button", { name: "แสดงผล" })],
		] as const) {
			await expect(control, name).toBeFocused();
			await expect(control, `${name}: the page's focus ring`).toHaveCSS(
				"outline-color",
				brandPrimary,
			);
			await expect(control, `${name}: its focus ring`).toHaveCSS("outline-width", "3px");
			// How far the ring reaches around the control: its offset and its width.
			const reach = await control.evaluate((element) => {
				const style = getComputedStyle(element);
				return Number.parseFloat(style.outlineOffset) + Number.parseFloat(style.outlineWidth);
			});
			const box = await boxOf(control, name);
			expect(
				box.x - reach >= formBox.x &&
					box.y - reach >= formBox.y &&
					box.x + box.width + reach <= formBox.x + formBox.width &&
					box.y + box.height + reach <= formBox.y + formBox.height,
				`${name}: its ring, ${reach} px around it, lies on the form's white card`,
			).toBe(true);
			await page.keyboard.press("Tab");
		}
		await expect(firstCard, "the first card follows the form").toBeFocused();

		// The crumbs' ring is read after the order and the form's ring, which today's page already
		// holds, so a red run reaches them before it fails here (CODING_STANDARDS "Tests").
		const accentWarm = await tokenColor(page, "accent-warm");
		for (const [index, [label]] of list.crumbs.entries()) {
			const crumb = listHeading(page, text).breadcrumb.getByRole("link").nth(index);
			await expectFocusRingWhole(crumb, `the ${label} crumb`);
			await expect(crumb, `the ${label} crumb: the field's focus ring`).toHaveCSS(
				"outline-color",
				accentWarm,
			);
		}
	});

	test(`${path} moves only when motion is allowed: the heading and then the lead rise in as the page opens, while the breadcrumb, the filter form, the pager and an empty state show at once; each card reveals as it comes into the window and shows whole while it holds the keyboard's focus, a picture's box shimmers as the page opens and a missing picture's visual does not, and nothing moves by itself for more than five seconds; with reduced motion preferred, and on paper, nothing moves, and the page's height and each part's place are the same either way`, async ({
		page,
	}) => {
		test.setTimeout(120_000);
		// One more than a page, so the pager shows; the newest has a picture.
		const topic = await list.createTopic("ออกกำลังกาย");
		const items: DraftFixture[] = [];
		for (let index = 0; index < list.pageSize; index += 1) {
			items.push(await list.publishItem(`motion-${String(index).padStart(2, "0")}`, topic));
		}
		const pictured = await list.publishItem("motion-picture", topic, await list.uploadPicture());
		const { cards, grid, pager } = cardList(page);
		await expectListMovesOnlyWhenAllowed(
			page,
			`${path}?topic=${topic.slug}`,
			listHeading(page, text),
			[
				["the filter form", formOf(page)],
				["the pager", pager],
			],
			{
				grid,
				cards,
				pictured: listedItem(page, pictured.title),
				plain: listedItem(page, items.at(-1)!.title),
			},
			{ path: `${path}?page=10000`, message: list.pastLast },
		);
	});

	test.describe(`${path} without JavaScript`, () => {
		test.use({ javaScriptEnabled: false });

		test(`${path} shows its heading with its label, its lead, its filter form and its cards`, async ({
			page,
		}) => {
			const item = await list.publishItem("no-js", await list.createTopic("โภชนาการ"));
			await page.goto(path);
			await expect(listedItem(page, item.title)).toBeVisible();
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(text.title);
			await expect(page.getByRole("main").getByText(text.lead, { exact: true })).toBeVisible();
			await expect(topicFieldOf(page)).toBeVisible();
			await expect(formOf(page).getByRole("button", { name: "แสดงผล" })).toBeVisible();
			await expect(listHeading(page, text).label, "the label above the H1").toBeVisible();
		});
	});
}

/** A list page whose cards are the small card of spec #280 "The cards" (Feature 009 #283). */
export interface ListCards {
	path: string;
	/** The Lucide icon of the plain visual that stands in for a missing picture. */
	icon: "message-square" | "heart-pulse";
	/**
	 * Whether an item of the list can have no label: every item on Health News has a Health Topic,
	 * which labels its card.
	 */
	unlabelled: boolean;
	/** A new synthetic term of the taxonomy that labels the list's cards. */
	createLabel: (label: string) => Promise<SyntheticTerm>;
	/** A new synthetic picture in the media library: its media item's id. */
	uploadPicture: () => Promise<string>;
	/**
	 * A new item of the list, published now, labelled by `term`, with `summary` and the picture of
	 * the media item `picture` where each is given. Returns it with its stored publication instant.
	 */
	publishItem: (
		label: string,
		parts: { term?: SyntheticTerm; summary?: string; picture?: string },
	) => Promise<{ item: DraftFixture; at: string }>;
}

/**
 * Declare the test of a list's cards (spec #280 "The cards"): from 640 px a card shows its picture
 * above its text, and below 640 px it is a row with a 120 px picture at 4:3 beside its text, 130 px
 * of it at 320 px; under the picture its date, a dot and its label on one line, and below 640 px
 * the label on the line under the date without the dot; its title as an H2, and from 640 px its
 * summary. A card without a label writes the date alone, one without a
 * summary shows none, and one without a picture shows the plain visual with the list's icon in a
 * 48 px tile. The cards go three to a row from 1,024 px, two from 640 px and in rows below, 24 px
 * apart from 640 px and 14 px below, each in one column.
 */
export function testListCards(list: ListCards): void {
	const SUMMARY = "สรุปข่าวสำหรับทดสอบการ์ดของรายการ ซึ่งแสดงใต้ชื่อเรื่องตั้งแต่ 640 พิกเซล";
	test(`on ${list.path} a card shows its picture, then its date, a dot and its label on one line, its title as an H2 and from 640 px its summary; below 640 px it is a row with a 120 px picture at 4:3 beside its text, its label on the line under its date with no dot, and no summary; a card without ${list.unlabelled ? "a label writes its date alone, " : ""}a summary shows none, and one without a picture shows the plain visual with the ${list.icon} icon in a 48 px tile`, async ({
		page,
	}) => {
		const term = await list.createLabel("สุขภาพชุมชน");
		const picture = await list.uploadPicture();
		const bare = await list.publishItem("card-bare", list.unlabelled ? {} : { term });
		const full = await list.publishItem("card-full", { term, summary: SUMMARY, picture });
		await page.goto(list.path);
		const fullCard = listedItem(page, full.item.title);
		const bareCard = listedItem(page, bare.item.title);
		const lineOf = (card: Locator) => card.locator("p").filter({ has: page.locator("time") });
		const dot = lineOf(fullCard).locator('span[aria-hidden="true"]');
		const label = lineOf(fullCard).getByText(term.label, { exact: true });
		// The date's and the label's places on the card (Product Owner, 2026-11-13: #283 comment
		// 6855983271).
		const dateAndLabel = async () => ({
			date: await boxOf(lineOf(fullCard).locator("time"), "the date"),
			label: await boxOf(label, "the label"),
		});
		const fullDate = thaiDate(full.at);
		const bareDate = thaiDate(bare.at);
		await expect(
			fullCard.getByRole("heading", { level: 2, name: full.item.title, exact: true }),
		).toBeVisible();
		await expect(lineOf(fullCard), "the date, a dot and the label").toHaveText(
			new RegExp(`^\\s*${fullDate}\\s*·\\s*${term.label}\\s*$`),
		);
		await expect(lineOf(bareCard), "the date with its label, or alone").toHaveText(
			list.unlabelled ? bareDate : new RegExp(`^\\s*${bareDate}\\s*·\\s*${term.label}\\s*$`),
		);
		await expect(bareCard, "a card without a summary: its line and its title").toHaveText(
			new RegExp(
				`^\\s*${bareDate}${list.unlabelled ? "" : `\\s*·\\s*${term.label}`}\\s*${RegExp.escape(bare.item.title)}\\s*$`,
			),
		);
		await expect(bareCard.locator("img"), "no picture").toHaveCount(0);
		const visual = bareCard.getByTestId("news-visual");
		const tile = await boxOf(visual.locator("span"), "the visual's tile");
		expect([tile.width, tile.height], "the visual's tile is 48 px").toEqual([48, 48]);
		const icon = await boxOf(visual.locator(`svg.lucide-${list.icon}`), "the visual's icon");
		expect([icon.width, icon.height], "the visual's icon is 24 px").toEqual([24, 24]);

		for (const width of [1440, 640]) {
			await page.setViewportSize({ width, height: 900 });
			const image = fullCard.locator("img");
			await expectImageLoaded(image, `the card's picture at ${width} px`);
			const title = await boxOf(fullCard.getByRole("heading", { level: 2 }), "the title");
			const shown = await boxOf(image, "the picture");
			expect(
				shown.y + shown.height,
				`the picture is above the text at ${width} px`,
			).toBeLessThanOrEqual((await boxOf(lineOf(fullCard), "the date's line")).y);
			expect(shown.width / shown.height, `the picture is 16:9 at ${width} px`).toBeCloseTo(
				16 / 9,
				1,
			);
			await expect(
				fullCard.getByText(SUMMARY, { exact: true }),
				`the summary at ${width} px`,
			).toBeVisible();
			expect(
				(await boxOf(fullCard.getByText(SUMMARY, { exact: true }), "the summary")).y,
				`the summary is under the title at ${width} px`,
			).toBeGreaterThanOrEqual(title.y + title.height);
			const line = await dateAndLabel();
			expect(line.label.y, `the label beside the date at ${width} px`).toBeCloseTo(line.date.y, 0);
			await expect(dot, `the dot between them at ${width} px`).toBeVisible();
		}
		for (const width of [639, 375, 320]) {
			await page.setViewportSize({ width, height: 900 });
			const shown = await boxOf(fullCard.locator("img"), "the picture");
			const title = await boxOf(fullCard.getByRole("heading", { level: 2 }), "the title");
			expect([shown.width, shown.height], `a 120 px picture at 4:3 at ${width} px`).toEqual([
				120, 90,
			]);
			expect(
				shown.x + shown.width,
				`the title beside the picture at ${width} px`,
			).toBeLessThanOrEqual(title.x);
			const line = await dateAndLabel();
			expect(line.label.y, `the label under the date at ${width} px`).toBeGreaterThanOrEqual(
				line.date.y + line.date.height - 1,
			);
			expect(line.label.x, `the label starts where the date does at ${width} px`).toBeCloseTo(
				line.date.x,
				0,
			);
			await expect(dot, `no dot at ${width} px`).toBeHidden();
			if (width === 320) {
				// As the Homepage's News row (docs/design/DESIGN.md §8.6).
				expect(title.width, "the title's room at 320 px").toBeCloseTo(130, 0);
			}
			await expect(
				fullCard.getByText(SUMMARY, { exact: true }),
				`no summary at ${width} px`,
			).toBeHidden();
			await expectNoHorizontalScroll(page, `${list.path} at ${width} px`);
		}
	});

	test(`on ${list.path} the cards go three to a row from 1,024 px, two from 640 px and in rows below, 24 px apart from 640 px and 14 px below, each in one column, a last row's too`, async ({
		page,
	}) => {
		const parts = list.unlabelled ? {} : { term: await list.createLabel("แถวการ์ด") };
		for (const index of [1, 2, 3, 4]) await list.publishItem(`card-row-${index}`, parts);
		// The suite's reduced motion leaves each cell at its resting place.
		await page.goto(list.path);
		const { grid, cards } = cardList(page);
		const cells = grid.getByRole("listitem");
		await expect(cells, "a cell holds each card, and no cell stands empty").toHaveCount(
			await cards.count(),
		);
		for (const [width, perRow, gap] of [
			[1440, 3, 24],
			[1024, 3, 24],
			[1023, 2, 24],
			[768, 2, 24],
			[640, 2, 24],
			[639, 1, 14],
			[375, 1, 14],
			[320, 1, 14],
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			const boxes = await Promise.all(
				[0, 1, 2, 3].map((index) => boxOf(cells.nth(index), `card ${index + 1}`)),
			);
			const rows = boxes.map((box) => Math.round(box.y));
			const widths = await cells.evaluateAll((items) =>
				items.map((item) => Math.round(item.getBoundingClientRect().width)),
			);
			expect(
				widths.filter((cellWidth) => cellWidth !== Math.round(boxes[0]!.width)),
				`every card, a last row's too, takes one column at ${width} px`,
			).toEqual([]);
			expect(
				rows.filter((top) => top === rows[0]).length,
				`${perRow} to a row at ${width} px`,
			).toBe(perRow);
			const next = boxes[perRow]!;
			expect(next.y - (boxes[0]!.y + boxes[0]!.height), `the rows' gap at ${width} px`).toBeCloseTo(
				gap,
				0,
			);
			if (perRow > 1) {
				expect(
					boxes[1]!.x - (boxes[0]!.x + boxes[0]!.width),
					`the cards' gap at ${width} px`,
				).toBeCloseTo(gap, 0);
			}
		}
	});
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

/**
 * Fail unless the card of the Service titled `title` shows the Lucide icon `icon` in its icon tile,
 * out of assistive technology's reach, with the card's link named by the title alone. Lucide marks
 * each icon's `<svg>` with the class `lucide-<name>` (docs/agents/lucide-astro-1.59.0.md), the one
 * thing on the page that tells two icons apart, so the suites read it here, where they otherwise
 * leave a decoration's classes alone (Product Owner, 2026-11-12: #248 comment 6827280781, item 1).
 */
export async function expectServiceIcon(card: Locator, icon: string, title: string): Promise<void> {
	await expect(card.getByRole("link"), "the Service's name names the card").toHaveAccessibleName(
		title,
	);
	const tile = card.getByTestId("service-icon");
	await expect(tile, "the icon tile is decorative").toHaveAttribute("aria-hidden", "true");
	await expect(tile.locator("svg"), `the ${icon} icon`).toHaveClass(
		new RegExp(`(?:^| )lucide-${icon}(?: |$)`),
	);
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

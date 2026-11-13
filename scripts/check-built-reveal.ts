// The Homepage's reveal on the built, minified page, read in a browser with motion allowed (#276).
//
//   scripts/production-image-check.sh --sha <commit> -- \
//     node scripts/check-built-reveal.ts [<screenshot-dir>]
//
// The browser suites read the development runtime, which serves the stylesheet unminified, and
// `npm run build:check` reads the built stylesheet's text (scripts/check-built-styles.ts). This
// opens `/` as the production image serves it, in Playwright's Chromium at the desktop width, and
// reads the Contact Summary's card, the last part of the page that reveals (docs/design/DESIGN.md
// §8.12). With motion allowed the card has its view timeline and waits, transparent, below the
// window, then shows whole once it is scrolled to; with reduced motion preferred it shows whole
// from the start. scripts/built-reveal/plan.ts gives the verdict. With <screenshot-dir>, an
// existing folder, it writes one PNG of each state. The origin and the image come from
// production-image-check.sh. Exit status 1: a reading failed; 2: no origin.

import { join } from "node:path";

import { chromium, type Browser, type Locator, type Page } from "@playwright/test";

import { SYNTHETIC_REFERRER } from "../playwright.config.ts";
import {
	DESKTOP_VIEWPORT,
	HOMEPAGE_HEADINGS,
	homepageSection,
	shownOpacity,
} from "../tests/browser/public.helpers.ts";
import { revealFailures } from "./built-reveal/plan.ts";

const ORIGIN = process.env.CHECK_ORIGIN;
const SCREENSHOTS = process.argv[2];
const SHOWN_LIMIT_MS = 5_000;

const say = (line: string) => console.log(`check-built-reveal: ${line}`);

/** Opens `/` in a new browser context and returns the page with the Contact Summary's card. */
async function open(browser: Browser, reducedMotion: "no-preference" | "reduce") {
	const context = await browser.newContext({
		viewport: DESKTOP_VIEWPORT,
		reducedMotion,
		extraHTTPHeaders: { referer: SYNTHETIC_REFERRER },
	});
	const page = await context.newPage();
	await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
	// The hero's entrance and a loading picture's shimmer run on the page's clock: a screenshot
	// taken after them shows only what the reveal holds back.
	await page.evaluate(async () => {
		const onTheClock = document
			.getAnimations()
			.filter((animation) => animation.timeline instanceof DocumentTimeline);
		await Promise.all(onTheClock.map((animation) => animation.finished));
	});
	const card = homepageSection(page, HOMEPAGE_HEADINGS.contact).getByTestId("contact-card");
	await card.waitFor({ state: "attached" });
	return { page, card };
}

/** Where `card` lies and how opaque it shows; neither read scrolls the page. */
async function atTop(card: Locator) {
	const box = await card.boundingBox();
	if (box === null) throw new Error("the Contact Summary's card has no box");
	return { top: Math.round(box.y), opacity: await shownOpacity(card) };
}

/**
 * How opaque `card` shows once it is scrolled to. A scroll-driven animation follows a scroll one
 * frame later (docs/agents/playwright-test-1.63.0.md "Media and motion"), so this reads until the
 * card is whole or SHOWN_LIMIT_MS is over.
 */
async function shownOnceScrolledTo(page: Page, card: Locator): Promise<number> {
	await card.scrollIntoViewIfNeeded();
	const deadline = performance.now() + SHOWN_LIMIT_MS;
	let opacity = await shownOpacity(card);
	while (opacity !== 1 && performance.now() < deadline) {
		await page.waitForTimeout(100);
		opacity = await shownOpacity(card);
	}
	return opacity;
}

async function screenshot(page: Page, name: string, fullPage: boolean): Promise<void> {
	if (SCREENSHOTS !== undefined) await page.screenshot({ path: join(SCREENSHOTS, name), fullPage });
}

if (ORIGIN === undefined) {
	console.error(
		"usage: CHECK_ORIGIN=<origin> node scripts/check-built-reveal.ts [<screenshot-dir>]",
	);
	process.exit(2);
}
const browser = await chromium.launch();
try {
	const { width, height } = DESKTOP_VIEWPORT;
	say(
		`${ORIGIN}/, image ${process.env.CHECK_IMAGE ?? "none named"}, Chromium ${browser.version()}, window ${width} x ${height}`,
	);

	const moving = await open(browser, "no-preference");
	const waiting = {
		...(await atTop(moving.card)),
		timeline: await moving.card.evaluate((element) =>
			getComputedStyle(element).getPropertyValue("animation-timeline"),
		),
	};
	say(
		`the Contact Summary's card, motion allowed, at the page's top: ${waiting.top} px down, animation-timeline ${waiting.timeline}, opacity ${waiting.opacity}`,
	);
	await screenshot(moving.page, "reveal-waiting.png", true);
	const shown = await shownOnceScrolledTo(moving.page, moving.card);
	say(`motion allowed, scrolled to: opacity ${shown}`);
	await screenshot(moving.page, "reveal-shown.png", false);

	const standing = await open(browser, "reduce");
	const still = await atTop(standing.card);
	say(`reduced motion, at the page's top: ${still.top} px down, opacity ${still.opacity}`);
	await screenshot(standing.page, "reveal-reduced-motion.png", true);

	const failures = revealFailures({ windowHeight: height, waiting, shown, still });
	if (failures.length > 0) {
		console.error("check-built-reveal: FAIL");
		for (const failure of failures) console.error(`  ${failure}`);
		process.exitCode = 1;
	} else {
		say("PASS");
	}
} finally {
	await browser.close();
}

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
// from the start. scripts/built-reveal/plan.ts gives the verdict. With <screenshot-dir> it writes
// one PNG of each state. The origin and the image come from production-image-check.sh. Exit
// status 1: a reading failed; 2: no origin.

import { join } from "node:path";

import { chromium, type Browser, type Locator, type Page } from "@playwright/test";

import { SYNTHETIC_REFERRER } from "../playwright.config.ts";
import {
	DESKTOP_VIEWPORT,
	HOMEPAGE_HEADINGS,
	homepageSection,
	shownOpacity,
} from "../tests/browser/public.helpers.ts";
import { REVEAL_STATES, revealFailures } from "./built-reveal/plan.ts";

const ORIGIN = process.env.CHECK_ORIGIN;
const SCREENSHOTS = process.argv[2];
const SHOWN_LIMIT_MS = 5_000;
// Nothing on the page runs by itself for longer than five seconds (docs/design/DESIGN.md §8.12).
const ON_THE_CLOCK_LIMIT_MS = 6_000;

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
	// taken after them shows only what the reveal holds back. The readings do not need the wait, so
	// an effect that is cancelled, or one still running at the limit, does not stop the check.
	await page.evaluate(async (limit) => {
		const onTheClock = document
			.getAnimations()
			.filter((animation) => animation.timeline instanceof DocumentTimeline);
		await Promise.race([
			Promise.allSettled(onTheClock.map((animation) => animation.finished)),
			new Promise((resolve) => setTimeout(resolve, limit)),
		]);
	}, ON_THE_CLOCK_LIMIT_MS);
	const card = homepageSection(page, HOMEPAGE_HEADINGS.contact).getByTestId("contact-card");
	await card.waitFor({ state: "attached" });
	return { page, card };
}

/**
 * Where `card` shows in the window and how opaque. Neither read scrolls the page: a box follows
 * the page's scroll as `getBoundingClientRect` does (playwright-core 1.63.0, the types,
 * `Locator.boundingBox`).
 */
async function placed(card: Locator) {
	const box = await card.boundingBox();
	if (box === null) throw new Error("the Contact Summary's card has no box");
	return { top: Math.round(box.y), opacity: await shownOpacity(card) };
}

/**
 * Where `card` shows and how opaque once it is scrolled to. A scroll-driven animation follows a
 * scroll one frame later (docs/agents/playwright-test-1.63.0.md "Media and motion"), so this
 * reads until the card is whole or SHOWN_LIMIT_MS is over.
 */
async function placedOnceScrolledTo(page: Page, card: Locator) {
	await card.scrollIntoViewIfNeeded();
	const deadline = performance.now() + SHOWN_LIMIT_MS;
	while ((await shownOpacity(card)) !== 1 && performance.now() < deadline) {
		await page.waitForTimeout(100);
	}
	return placed(card);
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

	const motion = await open(browser, "no-preference");
	const waiting = {
		...(await placed(motion.card)),
		timeline: await motion.card.evaluate((element) =>
			getComputedStyle(element).getPropertyValue("animation-timeline"),
		),
	};
	say(
		`the Contact Summary's card, ${REVEAL_STATES.waiting}: ${waiting.top} px down, animation-timeline ${waiting.timeline}, opacity ${waiting.opacity}`,
	);
	// A full-page screenshot does not scroll (docs/agents/playwright-test-1.63.0.md "Media and
	// motion"), so it shows the card and the sections above it as they wait.
	await screenshot(motion.page, "reveal-waiting.png", true);
	const shown = await placedOnceScrolledTo(motion.page, motion.card);
	say(`${REVEAL_STATES.shown}: ${shown.top} px down, opacity ${shown.opacity}`);
	await screenshot(motion.page, "reveal-shown.png", false);

	const reduced = await open(browser, "reduce");
	const reducedMotion = await placed(reduced.card);
	say(
		`${REVEAL_STATES.reducedMotion}: ${reducedMotion.top} px down, opacity ${reducedMotion.opacity}`,
	);
	await screenshot(reduced.page, "reveal-reduced-motion.png", true);

	const failures = revealFailures({
		windowHeight: height,
		waiting,
		shown: shown.opacity,
		reducedMotion,
	});
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

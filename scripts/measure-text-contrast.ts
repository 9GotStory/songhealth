// The contrast of text against what is drawn behind it, on the development runtime (#241 retro).
// axe leaves text over a gradient or a decoration unmeasured, and a gradient the browser rejects
// leaves no fill at all, so a page that puts text on a drawn field reads its contrast with this
// before its suites run.
//
//   node scripts/measure-text-contrast.ts [--fixtures <module>] <path> <selector> [<selector>...]
//
// At each of the widths 1440, 1024, 768, 375 and 320 px it opens <path> and, for the first element
// each selector matches, a Playwright locator such as "main > section p >> nth=0", prints the
// lowest contrast ratio (WCAG 2.2 relative luminance) between the element's own colour and the
// page under each pixel its text covers. It finds those pixels by capturing the element with its
// text and again with the text transparent, after scrolling it into the window and waiting for the
// pictures that then load (#244). Text inside the element in another colour is measured
// against the element's colour, so give such a run its own selector. Animations are stopped
// first. Small text needs 4.5:1 and large text 3:1 (SC 1.4.3); the script prints and judges
// nothing.
//
// A state the demo dataset does not hold takes --fixtures, a module of
// scripts/screenshot-fixtures/, through scripts/dev-runtime-env.sh: its content is made first and
// removed afterwards, as scripts/capture-with-fixtures.ts does, and the paths it returns are not
// used. A prototype's page is measured the same way before its look is offered to the Product
// Owner (#245 retro), with its folder as the origin and its file as the path:
//   PLAYWRIGHT_BASE_URL=file:///…/home-redesign/ node scripts/measure-text-contrast.ts \
//     home-bold.html <selector>
// The measuring runs in this process without blocking it, so the fixture kit's restore
// still reaches the runtime (a blocked event loop failed a menu restore in #241). Pages are read
// anonymously; the origin is PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324.

import type { Page } from "@playwright/test";

import { contrast, decode, measureAtEachWidth, pixelAt, rgbOf } from "./contrast-kit.ts";

const args = process.argv.slice(2);
const fixturesPath = args[0] === "--fixtures" ? args[1] : undefined;
const [path, ...selectors] = fixturesPath === undefined ? args : args.slice(2);
if (path === undefined || selectors.length === 0 || (args[0] === "--fixtures" && !fixturesPath)) {
	console.error(
		"usage: node scripts/measure-text-contrast.ts [--fixtures <module>] <path> <selector> [<selector>...]",
	);
	process.exit(2);
}

/** The lowest contrast of `selector`'s text against the page under it, and how many pixels. */
async function lowestContrast(page: Page, selector: string): Promise<string> {
	const element = page.locator(selector).first();
	if (!(await element.isVisible())) return "not shown";
	// A screenshot's clip lies in the window, and a picture below it loads once it comes into view.
	await element.scrollIntoViewIfNeeded();
	await page.waitForLoadState("networkidle");
	const clip = await element.boundingBox();
	if (clip === null) return "not shown";
	const text = rgbOf(await element.evaluate((node) => getComputedStyle(node).color));
	const withText = await page.screenshot({ clip });
	await element.evaluate((node) => {
		for (const part of [node, ...node.querySelectorAll<HTMLElement>("*")]) {
			(part as HTMLElement).style.setProperty("color", "transparent", "important");
		}
	});
	const withoutText = await page.screenshot({ clip });
	const [seen, behind] = await decode(page, [withText, withoutText]);
	let lowest = Infinity;
	let covered = 0;
	for (let at = 0; at < behind!.data.length; at += 4) {
		const [shown, field] = [pixelAt(seen!, at), pixelAt(behind!, at)];
		const moved = shown.reduce((sum, channel, index) => sum + Math.abs(channel - field[index]!), 0);
		if (moved < 60) continue;
		covered++;
		lowest = Math.min(lowest, contrast(text, field));
	}
	return covered === 0 ? "no text pixel found" : `${lowest.toFixed(2)}:1 (${covered} px)`;
}

await measureAtEachWidth({ path, selectors, fixtures: fixturesPath }, lowestContrast);

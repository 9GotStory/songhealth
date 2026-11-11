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
// text and again with the text transparent. Text inside the element in another colour is measured
// against the element's colour, so give such a run its own selector. Animations are stopped
// first. Small text needs 4.5:1 and large text 3:1 (SC 1.4.3); the script prints and judges
// nothing.
//
// A state the demo dataset does not hold takes --fixtures, a module of
// scripts/screenshot-fixtures/, through scripts/dev-runtime-env.sh: its content is made first and
// removed afterwards, as scripts/capture-with-fixtures.ts does, and the paths it returns are not
// used. The measuring runs in this process without blocking it, so the fixture kit's restore
// still reaches the runtime (a blocked event loop failed a menu restore in #241). Pages are read
// anonymously; the origin is PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "@playwright/test";

import { SYNTHETIC_REFERRER } from "../playwright.config.ts";
import type { Fixtures } from "./capture-with-fixtures.ts";

const WIDTHS = [1440, 1024, 768, 375, 320];
const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

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
	const clip = await element.boundingBox();
	if (clip === null) return "not shown";
	const color = await element.evaluate((node) => getComputedStyle(node).color);
	const withText = (await page.screenshot({ clip })).toString("base64");
	await element.evaluate((node) => {
		for (const part of [node, ...node.querySelectorAll<HTMLElement>("*")]) {
			(part as HTMLElement).style.setProperty("color", "transparent", "important");
		}
	});
	const withoutText = (await page.screenshot({ clip })).toString("base64");
	return page.evaluate(
		async ([shown, hidden, textColor]) => {
			const pixels = async (png: string) => {
				const image = new Image();
				image.src = `data:image/png;base64,${png}`;
				await image.decode();
				const canvas = document.createElement("canvas");
				canvas.width = image.width;
				canvas.height = image.height;
				const context = canvas.getContext("2d")!;
				context.drawImage(image, 0, 0);
				return context.getImageData(0, 0, canvas.width, canvas.height).data;
			};
			const linear = (channel: number) => {
				const value = channel / 255;
				return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
			};
			const luminance = (r: number, g: number, b: number) =>
				0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
			const [r, g, b] = (textColor!.match(/[\d.]+/g) ?? []).map(Number);
			const text = luminance(r ?? 0, g ?? 0, b ?? 0);
			const [seen, behind] = [await pixels(shown!), await pixels(hidden!)];
			let lowest = Infinity;
			let covered = 0;
			for (let at = 0; at < behind.length; at += 4) {
				const moved =
					Math.abs(seen[at]! - behind[at]!) +
					Math.abs(seen[at + 1]! - behind[at + 1]!) +
					Math.abs(seen[at + 2]! - behind[at + 2]!);
				if (moved < 60) continue;
				covered++;
				const field = luminance(behind[at]!, behind[at + 1]!, behind[at + 2]!);
				const ratio = (Math.max(text, field) + 0.05) / (Math.min(text, field) + 0.05);
				lowest = Math.min(lowest, ratio);
			}
			return covered === 0 ? "no text pixel found" : `${lowest.toFixed(2)}:1 (${covered} px)`;
		},
		[withText, withoutText, color],
	);
}

/** Print each selector's lowest contrast at each width. */
async function measure(): Promise<void> {
	const browser = await chromium.launch();
	try {
		for (const width of WIDTHS) {
			const page = await browser.newPage({
				viewport: { width, height: 1200 },
				extraHTTPHeaders: { referer: SYNTHETIC_REFERRER },
			});
			await page.goto(new URL(path!, ORIGIN).href);
			await page.evaluate(() => {
				for (const node of document.querySelectorAll<HTMLElement>("*")) {
					node.style.setProperty("animation", "none", "important");
					node.style.setProperty("transition", "none", "important");
				}
			});
			for (const selector of selectors) {
				console.log(`${width} px  ${selector}  ${await lowestContrast(page, selector)}`);
			}
			await page.close();
		}
	} finally {
		await browser.close();
	}
}

if (fixturesPath === undefined) {
	await measure();
} else {
	const { withFixtureKit } = await import("./fixture-kit.ts");
	await withFixtureKit(async (kit) => {
		const fixtures = (await import(pathToFileURL(resolve(fixturesPath)).href)).default as Fixtures;
		await fixtures(kit);
		await measure();
	});
}

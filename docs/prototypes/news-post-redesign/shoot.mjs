// PROTOTYPE (throwaway), Feature 009: screenshots of a page at given widths.
// node .tmp/prototypes/news-post-redesign/shoot.mjs <url> <name> [widths] [selector]
// Writes .tmp/prototypes/news-post-redesign/shots/<name>-<width>.png, full page unless a selector
// is given. Reduced motion is preferred, as the suites read the pages (DESIGN.md §8.12).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const [url, name, widths = "1440", selector] = process.argv.slice(2);
const out = new URL("./shots/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
for (const width of widths.split(",").map(Number)) {
	const page = await browser.newPage({
		viewport: { width, height: width < 640 ? 800 : 900 },
		reducedMotion: "reduce",
	});
	await page.goto(url, { waitUntil: "networkidle" });
	const path = new URL(`${name}-${width}.png`, out).pathname;
	if (selector) await page.locator(selector).first().screenshot({ path });
	else await page.screenshot({ path, fullPage: true });
	const m = await page.evaluate(() => ({
		h: document.documentElement.scrollHeight,
		over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
	}));
	console.log(`${name} ${width}: height ${m.h}, overflow ${m.over} -> ${path}`);
	await page.close();
}
await browser.close();

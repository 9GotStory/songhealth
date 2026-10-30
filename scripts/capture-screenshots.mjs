// Pull-request screenshots of public pages, taken from the development runtime.
//
//   node scripts/capture-screenshots.mjs <out-dir> <[name=]path> [<[name=]path>...]
//
// Each path is captured full-page at 1440 px (desktop), 375 px and 320 px (mobile), into
// <name>-<width>.png. Without a name, the path gives it ("/news/x" is "news-x"), so name a path
// whose slug is synthetic. At the mobile widths the first path is captured again with the menu
// open. The origin is PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324. Pages are read
// anonymously, with no credential.
//
// To show the images in a pull request without adding them to the code tree, put them on an
// image-only branch with scripts/evidence-branch.sh <ticket> <out-dir>, which prints how to push
// and embed them.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const WIDTHS = [
	{ name: "desktop", viewport: { width: 1440, height: 900 } },
	{ name: "375", viewport: { width: 375, height: 812 } },
	{ name: "320", viewport: { width: 320, height: 640 } },
];

const [outDir, ...targets] = process.argv.slice(2);
if (outDir === undefined || targets.length === 0) {
	console.error(
		"usage: node scripts/capture-screenshots.mjs <out-dir> <[name=]path> [<[name=]path>...]",
	);
	process.exit(2);
}
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

/** A file-name stem for a path: "/" is "home", "/news/x" is "news-x". Thai letters stay. */
function stem(path) {
	const trimmed = path.replace(/^\/+|\/+$/g, "").replace(/[^\p{L}\p{M}\p{N}]+/gu, "-");
	return trimmed === "" ? "home" : trimmed;
}

/** A target as its file-name base and path: "name=/path" names it, a bare "/path" names itself. */
const pages = targets.map((target) => {
	const split = target.startsWith("/") ? -1 : target.indexOf("=");
	return split === -1
		? { base: stem(target), path: target }
		: { base: target.slice(0, split), path: target.slice(split + 1) };
});

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const written = [];
try {
	for (const [index, { base, path }] of pages.entries()) {
		for (const { name, viewport } of WIDTHS) {
			const page = await browser.newPage({ viewport });
			await page.goto(new URL(path, origin).href);
			// A full-page screenshot does not scroll, so lazy pictures below the fold would never
			// load. Load and decode every picture first, as a reader scrolling down would see it.
			await page.evaluate(async () => {
				await document.fonts.ready;
				for (const image of document.images) image.loading = "eager";
				await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
			});
			const file = join(outDir, `${base}-${name}.png`);
			await page.screenshot({ path: file, fullPage: true });
			written.push(file);
			if (index === 0 && name !== "desktop") {
				await page.getByText("เมนู", { exact: true }).click();
				const menuFile = join(outDir, `${base}-${name}-menu.png`);
				await page.screenshot({ path: menuFile, fullPage: true });
				written.push(menuFile);
			}
			await page.close();
		}
	}
} finally {
	await browser.close();
}
console.log(written.join("\n"));

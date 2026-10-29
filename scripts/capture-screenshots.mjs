// Pull-request screenshots of public pages, taken from the development runtime.
//
//   node scripts/capture-screenshots.mjs <out-dir> <path> [<path>...]
//
// Each path is captured full-page at 1440 px (desktop), 375 px and 320 px (mobile).
// At the mobile widths the first path is captured again with the menu open. The
// origin is PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324. Pages are read
// anonymously, with no credential.
//
// To show the images in a pull request without adding them to the code tree, commit
// them on an image-only branch and embed
// `https://github.com/9GotStory/songhealth/blob/<commit>/<file>?raw=true`:
//
//   tree=$(for f in <out-dir>/*.png; do
//     printf '100644 blob %s\t%s\n' "$(git hash-object -w "$f")" "$(basename "$f")"
//   done | git mktree)
//   commit=$(git commit-tree "$tree" -m "evidence: <ticket> screenshots")
//   git push origin "$commit:refs/heads/evidence/<ticket>-screenshots"

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const WIDTHS = [
	{ name: "desktop", viewport: { width: 1440, height: 900 } },
	{ name: "375", viewport: { width: 375, height: 812 } },
	{ name: "320", viewport: { width: 320, height: 640 } },
];

const [outDir, ...paths] = process.argv.slice(2);
if (outDir === undefined || paths.length === 0) {
	console.error("usage: node scripts/capture-screenshots.mjs <out-dir> <path> [<path>...]");
	process.exit(2);
}
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

/** A file-name stem for a path: "/" is "home", "/news/x" is "news-x". Thai letters stay. */
function stem(path) {
	const trimmed = path.replace(/^\/+|\/+$/g, "").replace(/[^\p{L}\p{M}\p{N}]+/gu, "-");
	return trimmed === "" ? "home" : trimmed;
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const written = [];
try {
	for (const [index, path] of paths.entries()) {
		for (const { name, viewport } of WIDTHS) {
			const page = await browser.newPage({ viewport });
			await page.goto(new URL(path, origin).href);
			await page.evaluate(async () => {
				await document.fonts.ready;
			});
			const file = join(outDir, `${stem(path)}-${name}.png`);
			await page.screenshot({ path: file, fullPage: true });
			written.push(file);
			if (index === 0 && name !== "desktop") {
				await page.getByText("เมนู", { exact: true }).click();
				const menuFile = join(outDir, `${stem(path)}-${name}-menu.png`);
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

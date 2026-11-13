// PROTOTYPE (throwaway), Feature 009: every case in both variants at the five widths of Feature
// 008 (1,440, 1,024, 768, 375, 320 px), with each page's height and any overflow past the window.
// node .tmp/prototypes/news-post-redesign/shoot-all.mjs [file-prefix]
import { chromium } from "@playwright/test";
import { mkdir, readdir, writeFile } from "node:fs/promises";

const here = new URL("./", import.meta.url);
const WIDTHS = [1440, 1024, 768, 375, 320];
const only = process.argv[2] ?? "";
const files = (await readdir(here)).filter((f) => /^(list|post)-.*\.html$/.test(f) && f.startsWith(only)).sort();
await mkdir(new URL("shots/", here), { recursive: true });
const browser = await chromium.launch();
const rows = [];
for (const file of files)
	for (const variant of (process.argv[3] ?? "A,B").split(","))
		for (const width of WIDTHS) {
			const page = await browser.newPage({ viewport: { width, height: width < 640 ? 800 : 900 }, reducedMotion: "reduce" });
			await page.goto(new URL(`${file}?variant=${variant}&nobar`, here).href, { waitUntil: "networkidle" });
			const name = `${file.replace(".html", "")}-${variant}-${width}`;
			await page.screenshot({ path: new URL(`shots/${name}.png`, here).pathname, fullPage: true });
			const m = await page.evaluate(() => ({
				height: document.documentElement.scrollHeight,
				overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			}));
			rows.push({ name, ...m });
			await page.close();
		}
await browser.close();
await writeFile(new URL("shots/measures.json", here), JSON.stringify(rows, null, "\t"));
const over = rows.filter((r) => r.overflow > 0);
console.log(`${rows.length} screenshots; overflow past the window: ${over.length ? over.map((r) => `${r.name} +${r.overflow}`).join(", ") : "none"}`);

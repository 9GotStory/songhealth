// PROTOTYPE (throwaway), Feature 015: every case in each of its variants at the widths, with each
// page's height, any overflow past the window, and where the first result starts (grill Q10:
// at 375 px no lower than today's 706 px). node .tmp/prototypes/search-404/shoot-all.mjs [prefix]
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const here = new URL("./", import.meta.url);
const WIDTHS = (process.env.WIDTHS ?? "1440,1024,768,375,320").split(",").map(Number);
const only = process.argv[2] ?? "";
const files = (await readdir(here)).filter((f) => f.endsWith(".html") && f.startsWith(only)).sort();
await mkdir(new URL("shots/", here), { recursive: true });
const browser = await chromium.launch();
const rows = [];
for (const file of files) {
	const html = await readFile(new URL(file, here), "utf8");
	const variants = [...html.matchAll(/<div data-variant="([A-Za-z0-9]+)"/g)].map((m) => m[1]);
	for (const variant of variants)
		for (const width of WIDTHS) {
			const page = await browser.newPage({ viewport: { width, height: width < 640 ? 812 : 900 }, reducedMotion: "reduce" });
			await page.goto(new URL(`${file}?variant=${variant}&nobar`, here).href, { waitUntil: "networkidle" });
			await page.evaluate(() => document.fonts.ready);
			const name = `${file.replace(".html", "")}-${variant}-${width}`;
			await page.screenshot({ path: new URL(`shots/${name}.png`, here).pathname, fullPage: true });
			const m = await page.evaluate((v) => {
				const root = document.querySelector(`main [data-variant="${v}"]`);
				const first = root.querySelector("[data-first-result]");
				const field = root.querySelector('[data-testid="deep-field"]');
				return {
					height: document.documentElement.scrollHeight,
					overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
					firstResult: first ? Math.round(first.getBoundingClientRect().top + scrollY) : null,
					fieldBottom: field ? Math.round(field.getBoundingClientRect().bottom + scrollY) : null,
				};
			}, variant);
			rows.push({ name, ...m });
			await page.close();
		}
}
await browser.close();
await writeFile(new URL(`shots/measures${only ? `-${only}` : ""}.json`, here), JSON.stringify(rows, null, "\t"));
const over = rows.filter((r) => r.overflow > 0);
console.log(`${rows.length} screenshots; overflow past the window: ${over.length ? over.map((r) => `${r.name} +${r.overflow}`).join(", ") : "none"}`);
for (const r of rows.filter((r) => r.firstResult !== null && /search-found/.test(r.name)))
	console.log(`${r.name}: first result at ${r.firstResult} px, page ${r.height} px`);

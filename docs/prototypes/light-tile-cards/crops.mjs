// PROTOTYPE (throwaway), Feature 014 (#412): close-ups of the row tiles and the cards in each
// variant, side by side per case and width, for the Product Owner's picks.
// node .tmp/prototypes/light-tile-cards/crops.mjs  →  crops/<case>-<width>.png
import { mkdir, readdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const here = new URL("./", import.meta.url);
const WIDTHS = (process.env.WIDTHS ?? "1440,375").split(",").map(Number);
await mkdir(new URL("crops/", here), { recursive: true });
const files = (await readdir(here)).filter((f) => f.endsWith(".html")).sort();
const browser = await chromium.launch();
let made = 0;
for (const file of files) {
	const html = await readFile(new URL(file, here), "utf8");
	const variants = [...html.matchAll(/<div data-variant="([A-Za-z0-9]+)"/g)].map((m) => m[1]);
	for (const width of WIDTHS) {
		const parts = [];
		for (const variant of variants) {
			const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
			await page.goto(new URL(`${file}?variant=${variant}&nobar`, here).href, { waitUntil: "networkidle" });
			const box = await page.evaluate(([v, isCards]) => {
				const root = document.querySelector(`main [data-variant="${v}"]`);
				let items = [...root.querySelectorAll("p.size-17")].map((t) => t.closest("article, li") ?? t.parentElement);
				const closed = items.findIndex((el) => el.querySelector(".bg-status-closed, .border-border-default"));
				if (isCards) items = [...root.querySelectorAll("ul.grid > li")];
				const pick = closed > 0 ? [items[0], items[closed]] : items.slice(0, isCards ? 3 : 2);
				if (!pick.length || !pick[0]) return null;
				const rects = pick.map((el) => el.getBoundingClientRect());
				const top = Math.min(...rects.map((r) => r.top)) + scrollY - 8;
				const bottom = Math.max(...rects.map((r) => r.bottom)) + scrollY + 8;
				return { x: 0, y: Math.max(0, top), width: innerWidth, height: bottom - top };
			}, [variant, /^(health|about)\.html$/.test(file)]);
			if (box) parts.push({ variant, buf: await page.screenshot({ clip: box, fullPage: true }), h: Math.round(box.height) });
			await page.close();
		}
		if (parts.length < 2) continue;
		const labelH = 28;
		const height = parts.reduce((s, p) => s + p.h + labelH, 0);
		let y = 0;
		const comps = [];
		for (const p of parts) {
			comps.push({ input: Buffer.from(`<svg width="${width}" height="${labelH}"><rect width="100%" height="100%" fill="#111"/><text x="10" y="19" fill="#fff" font-family="sans-serif" font-size="15">${p.variant}</text></svg>`), left: 0, top: y });
			comps.push({ input: p.buf, left: 0, top: y + labelH });
			y += p.h + labelH;
		}
		await sharp({ create: { width, height, channels: 3, background: "#888" } }).composite(comps).png().toFile(new URL(`crops/${file.replace(".html", "")}-${width}.png`, here).pathname);
		made++;
	}
}
await browser.close();
console.log(`${made} crops`);

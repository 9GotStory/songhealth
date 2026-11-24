// PROTOTYPE (throwaway), Feature 015: the rows of every kind close up, with and without the tile,
// side by side at one width. node .tmp/prototypes/search-404/crops.mjs  →  crops/kinds-<width>.png
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const here = new URL("./", import.meta.url);
await mkdir(new URL("crops/", here), { recursive: true });
const browser = await chromium.launch();
for (const width of [1440, 375]) {
	const parts = [];
	for (const variant of ["T", "N"]) {
		const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
		await page.goto(new URL(`search-kinds.html?variant=${variant}&nobar`, here).href, { waitUntil: "networkidle" });
		await page.evaluate(() => document.fonts.ready);
		const box = await page.evaluate((v) => {
			const items = [...document.querySelectorAll(`main [data-variant="${v}"] ul.flex-col > li`)];
			const top = items[0].getBoundingClientRect().top + scrollY - 10;
			const bottom = items.at(-1).getBoundingClientRect().bottom + scrollY + 10;
			return { x: 0, y: top, width: innerWidth, height: bottom - top };
		}, variant);
		parts.push({ variant, buf: await page.screenshot({ clip: box, fullPage: true }), h: Math.round(box.height) });
		await page.close();
	}
	const gap = 40, labelH = 36;
	await sharp({ create: { width: width * 2 + gap, height: labelH + Math.max(...parts.map((p) => p.h)), channels: 3, background: "#888" } })
		.composite(parts.flatMap((p, n) => [
			{ input: Buffer.from(`<svg width="${width}" height="${labelH}"><rect width="100%" height="100%" fill="#111"/><text x="12" y="25" fill="#fff" font-family="sans-serif" font-size="20" font-weight="bold">${p.variant === "T" ? "T มี tile" : "N ไม่มี tile"}</text></svg>`), left: n * (width + gap), top: 0 },
			{ input: p.buf, left: n * (width + gap), top: labelH },
		]))
		.png()
		.toFile(new URL(`crops/kinds-${width}.png`, here).pathname);
	console.log(`crops/kinds-${width}.png ${parts.map((p) => `${p.variant} ${p.h}px`).join(", ")}`);
}
await browser.close();

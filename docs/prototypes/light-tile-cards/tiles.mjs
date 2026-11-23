// PROTOTYPE (throwaway), Feature 014 (#412): one sheet of every tile family in each variant at 2×,
// a row per family, a column per variant, at 1,440 px (the 92 px tile) and 375 px (68 px).
// node .tmp/prototypes/light-tile-cards/tiles.mjs  →  crops/tiles-<width>.png
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const here = new URL("./", import.meta.url);
await mkdir(new URL("crops/", here), { recursive: true });
const ROWS = [
	["documents", 0, "FileTile (PDF)"],
	["ita-year", 0, "ItaMoitRow"],
	["health-reports", 0, "HealthReportRow"],
	["health-services", 0, "HealthServiceMapRow"],
	["announcements", 0, "Announcement เปิด"],
	["announcements", "closed", "Announcement ปิดแล้ว"],
];
const COLS = ["now", "A", "B", "C", "A2"];
const browser = await chromium.launch();
for (const width of [1440, 375]) {
	const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce", deviceScaleFactor: 2 });
	const cells = [];
	for (const [r, [file, which]] of ROWS.entries()) {
		await page.goto(new URL(`${file}.html?nobar`, here).href, { waitUntil: "networkidle" });
		for (const [c, variant] of COLS.entries()) {
			const v = variant === "A2" && file !== "announcements" ? null : variant;
			if (!v) continue;
			await page.evaluate((v) => {
				for (const el of document.querySelectorAll("[data-variant]")) el.hidden = el.dataset.variant !== v;
			}, v);
			const tiles = page.locator(`main [data-variant="${v}"] p.size-17`);
			const n = await tiles.count();
			let index = 0;
			if (which === "closed") {
				for (let i = 0; i < n; i++)
					if (/bg-status-closed|border-border-default/.test(await tiles.nth(i).getAttribute("class"))) index = i;
			}
			const tile = tiles.nth(index);
			cells.push({ r, c, buf: await tile.screenshot({ animations: "disabled" }) });
		}
	}
	await page.close();
	const size = width >= 640 ? 92 * 2 : 68 * 2;
	const pad = 36;
	const labelW = 300;
	const cellW = size + pad * 2;
	const headH = 50;
	const W = labelW + cellW * COLS.length;
	const H = headH + (size + pad * 2) * ROWS.length;
	const text = (s, x, y, anchor = "start") => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Noto Sans Thai, sans-serif" font-size="22" fill="#16211d">${s}</text>`;
	const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/>${COLS.map((c, i) => text(c, labelW + cellW * i + cellW / 2, 34, "middle")).join("")}${ROWS.map(([, , l], i) => text(l, 16, headH + (size + pad * 2) * i + pad + size / 2 + 8)).join("")}</svg>`;
	await sharp(Buffer.from(svg))
		.composite(cells.map(({ r, c, buf }) => ({ input: buf, left: labelW + cellW * c + pad, top: headH + (size + pad * 2) * r + pad })))
		.png()
		.toFile(new URL(`crops/tiles-${width}.png`, here).pathname);
}
await browser.close();
console.log("crops/tiles-1440.png, crops/tiles-375.png");

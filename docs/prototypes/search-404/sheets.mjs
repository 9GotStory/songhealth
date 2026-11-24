// PROTOTYPE (throwaway), Feature 015: the variants of each case side by side at one width, each
// with its label, cut at MAX_HEIGHT px. node .tmp/prototypes/search-404/sheets.mjs
//   →  sheets/<case>-<width>.png
import { mkdir, readdir } from "node:fs/promises";
import sharp from "sharp";

const here = new URL("./", import.meta.url);
const MAX_HEIGHT = Number(process.env.MAX_HEIGHT ?? 2200);
await mkdir(new URL("sheets/", here), { recursive: true });
const shots = (await readdir(new URL("shots/", here))).filter((f) => f.endsWith(".png"));
const ORDER = ["now", "A", "B", "B2", "AN", "T", "N"];
const cases = [...new Set(shots.map((f) => f.match(/^(.*)-(?:now|A|B|B2|AN|T|N)-\d+\.png$/)?.[1]).filter(Boolean))];
let made = 0;
for (const name of cases)
	for (const width of [1440, 1024, 375, 320]) {
		const variants = ORDER.filter((v) => shots.includes(`${name}-${v}-${width}.png`));
		if (variants.length < 2) continue;
		const gap = 40;
		const labelH = 36;
		const parts = await Promise.all(
			variants.map(async (v) => {
				const img = sharp(new URL(`shots/${name}-${v}-${width}.png`, here).pathname);
				const { height } = await img.metadata();
				const h = Math.min(height, MAX_HEIGHT);
				return { v, h, buf: await img.extract({ left: 0, top: 0, width, height: h }).toBuffer() };
			}),
		);
		const comps = parts.flatMap((p, n) => [
			{
				input: Buffer.from(
					`<svg width="${width}" height="${labelH}"><rect width="100%" height="100%" fill="#111"/><text x="12" y="25" fill="#fff" font-family="sans-serif" font-size="20" font-weight="bold">${p.v}</text></svg>`,
				),
				left: n * (width + gap),
				top: 0,
			},
			{ input: p.buf, left: n * (width + gap), top: labelH },
		]);
		await sharp({
			create: { width: width * parts.length + gap * (parts.length - 1), height: labelH + Math.max(...parts.map((p) => p.h)), channels: 3, background: "#888888" },
		})
			.composite(comps)
			.png()
			.toFile(new URL(`sheets/${name}-${width}.png`, here).pathname);
		made++;
	}
console.log(`${made} sheets`);

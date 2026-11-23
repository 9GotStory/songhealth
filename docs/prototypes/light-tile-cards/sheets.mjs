// PROTOTYPE (throwaway), Feature 014 (#412): the variants of each case side by side at one width.
// node .tmp/prototypes/light-tile-cards/sheets.mjs  →  sheets/<case>-<width>.png
import { mkdir, readdir } from "node:fs/promises";
import sharp from "sharp";

const here = new URL("./", import.meta.url);
await mkdir(new URL("sheets/", here), { recursive: true });
const shots = (await readdir(new URL("shots/", here))).filter((f) => f.endsWith(".png"));
const ORDER = ["now", "A", "B", "C", "A2", "B2", "C2", "S", "N"];
const cases = [...new Set(shots.map((f) => f.match(/^(.*)-(?:now|[A-C]2?|[SN])-\d+\.png$/)?.[1]).filter(Boolean))];
let made = 0;
for (const name of cases)
	for (const width of [1440, 1024, 768, 375, 320]) {
		const variants = ORDER.filter((v) => shots.includes(`${name}-${v}-${width}.png`));
		if (variants.length < 2) continue;
		const images = await Promise.all(variants.map((v) => sharp(new URL(`shots/${name}-${v}-${width}.png`, here).pathname).toBuffer({ resolveWithObject: true })));
		const gap = 40;
		await sharp({ create: { width: width * images.length + gap * (images.length - 1), height: Math.max(...images.map((i) => i.info.height)), channels: 3, background: "#888888" } })
			.composite(images.map((i, n) => ({ input: i.data, left: n * (width + gap), top: 0 })))
			.png()
			.toFile(new URL(`sheets/${name}-${width}.png`, here).pathname);
		made++;
	}
console.log(`${made} sheets`);

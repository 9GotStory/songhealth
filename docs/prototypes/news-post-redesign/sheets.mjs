// PROTOTYPE (throwaway), Feature 009: variants A and B of each case side by side at one width.
// node .tmp/prototypes/news-post-redesign/sheets.mjs  →  sheets/<case>-<width>.png
import { mkdir, readdir } from "node:fs/promises";
import sharp from "sharp";

const here = new URL("./", import.meta.url);
await mkdir(new URL("sheets/", here), { recursive: true });
const cases = [...new Set((await readdir(new URL("shots/", here))).map((f) => f.match(/^((?:list|post)-.*)-[AB]-\d+\.png$/)?.[1]).filter(Boolean))];
for (const name of cases)
	for (const width of [1440, 1024, 768, 375, 320]) {
		const [a, b] = await Promise.all(["A", "B"].map((v) => sharp(new URL(`shots/${name}-${v}-${width}.png`, here).pathname).toBuffer({ resolveWithObject: true })));
		const gap = 40;
		await sharp({ create: { width: width * 2 + gap, height: Math.max(a.info.height, b.info.height), channels: 3, background: "#888888" } })
			.composite([{ input: a.data, left: 0, top: 0 }, { input: b.data, left: width + gap, top: 0 }])
			.png()
			.toFile(new URL(`sheets/${name}-${width}.png`, here).pathname);
	}
console.log(`${cases.length} cases`);

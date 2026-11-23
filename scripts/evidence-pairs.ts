// Which before/after pairs of a folder of screenshots are identical, and where the others differ,
// for a hand-off's record to quote (#397 retro item 3; scripts/evidence-pairs/plan.ts).
//
//   node scripts/evidence-pairs.ts <dir of PNGs>
//
// A pair is before-<name>.png with after-<name>.png. A pair byte for byte the same is identical;
// the others are decoded (8 bits a channel, not interlaced, as Chromium's screenshots are) and
// compared pixel by pixel. scripts/evidence-branch.sh prints it after the heights. Read-only.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

import {
	comparePixels,
	pairsReport,
	unfilter,
	type Comparison,
	type Image,
} from "./evidence-pairs/plan.ts";

const dir = process.argv[2];
if (dir === undefined) {
	console.error("usage: node scripts/evidence-pairs.ts <dir of PNGs>");
	process.exit(2);
}

/** Channels a pixel by the PNG colour type: grey, RGB, grey and alpha, RGBA. */
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };

function decode(file: string): Image {
	const bytes = readFileSync(file);
	let width = 0;
	let height = 0;
	let channels = 0;
	const data: Buffer[] = [];
	for (let at = 8; at < bytes.length;) {
		const length = bytes.readUInt32BE(at);
		const type = bytes.toString("latin1", at + 4, at + 8);
		const body = bytes.subarray(at + 8, at + 8 + length);
		if (type === "IHDR") {
			width = body.readUInt32BE(0);
			height = body.readUInt32BE(4);
			channels = CHANNELS[body[9]!] ?? 0;
			if (body[8] !== 8 || channels === 0 || body[12] !== 0) {
				throw new Error(`${file}: only 8-bit, non-interlaced grey or RGB(A) PNGs are read`);
			}
		} else if (type === "IDAT") data.push(body);
		else if (type === "IEND") break;
		at += 12 + length;
	}
	const pixels = unfilter(inflateSync(Buffer.concat(data)), width, height, channels);
	return { width, height, channels, pixels };
}

const pairs: { name: string; result: Comparison }[] = [];
for (const file of readdirSync(dir).sort()) {
	if (!file.startsWith("before-") || !file.endsWith(".png")) continue;
	const after = join(dir, `after-${file.slice("before-".length)}`);
	if (!existsSync(after)) continue;
	const name = file.slice("before-".length, -".png".length);
	const before = join(dir, file);
	const result = readFileSync(before).equals(readFileSync(after))
		? ({ kind: "identical" } as const)
		: comparePixels(decode(before), decode(after));
	pairs.push({ name, result });
}
for (const line of pairsReport(pairs)) console.log(line);

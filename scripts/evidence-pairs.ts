// Which before/after pairs of a folder of screenshots are identical, and where the others differ,
// for a hand-off's record to quote (#397 retro item 3; scripts/evidence-pairs/plan.ts).
//
//   node scripts/evidence-pairs.ts [--cases] <dir of PNGs>
//   node scripts/evidence-pairs.ts --against <dir of PNGs> <evidence branch>...
//
// A pair is before-<name>.png with after-<name>.png. A pair byte for byte the same is identical;
// the others are decoded (8 bits a channel, not interlaced, as Chromium's screenshots are) and
// compared pixel by pixel: each band of differing rows with its largest difference of one channel,
// and for two heights the rows from the top within one level as well as the rows the same (#434
// retro item 4: a header's shadow one level off). The first form gives a line per pair; with
// --cases, one line for the cases alike at every width and a line per other case, a block for a
// record to quote whole (#421 retro item 1). scripts/evidence-branch.sh prints both after the
// heights. --against holds each after-<name>.png against the same file on the first of the
// branches, newest first, that has it, such as the feature's earlier tickets' (#420 retro).
// Read-only.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

import {
	againstReport,
	casesReport,
	comparePixels,
	pairsReport,
	unfilter,
	type Comparison,
	type Image,
} from "./evidence-pairs/plan.ts";

const usage = () => {
	console.error(
		"usage: node scripts/evidence-pairs.ts [--cases] <dir of PNGs>\n" +
			"       node scripts/evidence-pairs.ts --against <dir of PNGs> <evidence branch>...",
	);
	process.exit(2);
};
const args = process.argv.slice(2);
const mode = args[0] === "--cases" || args[0] === "--against" ? args.shift() : undefined;
const dir = args.shift();
if (dir === undefined || (mode === "--against") !== args.length > 0) usage();

/** Channels a pixel by the PNG colour type: grey, RGB, grey and alpha, RGBA. */
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };

function decode(bytes: Buffer, file: string): Image {
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

/** Two PNGs: identical byte for byte, or compared pixel by pixel. */
const compared = (before: Buffer, after: Buffer, file: string): Comparison =>
	before.equals(after)
		? { kind: "identical" }
		: comparePixels(decode(before, `${file} (before)`), decode(after, file));

/** A file on a branch's tip, or undefined when the branch holds none of that name. */
function onBranch(branch: string, file: string): Buffer | undefined {
	try {
		return execFileSync("git", ["cat-file", "blob", `${branch}:${file}`], {
			maxBuffer: 256 * 1024 * 1024,
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return undefined;
	}
}

const files = readdirSync(dir!).sort();
if (mode === "--against") {
	const entries: { name: string; ref?: string; result?: Comparison }[] = [];
	for (const file of files) {
		if (!file.startsWith("after-") || !file.endsWith(".png")) continue;
		const name = file.slice("after-".length, -".png".length);
		const after = readFileSync(join(dir!, file));
		let entry: (typeof entries)[number] = { name };
		for (const ref of args) {
			const earlier = onBranch(ref, file);
			if (earlier === undefined) continue;
			entry = { name, ref, result: compared(earlier, after, file) };
			break;
		}
		entries.push(entry);
	}
	for (const line of againstReport(entries)) console.log(line);
} else {
	const pairs: { name: string; result: Comparison }[] = [];
	for (const file of files) {
		if (!file.startsWith("before-") || !file.endsWith(".png")) continue;
		const after = join(dir!, `after-${file.slice("before-".length)}`);
		if (!existsSync(after)) continue;
		const name = file.slice("before-".length, -".png".length);
		pairs.push({
			name,
			result: compared(readFileSync(join(dir!, file)), readFileSync(after), after),
		});
	}
	const report = mode === "--cases" ? casesReport : pairsReport;
	for (const line of report(pairs)) console.log(line);
}

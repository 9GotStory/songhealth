// Which before/after pairs of a folder of screenshots are identical, and where the others differ
// (#397 retro item 3: a hand-off ran `cmp` and a pixel diff of its own to find where the Homepage
// differed, and its log missed two widths). scripts/evidence-pairs.ts decodes each pair that is not
// byte for byte the same and passes its pixels here.

/** A decoded image: `channels` bytes a pixel, rows top to bottom. */
export interface Image {
	width: number;
	height: number;
	channels: number;
	pixels: Uint8Array;
}

/** How a pair compares. Bands are first and last rows, both inclusive. */
export type Comparison =
	| { kind: "identical" }
	| { kind: "differ"; pixels: number; bands: [number, number][] }
	| { kind: "heights"; before: number; after: number; sameRows: number };

/** Whether row `y` of the two images holds the same bytes. */
function sameRow(before: Image, after: Image, y: number): boolean {
	const length = before.width * before.channels;
	const one = before.pixels.subarray(y * length, (y + 1) * length);
	const other = after.pixels.subarray(y * length, (y + 1) * length);
	return one.every((value, index) => value === other[index]);
}

/**
 * The pixels that differ between two images of one size, with the bands of rows that hold them;
 * for two heights, the rows the same from the top, where a page that grew or shrank starts to move.
 */
export function comparePixels(before: Image, after: Image): Comparison {
	if (before.height !== after.height || before.width !== after.width) {
		let sameRows = 0;
		const rows = Math.min(before.height, after.height);
		while (before.width === after.width && sameRows < rows && sameRow(before, after, sameRows))
			sameRows++;
		return { kind: "heights", before: before.height, after: after.height, sameRows };
	}
	const { width, height, channels } = before;
	let pixels = 0;
	const bands: [number, number][] = [];
	for (let y = 0; y < height; y++) {
		let differing = 0;
		for (let x = 0; x < width; x++) {
			const start = (y * width + x) * channels;
			for (let channel = 0; channel < channels; channel++) {
				if (before.pixels[start + channel] !== after.pixels[start + channel]) {
					differing++;
					break;
				}
			}
		}
		if (differing === 0) continue;
		pixels += differing;
		const last = bands.at(-1);
		if (last !== undefined && last[1] === y - 1) last[1] = y;
		else bands.push([y, y]);
	}
	return pixels === 0 ? { kind: "identical" } : { kind: "differ", pixels, bands };
}

const px = (value: number) => value.toLocaleString("en-US");

/** The bands a line names one by one; more are given as their span and their count. */
const MOST_BANDS = 4;

/** A line per pair, then how many pairs are identical. */
export function pairsReport(pairs: readonly { name: string; result: Comparison }[]): string[] {
	const lines = pairs.map(({ name, result }) => {
		switch (result.kind) {
			case "identical":
				return `${name}  identical`;
			case "differ": {
				const span = ([first, last]: [number, number]) =>
					first === last ? px(first) : `${px(first)}–${px(last)}`;
				const rows =
					result.bands.length > MOST_BANDS
						? `${span([result.bands[0]![0], result.bands.at(-1)![1]])} in ${result.bands.length} bands`
						: result.bands.map(span).join(", ");
				return `${name}  ${px(result.pixels)} px differ in rows ${rows}`;
			}
			case "heights": {
				const same =
					result.sameRows === 0
						? "no row the same from the top"
						: `rows 0–${px(result.sameRows - 1)} the same`;
				return `${name}  ${px(result.before)} → ${px(result.after)} px high; ${same}`;
			}
		}
	});
	const identical = pairs.filter(({ result }) => result.kind === "identical").length;
	return [...lines, `${identical} of ${pairs.length} pairs identical`];
}

/**
 * A PNG's inflated image data without its filters (PNG specification §9): each row starts with its
 * filter type, then `width × bytesPerPixel` bytes. 8 bits a channel, not interlaced.
 */
export function unfilter(
	data: Uint8Array,
	width: number,
	height: number,
	bytesPerPixel: number,
): Uint8Array {
	const stride = width * bytesPerPixel;
	const out = new Uint8Array(stride * height);
	for (let y = 0; y < height; y++) {
		const type = data[y * (stride + 1)]!;
		const row = data.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		const at = y * stride;
		for (let x = 0; x < stride; x++) {
			const left = x >= bytesPerPixel ? out[at + x - bytesPerPixel]! : 0;
			const up = y > 0 ? out[at - stride + x]! : 0;
			const upLeft = y > 0 && x >= bytesPerPixel ? out[at - stride + x - bytesPerPixel]! : 0;
			let predictor = 0;
			if (type === 1) predictor = left;
			else if (type === 2) predictor = up;
			else if (type === 3) predictor = (left + up) >> 1;
			else if (type === 4) {
				const estimate = left + up - upLeft;
				const toLeft = Math.abs(estimate - left);
				const toUp = Math.abs(estimate - up);
				const toUpLeft = Math.abs(estimate - upLeft);
				predictor = toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft;
			}
			out[at + x] = (row[x]! + predictor) & 0xff;
		}
	}
	return out;
}

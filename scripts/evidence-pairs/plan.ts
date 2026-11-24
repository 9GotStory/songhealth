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

/** What a pair's comparison found, as a line gives it after the pair's name. */
function described(result: Comparison): string {
	switch (result.kind) {
		case "identical":
			return "identical";
		case "differ": {
			const span = ([first, last]: [number, number]) =>
				first === last ? px(first) : `${px(first)}–${px(last)}`;
			const rows =
				result.bands.length > MOST_BANDS
					? `${span([result.bands[0]![0], result.bands.at(-1)![1]])} in ${result.bands.length} bands`
					: result.bands.map(span).join(", ");
			return `${px(result.pixels)} px differ in rows ${rows}`;
		}
		case "heights": {
			const same =
				result.sameRows === 0
					? "no row the same from the top"
					: `rows 0–${px(result.sameRows - 1)} the same`;
			return `${px(result.before)} → ${px(result.after)} px high; ${same}`;
		}
	}
}

/** A line per pair, then how many pairs are identical. */
export function pairsReport(pairs: readonly { name: string; result: Comparison }[]): string[] {
	const lines = pairs.map(({ name, result }) => `${name}  ${described(result)}`);
	const identical = pairs.filter(({ result }) => result.kind === "identical").length;
	return [...lines, `${identical} of ${pairs.length} pairs identical`];
}

type Width = { width: string; result: Comparison };

/** A capture's case and width: its name without and with its "-<width>". */
function caseOf(name: string): [string, string] {
	const match = /^(.+)-(\d+)$/.exec(name);
	return match === null ? [name, ""] : [match[1]!, match[2]!];
}

/** The pairs by case; cases by name, widths widest first. */
function byCase(pairs: readonly { name: string; result: Comparison }[]): [string, Width[]][] {
	const cases = new Map<string, Width[]>();
	for (const { name, result } of pairs) {
		const [label, width] = caseOf(name);
		cases.set(label, [...(cases.get(label) ?? []), { width, result }]);
	}
	return [...cases]
		.sort(([one], [other]) => (one < other ? -1 : one > other ? 1 : 0))
		.map(([label, widths]) => [label, widths.sort((a, b) => Number(b.width) - Number(a.width))]);
}

const widthsLine = (widths: readonly Width[]) =>
	widths
		.map(({ width, result }) => (width === "" ? "" : `${width}: `) + described(result))
		.join("  |  ");

const alike = (widths: readonly Width[], kind: Comparison["kind"]) =>
	widths.every(({ result }) => result.kind === kind);

/**
 * The pairs by case, short enough for a record to quote whole (#421 retro item 1): the cases
 * identical at every width, then those that differ at every width at the same height, each group on
 * one line; then a line per other case with each width's comparison; then how many are identical.
 */
export function casesReport(pairs: readonly { name: string; result: Comparison }[]): string[] {
	const identical: string[] = [];
	const differing: string[] = [];
	const others: string[] = [];
	for (const [label, widths] of byCase(pairs)) {
		if (alike(widths, "identical")) identical.push(label);
		else if (alike(widths, "differ")) differing.push(label);
		else others.push(`${label}  ${widthsLine(widths)}`);
	}
	const group = (title: string, labels: string[]) =>
		labels.length === 0 ? [] : [`${title} (${labels.length}): ${labels.join(", ")}`];
	const count = pairs.filter(({ result }) => result.kind === "identical").length;
	return [
		...group("identical at every width", identical),
		...group("differ at every width, at the same height", differing),
		...others,
		`${count} of ${pairs.length} pairs identical`,
	];
}

/**
 * Each after image against the same name's on the newest earlier ticket's evidence branch that
 * holds it (#420 retro: a page an earlier ticket changed differs from the feature's before set), by
 * branch in the order they come, then by case: the cases identical at every width on one line, a
 * line per other case; then the images no branch holds, and how many are identical.
 */
export function againstReport(
	entries: readonly { name: string; ref?: string; result?: Comparison }[],
): string[] {
	const refs = new Map<string, { name: string; result: Comparison }[]>();
	const unheld = new Set<string>();
	for (const { name, ref, result } of entries) {
		if (ref === undefined || result === undefined) unheld.add(caseOf(name)[0]);
		else refs.set(ref, [...(refs.get(ref) ?? []), { name, result }]);
	}
	const lines: string[] = [];
	let held = 0;
	let same = 0;
	for (const [ref, pairs] of refs) {
		const identicalCases: string[] = [];
		const others: string[] = [];
		for (const [label, widths] of byCase(pairs)) {
			if (alike(widths, "identical")) identicalCases.push(label);
			else others.push(`${label} against ${ref}  ${widthsLine(widths)}`);
		}
		if (identicalCases.length > 0)
			lines.push(
				`identical to ${ref} at every width (${identicalCases.length}): ${identicalCases.join(", ")}`,
			);
		lines.push(...others);
		held += pairs.length;
		same += pairs.filter(({ result }) => result.kind === "identical").length;
	}
	if (unheld.size > 0) {
		const labels = [...unheld].sort();
		lines.push(`no earlier after image (${labels.length}): ${labels.join(", ")}`);
	}
	return [...lines, `${same} of ${held} after images identical to the earlier ticket's`];
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

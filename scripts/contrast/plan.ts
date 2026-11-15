// What scripts/measure-text-contrast.ts works out from its readings and from a fixtures module's
// captures, without a browser (#287 retro: each ticket found the lowest reading of each text by
// eye, and wrote a second fixture to read a page whose slug the first had made).

/** One reading: a text at a width, with its contrast ratio when the width showed and read it. */
export interface Reading {
	width: number;
	/** What names the text: its selector, or its tag and first words. */
	text: string;
	ratio?: number;
}

/** A text's lowest reading over the widths, and the widths that read it; none when no width did. */
export interface Lowest {
	text: string;
	lowest?: number;
	widths: number[];
}

/**
 * Each text's lowest ratio, to the two places a reading is printed with, and every width that read
 * it, in the order the texts and the widths first come.
 */
export function lowestReadings(readings: readonly Reading[]): Lowest[] {
	const byText = new Map<string, Lowest>();
	for (const { width, text, ratio } of readings) {
		const entry = byText.get(text) ?? { text, widths: [] };
		byText.set(text, entry);
		if (ratio === undefined) continue;
		const rounded = Math.round(ratio * 100) / 100;
		if (entry.lowest === undefined || rounded < entry.lowest) {
			entry.lowest = rounded;
			entry.widths = [width];
		} else if (rounded === entry.lowest) {
			entry.widths.push(width);
		}
	}
	return [...byText.values()];
}

/** "768", "768 and 320" or "1024, 768 and 320". */
function listed(widths: readonly number[]): string {
	const last = widths.at(-1);
	return widths.length < 2 ? `${last}` : `${widths.slice(0, -1).join(", ")} and ${last}`;
}

/** The lines the script prints after its readings: each text's lowest ratio and where. */
export function summaryLines(readings: readonly Reading[]): string[] {
	return lowestReadings(readings).map(({ text, lowest, widths }) =>
		lowest === undefined
			? `lowest  ${text}  not read at any width`
			: `lowest  ${text}  ${lowest.toFixed(2)}:1 at ${listed(widths)} px`,
	);
}

/** A page a fixtures module returns (scripts/capture-with-fixtures.ts `Capture`). */
type Capture = string | { name: string; path: string };

/**
 * The page of the first capture named `name`, or `name` and a width ("news-landscape" for
 * "news-landscape-1440"), without the width, selector or click its path ends in. A fixtures module
 * gives its pages synthetic slugs, so a page is asked for by its capture's name.
 */
export function fixturePath(captures: readonly Capture[], name: string): string {
	const named = captures.filter((capture) => typeof capture !== "string");
	const found = named.find(
		(capture) =>
			capture.name === name ||
			(capture.name.startsWith(`${name}-`) && /^\d+$/.test(capture.name.slice(name.length + 1))),
	);
	if (found === undefined) {
		throw new Error(`no capture named ${name}: ${named.map((capture) => capture.name).join(", ")}`);
	}
	return found.path.replace(/[@!].*$/, "");
}

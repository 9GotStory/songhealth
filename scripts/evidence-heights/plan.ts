// The table of page heights for a folder of screenshots (#287 retro: a hand-off's record held 45
// rows of heights typed from the capture scripts' output, one of them under another page's name).
//
// A screenshot is named [before-|after-]<page>-<width>.png, as scripts/capture-screenshots.mjs and
// scripts/capture-with-fixtures.ts name a full page at one width. A name without a width, such as
// a close-up's or one with the menu open, is left out.

/** A screenshot's file name and its height in pixels. */
export interface Screenshot {
	file: string;
	height: number;
}

const NAME = /^(?:(before|after)-)?(.+)-(\d+)\.png$/;
const STATES = ["before", "after", ""] as const;

/**
 * The Markdown table of each page's height at each width the folder holds, widest first: a row
 * for its before, its after, or its one capture, pages in the order of their names. No line when
 * no file is a page at a width.
 */
export function heightsTable(screenshots: readonly Screenshot[]): string[] {
	const pages = new Map<string, Map<string, Map<number, number>>>();
	const widths = new Set<number>();
	for (const { file, height } of screenshots) {
		const match = NAME.exec(file);
		if (match === null) continue;
		const [, state = "", page, width] = match;
		const states = pages.get(page!) ?? new Map<string, Map<number, number>>();
		pages.set(page!, states);
		const heights = states.get(state) ?? new Map<number, number>();
		states.set(state, heights);
		heights.set(Number(width), height);
		widths.add(Number(width));
	}
	if (pages.size === 0) return [];
	const columns = [...widths].sort((one, other) => other - one);
	const px = (value: number) => value.toLocaleString("en-US");
	const lines = [
		`| Page | | ${columns.map((width) => `${px(width)} px`).join(" | ")} |`,
		`| --- | --- | ${columns.map(() => "---:").join(" | ")} |`,
	];
	for (const page of [...pages.keys()].sort()) {
		let first = true;
		for (const state of STATES) {
			const heights = pages.get(page)!.get(state);
			if (heights === undefined) continue;
			const cells = columns.map((width) => {
				const height = heights.get(width);
				return height === undefined ? "" : px(height);
			});
			const row = [first ? `\`${page}\`` : "", state, ...cells].map((cell) =>
				cell === "" ? "" : ` ${cell}`,
			);
			lines.push(`|${row.join(" |")} |`);
			first = false;
		}
	}
	return lines;
}

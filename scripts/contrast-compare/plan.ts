// The comparisons a hand-off's record quotes in place of a "the same" or "the lowest" typed by hand
// (#397 retro item 2: the record said every run's closing lines equal its ticket's where 8 of 13
// did, the round's folded lines gathering more texts). Reads the outputs of
// scripts/measure-text-contrast.ts --all-text --fold: its per-width lines
// (`<width> px  <tag> "<words>"[ (<n>)]  <ratio>:1 (<area> px)`) and its closing `folded` lines
// (scripts/contrast/plan.ts foldedLines).

const FOLDED = /^folded {2}(\S+ "[^"]*") {2}(.+)$/;
const PER_WIDTH = /^(\d+ px) {2}(\S+ "[^"]*"(?: \(\d+\))?) {2}(.+?)(?: \(\d+ px\))?$/;
const RATIO = /^(\d+\.\d+):1 (at .+)$/;

/** A per-width reading's width, tag and words, without the "(n)" of a repeated text. */
const unnumbered = (reading: string) => reading.replace(/ \(\d+\)$/, "");

/** Each line a pattern matches, keyed by its groups but the last (joined), valued by the last. */
function linesOf(text: string, pattern: RegExp): Map<string, string> {
	const lines = new Map<string, string>();
	for (const line of text.split("\n")) {
		const match = pattern.exec(line);
		if (match === null) continue;
		const groups = match.slice(1);
		lines.set(groups.slice(0, -1).join(" "), groups.at(-1)!);
	}
	return lines;
}

/**
 * A ticket's output against the round's of the same page: each folded line that differs, is
 * missing from the round or is the round's alone, then how many are the same; each per-width
 * reading of the ticket's the round lacks at that width and ratio, then how many it holds.
 */
export function compareOutputs(ticket: string, round: string): string[] {
	const lines: string[] = [];
	const ticketFolded = linesOf(ticket, FOLDED);
	const roundFolded = linesOf(round, FOLDED);
	let same = 0;
	for (const [text, value] of ticketFolded) {
		const now = roundFolded.get(text);
		if (now === value) same++;
		else if (now === undefined) lines.push(`not in the round: ${text}  ${value}`);
		else lines.push(`differs: ${text}  ticket ${value}  |  round ${now}`);
	}
	for (const [text, value] of roundFolded) {
		if (!ticketFolded.has(text)) lines.push(`round only: ${text}  ${value}`);
	}
	lines.push(`${same} of ${ticketFolded.size} of the ticket's folded lines the same`);

	// A per-width line's "(n)" counts the texts of the same words within the container a run read,
	// so a ticket that read one card numbers them otherwise than a round that reads all of `main`:
	// a ticket's reading is held when the round reads the same words at the same width and ratio.
	const ticketReadings = linesOf(ticket, PER_WIDTH);
	const roundRatios = new Map<string, Set<string>>();
	for (const [reading, ratio] of linesOf(round, PER_WIDTH)) {
		const words = unnumbered(reading);
		roundRatios.set(words, (roundRatios.get(words) ?? new Set()).add(ratio));
	}
	let held = 0;
	for (const [reading, ratio] of ticketReadings) {
		const ratios = roundRatios.get(unnumbered(reading));
		if (ratios?.has(ratio)) held++;
		else
			lines.push(
				`per-width: ${reading}  ticket ${ratio}  |  ${ratios === undefined ? "not in the round" : `round ${[...ratios].join(", ")}`}`,
			);
	}
	lines.push(
		`${held} of ${ticketReadings.size} of the ticket's per-width readings in the round at the same width and ratio`,
	);
	return lines;
}

/** An output's file name and its text. */
export interface Output {
	name: string;
	text: string;
}

/**
 * The `count` lowest folded readings across the outputs, lowest first (ties in the outputs'
 * order), each with its output's name; before them, every text no width read.
 */
export function lowestFolded(outputs: readonly Output[], count: number): string[] {
	const unread: string[] = [];
	const readings: { ratio: number; line: string }[] = [];
	for (const { name, text } of outputs) {
		for (const [words, value] of linesOf(text, FOLDED)) {
			const match = RATIO.exec(value);
			if (match === null) unread.push(`not read: ${name}  ${words}`);
			else
				readings.push({
					ratio: Number(match[1]),
					line: `${match[1]}:1  ${name}  ${words}  ${match[2]}`,
				});
		}
	}
	readings.sort((one, other) => one.ratio - other.ratio);
	return [...unread, ...readings.slice(0, count).map(({ line }) => line)];
}

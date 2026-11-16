// A reporter that names the failed tests which left assertions unrun (#298 retro).
//
// A new test's red run must exercise the assertions that already hold before the change, so the
// one the change creates comes last, and a loop over cases is read whole before it is judged
// (CODING_STANDARDS "Tests"). A test written the other way fails at its first new assertion and
// hides a wrong one after it until review: #195, #198 and #298 each did. After the run this prints
// each failed test that had assertions after its failing line, or that failed inside a loop, whose
// later cases did not run. In a red run the list is what to reorder; when a test that used to pass
// fails, it only says how much of the test the failure hid. It never changes the run's result.
//
// It reads the test's own file as Prettier leaves it: a test ends at the first line that closes a
// block at the indentation of its `test(` line without opening another, so a header broken over
// lines, whose `}) => {` opens the body, is read past (#329), and the blocks around a line are the
// lines above it with less indentation.

import { readFileSync } from "node:fs";

import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/** A call of `expect`, or of a helper named after what it expects, such as expectCrop. */
const ASSERTION = /\bexpect\w*(?:\.\w+)*\(/;

/** A line that opens a loop. */
const LOOP = /^\s*(?:for\s*(?:await\s*)?\(|while\s*\()|\.forEach\(/;

const indentOf = (line: string) => /^\s*/.exec(line)![0].length;
const isComment = (line: string) => /^\s*(?:\/\/|\/?\*)/.test(line);
const closesBlock = (line: string) => /^\s*[\])}]/.test(line);
const opensBlock = (line: string) => /[[({]\s*$/.test(line);

/**
 * What the test at `testLine` of `source` left unrun when it failed at `failedLine`, both counted
 * from 1: how many of its lines after that one hold an assertion, and whether the line is inside
 * a loop. Undefined when the line is outside the test, as a hook's is.
 */
export function stoppedShort(
	source: string,
	testLine: number,
	failedLine: number,
): { after: number; inLoop: boolean } | undefined {
	const lines = source.split("\n");
	const start = testLine - 1;
	const failed = failedLine - 1;
	const indent = indentOf(lines[start] ?? "");
	const closing = lines.findIndex(
		(line, index) =>
			index > start && indentOf(line) === indent && closesBlock(line) && !opensBlock(line),
	);
	const end = closing === -1 ? lines.length - 1 : closing;
	if (failed <= start || failed >= end) return undefined;

	const after = lines
		.slice(failed + 1, end)
		.filter((line) => !isComment(line) && ASSERTION.test(line)).length;

	// The blocks around the failing line, innermost first: each line above it with less indentation
	// than the last one found. A head that runs over several lines ends on a line that closes a
	// bracket, so the line that opened it, at the same indentation, is read in its place.
	let inLoop = false;
	let depth = indentOf(lines[failed]!);
	for (let index = failed - 1; index > start && depth > indent && !inLoop; index -= 1) {
		const line = lines[index]!;
		if (line.trim() === "" || indentOf(line) >= depth) continue;
		depth = indentOf(line);
		let head = index;
		while (head > start && (closesBlock(lines[head]!) || indentOf(lines[head]!) !== depth)) {
			head -= 1;
		}
		inLoop = LOOP.test(lines[head]!);
	}
	return { after, inLoop };
}

/**
 * The lines of `file` that `result`'s error passed through, innermost first: its stack's frames in
 * that file, so a helper declared above the test comes before the test's own line that called it.
 */
function failedLinesIn(file: string, result: TestResult): number[] {
	const error = result.errors[0];
	const frames = (error?.stack ?? "")
		.split("\n")
		.filter((line) => line.includes(`${file}:`))
		.map((line) => Number(/:(\d+):\d+\)?\s*$/.exec(line)?.[1]))
		.filter((line) => !Number.isNaN(line));
	return error?.location?.file === file ? [...frames, error.location.line] : frames;
}

export default class StoppedShortReporter implements Reporter {
	/** What each failed test left unrun, by the test's id, so a retry is named once. */
	private readonly stopped = new Map<string, string>();

	onTestEnd(test: TestCase, result: TestResult): void {
		if (result.status !== "failed") return;
		const { file, line } = test.location;
		let source: string;
		try {
			source = readFileSync(file, "utf8");
		} catch {
			return;
		}
		// The first of the error's lines that lies inside the test.
		const failedLine = failedLinesIn(file, result).find(
			(failed) => stoppedShort(source, line, failed) !== undefined,
		);
		const left = failedLine === undefined ? undefined : stoppedShort(source, line, failedLine);
		if (left === undefined || (left.after === 0 && !left.inLoop)) return;
		const parts = [
			left.after > 0 &&
				`${left.after} line${left.after === 1 ? "" : "s"} with an assertion after it`,
			left.inLoop && "inside a loop, whose later cases did not run",
		].filter(Boolean);
		this.stopped.set(
			test.id,
			`  failed at line ${failedLine}: ${parts.join(", and ")}\n      ${test.titlePath().slice(2).join(" › ")}`,
		);
	}

	onEnd(): void {
		if (this.stopped.size === 0) return;
		console.log(
			'\nstopped short (in a red run, judge what the change creates last: CODING_STANDARDS "Tests"):',
		);
		for (const entry of this.stopped.values()) console.log(entry);
	}
}

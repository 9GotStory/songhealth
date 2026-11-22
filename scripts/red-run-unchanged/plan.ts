// The fields a red run already passes (#394 retro): scripts/red-run-unchanged.ts feeds it a
// Playwright run's output. A combined `toEqual` that fails prints a diff where `-` marks the
// expected side, `+` the received one, and an unmarked line is a value both share: a field the
// base already gives. Each such field is either behaviour the ticket keeps or a read that cannot
// fail (#315 and #394 retros: the Spec reviewer found `facts.inside`, true on the old page too).

/** A failed test and each field its deep-equality diffs leave unmarked. */
export interface Failure {
	test: string;
	/** The suite's path and the test's line. */
	at: string;
	/** The first `Error:` line's text, such as the assertion's message. */
	message: string;
	/** `path: value`, the path's keys joined by "." and an array's element written "[]". */
	fields: string[];
}

/** One open object or array of a diff, on the expected side. */
interface Level {
	key?: string;
	array: boolean;
}

const HEADER = /^\s*\d+\) \[[^\]]+\] › (\S+?):(\d+):\d+ › (.+?)(?:\s+─+)?$/;
const OPENER = /^(?:"([^"]+)": )?(?:[A-Za-z]+ )?([{[])$/;
const CLOSER = /^[}\]],?$/;
const LEAF = /^(?:"([^"]+)": )?(.+?),?$/;
/** What stands for the keys above a hunk's first line, which the diff leaves out. */
const UNKNOWN = "…";

/** Where a value sits: the keys of its levels, then its own key or "[]" in an array. */
function pathOf(levels: Level[], key: string | undefined): string {
	let path = "";
	const join = (part: string) => {
		path = part === "[]" || path === "" ? `${path}${part}` : `${path}.${part}`;
	};
	levels.forEach((level, index) => {
		if (level.key !== undefined) join(level.key);
		else if (levels[index - 1]?.array) join("[]");
	});
	if (key !== undefined) join(key);
	else if (levels.at(-1)?.array) join("[]");
	return path;
}

/** Each failed test of a Playwright run's output with the fields its diffs leave unmarked. */
export function unchangedFields(text: string): Failure[] {
	const failures: Failure[] = [];
	let failure: Failure | undefined;
	let indent: string | undefined;
	let inBody = false;
	let levels: Level[] = [];

	for (const line of text.split("\n")) {
		const header = HEADER.exec(line);
		if (header) {
			failure = { test: header[3], at: `${header[1]}:${header[2]}`, message: "", fields: [] };
			failures.push(failure);
			indent = undefined;
			continue;
		}
		if (!failure) continue;
		if (indent === undefined) {
			const error = /^\s*Error: (.*)$/.exec(line);
			if (error && failure.message === "") failure.message = error[1];
			const expected = /^(\s*)- Expected\b/.exec(line);
			if (expected) {
				indent = expected[1];
				inBody = false;
				levels = [];
			}
			continue;
		}
		if (!inBody && (line.trim() === "" || line.trim().startsWith("+ Received"))) continue;
		if (line.trim() === "" || !line.startsWith(indent)) {
			indent = undefined;
			continue;
		}
		inBody = true;
		const rest = line.slice(indent.length);
		const hunk = /^@@ -(\d+)/.exec(rest);
		if (hunk) {
			levels = hunk[1] === "1" ? [] : [{ key: UNKNOWN, array: false }];
			continue;
		}
		const marker = rest[0];
		if (marker === "+") continue;
		const content = rest.slice(1).trim();
		const opener = OPENER.exec(content);
		if (opener) {
			levels.push({ key: opener[1], array: opener[2] === "[" });
			continue;
		}
		if (CLOSER.test(content)) {
			if (levels.length > 1 || levels[0]?.key !== UNKNOWN) levels.pop();
			continue;
		}
		if (marker !== " ") continue;
		const leaf = LEAF.exec(content);
		if (leaf) failure.fields.push(`${pathOf(levels, leaf[1])}: ${leaf[2]}`);
	}
	return failures;
}

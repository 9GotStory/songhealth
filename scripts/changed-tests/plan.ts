// The browser cases a change edits (#418 retro), for the evidence round's `--repeat-each 3`:
// scripts/changed-tests.ts feeds it `git diff -U0`'s text and the spec files' text. No runtime
// imports, so tests/node/changed-tests.test.ts reads it directly.

/** Lines a hunk holds on the new side; a pure deletion holds the line it follows. */
export interface Hunk {
	path: string;
	from: number;
	to: number;
}

export interface SpecFile {
	path: string;
	text: string;
}

/** Each hunk of a `git diff -U0` text, on the new side; a deleted file has none. */
export function hunksOf(diff: string): Hunk[] {
	const hunks: Hunk[] = [];
	let path: string | undefined;
	for (const line of diff.split("\n")) {
		if (line.startsWith("+++ ")) {
			path = line.startsWith("+++ b/") ? line.slice("+++ b/".length) : undefined;
			continue;
		}
		const header = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
		if (header === null || path === undefined) continue;
		const from = Number(header[1]);
		const count = header[2] === undefined ? 1 : Number(header[2]);
		hunks.push(count === 0 ? { path, from, to: from } : { path, from, to: from + count - 1 });
	}
	return hunks;
}

/**
 * Each case of a spec file: from its `test(` line (`test.skip(` and the like too, not
 * `test.describe(` or a hook) to the `});` at that line's indent, both 1-based.
 */
export function testSpans(text: string): { line: number; end: number }[] {
	const lines = text.split("\n");
	const spans: { line: number; end: number }[] = [];
	lines.forEach((line, index) => {
		const opening = /^(\s*)test(?:\.(?:only|skip|fixme|fail))?\(/.exec(line);
		if (opening === null) return;
		const indent = opening[1]!;
		if (/\}\);?\s*$/.test(line) && !line.trimEnd().endsWith("{")) {
			spans.push({ line: index + 1, end: index + 1 });
			return;
		}
		const close = lines.findIndex((later, at) => at > index && later === `${indent}});`);
		spans.push({ line: index + 1, end: close === -1 ? lines.length : close + 1 });
	});
	return spans;
}

/**
 * Lines that change no case's behaviour: blank, comment and import lines (an import's whole
 * statement, from `import` to its `;`), as 1-based line numbers.
 */
function inertLines(lines: string[]): Set<number> {
	const inert = new Set<number>();
	let inImport = false;
	lines.forEach((line, index) => {
		if (/^import\b/.test(line)) inImport = true;
		if (inImport || /^\s*$/.test(line) || /^\s*(?:\/\/|\/\*|\*)/.test(line)) inert.add(index + 1);
		if (inImport && line.trimEnd().endsWith(";")) inImport = false;
	});
	return inert;
}

/** The name of the top-level function or const whose declaration is the nearest above `line`. */
function declarationAbove(lines: string[], line: number): string | undefined {
	for (let at = line - 1; at >= 0; at--) {
		const text = lines[at]!;
		if (/^(?:test|describe)\b/.test(text)) return undefined;
		const name = /^(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=)/.exec(text);
		if (name !== null) return name[1] ?? name[2];
	}
	return undefined;
}

/**
 * The cases the hunks fall in, once each as `file:line` in file and line order. A changed line
 * in a spec file's own top-level function or const brings in each case of that file that calls it
 * by name (one level); blank, comment and import lines bring in none. For each hunk with another
 * line outside every case, that hunk's first such line; and each changed browser-test file that
 * is not a spec (a helper), whose callers only the full suite runs.
 */
export function changedTests(hunks: Hunk[], specs: SpecFile[]) {
	const files = new Map(
		specs.map((spec) => {
			const lines = spec.text.split("\n");
			return [spec.path, { lines, spans: testSpans(spec.text), inert: inertLines(lines) }];
		}),
	);
	const tests = new Set<string>();
	const outside: string[] = [];
	const helpers = new Set<string>();
	for (const hunk of hunks) {
		const file = files.get(hunk.path);
		if (file === undefined) {
			helpers.add(hunk.path);
			continue;
		}
		let firstOutside: number | undefined;
		for (let line = hunk.from; line <= hunk.to; line++) {
			const span = file.spans.find((each) => each.line <= line && line <= each.end);
			if (span !== undefined) {
				tests.add(`${hunk.path}:${span.line}`);
				continue;
			}
			if (file.inert.has(line)) continue;
			const name = declarationAbove(file.lines, line);
			const callers =
				name === undefined
					? []
					: file.spans.filter((each) =>
							file.lines
								.slice(each.line - 1, each.end)
								.some((text) => new RegExp(`\\b${name}\\(`).test(text)),
						);
			if (callers.length === 0) firstOutside ??= line;
			for (const caller of callers) tests.add(`${hunk.path}:${caller.line}`);
		}
		if (firstOutside !== undefined) outside.push(`${hunk.path}:${firstOutside}`);
	}
	const keyOf = (key: string) => {
		const colon = key.lastIndexOf(":");
		return { path: key.slice(0, colon), line: Number(key.slice(colon + 1)) };
	};
	const sorted = [...tests].sort((a, b) => {
		const [x, y] = [keyOf(a), keyOf(b)];
		return x.path === y.path ? x.line - y.line : x.path < y.path ? -1 : 1;
	});
	return { tests: sorted, outside, helpers: [...helpers] };
}

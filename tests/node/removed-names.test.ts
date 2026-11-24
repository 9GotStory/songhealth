// A removed component's name, still cited (#368 retro item 2).
//
// When a commit removes a file under src/ whose name is a component's, such as DocumentRow.astro,
// a comment, a test or a rule that still names it reads as the current answer: #368 removed
// DocumentRow and DocumentFacts.astro still said that it shows the facts line, which only the
// review caught. tests/node/cited-source-paths.test.ts reads cited paths, not a bare name. Each
// name the staged commit removes (a rename counts) must be gone, as a word, from src/, tests/,
// scripts/, CODING_STANDARDS.md and docs/design/DESIGN.md before its §13, where the change history
// keeps it. The pre-commit hook runs this; with nothing staged, as in CI, there is nothing to
// check.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { basename, extname } from "node:path";
import { it } from "node:test";

const ROOT = new URL("../../", import.meta.url);

const DESIGN = "docs/design/DESIGN.md";

/** The places a removed name must be gone from. */
const PLACES = ["src", "tests", "scripts", "CODING_STANDARDS.md", DESIGN];

/** A component's file name: a capital letter, then letters and digits. */
const COMPONENT = /^[A-Z][A-Za-z0-9]+$/;

function git(args: string[]): string {
	return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
}

/** The component names of the files under src/ the staged commit removes. */
function removedNames(): string[] {
	return git(["diff", "--cached", "--no-renames", "--name-only", "--diff-filter=D", "--", "src"])
		.split("\n")
		.filter(Boolean)
		.map((file) => basename(file, extname(file)))
		.filter((name) => COMPONENT.test(name));
}

/** The line DESIGN.md's change history (§13) starts on, in the staged text. */
function historyLine(): number {
	const lines = git(["show", `:${DESIGN}`]).split("\n");
	const at = lines.findIndex((line) => line.startsWith("## 13."));
	return at === -1 ? Infinity : at + 1;
}

it("a component the staged commit removes is no longer named outside DESIGN.md's change history", () => {
	const names = removedNames();
	if (names.length === 0) return;
	const history = historyLine();
	const cited: string[] = [];
	for (const name of names) {
		let found = "";
		try {
			found = git(["grep", "--cached", "-n", "-w", name, "--", ...PLACES]);
		} catch {
			// git grep exits 1 when nothing matches.
		}
		for (const hit of found.split("\n").filter(Boolean)) {
			const [file, line] = hit.split(":");
			if (file === DESIGN && Number(line) >= history) continue;
			cited.push(hit);
		}
	}
	// The message says where the name may go, so a ticket that asks for "X is gone" in a section is
	// met in §13's entry, never with a new claim in that section (#433 retro).
	assert.deepEqual(
		cited,
		[],
		"a removed component still named: name it only in DESIGN.md §13's entry, and state what holds now elsewhere",
	);
});

// The browser cases a change edits, and the command that runs each three times (#418 retro;
// scripts/changed-tests/plan.ts).
//
//   node scripts/changed-tests.ts <base>
//
// It reads `git diff -U0 <base> -- tests/browser`, committed or not, and prints each case whose
// lines the diff touches as file:line, then each changed line outside every case and each changed
// helper file, whose callers the full suite runs, then the `--repeat-each 3` command for the
// evidence round. Read-only.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { changedTests, hunksOf } from "./changed-tests/plan.ts";

const base = process.argv[2];
if (base === undefined) {
	console.error("usage: node scripts/changed-tests.ts <base>");
	process.exit(2);
}

const hunks = hunksOf(
	execFileSync("git", ["diff", "-U0", base, "--", "tests/browser"], { encoding: "utf8" }),
);
const specs = [...new Set(hunks.map((hunk) => hunk.path))]
	.filter((path) => path.endsWith(".spec.ts") && existsSync(path))
	.map((path) => ({ path, text: readFileSync(path, "utf8") }));

const { tests, outside, helpers } = changedTests(hunks, specs);
for (const test of tests) console.log(test);
for (const line of outside) console.log(`changed outside every case: ${line}`);
for (const path of helpers)
	console.log(`changed helper, its callers run in the full suite: ${path}`);
if (tests.length > 0) {
	console.log(`\n${tests.length} cases`);
	console.log(`scripts/dev-runtime-env.sh npx playwright test ${tests.join(" ")} --repeat-each 3`);
}

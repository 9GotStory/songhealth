// The browser suites that read what a change touches, and the command that runs them (#339 retro;
// scripts/suites-for-change/plan.ts).
//
//   node scripts/suites-for-change.ts <base>
//
// It reads the paths `git diff --name-only <base>` lists, committed or not, and prints each suite
// under tests/browser/ that names the address of a changed page, or of a page that imports a
// changed component or layout, with its reasons; then the changed source files that bring in no
// suite, to read by hand (a style sheet, a helper, a library module); then the Playwright command.
// Read-only.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { suitesFor, type SourceFile } from "./suites-for-change/plan.ts";

const base = process.argv[2];
if (base === undefined) {
	console.error("usage: node scripts/suites-for-change.ts <base>");
	process.exit(2);
}

const changed = execFileSync("git", ["diff", "--name-only", base], { encoding: "utf8" })
	.split("\n")
	.filter(Boolean);

/** Every file under `dir` whose name `keep` accepts, with its text. */
function filesUnder(dir: string, keep: (name: string) => boolean): SourceFile[] {
	return readdirSync(dir, { recursive: true, encoding: "utf8" })
		.filter(keep)
		.map((name) => join(dir, name))
		.map((path) => ({ path, text: readFileSync(path, "utf8") }));
}

const { suites, unmatched } = suitesFor(
	changed,
	filesUnder("src", (name) => /\.(astro|ts)$/.test(name)),
	filesUnder("tests/browser", (name) => name.endsWith(".spec.ts")),
);
for (const suite of suites) console.log(`${suite.path}: ${suite.because.join(", ")}`);
for (const path of unmatched) console.log(`no suite names a page of ${path}: read by hand`);
if (suites.length > 0) {
	const all = filesUnder("tests/browser", (name) => name.endsWith(".spec.ts")).length;
	console.log(`\n${suites.length} of ${all} suites`);
	console.log(
		`scripts/dev-runtime-env.sh npx playwright test ${suites.map((suite) => suite.path).join(" ")}`,
	);
}

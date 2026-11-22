// The fields a red run already passes (#394 retro; scripts/red-run-unchanged/plan.ts).
//
//   node scripts/red-run-unchanged.ts <run output>
//
// It reads a Playwright run's saved output and prints, for each failed test, every field its
// combined `toEqual` diffs leave unmarked: a value the old runtime already gives. The ticket's
// table says of each one either that the ticket keeps that behaviour or which read replaced one
// that could not fail. A test with no such diff prints "no deep-equality diff". Read-only.

import { readFileSync } from "node:fs";

import { unchangedFields } from "./red-run-unchanged/plan.ts";

const file = process.argv[2];
if (file === undefined) {
	console.error("usage: node scripts/red-run-unchanged.ts <run output>");
	process.exit(2);
}

const failures = unchangedFields(readFileSync(file, "utf8"));
for (const { test, at, message, fields } of failures) {
	console.log(`${at} › ${test}${message === "" ? "" : `\n  ${message}`}`);
	if (fields.length === 0) console.log("  no deep-equality diff");
	for (const field of fields) console.log(`  ${field}`);
}
console.log(`\n${failures.length} failed tests`);

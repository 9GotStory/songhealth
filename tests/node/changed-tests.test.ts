// The browser cases a change edits (#418 retro): scripts/changed-tests/plan.ts, which
// scripts/changed-tests.ts feeds `git diff -U0`'s text and the spec files' text.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { changedTests, hunksOf, testSpans } from "../../scripts/changed-tests/plan.ts";

const SPEC = [
	'import { test } from "./public.helpers";', // 1
	"", // 2
	'test("the first case", async ({ page }) => {', // 3
	"\tawait page.goto('/');", // 4
	"});", // 5
	"", // 6
	"function helper() {", // 7
	"\treturn 1;", // 8
	"}", // 9
	"", // 10
	'test.describe("a group", () => {', // 11
	'\ttest("the second case", async () => {', // 12
	"\t\texpect(helper()).toBe(1);", // 13
	"\t});", // 14
	"", // 15
	'\ttest.skip("a skipped case", async () => {});', // 16
	"});", // 17
].join("\n");

describe("hunksOf", () => {
	it("reads each hunk's lines on the new side, a deletion as the line it follows", () => {
		const diff = [
			"diff --git a/tests/browser/a.spec.ts b/tests/browser/a.spec.ts",
			"--- a/tests/browser/a.spec.ts",
			"+++ b/tests/browser/a.spec.ts",
			"@@ -4 +4 @@ test(",
			"@@ -10,2 +12,3 @@",
			"@@ -20,3 +22,0 @@",
			"diff --git a/tests/browser/gone.spec.ts b/tests/browser/gone.spec.ts",
			"--- a/tests/browser/gone.spec.ts",
			"+++ /dev/null",
			"@@ -1,9 +0,0 @@",
		].join("\n");
		assert.deepEqual(hunksOf(diff), [
			{ path: "tests/browser/a.spec.ts", from: 4, to: 4 },
			{ path: "tests/browser/a.spec.ts", from: 12, to: 14 },
			{ path: "tests/browser/a.spec.ts", from: 22, to: 22 },
		]);
	});
});

describe("testSpans", () => {
	it("spans each case from its test( line to the }); at its indent, inside a describe too", () => {
		assert.deepEqual(testSpans(SPEC), [
			{ line: 3, end: 5 },
			{ line: 12, end: 14 },
			{ line: 16, end: 16 },
		]);
	});
});

describe("changedTests", () => {
	const specs = [{ path: "tests/browser/a.spec.ts", text: SPEC }];

	it("names each case a hunk falls in once, by file:line, and the lines outside every case", () => {
		const result = changedTests(
			[
				{ path: "tests/browser/a.spec.ts", from: 4, to: 4 },
				{ path: "tests/browser/a.spec.ts", from: 13, to: 13 },
				{ path: "tests/browser/a.spec.ts", from: 12, to: 12 },
				{ path: "tests/browser/a.spec.ts", from: 8, to: 8 },
			],
			specs,
		);
		assert.deepEqual(result, {
			tests: ["tests/browser/a.spec.ts:3", "tests/browser/a.spec.ts:12"],
			outside: [],
			helpers: [],
		});
	});

	it("brings in the cases that call a changed top-level function, and none for an import, comment or blank line", () => {
		const text = [
			"import {", // 1
			"\ttest,", // 2
			'} from "./public.helpers";', // 3
			"", // 4
			"// a note", // 5
			"const unused = () => 2;", // 6
			"function helper() {", // 7
			"\treturn 1;", // 8
			"}", // 9
			'test("calls it", async () => {', // 10
			"\texpect(helper()).toBe(1);", // 11
			"});", // 12
			'test("does not", async () => {});', // 13
		].join("\n");
		const result = changedTests(
			[
				{ path: "tests/browser/b.spec.ts", from: 2, to: 5 },
				{ path: "tests/browser/b.spec.ts", from: 8, to: 8 },
				{ path: "tests/browser/b.spec.ts", from: 6, to: 6 },
			],
			[{ path: "tests/browser/b.spec.ts", text }],
		);
		assert.deepEqual(result, {
			tests: ["tests/browser/b.spec.ts:10"],
			outside: ["tests/browser/b.spec.ts:6"],
			helpers: [],
		});
	});

	it("names a hunk that spans two cases in both (its helper's lines bring in the caller; the describe's line is outside), and a changed helper file apart", () => {
		const result = changedTests(
			[
				{ path: "tests/browser/a.spec.ts", from: 5, to: 12 },
				{ path: "tests/browser/public.helpers.ts", from: 40, to: 41 },
			],
			specs,
		);
		assert.deepEqual(result, {
			tests: ["tests/browser/a.spec.ts:3", "tests/browser/a.spec.ts:12"],
			outside: ["tests/browser/a.spec.ts:11"],
			helpers: ["tests/browser/public.helpers.ts"],
		});
	});
});

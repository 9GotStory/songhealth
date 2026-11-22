// The fields a red run already passes (#394 retro): scripts/red-run-unchanged/plan.ts, which
// scripts/red-run-unchanged.ts feeds a Playwright run's output.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { unchangedFields } from "../../scripts/red-run-unchanged/plan.ts";

/** A failure as the list reporter prints it, its lines indented by four spaces. */
const failure = (diff: string[], title = "a row is white") =>
	[
		`  5) [chromium] › tests/browser/public-x.spec.ts:911:1 › ${title} ─────────────`,
		"",
		"    Error: the row's look",
		"",
		"    expect(received).toEqual(expected) // deep equality",
		"",
		"    - Expected  - 9",
		"    + Received  + 3",
		"",
		...diff.map((line) => `    ${line}`),
		"",
		"      906 |   expect(seen).toEqual(expected);",
		"        at /x/tests/browser/public-x.spec.ts:908:49",
		"",
	].join("\n");

describe("unchangedFields", () => {
	it("lists each leaf the diff leaves unmarked, with its path, and none it marks", () => {
		const text = failure([
			"  Object {",
			'    "1440": Object {',
			'-     "arrow": Object {',
			'-       "size": 20,',
			"-     },",
			'+     "arrow": "none",',
			'      "facts": Object {',
			'        "inside": true,',
			'-       "under": 4,',
			'+       "under": 8,',
			'        "weight": "400",',
			"      },",
			'      "links": 1,',
			"    },",
			"  }",
		]);
		assert.deepEqual(unchangedFields(text), [
			{
				test: "a row is white",
				at: "tests/browser/public-x.spec.ts:911",
				message: "the row's look",
				fields: ["1440.facts.inside: true", '1440.facts.weight: "400"', "1440.links: 1"],
			},
		]);
	});

	it("follows the expected side's nesting, so a received-only object moves no path", () => {
		const text = failure([
			"  Object {",
			'+   "tile": Object {',
			'+     "size": 68,',
			"+   },",
			'-   "tile": "missing",',
			'    "title": 16,',
			"  }",
		]);
		assert.deepEqual(unchangedFields(text)[0].fields, ["title: 16"]);
	});

	it("names an unmarked array element by its array, and an empty array as a leaf", () => {
		const text = failure([
			"  Object {",
			'    "gaps": Array [',
			"      22,",
			"-     22,",
			"    ],",
			'    "list": Array [],',
			"  }",
		]);
		assert.deepEqual(unchangedFields(text)[0].fields, ["gaps[]: 22", "list: Array []"]);
	});

	it("marks the path it cannot know after a hunk's header with …", () => {
		const text = failure([
			"@@ -20,6 +20,6 @@",
			'        "colour": "red",',
			"      },",
			'      "links": 1,',
			"@@ -40,4 +40,4 @@",
			'        "size": 13,',
		]);
		assert.deepEqual(unchangedFields(text)[0].fields, [
			'….colour: "red"',
			"….links: 1",
			"….size: 13",
		]);
	});

	it("knows the path under a hunk that starts at the diff's first line", () => {
		const text = failure([
			"@@ -1,6 +1,6 @@",
			"  Object {",
			'    "1440": Object {',
			'      "links": 1,',
		]);
		assert.deepEqual(unchangedFields(text)[0].fields, ["1440.links: 1"]);
	});

	it("reads every failure of the run, and gives one without a deep-equality diff no fields", () => {
		const visible = [
			"  1) [chromium] › tests/browser/public-x.spec.ts:40:1 › the label shows ──────",
			"",
			"    Error: expect(locator).toBeVisible() failed",
			"",
		].join("\n");
		const text = [
			"Running 3 tests using 1 worker",
			"  ✘  1 [chromium] › tests/browser/public-x.spec.ts:40:1 › the label shows (5.0s)",
			"",
			visible,
			failure(["  Object {", '    "links": 1,', "  }"], "the second"),
			"  2 failed",
		].join("\n");
		assert.deepEqual(
			unchangedFields(text).map(({ test, fields }) => ({ test, fields })),
			[
				{ test: "the label shows", fields: [] },
				{ test: "the second", fields: ["links: 1"] },
			],
		);
	});
});

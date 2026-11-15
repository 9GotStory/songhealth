// What a failed browser test left unrun (#298 retro; CODING_STANDARDS "Tests").
//
// A red run must exercise the assertions that already hold, so a new test judges what the change
// creates last and outside a loop over cases. tests/browser/stopped-short-reporter.ts prints, for
// each failed test, how many assertions after the failing line never ran and whether it failed
// inside a loop. These cases give its reading of a test's source lines.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stoppedShort } from "../browser/stopped-short-reporter.ts";

/** A suite's source, as Prettier leaves it, with tabs; its lines count from 1. */
const SUITE = [
	/*  1 */ "test.beforeAll(async () => {",
	/*  2 */ "\texpect(await uploaded()).toBe(true);",
	/*  3 */ "});",
	/*  4 */ "",
	/*  5 */ 'test("a card shows its picture", async ({ page }) => {',
	/*  6 */ '\tawait page.goto("/");',
	/*  7 */ "\tawait expect(card).toHaveCount(1);",
	/*  8 */ '\tawait expectCrop(picture, "25% 75%", "with a focal point");',
	/*  9 */ "\t// expect(nothing) in a comment is not an assertion",
	/* 10 */ "\tawait expect(summary).toBeVisible();",
	/* 11 */ "\texpect(",
	/* 12 */ "\t\tawait rows(page),",
	/* 13 */ "\t).toEqual([3]);",
	/* 14 */ "});",
	/* 15 */ "",
	/* 16 */ 'test.describe("at each width", () => {',
	/* 17 */ '\ttest("the rows", async ({ page }) => {',
	/* 18 */ "\t\tfor (const width of WIDTHS) {",
	/* 19 */ "\t\t\tawait page.setViewportSize({ width, height: 900 });",
	/* 20 */ "\t\t\texpect(await rows(page), `at ${width} px`).toEqual([3]);",
	/* 21 */ "\t\t}",
	/* 22 */ "\t\tfor (const [width, rows] of [",
	/* 23 */ "\t\t\t[1440, [4]],",
	/* 24 */ "\t\t\t[375, [1]],",
	/* 25 */ "\t\t] as const) {",
	/* 26 */ "\t\t\tif (width < 640) {",
	/* 27 */ "\t\t\t\tawait expect(date).toBeHidden();",
	/* 28 */ "\t\t\t}",
	/* 29 */ "\t\t}",
	/* 30 */ "\t\tawait expectNoHorizontalScroll(page);",
	/* 31 */ "\t});",
	/* 32 */ "",
	/* 33 */ '\ttest("the next test", async ({ page }) => {',
	/* 34 */ "\t\tawait expect(page).toHaveURL(HOME);",
	/* 35 */ "\t});",
	/* 36 */ "});",
].join("\n");

describe("a failed test's unrun assertions", () => {
	it("counts the assertions after the failing line, to the end of its own test", () => {
		assert.deepEqual(stoppedShort(SUITE, 5, 8), { after: 2, inLoop: false });
		assert.deepEqual(stoppedShort(SUITE, 5, 7), { after: 3, inLoop: false });
		assert.deepEqual(stoppedShort(SUITE, 17, 30), { after: 0, inLoop: false });
	});

	it("counts none when the test fails at its last assertion, whichever of its lines failed", () => {
		assert.deepEqual(stoppedShort(SUITE, 5, 11), { after: 0, inLoop: false });
		assert.deepEqual(stoppedShort(SUITE, 5, 13), { after: 0, inLoop: false });
	});

	it("says when the test failed inside a loop, whose later cases did not run", () => {
		assert.deepEqual(stoppedShort(SUITE, 17, 20), { after: 2, inLoop: true });
	});

	it("finds a loop whose head runs over several lines, from a block inside it", () => {
		assert.deepEqual(stoppedShort(SUITE, 17, 27), { after: 1, inLoop: true });
	});

	it("reads nothing for a failure outside the test, such as a hook's", () => {
		assert.equal(stoppedShort(SUITE, 5, 2), undefined);
		assert.equal(stoppedShort(SUITE, 17, 34), undefined);
	});
});

// The width of comments (#65 retro) and their rewrap (#147 retro). scripts/wrap-comments.ts states
// the rule, counts the columns and rewraps; this suite checks that every comment of the code
// Prettier formats keeps to the rule, and how the rewrap moves words.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formattedCode, wideComments, widthOf, wrapComments } from "../../scripts/wrap-comments.ts";

describe("comment width", () => {
	it("reads the code Prettier formats and leaves out what .prettierignore lists", async () => {
		const files = await formattedCode();
		assert.ok(files.includes("src/pages/index.astro"));
		assert.ok(!files.includes("tests/browser/foundation.spec.ts"));
	});

	it("counts a Thai mark above or below its consonant as no column, as Prettier does", () => {
		assert.equal(widthOf("\t// ค้นหาบริการ"), 2 + 3 + 9);
	});

	it("keeps every comment line of the code Prettier formats within 100 columns", async () => {
		const wide = await wideComments(await formattedCode());
		assert.deepEqual(wide, [], `npm run format rewraps these comment lines:\n${wide.join("\n")}`);
	});
});

describe("comment rewrap", () => {
	it("moves the words past the width to the start of the paragraph's next line", () => {
		assert.equal(
			wrapComments("// one two three four five\n// six seven\nconst x = 1;\n", 16),
			"// one two three\n// four five six\n// seven\nconst x = 1;\n",
		);
	});

	it("starts a new line where the paragraph ends, at a blank comment line or code", () => {
		assert.equal(
			wrapComments("// one two three four\n//\n// one two three four\nx();\n", 16),
			"// one two three\n// four\n//\n// one two three\n// four\nx();\n",
		);
	});

	it("keeps a list item's next lines under its words, and a new item on its own line", () => {
		assert.equal(
			wrapComments("// - one two three four\n//   five\n// - six\n", 16),
			"// - one two\n//   three four\n//   five\n// - six\n",
		);
		assert.equal(
			wrapComments("// one two three four\n// - five\n", 16),
			"// one two three\n// four\n// - five\n",
		);
	});

	it("opens a one-line block comment into a block, in code and in a stylesheet", () => {
		assert.equal(
			wrapComments("\t/** one two three four */\n", 16),
			"\t/**\n\t * one two\n\t * three four\n\t */\n",
		);
		assert.equal(
			wrapComments("/* one two three four five */\n", 16),
			"/*\n * one two three\n * four five\n */\n",
		);
	});

	it("breaks a line outside a code span, so the span stays whole", () => {
		assert.equal(wrapComments("// one `a b c d` two\n", 12), "// one\n// `a b c d`\n// two\n");
	});

	it("measures a line as the check does: a tab as 2 columns, a Thai mark as none", () => {
		assert.equal(wrapComments("\t// one two three\n", 16), "\t// one two\n\t// three\n");
		const thai = "// ค้นหาบริการ ค้นหาบริการ\n";
		assert.equal(wrapComments(thai, 22), thai);
		assert.equal(wrapComments(thai, 21), "// ค้นหาบริการ\n// ค้นหาบริการ\n");
	});

	it("leaves a single word and an indented line outside a list as written", () => {
		const long = "// https://example.com/a/long/path\n//\n//   node scripts/wrap-comments.ts\n";
		assert.equal(wrapComments(long, 16), long);
	});
});

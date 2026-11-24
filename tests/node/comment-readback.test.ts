// Whether a posted issue comment's body is the file it was posted from (#421 retro item 3: a
// read-back by hand twice met a trailing empty line, and once the log said the body matched):
// scripts/comment-readback/plan.ts, which scripts/comment-readback.ts feeds the body GitHub holds.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compareBodies } from "../../scripts/comment-readback/plan.ts";

const file = "## Hand-off\n\nThe evidence set.\n\n- a\n- b\n";

describe("compareBodies", () => {
	it("matches a body that differs from the file only in white space at its end", () => {
		assert.equal(compareBodies("## Hand-off\n\nThe evidence set.\n\n- a\n- b", file), "matches");
		assert.equal(compareBodies(`${file}\n\n`, file), "matches");
	});

	it("matches a body GitHub holds with CRLF line ends", () => {
		assert.equal(compareBodies(file.replaceAll("\n", "\r\n"), file), "matches");
	});

	it("names the first line that differs, with both sides", () => {
		assert.equal(
			compareBodies("## Hand-off\n\nThe evidence sets.\n\n- a\n- b", file),
			'differs at line 3: posted "The evidence sets."  |  file "The evidence set."',
		);
	});

	it("says which side ends first", () => {
		assert.equal(
			compareBodies("## Hand-off\n\nThe evidence set.", file),
			'differs at line 4: posted (ended)  |  file ""',
		);
	});
});

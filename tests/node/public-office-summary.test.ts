// The office summary sentence (Feature 008 #241; spec #239 "Hero and Featured"): the Homepage
// hero breaks it into three fixed lines from 1,024 px and marks "ด้านสุขภาพ", and the page's
// description and the Contact Summary's lead read it whole.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OFFICE_SUMMARY, OFFICE_SUMMARY_LINES } from "../../src/lib/office-summary.ts";

describe("the office summary sentence", () => {
	it("reads the same whole as the hero's three lines do one after another", () => {
		assert.equal(
			OFFICE_SUMMARY,
			"ศูนย์กลางข้อมูล บริการ และการประสานงานด้านสุขภาพของประชาชนในอำเภอสอง จังหวัดแพร่",
		);
		assert.equal(OFFICE_SUMMARY_LINES.length, 3);
		assert.deepEqual(
			OFFICE_SUMMARY_LINES.flatMap(({ marked }) => marked ?? []),
			["ด้านสุขภาพ"],
		);
	});
});

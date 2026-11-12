// The colour of an Announcement's category badge on the Homepage (Feature 008 #245; spec #239
// "Current Announcements", user stories 19 and 46).
//
// The Homepage shows each current Announcement's category, its first `announcement_type` term, as
// a badge. Procurement and recruitment, the seed's terms (seed/seed.json), each have a colour of
// their own; every other category, the seed's general one and one staff add later, takes the
// general colour until a colour is assigned in code.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { categoryTone } from "../../src/lib/announcement-category.ts";

describe("an Announcement category's colour", () => {
	it("is its own for procurement and for recruitment", () => {
		assert.equal(categoryTone("procurement"), "procurement");
		assert.equal(categoryTone("recruitment"), "recruitment");
	});

	it("is the general one for the general category", () => {
		assert.equal(categoryTone("general"), "general");
	});

	it("is the general one for a category added later, also one named like a known category", () => {
		assert.equal(categoryTone("public-hearing"), "general");
		assert.equal(categoryTone("demo-announcement-recruitment"), "general");
		assert.equal(categoryTone("Procurement"), "general");
		assert.equal(categoryTone("toString"), "general");
		assert.equal(categoryTone(""), "general");
	});
});

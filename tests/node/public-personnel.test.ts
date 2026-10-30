// Leadership and Personnel (#61; spec #51 "Public reads" (About), `03` §5, GLOSSARY Personnel and
// Leadership).
//
// - Only Personnel with `public_visible` set appear. Off or unset, a person appears nowhere.
// - Leadership is the publicly visible Personnel that have a `leadership_order`, ascending, with
//   ties broken by name. An empty order means the person is not Leadership.
// - Personnel groups by `organizational_unit` in Thai order, then by name. A person without a unit
//   comes in a last group of its own.
// - A person is shown by their prefix and display name.
//
// Thai order puts a leading vowel by the consonant after it, so เกด comes before ขวัญ, which code
// point order reverses.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	leadership,
	personnelByUnit,
	shownName,
	type PersonnelData,
} from "../../src/lib/personnel-directory.ts";

/** A published Personnel entry as the query functions return it, visible unless told otherwise. */
function person(id: string, title: string, data: Partial<PersonnelData> = {}) {
	return { id, data: { title, public_visible: true, ...data } };
}

const ids = (entries: ReadonlyArray<{ id: string }>) => entries.map((entry) => entry.id);

describe("leadership", () => {
	it("lists the visible Personnel with a Leadership order, ascending, and leaves out the rest", () => {
		const entries = [
			person("deputy", "สมชาย", { leadership_order: 2 }),
			person("staff", "สมศรี"),
			person("chief", "สมหญิง", { leadership_order: 1 }),
			person("no-order", "สมปอง", { leadership_order: null }),
			person("third", "สมใจ", { leadership_order: 10 }),
		];

		assert.deepEqual(ids(leadership(entries)), ["chief", "deputy", "third"]);
	});

	it("breaks a tie in Leadership order by name in Thai order", () => {
		const entries = [
			person("khwan", "ขวัญ", { leadership_order: 2 }),
			person("chief", "สมหญิง", { leadership_order: 1 }),
			person("ked", "เกด", { leadership_order: 2 }),
		];

		assert.deepEqual(ids(leadership(entries)), ["chief", "ked", "khwan"]);
	});

	it("never lists a person whose public visibility is off or unset, whatever their order", () => {
		const entries = [
			person("hidden", "กมล", { leadership_order: 1, public_visible: false }),
			person("unset", "กาญจนา", { leadership_order: 1, public_visible: null }),
			person("chief", "สมหญิง", { leadership_order: 2 }),
		];

		assert.deepEqual(ids(leadership(entries)), ["chief"]);
	});
});

describe("personnelByUnit", () => {
	it("groups the visible Personnel by unit in Thai order, each by name in Thai order", () => {
		const entries = [
			person("a", "ขวัญ", { organizational_unit: "ขนส่ง" }),
			person("b", "เกด", { organizational_unit: "ขนส่ง" }),
			person("c", "สมชาย", { organizational_unit: "เกษตร" }),
			person("d", "อร", { organizational_unit: "คลัง" }),
			person("e", "กมล", { organizational_unit: "คลัง" }),
		];

		assert.deepEqual(
			personnelByUnit(entries).map(({ unit, people }) => [unit, ids(people)]),
			[
				["เกษตร", ["c"]],
				["ขนส่ง", ["b", "a"]],
				["คลัง", ["e", "d"]],
			],
		);
	});

	it("never lists a person whose public visibility is off or unset", () => {
		const entries = [
			person("shown", "สมชาย", { organizational_unit: "คลัง" }),
			person("hidden", "สมศรี", { organizational_unit: "คลัง", public_visible: false }),
			person("unset", "สมใจ", { organizational_unit: "เกษตร", public_visible: undefined }),
		];

		assert.deepEqual(
			personnelByUnit(entries).map(({ unit, people }) => [unit, ids(people)]),
			[["คลัง", ["shown"]]],
		);
	});

	it("puts the Personnel without a unit in a last group, and groups a unit written with spaces around it as one", () => {
		const entries = [
			person("blank", "สมชาย", { organizational_unit: "  " }),
			person("spaced", "เกด", { organizational_unit: " คลัง " }),
			person("none", "กมล"),
			person("plain", "ขวัญ", { organizational_unit: "คลัง" }),
		];

		assert.deepEqual(
			personnelByUnit(entries).map(({ unit, people }) => [unit, ids(people)]),
			[
				["คลัง", ["spaced", "plain"]],
				[undefined, ["none", "blank"]],
			],
		);
	});
});

describe("shownName", () => {
	it("puts the prefix before the display name, as Thai writes it", () => {
		assert.equal(shownName({ title: "สมชาย ใจดี", prefix: "นาย" }), "นายสมชาย ใจดี");
	});

	it("shows the display name alone when it has no prefix, or already starts with it", () => {
		assert.equal(shownName({ title: "สมชาย ใจดี" }), "สมชาย ใจดี");
		assert.equal(shownName({ title: "สมชาย ใจดี", prefix: " " }), "สมชาย ใจดี");
		assert.equal(
			shownName({ title: "นายแพทย์สมชาย ใจดี", prefix: "นายแพทย์" }),
			"นายแพทย์สมชาย ใจดี",
		);
	});
});

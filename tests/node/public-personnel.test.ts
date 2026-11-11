// Leadership and Personnel (#61; spec #51 "Public reads" (About), `03` §5, GLOSSARY Personnel and
// Leadership).
//
// - Only Personnel with `public_visible` set appear. Off or unset, a person appears nowhere.
// - Leadership is the publicly visible Personnel that have a `leadership_order`, ascending, with
//   ties broken by name. An empty order means the person is not Leadership.
// - The Homepage's Leadership strip shows the first three of the Leadership, in that order and with
//   that tie rule, and fewer when fewer exist (Feature 008 #243; spec #239 "Leadership strip").
// - Personnel groups by `organizational_unit` in Thai order, then by name. A person without a unit
//   comes in a last group of its own.
// - A person is shown by their prefix and display name.
//
// Thai order puts a leading vowel by the consonant after it, so เกด comes before ขวัญ, which code
// point order reverses.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	homepageLeadership,
	leadership,
	personnelByUnit,
	shownName,
	type DirectoryData,
} from "../../src/lib/personnel-directory.ts";

/** A published Personnel entry as the query functions return it, visible unless told otherwise. */
function person(id: string, title: string, data: Partial<DirectoryData> = {}) {
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

describe("homepageLeadership", () => {
	/** Leadership given last first, so the rule must order them: `count` people, orders 1 up. */
	const leaders = (count: number) =>
		Array.from({ length: count }, (_, index) =>
			person(`leader-${count - index}`, `สม${count - index}`, { leadership_order: count - index }),
		);

	it("shows everyone while the Leadership is three or fewer, in Leadership order", () => {
		assert.deepEqual(ids(homepageLeadership(leaders(0))), []);
		assert.deepEqual(ids(homepageLeadership(leaders(1))), ["leader-1"]);
		assert.deepEqual(ids(homepageLeadership(leaders(2))), ["leader-1", "leader-2"]);
		assert.deepEqual(ids(homepageLeadership(leaders(3))), ["leader-1", "leader-2", "leader-3"]);
	});

	it("shows the first three of four Leadership", () => {
		assert.deepEqual(ids(homepageLeadership(leaders(4))), ["leader-1", "leader-2", "leader-3"]);
	});

	it("breaks a tie for the third place by name in Thai order, as the Leadership page does", () => {
		const entries = [
			person("khwan", "ขวัญ", { leadership_order: 3 }),
			person("deputy", "สมชาย", { leadership_order: 2 }),
			person("ked", "เกด", { leadership_order: 3 }),
			person("chief", "สมหญิง", { leadership_order: 1 }),
		];

		assert.deepEqual(ids(homepageLeadership(entries)), ["chief", "deputy", "ked"]);
	});

	it("counts only the Leadership: staff and people out of public sight take no place", () => {
		const entries = [
			person("hidden", "กมล", { leadership_order: 1, public_visible: false }),
			person("staff", "กาญจนา"),
			...leaders(3),
		];

		assert.deepEqual(ids(homepageLeadership(entries)), ["leader-1", "leader-2", "leader-3"]);
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

	it("keeps the prefix when the display name starts with the same letters", () => {
		assert.equal(shownName({ title: "นางนวล ใจดี", prefix: "นาง" }), "นางนางนวล ใจดี");
	});

	it("shows the display name alone when it has no prefix", () => {
		assert.equal(shownName({ title: "สมชาย ใจดี" }), "สมชาย ใจดี");
		assert.equal(shownName({ title: "สมชาย ใจดี", prefix: " " }), "สมชาย ใจดี");
	});
});

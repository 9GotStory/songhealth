// The comparisons a hand-off's record quotes (#397 retro item 2): scripts/contrast-compare/plan.ts,
// which scripts/contrast-compare.ts feeds the outputs of scripts/measure-text-contrast.ts
// --all-text --fold.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	compareFolders,
	compareOutputs,
	lowestFolded,
} from "../../scripts/contrast-compare/plan.ts";

const ticket = [
	"2026-11-21T10:00:00Z scripts/dev-runtime-env.sh node scripts/measure-text-contrast.ts ...",
	'1440 px  a "หน้าแรก"  11.00:1 (237 px)',
	'375 px  span "MOIT 1"  6.35:1 (198 px)',
	'375 px  span "MOIT 1" (2)  6.43:1 (1242 px)',
	'folded  a "หน้าแรก"  11.00:1 at 1440 px',
	'folded  span "MOIT #"  6.35:1 at 375 px (2 texts)',
	'folded  h2 "สารบัญ"  8.10:1 at 1440 px',
].join("\n");

describe("compareOutputs", () => {
	it("counts the ticket's folded lines the round reads the same, and its per-width readings", () => {
		const round = [
			'1440 px  a "หน้าแรก"  11.00:1 (240 px)',
			'375 px  span "MOIT 1"  6.35:1 (198 px)',
			'375 px  span "MOIT 1" (2)  6.43:1 (1242 px)',
			'folded  a "หน้าแรก"  11.00:1 at 1440 px',
			'folded  span "MOIT #"  6.35:1 at 375 px (2 texts)',
			'folded  h2 "สารบัญ"  8.10:1 at 1440 px',
		].join("\n");
		assert.deepEqual(compareOutputs(ticket, round), [
			"3 of 3 of the ticket's folded lines the same",
			"3 of 3 of the ticket's per-width readings in the round at the same width and ratio",
		]);
	});

	it("names each folded line that differs, is missing or is the round's alone", () => {
		const round = [
			'1440 px  a "หน้าแรก"  11.00:1 (237 px)',
			'375 px  span "MOIT 1"  6.52:1 (198 px)',
			'375 px  span "MOIT 1" (2)  6.43:1 (1242 px)',
			'folded  a "หน้าแรก"  11.00:1 at 1440 px',
			'folded  span "MOIT #"  6.43:1 at 375 px (3 texts)',
			'folded  p "2.3 ฟอร์มเผยแพร่"  4.97:1 at 375 px',
		].join("\n");
		assert.deepEqual(compareOutputs(ticket, round), [
			'differs: span "MOIT #"  ticket 6.35:1 at 375 px (2 texts)  |  round 6.43:1 at 375 px (3 texts)',
			'not in the round: h2 "สารบัญ"  8.10:1 at 1440 px',
			'round only: p "2.3 ฟอร์มเผยแพร่"  4.97:1 at 375 px',
			"1 of 3 of the ticket's folded lines the same",
			'per-width: 375 px span "MOIT 1"  ticket 6.35:1  |  round 6.52:1, 6.43:1',
			"2 of 3 of the ticket's per-width readings in the round at the same width and ratio",
		]);
	});

	it("holds a ticket's reading the round reads under another number of the same words", () => {
		const round = [
			'1440 px  a "หน้าแรก"  11.00:1 (237 px)',
			'375 px  span "MOIT 1"  4.97:1 (198 px)',
			'375 px  span "MOIT 1" (2)  6.35:1 (198 px)',
			'375 px  span "MOIT 1" (3)  6.43:1 (1242 px)',
			'folded  a "หน้าแรก"  11.00:1 at 1440 px',
			'folded  span "MOIT #"  6.35:1 at 375 px (2 texts)',
			'folded  h2 "สารบัญ"  8.10:1 at 1440 px',
		].join("\n");
		assert.deepEqual(
			compareOutputs(ticket, round).at(-1),
			"3 of 3 of the ticket's per-width readings in the round at the same width and ratio",
		);
	});

	it("reads a per-width reading missing from the round as not there", () => {
		assert.deepEqual(compareOutputs(ticket, 'folded  a "หน้าแรก"  11.00:1 at 1440 px'), [
			'not in the round: span "MOIT #"  6.35:1 at 375 px (2 texts)',
			'not in the round: h2 "สารบัญ"  8.10:1 at 1440 px',
			"1 of 3 of the ticket's folded lines the same",
			'per-width: 1440 px a "หน้าแรก"  ticket 11.00:1  |  not in the round',
			'per-width: 375 px span "MOIT 1"  ticket 6.35:1  |  not in the round',
			'per-width: 375 px span "MOIT 1" (2)  ticket 6.43:1  |  not in the round',
			"0 of 3 of the ticket's per-width readings in the round at the same width and ratio",
		]);
	});
});

describe("lowestFolded", () => {
	it("lists the texts no width read, then the lowest folded readings across outputs, lowest first", () => {
		assert.deepEqual(
			lowestFolded(
				[
					{
						name: "demo-moit-2.txt",
						text: [
							'folded  a "ตัวชี้วัดก่อนหน้า"  4.63:1 at 1440 and 1024 px',
							'folded  h1 "MOIT # x"  6.27:1 at 375 px',
						].join("\n"),
					},
					{
						name: "demo-ita-2570.txt",
						text: [
							'folded  span "MOIT"  4.69:1 at 375 and 320 px',
							'folded  p "x"  not read at any width',
						].join("\n"),
					},
				],
				2,
			),
			[
				'not read: demo-ita-2570.txt  p "x"',
				'4.63:1  demo-moit-2.txt  a "ตัวชี้วัดก่อนหน้า"  at 1440 and 1024 px',
				'4.69:1  demo-ita-2570.txt  span "MOIT"  at 375 and 320 px',
			],
		);
	});

	it("names each text no width read, whatever the count", () => {
		assert.deepEqual(
			lowestFolded([{ name: "a.txt", text: 'folded  p "x"  not read at any width' }], 1),
			['not read: a.txt  p "x"'],
		);
	});
});

describe("compareFolders", () => {
	// #421 retro item 1: a hand-off compared 20 outputs one pair at a time and typed the counts,
	// and the review found three of them wrong; the folders' block is quoted whole instead.
	const moved = ticket
		.replace('folded  h2 "สารบัญ"  8.10:1', 'folded  h2 "สารบัญ"  8.12:1')
		.replace('375 px  span "MOIT 1"  6.35:1', '375 px  span "MOIT 1"  6.52:1');

	it("gives each output its counts and folded differences, then the totals", () => {
		assert.deepEqual(
			compareFolders(
				[
					{ name: "418/a.txt", text: ticket },
					{ name: "418/b.txt", text: ticket },
				],
				[
					{ name: "418/a.txt", text: ticket },
					{ name: "418/b.txt", text: moved },
				],
			),
			[
				"418/a.txt  folded 3 of 3 the same; per-width 3 of 3",
				"418/b.txt  folded 2 of 3 the same; per-width 2 of 3",
				'  differs: h2 "สารบัญ"  ticket 8.10:1 at 1440 px  |  round 8.12:1 at 1440 px',
				"folded lines: 5 of 6 the same in 2 outputs; differing in 1: 418/b.txt",
				"per-width readings: 5 of 6 in the round at the same width and ratio",
			],
		);
	});

	it("reads an output without readings, such as a focus run's, line for line", () => {
		const focus =
			'1440 px  main a  "": under the ring: lowest 5.78:1\n1024 px  main a  "": lowest 5.78:1';
		assert.deepEqual(
			compareFolders(
				[
					{ name: "420/focus-a.txt", text: focus },
					{ name: "420/focus-b.txt", text: focus },
				],
				[
					{ name: "420/focus-a.txt", text: focus },
					{
						name: "420/focus-b.txt",
						text: focus.replace(
							'1024 px  main a  "": lowest 5.78',
							'1024 px  main a  "": lowest 5.30',
						),
					},
				],
			),
			[
				"420/focus-a.txt  line for line the same",
				"420/focus-b.txt  line for line: differs from line 2",
				"line for line: 1 of 2 outputs the same",
			],
		);
	});

	it("counts apart the outputs that hold folded lines of the round's alone", () => {
		const added = `${ticket}\nfolded  p "สรุป"  5.07:1 at 1024 px`;
		assert.deepEqual(
			compareFolders(
				[
					{ name: "418/a.txt", text: ticket },
					{ name: "418/b.txt", text: ticket },
				],
				[
					{ name: "418/a.txt", text: added },
					{ name: "418/b.txt", text: moved },
				],
			).slice(-2, -1),
			[
				"folded lines: 5 of 6 the same in 2 outputs; differing in 1: 418/b.txt; the round's alone in 1: 418/a.txt",
			],
		);
	});

	it("names an output only one folder holds", () => {
		assert.deepEqual(
			compareFolders(
				[
					{ name: "418/a.txt", text: ticket },
					{ name: "418/c.txt", text: ticket },
				],
				[
					{ name: "418/a.txt", text: ticket },
					{ name: "418/d.txt", text: ticket },
				],
			),
			[
				"418/a.txt  folded 3 of 3 the same; per-width 3 of 3",
				"418/c.txt  the ticket's alone",
				"418/d.txt  the round's alone",
				"folded lines: 3 of 3 the same in 1 output",
				"per-width readings: 3 of 3 in the round at the same width and ratio",
			],
		);
	});
});

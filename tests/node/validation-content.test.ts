// The check that no validation content remains (#461; spec #450 "T022, T028 and the validation
// fixture"): scripts/validation-content/plan.ts, which scripts/validation-content.ts follows when
// it reads a Recovery Set taken after the validation tagline and picture were removed. It reads
// what the command takes, where in the database's rows the tagline or the picture's key still
// appears, which media files are still the picture, and what the check reports.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
	dumpScan,
	mediaFindings,
	parseCheckArgs,
	report,
	VALIDATION_PICTURE_SHA256,
	VALIDATION_TAGLINE,
} from "../../scripts/validation-content/plan.ts";

const KEY = "01M8DZSZFEWR0CK7CA11E16S20.png";
const MEDIA_PATH = `/_emdash/api/media/file/${KEY}`;
const PICTURE = VALIDATION_PICTURE_SHA256;
const OTHER = "a".repeat(64);

describe("the validation state it looks for", () => {
	it("is the tagline the lifecycle harness sets and reads", () => {
		const harness = readFileSync("tests/operations/verify-foundation.sh", "utf8");
		assert.match(
			harness,
			/^readonly TAGLINE_EXPECTED='Songhealth Feature 001 foundation validation'$/m,
		);
		assert.equal(VALIDATION_TAGLINE, "Songhealth Feature 001 foundation validation");
	});

	it("is the committed validation picture, by its SHA-256 (#454)", () => {
		const bytes = readFileSync("tests/operations/fixtures/validation-picture.png");
		assert.equal(
			createHash("sha256").update(bytes).digest("hex"),
			"2c7b5116a8498892ccabd13a03e253fd4d55b9c0714cce51509196f0df0ef396",
		);
		assert.equal(
			VALIDATION_PICTURE_SHA256,
			"2c7b5116a8498892ccabd13a03e253fd4d55b9c0714cce51509196f0df0ef396",
		);
	});
});

describe("what the command takes", () => {
	it("takes a set's folder and the picture's media path, and reads the key from the path", () => {
		assert.deepEqual(
			parseCheckArgs(["/home/songhealth/recovery-sets/2026-11-28T200000Z", MEDIA_PATH]),
			{
				set: "/home/songhealth/recovery-sets/2026-11-28T200000Z",
				key: KEY,
			},
		);
	});

	for (const [why, argv] of [
		["no arguments", []],
		["no media path", ["/sets/a"]],
		["a third argument", ["/sets/a", MEDIA_PATH, "more"]],
		["a path outside the media file route", ["/sets/a", `/_emdash/api/media/${KEY}`]],
		["a key with a slash", ["/sets/a", "/_emdash/api/media/file/a/b.png"]],
		["a key that is a dot name", ["/sets/a", "/_emdash/api/media/file/.."]],
		["an empty key", ["/sets/a", "/_emdash/api/media/file/"]],
	] as const) {
		it(`refuses ${why} with its usage`, () => {
			const parsed = parseCheckArgs(argv);
			assert.ok("error" in parsed, JSON.stringify(parsed));
			assert.match(parsed.error, /^usage: node scripts\/validation-content\.ts/);
		});
	}
});

/** The data-only SQL pg_restore writes for a set: each table's COPY block, then its rows. */
function dump(blocks: Record<string, string[]>): string[] {
	return Object.entries(blocks).flatMap(([table, rows]) => [
		`-- Data for Name: ${table}; Type: TABLE DATA; Schema: public; Owner: -`,
		`COPY public.${table} (id, value) FROM stdin;`,
		...rows,
		"\\.",
		"",
	]);
}

function scan(lines: readonly string[], key = KEY) {
	const s = dumpScan(key);
	for (const line of lines) s.line(line);
	return s.findings();
}

describe("where the database still holds the validation state", () => {
	it("finds the tagline in the row of the table that holds it", () => {
		const lines = dump({
			options: [`site:title\t"Songhealth"`, `site:tagline\t"${VALIDATION_TAGLINE}"`],
		});
		assert.deepEqual(scan(lines), [{ what: "tagline", table: "options", rows: 1 }]);
	});

	it("finds the picture's key in every table that names it, with the count of its rows", () => {
		const lines = dump({
			media: [`01M8DZSZFGZ5AJA48G71QDRD9A\tvalidation-picture.png\timage/png\t9316\t${KEY}`],
			ec_posts: [`p1\t{"src":"/_emdash/api/media/file/${KEY}"}`, `p2\t{"src":"${KEY}"}`, "p3\t{}"],
		});
		assert.deepEqual(scan(lines), [
			{ what: "picture key", table: "media", rows: 1 },
			{ what: "picture key", table: "ec_posts", rows: 2 },
		]);
	});

	it("finds nothing once the tagline is empty and the picture's rows are gone", () => {
		const lines = dump({
			options: [`site:title\t"Songhealth"`, `site:tagline\t""`],
			media: [`01OTHER\tother.png\timage/png\t10\t01OTHERKEY.png`],
		});
		assert.deepEqual(scan(lines), []);
	});

	it("names a line outside any COPY block by where it is", () => {
		const lines = ["SET client_encoding = 'UTF8';", `SELECT '${VALIDATION_TAGLINE}';`];
		assert.deepEqual(scan(lines), [
			{ what: "tagline", table: "(outside the tables' rows)", rows: 1 },
		]);
	});

	it("finds the tagline and the key on one row as two findings", () => {
		const lines = dump({ ec_pages: [`p\t${VALIDATION_TAGLINE} ${KEY}`] });
		assert.deepEqual(scan(lines), [
			{ what: "tagline", table: "ec_pages", rows: 1 },
			{ what: "picture key", table: "ec_pages", rows: 1 },
		]);
	});
});

describe("which media files are still the validation picture", () => {
	it("names a file with the picture's SHA-256 under any path", () => {
		assert.deepEqual(
			mediaFindings(
				[
					{ path: "01AAA.png", size: 9316, sha256: PICTURE },
					{ path: "01BBB.png", size: 10, sha256: OTHER },
				],
				KEY,
			),
			[{ path: "01AAA.png", why: "the picture's SHA-256" }],
		);
	});

	it("names a file at the picture's key whatever its bytes", () => {
		assert.deepEqual(mediaFindings([{ path: KEY, size: 10, sha256: OTHER }], KEY), [
			{ path: KEY, why: "the picture's key" },
		]);
	});

	it("names nothing when no file is the picture", () => {
		assert.deepEqual(mediaFindings([{ path: "01BBB.png", size: 10, sha256: OTHER }], KEY), []);
	});
});

describe("what the check reports", () => {
	const set = { name: "2026-11-28T200000Z", createdUtc: "2026-11-28T20:00:00Z", mediaFiles: 246 };

	it("passes with no finding, naming the set and what it read", () => {
		const r = report(set, [], []);
		assert.equal(r.pass, true);
		assert.deepEqual(r.lines, [
			"PASS: no validation content and no validation media remain in the Recovery Set 2026-11-28T200000Z (taken 2026-11-28T20:00:00Z): the validation tagline and the picture's key are in no row of its database, and none of its 246 media files is the validation picture",
		]);
	});

	it("fails on a finding in the database alone, naming each table without its rows' content", () => {
		const r = report(set, [{ what: "tagline", table: "options", rows: 1 }], []);
		assert.equal(r.pass, false);
		assert.deepEqual(r.lines, [
			"FAIL: the validation tagline is in 1 row of the table options",
			"FAIL: validation content remains in the Recovery Set 2026-11-28T200000Z (taken 2026-11-28T20:00:00Z): 1 finding",
		]);
	});

	it("fails on a finding in the media alone, naming each file", () => {
		const r = report(set, [], [{ path: KEY, why: "the picture's key" }]);
		assert.equal(r.pass, false);
		assert.deepEqual(r.lines, [
			`FAIL: the media file ${KEY} is the validation picture (the picture's key)`,
			"FAIL: validation content remains in the Recovery Set 2026-11-28T200000Z (taken 2026-11-28T20:00:00Z): 1 finding",
		]);
	});

	it("counts every finding of both kinds, rows in the plural", () => {
		const r = report(
			set,
			[{ what: "picture key", table: "ec_posts", rows: 2 }],
			[{ path: "01AAA.png", why: "the picture's SHA-256" }],
		);
		assert.deepEqual(r.lines, [
			"FAIL: the picture's key is in 2 rows of the table ec_posts",
			"FAIL: the media file 01AAA.png is the validation picture (the picture's SHA-256)",
			"FAIL: validation content remains in the Recovery Set 2026-11-28T200000Z (taken 2026-11-28T20:00:00Z): 2 findings",
		]);
	});
});

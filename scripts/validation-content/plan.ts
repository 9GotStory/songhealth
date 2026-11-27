// The rules of the check that no validation content remains (#461), which
// scripts/validation-content.ts follows: what the command takes, where in a Recovery Set's database
// rows the validation tagline or the picture's key still appears, which of its media files is still
// the validation picture, and what it reports. Nothing here runs a command or reads a file, so
// node:test covers it (tests/node/validation-content.test.ts).
//
// Decisions: spec #450 "T022, T028 and the validation fixture" (after T022 and T028 a check shows
// that no validation content and no validation media remain); the Product Owner's answer on #461
// (comment 7217954182 item 4): the check reads a Recovery Set taken after the removal, so that on
// the Production host the night's set serves and the site is not stopped again for it.

import type { MediaEntry } from "../recovery-set/plan.ts";

/**
 * The tagline Feature 001's lifecycle harness sets and reads
 * (tests/operations/verify-foundation.sh).
 */
export const VALIDATION_TAGLINE = "Songhealth Feature 001 foundation validation";

/**
 * The committed validation picture's SHA-256 (tests/operations/fixtures/validation-picture.png,
 * #454).
 */
export const VALIDATION_PICTURE_SHA256 =
	"2c7b5116a8498892ccabd13a03e253fd4d55b9c0714cce51509196f0df0ef396";

const MEDIA_ROUTE = "/_emdash/api/media/file/";

const USAGE = `usage: node scripts/validation-content.ts <a Recovery Set's directory> ${MEDIA_ROUTE}<the validation picture's key>
  reads the set taken after the validation tagline and picture were removed; the media path is the
  one the lifecycle harness read (SONGHEALTH_VALIDATION_MEDIA_PATH)`;

export function parseCheckArgs(
	argv: readonly string[],
): { set: string; key: string } | { error: string } {
	const [set, mediaPath, ...rest] = argv;
	if (!set || !mediaPath?.startsWith(MEDIA_ROUTE) || rest.length > 0) return { error: USAGE };
	const key = mediaPath.slice(MEDIA_ROUTE.length);
	// A storage key is one file name of the media store: a ULID and its file name's extension
	// (emdash 1.1.0, src/astro/routes/api/media.ts).
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(key)) return { error: USAGE };
	return { set, key };
}

/** A place in the database's rows that still holds part of the validation state. */
export interface DumpFinding {
	what: "tagline" | "picture key";
	table: string;
	rows: number;
}

const OUTSIDE = "(outside the tables' rows)";
const COPY = /^COPY (?:public\.)?("?)([^\s"(]+)\1 \(.*\) FROM stdin;$/;

/**
 * Reads the data-only SQL `pg_restore` writes for a set's database.dump, one line at a time: each
 * table's rows follow its `COPY … FROM stdin;` line until `\.`, one row a line: COPY's text format
 * writes a newline inside a value as `\n` (PostgreSQL 18, sql-copy.html "Text Format"). It
 * counts, per table, the rows that hold the tagline or the key, and keeps no row's content.
 */
export function dumpScan(key: string): {
	line(text: string): void;
	findings(): DumpFinding[];
} {
	const needles = [
		["tagline", VALIDATION_TAGLINE],
		["picture key", key],
	] as const;
	const counts = new Map<string, DumpFinding>();
	let table: string | undefined;
	return {
		line(text) {
			if (table === undefined) {
				const copy = COPY.exec(text);
				if (copy) {
					table = copy[2];
					return;
				}
			} else if (text === "\\.") {
				table = undefined;
				return;
			}
			for (const [what, needle] of needles) {
				if (!text.includes(needle)) continue;
				const where = table ?? OUTSIDE;
				const id = `${what}\n${where}`;
				const found = counts.get(id) ?? { what, table: where, rows: 0 };
				found.rows += 1;
				counts.set(id, found);
			}
		},
		findings: () => [...counts.values()],
	};
}

/** A media file of the set that is still the validation picture. */
export interface MediaFinding {
	path: string;
	why: "the picture's SHA-256" | "the picture's key";
}

/** The set's media files that are the picture: by its bytes under any path, or at its key. */
export function mediaFindings(media: readonly MediaEntry[], key: string): MediaFinding[] {
	return media.flatMap((file): MediaFinding[] => {
		if (file.sha256 === VALIDATION_PICTURE_SHA256)
			return [{ path: file.path, why: "the picture's SHA-256" }];
		if (file.path === key) return [{ path: file.path, why: "the picture's key" }];
		return [];
	});
}

/** The check's lines: one per finding, then its verdict, which names the set it read. */
export function report(
	set: { name: string; createdUtc: string; mediaFiles: number },
	dump: readonly DumpFinding[],
	media: readonly MediaFinding[],
): { pass: boolean; lines: string[] } {
	const which = `the Recovery Set ${set.name} (taken ${set.createdUtc})`;
	const count = dump.length + media.length;
	if (count === 0) {
		return {
			pass: true,
			lines: [
				`PASS: no validation content and no validation media remain in ${which}: the validation tagline and the picture's key are in no row of its database, and none of its ${set.mediaFiles} media files is the validation picture`,
			],
		};
	}
	return {
		pass: false,
		lines: [
			...dump.map(
				(f) =>
					`FAIL: ${f.what === "tagline" ? "the validation tagline" : "the picture's key"} is in ${f.rows} ${f.rows === 1 ? "row" : "rows"} of the table ${f.table}`,
			),
			...media.map((f) => `FAIL: the media file ${f.path} is the validation picture (${f.why})`),
			`FAIL: validation content remains in ${which}: ${count} ${count === 1 ? "finding" : "findings"}`,
		],
	};
}

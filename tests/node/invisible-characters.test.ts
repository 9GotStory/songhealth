// Invisible characters in the repository's text files (#57 retro).
//
// Zero-width characters, soft hyphens, a byte order mark and bidirectional controls render as
// nothing, so a reviewer cannot see them in a diff. In #57 a regex and a test string held raw
// U+200B and U+FEFF. Source writes such a character as a `\u` escape instead.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const ROOT = new URL("../../", import.meta.url);

/** Soft hyphen, zero-width and directional marks, bidi embeddings and isolates, BOM. */
const INVISIBLE = /[­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/** Every file git tracks, relative to the repository root. */
function trackedFiles(): string[] {
	return execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
		.split("\0")
		.filter(Boolean);
}

/** Each text file's invisible characters, as `path:line U+XXXX`. Binary files hold a NUL byte. */
async function invisibleCharacters(): Promise<string[]> {
	const found: string[] = [];
	for (const file of trackedFiles()) {
		const bytes = await readFile(new URL(file, ROOT));
		if (bytes.includes(0)) continue;
		bytes
			.toString("utf8")
			.split("\n")
			.forEach((line, index) => {
				for (const [character] of line.matchAll(INVISIBLE)) {
					const code = character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
					found.push(`${file}:${index + 1} U+${code}`);
				}
			});
	}
	return found;
}

describe("invisible characters", () => {
	it("reads the tracked text files", () => {
		assert.ok(trackedFiles().includes("package.json"));
	});

	it("appear in no tracked text file; write them as \\u escapes", async () => {
		assert.deepEqual(await invisibleCharacters(), []);
	});
});

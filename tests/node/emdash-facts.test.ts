// The source paths in docs/agents/emdash-1.1.0.md (#57 retro).
//
// Each fact cites the file it was read from, relative to node_modules/emdash/. A Songhealth file
// is written with a leading `./`, and another package's file starts with its package name. In #57
// a fact cited a Songhealth file as its EmDash source. When the pinned version changes, a cited
// file that moved or went away fails here.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const ROOT = new URL("../../", import.meta.url);
const FACTS = new URL("docs/agents/emdash-1.1.0.md", ROOT);

/** A code span that names a source file: a relative path with a directory and an extension. */
const SOURCE_PATH = /^[^\s/][^\s]*\/[^\s]*\.(?:ts|tsx|mts|js|mjs|astro|json)$/;

/** Where a cited path lives: the repository, a named package, or EmDash. */
function resolveCited(path: string): URL {
	if (path.startsWith("./")) return new URL(path, ROOT);
	if (path.startsWith("@")) return new URL(`node_modules/${path}`, ROOT);
	return new URL(`node_modules/emdash/${path}`, ROOT);
}

/** The file paths cited in code spans of the facts file. */
async function citedPaths(): Promise<string[]> {
	const text = await readFile(FACTS, "utf8");
	const spans = [...text.matchAll(/`([^`\n]+)`/g)].map(([, span]) => span);
	return [...new Set(spans.filter((span) => SOURCE_PATH.test(span)))];
}

describe("EmDash facts", () => {
	it("cite source files", async () => {
		assert.ok((await citedPaths()).includes("src/loader.ts"));
	});

	it("keep each code span on one line, so the check reads every cited path", async () => {
		const text = await readFile(FACTS, "utf8");
		const wrapped = text
			.split("\n")
			.flatMap((line, index) => ((line.match(/`/g) ?? []).length % 2 === 1 ? [index + 1] : []));
		assert.deepEqual(wrapped, [], "lines whose code span runs onto the next line");
	});

	it("cite files that exist: EmDash paths bare, Songhealth paths with ./", async () => {
		const missing = (await citedPaths()).filter((path) => !existsSync(resolveCited(path)));
		assert.deepEqual(missing, []);
	});
});

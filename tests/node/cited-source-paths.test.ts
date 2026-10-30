// Source paths cited in code comments (#93 retro).
//
// CODING_STANDARDS "Comments" asks a comment that relies on platform behaviour to name the package,
// its pinned version and the source path, such as `emdash 1.1.0 src/api/schemas/settings.ts`. A
// path that moved or was mistyped still reads as evidence: in #93 a trimmed header cited
// src/relations/, which emdash 1.1.0 does not have, and a helper still cited src/lib/contact.ts
// after the file was renamed. Each path a comment cites must exist in the repository, in EmDash, or
// in an installed package the same comment block names. tests/node/emdash-facts.test.ts checks the
// facts file's paths.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const ROOT = new URL("../../", import.meta.url);

/** A cited source path: relative, under src/, dist/ or lib/, with a code file's extension. */
const CITED_PATH =
	/(?<![\w./@-])((?:src|dist|lib)\/[\w.[\]/-]+?\.(?:ts|tsx|mts|js|mjs|astro))(?![\w/-])/g;

/** A word that may name a package, such as `playwright-core` or `@emdash-cms/admin`. */
const PACKAGE_NAME = /(?:@[\w.-]+\/)?[\w.-]+/g;

/** The code files git tracks, outside the Feature 001 and 002 records in specs/. */
function codeFiles(): string[] {
	return execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
		.split("\0")
		.filter((file) => /\.(?:ts|tsx|mts|js|mjs|astro)$/.test(file) && !file.startsWith("specs/"));
}

/** A comment line: once trimmed, it starts with //, /* or *. */
function isComment(line: string): boolean {
	const text = line.trimStart();
	return text.startsWith("//") || text.startsWith("/*") || text.startsWith("*");
}

/** The installed packages a comment line names. */
function namedPackages(line: string): string[] {
	return [...line.matchAll(PACKAGE_NAME)]
		.map(([name]) => `node_modules/${name}/`)
		.filter((root) => existsSync(new URL(`${root}package.json`, ROOT)));
}

/**
 * Every cited path, as `file:line path`, with the roots it may resolve against: the repository,
 * EmDash, and the installed packages named so far in its comment block.
 */
async function citedPaths(): Promise<Array<{ at: string; path: string; roots: string[] }>> {
	const cited: Array<{ at: string; path: string; roots: string[] }> = [];
	for (const file of codeFiles()) {
		const lines = (await readFile(new URL(file, ROOT), "utf8")).split("\n");
		let blockPackages = new Set<string>();
		lines.forEach((line, index) => {
			if (!isComment(line)) {
				blockPackages = new Set();
				return;
			}
			for (const root of namedPackages(line)) blockPackages.add(root);
			const roots = ["", "node_modules/emdash/", ...blockPackages];
			for (const [, path] of line.matchAll(CITED_PATH)) {
				cited.push({ at: `${file}:${index + 1}`, path, roots });
			}
		});
	}
	return cited;
}

describe("cited source paths", () => {
	it("are found in the code comments", async () => {
		const cited = await citedPaths();
		assert.ok(cited.some(({ path }) => path === "src/loader.ts"));
	});

	it("exist in the repository, in EmDash, or in the package the line names", async () => {
		const missing = (await citedPaths())
			.filter(({ path, roots }) => !roots.some((root) => existsSync(new URL(root + path, ROOT))))
			.map(({ at, path }) => `${at} ${path}`);
		assert.deepEqual(missing, []);
	});
});

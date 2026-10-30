// Source paths cited in code comments (#93 retro).
//
// CODING_STANDARDS "Comments" asks a comment that relies on platform behaviour to name the package,
// its pinned version and the source path, such as `emdash 1.1.0 src/api/schemas/settings.ts`. A
// path that moved or was mistyped still reads as evidence: in #93 a trimmed header cited
// src/relations/, which emdash 1.1.0 does not have, and a helper still named the Office Contact
// settings module by a file name it no longer has. Each path a comment cites must exist in the
// repository, in EmDash, or in an installed package the same comment block names. The check reads
// git-tracked files, so it sees a new file once it is staged. An EmDash source path that src/ or
// scripts/ cites must also be recorded in docs/agents/emdash-1.1.0.md (#64 retro), whose own paths
// tests/node/emdash-facts.test.ts checks.

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

	it("found only in EmDash are recorded in docs/agents/emdash-1.1.0.md, for the site's code", async () => {
		// CLAUDE.md asks for each EmDash fact the code relies on to be added to the facts file with
		// its source path, so a new EmDash version has one list to verify again (#64 retro). The
		// check covers EmDash's own source, src/, as src/ and scripts/ cite it: the code the site and
		// its operations run. A test cites the platform to explain what it checks, and an accepted
		// Feature 001 or 002 file's claims, such as a bundle name under EmDash's dist/, are checked
		// again when a change touches it (CODING_STANDARDS "Comments").
		const facts = await readFile(new URL("docs/agents/emdash-1.1.0.md", ROOT), "utf8");
		const unrecorded = (await citedPaths())
			.filter(({ at, path }) => /^(?:src|scripts)\//.test(at) && path.startsWith("src/"))
			.filter(({ path, roots }) => {
				const holders = roots.filter((root) => existsSync(new URL(root + path, ROOT)));
				return holders.length > 0 && holders.every((root) => root === "node_modules/emdash/");
			})
			.filter(({ path }) => !facts.includes(path))
			.map(({ at, path }) => `${at} ${path}`);
		assert.deepEqual(unrecorded, []);
	});
});

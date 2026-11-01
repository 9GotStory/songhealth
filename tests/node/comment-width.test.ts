// The width of comments (#65 retro).
//
// Prettier wraps code at the 100 columns of prettier.config.mjs but leaves a comment as it is
// written, so a long comment line passes the format check. In a file Prettier formats, a comment
// line keeps to 100 columns too, counted as Prettier counts them: a tab as 2 columns, its default
// tabWidth, and a nonspacing mark, such as a Thai vowel or tone mark written above or below its
// consonant, as none. A line that is a single word, such as a long address, cannot wrap and is
// left alone.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import * as prettier from "prettier";

const ROOT = new URL("../../", import.meta.url);

/** The widest a comment line may be. */
const WIDTH = 100;

/** The code Prettier formats here: TypeScript, JavaScript modules, Astro components and styles. */
const CODE = /\.(ts|mjs|astro|css)$/;

/** A comment line: one that starts with `//`, or a line of a `/* … *\/` block. */
const COMMENT = /^\s*(\/\/|\/\*|\*)/;

/** The ignore files Prettier reads, so a file it leaves alone is left alone here too. */
const IGNORE_PATH = [".gitignore", ".prettierignore"].map((name) =>
	fileURLToPath(new URL(name, ROOT)),
);

/** Every tracked file of code that Prettier formats, relative to the repository root. */
async function formattedCode(): Promise<string[]> {
	const files: string[] = [];
	for (const file of execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
		.split("\0")
		.filter((name) => CODE.test(name))) {
		const path = fileURLToPath(new URL(file, ROOT));
		if (!(await prettier.getFileInfo(path, { ignorePath: IGNORE_PATH })).ignored) files.push(file);
	}
	return files;
}

/** A line's width as Prettier counts it. */
function widthOf(line: string): number {
	return [...line.replaceAll("\t", "  ").replace(/\p{Mn}/gu, "")].length;
}

/** Each comment line wider than WIDTH that could wrap, as `path:line (columns)`. */
async function wideComments(files: string[]): Promise<string[]> {
	const found: string[] = [];
	for (const file of files) {
		(await readFile(new URL(file, ROOT), "utf8")).split("\n").forEach((line, index) => {
			const words = line.replace(COMMENT, "").trim();
			if (COMMENT.test(line) && widthOf(line) > WIDTH && /\s/.test(words)) {
				found.push(`${file}:${index + 1} (${widthOf(line)} columns)`);
			}
		});
	}
	return found;
}

describe("comment width", () => {
	it("reads the code Prettier formats and leaves out what .prettierignore lists", async () => {
		const files = await formattedCode();
		assert.ok(files.includes("src/pages/index.astro"));
		assert.ok(!files.includes("tests/browser/foundation.spec.ts"));
	});

	it("counts a Thai mark above or below its consonant as no column, as Prettier does", () => {
		assert.equal(widthOf("\t// ค้นหาบริการ"), 2 + 3 + 9);
	});

	it("keeps every comment line of the code Prettier formats within 100 columns", async () => {
		assert.deepEqual(await wideComments(await formattedCode()), []);
	});
});

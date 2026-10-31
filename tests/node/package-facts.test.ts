// The verified package facts in docs/agents/ (#57 retro, #105 retro).
//
// A facts file, `docs/agents/<package>-<version>.md`, records what the site relies on in one pinned
// package. Each fact cites the file it was read from, relative to that package's directory. A
// Songhealth file is written with a leading `./`, and another package's file starts with its
// package name. In #57 a fact cited a Songhealth file as its EmDash source. A cited file that moved
// or went away fails here, and so does a facts file whose version is not the one package.json pins:
// a new version means verifying every fact again and renaming the file.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";

const ROOT = new URL("../../", import.meta.url);
const AGENTS = new URL("docs/agents/", ROOT);

/** A facts file's name: the package's stem, then its version. */
const FACTS_FILE = /^(.+)-(\d+\.\d+\.\d+)\.md$/;

/** A code span that names a source file: a relative path with a directory and an extension. */
const SOURCE_PATH = /^[^\s/][^\s]*\/[^\s]*\.(?:ts|tsx|mts|js|mjs|astro|json)$/;

/** A package's stem in a facts file's name: "emdash", or "lucide-astro" for "@lucide/astro". */
function stem(name: string): string {
	return name.replace(/^@/, "").replace("/", "-");
}

/** Each facts file in docs/agents/, with the pinned package its name stands for and its text. */
async function factsFiles(): Promise<
	Array<{ file: string; version: string; name?: string; pinned?: string; text: string }>
> {
	const manifest = JSON.parse(await readFile(new URL("package.json", ROOT), "utf8"));
	const pins: Record<string, string> = { ...manifest.dependencies, ...manifest.devDependencies };
	const files = (await readdir(AGENTS)).filter((file) => FACTS_FILE.test(file));
	return Promise.all(
		files.map(async (file) => {
			const [, packageStem, version] = FACTS_FILE.exec(file)!;
			const name = Object.keys(pins).find((pin) => stem(pin) === packageStem);
			const text = await readFile(new URL(file, AGENTS), "utf8");
			return { file, version, name, pinned: name && pins[name], text };
		}),
	);
}

/** The file paths cited in code spans of a facts file's text. */
function citedPaths(text: string): string[] {
	const spans = [...text.matchAll(/`([^`\n]+)`/g)].map(([, span]) => span);
	return [...new Set(spans.filter((span) => SOURCE_PATH.test(span)))];
}

/** Where a path cited in package `name`'s facts lives: the repository, a named package, or `name`. */
function resolveCited(path: string, name: string): URL {
	if (path.startsWith("./")) return new URL(path, ROOT);
	if (path.startsWith("@")) return new URL(`node_modules/${path}`, ROOT);
	return new URL(`node_modules/${name}/${path}`, ROOT);
}

describe("package facts", () => {
	it("are found for EmDash and Lucide, each citing source files", async () => {
		const facts = await factsFiles();
		const names = facts.map(({ name }) => name);
		assert.ok(names.includes("emdash") && names.includes("@lucide/astro"), names.join(", "));
		const uncited = facts
			.filter(({ text }) => citedPaths(text).length === 0)
			.map(({ file }) => file);
		assert.deepEqual(uncited, []);
	});

	it("are each named for the version package.json pins", async () => {
		const stale = (await factsFiles())
			.filter(({ version, pinned }) => version !== pinned)
			.map(({ file, name, pinned }) =>
				name ? `${file}: ${name} is pinned at ${pinned}` : `${file}: no such dependency`,
			);
		assert.deepEqual(
			stale,
			[],
			"verify each fact against the pinned version, then rename the file",
		);
	});

	it("keep each code span on one line, so the check reads every cited path", async () => {
		const wrapped = (await factsFiles()).flatMap(({ file, text }) =>
			text
				.split("\n")
				.flatMap((line, index) =>
					(line.match(/`/g) ?? []).length % 2 === 1 ? [`${file}:${index + 1}`] : [],
				),
		);
		assert.deepEqual(wrapped, [], "lines whose code span runs onto the next line");
	});

	it("cite files that exist: the package's paths bare, Songhealth paths with ./", async () => {
		const missing = (await factsFiles()).flatMap(({ file, name, text }) =>
			citedPaths(text)
				.filter((path) => name === undefined || !existsSync(resolveCited(path, name)))
				.map((path) => `${file}: ${path}`),
		);
		assert.deepEqual(missing, []);
	});
});

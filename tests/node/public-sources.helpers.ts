// The public pages' source under src/, for the node tests that check how the templates are written:
// tests/node/public-icons.test.ts (#105) and tests/node/public-titles.test.ts (#145 retro).

import { readFile, readdir } from "node:fs/promises";

const SRC = new URL("../../src/", import.meta.url);

/** Block comments, which a template writes in braces; HTML comments; whole-line comments. */
const COMMENTS = /\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|^[ \t]*\/\/.*$/gm;

/** The line of `source` that `index` falls on, counted from 1. */
export function lineAt(source: string, index: number | undefined): number {
	return source.slice(0, index).split("\n").length;
}

/** `source` with `pattern`'s matches blanked out, keeping line breaks so line numbers hold. */
export function blank(source: string, pattern: RegExp): string {
	return source.replace(pattern, (match) => match.replace(/[^\n]/g, ""));
}

/**
 * The public pages' source under src/, relative to src/, with its comments blanked out: the
 * templates, the modules whose text they show, and the styles. src/plugins/ holds the Admin's
 * plugin, which is not a public page.
 */
export async function publicSources(): Promise<Array<{ file: string; source: string }>> {
	const files = (await readdir(SRC, { recursive: true })).filter(
		(file) => /\.(?:astro|ts|css)$/.test(file) && !file.startsWith("plugins/"),
	);
	return Promise.all(
		files.map(async (file) => ({
			file,
			source: blank(await readFile(new URL(file, SRC), "utf8"), COMMENTS),
		})),
	);
}

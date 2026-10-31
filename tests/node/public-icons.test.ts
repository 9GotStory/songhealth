// Icons on public pages (#105; docs/design/DESIGN.md §5).
//
// Every icon a public page shows comes from @lucide/astro, and no text stands in for one (Product
// Owner, 2026-10-31: #51 comments 6536026977, 6536052180). This test reads each template under
// src/ and fails on a text arrow (→ ↗ ← ‹ ›) or a lone "+" shown as a mark, or on an <svg> drawn
// by hand. The placeholder logo mark keeps its own <svg> until the office's logo arrives
// (DESIGN.md §5: a logo is not an icon). Comments may name a mark, so they are left out.

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";

const SRC = new URL("../../src/", import.meta.url);

/** A text arrow standing in for an icon. */
const TEXT_ARROW = /[→↗←‹›]/gu;

/** A "+" that is an element's whole text, as the Service card's icon was. */
const PLUS_MARK = /(?<=>\s*)\+(?=\s*<)/g;

/** The start of an <svg> element. */
const SVG = /<svg\b/gi;

/** The placeholder logo mark's element and the <svg> inside it (src/layouts/SiteLayout.astro). */
const PLACEHOLDER_MARK = /data-testid="placeholder-mark"[^>]*>\s*<svg\b[\s\S]*?<\/svg>/;

/** Block comments, which a template writes in braces; HTML comments; frontmatter line comments. */
const COMMENTS = /\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|^[ \t]*\/\/.*$/gm;

/** `source` with `pattern`'s matches blanked out, keeping their line breaks so line numbers hold. */
function blank(source: string, pattern: RegExp): string {
	return source.replace(pattern, (match) => match.replace(/[^\n]/g, ""));
}

/** Each template under src/, relative to src/, with its comments blanked out. */
async function templates(): Promise<Array<{ file: string; source: string }>> {
	const files = (await readdir(SRC, { recursive: true })).filter((file) => file.endsWith(".astro"));
	return Promise.all(
		files.map(async (file) => ({
			file,
			source: blank(await readFile(new URL(file, SRC), "utf8"), COMMENTS),
		})),
	);
}

/** Each match of `pattern` in the templates, as `file:line match`, once `exempt` is blanked out. */
async function found(pattern: RegExp, exempt?: RegExp): Promise<string[]> {
	const matches: string[] = [];
	for (const { file, source } of await templates()) {
		const scanned = exempt ? blank(source, exempt) : source;
		for (const match of scanned.matchAll(pattern)) {
			const line = scanned.slice(0, match.index).split("\n").length;
			matches.push(`${file}:${line} ${match[0].replace(/\s+/g, " ")}`);
		}
	}
	return matches.sort();
}

describe("public templates", () => {
	it("are read from src/", async () => {
		const files = (await templates()).map(({ file }) => file);
		assert.ok(files.includes("components/ArrowLink.astro"), files.join(", "));
	});

	it("show no text arrow (→ ↗ ← ‹ ›) as an icon", async () => {
		assert.deepEqual(await found(TEXT_ARROW), []);
	});

	it('show no lone "+" as an icon', async () => {
		assert.deepEqual(await found(PLUS_MARK), []);
	});

	it("draw no <svg> by hand, apart from the placeholder logo mark", async () => {
		assert.deepEqual(await found(SVG, PLACEHOLDER_MARK), []);
	});
});

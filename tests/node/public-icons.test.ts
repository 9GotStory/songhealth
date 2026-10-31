// Icons on public pages (#105; docs/design/DESIGN.md §5).
//
// Every icon a public page shows comes from @lucide/astro, and no text stands in for one (Product
// Owner, 2026-10-31: #51 comments 6536026977, 6536052180). This test reads the public pages' source
// under src/ and fails on a text arrow (→ ↗ ← ‹ ›) or a lone "+" shown as a mark, written as the
// character, an HTML entity or an escape, and on an <svg> drawn by hand or imported from a file.
// The placeholder logo mark keeps its own <svg> in the shell until the office's logo arrives
// (DESIGN.md §5: a logo is not an icon). Comments may name a mark, so they are left out. Each icon
// comes from its own module and has a size of 16, 20 or 24 px and shrink-0 (CODING_STANDARDS
// "Public pages"; #105 retro: four components missed shrink-0 until review).

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";

const SRC = new URL("../../src/", import.meta.url);

/**
 * A text arrow standing in for an icon: → ↗ ← ‹ ›, as the character, an HTML entity (named,
 * decimal or hex), or a JavaScript or CSS escape.
 */
const TEXT_ARROW =
	/[→↗←‹›]|&(?:rarr|nearr|larr|lsaquo|rsaquo);|&#(?:8594|8599|8592|8249|8250);|&#x(?:2192|2197|2190|2039|203a);|\\u?\{?(?:2192|2197|2190|2039|203a)/giu;

/** A "+" that is an element's whole text, standing in for an icon: the character or an entity. */
const PLUS_MARK = /(?<=>\s*)(?:\+|&plus;|&#43;|&#x2b;)(?=\s*<)/gi;

/** An <svg> drawn by hand, or an .svg file imported as a component. */
const HAND_DRAWN_SVG = /<svg\b|\bfrom\s*["'][^"']*\.svg(?:\?[^"']*)?["']/gi;

/** An import of one Lucide icon from its own module; the group is the icon's component name. */
const ICON_IMPORT = /import\s+(\w+)\s+from\s*["']@lucide\/astro\/icons\/[\w-]+["']/g;

/** An import from the package root, which re-exports every icon. */
const ROOT_IMPORT = /\bfrom\s*["']@lucide\/astro["']/g;

/** One of DESIGN.md §5's icon sizes, as the `size` prop. */
const SLOT_SIZE = /\bsize=\{(?:16|20|24)\}/;

/** shrink-0 among the classes, because a flex row squeezes an svg beside text that wraps. */
const SHRINK_0 = /\bclass="[^"]*\bshrink-0\b[^"]*"/;

/** The placeholder logo mark's element and the <svg> inside it, in the shell. */
const PLACEHOLDER_MARK = {
	file: "layouts/SiteLayout.astro",
	pattern: /data-testid="placeholder-mark"[^>]*>\s*<svg\b[\s\S]*?<\/svg>/,
};

/** Block comments, which a template writes in braces; HTML comments; whole-line comments. */
const COMMENTS = /\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|^[ \t]*\/\/.*$/gm;

/** The line of `source` that `index` falls on, counted from 1. */
function lineAt(source: string, index: number | undefined): number {
	return source.slice(0, index).split("\n").length;
}

/** `source` with `pattern`'s matches blanked out, keeping line breaks so line numbers hold. */
function blank(source: string, pattern: RegExp): string {
	return source.replace(pattern, (match) => match.replace(/[^\n]/g, ""));
}

/**
 * The public pages' source under src/, relative to src/, with its comments blanked out: the
 * templates, the modules whose text they show, and the styles. src/plugins/ holds the Admin's
 * plugin, which is not a public page.
 */
async function publicSources(): Promise<Array<{ file: string; source: string }>> {
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

/**
 * Each match of `pattern` in the public pages' source, as `file:line match`, once `exempt`'s
 * pattern is blanked out of its file.
 */
async function matchesInSources(
	pattern: RegExp,
	exempt?: { file: string; pattern: RegExp },
): Promise<string[]> {
	const matches: string[] = [];
	for (const { file, source } of await publicSources()) {
		const scanned = exempt?.file === file ? blank(source, exempt.pattern) : source;
		for (const match of scanned.matchAll(pattern)) {
			matches.push(`${file}:${lineAt(scanned, match.index)} ${match[0]}`);
		}
	}
	return matches.sort();
}

/** Each Lucide icon element in the public pages' source, as `file:line` and its start tag. */
async function iconTags(): Promise<Array<{ at: string; tag: string }>> {
	const tags: Array<{ at: string; tag: string }> = [];
	for (const { file, source } of await publicSources()) {
		for (const [, name] of source.matchAll(ICON_IMPORT)) {
			for (const match of source.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))) {
				tags.push({ at: `${file}:${lineAt(source, match.index)}`, tag: match[0] });
			}
		}
	}
	return tags;
}

describe("public pages", () => {
	it("are read from src/: templates, modules and styles", async () => {
		const files = (await publicSources()).map(({ file }) => file);
		for (const file of ["components/ArrowLink.astro", "lib/navigation.ts", "styles/global.css"]) {
			assert.ok(files.includes(file), `${file} in ${files.join(", ")}`);
		}
	});

	it("show no text arrow (→ ↗ ← ‹ ›) as an icon", async () => {
		assert.deepEqual(await matchesInSources(TEXT_ARROW), []);
	});

	it('show no lone "+" as an icon', async () => {
		assert.deepEqual(await matchesInSources(PLUS_MARK), []);
	});

	it("draw no <svg> by hand, apart from the placeholder logo mark", async () => {
		assert.deepEqual(await matchesInSources(HAND_DRAWN_SVG, PLACEHOLDER_MARK), []);
	});

	it("import each Lucide icon from its own module", async () => {
		assert.deepEqual(await matchesInSources(ROOT_IMPORT), []);
	});

	it("give each Lucide icon a size of 16, 20 or 24 px and shrink-0", async () => {
		const tags = await iconTags();
		assert.ok(tags.length > 0, "the icons are found");
		const off = tags
			.filter(({ tag }) => !SLOT_SIZE.test(tag) || !SHRINK_0.test(tag))
			.map(({ at, tag }) => `${at} ${tag}`);
		assert.deepEqual(off, []);
	});
});

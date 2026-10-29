// CMS images on public pages (#55 retro; CODING_STANDARDS "Public pages").
//
// Admin can delete a media item that content still uses, and EmDash's Image then renders a broken
// picture (emdash 1.1.0 src/api/handlers/media.ts handleMediaDelete has no in-use guard). So a
// source file that renders EmDash's Image also asks src/lib/media.ts availableMedia() first. This
// test reads the source: every file that imports Image from "emdash/ui" imports availableMedia.

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";

const SRC = new URL("../../src/", import.meta.url);

/** An import of EmDash's Image component (not PTImage, not the ImageValue type). */
const IMPORTS_IMAGE = /import\s*\{[^}]*\bImage\b[^}]*\}\s*from\s*["']emdash\/ui["']/;

/** An import of the media check from src/lib/media.ts. */
const IMPORTS_CHECK = /import\s*\{[^}]*\bavailableMedia\b[^}]*\}\s*from\s*["'][./]*lib\/media["']/;

/** The src/ files, relative to src/, that render EmDash's Image, each with whether it checks. */
async function imageRenderers(): Promise<Array<{ file: string; checks: boolean }>> {
	const files = (await readdir(SRC, { recursive: true })).filter((file) =>
		/\.(astro|ts)$/.test(file),
	);
	const renderers = [];
	for (const file of files) {
		const source = await readFile(new URL(file, SRC), "utf8");
		if (IMPORTS_IMAGE.test(source)) renderers.push({ file, checks: IMPORTS_CHECK.test(source) });
	}
	return renderers;
}

describe("CMS images on public pages", () => {
	it("finds the files that render EmDash's Image", async () => {
		const files = (await imageRenderers()).map(({ file }) => file);
		assert.ok(files.includes("components/ContentCard.astro"), files.join(", "));
	});

	it("checks the media of every image it renders with availableMedia() first", async () => {
		const unchecked = (await imageRenderers())
			.filter(({ checks }) => !checks)
			.map(({ file }) => file);
		assert.deepEqual(unchecked, [], "these files render EmDash's Image without availableMedia()");
	});
});

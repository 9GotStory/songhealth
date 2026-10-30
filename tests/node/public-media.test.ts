// CMS images on public pages (#55 retro, #59; CODING_STANDARDS "Public pages").
//
// Admin can delete a media item that content still uses, and EmDash's Image then renders a broken
// picture (emdash 1.1.0 src/api/handlers/media.ts handleMediaDelete has no in-use guard). So a
// source file that renders EmDash's Image also asks src/lib/media.ts availableMedia() first, and
// one that renders a rich-text body with EmDash's PortableText, whose image and gallery blocks
// render the same way, passes the body through availableBody() first. This test reads the source:
// every file that imports Image from "emdash/ui" imports availableMedia, and every file that
// imports PortableText from "emdash/ui" imports availableBody.

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";

const SRC = new URL("../../src/", import.meta.url);

/** An import of EmDash's Image component (not PTImage, not the ImageValue type). */
const IMPORTS_IMAGE = /import\s*\{[^}]*\bImage\b[^}]*\}\s*from\s*["']emdash\/ui["']/;

/** An import of EmDash's rich-text renderer. */
const IMPORTS_PORTABLE_TEXT = /import\s*\{[^}]*\bPortableText\b[^}]*\}\s*from\s*["']emdash\/ui["']/;

/** An import of the media check named `checkName` from src/lib/media.ts. */
function importsCheck(checkName: string): RegExp {
	return new RegExp(
		`import\\s*\\{[^}]*\\b${checkName}\\b[^}]*\\}\\s*from\\s*["'][./]*lib\\/media["']`,
	);
}

/**
 * The src/ files, relative to src/, whose source matches `rendererImport`, each with whether it
 * also imports the media check named `checkName`.
 */
async function renderersOf(
	rendererImport: RegExp,
	checkName: string,
): Promise<Array<{ file: string; checks: boolean }>> {
	const files = (await readdir(SRC, { recursive: true })).filter((file) =>
		/\.(astro|ts)$/.test(file),
	);
	const renderers = [];
	for (const file of files) {
		const source = await readFile(new URL(file, SRC), "utf8");
		if (rendererImport.test(source)) {
			renderers.push({ file, checks: importsCheck(checkName).test(source) });
		}
	}
	return renderers;
}

const imageRenderers = () => renderersOf(IMPORTS_IMAGE, "availableMedia");
const bodyRenderers = () => renderersOf(IMPORTS_PORTABLE_TEXT, "availableBody");

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

describe("rich-text bodies on public pages", () => {
	it("finds the files that render EmDash's PortableText", async () => {
		const files = (await bodyRenderers()).map(({ file }) => file);
		assert.ok(files.includes("components/RichText.astro"), files.join(", "));
	});

	it("passes every body it renders through availableBody() first", async () => {
		const unchecked = (await bodyRenderers())
			.filter(({ checks }) => !checks)
			.map(({ file }) => file);
		assert.deepEqual(
			unchecked,
			[],
			"these files render EmDash's PortableText without availableBody()",
		);
	});
});

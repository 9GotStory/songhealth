// CMS images on public pages (#55 retro, #59; CODING_STANDARDS "Public pages").
//
// Admin can delete a media item that content still uses, and EmDash's Image then renders a broken
// picture (emdash 1.1.0 src/api/handlers/media.ts handleMediaDelete has no in-use guard). So a
// source file that renders EmDash's Image also asks src/lib/media.ts availableMedia() first, and
// one that renders a rich-text body with EmDash's PortableText, whose image and gallery blocks
// render the same way, passes the body through availableBody() first. This test reads the source:
// every file that imports Image from "emdash/ui" imports availableMedia, and every file that
// imports PortableText from "emdash/ui" imports availableBody.
//
// A picture cropped to its box takes no placeholder (#298). EmDash's Image writes its blurhash
// placeholder, which has no closing `;`, and the focal point's `object-position` as one inline
// declaration, which browsers drop, so with the placeholder the crop leaves the focal point staff
// set (emdash 1.1.0 src/components/EmDashImage.astro resolveImage; docs/agents/emdash-1.1.0.md
// "Media"). So every <Image> whose classes crop it with `object-cover` passes
// `placeholder={false}`.

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";

import { lineAt, publicSources } from "./public-sources.helpers.ts";

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

/**
 * The <Image> tags in `source`, each with where it starts: from `<Image` to the `>` that closes
 * the tag, past the braces and quotes of its attributes, which may hold a `>` of their own.
 */
function imageTags(source: string): Array<{ tag: string; index: number }> {
	const tags = [];
	for (const { index } of source.matchAll(/<Image(?=[\s/>])/g)) {
		let depth = 0;
		let quote: string | undefined;
		let end = index;
		for (; end < source.length; end += 1) {
			const character = source[end]!;
			if (quote !== undefined) {
				if (character === quote) quote = undefined;
			} else if (character === '"' || character === "'" || character === "`") quote = character;
			else if (character === "{") depth += 1;
			else if (character === "}") depth -= 1;
			else if (character === ">" && depth === 0) break;
		}
		tags.push({ tag: source.slice(index, end + 1), index });
	}
	return tags;
}

/** Whether the <Image> `tag` crops its picture and keeps EmDash's placeholder. */
function cropsWithPlaceholder(tag: string): boolean {
	return /\bobject-cover\b/.test(tag) && !/\bplaceholder=\{false\}/.test(tag);
}

describe("a CMS picture cropped to its box", () => {
	it("finds the pictures that are cropped", async () => {
		const cropped = [];
		for (const { file, source } of await publicSources()) {
			if (imageTags(source).some(({ tag }) => /\bobject-cover\b/.test(tag))) cropped.push(file);
		}
		assert.ok(cropped.includes("components/ContentCard.astro"), cropped.join(", "));
	});

	it("takes no placeholder, so its crop follows the picture's focal point", async () => {
		const found: string[] = [];
		for (const { file, source } of await publicSources()) {
			for (const { tag, index } of imageTags(source)) {
				if (cropsWithPlaceholder(tag)) found.push(`${file}:${lineAt(source, index)}`);
			}
		}
		assert.deepEqual(found, [], "these cropped pictures keep EmDash's placeholder");
	});

	it("is told apart from a picture shown whole and from one that takes no placeholder", () => {
		const [cropped, portrait, whole, plain] = imageTags(
			[
				'<Image image={image} alt="" class="aspect-square w-full object-cover" />',
				'<Image image={a > b ? a : b} class:list={[picture, "object-cover object-top"]} />',
				'<Image image={image} priority class="h-auto w-full rounded-18" />',
				'<Image image={image} placeholder={false} class="size-full object-cover" />',
				'<ImageFrame class="object-cover" />',
			].join("\n"),
		).map(({ tag }) => tag);
		assert.equal(cropsWithPlaceholder(cropped!), true);
		assert.match(
			portrait!,
			/object-top"\]\} \/>$/,
			"a `>` inside an attribute does not end the tag",
		);
		assert.equal(cropsWithPlaceholder(portrait!), true);
		assert.equal(cropsWithPlaceholder(whole!), false);
		assert.equal(cropsWithPlaceholder(plain!), false);
	});
});

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
// "Media"). So every <Image> passes `placeholder={false}`, unless its classes are written out in
// the tag as one string that does not crop it with `object-cover`: classes held in a constant, a
// list or a prop may crop it, where this test cannot read them.

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";

import { lineAt, publicSources } from "./public-sources.helpers.ts";

const SRC = new URL("../../src/", import.meta.url);

/** An import of EmDash's Image component (not PTImage, not the ImageValue type). */
const IMPORTS_IMAGE = /import\s*\{[^}]*\bImage\b[^}]*\}\s*from\s*["']emdash\/ui["']/;

/** The name a file gives EmDash's Image when it imports it under another one. */
const IMAGE_ALIAS = /import\s*\{[^}]*\bImage\s+as\s+(\w+)[^}]*\}\s*from\s*["']emdash\/ui["']/;

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
 * The tags of EmDash's Image in `source`, each with where it starts: from `<Image`, or the name
 * the file imports it under, to the `>` that closes the tag, past the braces and quotes of its
 * attributes, which may hold a `>` of their own.
 */
function imageTags(source: string): Array<{ tag: string; index: number }> {
	const name = IMAGE_ALIAS.exec(source)?.[1] ?? "Image";
	const tags = [];
	for (const { index } of source.matchAll(new RegExp(`<${name}(?=[\\s/>])`, "g"))) {
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

/**
 * Whether the Image `tag` may crop its picture: its classes name `object-cover`, or some of them
 * are not written in the tag, in a list, an expression or attributes spread into it.
 */
function mayCrop(tag: string): boolean {
	return /\bobject-cover\b/.test(tag) || /\sclass:list=|\sclass=\{|\{\.\.\./.test(tag);
}

/** Whether the Image `tag` may crop its picture and keeps EmDash's placeholder. */
function cropsWithPlaceholder(tag: string): boolean {
	return mayCrop(tag) && !/\bplaceholder=\{false\}/.test(tag);
}

describe("a CMS picture cropped to its box", () => {
	it("finds the pictures that are cropped", async () => {
		const cropped = [];
		for (const { file, source } of await publicSources()) {
			if (imageTags(source).some(({ tag }) => mayCrop(tag))) cropped.push(file);
		}
		// A class written in the tag, and one in a list beside a constant.
		for (const file of ["components/ContentCard.astro", "components/HomeLeadershipStrip.astro"]) {
			assert.ok(cropped.includes(file), `${file} is not among ${cropped.join(", ")}`);
		}
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
		const tags = imageTags(
			[
				'<Image image={image} alt="" class="aspect-square w-full object-cover" />',
				'<Image image={a > b ? a : b} class:list={[picture, "object-top"]} />',
				"<Image image={image} class={pictureClass} />",
				"<Image image={image} {...attrs} />",
				'<Image image={image} priority class="h-auto w-full rounded-18" />',
				'<Image image={image} placeholder={false} class="size-full object-cover" />',
				'<ImageFrame class="object-cover" />',
			].join("\n"),
		).map(({ tag }) => tag);
		assert.equal(tags.length, 6, "a component whose name starts with Image is not EmDash's");
		assert.match(
			tags[1]!,
			/object-top"\]\} \/>$/,
			"a `>` inside an attribute does not end the tag",
		);
		assert.deepEqual(tags.map(cropsWithPlaceholder), [true, true, true, true, false, false]);
	});

	it("reads the pictures of a file that imports Image under another name", () => {
		const source = [
			'import { Image as Picture } from "emdash/ui";',
			'<Picture image={image} class="object-cover" />',
		].join("\n");
		assert.deepEqual(
			imageTags(source).map(({ tag }) => cropsWithPlaceholder(tag)),
			[true],
		);
	});
});

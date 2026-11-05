// Headings on public pages (#145 retro; spec #144 "Shared: Thai titles keep compound words whole").
//
// Every heading a public page shows renders its text through src/components/ThaiTitle.astro, which
// keeps the listed Thai compound words on one line: an <h1>–<h6> element, or the <Heading> tag that
// a card or row component picks its level with. A rich-text body's own heading is body text:
// BodyHeading.astro renders the block it is given through its slot. This test reads the templates
// under src/ and fails on a heading whose content has no <ThaiTitle>. ThaiTitle also renders titles
// that are no heading, such as the site title in the header and a Quick Link card's label, and
// review checks those (CODING_STANDARDS "Public pages").

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lineAt, publicSources } from "./public-sources.helpers.ts";

/** A heading element and its content: an <h1>–<h6>, or a component's <Heading> tag. */
const HEADING = /<(h[1-6]|Heading)\b[^>]*>([\s\S]*?)<\/\1>/g;

/** The rich-text heading: it renders its block through a slot (src/components/RichText.astro). */
const BODY_HEADING = "components/BodyHeading.astro";

/** Each heading in the templates, by its file, its `file:line` and its content. */
async function headings(): Promise<Array<{ file: string; at: string; content: string }>> {
	const found: Array<{ file: string; at: string; content: string }> = [];
	for (const { file, source } of await publicSources()) {
		if (!file.endsWith(".astro")) continue;
		for (const match of source.matchAll(HEADING)) {
			found.push({ file, at: `${file}:${lineAt(source, match.index)}`, content: match[2] });
		}
	}
	return found;
}

describe("headings on public pages", () => {
	it("are read from the templates, the components' <Heading> tags included", async () => {
		const files = new Set((await headings()).map(({ file }) => file));
		for (const file of [
			"components/PageHeading.astro",
			"components/ActivityCard.astro",
			"pages/index.astro",
			BODY_HEADING,
		]) {
			assert.ok(files.has(file), `a heading in ${file}`);
		}
	});

	it("render their text through ThaiTitle, apart from the rich-text heading", async () => {
		const plain = (await headings())
			.filter(({ file, content }) => file !== BODY_HEADING && !content.includes("<ThaiTitle"))
			.map(({ at, content }) => `${at} ${content.trim()}`);
		assert.deepEqual(plain, []);
	});
});

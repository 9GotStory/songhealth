// docs/design/DESIGN.md's change history (#342 retro, #343 retro).
//
// CODING_STANDARDS "Documents" gives each ticket that changes DESIGN.md one entry in §13's change
// history, with its authority, and keeps history out of the body. The header's "Updated:" line
// names the ticket that last changed the document, and #342 changed nine of its sections and left
// §13 without its entry until the review. So the ticket the header names has a §13 entry whose
// bold heading names it too. #343's entry left out §3.2, which cites the ticket, and §9.6 told
// the page before #343: so each section that cites that ticket is named in its entry, and no
// section before §13 says "Before #N".

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const read = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

/** DESIGN.md's text before §13, its §13, and the ticket its Updated line names. */
async function designParts() {
	const design = await read("docs/design/DESIGN.md");
	const ticket = design
		.match(/^> \*\*Updated:\*\* [^\n]*\(([^)\n]*#\d+)\)/m)?.[1]
		?.match(/#\d+/)?.[0];
	assert.ok(ticket, "the header's Updated line names a ticket, as (#N)");
	const start = design.search(/^## 13\. /m);
	assert.ok(start > 0, "DESIGN.md has its §13");
	return { body: design.slice(0, start), history: design.slice(start), ticket };
}

describe("DESIGN.md's change history", () => {
	it("has a §13 entry for the ticket its Updated line names", async () => {
		const { history, ticket } = await designParts();
		const headings = [...history.matchAll(/^- \*\*(v[^*]+)\*\*/gm)].map(([, heading]) => heading!);
		assert.ok(
			headings.some((heading) => new RegExp(`${ticket}\\b`).test(heading)),
			`no §13 entry's heading names ${ticket}, the ticket the Updated line names`,
		);
	});

	it("names in that entry each section that cites the ticket", async () => {
		const { body, history, ticket } = await designParts();
		const entry = history
			.split(/^(?=- \*\*v)/m)
			.find((item) => new RegExp(`^- \\*\\*v[^*]*${ticket}\\b`).test(item));
		assert.ok(entry, `a §13 entry names ${ticket}`);
		const named = new Set([...entry.matchAll(/§(\d+(?:\.\d+)?)/g)].map(([, section]) => section!));
		// Each numbered section's text runs to the next numbered heading.
		const sections = body.split(/^(?=#{2,3} \d)/m).slice(1);
		const citing = sections
			.map((text) => ({ text, number: text.match(/^#{2,3} (\d+(?:\.\d+)?)/)![1]! }))
			.filter(({ text }) => new RegExp(`${ticket}\\b`).test(text))
			.map(({ number }) => number);
		const unnamed = citing.filter(
			(number) => !named.has(number) && !named.has(number.split(".")[0]!),
		);
		assert.deepEqual(unnamed, [], `§13's ${ticket} entry names each section that cites it`);
	});

	it("keeps the history out of the sections before §13", async () => {
		const { body } = await designParts();
		assert.deepEqual(body.match(/\bBefore #\d+[^\n]*/g) ?? [], []);
	});
});

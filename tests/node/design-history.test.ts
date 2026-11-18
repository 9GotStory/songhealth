// docs/design/DESIGN.md's change history (#342 retro).
//
// CODING_STANDARDS "Documents" gives each ticket that changes DESIGN.md one entry in §13's change
// history, with its authority. The header's "Updated:" line names the ticket that last changed
// the document, and #342 changed nine of its sections and left §13 without its entry until the
// review. So the ticket the header names has a §13 entry whose bold heading names it too.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const read = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

describe("DESIGN.md's change history", () => {
	it("has a §13 entry for the ticket its Updated line names", async () => {
		const design = await read("docs/design/DESIGN.md");
		const ticket = design
			.match(/^> \*\*Updated:\*\* [^\n]*\(([^)\n]*#\d+)\)/m)?.[1]
			?.match(/#\d+/)?.[0];
		assert.ok(ticket, "the header's Updated line names a ticket, as (#N)");
		const history = design.slice(design.search(/^## 13\. /m));
		assert.ok(history.startsWith("## 13."), "DESIGN.md has its §13");
		const headings = [...history.matchAll(/^- \*\*(v[^*]+)\*\*/gm)].map(([, heading]) => heading!);
		assert.ok(
			headings.some((heading) => new RegExp(`${ticket}\\b`).test(heading)),
			`no §13 entry's heading names ${ticket}, the ticket the Updated line names`,
		);
	});
});

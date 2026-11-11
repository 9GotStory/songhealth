// The stylesheet's utilities and docs/design/DESIGN.md (#241 retro).
//
// DESIGN.md §3 rule 3 lists what src/styles/global.css holds besides the tokens. A utility added
// to the stylesheet without that list left it one feature behind: after #240 it still read "two
// utilities" while the stylesheet held four. So every `@utility` of the stylesheet is named in
// rule 3, as a code span.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const read = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

/** DESIGN.md §3's rule 3: from its number to the next rule's. */
const RULE_3 = /^3\. Templates style with utility classes[\s\S]*?(?=^4\. )/m;

describe("the stylesheet's utilities", () => {
	it("are each named in DESIGN.md §3 rule 3", async () => {
		const [stylesheet, design] = await Promise.all([
			read("src/styles/global.css"),
			read("docs/design/DESIGN.md"),
		]);
		const rule = design.match(RULE_3)?.[0];
		assert.ok(rule, "DESIGN.md §3 has its rule 3 on the stylesheet");
		const utilities = [...stylesheet.matchAll(/^@utility\s+([\w-]+)/gm)].map(([, name]) => name!);
		assert.ok(utilities.length > 0, "the stylesheet defines utilities");
		assert.deepEqual(
			utilities.filter((name) => !rule.includes(`\`${name}\``)),
			[],
			"utilities of src/styles/global.css that DESIGN.md §3 rule 3 does not name",
		);
	});
});

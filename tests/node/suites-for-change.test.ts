// The browser suites a change brings in (#339 retro): scripts/suites-for-change/plan.ts, which
// scripts/suites-for-change.ts feeds the changed paths and the files' text.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { addressOf, suitesFor, type SourceFile } from "../../scripts/suites-for-change/plan.ts";

describe("addressOf", () => {
	it("reads a page's address, an index as its folder and a [slug] part as any address under it", () => {
		assert.equal(addressOf("src/pages/index.astro"), "/");
		assert.equal(addressOf("src/pages/health/index.astro"), "/health");
		assert.equal(addressOf("src/pages/contact.astro"), "/contact");
		assert.equal(addressOf("src/pages/services/[slug].astro"), "/services/");
		assert.equal(addressOf("src/pages/rss.xml.ts"), "/rss.xml");
		assert.equal(addressOf("src/components/ListHeading.astro"), undefined);
	});
});

describe("suitesFor", () => {
	const sources: SourceFile[] = [
		{ path: "src/components/Tile.astro", text: "<a />" },
		{ path: "src/components/Grid.astro", text: 'import Tile from "./Tile.astro";' },
		{
			path: "src/pages/health/index.astro",
			text: 'import Grid from "../../components/Grid.astro";',
		},
		{
			path: "src/pages/services/[slug].astro",
			text: 'import Tile from "../../components/Tile.astro";',
		},
		{ path: "src/lib/dates.ts", text: "" },
	];
	const suites: SourceFile[] = [
		{ path: "tests/browser/a.spec.ts", text: 'await page.goto("/health");' },
		{ path: "tests/browser/b.spec.ts", text: 'for (const path of ["/health/content"]) {}' },
		{ path: "tests/browser/c.spec.ts", text: "await page.goto(`/services/${slug}`);" },
		{ path: "tests/browser/d.spec.ts", text: 'await page.goto("/health?page=2");' },
	];

	it("brings in the suites that name a page importing the component, through another component", () => {
		assert.deepEqual(suitesFor(["src/components/Tile.astro"], sources, suites), {
			suites: [
				{ path: "tests/browser/a.spec.ts", because: ["/health"] },
				{ path: "tests/browser/c.spec.ts", because: ["/services/"] },
				{ path: "tests/browser/d.spec.ts", because: ["/health"] },
			],
			unmatched: [],
		});
	});

	it("lists an edited suite, and a source file that brings in none to read by hand", () => {
		assert.deepEqual(
			suitesFor(["tests/browser/b.spec.ts", "src/lib/dates.ts", "README.md"], sources, suites),
			{
				suites: [{ path: "tests/browser/b.spec.ts", because: ["edited"] }],
				unmatched: ["src/lib/dates.ts"],
			},
		);
	});

	it("brings in public-homepage-curation.spec.ts for #339's change to HomeQuickLink", () => {
		const under = (dir: string, keep: (name: string) => boolean) =>
			readdirSync(dir, { recursive: true, encoding: "utf8" })
				.filter(keep)
				.map((name) => join(dir, name))
				.map((path) => ({ path, text: readFileSync(path, "utf8") }));
		const { suites: found } = suitesFor(
			["src/components/HomeQuickLink.astro"],
			under("src", (name) => /\.(astro|ts)$/.test(name)),
			under("tests/browser", (name) => name.endsWith(".spec.ts")),
		);
		const curation = found.find((suite) => suite.path.endsWith("public-homepage-curation.spec.ts"));
		assert.deepEqual(curation?.because, ["/", "/health"]);
	});
});

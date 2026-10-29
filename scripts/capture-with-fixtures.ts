// Pull-request screenshots of public pages that need content to show: make synthetic content
// through the native API, capture it with capture-screenshots.mjs, then remove everything that
// was made, even when a step fails (scripts/fixture-kit.ts).
//
//   scripts/dev-runtime-env.sh \
//     node scripts/capture-with-fixtures.ts scripts/screenshot-fixtures/<name>.ts <out-dir>
//
// A fixtures module's default export receives a FixtureKit and returns the paths to capture. A
// path with a synthetic slug comes with a name, which names its screenshot files.
// Titles start with "[ตัวอย่าง]", like the demo dataset.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { withFixtureKit, type FixtureKit } from "./fixture-kit.ts";

export type { FixtureKit };

/** A page to capture: a path, or a path with the name its screenshot files take. */
export type Capture = string | { name: string; path: string };

export type Fixtures = (kit: FixtureKit) => Promise<Capture[]>;

const [fixturesPath, outDir] = process.argv.slice(2);
if (fixturesPath === undefined || outDir === undefined) {
	console.error("usage: node scripts/capture-with-fixtures.ts <fixtures-module> <out-dir>");
	process.exit(2);
}

await withFixtureKit(async (kit) => {
	const fixtures = (await import(pathToFileURL(resolve(fixturesPath)).href)).default as Fixtures;
	const targets = (await fixtures(kit)).map((page) =>
		typeof page === "string" ? page : `${page.name}=${page.path}`,
	);
	const capture = spawnSync("node", ["scripts/capture-screenshots.mjs", outDir, ...targets], {
		stdio: "inherit",
	});
	if (capture.status !== 0) throw new Error("capture-screenshots.mjs failed");
});

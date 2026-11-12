// Pull-request screenshots of public pages that need content to show: make synthetic content
// through the native API, capture it with capture-screenshots.mjs, then remove everything that
// was made, even when a step fails (scripts/fixture-kit.ts).
//
//   scripts/dev-runtime-env.sh \
//     node scripts/capture-with-fixtures.ts scripts/screenshot-fixtures/<name>.ts <out-dir> \
//     [<selector>]
//
// With a selector, each page the module returns at one width ("path@width") is captured as a
// close-up of the first element the selector matches, such as one Homepage section, to look at a
// part of a long page (#243 retro).
//
// scripts/evidence-branch.sh then puts the screenshots on an image-only branch for the PR.
//
// The screenshots go to a public branch, so before anything is made the fixtures module is read
// for Legacy site content, as a commit is (.githooks/pre-commit): while the newest export is on
// this machine, `scripts/migration.ts leak-check` must pass it (#245 retro: a title taken from the
// prototype's real content was caught at the commit, after the before screenshots).
//
// A fixtures module's default export receives a FixtureKit and returns the paths to capture. A
// path with a synthetic slug comes with a name, which names its screenshot files.
// Titles start with "[ตัวอย่าง]", like the demo dataset.

import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { withFixtureKit, type FixtureKit } from "./fixture-kit.ts";

export type { FixtureKit };

/**
 * A page to capture: a target of capture-screenshots.mjs, such as a path, or one with the name its
 * screenshot files take. Its path may end in that script's suffixes: "@width", "@width>selector"
 * or "!text".
 */
export type Capture = string | { name: string; path: string };

export type Fixtures = (kit: FixtureKit) => Promise<Capture[]>;

const [fixturesPath, outDir, selector] = process.argv.slice(2);
if (fixturesPath === undefined || outDir === undefined) {
	console.error(
		"usage: node scripts/capture-with-fixtures.ts <fixtures-module> <out-dir> [<selector>]",
	);
	process.exit(2);
}

/** The folder the Legacy site's exports stay in, outside the repository (ADR 0008). */
const EXPORTS = join(homedir(), ".local/state/songhealth-migration");
/** The newest export, whose dated name sorts last, when this machine has one. */
const newestExport = existsSync(EXPORTS)
	? readdirSync(EXPORTS)
			.filter((name) => /^WordPress\..*\.xml$/.test(name))
			.sort()
			.at(-1)
	: undefined;
if (newestExport !== undefined && existsSync("scripts/migration.ts")) {
	const check = spawnSync(
		"node",
		["scripts/migration.ts", "leak-check", join(EXPORTS, newestExport), fixturesPath],
		{ stdio: "inherit" },
	);
	if (check.status !== 0) {
		console.error("capture-with-fixtures: the fixtures module holds Legacy site content");
		process.exit(1);
	}
}

/** `path` as a close-up of the selector's element, which a path at one width alone can be. */
function closeUp(path: string): string {
	if (selector === undefined) return path;
	if (!/@\d+$/.test(path)) throw new Error(`a selector needs a path at one width: ${path}`);
	return `${path}>${selector}`;
}

await withFixtureKit(async (kit) => {
	const fixtures = (await import(pathToFileURL(resolve(fixturesPath)).href)).default as Fixtures;
	const targets = (await fixtures(kit)).map((page) =>
		typeof page === "string" ? closeUp(page) : `${page.name}=${closeUp(page.path)}`,
	);
	// The capture runs while this process waits without blocking. A blocked event loop never sees the
	// runtime close its idle keep-alive connections, so the cleanup's first request went out on a
	// closed one and failed ("fetch failed"), leaving that entry behind (#64).
	const capture = spawn("node", ["scripts/capture-screenshots.mjs", outDir, ...targets], {
		stdio: "inherit",
	});
	const [code] = await once(capture, "exit");
	if (code !== 0) throw new Error("capture-screenshots.mjs failed");
});

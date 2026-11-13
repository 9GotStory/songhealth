// scripts/capture-screenshots.mjs and a window (#240 retro; docs/operations/development-quadlet.md
// "A window"). While a window holds the runtime its pages show the window's content, so the script
// stops before it opens a browser. Each case runs the command with a home folder of its own.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const SCRIPT = join(import.meta.dirname, "../../scripts/capture-screenshots.mjs");

/** Run the command with `args` in a home folder that holds a window's lock, or none. */
async function capture(args: string[], lock?: string) {
	const home = await mkdtemp(join(tmpdir(), "songhealth-capture-"));
	try {
		const state = join(home, ".local/state/songhealth-qdev");
		await mkdir(state, { recursive: true });
		if (lock !== undefined) await writeFile(join(state, "window"), `${lock}\n`);
		const out = join(home, "out");
		const run = spawnSync(
			process.execPath,
			[SCRIPT, ...args.map((arg) => arg.replace("OUT", out))],
			{
				env: { ...process.env, HOME: home },
				encoding: "utf8",
			},
		);
		const written = await readdir(out).catch(() => []);
		return { status: run.status, stderr: run.stderr, written };
	} finally {
		await rm(home, { recursive: true, force: true });
	}
}

describe("the screenshot command and a window", () => {
	it("stops while a window holds the runtime, names the window and writes nothing", async () => {
		const run = await capture(["OUT", "/"], "#1: a synthetic window (opened 2026-01-01T00:00:00Z)");
		assert.equal(run.status, 1);
		assert.match(run.stderr, /a window holds the runtime: #1: a synthetic window/);
		assert.deepEqual(run.written, []);
	});

	it("goes on past the window for its holder, who passes --in-window", async () => {
		// With no target it stops at its usage, which comes after the window check.
		const run = await capture(["--in-window"], "#1: a synthetic window");
		assert.equal(run.status, 2);
		assert.match(run.stderr, /^usage: /);
	});

	it("goes on with no window open", async () => {
		const run = await capture([]);
		assert.equal(run.status, 2);
		assert.match(run.stderr, /^usage: /);
	});
});

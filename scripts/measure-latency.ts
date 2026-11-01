// Latency evidence for a list that reads more than one page (ADR 0002 search, ADR 0004 dated
// lists): the median, p95 and slowest of repeated anonymous requests for each path, first on the
// runtime as it is, then with the fixtures module's synthetic content, which is removed afterwards
// (scripts/fixture-kit.ts).
//
//   scripts/dev-runtime-env.sh \
//     node scripts/measure-latency.ts scripts/latency-fixtures/<name>.ts [runs]
//
// A fixtures module exports `paths`, the addresses to time, and a default export that receives a
// FixtureKit and makes the content. Each path is requested 3 times to warm up and then `runs`
// times (50 by default), one at a time. The development runtime serves `astro dev`, so the
// numbers are development evidence, not production's.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { ORIGIN, withFixtureKit, type FixtureKit } from "./fixture-kit.ts";

export interface LatencyFixtures {
	paths: string[];
	default: (kit: FixtureKit) => Promise<void>;
}

const [fixturesPath, runsArg] = process.argv.slice(2);
if (fixturesPath === undefined) {
	console.error("usage: node scripts/measure-latency.ts <fixtures-module> [runs]");
	process.exit(2);
}
const RUNS = Number(runsArg ?? 50);
const WARM_UP = 3;

/** One request's time in milliseconds, its body read to the end. */
async function timeOf(path: string): Promise<number> {
	const started = performance.now();
	const response = await fetch(ORIGIN + path);
	await response.text();
	if (response.status !== 200) throw new Error(`${path} answered ${response.status}`);
	return performance.now() - started;
}

/** The median, p95 and slowest of `RUNS` requests for each path, in whole milliseconds. */
async function measure(paths: string[]) {
	const rows = [];
	for (const path of paths) {
		for (let i = 0; i < WARM_UP; i += 1) await timeOf(path);
		const times: number[] = [];
		for (let i = 0; i < RUNS; i += 1) times.push(await timeOf(path));
		times.sort((a, b) => a - b);
		const at = (q: number) => Math.round(times[Math.ceil(q * times.length) - 1]);
		rows.push({ path, median: at(0.5), p95: at(0.95), max: at(1) });
	}
	return rows;
}

const fixtures = (await import(pathToFileURL(resolve(fixturesPath)).href)) as LatencyFixtures;
const before = await measure(fixtures.paths);
const after = await withFixtureKit(async (kit) => {
	await fixtures.default(kit);
	return measure(fixtures.paths);
});
console.log(`| Path | As it was: median / p95 / max | With the fixtures: median / p95 / max |`);
console.log(`|---|---|---|`);
for (const [index, row] of after.entries()) {
	const was = before[index];
	console.log(
		`| \`${row.path}\` | ${was.median} / ${was.p95} / ${was.max} ms | ${row.median} / ${row.p95} / ${row.max} ms |`,
	);
}

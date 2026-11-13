// The pages opened on the development runtime since a time, read from the app's log (#250 retro):
// what a walkthrough's record can say a person opened.
//
//   node scripts/dev-runtime-opened.ts <since, such as 2026-11-13T01:42:00Z or 10m>
//
// It prints each page a request named, then the stretches where / was asked for more often than
// the container's health check asks (scripts/opened-pages/plan.ts). Read-only. The log holds
// every client's requests, a browser suite's too, and neither query strings nor window widths.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { openedPages } from "./opened-pages/plan.ts";

const since = process.argv[2];
if (since === undefined) {
	console.error("usage: node scripts/dev-runtime-opened.ts <since>");
	process.exit(2);
}
const unit = readFileSync(
	new URL("../deploy/dev-quadlet/songhealth-dev-app.container", import.meta.url),
	"utf8",
);
const interval = Number(/^HealthInterval=(\d+)s$/m.exec(unit)?.[1]);
const container = /^ContainerName=(\S+)$/m.exec(unit)?.[1];
if (!Number.isFinite(interval) || container === undefined) {
	console.error("dev-runtime-opened: the app's unit names no HealthInterval or ContainerName");
	process.exit(2);
}
const logs = spawnSync("podman", ["logs", "--timestamps", "--since", since, container], {
	encoding: "utf8",
	maxBuffer: 256 * 1024 * 1024,
});
if (logs.status !== 0) {
	console.error(`dev-runtime-opened: podman logs failed\n${logs.stderr}`);
	process.exit(1);
}
const lines = `${logs.stdout}\n${logs.stderr}`.replace(/\x1b\[[0-9;]*m/g, "").split("\n");
const { pages, homepage } = openedPages(lines, interval);
for (const page of pages) console.log(`${page.at} [${page.status}] ${page.path}`);
for (const stretch of homepage) {
	console.log(
		`${stretch.from} to ${stretch.to}: / at least ${stretch.loads} more than the health check`,
	);
}
console.log(
	`opened since ${since}: ${pages.length} page requests, ${homepage.length} stretches of / beyond the health check (every ${interval} s)`,
);

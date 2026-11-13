// A check of the built stylesheets, run by `npm run build:check` after the build (#249 retro).
//
//   node scripts/check-built-styles.ts [<dist>]
//
// It reads every stylesheet under dist/ (or <dist>) and fails when one holds an `animation`
// shorthand that names a scroll or view timeline, or when no stylesheet gives the Homepage's
// reveal its view timeline (scripts/built-styles/plan.ts says why). The browser suites cannot see
// either: the development runtime serves the stylesheet unminified.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { droppedAnimations, revealHasTimeline } from "./built-styles/plan.ts";

const dist = process.argv[2] ?? "dist";
const files = (await readdir(dist, { recursive: true }))
	.filter((file) => file.endsWith(".css"))
	.map((file) => join(dist, file));

const failures: string[] = [];
let reveals = 0;
for (const file of files) {
	const css = await readFile(file, "utf8");
	for (const dropped of droppedAnimations(css)) failures.push(`${file}: ${dropped}`);
	const reveal = revealHasTimeline(css);
	if (reveal === false) failures.push(`${file}: .scroll-reveal has no animation-timeline: view()`);
	if (reveal === true) reveals += 1;
}
if (reveals === 0) failures.push(`${dist}: no stylesheet gives .scroll-reveal its view timeline`);

if (failures.length > 0) {
	console.error("check-built-styles: FAIL");
	for (const failure of failures) console.error(`  ${failure}`);
	process.exit(1);
}
console.log(`check-built-styles: PASS (${files.length} stylesheets, the reveal in ${reveals})`);

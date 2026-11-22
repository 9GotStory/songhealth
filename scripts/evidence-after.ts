// A folder of captures copied as after images into another folder, for scripts/evidence-branch.sh
// --after (#395 retro; scripts/evidence-after/plan.ts).
//
//   node scripts/evidence-after.ts <dir of captures> <empty dir>
//
// Each <name>.png becomes after-<name>.png, and captures.txt keeps the lines of those images with
// the same names. The source folder is left as it is.

import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterImages } from "./evidence-after/plan.ts";

const [from, to] = process.argv.slice(2);
if (from === undefined || to === undefined) {
	console.error("usage: node scripts/evidence-after.ts <dir of captures> <empty dir>");
	process.exit(2);
}

const record = join(from, "captures.txt");
try {
	const plan = afterImages(
		readdirSync(from).filter((file) => file.endsWith(".png")),
		existsSync(record) ? readFileSync(record, "utf8") : undefined,
	);
	for (const copy of plan.copies) copyFileSync(join(from, copy.from), join(to, copy.to));
	if (plan.captures !== undefined) writeFileSync(join(to, "captures.txt"), plan.captures);
	console.log(`evidence-after: ${plan.copies.length} captures staged as after images`);
} catch (error) {
	console.error((error as Error).message);
	process.exit(1);
}

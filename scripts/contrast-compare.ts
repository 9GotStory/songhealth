// The lines a hand-off's record quotes for "the same" and "the lowest" (#397 retro item 2;
// scripts/contrast-compare/plan.ts), from saved outputs of
// scripts/measure-text-contrast.ts --all-text --fold.
//
//   node scripts/contrast-compare.ts <ticket's output> <round's output>
//   node scripts/contrast-compare.ts --lowest <count> <output>...
//
// The first compares a ticket's output with the round's of the same page, folded line by folded
// line and per-width reading by reading; the second lists the texts no width read and the lowest
// folded readings across the outputs. Read-only.

import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { compareOutputs, lowestFolded } from "./contrast-compare/plan.ts";

const usage = () => {
	console.error(
		"usage: node scripts/contrast-compare.ts <ticket's output> <round's output>\n" +
			"       node scripts/contrast-compare.ts --lowest <count> <output>...",
	);
	process.exit(2);
};

const args = process.argv.slice(2);
if (args[0] === "--lowest") {
	const count = Number(args[1]);
	const files = args.slice(2);
	if (!Number.isInteger(count) || count < 1 || files.length === 0) usage();
	const outputs = files.map((file) => ({ name: basename(file), text: readFileSync(file, "utf8") }));
	for (const line of lowestFolded(outputs, count)) console.log(line);
} else {
	if (args.length !== 2) usage();
	const [ticket, round] = args.map((file) => readFileSync(file!, "utf8"));
	for (const line of compareOutputs(ticket!, round!)) console.log(line);
}

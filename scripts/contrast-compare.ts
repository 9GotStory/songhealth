// The lines a hand-off's record quotes for "the same" and "the lowest" (#397 retro item 2;
// scripts/contrast-compare/plan.ts), from saved outputs of
// scripts/measure-text-contrast.ts --all-text --fold.
//
//   node scripts/contrast-compare.ts <ticket's output> <round's output>
//   node scripts/contrast-compare.ts --folders (<ticket's dir> <round's dir>)...
//   node scripts/contrast-compare.ts --lowest <count> <output>...
//
// The first compares a ticket's output with the round's of the same page, folded line by folded
// line and per-width reading by reading. The second compares every .txt of each ticket's folder
// with the round's of the same name, each named by the round's folder and file ("418/about.txt"),
// then gives the totals: the block a hand-off's record quotes whole (#421 retro item 1). The third
// lists the texts no width read and the lowest folded readings across the outputs. Read-only.

import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { compareFolders, compareOutputs, lowestFolded } from "./contrast-compare/plan.ts";

const usage = () => {
	console.error(
		"usage: node scripts/contrast-compare.ts <ticket's output> <round's output>\n" +
			"       node scripts/contrast-compare.ts --folders (<ticket's dir> <round's dir>)...\n" +
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
} else if (args[0] === "--folders") {
	const dirs = args.slice(1);
	if (dirs.length === 0 || dirs.length % 2 !== 0) usage();
	/** Each .txt of a folder, named by `label` and its file. */
	const read = (dir: string, label: string) =>
		readdirSync(dir)
			.filter((file) => file.endsWith(".txt"))
			.map((file) => ({ name: `${label}/${file}`, text: readFileSync(join(dir, file), "utf8") }));
	const ticket = [];
	const round = [];
	for (let at = 0; at < dirs.length; at += 2) {
		const label = basename(dirs[at + 1]!);
		ticket.push(...read(dirs[at]!, label));
		round.push(...read(dirs[at + 1]!, label));
	}
	for (const line of compareFolders(ticket, round)) console.log(line);
} else {
	if (args.length !== 2) usage();
	const [ticket, round] = args.map((file) => readFileSync(file!, "utf8"));
	for (const line of compareOutputs(ticket!, round!)) console.log(line);
}

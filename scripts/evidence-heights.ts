// The heights of a folder's screenshots as a Markdown table, for a pull request or an evidence
// record to quote whole (#287 retro; scripts/evidence-heights/plan.ts).
//
//   node scripts/evidence-heights.ts <dir of PNGs>
//
// It reads each PNG's height from its header and prints a row for each page's before, after or
// one capture, at each width the folder holds. scripts/evidence-branch.sh prints it after its rows
// of images. Read-only.

import { openSync, readdirSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";

import { heightsTable } from "./evidence-heights/plan.ts";

const dir = process.argv[2];
if (dir === undefined) {
	console.error("usage: node scripts/evidence-heights.ts <dir of PNGs>");
	process.exit(2);
}

/** A PNG's height: the four bytes after its width in the IHDR chunk, which starts the file. */
function heightOf(file: string): number {
	const header = Buffer.alloc(24);
	const descriptor = openSync(file, "r");
	try {
		readSync(descriptor, header, 0, 24, 0);
	} finally {
		closeSync(descriptor);
	}
	return header.readUInt32BE(20);
}

const screenshots = readdirSync(dir)
	.filter((file) => file.endsWith(".png"))
	.map((file) => ({ file, height: heightOf(join(dir, file)) }));
for (const line of heightsTable(screenshots)) console.log(line);

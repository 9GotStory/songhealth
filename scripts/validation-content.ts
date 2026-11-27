// The check that no validation content remains (#461; spec #450 "T022, T028 and the validation
// fixture"), run after T022 and T028 once the validation tagline and picture have been removed:
//
//   node scripts/validation-content.ts <a Recovery Set's directory> /_emdash/api/media/file/<key>
//
// It reads a Recovery Set taken after the removal (Product Owner, #461 comment 7217954182 item 4):
// on the Production host the night's set, on the rehearsal machine a run of the nightly set by
// hand. The set's database.dump, admitted by its size and SHA-256 against the manifest, is turned
// back into SQL by pg_restore inside the database container, from standard input; every row is
// searched for the validation tagline and the picture's storage key. The manifest's media list,
// which the nightly run's check compared with the stopped runtime, is searched for the picture by
// its SHA-256 and by its key. Each finding names its table or file path, never a row's content; the
// rules are in scripts/validation-content/plan.ts.
//
// Exits: 0 PASS; 1 FAIL, validation content remains; 2 refused, nothing was read to the end. Run it
// on the host as the Deployment account, from the deployed checkout, while the database runs; it
// changes nothing and needs no credential (production-foundation.md §7.10).

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline";

import { DATABASE_FILE, MANIFEST_FILE, parseManifest, RUNTIMES } from "./recovery-set/plan.ts";
import { dumpScan, mediaFindings, parseCheckArgs, report } from "./validation-content/plan.ts";

function refuse(message: string): never {
	process.stderr.write(`validation-content: ${message}\n`);
	process.exit(2);
}

async function sha256Of(path: string): Promise<string> {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
	return hash.digest("hex");
}

const args = parseCheckArgs(process.argv.slice(2));
if ("error" in args) refuse(args.error);
const dir = resolve(args.set);

let manifestText: string;
try {
	manifestText = readFileSync(join(dir, MANIFEST_FILE), "utf8");
} catch {
	refuse(`${dir} has no readable ${MANIFEST_FILE}: not a Recovery Set`);
}
const parsed = parseManifest(manifestText);
if ("error" in parsed) refuse(parsed.error);
const { manifest } = parsed;

const dumpPath = join(dir, DATABASE_FILE);
const recorded = manifest.archives.database;
let size: number;
try {
	size = statSync(dumpPath).size;
} catch {
	refuse(`${dir} has no readable ${DATABASE_FILE}`);
}
if (size !== recorded.size || (await sha256Of(dumpPath)) !== recorded.sha256) {
	refuse(`${DATABASE_FILE} is not the one the manifest records (size or SHA-256 differs)`);
}

// pg_restore writes the rows as SQL to its standard output and connects to no database.
const restore = spawn(
	"podman",
	["exec", "-i", RUNTIMES[manifest.runtime].dbContainer, "pg_restore", "--data-only", "-f", "-"],
	{ stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, LC_ALL: "C" } },
);
createReadStream(dumpPath).pipe(restore.stdin);
const errors: Buffer[] = [];
restore.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
const exited = new Promise<number | null>((done) => restore.on("close", done));

const scan = dumpScan(args.key);
for await (const line of createInterface({ input: restore.stdout, crlfDelay: Infinity })) {
	scan.line(line);
}
const status = await exited;
if (status !== 0) {
	// pg_restore's own text goes whole into an owner-only file and is never printed
	// (CODING_STANDARDS "Exposure"). Not beside the set: the nightly run's prune and the host's
	// backup read the set's folder and the folder of sets, and this check writes nothing there.
	const file = join(
		mkdtempSync(join(tmpdir(), "songhealth-validation-content-")),
		"pg_restore.txt",
	);
	writeFileSync(file, Buffer.concat(errors), { mode: 0o600, flag: "wx" });
	refuse(
		`pg_restore in ${RUNTIMES[manifest.runtime].dbContainer} failed (exit ${status}); its standard error is in ${file}, owner-only`,
	);
}

const result = report(
	{ name: basename(dir), createdUtc: manifest.createdUtc, mediaFiles: manifest.media.length },
	scan.findings(),
	mediaFindings(manifest.media, args.key),
);
for (const line of result.lines) process.stdout.write(`${line}\n`);
process.exit(result.pass ? 0 : 1);

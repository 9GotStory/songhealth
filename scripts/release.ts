// Cutting a Release on the workstation (#455; spec #450 "Releases"; GLOSSARY.md "Release"):
//
//   node scripts/release.ts cut    <version> [--sha <commit>] [--releases <folder>]
//   node scripts/release.ts pin    <version> [--releases <folder>]
//   node scripts/release.ts pinned <version> <commit> [--releases <folder>]
//
// - cut: turns a commit (the checkout's HEAD by default) into a Release. It refuses a checkout
//   with uncommitted changes, a commit whose GitHub check runs have not all passed, and a version
//   that already has a record, a tag or an image; a Release (a version with no pre-release part)
//   also needs package.json to read its version and its commit to be on origin/main (Product
//   Owner, #455 comment 7163433918). Then it builds deploy/Containerfile from a git archive of the
//   commit as localhost/songhealth-app:<version>, its layers uncompressed so that the archive keeps
//   its digest (Podman 6.2.0 compresses them by default; production-foundation.md §4.5); runs
//   scripts/production-image-check.sh on that image, which stops the cut on a failure; checks that
//   the image's package.json and startup script equal the commit's byte for byte; saves the image
//   as an OCI archive with its SHA-256, loads the archive into an empty store to read its digest
//   back; checks that no image left the workstation's storage and that Feature 001's image is still
//   there; and writes record.json. A Release's annotated tag v<version> goes on the build commit
//   before the record is written, its message naming the record; the person pushes it.
// - pin: rewrites the checkout's deploy/quadlet/songhealth-app.container `Image=` line to the
//   record's image and digest, for the second commit that is reviewed on its own.
// - pinned: once that commit is merged into origin/main or an integration branch, checks that its
//   unit pins the record's digest, that it descends from the build commit and keeps its harness
//   files, and adds it to the record.
//
// The folder holding <version>/record.json and the archive is --releases, or $SONGHEALTH_RELEASES,
// or ~/.local/share/songhealth/releases. The rules the cut, the record and the pin follow are in
// scripts/release/plan.ts, under node:test; this file reads the facts and runs the steps. The
// command removes no image: a cut that fails leaves its image for the person to look at, and its
// version is not cut again until they remove that image by its name. The image check needs the
// development runtime's network and database (#453). Runbook:
// docs/operations/production-foundation.md §7.7. Exit status 0: done; 1: refused or failed; 2: a
// wrong argument.

import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { createHash } from "node:crypto";
import {
	createReadStream,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
	archiveFailures,
	archiveName,
	cutRefusals,
	FEATURE_001_IMAGE,
	HARNESS_FILES,
	harnessFileFailures,
	imageName,
	newRecord,
	pinFailures,
	pinnedImage,
	pinUnit,
	recordFailures,
	storageFailures,
	tagMessage,
	tagName,
	withDeploymentCommit,
	type CheckRun,
	type HarnessSums,
	type ReleaseRecord,
} from "./release/plan.ts";

const REPO = resolve(import.meta.dirname, "..");
const UNIT = "deploy/quadlet/songhealth-app.container";

class Refused extends Error {}

function note(message: string): void {
	console.log(`release: ${message}`);
}

/** Runs a command, returning its stdout; a failure throws with its stderr's last lines. */
function run(command: string, args: string[], options: SpawnSyncOptions = {}): string {
	const result = spawnSync(command, args, {
		cwd: REPO,
		encoding: "utf8",
		maxBuffer: 1 << 28,
		...options,
	});
	if (result.error) throw new Refused(`${command} could not run: ${result.error.message}`);
	if (result.status !== 0) {
		const tail = String(result.stderr ?? "")
			.trim()
			.split("\n")
			.slice(-20)
			.join("\n  ");
		throw new Refused(`${command} ${args[0]} exited ${result.status}${tail ? `:\n  ${tail}` : ""}`);
	}
	return String(result.stdout ?? "");
}

/** Whether a command exits 0, its output discarded. */
function succeeds(command: string, args: string[]): boolean {
	return spawnSync(command, args, { cwd: REPO, stdio: "ignore" }).status === 0;
}

function sha256(data: string | Buffer): string {
	return createHash("sha256").update(data).digest("hex");
}

async function fileSha256(path: string): Promise<string> {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
	return hash.digest("hex");
}

function gitShow(commit: string, path: string): Buffer {
	const shown = spawnSync("git", ["show", `${commit}:${path}`], { cwd: REPO, maxBuffer: 1 << 28 });
	if (shown.status !== 0) throw new Refused(`${commit.slice(0, 7)} holds no ${path}`);
	return shown.stdout;
}

function fullCommit(ref: string): string {
	return run("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).trim();
}

function releaseFolder(releases: string, version: string): string {
	return join(releases, version);
}

function readRecord(releases: string, version: string): ReleaseRecord {
	const path = join(releaseFolder(releases, version), "record.json");
	if (!existsSync(path)) throw new Refused(`${version} has no record at ${path}`);
	const record = JSON.parse(readFileSync(path, "utf8")) as ReleaseRecord;
	const failures = recordFailures(record);
	if (record.version !== version) failures.unshift(`the record at ${path} is ${record.version}'s`);
	if (failures.length > 0) throw new Refused(failures.join("\n"));
	return record;
}

/** Writes the record whole or not at all: a temporary file renamed over it. */
function writeRecord(releases: string, record: ReleaseRecord): string {
	const path = join(releaseFolder(releases, record.version), "record.json");
	writeFileSync(`${path}.tmp`, `${JSON.stringify(record, null, "\t")}\n`, { mode: 0o644 });
	renameSync(`${path}.tmp`, path);
	return path;
}

function imageIds(): string[] {
	return run("podman", ["images", "-aq", "--no-trunc"]).split("\n").filter(Boolean);
}

function refuseOn(failures: string[]): void {
	if (failures.length > 0) throw new Refused(failures.join("\n"));
}

/** The image's digest after its archive is loaded into an empty store, which is then removed. */
function loadedDigest(folder: string, archive: string, image: string): string {
	const store = mkdtempSync(join(folder, ".empty-store-"));
	const podman = ["--root", join(store, "root"), "--runroot", join(store, "run")];
	try {
		run("podman", [...podman, "load", "--quiet", "--input", archive]);
		return run("podman", [...podman, "image", "inspect", image, "--format", "{{.Digest}}"]).trim();
	} finally {
		// The loaded layers belong to the user namespace's IDs: remove them inside it.
		if (spawnSync("podman", ["unshare", "rm", "-rf", store], { stdio: "ignore" }).status !== 0)
			note(`could not remove the temporary store ${store}: remove it with podman unshare rm -rf`);
	}
}

async function cut(version: string, sha: string, releases: string): Promise<void> {
	const commit = fullCommit(sha);
	const short = commit.slice(0, 7);
	note(
		`cutting ${version} from ${short} (${run("git", ["log", "-1", "--format=%s", commit]).trim()})`,
	);
	run("git", ["fetch", "--quiet", "origin"]);
	const checkRuns = JSON.parse(
		run("gh", [
			"api",
			`repos/{owner}/{repo}/commits/${commit}/check-runs?per_page=100`,
			"--jq",
			"[.check_runs[] | {name, status, conclusion}]",
		]),
	) as CheckRun[];
	const folder = releaseFolder(releases, version);
	const before = imageIds();
	const feature001Present = succeeds("podman", ["image", "exists", FEATURE_001_IMAGE]);
	refuseOn([
		...cutRefusals({
			version,
			treeChanges: run("git", ["status", "--porcelain"]).split("\n").filter(Boolean),
			checkRuns,
			recordExists: existsSync(folder),
			tagExists: succeeds("git", ["rev-parse", "--verify", "--quiet", `refs/tags/v${version}`]),
			imageExists: succeeds("podman", ["image", "exists", imageName(version)]),
			packageVersion: String(JSON.parse(gitShow(commit, "package.json").toString("utf8")).version),
			onMain: succeeds("git", ["merge-base", "--is-ancestor", commit, "origin/main"]),
		}),
		...storageFailures({ before, after: before, feature001Present }),
	]);
	note(`checks at ${short}: ${checkRuns.map((r) => `${r.name} ${r.conclusion}`).join(", ")}`);

	mkdirSync(folder, { recursive: true, mode: 0o700 });
	let done = false;
	try {
		const image = imageName(version);
		const context = mkdtempSync(join(tmpdir(), "songhealth-release-"));
		try {
			note(`building ${image} from a git archive of ${short}, its layers uncompressed`);
			run("bash", [
				"-c",
				'set -o pipefail; git archive "$1" | tar -x -C "$2"',
				"bash",
				commit,
				context,
			]);
			const started = Date.now();
			run("podman", [
				"build",
				"--layers=false",
				"--disable-compression=true",
				"--label",
				`org.opencontainers.image.version=${version}`,
				"--label",
				`org.opencontainers.image.revision=${commit}`,
				"-f",
				join(context, "deploy/Containerfile"),
				"-t",
				image,
				context,
			]);
			note(`built in ${Math.round((Date.now() - started) / 1000)} s`);
		} finally {
			rmSync(context, { recursive: true, force: true });
		}

		note(`the image check (scripts/production-image-check.sh --sha ${short} --image ${image}):`);
		const check = spawnSync(
			join(REPO, "scripts/production-image-check.sh"),
			["--sha", commit, "--image", image],
			{ cwd: REPO, stdio: "inherit" },
		);
		if (check.status !== 0) throw new Refused("the image check failed: the cut stops here");

		const sums = run("podman", [
			"run",
			"--rm",
			"--network",
			"none",
			image,
			"sha256sum",
			...HARNESS_FILES.map((file) => `/app/${file}`),
		])
			.trim()
			.split("\n")
			.map((line) => line.split(/\s+/)[0]);
		const inImage = Object.fromEntries(
			HARNESS_FILES.map((file, at) => [file, sums[at]]),
		) as HarnessSums;
		const atCommit = Object.fromEntries(
			HARNESS_FILES.map((file) => [file, sha256(gitShow(commit, file))]),
		) as HarnessSums;
		refuseOn(harnessFileFailures(inImage, atCommit));
		note(`the image's ${HARNESS_FILES.join(" and ")} equal ${short}'s byte for byte`);

		const digest = run("podman", ["image", "inspect", image, "--format", "{{.Digest}}"]).trim();
		const archive = join(folder, archiveName(version));
		note(`saving ${image}@${digest} to ${archive}`);
		run("podman", [
			"save",
			"--format",
			"oci-archive",
			"--uncompressed",
			"--output",
			archive,
			image,
		]);
		const archiveSha256 = await fileSha256(archive);
		writeFileSync(`${archive}.sha256`, `${archiveSha256}  ${archiveName(version)}\n`, {
			mode: 0o644,
		});
		const loaded = loadedDigest(folder, archive, image);
		refuseOn(archiveFailures(digest, loaded));
		note(`loaded into an empty store, the archive's image reads ${loaded}, the image's digest`);

		refuseOn(
			storageFailures({
				before,
				after: imageIds(),
				feature001Present: succeeds("podman", ["image", "exists", FEATURE_001_IMAGE]),
			}),
		);
		note("no image left the workstation's storage, and Feature 001's 0.0.1 is still there");

		const record = newRecord({
			version,
			buildCommit: commit,
			digest,
			archiveSha256,
			archiveBytes: statSync(archive).size,
			cutAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
		});
		refuseOn(recordFailures(record));
		// The tag first, so that a record naming a tag is never written without it.
		const tag = tagName(version);
		if (tag) run("git", ["tag", "--annotate", tag, "--message", tagMessage(record), commit]);
		let path: string;
		try {
			path = writeRecord(releases, record);
		} catch (error) {
			if (tag) run("git", ["tag", "--delete", tag]);
			throw error;
		}
		done = true;
		note(`wrote ${path}:`);
		console.log(readFileSync(path, "utf8").trimEnd());
		if (tag) note(`tagged ${short} ${tag}; push it with: git push origin ${tag}`);
		else note(`${version} is a release candidate: it gets no tag`);
		note(`next: node scripts/release.ts pin ${version}, then commit and review that change alone`);
	} finally {
		if (!done) {
			rmSync(folder, { recursive: true, force: true });
			if (succeeds("podman", ["image", "exists", imageName(version)]))
				note(
					`the cut failed; its image ${imageName(version)} stays (the command removes no image): remove it by that name before cutting ${version} again`,
				);
		}
	}
}

function pin(version: string, releases: string): void {
	const record = readRecord(releases, version);
	if (record.deploymentConfigCommit !== null)
		throw new Refused(`${version} already has its deployment-configuration commit`);
	const path = join(REPO, UNIT);
	writeFileSync(path, pinUnit(readFileSync(path, "utf8"), record));
	note(`${UNIT} now pins ${pinnedImage(record)}`);
	note(
		`next: commit it alone (with production-foundation.md §4.5 naming it), have it reviewed, then node scripts/release.ts pinned ${version} <its commit>`,
	);
}

function pinned(version: string, ref: string, releases: string): void {
	const record = readRecord(releases, version);
	const commit = fullCommit(ref);
	run("git", ["fetch", "--quiet", "origin"]);
	const same = (file: string) => gitShow(commit, file).equals(gitShow(record.buildCommit, file));
	refuseOn(
		pinFailures(record, {
			commit,
			unit: gitShow(commit, UNIT).toString("utf8"),
			descends: succeeds("git", ["merge-base", "--is-ancestor", record.buildCommit, commit]),
			merged:
				run("git", [
					"for-each-ref",
					"--contains",
					commit,
					"refs/remotes/origin/main",
					"refs/remotes/origin/[0-9][0-9][0-9]-*",
				]).trim() !== "",
			harnessFilesSame: Object.fromEntries(
				HARNESS_FILES.map((file) => [file, same(file)]),
			) as Record<(typeof HARNESS_FILES)[number], boolean>,
		}),
	);
	const path = writeRecord(releases, withDeploymentCommit(record, commit));
	note(`${path} now names ${commit.slice(0, 7)} as ${version}'s deployment-configuration commit`);
}

function usage(): number {
	console.error(
		"usage: node scripts/release.ts cut <version> [--sha <commit>] [--releases <folder>]",
	);
	console.error("       node scripts/release.ts pin <version> [--releases <folder>]");
	console.error("       node scripts/release.ts pinned <version> <commit> [--releases <folder>]");
	return 2;
}

async function main(args: string[]): Promise<number> {
	const option = (name: string): string | undefined => {
		const at = args.indexOf(name);
		if (at < 0) return undefined;
		const value = args[at + 1];
		args.splice(at, 2);
		return value ?? "";
	};
	const releasesOption = option("--releases");
	const releases = resolve(
		releasesOption ??
			process.env.SONGHEALTH_RELEASES ??
			join(homedir(), ".local/share/songhealth/releases"),
	);
	const sha = option("--sha");
	const [command, version, commit, ...rest] = args;
	if (rest.length > 0 || !version || sha === "" || releasesOption === "") return usage();
	try {
		if (command === "cut" && commit === undefined) await cut(version, sha ?? "HEAD", releases);
		else if (command === "pin" && commit === undefined && sha === undefined) pin(version, releases);
		else if (command === "pinned" && commit !== undefined && sha === undefined)
			pinned(version, commit, releases);
		else return usage();
	} catch (error) {
		if (!(error instanceof Refused)) throw error;
		console.error(`release: refused: ${error.message.replaceAll("\n", "\nrelease: refused: ")}`);
		return 1;
	}
	return 0;
}

process.exitCode = await main(process.argv.slice(2));

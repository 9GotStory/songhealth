// The nightly Recovery Set (#460; docs/operations/production-foundation.md §7.6): run by the
// Deployment account's songhealth-recovery-set.timer at 03:00 Asia/Bangkok, or by hand, on the
// host that runs Songhealth's production units.
//
//   node scripts/nightly-recovery-set.ts                      the night's run (the timer's unit)
//   node scripts/nightly-recovery-set.ts --fail-at <step>     a drill by hand: <step> does its work
//                                                             and is then counted as failed
//
// It stops the application, takes a Recovery Set into a staging folder the host's backup cannot
// see (scripts/recovery-set.ts backup), checks it against the stopped runtime (recovery-set.ts
// check), and starts the application again as soon as the check passes. Then it removes the
// oldest sets beyond the newest six from ~/recovery-sets and moves the night's set there by a
// rename, so the folder holds seven complete sets and nothing else of its own
// (production-host-contract.md §3). It copies nothing off the host: the host's backup does.
//
// A failure at stop, take or check still starts the application; a failure at any step leaves the
// night's set out of the folder and removes it. It refuses before it stops anything when another
// run holds its lock, when the host names no alert command, or when the application is not
// running, which it then leaves as it is. Every night writes its result to
// ~/.local/state/songhealth/nightly-recovery-set.json; one that did not end with its set is
// reported through the host's alert command (contract §4), named in ~/.config/songhealth/host.env.
// The rules are scripts/nightly-recovery-set/plan.ts's. Exits 0 when the night's set is kept, 1
// otherwise, 2 on a wrong command line. It reads no secret and prints none.

import { spawnSync } from "node:child_process";
import {
	closeSync,
	existsSync,
	lstatSync,
	mkdirSync,
	openSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	unlinkSync,
	writeFileSync,
	writeSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	alertMessage,
	APP_SERVICE,
	type Done,
	type FolderEntry,
	type HostConfig,
	isSetName,
	nextStep,
	nightResult,
	parseHostConfig,
	parseNightArgs,
	paths,
	pruneRemovals,
	setName,
	startRefusal,
	type Step,
} from "./nightly-recovery-set/plan.ts";

const AT = paths(homedir());
const RECOVERY_SET = fileURLToPath(new URL("./recovery-set.ts", import.meta.url));
const ENV = { ...process.env, LC_ALL: "C" };

// The unit's timeout or a `systemctl --user stop` sends SIGTERM to every process of the run; a
// Ctrl-C by hand sends SIGINT. With a listener Node does not exit on either: the step's own child
// ends on the signal and counts as failed, so the run starts the application again and reports
// before it exits (plan.ts nextStep).
process.on("SIGTERM", () => undefined);
process.on("SIGINT", () => undefined);

function say(line: string): void {
	process.stdout.write(`nightly-recovery-set: ${line}\n`);
}

/** Runs a command, its output to the journal; the last lines of its errors are the reason. */
function command(file: string, args: readonly string[], what: string): string | undefined {
	const result = spawnSync(file, args, {
		stdio: ["ignore", "inherit", "pipe"],
		encoding: "utf8",
		env: ENV,
	});
	const errors = (result.stderr ?? "").trim();
	if (errors !== "") process.stderr.write(`${errors}\n`);
	if (result.status === 0) return undefined;
	const ended =
		result.signal !== null
			? `was ended by ${result.signal}`
			: result.error !== undefined
				? `could not run (${result.error.message})`
				: `exited ${result.status}`;
	const tail = errors.split("\n").slice(-3).join(" / ");
	return `${what} ${ended}${tail === "" ? "" : `: ${tail}`}`;
}

function appState(): string {
	const result = spawnSync("systemctl", ["--user", "is-active", APP_SERVICE], {
		encoding: "utf8",
		env: ENV,
	});
	return (result.stdout ?? "").trim();
}

/** Takes the run's lock, or says who holds it. A lock whose process has gone is taken over. */
function lock(): { release: () => void } | { held: string } {
	mkdirSync(dirname(AT.lock), { recursive: true, mode: 0o700 });
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const fd = openSync(AT.lock, "wx", 0o600);
			writeSync(fd, String(process.pid));
			closeSync(fd);
			return { release: () => unlinkSync(AT.lock) };
		} catch {
			const pid = Number(readFileSync(AT.lock, "utf8"));
			let alive = false;
			try {
				process.kill(pid, 0);
				alive = true;
			} catch (error) {
				alive = (error as NodeJS.ErrnoException).code === "EPERM";
			}
			if (alive) return { held: `another run (process ${pid}) holds ${AT.lock}` };
			unlinkSync(AT.lock);
		}
	}
	return { held: `cannot take ${AT.lock}` };
}

function hostConfig(): HostConfig | { error: string } {
	if (!existsSync(AT.hostConfig)) return {};
	return parseHostConfig(readFileSync(AT.hostConfig, "utf8"));
}

/** The folder of finished sets as the prune reads it. */
function folderEntries(): FolderEntry[] {
	return readdirSync(AT.finished, { withFileTypes: true }).map((entry) => ({
		name: entry.name,
		kind: entry.isSymbolicLink()
			? "symlink"
			: entry.isDirectory()
				? "directory"
				: entry.isFile()
					? "file"
					: "other",
		files: entry.isDirectory() ? readdirSync(join(AT.finished, entry.name)) : [],
	}));
}

function prune(): string | undefined {
	try {
		const { remove, ignored } = pruneRemovals(folderEntries());
		if (ignored.length > 0) say(`left as they are in ${AT.finished}: ${ignored.join(", ")}`);
		for (const name of remove) {
			const path = join(AT.finished, name);
			// Read again just before: only a plain directory of the folder itself is removed.
			if (!lstatSync(path).isDirectory()) return `${path} changed while it was pruned`;
			rmSync(path, { recursive: true });
			say(`removed the set ${name}, beyond the seven kept`);
		}
		return undefined;
	} catch (error) {
		return `the prune failed: ${(error as Error).message}`;
	}
}

/** Whether this run's rename put the night's set into the folder. */
let published = false;

function publish(staged: string, set: string): string | undefined {
	const target = join(AT.finished, set);
	if (existsSync(target)) return `${target} exists already`;
	try {
		renameSync(staged, target);
		published = true;
		return undefined;
	} catch (error) {
		return `the publication failed: ${(error as Error).message}`;
	}
}

function bytesOf(dir: string): number {
	return readdirSync(dir).reduce((sum, file) => sum + statSync(join(dir, file)).size, 0);
}

/** Writes the night's result by a rename, so a reader never sees half of it. */
function writeResult(result: ReturnType<typeof nightResult>): void {
	mkdirSync(dirname(AT.result), { recursive: true, mode: 0o700 });
	const partial = `${AT.result}.partial`;
	writeFileSync(partial, `${JSON.stringify(result, null, "\t")}\n`, { mode: 0o600 });
	renameSync(partial, AT.result);
}

function finish(
	alertCommand: string | undefined,
	input: Parameters<typeof nightResult>[0],
): number {
	const result = nightResult(input);
	writeResult(result);
	const alert = alertMessage(result);
	if (alert === undefined) {
		say(
			`ok: the set ${result.set} is kept in ${AT.finished} (${result.setBytes} bytes); the application was stopped for ${result.downtimeSeconds} s`,
		);
		return 0;
	}
	say(`${result.result}: ${result.reason ?? ""}`);
	if (alertCommand === undefined) {
		say("no alert command is named: this journal is the only report");
		return 1;
	}
	const sent = spawnSync(alertCommand, [alert.subject], { input: alert.body, env: ENV });
	if (sent.status === 0) say(`reported through ${alertCommand}: ${alert.subject}`);
	else
		say(
			`the alert command failed (${sent.status ?? sent.error?.message}): this journal is the only report`,
		);
	return 1;
}

function main(argv: readonly string[]): number {
	const args = parseNightArgs(argv);
	if ("error" in args) {
		process.stderr.write(`${args.error}\n`);
		return 2;
	}
	const startedAt = new Date();
	const set = setName(startedAt);
	const taken = lock();
	if ("held" in taken) {
		say(`REFUSED: ${taken.held}`);
		return 1;
	}
	try {
		const config = hostConfig();
		const alertCommand = "error" in config ? undefined : config.alertCommand;
		const state = appState();
		const refusal =
			"error" in config ? config.error : startRefusal({ appState: state, alertCommand });
		if (refusal !== undefined) {
			return finish(alertCommand, {
				startedAt,
				set,
				done: [],
				appRunning: state === "active",
				reason: refusal,
			});
		}
		if (args.failAt !== undefined) say(`a drill: the ${args.failAt} step will count as failed`);

		// What an earlier run that was killed left in staging is never a set: remove it.
		mkdirSync(AT.staging, { recursive: true, mode: 0o700 });
		mkdirSync(AT.finished, { recursive: true, mode: 0o700 });
		for (const name of readdirSync(AT.staging).filter(isSetName)) {
			rmSync(join(AT.staging, name), { recursive: true, force: true });
			say(`removed ${name}, left in staging by an earlier run`);
		}
		const staged = join(AT.staging, set);
		mkdirSync(staged, { mode: 0o700 });

		const done: Done[] = [];
		let reason: string | undefined;
		let stoppedAt: Date | undefined;
		let startedAgainAt: Date | undefined;
		const steps: Record<Step, () => string | undefined> = {
			stop: () => {
				stoppedAt = new Date();
				return command("systemctl", ["--user", "stop", APP_SERVICE], "stopping the application");
			},
			take: () =>
				command(process.execPath, [RECOVERY_SET, "backup", "production", staged], "the backup"),
			check: () =>
				command(process.execPath, [RECOVERY_SET, "check", "production", staged], "the check"),
			start: () => {
				const failed = command(
					"systemctl",
					["--user", "start", APP_SERVICE],
					"starting the application",
				);
				if (failed === undefined) startedAgainAt = new Date();
				return failed;
			},
			prune,
			publish: () => publish(staged, set),
		};
		for (let step = nextStep(done); step !== undefined; step = nextStep(done)) {
			say(`${step}: ${new Date().toISOString()}`);
			let failed = steps[step]();
			if (failed === undefined && args.failAt === step) {
				failed = `the ${step} step was made to fail by --fail-at (a drill)`;
			}
			if (failed !== undefined) {
				say(`${step} FAILED: ${failed}`);
				reason = reason === undefined ? failed : `${reason}; then ${failed}`;
			}
			done.push({ step, ok: failed === undefined });
		}

		const kept = published && done.every(({ ok }) => ok);
		if (!kept) {
			rmSync(staged, { recursive: true, force: true });
			// A drill's failed publication has done its rename: the set leaves the folder again.
			if (published) rmSync(join(AT.finished, set), { recursive: true });
		}
		return finish(alertCommand, {
			startedAt,
			set,
			done,
			appRunning: appState() === "active",
			...(reason === undefined ? {} : { reason }),
			...(stoppedAt === undefined ? {} : { stoppedAt }),
			...(startedAgainAt === undefined ? {} : { startedAgainAt }),
			...(kept ? { setBytes: bytesOf(join(AT.finished, set)) } : {}),
		});
	} finally {
		taken.release();
	}
}

process.exitCode = main(process.argv.slice(2));

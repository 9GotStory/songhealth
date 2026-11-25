// The verdicts of scripts/production-image-check.sh (#453; spec #450 "The image and the startup
// gate"). No runtime import, so tests/node/production-image-check.test.ts loads it with plain node.

/** How the committed application unit has Podman stop its container. */
export interface StopContract {
	/** Quadlet `RunInit=`: Podman's init runs first in the container and forwards the stop signal. */
	init: boolean;
	/** Quadlet `StopTimeout=`, or Podman's default of 10 s: the wait before SIGKILL. */
	stopTimeout: number;
	/** systemd `SuccessExitStatus=`: the exit statuses besides 0 that end the unit as a success. */
	successExitStatuses: number[];
}

/** systemd's true booleans (systemd.syntax(7)); Quadlet reads `RunInit=` with the same parser. */
const TRUE_WORDS = new Set(["1", "yes", "y", "true", "t", "on"]);

/** The keys a unit file sets, by section, in file order; comments and blank lines skipped. */
function unitEntries(unit: string): { section: string; key: string; value: string }[] {
	const entries: { section: string; key: string; value: string }[] = [];
	let section = "";
	for (const raw of unit.split("\n")) {
		const line = raw.trim();
		if (line === "" || line.startsWith("#") || line.startsWith(";")) continue;
		const header = /^\[(.+)\]$/.exec(line);
		if (header) {
			section = header[1];
			continue;
		}
		const at = line.indexOf("=");
		if (at > 0)
			entries.push({ section, key: line.slice(0, at).trim(), value: line.slice(at + 1).trim() });
	}
	return entries;
}

/** The stop contract of a Quadlet `.container` file's text. */
export function stopContract(unit: string): StopContract {
	const contract: StopContract = { init: false, stopTimeout: 10, successExitStatuses: [] };
	for (const { section, key, value } of unitEntries(unit)) {
		if (section === "Container" && key === "RunInit")
			contract.init = TRUE_WORDS.has(value.toLowerCase());
		else if (section === "Container" && key === "StopTimeout") contract.stopTimeout = Number(value);
		else if (section === "Service" && key === "SuccessExitStatus") {
			// An empty assignment resets the list; a signal name counts a death by that signal, not an
			// exit status (systemd.service(5)), so only numbers are kept.
			if (value === "") contract.successExitStatuses = [];
			else
				contract.successExitStatuses.push(
					...value
						.split(/\s+/)
						.filter((word) => /^\d+$/.test(word))
						.map(Number),
				);
		}
	}
	return contract;
}

/**
 * The startup gate's build (tests/operations/verify-startup.sh S2: remove the manifest, then
 * `npm run build`) as the image's own user reported it, in a container with no network.
 */
export interface StartupBuild {
	/** The user the image runs as. */
	uid: number;
	/** The build's exit status; null when a signal ended it. */
	status: number | null;
	/** Whether this build wrote the standalone server entry (entry.mjs under dist/server). */
	entry: boolean;
	/** Whether this build wrote the migration manifest (migrations.json under .emdash). */
	manifest: boolean;
	/** The paths under /app that anyone may write, links aside. */
	worldWritable: string[];
	/** The build output's first line that names an error, if any. */
	error: string | null;
}

/** What is wrong with the startup build, one line each: none for a build the gate can run. */
export function startupBuildFailures({
	uid,
	status,
	entry,
	manifest,
	worldWritable,
	error,
}: StartupBuild): string[] {
	const failures: string[] = [];
	if (uid === 0)
		failures.push("the startup gate's build ran as root, not as a non-root runtime user");
	if (status !== 0) {
		const end = status === null ? "was ended by a signal" : `exited ${status}`;
		failures.push(`the startup gate's build ${end}: ${error ?? "no line names an error"}`);
	}
	if (!entry) failures.push("the build did not emit dist/server/entry.mjs");
	if (!manifest) failures.push("the build did not emit .emdash/migrations.json");
	if (worldWritable.length > 0)
		failures.push(`world-writable under /app: ${worldWritable.join(" ")}`);
	return failures;
}

/** SIGKILL's exit status: 128 + 9. */
const KILLED = 137;

/** What is wrong with a stop, one line each: none for a container that left on the stop signal. */
export function stopFailures(
	{ exitCode, seconds }: { exitCode: number; seconds: number },
	{ stopTimeout, successExitStatuses }: StopContract,
): string[] {
	if (exitCode === KILLED || seconds >= stopTimeout) {
		return [
			`the stop ended in a kill: exit ${exitCode} after ${seconds} s, the stop timeout being ${stopTimeout} s`,
		];
	}
	if (exitCode !== 0 && !successExitStatuses.includes(exitCode)) {
		return [
			`the container exited ${exitCode}, which the unit does not count a success: systemd would mark it failed`,
		];
	}
	return [];
}

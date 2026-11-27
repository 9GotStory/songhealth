// The nightly Recovery Set's rules (#460), which scripts/nightly-recovery-set.ts follows: whether a
// night's run goes ahead, the order of its steps and where a failure at each one leads, which sets
// it keeps, and what it reports. Nothing here runs a command or touches a file, so node:test
// covers it (tests/node/nightly-recovery-set.test.ts).
//
// Decisions: spec #450 "Recovery Sets, every night" (03:00 Asia/Bangkok, seven sets on the host,
// the application started again as soon as the set is checked); the host contract's §3 and §4
// (docs/operations/production-host-contract.md: the folder of finished sets, the alert command);
// the Product Owner's answers on #460 (comment 7214747287): no catch-up of a missed night, no set
// and no start when the application was not running, `--fail-at` on a run by hand only.

import { DATABASE_FILE, MANIFEST_FILE, MEDIA_FILE } from "../recovery-set/plan.ts";

/** The steps of a night, in their order when each passes. */
export const STEPS = ["stop", "take", "check", "start", "prune", "publish"] as const;
export type Step = (typeof STEPS)[number];

/** A step that has run, and whether it passed. */
export interface Done {
	step: Step;
	ok: boolean;
}

/** How many sets the host keeps, the night's own included (spec #450). */
export const KEEP = 7;

/** The application's unit, which the run stops and starts. */
export const APP_SERVICE = "songhealth-app.service";

/** The three files of a complete set, in name order. */
const SET_FILES = [DATABASE_FILE, MANIFEST_FILE, MEDIA_FILE].sort();

const USAGE =
	"usage: node scripts/nightly-recovery-set.ts [--fail-at stop|take|check|start|prune|publish]";

/** The command line: nothing from the timer's unit; `--fail-at <step>` on a drill by hand. */
export function parseNightArgs(argv: readonly string[]): { failAt?: Step } | { error: string } {
	if (argv.length === 0) return {};
	const [option, step] = argv;
	if (argv.length !== 2 || option !== "--fail-at" || !STEPS.includes(step as Step)) {
		return { error: USAGE };
	}
	return { failAt: step as Step };
}

/** Where the run keeps things, under the Deployment account's home. */
export function paths(home: string): {
	finished: string;
	staging: string;
	result: string;
	lock: string;
	hostConfig: string;
} {
	return {
		// The folder of finished sets, the path the host's backup is told once (contract §3).
		finished: `${home}/recovery-sets`,
		// Where a set is written and checked, out of the backup's sight; under the same home, so the
		// publication is a rename on one file system.
		staging: `${home}/.local/share/songhealth/recovery-staging`,
		result: `${home}/.local/state/songhealth/nightly-recovery-set.json`,
		lock: `${home}/.local/state/songhealth/nightly-recovery-set.lock`,
		// The host names its side of the contract here (contract §3, §4).
		hostConfig: `${home}/.config/songhealth/host.env`,
	};
}

/** A set's name: its UTC time to the second, which sorts as the nights do. */
export function setName(at: Date): string {
	return `${at.toISOString().slice(0, 19).replaceAll(":", "")}Z`;
}

export function isSetName(name: string): boolean {
	return /^\d{4}-\d{2}-\d{2}T\d{6}Z$/.test(name);
}

const HOST_KEYS = {
	SONGHEALTH_ALERT_COMMAND: "alertCommand",
	SONGHEALTH_BACKUP_STATUS: "backupStatus",
} as const;

export interface HostConfig {
	alertCommand?: string;
	backupStatus?: string;
}

/** The host's names, one `NAME=/absolute/path` a line; `#` lines and blank lines are skipped. */
export function parseHostConfig(text: string): HostConfig | { error: string } {
	const config: HostConfig = {};
	for (const [index, raw] of text.split("\n").entries()) {
		const line = raw.trim();
		if (line === "" || line.startsWith("#")) continue;
		const match = /^([A-Z_]+)=(\/[^\s"'`$\\]+)$/.exec(line);
		const key = match && HOST_KEYS[match[1] as keyof typeof HOST_KEYS];
		if (!match || !key) {
			return {
				error: `line ${index + 1} of the host's configuration is not NAME=/absolute/path with a name of ${Object.keys(HOST_KEYS).join(" or ")}`,
			};
		}
		config[key] = match[2]!;
	}
	return config;
}

/**
 * Why the night's run stops before it touches anything, or nothing. It never stops an application
 * it could not report on, and it takes no set of an application that was not running: someone
 * stopped it, or it failed, and starting it could cut across their work (PO, #460 answer 2).
 */
export function startRefusal(facts: {
	appState: string;
	alertCommand: string | undefined;
}): string | undefined {
	if (facts.alertCommand === undefined) {
		return "the host names no SONGHEALTH_ALERT_COMMAND in the account's host.env: the run stops nothing it could not report on";
	}
	if (facts.appState !== "active") {
		return `the application is not running (${facts.appState || "unknown"}): no Recovery Set tonight, and the run leaves it as it is`;
	}
	return undefined;
}

/**
 * The step after those done, or nothing when the night ends. Each step passes to the next in
 * STEPS. A failure at stop, take or check leads to the start, so the application runs again; the
 * start is tried once; a failure at the start, the prune or the publication ends the night with
 * nothing published.
 */
export function nextStep(done: readonly Done[]): Step | undefined {
	const last = done.at(-1);
	if (last === undefined) return "stop";
	if (last.step === "start") return done.every(({ ok }) => ok) ? "prune" : undefined;
	if (!last.ok) return done.some(({ step }) => step === "start") ? undefined : "start";
	return STEPS[STEPS.indexOf(last.step) + 1];
}

/** What the run reads of each name in the folder of finished sets. */
export interface FolderEntry {
	name: string;
	kind: "directory" | "symlink" | "file" | "other";
	/** A directory's file names. */
	files: readonly string[];
}

/**
 * Which sets to remove before the night's is published, so seven stay: the oldest complete sets
 * beyond the newest six. Only the run's own complete sets count or go: a plain directory with a
 * set's name holding exactly its three files. Anything else is left as it is and named.
 */
export function pruneRemovals(entries: readonly FolderEntry[]): {
	remove: string[];
	ignored: string[];
} {
	const isComplete = (entry: FolderEntry) =>
		entry.kind === "directory" &&
		isSetName(entry.name) &&
		[...entry.files].sort().join("/") === SET_FILES.join("/");
	const complete = entries
		.filter(isComplete)
		.map(({ name }) => name)
		.sort();
	const ignored = entries
		.filter((entry) => !isComplete(entry))
		.map(({ name }) => name)
		.sort();
	return { remove: complete.slice(0, Math.max(0, complete.length - (KEEP - 1))), ignored };
}

/** The night's result, which the run writes for the Operator and the watch (#462) to read. */
export interface NightResult {
	time: string;
	set: string;
	result: "ok" | "failed" | "refused";
	/** Whether the night's set reached the folder of finished sets. */
	complete: boolean;
	failedStep?: Step;
	reason?: string;
	appRunning: boolean;
	downtimeSeconds?: number;
	setBytes?: number;
}

export function nightResult(input: {
	startedAt: Date;
	set: string;
	done: readonly Done[];
	appRunning: boolean;
	reason?: string;
	stoppedAt?: Date;
	startedAgainAt?: Date;
	setBytes?: number;
}): NightResult {
	const failed = input.done.find(({ ok }) => !ok);
	const complete =
		failed === undefined && input.done.some(({ step, ok }) => step === "publish" && ok);
	const result: NightResult = {
		time: input.startedAt.toISOString(),
		set: input.set,
		result: input.done.length === 0 ? "refused" : complete ? "ok" : "failed",
		complete,
		...(failed === undefined ? {} : { failedStep: failed.step }),
		...(input.reason === undefined || complete ? {} : { reason: input.reason }),
		appRunning: input.appRunning,
	};
	if (input.stoppedAt !== undefined && input.startedAgainAt !== undefined) {
		result.downtimeSeconds =
			Math.round((input.startedAgainAt.getTime() - input.stoppedAt.getTime()) / 100) / 10;
	}
	if (input.setBytes !== undefined) result.setBytes = input.setBytes;
	return result;
}

/** The alert a night that did not end with its set sends through the host's command, or nothing. */
export function alertMessage(result: NightResult): { subject: string; body: string } | undefined {
	if (result.result === "ok") return undefined;
	const subject =
		result.result === "refused"
			? "Songhealth: no Recovery Set tonight"
			: `Songhealth: the nightly Recovery Set failed at ${result.failedStep}`;
	const body = [
		`Night of ${result.time} (UTC).`,
		result.reason ?? "(no reason given)",
		result.result === "refused"
			? "No set was taken, and the application was left as it was."
			: `The set ${result.set} was not kept: the folder of finished sets holds only the earlier ones.`,
		result.appRunning
			? "The application is running again."
			: "The application is NOT running: the site shows the notice or nothing.",
		"Read the night: journalctl --user -u songhealth-recovery-set.service -t node, and ~/.local/state/songhealth/nightly-recovery-set.json (production-foundation.md §7.9).",
		"",
	].join("\n");
	return { subject, body };
}

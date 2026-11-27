// The nightly Recovery Set's planning module (#460): scripts/nightly-recovery-set/plan.ts, which
// scripts/nightly-recovery-set.ts follows when the timer, or the Operator by hand, runs it. It
// reads when the run goes ahead or refuses, the order of its steps and what a failure at each one
// leads to, which sets it keeps, and what it reports.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
	alertMessage,
	type Done,
	type FolderEntry,
	isSetName,
	KEEP,
	nextStep,
	nightResult,
	parseHostConfig,
	parseNightArgs,
	paths,
	pruneRemovals,
	setName,
	startRefusal,
	STEPS,
} from "../../scripts/nightly-recovery-set/plan.ts";

const ALERT = "/usr/local/bin/songhealth-alert";
const SET_FILES = ["database.dump", "manifest.json", "media.tar"];

/** A complete set in the finished folder, by its name. */
const complete = (name: string): FolderEntry => ({ name, kind: "directory", files: SET_FILES });

/** The names of the sets of nights 1..count of November 2026, oldest first. */
function nights(count: number): string[] {
	return Array.from(
		{ length: count },
		(_, i) => `2026-11-${String(i + 1).padStart(2, "0")}T200000Z`,
	);
}

/** Runs the steps in the plan's order, each passing but those named, until the plan ends. */
function walk(failing: readonly string[]): Done[] {
	const done: Done[] = [];
	for (let step = nextStep(done); step !== undefined; step = nextStep(done)) {
		assert.ok(done.length < 10, "the plan never ends");
		done.push({ step, ok: !failing.includes(step) });
	}
	return done;
}

const order = (done: readonly Done[]) =>
	done.map(({ step, ok }) => `${step}:${ok ? "ok" : "failed"}`);

describe("the command line", () => {
	it("takes nothing from the timer, and --fail-at with one of the six steps by hand", () => {
		assert.deepEqual(parseNightArgs([]), {});
		for (const step of ["stop", "take", "check", "start", "prune", "publish"]) {
			assert.deepEqual(parseNightArgs(["--fail-at", step]), { failAt: step }, step);
		}
	});

	it("refuses an unknown step, a missing step, another option and extra words", () => {
		for (const argv of [
			["--fail-at", "upload"],
			["--fail-at"],
			["--fail-at", ""],
			["--keep", "3"],
			["--fail-at", "take", "now"],
			["take"],
		]) {
			assert.ok("error" in parseNightArgs(argv), argv.join(" "));
		}
	});

	it("leaves --fail-at out of the timer's unit, which runs the command with no argument", () => {
		const service = readFileSync("deploy/systemd/songhealth-recovery-set.service", "utf8");
		const exec = service.split("\n").filter((line) => line.startsWith("ExecStart="));
		assert.deepEqual(exec, ["ExecStart=%h/.local/bin/node scripts/nightly-recovery-set.ts"]);
	});
});

describe("when it runs", () => {
	const timer = readFileSync("deploy/systemd/songhealth-recovery-set.timer", "utf8");
	const keys = timer.split("\n").filter((line) => /^[A-Za-z]+=/.test(line));

	it("runs at 03:00 every day, Asia/Bangkok, without catching up a night the machine missed", () => {
		assert.ok(keys.includes("OnCalendar=*-*-* 03:00:00 Asia/Bangkok"), keys.join("\n"));
		assert.ok(keys.includes("Persistent=false"), keys.join("\n"));
	});

	it("is started by the account's user manager, which lingers, with no session open", () => {
		assert.ok(keys.includes("WantedBy=timers.target"), keys.join("\n"));
		assert.ok(keys.includes("Unit=songhealth-recovery-set.service"), keys.join("\n"));
	});
});

describe("whether the night's run goes ahead", () => {
	it("goes ahead when the application runs and the host names its alert command", () => {
		assert.equal(startRefusal({ appState: "active", alertCommand: ALERT }), undefined);
	});

	it("takes no set and leaves the application as it is when it is not running (PO, #460)", () => {
		for (const state of ["inactive", "failed", "activating", "deactivating", ""]) {
			const refusal = startRefusal({ appState: state, alertCommand: ALERT });
			assert.ok(refusal?.includes("no Recovery Set tonight"), `${state}: ${refusal}`);
			assert.ok(refusal?.includes(`(${state || "unknown"})`), `${state}: ${refusal}`);
		}
	});

	it("stops nothing when it could not report a failure: no alert command is named", () => {
		const refusal = startRefusal({ appState: "active", alertCommand: undefined });
		assert.ok(refusal?.includes("SONGHEALTH_ALERT_COMMAND"), String(refusal));
	});
});

describe("the order of the steps", () => {
	it("stops, takes, checks, starts at once, then prunes and publishes", () => {
		assert.deepEqual(STEPS, ["stop", "take", "check", "start", "prune", "publish"]);
		assert.deepEqual(order(walk([])), [
			"stop:ok",
			"take:ok",
			"check:ok",
			"start:ok",
			"prune:ok",
			"publish:ok",
		]);
	});

	it("starts the application right after the check passes, before anything else", () => {
		assert.equal(
			nextStep([
				{ step: "stop", ok: true },
				{ step: "take", ok: true },
				{ step: "check", ok: true },
			]),
			"start",
		);
	});

	it("starts the application again after a failure at stop, take or check, and ends there", () => {
		assert.deepEqual(order(walk(["stop"])), ["stop:failed", "start:ok"]);
		assert.deepEqual(order(walk(["take"])), ["stop:ok", "take:failed", "start:ok"]);
		assert.deepEqual(order(walk(["check"])), ["stop:ok", "take:ok", "check:failed", "start:ok"]);
	});

	it("ends at a failed start, prune or publish, with nothing published", () => {
		assert.deepEqual(order(walk(["start"])), ["stop:ok", "take:ok", "check:ok", "start:failed"]);
		assert.deepEqual(order(walk(["prune"])), [
			"stop:ok",
			"take:ok",
			"check:ok",
			"start:ok",
			"prune:failed",
		]);
		assert.deepEqual(order(walk(["publish"])).at(-1), "publish:failed");
	});

	it("tries the start once only, even when the start after a failure fails too", () => {
		assert.deepEqual(order(walk(["take", "start"])), ["stop:ok", "take:failed", "start:failed"]);
	});
});

describe("the set's name and folders", () => {
	it("names a set by its UTC time to the second, which sorts as the nights do", () => {
		assert.equal(setName(new Date("2026-11-27T20:00:05.678Z")), "2026-11-27T200005Z");
		assert.equal(setName(new Date("2026-01-02T03:04:05.000Z")), "2026-01-02T030405Z");
		assert.ok(
			setName(new Date("2026-11-27T20:00:00Z")) < setName(new Date("2026-11-28T19:59:59Z")),
		);
	});

	it("knows its own sets' names and no other", () => {
		assert.ok(isSetName("2026-11-27T200005Z"));
		for (const name of [
			"2026-11-27T20:00:05Z",
			"2026-11-27T200005",
			".2026-11-27T200005Z",
			"2026-11-27T200005Z.old",
			"latest",
			"",
		]) {
			assert.equal(isSetName(name), false, name);
		}
	});

	it("stages a set outside the finished folder, which the host's backup reads, under the same home", () => {
		const at = paths("/home/songhealth");
		assert.equal(at.finished, "/home/songhealth/recovery-sets");
		assert.equal(at.staging, "/home/songhealth/.local/share/songhealth/recovery-staging");
		assert.equal(at.result, "/home/songhealth/.local/state/songhealth/nightly-recovery-set.json");
		assert.equal(at.hostConfig, "/home/songhealth/.config/songhealth/host.env");
		assert.ok(!at.staging.startsWith(`${at.finished}/`));
	});
});

describe("the host's names in the account's configuration", () => {
	it("reads the alert command and the backup's status file, skipping comments and blank lines", () => {
		assert.deepEqual(
			parseHostConfig(
				`# Songhealth's side of the host contract\n\nSONGHEALTH_ALERT_COMMAND=${ALERT}\nSONGHEALTH_BACKUP_STATUS=/var/lib/backup/status.json\n`,
			),
			{ alertCommand: ALERT, backupStatus: "/var/lib/backup/status.json" },
		);
		assert.deepEqual(parseHostConfig(""), {});
	});

	it("refuses a relative path, an unknown name, a quoted or spaced value and a line without =", () => {
		for (const text of [
			"SONGHEALTH_ALERT_COMMAND=songhealth-alert",
			"SONGHEALTH_ALERT=/usr/local/bin/x",
			'SONGHEALTH_ALERT_COMMAND="/usr/local/bin/x"',
			"SONGHEALTH_ALERT_COMMAND=/usr/local/bin/x --to me",
			"SONGHEALTH_ALERT_COMMAND",
		]) {
			assert.ok("error" in parseHostConfig(text), text);
		}
	});
});

describe("the sets it keeps", () => {
	it("keeps seven: before the night's set is published it leaves the newest six", () => {
		assert.equal(KEEP, 7);
		const names = nights(7);
		assert.deepEqual(pruneRemovals(names.map(complete)).remove, [names[0]]);
		const ten = nights(10);
		assert.deepEqual(pruneRemovals(ten.map(complete)).remove, ten.slice(0, 4));
		assert.deepEqual(pruneRemovals(nights(6).map(complete)).remove, []);
	});

	it("removes the oldest whatever order the folder lists them in", () => {
		const names = nights(8);
		assert.deepEqual(pruneRemovals([...names].reverse().map(complete)).remove, names.slice(0, 2));
	});

	it("never removes the only complete set, however many incomplete ones lie beside it", () => {
		const [only, ...rest] = nights(9);
		const entries: FolderEntry[] = [
			...rest.map((name) => ({ name, kind: "directory" as const, files: ["database.dump"] })),
			complete(only!),
		];
		assert.deepEqual(pruneRemovals(entries).remove, []);
		assert.deepEqual(pruneRemovals([complete(only!)]).remove, []);
	});

	it("removes only its own complete sets: never a link, a file, another name or a set with other files", () => {
		const names = nights(7);
		const others: FolderEntry[] = [
			{ name: "2026-10-01T200000Z", kind: "symlink", files: [] },
			{ name: "2026-10-02T200000Z", kind: "file", files: [] },
			{ name: "notes", kind: "directory", files: SET_FILES },
			{ name: "2026-10-03T200000Z", kind: "directory", files: [...SET_FILES, "extra"] },
			{ name: "2026-10-04T200000Z", kind: "directory", files: ["database.dump", "media.tar"] },
		];
		const { remove, ignored } = pruneRemovals([...others, ...names.map(complete)]);
		assert.deepEqual(remove, [names[0]]);
		assert.deepEqual(ignored, others.map(({ name }) => name).sort());
	});
});

describe("the night's result and its report", () => {
	const startedAt = new Date("2026-11-27T20:00:00.120Z");
	const timing = {
		stoppedAt: new Date("2026-11-27T20:00:01.000Z"),
		startedAgainAt: new Date("2026-11-27T20:02:31.500Z"),
	};

	it("a night whose steps all passed: its set complete, its downtime, no alert", () => {
		const result = nightResult({
			startedAt,
			set: "2026-11-27T200000Z",
			done: walk([]),
			appRunning: true,
			setBytes: 1_073_741_824,
			...timing,
		});
		assert.deepEqual(result, {
			time: "2026-11-27T20:00:00.120Z",
			set: "2026-11-27T200000Z",
			result: "ok",
			complete: true,
			appRunning: true,
			downtimeSeconds: 150.5,
			setBytes: 1_073_741_824,
		});
		assert.equal(alertMessage(result), undefined);
	});

	it("a failure at each step: not complete, the step named, and an alert that says the site's state", () => {
		for (const step of STEPS) {
			const result = nightResult({
				startedAt,
				set: "2026-11-27T200000Z",
				done: walk([step]),
				appRunning: step !== "start",
				reason: `${step} went wrong`,
				...timing,
			});
			assert.equal(result.result, "failed", step);
			assert.equal(result.complete, false, step);
			assert.equal(result.failedStep, step, step);
			const alert = alertMessage(result);
			assert.ok(alert?.subject.includes(`failed at ${step}`), `${step}: ${alert?.subject}`);
			assert.ok(alert?.body.includes(`${step} went wrong`), step);
			assert.ok(alert?.body.includes("2026-11-27T200000Z was not kept"), step);
			const running =
				step === "start" ? "The application is NOT running" : "The application is running again";
			assert.ok(alert?.body.includes(running), `${step}: ${alert?.body}`);
		}
	});

	it("names the first failed step when the start after it failed as well", () => {
		const result = nightResult({
			startedAt,
			set: "2026-11-27T200000Z",
			done: walk(["take", "start"]),
			appRunning: false,
			reason: "take went wrong",
		});
		assert.equal(result.failedStep, "take");
		assert.ok(alertMessage(result)?.body.includes("The application is NOT running"));
	});

	it("a refused night: no set, the reason, and an alert", () => {
		const result = nightResult({
			startedAt,
			set: "2026-11-27T200000Z",
			done: [],
			appRunning: false,
			reason: "the application is not running (inactive): no Recovery Set tonight",
		});
		assert.equal(result.result, "refused");
		assert.equal(result.complete, false);
		const alert = alertMessage(result);
		assert.ok(alert?.subject.includes("no Recovery Set tonight"), String(alert?.subject));
		assert.ok(alert?.body.includes("not running (inactive)"), String(alert?.body));
	});
});

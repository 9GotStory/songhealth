// The production image check's verdicts (#453; scripts/production-image-check/plan.ts): the startup
// gate's build run as the image's own user, and a stop run the way the committed unit runs the
// container.
//
// The kill below is what the workstation read on 2026-11-25 with the unit as Feature 001 left it:
// `podman stop` reached SIGKILL after 10 s and the container exited 137 (#453 comment 7158951848).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
	startupBuildFailures,
	stopContract,
	stopFailures,
	type StartupBuild,
} from "../../scripts/production-image-check/plan.ts";

const UNIT = readFileSync(
	new URL("../../deploy/quadlet/songhealth-app.container", import.meta.url),
	"utf8",
);

describe("the stop contract the application unit sets", () => {
	it("runs Podman's init and counts the stop signal's exit 143 as a success (PO, #453 comment 7158951848)", () => {
		assert.deepEqual(stopContract(UNIT), {
			init: true,
			stopTimeout: 10,
			successExitStatuses: [143],
		});
	});

	it("reads each key in its own section, the last assignment winning and an empty one resetting the list", () => {
		const unit = [
			"[Container]",
			"RunInit=yes",
			"StopTimeout=30",
			"[Service]",
			"SuccessExitStatus=1",
			"SuccessExitStatus=",
			"SuccessExitStatus=143 SIGTERM",
			"RunInit=false",
		].join("\n");
		assert.deepEqual(stopContract(unit), {
			init: true,
			stopTimeout: 30,
			successExitStatuses: [143],
		});
	});
});

describe("the startup gate's build, as the image's own user", () => {
	const STARTED = 1_795_000_000_000;
	const PASSING: StartupBuild = {
		uid: 1000,
		status: 0,
		startedMs: STARTED,
		entryMs: STARTED + 12_000,
		manifestMs: STARTED + 3_000,
		worldWritable: [],
		output: ["[build] Complete!"],
	};

	it("passes a build by a non-root user that writes the server entry and the migration manifest anew", () => {
		assert.deepEqual(startupBuildFailures(PASSING), []);
	});

	it("names the failure of the image built from main at a7e287d by its EACCES line, past a line that counts no errors", () => {
		const denied = "Error: EACCES: permission denied, mkdir '/app/.astro/collections/'";
		const imageCopy = STARTED - 3_600_000;
		assert.deepEqual(
			startupBuildFailures({
				...PASSING,
				status: 1,
				entryMs: imageCopy,
				output: ["- 0 errors", `  ${denied}`, "    at Object.mkdirSync (node:fs:1760:26)"],
			}),
			[
				`the startup gate's build exited 1: ${denied}`,
				"the build did not emit dist/server/entry.mjs",
			],
		);
	});

	it("counts a file stamped up to a second before the build's start as written by it, and none older", () => {
		assert.deepEqual(startupBuildFailures({ ...PASSING, entryMs: STARTED - 1_000 }), []);
		assert.deepEqual(startupBuildFailures({ ...PASSING, entryMs: STARTED - 1_001 }), [
			"the build did not emit dist/server/entry.mjs",
		]);
	});

	it("names a build a signal ended with no error line, such as a kill for memory, and a manifest it did not write", () => {
		assert.deepEqual(
			startupBuildFailures({
				...PASSING,
				status: null,
				manifestMs: null,
				output: ["building client", "- 0 errors"],
			}),
			[
				"the startup gate's build was ended by a signal: no line names an error",
				"the build did not emit .emdash/migrations.json",
			],
		);
	});

	it("names a build run as root, and a path anyone may write", () => {
		assert.deepEqual(
			startupBuildFailures({ ...PASSING, uid: 0, worldWritable: ["/app/media", "/app/dist"] }),
			[
				"the startup gate's build ran as root, not as a non-root runtime user",
				"world-writable under /app: /app/media /app/dist",
			],
		);
	});
});

describe("the stop's verdict", () => {
	const AS_COMMITTED = { init: true, stopTimeout: 10, successExitStatuses: [143] };
	const FEATURE_001 = { init: false, stopTimeout: 10, successExitStatuses: [] };

	it("passes a container that leaves on the stop signal with a status the unit counts a success", () => {
		assert.deepEqual(stopFailures({ exitCode: 143, seconds: 0.35 }, AS_COMMITTED), []);
		assert.deepEqual(stopFailures({ exitCode: 0, seconds: 0.35 }, FEATURE_001), []);
	});

	it("names the kill Feature 001's unit reached: SIGKILL after the 10 s stop timeout", () => {
		assert.deepEqual(stopFailures({ exitCode: 137, seconds: 10.41 }, FEATURE_001), [
			"the stop ended in a kill: exit 137 after 10.41 s, the stop timeout being 10 s",
		]);
	});

	it("names a kill before the timeout, and a stop that reaches the timeout, but not one just under it", () => {
		assert.deepEqual(stopFailures({ exitCode: 137, seconds: 3.2 }, AS_COMMITTED), [
			"the stop ended in a kill: exit 137 after 3.2 s, the stop timeout being 10 s",
		]);
		assert.deepEqual(stopFailures({ exitCode: 143, seconds: 10 }, AS_COMMITTED), [
			"the stop ended in a kill: exit 143 after 10 s, the stop timeout being 10 s",
		]);
		assert.deepEqual(stopFailures({ exitCode: 143, seconds: 9.99 }, AS_COMMITTED), []);
	});

	it("names an exit the unit would end failed on", () => {
		assert.deepEqual(stopFailures({ exitCode: 143, seconds: 0.4 }, FEATURE_001), [
			"the container exited 143, which the unit does not count a success: systemd would mark it failed",
		]);
	});
});

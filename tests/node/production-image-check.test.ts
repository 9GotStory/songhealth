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

	it("reads only the keys systemd and Quadlet read: in their section, not in a comment", () => {
		const unit = [
			"[Container]",
			"# RunInit=true",
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
	const PASSING: StartupBuild = {
		uid: 1000,
		status: 0,
		entry: true,
		manifest: true,
		worldWritable: [],
		error: null,
	};

	it("passes a build by a non-root user that emits the server entry and the migration manifest anew", () => {
		assert.deepEqual(startupBuildFailures(PASSING), []);
	});

	it("names the failure of the image built from main at a7e287d: /app belongs to root", () => {
		const denied = "[EACCES: permission denied, mkdir '/app/.astro/collections/']";
		assert.deepEqual(startupBuildFailures({ ...PASSING, status: 1, entry: false, error: denied }), [
			`the startup gate's build exited 1: ${denied}`,
			"the build did not emit dist/server/entry.mjs",
		]);
	});

	it("names a build a signal ended with no error line, such as a kill for memory, and a manifest it did not write", () => {
		assert.deepEqual(startupBuildFailures({ ...PASSING, status: null, manifest: false }), [
			"the startup gate's build was ended by a signal: no line names an error",
			"the build did not emit .emdash/migrations.json",
		]);
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

	it("passes a container that leaves on the stop signal with a status the unit counts a success", () => {
		assert.deepEqual(stopFailures({ exitCode: 143, seconds: 0.5 }, AS_COMMITTED), []);
		assert.deepEqual(
			stopFailures({ exitCode: 0, seconds: 0.5 }, { ...AS_COMMITTED, successExitStatuses: [] }),
			[],
		);
	});

	it("names the kill Feature 001's unit reached: SIGKILL after the 10 s stop timeout", () => {
		assert.deepEqual(
			stopFailures(
				{ exitCode: 137, seconds: 10.68 },
				{ init: false, stopTimeout: 10, successExitStatuses: [] },
			),
			["the stop ended in a kill: exit 137 after 10.68 s, the stop timeout being 10 s"],
		);
	});

	it("names an exit the unit would end failed on", () => {
		assert.deepEqual(
			stopFailures({ exitCode: 143, seconds: 0.4 }, { ...AS_COMMITTED, successExitStatuses: [] }),
			[
				"the container exited 143, which the unit does not count a success: systemd would mark it failed",
			],
		);
	});
});

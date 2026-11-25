// Cutting a Release (#455; spec #450 "Releases"; GLOSSARY.md "Release"): what the cut refuses, what
// a Release's record must hold, and the pin that names the record's digest in the application unit.
// The planning module is scripts/release/plan.ts; scripts/release.ts runs it on the workstation.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";

import {
	archiveFailures,
	cutRefusals,
	harnessFileFailures,
	newRecord,
	pinFailures,
	pinUnit,
	recordFailures,
	storageFailures,
	tagMessage,
	withDeploymentCommit,
	type CutFacts,
	type ReleaseRecord,
} from "../../scripts/release/plan.ts";

const UNIT = readFileSync(
	new URL("../../deploy/quadlet/songhealth-app.container", import.meta.url),
	"utf8",
);

/** A cut every check admits: a release candidate of a clean checkout whose CI passed. */
const CLEAN: CutFacts = {
	version: "1.0.0-rc.1",
	treeChanges: [],
	checkRuns: [{ name: "checks", status: "completed", conclusion: "success" }],
	recordExists: false,
	tagExists: false,
	imageExists: false,
	packageVersion: "0.0.1",
	onMain: false,
};

describe("what the cut refuses", () => {
	it("admits a release candidate of a clean checkout whose checks passed, from any branch and any package version (PO, #455 comment 7163433918)", () => {
		assert.deepEqual(cutRefusals(CLEAN), []);
	});

	it("refuses a tree with uncommitted changes, naming them, untracked files among them", () => {
		assert.deepEqual(
			cutRefusals({ ...CLEAN, treeChanges: [" M src/pages/index.astro", "?? notes.txt"] }),
			["the checkout has uncommitted changes: src/pages/index.astro, notes.txt"],
		);
	});

	it("refuses a commit with no check run, one still running and one that failed, each alone", () => {
		assert.deepEqual(cutRefusals({ ...CLEAN, checkRuns: [] }), [
			"the commit has no check run: its checks have not passed",
		]);
		assert.deepEqual(
			cutRefusals({
				...CLEAN,
				checkRuns: [{ name: "checks", status: "in_progress", conclusion: null }],
			}),
			["the commit's checks have not passed: checks is in_progress"],
		);
		assert.deepEqual(
			cutRefusals({
				...CLEAN,
				checkRuns: [
					{ name: "checks", status: "completed", conclusion: "success" },
					{ name: "lint", status: "completed", conclusion: "failure" },
				],
			}),
			["the commit's checks have not passed: lint is failure"],
		);
	});

	it("refuses a version that already has a record, a tag or an image, each alone", () => {
		assert.deepEqual(cutRefusals({ ...CLEAN, recordExists: true }), [
			"1.0.0-rc.1 already has a record",
		]);
		assert.deepEqual(cutRefusals({ ...CLEAN, tagExists: true }), ["1.0.0-rc.1 already has a tag"]);
		assert.deepEqual(cutRefusals({ ...CLEAN, imageExists: true }), [
			"1.0.0-rc.1 already has an image: localhost/songhealth-app:1.0.0-rc.1",
		]);
	});

	it("refuses a version that is not SemVer, a leading v or a build part among them", () => {
		for (const version of ["1.0", "v1.0.0", "1.0.0+build.1", "01.0.0", "1.0.0-", "1.0.0-rc..1"]) {
			assert.deepEqual(cutRefusals({ ...CLEAN, version }), [
				`${version} is not a SemVer version such as 1.0.0 or 1.0.0-rc.1`,
			]);
		}
	});

	it("refuses a real Release whose package version differs, and one whose commit is not on main, each alone (PO, #455 comment 7163433918)", () => {
		const real = { ...CLEAN, version: "1.0.0", packageVersion: "1.0.0", onMain: true };
		assert.deepEqual(cutRefusals(real), []);
		assert.deepEqual(cutRefusals({ ...real, packageVersion: "0.0.1" }), [
			"package.json reads 0.0.1 at the commit, not 1.0.0",
		]);
		assert.deepEqual(cutRefusals({ ...real, onMain: false }), [
			"1.0.0 is a Release, and the commit is not on origin/main",
		]);
	});
});

const BUILD = "38bc57092803bca62fdaefa304e4b611802ec429";
const PIN = "1363222aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DIGEST = `sha256:${"7452e1b9".repeat(8)}`;
const ARCHIVE_SHA = "2c7b5116".repeat(8);
const CUT = {
	buildCommit: BUILD,
	digest: DIGEST,
	archiveSha256: ARCHIVE_SHA,
	archiveBytes: 862_000_000,
	cutAt: "2026-11-25T14:00:00Z",
};

describe("a Release's record", () => {
	it("holds a candidate's version, build commit, image and digest, and archive and checksum, with no tag and no pin yet", () => {
		const record = newRecord({ ...CUT, version: "1.0.0-rc.1" });
		assert.deepEqual(record, {
			version: "1.0.0-rc.1",
			buildCommit: BUILD,
			image: "localhost/songhealth-app:1.0.0-rc.1",
			digest: DIGEST,
			archive: {
				file: "songhealth-app-1.0.0-rc.1.oci.tar",
				sha256: ARCHIVE_SHA,
				bytes: 862_000_000,
			},
			tag: null,
			cutAt: "2026-11-25T14:00:00Z",
			deploymentConfigCommit: null,
		});
		assert.deepEqual(recordFailures(record), []);
	});

	it("names a real Release's tag, and the tag's message names the record: version, image and digest, archive and checksum", () => {
		const record = newRecord({ ...CUT, version: "1.0.0" });
		assert.equal(record.tag, "v1.0.0");
		assert.equal(
			tagMessage(record),
			[
				"Songhealth Release 1.0.0",
				"",
				"Its record: 1.0.0/record.json in the releases folder (docs/operations/production-foundation.md §7.7).",
				`Build commit: ${BUILD}`,
				`Image: localhost/songhealth-app:1.0.0@${DIGEST}`,
				`Archive: songhealth-app-1.0.0.oci.tar, SHA-256 ${ARCHIVE_SHA}`,
				"",
			].join("\n"),
		);
	});

	it("refuses a record missing or misnaming each thing it must hold, each alone", () => {
		const good = newRecord({ ...CUT, version: "1.0.0" });
		const cases: [Partial<ReleaseRecord>, string][] = [
			[{ version: "v1.0.0" }, "the record's version v1.0.0 is not SemVer"],
			[{ buildCommit: "38bc570" }, "the record's build commit 38bc570 is not a full commit"],
			[
				{ image: "localhost/songhealth-app:0.0.1" },
				"the record's image localhost/songhealth-app:0.0.1 is not localhost/songhealth-app:1.0.0",
			],
			[{ digest: "4cfccf41" }, "the record's digest 4cfccf41 is not a sha256 digest"],
			[
				{ archive: { ...good.archive, sha256: "" } },
				"the record's archive checksum  is not a SHA-256",
			],
			[
				{ archive: { ...good.archive, file: "app.tar" } },
				"the record's archive app.tar is not songhealth-app-1.0.0.oci.tar",
			],
			[{ tag: null }, "the record's tag null is not v1.0.0"],
			[
				{ deploymentConfigCommit: "abc" },
				"the record's deployment-configuration commit abc is not a full commit",
			],
			[
				{ deploymentConfigCommit: BUILD },
				"the record's deployment-configuration commit is its build commit: the pin is a second commit",
			],
		];
		for (const [change, failure] of cases)
			assert.deepEqual(recordFailures({ ...good, ...change }), [failure], failure);
		assert.deepEqual(
			recordFailures({ ...newRecord({ ...CUT, version: "1.0.0-rc.1" }), tag: "v1.0.0-rc.1" }),
			["the record's tag v1.0.0-rc.1 is not null"],
		);
	});

	it("gains the deployment-configuration commit once the pin is made, its build commit kept apart", () => {
		const record = withDeploymentCommit(newRecord({ ...CUT, version: "1.0.0-rc.1" }), PIN);
		assert.equal(record.buildCommit, BUILD);
		assert.equal(record.deploymentConfigCommit, PIN);
		assert.deepEqual(recordFailures(record), []);
	});
});

describe("the pin", () => {
	const record = newRecord({ ...CUT, version: "1.0.0-rc.1" });
	const pinned = `Image=localhost/songhealth-app:1.0.0-rc.1@${DIGEST}`;

	it("rewrites the application unit's Image= line alone to the record's image and digest", () => {
		const unit = pinUnit(UNIT, record);
		const before = UNIT.split("\n");
		const after = unit.split("\n");
		const changed = after.flatMap((line, at) => (line === before[at] ? [] : [[before[at], line]]));
		assert.deepEqual(changed, [
			[
				"Image=localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407",
				pinned,
			],
		]);
	});

	it("refuses a unit with no Image= line or two", () => {
		assert.throws(() => pinUnit("[Container]\nNetwork=x\n", record), /one Image= line, found 0/);
		assert.throws(
			() => pinUnit("[Container]\nImage=a\nImage=b\n", record),
			/one Image= line, found 2/,
		);
	});

	const AT_PIN = {
		commit: PIN,
		unit: pinUnit(UNIT, record),
		descends: true,
		onOrigin: true,
		harnessFilesSame: { "package.json": true, "tests/operations/verify-startup.sh": true },
	};

	it("admits a later commit whose unit pins the record's digest and whose harness files are the build commit's", () => {
		assert.deepEqual(pinFailures(record, AT_PIN), []);
	});

	it("refuses a unit that pins another digest, the build commit itself, a commit not after it or not on origin, and a changed harness file, each alone", () => {
		assert.deepEqual(pinFailures(record, { ...AT_PIN, unit: UNIT }), [
			`the unit at ${PIN.slice(0, 7)} pins localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407, not the record's localhost/songhealth-app:1.0.0-rc.1@${DIGEST}`,
		]);
		assert.deepEqual(pinFailures(record, { ...AT_PIN, commit: BUILD }), [
			"the pin is the build commit: it is a second commit, reviewed on its own",
		]);
		assert.deepEqual(pinFailures(record, { ...AT_PIN, descends: false }), [
			`${PIN.slice(0, 7)} does not descend from the build commit ${BUILD.slice(0, 7)}`,
		]);
		assert.deepEqual(pinFailures(record, { ...AT_PIN, onOrigin: false }), [
			`${PIN.slice(0, 7)} is on no branch of origin: the pin is recorded once its review has merged it`,
		]);
		for (const file of ["package.json", "tests/operations/verify-startup.sh"] as const) {
			assert.deepEqual(
				pinFailures(record, {
					...AT_PIN,
					harnessFilesSame: { ...AT_PIN.harnessFilesSame, [file]: false },
				}),
				[
					`${file} at ${PIN.slice(0, 7)} differs from the build commit's: the lifecycle harness requires the image's copy`,
				],
			);
		}
	});

	it("refuses a record that already has its pin", () => {
		assert.deepEqual(pinFailures(withDeploymentCommit(record, PIN), AT_PIN), [
			`1.0.0-rc.1 already has its deployment-configuration commit ${PIN.slice(0, 7)}`,
		]);
	});
});

describe("the image the cut made", () => {
	const SUMS = {
		"package.json": "a".repeat(64),
		"tests/operations/verify-startup.sh": "b".repeat(64),
	};

	it("admits an image whose package.json and startup script equal the build commit's byte for byte", () => {
		assert.deepEqual(harnessFileFailures(SUMS, { ...SUMS }), []);
	});

	it("names each harness file whose copy in the image differs, alone", () => {
		for (const file of ["package.json", "tests/operations/verify-startup.sh"] as const) {
			assert.deepEqual(harnessFileFailures({ ...SUMS, [file]: "c".repeat(64) }, SUMS), [
				`the image's /app/${file} differs from the build commit's: the lifecycle harness would refuse it`,
			]);
		}
	});

	it("admits an archive whose image, loaded into an empty store, reads the image's digest, and names one that does not", () => {
		assert.deepEqual(archiveFailures(DIGEST, DIGEST), []);
		const other = `sha256:${"6abecf6f".repeat(8)}`;
		assert.deepEqual(archiveFailures(DIGEST, other), [
			`loaded into an empty store, the archive's image reads ${other}, not the image's ${DIGEST}`,
		]);
	});
});

describe("the workstation's image storage", () => {
	const FEATURE_001 = "a1".repeat(32);
	const OTHER = "b2".repeat(32);
	const RELEASE = "c3".repeat(32);

	it("admits a cut that only added its image, the Feature 001 image still there", () => {
		assert.deepEqual(
			storageFailures({
				before: [FEATURE_001, OTHER],
				after: [OTHER, RELEASE, FEATURE_001],
				feature001Present: true,
			}),
			[],
		);
	});

	it("names each image the cut removed, and a missing Feature 001 image, each alone", () => {
		assert.deepEqual(
			storageFailures({
				before: [FEATURE_001, OTHER],
				after: [FEATURE_001],
				feature001Present: true,
			}),
			[`an image was removed during the cut: ${OTHER}`],
		);
		assert.deepEqual(
			storageFailures({ before: [OTHER], after: [OTHER], feature001Present: false }),
			[
				"the Feature 001 image localhost/songhealth-app:0.0.1@sha256:4cfccf41… is not in the workstation's storage",
			],
		);
	});
});

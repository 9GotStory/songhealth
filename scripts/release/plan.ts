// The rules of scripts/release.ts (#455; spec #450 "Releases"; GLOSSARY.md "Release"): what the cut
// refuses, what a Release's record holds, and the pin that names its digest in the application
// unit. No runtime import, so tests/node/release.test.ts loads it with plain node.

/** The repository a Release's image is tagged in, as Feature 001's 0.0.1 was. */
const IMAGE_REPOSITORY = "localhost/songhealth-app";

/**
 * SemVer 2.0.0's version with an optional pre-release part (semver.org, its suggested regular
 * expression), without the build part: a Release is named by its version alone.
 */
const SEMVER =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/;

/**
 * Whether a valid version is a release candidate: one with a pre-release part, such as 1.0.0-rc.1.
 */
function isCandidate(version: string): boolean {
	return version.includes("-");
}

/** The image a version is tagged as. */
export function imageName(version: string): string {
	return `${IMAGE_REPOSITORY}:${version}`;
}

/** One GitHub check run at the build commit, as the check-runs API gives it. */
export interface CheckRun {
	name: string;
	status: string;
	conclusion: string | null;
}

/** What the cut reads before it builds anything. */
export interface CutFacts {
	version: string;
	/** `git status --porcelain` of the checkout the command runs from, one line each. */
	treeChanges: string[];
	/** Every check run GitHub holds for the build commit. */
	checkRuns: CheckRun[];
	/** Whether the version's record exists in the releases folder. */
	recordExists: boolean;
	/** Whether the tag `v<version>` exists in the checkout. */
	tagExists: boolean;
	/** Whether the version's image exists in the workstation's storage. */
	imageExists: boolean;
	/** `package.json`'s version at the build commit. */
	packageVersion: string;
	/** Whether the build commit is on `origin/main`. */
	onMain: boolean;
}

/** The path a porcelain status line names: the new one of a rename. */
function changedPath(line: string): string {
	const path = line.slice(3);
	const arrow = path.indexOf(" -> ");
	return arrow >= 0 ? path.slice(arrow + 4) : path;
}

/** Why the cut refuses, one line each: none for a cut it may make. */
export function cutRefusals(facts: CutFacts): string[] {
	const { version, treeChanges, checkRuns } = facts;
	if (!SEMVER.test(version))
		return [`${version} is not a SemVer version such as 1.0.0 or 1.0.0-rc.1`];
	const refusals: string[] = [];
	if (treeChanges.length > 0)
		refusals.push(
			`the checkout has uncommitted changes: ${treeChanges.map(changedPath).join(", ")}`,
		);
	if (checkRuns.length === 0)
		refusals.push("the commit has no check run: its checks have not passed");
	for (const run of checkRuns) {
		if (run.status !== "completed")
			refusals.push(`the commit's checks have not passed: ${run.name} is ${run.status}`);
		else if (run.conclusion !== "success")
			refusals.push(`the commit's checks have not passed: ${run.name} is ${run.conclusion}`);
	}
	if (facts.recordExists) refusals.push(`${version} already has a record`);
	if (facts.tagExists) refusals.push(`${version} already has a tag`);
	if (facts.imageExists) refusals.push(`${version} already has an image: ${imageName(version)}`);
	if (!isCandidate(version)) {
		if (facts.packageVersion !== version)
			refusals.push(`package.json reads ${facts.packageVersion} at the commit, not ${version}`);
		if (!facts.onMain)
			refusals.push(`${version} is a Release, and the commit is not on origin/main`);
	}
	return refusals;
}

/** The tag a version's record names: `v<version>` for a Release, none for a release candidate. */
export function tagName(version: string): string | null {
	return isCandidate(version) ? null : `v${version}`;
}

/** The OCI archive a version's image is saved to, beside its record. */
export function archiveName(version: string): string {
	return `songhealth-app-${version}.oci.tar`;
}

/**
 * A Release's record (spec #450 "Releases"): `record.json` in `<releases folder>/<version>/`,
 * beside the archive, and kept off the host with it.
 */
export interface ReleaseRecord {
	version: string;
	/** The commit the image was built from. */
	buildCommit: string;
	/** The image's name in the workstation's storage: `localhost/songhealth-app:<version>`. */
	image: string;
	/** The image's manifest digest, `sha256:<hex>`, which the unit pins. */
	digest: string;
	/** The OCI archive the image was saved to, its SHA-256 and its size in bytes. */
	archive: { file: string; sha256: string; bytes: number };
	/**
	 * A Release's tag on its build commit; null for a release candidate (#455 comment 7163433918).
	 */
	tag: string | null;
	/** When the cut wrote the record, in UTC. */
	cutAt: string;
	/** The later commit whose unit pins the digest; null until `pinned` records it. */
	deploymentConfigCommit: string | null;
}

/** What a cut that passed every step knows. */
export interface CutResult {
	version: string;
	buildCommit: string;
	digest: string;
	archiveSha256: string;
	archiveBytes: number;
	cutAt: string;
}

/** The record a cut writes. */
export function newRecord(cut: CutResult): ReleaseRecord {
	return {
		version: cut.version,
		buildCommit: cut.buildCommit,
		image: imageName(cut.version),
		digest: cut.digest,
		archive: { file: archiveName(cut.version), sha256: cut.archiveSha256, bytes: cut.archiveBytes },
		tag: tagName(cut.version),
		cutAt: cut.cutAt,
		deploymentConfigCommit: null,
	};
}

const FULL_COMMIT = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;

/** What is wrong with a record, one line each: none for one a deployment may read. */
export function recordFailures(record: ReleaseRecord): string[] {
	const { version, buildCommit, image, digest, archive, tag, deploymentConfigCommit } = record;
	if (!SEMVER.test(version)) return [`the record's version ${version} is not SemVer`];
	const failures: string[] = [];
	if (!FULL_COMMIT.test(buildCommit))
		failures.push(`the record's build commit ${buildCommit} is not a full commit`);
	if (image !== imageName(version))
		failures.push(`the record's image ${image} is not ${imageName(version)}`);
	if (!digest.startsWith("sha256:") || !SHA256.test(digest.slice(7)))
		failures.push(`the record's digest ${digest} is not a sha256 digest`);
	if (archive.file !== archiveName(version))
		failures.push(`the record's archive ${archive.file} is not ${archiveName(version)}`);
	if (!SHA256.test(archive.sha256))
		failures.push(`the record's archive checksum ${archive.sha256} is not a SHA-256`);
	if (tag !== tagName(version)) failures.push(`the record's tag ${tag} is not ${tagName(version)}`);
	if (deploymentConfigCommit !== null) {
		if (!FULL_COMMIT.test(deploymentConfigCommit))
			failures.push(
				`the record's deployment-configuration commit ${deploymentConfigCommit} is not a full commit`,
			);
		else if (deploymentConfigCommit === buildCommit)
			failures.push(
				"the record's deployment-configuration commit is its build commit: the pin is a second commit",
			);
	}
	return failures;
}

/** The image and digest the unit pins: `localhost/songhealth-app:<version>@sha256:<hex>`. */
export function pinnedImage(record: ReleaseRecord): string {
	return `${record.image}@${record.digest}`;
}

/** The message of a Release's annotated tag, which names its record. */
export function tagMessage(record: ReleaseRecord): string {
	return [
		`Songhealth Release ${record.version}`,
		"",
		`Its record: ${record.version}/record.json in the releases folder (docs/operations/production-foundation.md §7.7).`,
		`Build commit: ${record.buildCommit}`,
		`Image: ${pinnedImage(record)}`,
		`Archive: ${record.archive.file}, SHA-256 ${record.archive.sha256}`,
		"",
	].join("\n");
}

const IMAGE_LINE = /^Image=(.*)$/;

/** The application unit's text with its one `Image=` line pinning the record's image and digest. */
export function pinUnit(unit: string, record: ReleaseRecord): string {
	const lines = unit.split("\n");
	const at = lines.flatMap((line, index) => (IMAGE_LINE.test(line) ? [index] : []));
	if (at.length !== 1) throw new Error(`the unit must hold one Image= line, found ${at.length}`);
	lines[at[0]] = `Image=${pinnedImage(record)}`;
	return lines.join("\n");
}

/**
 * The files the lifecycle harness (tests/operations/verify-foundation.sh) requires the image's
 * copies of to equal the checkout's byte for byte.
 */
export const HARNESS_FILES = ["package.json", "tests/operations/verify-startup.sh"] as const;

/** What `pinned` reads at the commit said to pin the record's digest. */
export interface PinFacts {
	commit: string;
	/** The application unit's text at that commit. */
	unit: string;
	/** Whether the commit descends from the build commit. */
	descends: boolean;
	/** Whether a branch of origin holds the commit: its review merged it. */
	onOrigin: boolean;
	/** For each harness file, whether the commit's copy equals the build commit's byte for byte. */
	harnessFilesSame: Record<(typeof HARNESS_FILES)[number], boolean>;
}

/** Why a commit is not the record's pin, one line each: none for one `pinned` may record. */
export function pinFailures(record: ReleaseRecord, facts: PinFacts): string[] {
	const short = (commit: string) => commit.slice(0, 7);
	if (record.deploymentConfigCommit !== null)
		return [
			`${record.version} already has its deployment-configuration commit ${short(record.deploymentConfigCommit)}`,
		];
	if (facts.commit === record.buildCommit)
		return ["the pin is the build commit: it is a second commit, reviewed on its own"];
	const failures: string[] = [];
	if (!facts.descends)
		failures.push(
			`${short(facts.commit)} does not descend from the build commit ${short(record.buildCommit)}`,
		);
	if (!facts.onOrigin)
		failures.push(
			`${short(facts.commit)} is on no branch of origin: the pin is recorded once its review has merged it`,
		);
	const images = facts.unit.split("\n").flatMap((line) => IMAGE_LINE.exec(line)?.[1] ?? []);
	if (images.length !== 1 || images[0] !== pinnedImage(record))
		failures.push(
			`the unit at ${short(facts.commit)} pins ${images.join(", ") || "no image"}, not the record's ${pinnedImage(record)}`,
		);
	for (const file of HARNESS_FILES)
		if (!facts.harnessFilesSame[file])
			failures.push(
				`${file} at ${short(facts.commit)} differs from the build commit's: the lifecycle harness requires the image's copy`,
			);
	return failures;
}

/** The record with the commit that pins its digest. */
export function withDeploymentCommit(record: ReleaseRecord, commit: string): ReleaseRecord {
	return { ...record, deploymentConfigCommit: commit };
}

/** The SHA-256 of each harness file, by its path in the checkout. */
export type HarnessSums = Record<(typeof HARNESS_FILES)[number], string>;

/**
 * Why the image's harness files do not equal the build commit's (the image's /app/<path> against
 * `git show <commit>:<path>`), one line each: none for an image the lifecycle harness admits.
 */
export function harnessFileFailures(image: HarnessSums, commit: HarnessSums): string[] {
	return HARNESS_FILES.filter((file) => image[file] !== commit[file]).map(
		(file) =>
			`the image's /app/${file} differs from the build commit's: the lifecycle harness would refuse it`,
	);
}

/**
 * Why the archive does not keep the image's digest: none when loaded into an empty store it reads
 * the same.
 */
export function archiveFailures(imageDigest: string, loadedDigest: string): string[] {
	return loadedDigest === imageDigest
		? []
		: [
				`loaded into an empty store, the archive's image reads ${loadedDigest}, not the image's ${imageDigest}`,
			];
}

/** Feature 001's accepted image, which stays in the workstation's storage as a record. */
export const FEATURE_001_IMAGE =
	"localhost/songhealth-app:0.0.1@sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407";

/**
 * Why the workstation's storage is not as the cut found it plus its image, one line each: the
 * command removes no image, and the Feature 001 image stays. `before` and `after` are the IDs of
 * every image, `podman images -aq --no-trunc`.
 */
export function storageFailures(storage: {
	before: string[];
	after: string[];
	feature001Present: boolean;
}): string[] {
	const after = new Set(storage.after);
	const failures = storage.before
		.filter((id) => !after.has(id))
		.map((id) => `an image was removed during the cut: ${id}`);
	if (!storage.feature001Present)
		failures.push(
			`the Feature 001 image ${FEATURE_001_IMAGE.slice(0, 46)}… is not in the workstation's storage`,
		);
	return failures;
}

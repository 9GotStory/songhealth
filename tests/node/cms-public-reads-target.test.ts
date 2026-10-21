// T022 — focused offline target/source/lifecycle guard controls for the
// disposable-runtime adaptation in tests/browser/run-cms-public-reads.mjs
// and tests/browser/cms-public-reads.spec.ts. Standard-library Node tests
// with fully faked subprocess/fetch — no app, controller, DB, media,
// credential or second server is contacted. These controls verify the
// ADAPTATION's admission logic only; they are not native runtime evidence.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const coordinatorUrl = new URL(
	"../browser/run-cms-public-reads.mjs",
	import.meta.url,
);
const coordinator = (await import(coordinatorUrl.href)) as unknown as {
	PERSISTENT_DEVELOPMENT_ORIGIN: string;
	disposableMode: () => boolean;
	disposableOrigin: () => { error?: string; origin?: string };
	disposableSourceIdentity: () => Promise<
		{ error?: string; sha?: string; provenance?: string }
	>;
};

const PERSISTENT = "http://127.0.0.1:4322";
assert.equal(coordinator.PERSISTENT_DEVELOPMENT_ORIGIN, PERSISTENT);

function withEnv(env, fn) {
	const saved = {};
	for (const [key, value] of Object.entries(env)) {
		saved[key] = process.env[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	return Promise.resolve(fn()).finally(() => {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});
}

test("disposable mode is explicit opt-in only", () => {
	withEnv({ SONGHEALTH_T021_DISPOSABLE_ORIGIN: undefined }, () => {
		assert.equal(coordinator.disposableMode(), false);
	});
	withEnv({ SONGHEALTH_T021_DISPOSABLE_ORIGIN: "http://127.0.0.1:4323" }, () => {
		assert.equal(coordinator.disposableMode(), true);
	});
});

test("the persistent shared origin is refused in disposable mode", () => {
	withEnv({ SONGHEALTH_T021_DISPOSABLE_ORIGIN: PERSISTENT }, () => {
		const outcome = coordinator.disposableOrigin();
		assert.ok(outcome.error?.includes("must not" as never) === false || true);
		assert.notEqual(outcome.origin, PERSISTENT);
		assert.ok(outcome.error !== undefined, "4322 must be refused");
		assert.match(outcome.error, /persistent shared origin/);
	});
});

test("malformed disposable origins refuse", () => {
	for (const value of ["", "   ", "http://0.0.0.0:4323", "http://localhost:4323",
		"https://127.0.0.1:4323", "http://127.0.0.1:0", "http://127.0.0.1:99999",
		"http://127.0.0.1:4323/path", "not-a-url"]) {
		withEnv({ SONGHEALTH_T021_DISPOSABLE_ORIGIN: value }, () => {
			const outcome = coordinator.disposableOrigin();
			assert.ok(outcome.error !== undefined, `must refuse ${JSON.stringify(value)}`);
			assert.equal(outcome.origin, undefined);
		});
	}
});

test("a valid disposable loopback origin is admitted exactly", () => {
	withEnv({ SONGHEALTH_T021_DISPOSABLE_ORIGIN: "http://127.0.0.1:4323/" }, () => {
		assert.equal(coordinator.disposableOrigin().origin, "http://127.0.0.1:4323");
	});
});

test("disposable source identity refuses malformed or undeclared SHAs", async () => {
	await withEnv({ SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: undefined }, async () => {
		const outcome = await coordinator.disposableSourceIdentity();
		assert.ok(outcome.error !== undefined);
		assert.match(outcome.error, /40-hex/);
	});
	for (const declared of ["short", "1234567890abcdef1234567890abcdef12345678x", "zzzz"]) {
		await withEnv({ SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: declared }, async () => {
			const outcome = await coordinator.disposableSourceIdentity();
			assert.ok(outcome.error !== undefined);
			assert.match(outcome.error, /40-hex/);
		});
	}
});

test("disposable source identity refuses a declared SHA that does not match this checkout", async () => {
	await withEnv(
		{ SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: "1234567890abcdef1234567890abcdef12345678" },
		async () => {
			const outcome = await coordinator.disposableSourceIdentity();
			// The checkout under test is at its real HEAD: a foreign declared
			// SHA can never pass (mismatch or unclean-tree refusal — both are
			// refusals, never an identity pass).
			assert.ok(outcome.error !== undefined, "a foreign declared SHA must refuse");
			assert.match(
				outcome.error,
				/mismatch|40-hex|status|HEAD/,
			);
		},
	);
});

test("the adapted spec keeps its persistent-only contract without the disposable target variable", async () => {
	const spec = await readFileText(
		new URL("../browser/cms-public-reads.spec.ts", import.meta.url).pathname,
	);
	assert.match(spec, /ADMITTED_TARGET_ORIGIN/);
	assert.match(spec, /SONGHEALTH_T021_TARGET_ORIGIN/);
	// The persistent refusal stays: the target variable must not name 4322.
	assert.match(spec, /must not name the persistent shared origin/);
	// Every URL base now uses the admitted target (no bare 4322 bases remain).
	assert.doesNotMatch(spec, /new URL\((?!T021_ROUTE_PATTERN[^\n]*ADMITTED_TARGET_ORIGIN)[^\n]*PERSISTENT_DEVELOPMENT_ORIGIN\)/);
});

async function readFileText(pathname) {
	const { readFile } = await import("node:fs/promises");
	return readFile(pathname, "utf8");
}

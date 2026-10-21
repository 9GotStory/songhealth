// T022 — focused offline target/source/lifecycle guard controls for the
// disposable-runtime adaptation in tests/browser/run-cms-public-reads.mjs
// and tests/browser/cms-public-reads.spec.ts, extended in corrective round
// 1/1 (serving-process admission, fail-closed partial disposable inputs,
// aligned target validation, native preview-expiry boundary). Standard-
// library Node tests with faked subprocess/observability seams and, where
// marked, the INSTALLED native EmDash token module with dummy material —
// no app, controller, DB, media, credential or second server is contacted.
// These controls verify the ADAPTATION's admission logic only; they are not
// native runtime evidence.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { readFile, writeFile, rm, mkdir, readdir } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const coordinatorPath = path.join(repoRoot, "tests/browser/run-cms-public-reads.mjs");
const specPath = path.join(repoRoot, "tests/browser/cms-public-reads.spec.ts");

const coordinatorUrl = new URL(
	"../browser/run-cms-public-reads.mjs",
	import.meta.url,
);
const coordinator = (await import(coordinatorUrl.href)) as unknown as {
	PERSISTENT_DEVELOPMENT_ORIGIN: string;
	disposableMode: () => boolean;
	disposableOrigin: () => { error?: string; origin?: string };
	disposableInputCompleteness: () => { complete: boolean; error?: string };
	disposableSourceIdentity: (options?: {
		trackedOnly?: boolean;
	}) => Promise<{ error?: string; sha?: string; provenance?: string }>;
	admittedServingProcess: (
		origin: string,
		expectedSha: string,
		deps?: {
			runSs?: () => Promise<{ error?: string; stdout?: string }>;
			readCmdline?: (
				pid: string,
			) => Promise<{ error?: string; value?: string }>;
			readCwd?: (pid: string) => Promise<{ error?: string; value?: string }>;
			gitHead?: (cwd: string) => Promise<{ error?: string; value?: string }>;
		},
	) => Promise<{
		error?: string;
		pid?: number;
		sourceRoot?: string;
		sha?: string;
		provenance?: string;
	}>;
};

const PERSISTENT = "http://127.0.0.1:4322";
assert.equal(coordinator.PERSISTENT_DEVELOPMENT_ORIGIN, PERSISTENT);

function withEnv(
	env: Record<string, string | undefined>,
	fn: () => unknown,
): Promise<unknown> {
	const saved: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(env)) {
		saved[key] = process.env[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	const restore = () => {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	};
	try {
		const result = fn();
		if (result instanceof Promise) {
			return result.finally(restore);
		}
		// Sync bodies restore synchronously so a later test never observes a
		// leaked value on a pending microtask.
		restore();
		return Promise.resolve(result);
	} catch (error) {
		restore();
		return Promise.reject(error);
	}
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
		assert.ok(outcome.error !== undefined, "4322 must be refused");
		assert.match(outcome.error ?? "", /persistent shared origin/);
		assert.notEqual(outcome.origin, PERSISTENT);
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
		assert.match(outcome.error ?? "", /40-hex/);
	});
	for (const declared of ["short", "1234567890abcdef1234567890abcdef12345678x", "zzzz"]) {
		await withEnv({ SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: declared }, async () => {
			const outcome = await coordinator.disposableSourceIdentity();
			assert.ok(outcome.error !== undefined);
			assert.match(outcome.error ?? "", /40-hex/);
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
				outcome.error ?? "",
				/mismatch|40-hex|status|HEAD/,
			);
		},
	);
});

test("disposable inputs are all-or-nothing: a partial request never selects the persistent path", () => {
	const cases: Array<Record<string, string | undefined>> = [
		{ SONGHEALTH_T021_DISPOSABLE_ORIGIN: "http://127.0.0.1:4323" },
		{ SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: "a".repeat(40) },
		// Blank-but-present counterpart with the other input set is equally
		// partial (a blank value is a missing value, not a disposable request).
		{
			SONGHEALTH_T021_DISPOSABLE_ORIGIN: "   ",
			SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: "a".repeat(40),
		},
		{
			SONGHEALTH_T021_DISPOSABLE_ORIGIN: "http://127.0.0.1:4323",
			SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: "",
		},
	];
	for (const env of cases) {
		withEnv(
			{
				SONGHEALTH_T021_DISPOSABLE_ORIGIN: undefined,
				SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: undefined,
				...env,
			},
			() => {
				const outcome = coordinator.disposableInputCompleteness();
				assert.equal(outcome.complete, false, `must refuse ${JSON.stringify(env)}`);
				assert.match(outcome.error ?? "", /incomplete disposable inputs/);
			},
		);
	}
	withEnv(
		{
			SONGHEALTH_T021_DISPOSABLE_ORIGIN: "http://127.0.0.1:4323",
			SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: "b".repeat(40),
		},
		() => {
			assert.equal(coordinator.disposableInputCompleteness().complete, true);
		},
	);
	withEnv(
		{ SONGHEALTH_T021_DISPOSABLE_ORIGIN: undefined, SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: undefined },
		() => {
			assert.equal(coordinator.disposableInputCompleteness().complete, true);
		},
	);
});

test("a partial disposable CLI request HOLDs BEFORE any controller, credential or child observation", async () => {
	const scratch = path.join(repoRoot, ".tmp", "t022-guard-cli");
	await rm(scratch, { recursive: true, force: true });
	await mkdir(scratch, { recursive: true });
	// Fake controller spy: any invocation leaves a marker and exits 0.
	const spy = path.join(scratch, "fake-controller.sh");
	await writeFile(
		spy,
		`#!/bin/sh\nprintf ran > "${path.join(scratch, "spy-ran")}"\nexit 0\n`,
		{ mode: 0o700 },
	);
	// Fake credential inputs (must never be read on this path).
	await writeFile(path.join(scratch, "dev-access.json"), '{"token":"not-a-real-token"}', { mode: 0o600 });
	await writeFile(path.join(scratch, "route-access.json"), '{"token":"not-a-real-token"}', { mode: 0o600 });
	try {
		const exit = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
			// Hermetic child env: the source-SHA input is explicitly omitted so
			// no ambient value can complete the partial request.
			const {
				SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA: _omitted,
				...baseEnv
			} = process.env as Record<string, string | undefined>;
			const child = spawn(process.execPath, [coordinatorPath], {
				cwd: repoRoot,
				env: {
					...baseEnv,
					SONGHEALTH_T021_DISPOSABLE_ORIGIN: "http://127.0.0.1:4323",
					SONGHEALTH_RUNTIME_CONTROLLER: spy,
					SONGHEALTH_DEV_ACCESS: path.join(scratch, "dev-access.json"),
					SONGHEALTH_T021_ROUTE_ACCESS: path.join(scratch, "route-access.json"),
				} as NodeJS.ProcessEnv,
			});
			let stderr = "";
			child.stderr.on("data", (chunk) => {
				stderr += String(chunk);
			});
			child.on("error", () => resolve({ code: -1, stderr }));
			child.on("close", (code) => resolve({ code: code ?? -1, stderr }));
		});
		assert.equal(exit.code, 3, `HOLD exit expected, got ${exit.code}: ${exit.stderr}`);
		assert.match(exit.stderr, /incomplete disposable inputs/);
		const spyRan = await readFile(path.join(scratch, "spy-ran"), "utf8").then(
			() => true,
			() => false,
		);
		assert.equal(
			spyRan,
			false,
			"the fake controller must never be invoked for a partial disposable request",
		);
	} finally {
		await rm(scratch, { recursive: true, force: true });
	}
});

test("serving-process admission refuses a port with no listener", async () => {
	const outcome = await coordinator.admittedServingProcess("http://127.0.0.1:4323", "f".repeat(40), {
		runSs: async () => ({
			stdout: 'LISTEN 0 511 127.0.0.1:9999 0.0.0.0:* users:(("other",pid=1,fd=9))',
		}),
		readCmdline: async () => ({ value: "unused" }),
		readCwd: async () => ({ value: "unused" }),
		gitHead: async () => ({ value: "unused" }),
	});
	assert.match(outcome.error ?? "", /no process is listening/);
});

test("serving-process admission refuses ambiguous, dead, foreign, wrong-root and wrong-HEAD processes", async () => {
	const sha = "f".repeat(40);
	const ssOne = 'LISTEN 0 511 127.0.0.1:4323 0.0.0.0:* users:(("MainThread",pid=4321,fd=26))';
	const ssTwo = 'LISTEN 0 511 127.0.0.1:4323 0.0.0.0:* users:(("a",pid=11,fd=9))\n' +
		'LISTEN 0 511 127.0.0.1:4323 0.0.0.0:* users:(("b",pid=22,fd=9))';
	const astroCmd = `/toolchain/node node ${repoRoot}/node_modules/astro/bin/astro.mjs dev --config .tmp/x.mjs`;
	const depsFor = (
		over: Partial<NonNullable<Parameters<typeof coordinator.admittedServingProcess>[2]>>,
	) => ({
		runSs: async () => ({ stdout: ssOne }),
		readCmdline: async () => ({ value: astroCmd }),
		readCwd: async () => ({ value: repoRoot }),
		gitHead: async () => ({ value: sha }),
		...over,
	});

	const two = await coordinator.admittedServingProcess("http://127.0.0.1:4323", sha, {
		runSs: async () => ({ stdout: ssTwo }),
		readCmdline: async () => ({ value: astroCmd }),
		readCwd: async () => ({ value: repoRoot }),
		gitHead: async () => ({ value: sha }),
	});
	assert.match(two.error ?? "", /multiple listeners/);

	const dead = await coordinator.admittedServingProcess("http://127.0.0.1:4323", sha, depsFor({
		readCmdline: async () => ({ error: "ENOENT" }),
	}));
	assert.match(dead.error ?? "", /no readable command line/);

	const foreign = await coordinator.admittedServingProcess("http://127.0.0.1:4323", sha, depsFor({
		readCmdline: async () => ({ value: "/usr/bin/some-other-server --port 4323" }),
	}));
	assert.match(foreign.error ?? "", /not an astro dev process/);

	const wrongRoot = await coordinator.admittedServingProcess("http://127.0.0.1:4323", sha, depsFor({
		readCwd: async () => ({ value: "/tmp" }),
	}));
	assert.match(wrongRoot.error ?? "", /not this checkout/);

	const wrongHead = await coordinator.admittedServingProcess("http://127.0.0.1:4323", sha, depsFor({
		gitHead: async () => ({ value: "0".repeat(40) }),
	}));
	assert.match(wrongHead.error ?? "", /not the declared execution SHA/);
});

test("serving-process admission binds a valid astro dev listener on this checkout", async () => {
	const realHead = await new Promise<string>((resolve, reject) => {
		execFile("git", ["rev-parse", "HEAD"], { cwd: repoRoot }, (error, stdout) => {
			if (error) reject(error);
			else resolve(String(stdout).trim());
		});
	});
	const astroCmd = `/toolchain/node node ${repoRoot}/node_modules/astro/bin/astro.mjs dev --config .tmp/t022r2/astro.dev.config.mjs`;
	const outcome = await coordinator.admittedServingProcess("http://127.0.0.1:4323", realHead, {
		runSs: async () => ({ stdout: 'LISTEN 0 511 127.0.0.1:4323 0.0.0.0:* users:(("MainThread",pid=4321,fd=26))' }),
		readCmdline: async () => ({ value: astroCmd }),
		readCwd: async () => ({ value: repoRoot }),
		gitHead: async () => ({ value: realHead }),
	});
	assert.equal(outcome.error, undefined);
	assert.equal(outcome.pid, 4321);
	assert.equal(outcome.sourceRoot, repoRoot);
	assert.equal(outcome.sha, realHead);
});

test("the installed native preview verifier expires only past exp (dummy material, no runtime key)", async () => {
	// Locate the installed EmDash 1.1.0 dist chunk carrying the ACTUAL
	// generate/verify functions (chunk file names are build-specific).
	const distDir = path.join(repoRoot, "node_modules", "emdash", "dist");
	const files = (await readdir(distDir)).filter((name) => name.endsWith(".mjs"));
	type Generate = (options: {
		contentId: string;
		expiresIn?: string | number;
		secret: string;
	}) => Promise<string>;
	type Verify = (options: {
		url: URL;
		secret: string;
	}) => Promise<{ valid: boolean; error?: string; payload?: { exp: number } }>;
	let generate: Generate | undefined;
	let verify: Verify | undefined;
	for (const name of files) {
		const text = await readFile(path.join(distDir, name), "utf8");
		if (
			!text.includes("async function generatePreviewToken") ||
			!text.includes("async function verifyPreviewToken")
		) {
			continue;
		}
		const mod = (await import(pathToFileURL(path.join(distDir, name)).href)) as Record<
			string,
			unknown
		>;
		for (const [key, value] of Object.entries(mod)) {
			const source = String(value);
			if (source.startsWith("async function generatePreviewToken")) {
				generate = value as Generate;
			} else if (source.startsWith("async function verifyPreviewToken")) {
				verify = value as Verify;
			}
		}
		break;
	}
	assert.ok(
		typeof generate === "function" && typeof verify === "function",
		"the installed native token module must be found with both functions",
	);
	const secret = "dummy-guard-secret-not-a-runtime-key";

	const live = await generate({ contentId: "pages:guard", expiresIn: 3600, secret });
	assert.equal(
		(await verify({ url: new URL(`http://127.0.0.1:1/?_preview=${live}`), secret })).valid,
		true,
	);

	const expired = await generate({ contentId: "pages:guard", expiresIn: -10, secret });
	const expiredOutcome = await verify({
		url: new URL(`http://127.0.0.1:1/?_preview=${expired}`),
		secret,
	});
	assert.equal(expiredOutcome.valid, false);
	assert.equal(expiredOutcome.error, "expired");
});

test("the spec's admitted-target initializer matches the coordinator admission (actual file, executed)", async () => {
	const spec = await readFile(specPath, "utf8");
	const start = spec.indexOf("const disposableTargetRaw");
	const endMarker = "})();";
	const end = spec.indexOf(endMarker, start);
	assert.ok(
		start >= 0 && end > start,
		"the ADMITTED_TARGET_ORIGIN initializer must exist in the spec",
	);
	const snippet = spec.slice(start, end + endMarker.length);
	const evaluate = (envValue: string | undefined): string => {
		const failures: string[] = [];
		const sandboxExpect = (received: unknown, message: string) => ({
			toBe: (expected: unknown) => {
				if (received !== expected) failures.push(message);
			},
		});
		const context: Record<string, unknown> = {
			PERSISTENT_DEVELOPMENT_ORIGIN: PERSISTENT,
			DISPOSABLE_TARGET_ENV: "SONGHEALTH_T021_TARGET_ORIGIN",
			ambientNodeProcess: {
				env:
					envValue === undefined
						? {}
						: { SONGHEALTH_T021_TARGET_ORIGIN: envValue },
			},
			expect: sandboxExpect,
		};
		const sandbox = vm.createContext(context);
		const outcome = vm.runInContext(
			`"use strict";\n${snippet}\nADMITTED_TARGET_ORIGIN`,
			sandbox,
		);
		if (failures.length > 0) {
			throw new Error(`initializer refused: ${failures.join("; ")}`);
		}
		return outcome as string;
	};
	assert.equal(evaluate("http://127.0.0.1:4323"), "http://127.0.0.1:4323");
	assert.equal(evaluate(undefined), PERSISTENT);
	for (const refused of [
		"http://127.0.0.1:4322",
		"http://127.0.0.1:99999",
		"http://0.0.0.0:4323",
		"http://127.0.0.1:04323",
	]) {
		assert.throws(
			() => evaluate(refused),
			/initializer refused/,
			`must refuse ${refused}`,
		);
	}
});

test("the missing-files control uses the supported native LIST address and admits native null (actual file)", async () => {
	const spec = await readFile(specPath, "utf8");
	// The single-media address probe is gone; the LIST-bound helper is used.
	assert.match(spec, /mediaPublicAddress/);
	assert.doesNotMatch(spec, /\[mediaItem\.src, mediaItem\.url\]/);
	assert.match(spec, /\/_emdash\/api\/media\?/);
	// Native null (or key-absent) admission for omitted optional fields,
	// never a fabricated value.
	assert.match(spec, /omittedSummary === undefined \|\| omittedSummary === null/);
	// The persistent refusal stays: the target variable must not name 4322.
	assert.match(spec, /must not name the persistent shared origin/);
});

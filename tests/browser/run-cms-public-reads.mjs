#!/usr/bin/env node
// The T021 public-read coordinator (Feature 002 T021, retargeted to the single runtime by T037).
//
// The single development runtime at http://127.0.0.1:4324 (docs/operations/development-quadlet.md)
// is the only target. The coordinator never starts, stops, restarts or substitutes a server, and an
// occupied origin is its intended state. It:
//   1. checks the exact source identity both ways: this checkout's full HEAD (or a 40-hex
//      SONGHEALTH_T021_EXPECTED_SOURCE_SHA), and the runtime source that dev-runtime-verify.sh
//      reports with VERIFY: PASS, plus the app's marker and the fixture route's identity probe. A
//      missing, malformed, stale or mismatched identity is a HOLD before any fixture is made or
//      any test runs;
//   2. checks the prerequisites: the Node major package.json engines pins, the pinned local
//      Playwright runner, and the mode-0600 development credential and route-access token (the
//      token is read only to probe the route);
//   3. HOLDs on any earlier run's ownership manifest, which it never replays, adopts or deletes;
//   4. runs tests/browser/cms-public-reads.spec.ts through the pinned Playwright runner, with
//      PLAYWRIGHT_BASE_URL pinned to the runtime and the opt-in that keeps an ordinary
//      `npm run test:browser` from running it;
//   5. owns only its Playwright child and the run's manifest: on failure, timeout, SIGINT or
//      SIGTERM it terminates and reaps that child, keeps the manifest while owned fixtures may
//      remain, and reports the primary and the cleanup failures together.
//
// Exit codes: 0 every test passed and no residue remained; 1 the Playwright run failed (its code);
// 2 the run passed but coverage or cleanup is incomplete; 3 HOLD, a prerequisite failed before the
// test run; 4 interrupted or timed out, the child terminated and reaped.
//
// Platform behaviour relied on (Node 26.13.0): global fetch with redirect "error" and
// AbortSignal.timeout;
// child_process spawn with awaited termination, and execFile for `git rev-parse HEAD` and
// dev-runtime-verify.sh (its `runtime source: <checkout> @ <sha>` line); the pinned
// @playwright/test 1.63.0 CLI (node_modules/@playwright/test/cli.js).

import { spawn, execFile } from "node:child_process";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";
import path from "node:path";

/** The ONE existing persistent development origin (CLAUDE.md Runtimes; tasks.md T037). */
export const PERSISTENT_DEVELOPMENT_ORIGIN = "http://127.0.0.1:4324";

/** The single spec file this coordinator may run. */
const SPEC_FILE = "tests/browser/cms-public-reads.spec.ts";

/** The repo-local pinned Playwright CLI (NOT `npm run test:browser`). */
const PLAYWRIGHT_CLI = "node_modules/@playwright/test/cli.js";

/** The public SSR marker proving the origin is the Songhealth application. */
const SSR_MARKER_PATTERN = /<meta\s+name="songhealth-foundation"\s+content="public-runtime"\s*\/?>/;

/** Explicit coordinator opt-in consumed by the spec file. */
const OPT_IN_ENV = "SONGHEALTH_T021_COORDINATOR";

/** Mode-0600 { token } JSON holding the client route-access token. */
const ROUTE_ACCESS_CREDENTIAL_ENV = "SONGHEALTH_T021_ROUTE_ACCESS";

/** Server-only token env the fixture route fails closed without. */
const ROUTE_TOKEN_ENV = "SONGHEALTH_T021_ROUTE_TOKEN";

/** Mode-0600 development PAT input, the runtime's dev-pat (existence only). */
const DEV_ACCESS_CREDENTIAL_ENV = "SONGHEALTH_DEV_ACCESS";

/** Per-run owned-fixture manifest passed to the worker. */
const OWNERSHIP_MANIFEST_ENV = "SONGHEALTH_T021_OWNERSHIP_MANIFEST";

/** Per-run test-status journal the worker appends to (R5). */
const RUN_STATUS_ENV = "SONGHEALTH_T021_RUN_STATUS";

/** Optional explicit expected candidate identity (40-hex), else git HEAD. */
const EXPECTED_SOURCE_ENV = "SONGHEALTH_T021_EXPECTED_SOURCE_SHA";

/** Discovery pre-pass budget (ms); overridable, bounded 5s..10min. */
const DISCOVERY_TIMEOUT_ENV = "SONGHEALTH_T021_DISCOVERY_TIMEOUT_MS";
const DEFAULT_DISCOVERY_TIMEOUT_MS = 60_000;

/** Overall child timeout (ms); overridable, bounded 60s..2h. */
const TIMEOUT_ENV = "SONGHEALTH_T021_TIMEOUT_MS";
const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const TERMINATION_GRACE_MS = 10_000;

/** Bounded deadline for every prerequisite request/observation (R4). */
const PREREQUISITE_DEADLINE_MS = 10_000;

/**
 * The single runtime's documented read-only verify, run from the runtime's
 * own checkout (docs/operations/development-quadlet.md): it checks health and
 * the promoted, clean source and reports `runtime source: <checkout> @ <sha>`.
 * It is invoked only to OBSERVE the runtime source identity. Overridable path
 * for offline controls.
 */
const RUNTIME_VERIFY_DEFAULT = path.join(
	os.homedir(),
	"dev/songhealth-quadlet/scripts/dev-runtime-verify.sh",
);
const RUNTIME_VERIFY_ENV = "SONGHEALTH_RUNTIME_VERIFY";
const RUNTIME_VERIFY_DEADLINE_MS = 120_000;

/** Bounded run scratch under the already-gitignored .tmp/ path. */
const SCRATCH_DIR = ".tmp/feature002";

const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/;

const HOLD_EXIT = 3;
const INTERRUPTED_EXIT = 4;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Truthful non-success termination with every reported reason. */
async function hold(reasons) {
	for (const reason of reasons) {
		process.stderr.write(`HOLD: ${reason}\n`);
	}
	process.exitCode = HOLD_EXIT;
}

/** Run one bounded, read-only helper command and capture its stdout. */
function boundedExec(file, args, label, timeoutMs = PREREQUISITE_DEADLINE_MS) {
	return new Promise((resolve) => {
		try {
			execFile(
				file,
				args,
				{ cwd: repoRoot, timeout: timeoutMs, maxBuffer: 1024 * 1024 },
				(error, stdout) => {
					if (error) {
						resolve({
							error: `${label} failed (${error.code ?? error.message})`,
							stdout: String(stdout ?? ""),
						});
					} else {
						resolve({ stdout: String(stdout) });
					}
				},
			);
		} catch (error) {
			resolve({ error: `${label} failed (${error.code ?? error.message})` });
		}
	});
}

/**
 * The EXPECTED full candidate identity (R2): an explicit 40-hex override
 * when provided, else the exact HEAD of THIS checkout (the candidate under
 * test). A git failure or malformed value is a HOLD — never a guess.
 */
export async function expectedSourceIdentity() {
	const explicit = process.env[EXPECTED_SOURCE_ENV];
	if (explicit !== undefined && explicit.trim().length > 0) {
		const trimmed = explicit.trim();
		if (!FULL_SHA_PATTERN.test(trimmed)) {
			return { error: `${EXPECTED_SOURCE_ENV} must be a full 40-hex SHA (got a malformed value)` };
		}
		return { sha: trimmed, provenance: `explicit ${EXPECTED_SOURCE_ENV}` };
	}
	const git = await boundedExec("git", ["rev-parse", "HEAD"], "git rev-parse HEAD");
	if (git.error !== undefined) {
		return { error: `could not establish the expected candidate identity: ${git.error}` };
	}
	const sha = (git.stdout ?? "").trim();
	if (!FULL_SHA_PATTERN.test(sha)) {
		return {
			error: `git rev-parse HEAD returned a non-SHA value — refusing to guess the candidate identity`,
		};
	}
	return { sha, provenance: "git rev-parse HEAD of this checkout" };
}

/**
 * The OBSERVED runtime source identity (R2), through the only approved
 * read-only observation: the single runtime's dev-runtime-verify.sh (T037; it
 * replaces the retired UID-1001 Runtime Controller `status`). Verify must end
 * with VERIFY: PASS — an unverified runtime is a HOLD that names its FAIL
 * lines — and its `runtime source: <checkout> @ <sha>` line carries the
 * promoted commit, which verify itself checked against the checkout's HEAD
 * and clean tree. Any failure, missing line or malformed value is a HOLD —
 * missing identity evidence must never let a worker spawn.
 */
export async function observedRuntimeSourceIdentity() {
	const verify = process.env[RUNTIME_VERIFY_ENV] ?? RUNTIME_VERIFY_DEFAULT;
	const run = await boundedExec(
		verify,
		[],
		`runtime verify (${verify})`,
		RUNTIME_VERIFY_DEADLINE_MS,
	);
	const lines = (run.stdout ?? "").trim().split("\n");
	if (run.error !== undefined || lines.at(-1) !== "VERIFY: PASS") {
		const failing = lines
			.filter((line) => line.startsWith("FAIL: "))
			.map((line) => line.slice("FAIL: ".length));
		return {
			error: `the runtime source identity could not be observed: ${run.error ?? `verify ended with ${JSON.stringify(lines.at(-1) ?? "")}`}${failing.length > 0 ? ` (failing: ${failing.join("; ")})` : ""}; an unverified runtime is a HOLD, never an assumption`,
		};
	}
	const source = /^runtime source: .+ @ ([0-9a-f]{40})$/.exec(lines.at(-2) ?? "")?.[1];
	if (source === undefined || !FULL_SHA_PATTERN.test(source)) {
		return {
			error: "the runtime verify output carries no full 40-hex `runtime source` identity line",
		};
	}
	return {
		sha: source,
		provenance: `runtime verify (${verify}) — the documented read-only observation`,
	};
}

/** A minimal JSON response read with redirects refused and bounded time. */
async function fetchJson(url, headers = {}) {
	const response = await fetch(url, {
		headers,
		redirect: "error",
		signal: AbortSignal.timeout(PREREQUISITE_DEADLINE_MS),
	});
	let body;
	try {
		body = await response.json();
	} catch {
		body = undefined;
	}
	return { status: response.status, body, headers: response.headers };
}

/**
 * Verify the mode-0600 credential input WITHOUT reading it (the worker
 * loads the PAT itself; the coordinator never holds it).
 */
export async function credentialInputHolds(environmentVariable, label) {
	const value = process.env[environmentVariable];
	if (value === undefined || value.trim().length === 0) {
		return `${label} prerequisite missing: set ${environmentVariable} to its mode-0600 credential file path`;
	}
	try {
		const stats = await stat(value.trim());
		if (!stats.isFile()) {
			return `${label} input ${value} is not a regular file`;
		}
		if ((stats.mode & 0o777) !== 0o600) {
			return `${label} input ${value} must be mode 0600 (refusing looser credential scratch)`;
		}
	} catch (error) {
		return `${label} input ${value} is not readable (${error.code ?? error.message})`;
	}
	return undefined;
}

/** Read the client route-access token (controller-format { token } JSON). */
export async function readRouteAccessToken() {
	const value = process.env[ROUTE_ACCESS_CREDENTIAL_ENV];
	if (value === undefined || value.trim().length === 0) {
		return {
			error: `route access prerequisite missing: set ${ROUTE_ACCESS_CREDENTIAL_ENV} to the mode-0600 { token } JSON provisioned with the server-side ${ROUTE_TOKEN_ENV} capability`,
		};
	}
	try {
		const stats = await stat(value.trim());
		if (!stats.isFile() || (stats.mode & 0o777) !== 0o600) {
			return { error: `route access input ${value} must be a mode-0600 regular file` };
		}
		const parsed = JSON.parse(await readFile(value.trim(), "utf8"));
		if (
			parsed === null ||
			typeof parsed !== "object" ||
			typeof parsed.token !== "string" ||
			parsed.token.trim().length === 0
		) {
			return { error: `route access input ${value} carries no non-empty string token field` };
		}
		return { token: parsed.token };
	} catch (error) {
		return {
			error: `route access input ${value} could not be read (${error.code ?? error.message})`,
		};
	}
}

/**
 * Prerequisite — application identity: the persistent origin must answer as
 * the expected Songhealth application (the public SSR marker). This alone
 * is NOT source identity (R2); the SHA comparison below is. No server is
 * ever started here; a connection failure is a HOLD, not something to boot
 * around. Bounded by an abort deadline (R4).
 */
async function originIdentityHolds() {
	try {
		const response = await fetch(new URL("/", PERSISTENT_DEVELOPMENT_ORIGIN), {
			redirect: "error",
			signal: AbortSignal.timeout(PREREQUISITE_DEADLINE_MS),
		});
		if (response.status !== 200) {
			return `unexpected origin response: GET / answered ${response.status} (expected 200 from the persistent development application)`;
		}
		const body = await response.text();
		if (!SSR_MARKER_PATTERN.test(body)) {
			return "unexpected application identity: the origin does not serve the songhealth-foundation public SSR marker — refusing to treat it as the persistent Songhealth application";
		}
		return undefined;
	} catch (error) {
		const reason =
			error?.name === "TimeoutError"
				? "deadline exceeded"
				: (error.cause?.code ?? error.cause?.message ?? error.message);
		return `the persistent development origin ${PERSISTENT_DEVELOPMENT_ORIGIN} did not answer (${reason}); an unavailable shared app is a HOLD prerequisite — never authorization to start, restart or substitute a server`;
	}
}

/**
 * Prerequisite — fixture readiness: the dev-only public-read fixture must
 * be installed on THAT server with the expected identity, and (when the
 * route declares one) its server-side source identity must AGREE with the
 * expected candidate SHA. 404 (integration not installed), 503 (route
 * access capability unprovisioned), 403 (token mismatch) and identity
 * mismatch are each distinct HOLD reasons naming the missing prerequisite.
 */
async function fixtureReadinessHolds(routeAccessToken, expectedSha) {
	const url = new URL("/__feature002/public-reads?case=probe", PERSISTENT_DEVELOPMENT_ORIGIN);
	let probe;
	try {
		probe = await fetchJson(url, { "x-songhealth-t021-route-access": routeAccessToken });
	} catch (error) {
		const reason =
			error?.name === "TimeoutError" ? "deadline exceeded" : (error.cause?.code ?? error.message);
		return `the fixture route probe failed against the persistent origin (${reason})`;
	}
	if (probe.status === 404) {
		return "the dev-only fixture route /__feature002/public-reads is not installed on the runtime (its development configuration deploy/dev-quadlet/astro.dev.config.mjs arrives with T037: promote a commit that contains it) — HOLD, not a substitute server";
	}
	if (probe.status === 503) {
		return "the fixture route is installed but its server-only access token is unprovisioned (503) — the runtime installer provisions the token pair; re-run it — HOLD";
	}
	if (probe.status === 403) {
		return "the fixture route refused the coordinated route access token (403) — the client/server token pair does not match; delete the client copy and re-run the runtime installer, which replaces the pair whole";
	}
	if (probe.status !== 200) {
		return `unexpected fixture probe status ${probe.status}`;
	}
	const body = probe.body ?? {};
	if (body.fixtureId !== "songhealth:t021:cms-public-reads" || body.fixtureVersion !== 1) {
		return `unexpected fixture identity at /__feature002/public-reads (fixtureId=${String(body.fixtureId)}, fixtureVersion=${String(body.fixtureVersion)}) — refusing to run against an unknown fixture`;
	}
	if (
		body.sourceIdentity !== undefined &&
		body.sourceIdentity !== null &&
		body.sourceIdentity !== expectedSha
	) {
		return `the fixture route declares source identity ${String(body.sourceIdentity)} but the candidate under test is ${expectedSha} — refusing to run against a different source`;
	}
	if (!(probe.headers.get("cache-control") ?? "").includes("no-store")) {
		return "the fixture route does not serve no-store responses as the approved contract requires";
	}
	return undefined;
}

/**
 * PRIOR-RUN EVIDENCE SCAN (scope reduction): a manifest file that still
 * exists after an earlier run is HISTORICAL ownership evidence. Journal
 * replay, adoption and automatic deletion are retired, so such evidence is
 * never handed to a worker, never consumed, and never deleted — even an
 * EMPTY or unreadable leftover is evidence of an unfinished earlier run,
 * not proof of absence or cleanup success. Encountering any of it is a
 * named prerequisite HOLD before the worker spawns; disposition is a
 * separately authorized operator action.
 */
export async function priorRunEvidencePaths(currentManifest) {
	const found = [];
	const unreadable = [];
	try {
		const entries = await readdir(path.join(repoRoot, SCRATCH_DIR), { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.startsWith("t021-ownership-")) {
				continue;
			}
			const leftover = path.join(repoRoot, SCRATCH_DIR, entry.name);
			if (leftover === currentManifest) {
				continue;
			}
			try {
				const contents = await readFile(leftover, "utf8");
				// Presence is the signal: empty and non-empty alike HOLD.
				found.push({ path: leftover, empty: contents.trim().length === 0 });
			} catch (error) {
				unreadable.push(`${path.relative(repoRoot, leftover)} (${error.code ?? error.message})`);
			}
		}
	} catch {
		// Scratch absent — no leftovers.
	}
	return { found, unreadable };
}

/** Terminated-and-reaped child outcome. */
export async function terminateChild(child, reason) {
	if (child.exitCode !== null || child.signalCode !== null) {
		return { code: child.exitCode, signal: child.signalCode };
	}
	if (!child.kill("SIGTERM")) {
		child.kill("SIGKILL");
	}
	const graceTimer = setTimeout(() => resolveGrace(undefined), TERMINATION_GRACE_MS);
	let resolveGrace;
	const gracePromise = new Promise((resolve) => {
		resolveGrace = resolve;
	});
	const exited = await Promise.race([
		new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal }))),
		gracePromise,
	]);
	clearTimeout(graceTimer);
	if (exited === undefined) {
		child.kill("SIGKILL");
		const reaped = await new Promise((resolve) =>
			child.once("exit", (code, signal) => resolve({ code, signal })),
		);
		process.stderr.write(
			`${reason}: child did not exit within ${TERMINATION_GRACE_MS}ms of SIGTERM; SIGKILLed and reaped\n`,
		);
		return reaped;
	}
	process.stderr.write(`${reason}: child terminated and reaped\n`);
	return exited;
}

/** The overall child timeout, validated against sane bounds. */
export function resolvedTimeoutMs() {
	const raw = process.env[TIMEOUT_ENV];
	if (raw === undefined || raw.trim().length === 0) {
		return DEFAULT_TIMEOUT_MS;
	}
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isInteger(parsed) || parsed < 60_000 || parsed > 2 * 60 * 60 * 1000) {
		return { invalid: `invalid ${TIMEOUT_ENV}=${raw} (use an integer between 60000 and 7200000)` };
	}
	return parsed;
}

/**
 * Derive the EXACT expected test identities for the one spec file through
 * the pinned Playwright runner itself (R5-B, corrective round 2):
 * `playwright test <spec> --list --reporter=json` is the same side-effect
 * free discovery the Lead reviews, executed offline against no app. Its JSON
 * suites/specs tree yields the complete expected title set; a failing,
 * hanging or malformed discovery is a prerequisite HOLD — coverage can never
 * be judged against an unknown expected set.
 */
export async function expectedTestTitles() {
	// Bounded budget (corrective round 3, R4): the discovery child gets the
	// SAME lifecycle discipline as the worker — signal-aware, awaited
	// termination and reaping on timeout/interrupt, with every timer and
	// transient listener cleared on every path.
	const rawBudget = process.env[DISCOVERY_TIMEOUT_ENV];
	let budgetMs = DEFAULT_DISCOVERY_TIMEOUT_MS;
	if (rawBudget !== undefined && rawBudget.trim().length > 0) {
		const parsed = Number.parseInt(rawBudget, 10);
		if (!Number.isInteger(parsed) || parsed < 5_000 || parsed > 10 * 60 * 1000) {
			return {
				error: `invalid ${DISCOVERY_TIMEOUT_ENV}=${rawBudget} (use an integer between 5000 and 600000)`,
			};
		}
		budgetMs = parsed;
	}
	const child = spawn(
		process.execPath,
		[PLAYWRIGHT_CLI, "test", SPEC_FILE, "--list", "--reporter=json"],
		{
			cwd: repoRoot,
			env: { ...process.env },
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
	let stdout = "";
	let stderr = "";
	const onData = (chunk) => {
		stdout += chunk;
	};
	const onErrorData = (chunk) => {
		stderr += chunk;
	};
	const onExit = (code, signal) => resolveOutcome({ code, signal });
	const onError = (error) => resolveOutcome({ spawnError: error.code ?? error.message });
	const onSignalInt = () => resolveOutcome({ interrupted: "SIGINT" });
	const onSignalTerm = () => resolveOutcome({ interrupted: "SIGTERM" });
	let resolveOutcome;
	const outcomePromise = new Promise((resolve) => {
		resolveOutcome = resolve;
	});
	child.stdout.on("data", onData);
	child.stderr.on("data", onErrorData);
	child.once("exit", onExit);
	child.once("error", onError);
	process.once("SIGINT", onSignalInt);
	process.once("SIGTERM", onSignalTerm);
	const discoveryTimer = setTimeout(() => resolveOutcome({ timedOut: true }), budgetMs);
	discoveryTimer.unref?.();
	const outcome = await outcomePromise;
	clearTimeout(discoveryTimer);
	child.removeListener("exit", onExit);
	child.removeListener("error", onError);
	process.removeListener("SIGINT", onSignalInt);
	process.removeListener("SIGTERM", onSignalTerm);
	if (outcome.timedOut === true) {
		await terminateChild(child, "discovery timeout");
		return {
			error: `the discovery pre-pass did not finish within its ${budgetMs}ms budget (child terminated and reaped)`,
		};
	}
	if (outcome.interrupted !== undefined) {
		await terminateChild(child, `discovery interrupted by ${outcome.interrupted}`);
		return {
			interrupted: true,
			error: `the discovery pre-pass was interrupted by ${outcome.interrupted} (child terminated and reaped)`,
		};
	}
	if (outcome.spawnError !== undefined) {
		return { error: `the discovery pre-pass could not run (${outcome.spawnError})` };
	}
	if (outcome.code !== 0) {
		return {
			error: `the discovery pre-pass failed with exit code ${String(outcome.code)}${stderr.trim().length > 0 ? `: ${stderr.trim().split("\n").pop()}` : ""}`,
		};
	}
	let parsed;
	try {
		parsed = JSON.parse(stdout);
	} catch {
		return { error: "the discovery pre-pass produced no parsable report" };
	}
	const titles = [];
	const walk = (suites) => {
		for (const suite of suites ?? []) {
			for (const spec of suite.specs ?? []) {
				if (typeof spec?.title === "string" && spec.title.length > 0) {
					titles.push(spec.title);
				}
			}
			walk(suite.suites);
		}
	};
	walk(parsed.suites);
	if (titles.length === 0) {
		return {
			error:
				"the discovery pre-pass reported zero expected tests — refusing to accept an empty expected set",
		};
	}
	return { titles };
}

/**
 * Compare the worker's recorded statuses against the COMPLETE expected set
 * (R5-B): every expected title must appear EXACTLY ONCE with a terminal
 * "passed" status. Empty, partial, duplicated, unexpected, malformed or
 * missing journals are explicit failures; repeating one passing row can
 * never satisfy a multi-test expected set.
 */
function coverageFailures(statuses, expectedTitles) {
	const failures = [];
	if (statuses.length === 0) {
		failures.push("the coverage journal is empty — no test result was recorded");
	}
	if (expectedTitles.length > 0 && statuses.length > 0 && statuses.length < expectedTitles.length) {
		failures.push(
			`the coverage journal holds ${statuses.length} of ${expectedTitles.length} expected test results`,
		);
	}
	const seen = new Map();
	for (const entry of statuses) {
		const title = String(entry.title ?? "");
		const status = String(entry.status ?? "unknown");
		if (status !== "passed") {
			failures.push(
				`test ${JSON.stringify(title)} recorded status ${JSON.stringify(status)}, not a terminal "passed"`,
			);
		}
		const count = (seen.get(title) ?? 0) + 1;
		seen.set(title, count);
		if (count > 1) {
			failures.push(
				`test ${JSON.stringify(title)} recorded ${count} result rows — duplicated/retried results cannot satisfy coverage`,
			);
		}
	}
	for (const title of expectedTitles) {
		if (!seen.has(title)) {
			failures.push(`expected test ${JSON.stringify(title)} has no recorded result`);
		}
	}
	for (const title of seen.keys()) {
		if (!expectedTitles.includes(title)) {
			failures.push(
				`unexpected recorded test ${JSON.stringify(title)} is not part of the expected suite`,
			);
		}
	}
	return failures;
}

/** Parse the worker's test-status journal (one JSON per line). */
async function readRunStatuses(statusPath) {
	const statuses = [];
	try {
		const contents = await readFile(statusPath, "utf8");
		for (const line of contents.split("\n")) {
			const trimmed = line.trim();
			if (trimmed.length === 0) {
				continue;
			}
			try {
				statuses.push(JSON.parse(trimmed));
			} catch {
				// A malformed line is itself incomplete evidence.
				statuses.push({ title: "<unreadable>", status: "unknown" });
			}
		}
	} catch {
		// No journal at all is incomplete coverage evidence.
		statuses.push({ title: "<missing>", status: "missing" });
	}
	return statuses;
}

async function main() {
	const reasons = [];

	// Toolchain honesty: HOLD when the running Node's major differs from the one package.json
	// engines pins.
	const packageJson = await readFile(path.join(repoRoot, "package.json"), "utf8")
		.then(JSON.parse)
		.catch(() => undefined);
	const pinned = packageJson?.engines?.node;
	const majorOf = (version) => Number.parseInt(String(version).split(".")[0], 10);
	if (pinned === undefined) {
		reasons.push("package.json names no engines.node pin to check the running Node against");
	} else if (majorOf(process.versions.node) !== majorOf(pinned)) {
		reasons.push(
			`running under Node ${process.versions.node}, outside the pinned ${majorOf(pinned)}.x line (package.json engines ${pinned}) — refusing to produce runtime evidence on an unpinned toolchain`,
		);
	}

	// Pinned runner presence (isolated static prerequisite).
	const cliStats = await stat(path.join(repoRoot, PLAYWRIGHT_CLI)).catch(() => undefined);
	if (cliStats === undefined) {
		reasons.push(
			`the repo-local pinned Playwright runner ${PLAYWRIGHT_CLI} is not installed (run the repo install step in this checkout first)`,
		);
	}

	const timeout = resolvedTimeoutMs();
	if (timeout.invalid !== undefined) {
		await hold([timeout.invalid]);
		return;
	}

	// R2 (corrective round 2) — exact source identity, both directions, is an
	// EARLY GATE: a failed, missing or mismatched identity HOLDs here, BEFORE
	// any credential is read and before any authenticated request. Only
	// unauthenticated observations (the public origin marker) and the offline
	// discovery pre-pass may precede credentials.
	const expected = await expectedSourceIdentity();
	if (expected.error !== undefined) {
		reasons.push(expected.error);
	}
	const observed = await observedRuntimeSourceIdentity();
	if (observed.error !== undefined) {
		reasons.push(observed.error);
	} else if (expected.sha !== undefined) {
		if (observed.sha !== expected.sha) {
			reasons.push(
				`source identity mismatch: the runtime source is ${observed.sha} (${observed.provenance}) but the candidate under test is ${expected.sha} (${expected.provenance}) — promote the candidate with the runtime's dev-runtime-update.sh first; a committed candidate does not implicitly update the persistent application`,
			);
		} else {
			process.stderr.write(
				`coordinator: exact source identity verified — runtime source ${observed.sha} equals the candidate under test (${expected.provenance})\n`,
			);
		}
	}
	if (reasons.length > 0) {
		await hold(reasons);
		return;
	}

	// Unauthenticated application-identity observation.
	const originReason = await originIdentityHolds();
	if (originReason !== undefined) {
		await hold([originReason]);
		return;
	}

	// R5-B — the COMPLETE expected test set, derived offline through the
	// pinned runner's own discovery BEFORE any worker runs.
	const expectedSet = await expectedTestTitles();
	if (expectedSet.interrupted === true) {
		process.stderr.write(`INTERRUPTED: ${expectedSet.error}\n`);
		process.exitCode = INTERRUPTED_EXIT;
		return;
	}
	if (expectedSet.error !== undefined) {
		await hold([expectedSet.error]);
		return;
	}
	process.stderr.write(
		`coordinator: discovery pre-pass established ${expectedSet.titles.length} expected T021 test identities\n`,
	);

	// Credential prerequisites and the AUTHENTICATED fixture probe — only
	// after the identity gate above.
	const devAccessReason = await credentialInputHolds(
		DEV_ACCESS_CREDENTIAL_ENV,
		"development credential",
	);
	if (devAccessReason !== undefined) {
		await hold([devAccessReason]);
		return;
	}

	const routeAccess = await readRouteAccessToken();
	if (routeAccess.error !== undefined) {
		await hold([routeAccess.error]);
		return;
	}

	const fixtureReason = await fixtureReadinessHolds(routeAccess.token, expected.sha);
	if (fixtureReason !== undefined) {
		await hold([fixtureReason]);
		return;
	}

	// Per-run owned-fixture manifest + test-status journal under the ignored
	// scratch path (R3/R5).
	await mkdir(path.join(repoRoot, SCRATCH_DIR), { recursive: true });
	const manifestPath = path.join(
		repoRoot,
		SCRATCH_DIR,
		`t021-ownership-${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${process.pid}.jsonl`,
	);
	const statusPath = path.join(
		repoRoot,
		SCRATCH_DIR,
		`t021-run-status-${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${process.pid}.jsonl`,
	);

	// SCOPE REDUCTION — prior-run evidence HOLDs before any spawn: no worker
	// (fixture-writing or otherwise) is launched to recover historical
	// journals, and nothing is deleted or consumed. Empty/unreadable
	// leftovers are equally evidence of an unfinished earlier run.
	const priorEvidence = await priorRunEvidencePaths(manifestPath);
	const priorReasons = [];
	for (const item of priorEvidence.found) {
		priorReasons.push(
			`prior-run ownership evidence at ${path.relative(repoRoot, item.path)}${item.empty ? " (empty file — not proof of absence)" : ""} is retained untouched: journal replay, adoption and automatic deletion are retired; separately authorized operator disposition is required`,
		);
	}
	for (const item of priorEvidence.unreadable) {
		priorReasons.push(
			`unreadable prior-run ownership evidence at ${item} — retained untouched; operator disposition required`,
		);
	}
	if (priorReasons.length > 0) {
		await hold(priorReasons);
		return;
	}

	const childEnv = {
		...process.env,
		PLAYWRIGHT_BASE_URL: PERSISTENT_DEVELOPMENT_ORIGIN,
		[OPT_IN_ENV]: "1",
		[OWNERSHIP_MANIFEST_ENV]: manifestPath,
		[RUN_STATUS_ENV]: statusPath,
	};

	process.stderr.write(
		`coordinator: running ${SPEC_FILE} through the pinned Playwright runner against ${PERSISTENT_DEVELOPMENT_ORIGIN} (timeout ${timeout}ms; owned-fixture manifest ${path.relative(repoRoot, manifestPath)})\n`,
	);

	const child = spawn(process.execPath, [PLAYWRIGHT_CLI, "test", SPEC_FILE, "--project=chromium"], {
		cwd: repoRoot,
		env: childEnv,
		stdio: "inherit",
	});

	// R4 — every wait is bounded and every timer/listener is cleared on
	// EVERY completion path; a spawn failure is an outcome, not a crash.
	const onSignalInt = () => resolveOutcome({ interrupted: "SIGINT" });
	const onSignalTerm = () => resolveOutcome({ interrupted: "SIGTERM" });
	let resolveOutcome;
	const outcomePromise = new Promise((resolve) => {
		resolveOutcome = resolve;
	});
	const onChildError = (error) => resolveOutcome({ spawnError: error.code ?? error.message });
	const onChildExit = (code, signal) => resolveOutcome({ code, signal });
	child.once("error", onChildError);
	child.once("exit", onChildExit);
	process.once("SIGINT", onSignalInt);
	process.once("SIGTERM", onSignalTerm);
	const timeoutHandle = setTimeout(() => resolveOutcome({ timedOut: true }), timeout);
	// The timeout must never be the thing keeping a completed run alive.
	timeoutHandle.unref?.();

	const outcome = await outcomePromise;
	clearTimeout(timeoutHandle);
	process.removeListener("SIGINT", onSignalInt);
	process.removeListener("SIGTERM", onSignalTerm);
	child.removeListener("error", onChildError);
	child.removeListener("exit", onChildExit);

	let primaryFailure;
	let childCode = 0;
	if (outcome.spawnError !== undefined) {
		primaryFailure = `the pinned Playwright child could not be spawned (${outcome.spawnError})`;
		childCode = 1;
	} else if (outcome.timedOut === true) {
		primaryFailure = `the T021 run exceeded its ${timeout}ms budget`;
		const reaped = await terminateChild(child, "timeout");
		childCode = reaped.code ?? INTERRUPTED_EXIT;
	} else if (outcome.interrupted !== undefined) {
		primaryFailure = `interrupted by ${outcome.interrupted}`;
		const reaped = await terminateChild(child, outcome.interrupted);
		childCode = reaped.code ?? INTERRUPTED_EXIT;
	} else {
		childCode = outcome.code ?? INTERRUPTED_EXIT;
		if (outcome.signal !== null && outcome.signal !== undefined) {
			primaryFailure = `the Playwright child terminated on ${outcome.signal}`;
		} else if (childCode !== 0) {
			primaryFailure = `the T021 Playwright run failed with exit code ${childCode}`;
		}
	}

	// R5-B — coverage is judged against the COMPLETE expected set: every
	// expected identity exactly once, terminal "passed". Empty, partial,
	// duplicated, unexpected or malformed journals are explicit failures; a
	// zero worker exit cannot make them success.
	const statuses = await readRunStatuses(statusPath);
	const coverageProblems = coverageFailures(statuses, expectedSet.titles);
	let coverageFailure;
	if (coverageProblems.length > 0) {
		coverageFailure = `incomplete T021 coverage despite a passing worker exit (${coverageProblems.length} problem(s)): ${coverageProblems.join("; ")}`;
	}

	// Owned-fixture residue: the worker removes the manifest only when its
	// verified current-run cleanup resolved everything; a manifest that
	// still exists means unresolved owned fixtures — preserved and reported,
	// never silently discarded, and never automatically replayed: a rerun
	// will HOLD on it as prior-run evidence until an operator disposes of it.
	let residueFailure;
	const manifestStats = await stat(manifestPath).catch(() => undefined);
	if (manifestStats !== undefined && manifestStats.size > 0) {
		residueFailure = `owned-fixture residue may remain: this run's ownership manifest ${path.relative(repoRoot, manifestPath)} still exists — historical replay is retired, so the next coordinator attempt will HOLD on it; separately authorized operator disposition is required before claiming a residue-free run`;
	} else if (manifestStats !== undefined) {
		residueFailure = `the ownership manifest ${path.relative(repoRoot, manifestPath)} is empty but was not removed — treating as incomplete cleanup`;
	}
	if (primaryFailure !== undefined) {
		process.stderr.write(`PRIMARY FAILURE: ${primaryFailure}\n`);
	}
	if (coverageFailure !== undefined) {
		process.stderr.write(`COVERAGE FAILURE: ${coverageFailure}\n`);
	}
	if (residueFailure !== undefined) {
		process.stderr.write(`CLEANUP FAILURE: ${residueFailure}\n`);
	}

	if (outcome.timedOut === true || outcome.interrupted !== undefined) {
		process.exitCode = INTERRUPTED_EXIT;
		return;
	}
	if (primaryFailure !== undefined) {
		process.exitCode = childCode === 0 ? 1 : childCode;
		return;
	}
	if (coverageFailure !== undefined || residueFailure !== undefined) {
		process.exitCode = 2;
		return;
	}
	process.stderr.write("coordinator: T021 run passed with no owned-fixture residue\n");
	process.exitCode = 0;
}

// Run only when executed directly (the offline controls import the helpers).
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}

#!/usr/bin/env node
// T021 — the Feature 002 public-read SINGLE-RUNTIME TEST COORDINATOR.
//
// One existing persistent development application at http://127.0.0.1:4322
// (containers songhealth-dev-app + songhealth-dev-postgres, dedicated
// volumes, stable source, Runtime Controller) is the SOLE runtime test
// target. This coordinator NEVER starts, stops, restarts or substitutes a
// server: no Astro programmatic dev(), no `npm run dev`, no Playwright
// `webServer`, no second server/port/DB/media stack, no port fallback. An
// occupied shared origin is the intended state. It only:
//
//   1. verifies the origin answers as the expected Songhealth source (the
//      public songhealth-foundation SSR marker) — an unexpected origin or
//      source identity is a non-success HOLD, before anything is spawned;
//   2. verifies the dev-only fixture route is installed there with the
//      expected identity (access-token-gated probe) — a missing or
//      unexpected fixture is a non-success HOLD (the reviewed source/config
//      transition that installs it is a separate authorization), never a
//      reason to start a substitute server;
//   3. verifies the coordinated prerequisites (pinned local Playwright
//      runner installed; the mode-0600 development credential input and the
//      mode-0600 route-access token input present — existence/mode only for
//      the PAT; the token file is read to probe the route and nothing else);
//   4. runs the ONE T021 spec file through the repo-pinned Playwright
//      runner with PLAYWRIGHT_BASE_URL pinned to the persistent origin and
//      the explicit opt-in that keeps ordinary `npm run test:browser` from
//      ever executing this runtime suite or reading its credentials
//      (discovery stays side-effect free);
//   5. owns exactly its Playwright child and a per-run ownership manifest:
//      on failure, timeout, SIGINT or SIGTERM it terminates, awaits and
//      reaps ONLY that child (SIGTERM, bounded grace, SIGKILL), preserves
//      the manifest whenever owned synthetic fixtures may remain (worker
//      interruption never silently discards ownership records), and reports
//      primary AND cleanup/residue failures together. The shared app, DB,
//      media volumes, credentials, stable source and controller are never
//      test-owned resources; runtime fixture creation/cleanup itself is the
//      separately authorized T022 serial join's to execute.
//
// Exit codes (truthful outcomes, never false success):
//   0  child passed and no owned-fixture residue remained
//   1  child Playwright run failed (its exit code propagated)
//   2  child passed but owned-fixture residue may remain (manifest kept)
//   3  HOLD — a prerequisite failed; nothing was spawned or started
//   4  interrupted (SIGINT/SIGTERM) or timed out; child terminated/reaped
//
// Authority:
// - specs/002-cms-content-model/tasks.md T021 and the "T021 execution and
//   single-runtime isolation" block ("The coordinator
//   node tests/browser/run-cms-public-reads.mjs must not call Astro
//   programmatic dev(), npm run dev, create a webServer, stop/restart any
//   shared container, or switch ports; it orchestrates the existing pinned
//   Playwright command with PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322 and
//   owned synthetic fixtures"; "On failures, timeouts, SIGINT or SIGTERM,
//   perform awaited cleanup/reconciliation with the existing server still
//   available; report cleanup failures alongside original failures")
// - AGENTS.md "Single Persistent Development Runtime" (one server/DB/media
//   store/test target; never free the port or substitute; a dev-only
//   integration not yet installed is NOT READY → HOLD; task cleanup covers
//   task-owned temporary resources only)
// - tests/browser/foundation.spec.ts — the public songhealth-foundation SSR
//   marker contract used for the source-identity check
// - tests/browser/fixtures/cms-public-reads.integration.mjs — the fixture
//   route contract (route pattern, access header, identity, env names)
//
// Verified API surface (recorded per AGENTS.md §External Documentation):
// Node 24 global fetch with redirect:"error" (redirects refused, matching
// the accepted helper discipline); node:child_process spawn/exit events for
// awaited child termination and reaping; the repo-local pinned
// @playwright/test 1.63.0 CLI (node_modules/@playwright/test/cli.js) as the
// runner — `npm run test:browser` is deliberately NOT used so the ordinary
// suite never drags this runtime file along.

import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

/** The ONE existing persistent development origin (AGENTS.md; tasks.md). */
export const PERSISTENT_DEVELOPMENT_ORIGIN = "http://127.0.0.1:4322";

/** The single spec file this coordinator may run. */
const SPEC_FILE = "tests/browser/cms-public-reads.spec.ts";

/** The repo-local pinned Playwright CLI (NOT `npm run test:browser`). */
const PLAYWRIGHT_CLI = "node_modules/@playwright/test/cli.js";

/** The public SSR marker proving the origin is the Songhealth source. */
const SSR_MARKER_PATTERN =
	/<meta\s+name="songhealth-foundation"\s+content="public-runtime"\s*\/?>/;

/** Explicit coordinator opt-in consumed by the spec file. */
const OPT_IN_ENV = "SONGHEALTH_T021_COORDINATOR";

/** Mode-0600 { token } JSON holding the client route-access token. */
const ROUTE_ACCESS_CREDENTIAL_ENV = "SONGHEALTH_T021_ROUTE_ACCESS";

/** Server-only token env the fixture route fails closed without. */
const ROUTE_TOKEN_ENV = "SONGHEALTH_T021_ROUTE_TOKEN";

/** Mode-0600 controller-format development PAT input (existence only). */
const DEV_ACCESS_CREDENTIAL_ENV = "SONGHEALTH_DEV_ACCESS";

/** Per-run owned-fixture manifest passed to the worker. */
const OWNERSHIP_MANIFEST_ENV = "SONGHEALTH_T021_OWNERSHIP_MANIFEST";

/** Overall child timeout (ms); overridable, bounded 60s..2h. */
const TIMEOUT_ENV = "SONGHEALTH_T021_TIMEOUT_MS";
const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const TERMINATION_GRACE_MS = 10_000;

/** Bounded run scratch under the already-gitignored .tmp/ path. */
const SCRATCH_DIR = ".tmp/feature002";

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

/** A minimal JSON response read with redirects refused. */
async function fetchJson(url, headers = {}) {
	const response = await fetch(url, { headers, redirect: "error" });
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
		if (parsed === null || typeof parsed !== "object" || typeof parsed.token !== "string" || parsed.token.trim().length === 0) {
			return { error: `route access input ${value} carries no non-empty string token field` };
		}
		return { token: parsed.token };
	} catch (error) {
		return { error: `route access input ${value} could not be read (${error.code ?? error.message})` };
	}
}

/**
 * Prerequisite 1 — origin identity: the persistent origin must answer as
 * the expected Songhealth source. No server is ever started here; a
 * connection failure is a HOLD, not something to boot around.
 */
async function originIdentityHolds() {
	try {
		const response = await fetch(new URL("/", PERSISTENT_DEVELOPMENT_ORIGIN), {
			redirect: "error",
		});
		if (response.status !== 200) {
			return `unexpected origin response: GET / answered ${response.status} (expected 200 from the persistent development application)`;
		}
		const body = await response.text();
		if (!SSR_MARKER_PATTERN.test(body)) {
			return "unexpected source identity: the origin does not serve the songhealth-foundation public SSR marker — refusing to treat it as the persistent Songhealth application";
		}
		return undefined;
	} catch (error) {
		return `the persistent development origin ${PERSISTENT_DEVELOPMENT_ORIGIN} did not answer (${error.cause?.code ?? error.cause?.message ?? error.message}); an unavailable shared app is a HOLD prerequisite — never authorization to start, restart or substitute a server`;
	}
}

/**
 * Prerequisite 2 — fixture readiness: the dev-only public-read fixture must
 * be installed on THAT server with the expected identity. 404 (integration
 * not installed), 503 (route access capability unprovisioned) and identity
 * mismatch are each distinct HOLD reasons naming the missing prerequisite.
 */
async function fixtureReadinessHolds(routeAccessToken) {
	const url = new URL("/__feature002/public-reads?case=probe", PERSISTENT_DEVELOPMENT_ORIGIN);
	let probe;
	try {
		probe = await fetchJson(url, { "x-songhealth-t021-route-access": routeAccessToken });
	} catch (error) {
		return `the fixture route probe failed to reach the persistent origin (${error.cause?.code ?? error.message})`;
	}
	if (probe.status === 404) {
		return "the dev-only fixture route /__feature002/public-reads is not installed on the persistent server (the reviewed source/config transition is a separate authorization) — HOLD, not a substitute server";
	}
	if (probe.status === 503) {
		return "the fixture route is installed but its server-only access capability is unprovisioned (503) — the route access token pair is provisioned by the separately authorized maintenance — HOLD";
	}
	if (probe.status === 403) {
		return "the fixture route refused the coordinated route access token (403) — the client/server token pair does not match; re-provision through the authorized maintenance";
	}
	if (probe.status !== 200) {
		return `unexpected fixture probe status ${probe.status}`;
	}
	const body = probe.body ?? {};
	if (body.fixtureId !== "songhealth:t021:cms-public-reads" || body.fixtureVersion !== 1) {
		return `unexpected fixture identity at /__feature002/public-reads (fixtureId=${String(body.fixtureId)}, fixtureVersion=${String(body.fixtureVersion)}) — refusing to run against an unknown fixture`;
	}
	if (!(probe.headers.get("cache-control") ?? "").includes("no-store")) {
		return "the fixture route does not serve no-store responses as the approved contract requires";
	}
	return undefined;
}

/** Report leftover manifests from previously interrupted runs (recovery input). */
async function reportLeftoverManifests(currentManifest) {
	try {
		const entries = await readdir(path.join(repoRoot, SCRATCH_DIR), { withFileTypes: true });
		const leftovers = entries
			.filter((entry) => entry.isFile() && entry.name.startsWith("t021-ownership-") && entry.name !== path.basename(currentManifest))
			.map((entry) => path.join(SCRATCH_DIR, entry.name));
		if (leftovers.length > 0) {
			process.stderr.write(
				`NOTE: ${leftovers.length} ownership manifest(s) from earlier interrupted run(s) remain (${leftovers.join(", ")}); recoverable owned fixtures may exist — they are never auto-deleted or auto-claimed by this run\n`,
			);
		}
	} catch {
		// Scratch absent — nothing to report.
	}
}

/** Terminated-and-reaped child outcome. */
export async function terminateChild(child, reason) {
	if (child.exitCode !== null || child.signalCode !== null) {
		return { code: child.exitCode, signal: child.signalCode };
	}
	if (!child.kill("SIGTERM")) {
		child.kill("SIGKILL");
	}
	const exited = await Promise.race([
		new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal }))),
		new Promise((resolve) => setTimeout(() => resolve(undefined), TERMINATION_GRACE_MS)),
	]);
	if (exited === undefined) {
		child.kill("SIGKILL");
		const reaped = await new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
		process.stderr.write(`${reason}: child did not exit within ${TERMINATION_GRACE_MS}ms of SIGTERM; SIGKILLed and reaped\n`);
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

async function main() {
	const reasons = [];

	// Toolchain honesty: record the running Node, and HOLD on a major
	// mismatch with the pinned 24.x line (engines: 24.21.0).
	const major = Number.parseInt(process.versions.node.split(".")[0], 10);
	if (major !== 24) {
		reasons.push(
			`running under Node ${process.versions.node}, outside the pinned 24.x line (package.json engines 24.21.0) — refusing to produce runtime evidence on an unpinned toolchain`,
		);
	}

	// Pinned runner presence (isolated static prerequisite).
	const cliStats = await stat(path.join(repoRoot, PLAYWRIGHT_CLI)).catch(() => undefined);
	if (cliStats === undefined) {
		reasons.push(`the repo-local pinned Playwright runner ${PLAYWRIGHT_CLI} is not installed (run the repo install step in this checkout first)`);
	}

	const timeout = resolvedTimeoutMs();
	if (timeout.invalid !== undefined) {
		await hold([timeout.invalid]);
		return;
	}

	const originReason = await originIdentityHolds();
	if (originReason !== undefined) {
		reasons.push(originReason);
	}

	const devAccessReason = await credentialInputHolds(DEV_ACCESS_CREDENTIAL_ENV, "development credential");
	if (devAccessReason !== undefined) {
		reasons.push(devAccessReason);
	}

	const routeAccess = await readRouteAccessToken();
	if (routeAccess.error !== undefined) {
		reasons.push(routeAccess.error);
	}

	let fixtureReason;
	if (routeAccess.token !== undefined && originReason === undefined) {
		fixtureReason = await fixtureReadinessHolds(routeAccess.token);
		if (fixtureReason !== undefined) {
			reasons.push(fixtureReason);
		}
	}

	if (reasons.length > 0) {
		await hold(reasons);
		return;
	}

	// Per-run owned-fixture manifest under the ignored scratch path.
	await mkdir(path.join(repoRoot, SCRATCH_DIR), { recursive: true });
	const manifestPath = path.join(
		repoRoot,
		SCRATCH_DIR,
		`t021-ownership-${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${process.pid}.jsonl`,
	);
	await reportLeftoverManifests(manifestPath);

	const childEnv = {
		...process.env,
		PLAYWRIGHT_BASE_URL: PERSISTENT_DEVELOPMENT_ORIGIN,
		[OPT_IN_ENV]: "1",
		[OWNERSHIP_MANIFEST_ENV]: manifestPath,
	};

	process.stderr.write(
		`coordinator: running ${SPEC_FILE} through the pinned Playwright runner against ${PERSISTENT_DEVELOPMENT_ORIGIN} (timeout ${timeout}ms; owned-fixture manifest ${path.relative(repoRoot, manifestPath)})\n`,
	);

	const child = spawn(process.execPath, [PLAYWRIGHT_CLI, "test", SPEC_FILE, "--project=chromium"], {
		cwd: repoRoot,
		env: childEnv,
		stdio: "inherit",
	});

	const signalPromise = new Promise((resolve) => {
		process.once("SIGINT", () => resolve({ interrupted: "SIGINT" }));
		process.once("SIGTERM", () => resolve({ interrupted: "SIGTERM" }));
	});
	const exitPromise = new Promise((resolve) => {
		child.once("exit", (code, signal) => resolve({ code, signal }));
	});
	const timeoutPromise = new Promise((resolve) => {
		setTimeout(() => resolve({ timedOut: true }), timeout);
	});

	const outcome = await Promise.race([exitPromise, timeoutPromise, signalPromise]);

	let primaryFailure;
	let childCode = 0;
	if (outcome.timedOut === true) {
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

	// Owned-fixture residue: the worker deletes the manifest when its
	// verified cleanup resolved everything, so a manifest that still exists
	// means recoverable owned fixtures — preserved and reported, never
	// silently discarded and never auto-cleaned by the coordinator.
	let residueFailure;
	const manifestStats = await stat(manifestPath).catch(() => undefined);
	if (manifestStats !== undefined && manifestStats.size > 0) {
		residueFailure = `owned-fixture residue may remain: the worker's ownership manifest ${path.relative(repoRoot, manifestPath)} still exists — run the coordinator again (its worker reconciles and retries owned cleanup) or perform the documented recovery before claiming a residue-free run`;
	} else if (manifestStats !== undefined) {
		residueFailure = `the ownership manifest ${path.relative(repoRoot, manifestPath)} is empty but was not removed — treating as incomplete cleanup`;
	}

	if (primaryFailure !== undefined) {
		process.stderr.write(`PRIMARY FAILURE: ${primaryFailure}\n`);
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
	if (residueFailure !== undefined) {
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

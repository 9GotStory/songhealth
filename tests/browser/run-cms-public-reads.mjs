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
//   1. verifies the EXACT source identity both ways (Lead corrective round
//      1, R2): the full 40-hex candidate identity this checkout is being
//      tested at, and the stable runtime source SHA observed through the
//      documented read-only Runtime Controller `status` operation — plus the
//      app's own marker and the fixture's identity probe. Missing,
//      malformed, stale or mismatched identities are a non-success HOLD
//      BEFORE credentials, fixture mutations or any worker spawn;
//   2. verifies the coordinated prerequisites (pinned local Playwright
//      runner installed; the mode-0600 development credential input and the
//      mode-0600 route-access token input present — existence/mode only for
//      the PAT; the token file is read to probe the route and nothing else);
//   3. PRIOR-RUN EVIDENCE HOLDs (scope reduction): historical ownership
//      journals are never replayed, adopted, consumed or deleted — any
//      leftover manifest (valid-looking, settled, malformed, unreadable or
//      EMPTY) is retained untouched and produces a named prerequisite HOLD
//      before any worker spawns; disposition is a separately authorized
//      operator action. The worker itself equally refuses recovery inputs;
//   4. runs the ONE T021 spec file through the repo-pinned Playwright
//      runner with PLAYWRIGHT_BASE_URL pinned to the persistent origin and
//      the explicit opt-in that keeps ordinary `npm run test:browser` from
//      ever executing this runtime suite or reading its credentials
//      (discovery stays side-effect free);
//   5. owns exactly its Playwright child and the run's ownership manifest:
//      on failure, timeout, SIGINT or SIGTERM it terminates, awaits and
//      reaps ONLY that child (SIGTERM, bounded grace, SIGKILL), preserves
//      the manifest whenever owned synthetic fixtures may remain (worker
//      interruption never silently discards ownership records), and reports
//      primary AND cleanup/residue failures together. Every timer and
//      transient listener is cleared on every completion path (R4), all
//      prerequisite requests carry an abort deadline, and a child spawn
//      failure is handled with the same truthful cleanup. The shared app,
//      DB, media volumes, credentials, stable source and controller are
//      never test-owned resources; runtime fixture creation/cleanup itself
//      is the separately authorized T022 serial join's to execute.
//
// Exit codes (truthful outcomes, never false success):
//   0  child passed, every recorded test status passed, no residue remained
//   1  child Playwright run failed (its exit code propagated)
//   2  child exited zero but coverage/residue is incomplete (skipped or
//      non-passed recorded statuses, or unresolved owned fixtures)
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
//   task-owned temporary resources only) and the Multica runtime brief's
//   never-terminate-by-name rule (only this coordinator's own child PID)
// - specs/002-cms-content-model/quickstart.md "Prerequisites and
//   Environment" — `runtime.sh status`/`verify` are the only authorized
//   ROUTINE controller operations; this coordinator uses `status` (read
//   only) as the approved observation of the stable runtime source SHA
// - tests/browser/foundation.spec.ts — the public songhealth-foundation SSR
//   marker contract (application identity, NOT by itself source identity)
// - tests/browser/fixtures/cms-public-reads.integration.mjs — the fixture
//   route contract (route pattern, access header, identity, env names)
//
// Verified API surface (recorded per AGENTS.md §External Documentation):
// Node 24 global fetch with redirect:"error" and AbortSignal.timeout for
// bounded requests; node:child_process spawn with explicit 'error'/'exit'
// event handling and awaited termination/reaping; node:child_process.execFile
// for the bounded read-only `git rev-parse HEAD` (expected candidate
// identity) and `runtime.sh status` (observed stable source identity, a JSON
// object with a "source" field — verified against the pinned runtime); the
// repo-local pinned @playwright/test 1.63.0 CLI
// (node_modules/@playwright/test/cli.js) as the runner — `npm run
// test:browser` is deliberately NOT used so the ordinary suite never drags
// this runtime file along.

import { spawn, execFile } from "node:child_process";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

/** The ONE existing persistent development origin (AGENTS.md; tasks.md). */
export const PERSISTENT_DEVELOPMENT_ORIGIN = "http://127.0.0.1:4322";

/** The single spec file this coordinator may run. */
const SPEC_FILE = "tests/browser/cms-public-reads.spec.ts";

/** The repo-local pinned Playwright CLI (NOT `npm run test:browser`). */
const PLAYWRIGHT_CLI = "node_modules/@playwright/test/cli.js";

/** The public SSR marker proving the origin is the Songhealth application. */
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

/** Per-run test-status journal the worker appends to (R5). */
const RUN_STATUS_ENV = "SONGHEALTH_T021_RUN_STATUS";

/** Optional explicit expected candidate identity (40-hex), else git HEAD. */
const EXPECTED_SOURCE_ENV = "SONGHEALTH_T021_EXPECTED_SOURCE_SHA";

/**
 * T022 disposable mode (PO authorizations 01a15c0f-067c-756c-85a1-0331f764b5de
 * / GitHub issuecomment-6305625001 — the ONLY authorization under which a
 * task-owned disposable app is permitted). Explicit opt-in variables:
 * SONGHEALTH_T021_DISPOSABLE_ORIGIN (the disposable loopback origin; must
 * NOT be the persistent shared origin) and SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA
 * (the committed execution SHA of this checkout — never an unverified
 * expected-SHA override: the checkout's ACTUAL clean git HEAD must equal
 * it). The controller observation is replaced ONLY in this mode by that
 * verified checkout provenance plus the protected route identity probe; no
 * fallback from disposable to the persistent controller exists.
 */
const DISPOSABLE_ORIGIN_ENV = "SONGHEALTH_T021_DISPOSABLE_ORIGIN";
const DISPOSABLE_SOURCE_ENV = "SONGHEALTH_T021_DISPOSABLE_SOURCE_SHA";

export function disposableMode() {
	// Offline-recovery hardening (PO gate 6404739593, item 3(i)): ANY
	// explicitly present input — even blank/whitespace — marks this as a
	// disposable request that must clear the fail-closed completeness gate.
	// A present-but-blank input can no longer silently select the persistent
	// controller path (the both-blank admission gap recorded by ChatGPT
	// assessment 6404697598 and Codex review finding 2).
	return (
		process.env[DISPOSABLE_ORIGIN_ENV] !== undefined ||
		process.env[DISPOSABLE_SOURCE_ENV] !== undefined
	);
}

/**
 * T022 corrective C5 — disposable inputs are all-or-nothing. Presence of
 * EITHER input without its complete counterpart must fail closed BEFORE the
 * controller observation, credential loading, any HTTP request or any child
 * start: a partial disposable request can never select the legacy persistent
 * path (whose first observation would be the runtime controller).
 */
export function disposableInputCompleteness() {
	// Offline-recovery hardening (PO gate 6404739593, item 3(i), completing
	// the last-round scope 6328849596 #1): presence is `!== undefined`, so
	// explicitly present blank/whitespace values fail closed here — including
	// BOTH present but blank — before the controller observation, credential
	// loading, any HTTP request or any child start.
	const origin = process.env[DISPOSABLE_ORIGIN_ENV];
	const sha = process.env[DISPOSABLE_SOURCE_ENV];
	const originPresent = origin !== undefined;
	const shaPresent = sha !== undefined;
	if (!originPresent && !shaPresent) {
		return { complete: true };
	}
	const blank = [];
	if (originPresent && origin.trim().length === 0) blank.push(DISPOSABLE_ORIGIN_ENV);
	if (shaPresent && sha.trim().length === 0) blank.push(DISPOSABLE_SOURCE_ENV);
	if (blank.length > 0) {
		return {
			complete: false,
			error: `incomplete disposable inputs: ${blank.join(" and ")} ${blank.length === 1 ? "is" : "are"} explicitly present but blank — a blank disposable request is a HOLD before the persistent controller path could ever be selected`,
		};
	}
	if (originPresent !== shaPresent) {
		const present = originPresent ? DISPOSABLE_ORIGIN_ENV : DISPOSABLE_SOURCE_ENV;
		const missing = originPresent ? DISPOSABLE_SOURCE_ENV : DISPOSABLE_ORIGIN_ENV;
		return {
			complete: false,
			error: `incomplete disposable inputs: ${present} is supplied but ${missing} is missing — a partial disposable request is a HOLD before the persistent controller path could ever be selected`,
		};
	}
	return { complete: true };
}

export function disposableOrigin() {
	const raw = (process.env[DISPOSABLE_ORIGIN_ENV] ?? "").trim().replace(/\/+$/, "");
	const portMatch = /^http:\/\/127\.0\.0\.1:([0-9]+)$/.exec(raw);
	const portValid = portMatch !== null && Number(portMatch[1]) <= 65535 &&
		 portMatch[1].length <= 5 && !portMatch[1].startsWith("0");
	if (!portValid || raw === PERSISTENT_DEVELOPMENT_ORIGIN) {
		return { error: `${DISPOSABLE_ORIGIN_ENV} must be an explicit loopback http origin other than the persistent shared origin ${PERSISTENT_DEVELOPMENT_ORIGIN}` };
	}
	return { origin: raw };
}

/**
 * T022 disposable source identity: the checkout's ACTUAL clean detached HEAD
 * must equal the explicitly declared execution SHA. A caller merely
 * supplying a SHA is not runtime evidence — the observable task-owned
 * provenance (real git state of this checkout) is the observation.
 */
export async function disposableSourceIdentity(options = {}) {
	const trackedOnly = options.trackedOnly === true;
	const declared = (process.env[DISPOSABLE_SOURCE_ENV] ?? "").trim();
	if (!FULL_SHA_PATTERN.test(declared)) {
		return { error: `${DISPOSABLE_SOURCE_ENV} must be the full 40-hex committed execution SHA of this checkout` };
	}
	const head = await boundedExec("git", ["rev-parse", "HEAD"], "git rev-parse HEAD");
	if (head.error !== undefined) {
		return { error: `could not observe the checkout HEAD for disposable source identity: ${head.error}` };
	}
	const sha = (head.stdout ?? "").trim();
	if (sha !== declared) {
		return { error: `disposable source identity mismatch: this checkout's actual HEAD is ${sha} but ${DISPOSABLE_SOURCE_ENV} declares ${declared}` };
	}
	const statusArgs = trackedOnly
		? ["status", "--porcelain=v1", "--untracked-files=no"]
		: ["status", "--porcelain=v1", "--untracked-files=all"];
	const status = await boundedExec("git", statusArgs, "git status");
	if (status.error !== undefined || (status.stdout ?? "").trim().length > 0) {
		return {
			error: trackedOnly
				? `the source under test changed: tracked files differ from the declared execution SHA (${DISPOSABLE_SOURCE_ENV})`
				: `the disposable checkout must be a clean worktree at the declared execution SHA (git status not clean)`,
		};
	}
	return {
		sha,
		provenance: trackedOnly
			? `post-run tracked-source identity intact at the declared ${DISPOSABLE_SOURCE_ENV}`
			: `verified clean checkout HEAD == declared ${DISPOSABLE_SOURCE_ENV} (task-owned disposable execution)`,
	};
}

/**
 * T022 corrective C5 — bind the admitted disposable endpoint to the REAL
 * task-owned serving app PROCESS and its actual source root, using existing
 * local tools only (`ss` for the loopback listener, /proc for the process's
 * command line and working directory, git in that directory for its HEAD).
 * A declared PID or SHA alone — or two copies of the same environment value
 * — is not an independent observation: the listener, its process identity,
 * its cwd (== this checkout) and that checkout's HEAD are each observed
 * here, and every refusal names the exact gap. Refused: no listener on the
 * port, a dead/foreign process, a process whose cwd is not this checkout's
 * root, a non-dev/astro command line, and a HEAD that is not the declared
 * execution SHA. Dependency-injectable for the offline guards; the defaults
 * are the real local observations.
 */
export function parseAstroRootArg(argv) {
	// Offline-recovery hardening (PO gate 6404739593, item 3(ii), completing
	// the last-round scope 6328849596 #2): parse Astro's effective `--root`
	// from the serving process's argument vector. Split (`--root <path>`,
	// `-r <path>`) and equals (`--root=<path>`) forms are recognized;
	// valueless, flag-like, or conflicting occurrences are AMBIGUOUS (refuse
	// to guess), and an absent flag yields { absent: true } (Astro then
	// serves from the process cwd).
	const args = Array.isArray(argv)
		? argv
		: String(argv ?? "").split(/\s+/).filter((part) => part.length > 0);
	const roots = [];
	for (let i = 0; i < args.length; i += 1) {
		const token = args[i];
		if (token === "--root" || token === "-r") {
			const next = args[i + 1];
			if (next === undefined || (next.startsWith("-") && next.length > 1)) {
				return { error: `${JSON.stringify(token)} is not followed by a path value` };
			}
			roots.push(next);
		} else if (token.startsWith("--root=")) {
			const value = token.slice("--root=".length);
			if (value.length === 0) {
				return { error: '"--root=" carries no path value' };
			}
			if (value.startsWith("-") && value.length > 1) {
				return { error: `"--root=${value}" is not a path value` };
			}
			roots.push(value);
		}
	}
	if (roots.length === 0) {
		return { absent: true };
	}
	if (new Set(roots).size > 1) {
		return { error: `conflicting values ${roots.map((root) => JSON.stringify(root)).join(", ")}` };
	}
	return { root: roots[roots.length - 1] };
}

export async function admittedServingProcess(origin, expectedSha, deps = {}) {
	const runSs = deps.runSs ?? defaultSsListeners;
	const readCmdline = deps.readCmdline ?? defaultProcCmdline;
	const readCwd = deps.readCwd ?? defaultProcCwd;
	const gitHead = deps.gitHead ?? defaultGitHeadIn;
	const resolveRoot = deps.resolveRoot ?? defaultResolveAstroRoot;

	const parsed = /^http:\/\/127\.0\.0\.1:([0-9]+)$/.exec(origin ?? "");
	if (parsed === null) {
		return { error: `serving-process admission needs the admitted loopback origin (got ${JSON.stringify(origin)})` };
	}
	const port = parsed[1];
	const ss = await runSs();
	if (ss.error !== undefined) {
		return { error: `could not observe local listeners for serving-process admission (${ss.error})` };
	}
	const matching = [];
	for (const line of String(ss.stdout ?? "").split("\n")) {
		if (!line.includes(`127.0.0.1:${port} `)) continue;
		const pid = /pid=([0-9]+)/.exec(line)?.[1];
		if (pid !== undefined) matching.push({ pid, line: line.trim() });
	}
	if (matching.length === 0) {
		return { error: `no process is listening on 127.0.0.1:${port} — the disposable app is not serving; an unavailable app is a HOLD, never authorization to start one` };
	}
	if (matching.length > 1) {
		return { error: `multiple listeners claim 127.0.0.1:${port} (${matching.map((m) => `pid ${m.pid}`).join(", ")}) — refusing to guess which process serves the endpoint` };
	}
	const pid = matching[0].pid;
	const cmdline = await readCmdline(pid);
	if (cmdline.error !== undefined) {
		return { error: `the listener pid ${pid} on 127.0.0.1:${port} has no readable command line (${cmdline.error}) — a dead or foreign process never receives test traffic` };
	}
	const command = String(cmdline.value ?? "");
	if (!/astro(\.mjs|\/bin\/astro)?\b/.test(command) || !/\bdev\b/.test(command)) {
		return { error: `the listener pid ${pid} on 127.0.0.1:${port} is not an astro dev process (command line unrecognized) — a foreign process never receives test traffic` };
	}
	// Bind to Astro's EFFECTIVE root, not merely the process cwd (PO gate
	// 6404739593 item 3(ii)): a process whose cwd is this checkout but whose
	// `--root` points elsewhere serves foreign code and must be refused.
	const rootArg = parseAstroRootArg(cmdline.args ?? command);
	if (rootArg.error !== undefined) {
		return { error: `the serving process pid ${pid} on 127.0.0.1:${port} has an ambiguous --root (${rootArg.error}) — refusing to guess the effective source root` };
	}
	const cwd = await readCwd(pid);
	if (cwd.error !== undefined) {
		return { error: `the serving process pid ${pid} has no readable working directory (${cwd.error}) — its source root cannot be bound to this checkout` };
	}
	if (cwd.value !== repoRoot) {
		return { error: `the serving process pid ${pid} runs from ${cwd.value}, not this checkout (${repoRoot}) — the endpoint is not bound to the source under test` };
	}
	let effectiveRoot = cwd.value;
	if (rootArg.root !== undefined) {
		const resolved = await resolveRoot(rootArg.root, cwd.value);
		if (resolved.error !== undefined) {
			return { error: `the serving process's --root ${rootArg.root} cannot be resolved to an observable directory (${resolved.error}) — the effective source root is non-observable` };
		}
		effectiveRoot = resolved.value;
		const expectedRoots = new Set([repoRoot]);
		const realRepoRoot = await resolveRoot(".", repoRoot);
		if (realRepoRoot.value !== undefined) {
			expectedRoots.add(realRepoRoot.value);
		}
		if (!expectedRoots.has(effectiveRoot)) {
			return { error: `the serving process's effective Astro root ${effectiveRoot} (--root ${JSON.stringify(rootArg.root)}) is not this checkout (${repoRoot}) — the endpoint is not bound to the source under test` };
		}
	}
	const head = await gitHead(effectiveRoot);
	if (head.error !== undefined) {
		return { error: `the serving process's source root ${effectiveRoot} has no observable HEAD (${head.error})` };
	}
	const sha = String(head.value ?? "").trim();
	if (sha !== expectedSha) {
		return { error: `the serving process's source HEAD is ${sha}, not the declared execution SHA ${expectedSha} — the endpoint is not serving the candidate under test` };
	}
	return {
		pid: Number(pid),
		sourceRoot: effectiveRoot,
		sha,
		provenance: `listener 127.0.0.1:${port} → pid ${pid} (astro dev, effective root = ${
			rootArg.root !== undefined ? `--root ${JSON.stringify(rootArg.root)} → ` : ""
		}${effectiveRoot}, HEAD = declared execution SHA)`,
	};
}

/** Default local observations for admittedServingProcess (overridable offline). */
async function defaultSsListeners() {
	const result = await new Promise((resolve) => {
		try {
			execFile(
				"ss",
				["-ltnp"],
				{ timeout: PREREQUISITE_DEADLINE_MS, maxBuffer: 1024 * 1024 },
				(error, stdout) => {
					if (error) resolve({ error: error.code ?? error.message });
					else resolve({ stdout: String(stdout) });
				},
			);
		} catch (error) {
			resolve({ error: error.code ?? error.message });
		}
	});
	return result;
}

async function defaultProcCmdline(pid) {
	try {
		const raw = await readFile(`/proc/${pid}/cmdline`, "utf8");
		const args = raw.split("\0").filter((part) => part.length > 0);
		return { value: args.join(" "), args };
	} catch (error) {
		return { error: error.code ?? error.message };
	}
}

/** Resolve an Astro `--root` value (possibly relative to the process cwd) to its real absolute path. */
async function defaultResolveAstroRoot(rootValue, cwdValue) {
	try {
		const { realpath } = await import("node:fs/promises");
		const value = await realpath(path.resolve(cwdValue, rootValue));
		return { value };
	} catch (error) {
		return { error: error.code ?? error.message };
	}
}

async function defaultProcCwd(pid) {
	try {
		const { readlink } = await import("node:fs/promises");
		return { value: await readlink(`/proc/${pid}/cwd`) };
	} catch (error) {
		return { error: error.code ?? error.message };
	}
}

async function defaultGitHeadIn(cwd) {
	return new Promise((resolve) => {
		try {
			execFile(
				"git",
				["rev-parse", "HEAD"],
				{ cwd, timeout: PREREQUISITE_DEADLINE_MS, maxBuffer: 1024 * 1024 },
				(error, stdout) => {
					if (error) resolve({ error: error.code ?? error.message });
					else resolve({ value: String(stdout).trim() });
				},
			);
		} catch (error) {
			resolve({ error: error.code ?? error.message });
		}
	});
}

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
 * The documented read-only Runtime Controller (AGENTS.md; quickstart). Only
 * its routine `status` operation is ever invoked, and only to OBSERVE the
 * stable runtime source identity. Overridable path for offline controls.
 */
const RUNTIME_CONTROLLER_DEFAULT = "/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh";
const RUNTIME_CONTROLLER_ENV = "SONGHEALTH_RUNTIME_CONTROLLER";

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
function boundedExec(file, args, label) {
	return new Promise((resolve) => {
		try {
			execFile(
				file,
				args,
				{ cwd: repoRoot, timeout: PREREQUISITE_DEADLINE_MS, maxBuffer: 1024 * 1024 },
				(error, stdout) => {
					if (error) {
						resolve({ error: `${label} failed (${error.code ?? error.message})` });
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
		return { error: `git rev-parse HEAD returned a non-SHA value — refusing to guess the candidate identity` };
	}
	return { sha, provenance: "git rev-parse HEAD of this checkout" };
}

/**
 * The OBSERVED stable runtime source identity (R2), through the only
 * approved read-only observation: the documented Runtime Controller `status`
 * routine operation (quickstart "Prerequisites"; the preflight observed the
 * same field). The controller prints a JSON object whose "source" field is
 * the stable source SHA. Any failure, missing field or malformed value is a
 * HOLD — missing identity evidence must never let a worker spawn.
 */
export async function observedRuntimeSourceIdentity() {
	if (disposableMode()) {
		// No controller exists for the disposable app and no fallback to the
		// persistent controller is permitted: the verified checkout
		// provenance IS the observation (with the protected route identity
		// probe still performed later in the prerequisites).
		return disposableSourceIdentity();
	}
	const controller = process.env[RUNTIME_CONTROLLER_ENV] ?? RUNTIME_CONTROLLER_DEFAULT;
	const status = await boundedExec(controller, ["status"], `controller status (${controller})`);
	if (status.error !== undefined) {
		return {
			error: `the stable runtime source identity could not be observed: ${status.error}; missing identity evidence is a HOLD, never an assumption`,
		};
	}
	let parsed;
	try {
		parsed = JSON.parse(status.stdout ?? "");
	} catch {
		return { error: "the Runtime Controller status output was not the expected JSON identity record" };
	}
	const source = parsed?.source;
	if (typeof source !== "string" || !FULL_SHA_PATTERN.test(source)) {
		return {
			error: `the Runtime Controller status record carries no full 40-hex "source" identity (observed ${JSON.stringify(source)})`,
		};
	}
	return {
		sha: source,
		provenance: `Runtime Controller status (${controller}) — the documented read-only observation`,
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
		return { error: `route access input ${value} could not be read (${error.code ?? error.message})` };
	}
}

/**
 * Prerequisite — application identity: the persistent origin must answer as
 * the expected Songhealth application (the public SSR marker). This alone
 * is NOT source identity (R2); the SHA comparison below is. No server is
 * ever started here; a connection failure is a HOLD, not something to boot
 * around. Bounded by an abort deadline (R4).
 */
/** The origin this run targets: the admitted disposable loopback in T022
 * disposable mode, else the persistent shared origin. No silent fallback
 * between the two exists. */
function admittedOrigin() {
	if (!disposableMode()) {
		return { origin: PERSISTENT_DEVELOPMENT_ORIGIN };
	}
	const target = disposableOrigin();
	if (target.error !== undefined) {
		return target;
	}
	return { origin: target.origin };
}

async function originIdentityHolds() {
	const admitted = admittedOrigin();
	if (admitted.error !== undefined) {
		return admitted.error;
	}
	const label = admitted.origin === PERSISTENT_DEVELOPMENT_ORIGIN
		? "persistent development"
		: "disposable T022";
	try {
		const response = await fetch(new URL("/", admitted.origin), {
			redirect: "error",
			signal: AbortSignal.timeout(PREREQUISITE_DEADLINE_MS),
		});
		if (response.status !== 200) {
			return `unexpected origin response: GET / answered ${response.status} (expected 200 from the ${label} application)`;
		}
		const body = await response.text();
		if (!SSR_MARKER_PATTERN.test(body)) {
			return `unexpected application identity: the origin does not serve the songhealth-foundation public SSR marker — refusing to treat it as the ${label} Songhealth application`;
		}
		return undefined;
	} catch (error) {
		const reason = error?.name === "TimeoutError" ? "deadline exceeded" : (error.cause?.code ?? error.cause?.message ?? error.message);
		return `the ${label} origin ${admitted.origin} did not answer (${reason}); an unavailable app is a HOLD prerequisite — never authorization to start, restart or substitute a server`;
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
	const admitted = admittedOrigin();
	if (admitted.error !== undefined) {
		return admitted.error;
	}
	const url = new URL("/__feature002/public-reads?case=probe", admitted.origin);
	let probe;
	try {
		probe = await fetchJson(url, { "x-songhealth-t021-route-access": routeAccessToken });
	} catch (error) {
		const reason = error?.name === "TimeoutError" ? "deadline exceeded" : (error.cause?.code ?? error.message);
		return `the fixture route probe failed against the admitted origin (${reason})`;
	}
	if (probe.status === 404) {
		return "the dev-only fixture route /__feature002/public-reads is not installed on the admitted server (the reviewed source/config transition is a separate authorization) — HOLD, not a substitute server";
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
	if (body.sourceIdentity !== undefined && body.sourceIdentity !== null && body.sourceIdentity !== expectedSha) {
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
	const child = spawn(process.execPath, [PLAYWRIGHT_CLI, "test", SPEC_FILE, "--list", "--reporter=json"], {
		cwd: repoRoot,
		env: { ...process.env },
		stdio: ["ignore", "pipe", "pipe"],
	});
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
		return { error: `the discovery pre-pass did not finish within its ${budgetMs}ms budget (child terminated and reaped)` };
	}
	if (outcome.interrupted !== undefined) {
		await terminateChild(child, `discovery interrupted by ${outcome.interrupted}`);
		return { interrupted: true, error: `the discovery pre-pass was interrupted by ${outcome.interrupted} (child terminated and reaped)` };
	}
	if (outcome.spawnError !== undefined) {
		return { error: `the discovery pre-pass could not run (${outcome.spawnError})` };
	}
	if (outcome.code !== 0) {
		return { error: `the discovery pre-pass failed with exit code ${String(outcome.code)}${stderr.trim().length > 0 ? `: ${stderr.trim().split("\n").pop()}` : ""}` };
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
		return { error: "the discovery pre-pass reported zero expected tests — refusing to accept an empty expected set" };
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
			failures.push(`test ${JSON.stringify(title)} recorded status ${JSON.stringify(status)}, not a terminal "passed"`);
		}
		const count = (seen.get(title) ?? 0) + 1;
		seen.set(title, count);
		if (count > 1) {
			failures.push(`test ${JSON.stringify(title)} recorded ${count} result rows — duplicated/retried results cannot satisfy coverage`);
		}
	}
	for (const title of expectedTitles) {
		if (!seen.has(title)) {
			failures.push(`expected test ${JSON.stringify(title)} has no recorded result`);
		}
	}
	for (const title of seen.keys()) {
		if (!expectedTitles.includes(title)) {
			failures.push(`unexpected recorded test ${JSON.stringify(title)} is not part of the expected suite`);
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

	// T022 corrective C5 — FIRST, before anything else: a PARTIAL disposable
	// request fails closed here, before the controller observation, any
	// credential read, any HTTP request and any child start, so incomplete
	// disposable inputs can never fall back to the persistent path.
	const completeness = disposableInputCompleteness();
	if (!completeness.complete) {
		await hold([completeness.error]);
		return;
	}

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
				`source identity mismatch: the stable runtime source is ${observed.sha} (${observed.provenance}) but the candidate under test is ${expected.sha} (${expected.provenance}) — advancing the runtime requires the separately reviewed controller-compatible maintenance; a committed candidate does not implicitly update the persistent application`,
			);
		} else {
			process.stderr.write(
				`coordinator: exact source identity verified — stable runtime source ${observed.sha} equals the candidate under test (${expected.provenance})\n`,
			);
		}
	}
	if (reasons.length > 0) {
		await hold(reasons);
		return;
	}

	// T022 corrective C5 — in disposable mode the admitted endpoint is bound
	// to the REAL serving app process and its source root BEFORE any HTTP
	// identity probe or credential read: listener → pid → command line →
	// cwd == this checkout → that checkout's HEAD == the declared execution
	// SHA. (In persistent mode the controller observation above is the
	// runtime provenance; the serving process belongs to the shared runtime
	// and is not this coordinator's to inspect.)
	if (disposableMode()) {
		const admitted = admittedOrigin();
		if (admitted.error !== undefined) {
			await hold([admitted.error]);
			return;
		}
		const serving = await admittedServingProcess(admitted.origin, expected.sha);
		if (serving.error !== undefined) {
			await hold([serving.error]);
			return;
		}
		process.stderr.write(
			`coordinator: disposable endpoint ${admitted.origin} bound to serving process pid ${serving.pid} (${serving.provenance})\n`,
		);
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
	const devAccessReason = await credentialInputHolds(DEV_ACCESS_CREDENTIAL_ENV, "development credential");
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

	const admitted = admittedOrigin();
	if (admitted.error !== undefined) {
		await hold([admitted.error]);
		return;
	}
	if (disposableMode()) {
		// The spec-side target guard must agree with the coordinator's
		// admitted disposable origin (and can never name 4322 there).
		process.env.SONGHEALTH_T021_TARGET_ORIGIN = admitted.origin;
	}
	const childEnv = {
		...process.env,
		PLAYWRIGHT_BASE_URL: admitted.origin,
		[OPT_IN_ENV]: "1",
		[OWNERSHIP_MANIFEST_ENV]: manifestPath,
		[RUN_STATUS_ENV]: statusPath,
	};

	process.stderr.write(
		`coordinator: running ${SPEC_FILE} through the pinned Playwright runner against ${admitted.origin}${disposableMode() ? " (T022 disposable mode)" : ""} (timeout ${timeout}ms; owned-fixture manifest ${path.relative(repoRoot, manifestPath)})\n`,
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
	const onChildError = (error) =>
		resolveOutcome({ spawnError: error.code ?? error.message });
	const onChildExit = (code, signal) => resolveOutcome({ code, signal });
	child.once("error", onChildError);
	child.once("exit", onChildExit);
	process.once("SIGINT", onSignalInt);
	process.once("SIGTERM", onSignalTerm);
	const timeoutHandle = setTimeout(
		() => resolveOutcome({ timedOut: true }),
		timeout,
	);
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

	// T022 corrective C5 — in disposable mode the source under test must be
	// UNCHANGED from admission through execution: the same clean-HEAD
	// observation taken before the worker ran is repeated after it. A changed
	// or dirtied tree invalidates the run's provenance regardless of the
	// worker outcome; the evidence files above are retained, never deleted.
	let sourceFailure;
	if (disposableMode()) {
		// trackedOnly: untracked build artifacts the dev server may generate
		// mid-run (e.g. astro sync's emdash-env.d.ts) do not alter the source
		// under test; tracked modifications or a moved HEAD do.
		const afterRun = await disposableSourceIdentity({ trackedOnly: true });
		if (afterRun.error !== undefined) {
			sourceFailure = `the source under test changed during execution: post-run identity observation refused (${afterRun.error})`;
		} else if (afterRun.sha !== expected.sha) {
			sourceFailure = `the source under test changed during execution: post-run HEAD ${afterRun.sha} is not the admitted execution SHA ${expected.sha}`;
		}
		if (sourceFailure !== undefined) {
			process.stderr.write(`SOURCE FAILURE: ${sourceFailure}\n`);
		}
	}

	if (outcome.timedOut === true || outcome.interrupted !== undefined) {
		process.exitCode = INTERRUPTED_EXIT;
		return;
	}
	if (primaryFailure !== undefined) {
		process.exitCode = childCode === 0 ? 1 : childCode;
		return;
	}
	if (sourceFailure !== undefined) {
		process.exitCode = 1;
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

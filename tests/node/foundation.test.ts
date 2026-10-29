// T009 — RED test definition for the demonstrated Songhealth aggregate-readiness
// gap (Feature 001, User Story 1).
//
// Authority:
// - specs/001-platform-foundation/tasks.md T009 (and T012, which must satisfy
//   these tests later), the dependency graph (T008 -> T009 -> T012), and the
//   Scope Guardrails (the readiness helper is the ONLY demonstrated
//   Songhealth-specific extension)
// - specs/001-platform-foundation/spec.md: FR-003 (repeatable, on-demand,
//   non-mutating, private readiness; no public health endpoint), FR-007 (no
//   secret values in readiness/failure output), FR-011 (readiness must
//   distinguish a usable platform from a merely running process), FR-012
//   (actionable failures without sensitive disclosure or false readiness),
//   FR-015/FR-016, FR-018 (only non-confidential validation data), FR-019,
//   User Story 1 acceptance scenarios, and the edge cases (missing/malformed
//   configuration must prevent a false-ready state; an unavailable or
//   unwritable data or media boundary must be distinguishable and must not
//   trigger creation of an unintended empty replacement store)
// - specs/001-platform-foundation/plan.md ("Runtime verification and
//   readiness": loopback request to `/`, bounded PostgreSQL connectivity
//   check, expected-media-mount presence/readability, redacted evidence only)
// - specs/001-platform-foundation/data-model.md §5 (Readiness Result: overall
//   state exactly `ready`/`not-ready`, ISO 8601 timestamp context, safe
//   dependency name on failure) and §4 (media recurring check is
//   presence/readability without mutation; the runtime must not silently
//   substitute an empty directory)
// - specs/001-platform-foundation/quickstart.md §3.1 (expected result table:
//   valid inputs -> ready; missing configuration -> fails naming the field;
//   PostgreSQL unavailable / media absent or unreadable -> not-ready)
// - specs/001-platform-foundation/data-model.md §1 ("Error and readiness
//   output may name the missing field or dependency but must not print
//   values")
// - docs/website-modernization-docs/current/10-system-blueprint.md §20.1
//   (native runtime configuration contract), §21 (test Songhealth
//   configuration and assumptions, not platform internals), §22 (extension
//   gate: a custom helper needs a demonstrated gap and focused tests)
//
// These tests define the approved contract and are intentionally RED until
// T012 implements `scripts/verify-readiness.mjs`. They exercise exactly one
// black-box surface: running that future private helper as a child process
// (`node scripts/verify-readiness.mjs`, the same command `npm run
// verify:readiness` will wrap once a later task wires the script — T009 does
// not touch package.json) with a curated environment, a disposable working
// directory, and loopback-only fixture dependencies, then judging its exit
// status and combined stdout/stderr as an operator would.
//
// Contract defined here for T012:
// - The helper resolves the expected media mount `./media` (blueprint §20.1
//   stable application mount path) relative to its current working directory,
//   i.e. the application root it is run from.
// - The loopback SSR probe targets `/` on the loopback address derived from
//   the §20.1 application-server inputs (HOST/PORT), never the public origin.
// - Exit status 0 with evidence stating exactly `ready` is correct ONLY when
//   loopback `/` returns the expected SSR marker, a bounded PostgreSQL
//   connection/query succeeds, and the expected media mount exists and is
//   readable. Any required failure exits nonzero with evidence stating
//   `not-ready` and at most a safe field/dependency name.
// - The expected SSR marker is the canonical public runtime verification
//   marker contract already accepted by T010 and rendered by T011's
//   `src/pages/index.astro` at `/`: a meta element named
//   "songhealth-foundation" with the exact content value "public-runtime"
//   (Product Owner decision resolving 9GOTSTORY-146, 2026-10-07, which
//   supersedes the earlier T009-only literal). The marker is public page
//   content, so its text is not treated as a secret anywhere in this file.
// - Every dependency check is bounded: the helper must terminate by itself
//   with a not-ready result within the deterministic wall-clock bound enforced
//   below when a dependency accepts connections but never responds.
//
// Fixture shape: the probed boundaries run as real separate loopback
// processes. One spawned sibling "fixture daemon" hosts the synthetic
// application HTTP server and/or the synthetic PostgreSQL server (a minimal
// server-side wire double that answers the standard startup/auth/result
// exchange for any trivial connectivity query) for each case, and the helper
// is spawned as its process sibling. This models the deployment truth being
// contracted — separate application and database processes reached over
// loopback — and keeps the harness functional in network-isolated automation
// environments where the test-runner process itself may not share a loopback
// compartment with its children. The daemon proves its own soundness at
// startup through in-process self-checks (the served marker body, a real
// query through the pinned `pg` client, and deterministic connection refusal
// on a reserved-then-freed port) reported in its readiness line; the control
// tests below assert those self-checks so every contract failure is
// attributable to the absent T012 helper, not to missing test dependencies or
// broken fixtures.
//
// Non-mutation (T009 acceptance): a normal recurring readiness run must not
// create, modify, remove, or re-permission ANY media entry. The media
// fixtures below are snapshotted (kind, size, mtime, permission bits,
// SHA-256) before the helper runs and compared after — including in the
// unreadable case, where the arranged mode is captured before any test-side
// restoration — and a missing mount must still be missing afterwards (no
// unintended empty replacement store). These tests deliberately do NOT fold
// in T013's distinct startup-acceptance work: no media write/read/remove
// probe and no migration status/apply/check gate appears anywhere here.
//
// Per §21 these tests cover Songhealth's aggregate-readiness gap only. The
// loopback HTTP and PostgreSQL fixtures are minimal boundary doubles; they do
// not re-test Astro, EmDash, or `pg` internals, add no reusable
// test/production abstraction, and stay entirely inside this file. No public
// health endpoint is required or probed. Every configured value and every
// fixture payload is an unmistakably synthetic, non-confidential marker
// (FR-018); no real credential ever appears in this file or its output.
//
// The test process is assumed to run as a non-root user (the unreadable-media
// case relies on file-mode permissions being enforced for the file owner).

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Synthetic (non-secret) markers and the shared valid baseline environment.
// All values are deliberately distinctive so the value-echo rule below cannot
// false-fail a correct implementation that prints generic, actionable hints.
// ---------------------------------------------------------------------------

const SYNTHETIC_PG_PASSWORD = "SYNTHETIC-PG-PASSWORD-NOT-A-SECRET";
const SYNTHETIC_URL_PASSWORD = "SYNTHETIC-URL-PASSWORD-NOT-A-SECRET";
const SYNTHETIC_ENCRYPTION_KEY = "SYNTHETIC-ENCRYPTION-KEY-0123456789abcdefABCDEF";

// Synthetic non-secret PostgreSQL identity (never a real database). The host
// must be loopback because the fixture server is loopback-only; the database
// and user names are distinctive synthetic markers.
const SYNTHETIC_IDENTITY = {
  host: "127.0.0.1",
  database: "songhealth_t009_synthetic_database",
  user: "songhealth_t009_synthetic_user",
} as const;

// The canonical public SSR verification marker contract (T010 defined it,
// T011's `src/pages/index.astro` renders it, T012 must expect it on loopback
// `/`). Exactly the accepted T010/T011 meta element: `<meta
// name="songhealth-foundation" content="public-runtime">`; the Product Owner
// resolved it as canonical for T009/T012 too (9GOTSTORY-146, 2026-10-07),
// superseding the earlier T009-only literal
// "songhealth-foundation-001-runtime-verification". As in T010's browser
// smoke, the pattern tolerates only serialization details (whitespace and the
// optional self-closing slash); the element name and content value are the
// stable contract. Public page content, not a secret.
const EXPECTED_SSR_MARKER_PATTERN =
  /<meta\s+name="songhealth-foundation"\s+content="public-runtime"\s*\/?>/;

// Served when the loopback SSR probe must reach a listening server that DOES
// carry the canonical marker: a minimal synthetic HTML document whose head
// carries the canonical marker element in the exact serialization T011's
// `src/pages/index.astro` renders. Synthetic and non-confidential apart from
// the canonical public marker itself; free of the words "ready"/"not-ready".
const SYNTHETIC_MARKER_SSR_BODY =
  '<!doctype html><html><head><meta name="songhealth-foundation" content="public-runtime" /></head><body>synthetic-fixture-page</body></html>';

// Served when a probe must reach a listening server whose response is NOT the
// expected marker: deliberately free of the canonical marker (no meta element
// at all, so neither the "songhealth-foundation" name nor the "public-runtime"
// value appears) and of the words "ready"/"not-ready" so a helper that dumps
// the response body cannot accidentally satisfy (or distort) the state
// assertions.
const SYNTHETIC_WRONG_SSR_BODY =
  "<!doctype html><html><body>synthetic-unrelated-payload-without-runtime-marker</body></html>";

// Constant secret markers asserted absent in every case, independent of what
// the case itself configures (the migration-URL password is a fragment of the
// URL value, so it needs its own entry to catch a fragment-only echo).
const CONSTANT_SECRET_MARKERS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "PGPASSWORD value marker", value: SYNTHETIC_PG_PASSWORD },
  { label: "migration-URL password marker", value: SYNTHETIC_URL_PASSWORD },
  { label: "EMDASH_ENCRYPTION_KEY value marker", value: SYNTHETIC_ENCRYPTION_KEY },
];

/** Standalone echo-forbidden entries for the distinctive non-secret identity
 * components (host, port, user, database) of any parsable configured URL, so
 * an error that echoes only a FRAGMENT of the migration URL — for example
 * just its user or database component — is caught even when the full URL is
 * never printed and the corresponding PG* variable was deleted for the case.
 * URL schemes are deliberately not forbidden: legitimate actionable hints
 * name supported schemes such as postgresql:// or http://. */
function urlComponentValues(env: Record<string, string>): ReadonlyArray<{ label: string; value: string }> {
  const components: Array<{ label: string; value: string }> = [];
  const add = (label: string, value: string) => {
    if (value.length > 0) {
      components.push({ label, value });
    }
  };
  const collect = (variable: string, raw: string | undefined, wantsDatabase: boolean) => {
    if (!raw) return;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return; // unparsable URL: the whole configured value is already forbidden
    }
    add(`${variable} URL host component`, parsed.hostname);
    if (parsed.port !== "") add(`${variable} URL port component`, parsed.port);
    if (parsed.username !== "") add(`${variable} URL user component`, parsed.username);
    if (wantsDatabase) {
      const database = parsed.pathname.replace(/^\//, "");
      add(`${variable} URL database component`, database);
    }
  };
  collect("EMDASH_MIGRATION_DATABASE_URL", env.EMDASH_MIGRATION_DATABASE_URL, true);
  collect("EMDASH_SITE_URL", env.EMDASH_SITE_URL, false);
  return components;
}

/** The complete echo-forbidden set for one exact case: the constant secret
 * markers, every non-empty configured input value of that case, and the
 * distinctive identity components of its configured URLs. Readiness evidence
 * is a state plus safe dependency/field names only (data-model §1: output
 * "may name the missing field or dependency but must not print values"), so
 * echoing ANY configured value — loopback endpoint included — is a violation
 * that forces redacted summaries instead of raw stack traces or URLs. */
function echoForbiddenValuesFor(env: Record<string, string>): ReadonlyArray<{ label: string; value: string }> {
  const configured = Object.entries(env)
    .filter(([, value]) => value.length > 0)
    .map(([name, value]) => ({ label: `${name} value`, value }));
  return [...CONSTANT_SECRET_MARKERS, ...configured, ...urlComponentValues(env)];
}

// The complete approved native runtime input set (§20.1), synthetic and valid,
// pointed at this case's loopback fixtures. The migration URL is derived from
// the same identity values so the PG*/URL consistency requirement never turns
// an availability case into a consistency case.
function validBaselineEnv(ssrPort: number, pgPort: number): Record<string, string> {
  return {
    HOST: "127.0.0.1",
    PORT: String(ssrPort),
    EMDASH_SITE_URL: "http://synthetic-public-origin.example.invalid",
    PGHOST: SYNTHETIC_IDENTITY.host,
    PGPORT: String(pgPort),
    PGDATABASE: SYNTHETIC_IDENTITY.database,
    PGUSER: SYNTHETIC_IDENTITY.user,
    PGPASSWORD: SYNTHETIC_PG_PASSWORD,
    EMDASH_MIGRATION_DATABASE_URL:
      `postgresql://${SYNTHETIC_IDENTITY.user}:${SYNTHETIC_URL_PASSWORD}` +
      `@${SYNTHETIC_IDENTITY.host}:${pgPort}/${SYNTHETIC_IDENTITY.database}`,
    EMDASH_ENCRYPTION_KEY: SYNTHETIC_ENCRYPTION_KEY,
  };
}

// ---------------------------------------------------------------------------
// Output hygiene helpers.
// ---------------------------------------------------------------------------

/** ISO-8601-shaped timestamp tokens are the one legitimate numeric carrier in
 * readiness evidence (data-model §5 requires an ISO 8601 timestamp context),
 * so they are masked before echo checks: a numeric value hidden inside a real
 * timestamp is not an echo, while the same digits anywhere else is. */
const ISO_TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:[Zz]|[+-]\d{2}:?\d{2})?)?/g;

function maskTimestamps(text: string): string {
  return text.replace(ISO_TIMESTAMP_PATTERN, "<timestamp>");
}

/** Replace every case-specific configured marker before any child output is
 * used in assertion diagnostics, so a value-echo failure can never republish
 * the value through the test runner's own output. */
function sanitizeForReporting(
  text: string,
  forbidden: ReadonlyArray<{ label: string; value: string }>,
): string {
  let sanitized = maskTimestamps(text);
  for (const { value } of forbidden) {
    if (value.length > 0) {
      sanitized = sanitized.split(value).join("<redacted-test-marker>");
    }
  }
  return sanitized.length > 400 ? `${sanitized.slice(0, 400)}…` : sanitized;
}

// ---------------------------------------------------------------------------
// Black-box harness: run the future private readiness helper as an operator
// would and report the outcome. The child receives ONLY this case's variables
// (never the test runner's ambient environment), runs with a disposable
// working directory whose `./media` is the expected mount, and is killed by
// spawnSync's own timeout if it ever fails to bound itself.
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELPER_PATH = path.join(REPO_ROOT, "scripts", "verify-readiness.mjs");
const CHILD_TIMEOUT_MS = 30_000;
// The deterministic wall-clock bound the recurring check must respect when a
// dependency accepts connections but never responds: the helper must exit by
// itself with a not-ready result before this deadline.
const NON_RESPONSIVE_BOUND_MS = 10_000;
const DAEMON_READY_TIMEOUT_MS = 20_000;

interface HelperRun {
  status: number | null;
  signal: string | null;
  spawnError: string | null;
  /** Everything the child printed (stdout + stderr); never surfaced raw. */
  output: string;
}

function runReadinessHelper(
  env: Record<string, string>,
  cwd: string,
  timeoutMs: number = CHILD_TIMEOUT_MS,
): HelperRun {
  const spawned = spawnSync(process.execPath, [HELPER_PATH], {
    cwd,
    env,
    encoding: "utf8",
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    status: spawned.status,
    signal: spawned.signal,
    spawnError: spawned.error ? spawned.error.message : null,
    output: `${spawned.stdout ?? ""}\n${spawned.stderr ?? ""}`,
  };
}

function helperIsPresent(): boolean {
  return fs.existsSync(HELPER_PATH);
}

/** Appended to contract-assertion messages when the helper is absent, so the
 * intentional RED state attributes every failure to the missing T012 helper
 * rather than to a broken harness (the passing fixture-control tests prove
 * the fixtures and dependencies work). */
function redAttributionNote(): string {
  return helperIsPresent()
    ? ""
    : " — NOTE: scripts/verify-readiness.mjs is absent in this commit. That is " +
        "the intentional RED state these T009 tests define and the not-yet-authorized " +
        "T012 task must resolve; the passing fixture-control tests prove this failure " +
        "is attributable to the absent helper, not to missing dependencies or broken fixtures.";
}

function assertHarnessSound(run: HelperRun): void {
  assert.ok(
    run.spawnError === null,
    `harness failure (not a contract result): the helper child process did not run: ${run.spawnError}`,
  );
}

/** Assert the combined child output exposes nothing it must not: no constant
 * secret marker, no configured value of this exact case, and no distinctive
 * identity fragment of a configured URL (timestamps masked first). */
function assertNoValueEcho(run: HelperRun, env: Record<string, string>, contextLabel: string): void {
  const masked = maskTimestamps(run.output);
  for (const { label, value } of echoForbiddenValuesFor(env)) {
    assert.ok(
      !masked.includes(value),
      `${contextLabel} must never expose the configured ${label}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Exact overall state (data-model §5: the overall state is exactly `ready` or
// `not-ready`). The state must appear as an unambiguous standalone token: an
// occurrence embedded in a larger word or hyphenated compound ("unready",
// "readiness", "pre-ready") is not a state claim, and evidence carrying BOTH
// state tokens — or neither — is contradictory and rejected. Plain substring
// checks are deliberately never used for the overall state, so exit 0 with
// `unready` text, or a nonzero exit with both states printed, both fail.
// ---------------------------------------------------------------------------

const READY_STATE_TOKEN = /(?<![A-Za-z0-9-])ready(?![A-Za-z0-9-])/g;
const NOT_READY_STATE_TOKEN = /(?<![A-Za-z0-9-])not-ready(?![A-Za-z0-9-])/g;

/** Count the standalone overall-state tokens in the combined child output. */
function overallStateEvidence(output: string): { ready: number; notReady: number } {
  const count = (pattern: RegExp): number => (output.match(pattern) ?? []).length;
  return { ready: count(READY_STATE_TOKEN), notReady: count(NOT_READY_STATE_TOKEN) };
}

/** Assert the evidence states exactly the `ready` overall state: at least one
 * standalone `ready` token and no standalone `not-ready` token. */
function assertExactReadyState(
  run: HelperRun,
  forbidden: ReadonlyArray<{ label: string; value: string }>,
  contextLabel: string,
  red: string,
): void {
  const evidence = overallStateEvidence(run.output);
  assert.ok(
    evidence.ready >= 1 && evidence.notReady === 0,
    `${contextLabel} must state exactly one overall state: \`ready\` (data-model §5). ` +
      `Found ${evidence.ready} standalone \`ready\` and ${evidence.notReady} standalone ` +
      `\`not-ready\` token(s); embedded forms such as "unready" or "readiness" do not ` +
      `count as a state; sanitized output: ${sanitizeForReporting(run.output, forbidden)}${red}`,
  );
}

/** Assert the evidence states exactly the `not-ready` overall state: at least
 * one standalone `not-ready` token and no standalone `ready` token, so a
 * contradictory readiness claim can never pass alongside a failure. */
function assertExactNotReadyState(
  run: HelperRun,
  forbidden: ReadonlyArray<{ label: string; value: string }>,
  contextLabel: string,
  red: string,
): void {
  const evidence = overallStateEvidence(run.output);
  assert.ok(
    evidence.notReady >= 1 && evidence.ready === 0,
    `${contextLabel} must state exactly one overall state: \`not-ready\` (data-model §5). ` +
      `Found ${evidence.notReady} standalone \`not-ready\` and ${evidence.ready} standalone ` +
      `\`ready\` token(s); a stray standalone \`ready\` token is a contradictory readiness ` +
      `claim; sanitized output: ${sanitizeForReporting(run.output, forbidden)}${red}`,
  );
}

/** Run one not-ready case: the helper must exit nonzero, state `not-ready`,
 * identify the dependency safely, and echo no configured value. */
function expectNotReady(
  run: HelperRun,
  env: Record<string, string>,
  expectedName: { pattern: RegExp; label: string } | { field: string },
): void {
  const forbidden = echoForbiddenValuesFor(env);
  const red = redAttributionNote();
  assertHarnessSound(run);
  assert.ok(
    run.status !== null && run.status !== 0,
    "a failed required dependency or missing input must exit nonzero (never falsely " +
      `report ready through the exit status); got exit ${run.status ?? "none"} signal ${run.signal}` +
      `; sanitized output: ${sanitizeForReporting(run.output, forbidden)}${red}`,
  );
  assertExactNotReadyState(run, forbidden, "failure evidence", red);
  if ("field" in expectedName) {
    assert.ok(
      new RegExp(`\\b${expectedName.field}\\b`).test(run.output),
      `failure evidence must identify the missing required input by its safe field ` +
        `name "${expectedName.field}" (quickstart §3.1); sanitized output: ` +
        `${sanitizeForReporting(run.output, forbidden)}${red}`,
    );
  } else {
    assert.ok(
      expectedName.pattern.test(run.output),
      `failure evidence must identify the affected dependency safely (expected a name ` +
        `matching ${expectedName.label}); sanitized output: ` +
        `${sanitizeForReporting(run.output, forbidden)}${red}`,
    );
  }
  assertNoValueEcho(run, env, "not-ready evidence");
}

// ---------------------------------------------------------------------------
// Fixture daemon (spawned sibling process). Hosts the loopback synthetic
// application HTTP server and/or the synthetic PostgreSQL server for one
// case, reserves a deterministic closed loopback port for connection-refused
// cases, and proves its own soundness through in-process self-checks before
// reporting readiness as one JSON line on stdout. It stays alive until its
// stdin closes or it receives SIGTERM, then exits without leaving sockets or
// files behind. Everything it serves is synthetic and non-confidential.
// ---------------------------------------------------------------------------

type SsrMode = "marker" | "wrong-marker" | "refused";
type PgMode = "responsive" | "silent" | "refused";

function fixtureDaemonSource(options: { ssr: SsrMode; pg: PgMode }): string {
  return `
const OPTIONS = ${JSON.stringify(options)};
const MARKER_BODY = ${JSON.stringify(SYNTHETIC_MARKER_SSR_BODY)};
const WRONG_BODY = ${JSON.stringify(SYNTHETIC_WRONG_SSR_BODY)};
const MARKER_PATTERN = ${EXPECTED_SSR_MARKER_PATTERN.toString()};
const PG_IDENTITY = ${JSON.stringify(SYNTHETIC_IDENTITY)};
const PG_PASSWORD = ${JSON.stringify(SYNTHETIC_PG_PASSWORD)};
// --eval ESM has no require: anchor one at the repository root so the pinned
// application dependencies (pg) resolve exactly as the helper will resolve them.
const { createRequire } = await import("node:module");
const require = createRequire(process.cwd() + "/fixture-daemon-anchor.cjs");
const fail = (message) => {
  process.stdout.write(JSON.stringify({ harnessError: message }) + "\\n");
  process.exit(1);
};
const servers = [];
const sockets = new Set();
const track = (server) => {
  servers.push(server);
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
    socket.on("close", () => sockets.delete(socket));
  });
};
const shutdown = () => {
  for (const socket of sockets) socket.destroy();
  for (const server of servers) server.close();
  process.exit(0);
};
process.stdin.on("end", shutdown);
process.stdin.resume();
process.on("SIGTERM", shutdown);

// -- PostgreSQL server-side wire double (minimal boundary answers) ----------
const pgMessage = (type, payload) => {
  const head = Buffer.alloc(5);
  head.write(type, 0, "latin1");
  head.writeUInt32BE(payload.length + 4, 1);
  return Buffer.concat([head, payload]);
};
const int32 = (v) => { const b = Buffer.alloc(4); b.writeInt32BE(v, 0); return b; };
const int16 = (v) => { const b = Buffer.alloc(2); b.writeInt16BE(v, 0); return b; };
const cstring = (v) => Buffer.from(v + "\\0", "utf8");
const parameterStatus = (name, value) => pgMessage("S", Buffer.concat([cstring(name), cstring(value)]));
const rowDescription = () => pgMessage("T", Buffer.concat([
  int16(1), cstring("ok"), int32(0), int16(0), int32(25), int16(-1), int32(-1), int16(0),
]));
const dataRow = () => {
  const value = Buffer.from("1", "utf8");
  return pgMessage("D", Buffer.concat([int16(1), int32(value.length), value]));
};
const startupReply = () => Buffer.concat([
  pgMessage("R", int32(0)),
  parameterStatus("server_version", "18.6"),
  parameterStatus("client_encoding", "UTF8"),
  pgMessage("K", Buffer.concat([int32(77), int32(88)])),
  pgMessage("Z", Buffer.from("I")),
]);
const servePg = (mode) => new Promise((resolve, reject) => {
  const server = require("node:net").createServer();
  track(server);
  server.on("connection", (socket) => {
    if (mode === "silent") return;
    let receivedStartup = false;
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!receivedStartup) {
        if (buffer.length < 8) return;
        const code = buffer.readUInt32BE(4);
        if (code === 80877103) {
          socket.write(Buffer.from("N", "latin1"));
          buffer = buffer.subarray(buffer.readUInt32BE(0));
          return;
        }
        if (code !== 196608) { socket.destroy(); return; }
        buffer = buffer.subarray(buffer.readUInt32BE(0));
        receivedStartup = true;
        socket.write(startupReply());
      }
      while (buffer.length >= 5) {
        const length = buffer.readUInt32BE(1);
        if (buffer.length < 1 + length) break;
        const type = buffer.toString("latin1", 0, 1);
        buffer = buffer.subarray(1 + length);
        if (type === "Q") {
          socket.write(Buffer.concat([rowDescription(), dataRow(), pgMessage("C", cstring("SELECT 1")), pgMessage("Z", Buffer.from("I"))]));
        } else if (type === "P") {
          socket.write(pgMessage("1", Buffer.alloc(0)));
        } else if (type === "B") {
          socket.write(pgMessage("2", Buffer.alloc(0)));
        } else if (type === "D") {
          socket.write(rowDescription());
        } else if (type === "E") {
          socket.write(Buffer.concat([dataRow(), pgMessage("C", cstring("SELECT 1"))]));
        } else if (type === "S") {
          socket.write(pgMessage("Z", Buffer.from("I")));
        } else if (type === "X") {
          socket.end();
          return;
        }
      }
    });
  });
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve(server.address().port));
});

// -- Synthetic application HTTP server ---------------------------------------
const serveSsr = (mode) => new Promise((resolve, reject) => {
  const body = mode === "marker" ? MARKER_BODY : WRONG_BODY;
  const server = require("node:http").createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(body);
      return;
    }
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("synthetic-not-found");
  });
  track(server);
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve(server.address().port));
});

// -- Deterministic closed loopback port --------------------------------------
const reserveClosedPort = () => new Promise((resolve, reject) => {
  const server = require("node:net").createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    server.close(() => resolve(port));
  });
});
const refusedWithin = (port, ms) => new Promise((resolve) => {
  const socket = require("node:net").connect({ host: "127.0.0.1", port });
  const done = (refused, code) => { socket.destroy(); resolve({ refused, code }); };
  socket.once("error", (error) => done(true, error.code));
  socket.once("connect", () => done(false, null));
  setTimeout(() => done(false, "timeout"), ms).unref();
});

const main = async () => {
  const closedPort = await reserveClosedPort();
  const refusal = await refusedWithin(closedPort, 1500);

  const report = {
    closedPort,
    closedPortRefused: refusal.refused && refusal.code !== "timeout",
    ssrPort: null,
    ssrMarkerServed: null,
    pgPort: null,
    pgQueryAnswered: null,
  };

  if (OPTIONS.ssr !== "refused") {
    report.ssrPort = await serveSsr(OPTIONS.ssr);
    const response = await fetch("http://127.0.0.1:" + report.ssrPort + "/", { signal: AbortSignal.timeout(5000) });
    const body = await response.text();
    report.ssrMarkerServed =
      response.status === 200 &&
      (OPTIONS.ssr === "marker" ? MARKER_PATTERN.test(body) : !MARKER_PATTERN.test(body));
  }

  if (OPTIONS.pg === "responsive") {
    report.pgPort = await servePg("responsive");
    const pgModule = require("pg");
    const client = new pgModule.Client({
      host: "127.0.0.1",
      port: report.pgPort,
      database: PG_IDENTITY.database,
      user: PG_IDENTITY.user,
      password: PG_PASSWORD,
      connectionTimeoutMillis: 5000,
    });
    await client.connect();
    const result = await client.query("select 1");
    report.pgQueryAnswered = result.rowCount === 1 && result.rows.length === 1;
    await client.end();
  } else if (OPTIONS.pg === "silent") {
    report.pgPort = await servePg("silent");
  }

  process.stdout.write(JSON.stringify(report) + "\\n");
};

main().catch((error) => fail(String(error && error.message ? error.message : error)));
`;
}

interface DaemonReport {
  harnessError?: string;
  closedPort: number;
  closedPortRefused: boolean;
  ssrPort: number | null;
  ssrMarkerServed: boolean | null;
  pgPort: number | null;
  pgQueryAnswered: boolean | null;
}

interface FixtureDaemon {
  report: DaemonReport;
  close(): Promise<void>;
}

/** Spawn the fixture daemon and wait for its self-checked readiness line.
 * Every startup-rejection path (spawn error, timeout, early exit without a
 * report, unparseable report, reported self-check failure) terminates the
 * exact spawned child BEFORE the error is rethrown, so a failed daemon
 * startup can never leak the process; the returned `close()` reuses the same
 * bounded, idempotent terminator. */
async function startFixtureDaemon(options: { ssr: SsrMode; pg: PgMode }): Promise<FixtureDaemon> {
  const child = spawn(
    process.execPath,
    ["--input-type=module", "--eval", fixtureDaemonSource(options)],
    { cwd: REPO_ROOT, stdio: ["pipe", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";
  let spawnErrorMessage: string | null = null;
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  child.once("error", (error: Error) => {
    spawnErrorMessage = error.message;
  });

  // Deterministic, bounded, idempotent terminator: close stdin (the daemon's
  // voluntary shutdown signal), escalate to SIGKILL after a grace period, and
  // always resolve — even if the exit event is delayed or already consumed.
  let terminated: Promise<void> | null = null;
  const terminate = (): Promise<void> => {
    if (terminated === null) {
      terminated = new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null || spawnErrorMessage !== null) {
          resolve();
          return;
        }
        const finish = () => resolve();
        child.once("exit", finish);
        try {
          child.stdin.end();
        } catch {
          /* stdin already closed */
        }
        setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        }, 3_000).unref();
        setTimeout(finish, 3_500).unref();
      });
    }
    return terminated;
  };

  let report: DaemonReport;
  try {
    report = await new Promise<DaemonReport>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`fixture daemon did not become ready within ${DAEMON_READY_TIMEOUT_MS} ms`)),
        DAEMON_READY_TIMEOUT_MS,
      );
      const poll = () => {
        if (spawnErrorMessage !== null) {
          clearTimeout(timer);
          reject(new Error(`fixture daemon could not be spawned: ${spawnErrorMessage}`));
          return;
        }
        const newline = stdout.indexOf("\n");
        if (newline === -1) {
          if (child.exitCode !== null) {
            clearTimeout(timer);
            reject(
              new Error(
                `fixture daemon exited early (code ${child.exitCode}) without a readiness line; ` +
                  `stderr: ${stderr.slice(0, 300) || "<empty>"}`,
              ),
            );
          } else {
            setTimeout(poll, 25);
          }
          return;
        }
        clearTimeout(timer);
        let parsed: DaemonReport;
        try {
          parsed = JSON.parse(stdout.slice(0, newline)) as DaemonReport;
        } catch (error) {
          reject(new Error(`fixture daemon readiness line was not parseable: ${String(error)}`));
          return;
        }
        if (typeof parsed.harnessError === "string") {
          reject(new Error(`fixture daemon self-check failed: ${parsed.harnessError}`));
          return;
        }
        resolve(parsed);
      };
      poll();
    });
  } catch (error) {
    await terminate();
    throw error;
  }

  return { report, close: terminate };
}

// ---------------------------------------------------------------------------
// Media fixture: synthetic, unmistakably non-confidential entries inside the
// disposable working directory's `./media` mount, snapshotted so any created,
// modified, removed, or re-permissioned entry is detected after a readiness
// run. Permission bits are part of every entry: a probe that only changes a
// mode (for example "repairing" an unreadable mount) is a mutation.
// ---------------------------------------------------------------------------

interface MediaSnapshotEntry {
  kind: "file" | "directory";
  size: number;
  mtimeMs: number;
  permBits: number;
  sha256: string | null;
}

function snapshotMedia(root: string): Record<string, MediaSnapshotEntry> {
  const entries: Record<string, MediaSnapshotEntry> = {};
  const walk = (absolute: string, relative: string) => {
    const stats = fs.statSync(absolute);
    if (stats.isDirectory()) {
      entries[relative] = {
        kind: "directory",
        size: 0,
        mtimeMs: stats.mtimeMs,
        permBits: stats.mode & 0o777,
        sha256: null,
      };
      for (const name of fs.readdirSync(absolute).sort()) {
        walk(path.join(absolute, name), path.join(relative, name));
      }
    } else if (stats.isFile()) {
      entries[relative] = {
        kind: "file",
        size: stats.size,
        mtimeMs: stats.mtimeMs,
        permBits: stats.mode & 0o777,
        sha256: crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex"),
      };
    } else {
      entries[relative] = {
        kind: "file",
        size: stats.size,
        mtimeMs: stats.mtimeMs,
        permBits: stats.mode & 0o777,
        sha256: null,
      };
    }
  };
  walk(root, ".");
  return entries;
}

function createMediaFixture(root: string): void {
  fs.mkdirSync(path.join(root, "nested"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "synthetic-media-readiness-entry.txt"),
    "songhealth synthetic media fixture entry (non-confidential, FR-018)\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, "nested", "synthetic-media-nested-entry.txt"),
    "songhealth synthetic nested media fixture entry (non-confidential, FR-018)\n",
    "utf8",
  );
}

// ---------------------------------------------------------------------------
// Per-case fixture orchestration: one disposable root directory, one fixture
// daemon (or its deterministic closed-port addresses), the `./media` mount in
// the requested state, and the curated valid environment. `close()` is
// deterministic and leaves nothing behind.
// ---------------------------------------------------------------------------

type MediaMode = "present" | "missing" | "unreadable";

interface Fixtures {
  fixtureRoot: string;
  mediaRoot: string | null;
  mediaSnapshot: Record<string, MediaSnapshotEntry> | null;
  env: Record<string, string>;
  close(): Promise<void>;
}

async function startFixtures(options: { ssr: SsrMode; pg: PgMode; media: MediaMode }): Promise<Fixtures> {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "songhealth-t009-"));
  let daemon: FixtureDaemon | null = null;
  let mediaRoot: string | null = null;
  let mediaSnapshot: Record<string, MediaSnapshotEntry> | null = null;

  try {
    daemon = await startFixtureDaemon({ ssr: options.ssr, pg: options.pg });
    const ssrPort = options.ssr === "refused" ? daemon.report.closedPort : (daemon.report.ssrPort as number);
    const pgPort = options.pg === "refused" ? daemon.report.closedPort : (daemon.report.pgPort as number);
    if (options.media !== "missing") {
      mediaRoot = path.join(fixtureRoot, "media");
      createMediaFixture(mediaRoot);
      mediaSnapshot = snapshotMedia(mediaRoot);
      if (options.media === "unreadable") {
        fs.chmodSync(mediaRoot, 0o000);
      }
    }
    return {
      fixtureRoot,
      mediaRoot,
      mediaSnapshot,
      env: validBaselineEnv(ssrPort, pgPort),
      close: async () => {
        if (mediaRoot !== null) {
          try {
            fs.chmodSync(mediaRoot, 0o755); // restore readability for cleanup
          } catch {
            /* already gone or already readable */
          }
        }
        fs.rmSync(fixtureRoot, { recursive: true, force: true });
        await daemon?.close();
      },
    };
  } catch (error) {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    await daemon?.close();
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Fixture controls (expected to PASS at this baseline). They assert the
// daemon's startup self-checks, proving the loopback fixtures and the pinned
// `pg` client boundary work, so that every contract failure below is
// attributable to the absent T012 helper, not to missing test dependencies or
// broken fixtures.
// ---------------------------------------------------------------------------

describe("fixture controls (harness soundness)", () => {
  it("SSR fixture serves the canonical marker body on loopback /", async () => {
    const daemon = await startFixtureDaemon({ ssr: "marker", pg: "responsive" });
    try {
      assert.equal(daemon.report.ssrMarkerServed, true, "the marker fixture must serve the canonical public-runtime marker");
    } finally {
      await daemon.close();
    }
  });

  it("responsive PostgreSQL fixture completes a real query through the pinned pg client", async () => {
    const daemon = await startFixtureDaemon({ ssr: "marker", pg: "responsive" });
    try {
      assert.equal(
        daemon.report.pgQueryAnswered,
        true,
        "the PostgreSQL boundary double must satisfy the pinned client",
      );
    } finally {
      await daemon.close();
    }
  });

  it("a reserved-then-freed loopback port deterministically refuses connections", async () => {
    const daemon = await startFixtureDaemon({ ssr: "marker", pg: "responsive" });
    try {
      assert.equal(
        daemon.report.closedPortRefused,
        true,
        "the freed-port fixture must refuse connections, not accept them",
      );
    } finally {
      await daemon.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Aggregate-ready contract (RED until T012): exit 0 with evidence stating
// exactly `ready` — and no media mutation — only when loopback `/` serves the
// expected SSR marker, a bounded PostgreSQL connection/query succeeds, and
// the expected media mount exists and is readable. The command is repeatable
// on demand (FR-003), so the ready case runs it twice.
// ---------------------------------------------------------------------------

describe("aggregate ready contract", () => {
  it("exits 0 stating ready, without mutating any media entry, when all recurring dependencies pass", async () => {
    const fixtures = await startFixtures({ ssr: "marker", pg: "responsive", media: "present" });
    try {
      const forbidden = echoForbiddenValuesFor(fixtures.env);
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const run = runReadinessHelper(fixtures.env, fixtures.fixtureRoot);
        const red = redAttributionNote();
        assertHarnessSound(run);
        assert.ok(
          run.status === 0,
          `ready attempt ${attempt}: the readiness command must exit 0 when loopback SSR, ` +
            `bounded PostgreSQL, and the readable media mount all pass; got exit ` +
            `${run.status ?? "none"} signal ${run.signal}; sanitized output: ` +
            `${sanitizeForReporting(run.output, forbidden)}${red}`,
        );
        assertExactReadyState(
          run,
          forbidden,
          `ready attempt ${attempt}: evidence`,
          red,
        );
        assert.ok(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(run.output),
          `ready attempt ${attempt}: evidence must include the ISO 8601 timestamp context ` +
            `(data-model §5)${red}`,
        );
        assertNoValueEcho(run, fixtures.env, `ready evidence (attempt ${attempt})`);
        assert.deepEqual(
          snapshotMedia(fixtures.mediaRoot as string),
          fixtures.mediaSnapshot,
          `ready attempt ${attempt}: normal recurring readiness must not create, modify, ` +
            "or remove any media entry (FR-011 non-mutating recurring check)",
        );
      }
    } finally {
      await fixtures.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Loopback SSR reachability (RED until T012): a refused loopback `/` or a
// reachable `/` without the expected marker must each produce a bounded,
// non-false-ready failure naming the runtime dependency safely.
// ---------------------------------------------------------------------------

describe("loopback SSR reachability contract", () => {
  const runtimeDependency = { pattern: /\b(ssr|runtime)\b/i, label: "the runtime/SSR dependency name" };

  it("reports not-ready naming the runtime dependency when loopback / cannot be reached", async () => {
    const fixtures = await startFixtures({ ssr: "refused", pg: "responsive", media: "present" });
    try {
      const run = runReadinessHelper(fixtures.env, fixtures.fixtureRoot);
      expectNotReady(run, fixtures.env, runtimeDependency);
      assert.deepEqual(
        snapshotMedia(fixtures.mediaRoot as string),
        fixtures.mediaSnapshot,
        "an SSR failure must still not mutate any media entry",
      );
    } finally {
      await fixtures.close();
    }
  });

  it("reports not-ready naming the runtime dependency when loopback / responds without the expected SSR marker", async () => {
    const fixtures = await startFixtures({ ssr: "wrong-marker", pg: "responsive", media: "present" });
    try {
      const run = runReadinessHelper(fixtures.env, fixtures.fixtureRoot);
      expectNotReady(run, fixtures.env, runtimeDependency);
      assert.deepEqual(
        snapshotMedia(fixtures.mediaRoot as string),
        fixtures.mediaSnapshot,
        "a wrong-marker failure must still not mutate any media entry",
      );
    } finally {
      await fixtures.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Bounded PostgreSQL connectivity (RED until T012): unavailable and
// non-responsive databases must each produce a bounded not-ready failure
// naming the database dependency safely.
// ---------------------------------------------------------------------------

describe("bounded PostgreSQL connectivity contract", () => {
  const databaseDependency = { pattern: /\b(database|postgres)\b/i, label: "the database dependency name" };

  it("reports not-ready naming the database dependency when PostgreSQL is unavailable", async () => {
    const fixtures = await startFixtures({ ssr: "marker", pg: "refused", media: "present" });
    try {
      const run = runReadinessHelper(fixtures.env, fixtures.fixtureRoot);
      expectNotReady(run, fixtures.env, databaseDependency);
      assert.deepEqual(
        snapshotMedia(fixtures.mediaRoot as string),
        fixtures.mediaSnapshot,
        "a database failure must still not mutate any media entry",
      );
    } finally {
      await fixtures.close();
    }
  });

  it("reports not-ready within the deterministic bound when PostgreSQL accepts but never responds", async () => {
    const fixtures = await startFixtures({ ssr: "marker", pg: "silent", media: "present" });
    try {
      const run = runReadinessHelper(fixtures.env, fixtures.fixtureRoot, NON_RESPONSIVE_BOUND_MS);
      const forbidden = echoForbiddenValuesFor(fixtures.env);
      const red = redAttributionNote();
      assertHarnessSound(run);
      assert.ok(
        run.status !== null && run.signal === null,
        "the recurring readiness command must bound the PostgreSQL check and terminate by " +
          `itself within ${NON_RESPONSIVE_BOUND_MS} ms when the dependency accepts but never ` +
          `responds; the child was instead killed by the test harness timeout (signal ` +
          `${run.signal ?? "none"}, status ${run.status ?? "none"})${red}`,
      );
      expectNotReady(run, fixtures.env, databaseDependency);
      assert.deepEqual(
        snapshotMedia(fixtures.mediaRoot as string),
        fixtures.mediaSnapshot,
        "a bounded database timeout must still not mutate any media entry",
      );
    } finally {
      await fixtures.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Expected media mount (RED until T012): presence/readability of the stable
// `./media` mount, without mutation and without silently substituting an
// empty replacement store (edge cases; data-model §4).
// ---------------------------------------------------------------------------

describe("expected media mount contract", () => {
  const mediaDependency = { pattern: /\bmedia\b/i, label: "the media dependency name" };

  it("reports not-ready naming the media dependency when the expected media mount is missing", async () => {
    const fixtures = await startFixtures({ ssr: "marker", pg: "responsive", media: "missing" });
    try {
      const run = runReadinessHelper(fixtures.env, fixtures.fixtureRoot);
      expectNotReady(run, fixtures.env, mediaDependency);
      assert.ok(
        !fs.existsSync(path.join(fixtures.fixtureRoot, "media")),
        "a missing media mount must not be silently replaced with an empty directory",
      );
    } finally {
      await fixtures.close();
    }
  });

  it("reports not-ready naming the media dependency when the expected media mount is unreadable", async () => {
    const fixtures = await startFixtures({ ssr: "marker", pg: "responsive", media: "unreadable" });
    const mediaRoot = fixtures.mediaRoot as string;
    const before = fixtures.mediaSnapshot as Record<string, MediaSnapshotEntry>;
    try {
      const run = runReadinessHelper(fixtures.env, fixtures.fixtureRoot);
      expectNotReady(run, fixtures.env, mediaDependency);

      // Capture the mount's post-probe state BEFORE any test-side restoration.
      // stat needs no read permission on the target itself, so this observes
      // what the helper actually left: a probe that removed the mount, or that
      // "repaired" its permission mode, is caught here and cannot be masked by
      // the readability restoration performed below for inspection/cleanup.
      let postRootStats: fs.Stats;
      try {
        postRootStats = fs.statSync(mediaRoot);
      } catch (error) {
        assert.fail(
          `the unreadable media mount must still be present after the probe (stat failed: ` +
            `${String(error)})`,
        );
      }
      assert.equal(
        postRootStats.mode & 0o777,
        0o000,
        "the recurring readiness probe must not change the media mount's permission mode",
      );

      // Inspection-only restoration, strictly AFTER the post-probe mode was
      // captured: re-readability lets the test verify the rest of the tree,
      // and must never overwrite the observed pre-restoration state.
      fs.chmodSync(mediaRoot, 0o755);
      const postSnapshot = snapshotMedia(mediaRoot);
      postSnapshot["."] = {
        kind: postRootStats.isDirectory() ? "directory" : "file",
        size: 0,
        mtimeMs: postRootStats.mtimeMs,
        permBits: postRootStats.mode & 0o777,
        sha256: null,
      };
      const expected: Record<string, MediaSnapshotEntry> = {
        ...before,
        ".": { ...before["."], permBits: 0o000 },
      };
      assert.deepEqual(
        postSnapshot,
        expected,
        "the unreadable-media probe must not create, modify, remove, or re-permission " +
          "any media entry: the arranged tree/content/metadata must be exactly as before, " +
          "with the mount still in its arranged unreadable mode",
      );
    } finally {
      await fixtures.close(); // restores readability (idempotent) before removing the root
    }
  });
});

// ---------------------------------------------------------------------------
// Missing required inputs for the recurring check (RED until T012): failure
// names the safe field name and never its value (quickstart §3.1, data-model
// §1). All other dependencies are healthy so the named failure is exactly the
// missing input.
// ---------------------------------------------------------------------------

describe("missing required inputs contract", () => {
  it("fails naming PGUSER when the PostgreSQL runtime user input is missing", async () => {
    const fixtures = await startFixtures({ ssr: "marker", pg: "responsive", media: "present" });
    try {
      delete fixtures.env.PGUSER;
      const run = runReadinessHelper(fixtures.env, fixtures.fixtureRoot);
      expectNotReady(run, fixtures.env, { field: "PGUSER" });
    } finally {
      await fixtures.close();
    }
  });

  it("fails naming PORT when the application server port input is missing", async () => {
    const fixtures = await startFixtures({ ssr: "marker", pg: "responsive", media: "present" });
    try {
      delete fixtures.env.PORT;
      const run = runReadinessHelper(fixtures.env, fixtures.fixtureRoot);
      expectNotReady(run, fixtures.env, { field: "PORT" });
    } finally {
      await fixtures.close();
    }
  });
});

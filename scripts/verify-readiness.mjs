// T012 — Private, repeatable, on-demand, non-mutating aggregate readiness
// helper (Feature 001, User Story 1).
//
// Authority:
// - specs/001-platform-foundation/tasks.md T012 and T009 (dependency graph
//   T009 -> T012; the readiness helper is the ONLY demonstrated Songhealth
//   extension, per the Scope Guardrails and blueprint §22 extension gate)
// - specs/001-platform-foundation/spec.md FR-003 (private, repeatable, on
//   demand, non-mutating; no public health endpoint), FR-007 (no secret values
//   in readiness/failure output), FR-011 (readiness distinguishes a usable
//   platform from a merely running process; recurring checks stay
//   non-mutating), FR-012 (actionable failures without sensitive disclosure
//   or false readiness), FR-015/FR-016, FR-018, FR-019
// - specs/001-platform-foundation/plan.md "Runtime verification and
//   readiness" (loopback `/` with the expected SSR marker, bounded PostgreSQL
//   connectivity check, expected-media-mount presence/readability, redacted
//   evidence only; not a health API, monitoring framework, service layer, or
//   plugin framework)
// - specs/001-platform-foundation/data-model.md §1 (output may name the
//   missing field or dependency but must not print values), §4 (media
//   recurring check is presence/readability without mutation; no silent
//   empty-directory substitution), §5 (Readiness Result: overall state
//   exactly `ready`/`not-ready`, ISO 8601 timestamp context, safe dependency
//   name on failure)
// - specs/001-platform-foundation/quickstart.md §3.1 (expected result table)
// - docs/website-modernization-docs/current/10-system-blueprint.md §20.1
//   (native runtime configuration contract: HOST/PORT application server,
//   PG* PostgreSQL runtime inputs, stable `./media` mount path)
// - tests/node/foundation.test.ts — the accepted executable T009 contract
//   this helper must satisfy (black-box: child process, curated environment,
//   disposable working directory, loopback fixtures).
//
// Deliberate constraints:
// - Operational verification only. No endpoint, no health API, no monitoring
//   framework, no service/repository layer, no Product logic, no migration
//   status/apply/check gate, and no media write/read/remove probe — those
//   startup-acceptance gates belong to T013.
// - Output is a state token, an ISO 8601 timestamp, and at most a safe
//   field/dependency name. Configured values, URLs, identity components,
//   secrets, response bodies, raw error text, and stack traces are never
//   printed; raw errors are mapped to a generic dependency failure.
// - Every dependency check is individually bounded, and the whole run has an
//   overall wall-clock bound, so a dependency that accepts connections but
//   never responds still produces a deterministic self-terminated not-ready
//   result (T009's bound).
// - Media checking is presence/readability only (stat + readdir): nothing is
//   ever created, written, chmodded, deleted, or replaced, so a missing mount
//   remains missing.

import { readdir, stat } from "node:fs/promises";
import pg from "pg";

// The canonical public SSR verification marker contract (public page content,
// not a secret): the accepted T010/T011 meta element `<meta
// name="songhealth-foundation" content="public-runtime">`, resolved canonical
// for T009/T012 by the Product Owner Human Gate decision (9GOTSTORY-146,
// accepted as c88125a). Identical pattern semantics to T010's browser smoke
// and T009's executable contract: exact element name and content value,
// tolerating only serialization details (whitespace and the optional
// self-closing slash).
const EXPECTED_SSR_MARKER_PATTERN =
  /<meta\s+name="songhealth-foundation"\s+content="public-runtime"\s*\/?>/;

// The stable application media mount path (blueprint §20.1), resolved from
// the current working directory — the application root the helper runs from.
const MEDIA_MOUNT_PATH = "./media";

// Bounded probing. The two dependency probes and the overall run each stay
// far inside T009's deterministic wall-clock bound even in the worst case
// where both probes consume their full timeout sequentially.
const SSR_PROBE_TIMEOUT_MS = 4_000;
const DATABASE_CONNECT_TIMEOUT_MS = 3_500;
const DATABASE_PROBE_TIMEOUT_MS = 4_000;
const OVERALL_BOUND_MS = 8_000;

// The native runtime inputs the recurring checks actually consume (blueprint
// §20.1). Checked first, in a fixed order, so a missing or malformed input
// fails closed naming its safe field name before any dependency is probed.
// The migration URL, public origin, and encryption key are startup-gate
// inputs validated at the configuration boundary (T008), not recurring
// readiness dependencies.
const REQUIRED_INPUTS = [
  "HOST",
  "PORT",
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
];

function isMissingInput(value) {
  return typeof value !== "string" || value.trim() === "";
}

function isTcpPort(value) {
  return /^[0-9]+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535;
}

// The SSR probe is loopback-only by contract (plan: "loopback request to `/`
// ... never the public origin"), so a HOST input that does not designate a
// loopback address fails closed instead of probing some other boundary.
function isLoopbackHost(host) {
  return (
    host === "localhost" ||
    host === "::1" ||
    (/^127(?:\.[0-9]{1,3}){3}$/.test(host) && host.split(".").every((part) => Number(part) <= 255))
  );
}

// --- Runtime dependency: loopback `/` must serve the expected SSR marker ---

async function checkRuntimeDependency() {
  const host = process.env.HOST;
  const hostname = host.includes(":") ? `[${host}]` : host; // bracket IPv6 literals
  try {
    const response = await fetch(`http://${hostname}:${process.env.PORT}/`, {
      redirect: "manual", // never follow away from the loopback origin
      signal: AbortSignal.timeout(SSR_PROBE_TIMEOUT_MS),
    });
    if (response.status !== 200) return false;
    const body = await response.text();
    return EXPECTED_SSR_MARKER_PATTERN.test(body);
  } catch {
    return false; // unreachable or unbounded: fail closed without error text
  }
}

// --- Database dependency: one bounded connection/query through the pinned
// --- native PostgreSQL client inputs.

async function checkDatabaseDependency() {
  const client = new pg.Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    connectionTimeoutMillis: DATABASE_CONNECT_TIMEOUT_MS,
    query_timeout: DATABASE_CONNECT_TIMEOUT_MS,
    statement_timeout: DATABASE_CONNECT_TIMEOUT_MS,
  });
  let watchdog;
  const deadline = new Promise((resolve) => {
    watchdog = setTimeout(() => resolve(false), DATABASE_PROBE_TIMEOUT_MS);
  });
  try {
    const probe = (async () => {
      await client.connect();
      await client.query("select 1");
      return true;
    })();
    // Promise.race also absorbs a late probe rejection after the deadline has
    // won, so the watchdog alone bounds this check.
    return (await Promise.race([probe, deadline])) === true;
  } catch {
    return false; // refused, timed out, or query failed: fail closed
  } finally {
    clearTimeout(watchdog);
    // Never awaited: a wedged socket must not block the result, and the
    // explicit process exit below releases anything the teardown misses.
    client.end().catch(() => {});
  }
}

// --- Media dependency: expected mount presence/readability, no mutation ---

async function checkMediaDependency() {
  try {
    const mountStats = await stat(MEDIA_MOUNT_PATH);
    if (!mountStats.isDirectory()) return false; // the expected mount is a directory
    await readdir(MEDIA_MOUNT_PATH); // proves readability; mutates nothing
    return true;
  } catch {
    return false; // missing or unreadable: fail closed, never create/repair
  }
}

// --- Aggregate evaluation: first failure wins, with safe naming only ---

async function evaluateReadiness() {
  for (const name of REQUIRED_INPUTS) {
    if (isMissingInput(process.env[name])) {
      return { ready: false, detail: `missing required input: ${name}` };
    }
  }
  for (const name of ["PORT", "PGPORT"]) {
    if (!isTcpPort(process.env[name])) {
      return { ready: false, detail: `invalid input: ${name} must be a valid TCP port number` };
    }
  }
  if (!isLoopbackHost(process.env.HOST.trim())) {
    return { ready: false, detail: "invalid input: HOST must designate the loopback application address" };
  }

  if (!(await checkRuntimeDependency())) {
    return { ready: false, detail: "failed dependency: runtime (loopback SSR verification failed)" };
  }
  if (!(await checkDatabaseDependency())) {
    return { ready: false, detail: "failed dependency: database (PostgreSQL connectivity check failed)" };
  }
  if (!(await checkMediaDependency())) {
    return { ready: false, detail: "failed dependency: media (expected media mount missing or unreadable)" };
  }
  return { ready: true, detail: null };
}

// --- Redacted operator evidence and exit status ---
//
// The overall state is exactly the standalone token `ready` or `not-ready`
// (data-model §5): no other standalone state token is ever printed, so the
// evidence can never carry a contradictory readiness claim.

async function main() {
  let watchdog;
  const deadline = new Promise((resolve) => {
    watchdog = setTimeout(() => resolve({ ready: false, detail: "failed dependency: a readiness check exceeded its overall time bound" }), OVERALL_BOUND_MS);
  });
  let result;
  try {
    result = await Promise.race([evaluateReadiness(), deadline]);
  } catch {
    result = { ready: false, detail: "failed dependency: unexpected readiness check failure" };
  } finally {
    clearTimeout(watchdog);
  }

  const lines = [
    `songhealth readiness: ${result.ready ? "ready" : "not-ready"}`,
    `timestamp: ${new Date().toISOString()}`,
  ];
  if (result.detail !== null) {
    lines.push(result.detail);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  process.exit(result.ready ? 0 : 1);
}

// Fail closed on anything that escapes the bounded flow above, with the same
// redacted shape and no error text.
process.on("unhandledRejection", () => {
  process.stdout.write(
    [
      "songhealth readiness: not-ready",
      `timestamp: ${new Date().toISOString()}`,
      "failed dependency: unexpected readiness check failure",
    ].join("\n") + "\n",
  );
  process.exit(1);
});

main();

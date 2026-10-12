#!/usr/bin/env node
// T027 — Restored-foundation integrity comparator (Feature 001, User Story 3).
//
// Authority:
// - specs/001-platform-foundation/tasks.md T027: "Implement the
//   restored-foundation integrity comparator for the native EmDash Site
//   Setting `tagline` exact value/digest established by T015, native
//   migration state, and every designated media path/size/SHA-256 digest in
//   scripts/verify-restored-foundation.mjs; do not substitute Admin identity,
//   passkey metadata, arbitrary internal rows, or a Product collection, and
//   output only redacted pass/fail evidence with zero secret values."
// - tests/operations/verify-recovery.sh (accepted T024) S5: this script is
//   invoked environment-driven as `node scripts/verify-restored-foundation.mjs`
//   with no arguments (same inputs as S3 plus the Recovery Set); its EXIT
//   STATUS is the authority — exit 0 means the exact native tagline
//   value/digest comparison through the intended native retrieval boundary
//   and every designated media path/size/SHA-256 comparison passed (100%
//   recovered, zero unexplained differences); nonzero means wrong, missing,
//   inconsistent, or unverifiable restored state.
// - specs/001-platform-foundation/evidence/T015-us1-canonical-platform.md §5:
//   the canonical database validation evidence — exact UTF-8 value
//   `Songhealth Feature 001 foundation validation`, exactly 44 bytes, no
//   trailing newline, SHA-256 84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e6
//   0a579d827a938a4415 — derived by T015 from the value retrieved through
//   the native platform path.
// - scripts/backup-foundation.sh (accepted T025): the native retrieval/
//   storage boundary this comparator reads — EmDash 1.1.0 stores native site
//   settings as JSON values in the native `options` table under the `site:`
//   prefix with the tagline at name `site:tagline`, observed read-only
//   through `psql -X -w -t -A` (tuples-only, unaligned); no Admin identity,
//   passkey metadata, arbitrary internal row, or Product collection is ever
//   used as the anchor. The Recovery Set manifest (recovery-manifest.json)
//   records the same expected evidence and every designated
//   media.{entries}[].{path,size,sha256}.
// - scripts/restore-foundation.sh (accepted T026): the restore media
//   destination input (SONGHEALTH_RESTORE_MEDIA_MOUNT) is the clean restore
//   media volume's stable application mount path; the restored database is
//   addressed through the restored environment's native PG* inputs and
//   EMDASH_MIGRATION_DATABASE_URL.
// - tests/operations/verify-startup.sh (accepted T013) and the T024 harness
//   S4: the exact-build native migration manifest (.emdash/migrations.json,
//   emitted by `npm run build`) and the native inspection/check boundaries
//   (`npx --no-install emdash migrate --status --json`,
//   `emdash migrate --check`). S4 owns build/status/fingerprint-guarded
//   apply/check sequencing; this comparator only VERIFIES restored migration
//   state and never applies anything.
// - specs/001-platform-foundation/spec.md FR-014/FR-016/FR-019;
//   docs/website-modernization-docs/current/10-system-blueprint.md §§18–20.1
//   (complete integrity-checked recovery, platform-native first, the native
//   runtime configuration contract, secrets outside artifacts and output).
//
// Verified version-sensitive external semantics (Context7 first where
// supported, per AGENTS.md; record dated 2026-10-12):
// - EmDash 1.1.0 (the package.json pin): verified from the pinned package
//   source — npm registry tarball emdash-1.1.0.tgz, SHA-512
//   integrity-matched byte-for-byte against package-lock.json — NOT from
//   model memory:
//     * site settings are rows of the native `options` table; values are
//       JSON-encoded strings read as
//       `selectFrom("options").select("value").where("name","=","site:tagline")`
//       then `JSON.parse(row.value)` (dist/runner-CskI4Hmq.mjs loadSiteTimezone
//       pattern; dist/settings-WHr45II1.mjs PORTABLE_SETTING_NAMES lists
//       `site:tagline`);
//     * `emdash migrate --status --json` writes JSON.stringify(report) to
//       STDOUT where report = { target: { kind, label, fingerprint, … },
//       knownApplied: [], pending: [], unknownApplied: [], executed: [] }
//       (dist/cli/index.mjs, dist/direct-executor-DMWwCey3.mjs createReport);
//       the human "Migration target:" lines go to STDERR;
//     * the native postgres migration target label is exactly
//       `${host}:${port}/${database}` derived from
//       `new URL(EMDASH_MIGRATION_DATABASE_URL)` with port defaulting to
//       "5432" (dist/db/postgres-migrations.mjs parseTargetIdentity);
//     * `emdash migrate --check` exits 3 when unknownApplied > 0, 2 when
//       pending > 0, and 0 otherwise; `--status` exits 0 on a successful
//       inspection regardless of pending/unknown (MIGRATE_EXIT_CODES,
//       reportExitCode); the default manifest path is
//       `<projectRoot>/.emdash/migrations.json` (loadManifest).
//   Consistent with the Context7 /emdash-cms/emdash record (site:tagline is
//   a portable site setting).
// - PostgreSQL 18 `psql` (Context7 /websites/postgresql_18, app-psql):
//   `-t/--tuples-only` prints rows only and `-A/--no-align` selects unaligned
//   output, so a single-value SELECT prints the value followed by exactly one
//   newline; `-X` skips psqlrc and `-w` never prompts (accepted T024/T025/
//   T026 use the same flags).
// - Node.js 24 `child_process.spawn` (Context7
//   /websites/nodejs_latest-v24_x_api): options `timeout` (ms) sends
//   `killSignal` (default "SIGTERM") to the child when exceeded; the 'exit'
//   event then carries `code === null` and the terminating `signal`. Node
//   fs Dirent/lstat semantics do not follow symlinks, giving the per-entry
//   alias-ambiguity defense below.
//
// Inputs come from the environment (never committed; never arguments):
//
//   SONGHEALTH_RECOVERY_DIR        Recovery Set directory (absolute,
//                                  existing, readable): recovery-manifest.json
//                                  (the T025 output contract) associates the
//                                  expected tagline evidence and every
//                                  designated media entry with one known
//                                  validation state.
//   PGHOST/PGPORT/PGDATABASE/PGUSER
//                                  the RESTORE target's identity (non-secret
//                                  components; the restored environment's own
//                                  native runtime inputs). PGPASSWORD travels
//                                  only through the protected native libpq
//                                  connection mechanism; an unusable
//                                  credential surfaces as a bounded, redacted
//                                  read failure.
//   EMDASH_MIGRATION_DATABASE_URL  the restored environment's migration
//                                  connection; must identify the same intended
//                                  database as PG* (compared by non-secret
//                                  identity components only, host
//                                  case-insensitively, exactly like the
//                                  accepted T008/T013/T024/T026 boundary).
//   SONGHEALTH_RESTORE_MEDIA_MOUNT absolute path of the restore media
//                                  volume's stable application mount path
//                                  holding the restored designated media.
//
// What this comparator verifies (each stage fails closed and stops the run):
//
//   S1   invocation contract (no arguments), tool prerequisites (psql, npx),
//        required inputs present and well-formed, and PG*/migration-URL
//        identity agreement — before any restored state is read.
//   S2   Recovery Set manifest load: present, readable, valid JSON, one
//        nonempty recovery-set identifier, a nonempty well-formed designated
//        media entry set (relative traversal-free paths, integer sizes,
//        SHA-256 values, no duplicates), and recorded expected tagline
//        evidence equal to the canonical T015 anchor — a self-consistent
//        manifest that substitutes a different canonical anchor, or one that
//        silently reduces the designated set below what the restored media
//        actually contains, is rejected (the S6 file-set equality proof
//        catches a reduced set).
//   S3   the exact-build native migration manifest (.emdash/migrations.json)
//        identity: schemaVersion, emdashVersion == the package.json pin,
//        nonempty ordered migration set with SHA-256 set fingerprint, native
//        postgres adapter, migration connection variable NAME only, and
//        secret-freeness. The comparator never builds; S4 of the T024
//        harness owns the build, so an absent manifest is a failure, never a
//        build trigger.
//   S4   native migration state of the restored target through the native
//        inspection/check boundaries only: `emdash migrate --status --json`
//        must succeed, report a postgres target whose label equals the
//        agreed restore identity (host:port/database) with a well-formed
//        fingerprint, zero pending and zero unknown migrations, and an
//        applied set equal to the exact-build manifest's migration set; then
//        `emdash migrate --check` must exit 0. Pending, unknown,
//        inconsistent, malformed, or unavailable state fails closed. This
//        comparator never applies migrations and introduces no migration
//        runner or framework.
//   S5   the observed native EmDash Site Setting `tagline`, read through the
//        native options/site:tagline JSON storage boundary (read-only psql
//        SELECT; no direct SQL writes anywhere), compared byte-exactly with
//        the canonical T015 evidence: exact UTF-8 value, exactly 44 bytes, no
//        trailing newline, SHA-256 84753035…a4415. An absent, non-string,
//        multi-row, undecodable, or non-canonical observation fails closed;
//        the observed value itself is never printed.
//   S6   every designated restored media entry through the restore media
//        mount: each designated path must resolve to a regular file (no
//        symlink or special-object aliasing anywhere on its path) whose size
//        and SHA-256 equal the recorded evidence, and the mount's regular
//        file set must equal the designated entry set exactly — 100%
//        designated recovery with zero unexplained integrity differences.
//        Missing, unreadable, symlinked, size-mismatched, or digest-
//        mismatched files, and any extra unexplained file, fail closed.
//
// Non-mutation: this comparator is small, private, on demand, and read-only.
// It never writes to the database or media, never invokes backup or restore,
// never applies native migrations, never contacts a public endpoint, never
// creates a content model or infrastructure, and creates no scratch files —
// all subprocess output is captured in memory.
//
// Secret safety: no secret value, credential-bearing URL, raw manifest/
// setting/error payload, or unsanitized subprocess diagnostic is ever
// published. Redaction is structural (mirroring the accepted T024/T025/T026
// sources): every published line — status, evidence, and failure — flows
// through scrub(), which replaces every nonempty supplied secret value
// (PGPASSWORD, EMDASH_MIGRATION_DATABASE_URL, EMDASH_ENCRYPTION_KEY), the
// full migration URL, and the migration credential's standalone
// (percent-encoded and decoded) representations with [REDACTED], longest
// first; JSON readers report parser failures with FIXED messages (the
// default SyntaxError would echo an excerpt of the raw input); captured
// subprocess stderr is published only as a bounded scrubbed tail; errors name
// the failing field/resource/check only; invalid invocations never echo
// argument values; every published line is length-capped. Bounded waits
// (spawn timeout + SIGTERM) keep every external read finite: 45 s for psql
// and 75 s per emdash invocation — comfortably inside the accepted T024 S5
// comparator bound of 300 s.
//
// Exit codes: 0 PASS | 1 FAIL (any stage) | 2 environment error (missing
// tools) | 4 missing or invalid input | 64 usage error.

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXIT_FAIL = 1;
const EXIT_ENV = 2;
const EXIT_CONFIG = 4;
const EXIT_USAGE = 64;

// Bounded waits so no external read can hang (the T024 S5 harness bounds the
// whole comparator at 300 s; the worst-case sum here is 45 + 75 + 75 s).
const PSQL_TIMEOUT_MS = 45_000;
const EMDASH_TIMEOUT_MS = 75_000;
const GIT_TIMEOUT_MS = 10_000;

// Canonical T015 database validation evidence (T015 §5; identical anchors to
// the accepted T016/T024/T025/T026 sources): the exact native EmDash Site
// Setting tagline value, its UTF-8 byte length, and its SHA-256 digest. These
// are non-secret validation anchors, safe to print.
const TAGLINE_EXPECTED = "Songhealth Feature 001 foundation validation";
const TAGLINE_EXPECTED_SHA256 =
  "84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415";
const TAGLINE_EXPECTED_BYTES = 44;

// The native EmDash 1.1.0 site-settings storage the observation reads
// (verified from the pinned package source; identical read-only query to the
// accepted T025 backup): a single JSON-encoded value row. Never a write.
const TAGLINE_QUERY = "SELECT value FROM options WHERE name = 'site:tagline'";

// Migration connection variable NAME the native manifest must record
// (identical to the accepted T013/T024 gate).
const EXPECTED_MIGRATION_ENV_NAME = "EMDASH_MIGRATION_DATABASE_URL";

// Recovery Set manifest file name (T025 output contract).
const RECOVERY_MANIFEST_NAME = "recovery-manifest.json";

// The exact-build native migration manifest emitted by `npm run build`
// (T024 S4 owns the build; this comparator only consumes it).
const EMDASH_MANIFEST_REL_PATH = ".emdash/migrations.json";

// Environment inputs this comparator consumes (the T024 S5 contract: the S3
// inputs plus the Recovery Set). SONGHEALTH_SOURCE_* inputs are owned by the
// S1 source-protection checks of the harness/restore authority and are not
// consumed here.
const REQUIRED_INPUTS = [
  "SONGHEALTH_RECOVERY_DIR",
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "EMDASH_MIGRATION_DATABASE_URL",
  "SONGHEALTH_RESTORE_MEDIA_MOUNT",
];

// External tools invoked (node itself is the running runtime).
const REQUIRED_TOOLS = ["psql", "npx"];

// Application root (this script's scripts/ directory's parent) — the root the
// exact-build manifest and package.json pin are read from, and the cwd the
// emdash CLI is invoked from so it resolves its default manifest path.
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Bounded output: every published line is capped after redaction, and every
// captured subprocess stream is capped at capture time.
const MAX_PUBLISHED_LINE_LENGTH = 2_000;
const MAX_CAPTURE_BYTES = 64 * 1024;
const CAPTURE_TRUNCATION_NOTE = "\n…[capture truncated]";
const TAIL_LINES = 5;

// ---------------------------------------------------------------------------
// Structural redaction — every published line flows through here
// ---------------------------------------------------------------------------

function secretValues() {
  // Every nonempty supplied secret value regardless of length, the full
  // migration URL, and the migration credential's STANDALONE representations
  // (percent-encoded and decoded), so a diagnostic printing only the
  // credential is redacted too. Longer values first so a value containing
  // another cannot shield a shorter one from replacement. Read from the
  // environment here, never from a command line or argument.
  const values = ["PGPASSWORD", "EMDASH_MIGRATION_DATABASE_URL", "EMDASH_ENCRYPTION_KEY"]
    .map((name) => process.env[name])
    .filter((value) => typeof value === "string" && value.length >= 1);
  const url = process.env.EMDASH_MIGRATION_DATABASE_URL;
  if (typeof url === "string" && url.length >= 1) {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        values.push(parsed.password);
        try {
          values.push(decodeURIComponent(parsed.password));
        } catch {
          // Undecodable percent-encoding: the encoded form is still redacted.
        }
      }
    } catch {
      // Not a URL: the raw value is already in the redaction set.
    }
  }
  return values.sort((a, b) => b.length - a.length);
}

function scrub(text) {
  let data = String(text);
  for (const value of secretValues()) data = data.replaceAll(value, "[REDACTED]");
  if (data.length > MAX_PUBLISHED_LINE_LENGTH) {
    data = data.slice(0, MAX_PUBLISHED_LINE_LENGTH) + "…[truncated]";
  }
  return data;
}

function publishOut(line) {
  fs.writeSync(1, scrub(line) + "\n");
}

function publishErr(line) {
  fs.writeSync(2, scrub(line) + "\n");
}

const step = (name, status, message) => publishOut(`t027: [${name}] ${status} ${message}`);
const pass = (name, message) => step(name, "PASS", message);
const info = (name, message) => step(name, "INFO", message);

function failStage(name, message) {
  publishErr(`t027: [${name}] FAIL ${message}`);
  process.exit(EXIT_FAIL);
}

function failInput(name, message) {
  publishErr(`t027: [${name}] FAIL ${message}`);
  process.exit(EXIT_CONFIG);
}

function dieEnv(message) {
  publishErr(`t027: ${message}`);
  process.exit(EXIT_ENV);
}

// A bounded, scrubbed tail of captured subprocess diagnostics — the only way
// captured tool output is ever published.
function publishTail(label, captured) {
  if (typeof captured === "string" && captured.length > 0) {
    const lines = captured.split("\n");
    publishErr(`t027: ${label} (last ${Math.min(lines.length, TAIL_LINES)} line(s), secret-scrubbed):`);
    for (const line of lines.slice(-TAIL_LINES)) {
      if (line !== "") publishErr(line);
    }
  } else {
    publishErr(`t027: ${label}: (no captured output)`);
  }
}

function usage(fd) {
  const text = [
    "Usage: node scripts/verify-restored-foundation.mjs",
    "",
    "T027 restored-foundation integrity comparator: verify the restored state",
    "against the canonical T015 evidence and the Recovery Set manifest — the",
    "observed native EmDash Site Setting tagline exact value/digest through",
    "the native options/site:tagline storage boundary (read-only psql SELECT),",
    "the native migration state of the restored target through the exact-build",
    "manifest and native inspection/check boundaries (status --json + --check;",
    "never an apply), and every designated media path/size/SHA-256 through the",
    "restore media mount (100% designated recovery, zero unexplained",
    "differences, no aliasing).",
    "",
    "Exit 0 only for verified complete integrity; any missing, modified,",
    "inconsistent, or unverifiable state fails closed nonzero. Output is",
    "bounded, redacted PASS/FAIL evidence only: no secret value,",
    "credential-bearing URL, raw manifest/setting/error payload, or",
    "unsanitized subprocess diagnostic is ever printed.",
    "",
    "Provide the inputs in the environment (see the script header):",
    "SONGHEALTH_RECOVERY_DIR, the restored target's PGHOST/PGPORT/PGDATABASE/",
    "PGUSER and EMDASH_MIGRATION_DATABASE_URL (same intended database,",
    "compared by non-secret identity components only), and",
    "SONGHEALTH_RESTORE_MEDIA_MOUNT. The exact-build manifest",
    ".emdash/migrations.json must exist (the T024 S4 gate builds it; this",
    "comparator never builds).",
    "",
    "This comparator is non-mutating: no database/media writes, no backup or",
    "restore operation, no migration apply, no public endpoint, no new content",
    "model or infrastructure. Exit 0 verifies restored-state integrity only —",
    "runtime recovery acceptance stays with the T022/T028 gates and the",
    "separate runtime-secret recovery.",
    "",
    "Exit codes: 0 PASS | 1 FAIL | 2 environment error | 4 missing/invalid",
    "input | 64 usage error.",
  ].join("\n");
  fs.writeSync(fd, text + "\n");
}

// ---------------------------------------------------------------------------
// Bounded subprocess execution (capture in memory; no scratch files)
// ---------------------------------------------------------------------------

function findOnPath(tool, envPath) {
  // Resolve the executable deterministically against the child PATH instead
  // of relying on spawn's own lookup semantics.
  for (const dir of String(envPath || "").split(":")) {
    if (dir === "") continue;
    const candidate = path.join(dir, tool);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Not executable here: keep scanning.
    }
  }
  return null;
}

function runBounded(executable, args, timeoutMs, cwd) {
  // Resolves { code, signal, stdout, stderr }; a spawn failure or a timeout
  // kill resolves as a failed run with a FIXED reason (never a thrown error
  // carrying the raw cause into output).
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(executable, args, {
        cwd,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: timeoutMs,
        killSignal: "SIGTERM",
      });
    } catch {
      resolve({ ok: false, reason: "spawn", code: null, signal: null, stdout: "", stderr: "" });
      return;
    }
    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (stdout.length < MAX_CAPTURE_BYTES) stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < MAX_CAPTURE_BYTES) stderr += chunk;
    });
    child.on("error", () => {
      resolve({ ok: false, reason: "spawn", code: null, signal: null, stdout: "", stderr: "" });
    });
    child.on("close", (code, signal) => {
      settle({
        ok: typeof code === "number" && code === 0,
        reason: code === null && signal ? "timeout-or-signal" : "exit",
        code,
        signal,
        stdout: stdout + (stdout.length >= MAX_CAPTURE_BYTES ? CAPTURE_TRUNCATION_NOTE : ""),
        stderr: stderr + (stderr.length >= MAX_CAPTURE_BYTES ? CAPTURE_TRUNCATION_NOTE : ""),
      });
    });
  });
}

const sha256Hex = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

// ---------------------------------------------------------------------------
// S1 — invocation contract, tools, inputs, identity agreement
// ---------------------------------------------------------------------------

function checkInvocation() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) return;
  if (argv.length === 1 && ["-h", "--help", "help"].includes(argv[0])) {
    usage(1);
    process.exit(0);
  }
  // Argument VALUES are never echoed: an accidentally supplied secret on the
  // command line must not be reflected in the usage error.
  usage(2);
  publishErr("t027: unexpected argument(s) were provided (this comparator takes no arguments); argument values are not echoed");
  process.exit(EXIT_USAGE);
}

function resolveTools() {
  const resolved = new Map();
  const missing = [];
  for (const tool of REQUIRED_TOOLS) {
    const executable = findOnPath(tool, process.env.PATH);
    if (executable === null) missing.push(tool);
    else resolved.set(tool, executable);
  }
  if (missing.length > 0) {
    dieEnv(`required tool(s) not on PATH: ${missing.join(" ")}`);
  }
  return resolved;
}

// The non-secret identity components of EMDASH_MIGRATION_DATABASE_URL
// (host, port, database, user), parsed here from the environment — the URL
// itself, including its password, never reaches a command line or output.
// Mirrors the accepted T013/T024/T026 boundary: postgres or postgresql
// scheme, port defaulting to 5432, no percent-decoding.
function migrationUrlIdentity() {
  let parsed;
  try {
    parsed = new URL(process.env.EMDASH_MIGRATION_DATABASE_URL);
  } catch {
    return { error: "EMDASH_MIGRATION_DATABASE_URL is not a valid URL" };
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return { error: "EMDASH_MIGRATION_DATABASE_URL must use the postgres:// or postgresql:// scheme" };
  }
  const database = parsed.pathname.slice(1);
  if (!parsed.hostname || !database) {
    return { error: "EMDASH_MIGRATION_DATABASE_URL must identify a host and a database" };
  }
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    database,
    user: parsed.username,
  };
}

function checkInputs() {
  const missing = REQUIRED_INPUTS.filter(
    (name) => typeof process.env[name] !== "string" || process.env[name] === "",
  );
  if (missing.length > 0) {
    publishErr(`t027: [S1] FAIL missing required input(s): ${missing.join(" ")}`);
    publishErr("t027: [S1] provide the documented inputs in the environment (see the script header); the credential travels through the protected native connection mechanism, never as a script input value");
    process.exit(EXIT_CONFIG);
  }

  for (const name of ["SONGHEALTH_RECOVERY_DIR", "SONGHEALTH_RESTORE_MEDIA_MOUNT"]) {
    if (!process.env[name].startsWith("/")) {
      failInput("S1", `${name} must be an absolute path`);
    }
  }
  if (!/^[0-9]+$/.test(process.env.PGPORT) || Number(process.env.PGPORT) < 1 || Number(process.env.PGPORT) > 65535) {
    failInput("S1", "PGPORT is not a valid TCP port number in the range 1-65535");
  }

  const recoveryStat = fs.statSync(process.env.SONGHEALTH_RECOVERY_DIR, { throwIfNoEntry: false });
  if (!recoveryStat || !recoveryStat.isDirectory()) {
    failInput("S1", "SONGHEALTH_RECOVERY_DIR is not an existing directory");
  }
  try {
    fs.accessSync(process.env.SONGHEALTH_RECOVERY_DIR, fs.constants.R_OK | fs.constants.X_OK);
  } catch {
    failInput("S1", "SONGHEALTH_RECOVERY_DIR is not readable/traversable");
  }

  // PG* / migration-URL identity agreement: non-secret components only, host
  // case-insensitively (the WHATWG URL parse lowercases the hostname), port/
  // database/user compared exactly — the accepted T008/T013 boundary.
  const identity = migrationUrlIdentity();
  if (identity.error) {
    failInput("S1", `${identity.error} (malformed migration connection input)`);
  }
  const mismatches = [];
  if (identity.host !== process.env.PGHOST.toLowerCase()) {
    mismatches.push("host (PGHOST vs EMDASH_MIGRATION_DATABASE_URL)");
  }
  if (identity.port !== process.env.PGPORT) {
    mismatches.push("port (PGPORT vs EMDASH_MIGRATION_DATABASE_URL)");
  }
  if (identity.database !== process.env.PGDATABASE) {
    mismatches.push("database (PGDATABASE vs EMDASH_MIGRATION_DATABASE_URL)");
  }
  if (identity.user !== process.env.PGUSER) {
    mismatches.push("user (PGUSER vs EMDASH_MIGRATION_DATABASE_URL)");
  }
  if (mismatches.length > 0) {
    failInput(
      "S1",
      `the restored target PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL do not identify the same intended database; mismatching: ${mismatches.join(" ")}`,
    );
  }

  info(
    "S1",
    `restore-target identity agreement: host=${identity.host} port=${identity.port} database=${identity.database} user=${identity.user} (non-secret components only; password and full URL never printed)`,
  );
  pass("S1", "fail-closed input validation passed before any restored state was read");
  return identity;
}

// ---------------------------------------------------------------------------
// S2 — Recovery Set manifest (association, designated entries, T015 anchor)
// ---------------------------------------------------------------------------

function isSafeRelativeEntryPath(value) {
  return (
    typeof value === "string" &&
    value !== "" &&
    value !== "." &&
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !/[\x00-\x1f\x7f]/.test(value) &&
    !value.split("/").some((component) => component === "" || component === "." || component === "..")
  );
}

const isSha256Hex = (value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

function loadRecoveryManifest() {
  const manifestPath = path.join(process.env.SONGHEALTH_RECOVERY_DIR, RECOVERY_MANIFEST_NAME);
  const stat = fs.statSync(manifestPath, { throwIfNoEntry: false });
  if (!stat) {
    failStage("S2", `the Recovery Set manifest ${RECOVERY_MANIFEST_NAME} is absent from the Recovery Set directory; without the common association evidence the restored state cannot be compared`);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    failStage("S2", "the Recovery Set manifest is not a regular file");
  }
  let text;
  try {
    text = fs.readFileSync(manifestPath, "utf8");
  } catch {
    failStage("S2", "the Recovery Set manifest is present but unreadable");
  }
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    // FIXED message: the default SyntaxError would echo an excerpt of the
    // raw manifest.
    failStage("S2", "the Recovery Set manifest is not valid JSON");
  }
  if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
    failStage("S2", "the Recovery Set manifest is not a JSON object");
  }

  // One nonempty association identifier for the known validation state.
  if (typeof manifest.recoverySetId !== "string" || manifest.recoverySetId === "" || /[\x00-\x1f\x7f]/.test(manifest.recoverySetId)) {
    failStage("S2", "the manifest has no usable recovery-set identifier; the restored state cannot be associated with one known validation state");
  }

  // The designated media entry set: nonempty, well-formed, unambiguous.
  const entries = manifest.media?.entries;
  if (!Array.isArray(entries) || entries.length < 1) {
    failStage("S2", "the manifest records no designated media evidence; a recovery set for the known validation state designates at least one media item");
  }
  const seen = new Set();
  for (const entry of entries) {
    const shapeOk =
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      isSafeRelativeEntryPath(entry.path) &&
      Number.isInteger(entry.size) &&
      entry.size >= 0 &&
      isSha256Hex(entry.sha256);
    if (!shapeOk) {
      failStage("S2", "a designated media evidence entry is malformed (relative traversal-free path, integer size, and SHA-256 required)");
    }
    if (seen.has(entry.path)) {
      failStage("S2", "the manifest designates a duplicate media entry path; ambiguous evidence is rejected");
    }
    seen.add(entry.path);
  }

  // The recorded expected tagline evidence must equal the canonical T015
  // anchor, so no substituted anchor can drive this comparison even when the
  // manifest is internally self-consistent.
  const expected = manifest.expected ?? {};
  const value = typeof expected.taglineValue === "string" ? expected.taglineValue : "";
  if (value !== TAGLINE_EXPECTED || expected.taglineSha256 !== TAGLINE_EXPECTED_SHA256) {
    failStage("S2", "the recorded expected tagline evidence does not match the canonical T015 evidence (exact value and SHA-256 required; no substituted anchor is acceptable)");
  }
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes !== TAGLINE_EXPECTED_BYTES || value.endsWith("\n")) {
    failStage("S2", `the recorded expected tagline is not the canonical ${TAGLINE_EXPECTED_BYTES}-byte UTF-8 value without a trailing newline`);
  }

  info("S2", `recovery-set association identifier present; ${entries.length} designated media entries well-formed; expected tagline evidence equals the canonical T015 value: ${TAGLINE_EXPECTED_BYTES} bytes, no trailing newline, sha256 ${TAGLINE_EXPECTED_SHA256}`);
  pass("S2", "Recovery Set manifest validated: one association identifier, an unambiguous designated media set, and the canonical T015 tagline anchor");
  return entries;
}

// ---------------------------------------------------------------------------
// S3 — exact-build native migration manifest identity
// ---------------------------------------------------------------------------

function loadExactBuildManifest() {
  const manifestPath = path.join(APP_ROOT, EMDASH_MANIFEST_REL_PATH);
  const stat = fs.statSync(manifestPath, { throwIfNoEntry: false });
  if (!stat || !stat.isFile()) {
    failStage("S3", `the exact-build native migration manifest ${EMDASH_MANIFEST_REL_PATH} is absent; the exact application build (owned by the T024 S4 gate) must emit it before restored-state comparison — this comparator never builds`);
  }
  let text;
  try {
    text = fs.readFileSync(manifestPath, "utf8");
  } catch {
    failStage("S3", "the exact-build migration manifest is present but unreadable");
  }
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    failStage("S3", "the exact-build migration manifest is not valid JSON");
  }

  // package.json is the manifest authority for the pinned EmDash version.
  let pinned;
  try {
    pinned = JSON.parse(fs.readFileSync(path.join(APP_ROOT, "package.json"), "utf8")).dependencies?.emdash;
  } catch {
    pinned = undefined;
  }
  if (typeof pinned !== "string" || pinned === "") {
    failStage("S3", "could not read the pinned emdash dependency version from package.json");
  }

  const names = manifest.migrationSet?.names;
  if (manifest.schemaVersion !== 1) {
    failStage("S3", `unexpected exact-build manifest schemaVersion ${JSON.stringify(manifest.schemaVersion ?? null)}`);
  }
  if (manifest.emdashVersion !== pinned) {
    failStage("S3", `exact-build manifest emdashVersion ${JSON.stringify(manifest.emdashVersion ?? "")} does not match the pinned dependency ${pinned}`);
  }
  if (!Array.isArray(names) || names.length < 1 || !names.every((name) => typeof name === "string" && name !== "")) {
    failStage("S3", "the exact-build manifest migration set is empty, missing, or malformed");
  }
  if (new Set(names).size !== names.length) {
    failStage("S3", "the exact-build manifest migration set contains duplicate names; malformed evidence is rejected");
  }
  if (!isSha256Hex(manifest.migrationSet?.fingerprint)) {
    failStage("S3", "the exact-build manifest migration-set fingerprint is missing or not a SHA-256 value");
  }
  if (manifest.database?.type !== "postgres") {
    failStage("S3", `exact-build manifest database type ${JSON.stringify(manifest.database?.type ?? "")} is not the native postgres adapter`);
  }
  if (manifest.database?.executorConfig?.connectionStringEnv !== EXPECTED_MIGRATION_ENV_NAME) {
    failStage("S3", `exact-build manifest migration connection variable is ${JSON.stringify(manifest.database?.executorConfig?.connectionStringEnv ?? "")}, expected the NAME ${EXPECTED_MIGRATION_ENV_NAME}`);
  }
  // Secret-freeness of the native manifest (the accepted T013/T024 scans).
  if (/:\/\//.test(text)) {
    failStage("S3", "the exact-build manifest contains a URL-like string; the native manifest must be secret-free");
  }
  const secretKeys = [...text.matchAll(/"([A-Za-z]*(?:password|secret|token|credential)[A-Za-z]*)"/gi)].map((match) => match[1]);
  if (secretKeys.length > 0) {
    failStage("S3", `the exact-build manifest contains secret-looking key(s): ${secretKeys.join(",")}`);
  }

  info("S3", `exact-build manifest: emdash ${manifest.emdashVersion}, ${names.length} migrations, migration-set fingerprint ${manifest.migrationSet.fingerprint}, native postgres adapter, connection variable NAME ${EXPECTED_MIGRATION_ENV_NAME} (secret-free)`);
  pass("S3", "exact-build native migration manifest identity verified (read-only; the build itself belongs to the T024 S4 gate)");
  return { names: [...names].sort() };
}

// ---------------------------------------------------------------------------
// S4 — native migration state of the restored target (inspect + check only)
// ---------------------------------------------------------------------------

function parseJsonReport(stage, label, text) {
  // FIXED messages on parse failures: the default SyntaxError would echo an
  // excerpt of the raw report.
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    failStage(stage, `the native ${label} is not valid JSON`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    failStage(stage, `the native ${label} is not a JSON object`);
  }
  return parsed;
}

async function checkMigrationState(tools, agreedIdentity, exactBuildNames) {
  // Native inspection (no mutation). The emdash CLI resolves its default
  // manifest from the project root, so it runs with cwd = APP_ROOT.
  const status = await runBounded(
    tools.get("npx"),
    ["--no-install", "emdash", "migrate", "--status", "--json"],
    EMDASH_TIMEOUT_MS,
    APP_ROOT,
  );
  if (!status.ok) {
    publishTail("emdash migrate --status diagnostics", status.stderr);
    if (status.reason === "timeout-or-signal") {
      failStage("S4", "native emdash migrate --status did not finish within its time bound against the restored target");
    }
    failStage("S4", `native emdash migrate --status failed against the restored target (exit ${status.code})`);
  }
  const report = parseJsonReport("S4", "status report", status.stdout);
  const target = report.target ?? {};
  const knownApplied = Array.isArray(report.knownApplied) ? report.knownApplied : null;
  const pending = Array.isArray(report.pending) ? report.pending : null;
  const unknownApplied = Array.isArray(report.unknownApplied) ? report.unknownApplied : null;
  if (!knownApplied || !pending || !unknownApplied || !knownApplied.every((n) => typeof n === "string")) {
    failStage("S4", "the native status report is not the expected JSON shape");
  }

  if (target.kind !== "postgres") {
    failStage("S4", `inspected restored migration target kind is ${JSON.stringify(String(target.kind ?? ""))}, expected postgres`);
  }
  if (!isSha256Hex(target.fingerprint)) {
    failStage("S4", "the inspected restored-target fingerprint is missing or not a SHA-256 value");
  }
  // The native postgres target label is host:port/database derived from the
  // migration connection URL's identity (verified from the pinned package
  // source); it must agree with the S1 identity, so the inspected target is
  // the restored database and not some other target.
  const expectedLabel = `${agreedIdentity.host}:${agreedIdentity.port}/${agreedIdentity.database}`;
  if (target.label !== expectedLabel) {
    failStage("S4", `inspected target label ${JSON.stringify(String(target.label ?? ""))} does not match the restored target identity ${expectedLabel}`);
  }
  if (pending.length > 0) {
    failStage("S4", `the restored target reports ${pending.length} pending migration(s); pending state blocks restored-integrity verification`);
  }
  if (unknownApplied.length > 0) {
    failStage("S4", `the restored target reports ${unknownApplied.length} unknown applied migration(s); unknown state blocks restored-integrity verification`);
  }
  // The applied set must equal the exact-build migration set exactly: fully
  // applied against this build, with nothing else known-applied.
  const appliedSorted = [...knownApplied].sort();
  const sameSet =
    appliedSorted.length === exactBuildNames.length &&
    appliedSorted.every((name, index) => name === exactBuildNames[index]);
  if (!sameSet) {
    failStage("S4", `the restored target's applied migration set does not equal the exact-build manifest's migration set (applied ${appliedSorted.length} of ${exactBuildNames.length}); inconsistent migration state blocks verification`);
  }
  info("S4", `restored target inspected: ${target.kind} ${target.label}`);
  info("S4", `restored-target fingerprint (sha256 of the non-secret target identity): ${target.fingerprint}`);
  info("S4", `migration state: applied=${knownApplied.length} pending=${pending.length} unknown=${unknownApplied.length}`);

  // Native check boundary (applies nothing): exit 0 required.
  const check = await runBounded(
    tools.get("npx"),
    ["--no-install", "emdash", "migrate", "--check"],
    EMDASH_TIMEOUT_MS,
    APP_ROOT,
  );
  if (!check.ok) {
    publishTail("emdash migrate --check diagnostics", check.stderr);
    if (check.reason === "timeout-or-signal") {
      failStage("S4", "native emdash migrate --check did not finish within its time bound against the restored target");
    }
    failStage("S4", `emdash migrate --check failed (exit ${check.code}: pending or unknown migrations remain against the restored target, or an error occurred)`);
  }
  info("S4", "emdash migrate --check: no pending and no unknown migrations against the restored target (exit 0; applies nothing)");
  pass("S4", "native migration state of the restored target verified read-only: postgres target identity agreement, zero pending, zero unknown, applied set equals the exact-build set, native --check exit 0");
}

// ---------------------------------------------------------------------------
// S5 — observed native Site Setting tagline (options/site:tagline, read-only)
// ---------------------------------------------------------------------------

async function checkObservedTagline(tools) {
  const observation = await runBounded(
    tools.get("psql"),
    ["-X", "-w", "-t", "-A", "-c", TAGLINE_QUERY],
    PSQL_TIMEOUT_MS,
    APP_ROOT,
  );
  if (!observation.ok) {
    publishTail("psql tagline query diagnostics", observation.stderr);
    if (observation.reason === "timeout-or-signal") {
      failStage("S5", "the native Site Setting tagline read did not finish within its time bound");
    }
    failStage("S5", "the native Site Setting tagline could not be read from the restored database (unreachable, authentication refused, or the native options storage is absent)");
  }
  let text = observation.stdout;
  if (text === "") {
    failStage("S5", "the native Site Setting tagline is absent from the restored database; the canonical T015 known validation state is not present");
  }
  // psql -t -A appends exactly one trailing newline; strip exactly one, and
  // refuse anything that still contains a line break (multiple rows).
  if (text.endsWith("\n")) text = text.slice(0, -1);
  if (text.includes("\n") || text.includes("\r")) {
    failStage("S5", "the native Site Setting tagline reading is not a single value; ambiguous storage is rejected");
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    failStage("S5", "the stored tagline setting is not decodable native storage");
  }
  if (typeof value !== "string") {
    failStage("S5", "the stored tagline setting is not a string value");
  }
  const buffer = Buffer.from(value, "utf8");
  const sha = sha256Hex(buffer);
  const valueMatches = value === TAGLINE_EXPECTED;
  const shaMatches = sha === TAGLINE_EXPECTED_SHA256;
  const bytesMatch = buffer.length === TAGLINE_EXPECTED_BYTES;
  const trailingNewline = value.endsWith("\n");
  if (!valueMatches || !shaMatches) {
    failStage("S5", "the observed native Site Setting tagline does not match the canonical T015 evidence (exact value and SHA-256 required; the observed value is never printed)");
  }
  if (!bytesMatch || trailingNewline) {
    failStage("S5", `the observed native Site Setting tagline is not the canonical ${TAGLINE_EXPECTED_BYTES}-byte UTF-8 value without a trailing newline`);
  }
  info("S5", `observed native site:tagline equals the canonical T015 evidence: ${TAGLINE_EXPECTED_BYTES} bytes, no trailing newline, sha256 ${TAGLINE_EXPECTED_SHA256}`);
  pass("S5", "observed native EmDash Site Setting tagline verified byte-exactly through the native options/site:tagline storage boundary (read-only; no substituted anchor)");
}

// ---------------------------------------------------------------------------
// S6 — designated restored media through the restore media mount
// ---------------------------------------------------------------------------

function checkRestoredMedia(designatedEntries) {
  const mountInput = process.env.SONGHEALTH_RESTORE_MEDIA_MOUNT.replace(/\/+$/, "");
  const mountStat = fs.lstatSync(mountInput, { throwIfNoEntry: false });
  if (!mountStat) {
    failStage("S6", "the restore media mount is absent: the restored designated media cannot be verified");
  }
  if (mountStat.isSymbolicLink()) {
    failStage("S6", "the restore media mount is a symlink; alias ambiguity is rejected and never followed");
  }
  if (!mountStat.isDirectory()) {
    failStage("S6", "the restore media mount exists but is not a directory");
  }
  let mount;
  try {
    // Resolve symlinked ancestors physically (the same resolution the
    // accepted T026 restore destination uses) so every read targets the
    // physical restored store.
    mount = fs.realpathSync(mountInput);
  } catch {
    failStage("S6", "the restore media mount could not be physically resolved");
  }

  // Walk the whole mount: every entry must be a plain regular file or
  // directory (a symlink or special object anywhere is alias/special-content
  // ambiguity and fails closed), and the regular-file set is compared with
  // the designated set below.
  const presentFiles = [];
  const walk = (directory, prefix) => {
    let dirents;
    try {
      dirents = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      failStage("S6", `the restored media mount could not be enumerated${prefix ? ` under ${prefix}` : ""} (unreadable)`);
    }
    for (const dirent of dirents) {
      const rel = prefix === "" ? dirent.name : `${prefix}/${dirent.name}`;
      if (dirent.isSymbolicLink() || (!dirent.isFile() && !dirent.isDirectory())) {
        failStage("S6", `the restored media mount contains a non-regular entry (symlink or special object): ${rel}`);
      }
      if (dirent.isDirectory()) walk(path.join(directory, dirent.name), rel);
      else presentFiles.push(rel);
    }
  };
  walk(mount, "");

  // Every designated entry: each path component must be a real directory
  // (never a symlink), the final entry a real regular file, and the bytes
  // must match the recorded size and SHA-256 independently.
  let matched = 0;
  for (const entry of designatedEntries) {
    const components = entry.path.split("/");
    let probe = mount;
    for (let i = 0; i < components.length - 1; i += 1) {
      probe = path.join(probe, components[i]);
      let componentStat;
      try {
        componentStat = fs.lstatSync(probe);
      } catch {
        failStage("S6", `the designated restored media entry is missing from the mount: ${entry.path}`);
      }
      if (componentStat.isSymbolicLink()) {
        failStage("S6", `a component of the designated restored media path is a symlink (alias ambiguity rejected): ${entry.path}`);
      }
      if (!componentStat.isDirectory()) {
        failStage("S6", `a component of the designated restored media path is not a directory: ${entry.path}`);
      }
    }
    const target = path.join(mount, entry.path);
    let entryStat;
    try {
      entryStat = fs.lstatSync(target);
    } catch {
      failStage("S6", `the designated restored media entry is missing from the mount: ${entry.path}`);
    }
    if (entryStat.isSymbolicLink()) {
      failStage("S6", `the designated restored media entry is a symlink (alias ambiguity rejected): ${entry.path}`);
    }
    if (!entryStat.isFile()) {
      failStage("S6", `the designated restored media entry did not restore as a regular file: ${entry.path}`);
    }
    let bytes;
    try {
      bytes = fs.readFileSync(target);
    } catch {
      failStage("S6", `the designated restored media entry is unreadable: ${entry.path}`);
    }
    if (entryStat.size !== bytes.length) {
      failStage("S6", `the designated restored media entry changed while being read (inconsistent observation): ${entry.path}`);
    }
    if (bytes.length !== entry.size) {
      failStage("S6", `the designated restored media entry has the wrong size (size difference): ${entry.path}`);
    }
    if (sha256Hex(bytes) !== entry.sha256) {
      failStage("S6", `the designated restored media entry does not match the recorded SHA-256 evidence (digest difference): ${entry.path}`);
    }
    matched += 1;
  }

  // Zero unexplained differences, both directions: the mount's regular-file
  // set must equal the designated entry set exactly — an extra file is an
  // unexplained difference, and a manifest that silently dropped an entry
  // the restored store actually contains cannot pass.
  const designatedSet = new Set(designatedEntries.map((entry) => entry.path));
  const extras = presentFiles.filter((file) => !designatedSet.has(file));
  if (extras.length > 0) {
    failStage("S6", `the restored media mount carries ${extras.length} unexplained non-designated file(s) (first: ${extras[0]}); zero unexplained differences required`);
  }
  if (matched !== designatedEntries.length) {
    failStage("S6", "100% designated media recovery not met");
  }
  info("S6", `restored media verified: 100% of ${matched} designated entries matched size and SHA-256; the mount's regular-file set equals the designated set (${presentFiles.length} file(s); zero unexplained differences)`);
  pass("S6", "every designated restored media entry verified through the restore media mount: exact path/size/SHA-256, no aliasing, no extras — 100% designated recovery with zero unexplained integrity differences");
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

async function testedTree() {
  const git = findOnPath("git", process.env.PATH);
  if (git === null) return "unknown (git unavailable)";
  const result = await runBounded(git, ["rev-parse", "HEAD"], GIT_TIMEOUT_MS, APP_ROOT);
  const head = result.stdout.trim();
  return /^[0-9a-f]{7,40}$/.test(head) ? head : "unknown (git unavailable)";
}

async function main() {
  checkInvocation();
  const tools = resolveTools();
  info("S1", `node ${process.version}`);
  const agreedIdentity = checkInputs();

  const designatedEntries = loadRecoveryManifest();
  const exactBuild = loadExactBuildManifest();
  await checkMigrationState(tools, agreedIdentity, exactBuild.names);
  await checkObservedTagline(tools);
  checkRestoredMedia(designatedEntries);

  publishOut("t027: ================================================================");
  publishOut("t027: T027 restored-foundation comparator: PASS");
  publishOut(`t027: observed native site:tagline equals the canonical T015 value (${TAGLINE_EXPECTED_BYTES} bytes, no trailing newline, sha256 ${TAGLINE_EXPECTED_SHA256}); zero pending/unknown migrations with the applied set equal to the exact-build set; 100% of ${designatedEntries.length} designated media entries recovered with zero unexplained differences`);
  publishOut("t027: exit 0 verifies restored-state integrity only — NOT runtime recovery acceptance: the T022/T028 gates, the T028 drill, and separate runtime-secret recovery stay with their owners");
  publishOut(`t027: tested tree: ${await testedTree()}`);
  publishOut("t027: ================================================================");
  process.exit(0);
}

// Fail closed on anything that escapes the bounded flow above, with the same
// redacted shape and no error text.
process.on("unhandledRejection", () => {
  publishErr("t027: unexpected comparator failure (fail closed; no error detail is printed)");
  process.exit(EXIT_FAIL);
});
process.on("uncaughtException", () => {
  publishErr("t027: unexpected comparator failure (fail closed; no error detail is printed)");
  process.exit(EXIT_FAIL);
});

main();

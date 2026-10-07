// T007 — RED test definition for the Songhealth native runtime configuration
// contract (Feature 001).
//
// Authority:
// - specs/001-platform-foundation/tasks.md T007/T008
// - docs/website-modernization-docs/current/10-system-blueprint.md §20.1
//   (Native Runtime Configuration Contract) and §21 (Testing Strategy)
// - specs/001-platform-foundation/spec.md: FR-007/FR-012, User Story 1
//   acceptance scenario 3, edge cases, and the 2026-10-07 configuration
//   clarification
// - specs/001-platform-foundation/data-model.md §1 (Runtime Configuration)
// - specs/001-platform-foundation/plan.md ("Configuration and secrets")
//
// These tests define the approved contract and are intentionally RED until T008
// adds the minimal fail-fast validation to the canonical application
// configuration. They exercise exactly one black-box surface: loading the
// canonical Astro application configuration (astro.config.mjs) in a child Node
// process whose environment contains only this case's inputs. With valid
// inputs the load must succeed; with missing, empty, malformed, or mutually
// inconsistent inputs the load must fail closed with an actionable error that
// identifies field/component names and never echoes configured values
// (§20.1: the PG*/migration-URL consistency check compares non-secret identity
// components only; passwords and the full URL are never printed).
//
// Per §21 these tests cover Songhealth configuration behavior only: no Astro
// or EmDash internals, no reusable helper/module API, no configuration
// service, and no live database or network access (the configuration load
// itself never connects). Every configured value below is an unmistakably
// synthetic, non-secret marker; no real credential ever appears in this file,
// its fixtures, or its output.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// Synthetic (non-secret) test markers and the valid baseline environment.
// ---------------------------------------------------------------------------

const SYNTHETIC_PG_PASSWORD = "SYNTHETIC-PG-PASSWORD-NOT-A-SECRET";
const SYNTHETIC_URL_PASSWORD = "SYNTHETIC-URL-PASSWORD-NOT-A-SECRET";
const SYNTHETIC_ENCRYPTION_KEY = "SYNTHETIC-ENCRYPTION-KEY-0123456789abcdefABCDEF";

// Synthetic non-secret PostgreSQL identity (never a real database).
const SYNTHETIC_IDENTITY = {
  host: "localhost",
  port: "5432",
  database: "songhealth_test_synthetic",
  user: "songhealth_test_user",
} as const;

const SYNTHETIC_MIGRATION_URL =
  `postgresql://${SYNTHETIC_IDENTITY.user}:${SYNTHETIC_URL_PASSWORD}` +
  `@${SYNTHETIC_IDENTITY.host}:${SYNTHETIC_IDENTITY.port}/${SYNTHETIC_IDENTITY.database}`;

// Every failure-path assertion scans all child output for these markers, so
// any configured secret value that leaks into an error message fails the test.
const ALWAYS_FORBIDDEN_VALUES: ReadonlyArray<{ label: string; value: string }> = [
  { label: "PGPASSWORD value marker", value: SYNTHETIC_PG_PASSWORD },
  { label: "migration-URL password marker", value: SYNTHETIC_URL_PASSWORD },
  { label: "EMDASH_ENCRYPTION_KEY value marker", value: SYNTHETIC_ENCRYPTION_KEY },
  { label: "full migration URL", value: SYNTHETIC_MIGRATION_URL },
];

// The complete approved native runtime input set (§20.1), synthetic and valid.
function validBaselineEnv(): Record<string, string> {
  return {
    HOST: "127.0.0.1",
    PORT: "4321",
    EMDASH_SITE_URL: "http://localhost:4321",
    PGHOST: SYNTHETIC_IDENTITY.host,
    PGPORT: SYNTHETIC_IDENTITY.port,
    PGDATABASE: SYNTHETIC_IDENTITY.database,
    PGUSER: SYNTHETIC_IDENTITY.user,
    PGPASSWORD: SYNTHETIC_PG_PASSWORD,
    EMDASH_MIGRATION_DATABASE_URL: SYNTHETIC_MIGRATION_URL,
    EMDASH_ENCRYPTION_KEY: SYNTHETIC_ENCRYPTION_KEY,
  };
}

// ---------------------------------------------------------------------------
// Black-box harness: load astro.config.mjs in a child process with a curated
// environment and report the outcome. The child receives ONLY this case's
// variables (never the test runner's ambient environment), so each case is
// isolated and no accidental database/network access can occur.
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG_MODULE_URL = pathToFileURL(path.join(REPO_ROOT, "astro.config.mjs")).href;
const RESULT_SENTINEL = "@@SONGHEALTH-CONFIG-LOAD-RESULT@@";
const CHILD_TIMEOUT_MS = 60_000;

interface ConfigLoadOutcome {
  ok: boolean;
  name?: string;
  message?: string;
}

interface ConfigLoadRun {
  outcome: ConfigLoadOutcome | null;
  harnessError: string | null;
  /** Everything the child printed (stdout + stderr); never surfaced raw. */
  output: string;
}

function loadApplicationConfiguration(env: Record<string, string>): ConfigLoadRun {
  const childSource = `
    const report = (payload) =>
      process.stdout.write(${JSON.stringify(RESULT_SENTINEL)} + JSON.stringify(payload));
    try {
      const mod = await import(${JSON.stringify(CONFIG_MODULE_URL)});
      report({ ok: true, hasDefaultExport: mod.default !== undefined && mod.default !== null });
    } catch (error) {
      report({
        ok: false,
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  `;

  const spawned = spawnSync(process.execPath, ["--input-type=module", "--eval", childSource], {
    cwd: REPO_ROOT,
    env,
    encoding: "utf8",
    timeout: CHILD_TIMEOUT_MS,
    stdin: "ignore",
  });

  const output = `${spawned.stdout ?? ""}\n${spawned.stderr ?? ""}`;
  if (spawned.error) {
    return { outcome: null, harnessError: `child did not run: ${spawned.error.message}`, output };
  }
  if (spawned.status === null) {
    return { outcome: null, harnessError: `child terminated by signal ${spawned.signal}`, output };
  }
  const at = output.indexOf(RESULT_SENTINEL);
  if (at === -1) {
    return { outcome: null, harnessError: "child produced no parseable result report", output };
  }
  try {
    const outcome = JSON.parse(output.slice(at + RESULT_SENTINEL.length).trim()) as ConfigLoadOutcome;
    return { outcome, harnessError: null, output };
  } catch (error) {
    return { outcome: null, harnessError: `child result not parseable: ${String(error)}`, output };
  }
}

/** Replace every synthetic secret marker before using child output in
 * assertion diagnostics, so a redaction failure can never republish the value
 * through the test runner's own output. */
function sanitizeForReporting(text: string): string {
  let sanitized = text;
  for (const marker of [
    SYNTHETIC_PG_PASSWORD,
    SYNTHETIC_URL_PASSWORD,
    SYNTHETIC_ENCRYPTION_KEY,
    SYNTHETIC_MIGRATION_URL,
  ]) {
    sanitized = sanitized.split(marker).join("<redacted-test-marker>");
  }
  return sanitized.length > 400 ? `${sanitized.slice(0, 400)}…` : sanitized;
}

function assertHarnessSound(run: ConfigLoadRun): void {
  assert.ok(run.harnessError === null, `harness failure (not a contract result): ${run.harnessError}`);
  assert.ok(run.outcome !== null, "harness failure: no configuration-load outcome was reported");
}

/** Assert the configuration load failed closed, names the expected
 * field/component names, and echoed none of the configured values. */
function expectFailClosedNaming(
  run: ConfigLoadRun,
  expectedFieldNames: ReadonlyArray<string>,
  extraForbiddenValues: ReadonlyArray<{ label: string; value: string }> = [],
): void {
  assertHarnessSound(run);
  assert.ok(
    run.outcome !== null && run.outcome.ok === false,
    "expected the configuration load to fail closed, but it reported success " +
      "(the required validation is absent — this is the RED state T008 must resolve)",
  );
  const message = run.outcome?.message ?? "";
  assert.ok(
    typeof message === "string" && message.trim().length > 0,
    "failure must include an actionable, non-empty message",
  );
  for (const field of expectedFieldNames) {
    assert.ok(
      message.includes(field),
      `failure message must identify the field/component name "${field}"; message: ` +
        sanitizeForReporting(message),
    );
  }
  for (const { label, value } of [...ALWAYS_FORBIDDEN_VALUES, ...extraForbiddenValues]) {
    // Only distinctive markers are asserted absent; plain digits are not
    // asserted because they legitimately occur in boundary hints (e.g. "1-65535").
    assert.ok(
      !run.output.includes(value),
      `failure output must never echo the configured ${label}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Control case: the valid synthetic baseline must load cleanly. This case is
// expected to PASS already; it proves the harness resolves the application and
// its dependencies, so the failures below are attributable only to the absent
// validation behavior, not to a broken harness or missing test dependencies.
// ---------------------------------------------------------------------------

describe("valid native runtime configuration (control)", () => {
  it("loads the canonical application configuration successfully", () => {
    const run = loadApplicationConfiguration(validBaselineEnv());
    assertHarnessSound(run);
    assert.ok(
      run.outcome?.ok === true,
      "valid synthetic inputs must not be rejected; failure would indicate a harness " +
        `or dependency problem, not a contract result: ${sanitizeForReporting(run.output)}`,
    );
    for (const { label, value } of ALWAYS_FORBIDDEN_VALUES) {
      assert.ok(!run.output.includes(value), `successful load output must not echo the ${label}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Required values: each approved native runtime input must be present and
// non-empty, or the configuration load fails closed naming the field.
// ---------------------------------------------------------------------------

const REQUIRED_INPUTS = [
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
  "EMDASH_MIGRATION_DATABASE_URL",
  "EMDASH_SITE_URL",
  "HOST",
  "PORT",
  "EMDASH_ENCRYPTION_KEY",
] as const;

describe("missing or empty required values fail closed", () => {
  for (const inputName of REQUIRED_INPUTS) {
    it(`fails closed naming ${inputName} when it is unset`, () => {
      const env = validBaselineEnv();
      delete env[inputName];
      expectFailClosedNaming(loadApplicationConfiguration(env), [inputName]);
    });

    it(`fails closed naming ${inputName} when it is empty`, () => {
      const env = { ...validBaselineEnv(), [inputName]: "" };
      expectFailClosedNaming(loadApplicationConfiguration(env), [inputName]);
    });
  }
});

// ---------------------------------------------------------------------------
// Malformed values explicitly covered by current authority: invalid TCP ports
// (PGPORT/PORT), an invalid public origin (EMDASH_SITE_URL), and a malformed,
// non-PostgreSQL, or incomplete migration URL (EMDASH_MIGRATION_DATABASE_URL).
// ---------------------------------------------------------------------------

describe("malformed required values fail closed", () => {
  const invalidTcpPorts: ReadonlyArray<{ variable: string; value: string; reason: string }> = [
    { variable: "PGPORT", value: "synthetic-not-a-port", reason: "non-numeric TCP port" },
    { variable: "PGPORT", value: "0", reason: "TCP port 0 is outside the usable 1-65535 range" },
    { variable: "PGPORT", value: "70000", reason: "TCP port above 65535" },
    { variable: "PORT", value: "synthetic-not-a-port", reason: "non-numeric TCP port" },
    { variable: "PORT", value: "70000", reason: "TCP port above 65535" },
  ];
  for (const { variable, value, reason } of invalidTcpPorts) {
    it(`fails closed naming ${variable} for ${reason}`, () => {
      const env = { ...validBaselineEnv(), [variable]: value };
      expectFailClosedNaming(loadApplicationConfiguration(env), [variable], [
        { label: `${variable} value marker`, value },
      ]);
    });
  }

  it('fails closed naming EMDASH_SITE_URL when the origin has no scheme (bare host)', () => {
    const env = { ...validBaselineEnv(), EMDASH_SITE_URL: "synthetic-site-origin.example.invalid" };
    expectFailClosedNaming(loadApplicationConfiguration(env), ["EMDASH_SITE_URL"], [
      { label: "EMDASH_SITE_URL value marker", value: "synthetic-site-origin.example.invalid" },
    ]);
  });

  it('fails closed naming EMDASH_SITE_URL when the origin has no host', () => {
    const env = { ...validBaselineEnv(), EMDASH_SITE_URL: "http://" };
    expectFailClosedNaming(loadApplicationConfiguration(env), ["EMDASH_SITE_URL"]);
  });

  it("fails closed naming EMDASH_MIGRATION_DATABASE_URL when it is not a parsable URL", () => {
    const env = { ...validBaselineEnv(), EMDASH_MIGRATION_DATABASE_URL: "synthetic-malformed-not-a-url" };
    expectFailClosedNaming(loadApplicationConfiguration(env), ["EMDASH_MIGRATION_DATABASE_URL"], [
      { label: "EMDASH_MIGRATION_DATABASE_URL value marker", value: "synthetic-malformed-not-a-url" },
    ]);
  });

  it("fails closed naming EMDASH_MIGRATION_DATABASE_URL when the scheme is not PostgreSQL", () => {
    const nonPostgresUrl =
      `mysql://${SYNTHETIC_IDENTITY.user}:${SYNTHETIC_URL_PASSWORD}` +
      `@${SYNTHETIC_IDENTITY.host}:${SYNTHETIC_IDENTITY.port}/${SYNTHETIC_IDENTITY.database}`;
    const env = { ...validBaselineEnv(), EMDASH_MIGRATION_DATABASE_URL: nonPostgresUrl };
    expectFailClosedNaming(loadApplicationConfiguration(env), ["EMDASH_MIGRATION_DATABASE_URL"], [
      { label: "full non-PostgreSQL migration URL", value: nonPostgresUrl },
    ]);
  });

  it("fails closed naming EMDASH_MIGRATION_DATABASE_URL when it is incomplete (no user or database identity)", () => {
    const env = { ...validBaselineEnv(), EMDASH_MIGRATION_DATABASE_URL: "postgresql://localhost:5432" };
    expectFailClosedNaming(loadApplicationConfiguration(env), ["EMDASH_MIGRATION_DATABASE_URL"]);
  });
});

// ---------------------------------------------------------------------------
// Identity agreement: the PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL
// must identify the same intended database. Each non-secret identity component
// — host, port, database, user — is mismatched exactly once; the failure must
// name the field/component without echoing either side's value.
// ---------------------------------------------------------------------------

describe("PG* runtime inputs and migration URL must agree on the intended database", () => {
  it("fails closed when PGHOST disagrees with the migration URL host component", () => {
    const env = { ...validBaselineEnv(), PGHOST: "synthetic-alt-host.example.invalid" };
    expectFailClosedNaming(
      loadApplicationConfiguration(env),
      ["PGHOST", "EMDASH_MIGRATION_DATABASE_URL"],
      [{ label: "divergent PGHOST value", value: "synthetic-alt-host.example.invalid" }],
    );
  });

  it("fails closed when PGPORT disagrees with the migration URL port component", () => {
    const env = { ...validBaselineEnv(), PGPORT: "65432" };
    expectFailClosedNaming(
      loadApplicationConfiguration(env),
      ["PGPORT", "EMDASH_MIGRATION_DATABASE_URL"],
      [{ label: "divergent PGPORT value", value: "65432" }],
    );
  });

  it("fails closed when PGDATABASE disagrees with the migration URL database component", () => {
    const env = { ...validBaselineEnv(), PGDATABASE: "synthetic_alt_database" };
    expectFailClosedNaming(
      loadApplicationConfiguration(env),
      ["PGDATABASE", "EMDASH_MIGRATION_DATABASE_URL"],
      [
        { label: "divergent PGDATABASE value", value: "synthetic_alt_database" },
        { label: "migration-URL database value", value: SYNTHETIC_IDENTITY.database },
      ],
    );
  });

  it("fails closed when PGUSER disagrees with the migration URL user component", () => {
    const env = { ...validBaselineEnv(), PGUSER: "synthetic_alt_user" };
    expectFailClosedNaming(
      loadApplicationConfiguration(env),
      ["PGUSER", "EMDASH_MIGRATION_DATABASE_URL"],
      [
        { label: "divergent PGUSER value", value: "synthetic_alt_user" },
        { label: "migration-URL user value", value: SYNTHETIC_IDENTITY.user },
      ],
    );
  });
});

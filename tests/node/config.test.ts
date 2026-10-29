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
// - specs/001-platform-foundation/data-model.md §1 (Runtime Configuration:
//   "may name the missing field or dependency but must not print values")
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
// Field-name-only enforcement (review rounds 1-2): for EVERY case — failure
// and control alike — the combined child output must not echo ANY non-empty
// value configured for that exact case (not only secrets or hand-selected
// divergent values), nor any constant secret marker, nor any distinctive
// identity FRAGMENT of a configured URL (its host, port, user, or database
// component). The rule is total, with no exemptions: every configured value
// in every case — including every malformed value — is unmistakably
// distinctive synthetic data chosen so it cannot collide with generic
// actionable hints (TCP port ranges, supported URL schemes such as
// postgresql:// or http://, loopback/default examples).
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
// All values are deliberately distinctive so the every-value echo rule below
// cannot false-fail a correct implementation that prints generic hints.
// ---------------------------------------------------------------------------

const SYNTHETIC_PG_PASSWORD = "SYNTHETIC-PG-PASSWORD-NOT-A-SECRET";
const SYNTHETIC_URL_PASSWORD = "SYNTHETIC-URL-PASSWORD-NOT-A-SECRET";
const SYNTHETIC_ENCRYPTION_KEY = "SYNTHETIC-ENCRYPTION-KEY-0123456789abcdefABCDEF";

// Synthetic non-secret PostgreSQL identity (never a real database; the host
// and port avoid the PostgreSQL defaults so range/default hints cannot
// collide with the echo assertions).
const SYNTHETIC_IDENTITY = {
  host: "songhealth-test-db.synthetic.example.invalid",
  port: "54329",
  database: "songhealth_test_synthetic",
  user: "songhealth_test_user",
} as const;

const SYNTHETIC_MIGRATION_URL =
  `postgresql://${SYNTHETIC_IDENTITY.user}:${SYNTHETIC_URL_PASSWORD}` +
  `@${SYNTHETIC_IDENTITY.host}:${SYNTHETIC_IDENTITY.port}/${SYNTHETIC_IDENTITY.database}`;

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
 * an error that echoes only a FRAGMENT of the migration URL or public origin
 * — for example just its host — is caught even when the full URL is never
 * printed. In the missing/empty cases the URL is the only configured copy of
 * those components, so fragment coverage is required for the rule to be
 * total. URL schemes are deliberately not forbidden: legitimate actionable
 * hints name supported schemes such as postgresql:// or https://. */
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
 * distinctive identity components of its configured URLs. */
function echoForbiddenValuesFor(env: Record<string, string>): ReadonlyArray<{ label: string; value: string }> {
  const configured = Object.entries(env)
    .filter(([, value]) => value.length > 0)
    .map(([name, value]) => ({ label: `${name} value`, value }));
  return [...CONSTANT_SECRET_MARKERS, ...configured, ...urlComponentValues(env)];
}

// The complete approved native runtime input set (§20.1), synthetic and valid.
function validBaselineEnv(): Record<string, string> {
  return {
    HOST: "synthetic-app-host.example.invalid",
    PORT: "43219",
    EMDASH_SITE_URL: "http://synthetic-public-origin.example.invalid",
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
  carriesConfiguredHost?: boolean;
  carriesNumericPort?: boolean;
}

interface ConfigLoadRun {
  outcome: ConfigLoadOutcome | null;
  harnessError: string | null;
  /** Everything the child printed (stdout + stderr); never surfaced raw. */
  output: string;
}

function runConfigChild(env: Record<string, string>, childSource: string): ConfigLoadRun {
  const spawned = spawnSync(process.execPath, ["--input-type=module", "--eval", childSource], {
    cwd: REPO_ROOT,
    env,
    encoding: "utf8",
    timeout: CHILD_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"],
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
  return runConfigChild(env, childSource);
}

/** Replace every case-specific configured marker before any child output is
 * used in assertion diagnostics, so a value-echo failure can never republish
 * the value through the test runner's own output. */
function sanitizeForReporting(
  text: string,
  forbidden: ReadonlyArray<{ label: string; value: string }>,
): string {
  let sanitized = text;
  for (const { value } of forbidden) {
    if (value.length > 0) {
      sanitized = sanitized.split(value).join("<redacted-test-marker>");
    }
  }
  return sanitized.length > 400 ? `${sanitized.slice(0, 400)}…` : sanitized;
}

function assertHarnessSound(run: ConfigLoadRun): void {
  assert.ok(run.harnessError === null, `harness failure (not a contract result): ${run.harnessError}`);
  assert.ok(run.outcome !== null, "harness failure: no configuration-load outcome was reported");
}

/** Run one failure case: load the configuration with exactly `env` and assert
 * that the load fails closed, names the expected field/component names, and
 * echoes none of the values configured for this exact case. */
function expectFailClosedNaming(
  env: Record<string, string>,
  expectedFieldNames: ReadonlyArray<string>,
): void {
  const run = loadApplicationConfiguration(env);
  const forbidden = echoForbiddenValuesFor(env);
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
        sanitizeForReporting(message, forbidden),
    );
  }
  for (const { label, value } of forbidden) {
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
  it("loads the canonical application configuration successfully without echoing any configured value", () => {
    const env = validBaselineEnv();
    const run = loadApplicationConfiguration(env);
    const forbidden = echoForbiddenValuesFor(env);
    assertHarnessSound(run);
    assert.ok(
      run.outcome?.ok === true,
      "valid synthetic inputs must not be rejected; failure would indicate a harness " +
        `or dependency problem, not a contract result: ${sanitizeForReporting(run.output, forbidden)}`,
    );
    for (const { label, value } of forbidden) {
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
      expectFailClosedNaming(env, [inputName]);
    });

    it(`fails closed naming ${inputName} when it is empty`, () => {
      const env = { ...validBaselineEnv(), [inputName]: "" };
      expectFailClosedNaming(env, [inputName]);
    });
  }
});

// ---------------------------------------------------------------------------
// Malformed values explicitly covered by current authority: invalid TCP ports
// (PGPORT/PORT), an invalid public origin (EMDASH_SITE_URL), and a malformed,
// non-PostgreSQL, or incomplete migration URL (EMDASH_MIGRATION_DATABASE_URL).
// Every malformed value below is distinctive synthetic data, so the automatic
// every-value echo rule fully applies to it with no exceptions (the
// below-range port is the distinctive negative "-54329", not a bare "0").
// ---------------------------------------------------------------------------

describe("malformed required values fail closed", () => {
  const invalidTcpPorts: ReadonlyArray<{ variable: string; value: string; reason: string }> = [
    { variable: "PGPORT", value: "synthetic-not-a-port", reason: "non-numeric TCP port" },
    { variable: "PGPORT", value: "-54329", reason: "negative TCP port below the usable 1-65535 range" },
    { variable: "PGPORT", value: "70000", reason: "TCP port above 65535" },
    { variable: "PORT", value: "synthetic-not-a-port", reason: "non-numeric TCP port" },
    { variable: "PORT", value: "70000", reason: "TCP port above 65535" },
  ];
  for (const { variable, value, reason } of invalidTcpPorts) {
    it(`fails closed naming ${variable} for ${reason}`, () => {
      const env = { ...validBaselineEnv(), [variable]: value };
      expectFailClosedNaming(env, [variable]);
    });
  }

  it("fails closed naming EMDASH_SITE_URL when the origin has no scheme (bare host)", () => {
    const env = { ...validBaselineEnv(), EMDASH_SITE_URL: "synthetic-site-origin.example.invalid" };
    expectFailClosedNaming(env, ["EMDASH_SITE_URL"]);
  });

  it("fails closed naming EMDASH_SITE_URL when the origin has a scheme but no host", () => {
    // Distinctive scheme-with-empty-host value: asserting its absence cannot
    // collide with a legitimate scheme hint such as "http:// or https://".
    const env = { ...validBaselineEnv(), EMDASH_SITE_URL: "http://:43219" };
    expectFailClosedNaming(env, ["EMDASH_SITE_URL"]);
  });

  it("fails closed naming EMDASH_MIGRATION_DATABASE_URL when it is not a parsable URL", () => {
    const env = { ...validBaselineEnv(), EMDASH_MIGRATION_DATABASE_URL: "synthetic-malformed-not-a-url" };
    expectFailClosedNaming(env, ["EMDASH_MIGRATION_DATABASE_URL"]);
  });

  it("fails closed naming EMDASH_MIGRATION_DATABASE_URL when the scheme is not PostgreSQL", () => {
    const nonPostgresUrl =
      `mysql://${SYNTHETIC_IDENTITY.user}:${SYNTHETIC_URL_PASSWORD}` +
      `@${SYNTHETIC_IDENTITY.host}:${SYNTHETIC_IDENTITY.port}/${SYNTHETIC_IDENTITY.database}`;
    const env = { ...validBaselineEnv(), EMDASH_MIGRATION_DATABASE_URL: nonPostgresUrl };
    expectFailClosedNaming(env, ["EMDASH_MIGRATION_DATABASE_URL"]);
  });

  it("fails closed naming EMDASH_MIGRATION_DATABASE_URL when it is incomplete (no user or database identity)", () => {
    // Distinctive scheme+host+port value with no user or database component;
    // asserting its absence cannot collide with a legitimate postgresql://
    // scheme hint.
    const env = {
      ...validBaselineEnv(),
      EMDASH_MIGRATION_DATABASE_URL: `postgresql://${SYNTHETIC_IDENTITY.host}:${SYNTHETIC_IDENTITY.port}`,
    };
    expectFailClosedNaming(env, ["EMDASH_MIGRATION_DATABASE_URL"]);
  });
});

// ---------------------------------------------------------------------------
// Identity agreement: the PG* runtime inputs and EMDASH_MIGRATION_DATABASE_URL
// must identify the same intended database. Each non-secret identity component
// — host, port, database, user — is mismatched exactly once; the failure must
// name the field/component without echoing either side's value (both sides'
// values are covered automatically by the per-case echo rule).
// ---------------------------------------------------------------------------

describe("PG* runtime inputs and migration URL must agree on the intended database", () => {
  it("fails closed when PGHOST disagrees with the migration URL host component", () => {
    const env = { ...validBaselineEnv(), PGHOST: "synthetic-alt-host.example.invalid" };
    expectFailClosedNaming(env, ["PGHOST", "EMDASH_MIGRATION_DATABASE_URL"]);
  });

  it("fails closed when PGPORT disagrees with the migration URL port component", () => {
    const env = { ...validBaselineEnv(), PGPORT: "65432" };
    expectFailClosedNaming(env, ["PGPORT", "EMDASH_MIGRATION_DATABASE_URL"]);
  });

  it("fails closed when PGDATABASE disagrees with the migration URL database component", () => {
    const env = { ...validBaselineEnv(), PGDATABASE: "synthetic_alt_database" };
    expectFailClosedNaming(env, ["PGDATABASE", "EMDASH_MIGRATION_DATABASE_URL"]);
  });

  it("fails closed when PGUSER disagrees with the migration URL user component", () => {
    const env = { ...validBaselineEnv(), PGUSER: "synthetic_alt_user" };
    expectFailClosedNaming(env, ["PGUSER", "EMDASH_MIGRATION_DATABASE_URL"]);
  });
});

// ---------------------------------------------------------------------------
// T015 Human Gate regression: a valid synthetic HOST/PORT pair must be present
// in the EXPORTED Astro configuration (native `server.host`/`server.port`),
// not merely validated. `astro dev`/`astro preview` bind only what the native
// server configuration carries, so a configuration that validates HOST/PORT
// without exporting them leaves the application on Astro's default `localhost`
// resolution — the boundary divergence that blocked the T015 clean-checkout
// readiness check. The comparisons run inside the child process against the
// same case environment the configuration module loaded with, and only boolean
// results are reported, preserving the every-value echo rule above.
// ---------------------------------------------------------------------------

describe("validated HOST/PORT are carried in the exported Astro server configuration", () => {
  function loadExportedServerBoundary(env: Record<string, string>): ConfigLoadRun {
    const childSource = `
      const report = (payload) =>
        process.stdout.write(${JSON.stringify(RESULT_SENTINEL)} + JSON.stringify(payload));
      try {
        const mod = await import(${JSON.stringify(CONFIG_MODULE_URL)});
        const server = mod.default?.server ?? {};
        report({
          ok: true,
          carriesConfiguredHost: server.host === process.env.HOST,
          carriesNumericPort:
            typeof server.port === "number" && server.port === Number(process.env.PORT),
        });
      } catch (error) {
        report({
          ok: false,
          name: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    `;
    return runConfigChild(env, childSource);
  }

  it("exports the configured host and the numeric configured port as the native server boundary", () => {
    const env = validBaselineEnv();
    const run = loadExportedServerBoundary(env);
    const forbidden = echoForbiddenValuesFor(env);
    assertHarnessSound(run);
    assert.ok(
      run.outcome?.ok === true,
      "valid synthetic inputs must load; failure would indicate a harness or dependency " +
        `problem: ${sanitizeForReporting(run.output, forbidden)}`,
    );
    assert.ok(
      run.outcome?.carriesConfiguredHost === true,
      "the exported configuration must carry the configured HOST as server.host, so " +
        "`astro dev` binds the configured boundary instead of a default localhost resolution",
    );
    assert.ok(
      run.outcome?.carriesNumericPort === true,
      "the exported configuration must carry the configured PORT as the numeric server.port " +
        "required by Astro's native server configuration type",
    );
    for (const { label, value } of forbidden) {
      assert.ok(!run.output.includes(value), `load output must not echo the ${label}`);
    }
  });
});

/**
 * T023 — Failing daily stdout/stderr, application-log, HTTP, exact-sentinel,
 * and encoded-sentinel nondisclosure contract tests.
 *
 * References: FR-007, SC-004; quickstart.md §3 (the documented
 * rejection-class fixtures and the closed-shape/nondisclosure outcomes);
 * contracts/foundation-operations.md §Commands (`foundation:check`,
 * `dev:setup`, `dev:start`, `dev:ready`) / §Configuration examples /
 * §Safe diagnostic contract / §Failure behavior; data-model.md §Safe
 * Diagnostic; plan.md §Configuration and startup (the closed SafeDiagnostic
 * on commands, standard output/error, application logs, HTTP failures, and
 * the sentinel scans over every named surface); Delivery Context
 * Implementation/Review routing and security/privacy routing; Constitution
 * Principles I–VI (esp. I security, IV privacy and data minimization, V
 * proportionate verification); accepted T019–T022 harness and collaborator
 * contracts.
 *
 * This is the tests-first contract for the T027/T028/T038 diagnostic-surface
 * boundary of the single planned operations module
 * `scripts/foundation-operations.mjs`. It drives the quickstart §3 daily
 * surface — the six documented rejection-class fixtures through the relevant
 * preflight/start commands — through DETERMINISTIC INJECTED/FAKE
 * collaborators for preflight checks, configuration, the Development
 * database, native process supervision, readiness probing, the clock, and
 * the four output surfaces this suite adds to the accepted collaborator
 * contract (`output.stdout` / `output.stderr` for command standard
 * output/error, `output.applicationLog` for the application log, and
 * `output.httpFailure` for the daily HTTP failure presentation). No real
 * Podman/Compose is invoked, no real process is started or stopped, no
 * listener is bound, no network request is made, no database or filesystem
 * state is mutated, and no machine state is depended on.
 *
 * Surface modeling (the T022-marker precedent): the daily HTTP failure
 * presentation is owned by the T028 readiness/route adapters and the T038
 * http.ts/orchestration serializers; the injected `output.httpFailure`
 * adapter models it, exactly as the accepted T022 suite models the T035
 * marker boundary with an injected `marker` collaborator — the module must
 * map every failure onto that surface in the closed shape, and the expected
 * red stays at the one deliberately absent operations module. Raw
 * collaborator failures (a rejecting native-process adapter carrying an
 * internal exception/stack, and a rejecting database adapter carrying raw
 * Compose/Podman standard error) model the T038 raw-input side: they are
 * consumed and mapped, never passed through to any surface.
 *
 * Every closed-set assertion mirrors the accepted closed SafeDiagnostic
 * schema (the routed reason-code set, `foundation | daily | verification`
 * scopes, the component and remediation allowlists, and the safe
 * configuration-key names carried by `apps/server/src/config.ts`
 * SAFE_DIAGNOSTIC_SCHEMA / foundation-http.openapi.yaml `SafeDiagnostic`);
 * this suite pins membership in those closed sets, the exact per-class
 * reason code from the Operations Contract rejection table, and the exact
 * `daily` diagnostic scope of the daily commands — never a free-form
 * message, an invented field, or a raw value.
 *
 * T023 proves:
 *   - COMMAND STDOUT/STDERR (FR-007): every daily rejection fails non-zero
 *     before any work and is reported on the command surfaces as units that
 *     are each exactly one closed SafeDiagnostic with the documented class
 *     reason code, a safe configuration-key name only, and no other field.
 *   - APPLICATION-LOG SURFACE (FR-007): the same failure is mapped onto the
 *     application log surface in the same closed shape, including when the
 *     native server process adapter rejects with a raw internal
 *     exception/stack.
 *   - HTTP FAILURE SURFACE (FR-007): the same failure is mapped onto the
 *     daily HTTP failure presentation in the same closed shape, carrying the
 *     same allowlisted reason code the command surfaces carry.
 *   - EXACT AND ENCODED SENTINEL NONDISCLOSURE (SC-004): unique synthetic
 *     sentinels injected as configuration credentials, an unsupported
 *     log-level value, a raw exception/stack, and raw Compose/Podman output
 *     are absent from every named surface in exact form and in encoded form
 *     (URI/URI-component, base64/base64url, hex, JSON-escaped, and
 *     unicode-escaped).
 *   - FORBIDDEN DETAIL REJECTION (FR-007): no surface unit contains raw
 *     configuration values, credentials, connection strings, SQL markers,
 *     internal exception/stack text, filesystem paths, host/container/proxy
 *     identifiers, or any other unnecessary infrastructure detail.
 *   - FAIL BEFORE READINESS (SC-004): every tested rejection class fails
 *     before a database pool/process is accepted, before readiness is
 *     probed, and before any mutation — the failure is the only output.
 *
 * EXPECTED RED: the only reason this suite fails is that the
 * T027/T028/T038 `scripts/foundation-operations.mjs` implementation boundary
 * does not exist yet. The failure is a module-resolution error for that one
 * intentionally absent module — not a syntax, discovery, dependency,
 * fixture, forced-failure, or real-tool error. (Historical: that boundary was
 * implemented and accepted as T027–T038; the rationale is retained unchanged
 * for the accepted T023 cases above.)
 *
 * The T042 suite appended at the bottom of this file is a SEPARATE
 * tests-first contract with its own scope, harness, and expected-red
 * boundary — the absent Production-like Verification HTTP-boundary behavior
 * of the NOW-EXISTING operations module (the planned T046/T047/T051/T052
 * topology/proxy/route/diagnostic boundary behind the planned T049 entry
 * point). It changes no accepted T023 case, harness, or assertion above; the
 * two suites share only this file and the module under contract.
 */

import { describe, expect, it } from "vitest";
import {
  foundationCheck,
  devSetup,
  devStart,
  devReady,
  type OperationResult,
  type FoundationOperationsCollaborators,
} from "../../scripts/foundation-operations.mjs";
// The T042 suite observes the SAME existing module through a NAMESPACE
// import, exactly like the accepted T041 suite in its file: its expected-red
// boundary is one missing behavior of an already-implemented module (the
// planned T049 Verification run orchestration entry `verifyProductionLike`
// and the T046/T047/T051/T052 boundary it drives), not an absent module. A
// named import would turn that missing export into a file-wide import error
// and redden the accepted T023 cases above with it.
import * as FoundationOperationsModule from "../../scripts/foundation-operations.mjs";

// ---------------------------------------------------------------------------
// Synthetic, non-secret inputs. No real port, credential, connection string,
// external tool output, or Production constant appears here.
// ---------------------------------------------------------------------------

/**
 * Unique synthetic nondisclosure sentinels (SC-004). Each is distinct, each
 * contains characters that transform under the exercised encodings, and none
 * is a real secret or Production value.
 */
const S_VALID_DB_CREDENTIAL = "NDT023~safe!credential(4c8f)";
const S_BROKEN_DB_CREDENTIAL = "NDT023/broken-credential 9e4d";
const S_UNSUPPORTED_LOG_LEVEL = "NDT023/trace-level b7c1";
const S_SERVER_STACK = "NDT023/server-stack c31e/";
const S_COMPOSE_RAW = "NDT023/compose-raw a2b9=";

/** A safe Development daily configuration (synthetic, non-secret). */
const SAFE_DEV_CONFIG = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "daily",
  APP_HOST: "127.0.0.1",
  APP_PORT: "10443",
  PUBLIC_ORIGIN: "http://127.0.0.1:10443",
  DATABASE_URL: `mysql://dev-user:${S_VALID_DB_CREDENTIAL}@127.0.0.1:3306/songhealth_dev`,
  DATABASE_POOL_MAX: "4",
  PROXY_POLICY: "none",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
} as const;

// ---------------------------------------------------------------------------
// The closed SafeDiagnostic sets this suite enforces (mirrored from the
// accepted closed schema: apps/server/src/config.ts SAFE_DIAGNOSTIC_SCHEMA /
// foundation-http.openapi.yaml SafeDiagnostic). The operations module must
// emit exactly these closed sets on every surface (T038).
// ---------------------------------------------------------------------------

/** The routed allowlisted reason-code set (no other reason code is legal). */
const SAFE_DIAGNOSTIC_REASON_CODES = [
  "OPERATIONAL_FAILURE",
  "BUILD_FAILED",
  "STARTUP_FAILED",
  "CONFIG_MISSING",
  "CONFIG_EMPTY",
  "CONFIG_MALFORMED",
  "CONFIG_UNSUPPORTED",
  "CONFIG_OUT_OF_RANGE",
  "CONFIG_IDENTITY_CONFLICT",
  "CONFIG_REJECTION_NOT_ENFORCED",
  "DATABASE_UNAVAILABLE",
  "MIGRATION_FAILED",
  "MIGRATIONS_PENDING",
  "MIGRATION_STATUS_FAILED",
  "LIVENESS_FAILED",
  "READINESS_FAILED",
  "ISOLATION_FAILED",
  "PROXY_CONTRACT_FAILED",
  "ROUTE_UNREACHABLE",
  "OPERATION_INTERRUPTED",
  "RESOURCE_OWNERSHIP_UNPROVEN",
  "RESOURCE_INVENTORY_CHANGED",
  "DATA_INTEGRITY_UNPROVEN",
  "DATA_RECONSTRUCTIBILITY_UNPROVEN",
  "NON_DESTRUCTIVE_REPAIR_UNAVAILABLE",
  "MANUAL_REVIEW_REQUIRED",
  "PREREQUISITE_FAILED",
  "CLEANUP_FAILED",
  "REPORT_INVALID",
  "REPORT_EMISSION_FAILED",
  "SECRET_SCANNER_FAILED",
  "COMMITTED_SECRET_DETECTED",
  "DEPENDENCY_FINDING_UNREVIEWED",
  "DEPENDENCY_FINDING_BLOCKING",
  "DEPENDENCY_EXCEPTION_EXPIRED",
  "DEPENDENCY_EVIDENCE_MISMATCH",
  "ASVS_EVIDENCE_INCOMPLETE",
] as const;

/** The closed diagnostic-scope enum (contract §Safe diagnostic contract). */
const SAFE_DIAGNOSTIC_SCOPES = ["foundation", "daily", "verification"] as const;

/** The allowlisted component set. */
const SAFE_DIAGNOSTIC_COMPONENTS = [
  "orchestration",
  "configuration",
  "application",
  "database",
  "migration",
  "proxy",
  "public",
  "admin",
  "reporting",
  "cleanup",
  "security",
] as const;

/** The allowlisted bounded remediation set. */
const SAFE_DIAGNOSTIC_REMEDIATIONS = [
  "CHECK_PREREQUISITES",
  "FIX_CONFIGURATION",
  "CHECK_DATABASE",
  "RUN_MIGRATION",
  "INSPECT_OWNERSHIP",
  "RETRY_SAFE_OPERATION",
  "RUN_CONFIRMED_RECOVERY",
  "RUN_CONFIRMED_RESET",
  "REVIEW_MANUALLY",
  "REVIEW_SECURITY_EVIDENCE",
  "NONE",
] as const;

/**
 * The safe configuration-key names (contract §Configuration examples). A
 * diagnostic may name one of these keys; it may never carry a key's value.
 */
const SAFE_CONFIGURATION_KEYS = [
  "APP_ENVIRONMENT",
  "RUNTIME_PROFILE",
  "APP_HOST",
  "APP_PORT",
  "PUBLIC_ORIGIN",
  "DATABASE_URL",
  "DATABASE_POOL_MAX",
  "PROXY_POLICY",
  "LOG_LEVEL",
  "FIXTURE_PROVENANCE",
] as const;

/** The exact closed field set; nothing else may appear on any surface. */
const SAFE_DIAGNOSTIC_KEYS = [
  "reasonCode",
  "diagnosticScope",
  "component",
  "configurationKey",
  "remediation",
] as const;

const REQUIRED_DIAGNOSTIC_KEYS = [
  "reasonCode",
  "diagnosticScope",
  "component",
  "remediation",
] as const;

/**
 * Forbidden detail markers (FR-007): substrings that can never occur inside
 * a correctly closed diagnostic — raw exception/stack text, SQL markers,
 * filesystem paths, connection strings, host/container/proxy identifiers,
 * and loopback/host addresses. None is a substring of any allowlisted
 * value, so any occurrence proves free-form or raw passthrough content.
 */
const FORBIDDEN_DETAIL_MARKERS = [
  "/",
  "\\",
  " at ",
  "error:",
  "econnrefused",
  "select ",
  "insert ",
  "update ",
  "delete ",
  "drop ",
  "mysql://",
  "127.0.0.1",
  "localhost",
  "podman",
  "compose",
  "nginx",
  "docker",
  "stack",
  "synthetic-dev",
] as const;

/**
 * The six documented rejection-class fixtures (quickstart §3 / Operations
 * Contract §Configuration examples). Each fixture carries exactly one
 * invalid dimension plus the unique sentinels that must never reach any
 * surface: for the classes whose own value is not the sentinel bearer, the
 * sentinel rides the otherwise-valid database credential, proving the
 * diagnostic names the offending safe key without dumping the rest of the
 * configuration.
 */
interface RejectionFixture {
  label: string;
  reasonCode: string;
  configurationKey: string;
  overrides: Record<string, string | null>;
  sentinels: readonly string[];
}

const REJECTION_FIXTURES: RejectionFixture[] = [
  {
    label: "a required key is absent",
    reasonCode: "CONFIG_MISSING",
    configurationKey: "APP_PORT",
    overrides: { APP_PORT: null },
    sentinels: [S_VALID_DB_CREDENTIAL],
  },
  {
    label: "a required value is empty",
    reasonCode: "CONFIG_EMPTY",
    configurationKey: "PUBLIC_ORIGIN",
    overrides: { PUBLIC_ORIGIN: "" },
    sentinels: [S_VALID_DB_CREDENTIAL],
  },
  {
    label: "a value has the wrong format",
    reasonCode: "CONFIG_MALFORMED",
    configurationKey: "DATABASE_URL",
    overrides: {
      DATABASE_URL: `mysql://dev-user:${S_BROKEN_DB_CREDENTIAL}@@127.0.0.1:3306/songhealth_dev`,
    },
    sentinels: [S_BROKEN_DB_CREDENTIAL],
  },
  {
    label: "an unsupported value is supplied",
    reasonCode: "CONFIG_UNSUPPORTED",
    configurationKey: "LOG_LEVEL",
    overrides: { LOG_LEVEL: `trace-${S_UNSUPPORTED_LOG_LEVEL}` },
    sentinels: [S_UNSUPPORTED_LOG_LEVEL, S_VALID_DB_CREDENTIAL],
  },
  {
    label: "a value is outside its allowed range",
    reasonCode: "CONFIG_OUT_OF_RANGE",
    configurationKey: "APP_PORT",
    overrides: { APP_PORT: "70000" },
    sentinels: [S_VALID_DB_CREDENTIAL],
  },
  {
    label: "a forbidden identity combination is supplied",
    reasonCode: "CONFIG_IDENTITY_CONFLICT",
    configurationKey: "RUNTIME_PROFILE",
    overrides: { RUNTIME_PROFILE: "hosted" },
    sentinels: [S_VALID_DB_CREDENTIAL],
  },
];

// ---------------------------------------------------------------------------
// Shared coherent fake state.
// ---------------------------------------------------------------------------

/** The four daily output surfaces (the T023 facet of the collaborator set). */
type SurfaceName = "stdout" | "stderr" | "applicationLog" | "httpFailure";

interface OutputState {
  stdout: unknown[];
  stderr: unknown[];
  applicationLog: unknown[];
  httpFailure: unknown[];
}

interface DbState {
  running: boolean;
  startCount: number;
  stopCount: number;
}

interface ProcessState {
  running: Set<string>;
  startCount: Record<string, number>;
}

interface ConfigState {
  /**
   * Synthetic configuration overrides for the rejection class under test.
   * A `null` value removes the key entirely (the CONFIG_MISSING fixture).
   */
  overrides: Record<string, string | null>;
}

interface FailState {
  /** A raw internal exception the native server-process adapter rejects with. */
  serverStartError: Error | null;
  /** Raw Compose/Podman standard error the database adapter rejects with. */
  databaseStartError: Error | null;
}

/**
 * Build one coherent set of injected collaborators around shared state and a
 * chronological event trace. The returned `collaborators` object is the exact
 * object every operation under test receives; tests mutate it (or the shared
 * state behind it) directly, so every observation handle stays the exact
 * collaborator actually used — an override can never leave an assertion
 * pointed at a stale default. The literal is typed as the (absent) module's
 * collaborator contract: growing it with the `output` surface facet is the
 * T023 tests-first statement the T027/T028/T038 boundary must accept.
 */
function makeCollaborators() {
  const events: string[] = [];
  const dbState: DbState = { running: false, startCount: 0, stopCount: 0 };
  const processState: ProcessState = { running: new Set(), startCount: {} };
  const outputState: OutputState = {
    stdout: [],
    stderr: [],
    applicationLog: [],
    httpFailure: [],
  };
  const configState: ConfigState = { overrides: {} };
  const failState: FailState = {
    serverStartError: null,
    databaseStartError: null,
  };
  let clockTime = 0;

  const collaborators: FoundationOperationsCollaborators = {
    preflight: {
      node: async () => true,
      npm: async () => true,
      podman: async () => true,
      compose: async () => true,
      requiredFiles: async () => true,
      safeConfig: async () => true,
      portAvailable: async () => true,
    },
    database: {
      start: async () => {
        if (failState.databaseStartError) throw failState.databaseStartError;
        if (dbState.running) return;
        dbState.running = true;
        dbState.startCount += 1;
        events.push("database:start");
      },
      stop: async () => {
        if (!dbState.running) return;
        dbState.running = false;
        dbState.stopCount += 1;
        events.push("database:stop");
      },
      isRunning: async () => dbState.running,
      applyMigrations: async () => {
        events.push("migrate:applied");
      },
      deleteVolume: async () => {
        events.push("database:deleteVolume");
      },
    },
    processes: {
      start: async (name: string) => {
        if (name === "server" && failState.serverStartError) {
          throw failState.serverStartError;
        }
        if (processState.running.has(name)) return;
        processState.running.add(name);
        processState.startCount[name] = (processState.startCount[name] ?? 0) + 1;
        events.push(`process:start:${name}`);
      },
      stop: async (name: string) => {
        if (!processState.running.has(name)) return;
        processState.running.delete(name);
        events.push(`process:stop:${name}`);
      },
      isRunning: async (name: string) => processState.running.has(name),
    },
    readiness: {
      probe: async () => {
        events.push("readiness:probe");
        return {
          ready: true,
          components: {
            database: "ready",
            liveness: "ready",
            readiness: "ready",
            publicRoute: "ready",
            adminRoute: "ready",
            serverRoute: "ready",
          },
        };
      },
    },
    clock: {
      now: () => clockTime,
      advance: (ms: number) => {
        clockTime += ms;
      },
    },
    config: {
      load: async () => {
        const loaded: Record<string, string> = { ...SAFE_DEV_CONFIG };
        for (const [key, value] of Object.entries(configState.overrides)) {
          if (value === null) delete loaded[key];
          else loaded[key] = value;
        }
        return loaded;
      },
    },
    // The T023 diagnostic-surfaces facet: the four output boundaries the
    // daily commands must map failures onto. Each adapter records exactly
    // what it received so the suite can prove the closed shape and scan for
    // sentinel/forbidden content on every named surface.
    output: {
      stdout: async (unit: unknown): Promise<void> => {
        outputState.stdout.push(unit);
      },
      stderr: async (unit: unknown): Promise<void> => {
        outputState.stderr.push(unit);
      },
      applicationLog: async (record: unknown): Promise<void> => {
        outputState.applicationLog.push(record);
      },
      httpFailure: async (response: unknown): Promise<void> => {
        outputState.httpFailure.push(response);
      },
    },
    inventory: {
      inspect: async (target: string) => {
        events.push(`inventory:inspect:${target}`);
        return [];
      },
    },
    assessment: {
      evaluate: async (target: string) => {
        events.push(`assessment:evaluate:${target}`);
        return { reconstructibilityConfirmed: true, disposabilityConfirmed: true };
      },
    },
    lock: {
      acquire: async (target: string) => {
        events.push(`lock:acquire:${target}`);
        return true;
      },
      release: async (target: string) => {
        events.push(`lock:release:${target}`);
      },
    },
    confirmation: {
      issue: async (target: string, action: string) => {
        events.push(`confirmation:issue:${target}:${action}`);
        return "synthetic-confirmation-token";
      },
      verify: async (target: string, action: string) => {
        events.push(`confirmation:verify:${target}:${action}`);
        return true;
      },
    },
    mutation: {
      removeExactResource: async (logicalKey: string) => {
        events.push(`mutation:removeExact:${logicalKey}`);
      },
      removeByPrefix: async () => {
        events.push("mutation:forbidden:removeByPrefix");
      },
      removeByWildcard: async () => {
        events.push("mutation:forbidden:removeByWildcard");
      },
      removeByLabelFilter: async () => {
        events.push("mutation:forbidden:removeByLabelFilter");
      },
      downWithRemoveOrphans: async () => {
        events.push("mutation:forbidden:downWithRemoveOrphans");
      },
      downWithVolumes: async () => {
        events.push("mutation:forbidden:downWithVolumes");
      },
      prune: async () => {
        events.push("mutation:forbidden:prune");
      },
      forceRemove: async () => {
        events.push("mutation:forbidden:forceRemove");
      },
      removeBroadVolumes: async () => {
        events.push("mutation:forbidden:removeBroadVolumes");
      },
      removeWithUnresolvedVariables: async () => {
        events.push("mutation:forbidden:removeWithUnresolvedVariables");
      },
    },
  };

  return {
    collaborators,
    events,
    dbState,
    processState,
    outputState,
    configState,
    failState,
  };
}

type Harness = ReturnType<typeof makeCollaborators>;

/** Every daily output surface (the full dev:start diagnostic fan-out set). */
const ALL_SURFACES = [
  "stdout",
  "stderr",
  "applicationLog",
  "httpFailure",
] as const;

/** The daily commands this suite drives, with their named output surfaces. */
const DAILY_COMMANDS = [
  {
    command: "dev:setup",
    // dev:setup owns only command output: it validates configuration and
    // prepares the database dependency; the application log and the HTTP
    // failure presentation belong to the started application (dev:start).
    drive: (collaborators: FoundationOperationsCollaborators) =>
      devSetup(collaborators, "development"),
    surfaces: ["stdout", "stderr"] as const,
  },
  {
    command: "dev:start",
    drive: (collaborators: FoundationOperationsCollaborators) =>
      devStart(collaborators),
    surfaces: ["stdout", "stderr", "applicationLog", "httpFailure"] as const,
  },
] as const;

/**
 * The rejection-class × command matrix as flat cases, so every title key is
 * a direct property (no nested title interpolation) and every case carries
 * its own driver, surfaces, and sentinels.
 */
const REJECTION_MATRIX_CASES = DAILY_COMMANDS.flatMap((entry) =>
  REJECTION_FIXTURES.map((fixture) => ({
    command: entry.command,
    drive: entry.drive,
    surfaces: entry.surfaces,
    label: fixture.label,
    reasonCode: fixture.reasonCode,
    configurationKey: fixture.configurationKey,
    overrides: fixture.overrides,
    sentinels: fixture.sentinels,
  })),
);

/**
 * A raw internal exception the native server-process adapter rejects with
 * (the T038 raw-input side): a message and stack carrying the connection
 * string, the sentinel, and a filesystem path. Deterministic synthetic text.
 */
function rawServerStartError(): Error {
  const error = new Error(
    `connect ECONNREFUSED 127.0.0.1:13306 (mysql://dev-user:${S_SERVER_STACK}@127.0.0.1:13306/songhealth_dev)`,
  );
  error.stack = `${error.message}\n    at startup (/home/synthetic-dev/${S_SERVER_STACK}/apps/server/src/bootstrap.ts:97:13)`;
  return error;
}

/**
 * Raw Compose/Podman standard error the database adapter rejects with (the
 * T038 raw-input side): sentinel text plus container/network/host detail.
 * Deterministic synthetic single-line output.
 */
function rawDatabaseStartError(): Error {
  return new Error(
    `time="2026-08-24T00:00:00Z" level=error msg="sandbox: ${S_COMPOSE_RAW} failed" container=synthetic-dev-db-1 network=songhealth_dev_default podman-compose`,
  );
}

// ---------------------------------------------------------------------------
// Surface assertions.
// ---------------------------------------------------------------------------

/**
 * Prove one emitted surface unit is EXACTLY one closed SafeDiagnostic (the
 * accepted closed sets; `expectedScope` additionally pins the daily scope of
 * the daily commands) and return the validated record for field assertions.
 * A string, an array, an object with any extra field, a missing required
 * field, or any non-allowlisted value fails here — free-form messages and
 * invented fields are prohibited by the contract.
 */
function expectClosedDiagnostic(
  unit: unknown,
  expectedScope?: (typeof SAFE_DIAGNOSTIC_SCOPES)[number],
): Record<string, unknown> {
  expect(
    typeof unit === "object" && unit !== null && !Array.isArray(unit),
    "every surface unit must be exactly one closed SafeDiagnostic object",
  ).toBe(true);
  const record = unit as Record<string, unknown>;
  const keys = Object.keys(record);
  expect(keys.length).toBeGreaterThan(0);
  for (const key of keys) {
    expect(SAFE_DIAGNOSTIC_KEYS).toContain(key);
  }
  for (const key of REQUIRED_DIAGNOSTIC_KEYS) {
    expect(keys).toContain(key);
  }
  expect(SAFE_DIAGNOSTIC_REASON_CODES).toContain(record.reasonCode);
  expect(SAFE_DIAGNOSTIC_SCOPES).toContain(record.diagnosticScope);
  expect(SAFE_DIAGNOSTIC_COMPONENTS).toContain(record.component);
  expect(SAFE_DIAGNOSTIC_REMEDIATIONS).toContain(record.remediation);
  if (record.configurationKey !== undefined) {
    expect(SAFE_CONFIGURATION_KEYS).toContain(record.configurationKey);
  }
  if (expectedScope !== undefined) {
    expect(record.diagnosticScope).toBe(expectedScope);
  }
  return record;
}

/** Serialize every unit of one surface into scannable text. */
function surfaceText(units: readonly unknown[]): string {
  return units
    .map((unit) => {
      const serialized = JSON.stringify(unit);
      return serialized === undefined ? String(unit) : serialized;
    })
    .join("\n");
}

/**
 * Every deterministic encoded form of a sentinel value: exact, URI and
 * URI-component encodings, base64 and base64url, lowercase and uppercase
 * hex, the JSON string-escaped form, and the fully unicode-escaped form.
 */
function encodedForms(value: string): string[] {
  const utf8 = Buffer.from(value, "utf8");
  const unicodeEscaped = [...value]
    .map((char) => `\\u${char.codePointAt(0)!.toString(16).padStart(4, "0")}`)
    .join("");
  const forms = new Set<string>([
    value,
    encodeURI(value),
    encodeURIComponent(value),
    utf8.toString("base64"),
    utf8.toString("base64url"),
    utf8.toString("hex"),
    utf8.toString("hex").toUpperCase(),
    JSON.stringify(value).slice(1, -1),
    unicodeEscaped,
  ]);
  return [...forms];
}

/**
 * Prove a surface carries no sentinel (exact or encoded) and no forbidden
 * detail (FR-007/SC-004): no raw configuration value, credential, connection
 * string, SQL marker, internal exception/stack text, filesystem path, or
 * host/container/proxy identifier.
 */
function expectSurfaceSanitized(
  units: readonly unknown[],
  sentinels: readonly string[],
): void {
  const text = surfaceText(units);
  for (const sentinel of sentinels) {
    for (const form of encodedForms(sentinel)) {
      expect(
        text.includes(form),
        `sentinel form leaked onto the surface: ${form}`,
      ).toBe(false);
    }
  }
  const lowered = text.toLowerCase();
  for (const marker of FORBIDDEN_DETAIL_MARKERS) {
    expect(
      lowered.includes(marker),
      `forbidden detail leaked onto the surface: ${marker}`,
    ).toBe(false);
  }
}

/** Work the contract forbids on rejection/before-work paths. */
const WORK_EVENT_PREFIXES = [
  "database:",
  "process:",
  "readiness:",
  "lock:",
  "mutation:",
] as const;

/**
 * Prove no database, native-process, readiness, lock, or mutation work
 * occurred — used by fail-before-work proofs (SC-004: every rejection fails
 * before a pool, listener, child service, or other work is accepted).
 */
function expectNoWork(harness: Harness): void {
  const { events, dbState, processState } = harness;
  for (const prefix of WORK_EVENT_PREFIXES) {
    expect(events.some((event) => event.startsWith(prefix))).toBe(false);
  }
  expect(dbState.running).toBe(false);
  expect(dbState.startCount).toBe(0);
  expect(processState.running.size).toBe(0);
}

// ---------------------------------------------------------------------------
// Daily command stdout/stderr closed diagnostic surface — FR-007 (tests-first
// for T027/T028/T038).
// ---------------------------------------------------------------------------

describe("Daily command stdout/stderr diagnostic surface — T023 (tests-first for T027/T028/T038)", () => {
  it.each(REJECTION_MATRIX_CASES)(
    "$command fails before any work when $label — every surface unit is exactly one closed daily SafeDiagnostic with the documented reason code",
    async (caseData) => {
      const harness = makeCollaborators();
      harness.configState.overrides = caseData.overrides;

      const result: OperationResult = await caseData.drive(
        harness.collaborators,
      );

      // The rejection fails non-zero with the documented class reason code,
      // before any work is accepted.
      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBe(caseData.reasonCode);
      expectNoWork(harness);

      // Every named surface of the command carries the failure as closed
      // SafeDiagnostic units — the same contract on every surface, the exact
      // `daily` scope of the daily commands, the documented reason code, and
      // a safe configuration-key name only (never a value).
      for (const surface of caseData.surfaces) {
        const units = harness.outputState[surface];
        expect(
          units.length,
          `${caseData.command} ${surface} carries the failure diagnostic`,
        ).toBeGreaterThan(0);
        let carriesClassCode = false;
        for (const unit of units) {
          const record = expectClosedDiagnostic(unit, "daily");
          if (record.reasonCode === caseData.reasonCode) {
            carriesClassCode = true;
            // The optional field may be absent, but it may never be anything
            // other than the safe key name of the offending dimension.
            if (record.configurationKey !== undefined) {
              expect(record.configurationKey).toBe(caseData.configurationKey);
            }
          }
        }
        expect(
          carriesClassCode,
          `${caseData.command} ${surface} carries the ${caseData.reasonCode} diagnostic`,
        ).toBe(true);
        expectSurfaceSanitized(units, caseData.sentinels);
      }
    },
  );

  it("foundation:check reports a failed safe-configuration preflight as closed diagnostics on the command surfaces — no work, no sentinel", async () => {
    const harness = makeCollaborators();
    harness.collaborators.preflight.safeConfig = async () => false;

    const result: OperationResult = await foundationCheck(harness.collaborators);

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    expectNoWork(harness);
    for (const surface of ["stdout", "stderr"] as const) {
      const units = harness.outputState[surface];
      expect(units.length).toBeGreaterThan(0);
      for (const unit of units) expectClosedDiagnostic(unit);
      expectSurfaceSanitized(units, [S_VALID_DB_CREDENTIAL]);
    }
  });

  it("dev:ready fails before probing readiness on a rejected configuration — closed diagnostics only, no work", async () => {
    const harness = makeCollaborators();
    const [malformed] = REJECTION_FIXTURES.filter(
      (fixture) => fixture.reasonCode === "CONFIG_MALFORMED",
    );
    harness.configState.overrides = malformed.overrides;

    const result: OperationResult = await devReady(harness.collaborators, {
      deadlineMs: 2000,
      pollMs: 500,
    });

    // SC-004: the rejection fails before readiness; the probe is never
    // invoked and no work is accepted.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe(malformed.reasonCode);
    expectNoWork(harness);
    for (const surface of ["stdout", "stderr"] as const) {
      const units = harness.outputState[surface];
      expect(units.length).toBeGreaterThan(0);
      for (const unit of units) expectClosedDiagnostic(unit, "daily");
      expectSurfaceSanitized(units, malformed.sentinels);
    }
  });
});

// ---------------------------------------------------------------------------
// Application-log failure surface — FR-007 (tests-first for T028/T038).
// ---------------------------------------------------------------------------

describe("Application-log failure surface — T023 (tests-first for T028/T038)", () => {
  it("a native server-process adapter that rejects with a raw internal exception/stack is mapped onto the application log as closed diagnostics — the raw exception, stack, path, and connection string never appear", async () => {
    const harness = makeCollaborators();
    harness.failState.serverStartError = rawServerStartError();

    const result: OperationResult = await devStart(harness.collaborators);

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    // The failed server process is not left running and readiness is never
    // probed.
    expect(harness.processState.running.has("server")).toBe(false);
    expect(harness.events.some((event) => event.startsWith("readiness:"))).toBe(
      false,
    );

    // The application-log surface carries the mapped failure as closed
    // daily diagnostics; the command surfaces and the HTTP failure
    // presentation carry the same closed mapping; the raw exception text,
    // stack, path, and connection string (exact and encoded) appear nowhere.
    const applicationLog = harness.outputState.applicationLog;
    expect(applicationLog.length).toBeGreaterThan(0);
    for (const unit of applicationLog) expectClosedDiagnostic(unit, "daily");
    for (const surface of ["stdout", "stderr", "httpFailure"] as const) {
      const units = harness.outputState[surface];
      expect(units.length).toBeGreaterThan(0);
      for (const unit of units) expectClosedDiagnostic(unit, "daily");
    }
    expectSurfaceSanitized(applicationLog, [S_SERVER_STACK]);
    expectSurfaceSanitized(harness.outputState.stdout, [S_SERVER_STACK]);
    expectSurfaceSanitized(harness.outputState.stderr, [S_SERVER_STACK]);
    expectSurfaceSanitized(harness.outputState.httpFailure, [S_SERVER_STACK]);
  });
});

// ---------------------------------------------------------------------------
// HTTP failure surface — FR-007 (tests-first for T028/T038).
// ---------------------------------------------------------------------------

describe("HTTP failure surface — T023 (tests-first for T028/T038)", () => {
  it("the daily HTTP failure presentation is the same closed SafeDiagnostic the command surfaces carry — never raw detail", async () => {
    const harness = makeCollaborators();
    harness.failState.serverStartError = rawServerStartError();

    const result: OperationResult = await devStart(harness.collaborators);

    expect(result.exitCode).not.toBe(0);
    const httpUnits = harness.outputState.httpFailure.map((unit) =>
      expectClosedDiagnostic(unit, "daily"),
    );
    expect(httpUnits.length).toBeGreaterThan(0);
    // "The same allowlisted diagnostic contract" on HTTP responses: a reason
    // code carried on the HTTP failure surface is also carried on the
    // command surfaces.
    const commandUnits = [
      ...harness.outputState.stdout,
      ...harness.outputState.stderr,
    ].map((unit) => expectClosedDiagnostic(unit, "daily"));
    const commandCodes = new Set(
      commandUnits.map((record) => record.reasonCode),
    );
    expect(
      httpUnits.some((record) => commandCodes.has(record.reasonCode)),
      "the HTTP failure surface carries the same allowlisted reason code as the command surfaces",
    ).toBe(true);
    expectSurfaceSanitized(harness.outputState.httpFailure, [S_SERVER_STACK]);
  });
});

// ---------------------------------------------------------------------------
// Raw orchestration/adapter failures are never passed through — FR-007
// (tests-first for T038).
// ---------------------------------------------------------------------------

describe("Raw adapter failure passthrough prohibition — T023 (tests-first for T038)", () => {
  it.each(DAILY_COMMANDS)(
    "$command maps a database adapter that rejects with raw Compose/Podman standard error to closed diagnostics — the raw output, container, network, and host detail never appear",
    async (entry) => {
      const harness = makeCollaborators();
      harness.failState.databaseStartError = rawDatabaseStartError();

      const result: OperationResult = await entry.drive(harness.collaborators);

      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBeTruthy();
      // The failed start is not followed by native processes, readiness, or
      // any mutation.
      expect(harness.processState.running.size).toBe(0);
      expect(
        harness.events.some((event) => event.startsWith("readiness:")),
      ).toBe(false);
      expect(
        harness.events.some((event) => event.startsWith("mutation:")),
      ).toBe(false);
      for (const surface of entry.surfaces) {
        const units = harness.outputState[surface];
        expect(units.length).toBeGreaterThan(0);
        for (const unit of units) expectClosedDiagnostic(unit, "daily");
        expectSurfaceSanitized(units, [S_COMPOSE_RAW, S_VALID_DB_CREDENTIAL]);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Exact-sentinel nondisclosure scans — SC-004 (tests-first for T038).
// ---------------------------------------------------------------------------

describe("Exact-sentinel nondisclosure scans — T023 (tests-first for T038)", () => {
  it("the injected configuration credential sentinel is absent in exact form from every named daily surface", async () => {
    const harness = makeCollaborators();
    const [malformed] = REJECTION_FIXTURES.filter(
      (fixture) => fixture.reasonCode === "CONFIG_MALFORMED",
    );
    harness.configState.overrides = malformed.overrides;

    const result: OperationResult = await devStart(harness.collaborators);

    expect(result.exitCode).not.toBe(0);
    for (const surface of ALL_SURFACES) {
      const text = surfaceText(harness.outputState[surface]);
      for (const sentinel of malformed.sentinels) {
        expect(
          text.includes(sentinel),
          `exact sentinel present on ${surface}`,
        ).toBe(false);
      }
    }
  });

  it("the injected raw server-stack sentinel is absent in exact form from every named daily surface", async () => {
    const harness = makeCollaborators();
    harness.failState.serverStartError = rawServerStartError();

    const result: OperationResult = await devStart(harness.collaborators);

    expect(result.exitCode).not.toBe(0);
    for (const surface of ALL_SURFACES) {
      const text = surfaceText(harness.outputState[surface]);
      expect(
        text.includes(S_SERVER_STACK),
        `exact sentinel present on ${surface}`,
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Encoded-sentinel nondisclosure scans — SC-004 (tests-first for T038).
// ---------------------------------------------------------------------------

describe("Encoded-sentinel nondisclosure scans — T023 (tests-first for T038)", () => {
  it("the injected configuration credential sentinel is absent in every encoded form from every named daily surface", async () => {
    const harness = makeCollaborators();
    const [malformed] = REJECTION_FIXTURES.filter(
      (fixture) => fixture.reasonCode === "CONFIG_MALFORMED",
    );
    harness.configState.overrides = malformed.overrides;

    const result: OperationResult = await devStart(harness.collaborators);

    expect(result.exitCode).not.toBe(0);
    for (const surface of ALL_SURFACES) {
      const text = surfaceText(harness.outputState[surface]);
      for (const sentinel of malformed.sentinels) {
        for (const form of encodedForms(sentinel)) {
          expect(
            text.includes(form),
            `encoded sentinel form present on ${surface}: ${form}`,
          ).toBe(false);
        }
      }
    }
  });

  it("the injected raw server-stack sentinel is absent in every encoded form from every named daily surface", async () => {
    const harness = makeCollaborators();
    harness.failState.serverStartError = rawServerStartError();

    const result: OperationResult = await devStart(harness.collaborators);

    expect(result.exitCode).not.toBe(0);
    for (const surface of ALL_SURFACES) {
      const text = surfaceText(harness.outputState[surface]);
      for (const form of encodedForms(S_SERVER_STACK)) {
        expect(
          text.includes(form),
          `encoded sentinel form present on ${surface}: ${form}`,
        ).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Closed SafeDiagnostic shape across every daily surface — FR-007 (tests-first
// for T038).
// ---------------------------------------------------------------------------

describe("Closed SafeDiagnostic shape across every daily surface — T023 (tests-first for T038)", () => {
  it("across every rejection class, every unit on every surface of the daily commands is exactly one closed daily SafeDiagnostic — no free-form message, no extra field, no raw value", async () => {
    const allUnits: unknown[] = [];
    for (const fixture of REJECTION_FIXTURES) {
      const harness = makeCollaborators();
      harness.configState.overrides = fixture.overrides;
      const result: OperationResult = await devStart(harness.collaborators);
      expect(result.exitCode).not.toBe(0);
      for (const surface of ALL_SURFACES) {
        const units = harness.outputState[surface];
        expect(units.length).toBeGreaterThan(0);
        allUnits.push(...units);
      }
    }

    // Every unit across all six classes and all four surfaces is exactly the
    // closed shape (this is where a free-form string, an object with an
    // extra field, or a raw value fails).
    expect(allUnits.length).toBeGreaterThanOrEqual(REJECTION_FIXTURES.length);
    for (const unit of allUnits) {
      expectClosedDiagnostic(unit, "daily");
    }
  });

  it("a configuration-key field, when present, names the safe schema key of the rejected dimension and never a value or an invented field", async () => {
    const harness = makeCollaborators();
    const [conflict] = REJECTION_FIXTURES.filter(
      (fixture) => fixture.reasonCode === "CONFIG_IDENTITY_CONFLICT",
    );
    harness.configState.overrides = conflict.overrides;

    const result: OperationResult = await devStart(harness.collaborators);

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("CONFIG_IDENTITY_CONFLICT");
    const units = [
      ...harness.outputState.stdout,
      ...harness.outputState.stderr,
      ...harness.outputState.applicationLog,
      ...harness.outputState.httpFailure,
    ].map((unit) => expectClosedDiagnostic(unit, "daily"));
    expect(units.length).toBeGreaterThan(0);
    for (const record of units) {
      // The optional field may be absent, but it may never be anything other
      // than the safe key name of the offending dimension.
      if (record.configurationKey !== undefined) {
        expect(record.configurationKey).toBe("RUNTIME_PROFILE");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// T042 — Production-like Verification HTTP boundary contract (tests-first for
// T046/T047/T051/T052).
// ---------------------------------------------------------------------------

/**
 * The T042 suite pins the HTTP-boundary behavior behind five of the twenty
 * ordered FR-009 contract results — `isolation`, `proxy`, `public-route`,
 * `admin-route`, and `server-route` — as the accepted T041 suite pins the
 * orchestration-owned result contract over them (its header routes "the
 * probe-level mechanics of each check (real Compose, Nginx, route, and
 * rejection behavior)" to exactly here).
 *
 * References: FR-009–FR-011, SC-003–SC-004; plan.md §Runtime composition and
 * §Operations and verification; research.md Decisions 6 and 8;
 * contracts/foundation-operations.md §Safe diagnostic contract and
 * §Operation-target ownership and isolation ("Verification publishes only
 * Nginx; its application and database ports remain internal");
 * contracts/foundation-http.openapi.yaml `/health/live` / `/health/ready`;
 * data-model.md §Verification Run ("Public/Admin route reachability and proxy
 * checks are Verification Check Results, not hidden inside readiness");
 * quickstart.md §6; tasks.md T042; the accepted T017 meaningful-SSR and T018
 * Admin-shell boundaries; the accepted T023 closed-diagnostic and sentinel
 * helpers above; the accepted T041 Verification result contract.
 *
 * T042 proves, through the SAME `verify:production-like` entry point:
 *   - NGINX-ONLY HOST EXPOSURE (FR-009 isolation): with only the proxy
 *     published to the host and both internal endpoints refusing direct
 *     connections, `isolation` passes; publishing the internal application
 *     or database port to the host, or accepting a direct connection to
 *     either internal endpoint, fails `isolation` with `ISOLATION_FAILED`.
 *   - ONE-HOP FORWARDED-HEADER TRUST (FR-009/FR-010 proxy): a boundary that
 *     honors the trusted proxy hop's forwarded metadata and rejects
 *     client-supplied spoofed or multi-hop metadata passes `proxy`; a
 *     spoofable boundary (client-supplied forwarded metadata honored) or an
 *     opaque boundary (the trusted hop's metadata never reaching the
 *     application) fails `proxy` with `PROXY_CONTRACT_FAILED`.
 *   - PUBLIC `/` MEANINGFUL SSR HTML (FR-009/FR-016 public-route): the
 *     accepted T017 meaningful-SSR definition — a semantic `<main>` region,
 *     a heading, and recognizable Public/foundation copy in the SERVED body
 *     through the proxy; a bare client-render shell or a safe operational
 *     failure instead of SSR HTML fails `public-route` with
 *     `ROUTE_UNREACHABLE`.
 *   - ADMIN `/admin/` (FR-009 admin-route): the Admin HTML route reachable
 *     through the proxy; its absence fails `admin-route` with
 *     `ROUTE_UNREACHABLE`.
 *   - SERVER LIVENESS/READINESS ROUTES (FR-009 server-route): both server
 *     health routes reachable through the proxy with their documented JSON
 *     operational responses; a failed liveness route or a not-ready
 *     readiness route fails `server-route` with `ROUTE_UNREACHABLE`.
 *   - CLOSED SAFE-DIAGNOSTIC FAILURES WITHOUT DISCLOSURE (FR-007/FR-010/
 *     SC-004): every boundary failure is exactly one closed `verification`
 *     SafeDiagnostic on every exercised failure surface — the failed check
 *     result, the primary failure, and all four command output surfaces,
 *     each of which must carry the failure non-vacuously (non-empty, every
 *     unit closed, every unit identifying the failed contract with its
 *     allowlisted reason code) — and the unique synthetic sentinels riding
 *     the boundary (the Verification database credential, the raw
 *     proxy-error and direct-refusal text, the internal application
 *     hostname, and every spoofed forwarded value the check itself
 *     injected) appear on no failure surface in exact or encoded form.
 *
 * Surface modeling (the accepted T022-marker / T023-httpFailure precedent):
 * the Verification topology, the proxy, and the internal endpoints are owned
 * by the T046/T047/T051 adapters; the injected `verification.boundary` facet
 * models them — one host-publication listing, one direct-connection attempt
 * per internal endpoint, and one through-the-proxy request adapter that
 * returns the observed response plus the request metadata the application
 * derived under the live proxy-trust policy. The optional-facet rule is the
 * accepted `journal`/`output`/`marker` rule: a collaborator set without the
 * facet keeps the accepted T041 coarse-probe behavior, while a run driven
 * WITH it must derive the five boundary contract results from these
 * observations. A raw proxy-adapter rejection models the T052 raw-input
 * side: consumed and mapped, never passed through to any surface.
 *
 * EXPECTED RED: the only reason the T042 cases fail is that the
 * T049–T054 Production-like Verification behavior — the entry point and the
 * topology/proxy/route boundary behind these five contract results — does
 * not exist yet. Every case fails on the one clean missing-`export`
 * assertion in `t042EntryPoint()` (the accepted T041 boundary precedent),
 * never on an import, fixture, or setup error, and never in the accepted
 * T023 cases above. No real Podman/Compose/Nginx is invoked, no listener is
 * bound, no network request leaves the harness, and no machine state is
 * depended on.
 */

/** Unique synthetic nondisclosure sentinels (SC-004), T042 series. */
const S_VERIFY_DB_CREDENTIAL = "NDT042~verify!credential(77ce)";
const S_RAW_PROXY_ERROR = "NDT042/proxy-raw e3a8=";
const S_DIRECT_REFUSAL = "NDT042/direct-refusal 9d5f";
const S_INTERNAL_APP_HOST = "NDT042/internal-app-host f0c2";

/**
 * The Verification operation target's configuration (the committed
 * `.env.verification.example` shape): `development / verification /
 * verification`, internal-only application host, `one-hop` proxy policy, and
 * the unique database-credential sentinel that must never reach any surface.
 */
const SAFE_VERIFICATION_CONFIG = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "verification",
  APP_HOST: "songhealth-app",
  APP_PORT: "3000",
  PUBLIC_ORIGIN: "http://songhealth-verification.test",
  DATABASE_URL: `mysql://songhealth_ver:${S_VERIFY_DB_CREDENTIAL}@songhealth-db:3306/songhealth_verification`,
  DATABASE_POOL_MAX: "5",
  PROXY_POLICY: "one-hop",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
} as const;

/** The fixed non-parity statement (FR-011) — required contract content, not
 * protected detail, so the sentinel scans exclude it explicitly. */
const VERIFICATION_PARITY_STATEMENT =
  "Production-like Verification validates bounded application contracts only; it does not establish exact parity with Bangmod/Plesk Production hosting.";

/**
 * Synthetic TEST-NET-1 (RFC 5737) addresses and hosts: documentation-safe,
 * never a real or Production value.
 */
const SYNTHETIC_TRUSTED_CLIENT = "192.0.2.10";
const SYNTHETIC_PROXY_PEER = "192.0.2.9";
const SYNTHETIC_FORWARDED_PROTOCOL = "https";
const SYNTHETIC_PUBLIC_HOST = "songhealth-verification.test";
const SYNTHETIC_PROXY_HOST_PORT = 18443;

/**
 * The served Public `/` body of the healthy Verification runtime: meaningful
 * SSR HTML under the accepted T017 definition — a semantic `<main>` region,
 * a heading, and recognizable Public/foundation/readiness copy — not a bare
 * client-render shell.
 */
const MEANINGFUL_SSR_HTML =
  "<!DOCTYPE html><html><body><main><h1>Public Foundation readiness</h1>" +
  "<p>Public foundation readiness boundary copy.</p></main></body></html>";

/** The served Admin `/admin/` CSR shell of the healthy runtime. */
const ADMIN_SHELL_HTML =
  "<!DOCTYPE html><html><head><title>Songhealth Admin</title></head>" +
  '<body><div id="root"></div></body></html>';

/** The documented `/health/live` operational response body. */
const LIVENESS_BODY = JSON.stringify({ status: "alive" });

/** The documented `/health/ready` operational response body. */
const READINESS_BODY = JSON.stringify({
  status: "ready",
  components: [
    { name: "application", status: "ready" },
    { name: "database", status: "ready" },
  ],
});

/** One served response of a route behind the verification proxy. */
interface BoundaryRouteResponse {
  status: number;
  contentType: string;
  body: string;
}

/** The healthy Verification route table behind the proxy. */
const HEALTHY_BOUNDARY_ROUTES: Record<string, BoundaryRouteResponse> = {
  "/": { status: 200, contentType: "text/html", body: MEANINGFUL_SSR_HTML },
  "/admin/": { status: 200, contentType: "text/html", body: ADMIN_SHELL_HTML },
  "/health/live": {
    status: 200,
    contentType: "application/json",
    body: LIVENESS_BODY,
  },
  "/health/ready": {
    status: 200,
    contentType: "application/json",
    body: READINESS_BODY,
  },
};

/** An internal Verification topology service. */
type InternalService = "proxy" | "application" | "database";

/** An internal endpoint the isolation contract protects. */
type InternalEndpoint = "application" | "database";

/** One host-published endpoint observed on the Verification topology. */
interface HostPublication {
  service: InternalService;
  hostPort: number;
}

/** The outcome of one direct-connection attempt at an internal endpoint. */
interface DirectConnectionOutcome {
  endpoint: InternalEndpoint;
  accepted: boolean;
  /** Raw refusal detail (raw tool/socket text) — consumed, never surfaced. */
  refusalDetail?: string;
}

/** One request the boundary check issues through the verification proxy. */
interface BoundaryRequest {
  method: "GET" | "HEAD";
  path: string;
  /** Client-supplied forwarded metadata attempting to spoof trust. */
  forwardedFor?: string;
}

/**
 * What one through-the-proxy request observed: the served response plus the
 * request metadata the application derived under the live proxy-trust
 * policy (the observable of Decision 6's scoped proxy trust).
 */
interface BoundaryObservation extends BoundaryRouteResponse {
  derivedClientAddress: string;
  derivedProtocol: string;
  derivedHost: string;
}

/**
 * The modeled Verification boundary state. `proxyPolicy` is the live
 * trust behavior of the running topology: `one-hop` honors exactly the
 * trusted proxy hop's appended metadata (the required Verification
 * behavior), `client-controlled` honors client-supplied forwarded metadata
 * wholesale (spoofable), and `opaque` never forwards the trusted hop's
 * metadata to the application at all.
 */
interface BoundaryTopology {
  hostPublications: HostPublication[];
  directAccepts: Set<InternalEndpoint>;
  proxyPolicy: "one-hop" | "client-controlled" | "opaque";
  routes: Record<string, BoundaryRouteResponse>;
  proxyError: Error | null;
}

/** The closed Safe Diagnostic logical shape, local to the T042 suite. */
interface T042SafeDiagnostic {
  reasonCode: string;
  diagnosticScope: string;
  component: string;
  configurationKey?: string;
  remediation: string;
}

/** One ordered Check Result (data-model.md §Verification Run). */
interface T042CheckResult {
  contract: string;
  result: "pass" | "fail";
  diagnostic?: T042SafeDiagnostic;
  durationMs: number;
}

/** The `verify:production-like` result surface (the accepted T041 shape). */
interface T042RunResult extends OperationResult {
  runId?: string;
  releaseRevision?: string;
  startedAt?: number;
  finishedAt?: number;
  state?: string;
  checks?: T042CheckResult[];
  primaryFailure?: T042SafeDiagnostic;
  parityStatement?: string;
}

/** The planned T049 entry point, observed exactly like the accepted T041. */
type T042VerifyProductionLike = (collaborators: unknown) => Promise<T042RunResult>;

/**
 * Resolve the planned Verification run orchestration entry. The single
 * intentional dependency on the not-yet-implemented boundary: until T049–
 * T054 ship, EVERY T042 case fails on this one clean assertion — the absent
 * Verification topology/proxy/route behavior itself — never on an import,
 * fixture, or setup error, and never in the accepted T023 cases above.
 */
function t042EntryPoint(): T042VerifyProductionLike {
  const candidate = (
    FoundationOperationsModule as unknown as Record<string, unknown>
  ).verifyProductionLike;
  expect(typeof candidate).toBe("function");
  return candidate as T042VerifyProductionLike;
}

/**
 * Raw proxy-adapter failure text (the T052 raw-input side): sentinel text
 * plus upstream/internal-host and proxy detail a failing adapter rejects
 * with. Deterministic synthetic single-line output.
 */
function rawProxyError(): Error {
  return new Error(
    `nginx: [emerg] ${S_RAW_PROXY_ERROR} host not found in upstream "${S_INTERNAL_APP_HOST}:3000"`,
  );
}

/**
 * The T042 harness: the accepted T041 verification collaborator set (so a
 * conforming run reaches the boundary contracts, disposes its runtime at
 * cleanup, and emits at reporting) plus the T042 `verification.boundary`
 * facet that models the Verification HTTP boundary, and the accepted
 * optional `output` facet so the command surfaces are observable. The
 * harness records every boundary consultation — publication listings,
 * direct-connection attempts, and through-the-proxy requests — so a case
 * can prove its contract result was derived from real boundary
 * observations, never rubber-stamped.
 */
function makeBoundaryHarness() {
  const events: string[] = [];
  const outputState: OutputState = {
    stdout: [],
    stderr: [],
    applicationLog: [],
    httpFailure: [],
  };
  const verificationRuntime = {
    up: false,
    startCount: 0,
    presentKeys: [] as string[],
    reportEmitted: false,
  };
  const boundaryState = {
    publicationListings: 0,
    directAttempts: [] as InternalEndpoint[],
    proxyRequests: [] as BoundaryRequest[],
  };
  const mutationState = {
    removedExact: [] as string[],
    forbiddenInvocations: [] as string[],
  };
  const topology: BoundaryTopology = {
    hostPublications: [{ service: "proxy", hostPort: SYNTHETIC_PROXY_HOST_PORT }],
    directAccepts: new Set<InternalEndpoint>(),
    proxyPolicy: "one-hop",
    routes: { ...HEALTHY_BOUNDARY_ROUTES },
    proxyError: null,
  };
  let clockTime = 1_780_100_000_000;

  const collaborators = {
    preflight: {
      node: async () => true,
      npm: async () => true,
      podman: async () => true,
      compose: async () => true,
      requiredFiles: async () => true,
      safeConfig: async () => true,
      portAvailable: async () => true,
    },
    database: {
      start: async () => {
        events.push("database:start");
      },
      stop: async () => {
        events.push("database:stop");
      },
      isRunning: async () => false,
      applyMigrations: async () => {
        events.push("migrate:applied");
      },
      migrationStatus: async () => "current" as const,
      deleteVolume: async () => {
        events.push("database:deleteVolume");
      },
    },
    processes: {
      start: async (name: string) => {
        events.push(`process:start:${name}`);
      },
      stop: async (name: string) => {
        events.push(`process:stop:${name}`);
      },
      isRunning: async (name: string) => false,
    },
    readiness: {
      probe: async () => ({ ready: true, components: {} }),
    },
    clock: {
      now: () => clockTime,
      advance: (ms: number) => {
        clockTime += ms;
      },
    },
    config: {
      load: async () => {
        events.push("config:load");
        return { ...SAFE_VERIFICATION_CONFIG };
      },
    },
    inventory: {
      inspect: async (target: string) => {
        events.push(`inventory:inspect:${target}`);
        if (target === "verification") {
          return verificationRuntime.presentKeys.map((key) => ({
            logicalKey: key,
          }));
        }
        return [];
      },
    },
    assessment: {
      evaluate: async (target: string) => {
        events.push(`assessment:evaluate:${target}`);
        return { reconstructibilityConfirmed: true, disposabilityConfirmed: true };
      },
    },
    lock: {
      acquire: async (target: string) => {
        events.push(`lock:acquire:${target}`);
        return true;
      },
      release: async (target: string) => {
        events.push(`lock:release:${target}`);
      },
    },
    confirmation: {
      issue: async (target: string, action: string) => {
        events.push(`confirmation:issue:${target}:${action}`);
        return "synthetic-verification-token";
      },
      verify: async (target: string, action: string) => {
        events.push(`confirmation:verify:${target}:${action}`);
        return true;
      },
    },
    mutation: {
      removeExactResource: async (logicalKey: string) => {
        mutationState.removedExact.push(logicalKey);
        events.push(`mutation:removeExact:${logicalKey}`);
        verificationRuntime.presentKeys = verificationRuntime.presentKeys.filter(
          (key) => key !== logicalKey,
        );
      },
      removeByPrefix: async (prefix: string) => {
        mutationState.forbiddenInvocations.push(`removeByPrefix:${prefix}`);
      },
      removeByWildcard: async (pattern: string) => {
        mutationState.forbiddenInvocations.push(`removeByWildcard:${pattern}`);
      },
      removeByLabelFilter: async (label: string) => {
        mutationState.forbiddenInvocations.push(`removeByLabelFilter:${label}`);
      },
      downWithRemoveOrphans: async () => {
        mutationState.forbiddenInvocations.push("downWithRemoveOrphans");
      },
      downWithVolumes: async () => {
        mutationState.forbiddenInvocations.push("downWithVolumes");
      },
      prune: async () => {
        mutationState.forbiddenInvocations.push("prune");
      },
      forceRemove: async () => {
        mutationState.forbiddenInvocations.push("forceRemove");
      },
      removeBroadVolumes: async () => {
        mutationState.forbiddenInvocations.push("removeBroadVolumes");
      },
      removeWithUnresolvedVariables: async () => {
        mutationState.forbiddenInvocations.push("removeWithUnresolvedVariables");
      },
    },
    journal: {
      readLatest: async (target: string) => {
        events.push(`journal:read:${target}`);
        return null;
      },
      write: async (target: string, record: { state: string }) => {
        events.push(`journal:write:${target}:${record.state}`);
      },
    },
    marker: {
      write: async () => {
        events.push("marker:write");
      },
      read: async () => null,
    },
    output: {
      stdout: async (unit: unknown): Promise<void> => {
        outputState.stdout.push(unit);
      },
      stderr: async (unit: unknown): Promise<void> => {
        outputState.stderr.push(unit);
      },
      applicationLog: async (record: unknown): Promise<void> => {
        outputState.applicationLog.push(record);
      },
      httpFailure: async (response: unknown): Promise<void> => {
        outputState.httpFailure.push(response);
      },
    },
    // The T041 facet (coarse per-contract probe) plus the T042 boundary
    // facet the five HTTP-boundary contract results must be derived from.
    verification: {
      runCheck: async (contract: string) => {
        events.push(`verification:check:${contract}`);
        clockTime += 1_000;
        if (contract === "startup") {
          verificationRuntime.up = true;
          verificationRuntime.startCount += 1;
          verificationRuntime.presentKeys = ["verification.nginx", "verification.network"];
        }
        if (contract === "cleanup" && verificationRuntime.up) {
          for (const key of [...verificationRuntime.presentKeys]) {
            await collaborators.mutation.removeExactResource(key);
          }
          verificationRuntime.up = false;
        }
        if (contract === "reporting") {
          verificationRuntime.reportEmitted = true;
        }
        return contract === "build"
          ? { ok: true, revision: "t042-synthetic-release-candidate" }
          : { ok: true };
      },
      boundary: {
        hostPublications: async (): Promise<HostPublication[]> => {
          boundaryState.publicationListings += 1;
          events.push("boundary:publications");
          return topology.hostPublications.map((publication) => ({ ...publication }));
        },
        connectDirect: async (
          endpoint: InternalEndpoint,
        ): Promise<DirectConnectionOutcome> => {
          boundaryState.directAttempts.push(endpoint);
          events.push(`boundary:direct:${endpoint}`);
          if (topology.directAccepts.has(endpoint)) {
            return { endpoint, accepted: true };
          }
          return {
            endpoint,
            accepted: false,
            refusalDetail: `${S_DIRECT_REFUSAL}: connection refused (internal ${endpoint} endpoint)`,
          };
        },
        proxyRequest: async (
          request: BoundaryRequest,
        ): Promise<BoundaryObservation> => {
          boundaryState.proxyRequests.push({ ...request });
          events.push(`boundary:proxy:${request.method}:${request.path}`);
          if (topology.proxyError) throw topology.proxyError;
          const route =
            topology.routes[request.path] ??
            ({ status: 404, contentType: "text/html", body: "" } as BoundaryRouteResponse);
          const clientEntries =
            typeof request.forwardedFor === "string"
              ? request.forwardedFor
                  .split(",")
                  .map((entry) => entry.trim())
                  .filter((entry) => entry.length > 0)
              : [];
          let derivedClientAddress: string;
          let derivedProtocol: string;
          let derivedHost: string;
          if (topology.proxyPolicy === "client-controlled") {
            // The application honors client-supplied forwarded metadata
            // wholesale: the first (attacker-controlled) entry wins.
            derivedClientAddress =
              clientEntries.length > 0 ? clientEntries[0] : SYNTHETIC_TRUSTED_CLIENT;
            derivedProtocol = SYNTHETIC_FORWARDED_PROTOCOL;
            derivedHost = SYNTHETIC_PUBLIC_HOST;
          } else if (topology.proxyPolicy === "opaque") {
            // The trusted hop's forwarded metadata never reaches the
            // application: it derives only internal peer values.
            derivedClientAddress = SYNTHETIC_PROXY_PEER;
            derivedProtocol = "http";
            derivedHost = S_INTERNAL_APP_HOST;
          } else {
            // Exactly one trusted hop: the entry the proxy appended is the
            // derived client; client-supplied entries are not trusted.
            derivedClientAddress = SYNTHETIC_TRUSTED_CLIENT;
            derivedProtocol = SYNTHETIC_FORWARDED_PROTOCOL;
            derivedHost = SYNTHETIC_PUBLIC_HOST;
          }
          return {
            status: route.status,
            contentType: route.contentType,
            body: request.method === "HEAD" ? "" : route.body,
            derivedClientAddress,
            derivedProtocol,
            derivedHost,
          };
        },
      },
    },
  };

  return {
    collaborators,
    events,
    outputState,
    verificationRuntime,
    boundaryState,
    mutationState,
    topology,
  };
}

type BoundaryHarness = ReturnType<typeof makeBoundaryHarness>;

/** Run the planned Verification operation through the boundary harness. */
async function runT042Verification(
  harness: BoundaryHarness,
): Promise<T042RunResult> {
  return t042EntryPoint()(harness.collaborators);
}

/** One run's checks keyed by contract name. */
function t042ChecksByContract(
  result: T042RunResult,
): Map<string, T042CheckResult> {
  return new Map((result.checks ?? []).map((check) => [check.contract, check]));
}

/**
 * Prove the named boundary violations fail EXACTLY their own contracts, each
 * with its documented reason code in one closed `verification` SafeDiagnostic,
 * with the first failed result in emitted order as the run's immutable
 * primary failure, and that no other contract failed independently — any
 * other failure may only be an explicit prerequisite block, never an
 * unrelated or fixture-shaped failure.
 */
function expectBoundaryFailures(
  result: T042RunResult,
  expected: ReadonlyArray<{ contract: string; reasonCode: string }>,
): void {
  expect(result.exitCode).not.toBe(0);
  const byContract = t042ChecksByContract(result);
  for (const { contract, reasonCode } of expected) {
    const check = byContract.get(contract);
    expect(check, `the ${contract} contract result exists`).toBeDefined();
    expect(check!.result).toBe("fail");
    const record = expectClosedDiagnostic(check!.diagnostic, "verification");
    expect(record.reasonCode).toBe(reasonCode);
  }
  const firstFailure = (result.checks ?? []).find(
    (check) => check.result === "fail",
  );
  expect(result.primaryFailure).toEqual(firstFailure?.diagnostic);
  const independent = new Set(expected.map((entry) => entry.contract));
  for (const other of result.checks ?? []) {
    if (independent.has(other.contract) || other.result !== "fail") continue;
    expect(
      other.diagnostic?.reasonCode,
      `${other.contract} may fail only as an explicit prerequisite block`,
    ).toBe("PREREQUISITE_FAILED");
  }
}

/**
 * Every unit on every failure surface of a failing boundary run — the failed
 * check diagnostics, the primary failure, and the four command output
 * surfaces — with the fixed FR-011 parity statement excluded as required
 * contract content, then scanned for the sentinels (exact and encoded) and
 * the forbidden detail markers.
 */
function expectBoundaryRunSanitized(
  result: T042RunResult,
  harness: BoundaryHarness,
  sentinels: readonly string[],
): void {
  const units: unknown[] = [];
  for (const check of result.checks ?? []) {
    if (check.result === "fail") units.push(check.diagnostic);
  }
  if (result.primaryFailure !== undefined) units.push(result.primaryFailure);
  units.push(
    ...harness.outputState.stdout,
    ...harness.outputState.stderr,
    ...harness.outputState.applicationLog,
    ...harness.outputState.httpFailure,
  );
  let text = surfaceText(units);
  text = text.split(VERIFICATION_PARITY_STATEMENT).join("");
  for (const sentinel of sentinels) {
    for (const form of encodedForms(sentinel)) {
      expect(
        text.includes(form),
        `sentinel form leaked onto a failure surface: ${form}`,
      ).toBe(false);
    }
  }
  const lowered = text.toLowerCase();
  for (const marker of FORBIDDEN_DETAIL_MARKERS) {
    expect(
      lowered.includes(marker),
      `forbidden detail leaked onto a failure surface: ${marker}`,
    ).toBe(false);
  }
}

/** Every spoofed forwarded value the run's own checks injected. */
function recordedSpoofValues(harness: BoundaryHarness): string[] {
  return harness.boundaryState.proxyRequests.flatMap((request) =>
    typeof request.forwardedFor === "string" && request.forwardedFor.length > 0
      ? [request.forwardedFor]
      : [],
  );
}

/** The sentinels riding every T042 boundary run by default. */
const BOUNDARY_RUN_SENTINELS = [S_VERIFY_DB_CREDENTIAL, S_DIRECT_REFUSAL];

/**
 * The boundary violation matrix as flat cases: each case injects exactly one
 * documented violation into the modeled topology and expects exactly its own
 * contract to fail with its documented reason code.
 */
interface BoundaryViolationCase {
  label: string;
  contract: string;
  reasonCode: string;
  apply: (harness: BoundaryHarness) => void;
  sentinels?: readonly string[];
}

const BOUNDARY_VIOLATION_CASES: BoundaryViolationCase[] = [
  {
    label: "the internal application port is published to the host",
    contract: "isolation",
    reasonCode: "ISOLATION_FAILED",
    apply: (harness) => {
      harness.topology.hostPublications.push({
        service: "application",
        hostPort: 13000,
      });
    },
  },
  {
    label: "the internal database port is published to the host",
    contract: "isolation",
    reasonCode: "ISOLATION_FAILED",
    apply: (harness) => {
      harness.topology.hostPublications.push({
        service: "database",
        hostPort: 13306,
      });
    },
  },
  {
    label: "a direct connection to the internal application endpoint is accepted",
    contract: "isolation",
    reasonCode: "ISOLATION_FAILED",
    apply: (harness) => {
      harness.topology.directAccepts.add("application");
    },
  },
  {
    label: "a direct connection to the internal database endpoint is accepted",
    contract: "isolation",
    reasonCode: "ISOLATION_FAILED",
    apply: (harness) => {
      harness.topology.directAccepts.add("database");
    },
  },
  {
    label: "client-supplied spoofed forwarded metadata is honored by the runtime",
    contract: "proxy",
    reasonCode: "PROXY_CONTRACT_FAILED",
    apply: (harness) => {
      harness.topology.proxyPolicy = "client-controlled";
    },
  },
  {
    label: "the trusted proxy hop's forwarded metadata never reaches the application",
    contract: "proxy",
    reasonCode: "PROXY_CONTRACT_FAILED",
    apply: (harness) => {
      harness.topology.proxyPolicy = "opaque";
    },
    sentinels: [S_INTERNAL_APP_HOST],
  },
  {
    label: "Public `/` serves a bare client-render shell with no server-rendered content",
    contract: "public-route",
    reasonCode: "ROUTE_UNREACHABLE",
    apply: (harness) => {
      harness.topology.routes["/"] = {
        status: 200,
        contentType: "text/html",
        body: '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
      };
    },
  },
  {
    label: "Public `/` returns the safe operational failure instead of SSR HTML",
    contract: "public-route",
    reasonCode: "ROUTE_UNREACHABLE",
    apply: (harness) => {
      harness.topology.routes["/"] = {
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          reasonCode: "OPERATIONAL_FAILURE",
          diagnosticScope: "verification",
          component: "public",
          remediation: "CHECK_PREREQUISITES",
        }),
      };
    },
  },
  {
    label: "Admin `/admin/` is absent behind the proxy",
    contract: "admin-route",
    reasonCode: "ROUTE_UNREACHABLE",
    apply: (harness) => {
      harness.topology.routes["/admin/"] = {
        status: 404,
        contentType: "text/html",
        body: "",
      };
    },
  },
  {
    label: "the server liveness route fails behind the proxy",
    contract: "server-route",
    reasonCode: "ROUTE_UNREACHABLE",
    apply: (harness) => {
      harness.topology.routes["/health/live"] = {
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          reasonCode: "OPERATIONAL_FAILURE",
          diagnosticScope: "verification",
          component: "application",
          remediation: "CHECK_PREREQUISITES",
        }),
      };
    },
  },
  {
    label: "the server readiness route reports not-ready behind the proxy",
    contract: "server-route",
    reasonCode: "ROUTE_UNREACHABLE",
    apply: (harness) => {
      harness.topology.routes["/health/ready"] = {
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          status: "not-ready",
          components: [{ name: "database", status: "not-ready" }],
        }),
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Verification HTTP boundary entry — the T042 expected-red boundary.
// ---------------------------------------------------------------------------

describe("Verification HTTP boundary entry — T042 (tests-first for T046/T047/T049–T052)", () => {
  it("exports the planned Verification run orchestration entry `verifyProductionLike` as a function", () => {
    expect(typeof t042EntryPoint()).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Clean boundary — Nginx-only exposure, refused direct ports, one-hop trust,
// and reachable Public/Admin/server routes (FR-009; Decision 6/8).
// ---------------------------------------------------------------------------

describe("Clean Verification HTTP boundary — T042 (tests-first for T046/T047/T051)", () => {
  it("with only the proxy published, both internal endpoints refusing direct connections, one-hop forwarded trust, and every route healthy, the five boundary contracts pass — derived from real boundary observations", async () => {
    const harness = makeBoundaryHarness();

    const result = await runT042Verification(harness);

    // The whole run passes, including the five boundary contracts.
    expect(result.exitCode).toBe(0);
    expect(result.primaryFailure).toBeUndefined();
    for (const check of result.checks ?? []) {
      expect(check.result, `${check.contract} passes`).toBe("pass");
    }
    // The isolation result was derived from a real publication listing and
    // real direct-connection attempts at BOTH internal endpoints — never
    // rubber-stamped.
    expect(harness.boundaryState.publicationListings).toBeGreaterThan(0);
    expect(new Set(harness.boundaryState.directAttempts)).toEqual(
      new Set(["application", "database"] as InternalEndpoint[]),
    );
    // The route results were derived from real through-the-proxy requests
    // at every documented boundary route.
    const paths = harness.boundaryState.proxyRequests.map(
      (request) => request.path,
    );
    expect(paths).toContain("/");
    expect(paths).toContain("/admin/");
    expect(paths).toContain("/health/live");
    expect(paths).toContain("/health/ready");
    // The proxy result really probed forwarded-header trust: at least one
    // request carried client-supplied forwarded metadata attempting to
    // spoof it, and under the required one-hop policy the application
    // derived the trusted hop's values, not the spoofed ones.
    const spoofed = harness.boundaryState.proxyRequests.filter(
      (request) =>
        typeof request.forwardedFor === "string" && request.forwardedFor.length > 0,
    );
    expect(spoofed.length).toBeGreaterThan(0);
    // The healthy run surfaces no failure diagnostic and no sentinel.
    expectBoundaryRunSanitized(result, harness, [
      ...BOUNDARY_RUN_SENTINELS,
      ...recordedSpoofValues(harness),
    ]);
  });
});

// ---------------------------------------------------------------------------
// Boundary violations — each documented violation fails exactly its own
// contract (FR-009/FR-010; Operations Contract §Verification result
// contract).
// ---------------------------------------------------------------------------

describe("Boundary contract violations — T042 (tests-first for T046/T047/T051)", () => {
  it.each(BOUNDARY_VIOLATION_CASES)(
    "$label fails exactly the $contract contract with $reasonCode",
    async (caseData) => {
      const harness = makeBoundaryHarness();
      caseData.apply(harness);

      const result = await runT042Verification(harness);

      expectBoundaryFailures(result, [
        { contract: caseData.contract, reasonCode: caseData.reasonCode },
      ]);
      // No sentinel riding the boundary — the verification credential, the
      // raw direct-refusal detail, any case-specific value, and every
      // spoofed forwarded value the run itself injected — reaches any
      // failure surface in any form.
      expectBoundaryRunSanitized(result, harness, [
        ...BOUNDARY_RUN_SENTINELS,
        ...(caseData.sentinels ?? []),
        ...recordedSpoofValues(harness),
      ]);
    },
  );
});

// ---------------------------------------------------------------------------
// Closed safe-diagnostic failures and raw-adapter nondisclosure — FR-007/
// FR-010/SC-004 (tests-first for T052).
// ---------------------------------------------------------------------------

describe("Closed safe-diagnostic failures and sentinel nondisclosure — T042 (tests-first for T052)", () => {
  it("a boundary violation is reported on every exercised failure surface as closed verification diagnostics — every output surface carries the failed contract's reason code", async () => {
    const harness = makeBoundaryHarness();
    harness.topology.hostPublications.push({
      service: "application",
      hostPort: 13000,
    });

    const result = await runT042Verification(harness);

    expect(result.exitCode).not.toBe(0);
    // Every failed check diagnostic and the primary failure are exactly the
    // closed shape scoped to the Verification run.
    for (const check of result.checks ?? []) {
      if (check.result === "fail") {
        expectClosedDiagnostic(check.diagnostic, "verification");
      }
    }
    expectClosedDiagnostic(result.primaryFailure, "verification");
    // FR-010 on EVERY exercised failure surface, with no vacuous pass: each
    // of the four command output surfaces — stdout and stderr AND the
    // application-log and HTTP-failure surfaces — must actually carry the
    // failure, must be non-empty, every emitted unit must be exactly one
    // closed verification SafeDiagnostic, and every unit must identify the
    // failed contract with its allowlisted reason code. An implementation
    // that emits no Verification diagnostic to ANY owned surface — including
    // one that emits to the command surfaces only — cannot pass (T042-B01).
    for (const surface of ALL_SURFACES) {
      const units = harness.outputState[surface];
      expect(
        units.length,
        `${surface} carries the failure diagnostic`,
      ).toBeGreaterThan(0);
      for (const unit of units) {
        const record = expectClosedDiagnostic(unit, "verification");
        expect(
          record.reasonCode,
          `${surface} identifies the failed isolation contract`,
        ).toBe("ISOLATION_FAILED");
      }
    }
  });

  it("a proxy adapter that rejects with raw proxy error text fails the proxy-dependent boundary contracts with closed diagnostics — the raw error, upstream, and internal host detail never appear", async () => {
    const harness = makeBoundaryHarness();
    harness.topology.proxyError = rawProxyError();

    const result = await runT042Verification(harness);

    // Every contract that needs a through-the-proxy request fails
    // independently with its documented reason code in the closed shape;
    // the proxy failure is first in the emitted order, so it is primary.
    expectBoundaryFailures(result, [
      { contract: "proxy", reasonCode: "PROXY_CONTRACT_FAILED" },
      { contract: "public-route", reasonCode: "ROUTE_UNREACHABLE" },
      { contract: "admin-route", reasonCode: "ROUTE_UNREACHABLE" },
      { contract: "server-route", reasonCode: "ROUTE_UNREACHABLE" },
    ]);
    // The raw proxy error text and the internal upstream host appear on no
    // failure surface in exact or encoded form.
    expectBoundaryRunSanitized(result, harness, [
      ...BOUNDARY_RUN_SENTINELS,
      S_RAW_PROXY_ERROR,
      S_INTERNAL_APP_HOST,
      ...recordedSpoofValues(harness),
    ]);
  });

  it("the internal endpoints' raw refusal detail and the Verification database credential never appear on any failure surface in exact or encoded form", async () => {
    const harness = makeBoundaryHarness();
    harness.topology.proxyPolicy = "client-controlled";

    const result = await runT042Verification(harness);

    expectBoundaryFailures(result, [
      { contract: "proxy", reasonCode: "PROXY_CONTRACT_FAILED" },
    ]);
    expectBoundaryRunSanitized(result, harness, [
      ...BOUNDARY_RUN_SENTINELS,
      ...recordedSpoofValues(harness),
    ]);
    // The direct-refusal sentinel rode every refused direct-connection
    // observation and the credential rode the loaded configuration; both
    // were consumed by the run — the attempts and the configuration load
    // really happened — yet neither value reached a surface.
    expect(harness.boundaryState.directAttempts.length).toBeGreaterThan(0);
    expect(harness.events).toContain("config:load");
  });
});

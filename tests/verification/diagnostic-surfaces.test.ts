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
 * fixture, forced-failure, or real-tool error.
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

/**
 * T027/T028/T029 — foundation prerequisite checking, idempotent Development
 * database setup, supervised native daily startup, bounded overall
 * readiness, and idempotent Development stop/restart.
 *
 * References: FR-003, FR-004, FR-006, FR-009, SC-001–SC-002; Operations
 * Contract §Prerequisites / §Commands / §Configuration examples / §Safe
 * diagnostic contract / §Timing boundaries; plan.md §Runtime composition /
 * §Configuration and startup + §Operations and verification +
 * §Persistence and migrations; accepted
 * T019/T020 contract `scripts/foundation-operations.test.ts`; accepted T023
 * diagnostic-surface contract `tests/verification/diagnostic-surfaces.test.ts`;
 * accepted T026 manifest `infra/compose.development.yaml`; accepted T013
 * migration boundary `apps/server/src/migrations.ts` (`applyMigrations(db)`);
 * accepted T010 canonical configuration boundary
 * `apps/server/src/config.ts` (`loadRuntimeConfiguration`); accepted T016
 * server composition boundary `apps/server/src/bootstrap.ts`
 * (`createServer`); accepted T024/T025 Public SSR / Admin CSR entries.
 *
 * This module owns ONLY the operations boundary behavior the accepted
 * contracts pin for `foundation:check`, `dev:setup`, `dev:start`,
 * `dev:ready`, `dev:stop`, and `dev:restart`:
 *   - `foundationCheck` routes every prerequisite category (Node, npm,
 *     Podman, Compose, required files, safe execution-context
 *     configuration, port availability) through the injected preflight
 *     collaborators, performs no service work of any kind, and fails
 *     non-zero with a closed Safe Diagnostic when any category fails. The
 *     npm category enforces the supported npm CLI range (`>=12.0.0 <13`,
 *     the root `engines` constraint) by parsing the version output — never
 *     by surfacing it.
 *   - `devSetup` validates the selectable local operation target and the
 *     Development/daily execution identity BEFORE any work. Configuration
 *     validation is DELEGATED to the accepted T010 canonical boundary
 *     (`loadRuntimeConfiguration`): there is no second, weaker policy
 *     here. The canonical boundary owns the six documented rejection
 *     classes and the exact Development identity (loopback-only
 *     `APP_HOST`/`PUBLIC_ORIGIN`/database host, `PUBLIC_ORIGIN` bound to
 *     `APP_HOST`/`APP_PORT` with a bare HTTP origin, and the canonical
 *     Development database user/name). `devSetup` then starts only the
 *     Development database dependency, waits boundedly for the engine to
 *     accept connections (setup dependency readiness — NOT T028
 *     whole-application readiness), and only then explicitly applies
 *     tracked migrations. Every failure is actionable, non-zero, and
 *     emitted as exactly one closed Safe Diagnostic per owned output
 *     surface — never a configuration value, credential, connection
 *     string, raw child-process output, or host/filesystem detail.
 *   - `devStart` (T028) re-validates the SAME canonical Development
 *     identity before any work, validates every daily native endpoint
 *     (derived ports in range and distinct from the Development database
 *     endpoint — T028-B02), then starts only the accepted Development
 *     database dependency plus the three native daily processes (server,
 *     Public, Admin) through the injected supervisor. Ordinary startup
 *     never applies migrations, repeated invocation creates no duplicate
 *     process or resource (adapter-owned idempotency, no hidden module
 *     state), and partial startup fails closed: any rejected
 *     configuration or failed database/process start returns non-zero
 *     with exactly one closed Safe Diagnostic per owned output surface —
 *     the command surfaces plus the application-log and HTTP-failure
 *     surfaces the started application owns — never raw adapter output.
 *   - `devReady` (T028) re-validates the canonical Development identity
 *     BEFORE probing, then polls the injected whole-foundation probe on
 *     the injected clock against the caller-supplied bounded deadline and
 *     poll interval. It returns zero only when every component of the
 *     daily readiness contract — database connectivity/migration
 *     currency, liveness, readiness, Public SSR, Admin CSR, and the
 *     server route — is ready; partial readiness keeps polling, and the
 *     bounded-deadline failure is one closed actionable Safe Diagnostic.
 *   - `devStop` (T029) stops the three supervised native processes and
 *     then the Development database container through the injected
 *     adapters. Idempotency is adapter-owned: stopping an already-stopped
 *     process or database is a no-op, so repetition is safe and produces
 *     no duplicate effect. Routine stop NEVER removes the Development
 *     named volume — this operation contains no volume-deletion or other
 *     mutation path whatsoever. A failed stop fails closed with one
 *     closed Safe Diagnostic on the command surfaces; because stop is the
 *     documented safely repeatable operation, its remediation is
 *     `RETRY_SAFE_OPERATION`.
 *   - `devRestart` (T029) performs the documented complete
 *     stop-before-start sequence: the full `dev:stop` teardown runs (and
 *     must succeed) first, and only then does the full accepted T028
 *     `dev:start` sequence run — unchanged, including its own canonical
 *     identity validation and closed failure mapping. Development data
 *     survives because the stop phase preserves the named volume and the
 *     start phase reconciles the same checkout-scoped resources.
 *
 * Determinism: all external effect is routed through the injected
 * collaborator set, so the accepted tests drive these operations with
 * fakes and no real tool, process, listener, or host mutation occurs under
 * test. The real adapters at the bottom of this file are used only by the
 * command-line entry point. Idempotency of repeated `dev:setup`,
 * `dev:start`, and `dev:stop` is owned by the adapters (`compose up
 * --detach` reconciles; `compose stop` is issued unconditionally and
 * addresses only the exact named database container, where stopping an
 * already-stopped or absent container is a successful no-op reconcile —
 * T029-B01; the migration boundary is idempotent; a native process whose
 * endpoint already accepts connections is not spawned again; a recorded
 * process that is already gone is not signalled; and a recorded process is
 * signalled only when its command-line identity is positively verified,
 * with unreadable or missing identity evidence treated as unproven
 * ownership — T029-B02), never by hidden module state.
 *
 * T030 adds `foundation:inventory`: typed, deterministic, fail-closed
 * normalization of the injected inventory inspection into the closed Owned
 * Runtime Resource shape, plus the exact resource/attachment ownership
 * predicates. It is strictly read-only and bounded to T030 — no assessment
 * evidence, confirmation token, lock, re-inventory, or mutation.
 *
 * T031 adds the confirmed destructive sequence behind `dev:reset` /
 * `foundation:cleanup`: the action-bound confirmation token minted only for
 * an exact eligible inventory, the per-operation-target lock, the immediate
 * re-inventory and assessment recomputation under that lock, drift refusal
 * (including confirmation-digest drift on a still-eligible target), and the
 * bounded individually-recorded exact-resource mutation.
 *
 * T032 adds the checkout-local lifecycle journal, the acceptance-only
 * interruption injection, and immutable primary/secondary failure semantics
 * (data-model.md §Lifecycle Operation; Operations Contract §Failure
 * behavior; FR-003/FR-017). The journal facet is optional exactly like the
 * output facet: a collaborator set without it observes no journal work at
 * all and keeps the exact accepted unjournaled behavior, while every
 * implemented mutating lifecycle action WITH it — setup (database and
 * migration phases), start, stop, restart, and the confirmed reset/cleanup —
 * writes its `running` record BEFORE any work, a record after each durable
 * phase, and a terminal record on every outcome, in the ignored
 * checkout-local mode-`0600` atomically replaced
 * `.foundation-state/<operation-target>/operation.json`. The first failure
 * of a record is its immutable `primaryFailure` and later failures append
 * as `secondaryFailures`/assessment attempt failures; an unclosed `running`
 * journal is treated as interrupted by the next invocation; a corrupt or
 * unreadable journal — or a terminal record that cannot be made durable —
 * refuses work / reports the closed non-zero result instead of success; and
 * SIGINT/SIGTERM during a journaled command records `OPERATION_INTERRUPTED`,
 * attempts only exact current-run cleanup, and re-raises the signal with the
 * conventional exit semantics, leaving the operation target
 * stopped/not-ready. The journal is instrumentation only (T032-B04): the
 * journaled `dev:setup`/`dev:start`/`dev:restart` run the EXACT accepted
 * canonical-configuration and derived-endpoint validation boundary of their
 * unjournaled paths, identically in both modes; only the acceptance-only
 * interruption injection applies its own documented bounded identity
 * refusal set to its synthetic acceptance contexts.
 *
 * T033 adds `foundation:status` (data-model.md §Recovery Assessment): the
 * normalized, read-only assessment of the pending journal origin — including
 * an unclosed `running` record, which the next invocation treats as
 * interrupted — bound to the origin operation/action/phase, the operation
 * target/runtime profile, the immutable original failure, and the normalized
 * SHA-256 evidence digests, with exactly one decision derived in the
 * documented fixed target-appropriate row order (manual-review gate, retry,
 * Development recover/reset, Verification cleanup, manual-review residual).
 * It never locks, mints a token, mutates, or recovers, so a manual-review
 * state issues no mutation evidence. `foundationRecover` remains absent —
 * the allowlisted repair (T034) owns it.
 */

import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** This module's repository root (scripts/ lives at the root). */
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Closed Safe Diagnostic vocabulary (Operations Contract §Safe diagnostic
// contract; the allowlisted sets are mirrored from the accepted closed
// schema in apps/server/src/config.ts / foundation-http.openapi.yaml).
// ---------------------------------------------------------------------------

/** The routed preflight check categories, in contract order. */
const PREFLIGHT_CHECKS = [
  "node",
  "npm",
  "podman",
  "compose",
  "requiredFiles",
  "safeConfig",
  "portAvailable",
];

/** Per-category Safe Diagnostic routing for a failed preflight check. */
const PREFLIGHT_CHECK_DIAGNOSTICS = {
  node: { component: "orchestration", remediation: "CHECK_PREREQUISITES" },
  npm: { component: "orchestration", remediation: "CHECK_PREREQUISITES" },
  podman: { component: "orchestration", remediation: "CHECK_PREREQUISITES" },
  compose: { component: "orchestration", remediation: "CHECK_PREREQUISITES" },
  requiredFiles: { component: "orchestration", remediation: "CHECK_PREREQUISITES" },
  safeConfig: { component: "configuration", remediation: "FIX_CONFIGURATION" },
  portAvailable: { component: "orchestration", remediation: "CHECK_PREREQUISITES" },
};

/** The only operation target selectable by local daily commands. */
const DAILY_OPERATION_TARGET = "development";

/**
 * The three native daily processes (plan.md §Runtime composition: the native
 * Public/Fastify/Vite composition plus the separate Admin Vite process).
 * A routed set — the contract claims no relative start order.
 */
const NATIVE_PROCESSES = ["server", "public", "admin"];

/**
 * The whole daily readiness contract (quickstart §1 / accepted T019): the
 * ordered component set `dev:ready` requires. Overall readiness holds only
 * when every listed component reports `ready` — database connectivity and
 * migration currency are carried by the `database` component observation.
 */
const READINESS_COMPONENTS = [
  "database",
  "liveness",
  "readiness",
  "publicRoute",
  "adminRoute",
  "serverRoute",
];

/**
 * Closed Safe Diagnostic routing for one not-ready readiness component (the
 * first not-ready component in contract order is reported; every value comes
 * from the accepted closed allowlists).
 */
const READINESS_COMPONENT_DIAGNOSTICS = {
  database: ["DATABASE_UNAVAILABLE", "database", "CHECK_DATABASE"],
  liveness: ["LIVENESS_FAILED", "application", "RETRY_SAFE_OPERATION"],
  readiness: ["READINESS_FAILED", "application", "RETRY_SAFE_OPERATION"],
  publicRoute: ["ROUTE_UNREACHABLE", "public", "RETRY_SAFE_OPERATION"],
  adminRoute: ["ROUTE_UNREACHABLE", "admin", "RETRY_SAFE_OPERATION"],
  serverRoute: ["ROUTE_UNREACHABLE", "application", "RETRY_SAFE_OPERATION"],
};

/**
 * Daily native-process endpoint derivation (implementation configuration,
 * not a Product decision): the Public dev server owns the documented
 * application endpoint (`APP_HOST`/`APP_PORT`, which the canonical boundary
 * binds to `PUBLIC_ORIGIN`), and the operational server and the Admin dev
 * server occupy the adjacent derived loopback ports. The single-listener
 * release composition that serves all three responsibilities on one port is
 * a later task; these adjacent ports are provisional daily-development
 * choices, and EVERY derived endpoint is validated before any work
 * (T028-B02: an occupied, colliding, or out-of-range derived endpoint must
 * fail before application work).
 */
const SERVER_PORT_OFFSET = 1;
const ADMIN_PORT_OFFSET = 2;

/** The maximum valid TCP port; every derived daily endpoint must stay in range. */
const MAX_TCP_PORT = 65535;

/**
 * Bounded engine-readiness wait (T027-B02): a detached `compose up` proves
 * container creation, not that MySQL is accepting connections. `dev:setup`
 * polls the database adapter's `isRunning` (engine accepting work) on the
 * injected clock until this bound; a first run that races database
 * initialization fails safely instead of racing migrations. This is setup
 * dependency readiness only — whole-application readiness is T028.
 */
export const DATABASE_READINESS_TIMEOUT_MS = 120_000;
export const DATABASE_READINESS_POLL_INTERVAL_MS = 500;

/** Strict decimal-integer grammar: digits only (no sign, exponent, or padding). */
const DECIMAL_INTEGER_PATTERN = /^[0-9]+$/;

/**
 * The fail-before-work seam the canonical configuration loader requires.
 * It is intentionally never invoked by validation (`apps/server/src/config.ts`
 * owns that invariant).
 */
const EMPTY_WORK_BOUNDARY = {
  createDatabasePool() {},
  bindListener() {},
  startChildService() {},
};

/**
 * Validate an execution-context record against the accepted T010 canonical
 * boundary (`loadRuntimeConfiguration`) for the Development/daily target.
 * The canonical boundary is the single configuration policy: it owns the
 * six documented rejection classes, the strict-loopback host rules, the
 * `APP_HOST`/`APP_PORT`-bound bare-HTTP public origin, and the canonical
 * Development database user/name. No second policy exists in this module.
 * The outcome's rejection diagnostic is already a closed Safe Diagnostic.
 */
async function loadCanonicalDevelopmentOutcome(config) {
  const canonical = await import("../apps/server/src/config.ts");
  return canonical.loadRuntimeConfiguration(
    config,
    DAILY_OPERATION_TARGET,
    EMPTY_WORK_BOUNDARY,
  );
}

/** Build exactly one closed Safe Diagnostic — no extra field ever. */
function safeDiagnostic(reasonCode, diagnosticScope, component, remediation, configurationKey) {
  const diagnostic = { reasonCode, diagnosticScope, component, remediation };
  if (configurationKey !== undefined) {
    diagnostic.configurationKey = configurationKey;
  }
  return diagnostic;
}

/**
 * The closed Safe Diagnostic carried by a VALIDATING configuration source
 * that refused its record (the canonical-enforcing real adapter), or `null`
 * when the thrown error carries no closed diagnostic — in which case the
 * documented missing-configuration rejection applies. Only a well-formed
 * closed diagnostic is ever unwrapped; no raw error text travels.
 */
function carriedConfigurationDiagnostic(error) {
  const carried = error?.diagnostic;
  if (
    carried !== null &&
    typeof carried === "object" &&
    !Array.isArray(carried) &&
    typeof carried.reasonCode === "string" &&
    typeof carried.diagnosticScope === "string" &&
    typeof carried.component === "string" &&
    typeof carried.remediation === "string"
  ) {
    return safeDiagnostic(
      carried.reasonCode,
      carried.diagnosticScope,
      carried.component,
      carried.remediation,
      carried.configurationKey,
    );
  }
  return null;
}

/**
 * Emit one closed Safe Diagnostic onto the command's owned output surfaces.
 * Emission is conditional on the optional output facet, so the accepted
 * deterministic fakes without it observe no emission at all.
 */
async function emitDiagnostic(collaborators, diagnostic, surfaces) {
  if (!collaborators.output) {
    return;
  }
  for (const surface of surfaces) {
    const emit = collaborators.output[surface];
    if (emit) {
      await emit(diagnostic);
    }
  }
}

/** The surfaces a rejection is reported on: command output only. */
const COMMAND_SURFACES = ["stdout", "stderr"];

/**
 * The full `dev:start` diagnostic fan-out set (accepted T023): a daily
 * startup failure is carried on the command surfaces AND on the
 * application-log / HTTP-failure surfaces the started application owns.
 */
const STARTUP_SURFACES = ["stdout", "stderr", "applicationLog", "httpFailure"];

/**
 * Reject an operation: emit the closed diagnostic and return the non-zero
 * result carrying the same safe fields. `surfaces` selects the owned output
 * surfaces for the rejecting operation (command output by default).
 */
async function rejectOperation(collaborators, diagnostic, surfaces = COMMAND_SURFACES) {
  await emitDiagnostic(collaborators, diagnostic, surfaces);
  return {
    exitCode: 1,
    reasonCode: diagnostic.reasonCode,
    diagnosticScope: diagnostic.diagnosticScope,
    component: diagnostic.component,
    configurationKey: diagnostic.configurationKey,
    remediation: diagnostic.remediation,
    diagnostics: [diagnostic],
  };
}

// ---------------------------------------------------------------------------
// Execution-context validation — the six documented rejection classes
// (quickstart §3 / Operations Contract §Configuration examples).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// T027 operations — foundation:check and dev:setup.
// ---------------------------------------------------------------------------

/**
 * `foundation:check` — route every prerequisite category through the
 * injected preflight collaborators and report the outcome without
 * performing any service work. A failed category never leads to database,
 * migration, native-process, readiness, or destructive work: this
 * operation performs none of that work under any outcome.
 */
export async function foundationCheck(collaborators) {
  const failedChecks = [];
  for (const check of PREFLIGHT_CHECKS) {
    const passed = await collaborators.preflight[check]();
    if (!passed) {
      failedChecks.push(check);
    }
  }
  if (failedChecks.length === 0) {
    return { exitCode: 0, diagnosticScope: "foundation" };
  }
  const diagnostics = failedChecks.map((check) => {
    const routing = PREFLIGHT_CHECK_DIAGNOSTICS[check];
    return safeDiagnostic(
      "PREREQUISITE_FAILED",
      "foundation",
      routing.component,
      routing.remediation,
    );
  });
  for (const diagnostic of diagnostics) {
    await emitDiagnostic(collaborators, diagnostic, COMMAND_SURFACES);
  }
  return {
    exitCode: 1,
    reasonCode: diagnostics[0].reasonCode,
    diagnosticScope: "foundation",
    component: diagnostics[0].component,
    remediation: diagnostics[0].remediation,
    diagnostics,
    failedChecks,
  };
}

/**
 * Wait boundedly for the Development database engine to accept work by
 * polling the database adapter's `isRunning` on the injected clock. This is
 * setup dependency readiness (T027-B02): a detached `compose up` must be
 * proven to yield an engine that accepts connections before migrations
 * run. Returns `null` once ready, or the non-zero result for a bounded
 * timeout / probe failure (mapped safely; raw adapter errors are never
 * surfaced).
 */
async function waitForDatabaseReadiness(collaborators) {
  const deadline = collaborators.clock.now() + DATABASE_READINESS_TIMEOUT_MS;
  for (;;) {
    let accepting;
    try {
      accepting = await collaborators.database.isRunning();
    } catch {
      return rejectOperation(
        collaborators,
        safeDiagnostic("DATABASE_UNAVAILABLE", "daily", "database", "CHECK_DATABASE"),
      );
    }
    if (accepting) {
      return null;
    }
    if (collaborators.clock.now() >= deadline) {
      return rejectOperation(
        collaborators,
        safeDiagnostic("DATABASE_UNAVAILABLE", "daily", "database", "CHECK_DATABASE"),
      );
    }
    await collaborators.clock.advance(DATABASE_READINESS_POLL_INTERVAL_MS);
  }
}

/**
 * `dev:setup` — validate the selectable local operation target and the
 * Development/daily execution identity BEFORE any work, start only the
 * Development database dependency (adapter-owned idempotency: repetition
 * creates no duplicate database resource), wait boundedly until the engine
 * accepts connections, and only then explicitly apply tracked migrations.
 * Without a journal facet this is exactly the accepted T027 sequence
 * (canonical boundary and all). With one (T032-B02), the whole setup
 * lifecycle is journalled: the `running` record is durable BEFORE any work,
 * a record follows each durable phase (database started, migrations
 * applied), the terminal record closes every outcome, and a pending origin
 * gates the run on the documented safe-retry evidence row. The journal is
 * instrumentation only (T032-B04): the journaled setup applies the SAME
 * accepted canonical validation boundary before any work, identically in
 * both modes.
 */
export async function devSetup(collaborators, target) {
  // Hosted/Production is not selectable by local commands (plan.md
  // §Configuration and startup); reject before any configuration or work.
  if (target !== DAILY_OPERATION_TARGET) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "CONFIG_IDENTITY_CONFLICT",
        "daily",
        "configuration",
        "FIX_CONFIGURATION",
      ),
    );
  }

  const opened = await openJournaledOperation(collaborators, DAILY_OPERATION_TARGET, "setup");
  if (opened.notJournaled) {
    return setupDevelopmentFoundation(collaborators);
  }
  if (opened.refused !== undefined) {
    return opened.refused;
  }
  // T032-B04 — the journal is instrumentation only: the journaled setup runs
  // the EXACT accepted T027 canonical validation boundary before any work,
  // identically to the unjournaled path (setup performs no endpoint
  // validation in the accepted contract, so neither does this path).
  const validation = await validateCanonicalDevelopmentConfiguration(collaborators);
  if (validation.rejected !== undefined) {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "setup",
      opened,
      validation.rejected,
    );
  }

  try {
    await collaborators.database.start();
  } catch {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "setup",
      opened,
      await rejectOperation(
        collaborators,
        safeDiagnostic("STARTUP_FAILED", "daily", "database", "CHECK_DATABASE"),
      ),
    );
  }
  const afterDatabase = await recordDurablePhase(
    collaborators,
    DAILY_OPERATION_TARGET,
    "setup",
    opened,
    "after-database",
  );
  if (afterDatabase.failed !== null) {
    return afterDatabase.failed;
  }

  const readinessFailure = await waitForDatabaseReadiness(collaborators);
  if (readinessFailure !== null) {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "setup",
      opened,
      readinessFailure,
    );
  }

  try {
    await collaborators.database.applyMigrations();
  } catch {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "setup",
      opened,
      await rejectOperation(
        collaborators,
        safeDiagnostic("MIGRATION_FAILED", "daily", "migration", "RUN_MIGRATION"),
      ),
    );
  }
  const afterMigration = await recordDurablePhase(
    collaborators,
    DAILY_OPERATION_TARGET,
    "setup",
    opened,
    "after-migration",
  );
  if (afterMigration.failed !== null) {
    return afterMigration.failed;
  }

  return closeJournaledOperation(
    collaborators,
    DAILY_OPERATION_TARGET,
    "setup",
    opened,
    { exitCode: 0, diagnosticScope: "daily" },
  );
}

/**
 * The unjournaled T027 setup core (a collaborator set without the journal
 * facet): validate the Development/daily execution identity through the
 * accepted T010 canonical boundary (no second policy), start only the
 * Development database dependency, wait boundedly until the engine accepts
 * connections, then explicitly apply tracked migrations. Every failure is
 * actionable and non-zero, emitted as closed Safe Diagnostics on the command
 * output surfaces only.
 */
async function setupDevelopmentFoundation(collaborators) {
  let config;
  try {
    config = await collaborators.config.load();
  } catch (error) {
    const carried = carriedConfigurationDiagnostic(error);
    return rejectOperation(
      collaborators,
      carried ??
        safeDiagnostic("CONFIG_MISSING", "daily", "configuration", "FIX_CONFIGURATION"),
    );
  }

  const outcome = await loadCanonicalDevelopmentOutcome(config);
  if (outcome.status === "rejected") {
    return rejectOperation(collaborators, outcome.diagnostic);
  }

  try {
    await collaborators.database.start();
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic("STARTUP_FAILED", "daily", "database", "CHECK_DATABASE"),
    );
  }

  const readinessFailure = await waitForDatabaseReadiness(collaborators);
  if (readinessFailure !== null) {
    return readinessFailure;
  }

  try {
    await collaborators.database.applyMigrations();
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic("MIGRATION_FAILED", "daily", "migration", "RUN_MIGRATION"),
    );
  }

  return { exitCode: 0, diagnosticScope: "daily" };
}

// ---------------------------------------------------------------------------
// T028 operations — dev:start and dev:ready.
// ---------------------------------------------------------------------------

/**
 * Load the local configuration through the injected source and validate it
 * against the accepted T010 canonical Development boundary — the single
 * configuration policy, exactly as `devSetup` applies it. Returns either
 * the canonical outcome or the already-emitted non-zero rejection result;
 * both failure classes reject BEFORE any work is accepted.
 */
async function validateCanonicalDevelopmentConfiguration(collaborators, surfaces) {
  let config;
  try {
    config = await collaborators.config.load();
  } catch (error) {
    const carried = carriedConfigurationDiagnostic(error);
    return {
      rejected: await rejectOperation(
        collaborators,
        carried ??
          safeDiagnostic("CONFIG_MISSING", "daily", "configuration", "FIX_CONFIGURATION"),
        surfaces,
      ),
    };
  }
  const outcome = await loadCanonicalDevelopmentOutcome(config);
  if (outcome.status === "rejected") {
    return { rejected: await rejectOperation(collaborators, outcome.diagnostic, surfaces) };
  }
  return { outcome };
}

/**
 * Resolve every daily native endpoint from the CANONICALLY ACCEPTED
 * configuration and validate it BEFORE any process work (T028-B02): the
 * documented application endpoint and both derived endpoints must be valid
 * in-range TCP ports, and no daily endpoint may collide with another —
 * including the Development database endpoint, which binds the same
 * loopback host. Returns the validated endpoint map, or `invalid` for an
 * out-of-range / colliding endpoint state (routed by the callers to the
 * documented rejection classes on the safe `APP_PORT` key).
 */
function resolveValidatedDailyEndpoints(configuration) {
  const applicationPorts = {
    public: configuration.port,
    server: configuration.port + SERVER_PORT_OFFSET,
    admin: configuration.port + ADMIN_PORT_OFFSET,
  };
  let databasePort = DEVELOPMENT_DATABASE_PORT;
  try {
    const parsed = Number.parseInt(new URL(configuration.databaseUrl).port, 10);
    if (Number.isInteger(parsed) && parsed >= 1) {
      databasePort = parsed;
    }
  } catch {
    // An unparseable port falls back to the documented database port above.
  }
  const ports = [...Object.values(applicationPorts), databasePort];
  const outOfRange = ports.some(
    (port) => !Number.isInteger(port) || port < 1 || port > MAX_TCP_PORT,
  );
  if (outOfRange) {
    return { invalid: "out-of-range" };
  }
  // The three application ports are distinct by construction while in
  // range; a duplicate therefore proves a collision with the database
  // endpoint (or a duplicate database declaration).
  if (new Set(ports).size !== ports.length) {
    return { invalid: "colliding" };
  }
  return {
    endpoints: { host: configuration.host, ...applicationPorts, databasePort },
  };
}

/**
 * The endpoint-validation leg shared by the daily T028 operations: derive
 * and validate every daily native endpoint from the canonical accepted
 * configuration and reject BEFORE any work when a derived endpoint is
 * out of range or collides with another daily endpoint.
 */
async function rejectInvalidDailyEndpoints(collaborators, configuration, surfaces) {
  const resolved = resolveValidatedDailyEndpoints(configuration);
  if (resolved.invalid === undefined) {
    return null;
  }
  const reasonCode =
    resolved.invalid === "out-of-range" ? "CONFIG_OUT_OF_RANGE" : "CONFIG_IDENTITY_CONFLICT";
  return rejectOperation(
    collaborators,
    safeDiagnostic(reasonCode, "daily", "configuration", "FIX_CONFIGURATION", "APP_PORT"),
    surfaces,
  );
}

/**
 * `dev:start` — supervised native daily startup (FR-003/FR-017; T028 core +
 * T032 journal lifecycle). Without a journal facet this is exactly the
 * accepted T028 sequence. With one, the operation is journalled end to end:
 * the `running` record is durable BEFORE any mutation, and the terminal
 * record closes the journal on every outcome. When the latest journal
 * leaves a pending origin — an interrupted, failed, ownership-blocked, or
 * UNCLOSED `running` record — this invocation is a recovery ATTEMPT: it is
 * permitted only when the normalized recovery evidence proves the documented
 * safe-retry row (confirmed ownership, valid/not-applicable integrity, safe
 * repeatability); any other verdict refuses the next daily action read-only
 * before any work. The attempt's terminal record binds the immutable origin
 * operation/action/phase and original failure, appends the attempt's own
 * failure as a secondary assessment failure (never replacing the origin's),
 * and resolves only on a successful retry. The origin record itself is
 * never rewritten.
 */
export async function devStart(collaborators) {
  const opened = await openJournaledOperation(
    collaborators,
    DAILY_OPERATION_TARGET,
    "start",
    STARTUP_SURFACES,
  );
  if (opened.notJournaled) {
    return startDailyFoundation(collaborators);
  }
  if (opened.refused !== undefined) {
    return opened.refused;
  }
  return runJournaledStart(collaborators, opened);
}

/**
 * The journaled start lifecycle (T032-B02): the EXACT accepted T028
 * validation boundary (canonical identity, then derived endpoints —
 * T032-B04: the journal never changes configuration semantics), then the
 * Development database and the three native processes through their
 * adapters, with a durable journal record BEFORE any work and after each
 * durable phase, and the terminal record closing every outcome (a failed
 * terminal persistence returns the closed non-zero result — T032-B03).
 */
async function runJournaledStart(collaborators, opened) {
  // T032-B04 — the journal is instrumentation only: the journaled startup
  // runs the EXACT accepted T028 validation boundary (canonical identity,
  // then derived endpoints) before any work, identically to the unjournaled
  // path, so a forbidden configuration is refused with the same closed
  // rejection and zero work in both modes.
  const validation = await validateCanonicalDevelopmentConfiguration(
    collaborators,
    STARTUP_SURFACES,
  );
  if (validation.rejected !== undefined) {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "start",
      opened,
      validation.rejected,
      STARTUP_SURFACES,
    );
  }
  const endpointRejection = await rejectInvalidDailyEndpoints(
    collaborators,
    validation.outcome.configuration,
    STARTUP_SURFACES,
  );
  if (endpointRejection !== null) {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "start",
      opened,
      endpointRejection,
      STARTUP_SURFACES,
    );
  }

  try {
    await collaborators.database.start();
  } catch {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "start",
      opened,
      await rejectOperation(
        collaborators,
        safeDiagnostic("STARTUP_FAILED", "daily", "database", "CHECK_DATABASE"),
        STARTUP_SURFACES,
      ),
      STARTUP_SURFACES,
    );
  }
  const afterDatabase = await recordDurablePhase(
    collaborators,
    DAILY_OPERATION_TARGET,
    "start",
    opened,
    "after-database",
    STARTUP_SURFACES,
  );
  if (afterDatabase.failed !== null) {
    return afterDatabase.failed;
  }

  for (const name of NATIVE_PROCESSES) {
    try {
      await collaborators.processes.start(name);
    } catch {
      return closeJournaledOperation(
        collaborators,
        DAILY_OPERATION_TARGET,
        "start",
        opened,
        await rejectOperation(
          collaborators,
          safeDiagnostic("STARTUP_FAILED", "daily", "application", "RETRY_SAFE_OPERATION"),
          STARTUP_SURFACES,
        ),
        STARTUP_SURFACES,
      );
    }
  }
  const afterProcesses = await recordDurablePhase(
    collaborators,
    DAILY_OPERATION_TARGET,
    "start",
    opened,
    "after-processes",
    STARTUP_SURFACES,
  );
  if (afterProcesses.failed !== null) {
    return afterProcesses.failed;
  }

  return closeJournaledOperation(
    collaborators,
    DAILY_OPERATION_TARGET,
    "start",
    opened,
    { exitCode: 0, diagnosticScope: "daily" },
    STARTUP_SURFACES,
  );
}

/**
 * The unjournaled T028 startup core shared by `devStart` (and unchanged for
 * a collaborator set without the journal facet): re-validate the canonical
 * Development identity before any work, start only the accepted Development
 * database dependency (adapter-owned idempotency: repetition reconciles and
 * never duplicates the resource) and then the three native daily processes
 * through the injected supervisor (also idempotent per process). Ordinary
 * startup NEVER applies migrations — only the explicit `dev:setup` /
 * `db:migrate` operations transition migration state. Partial startup fails
 * closed: the first failed start returns non-zero with one closed Safe
 * Diagnostic per owned surface and no ready/started claim is made; stopping
 * the surviving processes is the later `dev:stop` operation's owned
 * behavior, not this one's.
 */
async function startDailyFoundation(collaborators) {
  const validation = await validateCanonicalDevelopmentConfiguration(
    collaborators,
    STARTUP_SURFACES,
  );
  if (validation.rejected !== undefined) {
    return validation.rejected;
  }
  const endpointRejection = await rejectInvalidDailyEndpoints(
    collaborators,
    validation.outcome.configuration,
    STARTUP_SURFACES,
  );
  if (endpointRejection !== null) {
    return endpointRejection;
  }

  try {
    await collaborators.database.start();
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic("STARTUP_FAILED", "daily", "database", "CHECK_DATABASE"),
      STARTUP_SURFACES,
    );
  }

  for (const name of NATIVE_PROCESSES) {
    try {
      await collaborators.processes.start(name);
    } catch {
      return rejectOperation(
        collaborators,
        safeDiagnostic("STARTUP_FAILED", "daily", "application", "RETRY_SAFE_OPERATION"),
        STARTUP_SURFACES,
      );
    }
  }

  return { exitCode: 0, diagnosticScope: "daily" };
}

/**
 * The closed diagnostic for one not-ready readiness observation: the first
 * not-ready component in contract order is routed to its allowlisted
 * reason code/component/remediation; an absent/ill-formed observation (or a
 * probe that threw) is the bounded overall readiness failure. No raw probe
 * detail is ever carried.
 */
function readinessFailureDiagnostic(observation) {
  const components =
    typeof observation?.components === "object" && observation.components !== null
      ? observation.components
      : {};
  for (const component of READINESS_COMPONENTS) {
    if (components[component] !== "ready") {
      const [reasonCode, diagnosticComponent, remediation] =
        READINESS_COMPONENT_DIAGNOSTICS[component];
      return safeDiagnostic(reasonCode, "daily", diagnosticComponent, remediation);
    }
  }
  return safeDiagnostic("READINESS_FAILED", "daily", "application", "RETRY_SAFE_OPERATION");
}

/**
 * `dev:ready` — bounded overall readiness. Re-validate the canonical
 * Development identity BEFORE probing (a rejected configuration never probes
 * or accepts work), then poll the injected whole-foundation probe on the
 * injected clock against the caller-supplied bounded deadline/poll interval.
 * Zero is returned only when the probe reports the whole daily readiness
 * contract ready (the `ready` flag AND every required component); partial
 * readiness keeps polling, and the bounded-deadline failure is one closed
 * actionable Safe Diagnostic on the command surfaces.
 */
export async function devReady(collaborators, options) {
  const validation = await validateCanonicalDevelopmentConfiguration(
    collaborators,
    COMMAND_SURFACES,
  );
  if (validation.rejected !== undefined) {
    return validation.rejected;
  }
  const endpointRejection = await rejectInvalidDailyEndpoints(
    collaborators,
    validation.outcome.configuration,
    COMMAND_SURFACES,
  );
  if (endpointRejection !== null) {
    return endpointRejection;
  }

  const deadline = collaborators.clock.now() + options.deadlineMs;
  for (;;) {
    let observation = null;
    try {
      observation = await collaborators.readiness.probe();
    } catch {
      // A probe that fails is simply not-ready; no detail is surfaced.
    }
    const wholeFoundationReady =
      observation !== null &&
      observation.ready === true &&
      READINESS_COMPONENTS.every((component) => observation.components[component] === "ready");
    if (wholeFoundationReady) {
      return { exitCode: 0, diagnosticScope: "daily", ready: true };
    }
    if (collaborators.clock.now() >= deadline) {
      const failure = await rejectOperation(
        collaborators,
        readinessFailureDiagnostic(observation),
      );
      return { ...failure, ready: false };
    }
    await collaborators.clock.advance(options.pollMs);
  }
}

// ---------------------------------------------------------------------------
// T029 operations — dev:stop and dev:restart.
// ---------------------------------------------------------------------------

/**
 * `dev:stop` — idempotent daily teardown. Stop the three supervised native
 * processes and then the Development database container through the
 * injected adapters (adapter-owned idempotency: stopping an already-stopped
 * process or database is a no-op, so repetition is safe and creates no
 * duplicate effect). Routine stop NEVER removes the Development named
 * volume — this operation calls no volume-deletion or other mutation path
 * (FR-004/SC-002; volume removal belongs exclusively to the later,
 * explicitly confirmed reset/cleanup operations). A failed stop fails
 * closed with one closed Safe Diagnostic on the command surfaces; stop is
 * the documented safely repeatable operation, so its remediation is
 * `RETRY_SAFE_OPERATION` and no raw adapter detail is ever surfaced.
 * With a journal facet (T032-B02) the teardown is journalled as one
 * operation: `running` before any work, a record after each durable phase
 * (processes stopped, database stopped), and the terminal record on every
 * outcome. A pending origin does NOT gate the stop — stopping is the
 * documented safely repeatable action that moves an interrupted target
 * further toward stopped, never toward work — but a corrupt/unreadable
 * journal still refuses before any work (T032-B03).
 */
export async function devStop(collaborators) {
  const opened = await openUngatedJournalOperation(
    collaborators,
    DAILY_OPERATION_TARGET,
    "stop",
  );
  if (opened.notJournaled) {
    return stopDailyFoundation(collaborators);
  }
  if (opened.refused !== undefined) {
    return opened.refused;
  }

  for (const name of NATIVE_PROCESSES) {
    try {
      await collaborators.processes.stop(name);
    } catch {
      return closeJournaledOperation(
        collaborators,
        DAILY_OPERATION_TARGET,
        "stop",
        opened,
        await rejectOperation(
          collaborators,
          safeDiagnostic("OPERATIONAL_FAILURE", "daily", "application", "RETRY_SAFE_OPERATION"),
        ),
      );
    }
  }
  const afterProcesses = await recordDurablePhase(
    collaborators,
    DAILY_OPERATION_TARGET,
    "stop",
    opened,
    "after-processes",
  );
  if (afterProcesses.failed !== null) {
    return afterProcesses.failed;
  }
  try {
    await collaborators.database.stop();
  } catch {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "stop",
      opened,
      await rejectOperation(
        collaborators,
        safeDiagnostic("OPERATIONAL_FAILURE", "daily", "database", "RETRY_SAFE_OPERATION"),
      ),
    );
  }
  const afterDatabase = await recordDurablePhase(
    collaborators,
    DAILY_OPERATION_TARGET,
    "stop",
    opened,
    "after-database",
  );
  if (afterDatabase.failed !== null) {
    return afterDatabase.failed;
  }
  return closeJournaledOperation(collaborators, DAILY_OPERATION_TARGET, "stop", opened, {
    exitCode: 0,
    diagnosticScope: "daily",
  });
}

/**
 * The stop work core shared by `dev:stop` and the journaled restart's stop
 * phase (T029 behavior, unchanged): stop the three supervised native
 * processes then the Development database through the injected adapters.
 */
async function stopDailyFoundation(collaborators) {
  for (const name of NATIVE_PROCESSES) {
    try {
      await collaborators.processes.stop(name);
    } catch {
      return rejectOperation(
        collaborators,
        safeDiagnostic(
          "OPERATIONAL_FAILURE",
          "daily",
          "application",
          "RETRY_SAFE_OPERATION",
        ),
      );
    }
  }
  try {
    await collaborators.database.stop();
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic("OPERATIONAL_FAILURE", "daily", "database", "RETRY_SAFE_OPERATION"),
    );
  }
  return { exitCode: 0, diagnosticScope: "daily" };
}

/**
 * `dev:restart` — the documented complete stop-before-start sequence: the
 * FULL stop teardown runs first and must succeed, and only then does the
 * FULL start sequence run — unchanged for a collaborator set without the
 * journal facet (the FULL accepted T028 `dev:start` with its own canonical
 * identity validation, endpoint validation, and closed failure mapping).
 * With a journal facet (T032-B02) the WHOLE restart lifecycle is one
 * journalled operation: `running` before any work, a durable record after
 * the stop phase and after the start phase, and the terminal record on
 * every outcome. The journal is instrumentation only (T032-B04): the
 * restart's start phase runs the EXACT accepted T028 validation boundary
 * (canonical identity, then derived endpoints) after the stop phase and
 * before any start work, identically in both modes. Development data
 * survives the sequence because the stop phase preserves the Development
 * named volume and the start phase reconciles the same checkout-scoped
 * resources; a failed phase returns exactly that phase's documented
 * non-zero result.
 */
export async function devRestart(collaborators) {
  const opened = await openJournaledOperation(
    collaborators,
    DAILY_OPERATION_TARGET,
    "restart",
  );
  if (opened.notJournaled) {
    const stopped = await stopDailyFoundation(collaborators);
    if (stopped.exitCode !== 0) {
      return stopped;
    }
    return startDailyFoundation(collaborators);
  }
  if (opened.refused !== undefined) {
    return opened.refused;
  }

  const stopped = await stopDailyFoundation(collaborators);
  if (stopped.exitCode !== 0) {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "restart",
      opened,
      stopped,
    );
  }
  const afterStop = await recordDurablePhase(
    collaborators,
    DAILY_OPERATION_TARGET,
    "restart",
    opened,
    "after-stop",
  );
  if (afterStop.failed !== null) {
    return afterStop.failed;
  }

  // T032-B04 — the journal is instrumentation only: the restart's start
  // phase runs the EXACT accepted T028 validation boundary (canonical
  // identity, then derived endpoints) after the stop phase and before any
  // start work, identically to the unjournaled stop-then-start sequence.
  const validation = await validateCanonicalDevelopmentConfiguration(
    collaborators,
    STARTUP_SURFACES,
  );
  if (validation.rejected !== undefined) {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "restart",
      opened,
      validation.rejected,
      STARTUP_SURFACES,
    );
  }
  const endpointRejection = await rejectInvalidDailyEndpoints(
    collaborators,
    validation.outcome.configuration,
    STARTUP_SURFACES,
  );
  if (endpointRejection !== null) {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "restart",
      opened,
      endpointRejection,
      STARTUP_SURFACES,
    );
  }

  const started = await runJournaledStartWork(collaborators);
  if (started.exitCode !== 0) {
    return closeJournaledOperation(
      collaborators,
      DAILY_OPERATION_TARGET,
      "restart",
      opened,
      started,
      STARTUP_SURFACES,
    );
  }
  const afterStart = await recordDurablePhase(
    collaborators,
    DAILY_OPERATION_TARGET,
    "restart",
    opened,
    "after-start",
    STARTUP_SURFACES,
  );
  if (afterStart.failed !== null) {
    return afterStart.failed;
  }
  return closeJournaledOperation(
    collaborators,
    DAILY_OPERATION_TARGET,
    "restart",
    opened,
    { exitCode: 0, diagnosticScope: "daily" },
    STARTUP_SURFACES,
  );
}

// ---------------------------------------------------------------------------
// T032 shared journal machinery — the normalized Lifecycle Operation record,
// the optional journal facet, strict pending-origin classification (an
// unclosed `running` journal is treated as interrupted by the next
// invocation; a corrupt/unreadable one refuses work), the safe-retry evidence
// gate for daily actions, and the journaled synthetic-acceptance lifecycle
// helpers (data-model.md §Lifecycle Operation; Operations Contract §Failure
// behavior). The journal facet is optional exactly like the output facet:
// operations journal only when the injected (or command-line) collaborator set
// provides the store, so the accepted contracts without it observe no journal
// work at all and keep their exact unjournaled behavior.
// ---------------------------------------------------------------------------

/**
 * The one externally documented allowlisted journal phase (quickstart §5):
 * the journal is durably recorded BEFORE any service work, so a record at
 * this phase is the pre-mutation durable state every journaled operation
 * starts from. The module's closed phase set is this pre-work phase plus the
 * internal durable-phase boundaries the implemented lifecycle actions record
 * after each phase's adapter work settles (data-model §Lifecycle Operation
 * `phase`: last durably recorded phase): `after-database`, `after-migration`,
 * `after-processes`, `after-stop`, and `after-start`.
 */
const JOURNAL_PRE_WORK_PHASE = "after-journal";

/** The runtime profile each operation target runs (plan.md identity map). */
const RUNTIME_PROFILE_BY_TARGET = {
  development: "daily",
  verification: "verification",
};

/** The local-safe fixture provenance values (the canonical allowlist). */
const LOCAL_FIXTURE_PROVENANCE = ["synthetic", "approved-non-production"];

/**
 * The closed interruption Safe Diagnostic (Operations Contract §Failure
 * behavior): the documented reason code on the operation's derived scope,
 * routed to the bounded safe-remediation vocabulary. It is the synthesized
 * primary failure of every signal/interruption record.
 */
function interruptionDiagnostic(diagnosticScope) {
  return safeDiagnostic(
    "OPERATION_INTERRUPTED",
    diagnosticScope,
    "orchestration",
    "RETRY_SAFE_OPERATION",
  );
}

/** A fresh opaque local operation identifier (safe, non-secret). */
function newOperationId() {
  return randomUUID();
}

/**
 * The canonical SHA-256 digest of one normalized journal binding. Digests
 * bind the exact operation identity (and, for attempts, the assessment
 * evidence) into the record; the value is correlation evidence only and is
 * never emitted as ordinary output.
 */
function journalDigest(binding) {
  return createHash("sha256").update(JSON.stringify(binding)).digest("hex");
}

/** One non-empty string field of untrusted normalized evidence, else `null`. */
function nonEmptyStringField(value, name) {
  const field = value === null || typeof value !== "object" ? undefined : value[name];
  return typeof field === "string" && field.length > 0 ? field : null;
}

/** The closed journal-record state enum (data-model §Lifecycle Operation). */
const JOURNAL_STATES = ["running", "passed", "failed", "interrupted", "ownership-blocked"];

/**
 * Strictly classify the latest journal record (T032-B03): `none` when no
 * journal exists or the record is well-formed and passed; `origin` when a
 * well-formed non-passed record — `interrupted`, `failed`,
 * `ownership-blocked`, or an UNCLOSED `running` record from a run that died
 * without its terminal write — is pending (Operations Contract §Failure
 * behavior: an unclosed `running` journal is treated as interrupted); and
 * `corrupt` for anything malformed: a non-object record, a state outside the
 * closed enum, a missing/empty `operationId`, a non-object `primaryFailure`,
 * or a non-array `secondaryFailures`. A corrupt record NEVER normalizes to
 * absence — the caller refuses work, because incompatible/corrupted state
 * must not let an operation proceed.
 */
function classifyJournalRecord(record, diagnosticScope) {
  if (record === null || record === undefined) {
    return { status: "none" };
  }
  if (typeof record !== "object" || Array.isArray(record)) {
    return { status: "corrupt" };
  }
  if (!JOURNAL_STATES.includes(record.state)) {
    return { status: "corrupt" };
  }
  const operationId = nonEmptyStringField(record, "operationId");
  if (operationId === null) {
    return { status: "corrupt" };
  }
  if (record.secondaryFailures !== undefined && !Array.isArray(record.secondaryFailures)) {
    return { status: "corrupt" };
  }
  const recorded = record.primaryFailure;
  if (
    recorded !== undefined &&
    (typeof recorded !== "object" || recorded === null || Array.isArray(recorded))
  ) {
    return { status: "corrupt" };
  }
  if (record.state === "passed") {
    return { status: "none" };
  }
  return {
    status: "origin",
    origin: {
      operationId,
      action: nonEmptyStringField(record, "action"),
      phase: nonEmptyStringField(record, "phase"),
      primaryFailure: recorded ?? interruptionDiagnostic(diagnosticScope),
    },
  };
}

/**
 * Read and strictly classify the pending journal state through the journal
 * facet. An absent facet reports `journaled: false` so callers keep their
 * exact unjournaled behavior. A facet whose read THROWS — or whose store
 * surfaces an unparsable/malformed record — reports `corrupt` (T032-B03):
 * unreadable or malformed required journal evidence refuses work, never
 * silently normalizes to "no journal".
 */
async function readPendingOrigin(collaborators, target) {
  if (collaborators.journal === undefined || collaborators.journal === null) {
    return { journaled: false, corrupt: false, origin: null };
  }
  let record;
  try {
    record = await collaborators.journal.readLatest(target);
  } catch {
    return { journaled: true, corrupt: true, origin: null };
  }
  const classified = classifyJournalRecord(record, DIAGNOSTIC_SCOPE_BY_TARGET[target]);
  if (classified.status === "corrupt") {
    return { journaled: true, corrupt: true, origin: null };
  }
  if (classified.status === "none") {
    return { journaled: true, corrupt: false, origin: null };
  }
  return { journaled: true, corrupt: false, origin: classified.origin };
}

/**
 * The closed refusal for unreadable/corrupt required journal evidence
 * (T032-B03): no work of any kind proceeds, and the state is routed to
 * inspection — classifying incompatible/corrupted state is the recovery
 * assessment's boundary (T033), so the operation only refuses safely.
 */
function journalIntegrityRefusal(collaborators, target, surfaces = COMMAND_SURFACES) {
  return rejectOperation(
    collaborators,
    safeDiagnostic(
      "OPERATIONAL_FAILURE",
      DIAGNOSTIC_SCOPE_BY_TARGET[target] ?? "foundation",
      "orchestration",
      "INSPECT_OWNERSHIP",
    ),
    surfaces,
  );
}

/**
 * The closed non-zero result for a failed REQUIRED journal persistence
 * (T032-B03): when a terminal record cannot be made durable the operation
 * reports failure instead of success, so no command ever claims an outcome
 * whose durable journal state stays ambiguous (`running`).
 */
function terminalPersistenceFailure(collaborators, target, surfaces = COMMAND_SURFACES) {
  return rejectOperation(
    collaborators,
    safeDiagnostic(
      "OPERATIONAL_FAILURE",
      DIAGNOSTIC_SCOPE_BY_TARGET[target] ?? "foundation",
      "orchestration",
      "INSPECT_OWNERSHIP",
    ),
    surfaces,
  );
}

/**
 * Whether the normalized recovery evidence proves the documented safe-retry
 * row for a daily action (Operations Contract decision row 2): confirmed
 * ownership, valid or not-applicable integrity, and safe repeatability. Any
 * other verdict — unknown, unconfirmed, invalid, or unsafe — refuses the
 * next daily action read-only until the full ordered assessment (T033)
 * routes it; the evidence object is untrusted collaborator input, so every
 * verdict must be proven exactly.
 */
function safeRetryEvidence(evidence) {
  if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) {
    return false;
  }
  return (
    evidence.ownershipVerdict === "confirmed" &&
    (evidence.integrityVerdict === "valid" || evidence.integrityVerdict === "not-applicable") &&
    evidence.repeatabilityVerdict === "safe"
  );
}

/**
 * The one UTC journal timestamp source: the injected clock when present (the
 * accepted deterministic fakes), wall-clock time only on the real
 * command-line path. Timestamps are journal evidence only and are never
 * emitted in ordinary diagnostics.
 */
function journalTimestamp(collaborators) {
  const now =
    typeof collaborators.clock?.now === "function" ? collaborators.clock.now() : Date.now();
  return new Date(now).toISOString();
}

/**
 * The closed Safe Diagnostic for one non-zero operation result — the exact
 * diagnostic the operation already emitted, never a synthesized or raw one.
 * It becomes the attempt's appended secondary failure.
 */
function resultFailureDiagnostic(result) {
  const first = Array.isArray(result?.diagnostics) ? result.diagnostics[0] : undefined;
  if (first !== null && typeof first === "object") {
    return safeDiagnostic(
      first.reasonCode,
      first.diagnosticScope,
      first.component,
      first.remediation,
      first.configurationKey,
    );
  }
  return safeDiagnostic(
    result?.reasonCode ?? "OPERATIONAL_FAILURE",
    result?.diagnosticScope ?? "daily",
    result?.component ?? "orchestration",
    result?.remediation ?? "RETRY_SAFE_OPERATION",
    result?.configurationKey,
  );
}

/**
 * The bounded local execution-identity validation of the acceptance-only
 * interruption injection (T032-B04 bounds it to that surface alone — the
 * lifecycle commands run the exact canonical boundary in both modes): the
 * environment must be the local `development` environment, the runtime
 * profile must be the operation target's own profile (a hosted or mismatched
 * profile is an identity conflict), and the fixture provenance must be
 * local-safe (Production-derived values are unsupported here). This is
 * deliberately NOT a second configuration policy for the lifecycle
 * commands: the full canonical boundary remains the single policy.
 */
function localExecutionIdentityRejection(config, target) {
  const diagnosticScope = DIAGNOSTIC_SCOPE_BY_TARGET[target] ?? "foundation";
  if (config.APP_ENVIRONMENT !== "development") {
    return safeDiagnostic(
      "CONFIG_IDENTITY_CONFLICT",
      diagnosticScope,
      "configuration",
      "FIX_CONFIGURATION",
      "APP_ENVIRONMENT",
    );
  }
  if (config.RUNTIME_PROFILE !== RUNTIME_PROFILE_BY_TARGET[target]) {
    return safeDiagnostic(
      "CONFIG_IDENTITY_CONFLICT",
      diagnosticScope,
      "configuration",
      "FIX_CONFIGURATION",
      "RUNTIME_PROFILE",
    );
  }
  if (
    typeof config.FIXTURE_PROVENANCE !== "string" ||
    !LOCAL_FIXTURE_PROVENANCE.includes(config.FIXTURE_PROVENANCE)
  ) {
    return safeDiagnostic(
      "CONFIG_UNSUPPORTED",
      diagnosticScope,
      "configuration",
      "FIX_CONFIGURATION",
      "FIXTURE_PROVENANCE",
    );
  }
  return null;
}

/**
 * Load the execution context for the acceptance-only interruption injection
 * (NOT the lifecycle commands — those run the exact canonical boundary in
 * both modes, T032-B04). A source that throws a CARRIED closed diagnostic
 * (the validating real source enforcing the canonical boundary) is refused
 * with exactly that diagnostic; any other load failure is the documented
 * missing-configuration rejection; a loaded record is then checked against
 * the bounded local identity rules above (the injector's own contract: it
 * refuses hosted and Production-derived configuration). Returns
 * `{ config }` or `{ rejected }` with the closed diagnostic.
 */
async function loadLifecycleConfiguration(collaborators, target) {
  let config;
  try {
    config = await collaborators.config.load();
  } catch (error) {
    const carried = carriedConfigurationDiagnostic(error);
    if (carried !== null) {
      return { rejected: carried };
    }
    return {
      rejected: safeDiagnostic(
        "CONFIG_MISSING",
        DIAGNOSTIC_SCOPE_BY_TARGET[target] ?? "foundation",
        "configuration",
        "FIX_CONFIGURATION",
      ),
    };
  }
  const identityRejection = localExecutionIdentityRejection(config, target);
  if (identityRejection !== null) {
    return { rejected: identityRejection };
  }
  return { config };
}

/**
 * The active journaled-operation signal context (process-local runtime
 * state, exactly like the confirmation-evidence bindings): the CLI signal
 * guard reads it to record `OPERATION_INTERRUPTED` and attempt only exact
 * current-run cleanup while a journaled operation is between its pre-mutation
 * and terminal records. `signalled` suppresses the wrapper's terminal write
 * so the interruption record stays the durable terminal state.
 */
let activeJournalContext = null;

/**
 * Write the pre-mutation `running` record. Durability precedes mutation
 * (Operations Contract §Failure behavior), so a journal that cannot be
 * written refuses the operation BEFORE any work; the refusal is the closed
 * operational failure, never a raw filesystem error.
 */
async function writeRunningRecord(collaborators, target, record) {
  try {
    await collaborators.journal.write(target, record);
    activeJournalContext = { journal: collaborators.journal, target, record, signalled: false };
  } catch {
    activeJournalContext = null;
    return false;
  }
  return true;
}

/**
 * Write one intermediate durable-phase record (T032-B02: the journal is
 * updated after every durable phase, not only at the terminals). Required
 * evidence: a phase record that cannot be made durable stops the operation
 * before its next phase (the caller records the terminal failure and returns
 * the closed non-zero result) — the durable state must never silently fall
 * behind the work that already happened.
 */
async function writePhaseRecord(collaborators, target, record) {
  try {
    await collaborators.journal.write(target, record);
    if (activeJournalContext !== null && activeJournalContext.target === target) {
      activeJournalContext.record = record;
    }
  } catch {
    return false;
  }
  return true;
}

/**
 * Write the terminal record (T032-B03: required, not best-effort). Returns
 * whether the durable terminal state was recorded; a signal-recorded
 * interruption is the terminal state and counts as recorded. The CALLER
 * translates `false` into the closed non-zero result — no operation reports
 * success while its journal is left unambiguously `running`.
 */
async function writeTerminalRecord(target, record) {
  const context = activeJournalContext;
  activeJournalContext = null;
  if (context !== null && context.signalled) {
    return true;
  }
  const journal = context === null ? null : context.journal;
  if (journal === null) {
    return false;
  }
  try {
    await journal.write(target, record);
  } catch {
    return false;
  }
  return true;
}

/**
 * The recovery-assessment evidence bound into an ATTEMPT's terminal record
 * (data-model.md §Recovery Assessment, the field subset T032 owns): the
 * immutable link to the origin operation/action/phase, the origin's
 * immutable original failure, the attempt's own appended failures, and the
 * postcheck-gated resolution. Deriving the ordered decision from raw checks
 * is T033's boundary; the attempt records the decision it acted under.
 */
function attemptAssessment(target, action, origin, decision, evidence, attemptFailures, resolved, digests) {
  return {
    originOperationId: origin.operationId,
    originAction: origin.action,
    originPhase: origin.phase,
    originalFailure: origin.primaryFailure,
    operationTarget: target,
    runtimeProfile: RUNTIME_PROFILE_BY_TARGET[target],
    decision,
    inventoryDigest: digests.inventoryDigest,
    integrityEvidenceDigest:
      nonEmptyStringField(evidence, "integrityEvidenceDigest") ??
      journalDigest({ evidence: "integrity", operationTarget: target, action }),
    mutationPlanDigest: digests.mutationPlanDigest,
    attemptFailures,
    resolution: resolved ? "resolved" : "unresolved",
  };
}

/**
 * Open one journaled lifecycle operation: strictly classify the pending
 * journal (a corrupt/unreadable one refuses before ANY work — T032-B03),
 * gate a pending origin on the documented safe-retry evidence row, then make
 * the `running` record durable BEFORE any work (T032-B02). Returns the
 * opened context `{ operationId, origin, evidence, digests, record }`, or
 * the already-emitted non-zero refusal.
 */
async function openJournaledOperation(collaborators, target, action, surfaces) {
  const { journaled, corrupt, origin } = await readPendingOrigin(collaborators, target);
  if (!journaled) {
    return { notJournaled: true };
  }
  if (corrupt) {
    return { refused: await journalIntegrityRefusal(collaborators, target, surfaces) };
  }
  let attempt = null;
  if (origin !== null) {
    let evidence = null;
    try {
      evidence = (await collaborators.assessment?.evaluate(target)) ?? null;
    } catch {
      evidence = null;
    }
    if (!safeRetryEvidence(evidence)) {
      return {
        refused: await rejectOperation(
          collaborators,
          safeDiagnostic("OPERATIONAL_FAILURE", DIAGNOSTIC_SCOPE_BY_TARGET[target], "orchestration", "INSPECT_OWNERSHIP"),
          surfaces,
        ),
      };
    }
    attempt = { origin, evidence };
  }
  const operationId = newOperationId();
  const binding = { operationTarget: target, action, operationId };
  const digests = {
    inventoryDigest:
      nonEmptyStringField(attempt?.evidence, "inventoryDigest") ??
      journalDigest({ ...binding, scope: "inventory" }),
    mutationPlanDigest:
      nonEmptyStringField(attempt?.evidence, "mutationPlanDigest") ??
      journalDigest({ ...binding, scope: "mutation-plan" }),
  };
  const startedAt = journalTimestamp(collaborators);
  const record = {
    operationId,
    operationTarget: target,
    runtimeProfile: RUNTIME_PROFILE_BY_TARGET[target],
    action,
    phase: JOURNAL_PRE_WORK_PHASE,
    state: "running",
    inventoryDigest: digests.inventoryDigest,
    mutationPlanDigest: digests.mutationPlanDigest,
    secondaryFailures: [],
    startedAt,
    updatedAt: startedAt,
  };
  if (!(await writeRunningRecord(collaborators, target, record))) {
    return {
      refused: await rejectOperation(
        collaborators,
        safeDiagnostic("OPERATIONAL_FAILURE", DIAGNOSTIC_SCOPE_BY_TARGET[target], "orchestration", "RETRY_SAFE_OPERATION"),
        surfaces,
      ),
    };
  }
  return { operationId, attempt, digests, record };
}

/**
 * Close one journaled lifecycle operation with its terminal record and map
 * the outcome to the command result (T032-B03): a terminal record that
 * cannot be made durable returns the closed non-zero result instead of the
 * operation's own outcome, and an ATTEMPT's terminal record carries the
 * immutable origin binding with the attempt's own failures appended as
 * secondaries.
 */
async function closeJournaledOperation(collaborators, target, action, opened, result, surfaces) {
  const failed = result.exitCode !== 0;
  const attemptFailure = failed ? resultFailureDiagnostic(result) : null;
  const persisted = await writeTerminalRecord(target, {
    ...opened.record,
    state: failed ? "failed" : "passed",
    primaryFailure: attemptFailure ?? undefined,
    secondaryFailures: [],
    recoveryAssessment:
      opened.attempt === null
        ? undefined
        : attemptAssessment(
            target,
            action,
            opened.attempt.origin,
            // The daily lifecycle attempts are gated on the documented
            // safe-retry row, so "retry" is the decision they acted under.
            "retry",
            opened.attempt.evidence,
            attemptFailure === null ? [] : [attemptFailure],
            !failed,
            opened.digests,
          ),
    safeNextAction: failed ? (result.remediation ?? "RETRY_SAFE_OPERATION") : undefined,
    updatedAt: journalTimestamp(collaborators),
  });
  if (!persisted) {
    return terminalPersistenceFailure(collaborators, target, surfaces);
  }
  return result;
}

/**
 * Record one completed durable phase (T032-B02) and, when the phase record
 * cannot be made durable, close the operation as failed with the closed
 * non-zero result (T032-B03) — returning `{ failed: result }` so the caller
 * stops before the next phase.
 */
async function recordDurablePhase(collaborators, target, action, opened, phase, surfaces) {
  const record = { ...opened.record, phase, updatedAt: journalTimestamp(collaborators) };
  opened.record = record;
  if (await writePhaseRecord(collaborators, target, record)) {
    return { failed: null };
  }
  const failure = await terminalPersistenceFailure(collaborators, target, surfaces);
  return {
    failed: await closeJournaledOperation(collaborators, target, action, opened, failure, surfaces),
  };
}

/**
 * Open a journaled operation whose action is the documented SAFELY
 * REPEATABLE teardown (`stop`): identical to `openJournaledOperation` except
 * that a pending origin does NOT gate the run — stopping moves an
 * interrupted target further toward stopped, never toward work — while a
 * corrupt/unreadable journal still refuses before any work (T032-B03).
 */
async function openUngatedJournalOperation(collaborators, target, action) {
  const { journaled, corrupt } = await readPendingOrigin(collaborators, target);
  if (!journaled) {
    return { notJournaled: true };
  }
  if (corrupt) {
    return { refused: await journalIntegrityRefusal(collaborators, target) };
  }
  const operationId = newOperationId();
  const binding = { operationTarget: target, action, operationId };
  const startedAt = journalTimestamp(collaborators);
  const record = {
    operationId,
    operationTarget: target,
    runtimeProfile: RUNTIME_PROFILE_BY_TARGET[target],
    action,
    phase: JOURNAL_PRE_WORK_PHASE,
    state: "running",
    inventoryDigest: journalDigest({ ...binding, scope: "inventory" }),
    mutationPlanDigest: journalDigest({ ...binding, scope: "mutation-plan" }),
    secondaryFailures: [],
    startedAt,
    updatedAt: startedAt,
  };
  if (!(await writeRunningRecord(collaborators, target, record))) {
    return {
      refused: await rejectOperation(
        collaborators,
        safeDiagnostic("OPERATIONAL_FAILURE", DIAGNOSTIC_SCOPE_BY_TARGET[target], "orchestration", "RETRY_SAFE_OPERATION"),
      ),
    };
  }
  return { operationId, attempt: null, digests: {
    inventoryDigest: record.inventoryDigest,
    mutationPlanDigest: record.mutationPlanDigest,
  }, record };
}

/**
 * The start adapter work of the journaled restart lifecycle (T032-B01): the
 * Development database and the three native processes through their
 * adapters with the accepted closed failure mappings on the startup-owned
 * surfaces. The CALLER records the durable phases and closes the journal.
 */
async function runJournaledStartWork(collaborators) {
  try {
    await collaborators.database.start();
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic("STARTUP_FAILED", "daily", "database", "CHECK_DATABASE"),
      STARTUP_SURFACES,
    );
  }
  for (const name of NATIVE_PROCESSES) {
    try {
      await collaborators.processes.start(name);
    } catch {
      return rejectOperation(
        collaborators,
        safeDiagnostic("STARTUP_FAILED", "daily", "application", "RETRY_SAFE_OPERATION"),
        STARTUP_SURFACES,
      );
    }
  }
  return { exitCode: 0, diagnosticScope: "daily" };
}


// ---------------------------------------------------------------------------
// T030/T031 operations — typed read-only normalization of the injected
// inventory inspection plus the exact resource/attachment ownership predicates
// (data-model.md §Owned Runtime Resource), the action-bound confirmation
// token issued only for an exact eligible inventory, and the confirmed
// destructive sequence that locks the operation target, immediately
// re-inventories, recomputes the applicable assessment evidence, refuses
// drift, and mutates only individually recorded exact resources
// (data-model.md §Resource Inventory).
// ---------------------------------------------------------------------------

/**
 * The manifest ownership schema every Delivery-owned resource must carry
 * (`org.songhealth.foundation.ownership-schema` in
 * `infra/compose.development.yaml`). An observation whose schema is not the
 * current one is stale and therefore blocked.
 */
const OWNERSHIP_SCHEMA_VERSION = "v1";

/**
 * The closed resource-type set, in the deterministic order the normalized
 * inventory is emitted in (containers, then networks, then volumes).
 */
const RESOURCE_TYPES = ["container", "network", "volume"];

/**
 * The complete custom reverse-DNS ownership label set every manifest resource
 * carries (contract §Operation-target ownership and isolation). Completeness
 * of this exact set is one conjunct of exact ownership: no single name prefix
 * or provider label is sufficient.
 */
const OWNERSHIP_LABEL_KEYS = [
  "org.songhealth.foundation.delivery",
  "org.songhealth.foundation.checkout",
  "org.songhealth.foundation.environment",
  "org.songhealth.foundation.runtime-profile",
  "org.songhealth.foundation.operation-target",
  "org.songhealth.foundation.resource",
  "org.songhealth.foundation.ownership-schema",
];

/**
 * The recorded exact resources of each local operation target: the manifest
 * role key (the allowlisted `logicalKey` enum) paired with the resource type
 * that manifest role is expected to be observed as. These are the only
 * resources a confirmed destructive action for that target may ever touch, so
 * they are also the only keys ordinary inventory output may ever carry — any
 * other observed key is a stale, mislabeled, or foreign candidate and
 * normalizes to blocked.
 */
const TARGET_RESOURCES = {
  development: [
    { logicalKey: "development.database", resourceType: "container" },
    { logicalKey: "development.database-volume", resourceType: "volume" },
  ],
  verification: [
    { logicalKey: "verification.nginx", resourceType: "container" },
    { logicalKey: "verification.network", resourceType: "network" },
  ],
};

/** The read-only inventory action: normalized evidence only. */
const STATUS_ACTION = "status";

/**
 * The destructive action each operation target routes to. The contract binds
 * reset↔Development and cleanup↔Verification 1:1, so the pairing is a closed
 * map rather than an orthogonal choice: a valid target presented with the
 * other target's destructive action is refused exactly like an unknown
 * action. This is target/action routing only — it confers no confirmation.
 */
const DESTRUCTIVE_ACTION_BY_TARGET = {
  development: "reset",
  verification: "cleanup",
};

/**
 * The assessment-evidence predicate each destructive action is gated on
 * (data-model.md §Resource Inventory: a token is emitted only when ownership
 * AND every action-specific predicate pass). Reset requires the Data Store to
 * be confirmed reconstructible; cleanup requires every target resource to be
 * confirmed disposable. The evidence object is untrusted collaborator input,
 * so the predicate is proven only by the field being exactly `true`.
 */
const ASSESSMENT_PREDICATE_BY_ACTION = {
  reset: "reconstructibilityConfirmed",
  cleanup: "disposabilityConfirmed",
};

/**
 * The derived diagnostic scope of each operation target (Operations Contract
 * §Configuration examples): a Development command reports `daily`, a
 * Verification command reports `verification`. Only cross-target preflight
 * may report `foundation`.
 */
const DIAGNOSTIC_SCOPE_BY_TARGET = {
  development: "daily",
  verification: "verification",
};

/**
 * The closed per-type runtime-state allowlists (data-model.md §Owned Runtime
 * Resource `runtimeState`: only the state needed for the requested action,
 * drawn from a closed enum). A state outside the candidate's own type set is
 * not normalizable and therefore blocks the resource.
 */
const RUNTIME_STATES_BY_TYPE = {
  container: ["created", "exited", "paused", "running", "stopped"],
  network: ["present"],
  volume: ["present"],
};

/** The exact-ownership conjuncts typed inspection must prove, in model order. */
const OWNERSHIP_CONJUNCTS = [
  "typeMatches",
  "nameMatches",
  "checkoutProjectMatches",
  "manifestMember",
  "canonicalLabelsComplete",
  "ownershipSchemaCurrent",
  "attachmentsExpected",
];

/** Index one target's recorded resources by manifest role key. */
function indexTargetResources(target) {
  const byKey = new Map();
  for (const entry of TARGET_RESOURCES[target]) {
    byKey.set(entry.logicalKey, entry);
  }
  return byKey;
}

/** Read one non-empty string field from an untrusted candidate, else `null`. */
function readNonEmptyString(candidate, name) {
  const value = candidate[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * The custom-label completeness conjunct (T020-B01): derived solely from the
 * observed label map against the complete documented set, because the model
 * deliberately carries no separate completeness boolean. A partial set — any
 * one documented key missing, or present with an empty or non-string value —
 * leaves the conjunct unmet. Label values are never ownership evidence and
 * never reach ordinary output.
 */
function hasCompleteOwnershipLabelSet(customLabels) {
  if (customLabels === null || typeof customLabels !== "object" || Array.isArray(customLabels)) {
    return false;
  }
  return OWNERSHIP_LABEL_KEYS.every((key) => {
    const value = customLabels[key];
    return typeof value === "string" && value.length > 0;
  });
}

/**
 * Normalize one raw inspection candidate into the closed Owned Runtime
 * Resource shape. Every field of the candidate is untrusted input: a
 * candidate that is not a well-formed object, whose role key is not in this
 * target's manifest allowlist, whose observed type contradicts the manifest's
 * expected type for that key, whose runtime state is outside its own type's
 * closed allowlist, or for which any ownership conjunct is not proven
 * `true`, normalizes to a BLOCKED read-only record. Nothing from the raw
 * candidate is ever passed through: `logicalKey` stays `null` when no
 * allowlisted role can be attributed, so such a candidate cannot appear in
 * ordinary output at all.
 */
function normalizeOwnedRuntimeResource(candidate, expectedByKey) {
  const record = {
    logicalKey: null,
    resourceType: null,
    ownership: "blocked",
    runtimeState: null,
  };
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return record;
  }
  const logicalKey = readNonEmptyString(candidate, "logicalKey");
  const expected = logicalKey === null ? undefined : expectedByKey.get(logicalKey);
  if (expected === undefined) {
    return record;
  }
  record.logicalKey = logicalKey;
  if (candidate.resourceType !== expected.resourceType) {
    return record;
  }
  record.resourceType = expected.resourceType;
  const runtimeState = readNonEmptyString(candidate, "runtimeState");
  if (runtimeState === null || !RUNTIME_STATES_BY_TYPE[record.resourceType].includes(runtimeState)) {
    return record;
  }
  record.runtimeState = runtimeState;
  // Exact ownership is the full conjunction: any conjunct that is not proven
  // `true` — absent, false, or malformed — leaves it unproven, and an
  // unexpected attachment/use is a blocked-ownership trigger in its own right.
  if (OWNERSHIP_CONJUNCTS.some((conjunct) => candidate[conjunct] !== true)) {
    return record;
  }
  if (candidate.unexpectedlyAttached !== false) {
    return record;
  }
  if (!hasCompleteOwnershipLabelSet(candidate.customLabels)) {
    return record;
  }
  record.ownership = "exact";
  return record;
}

/** Deterministic inventory order: resource type, then manifest role key. */
function compareInventoryRecords(left, right) {
  const typeOrder =
    RESOURCE_TYPES.indexOf(left.resourceType) - RESOURCE_TYPES.indexOf(right.resourceType);
  if (typeOrder !== 0) {
    return typeOrder;
  }
  return left.logicalKey < right.logicalKey ? -1 : left.logicalKey > right.logicalKey ? 1 : 0;
}

/**
 * Normalize one target's raw inspection into the complete ordered target
 * inventory. Every expected manifest resource is present in the result —
 * observed candidates carry `exact` or `blocked` ownership, and an expected
 * resource no candidate claims carries `absent` ownership. A second candidate
 * claiming an already-claimed role key is an ambiguity that blocks that role.
 * The returned `ownershipProven` flag is the conjunction over the whole
 * target: it is false when any candidate normalized to blocked (including a
 * stale, mislabeled, colliding, or unexpectedly attached one, or one carrying
 * no allowlisted role key at all) or when any expected resource is absent.
 * `records` carries the complete normalized Owned Runtime Resource list in
 * the same deterministic order as `resources`: it is the exact representation
 * a confirmation is bound to and re-derived under the lock, so a change to
 * any normalized field — not merely to eligibility — is observable as drift.
 */
function normalizeTargetInventory(target, candidates) {
  const expectedByKey = indexTargetResources(target);
  const records = new Map();
  let ownershipProven = true;
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const record = normalizeOwnedRuntimeResource(candidate, expectedByKey);
    if (record.ownership !== "exact") {
      ownershipProven = false;
    }
    if (record.logicalKey === null) {
      continue;
    }
    const claimed = records.get(record.logicalKey);
    if (claimed === undefined) {
      records.set(record.logicalKey, record);
      continue;
    }
    // Ambiguity: two candidates claim the same manifest-owned role, so
    // neither proves ownership of it.
    claimed.ownership = "blocked";
    ownershipProven = false;
  }
  for (const expected of TARGET_RESOURCES[target]) {
    if (!records.has(expected.logicalKey)) {
      records.set(expected.logicalKey, {
        logicalKey: expected.logicalKey,
        resourceType: expected.resourceType,
        ownership: "absent",
        runtimeState: null,
      });
      ownershipProven = false;
    }
  }
  const observed = [...records.values()].sort(compareInventoryRecords);
  return {
    resources: observed.map((r) => r.logicalKey),
    records: observed,
    ownershipProven,
  };
}

/**
 * Whether the applicable assessment predicate for one destructive action is
 * proven by the (untrusted) normalized evidence. Evidence that is not a
 * well-formed object, or whose predicate field is anything but exactly
 * `true`, is unproven — so an unavailable, malformed, or false predicate
 * never issues or upholds a confirmation.
 */
function applicablePredicateHolds(action, evidence) {
  if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) {
    return false;
  }
  const predicate = ASSESSMENT_PREDICATE_BY_ACTION[action];
  return predicate !== undefined && evidence[predicate] === true;
}

/**
 * The confirmation-evidence bindings (T031-B01): each token the boundary mints
 * is bound to the canonical digest of the exact normalized inventory and
 * assessment evidence it was issued against, keyed by the exact
 * `(target, action, token)` it was issued for. The accepted boundary contract
 * mints an opaque token from `(target, action)` alone, so the module must hold
 * the evidence side of the binding itself: this is the association the data
 * model requires the locked recomputation to match, not resource state smuggled
 * behind the collaborators. Bindings live only as long as the issuing process —
 * durable confirmation evidence belongs to the later journal/adapter tasks, and
 * a token with no binding for the presented `(target, action)` is refused
 * rather than trusted.
 */
const confirmationEvidenceBindings = new Map();

/** The binding key of one exact issued confirmation. */
function confirmationBindingKey(target, action, token) {
  return `${target} ${action} ${token}`;
}

/**
 * Canonicalize the (untrusted) normalized assessment evidence into a
 * deterministic, order-stable representation: every own key sorted, each value
 * reduced to whether it is exactly `true`. Any change to the evidence — a
 * flipped predicate, a dropped key, or a newly appearing one — changes the
 * canonical form and therefore the digest.
 */
function canonicalAssessmentEvidence(evidence) {
  if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) {
    return null;
  }
  return Object.keys(evidence)
    .sort()
    .map((key) => [key, evidence[key] === true]);
}

/**
 * The canonical confirmation digest of one exact eligibility observation: the
 * operation target, the action the confirmation is bound to, the complete
 * normalized inventory (role, type, ownership, and runtime state of every
 * recorded resource, in deterministic order), and the complete normalized
 * assessment evidence. SHA-256 over the canonical JSON form, matching the
 * data model's digest fields; the value is an internal correlation key and is
 * never emitted as ordinary output.
 */
function confirmationEvidenceDigest(target, action, inventory, evidence) {
  const canonical = JSON.stringify({
    operationTarget: target,
    action,
    resources: inventory.records.map((r) => [
      r.logicalKey,
      r.resourceType,
      r.ownership,
      r.runtimeState,
    ]),
    assessmentEvidence: canonicalAssessmentEvidence(evidence),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/** Bind one issued token to the exact evidence it was issued against. */
function bindConfirmationEvidence(target, action, token, inventory, evidence) {
  confirmationEvidenceBindings.set(
    confirmationBindingKey(target, action, token),
    confirmationEvidenceDigest(target, action, inventory, evidence),
  );
}

/**
 * The digest bound to one presented confirmation for this exact
 * `(target, action)`, or `undefined` when no such binding exists — including
 * when the token was issued for a different pairing, which the boundary
 * refuses on its own.
 */
function boundConfirmationEvidence(target, action, token) {
  return confirmationEvidenceBindings.get(confirmationBindingKey(target, action, token));
}

/**
 * `foundation:inventory` — typed read-only inspection of one operation target
 * (FR-004/FR-017/SC-002; Operations Contract §Commands). The raw inspection is
 * normalized into the closed Owned Runtime Resource shape and emitted as the
 * sorted manifest-role inventory; raw inspect data, resource names/IDs,
 * filesystem paths, and label values never become ordinary output. For the
 * read-only `status` action that is the whole operation. A destructive action
 * additionally requires proven exact ownership of the complete recorded
 * target and every applicable assessment predicate, and only then asks the
 * confirmation boundary to mint the action-bound token for that exact
 * inventory. The minted token is bound to a canonical digest of the complete
 * normalized inventory and assessment evidence it was issued against, so the
 * later locked recomputation is compared against the exact confirmed
 * observation, not merely against continued eligibility. Issuance is still
 * read-only: it takes no lock and mutates nothing — the token only ever
 * authorizes the separately confirmed destructive command, which
 * re-establishes every predicate and the bound digest under the
 * operation-target lock before any mutation.
 */
export async function foundationInventory(collaborators, options) {
  const request = options === null || typeof options !== "object" ? {} : options;
  const target = request.target;
  const action = request.action;
  if (typeof target !== "string" || !Object.hasOwn(TARGET_RESOURCES, target)) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "OPERATIONAL_FAILURE",
        "foundation",
        "orchestration",
        "CHECK_PREREQUISITES",
      ),
    );
  }
  const destructiveAction = DESTRUCTIVE_ACTION_BY_TARGET[target];
  const actionKnown = action === STATUS_ACTION || action === destructiveAction;
  if (typeof action !== "string" || !actionKnown) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "OPERATIONAL_FAILURE",
        "foundation",
        "orchestration",
        "CHECK_PREREQUISITES",
      ),
    );
  }

  let candidates;
  try {
    candidates = await collaborators.inventory.inspect(target);
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic("OPERATIONAL_FAILURE", "foundation", "orchestration", "INSPECT_OWNERSHIP"),
    );
  }
  const inventory = normalizeTargetInventory(target, candidates);

  // The destructive actions are the ones whose exact ownership must be proven
  // before anything may ever act on the target; `status` is a pure observation
  // and reports the normalized inventory regardless of ownership outcome.
  if (action !== STATUS_ACTION && !inventory.ownershipProven) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "RESOURCE_OWNERSHIP_UNPROVEN",
        "foundation",
        "orchestration",
        "INSPECT_OWNERSHIP",
      ),
    );
  }
  if (action === STATUS_ACTION) {
    return { exitCode: 0, diagnosticScope: "foundation", resources: inventory.resources };
  }

  // T031 — the confirmation is action-specific and evidence-gated: exact
  // ownership alone is insufficient, the action's own applicable predicate
  // must also be proven, and the boundary — not this module — mints the
  // opaque token bound to this exact (target, action).
  let evidence;
  try {
    evidence = await collaborators.assessment.evaluate(target);
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic("OPERATIONAL_FAILURE", "foundation", "orchestration", "INSPECT_OWNERSHIP"),
    );
  }
  if (!applicablePredicateHolds(action, evidence)) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "DATA_RECONSTRUCTIBILITY_UNPROVEN",
        "foundation",
        "orchestration",
        "INSPECT_OWNERSHIP",
      ),
    );
  }
  let token;
  try {
    token = await collaborators.confirmation.issue(target, action);
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic("OPERATIONAL_FAILURE", "foundation", "orchestration", "INSPECT_OWNERSHIP"),
    );
  }
  if (typeof token !== "string" || token.length === 0) {
    return rejectOperation(
      collaborators,
      safeDiagnostic("OPERATIONAL_FAILURE", "foundation", "orchestration", "INSPECT_OWNERSHIP"),
    );
  }
  // T031-B01 — the minted token is bound to the exact normalized inventory and
  // assessment evidence it was issued against, so the later locked
  // recomputation has something exact to match.
  bindConfirmationEvidence(target, action, token, inventory, evidence);
  return {
    exitCode: 0,
    diagnosticScope: "foundation",
    resources: inventory.resources,
    token,
  };
}

// ---------------------------------------------------------------------------
// T031 operations — the confirmed destructive sequence. One shared core
// serves both routed destructive commands: acquire the exact operation-target
// lock, immediately re-inventory, immediately recompute the applicable
// assessment evidence, refuse any drift — including a still-eligible
// inventory or assessment that no longer matches the digest bound to the
// token — verify the presented action-bound token, and only then remove
// individually recorded exact resources. With a journal facet present (T032)
// the locked run is journalled: `running` before the re-inventory/mutation,
// a terminal record on every outcome, and a pending origin binds the run as
// a recovery attempt with the immutable primary/secondary failure semantics.
// ---------------------------------------------------------------------------

/**
 * The locked phase of a confirmed destructive operation. Runs strictly
 * between lock acquisition and lock release: the re-inventory is the first
 * thing that happens under the lock and the evidence recompute immediately
 * follows it, so any change to the confirmed inventory or assessment is
 * observed before a single resource is touched.
 */
async function executeConfirmedMutation(collaborators, target, action, token) {
  const diagnosticScope = DIAGNOSTIC_SCOPE_BY_TARGET[target];
  let candidates;
  try {
    candidates = await collaborators.inventory.inspect(target);
  } catch {
    return destructiveRefusal(collaborators, diagnosticScope, "OPERATIONAL_FAILURE");
  }
  const inventory = normalizeTargetInventory(target, candidates);
  const evidence = await collaborators.assessment.evaluate(target);

  // Drift refusal (FR-017): the token was issued for one exact eligible
  // inventory and assessment. A resource that disappeared, was re-observed
  // mislabeled/stale/colliding, or evidence that no longer proves the action
  // predicate means the confirmed target and the live target differ, so every
  // mutation is refused with the documented drift reason code.
  if (!inventory.ownershipProven || !applicablePredicateHolds(action, evidence)) {
    return destructiveRefusal(collaborators, diagnosticScope, "RESOURCE_INVENTORY_CHANGED");
  }

  // T031-B01 — confirmation-digest drift: eligibility alone is not equality.
  // A change that leaves every resource owned and the action predicate true
  // (for example a re-observed runtime state, or a flipped non-applicable
  // assessment key) still means the live target is no longer the one the token
  // was issued against, so the bound digest no longer matches and every
  // mutation is refused BEFORE the boundary is consulted. A token with no
  // binding for this exact (target, action) is left to the boundary, which
  // refuses tokens not issued for this pairing on its own.
  const bound = boundConfirmationEvidence(target, action, token);
  if (
    bound !== undefined &&
    bound !== confirmationEvidenceDigest(target, action, inventory, evidence)
  ) {
    return destructiveRefusal(collaborators, diagnosticScope, "RESOURCE_INVENTORY_CHANGED");
  }

  // The exact caller-presented token is submitted to the injected boundary
  // under this command's bound action; the module never mints a substitute.
  let confirmed;
  try {
    confirmed = await collaborators.confirmation.verify(target, action, token);
  } catch {
    return destructiveRefusal(collaborators, diagnosticScope, "OPERATIONAL_FAILURE");
  }
  if (confirmed !== true) {
    return destructiveRefusal(collaborators, diagnosticScope, "OPERATIONAL_FAILURE");
  }

  // Fail closed on an unbound confirmation: a token the boundary accepts but
  // that carries no evidence binding for this exact (target, action) cannot
  // prove its confirmed inventory or assessment, so the confirmation digest
  // cannot be shown to match and no mutation may proceed.
  if (bound === undefined) {
    return destructiveRefusal(collaborators, diagnosticScope, "RESOURCE_INVENTORY_CHANGED");
  }

  // Bounded exact mutation: only the individually recorded exact resources of
  // this target, each removed on its own through the exact-resource adapter,
  // in the normalized inventory order. No broad or indirect deletion strategy
  // exists on this path, and no non-target resource is addressed.
  try {
    for (const logicalKey of inventory.resources) {
      await collaborators.mutation.removeExactResource(logicalKey);
    }
  } catch {
    return destructiveRefusal(collaborators, diagnosticScope, "OPERATIONAL_FAILURE");
  }
  return { exitCode: 0, diagnosticScope };
}

/** One read-only destructive refusal: safe diagnostic, zero mutation. */
function destructiveRefusal(collaborators, diagnosticScope, reasonCode) {
  return rejectOperation(
    collaborators,
    safeDiagnostic(reasonCode, diagnosticScope, "orchestration", "INSPECT_OWNERSHIP"),
  );
}

/**
 * Refuse an unconfirmed destructive request read-only, reporting the most
 * fundamental reason first: a target whose exact ownership cannot be proven
 * could never have been issued a token at all, so that is the actionable
 * refusal even though the presented confirmation is also missing. The
 * eligibility check is a plain read-only inspection — no lock, no assessment
 * recomputation, and no mutation of any kind.
 */
async function refuseUnconfirmedTarget(collaborators, target) {
  const diagnosticScope = DIAGNOSTIC_SCOPE_BY_TARGET[target];
  let candidates;
  try {
    candidates = await collaborators.inventory.inspect(target);
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "OPERATIONAL_FAILURE",
        diagnosticScope,
        "orchestration",
        "CHECK_PREREQUISITES",
      ),
    );
  }
  const inventory = normalizeTargetInventory(target, candidates);
  if (!inventory.ownershipProven) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "RESOURCE_OWNERSHIP_UNPROVEN",
        diagnosticScope,
        "orchestration",
        "INSPECT_OWNERSHIP",
      ),
    );
  }
  return rejectOperation(
    collaborators,
    safeDiagnostic("OPERATIONAL_FAILURE", diagnosticScope, "orchestration", "CHECK_PREREQUISITES"),
  );
}

/**
 * The confirmed destructive sequence shared by both routed destructive
 * commands. A missing confirmation refuses before any lock is touched. An
 * unavailable operation-target lock refuses without mutating and without
 * releasing a lock this operation does not hold. Once the lock is acquired,
 * every outcome — accepted mutation or any refusal — releases it, and the
 * release is the last thing the operation does.
 */
async function confirmedDestructiveOperation(collaborators, target, action, token) {
  const diagnosticScope = DIAGNOSTIC_SCOPE_BY_TARGET[target];
  if (typeof token !== "string" || token.length === 0) {
    return refuseUnconfirmedTarget(collaborators, target);
  }
  let acquired;
  try {
    acquired = await collaborators.lock.acquire(target);
  } catch {
    acquired = false;
  }
  if (acquired !== true) {
    return rejectOperation(
      collaborators,
      safeDiagnostic("OPERATIONAL_FAILURE", diagnosticScope, "orchestration", "RETRY_SAFE_OPERATION"),
    );
  }
  // T032 — under the lock, the journaled destructive operation records its
  // `running` state BEFORE the re-inventory/mutation and closes it on every
  // outcome. A pending origin (interrupted/failed/unclosed `running`) makes
  // this invocation a recovery ATTEMPT: the T031 confirmation gates own its
  // authorization, and the terminal record binds the immutable origin
  // failure with the attempt's own failures appended as secondaries. A
  // corrupt/unreadable journal refuses the mutation entirely (T032-B03),
  // and a terminal record that cannot be made durable returns the closed
  // non-zero result instead of the operation's own outcome.
  const { journaled, corrupt, origin } = await readPendingOrigin(collaborators, target);
  if (journaled && corrupt) {
    const refused = await journalIntegrityRefusal(collaborators, target);
    try {
      await collaborators.lock.release(target);
    } catch {
      // The lock adapter's own failure never masks the refusal.
    }
    return refused;
  }
  let runningRecord = null;
  let journaledRun = false;
  if (journaled) {
    const operationId = newOperationId();
    const startedAt = journalTimestamp(collaborators);
    runningRecord = {
      operationId,
      operationTarget: target,
      runtimeProfile: RUNTIME_PROFILE_BY_TARGET[target],
      action,
      phase: JOURNAL_PRE_WORK_PHASE,
      state: "running",
      inventoryDigest: journalDigest({ operationTarget: target, action, operationId, scope: "inventory" }),
      mutationPlanDigest: journalDigest({
        operationTarget: target,
        action,
        operationId,
        scope: "mutation-plan",
      }),
      secondaryFailures: [],
      startedAt,
      updatedAt: startedAt,
    };
    journaledRun = await writeRunningRecord(collaborators, target, runningRecord);
    if (!journaledRun) {
      const refused = destructiveRefusal(collaborators, diagnosticScope, "OPERATIONAL_FAILURE");
      try {
        await collaborators.lock.release(target);
      } catch {
        // The lock adapter's own failure never masks the refusal.
      }
      return refused;
    }
  }
  let result;
  try {
    result = await executeConfirmedMutation(collaborators, target, action, token);
  } catch {
    result = destructiveRefusal(collaborators, diagnosticScope, "OPERATIONAL_FAILURE");
  }
  if (journaledRun) {
    const failed = result.exitCode !== 0;
    const attemptFailure = failed ? resultFailureDiagnostic(result) : null;
    const persisted = await writeTerminalRecord(target, {
      ...runningRecord,
      state: failed ? "failed" : "passed",
      primaryFailure: attemptFailure ?? undefined,
      secondaryFailures: [],
      recoveryAssessment:
        origin === null
          ? undefined
          : attemptAssessment(
              target,
              action,
              origin,
              action,
              null,
              attemptFailure === null ? [] : [attemptFailure],
              !failed,
              {
                inventoryDigest: runningRecord.inventoryDigest,
                mutationPlanDigest: runningRecord.mutationPlanDigest,
              },
            ),
      safeNextAction: failed ? (result.remediation ?? "INSPECT_OWNERSHIP") : undefined,
      updatedAt: journalTimestamp(collaborators),
    });
    if (!persisted) {
      result = await terminalPersistenceFailure(collaborators, target);
    }
  }
  try {
    await collaborators.lock.release(target);
  } catch {
    // The lock adapter's own failure never masks the operation's result and
    // never widens the mutation: the outcome above stands.
  }
  return result;
}

/**
 * `dev:reset` — the confirmed Development reset (FR-004/FR-017/SC-002;
 * Operations Contract §Commands). Requires an action-bound reset token
 * issued for the exact Development inventory, then re-inventory under the
 * Development operation-target lock, requires the recomputed
 * reconstructibility evidence to still hold, and removes only the
 * individually recorded exact Data Store resources. Any refusal mutates
 * nothing.
 */
export async function devReset(collaborators, token) {
  return confirmedDestructiveOperation(collaborators, "development", "reset", token);
}

/**
 * `foundation:cleanup` — the confirmed Verification disposal (FR-004/FR-017;
 * Operations Contract §Commands). Cleanup is routed to the Verification
 * operation target alone, so any other target is refused exactly like an
 * unknown one before a lock is touched. With a valid action-bound cleanup
 * token it re-inventories under the Verification lock, requires the
 * recomputed disposability evidence to still hold, and removes only the
 * individually recorded exact Verification resources; it never addresses a
 * Development resource.
 */
export async function foundationCleanup(collaborators, target, token) {
  if (typeof target !== "string" || DESTRUCTIVE_ACTION_BY_TARGET[target] !== "cleanup") {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "OPERATIONAL_FAILURE",
        "foundation",
        "orchestration",
        "CHECK_PREREQUISITES",
      ),
    );
  }
  return confirmedDestructiveOperation(collaborators, target, "cleanup", token);
}

// ---------------------------------------------------------------------------
// T032 operations — the acceptance-only interruption injection
// (FR-003/FR-017; Operations Contract §Commands `foundation:test-interruption`;
// quickstart §5; plan.md §Operations and verification).
// ---------------------------------------------------------------------------

/**
 * The allowlisted interruption-injection actions (Operations Contract
 * §Commands): exactly the five lifecycle actions quickstart §5 drives.
 */
const INTERRUPTION_ACTIONS = ["start", "stop", "migrate", "reset", "cleanup"];

/** The allowlisted interruption phases: the one documented phase (§5). */
const INTERRUPTION_PHASES = [JOURNAL_PRE_WORK_PHASE];

/**
 * The ordinary synthetic service work each injected action performs AFTER the
 * fault check passes (the control case that proves the injection is
 * phase-targeted, not a pre-emptive abort). `start`/`stop`/`migrate` perform
 * their ordinary daily adapter work through the injected collaborators;
 * `reset`/`cleanup` perform NO mutation — the confirmed destructive commands
 * own all destructive work, so the injector only ever produces their
 * interrupted journals.
 */
async function runSyntheticInterruptionWork(collaborators, target, action) {
  if (target !== DAILY_OPERATION_TARGET) {
    return;
  }
  if (action === "start") {
    await collaborators.database.start();
    for (const name of NATIVE_PROCESSES) {
      await collaborators.processes.start(name);
    }
    return;
  }
  if (action === "stop") {
    for (const name of NATIVE_PROCESSES) {
      await collaborators.processes.stop(name);
    }
    await collaborators.database.stop();
    return;
  }
  if (action === "migrate") {
    await collaborators.database.applyMigrations();
  }
}

/**
 * `foundation:test-interruption` — the acceptance-only controlled fault
 * injection for synthetic local operation targets (quickstart §5). It is NOT
 * the real command path: it drives one synthetic operation of the requested
 * allowlisted `(target, action, phase)` through the journal lifecycle so the
 * interrupted state is observable without a real signal. It refuses hosted
 * and Production-derived configuration before any injection or journal work
 * (the contract's only configuration commitments for this entry point);
 * every other value is the caller's synthetic acceptance context. The
 * operation writes its `running` journal record BEFORE any service work,
 * then polls the injected fault source for the exact `(action, phase)`: a
 * firing fault records the `interrupted` journal with the documented
 * `OPERATION_INTERRUPTED` primary failure, performs no service work, and
 * returns non-zero (the target stays stopped/not-ready); a non-firing fault
 * lets the ordinary synthetic action work complete and records `passed`.
 */
export async function foundationTestInterruption(collaborators, options) {
  const request = options === null || typeof options !== "object" ? {} : options;
  const { target, action, phase } = request;
  if (
    typeof target !== "string" ||
    !Object.hasOwn(TARGET_RESOURCES, target) ||
    typeof action !== "string" ||
    !INTERRUPTION_ACTIONS.includes(action) ||
    typeof phase !== "string" ||
    !INTERRUPTION_PHASES.includes(phase)
  ) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "OPERATIONAL_FAILURE",
        "foundation",
        "orchestration",
        "CHECK_PREREQUISITES",
      ),
    );
  }
  if (
    collaborators.journal === undefined ||
    collaborators.journal === null ||
    collaborators.interruption === undefined ||
    collaborators.interruption === null
  ) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "OPERATIONAL_FAILURE",
        "foundation",
        "orchestration",
        "CHECK_PREREQUISITES",
      ),
    );
  }
  const diagnosticScope = DIAGNOSTIC_SCOPE_BY_TARGET[target];
  const configuration = await loadLifecycleConfiguration(collaborators, target);
  if (configuration.rejected !== undefined) {
    return rejectOperation(collaborators, configuration.rejected);
  }

  const operationId = newOperationId();
  const startedAt = journalTimestamp(collaborators);
  const runningRecord = {
    operationId,
    operationTarget: target,
    runtimeProfile: RUNTIME_PROFILE_BY_TARGET[target],
    action,
    phase,
    state: "running",
    inventoryDigest: journalDigest({ operationTarget: target, action, phase, operationId, scope: "inventory" }),
    mutationPlanDigest: journalDigest({
      operationTarget: target,
      action,
      phase,
      operationId,
      scope: "mutation-plan",
    }),
    secondaryFailures: [],
    startedAt,
    updatedAt: startedAt,
  };
  if (!(await writeRunningRecord(collaborators, target, runningRecord))) {
    return rejectOperation(
      collaborators,
      safeDiagnostic("OPERATIONAL_FAILURE", diagnosticScope, "orchestration", "RETRY_SAFE_OPERATION"),
    );
  }
  // A Verification cleanup operation begins from the disposable topology a
  // verification START creates (data-model §State Transitions: a Verification
  // run goes setup/start → checks → cleanup → report). The synthetic cleanup
  // lifecycle therefore polls the fault at that arrange step first, then at
  // the requested cleanup step — the arrange is poll-only, because the
  // acceptance harness owns the synthetic topology and the injector never
  // performs start-up or destructive work itself.
  const faultSteps = [];
  if (target === "verification" && action === "cleanup") {
    faultSteps.push("start");
  }
  faultSteps.push(action);
  for (const step of faultSteps) {
    let fired = false;
    try {
      fired = (await collaborators.interruption.shouldInterrupt(step, phase)) === true;
    } catch {
      fired = false;
    }
    if (fired) {
      const failure = interruptionDiagnostic(diagnosticScope);
      const persisted = await writeTerminalRecord(target, {
        ...runningRecord,
        state: "interrupted",
        primaryFailure: failure,
        secondaryFailures: [],
        safeNextAction: "RETRY_SAFE_OPERATION",
        updatedAt: journalTimestamp(collaborators),
      });
      if (!persisted) {
        return terminalPersistenceFailure(collaborators, target);
      }
      return rejectOperation(collaborators, failure);
    }
  }
  try {
    await runSyntheticInterruptionWork(collaborators, target, action);
  } catch {
    const failure = safeDiagnostic(
      "OPERATIONAL_FAILURE",
      diagnosticScope,
      "orchestration",
      "RETRY_SAFE_OPERATION",
    );
    const persisted = await writeTerminalRecord(target, {
      ...runningRecord,
      state: "failed",
      primaryFailure: failure,
      secondaryFailures: [],
      safeNextAction: "RETRY_SAFE_OPERATION",
      updatedAt: journalTimestamp(collaborators),
    });
    if (!persisted) {
      return terminalPersistenceFailure(collaborators, target);
    }
    return rejectOperation(collaborators, failure);
  }
  const persisted = await writeTerminalRecord(target, {
    ...runningRecord,
    state: "passed",
    secondaryFailures: [],
    updatedAt: journalTimestamp(collaborators),
  });
  if (!persisted) {
    return terminalPersistenceFailure(collaborators, target);
  }
  return { exitCode: 0, diagnosticScope };
}

// ---------------------------------------------------------------------------
// T033 operations — the normalized, read-only Recovery Assessment and the
// fixed target-appropriate retry/recover/reset/cleanup/manual-review
// decision order (FR-003/FR-017 Edge Cases; data-model.md §Recovery
// Assessment; Operations Contract §Commands `foundation:status` and
// §Failure behavior; quickstart §5).
// ---------------------------------------------------------------------------

/**
 * The sole allowlisted Development repair this Delivery permits
 * (data-model.md §Recovery Assessment `repairId`; quickstart §5):
 * recreate the exact Development database container/network runtime while
 * preserving its named volume and data. The assessment only RECORDS it as
 * the selected repair of a `recover` decision — executing the repair with
 * its connectivity/integrity/migration postchecks is the later recovery
 * task's boundary.
 */
const ALLOWLISTED_DEVELOPMENT_REPAIR = "recreate-database-runtime-preserve-volume";

/** The closed §Recovery Assessment verdict enums, in model order. */
const OWNERSHIP_VERDICTS = ["confirmed", "unconfirmed"];
const INTEGRITY_VERDICTS = ["valid", "invalid", "not-applicable", "unknown"];
const REPEATABILITY_VERDICTS = ["safe", "unsafe", "unknown"];
const RECONSTRUCTIBILITY_VERDICTS = [
  "confirmed",
  "not-reconstructible",
  "not-applicable",
  "unknown",
];
const REPAIR_DISPOSITIONS = ["verified-available", "unavailable", "failed", "not-applicable"];

/**
 * Normalize one untrusted verdict/disposition field of the injected
 * assessment evidence to its closed enum. The evidence object is untrusted
 * collaborator input: a field that is not exactly one of the documented
 * values is never promoted to a stronger verdict — it falls to the
 * fail-safe value, which is `unconfirmed`/`unknown` for the verdicts and
 * `unavailable` for a repair disposition (a generic or unreviewed repair is
 * never available). A malformed evidence object as a whole normalizes to
 * every fail-safe value at once, so the decision can only be the row-1
 * `manual-review` gate.
 */
function normalizedEvidenceVerdict(evidence, field, allowlist, failSafe) {
  if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) {
    return failSafe;
  }
  return allowlist.includes(evidence[field]) ? evidence[field] : failSafe;
}

/**
 * One bound evidence digest of the assessment: the normalized digest the
 * evidence carries for this facet, else the canonical SHA-256 digest of the
 * exact origin binding. The value is correlation evidence only — never a
 * raw check and never ordinary output.
 */
function boundEvidenceDigest(evidence, field, binding, scope) {
  return nonEmptyStringField(evidence, field) ?? journalDigest({ ...binding, scope });
}

/**
 * Derive exactly one decision in the documented fixed order (data-model.md
 * §Recovery Assessment; Operations Contract §Failure behavior). Earlier rows
 * dominate later rows when several would match:
 *
 * 1. any unconfirmed/unknown APPLICABLE ownership, integrity, repeatability,
 *    or reconstructibility evidence yields `manual-review` — ownership,
 *    integrity, and repeatability are always applicable, while
 *    reconstructibility is applicable exactly when a later row would depend
 *    on it: never for a safely repeatable state (row 2 decides) and not for
 *    Development while a verified repair is selected (row 3 decides);
 * 2. confirmed ownership plus valid/not-applicable integrity and proven safe
 *    repeatability yields `retry`;
 * 3. Development only: an allowlisted verified-available repair yields
 *    `recover` (row 2 did not apply);
 * 4. Development only: confirmed reconstructibility plus an
 *    unavailable/failed repair yields `reset`;
 * 5. Verification only: confirmed exact ownership plus confirmed
 *    disposable/reconstructible resources yields `cleanup`;
 * 6. every other state yields `manual-review`.
 *
 * The result is therefore always inside the target-appropriate documented
 * set — Development retry/recover/reset/manual-review, Verification
 * retry/cleanup/manual-review — because rows 3/4 are reached only for
 * Development and row 5 only for Verification.
 */
function deriveRecoveryDecision(target, verdicts, evidence) {
  // Row 1 — the applicable-evidence gate.
  if (verdicts.ownershipVerdict !== "confirmed") {
    return "manual-review";
  }
  if (verdicts.integrityVerdict === "unknown") {
    return "manual-review";
  }
  if (verdicts.repeatabilityVerdict === "unknown") {
    return "manual-review";
  }
  const retryApplies =
    (verdicts.integrityVerdict === "valid" ||
      verdicts.integrityVerdict === "not-applicable") &&
    verdicts.repeatabilityVerdict === "safe";
  const verifiedRepairSelected =
    target === "development" && verdicts.repairDisposition === "verified-available";
  if (
    !retryApplies &&
    !verifiedRepairSelected &&
    verdicts.reconstructibilityVerdict === "unknown"
  ) {
    return "manual-review";
  }
  // Row 2 — the documented safe retry.
  if (retryApplies) {
    return "retry";
  }
  // Row 3 — Development's allowlisted verified repair.
  if (verifiedRepairSelected) {
    return "recover";
  }
  // Row 4 — Development's confirmed-reconstructible reset (the repair is
  // unavailable or failed: row 3 did not select it).
  if (
    target === "development" &&
    verdicts.reconstructibilityVerdict === "confirmed" &&
    (verdicts.repairDisposition === "unavailable" || verdicts.repairDisposition === "failed")
  ) {
    return "reset";
  }
  // Row 5 — Verification's confirmed disposable/reconstructible cleanup.
  if (
    target === "verification" &&
    verdicts.reconstructibilityVerdict === "confirmed" &&
    evidence !== null &&
    typeof evidence === "object" &&
    !Array.isArray(evidence) &&
    evidence.disposabilityConfirmed === true
  ) {
    return "cleanup";
  }
  // Row 6 — the residual.
  return "manual-review";
}

/**
 * `foundation:status` — read the target journal and assessment evidence and
 * emit exactly one normalized, target-appropriate Recovery Assessment
 * WITHOUT mutation (FR-003/FR-017; Operations Contract §Commands). The
 * pending origin is the strictly classified journal record — an
 * `interrupted`, `failed`, `ownership-blocked`, or UNCLOSED `running`
 * record, which the next invocation treats as interrupted — and its
 * recorded failure is carried into the assessment as the immutable
 * `originalFailure`. The normalized evidence is evaluated exactly once
 * through the assessment facet, every verdict is normalized to its closed
 * enum (untrusted input never earns a stronger verdict), and the decision
 * is derived in the documented fixed row order. Read-only means read-only:
 * no lock is taken, no token is minted, nothing is mutated, and no recovery
 * or service work runs — journal reads and evidence evaluation are the only
 * observations, so a manual-review state issues no mutation evidence of any
 * kind. A corrupt/unreadable journal keeps the established closed refusal
 * (T032-B03), and a target with no pending failure/interruption has no
 * recovery state to assess: the command reports success without an
 * assessment rather than fabricating an origin operation.
 */
export async function foundationStatus(collaborators, options) {
  const request = options === null || typeof options !== "object" ? {} : options;
  const target = request.target;
  if (typeof target !== "string" || !Object.hasOwn(TARGET_RESOURCES, target)) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        "OPERATIONAL_FAILURE",
        "foundation",
        "orchestration",
        "CHECK_PREREQUISITES",
      ),
    );
  }
  const diagnosticScope = DIAGNOSTIC_SCOPE_BY_TARGET[target];
  if (collaborators.journal === undefined || collaborators.journal === null) {
    return rejectOperation(
      collaborators,
      safeDiagnostic("OPERATIONAL_FAILURE", diagnosticScope, "orchestration", "CHECK_PREREQUISITES"),
    );
  }
  const { journaled, corrupt, origin } = await readPendingOrigin(collaborators, target);
  if (!journaled || corrupt) {
    return journalIntegrityRefusal(collaborators, target);
  }
  if (origin === null) {
    return { exitCode: 0, diagnosticScope };
  }

  let evidence = null;
  try {
    evidence = (await collaborators.assessment?.evaluate(target)) ?? null;
  } catch {
    evidence = null;
  }
  const verdicts = {
    ownershipVerdict: normalizedEvidenceVerdict(
      evidence,
      "ownershipVerdict",
      OWNERSHIP_VERDICTS,
      "unconfirmed",
    ),
    integrityVerdict: normalizedEvidenceVerdict(
      evidence,
      "integrityVerdict",
      INTEGRITY_VERDICTS,
      "unknown",
    ),
    repeatabilityVerdict: normalizedEvidenceVerdict(
      evidence,
      "repeatabilityVerdict",
      REPEATABILITY_VERDICTS,
      "unknown",
    ),
    reconstructibilityVerdict: normalizedEvidenceVerdict(
      evidence,
      "reconstructibilityVerdict",
      RECONSTRUCTIBILITY_VERDICTS,
      "unknown",
    ),
    repairDisposition: normalizedEvidenceVerdict(
      evidence,
      "repairDisposition",
      REPAIR_DISPOSITIONS,
      "unavailable",
    ),
  };
  const decision = deriveRecoveryDecision(target, verdicts, evidence);

  // The binding every derived evidence digest falls back to: the exact
  // origin operation and its target. Digests are SHA-256 correlation
  // evidence over normalized input only — no raw check output is stored.
  const binding = {
    operationTarget: target,
    originOperationId: origin.operationId,
    originAction: origin.action,
    originPhase: origin.phase,
  };
  const reconstructibilityEvidenceDigest = nonEmptyStringField(
    evidence,
    "reconstructibilityEvidenceDigest",
  );
  const assessment = {
    originOperationId: origin.operationId,
    originAction: origin.action,
    originPhase: origin.phase,
    originalFailure: origin.primaryFailure,
    operationTarget: target,
    runtimeProfile: RUNTIME_PROFILE_BY_TARGET[target],
    ownershipVerdict: verdicts.ownershipVerdict,
    integrityVerdict: verdicts.integrityVerdict,
    repeatabilityVerdict: verdicts.repeatabilityVerdict,
    reconstructibilityVerdict: verdicts.reconstructibilityVerdict,
    repairDisposition: verdicts.repairDisposition,
    ...(decision === "recover" ? { repairId: ALLOWLISTED_DEVELOPMENT_REPAIR } : {}),
    inventoryDigest: boundEvidenceDigest(evidence, "inventoryDigest", binding, "inventory"),
    integrityEvidenceDigest: boundEvidenceDigest(
      evidence,
      "integrityEvidenceDigest",
      binding,
      "integrity-evidence",
    ),
    ...(reconstructibilityEvidenceDigest === null
      ? {}
      : { reconstructibilityEvidenceDigest }),
    mutationPlanDigest: boundEvidenceDigest(
      evidence,
      "mutationPlanDigest",
      binding,
      "mutation-plan",
    ),
    decision,
    attemptFailures: [],
    resolution: "pending",
  };
  return { exitCode: 0, diagnosticScope, assessment };
}

// ---------------------------------------------------------------------------
// Real adapters — used only by the command-line entry point. The accepted
// tests always inject their own collaborators; nothing in this section
// runs under test.
// ---------------------------------------------------------------------------

/** Bounded child-process timeout for external tool checks (milliseconds). */
const TOOL_CHECK_TIMEOUT_MS = 30_000;
/** Bounded timeout for bringing the Development database up (milliseconds). */
const DATABASE_START_TIMEOUT_MS = 180_000;
/** Bounded timeout for stopping the Development database (milliseconds). */
const DATABASE_STOP_TIMEOUT_MS = 120_000;

/** Required committed files for the Development target (quickstart §1). */
const REQUIRED_FILES = ["infra/compose.development.yaml", ".env.development.example"];
/** The ignored local Development configuration copy (quickstart §1). */
const DEVELOPMENT_ENV_FILE = ".env.development.local";
/** The committed safe example the local copy is made from. */
const DEVELOPMENT_ENV_EXAMPLE_FILE = ".env.development.example";
/** Documented Development database loopback port (T026 manifest). */
const DEVELOPMENT_DATABASE_PORT = 3306;
/** Documented daily application port fallback (the committed example value). */
const DEVELOPMENT_APP_PORT_FALLBACK = 4173;

/**
 * Parse the bounded KEY=VALUE grammar of the committed environment
 * examples: blank lines and `#` comments are skipped, surrounding
 * whitespace is trimmed, and a fully quoted value is unquoted once. No
 * interpolation or shell semantics are applied.
 */
function parseEnvironmentFile(text) {
  const config = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    config[key] = value;
  }
  return config;
}

/** Read and parse a repository-root environment file; `null` when absent. */
async function readEnvironmentFile(relativePath) {
  try {
    const text = await readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8");
    return parseEnvironmentFile(text);
  } catch {
    return null;
  }
}

/**
 * Load the ignored local Development configuration. Throws when the local
 * copy is absent so callers map it to the documented missing-configuration
 * rejection; the committed example is the fallback source for
 * non-mutating port checks only.
 */
async function loadDevelopmentConfiguration() {
  const local = await readEnvironmentFile(DEVELOPMENT_ENV_FILE);
  if (local === null) {
    throw new Error("local development configuration is absent");
  }
  return local;
}

/**
 * The canonical-rejection error a VALIDATING configuration source throws:
 * it carries the already-closed Safe Diagnostic of the canonical boundary
 * that refused the record, so every consuming operation refuses with
 * exactly that diagnostic — no second policy and no raw error text exist.
 */
class CanonicalConfigurationRejection extends Error {
  /** @param {object} diagnostic the closed canonical rejection diagnostic */
  constructor(diagnostic) {
    super("canonical configuration rejection");
    this.diagnostic = diagnostic;
  }
}

/**
 * The VALIDATING real Development configuration source: load the ignored
 * local copy and enforce the accepted T010 canonical boundary — the single
 * configuration policy — BEFORE the record is handed to any operation. An
 * absent local copy stays the documented missing-configuration rejection; a
 * canonical refusal throws the carried closed diagnostic, which every
 * consuming operation refuses with verbatim. Defense in depth for the real
 * command surface's FR-006 reject-before-work behavior: the operations
 * themselves apply the same canonical boundary in both journaled and
 * unjournaled modes (T032-B04), so the source-level enforcement changes no
 * observable outcome.
 */
async function loadValidatedDevelopmentConfiguration() {
  const config = await loadDevelopmentConfiguration();
  const outcome = await loadCanonicalDevelopmentOutcome(config);
  if (outcome.status === "rejected") {
    throw new CanonicalConfigurationRejection(outcome.diagnostic);
  }
  return config;
}

/** Resolve a command in PATH and exit zero/non-zero, mapped to a boolean. */
async function externalToolSucceeds(command, args) {
  try {
    await execFileAsync(command, args, { timeout: TOOL_CHECK_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/** Node.js 24.x LTS is the supported runtime (root `engines` field). */
function checkNodeRuntime() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  return major === 24;
}

/**
 * Whether an `npm --version` output satisfies the supported npm CLI range
 * (`>=12.0.0 <13`, the root `engines` constraint). Parsing is strict and
 * total: anything that is not a concrete `major.minor.patch` in range —
 * including garbage and empty output — fails. The raw output is never
 * surfaced; only this boolean is observed (T027-B03).
 */
export function npmVersionSatisfiesEngines(versionOutput) {
  const match = /^v?([0-9]+)\.([0-9]+)\.([0-9]+)(?:[.\s-].*)?$/.exec(
    String(versionOutput ?? "").trim(),
  );
  if (match === null) {
    return false;
  }
  const major = Number.parseInt(match[1], 10);
  return major >= 12 && major < 13;
}

/** The installed npm CLI is the supported version range (root `engines`). */
async function checkNpmCli() {
  try {
    const { stdout } = await execFileAsync("npm", ["--version"], {
      timeout: TOOL_CHECK_TIMEOUT_MS,
    });
    return npmVersionSatisfiesEngines(stdout);
  } catch {
    return false;
  }
}

/** Every required committed file for the Development target is present. */
async function checkRequiredFiles() {
  for (const relativePath of REQUIRED_FILES) {
    try {
      await access(path.join(REPOSITORY_ROOT, relativePath));
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * The local execution-context configuration is complete and safe by the
 * accepted T010 canonical boundary — the same single policy `dev:setup`
 * enforces (T027-B01).
 */
async function checkSafeDevelopmentConfiguration() {
  try {
    const config = await loadDevelopmentConfiguration();
    const outcome = await loadCanonicalDevelopmentOutcome(config);
    return outcome.status === "accepted";
  } catch {
    return false;
  }
}

/**
 * The Development Data Store's manifest-published loopback bind address:
 * the accepted T026 manifest publishes its port as `127.0.0.1:<port>:3306`,
 * so the database endpoint is probed on the manifest's own bind address —
 * never on the (possibly different) configured application host.
 */
const DEVELOPMENT_DATABASE_BIND_HOST = "127.0.0.1";

/** Resolve whether one host endpoint can be bound right now. */
function checkHostEndpointAvailable(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, host);
  });
}

/**
 * The preflight endpoint-availability core (T028-B02/B04): every daily
 * endpoint — the application port, both derived native-process ports, and
 * the Development database port — must be in range (B02), mutually
 * distinct (B02), and free to bind right now. Public/server/Admin bind the
 * CONFIGURED application host (the canonical boundary accepts any strict
 * loopback host, not only 127.0.0.1), and the database port is probed on
 * the T026 manifest's own loopback publication address. An occupied,
 * colliding, or out-of-range endpoint therefore fails preflight before any
 * application work. Exported for the focused accepted-host regression
 * evidence (the same exception as `npmVersionSatisfiesEngines`).
 */
export async function checkDailyEndpointsAvailable(config) {
  const appHost =
    typeof config?.APP_HOST === "string" && config.APP_HOST !== ""
      ? config.APP_HOST.replace(/^\[|\]$/g, "")
      : "127.0.0.1";
  const appPort = DECIMAL_INTEGER_PATTERN.test(config?.APP_PORT ?? "")
    ? Number.parseInt(config.APP_PORT, 10)
    : DEVELOPMENT_APP_PORT_FALLBACK;
  let databasePort = DEVELOPMENT_DATABASE_PORT;
  try {
    const endpoint = new URL(config.DATABASE_URL ?? "");
    if (DECIMAL_INTEGER_PATTERN.test(endpoint.port)) {
      databasePort = Number.parseInt(endpoint.port, 10);
    }
  } catch {
    // Fall back to the documented database port above.
  }
  const applicationPorts = [
    appPort,
    appPort + SERVER_PORT_OFFSET,
    appPort + ADMIN_PORT_OFFSET,
  ];
  const ports = [...applicationPorts, databasePort];
  const inRange = ports.every(
    (port) => Number.isInteger(port) && port >= 1 && port <= MAX_TCP_PORT,
  );
  // The three application ports are distinct by construction while in
  // range; a duplicate proves an endpoint collision.
  if (!inRange || new Set(ports).size !== ports.length) {
    return false;
  }
  const available = await Promise.all([
    ...applicationPorts.map((port) => checkHostEndpointAvailable(appHost, port)),
    checkHostEndpointAvailable(DEVELOPMENT_DATABASE_BIND_HOST, databasePort),
  ]);
  return available.every((isAvailable) => isAvailable);
}

/**
 * The documented AND derived loopback endpoints of the daily target
 * (local configuration, or the committed example as the non-mutating
 * fallback source) are valid and bindable.
 */
async function checkDevelopmentPortsAvailable() {
  const config =
    (await readEnvironmentFile(DEVELOPMENT_ENV_FILE)) ??
    (await readEnvironmentFile(DEVELOPMENT_ENV_EXAMPLE_FILE)) ??
    {};
  return checkDailyEndpointsAvailable(config);
}

/**
 * The stable checkout-scoped identity (T026 manifest): the Compose project
 * name and the `SONGHEALTH_CHECKOUT_ID` ownership label value are derived
 * from the checkout root so every checkout presents its own exact
 * ownership value while repeated invocations of the same checkout resolve
 * to the same project and therefore the same container/network/volume —
 * repetition cannot duplicate the database resource.
 */
function checkoutScopedIdentity() {
  const digest = createHash("sha256").update(REPOSITORY_ROOT).digest("hex");
  return {
    checkoutId: digest.slice(0, 16),
    composeProjectName: `songhealth-dev-${digest.slice(0, 12)}`,
  };
}

/**
 * Start (or reconcile to running) ONLY the Development database service of
 * the accepted T026 manifest. `compose up --detach` is idempotent for a
 * fixed checkout-scoped project name, and the manifest renders only when
 * the runtime-supplied checkout ownership input is present.
 */
async function startDevelopmentDatabase() {
  const { checkoutId, composeProjectName } = checkoutScopedIdentity();
  await execFileAsync(
    "podman",
    [
      "compose",
      "--file",
      "infra/compose.development.yaml",
      "--project-name",
      composeProjectName,
      "up",
      "--detach",
      "database",
    ],
    {
      cwd: REPOSITORY_ROOT,
      env: { ...process.env, SONGHEALTH_CHECKOUT_ID: checkoutId },
      timeout: DATABASE_START_TIMEOUT_MS,
    },
  );
}

/**
 * Stop ONLY the Development database service of the accepted T026 manifest.
 * The exact checkout-scoped Compose `stop database` operation is
 * AUTHORITATIVE (T029-B01): it is issued unconditionally, never gated on
 * endpoint readiness — a database container can be running while starting,
 * unhealthy, or otherwise not accepting connections, so a non-accepting
 * endpoint is never proof of container absence. `compose stop` gracefully
 * halts the exact named container WITHOUT removing it, its network, or its
 * named volume — routine stop never touches Development data
 * (FR-004/SC-002); removal is exclusively the later, explicitly confirmed
 * reset/cleanup path. Repetition is safe through the stop operation itself:
 * stopping an already-stopped or absent container of this exact
 * checkout-scoped project is a successful no-op reconcile, so repeated
 * `dev:stop` invocations re-issue the same exact stop and still succeed.
 * No configuration value is read or surfaced — the exact project/service
 * addressing derives only from the checkout identity.
 */
async function stopDevelopmentDatabase() {
  const { checkoutId, composeProjectName } = checkoutScopedIdentity();
  await execFileAsync(
    "podman",
    [
      "compose",
      "--file",
      "infra/compose.development.yaml",
      "--project-name",
      composeProjectName,
      "stop",
      "database",
    ],
    {
      cwd: REPOSITORY_ROOT,
      env: { ...process.env, SONGHEALTH_CHECKOUT_ID: checkoutId },
      timeout: DATABASE_STOP_TIMEOUT_MS,
    },
  );
}

/** Per-attempt bound for one engine-acceptance TCP probe (milliseconds). */
const DATABASE_PROBE_TIMEOUT_MS = 1_000;

/**
 * Whether a TCP endpoint accepts connections right now: one bounded connect
 * attempt. A failed, refused, or timed-out attempt is simply
 * not-yet-ready/absent; no detail is surfaced (the callers map outcomes to
 * closed Safe Diagnostics only).
 */
function tcpEndpointAcceptsConnections(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const settle = (accepting) => {
      socket.destroy();
      resolve(accepting);
    };
    socket.setTimeout(timeoutMs, () => {
      settle(false);
    });
    socket.once("error", () => {
      settle(false);
    });
    socket.once("connect", () => {
      settle(true);
    });
  });
}

/**
 * Whether the Development database engine is accepting connections RIGHT
 * NOW (the `database.isRunning` readiness semantics for setup): one bounded
 * TCP connect against the configured loopback database endpoint. The
 * official MySQL image brings the port up only after initialization
 * completes, so an accepted connection is the usable-engine signal the
 * bounded wait in `devSetup` polls for. A failed or timed-out probe is
 * simply not-yet-ready; no detail is surfaced.
 */
async function isDevelopmentDatabaseAcceptingConnections() {
  const config = await loadDevelopmentConfiguration();
  let host = "127.0.0.1";
  let port = DEVELOPMENT_DATABASE_PORT;
  try {
    const endpoint = new URL(config.DATABASE_URL);
    if (endpoint.hostname !== "") {
      host = endpoint.hostname.replace(/^\[|\]$/g, "");
    }
    if (DECIMAL_INTEGER_PATTERN.test(endpoint.port)) {
      port = Number.parseInt(endpoint.port, 10);
    }
  } catch {
    // not-yet-valid configuration: probe the documented default endpoint
  }
  return tcpEndpointAcceptsConnections(host, port, DATABASE_PROBE_TIMEOUT_MS);
}

/**
 * Bridge for importing the accepted TypeScript migration boundary from
 * this JavaScript module under Node's native type stripping: the server
 * sources use TypeScript's `.js` extension convention, so a failed `.js`
 * resolution is retried as `.ts` for files under this repository. Uses
 * only Node builtins (`node:module`); no dependency or build step is
 * introduced. Registered lazily so test-time imports of this module never
 * touch process-wide resolution.
 */
let serverTypeScriptBridgeRegistered = false;
function registerServerTypeScriptBridge() {
  if (serverTypeScriptBridgeRegistered) {
    return;
  }
  serverTypeScriptBridgeRegistered = true;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.endsWith(".js")) {
          try {
            return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
          } catch {
            // fall through and surface the original resolution failure
          }
        }
        throw error;
      }
    },
  });
}

/**
 * Explicitly apply tracked migrations through the accepted T013 boundary
 * (`apps/server/src/migrations.ts` owns the migration inventory; no
 * caller-supplied version list exists here). The apply itself is
 * idempotent, and the pool is always closed.
 */
async function applyTrackedMigrations() {
  registerServerTypeScriptBridge();
  const config = await loadDevelopmentConfiguration();
  const poolMax = DECIMAL_INTEGER_PATTERN.test(config.DATABASE_POOL_MAX ?? "")
    ? Number.parseInt(config.DATABASE_POOL_MAX, 10)
    : undefined;
  const serverDatabase = await import(
    pathToFileURL(path.join(REPOSITORY_ROOT, "apps/server/src/database.ts")).href
  );
  const serverMigrations = await import(
    pathToFileURL(path.join(REPOSITORY_ROOT, "apps/server/src/migrations.ts")).href
  );
  const database = await serverDatabase.createDatabase(
    config.DATABASE_URL,
    poolMax,
  );
  try {
    const applied = await serverMigrations.applyMigrations(database);
    if (!applied || applied.state !== "current") {
      throw new Error("tracked migrations are not current after the explicit apply");
    }
  } finally {
    await serverDatabase.closeDatabase(database);
  }
}

// ---------------------------------------------------------------------------
// T028 real adapters — supervised native daily processes and the
// whole-foundation readiness probe. Used only by the command-line entry
// point; the accepted tests always inject their own collaborators, so
// nothing in this section runs under test.
// ---------------------------------------------------------------------------

/** Per-attempt bound for one native-process endpoint probe (milliseconds). */
const PROCESS_PROBE_TIMEOUT_MS = 1_000;
/** Bounded supervised wait for a spawned native process to accept connections. */
const PROCESS_START_TIMEOUT_MS = 60_000;
const PROCESS_START_POLL_INTERVAL_MS = 250;
/** Bounded supervised wait for a signalled native process's endpoint to close. */
const PROCESS_STOP_TIMEOUT_MS = 30_000;
const PROCESS_STOP_POLL_INTERVAL_MS = 250;
/** Per-attempt bound for one readiness HTTP request (milliseconds). */
const READINESS_REQUEST_TIMEOUT_MS = 2_000;
/** Command-line defaults for the injected bounded overall-readiness poll. */
const READINESS_DEADLINE_MS = 120_000;
const READINESS_POLL_INTERVAL_MS = 500;

/** Ignored checkout-local retention for supervised native-process output. */
const PROCESS_LOG_DIRECTORY = path.join(
  REPOSITORY_ROOT,
  ".foundation-state",
  "development",
  "logs",
);

/**
 * Ignored checkout-local retention for the supervised native processes'
 * recorded process IDs (T029): the stop adapter's exact handle onto the
 * process group it spawned. Like the logs, this is ignored checkout-local
 * runtime state, never a committed artifact.
 */
const PROCESS_PID_DIRECTORY = path.join(
  REPOSITORY_ROOT,
  ".foundation-state",
  "development",
  "pids",
);

/**
 * The per-process command-line marker proving a recorded PID still names
 * THIS checkout's native process (the exact-ownership guard before any
 * signal): every spawned argv carries it — the server child through its
 * eval source, Public/Admin through their workspace selectors — so a
 * recycled foreign PID can never be signalled as ours.
 */
const PROCESS_IDENTITY_MARKERS = {
  server: "SONGHEALTH_SERVER_ENTRY_PATH",
  public: "apps/web",
  admin: "apps/admin",
};

/**
 * The server-process entry evaluated by the spawned Node child: it reuses
 * the accepted T016 composition boundary (`createServer`) and binds the
 * caller-owned listener at the derived operational endpoint. Configuration
 * travels as process environment (never surfaced on any output surface); a
 * rejected composition exits non-zero, which the supervisor observes as a
 * failed start. The `.js`→`.ts` resolution retry mirrors the repository's
 * TypeScript extension convention for the server sources.
 */
const SERVER_PROCESS_ENTRY = [
  "import { registerHooks } from 'node:module';",
  "import { pathToFileURL } from 'node:url';",
  "registerHooks({",
  "  resolve(specifier, context, nextResolve) {",
  "    try {",
  "      return nextResolve(specifier, context);",
  "    } catch (error) {",
  "      if (specifier.endsWith('.js')) {",
  "        try {",
  "          return nextResolve(specifier.slice(0, -3) + '.ts', context);",
  "        } catch {}",
  "      }",
  "      throw error;",
  "    }",
  "  },",
  "});",
  "const entryPath = process.env.SONGHEALTH_SERVER_ENTRY_PATH;",
  "const host = process.env.SONGHEALTH_SERVER_ENTRY_HOST;",
  "const port = Number(process.env.SONGHEALTH_SERVER_ENTRY_PORT);",
  "if (entryPath === undefined || host === undefined || !Number.isInteger(port)) {",
  "  process.exitCode = 1;",
  "} else {",
  "  const server = await import(pathToFileURL(entryPath).href);",
  "  const composed = await server.createServer({",
  "    env: process.env,",
  "    operationTarget: 'development',",
  "  });",
  "  if (composed.status !== 'ready') {",
  "    process.exitCode = 1;",
  "  } else {",
  "    await composed.capabilities.app.listen({ host, port });",
  "  }",
  "}",
].join("\n");

/** Resolve a native daily process's loopback endpoint; null when unknown. */
function nativeProcessEndpoint(name, host, appPort) {
  if (name === "public") return { host, port: appPort };
  if (name === "server") return { host, port: appPort + SERVER_PORT_OFFSET };
  if (name === "admin") return { host, port: appPort + ADMIN_PORT_OFFSET };
  return null;
}

/** The daily application endpoint from the local configuration record. */
function resolveDevelopmentAppEndpoint(config) {
  let host = "127.0.0.1";
  let port = DEVELOPMENT_APP_PORT_FALLBACK;
  if (typeof config?.APP_HOST === "string" && config.APP_HOST !== "") {
    host = config.APP_HOST.replace(/^\[|\]$/g, "");
  }
  if (DECIMAL_INTEGER_PATTERN.test(config?.APP_PORT ?? "")) {
    port = Number.parseInt(config.APP_PORT, 10);
  }
  return { host, port };
}

/** Bracket an IPv6 literal host for use inside a URL. */
function formatHostForUrl(host) {
  return host.includes(":") ? `[${host}]` : host;
}

/** Open (creating) the retained output file for one supervised process. */
async function openProcessLogFile(name) {
  await mkdir(PROCESS_LOG_DIRECTORY, { recursive: true });
  return open(path.join(PROCESS_LOG_DIRECTORY, `${name}.log`), "a");
}

/**
 * Spawn one detached native process whose retained output goes to the
 * ignored checkout-local process log — never onto a command surface. The
 * child is unref'd so the daily command returns while the process keeps
 * running; stopping it is the `dev:stop` operation's owned behavior (T029).
 */
function spawnDetachedNativeProcess(command, args, env, logHandle) {
  const child = spawn(command, args, {
    cwd: REPOSITORY_ROOT,
    env,
    detached: true,
    stdio: ["ignore", logHandle.fd, logHandle.fd],
  });
  child.unref();
  return child;
}

/**
 * Supervise one freshly spawned native process until its endpoint accepts
 * connections. Fails closed on early child exit, spawn error, or the bounded
 * start deadline by throwing (the operation maps that to one closed
 * STARTUP_FAILED diagnostic); raw child output is never surfaced.
 */
async function superviseNativeProcessStart(child, endpoint) {
  let exited = false;
  child.once("exit", () => {
    exited = true;
  });
  child.once("error", () => {
    exited = true;
  });
  const deadline = Date.now() + PROCESS_START_TIMEOUT_MS;
  for (;;) {
    if (exited || child.exitCode !== null) {
      throw new Error("native process exited before accepting connections");
    }
    if (
      await tcpEndpointAcceptsConnections(endpoint.host, endpoint.port, PROCESS_PROBE_TIMEOUT_MS)
    ) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error("native process did not accept connections within the bounded start wait");
    }
    await new Promise((resolve) => {
      setTimeout(resolve, PROCESS_START_POLL_INTERVAL_MS);
    });
  }
}

/**
 * `processes.start(name)` — start one native daily process. Idempotent: a
 * process whose endpoint already accepts connections is left untouched, so
 * repeated `dev:start` invocations create no duplicate process (the same
 * adapter-owned idempotency the accepted T019 contract drives through the
 * injected seam).
 */
async function startNativeProcess(name) {
  const config = await loadDevelopmentConfiguration();
  const application = resolveDevelopmentAppEndpoint(config);
  const endpoint = nativeProcessEndpoint(name, application.host, application.port);
  if (endpoint === null) {
    throw new Error(`unknown native daily process: ${name}`);
  }
  if (
    await tcpEndpointAcceptsConnections(endpoint.host, endpoint.port, PROCESS_PROBE_TIMEOUT_MS)
  ) {
    return;
  }
  const logHandle = await openProcessLogFile(name);
  let child;
  try {
    if (name === "server") {
      child = spawnDetachedNativeProcess(
        process.execPath,
        ["--input-type=module", "--eval", SERVER_PROCESS_ENTRY],
        {
          ...process.env,
          ...config,
          SONGHEALTH_SERVER_ENTRY_PATH: path.join(
            REPOSITORY_ROOT,
            "apps/server/src/bootstrap.ts",
          ),
          SONGHEALTH_SERVER_ENTRY_HOST: endpoint.host,
          SONGHEALTH_SERVER_ENTRY_PORT: String(endpoint.port),
        },
        logHandle,
      );
    } else if (name === "public") {
      child = spawnDetachedNativeProcess(
        "npm",
        [
          "exec",
          "--workspace",
          "apps/web",
          "--",
          "react-router",
          "dev",
          "--host",
          endpoint.host,
          "--port",
          String(endpoint.port),
          "--strictPort",
        ],
        { ...process.env, ...config },
        logHandle,
      );
    } else {
      child = spawnDetachedNativeProcess(
        "npm",
        [
          "exec",
          "--workspace",
          "apps/admin",
          "--",
          "vite",
          "--host",
          endpoint.host,
          "--port",
          String(endpoint.port),
          "--strictPort",
        ],
        { ...process.env, ...config },
        logHandle,
      );
    }
  } finally {
    // The child holds its own duplicate of the descriptor; the supervisor's
    // copy is released immediately.
    await logHandle.close();
  }
  // Record the spawned group leader BEFORE supervision: a start that fails
  // supervision may still leave a live child, and `dev:stop` (T029) must be
  // able to stop it through its recorded process ID.
  await recordProcessPid(name, child.pid);
  await superviseNativeProcessStart(child, endpoint);
}

/**
 * `processes.isRunning(name)` — whether the process's endpoint currently
 * accepts connections (the adapter's own idempotency observation).
 */
async function isNativeProcessRunning(name) {
  try {
    const config = await loadDevelopmentConfiguration();
    const application = resolveDevelopmentAppEndpoint(config);
    const endpoint = nativeProcessEndpoint(name, application.host, application.port);
    if (endpoint === null) {
      return false;
    }
    return await tcpEndpointAcceptsConnections(
      endpoint.host,
      endpoint.port,
      PROCESS_PROBE_TIMEOUT_MS,
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// T029 real stop adapters — recorded-process teardown for the supervised
// native daily processes. Used only by the command-line entry point; the
// accepted tests always inject their own stop collaborators, so nothing in
// this section runs under test.
// ---------------------------------------------------------------------------

/** Record one spawned native process's group-leader PID (T029 stop handle). */
async function recordProcessPid(name, pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`native daily process exposed no pid: ${name}`);
  }
  await mkdir(PROCESS_PID_DIRECTORY, { recursive: true });
  await writeFile(path.join(PROCESS_PID_DIRECTORY, `${name}.pid`), String(pid), "utf8");
}

/** Read one recorded native-process PID; `null` when none is recorded. */
async function readProcessPid(name) {
  try {
    const text = await readFile(path.join(PROCESS_PID_DIRECTORY, `${name}.pid`), "utf8");
    const pid = Number.parseInt(text.trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/** Remove one recorded native-process PID (best-effort cleanup). */
async function removeProcessPid(name) {
  try {
    await rm(path.join(PROCESS_PID_DIRECTORY, `${name}.pid`), { force: true });
  } catch {
    // A stale record that cannot be removed is harmless: a later stop
    // re-checks liveness and identity before signalling anything.
  }
}

/**
 * Whether the recorded PID still names THIS checkout's native process: the
 * child's ACTUAL command line — read from `/proc/<pid>/cmdline` — must
 * POSITIVELY carry the per-process identity marker. Identity evidence is
 * required, never assumed (T029-B02): when the command line is unreadable
 * or missing (a non-`/proc` runtime, permission denial, an absent entry),
 * ownership is UNPROVEN and the caller must refuse to signal rather than
 * risk a recycled or foreign PID. The command line is verified and
 * immediately discarded — never surfaced on any output surface.
 */
async function recordedProcessIdentityHolds(pid, name) {
  const marker = PROCESS_IDENTITY_MARKERS[name];
  if (marker === undefined) {
    return false;
  }
  try {
    const commandLine = await readFile(`/proc/${pid}/cmdline`, "utf8");
    return commandLine.includes(marker);
  } catch {
    // Unreadable or missing identity evidence is unproven ownership, never
    // permission to signal (fail closed).
    return false;
  }
}

/**
 * Whether one recorded native process is still alive (signal-0 existence
 * probe; never a delivered signal).
 */
function recordedProcessIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait boundedly until one native process's endpoint stops accepting
 * connections after its termination signal. Throws at the bounded deadline
 * if the endpoint still accepts (the caller maps that to one closed Safe
 * Diagnostic — no force escalation exists in this Delivery).
 */
async function waitForNativeProcessStop(name) {
  const deadline = Date.now() + PROCESS_STOP_TIMEOUT_MS;
  for (;;) {
    if (!(await isNativeProcessRunning(name))) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(`native daily process still accepts connections: ${name}`);
    }
    await new Promise((resolve) => {
      setTimeout(resolve, PROCESS_STOP_POLL_INTERVAL_MS);
    });
  }
}

/**
 * `processes.stop(name)` — stop one native daily process owned by THIS
 * checkout. The exact stop handle is the process-group PID recorded by the
 * start adapter: `SIGTERM` to the negative PID terminates the child's whole
 * detached group (the npm/vite or node/eval tree), and nothing else.
 * Adapter-owned idempotency: no recorded PID means nothing this adapter
 * started (a never-started or already-stopped process) and stopping is a
 * no-op; a recorded process that already exited is not signalled again.
 * A signal is sent ONLY when the recorded PID's command-line identity is
 * POSITIVELY verified (T029-B02): an endpoint held with no recorded PID, a
 * recorded PID whose identity evidence is unreadable or missing, or a
 * recorded PID that no longer matches this checkout's process is NOT
 * signalled — signalling an unowned process is outside this Delivery's
 * ownership rules, so the adapter refuses (throws) and the operation
 * reports the closed failure for manual attention instead.
 */
async function stopNativeProcess(name) {
  if (PROCESS_IDENTITY_MARKERS[name] === undefined) {
    throw new Error(`unknown native daily process: ${name}`);
  }
  const pid = await readProcessPid(name);
  if (pid === null) {
    // Nothing recorded by this checkout's start. Only an endpoint still
    // held by an unowned listener refuses; otherwise this is the safe
    // repeated-stop no-op.
    if (await isNativeProcessRunning(name)) {
      throw new Error(`unowned listener holds the daily endpoint: ${name}`);
    }
    return;
  }
  if (!recordedProcessIsAlive(pid)) {
    // Already exited: the recorded handle is stale, nothing to signal.
    await removeProcessPid(name);
    return;
  }
  if (!(await recordedProcessIdentityHolds(pid, name))) {
    // The PID no longer names this checkout's process (recycled foreign
    // PID): drop the stale record and never signal an unowned process.
    await removeProcessPid(name);
    if (await isNativeProcessRunning(name)) {
      throw new Error(`recorded pid no longer names the daily process: ${name}`);
    }
    return;
  }
  try {
    // Negative PID addresses the child's whole detached process group.
    process.kill(-pid, "SIGTERM");
  } catch (error) {
    if (error?.code !== "ESRCH") {
      throw error;
    }
    // The group is already gone: nothing to signal.
  }
  await waitForNativeProcessStop(name);
  await removeProcessPid(name);
}

/**
 * One bounded HTTP observation; `null` when the request fails or times out
 * (never an exception — callers derive component states only).
 */
async function fetchObservation(url) {
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(READINESS_REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

/** Whether an HTML document boundary answered with 200 (SSR page / CSR shell). */
function isHtmlResponse(response) {
  if (response === null || response.status !== 200) {
    return false;
  }
  return (response.headers.get("content-type") ?? "").toLowerCase().includes("text/html");
}

/**
 * `readiness.probe()` — one whole-foundation readiness observation against
 * the running daily processes: liveness and the readiness payload (which
 * carries database connectivity and migration currency) on the operational
 * server, the Public SSR document at the configured public origin, and the
 * Admin CSR shell on its derived endpoint. Every failed or absent check is
 * simply a `not-ready` component; no raw request detail is returned.
 */
async function probeDailyReadiness() {
  const components = Object.fromEntries(
    READINESS_COMPONENTS.map((component) => [component, "not-ready"]),
  );
  let config = null;
  try {
    config = await loadDevelopmentConfiguration();
  } catch {
    return { ready: false, components };
  }
  const application = resolveDevelopmentAppEndpoint(config);
  const serverOrigin = `http://${formatHostForUrl(application.host)}:${
    application.port + SERVER_PORT_OFFSET
  }`;

  const liveness = await fetchObservation(`${serverOrigin}/health/live`);
  if (liveness !== null && liveness.status === 200) {
    components.liveness = "ready";
  }

  const readiness = await fetchObservation(`${serverOrigin}/health/ready`);
  if (
    readiness !== null &&
    (readiness.status === 200 || readiness.status === 503 || readiness.status === 500)
  ) {
    // The operational route answered its closed contract: reachable.
    components.serverRoute = "ready";
  }
  if (readiness !== null && readiness.status === 200) {
    try {
      const body = await readiness.json();
      if (body?.status === "ready") {
        components.readiness = "ready";
      }
      const database = Array.isArray(body?.components)
        ? body.components.find((entry) => entry?.name === "database")
        : undefined;
      if (database?.status === "ready") {
        components.database = "ready";
      }
    } catch {
      // The readiness payload was not the closed shape: stays not-ready.
    }
  }

  if (typeof config.PUBLIC_ORIGIN === "string" && config.PUBLIC_ORIGIN !== "") {
    if (isHtmlResponse(await fetchObservation(config.PUBLIC_ORIGIN))) {
      components.publicRoute = "ready";
    }
  }

  const adminShell = await fetchObservation(
    `http://${formatHostForUrl(application.host)}:${application.port + ADMIN_PORT_OFFSET}/`,
  );
  if (isHtmlResponse(adminShell)) {
    components.adminRoute = "ready";
  }

  const ready = READINESS_COMPONENTS.every((component) => components[component] === "ready");
  return { ready, components };
}

// ---------------------------------------------------------------------------
// T032 real adapters — the checkout-local lifecycle journal store and the
// SIGINT/SIGTERM interruption guard. Used only by the command-line entry
// point; the accepted tests always inject their own journal/interruption
// collaborators, so nothing in this section runs under test.
// ---------------------------------------------------------------------------

/** Ignored checkout-local runtime-state root (`.gitignore` §journal). */
const FOUNDATION_STATE_DIRECTORY = path.join(REPOSITORY_ROOT, ".foundation-state");

/** The per-operation-target journal file (data-model §Lifecycle Operation). */
function operationJournalPath(target) {
  return path.join(FOUNDATION_STATE_DIRECTORY, target, "operation.json");
}

/**
 * The real per-operation-target lifecycle journal store: the ignored
 * checkout-local `operation.json`, ATOMICALLY REPLACED by `rename` from a
 * same-directory temporary file created with mode `0600`, so no reader ever
 * observes a partial journal and no other local user can read it. The file
 * holds only the newest normalized safe record — never a protected value or
 * raw tool output. An ABSENT file observes no journal (`null`); a file that
 * exists but cannot be read or parsed THROWS, so its corrupt state refuses
 * work upstream instead of normalizing to absence (T032-B03) — classifying
 * that corrupted state is the recovery assessment's boundary (T033).
 */
const journalFileStore = {
  readLatest: async (target) => {
    let text;
    try {
      text = await readFile(operationJournalPath(target), "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        return null;
      }
      throw error;
    }
    return JSON.parse(text);
  },
  write: async (target, record) => {
    const destination = operationJournalPath(target);
    const directory = path.dirname(destination);
    await mkdir(directory, { recursive: true });
    const temporary = path.join(
      directory,
      `.${path.basename(destination)}.${process.pid}.tmp`,
    );
    try {
      await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, destination);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  },
};

/**
 * The SIGINT/SIGTERM interruption guard (Operations Contract §Failure
 * behavior; FR-017). While a journaled operation is between its pre-mutation
 * and terminal records, a signal records the `interrupted` journal with the
 * documented `OPERATION_INTERRUPTED` primary failure, attempts ONLY exact
 * current-run cleanup — the idempotent, checkout-owned stop of this
 * checkout's native daily processes and Development database, never a
 * destructive or broad path — and leaves the operation target
 * stopped/not-ready. The conventional signal exit semantics are then
 * preserved by restoring the default disposition and re-raising the same
 * signal. With no active journaled operation the guard re-raises
 * immediately, so every command keeps its conventional signal behavior.
 */
function installInterruptionGuard(collaborators) {
  let handling = false;
  const handlers = new Map();
  const handleSignal = async (signal) => {
    if (handling) {
      reraiseSignal(signal);
      return;
    }
    handling = true;
    const context = activeJournalContext;
    if (context !== null) {
      context.signalled = true;
      const failure = interruptionDiagnostic(DIAGNOSTIC_SCOPE_BY_TARGET[context.target] ?? "daily");
      try {
        await context.journal.write(context.target, {
          ...context.record,
          state: "interrupted",
          primaryFailure: failure,
          secondaryFailures: [],
          safeNextAction: "RETRY_SAFE_OPERATION",
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // The journal is best-effort here; the interruption still exits.
      }
      if (context.target === DAILY_OPERATION_TARGET) {
        for (const name of NATIVE_PROCESSES) {
          try {
            await collaborators.processes.stop(name);
          } catch {
            // Exact current-run cleanup is attempted, never escalated.
          }
        }
        try {
          await collaborators.database.stop();
        } catch {
          // Exact current-run cleanup is attempted, never escalated.
        }
      }
    }
    reraiseSignal(signal);
  };
  const reraiseSignal = (signal) => {
    for (const [name, handler] of handlers) {
      process.removeListener(name, handler);
    }
    // Default disposition: the process dies with the conventional signal
    // exit semantics (128 + signal number), exactly as without the guard.
    process.kill(process.pid, signal);
  };
  for (const name of ["SIGINT", "SIGTERM"]) {
    const handler = (signal) => {
      void handleSignal(signal);
    };
    handlers.set(name, handler);
    process.once(name, handler);
  }
  return () => {
    for (const [name, handler] of handlers) {
      process.removeListener(name, handler);
    }
  };
}

/** The real collaborator set for the command-line entry point. */
function createCommandLineCollaborators() {
  return {
    preflight: {
      node: async () => checkNodeRuntime(),
      npm: checkNpmCli,
      podman: async () => externalToolSucceeds("podman", ["--version"]),
      compose: async () => externalToolSucceeds("podman", ["compose", "version"]),
      requiredFiles: checkRequiredFiles,
      safeConfig: checkSafeDevelopmentConfiguration,
      portAvailable: checkDevelopmentPortsAvailable,
    },
    database: {
      start: startDevelopmentDatabase,
      stop: stopDevelopmentDatabase,
      isRunning: isDevelopmentDatabaseAcceptingConnections,
      applyMigrations: applyTrackedMigrations,
    },
    processes: {
      // T028 owns supervised start/idempotency observation; T029 owns the
      // recorded-process stop of the same native daily processes.
      start: startNativeProcess,
      stop: stopNativeProcess,
      isRunning: isNativeProcessRunning,
    },
    readiness: {
      probe: probeDailyReadiness,
    },
    clock: {
      now: () => Date.now(),
      advance: async (ms) => {
        await new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
      },
    },
    config: {
      // T032-B01/B03 — the validating real source: the canonical boundary
      // (the single configuration policy) is enforced at the source, so the
      // journaled command lifecycle refuses forbidden configurations before
      // any work with exactly the canonical closed diagnostics.
      load: loadValidatedDevelopmentConfiguration,
    },
    output: {
      stdout: async (unit) => {
        process.stdout.write(`${JSON.stringify(unit)}\n`);
      },
      stderr: async (unit) => {
        process.stderr.write(`${JSON.stringify(unit)}\n`);
      },
    },
    // T032 — the real checkout-local lifecycle journal (mode-0600 atomic
    // per-operation-target store) and the signal-guard collaborators.
    journal: journalFileStore,
  };
}

// ---------------------------------------------------------------------------
// Command-line entry point (`npm run foundation:check` / `npm run
// dev:setup` / `npm run dev:start` / `npm run dev:ready` / `npm run
// dev:stop` / `npm run dev:restart`). Failures are printed as their closed
// Safe Diagnostics only; success prints one bounded safe line. The module's
// import by tests never enters this path.
// ---------------------------------------------------------------------------

/** Read one `--option value` (or `--option=value`) argument. */
function readOption(args, name) {
  const flag = `--${name}`;
  const index = args.indexOf(flag);
  if (index >= 0 && index + 1 < args.length) {
    return args[index + 1];
  }
  const prefix = `${flag}=`;
  const prefixed = args.find((arg) => arg.startsWith(prefix));
  return prefixed === undefined ? undefined : prefixed.slice(prefix.length);
}

async function runCommandLine(args) {
  const [command, ...rest] = args;
  const collaborators = createCommandLineCollaborators();
  // T032 — the SIGINT/SIGTERM interruption guard is installed for the whole
  // command: it records `OPERATION_INTERRUPTED` and attempts exact
  // current-run cleanup only while a journaled operation is actually
  // running, and otherwise preserves the conventional signal behavior.
  const removeInterruptionGuard = installInterruptionGuard(collaborators);
  let result;
  try {
    if (command === "foundation:check") {
      result = await foundationCheck(collaborators);
    } else if (command === "dev:setup") {
      result = await devSetup(collaborators, readOption(rest, "target") ?? DAILY_OPERATION_TARGET);
    } else if (command === "dev:start") {
      result = await devStart(collaborators);
    } else if (command === "dev:ready") {
      result = await devReady(collaborators, {
        deadlineMs: READINESS_DEADLINE_MS,
        pollMs: READINESS_POLL_INTERVAL_MS,
      });
    } else if (command === "dev:stop") {
      result = await devStop(collaborators);
    } else if (command === "dev:restart") {
      result = await devRestart(collaborators);
    } else {
      result = await rejectOperation(
        collaborators,
        safeDiagnostic(
          "OPERATIONAL_FAILURE",
          "foundation",
          "orchestration",
          "CHECK_PREREQUISITES",
        ),
      );
    }
  } finally {
    removeInterruptionGuard();
  }
  if (result.exitCode === 0) {
    const summaries = {
      "dev:setup": "development database ready; tracked migrations current",
      "dev:start": "development database running; native server/public/admin processes started",
      "dev:ready": "development foundation ready",
      "dev:stop": "development native processes and database stopped; named volume preserved",
      "dev:restart": "development foundation stopped then started; development data preserved",
    };
    const summary = summaries[command] ?? "preflight checks passed";
    process.stdout.write(`${command}: ${summary}\n`);
  }
  process.exitCode = result.exitCode;
}

const isEntryPoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isEntryPoint) {
  await runCommandLine(process.argv.slice(2));
}

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
 * --detach` reconciles; `compose stop` addresses only the exact named
 * database container; the migration boundary is idempotent; a native
 * process whose endpoint already accepts connections is not spawned
 * again, and a recorded process that is already gone is not signalled),
 * never by hidden module state.
 *
 * T030+ operations (`foundation:inventory`, `dev:reset`,
 * `foundation:cleanup`) are exported as bounded not-implemented stubs so
 * the accepted tests-first contract can import the complete planned
 * boundary; they throw until their owning tasks implement them.
 */

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
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
 * Configuration validation is delegated to the accepted T010 canonical
 * boundary, so the exact canonical Development semantics (including the
 * `APP_HOST`/`APP_PORT`-bound bare-HTTP public origin and the canonical
 * Development database user/name) are enforced with no second policy.
 * Every failure is actionable and non-zero, and is emitted as closed Safe
 * Diagnostics on the command output surfaces only.
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

  let config;
  try {
    config = await collaborators.config.load();
  } catch {
    return rejectOperation(
      collaborators,
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
  } catch {
    return {
      rejected: await rejectOperation(
        collaborators,
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
 * `dev:start` — supervised native daily startup. Re-validate the canonical
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
export async function devStart(collaborators) {
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
 */
export async function devStop(collaborators) {
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
 * FULL `dev:stop` teardown runs first and must succeed, and only then does
 * the FULL accepted T028 `dev:start` sequence run — unchanged, including
 * its own canonical identity validation, endpoint validation, and closed
 * failure mapping. Development data survives the sequence because the stop
 * phase preserves the Development named volume and the start phase
 * reconciles the same checkout-scoped resources; a failed phase returns
 * exactly that phase's documented non-zero result.
 */
export async function devRestart(collaborators) {
  const stopped = await devStop(collaborators);
  if (stopped.exitCode !== 0) {
    return stopped;
  }
  return devStart(collaborators);
}

// ---------------------------------------------------------------------------
// T030+ operations — bounded not-implemented stubs. The accepted
// tests-first contract imports the complete planned boundary; each stub
// throws until its owning task implements the operation. No stub performs
// any work, so no later-task behavior can run early.
// ---------------------------------------------------------------------------

function notImplemented(command) {
  return async () => {
    throw new Error(`operation not implemented by T029: ${command}`);
  };
}

/** `foundation:inventory` — T030–T031 scope. */
export const foundationInventory = notImplemented("foundation:inventory");
/** `dev:reset` — T031 scope. */
export const devReset = notImplemented("dev:reset");
/** `foundation:cleanup` — T031 scope. */
export const foundationCleanup = notImplemented("foundation:cleanup");

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
 * `compose stop` gracefully halts the exact checkout-scoped named container
 * WITHOUT removing it, its network, or its named volume — routine stop never
 * touches Development data (FR-004/SC-002); removal is exclusively the
 * later, explicitly confirmed reset/cleanup path. Adapter-owned
 * idempotency: when the engine's loopback endpoint is not accepting
 * connections there is nothing to stop, so repeated `dev:stop` invocations
 * stop nothing and still succeed; unreadable local configuration does not
 * block the stop (the exact project/service addressing needs no
 * configuration value).
 */
async function stopDevelopmentDatabase() {
  try {
    if (!(await isDevelopmentDatabaseAcceptingConnections())) {
      return;
    }
  } catch {
    // Unreadable local configuration: proceed to the stop anyway — Compose
    // addresses only this checkout-scoped project's exact named container,
    // and no configuration value is surfaced anywhere.
  }
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
 * Whether the recorded PID still names THIS checkout's native process: on
 * `/proc`-exposing runtimes the child's actual command line must still
 * carry the per-process identity marker, so a recycled foreign PID is
 * never signalled as ours; where `/proc` is unavailable, liveness alone is
 * the best available guard. The command line is verified and discarded —
 * never surfaced on any output surface.
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
    // The runtime does not expose /proc (or the process is already gone):
    // the caller's liveness check remains the guard.
    return true;
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
 * An endpoint held with no recorded PID, or a recorded PID whose command
 * line no longer matches this checkout's process, is NOT signalled —
 * signalling an unowned process is outside this Delivery's ownership rules,
 * so the adapter refuses (throws) and the operation reports the closed
 * failure for manual attention instead.
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
      load: loadDevelopmentConfiguration,
    },
    output: {
      stdout: async (unit) => {
        process.stdout.write(`${JSON.stringify(unit)}\n`);
      },
      stderr: async (unit) => {
        process.stderr.write(`${JSON.stringify(unit)}\n`);
      },
    },
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
  let result;
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

/**
 * T027 — foundation prerequisite checking and idempotent Development
 * database setup.
 *
 * References: FR-003, FR-006, SC-001; Operations Contract §Prerequisites /
 * §Commands / §Configuration examples / §Safe diagnostic contract /
 * §Timing boundaries; plan.md §Configuration and startup + §Operations and
 * verification; accepted T019/T020 contract
 * `scripts/foundation-operations.test.ts`; accepted T023 diagnostic-surface
 * contract `tests/verification/diagnostic-surfaces.test.ts`; accepted T026
 * manifest `infra/compose.development.yaml`; accepted T013 migration
 * boundary `apps/server/src/migrations.ts` (`applyMigrations(db)`);
 * accepted T010 canonical configuration boundary
 * `apps/server/src/config.ts` (`loadRuntimeConfiguration`).
 *
 * This module owns ONLY the operations boundary behavior the accepted
 * contracts pin for `foundation:check` and `dev:setup`:
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
 *
 * Determinism: all external effect is routed through the injected
 * collaborator set, so the accepted tests drive these operations with
 * fakes and no real tool, process, listener, or host mutation occurs under
 * test. The real adapters at the bottom of this file are used only by the
 * command-line entry point. Idempotency of repeated `dev:setup` is owned
 * by the adapters (`compose up --detach` reconciles; the migration
 * boundary is idempotent), never by hidden module state.
 *
 * T028+ operations (`dev:start`, `dev:ready`, `dev:stop`, `dev:restart`,
 * `foundation:inventory`, `dev:reset`, `foundation:cleanup`) are exported
 * as bounded not-implemented stubs so the accepted tests-first contract
 * can import the complete planned boundary; they throw until their owning
 * tasks implement them.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
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
 * Reject an operation: emit the closed diagnostic and return the non-zero
 * result carrying the same safe fields.
 */
async function rejectOperation(collaborators, diagnostic) {
  await emitDiagnostic(collaborators, diagnostic, COMMAND_SURFACES);
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
// T028+ operations — bounded not-implemented stubs. The accepted
// tests-first contract imports the complete planned boundary; each stub
// throws until its owning task implements the operation. No stub performs
// any work, so no later-task behavior can run early.
// ---------------------------------------------------------------------------

function notImplemented(command) {
  return async () => {
    throw new Error(`operation not implemented by T027: ${command}`);
  };
}

/** `dev:start` — T028 scope. */
export const devStart = notImplemented("dev:start");
/** `dev:ready` — T028 scope. */
export const devReady = notImplemented("dev:ready");
/** `dev:stop` — T029 scope. */
export const devStop = notImplemented("dev:stop");
/** `dev:restart` — T029 scope. */
export const devRestart = notImplemented("dev:restart");
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

/** Resolve whether a loopback port can be bound right now. */
function checkLoopbackPortAvailable(port) {
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
    server.listen(port, "127.0.0.1");
  });
}

/** The documented loopback ports for the daily target are bindable. */
async function checkDevelopmentPortsAvailable() {
  const config =
    (await readEnvironmentFile(DEVELOPMENT_ENV_FILE)) ??
    (await readEnvironmentFile(DEVELOPMENT_ENV_EXAMPLE_FILE)) ??
    {};
  const appPort = DECIMAL_INTEGER_PATTERN.test(config.APP_PORT ?? "")
    ? Number.parseInt(config.APP_PORT, 10)
    : DEVELOPMENT_APP_PORT_FALLBACK;
  const available = await Promise.all([
    checkLoopbackPortAvailable(appPort),
    checkLoopbackPortAvailable(DEVELOPMENT_DATABASE_PORT),
  ]);
  return available.every((isAvailable) => isAvailable);
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

/** Per-attempt bound for one engine-acceptance TCP probe (milliseconds). */
const DATABASE_PROBE_TIMEOUT_MS = 1_000;

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
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const settle = (accepting) => {
      socket.destroy();
      resolve(accepting);
    };
    socket.setTimeout(DATABASE_PROBE_TIMEOUT_MS, () => {
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
      isRunning: isDevelopmentDatabaseAcceptingConnections,
      applyMigrations: applyTrackedMigrations,
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
// dev:setup`). Failures are printed as their closed Safe Diagnostics only;
// success prints one bounded safe line. The module's import by tests never
// enters this path.
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
    const summary =
      command === "dev:setup"
        ? "development database ready; tracked migrations current"
        : "preflight checks passed";
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

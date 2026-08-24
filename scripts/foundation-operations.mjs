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
 * boundary `apps/server/src/migrations.ts` (`applyMigrations(db)`).
 *
 * This module owns ONLY the operations boundary behavior the accepted
 * contracts pin for `foundation:check` and `dev:setup`:
 *   - `foundationCheck` routes every prerequisite category (Node, npm,
 *     Podman, Compose, required files, safe execution-context
 *     configuration, port availability) through the injected preflight
 *     collaborators, performs no service work of any kind, and fails
 *     non-zero with a closed Safe Diagnostic when any category fails.
 *   - `devSetup` validates the selectable local operation target and the
 *     Development/daily execution identity BEFORE any work (the six
 *     documented rejection classes: `CONFIG_MISSING`, `CONFIG_EMPTY`,
 *     `CONFIG_MALFORMED`, `CONFIG_UNSUPPORTED`, `CONFIG_OUT_OF_RANGE`,
 *     `CONFIG_IDENTITY_CONFLICT`), then starts only the Development
 *     database dependency and explicitly applies tracked migrations after
 *     it is running. Every failure is actionable, non-zero, and emitted as
 *     exactly one closed Safe Diagnostic per owned output surface — never
 *     a configuration value, credential, connection string, raw
 *     child-process output, or host/filesystem detail.
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

/** The ten required execution-context keys (contract §Configuration examples). */
const CONFIGURATION_KEYS = [
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
];

/** Closed enum spaces (mirrored from the accepted configuration schema). */
const ENVIRONMENT_VALUES = ["development", "staging", "production"];
const RUNTIME_PROFILE_VALUES = ["daily", "verification", "hosted"];
const PROXY_POLICY_VALUES = ["none", "one-hop", "hosting-defined"];
const LOG_LEVEL_VALUES = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];
const FIXTURE_PROVENANCE_VALUES = ["synthetic", "approved-non-production"];
/** Loopback-only hosts for the daily Development execution context. */
const LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "::1"];

/** Bounded local numeric ranges (mirrored from the accepted configuration schema). */
const PORT_MIN = 1;
const PORT_MAX = 65535;
const DATABASE_POOL_MAX_MIN = 1;
const DATABASE_POOL_MAX_MAX = 100;

/** Strict decimal-integer grammar: digits only (no sign, exponent, or padding). */
const DECIMAL_INTEGER_PATTERN = /^[0-9]+$/;

/** Simple host shape (no userinfo, whitespace, or path separators). */
const HOST_SHAPE_PATTERN = /^[A-Za-z0-9.:[\]-]+$/;

/**
 * Strict `mysql://` / `mysql2://` connection-URL grammar. The credential
 * charset excludes the URL structural characters (`@`, `/`), whitespace,
 * and quotes, so a structurally broken connection URL cannot pass as
 * well-formed. Only shape is inspected; the value is never emitted.
 */
const DATABASE_URL_PATTERN =
  /^(mysql2?):\/\/([A-Za-z0-9_.-]+)(?::([^/@\s"'\\]*))?@(\[[A-Za-z0-9:]+\]|[A-Za-z0-9.-]+)(?::([0-9]{1,5}))?\/([A-Za-z0-9_]+)$/;

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

/**
 * Classify one execution-context value against the Development/daily
 * identity. Returns `undefined` when the value is safe, or the two safe
 * fields of the rejection: the documented class reason code and the safe
 * configuration key name. No value is ever returned or retained.
 */
function classifyConfigurationValue(key, value) {
  switch (key) {
    case "APP_ENVIRONMENT":
      if (!ENVIRONMENT_VALUES.includes(value)) {
        return { reasonCode: "CONFIG_UNSUPPORTED", configurationKey: key };
      }
      if (value !== "development") {
        return { reasonCode: "CONFIG_IDENTITY_CONFLICT", configurationKey: key };
      }
      return undefined;
    case "RUNTIME_PROFILE":
      if (!RUNTIME_PROFILE_VALUES.includes(value)) {
        return { reasonCode: "CONFIG_UNSUPPORTED", configurationKey: key };
      }
      if (value !== "daily") {
        return { reasonCode: "CONFIG_IDENTITY_CONFLICT", configurationKey: key };
      }
      return undefined;
    case "APP_HOST":
      if (!HOST_SHAPE_PATTERN.test(value)) {
        return { reasonCode: "CONFIG_MALFORMED", configurationKey: key };
      }
      if (!LOOPBACK_HOSTS.includes(value)) {
        return { reasonCode: "CONFIG_IDENTITY_CONFLICT", configurationKey: key };
      }
      return undefined;
    case "APP_PORT": {
      if (!DECIMAL_INTEGER_PATTERN.test(value)) {
        return { reasonCode: "CONFIG_MALFORMED", configurationKey: key };
      }
      const port = Number.parseInt(value, 10);
      if (port < PORT_MIN || port > PORT_MAX) {
        return { reasonCode: "CONFIG_OUT_OF_RANGE", configurationKey: key };
      }
      return undefined;
    }
    case "PUBLIC_ORIGIN": {
      let origin;
      try {
        origin = new URL(value);
      } catch {
        return { reasonCode: "CONFIG_MALFORMED", configurationKey: key };
      }
      if (
        (origin.protocol !== "http:" && origin.protocol !== "https:") ||
        origin.hostname === ""
      ) {
        return { reasonCode: "CONFIG_MALFORMED", configurationKey: key };
      }
      if (!LOOPBACK_HOSTS.includes(origin.hostname)) {
        return { reasonCode: "CONFIG_IDENTITY_CONFLICT", configurationKey: key };
      }
      return undefined;
    }
    case "DATABASE_URL": {
      const match = DATABASE_URL_PATTERN.exec(value);
      if (!match) {
        return { reasonCode: "CONFIG_MALFORMED", configurationKey: key };
      }
      // Development database access is loopback-only (FR-005 / T026 manifest).
      const host = match[4].replace(/^\[|\]$/g, "");
      if (!LOOPBACK_HOSTS.includes(host)) {
        return { reasonCode: "CONFIG_IDENTITY_CONFLICT", configurationKey: key };
      }
      return undefined;
    }
    case "DATABASE_POOL_MAX": {
      if (!DECIMAL_INTEGER_PATTERN.test(value)) {
        return { reasonCode: "CONFIG_MALFORMED", configurationKey: key };
      }
      const poolMax = Number.parseInt(value, 10);
      if (poolMax < DATABASE_POOL_MAX_MIN || poolMax > DATABASE_POOL_MAX_MAX) {
        return { reasonCode: "CONFIG_OUT_OF_RANGE", configurationKey: key };
      }
      return undefined;
    }
    case "PROXY_POLICY":
      if (!PROXY_POLICY_VALUES.includes(value)) {
        return { reasonCode: "CONFIG_UNSUPPORTED", configurationKey: key };
      }
      // Daily Development does not trust forwarded headers (plan.md).
      if (value !== "none") {
        return { reasonCode: "CONFIG_IDENTITY_CONFLICT", configurationKey: key };
      }
      return undefined;
    case "LOG_LEVEL":
      if (!LOG_LEVEL_VALUES.includes(value)) {
        return { reasonCode: "CONFIG_UNSUPPORTED", configurationKey: key };
      }
      return undefined;
    case "FIXTURE_PROVENANCE":
      if (!FIXTURE_PROVENANCE_VALUES.includes(value)) {
        return { reasonCode: "CONFIG_UNSUPPORTED", configurationKey: key };
      }
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Validate the complete execution-context configuration for the
 * Development/daily identity: every required key present and non-empty,
 * every value well-formed and supported, and no forbidden
 * environment/runtime-profile/operation-target combination. Returns the
 * first rejection's safe fields, or `undefined` when safe.
 */
function validateDevelopmentDailyConfiguration(config) {
  for (const key of CONFIGURATION_KEYS) {
    const value = config[key];
    if (value === undefined) {
      return { reasonCode: "CONFIG_MISSING", configurationKey: key };
    }
    if (value === "") {
      return { reasonCode: "CONFIG_EMPTY", configurationKey: key };
    }
    const rejection = classifyConfigurationValue(key, value);
    if (rejection) {
      return rejection;
    }
  }
  return undefined;
}

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

/** The only operation target selectable by local daily commands. */
const DAILY_OPERATION_TARGET = "development";

/**
 * `dev:setup` — validate the selectable local operation target and the
 * Development/daily execution identity BEFORE any work, start only the
 * Development database dependency (adapter-owned idempotency: repetition
 * creates no duplicate database resource), then explicitly apply tracked
 * migrations once the database is running. Every failure is actionable and
 * non-zero, and is emitted as closed Safe Diagnostics on the command
 * output surfaces only.
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

  const rejection = validateDevelopmentDailyConfiguration(config);
  if (rejection) {
    return rejectOperation(
      collaborators,
      safeDiagnostic(
        rejection.reasonCode,
        "daily",
        "configuration",
        "FIX_CONFIGURATION",
        rejection.configurationKey,
      ),
    );
  }

  try {
    await collaborators.database.start();
  } catch {
    return rejectOperation(
      collaborators,
      safeDiagnostic("STARTUP_FAILED", "daily", "database", "CHECK_DATABASE"),
    );
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

/** The local execution-context configuration is complete and safe. */
async function checkSafeDevelopmentConfiguration() {
  try {
    const config = await loadDevelopmentConfiguration();
    return validateDevelopmentDailyConfiguration(config) === undefined;
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
      npm: async () => externalToolSucceeds("npm", ["--version"]),
      podman: async () => externalToolSucceeds("podman", ["--version"]),
      compose: async () => externalToolSucceeds("podman", ["compose", "version"]),
      requiredFiles: checkRequiredFiles,
      safeConfig: checkSafeDevelopmentConfiguration,
      portAvailable: checkDevelopmentPortsAvailable,
    },
    database: {
      start: startDevelopmentDatabase,
      applyMigrations: applyTrackedMigrations,
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

/**
 * T010 — Immutable, TypeBox-backed runtime configuration loader and closed Safe
 * Diagnostic construction (rework for T010-B01…B04).
 *
 * References: FR-005–FR-008, SC-004; data-model.md §Execution Context /
 * §Runtime Configuration / §Safe Diagnostic; plan.md §Configuration and startup;
 * research.md Decision 6; contracts/foundation-operations.md (Configuration
 * examples, Safe diagnostic contract); contracts/foundation-http.openapi.yaml
 * (SafeDiagnostic schema); quickstart.md §3.
 *
 * `loadRuntimeConfiguration` validates a supplied environment record against the
 * closed TypeBox schemas and the exact local identity mappings, then returns
 * either an immutable accepted configuration or a closed SafeDiagnostic. It
 * never reads `process.env` and never starts work: the `work` seam is supplied
 * by the caller (bootstrap, a later task) so tests can prove fail-before-work.
 *
 * Rejection classes map to stable reason codes (foundation-operations.md):
 *   required key absent              -> CONFIG_MISSING
 *   required value empty             -> CONFIG_EMPTY
 *   wrong type/format                -> CONFIG_MALFORMED
 *   unsupported enum/value           -> CONFIG_UNSUPPORTED
 *   numeric/size value out of range  -> CONFIG_OUT_OF_RANGE
 *   forbidden cross-identity value   -> CONFIG_IDENTITY_CONFLICT
 *
 * The SafeDiagnostic is closed: reasonCode, diagnosticScope, component,
 * optional allowlisted configurationKey, remediation. It carries no free-form
 * message, no supplied values, credentials, URLs, exception/stack text, or paths.
 */

import { Type } from "@sinclair/typebox";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export type OperationTarget = "development" | "verification";

/** The ten required environment keys. `operationTarget`/`diagnosticScope` are not keys. */
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
] as const;

type ConfigurationKey = (typeof CONFIGURATION_KEYS)[number];

/** Strict decimal-integer grammar: digits only (no sign, exponent, radix, or padding). */
const DECIMAL_INTEGER_PATTERN = /^[0-9]+$/;

/** Bounded local numeric ranges (implementation configuration, not Production tuning). */
const PORT_MIN = 1;
const PORT_MAX = 65535;
const DATABASE_POOL_MAX_MIN = 1;
const DATABASE_POOL_MAX_MAX = 100;

// ---------------------------------------------------------------------------
// Closed value spaces (TypeBox). These literal unions are the single source of
// the allowlisted enums; the full closed schemas below are built from them.
// ---------------------------------------------------------------------------

const ENVIRONMENT_VALUES = ["development", "staging", "production"] as const;
const RUNTIME_PROFILE_VALUES = ["daily", "verification", "hosted"] as const;
const PROXY_POLICY_VALUES = ["none", "one-hop", "hosting-defined"] as const;
// Fastify/pino log levels: the framework's standard bounded set.
const LOG_LEVEL_VALUES = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;
// Production-derived provenance is rejected in this Delivery.
const FIXTURE_PROVENANCE_VALUES = ["synthetic", "approved-non-production"] as const;

// The complete routed Safe Diagnostic reason-code allowlist
// (foundation-http.openapi.yaml SafeDiagnostic.reasonCode). This loader emits
// only the CONFIG_* codes, but the closed schema must carry the full routed set.
const REASON_CODE_VALUES = [
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
const DIAGNOSTIC_SCOPE_VALUES = ["foundation", "daily", "verification"] as const;
const COMPONENT_VALUES = [
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
const REMEDIATION_VALUES = [
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

function literalUnion(values: readonly string[]): TSchema {
  return Type.Union(values.map((value) => Type.Literal(value)));
}

/**
 * Closed full Runtime Configuration schema (data-model.md §Runtime Configuration).
 * `additionalProperties: false` makes the eleven-field set the exact contract:
 * no diagnostic scope, no extra property, nothing else.
 */
const RUNTIME_CONFIGURATION_SCHEMA: TSchema = Type.Object(
  {
    environment: literalUnion(ENVIRONMENT_VALUES),
    runtimeProfile: literalUnion(RUNTIME_PROFILE_VALUES),
    operationTarget: literalUnion(["development", "verification"]),
    host: Type.String(),
    port: Type.Integer({ minimum: PORT_MIN, maximum: PORT_MAX }),
    publicOrigin: Type.String(),
    databaseUrl: Type.String(),
    databasePoolMax: Type.Integer({
      minimum: DATABASE_POOL_MAX_MIN,
      maximum: DATABASE_POOL_MAX_MAX,
    }),
    proxyPolicy: literalUnion(PROXY_POLICY_VALUES),
    logLevel: literalUnion(LOG_LEVEL_VALUES),
    fixtureProvenance: literalUnion(FIXTURE_PROVENANCE_VALUES),
  },
  { additionalProperties: false },
);

/**
 * Closed full Safe Diagnostic schema (data-model.md §Safe Diagnostic;
 * foundation-http.openapi.yaml SafeDiagnostic). `additionalProperties: false`
 * forbids any extra field or free-form message.
 */
export const SAFE_DIAGNOSTIC_SCHEMA: TSchema = Type.Object(
  {
    reasonCode: literalUnion(REASON_CODE_VALUES),
    diagnosticScope: literalUnion(DIAGNOSTIC_SCOPE_VALUES),
    component: literalUnion(COMPONENT_VALUES),
    configurationKey: Type.Optional(literalUnion(CONFIGURATION_KEYS)),
    remediation: literalUnion(REMEDIATION_VALUES),
  },
  { additionalProperties: false },
);

/**
 * Exact local identity mappings (plan.md §Configuration and startup;
 * foundation-operations.md). The credential/database identities are the
 * Delivery's canonical local resource identities (the committed .env examples).
 * `hostLoopback` encodes the target-appropriate application host and public
 * origin exposure: Daily is loopback-only; Verification is internal-network.
 * `databasePort` (Development only) is the accepted T026 manifest endpoint
 * port — the Development Data Store manifest publishes `127.0.0.1:3306`, so
 * a Development `DATABASE_URL` is canonical only on that exact port.
 */
const TARGET_IDENTITY = {
  development: {
    environment: "development",
    runtimeProfile: "daily",
    proxyPolicy: "none",
    databaseUser: "songhealth_dev",
    databaseName: "songhealth_development",
    databasePort: 3306,
    hostLoopback: true,
  },
  verification: {
    environment: "development",
    runtimeProfile: "verification",
    proxyPolicy: "one-hop",
    databaseUser: "songhealth_ver",
    databaseName: "songhealth_verification",
    // Exact approved local target identities (the committed .env examples):
    // Verification hosts are Compose-network internal and never arbitrary
    // Production-like endpoints.
    appHost: "songhealth-app",
    databaseHost: "songhealth-db",
    originHost: "songhealth-verification.test",
    hostLoopback: false,
  },
} as const;

// A `type` alias (not an `interface`) so the accepted configuration carries an
// implicit index signature and remains assignable to the test's
// `Record<string, unknown>` outcome surface.
export type RuntimeConfiguration = {
  environment: "development" | "staging" | "production";
  runtimeProfile: "daily" | "verification" | "hosted";
  operationTarget: OperationTarget;
  host: string;
  port: number;
  publicOrigin: string;
  databaseUrl: string;
  databasePoolMax: number;
  proxyPolicy: "none" | "one-hop" | "hosting-defined";
  logLevel: string;
  fixtureProvenance: string;
};

/** Closed Safe Diagnostic (data-model.md §Safe Diagnostic). No extra fields. */
export interface SafeDiagnostic {
  reasonCode: string;
  diagnosticScope: "foundation" | "daily" | "verification";
  component: "configuration";
  configurationKey?: ConfigurationKey;
  remediation: "FIX_CONFIGURATION";
}

/** Fail-before-work seam: supplied by the caller; never invoked by this loader. */
export interface WorkBoundary {
  createDatabasePool: () => void;
  bindListener: () => void;
  startChildService: () => void;
}

export type ConfigurationOutcome =
  | {
      status: "accepted";
      configuration: RuntimeConfiguration;
      diagnosticScope: "daily" | "verification";
    }
  | { status: "rejected"; diagnostic: SafeDiagnostic };

// ---------------------------------------------------------------------------
// Host / URL helpers (target isolation and format validation).
// ---------------------------------------------------------------------------

const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/;
const HOSTNAME_PATTERN =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const IPV6_PATTERN =
  /^(?:(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{0,4}|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{0,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:)$/;

/**
 * A syntactically valid IP/hostname (no port, scheme, or stray characters).
 * Bracketed forms are accepted only as bracketed IPv6 literals; bracketed
 * ordinary hostnames (e.g. `[songhealth-app]`) are malformed and cannot evade
 * loopback classification.
 */
function isValidHost(host: string): boolean {
  if (host === "") return false;
  if (host.startsWith("[")) {
    if (!host.endsWith("]")) return false;
    const bare = host.slice(1, -1);
    return bare.includes(":") && IPV6_PATTERN.test(bare);
  }
  if (IPV4_PATTERN.test(host)) return true;
  if (HOSTNAME_PATTERN.test(host)) return true;
  return false;
}

/**
 * Strict loopback: 127/8, ::1, or localhost. Fake `127.*` DNS names and
 * bracketed forms are not loopback.
 */
function isStrictLoopback(host: string): boolean {
  if (host === "localhost" || host === "::1") return true;
  return IPV4_PATTERN.test(host) && host.startsWith("127.");
}

type ParsedDatabase = {
  username: string;
  hostname: string;
  database: string;
  /** Effective engine port: an omitted port resolves to the engine default. */
  port: number;
};
type ParsedOrigin = { hostname: string; port: string };

// `new URL` silently trims leading/trailing C0-control/space padding and
// normalizes scheme case; both would accept values the raw record did not
// contain. Reject any C0/space byte and pin the exact scheme prefix so the
// accepted value is byte-exact.
const C0_OR_SPACE_PATTERN = /[\u0000-\u0020]/;

function parseExactUrl(raw: string, schemePrefix: string): URL | null {
  if (!raw.startsWith(schemePrefix)) return null;
  if (C0_OR_SPACE_PATTERN.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const expectedProtocol = `${schemePrefix.slice(0, schemePrefix.indexOf("://"))}:`;
  if (url.protocol !== expectedProtocol) return null;
  return url;
}

/** The MySQL engine's default port (also the T026 manifest endpoint port). */
const MYSQL_DEFAULT_PORT = 3306;

function parseDatabaseUrl(raw: string): ParsedDatabase | null {
  const url = parseExactUrl(raw, "mysql://");
  if (url === null) return null;
  if (url.username === "") return null;
  if (url.password === "") return null;
  if (url.hostname === "") return null;
  // Exactly one path segment: the database name. No sub-paths, query, or
  // fragment.
  if (!/^\/[^/]+$/.test(url.pathname)) return null;
  if (url.search !== "" || url.hash !== "") return null;
  const database = url.pathname.slice(1);
  // WHATWG URL parsing guarantees `port` is decimal digits or empty (an
  // invalid port fails construction); an omitted port resolves to the
  // engine default, which is the same manifest endpoint port.
  const port = url.port !== "" ? Number.parseInt(url.port, 10) : MYSQL_DEFAULT_PORT;
  return { username: url.username, hostname: url.hostname, database, port };
}

/**
 * Fail-closed origin parsing: absolute http URL only (local targets never use
 * TLS), no userinfo, no non-root path, query, or fragment.
 */
function parseOrigin(raw: string): ParsedOrigin | null {
  const url = parseExactUrl(raw, "http://");
  if (url === null) return null;
  if (url.username !== "" || url.password !== "") return null;
  if (url.hostname === "") return null;
  if (url.pathname !== "/" || url.search !== "" || url.hash !== "") return null;
  const port = url.port !== "" ? url.port : "80";
  return { hostname: url.hostname, port };
}

/** Parse a required numeric field; distinguish malformed from out-of-range. */
function parseBoundedInteger(
  raw: string,
  min: number,
  max: number,
): { value: number } | { malformed: true } | { outOfRange: true } {
  if (!DECIMAL_INTEGER_PATTERN.test(raw)) return { malformed: true };
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return { outOfRange: true };
  return { value: parsed };
}

/**
 * Assemble a closed SafeDiagnostic and enforce it against the closed schema.
 * Diagnostics are built only from allowlisted constants, so the check is a
 * fail-closed invariant: it cannot leak a value and cannot throw.
 */
function buildDiagnostic(
  reasonCode: SafeDiagnostic["reasonCode"],
  diagnosticScope: SafeDiagnostic["diagnosticScope"],
  configurationKey?: ConfigurationKey,
): SafeDiagnostic {
  const diagnostic: SafeDiagnostic = {
    reasonCode,
    diagnosticScope,
    component: "configuration",
    remediation: "FIX_CONFIGURATION",
  };
  if (configurationKey !== undefined) {
    diagnostic.configurationKey = configurationKey;
  }
  if (!Value.Check(SAFE_DIAGNOSTIC_SCHEMA, diagnostic)) {
    return {
      reasonCode: "CONFIG_REJECTION_NOT_ENFORCED",
      diagnosticScope,
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
    };
  }
  return diagnostic;
}

export function loadRuntimeConfiguration(
  env: Record<string, string | undefined>,
  operationTarget: string,
  work: WorkBoundary,
): ConfigurationOutcome {
  // The work-boundary seam is intentionally never invoked here: configuration
  // validation is fail-closed and must complete before any pool/listener/child
  // service work. Bootstrap (a later task) owns invoking `work` after acceptance.
  void work;

  // Phase 0: the command-boundary target is not an environment key. An
  // unsupported target is a foundation-scoped rejection, not a throw.
  if (operationTarget !== "development" && operationTarget !== "verification") {
    return {
      status: "rejected",
      diagnostic: buildDiagnostic("CONFIG_UNSUPPORTED", "foundation"),
    };
  }
  const target: OperationTarget = operationTarget;
  const diagnosticScope = target === "verification" ? "verification" : "daily";
  const identity = TARGET_IDENTITY[target];

  const reject = (
    reasonCode: SafeDiagnostic["reasonCode"],
    configurationKey?: ConfigurationKey,
  ): ConfigurationOutcome => ({
    status: "rejected",
    diagnostic: buildDiagnostic(reasonCode, diagnosticScope, configurationKey),
  });

  // Phase 1: per-key presence, then closed value-space / format / range checks.
  // Each key is checked in a fixed order; the first fault wins.
  for (const key of CONFIGURATION_KEYS) {
    const raw = env[key];
    if (raw === undefined) return reject("CONFIG_MISSING", key);
    if (raw === "") return reject("CONFIG_EMPTY", key);
  }

  const environment = env.APP_ENVIRONMENT as string;
  if (!Value.Check(literalUnion(ENVIRONMENT_VALUES), environment)) {
    return reject("CONFIG_UNSUPPORTED", "APP_ENVIRONMENT");
  }

  const runtimeProfile = env.RUNTIME_PROFILE as string;
  if (!Value.Check(literalUnion(RUNTIME_PROFILE_VALUES), runtimeProfile)) {
    return reject("CONFIG_UNSUPPORTED", "RUNTIME_PROFILE");
  }

  const host = env.APP_HOST as string;
  if (!isValidHost(host)) return reject("CONFIG_MALFORMED", "APP_HOST");

  const portResult = parseBoundedInteger(env.APP_PORT as string, PORT_MIN, PORT_MAX);
  if ("malformed" in portResult) return reject("CONFIG_MALFORMED", "APP_PORT");
  if ("outOfRange" in portResult) return reject("CONFIG_OUT_OF_RANGE", "APP_PORT");
  const port = portResult.value;

  const origin = parseOrigin(env.PUBLIC_ORIGIN as string);
  if (origin === null) return reject("CONFIG_MALFORMED", "PUBLIC_ORIGIN");

  const database = parseDatabaseUrl(env.DATABASE_URL as string);
  if (database === null) return reject("CONFIG_MALFORMED", "DATABASE_URL");

  const poolResult = parseBoundedInteger(
    env.DATABASE_POOL_MAX as string,
    DATABASE_POOL_MAX_MIN,
    DATABASE_POOL_MAX_MAX,
  );
  if ("malformed" in poolResult) {
    return reject("CONFIG_MALFORMED", "DATABASE_POOL_MAX");
  }
  if ("outOfRange" in poolResult) {
    return reject("CONFIG_OUT_OF_RANGE", "DATABASE_POOL_MAX");
  }
  const databasePoolMax = poolResult.value;

  const proxyPolicy = env.PROXY_POLICY as string;
  if (!Value.Check(literalUnion(PROXY_POLICY_VALUES), proxyPolicy)) {
    return reject("CONFIG_UNSUPPORTED", "PROXY_POLICY");
  }

  const logLevel = env.LOG_LEVEL as string;
  if (!Value.Check(literalUnion(LOG_LEVEL_VALUES), logLevel)) {
    return reject("CONFIG_UNSUPPORTED", "LOG_LEVEL");
  }

  const fixtureProvenance = env.FIXTURE_PROVENANCE as string;
  if (!Value.Check(literalUnion(FIXTURE_PROVENANCE_VALUES), fixtureProvenance)) {
    return reject("CONFIG_UNSUPPORTED", "FIXTURE_PROVENANCE");
  }

  // Phase 2: forbidden cross-identity combinations (CONFIG_IDENTITY_CONFLICT).
  // Values that are known enum members but not the one the operation target
  // requires are identity conflicts, not unsupported values.
  if (environment !== identity.environment) {
    return reject("CONFIG_IDENTITY_CONFLICT", "APP_ENVIRONMENT");
  }
  if (runtimeProfile !== identity.runtimeProfile) {
    return reject("CONFIG_IDENTITY_CONFLICT", "RUNTIME_PROFILE");
  }
  if (proxyPolicy !== identity.proxyPolicy) {
    return reject("CONFIG_IDENTITY_CONFLICT", "PROXY_POLICY");
  }
  // Application host must be target-appropriate: loopback for Daily, the exact
  // approved internal identity for Verification (never an arbitrary
  // Production-like endpoint).
  if (target === "development") {
    if (!isStrictLoopback(host)) {
      return reject("CONFIG_IDENTITY_CONFLICT", "APP_HOST");
    }
  } else if (host !== TARGET_IDENTITY.verification.appHost) {
    return reject("CONFIG_IDENTITY_CONFLICT", "APP_HOST");
  }
  // Database hostname must be target-isolated: loopback for Daily, the exact
  // approved internal identity for Verification.
  if (target === "development") {
    if (!isStrictLoopback(database.hostname)) {
      return reject("CONFIG_IDENTITY_CONFLICT", "DATABASE_URL");
    }
  } else if (database.hostname !== TARGET_IDENTITY.verification.databaseHost) {
    return reject("CONFIG_IDENTITY_CONFLICT", "DATABASE_URL");
  }
  // The Development Data Store endpoint is the accepted T026 manifest
  // publication (`127.0.0.1:3306`): a Development database URL is canonical
  // only when its effective port is exactly that manifest endpoint port
  // (an omitted port already resolves to the same engine default).
  // Verification keeps its own later manifest contract.
  if (
    target === "development" &&
    database.port !== TARGET_IDENTITY.development.databasePort
  ) {
    return reject("CONFIG_IDENTITY_CONFLICT", "DATABASE_URL");
  }
  // Credentials must be operation-target-specific and never reused across targets.
  if (
    database.username !== identity.databaseUser ||
    database.database !== identity.databaseName
  ) {
    return reject("CONFIG_IDENTITY_CONFLICT", "DATABASE_URL");
  }
  // Public origin must be target-appropriate and bound to the selected target.
  if (target === "development") {
    if (!isStrictLoopback(origin.hostname)) {
      return reject("CONFIG_IDENTITY_CONFLICT", "PUBLIC_ORIGIN");
    }
    if (origin.hostname !== host) {
      return reject("CONFIG_IDENTITY_CONFLICT", "PUBLIC_ORIGIN");
    }
    if (origin.port !== String(port)) {
      return reject("CONFIG_IDENTITY_CONFLICT", "PUBLIC_ORIGIN");
    }
  } else if (origin.hostname !== TARGET_IDENTITY.verification.originHost) {
    return reject("CONFIG_IDENTITY_CONFLICT", "PUBLIC_ORIGIN");
  }

  const configuration: RuntimeConfiguration = {
    environment: environment as RuntimeConfiguration["environment"],
    runtimeProfile: runtimeProfile as RuntimeConfiguration["runtimeProfile"],
    operationTarget: target,
    host,
    port,
    publicOrigin: env.PUBLIC_ORIGIN as string,
    databaseUrl: env.DATABASE_URL as string,
    databasePoolMax,
    proxyPolicy: proxyPolicy as RuntimeConfiguration["proxyPolicy"],
    logLevel,
    fixtureProvenance,
  };

  // Fail-closed invariant: the assembled configuration must conform to the
  // closed full schema (exactly the eleven fields, no diagnostic scope).
  if (!Value.Check(RUNTIME_CONFIGURATION_SCHEMA, configuration)) {
    return {
      status: "rejected",
      diagnostic: buildDiagnostic("CONFIG_REJECTION_NOT_ENFORCED", diagnosticScope),
    };
  }

  return {
    status: "accepted",
    configuration: Object.freeze(configuration),
    diagnosticScope,
  };
}

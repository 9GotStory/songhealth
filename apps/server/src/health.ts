/**
 * T015 — Operational health schemas, dependency types, and pure readiness /
 * liveness / safe-failure logic for the foundation HTTP contract.
 *
 * References: FR-007, FR-009–FR-010, FR-013, FR-016;
 * contracts/foundation-http.openapi.yaml `/health/live`, `/health/ready`,
 * `Liveness`, `Readiness`, `ComponentReadiness`, `SafeOperationalFailure`,
 * `SafeDiagnostic`; data-model.md §Safe Diagnostic / §Migration State /
 * §Component Readiness; plan.md §Runtime composition / §Configuration and
 * startup / §Persistence and migrations / §Testing and security evidence;
 * research.md Decisions 8–9; accepted `apps/server/src/config.ts`
 * `SAFE_DIAGNOSTIC_SCHEMA` and `apps/server/src/migrations.ts`
 * `DatabaseReadiness` / `getDatabaseReadiness`; accepted
 * `apps/server/src/health.test.ts`; Constitution Principles I–VI.
 *
 * This module is the server-owned health boundary. It defines the closed wire
 * shapes (TypeBox) that `http.ts` binds to Fastify response validation, the
 * dependency seam the planned composition injects, and the pure functions that
 * map an accepted read-only database-readiness observation to the wire. It
 * never applies migrations, writes the marker, or otherwise mutates the
 * database: readiness is a read-only projection (data-model.md §Migration
 * State), and the internal `observedAt` observation field stays off the wire.
 *
 * The Safe Diagnostic vocabulary is reused from the accepted
 * `SAFE_DIAGNOSTIC_SCHEMA` — no divergent enum is introduced. Any
 * liveness/readiness exception becomes a deterministic closed
 * `OPERATIONAL_FAILURE` Safe Diagnostic carrying allowlisted values only; no
 * raw exception, stack, SQL, credential, connection string, supplied value,
 * sentinel string, or host/path/infrastructure detail is ever serialized.
 */

import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { SAFE_DIAGNOSTIC_SCHEMA } from "./config.js";

/**
 * Closed Safe Diagnostic allowlists — the compile-time projection of the
 * accepted `SAFE_DIAGNOSTIC_SCHEMA` (config.ts) and foundation-http.openapi.yaml
 * `SafeDiagnostic`. The RUNTIME allowlist is the single accepted
 * `SAFE_DIAGNOSTIC_SCHEMA`, enforced in `toDatabaseComponent` via `Value.Check`;
 * these types exist so the exported contract preserves the closed allowlisted
 * vocabulary instead of advertising arbitrary strings (T015-B01).
 */
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
const SAFE_DIAGNOSTIC_SCOPES = ["foundation", "daily", "verification"] as const;
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
const SAFE_DIAGNOSTIC_CONFIGURATION_KEYS = [
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

export type SafeDiagnosticReasonCode = (typeof SAFE_DIAGNOSTIC_REASON_CODES)[number];
export type SafeDiagnosticScope = (typeof SAFE_DIAGNOSTIC_SCOPES)[number];
export type SafeDiagnosticComponent = (typeof SAFE_DIAGNOSTIC_COMPONENTS)[number];
export type SafeDiagnosticConfigurationKey =
  (typeof SAFE_DIAGNOSTIC_CONFIGURATION_KEYS)[number];
export type SafeDiagnosticRemediation = (typeof SAFE_DIAGNOSTIC_REMEDIATIONS)[number];

/**
 * Closed Safe Diagnostic. Every field is the closed allowlisted vocabulary
 * (never an arbitrary string); `configurationKey` is optional and present only
 * when the schema key name itself is safe.
 */
export interface HealthSafeDiagnostic {
  reasonCode: SafeDiagnosticReasonCode;
  diagnosticScope: SafeDiagnosticScope;
  component: SafeDiagnosticComponent;
  configurationKey?: SafeDiagnosticConfigurationKey;
  remediation: SafeDiagnosticRemediation;
}

/**
 * The database-component readiness observation, compatible with the accepted
 * `DatabaseReadiness` boundary in `apps/server/src/migrations.ts`. `component`
 * is the internal identity; the wire exposes it as `name`. `observedAt` is an
 * internal observation timestamp and must never reach the wire.
 */
export interface HealthReadiness {
  component: "database";
  status: "ready" | "not-ready";
  /** Closed Safe Diagnostic; present only when `status` is `not-ready`. */
  diagnostic?: HealthSafeDiagnostic;
  /** ISO-8601 observation timestamp; internal only, never serialized. */
  observedAt: string;
}

/**
 * The injected health dependencies. Both are read-only observations: the
 * database-readiness probe and the liveness probe. Neither may mutate state.
 * The return types accept a value or a promise so deterministic synchronous
 * fakes and async probes are both assignable.
 */
export interface HealthDependencies {
  getDatabaseReadiness: () => HealthReadiness | Promise<HealthReadiness>;
  livenessProbe: () => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Closed wire schemas (foundation-http.openapi.yaml; additionalProperties
// false). These mirror the accepted SAFE_DIAGNOSTIC_SCHEMA vocabulary.
// ---------------------------------------------------------------------------

/** `Liveness` — the only field is the const `status: "alive"`. */
export const LIVENESS_SCHEMA = Type.Object(
  { status: Type.Literal("alive") },
  { additionalProperties: false },
);

/** The closed component-name vocabulary (foundation-http.openapi.yaml). */
const COMPONENT_NAME = Type.String({ enum: ["application", "database"] });

/** A ready component: `name` + `status: "ready"`, never a diagnostic. */
const READY_COMPONENT_SCHEMA = Type.Object(
  {
    name: COMPONENT_NAME,
    status: Type.Literal("ready"),
  },
  { additionalProperties: false },
);

/**
 * A component in the not-ready overall case: `name` + `status` + an optional
 * closed diagnostic. Kept as a single object (not a union of objects) so
 * fast-json-stringify serializes it deterministically; the invariant that a
 * not-ready component always carries its diagnostic is enforced by
 * `toDatabaseComponent`, and `additionalProperties: false` keeps the shape
 * closed.
 */
const ANY_COMPONENT_SCHEMA = Type.Object(
  {
    name: COMPONENT_NAME,
    status: Type.Union([Type.Literal("ready"), Type.Literal("not-ready")]),
    diagnostic: Type.Optional(SAFE_DIAGNOSTIC_SCHEMA),
  },
  { additionalProperties: false },
);

/**
 * `Readiness` for the `200` ready case: overall `ready` and exactly two
 * components, each ready (no diagnostic).
 */
export const READINESS_READY_SCHEMA = Type.Object(
  {
    status: Type.Literal("ready"),
    components: Type.Array(READY_COMPONENT_SCHEMA, { minItems: 2, maxItems: 2 }),
  },
  { additionalProperties: false },
);

/**
 * `Readiness` for the `503` not-ready case: overall `not-ready` and exactly
 * two components (one ready, one not-ready-with-diagnostic).
 */
export const READINESS_NOT_READY_SCHEMA = Type.Object(
  {
    status: Type.Literal("not-ready"),
    components: Type.Array(ANY_COMPONENT_SCHEMA, { minItems: 2, maxItems: 2 }),
  },
  { additionalProperties: false },
);

// ---------------------------------------------------------------------------
// Pure mappers (no I/O, no mutation).
// ---------------------------------------------------------------------------

/** A single component as it appears on the wire (internal identity → `name`). */
export type ComponentWire =
  | { name: "application" | "database"; status: "ready" }
  | {
      name: "application" | "database";
      status: "not-ready";
      diagnostic: HealthSafeDiagnostic;
    };

/**
 * Map the accepted database-readiness observation to its wire component. The
 * internal `component` identity becomes the wire `name`; `observedAt` is
 * dropped. A not-ready component always carries its closed diagnostic, as the
 * contract requires.
 *
 * T015-B01 — the injected diagnostic is validated against the accepted
 * `SAFE_DIAGNOSTIC_SCHEMA` at this runtime boundary. Fastify response
 * serialization does NOT validate enum membership, so an out-of-contract
 * `reasonCode`, `diagnosticScope`, `component`, `configurationKey`, or
 * `remediation` is rejected and mapped to the deterministic closed
 * `OPERATIONAL_FAILURE` diagnostic — raw or unknown values never reach the
 * HTTP response (FR-007; Data Model §Safe Diagnostic).
 */
export function toDatabaseComponent(db: HealthReadiness): ComponentWire {
  if (db.status === "ready") {
    return { name: "database", status: "ready" };
  }
  const diagnostic = db.diagnostic;
  if (diagnostic === undefined) {
    // Contract invariant: a not-ready component requires a closed diagnostic.
    // The accepted boundary always supplies one; guard so a violation can
    // never serialize a not-ready component without its diagnostic.
    throw new Error("readiness contract violation");
  }
  if (!Value.Check(SAFE_DIAGNOSTIC_SCHEMA, diagnostic)) {
    // Out-of-contract diagnostic: never forward raw/unknown values to the wire.
    return {
      name: "database",
      status: "not-ready",
      diagnostic: operationalFailureDiagnostic("database"),
    };
  }
  return { name: "database", status: "not-ready", diagnostic };
}

/**
 * The deterministic closed Safe Diagnostic for any liveness/readiness
 * exception. Allowlisted values only; no raw or protected detail.
 */
export function operationalFailureDiagnostic(
  component: "application" | "database",
): HealthSafeDiagnostic {
  return {
    reasonCode: "OPERATIONAL_FAILURE",
    diagnosticScope: "foundation",
    component,
    remediation: "RETRY_SAFE_OPERATION",
  };
}

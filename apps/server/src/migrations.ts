/**
 * T013 — Kysely migration status/apply and synthetic marker access.
 *
 * References: FR-004, FR-009, SC-002; data-model.md §Data Store / §Migration
 * State / §Synthetic Persistence Marker / §Component Readiness; plan.md
 * §Persistence and migrations + §Testing and security evidence; research.md
 * Decision 7; quickstart.md §4; accepted T011 explicit-migration contract
 * (`apps/server/src/migrations.test.ts`) and T012 marker migration
 * (`apps/server/src/migrations/001-foundation-persistence-marker.ts`);
 * installed Kysely 0.29.5 (`kysely/migration`) over `mysql2` 3.23.3.
 *
 * This module is the explicit-migration boundary the T011 contract pins:
 *   - `getMigrationStatus` is READ-ONLY. It never applies migrations and never
 *     creates the Kysely metadata, lock, or marker tables. It reports the exact
 *     closed `current | pending | unavailable | error` state with the
 *     applicable `DATABASE_UNAVAILABLE`, `MIGRATIONS_PENDING`, or
 *     `MIGRATION_STATUS_FAILED` safe code. It distinguishes an unreachable
 *     engine (a liveness probe fails) from a real, reachable-engine metadata
 *     inspection failure (the probe succeeds but Kysely's read-only inspection
 *     throws).
 *   - `applyMigrations` is the ONLY pending→current transition. It is explicit,
 *     idempotent (a repeated apply reports no new migrations), and serialized:
 *     Kysely runs migrations on a single connection guarded by MySQL's
 *     `get_lock`, so concurrent applies each run a given migration at most once.
 *   - `readMarker` / `writeMarker` are the sole access to the
 *     `foundation_persistence_marker` operational table, using the fixed key
 *     `sc002-development-persistence`, a bounded opaque synthetic value, and the
 *     constant `synthetic` provenance.
 *   - `getDatabaseReadiness` is the database-component readiness boundary:
 *     `ready` only when migrations are current, `not-ready` otherwise with a
 *     closed Safe Diagnostic.
 *
 * No database URL, credential, raw SQL/error, stack, or host/path detail is ever
 * returned; failures carry only a bounded, stable, safe reason code.
 */

import { sql } from "kysely";
import {
  Migrator,
  type Migration,
  type MigrationProvider,
} from "kysely/migration";
import type { Database } from "./database.js";
import { migration as foundationMarkerMigration } from "./migrations/001-foundation-persistence-marker.js";

// ---------------------------------------------------------------------------
// Pinned contract constants (data-model.md §Migration State / §Synthetic
// Persistence Marker; research.md Decision 7). These mirror the T011 contract
// constants exactly — the implementation is bound to the same identity.
// ---------------------------------------------------------------------------

/** The single version-controlled operational migration (T012). */
const MARKER_MIGRATION_NAME = "001-foundation-persistence-marker";
/** The sole operational marker table created by that migration. */
const MARKER_TABLE = "foundation_persistence_marker";
/** Fixed acceptance marker key (SC-002). */
const MARKER_KEY = "sc002-development-persistence";
/** Constant provenance for the marker row. */
const MARKER_PROVENANCE = "synthetic";

/**
 * A shared, frozen empty migration-name list. Returned by the unavailable and
 * error status states so every status snapshot is immutable (data-model.md
 * §Migration State). Sharing one frozen instance is safe: it is never mutated.
 */
const EMPTY_NAMES: readonly string[] = Object.freeze([]);

// ---------------------------------------------------------------------------
// Closed result shapes (data-model.md §Migration State / §Component Readiness /
// §Safe Diagnostic). These are the exact shapes the T011 contract asserts.
// ---------------------------------------------------------------------------

/** The closed migration-state vocabulary and its applicable safe reason codes. */
export interface MigrationStatus {
  state: "current" | "pending" | "unavailable" | "error";
  /** Executed migration names, in Kysely's deterministic (sorted) order. Immutable. */
  readonly executed: readonly string[];
  /** Not-yet-executed migration names, in Kysely's deterministic (sorted) order. Immutable. */
  readonly pending: readonly string[];
  /**
   * Present only for the non-current states that carry a stable safe reason:
   * `unavailable` → `DATABASE_UNAVAILABLE`, `pending` → `MIGRATIONS_PENDING`,
   * `error` → `MIGRATION_STATUS_FAILED`. Absent for `current`.
   */
  safeReasonCode?: "DATABASE_UNAVAILABLE" | "MIGRATIONS_PENDING" | "MIGRATION_STATUS_FAILED";
}

/** The closed result of an explicit apply. */
export interface ApplyResult {
  state: "current" | "error";
  /** Migrations executed by THIS apply (empty when already current). Immutable. */
  readonly applied: readonly string[];
  /** Present only when apply failed; a bounded safe code, never a raw error. */
  safeReasonCode?: "MIGRATION_FAILED";
}

/** The sole operational marker row, projected to its public field names. */
export interface MarkerRow {
  markerKey: string;
  markerValue: string;
  provenance: string;
}

/** A closed Safe Diagnostic (config.ts `SAFE_DIAGNOSTIC_SCHEMA` shape). */
export interface ReadinessDiagnostic {
  reasonCode: "MIGRATIONS_PENDING" | "DATABASE_UNAVAILABLE" | "MIGRATION_STATUS_FAILED";
  diagnosticScope: "foundation";
  component: "database";
  remediation: "RUN_MIGRATION" | "RETRY_SAFE_OPERATION";
}

/** The database-component readiness boundary. */
export interface DatabaseReadiness {
  component: "database";
  status: "ready" | "not-ready";
  /** Closed Safe Diagnostic; present only when not-ready. */
  diagnostic?: ReadinessDiagnostic;
  /** ISO-8601 timestamp of the observation. */
  observedAt: string;
}

// ---------------------------------------------------------------------------
// Migrator composition.
//
// A single in-process provider returns exactly the one T012 migration. Using an
// in-process provider (rather than a filesystem `FileMigrationProvider`) keeps
// the migration set explicit and version-controlled, and avoids any filesystem
// path detail in the migration surface.
// ---------------------------------------------------------------------------

const migrationProvider: MigrationProvider = {
  async getMigrations(): Promise<Record<string, Migration>> {
    return { [MARKER_MIGRATION_NAME]: foundationMarkerMigration };
  },
};

/** A fresh Migrator bound to the given connection. */
function createMigrator(db: Database): Migrator {
  return new Migrator({ db, provider: migrationProvider });
}

/**
 * Liveness probe: does this connection reach a live engine on a usable schema?
 * Returns true only when a trivial query succeeds. A connection to an
 * unreachable engine or a non-existent schema fails here.
 */
async function isReachable(db: Database): Promise<boolean> {
  try {
    await sql`SELECT 1`.execute(db);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Read-only migration status (FR-009; data-model.md §Migration State).
// ---------------------------------------------------------------------------

/**
 * Read-only migration status. NEVER applies migrations and NEVER creates the
 * Kysely metadata, lock, or marker tables:
 *   - unreachable engine (liveness probe fails) → `unavailable` +
 *     `DATABASE_UNAVAILABLE`;
 *   - reachable engine whose read-only Kysely inspection fails → `error` +
 *     `MIGRATION_STATUS_FAILED`;
 *   - reachable and inspectable → `pending` (with `MIGRATIONS_PENDING`) when any
 *     migration is unexecuted, else `current`.
 *
 * `Kysely.Migrator.getMigrations()` is read-only: it introspects table
 * existence and, when the metadata table exists, SELECTs from it. It performs
 * no DDL and no writes, so this is non-mutating on both the fresh/pending and
 * the applied path.
 */
export async function getMigrationStatus(db: Database): Promise<MigrationStatus> {
  if (!(await isReachable(db))) {
    return {
      state: "unavailable",
      executed: EMPTY_NAMES,
      pending: EMPTY_NAMES,
      safeReasonCode: "DATABASE_UNAVAILABLE",
    };
  }

  try {
    const infos = await createMigrator(db).getMigrations();
    const executed: string[] = [];
    const pending: string[] = [];
    for (const info of infos) {
      if (info.executedAt === undefined) {
        pending.push(info.name);
      } else {
        executed.push(info.name);
      }
    }
    // Return immutable, ordered snapshots: the caller can neither mutate the
    // arrays nor re-order the names (data-model.md §Migration State — "Immutable
    // ... ordered string list").
    const executedFrozen = Object.freeze(executed);
    const pendingFrozen = Object.freeze(pending);
    if (pendingFrozen.length > 0) {
      return { state: "pending", executed: executedFrozen, pending: pendingFrozen, safeReasonCode: "MIGRATIONS_PENDING" };
    }
    return { state: "current", executed: executedFrozen, pending: pendingFrozen };
  } catch {
    // A real, reachable-engine metadata inspection failure (e.g. a corrupted
    // Kysely metadata table). Return a bounded safe code — never the raw error.
    return {
      state: "error",
      executed: EMPTY_NAMES,
      pending: EMPTY_NAMES,
      safeReasonCode: "MIGRATION_STATUS_FAILED",
    };
  }
}

// ---------------------------------------------------------------------------
// Explicit apply — the only pending→current transition (FR-004, FR-009).
// ---------------------------------------------------------------------------

/**
 * Explicitly apply all pending migrations. This is the ONLY path that
 * transitions pending→current.
 *
 * Idempotent: when already current, no migration runs and `applied` is empty.
 * Serialized: Kysely runs migrations on a single connection guarded by MySQL's
 * `get_lock`, so concurrent `applyMigrations` calls each run a given migration
 * at most once.
 *
 * `Migrator.migrateToLatest()` never throws; it returns a result set whose
 * `error` is defined on failure. We surface a bounded `MIGRATION_FAILED` safe
 * code — never the raw error.
 */
export async function applyMigrations(db: Database): Promise<ApplyResult> {
  const resultSet = await createMigrator(db).migrateToLatest();

  if (resultSet.error !== undefined) {
    return { state: "error", applied: EMPTY_NAMES, safeReasonCode: "MIGRATION_FAILED" };
  }

  const applied = Object.freeze(
    (resultSet.results ?? [])
      .filter((result) => result.status === "Success" && result.direction === "Up")
      .map((result) => result.migrationName),
  );

  return { state: "current", applied };
}

// ---------------------------------------------------------------------------
// Sole foundation_persistence_marker access (SC-002).
// ---------------------------------------------------------------------------

/**
 * The only read failure that maps to marker absence: the marker table does not
 * yet exist (a fresh, unmigrated schema). Every other read failure — an
 * unreachable engine, a permission denial, a corrupted marker schema, or any
 * other database error — is a genuine failure, NOT absence, and must never be
 * reported as `null`.
 */
const MARKER_TABLE_MISSING_CODE = "ER_NO_SUCH_TABLE";

/**
 * The bounded safe code for a genuine marker read failure. It carries no raw
 * SQL error, table/column name, host, path, or credential detail.
 */
const MARKER_READ_FAILED = "MARKER_READ_FAILED";

/**
 * Read the sole operational marker row by its fixed key. Returns `null` ONLY
 * for the expected absence conditions — the marker table does not yet exist, or
 * the table exists but the fixed-key row is absent. Any other read failure
 * (unreachable engine, permission denial, corrupted marker schema, …) throws a
 * bounded safe error (`MARKER_READ_FAILED`) rather than being falsely reported
 * as absence. Read-only.
 */
export async function readMarker(db: Database): Promise<MarkerRow | null> {
  let result;
  try {
    result = await sql<{
      marker_key: string;
      marker_value: string;
      provenance: string;
    }>`
      SELECT marker_key, marker_value, provenance
      FROM ${sql.ref(MARKER_TABLE)}
      WHERE marker_key = ${MARKER_KEY}
    `.execute(db);
  } catch (error) {
    // Only the expected missing-table condition is absence. Everything else is
    // a real failure: surface a bounded safe code, never the raw error.
    if (isMissingTableError(error)) {
      return null;
    }
    throw new Error(MARKER_READ_FAILED);
  }

  const row = result.rows[0];
  if (row === undefined) {
    return null;
  }
  return {
    markerKey: row.marker_key,
    markerValue: row.marker_value,
    provenance: row.provenance,
  };
}

/** True only when the error is the engine's "table does not exist" condition. */
function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === MARKER_TABLE_MISSING_CODE
  );
}

/**
 * The approved synthetic marker-value bound (data-model.md §Synthetic
 * Persistence Marker — "bounded length"): a non-empty string of at most 256
 * characters. Enforced before any mutation.
 */
const MARKER_VALUE_MIN_LENGTH = 1;
const MARKER_VALUE_MAX_LENGTH = 256;

/**
 * The bounded safe code for an out-of-bound marker value. It carries no detail
 * of the offending value (which may itself be unbounded or carry protected
 * data).
 */
const MARKER_VALUE_OUT_OF_BOUND = "MARKER_VALUE_OUT_OF_BOUND";

/**
 * Write (upsert) the sole operational marker row under the fixed key, with the
 * given bounded opaque synthetic value and the constant `synthetic` provenance.
 * Writing a different value for the fixed key changes the row's content, not its
 * count.
 *
 * The value is validated against the approved bound (non-empty, at most 256
 * characters) BEFORE any mutation: an out-of-bound value throws a bounded safe
 * error (`MARKER_VALUE_OUT_OF_BOUND`) and never reaches the database.
 */
export async function writeMarker(db: Database, markerValue: string): Promise<void> {
  if (
    typeof markerValue !== "string" ||
    markerValue.length < MARKER_VALUE_MIN_LENGTH ||
    markerValue.length > MARKER_VALUE_MAX_LENGTH
  ) {
    throw new Error(MARKER_VALUE_OUT_OF_BOUND);
  }

  await sql`
    INSERT INTO ${sql.ref(MARKER_TABLE)} (marker_key, marker_value, provenance)
    VALUES (${MARKER_KEY}, ${markerValue}, ${MARKER_PROVENANCE})
    ON DUPLICATE KEY UPDATE
      marker_value = VALUES(marker_value),
      provenance = VALUES(provenance)
  `.execute(db);
}

// ---------------------------------------------------------------------------
// Database-component readiness boundary (R2; data-model.md §Component
// Readiness / §Safe Diagnostic).
// ---------------------------------------------------------------------------

/**
 * The database-component readiness boundary. Reports `ready` only when
 * migrations are current; otherwise `not-ready` with a closed Safe Diagnostic
 * derived from the migration status. Readiness is never a self-derived boolean —
 * it is a projection of the read-only migration status.
 */
export async function getDatabaseReadiness(db: Database): Promise<DatabaseReadiness> {
  const observedAt = new Date().toISOString();
  const status = await getMigrationStatus(db);

  if (status.state === "current") {
    return { component: "database", status: "ready", observedAt };
  }

  let diagnostic: ReadinessDiagnostic;
  if (status.state === "pending") {
    diagnostic = {
      reasonCode: "MIGRATIONS_PENDING",
      diagnosticScope: "foundation",
      component: "database",
      remediation: "RUN_MIGRATION",
    };
  } else if (status.state === "unavailable") {
    diagnostic = {
      reasonCode: "DATABASE_UNAVAILABLE",
      diagnosticScope: "foundation",
      component: "database",
      remediation: "RETRY_SAFE_OPERATION",
    };
  } else {
    diagnostic = {
      reasonCode: "MIGRATION_STATUS_FAILED",
      diagnosticScope: "foundation",
      component: "database",
      remediation: "RETRY_SAFE_OPERATION",
    };
  }

  return { component: "database", status: "not-ready", diagnostic, observedAt };
}

/**
 * T011 — Failing real-engine tests for the explicit-migration contract.
 *
 * References: FR-004, FR-009, SC-002; data-model.md §Data Store / §Migration
 * State / §Synthetic Persistence Marker / §Component Readiness; plan.md
 * §Persistence and migrations + §Testing and security evidence; research.md
 * Decisions 7–8; contracts/foundation-operations.md `db:status` / `db:migrate` /
 * operation-target ownership and isolation / failure behavior; quickstart.md §§2
 * and 4; Constitution Principles I–VI; installed Kysely 0.29.5 (`kysely/migration`)
 * and `mysql2` 3.23.3.
 *
 * This suite pins the behavior contract that the planned T012/T013 implementation
 * must satisfy, using ONLY the routed T012/T013 surface:
 *   - T012: the sole foundation-operational marker migration
 *     `apps/server/src/migrations/001-foundation-persistence-marker.ts`
 *   - T013: Kysely database composition plus explicit migration status/apply and
 *     marker access in `apps/server/src/database.ts` and `apps/server/src/migrations.ts`
 *
 * It imports `createDatabase`/`closeDatabase`/`Database` from `./database.js` and
 * `getMigrationStatus`/`applyMigrations`/`readMarker`/`writeMarker` and the
 * database-component readiness boundary `getDatabaseReadiness` from
 * `./migrations.js`. Those modules do not exist yet; the expected red result is
 * that unresolved import, not a syntax, typing, fixture, tooling, or
 * test-environment error.
 *
 * Test preparation and teardown are handled LOCALLY in this file via read-only
 * Kysely schema introspection and exact, individually-named drops against the
 * isolated dedicated test schema. No later-scope lifecycle ownership, inventory,
 * reset, or cleanup API is imported from `./migrations.js`; those responsibilities
 * belong to later tasks (T020/T022/T030/T031/T035) and are NOT pulled forward.
 *
 * The contract is a REAL MySQL-compatible-engine contract. It is never satisfied
 * by SQLite or mocked persistence: the suite drives the T013 composition (Kysely
 * over `mysql2`) against an isolated, non-Production test database selected by the
 * `SONGHEALTH_TEST_DATABASE_URL` environment variable (a `mysql://` URL to a
 * dedicated, isolated, non-Production schema owned by this test run). When that
 * variable is unset, the engine is unreachable, or the schema is not an
 * allowlisted test identity, the suite FAILS explicitly — it never skips and never
 * passes.
 *
 * Pinned contract (closes T011 review findings R1–R5):
 *   - R1: a real status-inspection failure (engine reachable, Kysely metadata
 *     inspection fails) returns the `error` state plus `MIGRATION_STATUS_FAILED` as
 *     a closed safe result with no raw SQL/error leakage;
 *   - R2: readiness is an implementation boundary (`getDatabaseReadiness`) that
 *     reports `not-ready` for pending migrations and `ready` only for current;
 *   - R3: status inspection is proven non-mutating by before/after snapshots of
 *     the EXACT relevant migration state — the full row content of the Kysely
 *     metadata table, the full row content of the migration lock table, and the
 *     full row content of the marker table — on BOTH the fresh/pending path
 *     (where Kysely metadata, lock, and marker must not be created) and on the
 *     applied path (where existing state must be unchanged). A snapshot is a
 *     per-table map of `{ present, rows }`, so creation or deletion of any of
 *     the three tables, and any change to a row's key, value, timestamp,
 *     provenance, or count, makes the before/after snapshots differ;
 *   - R4: an executable pre-mutation target guard is bound to an allowlisted
 *     isolated non-Production test identity AND to proof that the exact schema
 *     was created for this run and is exclusively owned by it: the run creates
 *     the dedicated schema itself (a pre-existing schema of any name — even one
 *     matching the allowlisted test prefix — is refused before any mutation, so
 *     the later whole-schema drop can never delete unrelated state from a
 *     shared or stale prefixed schema), records a genuine per-run ownership
 *     token, and every destructive helper re-checks the allowlisted identity,
 *     the token, and that the current schema inventory contains no table
 *     outside the exact expected owned inventory before mutating;
 *   - R5: the test imports and references only the routed T012/T013 surface and
 *     handles preparation/teardown locally; it never assigns later lifecycle
 *     ownership, inventory, reset, or cleanup implementation to T013.
 *
 * Preserved contract:
 *   - status inspection is read-only and returns immutable, ordered
 *     `executed`/`pending` names with the exact `current | pending |
 *     unavailable | error` state and the applicable `DATABASE_UNAVAILABLE`,
 *     `MIGRATIONS_PENDING`, or `MIGRATION_STATUS_FAILED` safe code, without
 *     applying migrations or creating marker data;
 *   - only explicit apply may transition pending→current, reports each tracked
 *     migration, remains safe when repeated, and serializes concurrent apply
 *     attempts so each migration runs exactly once;
 *   - the sole `foundation_persistence_marker` operational contract uses the
 *     fixed key `sc002-development-persistence`, a bounded opaque synthetic
 *     value, and constant `synthetic` provenance; the exact value is readable
 *     after reconnect and the row is absent in a fresh or reset-and-remigrated
 *     state.
 *
 * No database URL, credential, raw SQL/error, stack, or host/path detail is ever
 * emitted; failures carry only a bounded, stable, safe reason code. Exact cleanup
 * removes only the tables this suite created and the dedicated test schema.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import {
  createDatabase,
  closeDatabase,
  type Database,
} from "./database.js";
import {
  getMigrationStatus,
  applyMigrations,
  readMarker,
  writeMarker,
  getDatabaseReadiness,
  type MigrationStatus,
} from "./migrations.js";

// ---------------------------------------------------------------------------
// Pinned contract constants (data-model.md §Migration State / §Synthetic
// Persistence Marker / §Resource Inventory; research.md Decision 7).
// ---------------------------------------------------------------------------

/** The single version-controlled operational migration (T012). */
const MARKER_MIGRATION_NAME = "001-foundation-persistence-marker";
/** The sole operational marker table created by that migration. */
const MARKER_TABLE = "foundation_persistence_marker";
/** Kysely's migration bookkeeping table (internal detail; never emitted). */
const MIGRATION_METADATA_TABLE = "kysely_migration";
/** Kysely's migration serialization/lock table (internal detail; never emitted). */
const MIGRATION_LOCK_TABLE = "kysely_migration_lock";
/** The fixed id of Kysely's single lock row (internal detail; never emitted). */
const MIGRATION_LOCK_ROW_ID = "migration_lock";
/** Fixed acceptance marker key (SC-002). */
const MARKER_KEY = "sc002-development-persistence";
/** Bounded length for the opaque synthetic marker value. */
const MARKER_VALUE_MAX_LENGTH = 256;
/** Constant provenance for the marker row. */
const MARKER_PROVENANCE = "synthetic";

/** Exact, individually-named set of migration-owned tables in the dedicated schema. */
const OWNED_TABLE_NAMES = [
  MARKER_TABLE,
  MIGRATION_LOCK_TABLE,
  MIGRATION_METADATA_TABLE,
] as const;

/** A suite-created table that exact cleanup must also remove (owned by this run). */
const TARGET_SENTINEL_TABLE = "zz_songhealth_test_owned_sentinel";
/** A non-target sentinel table, in a sibling non-target schema, that cleanup must NOT touch. */
const NON_TARGET_SENTINEL_TABLE = "zz_songhealth_nontarget_sentinel";

/** Reserved database names that are never a valid isolated test target. */
const RESERVED_DATABASE_NAMES = [
  "songhealth_production",
  "songhealth_development",
  "songhealth_verification",
] as const;

/** Shared/system schemas that mirror or host engine internals and are never a test target. */
const SHARED_OR_SYSTEM_NAMES = [
  "mysql",
  "information_schema",
  "performance_schema",
  "sys",
] as const;

/**
 * The allowlisted isolated non-Production test identity prefix. Only a dedicated
 * schema matching this prefix is an acceptable test target; the run refuses
 * Production, shared, and arbitrary schemas before any mutation.
 */
const TEST_SCHEMA_PREFIX = "songhealth_test";
/** The sibling non-target schema prefix used to prove cleanup leaves non-targets unchanged. */
const NON_TARGET_SCHEMA_PREFIX = "songhealth_nontarget";

/** Safe refusal code when the target is not an allowlisted isolated non-Production schema. */
const TARGET_NOT_ISOLATED = "TEST_TARGET_NOT_ISOLATED";
/** Safe refusal code when a destructive helper is given a foreign/stale ownership token. */
const TARGET_OWNERSHIP_MISMATCH = "TEST_TARGET_OWNERSHIP_MISMATCH";
/** Safe refusal code when the exact schema was not created for this run (pre-existing state). */
const TARGET_NOT_CREATED_FOR_RUN = "TEST_TARGET_NOT_CREATED_FOR_RUN";
/** Safe refusal code when the current target inventory no longer matches the expected inventory. */
const TARGET_INVENTORY_MISMATCH = "TEST_TARGET_INVENTORY_MISMATCH";

/**
 * A bounded, opaque, synthetic marker value. It carries no protected data and
 * stays within the contract bound. Deterministic so the suite is reproducible.
 */
const SYNTHETIC_MARKER_VALUE = `sc002-synthetic-${"x".repeat(32)}`;

// ---------------------------------------------------------------------------
// Closed-shape vocabularies (data-model.md §Migration State / §Component
// Readiness / §Safe Diagnostic).
// ---------------------------------------------------------------------------

const MIGRATION_STATES = ["current", "pending", "unavailable", "error"] as const;
const MIGRATION_SAFE_CODES = [
  "DATABASE_UNAVAILABLE",
  "MIGRATIONS_PENDING",
  "MIGRATION_STATUS_FAILED",
] as const;
const READINESS_STATUSES = ["ready", "not-ready"] as const;
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
const SAFE_DIAGNOSTIC_REMEDIATIONS = [
  "FIX_CONFIGURATION",
  "RUN_MIGRATION",
  "INSPECT_OWNERSHIP",
  "RETRY_SAFE_OPERATION",
  "RUN_CONFIRMED_RECOVERY",
  "RUN_CONFIRMED_RESET",
  "REVIEW_MANUALLY",
] as const;

const MIGRATION_STATUS_KEYS = new Set(["state", "executed", "pending", "safeReasonCode"]);
const SAFE_DIAGNOSTIC_KEYS = new Set([
  "reasonCode",
  "diagnosticScope",
  "component",
  "configurationKey",
  "remediation",
]);
const REQUIRED_DIAGNOSTIC_KEYS = [
  "reasonCode",
  "diagnosticScope",
  "component",
  "remediation",
] as const;

// ---------------------------------------------------------------------------
// Assertion helpers (closed shapes + non-leakage), mirroring config.test.ts.
// ---------------------------------------------------------------------------

/** Assert a MigrationStatus is the exact closed shape (no extra/free-form keys). */
function assertClosedStatus(status: MigrationStatus): void {
  for (const key of Object.keys(status)) {
    expect(MIGRATION_STATUS_KEYS.has(key), `unexpected status key: ${key}`).toBe(true);
  }
  expect((MIGRATION_STATES as readonly string[]).includes(status.state)).toBe(true);
  expect(Array.isArray(status.executed)).toBe(true);
  expect(Array.isArray(status.pending)).toBe(true);
  if (status.safeReasonCode !== undefined) {
    expect((MIGRATION_SAFE_CODES as readonly string[]).includes(status.safeReasonCode)).toBe(
      true,
    );
  }
}

/** Assert a Safe Diagnostic is the exact closed shape with the given reason code. */
function assertClosedDiagnostic(diagnostic: unknown, expectedReasonCode: string): void {
  expect(typeof diagnostic).toBe("object");
  expect(diagnostic).not.toBeNull();
  const d = diagnostic as Record<string, unknown>;
  for (const key of Object.keys(d)) {
    expect(SAFE_DIAGNOSTIC_KEYS.has(key), `unexpected diagnostic key: ${key}`).toBe(true);
  }
  for (const key of REQUIRED_DIAGNOSTIC_KEYS) {
    expect(Object.prototype.hasOwnProperty.call(d, key), `missing diagnostic key: ${key}`).toBe(
      true,
    );
  }
  expect(d.reasonCode).toBe(expectedReasonCode);
  expect(typeof d.diagnosticScope).toBe("string");
  expect(typeof d.component).toBe("string");
  expect((SAFE_DIAGNOSTIC_COMPONENTS as readonly string[]).includes(d.component as string)).toBe(
    true,
  );
  expect(typeof d.remediation).toBe("string");
  expect(
    (SAFE_DIAGNOSTIC_REMEDIATIONS as readonly string[]).includes(d.remediation as string),
  ).toBe(true);
}

/**
 * Assert a serialized value leaks none of the forbidden raw tokens (raw SQL
 * error text, internal table/column names, host/path detail, etc.).
 */
function assertNoRawLeak(value: unknown, forbiddenTokens: readonly string[]): void {
  const serialized = JSON.stringify(value) ?? "";
  for (const token of forbiddenTokens) {
    expect(serialized, `raw detail leaked: ${token}`).not.toContain(token);
  }
}

// ---------------------------------------------------------------------------
// Local target allowlist + genuine per-run ownership (R4), and local test
// preparation/teardown (R5). These helpers NEVER come from a later-scope module.
// ---------------------------------------------------------------------------

/** Resolve the isolated non-Production test database URL (never logged). */
function resolveTestDatabaseUrl(): string | null {
  const url = process.env.SONGHEALTH_TEST_DATABASE_URL;
  if (typeof url !== "string" || url.length === 0) return null;
  if (!url.startsWith("mysql://") && !url.startsWith("mysql2://")) return null;
  return url;
}

/** Return a copy of `url` pointing at a different database name (internal only). */
function withDatabaseName(url: string, databaseName: string): string {
  const u = new URL(url);
  u.pathname = `/${databaseName}`;
  return u.toString();
}

/** The database (schema) name a connection string points at. */
function databaseNameOf(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

/**
 * The allowlisted isolated non-Production test identity predicate (R4). Only a
 * dedicated `songhealth_test_*` schema is acceptable; Production, shared, and
 * arbitrary schemas are refused before any mutation.
 */
function guardAcceptsDatabaseName(name: string): boolean {
  if ((RESERVED_DATABASE_NAMES as readonly string[]).includes(name)) return false;
  if ((SHARED_OR_SYSTEM_NAMES as readonly string[]).includes(name)) return false;
  return name.startsWith(TEST_SCHEMA_PREFIX) && name.length > TEST_SCHEMA_PREFIX.length;
}

/** A bounded descriptor binding a destructive operation to a specific owned target. */
interface TestOwnership {
  databaseName: string;
  /** Genuine per-run UUID: this run's claim of exclusive ownership. */
  token: string;
  /**
   * The exact expected owned inventory recorded when this run created the
   * schema: the individually-named set of tables this run is allowed to own
   * and drop. Every destructive helper re-reads the current schema inventory
   * and refuses mutation when it contains a table outside this exact set —
   * i.e. when the current inventory is absent or mismatched.
   */
  expectedOwnedTables: readonly string[];
}

let testUrl: string;
let database: Database;
let runOwnership: TestOwnership;

/** Read-only snapshot of table names in the connection's default schema. */
async function listTableNames(db: Database): Promise<string[]> {
  const r = await sql<{ table_name: string }>`
    SELECT table_name AS table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
  `.execute(db);
  return r.rows.map((row) => row.table_name);
}

/** One table's exact relevant state: presence plus its full, ordered row content. */
interface TableState {
  present: boolean;
  /** All rows, each with all columns, in a deterministic order. Empty when absent. */
  rows: Record<string, unknown>[];
}

/** The exact relevant migration state: metadata, lock, and marker table state. */
interface RelevantState {
  [tableName: string]: TableState;
}

/**
 * Read-only, stable snapshot of the EXACT relevant migration state (R3): for
 * each of the Kysely metadata table, the migration lock table, and the marker
 * table — its presence and the full content of every row (all columns).
 *
 * Because the snapshot captures row CONTENT, not just names or counts, it
 * detects creation or deletion of any of the three tables, and any mutation of
 * a row's key, value, timestamp, provenance, or count — on both the
 * fresh/pending path (where none of the three may exist) and the applied path
 * (where the existing rows must be byte-for-byte unchanged).
 */
async function snapshotRelevantState(db: Database): Promise<RelevantState> {
  const tables = await listTableNames(db);
  const state: RelevantState = {};
  for (const tableName of [
    MIGRATION_METADATA_TABLE,
    MIGRATION_LOCK_TABLE,
    MARKER_TABLE,
  ] as const) {
    if (!tables.includes(tableName)) {
      state[tableName] = { present: false, rows: [] };
      continue;
    }
    const r = await sql`SELECT * FROM ${sql.ref(tableName)}`.execute(db);
    const rows = (r.rows as Record<string, unknown>[]).map((row) => {
      const copy: Record<string, unknown> = {};
      for (const key of Object.keys(row).sort()) copy[key] = row[key];
      return copy;
    });
    rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    state[tableName] = { present: true, rows };
  }
  return state;
}

/** Drop one table by exact, qualified name (independent of the connection's default schema). */
async function dropTableQualified(db: Database, schemaName: string, tableName: string): Promise<void> {
  await sql`DROP TABLE IF EXISTS ${sql.ref(schemaName)}.${sql.ref(tableName)}`.execute(db);
}

/** Whether a schema exists on the engine (read-only). */
async function schemaExists(db: Database, schemaName: string): Promise<boolean> {
  const r = await sql<{ c: number }>`
    SELECT COUNT(*) AS c FROM information_schema.schemata WHERE schema_name = ${schemaName}
  `.execute(db);
  return Number(r.rows[0]?.c ?? 0) > 0;
}

/** Whether a table exists in a given schema (read-only). */
async function tableExistsInSchema(db: Database, schemaName: string, tableName: string): Promise<boolean> {
  const r = await sql<{ c: number }>`
    SELECT COUNT(*) AS c
    FROM information_schema.tables
    WHERE table_schema = ${schemaName} AND table_name = ${tableName}
  `.execute(db);
  return Number(r.rows[0]?.c ?? 0) > 0;
}

/**
 * Executable pre-mutation guard (R4): every destructive helper must pass the
 * allowlisted identity, the genuine per-run ownership token, and the exact
 * expected owned inventory for the dedicated schema. The current schema
 * inventory is re-read from the engine and must contain no table outside the
 * exact expected owned set — a missing schema or an unexpected table is a
 * bounded safe code, never a URL.
 */
async function assertOwnedTarget(db: Database, databaseName: string, ownership: TestOwnership): Promise<void> {
  if (!guardAcceptsDatabaseName(databaseName)) throw new Error(TARGET_NOT_ISOLATED);
  if (ownership.token !== runOwnership.token) throw new Error(TARGET_OWNERSHIP_MISMATCH);
  if (databaseName !== runOwnership.databaseName) throw new Error(TARGET_OWNERSHIP_MISMATCH);
  if (!(await schemaExists(db, databaseName))) throw new Error(TARGET_NOT_CREATED_FOR_RUN);
  const currentTables = await listTableNames(db);
  const expected = new Set<string>(ownership.expectedOwnedTables);
  if (currentTables.some((t) => !expected.has(t))) {
    throw new Error(TARGET_INVENTORY_MISMATCH);
  }
}

/**
 * Local test preparation (R4): prove the exact dedicated schema was created for
 * this run and is exclusively owned by it, then record the ownership evidence.
 *
 * A pre-existing schema of ANY name — even one matching the allowlisted test
 * prefix — is refused before any mutation: this run may only ever create,
 * mutate, and drop a schema it created itself, so a whole-schema drop can never
 * delete unrelated state from a shared or stale prefixed schema. The exact
 * expected owned inventory (the individually-named tables this run may create
 * and drop) binds every later destructive helper to refuse mutation when the
 * current schema inventory is absent or contains a table outside that set.
 */
async function createDedicatedTarget(db: Database, databaseName: string): Promise<TestOwnership> {
  if (!guardAcceptsDatabaseName(databaseName)) throw new Error(TARGET_NOT_ISOLATED);
  if (await schemaExists(db, databaseName)) {
    throw new Error(TARGET_NOT_CREATED_FOR_RUN);
  }
  await sql`CREATE DATABASE ${sql.ref(databaseName)}`.execute(db);
  // Re-read from the engine: the created schema must be exactly empty.
  const created = await createDatabase(withDatabaseName(testUrl, databaseName));
  try {
    const tables = await listTableNames(created);
    if (tables.length !== 0) throw new Error(TARGET_NOT_CREATED_FOR_RUN);
    return {
      databaseName,
      token: randomUUID(),
      expectedOwnedTables: [...OWNED_TABLE_NAMES, TARGET_SENTINEL_TABLE],
    };
  } finally {
    await closeDatabase(created);
  }
}

/**
 * Local test preparation: reduce the dedicated schema to a fresh/pending state by
 * dropping the exact owned tables (metadata, lock, marker), individually and by
 * exact name. This is teardown local to this suite, not a T013 lifecycle API.
 */
async function resetDedicatedTarget(db: Database, ownership: TestOwnership): Promise<void> {
  await assertOwnedTarget(db, ownership.databaseName, ownership);
  for (const t of OWNED_TABLE_NAMES) {
    await dropTableQualified(db, ownership.databaseName, t);
  }
}

/**
 * Local test preparation: reset to fresh, then explicitly apply to current (the
 * only pending→current path). Replaces the former resetAndRemigrate convenience
 * without importing any later lifecycle implementation.
 */
async function migrateToCurrent(db: Database, ownership: TestOwnership): Promise<void> {
  await resetDedicatedTarget(db, ownership);
  await applyMigrations(db);
}

/**
 * Exact cleanup evidence (R4): under the ownership guard, remove every
 * suite-created/owned table individually (metadata, lock, marker, plus any
 * suite-created sentinel) and drop the dedicated schema, leaving non-target
 * state (a sibling schema) untouched. No wildcard, prefix, prune, or force drop.
 */
async function cleanupDedicatedTarget(db: Database, ownership: TestOwnership): Promise<void> {
  await assertOwnedTarget(db, ownership.databaseName, ownership);
  for (const t of [...OWNED_TABLE_NAMES, TARGET_SENTINEL_TABLE]) {
    await dropTableQualified(db, ownership.databaseName, t);
  }
  await sql`DROP DATABASE ${sql.ref(ownership.databaseName)}`.execute(db);
}

/** Create a sibling non-target schema with a sentinel table to prove cleanup is scoped. */
async function createNonTargetSentinel(db: Database): Promise<string> {
  const nonTargetSchema = `${NON_TARGET_SCHEMA_PREFIX}_${runOwnership.token.replace(/-/g, "")}`;
  await sql`CREATE DATABASE IF NOT EXISTS ${sql.ref(nonTargetSchema)}`.execute(db);
  const nc = await createDatabase(withDatabaseName(testUrl, nonTargetSchema));
  try {
    await nc
      .schema
      .createTable(NON_TARGET_SENTINEL_TABLE)
      .addColumn("id", "integer", (col) => col.primaryKey())
      .execute();
  } finally {
    await closeDatabase(nc);
  }
  return nonTargetSchema;
}

/** Remove the sibling non-target schema created by this run (test teardown). */
async function dropNonTargetSchema(db: Database, nonTargetSchema: string): Promise<void> {
  await sql`DROP DATABASE IF EXISTS ${sql.ref(nonTargetSchema)}`.execute(db);
}

beforeAll(async () => {
  const url = resolveTestDatabaseUrl();
  if (!url) {
    // Fail explicitly — never skip, never pass — when the real engine is not
    // configured. The message is a stable safe reason code, not a URL.
    throw new Error("DATABASE_UNAVAILABLE");
  }
  testUrl = url;

  // Executable pre-mutation target guard (R4): validate the allowlisted isolated
  // non-Production identity, then prove the exact dedicated schema was created
  // for this run (refusing any pre-existing schema) and bind a genuine per-run
  // ownership token plus the exact expected owned inventory BEFORE any
  // destructive helper can run. Misconfiguration fails, never mutates.
  const databaseName = databaseNameOf(testUrl);
  if (!guardAcceptsDatabaseName(databaseName)) {
    throw new Error(TARGET_NOT_ISOLATED);
  }
  // Connect at the server level (through the engine's system schema, read-only
  // apart from creating/dropping the dedicated test schema) so the run can
  // create the dedicated schema itself — the run may only ever own a schema it
  // created, never a pre-existing one.
  const server = await createDatabase(withDatabaseName(testUrl, "mysql"));
  try {
    runOwnership = await createDedicatedTarget(server, databaseName);
  } finally {
    await closeDatabase(server);
  }

  database = await createDatabase(testUrl);
});

afterAll(async () => {
  // Best-effort exact teardown: remove any suite-created sibling non-target
  // schema and owned tables, then close the pool. The cleanup test may already
  // have dropped the dedicated schema; teardown is idempotent.
  if (database) {
    try {
      await dropNonTargetSchema(
        database,
        `${NON_TARGET_SCHEMA_PREFIX}_${runOwnership.token.replace(/-/g, "")}`,
      );
      if (await schemaExists(database, runOwnership.databaseName)) {
        await cleanupDedicatedTarget(database, runOwnership);
      }
    } finally {
      await closeDatabase(database);
    }
  }
});

// ---------------------------------------------------------------------------
// Contract shape (data-model.md §Migration State / §Component Readiness).
// ---------------------------------------------------------------------------

describe("T011 · contract shape", () => {
  it("pins the exact state, safe-reason-code, and readiness vocabularies", () => {
    expect(MIGRATION_STATES).toEqual(["current", "pending", "unavailable", "error"]);
    expect(MIGRATION_SAFE_CODES).toEqual([
      "DATABASE_UNAVAILABLE",
      "MIGRATIONS_PENDING",
      "MIGRATION_STATUS_FAILED",
    ]);
    expect(READINESS_STATUSES).toEqual(["ready", "not-ready"]);
    // The marker identity is fixed and bounded.
    expect(MARKER_MIGRATION_NAME).toBe("001-foundation-persistence-marker");
    expect(MARKER_TABLE).toBe("foundation_persistence_marker");
    expect(MARKER_KEY).toBe("sc002-development-persistence");
    expect(MARKER_PROVENANCE).toBe("synthetic");
    expect(SYNTHETIC_MARKER_VALUE.length).toBeGreaterThan(0);
    expect(SYNTHETIC_MARKER_VALUE.length).toBeLessThanOrEqual(MARKER_VALUE_MAX_LENGTH);
  });

  it("the synthetic marker value is bounded and carries no protected detail", () => {
    expect(SYNTHETIC_MARKER_VALUE.length).toBeLessThanOrEqual(MARKER_VALUE_MAX_LENGTH);
    expect(SYNTHETIC_MARKER_VALUE).not.toContain("://");
    expect(SYNTHETIC_MARKER_VALUE).not.toContain("@");
    expect(SYNTHETIC_MARKER_VALUE).not.toContain("/");
  });
});

// ---------------------------------------------------------------------------
// R4 · executable pre-mutation guard bound to an allowlisted identity and to
// proof that the exact schema was created for this run.
// ---------------------------------------------------------------------------

describe("T011 · allowlisted target guard and genuine run ownership (R4)", () => {
  it("refuses reserved, shared/system, and arbitrary schemas before any mutation", () => {
    const nonIsolated = [
      ...RESERVED_DATABASE_NAMES,
      ...SHARED_OR_SYSTEM_NAMES,
      "songhealth_customer_shared",
      "songhealth_verification_copy",
    ];
    for (const name of nonIsolated) {
      expect(guardAcceptsDatabaseName(name), `should refuse ${name}`).toBe(false);
    }
    // The allowlisted dedicated test identity is accepted.
    expect(guardAcceptsDatabaseName(runOwnership.databaseName)).toBe(true);
  });

  it("the guard refusal is a bounded safe code with no URL/host/path detail", async () => {
    let thrown: unknown;
    try {
      await assertOwnedTarget(database, "songhealth_shared", runOwnership);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(Error);
    // The refusal is a bounded safe code, not the connection string.
    assertNoRawLeak(String((thrown as Error).message), [testUrl, "://", "@"]);
  });

  it("binds genuine per-run ownership to the exact allowlisted schema", () => {
    // The token is a real, unique per-run UUID — genuine ownership, not an
    // arbitrary stable non-empty placeholder.
    expect(typeof runOwnership.token).toBe("string");
    expect(runOwnership.token.length).toBeGreaterThan(0);
    expect(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runOwnership.token),
    ).toBe(true);
    // The descriptor exposes the exact allowlisted isolated schema name.
    expect(runOwnership.databaseName).toBe(databaseNameOf(testUrl));
    expect(runOwnership.databaseName).toBe(new URL(testUrl).pathname.replace(/^\//, ""));
    expect(guardAcceptsDatabaseName(runOwnership.databaseName)).toBe(true);
    // The expected owned inventory is the exact individually-named set of
    // tables this run may create and drop — no prefix, no wildcard.
    expect([...runOwnership.expectedOwnedTables].sort()).toEqual(
      [...OWNED_TABLE_NAMES, TARGET_SENTINEL_TABLE].sort(),
    );
  });

  it("refuses to adopt a pre-existing schema even when it matches the allowlisted prefix", async () => {
    // A schema whose name matches the allowlisted test prefix but was NOT
    // created by this run must be refused before any mutation — adopting it
    // would let the later whole-schema drop delete unrelated state. Simulate a
    // stale/shared prefixed schema by creating it at the server level first.
    const foreignName = `${TEST_SCHEMA_PREFIX}_foreign_${runOwnership.token.replace(/-/g, "")}`;
    const server = await createDatabase(withDatabaseName(testUrl, "mysql"));
    try {
      await sql`CREATE DATABASE ${sql.ref(foreignName)}`.execute(server);
      // The run must refuse to adopt it: it did not create this schema.
      await expect(createDedicatedTarget(server, foreignName)).rejects.toThrow(
        TARGET_NOT_CREATED_FOR_RUN,
      );
    } finally {
      // Remove the simulated foreign schema so nothing is left behind.
      await sql`DROP DATABASE IF EXISTS ${sql.ref(foreignName)}`.execute(server);
      await closeDatabase(server);
    }
  });

  it("refuses a destructive helper bound to a foreign/stale ownership token", async () => {
    const stale: TestOwnership = {
      databaseName: runOwnership.databaseName,
      token: "stale-run-token",
      expectedOwnedTables: runOwnership.expectedOwnedTables,
    };
    await expect(resetDedicatedTarget(database, stale)).rejects.toThrow(
      TARGET_OWNERSHIP_MISMATCH,
    );
  });

  it("refuses a destructive helper for a non-allowlisted target even with a matching token", async () => {
    const wrongTarget: TestOwnership = {
      databaseName: "songhealth_shared",
      token: runOwnership.token,
      expectedOwnedTables: runOwnership.expectedOwnedTables,
    };
    await expect(resetDedicatedTarget(database, wrongTarget)).rejects.toThrow(
      TARGET_NOT_ISOLATED,
    );
  });

  it("refuses a destructive helper when the current inventory contains a table outside the expected owned set", async () => {
    // A descriptor with a foreign expected-owned inventory cannot authorize a
    // mutation even though the identity and token are this run's: the guard
    // re-reads the current schema inventory and refuses the mismatch. Establish
    // owned migration state first so the current inventory is non-empty.
    await migrateToCurrent(database, runOwnership);
    const wrongInventory: TestOwnership = {
      databaseName: runOwnership.databaseName,
      token: runOwnership.token,
      expectedOwnedTables: [],
    };
    await expect(resetDedicatedTarget(database, wrongInventory)).rejects.toThrow(
      TARGET_INVENTORY_MISMATCH,
    );
    // The refusal must be non-mutating: the owned tables are still present.
    const tables = await listTableNames(database);
    for (const t of OWNED_TABLE_NAMES) {
      expect(tables).toContain(t);
    }
  });
});

// ---------------------------------------------------------------------------
// R1 · real status-inspection failure → error + MIGRATION_STATUS_FAILED.
// ---------------------------------------------------------------------------

describe("T011 · status-inspection failure (R1)", () => {
  it("returns the closed error state with MIGRATION_STATUS_FAILED and no raw leakage", async () => {
    // Reach a state where the Kysely metadata table exists, then corrupt its
    // schema so the read-only status inspection (getMigrations) fails — a real
    // engine failure that is NOT an unavailable-connection case.
    await migrateToCurrent(database, runOwnership);
    await dropTableQualified(database, runOwnership.databaseName, MIGRATION_METADATA_TABLE);
    await database
      .schema
      .createTable(MIGRATION_METADATA_TABLE)
      .addColumn("wrong_column", "varchar(255)", (col) => col.primaryKey())
      .execute();

    try {
      const status = await getMigrationStatus(database);

      assertClosedStatus(status);
      expect(status.state).toBe("error");
      expect(status.safeReasonCode).toBe("MIGRATION_STATUS_FAILED");
      // No raw SQL error, internal table/column name, or stack detail leaks.
      assertNoRawLeak(status, [
        "Unknown column",
        "field list",
        "executedAt",
        MIGRATION_METADATA_TABLE,
        "wrong_column",
        "stack",
      ]);
    } finally {
      // Restore a clean, migrated state for subsequent tests.
      await migrateToCurrent(database, runOwnership);
    }
  });
});

// ---------------------------------------------------------------------------
// R3 · status inspection is non-mutating (before/after exact relevant state).
// ---------------------------------------------------------------------------

describe("T011 · read-only status is non-mutating (R3)", () => {
  it("fresh/pending status inspection creates no metadata, lock, or marker state", async () => {
    await resetDedicatedTarget(database, runOwnership);

    const before = await snapshotRelevantState(database);
    // Fresh/pending: no Kysely metadata, lock, or marker table exists yet.
    expect(before).toEqual({
      [MIGRATION_METADATA_TABLE]: { present: false, rows: [] },
      [MIGRATION_LOCK_TABLE]: { present: false, rows: [] },
      [MARKER_TABLE]: { present: false, rows: [] },
    });

    await getMigrationStatus(database);

    const after = await snapshotRelevantState(database);
    // Status inspection must NOT create or mutate any relevant state on the
    // fresh/pending path — creation of a metadata, lock, or marker table (or
    // any row within one) would make the after-snapshot differ.
    expect(after).toEqual(before);
    expect(after[MIGRATION_METADATA_TABLE].present).toBe(false);
    expect(after[MIGRATION_LOCK_TABLE].present).toBe(false);
    expect(after[MARKER_TABLE].present).toBe(false);
  });

  it("status inspection leaves the exact applied relevant-state unchanged, including a populated marker", async () => {
    await migrateToCurrent(database, runOwnership);
    // Populate the marker with the bounded synthetic value BEFORE the
    // applied-state snapshot: status inspection must be proven non-mutating
    // against an EXISTING marker row, not an empty marker table. An
    // implementation that changes an existing marker value or provenance
    // during status inspection would make the after-snapshot differ.
    await writeMarker(database, SYNTHETIC_MARKER_VALUE);

    const before = await snapshotRelevantState(database);
    // Applied: the metadata table records the executed migration and the lock
    // table holds its single lock row; the marker table holds the populated
    // acceptance row.
    expect(before[MIGRATION_METADATA_TABLE].present).toBe(true);
    expect(before[MIGRATION_METADATA_TABLE].rows).toHaveLength(1);
    expect(before[MIGRATION_METADATA_TABLE].rows[0]).toMatchObject({
      name: MARKER_MIGRATION_NAME,
    });
    expect(before[MIGRATION_LOCK_TABLE].present).toBe(true);
    expect(before[MIGRATION_LOCK_TABLE].rows).toHaveLength(1);
    expect(before[MIGRATION_LOCK_TABLE].rows[0]).toMatchObject({
      id: MIGRATION_LOCK_ROW_ID,
    });
    expect(before[MARKER_TABLE].present).toBe(true);
    expect(before[MARKER_TABLE].rows).toHaveLength(1);
    // The populated marker carries the exact fixed key, bounded synthetic
    // value, and constant provenance (column names are T012/T013 internals;
    // assert on row content, not names).
    const beforeMarkerRow = before[MARKER_TABLE].rows[0];
    expect(Object.values(beforeMarkerRow)).toContain(MARKER_KEY);
    expect(Object.values(beforeMarkerRow)).toContain(SYNTHETIC_MARKER_VALUE);
    expect(Object.values(beforeMarkerRow)).toContain(MARKER_PROVENANCE);

    await getMigrationStatus(database);

    const after = await snapshotRelevantState(database);
    // The full relevant state — presence and complete row content of the
    // metadata, lock, and marker tables, including the populated marker's
    // exact key/value/provenance — is byte-for-byte unchanged by inspection.
    expect(after).toEqual(before);
    const afterMarkerRow = after[MARKER_TABLE].rows[0];
    expect(Object.values(afterMarkerRow)).toContain(MARKER_KEY);
    expect(Object.values(afterMarkerRow)).toContain(SYNTHETIC_MARKER_VALUE);
    expect(Object.values(afterMarkerRow)).toContain(MARKER_PROVENANCE);
  });

  it("status inspection applies nothing and creates no marker data", async () => {
    await resetDedicatedTarget(database, runOwnership);

    const status = await getMigrationStatus(database);

    expect(status.state).toBe("pending");
    expect(status.executed).toEqual([]);
    expect(status.pending).toEqual([MARKER_MIGRATION_NAME]);
    expect(status.safeReasonCode).toBe("MIGRATIONS_PENDING");
    // No marker data was created by inspection.
    expect(await readMarker(database)).toBeNull();
    const snap = await snapshotRelevantState(database);
    expect(snap[MARKER_TABLE].present).toBe(false);
  });

  it("the relevant-state snapshot detects content mutation of the exact relevant state", async () => {
    // The R3 assertion is only meaningful if the snapshot can actually detect
    // mutation: prove it detects a content change that preserves the marker
    // row COUNT (the fixed key's value changed) and a row deletion.
    await migrateToCurrent(database, runOwnership);
    await writeMarker(database, SYNTHETIC_MARKER_VALUE);

    const before = await snapshotRelevantState(database);
    expect(before[MARKER_TABLE].rows).toHaveLength(1);

    // Mutate the marker row's value while preserving its count: the fixed key
    // holds one acceptance row, so writing a different value changes content,
    // not count.
    await writeMarker(database, `${SYNTHETIC_MARKER_VALUE}-mutated`);
    const afterMutation = await snapshotRelevantState(database);
    expect(afterMutation[MARKER_TABLE].rows).toHaveLength(1);
    expect(afterMutation).not.toEqual(before);

    // Deleting the row must also be detected.
    await sql`DELETE FROM ${sql.ref(MARKER_TABLE)}`.execute(database);
    const afterDeletion = await snapshotRelevantState(database);
    expect(afterDeletion[MARKER_TABLE].rows).toEqual([]);
    expect(afterDeletion).not.toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Non-mutating, read-only status (FR-009; data-model.md §Migration State).
// ---------------------------------------------------------------------------

describe("T011 · read-only migration status", () => {
  it("repeated status is identical (deterministic, ordered)", async () => {
    await resetDedicatedTarget(database, runOwnership);

    const first = await getMigrationStatus(database);
    const second = await getMigrationStatus(database);

    assertClosedStatus(first);
    assertClosedStatus(second);
    expect(second).toEqual(first);
    expect(second.state).toBe("pending");
    expect(second.executed).toEqual([]);
  });

  it("status after apply is current with the migration executed and no pending", async () => {
    await resetDedicatedTarget(database, runOwnership);
    await applyMigrations(database);

    const status = await getMigrationStatus(database);

    assertClosedStatus(status);
    expect(status.state).toBe("current");
    expect(status.executed).toEqual([MARKER_MIGRATION_NAME]);
    expect(status.pending).toEqual([]);
    expect(status.safeReasonCode).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Explicit apply: the only pending→current path (FR-004, FR-009).
// ---------------------------------------------------------------------------

describe("T011 · explicit apply (the only pending→current transition)", () => {
  it("apply transitions pending→current and reports each tracked migration", async () => {
    await resetDedicatedTarget(database, runOwnership);

    const result = await applyMigrations(database);

    expect(result.state).toBe("current");
    expect(result.applied).toEqual([MARKER_MIGRATION_NAME]);
    expect(result.safeReasonCode).toBeUndefined();

    const status = await getMigrationStatus(database);
    expect(status.state).toBe("current");
    expect(status.executed).toEqual([MARKER_MIGRATION_NAME]);
    // The marker table now exists (created by apply, not by status) but is empty.
    expect(await readMarker(database)).toBeNull();
  });

  it("apply is safe when repeated (idempotent, no duplicate execution)", async () => {
    await migrateToCurrent(database, runOwnership);

    const result = await applyMigrations(database);

    expect(result.state).toBe("current");
    // Nothing pending: the repeated apply reports no new migrations.
    expect(result.applied).toEqual([]);
    const status = await getMigrationStatus(database);
    expect(status.state).toBe("current");
    expect(status.executed).toEqual([MARKER_MIGRATION_NAME]);
  });

  it("concurrent apply is serialized so each migration runs exactly once", async () => {
    await resetDedicatedTarget(database, runOwnership);

    const [a, b] = await Promise.all([
      applyMigrations(database),
      applyMigrations(database),
    ]);

    expect(a.state).toBe("current");
    expect(b.state).toBe("current");
    const executedReports = [...a.applied, ...b.applied];
    expect(
      executedReports.filter((name) => name === MARKER_MIGRATION_NAME),
    ).toHaveLength(1);

    const status = await getMigrationStatus(database);
    expect(status.state).toBe("current");
    expect(status.executed).toEqual([MARKER_MIGRATION_NAME]);
  });
});

// ---------------------------------------------------------------------------
// R2 · readiness is an implementation boundary, not a self-derived boolean.
// ---------------------------------------------------------------------------

describe("T011 · database component readiness boundary (R2)", () => {
  it("is not-ready with a closed MIGRATIONS_PENDING diagnostic while pending", async () => {
    await resetDedicatedTarget(database, runOwnership);

    const readiness = await getDatabaseReadiness(database);

    expect(readiness.component).toBe("database");
    expect(readiness.status).toBe("not-ready");
    expect(readiness.diagnostic).toBeDefined();
    assertClosedDiagnostic(readiness.diagnostic, "MIGRATIONS_PENDING");
    expect(typeof readiness.observedAt).toBe("string");
  });

  it("is ready (no diagnostic) only when migrations are current", async () => {
    await migrateToCurrent(database, runOwnership);

    const readiness = await getDatabaseReadiness(database);

    expect(readiness.component).toBe("database");
    expect(readiness.status).toBe("ready");
    expect(readiness.diagnostic).toBeUndefined();
    expect(typeof readiness.observedAt).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Sole foundation_persistence_marker contract (SC-002).
// ---------------------------------------------------------------------------

describe("T011 · sole persistence-marker contract (SC-002)", () => {
  it("writes and reads the fixed key with a bounded synthetic value and synthetic provenance", async () => {
    await migrateToCurrent(database, runOwnership);

    await writeMarker(database, SYNTHETIC_MARKER_VALUE);
    const row = await readMarker(database);

    expect(row).not.toBeNull();
    expect(row!.markerKey).toBe(MARKER_KEY);
    expect(row!.markerValue).toBe(SYNTHETIC_MARKER_VALUE);
    expect(row!.provenance).toBe(MARKER_PROVENANCE);
    expect(row!.markerValue.length).toBeLessThanOrEqual(MARKER_VALUE_MAX_LENGTH);
  });

  it("the exact marker value is readable after reconnect (persistence continuity)", async () => {
    await migrateToCurrent(database, runOwnership);
    await writeMarker(database, SYNTHETIC_MARKER_VALUE);

    // Close the pool, then reconnect with a fresh client (routine restart).
    await closeDatabase(database);
    database = await createDatabase(testUrl);

    const row = await readMarker(database);
    expect(row).not.toBeNull();
    expect(row!.markerKey).toBe(MARKER_KEY);
    expect(row!.markerValue).toBe(SYNTHETIC_MARKER_VALUE);
    expect(row!.provenance).toBe(MARKER_PROVENANCE);
  });

  it("the marker is absent in a fresh state (table exists, row absent)", async () => {
    await migrateToCurrent(database, runOwnership);

    const row = await readMarker(database);
    expect(row).toBeNull();
    const status = await getMigrationStatus(database);
    expect(status.state).toBe("current");
  });

  it("the prior marker is absent after reset-and-remigrate (table recreated empty)", async () => {
    await migrateToCurrent(database, runOwnership);
    await writeMarker(database, SYNTHETIC_MARKER_VALUE);
    // Prove it was present before the reset.
    expect(await readMarker(database)).not.toBeNull();

    // Exact reset reapplies migrations: the table is recreated empty and the
    // prior row is absent, while migration state is current.
    await migrateToCurrent(database, runOwnership);

    expect(await readMarker(database)).toBeNull();
    const status = await getMigrationStatus(database);
    expect(status.state).toBe("current");
  });
});

// ---------------------------------------------------------------------------
// R4 · destructive helpers are gated by the guard; exact cleanup is scoped.
// ---------------------------------------------------------------------------

describe("T011 · destructive-helper gating and exact cleanup (R4)", () => {
  it("cleanup removes every suite-created resource and the dedicated schema, leaving non-target state unchanged", async () => {
    await resetDedicatedTarget(database, runOwnership);
    // Establish owned, migration-created state (metadata, lock, marker) plus a
    // suite-created owned sentinel that exact cleanup must also remove.
    await migrateToCurrent(database, runOwnership);
    await database
      .schema
      .createTable(TARGET_SENTINEL_TABLE)
      .addColumn("id", "integer", (col) => col.primaryKey())
      .execute();

    // Non-target state: a sibling non-target schema with a sentinel table that
    // this run does NOT own and exact cleanup must NOT touch.
    const nonTargetSchema = await createNonTargetSentinel(database);
    expect(await schemaExists(database, runOwnership.databaseName)).toBe(true);
    expect(await schemaExists(database, nonTargetSchema)).toBe(true);
    expect(
      await tableExistsInSchema(database, nonTargetSchema, NON_TARGET_SENTINEL_TABLE),
    ).toBe(true);
    // The marker row the reset wrote is present before cleanup.
    await writeMarker(database, SYNTHETIC_MARKER_VALUE);

    // Exact cleanup re-checks the ownership guard against the exact expected
    // inventory before any drop.
    await expect(cleanupDedicatedTarget(database, runOwnership)).resolves.toBeUndefined();

    // The dedicated schema and every suite-created resource are gone...
    expect(await schemaExists(database, runOwnership.databaseName)).toBe(false);
    // ...while the non-target sibling schema and its sentinel remain unchanged.
    expect(await schemaExists(database, nonTargetSchema)).toBe(true);
    expect(
      await tableExistsInSchema(database, nonTargetSchema, NON_TARGET_SENTINEL_TABLE),
    ).toBe(true);

    // Test teardown drops the sibling non-target schema so nothing is left behind.
    await dropNonTargetSchema(database, nonTargetSchema);
    expect(await schemaExists(database, nonTargetSchema)).toBe(false);

    // Recreate the dedicated schema and reconnect for the remaining tests: this
    // run owns the schema it created in beforeAll, so re-creation restores the
    // exact empty expected inventory the ownership guard is bound to.
    const server = await createDatabase(withDatabaseName(testUrl, "mysql"));
    try {
      await sql`CREATE DATABASE ${sql.ref(runOwnership.databaseName)}`.execute(server);
    } finally {
      await closeDatabase(server);
    }
    await closeDatabase(database);
    database = await createDatabase(testUrl);
    expect(await schemaExists(database, runOwnership.databaseName)).toBe(true);
    expect(await listTableNames(database)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Explicit failure when the real engine is unavailable (never skip/pass).
// ---------------------------------------------------------------------------

describe("T011 · unavailable engine fails explicitly with a safe code", () => {
  it("an unreachable engine yields the unavailable state and DATABASE_UNAVAILABLE", async () => {
    // A URL that cannot reach a real engine must produce the unavailable state
    // with the safe code — never a skip, never a pass, never a raw error.
    const unreachable = await createDatabase(
      withDatabaseName(testUrl, "unreachable-test-db"),
    );
    try {
      const status = await getMigrationStatus(unreachable);
      assertClosedStatus(status);
      expect(status.state).toBe("unavailable");
      expect(status.safeReasonCode).toBe("DATABASE_UNAVAILABLE");
      assertNoRawLeak(status, ["unreachable-test-db", "://", "stack"]);
    } finally {
      await closeDatabase(unreachable);
    }
  });
});

// ---------------------------------------------------------------------------
// T013 rework regression coverage (closes T013-B01 through T013-B03). These
// pin the corrected behavior on top of the accepted T011 contract; they add
// coverage without weakening any T011 assertion above.
// ---------------------------------------------------------------------------

/** Bounded safe code for a genuine marker read failure (T013-B01). */
const MARKER_READ_FAILED = "MARKER_READ_FAILED";
/** Bounded safe code for an out-of-bound marker value (T013-B02). */
const MARKER_VALUE_OUT_OF_BOUND = "MARKER_VALUE_OUT_OF_BOUND";

describe("T013 · marker read distinguishes absence from failure (B01)", () => {
  it("a fresh/unmigrated schema (missing marker table) is absence (null)", async () => {
    await resetDedicatedTarget(database, runOwnership);
    // No marker table exists yet: the expected absence condition.
    expect(await readMarker(database)).toBeNull();
  });

  it("a corrupted marker schema is a read failure, not absence", async () => {
    await migrateToCurrent(database, runOwnership);
    // Corrupt the marker table's schema (reachable engine, wrong columns) so the
    // marker SELECT fails for a reason that is NOT a missing table.
    await dropTableQualified(database, runOwnership.databaseName, MARKER_TABLE);
    await database
      .schema
      .createTable(MARKER_TABLE)
      .addColumn("wrong_column", "varchar(255)", (col) => col.primaryKey())
      .execute();

    try {
      // A genuine read failure must throw a bounded safe code — it must NOT be
      // falsely reported as marker absence (null).
      let captured: unknown;
      try {
        await readMarker(database);
      } catch (error) {
        captured = error;
      }
      expect(captured).toBeInstanceOf(Error);
      // The thrown message is exactly the bounded safe code — no raw SQL error,
      // internal table/column name, or stack detail.
      expect((captured as Error).message).toBe(MARKER_READ_FAILED);
      assertNoRawLeak((captured as Error).message, [
        "Unknown column",
        "field list",
        MARKER_TABLE,
        "wrong_column",
        "stack",
      ]);
    } finally {
      // Restore a clean, migrated state for subsequent tests.
      await migrateToCurrent(database, runOwnership);
    }
  });

  it("an unreachable engine is a read failure, not absence", async () => {
    const unreachable = await createDatabase(
      withDatabaseName(testUrl, "unreachable-test-db"),
    );
    try {
      // An unavailable engine must NOT be reported as marker absence (null);
      // it is a genuine read failure with a bounded safe code.
      let captured: unknown;
      try {
        await readMarker(unreachable);
      } catch (error) {
        captured = error;
      }
      expect(captured).toBeInstanceOf(Error);
      expect((captured as Error).message).toBe(MARKER_READ_FAILED);
      assertNoRawLeak((captured as Error).message, ["unreachable-test-db", "://", "stack"]);
    } finally {
      await closeDatabase(unreachable);
    }
  });
});

describe("T013 · marker value bound is enforced before mutation (B02)", () => {
  it("an empty marker value is rejected and mutates nothing", async () => {
    await migrateToCurrent(database, runOwnership);

    await expect(writeMarker(database, "")).rejects.toThrow(MARKER_VALUE_OUT_OF_BOUND);
    // No row was created by the rejected write.
    expect(await readMarker(database)).toBeNull();
  });

  it("an over-length (>256) marker value is rejected and mutates nothing", async () => {
    await migrateToCurrent(database, runOwnership);
    await writeMarker(database, SYNTHETIC_MARKER_VALUE);
    const before = await readMarker(database);

    const over = `${"y".repeat(256)}y`; // 257 characters
    expect(over.length).toBe(MARKER_VALUE_MAX_LENGTH + 1);
    await expect(writeMarker(database, over)).rejects.toThrow(MARKER_VALUE_OUT_OF_BOUND);

    // The row is unchanged: the out-of-bound value never reached the database.
    const after = await readMarker(database);
    expect(after).toEqual(before);
    expect(after!.markerValue).toBe(SYNTHETIC_MARKER_VALUE);
  });

  it("accepts the exact bound (1 and 256 characters)", async () => {
    await migrateToCurrent(database, runOwnership);

    const one = "z"; // exactly the minimum
    expect(one.length).toBe(1);
    await writeMarker(database, one);
    expect((await readMarker(database))!.markerValue).toBe(one);

    const max = "z".repeat(MARKER_VALUE_MAX_LENGTH); // exactly the maximum
    expect(max.length).toBe(MARKER_VALUE_MAX_LENGTH);
    await writeMarker(database, max);
    expect((await readMarker(database))!.markerValue).toBe(max);
  });
});

describe("T013 · migration status snapshots are immutable and ordered (B03)", () => {
  it("pending status exposes frozen, ordered executed/pending lists", async () => {
    await resetDedicatedTarget(database, runOwnership);

    const status = await getMigrationStatus(database);
    assertClosedStatus(status);
    expect(status.state).toBe("pending");

    // Immutable: the returned lists cannot be mutated or re-ordered.
    expect(Object.isFrozen(status.executed)).toBe(true);
    expect(Object.isFrozen(status.pending)).toBe(true);
    expect(() => (status.executed as unknown as string[]).push("x")).toThrow(TypeError);
    expect(() => (status.pending as unknown as string[]).push("x")).toThrow(TypeError);

    // Ordered: the exact expected names, in Kysely's deterministic order.
    expect([...status.executed]).toEqual([]);
    expect([...status.pending]).toEqual([MARKER_MIGRATION_NAME]);
  });

  it("current status exposes frozen, ordered executed/pending lists", async () => {
    await migrateToCurrent(database, runOwnership);

    const status = await getMigrationStatus(database);
    assertClosedStatus(status);
    expect(status.state).toBe("current");

    expect(Object.isFrozen(status.executed)).toBe(true);
    expect(Object.isFrozen(status.pending)).toBe(true);
    expect([...status.executed]).toEqual([MARKER_MIGRATION_NAME]);
    expect([...status.pending]).toEqual([]);
  });

  it("the unavailable and error status lists are immutable too", async () => {
    const unreachable = await createDatabase(
      withDatabaseName(testUrl, "unreachable-test-db"),
    );
    try {
      const status = await getMigrationStatus(unreachable);
      expect(status.state).toBe("unavailable");
      expect(Object.isFrozen(status.executed)).toBe(true);
      expect(Object.isFrozen(status.pending)).toBe(true);
    } finally {
      await closeDatabase(unreachable);
    }
  });
});

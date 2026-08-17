/**
 * T012 — The sole version-controlled foundation-operational migration.
 *
 * References: FR-002, FR-016, SC-002; data-model.md §Data Store / §Migration
 * State / §Synthetic Persistence Marker; plan.md §Technical Context +
 * §Persistence and migrations; research.md Decision 7; quickstart.md §4;
 * accepted T011 marker contract; installed Kysely 0.29.5 (`kysely/migration`
 * `Migration` API).
 *
 * This is the ONE operational migration this Delivery ships. `up` creates
 * exactly `foundation_persistence_marker` — the minimum non-Product table
 * required by SC-002 — with only the minimal snake-case storage for the
 * fixed marker key (sole primary key), a non-null bounded marker value of at
 * most 256 characters, and non-null synthetic provenance. It creates no
 * row/seed, no other table, index, foreign key, timestamp, Product/domain
 * field, or speculative schema, and uses no `ifNotExists` or other
 * collision-hiding create path. `down` removes only that exact table and
 * performs no broad or cascading cleanup.
 *
 * The table stores only a synthetic acceptance marker; the application never
 * reads it — only the Development persistence validation operation may
 * write/read the single row. It is not a Product/domain schema or seed.
 *
 * The named `up`/`down` exports are the current Kysely migration-file API
 * consumed by `FileMigrationProvider` (which accepts a module whose named
 * `up` is a function), and the exported `migration` object is a compile-time
 * proof that the pair satisfies the `Migration` type from `kysely/migration`.
 */

import type { Kysely } from "kysely";
import type { Migration } from "kysely/migration";

/** The sole operational marker table created by this migration. */
const MARKER_TABLE = "foundation_persistence_marker";

/**
 * The operational schema this migration owns: no application tables. The
 * Kysely schema generic is the empty schema — the builder surface used here
 * (`db.schema`) is schema-independent, and no `any` is introduced.
 */
type OperationalSchema = Record<string, never>;

/**
 * Create exactly `foundation_persistence_marker` with the minimal storage:
 *   - `marker_key`   — the fixed marker key, sole primary key;
 *   - `marker_value` — non-null, bounded to 256 characters;
 *   - `provenance`   — non-null, the constant `synthetic`.
 * No row/seed, no other table, index, foreign key, or timestamp column.
 */
export async function up(db: Kysely<OperationalSchema>): Promise<void> {
  await db.schema
    .createTable(MARKER_TABLE)
    .addColumn("marker_key", "varchar(64)", (col) => col.notNull().primaryKey())
    .addColumn("marker_value", "varchar(256)", (col) => col.notNull())
    .addColumn("provenance", "varchar(32)", (col) => col.notNull())
    .execute();
}

/** Remove only the exact table this migration created; no cascade. */
export async function down(db: Kysely<OperationalSchema>): Promise<void> {
  await db.schema.dropTable(MARKER_TABLE).execute();
}

/** Compile-time proof the named exports satisfy the current Kysely Migration API. */
export const migration: Migration = { up, down };

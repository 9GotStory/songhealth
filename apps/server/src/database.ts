/**
 * T013 — Kysely database composition over a real MySQL-compatible engine.
 *
 * References: FR-004, FR-009, SC-002; data-model.md §Data Store / §Migration
 * State; plan.md §Persistence and migrations; research.md Decision 7;
 * quickstart.md §4; accepted `apps/server/src/migrations.test.ts` (T011);
 * installed Kysely 0.29.5 and `mysql2` 3.23.3.
 *
 * This module is the server-owned database boundary. It composes a Kysely
 * instance over `mysql2` from a `mysql://` (or `mysql2://`) connection URL and
 * exposes the minimal lifecycle surface the T011 real-engine contract imports:
 *   - `createDatabase(url, connectionLimit?)` — build a Kysely instance bound
 *     to the URL's schema, with an optional pool connection limit.
 *   - `closeDatabase(db)`   — end the underlying connection pool.
 *   - `Database`            — the Kysely instance type.
 *
 * The composition is engine-agnostic in its public surface (a URL in, a
 * `Database` out) and is never satisfied by SQLite or mocked persistence: the
 * dialect is always the Kysely MySQL dialect over a real `mysql2` pool.
 *
 * `createDatabase` does NOT probe reachability and does NOT throw on an
 * unreachable engine: the pool is created lazily by the driver, so construction
 * succeeds even when the engine cannot be reached. Reachability is observed by
 * the caller (the migration status operation in `migrations.ts`), which maps an
 * unreachable engine to the closed `unavailable` / `DATABASE_UNAVAILABLE` state.
 * No database URL, credential, or raw error detail is retained or emitted here.
 */

import { Kysely, MysqlDialect, type Kysely as KyselyInstance } from "kysely";
import { createPool } from "mysql2";

/**
 * The Kysely instance type for this Delivery. The application owns no
 * Product/domain tables in this Delivery, so the schema is the empty schema —
 * the operational surface (the migration marker table and Kysely's internal
 * bookkeeping tables) is exercised through the schema builder and raw SQL,
 * which are schema-independent. No `any` is introduced.
 */
export type Database = KyselyInstance<Record<string, never>>;

/**
 * Build a Kysely instance over a real MySQL-compatible engine from a
 * `mysql://` or `mysql2://` connection URL.
 *
 * The URL is handed to `mysql2`'s `createPool`, which parses host, port,
 * database (schema), user, and password from it. The pool is created lazily by
 * the Kysely driver on first use, so this function resolves even when the
 * engine is unreachable; it never throws for an unreachable target and never
 * logs or retains the URL or its credentials.
 *
 * `connectionLimit` is the validated pool bound (the accepted configuration's
 * `databasePoolMax`). It is applied at pool construction — the mysql2
 * `PoolOptions.connectionLimit` maximum — so the later caller-owned listener
 * cannot change it after the fact. When omitted, mysql2's own default applies
 * (the real-engine contract calls this boundary without a bound).
 */
export async function createDatabase(
  url: string,
  connectionLimit?: number,
): Promise<Database> {
  const poolOptions: { uri: string; connectionLimit?: number } = { uri: url };
  if (connectionLimit !== undefined) {
    poolOptions.connectionLimit = connectionLimit;
  }
  const dialect = new MysqlDialect({
    pool: createPool(poolOptions),
  });
  return new Kysely<Record<string, never>>({ dialect });
}

/**
 * End the underlying connection pool for a Kysely instance. Idempotent with
 * respect to the caller's teardown ordering: after this resolves, the instance
 * must not be used. No error detail is emitted.
 */
export async function closeDatabase(db: Database): Promise<void> {
  await db.destroy();
}

/**
 * T016 — The server-owned Fastify plugin / capability composition boundary.
 *
 * References: FR-001–FR-002, FR-006, FR-009, FR-013, FR-016;
 * data-model.md §Execution Context / §Safe Diagnostic / §Migration State /
 * §Component Readiness; plan.md §Runtime composition / §Configuration and
 * startup / §Persistence and migrations / §Testing and security evidence;
 * research.md Decisions 3, 6–9; accepted `apps/server/src/config.ts`
 * (`loadRuntimeConfiguration`), `apps/server/src/database.ts`
 * (`createDatabase` / `closeDatabase`), `apps/server/src/migrations.ts`
 * (read-only `getDatabaseReadiness`), and `apps/server/src/http.ts`
 * (`createApp`); `apps/server/package.json` root export.
 *
 * This module is the package's exported composition boundary
 * (`@songhealth/server` → `./src/bootstrap.ts`). It is the single place where
 * the validated configuration, the database capability, the read-only
 * readiness boundary, and the accepted operational routes are composed into
 * one in-process Fastify app for the later caller-owned listener. It never
 * binds a listener and never imports Public/Admin source or build output.
 *
 * Startup ordering (fail-before-work):
 *   1. Validate the complete environment plus the explicit operation target
 *      through the accepted `loadRuntimeConfiguration`. On rejection, return
 *      only the accepted closed SafeDiagnostic and create no database
 *      capability and accept no listener/child work.
 *   2. Only after acceptance, create the database capability via the accepted
 *      `createDatabase`, wire readiness to the accepted read-only
 *      `getDatabaseReadiness`, compose the accepted operational app via
 *      `createApp` (reusing the existing health routes, not duplicating them),
 *      and expose the typed app/capabilities plus bounded database teardown.
 *
 * Construction-time settings (T016-B01): the validated `databasePoolMax`,
 * `proxyPolicy`, and `logLevel` are applied when their database/Fastify
 * objects are constructed — not deferred to the later caller-owned listener.
 *   - `databasePoolMax` -> the mysql2 pool `connectionLimit` bound;
 *   - `proxyPolicy`     -> the Fastify `trustProxy` setting (`none` -> no
 *     trust; `one-hop` -> exactly one hop; never blanket `true`);
 *   - `logLevel`        -> the Fastify logger level.
 *
 * The Fastify/Pino logger is configured at construction to emit only the
 * least-necessary allowlisted diagnostic fields: no process/hostname base, and
 * no raw headers, query values, host/proxy/remote network metadata,
 * configuration, credentials, connection URLs, exception objects/stacks, or
 * other infrastructure detail. T038 — each application-log FAILURE record is
 * exactly one closed Safe Diagnostic on this composition's derived target
 * scope (`daily`/`verification`), never a log envelope or free-form message;
 * ordinary request logging keeps its accepted closed field set. The optional
 * `loggerStream` composition option directs the log output to a
 * caller-supplied destination (default: process stdout); it is an
 * observability seam only and changes no configuration, database, proxy, or
 * health behavior.
 *
 * Startup/readiness never applies migrations, never writes the marker, never
 * caches a self-derived ready value (readiness is re-observed through the
 * boundary on every call), and never logs or serializes raw environment or
 * database detail. Pending/unavailable migration state is never converted to
 * ready: that mapping is owned by the accepted `getDatabaseReadiness` boundary.
 */

import type { FastifyInstance } from "fastify";
import {
  loadRuntimeConfiguration,
  type RuntimeConfiguration,
  type SafeDiagnostic,
  type WorkBoundary,
} from "./config.js";
import { closeDatabase, createDatabase, type Database } from "./database.js";
import { getDatabaseReadiness, type DatabaseReadiness } from "./migrations.js";
import { createApp, type AppConstructionOptions } from "./http.js";

/**
 * The input to the composition boundary: the complete environment record and
 * the explicit local operation target. The environment is supplied by the
 * caller (never read from `process.env` here) so the boundary stays testable
 * and fail-closed.
 */
export interface ServerCompositionOptions {
  env: Record<string, string | undefined>;
  operationTarget: string;
  /**
   * Optional log output destination for the composed app's logger (an
   * observability seam). When omitted, the logger writes to the process
   * stdout. Supplying a stream changes only where log lines are written; it
   * never changes the validated level, the allowlisted field set, or any
   * configuration/database/proxy/health behavior.
   */
  loggerStream?: NodeJS.WritableStream;
}

/**
 * The composed, typed capabilities handed to the later caller-owned listener.
 * `app` is the in-process Fastify instance (no listener bound); the caller
 * owns `listen()` and the app's own lifecycle. `close` is the bounded,
 * idempotent database teardown the caller invokes on shutdown.
 */
export interface ServerCapabilities {
  app: FastifyInstance;
  configuration: RuntimeConfiguration;
  diagnosticScope: "daily" | "verification";
  database: Database;
  getDatabaseReadiness: () => Promise<DatabaseReadiness>;
  close: () => Promise<void>;
}

export type ServerCompositionResult =
  | { status: "rejected"; diagnostic: SafeDiagnostic }
  | { status: "ready"; capabilities: ServerCapabilities };

/**
 * Map the validated `proxyPolicy` to the Fastify `trustProxy` construction
 * setting (research.md Decision 6; plan.md §Configuration and startup).
 *   - `none`         -> `false` (Daily: trust no forwarded headers)
 *   - `one-hop`      -> `1`     (Verification: trust exactly one hop)
 *   - `hosting-defined` -> `false` (conservative: no trust is established
 *     until the real hosting chain is inspected; never blanket `true`)
 * Blanket `trustProxy: true` is never used.
 */
function trustProxyForProxyPolicy(
  proxyPolicy: RuntimeConfiguration["proxyPolicy"],
): boolean | number {
  switch (proxyPolicy) {
    case "none":
      return false;
    case "one-hop":
      return 1;
    case "hosting-defined":
      return false;
  }
}

/**
 * Compose the server-owned Fastify app and database capability from a
 * validated configuration. See the module header for the startup ordering and
 * the fail-before-work guarantee.
 */
export async function createServer(
  options: ServerCompositionOptions,
): Promise<ServerCompositionResult> {
  // Fail-before-work seam. The accepted loader never invokes these; bootstrap
  // owns starting work only after acceptance. Passing the seam keeps the
  // loader's contract explicit and lets the focused test prove no work started
  // on rejection.
  const work: WorkBoundary = {
    createDatabasePool: () => {},
    bindListener: () => {},
    startChildService: () => {},
  };

  const outcome = loadRuntimeConfiguration(
    options.env,
    options.operationTarget,
    work,
  );
  if (outcome.status === "rejected") {
    return { status: "rejected", diagnostic: outcome.diagnostic };
  }

  const { configuration, diagnosticScope } = outcome;

  // Only after acceptance: create the database capability, applying the
  // validated pool bound at construction. `createDatabase` builds a lazy pool
  // and never throws for an unreachable engine; it never logs or retains the
  // URL or its credentials.
  const database = await createDatabase(
    configuration.databaseUrl,
    configuration.databasePoolMax,
  );

  // Readiness is wired to the accepted read-only boundary and re-observed on
  // every call — never cached or self-derived here.
  const getDatabaseReadinessBoundary = () => getDatabaseReadiness(database);

  // Compose the accepted operational app, applying the validated construction-
  // time proxy-trust and log-level settings when the app is built. Liveness is
  // "the application is running": once composition succeeds the in-process app
  // is alive, so the probe is a no-op. It does not probe the database (that is
  // readiness).
  const appOptions: AppConstructionOptions = {
    trustProxy: trustProxyForProxyPolicy(configuration.proxyPolicy),
    // T038-B01 — the DERIVED output context of this composition's operation
    // target scopes the application-log failure diagnostics (`daily` for the
    // Development target, `verification` for the Verification target).
    diagnosticScope,
    logger: {
      level: configuration.logLevel,
      ...(options.loggerStream ? { stream: options.loggerStream } : {}),
    },
  };
  const app = await createApp(
    {
      getDatabaseReadiness: getDatabaseReadinessBoundary,
      livenessProbe: () => {},
    },
    appOptions,
  );

  // Bounded, idempotent database teardown for the caller-owned listener.
  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    await closeDatabase(database);
  };

  return {
    status: "ready",
    capabilities: {
      app,
      configuration,
      diagnosticScope,
      database,
      getDatabaseReadiness: getDatabaseReadinessBoundary,
      close,
    },
  };
}

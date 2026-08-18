/**
 * T015 — Operational HTTP composition: the in-process Fastify app exposing
 * exactly `GET /health/live` and `GET /health/ready`.
 *
 * References: FR-007, FR-009–FR-010, FR-013, FR-016;
 * contracts/foundation-http.openapi.yaml `/health/live`, `/health/ready`,
 * `Liveness`, `Readiness`, `ComponentReadiness`, `SafeOperationalFailure`,
 * `SafeDiagnostic`; data-model.md §Safe Diagnostic / §Migration State /
 * §Component Readiness; plan.md §Runtime composition / §Testing and security
 * evidence; research.md Decisions 8–9; accepted `apps/server/src/health.ts`
 * (schemas + pure mappers) and `apps/server/src/config.ts`
 * `SAFE_DIAGNOSTIC_SCHEMA`; accepted `apps/server/src/health.test.ts`.
 *
 * `createApp(deps)` builds the app and registers only the two operational
 * routes. It never calls `listen()` — binding a listener is the composition
 * entry's job, not the health boundary's. The database-readiness probe is
 * invoked exactly once per readiness request and is read-only: this module
 * never applies migrations, writes the marker, or otherwise mutates the
 * database.
 *
 * Status-specific closed response schemas are bound per route: `200`, `503`,
 * and `500`. Any liveness/readiness exception is mapped to a deterministic
 * closed `OPERATIONAL_FAILURE` Safe Diagnostic (allowlisted values only); no
 * raw exception, stack, SQL, credential, connection string, supplied value,
 * sentinel string, or host/path/infrastructure detail is ever serialized.
 */

import Fastify, { type FastifyInstance } from "fastify";
import { SAFE_DIAGNOSTIC_SCHEMA } from "./config.js";
import {
  type HealthDependencies,
  LIVENESS_SCHEMA,
  READINESS_NOT_READY_SCHEMA,
  READINESS_READY_SCHEMA,
  operationalFailureDiagnostic,
  toDatabaseComponent,
} from "./health.js";

/**
 * Build the operational Fastify app. Registers only the two health routes and
 * returns the in-process instance without binding a listener.
 */
export async function createApp(deps: HealthDependencies): Promise<FastifyInstance> {
  const app = Fastify();

  // Backstop: any error that escapes a route handler (including a probe
  // exception) becomes the closed 500 SafeDiagnostic. Never raw detail.
  app.setErrorHandler((_error, _request, reply) => {
    void _error;
    void _request;
    reply.code(500).send(operationalFailureDiagnostic("application"));
  });

  app.get(
    "/health/live",
    {
      schema: {
        response: {
          200: LIVENESS_SCHEMA,
          500: SAFE_DIAGNOSTIC_SCHEMA,
        },
      },
    },
    async (_request, reply) => {
      try {
        await deps.livenessProbe();
      } catch {
        return reply.code(500).send(operationalFailureDiagnostic("application"));
      }
      return { status: "alive" };
    },
  );

  app.get(
    "/health/ready",
    {
      schema: {
        response: {
          200: READINESS_READY_SCHEMA,
          503: READINESS_NOT_READY_SCHEMA,
          500: SAFE_DIAGNOSTIC_SCHEMA,
        },
      },
    },
    async (_request, reply) => {
      try {
        // Read-only observation, exactly once per request. Never mutates.
        const database = await deps.getDatabaseReadiness();
        const application = { name: "application", status: "ready" } as const;
        const components = [application, toDatabaseComponent(database)];
        if (database.status === "ready") {
          return { status: "ready", components };
        }
        return reply.code(503).send({ status: "not-ready", components });
      } catch {
        return reply.code(500).send(operationalFailureDiagnostic("application"));
      }
    },
  );

  return app;
}

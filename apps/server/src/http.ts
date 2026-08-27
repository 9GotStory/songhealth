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
 *
 * T038 — the application-log surface is closed the same way: alongside the
 * T016-B01 request/response serializers, the logger's `err` serializer maps
 * every error object the framework may log internally to that same
 * deterministic closed diagnostic, so the default error serializer's raw
 * `type`/`message`/`stack` never reaches the application log.
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
 * Construction-time Fastify settings applied when the app is built (never
 * deferred to the later caller-owned listener). The values come from the
 * validated configuration:
 *   - `trustProxy`: forwarded-header trust. `false` = none (Daily
 *     `proxyPolicy=none`); `1` = exactly one hop (Verification
 *     `proxyPolicy=one-hop`). Never blanket `true`.
 *   - `logger.level`: the validated application log level.
 *   - `logger.stream`: optional log output destination (defaults to the
 *     process stdout). When options are supplied the logger is always bound to
 *     the least-necessary allowlisted field set (T016-B01): no process/hostname
 *     base, and no raw headers, query values, host/proxy/remote network
 *     metadata, configuration, credentials, connection URLs, or exception
 *     detail are ever serialized.
 */
export interface AppConstructionOptions {
  trustProxy: boolean | number;
  logger: {
    level: string;
    stream?: NodeJS.WritableStream;
  };
}

/**
 * Least-necessary allowlisted request fields for the operational log surface
 * (T016-B01): only the HTTP method and the registered route path. The raw
 * request URL (and its query values), headers, host, and remote/proxy network
 * metadata are never serialized. The parameter is typed structurally (only the
 * fields read) so it stays assignable to Fastify's request-serializer contract.
 */
function safeRequestSerializer(req: {
  method: string;
  routeOptions?: { url?: string };
}): { method: string; url: string } {
  return { method: req.method, url: req.routeOptions?.url ?? "" };
}

/**
 * Least-necessary allowlisted response field for the operational log surface
 * (T016-B01): the closed status code. Typed structurally (only the field read)
 * so it stays assignable to Fastify's response-serializer contract.
 */
function safeResponseSerializer(res: { statusCode: number }): {
  statusCode: number;
} {
  return { statusCode: res.statusCode };
}

/**
 * Least-necessary allowlisted error serialization for the operational log
 * surface (T038). Fastify merges these serializers over its defaults, and its
 * default `err` serializer (Pino's) emits the raw error `type`, `message`, and
 * `stack` — the one remaining default serializer on this surface. Every
 * framework-internal error log (request/response stream errors, post-send
 * handler rejections, serializer failures) flows through it, so any logged
 * error object is mapped to the deterministic closed `OPERATIONAL_FAILURE`
 * diagnostic instead: allowlisted fields only, never raw exception, stack,
 * message, SQL, credential, connection string, supplied value, or
 * host/path/infrastructure detail. The allowlisted log-message strings
 * Fastify itself emits (`"request errored"`, `"incoming request"`, ...) are
 * static framework strings and are unaffected by this serializer.
 */
function safeErrorSerializer(
  _error: unknown,
): ReturnType<typeof operationalFailureDiagnostic> {
  void _error;
  return operationalFailureDiagnostic("application");
}

/**
 * Build the operational Fastify app. Registers only the two health routes and
 * returns the in-process instance without binding a listener. `options`
 * supplies the validated construction-time proxy-trust and log-level settings;
 * when omitted the accepted defaults apply (the T014/T015 health contract).
 */
export async function createApp(
  deps: HealthDependencies,
  options?: AppConstructionOptions,
): Promise<FastifyInstance> {
  // When construction options are supplied (the server-owned composition
  // boundary), configure the Fastify/Pino logger at construction so it emits
  // only the least-necessary allowlisted diagnostic fields (T016-B01): no
  // process/hostname base, and the request/response serializers are replaced
  // with closed field sets that never serialize raw headers, query values,
  // host/proxy/remote network metadata, configuration, credentials, connection
  // URLs, or exception detail. Logging stays enabled at the validated level.
  // The no-options path (the accepted T014/T015 health contract) is unchanged.
  const fastifyOptions = options
    ? {
        trustProxy: options.trustProxy,
        logger: {
          level: options.logger.level,
          // Empty base: no process/hostname/pid fields are bound to every log
          // line (T016-B01). Equivalent to `base: false` but type-compatible
          // with Fastify's logger-options contract.
          base: {},
          ...(options.logger.stream ? { stream: options.logger.stream } : {}),
          serializers: {
            req: safeRequestSerializer,
            res: safeResponseSerializer,
            // The closed diagnostic is intentionally NARROWER than Pino's
            // default error shape (`type`/`message`/`stack`), so the binding
            // is asserted to the logger-options serializer contract — the
            // same type-compatibility treatment the `base` option and the
            // request/response serializers above apply — while the runtime
            // value stays the closed allowlisted field set.
            err: safeErrorSerializer as unknown as (
              error: unknown,
            ) => {
              [key: string]: unknown;
              type: string;
              message: string;
              stack: string;
            },
          },
        }
      }
    : undefined;
  const app = Fastify(fastifyOptions);

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

/**
 * T048 — The thin single-listener Public/Admin release composition entry and
 * the explicit Fastify-to-React-Router raw request/reply handoff.
 *
 * References: FR-001, FR-009–FR-010, FR-016; User Story 2;
 * plan.md §Runtime composition / §Configuration and startup / §Testing and
 * security evidence; research.md Decision 3 (one release-shaped listener with
 * framework adapters at the edge; official React Router Node request-handler
 * semantics behind a small Fastify raw-response handoff);
 * contracts/foundation-http.openapi.yaml `/health/live`, `/health/ready`;
 * accepted `apps/web/server.test.ts` (the T040 adapter contract this module
 * completes); accepted `apps/server/src/http.ts` (`createApp` — the Server
 * Fastify boundary with the T016-B01 bounded log serializers, the T038 closed
 * application-failure log diagnostic, and the closed 500 response fallback)
 * and `apps/server/src/bootstrap.ts` (the caller-owned-listener composition
 * idiom and the `loggerStream` observability seam); accepted Public/Admin
 * build outputs and manifests (apps/web/build, apps/admin/dist),
 * `infra/Containerfile`, `infra/compose.verification.yaml`, and
 * `infra/nginx/nginx.conf` (the one internal `songhealth-app:3000` destination
 * this listener serves); Constitution Principles I, II, III, V.
 *
 * Composition order (plan.md §Runtime composition; research.md Decision 3):
 *
 *   1. the accepted Server boundary is registered FIRST — the composed app is
 *      born from the accepted `createApp` (or, in the release wiring, from the
 *      accepted `createServer` capabilities), so `/health/live` and
 *      `/health/ready` exist before any presentation route is added and can
 *      never be shadowed by the presentation fallback;
 *   2. the accepted Admin and Public release assets are served from the same
 *      single listener — `/admin/*` (with the CSR shell fallback) from the
 *      Admin Vite release output and the shared `/assets/*` prefix from both
 *      accepted release trees (the T044 Admin build addresses its hashed
 *      assets at the root `/assets/` prefix through Vite `base: "/"`);
 *   3. every REMAINING Public request is adapted to the React Router server
 *      build through the framework-agnostic request-handler seam.
 *
 * The explicit handoff: the fallback route calls `reply.hijack()` and then
 * owns the raw Fastify request/reply directly. Because a hijacked reply
 * bypasses Fastify's remaining normal reply processing, this module owns
 * everything after the handoff:
 *
 *   - REQUEST: a standard Web `Request` built from the raw request — method
 *     forwarded verbatim (GET and HEAD included), absolute URL preserving the
 *     original path and query, every repeated request-header field line
 *     appended in wire order from `rawHeaders`, no body for GET/HEAD, and the
 *     raw socket's premature close wired to the `Request` signal (abort
 *     propagation).
 *   - RESPONSE: the handler's `Response` is delivered verbatim onto the raw
 *     reply — status, headers (repeated `Set-Cookie` kept as distinct field
 *     lines), redirects, and streamed bodies written progressively without
 *     whole-body buffering — with the composition-owned security headers
 *     applied AFTER the handler's headers so they win over a same-named
 *     handler header exactly once. Only a THROWN handler error falls back to
 *     the adapter-owned response: the closed FR-007 `OPERATIONAL_FAILURE`
 *     SafeDiagnostic on the derived application scope, never raw detail.
 *   - LOGGING: the bounded closed surface of the accepted Server boundary is
 *     reused unchanged (the composed app is constructed by `createApp`, whose
 *     logger owns the allowlisted request/response fields and the closed
 *     failure rendering). Fastify observes the raw response finish of a
 *     hijacked reply, so its own completion record still carries the delivered
 *     status code through the accepted closed serializer; a thrown handler
 *     failure is logged by the adapter through the `err` key so the accepted
 *     closed destination renders exactly one closed application diagnostic
 *     record.
 *
 * The caller owns the listener: `createWebServer` returns the composed
 * Fastify instance without binding (the accepted bootstrap idiom), and the
 * release wiring in `createReleaseWebServer` composes production inputs the
 * same way for the later caller-owned `listen()`. The composition functions
 * never read `process.env`, never apply migrations, and never import Public
 * or Admin source — only the accepted build outputs' directory paths.
 *
 * T048-C01 — the release entry is also EMITTED and STARTED. The independent
 * Web production build compiles this module to a runnable single-file
 * listener (`apps/web/build/entry/server.js`; the workspace build script),
 * the clean release image contains and starts it (infra/Containerfile CMD),
 * and every Server-boundary import resolves runtime-safely: the accepted
 * Server workspace ships the same boundary as TypeScript sources (what the
 * workspace toolchain resolves) and as its independent production build
 * (what the image contains, exposed through `@songhealth/server` subpath
 * exports), so the loaders below prefer the source form and fall back to the
 * built package form. Because the emitted entry must compile without the
 * TypeScript sources present, it declares the accepted boundary signatures
 * structurally instead of importing their types, and every fallback
 * specifier is deliberately non-literal. When Node executes the emitted
 * entry directly, the module self-starts the release listener (main guard
 * below); under import — the accepted tests — it stays inert.
 */

import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createRequestHandler, type ServerBuild } from "react-router";

/**
 * The closed FR-007 diagnostic shape, as a structural view of the accepted
 * `SafeDiagnostic` (apps/server/src/config.ts). Structural — not imported —
 * so the emitted release entry typechecks and compiles without the Server
 * TypeScript sources; the composition only constructs and passes it through.
 */
interface SafeDiagnostic {
  reasonCode: string;
  diagnosticScope: string;
  component: string;
  remediation: string;
}

/**
 * Structural views of the accepted Server boundary signatures
 * (apps/server/src/http.ts `createApp`, bootstrap.ts `createServer`) — the
 * runtime-safe loading seam of T048-C01. They mirror the accepted parameter
 * and result shapes this composition relies on; the accepted modules
 * themselves remain the authority (and the test toolchain still exercises
 * the real modules at runtime).
 */
interface ServerHealthDependencies {
  getDatabaseReadiness: () => unknown;
  livenessProbe: () => void | Promise<void>;
}

interface ServerAppConstructionOptions {
  trustProxy: boolean | number;
  diagnosticScope: "daily" | "verification";
  logger: { level: string; stream?: NodeJS.WritableStream };
}

interface ServerHttpModule {
  createApp: (
    deps: ServerHealthDependencies,
    options?: ServerAppConstructionOptions,
  ) => Promise<FastifyInstance>;
}

/** The validated listen identity plus the derived scope, from the boundary. */
interface ServerCompositionConfiguration {
  host: string;
  port: number;
}

interface ServerCapabilities {
  app: FastifyInstance;
  diagnosticScope: "daily" | "verification";
  configuration: ServerCompositionConfiguration;
  close: () => Promise<void>;
}

interface ServerBootstrapModule {
  createServer: (options: {
    env: Record<string, string | undefined>;
    operationTarget: string;
    loggerStream?: NodeJS.WritableStream;
  }) => Promise<
    | { status: "rejected"; diagnostic: SafeDiagnostic }
    | { status: "ready"; capabilities: ServerCapabilities }
  >;
}

// Non-literal specifiers on purpose: the emitted single-file entry must not
// statically resolve (or compile against) the Server TypeScript sources, and
// the release image resolves the built package form instead.
const SERVER_HTTP_SOURCE_SPECIFIER = "../server/src/http.js";
const SERVER_HTTP_PACKAGE_SPECIFIER = "@songhealth/server/http";
const SERVER_BOOTSTRAP_SOURCE_SPECIFIER = "../server/src/bootstrap.js";
const SERVER_BOOTSTRAP_PACKAGE_SPECIFIER = "@songhealth/server/bootstrap";

let serverHttpModule: Promise<ServerHttpModule> | undefined;

/**
 * Load the accepted Server operational-app constructor (`createApp`):
 * TypeScript source first (the workspace toolchain form), then the built
 * package subpath (the clean release image form, where no TypeScript source
 * exists). Cached after the first successful load.
 */
function loadServerHttp(): Promise<ServerHttpModule> {
  serverHttpModule ??= import(SERVER_HTTP_SOURCE_SPECIFIER).catch(
    async (): Promise<ServerHttpModule> =>
      (await import(SERVER_HTTP_PACKAGE_SPECIFIER)) as ServerHttpModule,
  );
  return serverHttpModule;
}

let serverBootstrapModule: Promise<ServerBootstrapModule> | undefined;

/**
 * Load the accepted full Server composition boundary (`createServer`) with
 * the same source-first, built-package-fallback resolution as
 * `loadServerHttp`.
 */
function loadServerBootstrap(): Promise<ServerBootstrapModule> {
  serverBootstrapModule ??= import(SERVER_BOOTSTRAP_SOURCE_SPECIFIER).catch(
    async (): Promise<ServerBootstrapModule> =>
      (await import(SERVER_BOOTSTRAP_PACKAGE_SPECIFIER)) as ServerBootstrapModule,
  );
  return serverBootstrapModule;
}

/**
 * The React Router Framework Mode server-build request handler seam: exactly
 * the standard Web request-handler shape behind a custom JavaScript server
 * (research.md Decision 3). The pinned T040 contract drives `createWebServer`
 * with a handler of this shape; the release wiring supplies React Router's
 * official `createRequestHandler` over the accepted server build.
 */
export type ReactRouterRequestHandler = (request: Request) => Promise<Response>;

/** The derived application-log/output scope a composed app's failures carry. */
type DiagnosticScope = "daily" | "verification";

/**
 * The accepted release asset roots (T043/T044 build outputs). Both are
 * optional: the pinned T040 contract composes the presentation handoff
 * without them, and the release wiring supplies the accepted defaults.
 */
export interface ReleaseAssetRoots {
  /** The React Router client build output (serves `/assets/*`). */
  publicClientDir?: string;
  /** The Admin Vite CSR release output (serves `/admin/*`). */
  adminDistDir?: string;
}

/**
 * The input to the composition entry. `reactRouterHandler`, `securityHeaders`,
 * and `loggerStream` are the pinned T040 contract surface; the remaining
 * options are the T048-owned composition pieces the accepted tests
 * deliberately leave unpinned.
 */
export interface WebServerOptions {
  /** The React Router server-build request handler (the adapted seam). */
  reactRouterHandler: ReactRouterRequestHandler;
  /**
   * The composition-owned security response headers, applied on every
   * hijacked response surface (success, redirect, and adapter-owned error
   * fallback) after the handler's own headers, and on served release assets.
   * The header SET is runtime-owned configuration supplied by the caller
   * (Blueprint §168 direction).
   */
  securityHeaders?: Record<string, string>;
  /**
   * Optional log output destination for the composed app's logger (the
   * accepted observability seam). Defaults to the process stdout through the
   * accepted Server boundary construction.
   */
  loggerStream?: NodeJS.WritableStream;
  /**
   * An already-composed accepted Server boundary Fastify instance (the
   * `createServer` capabilities `app`), which this composition extends with
   * the presentation surface. When omitted, a presentation-only Server
   * boundary is composed through the accepted `createApp` with truthful
   * defaults: the in-process app is alive (no-op liveness, the accepted
   * bootstrap reasoning) and the database component reports `not-ready`
   * because no database was composed.
   */
  serverApp?: FastifyInstance;
  /**
   * The derived output context the adapter-owned failure surfaces carry
   * (`daily` for the Development target, `verification` for the Verification
   * target). Defaults to `daily`; the release wiring passes the composed
   * Server boundary's derived scope.
   */
  diagnosticScope?: DiagnosticScope;
  /** Accepted release asset roots to serve from the same listener. */
  assets?: ReleaseAssetRoots;
}

/** The input to the release wiring around `createWebServer`. */
export interface ReleaseWebServerOptions {
  /** The complete environment record (never read from `process.env` here). */
  env: Record<string, string | undefined>;
  /** The explicit local operation target (`development` | `verification`). */
  operationTarget: string;
  /** The React Router server build, or a resolver for it. */
  serverBuild?: ServerBuild | (() => ServerBuild | Promise<ServerBuild>);
  /** Overrides for the reviewed release security-header baseline below. */
  securityHeaders?: Record<string, string>;
  /** Optional log destination, passed through to the Server boundary. */
  loggerStream?: NodeJS.WritableStream;
  /** Asset root overrides (defaults: the accepted build output paths). */
  assets?: ReleaseAssetRoots;
}

export type ReleaseWebServerResult =
  | { status: "rejected"; diagnostic: SafeDiagnostic }
  | {
      status: "ready";
      app: FastifyInstance;
      /** Bounded teardown: closes the listener app, then the database. */
      close: () => Promise<void>;
      /** The validated listen identity the caller-owned listener binds. */
      configuration: ServerCompositionConfiguration;
    };

/**
 * The reviewed release security-header baseline (Blueprint §168 direction):
 * `X-Content-Type-Options` and `Referrer-Policy` are the two headers the
 * foundation can justify from its actual dependencies today — a same-origin
 * only, credential-free foundation has nothing to referral-leak and nothing
 * to MIME-sniff. A CSP must be constructed from the real application
 * dependencies and embeds (a Product-era task) and HSTS waits for HTTPS
 * readiness (hosting-dependent), so neither is invented here; the header set
 * stays caller-owned configuration that a later delivery can review and
 * extend without changing the mechanism this module proves.
 */
const RELEASE_SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

/**
 * The least-necessary content-type map for the accepted release asset
 * surfaces. Generated build output is limited to these extensions; an unknown
 * extension is served as application/octet-stream (no execution semantics are
 * implied by the composition).
 */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/** Resolve the least-necessary content type for a served asset path. */
function contentTypeFor(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  const extension = dot === -1 ? "" : filePath.slice(dot).toLowerCase();
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

/**
 * Resolve `relativePath` inside `rootDir`, refusing any escape from the root
 * (path traversal — Fastify has already URI-decoded the wildcard parameter).
 * Returns `null` when the resolved target is not a path strictly inside the
 * root; the callers then apply their fallback surface.
 */
function resolveInsideRoot(rootDir: string, relativePath: string): string | null {
  const root = resolve(rootDir);
  const target = resolve(root, relativePath);
  if (target === root || !target.startsWith(`${root}/`)) {
    return null;
  }
  return target;
}

/**
 * Resolve an existing regular file for `relativePath` inside `rootDir`, or
 * `null` when it is absent, not a file, or escapes the root. The asset routes
 * below then deliver the file through a NORMAL Fastify reply — these surfaces
 * are not hijacked, so the accepted Server boundary's own logging, error
 * handler, and closed diagnostics apply unchanged.
 */
async function resolveExistingFile(rootDir: string, relativePath: string): Promise<string | null> {
  const target = resolveInsideRoot(rootDir, relativePath);
  if (target === null) {
    return null;
  }
  try {
    if ((await stat(target)).isFile()) {
      return target;
    }
  } catch {
    // Absent target: the caller applies its fallback surface.
  }
  return null;
}

/**
 * The presentation fallback adapter: the explicit raw request/reply handoff.
 * Everything after `reply.hijack()` is owned here (see the module header).
 */
function registerReactRouterFallback(
  app: FastifyInstance,
  options: WebServerOptions & { securityHeaders: Record<string, string>; diagnosticScope: DiagnosticScope },
): void {
  const { reactRouterHandler, securityHeaders, diagnosticScope } = options;

  app.all("/*", async (request, reply) => {
    // The explicit handoff. From here Fastify's normal reply processing —
    // including its completion logging and its error handler — is bypassed,
    // so this handler owns the delivered response and the log records.
    reply.hijack();

    const rawRequest = request.raw;
    const rawReply = reply.raw;
    // A hijacked raw socket error (client abort mid-delivery, write after
    // close) must never become an unhandled 'error' event that could take
    // the listener down; the adapter consumes it and stops delivering.
    rawReply.on("error", () => {});

    // Abort propagation: the raw request's premature close (client abort)
    // aborts the standard Request signal handed to the handler. A normal
    // completion closes the request only after the response has ended, which
    // the writableEnded guard filters out.
    const abortController = new AbortController();
    const abortOnPrematureClose = (): void => {
      if (!rawReply.writableEnded) {
        abortController.abort();
      }
    };
    rawRequest.on("close", abortOnPrematureClose);

    try {
      // REQUEST OWNERSHIP — the standard Web Request built from the raw
      // request: original path and query on an absolute URL, every header
      // field line appended in wire order (repeated values preserved, joined
      // per the fetch specification), method verbatim, and no body for the
      // body-less methods (a stream body requires duplex half otherwise).
      const origin = `${request.protocol}://${request.headers.host ?? "localhost"}`;
      const url = new URL(rawRequest.url ?? "/", origin);
      const headers = new Headers();
      for (let index = 0; index < rawRequest.rawHeaders.length; index += 2) {
        headers.append(rawRequest.rawHeaders[index]!, rawRequest.rawHeaders[index + 1]!);
      }
      const method = rawRequest.method ?? "GET";
      const init: RequestInit & { duplex?: "half" } = {
        method,
        headers,
        signal: abortController.signal,
      };
      if (method !== "GET" && method !== "HEAD") {
        // The unconsumed raw request stream is the real request body. A Node
        // Readable is a valid undici stream body but not a DOM BodyInit, so
        // the assignment is asserted to the init contract while the runtime
        // value stays the raw stream (duplex half is required for streams).
        init.body = rawRequest as unknown as BodyInit;
        init.duplex = "half";
      }
      const webRequest = new Request(url, init);

      const response = await reactRouterHandler(webRequest);

      // RESPONSE OWNERSHIP — the handler's status and headers delivered
      // verbatim, then the composition-owned security headers applied after
      // them so a same-named handler header is replaced exactly once.
      rawReply.statusCode = response.status;
      for (const [name, value] of response.headers) {
        if (name === "set-cookie") {
          // Repeated Set-Cookie field lines must stay distinct; the combined
          // iteration view is lossy for them.
          continue;
        }
        rawReply.setHeader(name, value);
      }
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) {
        rawReply.setHeader("set-cookie", cookies);
      }
      for (const [name, value] of Object.entries(securityHeaders)) {
        rawReply.setHeader(name, value);
      }

      // STREAMING OWNERSHIP — the body is written progressively as it is
      // read, without whole-body buffering; HEAD delivers status and headers
      // only (a raw HEAD body write would surface on the wire).
      if (response.body === null || method === "HEAD") {
        rawReply.end();
      } else {
        const reader = response.body.getReader();
        try {
          for (;;) {
            if (rawReply.destroyed) {
              await reader.cancel();
              break;
            }
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            if (value && !rawReply.write(value)) {
              await new Promise<void>((resolveWrite) => {
                rawReply.once("drain", resolveWrite);
                rawReply.once("close", resolveWrite);
                rawReply.once("error", resolveWrite);
              });
            }
          }
          if (!rawReply.destroyed) {
            rawReply.end();
          }
        } catch {
          // The delivery surface is gone (client abort, socket failure); the
          // body stream is finished or will be collected. Nothing raw is
          // exposed and the listener keeps serving.
        }
      }
      // The bounded completion record (delivered status code through the
      // accepted closed response field set) is Fastify's own for the hijacked
      // reply: it observes the raw response finish and applies the same
      // allowlisted serializer, so the adapter adds no duplicate record.
    } catch (error) {
      // A THROWN handler error is the only adapter-owned response: the closed
      // FR-007 OPERATIONAL_FAILURE SafeDiagnostic on the derived application
      // scope — allowlisted fields only, no raw error, stack, or message.
      const diagnostic = {
        reasonCode: "OPERATIONAL_FAILURE",
        diagnosticScope,
        component: "application",
        remediation: "RETRY_SAFE_OPERATION",
      } as const;
      // Logged through the accepted closed surface: the `err` key is mapped
      // by the Server boundary's error serializer (which discards the raw
      // error entirely) and rendered by its closed destination as exactly one
      // closed application diagnostic record.
      request.log.error({ err: error });
      rawReply.statusCode = 500;
      rawReply.setHeader("content-type", "application/json; charset=utf-8");
      for (const [name, value] of Object.entries(securityHeaders)) {
        rawReply.setHeader(name, value);
      }
      rawReply.end(JSON.stringify(diagnostic));
    } finally {
      rawRequest.removeListener("close", abortOnPrematureClose);
    }
  });
}

/**
 * Compose the thin single-listener presentation entry. The Server boundary is
 * registered first (the composed app is born from it), the accepted release
 * assets are served when roots are supplied, and every remaining request is
 * adapted to the React Router handler through the explicit handoff. The
 * composed app is returned WITHOUT a bound listener — the caller owns
 * `listen()` and the app lifecycle (the accepted bootstrap idiom).
 */
export async function createWebServer(options: WebServerOptions): Promise<FastifyInstance> {
  const securityHeaders = options.securityHeaders ?? {};
  const diagnosticScope = options.diagnosticScope ?? "daily";

  // The accepted Server Fastify boundary, registered FIRST. With no supplied
  // boundary the presentation-only default is composed through the accepted
  // `createApp`: the operational routes plus the bounded closed log surface
  // with truthful defaults (in-process liveness, database not-ready because
  // no database was composed, no proxy trust established).
  const { createApp } = await loadServerHttp();
  const app =
    options.serverApp ??
    (await createApp(
      {
        livenessProbe: () => {},
        getDatabaseReadiness: () => ({
          component: "database",
          status: "not-ready",
          diagnostic: {
            reasonCode: "DATABASE_UNAVAILABLE",
            diagnosticScope: "foundation",
            component: "database",
            remediation: "RETRY_SAFE_OPERATION",
          },
          observedAt: new Date().toISOString(),
        }),
      },
      {
        trustProxy: false,
        diagnosticScope: "daily",
        logger: {
          level: "info",
          ...(options.loggerStream ? { stream: options.loggerStream } : {}),
        },
      },
    ));

  // Pass request bodies through unconsumed so the adapter can hand the React
  // Router handler the real request stream (official Node request-handler
  // semantics). GET/HEAD carry no body and never reach a content parser.
  app.addContentTypeParser(
    "*",
    (_request, payload, done) => {
      done(null, payload);
    },
  );

  // The composition-owned security headers on every NON-hijacked response
  // surface of the composed app — the Server boundary routes, the release
  // assets, and the framework's own error/redirect surfaces. Hijacked replies
  // (the presentation fallback below) bypass this hook, so the adapter applies
  // the same header set itself at the raw handoff.
  app.addHook("onSend", async (_request, reply, payload) => {
    for (const [name, value] of Object.entries(securityHeaders)) {
      reply.header(name, value);
    }
    return payload;
  });

  // The accepted release assets, served from the same single listener and
  // ordered before the presentation fallback. The Admin surface serves the
  // CSR shell for `/admin` and `/admin/` and falls back to the shell for a
  // non-file path; restrictive Admin caching follows the authenticated Admin
  // delivery (Blueprint §168 — no caching policy is invented here). Each
  // async handler RETURNS its reply: delivering a stream payload from a void
  // `reply.send(...)` call inside an async handler races Fastify's reply
  // completion and truncates the body, while the returned-reply form is the
  // supported async-handler contract.
  const assets = options.assets ?? {};
  if (assets.adminDistDir !== undefined) {
    const adminDistDir = assets.adminDistDir;
    const serveAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
      const relative = (request.params as Record<string, string>)["*"] ?? "";
      const file =
        (await resolveExistingFile(adminDistDir, relative)) ??
        (await resolveExistingFile(adminDistDir, "index.html"));
      if (file === null) {
        // The Admin release output is absent: an empty, non-reflecting 404.
        return reply.code(404).send();
      }
      return reply.header("content-type", contentTypeFor(file)).send(createReadStream(file));
    };
    app.get("/admin", serveAdmin);
    app.get("/admin/*", serveAdmin);
  }
  if (assets.publicClientDir !== undefined) {
    // Both accepted release trees address their hashed assets under the SAME
    // `/assets/` URL prefix: the T044 Admin CSR build emits `base: "/"`
    // references (`/assets/index-*.js`) and the React Router client build
    // references `/assets/entry.client-*.js`. The single listener therefore
    // resolves the prefix against the Public client tree first, then the
    // Admin release tree (the emitted names are content-hashed and disjoint
    // in this Delivery; the second lookup only closes the Admin shell's
    // references).
    const publicAssetsDir = join(assets.publicClientDir, "assets");
    const adminAssetsDir = assets.adminDistDir;
    app.get("/assets/*", async (request, reply) => {
      const relative = (request.params as Record<string, string>)["*"] ?? "";
      const file =
        (await resolveExistingFile(publicAssetsDir, relative)) ??
        (adminAssetsDir === undefined
          ? null
          : await resolveExistingFile(adminAssetsDir, join("assets", relative)));
      if (file === null) {
        // No release asset at this path: an empty, non-reflecting 404.
        return reply.code(404).send();
      }
      return reply.header("content-type", contentTypeFor(file)).send(createReadStream(file));
    });
  }

  // The presentation fallback, registered LAST: Server routes and release
  // assets precede it, and it owns every remaining request.
  registerReactRouterFallback(app, { ...options, securityHeaders, diagnosticScope });

  return app;
}

/** The accepted React Router server build location for the release wiring. */
/**
 * The accepted React Router server build location, relative to this module:
 * one form for the TypeScript source (apps/web/server.ts →
 * apps/web/build/server/index.js) and one for the emitted release entry
 * (apps/web/build/entry/server.js → apps/web/build/server/index.js). The
 * first candidate that loads wins, so both forms compose the same accepted
 * build.
 */
const REACT_ROUTER_SERVER_BUILD_URLS = [
  new URL("./build/server/index.js", import.meta.url),
  new URL("../server/index.js", import.meta.url),
];

async function loadReactRouterServerBuild(): Promise<ServerBuild> {
  let lastError: unknown;
  for (const candidate of REACT_ROUTER_SERVER_BUILD_URLS) {
    try {
      return (await import(candidate.href)) as unknown as ServerBuild;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** The first directory in `candidates` that exists on disk, else `undefined`. */
function firstExistingDirectory(candidates: Array<string | undefined>): string | undefined {
  return candidates.find((candidate) => candidate !== undefined && existsSync(candidate));
}

/**
 * Compose the release-shaped web server from real production inputs: the
 * accepted full Server boundary (validated configuration and database
 * capability, rejected up front with its closed diagnostic), React Router's
 * official request handler over the accepted server build, the reviewed
 * release security-header baseline, and the accepted release asset roots.
 * The composed app is again returned without a bound listener; `close`
 * performs the bounded teardown (listener app, then database).
 */
export async function createReleaseWebServer(
  options: ReleaseWebServerOptions,
): Promise<ReleaseWebServerResult> {
  const { createServer: composeServerBoundary } = await loadServerBootstrap();
  const boundary = await composeServerBoundary({
    env: options.env,
    operationTarget: options.operationTarget,
    ...(options.loggerStream ? { loggerStream: options.loggerStream } : {}),
  });
  if (boundary.status === "rejected") {
    return { status: "rejected", diagnostic: boundary.diagnostic };
  }

  const { capabilities } = boundary;
  const serverBuild = options.serverBuild ?? (await loadReactRouterServerBuild());
  const handler = createRequestHandler(serverBuild, "production");

  // The accepted release asset roots default to this module's location,
  // which differs between the TypeScript source (apps/web/) and the emitted
  // release entry (apps/web/build/entry/) — the first existing candidate
  // wins, so both forms resolve the same accepted outputs.
  const moduleDirectory = fileURLToPath(new URL(".", import.meta.url));
  const app = await createWebServer({
    reactRouterHandler: handler,
    securityHeaders: options.securityHeaders ?? RELEASE_SECURITY_HEADERS,
    ...(options.loggerStream ? { loggerStream: options.loggerStream } : {}),
    serverApp: capabilities.app,
    diagnosticScope: capabilities.diagnosticScope,
    assets: {
      publicClientDir:
        options.assets?.publicClientDir ??
        firstExistingDirectory([
          join(moduleDirectory, "build", "client"),
          join(moduleDirectory, "..", "..", "build", "client"),
        ]),
      adminDistDir:
        options.assets?.adminDistDir ??
        firstExistingDirectory([
          resolve(moduleDirectory, "..", "admin", "dist"),
          resolve(moduleDirectory, "..", "..", "..", "admin", "dist"),
        ]),
    },
  });

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) {
      return;
    }
    closed = true;
    await app.close();
    await capabilities.close();
  };

  return { status: "ready", app, close, configuration: capabilities.configuration };
}

// ---------------------------------------------------------------------------
// Release-entry startup (T048-C01).
// ---------------------------------------------------------------------------

/**
 * Derive the local operation target from the validated `RUNTIME_PROFILE`
 * environment identity (plan.md §Configuration and startup: the Development
 * target maps to the `daily` profile, the Verification target to
 * `verification`). Any other profile passes through untouched so the accepted
 * Server configuration boundary owns its closed rejection — this is a
 * selector over an accepted identity, never a second validator.
 */
function operationTargetForRuntimeProfile(runtimeProfile: string | undefined): string {
  if (runtimeProfile === "daily") {
    return "development";
  }
  if (runtimeProfile === "verification") {
    return "verification";
  }
  return runtimeProfile ?? "";
}

/**
 * Start the release listener when Node executes the emitted entry directly:
 * compose from the complete environment, bind the validated host and port
 * through the caller-owned listener this entry itself owns here, and close
 * boundedly on termination signals. A rejected configuration surfaces its
 * closed SafeDiagnostic on stderr and exits non-zero — no listener, pool, or
 * child work is started (the accepted fail-before-work ordering).
 */
async function startReleaseListener(): Promise<void> {
  const result = await createReleaseWebServer({
    env: process.env,
    operationTarget: operationTargetForRuntimeProfile(process.env.RUNTIME_PROFILE),
  });
  if (result.status === "rejected") {
    process.stderr.write(`${JSON.stringify(result.diagnostic)}\n`);
    process.exitCode = 1;
    return;
  }
  const { app, close, configuration } = result;
  await app.listen({ host: configuration.host, port: configuration.port });
  const shutdown = (): void => {
    void close().finally(() => {
      process.exit(0);
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

// The main guard: inert under import (the accepted T040 suite imports this
// module), active only when Node executes the emitted entry file itself.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startReleaseListener();
}

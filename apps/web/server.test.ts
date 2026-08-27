/**
 * T040 — Failing Fastify-to-React-Router adapter contract tests.
 *
 * References: FR-009–FR-010, SC-003; User Story 2;
 * plan.md §Runtime composition / §Testing and security evidence;
 * research.md Decision 3 (one release-shaped listener, official React Router
 * Node request listener, small Fastify raw-response handoff);
 * tasks.md T040 (this contract) and T048 (the implementing task);
 * accepted `apps/server/src/http.ts` (T015/T016-B01 bounded request/response
 * log serializers; T038 closed application-failure log diagnostic) and
 * `apps/server/src/bootstrap.ts` (T016 loggerStream observability seam);
 * accepted expected-red precedent `apps/web/app/routes/foundation.test.tsx`
 * (T017); Constitution Principles I, II, III, V (traceability, smallest
 * correct change, proportionate verification).
 *
 * This is the tests-first contract for the planned thin presentation
 * composition entry `apps/web/server.ts` (implemented by T048). Per plan.md
 * §Runtime composition, that entry registers the Server boundary first,
 * serves Admin and Public build assets, and then adapts the REMAINING Public
 * requests to the React Router server build: after an explicit handoff
 * (`reply.hijack()`), the adapter uses React Router's official Node request
 * listener semantics against Fastify's raw request/reply. Because a hijacked
 * reply bypasses Fastify's remaining normal reply processing, these tests pin
 * the ownership questions at that explicit handoff:
 *
 *   - REQUEST OWNERSHIP — the adapter hands the React Router handler a
 *     standard Web `Request` built from the raw Fastify request: method
 *     forwarded verbatim (GET and HEAD), absolute URL with the original path
 *     and query, every repeated request-header value preserved in order, and
 *     no request body for body-less methods.
 *   - RESPONSE OWNERSHIP — a successful handler `Response` owns the delivered
 *     status, headers, and body: they pass through the hijacked raw reply
 *     verbatim (including redirects and repeated response headers such as
 *     `Set-Cookie`), with the composition-owned security headers ADDED, never
 *     replacing the handler's own headers. Only a THROWN handler error falls
 *     back to the adapter-owned response: the closed FR-007 SafeDiagnostic
 *     (FR-010 unambiguous failure identification) with no raw detail.
 *   - STREAMING OWNERSHIP — a streamed handler body is delivered as a stream
 *     through the hijacked reply: ordered intact delivery, and progressive
 *     delivery to the client without whole-body buffering.
 *   - ABORT OWNERSHIP — a client abort of an in-flight adapted response is
 *     propagated to the handler's `Request` signal, and the listener keeps
 *     serving afterwards.
 *   - SECURITY-HEADER OWNERSHIP — the composition-supplied security headers
 *     are applied on every hijacked response surface (success, redirect, and
 *     the adapter-owned error fallback), exactly once, and win over a same-
 *     named handler header. The header SET itself is runtime-owned
 *     configuration supplied by the caller (Blueprint §168 direction); these
 *     tests inject a representative pair and prove the mechanism, not a
 *     baseline list.
 *   - LOGGING OWNERSHIP — adapted requests are logged through the accepted
 *     bounded closed surface (T016-B01): a completion record carries the
 *     delivered status code, and no raw URL/query, host, forwarded, remote,
 *     or header detail is ever serialized; a thrown handler failure is logged
 *     as exactly one closed application `OPERATIONAL_FAILURE` SafeDiagnostic
 *     record (T038) — never a raw error, stack, or message.
 *
 * Deliberately NOT pinned here (owned by the T048 composition review against
 * the plan): how the Server boundary is registered or ordered, Admin/Public
 * static asset serving, listener binding/lifecycle, configuration loading,
 * and the exact production security-header baseline.
 *
 * The contract surface pinned for T048 is:
 *
 *   createWebServer({
 *     reactRouterHandler,   // (request: Request) => Promise<Response>
 *     securityHeaders?,     // Record<string, string> — composition-owned
 *     loggerStream?,        // NodeJS.WritableStream — observability seam
 *   }) => Promise<FastifyInstance-ish composed app>
 *
 * The handler seam is framework-agnostic — exactly the request-handler shape
 * research.md Decision 3 describes for the React Router Framework Mode server
 * build behind a custom JavaScript server — so the official React Router Node
 * listener mechanics remain T048's to choose. The composed app is returned
 * without a bound listener (the accepted `apps/server/src/bootstrap.ts`
 * caller-owned-listener idiom); these tests drive it with Fastify `inject()`
 * where an in-process request is sufficient, and with a real loopback
 * listener where only a real socket observes streaming progress and client
 * aborts (`fetch`), and repeated request-header field lines (a raw socket —
 * a fetch/Headers client normalizes repeated values into one joined field
 * line before transport).
 *
 * EXPECTED RED: the only reason this suite fails is that the T048
 * `./server.js` module does not exist yet. The failure is a module-resolution
 * error for that one intentionally absent module — not a test-syntax,
 * discovery, fixture, dependency, or forced-failure error.
 */

import { afterEach, describe, expect, it } from "vitest";
import { Writable } from "node:stream";
import { createConnection } from "node:net";

// The planned T048 adapter composition module, imported as a NAMESPACE so the
// test can observe the module boundary itself (its named exports) in addition
// to the composed app it returns. This is the single, intentional dependency
// on the not-yet-implemented module.
import * as WebServerModule from "./server.js";

// ---------------------------------------------------------------------------
// Contract types (structural, derived from the planned module).
// ---------------------------------------------------------------------------

/**
 * The React Router Framework Mode server-build request handler seam: exactly
 * the standard Web request-handler shape behind a custom server (research.md
 * Decision 3). The adapter hands it one standard `Request` and expects one
 * standard `Response`.
 */
type ReactRouterRequestHandler = (request: Request) => Promise<Response>;

/**
 * The composed app produced by the planned `createWebServer`. Derived from
 * the module's own return type so the tests observe exactly what T048 ships
 * (today the absent module makes this `any`; after T048 it is the composed
 * Fastify instance). The tests only use the caller-owned listener surface:
 * `inject`, `listen`, `server.address`, `close`.
 */
type ComposedWebApp = Awaited<ReturnType<typeof WebServerModule.createWebServer>>;

// ---------------------------------------------------------------------------
// Fixtures — bounded, distinctive, non-Product sentinel markers.
// ---------------------------------------------------------------------------

/**
 * Representative composition-owned security headers injected through the
 * `securityHeaders` seam (names taken from the Blueprint §168 baseline
 * DIRECTION; the runtime baseline set stays caller-owned configuration).
 */
const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

/** Sentinel values that must never reach the emitted log surface. */
const SENTINEL_QUERY = "T040-QUERY-SENTINEL";
const SENTINEL_PATH = "T040-PATH-SENTINEL";
const SENTINEL_HEADER = "T040-HEADER-SENTINEL";
const SENTINEL_HOST = "T040-HOST-SENTINEL";
const SENTINEL_XFF = "T040-XFF-SENTINEL";
const SENTINEL_REMOTE = "203.0.113.9"; // TEST-NET-3, like the accepted T016 probe
const SENTINEL_ERROR = "T040-ERROR-SENTINEL";
const SENTINEL_STACK = "T040-STACK-SENTINEL";

/** Distinctive response bodies. */
const GET_BODY = "t040-public-get-body";
const RR_OWNED_ERROR_BODY = "t040-route-owned-failure-body";

const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// Harness — log capture, composed-app lifecycle, recording handler.
// ---------------------------------------------------------------------------

/**
 * A log-output capture destination (the accepted T016-B01 harness idiom,
 * bound through the composition's `loggerStream` seam). A `Writable` that
 * records every chunk the logger writes so a test can assert on the exact
 * emitted log surface.
 */
function createLogCapture(): { stream: NodeJS.WritableStream; text: () => string } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return { stream, text: () => chunks.join("") };
}

/** Composed apps opened by a test; closed in `afterEach` so no test leaks a listener. */
const openApps: Array<{ close: () => Promise<unknown> }> = [];

afterEach(async () => {
  for (const app of openApps.splice(0)) {
    await app.close();
  }
});

/**
 * Compose the adapter app under test from the planned T048 module. Every
 * composition passes the representative security-header pair (the ownership
 * surface under test) and, when given, the log-capture destination.
 */
async function composeAdapterApp(options: {
  reactRouterHandler: ReactRouterRequestHandler;
  loggerStream?: NodeJS.WritableStream;
}): Promise<ComposedWebApp> {
  const app = await WebServerModule.createWebServer({
    reactRouterHandler: options.reactRouterHandler,
    securityHeaders: SECURITY_HEADERS,
    loggerStream: options.loggerStream,
  });
  openApps.push(app);
  return app;
}

/** One recorded observation of the handler side of the explicit handoff. */
interface RecordedRequest {
  request: Request;
  url: URL;
}

/**
 * Wrap a handler so every call records the exact `Request` it received. The
 * recording is made INSIDE the handler so the test observes precisely what
 * the adapter handed React Router (not a reconstruction of it).
 */
function recordRequests(
  handler: ReactRouterRequestHandler,
): { handler: ReactRouterRequestHandler; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const wrapped: ReactRouterRequestHandler = async (request) => {
    requests.push({ request, url: new URL(request.url) });
    return handler(request);
  };
  return { handler: wrapped, requests };
}

/** A handler that answers every request with one fixed successful Response. */
function okHandler(body: string, headers?: Record<string, string>): ReactRouterRequestHandler {
  return async () =>
    new Response(body, {
      status: 200,
      headers: { "content-type": "text/plain", ...headers },
    });
}

/**
 * Assert every composition-owned security header is present with its exact
 * value. Typed loosely (a header-name → value lookup) so it accepts the
 * header maps of both the injected and the real-listener response surfaces.
 */
function expectSecurityHeaders(headers: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(headers[name]).toBe(value);
  }
}

/** Bound a promise with a clear failure instead of an opaque test timeout. */
function withDeadline<T>(promise: Promise<T>, failure: string, ms = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error(failure)), ms);
    }),
  ]);
}

/** Start a real loopback listener for the socket-observable contracts. */
async function listenOnLoopback(app: ComposedWebApp): Promise<URL> {
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  if (typeof address !== "object" || address === null) {
    throw new Error("expected the composed app to expose a bound TCP address");
  }
  return new URL(`http://127.0.0.1:${address.port}/`);
}

/**
 * Issue one HTTP/1.1 GET over a raw socket with the given literal header
 * field lines, and resolve with the response's status line. No client
 * library sits between the test and the wire, so the field lines reach the
 * adapter exactly as written — required for the repeated request-header
 * contract, because a fetch/Headers client normalizes repeated values into
 * one joined field line before transport.
 */
function rawHttpGet(url: URL, headerLines: string[]): Promise<{ statusLine: string }> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(
      { host: url.hostname, port: Number(url.port) },
      () => {
        socket.write(
          `GET ${url.pathname} HTTP/1.1\r\n` +
            `Host: ${url.host}\r\n` +
            `${headerLines.join("\r\n")}\r\n` +
            `Connection: close\r\n` +
            `\r\n`,
        );
      },
    );
    socket.setEncoding("utf8");
    let response = "";
    socket.on("data", (chunk: string) => {
      response += chunk;
    });
    socket.on("error", reject);
    socket.on("close", () => {
      resolve({ statusLine: response.split("\r\n", 1)[0] ?? "" });
    });
  });
}

// ---------------------------------------------------------------------------
// Module boundary.
// ---------------------------------------------------------------------------

describe("createWebServer — module boundary", () => {
  it("exports the planned adapter composition surface as a function", () => {
    expect(typeof WebServerModule.createWebServer).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// REQUEST OWNERSHIP — GET.
// ---------------------------------------------------------------------------

describe("createWebServer — GET through the explicit handoff", () => {
  it("hands the handler a standard Request (method, path, query, headers, no body) and delivers its Response", async () => {
    const recording = recordRequests(
      okHandler(GET_BODY, { "x-t040-rr-owned": "delivered" }),
    );
    const app = await composeAdapterApp({ reactRouterHandler: recording.handler });

    const response = await app.inject({
      method: "GET",
      url: `/public-probe?leak=${SENTINEL_QUERY}&carry=1`,
      headers: { "x-t040-probe": "single" },
    });

    // The handler was called exactly once, with a standard Web Request built
    // from the raw Fastify request: GET forwarded verbatim, the original
    // absolute URL (path AND query), and the request header preserved.
    expect(recording.requests).toHaveLength(1);
    const { request, url } = recording.requests[0]!;
    expect(request.method).toBe("GET");
    expect(url.pathname).toBe("/public-probe");
    expect(url.search).toBe(`?leak=${SENTINEL_QUERY}&carry=1`);
    expect(request.headers.get("x-t040-probe")).toBe("single");
    // A body-less method must hand the handler a body-less Request.
    expect(request.body).toBeNull();

    // RESPONSE OWNERSHIP: the handler's status, headers, and body are
    // delivered verbatim through the hijacked reply...
    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe(GET_BODY);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.headers["x-t040-rr-owned"]).toBe("delivered");
    // ...with the composition-owned security headers ADDED.
    expectSecurityHeaders(response.headers);
  });
});

// ---------------------------------------------------------------------------
// REQUEST OWNERSHIP — HEAD.
// ---------------------------------------------------------------------------

describe("createWebServer — HEAD through the explicit handoff", () => {
  it("forwards HEAD verbatim and delivers status and headers without a body", async () => {
    const recording = recordRequests(
      okHandler("a-head-response-body-must-not-be-delivered"),
    );
    const app = await composeAdapterApp({ reactRouterHandler: recording.handler });

    const response = await app.inject({ method: "HEAD", url: "/head-probe" });

    // The method reaching React Router is HEAD itself — not a rewritten GET.
    expect(recording.requests).toHaveLength(1);
    expect(recording.requests[0]!.request.method).toBe("HEAD");
    expect(recording.requests[0]!.request.body).toBeNull();

    // Status and headers are delivered; the handler's body is not. (A raw
    // write of a HEAD body would surface through `inject`, so an empty
    // payload proves the adapter suppresses it rather than the transport.)
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.payload).toBe("");
    expectSecurityHeaders(response.headers);
  });
});

// ---------------------------------------------------------------------------
// STREAMING OWNERSHIP.
// ---------------------------------------------------------------------------

describe("createWebServer — streaming handler bodies", () => {
  it("delivers an ordered multi-chunk stream body intact through the hijacked reply", async () => {
    const chunks = ["t040-chunk-one|", "t040-chunk-two|", "t040-chunk-three"];
    let next = 0;
    const handler: ReactRouterRequestHandler = async () => {
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (next < chunks.length) {
            controller.enqueue(encoder.encode(chunks[next]!));
            next += 1;
          } else {
            controller.close();
          }
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    };
    const app = await composeAdapterApp({ reactRouterHandler: handler });

    const response = await app.inject({ method: "GET", url: "/streamed" });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe(chunks.join(""));
  });

  it("streams progressively: the first chunk reaches the client before the body finishes", async () => {
    let deliveredFirst = false;
    let releaseSecondChunk: () => void = () => {};
    const secondChunkGate = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve;
    });
    const handler: ReactRouterRequestHandler = async () => {
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (!deliveredFirst) {
            deliveredFirst = true;
            controller.enqueue(encoder.encode("t040-part-one-"));
            return;
          }
          // Hold the response open until the client has observed part one.
          await secondChunkGate;
          controller.enqueue(encoder.encode("t040-part-two"));
          controller.close();
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    };
    const app = await composeAdapterApp({ reactRouterHandler: handler });
    const baseUrl = await listenOnLoopback(app);

    const response = await fetch(new URL("/progressive", baseUrl));
    expect(response.status).toBe(200);
    const reader = response.body!.getReader();

    // The first chunk is received while the response body is still open —
    // this read cannot resolve if the adapter buffers the whole body before
    // replying.
    const first = await withDeadline(
      reader.read(),
      "no chunk reached the client before the response body finished",
    );
    expect(new TextDecoder().decode(first.value)).toBe("t040-part-one-");

    releaseSecondChunk();
    let received = "t040-part-one-";
    for (;;) {
      const { done, value } = await withDeadline(
        reader.read(),
        "the streamed response body never finished",
      );
      if (done) break;
      received += new TextDecoder().decode(value);
    }
    expect(received).toBe("t040-part-one-t040-part-two");
  });
});

// ---------------------------------------------------------------------------
// RESPONSE OWNERSHIP — redirects.
// ---------------------------------------------------------------------------

describe("createWebServer — redirects", () => {
  it("delivers the handler's redirect status and Location with the security headers applied", async () => {
    const handler: ReactRouterRequestHandler = async () =>
      new Response(null, {
        status: 302,
        headers: { location: "/t040-redirect-target" },
      });
    const app = await composeAdapterApp({ reactRouterHandler: handler });

    const response = await app.inject({ method: "GET", url: "/redirecting" });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/t040-redirect-target");
    expect(response.payload).toBe("");
    expectSecurityHeaders(response.headers);
  });
});

// ---------------------------------------------------------------------------
// RESPONSE OWNERSHIP — errors.
// ---------------------------------------------------------------------------

describe("createWebServer — handler errors", () => {
  it("maps a thrown handler error to the closed SafeDiagnostic 500 with no raw detail", async () => {
    const handler: ReactRouterRequestHandler = async () => {
      const error = new Error(`${SENTINEL_ERROR} raw adapter failure`);
      error.stack = `${SENTINEL_STACK}\n    at rawInternalFrame (internal/database/detail.ts:1:1)`;
      throw error;
    };
    const app = await composeAdapterApp({ reactRouterHandler: handler });

    const response = await app.inject({ method: "GET", url: "/throwing" });

    // FR-010: the failure is unambiguous and identifies the failed contract
    // through the closed FR-007 diagnostic — exactly the accepted closed
    // application shape (T038/T015), no additional properties.
    expect(response.statusCode).toBe(500);
    expect(response.headers["content-type"]).toContain("application/json");
    const diagnostic = JSON.parse(response.payload) as Record<string, unknown>;
    expect(Object.keys(diagnostic).sort()).toEqual([
      "component",
      "diagnosticScope",
      "reasonCode",
      "remediation",
    ]);
    expect(diagnostic.reasonCode).toBe("OPERATIONAL_FAILURE");
    expect(diagnostic.component).toBe("application");
    expect(diagnostic.remediation).toBe("RETRY_SAFE_OPERATION");
    // The derived application scope (T038-B01): daily or verification —
    // never the cross-target foundation scope.
    expect(["daily", "verification"]).toContain(diagnostic.diagnosticScope);
    // No raw error detail on the response surface.
    expect(response.payload).not.toContain(SENTINEL_ERROR);
    expect(response.payload).not.toContain(SENTINEL_STACK);
    // The adapter-owned fallback still carries the security headers.
    expectSecurityHeaders(response.headers);
  });

  it("delivers a handler-owned error response verbatim", async () => {
    const handler: ReactRouterRequestHandler = async () =>
      new Response(RR_OWNED_ERROR_BODY, {
        status: 500,
        headers: { "content-type": "text/plain", "x-t040-rr-owned": "kept" },
      });
    const app = await composeAdapterApp({ reactRouterHandler: handler });

    const response = await app.inject({ method: "GET", url: "/route-error" });

    // A handler that RETURNS an error response owns it: the adapter passes
    // it through unmutated and only adds the composition-owned headers.
    expect(response.statusCode).toBe(500);
    expect(response.payload).toBe(RR_OWNED_ERROR_BODY);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.headers["x-t040-rr-owned"]).toBe("kept");
    expectSecurityHeaders(response.headers);
  });
});

// ---------------------------------------------------------------------------
// ABORT OWNERSHIP.
// ---------------------------------------------------------------------------

describe("createWebServer — client aborts", () => {
  it("propagates a client abort to the handler's Request signal and keeps serving", async () => {
    let sawAbort = false;
    let resolveAbortSeen: () => void = () => {};
    const abortSeen = new Promise<void>((resolve) => {
      resolveAbortSeen = resolve;
    });
    const handler: ReactRouterRequestHandler = async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/after-abort-probe") {
        return new Response("t040-still-serving", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      }
      // Hold the response open; finish only when the client's abort reaches
      // the handler's Request signal.
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("t040-held-first-chunk"));
          request.signal.addEventListener("abort", () => {
            sawAbort = true;
            resolveAbortSeen();
            try {
              controller.close();
            } catch {
              // Already closed by the consumer.
            }
          });
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    };
    const app = await composeAdapterApp({ reactRouterHandler: handler });
    const baseUrl = await listenOnLoopback(app);

    const controller = new AbortController();
    const response = await fetch(new URL("/abort-hold", baseUrl), {
      signal: controller.signal,
    });
    const reader = response.body!.getReader();
    const first = await withDeadline(
      reader.read(),
      "no chunk reached the client on the held response",
    );
    expect(new TextDecoder().decode(first.value)).toBe("t040-held-first-chunk");

    controller.abort();

    // The client's abort reaches the adapter and is signalled to the React
    // Router handler (the adapter owns wiring the raw socket close to the
    // Request signal).
    await withDeadline(
      abortSeen,
      "the client abort never reached the handler's Request signal",
    );
    expect(sawAbort).toBe(true);

    // The abort leaves the listener healthy: the next adapted request is
    // served normally.
    const followUp = await fetch(new URL("/after-abort-probe", baseUrl));
    expect(followUp.status).toBe(200);
    expect(await followUp.text()).toBe("t040-still-serving");
  });
});

// ---------------------------------------------------------------------------
// REQUEST/RESPONSE OWNERSHIP — repeated headers.
// ---------------------------------------------------------------------------

describe("createWebServer — repeated headers", () => {
  it("forwards every repeated request-header field line to the handler in order", async () => {
    const recording = recordRequests(okHandler("ok"));
    const app = await composeAdapterApp({ reactRouterHandler: recording.handler });
    const baseUrl = await listenOnLoopback(app);

    // A raw socket writes the field lines literally onto the wire, so the
    // request genuinely carries `x-t040-repeat: alpha` and
    // `x-t040-repeat: beta` as two separate field lines. (A fetch/Headers
    // client cannot be used here: it normalizes repeated values into one
    // joined field line before transport.)
    const response = await rawHttpGet(
      new URL("/repeated-request-header", baseUrl),
      ["x-t040-repeat: alpha", "x-t040-repeat: beta"],
    );
    expect(response.statusLine).toContain("200");

    expect(recording.requests).toHaveLength(1);
    // The standard Web Request view of repeated field lines: every value, in
    // wire order, joined per the fetch specification — none dropped,
    // overwritten, or reordered by the adapter.
    expect(recording.requests[0]!.request.headers.get("x-t040-repeat")).toBe(
      "alpha, beta",
    );
  });

  it("delivers repeated response headers such as Set-Cookie without collapsing them", async () => {
    const handler: ReactRouterRequestHandler = async () => {
      const headers = new Headers({ "content-type": "text/plain" });
      headers.append("set-cookie", "t040-first=v1; Path=/");
      headers.append("set-cookie", "t040-second=v2; Path=/");
      return new Response("t040-cookie-body", { status: 200, headers });
    };
    const app = await composeAdapterApp({ reactRouterHandler: handler });

    const response = await app.inject({ method: "GET", url: "/set-cookies" });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe("t040-cookie-body");
    // Both Set-Cookie lines survive the raw reply as distinct values.
    expect(response.headers["set-cookie"]).toEqual([
      "t040-first=v1; Path=/",
      "t040-second=v2; Path=/",
    ]);
  });
});

// ---------------------------------------------------------------------------
// SECURITY-HEADER OWNERSHIP.
// ---------------------------------------------------------------------------

describe("createWebServer — security-header ownership at the handoff", () => {
  it("applies the composition-owned security headers exactly once, winning over a same-named handler header", async () => {
    const handler: ReactRouterRequestHandler = async () =>
      new Response("t040-security-body", {
        status: 200,
        headers: {
          "content-type": "text/plain",
          // The handler attempts to own the same security header name with a
          // different value.
          "x-content-type-options": "attempted-handler-override",
        },
      });
    const app = await composeAdapterApp({ reactRouterHandler: handler });

    const response = await app.inject({ method: "GET", url: "/security-clash" });

    expect(response.statusCode).toBe(200);
    // The composition-owned value is delivered — exactly once, not joined
    // with or replaced by the handler's value.
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expectSecurityHeaders(response.headers);
  });
});

// ---------------------------------------------------------------------------
// LOGGING OWNERSHIP.
// ---------------------------------------------------------------------------

describe("createWebServer — logging ownership at the handoff", () => {
  it("logs an adapted request through the bounded closed surface with the delivered status", async () => {
    const capture = createLogCapture();
    const app = await composeAdapterApp({
      reactRouterHandler: okHandler(GET_BODY),
      loggerStream: capture.stream,
    });

    await app.inject({
      method: "GET",
      url: `/${SENTINEL_PATH}/probe?leak=${SENTINEL_QUERY}`,
      headers: {
        "x-t040-sensitive": SENTINEL_HEADER,
        host: `${SENTINEL_HOST}.example`,
        "x-forwarded-for": SENTINEL_XFF,
      },
      remoteAddress: SENTINEL_REMOTE,
    });
    // The accepted settle delay for the logger destination (T016 idiom).
    await new Promise((resolve) => setTimeout(resolve, 25));
    const emitted = capture.text();

    // The adapted request IS logged — including a completion record that
    // carries the delivered status code through the closed response fields.
    expect(emitted).toContain("incoming request");
    expect(emitted).toContain("request completed");
    expect(emitted).toContain('"statusCode":200');

    // ...but no raw URL path, query value, header value, host, forwarded, or
    // remote detail reaches the log surface (T016-B01 bounded fields).
    for (const token of [
      SENTINEL_QUERY,
      SENTINEL_PATH,
      SENTINEL_HEADER,
      SENTINEL_HOST,
      SENTINEL_XFF,
      SENTINEL_REMOTE,
    ]) {
      expect(emitted).not.toContain(token);
    }
  });

  it("logs a thrown handler failure as exactly one closed application diagnostic", async () => {
    const capture = createLogCapture();
    const handler: ReactRouterRequestHandler = async () => {
      const error = new Error(`${SENTINEL_ERROR} logged adapter failure`);
      error.stack = `${SENTINEL_STACK}\n    at rawInternalFrame (internal/detail.ts:9:9)`;
      throw error;
    };
    const app = await composeAdapterApp({
      reactRouterHandler: handler,
      loggerStream: capture.stream,
    });

    await app.inject({ method: "GET", url: "/throwing-logged" });
    await new Promise((resolve) => setTimeout(resolve, 25));
    const emitted = capture.text();

    // No raw error message or stack is ever serialized.
    expect(emitted).not.toContain(SENTINEL_ERROR);
    expect(emitted).not.toContain(SENTINEL_STACK);

    // The failure is logged as exactly the closed application SafeDiagnostic
    // record (T038), emitted exactly once: the complete record — the closed
    // key set with closed values and the derived application scope — nothing
    // wrapping it and no duplicate emission. (Non-JSON log lines are
    // permitted to pass through; they are simply not closed records.)
    const closedRecords = emitted
      .split("\n")
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return undefined;
        }
      })
      .filter((value): value is Record<string, unknown> =>
        isClosedApplicationDiagnostic(value),
      );
    expect(closedRecords).toHaveLength(1);
  });
});

/**
 * Whether a value is exactly one closed application-error diagnostic — the
 * complete closed field set with the closed values, nothing else (the
 * accepted T038 recognizer shape, widened only by the derived-scope rule the
 * same contract established).
 */
function isClosedApplicationDiagnostic(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 4 ||
    !["component", "diagnosticScope", "reasonCode", "remediation"].every(
      (key, index) => key === keys[index],
    )
  ) {
    return false;
  }
  return (
    record.reasonCode === "OPERATIONAL_FAILURE" &&
    record.component === "application" &&
    record.remediation === "RETRY_SAFE_OPERATION" &&
    (record.diagnosticScope === "daily" || record.diagnosticScope === "verification")
  );
}

/**
 * T016 — Focused ordering/composition evidence for the server-owned
 * Fastify plugin / capability composition boundary.
 *
 * References: FR-001–FR-002, FR-006, FR-009, FR-013, FR-016;
 * data-model.md §Execution Context / §Safe Diagnostic / §Migration State /
 * §Component Readiness; plan.md §Runtime composition / §Configuration and
 * startup / §Testing and security evidence; research.md Decisions 3, 6–9;
 * accepted `apps/server/src/config.ts`, `database.ts`, `migrations.ts`,
 * `health.ts`, and `http.ts`; installed Fastify 5.12.0 and Vitest 4.1.10.
 *
 * This suite proves the composition ordering and boundaries that
 * `apps/server/src/bootstrap.ts` (`createServer`) must satisfy:
 *   - invalid configuration (or an unsupported operation target) returns only
 *     the accepted closed SafeDiagnostic and creates NO database capability
 *     and accepts NO listener/child work;
 *   - accepted configuration creates the database capability only after
 *     validation, wires readiness to the accepted read-only
 *     `getDatabaseReadiness` boundary, exposes the existing health routes
 *     (reused, not duplicated), and provides bounded database teardown —
 *     without binding a listener;
 *   - startup/readiness never applies migrations, never writes the marker,
 *     never caches a self-derived ready value, never serializes raw
 *     environment or database detail, and never converts pending/unavailable
 *     migration state into ready;
 *   - the validated construction-time settings (T016-B01) are applied when the
 *     database/Fastify objects are built, not deferred to the later listener:
 *     `databasePoolMax` is forwarded to `createDatabase` as the pool bound, the
 *     validated `logLevel` configures the Fastify logger, and the validated
 *     `proxyPolicy` maps to Fastify `trustProxy` (`none` trusts no forwarded
 *     headers; `one-hop` trusts exactly one hop, never blanket `true`).
 *
 * The database and migration boundaries are observed through deterministic
 * injected fakes bound to the accepted `createDatabase` / `closeDatabase` /
 * `getDatabaseReadiness` / `applyMigrations` / `writeMarker` shapes. No real
 * database, network, or listener is used; HTTP is proven with Fastify
 * `inject()`. No skipped, todo, or placeholder tests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Writable } from "node:stream";
import { createServer } from "./bootstrap.js";
import { closeDatabase, createDatabase, type Database } from "./database.js";
import {
  applyMigrations,
  getDatabaseReadiness,
  writeMarker,
  type DatabaseReadiness,
} from "./migrations.js";
import { operationalFailureDiagnostic } from "./health.js";

vi.mock("./database.js", () => ({
  createDatabase: vi.fn(),
  closeDatabase: vi.fn(),
}));

vi.mock("./migrations.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./migrations.js")>();
  return {
    ...actual,
    getDatabaseReadiness: vi.fn(),
    applyMigrations: vi.fn(),
    writeMarker: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Valid daily Development context (mirrors .env.development.example). */
const DEV_BASE: Record<string, string> = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "daily",
  APP_HOST: "127.0.0.1",
  APP_PORT: "4173",
  PUBLIC_ORIGIN: "http://127.0.0.1:4173",
  DATABASE_URL:
    "mysql://songhealth_dev:dev-only-placeholder@127.0.0.1:3306/songhealth_development",
  DATABASE_POOL_MAX: "5",
  PROXY_POLICY: "none",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
};

/** A unique sentinel credential used only to prove nondisclosure. */
const SENTINEL_CREDENTIAL = "SC016-SENTINEL-CRED";
const DEV_WITH_SENTINEL: Record<string, string> = {
  ...DEV_BASE,
  DATABASE_URL: `mysql://songhealth_dev:${SENTINEL_CREDENTIAL}@127.0.0.1:3306/songhealth_development`,
};

/** Valid Verification context (one-hop proxy trust; mirrors .env examples). */
const VER_BASE: Record<string, string> = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "verification",
  APP_HOST: "songhealth-app",
  APP_PORT: "3000",
  PUBLIC_ORIGIN: "http://songhealth-verification.test",
  DATABASE_URL:
    "mysql://songhealth_ver:ver-only-placeholder@songhealth-db:3306/songhealth_verification",
  DATABASE_POOL_MAX: "5",
  PROXY_POLICY: "one-hop",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
};

const OBSERVED_AT = "2026-01-01T00:00:00.000Z";

const READY_READINESS: DatabaseReadiness = {
  component: "database",
  status: "ready",
  observedAt: OBSERVED_AT,
};

const PENDING_READINESS: DatabaseReadiness = {
  component: "database",
  status: "not-ready",
  diagnostic: {
    reasonCode: "MIGRATIONS_PENDING",
    diagnosticScope: "foundation",
    component: "database",
    remediation: "RUN_MIGRATION",
  },
  observedAt: OBSERVED_AT,
};

const UNAVAILABLE_READINESS: DatabaseReadiness = {
  component: "database",
  status: "not-ready",
  diagnostic: {
    reasonCode: "DATABASE_UNAVAILABLE",
    diagnosticScope: "foundation",
    component: "database",
    remediation: "RETRY_SAFE_OPERATION",
  },
  observedAt: OBSERVED_AT,
};

/** A sentinel database capability standing in for the real Kysely instance. */
const SENTINEL_DB = { __bootstrapSentinelDb: true } as unknown as Database;

/**
 * A log-output capture destination (T016-B01). A `Writable` that records every
 * chunk the logger writes so a test can assert on the exact emitted log surface
 * — the composition's `loggerStream` seam is bound to it.
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

function assertNoWorkStarted(): void {
  expect(createDatabase).not.toHaveBeenCalled();
  expect(getDatabaseReadiness).not.toHaveBeenCalled();
  expect(closeDatabase).not.toHaveBeenCalled();
  expect(applyMigrations).not.toHaveBeenCalled();
  expect(writeMarker).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rejection: fail before any database / app / listener / child work.
// ---------------------------------------------------------------------------

describe("createServer — configuration rejection", () => {
  it("returns only the closed SafeDiagnostic and creates no capability on invalid configuration", async () => {
    const { APP_PORT: _port, ...missingPort } = DEV_BASE;
    void _port;

    const result = await createServer({
      env: missingPort,
      operationTarget: "development",
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") return;
    expect(result.diagnostic).toEqual({
      reasonCode: "CONFIG_MISSING",
      diagnosticScope: "daily",
      component: "configuration",
      configurationKey: "APP_PORT",
      remediation: "FIX_CONFIGURATION",
    });
    assertNoWorkStarted();
  });

  it("rejects an unsupported operation target at foundation scope before any work", async () => {
    const result = await createServer({
      env: DEV_BASE,
      operationTarget: "staging",
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") return;
    expect(result.diagnostic).toEqual({
      reasonCode: "CONFIG_UNSUPPORTED",
      diagnosticScope: "foundation",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
    });
    assertNoWorkStarted();
  });
});

// ---------------------------------------------------------------------------
// Acceptance: composition ordering, route reuse, readiness wiring, teardown.
// ---------------------------------------------------------------------------

describe("createServer — accepted configuration", () => {
  it("creates the database capability only after validation and composes the app without a listener", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);
    vi.mocked(getDatabaseReadiness).mockResolvedValue(READY_READINESS);

    const result = await createServer({
      env: DEV_BASE,
      operationTarget: "development",
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    // The database capability is created exactly once, from the validated URL,
    // forwarding the validated pool bound (T016-B01) as the pool `connectionLimit`.
    expect(createDatabase).toHaveBeenCalledTimes(1);
    expect(createDatabase).toHaveBeenCalledWith(
      DEV_BASE.DATABASE_URL,
      5,
    );

    // The composed app is an in-process Fastify instance with no listener bound.
    expect(typeof result.capabilities.app.inject).toBe("function");
    expect(result.capabilities.app.server.listening).toBe(false);

    // The accepted configuration and derived scope are exposed.
    expect(result.capabilities.configuration.databaseUrl).toBe(DEV_BASE.DATABASE_URL);
    expect(result.capabilities.diagnosticScope).toBe("daily");

    // Composition never mutates the database.
    expect(applyMigrations).not.toHaveBeenCalled();
    expect(writeMarker).not.toHaveBeenCalled();
  });

  it("reuses the accepted health routes and wires readiness to the read-only boundary", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);
    vi.mocked(getDatabaseReadiness).mockResolvedValue(READY_READINESS);

    const result = await createServer({
      env: DEV_BASE,
      operationTarget: "development",
    });
    if (result.status !== "ready") throw new Error("expected ready");
    const { app } = result.capabilities;

    // Liveness: the application is running once composition succeeds.
    const live = await app.inject({ method: "GET", url: "/health/live" });
    expect(live.statusCode).toBe(200);
    expect(live.json()).toEqual({ status: "alive" });

    // Readiness: exactly two components, database ready, no diagnostic.
    const ready = await app.inject({ method: "GET", url: "/health/ready" });
    expect(ready.statusCode).toBe(200);
    const body = ready.json() as {
      status: string;
      components: { name: string; status: string }[];
    };
    expect(body.status).toBe("ready");
    expect(body.components).toHaveLength(2);
    const names = body.components.map((c) => c.name).sort();
    expect(names).toEqual(["application", "database"]);
    for (const component of body.components) {
      expect(component.status).toBe("ready");
    }

    // Readiness is observed through the accepted boundary, against the
    // composed database capability (not a cached/self-derived value).
    expect(getDatabaseReadiness).toHaveBeenCalledTimes(1);
    expect(getDatabaseReadiness).toHaveBeenCalledWith(SENTINEL_DB);
  });

  it("never converts pending or unavailable migration state into ready", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);

    // Pending migrations.
    vi.mocked(getDatabaseReadiness).mockResolvedValue(PENDING_READINESS);
    let result = await createServer({ env: DEV_BASE, operationTarget: "development" });
    if (result.status !== "ready") throw new Error("expected ready");
    let ready = await result.capabilities.app.inject({
      method: "GET",
      url: "/health/ready",
    });
    expect(ready.statusCode).toBe(503);
    let pendingBody = ready.json() as {
      status: string;
      components: { name: string; status: string; diagnostic?: { reasonCode: string } }[];
    };
    expect(pendingBody.status).toBe("not-ready");
    const pendingDb = pendingBody.components.find((c) => c.name === "database");
    expect(pendingDb?.status).toBe("not-ready");
    expect(pendingDb?.diagnostic?.reasonCode).toBe("MIGRATIONS_PENDING");

    // Unavailable engine.
    vi.mocked(getDatabaseReadiness).mockResolvedValue(UNAVAILABLE_READINESS);
    result = await createServer({ env: DEV_BASE, operationTarget: "development" });
    if (result.status !== "ready") throw new Error("expected ready");
    ready = await result.capabilities.app.inject({
      method: "GET",
      url: "/health/ready",
    });
    expect(ready.statusCode).toBe(503);
    const unavailableBody = ready.json() as {
      components: { name: string; diagnostic?: { reasonCode: string } }[];
    };
    const unavailableDb = unavailableBody.components.find((c) => c.name === "database");
    expect(unavailableDb?.diagnostic?.reasonCode).toBe("DATABASE_UNAVAILABLE");

    expect(applyMigrations).not.toHaveBeenCalled();
    expect(writeMarker).not.toHaveBeenCalled();
  });

  it("provides bounded, idempotent database teardown", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);
    vi.mocked(getDatabaseReadiness).mockResolvedValue(READY_READINESS);
    vi.mocked(closeDatabase).mockResolvedValue(undefined);

    const result = await createServer({ env: DEV_BASE, operationTarget: "development" });
    if (result.status !== "ready") throw new Error("expected ready");
    const { close } = result.capabilities;

    await close();
    expect(closeDatabase).toHaveBeenCalledTimes(1);
    expect(closeDatabase).toHaveBeenCalledWith(SENTINEL_DB);

    // A second teardown is bounded: no additional pool close.
    await close();
    expect(closeDatabase).toHaveBeenCalledTimes(1);
  });

  it("does not serialize raw environment or database detail on any health surface", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);
    vi.mocked(getDatabaseReadiness).mockResolvedValue(PENDING_READINESS);

    const result = await createServer({
      env: DEV_WITH_SENTINEL,
      operationTarget: "development",
    });
    if (result.status !== "ready") throw new Error("expected ready");
    const { app } = result.capabilities;

    const live = await app.inject({ method: "GET", url: "/health/live" });
    const ready = await app.inject({ method: "GET", url: "/health/ready" });

    // The sentinel credential and the connection URL must never appear.
    for (const response of [live, ready]) {
      expect(response.body).not.toContain(SENTINEL_CREDENTIAL);
      expect(response.body).not.toContain(DEV_WITH_SENTINEL.DATABASE_URL);
    }
  });
});

// ---------------------------------------------------------------------------
// Construction-time settings (T016-B01): the validated databasePoolMax,
// proxyPolicy, and logLevel are applied when the database/Fastify objects are
// built, never deferred to the later caller-owned listener.
// ---------------------------------------------------------------------------

describe("createServer — construction-time settings (T016-B01)", () => {
  it("applies the validated logLevel to the Fastify logger and keeps logging enabled", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);
    vi.mocked(getDatabaseReadiness).mockResolvedValue(READY_READINESS);

    const capture = createLogCapture();
    const result = await createServer({
      env: DEV_BASE,
      operationTarget: "development",
      loggerStream: capture.stream,
    });
    if (result.status !== "ready") throw new Error("expected ready");
    const { app } = result.capabilities;

    // The validated log level configures the Fastify (pino) logger.
    expect(app.log.level).toBe(DEV_BASE.LOG_LEVEL);

    // Logging stays enabled at that level: an injected request emits a log line
    // to the captured destination (proving the logger is active, not silenced).
    await app.inject({ method: "GET", url: "/health/live" });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(capture.text()).toContain("incoming request");
  });

  it("the logger emits only allowlisted fields and no prohibited infrastructure detail", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);
    vi.mocked(getDatabaseReadiness).mockResolvedValue(READY_READINESS);

    // Sentinel values that must never appear in the emitted log surface.
    const sentinelQuery = "SC016-QUERY-SENTINEL";
    const sentinelHost = "SC016-HOST-SENTINEL";
    const sentinelXff = "SC016-XFF-SENTINEL";
    const sentinelRemote = "203.0.113.77";

    const capture = createLogCapture();
    const result = await createServer({
      env: DEV_BASE,
      operationTarget: "development",
      loggerStream: capture.stream,
    });
    if (result.status !== "ready") throw new Error("expected ready");
    const { app } = result.capabilities;

    // Drive a real request through the composed app with sentinel network and
    // query detail in the request.
    await app.inject({
      method: "GET",
      url: `/health/ready?probe=${sentinelQuery}`,
      headers: { host: sentinelHost, "x-forwarded-for": sentinelXff },
      remoteAddress: sentinelRemote,
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
    const emitted = capture.text();

    // The log surface is active (the request was logged)...
    expect(emitted).toContain("incoming request");
    expect(emitted).toContain("request completed");

    // ...but none of the prohibited detail is present: no process/hostname base,
    // no raw query values, host, proxy/remote network metadata, configuration,
    // credential, or connection URL.
    for (const token of [
      sentinelQuery,
      sentinelHost,
      sentinelXff,
      sentinelRemote,
      "hostname",
      '"pid"',
      SENTINEL_CREDENTIAL,
      DEV_BASE.DATABASE_URL,
    ]) {
      expect(emitted, `prohibited detail leaked: ${token}`).not.toContain(token);
    }
  });

  it("a readiness failure maps to the closed 500 diagnostic without logging exception detail", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);
    // The readiness boundary throws a sentinel error carrying detail that must
    // never reach the log surface or the wire.
    const sentinelError = new Error("SC016-EXCEPTION-SENTINEL at /secret/path");
    vi.mocked(getDatabaseReadiness).mockRejectedValue(sentinelError);

    const capture = createLogCapture();
    const result = await createServer({
      env: DEV_BASE,
      operationTarget: "development",
      loggerStream: capture.stream,
    });
    if (result.status !== "ready") throw new Error("expected ready");
    const { app } = result.capabilities;

    const response = await app.inject({ method: "GET", url: "/health/ready" });
    await new Promise((resolve) => setTimeout(resolve, 25));

    // The failure is mapped to the closed 500 SafeDiagnostic (no raw detail).
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual(operationalFailureDiagnostic("application"));

    // The exception object, its message, and its stack are never logged.
    const emitted = capture.text();
    for (const token of ["SC016-EXCEPTION-SENTINEL", "/secret/path", "Error", "stack"]) {
      expect(emitted, `exception detail leaked: ${token}`).not.toContain(token);
    }
  });

  it("daily proxyPolicy=none trusts no forwarded headers (peer address is authoritative)", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);
    vi.mocked(getDatabaseReadiness).mockResolvedValue(READY_READINESS);

    const result = await createServer({
      env: DEV_BASE,
      operationTarget: "development",
    });
    if (result.status !== "ready") throw new Error("expected ready");
    const { app } = result.capabilities;

    // A test-only probe route (registered after composition, before listen)
    // exposes the resolved client address so the trust behavior is observable.
    app.get("/__trust_probe", (req) => ({ ip: req.ip }));
    const response = await app.inject({
      method: "GET",
      url: "/__trust_probe",
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
      remoteAddress: "198.51.100.9",
    });
    expect(response.statusCode).toBe(200);
    // With `none`, the XFF header is ignored entirely: the direct peer wins.
    expect(response.json()).toEqual({ ip: "198.51.100.9" });
  });

  it("verification proxyPolicy=one-hop trusts exactly one hop, never blanket true", async () => {
    vi.mocked(createDatabase).mockResolvedValue(SENTINEL_DB);
    vi.mocked(getDatabaseReadiness).mockResolvedValue(READY_READINESS);

    const result = await createServer({
      env: VER_BASE,
      operationTarget: "verification",
    });
    if (result.status !== "ready") throw new Error("expected ready");
    const { app } = result.capabilities;

    app.get("/__trust_probe", (req) => ({ ip: req.ip }));
    const response = await app.inject({
      method: "GET",
      url: "/__trust_probe",
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
      remoteAddress: "198.51.100.9",
    });
    expect(response.statusCode).toBe(200);
    // One hop: the rightmost forwarded entry (the immediate proxy) wins —
    // exactly one hop is trusted, not the leftmost client (blanket `true`).
    expect(response.json()).toEqual({ ip: "70.41.3.18" });
  });
});

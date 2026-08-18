/**
 * T014 — Failing Fastify injection tests for the operational health contract.
 *
 * References: FR-007, FR-009–FR-010; contracts/foundation-http.openapi.yaml
 * `/health/live`, `/health/ready`, `Liveness`, `Readiness`, `ComponentReadiness`,
 * and `SafeDiagnostic`; data-model.md §Safe Diagnostic / §Migration State /
 * §Component Readiness; plan.md §Configuration and startup / §Persistence and
 * migrations / §Testing and security evidence; research.md Decisions 8–9;
 * Delivery Context Implementation/Review routing, explicit out-of-scope
 * boundaries, and security/privacy routing; Constitution Principles I–VI;
 * accepted `apps/server/src/config.ts` `SAFE_DIAGNOSTIC_SCHEMA` and
 * `apps/server/src/migrations.ts` `getDatabaseReadiness` boundary; installed
 * Fastify 5.12.0 and Vitest 4.1.10.
 *
 * This suite pins the behavior contract that the planned T015 implementation
 * (`apps/server/src/health.ts` and `apps/server/src/http.ts`) must satisfy. It
 * imports the operational app factory `createApp` and the health dependency
 * types from `./http.js` and `./health.js`. Those modules do not exist yet;
 * the expected red result is that unresolved import, not a syntax, typing,
 * fixture, discovery, toolchain, or forced-failure defect.
 *
 * The contract is an HTTP-level contract proven with Fastify `inject()` — no
 * real listener is ever bound and no real database or network is used. The
 * database component is observed through deterministic injected fakes bound to
 * the accepted `getDatabaseReadiness` boundary shape from
 * `apps/server/src/migrations.ts` (component, status, closed diagnostic,
 * internal `observedAt`), which this suite consumes but never modifies.
 *
 * Pinned contract:
 *   - `GET /health/live` returns only the closed `200 {"status":"alive"}` JSON
 *     shape — no additional fields, no free-form content;
 *   - ready `GET /health/ready` returns `200`, overall `ready`, and exactly
 *     two components — one `application` and one `database` — both `ready`
 *     and without any diagnostic;
 *   - database-unavailable, migrations-pending, and migration-status-error
 *     inputs return `503`, overall `not-ready`, a ready `application`
 *     component plus a not-ready `database` component, and the applicable
 *     closed `DATABASE_UNAVAILABLE`, `MIGRATIONS_PENDING`, or
 *     `MIGRATION_STATUS_FAILED` diagnostic with bounded
 *     scope/component/remediation;
 *   - pending migrations never become ready; readiness observation is
 *     non-mutating (the injected probe is invoked exactly once per request
 *     and the real `applyMigrations` / `writeMarker` mutation boundary from
 *     `./migrations.js` — observed through spies, not a test-only callback —
 *     is never invoked);
 *   - operational failures on BOTH endpoints return a safe `500` closed
 *     `SafeDiagnostic` (`OPERATIONAL_FAILURE`) that exposes no raw exception,
 *     stack, SQL, credential, connection string, sentinel value, or
 *     unnecessary host/path/infrastructure detail;
 *   - every serialized success, component, and error body is closed:
 *     undeclared fields are rejected or stripped, and the OpenAPI wire field
 *     `name` with its exact two-component cardinality is authoritative while
 *     internal observation fields such as `observedAt` stay off the wire.
 *
 * No skipped, todo, or placeholder tests. No database URL, credential, raw
 * SQL/error, stack, or host/path detail is ever emitted by an asserted body.
 */

import { describe, expect, it, vi } from "vitest";
import { createApp } from "./http.js";
import type {
  HealthDependencies,
  HealthReadiness,
  HealthSafeDiagnostic,
} from "./health.js";
import { applyMigrations, writeMarker } from "./migrations.js";

/**
 * T014-B01 — observe the ACTUAL prohibited mutation boundary. The health
 * surface (readiness/liveness) must never apply migrations or otherwise
 * mutate the database (Data Model §Migration State: readiness is a read-only
 * projection; only the explicit migration operation may transition
 * pending→current). Rather than require the planned T015 implementation to
 * expose or voluntarily call a test-only instrumentation callback, this suite
 * substitutes ONLY the real mutation functions of the accepted
 * `./migrations.js` module with spies (via `importOriginal`, keeping the
 * read-only boundary — `getMigrationStatus`, `getDatabaseReadiness`, … —
 * intact). If `GET /health/ready` or `/health/live` invokes `applyMigrations`
 * or `writeMarker` — directly or through any internal path — the spy records
 * the call and the non-mutation assertion below fails.
 */
vi.mock("./migrations.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./migrations.js")>();
  return {
    ...actual,
    applyMigrations: vi.fn(),
    writeMarker: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Closed-shape vocabularies (foundation-http.openapi.yaml; data-model.md
// §Safe Diagnostic / §Component Readiness). These mirror the accepted
// `SAFE_DIAGNOSTIC_SCHEMA` in `apps/server/src/config.ts` and the
// `getDatabaseReadiness` boundary in `apps/server/src/migrations.ts`.
// ---------------------------------------------------------------------------

/** The exact closed wire shape of the database-component readiness boundary. */
type DatabaseReadiness = HealthReadiness;
/** The exact closed wire shape of a Safe Diagnostic. */
type SafeDiagnostic = HealthSafeDiagnostic;

/** The closed diagnostic-scope vocabulary (foundation-http.openapi.yaml). */
const DIAGNOSTIC_SCOPES = ["foundation", "daily", "verification"] as const;
/** The closed component vocabulary (foundation-http.openapi.yaml). */
const DIAGNOSTIC_COMPONENTS = [
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
/** The closed remediation vocabulary (foundation-http.openapi.yaml). */
const DIAGNOSTIC_REMEDIATIONS = [
  "CHECK_PREREQUISITES",
  "FIX_CONFIGURATION",
  "CHECK_DATABASE",
  "RUN_MIGRATION",
  "INSPECT_OWNERSHIP",
  "RETRY_SAFE_OPERATION",
  "RUN_CONFIRMED_RECOVERY",
  "RUN_CONFIRMED_RESET",
  "REVIEW_MANUALLY",
  "REVIEW_SECURITY_EVIDENCE",
  "NONE",
] as const;

/** The exact closed SafeDiagnostic key set — no additional properties. */
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

/** The exact closed wire key sets (Liveness / Readiness / ComponentReadiness). */
const LIVENESS_KEYS = new Set(["status"]);
const READINESS_KEYS = new Set(["status", "components"]);
const COMPONENT_KEYS = new Set(["name", "status", "diagnostic"]);

/** The exact two-component cardinality, in the OpenAPI wire order. */
const EXPECTED_COMPONENT_NAMES = ["application", "database"] as const;

/**
 * Sentinel tokens that must never appear in any serialized health body. They
 * stand in for raw exception text, stack frames, SQL, credentials, connection
 * strings, and host/path/infrastructure detail (FR-007; SC-004).
 */
const RAW_LEAK_TOKENS = [
  "Error:",
  "at Object.",
  "    at ",
  "stack",
  "SELECT",
  "INSERT",
  "mysql://",
  "password",
  "secret",
  "songhealth_dev",
  "songhealth_development",
  "127.0.0.1",
  "localhost",
  "/home/",
  "/tmp/",
  "SC002_RAW_SENTINEL",
] as const;

// ---------------------------------------------------------------------------
// Deterministic injected fakes (research.md Decision 8 — Fastify `inject()`
// with deterministic fakes, never a real database or network).
// ---------------------------------------------------------------------------

/**
 * Build the closed database-readiness shape the accepted
 * `getDatabaseReadiness` boundary returns, including the internal
 * `observedAt` observation field that must stay off the wire.
 */
function databaseReadiness(
  status: "ready" | "not-ready",
  diagnostic?: SafeDiagnostic,
): DatabaseReadiness {
  return {
    component: "database",
    status,
    ...(diagnostic === undefined ? {} : { diagnostic }),
    observedAt: "2026-01-01T00:00:00.000Z",
  };
}

/** The closed diagnostic for each non-current migration state (migrations.ts). */
function pendingDiagnostic(): SafeDiagnostic {
  return {
    reasonCode: "MIGRATIONS_PENDING",
    diagnosticScope: "foundation",
    component: "database",
    remediation: "RUN_MIGRATION",
  };
}
function unavailableDiagnostic(): SafeDiagnostic {
  return {
    reasonCode: "DATABASE_UNAVAILABLE",
    diagnosticScope: "foundation",
    component: "database",
    remediation: "RETRY_SAFE_OPERATION",
  };
}
function statusFailedDiagnostic(): SafeDiagnostic {
  return {
    reasonCode: "MIGRATION_STATUS_FAILED",
    diagnosticScope: "foundation",
    component: "database",
    remediation: "RETRY_SAFE_OPERATION",
  };
}

/**
 * Compose the operational app under test with deterministic injected fakes.
 * The planned T015 `createApp` must accept the health dependencies (the
 * database-readiness observation plus the liveness observation) so the suite
 * can drive every contract state without a real database or listener.
 *
 * No test-only instrumentation is passed to `createApp`: the non-mutation
 * guarantee is observed through the real `applyMigrations` / `writeMarker`
 * spies installed by the `vi.mock("./migrations.js", …)` above, so any
 * mutation the app under test performs through the accepted boundary is
 * recorded without T015 having to expose or call a test callback.
 */
async function buildApp(
  overrides: Partial<HealthDependencies> = {},
): Promise<{ app: Awaited<ReturnType<typeof createApp>> }> {
  const deps: HealthDependencies = {
    getDatabaseReadiness: vi.fn(async () => databaseReadiness("ready")),
    livenessProbe: vi.fn(async () => undefined),
    ...overrides,
  };
  const app = await createApp(deps);
  return { app };
}

// ---------------------------------------------------------------------------
// Assertion helpers (closed wire shapes + non-leakage), mirroring
// config.test.ts / migrations.test.ts.
// ---------------------------------------------------------------------------

/** Parse an injected response body; it must be a JSON object, never raw text. */
function bodyOf(response: { json: () => unknown; payload: string }): Record<string, unknown> {
  const body = response.json();
  expect(typeof body).toBe("object");
  expect(body).not.toBeNull();
  return body as Record<string, unknown>;
}

/** Assert a serialized value leaks none of the forbidden raw tokens. */
function assertNoRawLeak(value: unknown): void {
  const serialized = JSON.stringify(value) ?? "";
  for (const token of RAW_LEAK_TOKENS) {
    expect(serialized, `raw detail leaked: ${token}`).not.toContain(token);
  }
}

/**
 * Assert an object carries only declared keys (the closed wire shape rejects
 * or strips undeclared fields). Presence of required keys is asserted by the
 * shape-specific helpers (e.g. `assertClosedDiagnostic`).
 */
function assertExactKeys(body: Record<string, unknown>, keys: Set<string>, label: string): void {
  for (const key of Object.keys(body)) {
    expect(keys.has(key), `${label}: undeclared field on the wire: ${key}`).toBe(true);
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
    expect(
      Object.prototype.hasOwnProperty.call(d, key),
      `missing diagnostic key: ${key}`,
    ).toBe(true);
  }
  expect(d.reasonCode).toBe(expectedReasonCode);
  expect((DIAGNOSTIC_SCOPES as readonly string[]).includes(d.diagnosticScope as string)).toBe(
    true,
  );
  expect((DIAGNOSTIC_COMPONENTS as readonly string[]).includes(d.component as string)).toBe(
    true,
  );
  expect((DIAGNOSTIC_REMEDIATIONS as readonly string[]).includes(d.remediation as string)).toBe(
    true,
  );
}

/**
 * Assert the readiness `components` array has the exact two-component
 * membership/cardinality required by the OpenAPI contract — exactly one
 * `application` and exactly one `database` — WITHOUT imposing any array
 * order (the contract uses `contains`/`minContains`/`maxContains`, not an
 * ordered list). Each component must be a closed ComponentReadiness. Returns
 * the components keyed by wire name for further per-state asserts.
 */
function assertComponentCardinality(
  body: Record<string, unknown>,
): Record<(typeof EXPECTED_COMPONENT_NAMES)[number], Record<string, unknown>> {
  const components = body.components;
  expect(Array.isArray(components)).toBe(true);
  const list = components as Record<string, unknown>[];
  // Exact cardinality: two components, no more, no fewer.
  expect(list).toHaveLength(2);
  // Membership, order-independent: the multiset of names is exactly
  // {application, database} — one of each, no duplicates, no extras.
  const names = list.map((c) => c.name).sort();
  expect(names).toEqual([...EXPECTED_COMPONENT_NAMES].sort());
  for (const component of list) {
    assertExactKeys(component, COMPONENT_KEYS, "component");
    expect(["ready", "not-ready"]).toContain(component.status as string);
    // The internal observation field never reaches the wire.
    expect("observedAt" in component).toBe(false);
  }
  const byName = {} as Record<(typeof EXPECTED_COMPONENT_NAMES)[number], Record<string, unknown>>;
  for (const component of list) {
    byName[component.name as (typeof EXPECTED_COMPONENT_NAMES)[number]] = component;
  }
  return byName;
}

/**
 * Assert a not-ready readiness body: overall `not-ready`, a ready
 * `application` component (no diagnostic), and a not-ready `database`
 * component carrying the closed diagnostic for the given reason code.
 */
function assertNotReadyBody(
  body: Record<string, unknown>,
  expectedReasonCode: string,
): void {
  assertExactKeys(body, READINESS_KEYS, "readiness");
  expect(body.status).toBe("not-ready");
  const { application, database } = assertComponentCardinality(body);
  expect(application.status).toBe("ready");
  expect("diagnostic" in application).toBe(false);
  expect(database.status).toBe("not-ready");
  assertClosedDiagnostic(database.diagnostic, expectedReasonCode);
  assertNoRawLeak(body);
}

// ---------------------------------------------------------------------------
// Liveness (FR-007; foundation-http.openapi.yaml `/health/live`).
// ---------------------------------------------------------------------------

describe("T014 · GET /health/live", () => {
  it("returns only the closed 200 {\"status\":\"alive\"} JSON shape", async () => {
    const { app } = await buildApp();

    const response = await app.inject({ method: "GET", url: "/health/live" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    const body = bodyOf(response);
    assertExactKeys(body, LIVENESS_KEYS, "liveness");
    expect(body.status).toBe("alive");
    assertNoRawLeak(body);
  });

  it("repeated liveness requests are deterministically identical", async () => {
    const { app } = await buildApp();

    const first = await app.inject({ method: "GET", url: "/health/live" });
    const second = await app.inject({ method: "GET", url: "/health/live" });

    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
  });
});

// ---------------------------------------------------------------------------
// Readiness — ready aggregation (FR-009; `/health/ready`).
// ---------------------------------------------------------------------------

describe("T014 · GET /health/ready (ready)", () => {
  it("returns 200, overall ready, and exactly one ready application plus one ready database component without diagnostics", async () => {
    const { app } = await buildApp();

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    const body = bodyOf(response);
    assertExactKeys(body, READINESS_KEYS, "readiness");
    expect(body.status).toBe("ready");
    const { application, database } = assertComponentCardinality(body);
    expect(application.status).toBe("ready");
    expect(database.status).toBe("ready");
    expect("diagnostic" in application).toBe(false);
    expect("diagnostic" in database).toBe(false);
    assertNoRawLeak(body);
  });

  it("keeps the internal observedAt observation field off the wire", async () => {
    const { app } = await buildApp();

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    const body = bodyOf(response);
    expect("observedAt" in body).toBe(false);
    for (const component of body.components as Record<string, unknown>[]) {
      expect("observedAt" in component).toBe(false);
    }
    assertNoRawLeak(body);
  });
});

// ---------------------------------------------------------------------------
// Readiness — not-ready aggregation (FR-009; data-model.md §Component
// Readiness / §Migration State). Table-driven over the three closed
// non-current migration states, using the accepted getDatabaseReadiness
// boundary outputs as deterministic injected inputs.
// ---------------------------------------------------------------------------

const NOT_READY_CASES = [
  {
    name: "database unavailable",
    readiness: () => databaseReadiness("not-ready", unavailableDiagnostic()),
    reasonCode: "DATABASE_UNAVAILABLE",
  },
  {
    name: "migrations pending",
    readiness: () => databaseReadiness("not-ready", pendingDiagnostic()),
    reasonCode: "MIGRATIONS_PENDING",
  },
  {
    name: "migration status error",
    readiness: () => databaseReadiness("not-ready", statusFailedDiagnostic()),
    reasonCode: "MIGRATION_STATUS_FAILED",
  },
] as const;

describe("T014 · GET /health/ready (not-ready)", () => {
  for (const testCase of NOT_READY_CASES) {
    it(`${testCase.name} returns 503, overall not-ready, and the closed ${testCase.reasonCode} diagnostic`, async () => {
      const { app } = await buildApp({
        getDatabaseReadiness: vi.fn(testCase.readiness),
      });

      const response = await app.inject({ method: "GET", url: "/health/ready" });

      expect(response.statusCode).toBe(503);
      expect(response.headers["content-type"]).toContain("application/json");
      assertNotReadyBody(bodyOf(response), testCase.reasonCode);
    });
  }

  it("pending migrations never become ready", async () => {
    // A database whose migrations are pending must report not-ready on every
    // observation — readiness is a projection of the read-only migration
    // status, never a self-derived or cached boolean that can drift to ready.
    const getDatabaseReadiness = vi.fn(
      async (): Promise<DatabaseReadiness> =>
        databaseReadiness("not-ready", pendingDiagnostic()),
    );
    const { app } = await buildApp({ getDatabaseReadiness });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await app.inject({ method: "GET", url: "/health/ready" });
      expect(response.statusCode).toBe(503);
      const body = bodyOf(response);
      expect(body.status).toBe("not-ready");
      const database = (body.components as Record<string, unknown>[]).find(
        (c) => c.name === "database",
      );
      assertClosedDiagnostic(database!.diagnostic, "MIGRATIONS_PENDING");
    }
  });

  it("readiness observation is non-mutating: the probe runs once per request and the real migration-apply/mutation boundary is never invoked", async () => {
    const getDatabaseReadiness = vi.fn(
      async (): Promise<DatabaseReadiness> =>
        databaseReadiness("not-ready", pendingDiagnostic()),
    );
    const { app } = await buildApp({ getDatabaseReadiness });

    await app.inject({ method: "GET", url: "/health/ready" });
    await app.inject({ method: "GET", url: "/health/ready" });

    expect(getDatabaseReadiness).toHaveBeenCalledTimes(2);
    // The spies ARE the accepted `applyMigrations` / `writeMarker` boundary
    // (substituted via `vi.mock("./migrations.js", …)`). If the readiness
    // handler applied migrations or wrote the marker — directly or through
    // any internal path — these assertions fail.
    expect(applyMigrations).not.toHaveBeenCalled();
    expect(writeMarker).not.toHaveBeenCalled();
  });

  it("an out-of-contract injected diagnostic is rejected at the runtime boundary and mapped to a closed OPERATIONAL_FAILURE (T015-B01)", async () => {
    // A HealthDependencies implementation may supply a diagnostic carrying raw
    // or unknown enum values. The runtime boundary must reject it (Fastify
    // response serialization does NOT validate enum membership) and map it to
    // the deterministic closed OPERATIONAL_FAILURE diagnostic — none of the
    // raw sentinel values may reach the HTTP response.
    const malformedDiagnostic = {
      reasonCode: "SC002_RAW_SENTINEL_REASON",
      diagnosticScope: "SC002_RAW_SENTINEL_SCOPE",
      component: "SC002_RAW_SENTINEL_COMPONENT",
      configurationKey: "SC002_RAW_SENTINEL_KEY",
      remediation: "SC002_RAW_SENTINEL_REMEDIATION",
    } as unknown as HealthSafeDiagnostic;
    const getDatabaseReadiness = vi.fn(
      async (): Promise<DatabaseReadiness> =>
        databaseReadiness("not-ready", malformedDiagnostic),
    );
    const { app } = await buildApp({ getDatabaseReadiness });

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.headers["content-type"]).toContain("application/json");
    const body = bodyOf(response);
    assertExactKeys(body, READINESS_KEYS, "readiness");
    expect(body.status).toBe("not-ready");
    const { application, database } = assertComponentCardinality(body);
    expect(application.status).toBe("ready");
    expect(database.status).toBe("not-ready");
    // The raw sentinel diagnostic is replaced by the closed operational
    // failure — allowlisted values only, no raw detail.
    assertClosedDiagnostic(database.diagnostic, "OPERATIONAL_FAILURE");
    assertNoRawLeak(body);
    assertNoRawLeak(response.payload);
  });
});

// ---------------------------------------------------------------------------
// Safe 500 operational failures (FR-007; SafeOperationalFailure). Both
// endpoints must map an operational failure to the closed SafeDiagnostic
// without any raw exception, stack, SQL, credential, connection string,
// sentinel value, or unnecessary host/path/infrastructure detail.
// ---------------------------------------------------------------------------

/** A raw operational failure carrying every class of protected detail. */
function rawOperationalFailure(): Error {
  const error = new Error(
    "Error: SC002_RAW_SENTINEL SELECT marker_key FROM foundation_persistence_marker " +
      "at mysql://songhealth_dev:secret@127.0.0.1:3306/songhealth_development " +
      "(/home/thanakorn/dev/songhealth/apps/server/src/health.ts:1:1)",
  );
  error.stack = "Error: SC002_RAW_SENTINEL\n    at Object.handler (/tmp/x.js:1:1)";
  return error;
}

describe("T014 · safe 500 operational failures", () => {
  it("GET /health/live maps an operational failure to a safe 500 SafeDiagnostic", async () => {
    const { app } = await buildApp({
      livenessProbe: vi.fn(async () => {
        throw rawOperationalFailure();
      }),
    });

    const response = await app.inject({ method: "GET", url: "/health/live" });

    expect(response.statusCode).toBe(500);
    expect(response.headers["content-type"]).toContain("application/json");
    const body = bodyOf(response);
    assertExactKeys(body, SAFE_DIAGNOSTIC_KEYS, "safe diagnostic");
    assertClosedDiagnostic(body, "OPERATIONAL_FAILURE");
    assertNoRawLeak(body);
    assertNoRawLeak(response.payload);
  });

  it("GET /health/ready maps an operational failure to a safe 500 SafeDiagnostic", async () => {
    const { app } = await buildApp({
      getDatabaseReadiness: vi.fn(async (): Promise<DatabaseReadiness> => {
        throw rawOperationalFailure();
      }),
    });

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(500);
    expect(response.headers["content-type"]).toContain("application/json");
    const body = bodyOf(response);
    assertExactKeys(body, SAFE_DIAGNOSTIC_KEYS, "safe diagnostic");
    assertClosedDiagnostic(body, "OPERATIONAL_FAILURE");
    assertNoRawLeak(body);
    assertNoRawLeak(response.payload);
  });

  it("repeated operational failures are deterministically safe", async () => {
    const { app } = await buildApp({
      livenessProbe: vi.fn(async () => {
        throw rawOperationalFailure();
      }),
    });

    const first = await app.inject({ method: "GET", url: "/health/live" });
    const second = await app.inject({ method: "GET", url: "/health/live" });

    expect(first.statusCode).toBe(500);
    expect(second.statusCode).toBe(500);
    expect(second.json()).toEqual(first.json());
    assertNoRawLeak(second.payload);
  });
});

// ---------------------------------------------------------------------------
// Closed wire schemas (FR-010; foundation-http.openapi.yaml
// additionalProperties: false). Every serialized success, component, and
// error body must reject or strip undeclared fields and keep the OpenAPI
// wire field `name` with its exact two-component cardinality authoritative.
// ---------------------------------------------------------------------------

describe("T014 · closed wire schemas", () => {
  it("every success and error body carries no undeclared field", async () => {
    const { app } = await buildApp();

    const live = await app.inject({ method: "GET", url: "/health/live" });
    assertExactKeys(bodyOf(live), LIVENESS_KEYS, "liveness");

    const ready = await app.inject({ method: "GET", url: "/health/ready" });
    const readyBody = bodyOf(ready);
    assertExactKeys(readyBody, READINESS_KEYS, "readiness");
    for (const component of readyBody.components as Record<string, unknown>[]) {
      assertExactKeys(component, COMPONENT_KEYS, "component");
    }
  });

  it("every not-ready body carries no undeclared field, including its diagnostic", async () => {
    for (const testCase of NOT_READY_CASES) {
      const { app } = await buildApp({
        getDatabaseReadiness: vi.fn(testCase.readiness),
      });
      const response = await app.inject({ method: "GET", url: "/health/ready" });
      const body = bodyOf(response);
      assertExactKeys(body, READINESS_KEYS, "readiness");
      for (const component of body.components as Record<string, unknown>[]) {
        assertExactKeys(component, COMPONENT_KEYS, "component");
        if (component.diagnostic !== undefined) {
          assertExactKeys(
            component.diagnostic as Record<string, unknown>,
            SAFE_DIAGNOSTIC_KEYS,
            "diagnostic",
          );
        }
      }
      assertNoRawLeak(body);
    }
  });

  it("uses the OpenAPI wire field `name` (not an internal field) for component identity", async () => {
    const { app } = await buildApp();

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    const body = bodyOf(response);
    for (const component of body.components as Record<string, unknown>[]) {
      expect(typeof component.name).toBe("string");
      // The internal observation identity is not a wire field.
      expect("component" in component).toBe(false);
    }
  });

  it("a ready component never carries a diagnostic and a not-ready component always does", async () => {
    const readyApp = await buildApp();
    const readyResponse = await readyApp.app.inject({ method: "GET", url: "/health/ready" });
    for (const component of bodyOf(readyResponse).components as Record<string, unknown>[]) {
      expect(component.status).toBe("ready");
      expect("diagnostic" in component).toBe(false);
    }

    for (const testCase of NOT_READY_CASES) {
      const notReadyApp = await buildApp({
        getDatabaseReadiness: vi.fn(testCase.readiness),
      });
      const notReadyResponse = await notReadyApp.app.inject({
        method: "GET",
        url: "/health/ready",
      });
      for (const component of bodyOf(notReadyResponse).components as Record<string, unknown>[]) {
        if (component.status === "not-ready") {
          expect(component.diagnostic).toBeDefined();
        } else {
          expect("diagnostic" in component).toBe(false);
        }
      }
    }
  });
});

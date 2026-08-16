/**
 * T009 — Failing (red) tests for the T010 runtime configuration contract.
 *
 * References: FR-005–FR-008, SC-004; data-model.md §Execution Context /
 * §Runtime Configuration / §Safe Diagnostic; plan.md §Configuration and
 * startup; research.md Decision 6; contracts/foundation-operations.md
 * (Configuration examples, Safe diagnostic contract);
 * contracts/foundation-http.openapi.yaml (SafeDiagnostic schema);
 * quickstart.md §3.
 *
 * This suite pins the behavior contract that `apps/server/src/config.ts`
 * (T010) must satisfy. It imports `loadRuntimeConfiguration` from `./config.js`,
 * which does not exist yet; the expected red result is that unresolved import,
 * not a syntax, discovery, fixture, or toolchain error.
 *
 * Pinned contract for T010:
 *   loadRuntimeConfiguration(
 *     env: Record<string, string | undefined>,   // environment values; never process.env
 *     operationTarget: "development" | "verification", // command-boundary input (--target)
 *     work: { createDatabasePool, bindListener, startChildService } // fail-before-work seam
 *   ) ->
 *     | { status: "accepted"; configuration: RuntimeConfiguration; diagnosticScope: "daily" | "verification" }
 *     | { status: "rejected"; diagnostic: SafeDiagnostic }
 *
 * RuntimeConfiguration carries exactly the eleven Runtime Configuration fields
 * (environment, runtimeProfile, operationTarget, host, port, publicOrigin,
 * databaseUrl, databasePoolMax, proxyPolicy, logLevel, fixtureProvenance) with
 * port/databasePoolMax parsed to numbers. `diagnosticScope` is derived output
 * context on the accepted outcome — never a configuration field. A rejected
 * outcome carries the closed SafeDiagnostic: reasonCode, diagnosticScope,
 * component, optional allowlisted configurationKey, remediation — no extra
 * fields, no free-form message, no supplied values.
 */

import { describe, expect, it, vi } from "vitest";
import { loadRuntimeConfiguration } from "./config.js";

type WorkBoundary = {
  createDatabasePool: () => void;
  bindListener: () => void;
  startChildService: () => void;
};

type SafeDiagnosticShape = {
  reasonCode: string;
  diagnosticScope: string;
  component: string;
  configurationKey?: string;
  remediation: string;
};

type Outcome =
  | {
      status: "accepted";
      configuration: Record<string, unknown>;
      diagnosticScope: string;
    }
  | { status: "rejected"; diagnostic: SafeDiagnosticShape };

const ALLOWLISTED_CONFIGURATION_KEYS = [
  "APP_ENVIRONMENT",
  "RUNTIME_PROFILE",
  "APP_HOST",
  "APP_PORT",
  "PUBLIC_ORIGIN",
  "DATABASE_URL",
  "DATABASE_POOL_MAX",
  "PROXY_POLICY",
  "LOG_LEVEL",
  "FIXTURE_PROVENANCE",
];

/** Closed Runtime Configuration field set (data-model.md §Runtime Configuration). */
const CONFIGURATION_FIELDS = [
  "environment",
  "runtimeProfile",
  "operationTarget",
  "host",
  "port",
  "publicOrigin",
  "databaseUrl",
  "databasePoolMax",
  "proxyPolicy",
  "logLevel",
  "fixtureProvenance",
];

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

/** Valid Production-like Verification context (mirrors .env.verification.example). */
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

function makeWork(): WorkBoundary {
  return {
    createDatabasePool: vi.fn(),
    bindListener: vi.fn(),
    startChildService: vi.fn(),
  };
}

/**
 * Target-valid credentials carrying a unique sentinel password. The credential stays
 * valid for its operation target (same user, host, and database name); only the
 * password is a per-case sentinel used to prove nondisclosure. Keeping the sentinel
 * here — rather than in the origin or as a clobbered override — means every fixture
 * is single-fault: the sentinel never itself becomes a second invalid dimension.
 */
function devCredential(sentinel: string): string {
  return `mysql://songhealth_dev:${sentinel}@127.0.0.1:3306/songhealth_development`;
}

function verCredential(sentinel: string): string {
  return `mysql://songhealth_ver:${sentinel}@songhealth-db:3306/songhealth_verification`;
}

function assertNoWorkStarted(work: WorkBoundary): void {
  expect(work.createDatabasePool).not.toHaveBeenCalled();
  expect(work.bindListener).not.toHaveBeenCalled();
  expect(work.startChildService).not.toHaveBeenCalled();
}

/** Exact and encoded forms of a forbidden value (quickstart.md §3). */
function encodedForms(value: string): string[] {
  return [
    value,
    encodeURIComponent(value),
    Buffer.from(value, "utf8").toString("base64"),
  ];
}

/**
 * Nondisclosure scan over the serialized failure surface: no supplied values
 * (exact or encoded), no URLs/paths (no "/" in any allowlisted field), no
 * exception or stack text.
 */
function assertNoForbiddenContent(outcome: Outcome, forbiddenValues: string[]): void {
  const serialized = JSON.stringify(outcome);
  for (const value of forbiddenValues) {
    for (const form of encodedForms(value)) {
      expect(serialized, `forbidden content leaked: ${form}`).not.toContain(form);
    }
  }
  expect(serialized).not.toContain("/");
  expect(serialized).not.toContain("Error");
  expect(serialized).not.toContain("stack");
}

/** Assert the closed SafeDiagnostic shape and the expected field values. */
function assertClosedDiagnostic(
  outcome: Outcome,
  expected: {
    reasonCode: string;
    diagnosticScope: string;
    component: string;
    remediation: string;
    /** Exact expected key, or "allowlisted" to accept any allowlisted key or absence. */
    configurationKey: string | "allowlisted";
  },
): SafeDiagnosticShape {
  expect(outcome.status).toBe("rejected");
  if (outcome.status !== "rejected") {
    throw new Error("unreachable");
  }
  const diagnostic = outcome.diagnostic;
  const expectedKeys = ["component", "diagnosticScope", "reasonCode", "remediation"];
  if (expected.configurationKey !== "allowlisted" || diagnostic.configurationKey !== undefined) {
    expectedKeys.push("configurationKey");
  }
  expect(Object.keys(diagnostic).sort()).toEqual(expectedKeys.sort());
  expect(diagnostic.reasonCode).toBe(expected.reasonCode);
  expect(diagnostic.diagnosticScope).toBe(expected.diagnosticScope);
  expect(diagnostic.component).toBe(expected.component);
  expect(diagnostic.remediation).toBe(expected.remediation);
  if (expected.configurationKey === "allowlisted") {
    if (diagnostic.configurationKey !== undefined) {
      expect(ALLOWLISTED_CONFIGURATION_KEYS).toContain(diagnostic.configurationKey);
    }
  } else {
    expect(diagnostic.configurationKey).toBe(expected.configurationKey);
  }
  return diagnostic;
}

describe("configuration rejection classes (FR-006, FR-007)", () => {
  const rejectionClassCases = [
    {
      name: "missing required key",
      mutate: (env: Record<string, string>) => {
        delete env.APP_PORT;
      },
      reasonCode: "CONFIG_MISSING",
      configurationKey: "APP_PORT" as const,
    },
    {
      name: "empty required value",
      mutate: (env: Record<string, string>) => {
        env.APP_PORT = "";
      },
      reasonCode: "CONFIG_EMPTY",
      configurationKey: "APP_PORT" as const,
    },
    {
      name: "malformed value",
      mutate: (env: Record<string, string>) => {
        env.APP_PORT = "forty,173";
      },
      reasonCode: "CONFIG_MALFORMED",
      configurationKey: "APP_PORT" as const,
    },
    {
      name: "unsupported enum value",
      mutate: (env: Record<string, string>) => {
        env.LOG_LEVEL = "chatty";
      },
      reasonCode: "CONFIG_UNSUPPORTED",
      configurationKey: "LOG_LEVEL" as const,
    },
    {
      name: "out-of-range value",
      mutate: (env: Record<string, string>) => {
        env.APP_PORT = "70000";
      },
      reasonCode: "CONFIG_OUT_OF_RANGE",
      configurationKey: "APP_PORT" as const,
    },
    {
      name: "forbidden identity combination",
      mutate: (env: Record<string, string>) => {
        env.APP_ENVIRONMENT = "production";
      },
      reasonCode: "CONFIG_IDENTITY_CONFLICT",
      configurationKey: "APP_ENVIRONMENT" as const,
    },
  ];

  it.each(rejectionClassCases)("$name -> $reasonCode", ({ mutate, reasonCode, configurationKey }) => {
    // Single-fault: the base is target-valid; only `mutate` introduces the named
    // invalid condition. The sentinel rides in the (otherwise valid) credential.
    const sentinel = `SH_T009_${reasonCode.toLowerCase()}_k7q2`;
    const env: Record<string, string> = { ...DEV_BASE, DATABASE_URL: devCredential(sentinel) };
    mutate(env);
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    assertClosedDiagnostic(outcome, {
      reasonCode,
      diagnosticScope: "daily",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey,
    });
    assertNoWorkStarted(work);
    assertNoForbiddenContent(outcome, [sentinel, env.DATABASE_URL]);
  });
});

describe("identity dimension conflicts (FR-008)", () => {
  // Each case starts from a target-valid base (its own environment/profile/proxy/origin/
  // credential) and introduces exactly one named conflict. The sentinel rides in the
  // target-appropriate credential so it never itself becomes a second fault.
  const identityConflictCases = [
    {
      name: "Production environment is not selectable locally",
      base: DEV_BASE,
      credential: devCredential,
      overrides: { APP_ENVIRONMENT: "production" },
      target: "development" as const,
      scope: "daily",
    },
    {
      name: "Staging environment is not selectable locally",
      base: DEV_BASE,
      credential: devCredential,
      overrides: { APP_ENVIRONMENT: "staging" },
      target: "development" as const,
      scope: "daily",
    },
    {
      name: "hosted runtime profile is not selectable locally",
      base: DEV_BASE,
      credential: devCredential,
      overrides: { RUNTIME_PROFILE: "hosted" },
      target: "development" as const,
      scope: "daily",
    },
    {
      // Single fault: only RUNTIME_PROFILE is the verification value, which the
      // development target forbids. The base keeps its target-valid PROXY_POLICY
      // (none) untouched — proxy policy is a separate validated field, so it must
      // not be overridden here or it would be a second independent conflict.
      name: "verification profile with development target",
      base: DEV_BASE,
      credential: devCredential,
      overrides: { RUNTIME_PROFILE: "verification" },
      target: "development" as const,
      scope: "daily",
    },
    {
      // Single fault: only RUNTIME_PROFILE is the daily value, which the
      // verification target forbids. The base keeps its target-valid PROXY_POLICY
      // (one-hop) untouched — proxy policy is a separate validated field, so it
      // must not be overridden here or it would be a second independent conflict.
      name: "daily profile with verification target",
      base: VER_BASE,
      credential: verCredential,
      overrides: { RUNTIME_PROFILE: "daily" },
      target: "verification" as const,
      scope: "verification",
    },
    {
      name: "one-hop proxy policy with development target",
      base: DEV_BASE,
      credential: devCredential,
      overrides: { PROXY_POLICY: "one-hop" },
      target: "development" as const,
      scope: "daily",
    },
    {
      name: "verification credentials with development target",
      base: DEV_BASE,
      credential: verCredential,
      overrides: {},
      target: "development" as const,
      scope: "daily",
    },
  ];

  it.each(identityConflictCases)(
    "$name -> CONFIG_IDENTITY_CONFLICT",
    ({ base, credential, overrides, target, scope }) => {
      const sentinel = "SH_T009_IDENTITY_j9c3";
      const env: Record<string, string> = {
        ...base,
        DATABASE_URL: credential(sentinel),
        ...overrides,
      };
      const work = makeWork();

      const outcome = loadRuntimeConfiguration(env, target, work);

      assertClosedDiagnostic(outcome, {
        reasonCode: "CONFIG_IDENTITY_CONFLICT",
        diagnosticScope: scope,
        component: "configuration",
        remediation: "FIX_CONFIGURATION",
        configurationKey: "allowlisted",
      });
      assertNoWorkStarted(work);
      assertNoForbiddenContent(outcome, [sentinel, env.DATABASE_URL]);
    },
  );
});

describe("identity dimension mappings (FR-008)", () => {
  it("Development maps to development/daily/development/daily", () => {
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(DEV_BASE, "development", work);

    expect(outcome.status).toBe("accepted");
    if (outcome.status !== "accepted") {
      throw new Error("unreachable");
    }
    expect(outcome.configuration.environment).toBe("development");
    expect(outcome.configuration.runtimeProfile).toBe("daily");
    expect(outcome.configuration.operationTarget).toBe("development");
    expect(outcome.diagnosticScope).toBe("daily");
    expect(Object.keys(outcome.configuration).sort()).toEqual(
      [...CONFIGURATION_FIELDS].sort(),
    );
    expect(outcome.configuration.port).toBe(4173);
    expect(outcome.configuration.databasePoolMax).toBe(5);
    expect(outcome.configuration.proxyPolicy).toBe("none");
  });

  it("Verification maps to development/verification/verification/verification", () => {
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(VER_BASE, "verification", work);

    expect(outcome.status).toBe("accepted");
    if (outcome.status !== "accepted") {
      throw new Error("unreachable");
    }
    expect(outcome.configuration.environment).toBe("development");
    expect(outcome.configuration.runtimeProfile).toBe("verification");
    expect(outcome.configuration.operationTarget).toBe("verification");
    expect(outcome.diagnosticScope).toBe("verification");
    expect(outcome.configuration.proxyPolicy).toBe("one-hop");
  });

  it("operationTarget in the environment record is not a configuration key; the command boundary wins", () => {
    const env: Record<string, string> = {
      ...DEV_BASE,
      OPERATION_TARGET: "verification",
    };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    expect(outcome.status).toBe("accepted");
    if (outcome.status !== "accepted") {
      throw new Error("unreachable");
    }
    expect(outcome.configuration.operationTarget).toBe("development");
    expect(outcome.diagnosticScope).toBe("daily");
  });

  it("diagnosticScope supplied as configuration cannot override the derived scope", () => {
    const env: Record<string, string> = {
      ...DEV_BASE,
      DIAGNOSTIC_SCOPE: "foundation",
    };
    delete env.APP_PORT;
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_MISSING",
      diagnosticScope: "daily",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: "APP_PORT",
    });
    assertNoWorkStarted(work);
  });
});

describe("fixture provenance policy (FR-005)", () => {
  const provenanceCases = [
    { value: "synthetic", accepted: true },
    { value: "approved-non-production", accepted: true },
    { value: "production-derived", accepted: false },
    { value: "sanitized-production", accepted: false },
  ];

  it.each(provenanceCases)("FIXTURE_PROVENANCE=$value", ({ value, accepted }) => {
    const env: Record<string, string> = { ...DEV_BASE, FIXTURE_PROVENANCE: value };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    if (accepted) {
      expect(outcome.status).toBe("accepted");
      if (outcome.status === "accepted") {
        expect(outcome.configuration.fixtureProvenance).toBe(value);
      }
    } else {
      assertClosedDiagnostic(outcome, {
        reasonCode: "CONFIG_UNSUPPORTED",
        diagnosticScope: "daily",
        component: "configuration",
        remediation: "FIX_CONFIGURATION",
        configurationKey: "FIXTURE_PROVENANCE",
      });
      assertNoWorkStarted(work);
    }
  });
});

describe("fail-before-work and Verification-target diagnostics (SC-004)", () => {
  it("empty required value on the Verification target rejects with the verification scope before work", () => {
    // Single-fault: the base is verification-valid; only APP_PORT is empty. The
    // sentinel rides in the (otherwise valid) verification credential.
    const sentinel = "SH_T009_VER_EMPTY_m4x9";
    const env: Record<string, string> = {
      ...VER_BASE,
      APP_PORT: "",
      DATABASE_URL: verCredential(sentinel),
    };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "verification", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_EMPTY",
      diagnosticScope: "verification",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: "APP_PORT",
    });
    assertNoWorkStarted(work);
    assertNoForbiddenContent(outcome, [sentinel, env.DATABASE_URL]);
  });
});

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
import { loadRuntimeConfiguration, SAFE_DIAGNOSTIC_SCHEMA } from "./config.js";

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
  const identityConflictCases: {
    name: string;
    base: Record<string, string>;
    credential: (sentinel: string) => string;
    overrides: Record<string, string>;
    target: "development" | "verification";
    scope: "daily" | "verification";
  }[] = [
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

describe("T010 rework: target isolation, fail-closed grammar, and command target", () => {
  it("a remote/Production-like database host cannot satisfy the Development target", () => {
    // Single fault: the database hostname is an internal/remote host (not loopback)
    // while the credential and database identities are the Development ones.
    const env: Record<string, string> = {
      ...DEV_BASE,
      DATABASE_URL: "mysql://songhealth_dev:dev-only-placeholder@db.internal:3306/songhealth_development",
    };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_IDENTITY_CONFLICT",
      diagnosticScope: "daily",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: "DATABASE_URL",
    });
    assertNoWorkStarted(work);
    assertNoForbiddenContent(outcome, [env.DATABASE_URL]);
  });

  it.each([
    { name: "host with embedded port", value: "127.0.0.1:4173" },
    { name: "host with surrounding whitespace", value: " 127.0.0.1" },
    { name: "host that is a URL", value: "http://127.0.0.1" },
  ])("malformed APP_HOST ($name) is rejected", ({ value }) => {
    const env: Record<string, string> = { ...DEV_BASE, APP_HOST: value };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_MALFORMED",
      diagnosticScope: "daily",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: "APP_HOST",
    });
    assertNoWorkStarted(work);
  });

  it.each([
    {
      name: "non-loopback host on the Development target",
      base: DEV_BASE,
      value: "songhealth-app",
      target: "development" as const,
      scope: "daily" as const,
    },
    {
      name: "loopback host on the Verification target",
      base: VER_BASE,
      value: "127.0.0.1",
      target: "verification" as const,
      scope: "verification" as const,
    },
  ])("target-inappropriate APP_HOST ($name) is rejected", ({ base, value, target, scope }) => {
    const env: Record<string, string> = { ...base, APP_HOST: value };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, target, work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_IDENTITY_CONFLICT",
      diagnosticScope: scope,
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: "APP_HOST",
    });
    assertNoWorkStarted(work);
  });

  const fakeLoopbackCases: {
    name: string;
    base: Record<string, string>;
    overrides: Record<string, string>;
    target: "development" | "verification";
    scope: "daily" | "verification";
    key: string;
  }[] = [
    {
      name: "fake loopback DNS name as APP_HOST",
      base: DEV_BASE,
      overrides: { APP_HOST: "127.example.com" },
      target: "development",
      scope: "daily",
      key: "APP_HOST",
    },
    {
      name: "fake loopback DNS name as PUBLIC_ORIGIN",
      base: DEV_BASE,
      overrides: { PUBLIC_ORIGIN: "http://127.fake.example:4173" },
      target: "development",
      scope: "daily",
      key: "PUBLIC_ORIGIN",
    },
  ];

  it.each(fakeLoopbackCases)("fake loopback DNS ($name) is not treated as loopback", ({ base, overrides, target, scope, key }) => {
    const env: Record<string, string> = { ...base, ...overrides };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, target, work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_IDENTITY_CONFLICT",
      diagnosticScope: scope,
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: key,
    });
    assertNoWorkStarted(work);
  });

  it.each([
    {
      name: "origin port differs from APP_PORT",
      base: DEV_BASE,
      overrides: { PUBLIC_ORIGIN: "http://127.0.0.1:9999" },
    },
    {
      name: "origin host differs from APP_HOST",
      base: DEV_BASE,
      overrides: { PUBLIC_ORIGIN: "http://localhost:4173" },
    },
  ])("origin not bound to the selected target ($name) is rejected", ({ base, overrides }) => {
    const env: Record<string, string> = { ...base, ...overrides };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_IDENTITY_CONFLICT",
      diagnosticScope: "daily",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: "PUBLIC_ORIGIN",
    });
    assertNoWorkStarted(work);
  });

  it.each([
    { name: "exponent notation", value: "1e2" },
    { name: "hexadecimal notation", value: "0x10" },
    { name: "leading whitespace", value: " 4173" },
    { name: "signed value", value: "+4173" },
  ])("non-decimal APP_PORT ($name) is malformed, not parsed", ({ value }) => {
    const env: Record<string, string> = { ...DEV_BASE, APP_PORT: value };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_MALFORMED",
      diagnosticScope: "daily",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: "APP_PORT",
    });
    assertNoWorkStarted(work);
  });

  it("non-decimal DATABASE_POOL_MAX is malformed, not parsed", () => {
    const env: Record<string, string> = { ...DEV_BASE, DATABASE_POOL_MAX: "1e2" };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_MALFORMED",
      diagnosticScope: "daily",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: "DATABASE_POOL_MAX",
    });
    assertNoWorkStarted(work);
  });

  it.each(["production", "staging", "hosted", "daily", ""]) (
    "unsupported command target %j returns a foundation-scoped CONFIG_UNSUPPORTED without configurationKey",
    (target) => {
      const work = makeWork();

      const outcome = loadRuntimeConfiguration(DEV_BASE, target, work);

      // "allowlisted" with no key present asserts the closed diagnostic carries
      // NO configurationKey (the command target is not an environment key).
      assertClosedDiagnostic(outcome, {
        reasonCode: "CONFIG_UNSUPPORTED",
        diagnosticScope: "foundation",
        component: "configuration",
        remediation: "FIX_CONFIGURATION",
        configurationKey: "allowlisted",
      });
      // The command target is not an environment key: the diagnostic must carry
      // no configurationKey at all.
      if (outcome.status === "rejected") {
        expect(outcome.diagnostic.configurationKey).toBeUndefined();
      }
      assertNoWorkStarted(work);
    },
  );
});

describe("T010 rework round 2: fail-closed URL grammar, exact target identities, full reason-code allowlist", () => {
  // R01: raw URL values must be rejected when whitespace-normalized or when an
  // origin carries userinfo, a non-root path, query/fragment, or a
  // target-inappropriate scheme. These are format faults -> CONFIG_MALFORMED.
  const malformedUrlCases: {
    name: string;
    key: "DATABASE_URL" | "PUBLIC_ORIGIN";
    value: string;
  }[] = [
    {
      name: "leading-whitespace database URL",
      key: "DATABASE_URL",
      value: " mysql://songhealth_dev:dev-only-placeholder@127.0.0.1:3306/songhealth_development",
    },
    {
      name: "trailing-whitespace database URL",
      key: "DATABASE_URL",
      value: "mysql://songhealth_dev:dev-only-placeholder@127.0.0.1:3306/songhealth_development ",
    },
    {
      name: "HTTPS development origin",
      key: "PUBLIC_ORIGIN",
      value: "https://127.0.0.1:4173",
    },
    {
      name: "origin with userinfo",
      key: "PUBLIC_ORIGIN",
      value: "http://user@127.0.0.1:4173",
    },
    {
      name: "origin with non-root path",
      key: "PUBLIC_ORIGIN",
      value: "http://127.0.0.1:4173/app",
    },
    {
      name: "origin with query",
      key: "PUBLIC_ORIGIN",
      value: "http://127.0.0.1:4173?x=1",
    },
    {
      name: "origin with fragment",
      key: "PUBLIC_ORIGIN",
      value: "http://127.0.0.1:4173#frag",
    },
  ];

  it.each(malformedUrlCases)("malformed URL ($name) is rejected", ({ key, value }) => {
    const env: Record<string, string> = { ...DEV_BASE, [key]: value };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_MALFORMED",
      diagnosticScope: "daily",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: key,
    });
    assertNoWorkStarted(work);
    assertNoForbiddenContent(outcome, [value]);
  });

  // R02: bracketed ordinary hostnames are not valid host forms and cannot evade
  // loopback classification -> CONFIG_MALFORMED.
  it.each([
    { name: "bracketed ordinary hostname", value: "[songhealth-app]" },
    { name: "bracketed IPv4", value: "[127.0.0.1]" },
  ])("bracketed non-IPv6 APP_HOST ($name) is malformed", ({ value }) => {
    const env: Record<string, string> = { ...DEV_BASE, APP_HOST: value };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "development", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_MALFORMED",
      diagnosticScope: "daily",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: "APP_HOST",
    });
    assertNoWorkStarted(work);
  });

  // R02: Verification hosts must remain the exact approved local target
  // identities, not arbitrary Production-like endpoints.
  const verificationIdentityCases: {
    name: string;
    key: "APP_HOST" | "DATABASE_URL" | "PUBLIC_ORIGIN";
    overrides: Record<string, string>;
  }[] = [
    {
      name: "arbitrary Production-like application host",
      key: "APP_HOST",
      overrides: { APP_HOST: "prod-frontend" },
    },
    {
      name: "arbitrary Production-like database host",
      key: "DATABASE_URL",
      overrides: {
        DATABASE_URL:
          "mysql://songhealth_ver:ver-only-placeholder@db.prod.example.com:3306/songhealth_verification",
      },
    },
    {
      name: "arbitrary Production-like origin host",
      key: "PUBLIC_ORIGIN",
      overrides: { PUBLIC_ORIGIN: "http://prod.example.com" },
    },
  ];

  it.each(verificationIdentityCases)("Verification rejects $name", ({ key, overrides }) => {
    const env: Record<string, string> = { ...VER_BASE, ...overrides };
    const work = makeWork();

    const outcome = loadRuntimeConfiguration(env, "verification", work);

    assertClosedDiagnostic(outcome, {
      reasonCode: "CONFIG_IDENTITY_CONFLICT",
      diagnosticScope: "verification",
      component: "configuration",
      remediation: "FIX_CONFIGURATION",
      configurationKey: key,
    });
    assertNoWorkStarted(work);
  });

  // R03: the closed Safe Diagnostic schema carries the complete routed
  // reason-code allowlist (foundation-http.openapi.yaml SafeDiagnostic), not
  // only the CONFIG_* codes.
  it("SAFE_DIAGNOSTIC_SCHEMA carries the full routed reason-code allowlist", () => {
    const reasonCodeNode = SAFE_DIAGNOSTIC_SCHEMA.properties.reasonCode as {
      anyOf?: { const?: string }[];
      allOf?: { const?: string }[];
    };
    const members = reasonCodeNode.anyOf ?? reasonCodeNode.allOf ?? [];
    const reasonCodes = members.map((m) => m.const as string);

    const expected = [
      "OPERATIONAL_FAILURE",
      "BUILD_FAILED",
      "STARTUP_FAILED",
      "CONFIG_MISSING",
      "CONFIG_EMPTY",
      "CONFIG_MALFORMED",
      "CONFIG_UNSUPPORTED",
      "CONFIG_OUT_OF_RANGE",
      "CONFIG_IDENTITY_CONFLICT",
      "CONFIG_REJECTION_NOT_ENFORCED",
      "DATABASE_UNAVAILABLE",
      "MIGRATION_FAILED",
      "MIGRATIONS_PENDING",
      "MIGRATION_STATUS_FAILED",
      "LIVENESS_FAILED",
      "READINESS_FAILED",
      "ISOLATION_FAILED",
      "PROXY_CONTRACT_FAILED",
      "ROUTE_UNREACHABLE",
      "OPERATION_INTERRUPTED",
      "RESOURCE_OWNERSHIP_UNPROVEN",
      "RESOURCE_INVENTORY_CHANGED",
      "DATA_INTEGRITY_UNPROVEN",
      "DATA_RECONSTRUCTIBILITY_UNPROVEN",
      "NON_DESTRUCTIVE_REPAIR_UNAVAILABLE",
      "MANUAL_REVIEW_REQUIRED",
      "PREREQUISITE_FAILED",
      "CLEANUP_FAILED",
      "REPORT_INVALID",
      "REPORT_EMISSION_FAILED",
      "SECRET_SCANNER_FAILED",
      "COMMITTED_SECRET_DETECTED",
      "DEPENDENCY_FINDING_UNREVIEWED",
      "DEPENDENCY_FINDING_BLOCKING",
      "DEPENDENCY_EXCEPTION_EXPIRED",
      "DEPENDENCY_EVIDENCE_MISMATCH",
      "ASVS_EVIDENCE_INCOMPLETE",
    ];
    expect([...reasonCodes].sort()).toEqual([...expected].sort());
  });
});

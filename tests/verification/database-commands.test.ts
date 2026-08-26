/**
 * T036 — explicit database command adapter contract for `db:status` and
 * `db:migrate`.
 *
 * References: FR-003–FR-004, FR-009; contracts/foundation-operations.md
 * §Commands (`db:status` / `db:migrate`) and §Safe diagnostic contract;
 * data-model.md §Migration State; plan.md §Persistence and migrations;
 * quickstart.md §4; accepted T013 read-only status boundary
 * `apps/server/src/migrations.ts` (`getMigrationStatus` / `applyMigrations`);
 * accepted T010 canonical configuration boundary `apps/server/src/config.ts`;
 * Constitution Principles I–VI (esp. I security by design, II smallest
 * correct change, V proportionate verification).
 *
 * This suite pins the T036 behavior of the operations module's two database
 * command adapters, driven through DETERMINISTIC INJECTED collaborators
 * (configuration source, database adapter, output surfaces). No real
 * Podman/Compose is invoked, no real process is started or stopped, no
 * listener is bound, no network request is made, no host resource is
 * mutated, and no real engine is depended on — the real-engine migration
 * boundary itself is proven by the accepted T011 real-engine suite.
 *
 * Pinned contract (Operations Contract §Commands):
 *   - `db:status` reports `current` or `pending` as its successful report
 *     states and NEVER applies migrations: with a pending state the command
 *     still only READS — the apply adapter, the database lifecycle adapters,
 *     and every destructive/mutating facet stay uninvoked.
 *   - The safe-failure migration states refuse non-zero with their closed
 *     Migration State reason codes: `unavailable` → `DATABASE_UNAVAILABLE`,
 *     `error` → `MIGRATION_STATUS_FAILED`. An unobservable status (a missing
 *     adapter facet, a throwing adapter, or a value outside the closed
 *     vocabulary) is the status-failure refusal — never a fabricated state
 *     and never a raw adapter error.
 *   - `db:migrate` explicitly applies tracked migrations through the adapter
 *     that owns the ordered migration inventory (no caller-supplied version
 *     list) and reports the applied version-controlled names; the apply is
 *     adapter-idempotent, so a repeated explicit apply reports no newly
 *     applied migration while still going through the adapter. A failed
 *     apply refuses with the closed `MIGRATION_FAILED` code.
 *   - Both commands validate the selectable local operation target FIRST —
 *     an absent, unknown, or hosted/Production-shaped target refuses before
 *     any configuration or adapter work — and then the bounded local
 *     execution identity: a hosted/Production environment, a mismatched
 *     (cross-target) runtime profile, a Production-derived fixture
 *     provenance, and a missing or canonically rejected configuration each
 *     refuse BEFORE any adapter work with the canonical closed diagnostic.
 *   - Every refusal is emitted only as closed Safe Diagnostics on the
 *     command output surfaces: the allowlisted fields and nothing else, with
 *     no configuration value, credential, connection string, or raw adapter
 *     output in exact or encoded form.
 *
 * This suite adds no T037+ command-adapter coverage (status/inventory/
 * interruption/recovery/reset/persistence-check exposure), no Product
 * migration content, and no real-engine evidence.
 */

import { describe, expect, it } from "vitest";
import type { FoundationOperationsCollaborators } from "../../scripts/foundation-operations.mjs";
import { dbStatus, dbMigrate } from "../../scripts/foundation-operations.mjs";

// ---------------------------------------------------------------------------
// Synthetic, non-secret inputs. No real port, credential, connection string,
// or external tool output appears here.
// ---------------------------------------------------------------------------

/**
 * A safe Development daily configuration (synthetic, non-secret): the
 * canonical committed Development identity shape. The DATABASE_URL value is
 * a unique sentinel so nondisclosure assertions can scan every emitted
 * surface for it in exact and encoded form.
 */
const SENTINEL_DATABASE_URL =
  "mysql://songhealth_dev:synthetic-db-url-sentinel-7d31@127.0.0.1:3306/songhealth_development";

const SAFE_DEV_CONFIG = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "daily",
  APP_HOST: "127.0.0.1",
  APP_PORT: "10443",
  PUBLIC_ORIGIN: "http://127.0.0.1:10443",
  DATABASE_URL: SENTINEL_DATABASE_URL,
  DATABASE_POOL_MAX: "4",
  PROXY_POLICY: "none",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
} as const;

/** One emitted output unit, with the surface it was emitted onto. */
interface EmittedUnit {
  surface: string;
  unit: unknown;
}

/** Coherent shared state for the database adapter fake. */
interface DbState {
  running: boolean;
  migrationState: "current" | "pending" | "unavailable" | "error" | string;
  /** Names the NEXT apply reports as executed; emptied once applied. */
  pendingNames: string[];
  applyCount: number;
  failApply: boolean;
  /** The status observation throws instead of returning (unobservable). */
  statusThrows: boolean;
  /** The status observation returns an out-of-vocabulary value. */
  statusValue: string | null;
}

/**
 * Build one coherent set of injected collaborators around shared state and a
 * chronological event trace. The returned `collaborators` object is the
 * exact object every operation under test receives; tests mutate it (or the
 * shared state behind it) directly, so every observation handle stays the
 * exact collaborator actually used. Only the facets the two database
 * commands read have behavior; every other facet records its invocation as
 * an event so any unintended coupling is observable.
 */
function makeCollaborators() {
  const events: string[] = [];
  const dbState: DbState = {
    running: true,
    migrationState: "current",
    pendingNames: ["001-foundation-persistence-marker"],
    applyCount: 0,
    failApply: false,
    statusThrows: false,
    statusValue: null,
  };
  const configState = {
    profile: "daily" as "daily" | "verification",
    overrides: {} as Record<string, string>,
    loadThrows: false,
    carriedDiagnostic: null as Record<string, string> | null,
  };
  const emitted: EmittedUnit[] = [];

  const collaborators: FoundationOperationsCollaborators = {
    preflight: {
      node: async () => true,
      npm: async () => true,
      podman: async () => true,
      compose: async () => true,
      requiredFiles: async () => true,
      safeConfig: async () => true,
      portAvailable: async () => true,
    },
    database: {
      start: async () => {
        events.push("database:start");
      },
      stop: async () => {
        events.push("database:stop");
      },
      isRunning: async () => dbState.running,
      applyMigrations: async (): Promise<void | readonly string[]> => {
        dbState.applyCount += 1;
        events.push("migrate:applied");
        if (dbState.failApply) {
          throw new Error("synthetic-apply-failure:sentinel-raw-error");
        }
        const applied = [...dbState.pendingNames];
        dbState.pendingNames = [];
        dbState.migrationState = "current";
        return applied;
      },
      migrationStatus: async () => {
        events.push("migrations:status");
        if (dbState.statusThrows) {
          throw new Error("synthetic-status-failure:sentinel-raw-error");
        }
        // The cast models an adapter whose observed value may fall outside
        // the closed vocabulary (the out-of-vocabulary refusal case): the
        // operation, not the fake's type, must refuse it.
        return (dbState.statusValue ?? dbState.migrationState) as
          | "current"
          | "pending"
          | "unavailable"
          | "error";
      },
      deleteVolume: async () => {
        events.push("database:deleteVolume");
      },
    },
    processes: {
      start: async (name: string) => {
        events.push(`process:start:${name}`);
      },
      stop: async (name: string) => {
        events.push(`process:stop:${name}`);
      },
      isRunning: async (name: string) => {
        events.push(`process:isRunning:${name}`);
        return false;
      },
    },
    readiness: {
      probe: async () => {
        events.push("readiness:probe");
        return { ready: true, components: {} };
      },
    },
    clock: {
      now: () => 0,
      advance: async () => {},
    },
    config: {
      load: async () => {
        events.push("config:load");
        if (configState.loadThrows) {
          throw new Error("synthetic-configuration-absent");
        }
        if (configState.carriedDiagnostic !== null) {
          throw Object.assign(new Error("canonical configuration rejection"), {
            diagnostic: { ...configState.carriedDiagnostic },
          });
        }
        return {
          ...SAFE_DEV_CONFIG,
          RUNTIME_PROFILE: configState.profile,
          ...configState.overrides,
        };
      },
    },
    inventory: {
      inspect: async (target: string) => {
        events.push(`inventory:inspect:${target}`);
        return [];
      },
    },
    assessment: {
      evaluate: async (target: string) => {
        events.push(`assessment:evaluate:${target}`);
        return { reconstructibilityConfirmed: false, disposabilityConfirmed: false };
      },
    },
    lock: {
      acquire: async (target: string) => {
        events.push(`lock:acquire:${target}`);
        return false;
      },
      release: async (target: string) => {
        events.push(`lock:release:${target}`);
      },
    },
    confirmation: {
      issue: async (target: string, action: string) => {
        events.push(`confirmation:issue:${target}:${action}`);
        return "synthetic-token";
      },
      verify: async (target: string, action: string) => {
        events.push(`confirmation:verify:${target}:${action}`);
        return false;
      },
    },
    mutation: {
      removeExactResource: async (logicalKey: string) => {
        events.push(`mutation:removeExact:${logicalKey}`);
      },
      removeByPrefix: async (prefix: string) => {
        events.push(`mutation:forbidden:removeByPrefix:${prefix}`);
      },
      removeByWildcard: async (pattern: string) => {
        events.push(`mutation:forbidden:removeByWildcard:${pattern}`);
      },
      removeByLabelFilter: async (label: string) => {
        events.push(`mutation:forbidden:removeByLabelFilter:${label}`);
      },
      downWithRemoveOrphans: async () => {
        events.push("mutation:forbidden:downWithRemoveOrphans");
      },
      downWithVolumes: async () => {
        events.push("mutation:forbidden:downWithVolumes");
      },
      prune: async () => {
        events.push("mutation:forbidden:prune");
      },
      forceRemove: async () => {
        events.push("mutation:forbidden:forceRemove");
      },
      removeBroadVolumes: async () => {
        events.push("mutation:forbidden:removeBroadVolumes");
      },
      removeWithUnresolvedVariables: async () => {
        events.push("mutation:forbidden:removeWithUnresolvedVariables");
      },
    },
    output: {
      stdout: async (unit: unknown) => {
        emitted.push({ surface: "stdout", unit });
      },
      stderr: async (unit: unknown) => {
        emitted.push({ surface: "stderr", unit });
      },
      applicationLog: async (record: unknown) => {
        emitted.push({ surface: "applicationLog", unit: record });
      },
      httpFailure: async (response: unknown) => {
        emitted.push({ surface: "httpFailure", unit: response });
      },
    },
  };

  return { collaborators, events, dbState, configState, emitted };
}

type Harness = ReturnType<typeof makeCollaborators>;

/**
 * Prove the report/read-only invariant: the ONLY adapter work a successful
 * `db:status` performs is the single read-only status observation — no
 * apply, no database lifecycle, no process, readiness, lock, confirmation,
 * mutation, or inventory work of any kind.
 */
function expectStatusReadOnly(harness: Harness): void {
  expect(harness.events).toEqual(["config:load", "migrations:status"]);
  expect(harness.dbState.applyCount).toBe(0);
}

/**
 * Prove the pre-work refusal invariant: the configuration was never even
 * loaded and no adapter work of any kind occurred.
 */
function expectNoWorkAtAll(harness: Harness): void {
  expect(harness.events).toEqual([]);
  expect(harness.dbState.applyCount).toBe(0);
}

/**
 * Prove the identity-refusal invariant: the configuration was read (the
 * identity gate needs it) but no adapter work followed.
 */
function expectRefusedBeforeAdapterWork(harness: Harness): void {
  expect(harness.events).toEqual(["config:load"]);
  expect(harness.dbState.applyCount).toBe(0);
}

/** Assert one emitted unit is exactly a closed Safe Diagnostic. */
function expectClosedDiagnostic(unit: unknown): void {
  expect(unit).not.toBeNull();
  expect(typeof unit).toBe("object");
  const diagnostic = unit as Record<string, unknown>;
  const allowed = ["reasonCode", "diagnosticScope", "component", "remediation", "configurationKey"];
  for (const key of Object.keys(diagnostic)) {
    expect(allowed).toContain(key);
  }
  for (const key of ["reasonCode", "diagnosticScope", "component", "remediation"]) {
    expect(typeof diagnostic[key]).toBe("string");
  }
  if ("configurationKey" in diagnostic) {
    expect(typeof diagnostic.configurationKey).toBe("string");
  }
}

/**
 * Every emitted unit on every surface is a closed Safe Diagnostic, and the
 * synthetic configuration sentinel is absent from every surface in exact AND
 * encoded form (the nondisclosure invariant).
 */
function expectClosedNondisclosingEmission(harness: Harness): void {
  expect(harness.emitted.length).toBeGreaterThan(0);
  for (const { unit } of harness.emitted) {
    expectClosedDiagnostic(unit);
  }
  const serialized = JSON.stringify(harness.emitted);
  expect(serialized).not.toContain("synthetic-db-url-sentinel-7d31");
  expect(serialized).not.toContain(
    encodeURIComponent("synthetic-db-url-sentinel-7d31"),
  );
  expect(serialized).not.toContain("sentinel-raw-error");
}

// ---------------------------------------------------------------------------
// db:status — the non-mutating explicit migration-state report.
// ---------------------------------------------------------------------------

describe("Database command adapters — T036", () => {
  it("db:status reports current as a successful read-only report", async () => {
    const harness = makeCollaborators();
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(0);
    expect(result.migrationState).toBe("current");
    expect(result.diagnosticScope).toBe("daily");
    expect(result.reasonCode).toBeUndefined();
    expectStatusReadOnly(harness);
    // A successful report emits no diagnostic at all.
    expect(harness.emitted).toEqual([]);
  });

  it("db:status reports pending without applying it — the report never mutates", async () => {
    const harness = makeCollaborators();
    harness.dbState.migrationState = "pending";
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(0);
    expect(result.migrationState).toBe("pending");
    // The pending state is still there — reporting it changed nothing.
    expect(harness.dbState.migrationState).toBe("pending");
    expect(harness.dbState.pendingNames).toEqual(["001-foundation-persistence-marker"]);
    expectStatusReadOnly(harness);
    expect(harness.emitted).toEqual([]);
  });

  it("db:status refuses the unavailable state with the closed DATABASE_UNAVAILABLE diagnostic", async () => {
    const harness = makeCollaborators();
    harness.dbState.migrationState = "unavailable";
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("DATABASE_UNAVAILABLE");
    expect(result.diagnosticScope).toBe("daily");
    expect(result.component).toBe("database");
    expect(result.remediation).toBe("CHECK_DATABASE");
    expect(result.migrationState).toBeUndefined();
    expectStatusReadOnly(harness);
    // Refusal is emitted on both command surfaces only (never the
    // application-log or HTTP-failure surfaces a started application owns).
    expect(harness.emitted.map((e) => e.surface).sort()).toEqual(["stderr", "stdout"]);
    expectClosedNondisclosingEmission(harness);
  });

  it("db:status refuses the error state with the closed MIGRATION_STATUS_FAILED diagnostic", async () => {
    const harness = makeCollaborators();
    harness.dbState.migrationState = "error";
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("MIGRATION_STATUS_FAILED");
    expect(result.diagnosticScope).toBe("daily");
    expect(result.component).toBe("database");
    expect(result.remediation).toBe("RETRY_SAFE_OPERATION");
    expectStatusReadOnly(harness);
    expectClosedNondisclosingEmission(harness);
  });

  it("db:status refuses a throwing status observation as the closed status-failure refusal — never a fabricated state or raw error", async () => {
    const harness = makeCollaborators();
    harness.dbState.statusThrows = true;
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("MIGRATION_STATUS_FAILED");
    expect(result.migrationState).toBeUndefined();
    expectStatusReadOnly(harness);
    expectClosedNondisclosingEmission(harness);
  });

  it("db:status refuses a missing status facet the same closed way", async () => {
    const harness = makeCollaborators();
    const collaborators = {
      ...harness.collaborators,
      database: { ...harness.collaborators.database },
    } as FoundationOperationsCollaborators;
    delete (collaborators.database as { migrationStatus?: unknown }).migrationStatus;

    const result = await dbStatus(collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("MIGRATION_STATUS_FAILED");
  });

  it("db:status refuses an out-of-vocabulary status value instead of reporting it", async () => {
    const harness = makeCollaborators();
    harness.dbState.statusValue = "mostly-fine";
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("MIGRATION_STATUS_FAILED");
    expect(result.migrationState).toBeUndefined();
    expectClosedNondisclosingEmission(harness);
  });

  it("db:status reports the Verification target under its own scope when the identity matches", async () => {
    const harness = makeCollaborators();
    harness.configState.profile = "verification";
    const result = await dbStatus(harness.collaborators, "verification");

    expect(result.exitCode).toBe(0);
    expect(result.migrationState).toBe("current");
    expect(result.diagnosticScope).toBe("verification");
    expectStatusReadOnly(harness);
  });

  it("db:status refuses an absent, unknown, or hosted-shaped target before any configuration or adapter work", async () => {
    for (const target of [undefined, "production", "hosted", "staging", ""]) {
      const harness = makeCollaborators();
      const result = await dbStatus(harness.collaborators, target as string);

      expect(result.exitCode).toBe(1);
      expect(result.reasonCode).toBe("OPERATIONAL_FAILURE");
      expect(result.diagnosticScope).toBe("foundation");
      expect(result.component).toBe("orchestration");
      expect(result.remediation).toBe("CHECK_PREREQUISITES");
      expectNoWorkAtAll(harness);
      expectClosedNondisclosingEmission(harness);
    }
  });

  it("db:status refuses the hosted runtime profile before any adapter work", async () => {
    const harness = makeCollaborators();
    harness.configState.overrides.RUNTIME_PROFILE = "hosted";
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("CONFIG_IDENTITY_CONFLICT");
    expect(result.configurationKey).toBe("RUNTIME_PROFILE");
    expect(result.diagnosticScope).toBe("daily");
    expectRefusedBeforeAdapterWork(harness);
    expectClosedNondisclosingEmission(harness);
  });

  it("db:status refuses the Production environment before any adapter work", async () => {
    const harness = makeCollaborators();
    harness.configState.overrides.APP_ENVIRONMENT = "production";
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("CONFIG_IDENTITY_CONFLICT");
    expect(result.configurationKey).toBe("APP_ENVIRONMENT");
    expectRefusedBeforeAdapterWork(harness);
    expectClosedNondisclosingEmission(harness);
  });

  it("db:status refuses a cross-target invocation — the other target's profile against the requested target", async () => {
    const harness = makeCollaborators();
    harness.configState.profile = "daily";
    const result = await dbStatus(harness.collaborators, "verification");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("CONFIG_IDENTITY_CONFLICT");
    expect(result.configurationKey).toBe("RUNTIME_PROFILE");
    expect(result.diagnosticScope).toBe("verification");
    expectRefusedBeforeAdapterWork(harness);
    expectClosedNondisclosingEmission(harness);
  });

  it("db:status refuses a Production-derived fixture provenance before any adapter work", async () => {
    const harness = makeCollaborators();
    harness.configState.overrides.FIXTURE_PROVENANCE = "production-derived";
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("CONFIG_UNSUPPORTED");
    expect(result.configurationKey).toBe("FIXTURE_PROVENANCE");
    expectRefusedBeforeAdapterWork(harness);
    expectClosedNondisclosingEmission(harness);
  });

  it("db:status refuses a missing local configuration with the documented missing-configuration rejection", async () => {
    const harness = makeCollaborators();
    harness.configState.loadThrows = true;
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("CONFIG_MISSING");
    expect(result.component).toBe("configuration");
    expect(result.remediation).toBe("FIX_CONFIGURATION");
    expectClosedNondisclosingEmission(harness);
  });

  it("db:status refuses with exactly the carried canonical rejection diagnostic", async () => {
    const harness = makeCollaborators();
    harness.configState.carriedDiagnostic = {
      reasonCode: "CONFIG_IDENTITY_CONFLICT",
      diagnosticScope: "daily",
      component: "configuration",
      configurationKey: "DATABASE_URL",
      remediation: "FIX_CONFIGURATION",
    };
    const result = await dbStatus(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("CONFIG_IDENTITY_CONFLICT");
    expect(result.configurationKey).toBe("DATABASE_URL");
    expect(result.component).toBe("configuration");
    expect(result.remediation).toBe("FIX_CONFIGURATION");
    expectRefusedBeforeAdapterWork(harness);
    expectClosedNondisclosingEmission(harness);
  });

  // -------------------------------------------------------------------------
  // db:migrate — the standalone explicit tracked-migration apply.
  // -------------------------------------------------------------------------

  it("db:migrate explicitly applies tracked migrations through the adapter and reports the applied names", async () => {
    const harness = makeCollaborators();
    const result = await dbMigrate(harness.collaborators, "development");

    expect(result.exitCode).toBe(0);
    expect(result.diagnosticScope).toBe("daily");
    expect(result.appliedMigrations).toEqual(["001-foundation-persistence-marker"]);
    expect(harness.events).toEqual(["config:load", "migrate:applied"]);
    expect(harness.dbState.applyCount).toBe(1);
    expect(harness.dbState.migrationState).toBe("current");
    expect(harness.emitted).toEqual([]);
  });

  it("db:migrate applies to the Verification target under its own scope when the identity matches", async () => {
    const harness = makeCollaborators();
    harness.configState.profile = "verification";
    const result = await dbMigrate(harness.collaborators, "verification");

    expect(result.exitCode).toBe(0);
    expect(result.diagnosticScope).toBe("verification");
    expect(harness.dbState.applyCount).toBe(1);
  });

  it("db:migrate is adapter-idempotent — a repeated explicit apply goes through the adapter and reports no newly applied migration", async () => {
    const harness = makeCollaborators();
    const first = await dbMigrate(harness.collaborators, "development");
    const second = await dbMigrate(harness.collaborators, "development");

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    expect(first.appliedMigrations).toEqual(["001-foundation-persistence-marker"]);
    expect(second.appliedMigrations).toEqual([]);
    // Both invocations went through the explicit apply boundary.
    expect(harness.dbState.applyCount).toBe(2);
    expect(harness.events).toEqual([
      "config:load",
      "migrate:applied",
      "config:load",
      "migrate:applied",
    ]);
  });

  it("db:migrate starts, stops, and deletes nothing besides the explicit apply", async () => {
    const harness = makeCollaborators();
    await dbMigrate(harness.collaborators, "development");

    // The explicit apply is the ONLY adapter work: no database lifecycle, no
    // processes, no readiness probe, no lock/confirmation/mutation/inventory.
    expect(harness.events).toEqual(["config:load", "migrate:applied"]);
  });

  it("db:migrate refuses a failed apply with the closed MIGRATION_FAILED diagnostic", async () => {
    const harness = makeCollaborators();
    harness.dbState.failApply = true;
    const result = await dbMigrate(harness.collaborators, "development");

    expect(result.exitCode).toBe(1);
    expect(result.reasonCode).toBe("MIGRATION_FAILED");
    expect(result.diagnosticScope).toBe("daily");
    expect(result.component).toBe("migration");
    expect(result.remediation).toBe("RUN_MIGRATION");
    expect(harness.dbState.applyCount).toBe(1);
    expectClosedNondisclosingEmission(harness);
  });

  it("db:migrate refuses an absent, unknown, or hosted-shaped target before any configuration or adapter work", async () => {
    for (const target of [undefined, "production", "hosted", ""]) {
      const harness = makeCollaborators();
      const result = await dbMigrate(harness.collaborators, target as string);

      expect(result.exitCode).toBe(1);
      expect(result.reasonCode).toBe("OPERATIONAL_FAILURE");
      expect(result.diagnosticScope).toBe("foundation");
      expectNoWorkAtAll(harness);
      expect(harness.dbState.applyCount).toBe(0);
      expectClosedNondisclosingEmission(harness);
    }
  });

  it("db:migrate refuses hosted, Production-environment, cross-target, Production-derived, and missing configurations before the apply", async () => {
    const cases: Array<{
      label: string;
      profile?: "daily" | "verification";
      overrides?: Record<string, string>;
      loadThrows?: boolean;
      target?: string;
      reasonCode: string;
      configurationKey?: string;
    }> = [
      {
        label: "hosted runtime profile",
        overrides: { RUNTIME_PROFILE: "hosted" },
        reasonCode: "CONFIG_IDENTITY_CONFLICT",
        configurationKey: "RUNTIME_PROFILE",
      },
      {
        label: "Production environment",
        overrides: { APP_ENVIRONMENT: "production" },
        reasonCode: "CONFIG_IDENTITY_CONFLICT",
        configurationKey: "APP_ENVIRONMENT",
      },
      {
        label: "cross-target profile",
        profile: "daily",
        target: "verification",
        reasonCode: "CONFIG_IDENTITY_CONFLICT",
        configurationKey: "RUNTIME_PROFILE",
      },
      {
        label: "Production-derived fixture provenance",
        overrides: { FIXTURE_PROVENANCE: "production-derived" },
        reasonCode: "CONFIG_UNSUPPORTED",
        configurationKey: "FIXTURE_PROVENANCE",
      },
      {
        label: "missing local configuration",
        loadThrows: true,
        reasonCode: "CONFIG_MISSING",
      },
    ];
    for (const testCase of cases) {
      const harness = makeCollaborators();
      if (testCase.profile !== undefined) harness.configState.profile = testCase.profile;
      if (testCase.overrides !== undefined) {
        harness.configState.overrides = { ...testCase.overrides };
      }
      if (testCase.loadThrows === true) harness.configState.loadThrows = true;

      const result = await dbMigrate(
        harness.collaborators,
        testCase.target ?? "development",
      );

      expect(result.exitCode).toBe(1);
      expect(result.reasonCode).toBe(testCase.reasonCode);
      if (testCase.configurationKey !== undefined) {
        expect(result.configurationKey).toBe(testCase.configurationKey);
      }
      // The refusal precedes the apply in every case.
      expect(harness.dbState.applyCount).toBe(0);
      expect(harness.events).toEqual(["config:load"]);
      expectClosedNondisclosingEmission(harness);
    }
  });
});

/**
 * T019 — Failing preflight and daily setup/start/ready/stop/restart command
 * contract tests (rework for T019-B01, T019-B02, T019-B03).
 *
 * References: FR-003, FR-006, SC-001; User Story 1 and Edge Cases;
 * contracts/foundation-operations.md §Prerequisites / §Commands /
 * §Configuration examples / §Safe diagnostic contract / §Failure behavior /
 * §Timing boundaries; plan.md §Technical Context (Constraints/Scale) /
 * §Project Structure / §Configuration and startup / §Operations and
 * verification / §Testing and security evidence; quickstart.md
 * §Prerequisites and timing boundaries and §1; Delivery Context approved
 * Development/Podman boundary, explicit out-of-scope boundary, and
 * security/privacy routing; System Blueprint §§334–340, §§697–703;
 * Constitution Principles I–VI (esp. III traceability, V proportionate
 * verification); accepted root `package.json`, `tsconfig.json`, and
 * `eslint.config.js`.
 *
 * This is the tests-first contract for the single planned operations
 * boundary `scripts/foundation-operations.mjs` (implemented by T027–T029).
 * It imports that module and drives the six daily commands —
 * `foundation:check`, `dev:setup`, `dev:start`, `dev:ready`, `dev:stop`, and
 * `dev:restart` — through DETERMINISTIC INJECTED/FAKE collaborators for
 * preflight checks, process supervision, readiness probing, clock,
 * configuration, and the Development database. No real Podman/Compose is
 * invoked, no real process is started or stopped, no listener is bound, no
 * network request is made, no host resource is mutated, and no machine state
 * is depended on.
 *
 * T019-B01: the operation under test always receives the exact
 * `collaborators` object this suite holds, and tests mutate that same object
 * (or the coherent shared state behind it), so every observation handle is
 * the exact collaborator actually used — an override can never leave an
 * assertion pointed at a stale default. The database fakes share one state
 * object (`dbState`): `start` flips `running`, `stop` is observed through
 * `stopCount` (never through the start mock), and `isRunning` reads the same
 * state. The fake clock actually advances. Stop/restart tests establish a
 * genuinely running precondition through the adapter, then snapshot the
 * counters and event index and assert only the operation's deltas — never
 * cumulative counters as though the precondition did not happen.
 *
 * T019-B02: successful preflight proves EVERY routed check category ran
 * (Node, npm, Podman, Compose, required files, safe configuration, port) and
 * that no service work occurred; each preflight failure proves the failing
 * check ran and that no later database, migration, native-process,
 * readiness, or destructive work occurred. The whole daily readiness
 * contract models database, liveness, readiness, Public, Admin, and server
 * route components; partial readiness and bounded timeout both fail. Setup
 * and restart sequencing is proven through a shared chronological event
 * trace recorded by the fakes in call order; the restart order check
 * inspects only the operation's event slice (the trace after the
 * precondition snapshot), so precondition events cannot contaminate the
 * ordering proof.
 *
 * T019-B03: no invented migration version values and no undocumented relative
 * ordering among the native processes. Only routed invariants are asserted:
 * the database starts before migrations are applied, the documented stop
 * phase precedes the start phase on restart, and set membership of the
 * server/Public/Admin processes. Explicit migration application takes no
 * caller-supplied version list — the migration inventory stays owned by the
 * accepted migration boundary (`apps/server/src/migrations.ts`,
 * `applyMigrations(db)`), and the fake records only a generic applied
 * event/result. The process adapter owns idempotency (starting/stopping an
 * already-running/stopped process is a no-op with no duplicate effect) and
 * exposes an observable `isRunning` query, so repeat-safe startup is
 * representable without hidden state in the operations module across
 * separate command invocations.
 *
 * Pinned contract:
 *   - `foundation:check` checks Node/npm, Podman plus Compose, required
 *     files, safe Development configuration, and port availability WITHOUT
 *     performing any service work;
 *   - `dev:setup` validates the `development`/`daily` identity BEFORE any
 *     work, then starts only the database dependency and explicitly applies
 *     tracked migrations;
 *   - `dev:start` starts the database when needed plus the native
 *     server/Public/Admin processes, and repeated invocation creates no
 *     duplicate process or resource;
 *   - `dev:ready` polls bounded readiness and route/component checks,
 *     succeeding only when the WHOLE daily foundation is ready and remaining
 *     failed for partial readiness or timeout;
 *   - `dev:stop` is repeat-safe, stopping native processes and the
 *     Development database container WITHOUT deleting its named volume;
 *   - `dev:restart` uses the documented stop/start order while preserving
 *     Development data.
 *
 * Prerequisite, configuration, port, setup, startup, migration, and
 * readiness failures return a non-zero, actionable result and prevent later
 * work. Only the contract-named reason codes are asserted
 * (`CONFIG_IDENTITY_CONFLICT` for forbidden identity combinations); other
 * failures are asserted as non-zero with a safe reason code present, and
 * detailed SafeDiagnostic/nondisclosure assertions are intentionally left
 * for T023.
 *
 * The four execution identities (`environment`, `runtimeProfile`,
 * `operationTarget`, `diagnosticScope`) stay distinct, and hosted/Production
 * is never modeled as a selectable local target. No real port, external tool
 * output, wall-clock sleep, or the 20-minute SC-001 acceptance run is
 * hard-coded: T039 owns the real end-to-end SC-001 timing proof.
 *
 * EXPECTED RED: the only reason this suite fails is that the T027–T029
 * `./foundation-operations.mjs` implementation boundary does not exist yet.
 * The failure is a module-resolution error for that one intentionally absent
 * module — not a syntax, discovery, dependency, fixture, forced-failure, or
 * real-tool error.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  OperationResult,
  FoundationOperationsCollaborators,
} from "./foundation-operations.mjs";
import {
  foundationCheck,
  devSetup,
  devStart,
  devReady,
  devStop,
  devRestart,
} from "./foundation-operations.mjs";

// ---------------------------------------------------------------------------
// Synthetic, non-secret inputs. No real port, credential, connection string,
// or external tool output appears here.
// ---------------------------------------------------------------------------

/** The three native daily processes (routed set; no relative order claimed). */
const NATIVE_PROCESSES = ["server", "public", "admin"] as const;

/**
 * The whole daily readiness contract (quickstart §1): database, liveness,
 * readiness, and the Public, Admin, and server route checks.
 */
const READY_COMPONENTS = {
  database: "ready",
  liveness: "ready",
  readiness: "ready",
  publicRoute: "ready",
  adminRoute: "ready",
  serverRoute: "ready",
} as const;

/** A safe Development daily configuration (synthetic, non-secret). */
const SAFE_DEV_CONFIG = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "daily",
  APP_HOST: "127.0.0.1",
  APP_PORT: "10443",
  PUBLIC_ORIGIN: "http://127.0.0.1:10443",
  DATABASE_URL: "mysql://dev-user:dev-password@127.0.0.1:13306/songhealth_dev",
  DATABASE_POOL_MAX: "4",
  PROXY_POLICY: "none",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
} as const;

/** Coherent shared state for the database collaborator fakes. */
interface DbState {
  running: boolean;
  startCount: number;
  stopCount: number;
  /** Generic result of explicit migration application; version inventory is
   * owned by the accepted migration boundary, not this operations layer. */
  migrationsApplied: boolean;
  volumeDeleted: boolean;
}

/**
 * Coherent shared state for the process supervisor fakes. The adapter owns
 * idempotency: `start`/`stop` are no-ops when the process is already in the
 * target state, so no duplicate resource/effect can be recorded regardless of
 * how many separate command invocations occur.
 */
interface ProcessState {
  running: Set<string>;
  /** Actual start effects (idempotent no-ops are not counted). */
  startCount: Record<string, number>;
}

interface Harness {
  /** The exact collaborator object the operation under test receives. */
  collaborators: FoundationOperationsCollaborators;
  /** Chronological trace of work events, recorded by the fakes in call order. */
  events: string[];
  dbState: DbState;
  processState: ProcessState;
}

/**
 * Build a fully-passing set of injected collaborators around one coherent
 * state object and one chronological event trace. The returned
 * `collaborators` object is the exact object the operation under test
 * receives; tests mutate it (or the shared state) directly, so an override
 * can never leave an assertion pointed at a stale default.
 */
function makeCollaborators(): Harness {
  const events: string[] = [];
  const dbState: DbState = {
    running: false,
    startCount: 0,
    stopCount: 0,
    migrationsApplied: false,
    volumeDeleted: false,
  };
  const processState: ProcessState = { running: new Set(), startCount: {} };
  let clockTime = 0;

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
      // Adapter-owned idempotency: starting a running database (or stopping a
      // stopped one) is a no-op with no duplicate resource/effect.
      start: async () => {
        if (dbState.running) return;
        dbState.running = true;
        dbState.startCount += 1;
        events.push("database:start");
      },
      stop: async () => {
        if (!dbState.running) return;
        dbState.running = false;
        dbState.stopCount += 1;
        events.push("database:stop");
      },
      isRunning: async () => dbState.running,
      // No caller-supplied version list: the migration inventory is owned by
      // the accepted migration boundary, so the fake records only a generic
      // applied event/result.
      applyMigrations: async () => {
        dbState.migrationsApplied = true;
        events.push("migrate:applied");
      },
      deleteVolume: async () => {
        dbState.volumeDeleted = true;
        events.push("database:deleteVolume");
      },
    },
    processes: {
      // Adapter-owned idempotency: starting a running process (or stopping a
      // stopped one) is a no-op with no duplicate resource/effect.
      start: async (name: string) => {
        if (processState.running.has(name)) return;
        processState.running.add(name);
        processState.startCount[name] = (processState.startCount[name] ?? 0) + 1;
        events.push(`process:start:${name}`);
      },
      stop: async (name: string) => {
        if (!processState.running.has(name)) return;
        processState.running.delete(name);
        events.push(`process:stop:${name}`);
      },
      isRunning: async (name: string) => processState.running.has(name),
    },
    readiness: {
      probe: async () => ({ ready: true, components: { ...READY_COMPONENTS } }),
    },
    clock: {
      now: () => clockTime,
      advance: (ms: number) => {
        clockTime += ms;
      },
    },
    config: {
      load: async () => ({ ...SAFE_DEV_CONFIG }),
    },
  };

  return { collaborators, events, dbState, processState };
}

/**
 * Prove that NO service work occurred: no work event was recorded and the
 * shared database/process state is untouched.
 */
function expectNoWork(harness: Harness): void {
  const { events, dbState, processState } = harness;
  expect(events).toEqual([]);
  expect(dbState.running).toBe(false);
  expect(dbState.startCount).toBe(0);
  expect(dbState.stopCount).toBe(0);
  expect(dbState.migrationsApplied).toBe(false);
  expect(dbState.volumeDeleted).toBe(false);
  expect(processState.running.size).toBe(0);
  expect(processState.startCount).toEqual({});
}

/**
 * Snapshot the observation state after a precondition is established so the
 * command under test can be asserted by DELTA only. Clearing observation
 * data (counts, event trace) does not change resource state (the adapter's
 * running sets are untouched), so the precondition remains genuinely in
 * effect for the operation under test.
 */
function snapshotObservation(harness: Harness): void {
  const { dbState, processState } = harness;
  dbState.startCount = 0;
  dbState.stopCount = 0;
  processState.startCount = {};
  harness.events.length = 0;
}

describe("Foundation daily operations — T019 (tests-first for T027–T029)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // foundation:check — preflight, no service work
  // -------------------------------------------------------------------------

  it("foundation:check passes when every preflight category is clean — and performs no service work", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;
    const nodeSpy = vi.spyOn(collaborators.preflight, "node");
    const npmSpy = vi.spyOn(collaborators.preflight, "npm");
    const podmanSpy = vi.spyOn(collaborators.preflight, "podman");
    const composeSpy = vi.spyOn(collaborators.preflight, "compose");
    const filesSpy = vi.spyOn(collaborators.preflight, "requiredFiles");
    const configSpy = vi.spyOn(collaborators.preflight, "safeConfig");
    const portSpy = vi.spyOn(collaborators.preflight, "portAvailable");

    const result: OperationResult = await foundationCheck(collaborators);

    // Every routed preflight category was checked.
    expect(nodeSpy).toHaveBeenCalled();
    expect(npmSpy).toHaveBeenCalled();
    expect(podmanSpy).toHaveBeenCalled();
    expect(composeSpy).toHaveBeenCalled();
    expect(filesSpy).toHaveBeenCalled();
    expect(configSpy).toHaveBeenCalled();
    expect(portSpy).toHaveBeenCalled();

    // Preflight passes and performs no service work.
    expect(result.exitCode).toBe(0);
    expectNoWork(harness);
  });

  it.each([
    ["node", "node"],
    ["npm", "npm"],
    ["podman", "podman"],
    ["compose", "compose"],
    ["required files", "requiredFiles"],
    ["safe configuration", "safeConfig"],
    ["port availability", "portAvailable"],
  ] as const)(
    "foundation:check fails non-zero and prevents all later work when %s is unavailable",
    async (_label, check) => {
      const harness = makeCollaborators();
      const { collaborators } = harness;
      collaborators.preflight[check] = async () => false;
      const failingCheckSpy = vi.spyOn(collaborators.preflight, check);
      const probeSpy = vi.spyOn(collaborators.readiness, "probe");

      const result = await foundationCheck(collaborators);

      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBeTruthy();
      // The failing category was actually checked.
      expect(failingCheckSpy).toHaveBeenCalled();
      // No later database, migration, native-process, readiness, or
      // destructive work occurs after a preflight failure.
      expectNoWork(harness);
      expect(probeSpy).not.toHaveBeenCalled();
    },
  );

  // -------------------------------------------------------------------------
  // dev:setup — identity validation, database-only start, explicit migrations
  // -------------------------------------------------------------------------

  it("dev:setup rejects a non-daily runtime profile before any work", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;
    collaborators.config = {
      load: async () => ({ ...SAFE_DEV_CONFIG, RUNTIME_PROFILE: "verification" }),
    };

    const result = await devSetup(collaborators, "development");

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("CONFIG_IDENTITY_CONFLICT");
    expectNoWork(harness);
  });

  it("dev:setup rejects a production environment before any work", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;
    collaborators.config = {
      load: async () => ({ ...SAFE_DEV_CONFIG, APP_ENVIRONMENT: "production" }),
    };

    const result = await devSetup(collaborators, "development");

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("CONFIG_IDENTITY_CONFLICT");
    expectNoWork(harness);
  });

  it("dev:setup starts only the database and applies tracked migrations after it is running", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, dbState, processState } = harness;

    const result = await devSetup(collaborators, "development");

    expect(result.exitCode).toBe(0);
    expect(dbState.running).toBe(true);
    expect(dbState.startCount).toBe(1);
    // Tracked migrations were explicitly applied (no caller-supplied version
    // list; the inventory stays owned by the accepted migration boundary).
    expect(dbState.migrationsApplied).toBe(true);
    // Routed ordering: the database starts before migrations are applied.
    const dbStartIndex = events.indexOf("database:start");
    const migrateIndex = events.indexOf("migrate:applied");
    expect(dbStartIndex).toBeGreaterThanOrEqual(0);
    expect(migrateIndex).toBeGreaterThan(dbStartIndex);
    // Only the database dependency runs in setup; no native process starts.
    expect(processState.running.size).toBe(0);
  });

  it("dev:setup fails non-zero on migration failure and starts no native process", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, processState } = harness;
    collaborators.database.applyMigrations = async () => {
      throw new Error("synthetic migration failure");
    };

    const result = await devSetup(collaborators, "development");

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    // The failure is preserved: no migration is recorded as applied.
    expect(dbState.migrationsApplied).toBe(false);
    expect(processState.running.size).toBe(0);
  });

  // -------------------------------------------------------------------------
  // dev:start — database when needed, native processes, no duplicates
  // -------------------------------------------------------------------------

  it("dev:start starts the database when needed plus all native processes, without applying migrations", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, processState } = harness;

    const result = await devStart(collaborators);

    expect(result.exitCode).toBe(0);
    expect(dbState.startCount).toBe(1);
    // Set membership: every native process is running, started exactly once.
    for (const name of NATIVE_PROCESSES) {
      expect(processState.startCount[name]).toBe(1);
      expect(await collaborators.processes.isRunning(name)).toBe(true);
    }
    // Ordinary startup does not auto-apply migrations (dev:setup's job).
    expect(dbState.migrationsApplied).toBe(false);
  });

  it("dev:start skips the database when it is already running", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, processState } = harness;
    // Precondition through the adapter: the database is already running.
    await collaborators.database.start();

    const result = await devStart(collaborators);

    expect(result.exitCode).toBe(0);
    // No duplicate database start: the count is unchanged from the precondition.
    expect(dbState.startCount).toBe(1);
    for (const name of NATIVE_PROCESSES) {
      expect(processState.startCount[name]).toBe(1);
      expect(await collaborators.processes.isRunning(name)).toBe(true);
    }
  });

  it("dev:start repeated invocation creates no duplicate process or resource", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, processState } = harness;

    const first = await devStart(collaborators);
    const second = await devStart(collaborators);

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    // No duplicate database start or native process effect across the two
    // separate invocations (adapter-owned idempotency, no hidden module state).
    expect(dbState.startCount).toBe(1);
    for (const name of NATIVE_PROCESSES) {
      expect(processState.startCount[name]).toBe(1);
      expect(await collaborators.processes.isRunning(name)).toBe(true);
    }
  });

  it("dev:start fails non-zero when a native process fails to start", async () => {
    const harness = makeCollaborators();
    const { collaborators, processState } = harness;
    collaborators.processes.start = async (name: string) => {
      if (name === "public") throw new Error("synthetic start failure");
      processState.running.add(name);
      processState.startCount[name] = (processState.startCount[name] ?? 0) + 1;
      harness.events.push(`process:start:${name}`);
    };

    const result = await devStart(collaborators);

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    // The failing process is not running.
    expect(await collaborators.processes.isRunning("public")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // dev:ready — bounded polling, whole-foundation readiness only
  // -------------------------------------------------------------------------

  it("dev:ready succeeds only when the whole daily foundation is ready", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;
    const probeSpy = vi.spyOn(collaborators.readiness, "probe");

    const result = await devReady(collaborators, { deadlineMs: 2000, pollMs: 500 });

    expect(result.exitCode).toBe(0);
    expect(result.ready).toBe(true);
    expect(probeSpy).toHaveBeenCalled();
  });

  it("dev:ready remains failed for partial readiness (one route component not ready)", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;
    collaborators.readiness = {
      probe: async () => ({
        ready: false,
        components: { ...READY_COMPONENTS, adminRoute: "not-ready" },
      }),
    };

    const result = await devReady(collaborators, { deadlineMs: 2000, pollMs: 500 });

    expect(result.exitCode).not.toBe(0);
    expect(result.ready).toBe(false);
  });

  it("dev:ready remains failed on timeout and stops polling at the bounded deadline", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;
    const probeSpy = vi
      .spyOn(collaborators.readiness, "probe")
      .mockResolvedValue({
        ready: false,
        components: { ...READY_COMPONENTS, database: "not-ready" },
      });

    const result = await devReady(collaborators, { deadlineMs: 1000, pollMs: 500 });

    expect(result.exitCode).not.toBe(0);
    expect(result.ready).toBe(false);
    // Bounded: polling used the injected clock up to the deadline and stopped.
    expect(collaborators.clock.now()).toBeGreaterThanOrEqual(1000);
    expect(probeSpy.mock.calls.length).toBeGreaterThan(0);
    expect(probeSpy.mock.calls.length).toBeLessThanOrEqual(3);
  });

  // -------------------------------------------------------------------------
  // dev:stop — repeat-safe, preserves the named volume
  // -------------------------------------------------------------------------

  it("dev:stop stops native processes and the database container without deleting its named volume", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, processState } = harness;
    // Precondition through the adapter: the daily runtime is up.
    await devStart(collaborators);
    snapshotObservation(harness);

    const result = await devStop(collaborators);

    expect(result.exitCode).toBe(0);
    // Stop behavior is observed through the stop collaborator, not the start
    // mock: the operation produces exactly one database stop-effect delta and
    // no start effect.
    expect(dbState.stopCount).toBe(1);
    expect(dbState.startCount).toBe(0);
    expect(dbState.running).toBe(false);
    for (const name of NATIVE_PROCESSES) {
      expect(await collaborators.processes.isRunning(name)).toBe(false);
      expect(processState.startCount[name] ?? 0).toBe(0);
    }
    // Routine stop never removes the Development volume (FR-004).
    expect(dbState.volumeDeleted).toBe(false);
  });

  it("dev:stop is safe to repeat", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, processState } = harness;

    // Precondition through the adapter: the daily runtime is up.
    await devStart(collaborators);
    snapshotObservation(harness);

    const first = await devStop(collaborators);
    // One stop-effect delta from the running state.
    expect(first.exitCode).toBe(0);
    expect(dbState.stopCount).toBe(1);
    const stopCountAfterFirst = dbState.stopCount;

    const second = await devStop(collaborators);

    expect(second.exitCode).toBe(0);
    // Repetition is safe: the second stop of already-stopped resources is a
    // no-op (no additional stop-effect delta), and the volume stays intact.
    expect(dbState.stopCount).toBe(stopCountAfterFirst);
    expect(dbState.running).toBe(false);
    for (const name of NATIVE_PROCESSES) {
      expect(await collaborators.processes.isRunning(name)).toBe(false);
    }
    expect(dbState.volumeDeleted).toBe(false);
  });

  // -------------------------------------------------------------------------
  // dev:restart — documented stop/start order, data preserved
  // -------------------------------------------------------------------------

  it("dev:restart performs the documented stop phase before the start phase and preserves Development data", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, processState } = harness;
    // Precondition through the adapter: the daily runtime is up.
    await devStart(collaborators);
    snapshotObservation(harness);

    const result = await devRestart(collaborators);

    expect(result.exitCode).toBe(0);
    // Set membership: every native process produced exactly one stop/start
    // effect delta by the restart itself, and is running again.
    for (const name of NATIVE_PROCESSES) {
      expect(processState.startCount[name]).toBe(1);
      expect(await collaborators.processes.isRunning(name)).toBe(true);
    }
    expect(dbState.stopCount).toBe(1);
    expect(dbState.startCount).toBe(1);
    // Routed ordering proven from the RESTART event slice only (the trace was
    // snapshotted after the precondition, so no precondition start event is
    // included): the LAST stop event precedes the FIRST start event
    // (documented stop/start sequence).
    const slice = harness.events;
    const stopIndices = slice
      .map((e, i) => (e === "database:stop" || e.startsWith("process:stop:") ? i : -1))
      .filter((i) => i >= 0);
    const startIndices = slice
      .map((e, i) => (e === "database:start" || e.startsWith("process:start:") ? i : -1))
      .filter((i) => i >= 0);
    expect(stopIndices.length).toBeGreaterThan(0);
    expect(startIndices.length).toBeGreaterThan(0);
    expect(Math.max(...stopIndices)).toBeLessThan(Math.min(...startIndices));
    // The named volume and its data survive restart (FR-004).
    expect(dbState.volumeDeleted).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Execution identities and non-selectable hosted/Production target
  // -------------------------------------------------------------------------

  it("dev:setup accepts the development target and performs its work", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState } = harness;

    const result = await devSetup(collaborators, "development");

    expect(result.exitCode).toBe(0);
    expect(dbState.running).toBe(true);
    expect(dbState.migrationsApplied).toBe(true);
  });

  it.each(["hosted", "production"] as const)(
    "dev:setup rejects %s as a non-selectable local operation target with no state delta",
    async (target) => {
      const harness = makeCollaborators();
      const { collaborators } = harness;

      const result = await devSetup(collaborators, target);

      // Hosted/Production is not selectable by local commands; the rejection
      // is non-zero with a safe reason code and performs no work.
      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBeTruthy();
      expectNoWork(harness);
    },
  );
});

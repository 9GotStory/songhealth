/**
 * T022 — Failing Development/Verification isolation, synthetic-marker
 * continuity, exact confirmed reset, and non-target inventory contract tests.
 *
 * References: FR-004, FR-008, SC-002; quickstart.md §2 (the documented
 * inventory/token/persistence-check/reset/inventory sequence);
 * contracts/foundation-operations.md §Commands (`foundation:inventory`,
 * `dev:persistence-check`, `dev:restart`) / §Configuration examples /
 * §Safe diagnostic contract (reason-code allowlist only) /
 * §Operation-target ownership and isolation; data-model.md §Data Store /
 * §Synthetic Persistence Marker / §Owned Runtime Resource /
 * §Resource Inventory / §State Transitions; plan.md §Persistence and
 * migrations / §Operations and verification; Delivery Context approved
 * Development/Verification isolation routing, approved decisions to preserve,
 * and security/privacy routing; Constitution Principles I–VI (esp. I security,
 * IV privacy and data minimization, V proportionate verification); accepted
 * T019–T021 harness and collaborator contracts.
 *
 * This is the tests-first contract for the T029–T031/T035/T037 boundary of
 * the single planned operations module `scripts/foundation-operations.mjs`.
 * It drives the quickstart §2 surface — `foundation:inventory` (normalized
 * before/after inventories with the non-target digest, plus the action-bound
 * reset token), the orchestrated `dev:persistence-check` (synthetic marker
 * write, routine restart proof, inventory-confirmed reset, prior-marker
 * absence and migration-readiness proofs, non-target comparison), and the
 * routine `dev:restart` path — through DETERMINISTIC INJECTED/FAKE
 * collaborators for preflight checks, process supervision, readiness probing,
 * clock, configuration, the Development database and its migration status,
 * the synthetic persistence marker, typed inventory inspection, assessment
 * evidence, per-operation-target locking, journaling, the confirmation
 * boundary, and bounded exact-resource mutation. No real Podman/Compose is
 * invoked, no real process is started or stopped, no listener is bound, no
 * network request is made, no database or filesystem state is mutated, and no
 * machine state is depended on.
 *
 * The marker write/read boundary is owned by T035's
 * `apps/server/src/migrations.ts`; the injected `marker` collaborator models
 * it (as the accepted T020/T021 suites model their owned facets), so the
 * expected red stays at the one deliberately absent operations module.
 *
 * T022 proves:
 *   - DEVELOPMENT/VERIFICATION ISOLATION (FR-008): every driven command keeps
 *     the four identity dimensions distinct; a forbidden identity combination
 *     (verification or hosted runtime profile, production or staging
 *     environment, the Verification target's credential, or production-derived
 *     provenance) is refused before any work; a full Development persistence
 *     proof never locks, evaluates, or mutates anything outside the
 *     Development operation target; a present Verification inventory is
 *     neither a dependency nor a target.
 *   - NON-TARGET INVENTORY PROOFS (SC-002): the normalized inventory carries
 *     a non-target digest that is stable while non-targets are unchanged,
 *     derived from the observed non-target inventory (it changes when they
 *     change), and equal before/after the §2 sequence while only the
 *     explicitly confirmed Development Data Store resources change.
 *   - MARKER CONTINUITY (FR-004, SC-002): one synthetic non-sensitive marker
 *     is written before the routine stop and the exact same value is read
 *     back after the restart; a routine `dev:restart` preserves a marker
 *     written before the stop without removing the Development volume.
 *   - EXACT CONFIRMED RESET (SC-002): the reset inside the persistence proof
 *     removes exactly the individually recorded Development Data Store
 *     resources under the Development lock with a still-current action-bound
 *     token, then reapplies migrations and proves the prior marker row absent
 *     and migration state current. Missing, never-issued, cross-action, or
 *     drifted evidence refuses all mutation.
 *   - NEGATIVE CONTROLS: every proof is real, not asserted — an injected
 *     marker-value drift across restart, a prior marker that survives the
 *     reset, unrestored migration readiness, or a Verification inventory that
 *     changes during the run each FAIL the operation.
 *
 * EXPECTED RED: the only reason this suite fails is that the
 * T029–T031/T035/T037 `scripts/foundation-operations.mjs` implementation
 * boundary does not exist yet. The failure is a module-resolution error for
 * that one intentionally absent module — not a syntax, discovery, dependency,
 * fixture, forced-failure, or real-tool error. (Historical: that boundary was
 * implemented and accepted as T029–T031/T035–T038; the rationale is retained
 * unchanged for the accepted T022 cases above.)
 *
 * The T041 suite appended at the bottom of this file is a SEPARATE
 * tests-first contract with its own scope, harness, and expected-red
 * boundary — the missing Verification run orchestration export of the
 * NOW-EXISTING operations module. It changes no accepted T022 case, harness,
 * or assertion above; the two suites share only this file and the module
 * under contract.
 */

import { describe, expect, it } from "vitest";
import {
  devRestart,
  devPersistenceCheck,
  foundationInventory,
  type OperationResult,
} from "../../scripts/foundation-operations.mjs";
// The T041 suite observes the SAME existing module through a NAMESPACE
// import, because its expected-red boundary is one missing named export of
// an already-implemented module (the planned T049 Verification run
// orchestration entry `verifyProductionLike`), not an absent module. A named
// import would turn that missing export into a file-wide import error and
// redden the accepted T022 cases above with it; the namespace import keeps
// the intended red exactly on the missing Verification orchestration
// behavior (the accepted T040 `apps/web/server.test.ts` namespace-import
// precedent for observing a module boundary).
import * as FoundationOperationsModule from "../../scripts/foundation-operations.mjs";

// ---------------------------------------------------------------------------
// Synthetic, non-secret inputs. No real port, credential, connection string,
// external tool output, or Production constant appears here.
// ---------------------------------------------------------------------------

/**
 * A safe Development daily configuration (synthetic, non-secret). T035-B02 —
 * the Data Store URL uses the canonical committed Development identity (the
 * `.env.development.example` values): the persistence proof routes its
 * routine restart through the accepted `devRestart` lifecycle, whose
 * canonical configuration boundary is part of the proof, not bypassed by it.
 */
const SAFE_DEV_CONFIG = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "daily",
  APP_HOST: "127.0.0.1",
  APP_PORT: "10443",
  PUBLIC_ORIGIN: "http://127.0.0.1:10443",
  DATABASE_URL: "mysql://songhealth_dev:dev-only-placeholder@127.0.0.1:3306/songhealth_development",
  DATABASE_POOL_MAX: "4",
  PROXY_POLICY: "none",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
} as const;

/**
 * The Verification operation target's configuration (contract §Configuration
 * examples): every shared dimension differs from Development — separate
 * profile, port, origin, credential, database, and proxy policy. Used as the
 * forbidden shared credential in the identity matrix; no Verification command
 * is driven by this suite.
 */
const SAFE_VERIFICATION_CONFIG = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "verification",
  APP_HOST: "127.0.0.1",
  APP_PORT: "10444",
  PUBLIC_ORIGIN: "http://127.0.0.1:10444",
  DATABASE_URL: "mysql://verify-user:verify-password@127.0.0.1:13307/songhealth_verify",
  DATABASE_POOL_MAX: "2",
  PROXY_POLICY: "one-hop",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
} as const;

/**
 * The complete custom reverse-DNS label set every manifest resource carries
 * (contract §Operation-target ownership and isolation), so injected inventory
 * observations are exactly owned and the dimension under test is isolation,
 * not ownership.
 */
const CUSTOM_LABEL_KEYS = [
  "org.songhealth.foundation.delivery",
  "org.songhealth.foundation.checkout",
  "org.songhealth.foundation.environment",
  "org.songhealth.foundation.runtime-profile",
  "org.songhealth.foundation.operation-target",
  "org.songhealth.foundation.resource",
  "org.songhealth.foundation.ownership-schema",
] as const;

/** The individually recorded exact Development Data Store resources
 * (T037-B01: including the manifest-declared network role). */
const DEV_DATASTORE_KEYS = [
  "development.database",
  "development.network",
  "development.database-volume",
] as const;

/** The Verification target's disposable resources (non-targets here). */
const VERIFICATION_DISPOSABLE_KEYS = ["verification.nginx", "verification.network"] as const;

/** One fully-owned synthetic runtime resource observation (T020 shape). */
interface ResourceObservation {
  resourceType: "container" | "network" | "volume";
  logicalKey: string;
  typeMatches: boolean;
  nameMatches: boolean;
  checkoutProjectMatches: boolean;
  manifestMember: boolean;
  canonicalLabelsComplete: boolean;
  customLabels: Record<string, string>;
  ownershipSchemaCurrent: boolean;
  attachmentsExpected: boolean;
  runtimeState: string;
  unexpectedlyAttached: boolean;
}

function ownedResource(overrides: Partial<ResourceObservation> = {}): ResourceObservation {
  const base: ResourceObservation = {
    resourceType: "container",
    logicalKey: "development.database",
    typeMatches: true,
    nameMatches: true,
    checkoutProjectMatches: true,
    manifestMember: true,
    canonicalLabelsComplete: true,
    customLabels: Object.fromEntries(
      CUSTOM_LABEL_KEYS.map((key) => [key, `synthetic:${key}`]),
    ),
    ownershipSchemaCurrent: true,
    attachmentsExpected: true,
    runtimeState: "running",
    unexpectedlyAttached: false,
  };
  return { ...base, ...overrides };
}

/**
 * The normalized `foundation:inventory` result surface pinned by this
 * contract: the T020-established fields plus the §Resource Inventory
 * `states`/`nonTargetDigest` evidence this suite proves. No digest value is
 * pinned — only presence, stability, and sensitivity.
 */
interface InventoryResourceState {
  logicalKey: string;
  ownership: "exact" | "absent" | "blocked";
  runtimeState: string | null;
}

interface InventoryResult {
  exitCode: number;
  reasonCode?: string;
  token?: string;
  resources?: string[];
  states?: InventoryResourceState[];
  nonTargetDigest?: string;
}

/** The `dev:persistence-check` result surface pinned by this contract. */
interface PersistenceCheckResult {
  exitCode: number;
  reasonCode?: string;
}

// ---------------------------------------------------------------------------
// Shared coherent fake state.
// ---------------------------------------------------------------------------

interface DbState {
  running: boolean;
  startCount: number;
  stopCount: number;
  volumeDeleted: boolean;
  migrationState: "current" | "pending";
}

/**
 * The synthetic persistence marker (data-model §Synthetic Persistence Marker)
 * as owned by the injected T035 migration-boundary collaborator: one row in
 * the operational marker table, destroyed with the Data Store volume and
 * recreated empty by tracked migrations. `readLog` records every read's
 * returned value in order so continuity (value read back) and absence (null
 * read) are both observable.
 */
interface MarkerState {
  tableReady: boolean;
  value: string | null;
  lastWritten: string | null;
  writes: number;
  reads: number;
  readLog: (string | null)[];
}

/** Deep copy for synthetic (JSON-safe) records. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Build one coherent set of injected collaborators around shared state and a
 * chronological event trace. The returned `collaborators` object is the exact
 * object every operation under test receives; tests mutate it (or the shared
 * state behind it) directly, so every observation handle stays the exact
 * collaborator actually used — an override can never leave an assertion
 * pointed at a stale default. The inferred collaborator type is part of this
 * tests-first contract: the T029–T031/T035/T037 boundary must accept it.
 */
function makeCollaborators() {
  const events: string[] = [];
  const dbState: DbState = {
    running: false,
    startCount: 0,
    stopCount: 0,
    volumeDeleted: false,
    migrationState: "current",
  };
  const processState = { running: new Set<string>(), startCount: {} as Record<string, number> };
  const inventoryState = {
    byTarget: {
      development: [
        ownedResource(),
        ownedResource({
          resourceType: "network",
          logicalKey: "development.network",
          runtimeState: "present",
        }),
        ownedResource({
          resourceType: "volume",
          logicalKey: "development.database-volume",
          runtimeState: "present",
        }),
      ],
      verification: [
        ownedResource({ logicalKey: "verification.nginx", resourceType: "container" }),
        ownedResource({
          logicalKey: "verification.network",
          resourceType: "network",
          runtimeState: "present",
        }),
      ],
    } as Record<string, ResourceObservation[]>,
  };
  const markerState: MarkerState = {
    tableReady: true,
    value: null,
    lastWritten: null,
    writes: 0,
    reads: 0,
    readLog: [],
  };
  const lockState = { available: true, heldBy: null as string | null };
  const assessmentState = { reconstructibilityConfirmed: true, disposabilityConfirmed: true };
  const mutationState = { removedExact: [] as string[], forbiddenInvocations: [] as string[] };
  const confirmationState = {
    verifiedTokens: [] as string[],
    issuedTokens: {} as Record<string, string[]>,
  };
  const configState = {
    profile: "daily" as "daily" | "verification",
    /** Synthetic configuration overrides (refusal classes under test). */
    overrides: {} as Record<string, string>,
  };
  const failState = {
    /** The marker value changes across the routine restart (continuity broken). */
    markerDriftAcrossRestart: false,
    /** The prior marker row survives the reset (absence proof must fail). */
    markerSurvivesReset: false,
    /** The migration reapply after the reset does not restore readiness. */
    resetMigrationsStayPending: false,
    /** A Verification inventory changes during the operation (isolation broken). */
    nonTargetChangesDuringRun: false,
    /** The named native process fails to start during the routine restart. */
    processStartFails: null as string | null,
  };
  let clockTime = 0;
  let confirmationTokenCount = 0;

  const collaborators = {
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
      applyMigrations: async () => {
        // A no-op apply under the negative control leaves migration state
        // unrestored after the reset; normally tracked migrations become
        // current and the marker table exists again (empty).
        if (!failState.resetMigrationsStayPending) dbState.migrationState = "current";
        markerState.tableReady = true;
        events.push("migrate:applied");
      },
      migrationStatus: async () => {
        events.push("migrations:status");
        return dbState.migrationState;
      },
      deleteVolume: async () => {
        dbState.volumeDeleted = true;
        events.push("database:deleteVolume");
      },
    },
    processes: {
      start: async (name: string) => {
        if (failState.processStartFails === name) {
          // A native process that fails to start during the supervised
          // restart (the raw adapter error models the T038 input side; the
          // operation must map it, never pass it through).
          throw new Error(`synthetic-native-start-failure:${name}`);
        }
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
      probe: async () => ({
        ready: true,
        components: {
          database: "ready",
          liveness: "ready",
          readiness: "ready",
          publicRoute: "ready",
          adminRoute: "ready",
          serverRoute: "ready",
        },
      }),
    },
    clock: {
      now: () => clockTime,
      advance: (ms: number) => {
        clockTime += ms;
      },
    },
    config: {
      load: async () => ({
        ...SAFE_DEV_CONFIG,
        RUNTIME_PROFILE: configState.profile,
        ...configState.overrides,
      }),
    },
    inventory: {
      inspect: async (target: string) => {
        events.push(`inventory:inspect:${target}`);
        return (inventoryState.byTarget[target] ?? []).map((r) => ({ ...r }));
      },
    },
    assessment: {
      evaluate: async (target: string) => {
        events.push(`assessment:evaluate:${target}`);
        return { ...assessmentState };
      },
    },
    lock: {
      acquire: async (target: string) => {
        events.push(`lock:acquire:${target}`);
        if (!lockState.available) return false;
        lockState.heldBy = target;
        return true;
      },
      release: async (target: string) => {
        events.push(`lock:release:${target}`);
        if (lockState.heldBy === target) lockState.heldBy = null;
      },
    },
    confirmation: {
      issue: async (target: string, action: string) => {
        confirmationTokenCount += 1;
        const token = `synthetic-confirmation-token:${confirmationTokenCount}`;
        (confirmationState.issuedTokens[`${target}:${action}`] ??= []).push(token);
        events.push(`confirmation:issue:${target}:${action}`);
        return token;
      },
      verify: async (target: string, action: string, token: string) => {
        confirmationState.verifiedTokens.push(token);
        events.push(`confirmation:verify:${target}:${action}`);
        return (confirmationState.issuedTokens[`${target}:${action}`] ?? []).includes(token);
      },
    },
    mutation: {
      removeExactResource: async (logicalKey: string) => {
        mutationState.removedExact.push(logicalKey);
        events.push(`mutation:removeExact:${logicalKey}`);
        // The exact-resource removal's modeled effect on the observed target
        // inventory and the Data Store state that resource owns.
        if ((DEV_DATASTORE_KEYS as readonly string[]).includes(logicalKey)) {
          inventoryState.byTarget.development = inventoryState.byTarget.development.filter(
            (r) => r.logicalKey !== logicalKey,
          );
        }
        if (logicalKey === "development.database") dbState.running = false;
        if (logicalKey === "development.database-volume") {
          // Removing the named volume destroys the Data Store's data and its
          // applied migrations; only a later explicit migrate restores them.
          dbState.migrationState = "pending";
          markerState.tableReady = false;
          if (!failState.markerSurvivesReset) markerState.value = null;
          if (failState.nonTargetChangesDuringRun) {
            // An external change to a NON-TARGET inventory during the
            // operation: the before/after non-target comparison must see it.
            const nginx = inventoryState.byTarget.verification[0];
            if (nginx) inventoryState.byTarget.verification[0] = { ...nginx, runtimeState: "exited" };
          }
        }
      },
      removeByPrefix: async (prefix: string) => {
        mutationState.forbiddenInvocations.push(`removeByPrefix:${prefix}`);
      },
      removeByWildcard: async (pattern: string) => {
        mutationState.forbiddenInvocations.push(`removeByWildcard:${pattern}`);
      },
      removeByLabelFilter: async (label: string) => {
        mutationState.forbiddenInvocations.push(`removeByLabelFilter:${label}`);
      },
      downWithRemoveOrphans: async () => {
        mutationState.forbiddenInvocations.push("downWithRemoveOrphans");
      },
      downWithVolumes: async () => {
        mutationState.forbiddenInvocations.push("downWithVolumes");
      },
      prune: async () => {
        mutationState.forbiddenInvocations.push("prune");
      },
      forceRemove: async () => {
        mutationState.forbiddenInvocations.push("forceRemove");
      },
      removeBroadVolumes: async () => {
        mutationState.forbiddenInvocations.push("removeBroadVolumes");
      },
      removeWithUnresolvedVariables: async () => {
        mutationState.forbiddenInvocations.push("removeWithUnresolvedVariables");
      },
    },
    // The lifecycle journal store (data-model §Lifecycle Operation): accepted
    // permissively (records only), because journal semantics are owned by the
    // accepted T021 contract and are not asserted here.
    journal: {
      readLatest: async (target: string) => {
        events.push(`journal:read:${target}`);
        return null;
      },
      write: async (target: string, record: { state: string }) => {
        events.push(`journal:write:${target}:${record.state}`);
      },
    },
    // The synthetic persistence marker, owned by the T035 migration boundary:
    // one non-sensitive row the Development persistence validation operation
    // alone writes/reads. The drift control changes the observed value on any
    // read taken after a stop, so only an implementation that actually reads
    // the marker back after the restart can detect it.
    marker: {
      write: async (value: string) => {
        markerState.writes += 1;
        markerState.value = value;
        markerState.lastWritten = value;
        events.push("marker:write");
      },
      read: async () => {
        markerState.reads += 1;
        let observed = markerState.tableReady ? markerState.value : null;
        if (failState.markerDriftAcrossRestart && dbState.stopCount > 0 && observed !== null) {
          observed = `${observed}-synthetic-drift`;
        }
        markerState.readLog.push(observed);
        events.push("marker:read");
        return observed;
      },
    },
  };

  return {
    collaborators,
    events,
    dbState,
    processState,
    inventoryState,
    markerState,
    lockState,
    assessmentState,
    mutationState,
    confirmationState,
    configState,
    failState,
  };
}

type Harness = ReturnType<typeof makeCollaborators>;

/** Work the contract forbids on refusal/before-work paths. */
const WORK_EVENT_PREFIXES = [
  "database:",
  "process:",
  "marker:",
  "lock:",
  "mutation:",
] as const;

/**
 * Prove no service, marker, lock, or mutation work occurred — used by
 * refusal/before-work proofs. Read-only observations (inventory inspection,
 * journal reads, evidence evaluation) and journal records of the refusal
 * itself remain permitted.
 */
function expectNoWork(harness: Harness): void {
  const { events, dbState, processState, markerState, mutationState } = harness;
  for (const prefix of WORK_EVENT_PREFIXES) {
    expect(events.some((e) => e.startsWith(prefix))).toBe(false);
  }
  expect(dbState.running).toBe(false);
  expect(dbState.startCount).toBe(0);
  expect(dbState.stopCount).toBe(0);
  expect(processState.running.size).toBe(0);
  expect(markerState.writes).toBe(0);
  expect(mutationState.removedExact).toEqual([]);
  expect(mutationState.forbiddenInvocations).toEqual([]);
}

/**
 * Prove every executed mutation stayed bounded to the individually recorded
 * exact Development Data Store resources, with no forbidden broad-deletion
 * strategy and no legacy destructive bypass, regardless of whether the
 * operation was accepted or refused.
 */
function expectBoundedDevelopmentMutation(harness: Harness): void {
  for (const key of harness.mutationState.removedExact) {
    expect(DEV_DATASTORE_KEYS).toContain(key);
  }
  expect(harness.mutationState.forbiddenInvocations).toEqual([]);
  expect(harness.dbState.volumeDeleted).toBe(false);
  expect(harness.events).not.toContain("database:deleteVolume");
}

/** Issue a valid Development reset token through the confirmation boundary. */
async function issueResetToken(harness: Harness): Promise<string> {
  const { token } = await foundationInventory(harness.collaborators, {
    target: "development",
    action: "reset",
  });
  expect(typeof token).toBe("string");
  expect(token!.length).toBeGreaterThan(0);
  return token!;
}

// ---------------------------------------------------------------------------
// Development/Verification isolation — FR-008 (tests-first for T030/T031).
// ---------------------------------------------------------------------------

describe("Foundation operation-target isolation — T022 (tests-first for T029–T031/T035/T037)", () => {
  it("foundation:inventory exposes a stable non-target digest per operation target while non-targets are unchanged", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;

    const first: InventoryResult = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });
    const second: InventoryResult = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });
    const verificationFirst: InventoryResult = await foundationInventory(collaborators, {
      target: "verification",
      action: "status",
    });
    const verificationSecond: InventoryResult = await foundationInventory(collaborators, {
      target: "verification",
      action: "status",
    });

    // The §Resource Inventory nonTargetDigest is present and repeatable while
    // nothing changed (no digest value or serialization is pinned).
    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    expect(typeof first.nonTargetDigest).toBe("string");
    expect(first.nonTargetDigest!.length).toBeGreaterThan(0);
    expect(second.nonTargetDigest).toBe(first.nonTargetDigest);
    expect(verificationFirst.exitCode).toBe(0);
    expect(typeof verificationFirst.nonTargetDigest).toBe("string");
    expect(verificationSecond.nonTargetDigest).toBe(verificationFirst.nonTargetDigest);
    // Each target's non-target set is the other target's resources, so the
    // two digests differ — neither is an empty or shared constant.
    expect(verificationFirst.nonTargetDigest).not.toBe(first.nonTargetDigest);
  });

  it("the non-target digest is derived from the observed non-target inventory — it changes when the other target's inventory changes", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState } = harness;

    const before: InventoryResult = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });
    expect(before.exitCode).toBe(0);
    // A non-target change: the Verification target's resource is re-observed
    // with a different runtime state.
    inventoryState.byTarget.verification[0].runtimeState = "exited";

    const after: InventoryResult = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });

    expect(after.exitCode).toBe(0);
    expect(after.nonTargetDigest).not.toBe(before.nonTargetDigest);
  });

  it("an expected role absent from the observed inventory remains represented in the complete normalized inventory evidence", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState } = harness;
    // An expected manifest resource (the Data Store volume) is absent from
    // the observed inventory.
    inventoryState.byTarget.development = inventoryState.byTarget.development.filter(
      (r) => r.logicalKey !== "development.database-volume",
    );

    const result: InventoryResult = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });

    expect(result.exitCode).toBe(0);
    // T035-B01 — the emitted key list stays the COMPLETE target inventory:
    // the absent expected role is still listed, because absence is an
    // explicit Owned Runtime Resource state of the complete snapshot.
    expect(result.resources).toEqual([...DEV_DATASTORE_KEYS]);
    // The complete normalized state evidence represents the absent role with
    // its closed ownership verdict and no runtime state — distinct from the
    // observed `exact` role in the same snapshot.
    const states = new Map((result.states ?? []).map((s) => [s.logicalKey, s]));
    expect(states.size).toBe(DEV_DATASTORE_KEYS.length);
    expect(states.get("development.database")).toEqual({
      logicalKey: "development.database",
      ownership: "exact",
      runtimeState: "running",
    });
    expect(states.get("development.database-volume")).toEqual({
      logicalKey: "development.database-volume",
      ownership: "absent",
      runtimeState: null,
    });
  });

  it("the SC-002 before/after comparison detects a state change through the complete normalized evidence while the complete key list is unchanged", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState } = harness;

    const before: InventoryResult = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });
    expect(before.exitCode).toBe(0);
    // A change that does NOT alter the role set: the database container is
    // re-observed in a different allowlisted runtime state.
    inventoryState.byTarget.development[0].runtimeState = "exited";

    const after: InventoryResult = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });
    expect(after.exitCode).toBe(0);

    // The complete key list is invariant under the change; the complete
    // normalized state evidence is not — exactly the evidence dimension the
    // §2 before/after comparison needs (an exact→absent transition is the
    // same mechanism).
    expect(after.resources).toEqual(before.resources);
    const changed = (before.states ?? []).filter(
      (s, index) => JSON.stringify(s) !== JSON.stringify(after.states?.[index]),
    );
    expect(changed.map((s) => s.logicalKey)).toEqual(["development.database"]);
  });

  it.each([
    ["a verification runtime profile on a Development command", { RUNTIME_PROFILE: "verification" }, "CONFIG_IDENTITY_CONFLICT"],
    ["a hosted runtime profile", { RUNTIME_PROFILE: "hosted" }, "CONFIG_IDENTITY_CONFLICT"],
    ["a production environment", { APP_ENVIRONMENT: "production" }, "CONFIG_IDENTITY_CONFLICT"],
    ["a staging environment", { APP_ENVIRONMENT: "staging" }, "CONFIG_IDENTITY_CONFLICT"],
    ["the Verification target's database credential", { DATABASE_URL: SAFE_VERIFICATION_CONFIG.DATABASE_URL }, "CONFIG_IDENTITY_CONFLICT"],
    ["production-derived fixture provenance", { FIXTURE_PROVENANCE: "production-derived" }, "CONFIG_UNSUPPORTED"],
  ] as [string, Record<string, string>, string][])(
    "dev:persistence-check refuses %s before any work — no marker, database, lock, or mutation",
    async (_label, overrides, reasonCode) => {
      const harness = makeCollaborators();
      const { collaborators, configState, events } = harness;
      // A validly issued reset token under a clean identity first, so only
      // the identity combination under test is wrong.
      const token = await issueResetToken(harness);
      configState.overrides = overrides;
      events.length = 0;

      const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
        confirm: token,
      });

      // Forbidden identity combinations are refused before any work is
      // accepted, with the documented reason code for the class.
      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBe(reasonCode);
      expectNoWork(harness);
      // No substitute token was minted by the operation itself.
      expect(events.some((e) => e.startsWith("confirmation:issue"))).toBe(false);
    },
  );

  it("a full Development persistence proof never locks, evaluates, or mutates anything outside the Development operation target", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, inventoryState, lockState } = harness;
    // A present, running Verification inventory is neither a dependency nor a
    // target of the Development proof.
    const verificationBefore = clone(inventoryState.byTarget.verification);
    const token = await issueResetToken(harness);
    events.length = 0;

    const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });

    expect(result.exitCode).toBe(0);
    // Read-only observation of the non-target inventory is expected; no
    // Verification-target lock, evidence evaluation, or mutation occurs.
    expect(events.some((e) => e.startsWith("lock:acquire:verification"))).toBe(false);
    expect(events.some((e) => e.startsWith("assessment:evaluate:verification"))).toBe(false);
    expectBoundedDevelopmentMutation(harness);
    // Verification resources are byte-for-byte unchanged, and the Development
    // lock is not left held.
    expect(inventoryState.byTarget.verification).toEqual(verificationBefore);
    expect(lockState.heldBy).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Synthetic-marker continuity across routine stop/restart — FR-004, SC-002
// (tests-first for T029/T035).
// ---------------------------------------------------------------------------

describe("Development persistence marker continuity — T022 (tests-first for T029–T031/T035/T037)", () => {
  it("dev:persistence-check writes one synthetic marker before the routine stop and reads the exact same value back after the restart", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, markerState, dbState, processState } = harness;
    const token = await issueResetToken(harness);
    // Arrange: the documented quickstart §2 precondition — the persistence
    // proof runs against a RUNNING Development foundation (§1 ends with a
    // passing `dev:ready`): the database engine and all three native daily
    // processes are up, exactly as the routine dev:restart case below
    // arranges. Without it the harness adapters can never emit the ordered
    // supervised stop/start trace this contract asserts (a stopped engine or
    // process has no stop to record), so the routine restart would be
    // unobservable.
    dbState.running = true;
    for (const name of ["server", "public", "admin"]) processState.running.add(name);
    events.length = 0;

    const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });

    expect(result.exitCode).toBe(0);
    // Exactly one synthetic marker was written, with a non-empty opaque
    // synthetic value (no value or serialization is pinned).
    expect(markerState.writes).toBe(1);
    expect(typeof markerState.lastWritten).toBe("string");
    expect(markerState.lastWritten!.length).toBeGreaterThan(0);
    // The documented sequence: write, then the routine stop, then the start,
    // then the continuity read-back — proven from the ordered trace.
    const writeIndex = events.indexOf("marker:write");
    const stopIndex = events.indexOf("database:stop");
    const startIndex = events.indexOf("database:start");
    const readIndex = events.indexOf("marker:read");
    expect(writeIndex).toBeGreaterThanOrEqual(0);
    expect(stopIndex).toBeGreaterThan(writeIndex);
    expect(startIndex).toBeGreaterThan(stopIndex);
    expect(readIndex).toBeGreaterThan(startIndex);
    // T035-B02 — the routine restart is the COMPLETE SUPERVISED lifecycle,
    // not an isolated database bounce: every native daily process stops
    // before the database stops, and the database starts before any native
    // process starts again (the accepted stop-before-start order of the
    // supervised restart).
    for (const name of ["server", "public", "admin"]) {
      expect(events.indexOf(`process:stop:${name}`)).toBeGreaterThan(writeIndex);
      expect(events.indexOf(`process:stop:${name}`)).toBeLessThan(stopIndex);
      expect(events.indexOf(`process:start:${name}`)).toBeGreaterThan(startIndex);
      expect(events.indexOf(`process:start:${name}`)).toBeLessThan(readIndex);
    }
    // The first read returns the exact written value (continuity); the last
    // read follows the reset's migration reapply and returns null (absence).
    expect(markerState.readLog[0]).toBe(markerState.lastWritten);
    const mutationIndex = events.findIndex((e) => e.startsWith("mutation:"));
    const migrateIndex = events.indexOf("migrate:applied");
    expect(mutationIndex).toBeGreaterThan(readIndex);
    expect(events.lastIndexOf("marker:read")).toBeGreaterThan(migrateIndex);
    expect(markerState.readLog.at(-1)).toBeNull();
    // Routine restart preserved the Development volume: only the confirmed
    // reset removes anything, and it removes individually recorded exact
    // resources only.
    expect(dbState.volumeDeleted).toBe(false);
    expectBoundedDevelopmentMutation(harness);
  });

  it("a routine dev:restart preserves a marker written before the stop and never removes the Development volume", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, markerState, mutationState, events } = harness;
    // Arrange: the daily foundation is running and a Delivery-owned synthetic
    // marker exists from an earlier persistence validation.
    dbState.running = true;
    await collaborators.marker.write("synthetic-pre-restart-marker");
    events.length = 0;

    const result: OperationResult = await devRestart(collaborators);

    // FR-004: Development data survives routine stop/restart and changes only
    // through explicit reset or migration actions.
    expect(result.exitCode).toBe(0);
    expect(await collaborators.marker.read()).toBe("synthetic-pre-restart-marker");
    expect(dbState.volumeDeleted).toBe(false);
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    // The documented stop phase precedes the start phase, and the routine
    // restart writes no marker of its own.
    expect(events.indexOf("database:stop")).toBeGreaterThanOrEqual(0);
    expect(events.indexOf("database:start")).toBeGreaterThan(events.indexOf("database:stop"));
    expect(markerState.writes).toBe(1);
  });

  it("negative control: a marker value that changes across the routine restart fails the persistence proof before any destructive work", async () => {
    const harness = makeCollaborators();
    const { collaborators, failState, mutationState } = harness;
    const token = await issueResetToken(harness);
    failState.markerDriftAcrossRestart = true;

    const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });

    // The continuity proof is real: a drifted value fails the operation with
    // a safe reason code, and the failure precedes the reset mutation.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    expect(mutationState.removedExact).toEqual([]);
    expectBoundedDevelopmentMutation(harness);
  });

  it("negative control: a native process that fails to start during the supervised routine restart refuses the proof closed before any reset mutation", async () => {
    const harness = makeCollaborators();
    const {
      collaborators,
      events,
      markerState,
      mutationState,
      failState,
    } = harness;
    const token = await issueResetToken(harness);
    // One native daily process fails to come back up during the routine
    // restart's start phase (after the stop phase already succeeded).
    failState.processStartFails = "public";
    events.length = 0;

    const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });

    // The restart is the complete supervised lifecycle, so its documented
    // startup failure refuses the whole proof closed: the marker was written
    // and the restart was attempted, but NO reset mutation occurred and no
    // broad-deletion strategy was touched. The refusal is the restart's own
    // closed startup diagnostic — never the raw adapter error.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("STARTUP_FAILED");
    expect(markerState.writes).toBe(1);
    expect(mutationState.removedExact).toEqual([]);
    expectBoundedDevelopmentMutation(harness);
  });
});

// ---------------------------------------------------------------------------
// Exact confirmed Development reset — SC-002 (tests-first for T029–T031/T035).
// ---------------------------------------------------------------------------

describe("Confirmed Development reset — T022 (tests-first for T029–T031/T035/T037)", () => {
  it("the confirmed reset removes exactly the Development Data Store resources, then restores migration readiness and proves the prior marker absent", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, markerState, dbState } = harness;
    const token = await issueResetToken(harness);
    events.length = 0;

    const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });

    expect(result.exitCode).toBe(0);
    // The executed mutation plan is exactly the individually recorded exact
    // Development Data Store set — no more, no less.
    expect([...harness.mutationState.removedExact].sort()).toEqual(
      [...DEV_DATASTORE_KEYS].sort(),
    );
    // Locked, then mutated, then migrations reapplied, then the proofs —
    // proven from the ordered trace.
    const lockIndex = events.indexOf("lock:acquire:development");
    const firstRemoval = events.findIndex((e) => e.startsWith("mutation:removeExact:"));
    const migrateIndex = events.indexOf("migrate:applied");
    const releaseIndex = events.indexOf("lock:release:development");
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(firstRemoval).toBeGreaterThan(lockIndex);
    expect(migrateIndex).toBeGreaterThan(firstRemoval);
    expect(releaseIndex).toBeGreaterThan(firstRemoval);
    // The prior marker row is absent while the marker table exists again
    // (exact reset reapplies migrations), and migration state is current —
    // each proven by a check taken after the reapply.
    expect(markerState.readLog.at(-1)).toBeNull();
    expect(markerState.tableReady).toBe(true);
    expect(dbState.migrationState).toBe("current");
    expect(events.lastIndexOf("migrations:status")).toBeGreaterThan(migrateIndex);
    // No forbidden broad-deletion strategy and no legacy destructive bypass.
    expectBoundedDevelopmentMutation(harness);
  });

  it.each([
    ["a missing confirm token", async (_h: Harness) => ""],
    ["a never-issued synthetic token", async (_h: Harness) => "synthetic-never-issued-token"],
    [
      "a token issued for the Verification target's cleanup action",
      async (h: Harness) => {
        const { token } = await foundationInventory(h.collaborators, {
          target: "verification",
          action: "cleanup",
        });
        return token!;
      },
    ],
  ] as [string, (harness: Harness) => Promise<string>][])(
    "dev:persistence-check refuses %s before any marker, database, lock, or mutation work",
    async (_label, supplyConfirm) => {
      const harness = makeCollaborators();
      const { collaborators, events } = harness;
      const confirm = await supplyConfirm(harness);
      events.length = 0;

      const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
        confirm,
      });

      // The persistence proof accepts only the still-current action-bound
      // reset token; anything else is refused without any work.
      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBeTruthy();
      expectNoWork(harness);
      expect(events.some((e) => e.startsWith("confirmation:issue"))).toBe(false);
      expectBoundedDevelopmentMutation(harness);
    },
  );

  it("refuses with RESOURCE_INVENTORY_CHANGED when the Development inventory drifts after token issuance — no mutation", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState } = harness;
    const token = await issueResetToken(harness);
    // Drift between token issuance and the locked re-inventory: the
    // confirmed resource set no longer matches (a resource disappeared).
    inventoryState.byTarget.development = inventoryState.byTarget.development.filter(
      (r) => r.logicalKey !== "development.database",
    );

    const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });

    // Inventory drift is the documented drift reason code; it refuses ALL
    // mutation and leaves the target as found.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_INVENTORY_CHANGED");
    expect(harness.mutationState.removedExact).toEqual([]);
    expectBoundedDevelopmentMutation(harness);
  });

  it("negative control: a prior marker that survives the reset fails the persistence proof", async () => {
    const harness = makeCollaborators();
    const { collaborators, failState } = harness;
    const token = await issueResetToken(harness);
    failState.markerSurvivesReset = true;

    const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });

    // The absence proof is real: a surviving marker row fails the operation
    // even though the exact mutation itself stayed bounded.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    expectBoundedDevelopmentMutation(harness);
  });

  it("negative control: migration readiness that is not restored after the reset fails the persistence proof", async () => {
    const harness = makeCollaborators();
    const { collaborators, failState } = harness;
    const token = await issueResetToken(harness);
    failState.resetMigrationsStayPending = true;

    const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });

    // The migration-restoration proof is real: pending migrations after the
    // reset fail the operation.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    expectBoundedDevelopmentMutation(harness);
  });
});

// ---------------------------------------------------------------------------
// Non-target inventory comparison — SC-002 (tests-first for T030/T035).
// ---------------------------------------------------------------------------

describe("Non-target inventory comparison — T022 (tests-first for T029–T031/T035/T037)", () => {
  it("the quickstart §2 sequence changes only the confirmed Development Data Store; Verification and non-target inventories are unchanged", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;

    // The documented §2 sequence: capture both inventories, obtain the
    // action-bound reset token, run the persistence proof, re-capture.
    const developmentBefore: InventoryResult = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });
    const verificationBefore: InventoryResult = await foundationInventory(collaborators, {
      target: "verification",
      action: "status",
    });
    expect(developmentBefore.exitCode).toBe(0);
    expect(verificationBefore.exitCode).toBe(0);
    expect(developmentBefore.resources).toEqual([...DEV_DATASTORE_KEYS]);
    expect(verificationBefore.resources).toEqual([...VERIFICATION_DISPOSABLE_KEYS]);

    const token = await issueResetToken(harness);
    const check: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });
    expect(check.exitCode).toBe(0);

    const developmentAfter: InventoryResult = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });
    const verificationAfter: InventoryResult = await foundationInventory(collaborators, {
      target: "verification",
      action: "status",
    });
    expect(developmentAfter.exitCode).toBe(0);
    expect(verificationAfter.exitCode).toBe(0);

    // Only the explicitly confirmed Development Data Store resources changed.
    // T035-B01 — the comparison uses the COMPLETE NORMALIZED STATE evidence,
    // not the role key list: the key list is the complete inventory (still
    // listing every expected role, now observed `absent`), so the observable
    // change dimension is each role's normalized ownership/runtime state.
    expect(developmentAfter.resources).toEqual([...DEV_DATASTORE_KEYS]);
    const beforeStates = new Map(
      (developmentBefore.states ?? []).map((s) => [s.logicalKey, s]),
    );
    const afterStates = new Map((developmentAfter.states ?? []).map((s) => [s.logicalKey, s]));
    const changed = [...beforeStates.keys()].filter(
      (key) => JSON.stringify(beforeStates.get(key)) !== JSON.stringify(afterStates.get(key)),
    );
    expect(changed.length).toBeGreaterThan(0);
    for (const key of changed) {
      expect(DEV_DATASTORE_KEYS).toContain(key);
      expect(afterStates.get(key)?.ownership).toBe("absent");
    }
    expect([...harness.mutationState.removedExact].sort()).toEqual(
      [...DEV_DATASTORE_KEYS].sort(),
    );
    // Verification resources remain present and untargeted, and the
    // Development target's view of its non-targets is unchanged.
    expect(verificationAfter.resources).toEqual([...VERIFICATION_DISPOSABLE_KEYS]);
    expect(developmentAfter.nonTargetDigest).toBe(developmentBefore.nonTargetDigest);
  });

  it("negative control: a Verification inventory that changes during the run fails the non-target comparison", async () => {
    const harness = makeCollaborators();
    const { collaborators, failState } = harness;
    const token = await issueResetToken(harness);
    failState.nonTargetChangesDuringRun = true;

    const result: PersistenceCheckResult = await devPersistenceCheck(collaborators, {
      confirm: token,
    });

    // The before/after non-target proof is real: a changed Verification
    // inventory fails the operation with a safe reason code, while the
    // executed mutation still stayed bounded to the Development Data Store.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    expectBoundedDevelopmentMutation(harness);
  });
});

// ---------------------------------------------------------------------------
// T041 — Production-like Verification result contract (tests-first for T049).
// ---------------------------------------------------------------------------

/**
 * The EXACT ordered FR-009 contract-result inventory every Production-like
 * Verification run emits (Operations Contract §Verification result contract;
 * quickstart.md §6; plan.md §Operations and verification) — the single
 * in-file source of truth for order and completeness in this suite.
 */
const VERIFICATION_CONTRACTS = [
  "build",
  "startup",
  "configuration-valid",
  "configuration-missing-rejected",
  "configuration-empty-rejected",
  "configuration-malformed-rejected",
  "configuration-unsupported-rejected",
  "configuration-out-of-range-rejected",
  "configuration-identity-conflict-rejected",
  "migration",
  "database",
  "liveness",
  "readiness",
  "isolation",
  "proxy",
  "public-route",
  "admin-route",
  "server-route",
  "cleanup",
  "reporting",
] as const;

/** The main (non-cleanup, non-reporting) contracts of the same inventory. */
const VERIFICATION_MAIN_CONTRACTS = VERIFICATION_CONTRACTS.filter(
  (contract) => contract !== "cleanup" && contract !== "reporting",
);

/**
 * The fixed non-parity statement (FR-011; Operations Contract §Verification
 * result contract "Every report ends with"): verbatim, byte for byte.
 */
const VERIFICATION_PARITY_STATEMENT =
  "Production-like Verification validates bounded application contracts only; it does not establish exact parity with Bangmod/Plesk Production hosting.";

/** The documented closed `state` vocabulary (data-model.md §Verification Run). */
const VERIFICATION_RUN_STATES = [
  "pending",
  "running",
  "passed",
  "failed",
  "interrupted",
  "reported",
] as const;

/**
 * Synthetic per-contract elapsed times the injected clock advances while each
 * probe runs — DISTINCTIVE per contract so per-result timing is observable as
 * real per-check measurement, not a fabricated constant. Every value stays
 * far inside the SC-003 ten-minute whole-run bound.
 */
const VERIFICATION_STEP_DURATIONS: Record<string, number> = {
  build: 60_000,
  startup: 30_000,
  "configuration-valid": 1_000,
  "configuration-missing-rejected": 1_100,
  "configuration-empty-rejected": 1_200,
  "configuration-malformed-rejected": 1_300,
  "configuration-unsupported-rejected": 1_400,
  "configuration-out-of-range-rejected": 1_500,
  "configuration-identity-conflict-rejected": 1_600,
  migration: 5_000,
  database: 500,
  liveness: 250,
  readiness: 750,
  isolation: 2_000,
  proxy: 400,
  "public-route": 300,
  "admin-route": 350,
  "server-route": 450,
  cleanup: 8_000,
  reporting: 1_500,
};

/**
 * The SC-003 ten-minute whole-run bound, asserted at contract level as the
 * deterministic analog of the acceptance timer: a COMPLETED Verification
 * run's measured `finishedAt - startedAt` span must never exceed 600,000 ms
 * (SC-003; quickstart §6 "completes within 10 minutes"). The wall-clock
 * acceptance timer around the real documented command remains quickstart §6
 * acceptance evidence; this is the unit-level boundary an over-bound
 * implementation cannot pass.
 */
const VERIFICATION_WHOLE_RUN_BOUND_MS = 600_000;

/** One safe synthetic release-candidate identifier (never a real revision). */
const SYNTHETIC_RELEASE_REVISION = "t041-synthetic-release-candidate";

/**
 * One injected per-contract outcome (the probe-level facet the orchestration
 * must normalize into exactly one ordered result). `diagnostic` is required
 * for a failing outcome; `revision` is the build probe's candidate
 * identifier.
 */
interface VerificationStepOutcome {
  ok: boolean;
  diagnostic?: SafeDiagnosticShape;
  revision?: string;
}

/** The closed Safe Diagnostic logical shape (Operations Contract §Safe
 * diagnostic contract; foundation-http.openapi.yaml SafeDiagnostic schema). */
interface SafeDiagnosticShape {
  reasonCode: string;
  diagnosticScope: string;
  component: string;
  configurationKey?: string;
  remediation: string;
}

/** One ordered Check Result (data-model.md §Verification Run). */
interface VerificationCheckResult {
  contract: string;
  result: "pass" | "fail";
  diagnostic?: SafeDiagnosticShape;
  durationMs: number;
}

/**
 * The `verify:production-like` result surface pinned by this contract: the
 * accepted `OperationResult` plus the Verification-run observations the
 * data-model §Verification Run defines, as top-level operation-specific
 * fields exactly like the accepted `token`/`resources` inventory fields.
 */
interface VerificationRunResult extends OperationResult {
  runId?: string;
  releaseRevision?: string;
  startedAt?: number;
  finishedAt?: number;
  state?: string;
  checks?: VerificationCheckResult[];
  primaryFailure?: SafeDiagnosticShape;
  parityStatement?: string;
}

/** The planned T049 entry point: `verify:production-like`. */
type VerifyProductionLike = (collaborators: unknown) => Promise<VerificationRunResult>;

/**
 * Resolve the planned Verification run orchestration entry. The single
 * intentional dependency on the not-yet-implemented export: when T049 has
 * not shipped it, EVERY T041 case fails on this one clean boundary
 * assertion — the missing Verification orchestration behavior itself — never
 * on an import, fixture, or setup error, and never in the accepted T022
 * cases above.
 */
function verificationEntryPoint(): VerifyProductionLike {
  const candidate = (
    FoundationOperationsModule as unknown as Record<string, unknown>
  ).verifyProductionLike;
  expect(typeof candidate).toBe("function");
  return candidate as VerifyProductionLike;
}

/** One injected synthetic failure diagnostic (closed safe shape). */
function stepFailure(reasonCode: string, component: string): VerificationStepOutcome {
  return {
    ok: false,
    diagnostic: {
      reasonCode,
      diagnosticScope: "verification",
      component,
      remediation: "CHECK_PREREQUISITES",
    },
  };
}

/** Assert one diagnostic is the closed Safe Diagnostic shape, scoped to the
 * Verification run, with no field outside the contract. */
function expectSafeDiagnostic(
  diagnostic: SafeDiagnosticShape | undefined,
): SafeDiagnosticShape {
  expect(diagnostic).toBeDefined();
  const keys = Object.keys(diagnostic!);
  for (const key of keys) {
    expect([
      "reasonCode",
      "diagnosticScope",
      "component",
      "configurationKey",
      "remediation",
    ]).toContain(key);
  }
  for (const required of ["reasonCode", "diagnosticScope", "component", "remediation"]) {
    expect(keys).toContain(required);
  }
  expect(diagnostic!.diagnosticScope).toBe("verification");
  return diagnostic!;
}

/**
 * The T041 harness: one coherent set of injected collaborators around shared
 * observable state. The Verification run's own runtime work is modeled by
 * the `verification` facet — one injected probe per contract result
 * (`runCheck(contract)`), which owns that check's probe-level behavior and
 * side effects (starting the disposable Verification runtime, disposing it
 * at cleanup, emitting at reporting) exactly as the accepted suites model
 * their owned facets. The probe-level mechanics of each check (real Compose,
 * Nginx, route, and rejection behavior) belong to T042/T049+; what THIS
 * suite pins is the orchestration-owned result contract over them.
 */
function makeVerificationHarness(options: { development?: "running" | "stopped-absent" } = {}) {
  const development = options.development ?? "running";
  const events: string[] = [];
  const probeOrder: string[] = [];
  const probeEnteredAt: Record<string, number> = {};
  const stepOutcomes: Record<string, VerificationStepOutcome> = {};
  const mutationState = {
    removedExact: [] as string[],
    forbiddenInvocations: [] as string[],
  };
  const verificationRuntime = {
    up: false,
    startCount: 0,
    presentKeys: [] as string[],
    reportEmitted: false,
  };
  const developmentState = {
    running: development === "running",
    processes: development === "running" ? new Set(["server", "public", "admin"]) : new Set<string>(),
    inventory: development === "running"
      ? [
          ownedResource(),
          ownedResource({
            resourceType: "network",
            logicalKey: "development.network",
            runtimeState: "present",
          }),
          ownedResource({
            resourceType: "volume",
            logicalKey: "development.database-volume",
            runtimeState: "present",
          }),
        ]
      : [],
  };
  let clockTime = 1_780_000_000_000;

  const mutation = {
    removeExactResource: async (logicalKey: string) => {
      mutationState.removedExact.push(logicalKey);
      events.push(`mutation:removeExact:${logicalKey}`);
      verificationRuntime.presentKeys = verificationRuntime.presentKeys.filter(
        (key) => key !== logicalKey,
      );
    },
    removeByPrefix: async (prefix: string) => {
      mutationState.forbiddenInvocations.push(`removeByPrefix:${prefix}`);
    },
    removeByWildcard: async (pattern: string) => {
      mutationState.forbiddenInvocations.push(`removeByWildcard:${pattern}`);
    },
    removeByLabelFilter: async (label: string) => {
      mutationState.forbiddenInvocations.push(`removeByLabelFilter:${label}`);
    },
    downWithRemoveOrphans: async () => {
      mutationState.forbiddenInvocations.push("downWithRemoveOrphans");
    },
    downWithVolumes: async () => {
      mutationState.forbiddenInvocations.push("downWithVolumes");
    },
    prune: async () => {
      mutationState.forbiddenInvocations.push("prune");
    },
    forceRemove: async () => {
      mutationState.forbiddenInvocations.push("forceRemove");
    },
    removeBroadVolumes: async () => {
      mutationState.forbiddenInvocations.push("removeBroadVolumes");
    },
    removeWithUnresolvedVariables: async () => {
      mutationState.forbiddenInvocations.push("removeWithUnresolvedVariables");
    },
  };

  const collaborators = {
    // The accepted daily-command collaborator facets remain present and
    // observable: a Verification run must never drive the Development
    // database engine, the native daily processes, or the Development
    // persistence marker.
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
        developmentState.running = true;
      },
      stop: async () => {
        events.push("database:stop");
        developmentState.running = false;
      },
      isRunning: async () => {
        events.push("database:isRunning");
        return developmentState.running;
      },
      applyMigrations: async () => {
        events.push("migrate:applied");
      },
      migrationStatus: async () => {
        events.push("migrations:status");
        return "current" as const;
      },
      deleteVolume: async () => {
        events.push("database:deleteVolume");
      },
    },
    processes: {
      start: async (name: string) => {
        events.push(`process:start:${name}`);
        developmentState.processes.add(name);
      },
      stop: async (name: string) => {
        events.push(`process:stop:${name}`);
        developmentState.processes.delete(name);
      },
      isRunning: async (name: string) => developmentState.processes.has(name),
    },
    readiness: {
      probe: async () => {
        events.push("readiness:probe");
        return {
          ready: true,
          components: {
            database: "ready",
            liveness: "ready",
            readiness: "ready",
            publicRoute: "ready",
            adminRoute: "ready",
            serverRoute: "ready",
          },
        };
      },
    },
    clock: {
      now: () => clockTime,
      advance: (ms: number) => {
        clockTime += ms;
      },
    },
    config: {
      load: async () => {
        events.push("config:load");
        return { ...SAFE_VERIFICATION_CONFIG };
      },
    },
    inventory: {
      inspect: async (target: string) => {
        events.push(`inventory:inspect:${target}`);
        if (target === "verification") {
          return verificationRuntime.presentKeys.map((key) =>
            ownedResource({ logicalKey: key, resourceType: key.endsWith("network") ? "network" : "container" }),
          );
        }
        return developmentState.inventory.map((r) => ({ ...r }));
      },
    },
    assessment: {
      evaluate: async (target: string) => {
        events.push(`assessment:evaluate:${target}`);
        return { reconstructibilityConfirmed: true, disposabilityConfirmed: true };
      },
    },
    lock: {
      acquire: async (target: string) => {
        events.push(`lock:acquire:${target}`);
        return true;
      },
      release: async (target: string) => {
        events.push(`lock:release:${target}`);
      },
    },
    confirmation: {
      issue: async (target: string, action: string) => {
        events.push(`confirmation:issue:${target}:${action}`);
        return `synthetic-verification-token:${target}:${action}`;
      },
      verify: async (target: string, action: string) => {
        events.push(`confirmation:verify:${target}:${action}`);
        return true;
      },
    },
    mutation,
    journal: {
      readLatest: async (target: string) => {
        events.push(`journal:read:${target}`);
        return null;
      },
      write: async (target: string, record: { state: string }) => {
        events.push(`journal:write:${target}:${record.state}`);
      },
    },
    marker: {
      write: async () => {
        events.push("marker:write");
      },
      read: async () => {
        events.push("marker:read");
        return null;
      },
    },
    // The T041 facet: one injected probe per contract result. The probe
    // records its call order and entry time, advances the injected clock by
    // its distinctive synthetic duration, performs its owned synthetic side
    // effect, and returns the injected outcome (pass by default; the build
    // probe identifies the release candidate).
    verification: {
      runCheck: async (contract: string): Promise<VerificationStepOutcome> => {
        probeOrder.push(contract);
        probeEnteredAt[contract] = clockTime;
        events.push(`verification:check:${contract}`);
        clockTime += VERIFICATION_STEP_DURATIONS[contract] ?? 1_000;
        if (contract === "startup") {
          verificationRuntime.up = true;
          verificationRuntime.startCount += 1;
          verificationRuntime.presentKeys = [...VERIFICATION_DISPOSABLE_KEYS];
          events.push("verification:runtime:up");
        }
        if (contract === "cleanup" && verificationRuntime.up) {
          for (const key of [...verificationRuntime.presentKeys]) {
            await mutation.removeExactResource(key);
          }
          verificationRuntime.up = false;
          events.push("verification:runtime:down");
        }
        if (contract === "reporting") {
          verificationRuntime.reportEmitted = true;
          events.push("verification:report:emitted");
        }
        const injected = stepOutcomes[contract];
        if (injected !== undefined) return clone(injected);
        return contract === "build"
          ? { ok: true, revision: SYNTHETIC_RELEASE_REVISION }
          : { ok: true };
      },
    },
  };

  return {
    collaborators,
    events,
    probeOrder,
    probeEnteredAt,
    stepOutcomes,
    mutationState,
    verificationRuntime,
    developmentState,
  };
}

type VerificationHarness = ReturnType<typeof makeVerificationHarness>;

/** Run the planned Verification operation through the harness. */
async function runVerificationLike(
  harness: VerificationHarness,
): Promise<VerificationRunResult> {
  return verificationEntryPoint()(harness.collaborators);
}

/** The ordered contract names of one run's emitted checks. */
function emittedContracts(result: VerificationRunResult): string[] {
  return (result.checks ?? []).map((check) => check.contract);
}

/**
 * The literal data-model rule "`primaryFailure`: First failed result":
 * whatever the run emitted, the primary failure IS the diagnostic of the
 * first `fail` result in the emitted order — derived from the run's own
 * ordered inventory, with no assumption about which downstream checks any
 * implementation chooses to probe or block.
 */
function expectPrimaryFailureIsFirstFailure(result: VerificationRunResult): void {
  const firstFailure = (result.checks ?? []).find((check) => check.result === "fail");
  if (firstFailure === undefined) {
    expect(result.primaryFailure).toBeUndefined();
  } else {
    expect(result.primaryFailure).toEqual(firstFailure.diagnostic);
  }
}

/** One run's checks keyed by contract name. */
function checksByContract(
  result: VerificationRunResult,
): Map<string, VerificationCheckResult> {
  return new Map((result.checks ?? []).map((check) => [check.contract, check]));
}

/**
 * Assert the universal Check Result shape (data-model.md §Verification Run):
 * a contract name, exactly `pass` or `fail`, a non-negative integer
 * `durationMs`, and a diagnostic present exactly when the result is `fail`.
 */
function expectValidCheckResults(result: VerificationRunResult): Map<string, VerificationCheckResult> {
  const checks = result.checks ?? [];
  for (const check of checks) {
    expect(typeof check.contract).toBe("string");
    expect(check.contract.length).toBeGreaterThan(0);
    expect(check.result === "pass" || check.result === "fail").toBe(true);
    expect(Number.isInteger(check.durationMs)).toBe(true);
    expect(check.durationMs).toBeGreaterThanOrEqual(0);
    if (check.result === "fail") {
      expect(check.diagnostic).toBeDefined();
    } else {
      expect(check.diagnostic).toBeUndefined();
    }
  }
  return new Map(checks.map((check) => [check.contract, check]));
}

// ---------------------------------------------------------------------------
// Module boundary.
// ---------------------------------------------------------------------------

describe("Verification module boundary — T041 (tests-first for T049)", () => {
  it("exports the planned Verification run orchestration entry `verifyProductionLike` as a function", () => {
    expect(typeof verificationEntryPoint()).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Ordered result inventory — FR-009/FR-010 (tests-first for T049).
// ---------------------------------------------------------------------------

describe("Ordered Verification result inventory — T041 (tests-first for T049)", () => {
  it("a clean absent-inventory run emits exactly the twenty documented contract results in the fixed order, each exactly pass", async () => {
    const harness = makeVerificationHarness();

    const result = await runVerificationLike(harness);

    // Exactly the documented ordered inventory — no more, no fewer, no
    // reordering (Operations Contract §Verification result contract).
    expect(emittedContracts(result)).toEqual([...VERIFICATION_CONTRACTS]);
    expect(result.checks).toHaveLength(VERIFICATION_CONTRACTS.length);
    // The run drove its per-contract probes in that same fixed order.
    expect(harness.probeOrder).toEqual([...VERIFICATION_CONTRACTS]);
    const checks = expectValidCheckResults(result);
    for (const contract of VERIFICATION_CONTRACTS) {
      expect(checks.get(contract)?.result).toBe("pass");
    }
    // Overall PASS requires all twenty results to pass; a passing run has
    // no primary failure and no failure reason code.
    expect(result.exitCode).toBe(0);
    expect(result.primaryFailure).toBeUndefined();
    expect(result.reasonCode).toBeUndefined();
    expectPrimaryFailureIsFirstFailure(result);
    // The terminal state is a member of the closed vocabulary and is
    // unambiguously a passing terminal state (never pending, running,
    // failed, or interrupted).
    expect(VERIFICATION_RUN_STATES).toContain(result.state);
    expect(["passed", "reported"]).toContain(result.state);
    // The current-run cleanup disposed exactly the disposable Verification
    // resources the run created, through the bounded exact-resource path
    // only.
    expect([...harness.mutationState.removedExact].sort()).toEqual(
      [...VERIFICATION_DISPOSABLE_KEYS].sort(),
    );
    expect(harness.mutationState.forbiddenInvocations).toEqual([]);
  });

  it("the twenty-contract inventory stays complete and ordered when the run fails — no result is ever missing or skipped", async () => {
    const harness = makeVerificationHarness();
    harness.stepOutcomes.startup = stepFailure("STARTUP_FAILED", "orchestration");

    const result = await runVerificationLike(harness);

    // A failed run still emits the complete ordered inventory exactly once
    // per contract (quickstart §6: never missing or skipped).
    expect(emittedContracts(result)).toEqual([...VERIFICATION_CONTRACTS]);
    const checks = expectValidCheckResults(result);
    expect(checks.get("startup")?.result).toBe("fail");
    expect(checks.get("startup")?.diagnostic?.reasonCode).toBe("STARTUP_FAILED");
    expect(result.exitCode).not.toBe(0);
    // The terminal state is unambiguously a failing terminal state.
    expect(VERIFICATION_RUN_STATES).toContain(result.state);
    expect(["failed", "reported"]).toContain(result.state);
    expectPrimaryFailureIsFirstFailure(result);
  });
});

// ---------------------------------------------------------------------------
// Downstream prerequisite blocking — FR-009/FR-010 (tests-first for T049).
// ---------------------------------------------------------------------------

describe("Downstream prerequisite blocking — T041 (tests-first for T049)", () => {
  it("checks blocked by a failed prerequisite are explicit FAIL results with a safe PREREQUISITE_FAILED diagnostic", async () => {
    const harness = makeVerificationHarness();
    harness.stepOutcomes.startup = stepFailure("STARTUP_FAILED", "orchestration");

    const result = await runVerificationLike(harness);

    const checks = expectValidCheckResults(result);
    // Physically impossible downstream checks were not run: migration needs
    // the started Verification database and readiness needs the started
    // runtime, so both are dependency-blocked by the startup failure.
    for (const contract of ["migration", "readiness"]) {
      expect(harness.probeOrder).not.toContain(contract);
      const check = checks.get(contract);
      expect(check?.result).toBe("fail");
      expect(check?.diagnostic?.reasonCode).toBe("PREREQUISITE_FAILED");
      expectSafeDiagnostic(check?.diagnostic);
    }
    // The general invariant: EVERY check the run did not drive is an
    // explicit FAIL PREREQUISITE_FAILED result — the run never silently
    // drops, skips, or passes a check it could not run.
    for (const contract of VERIFICATION_CONTRACTS) {
      if (!harness.probeOrder.includes(contract)) {
        expect(checks.get(contract)?.result).toBe("fail");
        expect(checks.get(contract)?.diagnostic?.reasonCode).toBe("PREREQUISITE_FAILED");
      }
    }
    // The blocked-run primary failure is the startup failure itself.
    expect(result.primaryFailure).toEqual(harness.stepOutcomes.startup.diagnostic);
    expectPrimaryFailureIsFirstFailure(result);
  });

  it("a check that actually ran carries its own outcome — never a PREREQUISITE_FAILED result", async () => {
    const harness = makeVerificationHarness();
    harness.stepOutcomes.startup = stepFailure("STARTUP_FAILED", "orchestration");

    const result = await runVerificationLike(harness);

    const checks = expectValidCheckResults(result);
    expect(harness.probeOrder.length).toBeGreaterThan(0);
    for (const contract of harness.probeOrder) {
      const check = checks.get(contract);
      expect(check).toBeDefined();
      expect(check?.diagnostic?.reasonCode).not.toBe("PREREQUISITE_FAILED");
      if (contract === "startup") {
        expect(check?.result).toBe("fail");
      } else {
        expect(check?.result).toBe("pass");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Primary-failure selection and precedence — plan §Operations and
// verification; Operations Contract §Verification result contract
// (tests-first for T049).
// ---------------------------------------------------------------------------

describe("Primary-failure selection and precedence — T041 (tests-first for T049)", () => {
  it("the first main failure stays primary when cleanup and reporting also fail — later failures never overwrite it", async () => {
    const harness = makeVerificationHarness();
    const databaseFailure = stepFailure("DATABASE_UNAVAILABLE", "database");
    const cleanupFailure = stepFailure("CLEANUP_FAILED", "cleanup");
    const reportingFailure = stepFailure("REPORT_EMISSION_FAILED", "reporting");
    harness.stepOutcomes.database = databaseFailure;
    harness.stepOutcomes.cleanup = cleanupFailure;
    harness.stepOutcomes.reporting = reportingFailure;

    const result = await runVerificationLike(harness);

    // The FIRST failed result is the immutable primary failure; the later
    // cleanup and reporting failures are additional, not replacements.
    expect(result.primaryFailure).toEqual(databaseFailure.diagnostic);
    expect(result.primaryFailure).not.toEqual(cleanupFailure.diagnostic);
    expect(result.primaryFailure).not.toEqual(reportingFailure.diagnostic);
    expectSafeDiagnostic(result.primaryFailure);
    // All three failures remain individually observable in their own
    // ordered results, and the run fails.
    const checks = expectValidCheckResults(result);
    expect(checks.get("database")?.diagnostic).toEqual(databaseFailure.diagnostic);
    expect(checks.get("cleanup")?.diagnostic).toEqual(cleanupFailure.diagnostic);
    expect(checks.get("reporting")?.diagnostic).toEqual(reportingFailure.diagnostic);
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    expectPrimaryFailureIsFirstFailure(result);
  });

  it("the first of two main failures is primary — a later main failure never displaces it", async () => {
    const harness = makeVerificationHarness();
    const livenessFailure = stepFailure("LIVENESS_FAILED", "application");
    const isolationFailure = stepFailure("ISOLATION_FAILED", "orchestration");
    harness.stepOutcomes.liveness = livenessFailure;
    harness.stepOutcomes.isolation = isolationFailure;

    const result = await runVerificationLike(harness);

    // Liveness is probed (nothing before it failed) and carries its own
    // failure, so it is the first `fail` result in the emitted order; the
    // primary failure is exactly that first failure — never the later
    // isolation failure, however the run treated it.
    const checks = expectValidCheckResults(result);
    expect(checks.get("liveness")?.result).toBe("fail");
    expect(checks.get("liveness")?.diagnostic).toEqual(livenessFailure.diagnostic);
    expect(result.primaryFailure).toEqual(livenessFailure.diagnostic);
    expect(result.primaryFailure).not.toEqual(isolationFailure.diagnostic);
    expectPrimaryFailureIsFirstFailure(result);
    expect(result.exitCode).not.toBe(0);
  });

  it("when every main result passes, the first cleanup failure becomes the primary failure", async () => {
    const harness = makeVerificationHarness();
    const cleanupFailure = stepFailure("CLEANUP_FAILED", "cleanup");
    harness.stepOutcomes.cleanup = cleanupFailure;

    const result = await runVerificationLike(harness);

    // All main checks passed, so the cleanup failure is primary.
    const checks = expectValidCheckResults(result);
    for (const contract of VERIFICATION_MAIN_CONTRACTS) {
      expect(checks.get(contract)?.result).toBe("pass");
    }
    expect(result.primaryFailure).toEqual(cleanupFailure.diagnostic);
    expect(result.exitCode).not.toBe(0);
    expectPrimaryFailureIsFirstFailure(result);
  });

  it("reporting becomes the primary failure only when every earlier result passed", async () => {
    const harness = makeVerificationHarness();
    const reportingFailure = stepFailure("REPORT_EMISSION_FAILED", "reporting");
    harness.stepOutcomes.reporting = reportingFailure;

    const result = await runVerificationLike(harness);

    const checks = expectValidCheckResults(result);
    for (const contract of VERIFICATION_CONTRACTS) {
      if (contract !== "reporting") {
        expect(checks.get(contract)?.result).toBe("pass");
      }
    }
    expect(checks.get("reporting")?.diagnostic).toEqual(reportingFailure.diagnostic);
    expect(result.primaryFailure).toEqual(reportingFailure.diagnostic);
    expect(result.exitCode).not.toBe(0);
    expectPrimaryFailureIsFirstFailure(result);
  });
});

// ---------------------------------------------------------------------------
// Timing evidence — per-result and whole-run (data-model.md §Verification
// Run `durationMs` / `startedAt` / `finishedAt`) (tests-first for T049).
// ---------------------------------------------------------------------------

describe("Verification timing evidence — T041 (tests-first for T049)", () => {
  it("every probed result carries its own measured non-negative integer duration — the elapsed injected-clock time of that check's own probe", async () => {
    const harness = makeVerificationHarness();

    const result = await runVerificationLike(harness);

    const checks = expectValidCheckResults(result);
    for (const contract of harness.probeOrder) {
      // The pinned measurement semantics: one result's `durationMs` is the
      // injected-clock elapsed time of that check's own probe, so each
      // distinctive synthetic advance must appear on its own result (a
      // fabricated constant, zero, or a cross-attributed duration fails).
      expect(checks.get(contract)?.durationMs).toBe(VERIFICATION_STEP_DURATIONS[contract]);
    }
  });

  it("whole-run timing brackets the run: startedAt precedes every probe, finishedAt follows the last, and the span covers the measured check time", async () => {
    const harness = makeVerificationHarness();

    const result = await runVerificationLike(harness);

    expect(typeof result.startedAt).toBe("number");
    expect(typeof result.finishedAt).toBe("number");
    expect(Number.isFinite(result.startedAt)).toBe(true);
    expect(Number.isFinite(result.finishedAt)).toBe(true);
    const startedAt = result.startedAt!;
    const finishedAt = result.finishedAt!;
    // The run started before any check probe ran...
    expect(startedAt).toBeLessThanOrEqual(harness.probeEnteredAt.build);
    // ...and finished only after the last probe completed.
    expect(finishedAt).toBeGreaterThanOrEqual(
      harness.probeEnteredAt.reporting + VERIFICATION_STEP_DURATIONS.reporting,
    );
    // The whole-run span covers the sum of every measured check.
    const measuredTotal = harness.probeOrder.reduce(
      (total, contract) => total + VERIFICATION_STEP_DURATIONS[contract],
      0,
    );
    expect(finishedAt - startedAt).toBeGreaterThanOrEqual(measuredTotal);
  });

  it("a completed run spans no more than the SC-003 ten-minute bound — the measured whole-run span never exceeds 600,000 ms", async () => {
    const harness = makeVerificationHarness();

    const result = await runVerificationLike(harness);

    // SC-003's contract-level boundary: the completed run's own measured
    // timing evidence must satisfy the documented whole-run upper bound. An
    // implementation whose finishedAt - startedAt exceeds ten minutes fails
    // here regardless of shape, bracketing, or per-check coverage above.
    expect(typeof result.startedAt).toBe("number");
    expect(typeof result.finishedAt).toBe("number");
    expect(result.finishedAt! - result.startedAt!).toBeLessThanOrEqual(
      VERIFICATION_WHOLE_RUN_BOUND_MS,
    );
    // The bound is a real ceiling, not vacuous: the same run's measured
    // check time is positive and well inside it, so the assertion
    // discriminates an over-bound span rather than trivially holding.
    const measuredTotal = harness.probeOrder.reduce(
      (total, contract) => total + VERIFICATION_STEP_DURATIONS[contract],
      0,
    );
    expect(measuredTotal).toBeGreaterThan(0);
    expect(measuredTotal).toBeLessThanOrEqual(VERIFICATION_WHOLE_RUN_BOUND_MS);
    expect(result.exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Run identity and the fixed parity statement — FR-011 (tests-first for
// T049).
// ---------------------------------------------------------------------------

describe("Verification run identity and parity statement — T041 (tests-first for T049)", () => {
  it("the run carries an opaque non-empty runId, unique per run, and identifies its release candidate", async () => {
    const harness = makeVerificationHarness();

    const result = await runVerificationLike(harness);
    const second = await runVerificationLike(harness);

    expect(typeof result.runId).toBe("string");
    expect(result.runId!.length).toBeGreaterThan(0);
    // A fresh opaque identifier per run.
    expect(second.runId).not.toBe(result.runId);
    // The immutable candidate identifier of the verified release.
    expect(result.releaseRevision).toBe(SYNTHETIC_RELEASE_REVISION);
    expect(second.releaseRevision).toBe(SYNTHETIC_RELEASE_REVISION);
  });

  it("a passing run carries the fixed non-parity statement verbatim", async () => {
    const harness = makeVerificationHarness();

    const result = await runVerificationLike(harness);

    expect(result.parityStatement).toBe(VERIFICATION_PARITY_STATEMENT);
  });

  it("a failing run still carries the fixed non-parity statement verbatim", async () => {
    const harness = makeVerificationHarness();
    harness.stepOutcomes.startup = stepFailure("STARTUP_FAILED", "orchestration");

    const result = await runVerificationLike(harness);

    expect(result.exitCode).not.toBe(0);
    expect(result.parityStatement).toBe(VERIFICATION_PARITY_STATEMENT);
  });
});

// ---------------------------------------------------------------------------
// Development/Verification independence — FR-008/FR-009; quickstart §6
// (tests-first for T049).
// ---------------------------------------------------------------------------

describe("Development/Verification independence — T041 (tests-first for T049)", () => {
  it("with Development running, the run never drives the Development adapters, locks, assessments, or mutations, and leaves Development untouched", async () => {
    const harness = makeVerificationHarness({ development: "running" });
    const developmentBefore = clone(harness.developmentState.inventory);
    const processesBefore = new Set(harness.developmentState.processes);

    const result = await runVerificationLike(harness);

    expect(result.exitCode).toBe(0);
    // The run never drives the Development daily adapters: no Development
    // database work, no native daily process supervision, no Development
    // persistence-marker access (the Verification runtime is owned by the
    // verification facet, never by the daily collaborators).
    for (const prefix of ["database:", "process:", "marker:", "migrate", "migrations:"]) {
      expect(harness.events.some((event) => event.startsWith(prefix))).toBe(false);
    }
    // No Development lock or evidence evaluation is taken or required.
    expect(harness.events).not.toContain("lock:acquire:development");
    expect(harness.events).not.toContain("assessment:evaluate:development");
    // Every executed mutation stayed bounded to the disposable Verification
    // resources, through the exact-resource path only.
    for (const key of harness.mutationState.removedExact) {
      expect(VERIFICATION_DISPOSABLE_KEYS).toContain(key);
    }
    expect(harness.mutationState.forbiddenInvocations).toEqual([]);
    // Development is exactly as found: inventory unchanged, engine still
    // running, native processes untouched.
    expect(harness.developmentState.inventory).toEqual(developmentBefore);
    expect(harness.developmentState.running).toBe(true);
    expect(harness.developmentState.processes).toEqual(processesBefore);
  });

  it("the run is independent of Development state — with Development stopped and absent it still produces the complete passing ordered run", async () => {
    const harness = makeVerificationHarness({ development: "stopped-absent" });

    const result = await runVerificationLike(harness);

    // quickstart §6: Development may be stopped or running. With the whole
    // Development target stopped and its inventory absent, the run neither
    // depends on it nor addresses it, and completes passing.
    expect(result.exitCode).toBe(0);
    expect(emittedContracts(result)).toEqual([...VERIFICATION_CONTRACTS]);
    const checks = expectValidCheckResults(result);
    for (const contract of VERIFICATION_CONTRACTS) {
      expect(checks.get(contract)?.result).toBe("pass");
    }
    for (const prefix of ["database:", "process:", "marker:"]) {
      expect(harness.events.some((event) => event.startsWith(prefix))).toBe(false);
    }
    expect(harness.developmentState.inventory).toEqual([]);
    expect(harness.developmentState.running).toBe(false);
  });
});

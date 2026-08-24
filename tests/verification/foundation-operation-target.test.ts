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
 * fixture, forced-failure, or real-tool error.
 */

import { describe, expect, it } from "vitest";
import {
  devRestart,
  devPersistenceCheck,
  foundationInventory,
  type OperationResult,
} from "../../scripts/foundation-operations.mjs";

// ---------------------------------------------------------------------------
// Synthetic, non-secret inputs. No real port, credential, connection string,
// external tool output, or Production constant appears here.
// ---------------------------------------------------------------------------

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

/** The individually recorded exact Development Data Store resources. */
const DEV_DATASTORE_KEYS = ["development.database", "development.database-volume"] as const;

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
 * `nonTargetDigest` this suite proves. No digest value is pinned — only
 * presence, stability, and sensitivity.
 */
interface InventoryResult {
  exitCode: number;
  reasonCode?: string;
  token?: string;
  resources?: string[];
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
    const { collaborators, events, markerState, dbState } = harness;
    const token = await issueResetToken(harness);
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

    // Only the explicitly confirmed Development Data Store resources changed:
    // every resource gained or lost by the Development target is a Data Store
    // key, and the executed mutation plan is exactly that set.
    const beforeKeys = new Set(developmentBefore.resources ?? []);
    const afterKeys = new Set(developmentAfter.resources ?? []);
    const changed = [
      ...[...beforeKeys].filter((k) => !afterKeys.has(k)),
      ...[...afterKeys].filter((k) => !beforeKeys.has(k)),
    ];
    expect(changed.length).toBeGreaterThan(0);
    for (const key of changed) {
      expect(DEV_DATASTORE_KEYS).toContain(key);
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

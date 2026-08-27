/**
 * T021 — Failing interruption and recovery-decision contract tests.
 *
 * References: FR-003, FR-017; User Story 1 acceptance scenario 3 and Edge
 * Cases; contracts/foundation-operations.md §Commands (`foundation:status`,
 * `foundation:recover`, `foundation:test-interruption`) and §Failure behavior;
 * data-model.md §Lifecycle Operation, §Recovery Assessment, and
 * §State Transitions; plan.md §Operations and verification; quickstart.md
 * §5 (documented interruption phase `after-journal` and the three documented
 * recovery decisions); Constitution Principles I–VI (esp. V proportionate
 * verification); accepted T019/T020 harness and collaborator contracts.
 *
 * This is the tests-first contract for the T032–T034/T037
 * lifecycle/recovery boundary of the single planned operations module
 * `scripts/foundation-operations.mjs`. It drives the recovery command
 * surface — `foundation:status` (one normalized Recovery Assessment),
 * `foundation:test-interruption` (acceptance-only fault injection),
 * `foundation:recover` (the sole allowlisted Development repair), plus the
 * retry/re-set re-invocations `devStart`/`devReset`/`foundationCleanup` —
 * through DETERMINISTIC INJECTED/FAKE collaborators for the lifecycle
 * journal, fault injection, normalized recovery evidence, the allowlisted
 * repair and its postchecks, confirmation, locking, inventory, mutation,
 * configuration, and the daily runtime adapters. No real Podman/Compose is
 * invoked, no real process is started or stopped, no signal is delivered to
 * a real process, no listener is bound, no network request is made, no host
 * resource is mutated, and no machine state is depended on.
 *
 * Verdict normalization (deriving ownership/integrity/repeatability/
 * reconstructibility verdicts and evidence digests from raw checks) is owned
 * by T033; the injected `assessment` collaborator supplies the NORMALIZED
 * evidence (the same facet T020 established), and these tests pin the
 * DOCUMENTED FIXED DECISION ORDER derived from it:
 *   1. any unconfirmed/unknown applicable evidence ⇒ `manual-review` and no
 *      mutation token;
 *   2. confirmed ownership + valid/not-applicable integrity + safe
 *      repeatability ⇒ `retry`;
 *   3. Development only: allowlisted verified repair ⇒ `recover`;
 *   4. Development only: confirmed reconstructibility + unavailable/failed
 *      repair ⇒ `reset`;
 *   5. Verification only: confirmed exact ownership + confirmed
 *      disposable/reconstructible resources ⇒ `cleanup`;
 *   6. every other state ⇒ `manual-review`.
 * Earlier rows dominate later rows when several would match. Development
 * permits only retry/recover/reset/manual-review; Verification permits only
 * retry/cleanup/manual-review.
 *
 * Attempts (retry/recover/reset/cleanup) are proven BOUND to the origin
 * operation/action/phase, operation target/runtime profile, the immutable
 * original failure, the assessment evidence, the selected action/repair, and
 * the mutation plan — observed through the journal records the module writes,
 * never through invented token serialization, timestamps, provider command
 * spelling, or Production constants. A failed attempt appends a secondary
 * Safe Diagnostic and never replaces the original primary failure, and the
 * target is left stopped/not-ready with no duplicate active resources.
 *
 * EXPECTED RED: the only reason this suite fails is that the
 * T032–T034/T037 `scripts/foundation-operations.mjs` implementation boundary
 * does not exist yet. The failure is a module-resolution error for that one
 * intentionally absent module — not a syntax, discovery, dependency,
 * fixture, forced-failure, or real-tool error.
 */

import { describe, expect, it } from "vitest";
import {
  devStart,
  devReset,
  foundationInventory,
  foundationStatus,
  foundationRecover,
  foundationTestInterruption,
  foundationCleanup,
  type OperationResult,
} from "../../scripts/foundation-operations.mjs";
// The T043 suite observes the SAME existing module through a NAMESPACE
// import, exactly like the accepted T041/T042 suites in their files: its
// expected-red boundary is one missing named export of an already-implemented
// module (the planned T049 Verification run orchestration entry
// `verifyProductionLike`), not an absent module. A named import would turn
// that missing export into a file-wide import error and redden the accepted
// T021 cases above with it.
import * as FoundationOperationsModule from "../../scripts/foundation-operations.mjs";

// ---------------------------------------------------------------------------
// Synthetic, non-secret inputs. No real port, credential, connection string,
// external tool output, or Production constant appears here.
// ---------------------------------------------------------------------------

/** The sole allowlisted Development repair (data-model §Recovery Assessment). */
const ALLOWLISTED_REPAIR = "recreate-database-runtime-preserve-volume";

/** A synthetic non-allowlisted repair id (generic/unreviewed repairs are
 * never available). */
const UNREVIEWED_REPAIR = "synthetic-unreviewed-repair";

/**
 * The documented interruption phase exercised by quickstart §5
 * (`--phase after-journal`): the journal is durably written before any
 * service work occurs, so an interruption there performs no service work.
 */
const AFTER_JOURNAL_PHASE = "after-journal";

/** Target-appropriate decision sets (Operations Contract `foundation:status`). */
const DEVELOPMENT_DECISIONS = ["retry", "recover", "reset", "manual-review"] as const;
const VERIFICATION_DECISIONS = ["retry", "cleanup", "manual-review"] as const;

/** Safe Diagnostic logical shape (Operations Contract §Safe diagnostic
 * contract): every field required by the contract except the optional
 * `configurationKey`; synthetic, non-secret values only. */
interface SafeDiagnostic {
  reasonCode: string;
  diagnosticScope: string;
  component: string;
  configurationKey?: string;
  remediation: string;
}

function safeDiagnostic(overrides: Partial<SafeDiagnostic> = {}): SafeDiagnostic {
  return {
    reasonCode: "SYNTHETIC_FAILURE",
    diagnosticScope: "daily",
    component: "synthetic-component",
    remediation: "synthetic-remediation",
    ...overrides,
  };
}

/** Lifecycle Operation journal record (data-model §Lifecycle Operation). */
interface LifecycleJournal {
  operationId: string;
  operationTarget: "development" | "verification";
  runtimeProfile: "daily" | "verification";
  action: string;
  phase: string;
  state: "running" | "passed" | "failed" | "interrupted" | "ownership-blocked";
  inventoryDigest: string;
  mutationPlanDigest: string;
  primaryFailure?: SafeDiagnostic;
  secondaryFailures: SafeDiagnostic[];
  recoveryAssessment?: RecoveryAssessmentRecord;
}

/** Recovery Assessment (data-model §Recovery Assessment) — the exact
 * documented field set, asserted by these tests. */
interface RecoveryAssessmentRecord {
  originOperationId: string;
  originAction: string;
  originPhase: string;
  originalFailure: SafeDiagnostic;
  operationTarget: "development" | "verification";
  runtimeProfile: "daily" | "verification";
  ownershipVerdict: string;
  integrityVerdict: string;
  repeatabilityVerdict: string;
  reconstructibilityVerdict: string;
  repairDisposition: string;
  repairId?: string;
  inventoryDigest: string;
  integrityEvidenceDigest: string;
  reconstructibilityEvidenceDigest?: string;
  mutationPlanDigest: string;
  decision: string;
  attemptFailures: SafeDiagnostic[];
  resolution: string;
}

/**
 * Normalized recovery evidence supplied by the injected `assessment`
 * collaborator (the same facet the accepted T020 contract established). The
 * verdict fields and digests are the documented §Recovery Assessment inputs;
 * the two boolean action predicates keep the T020 confirmation-token contract
 * coherent with this richer evidence. `reconstructibilityConfirmed` is
 * derived from the verdict so the two surfaces cannot disagree silently.
 */
interface RecoveryEvidence {
  ownershipVerdict: "confirmed" | "unconfirmed";
  integrityVerdict: "valid" | "invalid" | "not-applicable" | "unknown";
  repeatabilityVerdict: "safe" | "unsafe" | "unknown";
  reconstructibilityVerdict:
    | "confirmed"
    | "not-reconstructible"
    | "not-applicable"
    | "unknown";
  repairDisposition: "verified-available" | "unavailable" | "failed" | "not-applicable";
  inventoryDigest: string;
  integrityEvidenceDigest: string;
  reconstructibilityEvidenceDigest?: string;
  mutationPlanDigest: string;
  /** Cleanup-applicable predicate (every target resource confirmed
   * disposable) — T020 compatibility. */
  disposabilityConfirmed: boolean;
  /** Reset-applicable predicate, derived from the verdict. */
  reconstructibilityConfirmed: boolean;
}

function recoveryEvidence(overrides: Partial<RecoveryEvidence> = {}): RecoveryEvidence {
  const base: RecoveryEvidence = {
    ownershipVerdict: "confirmed",
    integrityVerdict: "valid",
    repeatabilityVerdict: "safe",
    reconstructibilityVerdict: "not-applicable",
    repairDisposition: "not-applicable",
    inventoryDigest: "synthetic-inventory-digest",
    integrityEvidenceDigest: "synthetic-integrity-evidence-digest",
    reconstructibilityEvidenceDigest: "synthetic-reconstructibility-evidence-digest",
    mutationPlanDigest: "synthetic-mutation-plan-digest",
    disposabilityConfirmed: true,
    reconstructibilityConfirmed: true,
  };
  const merged = { ...base, ...overrides };
  merged.reconstructibilityConfirmed =
    overrides.reconstructibilityConfirmed ?? merged.reconstructibilityVerdict === "confirmed";
  return merged;
}

// Evidence presets, one per documented decision row and refusal gate. The
// base preset (no overrides) satisfies decision row 2 (`retry`).
const EVIDENCE_RETRY = recoveryEvidence();
const EVIDENCE_RECOVER = recoveryEvidence({
  integrityVerdict: "invalid",
  repeatabilityVerdict: "unsafe",
  repairDisposition: "verified-available",
});
const EVIDENCE_RESET_FAILED_REPAIR = recoveryEvidence({
  integrityVerdict: "invalid",
  repeatabilityVerdict: "unsafe",
  repairDisposition: "failed",
  reconstructibilityVerdict: "confirmed",
});
const EVIDENCE_RESET_UNAVAILABLE_REPAIR = recoveryEvidence({
  integrityVerdict: "not-applicable",
  repeatabilityVerdict: "unsafe",
  repairDisposition: "unavailable",
  reconstructibilityVerdict: "confirmed",
});
const EVIDENCE_CLEANUP = recoveryEvidence({
  integrityVerdict: "not-applicable",
  repeatabilityVerdict: "unsafe",
  reconstructibilityVerdict: "confirmed",
});
// Row-1 gates: one unconfirmed/unknown applicable verdict at a time.
const EVIDENCE_OWNERSHIP_UNCONFIRMED = recoveryEvidence({ ownershipVerdict: "unconfirmed" });
const EVIDENCE_INTEGRITY_UNKNOWN = recoveryEvidence({ integrityVerdict: "unknown" });
const EVIDENCE_REPEATABILITY_UNKNOWN = recoveryEvidence({ repeatabilityVerdict: "unknown" });
const EVIDENCE_RECONSTRUCTIBILITY_UNKNOWN = recoveryEvidence({
  integrityVerdict: "invalid",
  repeatabilityVerdict: "unsafe",
  repairDisposition: "failed",
  reconstructibilityVerdict: "unknown",
});
// Row-6 residual: no row matches.
const EVIDENCE_MANUAL_RESIDUAL = recoveryEvidence({
  integrityVerdict: "invalid",
  repeatabilityVerdict: "unsafe",
  repairDisposition: "unavailable",
  reconstructibilityVerdict: "not-reconstructible",
});

/** A safe Development daily configuration (synthetic, non-secret). */
const SAFE_DEV_CONFIG = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "daily",
  APP_HOST: "127.0.0.1",
  APP_PORT: "10443",
  PUBLIC_ORIGIN: "http://127.0.0.1:10443",
  // T027-B01: the DATABASE_URL identity is the canonical Development identity
  // (apps/server/src/config.ts `TARGET_IDENTITY` — the committed .env example
  // credentials), so the journaled daily commands' canonical re-validation
  // accepts this fixture exactly like a real local configuration.
  DATABASE_URL:
    "mysql://songhealth_dev:dev-only-placeholder@127.0.0.1:3306/songhealth_development",
  DATABASE_POOL_MAX: "4",
  PROXY_POLICY: "none",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
} as const;

/**
 * The complete custom reverse-DNS label set every manifest resource carries
 * (contract §Operation-target ownership and isolation), used so injected
 * inventory observations are exactly owned and token issuance is not blocked
 * by ownership — the dimension under test here is the recovery evidence.
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

const DEV_DATASTORE_KEYS = [
  "development.database",
  "development.network",
  "development.database-volume",
] as const;
const VERIFICATION_DISPOSABLE_KEYS = ["verification.nginx", "verification.network"] as const;

// ---------------------------------------------------------------------------
// Shared coherent fake state.
// ---------------------------------------------------------------------------

interface DbState {
  running: boolean;
  startCount: number;
  stopCount: number;
  migrationsApplied: boolean;
  volumeDeleted: boolean;
}

interface RecoveryState {
  /** The allowlisted repair ran. */
  runtimeRecreated: boolean;
  /** The named volume/data is preserved by the repair (never deleted). */
  volumePreserved: boolean;
  /** Postcheck results the repair adapter reports. */
  postchecks: { connectivity: boolean; integrity: boolean; migrationStatus: boolean };
}

/** Mutable backing journal store, keyed by operation target. */
interface JournalState {
  records: Record<string, LifecycleJournal[]>;
}

/** Deep copy for synthetic (JSON-safe) records. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Unique synthetic operation ids (opaque; no value is pinned by the tests). */
let syntheticOperationCount = 0;
function syntheticOperationId(): string {
  syntheticOperationCount += 1;
  return `synthetic-origin-operation-${syntheticOperationCount}`;
}

/** Seed an interrupted/unclosed Development journal record (arrange state). */
function interruptedJournal(
  overrides: Partial<LifecycleJournal> = {},
): LifecycleJournal {
  return {
    operationId: syntheticOperationId(),
    operationTarget: "development",
    runtimeProfile: "daily",
    action: "start",
    phase: AFTER_JOURNAL_PHASE,
    state: "interrupted",
    inventoryDigest: "synthetic-inventory-digest",
    mutationPlanDigest: "synthetic-mutation-plan-digest",
    primaryFailure: safeDiagnostic({ reasonCode: "OPERATION_INTERRUPTED" }),
    secondaryFailures: [],
    ...overrides,
  };
}

/**
 * Build one coherent set of injected collaborators around shared state and a
 * chronological event trace. The returned `collaborators` object is the exact
 * object every operation under test receives; tests mutate it (or the shared
 * state behind it) directly, so every observation handle stays the exact
 * collaborator actually used — an override can never leave an assertion
 * pointed at a stale default. The inferred collaborator type is part of this
 * tests-first contract: the T032–T034/T037 boundary must accept it.
 */
function makeCollaborators() {
  const events: string[] = [];
  const dbState: DbState = {
    running: false,
    startCount: 0,
    stopCount: 0,
    migrationsApplied: false,
    volumeDeleted: false,
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
  const lockState = { available: true, heldBy: null as string | null };
  const assessmentState = { evidence: recoveryEvidence() };
  const mutationState = { removedExact: [] as string[], forbiddenInvocations: [] as string[] };
  const confirmationState = {
    verifiedActions: [] as string[],
    verifiedTokens: [] as string[],
    issuedTokens: {} as Record<string, string[]>,
  };
  const journalState: JournalState = { records: { development: [], verification: [] } };
  const interruptionState = { armedAction: "start", armedPhase: AFTER_JOURNAL_PHASE };
  const recoveryState: RecoveryState = {
    runtimeRecreated: false,
    volumePreserved: true,
    postchecks: { connectivity: true, integrity: true, migrationStatus: true },
  };
  const configState = {
    profile: "daily" as "daily" | "verification",
    /** Synthetic configuration overrides (refusal classes under test). */
    overrides: {} as Record<string, string>,
  };
  const failState = {
    /** The database refuses to start (a failed retry attempt). */
    databaseStart: false,
    /** The exact-resource mutation refuses to run (failed reset/cleanup). */
    removeExact: false,
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
        if (failState.databaseStart) throw new Error("synthetic retry failure");
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
        dbState.migrationsApplied = true;
        events.push("migrate:applied");
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
        return clone(assessmentState.evidence);
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
        confirmationState.verifiedActions.push(action);
        confirmationState.verifiedTokens.push(token);
        events.push(`confirmation:verify:${target}:${action}`);
        return (confirmationState.issuedTokens[`${target}:${action}`] ?? []).includes(token);
      },
    },
    mutation: {
      removeExactResource: async (logicalKey: string) => {
        if (failState.removeExact) throw new Error("synthetic mutation failure");
        mutationState.removedExact.push(logicalKey);
        events.push(`mutation:removeExact:${logicalKey}`);
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
    // T021 — the lifecycle journal store (data-model §Lifecycle Operation).
    // `write` records every journal record the module persists, in order, so
    // attempt binding and immutable-primary-failure proofs observe the exact
    // durable state the module wrote. `readLatest` returns the newest record
    // for the target.
    journal: {
      readLatest: async (target: string) => {
        events.push(`journal:read:${target}`);
        const list = journalState.records[target] ?? [];
        return list.length ? clone(list[list.length - 1]) : null;
      },
      write: async (target: string, record: LifecycleJournal) => {
        (journalState.records[target] ??= []).push(clone(record));
        events.push(`journal:write:${target}:${record.state}`);
      },
    },
    // T021 — the acceptance-only fault source. The module polls it while an
    // injected operation runs; the fake fires only for the exact armed
    // (action, phase), so the injection is proven phase-targeted rather than
    // pre-emptive.
    interruption: {
      shouldInterrupt: async (action: string, phase: string) => {
        events.push(`interruption:check:${action}:${phase}`);
        return action === interruptionState.armedAction && phase === interruptionState.armedPhase;
      },
    },
    // T021 — the sole allowlisted Development repair and its postchecks.
    // Forbidden strategies (reset, SQL repair, migration rollback, backup
    // restore) are recorded so a test can assert they are never invoked.
    recovery: {
      recreateDatabaseRuntimePreserveVolume: async () => {
        recoveryState.runtimeRecreated = true;
        events.push("recovery:recreate-runtime-preserve-volume");
      },
      postchecks: async () => {
        events.push("recovery:postchecks");
        return { ...recoveryState.postchecks };
      },
      performReset: async () => {
        events.push("recovery:forbidden:reset");
      },
      sqlRepair: async () => {
        events.push("recovery:forbidden:sql-repair");
      },
      rollbackMigration: async () => {
        events.push("recovery:forbidden:rollback-migration");
      },
      restoreBackup: async () => {
        events.push("recovery:forbidden:restore-backup");
      },
    },
  };

  return {
    collaborators,
    events,
    dbState,
    processState,
    inventoryState,
    lockState,
    assessmentState,
    mutationState,
    confirmationState,
    journalState,
    interruptionState,
    recoveryState,
    configState,
    failState,
  };
}

type Harness = ReturnType<typeof makeCollaborators>;

/** Seed an interrupted (or unclosed) journal directly as arrange state. */
function seedJournal(harness: Harness, record: LifecycleJournal): LifecycleJournal {
  harness.journalState.records[record.operationTarget].push(clone(record));
  return record;
}

/**
 * Prove no service work, mutation, confirmation, recovery, or destructive
 * bypass occurred — used by refusal/read-only proofs. Journal reads,
 * inspections, and evidence evaluation remain permitted observations.
 */
function expectNoMutationOfWork(harness: Harness): void {
  const { events, dbState, processState, mutationState, confirmationState } = harness;
  expect(events.some((e) => e.startsWith("lock:"))).toBe(false);
  expect(events.some((e) => e.startsWith("mutation:"))).toBe(false);
  expect(events.some((e) => e.startsWith("confirmation:"))).toBe(false);
  expect(events.some((e) => e.startsWith("recovery:"))).toBe(false);
  expect(events.some((e) => e.startsWith("database:"))).toBe(false);
  expect(events.some((e) => e.startsWith("process:"))).toBe(false);
  expect(dbState.running).toBe(false);
  expect(dbState.volumeDeleted).toBe(false);
  expect(processState.running.size).toBe(0);
  expect(mutationState.removedExact).toEqual([]);
  expect(mutationState.forbiddenInvocations).toEqual([]);
  expect(Object.keys(confirmationState.issuedTokens)).toEqual([]);
}

/**
 * Prove no forbidden broad-deletion or forbidden recovery strategy was ever
 * invoked, regardless of whether the operation was accepted or refused.
 */
function expectNoForbiddenStrategy(harness: Harness): void {
  expect(harness.mutationState.forbiddenInvocations).toEqual([]);
  expect(
    harness.events.filter((e) => e.startsWith("recovery:forbidden:")),
  ).toEqual([]);
  expect(harness.dbState.volumeDeleted).toBe(false);
  expect(harness.events).not.toContain("database:deleteVolume");
}

/**
 * Find the journal record of an attempt bound to the given origin operation,
 * if any. Returns the FIRST matching record's recovery assessment.
 */
function findAttemptAssessment(
  harness: Harness,
  target: string,
  originOperationId: string,
): RecoveryAssessmentRecord | undefined {
  for (const record of harness.journalState.records[target] ?? []) {
    if (record.recoveryAssessment?.originOperationId === originOperationId) {
      return record.recoveryAssessment;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// foundation:test-interruption — acceptance-only fault injection
// (tests-first for T032/T037).
// ---------------------------------------------------------------------------

describe("Foundation interruption injection — T021 (tests-first for T032/T037)", () => {
  it("records an interrupted journal with the OPERATION_INTERRUPTED primary failure at the requested phase — before any service work at after-journal", async () => {
    const harness = makeCollaborators();
    const { collaborators, journalState, events } = harness;

    const result: OperationResult = await foundationTestInterruption(collaborators, {
      target: "development",
      action: "start",
      phase: AFTER_JOURNAL_PHASE,
    });

    // Interrupted operations fail: the target does not become ready.
    expect(result.exitCode).not.toBe(0);
    // The fault fired at the requested phase before the journal recorded the
    // interruption (phase-targeted injection, not a pre-emptive abort).
    const checkIndex = events.findIndex((e) =>
      e.startsWith(`interruption:check:`) && e.endsWith(`:${AFTER_JOURNAL_PHASE}`),
    );
    const writeIndex = events.indexOf("journal:write:development:interrupted");
    expect(checkIndex).toBeGreaterThanOrEqual(0);
    expect(writeIndex).toBeGreaterThan(checkIndex);
    // The durable journal state: interrupted at the requested action/phase
    // with the documented interruption reason code in the safe shape.
    const latest = journalState.records.development.at(-1);
    expect(latest?.state).toBe("interrupted");
    expect(latest?.action).toBe("start");
    expect(latest?.phase).toBe(AFTER_JOURNAL_PHASE);
    expect(latest?.primaryFailure?.reasonCode).toBe("OPERATION_INTERRUPTED");
    expect(latest?.primaryFailure?.remediation).toBeTruthy();
    // The interruption happens after the journal is durable and before any
    // service work: at after-journal nothing was started, locked, mutated,
    // or confirmed.
    expectNoMutationOfWork(harness);
    expectNoForbiddenStrategy(harness);
  });

  it("leaves the operation target stopped/not-ready with no duplicate active resources and no destructive work", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, processState, journalState } = harness;

    const result = await foundationTestInterruption(collaborators, {
      target: "development",
      action: "start",
      phase: AFTER_JOURNAL_PHASE,
    });

    expect(result.exitCode).not.toBe(0);
    // FR-017: the affected operation target stays stopped/not-ready.
    expect(dbState.running).toBe(false);
    expect(processState.running.size).toBe(0);
    expect(processState.startCount).toEqual({});
    // No duplicate active resources and no destructive bypass of any kind.
    expectNoForbiddenStrategy(harness);
    expect(journalState.records.development.filter((r) => r.state === "interrupted").length).toBe(
      1,
    );
  });

  it("does not interrupt when the injected fault is armed for a different phase — the operation completes normally", async () => {
    const harness = makeCollaborators();
    const { collaborators, interruptionState, journalState } = harness;
    // Arm the fault for an action this run never performs: the injection must
    // never fire for an unarmed (action, phase).
    interruptionState.armedAction = "stop";

    const result = await foundationTestInterruption(collaborators, {
      target: "development",
      action: "start",
      phase: AFTER_JOURNAL_PHASE,
    });

    expect(result.exitCode).toBe(0);
    expect(
      journalState.records.development.some((r) => r.state === "interrupted"),
    ).toBe(false);
  });

  it("injects for the Verification operation target too (interrupted cleanup)", async () => {
    const harness = makeCollaborators();
    const { collaborators, configState, journalState } = harness;
    configState.profile = "verification";

    const result = await foundationTestInterruption(collaborators, {
      target: "verification",
      action: "cleanup",
      phase: AFTER_JOURNAL_PHASE,
    });

    expect(result.exitCode).not.toBe(0);
    const latest = journalState.records.verification.at(-1);
    expect(latest?.state).toBe("interrupted");
    expect(latest?.action).toBe("cleanup");
    expect(latest?.operationTarget).toBe("verification");
    expect(latest?.primaryFailure?.reasonCode).toBe("OPERATION_INTERRUPTED");
    expectNoMutationOfWork(harness);
    expectNoForbiddenStrategy(harness);
  });

  it.each([["stop"], ["migrate"], ["reset"]] as [string][])(
    "interrupts the Development %s action at the allowlisted phase with matching journal evidence and a stopped target",
    async (action) => {
      const harness = makeCollaborators();
      const {
        collaborators,
        interruptionState,
        journalState,
        events,
        dbState,
        processState,
      } = harness;
      // Arm and request the SAME action: the run must actually be interrupted
      // at the requested phase, not complete because the fault never matched.
      interruptionState.armedAction = action;

      const result: OperationResult = await foundationTestInterruption(collaborators, {
        target: "development",
        action,
        phase: AFTER_JOURNAL_PHASE,
      });

      // Interrupted operations fail and the target stays stopped/not-ready
      // with no duplicate active resources (FR-017).
      expect(result.exitCode).not.toBe(0);
      expect(dbState.running).toBe(false);
      expect(processState.running.size).toBe(0);
      expect(dbState.startCount).toBe(0);
      // The fault fired for THIS action at the requested phase before the
      // journal durably recorded the interruption — the interruption is
      // action-targeted, not incidental.
      const checkIndex = events.indexOf(`interruption:check:${action}:${AFTER_JOURNAL_PHASE}`);
      const writeIndex = events.indexOf("journal:write:development:interrupted");
      expect(checkIndex).toBeGreaterThanOrEqual(0);
      expect(writeIndex).toBeGreaterThan(checkIndex);
      // Journal evidence: interrupted at the requested action/phase with the
      // documented interruption reason code as the primary failure, exactly
      // once.
      const latest = journalState.records.development.at(-1);
      expect(latest?.state).toBe("interrupted");
      expect(latest?.action).toBe(action);
      expect(latest?.phase).toBe(AFTER_JOURNAL_PHASE);
      expect(latest?.primaryFailure?.reasonCode).toBe("OPERATION_INTERRUPTED");
      expect(
        journalState.records.development.filter((r) => r.state === "interrupted").length,
      ).toBe(1);
      // after-journal precedes any mutation: no lock, token, mutation,
      // recovery, or destructive work of any kind.
      expectNoMutationOfWork(harness);
      expectNoForbiddenStrategy(harness);
    },
  );

  it.each([
    [
      "production-derived fixture provenance",
      { FIXTURE_PROVENANCE: "production-derived" },
      "CONFIG_UNSUPPORTED",
    ],
    ["hosted runtime profile", { RUNTIME_PROFILE: "hosted" }, "CONFIG_IDENTITY_CONFLICT"],
  ] as [string, Record<string, string>, string][])(
    "foundation:test-interruption refuses %s before any injection or work",
    async (_label, overrides, reasonCode) => {
      const harness = makeCollaborators();
      const { collaborators, journalState, configState } = harness;
      configState.overrides = overrides;

      const result = await foundationTestInterruption(collaborators, {
        target: "development",
        action: "start",
        phase: AFTER_JOURNAL_PHASE,
      });

      // Hosted/Production-derived fault injection is refused: non-zero, the
      // documented configuration rejection reason code, and no interruption
      // state, no service work, no mutation.
      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBe(reasonCode);
      expect(journalState.records.development).toEqual([]);
      expectNoMutationOfWork(harness);
      expectNoForbiddenStrategy(harness);
    },
  );
});

// ---------------------------------------------------------------------------
// foundation:status — one normalized Recovery Assessment in the documented
// fixed decision order (tests-first for T033/T037).
// ---------------------------------------------------------------------------

describe("Foundation recovery assessment — T021 decision order (tests-first for T033/T037)", () => {
  it("emits exactly one read-only assessment without lock, token, mutation, or recovery work", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal());
    assessmentState.evidence = recoveryEvidence();

    const result = await foundationStatus(collaborators, { target: "development" });

    const assessment = result.assessment as RecoveryAssessmentRecord | undefined;
    expect(assessment).toBeTruthy();
    expect(typeof assessment?.decision).toBe("string");
    // Read-only: status never locks, mints a token, mutates, or recovers.
    expectNoMutationOfWork(harness);
    expectNoForbiddenStrategy(harness);
  });

  it("binds the assessment to the origin operation/action/phase, target/profile, immutable original failure, and evidence digests", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    const origin = seedJournal(
      harness,
      interruptedJournal({ action: "migrate", phase: AFTER_JOURNAL_PHASE }),
    );
    assessmentState.evidence = recoveryEvidence();

    const result = await foundationStatus(collaborators, { target: "development" });

    const assessment = result.assessment as RecoveryAssessmentRecord;
    expect(assessment.originOperationId).toBe(origin.operationId);
    expect(assessment.originAction).toBe("migrate");
    expect(assessment.originPhase).toBe(AFTER_JOURNAL_PHASE);
    expect(assessment.operationTarget).toBe("development");
    expect(assessment.runtimeProfile).toBe("daily");
    // The original failure is carried immutably into the assessment.
    expect(assessment.originalFailure).toEqual(origin.primaryFailure);
    // Evidence digests are present and opaque (no value is pinned).
    expect(assessment.inventoryDigest).toBeTruthy();
    expect(assessment.integrityEvidenceDigest).toBeTruthy();
    expect(assessment.mutationPlanDigest).toBeTruthy();
  });

  it("treats an unclosed running journal as interrupted on the next invocation", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    const origin = seedJournal(
      harness,
      interruptedJournal({ state: "running", primaryFailure: undefined }),
    );
    assessmentState.evidence = recoveryEvidence();

    const result = await foundationStatus(collaborators, { target: "development" });

    // The unclosed running journal is assessed (treated as interrupted), not
    // ignored and not crashed on.
    const assessment = result.assessment as RecoveryAssessmentRecord;
    expect(assessment.originOperationId).toBe(origin.operationId);
    expect(assessment.decision).toBe("retry");
    expectNoMutationOfWork(harness);
  });

  it.each([
    ["ownership is unconfirmed", EVIDENCE_OWNERSHIP_UNCONFIRMED],
    ["integrity is unknown", EVIDENCE_INTEGRITY_UNKNOWN],
    ["repeatability is unknown", EVIDENCE_REPEATABILITY_UNKNOWN],
    [
      "applicable reconstructibility is unknown (reset would otherwise apply)",
      EVIDENCE_RECONSTRUCTIBILITY_UNKNOWN,
    ],
  ] as [string, RecoveryEvidence][])(
    "row 1: unknown/unconfirmed applicable evidence (%s) yields manual-review and no mutation token",
    async (_label, evidence) => {
      const harness = makeCollaborators();
      const { collaborators, assessmentState } = harness;
      seedJournal(harness, interruptedJournal());
      assessmentState.evidence = clone(evidence);

      const result = await foundationStatus(collaborators, { target: "development" });
      const assessment = result.assessment as RecoveryAssessmentRecord;
      expect(assessment.decision).toBe("manual-review");

      // No mutation token is available from any destructive/recovery action:
      // reset and recover both refuse issuance under row 1.
      const reset = await foundationInventory(collaborators, {
        target: "development",
        action: "reset",
      });
      expect(reset.token).toBeFalsy();
      const recover = await foundationInventory(collaborators, {
        target: "development",
        action: "recover",
        operation: "start",
        repair: ALLOWLISTED_REPAIR,
      });
      expect(recover.token).toBeFalsy();
      expectNoMutationOfWork(harness);
      expectNoForbiddenStrategy(harness);
    },
  );

  it("row 2: confirmed ownership, valid integrity, and safe repeatability yields retry", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal());
    assessmentState.evidence = clone(EVIDENCE_RETRY);

    const result = await foundationStatus(collaborators, { target: "development" });
    expect((result.assessment as RecoveryAssessmentRecord).decision).toBe("retry");
  });

  it("row order: retry dominates recover — a verified-available repair does not divert a safely repeatable valid state", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal());
    // Satisfies row 2 AND row 3 simultaneously: row 2 must win.
    assessmentState.evidence = recoveryEvidence({ repairDisposition: "verified-available" });

    const result = await foundationStatus(collaborators, { target: "development" });
    expect((result.assessment as RecoveryAssessmentRecord).decision).toBe("retry");
  });

  it("row 3: Development invalid-but-repairable state with the allowlisted verified repair yields recover", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal());
    assessmentState.evidence = clone(EVIDENCE_RECOVER);

    const result = await foundationStatus(collaborators, { target: "development" });
    const assessment = result.assessment as RecoveryAssessmentRecord;
    expect(assessment.decision).toBe("recover");
    expect(assessment.repairId).toBe(ALLOWLISTED_REPAIR);
  });

  it("row order: recover dominates reset — verified-available repair wins over confirmed reconstructibility with failed repair", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal());
    // Satisfies row 3 AND row 4 simultaneously (reconstructibility confirmed,
    // repair verified-available): row 3 must win.
    assessmentState.evidence = recoveryEvidence({
      integrityVerdict: "invalid",
      repeatabilityVerdict: "unsafe",
      repairDisposition: "verified-available",
      reconstructibilityVerdict: "confirmed",
    });

    const result = await foundationStatus(collaborators, { target: "development" });
    expect((result.assessment as RecoveryAssessmentRecord).decision).toBe("recover");
  });

  it.each([
    ["failed repair", EVIDENCE_RESET_FAILED_REPAIR],
    ["unavailable repair", EVIDENCE_RESET_UNAVAILABLE_REPAIR],
  ] as [string, RecoveryEvidence][])(
    "row 4: Development confirmed reconstructibility with %s yields reset",
    async (_label, evidence) => {
      const harness = makeCollaborators();
      const { collaborators, assessmentState } = harness;
      seedJournal(harness, interruptedJournal());
      assessmentState.evidence = clone(evidence);

      const result = await foundationStatus(collaborators, { target: "development" });
      expect((result.assessment as RecoveryAssessmentRecord).decision).toBe("reset");
    },
  );

  it("row 5: Verification confirmed exact ownership with confirmed disposable/reconstructible resources yields cleanup", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState, configState } = harness;
    configState.profile = "verification";
    seedJournal(
      harness,
      interruptedJournal({
        operationTarget: "verification",
        runtimeProfile: "verification",
        action: "cleanup",
        primaryFailure: safeDiagnostic({
          reasonCode: "OPERATION_INTERRUPTED",
          diagnosticScope: "verification",
        }),
      }),
    );
    assessmentState.evidence = clone(EVIDENCE_CLEANUP);

    const result = await foundationStatus(collaborators, { target: "verification" });
    expect((result.assessment as RecoveryAssessmentRecord).decision).toBe("cleanup");
  });

  it("row 6: a state no row permits (not reconstructible, repair unavailable) yields manual-review", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal());
    assessmentState.evidence = clone(EVIDENCE_MANUAL_RESIDUAL);

    const result = await foundationStatus(collaborators, { target: "development" });
    const assessment = result.assessment as RecoveryAssessmentRecord;
    expect(assessment.decision).toBe("manual-review");
    // No destructive token is issued for a manual-review state.
    const reset = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(reset.token).toBeFalsy();
    expectNoMutationOfWork(harness);
  });

  it("target-appropriateness: a recover-shaped state on Verification yields manual-review, never recover or reset", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState, configState } = harness;
    configState.profile = "verification";
    seedJournal(
      harness,
      interruptedJournal({
        operationTarget: "verification",
        runtimeProfile: "verification",
        action: "start",
        primaryFailure: safeDiagnostic({
          reasonCode: "OPERATION_INTERRUPTED",
          diagnosticScope: "verification",
        }),
      }),
    );
    // The recover evidence shape plus unconfirmed disposability: row 3/4 are
    // Development-only, row 5 needs confirmed disposability — only row 6 can
    // decide.
    assessmentState.evidence = recoveryEvidence({
      integrityVerdict: "invalid",
      repeatabilityVerdict: "unsafe",
      repairDisposition: "verified-available",
      disposabilityConfirmed: false,
    });

    const result = await foundationStatus(collaborators, { target: "verification" });
    const assessment = result.assessment as RecoveryAssessmentRecord;
    expect(assessment.decision).toBe("manual-review");
    expect(VERIFICATION_DECISIONS).toContain(assessment.decision);
    // Verification disposal is the cleanup decision, never recover: no
    // recovery token exists for a Verification target.
    const recover = await foundationInventory(collaborators, {
      target: "verification",
      action: "recover",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
    });
    expect(recover.token).toBeFalsy();
  });

  it("target-appropriateness: a cleanup-shaped state on Development yields manual-review, never cleanup", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal());
    assessmentState.evidence = clone(EVIDENCE_CLEANUP);

    const result = await foundationStatus(collaborators, { target: "development" });
    const assessment = result.assessment as RecoveryAssessmentRecord;
    expect(assessment.decision).toBe("manual-review");
    expect(DEVELOPMENT_DECISIONS).toContain(assessment.decision);
  });

  it.each([
    ["retry", EVIDENCE_RETRY],
    ["recover", EVIDENCE_RECOVER],
    ["reset (failed repair)", EVIDENCE_RESET_FAILED_REPAIR],
    ["manual-review (unknown integrity)", EVIDENCE_INTEGRITY_UNKNOWN],
    ["manual-review (residual)", EVIDENCE_MANUAL_RESIDUAL],
  ] as [string, RecoveryEvidence][])(
    "every Development decision stays inside the documented target-appropriate set (%s)",
    async (_label, evidence) => {
      const harness = makeCollaborators();
      const { collaborators, assessmentState } = harness;
      seedJournal(harness, interruptedJournal());
      assessmentState.evidence = clone(evidence);

      const result = await foundationStatus(collaborators, { target: "development" });
      expect(DEVELOPMENT_DECISIONS).toContain(
        (result.assessment as RecoveryAssessmentRecord).decision,
      );
    },
  );

  it.each([
    ["retry", EVIDENCE_RETRY],
    ["cleanup", EVIDENCE_CLEANUP],
    ["manual-review (unconfirmed ownership)", EVIDENCE_OWNERSHIP_UNCONFIRMED],
    ["manual-review (residual)", EVIDENCE_MANUAL_RESIDUAL],
  ] as [string, RecoveryEvidence][])(
    "every Verification decision stays inside the documented target-appropriate set (%s)",
    async (_label, evidence) => {
      const harness = makeCollaborators();
      const { collaborators, assessmentState, configState } = harness;
      configState.profile = "verification";
      seedJournal(
        harness,
        interruptedJournal({
          operationTarget: "verification",
          runtimeProfile: "verification",
          action: "cleanup",
          primaryFailure: safeDiagnostic({
            reasonCode: "OPERATION_INTERRUPTED",
            diagnosticScope: "verification",
          }),
        }),
      );
      assessmentState.evidence = clone(evidence);

      const result = await foundationStatus(collaborators, { target: "verification" });
      expect(VERIFICATION_DECISIONS).toContain(
        (result.assessment as RecoveryAssessmentRecord).decision,
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Recovery attempts — binding, immutable primary failure, and secondary
// attempt failures (tests-first for T032–T034/T037).
// ---------------------------------------------------------------------------

describe("Foundation recovery attempts — T021 binding and immutable primary failure (tests-first for T032–T034/T037)", () => {
  it("a retry re-invocation of the interrupted action binds the attempt to the origin and resolves it without duplicate resources", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState, journalState, dbState, processState } = harness;
    // Arrange the interrupted state through the module's own injection
    // surface so the two contracts provably connect.
    const interrupted = await foundationTestInterruption(collaborators, {
      target: "development",
      action: "start",
      phase: AFTER_JOURNAL_PHASE,
    });
    expect(interrupted.exitCode).not.toBe(0);
    const origin = journalState.records.development.find(
      (r) => r.state === "interrupted",
    )!;
    const originSnapshot = clone(origin);
    assessmentState.evidence = clone(EVIDENCE_RETRY);
    const status = await foundationStatus(collaborators, { target: "development" });
    expect((status.assessment as RecoveryAssessmentRecord).decision).toBe("retry");
    harness.events.length = 0;

    // Act: retry = re-invoke the interrupted origin action.
    const result = await devStart(collaborators);

    expect(result.exitCode).toBe(0);
    // The origin journal record is never rewritten. The journal appends one
    // record per durable phase, so the origin operation's INTERRUPTED terminal
    // record — the one the assessment was derived from — is the record that
    // must survive the retry byte-for-byte.
    const originStill = journalState.records.development.find(
      (r) => r.operationId === origin.operationId && r.state === "interrupted",
    );
    expect(originStill).toEqual(originSnapshot);
    // The attempt is bound to the origin operation/action/phase, target and
    // profile, the immutable original failure, the evidence and mutation-plan
    // digests, and the selected action.
    const attempt = findAttemptAssessment(harness, "development", origin.operationId);
    expect(attempt).toBeTruthy();
    expect(attempt?.originAction).toBe("start");
    expect(attempt?.originPhase).toBe(AFTER_JOURNAL_PHASE);
    expect(attempt?.operationTarget).toBe("development");
    expect(attempt?.runtimeProfile).toBe("daily");
    expect(attempt?.originalFailure).toEqual(originSnapshot.primaryFailure);
    expect(attempt?.decision).toBe("retry");
    expect(attempt?.mutationPlanDigest).toBeTruthy();
    // Readiness requires successful postchecks, not merely an authorized
    // action: the successful retry resolves the assessment.
    expect(attempt?.resolution).toBe("resolved");
    // FR-017: no duplicate active resources from the repeated start.
    expect(dbState.startCount).toBe(1);
    for (const name of ["server", "public", "admin"]) {
      expect(processState.startCount[name]).toBe(1);
    }
    expectNoForbiddenStrategy(harness);
  });

  it("a failed retry appends a secondary diagnostic without replacing the original failure and leaves the target stopped/not-ready", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState, journalState, dbState, processState, failState } =
      harness;
    seedJournal(harness, interruptedJournal());
    assessmentState.evidence = clone(EVIDENCE_RETRY);
    const originSnapshot = clone(journalState.records.development[0]);
    // The retry attempt itself fails: the database refuses to start.
    failState.databaseStart = true;

    const result = await devStart(collaborators);

    expect(result.exitCode).not.toBe(0);
    // The origin record is untouched.
    const originStill = journalState.records.development.find(
      (r) => r.operationId === originSnapshot.operationId,
    );
    expect(originStill).toEqual(originSnapshot);
    // The attempt carries the ORIGINAL failure immutably — not the retry's
    // own failure — and appends the retry failure as a secondary attempt
    // diagnostic in the safe shape.
    const attempt = findAttemptAssessment(harness, "development", originSnapshot.operationId);
    expect(attempt).toBeTruthy();
    expect(attempt?.originalFailure).toEqual(originSnapshot.primaryFailure);
    expect(attempt?.attemptFailures.length).toBeGreaterThan(0);
    for (const failure of attempt?.attemptFailures ?? []) {
      expect(failure.reasonCode).toBeTruthy();
      expect(failure.remediation).toBeTruthy();
    }
    // Unresolved: the target stays stopped/not-ready, no duplicates, no
    // destructive bypass.
    expect(attempt?.resolution).toBe("unresolved");
    expect(dbState.running).toBe(false);
    expect(processState.running.size).toBe(0);
    expectNoForbiddenStrategy(harness);
  });

  it.each([
    ["manual-review", EVIDENCE_INTEGRITY_UNKNOWN],
    ["recover", EVIDENCE_RECOVER],
  ] as [string, RecoveryEvidence][])(
    "retry is rejected without a matching assessment: a %s decision refuses the next daily action entirely",
    async (_label, evidence) => {
      const harness = makeCollaborators();
      const { collaborators, assessmentState } = harness;
      seedJournal(harness, interruptedJournal());
      assessmentState.evidence = clone(evidence);

      const result = await devStart(collaborators);

      // An interrupted operation permits ONLY a documented safe retry or a
      // verified non-destructive recovery: with a non-retry decision, the
      // next action is refused before any work.
      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBeTruthy();
      expectNoMutationOfWork(harness);
      expectNoForbiddenStrategy(harness);
    },
  );

  it("foundation:inventory issues a recovery token only for the recover decision, the allowlisted repair, and the bound origin action", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal({ action: "start" }));
    assessmentState.evidence = clone(EVIDENCE_RECOVER);

    const issued = await foundationInventory(collaborators, {
      target: "development",
      action: "recover",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
    });
    expect(issued.exitCode).toBe(0);
    // Token presence only: no value or serialization is pinned.
    expect(typeof issued.token).toBe("string");
    expect(issued.token!.length).toBeGreaterThan(0);

    // A generic or unreviewed repair is never available: no token.
    const unreviewed = await foundationInventory(collaborators, {
      target: "development",
      action: "recover",
      operation: "start",
      repair: UNREVIEWED_REPAIR,
    });
    expect(unreviewed.token).toBeFalsy();
    expectNoForbiddenStrategy(harness);
  });

  it.each([
    ["retry", EVIDENCE_RETRY],
    ["manual-review", EVIDENCE_MANUAL_RESIDUAL],
  ] as [string, RecoveryEvidence][])(
    "no recovery token is issued when the assessment decision is %s",
    async (_label, evidence) => {
      const harness = makeCollaborators();
      const { collaborators, assessmentState } = harness;
      seedJournal(harness, interruptedJournal());
      assessmentState.evidence = clone(evidence);

      const result = await foundationInventory(collaborators, {
        target: "development",
        action: "recover",
        operation: "start",
        repair: ALLOWLISTED_REPAIR,
      });

      expect(result.token).toBeFalsy();
      expectNoMutationOfWork(harness);
    },
  );

  it("the sole Development recovery runs only the allowlisted repair, preserves the volume, and passes its postchecks after the repair", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState, events, journalState, recoveryState } = harness;
    seedJournal(harness, interruptedJournal({ action: "start" }));
    assessmentState.evidence = clone(EVIDENCE_RECOVER);
    const originSnapshot = clone(journalState.records.development[0]);
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "recover",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
    });
    expect(typeof token).toBe("string");
    harness.events.length = 0;

    const result = await foundationRecover(collaborators, {
      target: "development",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
      token: token!,
    });

    expect(result.exitCode).toBe(0);
    // The allowlisted repair ran, exactly once, and the postchecks ran after
    // it (ordering proven from the attempt's own event slice).
    expect(recoveryState.runtimeRecreated).toBe(true);
    const repairIndex = events.indexOf("recovery:recreate-runtime-preserve-volume");
    const postcheckIndex = events.indexOf("recovery:postchecks");
    expect(repairIndex).toBeGreaterThanOrEqual(0);
    expect(postcheckIndex).toBeGreaterThan(repairIndex);
    // Recovery is non-destructive: the named volume/data is preserved and no
    // forbidden strategy (reset, SQL repair, rollback, backup restore, broad
    // deletion) is ever invoked.
    expect(recoveryState.volumePreserved).toBe(true);
    expectNoForbiddenStrategy(harness);
    expect(harness.mutationState.removedExact).toEqual([]);
    // The attempt binds the origin operation/action/phase, target/profile,
    // immutable original failure, digests, selected action, and repair.
    const attempt = findAttemptAssessment(harness, "development", originSnapshot.operationId);
    expect(attempt).toBeTruthy();
    expect(attempt?.originAction).toBe("start");
    expect(attempt?.originPhase).toBe(AFTER_JOURNAL_PHASE);
    expect(attempt?.operationTarget).toBe("development");
    expect(attempt?.runtimeProfile).toBe("daily");
    expect(attempt?.originalFailure).toEqual(originSnapshot.primaryFailure);
    expect(attempt?.decision).toBe("recover");
    expect(attempt?.repairId).toBe(ALLOWLISTED_REPAIR);
    expect(attempt?.mutationPlanDigest).toBeTruthy();
    // Successful postchecks resolve the recovery.
    expect(attempt?.resolution).toBe("resolved");
  });

  it("a failed recovery postcheck appends a secondary diagnostic, preserves the original failure, keeps the volume, and leaves the target not-ready", async () => {
    const harness = makeCollaborators();
    const {
      collaborators,
      assessmentState,
      journalState,
      recoveryState,
      dbState,
      processState,
    } = harness;
    seedJournal(harness, interruptedJournal({ action: "start" }));
    assessmentState.evidence = clone(EVIDENCE_RECOVER);
    const originSnapshot = clone(journalState.records.development[0]);
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "recover",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
    });
    // The repair runs but its connectivity postcheck fails.
    recoveryState.postchecks = { connectivity: false, integrity: true, migrationStatus: true };

    const result = await foundationRecover(collaborators, {
      target: "development",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
      token: token!,
    });

    expect(result.exitCode).not.toBe(0);
    const attempt = findAttemptAssessment(harness, "development", originSnapshot.operationId);
    expect(attempt).toBeTruthy();
    // The original failure stays the primary; the failed postcheck is an
    // appended secondary attempt failure.
    expect(attempt?.originalFailure).toEqual(originSnapshot.primaryFailure);
    expect(attempt?.attemptFailures.length).toBeGreaterThan(0);
    // Readiness requires successful postchecks: unresolved, target
    // stopped/not-ready, volume still preserved, nothing destructive.
    expect(attempt?.resolution).toBe("unresolved");
    expect(dbState.running).toBe(false);
    expect(processState.running.size).toBe(0);
    expect(recoveryState.volumePreserved).toBe(true);
    expectNoForbiddenStrategy(harness);
  });

  it("foundation:recover refuses a Verification target — recovery is Development-only", async () => {
    const harness = makeCollaborators();
    const { collaborators, configState } = harness;
    configState.profile = "verification";

    const result = await foundationRecover(collaborators, {
      target: "verification",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
      token: "",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    // No recovery work of any kind.
    expectNoMutationOfWork(harness);
    expectNoForbiddenStrategy(harness);
  });

  it("foundation:recover refuses an unreviewed repair, a never-issued token, and a changed assessment without any recovery work", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal({ action: "start" }));
    assessmentState.evidence = clone(EVIDENCE_RECOVER);

    // An unreviewed repair id is never allowlisted.
    const unreviewed = await foundationRecover(collaborators, {
      target: "development",
      operation: "start",
      repair: UNREVIEWED_REPAIR,
      token: "",
    });
    expect(unreviewed.exitCode).not.toBe(0);

    // A non-empty token that was never issued through the confirmation
    // boundary must be refused — recovery never accepts an arbitrary token.
    const neverIssued = await foundationRecover(collaborators, {
      target: "development",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
      token: "synthetic-never-issued-token",
    });
    expect(neverIssued.exitCode).not.toBe(0);

    // A validly issued recovery token, but the assessment no longer matches:
    // recovery is rejected without a matching assessment and no repair runs.
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "recover",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
    });
    expect(typeof token).toBe("string");
    assessmentState.evidence = clone(EVIDENCE_MANUAL_RESIDUAL);
    const mismatched = await foundationRecover(collaborators, {
      target: "development",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
      token: token!,
    });
    expect(mismatched.exitCode).not.toBe(0);
    expect(harness.events).not.toContain("recovery:recreate-runtime-preserve-volume");
    expectNoForbiddenStrategy(harness);
  });

  it("a recovery token issued for one interrupted origin action refuses every other origin action with zero repair work (T034-B01)", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState, journalState } = harness;
    seedJournal(harness, interruptedJournal({ action: "start" }));
    assessmentState.evidence = clone(EVIDENCE_RECOVER);
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "recover",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
    });
    expect(typeof token).toBe("string");
    // The pending origin is replaced by an interruption of a DIFFERENT
    // action, and the replayed request names that new origin action: the
    // journal-origin equality check alone cannot distinguish this from a
    // legitimate recovery — only the token's own origin-action binding can.
    journalState.records.development.pop();
    seedJournal(harness, interruptedJournal({ action: "stop" }));
    harness.events.length = 0;

    const result = await foundationRecover(collaborators, {
      target: "development",
      operation: "stop",
      repair: ALLOWLISTED_REPAIR,
      token: token!,
    });

    // The token was issued for the `start` origin action, so replaying it
    // against the `stop` origin is inventory/confirmation drift: non-zero,
    // refused as drift, and NO repair work of any kind ran.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_INVENTORY_CHANGED");
    expect(harness.events).not.toContain("recovery:recreate-runtime-preserve-volume");
    expect(harness.events).not.toContain("recovery:postchecks");
    expect(harness.recoveryState.runtimeRecreated).toBe(false);
    expect(harness.recoveryState.volumePreserved).toBe(true);
    expect(harness.mutationState.removedExact).toEqual([]);
    expectNoForbiddenStrategy(harness);
  });

  it("a recovery token refuses still-recover-eligible normalized-evidence drift with zero repair work (T034-B02)", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    seedJournal(harness, interruptedJournal({ action: "start" }));
    assessmentState.evidence = clone(EVIDENCE_RECOVER);
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "recover",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
    });
    expect(typeof token).toBe("string");
    // Drift that leaves every decision predicate intact: reconstructibility
    // moves from `not-applicable` to `not-reconstructible`, which the fixed
    // row order still resolves to `recover`. Only the confirmation digest —
    // binding the exact evidence VALUES, not a boolean reduction of them —
    // can distinguish this state from the one the token confirmed.
    assessmentState.evidence = clone(EVIDENCE_RECOVER);
    assessmentState.evidence.reconstructibilityVerdict = "not-reconstructible";
    harness.events.length = 0;

    const result = await foundationRecover(collaborators, {
      target: "development",
      operation: "start",
      repair: ALLOWLISTED_REPAIR,
      token: token!,
    });

    // Still-eligible drift is drift: non-zero, refused before any repair
    // work, and the named volume/data remains untouched.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_INVENTORY_CHANGED");
    expect(harness.events).not.toContain("recovery:recreate-runtime-preserve-volume");
    expect(harness.events).not.toContain("recovery:postchecks");
    expect(harness.recoveryState.runtimeRecreated).toBe(false);
    expect(harness.recoveryState.volumePreserved).toBe(true);
    expect(harness.mutationState.removedExact).toEqual([]);
    expectNoForbiddenStrategy(harness);
  });

  it("a confirmed reset selected by the assessment requires its fresh exact token and binds the attempt to the origin", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState, journalState, mutationState } = harness;
    seedJournal(harness, interruptedJournal({ action: "start" }));
    assessmentState.evidence = clone(EVIDENCE_RESET_FAILED_REPAIR);
    const originSnapshot = clone(journalState.records.development[0]);
    const status = await foundationStatus(collaborators, { target: "development" });
    expect((status.assessment as RecoveryAssessmentRecord).decision).toBe("reset");

    // A fresh exact reset token is required and issued for this decision.
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(typeof token).toBe("string");

    const result = await devReset(collaborators, token!);

    expect(result.exitCode).toBe(0);
    // Mutation stays bounded to the individually recorded exact Data Store
    // resources (T020's mechanics); no forbidden strategy.
    for (const key of mutationState.removedExact) {
      expect(DEV_DATASTORE_KEYS).toContain(key);
    }
    expectNoForbiddenStrategy(harness);
    // The origin record is untouched and the attempt is bound to it.
    const originStill = journalState.records.development.find(
      (r) => r.operationId === originSnapshot.operationId,
    );
    expect(originStill).toEqual(originSnapshot);
    const attempt = findAttemptAssessment(harness, "development", originSnapshot.operationId);
    expect(attempt).toBeTruthy();
    expect(attempt?.originAction).toBe("start");
    expect(attempt?.originPhase).toBe(AFTER_JOURNAL_PHASE);
    expect(attempt?.originalFailure).toEqual(originSnapshot.primaryFailure);
    expect(attempt?.decision).toBe("reset");
    expect(attempt?.mutationPlanDigest).toBeTruthy();
    expect(attempt?.resolution).toBe("resolved");
  });

  it("a failed reset attempt appends a secondary diagnostic without replacing the original failure and leaves the target stopped/not-ready", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState, journalState, dbState, mutationState, failState } =
      harness;
    seedJournal(harness, interruptedJournal({ action: "start" }));
    assessmentState.evidence = clone(EVIDENCE_RESET_FAILED_REPAIR);
    const originSnapshot = clone(journalState.records.development[0]);
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(typeof token).toBe("string");
    // The exact-resource mutation itself fails mid-reset.
    failState.removeExact = true;

    const result = await devReset(collaborators, token!);

    expect(result.exitCode).not.toBe(0);
    const originStill = journalState.records.development.find(
      (r) => r.operationId === originSnapshot.operationId,
    );
    expect(originStill).toEqual(originSnapshot);
    const attempt = findAttemptAssessment(harness, "development", originSnapshot.operationId);
    expect(attempt).toBeTruthy();
    expect(attempt?.originalFailure).toEqual(originSnapshot.primaryFailure);
    expect(attempt?.attemptFailures.length).toBeGreaterThan(0);
    expect(attempt?.resolution).toBe("unresolved");
    // The target stays stopped/not-ready; nothing destructive beyond the
    // individually recorded exact path was attempted.
    expect(dbState.running).toBe(false);
    expectNoForbiddenStrategy(harness);
    expect(mutationState.forbiddenInvocations).toEqual([]);
  });

  it("a failed Verification cleanup attempt after an interruption appends a secondary diagnostic while the original failure stays primary", async () => {
    const harness = makeCollaborators();
    const {
      collaborators,
      assessmentState,
      configState,
      journalState,
      mutationState,
      failState,
    } = harness;
    configState.profile = "verification";
    seedJournal(
      harness,
      interruptedJournal({
        operationTarget: "verification",
        runtimeProfile: "verification",
        action: "cleanup",
        primaryFailure: safeDiagnostic({
          reasonCode: "OPERATION_INTERRUPTED",
          diagnosticScope: "verification",
        }),
      }),
    );
    assessmentState.evidence = clone(EVIDENCE_CLEANUP);
    const originSnapshot = clone(journalState.records.verification[0]);
    const status = await foundationStatus(collaborators, { target: "verification" });
    expect((status.assessment as RecoveryAssessmentRecord).decision).toBe("cleanup");
    const { token } = await foundationInventory(collaborators, {
      target: "verification",
      action: "cleanup",
    });
    expect(typeof token).toBe("string");
    // The exact-resource removal fails mid-cleanup.
    failState.removeExact = true;

    const result = await foundationCleanup(collaborators, "verification", token!);

    expect(result.exitCode).not.toBe(0);
    const originStill = journalState.records.verification.find(
      (r) => r.operationId === originSnapshot.operationId,
    );
    expect(originStill).toEqual(originSnapshot);
    const attempt = findAttemptAssessment(harness, "verification", originSnapshot.operationId);
    expect(attempt).toBeTruthy();
    // The interrupted cleanup stays the immutable primary; the failed cleanup
    // attempt is a secondary diagnostic.
    expect(attempt?.originalFailure).toEqual(originSnapshot.primaryFailure);
    expect(attempt?.attemptFailures.length).toBeGreaterThan(0);
    expect(attempt?.decision).toBe("cleanup");
    // The target is left not-ready: the disposable resources were not all
    // removed, and no forbidden strategy ran.
    expect(mutationState.removedExact.length).toBeLessThan(VERIFICATION_DISPOSABLE_KEYS.length);
    expectNoForbiddenStrategy(harness);
  });
});

// ---------------------------------------------------------------------------
// T043 — Verification current-run cleanup, pre-existing-resource refusal,
// target-appropriate cleanup decisions, interrupted cleanup, atomic final
// reporting, and cleanup/reporting secondary-failure precedence
// (tests-first for T049).
//
// References: FR-017, SC-003; contracts/foundation-operations.md §Commands
// (`verify:production-like`, `foundation:status`, `foundation:inventory`,
// `foundation:cleanup`), §Operation-target ownership and isolation,
// §Verification result contract, and §Failure behavior; data-model.md
// §Lifecycle Operation, §Recovery Assessment, §Verification Run, and
// §State Transitions; plan.md §Operations and verification; quickstart.md
// §6; accepted T041/T042 Verification-run collaborator and result contracts.
//
// Where T041 pinned the ordered RESULT contract and T042 pinned the HTTP
// boundary it is derived from, THIS suite pins the run-owned LIFECYCLE
// around those results: the exact current-run cleanup boundary, the
// read-only refusal of pre-existing Verification resources, the
// Verification-appropriate decision routing of a run journal, interrupted
// cleanup, atomic report emission, and the durable-journal precedence of
// cleanup/reporting failures against the immutable primary failure.
//
// EXPECTED RED: the only reason the T043 cases below fail is that the
// planned T049 `verifyProductionLike` orchestration entry of the
// already-implemented `scripts/foundation-operations.mjs` does not exist
// yet. Every T043 case fails on the one clean boundary assertion in
// `verificationLifecycleEntryPoint()` — never on an import, fixture, or
// setup error, and never in the accepted T021 cases above.
// ---------------------------------------------------------------------------

/** The ordered Verification contract inventory (Operations Contract
 * §Verification result contract; identical to the accepted T041 list). */
const T043_VERIFICATION_CONTRACTS = [
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

/** The fixed non-parity statement, verbatim (quickstart §6). */
const T043_PARITY_STATEMENT =
  "Production-like Verification validates bounded application contracts only; it does not establish exact parity with Bangmod/Plesk Production hosting.";

/** The Verification operation target's configuration (contract §Configuration
 * examples): every shared dimension differs from Development. */
const T043_SAFE_VERIFICATION_CONFIG = {
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

/** The lifecycle action of a Production-like Verification run
 * (data-model §Lifecycle Operation allowlisted action enum). */
const T043_VERIFY_ACTION = "verify";

/** One safe synthetic release-candidate identifier (never a real revision). */
const T043_SYNTHETIC_RELEASE_REVISION = "t043-synthetic-release-candidate";

/**
 * A unique synthetic Verification credential sentinel (SC-004): injected into
 * the configuration the run loads, then scanned for in exact and encoded form
 * across every surface the run emits — the atomic report, standard output,
 * and the fallback standard error.
 */
const T043_VERIFY_CREDENTIAL_SENTINEL = "t043-synthetic-verify-credential-7f3a91";

/** One injected per-contract probe outcome (the accepted T041 facet). */
interface T043StepOutcome {
  ok: boolean;
  diagnostic?: SafeDiagnostic;
  revision?: string;
}

/** One ordered Check Result (data-model.md §Verification Run). */
interface T043CheckResult {
  contract: string;
  result: "pass" | "fail";
  diagnostic?: SafeDiagnostic;
  durationMs: number;
}

/** The `verify:production-like` result surface (accepted T041 shape). */
interface T043RunResult extends OperationResult {
  runId?: string;
  releaseRevision?: string;
  startedAt?: number;
  finishedAt?: number;
  state?: string;
  checks?: T043CheckResult[];
  primaryFailure?: SafeDiagnostic;
  parityStatement?: string;
}

/** The planned T049 entry point: `verify:production-like`. */
type T043VerifyProductionLike = (collaborators: unknown) => Promise<T043RunResult>;

/**
 * Resolve the planned Verification run orchestration entry. The single
 * intentional dependency on the not-yet-implemented export: when T049 has
 * not shipped it, EVERY T043 case fails on this one clean boundary
 * assertion — the missing Verification orchestration behavior itself — never
 * on an import, fixture, or setup error, and never in the accepted T021
 * cases above.
 */
function verificationLifecycleEntryPoint(): T043VerifyProductionLike {
  const candidate = (
    FoundationOperationsModule as unknown as Record<string, unknown>
  ).verifyProductionLike;
  expect(typeof candidate).toBe("function");
  return candidate as T043VerifyProductionLike;
}

/** One injected report-validation outcome (the reporting probe's own facet). */
interface T043ReportValidation {
  ok: boolean;
  diagnostic?: SafeDiagnostic;
}

/** The atomic-report emission state owned by the injected `report` facet. */
interface T043ReportState {
  /** Complete-candidate validations performed before any emission. */
  validations: number;
  /** Whole-report records handed to the single atomic write path. */
  emitted: unknown[];
  /** Whether the atomic write itself refuses to complete. */
  failWrite: boolean;
  /** The injected completeness/schema/nondisclosure validation outcome. */
  validation: T043ReportValidation;
}

/** The disposable run-owned runtime state of one Verification run. */
interface T043RunRuntime {
  up: boolean;
  startCount: number;
  presentKeys: string[];
  reportEmitted: boolean;
}

/**
 * Build one coherent set of injected collaborators for the Verification run
 * lifecycle, around shared observable state and a chronological event trace.
 * The Verification inventory starts ABSENT (the required clean pre-state);
 * tests seed pre-existing resources through `preExisting`. The `report`
 * facet is the T043 addition to the accepted T041/T042 collaborator shape:
 * it owns the report artifact lifecycle (complete-candidate validation, then
 * one atomic whole-report write), with every non-atomic emission strategy
 * recorded as a forbidden invocation.
 */
function makeVerificationLifecycleHarness(
  options: {
    preExisting?: Partial<ResourceObservation>[];
    development?: "running" | "stopped-absent";
    /** Synthetic configuration overrides (the sentinel-injection path). */
    configOverrides?: Record<string, string>;
  } = {},
) {
  const development = options.development ?? "running";
  const events: string[] = [];
  const probeOrder: string[] = [];
  const stepOutcomes: Record<string, T043StepOutcome> = {};
  const mutationState = { removedExact: [] as string[], forbiddenInvocations: [] as string[] };
  const runRuntime: T043RunRuntime = {
    up: false,
    startCount: 0,
    presentKeys: [],
    reportEmitted: false,
  };
  const reportState: T043ReportState = {
    validations: 0,
    emitted: [],
    failWrite: false,
    validation: { ok: true },
  };
  const outputState = { stdout: [] as unknown[], stderr: [] as unknown[] };
  const developmentState = {
    running: development === "running",
    processes:
      development === "running" ? new Set(["server", "public", "admin"]) : new Set<string>(),
    inventory:
      development === "running"
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
    volumeDeleted: false,
  };
  const preExisting: ResourceObservation[] = (options.preExisting ?? []).map((overrides) =>
    ownedResource({ resourceType: "container", ...overrides }),
  );
  const lockState = { available: true, heldBy: null as string | null };
  const confirmationState = {
    issuedTokens: {} as Record<string, string[]>,
    verifiedTokens: [] as string[],
  };
  const journalState: JournalState = { records: { development: [], verification: [] } };
  const interruptionState = { armedAction: "", armedPhase: "" };
  const assessmentState = { evidence: recoveryEvidence() };
  const failState = { removeExact: false };
  let clockTime = 1_781_000_000_000;
  let confirmationTokenCount = 0;

  /**
   * The complete synthetic candidate the reporting probe validates and then
   * emits atomically: the ordered results, the parity statement, and no
   * protected value.
   */
  function candidateReport(): Record<string, unknown> {
    return {
      parityStatement: T043_PARITY_STATEMENT,
      contracts: [...T043_VERIFICATION_CONTRACTS],
      synthetic: true,
    };
  }

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
        events.push("database:start");
        developmentState.running = true;
      },
      stop: async () => {
        events.push("database:stop");
        developmentState.running = false;
      },
      isRunning: async () => developmentState.running,
      applyMigrations: async () => {
        events.push("migrate:applied");
      },
      migrationStatus: async () => "current" as const,
      deleteVolume: async () => {
        developmentState.volumeDeleted = true;
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
      load: async () => {
        events.push("config:load");
        return {
          ...T043_SAFE_VERIFICATION_CONFIG,
          ...(options.configOverrides ?? {}),
        };
      },
    },
    inventory: {
      inspect: async (target: string) => {
        events.push(`inventory:inspect:${target}`);
        if (target === "verification") {
          const runOwned = runRuntime.presentKeys.map((key) =>
            ownedResource({
              logicalKey: key,
              resourceType: key.endsWith("network") ? "network" : "container",
            }),
          );
          return [...preExisting, ...runOwned].map((r) => ({ ...r }));
        }
        return developmentState.inventory.map((r) => ({ ...r }));
      },
    },
    assessment: {
      evaluate: async (target: string) => {
        events.push(`assessment:evaluate:${target}`);
        return clone(assessmentState.evidence);
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
        const token = `t043-confirmation-token:${confirmationTokenCount}`;
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
        if (failState.removeExact) throw new Error("synthetic mutation failure");
        mutationState.removedExact.push(logicalKey);
        events.push(`mutation:removeExact:${logicalKey}`);
        runRuntime.presentKeys = runRuntime.presentKeys.filter((key) => key !== logicalKey);
        preExisting.splice(
          preExisting.findIndex((r) => r.logicalKey === logicalKey),
          1,
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
    },
    journal: {
      readLatest: async (target: string) => {
        events.push(`journal:read:${target}`);
        const list = journalState.records[target] ?? [];
        return list.length ? clone(list[list.length - 1]) : null;
      },
      write: async (target: string, record: LifecycleJournal) => {
        (journalState.records[target] ??= []).push(clone(record));
        events.push(`journal:write:${target}:${record.state}`);
      },
    },
    interruption: {
      shouldInterrupt: async (action: string, phase: string) => {
        events.push(`interruption:check:${action}:${phase}`);
        return action === interruptionState.armedAction && phase === interruptionState.armedPhase;
      },
    },
    output: {
      stdout: async (unit: unknown) => {
        outputState.stdout.push(unit);
      },
      stderr: async (unit: unknown) => {
        outputState.stderr.push(unit);
      },
      applicationLog: async () => {
        events.push("output:application-log");
      },
      httpFailure: async () => {
        events.push("output:http-failure");
      },
    },
    // The T043 facet: the report artifact lifecycle. `validate` performs the
    // complete-candidate completeness/schema/nondisclosure validation;
    // `writeAtomic` is the ONLY permitted emission path. Every non-atomic
    // strategy is recorded so a test can assert it is never invoked.
    report: {
      validate: async (candidate: unknown): Promise<T043ReportValidation> => {
        reportState.validations += 1;
        events.push("report:validate");
        void candidate;
        return clone(reportState.validation);
      },
      writeAtomic: async (record: unknown) => {
        reportState.emitted.push(clone(record));
        events.push("report:write:atomic");
      },
      writeIncremental: async () => {
        events.push("report:forbidden:write-incremental");
      },
      appendStream: async () => {
        events.push("report:forbidden:append-stream");
      },
      overwriteInPlace: async () => {
        events.push("report:forbidden:overwrite-in-place");
      },
    },
    // The accepted T041 facet: one injected probe per contract result. The
    // probe owns each check's own side effects — starting the disposable
    // run runtime, disposing it at cleanup, and (for `reporting`) driving
    // the `report` facet's validate-then-emit-atomically lifecycle. The
    // ORDER of the probes and the cleanup-before-reporting obligation
    // belong to the orchestration and are proven through the event trace.
    verification: {
      runCheck: async (contract: string): Promise<T043StepOutcome> => {
        probeOrder.push(contract);
        events.push(`verification:check:${contract}`);
        clockTime += 1_000;
        if (contract === "startup") {
          runRuntime.up = true;
          runRuntime.startCount += 1;
          runRuntime.presentKeys = [...VERIFICATION_DISPOSABLE_KEYS];
          events.push("verification:runtime:up");
        }
        if (contract === "cleanup" && runRuntime.up) {
          for (const key of [...runRuntime.presentKeys]) {
            await collaborators.mutation.removeExactResource(key);
          }
          runRuntime.up = false;
          events.push("verification:runtime:down");
        }
        if (contract === "reporting") {
          const validation = await collaborators.report.validate(candidateReport());
          if (!validation.ok) return { ok: false, diagnostic: validation.diagnostic! };
          if (reportState.failWrite) throw new Error("synthetic atomic-report write failure");
          await collaborators.report.writeAtomic(candidateReport());
          runRuntime.reportEmitted = true;
          return { ok: true };
        }
        const injected = stepOutcomes[contract];
        if (injected !== undefined) return clone(injected);
        return contract === "build"
          ? { ok: true, revision: T043_SYNTHETIC_RELEASE_REVISION }
          : { ok: true };
      },
    },
  };

  return {
    collaborators,
    events,
    probeOrder,
    stepOutcomes,
    mutationState,
    runRuntime,
    reportState,
    outputState,
    developmentState,
    /** The Development inventory exactly as the harness was built — the
     * before/after invariance baseline (SC-002 non-target evidence). */
    developmentSnapshot: clone(developmentState.inventory),
    preExisting,
    lockState,
    confirmationState,
    journalState,
    interruptionState,
    assessmentState,
    failState,
  };
}

type T043Harness = ReturnType<typeof makeVerificationLifecycleHarness>;

/** Run the planned Verification operation through the T043 harness. */
async function t043Run(harness: T043Harness): Promise<T043RunResult> {
  return verificationLifecycleEntryPoint()(harness.collaborators);
}

/** One run's checks keyed by contract name. */
function t043Checks(result: T043RunResult): Map<string, T043CheckResult> {
  return new Map((result.checks ?? []).map((check) => [check.contract, check]));
}

/** Prove the automatic cleanup used only the bounded exact-resource path. */
function expectNoForbiddenRemoval(harness: T043Harness): void {
  expect(harness.mutationState.forbiddenInvocations).toEqual([]);
  expect(harness.events.filter((e) => e.startsWith("report:forbidden:"))).toEqual([]);
}

/**
 * Prove the run never drove a Development adapter: no Development database,
 * native process, volume, marker, or Development lock was touched, and the
 * observed Development inventory is byte-for-byte what it started as. The
 * run owns only its own disposable Verification resources.
 */
function expectDevelopmentUntouched(harness: T043Harness): void {
  expect(harness.events.some((e) => e.startsWith("database:"))).toBe(false);
  expect(harness.events.some((e) => e.startsWith("process:"))).toBe(false);
  expect(harness.events.some((e) => e.startsWith("marker:"))).toBe(false);
  expect(harness.events.some((e) => e.startsWith("lock:acquire:development"))).toBe(false);
  expect(harness.developmentState.volumeDeleted).toBe(false);
  expect(harness.developmentState.inventory).toEqual(harness.developmentSnapshot);
}

/**
 * Prove a refusal was READ-ONLY: no lock acquired, no confirmation token
 * issued, no mutation, and no report emitted.
 */
function expectReadOnlyRefusal(harness: T043Harness): void {
  expect(harness.events.some((e) => e.startsWith("lock:"))).toBe(false);
  expect(harness.events.some((e) => e.startsWith("mutation:"))).toBe(false);
  expect(harness.events.some((e) => e.startsWith("confirmation:"))).toBe(false);
  expect(harness.mutationState.removedExact).toEqual([]);
  expect(harness.reportState.emitted).toEqual([]);
  expect(harness.runRuntime.reportEmitted).toBe(false);
  expectNoForbiddenRemoval(harness);
}

/** The documented read-only ownership-refusal reason codes. */
const T043_OWNERSHIP_REFUSAL_CODES = [
  "RESOURCE_OWNERSHIP_UNPROVEN",
  "RESOURCE_INVENTORY_CHANGED",
] as const;

/**
 * Every deterministic encoded form of a sentinel value: exact, URI and
 * URI-component encodings, base64 and base64url, lowercase and uppercase
 * hex, the JSON string-escaped form, and the fully unicode-escaped form
 * (the accepted T042 nondisclosure form set).
 */
function t043EncodedForms(value: string): string[] {
  const utf8 = Buffer.from(value, "utf8");
  const unicodeEscaped = [...value]
    .map((char) => `\\u${char.codePointAt(0)!.toString(16).padStart(4, "0")}`)
    .join("");
  const forms = new Set<string>([
    value,
    encodeURI(value),
    encodeURIComponent(value),
    utf8.toString("base64"),
    utf8.toString("base64url"),
    utf8.toString("hex"),
    utf8.toString("hex").toUpperCase(),
    JSON.stringify(value).slice(1, -1),
    unicodeEscaped,
  ]);
  return [...forms];
}

/** Render one emitted surface as scannable text. */
function t043SurfaceText(units: readonly unknown[]): string {
  return units.map((unit) => (typeof unit === "string" ? unit : JSON.stringify(unit))).join("\n");
}

/**
 * Prove a T043 run surface carries the injected credential sentinel in
 * neither exact nor encoded form (SC-004/FR-007): the atomic report, the
 * command standard output, and the fallback standard error are all safe
 * diagnostic/report surfaces, never protected-value surfaces.
 */
function expectT043SurfaceSanitized(units: readonly unknown[]): void {
  const text = t043SurfaceText(units);
  for (const form of t043EncodedForms(T043_VERIFY_CREDENTIAL_SENTINEL)) {
    expect(
      text.includes(form),
      `credential sentinel form leaked onto a Verification run surface: ${form}`,
    ).toBe(false);
  }
}

/**
 * The documented pre-existing-resource refusal classes (FR-017: "MUST refuse
 * stale, colliding, ambiguous, mislabeled, or unexpectedly active
 * resources"; contract §Operation-target ownership and isolation adds
 * "unexpectedly active/attached"). Each entry is one ownership predicate a
 * typed inspection must prove before any mutation is allowed.
 */
const T043_PRE_EXISTING_REFUSALS = [
  [
    "a stale resource (superseded ownership schema)",
    { logicalKey: "verification.nginx", ownershipSchemaCurrent: false },
  ],
  [
    "a colliding resource (the expected role is occupied by another checkout's project)",
    { logicalKey: "verification.network", resourceType: "network", checkoutProjectMatches: false },
  ],
  [
    "an ambiguous resource (attachment state does not match the manifest)",
    { logicalKey: "verification.nginx", attachmentsExpected: false },
  ],
  [
    "a mislabeled resource (incomplete canonical Compose labels)",
    { logicalKey: "verification.network", resourceType: "network", canonicalLabelsComplete: false },
  ],
  [
    "a mislabeled resource (custom operation-target label names Development)",
    {
      logicalKey: "verification.nginx",
      customLabels: Object.fromEntries(
        CUSTOM_LABEL_KEYS.map((key) => [
          key,
          key === "org.songhealth.foundation.operation-target"
            ? "synthetic:development"
            : `synthetic:${key}`,
        ]),
      ),
    },
  ],
  [
    "an unexpectedly active resource (a container already running before the run starts)",
    { logicalKey: "verification.nginx", runtimeState: "running" },
  ],
  [
    "an unexpectedly attached resource (a mounted volume the manifest does not declare)",
    { logicalKey: "verification.database-volume", resourceType: "volume", unexpectedlyAttached: true },
  ],
] as [string, Partial<ResourceObservation>][];

describe("Verification run module boundary — T043 (tests-first for T049)", () => {
  it("exports the planned Verification run orchestration entry `verifyProductionLike` as a function", () => {
    expect(typeof verificationLifecycleEntryPoint()).toBe("function");
  });
});

describe("Verification current-run cleanup — T043 (tests-first for T049)", () => {
  it("a passing run disposes exactly the disposable resources it created, through the bounded exact-resource path only, and never touches Development", async () => {
    const harness = makeVerificationLifecycleHarness();

    const result = await t043Run(harness);

    expect(result.exitCode).toBe(0);
    // Cleanup removed exactly the current run's own disposable resources —
    // no more, no fewer — and never re-created them.
    expect(harness.mutationState.removedExact).toEqual([...VERIFICATION_DISPOSABLE_KEYS]);
    expect(harness.runRuntime.up).toBe(false);
    expect(harness.runRuntime.presentKeys).toEqual([]);
    expect(harness.runRuntime.startCount).toBe(1);
    expectNoForbiddenRemoval(harness);
    expectDevelopmentUntouched(harness);
    // The cleanup contract result passed.
    expect(t043Checks(result).get("cleanup")?.result).toBe("pass");
  });

  it("a failing main check still performs the exact current-run cleanup after the failure", async () => {
    const harness = makeVerificationLifecycleHarness();
    harness.stepOutcomes.readiness = {
      ok: false,
      diagnostic: safeDiagnostic({
        reasonCode: "SYNTHETIC_READINESS_FAILURE",
        diagnosticScope: "verification",
      }),
    };

    const result = await t043Run(harness);

    expect(result.exitCode).not.toBe(0);
    // Cleanup runs after pass OR fail: the run's own resources are disposed
    // exactly, and the bounded path is the only one used.
    expect(harness.mutationState.removedExact).toEqual([...VERIFICATION_DISPOSABLE_KEYS]);
    expect(harness.runRuntime.up).toBe(false);
    expectNoForbiddenRemoval(harness);
    expectDevelopmentUntouched(harness);
    expect(t043Checks(result).get("readiness")?.result).toBe("fail");
  });

  it("the automatic cleanup is bounded to the current run — it never removes anything the run did not create", async () => {
    const harness = makeVerificationLifecycleHarness();

    await t043Run(harness);

    // Every removal is one of the run's own recorded disposable roles.
    for (const key of harness.mutationState.removedExact) {
      expect(VERIFICATION_DISPOSABLE_KEYS).toContain(key);
    }
    expect(harness.runRuntime.startCount).toBe(1);
    expectNoForbiddenRemoval(harness);
  });
});

describe("Verification pre-existing-resource refusal — T043 (tests-first for T049)", () => {
  it.each(T043_PRE_EXISTING_REFUSALS)(
    "the run refuses %s read-only before any build, start, mutation, or report — no auto-cleaning",
    async (_label, overrides) => {
      const harness = makeVerificationLifecycleHarness({ preExisting: [overrides] });

      const result = await t043Run(harness);

      // The run requires an absent clean Verification inventory; it never
      // silently pre-cleans (quickstart §6, contract §Operation-target
      // ownership and isolation).
      expect(result.exitCode).not.toBe(0);
      expect(T043_OWNERSHIP_REFUSAL_CODES).toContain(result.reasonCode);
      expect(result.primaryFailure?.diagnosticScope).toBe("verification");
      // Read-only refusal: no probe ran, no lock, no token, no mutation, and
      // no report was emitted.
      expect(harness.probeOrder).toEqual([]);
      expectReadOnlyRefusal(harness);
      // The pre-existing resource is still there, untouched.
      expect(harness.preExisting.map((r) => r.logicalKey)).toContain(overrides.logicalKey!);
      expectDevelopmentUntouched(harness);
    },
  );

  it("a clean exactly-owned pre-existing Verification inventory is still refused — disposal is the documented inventory-confirmed cleanup path, never the run's", async () => {
    const harness = makeVerificationLifecycleHarness({
      preExisting: [
        { logicalKey: "verification.nginx", resourceType: "container" },
        {
          logicalKey: "verification.network",
          resourceType: "network",
          runtimeState: "present",
        },
      ],
    });

    const result = await t043Run(harness);

    // Exact ownership does NOT license the run to auto-remove: even a
    // perfectly owned leftover is a pre-existing resource the run must
    // refuse (plan.md "it does not auto-remove stale resources").
    expect(result.exitCode).not.toBe(0);
    expect(T043_OWNERSHIP_REFUSAL_CODES).toContain(result.reasonCode);
    expect(harness.probeOrder).toEqual([]);
    expectReadOnlyRefusal(harness);
    expect(harness.preExisting).toHaveLength(2);
    expectDevelopmentUntouched(harness);
  });
});

describe("Verification-appropriate recovery decisions — T043 (tests-first for T049)", () => {
  /**
   * Seed one interrupted (or unclosed) Verification run journal as arrange
   * state — the pending origin a `foundation:status` assessment derives
   * from. Reuses the accepted T021 arrange helper's exact field set.
   */
  function seedVerificationJournal(
    harness: T043Harness,
    overrides: Partial<LifecycleJournal> = {},
  ): LifecycleJournal {
    const record = interruptedJournal({
      operationTarget: "verification",
      runtimeProfile: "verification",
      action: T043_VERIFY_ACTION,
      primaryFailure: safeDiagnostic({
        reasonCode: "OPERATION_INTERRUPTED",
        diagnosticScope: "verification",
      }),
      ...overrides,
    });
    harness.journalState.records.verification.push(clone(record));
    return record;
  }

  it("an interrupted Verification run journal with confirmed ownership, valid integrity, and safe repeatability yields retry", async () => {
    const harness = makeVerificationLifecycleHarness();
    const { collaborators, assessmentState } = harness;
    const origin = seedVerificationJournal(harness);
    assessmentState.evidence = clone(EVIDENCE_RETRY);

    const result = await foundationStatus(collaborators, { target: "verification" });

    const assessment = result.assessment as RecoveryAssessmentRecord;
    expect(assessment.originOperationId).toBe(origin.operationId);
    expect(assessment.decision).toBe("retry");
    expect(VERIFICATION_DECISIONS).toContain(assessment.decision);
    expectReadOnlyRefusal(harness);
  });

  it("an interrupted cleanup where retry does not apply, with confirmed exact ownership and confirmed disposability, yields cleanup and a fresh cleanup token", async () => {
    const harness = makeVerificationLifecycleHarness({
      // The disposable Verification resources the interrupted cleanup left
      // behind — the exact set a cleanup token must be bound to.
      preExisting: [
        { logicalKey: "verification.nginx", resourceType: "container" },
        {
          logicalKey: "verification.network",
          resourceType: "network",
          runtimeState: "present",
        },
      ],
    });
    const { collaborators, assessmentState } = harness;
    seedVerificationJournal(harness, { action: "cleanup" });
    assessmentState.evidence = clone(EVIDENCE_CLEANUP);

    const status = await foundationStatus(collaborators, { target: "verification" });
    expect((status.assessment as RecoveryAssessmentRecord).decision).toBe("cleanup");

    // The cleanup decision is the only Verification disposal decision, and
    // it is the one action that yields a mutation token.
    const inventory = await foundationInventory(collaborators, {
      target: "verification",
      action: "cleanup",
    });
    expect(typeof inventory.token).toBe("string");
    // No other Verification action is token-eligible.
    for (const action of ["reset", "recover"]) {
      const refused = await foundationInventory(collaborators, {
        target: "verification",
        action,
      });
      expect(refused.token).toBeFalsy();
    }
  });

  it("an unclosed running Verification journal is treated as interrupted on the next invocation — exactly one read-only decision", async () => {
    const harness = makeVerificationLifecycleHarness();
    const { collaborators, assessmentState } = harness;
    const origin = seedVerificationJournal(harness, {
      state: "running",
      primaryFailure: undefined,
    });
    assessmentState.evidence = clone(EVIDENCE_OWNERSHIP_UNCONFIRMED);

    const result = await foundationStatus(collaborators, { target: "verification" });

    // The unclosed `running` journal is assessed as interrupted, not
    // ignored and not crashed on; unconfirmed ownership forces row 1.
    const assessment = result.assessment as RecoveryAssessmentRecord;
    expect(assessment.originOperationId).toBe(origin.operationId);
    expect(assessment.decision).toBe("manual-review");
    expect(VERIFICATION_DECISIONS).toContain(assessment.decision);
    expectReadOnlyRefusal(harness);
  });

  it("a reset-shaped Verification state yields manual-review — the Verification decision vocabulary is exactly retry, cleanup, and manual-review", async () => {
    const harness = makeVerificationLifecycleHarness();
    const { collaborators, assessmentState } = harness;
    seedVerificationJournal(harness);
    // The reset evidence shape: reconstructibility confirmed with an
    // unavailable repair, but disposability NOT confirmed — row 4 is
    // Development-only and row 5 needs confirmed disposability, so only
    // row 6 can decide for a Verification target.
    assessmentState.evidence = clone({
      ...EVIDENCE_RESET_UNAVAILABLE_REPAIR,
      disposabilityConfirmed: false,
    });

    const result = await foundationStatus(collaborators, { target: "verification" });

    const assessment = result.assessment as RecoveryAssessmentRecord;
    expect(assessment.decision).toBe("manual-review");
    expect(VERIFICATION_DECISIONS).toContain(assessment.decision);
    expect(VERIFICATION_DECISIONS).not.toContain("reset");
    expect(VERIFICATION_DECISIONS).not.toContain("recover");
    expectReadOnlyRefusal(harness);
  });
});

describe("Interrupted Verification cleanup — T043 (tests-first for T049)", () => {
  it("an interruption at the run's cleanup phase records OPERATION_INTERRUPTED as the immutable primary, leaves the target not-ready, emits no report, and never duplicates resources", async () => {
    const harness = makeVerificationLifecycleHarness();
    harness.interruptionState.armedAction = T043_VERIFY_ACTION;
    harness.interruptionState.armedPhase = "cleanup";

    const result = await t043Run(harness);

    expect(result.exitCode).not.toBe(0);
    // The fault source was actually polled for this run's own cleanup phase.
    expect(harness.events).toContain(`interruption:check:${T043_VERIFY_ACTION}:cleanup`);
    // Exactly one interrupted journal record, bound to the Verification run.
    const interrupted = harness.journalState.records.verification.filter(
      (r) => r.state === "interrupted",
    );
    expect(interrupted).toHaveLength(1);
    expect(interrupted[0].operationTarget).toBe("verification");
    expect(interrupted[0].action).toBe(T043_VERIFY_ACTION);
    expect(interrupted[0].primaryFailure?.reasonCode).toBe("OPERATION_INTERRUPTED");
    expect(interrupted[0].primaryFailure?.diagnosticScope).toBe("verification");
    // The run never reached reporting and emitted no report.
    expect(harness.probeOrder).not.toContain("reporting");
    expect(harness.reportState.emitted).toEqual([]);
    expect(harness.runRuntime.reportEmitted).toBe(false);
    // The target is left not-ready: the run's own resources were not all
    // disposed, and nothing was re-created (FR-017: no duplicate active
    // resources).
    expect(harness.runRuntime.startCount).toBe(1);
    expect(harness.mutationState.removedExact.length).toBeLessThan(
      VERIFICATION_DISPOSABLE_KEYS.length,
    );
    // Whatever disposal was attempted stayed inside the bounded exact path.
    expectNoForbiddenRemoval(harness);
    expectDevelopmentUntouched(harness);
  });

  it("the next invocation after an interrupted cleanup does not auto-clean the leftover resources — it refuses read-only until the documented cleanup path runs", async () => {
    const harness = makeVerificationLifecycleHarness({
      // Arrange: an interrupted run left its disposable resources behind.
      preExisting: [
        { logicalKey: "verification.nginx", resourceType: "container" },
        {
          logicalKey: "verification.network",
          resourceType: "network",
          runtimeState: "present",
        },
      ],
    });
    const { collaborators, journalState } = harness;
    journalState.records.verification.push(
      clone(
        interruptedJournal({
          operationTarget: "verification",
          runtimeProfile: "verification",
          action: T043_VERIFY_ACTION,
          primaryFailure: safeDiagnostic({
            reasonCode: "OPERATION_INTERRUPTED",
            diagnosticScope: "verification",
          }),
        }),
      ),
    );

    const result = await t043Run(harness);

    // The leftover resources are pre-existing from the run's point of view:
    // it must not silently pre-clean them, and it must not proceed to build.
    expect(result.exitCode).not.toBe(0);
    expect(T043_OWNERSHIP_REFUSAL_CODES).toContain(result.reasonCode);
    expect(harness.probeOrder).toEqual([]);
    expectReadOnlyRefusal(harness);
    expect(harness.journalState.records.verification).toHaveLength(2);
    expectDevelopmentUntouched(harness);
  });
});

describe("Atomic final reporting — T043 (tests-first for T049)", () => {
  it("the report is emitted exactly once, atomically, and only after the current-run cleanup completed", async () => {
    const harness = makeVerificationLifecycleHarness();

    const result = await t043Run(harness);

    expect(result.exitCode).toBe(0);
    // Exactly one whole-report atomic write — never two, never zero.
    expect(harness.reportState.emitted).toHaveLength(1);
    // The candidate was validated before it was emitted.
    expect(harness.reportState.validations).toBeGreaterThanOrEqual(1);
    expect(
      harness.events.indexOf("report:validate") <
        harness.events.indexOf("report:write:atomic"),
    ).toBe(true);
    // Ordering: EVERY cleanup removal precedes the atomic emission, and the
    // reporting probe follows the cleanup probe.
    const lastRemoval = Math.max(
      ...harness.mutationState.removedExact.map((key) =>
        harness.events.indexOf(`mutation:removeExact:${key}`),
      ),
    );
    expect(lastRemoval).toBeGreaterThanOrEqual(0);
    expect(harness.events.indexOf("report:write:atomic")).toBeGreaterThan(lastRemoval);
    expect(harness.probeOrder.indexOf("cleanup")).toBeLessThan(
      harness.probeOrder.indexOf("reporting"),
    );
    expectNoForbiddenRemoval(harness);
  });

  it("when report validation fails, no atomic emission occurs and the reporting result is an explicit FAIL", async () => {
    const harness = makeVerificationLifecycleHarness();
    harness.reportState.validation = {
      ok: false,
      diagnostic: safeDiagnostic({
        reasonCode: "SYNTHETIC_REPORT_VALIDATION_FAILURE",
        diagnosticScope: "verification",
      }),
    };

    const result = await t043Run(harness);

    // The complete-candidate validation gates emission: nothing is written.
    expect(result.exitCode).not.toBe(0);
    expect(harness.reportState.emitted).toEqual([]);
    expect(harness.runRuntime.reportEmitted).toBe(false);
    expect(t043Checks(result).get("reporting")?.result).toBe("fail");
    // Cleanup still ran and still disposed the run's resources exactly.
    expect(harness.mutationState.removedExact).toEqual([...VERIFICATION_DISPOSABLE_KEYS]);
    expectNoForbiddenRemoval(harness);
  });

  it("no incremental, streamed, or in-place report emission path is ever used — only one whole-report atomic write per run", async () => {
    const harness = makeVerificationLifecycleHarness();

    const result = await t043Run(harness);

    expect(result.exitCode).toBe(0);
    expect(harness.reportState.emitted.length).toBe(1);
    expect(harness.events.filter((e) => e.startsWith("report:forbidden:"))).toEqual([]);
  });

  it("when the atomic emission itself fails, the fallback standard error is exactly one closed Safe Diagnostic", async () => {
    const harness = makeVerificationLifecycleHarness();
    harness.reportState.failWrite = true;

    const result = await t043Run(harness);

    expect(result.exitCode).not.toBe(0);
    expect(harness.reportState.emitted).toEqual([]);
    expect(t043Checks(result).get("reporting")?.result).toBe("fail");
    // The fallback is EXACTLY ONE closed unit on standard error — never a
    // raw exception, stack, partial report body, or a duplicated diagnostic
    // emitted once per surface or per retry (Operations Contract
    // §Verification result contract "fallback standard error is itself one
    // Safe Diagnostic").
    expect(harness.outputState.stderr).toHaveLength(1);
    const fallback = harness.outputState.stderr[0] as SafeDiagnostic | undefined;
    expect(fallback).toBeDefined();
    const keys = Object.keys(fallback!);
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
    expect(fallback!.diagnosticScope).toBe("verification");
    expectNoForbiddenRemoval(harness);
  });

  it("the injected Verification credential sentinel never appears on any run-emitted surface in exact or encoded form — not in the atomic report, standard output, or the fallback standard error", async () => {
    const harness = makeVerificationLifecycleHarness({
      configOverrides: {
        DATABASE_URL: `mysql://verify-user:${T043_VERIFY_CREDENTIAL_SENTINEL}@127.0.0.1:13307/songhealth_verify`,
      },
    });
    // Force every emission surface: a failing main check, a failing cleanup,
    // and a failing atomic emission with its standard-error fallback.
    harness.stepOutcomes.readiness = {
      ok: false,
      diagnostic: safeDiagnostic({
        reasonCode: "SYNTHETIC_READINESS_FAILURE",
        diagnosticScope: "verification",
      }),
    };
    harness.failState.removeExact = true;
    harness.reportState.failWrite = true;

    const result = await t043Run(harness);

    expect(result.exitCode).not.toBe(0);
    expect(result.primaryFailure?.reasonCode).toBe("SYNTHETIC_READINESS_FAILURE");
    // The run actually reached every emission surface before the assertions
    // below mean anything.
    expect(harness.outputState.stderr.length).toBeGreaterThan(0);
    // SC-004: no protected value on the report, stdout, or the fallback.
    expectT043SurfaceSanitized(harness.reportState.emitted);
    expectT043SurfaceSanitized(harness.outputState.stdout);
    expectT043SurfaceSanitized(harness.outputState.stderr);
    expectNoForbiddenRemoval(harness);
  });
});

describe("Immutable primary failure and cleanup/reporting precedence — T043 (tests-first for T049)", () => {
  /**
   * The cleanup Check Result's OWN diagnostic — the exact value the
   * precedence rules below must compare against. Derived from the run's own
   * emitted ordered results, never re-authored by the test, so a primary or
   * secondary that is merely "some verification-scoped failure" cannot
   * satisfy the contract.
   */
  function exactCleanupDiagnostic(result: T043RunResult): SafeDiagnostic {
    const diagnostic = t043Checks(result).get("cleanup")?.diagnostic;
    expect(diagnostic).toBeDefined();
    return diagnostic!;
  }

  it("a main failure plus a cleanup failure keeps the main failure primary in the journal and appends the cleanup failure as a secondary diagnostic", async () => {
    const harness = makeVerificationLifecycleHarness();
    const mainFailure = safeDiagnostic({
      reasonCode: "SYNTHETIC_PROXY_FAILURE",
      diagnosticScope: "verification",
    });
    harness.stepOutcomes.proxy = { ok: false, diagnostic: mainFailure };
    harness.failState.removeExact = true;

    const result = await t043Run(harness);

    expect(result.exitCode).not.toBe(0);
    expect(t043Checks(result).get("proxy")?.result).toBe("fail");
    expect(t043Checks(result).get("cleanup")?.result).toBe("fail");
    // The main failure is primary — the later cleanup failure never
    // displaces it, and the primary IS the main check's own diagnostic.
    expect(result.primaryFailure).toEqual(mainFailure);
    const records = harness.journalState.records.verification;
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      if (record.primaryFailure !== undefined) {
        expect(record.primaryFailure).toEqual(mainFailure);
      }
    }
    // The cleanup failure is recorded as a SECONDARY diagnostic, append-only,
    // and that secondary IS the cleanup result's own diagnostic — not an
    // unrelated or re-authored verification-scoped failure.
    const cleanupDiagnostic = exactCleanupDiagnostic(result);
    expect(cleanupDiagnostic).not.toEqual(mainFailure);
    const withSecondary = records.filter((r) => r.secondaryFailures.length > 0);
    expect(withSecondary.length).toBeGreaterThan(0);
    for (const record of withSecondary) {
      expect(record.secondaryFailures).toContainEqual(cleanupDiagnostic);
    }
    // The main failure is never duplicated into the secondary list.
    const allSecondary = withSecondary.flatMap((r) => r.secondaryFailures);
    expect(allSecondary).not.toContainEqual(mainFailure);
  });

  it("when every main result passes but cleanup fails, cleanup becomes the primary failure", async () => {
    const harness = makeVerificationLifecycleHarness();
    harness.failState.removeExact = true;

    const result = await t043Run(harness);

    expect(result.exitCode).not.toBe(0);
    expect(t043Checks(result).get("cleanup")?.result).toBe("fail");
    // With no earlier result failed, the cleanup failure is primary — and it
    // is EXACTLY the cleanup Check Result's own diagnostic, not any other
    // non-zero failure the run might surface.
    const earlier = (result.checks ?? []).filter(
      (check) => check.contract !== "cleanup" && check.contract !== "reporting",
    );
    expect(earlier.every((check) => check.result === "pass")).toBe(true);
    const cleanupDiagnostic = exactCleanupDiagnostic(result);
    expect(result.primaryFailure).toEqual(cleanupDiagnostic);
    // The journal carries the same cleanup diagnostic as its primary.
    const primaries = harness.journalState.records.verification
      .map((record) => record.primaryFailure)
      .filter((d): d is SafeDiagnostic => d !== undefined);
    expect(primaries.length).toBeGreaterThan(0);
    for (const primary of primaries) {
      expect(primary).toEqual(cleanupDiagnostic);
    }
  });

  it("a reporting failure after a passing run makes reporting primary; after a cleanup failure it stays secondary to it", async () => {
    const harness = makeVerificationLifecycleHarness();
    const reportingFailure = safeDiagnostic({
      reasonCode: "SYNTHETIC_REPORT_VALIDATION_FAILURE",
      diagnosticScope: "verification",
    });
    harness.reportState.validation = { ok: false, diagnostic: reportingFailure };

    const result = await t043Run(harness);

    // Every earlier result passed, so reporting is primary — exactly the
    // reporting diagnostic.
    expect(result.exitCode).not.toBe(0);
    expect(t043Checks(result).get("reporting")?.result).toBe("fail");
    expect(result.primaryFailure).toEqual(reportingFailure);

    // The same reporting failure with an also-failing cleanup stays
    // SECONDARY to the cleanup failure: precedence follows the emitted
    // order, not the severity, and the primary is EXACTLY the cleanup
    // Check Result's own diagnostic.
    const second = makeVerificationLifecycleHarness();
    second.failState.removeExact = true;
    second.reportState.validation = { ok: false, diagnostic: reportingFailure };
    const secondResult = await t043Run(second);

    expect(secondResult.exitCode).not.toBe(0);
    expect(t043Checks(secondResult).get("cleanup")?.result).toBe("fail");
    expect(t043Checks(secondResult).get("reporting")?.result).toBe("fail");
    const secondCleanupDiagnostic = exactCleanupDiagnostic(secondResult);
    expect(secondResult.primaryFailure).toEqual(secondCleanupDiagnostic);
    expect(secondResult.primaryFailure).not.toEqual(reportingFailure);
  });

  it("the journal's primary failure is immutable across every record the run writes — no later record overwrites or drops it", async () => {
    const harness = makeVerificationLifecycleHarness();
    const firstFailure = safeDiagnostic({
      reasonCode: "SYNTHETIC_MIGRATION_FAILURE",
      diagnosticScope: "verification",
    });
    harness.stepOutcomes.migration = { ok: false, diagnostic: firstFailure };
    harness.failState.removeExact = true;
    harness.reportState.validation = {
      ok: false,
      diagnostic: safeDiagnostic({
        reasonCode: "SYNTHETIC_REPORT_VALIDATION_FAILURE",
        diagnosticScope: "verification",
      }),
    };

    const result = await t043Run(harness);

    expect(result.exitCode).not.toBe(0);
    expect(result.primaryFailure).toEqual(firstFailure);
    const records = harness.journalState.records.verification;
    expect(records.length).toBeGreaterThan(1);
    // The FIRST complete Safe Diagnostic any record carries is the immutable
    // primary. Every LATER primary-bearing record must carry that exact
    // value — not just its reason code — so mutating or dropping
    // diagnosticScope, component, configurationKey, or remediation fails.
    const primaryBearing = records.filter((r) => r.primaryFailure !== undefined);
    expect(primaryBearing.length).toBeGreaterThan(1);
    const firstPrimary = primaryBearing[0].primaryFailure!;
    expect(firstPrimary).toEqual(firstFailure);
    for (const record of primaryBearing) {
      expect(record.primaryFailure).toEqual(firstPrimary);
    }
    // Once a primary exists, no later record may drop it again.
    const firstIndex = records.findIndex((r) => r.primaryFailure !== undefined);
    for (let index = firstIndex + 1; index < records.length; index += 1) {
      expect(records[index].primaryFailure).toBeDefined();
    }
  });
});

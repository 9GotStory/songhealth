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

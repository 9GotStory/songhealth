/**
 * T019 — Failing preflight and daily setup/start/ready/stop/restart command
 * contract tests (rework for T019-B01, T019-B02, T019-B03).
 * T020 — Failing exact-ownership, action-bound confirmation-token,
 * per-operation-target lock / immediate re-inventory, drift-refusal, bounded
 * exact-mutation, and forbidden-deletion contract tests.
 *
 * References: FR-003, FR-004, FR-006, FR-017, SC-001, SC-002; User Story 1
 * acceptance scenario 3, Edge Cases, and Scope Boundaries;
 * contracts/foundation-operations.md §Prerequisites / §Commands /
 * §Configuration examples / §Safe diagnostic contract /
 * §Operation-target ownership and isolation / §Failure behavior /
 * §Timing boundaries; data-model.md §Owned Runtime Resource /
 * §Resource Inventory; plan.md §Technical Context (Constraints/Scale) /
 * §Project Structure / §Configuration and startup / §Operations and
 * verification / §Testing and security evidence; quickstart.md
 * §Prerequisites and timing boundaries, §1, and §2; Delivery Context approved
 * Development/Podman boundary, explicit out-of-scope boundary, and
 * security/privacy routing; System Blueprint §§334–340, §§335, §§697–703;
 * Constitution Principles I–VI (esp. III traceability, V proportionate
 * verification); accepted root `package.json`, `tsconfig.json`, and
 * `eslint.config.js`; accepted T019 test harness.
 *
 * This is the tests-first contract for the single planned operations
 * boundary `scripts/foundation-operations.mjs` (implemented by T027–T031).
 * It imports that module and drives the six daily commands —
 * `foundation:check`, `dev:setup`, `dev:start`, `dev:ready`, `dev:stop`, and
 * `dev:restart` — plus the T020 destructive/mutation commands
 * `foundation:inventory`, `dev:reset`, and `foundation:cleanup` — through
 * DETERMINISTIC INJECTED/FAKE collaborators for preflight checks, process
 * supervision, readiness probing, clock, configuration, the Development
 * database, typed inventory inspection, per-operation-target locking, the
 * confirmation boundary, and bounded exact-resource mutation. No real Podman/Compose is invoked, no real
 * process is started or stopped, no listener is bound, no network request is
 * made, no host resource is mutated, no filesystem lock is taken, and no
 * machine state is depended on.
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
 * T020: this is the tests-first contract for T030 (typed Podman inventory
 * normalization + exact ownership predicates) and T031 (action-bound tokens,
 * per-operation-target locking, immediate re-inventory, drift refusal, bounded
 * exact mutation). It proves:
 *   - EXACT OWNERSHIP is the full conjunction of exact resource type/name,
 *     checkout-scoped project, manifest membership, the complete canonical
 *     Compose label set, the complete custom reverse-DNS label set, and
 *     expected attachment/mount state. Each single missing, stale, colliding,
 *     ambiguous, mislabeled, or unexpectedly attached/active conjunct leaves
 *     the resource read-only and issues NO confirmation token.
 *   - CONFIRMATION TOKENS are action-bound: emitted only for exact ownership
 *     plus every applicable action predicate, and never for a different
 *     action or a blocked/unproven resource. No invented digest value or
 *     serialization is pinned — only presence, absence, and action-binding.
 *   - A MUTATING operation acquires the exact operation-target lock,
 *     immediately re-inventories / recomputes applicable evidence, and
 *     performs NO mutation when the lock is unavailable, the token is
 *     missing/mismatched, ownership is blocked, or inventory/assessment
 *     evidence drifts. The contract reason codes `RESOURCE_OWNERSHIP_UNPROVEN`
 *     and `RESOURCE_INVENTORY_CHANGED` are used only where their documented
 *     cases apply (unproven ownership vs. inventory drift).
 *   - An ACCEPTED mutation targets only individually recorded exact resources
 *     and never invokes name prefixes, wildcards, label-filter deletion,
 *     `--remove-orphans`, broad `down --volumes`, prune, unresolved variables,
 *     force removal, or broad volume deletion.
 *
 * T020 asserts behavior and observable ordering (lock → re-inventory →
 * evidence recompute → mutation, and mutation only of individually recorded
 * exact resources), not undocumented provider command spelling, token
 * internals, or Production constants. It adds no T021 recovery-decision/journal
 * coverage, no T022 marker/isolation acceptance, no T023 diagnostic-sentinel
 * coverage, no T026 manifests, and no T030+ implementation.
 *
 * T020 rework (T020-B01–T020-B04):
 *   - B01: the observed per-resource custom-label MAP is the sole input to the
 *     custom-label completeness conjunct — the model carries NO separate
 *     completeness boolean, so deleting one documented key is the ONLY change
 *     a partial-set test makes and inspection/ownership must refuse it. An
 *     implementation that ignored the exercised label map and trusted only a
 *     manually supplied boolean would fail. Both a partial custom-label set
 *     (any single documented key missing) and an initially absent expected
 *     manifest resource refuse the token.
 *   - B02: the contract routes reset↔Development and cleanup↔Verification
 *     1:1, so a valid same-target/different-action or same-action/
 *     different-target token cannot exist for those pairs. Action and target
 *     binding are therefore isolated at ISSUANCE: holding one dimension fixed
 *     and varying the other proves the token is issued for the valid pairing
 *     and ABSENT for the invalid one — no token is ever issued for an invalid
 *     target/action pairing, and no token internals are pinned. Issuance
 *     isolation alone, however, only observes whether issuance is permitted:
 *     an implementation could validate the pairing, then construct and verify
 *     a token from the target and evidence while OMITTING the action, and
 *     still pass. The action is therefore also proven bound at
 *     PRESENTATION. `retry`/`recover` cannot be the vehicle: the contract
 *     gates them on T021 Recovery Assessment predicates (origin
 *     operation/action/phase, immutable failure, integrity, phase-specific
 *     repeatability) that the T020 synthetic model does not carry, so a
 *     compliant implementation must REFUSE to issue them — requiring them
 *     would import T021 semantics into T020.
 *
 *     T020 rework (T020-B02): the prior cross-target presentation cases were
 *     confounded — they changed the operation target, the target
 *     inventory/evidence, AND the action together, so an implementation that
 *     validated target/inventory/assessment evidence but OMITTED the action
 *     from token construction or verification would reject both cross-target
 *     tokens and still pass. The action is instead proven bound by observing
 *     the REAL INJECTED CONFIRMATION BOUNDARY (`collaborators.confirmation`):
 *     a mutating command verifies a presented token by calling that boundary
 *     with the operation target, the bound action, and the opaque token, and
 *     the boundary records the action it received in the shared chronological
 *     trace. A validly-issued token is presented to its OWN target's
 *     destructive command (target and all relevant inventory/assessment
 *     evidence therefore remain matched), and the test asserts the boundary
 *     observably RECEIVED AND ENFORCED the bound action — an implementation
 *     that omitted the action from the confirmation would not pass the bound
 *     action to the boundary and would fail. The boundary is a T020-owned,
 *     contract-valid observation: it pins no token value/serialization,
 *     issues no invalid target/action token through `foundation:inventory`,
 *     and imports no T021 Recovery Assessment semantics. The synthetic model
 *     also exposes the applicable reset (reconstructibility) and cleanup
 *     (disposability) action predicates, and each, varied failing before
 *     issuance, refuses the token.
 *
 *     T020 rework (T020-B02, second pass): merely RECORDING the action the
 *     command passed to the boundary is insufficient when the boundary
 *     accepts every non-empty token — an implementation can validate the
 *     target/action pairing, construct and verify a token from only the
 *     target/inventory/assessment evidence (OMITTING the action), and still
 *     pass the bound action to the boundary. The boundary therefore now
 *     ENFORCES the token↔action correlation: it is the token authority —
 *     `foundation:inventory` mints the opaque token through `issue`, and the
 *     boundary records each minted token under the EXACT (target, action) it
 *     was issued for (the opaque token value is used only as a correlation
 *     key — no digest value or serialization is pinned, and no token
 *     internals are inspected). `verify` accepts a presented token ONLY when
 *     it was issued for the exact (target, action) presented. A token that
 *     was never issued, or was issued for a different action, is refused.
 *     This independently fails an implementation that binds
 *     target/inventory/assessment evidence but omits the action from token
 *     construction: the token it presents was not issued for the presented
 *     action, so the boundary refuses it and the mutation is refused. A
 *     negative control drives the boundary directly (issuing a token for one
 *     (target, action) and presenting it to the boundary under a different
 *     action) to prove the correlation is enforced by the boundary itself,
 *     not only by the module's own validation.
 *
 *     T020 rework (T020-B02, third pass): proving the boundary is
 *     action-specific is still insufficient while the OPERATION can
 *     substitute the token — a command can reject a missing token, ignore any
 *     non-empty caller token, mint a fresh correctly-bound token for its
 *     hard-coded target/action after re-inventory, verify that substitute,
 *     and mutate, and every boundary-level assertion still passes. The
 *     observation is therefore extended to the operation: the boundary
 *     records the EXACT opaque token each mutating command submits to
 *     `verify` (`verifiedTokens`, compared opaquely — no value/serialization
 *     pinned), and the accepted reset/cleanup proofs assert the command
 *     submitted the exact caller-presented token AND minted no token of its
 *     own (no `confirmation:issue:` event in the operation's own event
 *     slice). Operation-level refusal proofs then present a non-empty,
 *     real, validly-issued token that was issued for a DIFFERENT
 *     (target, action) pairing to the operation itself — target, inventory,
 *     and assessment evidence all matched, so only the token correlation
 *     fails — and assert the operation submits that exact caller token,
 *     mints no substitute, and the boundary's refusal refuses ALL mutation.
 *     Each case issues its token only for a valid pairing through
 *     `foundation:inventory` and imports no T021 semantics.
 *   - B03: inventory inspection and assessment evaluation enter the
 *     chronological trace, and the ordered-trace assertions enforce IMMEDIACY
 *     and lock scope, not merely increasing indices: the re-inventory is the
 *     event IMMEDIATELY after lock acquisition, the recompute immediately
 *     follows it, and the release is the LAST event (after the mutation or
 *     refusal) — for reset, cleanup, and assessment drift.
 *   - B04: one reusable no-legacy-destructive-bypass assertion
 *     (`expectNoLegacyDestructiveBypass`) is applied to EVERY T020 accepted
 *     and refusal path — the complete matrix: read-only status, token
 *     issuance (valid and invalid pairings), every ownership/conjunct
 *     refusal, initial-missing-resource, ambiguous/colliding,
 *     unexpectedly-attached, applicable-predicate refusal, lock-unavailable,
 *     missing token, blocked-ownership-at-issuance, inventory drift,
 *     mislabeled drift, assessment drift, the confirmation-boundary action
 *     proof, both operation-level mismatched-token refusals, and both
 *     accepted mutation paths. It proves the pre-existing no-argument
 *     `database.deleteVolume` path is never invoked (no trace event), its
 *     `volumeDeleted` state stays untouched, and no forbidden broad-deletion
 *     strategy is invoked — so a legacy destructive bypass cannot escape the
 *     matrix on any path.
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
 * EXPECTED RED: the only reason this suite fails is that the T027–T031
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
  foundationInventory,
  devReset,
  foundationCleanup,
  npmVersionSatisfiesEngines,
  DATABASE_READINESS_TIMEOUT_MS,
  DATABASE_READINESS_POLL_INTERVAL_MS,
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

/**
 * A safe Development daily configuration (synthetic, non-secret). T027 rework
 * (T027-B01): the DATABASE_URL identity is the canonical Development identity
 * the accepted T010 boundary enforces (`songhealth_dev` / `songhealth_development`,
 * the committed `.env.development.example` and T026 manifest credentials) — the
 * pre-rework fixture used a non-canonical user/name that canonical validation
 * must reject.
 */
const SAFE_DEV_CONFIG = {
  APP_ENVIRONMENT: "development",
  RUNTIME_PROFILE: "daily",
  APP_HOST: "127.0.0.1",
  APP_PORT: "10443",
  PUBLIC_ORIGIN: "http://127.0.0.1:10443",
  DATABASE_URL: "mysql://songhealth_dev:dev-only-placeholder@127.0.0.1:13306/songhealth_development",
  DATABASE_POOL_MAX: "4",
  PROXY_POLICY: "none",
  LOG_LEVEL: "info",
  FIXTURE_PROVENANCE: "synthetic",
} as const;

/**
 * The complete custom reverse-DNS label set every manifest resource carries
 * (contract §Operation-target ownership and isolation). Referenced by name so
 * the ownership conjunction is proven against the documented set, not a
 * partial or invented one.
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

/**
 * A fully-owned Development resource: every exact-ownership conjunct is
 * satisfied and no blocked-ownership trigger is set. `logicalKey` is the
 * manifest-owned role (the individually recorded exact resource).
 */
function ownedResource(overrides: Partial<ResourceObservation> = {}): ResourceObservation {
  const base: ResourceObservation = {
    resourceType: "container",
    logicalKey: "development.database",
    typeMatches: true,
    nameMatches: true,
    checkoutProjectMatches: true,
    manifestMember: true,
    canonicalLabelsComplete: true,
    // The complete documented custom label set, keyed by the documented keys.
    // Synthetic, non-secret values: the label VALUES are not ownership
    // evidence — completeness of the documented key set is. This observed map
    // is the SOLE input to the custom-label completeness conjunct: the model
    // carries no separate completeness boolean, so a partial set (any single
    // documented key missing) is the only way the conjunct can be unmet.
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
 * The complete documented custom label set with exactly one documented key
 * removed — a PARTIAL set. Because the observed label map is the sole input
 * to the completeness conjunct, this map alone (no separate boolean) is what
 * makes the conjunct unmet.
 */
function partialCustomLabels(): Record<string, string> {
  const labels = Object.fromEntries(
    CUSTOM_LABEL_KEYS.map((key) => [key, `synthetic:${key}`]),
  );
  delete labels[CUSTOM_LABEL_KEYS[0]];
  return labels;
}

/** The exact Development Data Store resources a confirmed reset may touch. */
const DEV_DATASTORE_KEYS = ["development.database", "development.database-volume"] as const;

/** The exact disposable Verification resources a confirmed cleanup may touch. */
const VERIFICATION_DISPOSABLE_KEYS = ["verification.nginx", "verification.network"] as const;

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

// ---------------------------------------------------------------------------
// T020 — exact-ownership, action-bound token, lock/re-inventory, drift,
// bounded exact-mutation, and forbidden-deletion synthetic model.
// ---------------------------------------------------------------------------

/**
 * One typed, read-only observation of a candidate runtime resource. The fake
 * reports the individual OWNERSHIP CONJUNCTS observed by typed inspection; the
 * operations module (T030) is responsible for combining them into exact
 * ownership. No raw inspect data, resource name/ID, or digest value is exposed
 * — only the boolean conjunct facts, an allowlisted role key, and an
 * allowlisted runtime state.
 */
interface ResourceObservation {
  resourceType: "container" | "network" | "volume";
  /** Manifest-owned role key (allowlisted enum); the exact recorded resource. */
  logicalKey: string;
  // --- exact-ownership conjuncts (each independently toggleable) ---
  /** Exact expected resource type. */
  typeMatches: boolean;
  /** Exact expected resource name. */
  nameMatches: boolean;
  /** Checkout-scoped Compose project. */
  checkoutProjectMatches: boolean;
  /** Manifest membership (allowlist). */
  manifestMember: boolean;
  /** Complete canonical Compose label set. */
  canonicalLabelsComplete: boolean;
  /**
   * The custom reverse-DNS labels this candidate actually carries, keyed by
   * the documented label keys. This observed map is the SOLE input to the
   * custom-label completeness conjunct: the operations module (T030) derives
   * completeness from it against the complete documented set
   * (`CUSTOM_LABEL_KEYS`). There is deliberately NO separate completeness
   * boolean on the observation — a partial set (any single documented key
   * missing) is observed as unmet purely from this map, so an implementation
   * that ignored the exercised label map and trusted only a manually supplied
   * flag cannot pass.
   */
  customLabels: Record<string, string>;
  /** Ownership schema matches the current manifest ownership schema (stale ⇒ false). */
  ownershipSchemaCurrent: boolean;
  /** Expected attachments/mounts. */
  attachmentsExpected: boolean;
  // --- state / blocked-ownership triggers ---
  /** Allowlisted runtime state relevant to the requested action. */
  runtimeState: string;
  /** Unexpectedly attached/active (a blocked-ownership trigger). */
  unexpectedlyAttached: boolean;
}

/** Mutable backing inventory the fake `inspect` reads, keyed by operation
 * target. Tests mutate it to simulate drift between token issuance and the
 * locked re-inventory. */
interface InventoryState {
  byTarget: Record<string, ResourceObservation[]>;
}

/** Per-operation-target lock state. */
interface LockState {
  /** When false, `acquire` reports the target lock unavailable. */
  available: boolean;
  heldBy: string | null;
}

/**
 * Applicable action-predicate evidence (the normalized assessment evidence
 * bound into the confirmation token). A token is emitted only when exact
 * ownership AND every applicable predicate for the requested action pass:
 * reset requires confirmed reconstructibility; cleanup requires confirmed
 * disposability of every target resource. Tests vary these predicates before
 * token issuance to prove the token is gated on the action's own predicates,
 * and mutate them between issuance and the locked recompute to prove
 * assessment drift is refused.
 */
interface AssessmentState {
  /** Reset-applicable predicate: the Data Store is confirmed reconstructible. */
  reconstructibilityConfirmed: boolean;
  /** Cleanup-applicable predicate: every target resource is confirmed disposable. */
  disposabilityConfirmed: boolean;
}

/**
 * Bounded-mutation observation. `removedExact` records resources removed via
 * the safe, individually-recorded exact path; `forbiddenInvocations` records
 * any FORBIDDEN broad-deletion strategy the module must never use.
 */
interface MutationState {
  /** logicalKeys removed via the safe exact path, in call order. */
  removedExact: string[];
  /** Any forbidden broad operation invoked (must stay empty). */
  forbiddenInvocations: string[];
}

/**
 * T020-B02 — the injected confirmation boundary. A mutating command verifies
 * a presented confirmation token by calling this boundary with the operation
 * target, the action the command is bound to, and the opaque token. The
 * boundary records the action it received in the shared chronological trace
 * AND enforces the token↔action correlation: it accepts a presented token
 * only when that token was ISSUED for the exact action presented (the opaque
 * token value is used only as a correlation key — no digest value or
 * serialization is pinned, and no token internals are inspected). The test
 * never inspects token internals: it observes only the action the real
 * boundary received and enforced, which independently fails an
 * implementation that binds target/inventory/assessment evidence but omits
 * the action from token construction or verification.
 */
interface ConfirmationState {
  /** Actions the boundary was asked to verify, in call order. */
  verifiedActions: string[];
  /**
   * The EXACT opaque tokens a mutating command submitted to `verify`, in call
   * order. This is the operation-level observation that closes the second
   * T020-B02 gap: it proves the command submitted the caller-presented token
   * itself — not a fresh token it minted for its hard-coded target/action
   * during mutation. The value is compared opaquely (no token internals or
   * serialization are pinned).
   */
  verifiedTokens: string[];
  /**
   * The opaque tokens the confirmation boundary minted, keyed by the exact
   * `${target}:${action}` they were issued for. The boundary consults this
   * map to correlate a presented token with the exact target AND action; a
   * token that was never issued, or was issued for a different action (or
   * target), is refused. Keeping the target in the key holds the target and
   * relevant evidence matched while isolating the action dimension under
   * proof.
   */
  issuedTokens: Record<string, string[]>;
}

interface Harness {
  /** The exact collaborator object the operation under test receives. */
  collaborators: FoundationOperationsCollaborators;
  /** Chronological trace of work events, recorded by the fakes in call order. */
  events: string[];
  dbState: DbState;
  processState: ProcessState;
  inventoryState: InventoryState;
  lockState: LockState;
  assessmentState: AssessmentState;
  mutationState: MutationState;
  confirmationState: ConfirmationState;
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
  // T020-B02: a per-harness counter so the boundary mints a fresh opaque
  // token per issuance (no token value/serialization is pinned — the value
  // is used only as a correlation key).
  let confirmationTokenCount = 0;
  // T020: a coherent, fully-owned Development inventory and clean lock/mutation
  // state. Tests mutate `inventoryState.byTarget` to simulate drift and mutate
  // `lockState`/`mutationState` to observe locking and bounded mutation.
  const inventoryState: InventoryState = {
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
        ownedResource({
          logicalKey: "verification.nginx",
          resourceType: "container",
        }),
        ownedResource({
          logicalKey: "verification.network",
          resourceType: "network",
          runtimeState: "present",
        }),
      ],
    },
  };
  const lockState: LockState = { available: true, heldBy: null };
  const assessmentState: AssessmentState = {
    reconstructibilityConfirmed: true,
    disposabilityConfirmed: true,
  };
  const mutationState: MutationState = { removedExact: [], forbiddenInvocations: [] };
  const confirmationState: ConfirmationState = {
    verifiedActions: [],
    verifiedTokens: [],
    issuedTokens: {},
  };

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
    // T020 — typed read-only inventory inspection. Returns the CURRENT backing
    // observations for the target (a fresh copy), so a later mutation of
    // `inventoryState.byTarget` is visible to a subsequent (re-)inspection.
    // Each inspection enters the chronological trace, so a locked
    // re-inventory is observable in the same ordered trace as the lock and
    // the mutation.
    inventory: {
      inspect: async (target: string) => {
        events.push(`inventory:inspect:${target}`);
        return (inventoryState.byTarget[target] ?? []).map((r) => ({ ...r }));
      },
    },
    // T020 — normalized applicable action-predicate evidence (the assessment
    // evidence bound into the confirmation token). Each evaluation enters the
    // chronological trace, so evidence recomputation under the lock is
    // observable in the same ordered trace as the lock and the mutation.
    assessment: {
      evaluate: async (target: string) => {
        events.push(`assessment:evaluate:${target}`);
        return { ...assessmentState };
      },
    },
    // T020 — per-operation-target lock. Records the acquire/release ordering in
    // the shared event trace; refuses when `lockState.available` is false.
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
    // T020-B02 — the injected confirmation boundary. The boundary MINTS the
    // opaque tokens: when `foundation:inventory` has proven exact ownership
    // and every applicable action predicate for the requested action, it
    // calls `issue` to obtain the opaque token (the module never constructs
    // the token value itself — no digest value or serialization is pinned).
    // The boundary records each minted token under the EXACT (target, action)
    // it was issued for. A mutating command verifies a presented token by
    // calling `verify` with the operation target, the action the command is
    // bound to, and the opaque token; the boundary records the action it
    // received in the chronological trace (the enforcement observation) and
    // accepts the token ONLY when it was issued for that exact (target,
    // action). A token that was never issued, or was issued for a different
    // action, is refused;
    // the module under test must treat a refusal as a no-mutation refusal.
    // This independently fails an implementation that binds
    // target/inventory/assessment evidence but omits the action from token
    // construction: the token it presents was not issued for the presented
    // action, so the boundary refuses it.
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
        // Record the EXACT opaque token the command submitted, so a test can
        // prove the command verified the caller-presented token itself rather
        // than a fresh token it minted for its hard-coded target/action.
        confirmationState.verifiedTokens.push(token);
        events.push(`confirmation:verify:${target}:${action}`);
        // The token↔action correlation: the presented token must have been
        // issued for the EXACT target AND action presented. The opaque token
        // value is used only as a correlation key — no token internals are
        // inspected.
        return (confirmationState.issuedTokens[`${target}:${action}`] ?? []).includes(token);
      },
    },
    // T020 — bounded exact-resource mutation. The SAFE path removes one
    // individually recorded exact resource; every FORBIDDEN broad strategy is
    // recorded (and must never be invoked by the module under test).
    mutation: {
      removeExactResource: async (logicalKey: string) => {
        mutationState.removedExact.push(logicalKey);
        events.push(`mutation:removeExact:${logicalKey}`);
      },
      // Forbidden strategies — recording only, so a test can assert they were
      // never invoked. The module must never call these.
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
  };
}

/**
 * Prove that NO service work occurred: no database/process effect and no
 * mutation of any kind. (The event trace is asserted separately by callers
 * that expect specific read-only events, such as inventory inspections.)
 */
function expectNoServiceWork(harness: Harness): void {
  const { dbState, processState, mutationState } = harness;
  expect(dbState.running).toBe(false);
  expect(dbState.startCount).toBe(0);
  expect(dbState.stopCount).toBe(0);
  expect(dbState.migrationsApplied).toBe(false);
  expect(dbState.volumeDeleted).toBe(false);
  expect(processState.running.size).toBe(0);
  expect(processState.startCount).toEqual({});
  expect(mutationState.removedExact).toEqual([]);
  expect(mutationState.forbiddenInvocations).toEqual([]);
}

/**
 * Prove that NO work of any kind occurred: no work event was recorded and
 * the shared database/process/mutation state is untouched.
 */
function expectNoWork(harness: Harness): void {
  expect(harness.events).toEqual([]);
  expectNoServiceWork(harness);
}

/**
 * T020-B04: prove that NO destructive state or path OUTSIDE the individually
 * recorded exact-resource adapter was touched, regardless of whether the
 * operation was accepted or refused. The pre-existing no-argument
 * `database.deleteVolume` path must remain uninvoked (no `database:deleteVolume`
 * trace event) and its `volumeDeleted` state untouched, and no forbidden
 * broad-deletion strategy may have been invoked — the only mutation surface
 * the contract allows is `mutation.removeExactResource` on individually
 * recorded exact resources, which callers assert separately.
 */
function expectNoLegacyDestructiveBypass(harness: Harness): void {
  expect(harness.dbState.volumeDeleted).toBe(false);
  expect(harness.events).not.toContain("database:deleteVolume");
  expect(harness.mutationState.forbiddenInvocations).toEqual([]);
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

// ---------------------------------------------------------------------------
// T020 — exact-ownership, action-bound confirmation token, per-operation-target
// lock / immediate re-inventory, drift refusal, bounded exact mutation, and
// forbidden-deletion contract (tests-first for T030–T031).
//
// These tests drive `foundation:inventory`, `dev:reset`, and
// `foundation:cleanup` through the same deterministic injected collaborators.
// They assert behavior and observable ordering (lock → re-inventory →
// evidence recompute → mutation; mutation only of individually recorded exact
// resources) — not provider command spelling, token internals (no invented
// digest value or serialization is pinned), or Production constants.
// ---------------------------------------------------------------------------

/** The exact-ownership conjunct fields, each independently toggleable. */
const OWNERSHIP_CONJUNCTS = [
  "typeMatches",
  "nameMatches",
  "checkoutProjectMatches",
  "manifestMember",
  "canonicalLabelsComplete",
  // The complete custom reverse-DNS label set is proven from the observed
  // `customLabels` map (see the per-key partial-set tests below), not from a
  // separately toggleable boolean field.
  "ownershipSchemaCurrent",
  "attachmentsExpected",
] as const;

type OwnershipConjunct = (typeof OWNERSHIP_CONJUNCTS)[number];

describe("Foundation destructive operations — T020 (tests-first for T030–T031)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // foundation:inventory — read-only, normalized evidence, action-bound token
  // -------------------------------------------------------------------------

  it("foundation:inventory is read-only: it inspects the target, emits no token for status, and performs no lock or mutation", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, mutationState } = harness;

    const result = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });

    expect(result.exitCode).toBe(0);
    // Read-only: no confirmation token for a non-destructive action.
    expect(result.token).toBeFalsy();
    // No lock is taken and no mutation of any kind occurs; the ONLY trace
    // events are the read-only inspections themselves.
    expect(events.some((e) => e.startsWith("lock:"))).toBe(false);
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    expect(events.every((e) => e.startsWith("inventory:inspect:"))).toBe(true);
    expectNoServiceWork(harness);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory emits the complete normalized inventory for each operation target", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;

    const development = await foundationInventory(collaborators, {
      target: "development",
      action: "status",
    });
    const verification = await foundationInventory(collaborators, {
      target: "verification",
      action: "status",
    });

    expect(development.exitCode).toBe(0);
    expect(verification.exitCode).toBe(0);
    // The normalized inventory exposes the individually recorded exact
    // resources of each target, and nothing else.
    expect(development.resources).toEqual(DEV_DATASTORE_KEYS);
    expect(verification.resources).toEqual(VERIFICATION_DISPOSABLE_KEYS);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory issues an action-bound reset token for exact Development ownership", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;

    const result = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });

    expect(result.exitCode).toBe(0);
    // Token presence is asserted, not its value: no digest value or
    // serialization is pinned by this contract.
    expect(typeof result.token).toBe("string");
    expect(result.token!.length).toBeGreaterThan(0);
    // Token issuance is read-only: no lock, no mutation.
    expect(harness.events.some((e) => e.startsWith("lock:"))).toBe(false);
    expect(harness.mutationState.removedExact).toEqual([]);
    expect(harness.mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory issues an action-bound cleanup token for exact Verification ownership", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;

    const result = await foundationInventory(collaborators, {
      target: "verification",
      action: "cleanup",
    });

    expect(result.exitCode).toBe(0);
    expect(typeof result.token).toBe("string");
    expect(result.token!.length).toBeGreaterThan(0);
    expect(harness.events.some((e) => e.startsWith("lock:"))).toBe(false);
    expect(harness.mutationState.removedExact).toEqual([]);
    expect(harness.mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it.each([
    ["exact resource type", { typeMatches: false }],
    ["exact resource name", { nameMatches: false }],
    ["checkout-scoped project", { checkoutProjectMatches: false }],
    ["manifest membership", { manifestMember: false }],
    ["complete canonical Compose label set", { canonicalLabelsComplete: false }],
    // The custom-label conjunct is unmet by making the observed label map
    // PARTIAL (one documented key missing) — there is no boolean to flip.
    ["complete custom reverse-DNS label set", { customLabels: partialCustomLabels() }],
    ["current ownership schema", { ownershipSchemaCurrent: false }],
    ["expected attachments/mounts", { attachmentsExpected: false }],
  ] as [string, Partial<ResourceObservation>][])(
    "foundation:inventory refuses a reset token when the %s conjunct is unmet — read-only, no token",
    async (_label, conjunct) => {
      const harness = makeCollaborators();
      const { collaborators, inventoryState, mutationState } = harness;
      // Break exactly one conjunct of one otherwise-fully-owned resource.
      const target = inventoryState.byTarget.development[0];
      Object.assign(target, conjunct);

      const result = await foundationInventory(collaborators, {
        target: "development",
        action: "reset",
      });

      // Unproven exact ownership: non-zero, the documented reason code, and NO
      // confirmation token.
      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBe("RESOURCE_OWNERSHIP_UNPROVEN");
      expect(result.token).toBeFalsy();
      // The refusal is read-only: nothing is locked or mutated.
      expect(mutationState.removedExact).toEqual([]);
      expect(mutationState.forbiddenInvocations).toEqual([]);
      expectNoLegacyDestructiveBypass(harness);
    },
  );

  it.each(CUSTOM_LABEL_KEYS.map((key) => [key] as [string]))(
    "foundation:inventory refuses a reset token when one documented custom label %s is missing — the complete set is the exercised conjunct",
    async (key) => {
      const harness = makeCollaborators();
      const { collaborators, inventoryState } = harness;
      // The fake observation carries the complete documented set by default;
      // remove exactly one documented key so the observed per-resource label
      // map is PARTIAL. This is the ONLY change made: the completeness
      // conjunct has no separate boolean to flip, so inspection/ownership
      // must derive unmet-ness from the exercised label map itself.
      const target = inventoryState.byTarget.development[0];
      delete target.customLabels[key];

      const result = await foundationInventory(collaborators, {
        target: "development",
        action: "reset",
      });

      // A partial custom-label set is unproven exact ownership: non-zero, the
      // documented reason code, and NO confirmation token.
      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBe("RESOURCE_OWNERSHIP_UNPROVEN");
      expect(result.token).toBeFalsy();
      expect(harness.mutationState.removedExact).toEqual([]);
      expect(harness.mutationState.forbiddenInvocations).toEqual([]);
      expectNoLegacyDestructiveBypass(harness);
    },
  );

  it("foundation:inventory proves the complete custom label set is the conjunct: every documented key present ⇒ owned, any one missing ⇒ refused", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState } = harness;
    // The documented set is non-trivial: more than one key, so completeness
    // is a real conjunction, not a single flag.
    expect(CUSTOM_LABEL_KEYS.length).toBeGreaterThan(1);

    // Baseline: every documented key present on every resource ⇒ exact
    // ownership holds and the action-bound token is issued.
    for (const list of Object.values(inventoryState.byTarget)) {
      for (const resource of list) {
        expect(Object.keys(resource.customLabels).sort()).toEqual([...CUSTOM_LABEL_KEYS].sort());
      }
    }
    const baseline = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(baseline.exitCode).toBe(0);
    expect(typeof baseline.token).toBe("string");

    // Now drop one documented key on one resource: the same inspection input
    // shape with a partial map must refuse. Only the map changes — there is
    // no completeness boolean to set, so the refusal is proven from the
    // observed label map alone.
    const target = inventoryState.byTarget.development[0];
    const droppedKey = CUSTOM_LABEL_KEYS[0];
    delete target.customLabels[droppedKey];

    const partial = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(partial.exitCode).not.toBe(0);
    expect(partial.reasonCode).toBe("RESOURCE_OWNERSHIP_UNPROVEN");
    expect(partial.token).toBeFalsy();
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory refuses a reset token when an expected manifest resource is absent from the initial inventory — incomplete target inventory, no token", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState } = harness;
    // Incomplete initial target inventory: an expected manifest resource
    // (the Data Store volume) is absent from the observed inventory. Exact
    // ownership of the complete recorded target cannot be proven from an
    // inventory that does not contain every expected resource.
    inventoryState.byTarget.development = inventoryState.byTarget.development.filter(
      (r) => r.logicalKey !== "development.database-volume",
    );

    const result = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_OWNERSHIP_UNPROVEN");
    expect(result.token).toBeFalsy();
    expect(harness.mutationState.removedExact).toEqual([]);
    expect(harness.mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory refuses a reset token for an ambiguous (colliding) resource — read-only, no token", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState } = harness;
    // Ambiguity: a second candidate claims the same manifest-owned role key.
    inventoryState.byTarget.development.push(ownedResource());

    const result = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_OWNERSHIP_UNPROVEN");
    expect(result.token).toBeFalsy();
    expect(harness.mutationState.removedExact).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory refuses a reset token for an unexpectedly attached/active resource — read-only, no token", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState } = harness;
    // Blocked-ownership trigger: unexpected attachment/use.
    inventoryState.byTarget.development[0].unexpectedlyAttached = true;

    const result = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_OWNERSHIP_UNPROVEN");
    expect(result.token).toBeFalsy();
    expect(harness.mutationState.removedExact).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  // -------------------------------------------------------------------------
  // dev:reset — action-bound token, per-target lock, re-inventory, drift
  // refusal, bounded exact mutation
  // -------------------------------------------------------------------------

  it("dev:reset with a valid action-bound token follows one ordered trace — lock → immediate re-inventory → evidence recompute → exact mutation → release", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, mutationState } = harness;

    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(typeof token).toBe("string");
    // Token issuance is read-only: the issuance-phase inspections are
    // recorded, but no lock, assessment recompute, or mutation has occurred
    // yet.
    expect(events.some((e) => e.startsWith("lock:"))).toBe(false);
    const issuanceEventCount = events.length;
    expect(issuanceEventCount).toBeGreaterThan(0);

    const result = await devReset(collaborators, token!);

    expect(result.exitCode).toBe(0);
    // Bounded exact mutation: ONLY the individually recorded exact
    // Development Data Store resources are removed.
    expect(mutationState.removedExact).toEqual([...DEV_DATASTORE_KEYS]);
    // No forbidden broad-deletion strategy is ever invoked.
    expect(mutationState.forbiddenInvocations).toEqual([]);
    // B04: the accepted reset removes only the exact recorded resources via
    // the mutation adapter — the reusable no-legacy-destructive-bypass proof
    // covers the no-argument volume-deletion path, its state, and every
    // forbidden strategy.
    expectNoLegacyDestructiveBypass(harness);
    // ONE ordered trace proves the mutation sequence. The token-issuance
    // phase is excluded by slicing the trace after issuance, so the
    // re-inventory asserted below is provably the operation's own
    // re-inventory, not the issuance inspection.
    const slice = events.slice(issuanceEventCount);
    const lockIndex = slice.indexOf("lock:acquire:development");
    const reInventoryIndex = slice.indexOf("inventory:inspect:development");
    const recomputeIndex = slice.indexOf("assessment:evaluate:development");
    const releaseIndex = slice.indexOf("lock:release:development");
    const mutationIndices = slice
      .map((e, i) => (e.startsWith("mutation:") ? i : -1))
      .filter((i) => i >= 0);
    // Every phase of the required sequence is present in the trace...
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(reInventoryIndex).toBeGreaterThanOrEqual(0);
    expect(recomputeIndex).toBeGreaterThanOrEqual(0);
    expect(releaseIndex).toBeGreaterThanOrEqual(0);
    expect(mutationIndices.length).toBe(DEV_DATASTORE_KEYS.length);
    // ...and in the required order with IMMEDIACY: the exact operation-target
    // lock is acquired, the inventory is re-inspected IMMEDIATELY (the very
    // next event — no unrelated work between acquire and re-inventory),
    // applicable evidence is recomputed immediately after, mutation happens
    // only after all three, and the lock is released LAST — only after the
    // mutation.
    expect(reInventoryIndex).toBe(lockIndex + 1);
    expect(recomputeIndex).toBe(reInventoryIndex + 1);
    expect(Math.min(...mutationIndices)).toBeGreaterThan(recomputeIndex);
    expect(releaseIndex).toBeGreaterThan(Math.max(...mutationIndices));
    // The target lock is released after the operation completes.
    expect(harness.lockState.heldBy).toBeNull();
  });

  it("dev:reset performs no mutation when the operation-target lock is unavailable", async () => {
    const harness = makeCollaborators();
    const { collaborators, lockState, mutationState } = harness;
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    // Another holder owns the target lock.
    lockState.available = false;
    lockState.heldBy = "other-holder";

    const result = await devReset(collaborators, token!);

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    // No mutation without the lock; the foreign holder is untouched.
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    expect(lockState.heldBy).toBe("other-holder");
    expectNoLegacyDestructiveBypass(harness);
  });

  it("dev:reset performs no mutation when the confirmation token is missing", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, mutationState } = harness;

    const result = await devReset(collaborators, "");

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    // No lock is even attempted and nothing is mutated.
    expect(events.some((e) => e.startsWith("lock:"))).toBe(false);
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory binds the token to the action: the same Development target issues a reset token but NO cleanup token — action binding isolated from target binding", async () => {
    const harness = makeCollaborators();
    const { collaborators, mutationState } = harness;
    // Same target (development), its VALID action (reset): a token is issued.
    const valid = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(valid.exitCode).toBe(0);
    expect(typeof valid.token).toBe("string");
    // Same target (development), an INVALID action (cleanup is
    // Verification-only): NO token is issued for the invalid target/action
    // pairing. A token bound only to the target (ignoring the action) would
    // be issued here; the contract requires it to be absent.
    const invalid = await foundationInventory(collaborators, {
      target: "development",
      action: "cleanup",
    });
    expect(invalid.token).toBeFalsy();
    // Issuance is read-only in both cases: no lock, no mutation.
    expect(harness.events.some((e) => e.startsWith("lock:"))).toBe(false);
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory binds the token to the target: the same cleanup action issues a Verification token but NO Development token — target binding isolated from action binding", async () => {
    const harness = makeCollaborators();
    const { collaborators, mutationState } = harness;
    // Same action (cleanup), its VALID target (verification): a token is
    // issued.
    const valid = await foundationInventory(collaborators, {
      target: "verification",
      action: "cleanup",
    });
    expect(valid.exitCode).toBe(0);
    expect(typeof valid.token).toBe("string");
    // Same action (cleanup), an INVALID target (cleanup is Verification-only):
    // NO token is issued for the invalid target/action pairing. A token bound
    // only to the action (ignoring the target) would be issued here; the
    // contract requires it to be absent.
    const invalid = await foundationInventory(collaborators, {
      target: "development",
      action: "cleanup",
    });
    expect(invalid.token).toBeFalsy();
    expect(harness.events.some((e) => e.startsWith("lock:"))).toBe(false);
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  // -------------------------------------------------------------------------
  // B02 presentation proof — the confirmation is action-specific
  // -------------------------------------------------------------------------
  //
  // Issuance isolation alone only observes whether issuance is PERMITTED: an
  // implementation could validate the target/action pairing, then construct
  // and verify a confirmation token from the target and evidence while
  // OMITTING the action, and still pass both issuance tests. The Data Model
  // ("Confirmation is action-specific") and the T031 boundary require the
  // action to be bound into the confirmation. The action is proven bound at
  // PRESENTATION by observing the real injected confirmation boundary
  // (`collaborators.confirmation`): a mutating command verifies a presented
  // token by calling that boundary with the operation target, the action the
  // command is bound to, and the opaque token, and the boundary records the
  // action it received in the shared chronological trace.
  //
  // The prior cross-target presentation cases were confounded: they changed
  // the operation target, the target inventory/evidence, AND the action
  // together, so an implementation that validated target/inventory/assessment
  // evidence but omitted the action from token construction or verification
  // would reject both cross-target tokens and still pass. The proof here
  // holds the target and all relevant inventory/assessment evidence MATCHED
  // — a validly-issued token is presented to its OWN target's destructive
  // command — and asserts the boundary observably received and enforced the
  // bound action. An implementation that omitted the action from the
  // confirmation would not pass it to the boundary and would fail.
  //
  // `retry`/`recover` cannot be the vehicle: the contract gates them on T021
  // Recovery Assessment predicates (origin operation/action/phase, immutable
  // failure, integrity, phase-specific repeatability) that the T020 synthetic
  // model does not carry, so a compliant implementation must REFUSE to issue
  // them — requiring them would import T021 semantics into T020. The proof
  // uses only T020-issuable tokens, without pinning token value/serialization,
  // issuing an invalid target/action token through `foundation:inventory`, or
  // inventing an incomplete retry/recover decision.

  it("dev:reset presents the bound action to the confirmation boundary: a valid Development `reset` token is verified with the `reset` action — action-specific confirmation", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, mutationState, confirmationState } = harness;
    // A VALID, T020-issuable pairing (reset is Development-only and its
    // applicable predicate — confirmed reconstructibility — holds): the token
    // is issued, bound to the Development target, its inventory, its
    // assessment evidence, and the `reset` action.
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(typeof token).toBe("string");
    // Issuance is read-only: no lock, no mutation, and no confirmation
    // verification happens at issuance.
    expect(events.some((e) => e.startsWith("lock:"))).toBe(false);
    expect(confirmationState.verifiedActions).toEqual([]);

    // Present the SAME opaque token to its OWN target's destructive command.
    // The target and all relevant inventory/assessment evidence remain
    // matched; the only dimension under proof is the action. The command must
    // verify the token through the real injected confirmation boundary,
    // passing the action the command is bound to.
    const issuanceEventCount = events.length;
    const result = await devReset(collaborators, token!);

    expect(result.exitCode).toBe(0);
    // The confirmation boundary observably RECEIVED AND ENFORCED the bound
    // action: the real boundary was called exactly once, with the `reset`
    // action, and the chronological trace records the verification under the
    // Development target. An implementation that bound target/inventory/
    // assessment evidence but omitted the action from token construction or
    // verification would not pass `reset` to the boundary and would fail.
    expect(confirmationState.verifiedActions).toEqual(["reset"]);
    // The command submitted the EXACT opaque token the caller presented —
    // the same value `foundation:inventory` returned — not a fresh token it
    // minted for its hard-coded target/action. A counterexample that ignored
    // the caller token, issued a fresh correctly-bound token after
    // re-inventory, and verified that substitute would record a DIFFERENT
    // value here and fail.
    expect(confirmationState.verifiedTokens).toEqual([token!]);
    // The operation minted NO token of its own: the only `issue` event in the
    // whole trace is the read-only issuance above. A fresh-token-during-
    // mutation implementation would add a `confirmation:issue:` event to the
    // operation's own slice and fail.
    const operationEvents = events.slice(issuanceEventCount);
    expect(operationEvents.some((e) => e.startsWith("confirmation:issue:"))).toBe(false);
    expect(events).toContain("confirmation:verify:development:reset");
    // The verification happens under the operation-target lock, between the
    // locked recompute and the bounded mutation: the action is verified
    // before anything is removed.
    const recomputeIndex = events.indexOf("assessment:evaluate:development");
    const verifyIndex = events.indexOf("confirmation:verify:development:reset");
    expect(verifyIndex).toBeGreaterThan(recomputeIndex);
    expect(verifyIndex).toBeLessThan(events.indexOf("mutation:removeExact:development.database"));
    // The accepted mutation is still bounded to the exact recorded resources.
    expect(mutationState.removedExact).toEqual([...DEV_DATASTORE_KEYS]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:cleanup presents the bound action to the confirmation boundary: a valid Verification `cleanup` token is verified with the `cleanup` action — action-specific confirmation", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, mutationState, confirmationState } = harness;
    // A VALID, T020-issuable pairing (cleanup is Verification-only and its
    // applicable predicate — confirmed disposability — holds): the token is
    // issued, bound to the Verification target, its inventory, its assessment
    // evidence, and the `cleanup` action.
    const { token } = await foundationInventory(collaborators, {
      target: "verification",
      action: "cleanup",
    });
    expect(typeof token).toBe("string");
    expect(events.some((e) => e.startsWith("lock:"))).toBe(false);
    expect(confirmationState.verifiedActions).toEqual([]);

    // Present the SAME opaque token to its OWN target's destructive command.
    // The target and all relevant inventory/assessment evidence remain
    // matched; the only dimension under proof is the action.
    const issuanceEventCount = events.length;
    const result = await foundationCleanup(collaborators, "verification", token!);

    expect(result.exitCode).toBe(0);
    // The confirmation boundary observably received and enforced the bound
    // `cleanup` action — the action dimension is independently proven, not
    // confounded with a target or evidence mismatch.
    expect(confirmationState.verifiedActions).toEqual(["cleanup"]);
    // The command submitted the EXACT opaque token the caller presented — the
    // same value `foundation:inventory` returned — not a fresh token it minted
    // for its hard-coded target/action. A counterexample that ignored the
    // caller token, issued a fresh correctly-bound token after re-inventory,
    // and verified that substitute would record a DIFFERENT value here and
    // fail.
    expect(confirmationState.verifiedTokens).toEqual([token!]);
    // The operation minted NO token of its own: the only `issue` event in the
    // whole trace is the read-only issuance above. A fresh-token-during-
    // mutation implementation would add a `confirmation:issue:` event to the
    // operation's own slice and fail.
    const operationEvents = events.slice(issuanceEventCount);
    expect(operationEvents.some((e) => e.startsWith("confirmation:issue:"))).toBe(false);
    expect(events).toContain("confirmation:verify:verification:cleanup");
    const recomputeIndex = events.indexOf("assessment:evaluate:verification");
    const verifyIndex = events.indexOf("confirmation:verify:verification:cleanup");
    expect(verifyIndex).toBeGreaterThan(recomputeIndex);
    expect(verifyIndex).toBeLessThan(events.indexOf("mutation:removeExact:verification.nginx"));
    // The accepted mutation is still bounded to the exact recorded
    // Verification resources.
    expect(mutationState.removedExact).toEqual([...VERIFICATION_DISPOSABLE_KEYS]);
    expectNoLegacyDestructiveBypass(harness);
  });

  // -------------------------------------------------------------------------
  // B02 negative control — the boundary ITSELF enforces the token↔action
  // correlation, independently of the module's own validation.
  // -------------------------------------------------------------------------
  //
  // The two presentation proofs above hold the target and all relevant
  // inventory/assessment evidence matched and assert the boundary received
  // the bound action. But a boundary that merely RECORDS the action and
  // accepts every non-empty token would pass those proofs even if the module
  // omitted the action from token construction: it could validate the
  // target/action pairing, build a token from only the target/inventory/
  // assessment evidence, and still pass its hard-coded action to the
  // recording boundary. This control drives the REAL injected boundary
  // directly — issuing a token for one (target, action) through
  // `foundation:inventory` and presenting that SAME opaque token to the
  // boundary under a DIFFERENT action — and asserts the boundary REFUSES it.
  // A boundary that accepted every non-empty token (or correlated on
  // target/evidence only, omitting the action) would accept the
  // different-action presentation and this control would fail. The control
  // also asserts the SAME-action presentation is accepted, so the refusal is
  // proven to be action-specific, not a blanket refusal. It issues no
  // invalid target/action token through `foundation:inventory` (the token is
  // issued for its valid pairing only) and pins no token value/serialization.

  it("the confirmation boundary refuses a token presented under a different action and accepts it under its own — the action is bound into the token, not merely recorded", async () => {
    const harness = makeCollaborators();
    const { collaborators, confirmationState } = harness;
    // Issue a VALID, T020-issuable token for its own pairing (reset is
    // Development-only and its applicable predicate holds). The boundary
    // mints the opaque token and records it under the EXACT
    // (development, reset) pairing.
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(0);

    // NEGATIVE: present the SAME opaque token to the boundary under a
    // DIFFERENT action. The target is unchanged (still development) and the
    // token is a real, validly-issued one — the ONLY dimension that differs
    // is the action. The boundary must refuse: the token was not issued for
    // `cleanup`, so the token↔action correlation fails. An implementation
    // that bound target/inventory/assessment evidence but omitted the action
    // from token construction would have produced a token the boundary
    // accepts under any action, and this assertion would fail.
    const refused = await collaborators.confirmation.verify(
      "development",
      "cleanup",
      token!,
    );
    expect(refused).toBe(false);

    // POSITIVE: the SAME token presented under its OWN action is accepted —
    // the refusal above is proven to be action-specific, not a blanket
    // refusal of every token.
    const accepted = await collaborators.confirmation.verify(
      "development",
      "reset",
      token!,
    );
    expect(accepted).toBe(true);

    // The boundary observed both presentations (the enforcement observation
    // is the actions it was asked to verify, in call order).
    expect(confirmationState.verifiedActions).toEqual(["cleanup", "reset"]);
    // No mutation of any kind occurred: this control drives only the
    // confirmation boundary, never a mutating command.
    expectNoLegacyDestructiveBypass(harness);
  });

  // -------------------------------------------------------------------------
  // B02 operation-level refusal — a non-empty mismatched token presented to
  // the OPERATION itself must refuse all mutation.
  // -------------------------------------------------------------------------
  //
  // The control above drives the fake boundary directly, but the remaining
  // counterexample runs through the operation: a command that rejects a
  // MISSING token, IGNORES any non-empty caller token, mints a fresh
  // correctly-bound token for its hard-coded target/action after
  // re-inventory, verifies that substitute, and mutates. These cases present
  // a non-empty, real, validly-issued opaque token that was issued for a
  // DIFFERENT (target, action) pairing to the operation itself — the
  // operation's own target, inventory, and assessment evidence are all
  // matched, so the ONLY dimension that fails is the token↔(target, action)
  // correlation at the boundary. The operation must observably submit the
  // exact caller-presented token to the boundary under its bound action,
  // mint no substitute of its own, and let the boundary's refusal refuse ALL
  // mutation. An implementation that ignored the caller token and verified a
  // self-minted substitute would mutate and fail. Each case issues its token
  // only for a valid pairing through `foundation:inventory` (no invalid
  // target/action token is ever requested) and pins no token
  // value/serialization.

  it("dev:reset refuses a non-empty token issued for a different (target, action) — the exact caller token is submitted to the boundary and no mutation occurs", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, mutationState, confirmationState } = harness;
    // Issue a VALID token for a DIFFERENT pairing (cleanup is
    // Verification-only and its applicable predicate holds): a real,
    // non-empty opaque token — but one that was never issued for
    // (development, reset).
    const { token } = await foundationInventory(collaborators, {
      target: "verification",
      action: "cleanup",
    });
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(0);
    const issuanceEventCount = events.length;

    // Present the mismatched non-empty token to the Development reset
    // command. Development ownership, inventory, and assessment evidence are
    // all matched — only the token correlation fails.
    const result = await devReset(collaborators, token!);

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    // The operation observably submitted the EXACT opaque caller token to the
    // boundary under its bound action — it did not replace it with a
    // substitute.
    expect(confirmationState.verifiedTokens).toEqual([token!]);
    expect(events).toContain("confirmation:verify:development:reset");
    // The operation minted NO substitute token of its own: the operation's
    // own slice contains no `confirmation:issue:` event.
    expect(
      events.slice(issuanceEventCount).some((e) => e.startsWith("confirmation:issue:")),
    ).toBe(false);
    // The boundary's refusal refused ALL mutation; the target is left as
    // found.
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:cleanup refuses a non-empty token issued for a different (target, action) — the exact caller token is submitted to the boundary and no mutation occurs", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, mutationState, confirmationState } = harness;
    // Issue a VALID token for a DIFFERENT pairing (reset is Development-only
    // and its applicable predicate holds): a real, non-empty opaque token —
    // but one that was never issued for (verification, cleanup).
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(0);
    const issuanceEventCount = events.length;

    // Present the mismatched non-empty token to the Verification cleanup
    // command. Verification ownership, inventory, and assessment evidence are
    // all matched — only the token correlation fails.
    const result = await foundationCleanup(collaborators, "verification", token!);

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    // The operation observably submitted the EXACT opaque caller token to the
    // boundary under its bound action — it did not replace it with a
    // substitute.
    expect(confirmationState.verifiedTokens).toEqual([token!]);
    expect(events).toContain("confirmation:verify:verification:cleanup");
    // The operation minted NO substitute token of its own: the operation's
    // own slice contains no `confirmation:issue:` event.
    expect(
      events.slice(issuanceEventCount).some((e) => e.startsWith("confirmation:issue:")),
    ).toBe(false);
    // The boundary's refusal refused ALL mutation; the target is left as
    // found.
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory refuses a reset token when the applicable reconstructibility predicate fails — ownership alone is insufficient", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    // Exact ownership fully holds, but the reset-applicable action predicate
    // (confirmed reconstructibility) fails. The token must be gated on every
    // applicable action predicate, not on ownership alone.
    assessmentState.reconstructibilityConfirmed = false;

    const result = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    expect(result.token).toBeFalsy();
    expect(harness.mutationState.removedExact).toEqual([]);
    expect(harness.mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("foundation:inventory refuses a cleanup token when the applicable disposability predicate fails — ownership alone is insufficient", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState } = harness;
    // Exact ownership fully holds, but the cleanup-applicable action predicate
    // (confirmed disposability of every target resource) fails.
    assessmentState.disposabilityConfirmed = false;

    const result = await foundationInventory(collaborators, {
      target: "verification",
      action: "cleanup",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBeTruthy();
    expect(result.token).toBeFalsy();
    expect(harness.mutationState.removedExact).toEqual([]);
    expect(harness.mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("dev:reset performs no mutation when ownership is blocked at token issuance", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState, mutationState } = harness;
    // Blocked ownership: no token can be issued at all.
    inventoryState.byTarget.development[0].unexpectedlyAttached = true;
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(token).toBeFalsy();

    const result = await devReset(collaborators, "");

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_OWNERSHIP_UNPROVEN");
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    // No service work and no lock: only the read-only issuance inspection is
    // in the trace.
    expect(harness.events.every((e) => e.startsWith("inventory:inspect:"))).toBe(true);
    expectNoServiceWork(harness);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("dev:reset refuses with RESOURCE_INVENTORY_CHANGED when the inventory drifts after token issuance — no mutation", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState, mutationState } = harness;
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(typeof token).toBe("string");
    // Drift between token issuance and the locked re-inventory: the
    // confirmed resource set no longer matches (a resource disappeared).
    inventoryState.byTarget.development = inventoryState.byTarget.development.filter(
      (r) => r.logicalKey !== "development.database",
    );

    const result = await devReset(collaborators, token!);

    // Inventory drift is the documented drift reason code, not the
    // unproven-ownership code.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_INVENTORY_CHANGED");
    // Drift refuses ALL mutation; the target is left as found.
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("dev:reset refuses with RESOURCE_INVENTORY_CHANGED when a resource is re-observed mislabeled after token issuance — no mutation", async () => {
    const harness = makeCollaborators();
    const { collaborators, inventoryState, mutationState } = harness;
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(typeof token).toBe("string");
    // Drift: the same resource is re-observed with a stale ownership schema.
    const volume = inventoryState.byTarget.development.find(
      (r) => r.logicalKey === "development.database-volume",
    )!;
    volume.ownershipSchemaCurrent = false;

    const result = await devReset(collaborators, token!);

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_INVENTORY_CHANGED");
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    expectNoLegacyDestructiveBypass(harness);
  });

  it("dev:reset refuses with RESOURCE_INVENTORY_CHANGED when the recomputed assessment evidence drifts after token issuance — no mutation", async () => {
    const harness = makeCollaborators();
    const { collaborators, assessmentState, events, mutationState } = harness;
    const { token } = await foundationInventory(collaborators, {
      target: "development",
      action: "reset",
    });
    expect(typeof token).toBe("string");
    const issuanceEventCount = events.length;
    // Assessment drift: the inventory is unchanged, but the applicable
    // action-predicate evidence (reconstructibility) no longer holds when
    // recomputed under the lock.
    assessmentState.reconstructibilityConfirmed = false;

    const result = await devReset(collaborators, token!);

    // A changed assessment is inventory/assessment drift, not unproven
    // ownership: the documented drift reason code, and ALL mutation refused.
    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("RESOURCE_INVENTORY_CHANGED");
    expect(mutationState.removedExact).toEqual([]);
    expect(mutationState.forbiddenInvocations).toEqual([]);
    // The drift is caught by the operation's own locked recompute, not by
    // the issuance phase. The ordered trace enforces IMMEDIACY and lock
    // scope: the re-inventory is the event immediately after the lock, the
    // recompute immediately follows it, and the release is the LAST event —
    // only after the refusal, with no mutation in between.
    const slice = events.slice(issuanceEventCount);
    const lockIndex = slice.indexOf("lock:acquire:development");
    const reInventoryIndex = slice.indexOf("inventory:inspect:development");
    const recomputeIndex = slice.indexOf("assessment:evaluate:development");
    const releaseIndex = slice.indexOf("lock:release:development");
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(reInventoryIndex).toBe(lockIndex + 1);
    expect(recomputeIndex).toBe(reInventoryIndex + 1);
    expect(slice.some((e) => e.startsWith("mutation:"))).toBe(false);
    // The refusal happens under the lock and the lock is released LAST.
    expect(releaseIndex).toBe(slice.length - 1);
    // The target lock is released after the refused operation.
    expect(harness.lockState.heldBy).toBeNull();
    expectNoLegacyDestructiveBypass(harness);
  });

  // -------------------------------------------------------------------------
  // foundation:cleanup — bounded exact mutation of Verification resources only
  // -------------------------------------------------------------------------

  it("foundation:cleanup with a valid cleanup token follows one ordered trace — lock → immediate re-inventory → evidence recompute → exact mutation → release — and never touches Development", async () => {
    const harness = makeCollaborators();
    const { collaborators, events, mutationState } = harness;
    const { token } = await foundationInventory(collaborators, {
      target: "verification",
      action: "cleanup",
    });
    expect(typeof token).toBe("string");
    // Token issuance is read-only; the operation's own sequence is asserted
    // from the trace slice after issuance.
    expect(events.some((e) => e.startsWith("lock:"))).toBe(false);
    const issuanceEventCount = events.length;

    const result = await foundationCleanup(collaborators, "verification", token!);

    expect(result.exitCode).toBe(0);
    // Only the individually recorded exact Verification resources are removed.
    expect(mutationState.removedExact).toEqual([...VERIFICATION_DISPOSABLE_KEYS]);
    // Development resources are never targeted by cleanup.
    for (const key of DEV_DATASTORE_KEYS) {
      expect(mutationState.removedExact).not.toContain(key);
    }
    expect(mutationState.forbiddenInvocations).toEqual([]);
    // B04: the accepted cleanup removes only the exact recorded Verification
    // resources via the mutation adapter — the reusable no-legacy-destructive-
    // bypass proof covers the no-argument volume-deletion path, its state, and
    // every forbidden strategy.
    expectNoLegacyDestructiveBypass(harness);
    // ONE ordered trace proves the mutation sequence for cleanup, exactly as
    // for reset, with IMMEDIACY and lock scope: the exact operation-target
    // lock is acquired, the inventory is re-inspected IMMEDIATELY (the very
    // next event), applicable evidence is recomputed immediately after,
    // mutation happens only after all three, and the lock is released LAST.
    const slice = events.slice(issuanceEventCount);
    const lockIndex = slice.indexOf("lock:acquire:verification");
    const reInventoryIndex = slice.indexOf("inventory:inspect:verification");
    const recomputeIndex = slice.indexOf("assessment:evaluate:verification");
    const releaseIndex = slice.indexOf("lock:release:verification");
    const mutationIndices = slice
      .map((e, i) => (e.startsWith("mutation:") ? i : -1))
      .filter((i) => i >= 0);
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(reInventoryIndex).toBe(lockIndex + 1);
    expect(recomputeIndex).toBe(reInventoryIndex + 1);
    expect(mutationIndices.length).toBe(VERIFICATION_DISPOSABLE_KEYS.length);
    expect(Math.min(...mutationIndices)).toBeGreaterThan(recomputeIndex);
    expect(releaseIndex).toBeGreaterThan(Math.max(...mutationIndices));
    // The Verification target lock is released after the operation completes.
    expect(harness.lockState.heldBy).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T027 rework regressions (review findings T027-B01/B02/B03).
//
// B01: `dev:setup` delegates configuration validation to the accepted T010
// canonical boundary (`apps/server/src/config.ts`), so the exact canonical
// Development semantics are provable here: a public origin NOT bound to
// `APP_HOST`/`APP_PORT` is a forbidden identity combination, non-origin URL
// forms (path/query/userinfo) and non-HTTP origins are malformed, and the
// Development database user/name are the canonical identity — any other
// credential/resource identity is rejected BEFORE any work.
// B02: setup waits boundedly for the engine to accept connections before
// migrations: a never-ready engine fails safely within the bound without
// applying migrations, readiness provably precedes the migration event, and
// a late-ready engine still completes.
// B03: the npm preflight category enforces the supported npm CLI range by
// parsing the version output (never surfacing it).
// ---------------------------------------------------------------------------

describe("Foundation setup rework regressions — T027-B01/B02/B03", () => {
  it.each([
    [
      "a public-origin port that does not match APP_PORT",
      { PUBLIC_ORIGIN: "http://127.0.0.1:9999" },
      "CONFIG_IDENTITY_CONFLICT",
      "PUBLIC_ORIGIN",
    ],
    [
      "a public-origin host that does not match APP_HOST",
      { PUBLIC_ORIGIN: "http://localhost:10443" },
      "CONFIG_IDENTITY_CONFLICT",
      "PUBLIC_ORIGIN",
    ],
    [
      "a database user outside the canonical Development identity",
      {
        DATABASE_URL:
          "mysql://dev-user:dev-only-placeholder@127.0.0.1:13306/songhealth_development",
      },
      "CONFIG_IDENTITY_CONFLICT",
      "DATABASE_URL",
    ],
    [
      "a database name outside the canonical Development identity",
      {
        DATABASE_URL:
          "mysql://songhealth_dev:dev-only-placeholder@127.0.0.1:13306/songhealth_dev",
      },
      "CONFIG_IDENTITY_CONFLICT",
      "DATABASE_URL",
    ],
    [
      "a public origin with a non-root path",
      { PUBLIC_ORIGIN: "http://127.0.0.1:10443/app" },
      "CONFIG_MALFORMED",
      "PUBLIC_ORIGIN",
    ],
    [
      "a public origin with a query string",
      { PUBLIC_ORIGIN: "http://127.0.0.1:10443?x=1" },
      "CONFIG_MALFORMED",
      "PUBLIC_ORIGIN",
    ],
    [
      "a public origin with userinfo",
      { PUBLIC_ORIGIN: "http://user:password@127.0.0.1:10443" },
      "CONFIG_MALFORMED",
      "PUBLIC_ORIGIN",
    ],
    [
      "a non-HTTP public origin",
      { PUBLIC_ORIGIN: "https://127.0.0.1:10443" },
      "CONFIG_MALFORMED",
      "PUBLIC_ORIGIN",
    ],
  ] as [string, Record<string, string>, string, string][])(
    "dev:setup rejects %s before any work — canonical Development semantics",
    async (_label, overrides, reasonCode, configurationKey) => {
      const harness = makeCollaborators();
      const { collaborators } = harness;
      collaborators.config = {
        load: async () => ({ ...SAFE_DEV_CONFIG, ...overrides }),
      };

      const result = await devSetup(collaborators, "development");

      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBe(reasonCode);
      expect(result.configurationKey).toBe(configurationKey);
      // The rejection happens before any work of any kind.
      expectNoWork(harness);
    },
  );

  it.each([
    ["12.0.2", true],
    ["12.9.1", true],
    ["v12.3.4", true],
    ["11.9.9", false],
    ["13.0.0", false],
    ["not-a-version", false],
    ["", false],
  ] as [string, boolean][])(
    "npm engine validation: %s satisfies the supported npm CLI range: %s",
    (versionOutput, expected) => {
      expect(npmVersionSatisfiesEngines(versionOutput)).toBe(expected);
    },
  );

  it("dev:setup fails safely at the bounded deadline when the engine never accepts connections — no migrations, no native processes", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState, processState } = harness;
    const probe = vi.fn(async () => false);
    collaborators.database.isRunning = probe;

    const result = await devSetup(collaborators, "development");

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("DATABASE_UNAVAILABLE");
    // No migration or native-process work followed the failed readiness wait.
    expect(dbState.migrationsApplied).toBe(false);
    expect(processState.running.size).toBe(0);
    // Bounded: the injected clock advanced exactly to the deadline and no
    // further, and the probe count is bounded by the poll interval.
    expect(collaborators.clock.now()).toBe(DATABASE_READINESS_TIMEOUT_MS);
    expect(probe.mock.calls.length).toBe(
      DATABASE_READINESS_TIMEOUT_MS / DATABASE_READINESS_POLL_INTERVAL_MS + 1,
    );
  });

  it("dev:setup applies migrations once the engine accepts connections within the bound", async () => {
    const harness = makeCollaborators();
    const { collaborators, dbState } = harness;
    let probes = 0;
    collaborators.database.isRunning = async () => {
      probes += 1;
      return probes >= 3;
    };

    const result = await devSetup(collaborators, "development");

    expect(result.exitCode).toBe(0);
    expect(dbState.migrationsApplied).toBe(true);
    expect(probes).toBe(3);
    // Two bounded poll advances occurred while waiting for readiness.
    expect(collaborators.clock.now()).toBe(2 * DATABASE_READINESS_POLL_INTERVAL_MS);
  });

  it("dev:setup proves engine readiness precedes explicit migration — database:start < readiness < migrate:applied", async () => {
    const harness = makeCollaborators();
    const { collaborators, events } = harness;
    collaborators.database.isRunning = async () => {
      events.push("database:isRunning");
      return true;
    };

    const result = await devSetup(collaborators, "development");

    expect(result.exitCode).toBe(0);
    const startIndex = events.indexOf("database:start");
    const readyIndex = events.indexOf("database:isRunning");
    const migrateIndex = events.indexOf("migrate:applied");
    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(readyIndex).toBeGreaterThan(startIndex);
    expect(migrateIndex).toBeGreaterThan(readyIndex);
  });
});

// ---------------------------------------------------------------------------
// T028 rework regressions — B02 (derived endpoints fail before work) and
// B03 (the Public workspace declares its isbot runtime dependency so first
// startup takes no install/mutation path).
// ---------------------------------------------------------------------------

describe("Foundation startup rework regressions — T028-B02/B03", () => {
  it.each([
    [
      "a derived server endpoint above the TCP port range",
      { APP_PORT: "65535", PUBLIC_ORIGIN: "http://127.0.0.1:65535" },
      "CONFIG_OUT_OF_RANGE",
    ],
    [
      "a derived admin endpoint above the TCP port range",
      { APP_PORT: "65534", PUBLIC_ORIGIN: "http://127.0.0.1:65534" },
      "CONFIG_OUT_OF_RANGE",
    ],
    [
      "an application endpoint that collides with the Development database endpoint",
      {
        APP_PORT: "13306",
        PUBLIC_ORIGIN: "http://127.0.0.1:13306",
        DATABASE_URL:
          "mysql://songhealth_dev:dev-only-placeholder@127.0.0.1:13306/songhealth_development",
      },
      "CONFIG_IDENTITY_CONFLICT",
    ],
  ] as [string, Record<string, string>, string][])(
    "dev:start rejects %s before any work",
    async (_label, overrides, reasonCode) => {
      const harness = makeCollaborators();
      const { collaborators } = harness;
      collaborators.config = {
        load: async () => ({ ...SAFE_DEV_CONFIG, ...overrides }),
      };

      const result = await devStart(collaborators);

      // The canonical boundary accepts each record (the values are valid in
      // themselves); the derived-endpoint validation must be what rejects.
      expect(result.exitCode).not.toBe(0);
      expect(result.reasonCode).toBe(reasonCode);
      expect(result.configurationKey).toBe("APP_PORT");
      // The rejection happens before any work of any kind.
      expectNoWork(harness);
    },
  );

  it("dev:ready rejects an invalid derived-endpoint state before probing readiness", async () => {
    const harness = makeCollaborators();
    const { collaborators } = harness;
    collaborators.config = {
      load: async () => ({
        ...SAFE_DEV_CONFIG,
        APP_PORT: "65535",
        PUBLIC_ORIGIN: "http://127.0.0.1:65535",
      }),
    };
    const probeSpy = vi.spyOn(collaborators.readiness, "probe");

    const result = await devReady(collaborators, { deadlineMs: 2000, pollMs: 500 });

    expect(result.exitCode).not.toBe(0);
    expect(result.reasonCode).toBe("CONFIG_OUT_OF_RANGE");
    expect(probeSpy).not.toHaveBeenCalled();
    expectNoWork(harness);
  });

  it("the Public workspace declares its React Router isbot runtime dependency and the lockfile records it without changing the resolved graph", async () => {
    const { readFileSync } = await import("node:fs");

    const manifest = JSON.parse(
      readFileSync(new URL("../apps/web/package.json", import.meta.url), "utf8"),
    ) as { dependencies: Record<string, string> };
    // Declared as a runtime dependency of the Public workspace: React
    // Router's SSR entry requires it at runtime, so a missing declaration
    // makes the first dev startup install and rewrite tracked manifests.
    expect(typeof manifest.dependencies.isbot).toBe("string");

    const lock = JSON.parse(
      readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
    ) as { packages: Record<string, { version?: string; dev?: boolean; dependencies?: Record<string, string> }> };
    const entry = lock.packages["node_modules/isbot"];
    expect(entry?.version).toBeTruthy();
    // The locked entry stays the already-resolved version and is no longer
    // classified dev-only for the workspace that depends on it at runtime.
    expect(entry?.dev).toBeUndefined();
    const webEntry = lock.packages["apps/web"];
    expect(webEntry?.dependencies?.isbot).toBeTruthy();
  });
});

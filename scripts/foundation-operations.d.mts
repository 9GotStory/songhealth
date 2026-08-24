/**
 * T027 — type declarations for `scripts/foundation-operations.mjs`.
 *
 * References: FR-003, FR-006, SC-001; Operations Contract §Commands /
 * §Configuration examples / §Safe diagnostic contract; accepted T019/T020
 * contract `scripts/foundation-operations.test.ts` and the accepted T023
 * diagnostic-surface contract `tests/verification/diagnostic-surfaces.test.ts`.
 *
 * This file carries only the module boundary types the accepted TypeScript
 * tests import from the JavaScript operations module (`OperationResult`,
 * `FoundationOperationsCollaborators`). The implementation and its behavior
 * contract live in `foundation-operations.mjs`.
 */

/**
 * One closed Safe Diagnostic as defined by the Operations Contract
 * §Safe diagnostic contract: an allowlisted reason code, the derived
 * diagnostic scope, an allowlisted component, an optional safe configuration
 * key name, and an allowlisted bounded remediation. It never carries a
 * configuration value, credential, connection string, raw tool output,
 * internal exception, or host/filesystem detail.
 */
export interface SafeDiagnostic {
  reasonCode: string;
  diagnosticScope: "foundation" | "daily" | "verification";
  component: string;
  configurationKey?: string;
  remediation: string;
}

/**
 * The normalized result of one foundation operation. `exitCode` is the
 * command exit status; on failure `reasonCode` is present and
 * `diagnostics` carries the closed Safe Diagnostics emitted for that
 * failure. The remaining optional fields are the operation-specific
 * observations the accepted contracts assert (`ready` for readiness
 * polling, `token`/`resources` for inventory) and are produced by the
 * later tasks that own those operations.
 */
export interface OperationResult {
  exitCode: number;
  reasonCode?: string;
  diagnosticScope?: "foundation" | "daily" | "verification";
  component?: string;
  configurationKey?: string;
  remediation?: string;
  /** Closed diagnostics emitted for a failure (absent on success). */
  diagnostics?: SafeDiagnostic[];
  /** Names of the preflight categories that failed (preflight only). */
  failedChecks?: string[];
  ready?: boolean;
  token?: string;
  resources?: string[];
}

/** Routed prerequisite checks (Operations Contract §Prerequisites). */
export interface PreflightCollaborators {
  node(): Promise<boolean>;
  npm(): Promise<boolean>;
  podman(): Promise<boolean>;
  compose(): Promise<boolean>;
  requiredFiles(): Promise<boolean>;
  safeConfig(): Promise<boolean>;
  portAvailable(): Promise<boolean>;
}

/**
 * The Development Data Store adapter. The adapter owns idempotency:
 * starting an already-running database (or stopping a stopped one) is a
 * no-op with no duplicate resource, so repeated command invocations never
 * duplicate the database resource.
 */
export interface DatabaseCollaborators {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
  applyMigrations(): Promise<void>;
  deleteVolume(): Promise<void>;
}

/** The native Public/Admin/server process supervisor adapter. */
export interface ProcessCollaborators {
  start(name: string): Promise<void>;
  stop(name: string): Promise<void>;
  isRunning(name: string): Promise<boolean>;
}

/** One whole-foundation readiness observation. */
export interface ReadinessProbeResult {
  ready: boolean;
  components: Record<string, string>;
}

/** The readiness probing adapter (bounded polling drives it). */
export interface ReadinessCollaborators {
  probe(): Promise<ReadinessProbeResult>;
}

/** The injected clock (bounded polling never sleeps wall-clock time). */
export interface ClockCollaborators {
  now(): number;
  advance(ms: number): void;
}

/** The execution-context configuration source. */
export interface ConfigCollaborators {
  load(): Promise<Record<string, string>>;
}

/** The typed read-only inventory inspection adapter. */
export interface InventoryCollaborators {
  inspect(target: string): Promise<unknown[]>;
}

/** Normalized applicable action-predicate evidence. */
export interface AssessmentEvidence {
  reconstructibilityConfirmed: boolean;
  disposabilityConfirmed: boolean;
}

/** The normalized assessment-evidence adapter. */
export interface AssessmentCollaborators {
  evaluate(target: string): Promise<AssessmentEvidence>;
}

/** The per-operation-target lock adapter. */
export interface LockCollaborators {
  acquire(target: string): Promise<boolean>;
  release(target: string): Promise<void>;
}

/** The opaque action-bound confirmation-token boundary. */
export interface ConfirmationCollaborators {
  issue(target: string, action: string): Promise<string>;
  verify(target: string, action: string, token: string): Promise<boolean>;
}

/**
 * The bounded exact-resource mutation adapter. Only
 * `removeExactResource` is a permitted mutation path; every other member
 * names a forbidden broad-deletion strategy the operations module must
 * never invoke (they exist on the boundary so the accepted contracts can
 * observe that they stay uninvoked).
 */
export interface MutationCollaborators {
  removeExactResource(logicalKey: string): Promise<void>;
  removeByPrefix(prefix: string): Promise<void>;
  removeByWildcard(pattern: string): Promise<void>;
  removeByLabelFilter(label: string): Promise<void>;
  downWithRemoveOrphans(): Promise<void>;
  downWithVolumes(): Promise<void>;
  prune(): Promise<void>;
  forceRemove(): Promise<void>;
  removeBroadVolumes(): Promise<void>;
  removeWithUnresolvedVariables(): Promise<void>;
}

/**
 * The T023 diagnostic-surface facet: the output boundaries a daily command
 * maps its closed diagnostics onto. Optional on the collaborator set; a
 * command emits a failure diagnostic onto its owned surfaces when the
 * facet is present.
 */
export interface OutputCollaborators {
  stdout(unit: unknown): Promise<void>;
  stderr(unit: unknown): Promise<void>;
  applicationLog(record: unknown): Promise<void>;
  httpFailure(response: unknown): Promise<void>;
}

/**
 * The deterministic injected collaborator set every foundation operation is
 * driven through. The operations module owns only orchestration, ordering,
 * validation, and safe failure mapping — never hidden state.
 */
export interface FoundationOperationsCollaborators {
  preflight: PreflightCollaborators;
  database: DatabaseCollaborators;
  processes: ProcessCollaborators;
  readiness: ReadinessCollaborators;
  clock: ClockCollaborators;
  config: ConfigCollaborators;
  inventory: InventoryCollaborators;
  assessment: AssessmentCollaborators;
  lock: LockCollaborators;
  confirmation: ConfirmationCollaborators;
  mutation: MutationCollaborators;
  output?: OutputCollaborators;
}

/**
 * `foundation:check` — non-mutating preflight: Node/npm/Podman/Compose,
 * required files, safe execution-context configuration, and port
 * availability, with no service work of any kind.
 */
export function foundationCheck(
  collaborators: FoundationOperationsCollaborators,
): Promise<OperationResult>;

/**
 * `dev:setup` — validate the selectable local operation target and the
 * Development/daily execution identity before any work, start only the
 * Development database dependency idempotently, then explicitly apply
 * tracked migrations. Any failure is actionable and non-zero.
 */
export function devSetup(
  collaborators: FoundationOperationsCollaborators,
  target: string,
): Promise<OperationResult>;

// ---------------------------------------------------------------------------
// Later-task operations (T028–T031). Exported so the accepted tests-first
// contract can import the complete planned boundary; each throws until its
// owning task implements it.
// ---------------------------------------------------------------------------

/** `dev:start` (T028). */
export function devStart(
  collaborators: FoundationOperationsCollaborators,
): Promise<OperationResult>;

/** `dev:ready` (T028). */
export function devReady(
  collaborators: FoundationOperationsCollaborators,
  options: { deadlineMs: number; pollMs: number },
): Promise<OperationResult>;

/** `dev:stop` (T029). */
export function devStop(
  collaborators: FoundationOperationsCollaborators,
): Promise<OperationResult>;

/** `dev:restart` (T029). */
export function devRestart(
  collaborators: FoundationOperationsCollaborators,
): Promise<OperationResult>;

/** `foundation:inventory` (T030–T031). The optional `operation`/`repair`
 * bind a recovery-issuable token to its interrupted operation and selected
 * allowlisted repair (Operations Contract §Commands). */
export function foundationInventory(
  collaborators: FoundationOperationsCollaborators,
  options: { target: string; action: string; operation?: string; repair?: string },
): Promise<OperationResult>;

/** `dev:reset` (T031). */
export function devReset(
  collaborators: FoundationOperationsCollaborators,
  token: string,
): Promise<OperationResult>;

/** `foundation:cleanup` (T031). */
export function foundationCleanup(
  collaborators: FoundationOperationsCollaborators,
  target: string,
  token: string,
): Promise<OperationResult>;

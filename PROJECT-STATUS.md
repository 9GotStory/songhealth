# PROJECT STATUS

> Workflow/gate mirror only. Not a Source of Truth.

## Repository Bootstrap

- **Repository state:** BOOTSTRAP COMPLETE — DELIVERY IMPLEMENTATION / REVIEW LOOP ACTIVE
- **Product/System Source of Truth:** `docs/website-modernization-docs/`
- **System Blueprint:** `docs/website-modernization-docs/current/10-system-blueprint.md` — FROZEN v1.1
- **Spec Kit control layer:** INSTALLED AS REPOSITORY FILES
- **Canonical Constitution:** ESTABLISHED — `.specify/memory/constitution.md` v1.0.0
- **Spec Kit runtime/integrations:** VERIFIED — Specify CLI 0.16.4; Codex + Claude integrations OK

## Planned Delivery

- **Delivery:** 001-application-foundation — Application Foundation & Development Runtime
- **Delivery Context:** `docs/spec-context/001-application-foundation.md`
- **Delivery Context state:** READY  <!-- UNSET | DRAFT | READY | STALE -->
- **Status:** IMPLEMENTATION REWORK — T021 CHANGES REQUIRED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED
- **Phase status:** T020 ACCEPTED — T021 REWORK; T022+ UNAUTHORIZED
- **Previous completed scope:** T020 — failing exact-ownership, action-token, lock/re-inventory,
  drift, and forbidden-deletion tests
- **Next valid action:** Claude Code corrects only T021-B01, returns corrective-result evidence,
  and stops for independent Codex re-review; T022+ remain unauthorized
- **Blocking issues:** T021-B01 — the T021 fault-injection suite exercises interrupted `start` and
  `cleanup`, but omits interrupted `stop`, `migrate`, and `reset`, despite Quickstart §5, the
  Foundation Operations Contract command signature, and Plan §Operations and verification requiring
  the acceptance-only interface to exercise all five allowlisted actions
- **Review evidence:** Independent review of `7a1f249` confirms the diff is bounded to the T021 test
  artifact and checkbox, and reproduces the expected single missing-module Vitest failure, five
  expected TS2307 diagnostics, clean `git diff --check`, and clean conflict-marker/no-skip scans.
  T021-B01 remains blocking because the test matrix covers only two of the five explicitly required
  interruption actions. Prior accepted evidence follows: T020-B02 is closed. The injected
  confirmation authority records every exact
  opaque token submitted to verification and enforces issuance under the exact `(target, action)`
  pair. Accepted reset and cleanup cases prove each operation submits the caller-presented token,
  mints no replacement token in its operation event slice, verifies under the bound action after
  locked re-inventory/evidence recomputation, and mutates only the individually recorded exact
  resources. Operation-level mismatch cases present a real non-empty token issued for the other
  valid target/action pair, prove reset/cleanup submit that exact caller token without minting a
  substitute, and prove boundary refusal causes zero mutation. The direct same-target/
  different-action control separately proves action-specific correlation without pinning token
  value or serialization. T020-B01 remains closed: the observed custom-label map is the sole
  completeness input, every documented missing key is exercised, and an initially absent manifest
  resource refuses issuance. T020-B03 remains closed: reset, cleanup, and assessment-drift traces
  enforce immediate post-lock inspection/recomputation and release after mutation/refusal.
  T020-B04 remains closed across the expanded accepted/refusal matrix, including both mismatch
  cases: the legacy no-argument volume deletion path and every forbidden broad mutation remain
  untouched. The actual working-tree diff remains bounded to the authorized T019/T020 test artifact
  in `scripts/foundation-operations.test.ts`, the already-complete T020 checkbox, and this
  Codex-owned mirror; no operations implementation, application, manifest, package, lockfile,
  configuration, environment, or T021+ artifact was added. No retry/recover action, journal,
  interruption, integrity, repeatability, or recovery-assessment model was added. Focused Vitest is
  red only at the intentionally absent `./foundation-operations.mjs` boundary. Root
  `tsc --noEmit` reports the two imports of that expected missing module plus the accepted T017/T018
  unresolved modules and no other diagnostic. `git diff --check`, conflict-marker inspection, and
  no-skip/todo/only inspection pass. Review against T020, FR-004, FR-017, SC-002, Owned Runtime
  Resource, Resource Inventory, the plan, Foundation Operations Contract, Quickstart §2, routed
  Blueprint §§335/697–703, Delivery Context, and Constitution Principles I–VI finds no
  Source-of-Truth conflict.
- **Non-blocking notes:** The accepted locked graph still provides no
  `node_modules/.bin/eslint` executable, so the required focused ESLint attempt exits 127. This
  pre-existing tooling limitation does not authorize a dependency, manifest, or lockfile change.

## Authorized Implementation

- **Task / Scope:** T021-B01 rework only — extend
  `tests/verification/lifecycle-recovery.test.ts` with deterministic interruption-injection coverage
  for the missing allowlisted `stop`, `migrate`, and `reset` actions; preserve the accepted `start`
  and Verification `cleanup` coverage and all existing T021 recovery-decision/immutable-failure
  coverage
- **Runtime:** Claude Code DEV Executor via the installed Spec Kit `implement` command/skill, bounded
  to T021
- **Required references:** `.specify/memory/constitution.md`; `CLAUDE.md`;
  `docs/spec-context/001-application-foundation.md` Implementation / Review routing;
  `specs/001-application-foundation/spec.md` FR-003 and FR-017;
  `specs/001-application-foundation/plan.md` Operations and verification;
  `specs/001-application-foundation/tasks.md` T021 and dependency rules;
  `specs/001-application-foundation/data-model.md` Lifecycle Operation and Recovery Assessment;
  `specs/001-application-foundation/contracts/foundation-operations.md` Failure behavior
- **Expected verification:** focused Vitest for
  `tests/verification/lifecycle-recovery.test.ts` must collect interruption cases spanning all five
  contract actions (`start`, `stop`, `migrate`, `reset`, `cleanup`) and fail only at the deliberately
  absent T032–T034/T037 lifecycle/recovery implementation boundary; run
  focused ESLint and root `tsc --noEmit`, classifying only already-accepted missing-boundary/tooling
  diagnostics as non-blocking; run `git diff --check`, conflict-marker inspection, and
  no-skip/todo/only inspection. Return the exact changed files, commands/results, bounded expected
  red evidence, and confirmation that no implementation, package/dependency/lockfile, manifest,
  environment, Product behavior, T022+, or broad host/resource mutation was added.
- **Authorization state:** REWORK  <!-- NONE | AUTHORIZED | REWORK | SUPERSEDED -->

## Rules

- Do not create application code merely to make the repository look initialized.
- Before first `specify`, verify `specify version` and `specify integration status` on the real development machine.
- Reconcile `bootstrap/constitution.proposed.md` through `/speckit.constitution`; do not copy it directly to `.specify/memory/constitution.md`.
- Before first `specify`, this file selects the planned Delivery and points to its Delivery Context.
- Do not run `specify` until the Delivery Context state is `READY`.
- After `specify`, mirror the feature resolved by Spec Kit; never override runtime feature state.
- Treat a conflicting pre-existing `SPECIFY_FEATURE_DIRECTORY` as a blocker; do not silently set/unset it to reconcile status.
- Codex updates this file after each phase/review gate.
- Clear task authorization after PASS or supersession.
- Do not use this file as a changelog.

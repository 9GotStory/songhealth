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
- **Status:** IMPLEMENTATION AUTHORIZED — T022

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T021 ACCEPTED — T022 AUTHORIZED; T023+ UNAUTHORIZED
- **Previous completed scope:** T021 — failing interruption and recovery-decision tests for all
  five allowlisted actions, target-appropriate retry/recover/reset/cleanup/manual-review decisions,
  attempt binding, and immutable primary failures
- **Next valid action:** Claude Code implements only T022, returns implementation-result evidence,
  and stops for independent Codex review; T023+ remain unauthorized
- **Blocking issues:** NONE
- **Review evidence:** T021-B01 is closed in `68cd439`: deterministic fault-injection cases now span
  `start`, `stop`, `migrate`, `reset`, and `cleanup`, assert action/phase-specific interruption
  evidence, preserve `OPERATION_INTERRUPTED` as primary, and keep targets stopped/not-ready without
  mutation or duplicates. Independent re-review confirms the corrective diff is exactly one test
  file with 53 inserted lines on top of the persisted rework state. Focused Vitest is red only at
  the deliberately absent `../../scripts/foundation-operations.mjs` boundary. Root `tsc --noEmit`
  reports only the four accepted baseline TS2307 diagnostics plus the expected T021 missing-boundary
  diagnostic. `git diff --check`, conflict-marker inspection, and no-skip/todo/only inspection pass.
  The complete T021 diff remains bounded to `tests/verification/lifecycle-recovery.test.ts`, its
  task checkbox, and Codex-owned workflow mirror updates; no implementation, dependency, lockfile,
  manifest, environment, Product behavior, or T022+ artifact was added. Review against T021,
  FR-003, FR-017, Lifecycle Operation, Recovery Assessment, the Foundation Operations Contract,
  Quickstart §5, Plan §Operations and verification, Delivery Context, and Constitution Principles
  I–VI finds no Source-of-Truth conflict. Product Owner Human Gate accepted T021.
- **Non-blocking notes:** The accepted locked graph still provides no
  `node_modules/.bin/eslint` executable, so the required focused ESLint attempt exits 127. This
  pre-existing tooling limitation does not authorize a dependency, manifest, or lockfile change.

## Authorized Implementation

- **Task / Scope:** T022 only — write failing Development/Verification isolation, synthetic-marker
  continuity across routine stop/restart, exact confirmed Development reset, and unchanged
  Verification/non-target inventory tests in
  `tests/verification/foundation-operation-target.test.ts`; create only that test artifact
- **Runtime:** Claude Code DEV Executor via the installed Spec Kit `implement` command/skill, bounded
  to T022
- **Required references:** `.specify/memory/constitution.md`; `CLAUDE.md`;
  `docs/spec-context/001-application-foundation.md` Implementation / Review routing;
  `specs/001-application-foundation/spec.md` FR-004, FR-008, and SC-002;
  `specs/001-application-foundation/plan.md` Operations and verification;
  `specs/001-application-foundation/tasks.md` T022 and dependency rules;
  `specs/001-application-foundation/data-model.md` Resource Inventory;
  `specs/001-application-foundation/quickstart.md` §2
- **Expected verification:** focused Vitest for
  `tests/verification/foundation-operation-target.test.ts` must collect the intended T022 cases and
  fail only at the deliberately absent T029–T031/T035/T037 operations implementation boundary; use
  deterministic injected/fake collaborators and perform no real Podman/Compose, process, network,
  listener, database, filesystem-state, or host-resource mutation. Run focused ESLint and root
  `tsc --noEmit`, classifying only already-accepted missing-boundary/tooling diagnostics as
  non-blocking; run `git diff --check`, conflict-marker inspection, and no-skip/todo/only
  inspection. Return the exact changed files, commands/results, bounded expected-red evidence, and
  confirmation that no implementation, package/dependency/lockfile, manifest, environment,
  Product behavior, T023+, Production-derived data, or broad host/resource mutation was added.
- **Authorization state:** AUTHORIZED  <!-- NONE | AUTHORIZED | REWORK | SUPERSEDED -->

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

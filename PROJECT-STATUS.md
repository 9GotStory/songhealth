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
- **Status:** HUMAN GATE ACCEPTED — T021

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T021 ACCEPTED — T022+ UNAUTHORIZED
- **Previous completed scope:** T021 — failing interruption and recovery-decision tests for all
  five allowlisted actions, target-appropriate retry/recover/reset/cleanup/manual-review decisions,
  attempt binding, and immutable primary failures
- **Next valid action:** NONE IN THIS ISSUE — T021 acceptance recorded; T022+ remain unauthorized
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

- **Task / Scope:** NONE — T021 is accepted; T022+ remain unauthorized
- **Runtime:** NONE
- **Required references:** NONE
- **Expected verification:** NONE
- **Authorization state:** NONE  <!-- NONE | AUTHORIZED | REWORK | SUPERSEDED -->

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

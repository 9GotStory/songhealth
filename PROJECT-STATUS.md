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
- **Status:** T027 IMPLEMENTATION AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** NOT YET REVIEWED — T027
- **Phase status:** T027 AUTHORIZED — T028+ UNAUTHORIZED
- **Previous completed scope:** T026 — provisional Development database manifest
- **Next valid action:** Claude implements only T027 and stops for independent Codex review
- **Blocking issues:** NONE
- **Review evidence:** T027 review pending. Authorization selected from accepted HEAD `2ebb085`:
  T001–T026 are complete, T027 is incomplete and is the first dependency-ready task, and no other
  implementation authorization is active.
- **Non-blocking notes:** NONE

## Authorized Implementation

- **Task / Scope:** T027 only — implement prerequisite checking and idempotent Development database
  setup in `scripts/foundation-operations.mjs`; expose only `foundation:check` and `dev:setup` in
  `package.json`. Stop before T028 or any later task.
- **Runtime:** `claude-developer`
- **Required references:** `CLAUDE.md`; `AGENTS.md`; `.specify/memory/constitution.md` Principles
  I–VI and Delivery and Quality Gates; `docs/spec-context/001-application-foundation.md`
  Implementation / Review routing and explicit out-of-scope boundaries;
  `specs/001-application-foundation/tasks.md` T027;
  `specs/001-application-foundation/spec.md` FR-003, FR-006, SC-001;
  `specs/001-application-foundation/plan.md` Configuration and startup, Operations and verification;
  `specs/001-application-foundation/contracts/foundation-operations.md` Prerequisites, Commands,
  Configuration examples, Safe diagnostic contract, and Timing boundaries;
  `scripts/foundation-operations.test.ts` accepted T019 contract; accepted T026
  `infra/compose.development.yaml`.
- **Expected verification:** Run the focused accepted T019 tests that exercise
  `foundation:check` and `dev:setup`, plus any directly affected static/type/lint check available;
  run `git diff --check`; report exact commands and results. Preserve deterministic injected/fake
  collaborator support. Verify preflight is non-mutating, every prerequisite category is checked,
  failures prevent later work, setup orders database start before explicit tracked migrations, and
  repeated setup creates no duplicate database resource. Do not weaken accepted tests.
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

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
- **Status:** T028 IMPLEMENTATION AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** NOT YET REVIEWED — T028
- **Phase status:** T028 AUTHORIZED — T029+ UNAUTHORIZED
- **Previous completed scope:** T027 — prerequisite checking and idempotent Development database
  setup
- **Next valid action:** Claude implements only T028 and stops for independent Codex review
- **Blocking issues:** NONE
- **Review evidence:** T028 review pending. Authorization selected from accepted HEAD
  `b1d1eb762cb90d5485806fde26d48cb9319b3823`: T001–T027 are complete and T027 is Human accepted;
  T028 is incomplete, is the first dependency-ready task, and no other implementation
  authorization is active.
- **Non-blocking notes:** NONE

## Authorized Implementation

- **Task / Scope:** T028 only — implement supervised native Public/Admin/server startup and bounded
  overall readiness in `scripts/foundation-operations.mjs`; expose only `dev:start` and `dev:ready`
  in `package.json`. Stop before T029 or any later task.
- **Runtime:** `claude-developer`
- **Required references:** `CLAUDE.md`; `AGENTS.md`; `.specify/memory/constitution.md` Principles
  I–VI and Delivery and Quality Gates; `docs/spec-context/001-application-foundation.md`
  Implementation / Review routing and explicit out-of-scope boundaries;
  `specs/001-application-foundation/tasks.md` T028;
  `specs/001-application-foundation/spec.md` FR-003, FR-009, SC-001;
  `specs/001-application-foundation/plan.md` Runtime composition, Configuration and startup, and
  Operations and verification;
  `specs/001-application-foundation/contracts/foundation-operations.md` Commands, Daily native
  process supervision, Health/readiness behavior, Safe diagnostic contract, and Timing boundaries;
  `specs/001-application-foundation/data-model.md` Execution Context, Migration State, and Health
  Snapshot; `specs/001-application-foundation/quickstart.md` §1;
  `scripts/foundation-operations.test.ts` accepted T019 startup/readiness contract;
  `tests/verification/diagnostic-surfaces.test.ts` accepted T023 nondisclosure contract; accepted
  T010 configuration boundary and T027 setup implementation.
- **Expected verification:** Run the focused accepted T019 tests for `dev:start` and `dev:ready`
  and the directly affected accepted T023 diagnostic/nondisclosure tests, plus any directly affected
  static/type/lint check available; run `git diff --check`; report exact commands and results.
  Verify startup validates the canonical Development identity before work, starts only the accepted
  Development database plus the three native processes, does not auto-apply migrations, is
  repeat-safe with no duplicate process/resource, and fails closed on partial startup. Verify
  readiness polls on an injected bounded deadline, succeeds only when database connectivity,
  migration currency, liveness/readiness, Public SSR, Admin CSR, and server route checks all pass,
  and reports safe actionable diagnostics without protected/raw output. Preserve deterministic
  injected/fake collaborator support and do not weaken accepted tests.
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

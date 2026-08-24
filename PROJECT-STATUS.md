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
- **Status:** T028 CHANGES REQUIRED — REVIEW ARTIFACT UNAVAILABLE

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED — T028-B01
- **Phase status:** T028 REWORK — T029+ UNAUTHORIZED
- **Previous completed scope:** T027 — prerequisite checking and idempotent Development database
  setup
- **Next valid action:** Claude publishes the existing T028 commit on a fetchable remote ref and
  stops for independent Codex review; no implementation changes are authorized
- **Blocking issues:** T028-B01 — reported implementation commit `3a283d8` and branch
  `agent/claude-developer/f4155ec6f84a` are absent from the reviewer checkout and all fetched origin
  refs, so the exact implementation artifact cannot be inspected or verified
- **Review evidence:** `git fetch origin --prune` completed, but `git cat-file -t 3a283d8` returned
  “Not a valid object name”; `git branch --all` contains no reported implementation branch.
- **Non-blocking notes:** NONE

## Authorized Implementation

- **Task / Scope:** T028-B01 rework only — publish the already-reported commit `3a283d8` to a
  fetchable remote branch/ref and report the exact ref and full SHA. Do not modify or amend the
  implementation and do not begin T029 or any later task.
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
- **Expected verification:** Push the exact existing commit without changing its SHA; confirm the
  remote ref resolves to its full SHA and its direct parent is authorization commit `ad5b7a5`.
  Report the push command/result and remote ref. No test rerun is required for artifact publication.
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

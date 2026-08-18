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
- **Status:** IMPLEMENTATION REVIEW — T019 PASS WITH NON-BLOCKING NOTES

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T019 ACCEPTED — PASS WITH NON-BLOCKING NOTES
- **Previous completed scope:** T019 — failing preflight and daily setup/start/ready/stop/restart
  command tests
- **Next valid action:** Codex identifies the next valid incomplete task, verifies its blocking
  dependencies, and issues a separate implementation authorization; T020+ and all implementation
  remain unauthorized until that handoff
- **Blocking issues:** NONE
- **Review evidence:** T019-B01 and T019-B02 are closed. Stop and restart tests establish a genuinely
  running precondition through the injected adapter, clear only observation counters/event history
  while preserving resource state, and assert the operation-under-test deltas. Repeat stop proves no
  second stop effect, and restart ordering is evaluated only over the restart trace, where all stop
  effects precede start effects. T019-B03 remains closed: migration inventory stays owned by the
  accepted migration boundary, while database/process adapters own idempotency and expose running
  state without hidden operations-module state or invented native-process ordering. Preflight,
  fail-before-work, setup/migration ordering, whole-foundation readiness, bounded polling, execution
  identity, persistence, and duplicate-safe startup coverage remain intact. The actual implementation
  diff is bounded to `scripts/foundation-operations.test.ts`; the T019 checkbox remains marked `[X]`,
  and this Codex-owned mirror is the only review write. No implementation, package wiring,
  dependency, manifest, lockfile, environment file, host mutation, Product behavior, or T020+ scope
  was added. Focused Vitest is red only at the intentionally absent
  `./foundation-operations.mjs` boundary. Root `tsc --noEmit` reports two imports of that same
  expected missing module plus the accepted T017/T018 unresolved modules and no other diagnostic.
  `git diff --check`, conflict-marker inspection, and no-skip/todo/only inspection pass. Review
  against T019, FR-003, FR-006, SC-001, the Foundation Operations Contract, Quickstart §1, the plan,
  the accepted migration boundary, routed Blueprint §§334–340/§§697–703, and Constitution Principles
  II/III/V/VI finds no Source-of-Truth conflict.
- **Non-blocking notes:** The focused ESLint command cannot run because the accepted locked graph
  still provides no `node_modules/.bin/eslint` executable. This pre-existing tooling limitation is
  outside T019 rework and does not authorize a manifest or lockfile change.

## Authorized Implementation

- **Task / Scope:** NONE — T019 is accepted; T020+ and all implementation await a separate Codex
  handoff
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

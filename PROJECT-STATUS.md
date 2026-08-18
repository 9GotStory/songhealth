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
- **Status:** IMPLEMENTATION REVIEW — T014 PASS

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS
- **Phase status:** T014 ACCEPTED — PASS
- **Previous completed scope:** T014 — PASS
- **Next valid action:** Codex verifies T015 remains the next incomplete dependency-ready task and
  records a separate Authorized Implementation handoff; no implementation is currently authorized
- **Blocking issues:** NONE
- **Review evidence:** T014-B01 and T014-B02 are closed. The actual implementation diff is bounded to
  the authorized new `apps/server/src/health.test.ts` plus the T014 checkbox. The suite now partially
  mocks the accepted `./migrations.js` module so `applyMigrations` and `writeMarker` are observable
  spies while read-only exports remain real, and it requires exact component membership/cardinality
  without array-order coupling. Current Vitest documentation confirms `vi.mock` registration precedes
  static module evaluation and async `importOriginal` supports this partial-mock shape. The targeted
  Vitest file is discovered and red only at the expected absent `./http.js` T015 boundary; root
  TypeScript checking reports only the expected absent `./http.js` and `./health.js` modules.
  `git diff --check`, untracked-file trailing-whitespace/conflict-marker checks, and the no-skipped/
  todo-test inspection pass. No Source-of-Truth conflict was found.
- **Non-blocking notes:** NONE

## Authorized Implementation

- **Task / Scope:** NONE
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

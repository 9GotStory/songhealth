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
- **Status:** IMPLEMENTATION REVIEW — T017 PASS WITH NON-BLOCKING NOTES

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T017 ACCEPTED — PASS WITH NON-BLOCKING NOTES
- **Previous completed scope:** T017 — PASS WITH NON-BLOCKING NOTES
- **Next valid action:** Codex identifies the next valid incomplete task, verifies its blocking
  dependencies, and records a separate authorization and implementation handoff; no implementation
  is currently authorized
- **Blocking issues:** NONE
- **Review evidence:** T017-B01 and T017-B02 are closed. The test contract now observes actual route
  exports through runtime namespace keys, rejects data/mutation exports without statically selecting
  absent properties, spies on SSR fetch behavior, requires a semantic main/heading boundary, rejects
  navigation and form/control structure, and retains bounded Product/domain, Admin/CMS/editorial,
  and authentication/session copy checks. A reviewer compiler probe using the same key-membership
  pattern against a compliant default-only module produces no TypeScript diagnostic. The actual diff
  is exactly bounded to the new `apps/web/app/routes/foundation.test.tsx`, the T017 checkbox, and
  this workflow mirror; it adds no route implementation/registration, dependency, Product behavior,
  Admin/server/script, infrastructure, or Source-of-Truth change. The targeted Vitest suite is
  discovered and red only at the intentionally absent T024 `./foundation.js` boundary; root
  `tsc --noEmit` reports only that same expected unresolved module. `git diff --check`,
  conflict-marker inspection, and no-skip/todo/only inspection pass. The tests match T017, FR-001,
  FR-002, FR-016, the plan, Constitution, and routed authority; no Source-of-Truth conflict was
  found.
- **Non-blocking notes:** The authorized ESLint command cannot run because the accepted locked graph
  provides no `node_modules/.bin/eslint` executable. This pre-existing tooling limitation is outside
  T017 rework scope and is not an implementation defect; do not change manifests or the lockfile to
  address it in this task.

## Authorized Implementation

- **Task / Scope:** NONE — T017 is accepted; T018 and all later tasks remain unauthorized
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

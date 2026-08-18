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
- **Status:** IMPLEMENTATION REVIEW — T018 PASS WITH NON-BLOCKING NOTES

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T018 ACCEPTED — PASS WITH NON-BLOCKING NOTES
- **Previous completed scope:** T018 — PASS WITH NON-BLOCKING NOTES
- **Next valid action:** Codex identifies the next valid incomplete task, verifies its blocking
  dependencies, and records a separate authorization and implementation handoff; no implementation
  is currently authorized
- **Blocking issues:** NONE
- **Review evidence:** The actual implementation diff is exactly bounded to the new
  `apps/admin/src/app.test.tsx`, the T018 checkbox, and this Codex-owned workflow mirror. The test
  imports the planned T025 `./app.js` boundary, uses `react-dom/server` only as a deterministic
  component-markup test utility, explicitly preserves the separate Admin CSR architecture, and
  requires a renderable default component, semantic main/heading structure, recognizable Admin and
  foundation/readiness-only copy, runtime key inspection for forbidden route exports, a no-fetch
  render, and bounded absence checks for authentication/session/access control, Product/domain,
  CMS/editorial workflow, navigation, form/control, and mutation surfaces. It does not create Admin
  application code, dependencies, configuration, Product behavior, infrastructure, or any T019+
  scope. Focused Vitest discovers the suite and is red only at the intentionally absent T025
  `./app.js` import. Root `tsc --noEmit` reports the new expected T018 `./app.js` TS2307 plus the
  previously accepted T017 `./foundation.js` TS2307, with no additional diagnostic. `git diff
  --check`, conflict-marker inspection, and no-skip/todo/only inspection pass. The tests align with
  T018, User Story 1, FR-001–FR-002, FR-016, the plan's separate minimal Admin CSR boundary, System
  Blueprint §§4–5/§218/§246, Delivery Context routing and exclusions, and Constitution Principles
  I–VI; no Source-of-Truth conflict was found.
- **Non-blocking notes:** The accepted locked graph still provides no
  `node_modules/.bin/eslint` executable, so the authorized focused ESLint attempt exits 127. Root
  typecheck necessarily retains T017's accepted tests-first unresolved `./foundation.js` module
  until T024; T018 itself adds only the expected unresolved `./app.js` module until T025. Neither
  condition is a T018 implementation defect, and no manifest or lockfile change is authorized to
  address them here.

## Authorized Implementation

- **Task / Scope:** NONE — T018 is accepted; T019 and all later tasks remain unauthorized
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

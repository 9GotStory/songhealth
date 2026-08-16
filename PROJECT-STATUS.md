# PROJECT STATUS

> Workflow/gate mirror only. Not a Source of Truth.

## Repository Bootstrap

- **Repository state:** PRE-IMPLEMENTATION BOOTSTRAP COMPLETE
- **Product/System Source of Truth:** `docs/website-modernization-docs/`
- **System Blueprint:** `docs/website-modernization-docs/current/10-system-blueprint.md` — FROZEN v1.1
- **Spec Kit control layer:** INSTALLED AS REPOSITORY FILES
- **Canonical Constitution:** ESTABLISHED — `.specify/memory/constitution.md` v1.0.0
- **Spec Kit runtime/integrations:** VERIFIED — Specify CLI 0.16.4; Codex + Claude integrations OK

## Planned Delivery

- **Delivery:** 001-application-foundation — Application Foundation & Development Runtime
- **Delivery Context:** `docs/spec-context/001-application-foundation.md`
- **Delivery Context state:** READY  <!-- UNSET | DRAFT | READY | STALE -->
- **Status:** IMPLEMENTATION HANDOFF — T001 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T001 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed phase:** ANALYZE — PASS (0 BLOCKING FINDINGS; 25 OF 25 REQUIREMENTS COVERED)
- **Next valid action:** Claude Code runs `$speckit-implement` for T001 only, verifies the scoped
  result, marks only T001 complete, and stops for Codex review
- **Blocking issues:** NONE — T001 is incomplete and Setup has no predecessor dependency

## Authorized Implementation

- **Task / Scope:** T001 — create only the private npm workspace root, Node/npm engine policy, and
  stable root command names in `package.json`; `tasks.md` may change only to mark T001 complete after
  its verification passes
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T001;
  `specs/001-application-foundation/spec.md` FR-001 and FR-012;
  `specs/001-application-foundation/plan.md` Technical Context and Project Structure;
  `specs/001-application-foundation/research.md` Decision 1;
  `specs/001-application-foundation/contracts/foundation-operations.md` Commands;
  System Blueprint §§ 51–54 and 82–87; Constitution Principles II, III, and VI
- **Expected verification:** `package.json` parses as JSON; the root is private and ESM; workspace
  membership is exactly `apps/*`; Node/npm engine policy matches the approved local Node 24/npm 12
  baseline without claiming Production support; stable root command names match the Operations
  Contract; no dependency, lockfile, workspace manifest/directory, script implementation, Product
  behavior, shared package, or speculative infrastructure is added; `git diff --check` passes
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

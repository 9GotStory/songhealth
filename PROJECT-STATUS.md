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
- **Status:** IMPLEMENTATION HANDOFF — T003 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T003 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed scope:** T002 — PASS
- **Next valid action:** Claude Code runs `$speckit-implement` for T003 only, verifies the scoped
  result, marks only T003 complete, and stops for Codex review
- **Blocking issues:** NONE — T001 is complete and reviewed; T003 is incomplete and its three target
  files are absent

## Authorized Implementation

- **Task / Scope:** T003 — create only the separate React/Vite Admin CSR workspace shell
  configuration in `apps/admin/package.json`, `apps/admin/vite.config.ts`, and
  `apps/admin/index.html`; `tasks.md` may change only to mark T003 complete after its verification
  passes
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T003;
  `specs/001-application-foundation/spec.md` FR-001 and FR-002;
  `specs/001-application-foundation/plan.md` Technical Context, Project Structure, and Runtime
  composition; `specs/001-application-foundation/research.md` Decision 2; System Blueprint
  §§ 53–54, 84–87, and 218–220; Constitution Principles II, III, V, and VI; current official Vite
  8 React/TypeScript configuration documentation
- **Expected verification:** the Admin workspace manifest is private ESM and declares only the
  approved React 19.2.7+/TypeScript 5.x/Vite 8 CSR dependency families needed by this boundary,
  including `@vitejs/plugin-react`, while exact lock resolution remains T008; Vite uses the official
  `react()` plugin; `index.html` is a minimal local module shell targeting the later
  `/src/main.tsx` entry and contains no external scripts, Product UI, navigation, authentication,
  or workflow behavior; no Admin source file, Public/Server change, root TypeScript config,
  dependency installation, lockfile, shared package, or speculative structure is added; package
  metadata and HTML/config structure are coherent and `git diff --check` passes
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

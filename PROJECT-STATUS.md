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
- **Status:** IMPLEMENTATION HANDOFF — T006 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T006 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed scope:** T005 — PASS
- **Next valid action:** Claude Code runs `$speckit-implement` for T006 only, verifies the scoped
  result, marks only T006 complete, and stops for Codex review
- **Blocking issues:** NONE — T001 is complete and reviewed; T006 is incomplete and
  `eslint.config.js` is absent

## Authorized Implementation

- **Task / Scope:** T006 — create only the baseline ESLint flat configuration and approved
  JavaScript/TypeScript static-check inputs in root `eslint.config.js`; `tasks.md` may change only
  to mark T006 complete after its verification passes
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T006 and Setup dependency
  order; `specs/001-application-foundation/spec.md` FR-013, with FR-012 and FR-016 as scope
  boundaries; `specs/001-application-foundation/plan.md` Technical Context, Project Structure, and
  Testing and security evidence; `specs/001-application-foundation/contracts/foundation-operations.md`
  `npm run check`; System Blueprint §§ 84–87, 345, 388–390, 418–420, and 440; Constitution
  Principles II, III, V, and VI; current ESLint 10 flat-config and typescript-eslint guidance
- **Expected verification:** `eslint.config.js` is an ESM flat configuration using current supported
  ESLint configuration APIs; it supplies baseline recommended JavaScript and TypeScript parsing/
  static rules for the approved `.js`, `.mjs`, `.cjs`, `.ts`, and `.tsx` surfaces and uses bounded
  file/global-ignore patterns for application, configuration, script, and test inputs while
  excluding dependencies and generated/build output; environment globals are scoped to their real
  Node or browser ownership rather than enabled repository-wide; T065 remains responsible for the
  complete deterministic import-direction and architecture-boundary rules, T066 for command wiring,
  and T008 for dependency resolution and the lockfile; no type-aware project-service expansion,
  custom architecture plugin, formatting framework, shared config package, application/source
  change, package-manifest/dependency change, dependency installation, lockfile, generated output,
  Product behavior, security scanner, or speculative hierarchy is added; because ESLint is not
  installed before T008, verification uses `node --check eslint.config.js`, a structural scope check,
  and `git diff --check` without downloading packages; only T006 is marked complete after these
  checks pass
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

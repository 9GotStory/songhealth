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
- **Status:** IMPLEMENTATION HANDOFF — T005 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T005 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed scope:** T004 — PASS
- **Next valid action:** Claude Code runs `$speckit-implement` for T005 only, verifies the scoped
  result, marks only T005 complete, and stops for Codex review
- **Blocking issues:** NONE — T001 is complete and reviewed; T005 is incomplete and
  `tsconfig.json` is absent

## Authorized Implementation

- **Task / Scope:** T005 — create only the strict shared ESM TypeScript configuration in root
  `tsconfig.json`; `tasks.md` may change only to mark T005 complete after its verification passes
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T005 and Setup dependency
  order; `specs/001-application-foundation/spec.md` FR-012 and FR-016;
  `specs/001-application-foundation/plan.md` Technical Context, Project Structure, and Testing and
  security evidence; `specs/001-application-foundation/research.md` Decision 2; System Blueprint
  §§ 54, 57, 82–87, and 92; Constitution Principles II, III, V, and VI; current TypeScript 5.9
  tsconfig option compatibility evidence
- **Expected verification:** `tsconfig.json` is a single root configuration for the approved
  TypeScript/TSX surfaces under `apps/`, `scripts/`, and `tests/`; it enables strict, no-emit ESM
  typechecking, React JSX support, and the Node/browser library environment needed by the planned
  three workspaces; its module and module-resolution settings form a valid TypeScript 5.9 ESM pair
  and remain compatible with both Node-owned and Vite-owned sources; includes/excludes are bounded
  to approved source/test/config surfaces and generated/dependency output is excluded; no path alias,
  project reference, emitted artifact, shared runtime/config package, source directory, application
  code, manifest/dependency change, dependency installation, lockfile, lint configuration, Product
  behavior, or speculative hierarchy is added; because no compiler is installed before T008,
  verification uses a structural configuration check plus `git diff --check` and does not download
  TypeScript; only T005 is marked complete after these checks pass
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

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
- **Status:** IMPLEMENTATION HANDOFF — T004 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T004 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed scope:** T003 — PASS
- **Next valid action:** Claude Code runs `$speckit-implement` for T004 only, verifies the scoped
  result, marks only T004 complete, and stops for Codex review
- **Blocking issues:** NONE — T001 is complete and reviewed; T004 is incomplete and
  `apps/server/package.json` is absent

## Authorized Implementation

- **Task / Scope:** T004 — create only the Fastify/Kysely Server workspace manifest and its narrow
  package export map in `apps/server/package.json`; `tasks.md` may change only to mark T004 complete
  after its verification passes
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T004;
  `specs/001-application-foundation/spec.md` FR-001 and FR-002;
  `specs/001-application-foundation/plan.md` Technical Context, Project Structure, Runtime
  composition, and Persistence and migrations; `specs/001-application-foundation/research.md`
  Decision 2; System Blueprint §§ 53–54, 84–87, 89–92, 96–97, 109–113, and 115–146;
  Constitution Principles I–III, V, and VI; current upstream Fastify 5, Kysely 0.29, mysql2, and
  TypeBox compatibility evidence
- **Expected verification:** the Server workspace manifest is private ESM and declares only the
  approved Fastify 5, Kysely 0.29, mysql2, TypeScript 5.x, Vitest, Node types, and TypeBox/JSON
  Schema dependency families needed by the foundation; because TypeBox 1.x requires TypeScript 7,
  use the TypeScript-5-compatible `@sinclair/typebox` family and leave exact resolution to T008;
  expose only the intentional package-root Server composition boundary targeting the planned
  `src/bootstrap.ts`, without public internal subpaths; no source file, route, schema, database
  table, migration, listener, DI container, OpenAPI platform, dependency installation, lockfile,
  Public/Admin change, Product behavior, authentication, shared package, or speculative structure
  is added; package metadata and export-map structure are coherent and `git diff --check` passes
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

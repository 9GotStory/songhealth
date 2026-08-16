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
- **Status:** IMPLEMENTATION HANDOFF — T008 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T008 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed scope:** T007 — PASS
- **Next valid action:** Claude Code runs `$speckit-implement` for T008 only, resolves and verifies
  the existing approved workspace dependency graph, marks only T008 complete, and stops for Codex
  review
- **Blocking issues:** NONE — T001–T007 are complete, T007 passed review, every Setup input exists,
  the required Node.js 24/npm 12 toolchain is active, and no root or nested lockfile currently exists

## Authorized Implementation

- **Task / Scope:** T008 — create only the root `package-lock.json` by resolving the dependency
  ranges already approved in `package.json` and the three `apps/*/package.json` manifests into one
  exact npm workspace graph; `tasks.md` may change only to mark T008 complete after verification
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T008, Setup dependency order,
  and checkpoint; `specs/001-application-foundation/research.md` Decisions 1–2;
  `specs/001-application-foundation/plan.md` Technical Context, Project Structure, and Constitution
  Check; `specs/001-application-foundation/spec.md` FR-012–FR-013 and FR-015–FR-016; the existing
  root/Web/Admin/Server package manifests as the approved direct dependency inputs; Delivery
  Context Implementation/Review routing and approved SRC-04/SRC-05 workspace/runtime decisions;
  Constitution Principles I–III, V, and VI; current Context7 `/npm/cli` evidence for a single root
  workspace lockfile and lockfile-first `npm ci` validation
- **Expected verification:** use the installed Node.js 24.x/npm 12.x toolchain from the repository
  root; create one root `package-lock.json` with an exact resolved/integrity-bearing transitive graph
  for the root plus exactly `apps/web`, `apps/admin`, and `apps/server`, with no nested lockfiles or
  additional workspace/direct dependency; do not change any package manifest, dependency range,
  approved major, engine policy, script, source/configuration file, or add a package-manager/
  workspace-orchestration layer; run root `npm ci` and prove it succeeds without changing the four
  manifests or generated lockfile; verify npm recognizes exactly the three application workspaces
  and reports no invalid, missing, peer-conflicting, or engine-incompatible dependency; run
  `git diff --check` and confirm only `package-lock.json` plus the T008 checkbox changed for this
  task; do not run `npm audit fix`, add overrides, use legacy/forced peer-resolution flags, create
  the later dependency-finding ledger/security command, or silently alter approved inputs—stop and
  report if compatible resolution requires any such expansion
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

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
- **Status:** IMPLEMENTATION AUTHORIZED — T025

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T024 ACCEPTED — T025 AUTHORIZED; T026+ UNAUTHORIZED
- **Previous completed scope:** T024 — minimal Public SSR foundation route and route registration
- **Next valid action:** Claude Code implements only T025, returns implementation-result evidence,
  and stops for independent Codex review; T026+ remain unauthorized
- **Blocking issues:** NONE
- **Review evidence:** Independent review of `f19f59e` against authorization commit `1206304`
  confirms exactly the three authorized Public implementation files plus the T024 checkbox. The
  root is a minimal React Router document shell, the route table registers only `/`, and the
  default-only foundation component renders bounded semantic Public foundation/readiness copy
  without data, mutation, navigation, forms, Product behavior, Admin/CMS behavior, authentication,
  or session behavior. Focused Vitest passes 9/9. Root `tsc --noEmit` reports exactly the six
  accepted TS2307 missing-boundary diagnostics for T025/T027+ and no T024 diagnostic or other
  error. `git diff --check`, conflict-marker inspection, no-skip/todo/only inspection, commit-parent
  verification, and clean-tree verification pass. No T025+, dependency, package, lockfile,
  manifest, schema/API, Production decision, shared package, speculative structure, or unrelated
  refactor was added. Review against T024, FR-001–FR-002, FR-016, the accepted T017 contract, plan,
  Delivery Context, and Constitution Principles I–VI finds no Source-of-Truth conflict.
  Product Owner Human Gate accepted T024.
- **Non-blocking notes:** The accepted locked graph still provides no
  `node_modules/.bin/eslint` executable, so the required focused ESLint attempt exits 127. The
  lockfile-exact install uses Node 24.19.0 with bundled npm 11.17.0 and emits the known npm-engine
  warning because the repository requests npm 12; neither limitation authorizes dependency,
  manifest, or lockfile changes.

## Authorized Implementation

- **Task / Scope:** T025 only — implement the separate minimal Admin CSR foundation shell in
  `apps/admin/src/app.tsx` and `apps/admin/src/main.tsx`; change only those two implementation files
  and mark only T025 complete in `specs/001-application-foundation/tasks.md`
- **Runtime:** Claude Code DEV Executor via the installed Spec Kit `implement` command/skill, bounded
  to T025
- **Required references:** `.specify/memory/constitution.md`; `CLAUDE.md`;
  `docs/spec-context/001-application-foundation.md` Implementation / Review routing;
  `specs/001-application-foundation/spec.md` User Story 1, FR-001–FR-002, and FR-016;
  `specs/001-application-foundation/plan.md` Runtime composition and project structure;
  `specs/001-application-foundation/tasks.md` T025 and dependency rules; and the accepted T018
  contract in `apps/admin/src/app.test.tsx`
- **Expected verification:** focused Vitest for `apps/admin/src/app.test.tsx` must pass and prove a
  default-only static Admin component with a semantic main/heading and recognizable
  Admin/foundation/readiness copy, without fetching, navigation, forms or interactive mutation,
  Product/domain content, CMS/editorial behavior, authentication, session, or access-control
  behavior. Verify `apps/admin/src/main.tsx` mounts that component as the separate React/Vite CSR
  entry through the existing `#root` boundary without adding routing, data access, or other
  behavior. Run focused ESLint and root `tsc --noEmit`, classifying only already-accepted unrelated
  baseline diagnostics as non-blocking; run `git diff --check`, conflict-marker inspection, and
  no-skip/todo/only inspection. Return the exact changed files, commands/results, commit SHA, and
  confirmation that no T026+, dependency/package/lockfile, Product behavior, authentication, data
  access, schema/API, Production decision, shared package, speculative structure, or unrelated
  refactor was added.
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

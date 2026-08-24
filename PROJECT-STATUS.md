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
- **Status:** IMPLEMENTATION AUTHORIZED — T024

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T023 ACCEPTED — T024 AUTHORIZED; T025+ UNAUTHORIZED
- **Previous completed scope:** T023 — failing daily command stdout/stderr, application-log, HTTP,
  exact-sentinel, and encoded-sentinel nondisclosure tests
- **Next valid action:** Claude Code implements only T024, returns implementation-result evidence,
  and stops for independent Codex review; T025+ remain unauthorized
- **Blocking issues:** NONE
- **Review evidence:** Independent review of `3876a9d` confirms the implementation diff is exactly
  `tests/verification/diagnostic-surfaces.test.ts` plus the T023 checkbox. The deterministic
  injected-fake contract defines 24 cases covering all six documented configuration-rejection
  classes across daily setup/start command surfaces, fail-before-work/readiness, application-log
  and HTTP failure presentation, raw adapter-error mapping, the closed SafeDiagnostic schema, and
  exact plus URI/base64/base64url/hex/JSON/unicode sentinel nondisclosure. The allowlists match the
  accepted server/OpenAPI schema. Focused Vitest is red only at the deliberately absent
  `../../scripts/foundation-operations.mjs` boundary. Root `tsc --noEmit` reports the six accepted
  baseline TS2307 diagnostics plus exactly the expected T023 missing-boundary diagnostic and no
  other error. `git diff --check`, conflict-marker inspection, and no-skip/todo/only inspection
  pass. No implementation, dependency, lockfile, manifest, environment, Product behavior,
  Production-derived data, host/resource mutation, or T024+ artifact was added. Review against
  T023, FR-007, SC-004, the Safe diagnostic contract, Quickstart §3, the plan, Delivery Context,
  and Constitution Principles I–VI finds no Source-of-Truth conflict. Product Owner Human Gate
  accepted T023.
- **Non-blocking notes:** The accepted locked graph still provides no
  `node_modules/.bin/eslint` executable, so the required focused ESLint attempt exits 127. This
  pre-existing tooling limitation does not authorize a dependency, manifest, or lockfile change.
  Vitest reports zero runtime-collected tests because the intentional static missing-module import
  stops suite evaluation; the source-defined 24-case inventory was therefore verified statically.

## Authorized Implementation

- **Task / Scope:** T024 only — implement the minimal Public SSR foundation route and route
  registration in `apps/web/app/root.tsx`, `apps/web/app/routes.ts`, and
  `apps/web/app/routes/foundation.tsx`; change only those three implementation files and mark only
  T024 complete in `specs/001-application-foundation/tasks.md`
- **Runtime:** Claude Code DEV Executor via the installed Spec Kit `implement` command/skill, bounded
  to T024
- **Required references:** `.specify/memory/constitution.md`; `CLAUDE.md`;
  `docs/spec-context/001-application-foundation.md` Implementation / Review routing;
  `specs/001-application-foundation/spec.md` User Story 1, FR-001–FR-002, and FR-016;
  `specs/001-application-foundation/plan.md` Runtime composition and project structure;
  `specs/001-application-foundation/tasks.md` T024 and dependency rules; and the accepted T017
  contract in `apps/web/app/routes/foundation.test.tsx`
- **Expected verification:** focused Vitest for
  `apps/web/app/routes/foundation.test.tsx` must pass and prove a default-only static Public route
  that server-renders meaningful semantic foundation/readiness content without fetching,
  navigation, forms, Product/domain behavior, Admin/CMS/editorial behavior, authentication, or
  session behavior. Verify the route is registered through the existing React Router Framework
  Mode boundary and the root remains the smallest correct document shell. Run focused ESLint and
  root `tsc --noEmit`, classifying only already-accepted unrelated baseline diagnostics as
  non-blocking; run `git diff --check`, conflict-marker inspection, and no-skip/todo/only
  inspection. Return the exact changed files, commands/results, commit SHA, and confirmation that
  no T025+, dependency/package/lockfile, Product behavior, authentication, data access, schema/API,
  Production decision, shared package, speculative structure, or unrelated refactor was added.
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

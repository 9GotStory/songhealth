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
- **Status:** IMPLEMENTATION AUTHORIZED — T029

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** HUMAN ACCEPTED — reviewed T028 scope, including T028-B01–T028-B05
- **Phase status:** T028 ACCEPTED — T029 AUTHORIZED; T030+ UNAUTHORIZED
- **Previous completed scope:** T028 — supervised native Development startup and bounded whole-
  foundation readiness, including accepted closure of T028-B01–T028-B05
- **Next valid action:** Claude Code implements only T029, returns implementation-result evidence,
  and stops for independent Codex review; T030+ remain unauthorized
- **Blocking issues:** NONE for the accepted T028 scope
- **Review evidence:** Exceptional corrective commit
  `ec998583ab687b1db4b5b8355c51479c394f505e` is fetchable and directly follows reviewed commit
  `ae42bf91cfaf733833089aecc7a0be4d990717f3`. Its bounded four-file diff tightens only the canonical
  Development configuration boundary and focused/affected tests: effective database port `3306`
  remains accepted and any other port is rejected before work/probing. Independent verification:
  canonical configuration 57/57; focused T028-B05 no-work/no-probe regression 1/1; diagnostic
  surfaces 24/24; full operations file 47 passed / 43 expected later-task stubs failed; TypeScript
  retains only the four established later-task missing-export errors; diff check clean. The server
  run produced 86 passes / 38 skips, with only the expected real-database-unavailable suite failure
  in the reviewer runtime. T026 manifest, dependencies/manifests/lockfiles, operations
  implementation, T028-B01–T028-B04, and T029+ are unchanged. T028-B01–T028-B05 are closed. The
  one-time Human exception is consumed; the repository's general three-round policy is unchanged.
- **Non-blocking notes:** Independent npm used Node 24.11.0 with npm 11.6.1, below the repository's
  npm 12 engine pin; this did not affect the focused unit results, but full prerequisite acceptance
  still requires the approved npm version.

## Authorized Implementation

- **Task / Scope:** T029 only — implement idempotent Development stop and restart in
  `scripts/foundation-operations.mjs`, and replace only the `dev:stop` / `dev:restart` placeholder
  adapters in `package.json`; routine stop must stop the three supervised native processes and the
  Development database container without deleting the named volume, repetition must be safe, and
  restart must complete the documented stop-before-start sequence while preserving Development data
- **Runtime:** Claude Code DEV Executor via the installed Spec Kit `implement` command/skill, bounded
  to T029; stop before T030 or any later task
- **Required references:** `.specify/memory/constitution.md`; `CLAUDE.md`;
  `docs/spec-context/001-application-foundation.md` Implementation / Review routing;
  `specs/001-application-foundation/spec.md` FR-003, FR-004, and SC-002;
  `specs/001-application-foundation/plan.md` Operations and verification and Persistence and
  migrations; `specs/001-application-foundation/tasks.md` T029 and dependency rules;
  `specs/001-application-foundation/contracts/foundation-operations.md` Commands;
  `scripts/foundation-operations.test.ts` existing T019 stop/restart acceptance cases
- **Expected verification:** focused Vitest for the T019 `dev:stop` and `dev:restart` cases must pass,
  including repeat-safe stop, exact native-process/database stop effects, stop-before-start ordering,
  and unchanged Development volume/data state; run the affected operations test file, focused ESLint,
  root TypeScript verification, `git diff --check`, conflict-marker inspection, and no-skip/todo/only
  inspection. Return the exact changed files, commit SHA, commands/results, confirmation that the
  Development named volume is never removed, and confirmation that no T030+ behavior, lifecycle
  journal/recovery/reset/inventory implementation, dependency/lockfile/manifest change, Product
  behavior, or broad host/resource mutation was added.
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

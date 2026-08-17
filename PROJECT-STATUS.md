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
- **Status:** IMPLEMENTATION HANDOFF — T011 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T011 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed scope:** T010 — PASS WITH NON-BLOCKING NOTES
- **Next valid action:** Claude Code runs `$speckit-implement` for T011 only, writes the failing
  real-engine migration contract tests, marks only T011 complete after the expected red result is
  verified, and stops for Codex review
- **Blocking issues:** NONE
- **Non-blocking notes:** The accepted T010 scope is committed at `df408b6`; its decimal-integer
  comment says padding is prohibited while the digit-only grammar accepts leading zeroes, which the
  routed requirements do not forbid

## Authorized Implementation

- **Task / Scope:** T011 — create only `apps/server/src/migrations.test.ts` with the failing
  real-engine contract tests named by T011; `tasks.md` may change only to mark T011 complete after
  the expected red result is verified
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T011, Foundational order, and
  parallel-test rules; `specs/001-application-foundation/spec.md` FR-004, FR-009, and SC-002;
  `specs/001-application-foundation/data-model.md` Data Store, Migration State, and Synthetic
  Persistence Marker; `specs/001-application-foundation/plan.md` Persistence and migrations plus
  Testing and security evidence; `specs/001-application-foundation/research.md` Decisions 7–8;
  `specs/001-application-foundation/contracts/foundation-operations.md` `db:status`, `db:migrate`,
  operation-target isolation, and failure behavior; `specs/001-application-foundation/quickstart.md`
  §§2 and 4; Delivery Context Implementation/Review routing and dependencies; Constitution
  Principles I–VI; installed Kysely 0.29.5 migration exports and `mysql2` 3.23.3 plus Context7
  migration evidence
- **Expected verification:** pin a real MySQL-compatible-engine contract, never SQLite or mocked
  persistence as acceptance evidence; status inspection must be read-only and return immutable,
  ordered `executed`/`pending` names with exact `current | pending | unavailable | error` state and
  the applicable `DATABASE_UNAVAILABLE`, `MIGRATIONS_PENDING`, or `MIGRATION_STATUS_FAILED` safe
  code without applying migrations or creating marker data; only explicit apply may transition
  pending to current, report each tracked migration, remain safe when repeated, and serialize
  concurrent apply attempts so each migration runs once; pending state must refuse readiness;
  exercise the sole `foundation_persistence_marker` operational contract with fixed key
  `sc002-development-persistence`, bounded opaque synthetic value, `synthetic` provenance, exact
  read-after-reconnect continuity, and absence in a fresh/reset-and-remigrated state; create no
  Product/domain schema, seed, or migration and expose no database URL, credential, raw SQL/error,
  stack, or unnecessary host/path detail; use only an isolated non-Production test database and
  exact cleanup, and fail explicitly rather than skip/pass if the required real engine is
  unavailable; use `Migrator`/`FileMigrationProvider` from `kysely/migration`, with read-only status
  based on `getMigrations()` and explicit apply based on `migrateToLatest()` or an equivalently
  bounded adapter; require the targeted Vitest file to be discovered and red only because the
  planned T012/T013 migration/database implementation is absent, not because of syntax, typing,
  fixture, tooling, or test-environment defects; run root TypeScript checking and allow only the
  expected missing planned implementation boundary, run `git diff --check`, confirm only
  `migrations.test.ts` plus the T011 checkbox changed, preserve the clean accepted T010 baseline,
  and do not create or modify T012/T013 implementation files, manifests, package files, lockfile,
  lifecycle scripts, health/HTTP/bootstrap code, or later task artifacts
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

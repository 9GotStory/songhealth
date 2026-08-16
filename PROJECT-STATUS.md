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
- **Status:** IMPLEMENTATION HANDOFF — T009 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T009 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed scope:** T008 — PASS
- **Next valid action:** Claude Code runs `$speckit-implement` for T009 only, writes and observes the
  required failing configuration tests, marks only T009 complete, and stops for Codex review
- **Blocking issues:** NONE — T001–T008 and the complete Setup checkpoint are complete and reviewed;
  T009 is the first incomplete Foundational task, is explicitly tests-first/parallel-capable, and
  does not depend on the intentionally absent T010 production implementation

## Authorized Implementation

- **Task / Scope:** T009 — create only `apps/server/src/config.test.ts` with failing tests for the
  six configuration rejection classes, four distinct identity dimensions, fixture-provenance
  policy, safe nondisclosure, and fail-before-work behavior; `tasks.md` may change only to mark T009
  complete after the required red-test evidence is observed
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T009 and Foundational
  dependency order; `specs/001-application-foundation/spec.md` FR-005–FR-008 and SC-004;
  `specs/001-application-foundation/data-model.md` Execution Context, Runtime Configuration, and
  Safe Diagnostic; `specs/001-application-foundation/plan.md` Constraints and Configuration and
  startup; `specs/001-application-foundation/research.md` Decision 6;
  `specs/001-application-foundation/contracts/foundation-operations.md` Configuration examples and
  Safe diagnostic contract; `specs/001-application-foundation/contracts/foundation-http.openapi.yaml`
  SafeDiagnostic schema; Quickstart §3; Delivery Context Implementation/Review routing and
  security/privacy boundaries; Constitution Principles I–VI; current Context7 Vitest 4.1 evidence
  for parameterized tests and `vi` call-boundary assertions
- **Expected verification:** use the locked Vitest 4.1 dependency and deterministic synthetic
  fixtures; cover at least one meaningful fixture for each exact mapping `CONFIG_MISSING`,
  `CONFIG_EMPTY`, `CONFIG_MALFORMED`, `CONFIG_UNSUPPORTED`, `CONFIG_OUT_OF_RANGE`, and
  `CONFIG_IDENTITY_CONFLICT`; assert the closed diagnostic fields and allowlisted configuration key
  while proving raw/encoded sentinel values, credentials, URLs, exceptions/stacks, paths, and extra
  fields are absent; prove Development maps to `development/daily/development/daily` and
  Verification to `development/verification/verification/verification`, `operationTarget` remains
  command-boundary input, `diagnosticScope` is derived and cannot be supplied as configuration, and
  hosted/Production or mismatched local identities are rejected; prove `synthetic` and
  `approved-non-production` provenance are accepted while `production-derived` and other values are
  rejected; use spies/fakes to prove invalid configuration starts no database pool, listener, child
  service, or other work, without contacting a real database/network or mutating local runtime
  state; run only the targeted `config.test.ts` suite and capture the expected non-zero red result
  caused by the absent T010 behavior/export, not test syntax, discovery, fixture, toolchain, or
  forced-failure errors; include no skipped/todo/placeholder tests; run `git diff --check` and
  confirm this task changes only `apps/server/src/config.test.ts` plus the T009 checkbox; do not
  create `config.ts`, a production stub, or any T010/bootstrap/database/listener implementation,
  and do not change manifests, the lockfile, configuration examples, or other application code
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

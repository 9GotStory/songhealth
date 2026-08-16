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
- **Status:** IMPLEMENTATION HANDOFF — T010 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T010 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed scope:** T009 — PASS
- **Next valid action:** Claude Code runs `$speckit-implement` for T010 only, implements the pinned
  configuration contract until the T009 red suite is green, marks only T010 complete, and stops for
  Codex review
- **Blocking issues:** NONE — T001–T009 are complete and reviewed, the Setup checkpoint passes,
  T009 provides the required red-test contract, and `apps/server/src/config.ts` is absent

## Authorized Implementation

- **Task / Scope:** T010 — create only `apps/server/src/config.ts` implementing the immutable,
  TypeBox-backed runtime-configuration loader and closed Safe Diagnostic construction pinned by
  T009; `tasks.md` may change only to mark T010 complete after verification passes
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T010 and Foundational order;
  `apps/server/src/config.test.ts` as the binding test-first API/behavior contract;
  `specs/001-application-foundation/spec.md` FR-005–FR-008 and SC-004;
  `specs/001-application-foundation/data-model.md` Execution Context, Runtime Configuration, and
  Safe Diagnostic; `specs/001-application-foundation/plan.md` Constraints and Configuration and
  startup; `specs/001-application-foundation/research.md` Decision 6;
  `specs/001-application-foundation/contracts/foundation-operations.md` Configuration examples and
  Safe diagnostic contract; `specs/001-application-foundation/contracts/foundation-http.openapi.yaml`
  SafeDiagnostic schema; Quickstart §3; Delivery Context Implementation/Review routing and
  security/privacy boundaries; Constitution Principles I–VI; installed `@sinclair/typebox` 0.34.52
  exports plus Context7 migration evidence (do not use the incompatible TypeBox 1.x package/imports)
- **Expected verification:** implement the exact `loadRuntimeConfiguration(env, operationTarget,
  work)` outcome contract without reading `process.env`; build closed TypeBox schemas using the
  installed 0.34 imports (`Type` from `@sinclair/typebox`, `Value` from
  `@sinclair/typebox/value`) and map validation internally without returning TypeBox errors or raw
  supplied values; require all ten environment keys with no silent defaults, parse port/pool values
  to numbers, enforce port `1..65535`, an explicit positive bounded local pool maximum, absolute
  target-appropriate origins, MySQL URLs with nonempty target-isolated credentials/database
  identities, allowlisted log level/proxy/fixture values, and the exact local identity mappings;
  ignore environment-record lookalikes for command-only `operationTarget` and derived
  `diagnosticScope`, derive scope only from the command target, and return an immutable accepted
  configuration containing exactly the eleven data-model fields with no diagnostic scope inside it;
  map each rejection class to its exact stable reason code and safe allowlisted configuration key,
  and construct only `{ reasonCode, diagnosticScope, component: "configuration",
  configurationKey?, remediation: "FIX_CONFIGURATION" }` with no message, extra property, raw
  value, credential, URL, exception/stack, or path; rejected input must invoke none of the supplied
  work-boundary fakes and this task must not create a real pool/listener/child service or implement
  bootstrap orchestration; run the targeted T009 suite and require all 22 tests to pass, run root
  TypeScript no-emit checking and `git diff --check`, and confirm only `config.ts` plus the T010
  checkbox changed; do not modify T009 tests, manifests, lockfile, examples, HTTP/health/database/
  migration/bootstrap code, lifecycle commands, or later task artifacts
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

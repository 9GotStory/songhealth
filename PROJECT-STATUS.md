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
- **Status:** IMPLEMENTATION HANDOFF — T007 AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Phase status:** T007 AUTHORIZED — PENDING CLAUDE CODE EXECUTION
- **Previous completed scope:** T006 — PASS
- **Next valid action:** Claude Code runs `$speckit-implement` for T007 only, verifies the scoped
  result, marks only T007 complete, and stops for Codex review
- **Blocking issues:** NONE — T007 is independent within Setup; the two required example files are
  absent and the existing `.gitignore` does not unignore them or ignore `.foundation-state/`

## Authorized Implementation

- **Task / Scope:** T007 — update only `.gitignore` and create only
  `.env.development.example` and `.env.verification.example` with the approved non-secret,
  operation-target-isolated configuration examples; `tasks.md` may change only to mark T007
  complete after its verification passes
- **Runtime:** Claude Code
- **Required references:** `specs/001-application-foundation/tasks.md` T007 and Setup dependency
  order; `specs/001-application-foundation/spec.md` FR-005–FR-008;
  `specs/001-application-foundation/contracts/foundation-operations.md` Configuration examples and
  interruption/local-state rules; `specs/001-application-foundation/data-model.md` Execution
  Context, Runtime Configuration, and Lifecycle Operation;
  `specs/001-application-foundation/plan.md` Configuration and startup plus Operations and
  verification; System Blueprint §§ 335, 339–340, 357–358, and 699–703; Constitution Principles I,
  IV, V, and VI; Delivery Context security, privacy, and data-integrity routing
- **Expected verification:** `.gitignore` ignores actual `.env`/`.env.*` local secret files and the
  checkout-local `.foundation-state/` journal/report tree while explicitly allowing exactly the two
  required committed example files; both examples contain the same complete ten-key contract
  (`APP_ENVIRONMENT`, `RUNTIME_PROFILE`, `APP_HOST`, `APP_PORT`, `PUBLIC_ORIGIN`, `DATABASE_URL`,
  `DATABASE_POOL_MAX`, `PROXY_POLICY`, `LOG_LEVEL`, and `FIXTURE_PROVENANCE`) with non-empty,
  non-secret, non-Production values; both use `APP_ENVIRONMENT=development`, Development uses
  `RUNTIME_PROFILE=daily`, loopback exposure and `PROXY_POLICY=none`, Verification uses
  `RUNTIME_PROFILE=verification`, Compose-internal application exposure and
  `PROXY_POLICY=one-hop`, and their database credentials/database identities and mutable resources
  are distinct; `FIXTURE_PROVENANCE` is `synthetic` or `approved-non-production`; neither example
  defines `operationTarget` or `diagnosticScope`, claims Production parity, embeds a real secret,
  or uses Production-derived data; `git check-ignore` proves local env/state paths are ignored and
  both examples are eligible for version control; only the three authorized target files plus the
  T007 checkbox change, and `git diff --check` passes; no application code, runtime validation,
  Compose manifest, service, container, database, dependency, lockfile, generated state/report,
  Product behavior, hosted/Production configuration, or speculative infrastructure is added
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

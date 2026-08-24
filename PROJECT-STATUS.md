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
- **Status:** HUMAN GATE REQUIRED — T023

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T023 REVIEW PASS — HUMAN GATE PENDING; T024+ UNAUTHORIZED
- **Previous completed scope:** T023 — failing daily command stdout/stderr, application-log, HTTP,
  exact-sentinel, and encoded-sentinel nondisclosure tests
- **Next valid action:** Product Owner Human Gate accepts or rejects T023; no later task is
  authorized
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
  and Constitution Principles I–VI finds no Source-of-Truth conflict.
- **Non-blocking notes:** The accepted locked graph still provides no
  `node_modules/.bin/eslint` executable, so the required focused ESLint attempt exits 127. This
  pre-existing tooling limitation does not authorize a dependency, manifest, or lockfile change.
  Vitest reports zero runtime-collected tests because the intentional static missing-module import
  stops suite evaluation; the source-defined 24-case inventory was therefore verified statically.

## Authorized Implementation

- **Task / Scope:** NONE — T023 passed independent review and awaits the Human Gate; T024+ remain
  unauthorized
- **Runtime:** NONE
- **Required references:** NONE
- **Expected verification:** NONE
- **Authorization state:** NONE  <!-- NONE | AUTHORIZED | REWORK | SUPERSEDED -->

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

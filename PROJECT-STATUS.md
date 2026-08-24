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
- **Status:** IMPLEMENTATION AUTHORIZED — T023

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T022 ACCEPTED — T023 AUTHORIZED; T024+ UNAUTHORIZED
- **Previous completed scope:** T022 — failing Development/Verification isolation,
  synthetic-marker continuity, exact confirmed Development reset, and unchanged
  Verification/non-target inventory tests
- **Next valid action:** Claude Code implements only T023, returns implementation-result evidence,
  and stops for independent Codex review; T024+ remain unauthorized
- **Blocking issues:** NONE
- **Review evidence:** Independent review of `30331d3` confirms the implementation diff is exactly
  `tests/verification/foundation-operation-target.test.ts` plus the T022 checkbox. The 21-case
  contract covers target identity/isolation and digest sensitivity, marker continuity across
  routine restart, exact action-bound reset and drift refusal, migration/marker postconditions,
  unchanged Verification/non-target inventory, and negative controls, using only deterministic
  injected fakes. Focused Vitest is red only at the deliberately absent
  `../../scripts/foundation-operations.mjs` boundary. Root `tsc --noEmit` reports the five accepted
  baseline TS2307 diagnostics plus exactly the expected T022 missing-boundary diagnostic and no
  other error. `git diff --check`, conflict-marker inspection, and no-skip/todo/only inspection
  pass. No implementation, dependency, lockfile, manifest, environment, Product behavior,
  Production-derived data, host/resource mutation, or T023+ artifact was added. Review against
  T022, FR-004, FR-008, SC-002, Resource Inventory, Quickstart §2, the plan, Delivery Context, and
  Constitution Principles I–VI finds no Source-of-Truth conflict. Product Owner Human Gate accepted
  T022.
- **Non-blocking notes:** The accepted locked graph still provides no
  `node_modules/.bin/eslint` executable, so the required focused ESLint attempt exits 127. This
  pre-existing tooling limitation does not authorize a dependency, manifest, or lockfile change.

## Authorized Implementation

- **Task / Scope:** T023 only — write failing daily command stdout/stderr, application-log, HTTP,
  exact-sentinel, and encoded-sentinel nondisclosure tests in
  `tests/verification/diagnostic-surfaces.test.ts`; create only that test artifact
- **Runtime:** Claude Code DEV Executor via the installed Spec Kit `implement` command/skill, bounded
  to T023
- **Required references:** `.specify/memory/constitution.md`; `CLAUDE.md`;
  `docs/spec-context/001-application-foundation.md` Implementation / Review routing;
  `specs/001-application-foundation/spec.md` FR-007 and SC-004;
  `specs/001-application-foundation/plan.md` Configuration and startup;
  `specs/001-application-foundation/tasks.md` T023 and dependency rules;
  `specs/001-application-foundation/contracts/foundation-operations.md` Safe diagnostic contract;
  `specs/001-application-foundation/quickstart.md` §3
- **Expected verification:** focused Vitest for
  `tests/verification/diagnostic-surfaces.test.ts` must collect the intended T023 cases and fail
  only at deliberately absent later implementation boundaries; cover daily command stdout/stderr,
  application-log, and HTTP surfaces with unique exact and encoded forbidden sentinels, asserting
  the closed SafeDiagnostic shape and no raw protected values, credentials, connection strings,
  internal exceptions/stacks, paths, or unnecessary infrastructure details. Use deterministic
  injected/fake collaborators and perform no real Podman/Compose, process, network, listener,
  database, filesystem-state, or host-resource mutation. Run focused ESLint and root
  `tsc --noEmit`, classifying only already-accepted missing-boundary/tooling diagnostics as
  non-blocking; run `git diff --check`, conflict-marker inspection, and no-skip/todo/only
  inspection. Return the exact changed files, commands/results, bounded expected-red evidence, and
  confirmation that no implementation, package/dependency/lockfile, manifest, environment,
  Product behavior, T024+, Production-derived data, or broad host/resource mutation was added.
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

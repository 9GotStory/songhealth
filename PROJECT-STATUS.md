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
- **Status:** T027 IMPLEMENTATION AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED — T027-B01, T027-B02, T027-B03
- **Phase status:** T027 REWORK AUTHORIZED — T028+ UNAUTHORIZED
- **Previous completed scope:** T026 — provisional Development database manifest
- **Next valid action:** Claude corrects only T027-B01–T027-B03 and stops for independent Codex
  re-review
- **Blocking issues:** T027-B01 — the new operations validator duplicates and weakens accepted T010
  `apps/server/src/config.ts`: it accepts mismatched `PUBLIC_ORIGIN` host/port, non-origin URL
  paths/query/userinfo/TLS, and arbitrary Development database user/name rather than enforcing the
  canonical target identity and credential/resource combinations required by FR-006. T027-B02 —
  the real setup adapter runs detached Compose and immediately applies migrations; the accepted
  manifest has no healthcheck and detached start does not establish MySQL readiness, so clean
  first-run setup can race engine initialization and fail instead of producing a usable idempotent
  setup. T027-B03 — preflight accepts any executable npm version even though the repository and
  Operations Contract require the supported npm CLI (`>=12.0.0 <13`); it can report success for an
  incompatible prerequisite.
- **Review evidence:** Exact commit `2a5906022ca0a334551a7a60dc4b7571e4462d86` has direct parent
  authorization commit `820d62bc35248eaeea626838e67e0111cd083a40`; its four-file diff is
  bounded and `git diff --check` passes. Static review confirms T028+ remain non-working stubs and
  the task checkbox/package-script boundary is correct. Focused tests could not be independently
  reproduced because this reviewer runtime has no Node/npm/npx executable; this is verification-
  environment unavailability, not an implementation finding. Source inspection against accepted
  T010 configuration behavior, FR-006, the Operations Contract, T026 manifest, and the real adapter
  path establishes the three blocking findings above.
- **Non-blocking notes:** The declaration file is broad because accepted tests import the planned
  boundary, but it implements no later-task runtime behavior.

## Authorized Implementation

- **Task / Scope:** T027 rework only — close T027-B01–T027-B03 in
  `scripts/foundation-operations.mjs` and directly affected declarations/tests only. Reuse or match
  the accepted T010 canonical Development configuration validation without weakening it; make the
  real database setup wait boundedly for usable engine readiness before explicit migrations; and
  validate the supported npm major/range during preflight. Stop before T028 or any later task.
- **Runtime:** `claude-developer`
- **Required references:** `CLAUDE.md`; `AGENTS.md`; `.specify/memory/constitution.md` Principles
  I–VI and Delivery and Quality Gates; `docs/spec-context/001-application-foundation.md`
  Implementation / Review routing and explicit out-of-scope boundaries;
  `specs/001-application-foundation/tasks.md` T027;
  `specs/001-application-foundation/spec.md` FR-003, FR-006, SC-001;
  `specs/001-application-foundation/plan.md` Configuration and startup, Operations and verification;
  `specs/001-application-foundation/contracts/foundation-operations.md` Prerequisites, Commands,
  Configuration examples, Safe diagnostic contract, and Timing boundaries;
  `scripts/foundation-operations.test.ts` accepted T019 contract; accepted T026
  `infra/compose.development.yaml`.
- **Expected verification:** Add focused regression coverage proving mismatched Development origin
  host/port and wrong database user/name are rejected before work; malformed origin paths/query/
  userinfo are rejected; incompatible npm versions fail preflight; and the real-adapter readiness
  boundary is bounded and precedes migration application without implementing T028 overall
  readiness. Rerun focused accepted T019/T023 tests for `foundation:check`/`dev:setup`, directly
  affected static/type checks, and `git diff --check`. Report exact commands/results and preserve
  all existing accepted tests.
- **Authorization state:** REWORK  <!-- NONE | AUTHORIZED | REWORK | SUPERSEDED -->

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

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
- **Status:** T028 CHANGES REQUIRED — REAL-ADAPTER CORRECTIONS

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED — T028-B02, T028-B03
- **Phase status:** T028 REWORK — T029+ UNAUTHORIZED
- **Previous completed scope:** T027 — prerequisite checking and idempotent Development database
  setup
- **Next valid action:** Claude corrects only T028-B02 and T028-B03 on top of `3a283d8`, then stops
  for independent Codex re-review
- **Blocking issues:**
  - T028-B02 — `foundation:check` tests only `APP_PORT` and database port 3306, but T028 derives and
    binds server/Admin at `APP_PORT + 1/+2`; occupied, colliding, or out-of-range derived endpoints
    therefore do not fail preflight before application work, contrary to the prerequisite and
    Quickstart §1 contracts.
  - T028-B03 — the Public adapter invokes React Router's default SSR entry while `@songhealth/web`
    lacks a direct `isbot` dependency. The installed React Router code consequently edits
    `apps/web/package.json` and runs `npm install` on first startup, as the developer observed. A
    daily start must not mutate the tracked checkout or dependency lock at runtime.
- **Review evidence:** Corrective artifact publication closes T028-B01: fetched commit
  `3a283d81f3a9196815c827007a9692506849c7f9` has direct parent `ad5b7a5`, a clean diff, and only the
  three authorized files. Independent detached-worktree verification: T019 produced 22 passes with
  only the three expected T029 tests red; T023 diagnostics passed 24/24; `tsc --noEmit` produced
  only the four unchanged later-task missing-export errors. Static inspection found T028-B02 in
  `checkDevelopmentPortsAvailable` and T028-B03 in the installed React Router default-entry setup
  path, which explicitly adds `isbot` and runs the package manager when the app manifest lacks it.
- **Non-blocking notes:** Independent npm used Node 24.11.0 with npm 11.6.1, below the repository's
  npm 12 engine pin; this did not affect the focused unit results, but full prerequisite acceptance
  still requires the approved npm version.

## Authorized Implementation

- **Task / Scope:** T028-B02/T028-B03 rework only — make preflight validate every T028 daily native
  endpoint, including derived-port range/collision/availability, before application work; prevent
  first Public startup from mutating tracked manifests or invoking runtime dependency installation
  by declaring only the already-locked React Router `isbot` runtime requirement in the Public
  workspace and reconciling the lockfile without changing the resolved dependency graph. Add only
  focused regressions needed for these findings. Do not change T028 orchestration semantics or
  begin T029 or any later task.
- **Runtime:** `claude-developer`
- **Required references:** `CLAUDE.md`; `AGENTS.md`; `.specify/memory/constitution.md` Principles
  I–VI and Delivery and Quality Gates; `docs/spec-context/001-application-foundation.md`
  Implementation / Review routing and explicit out-of-scope boundaries;
  `specs/001-application-foundation/tasks.md` T028;
  `specs/001-application-foundation/spec.md` FR-003, FR-009, SC-001;
  `specs/001-application-foundation/plan.md` Runtime composition, Configuration and startup, and
  Operations and verification;
  `specs/001-application-foundation/contracts/foundation-operations.md` Commands, Daily native
  process supervision, Health/readiness behavior, Safe diagnostic contract, and Timing boundaries;
  `specs/001-application-foundation/data-model.md` Execution Context, Migration State, and Health
  Snapshot; `specs/001-application-foundation/quickstart.md` §1;
  `scripts/foundation-operations.test.ts` accepted T019 startup/readiness contract;
  `tests/verification/diagnostic-surfaces.test.ts` accepted T023 nondisclosure contract; accepted
  T010 configuration boundary and T027 setup implementation.
- **Expected verification:** Demonstrate occupied/colliding/out-of-range derived server/Admin ports
  fail before process work; demonstrate `npm ci` followed by first Public adapter startup leaves
  `apps/web/package.json` and `package-lock.json` unchanged and does not run an install path; rerun
  the focused T019 startup/readiness tests, T023 diagnostic tests, directly affected package/static
  checks, `tsc --noEmit` with baseline comparison, and `git diff --check`. Report exact commands,
  results, changed files, commit/ref, expected-red later-task tests, and confirmation T029+ remains
  untouched.
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

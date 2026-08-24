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
- **Status:** T028 CHANGES REQUIRED — CONFIGURED-HOST PREFLIGHT

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED — T028-B04
- **Phase status:** T028 REWORK — T029+ UNAUTHORIZED
- **Previous completed scope:** T027 — prerequisite checking and idempotent Development database
  setup
- **Next valid action:** Claude corrects only T028-B04 on top of `4ad0aea`, then stops for the third
  and final independent corrective re-review
- **Blocking issues:** T028-B04 — `checkDevelopmentPortsAvailable()` now checks every required port
  but still bind-probes all of them on hard-coded `127.0.0.1`; canonical Development configuration
  also accepts `localhost`, `::1`, and any `127/8` `APP_HOST`, while the actual Public/server/Admin
  children bind that configured host. An occupied actual configured endpoint can therefore still
  pass preflight before application work.
- **Review evidence:** Corrective commit
  `4ad0aea50e88deb5aae2fd1505bbf7d6da41fe3f` directly follows `3a283d8`, has a clean bounded diff,
  closes T028-B02 port-range/port-collision coverage and T028-B03 checkout mutation, and leaves the
  resolved dependency graph unchanged. Independent detached-worktree verification reproduced
  45 passes with only 43 expected later-task reds in `foundation-operations.test.ts`, T023 24/24,
  successful `npm ci`, `npm ls isbot` at deduplicated 5.2.1, syntax check, and clean diff. Static
  comparison of the canonical host policy with `checkLoopbackPortAvailable` found T028-B04.
- **Non-blocking notes:** Independent npm used Node 24.11.0 with npm 11.6.1, below the repository's
  npm 12 engine pin; this did not affect the focused unit results, but full prerequisite acceptance
  still requires the approved npm version.

## Authorized Implementation

- **Task / Scope:** T028-B04 rework only — make real preflight bind-probe Public/server/Admin on the
  canonically accepted configured application host rather than hard-coded `127.0.0.1`, while
  retaining the corrected range/collision checks and the database manifest's actual bind endpoint.
  Add only focused regression/smoke evidence for accepted non-default loopback hosts. Do not change
  dependency files, T028 orchestration semantics, or begin T029 or any later task.
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
- **Expected verification:** Prove an occupied Public/server/Admin endpoint on an accepted
  non-default configured loopback host (at minimum a `127/8` address other than `127.0.0.1`) fails
  preflight, while a free configured-host endpoint passes the port leg. Rerun the focused T019/T023
  and T028 rework tests, syntax/static checks, `tsc --noEmit` with baseline comparison, and
  `git diff --check`; report exact commands/results, changed files, commit/ref, expected-red
  later-task tests, and confirmation T029+ remains untouched.
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

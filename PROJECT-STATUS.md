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
- **Status:** T029 CHANGES REQUIRED — REVIEW ROUND 1

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED — T029 review round 1
- **Phase status:** T028 RECONCILIATION ACCEPTED — T029 REWORK AUTHORIZED; T030+ UNAUTHORIZED
- **Previous completed scope:** T028 — supervised native Development startup and bounded whole-
  foundation readiness, including accepted closure of T028-B01–T028-B05
- **Next valid action:** Claude Code corrects only T029-B01–T029-B03 on implementation commit
  `af918fa8f10953136eb9febdcdaad30e5da35abe`, returns corrective evidence, and stops for independent
  Codex re-review; T030+ remain unauthorized
- **Blocking issues:** T029-B01 — `stopDevelopmentDatabase()` treats a non-accepting database TCP
  endpoint as proof that nothing is running and returns without issuing bounded Compose `stop`; a
  running container that is starting, unhealthy, or otherwise not accepting connections therefore
  survives `dev:stop`. T029-B02 — `recordedProcessIdentityHolds()` returns `true` whenever
  `/proc/<pid>/cmdline` cannot be read, so an unverifiable/recycled PID may be signalled; ownership
  uncertainty must fail closed without signalling. T029-B03 —
  `scripts/foundation-operations.d.mts` was changed despite the exact authorized implementation file
  scope being `scripts/foundation-operations.mjs` and `package.json`; no signature change required
  that third-file edit.
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
  still requires the approved npm version. The failed provider response reported a reset time of
  `2026-08-25 03:23:56`; this is diagnostic timing, not proof that capacity is available.
- **Reconciliation evidence:** Human-authorized non-rewriting merge
  `b16c06905f97566a279283df285da1fd3cfb2573` joins canonical governance head
  `5d2967cf1d536214c2ffea3fdd2877c48904ca5c` and accepted T028 implementation tip
  `ec998583ab687b1db4b5b8355c51479c394f505e` from exact merge base
  `ad5b7a5047a58e8b0e70bb670407fe307f7aa0e8`. The accepted tip is an ancestor of the merged head;
  its nine implementation files are byte-identical to the accepted tip; `PROJECT-STATUS.md` remains
  the canonical governance side; T028-B01–T028-B05 remain closed; T029+ remain unauthorized.

## Authorized Implementation

- **Task / Scope:** T029 rework only — correct T029-B01 and T029-B02 in
  `scripts/foundation-operations.mjs`; add only focused T029-B01/T029-B02 regression coverage in
  `scripts/foundation-operations.test.ts`; revert the unauthorized documentation-only changes to
  `scripts/foundation-operations.d.mts` for T029-B03; retain only the authorized `package.json`
  adapter replacements and directly required T029 implementation; do not alter accepted T028
  behavior or implement T030+
- **Runtime:** Claude Code DEV Executor corrective revision from
  `af918fa8f10953136eb9febdcdaad30e5da35abe`, bounded to T029-B01–T029-B03; stop before T030 or any
  later task
- **Required references:** `.specify/memory/constitution.md`; `CLAUDE.md`;
  `docs/spec-context/001-application-foundation.md` Implementation / Review routing;
  `specs/001-application-foundation/spec.md` FR-003, FR-004, and SC-002;
  `specs/001-application-foundation/plan.md` Operations and verification and Persistence and
  migrations; `specs/001-application-foundation/tasks.md` T029 and dependency rules;
  `specs/001-application-foundation/contracts/foundation-operations.md` Commands;
  `scripts/foundation-operations.test.ts` existing T019 stop/restart acceptance cases
- **Expected verification:** add focused regression evidence that a running database container is
  stopped even when its TCP endpoint is not accepting connections, and that unreadable/missing PID
  identity evidence never sends a signal; rerun focused T019 `dev:stop` / `dev:restart`, the full
  affected operations test, focused ESLint, root TypeScript verification, `git diff --check`,
  conflict-marker inspection, and no-skip/todo/only inspection. Return exact changed files, commit
  SHA, commands/results, proof only `scripts/foundation-operations.mjs`,
  `scripts/foundation-operations.test.ts`, and `package.json` differ from the authorized base, proof
  the named volume is never removed, and confirmation no T030+ or other excluded scope was added.
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

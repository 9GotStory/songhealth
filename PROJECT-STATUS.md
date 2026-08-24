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
- **Status:** T028 EXCEPTIONAL T028-B05 REWORK AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED — T028-B05; ONE-TIME HUMAN OVERRIDE AUTHORIZED
- **Phase status:** T028 EXCEPTIONAL REWORK — T029+ UNAUTHORIZED
- **Previous completed scope:** T027 — prerequisite checking and idempotent Development database
  setup
- **Next valid action:** Claude corrects only T028-B05, then stops for Codex independent corrective
  re-review. PASS clears authorization and returns to the Product Owner Human Gate; CHANGES REQUIRED
  returns directly to Human decision with no further automatic corrective round.
- **Blocking issues:** T028-B05 — endpoint validation and preflight use the port parsed from
  `DATABASE_URL`, but the accepted T026 Development manifest always publishes the actual database
  endpoint at `127.0.0.1:3306`. Canonical configuration currently accepts another database URL
  port, so `APP_PORT=3306` with a different configured database port can pass collision validation
  even though Public and the started database target the same actual port. The validator must use
  the manifest endpoint or the canonical boundary must reject a non-3306 Development database port.
- **Review evidence:** Corrective commit
  `ae42bf91cfaf733833089aecc7a0be4d990717f3` directly follows `4ad0aea`, has a clean bounded diff,
  and closes T028-B04 by probing Public/server/Admin on configured `APP_HOST` with a focused
  non-default `127/8` regression. Review of the manifest, canonical URL policy, and corrected
  preflight found T028-B05. T028-B01–T028-B04 are closed. Human explicitly authorized one
  exceptional bounded corrective round for T028-B05 only; the repository's general three-round
  corrective policy is unchanged.
- **Non-blocking notes:** Independent npm used Node 24.11.0 with npm 11.6.1, below the repository's
  npm 12 engine pin; this did not affect the focused unit results, but full prerequisite acceptance
  still requires the approved npm version.

## Authorized Implementation

- **Task / Scope:** T028-B05 only — tighten the canonical Development configuration boundary so
  `DATABASE_URL` is accepted only when its database port matches the accepted T026 manifest
  endpoint, port `3306`, and reject a non-3306 Development database URL before any operational
  work. Preserve the accepted T010 policy and all accepted T027/T028 behavior; do not add a second
  weaker operations-layer policy. Change only the canonical configuration implementation if
  required, directly affected focused configuration/T028 regression tests, and operations code
  only if strictly necessary to consume the corrected canonical result. Do not modify the T026
  manifest, dependencies, package manifests, lockfiles, T028-B01–T028-B04, or T029+ work.
- **Runtime:** `claude-developer`
- **Required references:** Human T028-B05 exception decision; `AGENTS.md`; `CLAUDE.md`;
  `.specify/memory/constitution.md`; `PROJECT-STATUS.md`; T010 canonical configuration
  implementation/tests; `infra/compose.development.yaml` as read-only T026 evidence;
  `scripts/foundation-operations.mjs`; `scripts/foundation-operations.test.ts`; T028 requirements in
  `specs/001-application-foundation/spec.md`, `plan.md`, `tasks.md`, `contracts/operations.md`,
  `data-model.md`, and `quickstart.md`.
- **Expected verification:** focused canonical configuration regressions proving Development
  port `3306` remains accepted and a non-3306 `DATABASE_URL` is rejected with a closed Safe
  Diagnostic before any operational work; focused T028-B05 regression proving no work/probe occurs;
  existing T028 and diagnostic-surface verification; TypeScript and diff checks with baseline
  accounting; explicit evidence that the T026 manifest, dependency/package/lock files, B01–B04,
  and T029+ are untouched; exact fetchable commit and parent.
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

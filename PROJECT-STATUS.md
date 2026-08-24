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
- **Status:** HUMAN GATE — T028 MAXIMUM CORRECTIVE ROUNDS REACHED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED — T028-B05; HUMAN GATE REQUIRED
- **Phase status:** T028 BLOCKED AFTER THREE CORRECTIVE ROUNDS — T029+ UNAUTHORIZED
- **Previous completed scope:** T027 — prerequisite checking and idempotent Development database
  setup
- **Next valid action:** HUMAN GATE — decide whether to authorize further T028 correction or accept
  an explicit exception; no agent implementation authorization remains active
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
  preflight found T028-B05. T028-B01–T028-B04 are closed; the three-round corrective limit is now
  exhausted.
- **Non-blocking notes:** Independent npm used Node 24.11.0 with npm 11.6.1, below the repository's
  npm 12 engine pin; this did not affect the focused unit results, but full prerequisite acceptance
  still requires the approved npm version.

## Authorized Implementation

- **Task / Scope:** NONE — Human Gate required after maximum corrective rounds
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

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
- **Status:** T027 REVIEW PASS — PRODUCT OWNER HUMAN GATE

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS
- **Phase status:** T027 REVIEWED — AWAITING PRODUCT OWNER ACCEPTANCE; T028+ UNAUTHORIZED
- **Previous completed scope:** T027 — prerequisite checking and idempotent Development database
  setup
- **Next valid action:** Product Owner Human Gate for T027; do not authorize T028 in this issue
- **Blocking issues:** NONE
- **Review evidence:** Independent re-review of corrective commit
  `63990d0729bb34b3512e938636181f954cb14eb0` against rework authorization commit `ca1e66b` closes
  T027-B01–T027-B03. The direct parent is exact and the corrective diff changes only
  `scripts/foundation-operations.mjs`, its declaration boundary, and focused accepted tests. The
  operations path now delegates to accepted T010 `loadRuntimeConfiguration`, so canonical
  Development host/origin/port and database user/name identity is enforced before work without a
  second weaker policy. Database setup starts only the accepted Development database, polls the
  injected usable-engine boundary on a 120-second/500-millisecond bound, maps probe failure/timeout
  to a closed `DATABASE_UNAVAILABLE`, and applies tracked migrations only after readiness. npm
  preflight parses the private command result and accepts only npm 12.x. Added regressions cover
  eight origin/database identity and format refusals, npm range cases, timeout/late readiness, and
  start→readiness→migration ordering. `git diff --check`, ancestry, clean-tree, scope, task-boundary,
  and T028+ stub inspection pass. Developer evidence reports all focused T019/T023 and 18 corrective
  tests passing; unchanged expected-red failures belong only to T028+ and absent T032–T037 exports.
  No Product behavior, Production decision/parity claim, new dependency/service, destructive
  lifecycle behavior, or later task was added.
- **Non-blocking notes:** This reviewer runtime has no Node/npm/npx executable, so focused tests
  could not be independently reproduced; this is verification-environment unavailability. The
  developer's exact command/result evidence and independent static inspection are otherwise
  coherent.

## Authorized Implementation

- **Task / Scope:** NONE — T027 review passed; T028+ remain unauthorized
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

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
- **Status:** REVIEW PASS — T026 AWAITING PRODUCT OWNER ACCEPTANCE

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T026 REVIEW PASS — PRODUCT OWNER HUMAN GATE; T027+ UNAUTHORIZED
- **Previous completed scope:** T026 — provisional Development database manifest
- **Next valid action:** Product Owner reviews and accepts or rejects T026; no later task is
  authorized in this issue
- **Blocking issues:** NONE
- **Review evidence:** Independent re-review of corrective commit `c9162e4` against rework
  authorization commit `4f29456` closes T026-B01. The direct parent is exact and the corrective
  diff changes only `infra/compose.development.yaml`: all three checkout labels now require the
  same runtime-supplied `SONGHEALTH_CHECKOUT_ID`. Compose render/parse with the safe synthetic value
  `synthetic-checkout-review` succeeds and emits that identical non-empty value on the service,
  network, and volume; absent and empty inputs both fail at required-variable interpolation before
  a generic or empty ownership claim can be accepted. The complete T026 diff remains bounded to the
  Development manifest and T026 checkbox. It contains one digest-pinned MySQL 8.4 database,
  loopback-only `127.0.0.1:3306` publication, Development-only placeholders aligned with the
  committed example, InnoDB/`utf8mb4`, a persistent named volume, and the complete custom label set
  on every resource. Independent digest inspection identifies MySQL 8.4.11 from the 8.4 source
  path. `git diff --check`, clean-tree, conflict-marker, scope, task-boundary, and direct-parent
  verification pass. No T027+, Verification manifest, dependency/package/lockfile, Product
  schema/API/data, authentication, Production choice/parity claim, additional service, speculative
  structure, destructive lifecycle behavior, or unrelated refactor was added. Review against T026,
  FR-004–FR-005, FR-008, FR-015, Research Decisions 4–5, Data Store, the Operations Contract,
  Delivery Context, and Constitution Principles I–VI finds no Source-of-Truth conflict.
- **Non-blocking notes:** Focused T019–T023 suites remain expected-red at the absent T027+
  `scripts/foundation-operations.mjs` boundary and do not consume this manifest. This reviewer
  runtime has no `npx` executable, so those suites could not be reproduced locally; the manifest's
  supported Compose render/parse and digest inspection were independently reproduced.

## Authorized Implementation

- **Task / Scope:** NONE — T026 passed independent review and awaits Product Owner acceptance;
  T027+ remain unauthorized
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

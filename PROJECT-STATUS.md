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
- **Status:** IMPLEMENTATION REVIEW — T020 PASS WITH NON-BLOCKING NOTES

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** `.specify/feature.json` — `SPECIFY_FEATURE_DIRECTORY` is unset
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS WITH NON-BLOCKING NOTES
- **Phase status:** T020 ACCEPTED — T021+ UNAUTHORIZED
- **Previous completed scope:** T020 — failing exact-ownership, action-token, lock/re-inventory,
  drift, and forbidden-deletion tests
- **Next valid action:** Codex identifies the next valid incomplete task, verifies all blocking
  dependencies, and issues a separate implementation authorization; T021+ and all implementation
  remain unauthorized until that handoff
- **Blocking issues:** NONE
- **Review evidence:** T020-B02 is closed. The injected confirmation authority records every exact
  opaque token submitted to verification and enforces issuance under the exact `(target, action)`
  pair. Accepted reset and cleanup cases prove each operation submits the caller-presented token,
  mints no replacement token in its operation event slice, verifies under the bound action after
  locked re-inventory/evidence recomputation, and mutates only the individually recorded exact
  resources. Operation-level mismatch cases present a real non-empty token issued for the other
  valid target/action pair, prove reset/cleanup submit that exact caller token without minting a
  substitute, and prove boundary refusal causes zero mutation. The direct same-target/
  different-action control separately proves action-specific correlation without pinning token
  value or serialization. T020-B01 remains closed: the observed custom-label map is the sole
  completeness input, every documented missing key is exercised, and an initially absent manifest
  resource refuses issuance. T020-B03 remains closed: reset, cleanup, and assessment-drift traces
  enforce immediate post-lock inspection/recomputation and release after mutation/refusal.
  T020-B04 remains closed across the expanded accepted/refusal matrix, including both mismatch
  cases: the legacy no-argument volume deletion path and every forbidden broad mutation remain
  untouched. The actual working-tree diff remains bounded to the authorized T019/T020 test artifact
  in `scripts/foundation-operations.test.ts`, the already-complete T020 checkbox, and this
  Codex-owned mirror; no operations implementation, application, manifest, package, lockfile,
  configuration, environment, or T021+ artifact was added. No retry/recover action, journal,
  interruption, integrity, repeatability, or recovery-assessment model was added. Focused Vitest is
  red only at the intentionally absent `./foundation-operations.mjs` boundary. Root
  `tsc --noEmit` reports the two imports of that expected missing module plus the accepted T017/T018
  unresolved modules and no other diagnostic. `git diff --check`, conflict-marker inspection, and
  no-skip/todo/only inspection pass. Review against T020, FR-004, FR-017, SC-002, Owned Runtime
  Resource, Resource Inventory, the plan, Foundation Operations Contract, Quickstart §2, routed
  Blueprint §§335/697–703, Delivery Context, and Constitution Principles I–VI finds no
  Source-of-Truth conflict.
- **Non-blocking notes:** The accepted locked graph still provides no
  `node_modules/.bin/eslint` executable, so the required focused ESLint attempt exits 127. This
  pre-existing tooling limitation does not authorize a dependency, manifest, or lockfile change.

## Authorized Implementation

- **Task / Scope:** NONE — T020 is accepted; T021+ and all implementation await a separate Codex
  handoff
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

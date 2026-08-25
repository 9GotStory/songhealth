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
- **Status:** T031 IMPLEMENTATION AUTHORIZED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** HUMAN ACCEPTED — independently reviewed T030; T030-B01 accepted closed
- **Phase status:** T030 ACCEPTED — T031 AUTHORIZED; T032+ UNAUTHORIZED
- **Previous completed scope:** T030 — typed Podman inventory normalization and exact
  resource/attachment ownership predicates, with T030-B01 accepted closed
- **Next valid action:** Claude Code implements only T031, returns implementation evidence, and
  stops for independent Codex review; T032+ remain unauthorized
- **Blocking issues:** NONE for accepted T030 scope
- **T030 review evidence:** Exact corrective tip `659136afaaf8de633875473b1965b8ffea0acfd5`
  follows rework authorization `197f7d675068a41f2567044a08c9dda079af0366`; the exact diff is
  limited to `scripts/foundation-operations.mjs` and is clean. Independent verification: focused
  T030 status/normalization and ownership-refusal cases 20 passed with the one assessment-predicate
  case correctly remaining T031; full operations 74 passed / 20 expected T031 failures; TypeScript
  retains only the four established later-task missing-export errors. T030-B01 is closed:
  `foundationInventory` reaches only inventory inspection and no assessment, confirmation, lock,
  re-inventory, drift-refusal, mutation, reset, cleanup, or broad-deletion path. Typed deterministic
  normalization, exact ownership, blocked/read-only handling, output closure, dependencies,
  manifests, and lockfile remain compliant.
- **T030 Product Owner acceptance:** Human Gate accepted reviewed corrective implementation tip
  `659136afaaf8de633875473b1965b8ffea0acfd5` and independent PASS governance record
  `8482bd059dd7107883b139ca4d304622efe0a45b`; T030-B01 is accepted as closed. The accepted
  implementation tip is already an ancestor of the canonical PASS head, so no history
  reconciliation is required. Authorized Implementation remains `NONE`; T031+ remain unauthorized.
- **Review evidence:** Corrective tip `969992645ebbe9948131a64ef6b0b9378894b829` is fetchable and
  follows replayed T029 implementation commit `e9da8ff52db8992ea8abb51c9732e24d556bb1eb`
  from rework authorization `8518f9f774ca4c15995f41f1b759ef859d4dcbeb`. Exact base-to-tip changes are
  `scripts/foundation-operations.mjs`, `scripts/foundation-operations.test.ts`, and `package.json`;
  `scripts/foundation-operations.d.mts` is identical to the authorized base. Independent verification:
  T029-B01 2/2; T029-B02 2/2; focused restart 1/1; full operations 54 passed / 40 expected T030–T031
  stub failures; TypeScript retains only the four established later-task missing-export errors;
  diff check and prohibited-marker inspection are clean. Unconditional exact Compose stop closes
  T029-B01; unreadable/missing PID identity evidence now fails closed without signalling, closing
  T029-B02; the unauthorized declaration-file delta is absent, closing T029-B03. The named-volume
  deletion path remains absent; T030+ behavior, dependencies, lockfile, manifests, and Product scope
  are unchanged.
- **Non-blocking notes:** Independent npm used Node 24.11.0 with npm 11.6.1, below the repository's
  npm 12 engine pin; this did not affect the focused unit results, but full prerequisite acceptance
  still requires the approved npm version. ESLint remains unavailable because `@eslint/js` and the
  completed check entry point belong to later task scope.
- **Reconciliation evidence:** Human-authorized non-rewriting merge
  `b16c06905f97566a279283df285da1fd3cfb2573` joins canonical governance head
  `5d2967cf1d536214c2ffea3fdd2877c48904ca5c` and accepted T028 implementation tip
  `ec998583ab687b1db4b5b8355c51479c394f505e` from exact merge base
  `ad5b7a5047a58e8b0e70bb670407fe307f7aa0e8`. The accepted tip is an ancestor of the merged head;
  its nine implementation files are byte-identical to the accepted tip; `PROJECT-STATUS.md` remains
  the canonical governance side; T028-B01–T028-B05 remain closed; T029+ remain unauthorized.
- **T029 reconciliation evidence:** Human-authorized non-rewriting merge
  `8b04f9c67da25a5e461e532abfb01dcb1bb2a024` joins canonical PASS governance head
  `ecba7490c70af0c4ac73d78dbf681c3cf701c305` and reviewed T029 corrective tip
  `969992645ebbe9948131a64ef6b0b9378894b829` from exact common base
  `8518f9f774ca4c15995f41f1b759ef859d4dcbeb`. The reviewed tip is an ancestor of the merged head;
  `package.json`, `scripts/foundation-operations.mjs`, and
  `scripts/foundation-operations.test.ts` are byte-identical to the reviewed tip;
  `PROJECT-STATUS.md` remains the canonical governance side; T029-B01–T029-B03 remain closed;
  Authorized Implementation remains `NONE`; T030+ remain unauthorized.
- **T029 Product Owner acceptance:** Human Gate accepted reviewed corrective implementation tip
  `969992645ebbe9948131a64ef6b0b9378894b829`, reconciliation merge
  `8b04f9c67da25a5e461e532abfb01dcb1bb2a024`, and governance reconciliation record
  `e049174571a29d0b9cac198d1273a642bd1564c3`. T029-B01–T029-B03 are accepted as closed;
  Authorized Implementation remains `NONE`; T030+ remain unauthorized.

## Authorized Implementation

- **Task / Scope:** T031 — implement action-bound confirmation tokens, per-operation-target locking,
  immediate re-inventory, applicable assessment-evidence recomputation, drift refusal, and bounded
  exact mutation in `scripts/foundation-operations.mjs` only; do not begin T032 or add lifecycle
  journals/signal handling
- **Runtime:** Claude Code (`claude-developer`) using the installed Claude integration, bounded to
  T031 and required to stop before T032+
- **Required references:** `specs/001-application-foundation/tasks.md` T031;
  `specs/001-application-foundation/spec.md` FR-004, FR-017, SC-002;
  `specs/001-application-foundation/data-model.md` §Resource Inventory;
  `specs/001-application-foundation/contracts/foundation-operations.md` §Operation-target
  ownership and isolation and §Failure behavior; `specs/001-application-foundation/plan.md`
  §Operations and verification; `.specify/memory/constitution.md` Principles I–VI
- **Expected verification:** Run the focused T020/T031 destructive-operation cases in
  `scripts/foundation-operations.test.ts`, plus the full foundation-operations unit suite; verify
  tokens are action-bound and issued only for exact eligible inventories; verify the exact target
  lock is acquired before immediate re-inventory and assessment recomputation; verify unavailable
  lock, missing/mismatched token, blocked ownership, inventory/assessment drift, or collaborator
  refusal produces the documented safe refusal with zero mutation; verify accepted reset/cleanup
  removes only individually recorded exact resources and never uses prefixes, wildcards, label
  filters, `--remove-orphans`, broad `down --volumes`, prune, unresolved variables, force removal,
  or broad volume deletion; verify T032+ behavior, dependencies, manifests, and lockfile are
  unchanged
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

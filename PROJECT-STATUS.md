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
- **Status:** T032 CHANGES REQUIRED

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED — T032-B01–T032-B03
- **Phase status:** T031 ACCEPTED — T032 REWORK AUTHORIZED; T033+ UNAUTHORIZED
- **Previous completed scope:** T031 — action-bound exact-evidence confirmations, per-target lock,
  immediate re-inventory/evidence recomputation, drift refusal, and bounded exact mutation
- **Next valid action:** Claude Code corrects only T032-B01–T032-B03 from the exact persisted
  REWORK authorization base, returns corrective evidence, and stops for independent re-review;
  T033+ remain unauthorized
- **Blocking issues:** T032-B01 — the accepted routine `devRestart` regression test now returns
  non-zero on a fresh journal-enabled harness; T032-B02 — existing setup/stop/restart lifecycle
  actions are not journaled before work and after their phases; T032-B03 — unreadable/corrupt
  journals are normalized to absence and terminal journal-write failures are swallowed, permitting
  work or success without durable unambiguous journal state
- **T031 review evidence:** Human-authorized non-rewriting reconciliation merge
  `e56f29144e5f8638b3ebbb70d36c193488bc7206` has first parent rework authorization
  `7b2aa1404f95db7533be0898c0b3352c62bd0588` and second parent exact corrective tip
  `de6386a4151e5525ecb454b02ffd6722e37063ae`, both diverging from reviewed base
  `2e763b518447367e9132f659526a56e64acfef59`. `PROJECT-STATUS.md` at the merge is
  byte-identical to the first parent and `scripts/foundation-operations.mjs` is byte-identical to
  the corrective tip; diagnostic conflict commit `a700961b4cf442188277e6d86ff275662b33151d`
  is not an ancestor. Fresh independent T031-B01 proof passed 35/35; focused T020/T031 passed
  40/40; full foundation operations passed 94/94; TypeScript retains only the four established
  later-task missing-export errors. Changed-yet-still-eligible inventory/assessment drift refuses
  with `RESOURCE_INVENTORY_CHANGED` and zero mutation; prohibited mutation paths and T032+ remain
  absent. The exact corrective tip and reconciliation merge are ancestors of this PASS governance
  head.
- **T031 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `de6386a4151e5525ecb454b02ffd6722e37063ae`, reconciliation merge
  `e56f29144e5f8638b3ebbb70d36c193488bc7206`, and independent PASS governance record
  `dc8ccbebea6aa659f70cd8c153a6129e3256bf21`; T031-B01 is accepted as closed. Authorized
  Implementation remains `NONE`; T032+ remain unauthorized.
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

- **Task / Scope:** T032 REWORK — correct only T032-B01–T032-B03 in
  `scripts/foundation-operations.mjs`: restore accepted routine restart behavior; journal every
  currently implemented mutating lifecycle action (setup including migration phases, start, stop,
  restart, reset, cleanup) before work and after each durable phase without adding later command
  adapters; and fail closed on unreadable/corrupt journals or failed terminal persistence so no
  operation proceeds or reports success with absent/ambiguous required journal evidence
- **Runtime:** Claude Code (`claude-developer`) using the installed Claude integration, bounded to
  T032-B01–T032-B03 and required to stop before T033+
- **Required references:** `specs/001-application-foundation/tasks.md` T032;
  `specs/001-application-foundation/spec.md` FR-003 and FR-017;
  `specs/001-application-foundation/data-model.md` §Lifecycle Operation;
  `specs/001-application-foundation/contracts/foundation-operations.md` §Failure behavior;
  `specs/001-application-foundation/plan.md` §Operations and verification;
  `specs/001-application-foundation/research.md` Decision 5;
  `specs/001-application-foundation/quickstart.md` §5;
  `tests/verification/lifecycle-recovery.test.ts`; `.specify/memory/constitution.md` Principles I–VI
- **Expected verification:** Reproduce and close the exact accepted regression with
  `npx vitest run tests/verification/foundation-operation-target.test.ts -t "routine dev:restart preserves"`;
  run `npx vitest run scripts/foundation-operations.test.ts`, the focused T032 cases in
  `tests/verification/lifecycle-recovery.test.ts`, and `npx vitest run`; compare base-to-corrective
  pass/failure sets and report zero regressions. Provide focused injected evidence that setup,
  stop, and restart write `running` before work and terminal/phase records afterward; that corrupt
  or unreadable journal reads refuse before work; and that a terminal-write failure returns a
  closed non-zero result rather than success. Reconfirm atomic mode-`0600` real storage, immutable
  primary/secondary failure semantics, signal exit behavior, and no T033+ behavior, dependency,
  manifest, package command, declaration-file, or lockfile changes
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

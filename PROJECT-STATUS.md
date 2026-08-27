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
- **Status:** T038 CHANGES REQUIRED — REWORK HANDOFF

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** CHANGES REQUIRED — T038-B01 and T038-B02
- **Phase status:** T038 REWORK AUTHORIZED; T039+ UNAUTHORIZED
- **Previous completed scope:** T037 — status/inventory, interruption injection, recovery,
  confirmed reset, and persistence-check command adapters
- **Next valid action:** Claude Code corrects only T038-B01 and T038-B02 from persisted rework
  authorization, reports the exact corrective tip and verification evidence, then stops for
  independent Codex re-review
- **Blocking issues:** T038-B01 — `apps/server/src/http.ts` maps every Fastify internal error log
  through `operationalFailureDiagnostic("application")`, which hard-codes
  `diagnosticScope=foundation`; the approved identity mapping requires Development application-log
  failures to use `daily` and Verification application-log failures to use `verification`, with
  `foundation` reserved for cross-target preflight. T038-B02 — the same error-log path emits a Pino
  envelope containing `level`, `time`, `err`, and free-form `msg`, with the Safe Diagnostic nested
  under `err`; FR-007 and the Operations Contract require each emitted failure on the application-log
  surface to have exactly the closed Safe Diagnostic fields and prohibit additional properties and
  free-form messages. The new test asserts the nested fragment and explicitly expects `msg`, so it
  does not enforce the required whole-record shape.
- **T038 review evidence:** Exact implementation tip
  `e2cc822e82dccb574799846e4f2fa459284242dd` has authorization commit
  `875c8650e98789084c46f2abaa9bd0cde7616d58` as its sole parent; its clean diff is limited to
  `apps/server/src/http.ts`, `scripts/foundation-operations.mjs`,
  `apps/server/src/bootstrap.test.ts`, and `tests/verification/diagnostic-mapping.test.ts`, with no
  T039+ implementation. Syntax and TypeScript pass; the focused server/configuration/operations/
  diagnostic verification passes 209/209. Raw exception, stack, credential, connection-string,
  path, and child-process details are suppressed in the exercised cases. Static and test inspection
  identifies T038-B01 and T038-B02 on the Fastify application-error log path; command-boundary and
  spawned-process mappings have no blocking finding in this round.
- **T038 authorization:** Map application, orchestration, Podman, Compose, and database failures to
  the already specified closed Safe Diagnostic contract in `apps/server/src/http.ts` and
  `scripts/foundation-operations.mjs`. Required authority: `.specify/memory/constitution.md`,
  `specs/001-application-foundation/spec.md` FR-007 and SC-004,
  `specs/001-application-foundation/plan.md` §Configuration, identity, and secrets,
  `specs/001-application-foundation/data-model.md` §Safe Diagnostic,
  `specs/001-application-foundation/contracts/foundation-operations.md` §Safe diagnostic contract,
  `specs/001-application-foundation/quickstart.md` §3, and
  `specs/001-application-foundation/tasks.md` T038. Scope excludes T039+, Verification-profile
  implementation, proxy/Nginx changes, new dependencies, requirement/architecture changes, and any
  weakening of established ownership, lifecycle, immutable-failure, configuration-validation, or
  refusal behavior. Verification must cover the exact closed schema and allowlists across server
  HTTP/logging plus command stdout/stderr and mapped orchestration/Podman/Compose/database failures;
  reject additional/free-form fields and raw passthrough; scan exact and encoded protected
  sentinels; prove failures remain non-zero and occur before readiness/work acceptance; run relevant
  focused diagnostic, HTTP, foundation-operation, syntax, type, and diff checks; and confirm no
  T039+ implementation.
- **T037 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `32c80051836f9cbaa3d96e77fdad167fd2107c57` and independent PASS governance record
  `9b4f4e8467cbac72c478679dc2630ecf19dc341e`; T037-B01 is accepted as closed. The accepted PASS
  history descends linearly from canonical T036 acceptance, so no reconciliation merge is required.
  Authorized Implementation remains `NONE`; T038+ remain unauthorized.
- **T037 final review evidence:** Exact corrective tip
  `32c80051836f9cbaa3d96e77fdad167fd2107c57` has persisted REWORK authorization
  `a8f7f8afe7d10ea3c06897a4f1b22545b8c463ae` as its sole parent; its corrective diff is limited to
  `scripts/foundation-operations.mjs`, `scripts/foundation-operations.test.ts`,
  `tests/verification/foundation-command-adapters.test.ts`,
  `tests/verification/foundation-operation-target.test.ts`, and
  `tests/verification/lifecycle-recovery.test.ts`, with no T038+ implementation. Independent
  inspection and real-CLI adapter regressions close T037-B01: the complete Development inventory
  includes the manifest-declared network with exact Compose names, checkout/manifest/custom labels,
  current ownership schema, collision/ambiguity handling, and foreign-attachment evidence; every
  blocked network state prevents token issuance and Compose repair, while a fully proven network
  permits exactly the bounded recovery reconcile. Syntax and TypeScript pass; focused
  CLI/foundation/database/diagnostic verification passes 166/166; lifecycle plus operation-target
  verification is 74 passed / 1 established retry-fixture failure; the full relevant surface is
  343 passed / 1 established failure / 38 real-engine tests unavailable because the required
  explicit local environment source is absent. Diff check is clean. Node 24.11.0/npm 11.6.1 remains
  below the npm 12 engine pin and is non-blocking for these results.
- **T037 review evidence:** Exact implementation tip
  `9d5372eb0be215f452bd4505aede232bbdce7243` has authorization commit
  `18b440cc28cd409c41eb85035d91a0c72bc4d91b` as its sole parent; its clean diff is limited to
  `scripts/foundation-operations.mjs`, `scripts/foundation-operations.d.mts`, `package.json`, and
  `tests/verification/foundation-command-adapters.test.ts`, with no T038+ implementation. Syntax and
  TypeScript pass. Independent focused CLI/foundation/database/diagnostic verification passes
  158/158; lifecycle plus operation-target verification is 74 passed / 1 established retry-fixture
  failure; the full relevant surface is 335 passed / 1 established failure / 38 real-engine tests
  unavailable because the explicit local environment source is absent. Static inspection finds
  T037-B01: `infra/compose.development.yaml` declares and labels `development.network`, but
  `TARGET_RESOURCES.development` records only the database container and volume, so the real typed
  inventory discards the network claim and recovery reaches `compose up --detach database` without
  network ownership evidence.
- **T037 authorization:** Expose the already specified status/inventory, interruption-injection,
  Development recovery, confirmed Development reset, and Development persistence-check command
  adapters in `scripts/foundation-operations.mjs` and `package.json`. Required authority:
  `.specify/memory/constitution.md`, `specs/001-application-foundation/spec.md` FR-003–FR-004 and
  FR-017, `specs/001-application-foundation/plan.md`,
  `specs/001-application-foundation/data-model.md`,
  `specs/001-application-foundation/contracts/foundation-operations.md` §Commands and §Failure
  behavior, `specs/001-application-foundation/quickstart.md` §2, and
  `specs/001-application-foundation/tasks.md` T037. Scope excludes T038+, new dependencies,
  architecture/requirement changes, broad deletion, Production/hosted behavior, and weakening the
  accepted exact-ownership, confirmation, journal, recovery, reset, persistence, isolation, or
  closed-diagnostic boundaries. Verification must cover the exposed CLI/package entry points,
  argument/target/action/phase/repair/confirmation validation, read-only status/inventory behavior,
  bounded mutation and refusal paths, interruption and immutable-primary-failure behavior,
  persistence/reset/non-target isolation, relevant focused suites, syntax/type/diff checks, and no
  T038+ implementation.
- **T036 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `ee4b7985af06e1b242c4f10f08cf9c98ed5c7c06` and independent PASS governance record
  `ae125a62fa2193901a75bdbd49372b59bb311437`; T036-B01 is accepted as closed. The accepted PASS
  history descends linearly from canonical T035 acceptance, so no reconciliation merge is required.
  Authorized Implementation remains `NONE`; T037+ remain unauthorized.
- **T036 final review evidence:** Exact corrective tip
  `ee4b7985af06e1b242c4f10f08cf9c98ed5c7c06` has persisted REWORK authorization
  `0e0597e76cb5b12641a5fc1b1a6d13aa8fac3e66` as its sole parent; its corrective diff is limited to
  `scripts/foundation-operations.mjs` and
  `tests/verification/database-command-routing.test.ts`, with no T037+ implementation. Independent
  inspection and the spawned real-CLI routing suite close T036-B01: Development and Verification
  commands read, canonically validate, and address only their selected target's local configuration
  and database identity; missing/cross-target/invalid identities refuse before adapter work; valid
  target records reach the correctly scoped status/apply adapter with closed diagnostics. Focused
  T036/configuration/foundation-operation/operation-target verification passes 203/203; the full
  suite is 323 passed / 1 established lifecycle fixture failure / 38 real-engine tests unavailable
  because the required explicit local environment source is absent. Syntax and diff checks pass.
  TypeScript retains exactly the three established T037 missing-export errors. Node 24.11.0/npm
  11.6.1 remains below the npm 12 engine pin and is non-blocking for these results.
- **T036 review evidence:** Exact implementation tip
  `a520efb445409f550ab7066e4a79992101706634` has authorized base
  `c3911194bd1a02c9a936d948374d3a18bd49c3db` as its sole parent; its clean diff is limited to
  `scripts/foundation-operations.mjs`, `scripts/foundation-operations.d.mts`, `package.json`, and
  `tests/verification/database-commands.test.ts`, with no T037+ implementation. Independent focused
  verification passes 197/197; syntax and diff checks pass; TypeScript retains exactly the three
  established T037 missing-export errors. Inspection finds T036-B01: `createCommandLineCollaborators`
  supplies `loadValidatedDevelopmentConfiguration`, `applyTrackedMigrations`, and
  `readTrackedMigrationStatus` for both selectable targets, while those adapters read only
  `.env.development.local` and its `DATABASE_URL`; therefore the real Verification command path
  either rejects the Development identity as cross-target or addresses the Development database,
  and the positive injected Verification tests do not exercise this real wiring.
- **T035 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `eee407c8de7977d5aa5ef3ed873866464bbe8086` and independent PASS governance record
  `4bd29c71855a10a2adb31f64e1091a28760c935a`; T035-B01–T035-B02 are accepted as closed.
  Authorized Implementation remains `NONE`; T036+ remain unauthorized.
- **T035 final review evidence:** Exact corrective tip
  `eee407c8de7977d5aa5ef3ed873866464bbe8086` has persisted REWORK authorization
  `9cf157a0cf131a5aceff5e4d32fe61462ace2378` as its sole parent; the corrective diff is limited to
  `scripts/foundation-operations.mjs`, `scripts/foundation-operations.d.mts`, and
  `tests/verification/foundation-operation-target.test.ts`, with no T036+ implementation. Independent
  inspection and reproduction close T035-B01–T035-B02: the complete target inventory again retains
  absent expected roles with separate normalized state evidence for before/after comparison, and the
  marker continuity proof now runs through the accepted supervised Development restart including all
  native processes and closed restart-failure behavior. The focused T035 suite passes 24/24;
  foundation operations pass 94/94; the broader selected suites pass 278/279 with only the established
  lifecycle fixture failure; the full suite is 295 passed / 1 established fixture failure / 38
  real-engine tests unavailable because the required explicit local environment source is absent.
  Syntax and diff checks pass. TypeScript retains exactly the three established T037 missing-export
  errors. Node 24.11.0/npm 11.6.1 remains below the npm 12 engine pin and is non-blocking for these results.
- **T034 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `f1895d7a67f4292667432e83e9751a78080e0562` and independent PASS governance record
  `001680d48258f7eed236d48bdf3b6f723f6bb098`; T034-B01–T034-B02 are accepted as closed.
  Authorized Implementation remains `NONE`; T035+ remain unauthorized.
- **T034 final review evidence:** Exact corrective tip
  `f1895d7a67f4292667432e83e9751a78080e0562` has persisted REWORK authorization
  `3218d4b0d714f5ee73c3fbbfc88671e5ae633e57` as its sole parent; the corrective diff is limited to
  `scripts/foundation-operations.mjs` (+88/-24) and two focused regressions in
  `tests/verification/lifecycle-recovery.test.ts` (+80), with no T035+ implementation. Independent
  inspection and reproduction close T034-B01–T034-B02: confirmations bind the exact requested
  interrupted origin action and exact normalized evidence values; cross-origin token replay and
  still-recover-eligible enum drift both refuse with `RESOURCE_INVENTORY_CHANGED` before repair or
  postchecks. All seven focused T034 cases pass; lifecycle recovery is 50 passed / 1 established
  canonical-configuration fixture failure; foundation operations pass 94/94; syntax and diff checks
  pass. TypeScript retains exactly the four established later-task missing-export errors. Node
  24.11.0/npm 11.6.1 remains below the npm 12 engine pin and is non-blocking for these results.
- **T034 review evidence:** Exact implementation tip
  `74438dcf9c797d1b7409a6656c95ea752f3bdba8` has authorized base
  `3444d82c951125cdc6d52cecf9d3efb6f5082cae` as its sole parent; the clean diff is limited to
  `scripts/foundation-operations.mjs` (+446/-47), with no T035+ implementation. Syntax and five
  focused T034 cases pass; foundation operations pass 94/94; lifecycle recovery is 48 passed / 1
  established canonical-configuration fixture failure; TypeScript retains the four established
  later-task missing-export errors. Independent probes reproduce T034-B01 and T034-B02: a token
  issued for interrupted `start` successfully authorizes a later `stop` origin, and changing the
  normalized reconstructibility verdict from `not-applicable` to `not-reconstructible` still
  authorizes repair because both string values collapse to `false` in the confirmation digest.
- **T033 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `19ca50d709cfffe48ec09707b80c093490d89572` and independent PASS governance record
  `ca17e4c64ab47bc5a56f28541fdb766cb6e26f7d`; T033-B01–T033-B03 are accepted as closed.
  Authorized Implementation remains `NONE`; T034+ remain unauthorized.
- **T033 final review evidence:** Exact corrective tip
  `19ca50d709cfffe48ec09707b80c093490d89572` descends directly from persisted REWORK authorization
  `79ff506148c79dff3c8d73f0ca04a3b3e9b0f538`; its corrective diff is limited to
  `scripts/foundation-operations.mjs` (+188/-63), and the full authorized-base-to-tip history
  contains no T034+ implementation. Independent inspection and probes close T033-B01–T033-B03:
  malformed/missing repair disposition selects manual review while valid dispositions retain the
  fixed row order; all four emitted evidence digests are deterministic canonical 64-hex SHA-256,
  ignore supplied digest strings, and change with origin id/action/phase/original failure; target or
  profile mismatch and missing/non-allowlisted action or phase refuse closed with no assessment or
  side effect, while valid and unclosed-running journals still assess correctly. Syntax passes;
  focused T033 decision order passes 26/26; lifecycle recovery is 43 passed / 6 expected-red (five
  T034 cases plus the independently classified pre-existing canonical-configuration fixture
  interaction); foundation operations pass 94/94. Diff check is clean. Tests, declarations,
  manifests, dependencies, package commands, and lockfile are unchanged. Node 24.11.0/npm 11.6.1
  remains below the npm 12 engine pin and is non-blocking for these focused results.
- **T033 review evidence:** Exact implementation tip
  `1ba7d3bcb34b8db82145d47a8fcb480f693c29c2` has authorized base
  `24b09006869ef1923344a3dbb0fa2c71dcf9be74` as its sole parent; its clean base-to-tip diff is
  limited to `scripts/foundation-operations.mjs` (+291/-3), with no T034+ implementation.
  Independent verification reproduced lifecycle recovery at 43 passed / 6 failed and foundation
  operations at 94/94. The 26 focused T033 decision tests pass, but inspection against the Recovery
  Assessment data model and failure contract found T033-B01–T033-B03 above. The six residual
  lifecycle failures retain the reported five T034 expected-red cases plus the pre-existing
  canonical-configuration fixture interaction. Node 24.11.0/npm 11.6.1 remains below the npm 12
  engine pin and is non-blocking for these focused results.
- **T032 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `526dd012830ada2b4c69e68e79a249e319b41a45` and independent PASS governance record
  `87c872eda65e69e5d0b4b3ae7fc8a4a34fda61d5`; T032-B02–T032-B04 are accepted as closed,
  and T032-B01 is accepted as a review misclassification of a pre-existing expected-red T022
  fixture rather than an implementation regression. Authorized Implementation remains `NONE`;
  T033+ remain unauthorized.
- **T032 final review evidence:** Exact corrective tip
  `526dd012830ada2b4c69e68e79a249e319b41a45` descends directly from round-2 REWORK authorization
  `6feb3768b975a6b5dd6ee9298b189309ae0e2b7e`; its corrective diff is limited to
  `scripts/foundation-operations.mjs`, and `git diff --check` is clean. Independent inspection
  confirms journal-enabled setup/start/restart now call the same accepted canonical and derived
  endpoint validation boundaries as their unjournaled paths while retaining B02/B03 journal
  behavior. Foundation operations pass 94/94; lifecycle recovery passes the 15 T032 cases with 34
  expected T033/T034 failures; the full suite is 236 passed / 55 expected later-task failures / 38
  skipped, plus the established unavailable real-database suite. TypeScript retains exactly the
  four established later-task missing-export errors. The focused T022 routine-restart assertion
  was independently reproduced with the identical `expected 1 to be +0` failure at original T032
  authorized base `111037cf921532c34afe96dcb2ad2e10e4041f6b`; therefore B01 was a review
  misclassification, not a regression or a requirement conflict. B02–B04 are closed, no T033+
  implementation or out-of-scope file change is present, and T032 passes independent review.
- **T032 corrective review evidence:** Exact corrective tip
  `1dfa06797dcda02f797438238ef79a9e9a225da3` descends directly from REWORK authorization
  `aa32d95e5a275180b59b4af987c726c7e44f286e`; its corrective diff is limited to
  `scripts/foundation-operations.mjs`. Independent verification closes T032-B01–T032-B03: the
  focused routine restart passes; foundation operations pass 94/94; lifecycle recovery is 15
  passed / 34 expected T033–T034 failures; setup/stop/restart phase journaling, corrupt-journal
  refusal, and required terminal-persistence failure handling are present. T032-B04 remains.
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

- **Task / Scope:** T038 rework only — correct T038-B01 and T038-B02 on the Fastify internal
  application-error log path. Ensure the emitted failure record itself has exactly the closed Safe
  Diagnostic field set, with `diagnosticScope` derived from the composed Development (`daily`) or
  Verification (`verification`) context. Update only the directly affected composition/logging code
  and focused tests; T039+ remain unauthorized
- **Runtime:** Claude Code (`claude-developer`)
- **Required references:** Constitution; `spec.md` FR-007 and SC-004; `plan.md` §Configuration,
  identity, and secrets; `data-model.md` §Safe Diagnostic; Operations Contract §Safe diagnostic
  contract; `quickstart.md` §3; `tasks.md` T038; `CLAUDE.md`
- **Expected verification:** add Development and Verification application-error log cases that parse
  the complete emitted failure record and prove exact closed fields, no envelope/additional/free-form
  fields, and the correct derived `daily`/`verification` scopes; retain exact and encoded sentinel
  nondisclosure; rerun focused HTTP/server and diagnostic suites plus syntax, type, and diff checks;
  confirm no regression to ordinary request logging and no T039+ or unrelated changes
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

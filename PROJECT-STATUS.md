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
- **Status:** T043 ACCEPTED — PRODUCT OWNER HUMAN GATE COMPLETE

## Active Feature Mirror

- **Runtime resolution after `specify`:** `SPECIFY_FEATURE_DIRECTORY` override when set; otherwise `.specify/feature.json`
- **Resolved from:** explicit `SPECIFY_FEATURE_DIRECTORY=specs/001-application-foundation` override;
  `.specify/feature.json` is absent
- **Feature directory:** `specs/001-application-foundation`
- **Verified:** YES — matches the planned Delivery and Delivery Context

## Workflow Gate

- **Current phase:** IMPLEMENTATION / REVIEW LOOP
- **Current review result:** PASS — HUMAN ACCEPTED
- **Phase status:** T043 ACCEPTED; T044+ UNAUTHORIZED
- **Previous completed scope:** T043 — failing Verification lifecycle and reporting contract tests
- **Next valid action:** NONE selected or authorized — stop after T043 Human acceptance; T044+
  remain unauthorized
- **Blocking issues:** None for the reconciled T043 review
- **T043 Product Owner acceptance:** Human Gate accepted reconciled artifact
  `a39e84b3dbbfad7fe4df74ac6477e6454d162818` and fresh independent PASS governance record
  `91ccfdd3c783ce6ca4b3f696d31cb3f5a0e60701`. The accepted PASS history preserves corrective
  implementation `e4b2b75b9e7ed9a74e7492266c8046a2f6c5c6de`, reviewed implementation
  `3bbb8f9bb562c16800583cd3cf83e01abc16192e`, T043 authorization
  `0be1ec3537d3ec70f3c25731ba57020ce29d9d87`, and REWORK governance
  `5cc7d8ab1e34ad7835f4a264e0bff9a1f192ef3b`. Invalid pre-reconciliation PASS
  `6a6b1794acdf992b7d57a957a7daa1dd3bf6be81` is excluded from accepted ancestry. Authorized
  Implementation remains `NONE`; T044+ remain unauthorized.
- **T043 reconciliation evidence:** Human-authorized non-rewriting merge
  `a39e84b3dbbfad7fe4df74ac6477e6454d162818` has exact corrective implementation
  `e4b2b75b9e7ed9a74e7492266c8046a2f6c5c6de` as first parent and persisted REWORK governance
  `5cc7d8ab1e34ad7835f4a264e0bff9a1f192ef3b` as second parent. Therefore T043 authorization
  `0be1ec3537d3ec70f3c25731ba57020ce29d9d87`, reviewed implementation
  `3bbb8f9bb562c16800583cd3cf83e01abc16192e`, and both parent tips are ancestors. Invalid PASS
  `6a6b1794acdf992b7d57a957a7daa1dd3bf6be81` is not an ancestor. The reconciled
  `tests/verification/lifecycle-recovery.test.ts` blob
  `d0cdbea0ca32e7d7fd80689bd078d6c7e6a88536` is byte-identical to the corrective tip; the merge
  changes only `PROJECT-STATUS.md` relative to that corrective tree.
- **T043 reconciled final review evidence:** Independent review of exact merge
  `a39e84b3dbbfad7fe4df74ac6477e6454d162818` confirms T043-B01–T043-B03 remain closed: fallback
  stderr is exactly one closed unit; cleanup primary/secondary precedence uses full diagnostic
  equality; and the complete first SafeDiagnostic is deep-compared across every later journal
  record with an explicit no-drop assertion. The T043 lifecycle suite reproduces 55 passing and 23
  intended-red cases, all failures solely at the absent `verifyProductionLike` export. Focused
  operation regressions pass 146/146. Accepted T041/T042 suites retain exactly 17/16 intended-red
  failures with 48 passing cases. TypeScript reports only the accepted T040 missing
  `apps/web/server.js` boundary. Ancestry, corrective blob, scope, and whitespace checks are clean.
  T043-B01–T043-B03 remain closed; T044+ remain unauthorized.
- **T043 review evidence:** Exact implementation `3bbb8f9bb562c16800583cd3cf83e01abc16192e`
  has canonical T042 acceptance `f984111d47554679a104c9c67c7e8758c7f1d37f` as its sole parent and a
  clean one-file diff limited to `tests/verification/lifecycle-recovery.test.ts`. Independent
  execution reproduces 23 deterministic intended-red T043 failures solely at the absent
  `verifyProductionLike` export and 55 passing accepted/T043 cases; focused operation regressions
  pass 146/146; TypeScript reports only the accepted T040 missing `apps/web/server.js` boundary.
  Static assertion review identifies three bounded contract gaps:
  - **T043-B01:** the atomic-write fallback case reads only `stderr.at(-1)` and never asserts that
    stderr contains exactly one emitted unit, so duplicate diagnostics can pass the promised
    exactly-one closed SafeDiagnostic contract.
  - **T043-B02:** cleanup/reporting precedence cases accept any truthy or merely non-reporting
    primary failure instead of proving the primary equals the cleanup result's exact diagnostic;
    the main-plus-cleanup case likewise checks only a secondary diagnostic's scope rather than the
    exact cleanup diagnostic, allowing an unrelated secondary failure to satisfy the test.
  - **T043-B03:** the journal immutability case compares only `reasonCode`; later records may mutate
    or drop other SafeDiagnostic fields while still passing, contrary to the required verbatim
    immutable primary failure.
- **T043 authorization:** Add failing Verification lifecycle/reporting contract tests only in
  `tests/verification/lifecycle-recovery.test.ts`. Cover exact current-run cleanup after success or
  failure; refusal of stale, colliding, ambiguous, mislabeled, or unexpectedly active/attached
  pre-existing Verification resources; Verification-appropriate `retry`, `cleanup`, and
  `manual-review` decisions; interrupted cleanup and unclosed-running-journal handling; atomic final
  report emission only after cleanup and complete schema/nondisclosure validation; immutable first
  failure with cleanup/reporting failures appended as secondary, while cleanup/reporting becomes
  primary only when every earlier result passed. Required authority:
  `.specify/memory/constitution.md`, `specs/001-application-foundation/spec.md` FR-017 and SC-003,
  `specs/001-application-foundation/plan.md` §§Operations and verification,
  `specs/001-application-foundation/data-model.md` §§Lifecycle Operation, Recovery Assessment, and
  Verification Run, `specs/001-application-foundation/contracts/foundation-operations.md`
  §§Operation-target ownership and isolation, Verification result contract, and Failure behavior,
  `specs/001-application-foundation/quickstart.md` §6, and
  `specs/001-application-foundation/tasks.md` T043. Scope is test authoring only and excludes T044+,
  production changes, implementation in `scripts/foundation-operations.mjs`, release builds,
  Containerfile, Compose/Nginx/application changes, new dependencies, Product behavior,
  requirement/architecture changes, and weakening accepted US1 or T040–T042 contracts.
  Verification must prove the focused T043 tests are deterministic and fail for the intended absent
  Verification cleanup/reporting behavior rather than fixture/import/setup errors; run applicable
  existing lifecycle/recovery and operation-target regressions plus syntax/type checks meaningful
  for an intentionally red test task; confirm the diff is limited to the authorized test file; scan
  exercised diagnostic/report surfaces for protected sentinel disclosure; and report exact
  commands, expected-red versus passing results, changed files, and implementation SHA.
- **T042 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `af52c80bca5ca3ba357f0ad4042601662b66701e` and independent PASS governance record
  `65cb946e8365e06b2b55799b4727f9afe6a56913`. The accepted PASS history descends linearly from
  canonical T041 acceptance, so no reconciliation merge is required. Authorized Implementation
  remains `NONE`; T043+ remain unauthorized.
- **T042 final review evidence:** Corrective implementation
  `af52c80bca5ca3ba357f0ad4042601662b66701e` has persisted REWORK authorization
  `ff0f77fcc03c83277c62805730960eb3846ca10c` as its sole parent and reviewed implementation
  `c26a5f7523ef240cd3f14b09e1af40b0629fed2b` as grandparent. The corrective diff is limited to
  `tests/verification/diagnostic-surfaces.test.ts` and closes T042-B01 by requiring each of stdout,
  stderr, application log, and HTTP failure to be non-empty and every emitted unit to be an exact
  closed `verification` SafeDiagnostic carrying `ISOLATION_FAILED`. Developer mutation evidence
  proves omission of either application-log or HTTP-failure emission, and wrong-code application-log
  emission, fail only the corrected assertions. Independent focused execution reproduces 16
  intended-red T042 failures solely at the absent `verifyProductionLike` export while all 24
  accepted T023 cases pass. The full verification selection is 151 passed with only the 16 T042 and
  17 accepted T041 intended-red failures; Public/Admin/diagnostic regressions pass 20/20; TypeScript
  reports only the accepted T040 missing `apps/web/server.js` boundary. Ancestry, diff, whitespace,
  scope, and nondisclosure inspection are clean; no T043+, production, dependency, Product,
  requirement, or architecture change is present.
- **T042 authorization:** Add failing Production-like Verification HTTP boundary contract tests
  only in `tests/verification/diagnostic-surfaces.test.ts`. The tests must cover Verification
  exposure through Nginx only, internal application/database direct-port isolation, trusted
  single-hop forwarded headers with spoofed or untrusted metadata rejected, Public `/` SSR HTML,
  Admin `/admin/`, and server liveness/readiness route reachability, with failures represented by
  the closed safe-diagnostic contract. Required authority: `.specify/memory/constitution.md`,
  `specs/001-application-foundation/spec.md` FR-009–FR-011 and SC-003–SC-004,
  `specs/001-application-foundation/plan.md` §§Runtime composition and Operations and verification,
  `specs/001-application-foundation/research.md` Decisions 6 and 8,
  `specs/001-application-foundation/contracts/foundation-operations.md` §§Safe diagnostic contract
  and Operation-target ownership and isolation, and `specs/001-application-foundation/tasks.md`
  T042. Scope is test authoring only and excludes T043+, production changes, release builds,
  Containerfile, Compose/Nginx/application implementation, new dependencies, Product behavior,
  requirement/architecture changes, and weakening accepted US1, T040, or T041 contracts.
  Verification must prove the focused T042 tests are deterministic and fail for intended absent
  Verification topology/proxy/route behavior rather than fixture/import/setup errors; run
  applicable existing diagnostic-surface and HTTP regressions plus syntax/type checks meaningful
  for an intentionally red test task; confirm the diff is limited to the authorized test file;
  scan the exercised failure surfaces for protected sentinel disclosure; and report exact commands,
  expected-red versus passing results, changed files, and implementation SHA.
- **T041 Product Owner acceptance:** Human Gate accepted reconciled artifact
  `d29a6d356e1f5c557ca4396cbf87b7aee0176361` and fresh independent PASS governance record
  `d6ce73ce3b140ef101fa73ea21b8c01e9894f49e`. The reconciliation merge retains exact corrective
  tip `d4a43d59bbec550f27b77231ca746c25d5d70278` as first parent and reviewed implementation
  `8deb60238eea75944b017948ee65f8a1d2eff91f` as second parent while preserving the corrective tree
  exactly. Authorized Implementation remains `NONE`; T042+ remain unauthorized.
- **T041 reconciliation evidence:** Human-authorized non-rewriting reconciliation merge
  `d29a6d356e1f5c557ca4396cbf87b7aee0176361` has first parent exact corrective tip
  `d4a43d59bbec550f27b77231ca746c25d5d70278` and second parent reviewed implementation
  `8deb60238eea75944b017948ee65f8a1d2eff91f`, whose exact common base is persisted T041
  authorization `b4e9f0002ce25e6578369181adea6a4ba5c61e8b`. The merge tree
  `dc3acaa232577fff42dd930bb1010d0465637f2c` is byte-identical to the corrective tip tree;
  `tests/verification/foundation-operation-target.test.ts` has identical blob
  `f388d94c9a917e0303eebfd7f554a678663e6adf`. Invalid pre-reconciliation PASS record
  `edf556cab8e0b4c5bc658196474722f254062848` is not an ancestor of the reconciliation merge.
- **T041 final review evidence:** The exact reconciled artifact preserves the reviewed T041 suite
  plus the bounded SC-003 correction without implementation/test replay or content modification.
  Independent focused execution reproduces 17 intended-red failures solely at the absent
  `verifyProductionLike` export while all 24 accepted T022 cases pass. TypeScript reports only the
  accepted T040 missing `apps/web/server.js` boundary. T041-B01 is closed by the deterministic
  600,000 ms completed-run ceiling; developer mutation evidence shows an otherwise conforming
  668,300 ms run fails only that bound case. Diff, whitespace, scope, tree, blob, and ancestry
  checks are clean; no T042+, production implementation, dependency, requirement, or architecture
  change is present.
- **T041 review evidence:** Reviewed implementation `8deb60238eea75944b017948ee65f8a1d2eff91f`
  has persisted authorization `b4e9f0002ce25e6578369181adea6a4ba5c61e8b` as its sole parent and
  accepted T040 canonical base `962ebb8c6876809c71c0eb0c6dc73c84d2fec42f` in linear ancestry. The
  diff is limited to `tests/verification/foundation-operation-target.test.ts` (+903/-1), with clean
  whitespace and no T042+ or production implementation. Independent focused execution reproduces
  16 intended-red T041 failures at the missing `verifyProductionLike` export while all 24 accepted
  T022 cases pass; TypeScript reports only the accepted T040 missing `apps/web/server.js` boundary.
- **T041 authorization:** Add failing Production-like Verification operation-target contract tests
  only in `tests/verification/foundation-operation-target.test.ts`. The tests must cover the exact
  ordered twenty-result inventory, explicit `PREREQUISITE_FAILED` downstream failures, immutable
  first-failure selection including cleanup/reporting precedence, per-result and whole-run timing,
  the fixed non-parity statement, and Development/Verification independence. Required authority:
  `.specify/memory/constitution.md`, `specs/001-application-foundation/spec.md` FR-009–FR-011 and
  SC-003, `specs/001-application-foundation/plan.md` §Operations and verification,
  `specs/001-application-foundation/data-model.md` §Verification Run,
  `specs/001-application-foundation/contracts/foundation-operations.md` §Verification result
  contract, `specs/001-application-foundation/quickstart.md` §6, and
  `specs/001-application-foundation/tasks.md` T041. Scope is test authoring only and excludes T042+,
  implementation changes in `scripts/foundation-operations.mjs`, release builds, manifests,
  Containerfile, Nginx/proxy or route implementation, new dependencies, Product behavior,
  requirement/architecture changes, and weakening accepted US1 or T040 contracts. Verification
  must prove the focused T041 tests are deterministic and fail for intended missing Verification
  orchestration behavior rather than fixture/import/setup errors; run applicable existing
  operation-target regressions plus syntax/type checks meaningful for an intentionally red test
  task; confirm the diff is limited to the authorized test file; and report exact commands,
  expected-red versus passing results, changed files, and implementation SHA.
- **T040 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `f3d56290745269badab9741127e016f8f5fbbd5e` and independent PASS governance record
  `5cb05943c789eae5f9729c934409c2d28ad1090d`. The accepted PASS history descends linearly from
  canonical T039 acceptance, so no reconciliation merge is required. Authorized Implementation
  remains `NONE`; T041+ remain unauthorized.
- **T040 final review evidence:** Exact corrective tip
  `f3d56290745269badab9741127e016f8f5fbbd5e` has persisted REWORK authorization commit
  `a5cd37a47eb47b1ae091c7d700af91aa3c6488cf` as its sole parent, reviewed implementation
  `ed23c631dfc2b691b116dd6f9e80285ada3cd193` as grandparent, and accepted T039 canonical base in
  its linear ancestry. The corrective diff is limited to `apps/web/server.test.ts` and closes
  T040-B01 by emitting two literal HTTP/1.1 request-header field lines over a raw socket before
  asserting ordered preservation, and T040-B02 by requiring exactly one closed application
  diagnostic. Independent focused execution is expected-red only at the absent `./server.js`
  module; existing Public route regressions pass 9/9; TypeScript reports only that same expected
  missing module; diff, conflict-marker, and skip/focus hygiene are clean. Developer mutation
  evidence confirms the two corrected assertions reject last-value-only header handling and
  duplicate diagnostic emission. No T041+, production implementation, dependency, or Product
  change is present.
- **T040 authorization:** Write the failing Fastify-to-React-Router adapter contract tests in
  `apps/web/server.test.ts` for GET and HEAD behavior, streaming, redirects, errors, aborts,
  repeated headers, and response/security-header/logging ownership at the explicit handoff.
  Required authority: `.specify/memory/constitution.md`,
  `specs/001-application-foundation/spec.md` FR-009–FR-010 and SC-003,
  `specs/001-application-foundation/plan.md` §Runtime composition,
  `specs/001-application-foundation/tasks.md` T040, and the accepted T039 canonical base
  `d1dea34f12ef88ba22511396dce1a8c30339ff7c`. Scope is test authoring only and excludes T041+,
  implementation in `apps/web/server.ts`, build/Verification orchestration, proxy/Nginx/image or
  manifest work, new dependencies, Product behavior, requirement/architecture changes, and
  weakening accepted US1 contracts. Verification must prove the new focused tests are
  deterministic and fail for the intended missing adapter behavior (not fixture/import/setup
  errors), run applicable existing `apps/web` tests plus syntax/type checks that remain meaningful
  for an intentionally red test task, confirm the diff is limited to the authorized test file, and
  report exact commands, expected-red versus passing results, changed files, and implementation SHA.
- **T039 Product Owner acceptance:** Human Gate accepted implementation tip
  `b4334f60293aa7d2f21c64d62e27282367b4a250` and independent PASS governance record
  `d39fde9b5d6c8d87d7ed5aa99b6cb065c850d56a`. The accepted PASS history descends linearly from
  canonical T038 acceptance, so no reconciliation merge is required. Authorized Implementation
  remains `NONE`; T040+ remain unauthorized.
- **T039 review evidence:** Exact implementation tip
  `b4334f60293aa7d2f21c64d62e27282367b4a250` has persisted authorization commit
  `29aac6d2db4e9d6c1888d4b3ac714035a54a7f0c` as its sole parent and canonical accepted T038 base
  `ea37487d2339527aff099df7a72c8170b506148d` as grandparent. Its clean diff is limited to
  `scripts/foundation-operations.mjs`, `tests/verification/foundation-command-adapters.test.ts`,
  and `tests/verification/lifecycle-recovery.test.ts`, with no T040+ or Product behavior. The
  lowercase Podman network-name field is accepted without allowing absent/malformed names to prove
  ownership; the canonical Development fixture and immutable interrupted-origin assertion restore
  their intended accepted contracts. Independent syntax and TypeScript checks pass; the changed
  focused suites pass 72/72 and the full selected US1/configuration/HTTP/diagnostic/operation suite
  passes 351/351. Developer-reproduced explicit real-MySQL migration verification passes 38/38;
  reviewer reproduction is unavailable because this checkout has no explicit real-engine local
  environment source. The complete Compose-backed Development happy path, persistence proof,
  current-state migration path, recover/reset outcomes, timer, and consecutive-run evidence remain
  unavailable because the runtime lacks a systemd user session required by rootless netavark DNS;
  per the external real-engine policy this is a non-blocking verification-environment limitation,
  not an implementation defect. Node 24.11.0 satisfies the Node pin, while reviewer npm 11.6.1 is
  below the npm 12 pin; locked installation succeeds with the expected engine warning.
- **T039 authorization:** Execute the complete independent User Story 1 acceptance sequence in
  `specs/001-application-foundation/quickstart.md` §§1–5 and correct only failures traceable to the
  accepted US1 scope. Required authority: `.specify/memory/constitution.md`,
  `specs/001-application-foundation/spec.md` SC-001–SC-002, SC-004–SC-005, and SC-007,
  `specs/001-application-foundation/plan.md`,
  `specs/001-application-foundation/data-model.md`,
  `specs/001-application-foundation/contracts/foundation-operations.md`,
  `specs/001-application-foundation/quickstart.md` §§1–5, and
  `specs/001-application-foundation/tasks.md` T039. Scope excludes T040+, User Story 2 or 3,
  Verification-profile implementation, proxy/Nginx or release-image work, new dependencies,
  requirement/architecture changes, and weakening accepted configuration, ownership, lifecycle,
  recovery, isolation, migration, diagnostic, or nondisclosure contracts. Verification must run the
  complete §§1–5 sequence where the explicit local environment permits; classify unavailable
  real-engine/tooling evidence rather than substituting mocks; run the relevant focused and
  regression suites, syntax, type, and diff checks; prove no Product behavior or T040+ work; and
  report exact commands, results, unavailable evidence, changed files, and implementation tip.
- **T038 Product Owner acceptance:** Human Gate accepted corrective implementation tip
  `cb30554a51380676c9fa2c1bbe51f595e621098a` and independent PASS governance record
  `402295dbc513a91464c8b798ca3be42074711845`; T038-B01 and T038-B02 are accepted as closed. The
  accepted PASS history descends linearly from canonical T037 acceptance, so no reconciliation
  merge is required. Authorized Implementation remains `NONE`; T039+ remain unauthorized.
- **T038 final review evidence:** Exact corrective tip
  `cb30554a51380676c9fa2c1bbe51f595e621098a` has persisted REWORK authorization
  `ac50d02932c1d71e92b39cc98273d5faae8a09bc` as its sole parent; its corrective diff is limited to
  `apps/server/src/http.ts`, `apps/server/src/bootstrap.ts`, and
  `apps/server/src/bootstrap.test.ts`, with no T039+ implementation. T038-B01 is closed: the
  application-error diagnostic receives the validated composition's derived `daily` or
  `verification` scope, never the cross-target `foundation` scope. T038-B02 is closed: the bound
  destination recognizes the module-owned closed error diagnostic and emits it as the complete
  four-field application-log failure record with no Pino envelope, nested `err`, or free-form
  message, while ordinary request/response records pass through unchanged. Development and
  Verification whole-record tests cover both Fastify/Pino error call shapes, exact field sets,
  derived scope, and exact/encoded sentinel nondisclosure. Independent syntax and TypeScript checks
  pass; focused server/configuration/operations/diagnostic verification passes 210/210. Diff and
  ancestry checks are clean. The previously established retry-fixture failure and unavailable
  explicit real-engine environment remain non-blocking and untouched by this corrective scope.
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

- **Task / Scope:** NONE — T043 Human Gate accepted; T044+ remain unauthorized
- **Runtime:** NONE
- **Required references:** NONE
- **Expected verification:** NONE — see T043 reconciliation and reconciled final review evidence
  above
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

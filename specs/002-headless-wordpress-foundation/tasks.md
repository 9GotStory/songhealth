---

description: "Dependency-ordered implementation tasks for Delivery 002"
---

# Tasks: Headless WordPress Foundation & Public Contract

**Input**: Persisted design documents in `specs/002-headless-wordpress-foundation/` plus the routed Delivery 002 Product/Frozen authority and reconciliation records.

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, and `.specify/memory/constitution.md` are complete and independently reviewed.

**Tests**: Focused verification is required by FR-024, FR-025, and SC-001–SC-011. Test tasks below prove Songhealth-owned behavior and failure boundaries; they do not test WordPress Core internals for their own sake or impose universal TDD.

**Organization**: Shared blockers are in Setup and Foundational. Each later phase maps exactly to one Product user story and becomes independently testable after Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: May run in parallel only after its phase prerequisites are complete and when it does not overlap an incomplete task's files.
- **[Story]**: Maps a task to US1, US2, US3, or US4; Setup, Foundational, and Final tasks have no story label.
- Every task names its exact repository-relative target path.

## Phase 1: Setup

**Purpose**: Establish the smallest reproducible WordPress/PHP and frontend verification baseline without creating a Production Docker/VPS baseline or reviving Delivery 001 runtimes.

- [x] T001 Create the clean local WordPress development and verification dependency baseline, pinning only implementation-time supported test tooling and documenting that Production versions remain evidence-gated, in `wordpress/composer.json`
- [x] T002 Configure the WordPress plugin unit/integration suites and bootstrap paths without loading legacy themes or plugins in `wordpress/phpunit.xml.dist` and `wordpress/tests/bootstrap.php`
- [x] T003 [P] Configure the native public-surface containment suite bootstrap for a clean WordPress installation in `wordpress/tests/containment/bootstrap.php`
- [x] T004 [P] Configure frontend unit, contract, and browser test projects for the selectively reused React application in `apps/web/vite.config.ts` and `apps/web/playwright.config.ts`
- [x] T005 Create the first-party plugin entry point with activation/deactivation safety, module loading, and no Product behavior outside `songhealth-core` in `wordpress/wp-content/plugins/songhealth-core/songhealth-core.php`

**Checkpoint**: A clean testable WordPress/plugin baseline and the existing React test baseline can be initialized without treating any local profile as proven Production topology.

---

## Phase 2: Foundational

**Purpose**: Implement the shared identity, policy, registration, configuration, REST, and containment primitives that block every user story.

**Critical gate**: No user-story implementation begins until T006–T019 are complete.

- [x] T006 Define an allowlisted, environment-separated server configuration schema that fails closed for missing or unsafe protected-work settings and never exposes secret values in `wordpress/wp-content/plugins/songhealth-core/src/Diagnostics/Configuration.php`
- [x] T007 Register only the distinct Basic Page and Document Resource foundation custom post types with Songhealth labels, `publicly_queryable=false`, no native rewrites/archives/feeds, and explicit metadata schemas in `wordpress/wp-content/plugins/songhealth-core/src/Content/FoundationTypes.php`
- [x] T008 Define least-privilege Songhealth capabilities and map the accepted Viewer, Editor, Publisher, and Administrator roles without creating a second identity store or arbitrary per-user role union in `wordpress/wp-content/plugins/songhealth-core/src/Authorization/CapabilityMap.php`
- [x] T009 Add default-deny current actor/action/scope/object/field/lifecycle/relationship authorization primitives, including no self-escalation and last-Administrator protection, in `wordpress/wp-content/plugins/songhealth-core/src/Authorization/AuthorizationService.php`
- [x] T010 Create the Public ID registry schema with unique `public_id`, unique `(resource_type, internal_post_id)`, and retained tombstone mappings in `wordpress/wp-content/plugins/songhealth-core/src/Identity/RegistrySchema.php`
- [x] T011 Implement UUIDv7 generation, syntax validation, lookup, collision-safe insertion, and non-reassignment in `wordpress/wp-content/plugins/songhealth-core/src/Identity/PublicIdRegistry.php`
- [x] T012 Own the plugin-owned Songhealth supported-resource creation service for Basic Page and Document Resource: accepted creation — including Draft — succeeds only after immutable Public ID establishment and one-to-one mapping verification, every actual issuance failure returns service failure, a verified safe bounded transaction is preferred and otherwise fail-return plus verified compensation is used with any uncompensated identityless row left a quarantined internal candidate that never qualifies as a Songhealth resource, Core insertion callbacks carry no success meaning, and updates/callers cannot select or mutate identity in `wordpress/wp-content/plugins/songhealth-core/src/Identity/CreateTimePublicId.php`
- [x] T013 Define the shared current public-eligibility decision for supported type, valid identity, lifecycle, visibility, withdrawal, and type-specific validity in `wordpress/wp-content/plugins/songhealth-core/src/Eligibility/PublicEligibility.php`
- [x] T014 Define neutral public denial and bounded invalid-input/unexpected-failure responses that reveal no existence, lifecycle, path, query, user, credential, or protected content in `wordpress/wp-content/plugins/songhealth-core/src/Rest/NeutralResponse.php`
- [x] T015 [P] Implement explicit Basic Page and Document Resource public projectors that omit WordPress IDs/status/meta/users/raw media data and filter references by their own current eligibility in `wordpress/wp-content/plugins/songhealth-core/src/Rest/PublicProjector.php`
- [x] T016 Register only the `songhealth/v1` resource-detail, bounded-listing, Preview, and Document Resource binary route shapes with explicit validation and permission callbacks; allowlist listing type, bounded `perPage`, deterministic order, and optional opaque cursor only; and register no Songhealth search route, in `wordpress/wp-content/plugins/songhealth-core/src/Rest/Routes.php`
- [x] T017 Implement eligibility-first bounded resource queries using deterministic Public-ID keyset candidate windows, a hard server-controlled candidate-scan/evaluation bound, and confidential integrity-protected versioned/expiring continuation bound to type/order; keep `PublicEligibility` as the sole live record authority for every returned item; return `data`, `hasMore`, and optional `nextCursor` without exact totals/page counts or deep OFFSET; preserve empty-page continuation when an all-ineligible scan budget ends with candidates remaining; and fail closed for malformed/expired/mismatched/tampered cursors in `wordpress/wp-content/plugins/songhealth-core/src/Rest/EligibleResourceQuery.php`
- [x] T018 Establish native anonymous REST, metadata, search, feed, sitemap, archive, oEmbed, attachment/media, and direct-route containment hooks without disabling authenticated editor REST in `wordpress/wp-content/plugins/songhealth-core/src/Rest/NativeSurfaceContainment.php`
- [x] T019 Wire configuration, types, capabilities, identity, eligibility, REST routes, and containment modules into the plugin lifecycle, registering the supported-resource creation service as the only accepted creation boundary for the two supported types with direct-create containment limited to supported-type creation so ordinary update/autosave/revision behavior is preserved, in `wordpress/wp-content/plugins/songhealth-core/src/Plugin.php`

**Checkpoint**: The shared foundation is complete. US1–US4 may now be implemented in parallel by separate owners, but each story's internal test-before-implementation order still applies.

---

## Phase 3: User Story 1 — Consume a Safe Public Contract (P1 / MVP)

**Goal**: Deliver eligible-only Basic Page detail and bounded listing through explicit Songhealth DTOs and canonical React routes, while containing native WordPress surfaces and exposing no Songhealth public search.

**Independent Test**: Create and publish an eligible Basic Page, verify detail/list/React output contains only allowlisted fields, change its title/slug and confirm its Public ID remains authoritative with direct canonical normalization, then verify unknown and all ineligible states are neutral and absent from native anonymous surfaces and continuation output.

### Required verification for User Story 1

- [x] T020 [P] [US1] Write Public ID unit tests for Draft-time issuance, uniqueness, immutability, collision failure, tombstone non-reuse, title/slug/lifecycle changes, and creation-service acceptance semantics (success only after mapping verification, service failure on every actual issuance failure, quarantined identityless internal candidates never qualifying, and updates leaving identity unchanged) in `wordpress/wp-content/plugins/songhealth-core/tests/unit/PublicIdRegistryTest.php`
- [x] T021 [P] [US1] Write public REST contract tests for Basic Page detail allowlists, neutral unknown/ineligible behavior, bounded listing validation, deterministic keyset progress, hard candidate/evaluation bounds, authoritative eligibility of every returned item, empty all-ineligible continuation windows, cursor confidentiality/integrity/type/order/version/expiry and fail-closed rejection, absence of exact totals/page counts, and absence of search parameters/routes in `wordpress/wp-content/plugins/songhealth-core/tests/integration/PublicRestContractTest.php`
- [x] T022 [P] [US1] Write the anonymous native-surface containment matrix covering REST, single, archive, search, feed, sitemap, taxonomy, author, date, oEmbed, attachment/media, and canonical competition in `wordpress/tests/containment/PublicSurfaceContainmentTest.php`
- [x] T023 [P] [US1] Write frontend contract tests that reject raw WordPress fields/URLs and listing totals/page counts, and accept only the Songhealth detail DTO plus bounded list `data`/`hasMore`/optional-`nextCursor` contract in `apps/web/tests/contract/songhealth-public-contract.test.ts`
- [x] T024 [P] [US1] Write browser tests for Public-ID resolution, missing/outdated/current slug canonicalization, neutral ineligible behavior, and the absence of a public `/pages` hub or Songhealth search route in `apps/web/tests/e2e/public-foundation.spec.ts`

### Implementation for User Story 1

- [x] T025 [US1] Implement eligible-only resource detail and bounded opaque-continuation listing controllers using the shared query, projector, and neutral-response primitives, returning `data`/`hasMore`/optional-`nextCursor` without totals/page counts, in `wordpress/wp-content/plugins/songhealth-core/src/Rest/PublicResourcesController.php`
- [x] T026 [P] [US1] Implement the typed React Songhealth REST client with bounded detail DTO decoding and list `data`/`hasMore`/optional-`nextCursor` decoding, with no totals/page counts, raw WordPress, or Delivery 001 backend fallback, in `apps/web/app/services/songhealth-public.ts`
- [x] T027 [US1] Implement shared Basic Page public presentation using controlled body output and eligible references in `apps/web/app/components/BasicPage.tsx`
- [x] T028 [US1] Implement `/pages/{publicId}/{slug?}` resolution by Public ID with eligibility-first direct canonical redirects and neutral not-found behavior in `apps/web/app/routes/pages.$publicId.$slug.tsx`
- [x] T029 [US1] Record the US1 contract, canonical-route, bounded-continuation/listing-leakage, and containment results against Quickstart sections 2–4 in `tests/successor/evidence/us1-public-contract.md`

**Checkpoint — MVP STOP/VALIDATE**: Setup + Foundational + US1 is the Delivery 002 MVP. Stop and validate US1 independently before authorizing US2, US3, or US4 implementation.

---

## Phase 4: User Story 2 — Manage the Foundation Within Frozen Boundaries (P2)

**Goal**: Provide bounded Songhealth-language `wp-admin` behavior and authenticated, currently authorized React Preview without a custom Admin SPA, second identity store, public cache/search leakage, or privileged frontend secret.

**Independent Test**: Exercise Basic Page and Document Resource creation/edit/Preview with authorized, unauthorized, revoked, demoted, expired, wrong-scope, and direct-URL actors; verify Draft creation receives an immutable Public ID, privileged actions default-deny server-side, and Preview is read-only, `private, no-store`, `noindex`, and absent from anonymous/cache/search surfaces.

### Required verification for User Story 2

- [x] T030 [P] [US2] Write authorization integration tests for role/capability/object/scope/field/lifecycle/relationship checks, nonce-not-authorization, self-escalation denial, last-Administrator protection, and next-request revocation in `wordpress/wp-content/plugins/songhealth-core/tests/integration/AuthorizationBoundaryTest.php`
- [x] T031 [P] [US2] Write Preview contract tests for grant signature, expiry, purpose/audience/resource/revision/user binding, active session, fresh authorization, neutral denial, safe projection, and required confidentiality headers in `wordpress/wp-content/plugins/songhealth-core/tests/integration/PreviewContractTest.php`
- [x] T032 [P] [US2] Write browser tests for Songhealth-labelled admin entry points and authenticated React Preview isolation across logout, disablement, demotion, expiry, direct URL, cache, crawler, and public-route attempts in `apps/web/tests/e2e/staff-preview.spec.ts`

### Implementation for User Story 2

- [x] T033 [US2] Configure bounded Basic Page and Document Resource `wp-admin` menus, labels, fields, Public ID display, validation messages, and capability-aware actions using Songhealth domain language, with creation routed through the Songhealth supported-resource creation service so only accepted, identified records enter the admin workflow, in `wordpress/wp-content/plugins/songhealth-core/src/Content/AdminExperience.php`
- [x] T034 [US2] Implement short-lived single-purpose signed opaque Preview grants containing no content or credentials and bound to user/resource/revision/audience in `wordpress/wp-content/plugins/songhealth-core/src/Preview/PreviewGrant.php`
- [x] T035 [US2] Implement Preview initiation and retrieval with current WordPress session plus fresh authorization on every request, CSRF nonce/origin defense, explicit candidate projection, neutral denial, and private/no-store/noindex headers in `wordpress/wp-content/plugins/songhealth-core/src/Preview/PreviewController.php`
- [x] T036 [P] [US2] Implement a Preview-only React client that sends no administrator credential, avoids shared/service-worker persistence, and accepts only the bounded candidate DTO in `apps/web/app/services/songhealth-preview.ts`
- [x] T037 [US2] Implement the authenticated read-only Preview route with visible non-public labeling and no lifecycle actions, canonical links, analytics capture, or crawler exposure in `apps/web/app/routes/preview.$resourceType.$publicId.tsx`
- [x] T038 [US2] Record the US2 authorization, domain-admin, Draft identity, and Preview confidentiality results against Quickstart sections 5 and 7 in `tests/successor/evidence/us2-admin-preview.md`

**Checkpoint**: After Foundational, US2 is independently testable without requiring US3 or US4; it may reuse the shared React renderer established by US1.

---

## Phase 5: User Story 3 — Preserve Protected Binary Eligibility (P2)

**Goal**: Mediate Document Resource binary delivery so anonymous access depends on that Document Resource's own current eligibility on every request, references never elevate it, and Preview binary access remains separate and authenticated.

**Independent Test**: Keep every known raw and mediated URL while a Document Resource moves from Draft to eligible to ineligible, including while referenced by a public Basic Page, and verify anonymous bytes are delivered only during the eligible state with neutral denial before publication and immediately after revocation.

### Required verification for User Story 3

- [ ] T039 [P] [US3] Write protected-binary integration tests for unknown IDs, Draft/Hidden/unpublished/withdrawn states, eligible delivery, publish/revoke transitions, non-elevating public references, broken relationships, unsafe metadata/type, ranges, and neutral failures in `wordpress/wp-content/plugins/songhealth-core/tests/integration/ProtectedBinaryContractTest.php`
- [ ] T040 [P] [US3] Write containment tests proving raw upload, attachment, alternate/encoded path, host variant, redirect, cache, and prior-success URLs cannot bypass mediated current eligibility in `wordpress/tests/containment/ProtectedBinaryBypassTest.php`
- [ ] T041 [P] [US3] Write browser tests for stable Document Resource routes, anonymous download/revocation, public-parent non-elevation, and separate authenticated Preview binary access in `apps/web/tests/e2e/protected-document.spec.ts`

### Implementation for User Story 3

- [ ] T042 [US3] Implement the one-to-one protected attachment relationship, safe metadata validation, and publication validity checks owned by Document Resource in `wordpress/wp-content/plugins/songhealth-core/src/Binary/ProtectedAttachment.php`
- [ ] T043 [US3] Implement anonymous binary delivery by Public ID with fresh owning-Document eligibility, safe streaming headers/disposition/type, bounded range/size and abuse behavior, conservative caching, and neutral denial in `wordpress/wp-content/plugins/songhealth-core/src/Binary/BinaryController.php`
- [ ] T044 [US3] Implement separate session-bound Preview binary delivery that reuses current Preview authorization without changing anonymous eligibility in `wordpress/wp-content/plugins/songhealth-core/src/Binary/PreviewBinaryController.php`
- [ ] T045 [US3] Implement Document Resource public presentation using only its canonical Songhealth download path and never a Media Library URL, attachment ID, path, or filename identity in `apps/web/app/components/DocumentResource.tsx`
- [ ] T046 [US3] Implement `/documents/{publicId}/{slug?}` resolution and download interaction with Public-ID identity and eligibility-first canonical behavior in `apps/web/app/routes/documents.$publicId.$slug.tsx`
- [ ] T047 [US3] Record the US3 publish/revoke, reference non-elevation, known-URL, range, containment, and Preview-binary results against Quickstart section 6 in `tests/successor/evidence/us3-protected-binary.md`

**Checkpoint**: After Foundational, US3 is independently testable with a Document Resource and protected attachment; actual Production storage realization remains gated by US4 account evidence.

---

## Phase 6: User Story 4 — Verify a Sustainable Successor Foundation (P3)

**Goal**: Produce safe operational, security, dependency, hosting-capability, and successor evidence without asserting unavailable account facts, deleting Delivery 001 assets, or entering deferred migration/cutover/infrastructure scope.

**Independent Test**: Run the approved configuration, health, diagnostic, dependency, security, hosting-evidence, and successor-classification checks; verify valid configuration is actionable, invalid configuration fails closed without sensitive output, unresolved Bangmod facts remain `DEFERRED-EVIDENCE-GATE`, and every considered Delivery 001 asset remains present with `removal_authorized=false`.

### Required verification for User Story 4

- [ ] T048 [P] [US4] Write configuration and diagnostics tests for valid startup, missing/malformed/unsafe rejection, public minimal liveness, authenticated category/status output, and nondisclosure of secrets, paths, queries, users, records, stacks, and environment detail in `wordpress/wp-content/plugins/songhealth-core/tests/integration/DiagnosticsSafetyTest.php`
- [ ] T049 [P] [US4] Create the cross-graph dependency/security review procedure covering supported WordPress/PHP/plugin and npm/frontend versions, advisories, ownership, maintenance, update, and replacement evidence in `tests/successor/dependency-security-review.md`
- [ ] T050 [P] [US4] Create the actual-account evidence checklist for PHP/extensions, database, HTTPS/domain/document roots, protected-file controls, Git/deployment, required cron/CLI, logs, backup/restore, React hosting, and route handling, with unresolved facts marked `DEFERRED-EVIDENCE-GATE`, in `tests/successor/bangmod-capability-evidence.md`
- [ ] T051 [P] [US4] Create the non-destructive Delivery 001 asset register with KEEP/REUSE/SUPERSEDED/REMOVE-LATER, replacement boundary/evidence, reviewer fields, and `removal_authorized=false` in `tests/successor/delivery-001-asset-classification.md`

### Implementation for User Story 4

- [ ] T052 [US4] Implement minimal public liveness and currently authorized diagnostic category/status responses with safe correlation codes and no protected environment values in `wordpress/wp-content/plugins/songhealth-core/src/Diagnostics/DiagnosticsController.php`
- [ ] T053 [US4] Implement startup validation that blocks protected work on invalid configuration while preserving bounded actionable operator evidence in `wordpress/wp-content/plugins/songhealth-core/src/Diagnostics/StartupValidator.php`
- [ ] T054 [US4] Execute the authorized actual Bangmod account checks when credentials/access are later provided, recording only redacted direct evidence or `DEFERRED-EVIDENCE-GATE` and accepting no Production lock from public documentation alone in `tests/successor/bangmod-capability-evidence.md`
- [ ] T055 [US4] Review repository assets against implemented replacement proof without deleting anything and complete the classification/evidence fields while retaining `removal_authorized=false` in `tests/successor/delivery-001-asset-classification.md`
- [ ] T056 [US4] Record US4 configuration, diagnostics, dependency/advisory, security-risk, hosting-gate, and successor-preservation results against Quickstart sections 1 and 8–10 in `tests/successor/evidence/us4-sustainable-foundation.md`

**Checkpoint**: US4 is independently testable after Foundational. T054 may remain evidence-gated until actual account access is authorized; it must not fabricate a PASS or introduce speculative infrastructure.

---

## Final Phase: Polish / Cross-Cutting Verification

**Purpose**: Complete only the cross-story acceptance and scope-boundary evidence genuinely required for Delivery 002.

- [ ] T057 Run and record the complete FR-024/FR-025 and SC-001–SC-011 risk-category acceptance matrix across PHP unit/integration, REST contract, containment, frontend contract, and browser suites in `tests/successor/evidence/delivery-002-acceptance-matrix.md`
- [ ] T058 [P] Verify representative detail, bounded-list continuation (including all-ineligible windows), Preview, and binary requests respect the server candidate/evaluation bound, avoid deep OFFSET, unbounded scans, and N+1 projection work, recording observations without inventing a numeric target in `tests/successor/evidence/bounded-performance.md`
- [ ] T059 [P] Audit source, bundles, responses, caches, logs, and evidence artifacts for secrets, CMS identities, raw WordPress fields, protected paths/content, Preview traces, and unsafe diagnostic detail in `tests/successor/evidence/nondisclosure-audit.md`
- [ ] T060 Prove the final Delivery 002 diff contains no importer, Trial Migration, Production Import, Production Cutover, legacy retirement, Delivery 001 T051+ continuation, dedicated Songhealth search, Redis, broker, microservice, private object store, Production Docker, or VPS baseline in `tests/successor/evidence/delivery-002-scope-audit.md`

**Final checkpoint**: Delivery 002 evidence is reviewable, no deferred operation is silently claimed complete, and no `REMOVE-LATER` item has been deleted.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: Starts immediately; T005 depends on the baseline created by T001–T002, while T003 and T004 may proceed in parallel after their target roots are available.
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks every user story. T011 depends on T010; T012 depends on T007 and T011; T016 depends on T013–T15; T017–T018 depend on the shared policy/response primitives; T019 wires the completed modules.
- **Phases 3–6 — User Stories**: Each depends on Phase 2. Their required tests/evidence definitions precede the implementation they validate.
- **Final Phase**: Depends on every desired story phase and uses their produced evidence. Full Delivery acceptance requires all four stories and resolution or explicit retention of permitted evidence gates.

### User Story Dependencies

- **US1 (P1 / MVP)**: Starts after Foundational and has no dependency on US2–US4.
- **US2 (P2)**: Starts after Foundational and is independently testable there; its React Preview presentation may reuse US1's renderer, so T037 follows T027 if both stories are developed concurrently.
- **US3 (P2)**: Starts after Foundational and is independently testable there; T045–T046 may reuse the US1 client/canonical patterns, but binary policy and verification do not depend on US2.
- **US4 (P3)**: Starts after Foundational and is independently testable there; final evidence aggregation consumes completed story results. T054 additionally depends on later authorization and real Bangmod account access, not on an invented environment assumption.

### Within Each User Story

- Write the listed tests/evidence definitions first and confirm relevant cases fail before implementing the behavior.
- Complete backend policy/storage behavior before its controller or presentation consumer.
- Complete the story implementation before recording its final Quickstart evidence.
- Do not weaken, skip, or rewrite an accepted control merely to obtain a passing result.

### Parallel Opportunities

- In Setup, T003 and T004 target separate WordPress and React test roots.
- In Foundational, T015 may proceed alongside identity/capability work once T013 is stable; otherwise unmarked tasks remain sequential due to shared plugin wiring or policy dependencies.
- After Foundational, US1, US2, US3, and the evidence-definition portions of US4 can be assigned to separate owners, subject to the explicit renderer/client dependencies above.
- Within US1, T020–T024 are separate test files; T026 can proceed separately from the backend controller after the contract is fixed.
- Within US2, T030–T032 are separate verification layers; T036 is separate from the WordPress grant/controller implementation.
- Within US3, T039–T041 are separate verification layers.
- Within US4, T048–T051 create separate safety/evidence artifacts; T058 and T059 are separate Final evidence reviews.

## Parallel Example: User Story 1

After Phase 2 is complete, these test-first tasks can run concurrently because they target separate runners and files:

```text
Task T020: wordpress/wp-content/plugins/songhealth-core/tests/unit/PublicIdRegistryTest.php
Task T021: wordpress/wp-content/plugins/songhealth-core/tests/integration/PublicRestContractTest.php
Task T022: wordpress/tests/containment/PublicSurfaceContainmentTest.php
Task T023: apps/web/tests/contract/songhealth-public-contract.test.ts
Task T024: apps/web/tests/e2e/public-foundation.spec.ts
```

Once their contracts are fixed, T025 and T026 can proceed in parallel because they modify the WordPress controller and React client separately; T027–T029 then integrate and validate the story.

---

## Implementation Strategy

### MVP First: Setup + Foundational + US1

1. Complete Phase 1.
2. Complete Phase 2; do not start a story early.
3. Complete Phase 3 tests before its implementation tasks.
4. **STOP AND VALIDATE** US1 independently using its stated criterion and T029 evidence.
5. Do not treat MVP validation as authorization for US2, US3, US4, importer, migration, cutover, or Production work.

### Incremental Delivery

1. Setup + Foundational establish the safe shared boundary.
2. US1 proves the public contract and React canonical route as the MVP.
3. US2 adds bounded staff administration and confidential Preview without replacing WordPress identity/admin.
4. US3 adds current-eligibility protected delivery without relying on public storage URLs.
5. US4 adds operational, dependency, actual-hosting, and successor evidence without destructive action.
6. Final verification aggregates cross-story acceptance and proves scope containment.

### Scope Guardrails

- Only Basic Page and Document Resource foundation shells are registered; finished Product workflows remain future Delivery work.
- The public contract contains detail and bounded listing only; no Songhealth public search contract or public `/pages` hub is added.
- Preview is bounded, authenticated, currently authorized, read-only, and private; it is not a share-link or lifecycle mechanism.
- A Document Resource's own current eligibility controls every anonymous binary request; references never elevate it.
- Delivery 001 remains preserved. `REMOVE-LATER` is classification only and `removal_authorized=false` throughout Delivery 002.
- Importer, Trial Migration, Production Import, Production Cutover, legacy retirement, Delivery 001 T051+, and speculative infrastructure remain outside this task graph.

## Notes

- Task IDs restart at T001 for Delivery 002 and are sequential without gaps.
- `[P]` never overrides phase, task, file, or policy dependencies.
- Implementation must use current authoritative upstream WordPress behavior where version-sensitive, without overriding the Constitution, Frozen authority, or Delivery artifacts.
- Every task remains unchecked until its implementation and required evidence are independently accepted.

# Feature Specification: Headless WordPress Foundation & Public Contract

**Feature Branch**: `002-headless-wordpress-foundation`

**Created**: 2026-08-29

**Status**: Draft

**Input**: Delivery 002 establishes the smallest safe foundation for the Frozen Headless WordPress architecture and public contract so later Product Deliveries can build on it, without activating legacy migration or continuing Delivery 001 T051+.

## Clarifications

### Session 2026-08-29

- Q: Must Delivery 002 include an authenticated, staff-only React preview of unpublished working content, or defer that capability to a later Delivery? → A: Include the bounded Preview foundation in Delivery 002.
- Q: Which Songhealth public-contract operations must Delivery 002 expose as working public behavior? → A: Resource detail and bounded listing; defer Songhealth public search while containing native WordPress search surfaces.
- Q: Which real resource types must Delivery 002 register as its minimum production slice for exercising public detail, listing, Preview, and protected-binary behavior? → A: Register minimal Basic Page and Document Resource foundation shells only.
- Q: When must the system issue the immutable Public ID for a new Basic Page or Document Resource? → A: At the first successful record creation, including Draft creation.
- Q: Which resource's lifecycle decision must control anonymous delivery of a Document Resource's binary? → A: The Document Resource's own current eligibility controls delivery; references never elevate it.

### Session 2026-08-29 (T012-B01 design boundary)

- Q: Through which boundary is Basic Page or Document Resource creation accepted, and what is reported when Public ID issuance fails at that boundary? → A: Accepted creation exists only through the plugin-owned Songhealth supported-resource creation service. Raw or internal `wp_insert_post()` success is an internal outcome only and never constitutes successful Songhealth resource creation. The service may report success only after immutable Public ID establishment and one-to-one mapping verification; every actual identity issuance failure must be returned as service failure. Where a verified safe bounded database transaction is available, transactional creation plus identity establishment is preferred; otherwise fail-return plus verified compensation is used, and a row whose compensation cannot complete remains a quarantined, unaccepted internal candidate that can never qualify as a Songhealth resource.
- Q: Do WordPress insertion callbacks and their ordering carry Product success meaning? → A: No. Arbitrary Core-insertion callbacks are outside the Product success boundary, and hook order or priority must not be used as the correctness mechanism. Updates of already accepted resources continue through ordinary WordPress update paths without identity mutation, and direct-create containment applies only to creation of supported resource types, never to legitimate update, autosave, or revision behavior of already identified resources.
- Q: What role does the Public ID mapping play for later behavior? → A: A valid, live Public ID mapping is the first prerequisite for later eligibility, REST, Preview, protected-binary, and canonical-route behavior; without one, a record is an internal candidate and never a Songhealth resource.

### Session 2026-08-30 (G02C-B02 bounded-listing design boundary)

- Q: Must the Delivery 002 foundation listing expose exact eligible-only `total` / `totalPages` when doing so requires SQL to reproduce the authoritative PHP eligibility semantics? → A: No. The foundation listing uses bounded opaque continuation with `data`, `hasMore`, and optional `nextCursor`; exact public totals are removed. `PublicEligibility` remains the sole live record-level authority, every returned item passes it, and query logic may only select bounded deterministic candidate windows rather than independently decide eligibility.
- Q: What confidentiality and progress guarantees apply to continuation? → A: Every request has a hard server-controlled candidate-scan/evaluation bound and deterministic Public-ID keyset progress with no deep OFFSET. The cursor is confidential and integrity-protected, binds resource type and ordering, supports safe versioning/expiry, reveals no internal identifier, scanned ineligible Public ID, eligibility state, or database position, and fails closed with the bounded invalid-request class when malformed, expired, mismatched, or tampered. If the scan budget ends before an eligible item is found while candidates remain, the response is an empty bounded page with `hasMore=true` and an opaque `nextCursor`.
- Q: Does this establish cursor pagination for public Product listings or Search? → A: No. It is a Delivery 002 foundation API exception for an operation with no public `/pages` hub or current React listing UX. Future Product Search and domain listings retain their Frozen page-based requirements where applicable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consume a Safe Public Contract (Priority: P1)

As a public visitor, I can use the React public website backed only by the Songhealth public contract and receive stable, canonical, public-eligible information without exposure of CMS-internal or non-public data.

**Why this priority**: The public contract is the foundation boundary on which every later public Product Delivery depends. It must establish safe identity, eligibility, and routing before domain features are added.

**Independent Test**: Publish a minimal eligible Basic Page foundation record, request it through the Songhealth public contract's detail and bounded-listing operations and its React public route, change its title or display slug, and verify that the same Public ID remains authoritative, the canonical destination is preserved, and only allowlisted public data is returned.

**Acceptance Scenarios**:

1. **Given** an eligible public Basic Page foundation record, **When** a visitor requests it through the Songhealth public interface, **Then** the response contains only the approved public projection and resolves to its canonical React route.
2. **Given** a public record whose title or display slug changes, **When** the old, missing, or current display slug is requested with its Public ID, **Then** the same record is resolved and the current canonical destination is used without changing or reassigning its Public ID.
3. **Given** a Draft, Hidden, Internal, withdrawn, or otherwise ineligible record, **When** an anonymous visitor requests it through any public interface, **Then** neither its content nor its existence or internal state is disclosed.
4. **Given** a Songhealth-managed record, **When** an anonymous visitor attempts to reach it through a native CMS public surface, **Then** that surface cannot exceed Songhealth public eligibility or become a competing canonical route.

---

### User Story 2 - Manage the Foundation Within Frozen Boundaries (Priority: P2)

As an authorized staff member, I can work within the established CMS using Songhealth domain language and bounded foundation behavior, while privileged actions remain server-authorized and non-public working data remains confidential.

**Why this priority**: Later Product Deliveries need a safe administrative foundation, but this Delivery must not pre-build finished domain modules or replace the accepted staff model with a second administration system.

**Independent Test**: Exercise the minimum Basic Page and Document Resource foundation administration with authorized and unauthorized staff identities, verify default-deny enforcement and Songhealth-specific ownership boundaries, and confirm that a candidate non-public state cannot be retrieved anonymously or leak into public, cache, or native CMS search outputs.

**Acceptance Scenarios**:

1. **Given** an authorized staff member, **When** the member performs a permitted foundation action, **Then** the action is evaluated server-side against current authority and the accepted Songhealth role boundary.
2. **Given** an unauthenticated, unauthorized, revoked, or insufficiently scoped actor, **When** the actor attempts a privileged foundation action by UI, direct URL, Preview, or request interface, **Then** the action is denied without protected-information disclosure.
3. **Given** a staff member viewing a candidate non-public state through Preview, **When** Preview is used, **Then** access is bounded to currently authorized staff and the candidate state is excluded from normal public, native CMS search, and cache exposure.
4. **Given** the administration foundation, **When** staff navigate or edit foundation records, **Then** the experience presents Songhealth concepts and does not require a separate custom Admin application or user store.
5. **Given** a new Basic Page or Document Resource, **When** its first creation succeeds through the Songhealth creation service in any lifecycle state including Draft, **Then** the system issues its immutable Public ID and retains that same identity through Preview and later lifecycle changes.

---

### User Story 3 - Preserve Protected Binary Eligibility (Priority: P2)

As a content owner, I can rely on the foundation to keep protected binaries unavailable to anonymous users until and only while their current Songhealth lifecycle permits public delivery.

**Why this priority**: A known or retained file URL must never bypass current eligibility. This confidentiality boundary must exist before later Deliveries add document, media, or ITA behavior.

**Independent Test**: Associate a Document Resource binary with a sequence of non-public, public-eligible, and no-longer-public states, retain its known delivery URL throughout, and verify anonymous delivery is permitted only during the public-eligible state.

**Acceptance Scenarios**:

1. **Given** a newly uploaded, Draft, Hidden, or unpublished protected binary, **When** an anonymous user requests its known or guessed URL, **Then** the binary is not delivered and protected record details are not disclosed.
2. **Given** a binary whose current lifecycle is public-eligible, **When** a visitor follows its approved public access path, **Then** the binary is delivered consistently with its stable resource identity.
3. **Given** a previously public binary that becomes non-public, **When** an anonymous user reuses a bookmarked or retained URL, **Then** delivery is revoked according to current eligibility.
4. **Given** a public Basic Page references a Draft, Hidden, unpublished, or otherwise public-ineligible Document Resource, **When** an anonymous visitor follows the reference or requests the known binary URL, **Then** the reference does not elevate Document Resource eligibility and the binary is not delivered.

---

### User Story 4 - Verify a Sustainable Successor Foundation (Priority: P3)

As an operator or reviewer, I can verify that the foundation fits the approved hosting environment, fails safely, exposes actionable but non-sensitive health information, and is ready to support later Deliveries before superseded assets are removed.

**Why this priority**: The architecture must be supportable on the approved environment and backed by evidence; replacement proof is required before any broad removal of Delivery 001 assets.

**Independent Test**: Run the approved foundation verification against representative public, authorization, nondisclosure, configuration, diagnostic, dependency, and hosting-capability scenarios and review a controlled successor/removal record without deleting legacy assets.

**Acceptance Scenarios**:

1. **Given** valid required configuration, **When** the foundation is verified, **Then** required components report an actionable healthy state without revealing secrets or protected environment details.
2. **Given** missing, malformed, or unsafe configuration, **When** startup or diagnostics are evaluated, **Then** the foundation fails closed with bounded, non-sensitive evidence that identifies the corrective category.
3. **Given** the approved Bangmod/DirectAdmin target, **When** Production-specific capability assumptions are assessed, **Then** real environment evidence is recorded before any Production-specific version or capability lock is accepted.
4. **Given** superseded Delivery 001 runtime assets, **When** successor readiness is reviewed, **Then** each asset remains preserved or is classified for controlled later removal, and no deletion occurs without implemented and independently verified replacement proof plus separate authorization.

### Edge Cases

- A valid Public ID is paired with an outdated, malformed, missing, or differently normalized display slug; identity resolution remains based on the immutable Public ID and does not create a second resource.
- A supported-type row is created by raw Core insertion outside the Songhealth creation service, or survives an issuance failure whose compensation could not complete; it remains a quarantined internal candidate, is never reported as successful Songhealth creation, and never qualifies as a Songhealth resource through any later behavior.
- A Public ID is unknown, belongs to a non-public record, or was previously issued to a withdrawn record; public behavior does not disclose which case applies, and an issued ID is never reassigned.
- Native CMS REST, single, archive, search, feed, sitemap, taxonomy, author, attachment, or media behavior would reveal more than the Songhealth public contract; the request is contained by current Songhealth eligibility and canonical routing.
- A public projection, native CMS search representation, or cache is stale after a record becomes non-public; current canonical eligibility wins and the record is suppressed.
- Preview authorization expires or is revoked during use; subsequent access is denied and the candidate state does not fall back to anonymous delivery.
- A binary exists physically or its URL is known before publication or after withdrawal; existence and URL knowledge do not grant public eligibility.
- A public Basic Page or another resource references a non-public Document Resource; the reference does not elevate the Document Resource's lifecycle or make its binary anonymously deliverable.
- A health or diagnostic dependency fails; the reported evidence remains useful to an operator without disclosing secrets, credentials, protected paths, queries, record contents, or internal user identity.
- Hosting capabilities differ from assumptions; Production-specific locks are deferred and the mismatch is recorded rather than silently expanding infrastructure scope.
- A superseded Delivery 001 asset appears unused; `REMOVE-LATER` classification alone does not authorize deletion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The foundation MUST establish the Frozen Version 1 responsibility boundary: WordPress Core supplies commodity CMS infrastructure, `songhealth-core` owns Songhealth-specific semantics and safeguards, the Songhealth public contract is the sole approved public data projection, and React owns public presentation and canonical routes.
- **FR-002**: The foundation MUST use the approved Bangmod Expert Hosting / DirectAdmin environment as the Production baseline and MUST require real capability evidence before accepting Production-specific version or capability locks.
- **FR-003**: Delivery 002 production resource registration MUST be limited to minimum Basic Page and Document Resource foundation shells needed to prove the public-contract, Preview, and protected-binary boundaries. It MUST NOT flatten these distinct resources into an undifferentiated generic content model or implement their finished Product workflows.
- **FR-004**: At the first successful creation of every Basic Page or Document Resource, including creation as Draft, the system MUST issue an immutable Public ID that is independent of its title, display slug, internal database identifier, filename, and native CMS identifier. Successful Songhealth creation exists only through the plugin-owned Songhealth supported-resource creation service: the service MUST report success only after immutable Public ID establishment and verification of the one-to-one registry mapping, raw WordPress insertion success MUST NOT be reported or treated as successful Songhealth creation, and every actual issuance failure MUST be returned as service failure. Creation and identity establishment MUST use a verified safe bounded transaction where one is available, and otherwise fail-return plus verified compensation; a record whose compensation cannot complete MUST remain a quarantined, unaccepted internal candidate that can never qualify as a Songhealth resource. WordPress insertion callbacks MUST NOT be treated as the Songhealth success boundary, and hook order or priority MUST NOT be used as the correctness mechanism.
- **FR-005**: An issued Songhealth Public ID MUST remain attached to the same resource through title, slug, lifecycle, or canonical-presentation changes and MUST never be reassigned to another resource. Updates of accepted resources MUST continue through ordinary WordPress update paths without any identity write, and direct-create containment MUST apply only to creation of supported resource types without disabling legitimate update, autosave, or revision behavior for already identified resources.
- **FR-006**: The Songhealth public contract MUST expose only explicit allowlisted public fields expressed as Songhealth concepts, and MUST NOT expose raw CMS records, native identifiers, plugin fields, internal metadata, protected configuration, or CMS user identities.
- **FR-007**: Every public record response MUST pass a current server-side Songhealth public-eligibility decision; frontend concealment, stale native CMS search data, stale cache state, identifier knowledge, or native CMS defaults MUST NOT grant visibility. A valid, live Public ID mapping is the first prerequisite of that decision and of every later eligibility, REST, Preview, protected-binary, and canonical-route behavior: without one, a record is an internal candidate and MUST NOT become visible or addressable as a Songhealth resource.
- **FR-008**: Draft, Hidden, Internal, withdrawn, unpublished, and otherwise public-ineligible records MUST disclose neither protected content nor record existence through public details, listings, native CMS search, errors, counts, suggestions, or other public interfaces.
- **FR-009**: Native CMS anonymous data and rendering surfaces for Songhealth-managed resources MUST NOT expose more than the Songhealth public contract or create competing canonical public routes.
- **FR-010**: The React public application foundation MUST consume the Songhealth public contract rather than a superseded Delivery 001 application backend, raw CMS storage, or legacy WordPress runtime coupling.
- **FR-011**: Dynamic public routing MUST treat Public ID as identity and display slug as optional readability metadata, preserve one canonical URL per resource, and normalize resolvable non-canonical variants without creating duplicate identity.
- **FR-012**: Unknown and public-ineligible resources MUST receive neutral public behavior consistent with Frozen routing and lifecycle authority, without revealing internal state or redirecting blindly to the homepage.
- **FR-013**: Privileged foundation behavior MUST be authorized server-side using current actor, action, scope, object, field, lifecycle, and relationship context as applicable, with default deny and least privilege.
- **FR-014**: Administrative access MUST preserve the Frozen Songhealth role and identity invariants, including no self-escalation, protection of the last Administrator, separation of CMS User from public Personnel, and no second custom user store or parallel identity authority.
- **FR-015**: The staff-facing foundation MUST use Songhealth domain language and bounded administration behavior; it MUST NOT introduce a custom Admin SPA or treat generic native CMS concepts as the Product model.
- **FR-016**: The foundation MUST include Preview accessible only to currently authenticated and authorized staff, MUST use the React public presentation, and MUST exclude candidate non-public data from normal public, search, cache, and crawler exposure.
- **FR-017**: Preview and other privileged presentation paths MUST NOT provide administrator credentials or equivalent privileged secrets to the React public client, and direct URLs or request parameters MUST NOT bypass authorization.
- **FR-018**: Binary existence and storage location MUST be independent from anonymous delivery eligibility; newly uploaded, Draft, Hidden, unpublished, and otherwise protected binaries MUST not be anonymously delivered.
- **FR-019**: Anonymous delivery of a Document Resource binary MUST be allowed only while that Document Resource's own current lifecycle marks it public-eligible. A reference from a Basic Page or any other resource MUST NOT elevate or override Document Resource eligibility, and a later loss of eligibility MUST revoke delivery even when a prior URL is known, guessed, bookmarked, or retained.
- **FR-020**: Protected binary denial and public-record denial MUST use bounded behavior that does not reveal protected lifecycle, storage, path, identity, or authorization details.
- **FR-021**: Required secrets and environment-specific configuration MUST remain outside public source and frontend output, MUST be separated by environment, and MUST be validated before protected work is accepted.
- **FR-022**: Startup, health, failure, and diagnostic outcomes MUST be observable and actionable for authorized operators while excluding secrets, credentials, protected content, sensitive paths, raw queries, internal user identity, and unnecessary environment details.
- **FR-023**: Foundation dependencies and extensions MUST be limited to those justified by an approved requirement, security need, hosting need, or operational need, and each retained dependency MUST have reviewable security, maintenance, ownership, and replacement considerations.
- **FR-024**: Verification MUST provide proportionate evidence for immutable identity, public projection, current eligibility, native-surface containment, authorization/default-deny behavior, Preview confidentiality, protected-binary revocation, configuration rejection, diagnostic nondisclosure, and canonical routing.
- **FR-025**: Verification MUST distinguish Songhealth-owned behavior from commodity platform internals and MUST NOT weaken, bypass, or rewrite accepted controls to conceal a defect.
- **FR-026**: Superseded Delivery 001 assets MUST remain preserved or explicitly classified as KEEP, REUSE, SUPERSEDED, or REMOVE-LATER; no broad deletion is permitted until the replacement is implemented, independently verified, and separately authorized.
- **FR-027**: This Delivery MUST NOT implement an importer, execute Trial Migration, Production Import, Production Cutover, retire the legacy WordPress system, or resume any Delivery 001 task from T051 onward.
- **FR-028**: This Delivery MUST NOT establish speculative Redis, broker, microservice, dedicated search, private object-storage, Production Docker, or VPS baselines without approved evidence demonstrating that the simpler Frozen baseline cannot satisfy a current requirement.
- **FR-029**: The foundation MUST preserve unchanged Frozen Product, accessibility, privacy, publishing, search, role, lifecycle, URL, and security semantics; any material conflict or required semantic change MUST stop affected work and return to the approved review path.
- **FR-030**: The Delivery 002 Songhealth public contract MUST expose working resource-detail and bounded-listing operations. The foundation listing MUST return `data`, `hasMore`, and an optional opaque `nextCursor`; accept only allowlisted resource type, bounded `perPage`, deterministic order, and an optional continuation cursor; use deterministic keyset progress with a hard server-controlled candidate-scan/evaluation bound and no deep OFFSET; and return no exact public `total` or `totalPages`. `PublicEligibility` MUST remain the sole live record-level eligibility authority and MUST accept every returned item. Query logic MAY select bounded candidate windows but MUST NOT independently reproduce or decide eligibility. Continuation cursors MUST provide confidentiality and integrity, bind resource type and order, support safe versioning/expiry, reveal no internal identifier, scanned ineligible Public ID, eligibility state, or database position, and fail closed with bounded invalid-request behavior when malformed, expired, mismatched, or tampered. Budget exhaustion with remaining candidates MUST preserve progress through `hasMore=true` and an opaque `nextCursor`, including when the returned `data` is empty. This foundation exception does not establish cursor pagination for future Product listings or Search. Songhealth public search behavior remains out of scope, while native CMS anonymous search surfaces remain subject to FR-008 and FR-009 containment.

### Key Entities *(include if feature involves data)*

- **Songhealth Public Resource**: A resource eligible for later public-domain use; receives one immutable Public ID at first accepted creation — service-verified, including creation as Draft — and has current public-eligibility state, canonical route identity, and an explicit allowlisted public projection.
- **Internal Candidate (Quarantined)**: A WordPress row that exists without an established Public ID mapping — created by raw Core insertion outside the Songhealth creation service, or left behind when verified compensation could not complete. It is internal-only, never an accepted Songhealth resource, never public-eligible, and never exposed through any Songhealth surface; it carries no Product success meaning.
- **Basic Page Foundation Record**: The minimum real public resource used in this Delivery to prove public detail, bounded listing, canonical routing, immutable identity, eligibility, and Preview without implementing a finished Editorial Content module.
- **Document Resource Foundation Record**: The minimum real document resource used in this Delivery to prove protected-binary lifecycle and delivery eligibility without implementing finished document, reuse, or Product workflow behavior.
- **Public Projection**: The minimal public-safe representation of a Songhealth resource; contains only approved public fields and never acts as the authority for lifecycle or eligibility.
- **Public Eligibility Decision**: The current server-authoritative determination of whether a record or binary may be disclosed anonymously; incorporates applicable lifecycle, visibility, relationship, and withdrawal state.
- **Canonical Route**: The single approved React public destination for a resource; resolves identity by Public ID while treating the display slug as optional readability metadata.
- **Protected Binary Resource**: A stored file whose anonymous delivery is governed by its owning Document Resource's current eligibility, never elevated by a referencing resource, regardless of storage existence or URL knowledge.
- **Preview Context**: A bounded, time- and authorization-dependent view of candidate non-public state for an authorized staff member; never part of normal public output.
- **Foundation Verification Evidence**: A bounded record of an approved verification outcome, sufficient to establish behavior or diagnose failure without carrying protected information.
- **Successor Asset Classification**: A non-destructive disposition record for Delivery 001 assets: KEEP, REUSE, SUPERSEDED, or REMOVE-LATER; it is not deletion authorization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the approved acceptance suite, 100% of eligible foundation records return only their allowlisted public fields through the Songhealth resource-detail and bounded-listing operations, and 0 protected or CMS-internal fields are disclosed.
- **SC-002**: Across Draft creation, Preview, publication, title change, display-slug change, and withdrawal scenarios, 100% of tested resources retain the Public ID issued at first accepted creation and resolve to exactly one current canonical public destination whenever publicly eligible; 0 issued Public IDs are reassigned, and 0 creations are reported successful by the Songhealth creation service without a verified Public ID mapping.
- **SC-003**: Across anonymous resource-detail, bounded-listing, native CMS search and other native CMS surfaces, error, count, and identifier-guessing scenarios, 100% of tested non-public records remain undisclosed with 0 content or existence leaks.
- **SC-004**: Across tested upload, Draft, Hidden, unpublished, public-eligible, revoked, and public-parent-reference scenarios, 100% of protected-binary requests match the owning Document Resource's current eligibility, including 0 successful anonymous deliveries caused by a referencing resource or retained URL.
- **SC-005**: 100% of tested privileged actions and Preview requests are denied for unauthenticated, unauthorized, revoked, or insufficiently scoped actors and succeed only for currently authorized actors, with 0 privileged credentials exposed to the public client.
- **SC-006**: The React public foundation completes all approved resource-detail, bounded-listing, and canonical-route acceptance scenarios without depending on the superseded Delivery 001 backend, custom Admin application, custom user store, or raw legacy WordPress coupling.
- **SC-007**: 100% of required configuration failure and diagnostic scenarios fail closed and provide an actionable error category while disclosing 0 secrets, credentials, protected record content, sensitive paths, raw queries, or internal user identities.
- **SC-008**: The verification record contains passing evidence for every risk category named in FR-024, with no critical scenario skipped, weakened, or replaced by platform-internal testing alone.
- **SC-009**: Production-specific capability and version decisions have direct evidence from the real Bangmod/DirectAdmin environment; decisions lacking such evidence remain explicitly deferred rather than assumed.
- **SC-010**: 100% of Delivery 001 runtime assets considered by this Delivery have a documented non-destructive classification, and 0 are broadly deleted before independently verified replacement proof and separate authorization.
- **SC-011**: Review of the completed foundation finds 0 importer, migration execution, cutover, legacy-retirement, Delivery 001 T051+, custom Admin SPA/user-store, or speculative infrastructure behavior within Delivery 002.
- **SC-012**: Independent specification acceptance can trace every foundation requirement to the READY Delivery Context, Constitution, reconciliation records, or Frozen canonical authority with 0 unresolved material authority conflicts.

## Assumptions

- The Human-selected Delivery Context remains READY and is the approved routing map for this specification.
- The mandatory `before_specify` Git hook has already created and selected branch `002-headless-wordpress-foundation` with feature number `002`; this specification does not rerun that hook.
- Frozen canonical Product documents `01–04` and `06–08` remain unchanged authority, while the later Controlled Amendments and Canonical Freeze Bindings in `00`, `05`, `09`, and `10` supersede only conflicting historical implementation mechanisms.
- Delivery 001 remains accepted historical evidence through T050; its unfinished T051+ work is retired and cannot be converted into Delivery 002 scope.
- Production resource registration is limited to the Basic Page and Document Resource foundation shells required by FR-003. Finished Product domain modules and fields, full staff workflows, other Product resource registrations, Songhealth public search behavior, and migration behavior remain for later separately authorized Deliveries.
- Delivery 002 includes only the bounded Preview foundation required by FR-016 and FR-017; finished Product-specific Preview workflows remain for later Product Deliveries.
- Exact platform versions, dependencies, data structures, protected-file delivery controls, Preview credentials/context controls, deployment procedure, container topology, and importer design belong to later planning or separately authorized Deliveries and are intentionally not selected here.
- `REMOVE-LATER` is a planning classification only and never authorizes deletion.

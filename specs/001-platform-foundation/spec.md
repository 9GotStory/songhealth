# Feature Specification: Platform Foundation

**Feature Branch**: `001-platform-foundation`

**Created**: 2026-10-06

**Status**: Approved

**Input**: User description: "Create the first clean-rebuild feature specification for the
minimum usable Songhealth platform foundation."

## Clarifications

### Session 2026-10-06

- Q: Must public runtime readiness require a publicly exposed health or readiness endpoint? → A: No.
  Minimum public behavior and operator readiness are separate; planning chooses the readiness
  mechanism within `current/10`.
- Q: What setup, recovery, or documentation SLA applies to this foundation? → A: No invented time
  or rating threshold applies; acceptance uses reproducible evidence with zero undocumented setup
  intervention and complete, integrity-checked recovery.
- Q: Must every future feature preserve all foundation boundaries unchanged? → A: No. Currently
  planned feature categories build from one canonical foundation; a boundary may evolve after a
  genuine requirement gap and amendment of its owning authority.
- Q: Does a recovery set require a new atomic or synchronized database-and-media backup mechanism?
  → A: No. It means the database and media backup artifacts needed to restore and verify the known
  validation state; planning chooses the smallest procedure allowed by `current/10`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start the Canonical Platform (Priority: P1)

As a Songhealth maintainer, I can follow the documented development setup from a clean checkout,
provide environment-specific configuration outside the source, and start one coherent platform
whose public runtime serves its minimum verification behavior and whose CMS administration
capability is available. Operators can separately determine whether the platform is ready. This
gives later feature work a single verified starting point rather than multiple competing
foundations.

**Why this priority**: Nothing else can be developed or verified until the approved public and
administration capabilities start together against working persistence boundaries.

**Independent Test**: A maintainer who did not author the setup can follow the documented path in a
prepared development environment, start the platform, verify its minimum public behavior and CMS
administration capability, determine its operational readiness state, store non-confidential
validation data and a public-publishable media asset, and retrieve both.

**Acceptance Scenarios**:

1. **Given** a clean checkout and documented prerequisites, **When** a maintainer supplies valid
   external configuration and follows the setup instructions, **Then** the public runtime serves
   its minimum verification behavior, the CMS administration capability starts as part of the same
   platform, and the operator can determine that the platform is ready.
2. **Given** a running foundation, **When** the maintainer stores designated validation data and
   a public-publishable validation asset, **Then** both are retrievable through their intended
   platform boundaries.
3. **Given** required configuration is missing or invalid, **When** startup is attempted, **Then**
   startup fails with an actionable result and does not expose secret values.

---

### User Story 2 - Operate Without Losing Persistent Data (Priority: P2)

As a production operator, I can start, stop, restart, and recreate the runtime foundation without
losing database or media data, while the data store remains inaccessible from unintended public
paths. This makes normal lifecycle operations safe and predictable.

**Why this priority**: A platform that starts but loses data or exposes its data store cannot be a
safe production foundation.

**Independent Test**: Populate a designated validation dataset and media set, exercise the complete
lifecycle sequence including runtime recreation, and verify data retention, application access,
public isolation of the data store, and accurate readiness reporting.

**Acceptance Scenarios**:

1. **Given** the foundation contains designated validation data and media, **When** an operator
   stops, starts, restarts, and recreates replaceable runtime components, **Then** all designated
   persistent data and media remain intact and retrievable.
2. **Given** the production boundary is running, **When** access to the data store is attempted from
   an unintended public path, **Then** the connection is rejected while the application retains its
   required access.
3. **Given** a required persistence dependency is unavailable, **When** readiness is checked,
   **Then** the platform reports that it is not ready and identifies the affected dependency without
   exposing secrets.

---

### User Story 3 - Recover Foundation Data (Priority: P3)

As an operator responsible for continuity, I can create the database and media backup artifacts
needed to restore the known validation state into a clean or recreated runtime. This proves that
persistence is durable beyond the current runtime instance.

**Why this priority**: Persistence alone does not protect the platform from corruption, operator
error, or host-level loss; a usable recovery path must be demonstrated.

**Independent Test**: Back up a known validation dataset and media set, alter or remove the working
copies, restore into a clean or recreated runtime, and compare every restored validation item with
the recorded source evidence.

**Acceptance Scenarios**:

1. **Given** a running foundation with known validation data and media, **When** an operator
   creates a foundation recovery set and restores it into a clean or recreated runtime, **Then**
   all expected records and media are present and match the recorded source evidence.
2. **Given** an incomplete, mismatched, or unusable recovery input, **When** restoration is
   attempted, **Then** the process reports failure clearly and does not report the foundation as
   successfully recovered.

---

### User Story 4 - Build from the Canonical Foundation (Priority: P4)

As a team delivering a later bounded feature, I can add approved content models, public pages,
publishing behavior, or other currently planned Product capabilities from the established platform
without creating a second, competing platform foundation. A platform boundary may evolve when an
approved requirement demonstrates a genuine gap and the owning authority is amended.

**Why this priority**: The foundation delivers long-term value when subsequent features share one
baseline while retaining a governed path for justified evolution.

**Independent Test**: An independent architecture and specification review can trace each named
currently planned feature category to the canonical foundation, find no second competing platform,
and find no platform-boundary replacement without a documented gap and authority amendment.

**Acceptance Scenarios**:

1. **Given** the foundation has passed its readiness and durability checks, **When** a later feature
   in a currently planned category is specified against the current Product authority, **Then** it
   builds from the canonical foundation without creating a second platform foundation.
2. **Given** a later feature identifies a genuine capability gap, **When** the gap is reviewed,
   **Then** the owning authority may be amended and the smallest justified boundary evolution may be
   approved without treating the original boundary as immutable.

### Edge Cases

- Re-running initialization against existing persistent data must not silently erase, replace, or
  reinitialize that data.
- Missing, malformed, or mutually inconsistent configuration must prevent a false-ready state and
  must not reveal secrets in user-facing or operational output.
- An unavailable or unwritable data or media boundary must be distinguishable from a healthy
  platform and must not trigger creation of an unintended empty replacement store.
- Runtime recreation with a missing persistence attachment must fail readiness rather than appear as
  a new empty but healthy environment.
- A transient interruption during startup or restart must result in a deterministic ready or
  not-ready outcome after the operation completes.
- Public-path probes against the data-store boundary must remain blocked even while normal
  application access succeeds.
- A recovery set with only database data or only media data must not be accepted as a complete
  foundation recovery when both were present at backup time.
- Corrupt or mismatched recovery inputs must be detected before the recovery is declared successful.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST provide one canonical application foundation for all subsequent
  Songhealth public-site and CMS feature work.
- **FR-002**: The approved public runtime and CMS administration capability MUST start successfully
  as one coherent platform, and the public runtime MUST serve its minimum verification behavior.
- **FR-003**: Operators MUST be able to determine whether the platform is ready or not ready through
  a repeatable, on-demand operational check separate from public runtime availability. Normal
  recurring checks MUST be non-mutating and private/internal; this feature MUST NOT require a
  publicly exposed health or readiness endpoint. Planning MUST select the exact mechanism within
  the authority of `current/10`.
- **FR-004**: The foundation MUST provide a persistent content and data-store boundary capable of
  storing and retrieving designated non-confidential validation data.
- **FR-005**: The foundation MUST provide a persistent media boundary capable of storing and
  retrieving designated public-publishable validation assets.
- **FR-006**: Data and media persisted through the foundation MUST remain available after ordinary
  start, stop, restart, and recreation of replaceable runtime components.
- **FR-007**: Environment-specific configuration and secret values MUST remain external to source
  code and committed artifacts, and secret values MUST NOT appear in readiness or failure output.
- **FR-008**: The project MUST document a reproducible development setup from a clean checkout,
  including prerequisites, required configuration names and purposes, startup, shutdown, readiness
  verification, and recovery from common setup failures.
- **FR-009**: The production foundation MUST provide documented and independently verifiable start,
  stop, restart, and recreation outcomes.
- **FR-010**: The production data-store boundary MUST reject access from unintended public paths
  while remaining available to the application through its approved private boundary.
- **FR-011**: Readiness verification MUST distinguish a fully usable platform from a process that is
  running while required data or media dependencies are unavailable, without assuming that
  readiness is publicly exposed. The supported deployment/startup procedure MUST establish a
  compatible platform-native database and migration state, and MUST prove media writeability through
  bounded deployment/startup or integration verification, before the environment is accepted as
  ready for use. Migration/check failure MUST block readiness. Normal recurring readiness MUST
  remain non-mutating and MUST NOT perform a persistent media-write operation.
- **FR-012**: Startup and operational failures MUST produce actionable results without exposing
  sensitive configuration or falsely reporting readiness.
- **FR-013**: The foundation MUST provide a documented method to create a recovery set consisting of
  the database and media backup artifacts needed to restore the known validation state. This
  requirement MUST NOT imply a new atomic or transactionally synchronized backup mechanism.
- **FR-014**: The recovery method MUST restore the database and media artifacts into a clean or
  recreated runtime and MUST provide evidence that every designated validation item was recovered
  intact. Required runtime secrets and keys MUST have an independently protected recovery path
  before the restored application is accepted as operationally usable; secret values MUST remain
  outside the Recovery Set, Git, planning artifacts, and logs.
- **FR-015**: Foundation verification MUST produce reviewable evidence for development setup,
  platform readiness, lifecycle durability, private data-store access, and backup and restore.
- **FR-016**: Platform-native capabilities MUST be used for foundation behavior unless an accepted
  current requirement demonstrates a gap; any proposed extension MUST identify that gap and remain
  the smallest correct addition.
- **FR-017**: The foundation MUST be capable of supporting later bounded content-model, public-page,
  publishing, and other currently planned Product feature work without creating a second competing
  platform foundation. A boundary MAY evolve only when a genuine requirement gap is documented and
  its owning authority is amended.
- **FR-018**: Foundation validation data and media MUST contain no confidential health records or
  other data that is unsuitable for public-publishable website systems.
- **FR-019**: This feature MUST NOT deliver any capability listed in the explicit out-of-scope
  boundary below.

### Key Entities

- **Runtime Configuration**: The named environment-specific values required to start and operate the
  foundation, including identification of which values are sensitive; actual secret values are not
  part of the specification or repository.
- **Foundation Validation Data**: Non-confidential records used only to prove data persistence,
  lifecycle durability, and recovery without implementing the Songhealth Product content model.
- **Public-Publishable Validation Asset**: A non-confidential media item used to prove storage,
  retrieval, lifecycle durability, and recovery of the media boundary.
- **Readiness Result**: The observable state showing whether the platform and each required
  foundation dependency are usable, not merely running. Normal recurring evaluation is private,
  repeatable, on demand, and non-mutating; database/migration compatibility and media writeability
  are prerequisite deployment/startup acceptance evidence.
- **Recovery Set**: The database and media backup artifacts needed to restore a known validation
  state, plus a common recovery-set identifier/evidence associating both artifact classes with that
  state. The term does not include runtime secrets and does not require the artifacts to be created
  atomically or through a new transactionally synchronized mechanism.
- **Runtime Secret Recovery**: The independently protected recovery path for required external
  runtime secrets and keys. It is required for operationally usable recovery but is not part of the
  Recovery Set and does not require a new secret-management platform.

### Scope Boundaries

#### In Scope

- One canonical application foundation for later public-site and CMS work.
- Successful startup of the approved public runtime and CMS administration capability as one
  platform, plus separate operational readiness verification.
- Persistent data and public-publishable media boundaries.
- External environment configuration and secret separation.
- Reproducible development setup documentation.
- Production lifecycle, persistence, private data-store boundary, health, and recovery readiness.
- Evidence that currently planned Product feature categories can build from the canonical
  foundation without creating a second competing foundation or replacing a boundary without
  justification.

#### Explicitly Out of Scope

- Full Songhealth content model implementation.
- News, activities, announcements, services, health services, documents, personnel, organization,
  or ITA feature implementation.
- Homepage composition beyond the minimum public verification behavior.
- Production editorial content.
- Custom RBAC, Module Scope, approval engine, or custom publishing workflow.
- Search feature implementation.
- WordPress content migration or legacy URL migration.
- Dashboard or analytical-domain implementation.
- Custom media, redirect, or importer subsystems.
- A separate Songhealth backend or API server.
- Domain, Application, or Policy layers.
- Redis, a message broker, microservices, or Kubernetes.
- Selection or construction of a monitoring stack.
- Selection of a specific reverse-proxy product.
- General infrastructure not required to prove the platform foundation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a prepared development environment, a maintainer who did not author the setup can
  move from a clean checkout to verified minimum public behavior, CMS administration availability,
  and operational readiness by using only the documented instructions, with zero undocumented
  intervention.
- **SC-002**: Across three consecutive start, stop, restart, and runtime-recreation test cycles,
  100% of the designated validation data and media remain retrievable and unchanged.
- **SC-003**: In the production-boundary verification, 100% of connection attempts from defined
  unintended public paths are rejected while all required application-to-data-store checks succeed.
- **SC-004**: All defined on-demand operational readiness checks produce the expected ready or
  not-ready outcome for normal operation, missing required configuration, an unavailable data
  boundary, and an unavailable or unreadable media boundary. Separate deployment/startup evidence
  establishes compatible platform-native database/migration state and media writeability before the
  environment is accepted as ready for use.
- **SC-005**: A recovery drill restores 100% of the designated validation database records and media
  into a clean or recreated runtime, and comparison evidence shows zero unexplained integrity
  differences. Separate non-secret evidence demonstrates that every required runtime secret/key is
  recoverable through its independently protected path.
- **SC-006**: Review evidence records the result of 100% of the defined setup, startup, lifecycle,
  readiness, private data-store boundary, and recovery checks, with zero undocumented checks needed
  for acceptance.
- **SC-007**: Independent review maps all four currently planned downstream capability
  groups—content models, public pages, publishing behavior, and other bounded Product features—to
  the canonical foundation, with zero second competing foundations and zero platform-boundary
  replacements lacking both a documented requirement gap and an owning-authority amendment.
- **SC-008**: Specification and acceptance review identify zero delivered capabilities from the
  explicit out-of-scope list.

## Assumptions

- The technical architecture is already fixed by
  `docs/website-modernization-docs/current/10-system-blueprint.md`; planning must honor that
  authority without reopening its choices in this specification.
- The public surface for this feature provides only minimum verification behavior; operational
  readiness is determined separately and does not require a public endpoint.
- Validation uses only non-confidential, disposable records and public-publishable media created for
  testing; it does not require any Songhealth Product content type.
- A prepared development environment has the documented prerequisite tools installed before the
  setup validation begins.
- Runtime recreation means replacement of ephemeral runtime components while approved persistent
  stores remain attached; recovery into newly initialized persistence is tested separately.
- A recovery set contains the database and media backup artifacts needed to restore and verify the
  known validation state and common evidence associating them; it does not include runtime secrets
  and does not require atomic or transactionally synchronized creation. Required runtime secrets
  have a separate protected recovery path. Planning selects the smallest recovery procedure that
  satisfies `current/10`. Detailed recovery objectives, long-term retention policy, and continuous
  recovery operations remain later operational decisions unless current authority adds them.
- A production-capable verification environment is available for lifecycle, network-boundary,
  persistence, and recovery tests; selecting a hosting provider is outside this feature.
- Monitoring-stack and reverse-proxy product selection remain outside scope, but observable
  readiness and failure evidence are required.

### Dependencies

- The Songhealth Constitution v2.0.0 remains the governing project contract.
- Product and behavior requirements remain authoritative in
  `docs/website-modernization-docs/current/00-website-foundation.md` through
  `09-migration-plan.md`.
- Technical planning remains constrained by
  `docs/website-modernization-docs/current/10-system-blueprint.md`.
- No application implementation or prior feature artifact is assumed or reused as a requirement
  source.

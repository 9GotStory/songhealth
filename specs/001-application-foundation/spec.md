# Feature Specification: Application Foundation & Development Runtime

**Feature Branch**: Not created; no `before_specify` branch hook is configured

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Create the approved Application Foundation & Development Runtime
Delivery using its READY Delivery Context."

## Clarifications

### Session 2026-08-16

- Q: How should the foundation respond when Development data or an environment lifecycle operation
  is unsafe to continue? → A: Refuse unsafe work, preserve the original failure, provide a safe
  reason code and documented retry/recovery path, and require confirmed ownership-scoped reset or
  cleanup when necessary.
- Q: What disclosure rule should apply to failures across command output, application/container/proxy
  logs, HTTP responses, and Verification reports? → A: Every output surface uses an allowlisted
  diagnostic contract containing only a safe reason code, diagnostic scope/component, safe
  configuration key name, and bounded remediation; raw protected values and unnecessary sensitive
  infrastructure details are forbidden.
- Q: May this foundation use Production-derived data in Development or Production-like Verification?
  → A: No. This Delivery uses only synthetic or explicitly approved non-Production fixtures; any
  future Production-derived-data exception requires a separately approved scope change.
- Q: Which workflow boundaries should define the 20-minute Development target and 10-minute
  Verification target? → A: Measure the complete repository-controlled workflow: Development from
  its first documented setup command through overall readiness, and Verification from its single
  command through build, all contract results, cleanup, and final reporting, after external tools,
  required images, and the release candidate are locally available.
- Q: What evidence should prove that Development data survives a routine restart and that an
  explicit reset affects only the intended local data? → A: Use a Delivery-owned synthetic marker
  plus before/after resource inventories: read the same marker after restart, then prove reset
  removes it, restores migration readiness, and changes only the inventoried Development Data Store
  resources.
- Q: How should incompatible or corrupted Development data be classified for retry, recovery,
  reset, or manual review? → A: Retry only when ownership and integrity checks pass and the
  operation is safely repeatable; recover only with a verified, bounded, non-destructive repair;
  reset only when data is confirmed reconstructible and repair is unavailable or fails; require
  manual review when ownership, integrity, or reconstructibility is uncertain.
- Q: Which canonical identity vocabulary should every artifact use to distinguish authoritative
  environments, execution topology, command/resource selection, and diagnostic reporting? → A:
  Use `environment` (`development | staging | production`), `runtimeProfile`
  (`daily | verification | hosted`), `operationTarget` (`development | verification`), and
  `diagnosticScope` (`foundation | daily | verification`) as distinct dimensions; Compose projects,
  Data Stores, and named volumes are resources associated with an operation target and runtime
  profile, not additional identity types.
- Q: What objective policy should determine when a dependency vulnerability blocks the security
  gate, who may accept an exception, and when remediation is due? → A: Confirmed, foundation-relevant
  findings in the locked release dependency graph are actionable when reachable or
  Production-exposed; unknown reachability or exposure blocks pending triage. Actionable Critical
  and High findings block until fixed or covered by a documented mitigation or risk exception
  (each approved by the Product Owner after security/technical review); Critical exceptions expire
  after 7 days and High exceptions after 30 days. Medium and Low findings require disposition,
  owner, review date, and remediation within 90 and 180 days respectively, but do not block.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a Safe Daily Development Environment (Priority: P1)

As a project maintainer, I can prepare and start the application foundation and its local data
dependency from a clean checkout by following one documented procedure, so I can begin later
feature work without using Production credentials, Production data, or machine-specific services.

**Why this priority**: Every later Delivery depends on a reliable, safe daily development path.
Without it, implementation and verification cannot begin consistently.

**Independent Test**: A maintainer with the documented prerequisites can use a clean checkout to
start the foundation, confirm readiness, preserve local data across a routine restart, explicitly
reset that data, and stop the environment without undocumented intervention.

**Acceptance Scenarios**:

1. **Given** a clean checkout and the documented prerequisites, **When** a maintainer follows the
   daily setup and start procedure, **Then** the application foundation and local data dependency
   become ready without requiring Production secrets or Production data.
2. **Given** local development data exists, **When** the maintainer performs a routine stop and
   restart, **Then** the data remains available.
3. **Given** the maintainer intentionally requests a documented reset, **When** the reset completes,
   **Then** only the Delivery-owned local development data is returned to a known clean state.
4. **Given** required configuration is missing or invalid, **When** startup is attempted, **Then**
   startup fails before accepting work and reports a safe, actionable explanation.

---

### User Story 2 - Run Release-Shaped Verification (Priority: P2)

As a reviewer or release maintainer, I can start a reproducible Production-like Verification
runtime profile and run bounded checks of the built application, proxy boundary, data connectivity,
configuration contract, migration readiness, health behavior, and basic route reachability before
the project reaches Staging.

**Why this priority**: The project needs early evidence that application boundaries work together
under release-shaped conditions while preserving the real hosting environment as the final
authority.

**Independent Test**: Starting the Verification runtime profile from a clean Verification state
produces a clear pass/fail result for each bounded contract and can be repeated without relying on a
running daily Development environment.

**Acceptance Scenarios**:

1. **Given** a valid release candidate and Verification configuration, **When** the reviewer starts
   the Production-like Verification runtime profile, **Then** each required component reports
   readiness and the bounded verification checks complete with an unambiguous result.
2. **Given** one required component or configuration value is unavailable, **When** verification is
   run, **Then** it fails safely, identifies the failed contract, and does not expose protected
   values.
3. **Given** all local verification checks pass, **When** the reviewer reads the result, **Then** it
   clearly states that local success does not claim exact parity with the Production hosting
   environment.

---

### User Story 3 - Extend the Foundation Without Architectural Drift (Priority: P3)

As a future feature maintainer, I can identify the separate public, administrative, and server
responsibilities, shared boundaries, configuration expectations, and common verification entry
points, so later Deliveries can add behavior without creating speculative structure or bypassing
approved ownership.

**Why this priority**: A foundation is valuable only if later work can extend it safely and another
maintainer can understand why each boundary exists.

**Independent Test**: A maintainer unfamiliar with the setup can use the repository guidance to
identify each responsibility boundary, run the relevant foundation checks, and distinguish current
foundation assets from deferred feature-specific work.

**Acceptance Scenarios**:

1. **Given** the completed foundation, **When** a maintainer reviews its structure and guidance,
   **Then** every created area has a current foundation responsibility and no empty feature/module
   hierarchy is presented as completed architecture.
2. **Given** a later Delivery needs a new feature, **When** its maintainer consults the foundation
   guidance, **Then** the appropriate responsibility boundary and verification entry point can be
   identified without relying on undocumented conventions.
3. **Given** an unapproved service, package, or deployment assumption is proposed, **When** the
   foundation scope is checked, **Then** the proposal is identifiable as outside this Delivery and
   requires separate approval.

### Edge Cases

- A required local port or host resource is unavailable: startup fails with a bounded diagnostic
  and does not silently expose a service more broadly or rewrite tracked configuration.
- A previous local data state is incompatible or corrupted: the affected operation target remains
  stopped or not-ready and preserves the original failure. Retry is permitted only when ownership
  and integrity checks pass and the operation is safely repeatable; recovery is permitted only
  through a verified, bounded, non-destructive repair; reset is permitted only when the data is
  confirmed reconstructible, repair is unavailable or has failed, and the exact Delivery-owned
  operation target is confirmed. Uncertain ownership, integrity, or reconstructibility requires
  manual review, and no action may target unrelated or Production data.
- Startup, migration, reset, or cleanup is interrupted: the affected operation target remains
  stopped or not-ready, preserves the original failure result, and permits only a documented safe
  retry or a verified, bounded, non-destructive, ownership-scoped recovery action.
- A Compose project, network, container, or volume is stale, colliding, ambiguously owned,
  mislabeled, or unexpectedly active: destructive work refuses to continue until exact Delivery and
  operation-target ownership is verified and the maintainer explicitly confirms the bounded target.
- The exact Production runtime or database variant is not yet verified: local choices remain
  clearly provisional and no Production-parity claim is made.
- Startup succeeds for one component but another remains unhealthy: overall readiness remains
  failed and identifies the incomplete contract.
- Production-like verification is started while daily development is active: documented isolation
  prevents accidental sharing of credentials or mutable data.
- Startup, stop, and reset procedures are repeated: operations remain predictable and do not
  accumulate duplicate services or ambiguous data ownership.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Delivery MUST provide one coherent application foundation with distinguishable
  public, administrative, and server responsibility boundaries that conform to the approved
  Delivery Context.
- **FR-002**: The foundation MUST remain free of Product-feature behavior; only the minimum behavior
  required to establish startup, readiness, connectivity, and verification MAY be included.
- **FR-003**: Maintainers MUST have one documented daily-development procedure covering
  prerequisites, initial setup, start, readiness confirmation, stop, restart, recovery, safe retry,
  and explicitly confirmed reset or cleanup after a failure. The procedure MUST classify an
  incompatible or corrupted state using the retry, recovery, reset, and manual-review criteria in
  Edge Cases before allowing the corresponding action.
- **FR-004**: Daily development MUST use an isolated, non-Production local data dependency whose
  data survives routine stop/restart operations and changes only through explicit reset or
  migration actions.
- **FR-005**: Local data access MUST be limited to the Development environment by default and MUST use
  credentials distinct from Staging and Production together with synthetic or explicitly approved
  non-Production fixtures. Production-derived data is prohibited in this Delivery.
- **FR-006**: The repository MUST provide safe configuration examples without real secrets, and
  startup MUST reject missing, empty, malformed, unsupported or out-of-range required values and
  forbidden environment/runtime-profile/operation-target/credential/resource combinations before
  accepting work.
- **FR-007**: Missing or invalid configuration MUST produce an actionable failure through the same
  allowlisted diagnostic contract on command standard output/error, application/container/proxy
  logs, HTTP responses, and generated Verification reports. Output MAY contain only a stable safe
  reason code, affected diagnostic scope/component, safe configuration key name, and bounded
  remediation; it MUST NOT contain raw configuration values, credentials, connection strings,
  internal exceptions or stacks, or unnecessary sensitive path, host, container, or proxy details.
- **FR-008**: Maintainers MUST be able to select daily Development or Production-like Verification
  without editing committed configuration or sharing mutable data between operation targets. Every
  artifact MUST keep four identity dimensions distinct: `environment` is
  `development | staging | production`; `runtimeProfile` is `daily | verification | hosted`;
  `operationTarget` is `development | verification`; and `diagnosticScope` is
  `foundation | daily | verification`. Compose projects, Data Stores, and named volumes are
  resources associated with an operation target and runtime profile, not additional identity types.
- **FR-009**: Production-like Verification MUST report distinct results for release-candidate build
  and startup, valid-configuration acceptance and required missing/invalid-configuration rejection,
  migration state/readiness, database connectivity, liveness, readiness, operation-target and
  resource isolation, proxy/forwarded-header trust, public/administrative/server route reachability,
  result reporting, and bounded cleanup.
- **FR-010**: Every Production-like check MUST return an unambiguous pass/fail result and identify
  the failed contract using the FR-007 allowlisted diagnostic contract on every output surface.
- **FR-011**: Verification output and documentation MUST state that the Verification runtime profile
  validates bounded application contracts and does not establish exact parity with the Production
  hosting environment.
- **FR-012**: The foundation MUST include only services, packages, and directories with a current
  Delivery requirement; speculative infrastructure and empty architecture hierarchies are
  prohibited.
- **FR-013**: Common foundation checks MUST be discoverable and runnable through documented entry
  points, with failures causing a non-successful result suitable for local and automated review.
  The risk-based gate MUST cover static/type and boundary checks, independent builds, focused
  configuration rejection and nondisclosure tests, liveness/readiness, real database connectivity
  and migration readiness, operation-target and resource isolation, proxy/route contracts,
  committed-secret detection, dependency-vulnerability review, and a foundation-scoped OWASP ASVS
  5.0.0 applicability/evidence review. Applicable Level 1 controls form the minimum floor; selected
  Level 2 controls require risk justification, and authentication/session controls are explicitly
  not applicable to this Delivery under FR-016. This Delivery MUST NOT claim blanket ASVS
  compliance, impose an arbitrary coverage percentage, or require a premature Product browser
  journey where no Product journey exists. A dependency finding is actionable when it is confirmed,
  affects the locked release dependency graph, is relevant to this foundation, and is reachable or
  Production-exposed; unknown reachability or exposure MUST block pending triage. Actionable
  Critical and High findings MUST block until fixed or covered by a documented mitigation or risk
  exception, each approved by the Product Owner after security/technical review. Critical
  exceptions expire after 7 days and High exceptions after 30 days. Medium and Low findings do not
  block but MUST record disposition, owner, and review date and MUST be remediated within 90 and 180
  days respectively.
- **FR-014**: Setup and operational guidance MUST document prerequisites, configuration ownership,
  daily and verification workflows, data persistence/reset behavior, troubleshooting boundaries,
  and known Production-parity limits.
- **FR-015**: Exact Production runtime and database choices MUST remain evidence-dependent until the
  real hosting environment is inspected; provisional local choices MUST be labeled as provisional.
- **FR-016**: The Delivery MUST NOT add domain schemas, feature APIs, editorial workflows,
  authentication behavior, migration content, or public/admin Product experiences beyond the
  minimum foundation behavior in FR-002.
- **FR-017**: Repeated or interrupted start, stop, restart, migration, reset, and cleanup operations
  MUST leave the affected operation target stopped or not-ready, preserve the original failure
  result, and MUST NOT create duplicate active resources or ambiguous data ownership. Destructive
  reset or cleanup MUST refuse stale, colliding, ambiguous, mislabeled, or unexpectedly active
  resources until exact Delivery/operation-target ownership is verified and the maintainer
  explicitly confirms the bounded target.

### Scope Boundaries

**In scope**:

- The minimum runnable foundation for public, administrative, and server responsibilities.
- A safe daily development workflow and explicit local-data lifecycle.
- A bounded Production-like Verification workflow for release-shaped application contracts.
- Safe configuration examples, readiness behavior, common quality entry points, and maintainer
  documentation.

**Out of scope**:

- Product features, domain-specific data models, feature APIs, business workflows, or finished
  public/administrative experiences.
- Legacy content migration or activation of the deferred migration plan.
- Production deployment, go-live, Production data movement or Production-derived data use, or final
  backup/retention policy. A future Production-derived-data exception requires a separately approved
  scope change.
- Freezing evidence-dependent Production versions, limits, or hosting behavior before inspection.
- Any unapproved distributed service, cache, queue, search service, object storage, orchestration
  platform, package-release system, or other speculative infrastructure.
- Changes to Frozen Product/System behavior or authoritative Source-of-Truth documents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the documented workstation prerequisites and required container images already
  available locally, a maintainer can take a clean checkout from invocation of the first documented
  repository setup command through passing overall Development readiness in 20 minutes or less.
  The timer includes all repository-controlled dependency installation, configuration preparation,
  migration, and startup work; only acquisition of the checkout, external tools, and required images
  is excluded.
- **SC-002**: In 100% of documented routine stop/restart tests, a Delivery-owned synthetic marker
  written before stop remains readable with the same value after restart. In 100% of explicit reset
  tests, that prior marker is absent, required migration readiness is restored, and before/after
  resource inventories show that only the explicitly confirmed Development Data Store resources
  changed; Production, non-Delivery, and Verification resources remain untargeted and unchanged.
- **SC-003**: With documented external tools, required container images, configuration inputs, and
  the release candidate already available locally, the Production-like Verification timer starts
  when its single documented command is invoked and finishes within 10 minutes only after build,
  every FR-009 contract result, bounded cleanup, and the final report complete.
- **SC-004**: All tested missing or invalid required-configuration cases fail before readiness, and
  zero command standard output/error, application/container/proxy log, HTTP response, or generated
  Verification-report results contain any value or detail forbidden by FR-007.
- **SC-005**: A maintainer unfamiliar with the foundation can complete setup, readiness check,
  restart, explicit reset, and Production-like verification from repository guidance without an
  undocumented corrective step.
- **SC-006**: Scope review identifies zero Product-feature implementations, zero unapproved
  services, and zero empty speculative package/module hierarchies in the completed Delivery.
- **SC-007**: All acceptance scenarios and foundation checks pass on two consecutive runs from
  clean, independently initialized daily and Verification operation-target states.
- **SC-008**: Every dependency finding has recorded relevance, severity, reachability, Production
  exposure, mitigation, disposition, owner, and review date. The dependency gate returns a
  non-successful result for unknown reachability or exposure, any actionable Critical or High
  finding without a current approved mitigation or risk exception, and any expired Critical or High
  exception; Medium and Low findings record remediation due dates no later than 90 and 180 days
  respectively without blocking the gate.

## Assumptions

- Maintainers have a supported workstation and the approved prerequisites described by the Frozen
  architecture and Delivery Context.
- The Frozen platform, repository, and environment decisions are constraints for later planning;
  this specification does not reopen them or prescribe exact versions and commands.
- Inspection of the actual Production hosting runtime and database remains a dependency before
  evidence-dependent Production values can be locked or parity can be claimed.
- The daily and Verification runtime profiles use only synthetic or explicitly approved
  non-Production fixtures; this Delivery defines no authorization, retention, or disposal path for
  Production-derived data because such use is prohibited and requires a separately approved scope
  change.
- Minimal readiness and smoke behavior exists only to prove the foundation and is not treated as a
  Product feature.
- The exact mechanics used to satisfy these outcomes will be selected during planning and verified
  against current upstream documentation where version-sensitive behavior matters.

<!--
Sync Impact Report
- Version change: 1.1.0 → 1.1.1
- Bump rationale: PATCH — aligns governance wording with the repository reset by removing
  active-tree references to superseded feature paths; no principle or authority meaning changes.
- Modified principles:
  - None; wording-only governance alignment
- Added principle:
  - None
- Modified sections:
  - Authority and Scope → clarifies that pre-rebaseline artifacts live only in Git history and
    remain non-authoritative unless explicitly retrieved as historical evidence
- Removed sections: None
- Follow-up TODOs: None
-->
# สสอ.สอง Website Constitution

## Core Principles

### I. Security First

Security is the highest technical priority. Every design and implementation MUST apply
security by design in proportion to the actual risks and approved use case. Authentication,
authorization, input handling, data exposure, uploads, administrative functions, sessions,
secrets, and other security-sensitive behavior MUST use explicit, reviewable controls.

Where the approved platform already provides an appropriate security control, the project MUST
prefer and correctly configure that control before creating a parallel security mechanism.
Security controls MUST NOT be weakened for convenience, and security MUST NOT be used to justify
unnecessary architecture. Added complexity requires a documented threat, approved requirement,
or demonstrated operational need.

Rationale: the system publishes official public information and exposes privileged staff
capabilities, so security failures can create both public and administrative harm.

### II. Simple — Structured — Sustainable

Solutions MUST be simple to understand, clearly structured, and sustainable to operate and
maintain. When two approaches satisfy approved requirements with comparable correctness,
security, and usability, the simpler approach MUST be chosen.

Complexity MUST be justified by a current approved requirement, security need, operational
need, or demonstrated maintainability problem. Speculative future-proofing, pattern-driven
architecture, "just in case" infrastructure, and maximum technical sophistication are not
sufficient justification.

A shared abstraction SHOULD have at least two current consumers, unless an explicit product,
security, privacy, or consistency invariant justifies earlier centralization. The project MUST
NOT introduce a subsystem merely to mirror terminology or structure from a previous
implementation.

Rationale: clarity and proportionate structure enable a small team to maintain, operate, and
safely extend the system over time.

### III. Platform-Native First, Minimal Extension

The approved platform and framework capabilities MUST be used as the first implementation path
when they satisfy current Songhealth requirements. The project MUST NOT rebuild a native
capability under a Songhealth-specific abstraction merely because a previous architecture had
one.

Before adding custom infrastructure, framework layers, services, permission models, workflow
engines, indexing pipelines, media systems, importers, or equivalent platform-level mechanisms,
the responsible plan MUST identify a concrete unmet requirement or reproducible platform gap.

A custom extension MUST:

1. address a demonstrated current gap;
2. be the smallest practical change that closes that gap;
3. preserve the Product semantics in the active Source-of-Truth documents;
4. avoid becoming a generic replacement for the underlying platform; and
5. receive focused verification for the gap and its integration boundary.

Direct use of approved platform APIs is allowed where no Songhealth-specific rule requires an
additional layer. Feature-local helpers are preferred over project-wide abstractions until
actual reuse or consistency evidence justifies promotion.

Rationale: Songhealth is a focused public-sector website, not a framework-development project.
Using proven platform capabilities reduces custom code, duplicated behavior, upgrade burden,
and long-term operational risk.

### IV. Requirement-Driven Architecture and Traceability

Architecture and implementation MUST derive from approved requirements and authoritative
project decisions. Technical choices MUST implement product semantics; they MUST NOT silently
redesign the product to suit a framework, library, database, hosting platform, legacy code, or
historical specification.

Material changes to architecture, persistence semantics, public routing/identity,
authentication, authorization, security controls, privacy-sensitive data, publishing behavior,
or cross-domain ownership MUST trace to an approved requirement or explicit Product Owner
decision.

Historical code, tests, specifications, branches, and prior architecture documents MAY be used
as evidence, but they MUST NOT regain authority merely because they already exist. When
authoritative artifacts conflict materially, affected work MUST stop until the conflict is
resolved through the approved review path.

Rationale: traceability prevents implementation convenience and legacy structure from becoming
undeclared product or architecture decisions.

### V. Privacy and Data Minimization by Design

Privacy is a release baseline, not a later enhancement. The system MUST expose, collect,
process, log, and retain only information required by approved purposes. Administrative access
and public disclosure MUST follow least-necessary-access and least-necessary-exposure rules.

Public CMS content and media MUST NOT be treated as confidential-record storage without an
explicit approved requirement and security design. Privacy-sensitive behavior, third-party
technology, and changes to data handling MUST receive the applicable privacy, security, and
release review.

Required Privacy Notice and Cookie Policy obligations MUST remain aligned with the implemented
system and MUST NOT be expanded into consent or tracking machinery that the actual technology
does not require.

Rationale: minimizing data and exposure reduces harm, supports PDPA responsibilities, and keeps
the system accountable to its stated public purpose.

### VI. Quality and Proportionate Verification

A change is not complete merely because it builds. Verification MUST be proportionate to risk
and MUST cover meaningful approved behavior. Depending on the change, this includes unit,
integration, authorization, validation, security, regression, migration, concurrency,
accessibility, or end-to-end verification.

Tests MUST NOT be weakened, bypassed, or rewritten to conceal defects. Blocking defects MUST be
corrected before acceptance; improvements based only on hypothetical perfection MUST NOT block
an otherwise compliant delivery.

When correctness depends on current or version-specific platform behavior, that behavior MUST
be checked against authoritative upstream documentation and, where user-facing behavior matters,
verified with representative Songhealth data or focused UAT. The project MUST test its own
configuration, mappings, assumptions, and custom extensions rather than duplicating the upstream
platform's entire internal test suite.

Rationale: risk-based evidence provides confidence where failure matters while avoiding
ceremonial coverage and disproportionate delivery cost.

### VII. Operational Sustainability

Solutions MUST fit the approved deployment environment, team capability, maintenance capacity,
and actual operational constraints. Infrastructure, services, dependencies, and operational
burden MUST NOT be introduced without a demonstrated, requirement-driven benefit.

Environment-specific values, credentials, hostnames, paths, and secrets MUST NOT be hard-coded
into source where configuration is appropriate. Production-critical persistence and media MUST
have a documented backup and restore path appropriate to the chosen architecture; a convenient
application export MUST NOT be assumed to be full disaster recovery without evidence.

Implementation, tests, configuration guidance, and operational documentation MUST remain
aligned enough for another maintainer to understand the current system and continue work
safely. Runtime failures and required configuration MUST be observable and actionable without
exposing protected information.

Rationale: a correct design that the organization cannot reliably operate, recover, diagnose,
or maintain is not a sustainable solution.

## Authority and Scope

- The Product Owner is the final authority for business requirements, scope, product decisions,
  and acceptance.
- This Constitution is authoritative for durable project-wide engineering principles.
- docs/website-modernization-docs/current/00-website-foundation.md through
  09-migration-plan.md are the active Product/behavior Source of Truth for Songhealth.
- docs/website-modernization-docs/current/10-system-blueprint.md is the active technical
  architecture baseline and MUST implement, not redefine, the Product/behavior Source of Truth.
- Active Spec Kit feature artifacts MUST derive from the current Source of Truth and this
  Constitution. Within an authorized feature, spec.md defines feature requirements,
  plan.md defines the approved implementation approach, and tasks.md defines executable
  work. A downstream artifact MUST NOT silently override an upstream authority.
- Project artifacts created before the Clean Rebaseline v2.2 have been removed from the active
  repository surface. When retrieved from Git history for migration, forensic comparison, or
  historical evidence, they remain non-authoritative and MUST NOT be used to reactivate removed
  architecture or silently define current requirements.
- Code and tests are implementation evidence. They MUST NOT be used to silently change approved
  requirements or decisions.
- Feature-specific rules and implementation details MUST remain in their owning Source-of-Truth
  or feature artifacts rather than being copied into this Constitution as false project
  invariants.
- A material conflict between authorities MUST be reported and resolved through cross-document
  Impact Review or Product Owner decision before affected work continues.

## Delivery and Quality Gates

- Work MUST remain within one approved Delivery or feature at a time and use the smallest
  correct change. Future scope, unrelated refactoring, and speculative abstractions are
  prohibited.
- Requirements and routed authority MUST be established before design; design MUST be
  established before tasks; implementation MUST begin only for an explicitly authorized,
  dependency-ready scope.
- Each Spec Kit phase MUST satisfy its own acceptance gate. Agents MUST stop after the requested
  phase and MUST NOT advance automatically.
- Any proposed custom subsystem or cross-cutting abstraction MUST identify the accepted
  requirement, the native-platform capability considered, the demonstrated gap, and why the
  proposed extension is the smallest correct solution.
- Plans, tasks, implementation reviews, and acceptance reviews MUST verify compliance with this
  Constitution and the relevant approved requirements and decisions.
- Security-, privacy-, migration-, or public-publication-sensitive work MUST identify its
  authoritative requirement or decision, expected controls, and proportionate verification
  before implementation is accepted.
- Version-specific assumptions about the selected CMS/runtime MUST be verified before they
  become task-level contracts.
- Deviations MUST be explicit, justified by authoritative evidence, and approved at the proper
  authority level. A delivery deadline alone does not authorize a deviation.

## Governance

- The Constitution governs project-wide engineering practice but does not replace Product Owner
  authority or the active Product/Architecture Source-of-Truth documents within their scopes.
- Amendments MUST be limited to durable project-wide principles, include an explicit rationale
  and impact assessment, receive Product Owner approval, and be applied through the Spec Kit
  constitution workflow. Feature-specific changes MUST use their owning artifact instead.
- Constitution versions follow semantic versioning: MAJOR for incompatible principle or
  governance removals/redefinitions, MINOR for new principles or materially expanded
  obligations, and PATCH for non-semantic clarifications or corrections.
- Every plan and implementation review MUST include a Constitution compliance check. Any
  non-compliance MUST be corrected or documented as an explicitly approved exception before
  work advances.
- Changes to docs/website-modernization-docs/current/ that materially alter ownership,
  semantics, public routing, security/privacy behavior, or architecture MUST receive
  cross-document consistency review before downstream specifications are updated.
- When this Constitution conflicts materially with the active Product/Architecture Source of
  Truth, work MUST stop; the conflict MUST be routed through Impact Review and Product Owner
  decision rather than resolved silently.

**Version**: 1.1.1 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-10-06

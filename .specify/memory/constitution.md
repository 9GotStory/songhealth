<!--
Sync Impact Report
- Version change: unestablished placeholder scaffold / 1.0.0-proposed input → 1.0.0
- Modified principles:
  - Placeholder Principle I → I. Security First
  - Placeholder Principle II → II. Simple — Structured — Sustainable
  - Placeholder Principle III → III. Requirement-Driven Architecture and Traceability
  - Placeholder Principle IV → IV. Privacy and Data Minimization by Design
  - Placeholder Principle V → V. Quality and Proportionate Verification
  - Added Principle VI: Operational Sustainability
- Added sections:
  - Authority and Scope
  - Delivery and Quality Gates
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

Security controls MUST follow the approved security baseline and MUST NOT be weakened for
convenience. Security MUST NOT be used to justify unnecessary architecture: added complexity
requires a documented threat, approved requirement, or demonstrated operational need.

Rationale: the system publishes official public information and exposes privileged staff
capabilities, so security failures can create both public and administrative harm.

### II. Simple — Structured — Sustainable

Solutions MUST be simple to understand, clearly structured, and sustainable to operate and
maintain. When two approaches satisfy approved requirements with comparable correctness and
security, the simpler approach MUST be chosen.

Complexity MUST be justified by a current approved requirement, security need, operational
need, or demonstrated maintainability need. Speculative future-proofing, novelty, and maximum
technical sophistication are not sufficient justification.

Rationale: clarity and proportionate structure enable a small team to maintain, operate, and
safely extend the system over time.

### III. Requirement-Driven Architecture and Traceability

Architecture and implementation MUST derive from approved requirements and authoritative
project decisions. Technical choices MUST implement product semantics; they MUST NOT silently
redesign the product to suit a framework, library, database, hosting platform, or existing code.

Material changes to architecture, persistence semantics, public identifiers, authentication,
authorization, security controls, privacy-sensitive data, or workflow state MUST trace to an
approved requirement or explicit Product Owner decision. When authoritative artifacts conflict
materially, affected work MUST stop until the conflict is resolved through the approved review
path.

Rationale: traceability prevents implementation convenience from becoming an undeclared product
or architecture decision.

### IV. Privacy and Data Minimization by Design

Privacy is a release baseline, not a later enhancement. The system MUST expose, collect,
process, log, and retain only information required by approved purposes. Administrative access
and public disclosure MUST follow least-necessary-access and least-necessary-exposure rules.

Privacy-sensitive behavior, third-party technology, and changes to data handling MUST receive
the applicable privacy, security, and release review. Required Privacy Notice and Cookie Policy
obligations MUST remain aligned with the implemented system and MUST NOT be deferred until after
release.

Rationale: minimizing data and exposure reduces harm, supports PDPA responsibilities, and keeps
the system accountable to its stated public purpose.

### V. Quality and Proportionate Verification

A change is not complete merely because it builds. Verification MUST be proportionate to risk
and MUST cover meaningful approved behavior. Depending on the change, this includes unit,
integration, transport, authorization, validation, security, regression, concurrency, or
end-to-end verification.

Tests MUST NOT be weakened, bypassed, or rewritten to conceal defects. Blocking defects MUST be
corrected before acceptance; improvements based only on hypothetical perfection MUST NOT block
an otherwise compliant delivery. When correctness depends on current or version-specific
third-party behavior, that behavior MUST be checked against Context7 or authoritative upstream
documentation without overriding project authority.

Rationale: risk-based evidence provides confidence where failure matters while avoiding
ceremonial coverage and disproportionate delivery cost.

### VI. Operational Sustainability

Solutions MUST fit the approved deployment environment, team capability, maintenance capacity,
and actual operational constraints. Infrastructure, services, dependencies, and operational
burden MUST NOT be introduced without a demonstrated, requirement-driven benefit.

Implementation, tests, configuration guidance, and operational documentation MUST remain aligned
enough for another maintainer to understand the current system and continue work safely. Runtime
failures and required configuration MUST be observable and actionable without exposing protected
information.

Rationale: a correct design that the organization cannot reliably operate, diagnose, or maintain
is not a sustainable solution.

## Authority and Scope

- The Product Owner is the final authority for business requirements, scope, product decisions,
  and acceptance.
- This Constitution is authoritative for durable project-wide engineering principles. Approved
  and Frozen Source-of-Truth documents remain authoritative for their product, architecture,
  domain, security/privacy, and operational scopes.
- Active feature artifacts govern only their approved feature scope in the order
  `spec.md` → `plan.md` → `tasks.md`. Routing and status files are pointers and workflow mirrors;
  they MUST NOT redefine authoritative content.
- Code and tests are implementation evidence. They MUST NOT be used to silently change approved
  requirements or decisions.
- Feature-specific rules and implementation details MUST remain in their owning Source-of-Truth
  or feature artifacts rather than being copied into this Constitution as false project
  invariants.
- A material conflict between authorities MUST be reported and resolved through Impact Review or
  Product Owner decision before affected work continues.

## Delivery and Quality Gates

- Work MUST remain within one approved Delivery or feature at a time and use the smallest correct
  change. Future scope, unrelated refactoring, and speculative abstractions are prohibited.
- Requirements and routed authority MUST be established before design; design MUST be established
  before tasks; implementation MUST begin only for an explicitly authorized, dependency-ready
  scope.
- Each Spec Kit phase MUST satisfy its own acceptance gate. Agents MUST stop after the requested
  phase and MUST NOT advance automatically.
- Plans, tasks, implementation reviews, and acceptance reviews MUST verify compliance with this
  Constitution and the relevant approved requirements and decisions.
- Security- or privacy-sensitive work MUST identify its authoritative requirement or decision,
  expected controls, and proportionate verification before implementation is accepted.
- Deviations MUST be explicit, justified by authoritative evidence, and approved at the proper
  authority level. A delivery deadline alone does not authorize a deviation.

## Governance

- The Constitution governs project-wide engineering practice but does not replace Product Owner
  authority, feature specifications, or approved Source-of-Truth decisions within their scopes.
- Amendments MUST be limited to durable project-wide principles, include an explicit rationale and
  impact assessment, receive Product Owner approval, and be applied through the Spec Kit
  constitution workflow. Feature-specific changes MUST use their owning artifact instead.
- Constitution versions follow semantic versioning: MAJOR for incompatible principle or governance
  removals/redefinitions, MINOR for new principles or materially expanded obligations, and PATCH
  for non-semantic clarifications or corrections.
- Every plan and implementation review MUST include a Constitution compliance check. Any
  non-compliance MUST be corrected or documented as an explicitly approved exception before work
  advances.
- When this Constitution conflicts materially with approved Product or Frozen Source-of-Truth
  content, work MUST stop; the conflict MUST be routed through Impact Review and Product Owner
  decision rather than resolved silently.

**Version**: 1.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-16

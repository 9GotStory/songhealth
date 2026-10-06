# Songhealth Constitution

## Core Principles

### I. Current Authority and Clean Rebuild

Current Product Owner decisions are the highest authority. This Constitution governs durable
project practice. `docs/website-modernization-docs/current/00-website-foundation.md` through
`09-migration-plan.md` define current Product and behavior truth, and
`docs/website-modernization-docs/current/10-system-blueprint.md` defines current technical
architecture. README files and repository guidance apply only where they are consistent with those
authorities. Active specifications, plans, tasks, code, tests, and operational evidence are
downstream and MUST NOT silently override an upstream authority.

Requirements, architecture, feature scope, and implementation patterns MUST be derived from the
current authority, not from deleted code, deleted specifications, old branches, old Delivery
artifacts, or Git history. Historical material MAY be consulted only when an approved task requires
narrow migration provenance, governance metadata, forensic comparison, or historical evidence; it
MUST NOT become current Product or architecture authority by implication.

When authorities conflict or current evidence requires a change, work MUST stop at the affected
boundary until the Product Owner resolves the conflict or the owning current document is amended and
accepted. This preserves one explicit current baseline and prevents historical or downstream drift.

### II. Platform-Native First, Minimal Extension

Songhealth MUST use supported Astro and EmDash capabilities, configuration, and extension points
before creating a Songhealth-specific abstraction. A custom plugin, hook, helper, service, or other
extension is permitted only when an accepted current requirement exposes a demonstrated native
capability gap. The gap MUST be documented, the extension MUST be the smallest correct solution, and
its behavior MUST receive focused verification.

The project MUST NOT recreate removed Domain, Application, or Policy layers; custom RBAC or Module
Scope; an Approval Engine; search infrastructure; a media subsystem; a redirect subsystem; an
importer framework; or any other speculative abstraction merely because it existed historically.
Complexity requires current evidence and approval, not precedent.

### III. Simple, Structured, Sustainable

The project MUST choose the simplest architecture that correctly satisfies approved requirements.
Data and responsibilities MUST remain clearly structured, while code, configuration, and operations
MUST remain understandable, maintainable, and transferable to future maintainers. Speculative
infrastructure, premature abstraction, duplicate mechanisms, and cleverness without demonstrated
value are prohibited.

Environment-specific values MUST use supported configuration mechanisms and MUST NOT be hard-coded.
Secrets MUST remain outside the repository. Design and implementation decisions MUST preserve
operational clarity, reproducibility, and an explicit owner for persistent data and system behavior.

### IV. Security and Data Protection

Security by design and least privilege are mandatory. Songhealth MUST use platform-native,
server-enforced security controls before creating parallel custom mechanisms; client-side visibility
MUST NOT be treated as authorization. Secrets MUST remain outside source control, production
PostgreSQL MUST NOT be publicly exposed, and credentials and storage access MUST be limited to the
minimum required scope.

The CMS and its media storage are limited to public-publishable website content. Confidential health
records MUST NOT be stored in them. Any handling of personal or sensitive data MUST minimize
collection, enforce an explicit purpose and access boundary, and follow the current Product and
architecture authorities.

### V. Spec-Driven Delivery and Human Authorization

There is no standing implementation authorization. Each feature MUST proceed through the current
Spec Kit artifacts and the review gates required for its scope. For the initial clean rebuild, the
required sequence is:

`Specify -> Clarify -> Plan -> Checklist -> Tasks -> Analyze -> Human Gate`

Implementation MUST NOT begin until the active feature has approved `spec.md`, `plan.md`, and
`tasks.md`; required dependencies are ready; required reviews have passed; and the Product Owner has
explicitly authorized a bounded implementation scope. An authorization applies only to the named
scope and MUST NOT be inferred for later phases or adjacent tasks. Agents MUST stop at the requested
Spec Kit phase and MUST NOT implement future tasks opportunistically.

## Independent Implementation Review

Under the agreed Multica workflow, Codex is the lead and independent reviewer, and Claude Code is
the implementation executor. An implementation task is not complete merely because the executor
reports success. Every bounded implementation MUST provide verification proportionate to its risk
and MUST receive independent review before Product Owner acceptance. Review MUST check the approved
specification, plan, tasks, this Constitution, applicable current authority, and relevant
operational or security boundaries.

Parallel work is permitted only when task dependencies and file, data, service, and deployment
boundaries make concurrent changes safe. Parallel tasks MUST have explicit ownership and MUST NOT
create conflicting edits, hidden ordering dependencies, or shared-resource races.

## Production Operations and Durability

Production deployment MUST conform to
`docs/website-modernization-docs/current/10-system-blueprint.md`. The current production baseline is
rootless Podman managed by systemd Quadlet, with an Astro SSR and EmDash application container,
PostgreSQL on a private application network, and persistent PostgreSQL and media storage. Docker or
Docker Compose MUST NOT be maintained as a parallel production baseline, and Kubernetes is not a
Version 1 baseline. A future baseline change requires an accepted architecture decision in the
owning current authority before downstream work changes.

Persistent data MUST survive application and database container replacement or recreation.
Production readiness MUST include start, restart, health, private-network, and persistence checks,
plus backup and restore readiness proportionate to the change risk. Development tools MAY run
natively and do not need containers unless container use provides useful parity or verification.

## Governance

Amendments require explicit Product Owner approval. Every amendment MUST document its impact and use
semantic versioning:

- MAJOR for incompatible governance changes, including removal or redefinition of a principle;
- MINOR for a new principle or materially expanded governance requirement; and
- PATCH for clarifications or non-semantic wording corrections.

Each feature specification, plan, checklist, task set, implementation review, and acceptance
decision MUST be checked for compliance with this Constitution and its upstream authorities. A
discovered conflict MUST be resolved explicitly; downstream artifacts MUST NOT normalize or
conceal it.

When a Product or behavior decision changes, the owning document in `current/00-09` MUST be updated,
cross-document consistency reviewed, and human accepted before downstream implementation changes.
When a technical architecture decision changes, `current/10-system-blueprint.md` MUST be updated and
accepted first. Implementation-specific detail belongs in the owning current document or active
feature artifact and MUST NOT be promoted into this Constitution unless it is durable,
non-negotiable governance.

Compliance review is required at every gate. Any exception MUST be explicit, bounded, justified by
current evidence, and approved by the Product Owner before affected work proceeds.

**Version**: 2.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-10-06

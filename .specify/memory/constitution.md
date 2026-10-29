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

Verification and process MUST be proportionate to actual risk. The project MUST NOT build oversized
verification frameworks, gate simulators, synthetic evidence ledgers, review-orchestration
machinery, additional approval engines, or duplicated security mechanisms where platform-native
controls and focused tests suffice. Simplification MUST NOT remove a security control that an
accepted requirement needs.

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
Spec Kit artifacts and the verification required for its scope. For the initial clean rebuild, the
required sequence is:

`Specify -> Clarify -> Plan -> Checklist -> Tasks -> Analyze -> Human Gate`

Implementation MUST NOT begin until the active feature has approved `spec.md`, `plan.md`, and
`tasks.md`; required dependencies are ready; the preceding Spec Kit stages are complete; and the
Product Owner has explicitly authorized a bounded implementation scope. An authorization applies
only to the named scope and MUST NOT be inferred for later phases or adjacent tasks. Agents MUST
stop at the requested Spec Kit phase and MUST NOT implement future tasks opportunistically.

## Development Execution, Verification and Acceptance

Claude Code is the sole AI development tool for Songhealth. Within a scope the Product Owner has
authorized, Claude Code is responsible for requirements clarification and implementation planning,
Spec Kit artifact preparation, source implementation, automated test authoring, debugging and
corrective development, code self-review, security-focused code inspection, refactoring where
necessary, acceptance evidence preparation, and reporting unresolved risks to the Product Owner.
Self-review MUST check the approved specification, plan, tasks, this Constitution, applicable
current authority, and relevant operational and security boundaries. Claude Code MAY use separate
review sessions or subagents when technically useful. Codex and ChatGPT are removed from the
Songhealth workflow: no Codex, ChatGPT, or other external AI tool takes part in development, review,
assessment, or approval. Self-review MUST be reported as self-review: no Claude Code session,
subagent, or tool result may be presented as independent third-party review.

Until Feature 002 is complete, development uses Claude Code with Spec Kit and GitHub only. After
Feature 002, the Product Owner intends to move development to Claude Code with the "Matt skills"
workflow; that change takes effect only through its own amendment.

The Product Owner retains exclusive authority to approve new features and material scope changes;
approve architecture and governance changes; authorize destructive or sensitive operations;
authorize production deployment and runtime provisioning; approve Git merges and final feature
acceptance; and accept documented exceptions to mandatory requirements.

A Product Owner approval for a bounded task covers the ordinary work needed to complete that scope:
fixing defects, improving tests, correcting or refactoring the implementation, re-running tests, and
repeating self-review. That work does not require a new approval for each correction and MUST NOT
create new documentation-correction cycles, approval gates, or verification frameworks. Work MUST
stop for a new Product Owner decision before a correction crosses the approved boundary: new source
scope, an architectural change, a destructive or sensitive operation, a runtime action not yet
authorized, or an exception to a security or other mandatory requirement.

Acceptance is evidence-based. Work is complete only when the evidence shows the approved
requirements, a correct source implementation, passing applicable automated tests, security
verification proportionate to the risk, GitHub CI results where CI is configured for the change, any
required runtime evidence, and Product Owner acceptance. A Claude Code PASS report never accepts work
by itself, and the absence of an external AI review never blocks it. A known material security
defect, a failed required test, or an unresolved mandatory runtime check blocks acceptance until it is
corrected and verified or the Product Owner records an explicit exception.

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

Each feature specification, plan, checklist, task set, implementation self-review, and acceptance
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

Records produced under earlier versions — Multica, ChatGPT, and Codex assignments, reviews, verdicts,
PASS/REWORK/BLOCKED outcomes, and the evidence they cite — remain unchanged provenance; their verdicts
are neither reinterpreted nor rewritten. Where an approved artifact written before 5.0.0 requires a
Codex, ChatGPT, Lead, or other external Independent Review step, or Multica execution, for work that
is still open, that step is satisfied by the evidence-based acceptance of §Development Execution,
Verification and Acceptance; the artifact text need not be rewritten. A defect found by an earlier
review stays open until it is corrected and verified or the Product Owner records an explicit
exception.

### Accepted Amendment — 2026-10-14

Product Owner direction `01a13882-2e10-7cbf-b207-409fdd20b9b3` replaces the standing
Codex-reviewer/Claude-executor assignments with bounded Multica execution, ChatGPT Independent
Review and Product Owner final acceptance/implementation authorization. Version 2.0.0 → 3.0.0
is MAJOR because these assigned governance responsibilities change incompatibly. Principles I–V,
Spec Kit stages, the Human Authorization Gate, separation of duties, evidence requirements and
Feature 001 T022/T028 dependencies are preserved. Prior authorship and accepted review evidence
remain valid provenance, not standing assignments. ChatGPT Independent Review PASS and Product
Owner approval are recorded in `01a13896-b7d9-700e-9ea6-00973f11d963`. That approval authorizes
finalization, commit and push of this documentation reconciliation only; it authorizes no Feature 002
implementation, Feature 001 runtime gate execution, merge or deployment.

### Accepted Amendment — 2026-10-25

Product Owner ratification of 2026-10-25 (official decision:
https://github.com/9GotStory/songhealth/pull/38#issuecomment-6395631601) amends §Independent
Implementation Review: Claude Code CLI is the primary Developer and Codex CLI the Independent
Reviewer, with GitHub as the source of truth for source, issues, pull requests and CI, one
authorized implementation task at a time, no self-review, and all existing Spec Kit stages,
Human Authorization Gates, evidence requirements and Product Owner authority unchanged.
Version 3.0.0 → 4.0.0 is MAJOR because these assigned governance responsibilities change
incompatibly, reversing the executor/reviewer assignments accepted at 3.0.0. Principles I–V,
security and data-protection rules, dependency policy, production operations, PO authority,
accepted amendment records, Feature 001 dependency joins and Feature 002 acceptance records
are preserved. The 2026-10-13/2026-10-14 Multica-first assignments and their accepted evidence
remain valid provenance, not standing assignments. This amendment was prepared and
independently reviewed in PR #38 (Codex CLI re-review R1 PASS) and became effective with the
recorded Product Owner ratification above.

### Accepted Amendment — 2026-10-28 (5.0.0)

The Product Owner governance-reform authorization of 2026-10-28 ("Claude Code Only Workflow —
Constitution V5") replaces §Independent Implementation Review with §Development Execution,
Verification and Acceptance. Claude Code becomes the sole AI development tool, responsible for
implementation, testing, self-review, and correction within an authorized scope; Codex CLI and
ChatGPT are removed from the workflow entirely (no review, assessment, or approval role); completion
becomes evidence-based. Until Feature 002 is complete, development uses Claude Code with Spec Kit
and GitHub only; the Product Owner's intended post-Feature-002 move to Claude Code with the "Matt
skills" workflow requires its own amendment. Principle V no longer names review gates as an
implementation precondition, Principle III adds the proportional-verification rule, and Governance
adds the rule for pre-5.0.0 records. Version 4.0.0 → 5.0.0 is MAJOR because it removes and redefines
the review responsibilities and completion conditions of 4.0.0. Principles I–V, the Spec Kit stages,
Human Authorization Gates, Product Owner authority, security and data-protection rules, dependency
policy, production operations, runtime restrictions, accepted amendment records, Feature 001
dependency joins, and Feature 002 acceptance records are otherwise preserved. The Product Owner
ratified this amendment on 2026-10-28 (decision given in the Claude Code development session and
recorded in this amendment's pull request on GitHub); it takes effect when that pull request is
merged.

**Version**: 5.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-10-28

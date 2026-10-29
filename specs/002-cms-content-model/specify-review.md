# Feature 002 Specify Review Handoff

**Date**: 2026-10-13
**Issue**: 9GOTSTORY-204
**Author**: Codex only
**Phase**: Specify only
**Reviewers**: ChatGPT Independent Review; Product Owner Human Acceptance
**Standing**: Supporting Specify evidence, not Product/architecture authority, a plan, or approval.

## Baseline and official workflow evidence

- Repository verified as `https://github.com/9GotStory/songhealth.git`.
- Remote base `refs/heads/001-platform-foundation`, fetched base, and initial clean managed
  checkout HEAD all resolved to `67770b0ebf77b623af838d4a77b186a358b7ff4e`.
  Before feature creation, HEAD was explicitly positioned at that remote base.
- No existing remote `002-*` branch or local Feature 002 directory was found. Feature numbering
  and Git extension configuration were sequential, with empty branch template/prefix.
- Installed `specify version`: CLI **1.1.0**. Project init/integration/core manifest also **1.1.0**;
  all **12** installed core files matched their manifest SHA-256 values.
- `specify artifact info command:speckit.specify --json` resolved the official core command.
  `specify preset resolve spec-template` selected `.specify/templates/spec-template.md`,
  core layer. Local Codex/Claude integration metadata is present; agent-specific skill bundles
  were not recreated or committed.
- Current official Specify instructions were checked through Context7 `/github/spec-kit` and
  directly against [the upstream command](https://github.com/github/spec-kit/blob/main/templates/commands/specify.md).
  The slash command is an agent instruction workflow, not a `specify specify` shell subcommand.
  Codex followed it in this session using the installed supported hook/core scripts.
- Mandatory `before_specify` hook: `speckit.git.feature`, enabled, non-optional, no condition.
  Executed once via:
  `bash .specify/extensions/git/scripts/bash/create-new-feature-branch.sh --json --short-name cms-content-model '<feature description>'`.
  JSON returned `BRANCH_NAME=002-cms-content-model` and `FEATURE_NUM=002`.
- Core feature initialization executed once via:
  `bash .specify/scripts/bash/create-new-feature.sh --json --short-name cms-content-model '<feature description>'`.
  It copied the resolved template to `specs/002-cms-content-model/spec.md` and persisted the
  ignored machine-local `.specify/feature.json` pointer. Branch creation and document creation
  were distinct supported operations; no manual feature-branch naming shortcut was used.
- Codex filled the template's mandatory sections and ran its built-in Specify quality evaluation.
  The optional after-Specify Git commit hook is registered, but `auto_commit.after_specify.enabled`
  and its default are false. No auto-commit or later-phase hooks were enabled. Any delivery commit
  is an explicit document-only handoff commit, not a hook or phase advancement.
- The full multi-phase workflow was not invoked. No tool installation/upgrade, vendored skill
  bundle, application/schema/dependency change, runtime operation, or production action was needed.

## Content Model §23 mapping-gate screening

Each row answers: **G1** entity or presentation/classification; **G2** whether existing
field/taxonomy/media/settings primitives suffice; **G3** concrete reuse/relationship requirement;
**G4** duplication benefit versus maintenance. These are semantic screening results, not approved
collection definitions or an implementation plan. A conditional row does not authorize a collection.

| Candidate / owning section in `02-content-model.md` | G1: meaning | G2: native primitive sufficiency | G3: real reuse/relationship need | G4: duplication / maintenance decision |
| --- | --- | --- | --- | --- |
| Basic Page, §3 | General informational entity | Existing content fields; no model layering | Optional relevant assets/Documents | Candidate only for information without a more specific kind |
| News, §4 | Time-oriented story entity | Content fields, classifications, media, system lifecycle | Related Document/facility only where actual discovery needs it | One source reused in views; no Featured/Health News collection |
| Activity, §5 | Activity with event facts | Content/date/location/media/gallery/classification primitives | Personnel only for useful internal reuse; external participants may be text | No duplicate News or mandatory participant entities |
| Announcement, §6 | Official notice entity | Fields/dates/classification and Document references | Attached authoritative Documents | No expiry-driven custom workflow |
| Health Content, §7 | Evergreen guidance entity | Fields/classification/media/review metadata | Topic/source and useful assets | Distinct meaning from News; no auto-unpublish mechanism |
| Personnel, §8 | Public directory identity | Fields and smallest assignment representation; Q2 pending | Organization where useful; assignment history only where confirmed | Same person reused; no executive subtype/HR/account mirror |
| Organization, §9 | Conditional reusable organization identity | Owner fields may suffice absent structured reuse | Reused unit/affiliation object with its own metadata | Entity only when actual duplication savings justify maintenance |
| Area, §10 | Hierarchical reference/classification | Hierarchical taxonomy or reference primitive; metadata needs must decide | Shared service areas and official-coded references | No automatic Area collection; no analytical store |
| Health Service, §11 | Real facility entity | Fields/classification/relations/media | Organization, offered Services, service Areas | Facility identity reused; location distinct from service area |
| Service, §12 | Citizen guidance entity | Fields/classification/reference primitives | Documents and offering Health Services | One guidance source for multiple facilities; no transaction engine |
| Document, §13 | Semantic record around a public file | Content metadata and native file reference | About/Service/Report/Announcement/ITA share authoritative file | Semantic record justified; no separate generic File model |
| Raw media, §14 | Existing asset resource | Native Media Library and field/gallery metadata | Reusable images/files and evidence | No duplicate Media collection or DAM |
| Contact, §15 | Owner-specific public values by default | Owner fields or office/site settings | Shared object only if cross-owner maintenance is demonstrated | No generic Contact collection without that evidence |
| Health Report, §16 | Report metadata entity | Fields and Document reference | Authoritative report Document | No extracting PDF metrics into CMS |
| Dashboard, §17 | Separate analytical responsibility | CMS primitives are not its data owner | Stable identifiers only if later bounded integration needs them | No CMS metric collection or new data-platform infrastructure |
| ITA Year/Section/Requirement, §18 | Year-specific structural resources | Smallest structured field/relation representation; exact count deferred | Year→Section→Requirement→ordered evidence | Separate structure only as hierarchy/editor usability requires |
| ITA Evidence, §18 | Ordered target/context item | Document/media/URL reference plus label/order | Existing Document or media reused where practical | No assumed standalone routable Evidence or snapshot engine |
| Topic/Audience/Category/Type, §21 | Classification by default | Taxonomy/field when sufficient | Shared classification/discovery | Collection only if genuine metadata/identity demands it |
| Native metadata, §§1–2 | Platform-owned editorial identity/state | Native metadata sufficient per authority; pinned behavior checked later | Stable references/authorship/revisions | No duplicate custom IDs/states/timestamps |
| Featured/leadership/filter views, §§4/8 | Presentation/assignment view | Existing content references/configuration | Select/reuse existing records | No new content kind |
| Workflow/audit/search entities, §22 | Excluded infrastructure | Use existing platform capability | No accepted need for parallel subsystem | Do not create |

For relationships (§19), reuse native reference/constraint mechanisms first. Explicit screening:

| Relationship | Product meaning / G1 | Native sufficiency / G2 | Actual reuse / G3 | Benefit vs cost / G4 |
| --- | --- | --- | --- | --- |
| Personnel→Organization | Public assignment/unit association | Native reference or smallest owner representation | Only confirmed organizational reuse/history | No relation/assignment collection without the use case |
| Health Service→Organization | Facility affiliation | Optional native reference | Shared affiliation where meaningful | Avoid duplicates; no mandatory organization records for every label |
| Health Service↔Service | Offered-service association | Native relation/reference candidate | One Service offered in several real facilities | Reuse both identities; no separate relationship service |
| Health Service→Area | Service-area classification/reference | Taxonomy/reference candidate, official codes required when linking | Shared hierarchical areas | Location is a separate value; exact representation deferred |
| Service→Document | Guidance/forms attached to service | Native semantic Document reference | Existing authoritative file reused | No upload copy per service |
| Health Report→Document | Report's authoritative file | Native Document reference | Reusable semantic public report | No metrics extraction or extra file layer |
| ITA hierarchy/evidence | Year-specific parents, order, and evidence context | Smallest native structured/relation/reference candidates | Existing Documents/media, links, stable historical context | No standalone evidence requirement or auto-carry-forward |
| Other optional content links | Discovery/reuse only | Native references when warranted | Must have a recorded actual use case | No all-to-all theoretical relation graph |

Before any later collection/relation definition, all four answers must be supported by the actual
Product case and pinned-release capabilities. Failure is a review gate, not extension authorization.

## Requirement and acceptance coverage

| Requirements | Scenarios / future outcomes |
| --- | --- |
| FR-001–003 | US1.1–6; US7.2; SC-001/006; Q1 limits requiredness |
| FR-004–007 | US2.1–5; US5.5; SC-002 |
| FR-008–010 | US3.1–5; SC-001/005; Q2 limits history |
| FR-011–013 | US4.1–5; SC-003 |
| FR-014–017 | US5.1–5; SC-004; Q3 limits historical-year inventory/corrections |
| FR-018–019 | US1–4 classified/reused fields and owner contact; SC-001/003/008 |
| FR-020–027 | US6.1–7; US7.2; SC-005/006 |
| FR-028–030 | US2.5/US3.1/US3.5/US7.1–2, domain date edge cases; SC-001/007/008 |
| FR-031–032 | This gate screening, Scope/Dependencies; SC-008 |

## Native capability evidence and limits

- Existing architecture mandates native EmDash collections/fields/taxonomies/relations/media/
  settings and editorial/RBAC before extensions (`10-system-blueprint.md` §§4–7/11–12/22).
- At the base, `package.json` pins `emdash` **1.1.0**; the empty seed and integrated
  configuration are foundation evidence only. No Product collections or editorial behavior are
  runtime-established by Feature 002.
- Context7 `/websites/emdashcms` checked current vendor documentation on 2026-10-13:
  [seed primitives](https://docs.emdashcms.com/themes/seed-files) and
  [Astro integration responsibilities](https://docs.emdashcms.com/coming-from/astro).
  These support native candidate screening, not exact field/cardinality/schema recipes.
  They are **unversioned vendor documentation**, not pinned-1.1.0 compatibility or runtime proof.
- Area representation, assignment storage, ITA evidence storage, exact constraint behavior, and
  revision/scheduling enablement are deliberately unselected. Later work must verify actual pinned
  support before depending on any of them; no extension is currently demonstrated or authorized.
- This run created no custom infrastructure, application code, schema, seed data, or dependencies.

## Foundation dependencies and authorization limits

- Current Feature 001 sources and evidence are preserved byte-for-byte.
- T022 production durability and T028 recovery remain **PENDING**, not PASS. T028 retains the join
  of T022 PASS and accepted T023–T027 sources. T030 retains the join of T028 PASS and accepted
  T029 sources. Early T029 source review does not satisfy runtime or final acceptance.
- This issue explicitly authorizes early Feature 002 Specify only. The readiness gate for any
  subsequent Feature 002 work remains a Product Owner decision; no runtime waiver is inferred.
- `PROJECT-STATUS.md` and `PRE-IMPLEMENTATION-GATE.md` are absent at baseline; Feature 001
  clarifications are embedded in its spec. Their absence does not authorize further phases.

## Findings and review request

- Specify output is reviewable but not fully ready: Q1 requiredness, Q2 assignment history, and
  Q3 ITA historical years/corrections remain unanswered. See the spec for options and affected rules.
- The quality checklist deliberately leaves four items incomplete. It is Codex's author evaluation,
  not an independent review or PASS decision.
- Deliberate workflow limit: upstream Specify normally solicits answers to unresolved markers;
  this issue instead requests those questions as a handoff for independent review/Human Acceptance.
  Questions were recorded and no answer or Clarify session was invented.
- ChatGPT must independently review Product completeness, scope, conditional model choices,
  mapping-gate answers, quality findings, and preservation of pending Feature 001 dependencies.
  Product Owner acceptance and separate authorization are required before Clarify or any later phase.

## Document verification

- Staged whitespace check passed. Changed paths are exactly the three new Feature 002 Markdown
  documents; no existing tracked file or Feature 001 source/evidence changed.
- Mandatory template sections, seven numbered user stories, 32 functional requirements, eight
  measurable success criteria, and exactly three unresolved question markers were checked.
- All local Markdown links resolve; no runtime-local filesystem links or template placeholders
  remain. The quality checklist records 12 passing and four incomplete author-evaluated items.
- No application tests or operational gates were run: this is a document-only Specify change.
  Product outcomes, pinned-release behavior, and pending runtime gates remain unverified here.

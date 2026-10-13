# Implementation Plan: CMS Content Model

**Feature**: `002-cms-content-model` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Working branch**: `agent/codex-lead-reviewer/477dbb76ad5b`
**Verified continuation HEAD**: `b614c8f283394381d0cb45c2b2903e28c49b75fc`
**Product decision**: `01a13788-95c6-72f5-8787-f86b4e0c5fd6`

**Status**: Official Plan Phase 0 research and Phase 1 design complete; documentation awaits
Independent Review. No implementation, UAT/runtime PASS, final foundation acceptance or merge.
Command stops here. Do not start Checklist, Tasks, Analyze or Implementation in this run.

## Summary

Extend the existing canonical platform with native semantic content collections, classifications,
media/file fields and limited reusable relationships. Adopt native mandatory-reference create/save
requiredness for Health Report → Document; other relations stay optional/editor-reviewed. A finite
native publication plugin checks observable candidate fields/current taxonomy selections at manual
publish, schedule acceptance and due-time publication. It reconstructs no reference selections and
owns no storage, routes, locks, scheduler or RBAC.

B-Q1-REF is resolved by explicit Product change, not repaired internals or passed deferred tests.
Q2 current Personnel assignments remain. D-ITA structured historical evidence and D-REF cross-record
availability/removal/atomic guarantees remain deferred. Ordinary shared media can change/disappear.
Legacy ITA disposition and Feature 001 operational acceptance remain separate.

## Technical Context

**Language/Version:** TypeScript 6.0.3, Node 24.21.0, npm 12.2.0 (unchanged pins).
**Dependencies:** Astro 7.3.5, EmDash 1.1.0, Node adapter 11.1.6 standalone, React integration 6.0.5,
React 19.2.4, pg 8.23.1. No added/upgraded dependency.
**Storage:** Existing native PostgreSQL adapter/PostgreSQL 18.6; local media `./media`;
native core/schema/relations own persistence. Seed/configuration is bootstrap intent, not an
automatic production migration. No schema/seed/DB change is delivered by this Plan.
**Testing:** Future native API/Playwright 1.63.0 fixtures and staff UAT in the one native development
environment; pinned-runtime readiness remains a prerequisite to executing them. Source/Markdown
checks in this run are not application/runtime acceptance.
**Platform:** Linux Astro SSR; native Node/npm development with rootless-Podman PostgreSQL helper;
existing rootless Podman + systemd Quadlet production/private database contract remains unchanged.
**Project type:** One integrated CMS-backed website, native Admin primary staff interface.
**Performance goals:** No new quantitative target; representative maintenance/reuse and seven active
SC outcomes. Paginate native selectors/reads, avoid per-consumer duplicate files/records; no search
projection or capacity subsystem.
**Constraints:** Public-publishable information only; native security/lifecycle; no custom CMS,
Media, reference adapter, internal reference-table access, promotion mirror, RBAC or historical
subsystem; no public-page/consumer API implementation, migration, infrastructure or production action.
**Scale/scope:** Ten unconditional content collections plus one conditional Organization definition;
native Area/classification taxonomies/media/settings. Twelve semantic matrix rows (Area is not a
content collection), six active stories/seven active SCs; four ITA rows/US5/SC-004 remain deferred.

## Constitution Check — Before Research and After Design

| Principle | Pre-research assessment | Post-design assessment |
| --- | --- | --- |
| I: current authority | Latest explicit Product decision resolves native Q1 applicability; owning 02/05/07/10 reconciled | Spec/matrix/design agree; no other Product meaning amended, historical answers remain provenance; review precedes implementation |
| II: native first | Required-reference save behavior accepted; previous adapter investigation closed | Native schema/relations/fields/UI; one finite supported content-data/taxonomy hook for the demonstrated publication-only validation need, with focused future tests |
| III: simplicity | One canonical foundation; no deferred-invariant workaround | Ten semantic content kinds; conditional Organization only for demonstrated reuse; taxonomy Area; no duplicate Media/Contact/system fields, custom relation engine or speculative infrastructure |
| IV: security/data | Native roles/ownership, public-only data, private production DB/secrets preserved | Native signed preview and published-context reads; validation hook has only policy/taxonomy-read capabilities, no DB/network/storage; no confidentiality/retention guarantee for media |
| V: phased authorization | Existing Plan continuation only; no setup/Specify/Clarify restart | Phase 0 decisions complete; data model/contracts/quickstart generated; stop at normal Plan boundary, no later command or implementation |
| Independent review | Codex-only planning authorship, no production authorship | Author design assessment only; Independent Review and human approval are not claimed |
| Operations | T022/T028 PENDING; original dependency joins | Unchanged sources/config/pins/runtime contracts; no waiver, PASS marker, merge/deployment |

Author assessment: no unjustified violation, exception or Constitution amendment. Post-design
assessment is complete for the proposed design; it is not independent PASS or runtime SC acceptance.
Blueprint §§7/22 already allow the finite supported hook with focused verification. No new
architecture foundation or additional approval workflow is introduced.

## Content Model §23 Mapping Gate

[data-model.md](data-model.md#23-mapping-accounting) accounts for every collection, classification,
media/settings primitive and relationship under all four questions. Ten real semantic identities
justify native collections; Area/topics/audiences/types use taxonomies. Organization and its links
are conditional on demonstrated shared metadata, with owner-text defaults. Every relation has
explicit source, target, cardinality, reuse purpose and requiredness. No automatic conditional
reference enforcement is inferred; required Report Document uses native flags.

Result: complete planning mapping with no speculative/duplicate subsystem. Actual inventories,
conditional reuse case, label comprehension and fixture outcomes remain implementation/UAT inputs,
not unresolved design architecture. §23/SC-008 runtime or independent acceptance is not asserted.

## Project Structure

### Documentation Delivered

```text
specs/002-cms-content-model/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── native-editorial.md
│   └── public-read.md
├── quickstart.md
├── native-feasibility.md       # historical finding; resolved by current Product decision
└── scope-reconciliation.md    # historical scope handoff; current Q1 supersedes prior rule
```

Original Specify/Clarify review/checklist artifacts and superseded options/upstream draft remain
historical evidence. The upstream request is still unsubmitted/cancelled. No `tasks.md` or later
quality checklist/analysis artifact is generated.

### Planned Application Touch Points — Not Implemented

```text
astro.config.mjs                      # native plugin descriptor registration only when authorized
seed/seed.json                        # native bootstrap schema intent after design acceptance
src/plugins/publication-validation.ts # finite native hooks; no relation adapter or public route
tests/browser/                       # future native Admin/API and focused publication scenarios
```

`src/live.config.ts` keeps its single native `_emdash` registration. No Domain/Application/Policy
layer, parallel backend, infrastructure directory or new production topology is introduced. The
planned source paths express bounded configuration/validation work; no source file was created now.
The active native schema is authoritative; inspect/apply schema through native operations during a
separately authorized implementation, never assume editing seed changes an initialized database.

## Requirement Coverage

| Stable requirement IDs | Planning artifact / verification ownership |
| --- | --- |
| FR-001/003/030 | Data model's ten native semantic kinds and native system metadata; US1/SC-001 journeys |
| FR-002/026 | Revised Q1 matrix, native editorial validation contract and save/publish/schedule/due-time fixtures; B-Q1-REF resolved by current Product decision |
| FR-004–007 | Document/file/Report identity and six native reuse relations; shared-source/public-read contract and SC-002 |
| FR-008/009 | Current Personnel fields and separate native account permissions; US3 current-assignment/SC-001 fixture |
| FR-010 | Conditional Organization variant only on demonstrated reuse; existing §23 input and US3.3 |
| FR-011–013 | Guidance/facility/Area types, four ownership meanings and reciprocal native relation; US4/SC-003 |
| FR-014–017 | D-ITA: preserved deferred texts/US5/SC-004; no active model/contract/test denominator |
| FR-018/019 | Native classifications, site settings and owner contact fields; no duplicate classification/Contact entities |
| FR-020 | Native public-read/authorized-preview contract, missing-target integration scenarios |
| FR-021–025 | Native roles, lifecycle, staged data, one-time scheduling, locks/revisions, Trash/restore/purge; editorial contract and SC-005/006 |
| FR-027/028 | Native administrative boundaries/public-publishable data only; no sensitive fields/secret-bearing deliverables |
| FR-029 | Native Thai field/collection labels with correct platform fallback; staff US7/SC-007 UAT |
| FR-031/032 | Complete §23 resource/relation accounting and pre/post Constitution assessment; SC-008 future independent acceptance |

SC-001/002/003/005/006/007/008 remain future active outcomes. SC-004 is deferred. Historical
Q1–Q4 answers and all FR/story/SC identifiers remain traceable; only the explicitly authorized
Q1 behavior is revised in current acceptance. No result is counted as passed by the design itself.

## Verification Design and Implementation Dependencies

[quickstart.md](quickstart.md) supplies prerequisites, runnable native environment commands and
end-to-end acceptance journeys tied to the two contracts/model. Verify native create/save refusal
for a missing mandatory Document, optional relations, valid cardinality, incomplete scalar drafts,
field/classification publication checks at all three supported points, scheduler failure behavior,
metadata boundaries, current Personnel, reciprocal identity, public/preview permissions and Thai UAT.
Conditional relationships are not automated publication fixtures; D-ITA/D-REF are not PASS denominators.

Remaining inputs: real classification/Area code sources, service/facility records, any genuine shared
Organization case, staff label/role assignment/site timezone, approved implementation artifacts and
bounded authorization. Values are not fabricated in this Plan. Native configuration must retain the
validation plugin active; administrative schema/plugin changes can invalidate configured checks.
Integration/build/API/scheduler/UAT verification is future work; the local Node is not the pinned
version, and no application runtime or database was started during planning.

Feature 001 T022 durability and T028 recovery remain **PENDING**. T028 requires T022 PASS plus
Codex-accepted T023–T027 sources (including runtime-secret recovery prerequisite). T030 requires
T028 PASS plus accepted T029 sources. T029 source review is not runtime/final foundation acceptance.
Required readiness/dependency evidence belongs to later implementation/acceptance authorization;
this Plan neither executes nor waives it.

## Official Workflow Completion and Hook Disposition

Original official setup/template remain the same feature artifacts; no reinitialization. Installed
Specify CLI 1.1.0 Plan instructions were checked against upstream. Phase 0 decisions are consolidated
in research; Phase 1 model/contracts/quickstart generated; post-design Constitution check performed.
Research was direct under Codex-only instructions. No new Spec Kit phase or approval loop.

Before/after Plan hooks were read and parsed: optional enabled `speckit.git.commit`, null condition,
auto-commit disabled. Both optional extension hooks are skipped; no mandatory hook exists. Explicit
delivery commit is separate from auto-commit. Command ends after this Phase 1 design handoff for
Independent Review. It does not trigger its Tasks/Checklist handoffs.

## Complexity Tracking

No Constitution exception/violation is proposed. The only planned custom code is finite native
publication validation for data/classification predicates that differ from save-time rules. Native
required references require no custom adapter. No generalized rules engine, storage or middleware
layer is justified or included.

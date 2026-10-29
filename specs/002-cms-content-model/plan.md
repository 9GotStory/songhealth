# Implementation Plan: CMS Content Model

**Feature**: `002-cms-content-model` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Input**: Existing Feature 002 specification inspected against the approved native-only Product decision.
**Working branch**: `agent/codex-lead-reviewer/477dbb76ad5b`
**Verified continuation HEAD**: `51a949e0d37965d22212e707dbd4557a905d5bd4`
**Current instruction**: `01a137d4-3956-7621-92a5-a654dea51ef2`, native-only Plan reconciliation.

**Status**: Installed official `$speckit.plan` executed for reconciliation of the existing feature.
Phase 0 research and Phase 1 design are complete for Independent Review of this revision.
Direct GitHub edits were inspected as candidates, not promoted to accepted workflow outputs.
No implementation, integration/UAT/runtime PASS, final foundation acceptance or merge.
Command stops here. Do not start Checklist, Tasks, Analyze or Implementation in this run.

**Development-runtime reconciliation (2026-10-16)**: the Product Owner's persistent
development-runtime decision (Multica issue 9GOTSTORY-232) supersedes the native-host
development workflow this Plan's earlier environment wording assumed. Development-platform
operational assumptions are reconciled accordingly (single persistent rootless-Podman runtime;
see [quickstart.md](quickstart.md) and the [README](../../README.md)) without changing the
approved Product Model, native-only CMS architecture, verification design or the Production
design.

**Single-runtime test-architecture correction (2026-10-19; pending independent
review):** the Product Owner reaffirmed that all integration checks share the
one persistent Astro/EmDash server, PostgreSQL and media. T021's earlier
standalone programmatic-`dev()` harness is incompatible with this boundary and
must not be implemented. A development-only SSR fixture may be registered in
the **existing** server only after pinned-version feasibility, production
exclusion, runtime source identity and separately authorized controller-compatible
source/config maintenance are verified; the test coordinator never starts
another app. This operational reconciliation changes no native CMS/Product
requirements and does not authorize source promotion, restart or T022 execution.

**Development-runtime replacement (2026-10-28, Product Owner decision; T036):** the
UID-1000 rootless Podman + systemd Quadlet runtime at `http://127.0.0.1:4324`
(`docs/operations/development-quadlet.md`) replaces the UID-1001 runtime as the single
development runtime and test target. The single-runtime rule above is unchanged and now
applies to that runtime; source reaches it through `scripts/dev-runtime-update.sh`. The
UID-1001 runtime was deleted on 2026-10-29 (T037). No native
CMS/Product requirement, verification design or Production design changes.

## Summary

Extend the canonical platform with native semantic collections, classifications,
media and reusable relationships. Native schema owns required/type/value checks
and references at create/save; native RBAC, lifecycle and built-in validation own
Publish/Schedule. Record titles, Document files and required Health Report →
Document references are native save-time requirements. Other content values and
taxonomies are staff-maintained optional data. **No Songhealth publication
validation hook, approval flow, confirmation UI, adapter or secondary CMS.**
D-ITA/D-REF and Feature 001 runtime dependencies remain unchanged.

## Technical Context

**Language/Version:** TypeScript 6.0.3, Node 24.21.0, npm 12.2.0 (unchanged pins).
**Primary Dependencies:** Astro 7.3.5, EmDash 1.1.0, Node adapter 11.1.6 standalone, React integration 6.0.5,
React 19.2.4, pg 8.23.1. No added/upgraded dependency.
**Storage:** Existing native PostgreSQL adapter/PostgreSQL 18.6; local media `./media`;
native core/schema/relations own persistence. Seed/configuration is bootstrap intent, not an
automatic production migration. No schema/seed/DB change is delivered by this Plan.
**Testing:** Future focused native API/build/Playwright 1.63.0 checks proportionate to changed
configuration and one bounded staff-maintenance assessment in the existing development environment.
Native public-query integration remains required; production Passkey automation, full browser UAT
per task, durability/recovery drills and deployment checks are not this feature's development work.
Pinned-runtime readiness is a prerequisite; source/Markdown checks here are not runtime acceptance.
**Platform:** Linux Astro SSR; development runs on the single UID-1000 rootless Podman +
systemd Quadlet development runtime (containers `songhealth-qdev-app`/`songhealth-qdev-db`,
promoted source checkout, `http://127.0.0.1:4324` — see T036, [quickstart.md](quickstart.md)
and the [README](../../README.md)); existing rootless Podman + systemd Quadlet production/private
database contract remains unchanged.
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
| I: current authority | Native-only Product instruction inspected against owning 02/05/06/07/10 and candidate spec; stale Q1 traceability corrected before design | Spec/matrix/design agree on Save requiredness and direct publishing; GitHub edits are reconciled workflow inputs, not assumed accepted outputs |
| II: native first | Native save-time requiredness retained; previous adapter investigation closed | Native schema/relations/fields/UI and direct RBAC publishing; Product Owner removed proposed publication-specific plugin |
| III: simplicity | One canonical foundation; no deferred-invariant workaround | Ten semantic content kinds; conditional Organization only for demonstrated reuse; taxonomy Area; no duplicate Media/Contact/system fields, custom relation engine or speculative infrastructure |
| IV: security/data | Native roles/ownership, public-only data, private production DB/secrets preserved | Native RBAC/preview, published-only reads and save-time checks; no custom publishing hook or confidentiality/retention guarantee for media |
| V: phased authorization | Official setup resolves existing Feature 002 and preserves its plan; no new feature/branch or Specify/Clarify restart | Phase 0 decisions reused/checked; Phase 1 artifacts reconciled; stop at normal Plan boundary, no Tasks/Analyze/Implementation |
| Independent review | Codex-only planning authorship, no production authorship | Author design assessment only; Independent Review and human approval are not claimed |
| Operations | T022/T028 PENDING; original dependency joins | Unchanged sources/config/pins/runtime contracts; no waiver, PASS marker, merge/deployment |

Author assessment: no unjustified violation, exception or Constitution amendment. Post-design
assessment is complete for the proposed design; it is not independent PASS or runtime SC acceptance.
Blueprint §§7/22 permit extensions only for real gaps; no publication-hook gap is
retained under the latest Product decision. No architecture or approval flow is added.

## Content Model §23 Mapping Gate

[data-model.md](data-model.md#23-mapping-accounting) accounts for every collection, classification,
media/settings primitive and relationship under all four questions. Ten real semantic identities
justify native collections; Area/topics/audiences/types use taxonomies. Organization and its links
are conditional on demonstrated shared metadata, with owner-text defaults. Every relation has
explicit source, target, cardinality, reuse purpose and requiredness. No automatic conditional
reference enforcement is inferred; required Report Document uses native flags.

Result: complete planning mapping with no speculative/duplicate subsystem. Required title/file/
Report-reference flags use native Save validation; other fields retain native optionality. Removing
publication completeness requirements removes the former plugin need, without satisfying D-ITA/D-REF.
Actual inventories,
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
historical evidence. The upstream request is still unsubmitted/cancelled. Existing checklists and
their review markers are preserved, not re-evaluated by Plan. No `tasks.md` or analysis is generated.

### Planned Application Touch Points — Not Implemented

```text
seed/seed.json  # native bootstrap schema intent; initialized schema requires native operations
tests/browser/  # focused native Admin/API and required public-query integration fixtures
```

The previously proposed `src/plugins/publication-validation.ts` and Astro plugin
registration are **cancelled**. No Songhealth publishing plugin/capabilities,
second foundation, custom content API, reference adapter or policy engine is planned.
`src/live.config.ts` retains its single native `_emdash` registration. The active
native schema is authoritative; seed edits alone do not migrate an initialized DB.

## Requirement Coverage

| Stable requirement IDs | Planning artifact / verification ownership |
| --- | --- |
| FR-001/003/030 | Data model's ten native semantic kinds and native system metadata; US1/SC-001 journeys |
| FR-002/026 | Current native-only Q1 matrix; save-time requiredness plus native RBAC/lifecycle fixture outcomes, no custom publication-completeness plugin |
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

[quickstart.md](quickstart.md) supplies prerequisites, persistent-runtime environment commands and
end-to-end acceptance journeys tied to the two contracts/model. Verify native create/save refusal
for missing/cleared required title, Document file and mandatory Report Document, optional relations,
valid cardinality and otherwise incomplete drafts,
native Publish/Schedule authorization, native validation/failure behavior, scheduler failure behavior,
metadata boundaries, current Personnel, reciprocal identity, public/preview permissions and Thai UAT.
Conditional relationships are not automated publication fixtures; D-ITA/D-REF are not PASS denominators.

Remaining inputs: real classification/Area code sources, service/facility records, any genuine shared
Organization case, staff label/role assignment/site timezone, approved implementation artifacts and
bounded authorization. Values are not fabricated in this Plan. No Songhealth validation plugin or
registration precondition is required.
Integration/build/API/scheduler/UAT verification is future work. This run's shell has Node 24.11.0
and npm 11.6.1 rather than pinned 24.21.0/12.2.0; neither was changed. No application runtime,
database, authentication session or test was started during planning.

Feature 001 T022 durability and T028 recovery remain **PENDING**. T028 requires T022 PASS plus
Codex-accepted T023–T027 sources (including runtime-secret recovery prerequisite). T030 requires
T028 PASS plus accepted T029 sources. T029 source review is not runtime/final foundation acceptance.
Required readiness/dependency evidence belongs to later implementation/acceptance authorization;
this Plan neither executes nor waives it.

## Official Workflow Completion and Hook Disposition

The installed Specify CLI 1.1.0 official Plan instructions were loaded and executed. Its actual
`.specify/scripts/bash/setup-plan.sh --json` ran with explicit existing-feature resolution and
`SPECIFY_FEATURE_NO_PERSIST=1`. It resolved this spec/plan and skipped copying over the existing plan.
The resolver selected canonical `.specify/templates/plan-template.md`; its Technical Context,
pre/post Constitution gates, project structure and complexity sections govern this reconciliation.
The script's logical feature context is `002-cms-content-model`; the actual managed Git branch
remains `agent/codex-lead-reviewer/477dbb76ad5b` at the verified input SHA above.

Phase 0 reused valid exact-release research and checked only the changed save-validation mapping.
The input-spec Q1 conflict was corrected under the explicit instruction; Phase 1 model, contracts
and quickstart were reconciled and the post-design Constitution/§23 checks completed. No unresolved
architecture clarification or unjustified gate violation was found. Research was direct under
Codex-only instructions; no new feature, branch, workflow phase or approval loop.

Before/after Plan hooks were read and parsed: optional enabled `speckit.git.commit`, null condition,
auto-commit disabled. Both optional extension hooks are skipped; no mandatory hook exists. Explicit
delivery commit is separate from auto-commit. Command ends after this Phase 1 design handoff for
Independent Review. It does not trigger its Tasks/Checklist handoffs.

## Complexity Tracking

No Constitution exception/violation is proposed. No custom publication code is planned. Native save-time required
fields/references require no adapter, and native RBAC/lifecycle needs no extra review/confirmation.
No generalized rules engine, storage, middleware or plugin layer is justified or included.

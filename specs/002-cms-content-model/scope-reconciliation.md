# V1 Scope Reconciliation — Plan Phase 0 Human Gate

**Date**: 2026-10-14 | **Issue**: 9GOTSTORY-207 | **Feature**: `002-cms-content-model`

**Product Owner direction**: `01a135e9-23e0-78c3-bcea-c752516828a8` (2026-10-13).
**Verified baseline HEAD**: `e2903e41be6aebd849352d4cc452906eb3d796fd`.
**Working branch**: `agent/codex-lead-reviewer/477dbb76ad5b`.

**Standing**: Author documentation assessment for ChatGPT Independent Review and Human Acceptance.
This is the existing Spec Kit Plan Phase 0 gate, not completed Plan, independent PASS, runtime
acceptance, a new phase/feature, or implementation authorization. Stop after this review handoff.

## Revised V1 and Deferred Scope

| Capability | Reduced V1 | Deferred / limits |
| --- | --- | --- |
| Basic Page, News, Activity, Announcement, Health Content | Ordinary distinct semantic content and native editorial maintenance | No public page implementation in Feature 002; no duplicate Featured/Health News kinds |
| Document/native Media and Health Report | One semantic source/file reused across retained contexts; report metadata around a Document | Current native source can change/be removed; no immutable byte/history promise or automatic removal veto |
| Personnel / Organization | Current assignment/unit/visibility on same Personnel identity; account/access separate; Organization only with demonstrated reuse | No assignment history; ITA history not attached to Personnel acceptance |
| Service / Health Service / Area | Guidance, facilities, reciprocal reuse and official/stable hierarchical codes | Native representation/cardinality choices still require Plan evidence; no analytical/transaction engine |
| Q1 | Incomplete drafts; applicable publication-required values at publish, schedule acceptance and due-time execution; original optional/conditional meaning on 12 retained rows | Four ITA rows deferred; schema requiredness must not silently block drafts. Required selection does not prove target availability/immutability |
| Native lifecycle/access/validation | Supported entry revisions/preview/locks, publish/schedule/unpublish/trash/restore, native roles/ownership, content-admin purge boundary, supplied-value/selection/cardinality validation | Separately maintained metadata/related records and bytes are not a blanket atomic draft snapshot; remaining exact-release proof is needed |
| Q4 independent public-read safety | Published-only linked reads; omit unavailable content, safe missing-file state; optional unavailability does not block the parent; native permissions remain | Neither a stored required selection nor permission/usage/staff review enforces cross-record availability/removal safety |
| **D-ITA** (Q3 plus structured ITA scope) | **Excluded from V1 acceptance** | Year/Section/Requirement/ordered Evidence, public historical retention, preserved/immutable targets under shared edits, traceable historical correction; not implemented or passed |
| **D-REF** (unavailable Q4 enforcement) | **Excluded from V1 acceptance** | Published-required-target unpublish/trash/purge/media removal vetoes; cross-record atomic availability at publish/schedule commit and under concurrent/later change; original no-cascade/retention enforcement; not implemented or passed |

No ordinary Basic Page/Document workaround is designated as a replacement ITA workflow. No
legacy ITA content/binary/URL is removed, migrated or withdrawn by this documentation change.
Its future delivery/cutover disposition remains a separate explicit decision, not a V1 feature PASS.

## Requirement Traceability

The four original accepted-answer entries and their comment IDs remain in `spec.md` as historical
provenance. The later scope decision overrides their V1 applicability explicitly. Identifiers are
kept stable rather than deleting or renumbering deferred work.

| Original requirement / fixture | Current disposition / spec location |
| --- | --- |
| Q1; FR-002; US1.6–7; original 16-row publication matrix | Q1 retained on 12 ordinary rows; four ITA rows copied to a labelled deferred matrix. Field/selection requiredness unchanged for retained rows |
| Q2; FR-008/009; US3.4; SC-001 | Current assignments/accounts distinction retained; historical ITA condition removed from active Personnel acceptance |
| Q3; US5.1–6; FR-014–017; SC-004 | Entire structured historical ITA journey deferred D-ITA. Story slot, four FR identifiers and SC-004 remain clearly outside V1 fixture/PASS denominators |
| Q4; original US2.6 | Missing selected report Document now tests Q1. Guaranteed available published target/file at action commit is deferred D-REF; selecting an ID is not a passed availability test |
| Q4; US2.7; FR-020 | Public-only/omitted unavailable target behavior retained and extended to safe unavailable-file representation, without promising parent/target atomicity |
| Q4; original US6.8; stronger parts FR-025/026, SC-005/006 | Removal veto/atomic cross-record fixture retained under D-REF, not replaced by a native-role test. Current US6.8 tests the independent actor permission boundary |
| FR-001/003–007; US1/2; SC-001/002 | Ordinary content, Document/media identity reuse and report meaning retained; references to active ITA reuse removed |
| FR-010–013; US3/4; SC-001/003 | Conditional Organization, services/facilities/Areas retained; no added entity or real inventory invented |
| FR-018/019/027–032; US7; SC-007/008 | Classification/contact/native metadata, admin boundaries, public-data safety, Thai maintenance and mapping gate retained |
| FR-021–024; US6.1–7; retained SC-005/006 | Native author/publisher/admin, lifecycle, entry revision/preview/schedule/failure protections retained at actual native scope; no blanket shared-metadata/bytes freezing |
| Original source review/checklist artifacts | `clarify-review.md`, `specify-review.md` and `checklists/requirements.md` remain unchanged historical evidence, not approval of this revised scope |
| Previous blocked Plan/options/upstream request | Current plan/research explain the reduced acceptance boundary. Older supporting artifacts are labelled superseded; request cancelled/unsubmitted and upstream pursuit stopped |

All **32 FR identifiers**, **seven story slots** and **eight SC identifiers** remain. V1 has six
active stories and seven active success criteria; US5 and SC-004 are deferred, with FR-014–017 in
the deferred requirement section. No new FR number or implementation task is created.

Retained Q1 matrix rows are Basic Page, News, Activity, Announcement, Health Content, Personnel,
conditional Organization, Health Service, Service, Document, Health Report and Area reference.
Deferred rows are ITA Fiscal Year, Section/MOIT, Requirement/Item and Evidence item. A later
representation might use fewer collections; these counts describe semantics, not approved schema.

## Content Model §23 Screening

All rows below are scope/candidate screening, not Phase 1 schema, field or relation definitions.
The four questions are: real Product entity versus presentation/classification; native primitive
sufficiency; real reuse/relationship need; and duplication benefit relative to maintenance cost.

| Candidate | 1. Product identity / meaning | 2. Smallest native candidate | 3. Real need | 4. Duplication versus maintenance / disposition |
| --- | --- | --- | --- | --- |
| Basic Page | General prose without another structured kind | Native collection/body fields | About/office prose | Reuse one source; cannot substitute for structured or deferred ITA resources |
| News | Time-oriented story | Native collection/media/taxonomies | News categories/topics and current reuse | Avoid duplicate Featured/Health News kinds |
| Activity | Event/date/location/participants distinct from publication | Native fields/gallery candidate | Actual activity facts | External participants may be text; no forced Personnel graph |
| Announcement | Notice/details/type/domain dates | Native fields/taxonomy/Document selector | Applicable attachments/guidance | Closure remains domain metadata; no extra editorial state |
| Health Content | Evergreen guidance/source/topic/review metadata | Native rich content/media/taxonomy | Public health guidance | No review-date scheduler or separate subtype |
| Personnel | Public person/current assignment | Native collection/current fields | Reused public identity | One identity across leadership/current views; no history/account duplication |
| Organization (conditional) | Reused identity/type/contact/responsibilities | Native fields until a real reusable entity is justified | Only recorded shared-object use case | No collection split by conceptual name or speculative unit graph |
| Health Service | Real facility/code/status/location | Native collection/fields/reference candidate | Services offered and service areas | One facility identity; not patient/HIS or service transaction |
| Service | Citizen guidance/provider/channels/steps | Native fields/selector candidate | Facility offerings and relevant Documents | Reuse guidance rather than duplicate per facility; no case engine |
| Document | Metadata around a public file | Native collection + file field | Announcement/Service/Report reuse | One current source avoids per-context upload; no immutable-history guarantee |
| Health Report | Report metadata/period/source | Native collection + selected Document | Published report discovery | Metadata reuse; no PDF metrics dataset |
| Area | Shared coded hierarchy | Native hierarchical taxonomy or reference candidate | Service area/location/shared official IDs | Choose by actual metadata/query need; no assumed Area table |
| Topic/Audience/Category/Type | Classification, not full entity | Native taxonomy/select | Shared filtering/classification | No speculative classification collections |
| Raw media/system metadata/contact | Platform asset/identity or owner value | Native media/metadata/settings/owner fields | Shared files and appropriate contact | Reject duplicate Media/File/Contact/editorial-identity entities |
| Personnel/Organization, facility/Organization | Entity link only when Organization reuse exists | Native reference/relation candidate | Confirmed ownership/affiliation | Conditional; no blanket links between all collections |
| Facility/Service and facility/Area | Offering/coverage distinction | Native reciprocal relation/hierarchical selection candidate | US4 explicit both-direction fixture | One underlying link/identity, not copied service/facility records |
| Service/Document and Report/Document | Relevant supporting or report file | Native selection/relation candidate | US2/US4 explicit reuse | No context duplicate files or custom relationship service |
| Document successor / other optional links | Domain successor or useful discovery | Native optional reference only when needed | Actual source/use case | No universal relation matrix or automatic cascade |
| ITA structure/evidence and reference/history enforcement | Deferred semantic scope/invariant | **No V1 representation selected** | Not a V1 acceptance need after decision | No ITA/snapshot/locking/retention collections or substitute workaround |

§23 passes the reduced-scope screening at author-assessment level: no speculative infrastructure
or native duplicate is needed to express the retained meaning. Exact field types, conditional reuse,
cardinality and complete final relation accounting await official remaining Plan work; this is not
SC-008 runtime acceptance or a completed model design.

## Cross-document Changes and Consistency

| Changed current authority | Direct effect |
| --- | --- |
| 00 website foundation | Removes active structured ITA module/workflow/history promise; keeps deferred meaning and legacy evidence untouched |
| 01 information architecture | Marks structured ITA domain and relationships deferred, with no active V1 requirement |
| 02 content model (principal) | Q2 current assignment; ordinary Document reuse; deferred ITA semantics; Q1/native validation and D-REF limits; active relation/model list reconciled |
| 03 sitemap | Removes ITA from required V1 navigation; labels patterns reserved/deferred, not new required routes; no legacy redirect/withdrawal action |
| 05 Admin (principal) | Deferred ITA workspace/journey and revised Admin acceptance; media maintenance limits explicit |
| 06 permissions | Clarifies native administrator-only content purge versus distinct native media/ownership deletion authority; neither is a Q3/Q4 veto |
| 07 publishing (principal) | Native action/revision scope, Q1 mapping need, no cross-record/purge/media veto claim, ordinary operational precautions labelled as such |
| 08 search | Removes structured ITA from V1 eligible results/groups; retains applicable Document/report fiscal-year discovery |
| 09 migration | Defers structured ITA target/conversion mapping; preserves known source exceptions and requires separate future disposition, with no migration execution |
| 10 blueprint (principal) | Keeps platform/native configuration/deployment; records EmDash 1.1.0 limits and deferred ITA/reference enforcement; excludes those fixtures from V1 testing summary |

Scope revisions use versions 2.3 for affected current/00–09 and 2.4 for current/10, explicitly
marked for review/acceptance; the Constitution remains 2.0.0. Current/04 Homepage already derives
navigation from 03 and handles unavailable curated sources, so it needs no edit. Current/06's
hypothetical collection example is not a V1 ITA obligation; its actual edit only clarifies the
native content-purge versus raw-media permission boundary.
No foundation spec/task/evidence is used as new Product authority or changed for this reconciliation.

Active statements were checked across current/00–10 and Feature 002 for residual ITA obligations,
unqualified Q3/Q4 veto/atomicity promises, stale phase authorization and downstream scope counts.
Deferred source meaning and historical answers stay explicitly labelled, rather than being lost.

### Changed Files and Verification

The documentation diff contains these 17 files:

```text
docs/website-modernization-docs/current/00-website-foundation.md
docs/website-modernization-docs/current/01-information-architecture.md
docs/website-modernization-docs/current/02-content-model.md
docs/website-modernization-docs/current/03-sitemap.md
docs/website-modernization-docs/current/05-admin-cms.md
docs/website-modernization-docs/current/06-roles-permissions.md
docs/website-modernization-docs/current/07-publishing-workflow.md
docs/website-modernization-docs/current/08-search.md
docs/website-modernization-docs/current/09-migration-plan.md
docs/website-modernization-docs/current/10-system-blueprint.md
specs/002-cms-content-model/spec.md
specs/002-cms-content-model/plan.md
specs/002-cms-content-model/research.md
specs/002-cms-content-model/scope-reconciliation.md
specs/002-cms-content-model/phase0-options.md
specs/002-cms-content-model/upstream-feasibility.md
specs/002-cms-content-model/upstream-request-draft.md
```

Documentation checks preserve all four original accepted answers, all 16 original matrix rows
(12 active / four deferred), FR-001–032, seven story slots and eight success-criterion IDs.
The four original deferred ITA FR texts and original source review/checklist files are preserved.
Local feature-document links and diff whitespace checks pass. The change list contains only the
authorities and existing feature documentation above; Constitution, Feature 001, application,
database/schema, dependency and infrastructure files are unchanged. No application/runtime test,
independent review or completed-design acceptance is claimed. The delivery comment records the
exact commit SHA and attaches its complete diff from the verified baseline.

## Remaining Risks

1. **Q1 mapping remains a gate obligation.** Required schema/reference flags apply to draft saves
   in the native release; supported publish/schedule hooks exist, but all field/taxonomy/relation/
   gallery/byline candidates must be mapped to them without losing incomplete drafts or due-time
   validation. No implementation or complete validation proof is delivered here.
2. **Native revision boundaries need verification.** Separately maintained taxonomy/SEO/byline and
   shared media/linked records are not assumed staged with content-data revisions. V1 fixtures and
   editor explanations must match actual native behavior; no broad pending-change PASS is claimed.
3. **Missing/deleted targets remain a real limitation.** Safe public reads/native errors and staff
   maintenance precautions remain necessary; they cannot be called D-REF enforcement. Native media
   is public-publishable and finite revisions do not offer immutable evidence/confidential storage.
4. **Representative mappings/UAT remain.** Official Area sources/values, conditional Organization
   use, reciprocal Service/facility selection and recognizable Thai labels must be confirmed in
   remaining Plan work. No production classifications, staff assignments or inventories are invented.
5. **Legacy ITA and foundation readiness remain separate.** Deferred anomalies/cutover decisions
   are not closed; T022/T028 stay PENDING with the original T028/T030 joins. No reduced Product scope
   can turn source review into runtime acceptance or authorize production operations.

These remaining risks must be addressed in the same official Plan after this reconciliation is
accepted, or surfaced at its existing gate. They are not a reason to pursue upstream changes or
silently reintroduce D-ITA/D-REF now.

## Constitution Assessment and Stop

- **I:** Explicit Product Owner decision authorizes changed Product meaning; owning authorities
  are reconciled before downstream adoption and await independent/human acceptance. Historical
  artifacts remain evidence, not current scope. No silent authority override or new approval phase.
- **II/III:** One canonical foundation, supported native primitives and minimal scope; no new
  subsystem/duplicate/extension to satisfy deferred requirements. A later supported Q1 validation
  mapping still needs the existing focused extension gate if code is necessary.
- **IV:** Native least privilege, public-data safety, secret-free artifacts, private production
  PostgreSQL and runtime configuration preserved. Permission is not misrepresented as referential
  integrity or immutable history.
- **V / independent review:** Codex only, document-only Plan Phase 0 reconciliation; no
  implementation/Phase 1/later command. This author assessment is not independent PASS. ChatGPT
  independently reviews the revised authorities/specification; human accepts before Plan resumes.
- **Operations:** T022/T028 PENDING, T028 requires T022 PASS plus accepted T023–T027; T030 requires
  T028 PASS plus accepted T029. No waiver, acceptance-marker change, merge or deployment.

No Constitution amendment/exception is requested. Stop at the existing Plan Human Gate. Acceptance
of this review permits continuation of the same remaining Plan process, not implementation or a
completed-design claim.

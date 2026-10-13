# Retained V1 Native Feasibility — Plan Phase 0

**Baseline**: `2d3cfc96929ef9085194e3c79a11a38f374de0b1`

**Direction**: Product Owner comment `01a13779-da61-71be-bc11-46d3ea9d5413`

**Release**: integrity-verified `emdash@1.1.0`; **Date**: 2026-10-14

The reviewed reconciliation is the current Product baseline. D-ITA and D-REF stay deferred.
This is remaining Phase 0 research, not a new workflow, Phase 1 data model, runtime PASS or
implementation. The official Plan prerequisite is unresolved: **Q1 reference-selection validation
does not yet have an established complete supported mapping**. Phase 1 outputs and Plan completion
remain withheld while this official prerequisite is unresolved.

## Q1: What the Exact Release Establishes

All paths/line numbers below are in the published 1.1.0 package, not Songhealth application files.

| Path | Release observation | Consequence |
| --- | --- | --- |
| `src/schema/zod-generator.ts:41`; `src/api/handlers/validation.ts:151` | Schema requiredness applies to content creation/save validation, not just publication | Set publication-only Product requirements apart from save-time native constraints; blanket `required: true` fails incomplete drafts |
| `src/api/handlers/validate-references.ts:115`, `:144`; content handler `:1213` | Required references reject empty selections and missing reference keys on initial create | A required Health Report Document cannot simply use a native required reference flag without failing US1.6/US2.6 |
| `src/emdash-runtime.ts:4296` | Policy reads the entry, hydrates candidate draft data and captures `_rev` | Scalar/content-data action checks have a supported hook seam and current-entry conflict fence |
| Runtime `:4432`, `:4543`, `:890` | Manual publish invokes `beforePublish`; schedule acceptance invokes `beforeSchedule`; due-time scheduler invokes the same publish path with scheduler origin | All three required action points exist. A schedule-only or Admin-button check is insufficient |
| Runtime `:3257` | Hydration strips leading-underscore revision markers, including staged `_references` | Candidate `content.data` is not the relation-selection payload |
| `src/api/handlers/content.ts:1060`, `:1096` | References hydrate only when an explicit `referenceOptions` argument is supplied; policy calls `handleContentGet(db, collection, id)` without it | The policy event does not contain the reference selections needed by Q1 |
| `src/plugins/types.ts:573`; `src/plugins/content-access.ts:17` | `ctx.content.get/list` return content fields/pointers; no relation selection query is exposed by `ContentAccess` | Adding ordinary read capabilities does not fill that event omission |
| Runtime `:3701`; `src/references/staged.ts:25` | Pending selections live in revision `_references`; the link table retains current live edges | Content-data validation alone misses staged clears/changes |
| `src/api/handlers/staged-references.ts:67`, `:143`; content handler `:2327` | Publication computes a staged-versus-baseline diff against current live links, then validates field requiredness/cardinality | An optional field permits an empty effective selection; a raw draft snapshot is not always the effective selection |
| `src/api/handlers/content.ts:2658` | Compare fills live selections and overlays staged values; it does not apply the publication baseline-diff algorithm | Compare output alone is not proof of what a reciprocal relation will publish |

**Finding B-Q1-REF**: native save-time requiredness conflicts with incomplete drafts, while the
documented policy/context path lacks a complete selection-only candidate read. This affects
FR-002/026, US2.6, applicable Service/facility/Document selections and SC-006. Scalar publication
hooks are available; **complete Q1 is not established by their existence**.

This finding is independent of deferred Q4 target availability/deletion vetoes. Q1 still requires
an applicable selection; it does not require this research to revive published-target availability,
immutable assets or cross-record atomic enforcement. Neither weakening Q1 nor reinstating D-REF
is an approved resolution.

### Minimal Discriminating Scenarios

These are source-derived verification scenarios, not executed CMS test results:

1. Configure an ordinary report-to-Document native reference as required. Create an otherwise
   valid draft with no Document selection: native required-reference validation refuses create,
   contradicting the retained incomplete-draft scenario.
2. Configure it optional. Create two scalar-equivalent reports, one without a selection and one
   with an ordinary selected Document. The policy content data and ordinary content-read API do
   not expose that distinguishing selection. A data-only Q1 predicate cannot correctly decide both.
3. On a published report, stage a cleared Document selection and publish/schedule it. `_references`
   is outside the hydrated candidate data. Checking the old live selection or only scalar fields
   can accept the incomplete pending selection; due-time uses the same policy projection.
4. For a reciprocal relation, save a draft whose selection is unchanged from its baseline, then
   publish an opposite-end removal before this entry is published. A raw staged/compare selection
   can still contain that group while native baseline-diff promotion removes it. No concurrent
   race or new cross-record locking requirement is needed to demonstrate this projection mismatch.

Required evidence for a resolution covers initial drafts with no revision pointer, staged clear,
unchanged selection, opposite-end sequential edits, optional/conditional cases, schedule acceptance,
due-time invalidation and truthful refusals. Target status/file availability must be distinguished
from selected-value presence, and no D-REF PASS inferred.

### Native Host Exports Were Considered

The package **does** export `getDb` from `emdash/runtime`, and exports `handleContentGet`,
`handleContentCompare` and revision repositories/handlers from `emdash`. Trusted native plugins
can run in the Node host. They were not ignored or assumed unavailable.

However, the resolved-reference read filters/loads target records, rather than returning the raw
effective selection. Compare/revision snapshots do not by themselves apply the native current-live
baseline diff; initial creation also writes reference edges directly. A host adapter that reads
native edge storage/internal revision markers and mirrors promotion semantics may be technically
feasible, but **a complete supported compatibility contract for that adapter has not been established**.
Export availability alone is not a verified reference-candidate contract.

No such adapter, duplicate reference field/index, legacy scalar-reference workaround, direct native
table coupling or copied promotion logic is selected by this research. No vendor patch, upgrade,
upstream contact or new subsystem is proposed. If the existing review considers a minimal host
validation extension, its precise read contract, 1.1.0 Node/PostgreSQL compatibility, failure behavior
and the cases above must be established within this same Plan; current blueprint §22 and the
Constitution already govern it. This is not a request to add another workflow/approval phase.

## Other Native Mapping Findings

These settle primitive feasibility; final entity/field/relation definitions await the official
Phase 1 prerequisite. They are not physical schemas or a claim of completed staff UAT.

| Retained semantic need | Smallest native candidate / disposition | Evidence and boundary |
| --- | --- | --- |
| Basic Page | Native string/text/Portable Text plus optional media/Document selector | Field types and save validation cover shape; Q1 body/title via policy, not mandatory draft flags |
| News | Native content fields/image plus News Category and Topic taxonomies | Taxonomy `getEntryTerms` can check current assigned terms; classification is not another collection or News subtype |
| Activity | Native datetime, location/participants text, image or image repeater gallery | Repeater supports image subfields; no forced external-participant Personnel records; optional location entity only on real reuse |
| Announcement | Native details/type/domain datetime fields, optional taxonomies and applicable Document relation | Opening/closing remains domain metadata; conditional related selections inherit B-Q1-REF, no automatic expiry |
| Health Content | Native content/media/Health Topic plus explicit source text as the accepted source/byline alternative | No duplicated native author/byline identity; use native credited byline where needed. Native bylines are separately maintained and may be inferred |
| Personnel | One native content identity with current public assignment/unit/visibility and suitable contacts | No historical assignment dates/records, editing-account coupling, executive subtype or private HR fields |
| Organization | Current owner/unit fields until a genuine shared organization object is demonstrated; then one native entity/reference candidate | The conditional gate remains conditional. No real organization inventory or new collection is invented to make planning look complete |
| Health Service | Native facility facts/code/status/location/contact with Area and offered-Service selectors | Address/coordinates are not service area; native reciprocal relationships express shared identity, Q1 applicable selections remain blocked |
| Service | Native guidance/ownership/provider/channels/steps/contact/external URL, classifications and relevant relations | Text/Portable Text/repeater primitives avoid a transaction/workflow engine; reciprocal and Document selection checks remain blocked |
| Document | One semantic native content record with a file field and classifications/domain context; optional successor relation | File selection is an object with native media ID, not a second Media/File collection; no preserved historical bytes promised |
| Health Report | Native report metadata/Topic/period/source and a single Document relation | Required Document selection is the decisive B-Q1-REF case; no PDF metric extraction |
| Area | Native hierarchical taxonomy is sufficient for a simple official-code hierarchy; reference entity only if actual metadata/query needs exceed it | Native parent/group identity supports reuse. Native slug or supplied term metadata may carry a verified code; do not fabricate official values, promise immutable slugs or assume a custom term-field UI |
| Classification / contacts / system metadata | Native taxonomies/selects, owner fields/site settings, native IDs/slug/editorial identity | No speculative classification/Contact collections, universal lifecycle or copied authorship/revision fields |

**Taxonomy/SEO/byline boundaries**: assignment/SEO/byline writes are side writes in the ordinary
content handler (`:1325–1360`, `:1600–1650`), not an atomic frozen content-data revision. Current
taxonomies can be read through `ctx.taxonomies`; credited bylines through `ctx.bylines`. Source text
can be staged as content data. Retain the reviewed US6.2/FR-022 boundary; do not claim every metadata
edit waits for publication. Native finite revisions are editing history, not immutable evidence.

**Public reads**: `getEmDashEntry/Collection/References` use native request context and published
visibility (`src/query.ts:1138`, `:1390`); authorized preview/edit context can hydrate draft selections.
Use the ordinary public context for linked reads and gracefully handle missing files/targets.
Plugin `ctx.content.get` is a privileged read and is not the public renderer. No public page/route
implementation or new API is authorized here.

**Editor usability**: schema labels, sort order, native field widgets, relation pickers and taxonomy
selectors are the available route; current/05 §§3/12 permit correct English fallback. Evidence proves
native surfaces/types, not recognizable Thai labels for real staff. Representative Thai maintenance,
gallery, reciprocal selectors, validation explanations and timezone/schedule behavior require later
authorized UAT. Real terms, Area codes, organization cases and role assignments are population/
fixture inputs; they are not permission to add speculative entities.

## Constitution and §23 Disposition

The current Product baseline is accepted by the continuation instruction; Q1/Q2 and the retained
public-read/native-authority boundaries remain intact. No Product authority or deferred requirement
is amended. The candidate screening still prefers native semantic entities/classification/media/
owner fields and requires actual reuse for Organization and every relation. No second foundation,
custom Media/RBAC/locking/history subsystem or speculative infrastructure is needed by the candidates.

The complete enforcement mapping gate **does not pass yet**: B-Q1-REF is a concrete gap against
FR-002/026 and §23's native-sufficiency question. Constitution I/II/V and the official Plan rule
against unresolved research require reporting that gap, not calling draft-save restrictions a Q1
solution or producing final design artifacts over an unresolved assumption. No Constitution exception
or amendment is requested. T022/T028 remain PENDING with the original foundation joins.

## Verification Standing and Sources

Recomputed SHA-512 for the first-party 1.1.0 npm archive matches the committed lock integrity;
metadata version remains 1.1.0. Source checks confirm action-hook wiring, required-reference save
coupling, reference hydration opt-in, internal-marker stripping, context API projection and host
exports. An isolated source-extracted native `applyReferenceDiff` probe confirmed scenario 4:
baseline/staged `[group-a]`, current live `[]` produces an empty effective selection, despite a
nonempty raw staged/compare selection. This exercised vendor algorithm code only, not Songhealth
validation implementation. No CMS/PostgreSQL integration probe, application implementation,
dependency installation, database/schema mutation, container or production operation was performed.
The available shell's Node reports
24.11.0, whereas the repository requires 24.21.0; this is not pinned-runtime acceptance evidence.

Context7 was queried first (`/websites/emdashcms`) for publication hooks, relation semantics and
plugin read APIs. Its sources are unversioned; the exact package sources above control release claims.
Primary references: [hooks](https://docs.emdashcms.com/reference/hooks/),
[capabilities](https://docs.emdashcms.com/plugins/creating-plugins/capabilities/),
[field types](https://docs.emdashcms.com/reference/field-types/),
[native plugins](https://docs.emdashcms.com/plugins/creating-native-plugins/your-first-native-plugin/),
[public queries](https://docs.emdashcms.com/reference/api/), and the
[1.1.0 archive](https://registry.npmjs.org/emdash/-/emdash-1.1.0.tgz).

**Workflow result**: official Plan Phase 0 remains blocked on B-Q1-REF; Phase 1 prerequisites are not
met. No `data-model.md`, `contracts/` or `quickstart.md` is generated, no later Spec Kit command runs,
and no normal Plan-completion claim is made. This report remains within the existing Plan workflow.

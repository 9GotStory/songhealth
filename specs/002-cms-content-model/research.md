# CMS Content Model — Completed Plan Research

**Date**: 2026-10-14 | **Feature**: `002-cms-content-model`
**Verified starting HEAD**: `b614c8f283394381d0cb45c2b2903e28c49b75fc`
**Current decision**: `01a13788-95c6-72f5-8787-f86b4e0c5fd6`

Phase 0 research is complete for the revised V1 baseline. Findings establish planning feasibility,
not implementation, pinned-runtime PASS, Thai staff UAT or independent acceptance. No unresolved
architecture choice remains. Implementation/population/operational verification is listed separately.

## 1. Q1 Native Requiredness — B-Q1-REF Resolved by Product Decision

**Decision:** Health Report's single Document reference is mandatory at native create/save.
Other relation fields are optional; conditional relationships are not automatic publication gates.
Missing other Product fields may be saved where native validation permits. The later
2026-10-14 Product decision removes publication-specific content/taxonomy predicates;
this earlier Q1 observation is retained solely as historical research context.

**Rationale:** The pinned release's `validateRequiredReferencesPresent` and
`validateReferenceSelection` enforce a native required reference at create/save; native publication
also checks requiredness/cardinality. The Product Owner explicitly accepts this behavior rather
than requiring an incomplete missing-reference draft. No selected-reference policy projection is
needed at schedule acceptance. The old projection finding remains factually valid but no longer
blocks the revised requirement. D-REF availability/removal/atomic guarantees remain deferred.

**Alternatives considered:** blanket publication-only reference rules, native flags while claiming
all missing-reference drafts save, internal edge-table reads, raw revision/compare adapters and
mirrored promotion algorithms. All are rejected by the latest decision. No upstream pursuit,
upgrade, vendor patch, custom reference service or historical subsystem is selected.

Exact sources: `src/api/handlers/validate-references.ts:115/144`; create handler
`src/api/handlers/content.ts:1213`; runtime staging `src/emdash-runtime.ts:3701`; publication handler
`src/api/handlers/content.ts:2327`. Schedule accepts its actual native constraints; no identical
reference check at every action point is claimed. Target status/bytes can later change independently.

## 2. Native-only Publication — Latest Product Decision

**Decision (2026-10-14):** The Product Owner no longer requires a
Songhealth publication-time content/classification completeness policy.
Native EmDash schema required/type/format/reference/cardinality rules apply
at create/save. Semantic title, Document file and Health Report → Document
are required at save; other fields/taxonomies remain optional where native
schema permits. Native RBAC, scheduling, lifecycle and built-in constraints
govern Publish/Schedule. No `content:beforePublish`, `content:beforeSchedule`,
plugin registration, hook capabilities, reference adapter, alternate engine or
manual article approval/confirmation is needed.

**Rationale:** The previous proposed native plugin was an extension solely
to enforce publication-only field/taxonomy predicates. Removing that Product
requirement eliminates the gap and the extension. This is an explicit
simplification with a tradeoff: records with missing optional content can be
published by authorized staff. Native validation still rejects invalid
supplied values and required fields/references at save, as supported.
Future additional enforcement would require a new Product decision rather
than accidental task generation.

**Alternatives:** Previously researched finite publish/schedule hooks,
reconstructed relation selection, internal-table adapters and mirrored
promotion logic are **not selected**. Their source evidence below remains
historical, not an active implementation dependency. D-ITA/D-REF are still
deferred; native selection does not confer historical retention/availability.

## 3. Fields and Native Revisions

**Decision:** Use schema-owned native collections, string/text/Portable Text, image/file, datetime,
number/boolean/select, repeaters and native reference fields. Enable native drafts, revisions,
preview and scheduling on content collections. One `title` field per collection carries that kind's
actual title/name/display name, with the appropriate Thai label; native slug/identity stays native.

**Rationale:** Field types/validation cover the retained data without duplicate system metadata.
Media/file values carry native IDs; gallery is an image repeater. Scalar missing values remain
saveable with non-required fields; supplied malformed values still face native validation. Saved
content-data and reference changes stage in native revisions; taxonomy/SEO/byline side writes and
shared targets are not frozen with them. Source text is the accepted source/byline alternative for
Health Content; native credited bylines remain optional attribution, not another Personnel identity.

**Alternatives considered:** JSON-as-editor for all content, copied author/slug/state fields, custom
revisions, frozen taxonomy/byline metadata and separate gallery/file collections. Rejected as
unnecessary or incompatible with the reviewed native boundaries.

Sources: `src/schema/types.ts:13/169/199`; `src/schema/zod-generator.ts:41/90/217`;
`src/emdash-runtime.ts:3701`; content handler `:1325–1360/1600–1650`;
`src/plugins/types.ts:663/752`; native revision repository `:278` (finite pruning).

## 4. Taxonomy and Area

**Decision:** Native taxonomies for shared Topic/health classifications, Audience, News Category,
Announcement/Document/Report/facility types and Service Category. A hierarchical `area` taxonomy
holds verified Province → District → Subdistrict → Village terms. Use explicit verified code as
native term slug, native label as display name, and parent/group identity for hierarchy/reuse.

**Rationale:** V1 needs codes/hierarchy/selection, not a separate Area entity with operational fields.
Term creation supports label/slug/parent; supplied codes survive label changes when the code slug is
maintained. Terms have no content publication lifecycle: term changes are current metadata. Facility
coverage Area is distinct from its address/coordinates. Source provenance can use native description;
no invented official codes or custom metadata-editing UI is required.

**Alternatives considered:** Area collection, duplicate classification collections and free-form
uncoded geographic labels. A collection is unnecessary for this scope. Richer analytical/source
metadata would be a different owning requirement; it is not assumed or implemented now.

Sources: `src/api/schemas/taxonomies.ts:52/86`; `src/api/handlers/taxonomies.ts:356`;
`src/plugins/types.ts:663`; `src/seed/types.ts:176`. Actual code/term inventory and hierarchy correctness
remain population/UAT inputs; native slug mutability is not an immutable-history guarantee.

## 5. Organization and Relationships

**Decision:** No Organization collection by default without the existing demonstrated-reuse case.
Use current unit/provider/affiliation text on its owner. A single conditional Organization schema
and its limited native links are defined in the data model for a confirmed shared-metadata case.
No separate internal/external organization kinds. Other relationships use one native edge set with
explicit cardinality; facility/Service selectors bind opposite sides of the same many-to-many relation.

**Rationale:** Native reference pickers/relations avoid copied Documents, Services or facility
records. Report → Document alone is mandatory at save; all other reference selections stay optional.
The inverse view does not need another service or duplicate relation table. Native baseline-diff
promotion and selected-group semantics are used as supplied, not mirrored in Songhealth code.

**Alternatives considered:** automatic Organization creation for every noun, universal relationship
matrix, duplicate opposite-end collections, custom backlink index and conditional relation gates.
Rejected under §23 and the latest decision. Conditional Organization activation is an existing
Product input to later implementation, not an unresolved architecture or a new approval phase.

Sources: `src/schema/types.ts:113/199`; `src/api/handlers/validate-references.ts:42/115`;
`src/api/handlers/staged-references.ts:67/181`; `src/seed/types.ts:130/145`.

## 6. Public Reads and Native Editor

**Decision:** Preserve the existing `_emdash` live registration. Future consumers use native
published-context `getEmDashEntry/Collection/References`; signed preview/edit context remains
authorized. Omit unavailable linked content and show safe file unavailability. Use native labels,
lists/pickers/taxonomies/repeaters/preview/lifecycle UI, with Thai labels and correct English fallback.

**Rationale:** Public helpers distinguish published data from preview; privileged plugin content
reads are not the public renderer. No public page/API/search implementation belongs to this feature.
Native field labels/sort order and title/date fields provide maintenance without rebuilding Admin.
Actual Thai staff comprehension, selector flow, media missing-state rendering and scheduled-time
display require implementation/UAT evidence, not another architecture investigation.

**Alternatives considered:** custom Admin SPA, duplicate live loader/public API, untrusted preview
parameters and confidential CMS media. Rejected by existing authorities/security scope.

Sources: `src/query.ts:1138/1390`; `src/runtime.ts`; `src/schema/types.ts:320/454`;
current/05 §§3/4/12 and current/07 §§8/9. Native media stays public-publishable and replaceable.

## Evidence, Workflow and Remaining Verification

The first-party `emdash@1.1.0` archive integrity was independently recomputed and matches
`package-lock.json`: `sha512-VXo1fIMr44PEiE1A9Z5aFWvjsqhdLDHLqat2iPkFYoam2kYV6h+2LGkEDovkXdLmmWWDY9w7ekP0CP6ziYMFhg==`.
Package paths above refer to that release, not private Songhealth files. Previous source checks and
the isolated native-diff probe remain historical evidence; no new reference investigation is reopened.

Context7 was used first (`/websites/emdashcms`). Unversioned docs explain supported hooks/relations;
exact release source controls version claims. Primary links:
[field types](https://docs.emdashcms.com/reference/field-types/),
[hooks](https://docs.emdashcms.com/reference/hooks/),
[capabilities](https://docs.emdashcms.com/plugins/creating-plugins/capabilities/),
[native plugins](https://docs.emdashcms.com/plugins/creating-native-plugins/your-first-native-plugin/),
[query API](https://docs.emdashcms.com/reference/api/),
[seed format](https://docs.emdashcms.com/themes/seed-files/), and the
[pinned archive](https://registry.npmjs.org/emdash/-/emdash-1.1.0.tgz).

The installed Specify CLI 1.1.0 official Plan instructions were rechecked against
[upstream Plan](https://github.com/github/spec-kit/blob/main/templates/commands/plan.md).
Original setup already resolved this feature/plan/template; it was not rerun or overwritten.
Research continued directly under the existing Codex-only constraint. Phase 0 decisions above
resolve the planning unknowns before generating Phase 1 outputs. No Specify/Clarify rerun or new phase.
Before/after Plan hooks parse as enabled optional `speckit.git.commit`, null conditions, with
auto-commit disabled. Optional hooks are skipped; no mandatory Plan hook applies. An explicit delivery
commit records completed planning documentation, not implementation acceptance.

Future verification: native required-title/file/reference create/update cases and built-in
publish/schedule permission/lifecycle outcomes; no custom policy registration or hooks;
metadata revision boundaries; permissions/preview; reciprocal selectors and Area code maintenance;
Thai editor UAT. See [quickstart.md](quickstart.md). These are planned tests, not PASS results.
The shell has Node 24.11.0, not the pinned 24.21.0; no integration test was claimed or dependency
changed. No database/schema/runtime mutation occurred. T022/T028 remain PENDING, with original joins.
D-ITA/D-REF, historical evidence and legacy cutover remain deferred/separate; no scope waiver or
foundation completion is inferred. No genuine new material architecture impossibility is established.

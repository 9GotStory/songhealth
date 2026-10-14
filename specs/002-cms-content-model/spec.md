# Feature Specification: CMS Content Model

**Feature Branch**: `002-cms-content-model`

**Created**: 2026-10-13

**Current policy (2026-10-14):** Product Owner selected native-only EmDash save-time
validation and direct Native RBAC publishing, removing the previously planned Songhealth
publication hooks. The accepted Q1 save-time requiredness remains; historical hook
proposals are superseded. This is documentation reconciliation, not an invocation
of a Spec Kit command, runtime PASS or implementation authorization.

**Previous status**: Native-first Q1 revised by Product Owner comment `01a13788-95c6-72f5-8787-f86b4e0c5fd6`;
official Plan Phase 0/1 completed as documentation for Independent Review. No runtime/UAT PASS or
implementation authorization. The latest decision resolves B-Q1-REF by changing V1 applicability
of missing-reference drafts, not by adding a custom reference adapter.

**Input / precedence**: Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
(2026-10-13) supersedes unavailable Q3/Q4 V1 guarantees and stops upstream-change pursuit.
This documentation reconciliation starts at `e2903e41be6aebd849352d4cc452906eb3d796fd` on the
existing managed branch. Current Q1 is revised by comment `01a13788-95c6-72f5-8787-f86b4e0c5fd6`;
Q2 remains applicable to retained resources; deferred requirements are
traceable below. This is not a rerun of Specify/Clarify or a new feature/workflow.

## Product Owner V1 Scope Decisions — Current Plan Baseline

| Capability | Reduced V1 standing | Traceability |
| --- | --- | --- |
| Ordinary content, semantic Document/native Media, Personnel/current assignment, conditional Organization, Service/facility/Area | Retained on supported native EmDash 1.1.0 primitives | US1–4/6–7; FR-001–013/018–032 with the boundaries below |
| Q1 native-first validation | Native required semantic titles, Document file and mandatory Health Report → Document apply at create/save. Other fields/taxonomies follow native optionality. No Songhealth publication-time completeness hooks, confirmation, article review or approval; native RBAC/lifecycle checks remain | FR-002/026; US1.6–7/US2.6; current field matrix; SC-006 |
| Q2 current Personnel assignment only | Retained; no assignment-history feature | FR-008/009; US3.4; SC-001 |
| Q3 structured yearly ITA history, immutable/preserved evidence, retained published years and traceable correction | **D-ITA: deferred from V1; not implemented/PASS**. Entire structured ITA journey/representation is withheld, with no Basic Page or ordinary Document fallback claiming those guarantees | US5; FR-014–017; SC-004; four deferred Q1 ITA rows |
| Q4 published-required-target removal veto and cross-record atomic availability/retention | **D-REF: deferred from V1; not implemented/PASS**. Includes guaranteed target/file availability at publication/schedule commit and under concurrent/later changes; no implicit cross-record gate | Former US2.6/US6.8; deferred portions FR-025/026 and SC-005/006 |
| Q4 safe public reads / native valid selections | Retained independently: no draft exposure, omit unavailable linked content, safe missing-file state, native save-time reference/value/cardinality validation; no availability/removal protection | FR-002/020/025/026; US2.6–8; SC-005/006 |

Native permissions authorize actors; usage reporting and staff precautions help maintenance.
Neither proves Q3/Q4 enforcement. Native media replacement may change current shared consumers;
authorized target deletion/unpublish can leave missing links. No atomic/snapshot/locking subsystem,
upgrade or upstream change is introduced. Legacy ITA material is not deleted/migrated/withdrawn;
any future delivery/cutover disposition requires its own accepted decision.

Owning current documents and the reviewed reconciliation are the current Product baseline under
the continuation instruction. Final mapping/field choices belong to the same official Plan; the
latest Q1 decision `01a13788-95c6-72f5-8787-f86b4e0c5fd6` changes the former blanket missing-reference draft
requirement explicitly. `plan.md`, `data-model.md`, `contracts/` and `quickstart.md` describe the
completed planning design; the prior finding remains historical evidence, not a current blocker.

## Clarifications

### Session 2026-10-13 — Historical Accepted Answers

The four original accepted answers below are preserved as decision provenance. They are not four
current V1 guarantees: the later scope and native-Q1 decisions above revise Q1, retain Q2, defer Q3 and the
unavailable Q4 enforcement, and retains Q4's independent public-read/selection boundaries.
Deferred answers are not passed, implemented or replaced by precautions.

- Q: Which field rule should apply when staff publish content or schedule it for publication?
  → A: Option A, accepted by the Product Owner in comment `01a135a8-78b6-799f-952c-7ba05885ede4`:
  allow incomplete drafts; use the Q1 publication matrix below for publication, schedule acceptance,
  and validation before scheduled publication. Explicitly optional fields remain optional and
  conditional fields apply only when their stated condition is met. Native identity requirements,
  authorization, invalid supplied values, and confidentiality boundaries still apply to draft saves.
- Q: Should Feature 002 maintain only current Personnel assignments, with no assignment-history
  feature or public past-assignment directory?
  → A: Option A, accepted by the Product Owner in comment `01a135ab-76b2-79e5-a202-255b926d9ae9`:
  maintain current public assignment/unit/visibility on the same Personnel identity. Feature 002
  requires no assignment-history start/end dates, retained past-assignment records or public
  past-assignment directory. Later history needs require a separately confirmed Product use case;
  native editorial revisions remain the traceability baseline and ITA history remains independent.
- Q: Should all published ITA years remain public without an automatic expiry, while allowing
  authorized, traceable corrections to historical evidence?
  → A: Option A, accepted by the Product Owner in comment `01a135af-50a0-7dd6-ae01-3669a6e36fc0`:
  retain all already-published and subsequently published ITA years without automatic expiry or
  a retention deadline. Native publishing/ownership authority permits deliberate corrections;
  pending corrections leave the live version intact until publication. Native authorship,
  timestamps, revisions/history and available logs identify who changed what and when, including
  prior and replacement evidence targets. Current Personnel/Organization, shared Document/media,
  or other-year changes must not silently rewrite historical evidence; no automatic carry-forward.
  A different retention policy requires a separate Product decision.
- Q: Should publication be blocked when a required linked record is unavailable, and should its
  removal be refused while published content depends on it?
  → A: Option A, accepted by the Product Owner in comment `01a135b1-f52f-74a3-8c41-736e089c5fff`:
  required linked content must have an available published version at parent publication,
  schedule acceptance and scheduled publication; required file assets must exist. Incomplete
  drafts remain allowed. Unavailable optional links are omitted from public reads without blocking
  the parent. Refuse target unpublish/trash/permanent deletion or asset removal while published
  content requires it. Staff must first deliberately update published references or unpublish
  eligible parents; retained ITA years stay public with valid replacements where required and Q3
  traceability. No automatic cascade or draft exposure.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Author the Right Kind of Public Information (Priority: P1)

As a staff author, I can maintain Basic Page, News, Activity, Announcement, and Health Content
records using fields appropriate to their meaning, without copying records for another section.

**Why this priority**: Correct structure is the starting point for reliable editing and reuse.

**Independent Test**: With prepared staff access, create, save, and reopen one representative draft
of each kind and verify its attributes/classifications, without building public page templates.

**Acceptance Scenarios**:

1. **Given** office information with no more specific kind, **When** an author creates a Basic Page,
   **Then** title/body and optional summary, images/files, or related Documents are representable;
   Basic Page does not replace News, Service, or another structured kind.
2. **Given** a news story, **When** the author saves it, **Then** title, summary, body, featured image,
   News Category, and Topic/Health Topic are maintainable, with optional Area/Audience/Source and
   genuinely useful related records. Health-related News and Featured selections do not become
   separate content kinds.
3. **Given** an activity, **When** date/time, location, description, images/gallery, and participants
   are recorded, **Then** activity facts remain separate from publication time; external participants
   need not become Personnel, and an Activity need not be copied into News.
4. **Given** an announcement, **When** details, type, announcement date, applicable opening/closing
   dates, Topic/Audience, and related Documents are maintained, **Then** closure/expiry remains
   domain context, without a new editorial state or automatic unpublish on the closing date.
5. **Given** evergreen guidance, **When** Health Content is saved, **Then** title, summary, body,
   Health Topic, source/byline, and media are representable, with optional Audience/review dates.
   A review date does not automatically unpublish it.
6. **Given** a draft incomplete in values permitted by native validation, **When** an authorized
   author saves it, **Then** it can be saved; a missing genuinely mandatory native reference may
   instead be refused at create/save. Native identity, supplied-value, authorization and public-data
   safety constraints apply. V1 does not promise saving every missing-reference draft.
7. **Given** a validly saved record and an authorized publisher, **When** Publish or Schedule
   is requested, **Then** EmDash applies native RBAC, lifecycle, revision, scheduling and
   built-in validation only. Missing optional fields/classifications do not cause an added
   Songhealth refusal; no article reviewer, approval, custom confirm or completeness hook
   is required. Native failures remain truthful and readable.

---

### User Story 2 - Reuse Documents and Public Media (Priority: P1)

As an author, I can select an existing semantic Document or raw public asset and use it in several
contexts while maintaining one authoritative source.

**Why this priority**: Duplicate files create conflicting versions and unnecessary maintenance.

**Independent Test**: Relate one Document/file to an Announcement, Service, and Health Report;
reopen each and confirm the same identity/file. Select a raw image without creating a Document.

**Acceptance Scenarios**:

1. **Given** an existing Document, **When** another content context needs that authoritative file,
   **Then** the author selects it without another upload or duplicate Document record.
2. **Given** a public report, **When** Health Report metadata is saved, **Then** title, summary,
   type, Health Topic, reporting period, owner/source, applicable date, and optional fiscal year/Area
   describe a related Document; report metrics are not extracted into editorial records by default.
3. **Given** a raw image or screenshot, **When** it is selected for retained V1 content, **Then**
   it is reusable without a generic File/Media content record or mandatory semantic Document.
4. **Given** a Document has a successor or expiry context, **When** that metadata changes, **Then**
   domain context remains separate from publication state and the original file/successor remain
   identifiable without copying either.
5. **Given** a public image, **When** staff select it, **Then** available alternative text/caption
   and asset metadata can be maintained; media storage is not presented as confidential storage.
6. **Given** a Health Report with no selected report Document, **When** native create/save is
   attempted, **Then** mandatory-reference validation refuses it. A draft with that selection may
   omit other values allowed by native validation. Native publication revalidates requiredness/
   cardinality; schedule acceptance uses its native behavior without an invented selection hook.
   Selection validity does not guarantee target availability or later removal protection.
7. **Given** unavailable linked content, **When** its parent is read publicly, **Then** the target
   is omitted without exposing draft/unpublished data. A missing file produces a safe unavailable
   state. Unavailable optional links do not block parent publication; D-REF withholding a required
   target's availability guarantee must not be reported as a successful availability check.
8. **Given** native authorized replacement/removal of a reused asset or linked record, **When**
   public consumers are re-read, **Then** they reflect the current native state or safe unavailability.
   No immutable bytes, deletion veto or atomic cross-record preservation is claimed as V1 acceptance.


---

### User Story 3 - Maintain Personnel and Organization Information (Priority: P2)

As a directory editor, I can maintain appropriate public personnel/organization information and
distinguish a person's public assignment from editing access.

**Why this priority**: Consistent directories prevent duplicate leadership records and access drift.

**Independent Test**: Save/reopen Personnel, reference an Organization where structured reuse is
demonstrated, and change the person's public assignment without changing editing permissions.

**Acceptance Scenarios**:

1. **Given** Personnel, **When** public directory information is edited, **Then** prefix, first/last
   and display names, image, public assignment/unit/contact, and current/public visibility are
   representable; Citizen ID, private address, date of birth, and sensitive HR information are absent.
2. **Given** a leadership assignment, **When** it changes, **Then** the person remains the same
   Personnel record rather than another executive type.
3. **Given** an organization with its own metadata reused by several records, **When** editors
   maintain it, **Then** name/type, applicable responsibilities, parent/affiliation, public contact,
   and active/inactive visibility are maintained once. Different conceptual names alone do not
   require different Organization models.
4. **Given** a current Personnel assignment, **When** the assignment changes or ends, **Then**
   current public assignment/unit/visibility is updated on the same identity. No start/end dates,
   retained past-assignment records or public past-assignment directory are required by Feature 002;
   native editorial revisions remain the traceability baseline. ITA historical-preservation acceptance is deferred (D-ITA).
5. **Given** a public assignment or visibility changes, **When** saved, **Then** it does not
   provision/disable an editing account, redefine permissions, or erase historical authorship.

---

### User Story 4 - Connect Services, Facilities, and Areas (Priority: P2)

As an editor, I can explain a citizen service, identify facilities offering it, and distinguish
physical location from service area.

**Why this priority**: Citizens need accurate guidance on what to do and where to obtain services.

**Independent Test**: Maintain one Service offered at two Health Services, reference official-coded
Areas, and identify the same relationships from both directions without duplicate Services.

**Acceptance Scenarios**:

1. **Given** a Service, **When** recorded, **Then** name, summary, Category/Topic/Audience,
   ownership/provider, channels, eligibility, steps, required-document guidance, applicable
   duration/fees/notes/contact/location, external URL, and related Documents describe guidance
   without executing a transaction. Ownership type and service channel remain distinct.
2. **Given** a Service offered at two facilities, **When** related, **Then** offered services and
   offering facilities refer to the same Service and Health Service identities.
3. **Given** a Health Service, **When** maintained, **Then** official name/code, optional display
   name/image/affiliation, type, operational status, address/coordinates, hours/public contacts,
   offered services, and service areas are representable; location does not replace service area.
4. **Given** shared Province → District → Subdistrict → Village references, **When** reused,
   **Then** applicable hierarchy and official/stable codes are retained when connecting other data.
5. **Given** a temporarily closed facility, **When** operational metadata changes, **Then** this
   alone does not change publication state. A manual/form remains a Document, and a directory
   entry remains a Health Service rather than a Service transaction.

---

### User Story 5 - Maintain Yearly ITA Evidence (DEFERRED: D-ITA; no V1 priority/acceptance)

**Standing**: The original six scenarios below retain deferred-requirement traceability. They
are future-scope scenarios, not V1 test fixtures or completion obligations. No ITA representation,
workspace, upload journey or ordinary-page replacement is approved by this reconciliation.

As a future ITA editor, I would configure yearly sections/requirements, attach ordered evidence, and
preserve past-year evidence independently of current personnel/organization changes.

**Why this future need matters**: Evidence must remain understandable and historically accurate.

**Deferred verification**: Prepare two different fiscal-year structures with ordered Document, media,
and external-link evidence; change current personnel/organization and check historical context.

**Acceptance Scenarios**:

1. **Given** a fiscal year, **When** ITA structure is maintained, **Then** Fiscal Year →
   Section/MOIT → Requirement/Item → ordered Evidence preserves applicable codes, titles,
   descriptions, parent associations, and display ordering.
2. **Given** a requirement, **When** evidence is added/reordered, **Then** each item identifies a
   Document, media asset, or external URL with optional label/order; no separate publicly routable
   Evidence record is necessary.
3. **Given** different next-year requirements, **When** its structure changes, **Then** the earlier
   year is not rewritten and evidence is not automatically carried forward.
4. **Given** an already-published or subsequently published ITA year, **When** current
   Personnel/Organization, shared Document/media or another year changes, **Then** its historical
   evidence context remains unchanged and public, without automatic expiry or a retention deadline.
5. **Given** an existing authoritative Document, **When** used as evidence, **Then** it is reused
   where practical; this creates no scoring, compliance, or approval engine.
6. **Given** a historical text, metadata or evidence-target error, **When** staff authorized under
   native publishing/ownership rules deliberately correct it, **Then** pending edits leave the live
   version intact until publication, and native authorship/timestamps/revisions/history and available
   logs identify who changed what and when, including the prior and replacement evidence target.
   Unauthorized correction is refused; another year's evidence is not automatically updated.

---

### User Story 6 - Keep Drafts Separate from Publication (Priority: P1)

As a staff author, I can save drafts; as an authorized publisher, I can preview/publish/schedule
content directly under Native RBAC without exposing draft changes prematurely.

**Why this priority**: The model must preserve editorial and permission boundaries.

**Independent Test**: With prepared draft-only, publisher, and administrator access and a
representative record, exercise supported CMS operations and public-read verification without
adding public page templates.

**Acceptance Scenarios**:

1. **Given** a saved draft, **When** anonymous reading or unauthorized preview is attempted,
   **Then** it is not exposed; direct publish/schedule attempts by draft-only staff are refused
   at the trusted system boundary.
2. **Given** published content with enabled native revisions, **When** staged content-data edits
   are saved/previewed, **Then** the previous live content-data revision remains public until
   authorized publication. This is not a promise that shared media, linked records or separately
   maintained taxonomy/SEO/byline metadata are staged/frozen atomically with it; their native
   boundaries must be documented and checked in Plan.
3. **Given** authorized one-time scheduling, **When** scheduled, **Then** timezone is explicit,
   publication never occurs early, existing live content remains until update success, and
   available overdue/failure evidence is observable.
4. **Given** published V1 content and native lifecycle authority,
   **When** unpublished/trashed, **Then** public reads exclude it while editable/restorable
   information remains; permanent deletion additionally requires administrator authority.
5. **Given** enabled revision/concurrency protection, **When** a stale/conflicting save occurs,
   **Then** newer work is not silently overwritten; supported revision review/restore and
   autosave/draft recovery remain usable.
6. **Given** failed or uncertain save/publish/schedule, **When** staff review the result, **Then**
   success is not falsely reported; current state is re-read before a lifecycle retry.
7. **Given** an unauthorized/disabled account, **When** it attempts protected content or
   schema/security administration directly, **Then** trusted role/ownership checks refuse it,
   regardless of visible controls or a person's public job title.
8. **Given** an actor lacks native permission, **When** direct unpublish/trash/permanent-delete
   or media-removal is attempted, **Then** trusted native role/ownership checks refuse it.
   An otherwise authorized actor is not promised a required-published-reference veto. That
   stronger original refusal scenario remains deferred as D-REF, not satisfied by this role test.


---

### User Story 7 - Find and Correct Structured Records (Priority: P3)

As an editor, I can recognize content/fields in Thai, find records using ordinary CMS lists,
and correct readable validation errors without understanding internal architecture.

**Why this priority**: Staff must be able to maintain the model consistently.

**Independent Test**: A staff reviewer finds/reopens fixtures, selects reusable relationships/media,
and corrects an agreed validation failure using labels and the reported explanation.

**Acceptance Scenarios**:

1. **Given** records, **When** staff browse ordinary lists, **Then** recognizable Thai content/field
   labels and available search/filter/date/publication-state/pagination and safe supported bulk
   operations support maintenance.
2. **Given** an invalid input/relationship under agreed rules, **When** saving/publishing,
   **Then** a readable result identifies the issue without claiming success. English platform
   fallback is acceptable when it does not affect correctness; no rebuilt Admin is required.

### Edge Cases

- Featured/Health News/leadership presentation creates no duplicate content kind.
- Q1 missing-value behavior follows native schema: required titles, Document files and native
  required references may block create/save; other optional omissions are permitted.
  No Songhealth publish/schedule completeness predicate or human article approval exists.
- Conditional/optional relationships are not automatic publication gates. No internal selection
  adapter or promotion mirror is permitted to restore the previous blanket draft rule.
- Domain dates/status remain separate from editorial state; no automatic expiry/unpublish is inferred.
- A Document/file reused across contexts shares its current native source, not immutable historical
  bytes. Authorized replacement/removal may change or break consumers; public reads handle this
  safely and never expose drafts. D-ITA/D-REF are not tested as V1 enforcement.
- Native required-reference/file validation never guarantees a published target/file at commit
  or through later removal. No cross-record preflight is claimed to be atomic.
- Official Area/facility codes survive reuse; common labels alone do not justify entities.
- An ended Personnel assignment updates current information on one identity without CMS access
  changes; no assignment-history record/directory is required.
- Supported entry revision/concurrency, safe preview, native roles and truthful failure/re-read
  behavior remain. Shared media/linked records and separately maintained metadata are not silently
  included in a blanket live/draft guarantee.
- Permanent content deletion is native administrator-only and trash-first; media deletion uses
  native media/ownership authority. Neither boundary proves retention/dependency enforcement.
- Confidential patient/clinical/HR/private-contact data never belongs in this model or media.
- Existing legacy ITA evidence/URLs are not withdrawn or migrated by the reduced feature scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Staff MUST maintain Basic Page, News, Activity, Announcement, and Health Content as
  distinct semantic kinds with the attributes in US1 and `02-content-model.md` §§3–7.
- **FR-002**: V1 MUST use native EmDash 1.1.0 schema `required`, type, format,
  unique, reference and cardinality validation at create/save, including required
  semantic title, Document file, and Health Report → Document. Missing other fields and
  classifications MAY be saved and published where the native schema allows, with
  supplied invalid values still rejected by native validation. Native RBAC, lifecycle,
  scheduling and revision constraints govern Publish/Schedule. No Songhealth-specific
  content/taxonomy completeness hook, editor confirmation, article review or approval
  workflow MAY be introduced. Native permission and public-data safety remain mandatory;
  no cross-record file/target availability or immutability is implied.

- **FR-003**: Basic Page MUST NOT substitute for a structured kind; Featured/Health News/leadership
  views and additional presentation contexts MUST NOT create duplicate kinds or source copies.
- **FR-004**: Document MUST be a semantic public record around a file with title, optional summary,
  type, applicable Topic/date/year/owner/source, reusable file selection, and optional successor/
  current-version/domain status (`02` §13).
- **FR-005**: Raw images/files MUST use the existing media resource and available alternative
  text/caption/type/size/dimensions/usage metadata. They MUST NOT automatically require a Document
  or duplicate Media/File record (`02` §14).
- **FR-006**: About content, Services, Health Reports and Announcements MUST reuse the same
  authoritative Document/file where needed rather than upload context copies.
- **FR-007**: Health Report MUST be metadata plus a related Document with period/Topic/owner/source,
  applicable date, and optional Area/year (`02` §16), without storing analytical metrics.
- **FR-008**: Personnel MUST contain public directory information and visibility in US3 and
  `02` §8, with only appropriate public contact. Feature 002 MUST maintain current public
  assignment/unit/visibility on the same Personnel identity; it MUST NOT introduce an
  assignment-history feature or public past-assignment directory. Assignment-history start/end
  dates and retained past-assignment records are not required. Later history needs MUST have a
  separately confirmed Product use case. Native editorial revisions remain the traceability
  baseline. Historical ITA preservation is deferred under D-ITA, not a V1 Personnel acceptance condition.
- **FR-009**: Personnel MUST remain distinct from editing accounts; public job/assignment/status
  MUST NOT automatically change permissions, disable accounts, or erase authorship (`06` §6).
- **FR-010**: Organization MUST become a reusable entity only where identity/metadata and
  demonstrated reuse justify it; attributes follow US3 and `02` §9. Internal/external naming
  alone MUST NOT require separate entities.
- **FR-011**: Service MUST describe guidance using US4 and `02` §12 attributes. Ownership and
  channel MUST remain distinct; steps MUST NOT become transaction/case tracking.
- **FR-012**: Health Service MUST describe a real facility using US4 and `02` §11 attributes.
  Identifier/location/status/service area MUST remain distinct; offered Service relationships
  MUST be identifiable from both service and facility contexts.
- **FR-013**: Shared Area references MUST retain applicable hierarchy and official/stable codes
  when connecting data (`02` §10), without taking ownership of analytical data.
- **FR-018**: Shared Topic/Health Topic, Audience, Category/Type, and similar classifications MUST
  remain classifications where sufficient. Additional relations MUST have real reuse/discovery/
  history value; not every content kind MUST link to every other kind.
- **FR-019**: Office contact MUST remain office/site-owned; facility/service/personnel/organization
  contacts MUST remain with appropriate owners. No generic Contact entity is required without
  demonstrated shared-object maintenance (`02` §15).
- **FR-020**: Public reads MUST exclude drafts/unpublished content. Preview MUST require
  authorization; an unauthenticated query parameter MUST NOT expose drafts (`07` §8).
  Unavailable optional linked content MUST be omitted from public reads without blocking the parent.
- **FR-021**: Draft-only staff MUST save drafts but MUST NOT publish/schedule. Trusted native
  role/ownership checks MUST govern own/others' content and administrative operations;
  hidden UI controls MUST NOT be treated as security (`06` §§2–8).
- **FR-022**: Editorial state MUST remain separate from domain timing/status. Saved pending edits
  MUST preserve the live content-data revision for fields actually staged by native revisions;
  this does not freeze related media/content or separately maintained metadata. Native authorized
  unpublish MUST remove the public content version while retaining editable information
  (`07` §§2/4/6).
- **FR-023**: One-time future publication MUST show timezone, never publish early, retain current
  live content until update success, and expose available failure/overdue evidence; recurring
  or scheduled-unpublish machinery is not required (`07` §5).
- **FR-024**: Supported revisions/preview/explicit save/autosave/draft recovery/locks/concurrency
  MUST be used where needed; stale/concurrent writes MUST NOT silently overwrite (`05` §3;
  `07` §§8–9).
- **FR-025**: Native Trash/restore MUST be the ordinary content deletion path; permanent content
  deletion MUST require native administrator permission and the native trash-first precondition.
  Media removal MUST use native media/ownership permissions. Staff reference/retention review is
  an operational precaution, not a required-published-reference veto. The original target-removal
  veto/no-cascade enforcement is deferred (D-REF); no custom cascade/locking mechanism is introduced.
- **FR-026**: Native required/type/value/reference/cardinality validation and
  failure/uncertainty handling MUST return truthful outcomes. Native create/save
  requiredness applies to semantic title, Document file and mandatory Health Report
  Document relation; other supplied values still face native type/format checks.
  Native Publish/Schedule applies built-in permission, time, lifecycle and revision
  constraints only, without a Songhealth completeness hook, conditional reference
  reconstruction, or manual article confirmation. Optional/conditional fields,
  classifications and relations are maintained editorially, not publish-time gates.
  Public reads safely omit unavailable targets or files under FR-020. Cross-record
  availability, historical retention and target-removal veto remain D-REF/D-ITA.

- **FR-027**: Schema/users/access/plugins/site-wide security/settings/backup/import/transfer and
  permanent content deletion MUST retain administrator boundaries. Native media removal follows
  its distinct native media/ownership permissions (FR-025). Native authorship/timestamps/revisions/
  history and available logs MUST remain traceability baseline; no new audit permission family
  is required (`05` §§8/10; `06` §§7/10).
- **FR-028**: This model/media MUST contain only public-publishable website information; patient,
  clinical, Citizen ID, private address, date of birth, sensitive HR, and confidential file data
  MUST NOT be part of it (`02` §§8/11/14; `05` §5).
- **FR-029**: Staff MUST maintain content with understandable Thai content/field labels, ordinary
  CMS lists and available search/filter/pagination/bulk operations/reusable selectors. Correct
  English platform fallback is permitted; no replacement Admin is required (`05` §§1–4/12).
- **FR-030**: Native identity/slug/editorial state/authorship/timestamps/revisions MUST be reused;
  domain dates MUST remain separate rather than duplicating system metadata (`02` §§1–2/20).
- **FR-031**: Every proposed collection/relation MUST answer the four mapping questions: real entity
  versus presentation/classification; existing primitive sufficiency; demonstrated reuse/relationship
  need; and duplication benefit versus maintenance cost (`02` §23). Prefer the smallest sufficient
  representation; no schema is approved here.
- **FR-032**: Work MUST extend the canonical foundation without out-of-scope capabilities.
  A native gap MUST be surfaced for owning-authority review rather than silently relaxing
  requirements or creating an extension.

### Deferred Requirements — Not V1 Acceptance

**D-ITA** retains the original FR-014–017 below as future requirements. Their MUST statements
describe the deferred capability only, not reduced V1 obligations or implementation/PASS. They
retain US5/SC-004 and the four deferred ITA matrix rows. Re-entry needs a new bounded decision.

- **FR-014**: ITA MUST support the year/Section/Requirement/ordered Evidence hierarchy with the
  applicable attributes and ordering in US5 and `02` §18.
- **FR-015**: ITA evidence MUST reference Document, media, or external URL with optional label/order;
  it MUST NOT be presumed a separately routable entity.
- **FR-016**: ITA structure MUST be configurable per year without automatic carry-forward or changes
  to another year's structure/order.
- **FR-017**: All already-published and subsequently published ITA years MUST remain public without
  automatic expiry or a retention deadline; a different retention policy MUST have a separate
  Product decision. Historical text, metadata and evidence targets MAY be deliberately corrected
  only by staff authorized under native publishing/ownership rules. Pending corrections MUST leave
  the live version intact until publication. Native authorship/timestamps/revisions/history and
  available logs MUST identify who changed what and when, including prior and replacement evidence
  targets. Current Personnel/Organization, shared Document/media or other-year changes MUST NOT
  silently rewrite historical evidence; evidence MUST NOT be automatically carried forward.
  These requirements MUST NOT imply a universal snapshot, approval or audit subsystem.

**D-REF** retains original Q4 removal/atomic availability guarantees from FR-025/026, US2.6 and
US6.8, and portions of SC-005/006: required targets/files available at publish/schedule acceptance/
execution; removal veto while published parents require them; deliberate resolution with no automatic
cascade and Q3 traceability for retained ITA. These are deferred, not weakened operational checks or
current V1 fixtures. Independent public-read, selection and role boundaries remain under current FRs.

### Q1 Native Validation Matrix — Retained V1

**Current Product decision (2026-10-14):** Native-only publication replaces the
previous proposed content-data/taxonomy publication hooks. Twelve active resource
rows remain; the four ITA rows below remain D-ITA. Native schema requiredness
applies at create/save, while Native RBAC/lifecycle governs Publish/Schedule.

| Resource | Native create/save | Native Publish / Schedule | Editorial / relationship boundary |
| --- | --- | --- | --- |
| Basic Page | Title required; other fields optional, native supplied-value checks | Native RBAC/lifecycle only; no nonempty-body hook | Body/media/related Documents editorial |
| News | Title required; other fields optional | Native RBAC/lifecycle only; no image/category/Topic hook | News Category, Topic, Area, Audience, source editorial |
| Activity | Title required; other fields optional | Native RBAC/lifecycle only; no date/gallery/participant hook | Activity details, images/gallery, location editorial |
| Announcement | Title required; other fields optional | Native RBAC/lifecycle only; no details/type/date hook | Dates, classification, Document links editorial |
| Health Content | Title required; other fields optional | Native RBAC/lifecycle only; no body/source/media/Topic hook | Classification, source, review dates editorial |
| Personnel | Display-name title required; other fields optional | Native RBAC/lifecycle only; no assignment/profile hook | Current public identity, unit, visibility editorial |
| Organization, only on demonstrated reuse | Name/title required; other fields optional | Native RBAC/lifecycle only | Shared metadata and links optional |
| Health Service | Official-name title required; other fields optional, supplied values type-checked | Native RBAC/lifecycle only; no Area/code/coordinate hook | Facility code, location, coverage, status, contact editorial |
| Service | Title required; other fields optional, supplied values type-checked | Native RBAC/lifecycle only; no channel/guidance/URL hook | Ownership, categories, channels, guidance editorial |
| Document | Title and native file required at save | Native RBAC/lifecycle only | Type, owner, dates, successor editorial |
| Health Report | Title and one Document reference required at save; native cardinality | Native RBAC/lifecycle and built-in reference checks; no custom hook | Type, Topic, period, owner, Area editorial |
| Area reference | Native taxonomy term label/slug/parent supplied-value validation | No independent content publication action | Official codes and hierarchy maintained from authoritative sources |

Only native validation and permission checks are automated. Missing optional
content/classification values may remain at Publish/Schedule; this is a deliberate
V1 tradeoff and not an automated completeness guarantee. Incomplete drafts
violating save-time requiredness may be refused. Valid selections never guarantee
linked-target availability, retention or historical immutability. No custom hook,
reference adapter or second RBAC layer is proposed.

**Deferred Q1 ITA rows — D-ITA only; not V1 publication requirements:**

| Deferred resource | Retained future field rule |
| --- | --- |
| ITA Fiscal Year | Fiscal-year value and display order |
| ITA Section / MOIT | Code, title, display order, parent fiscal year |
| ITA Requirement / Item | Code/number, title, description, display order, parent section |
| ITA evidence item | One selected Document, media asset, or external URL target; labels/order remain optional as specified. No minimum evidence count is required for a requirement. |

### Key Entities *(include if feature involves data)*

These describe meaning and responsibilities, not a required number of collections.

| Resource | Meaning / attributes | Relationships / boundary |
| --- | --- | --- |
| Basic Page | General information; title/body, optional summary | Relevant assets/Documents; not a substitute for structured kinds |
| News | Time-oriented story; title/summary/body/image/classification | Optional useful related records; Featured is presentation |
| Activity | Date/time/location, description, gallery/participants | Optional Topic/Area/Personnel; external participants may be text |
| Announcement | Notice/type/details and applicable dates | Documents; closure/expiry is domain context |
| Health Content | Evergreen guidance/Topic/source/body/media/review dates | Review dates do not automatically unpublish |
| Personnel | Public identity/current assignment/unit/contact/visibility | Organization where useful; no assignment-history feature; distinct from HR and editing account |
| Organization | Reusable identity/type/responsibilities/affiliation/contact | Conditional on structured reuse |
| Health Service | Facility/code/type/status/location/hours/contact | Organization, offered Services, service Areas |
| Service | Guidance/provider/channels/eligibility/steps/documents | Documents and offering facilities; no transactions |
| Document | Semantic file record/type/date/year/owner/successor/status | Reusable authoritative media file; no DMS |
| Health Report | Report metadata/period/Topic/owner/date/Area/year | Report Document; no metrics dataset |
| Area Reference | Shared official-coded hierarchy | Native hierarchical taxonomy in the proposed Plan; no Area content collection |
| ITA hierarchy / Evidence — deferred D-ITA | Year-specific hierarchy/codes/order/targets and preservation | No V1 collection, route, Admin workflow or acceptance; future semantic meaning preserved |
| Classification / media / contact / system metadata | Shared labels/assets/owner contact/editorial identity | Existing CMS or owner responsibility; no duplicate entities |

### Scope Boundaries

#### In Scope

- Definitions and acceptance requirements for all retained Version 1 semantic resources in
  `02` §24 and justified relationships, including conditional Organization and current Personnel
  assignments. Assignment history is excluded by accepted Q2.
- Shared classification/official identifiers, Document/media distinctions, owner contact,
  and retained model-specific access/publication/validation requirements; no structured ITA history.
- Future proof of staff maintenance through the primary CMS and publication-safe public reads;
  public page construction is not part of the model feature.
- Mapping-gate screening, foundation dependencies and explicit deferred-scope traceability.

#### Explicitly Out of Scope

- Beyond the authorized official Plan workflow: Checklist, Tasks, Analyze, implementation,
  schema/seed/infrastructure/dependency change, production
  operations/deployment or merge. No Specify/Clarify rerun or upstream pursuit/submission/contact.
- Structured ITA hierarchy/evidence/history/correction/retention (D-ITA); unavailable Q4 removal
  vetoes and cross-record atomic publication/availability enforcement (D-REF). No substitute
  ordinary page/Document workflow, snapshot subsystem or new architecture is approved.

- Public page/route/template implementation, Homepage curation implementation, visual design,
  public search implementation, and external-consumer APIs.
- Production editorial population, WordPress migration/import/legacy cutover, and invented real
  classifications/service/facility/Area inventories.
- Dashboard metrics/analytical datasets, patient/EMR/HIS/HR, queue/appointment/billing/stock,
  payment/signature/transaction/case engines, DMS/DAM, confidential file delivery.
- Duplicate Media/File/generic Contact/native metadata, executive/Featured/Health News kinds,
  universal lifecycle/status, and speculative cross-resource relations.
- Personnel assignment-history feature, required history start/end dates, retained past-assignment
  records and public past-assignment directory; later history needs require a separate Product case.
- Custom Admin SPA/page builder/ITA workspace absent an accepted demonstrated gap; custom RBAC,
  Module Scope/overrides/approval roles/states/queues, workflow/compliance/scoring engines,
  custom revisions/preview/locks/schedulers/retry managers, or a universal audit system.
- Second backend/platform/database, Domain/Application/Policy layers, search projections,
  snapshot infrastructure, importer/redirect frameworks, parallel development/deployment stacks.
- Feature 001 T022/T028 execution/acceptance or any final foundation acceptance claim.

## Success Criteria *(mandatory)*

### Measurable Outcomes

These are future reduced-V1 acceptance outcomes, not runtime results or a completed Plan.
Agreed fixtures must cover each unconditional resource and every Product-confirmed conditional case.
Q1/Q2 and retained Q4 public-read/selection boundaries define V1 fixtures. US5/FR-014–017/
SC-004 and stronger Q4 enforcement fixtures are deferred, excluded from V1 denominators and never
counted as PASS. Runtime outcomes remain unverified by this document-only reconciliation.

- **SC-001**: Staff create/save/reopen/correctly identify 100% of retained representative records in US1–4,
  with zero generic-page substitutions or duplicate presentation-only kinds.
  A changed/ended Personnel-assignment fixture retains the same identity and correct current
  assignment/unit/visibility, without requiring a historical assignment record or public past directory.
- **SC-002**: One authoritative Document/file is reusable from Announcement, Service, and Health
  Report with zero additional context uploads or duplicate Document records.
- **SC-003**: Every agreed service/facility/Area fixture preserves the same relationship from both
  directions and unchanged official identifiers; location remains distinguishable from service area.
- **SC-004**: **DEFERRED D-ITA; not V1 acceptance.** The original two-year structure/evidence,
  historical preservation under shared edits, public retention and traceable authorized correction
  outcomes remain future requirements under US5/FR-014–017. No V1 fixture/PASS is claimed.

- **SC-005**: Every agreed retained draft/publication/preview/ownership/admin-boundary fixture
  has the native allowed/refused outcome, with zero unauthorized draft exposure/publication or
  premature staged content-data/scheduled-update exposure. Public linked-target reads omit
  unavailable content and never expose its draft; missing files have a safe unavailable state.
  Native save-time mandatory-reference refusals and supported publication checks are covered by SC-006. D-REF cross-record availability and
  target-removal guarantees, and atomic staging of separately maintained metadata, are not inferred.

- **SC-006**: Every agreed native-invalid-input, stale-write, failed action,
  trash/restore or uncertain-outcome fixture reports the correct native state
  without false success or silent overwrite. Each resource's save-time required
  fields/references and native supplied-value constraints are verified. For
  intentionally optional content/taxonomy fields, successful native Save and
  authorized Publish/Schedule MUST NOT be reported as a custom completeness
  rejection. Native scheduling and due-time outcomes follow the platform;
  no Songhealth validation plugin, conditional relationship gate or extra
  editorial confirmation is assumed. D-REF/D-ITA remain outside V1 acceptance.

- **SC-007**: Staff demonstrate author/select/reuse/find/correct journeys with recognizable labels
  and zero undocumented technical intervention to maintain representative records.
- **SC-008**: Review accounts for every proposed resource/relation under all four mapping questions,
  with zero speculative collections, duplicate mechanisms, confidential-data fields, or
  unjustified extensions/second foundations.

## Assumptions

- Current Product authorities define meaning; code/foundation evidence only shows the starting point.
- All retained Version 1 semantic resources are covered; Organization and additional relations
  remain conditional on the sources' demonstrated-use gates. Accepted Q2 limits Personnel to
  current assignments; assignment history requires a separate confirmed Product use case.
- The primary CMS and its supported lifecycle/access/media are reused. Proposed native field types,
  collection/cardinality/Area/current-assignment choices and revised Q1 mapping are in `data-model.md`
  for Plan Independent Review; no schema is applied or ITA storage selected in V1.
- Domain dates/status retain their meaning; no universal enum or automatic unpublish is inferred.
- Q3 and unavailable Q4 guarantees are explicitly deferred by the Product Owner; ordinary native
  media/Document reuse, revision history and staff precautions cannot be claimed to satisfy them.
- V1 uses native publication, RBAC, save-time value/reference constraints and safe public reads. No Songhealth publication hooks or human article-approval step.
  Current Q1 mapping and field/metadata boundaries are documented in the completed Plan; native
  integration/UAT verification remains future work and no runtime PASS is inferred.

- Verification data will be synthetic/public-publishable; real staff assignments, inventories,
  classification terms, and Area/code values are not invented.
- Conditional reuse fixtures require a recorded Product use case before they become collection
  or acceptance obligations. Past Personnel assignments are outside Feature 002 acceptance;
  ITA historical-evidence acceptance is deferred independently under D-ITA.

### Dependencies and Authority

- Governance: `AGENTS.md` and `.specify/memory/constitution.md` v2.0.0.
- Primary Product sources: `docs/website-modernization-docs/current/02-content-model.md` §§1–24;
  `05-admin-cms.md` §§1–5/7–15; `06-roles-permissions.md` §§1–12;
  `07-publishing-workflow.md` §§1–15. Context: `00-website-foundation.md` §§1–3;
  `01-information-architecture.md` §§1/3–12/16–18.
- Architecture remains `docs/website-modernization-docs/current/10-system-blueprint.md` v2.5 (native Q1 reconciliation for review),
  especially §§4–9/11–12/15/18–23. The canonical platform/configuration remains unchanged; its
  unavailable ITA/reference enforcement acceptance is explicitly deferred.
- Baseline: `9GotStory/songhealth`, `001-platform-foundation`,
  `67770b0ebf77b623af838d4a77b186a358b7ff4e`. Feature 001 approved spec (embedded clarifications),
  plan/tasks, and T029 source evidence identify foundation/boundaries; they do not authorize
  Feature 002 implementation.
- **T022 production durability: PENDING. T028 recovery: PENDING.** T028 still requires T022 PASS
  and accepted T023–T027 sources; T030 still requires T028 PASS and accepted T029 sources.
  T029 source evidence is not runtime PASS or final Feature 001 acceptance.
- Specify was authorized despite pending runtime evidence. Issue 9GOTSTORY-206 authorized
  Clarify only. Issue 9GOTSTORY-207 now authorizes completion of this existing official Plan; no authorization
  permits dependent runtime work.
  The Product Owner must establish required Feature 001 readiness/dependencies at a later
  Feature 002 gate. Pending evidence cannot be treated as PASS.
- The Plan records exact-release source evidence and future native integration/UAT scenarios;
  source observations and current external documentation are not runtime acceptance evidence.
- No `PROJECT-STATUS.md`, `PRE-IMPLEMENTATION-GATE.md`, or separate clarification file is
  present at baseline. No replacement approval artifact is invented.

### Decision Traceability — Existing Plan Human Gate

Current Q1 and unchanged Q2 apply to retained V1 scope. Q3/Q4 original answers remain in the historical
session; Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8` explicitly changes their
V1 applicability. Continuation comment `01a13779-da61-71be-bc11-46d3ea9d5413` adopts that reviewed
reconciliation as current baseline and authorizes the remaining official Plan. Later decision
`01a13788-95c6-72f5-8787-f86b4e0c5fd6` explicitly changes Q1 native validation semantics and
resolves B-Q1-REF. Research/design are completed within that same Plan; no rerun of Clarify or
additional workflow phase occurs. Implementation and independent/runtime acceptance are not implied.

1. **Q1 (FR-002/026, matrix, US1.6–7/US2.6, SC-006):** native validation semantics on 12 V1
   rows revised by the native-first decision: mandatory references may block create/save; supported
   content-data/classification action checks remain, unsupported conditional relationship gates do
   not. Four ITA rows stay D-ITA. B-Q1-REF is resolved by this Product decision, not a new adapter.
2. **Q2 (FR-008/009, US3.4, SC-001):** current assignment/unit/visibility on the same identity;
   no assignment-history feature. No ITA historical guarantee is attached to V1 Personnel acceptance.
3. **Q3 (US5, FR-014–017, SC-004):** deferred D-ITA in full, including structured history,
   immutable/preserved evidence, retained published years and traceable correction. No ordinary
   Document/media workflow is substituted or counted as passed.
4. **Q4 (US2.6–8/US6.8, FR-020/025/026, SC-005/006):** public-only reads, safe unavailable
   targets, native valid selections and native authority retained; removal veto and atomic cross-record
   target/file availability are deferred D-REF. Preconditions/precautions are not enforcement.

Other inputs before implementation/UAT acceptance: real Organization/shared-object reuse examples;
Service/facility inventories; classification terms/official Area sources; operational role
assignments/site timezone; and the Feature 001 dependency gate for subsequent Feature 002 work.
These inputs do not authorize additional entities, custom permissions/workflows, or architecture.

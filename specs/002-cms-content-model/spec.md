# Feature Specification: CMS Content Model

**Feature Branch**: `002-cms-content-model`

**Created**: 2026-10-13

**Status**: Clarify complete — awaiting ChatGPT Independent Review and Product Owner acceptance
of the resulting artifact. No later phase is authorized.

**Input**: Initialize Feature 002 from approved Songhealth content, administration, access, and
publishing authorities. Define Product meaning, staff journeys, relationships, acceptance
scenarios, and scope boundaries; identify Product decisions and foundation dependencies.
Originally produced at Specify. Issue 9GOTSTORY-206 authorizes Clarify only from baseline
`4e3fb02b44ac5650cc63b17e441b7cb0321ddc00`; stop after Clarify. This document authorizes no
later phase or implementation.

## Clarifications

### Session 2026-10-13

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
6. **Given** an incomplete draft, **When** an authorized author saves it, **Then** missing Product
   fields alone do not block save; native identity, authorization, invalid supplied values, and
   confidentiality constraints still apply.
7. **Given** a missing or invalid applicable Q1 publication field, **When** publication or schedule
   acceptance is attempted, **Then** the action is refused with a readable explanation. Validation
   also applies before a scheduled revision becomes public; an incomplete pending edit does not
   replace the existing public version.

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
3. **Given** a raw image or screenshot, **When** it is selected as media or ITA evidence, **Then**
   it is reusable without a generic File/Media content record or mandatory semantic Document.
4. **Given** a Document has a successor or expiry context, **When** that metadata changes, **Then**
   domain context remains separate from publication state and the original file/successor remain
   identifiable without copying either.
5. **Given** a public image, **When** staff select it, **Then** available alternative text/caption
   and asset metadata can be maintained; media storage is not presented as confidential storage.
6. **Given** a Health Report with an unavailable required Document or file, **When** publication
   or schedule acceptance/execution is attempted, **Then** it is refused with a readable explanation;
   an incomplete draft may still be saved under Q1. An available published Document and existing
   file satisfy this relationship check, without an extra upload.
7. **Given** an unavailable optional linked record, **When** its parent is published/read publicly,
   **Then** the optional link is omitted from public reads and does not block the parent; no draft
   or unpublished target content is exposed.

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
   native editorial revisions remain the traceability baseline and past-year ITA context is unchanged.
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

### User Story 5 - Maintain Yearly ITA Evidence (Priority: P2)

As an ITA editor, I can configure yearly sections/requirements, attach ordered evidence, and
preserve past-year evidence independently of current personnel/organization changes.

**Why this priority**: Evidence must remain understandable and historically accurate.

**Independent Test**: Prepare two different fiscal-year structures with ordered Document, media,
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

As a staff author, I can save drafts; as an authorized publisher, I can review/publish/schedule
content without exposing draft changes prematurely.

**Why this priority**: The model must preserve editorial and permission boundaries.

**Independent Test**: With prepared draft-only, publisher, and administrator access and a
representative record, exercise supported CMS operations and public-read verification without
adding public page templates.

**Acceptance Scenarios**:

1. **Given** a saved draft, **When** anonymous reading or unauthorized preview is attempted,
   **Then** it is not exposed; direct publish/schedule attempts by draft-only staff are refused
   at the trusted system boundary.
2. **Given** published content, **When** pending edits are saved/previewed, **Then** the previous
   live version remains public until authorized publication.
3. **Given** authorized one-time scheduling, **When** scheduled, **Then** timezone is explicit,
   publication never occurs early, existing live content remains until update success, and
   available overdue/failure evidence is observable.
4. **Given** published content eligible under the accepted Q3 retention and Q4 reference rules,
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
8. **Given** a target required by published content, **When** unpublish/trash/permanent deletion or
   asset removal is attempted, **Then** it is refused with a readable explanation, even when the
   actor otherwise has permission for that action. Staff first deliberately update the published
   references or unpublish eligible parents; retained ITA years remain public with valid replacements
   where required and Q3 traceability. No parent or target is automatically unpublished/deleted.

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

- Featured selections and Health News filters do not create another kind or duplicate records.
- Explicitly optional inputs remain optional; accepted Q1 defines action-specific validation.
  An incomplete draft remains saveable; failed publication validation leaves existing live content
  unchanged, including when a scheduled revision is no longer valid at its publication time.
- Activity/announcement/document/report dates are distinct from editorial timestamps; closed,
  expired, superseded, and review-due contexts are not universal publishing states.
- One Document reused across three contexts retains one authoritative file; successor changes
  must not silently substitute historical ITA evidence.
- A required unavailable content target blocks parent publication, schedule acceptance and
  scheduled publication; required file assets must exist. Incomplete drafts remain allowed.
  Unavailable optional links are omitted from public reads without blocking the parent.
- Unpublish/trash/permanent deletion or asset removal is refused while published content requires
  the target. Staff first deliberately update the published references or unpublish eligible parents;
  retained ITA years stay public with valid replacements where required and Q3 traceability.
  No automatic cascade or draft exposure is permitted.
- Official Area/facility codes survive reuse; a common label alone does not justify an entity.
- Editing one fiscal year or current Personnel/Organization does not rewrite past-year evidence.
- Every published ITA year remains public without automatic expiry; changing retention needs a
  separate Product decision. A deliberate historical correction must preserve traceability of the
  prior/replacement target and must not silently propagate across shared evidence or other years.
- An ended Personnel assignment does not create a historical assignment record or public past
  directory in this feature; it updates current public information without changing CMS access.
- Stale automation writes, conflicting saves, uncertain network outcomes, and failed schedules
  do not silently overwrite or falsely report success.
- Schema/access changes and permanent deletion retain administrator-only boundaries.
- Public contact/media must not become private personnel/clinical/confidential storage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Staff MUST maintain Basic Page, News, Activity, Announcement, and Health Content as
  distinct semantic kinds with the attributes in US1 and `02-content-model.md` §§3–7.
- **FR-002**: Missing Product fields alone MUST NOT block draft save. Native identity requirements,
  authorization, invalid supplied values, and confidentiality constraints MUST still apply.
  Publication and schedule acceptance MUST validate the applicable fields in the accepted Q1
  matrix below; validity MUST be checked before scheduled publication. Explicitly optional fields
  MUST remain optional; conditional fields MUST apply only when their stated condition is met.
  Invalid or incomplete pending edits MUST NOT replace an existing public version.
- **FR-003**: Basic Page MUST NOT substitute for a structured kind; Featured/Health News/leadership
  views and additional presentation contexts MUST NOT create duplicate kinds or source copies.
- **FR-004**: Document MUST be a semantic public record around a file with title, optional summary,
  type, applicable Topic/date/year/owner/source, reusable file selection, and optional successor/
  current-version/domain status (`02` §13).
- **FR-005**: Raw images/files MUST use the existing media resource and available alternative
  text/caption/type/size/dimensions/usage metadata. They MUST NOT automatically require a Document
  or duplicate Media/File record (`02` §14).
- **FR-006**: About content, Services, Health Reports, Announcements, and ITA MUST reuse the same
  authoritative Document/file where needed rather than upload context copies.
- **FR-007**: Health Report MUST be metadata plus a related Document with period/Topic/owner/source,
  applicable date, and optional Area/year (`02` §16), without storing analytical metrics.
- **FR-008**: Personnel MUST contain public directory information and visibility in US3 and
  `02` §8, with only appropriate public contact. Feature 002 MUST maintain current public
  assignment/unit/visibility on the same Personnel identity; it MUST NOT introduce an
  assignment-history feature or public past-assignment directory. Assignment-history start/end
  dates and retained past-assignment records are not required. Later history needs MUST have a
  separately confirmed Product use case. Native editorial revisions remain the traceability
  baseline; current assignment edits MUST NOT rewrite historical ITA evidence context.
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
  MUST leave live content unchanged until publication; an unpublish permitted by Q3 retention and
  Q4 reference rules MUST remove the public version while retaining editable information
  (`07` §§2/4/6).
- **FR-023**: One-time future publication MUST show timezone, never publish early, retain current
  live content until update success, and expose available failure/overdue evidence; recurring
  or scheduled-unpublish machinery is not required (`07` §5).
- **FR-024**: Supported revisions/preview/explicit save/autosave/draft recovery/locks/concurrency
  MUST be used where needed; stale/concurrent writes MUST NOT silently overwrite (`05` §3;
  `07` §§8–9).
- **FR-025**: Trash/restore MUST be ordinary deletion; permanent deletion MUST be administrator-only
  with reference/retention consideration (`07` §10). Unpublish/trash/permanent deletion or asset
  removal MUST be refused while published content requires the target. Staff MUST first deliberately
  update the affected published references or unpublish eligible parents; retained ITA years MUST
  stay public with valid replacements where required and Q3 traceability. There MUST NOT be an
  automatic cascade of unpublication or deletion.
- **FR-026**: Validation and failed/uncertain actions MUST produce readable, truthful results;
  uncertain lifecycle outcomes MUST be re-read before retry. Relationship constraints MUST
  preserve publication access boundaries (`07` §§7/13). Required linked content MUST have an
  available published version at parent publication, schedule acceptance and scheduled publication;
  required file assets MUST exist. An unavailable required target MUST cause a readable refusal,
  leaving any existing live version unchanged. Missing required relations MAY remain in incomplete
  drafts under Q1; unavailable optional links MUST NOT block parent publication.
- **FR-027**: Schema/users/access/plugins/site-wide security/settings/backup/import/transfer and
  permanent deletion MUST retain administrator boundaries. Native authorship/timestamps/revisions/
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

**Q1 publication matrix — Product Owner accepted Option A (2026-10-13).**

This matrix makes the applicable non-optional attributes in `02-content-model.md` publication
requirements by explicit Product decision; source field lists alone did not establish requiredness.
It defines semantics, not schema or collection count. Relations not applicable to the real record
may be empty. Slash-separated source alternatives describe alternative representations, not a
demand to fill both versions. No minimum evidence count is required for an ITA requirement.

| Resource | Required for publication / schedule acceptance |
| --- | --- |
| Basic Page | Title and body |
| News | Title, summary, body, featured image, News Category, Topic/Health Topic classification |
| Activity | Title, summary/description, activity date/time, location, featured image/gallery, participants/context text |
| Announcement | Title, summary/details, type, announcement date; opening/closing dates and related Documents when applicable |
| Health Content | Title, summary, body, Health Topic, source/byline, featured image/media |
| Personnel | Prefix, first/last name, display name, profile image, current public assignment, organizational unit, public visibility/current status; public contact only where appropriate. No assignment-history start/end dates or retained past assignments are required (accepted Q2). |
| Organization, only where reuse justifies it | Name and type; parent/affiliation, owner contact, and active/inactive visibility when applicable |
| Health Service | Official name, official facility/service code, type, operational status, address and coordinates, opening hours, public contacts, service-area references, and offered-Service relationships when applicable |
| Service | Name, summary, Category/Topic/Audience, ownership type, provider/owner, channels, eligibility and steps guidance, required-document guidance, contact/location guidance; duration/fees/notes when applicable, external URL for an external service, and Document/facility relationships when applicable |
| Document | Title, Document Type, and a selected public file |
| Health Report | Title, summary, type, Health Topic, reporting period, owner/source, related report Document; report date when meaningful |
| Area reference, in whichever representation is later justified | Identity and applicable parent hierarchy; official/stable code when connecting other data |
| ITA Fiscal Year | Fiscal-year value and display order |
| ITA Section / MOIT | Code, title, display order, parent fiscal year |
| ITA Requirement / Item | Code/number, title, description, display order, parent section |
| ITA evidence item | One selected Document, media asset, or external URL target; labels/order remain optional as specified. No minimum evidence count is required for a requirement. |

Optional images, summaries, classifications, contacts, and related records stay optional wherever
the owning source explicitly marks them optional. This matrix imposes no new media metadata
requirements, retention period, custom permission, or implementation mechanism.

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
| Area Reference | Shared official-coded hierarchy | Classification/service area; storage undecided |
| ITA Year / Section / Requirement | Year-specific ordered hierarchy/codes/titles/descriptions | Structural resources only as needed; all published years retained; authorized traceable corrections |
| ITA Evidence item | Ordered Document/media/URL with optional label | No assumed standalone route or compliance workflow |
| Classification / media / contact / system metadata | Shared labels/assets/owner contact/editorial identity | Existing CMS or owner responsibility; no duplicate entities |

### Scope Boundaries

#### In Scope

- Definitions and acceptance requirements for all canonical Version 1 semantic resources in
  `02` §24 and justified relationships, including conditional Organization and current Personnel
  assignments. Assignment history is excluded by accepted Q2.
- Shared classification/official identifiers, Document/media distinctions, owner contact,
  ITA history, and model-specific access/publication/validation requirements.
- Future proof of staff maintenance through the primary CMS and publication-safe public reads;
  public page construction is not part of the model feature.
- Mapping-gate screening, dependencies, and unresolved Product decisions.

#### Explicitly Out of Scope

- Beyond this authorized Clarify session: Plan, Checklist-phase artifacts, Tasks, Analyze, implementation,
  schema/seed/infrastructure/dependency changes, production operations/deployment, or merge.
  The existing Specify quality checklist is re-evaluated during Clarify; this is not the later
  Checklist phase.
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

These are future acceptance outcomes, not runtime results established by Specify or Clarify.
Agreed fixtures must cover each unconditional resource and every Product-confirmed conditional case.
Accepted Q1–Q4 define the publication, current-assignment, historical-correction and relationship
fixtures; runtime outcomes remain unverified by this document-only phase.

- **SC-001**: Staff create/save/reopen/correctly identify 100% of representative records in US1–5,
  with zero generic-page substitutions or duplicate presentation-only kinds.
  A changed/ended Personnel-assignment fixture retains the same identity and correct current
  assignment/unit/visibility, without requiring a historical assignment record or public past directory.
- **SC-002**: One authoritative Document/file is reusable from Announcement, Service, and Health
  Report with zero additional context uploads or duplicate Document records.
- **SC-003**: Every agreed service/facility/Area fixture preserves the same relationship from both
  directions and unchanged official identifiers; location remains distinguishable from service area.
- **SC-004**: Two fiscal-year fixtures with different structures and all three evidence target kinds
  retain 100% of evidence targets/order and required historical context after next-year and
  current Personnel/Organization or shared Document/media edits, with zero automatic carry-forward.
  Both published years remain public with no automatic expiry. A deliberate correction fixture
  changes only the authorized published revision and intended year's evidence, with identifiable
  actor/time/change and prior/replacement targets; unauthorized correction has zero effect.
- **SC-005**: Every agreed draft/publication/preview/ownership/admin-boundary case has the expected
  allowed/refused outcome, with zero unauthorized draft exposure/publication or premature pending
  edit/scheduled update exposure. Required unavailable content/file target fixtures refuse parent
  publication and schedule acceptance/execution; unavailable optional-link fixtures allow the
  parent and omit those links from public reads, with zero draft target exposure.
- **SC-006**: Every agreed invalid-input/stale-write/failed-action/trash-restore/uncertainty case
  yields the correct state and readable result with zero false success or silent overwrite.
  For every applicable Q1 matrix field, a missing-value fixture MUST allow draft save subject to
  the stated native/safety constraints and MUST refuse publication/schedule acceptance. A revision
  invalidated before its scheduled publication MUST remain non-public, preserving any live version.
  Required-reference removal fixtures refuse unpublish/trash/permanent deletion or asset removal
  until published dependencies are deliberately resolved; eligible-parent removal and retained-ITA
  replacement fixtures follow Q3/Q4 with zero automatic cascades.
- **SC-007**: Staff demonstrate author/select/reuse/find/correct journeys with recognizable labels
  and zero undocumented technical intervention to maintain representative records.
- **SC-008**: Review accounts for every proposed resource/relation under all four mapping questions,
  with zero speculative collections, duplicate mechanisms, confidential-data fields, or
  unjustified extensions/second foundations.

## Assumptions

- Current Product authorities define meaning; code/foundation evidence only shows the starting point.
- All canonical Version 1 semantic resources are covered; Organization and additional relations
  remain conditional on the sources' demonstrated-use gates. Accepted Q2 limits Personnel to
  current assignments; assignment history requires a separate confirmed Product use case.
- The primary CMS and its supported lifecycle/access/media are reused. Exact field types,
  collection count/cardinalities, Area/assignment/ITA storage, and validation mechanisms belong
  to a separately authorized later phase.
- Domain dates/status retain their meaning; no universal enum or automatic unpublish is inferred.
- Accepted Q3 retains every published ITA year; native traceability must support deliberate
  historical corrections. A demonstrated capability gap must be surfaced at the owning-authority
  review gate, not treated as authorization for a custom historical subsystem.
- Verification data will be synthetic/public-publishable; real staff assignments, inventories,
  classification terms, and Area/code values are not invented.
- Conditional reuse fixtures require a recorded Product use case before they become collection
  or acceptance obligations. Past Personnel assignments are outside Feature 002 acceptance;
  ITA historical-evidence acceptance remains required independently.

### Dependencies and Authority

- Governance: `AGENTS.md` and `.specify/memory/constitution.md` v2.0.0.
- Primary Product sources: `docs/website-modernization-docs/current/02-content-model.md` §§1–24;
  `05-admin-cms.md` §§1–5/7–15; `06-roles-permissions.md` §§1–12;
  `07-publishing-workflow.md` §§1–15. Context: `00-website-foundation.md` §§1–3;
  `01-information-architecture.md` §§1/3–12/16–18.
- Architecture remains `docs/website-modernization-docs/current/10-system-blueprint.md` v2.3,
  especially §§4–9/11–12/15/18–23; this specification changes none of its choices.
- Baseline: `9GotStory/songhealth`, `001-platform-foundation`,
  `67770b0ebf77b623af838d4a77b186a358b7ff4e`. Feature 001 approved spec (embedded clarifications),
  plan/tasks, and T029 source evidence identify foundation/boundaries; they do not authorize
  Feature 002 implementation.
- **T022 production durability: PENDING. T028 recovery: PENDING.** T028 still requires T022 PASS
  and accepted T023–T027 sources; T030 still requires T028 PASS and accepted T029 sources.
  T029 source evidence is not runtime PASS or final Feature 001 acceptance.
- Specify was authorized despite pending runtime evidence. Issue 9GOTSTORY-206 now authorizes
  Clarify only; neither authorization permits dependent runtime work.
  The Product Owner must establish required Feature 001 readiness/dependencies at a later
  Feature 002 gate. Pending evidence cannot be treated as PASS.
- Later design must verify supported model operations against the actual pinned CMS release;
  current external documentation alone is not release-specific or runtime evidence.
- No `PROJECT-STATUS.md`, `PRE-IMPLEMENTATION-GATE.md`, or separate clarification file is
  present at baseline. No replacement approval artifact is invented.

### Open Product Decisions — Human Gate

Q1–Q4 are accepted and integrated above. Four questions were asked sequentially and all four
answers were accepted. No unresolved Product clarification remains within this feature's approved
scope. The resulting artifact still requires Independent Review and Human Acceptance; completion
of Clarify does not authorize Plan or implementation.

1. **Q1 — Requiredness/action matrix (FR-002; US1.6/7.2; SC-006).**
   **Resolved**: Product Owner accepted Option A; see the Clarifications session, FR-002,
   the Q1 publication matrix, US1.6–7 and SC-006.
2. **Q2 — Personnel assignment history (FR-008; US3.4).**
   **Resolved**: Product Owner accepted Option A, current assignments only; see the Clarifications
   session, FR-008, US3.4, SC-001 and Scope Boundaries. No assignment-history subsystem or public
   past-assignment directory is part of this feature.
3. **Q3 — ITA historical years/corrections (FR-017; US5.4; SC-004).**
   **Resolved**: Product Owner accepted Option A, retain all published years without automatic
   expiry and allow native-authorized, traceable corrections; see the Clarifications session,
   FR-017, US5.4/6 and SC-004. No automatic evidence carry-forward is permitted.
4. **Q4 — Unavailable relationship targets (FR-020/025/026; Edge Cases; SC-005/006).**
   **Resolved**: Product Owner accepted Option A; required unavailable targets block publication
   and required-by-published targets cannot be removed until dependencies are deliberately resolved.
   Optional unavailable links are omitted from public reads; no automatic cascade or draft exposure.
   See the Clarifications session, FR-020/025/026, US2.6–7/US6.8 and SC-005/006.

Other inputs before later design/acceptance: real Organization/shared-object reuse examples;
Service/facility inventories; classification terms/official Area sources; operational role
assignments/site timezone; and the Feature 001 dependency gate for subsequent Feature 002 work.
These inputs do not authorize additional entities, custom permissions/workflows, or architecture.

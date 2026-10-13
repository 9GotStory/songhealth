# Feature Specification: CMS Content Model

**Feature Branch**: `002-cms-content-model`

**Created**: 2026-10-13

**Status**: Draft — Specify only; awaiting ChatGPT Independent Review and Product Owner acceptance.

**Input**: Initialize Feature 002 from approved Songhealth content, administration, access, and
publishing authorities. Define Product meaning, staff journeys, relationships, acceptance
scenarios, and scope boundaries; identify Product decisions and foundation dependencies.
Stop after Specify. This document authorizes no later phase or implementation.

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
6. **Given** a field mandatory under the Product-approved validation matrix, **When** it is missing
   or invalid, **Then** the applicable action is refused with a readable explanation. Q1 must
   define the field/action matrix; the listed attributes alone do not imply requiredness.

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
4. **Given** a Product-confirmed history requirement, **When** an assignment ends, **Then** the
   required prior assignment information is retained. Q2 must establish actual history and
   public-visibility needs before this conditional scenario is finalized.
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
4. **Given** a year required to remain public under Q3, **When** current Personnel/Organization
   changes, **Then** its evidence context is unchanged and it remains available under publishing
   rules. Required historical-year inventory and correction policy await Q3.
5. **Given** an existing authoritative Document, **When** used as evidence, **Then** it is reused
   where practical; this creates no scoring, compliance, or approval engine.

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
4. **Given** published content, **When** unpublished/trashed, **Then** public reads exclude it
   while editable/restorable information remains; permanent deletion requires administrator
   authority and consideration of references/retention.
5. **Given** enabled revision/concurrency protection, **When** a stale/conflicting save occurs,
   **Then** newer work is not silently overwritten; supported revision review/restore and
   autosave/draft recovery remain usable.
6. **Given** failed or uncertain save/publish/schedule, **When** staff review the result, **Then**
   success is not falsely reported; current state is re-read before a lifecycle retry.
7. **Given** an unauthorized/disabled account, **When** it attempts protected content or
   schema/security administration directly, **Then** trusted role/ownership checks refuse it,
   regardless of visible controls or a person's public job title.

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
- Explicitly optional inputs remain optional; Q1 establishes action-specific validation.
- Activity/announcement/document/report dates are distinct from editorial timestamps; closed,
  expired, superseded, and review-due contexts are not universal publishing states.
- One Document reused across three contexts retains one authoritative file; successor changes
  must not silently substitute historical ITA evidence.
- Missing/trashed/unpublished referenced content must follow explicit relationship/visibility
  constraints and never grant public access to a draft; no cascade policy is invented here.
- Official Area/facility codes survive reuse; a common label alone does not justify an entity.
- Editing one fiscal year or current Personnel/Organization does not rewrite past-year evidence.
- Stale automation writes, conflicting saves, uncertain network outcomes, and failed schedules
  do not silently overwrite or falsely report success.
- Schema/access changes and permanent deletion retain administrator-only boundaries.
- Public contact/media must not become private personnel/clinical/confidential storage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Staff MUST maintain Basic Page, News, Activity, Announcement, and Health Content as
  distinct semantic kinds with the attributes in US1 and `02-content-model.md` §§3–7.
- **FR-002**: Validation MUST preserve explicitly optional attributes and use a Product-approved
  requiredness/action matrix. Q1 is unresolved; field lists alone MUST NOT imply every field is
  mandatory.
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
  `02` §8, with only appropriate public contact. Required assignment history is conditional;
  Q2 establishes actual retained/public history needs before design.
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
- **FR-017**: Required historical years MUST remain public; their evidence context MUST NOT
  dynamically change with current Personnel/Organization. Q3 establishes required years and
  permitted corrections; this MUST NOT imply a universal snapshot engine.
- **FR-018**: Shared Topic/Health Topic, Audience, Category/Type, and similar classifications MUST
  remain classifications where sufficient. Additional relations MUST have real reuse/discovery/
  history value; not every content kind MUST link to every other kind.
- **FR-019**: Office contact MUST remain office/site-owned; facility/service/personnel/organization
  contacts MUST remain with appropriate owners. No generic Contact entity is required without
  demonstrated shared-object maintenance (`02` §15).
- **FR-020**: Public reads MUST exclude drafts/unpublished content. Preview MUST require
  authorization; an unauthenticated query parameter MUST NOT expose drafts (`07` §8).
- **FR-021**: Draft-only staff MUST save drafts but MUST NOT publish/schedule. Trusted native
  role/ownership checks MUST govern own/others' content and administrative operations;
  hidden UI controls MUST NOT be treated as security (`06` §§2–8).
- **FR-022**: Editorial state MUST remain separate from domain timing/status. Saved pending edits
  MUST leave live content unchanged until publication; unpublish MUST remove the public version
  while retaining editable information (`07` §§2/4/6).
- **FR-023**: One-time future publication MUST show timezone, never publish early, retain current
  live content until update success, and expose available failure/overdue evidence; recurring
  or scheduled-unpublish machinery is not required (`07` §5).
- **FR-024**: Supported revisions/preview/explicit save/autosave/draft recovery/locks/concurrency
  MUST be used where needed; stale/concurrent writes MUST NOT silently overwrite (`05` §3;
  `07` §§8–9).
- **FR-025**: Trash/restore MUST be ordinary deletion; permanent deletion MUST be administrator-only
  with reference/retention consideration (`07` §10).
- **FR-026**: Validation and failed/uncertain actions MUST produce readable, truthful results;
  uncertain lifecycle outcomes MUST be re-read before retry. Relationship constraints MUST
  preserve publication access boundaries (`07` §§7/13).
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

### Key Entities *(include if feature involves data)*

These describe meaning and responsibilities, not a required number of collections.

| Resource | Meaning / attributes | Relationships / boundary |
| --- | --- | --- |
| Basic Page | General information; title/body, optional summary | Relevant assets/Documents; not a substitute for structured kinds |
| News | Time-oriented story; title/summary/body/image/classification | Optional useful related records; Featured is presentation |
| Activity | Date/time/location, description, gallery/participants | Optional Topic/Area/Personnel; external participants may be text |
| Announcement | Notice/type/details and applicable dates | Documents; closure/expiry is domain context |
| Health Content | Evergreen guidance/Topic/source/body/media/review dates | Review dates do not automatically unpublish |
| Personnel | Public identity/assignment/unit/contact/visibility | Organization where useful; distinct from HR and editing account |
| Organization | Reusable identity/type/responsibilities/affiliation/contact | Conditional on structured reuse |
| Health Service | Facility/code/type/status/location/hours/contact | Organization, offered Services, service Areas |
| Service | Guidance/provider/channels/eligibility/steps/documents | Documents and offering facilities; no transactions |
| Document | Semantic file record/type/date/year/owner/successor/status | Reusable authoritative media file; no DMS |
| Health Report | Report metadata/period/Topic/owner/date/Area/year | Report Document; no metrics dataset |
| Area Reference | Shared official-coded hierarchy | Classification/service area; storage undecided |
| ITA Year / Section / Requirement | Year-specific ordered hierarchy/codes/titles/descriptions | Structural resources only as needed; required history preserved |
| ITA Evidence item | Ordered Document/media/URL with optional label | No assumed standalone route or compliance workflow |
| Classification / media / contact / system metadata | Shared labels/assets/owner contact/editorial identity | Existing CMS or owner responsibility; no duplicate entities |

### Scope Boundaries

#### In Scope

- Definitions and acceptance requirements for all canonical Version 1 semantic resources in
  `02` §24 and justified relationships, including conditional Organization/assignment history.
- Shared classification/official identifiers, Document/media distinctions, owner contact,
  ITA history, and model-specific access/publication/validation requirements.
- Future proof of staff maintenance through the primary CMS and publication-safe public reads;
  public page construction is not part of the model feature.
- Mapping-gate screening, dependencies, and unresolved Product decisions.

#### Explicitly Out of Scope

- In this run: Clarify, Plan, Checklist-phase artifacts, Tasks, Analyze, implementation,
  schema/seed/infrastructure/dependency changes, production operations/deployment, or merge.
  The Specify-phase quality checklist is a required output of this run.
- Public page/route/template implementation, Homepage curation implementation, visual design,
  public search implementation, and external-consumer APIs.
- Production editorial population, WordPress migration/import/legacy cutover, and invented real
  classifications/service/facility/Area inventories.
- Dashboard metrics/analytical datasets, patient/EMR/HIS/HR, queue/appointment/billing/stock,
  payment/signature/transaction/case engines, DMS/DAM, confidential file delivery.
- Duplicate Media/File/generic Contact/native metadata, executive/Featured/Health News kinds,
  universal lifecycle/status, and speculative cross-resource relations.
- Custom Admin SPA/page builder/ITA workspace absent an accepted demonstrated gap; custom RBAC,
  Module Scope/overrides/approval roles/states/queues, workflow/compliance/scoring engines,
  custom revisions/preview/locks/schedulers/retry managers, or a universal audit system.
- Second backend/platform/database, Domain/Application/Policy layers, search projections,
  snapshot infrastructure, importer/redirect frameworks, parallel development/deployment stacks.
- Feature 001 T022/T028 execution/acceptance or any final foundation acceptance claim.

## Success Criteria *(mandatory)*

### Measurable Outcomes

These are future acceptance outcomes, not results established by Specify. Agreed fixtures must
cover each unconditional resource and every Product-confirmed conditional case. Q1–Q3-dependent
checks cannot be accepted until their decisions are recorded.

- **SC-001**: Staff create/save/reopen/correctly identify 100% of representative records in US1–5,
  with zero generic-page substitutions or duplicate presentation-only kinds.
- **SC-002**: One authoritative Document/file is reusable from Announcement, Service, and Health
  Report with zero additional context uploads or duplicate Document records.
- **SC-003**: Every agreed service/facility/Area fixture preserves the same relationship from both
  directions and unchanged official identifiers; location remains distinguishable from service area.
- **SC-004**: Two fiscal-year fixtures with different structures and all three evidence target kinds
  retain 100% of evidence targets/order and required historical context after next-year and
  current Personnel/Organization edits, with zero automatic carry-forward.
- **SC-005**: Every agreed draft/publication/preview/ownership/admin-boundary case has the expected
  allowed/refused outcome, with zero unauthorized draft exposure/publication or premature pending
  edit/scheduled update exposure.
- **SC-006**: Every agreed invalid-input/stale-write/failed-action/trash-restore/uncertainty case
  yields the correct state and readable result with zero false success or silent overwrite.
  Q1 establishes missing-input cases that block save versus publication.
- **SC-007**: Staff demonstrate author/select/reuse/find/correct journeys with recognizable labels
  and zero undocumented technical intervention to maintain representative records.
- **SC-008**: Review accounts for every proposed resource/relation under all four mapping questions,
  with zero speculative collections, duplicate mechanisms, confidential-data fields, or
  unjustified extensions/second foundations.

## Assumptions

- Current Product authorities define meaning; code/foundation evidence only shows the starting point.
- All canonical Version 1 semantic resources are covered; Organization, additional relations, and
  assignment history remain conditional on the sources' demonstrated-use gates.
- The primary CMS and its supported lifecycle/access/media are reused. Exact field types,
  collection count/cardinalities, Area/assignment/ITA storage, and validation mechanisms belong
  to a separately authorized later phase.
- Domain dates/status retain their meaning; no universal enum or automatic unpublish is inferred.
- Verification data will be synthetic/public-publishable; real staff assignments, inventories,
  classification terms, and Area/code values are not invented.
- Conditional reuse/history fixtures require a recorded Product use case before they become
  collection or acceptance obligations.

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
- This issue authorizes Specify despite pending runtime evidence, not dependent runtime work.
  The Product Owner must establish required Feature 001 readiness/dependencies at a later
  Feature 002 gate. Pending evidence cannot be treated as PASS.
- Later design must verify supported model operations against the actual pinned CMS release;
  current external documentation alone is not release-specific or runtime evidence.
- No `PROJECT-STATUS.md`, `PRE-IMPLEMENTATION-GATE.md`, or separate clarification file is
  present at baseline. No replacement approval artifact is invented.

### Open Product Decisions — Human Gate

No decision below has been answered or silently defaulted. The draft can be reviewed now;
affected requirements are not ready for planning/implementation. Returning questions is
part of Specify handoff, not execution of Clarify.

1. **Q1 — Requiredness/action matrix (FR-002; US1.6/7.2; SC-006).**
   [NEEDS CLARIFICATION: Which fields and relationships in each content kind are mandatory at draft
   save versus publication, beyond the attributes explicitly marked optional in `02`?]
   Product review options: permit incomplete drafts with a minimal publication matrix; require
   all non-optional listed fields at publication; or supply a per-kind matrix. These change
   accepted omissions and staff workflow; this author selects none.
2. **Q2 — Personnel assignment history (FR-008; US3.4).**
   [NEEDS CLARIFICATION: Which actual assignment-history cases require start/end dates and retained
   prior assignments, and which history must be publicly visible?]
   `02` §8 makes history conditional. Options: current assignments only for confirmed cases;
   bounded retained prior assignments with an explicit visibility rule; or a supplied office policy.
   Do not select storage/build a historical subsystem before the need is known.
3. **Q3 — ITA historical years/corrections (FR-017; US5.4; SC-004).**
   [NEEDS CLARIFICATION: Which fiscal years must remain public, and what corrections or evidence
   replacements are allowed in a published historical year?]
   The prohibition on dynamic historical changes with current Personnel/Organization is fixed
   (`02` §18). Options: retain all existing published years with explicit corrections; name the
   required-year inventory and correction rules; or supply another bounded policy preserving
   that invariant. No retention deadline or automatic replacement is assumed.

Other inputs before later design/acceptance: real Organization/shared-object reuse examples;
Service/facility inventories; classification terms/official Area sources; operational role
assignments/site timezone; and the Feature 001 dependency gate for subsequent Feature 002 work.
These inputs do not authorize additional entities, custom permissions/workflows, or architecture.

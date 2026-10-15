# CMS Content Model — Phase 1 Data Model

**Standing:** Phase 1 design reconciled through the existing official Plan for Independent Review;
no schema/configuration/DB applied. Native-only instruction: `01a137d4-3956-7621-92a5-a654dea51ef2`.
Authorities: current/02 §§1–24; 00 §8.1; 05/06/07; 10 §§4/7/11/22; active spec.

## Common Native Contract

Ten unconditional semantic content collections use native IDs, slug, status, author/owner,
timestamps, revisions, preview and one-time scheduling. Enable native `drafts`, `revisions`,
`preview`, `scheduling`, with search/SEO only where existing native behavior is useful. No system
field is copied into Product data. `title` is the actual title/name/display name (Thai label varies),
not an extra duplicate name. Native title/date configuration drives lists and slug behavior.

Use the owning document's Thai field meaning as native `label`, ordered in logical staff groups.
For example, title is ชื่อเรื่อง for prose, ชื่อที่แสดง for Personnel, ชื่อทางการ for a facility and
ชื่อบริการ for Service; วัน/เวลาจัดกิจกรรม is distinct from native publication time. Native labels
carry no implementation vocabulary; verify every label/picker/error with the SC-007 staff journey.

Notation: **S** is native schema save-time requiredness; **O** is optional
at save and Publish/Schedule except native built-in constraints and supplied-value
checks. Native `title` is required on semantic entries, `file` on Document,
and `report_document` on Health Report. Configure each of these fields with native top-level
`required: true`; all other content/reference fields remain non-required, with their native
supplied-value constraints. This is proposed configuration, not an already-applied schema.
No **P** publication-only predicate
or custom content/taxonomy validation hook exists. Optional fields can be
incomplete at publication under direct Native RBAC. EmDash still validates
supplied types/formats/values and reference/cardinality constraints. Staff
ensure appropriate editorial completeness and classification; native schema
does not promise historical media or cross-record availability. Native Save validation rejects
missing required values and empty required strings; malformed supplied values retain native
refusal — with one accepted V1 limitation (Product Owner approval
`01a13ed2-7a42-7aa7-b8a9-546c558ef316`): raw file values first pass the
platform's documented create/update-time media value normalization
(`src/media/normalize.ts`), which precedes schema validation. For three exact
observed raw inputs — `file: ""` and `file: "not-an-object"` (strings that are
neither http(s) URLs, internal media URLs nor resolvable local media IDs) and
`file: {id: 123}` (an object with no explicit `provider`/`src`) — the save is
accepted and stores, respectively, `{provider: "external", id: "", src: ""}`,
`{provider: "external", id: "", src: "not-an-object"}` and
`{id: "", provider: "local"}`. These are observed results for those exact
inputs, not universal rules: in general the normalizer resolves internal media
URLs and resolvable bare local media IDs to the real local item, maps http(s)
URLs to external references, and preserves an explicitly supplied object
`provider` (and `src`). Omitted/null
files and objects with neither `id` nor `src` remain native refusals; a
normalized empty `id`/`src` is not a real file selection and grants no
availability or retention guarantee. Optional body, gallery, channels and classifications have no added minimum-completeness
rule. Valid numeric zero and boolean false/native 0/1 are not missing values.

## Collection Fields

| Collection / Thai content label | Content data fields and native types | Classification / reference selections |
| --- | --- | --- |
| `pages` / ข้อมูลทั่วไป | `title` string S; `summary` text O; `body` portableText O; image/file fields O when useful | related Documents O; no generic-page substitute for structured kinds |
| `news` / ข่าว | `title` string S; `summary` text O; `body` portableText O; `featured_image` image O; `source_text` text O | `news_category` O, `topic` O; `area`/`audience` O |
| `activities` / กิจกรรม | `title` string S; `summary` text O; `activity_at` datetime O; `location_text` string O; `featured_image` image O; `gallery` repeater O; `participants_text` text O | `topic`/`area` O; no separate participant/place identity required |
| `announcements` / ประกาศ | `title` string S; `details` portableText O; `announcement_at` datetime O; `opens_at`/`closes_at` datetime O | `announcement_type` O; `topic`/`audience` O; Documents O/editor-reviewed |
| `health_content` / ความรู้สุขภาพ | `title` string S; `summary` text O; `body` portableText O; `source_text` text O; `featured_image` image O; `reviewed_at`/`next_review_at` datetime O | `topic` O using approved health classifications; `audience` O; native bylines optional attribution |
| `personnel` / บุคลากร | `title` (display name) string S; `prefix`, `first_name`, `last_name` strings O; `profile_image` image O; `current_assignment`, `organizational_unit` strings O; `public_visible` boolean O; `public_contact` text O | Organization O only when activated; no account link, assignment history, Citizen ID/DOB/private address |
| `health_services` / หน่วยบริการสุขภาพ | `title` (official name) string S; `facility_code` string O; `display_name` string O; `operational_status` select O (active/temporarily_closed/inactive); `address` text O; `latitude`/`longitude` number O; `opening_hours`, `public_contact` text O; `affiliation_text` string O; `image` image O | `facility_type` O; `area` O for service coverage; offered Services O; Organization O if activated |
| `services` / บริการ | `title` string S; `summary` text O; `ownership_type` select O; `provider_text` string O; `channels` repeater O; `eligibility`, `steps`, `required_documents_guidance`, `contact_location_guidance` portableText O; `duration`, `fees`, `notes` text O; `external_url` url O | `service_category`, `topic`, `audience` O; relevant Documents and offering facilities O/editor-reviewed |
| `documents` / เอกสาร | `title` string S; `summary` text O; `file` file S; `document_at` datetime O; `fiscal_year` integer O; `owner_source` text O; `domain_status` select O (current/superseded/expired) | `document_type` O; `topic` O; successor Document O |
| `health_reports` / รายงานสุขภาพ | `title` string S; `summary` text O; `reporting_period`, `owner_source` text O; `report_at` datetime O; `fiscal_year` integer O | `report_type`, `topic` O; single `report_document` reference **S**; `area` O |
| `organizations` / องค์กร — conditional | `title` (name) string S; `organization_type` select O with supplied approved values; `responsibilities` text O; `public_contact` text O; `active_visible` boolean O | parent/affiliation and selected owning-record links O only for demonstrated shared-object use |

All ten unconditional kinds are native collections because their meaning/attributes/reuse differ;
Featured/Health News/leadership are views, not new kinds. `organizations` is a defined conditional
variant, not an always-created eleventh collection. Without a confirmed current reuse case, native
owner unit/provider/affiliation fields remain the default. Demonstrated reuse is the existing §23 input,
not a newly invented workflow phase.

Service ownership values preserve current/00 §8.1's four meanings: `direct`, `coordinated`,
`related_health_service`, `external_digital`. Channel is separate: repeater rows with human-readable
`label` string O and `url` native url O. For external digital ownership staff maintain the useful
external URL editorially; it remains optional in native validation. No fabricated service inventory
or transaction engine.
Guidance can explicitly explain that a step/eligibility/document item is not applicable, rather than
inventing a supporting-file requirement. Announcement dates/close state and review dates do not
auto-unpublish content. Reporting period is explanatory text, not an invented analytical dataset.
Applicable opening/closing dates, duration/fees/notes and meaningful report dates remain domain
editorial information, with native supplied-value validation; no automated applicability judgment
is invented where that context is not observable. Relationship optionality does not erase the
owning document's useful domain meaning.

Gallery uses native repeater image subfield plus optional caption; array position is order. Both
featured image and gallery may be absent; there is no alternative-presence publication rule. Media
IDs/alt/caption/dimensions/type/size stay native; current-source replacement/deletion may affect reuse.
Domain dates use native offset-aware datetime; editor UAT must confirm date-only presentation and
timezone expectations without conflating publication time. Coordinates use supplied numeric values
and native range constraints (latitude −90..90, longitude −180..180), not mandatory draft presence.

## Taxonomies, Area and Owner Settings

| Native taxonomy | Attached kinds | Meaning / validation |
| --- | --- | --- |
| `topic` | News, Activity, Announcement, Health Content, Document, Health Report, Service | Shared Topic/health classification; native term selection is editorially maintained, not a custom publish-time gate |
| `audience` | News, Announcement, Health Content, Service | Shared intended audience; selection is optional at native save and publish |
| `news_category` | News | Staff-maintained category; no separate Featured/Health News collection or custom publish gate |
| `announcement_type`, `document_type`, `report_type`, `facility_type`, `service_category` | Their respective kind | Native optional classification, not an entity or a custom publish gate |
| `area` (hierarchical) | News, Activity, Health Service, Health Report | Explicit official/stable code in native term slug, name in label, parent via native group identity; selection is editor-maintained, not a custom publication requirement |

Area terms model applicable Province → District → Subdistrict → Village hierarchy. Native label/
slug/parent validation applies at term maintenance; taxonomy terms do not have draft/publish status.
Use explicit verified code slugs when connecting data, preserve them during label edits and record
source in native description when needed. No code inventory is invented and no immutable slug is
promised. Field metadata/query needs in V1 do not justify an Area collection. Physical facility
address/coordinates remain distinct from service-area selection.

Office contact stays in native office/site settings; collection contact stays with its owner.
No Contact/File/Media collection, analytical metric table or additional state/permission family.

## Native Relationship Accounting

One edge set per relation. Limits are native maxima; minimum requiredness is the bound field's
native required flag. Unless marked S, reference fields are optional at create/save/publication.
Native selection validity/cardinality is not a guarantee of published/available targets or removal
protection. No Songhealth publication-validation hook or relation adapter is planned.

| Relation | Source field / side → target | Cardinality (source; target) | Requiredness / reason |
| --- | --- | --- | --- |
| `report_document` | Health Report `report_document` parent → Document | one maximum; many reports may reuse one Document | **S** required native reference; Report metadata describes a selected Document |
| `announcement_documents` | Announcement `documents` parent → Document | many; many | O, relevant attachments/editorial applicability; same file/record reuse |
| `service_documents` | Service `documents` parent → Document | many; many | O, supporting guidance; no conditional automatic gate |
| `page_documents` | Basic Page `documents` parent → Document | many; many | O, accepted About/general-prose document reuse |
| `facility_services` | Health Service `offered_services` parent → Service; Service `offering_facilities` child → Health Service | many; many | Both O, two selectors over one relationship; same identities in both directions |
| `document_successor` | Document `successor` parent → Document | one maximum; many predecessor records may point to it | O self-relation, explicit side; preserve domain successor context without copying file |
| `personnel_organization` — conditional | Personnel `organization` parent → Organization | one maximum; many | O, only confirmed shared organizational metadata; current assignment text remains native owner data |
| `facility_organization` — conditional | Health Service `organization` parent → Organization | one maximum; many | O, only confirmed shared affiliation metadata |
| `organization_parent` — conditional | Organization `parent` child → Organization's logical parent | one parent maximum per child; a parent may have many children | O self-relation with explicit child-side binding, only for a real parent/affiliation need |

For Report → Document, native relation maxima are one child per Report and unlimited Report parents
per Document. S means the bound field's native top-level `required: true`, with maxima owned by
the relation; it is not a separate publication-only predicate. That flag rejects omitted/empty
selection at initial create and invalid clears
under native save validation. Native publication rechecks requiredness/cardinality. Schedule
acceptance does not add a selection hook; subsequent target mutation can leave absent links and
due-time native publication can refuse them. This remains D-REF's stated limit, not a reference lock.
No further News/Activity/Health Content links are created speculatively; a later actual optional
reuse case must pass the already-existing §23 questions, not a universal relation matrix.

Declare these relations natively, then bind each field to its named relation/side so automatic
field-created relation names do not accidentally create a second edge set. For conditional
Organization hierarchy, the logical parent sits on the native parent end; the selecting child
field uses `relationSide: child`, maximum one parent per child and unlimited children per parent.
Native lifecycle decides when a pending reciprocal edit becomes live; inverse read verification
must use the appropriate saved/published state rather than promise immediate cross-entry draft views.

## Native Lifecycle and Validation Boundaries

| Native operation | Model behavior | Boundary |
| --- | --- | --- |
| Create/save | Native field shape/value/reference constraints; title, Document file and Report Document required; other optional data can be missing | No claim every incomplete draft saves or a selected file's bytes remain available |
| Published content-data save | Native revisions stage content-data and pending reference selections; previous live data remains | Taxonomies/SEO/bylines/shared media are current side data, not an atomic frozen snapshot |
| Publish | Native role/ownership, slug/revision and supported built-in constraints only; no Songhealth content/taxonomy policy | No target availability/immutable bytes guarantee |
| Schedule acceptance | Native role/time/entry checks only; no Songhealth `beforeSchedule` hook | Native action semantics documented |
| Due-time publication | Native scheduler, due/time/revision and built-in publish constraints only | Native errors may remain scheduled/overdue; no Songhealth `beforePublish` policy or retry manager |
| Unpublish/trash/restore/purge | Native permitted lifecycle; content purge administrator-only and trash-first | No published-required-dependent veto; raw media has separate native permissions |
| Optional linked reads | Resolve in published context, omit unavailable links, safe missing file | Native media is public-publishable; no preview/draft leakage, no retention guarantee |

## §23 Mapping Accounting

| Candidate group | Real Product identity? | Native sufficiency | Demonstrated reuse/relationship | Duplication versus maintenance result |
| --- | --- | --- | --- | --- |
| Page, News, Activity, Announcement, Health Content | Five distinct prose/time/guidance meanings with owning fields | Native fields/media/classification/revisions | US1 and current/02 §§3–7 | Five kinds; no generic-page substitutes or presentation duplicates |
| Personnel | Current public person/assignment, separate from account | Native fields/current visibility/image | US3 same-identity/current assignment | One person, no executive/history/account entity |
| Health Service and Service | Real facility versus citizen guidance | Native fields/taxonomies/relations | US4 reciprocal offerings and area/location distinction | Two meanings, one shared relation; no patient/case engine |
| Document and Health Report | File-backed semantic source versus report metadata | Native file + native required Report relation | US2 reuse across Announcement/Service/Report/About | One Document/file source, no generic File/Media duplicate or metrics extraction |
| Organization and three conditional links | Shared organization metadata only after genuine case | Native entity/reference if justified; owner text otherwise | Existing US3/current/02 §9 conditional gate | No default speculative organization graph or separate internal/external kinds |
| Area / Topic / Audience / type-category groups | Hierarchical/code/classification meanings, not independent content lifecycle | Native taxonomies/term label/slug/parent | US1/4 shared classification and official IDs | Reject classification/Area collections for current V1 needs |
| Media/contacts/system metadata/settings | Platform asset, owner value or system state | Native media/settings/owner fields/system metadata | Existing owner/reuse needs | Reject duplicate Media/Contact/author/slug/status/revision entities |
| Six unconditional relation edge sets above | Real supporting/report/successor/reciprocal reuse | Native maxima/requiredness/field bindings | US2/4 and current/02 §§3/12/13/19 | One native source/edge set per need; no custom selection/lock/index subsystem |
| D-ITA/D-REF | Deferred historical/invariant scope | No V1 representation or enforcement selected | Excluded from active acceptance | No ITA/evidence/snapshot/retention/locking helper entities |

All proposed resource/relation variants are accounted for without changing their identities,
cardinalities or conditional activation. Save-time flags replace the former publication-only
predicates; removing that requirement leaves no custom extension to justify under §23.
This is completed author planning
assessment for FR-031/SC-008; independent review and implementation/UAT acceptance remain pending.
No proposed physical schema was applied. Official inventory/Organization confirmation are later
population inputs and do not authorize architecture expansion.

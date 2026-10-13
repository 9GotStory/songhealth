# CMS Content Model — Phase 1 Data Model

**Standing:** proposed planning design for Independent Review; no schema/configuration/DB applied.
Current Product decision: `01a13788-95c6-72f5-8787-f86b4e0c5fd6`.
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

Notation: **P** is a content-data/current-taxonomy presence predicate at manual publish, schedule
acceptance and due-time execution; **S** is native create/save requiredness; **O** is optional.
Non-reference Product fields are non-required at schema save so missing values can draft; malformed
supplied values still face native type/format/select constraints. P checks nonblank strings, meaningful
native body/guidance blocks (blank text-only blocks do not suffice), native media-ID selection,
meaningful gallery/channel rows, finite numbers (including zero), explicit booleans
(including false and native stored 0/1 representations) and native classification assignment.
Optional fields stay optional. No relation
selection is read/reconstructed by the publication plugin. See spec's accepted 12-row matrix.

## Collection Fields

| Collection / Thai content label | Content data fields and native types | Classification / reference selections |
| --- | --- | --- |
| `pages` / ข้อมูลทั่วไป | `title` string P; `summary` text O; `body` portableText P; image/file fields O when useful | related Documents O; no generic-page substitute for structured kinds |
| `news` / ข่าว | `title` string P; `summary` text P; `body` portableText P; `featured_image` image P; `source_text` text O | `news_category` P, `topic` P; `area`/`audience` O |
| `activities` / กิจกรรม | `title` string P; `summary` text P; `activity_at` datetime P; `location_text` string P; `featured_image` image or `gallery` repeater P (one suffices); `participants_text` text P | `topic`/`area` O; no separate participant/place identity required |
| `announcements` / ประกาศ | `title` string P; `details` portableText P; `announcement_at` datetime P; `opens_at`/`closes_at` datetime O | `announcement_type` P; `topic`/`audience` O; Documents O/editor-reviewed |
| `health_content` / ความรู้สุขภาพ | `title` string P; `summary` text P; `body` portableText P; `source_text` text P; `featured_image` image P; `reviewed_at`/`next_review_at` datetime O | `topic` P using approved health classifications; `audience` O; native bylines optional attribution |
| `personnel` / บุคลากร | `prefix`, `first_name`, `last_name`, `title` (display name) strings P; `profile_image` image P; `current_assignment`, `organizational_unit` strings P; `public_visible` boolean P; `public_contact` text O | Organization O only when activated; no account link, assignment history, Citizen ID/DOB/private address |
| `health_services` / หน่วยบริการสุขภาพ | `title` (official name), `facility_code` strings P; `display_name` string O; `operational_status` select P (active/temporarily_closed/inactive); `address` text P; `latitude`/`longitude` number P; `opening_hours`, `public_contact` text P; `affiliation_text` string O; `image` image O | `facility_type` P; `area` P for service coverage; offered Services O; Organization O if activated |
| `services` / บริการ | `title` string P; `summary` text P; `ownership_type` select P; `provider_text` string P; `channels` repeater P; `eligibility`, `steps`, `required_documents_guidance`, `contact_location_guidance` portableText P; `duration`, `fees`, `notes` text O; `external_url` url P for external digital ownership, otherwise O | `service_category`, `topic`, `audience` P; relevant Documents and offering facilities O/editor-reviewed |
| `documents` / เอกสาร | `title` string P; `summary` text O; `file` file P; `document_at` datetime O; `fiscal_year` integer O; `owner_source` text O; `domain_status` select O (current/superseded/expired) | `document_type` P; `topic` O; successor Document O |
| `health_reports` / รายงานสุขภาพ | `title` string P; `summary` text P; `reporting_period`, `owner_source` text P; `report_at` datetime O; `fiscal_year` integer O | `report_type`, `topic` P; single `report_document` reference **S**; `area` O |
| `organizations` / องค์กร — conditional | `title` (name) string P; `organization_type` select P with supplied approved values; `responsibilities` text O; `public_contact` text O; `active_visible` boolean O | parent/affiliation and selected owning-record links O only for demonstrated shared-object use |

All ten unconditional kinds are native collections because their meaning/attributes/reuse differ;
Featured/Health News/leadership are views, not new kinds. `organizations` is a defined conditional
variant, not an always-created eleventh collection. Without a confirmed current reuse case, native
owner unit/provider/affiliation fields remain the default. Confirmation is the existing §23 input,
not a newly invented workflow phase.

Service ownership values preserve current/00 §8.1's four meanings: `direct`, `coordinated`,
`related_health_service`, `external_digital`. Channel is separate: repeater rows with human-readable
`label` string and optional `url` native url. No fabricated service inventory or transaction engine.
Guidance can explicitly explain that a step/eligibility/document item is not applicable, rather than
inventing a supporting-file requirement. Announcement dates/close state and review dates do not
auto-unpublish content. Reporting period is explanatory text, not an invented analytical dataset.
Applicable opening/closing dates, duration/fees/notes and meaningful report dates remain domain
editorial information, with native supplied-value validation; no automated applicability judgment
is invented where that context is not observable. Relationship optionality does not erase the
owning document's useful domain meaning.

Gallery uses native repeater image subfield plus optional caption; array position is order. Media
IDs/alt/caption/dimensions/type/size stay native; current-source replacement/deletion may affect reuse.
Domain dates use native offset-aware datetime; editor UAT must confirm date-only presentation and
timezone expectations without conflating publication time. Coordinates use supplied numeric values
and native range constraints (latitude −90..90, longitude −180..180), not mandatory draft presence.

## Taxonomies, Area and Owner Settings

| Native taxonomy | Attached kinds | Meaning / validation |
| --- | --- | --- |
| `topic` | News, Activity, Announcement, Health Content, Document, Health Report, Service | Shared Topic/health classification; P only on kinds whose matrix requires it. Owners supply appropriate health terms; automatic check is presence, not semantic scoring |
| `audience` | News, Announcement, Health Content, Service | Shared intended audience; P for Service, optional elsewhere |
| `news_category` | News | News category P; no separate Featured/Health News collection |
| `announcement_type`, `document_type`, `report_type`, `facility_type`, `service_category` | Their respective kind | Native classification, not an entity with its own duplicate lifecycle |
| `area` (hierarchical) | News, Activity, Health Service, Health Report | Explicit official/stable code in native term slug, name in label, parent via native group identity; P coverage selection only for facility |

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
protection. No hook reimplements effective selection or native baseline-diff promotion.

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
| Create/save | Native field shape/value/reference constraints; missing allowed non-required data can draft; mandatory Report Document cannot be missing | No claim every incomplete draft saves |
| Published content-data save | Native revisions stage content-data and pending reference selections; previous live data remains | Taxonomies/SEO/bylines/shared media are current side data, not an atomic frozen snapshot |
| Publish | Native role/ownership, slug/revision checks, native reference constraints and finite data/taxonomy policy | No target availability/immutable bytes guarantee |
| Schedule acceptance | Native role/time/entry checks and `beforeSchedule` data/taxonomy policy | No custom effective-reference gate; native action semantics documented |
| Due-time publication | Native due/time/revision checks, native publish reference constraints, `beforePublish` policy | Explicit policy cancellation has native rejection handling; other errors may remain scheduled/overdue; do not add retry manager |
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

All proposed resource/relation variants are accounted for. This is completed author planning
assessment for FR-031/SC-008; independent review and implementation/UAT acceptance remain pending.
No proposed physical schema was applied. Official inventory/Organization confirmation are later
population inputs and do not authorize architecture expansion.

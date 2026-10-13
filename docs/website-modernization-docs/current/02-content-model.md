# Content Model — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 02-content-model
> **Status:** CLEAN REBASELINE v2.4 — native Q1 revision for Plan Independent Review
> **Version:** 2.4
> **Last Updated:** 14 ตุลาคม 2569 (2026-10-14)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`
> **Purpose:** กำหนด semantic resources, fields และ relationships ที่ Songhealth ต้องการ โดยไม่สร้าง model ซ้ำกับ native CMS resources


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers structured ITA historical-evidence
> management and unavailable Q3/Q4 enforcement from V1. Ordinary native content/Document/Media,
> publication, permissions and supported validation remain on EmDash 1.1.0. This revision awaits
> independent review and human acceptance; deferral is not implementation or PASS. No upstream
> change, new subsystem, replacement ITA workflow or production action is authorized.

> **Native Q1 decision:** Product Owner comment `01a13788-95c6-72f5-8787-f86b4e0c5fd6` adopts EmDash 1.1.0
> save-time requiredness for genuinely mandatory native references. Missing such a reference need
> not be saveable as a draft. Other incomplete drafts follow native field validation. Optional/
> conditional relationships are not automatic publication gates where native enforcement lacks
> adequate data. D-ITA/D-REF remain deferred; no custom reference adapter or internal-table access.

---

# 1. Modeling Rules

1. Content type เกิดเมื่อข้อมูลมีความหมาย/lifecycle/fields ของตนเอง
2. Taxonomy ใช้สำหรับ classification ไม่ใช่ทุก noun
3. Relation ใช้เมื่อ reference/reuse มีคุณค่า
4. Presentation flag/section ไม่เป็น content type
5. Native CMS system fields ใช้สำหรับ internal ID, slug, publication state, timestamps, author/revision ตาม platform
6. Native Media Library ใช้สำหรับ raw image/file assets; ไม่สร้าง Media collection ซ้ำ
7. Contact ใช้ owner fields/site settings ก่อน; ไม่สร้าง Contact collection โดย default
8. Analytical metricsไม่อยู่ใน CMS Content Model

---

# 2. Native System Metadata

ทุก CMS-managed collectionสามารถใช้ native system metadata ตาม capability เช่น:

- stable internal content ID
- slug
- draft/published/scheduled state
- author/owner
- created/updated/published timestamps
- revisions/preview

Songhealth ไม่สร้าง fields ชุดเดียวกันซ้ำเป็น custom metadata เว้นแต่ความหมายต่างจริง เช่น Event Date หรือ Document Date.

---

# 3. Basic Page

ใช้เฉพาะ static/semi-static content ที่ไม่มี structured model อื่นเหมาะกว่า.

Fields:

- Title
- Summary optional
- Body
- optional images/files/related Documents ตาม use case

ไม่ใช้แทน News, Activity, Announcement, Health Content, Service, Personnel, Health Service, Health Report หรือ ITA.

---

# 4. News

ข่าวประชาสัมพันธ์/เรื่องราวที่มีช่วงเวลาการเผยแพร่.

Fields:

- Title
- Summary
- Body
- Featured Image
- News Category
- Topic / Health Topic
- Area optional
- Audience optional
- Source optional

Optional relations เกิดเฉพาะ use case เช่น related Document/Health Service.

`Featured` เป็น Homepage presentation relation/configuration ไม่ใช่ News subtype.

---

# 5. Activity

บันทึกกิจกรรม/ประชุม/ลงพื้นที่/เหตุการณ์.

Fields:

- Title
- Summary/Description
- Activity Date/Time
- Location text or known-place reference
- Topic/Area optional
- Featured Image / Gallery
- participants/context text

Internal Personnel relationเพิ่มเมื่อมีประโยชน์ต่อ structured reuse; external participantไม่ต้องสร้าง Personnel ทุกครั้ง.

---

# 6. Announcement

ประกาศทางการหรือข้อมูลที่ผู้ใช้ต้องรับทราบ/ดำเนินการ.

Fields:

- Title
- Summary/Details
- Announcement Type
- Topic/Audience optional
- Announcement Date
- Application/Open/Close datesเมื่อมี
- related Documents

Expiry/Closed เป็น **domain metadata/presentation state** ไม่ใช่เหตุผลสร้าง CMS workflow state ใหม่.

---

# 7. Health Content

ความรู้สุขภาพ evergreen.

Fields:

- Title
- Summary
- Body
- Health Topic
- Audience optional
- Source/Byline
- Featured Image/Media
- Last Reviewed Date optional
- Next Review Date optional

Review date ไม่ auto-unpublish content; ใช้ช่วย editorial maintenance.

---

# 8. Personnel

Public personnel directory; ไม่ใช่ HR system.

Logical data:

- Prefix
- First/Last Name
- Display Name
- Profile Image
- public position/assignment information
- Organizational Unit
- current public assignment/unit/visibility only (accepted Q2); assignment history is outside V1
- public contactเฉพาะที่เหมาะสม
- public visibility/current status

ผู้บริหารเป็น role/assignment view ไม่ใช่ Personnel type ใหม่.

CMS login account ≠ Personnel record.

เก็บเฉพาะข้อมูลที่เหมาะต่อการเผยแพร่; ไม่เก็บ Citizen ID, private address, DOB, HR-sensitive data.

V1 updates the same Personnel identity. No assignment-history dates, retained past assignments or public past-assignment directory; later history needs require a separately confirmed use case.

---

# 9. Organization

ใช้เมื่อองค์กร/หน่วยงานมีข้อมูลและถูกอ้างซ้ำอย่างมีความหมาย.

Logical fields:

- Name
- Organization/Unit Type
- Description/Responsibilities optional
- parent/affiliationเมื่อจำเป็น
- public contact fieldsเมื่อ owner นี้ต้องมี
- active/inactive visibilityเมื่อมี use case

Internal Unit และ External Organizationอาจใช้ model เดียวพร้อม type หาก fieldsใกล้กัน; อย่าแยก collectionเพียงเพราะชื่อ conceptual ต่างกัน.

---

# 10. Area Reference

Area เป็น shared hierarchical reference สำหรับ classification/service area เช่น:

```text
Province → District → Subdistrict → Village
```

ต้องรักษา official/stable codeเมื่อใช้เชื่อมข้อมูลอื่น.

Exact implementationเป็น hierarchical taxonomy หรือ reference collectionตาม metadata/query needs; Content Model ไม่บังคับสร้าง Area table/collection.

---

# 11. Health Service

สถานบริการสุขภาพจริง; ไม่ใช่ HIS.

Fields:

- Official Name
- Display Name optional
- official facility/service code
- Health Service Type
- operational status
- affiliation/Organization optional
- address + map coordinates
- opening hours
- public contact fields
- service area reference(s)
- services offered relation
- image optional

Location ≠ Service Area.

ไม่รวม patient data, EMR, appointment, queue, billing หรือ stock.

---

# 12. Service

ข้อมูลบริการ/guidance ที่ประชาชนเข้าถึงหรือขอรับได้.

Fields:

- Name
- Summary
- Category/Topic/Audience
- Ownership Type
- Provider/Owner
- Channel(s)
- Eligibility guidance
- Steps
- Required Documents guidance
- Duration/Fees/Notesเมื่อมี
- contact/location guidance
- External URLเมื่อเป็น external service
- related Document(s)
- Health Service relation(s)เมื่อบริการมีหลายสถานที่

Service stepsเป็นข้อมูลอธิบาย ไม่ใช่ workflow/case tracking.

ไม่รวม universal transaction, payment, signature, SLA, appointment หรือ queue engine.

---

# 13. Document

Document คือ **semantic public record around a file**, ไม่ใช่ raw file asset.

Fields:

- Title
- Summary optional
- Document Type
- Topic optional
- Document Date optional
- Fiscal Year optional
- Owner/Source optional
- file field → native Media Library asset
- successor/current-version relation optional
- status/context metadataเมื่อ domainต้องการ เช่น superseded/expired

Document reuse ได้ใน About, Service, Health Report และ Announcement. ITA evidence reuse belongs to the deferred structured-ITA scope (§18).

Do not duplicate the same authoritative file merely because it appears in multiple contexts. Native reuse shares the current source; it does not freeze historical bytes or metadata. Native replacement/deletion may affect those consumers; immutable targets and published-reference removal vetoes are deferred (§20).

Document ไม่ใช่ DMS/สารบรรณ/digital-signature workflow.

---

# 14. Native Media Resource

Version 1 **ไม่สร้าง Songhealth Media collection**.

ใช้ CMS Media Library สำหรับ:

- image/file upload
- reusable selection
- alt text
- caption
- dimensions/type/size metadata
- usage tracking
- gallery/image/file fields

Per-use alt/captionสามารถอยู่กับ field/gallery positionตาม native capability.

Credit/rights/source เพิ่มเป็น targeted metadata/plugin เฉพาะเมื่อมี real requirement; ไม่สร้าง full DAM modelล่วงหน้า.

Large videoใช้ external video platformเป็น default.

---

# 15. Contact Data

Version 1 **ไม่สร้าง generic Contact Information collection โดย default**.

Default:

- office contact → site/office settings
- Health Service contact → fields on Health Service
- Service contact/guidance → fields/relation on Service
- Personnel public contact → Personnel fieldsเฉพาะที่เหมาะสม
- Organization contact → Organization fieldsเมื่อจำเป็น

สร้าง shared Contact entityภายหลังเมื่อพบ object เดียวถูก maintain/reuseข้ามหลาย ownersจริง.

---

# 16. Health Report

Health Report = metadata + Document.

Fields:

- Title
- Summary
- Report Type
- Health Topic
- Reporting Period
- Fiscal Year optional
- Area optional
- Owner/Source
- Published/report dateเมื่อมีความหมาย
- Report Document relation

ไม่แตก metrics/tablesจาก PDF เข้า CMS โดย default.

---

# 17. Dashboard Boundary

Dashboard/analytical metrics **ไม่เป็น CMS content model**.

Content Model กำหนดเพียง:

- Health Report ≠ analytical dataset
- CMSไม่เป็น owner ของ KPI/time-series/clinical metrics
- shared Area/Facility identifiersควรใช้ official/stable codesเมื่อเชื่อมกัน

Database/API/process topologyของ Dashboardอยู่นอก Content Model.

---

# 18. ITA — Deferred from V1

Structured Fiscal Year → Section/MOIT → Requirement/Item → ordered Document/media/URL Evidence
is deferred as a whole from the reduced V1 content model. No ITA collections, selectors,
historical correction workflow, dedicated Admin workspace or associated acceptance fixtures are
required in V1. Do not substitute Basic Page or ordinary Document reuse for historical guarantees.

Deferred requirements retain their meaning: year-specific configurable structure/order, reusable
targets, public retention of published years without automatic expiry, no silent changes under
current/shared edits, and authorized traceable deliberate correction identifying prior/replacement
targets. Labels/order and the original Q1 ITA field rules remain future-scope requirements, not
current V1 validation obligations. No automatic evidence carry-forward or compliance engine.

The existing logical attributes remain traceable for that deferred scope, without selecting storage:

| Deferred resource | Preserved meaning / attributes |
| --- | --- |
| Fiscal Year | Fiscal year; optional title/description; display order; native publication lifecycle |
| Section / MOIT | Code, title, optional description, display order; belongs to Fiscal Year |
| Requirement / Item | Code/number, title, description, display order; belongs to Section |
| Evidence item | One Document, native media or external URL target; optional label/order; no required standalone route or minimum evidence count |

The hierarchy may vary by year. Existing Document reuse remains a future possibility, not proof
that current-source media/metadata can satisfy preserved historical targets.

EmDash 1.1.0 replacement can overwrite a shared media key; content revisions do not preserve those
bytes. Published-required-target removal/atomicity cannot be assumed. These guarantees are neither
implemented nor passed. Re-entry needs a separate Product/Architecture decision and supported
capability evidence. Existing legacy/public ITA material is not deleted, migrated or assigned a
replacement delivery policy by this deferral. See Feature 002 spec deferred register D-ITA/D-REF.

---

# 19. Core Relationships

```text
Personnel ── Organization

Health Service ── Organization
Health Service ── Service
Health Service ── Area Reference

Service ── Document
Service ── Health Service

Health Report ── Document

```

News/Activity/etc. add relations only where real discovery/reuse needs them. The ITA hierarchy/evidence relationships are deferred (§18), not V1 relation obligations.

---

# 20. Lifecycle Rule

CMS publishing stateและ domain stateเป็นคนละเรื่อง.

Examples:

- CMS draft/published/scheduled = publication lifecycle
- Announcement closed/expired = business timing
- Health Service temporarily closed/inactive = operational status
- Document superseded/expired = document context

อย่าสร้าง universal lifecycle enumให้ทุก collection.

### V1 validation and native limitation boundary

Current Q1 follows the native-first decision above. A genuinely mandatory native reference
(Health Report → Document) is required on create/save through native field/cardinality validation;
V1 does not promise an incomplete draft missing it. Optional references stay optional. Conditional
relationships such as Announcement/Service attachments, facilities or Organization links remain
editor-maintained context, not automatically enforced publication requirements.

Other missing Product values may remain in drafts where native validation permits. Applicable
content-data publication requirements and classification selections can use supported publication/
scheduling hooks only where the exact release exposes sufficient data: hydrated candidate data and
native taxonomy reads. Save-time requiredness is distinguished from publication checks in Feature
002's accepted field matrix. No reference-selection adapter, native promotion mirror, internal
reference-table access or unsupported conditional publication gate is selected.

Native reference/cardinality/value validation and public-only reads remain. A selected reference or
file is not a guarantee of target availability through concurrent or later target changes. V1 does
not promise Q4's atomic cross-record published-availability gate, required-target unpublish/trash/
permanent-delete/media-removal veto, or cascade prevention beyond native behavior. Those guarantees
are deferred (D-REF). Public reads omit unavailable linked content or show a safe unavailable file
state without exposing drafts; parent publication is not a permanent availability promise.

Staff may inspect available usage information and deliberately repair references before maintenance.
Those precautions and native role/ownership permission are not automated Q3/Q4 enforcement.

---

# 21. Classification Rule

Prefer taxonomyเมื่อ:

- valueเป็น classification
- many content entries share it
- field metadataน้อย

Prefer collection/referenceเมื่อ:

- objectมี fields/identity/relationsของตัวเอง
- ต้อง browse/manageเป็น entity

อย่าสร้าง collectionสำหรับ Topic/Audience/Type หาก taxonomyเพียงพอ.

---

# 22. Explicit Non-Goals

Version 1 ไม่สร้าง:

- Health Metric CMS collection
- Media collection duplicate of CMS Media Library
- generic Contact collection without reuse need
- generic File collection separate from Document + native media
- approval/workflow entities
- audit entities
- search projection entities
- dashboard metrics inside CMS
- snapshot engine for historical master data
- universal status model

---

# 23. Implementation Mapping Gate

ก่อนสร้าง collection/relationใหม่ ต้องตอบ:

1. เป็น Product entity จริงหรือเพียง presentation/classification?
2. Native field/taxonomy/media/settings primitiveทำได้หรือไม่?
3. มี reuse/relationship requirementจริงหรือไม่?
4. ถ้าทำเป็น collection จะลด duplication มากกว่าค่า maintenanceหรือไม่?

Exact collection/field/relation definitionsจะถูกสร้างใน fresh Spec Kit หลัง baseline นี้ได้รับ Human Acceptance.

---

# 24. Content Model Decision

Canonical Songhealth semantic collectionsสำหรับ Version 1 มีแนวโน้มเพียง:

- Basic Page
- News
- Activity
- Announcement
- Health Content
- Personnel
- Organization (เมื่อมี structured reuse)
- Health Service
- Service
- Document
- Health Report
- ITA structural resources and historical evidence: **deferred from V1** (§18)

Area and current-assignment representationเลือก primitive ที่เล็กที่สุดตอน implementation planning. ITA evidence storage is not selected or built in V1; §23 still applies if that deferred scope is separately reopened.

> **Model meaning; reuse platform primitives; do not model infrastructure twice.**

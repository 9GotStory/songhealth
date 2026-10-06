# Content Model — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 02-content-model
> **Status:** CLEAN REBASELINE v2.2 — CURRENT
> **Version:** 2.2
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`
> **Purpose:** กำหนด semantic resources, fields และ relationships ที่ Songhealth ต้องการ โดยไม่สร้าง model ซ้ำกับ native CMS resources

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
- assignment start/endเมื่อ historical accuracyจำเป็น
- public contactเฉพาะที่เหมาะสม
- public visibility/current status

ผู้บริหารเป็น role/assignment view ไม่ใช่ Personnel type ใหม่.

CMS login account ≠ Personnel record.

เก็บเฉพาะข้อมูลที่เหมาะต่อการเผยแพร่; ไม่เก็บ Citizen ID, private address, DOB, HR-sensitive data.

Exact storage ของ Assignment (repeater vs related collection) ให้เลือกวิธีเล็กที่สุดที่รองรับ historical requirementจริง.

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

Document reuse ได้ใน About, Service, Health Report, Announcement และ ITA.

Do not duplicate the same authoritative file merely because it appears in multiple contexts.

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

# 18. ITA

ITA เป็น structured yearly evidence directory.

Logical hierarchy:

```text
Fiscal Year
  → Section / MOIT
    → Requirement / Item
      → ordered Evidence
```

### Fiscal Year
- fiscal year
- title/description optional
- display order
- publication state via native CMS lifecycle

### Section / MOIT
- code
- title
- description optional
- display order
- belongs to Fiscal Year

### Requirement / Item
- code/number
- title
- description
- display order
- belongs to Section

### Evidence
Evidence is **not required to be a standalone routable collection**.

An ordered evidence item points to one of:

- Document
- native Media asset
- External URL

plus optional label/display order.

Implementation may use relation/repeater/structured fields as long as historical evidence and editor usability are preserved.

Rules:

- structure configurable per fiscal year
- historical years remain public as required
- evidence of a past year does not dynamically change when current Personnel/Organization changes
- reuse existing Document when practical
- uploading new evidence from ITA UI may create/select native media or Document depending on semantic type
- no compliance scoring/workflow/legal interpretation engine

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

ITA Fiscal Year ── Section ── Requirement
ITA Requirement ── Document / Media / External URL evidence
```

News/Activity/etc. add relations only where real discovery/reuse needs them.

---

# 20. Lifecycle Rule

CMS publishing stateและ domain stateเป็นคนละเรื่อง.

Examples:

- CMS draft/published/scheduled = publication lifecycle
- Announcement closed/expired = business timing
- Health Service temporarily closed/inactive = operational status
- Document superseded/expired = document context

อย่าสร้าง universal lifecycle enumให้ทุก collection.

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
- ITA structural resourcesที่จำเป็นต่อ hierarchy

Area representation, assignment representation และ ITA evidence storageเลือก primitive ที่เล็กที่สุดตอน implementation planning.

> **Model meaning; reuse platform primitives; do not model infrastructure twice.**

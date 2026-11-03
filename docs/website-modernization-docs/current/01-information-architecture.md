# Information Architecture — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 01-information-architecture
> **Status:** CLEAN REBASELINE v2.4 — V1 scope revision for Independent Review / Human Acceptance
> **Version:** 2.4
> **Last Updated:** 3 พฤศจิกายน 2569 (2026-11-03): Feature 004, ITA in V1
> **Depends On:** `00-website-foundation.md`
> **Purpose:** กำหนดว่า “ข้อมูลอะไรอยู่ที่ไหน ใครเป็นเจ้าของความหมาย และเชื่อมกันอย่างไร” โดยไม่กำหนด framework, database topology หรือ UI implementation


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers unavailable Q3/Q4 enforcement from
> V1. Ordinary native content/Document/Media, publication, permissions and supported validation
> remain on EmDash 1.1.0. This revision awaits independent review and human acceptance; deferral
> is not implementation or PASS. No upstream change, new subsystem or production action is
> authorized. The same decision deferred structured ITA; Feature 004 brought ITA into V1 (below).

> **Feature 004 decision (Product Owner, 2026-11-02; spec #121, `docs/adr/0006`):** ITA is a V1
> information domain (§9): one MOIT entry per indicator per fiscal year, holding its Requirements
> and Evidence as blocks, with no historical-evidence guard.

---

# 1. Core Principles

1. **Citizen First** — จัดข้อมูลตามสิ่งที่ประชาชนต้องการหา ไม่ใช่ผังภายในสำนักงาน
2. **Single Source of Truth** — ข้อมูลหนึ่งเรื่องมีเจ้าของหลักเพียงแห่งเดียว แล้ว reuse ในหลายบริบท
3. **Structured Before Duplicated Pages** — ใช้ structured content/relation เมื่อมีความหมายซ้ำ
4. **Content ≠ Presentation** — Featured, Quick Access, Homepage section และ filtered view ไม่ใช่ content type ใหม่
5. **Public IA ≠ Admin IA** — เมนูประชาชนและเมนูหลังบ้านไม่ต้องเหมือนกัน
6. **Reuse Before Duplication** — Document, Personnel, Organization, Service และ Health Service reuse ข้ามหน้าได้
7. **CMS Content ≠ Analytical Data** — Dashboard/metrics มี analytical ownership แยกจาก editorial CMS
8. **Complexity Must Be Earned** — ไม่สร้าง domain/model/workflow เพิ่มหากข้อมูลเดิมอธิบายได้

---

# 2. Public Information Domains

Songhealth information domains:

1. เกี่ยวกับเรา
2. ข่าวสารและการสื่อสาร
3. บริการประชาชน
4. หน่วยบริการสุขภาพ
5. ข้อมูลสุขภาพ
6. เอกสารเผยแพร่
7. ITA — หลักฐานการประเมิน MOPH ITA ของแต่ละปีงบประมาณ (§9)
8. ติดต่อและช่องทางดิจิทัล

Domains เป็น ownership ของข้อมูล ไม่จำเป็นต้อง map 1:1 กับ CMS collections หรือเมนูทุกกรณี.

---

# 3. เกี่ยวกับเรา

ครอบคลุม:

- ข้อมูลสำนักงาน / หน้าที่ / พื้นที่รับผิดชอบ
- โครงสร้างองค์กร
- ผู้บริหาร
- บุคลากร
- นโยบายและยุทธศาสตร์
- แผนงาน
- ผลการดำเนินงาน

Rules:

- Personnel เป็น structured public directory ไม่ใช่ HR system
- ผู้บริหารเป็น view จาก Personnel + assignment/role ไม่ใช่คนอีกชุด
- Organization/Unit เป็น structured organization dataเมื่อมีประโยชน์ต่อการ reuse
- Policies/Plans/Results reuse Document recordsเมื่อ authoritative source เป็นไฟล์
- ไม่สร้างหน้า duplicate ที่คัดลอกข้อมูล Personnel/Organization เดิม

---

# 4. ข่าวสารและการสื่อสาร

แยกความหมาย:

- **News** — ข่าวประชาสัมพันธ์/เรื่องราวที่มีช่วงเวลาการเผยแพร่
- **Activity** — บันทึกกิจกรรม/ประชุม/ลงพื้นที่/เหตุการณ์ของสำนักงานและเครือข่าย
- **Announcement** — ข้อมูลประกาศที่ผู้ใช้ต้องรับทราบหรือดำเนินการ
- **Health News** — filtered News ตาม Health Topic ไม่ใช่ content type ใหม่
- **Health Content** — ความรู้สุขภาพ evergreen ไม่ใช่ News

Activity ไม่ต้อง duplicate เป็น News เพื่อให้ปรากฏใน News hub/Homepage.

---

# 5. บริการประชาชน

Service Catalog ตอบว่า:

- บริการนี้คืออะไร
- ใครเป็นผู้ให้บริการ/ประสาน
- ใครใช้บริการได้
- ใช้ช่องทางใด
- ต้องเตรียมอะไร
- มีขั้นตอนอย่างไร
- ไปที่ไหน/ติดต่อใคร
- มีแบบฟอร์มหรือเอกสารใด

Ownership type สามารถเป็น:

- Direct Service
- Coordinated Service
- Related Health Service
- External Digital Service

Service channel สามารถเป็น:

- Online
- In-person
- Paper-based
- Telephone
- Hybrid
- External Online Service

Ownership และ Channel เป็นคนละมิติ.

Version 1 เป็น service discovery/guidance ไม่ใช่ universal online transaction platform.

กรณีที่ยืนยันแล้ว:

- การยืนยันสิทธิการรักษาพยาบาลของ อสม. = paper/in-person guidance
- การขอข้อมูล/เอกสารจากสำนักงาน = in-person guidance
- คู่มือ/แบบฟอร์ม = Document ไม่ใช่ Service
- ค้นหาหน่วยบริการ = Health Service Directory ไม่ใช่ Service

---

# 6. หน่วยบริการสุขภาพ

Health Service คือสถานบริการที่มีตัวตนจริง ไม่ใช่ organization menu item และไม่ใช่ HIS.

ข้อมูลหลัก:

- ชื่อ/ประเภท/รหัส
- สังกัด
- ที่ตั้ง
- ช่องทางติดต่อ
- เวลาทำการ
- บริการที่มี
- พื้นที่รับผิดชอบ
- สถานะการให้บริการ

Health Service ↔ Service เป็น relationship กลางเพื่อให้ผู้ใช้เดินได้ทั้งสองทาง:

```text
บริการนี้มีที่ไหน?  ↔  หน่วยบริการนี้มีบริการอะไร?
```

Version 1 ไม่รวม queue, appointment, doctor schedule, patient portal หรือ nearest-provider engine.

---

# 7. ข้อมูลสุขภาพ

แบ่งเป็น:

### 7.1 Health Content
ความรู้สุขภาพแบบ evergreen ที่อ่าน/ค้นได้บนเว็บและมี review metadata ตามความเหมาะสม.

### 7.2 Health Report
Metadata + authoritative report file (โดยทั่วไป PDF/Document). เว็บไซต์ช่วย discovery; ไม่แตกทุก metric จาก PDF เข้า CMS.

### 7.3 Dashboard
Dashboard/analytical metrics เป็น data responsibility แยกจาก CMS content แม้แสดงภายใต้ `/dashboard`.

IA กำหนดเพียง:

- CMS ไม่เป็น source of truth ของ analytical metrics
- Dashboard ไม่กลายเป็น CMS Content Type
- หากต้องเชื่อม Area/Facility ควรใช้ stable official identifiers ที่เข้าใจตรงกัน

Exact database, API, service/process และ deployment topology **ไม่อยู่ใน IA**.

---

# 8. เอกสารเผยแพร่

Document เป็น semantic record สำหรับไฟล์เผยแพร่ที่ต้องมี metadata และ reuse ได้ เช่น:

- แบบฟอร์ม
- คู่มือ/แนวทาง
- แผน
- รายงาน
- ประกาศแนบ

หนึ่ง Document สามารถปรากฏในหลายบริบทโดยไม่ upload ซ้ำ.

Raw media/file asset ไม่เท่ากับ Document record; Document เป็นข้อมูลเชิงความหมายรอบไฟล์.

ITA Evidence ไม่ใช่ Document: เป็นไฟล์จาก Media Library หรือลิงก์ ใน block ของ MOIT (§9).

---

# 9. ITA

ITA (การประเมินคุณธรรมและความโปร่งใส) เป็น information domain ของ V1 (spec #121, `docs/adr/0006`): หลักฐานที่สำนักงานเผยแพร่สำหรับการประเมิน MOPH ITA ของแต่ละปีงบประมาณ. คำศัพท์ตาม `GLOSSARY.md`: ITA, MOIT, Requirement, Evidence, Round.

```text
ITA
└── ปีงบประมาณ (field ของ MOIT ไม่มี record ของตนเอง)
    └── MOIT (หนึ่ง entry ต่อ MOIT ต่อปีงบประมาณ)
        └── Requirement (block) เช่น 1
            ├── Evidence (block): ไฟล์จาก Media Library หรือลิงก์ พร้อม Round หรือ "ไม่ระบุรอบ"
            └── sub-Requirement (block) เช่น 1.1
                └── Evidence (block)
```

- รายการปีงบประมาณและ MOIT ของแต่ละปีสร้างจาก MOIT ที่เผยแพร่แล้ว (`02` §18)
- ปีใหม่เริ่มจาก Duplicate MOIT ของปีก่อน แล้วล้าง Evidence ของปีก่อนก่อนเผยแพร่ (`05` §7)
- ไม่มี Basic Page แทน, historical-evidence guard, scoring หรือ compliance engine; ข้อควรระวังของเจ้าหน้าที่อยู่ใน `05` §7
- ข้อมูล ITA เดิมบน WordPress ย้ายใน Feature 005 (`09`); ก่อนนั้นไม่มีการลบหรือย้ายข้อมูลเดิม

---

# 10. ติดต่อและช่องทางดิจิทัล

`/contact` เป็น owner ของข้อมูลติดต่อสำนักงานที่ประชาชนต้องใช้ เช่น:

- ที่อยู่
- โทรศัพท์
- อีเมล
- เวลาทำการ
- แผนที่
- official digital/social channels

Contact data ต้อง structured แต่ **ไม่จำเป็นต้องเป็น standalone Contact collection**.

Default ownership:

- office-wide contact → site settings/office data
- Health Service contact → Health Service
- Service-specific contact/guidance → Service
- Personnel public contact → Personnel เฉพาะที่เหมาะสม

สร้าง reusable Contact entity เฉพาะเมื่อมี contact object เดียวถูก share/maintain ข้าม owners จริง.

---

# 11. Shared Classification

ใช้ taxonomy/master data เมื่อช่วย discovery/reuseจริง:

- Topic / Health Topic
- Audience
- Category / Type
- Fiscal Year
- Area
- Organization / Source

กฎเลือก representation:

- classification ที่เป็น label/tree และไม่มี metadataซับซ้อน → taxonomy เหมาะกว่า
- entity ที่มี identity/fields/relationships ของตัวเอง → collection/resource
- อย่าสร้าง master data เพียงเพราะคำหนึ่งปรากฏหลายครั้ง

Area ต้องมี official/stable code เมื่อใช้เชื่อมข้อมูลข้าม domain; exact representation (taxonomy/reference collection) เป็น implementation decision.

---

# 12. Core Relationships

```text
Personnel ── Organization
Personnel ── Activity

Health Service ── Organization/Affiliation
Health Service ── Service
Health Service ── Area

Service ── Health Service
Service ── Document

News / Activity / Announcement / Health Content ── Topic/Area/Audience

Health Report ── Document

```

Relationship เกิดเมื่อช่วย reuse/navigation/history จริง ไม่ต้องเชื่อมทุก entity เข้าหากันเพื่อความสมบูรณ์เชิงทฤษฎี. ITA ไม่มี relation: MOIT เก็บ Requirement และ Evidence เป็น blocks ของตนเอง (§9).

---

# 13. Homepage Boundary

Homepage เป็น curated/automated view ของข้อมูลที่มี owner อยู่แล้ว.

Homepage ไม่สร้าง:

- News duplicate
- Service duplicate
- Contact duplicate
- separate Featured content type

`04-homepage.md` กำหนด priority และ sections.

---

# 14. Search Boundary

Search เป็น cross-domain discovery layer ไม่ใช่ owner ของ content.

`08-search.md` กำหนด searchable collections/fields/groups และ Thai-search acceptance.

Search result ต้องไป canonical route ของข้อมูลจริง.

---

# 15. Public IA vs Admin IA

Public navigation ตาม `03-sitemap.md`.

Admin navigation ใช้ collection grouping ของ CMS ตาม `05-admin-cms.md` และไม่ต้อง mirror public menu.

Dashboard analytical systemไม่เป็น CMS editing module.

---

# 16. Accepted Decisions

- Citizen-first public domains
- News / Activity / Announcement / Health Content แยกตามความหมาย
- Service ≠ Document ≠ Health Service discovery
- Personnel/Organization/Health Service เป็น structured reusable dataเมื่อมี use case
- Health Report = web metadata + Document
- Dashboard analytical ownershipแยกจาก CMS content โดยไม่ Freeze topology
- Document เป็น semantic resource; raw media/file assetไม่ใช่ Document record
- Media ใช้ platform media capability ไม่สร้าง public information domain
- Contact structuredแต่ไม่บังคับ standalone collection
- ITA = หนึ่ง MOIT entry ต่อ MOIT ต่อปีงบประมาณ, Evidence เป็น blocks (Feature 004, `docs/adr/0006`); ไม่มี historical-evidence guard
- Homepage/Search reuse canonical resources

---

# 17. Evidence-driven Values Still Open

ค่าที่ปรับได้โดยไม่เปลี่ยน IA:

- final Service inventory
- category/topic/audience terms
- Area values/official codes
- facility/service reference data
- Footer/Quick Links composition

---

# 18. Scope Boundary

IA ไม่กำหนด:

- database topology
- REST/API topology
- framework/runtime
- exact CMS collection implementation
- component/layout details
- permission matrix
- search engine
- deployment

> **Information Architecture owns meaning and discovery, not infrastructure.**

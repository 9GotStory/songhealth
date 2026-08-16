# Public Search / Search & Discovery — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 08-search  
> **Status:** FROZEN — Public Search / Search & Discovery Baseline  
> **Version:** 1.0  
> **Last Updated:** 14 สิงหาคม 2569  
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md` v1.1, `03-sitemap.md` v1.0, `04-homepage.md` v1.0, `05-admin-cms.md` v1.0, `06-roles-permissions.md` v1.0, `07-publishing-workflow.md` v1.0  
> **Purpose:** กำหนดพฤติกรรมของ Public Search / Search & Discovery ให้ประชาชนค้นหาข้อมูลสาธารณะของเว็บไซต์ได้ง่าย ถูกต้อง และสอดคล้องกับ Information Architecture, Content Model, Sitemap และ Publishing Lifecycle โดยยังไม่ผูกกับ search engine, database extension, indexing library หรือ implementation technology ใด

---

# 1. Purpose

เอกสารนี้กำหนด Search behavior สำหรับ Public Website โดยเน้นการช่วยให้ประชาชนค้นหาและไปยัง Canonical Public Information ที่มีอยู่จริงในระบบ.

Search ต้อง:

- สนับสนุนการค้นหาข้อมูลข้ามหลาย Content Domain
- ใช้งานภาษาไทยได้อย่างเหมาะสม
- เคารพ Public Visibility / Lifecycle อย่างเคร่งครัด
- นำผู้ใช้ไปยัง Canonical Destination ของข้อมูล
- ให้ข้อมูลปัจจุบันมีความสำคัญเหนือข้อมูลย้อนหลังโดยไม่ทำลาย historical discoverability
- ไม่สร้าง Search taxonomy หรือ Search content store ซ้ำจาก Content Model
- ไม่กลายเป็น AI/search platform ที่ซับซ้อนเกิน Version 1 requirement

หลักสำคัญ:

> **Search helps people find public information they already have a reason to look for; it is not a replacement for clear navigation and information architecture.**

> **Search should favor useful, current, authoritative information while keeping legitimate historical information discoverable when context requires it.**

---

# 2. Frozen Search Constraints Inherited from Earlier Documents

`08-search.md` ไม่เปลี่ยน baseline ที่ Freeze แล้วใน `01-information-architecture.md` และ `03-sitemap.md`.

Inherited constraints ได้แก่:

- Global Search เป็น Cross-Content Search
- Canonical utility route คือ `/search`
- Search อยู่ใน Utility Navigation
- Search Visibility ต้องไม่เกิน Public Visibility
- Search Result ต้องพาไป Canonical Destination ของข้อมูลจริง
- Public Search สามารถค้นข้อมูลหลายประเภท ไม่จำกัดเฉพาะข่าว/Post
- Search Group เป็น user-facing discovery category และไม่จำเป็นต้องตรง 1:1 กับ Content Type
- Personnel / Organization ใช้เฉพาะข้อมูลที่ Public และไม่สร้าง Detail Route ใหม่เพียงเพื่อ Search
- Dashboard raw analytical rows อยู่นอก Global Search scope
- Query / filter state ที่มีผลต่อ view ควรสามารถ represent ใน URL เพื่อ share / back-forward ได้
- Domain-specific Search / Filter เช่น Documents, Health Services, Health Content, Health Reports และ Services ยังคงมีได้

`08` มีหน้าที่ลงรายละเอียด behavior, searchable units, matching, ranking, filtering, Thai usability, result presentation และ index consistency ภายใต้ constraints เหล่านี้.

---

# 3. Search Is First-Class Discovery, Not a Navigation Substitute

Public Search เป็น First-Class Feature ของเว็บไซต์ แต่ไม่ใช่ fallback สำหรับ Information Architecture ที่ออกแบบไม่ดี.

ไม่ใช้แนวคิด:

```text
หาไม่เจอใน Navigation
→ ให้ผู้ใช้ Search เอง
```

Main Navigation, Citizen Services, Health Service Directory, Documents, ITA และ contextual links ยังคงมีหน้าที่ในการ discovery ของตัวเอง.

Search เหมาะกับผู้ใช้ที่:

- รู้ชื่อหรือคำสำคัญบางส่วน
- ต้องการค้นข้ามหลาย Domain
- มาจาก bookmark / external link ที่เก่าและต้องการ recovery
- ไม่แน่ใจว่าข้อมูลอยู่ภายใต้เมนูใด

---

# 4. Public Search and Admin Search Are Separate Concerns

Public Search มีเป้าหมาย:

> **ค้นหาข้อมูลเพื่อใช้งาน**

Admin Search มีเป้าหมาย:

> **ค้นหา Record เพื่อจัดการ / แก้ไข**

ดังนั้น:

```text
Public Search
≠ Admin Module Search
```

`08` ไม่สร้าง Universal Search Engine ที่บังคับให้ Public Website และ Admin CMS ใช้ ranking, fields, visibility หรือ UX ชุดเดียวกัน.

Admin Module Search ยังคงใช้ baseline จาก `05-admin-cms.md`.

---

# 5. Public Visibility Is the Hard Search Boundary

Public Search แสดงได้เฉพาะ record ที่ current canonical lifecycle อนุญาตให้ Public discover ได้.

โดยหลัก:

```text
Current Public
→ Search Eligible

Eligible Historical Public
→ May Be Search Eligible

Draft
Pending Review
Approved but not Published
Scheduled before publication
Internal
Hidden
Permanently Withdrawn / Gone
→ Not Search Eligible as normal results
```

Search ต้องไม่เปิดเผย existence ของ non-public records.

> **Search Visibility never exceeds Public Visibility.**

---

# 6. Search Failures Must Fail Closed

หาก Search Index / derived search representation ไม่สามารถยืนยัน current public eligibility ของ record ได้:

```text
Eligibility uncertain
→ Do not expose the result
```

Search service/index failure ต้องไม่ทำให้ Draft, Hidden, Internal หรือ withdrawn records หลุดสู่ Public Search.

> **Discovery convenience never overrides publication and privacy boundaries.**

---

# 7. Current Public Is Preferred Over Historical Public

เมื่อคำค้นเดียวกันพบทั้ง current และ historical information:

```text
Current Public
→ Preferred

Historical Public
→ Discoverable where useful
```

Historical result ต้องแสดง lifecycle context ที่ช่วยให้ผู้ใช้ไม่เข้าใจผิด เช่น:

- หมดอายุ
- ปิดแล้ว
- ถูกแทนที่แล้ว
- ข้อมูลย้อนหลัง

Search Ranking ไม่ควรนำ historical record ขึ้นเหนือ current successor โดยไม่มีเหตุผลเชิง relevance ที่ชัดเจน.

Exact ranking rules จะกำหนดในหัวข้อ Ranking ภายหลัง.

---

# 8. Search Eligibility Follows Domain Meaning

ไม่ใช้ universal rule แบบ:

```text
ทุก Table
ทุก Field
ทุก Record
→ Search
```

Search eligibility ต้องอิง public meaning ของแต่ละ Domain.

Frozen Sitemap กำหนด candidate domains ไว้แล้ว เช่น:

- News
- Activity
- Announcement
- Health Content
- Service
- Health Service
- Document
- Health Report
- Basic Page
- ITA Requirement / Evidence context
- Organization / Personnel เฉพาะข้อมูลที่ Public

Media ไม่ควรกลายเป็น standalone Public Search Result เพียงเพราะมีไฟล์อยู่ใน Media Library.

Searchable unit ของแต่ละ Domain จะกำหนดในหัวข้อถัดไป.

---

# 9. Search Results Lead to Canonical Destinations

Search ไม่เป็นเจ้าของ Content และไม่สร้าง Search-only content page.

ตัวอย่าง:

```text
News
→ /news/{public-id}/{slug?}

Health Content
→ /health/content/{public-id}/{slug?}

Health Report
→ /health/reports/{public-id}/{slug?}

Document
→ /documents/{public-id}/{slug?}

Service
→ /services/{public-id}/{slug?}
```

ถ้ามี Canonical Metadata / Detail Page อยู่แล้ว Search Result ไม่ควรพาผู้ใช้ไป raw PDF/file โดย default.

Personnel / Organization ใช้ canonical directory/context route ที่ Frozen Sitemap กำหนด ไม่สร้าง Detail Route ใหม่เพียงเพื่อ Search.

---

# 10. Dashboard Search Boundary

Dashboard เป็น Separate Data Platform ตาม Frozen IA/Content Model.

Public Search อาจค้นเจอ:

```text
Dashboard entry point / public page metadata
```

แต่ไม่ค้น:

```text
raw analytical rows
metric cells
internal dashboard dataset records
```

ใน Version 1.

> **Global Search discovers the Dashboard as a destination, not as an analytical query engine.**

---

# 11. ITA Search Must Preserve Evidence Context

ITA Search ต้องไม่แสดง Evidence เป็น contextless file result หากความหมายของหลักฐานขึ้นกับ Fiscal Year / MOIT / Requirement.

Conceptual result context:

```text
ITA ปีงบประมาณ 2569
MOIT / Requirement ...
Evidence ...
```

Search ต้องช่วยให้ผู้ใช้เข้าใจว่า evidence นั้นอยู่ภายใต้ข้อใดและปีใด.

Exact searchable unit ระหว่าง Fiscal Year / Requirement / Evidence จะกำหนดในหัวข้อถัดไป.

---

# 12. Deterministic Keyword Search Is the Version 1 Baseline

Version 1 เริ่มจาก deterministic keyword-oriented search.

Candidate searchable information ตาม Domain อาจรวม:

- Title / Name
- Summary
- Body / Description
- meaningful structured metadata

ไม่ใช้ AI เป็น publish/discovery authority และไม่ต้องมี semantic answer generation.

Version 1 baseline ไม่ต้องมี:

- Vector Database
- Embeddings
- LLM-generated Search Answers
- Conversational Search
- Personalized Search
- AI Intent Classification

> **Search behavior should be explainable and predictable before it becomes intelligent.**

---

# 13. Thai Search Quality Is a Functional Requirement

เว็บไซต์ใช้ภาษาไทยเป็นหลัก ดังนั้น Search ต้องถือ Thai usability เป็น functional requirement ตั้งแต่ต้น.

Behavior ที่ต้องพิจารณาใน `08` ได้แก่:

- คำภาษาไทย
- partial text ตามที่ implementation รองรับอย่างเหมาะสม
- spacing / punctuation variation
- ชื่อหน่วยงาน
- คำย่อที่ใช้จริง
- ตัวเลข / ปี พ.ศ. / ปีงบประมาณ

`08` ยังไม่ Freeze library, database extension, tokenizer หรือ search engine ใด.

> **Define user-visible Thai search behavior first; choose technology later.**

---

# 14. Controlled Aliases May Be Added Only for Real Usage

Version 1 ไม่ต้องมี synonym/ontology engine ขนาดใหญ่.

แต่สามารถรองรับ small curated aliases เมื่อมี use case จริง เช่น:

```text
สสอ.สอง
สำนักงานสาธารณสุขอำเภอสอง
```

หรือชื่อย่อบริการ/หน่วยงานที่ประชาชนใช้จริง.

Alias capability ต้อง:

- จำกัด
- ดูแลได้ง่าย
- ไม่สร้าง taxonomy ซ้ำ
- ไม่กลายเป็น rule language / ontology management platform

Exact alias governance จะตัดสินในหัวข้อ matching/synonym ภายหลัง.

---

# 15. No-Result State Must Help Users Recover

เมื่อไม่พบผลลัพธ์ Search ต้องอธิบายอย่างชัดเจนและช่วยผู้ใช้ไปต่อ.

ตัวอย่าง guidance:

```text
ไม่พบผลลัพธ์สำหรับ “...”

ลอง:
- ใช้คำที่สั้นลง
- ตรวจการสะกด
- เปลี่ยนประเภทข้อมูล / เลือกทุกประเภท
```

Recovery links อาจพาไป:

- บริการประชาชน
- หน่วยบริการสุขภาพ
- เอกสารเผยแพร่
- ติดต่อเรา

ไม่ต้องสร้าง AI suggestions เพื่อแก้ no-result state ใน Version 1.

---

# 16. Search Results Are User-Facing Discovery Cards, Not Database Rows

ผลลัพธ์ควรช่วยให้ผู้ใช้ตัดสินใจได้ว่าควรเปิดรายการใด.

Conceptual result:

```text
[ประเภท / Search Group]
Title / Name
Summary / useful context
Domain-relevant metadata
```

Metadata แตกต่างตาม Domain ได้ เช่น:

Document:
- Document Type
- Fiscal Year
- Document / Published Date
- Current / Superseded / Expired context

Health Service:
- Type
- Area
- Current status

Health Content:
- Last Reviewed / meaningful update context

Search Result Presenter ไม่ต้องบังคับทุก Domain ใช้ field ชุดเดียวกัน.

---

# 17. Filters Remain Small and Evidence-Driven

Search v1 ไม่สร้าง Advanced Search UI.

Baseline filters ควรเริ่มจากสิ่งที่ช่วยลด result set จริง เช่น:

- Search Group / Content Type grouping
- Date / Fiscal Year เมื่อมีประโยชน์

Area, Topic, Status หรือ filter อื่นต้องมี use case ก่อนเพิ่ม.

> **Search first; filter only when it meaningfully narrows real result sets.**

Exact filter set จะกำหนดหลังจาก Searchable Content / Search Unit Model ชัดเจนแล้ว.

---

# 18. Search Reuses Existing Taxonomy and Master Data

Search ไม่สร้าง taxonomy คู่ขนาน เช่น:

```text
Search Category
Search Topic
Search Tag
```

หากต้องใช้ Topic, Area, Fiscal Year, Organization หรือ structured metadata เป็น filter/matching signal ให้ reuse canonical Content Model / Master Data เดิม.

> **Search consumes structured content; it does not invent a second content model.**

---

# 19. Search Index Is Derived, Never the Source of Truth

ไม่ว่า implementation ในอนาคตจะใช้ SQL search, full-text index หรือ search service ใด:

```text
Canonical Domain / CMS Data
→ Source of Truth

Search Index / Search Representation
→ Derived Discovery State
```

Search Index ห้ามมี lifecycle/public visibility authority ของตัวเองที่ขัดกับ canonical record.

หาก record เปลี่ยนเป็น Hidden, Internal, Permanently Withdrawn หรือ Search-ineligible ระบบต้องไม่ปล่อย stale result ค้างเป็น public discovery path.

Exact index refresh / consistency mechanism ไป `10-system-blueprint.md` หลัง `08` กำหนด behavior requirement แล้ว.

---

# 20. Search Analytics Is Not a Version 1 Requirement

Version 1 ไม่ต้องมี:

- Query Analytics Dashboard
- No-result Trend Dashboard
- Click-through Analytics
- Popular Search Ranking
- Personalized Ranking
- User Search Profiles
- Search Optimization Console

หากอนาคตมี evidence ว่าต้องปรับ Search จาก query behavior จริง จึงค่อยพิจารณา privacy-conscious analytics ผ่าน Impact Review.

---

# 21. Version 1 Search Foundation Exclusions

ไม่รวมโดย default:

- AI semantic search
- Vector search / embeddings
- Conversational search
- LLM-generated answers
- Personalized ranking
- enterprise synonym / ontology system
- advanced query language
- arbitrary search rule builder
- separate Search taxonomy
- raw Dashboard analytical search
- standalone Media asset search for Public Website
- Search Analytics platform
- search-result manual pinning/boosting system without proven need
- independent visibility rules that bypass Publishing Lifecycle

---

# 22. Accepted Search Foundation

**Sections 1–21 = Accepted Search Foundation.**

Accepted baseline:

- Public Search is a first-class discovery feature but never substitutes for clear Information Architecture and navigation.
- Public Search and Admin Search remain separate concerns.
- Only currently eligible Public or explicitly eligible Historical Public records may appear in Public Search; Draft, Pending Review, Approved-but-unpublished, Scheduled-before-publication, Internal, Hidden, and permanently withdrawn records never leak through normal Search results.
- Current Public information is preferred over historical information, while legitimate Historical Public records may remain discoverable with explicit lifecycle context.
- Search eligibility, searchable fields, searchable units, and result presentation follow Domain meaning rather than universal database rules.
- Search results lead to canonical public destinations rather than raw resource files where canonical pages exist.
- Dashboard raw analytical data is outside normal Global Search; meaningful Dashboard entry metadata may participate in discovery.
- ITA Search preserves Fiscal Year / MOIT / Requirement context rather than presenting Evidence as contextless files.
- Version 1 uses deterministic keyword-oriented search with Thai-language usability as a first-class functional requirement.
- Small curated aliases may be introduced only when actual user terminology justifies them; no large synonym/ontology platform is required.
- No-result behavior provides clear recovery guidance without AI suggestions.
- Search results use Domain-relevant metadata rather than database-row presentation.
- Filters remain small and evidence-driven and reuse existing Content Model taxonomy/master data.
- Search Index / search representation is derived and never becomes the Source of Truth or a visibility authority.
- Search failures fail closed with respect to non-public information.
- Version 1 does not require Search Analytics, personalization, vector search, conversational answers, or enterprise search administration.

---

# 23. Next Discussion Topic

Next topic:

> **Searchable Content & Search Unit Model**

รอบถัดไปต้องกำหนดว่าแต่ละ Domain สร้าง Search Result Unit อย่างไร โดยเฉพาะ:

- News / Activity / Announcement
- Health Content / Health Report
- Service / Health Service
- Document
- Basic Page
- Personnel / Organization
- ITA Fiscal Year / Requirement / Evidence
- Dashboard entry metadata
- Media boundary

เป้าหมายคือให้ชัดว่า “หนึ่งผลการค้นหา” คืออะไร ก่อนตัดสิน searchable fields, matching, ranking และ filters.

---

# 24. Search Unit Represents a Meaningful Public Destination

Search Unit คือหน่วยข้อมูลที่ Public Search สามารถแสดงเป็นผลลัพธ์หนึ่งรายการและพาผู้ใช้ไปยัง **meaningful canonical public destination**.

หลักคือ:

> **Search should return meaningful public destinations, not every underlying record or file.**

> **A Search Unit is defined by user intent and canonical public identity, not by database tables.**

ดังนั้นการมี record, attachment, relationship, Media, หรือไฟล์อยู่ในระบบ ไม่ได้แปลว่าสิ่งนั้นต้องกลายเป็น Search Result แยกโดยอัตโนมัติ.

---

# 25. Canonical Public Resource Is the Default Search Unit

สำหรับ Domain ที่มี canonical public identity/detail page อยู่แล้ว โดย default ใช้:

```text
1 Canonical Public Resource
=
1 Search Unit
```

Primary examples:

- News
- Activity
- Announcement
- Health Content
- Health Report
- Basic Page / semantic public page
- Service
- Health Service
- Document เมื่อมี standalone public meaning

Lifecycle change ไม่สร้าง Search Unit ใหม่ แต่เปลี่ยน eligibility/context ของ Search Unit เดิม.

---

# 26. Editorial Content Search Units

## 26.1 News

```text
News
→ News canonical detail
```

Archived News ที่ยังเป็น Historical Public อาจยัง searchable ได้ แต่ต้องแสดง historical context และไม่ถูกนำเสนอเสมือนข่าวปัจจุบัน.

## 26.2 Activity

```text
Activity
→ Activity canonical detail
```

Activity เป็น Search Unit เดียว แม้มี Personnel, Organization, Area, Gallery หรือ Documents เชื่อมอยู่หลายรายการ.

## 26.3 Announcement

```text
Announcement
→ Announcement canonical detail
```

Closed / Expired Announcement ที่ Historical Public eligible อาจยัง searchable แต่ผลลัพธ์ต้องแสดง lifecycle context เช่น `ปิดแล้ว` หรือ `หมดอายุ`.

## 26.4 Health Content

```text
Health Content
→ /health/content/{public-id}/{slug?}
```

Archived Health Content ที่ยัง Historical Public eligible อาจค้นได้ แต่ต้องไม่แข่งขันกับ current health guidance โดยไม่มี historical/outdated context.

---

# 27. Health Report Is the Primary Search Unit, Not Its PDF

Health Report ใช้ canonical report page เป็น Search Unit:

```text
Health Report
→ /health/reports/{public-id}/{slug?}
```

Report Document/PDF เป็น resource ที่ผู้ใช้เข้าถึงจากหน้า Health Report ไม่ใช่ default Global Search destination.

> **Health Report is searched as a Report, not as a raw PDF.**

หาก:

```text
Health Report R
└── Report Document D
```

และ query เดียว match ทั้งสอง:

```text
Global Search
→ prefer Health Report R
→ suppress Document D as a semantic duplicate when D primarily serves R
```

Document Center/module-specific discovery ยังสามารถค้น Document D ได้ตามหน้าที่ของ Document Domain.

---

# 28. Document Search Unit Depends on Standalone Public Meaning

Document เป็น Shared Resource และสามารถเป็น Search Unit ของตนเองเมื่อมี public identity/value ที่สมบูรณ์ เช่น:

- คำสั่ง
- แบบฟอร์ม
- คู่มือ
- แผนงาน
- รายงานทั่วไป
- เอกสารเผยแพร่
- official document ที่ประชาชนมีเหตุผลค้นหาโดยตรง

Canonical destination:

```text
Document
→ /documents/{public-id}/{slug?}
```

ไม่พาไป raw PDF โดย default เมื่อมี canonical Document page.

## 28.1 Standalone Document

ถ้า Document มี standalone public meaning:

```text
Document
→ independent Search Unit
```

แม้จะถูก reuse ใน News, Service, ITA หรือ Health Report ด้วย.

## 28.2 Supporting Attachment

ถ้า Document เป็นเพียง supporting attachment ที่ผู้ใช้ไม่มี intent แยกชัดเจน:

```text
Global Search
→ may suppress the attachment result
→ parent/canonical context remains primary
```

ไม่สร้าง universal staff checkbox เพื่อกำหนด behavior นี้หากสามารถ derive จาก Domain usage/public meaning ได้.

---

# 29. Basic Page and Semantic Route Search Units

Basic Page ที่มี canonical public page สามารถเป็น Search Unit ได้.

แต่หากข้อมูลนั้นมี semantic/system route ที่ Freeze ไว้ เช่น:

```text
/about
/contact
```

Search Result ต้องพาไป semantic canonical route นั้น ไม่ใช่ storage fallback `/pages/...`.

> **Search follows the canonical public destination, not the storage model.**

ไม่สร้าง public result ซ้ำจาก Basic Page backing record + semantic route สำหรับข้อมูลเดียวกัน.

---

# 30. Service and Health Service Search Units

## 30.1 Service

```text
Service
→ /services/{public-id}/{slug?}
```

Service เป็น primary task-oriented Search Unit. Form, Guide หรือ supporting Document ไม่ควรแย่งบริบทของ Service โดยอัตโนมัติ.

Standalone Document/Form ยังอาจเป็น Search Unit ของตัวเองเมื่อผู้ใช้ค้นชื่อเอกสารนั้นโดยตรงและ Document มี independent public identity.

## 30.2 Health Service

```text
Health Service
→ /health-services/{public-id}/{slug?}
```

Temporarily Closed Health Service ยังคงเป็น Current Public information และ searchable เพราะสถานะปิดชั่วคราวมีประโยชน์ต่อประชาชน.

Inactive/Hidden behavior ต้องสอดคล้องกับ Publishing Lifecycle; Hidden ไม่ searchable และ Inactive ไม่เป็น current directory result โดย default.

Health Service ไม่สร้าง duplicate Organization result เพียงเพราะมี Affiliation relationship.

---

# 31. Personnel Search Participation Is Conditional

Personnel จะเป็น standalone Public Search Unit เฉพาะเมื่อมี legitimate public destination ตาม Frozen Sitemap/Public presentation จริง.

สำหรับ **Version 1** Frozen Sitemap กำหนดให้ Personnel Search พาไปยัง directory เดิม ไม่สร้าง individual detail route ใหม่:

```text
Personnel Search Result
→ /about/personnel
→ filtered / anchored directory context when supported
```

หากอนาคตต้องการ individual Personnel detail route ต้องผ่าน Sitemap Impact Review / Controlled Amendment ก่อน ไม่ให้ `08-search.md` สร้าง route ownership ใหม่เอง.

> **Do not invent individual public profile pages solely to make Search easier.**

Search ใช้เฉพาะ public projection ของ Personnel และต้องไม่ค้น/เปิดเผย:

- private phone
- internal email
- HR/private records
- birthday
- home address
- non-public assignments

Inactive Personnel ไม่เป็น standalone general Search result โดย default แต่ชื่อของบุคคลยังอาจค้นพบผ่าน Historical Public News/Activity/relationship context ที่ถูกต้อง.

---

# 32. Organization and Contact Information Boundaries

## 32.1 Organization

Internal/External Organization ไม่เป็น Public Search Unit เพียงเพราะเป็น Master Data.

สำหรับ **Version 1** Organization ที่มี public-search meaning ใช้ canonical directory destination ตาม Frozen Sitemap:

```text
Organization Search Result
→ /about/organization
```

ไม่สร้าง Organization detail route รายหน่วยจาก `08-search.md`; หากอนาคตมี route รายหน่วยจริงต้องผ่าน Sitemap Impact Review / Controlled Amendment ก่อน.

> **Being master data does not automatically make an entity a Public Search Unit.**

## 32.2 Contact Information

Contact Information ไม่เป็น standalone Public Search Unit ใน Version 1.

ตัวอย่างที่ไม่ควรเกิด:

```text
Search Result
→ โทรศัพท์สำนักงาน: 0xx-xxx-xxxx
```

Contact Information ใช้ประกอบหรือช่วย match canonical owner เช่น Office/Contact Page, Organization, Health Service หรือ Service ตาม public projection ที่ถูกต้อง.

---

# 33. Media Is Not a Standalone Public Search Unit

Media เช่น:

- Image
- Logo
- Gallery asset
- Banner
- Screenshot
- ITA image evidence

ไม่เป็น standalone Public Search Result ใน Version 1.

Media ถูกค้นพบผ่าน canonical parent/content/evidence context.

ห้ามให้ filename เช่น `IMG_20260814_001.jpg` กลายเป็น public result เพียงเพราะ asset ถูกเก็บใน Media Library.

---

# 34. ITA Uses Fiscal Year and Requirement as Primary Search Units

ITA ต้องรักษา context ของ:

```text
Fiscal Year
→ MOIT / Section
→ Requirement
→ Evidence
```

## 34.1 Fiscal Year

Fiscal Year landing page เป็น Search Unit ได้:

```text
ITA ปีงบประมาณ 2569
→ /ita/{fiscal-year}
```

เหมาะกับ query ระดับ `ITA`, `ITA 2569`, `คุณธรรมและความโปร่งใส`.

## 34.2 Requirement

Requirement เป็น Search Unit หลักสำหรับ query ที่เฉพาะเจาะจง:

```text
ITA / ปี 2569 / MOIT 7
Requirement ...
→ canonical fiscal-year/section destination + requirement anchor/context
```

ผลลัพธ์ต้องรักษา Fiscal Year และ MOIT/Section context เสมอ.

## 34.3 MOIT / Section

MOIT/Section ใช้เป็น contextual/matching metadata โดย default ไม่จำเป็นต้องสร้าง independent Search Unit ทุก Section.

หากมี canonical section destination ที่มี meaningful standalone public content จริง สามารถเข้าร่วม Search ได้โดยไม่เปลี่ยน baseline นี้.

## 34.4 Evidence

Evidence ไม่เป็น standalone Search Unit โดย default:

- Media Evidence → Requirement context
- External URL Evidence → Requirement context
- Document Evidence → Requirement context เว้นแต่ Document มี independent canonical public identity ของตัวเอง

Historical ITA ยังคง searchable ตาม Publishing Lifecycle และทุก result ต้องแสดง Fiscal Year ชัดเจน.

---

# 35. Homepage, Navigation, Hub Pages, and Dashboard

## 35.1 Homepage

Homepage ไม่เป็น Search Unit ใน Version 1 เพราะการคืนผล `หน้าแรก` โดยทั่วไปไม่ช่วยให้ผู้ใช้ค้นข้อมูลเฉพาะ.

Curated content บน Homepage searchable ผ่าน canonical source records ของตนเอง.

## 35.2 Navigation Items

Menu/navigation item ไม่เป็น Search Unit แยก.

## 35.3 Meaningful Hub / Semantic Pages

Meaningful public Hub เช่น:

```text
/about
/health
/documents
/ita
/contact
```

อาจเป็น Search Unit เมื่อหน้าดังกล่าวมี real public role/content ที่ตอบ user intent.

Generic listing state เช่น `/news?page=3` ไม่เป็น Search Unit.

## 35.4 Dashboard

Dashboard entry point อาจเป็น Search Unit แบบ Conditional หากช่วย discovery จริง.

Raw analytical metrics, table cells, datasets หรือ Dashboard DB rows ไม่เป็น Public Search Units.

---

# 36. Search Unit and Searchable Source Are Separate Concepts

ต้องแยก:

```text
Search Unit
= สิ่งที่แสดงเป็น Search Result

Searchable Source
= ข้อมูลที่ช่วยให้ Search Unit match query
```

ตัวอย่าง:

```text
Service
└── supporting Document
```

เนื้อหาหรือชื่อของ Document อาจช่วยให้ Service match query ได้ในอนาคต โดยไม่ได้บังคับว่า Document ต้องแสดงเป็นผลลัพธ์แยกเสมอ.

Exact searchable-source/indexing strategy จะกำหนดในหัวข้อ Searchable Fields/Matching และ System Blueprint ตามลำดับ.

---

# 37. Parent / Child and Shared Resource Semantics

หลักสำหรับ child/supporting resource:

> **If a child has no meaningful standalone public destination, its searchable meaning contributes to the nearest canonical parent.**

Examples:

- Contact Information → owning public entity/page
- Media → parent content
- ITA External URL/Media Evidence → Requirement
- decorative/presentation asset → parent page

แต่ Shared Document ไม่ถูกถือเป็น child โดยอัตโนมัติ.

ถ้า Document มี standalone identity/public purpose จริง ก็ยังเป็น Search Unit ได้แม้ถูก reuse หลาย context.

---

# 38. Public Search Group Labels Use Citizen Language

Search Result สามารถใช้ human-readable type/group labels เช่น:

- ข่าวประชาสัมพันธ์
- กิจกรรม
- ประกาศ
- ความรู้สุขภาพ
- รายงานสุขภาพ
- บริการประชาชน
- หน่วยบริการสุขภาพ
- เอกสาร
- ITA
- บุคลากร
- ข้อมูลหน่วยงาน
- หน้าเว็บไซต์

ไม่จำเป็นต้องสร้าง tab แยกทุกประเภท; labels ใช้เพื่อ context/filter presentation ตามความจำเป็น.

Technical names ต้องไม่หลุดเป็น Public UX เช่น:

```text
BasicPage
HealthReportEntity
ExternalOrganization
ITARequirement
```

---

# 39. Search Unit Matrix

| Domain | Public Search Unit | Version 1 Default |
|---|---|---|
| News | News detail | Yes |
| Activity | Activity detail | Yes |
| Announcement | Announcement detail | Yes |
| Health Content | Health Content detail | Yes |
| Health Report | Health Report detail | Yes |
| Basic Page | Canonical page / semantic route | Yes |
| Service | Service detail | Yes |
| Health Service | Health Service detail | Yes |
| Document | Document detail | Yes when standalone meaningful |
| Personnel | `/about/personnel` directory / anchored context | Conditional public projection |
| Organization | `/about/organization` directory context | Conditional public projection |
| Contact Information | none | No standalone |
| Media | none | No standalone |
| ITA Fiscal Year | Fiscal Year page | Yes |
| ITA Requirement | contextual/anchored Requirement destination | Yes |
| ITA Evidence | parent Requirement | No standalone by default |
| Homepage | none | No |
| Meaningful Hub Page | semantic route | Conditional |
| Dashboard | Dashboard entry point | Conditional |
| Raw Dashboard Metrics/Data | none | No |

Matrix นี้กำหนด user-facing Search Unit ไม่ใช่ database indexing schema.

---

# 40. Semantic Duplicate Results Are Suppressed in Global Search

> **The same public information should not occupy several adjacent Search results merely because it is represented by multiple CMS resources.**

Examples:

```text
Health Report
+ attached Report Document
→ Health Report is primary in Global Search
```

```text
ITA Requirement
+ Media / External URL Evidence
→ Requirement is primary
```

```text
Service
+ supporting Form/Guide
→ Service is primary unless the supporting Document has clear independent public identity/query intent
```

Exact ranking/de-duplication heuristics จะกำหนดภายหลัง แต่ Search Unit model ต้องไม่สร้าง duplicate noise ตั้งแต่ต้น.

Module-specific discovery เช่น Document Center ยังสามารถแสดง canonical Document โดยตรงตามหน้าที่ของ Module นั้น.

---

# 41. Search Eligibility Is Derived, Not a Universal Manual Checkbox

Version 1 ไม่เพิ่ม field กลาง:

```text
☑ Show in Search
```

ให้ทุก record.

Search eligibility derive จาก:

- Domain
- canonical public identity
- Public Visibility
- Publishing Lifecycle
- Current/Historical public meaning
- Search Unit rules

การมี manual visibility checkbox ทั่วระบบจะสร้าง contradiction และเพิ่มภาระเจ้าหน้าที่โดยไม่มี business meaning.

หากอนาคตมี use case จริงสำหรับ explicit discoverability control ต้องผ่าน Impact Review/Controlled Amendment.

---

# 42. Stable Identity and Lifecycle Semantics

Search Unit identity ใช้ stable canonical identity/Public ID ของ resource ไม่ใช้:

- Title เป็น identity
- Slug เป็น identity
- Filename เป็น identity

Title/Slug เปลี่ยนได้ตาม canonical routing rules โดย Search representation update ตาม resource เดิม.

Historical lifecycle ไม่สร้าง Search entity ใหม่:

```text
Published
→ Archived / Closed / Expired / Superseded
```

ถ้ายัง Historical Public eligible ก็ยังเป็น Search Unit เดิม พร้อม lifecycle context ที่ถูกต้อง.

Hidden / Internal / permanently withdrawn/non-public state ไม่ถูกเปิดเผยผ่าน Global Search.

---

# 43. Accepted Searchable Content & Search Unit Model

**Sections 24–42 = Accepted Searchable Content & Search Unit Model.**

Accepted baseline:

- A Public Search Unit represents a meaningful canonical destination, not an underlying database row, attachment, asset, or file merely because it exists.
- One canonical public resource normally produces one Search result; supporting resources do not automatically become duplicate results.
- News, Activity, Announcement, Health Content, Health Report, Basic Page/semantic pages, Service, Health Service, and meaningful standalone Documents are primary Search Units.
- Health Report Search returns its canonical report page rather than raw PDF; attached Report Documents are normally suppressed as semantic duplicates in Global Search.
- Documents remain independent Search Units when they have genuine standalone public meaning; pure supporting attachments may be discovered through parent context instead.
- Basic Page storage never overrides a Frozen semantic canonical route.
- Service and Health Service remain task/facility Search Units; Temporarily Closed Health Services remain searchable Current Public information.
- Personnel and Organization participate only where a legitimate public destination exists; in Version 1 their Search destinations remain the Frozen Sitemap directories `/about/personnel` and `/about/organization` rather than new per-entity detail routes.
- No Personnel/Organization detail page is invented solely for Search, and non-public Personnel fields never participate in Public Search.
- Inactive Personnel are not standalone general Search results by default while historical public relationships remain discoverable through their canonical content.
- Contact Information and Media are not standalone Public Search Units in Version 1.
- ITA uses Fiscal Year and Requirement as primary Search Units; MOIT/Section carries context/matching metadata and Evidence normally resolves through its Requirement.
- Historical ITA results retain explicit Fiscal Year context.
- Homepage, menu items, raw Dashboard metrics/data, pagination/list-state URLs, and technical/internal records are not Search Units.
- Meaningful public Hub/semantic pages and Dashboard entry metadata may participate conditionally when they answer real discovery intent.
- Search Unit and Searchable Source are separate concepts; supporting data may help a canonical parent match without creating another result.
- Global Search suppresses semantically duplicate results where multiple CMS resources represent the same user-facing information.
- Search eligibility is derived from Domain/public lifecycle/canonical meaning rather than a universal staff-controlled `Show in Search` checkbox.
- Search Unit identity uses stable canonical identity rather than mutable Title, Slug, or Filename.
- Historical lifecycle changes modify eligibility/context of the same Search Unit rather than creating another Search entity.

---

# 44. Searchable Fields, Matching & Thai Query Behavior

Search matching must reflect what citizens naturally know while preserving deterministic, explainable behavior.

> **Searchable fields are selected by public meaning; database presence alone never makes a field Public Searchable.**

> **Thai Search should tolerate harmless differences in spacing, punctuation, abbreviations, and number forms without becoming an AI intent engine.**

---

# 45. Search Field Importance

Each Search Unit distinguishes:

```text
Primary Search Fields
→ fields that identify what the result is

Supporting Search Fields
→ public-safe context that helps discovery

Non-Searchable Fields
→ internal/private/technical information excluded from Public Search
```

General importance baseline:

```text
Title / Name
> Authored Summary
> Meaningful Structured Metadata
> Body / Description
> Public-safe Supporting Relationships
```

Exact ranking weights are deferred to the ranking discussion, but the relative semantic importance is fixed here.

---

# 46. Editorial Content Search Fields

## News

Primary:
- Title
- Summary

Supporting:
- Body
- Topic
- Area
- public Source / Organization

## Activity

Primary:
- Title
- Summary / public Description

Supporting:
- Location
- Area
- Topic
- public Organizations / Personnel relationships

## Announcement

Primary:
- Title
- Summary / public Description

Supporting:
- Body
- Type
- relevant public dates
- public Organization context

Internal notes, Audit metadata, private participants, workflow actors, and non-public relationships never enter Public Search projection.

---

# 47. Health Content and Health Report Search Fields

## Health Content

Primary:
- Title
- Summary

Supporting:
- Body
- Health Topic
- Audience
- curated public aliases where justified

Search remains content discovery, not diagnosis or symptom-assessment logic.

## Health Report

Primary:
- Report Title
- Summary

Supporting:
- Report Type
- Topic
- Area
- Fiscal Year
- Reporting Period
- Owner / Source

Version 1 does not require full-text indexing of every attached PDF.

---

# 48. Document Search Fields

Primary:
- Document Title

Supporting:
- Document Type
- public Summary / Description when available
- Fiscal Year
- Document Date
- Topic
- Owner / Source
- public reference number / code when meaningful

Raw filenames such as `scan001.pdf` or `final-v2.pdf` are not meaningful public relevance signals.

> **Filename is a file-management detail, not Public Search identity.**

---

# 49. PDF Full-Text and OCR Boundary

Version 1 does not require:
- extracting full text from every PDF
- OCR for scanned documents
- a document extraction pipeline
- scanned-PDF semantic indexing

Structured metadata and authored public summaries are the baseline.

If evidence later shows that citizens genuinely need deep full-text document retrieval, this may be introduced through Impact Review rather than pre-building an OCR/search subsystem.

---

# 50. Service and Health Service Search Fields

## Service

Primary:
- Service Name
- Display Name
- Summary

Supporting:
- Service Category
- Audience
- Ownership / Provider
- Delivery Channel
- Eligibility
- Steps
- related public Health Service / Organization
- curated aliases where useful

## Health Service

Primary:
- Official Name
- Display Name

Supporting:
- Service Code
- Health Service Type
- Area
- Address
- Affiliation
- Services Offered
- recognized aliases / abbreviations

Expected examples that should resolve to the same Health Service where context permits:

```text
โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านวังดิน
รพ.สต.บ้านวังดิน
รพสต บ้านวังดิน
06415
```

---

# 51. Personnel and Organization Search Fields

Eligible Public Personnel Search Units use only public-safe projection:

Primary:
- Public Display Name

Supporting:
- Public Position
- Public Organizational Unit

Do not index private phone, private email, birthday, internal identifier, home address, HR data, or private assignments.

Eligible public Organization Search Units use:

Primary:
- Official Name
- Display Name

Supporting:
- Organization Type
- recognized abbreviation
- public Area / relationship context

Master Data existence alone does not create public search eligibility.

---

# 52. Thai Query Normalization

Thai Search must tolerate harmless textual differences that do not change meaning.

Baseline normalization includes:
- trim leading/trailing whitespace
- collapse repeated whitespace
- tolerate common spacing around punctuation
- normalize equivalent Unicode representations
- case-insensitive Latin matching
- controlled normalization for common Thai abbreviations

Examples that should be treated as closely equivalent where applicable:

```text
รพ.สต. บ้านวังดิน
รพ.สต.บ้านวังดิน
รพสต บ้านวังดิน
```

and:

```text
สสอ.สอง
สสอ สอง
สสอ-สอง
```

Normalization must remain controlled; punctuation is not removed blindly where codes or identifiers carry semantic meaning.

---

# 53. Thai and Arabic Numeral Equivalence

Thai and Arabic numeral forms should be treated as equivalent for ordinary numeric matching:

```text
๒๕๖๙
2569
```

This supports public content copied from official documents that may use Thai numerals while users type Arabic numerals.

---

# 54. Buddhist Era and Gregorian Year Matching

Year-aware fields may deterministically recognize equivalent Buddhist Era and Gregorian years.

Example:

```text
2569
↔ 2026
```

This applies only where the system knows a value is a Year / Fiscal Year / Reporting Year.

Do not apply a global `+543` transformation to arbitrary numbers, codes, document numbers, phone numbers, or identifiers.

---

# 55. Identifier and Code Matching

Identifiers favor precision over fuzzy tolerance.

Examples:

```text
06415
MOIT7
```

Exact matches receive strong relevance. Prefix-aware behavior may be used where useful, but aggressive fuzzy matching is prohibited for identifiers.

```text
06415
≠ fuzzy-match 06451
```

> **Identifiers favor precision over fuzzy tolerance.**

---

# 56. Partial, Prefix, and Thai Word Matching

Version 1 should support reasonable matching for natural names and titles, including cases such as:

```text
บ้านวัง
→ บ้านวังดิน

ไข้เลือด
→ ไข้เลือดออก
```

Baseline semantic expectation:

```text
Exact
Phrase
Meaningful Word / Thai segmentation
Prefix
```

Unrestricted arbitrary substring matching across every field is not required.

Thai word segmentation quality is a functional requirement:

> A meaningful Thai term should be capable of matching when it occurs naturally inside Thai text.

The exact tokenizer, segmentation library, database extension, or search engine remains an implementation decision.

---

# 57. Multi-Term and Phrase Matching

For a query such as:

```text
ไข้เลือดออก สะเอียบ
```

results matching more meaningful query terms should generally be preferred over results matching only one term.

A contiguous meaningful phrase such as:

```text
สำนักงานสาธารณสุขอำเภอสอง
```

should generally carry more relevance than the same words scattered across unrelated fields.

Version 1 does not require public advanced-query syntax such as:

```text
"exact phrase"
AND
OR
-title:
```

---

# 58. Aliases and Abbreviations

Aliases are supporting search metadata, not new Content Types or Search Units.

Examples:

```text
สำนักงานสาธารณสุขอำเภอสอง
Aliases:
- สสอ.สอง
- สสอ สอง

โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านวังดิน
Aliases:
- รพ.สต.บ้านวังดิน
- รพสต บ้านวังดิน
```

Aliases do not change canonical identity or canonical display name.

Routine content such as every News item should not receive a mandatory `Search Keywords` field.

Aliases are most appropriate for stable entities or terminology where real public usage differs from official naming, especially:
- Organization
- Health Service
- Service
- stable reference data

A small controlled equivalence set may support common abbreviations such as:

```text
โรงพยาบาลส่งเสริมสุขภาพตำบล ↔ รพ.สต.
สำนักงานสาธารณสุขอำเภอ ↔ สสอ.
```

Version 1 does not introduce a thesaurus, ontology, medical terminology graph, or large synonym-management platform.

---

# 59. Public Relationships as Matching Signals

Public-safe relationships may help a Search Unit match.

Examples:

```text
Activity
→ Area = สะเอียบ
```

or:

```text
News
→ Source = สสอ.สอง
```

A matching relationship does not create a duplicate Search Unit.

Internal-only relationships never participate in Public Search matching.

> **Public Search uses a public-safe search projection, not the full CMS entity graph.**

---

# 60. Supporting Child Content and ITA Matching

Searchable Source remains distinct from Search Unit.

Supporting child content may contribute matching signals to its parent without becoming a standalone result.

For ITA Fiscal Year, matching may use:
- `ITA`
- Fiscal Year
- public label / description

For ITA Requirement, matching may use:

Primary:
- Requirement title / label

Supporting:
- MOIT code
- MOIT title
- Fiscal Year
- Requirement number / code
- public description
- Evidence Document titles where useful

Formatting should tolerate:

```text
MOIT7
MOIT 7
moit 7
```

but code matching remains deterministic; `MOIT7` must not fuzzy-match `MOIT8`.

Evidence titles may help the Requirement match without automatically creating separate Evidence results.

---

# 61. Typo Tolerance Boundary

Aggressive fuzzy search is not a Version 1 baseline requirement.

Implementation may provide lightweight typo tolerance for ordinary names/words if it improves usability without degrading precision.

Rules:
- natural-language names may tolerate small implementation-defined variation
- identifiers/codes remain precise
- Search must not silently rewrite a user's query into a materially different query
- `Did you mean...` functionality is not required in Version 1

Zero-result recovery guidance from the Search Foundation remains sufficient baseline behavior.

---

# 62. No AI Query Rewrite and No Search Keyword Bureaucracy

Version 1 does not use an LLM to rewrite, interpret, expand, classify, or answer public Search queries.

Do not introduce:
- AI query rewriting
- vector/embedding query expansion
- AI synonym generation
- mandatory Search Keywords on routine editorial records
- large manually maintained Thai stop-word dictionaries as a product requirement

Implementation may use ordinary deterministic text-processing techniques where appropriate, but Search behavior must remain explainable and reproducible.

---

# 63. Searchable Text Sanitization and Result Snippet Source

Search indexing uses normalized public text rather than CMS markup.

Do not index as meaningful user-facing terms:
- HTML tags
- CSS
- JavaScript
- editor markup
- hidden metadata
- internal workflow fields
- raw image filenames as primary signals

Result snippets should prefer authored public Summary text when available.

If no authored Summary exists, a short safe excerpt may be derived from public searchable text.

AI-generated summaries are not a Version 1 baseline requirement.

---

# 64. Searchable Field Matrix

| Search Unit | Strong Fields | Supporting Fields |
|---|---|---|
| News | Title, Summary | Body, Topic, Area, Source |
| Activity | Title, Description | Location, Area, Topic, public relations |
| Announcement | Title, Summary | Body, Type, dates, Organization |
| Health Content | Title, Summary | Body, Health Topic, Audience, aliases |
| Health Report | Title, Summary | Type, Topic, Area, Fiscal Year, Period, Source |
| Basic / Semantic Page | Page Title, Summary | Body |
| Service | Name, Display Name, Summary | Category, Audience, steps, aliases, owner |
| Health Service | Official / Display Name | Code, Type, Area, Address, Affiliation, services, aliases |
| Document | Title | Type, Summary, Fiscal Year, date, Topic, Owner, public code |
| Personnel | Public Name | Position, public unit |
| Organization | Official / Display Name | Type, abbreviation, public context |
| ITA Fiscal Year | ITA + Fiscal Year label | public description |
| ITA Requirement | Requirement title | MOIT, Fiscal Year, code, description, Evidence Document titles |
| Dashboard Entry | Public Dashboard Name | short public description |

This matrix defines product semantics, not search-engine configuration or numeric ranking weights.

---

# 65. Accepted Searchable Fields, Matching & Thai Query Behavior

**Sections 44–64 = Accepted Searchable Fields, Matching & Thai Query Behavior.**

Accepted baseline:

- Searchable fields are chosen by public meaning, not database presence.
- Title/Name and authored Summary are generally the strongest matching fields, followed by meaningful structured metadata and longer Body/Description content.
- Public Search uses only public-safe projections and excludes internal notes, Audit metadata, private contacts, and internal-only relationships.
- Version 1 does not require full-text extraction or OCR of every PDF.
- Thai Search tolerates harmless differences in whitespace, common punctuation, Latin capitalization, Unicode representation, and Thai/Arabic numeral forms.
- Year-aware fields may deterministically recognize Buddhist Era / Gregorian equivalents without transforming arbitrary numbers globally.
- Identifiers/codes prioritize exactness and do not use aggressive fuzzy matching.
- Reasonable Thai word/prefix matching is required for names/titles, while unrestricted arbitrary-substring matching is not a baseline requirement.
- Thai word segmentation quality is a functional requirement, while tokenizer/search-engine implementation remains deferred.
- Multi-term and phrase matches may carry stronger relevance; exact scoring remains a later Ranking decision.
- Stable commonly used abbreviations and public alternative names may be curated as aliases, especially for Organization, Health Service, and Service.
- Aliases aid matching but never create separate Search Units or change canonical identity.
- Routine editorial records do not require staff-authored Search Keywords.
- No large synonym/thesaurus/medical ontology/search terminology platform is required in Version 1.
- Public-safe relationships and supporting child resources may provide matching signals without becoming duplicate results.
- ITA matching supports Fiscal Year, MOIT formatting, Requirement titles/codes, and useful Evidence Document titles while keeping Requirement as the contextual Search Unit.
- Typo tolerance remains conservative and implementation-dependent; identifiers remain precise.
- No AI query rewriting, semantic expansion, automatic correction platform, or AI-generated result summaries are required.
- Search indexing uses normalized public text rather than CMS/HTML markup.
- Result snippets prefer authored summaries and may fall back to safe excerpts from public searchable text.

---

# 66. Search Ranking, Result Ordering & De-duplication Rules

Search Ranking มีหน้าที่จัดลำดับ Search Units ที่ผ่าน Eligibility และ Matching แล้ว โดยต้องช่วยให้ผลที่ตอบ query โดยตรงที่สุดอยู่ก่อน โดยไม่บิด Domain meaning หรือซ่อน historical information ที่ผู้ใช้ตั้งใจค้นหา.

Core principles:

> **Ranking should favor the result that most directly answers the user’s query, while preferring current, authoritative, canonical information over indirect or historical matches.**

> **Search should rank by meaning first, not merely by recency or keyword frequency.**

Ranking ใน Version 1 ต้อง deterministic และ explainable พอให้ทีมตรวจสอบได้ โดยไม่ผูก Product Contract กับ score formula, BM25 parameters, ML model หรือ search-engine implementation ใด.

---

# 67. Matching Strength Precedence

Relative importance โดยหลัก:

```text
Exact canonical Title / Name
↓
Exact curated Alias
↓
Strong Phrase Match
↓
Multiple Terms in Strong Fields
↓
Prefix / meaningful Thai-term Match
↓
Structured Metadata Match
↓
Body / Description Match
↓
Supporting Relationship Match
```

นี่เป็น **semantic precedence** ไม่ใช่ numeric score contract.

Exact Title/Name หรือ Exact Alias ต้องมีน้ำหนักสูง เพราะเป็น direct identity signal มากกว่า keyword ที่บังเอิญปรากฏใน Body หรือ related record.

ตัวอย่าง:

```text
Query: รพ.สต.บ้านวังดิน

Health Service exact Name/Alias
>
News mentioning รพ.สต.บ้านวังดิน
>
Document body mentioning the facility
```

Curated Alias เช่น `สสอ.สอง` หรือ `รพ.สต.บ้านวังดิน` ถือเป็น alternative identity signal ไม่ใช่ ordinary keyword.

---

# 68. Direct Canonical Answer Beats Indirect Mention

เมื่อ query ระบุตัว entity/service/resource โดยตรง ผลจาก canonical Search Unit นั้นควรอยู่เหนือ content ที่เพียงกล่าวถึงมัน.

Examples:

```text
Query: รพ.สต.บ้านวังดิน
→ Health Service canonical result first
→ Services directly associated may follow
→ News / Activity mentions later
```

```text
Query: แจ้งเรื่องร้องเรียน
→ matching Service first
→ supporting Form / Guide / News later where relevant
```

```text
Query: ไข้เลือดออก
→ Health Content with strong Title/Name match may outrank a newer News item whose Body only mentions the term
```

ไม่สร้าง fixed universal Content-Type priority เช่น `Health Content always first` หรือ `News always first`; directness depends on the query.

---

# 69. Current Public vs Historical Public Ordering

เมื่อ relevance ใกล้เคียงกัน:

```text
Current Public
>
Historical Public
```

Current status เป็น relevance preference เพื่อช่วยให้ประชาชนเจอข้อมูลที่ยังใช้ได้ก่อน.

อย่างไรก็ตาม Historical Public ที่ match query อย่างชัดเจนกว่ามากยังสามารถอยู่เหนือ Current result ที่ match อ่อนกว่าได้.

ตัวอย่าง:

```text
Query: ชื่อประกาศรับสมัครปี 2568 แบบตรงตัว

Expired Announcement 2568 — exact Title match
>
Current News — weak body mention
```

ดังนั้น lifecycle ไม่ใช่ hard partition ที่บังคับ current ทุก record เหนือ historical ทุกกรณี.

Historical result ต้องยังแสดง lifecycle context เช่น:

- ข้อมูลย้อนหลัง
- ปิดแล้ว
- หมดอายุ
- ถูกแทนที่แล้ว
- ไม่ใช่ข้อมูลปัจจุบัน

ตาม Domain semantics จาก `07-publishing-workflow.md`.

---

# 70. Successor and Superseded Ordering

เมื่อ Document A ถูก Superseded โดย Document B:

```text
General query about the document
→ current successor B preferred
→ historical predecessor A remains discoverable
```

แต่หาก query เจาะ identity ของ predecessor เช่น:

- เลขที่คำสั่งเดิม
- ปีเอกสารเดิม
- exact old Title
- stable public identifier exposed through a legitimate query path

Document A ต้องยังค้นหาได้และอาจ rank สูงกว่า B.

> **Successor preference must not erase exact historical identity.**

Search ไม่ auto-redirect predecessor result และไม่ rewrite historical identity; ยังคงใช้ canonical historical page ตาม Frozen Sitemap/Publishing rules.

---

# 71. Domain-Aware Temporal Relevance

Recency เป็น supporting signal ไม่ใช่ primary ranking rule.

Baseline:

```text
Relevance / Directness
→ Currentness
→ Domain-meaningful temporal signal
→ Deterministic tie-break
```

แต่ละ Domain ใช้เวลาที่มีความหมายต่างกัน เช่น:

| Domain | Meaningful temporal context |
|---|---|
| News | Published Date |
| Activity | Activity Date, with Published Date as supporting metadata |
| Announcement | current/open/expiry/deadline context |
| Health Report | Fiscal Year / Reporting Period |
| Document | Document Date / Fiscal Year where applicable |
| ITA | Fiscal Year |
| Health Content | current review/public state; recency alone is not authority |

ไม่ใช้ `Created At` เป็น universal public relevance signal.

---

# 72. ITA Fiscal-Year Ranking

สำหรับ ITA query ที่ไม่ได้ระบุปี เช่น:

```text
Query: MOIT 7
```

เมื่อ Requirement relevance เท่ากัน Current Fiscal Year สามารถได้ modest preference:

```text
MOIT 7 — ปี 2569
MOIT 7 — ปี 2568
MOIT 7 — ปี 2567
```

แต่ถ้า query หรือ filter ระบุปีชัด:

```text
MOIT 7 2568
```

ปี 2568 ต้องได้รับ priority เหนือ current year.

หลักเดียวกันใช้กับ explicit Fiscal Year filter.

ITA Requirement ยังคงเป็น primary contextual resultเหนือ Evidence attachment เมื่อทั้งสอง represent intent เดียวกัน; standalone Document Evidence อาจแสดงได้เมื่อ query target Document identity โดยตรง.

---

# 73. Health Report and Document De-duplication

เมื่อ:

```text
Health Report R
└── Report Document D
```

และทั้ง R/D match query เดียวกันใน Global Search:

```text
R = primary representative result
D = normally suppressed as semantic duplicate
```

เพราะ user-facing intent คือ “รายงานสุขภาพ” ไม่ใช่สองคำตอบจาก metadata page + underlying PDF resource.

Document D ยังคงมี canonical identity และยังค้นได้ใน Document Center/module-specific discovery หรือ Global Search เมื่อ query เจาะ standalone Document identity จริง.

> **De-duplication is result-set presentation logic, not deletion from the Search Index or destruction of canonical identity.**

---

# 74. Service and Supporting Resource De-duplication

สำหรับ:

```text
Service
├── Form
└── Guide Document
```

general task query ควร prefer Service:

```text
Query: ขอ... / แจ้ง... / ร้องเรียน...
→ Service primary
→ pure supporting resource may be suppressed
```

แต่ query ที่เจาะชื่อ Form/Document แบบชัดเจนสามารถทำให้ standalone Document Search Unit แสดงเองได้ หาก resource นั้นมี independent public identity ตาม Section 28/40.

ไม่มี hard rule ว่า supporting resource “ไม่มีวันแสดง”; suppression ต้อง query-sensitive.

---

# 75. ITA Evidence De-duplication

สำหรับ:

```text
ITA Requirement
└── Evidence
    ├── Document
    ├── Media
    └── External URL
```

เมื่อ query match Requirement และ Evidence ที่ represent requirement เดียวกัน:

- Requirement เป็น primary contextual result
- Media / External URL Evidence ไม่เป็น standalone result
- Document Evidence อาจถูก suppress เมื่อเป็น supporting representation
- standalone Document ที่มี independent identity ยังสามารถแสดงเมื่อ query เจาะเอกสารโดยตรง

ผล ITA ต้องรักษา Fiscal Year / MOIT / Requirement context เสมอ.

---

# 76. Shared Resource Identity Is Never Duplicated per Parent

Document เดียวที่ reuse ในหลาย parent เช่น:

```text
Document D
├── Announcement
├── Service
└── ITA Requirement
```

ยังมี Search identity เดียว.

Global Search ไม่สร้างสาม Document result เพียงเพราะมีสาม relationships.

Parent relationships สามารถเป็น matching/context signals ได้ แต่ไม่ clone Search Unit identity.

---

# 77. Duplicate Suppression Is Query-Sensitive

Suppression ต้องพิจารณาความตั้งใจจาก query โดย deterministic matching signals ที่ตกลงไว้ ไม่ใช่ AI intent inference.

ตัวอย่าง:

```text
Query: ขอรับบริการ X
→ Service primary
→ Form suppressed
```

แต่:

```text
Query: แบบฟอร์มคำขอ X
→ standalone Form/Document may appear directly
```

Similarly:

```text
Query: รายงานไข้เลือดออก 2569
→ Health Report primary
→ attached report PDF suppressed
```

แต่ query exact public Document title/reference number สามารถคืน Document ได้.

---

# 78. No Artificial Content-Type Diversity Quota

Version 1 ไม่กำหนด quota เช่น:

```text
News 2 results
Health Content 2 results
Service 2 results
Document 2 results
```

เพียงเพื่อให้หน้าดูหลากหลาย.

ถ้า query มี Document ที่ relevant ที่สุด 8 รายการ Search สามารถแสดง Document หลายรายการได้.

หากผลซ้ำจาก resource family ครองหน้า ให้แก้ด้วย semantic de-duplication ไม่ใช่ diversity quota.

---

# 79. Filters Narrow Candidates, They Do Not Create a New Ranking Model

เมื่อ user เลือก filter เช่น:

```text
Content Type = Document
```

Search จำกัด candidate set แล้วใช้ relevance semantics เดิมภายในชุดนั้น.

ไม่สร้าง separate ranking algorithm ต่อ filter.

Explicit filters override conflicting default preferences เช่น:

```text
Fiscal Year = 2568
→ no current-year boost for 2569
```

Filter semantics ต้องสะท้อน explicit user intent.

---

# 80. Low-Relevance Results Are Not Added Merely to Fill the Page

หาก query มี meaningful results จริงเพียง 3 รายการ:

```text
→ show 3 relevant results
```

ไม่เติม weak/incidental matches เพื่อให้ครบ page size.

> **Fewer relevant results are better than a full page of noise.**

Implementation สามารถมี minimum relevance threshold ได้ แต่ `08` ไม่ Freeze numeric threshold.

---

# 81. No Popularity, Sponsored, Admin-Boost, or Personalized Ranking

Version 1 ไม่ใช้ ranking signal จาก:

- page views
- clicks
- downloads
- click-through rate
- “popular searches”
- browsing history
- previous searches
- device
- profile
- inferred location

และไม่มี:

- sponsored result
- paid ranking
- per-query `Pin to Search`
- arbitrary Admin Boost

Homepage Featured/Urgent Alert เป็นคนละ concern และไม่ควร override Global Search relevance.

ผู้ใช้ที่ค้น query เดียวกันภายใต้ public state/filter เดียวกันควรได้ deterministic ordering หลักเดียวกัน.

---

# 82. Deterministic Tie-Breaking

เมื่อ relevance ใกล้เคียงหรือเท่ากัน ต้องมี stable ordering เพื่อไม่ให้ refresh แล้วผลสลับแบบ random.

Conceptual tie-break:

```text
1. stronger applicable Current/Public context
2. stronger direct canonical match
3. Domain-meaningful temporal context
4. stable canonical identity
```

Exact database/search-engine sort implementation defer ไป `10-system-blueprint.md`.

Stable identity ใช้เป็น final deterministic tie-break; mutable Title/Slug/Filename ไม่ใช่ identity authority.

---

# 83. Conceptual Ranking Pipeline

Version 1 reasoning hierarchy:

```text
1. Public Eligibility
   ↓
2. Query Matching Strength
   ↓
3. Canonical Directness
   ↓
4. Current vs Historical Context
   ↓
5. Domain-specific Temporal Relevance
   ↓
6. Semantic De-duplication
   ↓
7. Deterministic Tie-break
```

Pipeline นี้กำหนด product behavior ไม่ใช่ implementation stages ที่ระบบต้อง code เป็นเจ็ด service แยก.

ไม่จำเป็นต้องมี ML reranker หรือ multiple ranking infrastructure layers เพื่อทำตาม semantics นี้.

---

# 84. Ranking Examples

## 84.1 Health Service Query

```text
Query: รพ.สต.บ้านวังดิน

1. รพ.สต.บ้านวังดิน
   [หน่วยบริการสุขภาพ]

2. บริการที่เกี่ยวข้องกับหน่วยบริการนั้น

3. ข่าว / กิจกรรมที่กล่าวถึง รพ.สต.บ้านวังดิน

4. เอกสารที่กล่าวถึงชื่อหน่วยบริการใน supporting text
```

## 84.2 ITA Query

```text
Query: MOIT 7

1. MOIT 7 — ITA ปีปัจจุบัน
2. MOIT 7 — ITA ปีก่อน
3. standalone Document exact match เมื่อมี independent public identity
```

หาก query เป็น `MOIT 7 2568`, ปี 2568 ต้องได้ priority.

## 84.3 Health Report Query

```text
Query: รายงานไข้เลือดออก 2569

1. Health Report canonical page
   [รายงานสุขภาพ] [2569]

   attached Report PDF suppressed as semantic duplicate

2. Other strongly matching current Health Content / News / Documents
```

---

# 85. Ranking Implementation Boundary

`08-search.md` ไม่กำหนด:

- numeric field weights
- BM25 parameters
- SQL rank formula
- tokenizer-specific boost values
- relevance threshold number
- engine-specific typo score
- click-based learning
- ML model
- vector reranking
- AI relevance judgement

System Blueprint ต้องเลือก implementation ที่ง่ายที่สุดซึ่งให้ behavior ใกล้เคียงกับ Product Contract นี้อย่าง deterministic และ testable.

หาก implementation limitation ทำให้ต้องเบี่ยงจาก semantics สำคัญ เช่น exact identity ไม่สามารถ outrank weak body mention ได้ ต้องถือเป็น architecture/product issue ไม่ใช่ซ่อนด้วย opaque score tuning.

---

# 86. Accepted Search Ranking, Result Ordering & De-duplication Rules

**Sections 66–85 = Accepted Search Ranking, Result Ordering & De-duplication Rules.**

Accepted baseline:

- Ranking prioritizes directness and matching strength before generic recency.
- Exact canonical Title/Name and curated Alias matches are stronger than phrase, prefix, metadata, Body, or supporting-relationship matches.
- Direct canonical answers outrank indirect mentions; no fixed global Content-Type ranking is imposed.
- Current Public receives preference over comparable Historical Public results, but a substantially stronger historical exact match may outrank a weak current match.
- Lifecycle context influences relevance without making legitimate historical information undiscoverable.
- Current successors are preferred for general queries, while explicit/exact historical identity can retrieve superseded predecessors.
- Recency is secondary and uses Domain-meaningful temporal context rather than one universal Created/Published Date.
- ITA Current Fiscal Year receives only a modest default preference; explicit query/filter year always overrides it.
- Health Report is primary over its attached Report Document in Global Search when both represent the same user intent.
- Service is primary over pure supporting Form/Guide for task-oriented queries, while standalone supporting Documents may appear when directly targeted.
- ITA Requirement is primary over context-only Evidence; standalone Document Evidence remains independently searchable when its own identity is targeted.
- Shared resources retain one stable Search identity regardless of the number of parents that reuse them.
- Semantic de-duplication is query-sensitive result-set presentation logic, not deletion of underlying Search identities.
- Version 1 has no artificial content-type diversity quota.
- Filters narrow candidates and retain the same relevance semantics; explicit filter/query context overrides conflicting default boosts.
- Search does not add weak unrelated results merely to fill a page.
- Version 1 excludes popularity/click ranking, sponsored/promoted results, arbitrary Admin search boosts, and behavioral personalization.
- Tie-breaking is deterministic and ultimately falls back to stable identity rather than random ordering.
- Ranking remains explainable/testable and does not require AI/ML relevance ranking.
- Exact score formulas and engine-specific parameters remain deferred to `10-system-blueprint.md`.

---

---

# 87. Search Results UX, Filters & Query-State Behavior

Search Results UX ต้องทำให้โครงสร้าง Search ที่ซับซ้อนภายในระบบดูเรียบง่ายสำหรับประชาชน.

Core principles:

> **Search should feel simple even when the underlying content model is structured.**

> **The search page should preserve user intent, make result differences understandable, and expose only the filters that genuinely help people narrow results.**

`/search` เป็น Global Public Search surface หลักเพียงจุดเดียว ส่วน module-specific search เช่น Documents หรือ Health Services ยังคงอยู่ใน module ของตัวเองเมื่อมี use case จริง.

---

# 88. Search Input and Submission

หน้า `/search` ต้องมี Search Input ที่เห็นได้ชัดและใช้ interaction เดียวกันบน Desktop/Mobile.

Baseline:

```text
[ ค้นหาข้อมูลในเว็บไซต์... ] [ค้นหา]
```

Rules:

- query เดิมต้องคงอยู่ในช่องหลัง Search
- Enter และปุ่ม `ค้นหา` ให้ผลเหมือนกัน
- Version 1 ไม่บังคับ search-as-you-type
- ไม่ส่ง request ทุก keystroke โดย default
- Search เป็น explicit submit action

การปรับ query จาก `ไข้เลือดออก` เป็น `ไข้เลือดออก สะเอียบ` ต้องทำได้ตรง ๆ โดยไม่ต้องเริ่มใหม่.

---

# 89. Shareable URL Query State

Query, active filters, and pagination เป็น view state ที่ควร recover/share ได้ผ่าน URL.

Conceptual examples:

```text
/search?q=ไข้เลือดออก
/search?q=ไข้เลือดออก&type=health
/search?q=moit+7&fy=2568
/search?q=อสม&page=2
```

Product semantics:

- Refresh ต้องไม่ทำ query/filter/page หาย
- Back/Forward ต้องกลับ state เดิมได้
- URL สามารถ Bookmark/Share ได้
- query/filter/page ไม่ควรเก็บเป็น client-only ephemeral state
- exact parameter naming defer ไป Sitemap/Blueprint/implementation review หากจำเป็น

---

# 90. Search Summary

Search results ต้องบอกอย่างน้อยว่ากำลังค้นหาอะไรและมีผลหรือไม่.

Preferred form:

```text
ผลการค้นหาสำหรับ “ไข้เลือดออก”
พบ 12 รายการ
```

Exact total count ไม่ใช่ hard requirement หาก implementation มีต้นทุนไม่เหมาะสม แต่ UI ต้องมี clear result-state feedback.

Public UI ไม่แสดง relevance score, BM25 score หรือ internal ranking metrics.

---

# 91. Result Card Structure

Search result ใช้ shared structural pattern แต่แสดง metadata ตาม Domain.

```text
[ประเภทข้อมูล] [สถานะเมื่อมีความหมาย]

ชื่อเรื่อง / ชื่อรายการ

คำอธิบายสั้น / excerpt

Domain-relevant metadata
```

Title/Name เป็น primary canonical link.

หลีกเลี่ยง duplicate action links เช่น `อ่านเพิ่มเติม / ดูรายละเอียด / เปิด` เมื่อ Title link เพียงจุดเดียวเพียงพอ.

Human-readable type labels ตัวอย่าง:

- ข่าวประชาสัมพันธ์
- กิจกรรม
- ประกาศ
- ความรู้สุขภาพ
- รายงานสุขภาพ
- บริการประชาชน
- หน่วยบริการสุขภาพ
- เอกสาร
- ITA
- บุคลากร
- หน่วยงาน
- หน้าเว็บไซต์

ห้าม expose technical entity names เช่น `HealthReportEntity` หรือ `ITARequirement` ต่อประชาชน.

---

# 92. Historical Result Context

Historical Public result ยังอยู่ใน relevance order ได้ แต่ต้องมองออกทันทีว่าไม่ใช่ current information.

Examples:

```text
[หมดอายุ]
[ถูกแทนที่แล้ว]
[ข้อมูลย้อนหลัง]
[ไม่ใช้งาน]
```

Status/lifecycle context ต้องเป็นข้อความจริง ไม่พึ่งสีอย่างเดียว.

Version 1 ไม่แยก `Current Results` และ `Historical Results` เป็นสอง section โดยบังคับ เพราะ Ranking Model อนุญาตให้ strong historical exact match อยู่ในตำแหน่งที่เหมาะสมได้.

---

# 93. Filters and Public Search Groups

Version 1 ใช้ filter ให้น้อยและมีเหตุผล.

Primary global filter:

```text
ประเภทข้อมูล / Search Group
```

Public Search Group สามารถรวมหลาย technical Content Types เพื่อให้ UX เข้าใจง่าย เช่น:

```text
ข่าวสาร
├── News
├── Activity
└── Announcement

ข้อมูลสุขภาพ
├── Health Content
└── Health Report
```

Frozen Sitemap baseline สำหรับ user-facing groups คือ:

- ทุกประเภท
- ข่าวสาร
- บริการประชาชน
- ข้อมูลสุขภาพ
- หน่วยบริการ
- เอกสาร
- ITA
- เกี่ยวกับเรา

กลุ่มเหล่านี้เป็น citizen-facing discovery groups และไม่จำเป็นต้องตรง 1:1 กับ Content Type. `เกี่ยวกับเรา` สามารถครอบคลุม public-safe Personnel / Organization / relevant semantic pages ตาม canonical destination ที่ Frozen ไว้ ส่วน `ทุกประเภท` คือ default unfiltered state ไม่ใช่ Content Type ใหม่.

Result card ยังแสดง precise human-readable type ของแต่ละรายการได้.

Fiscal Year/Year filter ใช้เฉพาะเมื่อมี Domain meaning จริง เช่น ITA, Document, Health Report.

Version 1 ไม่มี global advanced filter panel ที่ยัด Topic, Area, Organization, Author, Status, Channel, Audience, custom date range ฯลฯ ทั้งหมดลงในหน้า Search โดยไม่มี evidence.

---

# 94. Filter-State Behavior

เมื่อมี query แล้ว การเลือก filter เป็น explicit user intent และสามารถ apply ได้ทันทีโดยไม่ต้องกด Search ซ้ำ.

Active filters ต้องมองเห็นและ clear ได้ เช่น:

```text
ตัวกรอง:
[ข้อมูลสุขภาพ ×]
[ปี 2569 ×]

[ล้างตัวกรอง]
```

Rules:

- `ล้างตัวกรอง` ไม่ลบ query
- เมื่อ user refine query อยู่ในหน้า Search ให้รักษา filter ที่ user เลือกไว้โดย default
- query/filter เปลี่ยน → page กลับเป็น 1
- explicit Fiscal Year filter override current-year preference จาก ranking
- filters narrow candidate set แต่ไม่สร้าง ranking model ใหม่

---

# 95. Pagination

Global Search Version 1 ใช้ predictable pagination ไม่ใช้ infinite scroll.

Concept:

```text
ก่อนหน้า
1 2 3 ...
ถัดไป
```

Page state อยู่ใน URL.

System ใช้ sensible page size เช่นประมาณ 10–20 results ต่อหน้า แต่ exact number เป็น Design/Implementation decision.

ไม่ต้องให้ประชาชนเลือก 10/25/50/100 results per page ใน Version 1.

---

# 96. Zero-Result Recovery

Zero Results ต้องช่วย user ไปต่อโดยไม่สร้าง content noise.

Example:

```text
ไม่พบผลการค้นหาสำหรับ “...”
```

Recovery guidance อาจประกอบด้วย:

- ลองใช้คำที่สั้นลง
- ตรวจการสะกด
- ล้างตัวกรอง
- ลองชื่อย่อหรือชื่อเต็ม
- ไปยังบริการประชาชน / ค้นหาหน่วยบริการ / ติดต่อเรา เมื่อเกี่ยวข้อง

ถ้า filter เป็นสาเหตุ:

```text
ไม่พบผลลัพธ์ภายใต้ตัวกรองปัจจุบัน
[ล้างตัวกรอง]
```

ไม่เติม News ล่าสุด, popular content หรือ random recommendations เพียงเพื่อให้หน้าไม่ว่าง.

---

# 97. Loading and Search Error Behavior

Loading, Zero Result และ Search Error เป็นคนละ state.

Loading example:

```text
กำลังค้นหา...
```

Search Error example:

```text
ไม่สามารถค้นหาได้ในขณะนี้
กรุณาลองใหม่อีกครั้ง
```

Rules:

- Error ต้องไม่ masquerade เป็น Zero Result
- query ต้องไม่หายเมื่อเกิด error
- public error message ไม่ expose database/index/query syntax/internal IDs/stack trace
- Search failure ต้อง fail safely และไม่เปิดเผย non-public content
- full-page blocking spinner ไม่จำเป็นถ้า local accessible status เพียงพอ

---

# 98. Empty Search and Query Validation

เมื่อเข้า `/search` โดยไม่มี query:

- แสดง Search box
- แสดง brief search guidance
- อาจมี links ไป major discovery destinations
- ไม่แสดง all-content listing ทั้งเว็บไซต์
- ไม่เปลี่ยน Search page ให้เป็น Sitemap หรือ News feed

กด Search ด้วย query ว่าง → แจ้งเบา ๆ ว่า `กรุณากรอกคำค้นหา` และไม่ต้อง request backend.

ไม่ Freeze arbitrary minimum query length เช่น 3 ตัวอักษร เพราะ query ที่ถูกต้องอาจสั้น เช่น `DM`, `HT`, `ITA`, `NCD`.

---

# 99. Responsive Search UX

Desktop และ Mobile ใช้ Search semantics ชุดเดียวกัน:

- query เดียวกัน
- URL state เดียวกัน
- ranking เดียวกัน
- filters เดียวกัน
- pagination semantics เดียวกัน

แตกต่างเฉพาะ responsive presentation.

Mobile filters สามารถยุบเป็น control เช่น:

```text
[ตัวกรอง (2)]
```

แล้วเปิด accessible sheet/dialog/drawer ได้ แต่ห้ามสร้าง mobile-specific Search workflow หรือ content model อีกชุด.

---

# 100. Search Accessibility

Baseline:

- Search input มี real accessible label; placeholder ไม่แทน label
- search result update แจ้งสถานะอย่างเหมาะสมต่อ assistive technology
- ไม่ force focus jump โดยไม่จำเป็น
- result list ใช้ semantic structure
- result title ใช้ meaningful link
- status ไม่พึ่งสีอย่างเดียว
- filter controls keyboard-usable
- Mobile/desktop preserve semantic equivalence
- loading/error/zero-result statesมี accessible text

หลีกเลี่ยง custom controls ที่สวยแต่ลด keyboard/screen-reader usability เมื่อ native/standard semantics เพียงพอ.

---

# 101. Public Result Metadata and Query Privacy

Result metadata แสดงเท่าที่ช่วยตัดสินใจ เช่น:

Health Service:

```text
ประเภท · พื้นที่ · สถานะ
```

Document:

```text
ประเภทเอกสาร · ปีงบประมาณ · วันที่
```

ITA:

```text
ปีงบประมาณ · MOIT
```

ไม่แสดง Public Search metadata เช่น:

- Published By
- Updated By
- Approval state
- Audit metadata
- internal status ID
- private/internal contacts

เพราะ query อยู่ใน URL/browser history และอาจปรากฏใน technical logs ตาม infrastructure, Search UX ต้องไม่ชวน user กรอกเลขบัตรประชาชน ข้อมูลผู้ป่วย ข้อมูลสุขภาพส่วนบุคคล หรือ confidential case details.

Global Search ไม่ใช่ patient/complaint/application/private-record search.

---

# 102. Search Suggestions and Search-History Boundary

Version 1 ไม่ต้องมี:

- live autocomplete
- trending queries
- popular search suggestions
- personalized suggestions
- custom Search History
- recent-query account profile

Browser-native form/history behavior ไม่จำเป็นต้องถูกแทนด้วย custom subsystem.

หากภายหลังพบ use case autocomplete จริง ต้องทำ Impact Review โดยยังต้องรักษา visibility/privacy/search semantics เดิม.

---

# 103. Common Public Search Flow

```text
/search
   ↓
Enter Query
   ↓
Submit
   ↓
URL State Updated
   ↓
Eligibility + Matching + Ranking + De-duplication
   ↓
Results
   ├── Refine Query
   ├── Apply Filters
   ├── Open Canonical Result
   └── Paginate
```

จาก canonical result:

```text
Back
→ Search query/filter/page preserved through URL
```

นี่เป็น core usability requirement ไม่ใช่ optional polish.

---

# 104. Accepted Search Results UX, Filters & Query-State Behavior

**Sections 87–103 = Accepted Search Results UX, Filters & Query-State Behavior.**

Accepted baseline:

- `/search` is the single Global Public Search surface; module-specific search remains in relevant modules.
- Search keeps the current query visible and uses explicit Submit rather than mandatory search-as-you-type.
- Query, active filters, and pagination are shareable/recoverable URL state.
- Result cards use a consistent structure, human-readable type labels, Domain-relevant metadata, and canonical Title/Name links.
- Historical Public results remain relevance-ranked with explicit lifecycle context rather than being forcibly separated.
- Version 1 filters remain small; the Frozen Sitemap Search Group baseline is `ทุกประเภท / ข่าวสาร / บริการประชาชน / ข้อมูลสุขภาพ / หน่วยบริการ / เอกสาร / ITA / เกี่ยวกับเรา`, while Fiscal Year appears only where Domain semantics justify it.
- Public Search Groups simplify several structured Content Types without hiding the precise type of each result.
- Active filters are visible/clearable; clearing filters preserves query; user-selected filters generally remain while query is refined.
- Query/filter changes reset pagination to page 1.
- Version 1 uses URL-backed pagination, not infinite scroll, with a system-controlled page size.
- Zero-result state distinguishes no matches from over-restrictive filters and provides concise recovery guidance without unrelated recommendations.
- Search Error is distinct from valid Zero Results, preserves query, exposes no internal detail, and fails safely.
- Empty `/search` is not an all-content listing or replacement Sitemap.
- No arbitrary minimum query length may block legitimate acronyms such as ITA/NCD.
- Desktop and Mobile share the same Search model/state; only presentation responds to viewport.
- Search input, results, status updates, filters, loading/error states, and lifecycle labels follow accessibility-first semantics.
- Public Search exposes only useful public-facing metadata and never Approval/Audit/private workflow information.
- Global Search is for public information, never private patient/case/application records.
- Autocomplete, trending queries, personalized suggestions, and custom Search History are not Version 1 baseline requirements.

---

# 105. Canonical State Is the Search Source of Truth

Public Search ต้องยึด canonical CMS / Domain state เป็นความจริงเสมอ:

```text
Canonical CMS / Domain Data
        ↓
Public Eligibility
        ↓
Search Projection / Index
```

Search Index เป็นเพียง **Derived Discovery Representation** และไม่ใช่ผู้ตัดสินว่า record เป็น Published, Hidden, Historical Public, Withdrawn หรือ Public-eligible หรือไม่.

หลักสำคัญ:

> **Canonical lifecycle and visibility always win over stale Search data.**

---

# 106. Publication Success and Search Synchronization Are Separate Concerns

เมื่อ canonical Publish/Save Changes สำเร็จ การเผยแพร่ถือว่าสำเร็จตาม Publishing Workflow แม้ Search synchronization จะยังไม่เสร็จ.

ตัวอย่าง:

```text
Publish News
✓ Canonical publication committed
✕ Search projection update failed
```

ผลที่ถูกต้องคือ:

```text
News remains Published
Search synchronization becomes pending/recoverable
```

Search subsystem จึงไม่ควรกลายเป็น hidden prerequisite ที่ทำให้การ Publish ต้อง rollback โดย default.

---

# 107. Eventually Fresh, Never Eventually Secure

Version 1 ยอมรับ eventual consistency ระยะสั้นในด้าน **discovery freshness** ได้ เช่น Title/Summary ใหม่อาจใช้เวลาสั้น ๆ ก่อนปรากฏใน Search.

แต่ visibility/privacy ไม่ยอมให้ eventual exposure:

> **Search may be eventually consistent for discovery freshness, but it must never be eventually secure.**

กล่าวคือ stale Search data อาจทำให้ข้อมูลใหม่ค้นเจอช้าชั่วคราว แต่ห้ามทำให้ข้อมูลที่ไม่ Public แล้วคงถูกเปิดเผยต่อ.

---

# 108. Final Public Eligibility Gate

ก่อนแสดง Search candidate ต่อ Public ต้องยังผ่าน **current canonical Public eligibility** เสมอ.

ดังนั้นแม้ Search index ยังมีข้อมูลเก่า:

```text
Index says: Public
Canonical says: Hidden
→ Suppress
```

หรือ:

```text
Index says: Exists
Canonical says: Missing
→ Suppress
```

Product Contract นี้ไม่บังคับ implementation ว่าต้องใช้ SQL join, cache, API lookup, projection version หรือกลไกใด แต่ผลลัพธ์สุดท้ายต้อง fail closed.

---

# 109. Non-Public Pre-Publication States

Public Search ไม่แสดง:

```text
Draft
Pending Review
Approved but not Published
Scheduled before successful execution
```

Approval ไม่เท่ากับ Publication และ Scheduled ไม่เท่ากับ Public.

หาก Scheduled execution ล้มเหลวและ canonical state ยังคง Scheduled พร้อม failure condition:

```text
→ Not Public Searchable
```

Search eligibility เริ่มได้หลัง publication transition สำเร็จจริงเท่านั้น.

---

# 110. Newly Published and Updated Public Content

เมื่อ canonical state เปลี่ยนเป็น Published สำเร็จ Search synchronization ควรเริ่มอย่างรวดเร็ว แต่ `08` ไม่ Freeze SLA เป็นจำนวนวินาที/นาที.

Baseline คือ:

> **Newly Public content should become discoverable within a reasonably short operational delay.**

สำหรับ Save Changes บน Published content:

```text
Published Title A
→ Save Changes
→ Published Title B
```

canonical public page ต้องแสดงข้อมูลล่าสุดทันทีตาม Publishing Workflow ส่วน Search snippet/matching อาจ lag ระยะสั้นโดยไม่เปลี่ยน canonical truth.

---

# 111. Visibility-Critical Removal

การเปลี่ยนแปลงต่อไปนี้เป็น visibility-critical:

```text
Public → Hidden
Public → Internal
Permanent Withdrawal
Hard Delete / canonical record removal
```

จากมุมผู้ใช้ Public Search ต้องหยุดเปิดเผยทันที แม้ physical index cleanup จะทำภายหลัง.

Search ต้องไม่เปิดเผยแม้เพียง:
- Title
- snippet
- URL
- type label
- existence signal

สำหรับ Hidden/Internal records.

---

# 112. Historical Lifecycle Is Not Hidden

Lifecycle ที่มี Historical Public semantics ไม่ควรถูก remove จาก Search แบบ universal.

ตัวอย่างที่อาจยัง Searchable ตาม Domain meaning:

```text
Archived
Closed
Expired
Superseded
Inactive (เฉพาะเมื่อมี legitimate historical public destination)
```

Search projection ต้องเปลี่ยน:
- lifecycle context
- ranking/currentness
- relevant public metadata

แต่ไม่ถือว่า Historical Public = Hidden.

---

# 113. Document Expiry and Supersession

Document `Expired` ที่ยังมี legitimate Historical Public page สามารถคง Search Unit เดิมพร้อมสถานะ เช่น:

```text
[เอกสารหมดอายุ]
```

สำหรับ Supersession:

```text
Document B → Published
Document A → Superseded
```

canonical business transition ต้องรักษาความถูกต้องของ successor/predecessor ก่อน แล้ว Search จึง synchronize ให้:

```text
B = Current Public
A = Historical Public / Superseded
```

Search engine ไม่จำเป็นต้องร่วม transaction เดียวกับ canonical database แต่ต้อง converge สู่ผลของ canonical atomic transition.

---

# 114. Health Service Lifecycle Synchronization

Health Service มี semantics ต่างจาก generic content:

```text
Active → Temporarily Closed
```

ยังเป็น Current Public และยัง Searchable พร้อม status ชัดเจน เช่น `[ปิดให้บริการชั่วคราว]`.

`Inactive` ใช้ Domain-specific historical behavior ไม่ถูกตีความเป็น Deleted โดยอัตโนมัติ.

`Hidden`:

```text
→ immediately Not Public Searchable
```

Search ต้องเคารพความต่างระหว่าง Temporarily Closed / Inactive / Hidden ตาม Frozen lifecycle.

---

# 115. Personnel and Organization Lifecycle Effects

Inactive Personnel ไม่เป็น standalone general Search result โดย default ตาม Search Unit baseline แต่ historical News/Activity ที่กล่าวถึงบุคคลนั้นยังคง Searchable ตาม lifecycle ของ content นั้นเอง.

Personnel `Hidden` ต้องหยุด standalone discovery และ public relationship projections ต้องไม่เปิด public profile link ของ Hidden Personnel.

หลักเดียวกันใช้กับ Organization:
- Active public destination → Search eligible
- Inactive → Domain-specific historical behavior
- Hidden → no standalone Public Search result

การเปลี่ยน resource visibility ไม่ได้หมายถึงการ rewrite/delete legitimate historical public content โดยอัตโนมัติ.

---

# 116. Contact, Media, and Supporting-Source Synchronization

Contact Information และ Media ไม่ใช่ standalone Public Search Units ใน Version 1.

ถ้า Public Contact data ถูกใช้เป็น Searchable Source ของ owner เช่น Health Service แล้วเปลี่ยน:

```text
Public → Internal / Hidden
```

owner Search projection ต้องหยุดใช้ contact data นั้นเป็น matching/snippet source.

Media lifecycle ไม่สร้าง Media Search result แต่ supporting searchable metadata ของ parent อาจต้อง refresh เมื่อมีผลต่อ parent projection.

Version 1 ไม่ต้องสร้าง dependency graph ซับซ้อนสำหรับทุก attachment/image หากไม่มี use case รองรับ.

---

# 117. ITA Synchronization and Fiscal-Year Continuity

ITA Search projection synchronize ตาม public Fiscal Year / Requirement / supporting Evidence metadata ที่ Accepted ไว้.

การเปลี่ยน Evidence ไม่จำเป็นต้องสร้าง Search Unit ใหม่ แต่ Requirement projection อาจต้อง refresh เมื่อ supporting textเปลี่ยน.

เมื่อ Current Fiscal Year เปลี่ยน เช่น:

```text
2569 → 2570
```

ITA 2569 ไม่ถูกลบจาก Search เพียงเพราะไม่ใช่ปีปัจจุบันอีกต่อไป; 2570 เพียงได้รับ current-year preference ส่วน historical years ยังคงค้นได้พร้อม Fiscal Year context.

---

# 118. Homepage Promotion Is Independent from Search Eligibility

Homepage placement เช่น Featured / Urgent Alert / Health Information ไม่ควรเปลี่ยน source Search eligibility.

```text
Published News
→ Featured starts/ends
→ Search eligibility unchanged
```

Homepage prominence เป็น presentation concern; Search ยึด canonical source lifecycle.

Placement scheduling จึงไม่สร้าง/remove Search Unit เพียงเพราะช่วงเวลา Homepage เริ่มหรือสิ้นสุด.

---

# 119. Freshness Classes

เพื่อกำหนด product expectations โดยไม่ผูก SLA ตัวเลข Version 1 แบ่ง freshness conceptually เป็น 3 กลุ่ม:

### Visibility-Critical

เช่น Hidden, Internal, Permanent Withdrawal, Hard Delete.

Requirement:

> Public exposure must cease immediately from the user’s perspective.

### Public-State-Critical

เช่น Publish, Scheduled → Published, Supersede, Active → Temporarily Closed.

ควร synchronize promptly เพราะมีผลต่อ availability/currentness/status แต่ brief discovery delay ยอมรับได้ถ้าไม่เกิด visibility leak.

### Content-Freshness

เช่น Title, Summary, Topic และ public metadata updates.

ควร refresh ใน reasonably short operational delay; stale snippet ระยะสั้นเป็น recoverable freshness issue ไม่ใช่ security incident.

---

# 120. Reconciliation and Rebuildability

ไม่ว่า implementation จะเลือก synchronous update, event, queue, cron หรือวิธีอื่น Search projection ต้องสามารถ **reconcile / rebuild จาก canonical data** ได้.

หลัก:

> **Search Index is reconstructible.**

ดังนั้นการสูญเสีย index ต้องไม่ทำให้ canonical content สูญหาย และ Search engine ไม่ควรเป็นสถานที่เดียวที่เก็บข้อมูลธุรกิจซึ่งไม่มี source อื่น.

Full reindex/rebuild capability มีได้เชิง operation แต่ไม่จำเป็นต้องเป็น routine Editor/Publisher workflow.

---

# 121. Retry, Out-of-Order Updates, and Latest-State-Wins

Search synchronization/retry ต้อง idempotent และ converge ไปยัง canonical state ล่าสุด.

ตัวอย่าง:

```text
Event 1: Published
Event 2: Hidden
```

ถ้า Event 1 ถูก retry หลัง Event 2 ระบบห้ามทำ record กลับมา Public Searchable.

หลัก Freeze:

> **Search synchronization never replays stale state as truth; the latest committed canonical state wins.**

Out-of-order processing จึงต้อง re-check canonical truth แทนการเชื่อ stale payload แบบ blind.

---

# 122. Delete, Missing Record, and Cache Safety

Hard Delete ที่ได้รับอนุญาตต้องทำให้ Search projection ถูก remove ตามมา แต่แม้ index ยังมี orphan candidate:

```text
Canonical record missing
→ Not Searchable
```

ห้ามเดาว่า missing record เป็น Historical Public.

หากใช้ Search response cache ในอนาคต cache ก็ต้องเคารพ current Public eligibility เช่นเดียวกัน:

> **Caching may improve performance but may never weaken visibility guarantees.**

---

# 123. Search Failure Isolation

Search subsystem failure ต้อง degrade เฉพาะ Search ไม่ทำให้ Public Website ทั้งระบบล่ม.

เมื่อ Search unavailable:
- canonical News/Service/Document/Health Service pages ยังเปิดได้
- navigation และ direct canonical URLs ยังทำงาน
- `/search` แสดง graceful Search Error ตาม UX baseline

Public page rendering ไม่ควรมี Search engine เป็น required authority/dependency.

---

# 124. Operational Boundary and Audit Noise Control

Search index update, retry และ routine reconciliation เป็น technical operational concerns ไม่ใช่ Publishing lifecycle states.

Version 1 ไม่เพิ่มสถานะเช่น:

```text
Published but Not Indexed
Indexing
Index Failed
Reindexing
```

ลง Content lifecycle.

Publication lifecycle ยังคง Audit ตาม `07`; routine Search retries/reindex operations ไม่ควร flood Publishing Audit history. Technical operations ใช้ logging/monitoring ที่เหมาะสมแทน.

Content staff ไม่ควรถูกมอบภาระดู search job queue, inspect payload หรือกด retry ต่อ record ใน routine workflow.

---

# 125. Lifecycle-to-Search Behavior Matrix

| Canonical State / Action | Public Search Behavior |
|---|---|
| Draft | Not searchable |
| Pending Review | Not searchable |
| Approved | Not searchable until actually Published |
| Scheduled | Not searchable until publication execution succeeds |
| Published | Search eligible |
| Published content updated | Refresh Search projection |
| Archived + Historical Public | Remains searchable with context |
| Closed / Expired + Historical Public | Remains searchable with lifecycle context |
| Superseded | Historical searchable; successor preferred |
| Temporarily Closed Health Service | Remains Current Public/Searchable with status |
| Inactive | Domain-specific historical behavior |
| Hidden | Immediately ineligible |
| Internal | Immediately ineligible |
| Permanent Withdrawal | Immediately removed from Public discovery |
| Hard Delete / missing canonical record | Ineligible; stale candidate suppressed |
| Homepage placement start/end | No change to source Search eligibility |

---

# 126. Version 1 Exclusions for Freshness and Synchronization

Version 1 does **not** require:
- Kafka/event bus
- Elasticsearch cluster
- distributed indexing pipeline
- exactly-once indexing infrastructure
- complex Change Data Capture
- search-job administration console
- manual per-record `Retry Search` button
- multi-stage indexing state machine
- real-time websocket indexing status
- mandatory zero-lag numeric SLA

Exact queue/event/cron/search-engine/cache/retry topology remains deferred to `10-system-blueprint.md` and must be justified by actual operational requirements.

---

# 127. Accepted Search Index Freshness, Lifecycle Synchronization & Failure Safety

**Sections 105–126 = Accepted Search Index Freshness, Lifecycle Synchronization & Failure Safety.**

Accepted baseline:

- canonical CMS/Domain data is always the Source of Truth; Search is a reconstructible derived discovery projection.
- Search synchronization failure does not normally roll back an otherwise successful canonical publication/update.
- discovery freshness may be eventually consistent for a short operational period, but visibility/privacy always fail closed.
- every Public Search result must satisfy current canonical Public eligibility before exposure, regardless of stale index/cache state.
- Draft, Pending Review, Approved-but-unpublished, Scheduled-before-successful-publication, Hidden, and Internal records do not appear in Public Search.
- newly Published content becomes eligible only after actual publication succeeds; scheduler failure creates no Search result.
- Published updates refresh Search projection while canonical pages remain authoritative for latest committed public content.
- Archive/Closed/Expired/Superseded/Inactive follow Domain-specific Historical Public semantics rather than a universal remove-from-search rule.
- visibility-critical transitions such as Hidden/Internal/Withdrawal/Delete immediately suppress Public discovery from the user perspective.
- Document supersession synchronizes from the canonical atomic successor/predecessor transition without requiring Search to share the same database transaction.
- Health Service Temporarily Closed remains current/searchable with status; Hidden is immediately non-public; Inactive remains domain-specific.
- Personnel/Organization visibility changes do not retroactively rewrite legitimate historical public content.
- supporting Contact/Media/ITA data may refresh parent projections without becoming standalone Search Units.
- Homepage promotion/placement timing never controls source Search eligibility.
- freshness expectations distinguish visibility-critical, public-state-critical, and ordinary content-freshness changes without fixed numeric SLA in this Product Contract.
- Search projection can be reconciled/rebuilt from canonical data; index loss never means content loss.
- retries/reconciliation are idempotent, latest-canonical-state-wins, and safe against stale/out-of-order updates.
- missing canonical records and stale caches fail closed.
- Search subsystem failure degrades Search only; canonical public pages/navigation/direct URLs remain independent.
- indexing/retry/rebuild are operational states, never new Content lifecycle states; routine technical retries do not pollute Publishing Audit history.
- Version 1 excludes enterprise streaming/exactly-once/search-job-console/zero-lag infrastructure unless later requirements justify it.

---

# 128. Search Operational Responsibility Boundary

Search operations are primarily a **system responsibility**. Content staff manage canonical content; the system manages synchronization, projection health, retry, reconciliation, and rebuild behavior.

Routine staff workflow remains:

```text
Create / Edit canonical content
→ Publish / Save Changes / Archive / Hide / other authorized lifecycle action
→ Done
```

Editors and Publishers do **not** perform routine `Index`, `Reindex`, `Retry Search`, `Clear Search Cache`, or job-management actions.

> **Staff manage content; the system manages the Search projection.**

---

# 129. Administrator Boundary

Administrator authority does not turn the CMS into an infrastructure console.

Administrator-facing Search information should be small and actionable, for example:

```text
Search
Status: Healthy
```

or, when an operational condition persists:

```text
Search synchronization issue
Some newly updated information may be delayed in Search.
```

Version 1 does not expose routine queue payloads, worker internals, index shards, retry counters, or job inspection screens to CMS administrators.

---

# 130. Derived Search Health

Search may expose a small derived operational health model:

```text
Healthy
Degraded
Unavailable
```

Conceptually:

- **Healthy** — Search requests and synchronization/reconciliation are operating normally.
- **Degraded** — Search remains usable, but freshness or synchronization health is outside normal operating expectations.
- **Unavailable** — Search cannot reliably serve requests and should return the defined graceful Search Error state.

These are operational states, not Content lifecycle states and not Publishing workflow states.

Exact thresholds and monitoring implementation remain deferred to `10-system-blueprint.md`.

---

# 131. Health Must Be Meaningful

A successful HTTP ping alone is not sufficient evidence that Search is healthy.

Operational health should conceptually consider relevant signals such as:

- query path availability
- abnormal query failure conditions
- canonical-to-Search synchronization health
- abnormal synchronization backlog/failure
- reconciliation health/freshness

`08-search.md` does not define an infrastructure-specific health engine or numeric threshold.

---

# 132. Incremental Synchronization Is the Normal Path

Normal operation updates only the Search projections affected by committed canonical changes.

```text
Canonical content change
→ update affected Search projection
```

Changing one News title must not require rebuilding the complete Search corpus.

Whether the implementation uses direct updates, events, a queue, an outbox, cron, or another mechanism is deferred to `10-system-blueprint.md`.

---

# 133. Full Rebuild / Reindex Capability

Because Search is a derived and reconstructible projection, the system must be able to rebuild it from canonical public data.

```text
Canonical Public Data
→ rebuild
→ Search Projection
```

Full rebuild is intended for controlled operational cases such as:

- deployment or migration affecting Search projection structure
- index corruption/loss
- Search projection schema change
- disaster recovery
- controlled maintenance

It is **not** a routine content-publishing task and must never be required after ordinary staff edits.

---

# 134. Scoped Reindexing

Scoped reindexing may exist where operationally useful, for example:

```text
Reindex affected Search Unit
Reindex a Search projection/content family
Full Rebuild
```

Version 1 does not require controls for infrastructure concepts such as shard, batch size, worker, segment, or execution priority.

If manual recovery is exposed, actions should remain meaningful at the application/system level rather than exposing search-engine internals.

---

# 135. No Routine Per-record Retry Workflow

Editors and Publishers do not receive routine messages such as:

```text
Search indexing failed
[Retry]
```

The system should retry/reconcile recoverable synchronization failures automatically.

A per-record manual Search repair workflow is not a Version 1 requirement unless a future demonstrated operational need justifies it.

---

# 136. Reconciliation Complements Retry

Retry attempts a failed synchronization operation. Reconciliation verifies/converges Search toward **current canonical truth**, including cases where:

- a change signal was missed
- a worker was unavailable
- deployment interrupted synchronization
- updates arrived out of order
- stale Search data remains

Version 1 requires the capability to reconcile/rebuild, but does not require a continuous real-time full-record comparison service.

The system should eventually converge without creating an expensive integrity scanner that continuously checks every field of every record.

---

# 137. Operational Observability

Operational Search observability should be sufficient to detect, diagnose, and recover service problems.

Useful categories include:

- Search availability
- query execution failures
- synchronization failures / abnormal backlog
- projection freshness lag
- reconciliation success/failure

These are reliability signals, not a requirement to build a dedicated analytics dashboard in Version 1.

---

# 138. Operational Observability Is Not Search Usage Analytics

The system distinguishes:

```text
Operational Observability
≠
Search Usage Analytics
```

Operational observability supports reliability and recovery.

Usage analytics includes questions such as:

- what users search most often
- zero-result trends
- click-through rate
- popular Search results

Search Usage Analytics remains outside the Version 1 baseline unless later evidence creates a real product need.

---

# 139. Search Query Logging and Privacy

Although Global Search is designed for public information, users may accidentally type personal or sensitive information into the query box.

Therefore:

> **Raw Search queries are treated as potentially sensitive user input.**

Operational logging follows data minimization and records only information genuinely necessary for reliability/security diagnosis.

Error handling should avoid unnecessary dumps of:

- complete result documents
- full content bodies
- contact datasets
- complete request contexts

Exact masking, retention, and infrastructure logging controls are deferred to Privacy/System Blueprint decisions.

---

# 140. Alerts and Operational Severity

Alerts should represent sustained, actionable operational conditions rather than every transient retry that self-recovers.

Examples that may justify alerting include:

- Search remains unavailable beyond normal transient failure
- synchronization backlog/failure remains abnormal
- reconciliation repeatedly fails
- the visibility-safety mechanism cannot reliably confirm current Public eligibility

Visibility-safety failures receive the highest operational priority.

If current eligibility cannot be established, Search continues to **fail closed** rather than exposing a stale candidate.

---

# 141. Minimal Admin CMS Search Surface

If Search-related operational information appears in Admin CMS, Version 1 should keep it deliberately small, read-only/actionable, and **outside the normal Admin Work Dashboard**, consistent with Frozen `05-admin-cms.md`.

It may appear under an appropriate Administration/read-only system-information surface, for example:

```text
Search
Status: Healthy
Last successful reconciliation: ...
```

Version 1 does **not** require a CMS-exposed Search maintenance action. The CMS does not become a Search Configuration Center, infrastructure console, or system-health Dashboard.

---

# 142. No Staff-controlled Ranking or Promotion

Version 1 does not expose staff controls for:

- editable ranking weights
- per-query boosts
- pinned Search results
- manual demotion
- sponsored/promoted Search results
- global synonym/thesaurus management

Homepage/Featured/navigation curation is the proper mechanism for editorial promotion; Search ranking remains discovery-oriented and deterministic.

Curated aliases remain part of appropriate canonical entity/master data rather than a separate Search Administration subsystem.

---

# 143. Reindex Authorization and Frozen Permission Boundary

Version 1 does **not** add a new CMS `search.reindex` capability after Frozen `06-roles-permissions.md`.

Manual reindex/rebuild should preferably remain an operational/deployment maintenance capability outside routine CMS workflow. If a future implementation genuinely requires exposing it inside Admin CMS, that change must pass Roles & Permissions Impact Review / Controlled Amendment; the resulting action would require Administrator-level authorization and remain subject to system safeguards.

Reindexing always means:

```text
Reindex
≠ Publish
≠ Restore
≠ Unhide
≠ lifecycle override
```

It only reconstructs the Search projection from current canonical truth and can never bypass lifecycle, visibility, permissions, or publishing invariants.

---

# 144. Safe Rebuild and Maintenance Behavior

Maintenance/rebuild must preserve the visibility guarantees defined earlier in this document.

During maintenance, Search may be:

- temporarily Degraded
- temporarily unavailable with the normal graceful Search Error state
- temporarily serving eligible older projection data that still passes current canonical eligibility

It may **not** expose non-public information merely to preserve Search availability.

> **Visibility/privacy guarantees take priority over Search availability.**

The exact safe-swap, incremental-rebuild, versioned-index, or alternative implementation strategy remains deferred.

---

# 145. Deployment and Search Projection Evolution

Search projection/index structure may evolve independently of canonical Content Model storage where product semantics remain unchanged.

A deployment that changes Search projection shape may require migration/rebuild, but staff must not be required to edit or republish content record-by-record to recover Search.

Search infrastructure changes must have a recoverable path back to canonical truth.

---

# 146. Operational Log Retention

Technical Search logs are operational records, not permanent Content records.

They require an explicit operational/security purpose and bounded retention rather than indefinite storage merely because capacity is available.

Exact duration, masking, storage, and access rules are deferred to Privacy/System Blueprint decisions.

---

# 147. What Remains Deferred to `10-system-blueprint.md`

`08-search.md` freezes Product and operational behavior, not infrastructure design.

The following remain implementation decisions for `10-system-blueprint.md`:

- SQL/native search vs dedicated Search engine
- Thai tokenizer implementation
- Search projection/index schema
- synchronization architecture
- queue / outbox / event / cron strategy
- retry/backoff details
- reconciliation schedule/mechanism
- health-check implementation
- metrics/logging stack
- Search cache strategy
- deployment/reindex mechanism
- exact numeric freshness/SLA thresholds
- exact technical log retention
- exact Administrator maintenance interface, if one is justified

Any infrastructure complexity must be justified by actual requirements rather than assumed in advance.

---

# 148. Accepted Search Operations, Reindexing, Observability & Admin Boundaries

**Sections 128–147 = Accepted Search Operations, Reindexing, Observability & Admin Boundaries.**

Accepted baseline:

- Search operations are system responsibilities; Editors/Publishers manage canonical content and do not manually index, retry, clear cache, or repair Search after routine publication.
- Administrator Search visibility remains intentionally small/actionable and does not expose routine queue, worker, payload, shard, or index internals.
- Search may expose simple derived operational health such as Healthy / Degraded / Unavailable; exact thresholds remain implementation concerns.
- incremental synchronization is the normal path; full rebuild/reindex is recovery/maintenance rather than routine content workflow.
- Search projection can be fully rebuilt from canonical data, and reindexing never changes canonical lifecycle/visibility.
- scoped reindexing may exist when useful, but Version 1 does not require a comprehensive Search administration console or per-record retry workflow.
- reconciliation complements retry and converges Search toward current canonical truth without requiring continuous full-record comparison.
- operational observability covers availability, query failures, synchronization/freshness, and reconciliation health; Search Usage Analytics remains outside the Version 1 baseline.
- raw Search queries are treated as potentially sensitive user input; operational logging follows data minimization and bounded-retention principles.
- alerts are reserved for sustained actionable conditions; visibility-safety failures receive the highest priority and always fail closed.
- Version 1 does not expose editable ranking weights, manual query boosts/pinning, or a global Search synonym manager to CMS staff.
- Version 1 adds no new CMS reindex permission; manual reindex preferably remains operational maintenance outside routine CMS, and exposing it later requires Roles & Permissions Impact Review / Controlled Amendment with Administrator-level authorization.
- Search maintenance may degrade availability but may never weaken privacy/visibility guarantees.
- infrastructure/search-engine/queue/retry/monitoring/SLA specifics remain deferred to `10-system-blueprint.md`.

---

# 149. Search Security Foundation

Public Search is a discovery interface over an explicitly public-safe projection, not a generic query interface over canonical CMS tables or internal records.

Core rule:

> **Search must reveal no more information than the canonical Public Website is already allowed to reveal.**

Security controls must remain proportionate to a public-sector information website and must not turn routine Search into an enterprise security platform.

---

# 150. Public-safe Projection and Defense in Depth

Public Search candidates should originate from a public-safe Search projection derived from canonical content and current Public eligibility.

Conceptually:

```text
Canonical CMS / Domain Data
        ↓
Public Eligibility
        ↓
Public Search Projection
        ↓
Search
        ↓
Current Canonical Eligibility Guard
```

The final eligibility guard remains authoritative even when the Search projection/index is stale.

Search must not query all CMS records and rely only on the frontend to hide non-public results.

---

# 151. Small Allowlisted Public Search Contract

A Public Search endpoint may accept only the small set of parameters required by the Product Contract, such as conceptually:

- query text
- Search Group / Content Type filter
- Fiscal Year where supported
- page

The endpoint must not expose arbitrary database fields, raw conditions, generic sorting over internal fields, engine-native expressions, regular expressions, scripting, or arbitrary query-language features.

Exact endpoint names and parameter names remain implementation decisions.

---

# 152. Query Input Is Data, Not Executable Syntax

User-entered query text must always be treated as data.

Input such as SQL-looking or engine-looking syntax must never be concatenated into executable SQL/search expressions without safe parameterization or an equivalent safe API.

Frontend validation may improve UX, but server-side validation remains authoritative.

Version 1 does not require advanced public query syntax such as field selectors, Boolean operators, regex, scripting, or engine-specific commands.

---

# 153. Request Bounds and Parameter Validation

Public Search requests must have reasonable server-enforced bounds.

Examples include:

- bounded maximum query size
- allowlisted filter values
- valid Fiscal Year format where applicable
- bounded page/page-size behavior
- no client-controlled unlimited result size
- no arbitrary expensive algorithm parameters

No arbitrary minimum query length may block legitimate short queries such as `ITA`, `DM`, `HT`, or `NCD`.

Exact numeric limits remain deferred to implementation.

---

# 154. Hidden-resource Existence Leakage

Hidden, Internal, withdrawn, missing, or otherwise Public-ineligible resources must reveal neither content nor existence through Public Search.

For an exact query matching a Hidden record, Public Search must not respond with messages such as:

- “record exists but you cannot access it”
- “1 unavailable result”
- a suppressed-result count

From the Public Search perspective, the record is outside the eligible result set.

---

# 155. Result Counts, Facets, and Identifier Guessing

Any displayed result count or future facet count must be calculated from the Public-eligible result set only.

Public Search must never reveal raw counts that include Hidden/Internal candidates.

Knowing or guessing a stable Public ID/internal identifier does not grant visibility. Current canonical Public eligibility remains authoritative regardless of identifier knowledge.

> **Stable identity is not an authorization token.**

---

# 156. Snippet, Highlight, and Output Safety

Search snippets/highlights may use only public-safe searchable fields.

They must never include:

- internal notes
- approval/review reasons
- Audit data
- private contact data
- internal-only relationships
- raw unsanitized editor markup

Query text and result text used for highlighting must be treated as text, not executable HTML or script.

Rich-text excerpts must come from a sanitized public representation rather than raw CMS markup.

---

# 157. Private-data Boundary

Global Public Search remains a Public-information feature only.

It does not search:

- patient records
- complaint/case records
- application/request status
- private staff records
- private Contact Information
- Audit/Approval records
- Pending Review or other non-public content

If a future authenticated portal requires private-data search, that is a separate security/product boundary rather than an implicit extension of `/search`.

Public Personnel Search continues to use only the approved public projection such as public display name, public position, and public organizational context.

---

# 158. Resource-abuse Protection

The Public Search endpoint must prevent a single request from demanding unbounded or disproportionately expensive work.

The client must not be able to request:

- all results without pagination
- arbitrarily large page sizes
- arbitrary full-index scanning controls
- unrestricted regex or scripting
- internal Search documents
- custom fuzzy-distance/algorithm parameters

Malformed or out-of-bound requests fail predictably and safely without exposing implementation internals.

---

# 159. Lightweight Rate Limiting and Abuse Controls

Version 1 may use reasonable abuse-oriented rate limiting/throttling for Public Search.

Normal users should not be required to authenticate or solve CAPTCHA simply to search public information.

CAPTCHA, advanced bot challenges, or stronger anti-abuse controls are escalation measures only if real abuse justifies them.

Rate limiting must not become an excuse to create permanent user profiling or long-term Search-history tracking.

---

# 160. Search Results and External SEO/Crawlers

Dynamic Internal Search URLs such as `/search?q=...` are user discovery views, not canonical public-content destinations.

Canonical resource pages remain the intended external-search destinations, for example News, Service, Health Content, Document, ITA, and other public routes.

Version 1 should treat Search-result pages as `noindex` discovery surfaces rather than SEO content pages.

Crawler/robots directives are SEO controls only and never replace eligibility, validation, rate limiting, or other security controls.

---

# 161. External Search Engine Convergence Is Separate

If content was previously Public and later becomes Hidden, withdrawn, or otherwise unavailable, Internal Search must stop exposing it according to the current canonical lifecycle immediately from the user perspective.

External search engines may take time to refresh their own indexes/caches.

The website should therefore expose correct canonical route semantics such as Not Found, Gone, or meaningful Redirect according to the Frozen Sitemap/Publishing Workflow, while recognizing that external crawler convergence is outside the direct control of `08-search.md`.

---

# 162. Purpose-built Public Search API Response

A Public Search API response must contain only the minimal public-safe fields required to render Search results, conceptually:

- canonical stable identity as needed
- canonical public URL
- human-readable public type/group
- Title/Name
- authored Summary or safe snippet
- safe display metadata
- public lifecycle context where meaningful

The backend must not send full CMS entities containing private/internal fields and rely on React to hide them.

> **Do not send what the client is not allowed to expose.**

The Public Search endpoint is read-only and does not mutate canonical content or ranking state.

---

# 163. Public Error Safety

Public Search errors remain generic and safe.

The user may see a message such as:

> ไม่สามารถค้นหาได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง

Public responses must not expose database errors, stack traces, search-engine names, index names, query dumps, payloads, internal IDs, or infrastructure topology.

Authorization-like errors for Hidden/Internal candidates should not occur in Global Search because those candidates are outside the eligible result set.

---

# 164. Search Query Logging and Privacy

Raw Search queries must be treated as potentially sensitive user input even though Search itself is Public.

Users may accidentally enter names, phone numbers, health-related text, identifiers, or complaint-like information.

Operational logging therefore follows:

- data minimization
- explicit operational/security purpose
- bounded retention
- restricted access appropriate to the implementation

Version 1 does not assume raw queries are suitable for indefinite storage or permanent analytics.

---

# 165. Future Usage Analytics Requires Separate Review

Any future capability for:

- popular queries
- zero-result analysis
- Search history
- click-through analysis
- personalization

requires a separate need/privacy review.

Where justified, aggregation/minimization should be preferred over retaining raw long-term individual query histories.

Search Usage Analytics remains outside the Version 1 baseline.

---

# 166. Authentication and CSRF Boundary

Global Public Search remains accessible without login.

Security/abuse protection must not require a user account by default.

Because Public Search is read-only and does not mutate canonical user/content state, it does not create a CMS-style CSRF workflow requirement merely to perform a search.

Exact HTTP/API security mechanisms remain implementation decisions for the System Blueprint.

---

# 167. Version 1 Security Baseline and Non-goals

Version 1 Search security is intentionally straightforward:

```text
Public-safe projection
+ current canonical eligibility guard
+ server-side allowlist validation
+ safe parameterized query execution
+ bounded requests
+ sanitized snippets/output
+ proportionate rate limiting
+ privacy-conscious logs
+ graceful public errors
```

Version 1 does not require:

- a WAF rules engine inside CMS
- SIEM/SOC dashboards
- anomaly-detection ML
- mandatory CAPTCHA
- identity-based public Search
- enterprise bot-management infrastructure
- an advanced public query language

Any later complexity must be justified by actual observed risk or requirements.

---

# 168. Security Responsibilities Deferred to `10-system-blueprint.md`

`08-search.md` freezes Product/security behavior rather than implementation technology.

The System Blueprint may later choose the concrete mechanisms for:

- query parameterization/escaping
- HTTP/API validation
- output encoding/sanitization
- exact maximum query/page sizes
- rate-limit policy/storage
- cache security behavior
- robots/meta implementation
- Search API transport
- technical logging/retention/access
- infrastructure monitoring and alerting

These choices must preserve the Product Contract defined here.

---

# 169. Public Search Security Boundary Model

Conceptual request flow:

```text
User Query
   ↓
Input / Parameter Validation
   ↓
Bounded Public Search Contract
   ↓
Public-safe Search Projection
   ↓
Current Canonical Eligibility Guard
   ↓
Ranking / De-duplication
   ↓
Minimal Public-safe Result DTO
   ↓
Accessible Public Search UI
```

At every stage:

```text
Hidden / Internal / Non-Public
→ never exposed
```

This keeps Search secure by structure rather than by relying on staff discipline or frontend concealment.

---

# 170. Accepted Search Security, Privacy & Abuse Boundaries

**Sections 149–169 = Accepted Search Security, Privacy & Abuse Boundaries.**

Accepted baseline:

- Public Search operates only over a public-safe projection and never becomes a generic query interface over canonical/internal CMS data.
- Public Search accepts a small allowlisted request contract; arbitrary fields, database conditions, regex, scripting, engine-native syntax, and advanced query language are outside Version 1.
- query input is always treated as data; safe server-side validation/query execution remains authoritative.
- legitimate short acronyms remain supported while query/result/page dimensions have reasonable upper bounds.
- Hidden/Internal/withdrawn/missing/Public-ineligible resources reveal neither content nor existence, suppressed counts, or facet counts.
- stable identifier knowledge never bypasses canonical Public eligibility.
- snippets/highlights/API responses use sanitized public-safe fields only; internal notes, approval/audit data, private contacts, and raw editor markup never leak into Search output.
- Global Search remains strictly Public-information search and does not implicitly expand into patient/case/application/authenticated/internal search.
- Version 1 uses proportionate rate limiting/resource protection without mandatory login/CAPTCHA/profiling for normal use.
- clients cannot request unbounded/expensive Search algorithms, unlimited result sizes, or internal engine controls.
- `/search?...` pages are user discovery views rather than canonical SEO content and should not be indexed as standalone content pages.
- crawler directives remain SEO controls, never security controls.
- Public Search API responses are purpose-built/read-only/minimal and never send sensitive CMS fields for the frontend to hide.
- public errors are generic/safe; infrastructure detail remains operational-only.
- raw Search queries are potentially sensitive input and follow data-minimization/bounded-retention principles.
- future Search usage analytics/history/personalization requires separate need/privacy review.
- Version 1 relies on clear public projection, eligibility, bounded validated requests, safe output, graceful failure, and proportionate abuse controls rather than an enterprise security platform.

---

# 171. Final Search Consistency Review

Final review compared this document against Frozen `00–07` and found **no architectural blocker** after three consistency repairs.

## 171.1 Review Scope

The review verified:

- Website Foundation / Citizen First / Search-as-First-Class alignment
- Information Architecture and public-domain boundaries
- Frozen Sitemap `/search`, Search Groups, canonical routes, query-state, and public lifecycle behavior
- Content Model Search Unit/resource meaning and shared Document/Media/ITA relationships
- Homepage vs Search responsibility separation
- Admin CMS / Roles & Permissions boundaries
- Publishing lifecycle, Historical Public, Hidden/Internal, Superseded/Expired, and fail-closed semantics
- Thai matching, ranking, de-duplication, Search UX, lifecycle synchronization, operations, and security/privacy consistency
- Version 1 over-engineering guardrails
- correct deferral of engine/index/queue/tokenizer/API/monitoring implementation to `10-system-blueprint.md`

## 171.2 Consistency Repairs Applied Before Freeze

1. **Frozen Search Group alignment** — `08` now uses the Sitemap baseline `ทุกประเภท / ข่าวสาร / บริการประชาชน / ข้อมูลสุขภาพ / หน่วยบริการ / เอกสาร / ITA / เกี่ยวกับเรา` rather than an incomplete example set.
2. **Personnel / Organization canonical destination alignment** — Version 1 Search results use `/about/personnel` and `/about/organization` directory/anchored context as Frozen in the Sitemap; `08` no longer leaves room for creating new per-entity detail routes without Sitemap amendment.
3. **Admin / reindex permission boundary alignment** — Search health, if exposed in Admin CMS, remains read-only/actionable system information outside the normal Admin Work Dashboard. Version 1 adds no new CMS `search.reindex` permission after `06` Freeze; manual reindex remains operational maintenance unless a future Controlled Amendment explicitly introduces an Admin capability.

These repairs clarify existing Frozen decisions and do not introduce a new Search feature or change the accepted architecture.

## 171.3 Consistency Result

```text
Website Foundation                         PASS
Information Architecture                   PASS
Content Model                              PASS
Sitemap / canonical route ownership        PASS
Homepage responsibility boundary           PASS
Admin CMS                                  PASS
Roles & Permissions                        PASS
Publishing Workflow / lifecycle            PASS
Search Unit / matching / ranking            PASS
Search UX / filters / URL state             PASS
Freshness / synchronization / fail-closed   PASS
Operations / observability                  PASS
Security / privacy / abuse boundaries       PASS
Over-engineering guardrails                 PASS
Implementation deferral to System Blueprint PASS
```

**Final Result: PASS.**

No new Search feature topic is required before Freeze.

---

# 172. Freeze — Public Search / Search & Discovery Baseline v1.0

`08-search.md` is **FROZEN — Public Search / Search & Discovery Baseline v1.0**.

Frozen baseline includes:

- Public Search Foundation and separation from Admin Search
- Searchable Content & Search Unit Model
- Searchable Fields, Thai matching, aliases, numerals, and year-aware behavior
- deterministic ranking, historical/current ordering, successor behavior, and semantic de-duplication
- `/search` UX, citizen-facing Search Groups, URL-backed query/filter/page state, pagination, zero/error/loading states, responsive/accessibility rules
- canonical lifecycle synchronization, fail-closed visibility, reconciliation, and rebuildability
- Search operations/observability boundaries without Search-admin over-engineering
- public-safe projection, request bounds, output safety, privacy, abuse protection, crawler/SEO boundary, and minimal Public Search API contract
- explicit deferral of implementation technology to `10-system-blueprint.md`

Future changes to this Frozen baseline require Impact Review and, where appropriate, Controlled Amendment/version increment under the project documentation rules.

Next planned document:

> **`09-migration-plan.md` — Migration Plan**

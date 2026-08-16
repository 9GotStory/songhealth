# Public Search / Search & Discovery — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 08-search  
> **Status:** WORKING DRAFT  
> **Version:** 0.1  
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

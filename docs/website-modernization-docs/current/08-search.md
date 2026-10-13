# Public Search / Search & Discovery — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 08-search
> **Status:** CLEAN REBASELINE v2.3 — V1 scope revision for Independent Review / Human Acceptance
> **Version:** 2.3
> **Last Updated:** 14 ตุลาคม 2569 (2026-10-14)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`, `04-homepage.md`, `05-admin-cms.md`, `06-roles-permissions.md`, `07-publishing-workflow.md`
> **Purpose:** กำหนด Public Search ที่ใช้ง่ายสำหรับประชาชนโดยใช้ search capability ของ CMS/database ก่อน และไม่สร้าง search platform แยก


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers structured ITA historical-evidence
> management and unavailable Q3/Q4 enforcement from V1. Ordinary native content/Document/Media,
> publication, permissions and supported validation remain on EmDash 1.1.0. This revision awaits
> independent review and human acceptance; deferral is not implementation or PASS. No upstream
> change, new subsystem, replacement ITA workflow or production action is authorized.

---

# 1. Goal

Global Search ที่ `/search` ช่วยให้ประชาชนค้นหา public website content ข้ามหลาย content domains และไปยัง canonical destination ได้เร็ว.

> **Search discovers content; it does not own content.**

---

# 2. Searchable Content

Version 1 ค้นหาเฉพาะ content ที่ตั้งใจให้ public และเหมาะกับ discovery เช่น:

- News
- Activity
- Announcement
- Service
- Health Service
- Health Content
- Health Report
- Document
- selected About/Basic Page content

Media ไม่เป็น standalone global-search result โดย default.

---

# 3. Public Eligibility

Public Search ต้องไม่เปิด Draft/Trash/private editorial state.

Baseline ใช้ published state ของ CMS เป็น authority ของ public eligibility.

Domain metadata เพิ่มเติม เช่น inactive facility หรือ expired announcement ใช้เฉพาะเมื่อ Product ต้องการแยก current vs historical discovery; ไม่สร้าง generic Search visibility state.

---

# 4. Thai Search

Search implementation ต้องรองรับภาษาไทยโดยไม่พึ่ง English stemming.

Version 1 ยอมรับ tokenizer/search mode ที่เหมาะกับข้อความไม่มี word separators และ substring matching.

Short-query behavior ต้องชัดเจนใน UI. หาก search engine ที่เลือกต้องการอย่างน้อย 3 Unicode characters ให้ UI แจ้งผู้ใช้แทนการสร้าง fallback engine ทันที.

หลัง UAT หากคำค้นสั้น 1–2 อักษรเป็น use case สำคัญ จึงค่อยเพิ่ม targeted fallback.

---

# 5. Searchable Fields

แต่ละ collection กำหนด searchable fields เท่าที่มีคุณค่า เช่น:

- Title/Name — สำคัญสูง
- Summary/Excerpt — สำคัญรอง
- Body/Description — สำหรับ full-text discovery
- selected aliases/keywords — เฉพาะ entity ที่มีชื่อย่อหรือชื่อที่ประชาชนใช้จริง

ไม่ index ทุก field โดย default.

Reference fields/relationships ไม่จำเป็นต้อง flatten เข้า search corpus หากไม่มี use case.

---

# 6. Ranking

Version 1 ใช้ ranking ของ platform/search engine เป็น baseline พร้อม field weights/configuration เท่าที่ native capability รองรับ.

Product requirement คือผลที่ match Title/Name โดยตรงควรมีประโยชน์ต่อผู้ใช้ ไม่ใช่การ Freeze score formula.

ไม่สร้าง custom deterministic ranking pipeline, BM25 tuning layer, reranker หรือ ranking service ก่อน UAT.

Version 1 ไม่ใช้:

- personalization
- click-through ranking
- sponsored/promoted ranking
- AI/vector reranking
- editor-controlled arbitrary boost console

---

# 7. Search Groups and Filters

Public Search Group ใช้เพื่อให้ประชาชนเข้าใจง่าย โดย map ไปยัง collection sets เช่น:

- ทุกประเภท
- ข่าวสาร
- บริการประชาชน
- ข้อมูลสุขภาพ
- หน่วยบริการ
- เอกสาร
- เกี่ยวกับเรา

Group เป็น presentation/filter concept ไม่ใช่ content type ใหม่.

Fiscal Year filter แสดงเฉพาะเมื่อเหมาะกับ retained Document/report context. Structured ITA search results/groups/filters are deferred with `02` §18; no legacy content is deleted by this exclusion.

อย่าเพิ่ม filter จำนวนมากก่อนมี use case.

---

# 8. Result Presentation

ผลค้นหาแต่ละรายการควรแสดงเท่าที่จำเป็น:

- Title/Name
- human-readable type/group
- safe snippet/summary
- relevant date/status เมื่อช่วยตัดสินใจ
- canonical public URL

ไม่แสดง internal score, database ID, editor metadata หรือ private/internal fields.

---

# 9. URL State and Pagination

`/search` ควรเก็บ query/group/page state ใน URL เพื่อ:

- share
- reload
- back/forward
- accessibility

ใช้ pagination หรือ bounded result window; ไม่ต้อง infinite scroll.

Search result pages เป็น discovery views ไม่ใช่ canonical content pages.

---

# 10. Search Engine Ownership

Search index เป็น infrastructure ของ platform ที่เลือก ไม่ใช่ Songhealth domain store.

Version 1 **ไม่สร้าง custom Search Projection** หรือ synchronization pipeline หาก native search index ติดตาม CMS lifecycle อยู่แล้ว.

ไม่สร้าง:

- queue สำหรับ index
- retry state machine
- reindex dashboard
- Search health admin subsystem
- duplicate canonical/search database

ใช้ native rebuild/maintenance capability เมื่อจำเป็น.

---

# 11. Public Safety

Search path ต้อง:

- query published/public content only
- validate/bound query and result limits
- return public-safe fields
- fail safely without stack traces/database details
- apply reasonable abuse/rate protection จาก platform/deployment

หากใช้ trusted internal server-side search path ไม่จำเป็นต้อง expose standalone public REST endpoint.

---

# 12. Zero and Error States

Zero-result UI ควร:

- บอกว่าไม่พบข้อมูล
- แนะนำให้ลองคำที่กว้างขึ้น
- ให้กลับไป navigation/service/document directory ได้

Error state ต้องแยกจาก zero results.

---

# 13. Admin Boundary

Staff ดูแล canonical content และ searchable field configurationตามสิทธิ์ของ platform.

Version 1 ไม่มี Search Administrator role, synonym manager, ranking console หรือ routine reindex workflow สำหรับ content staff.

---

# 14. Explicit Non-Goals

Version 1 ไม่มี:

- dedicated external search service
- custom search projection
- custom ranking engine
- synonym/thesaurus platform
- typo-correction engine
- vector/semantic search
- behavioral analytics ranking
- personalized search
- staff ranking controls
- custom reindex queue/UI

สิ่งเหล่านี้เพิ่มได้เมื่อ native search ไม่ผ่าน UAT/scale requirement ที่วัดได้.

---

# 15. Acceptance

Public Search baseline ผ่านเมื่อ:

- ค้นข้าม collection ที่กำหนดได้
- ภาษาไทยให้ผลใช้งานได้จากข้อมูลจริง
- Draft/Trash ไม่ปรากฏ
- groups/filters ทำงานตาม Sitemap
- result ไป canonical URL
- fields/snippets ไม่ leak internal data
- performance เหมาะกับข้อมูลจริง
- ไม่มี custom indexing/ranking infrastructure ที่ยังไม่จำเป็น

> **Use native search first; earn every extra search layer.**

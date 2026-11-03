# Public Search / Search & Discovery — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 08-search
> **Status:** CLEAN REBASELINE v2.5 — CURRENT native-first V1
> **Version:** 2.5
> **Last Updated:** 3 พฤศจิกายน 2569 (2026-11-03): Feature 004, ITA in V1
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`, `04-homepage.md`, `05-admin-cms.md`, `06-roles-permissions.md`, `07-publishing-workflow.md`
> **Purpose:** กำหนด Public Search ที่ใช้ง่ายสำหรับประชาชนโดยใช้ search capability ของ CMS/database ก่อน และไม่สร้าง search platform แยก


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers unavailable Q3/Q4 enforcement from
> V1. Ordinary native content/Document/Media, publication, permissions and supported validation
> remain on EmDash 1.1.0. The reduced V1 scope is reflected in the reviewed Feature 002 Plan;
> deferral is not implementation or PASS. No upstream change, new subsystem or production action
> is authorized. The same decision deferred structured ITA; Feature 004 brought ITA into V1
> (below).

> **Feature 003 finding and decision (Product Owner, 2026-10-29):** EmDash 1.1.0 native full-text
> search runs only on SQLite. `enableSearch` refuses PostgreSQL. Songhealth keeps PostgreSQL, and
> `/search` reads the published entries of the searchable collections through EmDash's public
> query API when a search is made (`docs/adr/0002`). The requirements below are unchanged.

> **Feature 004 decisions (Product Owner, 2026-11-02 and 2026-11-03; spec #121, #125 comment
> 6591248342):** published MOITs are searchable by their title, summary and Evidence labels, under
> "ITA", the last group (§2, §5–§8).

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
- MOIT (ITA)

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

MOIT ค้นด้วย title, summary และ "ชื่อหลักฐาน" ของ Evidence ทุกชิ้น (file และ link blocks ตามที่หน้า MOIT แสดง) โดย "ชื่อหลักฐาน" อยู่ระดับเดียวกับ body. MOIT ไม่ถูกค้นด้วย "MOIT n", ปีงบประมาณ, ถ้อยคำของ Requirement, ชื่อไฟล์ที่อัปโหลด หรือหมายเหตุ (Product Owner, 2026-11-03: #125 comment 6591248342, item 4).

---

# 6. Ranking

Version 1 ใช้ ranking ของ platform/search engine เป็น baseline พร้อม field weights/configuration เท่าที่ native capability รองรับ.

Product requirement คือผลที่ match Title/Name โดยตรงควรมีประโยชน์ต่อผู้ใช้ ไม่ใช่การ Freeze score formula.

MOIT ไม่มีวันที่ของรายการ (ผลอื่นที่อันดับเท่ากันเรียงตามวันที่ ใหม่ก่อน) จึงอยู่หลังผลที่มีวันที่ซึ่งอันดับเท่ากัน; MOIT ที่อันดับเท่ากันเรียงแบบหน้า ITA: ปีงบประมาณใหม่ก่อน แล้วตามเลข MOIT (Product Owner, 2026-11-03: #125 comment 6591248342, item 2).

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
- ITA

Group เป็น presentation/filter concept ไม่ใช่ content type ใหม่.

กลุ่ม ITA อยู่ท้ายสุด ประกอบด้วย MOIT และมีจำนวนผลกับ filter แบบเดียวกับกลุ่มอื่น. ชื่อกลุ่มที่เป็นอักษรละตินเว้นวรรคจากคำไทย เช่น "พบ 3 รายการในกลุ่ม ITA" (Product Owner, 2026-11-03: #125 comment 6591248342, item 3).

Fiscal Year filter แสดงเฉพาะเมื่อเหมาะกับ retained Document/report context; กลุ่ม ITA ไม่มี filter ปีงบประมาณ และผลของ MOIT บอกปีของตนเอง (§8).

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

ผลของ MOIT แสดง "MOIT n • ปีงบประมาณ YYYY" แทนประเภท ตามด้วยชื่อที่ลิงก์ไป `/ita/{slug}` และ snippet จาก summary หรือ "ชื่อหลักฐาน" ที่ match; ไม่แสดงวันที่ (Product Owner, 2026-11-03: #125 comment 6591248342, item 1).

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

EmDash 1.1.0 native search ใช้ได้เฉพาะ SQLite จึงไม่มี native index บน PostgreSQL ของ Songhealth. Version 1 ค้นจาก published content ผ่าน EmDash public query API ขณะมีการค้นหา (`docs/adr/0002`) โดยไม่สร้าง index ของตนเอง.

Version 1 **ไม่สร้าง custom Search Projection** หรือ synchronization pipeline.

ไม่สร้าง:

- queue สำหรับ index
- retry state machine
- reindex dashboard
- Search health admin subsystem
- duplicate canonical/search database
- database extension หรือ query ตรงต่อ internal tables ของ EmDash เพื่อการค้นหา

หากวัดได้ว่าช้าเกินไปกับข้อมูลจริง หรือ Thai search UAT ไม่ผ่าน ให้ทบทวนตาม `docs/adr/0002` ก่อนเพิ่ม search layer.

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

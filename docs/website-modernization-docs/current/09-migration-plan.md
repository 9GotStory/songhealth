# Migration Plan — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 09-migration-plan
> **Status:** CLEAN REBASELINE v2.5 — CURRENT native-first V1
> **Version:** 2.5
> **Last Updated:** 9 พฤศจิกายน 2569 (2026-11-09): Feature 005, WordPress migration
> **Depends On:** `00-website-foundation.md` through `08-search.md`
> **Purpose:** กำหนดการย้ายจาก Legacy WordPress เข้าสู่ Songhealth ใหม่ด้วย script ชั่วคราวที่เขียนผ่าน native APIs ของ CMS (`docs/adr/0008`)


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers unavailable Q3/Q4 enforcement from
> V1. Ordinary native content/Document/Media, publication, permissions and supported validation
> remain on EmDash 1.1.0. The reduced V1 scope is reflected in the reviewed Feature 002 Plan;
> deferral is not implementation or PASS. No upstream change, new subsystem or production action
> is authorized. The same decision deferred structured ITA; Feature 004 brought ITA into V1
> (below).

> **Feature 004 decision (Product Owner, 2026-11-02; spec #121):** ITA is in V1, starting with
> fiscal year 2570's 12-month Round. Feature 005, the WordPress migration, maps the legacy years
> 2567–2569 and 2570's 6-month Round into MOIT entries with Evidence blocks, and settles ANOM-001,
> ANOM-004 and ANOM-005 (§5, §12).

> **Feature 005 decision (Product Owner, 2026-11-06; spec #174, `docs/adr/0008`):** the migration
> is a temporary Songhealth script on EmDash's native APIs, not EmDash's WordPress import (§4, §16),
> and a reviewed Classification list says what each item becomes (§5). A WXR export and the zip of
> `wp-content` replace the SQL baseline as the source (§2). There is one final import after a
> content freeze, with no delta (§14), by the runbook `docs/operations/wordpress-cutover.md`. The
> later mapping decisions are on #177 comment 6719251511, #178 comment 6720200201, #179 comment
> 6721447473, #180 comment 6723350426 and #181 comments 6730311623 and 6730656278.

---

# 1. Principle

> **WordPress is the migration source, not the target model.**

> **Write through the CMS's native APIs; keep the migration code temporary.**

Migration ต้องรักษาความหมายของ content, URL continuity, useful history และ public safety โดยไม่ย้าย WordPress technical debt เข้ามา.

---

# 2. Source Evidence

แหล่งข้อมูลของการย้ายคือ export และ zip ที่ Product Owner จัดให้เมื่อ 2026-11-06 (`docs/research/legacy-site.md`):

| Source | Artifact | Integrity |
|---|---|---|
| WXR export ของเนื้อหาทั้งหมด | `WordPress.2026-11-06.xml` | SHA-256 `ded5153de20c65bf3e451883791a1ba35a5253fc2381b54a42e4419f9ea93556` |
| สำเนาโฟลเดอร์ `wp-content` | `wp-content.zip` | SHA-256 `baf43c3b40ccc0a67c26996c4ceefed811020012f4465380c5c73c9e2aee0057` |

- รายงานของ import และ verify แต่ละครั้งบันทึก digest ของ export, zip และ Classification list ที่ใช้
- ตอน cutover export และ zip ชุดใหม่แทนที่ชุดนี้ (§14)
- ไฟล์มาจาก zip เท่านั้น ไม่ดึงจากเว็บไซต์เดิม ซึ่ง TLS certificate หมดอายุเมื่อ 2026-10-31
- Export, zip, Classification list, inventory และรายงานอยู่นอก repository: export มีอีเมลของผู้เขียนและ form submission

SQL dumps, credentials และ private form submissions ไม่ commit เข้า repo.

---

# 3. Target

Target meaning มาจาก:

- `01` Information Architecture
- `02` Content Model
- `03` slug-based Sitemap
- `05–07` native-first Admin/access/publishing
- `08` native-first Search
- current `10-system-blueprint.md` technical target (without redefining Product semantics)

WordPress post type/category/status/ID ไม่เป็น authority ของ target model.

---

# 4. Import Path

Version 1 ย้ายข้อมูลด้วย script ชั่วคราวของ Songhealth ที่เขียนผ่าน native APIs ของ EmDash (`docs/adr/0008`) ไม่ใช้ WordPress import ของ EmDash: import นั้นเขียน field `content` และ `excerpt` ที่ collection ของ Songhealth ไม่มี ส่ง post type หนึ่งไปได้ collection เดียว และเติมค่า ACF ได้เฉพาะ field ที่ชื่อตรงกัน.

`scripts/migration.ts` อ่าน WXR ด้วย parser ที่ EmDash export และแปลง HTML ด้วย `@emdash-cms/gutenberg-to-portable-text`. อ่านเฉพาะ `public-new`, `post`, `directive`, `procurement`, `attachment` และ slug ของ page. มีสามคำสั่งหลัก:

- **plan** อ่าน export และ zip แล้วเขียน Classification list กับ inventory ข้าง export. ถ้ามี list ที่ตรวจแล้ว จะคงทุกการตัดสินใจและเพิ่มเฉพาะรายการใหม่พร้อมค่าเริ่มต้น
- **import** เขียนไปยัง origin เดียวด้วย API token ของ Administrator และเขียนรายงานข้าง export. ก่อนเขียนจะหยุดถ้า target slug หรือ legacy redirect มีอยู่แล้ว หรือ term ขาด. Trial ใช้ค่าเริ่มต้นกับแถว "ต้องเลือก" และลงรายงาน แต่หยุดเมื่อแถวนั้นไม่มีค่าเริ่มต้น; final run (`--final`) ปฏิเสธเมื่อยังมีแถว "ต้องเลือก"
- **verify** ตรวจ target เทียบกับ plan: จำนวนต่อ collection, redirect หนึ่ง 301 ไปหน้าที่ตอบ 200 โดยไม่มี loop, ไฟล์ที่ใช้อยู่ใน Media Library, และหน้าที่ย้ายตอบ 200

Entry ถูกสร้างแล้ว publish; term มาจาก seed ผ่าน model-update step ไม่ใช่จาก script.

ไม่เริ่มจาก raw-table copier หรือ custom importer framework.

---

# 5. Songhealth Mapping

Target collections มาจาก `seed/seed.json` ตาม `02-content-model.md`; migration ไม่เปลี่ยน collection, field หรือ block type. Model-update step เพิ่มเฉพาะ term ที่รายการที่ย้ายมาใช้ (ประเภทประกาศ จัดซื้อจัดจ้าง, รับสมัครงาน และ ประกาศทั่วไป; ประเภทเอกสาร คำสั่ง; หัวข้อ ฝุ่น PM 2.5) และลบ taxonomy ตั้งต้น Categories กับ Tags.

Classification list (`GLOSSARY.md`) ที่คนตรวจแล้วกำหนดว่าแต่ละรายการของ `public-new`, `directive` และ `procurement` เป็นอะไร และเก็บ "สรุป" ที่เจ้าหน้าที่เขียนให้ News และ Activity ของปีงบประมาณปัจจุบัน. "สรุป" มาจาก list; Activity ที่ไม่มี "สรุป" ใน list แต่มีข้อความเดิมใช้ข้อความนั้น (§5.1); รายการอื่นของปีก่อนหน้าไม่มี "สรุป".

## 5.1 ข่าวและกิจกรรม (`public-new`)

ค่าเริ่มต้น: หมวดกิจกรรมเป็น Activity; หมวดประชาสัมพันธ์ มีหรือไม่มี PM 2.5 เป็น News; รายการที่ไม่มีหมวดเป็น News (ANOM-002). แถวหมวดกิจกรรมที่ชื่อมีคำว่า เชิญชวน, ขอเชิญ หรือ ประชาสัมพันธ์ เริ่มเป็น "ต้องเลือก": คำเหล่านี้ชี้แถวให้ผู้ตรวจเท่านั้น และคนเป็นผู้ตัดสิน (§17).

- **ทั้งสองแบบ:** คง slug เดิม (`news-N`); `publishedAt` เป็นวันเผยแพร่เดิม
- **Activity:** ภาพเด่น (One Page) เป็น "ภาพประกอบ"; ภาพ ACF อื่นเข้า "แกลเลอรีภาพ" ตามลำดับพร้อมคำบรรยายจาก export; วัน/เวลาจัดกิจกรรมเว้นว่าง เพราะวันโพสต์ไม่ใช่วันจัด (ANOM-003) รายการจึงเรียงตามวันเผยแพร่; ข้อความ ซึ่งมีได้เฉพาะรายการที่ย้ายจาก News เข้า "สรุป" พร้อมการขึ้นบรรทัด แต่ถ้า list มี "สรุป" อยู่แล้วใช้ของ list และลงรายงาน
- **News:** ภาพเด่นเป็น "ภาพประกอบ"; HTML ใน ACF editor เป็น "เนื้อหา" ตามด้วยภาพ ACF อื่นตามลำดับ; รายการที่หมวดหรือชื่อระบุ PM 2.5 ได้หัวข้อ "ฝุ่น PM 2.5" จึงแสดงใต้ข่าวสุขภาพ
- ภาพที่เป็นภาพเด่นของรายการอื่นไม่แสดงในหน้านี้ และลงรายงาน; สิ่งอื่น เช่น embed หรือลิงก์ไฟล์ ลงรายงาน

## 5.2 ประกาศและคำสั่ง (`directive`, `procurement`)

- **Announcement:** `procurement` ทุกรายการ และ `directive` หมวด "ประกาศ": "วันที่ประกาศ" เป็นวันเผยแพร่เดิม; "วันที่เริ่มต้น" และ "วันที่สิ้นสุด" เว้นว่าง; ภาพ ACF ของ directive อยู่ใน "รายละเอียด"; หนึ่ง Document ต่อหนึ่งไฟล์ อ้างจาก Announcement. ประเภทมาจาก list: procurement เริ่มที่ จัดซื้อจัดจ้าง; directive เริ่มที่ รับสมัครงาน เมื่อชื่อมีคำว่า รับสมัคร, สรรหา หรือ ลูกจ้าง และ ประกาศทั่วไป ในกรณีอื่น
- **คำสั่ง:** `directive` หมวด "คำสั่ง" เป็น Document ประเภท คำสั่ง
- **Document ที่สร้างจากไฟล์:** ชื่อคือชื่อเรื่อง ตามด้วย " – " และ label ของไฟล์เมื่อรายการมีหลายไฟล์ และใช้ชื่อเรื่องอย่างเดียวเมื่อไม่มี label; วันที่เป็นวันเผยแพร่เดิม; ปีงบประมาณคำนวณจากวันนั้น (ตุลาคมถึงกันยายน); เจ้าของและแหล่งที่มาเว้นว่าง; คงชื่อไฟล์ที่อัปโหลด; มีประเภทเฉพาะคำสั่ง
- **Slug:** Announcement คง slug เดิม; Document ใช้ slug เดียวกัน เติมเลขตั้งแต่ไฟล์ที่สอง
- ภาพเด่นของ directive และ procurement ไม่ถูกย้าย เพราะ Announcement และ Document ไม่มีช่องภาพ และรายงานระบุทุกรายการ

## 5.3 ITA (`post`)

หนึ่ง MOIT ต่อหนึ่ง post (`02` §18) สำหรับปีงบประมาณ 2567–2569 และรอบ 6 เดือนของปี 2570 ที่มีใน export สุดท้าย:

- ปีงบประมาณมาจาก tag ปี เลข MOIT จาก tag `moit-N`; ชื่อคือชื่อ post โดยตัดคำนำ "MOIT n"; `updated_on` คือวันแก้ไขล่าสุดของ post; `publishedAt` คือวันเผยแพร่
- **Slug:** คง `moit-{n}-{year}`; `moit-4-2567-2` เป็น `moit-5-2567` และ slug ภาษาไทยของ MOIT 16 ปี 2569 เป็น `moit-16-2569` โดยที่อยู่เดิมทั้งสอง redirect ตรงไปที่อยู่ใหม่
- **Evidence blocks** ตามลำดับเนื้อหาของ post:
  - ข้อและข้อย่อย เช่น "1.1" เป็น block "ข้อกำหนด"
  - ลิงก์ไปไฟล์ที่อัปโหลดเป็น "หลักฐาน: ไฟล์" ชื่อตามข้อความลิงก์
  - ลิงก์ไปหน้าในเว็บไซต์เป็น "หลักฐาน: ลิงก์" แบบข้อมูลปัจจุบัน ชี้ที่อยู่ใหม่ (ANOM-004); ลิงก์ภายนอกเป็น "หลักฐาน: ลิงก์"
  - ลิงก์ Facebook ว่างของปี 2567 และลิงก์ tag ตัดออก
  - หัวข้อ "ไตรมาสที่ N" ของ 2568 MOIT 4 และ "6 เดือน" กับ "12 เดือน" ของ 2568 MOIT 2 เป็นหมายเหตุของไฟล์ใต้หัวข้อนั้น; บรรทัดและภาพอื่นที่ไม่มี block รองรับอยู่ในรายงาน
- **Round:** "ไม่ระบุรอบ" สำหรับ 2567–2569 และ "รอบ 6 เดือน" สำหรับ 2570
- **แก้ defect ตอน import** (`docs/research/legacy-ita.md`): ลิงก์ที่ไม่มี `/wp-content` ชี้ไฟล์ของมัน (defect 3); ข้อ 1.4–1.6 ของ 2569 MOIT 5 อ่านเป็นปี 2569 แทน 2568 (defect 4); ข้อความลิงก์ ")" ใช้ถ้อยคำของข้อย่อย (defect 5). ไฟล์ปี 2568 สองไฟล์ของ 2569 MOIT 2 คงไว้ตามที่ส่งและลงรายงาน (defect 12)
- ไฟล์ที่ใช้หลายปีเป็น media item เดียว

## 5.4 สิ่งที่ไม่ย้าย

Page ทั้งหมด (เจ้าหน้าที่กรอกเนื้อหาจากแหล่งที่เชื่อถือได้ §12), drafts, users และ passwords, bylines, comments, menus, widgets, popups, sliders, Elementor templates, Yoast SEO, ACF definitions, form submission และ attachment ที่ไม่มีรายการใช้.

---

# 6. Status Mapping

Script ย้ายเฉพาะรายการที่มีสถานะ `publish`. รายการสถานะอื่น เช่น draft ไม่ถูกย้าย: runbook หยุด cutover ที่ขั้นตรวจ inventory จนกว่าเจ้าหน้าที่จะเผยแพร่หรือลบรายการนั้นระหว่าง freeze.

Migration ต้องไม่ reconstruct custom Approval/Module Scope workflow เพราะ Version 1 target ไม่มีระบบเหล่านั้น.

---

# 7. Identity and URLs

Target uses:

- CMS-generated stable internal content ID
- slug-based canonical public URL ตาม `03`

Legacy WordPress ID ใช้ได้ชั่วคราวเพื่อ trace/mapping แต่ไม่กลายเป็น Songhealth Public ID.

Source slug คงไว้เมื่อ unique (§5). หาก slug เปลี่ยน ให้สร้าง explicit redirect old → new.

WordPress URL แบ่งเป็น (ปลายทางอยู่ใน §11):

- **redirect ไป canonical URL ใหม่:** ทุกรายการที่ย้าย
- **redirect ไป successor ที่มีความหมาย:** page ที่มีที่อยู่ใหม่
- **ไม่ redirect:** ที่อยู่ไฟล์โดยตรง, archive, feed, attachment page และลิงก์ `?p=`

ห้าม redirect ทุก URL ไป homepage: มีเพียง `/home/` ที่ไปหน้าแรก.

---

# 8. Media

Script อัปโหลดไฟล์ผ่าน native Media API พร้อม alt text และคำบรรยายจาก export. ไฟล์ที่ content hash ตรงกับ item ที่มีอยู่ใช้ item เดิม.

**ขอบเขต:** เฉพาะไฟล์ที่รายการที่ย้ายใช้. Export ของ 2026-11-06 ใช้ 1,001 ไฟล์ รวมไฟล์ของ ANOM-001 (1,000 เมื่อไม่มีไฟล์นั้น) เป็น 957 media item เพราะ 44 ไฟล์มีเนื้อหาซ้ำกับไฟล์อื่น (`docs/evidence/184-trial-import.md`).

**ไม่นำเข้า:** attachment ที่ไม่มีรายการใช้และโฟลเดอร์ของ plugin (ANOM-008), ภาพเด่นของ directive และ procurement (§5.2), และ resized copies ของ WordPress.

**Media Library folders:**

| Folder | เก็บ |
|---|---|
| "ITA 2567", "ITA 2568", "ITA 2569" และ "ITA 2570" เมื่อ export มี post ของปีนั้น | ไฟล์ของแต่ละปี |
| "ITA ใช้ทุกปี" | เอกสารที่ลิงก์จากมากกว่าหนึ่งปีงบประมาณ ตัดสินจากเนื้อหาของไฟล์ |
| "เว็บไซต์เดิม: ข่าวและกิจกรรม" | ไฟล์ของข่าวและกิจกรรม รวมไฟล์ที่ใช้ร่วมกับประกาศ |
| "เว็บไซต์เดิม: ประกาศและเอกสาร" | ไฟล์อื่นของประกาศและคำสั่ง |

CMS media is public-publishable website storage; confidential legacy filesต้องไม่ถูกนำเข้าโดยอัตโนมัติ. Staff guidance อยู่ใน `05` §5.2.

---

# 9. Authors and Users

Presentation attributionกับ CMS loginเป็นคนละเรื่อง.

- ไม่ย้าย authors และ bylines
- Entry ที่ย้ายมาเป็นของ Administrator เจ้าของ API token ที่รัน import (`05` §5.2)
- ไม่ copy WordPress users, password hashes, roles และ sessions
- target accessใช้ native CMS RBAC ตาม `06`; exact mappingอยู่ใน `10`

---

# 10. Search

ไม่ migrate legacy WordPress search index.

หลัง import ให้ native target search index/rebuildทำงานจาก target collections/fields.

Search verificationใช้ representative Thai queriesตาม `08`.

---

# 11. Redirects and 404

ใช้ native redirects (301) และ 404 log ของ EmDash. ไม่สร้าง custom redirect registry.

**Redirect ที่ import สร้าง** ซึ่ง export ของ 2026-11-06 ได้ 490 รายการ:

| ที่อยู่เดิม | ปลายทาง |
|---|---|
| `/public-new/news-N/` | `/news/news-N` หรือ `/activities/news-N` |
| `/directive/directive-N/`, `/procurement/procurement-N/` | Announcement หรือ Document ของคำสั่ง |
| `/moit-N-25xx/` รวมสองที่อยู่ที่เปลี่ยน slug (§5.3) | `/ita/moit-N-25xx` |
| `/ita-2567/`, `/ita-2568/`, `/ita-2569/` และ `/ita-2570/` เมื่อ export มี post ของปีนั้น | `/ita/{year}` |
| `/ethics/` | `/ita/2569` |
| `/public-news/` | `/activities` |
| `/directives/`, `/procurements/` | `/announcements` |
| `/home/` | `/` |
| `/history/`, `/role/` | `/about/organization` |
| `/office-policy/` | `/about/policies` |
| `/officer/` | `/about/personnel` |
| `/sub-district-health-promoting-hospital/` | `/health-services` |

- หนึ่ง entry ครอบคลุมทั้งแบบมีและไม่มี slash ท้าย
- หนึ่ง hop ไม่มี chain และไม่มี catch-all ไปหน้าแรก
- Page ที่เผยแพร่อยู่แต่ไม่มีที่อยู่ใหม่ไม่มี redirect และรายงาน import ระบุ "no new address: it will answer 404"

**ไม่ redirect:**

- ที่อยู่ไฟล์โดยตรงใต้ `/wp-content/uploads/` ตอบ 404: redirect ของ EmDash 1.1.0 ข้าม path ที่ลงท้ายด้วยนามสกุลไฟล์และไม่ลง 404 log (`docs/agents/emdash-1.1.0.md`, `docs/adr/0008`). ผู้ที่มาผ่าน redirect ของรายการ หน้า หรือ MOIT ยังถึงไฟล์ได้
- archive ของ category, tag และวันที่, feed และ attachment page ตอบ 404 และลง 404 log
- `/?p=…` และ `/?attachment_id=…` แสดงหน้าแรกที่ 200 พร้อม canonical `/` จึงไม่เข้า 404 log

**ลิงก์ในเนื้อหาที่ย้าย:** ลิงก์ไปรายการที่ย้ายชี้ที่อยู่ใหม่ของรายการ; ลิงก์ไปไฟล์ที่ย้ายชี้ media URL ของไฟล์ รวมถึงไฟล์ของ Document; ลิงก์อื่นคงตามเดิม รวมถึงลิงก์ไป page เดิมซึ่ง redirect รองรับอยู่.

ก่อน cutover `verify` ตรวจ one-hop redirect, no loop และปลายทางตอบ 200. หลัง launch ใช้ 404 logหา missing mappings.

---

# 12. Known Evidence Exceptions

Disposition ของแต่ละรายการ:

- **ANOM-001 HIGH:** ITA 2567/MOIT-2 attachment 1479 binary missing. Zip เก็บไฟล์นี้ใต้ชื่อที่ถูกตัดที่ 255 bytes; สำเนาที่วางข้าง export ชื่อ `anom-001.pdf` เป็นไฟล์ของ MOIT นี้. สำนักงานต้องยืนยันก่อน final import ว่า PDF นี้คือเอกสารที่ถูกต้อง เพราะ label เดิมระบุสี่เอกสารแต่ PDF มีเฉพาะยุทธศาสตร์ชาติ. ถ้าไม่มีไฟล์นี้ MOIT ลิงก์ไป `ANOM_001_SOURCE` ซึ่งยังไม่มีผู้ยืนยัน และรายงาน import ระบุไว้
- **ANOM-002 LOW:** 2 PM2.5 public-new records missing taxonomy (`news-94`, `news-96`). เป็น News ที่มีหัวข้อ "ฝุ่น PM 2.5"
- **ANOM-003 MEDIUM:** Activity semantic event date differs from `post_date`. วัน/เวลาจัดกิจกรรมเว้นว่าง รายการเรียงตามวันเผยแพร่
- **ANOM-004 / MODEL-GAP-001 MEDIUM:** 5 internal ITA link references / 3 destinations. เป็น "หลักฐาน: ลิงก์" แบบข้อมูลปัจจุบัน: `/officer/` → `/about/personnel`, `/public-news/` → `/activities` และข่าวใน 2569 MOIT 20 → หน้าข่าวที่ย้ายมา
- **ANOM-005 MEDIUM:** Ethics fiscal-year label/link mismatch. หน้า Ethics ซ้ำกับ MOIT 15 และ 16 จึงไม่ import; `/ethics/` → `/ita/2569`
- **ANOM-006 HIGH:** 17 Health Services require authoritative verification; 3 lack phone. เจ้าหน้าที่กรอก Health Services จากแหล่งที่เชื่อถือได้ก่อน cutover (runbook)
- **ANOM-007 MEDIUM:** Personnel Position/Role/Assignment/Unit semantics require verification. เจ้าหน้าที่กรอก Personnel จากแหล่งที่เชื่อถือได้ก่อน cutover (runbook)
- **ANOM-008 LOW:** unreferenced attachments (113 ใน export ของ 2026-11-06). ไม่นำเข้า พร้อมโฟลเดอร์ของ plugin (§8)

ระดับความเสี่ยงเดิมเป็น migration evidence; การแก้แต่ละรายการต้องไม่ขยาย Product modelโดยเงียบ ๆ.

---

# 13. Trial Migration

Trial ทำบน development runtime เท่านั้น ระหว่าง backup กับ restore ของมัน และทำซ้ำได้เมื่อ script เปลี่ยน โดยไม่แตะ production:

1. backup database และ media
2. ลบ demo dataset
3. `import` แบบ trial
4. `verify` และวัด latency ของ search ที่ปริมาณจริง (`docs/adr/0002`)
5. Product Owner walkthrough
6. restore ซึ่งนำ demo dataset กลับมา

ขั้นตอนของ runtime คือ "A window" ใน `docs/operations/development-quadlet.md`; trial ที่ผ่านแล้วบันทึกใน `docs/evidence/184-trial-import.md`.

ตรวจ:

- counts by mapped collection
- ทุกรายการเผยแพร่ด้วยวันที่เดิมและเป็นของ Administrator
- representative rich content
- media completeness
- references/relations
- Thai text
- canonical URLs
- redirects
- search
- anomalies above

---

# 14. Cutover

Import ขั้นสุดท้ายมีครั้งเดียว หลัง content freeze และไม่มี delta:

- กำหนด content-freeze window ก่อน export ชุดสุดท้าย
- export และ zip ชุดใหม่; `plan` รวมกับ list ที่ตรวจแล้ว; ตรวจแถวใหม่จนไม่เหลือ "ต้องเลือก"
- `import --final` เข้า production หนึ่งครั้ง ซึ่งหยุดเมื่อ slug มีอยู่แล้วแทนการเขียนทับ
- reconcile source → target ด้วย `verify`
- ตั้ง Featured แล้ว switch canonical traffic ด้วย DNS
- retain source rollback window

Production track ทำตาม runbook `docs/operations/wordpress-cutover.md` ซึ่งระบุทุกขั้นตอน คำสั่ง และผู้ทำ.

ไม่สร้าง permanent dual-write/sync ระหว่าง legacy WordPress กับ target CMS.

---

# 15. Rollback

ก่อน production cutoverต้องมี:

- restorable source backup
- restorable target database backup
- target media backup
- DNS/proxy rollback procedure
- record of final redirect/import configuration

Rollback ไม่ต้องเป็น distributed transaction; ต้องเป็น practical operational recovery.

---

# 16. Custom Migration Code Boundary

WordPress import ของ EmDash ไม่ถูกใช้กับเว็บไซต์นี้: ทุกกลุ่มเนื้อหาของเว็บไซต์เดิมเข้าเงื่อนไขอย่างน้อยหนึ่งข้อต่อไปนี้ (`docs/adr/0008`):

- source dataต้อง split/merge into multiple target collections
- plugin/ACF structureต้อง transform
- ITA posts ที่ต้องแตก Evidence เป็น MOIT blocks (§5.3)
- legacy date/statusต้อง deriveจาก evidenceอื่น

Migration codeเป็น temporary tooling ใน `scripts/` ไม่ใช่ permanent application layer: script และ test ของมันออกจาก repository เมื่อ WordPress ถูก retire (§18).

---

# 17. Explicit Non-Goals

Migration Version 1 ไม่สร้าง:

- raw WordPress table clone
- permanent WordPress integration
- custom generic importer framework
- custom identity registry
- custom search importer
- custom media DAM migration platform
- custom redirect service
- WordPress user/password migration
- AI/ML classification

---

# 18. Execution Gates

```text
Documentation baseline             = CURRENT
Trial import (development runtime) = AUTHORIZED (spec #174, #174 comment 6685455009)
Production import                  = NOT AUTHORIZED
Final cutover                      = NOT AUTHORIZED
WordPress retirement               = NOT AUTHORIZED
```

Production track ขอ authorization แยก และทำตาม `docs/operations/wordpress-cutover.md`.

---

# 19. Acceptance

Migration Plan ผ่านเมื่อ:

- การย้ายเขียนผ่าน native APIs ด้วย script ชั่วคราวตาม `docs/adr/0008`
- custom code จำกัดอยู่ที่ script ชั่วคราว และถูกลบเมื่อ WordPress ถูก retire
- known anomalies มี disposition (§12)
- slug/redirect architectureตรง `03`
- no custom Role/Approval/Search/Public-ID systemsถูก migrateเข้ามา
- rollback/backup requirementsชัดเจน

> **Migrate content meaning, not old architecture.**

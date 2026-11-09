# Admin CMS — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 05-admin-cms
> **Status:** CLEAN REBASELINE v2.8 — CURRENT native-only publication
> **Version:** 2.8
> **Last Updated:** 9 พฤศจิกายน 2569 (2026-11-09): Feature 005, WordPress migration
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`, `04-homepage.md`
> **Purpose:** กำหนดความต้องการของ Admin CMS ที่จำเป็นต่อการดูแล Songhealth โดยใช้ความสามารถมาตรฐานของ CMS ก่อน และสร้างส่วนขยายเฉพาะเมื่อมี gap ที่พิสูจน์แล้ว


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers unavailable Q3/Q4 enforcement from
> V1. Ordinary native content/Document/Media, publication, permissions and supported validation
> remain on EmDash 1.1.0. The reduced V1 scope is reflected in the reviewed Feature 002 Plan;
> deferral is not implementation or PASS. No upstream change, new subsystem or production action
> is authorized. The same decision deferred structured ITA; Feature 004 brought ITA into V1
> (below).

> **Prior native Q1 decision (save-time requiredness retained; publication hook superseded):** Product Owner comment `01a13788-95c6-72f5-8787-f86b4e0c5fd6` adopts EmDash 1.1.0
> save-time requiredness for genuinely mandatory native references. Missing such a reference need
> not be saveable as a draft. Other incomplete drafts follow native field validation. Optional/
> conditional relationships are not automatic publication gates where native enforcement lacks
> adequate data. D-REF remains deferred (spec #121 supersedes D-ITA); no custom reference adapter
> or internal-table access.

> **Current V1 simplification (Product Owner, 2026-10-14):** Songhealth uses native EmDash
> field/type/required-reference/cardinality checks at save and native RBAC/lifecycle at
> Publish/Schedule. No Songhealth-specific publication validation hook, editorial review,
> approval queue or confirmation step. Incomplete optional content may publish under
> native permissions; editorial completeness is the publisher's responsibility.
> D-REF remains deferred (spec #121 supersedes D-ITA); this decision is not runtime acceptance.

> **Feature 004 decision (Product Owner, 2026-11-02; spec #121, `docs/adr/0006`):** staff maintain
> ITA in V1 as MOIT entries in the Admin group "ITA", with the native roles and workflow, the
> new-year checklist and the precautions of §7. At least two staff are trained on them. The
> checks in §7.1 steps 1, 3 and 8 come from the Admin walkthrough, where the slug,
> "ปรับปรุงล่าสุด" and a Requirement were missed (Product Owner, 2026-11-03, #128 comment
> 6605066482).

> **Feature 006 decision (Product Owner, 2026-11-04; spec #144):** every News and Activity states
> its story in words, at least its Summary; a One Page is the record's picture, not its text
> (grill Q14). Photo sets go on an Activity, and a gallery in a News body is edited in the Admin
> (§5.1). A News body is optional (Product Owner, 2026-11-05: #149 comment 6653400419 item 2).

> **Admin sidebar decision (Product Owner, 2026-11-06; #169 comment 6672831124):** the Admin
> sidebar puts the collections in folders by the website's domains, ordered by how often staff
> use them, each with an icon (§2). Categories and Tags waited for Feature 005 (below).

> **Feature 005 decision (Product Owner, 2026-11-06; spec #174):** Categories and Tags are deleted
> from the model (§2). An Editor creates a term only after checking the existing ones and when
> several items will share it, and reviews the terms each fiscal year (§3.1). Migrated items and
> files follow §5.2.

---

# 1. Principle

> **Use the CMS, do not rebuild the CMS.**

Admin CMS ต้องช่วยให้เจ้าหน้าที่จัดการ Structured Content ตาม `02-content-model.md` ได้โดยไม่ต้องเข้าใจ database, API หรือ internal architecture.

Version 1 ใช้ Admin ของ CMS ที่เลือกเป็น primary staff interface. ไม่สร้าง Admin SPA หรือ dashboard framework แยกอีกชุดเพียงเพื่อเปลี่ยนหน้าตาหรือ terminology.

การปรับให้เหมาะกับ Songhealth ใช้ลำดับ:

1. collection/field labels และ grouping
2. built-in configuration
3. built-in permissions/workflow
4. plugin/hook/widget ขนาดเล็กเมื่อมี requirement จริง
5. custom Admin page เฉพาะเมื่อ native editor ไม่สามารถรองรับงานสำคัญได้อย่างสมเหตุสมผล

---

# 2. Admin Information Structure

Admin ควรสะท้อน Content Model และงานของเจ้าหน้าที่ เช่น:

- ข่าวประชาสัมพันธ์
- กิจกรรม
- ประกาศ
- ความรู้สุขภาพ
- รายงานสุขภาพ
- บริการประชาชน
- หน่วยบริการสุขภาพ
- เอกสาร
- บุคลากร / องค์กร
- ITA: MOIT (§7)
- Homepage curation
- Media
- Users / Settings เฉพาะผู้มีสิทธิ์

ใช้ collection grouping ของ CMS ก่อนสร้าง custom navigation. Sidebar ของ Admin จัด collection
เป็นโฟลเดอร์ตามหมวดข้อมูลของเว็บไซต์ (`01` §2) และเรียงตามความถี่ที่เจ้าหน้าที่ใช้ (#169):

| โฟลเดอร์ | Collection ตามลำดับ |
| --- | --- |
| ข่าวสาร | ข่าว, กิจกรรม, ประกาศ |
| ข้อมูลสุขภาพ | ความรู้สุขภาพ, รายงานสุขภาพ |
| บริการประชาชน | บริการ, หน่วยบริการสุขภาพ |
| (ไม่มีโฟลเดอร์) | เอกสาร |
| เกี่ยวกับเรา | ข้อมูลทั่วไป, บุคลากร |
| ITA | MOIT (§7) |

ตามด้วย "มีเดีย". โฟลเดอร์แสดงไอคอนของ collection แรกในโฟลเดอร์ และรายการในโฟลเดอร์ไม่มีไอคอน;
ไอคอนของแต่ละ collection แสดงที่ "เอกสาร" ซึ่งไม่อยู่ในโฟลเดอร์, ใน command palette และใน Calendar.

- โฟลเดอร์ที่เจ้าหน้าที่ยังไม่เคยกดเปิดหรือปิดจะเปิดเองเมื่ออยู่ในหน้าที่อยู่ข้างใน; เมื่อกดแล้ว
  browser นั้นจำว่าเปิดหรือปิดไว้
- Editor และ Administrator เห็น taxonomy ที่ใช้กับ collection ของโฟลเดอร์เดียวไว้ในโฟลเดอร์นั้น
  ต่อจาก collection: "ประเภทประกาศ" และ "หมวดข่าว" ใน "ข่าวสาร", "ประเภทรายงาน" ใน "ข้อมูลสุขภาพ",
  "ประเภทหน่วยบริการ" และ "หมวดบริการ" ใน "บริการประชาชน"
- ส่วน "จัดการ" (Editor ขึ้นไป; "การเปลี่ยนเส้นทาง" เฉพาะ Administrator) มี taxonomy ที่ใช้ข้ามโฟลเดอร์
  ("หัวข้อ", "พื้นที่", "กลุ่มเป้าหมาย") และ "ประเภทเอกสาร". "Categories" และ "Tags" ซึ่งเป็น
  taxonomy ตั้งต้นของ CMS ถูกลบด้วย model-update step และไม่ใช้ใน Songhealth. Homepage curation อยู่ที่
  "จัดการ → เมนู" ในเมนูของ seed ที่ชื่อขึ้นต้นด้วย "หน้าแรก:" (#65 comment 6538358352)
- Author และ Contributor เห็นแดชบอร์ด, Calendar, collection ทุกโฟลเดอร์ และมีเดีย; ไม่เห็น taxonomy
  และส่วน "จัดการ". ส่วน "ผู้ดูแลระบบ" (เช่น ประเภทเนื้อหา ผู้ใช้ และตั้งค่า) เห็นเฉพาะ Administrator
- ปุ่มลัดใน Dashboard เรียงตามลำดับเดียวกัน; รายการ collection ใน Dashboard เรียงตาม slug
- โครงนี้มาจาก `seed/seed.json` และมีผลกับฐานข้อมูลที่มีอยู่เมื่อรัน model-update step: เปลี่ยนโครงที่
  seed. "Group" หรือ "Icon" ที่แก้ในส่วน "การนำทาง" ของหน้าแก้ไขประเภทเนื้อหา และลำดับที่ลากในรายการ
  "ประเภทเนื้อหา" (Administrator) ถูกตั้งกลับเป็นของ seed ใน model update ครั้งถัดไป; "Hide from
  navigation" และ "Quick action on the dashboard" ไม่ถูกตั้งกลับ

Dashboard analytical data ภายใต้ `/dashboard` ไม่ใช่ CMS content-management module.

---

# 3. Content Editor Baseline

สำหรับ content collection ที่เกี่ยวข้อง CMS ต้องรองรับตามความเหมาะสม:

- create/edit content
- autosave หรือ draft recovery
- explicit Save
- preview
- revision history เมื่อ collection นั้นต้องการ
- published content ที่แก้ไขได้โดยไม่ทำให้ draft change ออกสู่ public ทันที
- one-time scheduling
- slug management
- taxonomy / relation selectors
- media picker
- only native field/type/required-reference/cardinality validation and native RBAC at Publish/Schedule; no Songhealth completeness hook or article confirmation; see Feature 002 native-only matrix
- conflict/edit-lock protection ตาม platform capability

Songhealth ไม่สร้าง editor, revision engine, preview system, autosave engine หรือ scheduling UI ของตนเองหาก CMS มี capability เหล่านี้อยู่แล้ว.

## 3.1 การสร้างและดูแล term

- Editor และ Administrator สร้าง term ได้ในแผง "Taxonomies" ("อนุกรมวิธาน" ใน Admin ภาษาไทย) ของหน้าแก้ไขรายการ หรือในหน้าของ taxonomy นั้น; Author และ Contributor เลือกได้เฉพาะ term ที่มีอยู่ (`docs/agents/emdash-1.1.0.md` "Admin input")
- สร้าง term ใหม่เมื่อตรวจ term ที่มีอยู่แล้วว่าไม่มีคำที่มีความหมายเดียวกัน และจะมีหลายรายการใช้ร่วมกัน (`01` §11, `02` §21)
- ทุกปีงบประมาณ Editor รวม term ที่ซ้ำกันและลบ term ที่ไม่มีรายการใช้. Admin ไม่มีคำสั่งรวม term: เปลี่ยนรายการให้ใช้ term ที่เก็บไว้ก่อน แล้วจึงลบ term ที่ซ้ำ
- ตัวเลขในหน้าของ taxonomy นับเฉพาะรายการที่เผยแพร่อยู่และไม่อยู่ในถังขยะ: term ที่แสดง 0 อาจยังมี draft ใช้อยู่ และการลบ term จะเอา term นั้นออกจากทุกรายการที่ใช้ รวมถึง draft. Term ที่มี term ย่อยลบไม่ได้จนกว่าจะลบ term ย่อยก่อน
- ตัวกรองของ `/documents`, `/health/content`, `/news/health` และ `/services` แสดง term เมื่อมีรายการที่เผยแพร่ของรายการนั้นใช้อย่างน้อยหนึ่งรายการ: term ที่เพิ่งสร้าง หรือ term ที่รายการทั้งหมดเป็น draft, ยกเลิกการเผยแพร่ หรืออยู่ในถังขยะ จึงไม่แสดงในตัวกรอง และไม่ใช่ข้อผิดพลาด
- ตัวกรองเรียง term ตามชื่อในลำดับภาษาไทย การจัดลำดับ term ในหน้าของ taxonomy ไม่เปลี่ยนลำดับในตัวกรอง

---

# 4. Lists, Search and Bulk Actions

ใช้ native collection lists เป็น baseline โดยควรรองรับ:

- search
- filtering
- pagination
- publishing state
- author/owner เมื่อมี
- date
- locale เมื่อเปิด multilingual
- Trash/restore
- bulk operations ที่ platform รองรับอย่างปลอดภัย

ไม่สร้าง saved-view system, custom query language, configurable columns, workflow inbox หรือ list-management framework ใน Version 1 เว้นแต่ UAT พิสูจน์ว่าจำเป็น.

---

# 5. Media

ใช้ native Media Library เป็น baseline สำหรับ:

- upload
- search/filter
- metadata
- image/file selection
- native replace/delete with explicit platform limitations; no required-published-reference veto or immutable-history claim
- media usage/reference information เมื่อ platform รองรับ

Songhealth ไม่สร้าง DAM, folder hierarchy ของตนเอง, image editor, check-in/check-out หรือ custom media-usage database ใน Version 1. โฟลเดอร์ของ Media Library เป็น capability ของ CMS และใช้ตาม §5.2.

Native usage reporting may be incomplete/stale and is not a deletion lock. Authorized native
media removal can break consumers; in-place image replacement can change shared bytes without an
ITA publication. Staff precautions do not enforce historical retention or cross-record safety.

CMS นี้ใช้สำหรับ **public-publishable website assets**. ห้ามใช้เป็นที่เก็บไฟล์ลับ ข้อมูลผู้ป่วย หรือเอกสารภายในที่ต้องการ confidential access control โดยไม่มี requirement และ security design แยกต่างหาก.

## 5.1 Pictures, Summaries and photo sets of News, Activities and Health Content

ข่าว กิจกรรม และความรู้สุขภาพแสดงภาพและเรื่องตาม `docs/design/DESIGN.md` §7.3 และ §9 (spec #144). เจ้าหน้าที่เตรียมแต่ละเรื่องดังนี้:

- ข่าวและกิจกรรมทุกเรื่อง (รายการที่ย้ายมาจากเว็บไซต์เดิมดู §5.2) เล่าเรื่องเป็นข้อความ อย่างน้อยใน "สรุป" หนึ่งถึงสองประโยค. ภาพ One Page (`GLOSSARY.md`) เป็นภาพของเรื่อง ไม่ใช่ข้อความของเรื่อง: ข้อความที่อยู่ในภาพ screen reader อ่านไม่ได้และค้นหาไม่พบ (`00` §3.5; WCAG 2.2 SC 1.1.1 และ 1.4.5). หน้าข่าว กิจกรรม และความรู้สุขภาพแสดง "สรุป" ใต้ชื่อเรื่อง ตามบรรทัดที่พิมพ์ไว้
- "เนื้อหา" ของข่าวจะเพิ่มหรือไม่ก็ได้
- ภาพ One Page ใส่ใน "ภาพประกอบ"; เรื่องที่ไม่มี One Page ใช้ภาพถ่ายหนึ่งภาพแทน. ภาพแบนเนอร์แนวนอนแบบที่เว็บไซต์เดิมใช้ก็ต้องมี "สรุป" เช่นกัน
- หน้าเรื่องแสดง "ภาพประกอบ" ทั้งภาพ พร้อมลิงก์ "เปิดภาพขนาดเต็ม" ไปยังไฟล์ที่อัปโหลด และเรื่องเด่นบนหน้าแรกก็แสดงทั้งภาพ. การ์ดแสดงกลางภาพ: การ์ดกิจกรรม (ในรายการและบนหน้าแรก) 16:9 และการ์ดข่าวและความรู้สุขภาพในรายการ 16:10
- ชุดภาพถ่ายใส่ใน "แกลเลอรีภาพ" ของกิจกรรม แต่ละรายการมี "ภาพ" และ "คำบรรยายภาพ". หน้ากิจกรรมแสดงเป็นรูปย่อสี่เหลี่ยมใต้หัวข้อ "ภาพกิจกรรม": 8 ภาพแรก แล้วภาพที่เหลืออยู่ใต้ปุ่ม "ดูรูปทั้งหมด (N รูป)". คำบรรยายแสดงใต้รูปย่อไม่เกินสองบรรทัด และ screen reader อ่านครบ
- ใส่ alt text ของแต่ละภาพใน Media Library (ช่อง "Alt Text" หรือ "ข้อความ Alt" ใน Admin ภาษาไทย) ก่อนเลือกภาพในช่อง: alt text อธิบาย "ภาพประกอบ" บนหน้าเรื่อง และเป็นชื่อของลิงก์ของรูปย่อแต่ละรูปใน "ภาพกิจกรรม". Admin คัดลอก alt text ไปกับภาพตอนเลือก และการบันทึกอาจไม่เติมให้ภายหลัง (`docs/agents/emdash-1.1.0.md` "Media"): ถ้าใส่ alt text หลังเลือกภาพไปแล้ว ให้เลือกภาพนั้นใหม่ในช่อง. รูปย่อที่ไม่มี alt text ใช้คำบรรยายภาพเป็นชื่อลิงก์ และถ้าไม่มีคำบรรยายใช้ "ภาพที่ N"
- การ์ดและรูปย่อครอปกลางภาพ หรือรอบ "Focal point" ที่ตั้งไว้ใน Media Library. Focal point ติดไปกับภาพเฉพาะเมื่อเลือกภาพในช่องหลังจากตั้งแล้ว และการบันทึกไม่เติมให้ภายหลัง (`docs/agents/emdash-1.1.0.md` "Media"): ถ้าตั้ง focal point หลังเลือกภาพไปแล้ว ให้เลือกภาพนั้นใหม่ในช่อง
- ผู้มีบทบาท Author แก้ alt text และ focal point ใน Media Library ได้เฉพาะภาพที่ตนอัปโหลด; Editor ขึ้นไปแก้ได้ทุกภาพ (`docs/agents/emdash-1.1.0.md` "Media")
- "เนื้อหา" ของข่าวใส่ภาพไม่กี่ภาพใน block "Gallery" ได้ แต่ block นี้แสดงทุกภาพและไม่พับ: ชุดภาพใหญ่จึงควรอยู่ใน "แกลเลอรีภาพ" ของกิจกรรม
- ผู้ใช้ที่ login ด้วยบทบาท Author ขึ้นไปเห็นแถบเครื่องมือของ EmDash บนหน้าเว็บ. เมื่อเปิดสวิตช์ "Edit mode" บนแถบนั้น block "Gallery" ใน "เนื้อหา" แสดงเป็น "Plugin block: gallery (edit in admin)": แก้แกลเลอรีใน Admin และตรวจหน้าเว็บโดยปิด Edit mode. ผู้เข้าชมเห็นแกลเลอรีตามปกติ

## 5.2 เนื้อหาและไฟล์ที่ย้ายจากเว็บไซต์เดิม

รายการที่ย้ายจากเว็บไซต์เดิม (`09`) เป็น entry ปกติใน Admin:

- รายการที่ย้ายมาเป็นของ Administrator ที่รัน import. Author แก้ได้เฉพาะรายการของตน รายการเหล่านี้จึงให้ Editor ขึ้นไปเป็นผู้แก้
- ข่าวและกิจกรรมของปีงบประมาณปัจจุบันมี "สรุป" ที่เจ้าหน้าที่เขียนไว้ใน Classification list (`GLOSSARY.md`). รายการของปีก่อนหน้าไม่มี "สรุป": เรื่องอยู่ในภาพ One Page เหมือนเว็บไซต์เดิม. รายงาน PM 2.5 เก็บข้อความไว้เป็น "เนื้อหา"
- ไฟล์ที่นำเข้าอยู่ในโฟลเดอร์ของ Media Library ตามแหล่งที่มา: "ITA 2567", "ITA 2568", "ITA 2569", "ITA 2570", "ITA ใช้ทุกปี", "เว็บไซต์เดิม: ข่าวและกิจกรรม" และ "เว็บไซต์เดิม: ประกาศและเอกสาร" (`09` §8)
- Media Library และ media picker เปิดที่ main library ซึ่งแสดงเฉพาะไฟล์ที่ไม่อยู่ในโฟลเดอร์ พร้อมรายชื่อโฟลเดอร์ และการค้นหาครอบคลุมทุกโฟลเดอร์: ไฟล์ที่อัปโหลดใหม่จึงอยู่ใน main library ไม่ปนกับไฟล์ที่นำเข้า
- เอกสาร ITA ที่ใช้หลายปี เช่น กฎหมาย หรือประมวลจริยธรรม อยู่ใน "ITA ใช้ทุกปี": เมื่อขึ้นปีใหม่ให้เลือกไฟล์จากโฟลเดอร์นี้ซ้ำ ไม่อัปโหลดใหม่. การอัปโหลดไฟล์ที่เนื้อหาตรงกับไฟล์ที่มีอยู่จะได้ item เดิมในโฟลเดอร์เดิม ไม่ได้ item ใหม่ใน main library
- Editor ขึ้นไปสร้างและแก้โฟลเดอร์ได้ และแก้ alt text ของไฟล์ที่นำเข้าได้ทุกไฟล์; Author แก้ได้เฉพาะไฟล์ที่ตนอัปโหลด (§5.1)

---

# 6. Homepage Management

Homepage ยังคงเป็น curated presentation ตาม `04-homepage.md`.

Version 1 ควร model การเลือก/ลำดับ/ช่วงเวลาแสดงด้วย structured content, relation, menu, widget หรือ configuration primitive ที่ CMS มีอยู่ก่อน.

ไม่สร้าง visual page builder หรือ Homepage-specific CMS application.

หาก native form เริ่มซับซ้อนเกินงานจริง จึงค่อยพิจารณา custom field/widget ขนาดเล็ก.

---

# 7. ITA Management

เจ้าหน้าที่ดูแล ITA ใน Admin (spec #121, `docs/adr/0006`): collection "MOIT" ในกลุ่ม "ITA" มีหนึ่ง entry ต่อ MOIT ต่อปีงบประมาณ ตาม model ใน `02` §18.

- ใช้ native roles และ native publishing workflow แบบเดียวกับ content อื่น (`06`, `07`); ไม่มี custom permission, approval chain, scoring หรือ compliance engine
- field "ข้อกำหนดและหลักฐาน" เป็นรายการ blocks: เพิ่ม block จาก picker หมวด "ITA" ("ข้อกำหนด", "หลักฐาน: ไฟล์", "หลักฐาน: ลิงก์") แล้วลากเพื่อเรียงตามคู่มือ
- "หลักฐาน: ไฟล์" เลือกไฟล์จาก Media Library หรืออัปโหลดเข้า library จาก picker เดียวกัน; ไม่วางลิงก์ไฟล์เอง. ไฟล์ที่ใช้ทุกปี เช่น กฎหมาย ประมวลจริยธรรม หรือวิสัยทัศน์ของกระทรวง เลือกไฟล์เดิมซ้ำได้ และไฟล์เหล่านี้จากเว็บไซต์เดิมอยู่ในโฟลเดอร์ "ITA ใช้ทุกปี" (§5.2)
- "ชื่อหลักฐาน" ขึ้นต้นด้วยเลขข้อและบอกว่าไฟล์คืออะไร เช่น "1.2 ฟอร์มเผยแพร่ …": หัว block ใน Admin แสดงชื่อนี้ และ search หา MOIT ที่มีไฟล์นั้นได้ด้วยชื่อนี้ (`08` §5)
- "หมายเหตุ" ของไฟล์ เช่น เดือนที่ไฟล์ครอบคลุม แสดงต่อท้ายชื่อในวงเล็บ
- "หลักฐาน: ลิงก์" ที่ชี้ไปหน้าเว็บซึ่งแสดงข้อมูลของวันนี้ เช่น หน้าผู้บริหาร ให้เลือก "ข้อมูลปัจจุบัน (เปลี่ยนตามเวลา)"
- "รอบการประเมิน" มีสามค่า: "ไม่ระบุรอบ" (ค่าเริ่มต้นของ block ใหม่), "รอบ 6 เดือน" และ "รอบ 12 เดือน"; ค่าที่เลือกแล้วล้างเป็นค่าว่างไม่ได้ ให้เลือก "ไม่ระบุรอบ" แทน
- หนึ่ง MOIT มีได้ไม่เกิน 100 blocks. Admin แสดงทุก block แบบขยาย และ block ที่ยุบไว้จะขยายอีกครั้งหลัง reload (ยอมรับสำหรับ V1)
- Preview แสดงหน้า MOIT ของ draft ก่อนเผยแพร่ และทุกการบันทึกเป็น revision

## 7.1 New-year checklist

เริ่มปีงบประมาณใหม่ทีละ MOIT:

1. ในรายการ MOIT กด Duplicate ที่ MOIT เดียวกันของปีก่อน: ได้ draft ที่ชื่อลงท้าย "(Copy)" พร้อม blocks, ไฟล์ และ "ปรับปรุงล่าสุด" ของปีก่อนครบ และ slug ใหม่ที่ระบบตั้งจากชื่อ (ภาษาไทยยาว): ข้อ 3 และข้อ 7 จึงข้ามไม่ได้
2. ตั้ง "ปีงบประมาณ" และตรวจให้ถูก: ระบบไม่จำกัดค่า ปีที่พิมพ์ผิด เช่น 25700 จะขึ้นเป็นการ์ดปีใหม่บน ITA landing (`/ita`). แก้ "ลำดับ MOIT" ถ้าคู่มือปีใหม่เปลี่ยนเลข
3. ตั้ง slug ในช่อง "Slug" ของส่วน "URL & language" ที่แผงด้านข้างของหน้าแก้ไข เป็น `moit-{number}-{fiscal_year}` เช่น `moit-2-2570`; slug ที่เป็นตัวเลขล้วนอาจชนกับหน้าปี (`03` §11)
4. แก้ "ชื่อตัวชี้วัด" (และ "สรุป" ถ้ามี) ให้ตรงถ้อยคำของคู่มือปีใหม่ และลบ "(Copy)"
5. ลบ blocks "หลักฐาน: ไฟล์" และ "หลักฐาน: ลิงก์" ของปีก่อนทั้งหมด; คง blocks "ข้อกำหนด" ไว้ หรือแก้ให้ตรงคู่มือปีใหม่
6. เพิ่ม Evidence ของปีนี้ใต้ข้อกำหนดแต่ละข้อตาม Round ที่เผยแพร่ โดยเลือกไฟล์จาก Media Library และตั้ง "รอบการประเมิน"
7. ตั้ง "ปรับปรุงล่าสุด" เป็นวันที่เผยแพร่ Round นี้
8. ตรวจด้วย Preview ซึ่งเปิดหน้า MOIT ในแท็บใหม่ แล้วจึง Publish:
   - URL ในแถบที่อยู่มี `/ita/moit-{number}-{fiscal_year}`
   - หัวของหน้าแสดงปีงบประมาณใหม่ และ "ปรับปรุงล่าสุด" เป็นวันที่ของ Round นี้
   - ชื่อข้อกำหนดไม่มีปีของปีก่อน และหลักฐานแต่ละรายการอยู่ใต้ข้อกำหนดที่ถูกต้อง

Round ถัดไปของปีเดียวกัน: เพิ่ม Evidence ของ Round นั้นใน MOIT เดิม ตั้ง "ปรับปรุงล่าสุด" ใหม่ แล้ว Publish.

## 7.2 Precautions

V1 ไม่มี historical-evidence guard (`docs/adr/0006`); ข้อควรระวังเหล่านี้รักษาหลักฐานของปีที่เผยแพร่แล้ว:

- ไม่ replace และไม่ลบไฟล์ Evidence ที่เผยแพร่แล้ว: การแก้ไขคือการอัปโหลดไฟล์ใหม่แล้วเลือกไฟล์ใหม่ใน block
- ก่อนลบ media item ใน Media Library ให้ดูแท็บ "Used in" ของไฟล์นั้น: ถ้า MOIT ใดใช้อยู่ ห้ามลบ. แท็บนี้บอกเท่านั้น ไม่กันการลบ
- รายการในแท็บ "Used in" ครบเมื่อหัวแท็บไม่มีไอคอนเตือน; ไอคอนเตือน เช่น "Usage indexing hasn’t started." หรือ "Usage may be out of date." แปลว่ารายการอาจไม่ครบ. Administrator ทำ setup ของ media usage tracking ที่ banner "Set up media usage tracking" ของ Media Library เสนอให้เสร็จก่อน; ก่อนนั้นแท็บที่ว่างไม่ได้แปลว่าไม่มีใครใช้ไฟล์
- revisions, Admin change log (`docs/adr/0005`) และ backups บันทึกว่าอะไรเปลี่ยน; ไฟล์ที่หายแสดง "ไฟล์ไม่พร้อมให้บริการ" บนหน้า MOIT

เจ้าหน้าที่อย่างน้อยสองคนได้รับการอบรม model และ checklist นี้ เพื่อไม่ให้ ITA ขึ้นกับคนเดียว.

---

# 8. Users and Access

User management และ access control ใช้ capability ของ CMS เป็น baseline. Product requirements อยู่ใน `06-roles-permissions.md`; implementation mapping อยู่ใน `10-system-blueprint.md`.

Admin UI ไม่ต้องมี custom role builder, per-user override editor หรือ Module Scope editor ใน Version 1.

---

# 9. Publishing

Publishing UI ใช้ native draft/publish/schedule/revision/preview behavior เป็น baselineตาม `07-publishing-workflow.md`.

Version 1 ไม่มี custom approval engine, Pending Review queue หรือ Approved state ของ Songhealth.

ผู้มี Native RBAC publish authority สามารถ Publish/Schedule บทความได้โดยตรง ไม่ต้องส่งตรวจ ขออนุมัติ หรือกดยืนยันผ่านขั้นตอนเพิ่มเติมของ Songhealth. ผู้ไม่มีสิทธิ์ Publish บันทึก Draft ได้ตาม native permissions; ไม่มีการส่งคำขออนุมัติหรือคิวผู้ตรวจ.

---

# 10. Traceability

Version 1 ใช้ native authorship, timestamps, revisions/history และ operational logs ก่อน.

ไม่สร้าง Central Audit Log subsystem, audit dashboard หรือ audit permission family แยกเองจนกว่าจะมี requirement ด้านกฎหมาย/กำกับดูแลที่ native evidence รองรับไม่ได้.

เหตุการณ์สำคัญที่ต้องพิสูจน์เพิ่มเติมใน implementation review ได้แก่การ publish, schema/admin changes และ user-access changes; หาก platform evidence ไม่พอ ให้เพิ่ม logging เฉพาะ gap แทน universal audit framework.

---

# 11. Settings

ใช้ native site settings สำหรับค่าที่ platform เป็นเจ้าของ เช่น site identity, timezone, SEO defaults และ authentication configuration ตามที่เหมาะสม.

Structured website content ไม่ควรถูกย้ายไปเก็บใน Settings เพียงเพราะแก้ได้ง่าย.

Secrets และ deployment configuration อยู่ภายนอก normal CMS UI เว้นแต่ platform มี secret-management mechanism ที่เหมาะสม.

---

# 12. Language and Accessibility

- collection/field labels ใช้ภาษาไทยที่เจ้าหน้าที่เข้าใจ
- ใช้ admin localization ของ platform เมื่อมี
- untranslated platform strings อาจ fallback เป็นภาษาอังกฤษได้ใน Version 1 หากไม่กระทบความถูกต้องของงาน
- custom extension ต้อง keyboard accessible และ responsive
- ไม่ fork Admin UI เพียงเพื่อแปลข้อความทั้งหมด

---

# 13. Extension Gate

ก่อนสร้าง custom Admin component/page/plugin ต้องตอบ YES ได้อย่างน้อยหนึ่งข้อ:

1. Native CMS ทำ Product requirement ไม่ได้
2. Native workflow ทำให้งานจริงผิดพลาดหรือซับซ้อนอย่างมีหลักฐานจาก UAT
3. ต้อง enforce Songhealth-specific invariant ที่ field/schema validation ธรรมดาทำไม่ได้
4. ต้อง integrate ระบบภายนอกที่ยืนยันแล้ว

หากเหตุผลคือเพียง “อยากให้เหมือนระบบเดิม” หรือ “อาจใช้ในอนาคต” ให้ไม่สร้าง.

---

# 14. Explicit Non-Goals

Version 1 ไม่สร้าง:

- custom Admin SPA
- page builder
- role builder
- Module Scope editor
- approval/workflow engine
- notification center
- workflow inbox
- custom audit platform
- DAM/DMS
- AI editor/ranking
- custom global admin search
- enterprise collaboration suite

---

# 15. Acceptance

Admin CMS baseline ผ่านเมื่อ:

- staff สามารถทำงานหลักผ่าน native CMS ได้
- Content Model แสดงเป็น collection/field/relation ที่เข้าใจได้
- Draft/Publish/Schedule/Preview/Revision ใช้งานได้ตาม collection ที่ต้องการ
- media และ relation reuse ไม่ทำให้เกิดไฟล์/ข้อมูลซ้ำโดยไม่จำเป็น
- Homepage uses supported native primitives; staff maintain MOITs with the native editor and the §7 checklist, with no historical-evidence guarantee claimed
- ไม่มี custom capability ที่ platform มีอยู่แล้วถูกสร้างซ้ำ

> **Simple for staff, native by default, custom only for proven gaps.**

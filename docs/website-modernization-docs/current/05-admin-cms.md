# Admin CMS — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 05-admin-cms
> **Status:** CLEAN REBASELINE v2.5 — CURRENT native-only publication
> **Version:** 2.5
> **Last Updated:** 3 พฤศจิกายน 2569 (2026-11-03): Feature 004, ITA in V1
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
> new-year checklist and the precautions of §7. At least two staff are trained on them.

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

ใช้ collection grouping ของ CMS ก่อนสร้าง custom navigation.

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

Songhealth ไม่สร้าง DAM, folder hierarchy, image editor, check-in/check-out หรือ custom media-usage database ใน Version 1.

Native usage reporting may be incomplete/stale and is not a deletion lock. Authorized native
media removal can break consumers; in-place image replacement can change shared bytes without an
ITA publication. Staff precautions do not enforce historical retention or cross-record safety.

CMS นี้ใช้สำหรับ **public-publishable website assets**. ห้ามใช้เป็นที่เก็บไฟล์ลับ ข้อมูลผู้ป่วย หรือเอกสารภายในที่ต้องการ confidential access control โดยไม่มี requirement และ security design แยกต่างหาก.

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
- "หลักฐาน: ไฟล์" เลือกไฟล์จาก Media Library หรืออัปโหลดเข้า library จาก picker เดียวกัน; ไม่วางลิงก์ไฟล์เอง. ไฟล์ที่ใช้ทุกปี เช่น กฎหมาย ประมวลจริยธรรม หรือวิสัยทัศน์ของกระทรวง เลือกไฟล์เดิมซ้ำได้
- "ชื่อหลักฐาน" ขึ้นต้นด้วยเลขข้อและบอกว่าไฟล์คืออะไร เช่น "1.2 ฟอร์มเผยแพร่ …": หัว block ใน Admin แสดงชื่อนี้ และ search หา MOIT ที่มีไฟล์นั้นได้ด้วยชื่อนี้ (`08` §5)
- "หมายเหตุ" ของไฟล์ เช่น เดือนที่ไฟล์ครอบคลุม แสดงต่อท้ายชื่อในวงเล็บ
- "หลักฐาน: ลิงก์" ที่ชี้ไปหน้าเว็บซึ่งแสดงข้อมูลของวันนี้ เช่น หน้าผู้บริหาร ให้เลือก "ข้อมูลปัจจุบัน (เปลี่ยนตามเวลา)"
- "รอบการประเมิน" มีสามค่า: "ไม่ระบุรอบ" (ค่าเริ่มต้นของ block ใหม่), "รอบ 6 เดือน" และ "รอบ 12 เดือน"; ค่าที่เลือกแล้วล้างเป็นค่าว่างไม่ได้ ให้เลือก "ไม่ระบุรอบ" แทน
- หนึ่ง MOIT มีได้ไม่เกิน 100 blocks. Admin แสดงทุก block แบบขยาย และ block ที่ยุบไว้จะขยายอีกครั้งหลัง reload (ยอมรับสำหรับ V1)
- Preview แสดงหน้า MOIT ของ draft ก่อนเผยแพร่ และทุกการบันทึกเป็น revision

## 7.1 New-year checklist

เริ่มปีงบประมาณใหม่ทีละ MOIT:

1. ในรายการ MOIT กด Duplicate ที่ MOIT เดียวกันของปีก่อน: ได้ draft ที่ชื่อลงท้าย "(Copy)" พร้อม blocks และไฟล์ของปีก่อนครบ
2. ตั้ง "ปีงบประมาณ" และตรวจให้ถูก: ระบบไม่จำกัดค่า ปีที่พิมพ์ผิด เช่น 25700 จะขึ้นเป็นการ์ดปีใหม่บน ITA landing (`/ita`). แก้ "ลำดับ MOIT" ถ้าคู่มือปีใหม่เปลี่ยนเลข
3. ตั้ง slug เป็น `moit-{number}-{fiscal_year}` เช่น `moit-2-2570`; slug ที่เป็นตัวเลขล้วนอาจชนกับหน้าปี (`03` §11)
4. แก้ "ชื่อตัวชี้วัด" (และ "สรุป" ถ้ามี) ให้ตรงถ้อยคำของคู่มือปีใหม่ และลบ "(Copy)"
5. ลบ blocks "หลักฐาน: ไฟล์" และ "หลักฐาน: ลิงก์" ของปีก่อนทั้งหมด; คง blocks "ข้อกำหนด" ไว้ หรือแก้ให้ตรงคู่มือปีใหม่
6. เพิ่ม Evidence ของปีนี้ใต้ข้อกำหนดแต่ละข้อตาม Round ที่เผยแพร่ โดยเลือกไฟล์จาก Media Library และตั้ง "รอบการประเมิน"
7. ตั้ง "ปรับปรุงล่าสุด" เป็นวันที่เผยแพร่ Round นี้
8. ตรวจด้วย Preview แล้ว Publish

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

# Admin CMS — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 05-admin-cms
> **Status:** CLEAN REBASELINE v2.4 — CURRENT native-first V1
> **Version:** 2.4
> **Last Updated:** 14 ตุลาคม 2569 (2026-10-14)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`, `04-homepage.md`
> **Purpose:** กำหนดความต้องการของ Admin CMS ที่จำเป็นต่อการดูแล Songhealth โดยใช้ความสามารถมาตรฐานของ CMS ก่อน และสร้างส่วนขยายเฉพาะเมื่อมี gap ที่พิสูจน์แล้ว


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers structured ITA historical-evidence
> management and unavailable Q3/Q4 enforcement from V1. Ordinary native content/Document/Media,
> publication, permissions and supported validation remain on EmDash 1.1.0. The reduced V1 scope is reflected in the reviewed Feature 002 Plan; deferral is not implementation or PASS. No upstream
> change, new subsystem, replacement ITA workflow or production action is authorized.

> **Native Q1 decision:** Product Owner comment `01a13788-95c6-72f5-8787-f86b4e0c5fd6` adopts EmDash 1.1.0
> save-time requiredness for genuinely mandatory native references. Missing such a reference need
> not be saveable as a draft. Other incomplete drafts follow native field validation. Optional/
> conditional relationships are not automatic publication gates where native enforcement lacks
> adequate data. D-ITA/D-REF remain deferred; no custom reference adapter or internal-table access.

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
- Structured ITA: deferred from V1 (§7)
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
- validation จาก Content Model for retained V1 resources; native mandatory-reference save rules and supported scalar/classification publication checks are distinct; see the Feature 002 field matrix
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

# 7. ITA Management — Deferred from V1

The structured yearly ITA hierarchy, ordered evidence maintenance and historical correction/
preservation workflow are deferred under `02-content-model.md` §18. No V1 ITA Admin collections,
upload workflow, custom workspace or acceptance journey is required. No generic-page substitute,
scoring/compliance engine, automatic carry-forward or custom approval chain is authorized.

Ordinary Document/Media maintenance remains available for public-publishable website information;
it must not be represented as immutable yearly evidence management. Future re-entry requires
separate Product/Architecture approval and supported historical-target enforcement evidence.

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
- Homepage uses supported native primitives; structured ITA/historical evidence is deferred, not part of V1 Admin acceptance
- ไม่มี custom capability ที่ platform มีอยู่แล้วถูกสร้างซ้ำ

> **Simple for staff, native by default, custom only for proven gaps.**

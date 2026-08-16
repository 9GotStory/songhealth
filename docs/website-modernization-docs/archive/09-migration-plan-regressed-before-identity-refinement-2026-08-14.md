# Migration Plan — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 09-migration-plan  
> **Status:** WORKING DRAFT  
> **Version:** 0.1  
> **Last Updated:** 14 สิงหาคม 2569  
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md` v1.1, `03-sitemap.md` v1.0, `04-homepage.md` v1.0, `05-admin-cms.md` v1.0, `06-roles-permissions.md` v1.0, `07-publishing-workflow.md` v1.0, `08-search.md` v1.0  
> **Purpose:** กำหนดแผนการย้ายข้อมูลและการเปลี่ยนผ่านจากเว็บไซต์ WordPress เดิมเข้าสู่เว็บไซต์และ Admin CMS ใหม่อย่างมีการควบคุม โดยรักษาความหมายของเนื้อหา ประวัติที่มีคุณค่า Canonical URL/Public Identity ความต่อเนื่องของลิงก์ และความปลอดภัยของการ Cutover โดยไม่ย้าย technical debt ของ WordPress เข้ามาเป็นโครงสร้างถาวรของระบบใหม่

---

# 1. Purpose

เอกสารนี้กำหนด Product / Migration Contract สำหรับการเปลี่ยนผ่านจากเว็บไซต์ WordPress เดิมไปยังเว็บไซต์สำนักงานสาธารณสุขอำเภอสองรุ่นใหม่.

Migration ไม่ใช่การ copy ตารางหรือ file tree แบบหนึ่งต่อหนึ่ง แต่เป็นการย้ายข้อมูลที่ผ่านการตีความตาม Information Architecture, Content Model, Sitemap, Publishing Workflow และ Search Baseline ที่ Freeze แล้ว.

เป้าหมายคือ:

- รักษาข้อมูลปัจจุบันที่ยังต้องใช้งาน
- รักษาประวัติที่มี legitimate public value
- ลด duplicate / obsolete / test / presentation debt
- สร้าง URL continuity ที่ตรวจสอบได้
- ลดงาน manual ที่ไม่จำเป็น
- ทำให้การทดลอง migration ทำซ้ำได้อย่างปลอดภัย
- Cutover ไปยังระบบใหม่โดยมี backup, validation, fallback และ legacy retirement ที่ชัดเจน

---

# 2. Migration Is a Controlled Transition, Not a WordPress Clone

หลักแกนกลาง:

> **Migration is not “copy everything from WordPress into the new CMS.” It is a controlled transition into the new Information Architecture, Content Model, lifecycle, URL, and publishing rules.**

ดังนั้น WordPress เดิมเป็น **Migration Source** แต่ไม่ใช่ Target Model.

ตัวอย่าง:

```text
WordPress Post
        ↓
Classify by meaning
        ↓
News / Activity / Announcement / Health Content / other canonical type
```

ไม่ใช้กฎว่า `Post → Post` หรือ `Page → Page` แบบอัตโนมัติโดยไม่ดูความหมายจริง.

---

# 3. Migration Scope

Version 1 Migration Plan ครอบคลุม 4 workstreams หลัก:

```text
1. Content Migration
2. URL / Redirect Migration
3. File / Media Migration
4. Cutover & Validation
```

ขอบเขตนี้รวมถึงข้อมูลที่จำเป็นต่อ:

- public content
- public documents/files
- canonical relationships
- public lifecycle/history
- legacy URL continuity
- migration traceability
- final cutover and stabilization

Migration ไม่ถูกใช้เป็นข้ออ้างเพื่อสร้าง permanent WordPress integration platform.

---

# 4. Migration Principles

Baseline principles:

> **Migrate by meaning, not by legacy storage type.**

> **Preserve history where it has legitimate public value; do not preserve technical debt merely because it exists.**

> **Clean the structure, preserve the meaning.**

> **Automate deterministic work; review ambiguous work.**

> **Presentation debt stays behind.**

> **No intentionally preserved legitimate information disappears without an explicit migration decision.**

---

# 5. Migration Decision Categories

ทุก legacy item ที่อยู่ใน migration scope ควรลงท้ายด้วย decision ที่อธิบายได้อย่างน้อยหนึ่งประเภท:

| Decision | Meaning |
|---|---|
| **Migrate — Current** | ยังเป็นข้อมูลปัจจุบันและต้องอยู่ในระบบใหม่ |
| **Migrate — Historical** | ไม่ใช่ current แต่มี legitimate historical public value |
| **Review Required** | ความหมาย คุณภาพ metadata หรือปลายทางยังไม่ชัด |
| **Redirect Only** | ไม่ย้ายเนื้อหาเดิม แต่ old URL มี meaningful canonical successor |
| **Do Not Migrate** | duplicate, test, obsolete, broken หรือไม่มี legitimate value |
| **Retain in Backup Only** | เก็บไว้เพื่อ backup/record แต่ไม่อยู่ใน public system ใหม่ |

ไม่ใช้ `Migrate Everything` เป็น default decision.

---

# 6. Content Classification by Domain Meaning

Legacy WordPress content ต้องถูก classify ตาม Frozen Content Model เช่น:

```text
Basic Page
News
Activity
Announcement
Health Content
Health Report
Service
Health Service
Document
ITA
Personnel / Organization supporting structures
```

Legacy category/tag/post type เป็นเพียง signal ช่วย classification ไม่ใช่ authority หากความหมายจริงของเนื้อหาขัดกัน.

Classification ที่กำกวมต้องเข้า `Review Required` แทนการเดา.

---

# 7. Historical Content

Historical migration ใช้ Domain meaning ไม่ใช้ age-only rule.

ตัวอย่าง:

- News / Activity เก่าที่เป็นประวัติหน่วยงานอาจมี legitimate historical value
- Announcement เก่าบางชนิดอาจมีคุณค่าต่ำและไม่จำเป็นต้องย้ายทั้งหมด
- Document/ITA history ต้องรักษาตาม lifecycle และ compliance context ที่ Frozen ไว้

ไม่ใช้ universal rule เช่น:

```text
older than 3 years → delete
```

สำหรับ ITA ใช้หลักจาก Frozen Content Model:

> **Preserve history; improve forward.**

อย่างน้อยต้องรักษาโครงสร้างที่มีความหมาย:

```text
Fiscal Year
→ MOIT / Section
→ Requirement / Item
→ Evidence Document / Media / URL
```

ไม่จำเป็นต้อง normalize historical ITA ทั้งหมดเกินประโยชน์ใช้งานจริง.

---

# 8. Canonical Identity and Legacy Traceability

ระบบใหม่สร้าง Stable Public Identity ตาม Frozen Sitemap/Content Model ของตนเอง.

Legacy WordPress identifiers เช่น:

```text
post_id = 123
attachment_id = 456
```

อาจเก็บไว้เพื่อ:

- migration traceability
- redirect mapping
- troubleshooting
- rerun/idempotency control

แต่ **Legacy ID ไม่เป็น Canonical Public Identity ของระบบใหม่**.

Migration ต้องสามารถ trace ได้อย่างน้อยใน operational/import metadata ว่า:

```text
New Canonical Record
← Legacy Source Record / Legacy ID / Legacy URL
```

ข้อมูล traceability นี้ไม่จำเป็นต้องเปิด Public.

---

# 9. URL Migration Is a First-Class Workstream

Old public URLs เป็น migration assets เพราะอาจถูก:

- bookmark
- share ผ่าน LINE/Facebook
- indexed โดย external search engines
- link จากเว็บไซต์อื่น
- อ้างถึงในเอกสารเดิม

Migration ต้องสร้าง explicit mapping เมื่อมี meaningful successor:

```text
Old WordPress URL
→ New Canonical URL
```

สอดคล้องกับ Frozen Sitemap:

> **Redirect only when there is a meaningful equivalent or successor.**

> **Legacy WordPress URLs should be explicitly mapped during migration rather than redirected blindly to the homepage.**

---

# 10. Redirect Semantics

ไม่ใช้ blanket redirect:

```text
all old 404s → /
```

หากมี meaningful successor ให้ redirect โดยตรงไป canonical destination ปัจจุบันและหลีกเลี่ยง redirect chain/loop.

หากไม่มี meaningful equivalent:

- Not Found ใช้เมื่อข้อมูลไม่ควรถูกตีความว่าเคยมี public successor
- Gone ใช้ตาม Frozen Sitemap/Publishing semantics เมื่อ content ที่เคย Public ถูกถอนถาวรและไม่มี meaningful successor
- Redirect ใช้เฉพาะเมื่อ destination ตอบ user intent เดิมจริง

Superseded Document ไม่ถูก auto-redirect เพียงเพราะมี successor; historical identity ยังคงตาม Frozen Publishing Workflow.

---

# 11. Redirect Mapping as a Migration Asset

Migration process ควรมี mapping ที่ตรวจสอบได้ในรูปแบบที่รองรับอย่างน้อย:

```text
legacy_url
legacy_identity
migration_decision
canonical_resource
new_url
redirect_behavior
validation_status
```

ไม่จำเป็นต้องสร้าง enterprise redirect-management CMS ใน Version 1.

Mapping อาจอยู่ใน migration dataset/script/artifact ตราบใดที่ตรวจสอบ ทำซ้ำ และใช้ validate cutover ได้.

---

# 12. Media Migration

Media migration แยกจาก Content migration.

WordPress uploads มักมี:

- original asset
- generated thumbnails/resized derivatives
- duplicate assets
- unused uploads
- malformed filenames
- broken files

Baseline:

```text
Referenced + legitimate canonical asset
→ migrate

Unused generated derivative
→ do not migrate by default
```

ระบบใหม่ควรย้าย **original/canonical asset** ที่ยังมี legitimate use แล้วให้ presentation derivatives ของระบบใหม่เกิดตาม implementation ใหม่.

ไม่ copy `/uploads/` ทั้งหมดแบบ blind.

---

# 13. Documents, PDFs, and Resource Meaning

PDF/Document เดิมที่ฝังอยู่ใน WordPress Post/Page ต้องถูกตีความตาม Frozen Content Model.

ตัวอย่าง:

```text
Standalone official PDF
→ Document

Health report PDF
→ Report Document supporting Health Report

ITA evidence PDF
→ Document/Evidence relationship in the relevant Fiscal Year / Requirement

Service form/guide
→ Document resource related to Service
```

Migration ไม่คงไฟล์เป็น contextless attachment URL หากระบบใหม่มี canonical resource/relationship ที่เหมาะสมกว่า.

Filename ไม่กลายเป็น Public Identity.

---

# 14. Internal Links and Broken References

Migration validation ต้องตรวจอย่างน้อย:

- internal links ไป legacy URLs
- attachment links
- image references
- broken/missing internal assets
- malformed external linksที่ตรวจพบได้อย่างมีเหตุผล

เมื่อ mapping เชื่อถือได้ internal link ใน migrated content ต้อง rewrite ไป New Canonical URL.

เนื้อหาใหม่ไม่ควรพึ่ง old WordPress URL ต่อไปอย่างถาวร.

ไม่จำเป็นต้องสร้าง enterprise crawler platform; deterministic migration checks เพียงพอสำหรับ Version 1.

---

# 15. Structural Cleanup

Migration เป็นโอกาสเอา legacy presentation debt ออก เช่น:

- obsolete WordPress shortcodes
- malformed HTML
- excessive inline style
- legacy embed wrappers
- duplicate/invalid heading structure
- theme/plugin-specific markup

หลัก:

> **Clean the structure, preserve the meaning.**

ไม่ใช้ migration เป็นโครงการ rewrite เนื้อหาทุกชิ้นใหม่ทั้งหมด.

---

# 16. Automation vs Human Review

Deterministic fields ควรถูกย้ายอัตโนมัติเมื่อเชื่อถือได้ เช่น:

- Title
- original dates
- body/content
- legacy URL/ID
- known categories/taxonomy mappings
- deterministic media relationships
- trustworthy attribution

Targeted human review ใช้กับ:

- ambiguous Content Type
- missing/poor metadata
- duplicate/obsolete decision
- current vs historical decision
- Service ownership/delivery meaning
- sensitive or high-risk documents
- unclear redirect destination

ไม่ควรบังคับเจ้าหน้าที่กรอกข้อมูลเดิมทุก record ใหม่ด้วยมือ.

---

# 17. Attribution and Historical Accuracy

Migration ต้องรักษา original date/attribution ที่ **เชื่อถือได้** เท่าที่ทำได้ ตาม Frozen Publishing Workflow.

หาก legacy actor ไม่ทราบ:

```text
Original actor unavailable
```

หรือ equivalent.

ห้าม:

- fabricate actor
- ใช้ migration operator เป็น original author โดยอัตโนมัติ
- ใช้ import date ทำเหมือนเป็น original Published At

Migration metadata สามารถบันทึก `Imported From Legacy` แยกจาก historical public attribution.

---

# 18. Repeatable and Idempotent Migration

Migration preparation ต้องรองรับการทดลองหลายรอบโดยไม่สร้าง duplicate canonical records.

หลัก:

> **Migration processes should be safe to rerun during preparation.**

ต้องมี deterministic legacy-to-new mapping/idempotency strategy ระดับ implementation แม้ exact mechanism จะ defer ไป `10-system-blueprint.md`.

ไม่ใช้ workflow ที่ต้องลบ duplicate ด้วยมือจำนวนมากทุกครั้งที่ rerun.

---

# 19. Trial Migration and Delta Migration

Production cutover ไม่เป็น migration run ครั้งแรก.

Baseline flow:

```text
Legacy inventory/export
→ Trial migration
→ Validate
→ Fix mapping/transformation
→ Trial again as needed
→ Initial production-ready migration
→ Delta / Final Sync
→ Final validation
→ Cutover
```

เนื่องจาก WordPress อาจยังมีการแก้ไขระหว่างพัฒนาระบบใหม่ จึงต้องมี concept ของ **Initial Migration + Final Delta/Sync**.

ไม่ assume ว่า export รอบแรกจะเป็นข้อมูลล่าสุดเมื่อ cutover.

---

# 20. Content Freeze Window

Final cutover อาจต้องมีช่วงจำกัด/หยุดการแก้ไข WordPress ชั่วคราวเพื่อให้ final delta และ validation มีจุดอ้างอิงเดียว.

Concept:

```text
Legacy edits continue during build
        ↓
Controlled content-freeze window
        ↓
Final delta migration
        ↓
Validation
        ↓
Cutover
```

Exact duration, timing และ operational procedure ยังไม่ Freeze ใน Foundation.

---

# 21. User Accounts and Access Migration

WordPress users/roles/passwords ไม่ถูก copy แบบ blind ไป New CMS.

ไม่ migrate อัตโนมัติ:

- old Admin/Editor role semantics
- inactive/plugin-created accounts
- WordPress password hashes
- plugin permissions

New CMS access ต้องอยู่ภายใต้ Frozen `06-roles-permissions.md`.

ผู้ใช้ที่ยังจำเป็นอาจถูก onboard/create ใหม่อย่าง controlled และตั้ง/reset credentials ตาม authentication architecture ใหม่.

Password migration ไม่เป็น Version 1 baseline requirement.

---

# 22. Theme, Plugin, and Presentation Debt

ไม่ migrate เป็น target architecture:

- theme options
- widget configuration
- Elementor/page-builder JSON
- plugin settings
- shortcode implementation
- WordPress presentation-specific structures

ยกเว้นข้อมูลภายในสิ่งเหล่านั้นมี **business/content meaning** ที่ต้อง extract ออกมาเป็น canonical content จริง.

> **Presentation debt stays behind.**

---

# 23. SEO and Analytics Boundary

SEO metadata migrate อย่างเลือกสรรเมื่อมี public meaningและเชื่อถือได้ เช่น:

- meaningful page title
- authored meta description
- reliable canonical/reference metadata

ไม่ copy SEO-plugin fields ทุกอย่างแบบ blind.

New Canonical URL และ structured public metadata ของระบบใหม่เป็น authority หลัง cutover.

Google Analytics/Search Console/history เป็น deployment/analytics continuity concern แยกจาก canonical Content Migration pipeline.

---

# 24. Migration Validation

Validation ต้องครอบคลุมอย่างน้อย 4 มิติ:

```text
Structural Validation
→ record/file/relationship integrity

Content Validation
→ title/body/date/classification/metadata meaning

Public Validation
→ lifecycle/visibility/canonical URL/Search eligibility where relevant

Redirect Validation
→ old URL resolves to appropriate new destination/Not Found/Gone behavior
```

Search validationใช้ Frozen `08-search.md`; migrated content ต้องไม่สร้าง Public Search exposure ก่อน canonical Public eligibility.

---

# 25. Automated Checks, Exception Review, and Sampling

ไม่จำเป็นต้องเปิดทุก record ตรวจด้วยมือเท่ากันทั้งหมด.

ใช้การผสม:

- automated counts/checks
- exception reports
- targeted manual review
- risk-based sampling

High-value/high-risk content เช่น:

- Services
- ITA
- official Documents
- Health Reports
- key Basic Pages
- historically important records

ควรได้รับ review มากกว่า low-risk obsolete content.

---

# 26. Migration Reconciliation and Counts

Migration ต้อง reconcile ได้อย่างน้อยว่า legacy items ที่ค้นพบถูกตัดสินอย่างไร:

```text
Discovered
Migrated — Current
Migrated — Historical
Review Required
Redirect Only
Do Not Migrate
Backup Only
Failed / Exception
```

ไม่จำเป็นต้องสร้าง BI/enterprise migration dashboard; report/dataset ที่ตรวจสอบได้เพียงพอ.

จำนวนรวมต้องช่วยให้ทีมรู้ว่า record หายเพราะ **decision** หรือเพราะ **failure**.

---

# 27. Backup, Cutover, and Rollback/Fallback

ก่อน cutover ต้องมี verified backup ของ legacy website ที่จำเป็น เช่น:

- database
- uploads/original files
- configuration/export ที่จำเป็นต่อการ recover/ตรวจย้อนหลัง

Cutover plan ต้องมี practical fallback/rollback decision path หากระบบใหม่มี critical failure.

ไม่จำเป็นต้องสร้าง distributed rollback transaction ระหว่าง WordPress และ New CMS.

สิ่งสำคัญคือมี known operational fallback และไม่ทำลาย legacy source ก่อน stabilization.

---

# 28. Stabilization and Legacy Retirement

หลัง launch ไม่ลบ WordPress ทันที.

Baseline:

```text
New site launch
→ Legacy becomes controlled/non-editable/private archive as appropriate
→ Stabilization / validation period
→ Controlled retirement
```

อย่างไรก็ตาม WordPress เดิมไม่ควรเปิดเป็น public duplicate siteต่อเนื่องยาว ๆ เพราะทำให้:

- staff สับสนว่าต้องอัปเดตที่ไหน
- duplicate/stale public information
- SEO/canonical conflict
- long-term operational debt

หลัง cutover มี **one canonical public website**.

---

# 29. No Permanent Dual-write

Migration เป็น transition ไม่ใช่ permanent integration architecture.

ไม่ออกแบบ baseline:

```text
Staff publish WordPress → sync New CMS
Staff publish New CMS → sync WordPress
```

เป็น bidirectional long-term workflow.

หลัง cutover New CMS เป็น canonical publishing system; legacy WordPressเข้าสู่ retirement path.

---

# 30. Meaning of “No Data Loss”

“No data loss” ใน Migration Plan ไม่ได้หมายถึงการเก็บทุก technical artifact ของ WordPress.

ความหมายที่ Freeze เป็นหลักคือ:

> **No legitimate canonical/public information that the project intentionally decided to preserve should disappear without a recorded migration decision.**

ดังนั้นสิ่งเหล่านี้ไม่จำเป็นต้อง survive เพียงเพราะมีอยู่:

- unused thumbnails
- obsolete plugin metadata
- duplicate files
- test records
- stale theme settings
- malformed presentation wrappers

แต่ข้อมูลที่ถูกตัดสิน `Migrate — Current` หรือ `Migrate — Historical` ต้องมี traceable outcome และ validation.

---

# 31. Migration Flow

Conceptual migration flow:

```text
Legacy WordPress Inventory
        ↓
Classification & Migration Decision
        ↓
Content Model Mapping
        ↓
Cleanup / Transformation
        ↓
Trial Import
        ↓
Validation & Exception Review
        ↓
Redirect Mapping
        ↓
Initial / Delta Migration
        ↓
Final Validation
        ↓
Cutover
        ↓
Stabilization
        ↓
Legacy Retirement
```

Flow นี้เป็น Product/Migration Contract ไม่ใช่ implementation pipeline specification.

---

# 32. Implementation Decisions Deferred

Foundation นี้ยังไม่ Freeze:

- WP REST API vs SQL dump vs WP-CLI/export mechanism
- exact migration language/script
- exact target database schema
- exact Public ID generation mechanism
- exact idempotency key implementation
- exact redirect server/proxy configuration
- exact DNS/cutover steps
- exact downtime/content-freeze duration
- migration batch sizes
- exact backup/legacy retention period
- exact authentication onboarding mechanism
- exact analytics/search-console continuity steps

Implementation/infrastructure decisionsไป `10-system-blueprint.md` หรือหัวข้อ implementation-specific ภายใน `09` เมื่อมี requirement เพียงพอ.

---

# 33. Accepted Migration Foundation & Scope

**Sections 1–32 = Accepted Migration Foundation & Scope.**

Accepted baseline:

- Migration is a controlled transition into the Frozen IA/Content Model/lifecycle/URL rules, not a one-to-one WordPress clone.
- legacy content is classified by meaning and ongoing public value before migration.
- migration decisions distinguish Current, Historical, Review Required, Redirect Only, Do Not Migrate, and Backup-only outcomes.
- WordPress IDs/URLs support traceability but never become the new canonical identity model.
- legacy URLs are first-class assets; only meaningful successors redirect and universal homepage redirects are prohibited.
- Media migration keeps legitimate original/canonical assets rather than every generated WordPress derivative.
- PDFs/Documents are mapped into the Frozen Document/Health Report/ITA/Service relationships rather than preserved as contextless attachments.
- internal links and meaningful legacy references are rewritten to new canonical URLs when reliable mapping exists.
- structural cleanup removes legacy presentation debt while preserving legitimate content meaning.
- deterministic fields are automated; ambiguous classification/metadata/ownership/history decisions receive targeted human review.
- trustworthy original dates/attribution are preserved and unknown legacy actors are never fabricated.
- new records retain operational traceability to legacy sources and migration is designed to be repeatable/idempotent during preparation.
- trial migration precedes production cutover and final delta/synchronization handles content changed during implementation.
- WordPress roles/passwords/plugin/theme/presentation configuration are not blindly migrated into the new CMS.
- validation covers structure, content semantics, lifecycle/visibility, canonical URLs/Search eligibility, files/relationships, and redirects.
- migration reconciliation records discovered/migrated/skipped/reviewed/redirected/failed/backup-only outcomes without an enterprise dashboard requirement.
- cutover includes verified backup, practical fallback/rollback planning, stabilization, and controlled legacy retirement.
- one canonical public website remains after cutover; permanent dual publishing/WordPress↔New CMS synchronization is outside the architecture.
- “No data loss” means no intentionally preserved legitimate information disappears without an explicit migration decision; legacy technical artifacts do not automatically survive.
- exact extraction/import/redirect/DNS/batch/retention/authentication infrastructure remains deferred until requirements justify implementation detail.

---

# 34. Next Discussion Topic

> **Legacy Inventory, Classification & Content Mapping Strategy**

The next step is to define how the current WordPress estate is inventoried and how legacy `Post / Page / Media / Menu / Category / User` structures are classified and mapped into the Frozen canonical domains without guessing missing meaning.

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

# 34. Inventory, Classification, Decision, and Mapping Are Separate Steps

Legacy migration uses four distinct questions:

```text
Legacy WordPress
      ↓
Inventory
“What exists?”
      ↓
Classification
“What does this information mean?”
      ↓
Migration Decision
“Should it survive, and in what public/historical role?”
      ↓
Target Mapping
“Which Frozen Content Model resource should represent it?”
```

WordPress storage type is evidence about the old implementation, not proof of target Domain meaning.

A `post` does not automatically become `News`, and a `page` does not automatically become `Basic Page`.

---

# 35. Legacy Inventory Scope

Inventory includes at least:

| Legacy Source | Inventory Purpose |
|---|---|
| Posts | content, dates, taxonomy, URLs, relationships, attachments |
| Pages | organizational/service/static content and legacy landing pages |
| Media / Documents | files, usage, references, derivatives, orphans |
| Taxonomies | Category, Tag, and evidence-backed plugin taxonomy semantics |
| Navigation | legacy menus, hierarchy, important URLs, external links |
| Users | trustworthy attribution evidence and controlled future onboarding |

Evidence-backed custom post types or plugin-managed content are added only where the existing site actually uses them for business/public information.

Migration does not invent a generic inventory for plugin/theme internals that have no public-content meaning.

---

# 36. Legacy Inventory Record and Traceability Fields

Each discovered legacy item should retain enough working metadata to support repeatable decisions and troubleshooting, conceptually including:

- Legacy Source Type
- Legacy ID
- Legacy URL
- Legacy Title / Name
- Legacy Status
- Created / Published / Modified dates where available
- Legacy Author / Account where available
- Categories / Tags
- Parent / hierarchy
- Referenced Media / Documents
- Internal links / references
- Migration Decision
- Target Content Type / target relationship
- Review Notes / exceptions
- Migration Outcome

These are migration working fields, not new CMS public Content Model fields.

The migration process must be able to answer which legacy source produced a target record and why that mapping/decision was chosen.

---

# 37. Legacy Public URLs Are Inventoried Independently of Preservation Decisions

Every known legacy Public URL is retained in the migration inventory even when the content decision becomes:

- Do Not Migrate
- Redirect Only
- Retain in Backup Only

This allows redirect / Gone / Not Found treatment to be determined explicitly rather than losing URL history when content is excluded.

URL inventory therefore remains separate from the question of whether the legacy content itself survives in the new CMS.

---

# 38. WordPress Post Classification

A WordPress `Post` is classified by public meaning rather than storage type.

Possible target meanings include:

```text
WordPress Post
      ↓
Public meaning
      ├── News
      ├── Activity
      ├── Announcement
      ├── Health Content
      ├── Document-led content
      ├── legacy Page-like misuse
      └── Review / Exclude
```

The classifier may use deterministic evidence such as Title, Category, URL path, dates, body patterns, attachments, and known legacy sections, but ambiguous meaning requires review.

---

# 39. News, Activity, Announcement, and Health Content Mapping

## 39.1 News

Map to `News` when the primary meaning is time-bound communication, public relations, or news/information updates without a more specific lifecycle.

## 39.2 Activity

Map to `Activity` when the content primarily records an event that occurred, especially where date, place, participants, and activity context are meaningful.

A legacy Post written in the pattern “วันที่ … นาย… พร้อมด้วยคณะเจ้าหน้าที่เข้าร่วม…” is normally stronger evidence for `Activity` than generic `News`.

## 39.3 Announcement

Map to `Announcement` when the content has an announcement lifecycle such as recruitment, invitation, result announcement, application window, deadline, or closure/expiry behavior.

`Announcement` must not be flattened into `News` when `Closed / Expired` semantics are meaningful.

## 39.4 Health Content

Map evergreen public-health knowledge, prevention guidance, disease information, or reusable health advice to `Health Content`, even if it was historically stored in WordPress Posts or a news category.

Evergreen health information is not forced into `News` merely because of legacy publishing location.

---

# 40. Document-led Legacy Posts

Some legacy Posts exist mainly as a wrapper around an authoritative PDF or other standalone document.

When the meaningful public identity is the document itself:

```text
Legacy Post
→ Document becomes canonical target
→ Legacy Post URL maps/redirects to the Document canonical destination
```

The migration should not create an empty or low-value News record merely to preserve a WordPress wrapper.

If the Post contains meaningful editorial context in addition to the document, the relationship may remain separate and must be mapped according to actual meaning.

---

# 41. WordPress Page Classification

A legacy `Page` may represent many target Domains, including:

- Basic Page
- Personnel
- Organization
- Health Service
- Service
- Contact Information
- Document-led content
- ITA landing / structure
- other semantic public landing pages

Therefore `Page → Basic Page` is not a default one-to-one migration rule.

The Frozen Information Architecture and Content Model determine the target representation.

---

# 42. Structured Resources Are Extracted from Legacy Pages Where Appropriate

Legacy pages that manually embed structured information should be decomposed into the canonical structured resources already defined by the Frozen Content Model.

Examples:

```text
Legacy “บุคลากร” page
→ Personnel records
→ /about/personnel
```

```text
Legacy “โครงสร้างองค์กร” page
→ Organization records / relationships
→ /about/organization
```

```text
Legacy Health Service listing page
→ Health Service records
→ Health Service Directory
```

```text
Legacy “ติดต่อเรา” page
→ central Contact Information records and related public channels
```

The migration does not preserve an HTML list or organizational screenshot as the Source of Truth where a structured canonical representation is available.

---

# 43. Media Inventory Is Usage-aware

Media inventory records not only files but how each asset is used, including whether it is:

- referenced by public content
- a featured/cover image
- an authoritative document
- supporting Media
- generated WordPress derivative
- duplicate
- broken
- orphaned/unreferenced

Migration decisions follow public value and canonical relationships rather than copying the entire uploads directory.

Original/canonical assets are preferred over generated thumbnail variants when the new system can generate presentation derivatives itself.

---

# 44. PDF and Document Classification

A PDF is classified by what it represents, not by its file format.

Examples:

| Legacy PDF Meaning | Target Mapping |
|---|---|
| official order / form / guide / public document | Document |
| health situation/report | Health Report + Report Document relationship |
| ITA evidence | ITA Evidence relationship, using Document where applicable |
| service form | Document referenced by Service |
| supporting attachment | supporting Document/Media according to meaning |

The new CMS does not introduce a generic `PDF` content type.

---

# 45. Orphaned, Generated, Broken, and Duplicate Media

Unreferenced uploads, old generated thumbnails, temporary files, duplicate documents, and broken assets do not automatically migrate.

They enter `Review Required`, `Do Not Migrate`, or `Retain in Backup Only` according to evidence.

An apparently orphaned asset is not deleted blindly when it may be important but disconnected because a legacy link is broken; high-value uncertain files should be reviewable.

---

# 46. Legacy Categories and Tags Are Evidence, Not Target Taxonomy

WordPress Categories and Tags help classification but are not automatically copied into the new taxonomy model.

Presentation-oriented legacy categories such as:

- Slider
- Homepage
- Featured
- หน้าแรก
- menu/layout helper categories

are treated as presentation debt rather than Topic/Domain semantics.

Tags are especially non-authoritative because they may be inconsistent, duplicated, typo-prone, one-off, or SEO-oriented.

Version 1 does not blindly migrate all Tags. Useful legacy taxonomy values may inform clean target metadata only when their meaning is validated.

---

# 47. Legacy Menus Are Navigation Evidence, Not Sitemap Authority

The Frozen Sitemap remains authoritative.

Legacy WordPress menus are inventoried to:

- discover important public URLs
- identify pages that may otherwise be missed
- understand former navigation intent
- support redirect mapping
- identify external service/agency links that may still be useful

The old menu hierarchy is not copied one-to-one into the new Information Architecture.

External links are reviewed for continued validity and mapped to the relevant target Domain only when still useful.

---

# 48. WordPress User Inventory Boundary

Legacy Users are inventoried for two purposes only:

1. trustworthy historical attribution evidence
2. identifying real people who may need controlled onboarding into the new CMS

Possible working classifications include:

- Active and required for new CMS onboarding
- Historical attribution only
- Inactive
- Unknown / system / plugin account

Legacy `admin`, service, bot, plugin-created, or otherwise non-human accounts do not automatically become CMS Users.

Authentication state, password hashes, and WordPress Roles remain outside automatic migration as already established in the Migration Foundation.

---

# 49. Deterministic Classification Before Manual Review

Migration tooling may use deterministic rule-based signals such as:

- WordPress post type
- Category / Tag evidence
- Title / URL patterns
- date and lifecycle clues
- attachment/file type
- parent/hierarchy
- known legacy section
- content structure or repeated text patterns

Clear cases may be proposed or mapped automatically.

Ambiguous meaning is never guessed into a public target. It enters `Review Required`.

A confidence concept may exist in migration tooling, but Version 1 does not require ML/AI classification or a CMS confidence-scoring feature.

---

# 50. Baseline Content Mapping Matrix

| Legacy Public Meaning | Frozen Target Model |
|---|---|
| ข่าวประชาสัมพันธ์ | News |
| บันทึกกิจกรรมที่เกิดขึ้น | Activity |
| ประกาศที่มีช่วงใช้งาน / วันปิด | Announcement |
| ความรู้ / คำแนะนำสุขภาพ evergreen | Health Content |
| หน้าเนื้อหาทั่วไป | Basic Page |
| บุคลากร | Personnel |
| หน่วย / โครงสร้างองค์กร | Organization |
| หน่วยบริการสุขภาพ | Health Service |
| บริการสำหรับประชาชน | Service |
| เอกสาร / แบบฟอร์ม / คำสั่ง | Document |
| รายงานสุขภาพ | Health Report |
| หลักฐาน / โครงสร้าง ITA | ITA + Evidence relationship |
| ที่อยู่ / โทรศัพท์ / อีเมล / public channel | Contact Information |
| ภาพ / สื่อประกอบ | Media |
| legacy presentation/menu metadata | Not migrated as public content |

This matrix is a baseline mapping aid; target validation and Domain meaning remain authoritative.

---

# 51. Migration Supports 1→1, 1→Many, and Many→1 Mapping

Migration is not restricted to one legacy item becoming one target record.

Examples:

### One legacy page → many structured resources

A legacy Contact page may become multiple Contact Information records and relationships.

### Many legacy records → one canonical resource

A Contact page, footer widget, and duplicate address page may consolidate into one canonical Contact Information set.

The migration manifest must preserve traceability for all contributing sources so consolidation does not erase provenance.

---

# 52. Practical Duplicate Detection

Duplicate review may use practical deterministic evidence such as:

- duplicate/alias URLs
- identical or clearly repeated Titles
- obvious repeated content
- file hashes for Media/Documents
- the same canonical subject represented in several legacy locations

Version 1 does not require an advanced fuzzy duplicate-detection platform.

Automation may flag likely duplicates, but ambiguous consolidation decisions remain reviewable.

---

# 53. Target Lifecycle Is Derived from Meaning and Evidence

Legacy WordPress status does not directly determine the target lifecycle.

A legacy `Published` record may become:

- Current Public
- Historical Public
- Redirect Only
- Do Not Migrate
- Backup Only

A legacy Draft is not automatically published in the new CMS.

Target lifecycle follows:

```text
Legacy evidence
+ Migration Decision
+ Frozen Domain lifecycle semantics
→ Target state / public behavior
```

Unknown lifecycle facts are never fabricated.

Examples:

- old Announcement may map to Closed/Expired historical behavior when evidence supports it
- old Document may map to Expired/Superseded/Archived only when the relationship/status is known
- old Health Service must not be guessed `Inactive` solely because the page is old

---

# 54. Legacy Dates Are Interpreted by Domain Meaning

WordPress `post_date` and `post_modified` are evidence, not universal target dates.

Target Domains may need distinct concepts such as:

- Published Date
- Activity Date
- Announcement opening/closing period
- Document Date
- Reporting Period
- Fiscal Year

A trustworthy date explicitly present in content may be extracted where its meaning is clear.

For example, an Activity text stating “วันที่ 12 สิงหาคม 2569 …” may support Activity Date, while the WordPress upload date alone must not be assumed to represent the event date when evidence conflicts or is ambiguous.

Ambiguous semantic dates enter review rather than being fabricated.

---

# 55. Legacy Author and Attribution Semantics

WordPress Author does not automatically equal meaningful Public Author.

A shared account such as `admin` may only indicate who uploaded the content.

Migration may preserve legacy account information for traceability while keeping concepts distinct:

- trustworthy Original Author / source attribution
- legacy uploader/account
- migration/import actor
- unknown actor

Unknown authorship is preserved as unknown rather than inventing a staff identity.

---

# 56. Target Validation Applies to Imported Records

Import does not bypass the Frozen Content Model, Roles/Permissions, Publishing Workflow, or Search public-eligibility rules.

A target record must satisfy its Domain validation before becoming Public.

Examples:

- Health Service requires the required structured fields/Area relationships before current Public use
- Document requires its required metadata/file/lifecycle semantics
- Service requires valid ownership/delivery meaning

When legacy content is valuable but target metadata is incomplete, migration may create a structurally valid Draft / Review Required item rather than fabricating missing data or publishing incomplete content.

---

# 57. One Migration Manifest Is the Working Source of Truth

The migration process maintains one explicit manifest/dataset outside the legacy WordPress application.

The physical representation may later be CSV, spreadsheet, SQL, JSON, or migration tooling, but conceptually it records each discovered source and its:

- source identity
- discovery metadata
- classification
- migration decision
- target mapping
- lifecycle/public decision
- redirect treatment
- validation state
- exception/review state
- migration outcome

Migration progress is not tracked by modifying the production WordPress database with migration-specific plugin fields unless an implementation need is later justified.

---

# 58. Exception Queue and Risk-based Human Review

Human review focuses on exceptions rather than every record.

Examples of Review Required conditions:

- ambiguous classification
- missing target relationship
- duplicate candidate
- broken/high-value document
- uncertain semantic date
- unknown current/historical value
- incomplete required structured data

Higher-risk/high-value Domains receive stronger manual review, including:

- Personnel
- Health Service
- Service
- Contact Information
- ITA
- current Documents
- Health Reports
- important organizational pages

Large volumes of lower-risk historical News/Activity may use more automation plus exception review and risk-based sampling.

---

# 59. Migration Decision Completeness

A legacy item is not considered migration-complete until the working manifest can answer, as applicable:

```text
What is this legacy item?
Should it survive?
What target resource/domain represents it?
What target lifecycle/public behavior applies?
What happens to its old URL?
Did migration/validation succeed?
Does it still require review?
```

A missing answer becomes an explicit exception rather than an implicit assumption.

---

# 60. Accepted Legacy Inventory, Classification & Content Mapping Strategy

**Sections 34–59 = Accepted Legacy Inventory, Classification & Content Mapping Strategy.**

Accepted baseline:

- Inventory, Classification, Migration Decision, and Target Mapping are separate steps; WordPress storage type never determines the target Domain by itself.
- inventory covers Posts, Pages, Media/Documents, Taxonomies, Navigation, Users, and evidence-backed custom content structures while retaining legacy identity/URL traceability.
- every known legacy Public URL remains inventoried independently of whether the content migrates.
- legacy Posts map by public meaning into News, Activity, Announcement, Health Content, Document-led content, or review/exclusion rather than universally becoming News.
- legacy Pages are decomposed into structured Frozen resources where appropriate; Personnel, Organization, Health Service, Service, Contact, ITA, and Documents are not flattened into generic Basic Pages.
- media inventory is usage-aware; orphaned/generated/duplicate/broken assets are reviewed rather than blindly copied.
- PDFs/Documents are classified by business/public meaning and relationships; `PDF` is not a target Content Type.
- legacy Categories/Tags are classification evidence, not authoritative target taxonomy; presentation categories/tags are left behind.
- legacy menus support discovery/redirect analysis but never override the Frozen Sitemap.
- WordPress Users support trustworthy attribution review and controlled onboarding only; authentication state/legacy Roles remain outside automatic migration.
- deterministic rule-based classification handles clear cases while ambiguous meaning enters Review Required; Version 1 does not require AI/ML classification.
- the baseline mapping matrix maps legacy meaning into the Frozen Content Model and remains subordinate to Domain validation.
- migration supports 1→1, 1→Many, and Many→1 mappings while preserving provenance.
- practical duplicate detection uses URLs, repeated content/title evidence, canonical subject, and file hashes without an advanced duplicate platform.
- legacy Published/Draft status does not directly determine target lifecycle; lifecycle/public behavior follows Domain meaning and available evidence without fabrication.
- legacy dates are interpreted semantically per Domain rather than copied blindly from `post_date`.
- legacy account/author data remains traceable but is not automatically presented as trustworthy Public Author.
- imported records pass the same Frozen target validation and may remain Draft/Review when data is incomplete.
- one external migration manifest is the working Source of Truth for source identity, decisions, mappings, redirects, exceptions, validation, and outcomes.
- human review is exception-focused and risk-based, with stronger review for Personnel, Health Service, Service, Contact, ITA, current Documents, Health Reports, and important organizational content.
- a migration item is complete only when its identity, preservation decision, target mapping/lifecycle, legacy URL treatment, migration outcome, and review status are explicit.

---

# 61. Migration Decision and Target Lifecycle Are Separate

Migration Decision และ Target Lifecycle ตอบคนละคำถาม:

```text
Migration Decision
→ ควร preserve legacy item นี้ในระบบใหม่หรือไม่ และในบทบาทใด?

Target Lifecycle
→ ถ้า preserve แล้ว Domain record ควรอยู่สถานะใดตามความจริง?
```

ตัวอย่าง:

```text
Decision: Migrate — Historical
Target:
- Announcement → Closed / Expired
- Document → Superseded / Expired / Archived
- News / Activity → Historical Public ตาม Domain semantics
```

Legacy `Published` ไม่ได้หมายความว่า Target ต้องเป็น Current/Published.

---

# 62. Canonical Migration Decision Categories

Version 1 ใช้ decision categories ต่อไปนี้:

| Decision | Meaning |
|---|---|
| `Migrate — Current` | ข้อมูลยังถูกต้องและประชาชนควรใช้เป็นข้อมูลปัจจุบัน |
| `Migrate — Historical` | ไม่ Current แล้ว แต่มี legitimate public reference/history value |
| `Review Required` | ความหมาย ความถูกต้อง ความเสี่ยง หรือ lifecycle ยังตัดสินไม่ได้ |
| `Redirect Only` | ไม่สร้าง legacy content เป็น resource ใหม่ แต่ URL เดิมมี meaningful successor |
| `Retain in Backup Only` | เก็บเพื่อ record/backup แต่ไม่อยู่ใน public system ใหม่ |
| `Do Not Migrate` | duplicate/test/generated/obsolete item ที่ไม่มี legitimate preservation value |

Decision categories ไม่ใช่ Content lifecycle states และไม่ถูก expose เป็น public status.

---

# 63. Current and Historical Decision Criteria

`Migrate — Current` ต้องผ่านการประเมินมากกว่าเพียง legacy record ยังเป็น `Published`.

อย่างน้อยต้องพิจารณา:

- ข้อมูลยังถูกต้องหรือไม่
- ยังมี operational/public use จริงหรือไม่
- มี successor หรือ canonical source ใหม่กว่าหรือไม่
- target metadata สามารถยืนยันได้หรือไม่
- การเปิดเผยต่ออาจทำให้ประชาชนเข้าใจผิดหรือไม่

หากยังตอบไม่ได้ → `Review Required`.

`Migrate — Historical` ใช้เฉพาะเมื่อมี legitimate public reference value; ไม่ใช่ถังรวมทุกสิ่งที่เคย Public.

---

# 64. Historical Public Requires Explicit Context

Historical content ที่ migrate ต้องแสดง Domain lifecycle/context ที่ทำให้ประชาชนแยกจาก Current ได้ เช่น:

```text
ข้อมูลย้อนหลัง
หมดอายุ
ถูกแทนที่แล้ว
ปีงบประมาณ 2568
```

ไม่แก้ Title แบบ manual เช่น `[เก่า]` หาก lifecycle/metadata สามารถสื่อความหมายได้อย่างเป็นระบบ.

หลัก:

> **Historical preservation must not make obsolete information look current.**

---

# 65. News and Activity Retention Bias

## News

- News ที่ยังมี current communication value → `Migrate — Current`.
- News เก่าที่เป็น legitimate institutional record และไม่เสี่ยงทำให้เข้าใจผิด → `Migrate — Historical` ได้ค่อนข้างกว้าง.
- ข่าวที่มี operational instruction หมดอายุแล้วต้องออกจาก current prominence; historical preservationขึ้นกับ reference value.
- duplicate/test/empty/broken records ไม่ต้อง preserve เพียงเพราะเคย Public.

## Activity

Activity โดยธรรมชาติเป็นเหตุการณ์ที่เกิดขึ้นแล้ว จึงมี historical value สูงกว่า operational content.

- legitimate Activities → โดย default เอนเอียงไปทาง `Migrate — Historical` เมื่อไม่ Current.
- duplicate, test, empty หรือ quality ต่ำจนไม่มีประโยชน์ → Review / Do Not Migrate.

อายุอย่างเดียวไม่ทำให้ Activity สูญเสีย legitimate historical value.

---

# 66. Announcement Retention and Expiry

Announcement ต้อง map ตาม lifecycle จริง ไม่ใช่ legacy publication status.

- ยัง active/open อยู่จริง → `Migrate — Current`.
- deadline/period ผ่านแล้วแต่มี public reference value → `Migrate — Historical` + `Closed` / `Expired` ตาม Domain meaning.
- expired low-value announcement ที่ไม่มี reference value → `Retain in Backup Only` หรือ `Do Not Migrate` ตาม evidence.

ประกาศที่หมดอายุห้ามถูก import กลับเป็น Current เพียงเพราะ WordPress เดิมยัง `Published`.

---

# 67. Health Content Safety-First Retention

Health Content เป็น Domain ที่ต้อง review validity เข้มกว่าข่าว/กิจกรรม เพราะคำแนะนำเก่าอาจสร้าง public-health risk.

- ยังถูกต้องและผ่าน review/verification → `Migrate — Current`.
- outdated / guideline เปลี่ยน / อาจทำให้เข้าใจผิด → ไม่เป็น Historical Public โดย default.
- ทางเลือกสำหรับ outdated Health Content:
  - `Review Required`
  - update/rewrite แล้ว publish เป็น current content
  - `Redirect Only` ไป current successor
  - `Retain in Backup Only`

หลัก:

> **Historical value never outweighs public-health safety.**

---

# 68. Basic Page and IA Consolidation

Basic Page migration ต้องสอดคล้องกับ Frozen Information Architecture.

- หน้า current ที่ยังมี legitimate place ใน IA ใหม่ → `Migrate — Current`.
- หน้า legacy ที่ถูกแทนด้วย structured resource เช่น Personnel, Health Service, Contact หรือ Service → ไม่ migrate เป็น duplicate Basic Page; ใช้ `Redirect Only` หรือ consolidate ตาม mapping.
- หน้า legacy ที่ไม่มีตำแหน่งใน IA ใหม่ไม่ทำให้เราสร้าง navigation/section ใหม่เพียงเพื่อรักษาโครงสร้างเดิม.

Legacy IA ไม่สามารถ override Frozen Sitemap.

---

# 69. Personnel Retention

Personnel migration เน้น **current verified public records**.

- Active + public data verified → `Migrate — Current`.
- Inactive legacy Personnel → ไม่สร้าง standalone Historical Public profile โดย default.
- historical News/Activity ที่มีชื่อบุคลากรเดิมยัง preserve historical meaningได้ตาม lifecycleของ parent content.
- Personnel ที่ไม่พร้อมยืนยัน → `Review Required`, ไม่ใช้ Hidden เป็น parking state.

การ inactive Personnel ไม่ทำให้ระบบ rewrite legitimate historical contentย้อนหลัง.

---

# 70. Organization Retention

- Current organization structure → migrate เป็น structured Organization ตาม Frozen model.
- obsolete organization structure → `Retain in Backup Only` โดย default เว้นแต่มี explicit historical requirement.
- historical News/Documents อาจยัง preserveชื่อหน่วยงานตาม contextเดิม.

ไม่สร้าง public historical organization tree หลายยุคโดยไม่มี use caseจริง.

---

# 71. Health Service Verification and Retention

Health Service เป็น high-risk operational information จึงต้อง verify ก่อน `Migrate — Current` อย่างน้อย:

- Official/Display Name
- Type
- Area/location
- public Contact
- affiliation
- operational status

Rules:

- Active → `Migrate — Current` เมื่อ verified.
- Temporarily Closed → ยังเป็น `Migrate — Current` + Temporarily Closed เพราะเป็น current public information.
- Inactive → selective `Migrate — Historical` เฉพาะเมื่อมี legitimate historical public value; otherwise Backup Only.
- Hidden ไม่ถูกใช้เป็น migration parking state; unclear recordsต้อง `Review Required` หรือ Draft.

---

# 72. Service Retention Is Current-Truth First

Service คือ operational guidance ว่าประชาชนทำอะไร ที่ไหน และอย่างไร.

ดังนั้น:

- Service ที่ยังทำได้จริงและ ownership/channel/steps ถูกต้อง → `Migrate — Current`.
- Service ที่ข้อมูลเปลี่ยน → review/update ก่อน Publish.
- obsolete Service ที่มี successor → `Redirect Only` ไป current Service.
- obsolete Service ไม่มี successorแต่ต้องเก็บหลักฐาน → `Retain in Backup Only`.
- Historical Public Service เป็น exception ไม่ใช่ default.

หลัก:

> **Operational correctness is more important than preserving obsolete service instructions publicly.**

---

# 73. Document Current, Expired, and Superseded Semantics

Document decisionขึ้นกับ authority/version semantics:

- authoritative/current document → `Migrate — Current`.
- predecessorที่มี successor ชัด → `Migrate — Historical` + `Superseded` และ preserve `Superseded By` relationship.
- Expired document ที่ยังมี legitimate reference value → `Migrate — Historical` + `Expired`.
- Expired form/guide ที่เสี่ยงให้ประชาชนใช้ผิดฉบับ → เอนเอียงไป Backup/Redirect มากกว่าการเปิด Historical Public.

Superseded/Expired historical Documents ไม่ถูก redirectไป successorโดยอัตโนมัติใน ordinary case; Frozen Sitemap semanticsยังคงใช้.

---

# 74. Health Report Historical Preservation

Health Reports มี historical/reference value สูงโดยธรรมชาติ.

- current reporting period → `Migrate — Current`.
- legitimate prior reporting periods/Fiscal Years → `Migrate — Historical` ค่อนข้างกว้างเมื่อ file/metadataเชื่อถือได้.
- legacy Page + PDF ที่แทน report เดียวกันต้อง consolidate เป็น Health Report canonical resource + Report Document relationship ไม่ใช่สอง report records.

---

# 75. ITA Historical Retention by Fiscal Year

ITA ต้อง preserve Fiscal Year context อย่างชัดเจน.

- current Fiscal Year → `Migrate — Current`.
- legitimate prior Fiscal Years → `Migrate — Historical`.
- Requirement/Evidence relationshipsของแต่ละปีต้องคงของปีนั้นเอง.
- historical Evidence ห้าม auto-follow successor/newer Evidence.

ถ้า byte-identical Document reusedหลาย Requirement/ปีจริง resource reuseอาจทำได้ตาม Frozen model แต่ relationshipของแต่ละ Fiscal Year/Requirementต้องแยกชัด.

---

# 76. Contact Information and Media Retention

## Contact Information

Contact เป็น current-truth-first.

- verified current address/phone/email/channel → migrateตาม public structured Contact model.
- obsolete contact details → `Retain in Backup Only` โดย default ไม่เปิด Historical Publicเพียงเพื่อความครบถ้วน.

## Media

Media retentionตาม preserved canonical resourcesและ legitimate reuse:

- referenced/reusable official assets → migrate.
- orphan/generated thumbnail/duplicate derivative → Review / Do Not Migrate.

Media ageเพียงอย่างเดียวไม่เป็น retention rule.

---

# 77. De-duplication Goal and Boundary

เป้าหมายของ de-duplication ไม่ใช่ลดจำนวน records ให้ต่ำที่สุด แต่คือ:

> **One canonical resource per genuine public thing without destroying legitimate versions or history.**

De-duplication ต้องรักษา:

- canonical meaning
- historical/version relationships
- legacy URL traceability
- public/reference context

---

# 78. Exact Duplicate, Semantic Duplicate, and Historical Version

Migration แยกอย่างน้อย 3 กรณี:

### Exact Duplicate

ตัวอย่าง evidence:

- same file hash
- normalized bodyเหมือนกัน
- same title/date/content และไม่มีversion distinction
- duplicate URL variantsของ contentเดียวกัน

สามารถ auto-propose consolidationได้ค่อนข้างมั่นใจ แต่ legacy URLsทั้งหมดต้องยังอยู่ใน redirect mapping.

### Semantic Duplicate

สอง recordsพูดถึงสิ่งเดียวกันแต่คนละ presentation เช่น Contactหลายหน้า หรือ Service instructionsซ้ำหลายจุด.

ต้อง Reviewก่อน consolidate และเลือก targetตาม Frozen Content Model.

### Historical Version

เช่นคู่มือ 2568/2569 หรือประกาศฉบับเดิม/ฉบับแก้ไข.

ห้าม mergeเป็น duplicateเพียงเพราะ Title/เนื้อหาใกล้กัน; ต้อง preserve version/lifecycle relationship.

---

# 79. Redirect Outcomes After Consolidation

เมื่อหลาย legacy records consolidate เป็น canonical resourceเดียว:

```text
/old-a → /new-canonical
/old-b → /new-canonical
/old-c → /new-canonical
```

เป็น meaningful redirect.

`Redirect Only` เหมาะเมื่อ legacy pageถูก absorbเข้า structured canonical destination เช่น Personnel directory หรือ Contact/Service target.

Contentที่ถูกลบเพราะ test/garbage/ไม่มี successor ไม่ redirectไป Homepageหรือ generic categoryเพียงเพื่อหลีกเลี่ยง 404.

Exact redirect status semanticsค่อย defineในหัวข้อ Legacy URL Mapping.

---

# 80. Historical Privacy and Safety Review

Migration ไม่ถือว่า:

```text
Once Public = Always Public
```

Historical preservationต้อง re-evaluateตาม current public model โดยเฉพาะ:

- personal data
- obsolete contact details
- sensitive images/context
- outdated health/operational guidance

Legacy privacy debtไม่ถูกย้ายมาเป็น baselineของระบบใหม่เพียงเพราะข้อมูลเคยเผยแพร่.

---

# 81. Migration Decision Precedence

แนะนำ decision order:

```text
1. Is it legitimate content?
2. Is it duplicate or a genuine historical version?
3. Is it currently valid?
4. Does it have legitimate Historical Public value?
5. Could Public preservation mislead or create privacy/safety risk?
6. Is there a meaningful successor/canonical target?
7. What target lifecycle represents the truth?
8. What should happen to the legacy URL?
```

Ageไม่ใช่คำถามแรก.

---

# 82. No Universal Age-based Retention Rule

Version 1 ไม่ Freeze rule เช่น:

```text
News > 5 years → delete
Announcement > 2 years → delete
```

Ageสามารถเป็น review signal แต่ไม่ใช่ universal decision authority.

หากอนาคตต้องมี retention duration ต้องมีเหตุผลจาก law, policy, operational requirement, storage/volume evidence หรือ governanceจริง และทำ Impact Reviewก่อน.

---

# 83. Default Domain Migration Bias

ตารางนี้เป็น **default bias** ไม่ใช่ hard rule:

| Domain | Default Bias |
|---|---|
| News | Preserve legitimate Historical broadly |
| Activity | Preserve legitimate Historical relatively broadly |
| Announcement | Current + selected meaningful Historical |
| Health Content | Current only after validity review; outdated tends to Review/Redirect/Backup |
| Basic Page | Preserve only what fits current IA/canonical meaning |
| Personnel | Primarily current structured Public records |
| Organization | Primarily current structured organization |
| Health Service | Current verified records; selective Historical |
| Service | Current operational services primarily |
| Document | Current + meaningful Expired/Superseded history |
| Health Report | Current + Historical broadly |
| ITA | Current + Historical by Fiscal Year |
| Contact Information | Current verified data only |
| Media | Follow preserved/reused canonical resources |

Evidenceสามารถ override biasได้โดยมี recorded decision.

---

# 84. Migration Manifest Decision Fields

Migration manifest ควรบันทึกอย่างน้อยเชิง concept:

```text
migration_decision
decision_reason
target_content_type
target_lifecycle
canonical_target
legacy_url_action
duplicate_group
successor_predecessor_relation
review_required
```

`decision_reason` ควรสั้นและ structured เช่น:

- Current Valid
- Legitimate Historical
- Superseded by X
- Duplicate of X
- Obsolete Operational Guidance
- Broken/Test Content
- Privacy Review Required

Manifest คือ traceability recordของ migration ไม่ใช่ public content.

---

# 85. Explicit Non-goals for Decision and De-duplication

Version 1 ไม่ต้องมี:

- AI auto-decision for migration
- migration score 0–100
- “keep everything just in case” policy
- universal old-content deletion policy
- de-duplication by Title alone
- automatic republishing of old Health Content
- automatic activation of legacy Services/Health Services
- automatic merge of historical versions
- enterprise records-retention platform

Complexityเพิ่มเฉพาะเมื่อ evidence/use caseจริง justify.

---

# 86. Accepted Migration Decision Rules, Historical Retention & De-duplication Policy

**Sections 61–85 = Accepted Migration Decision Rules, Historical Retention & De-duplication Policy.**

Accepted baseline:

- Migration Decision and Target Lifecycle are separate; legacy publication state never determines target public state by itself.
- Current/Historical decisions depend on validity, public value, risk, duplication, and successor relationships rather than age alone.
- Historical Public is selective and must expose explicit Domain lifecycle context so obsolete information is not mistaken for Current.
- News/Activity generally favor legitimate historical preservation; Announcement preserves Current plus selected meaningful historical records.
- Health Content and Service use safety/current-truth-first retention; obsolete guidance is reviewed, redirected, updated, or kept Backup-only rather than remaining misleading Historical Public by default.
- Personnel primarily preserves verified current public structured records; Inactive Personnel do not automatically receive standalone historical profiles while legitimate historical relationships remain intact.
- Organization primarily preserves current structure; obsolete organization trees are Backup-only absent a real historical requirement.
- Health Service Current migration requires verification; Temporarily Closed remains Current, Inactive historical visibility is selective, and Hidden is never a migration parking state.
- Documents may retain meaningful Expired/Superseded history with successor relationships; historical versions are not duplicates.
- Health Reports preserve legitimate reporting history broadly; ITA preserves Fiscal Year-specific historical context and never auto-links historical Evidence to newer successors.
- Contact Information is current-first; obsolete contact details are not public historical records by default.
- de-duplication distinguishes Exact Duplicate, Semantic Duplicate, and Historical Version; consolidation must never destroy legitimate version/history semantics.
- duplicate legacy URLs may resolve to one canonical target, while unrelated removed content never receives a generic Homepage/category redirect.
- historical preservation re-evaluates privacy/safety under the new public model; `Once Public = Always Public` is explicitly rejected.
- no universal age-based retention/deletion threshold is Frozen in Version 1.
- manifest decisions retain concise reasons, target lifecycle/type, duplicate/version relations, review requirement, and legacy URL outcome.
- AI migration scoring/auto-decisions, title-only dedup, automatic legacy Service/Health Content activation, and enterprise retention tooling are excluded from Version 1.

---

# 87. Next Discussion Topic

> **Legacy URL Mapping, Redirects & Link Rewrite Strategy**

The next step is to define how every known legacy public URL is treated after migration, including meaningful redirects, duplicate/absorbed URLs, `404` / `410` semantics, query strings and attachment URLs, internal-link rewriting, redirect-chain prevention, and validation—without prematurely choosing Nginx/Node routing implementation.

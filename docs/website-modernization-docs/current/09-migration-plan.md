# Migration Plan — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 09-migration-plan
> **Status:** CLEAN REBASELINE v2.1 — CURRENT
> **Version:** 2.1
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md` through `08-search.md`
> **Purpose:** กำหนดการย้ายจาก Legacy WordPress เข้าสู่ Songhealth ใหม่โดยใช้ importer ของ CMS ก่อน และเพิ่ม custom migration code เฉพาะ semantic gaps

---

# 1. Principle

> **WordPress is the migration source, not the target model.**

> **Use the native importer first; customize only mapping gaps.**

Migration ต้องรักษาความหมายของ content, URL continuity, useful history และ public safety โดยไม่ย้าย WordPress technical debt เข้ามา.

---

# 2. Source Evidence

Legacy evidence ที่เคยตรวจแล้วและยังมีคุณค่า:

| Evidence | Artifact | Integrity |
|---|---|---|
| WordPress SQL | `wordpress-baseline-20260828-185101.sql.gz` | SHA-256 `279977812ace31c24df7085455cfa249b8804e0c02bd70d85663ea7cef768597` |
| Upload inventory | `uploads-inventory.tsv.gz` | SHA-256 `9240f8bf7f849909101ddfa9626bac0cad653198fce648e79a2d39a0b5dd13f0` |
| API/discovery artifacts | `wordpress-api-audit*` | discovery evidence |

SQL dumps/credentials/private form submissionsไม่ commit เข้า repo.

---

# 3. Target

Target meaning มาจาก:

- `01` Information Architecture
- `02` Content Model
- `03` slug-based Sitemap
- `05–07` native-first Admin/access/publishing
- `08` native-first Search
- `10` Astro + EmDash architecture

WordPress post type/category/status/ID ไม่เป็น authority ของ target model.

---

# 4. Preferred Import Path

Version 1 ใช้ EmDash WordPress import flow เป็น first path:

1. WXR export เมื่อข้อมูลที่ต้องใช้มีใน WordPress export
2. EmDash Exporter plugin เมื่อควบคุม source site และต้องการ authenticated content/custom fields/menus/settings/SEO ที่รองรับ
3. native Analyze/Review/Prepare/Import/Copy Media flow

ใช้ native importer สำหรับสิ่งที่รองรับก่อน:

- posts/pages/custom post types
- standard fields
- authors/bylines
- taxonomies
- menus/settings/SEO ที่ importer รองรับ
- media copy + byte-hash deduplication
- URL rewriting ภายใน imported content

ไม่เริ่มจาก raw-table copier หรือ custom importer framework.

---

# 5. Songhealth Mapping

ก่อน import ต้องสร้าง/ยืนยัน target collections ตาม `02-content-model.md`.

Legacy content map ตาม public meaning เช่น:

- public news → News
- event/activity content → Activity
- notices/procurement/official notices → Announcement เมื่อ semantics ตรง
- evergreen health knowledge → Health Content
- reusable PDF/form/report → Document
- office/facility/personnel structured data → corresponding structured collection
- ITA evidence → Fiscal Year/Section/Requirement/Evidence model
- leftover standalone prose → Basic Page only when no structured model fits

Native importer mappingใช้ได้เฉพาะเมื่อ target semantics ตรง. Custom conversion script/source เพิ่มเฉพาะกลุ่มที่ต้อง decompose/transform จริง.

---

# 6. Status Mapping

Native WordPress importer maps source states into CMS lifecycle conservatively; non-published/ambiguous statesต้องเข้า Draft/reviewก่อน publish.

Migration ต้องไม่ reconstruct custom Approval/Module Scope workflow เพราะ Version 1 target ไม่มีระบบเหล่านั้น.

Scheduled/private/pending legacy contentต้อง review ตามความหมายจริงก่อน publication.

---

# 7. Identity and URLs

Target uses:

- CMS-generated stable internal content ID
- slug-based canonical public URL ตาม `03`

Legacy WordPress ID ใช้ได้ชั่วคราวเพื่อ trace/mapping แต่ไม่กลายเป็น Songhealth Public ID.

Source slug อาจ reuse เมื่อเหมาะและ unique. หาก slug เปลี่ยน ให้สร้าง explicit redirect old → new.

WordPress URL inventory ต้อง classify:

- redirect to exact new canonical URL
- redirect to meaningful successor
- retain historical destination
- Gone/404 when no valid target exists

ห้าม redirect ทุก URL ไป homepage.

---

# 8. Media

ใช้ native media copy/deduplicationก่อน custom file tooling.

Rules:

- copy only legitimate source assets
- validate failures/missing binaries
- generated thumbnails/derivativesไม่ต้องย้ายทุกไฟล์
- rewrite imported content URLs to target media URLsเมื่อ native importerรองรับ
- CMS media is public-publishable website storage; confidential legacy filesต้องไม่ถูกนำเข้าโดยอัตโนมัติ

---

# 9. Authors and Users

Presentation attributionกับ CMS loginเป็นคนละเรื่อง.

- map trusted source authors to existing/new CMS usersเมื่อเหมาะ
- unmapped source authorใช้ guest bylineได้
- ไม่ copy WordPress password hashes/roles/sessions
- target accessใช้ native EmDash RBAC ตาม `06`/`10`

---

# 10. Search

ไม่ migrate legacy WordPress search index.

หลัง import ให้ native target search index/rebuildทำงานจาก target collections/fields.

Search verificationใช้ representative Thai queriesตาม `08`.

---

# 11. Redirects and 404

Use target CMS native redirects/404 log first.

ก่อน cutover:

- register known changed WordPress URLs
- test one-hop redirect
- verify no redirect loop
- crawl representative old URLs

หลัง launch ใช้ 404 logหา missing mappings.

ไม่สร้าง custom redirect registryถ้า native facilityเพียงพอ.

---

# 12. Known Evidence Exceptions

รายการที่ยังต้อง explicit disposition:

- **ANOM-001 HIGH:** ITA 2567/MOIT-2 attachment 1479 binary missing
- **ANOM-002 LOW:** 2 PM2.5 public-new records missing taxonomy
- **ANOM-003 MEDIUM:** Activity semantic event date differs from `post_date` in at least one record
- **ANOM-004 / MODEL-GAP-001 MEDIUM:** 5 internal ITA link references / 3 destinations require semantic review
- **ANOM-005 MEDIUM:** Ethics fiscal-year label/link mismatch
- **ANOM-006 HIGH:** 17 Health Services require authoritative verification; 3 lack phone
- **ANOM-007 MEDIUM:** Personnel Position/Role/Assignment/Unit semantics require verification
- **ANOM-008 LOW:** 81 unreferenced attachment exceptions require risk-based classification

ระดับความเสี่ยงเดิมเป็น migration evidence; การแก้แต่ละรายการต้องไม่ขยาย Product modelโดยเงียบ ๆ.

---

# 13. Trial Migration

ก่อน Trial:

1. backup source evidence
2. build target content model
3. select WXR/Exporter path
4. document post-type/collection mappings
5. identify custom transformations that native importer cannot perform
6. prepare redirect mapping

Trial importควรทำใน isolated/staging target และ repeatได้โดยไม่แตะ production target.

ตรวจ:

- counts by mapped collection
- Draft/Published state
- representative rich content
- media completeness
- references/relations
- authors/bylines
- Thai text
- canonical URLs
- redirects
- search
- anomalies above

---

# 14. Delta and Cutover

เพราะ legacy WordPress อาจเปลี่ยนระหว่าง development:

- ทำ initial import/trial
- กำหนด content-freeze window ก่อน final delta
- rerun supported native import/delta pathอย่างควบคุม
- reconcile source → target
- switch canonical traffic
- retain source rollback window

ไม่สร้าง permanent dual-write/sync ระหว่าง WordPress กับ EmDash.

---

# 15. Rollback

ก่อน production cutoverต้องมี:

- restorable source backup
- restorable target PostgreSQL backup
- target media backup
- DNS/proxy rollback procedure
- record of final redirect/import configuration

Rollback ไม่ต้องเป็น distributed transaction; ต้องเป็น practical operational recovery.

---

# 16. Native Importer Boundary

Native importerไม่จำเป็นต้อง solveทุก Songhealth semantic mapping.

สร้าง custom migration codeเมื่อ:

- source dataต้อง split/merge into multiple target collections
- plugin/ACF structureต้อง transform
- ITA relation mapping native importerทำไม่ได้
- legacy date/statusต้อง deriveจาก evidenceอื่น

Custom codeควรเป็น temporary migration tooling ไม่ใช่ permanent application layer.

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
Documentation baseline          = CURRENT
Trial import                    = NOT AUTHORIZED
Production import               = NOT AUTHORIZED
Final cutover                   = NOT AUTHORIZED
WordPress retirement            = NOT AUTHORIZED
```

Implementation/specification หลัง merge ต้องกำหนด exact migration runbook และขอ authorization แยก.

---

# 19. Acceptance

Migration Plan ผ่านเมื่อ:

- native import pathเป็น default
- custom transform listถูกจำกัดเฉพาะ gaps
- known anomaliesยัง traceable
- slug/redirect architectureตรง `03`
- no custom Role/Approval/Search/Public-ID systemsถูก migrateเข้ามา
- rollback/backup requirementsชัดเจน

> **Migrate content meaning, not old architecture.**

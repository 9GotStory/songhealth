# System Blueprint — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 10-system-blueprint
> **Status:** CLEAN REBASELINE v2.1 — CURRENT
> **Version:** 2.1
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md` through `09-migration-plan.md`
> **Purpose:** กำหนด architecture ปัจจุบันที่ใช้ Astro + EmDash แบบ platform-native และเพิ่ม Songhealth-specific code เฉพาะ gap ที่พิสูจน์แล้ว
> **Implementation Authorization:** NONE

---

# 1. Architecture Principle

> **EmDash-native first. Songhealth extensions only for demonstrated gaps.**

Clean Rebaseline v2.1 ถอนสมมติฐานว่า Songhealth ต้องมี application/domain/policy layer ของตนเองก่อนเริ่มพัฒนา.

การมี helper/module ที่ share กันในอนาคตเป็น code-organization decision จาก duplication/gap จริง ไม่ใช่ architecture layer ที่ต้องสร้างล่วงหน้า.

---

# 2. Technical Baseline

- Public runtime: **Astro SSR**
- CMS/Admin: **EmDash integrated in the Astro application**
- Language: **TypeScript**
- Database: **PostgreSQL**
- Media: **persistent storage supported by deployment**
- Runtime: **supported Node.js version compatible with selected Astro/EmDash release**

Pin dependency versions in implementation manifests/lockfiles. EmDash upgrade requires database backup, migration check and smoke/regression verification.

---

# 3. Runtime Shape

```text
Internet
   │
   ▼
HTTPS / Reverse Proxy
   │
   ▼
┌──────────────────────────────────────┐
│         Astro + EmDash Runtime       │
│                                      │
│  Astro SSR Public Site              │
│  EmDash Admin                       │
│  EmDash Content / Search / Media    │
│  small feature-local helpers/hooks  │
└──────────────────┬───────────────────┘
                   │
              PostgreSQL
                   │
              Media Storage
```

ไม่มี separate Songhealth backend, API server, Domain service, Policy service หรือ database ของ Songhealth CMS อีกชั้น.

---

# 4. Content Model

`02-content-model.md` เป็น semantic authority ของ Songhealth.

Map Content Types → EmDash collections/fields/relations/taxonomies โดยตรงเท่าที่เหมาะสม.

EmDash database model เป็น active runtime schema. Seed file ใช้ bootstrap/environment setup และ documentation intent; ไม่ถือเป็น automatic production migration mechanism.

Production schema change ต้อง:

1. backup
2. review impact
3. test against representative data
4. apply supported schema/content migration
5. regenerate types
6. verify public/admin paths

ไม่สร้าง ORM/domain entity layer เพื่อ mirror EmDash collections.

---

# 5. Admin CMS

ใช้ EmDash Admin เป็น primary admin surface ตาม `05-admin-cms.md`.

ใช้ collection labels/groups, field widgets, relations, menus, widget areas, settings และ plugins ก่อน custom UI.

Admin localization ใช้ platform translation mechanism. ไม่ fork Admin UI เพียงเพื่อ branding/Thai labels.

---

# 6. Authentication and Authorization

ใช้ EmDash native authentication + RBAC + ownership เป็น Version 1 baseline.

Native roles:

- Subscriber
- Contributor
- Author
- Editor
- Admin

Songhealth **ไม่สร้าง role hierarchy, Module Scope หรือ permission database ของตนเอง**.

Responsibility mapping:

- draft-only staff → Contributor เมื่อเหมาะสม
- staff ที่ publish content ของตนเองได้ → Author เมื่อเหมาะสม
- staff ที่จัดการ content ทั้งหมด → Editor
- schema/users/plugins/settings/import/backup → Admin

Exact assignment เป็น operational policy ของสำนักงาน ไม่ใช่ job-title automation.

หากอนาคตต้องจำกัดสิทธิ์ตาม collection/module จริง ให้เปิด architecture review ก่อน custom authorization.

---

# 7. Publishing

ใช้ EmDash native lifecycle:

- draft
- published
- scheduled
- live + pending draft revision
- unpublish
- Trash/restore/permanent delete
- revisions
- preview
- edit locking
- optimistic concurrency

ไม่มี custom Approval Workflow ใน Version 1.

Contributor ที่ไม่มี publish permission เขียน Draft แล้ว Author/Editor ที่เหมาะสมตรวจและ Publish.

ใช้ hooks เฉพาะ mandatory Songhealth validation ที่ schema/relation constraints ทำไม่ได้.

Domain metadata เช่น announcement expiry, health-service operational status, document successor/expiry และ ITA fiscal-year semantics ไม่กลายเป็น universal CMS workflow states.

---

# 8. Public Routing and Identity

Astro owns public page composition/routes; EmDash provides routable collection metadata, stable internal content IDs, slugs and public URL resolution.

Version 1 ใช้ **slug-based canonical URLs** ตาม `03-sitemap.md`; ไม่สร้าง Songhealth Public ID อีกชุด.

EmDash content ID เป็น stable internal identity สำหรับ relations/automation ไม่จำเป็นต้องเป็น public URL segment.

Published slug changesใช้ native redirect behavior. Legacy/moved routesใช้ native redirects/404 log ก่อนสร้าง redirect subsystem เพิ่ม.

---

# 9. Public Content Reads

Astro SSR ใช้ EmDash query functionsโดยตรง.

Public collection readsต้องอ่าน published content. Draft previewใช้ signed preview flow ของ EmDash.

ไม่สร้าง Public REST API หากไม่มี external consumer จริง.

ไม่สร้าง generic repository/service wrapper รอบทุก query.

Feature-local helper สร้างได้เมื่อช่วย reuse presentation/domain calculation จริง เช่น formatting หรือ domain status label.

---

# 10. Search

ใช้ EmDash built-in search เป็น baselineตาม `08-search.md`.

สำหรับภาษาไทยใช้ collection search configuration/tokenizer ที่เหมาะกับข้อความไม่มี word separators (trigram) และกำหนด searchable fields/weightsอย่างพอดี.

ใช้ native global search API/function จาก server-side Astro; ไม่สร้าง Search Projection, index synchronization service, queue หรือ dedicated search engine.

Dedicated search technologyพิจารณาใหม่เฉพาะเมื่อ native search ไม่ผ่าน measured relevance/scale/UAT requirement.

---

# 11. Media

ใช้ EmDash Media Library + storage adapter + media usage tracking.

ไม่สร้าง DAM, media reference database หรือ protected-file delivery layer ใน Version 1.

Security boundary สำคัญ:

> CMS media storage is for public-publishable website assets, not confidential records.

หากอนาคตต้องมี private/protected file delivery ให้เป็น feature/security design ใหม่ ไม่แอบใช้ public CMS media เป็น private document store.

---

# 12. Relations and Reuse

ใช้ EmDash relations/reference fields สำหรับ shared structured relationships ตาม Content Model.

ใช้ native transaction/relation validation ก่อน custom relationship service.

Document/Media/Personnel/Organization/Health Service reuse ยึด model semantics ใน `02`; ไม่ duplicate data เพียงเพราะ presentation ต่างกัน.

---

# 13. SEO, Redirects and 404

ใช้ EmDash SEO features, sitemap/robots/canonical metadata และ redirect/404 facilities ก่อน custom implementation.

Astro page templatesยังรับผิดชอบ presentation และ canonical page semanticsตาม `03`.

Legacy WordPress route mappingใน `09` นำเข้าหรือสร้าง native redirect rulesตามความเหมาะสม.

---

# 14. Homepage

Homepage เป็น Astro presentation ที่อ่าน canonical CMS data.

ใช้ relations/menus/widget areas/structured configuration native ก่อน custom Homepage admin application.

ไม่มี page builder, personalization, A/B testing หรือ recommendation engine ใน Version 1.

---

# 15. ITA

ITA ใช้ collections/relations ตาม Content Model.

เริ่มจาก native editor. Custom widget/page เพิ่มเฉพาะ UAT gap ที่ชัดเจน.

ไม่มี compliance engine, scoring engine หรือ approval workflow ของ ITA ใน Version 1.

---

# 16. Migration

ใช้ EmDash WordPress import/admin flow เป็น first pathตาม `09-migration-plan.md`: WXR หรือ EmDash Exporter เมื่อเหมาะสม.

ใช้ native schema analysis, author mapping, taxonomy import, media copy/deduplication และ URL rewriting ก่อน custom importer.

สร้าง custom migration script/source เฉพาะ mapping ที่ native importer ไม่สามารถแปลงเป็น Songhealth Content Model ได้อย่างถูกต้อง.

---

# 17. Traceability and Operations

ใช้ native revisions/authorship/timestamps และ operational logging เป็น baseline.

ไม่มี custom universal Audit Log subsystem ใน Version 1.

ถ้ากฎหมาย/governance requirement ระบุเหตุการณ์/retention ที่ native evidence ไม่พอ ให้เพิ่ม targeted audit logging หลัง gap review.

Runtime monitoringขั้นต่ำต้องเห็น:

- application health/start failures
- database/storage failures
- scheduled publishing problems
- migration failures
- public rendering/search errors

ไม่ Freeze monitoring stack.

---

# 18. Backup and Recovery

Production recovery ใช้ **raw PostgreSQL backup/PITR + media backup** ตาม deployment capability.

EmDash JSON backup/export ไม่ใช่ sole disaster-recovery point.

ก่อน schema change, bulk import หรือ major upgrade ต้องมี restorable database backup และ restore verificationตามความเสี่ยง.

---

# 19. Security

- HTTPS production
- secrets outside repository
- native server-side RBAC
- CSRF/origin protections ตาม platform
- safe rich-content rendering
- file type/size validation
- least-privilege DB/storage credentials
- safe errors
- dependency maintenance
- no confidential data in public CMS/media

อย่าสร้าง security framework ซ้ำกับ platformโดยไม่มี gap.

---

# 20. Development and Configuration

Environment-specific valuesไม่ hard-code:

- host/domain
- database URL/credentials
- auth provider secrets
- storage credentials/path
- proxy/deployment settings

Use supported config/env mechanisms.

---

# 21. Testing Strategy

ทดสอบ **Songhealth configuration and assumptions**, ไม่ re-test EmDash internals แบบซ้ำซ้อน.

ขั้นต่ำ:

- Content Model mappings/required fields/relations
- public routes and canonical URLs
- draft vs published exposure
- role assignment scenarios
- scheduling/preview smoke tests
- Thai search UAT
- Homepage/ITA domain behavior
- migration mapping and old-URL redirects
- production build/start
- backup/restore readiness

Custom hook/helper ใดที่เพิ่มเพื่อปิด gap ต้องมี focused tests.

---

# 22. Extension Gate

สร้าง custom plugin/hook/helper/service ได้เมื่อ:

1. accepted Product requirement ทำไม่ได้ด้วย native capability/configuration
2. gap ถูก reproduce/อธิบายชัดเจน
3. extension เป็นวิธีที่เล็กที่สุด
4. มี test ของ gap

ถ้า native capabilityทำได้ ให้ใช้ native.

---

# 23. Explicit Non-Goals

Version 1 ไม่มี baseline requirement สำหรับ:

- Songhealth Domain/Application/Policy Layer
- custom backend/API server
- custom RBAC/Module Scope
- approval engine
- custom revision/preview/lock system
- custom Search Projection/search engine
- custom redirect manager
- protected CMS media subsystem
- custom Admin SPA
- message broker/Redis
- microservices
- Kubernetes
- page builder
- custom audit platform

---

# 24. Decision Summary

- Astro SSR: **YES**
- EmDash Admin/CMS: **YES**
- PostgreSQL: **YES**
- Native EmDash RBAC: **YES**
- Module Scope: **NO baseline requirement**
- Formal Approval Workflow: **NO baseline requirement**
- Native lifecycle/revisions/preview/scheduling: **YES**
- Songhealth Public ID: **NO; use native ID internally + slug URL**
- Native EmDash Search: **YES; Thai trigram baseline**
- Custom Search Projection: **NO**
- Native relations/media/redirects: **YES**
- Named Songhealth Policy/Domain Layer: **NO baseline requirement**
- Feature-local helpers/hooks: **only for proven gaps**
- WordPress migration: **native EmDash importer first**
- Implementation authorization: **NONE**

> **Use EmDash as the CMS, not as a database behind another CMS architecture.**

> **The cleanest custom code is the custom code we never needed to write.**

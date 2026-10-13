# System Blueprint — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 10-system-blueprint
> **Status:** CLEAN REBASELINE v2.4 — V1 scope revision for Independent Review / Human Acceptance
> **Version:** 2.4
> **Last Updated:** 14 ตุลาคม 2569 (2026-10-14)
> **Depends On:** `00-website-foundation.md` through `09-migration-plan.md`
> **Purpose:** กำหนด architecture ปัจจุบันที่ใช้ Astro + EmDash แบบ platform-native และเพิ่ม Songhealth-specific code เฉพาะ gap ที่พิสูจน์แล้ว
> **Implementation Authorization:** NONE


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers structured ITA historical-evidence
> management and unavailable Q3/Q4 enforcement from V1. Ordinary native content/Document/Media,
> publication, permissions and supported validation remain on EmDash 1.1.0. This revision awaits
> independent review and human acceptance; deferral is not implementation or PASS. No upstream
> change, new subsystem, replacement ITA workflow or production action is authorized.

---

# 1. Architecture Principle

> **EmDash-native first. Songhealth extensions only for demonstrated gaps.**

Clean Rebaseline v2.2 ยืนยันจาก adversarial review ว่า Songhealth ไม่ต้องมี application/domain/policy layer ของตนเองเป็น baseline; platform-native capability ครอบคลุมกลไกหลักส่วนใหญ่แล้ว.

การมี helper/module ที่ share กันในอนาคตเป็น code-organization decision จาก duplication/gap จริง ไม่ใช่ architecture layer ที่ต้องสร้างล่วงหน้า.

---

# 2. Technical Baseline

- Public runtime: **Astro SSR**
- CMS/Admin: **EmDash integrated in the Astro application**
- Language: **TypeScript**
- Database: **PostgreSQL**
- Media: **persistent native local storage supported by deployment; not immutable evidence storage**
- Pinned CMS for this V1 scope: **EmDash 1.1.0; no upgrade/vendor patch/fork**
- Runtime: **supported Node.js version compatible with selected Astro/EmDash release**
- Production container runtime: **rootless Podman (OCI containers)**
- Production service lifecycle: **systemd Quadlet**
- Production network boundary: **private Podman application network; PostgreSQL is not publicly exposed**

Pin dependency/image versions in implementation manifests, lockfiles and production deployment definitions. Do not use an unbounded `latest` image as the production contract. EmDash upgrade requires database backup, migration check and smoke/regression verification.

---

# 3. Runtime Shape

```text
Internet
   │
   ▼
HTTPS / Reverse Proxy
   │
   ▼
Linux / Fedora-compatible production host
   │
   ▼
rootless Podman + systemd Quadlet
   │
   └── private Songhealth network
       │
       ├── songhealth-app
       │   └── Astro SSR + EmDash
       │
       └── songhealth-db
           └── PostgreSQL

Persistent host/volume storage
├── PostgreSQL data
└── public-publishable Media files
```

ไม่มี separate Songhealth backend, API server, Domain service, Policy service หรือ database ของ Songhealth CMS อีกชั้น.

## 3.1 Production Deployment Baseline

Production ใช้ **rootless Podman** เป็น container runtime และใช้ **systemd Quadlet** เป็น declarative lifecycle integration กับ systemd.

Baseline topology มีเพียง:

- application container: Astro SSR + EmDash
- PostgreSQL container
- persistent PostgreSQL storage
- persistent media storage
- HTTPS/reverse proxy ใน deployment boundary

ข้อกำหนดขั้นต่ำ:

1. application และ PostgreSQL อยู่บน private Podman network เดียวกันตาม deployment configuration
2. PostgreSQL ไม่ publish port สู่ public network; รับ connection จาก application/deployment path ที่จำเป็นเท่านั้น
3. database data และ media ต้องอยู่นอก ephemeral writable layer ของ container และต้องคงอยู่เมื่อ replace/recreate container
4. secrets และ environment-specific configuration ไม่ bake ลง image และไม่ commit ลง repository
5. Quadlet/service definition ต้องกำหนด startup/restart behavior และ health/readiness verification ตาม capability ของ runtime
6. production image/dependency versions ต้อง pin ให้ reproduce deployment ได้
7. backup/restore ต้องกู้ข้อมูล PostgreSQL และ media ได้โดยไม่ขึ้นกับอายุของ application container
8. reverse proxy implementation อาจเลือกตาม deployment environment แต่ต้องรักษา HTTPS, forwarding headers, request limits และ security boundary ที่ระบบต้องการ

Development ไม่บังคับให้ทุก process รันใน container. Astro/Node tooling, Spec Kit และ AI agents รัน native บนเครื่องพัฒนาได้; ใช้ Podman ใน development เมื่อช่วยให้ database/runtime parity หรือ integration verification ชัดเจนขึ้น.

**Docker/Docker Compose ไม่ใช่ parallel production baseline.** หากมีเหตุผลต้องเปลี่ยน container runtime ในอนาคต ให้เป็น architecture decision ใหม่ ไม่ maintain deployment contracts สองชุดโดยไม่มี requirement.

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

Use supported native hooks only for retained publication-specific validation that native schema
cannot express, with focused verification and the §22 gate. Q1 field/selection requiredness remains;
Q4 cross-record availability/removal guarantees are deferred. Native policy hooks and `_rev` fence
the current entry, not all target records or their published dependents in one transaction.

Domain metadata เช่น announcement expiry, health-service operational status และ document successor/expiry ไม่กลายเป็น universal CMS workflow states. Structured ITA historical semantics are deferred from V1 (§15).

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

ใช้ EmDash Media Library + existing local storage adapter + available media usage tracking.
EmDash 1.1.0 media delete removes the row before storage cleanup without a required-published-usage
veto; native image replace can overwrite the existing key. Reporting/permissions/staff precautions
do not enforce Q3/Q4. Immutable historical assets and reference removal vetoes are deferred.

ไม่สร้าง DAM, media reference database หรือ protected-file delivery layer ใน Version 1.

Security boundary สำคัญ:

> CMS media storage is for public-publishable website assets, not confidential records.

หากอนาคตต้องมี private/protected file delivery ให้เป็น feature/security design ใหม่ ไม่แอบใช้ public CMS media เป็น private document store.

---

# 12. Relations and Reuse

ใช้ EmDash relations/reference fields สำหรับ shared structured relationships ตาม Content Model.

Use native relation/cardinality/value validation and the platform's supported entry mutations.
Those primitives do not guarantee published target availability through concurrent removal. A
before-hook preflight is outside the later handler transaction; native permanent deletion bypasses
the trash hook. Cross-record atomic enforcement and published-required-reference removal vetoes
are deferred from V1. Do not create a custom relationship service/locking subsystem to restore them.

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

# 15. ITA — Deferred from V1

Structured yearly ITA collections/relations, immutable/historically preserved evidence and its
correction/retention guarantees are outside the reduced V1 scope (`02` §18). No ITA application,
snapshot/media subsystem, custom workflow or upstream change is pursued. Ordinary Document/Media
reuse remains and must not be advertised as historical evidence enforcement.

The canonical Astro + EmDash 1.1.0 + PostgreSQL foundation, native local-media mount and rootless
Podman/Quadlet production contract are preserved. A later ITA re-entry needs explicit approved
scope and supported capability evidence; no alternate foundation is authorized here.

---

# 16. Migration

ใช้ EmDash WordPress import/admin flow เป็น first pathตาม `09-migration-plan.md`: WXR หรือ EmDash Exporter เมื่อเหมาะสม.

ใช้ native schema analysis, author mapping, taxonomy import, media copy/deduplication และ URL rewriting ก่อน custom importer.

สร้าง custom migration script/source เฉพาะ mapping ที่ native importer ไม่สามารถแปลงเป็น Songhealth Content Model ได้อย่างถูกต้อง.

**EmDash rerun guard:** WXR/Exporter reruns with skip-existing identify an existing target by collection + slug + locale. A source slug change between initial import and final delta can therefore produce a second target entry. Migration implementation must inventory slug changes, constrain source editing during final delta, and reconcile duplicates/redirects before cutover.

---

# 17. Traceability and Operations

ใช้ native revisions/authorship/timestamps และ operational logging เป็น baseline.

ไม่มี custom universal Audit Log subsystem ใน Version 1.

ถ้ากฎหมาย/governance requirement ระบุเหตุการณ์/retention ที่ native evidence ไม่พอ ให้เพิ่ม targeted audit logging หลัง gap review.

Runtime monitoringขั้นต่ำต้องเห็น:

- application/container health, restart and start failures
- Quadlet/systemd unit failures
- database/storage failures
- scheduled publishing problems
- migration failures
- public rendering/search errors

ไม่ Freeze monitoring stack.

---

# 18. Backup and Recovery

Version 1 ต้องมี **complete, restorable PostgreSQL database backup + persistent media backup** ที่กู้กลับเข้าสู่ clean/recreated runtime และตรวจสอบความครบถ้วนของข้อมูลได้.

Full logical PostgreSQL backup/restore เป็น minimum baseline ที่เพียงพอได้ เมื่อพิสูจน์ได้ว่ากู้ database state ที่ระบบต้องใช้ครบถ้วนและผ่าน integrity verification. EmDash JSON backup/export เพียงอย่างเดียวยังไม่เพียงพอเป็น sole disaster-recovery backup เพราะไม่ครอบคลุม system state ทั้งหมดและ media files.

Physical base backup, WAL archiving, point-in-time recovery (PITR), replication-class recovery และ infrastructure ที่เกี่ยวข้อง **ไม่ใช่ mandatory Version 1 baseline**. เพิ่ม capability เหล่านี้เมื่อ accepted RPO/RTO, scale, operational risk หรือ current requirement อื่นพิสูจน์ว่าจำเป็น.

PostgreSQL data และ media persistence ต้องอยู่นอก ephemeral container layer. การ replace/recreate application หรือ database container ต้องไม่ทำให้ข้อมูลถาวรสูญหาย และ recovery verification ต้องพิสูจน์การกู้ PostgreSQL และ media กลับเข้าสู่ clean/recreated runtime ได้.

Runtime secrets/keys ที่จำเป็นต่อการใช้งานระบบหลัง restore ต้องมี independently protected recovery path. Secret values ต้องอยู่นอก Git, database/media backup artifacts, generated planning artifacts และ logs; recovery design ระดับนี้ไม่บังคับ secret-management platform เฉพาะราย.

ก่อน risky schema change, bulk import หรือ major upgrade ต้องมี restorable database backup และ restore verification ตามระดับความเสี่ยง.

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
- database connection inputs/credentials
- auth provider secrets
- storage credentials
- proxy/deployment settings
- production container image references
- Podman network/storage names or pathsที่ขึ้นกับ environment

Use supported config/env mechanisms. Production container/service definitionsต้องแยก configuration ออกจาก secrets และหลีกเลี่ยง host-specific hard-code ที่ไม่จำเป็น.

## 20.1 Native Runtime Configuration Contract

Runtime/configuration contract ปัจจุบันของ Songhealth คือ platform-native contract ที่ Product Owner ตรวจสอบและอนุมัติแล้ว (T004 Human Gate architecture correction, 2026-10-07):

- Application PostgreSQL runtime: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- EmDash migration connection: `EMDASH_MIGRATION_DATABASE_URL`
- Public origin: `EMDASH_SITE_URL`
- Application server: `HOST`, `PORT`
- EmDash secret: `EMDASH_ENCRYPTION_KEY`
- Native media storage ใช้ stable application mount path `./media` (persistent media volume ใน production จะ map มาที่ path เดียวกันนี้); media ไม่ได้ runtime-configure ผ่าน `MEDIA_DIRECTORY`

ข้อกำหนดของ contract:

1. Runtime PostgreSQL inputs และ migration URL ต้องระบุ intended database เดียวกัน; consistency check/evidence เทียบเฉพาะ non-secret identity components (host, port, database, user) เท่านั้น และต้องไม่พิมพ์ password หรือ full URL ออกมา
2. Secret หรือ environment-specific credential ใดๆ ต้องไม่ถูก serialize ลง build artifacts หรือ images; migration manifest ที่ application build/sync emit ต้องมีเฉพาะ secret-free target information ตาม native EmDash behavior
3. ชื่อ `DATABASE_URL` เดิมถูกแทนที่ด้วย contract นี้แล้ว และไม่ใช่ current configuration authority — การปรากฏของชื่อนั้นในที่อื่นเป็น historical/rejected context เท่านั้น

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
- Homepage and retained V1 content behavior; structured ITA historical-evidence acceptance is deferred
- migration mapping and old-URL redirects
- production build/start
- rootless Podman + Quadlet deployment smoke test
- private database network boundary / no unintended public DB port
- container replacement with persistent PostgreSQL/media intact
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
- Docker/Docker Compose as a second production deployment baseline
- containerizing every development tool/process by default
- page builder
- custom audit platform

---

# 24. Decision Summary

- Astro SSR: **YES**
- EmDash Admin/CMS: **YES**
- PostgreSQL: **YES**
- Production container runtime: **rootless Podman**
- Production service lifecycle: **systemd Quadlet**
- Private app/database container network: **YES; no public PostgreSQL port**
- Docker/Docker Compose parallel production baseline: **NO**
- Kubernetes: **NO**
- Native EmDash RBAC: **YES**
- Module Scope: **NO baseline requirement**
- Formal Approval Workflow: **NO baseline requirement**
- Native lifecycle/revisions/preview/scheduling: **YES**
- Songhealth Public ID: **NO; use native ID internally + slug URL**
- Native EmDash Search: **YES; Thai trigram baseline**
- Custom Search Projection: **NO**
- Native relations/media/redirects: **YES, with documented native limitations; no Q3/Q4 enforcement claim**
- Structured ITA historical evidence: **DEFERRED from V1**
- Published-required-reference removal veto / cross-record atomicity: **DEFERRED from V1**
- Upstream-change pursuit / upgrade / vendor patch / custom history or relationship-locking subsystem: **NO**
- Runtime configuration contract: **native `PG*` PostgreSQL inputs + `EMDASH_MIGRATION_DATABASE_URL` migration connection + `EMDASH_SITE_URL` + `HOST`/`PORT` + `EMDASH_ENCRYPTION_KEY`; runtime and migration inputs identify the same intended database**
- Media storage path: **stable application path `./media`; no `MEDIA_DIRECTORY` runtime input**
- Named Songhealth Policy/Domain Layer: **NO baseline requirement**
- Feature-local helpers/hooks: **only for proven gaps**
- WordPress migration: **native EmDash importer first**
- Implementation authorization: **NONE**

> **Use EmDash as the CMS, not as a database behind another CMS architecture.**

> **The cleanest custom code is the custom code we never needed to write.**

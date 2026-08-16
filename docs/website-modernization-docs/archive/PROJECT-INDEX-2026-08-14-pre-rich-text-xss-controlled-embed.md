# Project Documentation Index — Website Modernization

> **Purpose:** จุดอ้างอิงเดียวสำหรับเอกสารโครงการเว็บไซต์สำนักงานสาธารณสุขอำเภอสอง  
> **Rule:** ใช้ไฟล์ใน `current/` เป็น Canonical Source เท่านั้น  
> **Last Updated:** 14 สิงหาคม 2569

---

## 1. กติกาการจัดเก็บใหม่

ตั้งแต่จุดนี้เป็นต้นไป ใช้โครงสร้างเดียว:

```text
website-modernization-docs/
├── PROJECT-INDEX.md
├── CHANGELOG.md
├── current/
│   ├── 00-website-foundation.md
│   ├── 01-information-architecture.md
│   ├── 02-content-model.md
│   ├── 03-sitemap.md
│   ├── 04-homepage.md
│   ├── 05-admin-cms.md
│   ├── 06-roles-permissions.md
│   ├── 07-publishing-workflow.md
│   ├── 08-search.md
│   └── 10-system-blueprint.md
├── reviews/
│   ├── admin-cms-freeze-review.md
│   ├── content-model-amendment-v1.1.md
│   ├── foundation-freeze-review.md
│   ├── homepage-freeze-review.md
│   ├── publishing-workflow-freeze-review.md
│   ├── roles-permissions-freeze-review.md
│   ├── search-freeze-review.md
│   ├── sitemap-freeze-review.md
│   └── canonical-integrity-repair-2026-08-14.md
└── archive/
    ├── 02-content-model-v1.0.md
    ├── 05-admin-cms-pre-repair-2026-08-14.md
    ├── 05-admin-cms-stale-current-detected-2026-08-14-final-search-review.md
    ├── 05-admin-cms-stale-current-detected-2026-08-14.md
    ├── 05-admin-cms-v0.1-pre-freeze.md
    ├── 06-roles-permissions-pre-final-review-repair-2026-08-14.md
    ├── 06-roles-permissions-stale-current-detected-2026-08-14-final-search-review.md
    ├── 06-roles-permissions-stale-current-detected-2026-08-14.md
    ├── 06-roles-permissions-v0.1-pre-freeze.md
    ├── 07-publishing-workflow-pre-state-transition-repair-2026-08-14.md
    ├── 07-publishing-workflow-pre-ux-2026-08-14.md
    ├── 07-publishing-workflow-stale-current-detected-2026-08-14-final-search-review.md
    ├── 07-publishing-workflow-v0.1-pre-edge-cases-2026-08-14.md
    ├── 07-publishing-workflow-v0.1-pre-freeze.md
    ├── 08-search-stale-current-detected-2026-08-14-final-search-review.md
    ├── 08-search-v0.1-pre-final-review-2026-08-14.md
    ├── 08-search-v0.1-pre-freshness-2026-08-14.md
    ├── 08-search-v0.1-pre-matching-2026-08-14.md
    ├── 08-search-v0.1-pre-operations-2026-08-14.md
    ├── 08-search-v0.1-pre-ranking-2026-08-14.md
    ├── 08-search-v0.1-pre-results-ux-2026-08-14.md
    ├── 08-search-v0.1-pre-search-unit-model-2026-08-14.md
    ├── 08-search-v0.1-pre-security-2026-08-14.md
    ├── 09-migration-plan-paused-2026-08-14.md
    ├── 09-migration-plan-v0.1-pre-decision-retention-dedup-2026-08-14.md
    ├── 09-migration-plan-v0.1-pre-inventory-mapping-2026-08-14.md
    ├── 10-system-blueprint-v0.1-pre-application-boundaries-2026-08-14.md
    ├── CHANGELOG-pre-10-application-boundaries-2026-08-14.md
    ├── CHANGELOG-pre-09-defer-2026-08-14.md
    ├── CHANGELOG-pre-07-final-review-integrity-2026-08-14.md
    ├── CHANGELOG-pre-08-freeze-2026-08-14.md
    ├── CHANGELOG-pre-09-init-2026-08-14.md
    ├── CHANGELOG-pre-10-init-2026-08-14.md
    ├── PROJECT-INDEX-pre-07-final-review-integrity-2026-08-14.md
    ├── PROJECT-INDEX-pre-08-freeze-2026-08-14.md
    ├── PROJECT-INDEX-pre-09-defer-2026-08-14.md
    ├── PROJECT-INDEX-pre-09-init-2026-08-14.md
    ├── PROJECT-INDEX-pre-10-application-boundaries-2026-08-14.md
    └── PROJECT-INDEX-pre-10-init-2026-08-14.md
```

### ความหมาย

- `current/` = **ไฟล์ปัจจุบันที่ใช้อ้างอิงจริง**
- `reviews/` = รายงาน Freeze, Review, Amendment
- `archive/` = เวอร์ชันเก่าที่ถูกแทนที่ แต่เก็บเพื่อประวัติ
- ไม่สร้างโฟลเดอร์ `working`, `frozen`, `amended` แยกตาม phase อีก
- Filename ของเอกสารหลัก **ไม่เปลี่ยนตามสถานะ**
- สถานะและเวอร์ชันเปลี่ยนใน Header ของไฟล์แทน

ตัวอย่าง:

```text
05-admin-cms.md
Status: WORKING DRAFT
Version: 0.1
```

เมื่อ Freeze:

```text
05-admin-cms.md
Status: FROZEN
Version: 1.0
```

ชื่อไฟล์ยังคงเป็น `05-admin-cms.md`

---

## 2. Current Canonical Documents

| ID | Document | Status | Version | Canonical File |
|---|---|---|---:|---|
| 00 | Website Foundation | FROZEN | 1.0 | `current/00-website-foundation.md` |
| 01 | Information Architecture | FROZEN | 1.0 | `current/01-information-architecture.md` |
| 02 | Content Model | FROZEN | 1.1 | `current/02-content-model.md` |
| 03 | Sitemap | FROZEN | 1.0 | `current/03-sitemap.md` |
| 04 | Homepage | FROZEN | 1.0 | `current/04-homepage.md` |
| 05 | Admin CMS | FROZEN | 1.0 | `current/05-admin-cms.md` |
| 06 | Roles & Permissions | FROZEN | 1.0 | `current/06-roles-permissions.md` |
| 07 | Publishing Workflow | FROZEN | 1.0 | `current/07-publishing-workflow.md` |
| 08 | Public Search / Search & Discovery | FROZEN | 1.0 | `current/08-search.md` |
| 10 | System Blueprint | WORKING DRAFT | 0.1 | `current/10-system-blueprint.md` |

---

## 3. Current Working Point

`10-system-blueprint.md` is the active **WORKING DRAFT v0.1**.

Canonical baseline:

- `00-website-foundation.md` through `08-search.md` are **FROZEN** and remain the active Product/Information Architecture Source of Truth.
- `09-migration-plan.md` remains **DEFERRED / NOT ACTIVE** pending real WordPress SQL + `wp-content/uploads/` evidence and is not a dependency of `10`.
- `10-system-blueprint.md` translates Frozen `00–08` behavior into implementable technical architecture without redesigning Product semantics.

Accepted System Blueprint decisions now include:

- Version 1 uses a Node.js **Modular Monolith**, not premature microservices.
- React + Vite remains the frontend direction; Public Website may use hybrid SSR/pre-render/client rendering rather than pure CSR by mandate.
- Admin CMS is CSR-oriented and separate in presentation/security context while sharing the same Application/Domain Core.
- backend authorization, validation, lifecycle, concurrency, and public-impact rules are authoritative.
- API surfaces represent Domain capabilities rather than generic raw-table CRUD.
- SSR/server routes reuse Application services directly instead of calling the application back through localhost HTTP.
- relational SQL is the canonical CMS data store; Dashboard/Analytical Data remains a separate logical data/database/API boundary.
- Search starts as an application module/derived projection; a dedicated engine/service is added only if Frozen `08` cannot be met simply enough otherwise.
- Redis is optional rather than a Version 1 dependency.
- scheduled/background work starts with idempotent application tasks triggered by hosting scheduler/Cron rather than a distributed queue platform.
- media binaries live in file/storage infrastructure while Media metadata/identity/relationships stay in SQL.
- Admin Identity & Access stays inside the primary backend application.
- same-origin / one-primary-application deployment is the baseline when practical.
- production uses a supported Node.js LTS release; exact version is an implementation/deployment concern.
- microservices, Kubernetes, brokers, dedicated Search infrastructure, Redis dependency, GraphQL, WebSockets, serverless architecture, object storage/CDN, and similar complexity require evidence before adoption.
- technical choices may not silently weaken or redefine Frozen `00–08` semantics.
- Version 1 Business Modules are `Editorial Content`, `Organization & Directory`, `Citizen Services`, `Health Services & Area`, `Health Information`, `Documents & Media`, `ITA`, and `Homepage`.
- `Identity & Access`, `Publishing`, `Search`, and `Audit` are Cross-Cutting Application Modules rather than canonical business-content owners.
- Personnel and CMS User remain separate identities; Documents/Media remain reusable canonical resources; Health Report remains a first-class Health Information resource.
- Homepage owns configuration/placements only; ITA owns its Fiscal Year/MOIT/Requirement/Evidence relationships; source resource lifecycle remains authoritative.
- Modules communicate through explicit in-process Application contracts and stable identities; direct cross-module repository/table mutation and internal localhost HTTP are prohibited.
- Shared Foundation stays small and technical; Domain rules remain in the owning Module.
- atomic canonical business invariants may use the shared SQL transaction boundary, Search synchronization remains derived/outside the canonical transaction, and required accountable Audit records join the critical transaction when practical.
- generic Content/Entity/Workflow frameworks, module-per-table/screen structures, and hidden business logic in Shared/Common are rejected as Version 1 anti-patterns.

Additional accepted Repository & Codebase Structure decisions:

- one repository uses a lightweight workspace/monorepo structure with `apps/web`, `apps/admin`, and `apps/server`; separate repositories are not required in Version 1.
- Server source is organized module-first with pragmatic Domain/Application/Infrastructure boundaries rather than global controller/service/repository/model folders.
- shared packages remain deliberately small: transport contracts/runtime schemas, neutral UI primitives, and developer configuration only when genuinely shared.
- backend Domain Entities/ORM/database rows are never frontend/API contracts; Public/Admin transport representations remain explicit and runtime-validatable.
- Server modules expose intentional public entry points; deep cross-module persistence imports and internal HTTP calls remain prohibited.
- Public/Admin use typed API-client boundaries; raw request construction and backend internals do not leak throughout React components.
- database schema changes are version controlled; schema migration, reference/bootstrap data, and future WordPress content migration remain separate concerns.
- scheduler/Search/maintenance commands reuse the same Application/Domain core; root scripts are not a second production business-logic path.
- runtime configuration/secrets stay outside source code and are validated at startup.
- tests are primarily colocated with owning modules/features, with integration/E2E areas added only where real cross-module workflows require them.
- ordinary typecheck/lint/dependency/test checks enforce valuable architecture rules; Nx/Turborepo, internal package publishing/versioning, remote caches, custom architecture tooling, and empty folder theatre are not Version 1 requirements.

Additional accepted Backend Framework, API & Runtime Validation decisions:

- TypeScript on a supported Node.js LTS runtime with **Fastify** as the Version 1 HTTP framework.
- Fastify stays at the HTTP/transport edge; accepted Module/Application/Domain boundaries remain authoritative.
- API style is pragmatic REST with explicit Domain actions for meaningful lifecycle transitions rather than generic status mutation or raw-table CRUD.
- Public/Admin/Auth are separate logical API surfaces within the same backend application.
- every external trust-boundary input is runtime-validated; **TypeBox / JSON Schema** is the preferred transport-schema baseline.
- Transport/schema validation remains separate from Domain/Application business validation.
- Public/Admin response DTOs are explicit allowlists; backend Domain/ORM/internal metadata is never serialized directly to clients.
- API identity uses stable identifiers rather than mutable Titles/Slugs.
- API errors use a predictable machine-readable envelope and do not expose infrastructure/internal exceptions.
- HTTP status conventions are standardized, including `400` for transport/schema failures, `409` for concurrency/current-state conflicts, and `422` for structurally valid Domain/business-rule violations where appropriate.
- optimistic concurrency is enforced by the backend; conflicting writes are never silently overwritten.
- page-based pagination is the Version 1 default where needed, while filtering/sorting are explicit allowlisted capabilities.
- OpenAPI is generated from runtime route schemas for developer/integration use; public production Swagger UI is not a baseline feature.
- dependency wiring uses explicit composition; a DI container/service locator is not a Version 1 requirement.
- Fastify plugins/hooks are used for HTTP/infrastructure concerns without becoming a global Application dependency registry.
- framework-specific code stays near transport/bootstrap so Domain/Application behavior remains framework-independent.

Additional accepted Database Technology, Data Access & Transaction decisions:

- production persistence is a MySQL-compatible relational database supplied by Bangmod Expert Hosting; exact MySQL/MariaDB vendor/version is verified at deployment rather than assumed in the Blueprint.
- InnoDB and `utf8mb4` are the business-table baseline; exact collation is selected after engine/version verification and Thai testing.
- **Kysely** is the Version 1 TypeScript data-access/query-builder baseline; SQL remains visible and Domain/Application models remain independent from persistence rows.
- raw SQL is allowed only deliberately, parameterized, localized, and when clearer or technically necessary.
- Database Row, Domain/Application Model, and Public/Admin DTO remain separate boundaries.
- internal relational identity uses numeric primary keys where appropriate; publicly addressable canonical resources use stable UUIDv7 `public_id`; Title/Slug are not identity.
- foreign keys, unique/not-null constraints, and targeted checks enforce structural integrity; Domain/Application code owns lifecycle/business meaning.
- delete cascades remain conservative and limited to strictly owned child data.
- persisted `version` fields implement optimistic concurrency; targeted row locking is reserved for critical serialized transitions.
- Application use cases own transaction boundaries; true cross-Module invariants may share one SQL transaction through explicit Module capabilities without cross-Module direct table access.
- accountable Audit joins canonical transactions when required/practical; Search synchronization remains derived and post-commit.
- transactions remain short and bounded deadlock retry is permitted only for safe/idempotent operations.
- relational schema is the default for canonical business data; JSON and technical soft-delete remain exceptions rather than generic frameworks.
- absolute timestamps persist in UTC and render/interpret through `Asia/Bangkok`; semantic calendar dates remain distinct Domain fields.
- indexes follow constraints and real query patterns; database indexes/full-text features do not redefine the Frozen Public Search contract.
- schema migrations are version-controlled and explicit, are not auto-run on normal production startup, and applied migration history is immutable.
- schema migrations, seed/bootstrap/reference data, and deferred WordPress content migration remain separate workflows.
- database connection pools are bounded but exact sizing is deployment tuning after real Expert Hosting limits are known.
- database credentials follow least privilege where hosting permits; phpMyAdmin remains inspection/legacy-export tooling rather than the normal new-system schema deployment path.

Additional accepted Authentication, Session & Security Architecture decisions:

- OWASP ASVS 5.0.0 is the primary verification baseline; applicable L1 controls form the minimum floor and selected L2 controls are adopted by risk without claiming blanket ASVS compliance before verification.
- Public access remains anonymous while CMS authentication uses database-backed/server-controlled sessions with Secure/HttpOnly/SameSite cookie protections; JWT is not the normal Admin browser baseline.
- state-changing Admin requests receive explicit CSRF protection and same-origin/CORS policy stays restrictive.
- current backend account/Role/Module Scope remains authoritative throughout the session; privilege revocation cannot depend on waiting for re-login.
- Argon2id and a modern passphrase policy are the password baseline; login/recovery receive throttling and enumeration-resistant behavior.
- sessions have server-enforced idle/absolute lifetimes, identifier regeneration, logout invalidation, and security/admin revocation.
- MFA is required for Admin and Publisher; Editor/Viewer support MFA and deployment policy may strengthen the requirement.
- recovery and sensitive credential/MFA/Role/Scope operations receive single-use/short-lived controls and reauthentication where appropriate; security questions are excluded.
- backend authorization is explicit/default-deny, HTTPS/security headers/CSP/proxy trust are deployment baselines, and reusable secrets never enter normal logs/source control.
- dependency/supply-chain hygiene plus OWASP-ASVS-based security verification are part of delivery rather than post-launch cleanup.
- external SSO/Identity Platform remains deferred until a real federation requirement exists.

Additional accepted Media, File Storage & Upload Security Architecture decisions:

- uploaded binaries remain outside directly public/executable web roots where practical and are never public merely because they exist on disk
- SQL owns structured Media/Document metadata and relationships while storage owns binary bytes; public identity is stable/opaque rather than a filename/path
- uploads start private and use purpose-aware authorization, allowlisted types, bounded streaming/size controls, MIME/signature/content verification, and format validation
- Version 1 raster uploads are JPEG/PNG/WebP and public-document baseline is PDF; CMS-uploaded SVG and archives remain excluded without a proven use case
- accepted raster originals are canonical, while Public Website delivery automatically uses optimized responsive **WebP derivatives** by default
- derivative presets remain intentionally small and match real UI needs; staff do not choose WebP/compression/resize/metadata-stripping options during normal publishing
- public derivatives remove unnecessary metadata and enforce decoded dimension/pixel limits as well as file-size limits
- malware scanning is a supported hook when reliable hosting infrastructure exists; CDR remains risk-based and the product never claims scanning that is not actually operating
- file visibility follows current Domain/public eligibility; known URLs cannot bypass Draft/Hidden/Internal/withdrawn state
- storage/SQL coordination uses short transactions plus retry-safe cleanup/reconciliation; checksums support integrity without becoming Domain identity
- deletion is reference-safe, temporary/orphan cleanup is lifecycle-aware, and complete recovery requires both database metadata and canonical original binaries
- applicable OWASP ASVS 5 File Handling requirements plus OWASP File Upload guidance are the security verification/implementation baseline
- S3/CDN/media microservices/DAM/video transcoding/OCR/archive extraction and similar complexity remain deferred until justified

Additional accepted Public Rendering, Routing, SEO & Caching Architecture decisions:

- Public Web uses **React Router Framework Mode + React + Vite** while Fastify remains the primary backend/application HTTP runtime.
- the Public Website is SSR-oriented hybrid: CMS-driven canonical pages SSR by default, genuinely deployment-static content may pre-render, and Admin remains CSR-oriented.
- normal CMS publication does not require a Public frontend rebuild/deploy.
- SSR uses in-process Application queries rather than calling the same backend through localhost HTTP.
- Frozen Sitemap remains route authority; canonical URL generation is centralized and stable Public Identity remains distinct from mutable Title/Slug.
- truthful server-side `200/404/410/redirect` semantics are required; unrelated missing content is not redirected to generic destinations.
- canonical metadata, self-canonical URLs, Open Graph/social metadata, sitemap projection, robots/noindex, and structured data derive from canonical public state.
- `/search` remains `noindex` and excluded from sitemap; robots directives never replace access control.
- cache policy follows mutability: hashed app assets and versioned WebP derivatives may be long-lived immutable; SSR HTML begins conservative/revalidated; Search/Admin/Auth sensitive responses are not shared-cacheable.
- cache correctness never outranks lifecycle/visibility; Hidden/Internal/Withdrawn content cannot remain public because of stale cache.
- primary public content remains meaningful in SSR HTML before JavaScript enhancement.
- performance starts with SSR, responsive WebP, code splitting, minimal client JS, appropriate HTTP caching, and efficient SQL rather than premature CDN/Redis/edge infrastructure.
- internal Public Search and external SEO remain separate concerns.
- Next.js as an additional runtime, RSC/edge/ISR/full-page cache/PWA/AMP/dynamic-rendering complexity are not Version 1 requirements.

Additional accepted Background Jobs, Scheduling & Reliability Architecture decisions:

- Hosting Cron/Scheduler is a wake-up mechanism; canonical SQL state remains the Source of Truth for due work and schedules.
- due discovery uses `scheduled_at <= now`, providing automatic overdue catch-up after missed runs or downtime.
- background transitions reuse authoritative Application/Domain capabilities; standalone Cron SQL/business logic is prohibited.
- scheduled publication is idempotent/current-state-aware/transaction-safe; a small SQL scheduler lease may prevent ordinary overlap while idempotency remains authoritative.
- critical transitions may use targeted row locks and deterministic bounded batches; multi-worker queue claiming stays deferred.
- failed execution leaves resources Scheduled/overdue and retryable; Overdue is operational, not a new Domain lifecycle state.
- scheduler heartbeat/overdue indicators provide small actionable health visibility without a generic job console.
- scheduled-publication Audit distinguishes the human scheduler from the System executor; accountable Audit joins canonical mutations while technical retries remain operational logs.
- Search sync is post-commit/reconstructible through reconciliation; temporary Media cleanup is lifecycle-aware.
- retries target transient failures; canonical due state enables deterministic recovery after restart/downtime.
- Redis/BullMQ, dedicated workers, generic Job tables, distributed locks, transactional Outbox, and exact-second scheduling are not Version 1 dependencies.
- future queue adoption requires measured workload and still invokes the same idempotent Application capabilities.
- schedule timestamps persist as UTC and staff operate in `Asia/Bangkok`; injectable Clock makes time behavior deterministic/testable.

Additional accepted Logging, Observability, Error Handling & System Health Architecture decisions:

- Version 1 distinguishes durable Business Audit, Operational/Application Logs, and Security Event Logs by purpose.
- Fastify/Pino structured JSON logging is the operational logging baseline; stable machine-readable event names and structured context are preferred.
- HTTP requests receive server-generated opaque Request IDs and background executions receive Operation IDs for correlation.
- whole request bodies, Domain objects, raw database rows and unnecessary personal data are not routinely logged.
- passwords, password hashes, sessions/cookies, CSRF/MFA/recovery/reset material, authorization headers, database/API/cryptographic secrets are excluded/redacted from logs.
- raw Public Search queries are minimized/omitted from routine operational logging unless a separately reviewed purpose justifies collection.
- log injection resistance, meaningful log levels, and separation of expected Domain/HTTP outcomes from operational incidents are baseline requirements.
- centralized error mapping returns canonical client-safe responses and keeps stack traces/SQL/filesystem/internal detail in protected server logs only.
- meaningful failures are never silently swallowed; derived failures may degrade independently but remain observable and recoverable.
- System Health distinguishes Liveness, Readiness and Operational Health, with a small `Healthy / Degraded / Unavailable` vocabulary.
- public health endpoints expose minimal information; Admin receives only a small read-only/actionable health view for Database, Scheduler, Scheduled Publishing, Search and Storage.
- critical dependencies are distinguished from degradable subsystems so optional failure does not mark the entire Public Website unavailable.
- Version 1 observability baseline is Structured Logs + Correlation + Audit + System Health; OpenTelemetry is an extension point rather than a required Collector/metrics/tracing platform.
- raw SQL logging is disabled by default in production; slow-operation thresholds are evidence-based and diagnostic instrumentation is controlled.
- Operational, Security and Audit records use bounded, purpose-driven retention plus access protection/rotation/capacity controls; Admin CMS does not expose raw server logs.
- alerts are reserved for sustained/actionable conditions rather than normal 404s, single failed logins or other expected noise.
- UI/API success is reported only after authoritative canonical commit; observability is not repurposed into citizen behavioral analytics by default.
- applicable OWASP ASVS 5 Security Logging/Error Handling requirements and OWASP logging/error-handling guidance form the implementation/verification baseline without unsupported blanket compliance claims.

Additional accepted Deployment, Environment, Backup & Disaster Recovery Architecture decisions:

- Development, Staging, and Production are separate logical environments; Staging may initially share the Expert Hosting account but never Production database/storage/sessions/secrets.
- GitHub is the authoritative code source and Production deploys from explicitly approved immutable revisions; direct Production editing is outside normal workflow.
- CI quality gates precede release, while automatic Production deployment on every `main` change is not required.
- Deployment includes controlled fetch/install/build/validation, explicit schema migration, activation/restart, health gates, and smoke tests.
- candidate builds complete before activation; zero-downtime is not claimed until real Expert Hosting/Nginx Unit behavior proves it.
- schema migrations remain explicit/version-controlled/rollback-aware; high-risk destructive evolution may use expand-migrate-contract.
- application rollback and database recovery remain separate; backup restore is for genuine data recovery rather than routine bad-code rollback.
- Development/Staging/Production credentials and secrets are isolated, protected outside Git, and handled under OWASP-aligned secrets-management practices.
- canonical recovery covers SQL + original Media/Documents + required configuration/secret recovery information; Search/WebP/build/dependency/temp artifacts are reconstructible.
- provider backup is only one possible layer and no unverified Expert Hosting backup frequency/retention guarantee is assumed.
- at least one protected/encrypted recovery copy is independent of the Production hosting account/environment.
- backup schedule/retention and RPO/RTO are finalized from real risk/volume and measured restore drills before Go-live.
- a backup is trusted only after isolated restore verification of data, originals, configuration and critical workflows.
- runtime/Node/Cron/build/migration/health/recovery configuration is documented in a reproducible deployment manifest; Terraform/Ansible/Docker/Kubernetes are not Version 1 requirements.
- CMS administration does not imply SSH/DirectAdmin/deployment/backup privileges; infrastructure administration remains separately controlled.
- Expert Hosting stays the Version 1 target until measured resource/worker/service/isolation/network/backup/observability needs justify VPS or other infrastructure.

Additional accepted Testing, Quality Gates & Security Verification Strategy decisions:

- testing is risk/invariant-driven rather than organized around arbitrary global coverage targets.
- Vitest is the preferred Domain/Application/unit/integration baseline, Fastify `inject()` is preferred for HTTP integration where appropriate, and Playwright is the primary critical-journey browser/E2E framework.
- database-sensitive behavior is tested against a real MySQL-compatible engine and aligned with the verified Production engine family once known.
- migrations, transaction atomicity, optimistic concurrency, Document supersession, Scheduled Publication idempotency, Search failure isolation, and authorization/Module Scope are first-class regression requirements.
- Public/Admin API tests verify runtime schemas, standardized errors/statuses, concurrency/authorization and explicit response DTO allowlists.
- critical E2E runs in Playwright; full Chromium/Firefox/WebKit coverage is primarily a Release/scheduled gate rather than mandatory on every edit.
- accessibility combines automated checks with targeted keyboard/manual verification; responsive/mobile and Thai rendering are explicit release-readiness concerns.
- SSR/SEO verification inspects actual server HTML/status/redirect/canonical/noindex/sitemap behavior before hydration.
- Media tests verify upload/content/path/size/privacy controls and canonical-original + responsive WebP derivative behavior.
- Pull Request gates emphasize fast deterministic typecheck/lint/architecture/unit/core integration/build/secret/security checks; Release Candidate gates add deeper migrations/E2E/concurrency/accessibility/SSR/SEO/Media/security/staging verification.
- OWASP ASVS 5 uses an applicability/implementation/verification/evidence matrix under the accepted applicable-L1 + selected-L2 risk policy without unsupported blanket compliance claims.
- dependency/SAST findings are triaged; committed secrets block merge and exposed credentials are rotated.
- application-specific security controls receive direct regression tests rather than relying solely on generic scanners.
- backup/restore drills remain operational release-readiness evidence, synthetic deterministic data is the test default, flaky tests are investigated rather than hidden by retries, and visual regression stays targeted.
- Merge and Release gates intentionally differ in depth/cost; manual workflow/accessibility/security/recovery verification remains necessary where automation cannot prove correctness.

Current `10-system-blueprint.md`: **WORKING DRAFT v0.1, Sections 1–472 continuous**.

Current discussion point:

> **System Blueprint Final Consistency Review — Phase 2: Final Blueprint Refinements**

Phase 1 Canonical Integrity Repair is complete. The physical `current/` set has been restored to Frozen `00–08` plus Working Draft `10`; deferred `09` is absent from `current/`. Already-accepted ITA Media Evidence, Contact ownership, and Administrator Module Scope decisions have been repaired where stale text contradicted the Frozen baselines.

Final Refinement 1 — Autosave, Recovery & Protected Preview is now Accepted and recorded in Sections 442–471. It separates authoritative canonical Save from server-side ephemeral Recovery, adds base-version/recovery-version conflict safety, re-checks current authorization on every Recovery/Preview request, keeps Recovery author-specific and bounded, and reuses the Public renderer for authenticated `no-store`/`noindex` Preview without publicizing staged Media or creating a revision/collaboration system.

The next refinement is **Rich Text, XSS & Controlled Embed Architecture**. Remaining later refinements are Identity/Administrator edge cases; Privacy/Cookie baseline; Announcement Expiry background processing; Public Search bounds/safe output; and redirect/Unicode URL clarifications.

---

## 4. Version Change Rule

เมื่อมีการแก้ไขเอกสารที่ Freeze แล้ว:

```text
1. Impact Review
2. ถ้าเป็นการแก้เล็กที่ไม่รื้อ architecture → Controlled Amendment
3. อัปเดตไฟล์ชื่อเดิมใน current/
4. เพิ่ม Version เช่น 1.0 → 1.1
5. เก็บเวอร์ชันเดิมไว้ใน archive/
6. บันทึกเหตุผลใน reviews/ และ CHANGELOG.md
```

ไม่สร้างชื่อเช่น:

```text
02-content-model-final-final-v2-new.md
02-content-model-amended.md
```

---

## 5. Working Document Rule

เอกสารที่ยังไม่ Freeze ใช้ชื่อจริงตั้งแต่แรก เช่น:

```text
05-admin-cms.md
```

ไม่ใช้:

```text
05-admin-cms-working-draft.md
05-admin-cms-updated.md
05-admin-cms-final-draft.md
```

สถานะ `WORKING DRAFT` อยู่ใน Header ของเอกสารเพียงพอ

---

## 6. Source of Truth

> **ถ้าพบไฟล์ชื่อเดียวกันหรือเวอร์ชันเก่าที่อื่น ให้ยึด `website-modernization-docs/current/` เป็นหลักเสมอ**

โฟลเดอร์เก่าภายใต้ `/mnt/data` ถือเป็น Historical Working Artifacts เท่านั้นและไม่ควรนำมาอ้างอิงในการตัดสินใจใหม่


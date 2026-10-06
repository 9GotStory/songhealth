# System Blueprint — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 10-system-blueprint
> **Status:** CLEAN REBASELINE v2.0 — CURRENT
> **Version:** 2.0
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md` through `09-migration-plan.md`
> **Purpose:** กำหนด architecture ปัจจุบันที่เล็ก ชัดเจน และสอดคล้องกับ Product requirements โดยไม่ลาก implementation assumptions จาก architecture รุ่นก่อนเข้ามา
> **Clean Rebaseline Rule:** ไฟล์นี้เป็นคำตอบ architecture ปัจจุบันเพียงชุดเดียว; architecture รุ่นเก่าอยู่ใน Git history/archival branch ไม่ใช่ authority
> **Implementation Authorization:** NONE — Blueprint นี้ไม่อนุญาตให้เริ่ม implementation โดยอัตโนมัติ

---

# 1. Architecture Goal

System Blueprint ต้องทำให้ Songhealth:

- ตรงกับ Product/Content/Workflow semantics ใน `00–09`
- เรียบง่ายพอสำหรับทีมขนาดเล็กดูแลระยะยาว
- ใช้ capability ของ platform ก่อนสร้าง infrastructure เอง
- ปลอดภัย ตรวจสอบได้ และ backup/restore ได้
- รองรับภาษาไทย, SEO, accessibility และ public-sector publishing requirements
- ลด integration boundaries ที่ไม่มี requirement รองรับ
- ไม่สร้าง custom backend/admin/auth/search/workflow framework โดยอัตโนมัติ
- เปลี่ยน implementation ได้ในอนาคตโดยไม่บังคับให้ Product documents เปลี่ยนตาม

> **Product requirements first. Platform capabilities second. Custom code only for the remaining gap.**

> **Complexity must be earned.**

---

# 2. Source of Truth and Precedence

เอกสาร `00–09` เป็น Product/behavior authority.

`10-system-blueprint.md` มีหน้าที่เลือก mechanism เพื่อทำให้ requirement เหล่านั้นเกิดขึ้นจริง.

```text
Product semantics in 00–09
          ↓
must be preserved by
          ↓
System Blueprint / implementation
```

Framework หรือ CMS limitation ไม่สามารถลด requirement แบบเงียบ ๆ ได้.

Implementation/specification ที่สร้างก่อน Clean Rebaseline v2.0 เป็น historical evidence เท่านั้น เว้นแต่ requirement นั้นถูกยืนยันอีกครั้งใน `current/`.

---

# 3. Version 1 Technical Baseline

Baseline ใหม่:

```text
Astro SSR
+ EmDash CMS integrated with Astro
+ TypeScript
+ supported Node.js runtime
+ PostgreSQL
+ persistent media storage
```

Exact package/runtime versionsไม่ Freeze ใน Product architecture. Implementation manifest ต้อง pin เวอร์ชันที่ตรวจสอบแล้ว และ upgrade ผ่าน regression/migration verification.

## 3.1 Astro SSR

Astro เป็น public presentation/runtime baseline เพราะ:

- primary public content ส่งเป็น meaningful HTML จาก server ได้
- ลด client-side JavaScript ที่ไม่จำเป็น
- เหมาะกับ content-heavy public website
- รองรับ canonical routes, metadata, accessibility และ progressive enhancement
- client-side islands ใช้เฉพาะเมื่อ requirement ต้องการ interaction/state จริง

> **SSR first; hydration only where earned.**

Static generation + publish-triggered rebuild ไม่เป็น baseline substitute สำหรับ current-content publishing semantics เว้นแต่ภายหลังมี evidence และ architecture review อนุมัติ.

## 3.2 EmDash

EmDash เป็น CMS implementation baseline เพราะทำงานร่วมกับ Astro application โดยตรงและให้ commodity CMS capabilities ที่ Songhealth ไม่ควรสร้างใหม่เอง.

ใช้ EmDash ก่อนสำหรับ capability ที่มีอยู่ เช่น:

- admin/content management
- collections and fields
- revisions/history
- draft/publish/scheduling primitives
- preview primitives
- media management/storage adapters
- authentication/authorization primitives
- taxonomy/menu/plugin facilities where applicable
- CMS data access required by Astro rendering

> **Do not rebuild an EmDash capability merely to preserve an old Songhealth implementation shape.**

หาก capability ของ EmDash ไม่ตรง Product semantics ให้ implement เฉพาะ delta ที่จำเป็นและมี tests รองรับ.

## 3.3 PostgreSQL

PostgreSQL เป็น relational persistence baseline สำหรับ production Songhealth.

เหตุผล:

- relational integrity และ transactions เหมาะกับ structured relationships ใน Content Model
- เหมาะกับ multi-user CMS workload
- เป็น supported EmDash deployment option
- ให้ operational path ที่ชัดเจนสำหรับ backup/restore, indexing และ evolution

Application/CMS code ต้องไม่กระจาย raw SQL จน Product rules ผูกกับ database schema โดยไม่จำเป็น.

---

# 4. Target Runtime Shape

```text
                    Internet
                       │
                    HTTPS
                       │
                       ▼
              Reverse Proxy / Edge
                       │
                       ▼
┌────────────────────────────────────────────┐
│          Songhealth Astro Runtime          │
│                                            │
│  Public Astro SSR        EmDash Admin      │
│         │                     │            │
│         └──────────┬──────────┘            │
│                    │                       │
│                  EmDash                    │
│                    │                       │
└────────────────────┼───────────────────────┘
                     │
              PostgreSQL
                     │
              Media Storage
```

Dashboard / analytical systems remain separate Data Domains ตาม `00`/`02`. พวกมันเชื่อมกับ public site ผ่าน bounded interfaces ได้โดยไม่ทำให้ CMS database กลายเป็น analytical warehouse.

ไม่มี baseline requirement สำหรับ:

- separate generic application API server
- Fastify/Nest/Express backend
- separate React Admin application
- WordPress runtime
- `songhealth-core` compatibility layer
- Redis
- message broker
- microservices
- Kubernetes
- dedicated search cluster

สิ่งเหล่านี้จะเพิ่มได้เมื่อมี concrete unmet requirement และผ่าน architecture review.

---

# 5. Public Rendering and Routing

Astro owns public presentation and canonical route handling defined by `03-sitemap.md`.

Requirements:

- canonical content arrives as useful HTML on initial response
- canonical URL/Public ID/slug semantics come from `03`, not framework defaults
- redirects, 404/Gone/non-disclosure behavior follow `03`
- public page rendering receives only public-eligible/public-safe data
- SEO metadata, structured data, sitemap output and robots behavior follow current public eligibility
- primary content discovery does not require client JavaScript
- interactive islands are isolated and justified by UX requirements

Astro route files are presentation adapters, not permission bypasses or alternate lifecycle authorities.

---

# 6. CMS and Admin Strategy

EmDash Admin is the baseline administrative surface.

Do not create a parallel custom Admin application unless a Product requirement in `05–07` remains materially unsatisfied after configuration/plugin extension has been evaluated.

Admin experience must speak Songhealth domain language from `05`, not force staff to understand generic platform internals.

---

# 7. Canonical Content Model and Schema Governance

`02-content-model.md` remains authority over domain meaning.

CMS collections/fields are implementation mappings of that model, not an independent source of truth.

```text
Current Product Content Model
          ↓
version-controlled schema/configuration
          ↓
reviewed migration
          ↓
EmDash / PostgreSQL
```

Production content schemas must not drift through unreviewed admin changes.

A schema change that affects Content Model meaning requires:

1. Product impact review
2. migration design
3. backup/restore safety
4. test updates
5. controlled deployment

Commodity editor configuration that does not change Product semantics may remain ordinary CMS configuration.

---

# 8. Public Data Access

A separate REST layer is **not** baseline merely because the previous architecture used one.

Astro SSR may access current CMS/content capabilities directly inside the trusted server runtime when this is the simplest safe mechanism.

Create a public API only when a real consumer requires one, เช่น independently deployed client, approved system integration หรือ public/open-data use case.

If an API is introduced it exposes purpose-built public-safe projections, not raw CMS entities.

---

# 9. Songhealth-Specific Business Rules — Placement Not Yet Frozen

Clean Rebaseline v2.0 deliberately does **not** assume a formal `Songhealth Domain Boundary`.

Previous explicit boundaries grew partly from architectures with separate application backends and Headless WordPress integration. That historical shape is not automatically carried into Astro + EmDash.

What remains mandatory is the **behavior**, including where applicable:

- public eligibility
- stable public identity
- lifecycle invariants
- role/module-scope authorization
- relationship integrity
- historical integrity
- protected-resource decisions
- workflow validation
- ITA semantics
- audit-relevant actions

After all eleven `current/` documents pass Clean Rebaseline, a dedicated architecture review must compare at least:

```text
Option A
Astro/EmDash-native implementation
+ small feature-local helpers/extensions

Option B
Thin shared Songhealth policy/services layer

Option C
Formal Domain/Application boundary
```

The decision must be based on actual cross-cutting invariants, testability, coupling and maintenance cost.

Until that review:

- do not create a formal Domain layer merely because the old architecture had one
- do not scatter cross-cutting rules through UI/routes merely because a formal layer is not yet approved
- keep each rule close to its owning feature and make shared abstractions only when duplication/consistency evidence justifies them

> **The requirement is current; the architectural layer is not yet decided.**

---

# 10. Authentication and Authorization

Use EmDash authentication/authorization primitives as the starting point.

`06-roles-permissions.md` remains authoritative for Songhealth semantics, including Role, Module Scope, public-impact authority, default deny และ separation between CMS account role and Personnel data.

If native EmDash role semantics cannot represent required Module Scope or action constraints exactly, add the smallest reviewed extension necessary.

Rules:

- client-side hiding/disabling is UX only
- authoritative checks execute at a trusted server/system boundary
- direct URL/action calls cannot bypass authorization
- privilege changes are audited where required
- no per-user ad-hoc override model is added unless Product requirements change

Exact identity provider/OAuth/passkey configuration is an implementation/security decision, not a new Product role model.

---

# 11. Publishing, Scheduling and Preview

`07-publishing-workflow.md` owns lifecycle/workflow semantics.

Use EmDash publishing/revision/scheduling/preview primitives first, then close only demonstrated gaps.

Verification must prove:

- Draft/Published/Archived and type-specific lifecycle semantics
- optional Approval behavior
- public-impact authority
- scheduled publication correctness
- stale/concurrent change safety
- failure does not masquerade as successful publication
- historical integrity
- preview confidentiality and current authorization

Do not port old WordPress/PHP scheduler, preview grant, hook or projection classes merely because they existed.

---

# 12. Media and Documents

EmDash media facilities/storage adapters are the commodity baseline; Songhealth requirements remain authoritative.

Rules:

- upload existence does not imply public eligibility
- Document and Media remain separate semantic resources where `02` defines them separately
- allowed type/size/security validation is enforced before accepted use
- public delivery of restricted/non-current resources fails closed
- replacement/supersession preserves historical identity and relationships
- alt text, source/credit/rights and usage metadata are preserved where required
- deleting a resource respects reference/usage safety

Start with the simplest durable media storage supported by production evidence. Local persistent storage or S3-compatible storage may be selected by deployment evidence; neither is Product authority.

---

# 13. Search

`08-search.md` owns public Search behavior.

> **Use the simplest EmDash/PostgreSQL/application search mechanism that passes the Search contract before introducing a dedicated search service.**

Verification must cover:

- Thai text behavior with real Songhealth content
- public eligibility/fail-closed behavior
- ranking and deterministic ordering
- filters/groups
- bounded query/page size
- safe snippets/highlights
- lifecycle freshness
- privacy-safe logging
- resource-abuse controls

A dedicated search engine becomes justified only if measured requirements cannot be satisfied simply and reliably by the baseline.

---

# 14. Migration

`09-migration-plan.md` owns migration semantics.

Legacy WordPress is a source, not runtime architecture.

Migration tooling must:

- read legacy evidence in a controlled way
- map into current Content Model/lifecycle/identity
- preserve meaningful URLs through explicit mapping
- validate files and public eligibility
- remain repeatable/idempotent enough for trial + final delta
- never copy legacy tables/plugins/themes/users/passwords blindly
- support reconciliation and rollback/cutover evidence

Migration code is temporary operational tooling unless a continuing requirement proves otherwise.

---

# 15. Security Baseline

Required:

- HTTPS in production
- secure secret management outside repository and ordinary CMS UI
- server-side/default-deny authorization
- CSRF/request-origin protection where state-changing browser requests require it
- output encoding/sanitization appropriate to rich content
- file validation and safe delivery
- security headers appropriate to deployment
- bounded request/input sizes
- least privilege for database/storage credentials
- safe error responses
- dependency/security maintenance
- backup and restore testing
- logs that do not expose secrets/private content

Security controls must protect direct requests as well as normal UI flows.

---

# 16. Persistence, Consistency and Concurrency

PostgreSQL transactions/constraints should enforce invariants that are naturally persistence-level concerns.

Application/CMS logic additionally enforces Product-level lifecycle/authorization rules.

Requirements include:

- no silent partial publish for logically atomic actions
- stale edits/actions do not overwrite newer committed lifecycle transitions
- stable identity does not change with title/slug editing
- relationships do not silently point to invalid/nonexistent resources
- repeated automatic/scheduled work is idempotent where required
- migration/schema changes are explicit and recoverable where practical

Do not turn every Product rule into a database trigger; ownership must remain understandable and testable.

---

# 17. Observability and Audit

Separate:

```text
Product Audit
≠
Operational Logs
≠
Security Monitoring
```

`05–07` define Product audit expectations.

Runtime must provide enough structured operational evidence to diagnose application startup/failure, database/storage failures, scheduled publishing failures, migration failures และ unexpected public rendering/search errors.

Exact monitoring stack is not baseline. Add external monitoring only when operational evidence justifies it.

---

# 18. Deployment Capability Contract

This Blueprint does not Freeze Bangmod, VPS, Cloudflare, container runtime or control panel.

Production must prove:

- supported persistent Node.js runtime compatible with Astro + EmDash
- PostgreSQL connectivity/persistence
- persistent media strategy
- HTTPS and correct reverse-proxy behavior
- secure environment/secrets
- process restart/recovery
- backup + restore
- staging or production-like verification
- deploy/rollback procedure
- sufficient resource capacity for expected workload

Containerization is optional. If used, it must simplify reproducibility/operations rather than become architecture for its own sake.

Provider selection occurs only after capability evidence.

---

# 19. Development and Environment Configuration

Environment-specific values remain outside source code where appropriate:

- hostname/domain
- database credentials/connection strings
- OAuth/client secrets
- storage credentials
- environment paths
- analytics/monitoring endpoints
- deployment-specific proxy settings

Development defaults must be safe and must not silently use production data or credentials.

Dependencies and runtime versions are pinned in manifests/lockfiles once implementation begins.

---

# 20. Testing Strategy

Test Songhealth-owned behavior and risky integration seams, not framework internals for their own sake.

Minimum risk-based coverage includes:

- canonical routes/redirects/public identity
- lifecycle/public eligibility
- role/module-scope authorization
- publishing/scheduling/concurrency
- preview confidentiality
- protected documents/media
- relationships and historical integrity
- Homepage eligibility/fallback
- Search eligibility/Thai behavior/ranking/safety
- migration mapping/idempotency/reconciliation
- schema migration
- production build/runtime startup
- backup/restore evidence for production readiness

EmDash/Astro capabilities may be trusted at their documented contract boundary, but Songhealth configuration/extensions and assumptions require tests.

---

# 21. Dependency and Extension Policy

Prefer:

```text
Astro
+ EmDash
+ PostgreSQL integration required by EmDash
+ minimum justified dependencies
```

Before adding a dependency/plugin/service ask:

1. What accepted requirement needs it?
2. Can Astro/EmDash/platform already satisfy the requirement?
3. What security/update burden does it add?
4. What happens if the dependency is abandoned?
5. Can it be replaced without rewriting Product semantics?

Avoid just-in-case infrastructure.

---

# 22. Explicit Non-Goals for Version 1

Not baseline:

- custom generic CMS
- custom generic Admin SPA
- standalone generic application backend/API
- WordPress runtime or compatibility layer
- custom identity store
- workflow engine
- microservices
- Redis/message broker
- dedicated search cluster
- Kubernetes
- event-sourcing/CQRS platform
- generalized plugin platform of our own
- page builder
- unrestricted schema editor for ordinary staff
- analytics warehouse inside CMS persistence

A later requirement may justify one of these only through explicit impact/architecture review.

---

# 23. Architecture Decision After Clean Rebaseline

After `00–10` pass Clean Rebaseline, the **first architecture review** is:

> **Does Songhealth still need a formal Songhealth Domain Boundary on Astro + EmDash, and if so, how thin should it be?**

Review evidence must identify actual cross-cutting rules rather than assume the answer.

The review compares simplicity, coupling, testability, portability and maintenance cost, then updates this Blueprint only if the result materially changes the runtime structure.

No implementation is authorized until this review and the subsequent clean Spec Kit/Constitution baseline are accepted.

---

# 24. Clean Rebaseline v2.0 Decision Summary

- Public presentation: **Astro SSR**
- CMS: **EmDash integrated with Astro**
- Primary relational persistence: **PostgreSQL**
- Language: **TypeScript**
- Runtime: **supported Node.js version compatible with selected dependencies**
- Admin: **EmDash-first; custom only for proven gaps**
- Public API: **not baseline unless a real consumer requires it**
- Search: **simplest mechanism satisfying `08`; dedicated service only when earned**
- Media: **durable storage selected by deployment evidence**
- Legacy WordPress: **migration source only**
- Hosting provider: **not Frozen; capability/evidence driven**
- Containers: **optional operational choice**
- Formal Songhealth Domain Boundary: **NOT YET DECIDED — post-rebaseline architecture review**
- Implementation authorization: **NONE**

> **Build Songhealth from its requirements, not from the shape of the previous implementation.**

> **Use the platform where it fits; add Songhealth-specific code only where the Product actually needs it.**

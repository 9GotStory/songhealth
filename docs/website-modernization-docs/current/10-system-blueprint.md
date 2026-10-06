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

Baseline runtime remains one application/runtime boundary:

```text
                         Internet
                            │
                         HTTPS
                            │
                            ▼
                   Reverse Proxy / Edge
                            │
                            ▼
┌──────────────────────────────────────────────────────┐
│                Songhealth Astro Runtime              │
│                                                      │
│   Public Astro SSR              EmDash Admin         │
│        │                            │                │
│        │                     Plugins / Hooks          │
│        │                            │                │
│        ├──── commodity CMS access ──┼───────┐        │
│        │                            │       │        │
│        └──── shared rule checks ────┴──┐    │        │
│                                       ▼    ▼        │
│                         Thin Songhealth Policy Layer │
│                           (shared business rules)    │
│                                       │             │
│                                     EmDash          │
└───────────────────────────────────────┼─────────────┘
                                        │
                                   PostgreSQL
                                        │
                                   Media Storage
```

The diagram is conceptual, not a mandatory call chain.

Important boundary rules:

- Astro/feature code may use EmDash directly for commodity CMS reads/configuration where no Songhealth-specific shared invariant is involved.
- EmDash Admin plugins/hooks may use EmDash primitives directly for ordinary CMS behavior.
- When an action or public decision depends on a shared Songhealth invariant, the relevant code invokes the Thin Songhealth Policy Layer.
- The Policy Layer is an in-process code boundary only. It has no separate server, HTTP API, process, database, queue, deployment unit or independent persistence.
- The Policy Layer does not wrap every EmDash API and does not create a generic CMS abstraction.
- Data loading/persistence remains owned by EmDash/infrastructure unless a separately justified requirement says otherwise.

Dashboard / analytical systems remain separate Data Domains ตาม `00`/`02`. พวกมันเชื่อมกับ public site ผ่าน bounded interfaces ได้โดยไม่ทำให้ CMS database กลายเป็น analytical warehouse.

There is no baseline requirement for:

- a separate generic application API server
- a Fastify/Nest/Express backend
- a separate React Admin application
- a WordPress runtime
- a `songhealth-core` compatibility layer
- a formal Domain/Application architecture
- generic repository/use-case/command/query layers
- Redis
- a message broker
- microservices
- Kubernetes
- a dedicated search cluster

Any of these requires a concrete unmet requirement plus architecture review.

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
version-controlled bootstrap/schema intent
          ↓
explicit reviewed schema/content migration
          ↓
EmDash active model in PostgreSQL
```

EmDash stores the active content model in the database. A version-controlled seed/schema artifact may bootstrap or document intended structure, but it is **not** assumed to be an every-deploy production migration mechanism. Production model changes require an explicit reviewed migration/change procedure.

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

Direct EmDash access inside trusted Astro server code is allowed for commodity reads. If the result/action depends on a shared Songhealth policy—such as public eligibility, protected-resource access or canonical identity—the caller must apply that policy rather than duplicating the rule locally.

---

# 9. Thin Songhealth Policy Layer

Clean Rebaseline v2.0 adopts **Option B — Thin shared Songhealth Policy Layer**.

This replaces the previous formal `Songhealth Domain Boundary` concept. The selected boundary is deliberately smaller: it centralizes only Songhealth-specific rules that must remain consistent across multiple surfaces, while leaving ordinary CMS behavior to Astro + EmDash.

## 9.1 What belongs in the Policy Layer

A rule belongs here when all or most of the following are true:

- it expresses Songhealth Product meaning rather than generic CMS mechanics
- multiple features/surfaces must make the same decision
- inconsistent duplication could cause security, public-visibility, lifecycle, identity or historical-integrity defects
- the rule should be testable independently from UI rendering
- EmDash primitives alone do not fully express the Songhealth requirement

Current policy families include, where applicable:

- public eligibility
- stable/canonical public identity semantics
- Songhealth Role + Module Scope + action authorization
- lifecycle/public-impact invariants
- protected-resource/public-delivery decisions
- cross-resource relationship integrity
- historical/current visibility rules
- shared workflow validation that is genuinely cross-feature
- ITA-specific invariants that are reused outside one local form/action

Exact module/file names are implementation details and are not Frozen here.

## 9.2 What does not belong in the Policy Layer

Do **not** move ordinary platform work into the Policy Layer merely for architectural symmetry.

Examples that normally remain Astro/EmDash responsibilities:

- collection reads/writes that need no shared Songhealth rule
- editor UI and generic form behavior
- revisions storage
- ordinary media-library operations
- database connectivity
- routing/rendering
- taxonomy reads
- site settings
- plugin wiring
- logging transport
- HTTP transport
- generic repository abstraction around EmDash

A feature-local rule stays feature-local until real reuse/consistency evidence justifies promotion.

## 9.3 Boundary Characteristics

The Policy Layer is:

- in-process TypeScript code inside the Songhealth Astro runtime
- intentionally small
- explicit and testable
- preferably side-effect-minimized for rule evaluation
- reusable by Public Astro code and EmDash plugins/hooks/extensions
- allowed to receive normalized resource/user/context inputs from platform adapters

The Policy Layer is **not**:

- a separate backend
- a separate deployment unit
- a second CMS
- a persistence owner
- an API gateway
- a service bus
- a Clean Architecture ceremony requirement
- a mandatory wrapper around every EmDash operation

Where policy evaluation needs current resource/user context, platform/infrastructure code loads that context and supplies it to the policy. This avoids turning policy code into an invisible persistence layer.

## 9.4 Why Option B Was Selected

Three approaches were reviewed:

```text
Option A
Astro/EmDash-native + feature-local rules

Option B
Thin shared Songhealth Policy Layer

Option C
Formal Domain/Application boundary
```

Decision: **Option B**.

Option A was rejected as the baseline because cross-cutting rules such as public eligibility, authorization, stable identity and resource access could drift when implemented independently across Homepage, Search, detail pages, Admin hooks, document delivery and migration.

Option C was rejected because Astro + EmDash already provide the main CMS/application runtime. Reintroducing a formal Domain/Application/Repository/Use-Case stack would duplicate platform boundaries and risk recreating a custom backend without a demonstrated requirement.

> **Share Songhealth rules, not Songhealth infrastructure.**

---

# 10. Authentication and Authorization

Use EmDash authentication/authorization primitives as infrastructure primitives. Songhealth authorization decisions that depend on the current Role + Module Scope + action/resource state are evaluated through the Thin Songhealth Policy Layer.

`06-roles-permissions.md` remains authoritative for Songhealth semantics, including the four Songhealth Role templates, Module Scope, public-impact authority, default deny และ separation between CMS account role and Personnel data.

EmDash's native role names/levels are **not assumed to map 1:1** to Songhealth roles. If native permissions cannot represent Songhealth Role + Module Scope + action constraints exactly, add the smallest reviewed mapping/extension necessary without changing `06` semantics.

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

Use EmDash publishing/revision/scheduling/preview primitives first, then close only demonstrated gaps. Native EmDash lifecycle/status behavior is not automatically Songhealth Product semantics; shared Songhealth publication/lifecycle decisions use the Thin Songhealth Policy Layer where a common rule is required.

Verification must prove:

- Draft/Published/Archived and type-specific lifecycle semantics
- optional Approval behavior
- public-impact authority
- scheduled publication correctness, including Songhealth-defined failure behavior when native platform transitions differ
- stale/concurrent change safety
- failure does not masquerade as successful publication
- historical integrity
- preview confidentiality and current authorization

Do not port old WordPress/PHP scheduler, preview grant, hook or projection classes merely because they existed. Where an EmDash hook/status transition differs from `07`, the implementation must adapt the platform or return to architecture review rather than silently changing the Product workflow.

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

# 23. Architecture Decision — Songhealth Policy Boundary

Post-Rebaseline architecture review is complete.

Decision:

> **Use a Thin Songhealth Policy Layer; do not use the previous Formal Domain/Application Boundary.**

Rationale:

- Astro + EmDash already form the primary application/CMS runtime.
- Songhealth still has cross-cutting Product invariants that must not be duplicated across public rendering, Admin extensions, Search, protected resources and migration.
- A small in-process policy boundary gives consistency/testability without creating a second backend architecture.
- Commodity EmDash behavior remains direct and platform-native.
- New abstractions must be justified by a real shared rule or integration seam.

Architecture guardrail:

> **No repository/use-case/service/domain hierarchy is created solely to satisfy a pattern. Add structure only when a Product rule or measured implementation problem earns it.**

This decision closes the Domain Boundary question for Version 1. Reopening it requires concrete evidence that the Thin Policy Layer cannot preserve accepted semantics cleanly.

Implementation remains unauthorized until the clean Constitution and fresh Spec Kit baseline are accepted.

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
- Songhealth shared business-rule boundary: **Thin Songhealth Policy Layer**
- Formal Domain/Application Boundary: **NOT BASELINE**
- Policy Layer deployment/persistence: **none — in-process shared code only**
- Implementation authorization: **NONE**

> **Build Songhealth from its requirements, not from the shape of the previous implementation.**

> **Use the platform where it fits; add Songhealth-specific code only where the Product actually needs it.**

> **Share Songhealth rules, not Songhealth infrastructure.**

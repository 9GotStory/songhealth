# System Blueprint — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 10-system-blueprint  
> **Status:** WORKING DRAFT  
> **Version:** 0.1  
> **Last Updated:** 14 สิงหาคม 2569  
> **Depends On:** `00-website-foundation.md` v1.0, `01-information-architecture.md` v1.0, `02-content-model.md` v1.1, `03-sitemap.md` v1.0, `04-homepage.md` v1.0, `05-admin-cms.md` v1.0, `06-roles-permissions.md` v1.0, `07-publishing-workflow.md` v1.0, `08-search.md` v1.0  
> **Migration Note:** `09-migration-plan.md` is currently DEFERRED and is not a dependency of this Working Draft.  
> **Purpose:** กำหนด Technical Architecture และ System Boundaries ที่ใช้ implement Frozen Product/Information Architecture โดยเลือกแนวทางที่เรียบง่าย ดูแลได้ และขยายได้เมื่อมี use case จริง โดยไม่เปลี่ยน Product semantics ผ่านการตัดสินใจทางเทคนิค

---

# 1. Purpose

`10-system-blueprint.md` ทำหน้าที่แปลง Frozen requirements จาก `00–08` ให้เป็น Technical Architecture ที่ implement ได้จริง โดยเอกสารนี้ต้องไม่ออกแบบ Product ใหม่ผ่านข้อจำกัดของ framework, database, search engine หรือ hosting technology

หลักตั้งต้น:

> **The System Blueprint implements the Frozen product and information architecture; it must not redesign the product through technical choices.**

และ:

> **Choose the simplest architecture that satisfies the Frozen requirements today while leaving clear extension points for proven future needs.**

ดังนั้นลำดับการตัดสินใจคือ:

```text
Frozen 00–08 Requirements
        ↓
Technical Responsibilities
        ↓
Runtime / Data Boundaries
        ↓
Simplest Suitable Architecture
        ↓
Technology Selection
```

ไม่เริ่มจากการเลือก library แล้วบังคับ Product ให้เข้ากับ library

---

# 2. Version 1 Architecture Style — Modular Monolith

Version 1 ใช้ **Modular Monolith** เป็น architecture baseline

```text
One deployable application
≠
one giant unstructured codebase
```

ระบบมี Node.js application หลักหนึ่ง deployable unit แต่ภายในแบ่ง Module และ ownership ชัดเจนตาม Domain/Responsibility

ตัวอย่าง conceptual modules:

- Identity & Access
- Editorial Content
- Organization & People
- Citizen Services
- Health Services
- Documents & Media
- ITA
- Homepage
- Publishing
- Search
- Audit

Version 1 ไม่แยกแต่ละ Module เป็น network service/microservice ตั้งแต่ต้น

เหตุผล:

- Frozen `00–08` ยังไม่มี scale หรือ operational requirement ที่บังคับ microservices
- deployment, debugging, transaction boundary และ backup ง่ายกว่า
- ลด distributed failure modes
- เหมาะกับหลัก Simple — Structured — Sustainable
- รองรับ Bangmod Expert Hosting โดยไม่เพิ่ม infrastructure burden ที่ยังไม่จำเป็น

หลัก:

> **Complexity is allowed inside clear module boundaries, not through premature infrastructure separation.**

---

# 3. Primary Runtime Boundary

Architecture v1 มี primary Node.js application เป็น runtime หลักของ Public Website, Admin CMS, HTTP API และ Application/Domain services

```text
Browser
   │
   ▼
┌───────────────────────────────────────────────┐
│          Node.js Modular Monolith             │
│                                               │
│ Public React       Admin React                │
│ Hybrid Rendering   CSR-oriented               │
│      │                 │                      │
│      └──────┬──────────┘                      │
│             ▼                                 │
│       Application / Domain Layer              │
│                                               │
│ Content │ Publishing │ Access │ Media │ Search│
│ ITA │ Services │ Audit │ Homepage │ etc.      │
│             │                                 │
│             ▼                                 │
│       Repository / Persistence                │
└─────────────┬──────────────────┬──────────────┘
              │                  │
              ▼                  ▼
          CMS SQL DB         Media Files

Scheduled / Maintenance Task Runner
              │
              └────→ same Application / Domain Layer

Separate Data Domain:
Dashboard API → Dashboard SQL
```

รายละเอียด exact process layout, entry points และ deployment commands จะกำหนดภายหลังใน Blueprint เมื่อ responsibilities ของแต่ละ Module ถูก Freeze

---

# 4. React + Vite Remain the Frontend Direction

Frontend direction ที่เลือกไว้ยังคงเป็น **React + Vite**

แต่ Version 1 ไม่ Freeze ว่า Public Website ต้องเป็น pure Client-Side Rendering SPA

แยกความต้องการตาม presentation boundary:

```text
Public Website
→ SSR / pre-render / client rendering แบบ Hybrid ตาม route/use case

Admin CMS
→ CSR-oriented application
```

Public Website มี canonical pages, metadata, Search/SEO และ direct URL requirements จาก Frozen Sitemap จึงต้องเปิดทางให้ server-rendered หรือ pre-rendered output ใน route ที่เหมาะสม

Admin CMS อยู่หลัง authentication และมี interaction สูงกว่า จึงเหมาะกับ CSR-oriented workflow

Exact rendering mode ต่อ route จะตัดสินในหัวข้อ Rendering Strategy ภายหลัง

---

# 5. Public Website and Admin CMS Are Separate Presentation Boundaries

Public Website และ Admin CMS มี UX/visibility/security context คนละแบบ แต่ใช้ Application/Domain Core ชุดเดียวกัน

```text
Public UI             Admin UI
   │                     │
   └─────────┬───────────┘
             ▼
     Application / Domain Core
```

ไม่สร้าง business logic ซ้ำสองชุดเพียงเพราะมีสอง frontend surfaces

Public surface อ่านเฉพาะ public-safe projection/resource state

Admin surface ใช้ capabilities ตาม Role + Module Scope จาก Frozen `06`

---

# 6. Backend Is Authoritative for Domain Rules

React สามารถทำ client-side validation หรือ disable action เพื่อ UX ได้ แต่ไม่ใช่ authority ของกฎระบบ

กฎ authoritative เช่น:

- Can Publish?
- Can Schedule?
- Can Save Published Changes?
- Can Hide?
- Can Supersede?
- Is Public Eligible?
- Can this Role/Module Scope perform the action?
- Is the current transition valid?

ต้องถูกตรวจที่ backend ทุกครั้งที่เกิด authoritative action

```text
Frontend UX check
        ↓
HTTP / server action
        ↓
Backend authorization + validation + concurrency check
        ↓
Domain commit
```

ไม่มี frontend-only authorization

---

# 7. Application / Domain Layer Owns Business Semantics

Business rules ไม่ควรถูกฝังโดยตรงใน React component, route handler หรือ SQL query กระจัดกระจาย

Application/Domain layer รับผิดชอบ:

- domain actions
- validation orchestration
- authorization policy calls
- lifecycle transitions
- transactional use cases
- cross-module coordinationที่ได้รับอนุญาต
- audit/public-impact recordingตาม Frozen rules

HTTP route/controller ทำหน้าที่แปลง request/response และเรียก Application use case ไม่ใช่เป็นที่อยู่ของ business state machine

---

# 8. API Represents Capabilities, Not Raw Tables

HTTP API ไม่ควรถูกออกแบบเป็น generic database wrapper เช่น:

```text
PATCH /api/table/{table}/{id}
```

API ควรสะท้อน resource และ domain capability ที่ meaningful เช่น conceptual actions:

```text
Create Draft
Update Draft
Publish
Schedule
Cancel Schedule
Archive
Supersede
Hide
Activate
Save Public Changes
```

Exact HTTP method/route naming ยังไม่ Freeze ใน Foundation นี้

หลัก:

> **API represents domain capabilities, not raw table mutation.**

---

# 9. Server Rendering Uses Application Services Directly

เมื่อ Node process เดียวกันกำลัง render Public Website บน server ไม่จำเป็นต้องเรียก HTTP API ของตัวเองโดยไม่มีเหตุผล

หลีกเลี่ยง:

```text
SSR route
→ HTTP localhost /api/...
→ same Node app
→ database
```

ใช้:

```text
SSR route
→ Application Service
→ Repository / Persistence
```

Browser/external clients จึงค่อยผ่าน HTTP API

วิธีนี้ลด artificial network hop, duplicated serialization และ failure mode ที่ไม่จำเป็น

---

# 10. CMS SQL Database Is the Canonical CMS Source of Truth

CMS structured data ใช้ relational SQL database เป็น authoritative persistence สำหรับ:

- canonical content/resources
- lifecycle state
- relationships
- roles/scopes/access configuration
- publishing state/anchorsที่จำเป็น
- audit metadata
- search projection metadataตาม implementationที่เลือก

Search index/cache/filesystem ไม่เป็น Source of Truth ของ canonical content

Exact SQL engine ยังไม่ Freeze ใน Foundation นี้และต้องตรวจ environment/compatibility ตอนเลือก implementation

---

# 11. Dashboard / Analytical Data Remains a Separate Data Domain

ยืนยัน Frozen Foundation เดิม:

```text
CMS / Public Content              Dashboard / Analytical Data
        │                                  │
     CMS API                           Dashboard API
        │                                  │
  CMS Database                      Dashboard Database
```

อย่างน้อยต้องแยก:

- logical database/data ownership
- credentials
- API responsibility

ไม่ใช้ CMS Database เป็น analytical warehouse และไม่ใช้ cross-database join เป็น integration mechanism หลัก

สามารถอยู่บน database server เดียวกันใน Version 1 ได้หาก hosting/operations เหมาะสม

---

# 12. Search Starts as an Application Module, Not a Separate Service

Frozen `08` กำหนด Search behavior แต่ไม่ได้กำหนด engine

Version 1 จึงมี Search Module ที่รับผิดชอบ conceptual concerns เช่น:

- public-safe search projection
- Thai/query normalization
- eligibility
- matching
- ranking
- de-duplication
- reconciliation/rebuild boundary

แต่ **Search Module ไม่เท่ากับ Dedicated Search Server**

หลักการเลือก implementation:

> ใช้ implementation ที่ง่ายที่สุดซึ่งผ่าน Frozen `08` ได้จริง

หาก SQL/search capability ที่มีอยู่ทำ Thai behavior ได้เพียงพอ → ไม่ต้องเพิ่ม search engine

หากทดสอบแล้วไม่ผ่าน requirements → จึงค่อยเพิ่ม dedicated engine หลัง evidence

Application code ต้องรักษา Search abstraction boundary เพื่อไม่ให้ Domain logicผูกกับ vendor/engine โดยตรง

---

# 13. Redis Is Optional Infrastructure

Redis อาจมีประโยชน์ในอนาคตสำหรับ caching, sessions, queues หรือ coordination แต่ Version 1 ไม่ถือ Redis เป็น baseline dependency

```text
Available / possible
≠
Required by architecture
```

หาก relational DB/application mechanisms เพียงพอ ให้ใช้แนวทางที่เรียบง่ายกว่า

การเพิ่ม Redis ต้องมี use case/measurement ชัดเจน

---

# 14. Scheduled and Background Work Starts with Application Tasks

Frozen `07` ต้องการ:

- Scheduled Publish
- Expiry/domain-time processing
- catch-up
- idempotency
- race safety

Frozen `08` อาจต้องการ Search reconciliation/maintenance

Version 1 baseline:

```text
Hosting Scheduler / Cron
        ↓
Node application task / CLI entry point
        ↓
same Application / Domain Layer
        ↓
Database / Search projection
```

ไม่ต้องเริ่มด้วย distributed queue/message broker

Exact scheduling interval, command names, locking/retry mechanism และ operational supervision จะกำหนดภายหลัง

หลัก:

> **Idempotent background work does not imply a queue platform is required.**

---

# 15. Media Uses Files + Structured Metadata

Binary files และ structured Media metadata แยก responsibility

```text
Media Binary
→ filesystem / hosting storage

Media Record
→ SQL database
```

Database เก็บข้อมูลเชิงโครงสร้าง เช่น:

- stable Media identity
- storage key/path reference
- original filename/display filenameตามความจำเป็น
- MIME type
- file size
- dimensions/technical metadataเมื่อเหมาะสม
- alt/accessibility metadata
- relationships
- ownership/lifecycle/public projection metadataตาม Frozen models

Version 1 ไม่เก็บ media binaries ทั้งหมดเป็น relational BLOB โดย default

Object storage/CDN ยังไม่เป็น baseline requirement

---

# 16. Identity & Access Stay Inside the Primary Application

Version 1 ไม่สร้าง authentication/identity microservice แยก

Admin authentication, session handling และ Role/Module Scope authorization อยู่ภายใน primary application boundary

หลัก:

> **Authorization is centralized server-side; no separate identity microservice is required in Version 1.**

Exact authentication mechanism, password/session storage, reset policy, CSRF/session security และ MFA decision จะพิจารณาใน Security & Authentication section ภายหลัง

---

# 17. Same-Origin Deployment Is the Baseline

Version 1 ควรเริ่มด้วย one-site / same-origin model เมื่อไม่มีเหตุผลให้แยก subdomain:

```text
https://example/
https://example/news/...
https://example/services/...
https://example/admin/...
https://example/api/...
```

ไม่เริ่มด้วยหลาย origin เช่น `www`, `admin`, `api`, `media`, `search` แยกทั้งหมด

ประโยชน์:

- CORS ง่ายกว่า
- session/cookie policy ง่ายกว่า
- deployment/SSL/monitoring ง่ายกว่า
- ลด configuration drift

ภายหลังสามารถแยก surface/service ได้เมื่อมี operational need จริง

---

# 18. Production Runtime Follows Supported LTS Policy

System Blueprint ไม่ผูก architecture กับ Node.js Current release เพียงเพราะใหม่ที่สุด

Production ใช้:

> **a supported Node.js LTS release that is compatible with the selected hosting environment and application dependencies.**

Exact major/minor versionถูก lock ใน implementation/deployment manifest และอัปเดตตาม maintenance policy ไม่ใช่แก้ Product architecture ทุกครั้งที่ Node releaseใหม่ออก

---

# 19. Version 1 Infrastructure Exclusions

ไม่มี baseline requirement สำหรับ:

- Microservices
- Docker/Kubernetes requirement
- Kafka / RabbitMQ / distributed message broker
- distributed worker fleet
- Redis dependency
- dedicated Search server/cluster
- object storage/CDN requirement
- GraphQL requirement
- WebSockets requirement
- serverless function architecture
- separate authentication service
- multiple CMS databasesตามแต่ละ module
- permanent internal service-to-service network architecture

สิ่งเหล่านี้ไม่ได้ถูกห้ามตลอดไป แต่ต้องเพิ่มเมื่อ use case, scale, reliability หรือ operational evidence justify complexity

---

# 20. Separation of Concerns Without Distributed Systems

Version 1 ต้องแยก responsibility ด้วย code/module/data ownership ก่อน ไม่ใช่ด้วย network boundary

```text
Clear Module Boundary
+ Application Contracts
+ Repository/Data Ownership
+ Backend Authorization
+ Transaction Discipline

≠
Microservice Required
```

Architecture สามารถ structured ได้โดยยัง deployเป็น application เดียว

ตรงกับ Foundation principle:

> **Architecture can be structured without making the workflow complicated.**

---

# 21. Technical Choices Must Preserve Frozen Product Semantics

Framework, ORM, router, session library, database engine, search engine หรือ deployment technique ที่เลือกภายหลังต้องไม่ทำให้ Frozen behavior ถูกลดทอน

ตัวอย่างที่ห้ามเกิด:

- เลือก framework แล้วบังคับ Public Websiteเป็น pure SPA ทั้งหมดแม้ canonical route/SEO requirementsไม่เหมาะ
- เลือก ORM แล้วใช้ generic CRUD แทน Domain transition rules
- เลือก Search engine แล้ว bypass canonical eligibility
- เลือก cache แล้วปล่อย Hidden contentค้าง Public
- เลือก scheduler แล้วเปลี่ยน Scheduled Publish semantics
- เลือก role library แล้วลด Module Scope/Publisher boundary

เมื่อ technology limitationขัด Frozen baseline ต้องเปลี่ยน technology/implementation หรือทำ Controlled Amendment ที่ Product layerอย่างโปร่งใส ไม่แก้ behaviorเงียบ ๆ ใน code

---

# 22. Accepted System Architecture Foundation & Technical Boundaries

**Sections 1–21 = Accepted System Architecture Foundation & Technical Boundaries.**

Accepted baseline:

- Version 1 uses a Node.js **Modular Monolith** with clear internal module/data/action boundaries rather than premature microservices.
- React + Vite remains the frontend direction, but Public Website rendering is not constrained to a pure CSR SPA; hybrid SSR/pre-render/client rendering remains available according to route needs.
- Admin CMS is CSR-oriented and remains a separate presentation/security context from the Public Website.
- Public Website, Admin CMS, HTTP API, scheduler/maintenance tasks, and server rendering reuse one authoritative Application/Domain Core rather than duplicating business logic.
- backend authorization, validation, lifecycle, concurrency, and public-impact rules are authoritative; React-side checks are UX only.
- API design represents Domain resources/capabilities rather than exposing generic raw-table mutation.
- server-side Public rendering calls Application services directly rather than introducing unnecessary localhost HTTP hops back into the same application.
- relational SQL is the canonical CMS data store; Dashboard/Analytical Data remains a separate logical Data Domain/database/API boundary.
- Search begins as an internal application module/derived public projection and only gains a dedicated engine/service if Frozen `08` cannot be satisfied simply enough without it.
- Redis is optional infrastructure, not a Version 1 dependency.
- Scheduled Publish, Expiry, Search reconciliation, and similar work begin as idempotent application tasks triggered by hosting scheduler/Cron; a distributed queue is not required by default.
- media binaries live in file/storage infrastructure while structured Media identity/metadata/relationships remain in SQL; BLOB/object-storage/CDN architecture is not a baseline requirement.
- Admin Identity & Access stays inside the primary backend application; Version 1 does not require a separate identity service.
- deployment starts with a same-origin/one-primary-application architecture when possible, reducing CORS/session/SSL/configuration complexity.
- production runtime follows a supported Node.js LTS policy; exact versions are implementation/deployment concerns.
- microservices, Kubernetes, brokers, distributed queues, dedicated Search infrastructure, Redis dependency, GraphQL, WebSockets, serverless architecture, object storage/CDN, and other infrastructure complexity require evidence before adoption.
- technology choices must implement Frozen `00–08` semantics and may not silently redesign Product behavior for framework convenience.

---

# 23. Next Discussion Topic

> **Application Boundaries & Module Architecture**

Next decisions should define the actual application modules, ownership and allowed dependencies for Version 1, including at minimum:

- Identity & Access
- Editorial Content
- Organization & People
- Citizen Services
- Health Services
- Documents & Media
- ITA
- Homepage
- Publishing
- Search
- Audit

The next section should answer:

- which Module owns each canonical resource and lifecycle action
- which responsibilities are shared cross-cutting services vs Domain-owned rules
- how modules communicate without bypassing Application contracts
- which Module may write which tables/data
- how shared resources such as Document, Media, Area and Contact are referenced without creating circular ownership
- where transaction boundaries cross Modules and where they must not
- which dependencies are prohibited to prevent the Modular Monolith from becoming an unstructured monolith

# 24. Module Boundary Principle

Version 1 keeps one deployable application but separates business responsibilities through explicit Module ownership.

Core rule:

> **Each module owns a clear business responsibility and its authoritative data. Other modules interact through explicit application capabilities rather than reaching into another module’s internals.**

And:

> **Modules are separated by business meaning and lifecycle, not by database table or screen.**

A Module boundary therefore reflects a coherent Domain responsibility, not merely a folder, controller, route, database table, or Admin screen.

---

# 25. Module Categories

The Modular Monolith is organized into three categories:

```text
Business / Domain Modules
─────────────────────────
Editorial Content
Organization & Directory
Citizen Services
Health Services & Area
Health Information
Documents & Media
ITA
Homepage

Cross-Cutting Application Modules
─────────────────────────────────
Identity & Access
Publishing
Search
Audit

Technical Foundation
────────────────────
Database
Transactions
Storage
Clock
Configuration
Logging
Common technical primitives
```

Business Modules own canonical business meaning and lifecycle. Cross-cutting modules coordinate capabilities used by multiple business modules without becoming substitute owners of canonical business content. Technical Foundation supplies infrastructure primitives only.

---

# 26. Editorial Content Module

`Editorial Content` owns the editorial resources whose meaning and lifecycle belong to public communication:

- Basic Page
- News
- Activity
- Announcement
- Health Content

The module owns the Domain rules of these resources, including differences such as Announcement closure/expiry semantics and Health Content review semantics.

It does **not** own Document, Media, Personnel, Service, ITA structure, Homepage configuration, or CMS User identity merely because those resources may appear on the same Admin screens or Public pages.

---

# 27. Organization & Directory Module

`Organization & Directory` owns:

- Personnel
- Organization
- Contact Information
- Related Organization
- relationships among these resources where those relationships belong to the organizational/public-directory domain

The module keeps each resource structurally distinct. Personnel is not embedded as an unstructured array inside Organization, and Contact Information remains a reusable structured resource rather than copied text in every consumer.

A critical identity boundary remains:

```text
Personnel ≠ CMS User
```

A person may correspond to both records in the real world, but Personnel and CMS User have different purposes, permissions, visibility, and lifecycle semantics.

---

# 28. Identity & Access Module

`Identity & Access` owns:

- CMS User
- Role
- Module Scope
- Authentication
- Session
- Authorization
- account lifecycle

Its responsibility is to determine whether an authenticated user may perform a capability within the permitted scope defined by Frozen `06`.

It does not own Domain content or need to understand the internal persistence structure of News, Document, Service, ITA, or other business resources.

Authorization remains server-side and capability-oriented.

---

# 29. Citizen Services Module

`Citizen Services` owns the canonical `Service` resource and its service-specific business meaning, including:

- Direct Service
- Coordinated Service
- Related Health Service
- External Digital Service
- Service Channel
- service instructions
- responsible organization references
- relationships to related forms/documents/resources

The module may reference canonical Documents and other shared resources but does not duplicate their authoritative metadata.

Conceptually:

```text
Service
   └── references Document
```

not:

```text
Service
   └── owns another copy of Document/File metadata
```

---

# 30. Health Services & Area Module

`Health Services & Area` owns:

- Health Service
- Area hierarchy

Area remains a geographic master with the established hierarchy:

```text
Province
  ↓
District
  ↓
Subdistrict
  ↓
Village
```

Health Service references Area through stable identities.

Area is **not** generalized into an arbitrary taxonomy engine. It remains a purpose-specific geographic reference model shared where required by the Frozen Content Model.

---

# 31. Documents & Media Module

`Documents & Media` owns:

- Document
- Media
- canonical file identity
- file/storage metadata
- Document lifecycle and Document-specific relationships

Document and Media remain distinct resource concepts even though they share storage infrastructure.

Other modules reference these canonical resources rather than copying their file metadata:

```text
News ──────────┐
Service ───────┤
Health Report ─┼──→ Document / Media
ITA ───────────┘
```

This module boundary supports reuse while preserving one authoritative identity for each legitimate resource.

---

# 32. Health Information Module

`Health Information` owns `Health Report` as a distinct canonical Domain resource.

Health Report is not collapsed into Editorial Content and is not reduced to a Document record merely because a report commonly has a PDF attachment.

Conceptually:

```text
Health Report
   └── references Report Document
```

This preserves the Frozen distinction between Health Content, Health Report, and raw analytical/dashboard data.

---

# 33. ITA Module

`ITA` owns the compliance structure and relationships that give evidence its meaning:

- Fiscal Year
- MOIT / Section
- Requirement / Item
- Evidence relationships

Evidence may reference canonical:

- Document
- Media
- External URL

The ITA module does not duplicate Document or Media records merely to attach them to a Requirement.

Historical Fiscal Year/Requirement relationships remain owned by ITA and must not be silently rewritten by successor resources.

---

# 34. Homepage Module

`Homepage` owns orchestration/configuration only:

- Homepage Configuration
- Homepage Placement
- selection/order of referenced resources
- permitted temporal placement settings

It does not own copies of News, Health Content, Health Service, Contact Information, or other source content.

```text
Homepage Placement
       ↓
references Canonical Resource
```

Source lifecycle remains authoritative. A Homepage placement cannot keep a Hidden, Internal, or otherwise Public-ineligible source resource visible.

---

# 35. Publishing Module

`Publishing` is a cross-cutting application module that coordinates authorized publication-related capabilities such as:

- Publish
- Schedule
- Cancel Schedule
- Archive where publication semantics require coordination
- optional Approval flow
- publication transition orchestration

Publishing does **not** become the canonical owner of every Domain lifecycle state and does not maintain duplicate `publishing_*` copies of Domain records.

Domain-specific state remains with the owning Domain, while Publishing coordinates common publication behavior, authorization, validation, scheduling, and transactional sequencing.

---

# 36. Publishing Is Not a Generic Workflow Platform

Version 1 does not introduce a dynamic generic workflow/state-machine framework such as configurable `StateMachine<T>`, runtime Workflow Designer, or universal status engine.

Shared transition primitives may be reused where useful, but Domain-specific meaning remains near the owning Domain because:

- Announcement Closed/Expired semantics differ from News
- Document Superseded/Expired semantics differ from Announcement
- Personnel/Organization/Health Service visibility semantics differ from editorial publication
- Homepage Configuration has its own intentionally small lifecycle

The system therefore shares infrastructure without erasing Domain meaning.

---

# 37. Search Module

`Search` is a derived read/projection module.

It owns:

- Search projection/index representation
- query normalization
- matching/ranking rules
- de-duplication/presentation logic
- reconciliation
- Search-specific operational health

It does **not** own canonical content and never becomes mutation authority for News, Service, Document, ITA, Personnel, or other business resources.

```text
Canonical Domain Data
        ↓
Search Projection
```

Search can read current canonical eligibility when returning results, but it may not modify Domain lifecycle to make Search easier.

---

# 38. Audit Module

`Audit` owns append-oriented accountability records such as:

- actor
- action
- target identity
- timestamp
- relevant audit context

Business/Application modules determine the business action; Audit records that action.

Audit does not determine whether a user may Publish, Archive, Hide, Supersede, or otherwise mutate a resource.

Conceptually:

```text
Business Capability
      ↓
Domain mutation
      ↓
Audit record
```

with transactional guarantees applied where the audit record is part of the critical accountable mutation.

---

# 39. Dependency Direction

The normal dependency direction is:

```text
Presentation
     ↓
Application Capability
     ↓
Domain Module
     ↓
Persistence / Infrastructure
```

Presentation code does not bypass Application capabilities to manipulate repositories directly.

Between business modules, one Module uses an explicit public Application capability/query contract of another Module when cross-module information is required.

A Module boundary is therefore enforced by code dependency rules, not merely documentation labels.

---

# 40. Cross-Module Write and Data Ownership

One Module must not reach directly into another Module's repository or tables for convenience.

For example, this is prohibited:

```text
CitizenServicesRepository
        ↓
SELECT / UPDATE Documents tables directly
```

Instead:

```text
Citizen Services
      ↓
Document Query / Capability Contract
      ↓
Documents & Media
```

The physical database may be shared, but write ownership remains logically explicit.

Read models may be optimized later where proven necessary, but optimization must not create hidden mutation ownership or bypass Domain rules.

---

# 41. In-Process Module Communication

Because Version 1 is a Modular Monolith, internal Module communication occurs in-process through functions/Application services/contracts.

The application does not call itself through internal HTTP endpoints such as `localhost` simply to cross a Module boundary.

Conceptually:

```text
Citizen Services
      ↓
DocumentQueryService
      ↓
Documents & Media
```

not:

```text
Citizen Services
      ↓
HTTP localhost/internal/documents/...
```

This keeps the architecture simple, transaction-friendly, and deployable as one application while preserving explicit boundaries.

---

# 42. Cross-Module References Use Stable Identities

Cross-module references use stable internal resource identities rather than Titles, Slugs, display labels, or URLs as foreign identities.

Examples:

```text
Service → document_id
Homepage Placement → news_id
ITA Evidence → document_id
Health Service → area_id
```

Public ID and Slug remain public routing/discovery concerns and do not replace authoritative internal identity.

---

# 43. Shared Foundation Must Remain Small

`Shared Foundation` contains only genuinely technical/common primitives, such as:

- ID primitives
- Clock abstraction
- transaction abstraction
- pagination primitives
- common technical error/result primitives
- configuration primitives
- storage interfaces
- logging primitives

Business concepts must not migrate into a large `shared`, `common`, or `utils` area merely to avoid deciding ownership.

Avoid patterns such as:

```text
shared/utils/contentHelper
shared/utils/statusHelper
shared/utils/serviceHelper
```

when those helpers encode Domain rules.

> **If something has Domain meaning, it belongs to the owning Domain Module.**

---

# 44. Canonical Transaction Boundaries

The Modular Monolith and shared relational database allow business mutations that must be atomic to use one database transaction where appropriate.

Example — Document supersession:

```text
Publish successor Document
+ mark predecessor Superseded
+ link predecessor → successor
+ required accountable Audit record
= one canonical transaction where practical
```

Version 1 therefore does not need distributed Saga infrastructure for operations that remain inside the primary application/database boundary.

Cross-module coordination may participate in the same transaction when the business invariant requires atomicity and the ownership contract is explicit.

---

# 45. Search Synchronization Is Outside the Canonical Mutation Transaction

Search is derived state, so normal Search projection refresh happens after the canonical business transaction commits.

```text
Canonical mutation commits
        ↓
Search projection refresh / reconciliation
```

A Search synchronization failure must not roll back an otherwise valid publication or canonical mutation, consistent with Frozen `08`.

Public Search still performs/depends on current canonical public-eligibility safeguards so stale derived state cannot extend exposure of Hidden/Internal/Withdrawn/ineligible content.

---

# 46. Audit and Critical Mutations

Audit differs from Search because accountable Audit records may be part of the critical mutation guarantee.

Where Frozen behavior requires an accountable action to be recorded, the mutation and its Audit record should participate in the same canonical transaction when practical.

The architecture should avoid an ordinary failure mode where a public-impact mutation commits successfully while the required Audit record is lost because a later background task fails.

Detailed implementation is deferred, but the transaction design must preserve this invariant.

---

# 47. Version 1 Module Map

Accepted logical Module map:

```text
BUSINESS MODULES
────────────────────────────────

Editorial Content
├── Basic Page
├── News
├── Activity
├── Announcement
└── Health Content

Organization & Directory
├── Personnel
├── Organization
├── Contact Information
└── Related Organization

Citizen Services
└── Service

Health Services & Area
├── Health Service
└── Area

Health Information
└── Health Report

Documents & Media
├── Document
└── Media

ITA
├── Fiscal Year
├── MOIT / Section
├── Requirement
└── Evidence relationships

Homepage
└── Homepage Configuration / Placement


CROSS-CUTTING MODULES
────────────────────────────────

Identity & Access
Publishing
Search
Audit


TECHNICAL FOUNDATION
────────────────────────────────

Database
Transactions
Storage
Clock
Configuration
Logging
Common technical primitives
```

This is a logical ownership map, not a requirement to deploy separate services or databases per Module.

---

# 48. Module Architecture Anti-Patterns

Version 1 explicitly avoids:

- one generic `Content` model/table that erases meaningful differences among News, Activity, Announcement, Health Content, and other resources
- a generic dynamic Entity/Metadata framework for all business data
- a generic configurable lifecycle/workflow engine where Domain-specific rules are clearer
- one Module per database table
- one Module per UI screen or route
- direct cross-module repository/table mutations
- internal HTTP communication between Modules inside the same Modular Monolith
- a large Shared/Common/Utils area containing hidden business logic
- business logic concentrated in controllers or React components
- Search becoming Source of Truth or mutation authority
- Homepage duplicating source content
- ITA duplicating canonical Document/Media records
- treating Personnel and CMS User as the same resource
- mixing Dashboard analytical data ownership into CMS Domain Modules

These exclusions are guardrails against turning the Modular Monolith into either an unstructured monolith or an unnecessarily generic framework.

---

# 49. Accepted Application Boundaries & Module Architecture

**Sections 24–48 = Accepted Application Boundaries & Module Architecture.**

Accepted baseline:

- Version 1 Modules are divided into Business/Domain Modules, Cross-Cutting Application Modules, and a deliberately small Technical Foundation.
- Business Modules are `Editorial Content`, `Organization & Directory`, `Citizen Services`, `Health Services & Area`, `Health Information`, `Documents & Media`, `ITA`, and `Homepage`.
- Cross-cutting modules are `Identity & Access`, `Publishing`, `Search`, and `Audit`; they coordinate shared application concerns without replacing canonical Domain ownership.
- `Editorial Content` owns Basic Page, News, Activity, Announcement, and Health Content with their Domain-specific semantics.
- `Organization & Directory` owns Personnel, Organization, Contact Information, and Related Organization; Personnel remains separate from CMS User identity.
- `Citizen Services` owns Service and references shared canonical resources rather than duplicating Document/File metadata.
- `Health Services & Area` owns Health Service and the purpose-specific geographic Area hierarchy; Area is not a generic taxonomy platform.
- `Health Information` owns Health Report as a first-class resource that references, but is not reduced to, a Report Document.
- `Documents & Media` owns canonical Document/Media identity, lifecycle, and storage metadata; other Modules reference these resources.
- `ITA` owns Fiscal Year/MOIT/Requirement structure and Evidence relationships while reusing canonical Document/Media resources.
- `Homepage` owns configuration/placements only and cannot override the lifecycle/public eligibility of referenced source resources.
- `Publishing` coordinates authorized publication transitions but does not duplicate Domain lifecycle state or become a generic workflow/state-machine platform.
- `Search` is a derived read projection and never canonical mutation authority.
- `Audit` records accountable actions but does not determine permissions or Domain lifecycle rules.
- Module dependency direction is Presentation → Application Capability → Domain → Persistence/Infrastructure.
- Modules communicate through explicit in-process Application contracts; one Module does not directly mutate another Module's repository/tables and internal HTTP is not used to simulate service boundaries.
- Cross-module references use stable internal identities rather than Titles, Slugs, or URLs.
- Shared Foundation remains technical and small; Domain logic stays in the owning Module.
- canonical business invariants may use one shared SQL transaction across explicit Module capabilities when atomicity is required; distributed Saga infrastructure is not a Version 1 requirement.
- Search projection synchronization remains outside the canonical mutation transaction, while required accountable Audit records should participate in the critical mutation transaction when practical.
- generic Content/Entity/Workflow frameworks, module-per-table/screen structures, hidden cross-module database access, and large shared-business-logic areas are rejected as Version 1 anti-patterns.

---

# 50. Next Discussion Topic

> **Repository & Codebase Structure**

The next step should translate the accepted Module boundaries into enforceable source-code organization and import/dependency rules, including:

- monorepo vs single package/workspace structure
- Public Web, Admin CMS, Server/Application, scripts/tasks, and shared package boundaries
- where `domain`, `application`, `infrastructure`, and `presentation` code lives
- Module folder/package conventions
- TypeScript sharing rules between browser and server
- which DTO/schema/types may be shared and which Domain types must remain server-owned
- dependency/import rules that prevent Public/Admin code from reaching repositories or database code
- how scheduled CLI tasks reuse Application capabilities without creating a second implementation path
- testing boundaries by Module and layer
- how repository structure stays simple enough for one maintainer while preserving the accepted architecture

# 51. Repository Structure Principles

Repository structure must reinforce the accepted Modular Monolith rather than merely document it.

> **Repository structure should make the correct architectural path easy and cross-module shortcuts visibly difficult.**

And:

> **Share infrastructure and contracts only when they are genuinely shared; do not create a giant `shared` package that becomes a second monolith.**

The codebase therefore optimizes for clarity for a small maintainer/team, explicit ownership, safe reuse, and low ceremony rather than maximum package count or enterprise monorepo tooling.

---

# 52. One Repository, Lightweight Workspace

Version 1 uses one source repository for the complete website application.

```text
website/
```

Public Web, Admin CMS, and Server are not split into independent repositories because they are one coordinated product, share release context, and do not have independently operated teams or release trains.

One repository does not mean one undifferentiated package. The repository may use normal workspace support to keep application boundaries explicit.

---

# 53. Primary Application Boundaries

The primary application layout is:

```text
apps/
├── web/
├── admin/
└── server/
```

Responsibilities:

- `apps/web` — Public Website routes, public rendering, SEO/canonical presentation, Public Search UI, and public-facing feature composition.
- `apps/admin` — authenticated Admin CMS experience, forms, management views, workflow UI, and staff productivity features.
- `apps/server` — authoritative Node.js backend containing Domain/Application logic, API surfaces, authentication, persistence, scheduler commands, Search projection behavior, and Audit integration.

These are application boundaries inside one repository, not separate microservices.

---

# 54. Minimal Shared Packages

Version 1 permits a small number of packages only where reuse is genuine.

Conceptual baseline:

```text
packages/
├── contracts/
├── ui/
└── config/
```

These packages may be introduced incrementally. Empty packages are not created merely because they appear in the architecture diagram.

The baseline rejects a large package taxonomy such as dozens of `core`, `common`, `domain-*`, `utils-*`, and internal published packages without a proven need.

---

# 55. Transport Contracts Package

`packages/contracts` contains transport-level contracts genuinely shared between browser applications and the Server, for example:

- API request/response DTOs
- pagination/query contracts
- stable API-facing enums/value definitions
- runtime-validatable transport schemas where appropriate

Conceptually:

```text
SearchRequest
SearchResultDto
NewsPublicDto
ServiceSummaryDto
LoginRequest
```

It does **not** contain backend Domain Entities, ORM models, database rows, repositories, internal authorization objects, or persistence metadata.

```text
Domain Entity
      ↓ map
Application Result
      ↓ map
Transport DTO
```

The mapping boundary prevents database/internal state from becoming the public API contract by accident.

---

# 56. UI Package Scope

`packages/ui` may contain neutral reusable presentation primitives such as:

- Button
- Input
- Select
- Modal/Dialog primitives
- Badge
- basic form-field shells
- accessibility primitives
- design tokens/typography primitives where genuinely shared

Application-specific features remain in their application.

Examples that must **not** be moved into the shared UI package merely for reuse pressure:

```text
NewsEditor
PersonnelForm
ServiceForm
HomepageManager
```

Public Website and Admin CMS have different UX responsibilities. They may share primitives without being forced into one universal component system.

---

# 57. Tooling Configuration Package

`packages/config` may hold developer/build configuration reused by multiple workspaces, for example:

- base TypeScript configuration
- lint rules
- formatting conventions
- shared build conventions where useful

It is not the home of runtime application configuration or production secrets.

Runtime environment configuration remains owned by the Server/Application deployment boundary.

---

# 58. Server Organization Is Module-First

The Server is organized primarily by accepted business/application modules, not by global technical folders.

Avoid:

```text
src/
├── controllers/
├── services/
├── repositories/
├── models/
└── validators/
```

as the primary architecture because it disperses one business capability across the whole codebase.

Preferred logical shape:

```text
apps/server/src/
├── modules/
├── foundation/
├── http/
├── commands/
└── bootstrap/
```

with the accepted Domain modules under `modules/`.

---

# 59. Pragmatic Domain / Application / Infrastructure Boundaries

Each Server module may use pragmatic internal boundaries such as:

```text
module/
├── domain/
├── application/
├── infrastructure/
└── index.ts
```

These boundaries are used where they reduce coupling and clarify ownership.

Version 1 does not require ceremonial Clean Architecture layers, interface folders, presenters, gateways, interactors, adapters, and use-case classes for every trivial operation.

> **Use architectural boundaries where they reduce coupling; do not manufacture ceremony.**

Folders may remain shallow until code volume or responsibility justifies further subdivision.

---

# 60. Domain Layer Responsibilities

A Domain layer contains business meaning such as:

- lifecycle invariants
- Domain-specific state rules
- value objects with real business meaning
- transition validation
- business-policy calculations

Examples:

```text
DocumentLifecycle
AnnouncementPeriod
HealthServiceStatus
```

Domain code must not depend directly on:

- HTTP request/response objects
- SQL queries or ORM session details
- React/browser APIs
- filesystem calls
- environment-variable access

Domain concepts remain server-owned and cannot be imported into Public Web/Admin as their application data model.

---

# 61. Application Layer Responsibilities

Application capabilities orchestrate use cases such as:

```text
PublishNews
CreateServiceDraft
SupersedeDocument
ScheduleAnnouncement
UpdatePersonnel
```

Typical responsibility may include:

1. authorization/capability checks
2. loading required Domain state
3. executing Domain rules
4. coordinating explicit cross-module capabilities
5. persisting the canonical mutation
6. recording required Audit state
7. initiating post-commit derived work where appropriate

This is the normal coordination point for cross-module operations and HTTP/CLI entry points.

---

# 62. Infrastructure Layer Responsibilities

Infrastructure contains implementation details required by Application/Domain capabilities, for example:

- SQL persistence implementations
- file/media storage adapters
- password hashing implementation
- Search projection persistence
- logging/configuration adapters

Business rules must not be placed here merely because persistence code can conveniently inspect database rows.

The architecture hides infrastructure where that boundary is useful, but does not introduce an interface solely because every class is expected to have one.

---

# 63. Repository Abstractions Follow Use Cases

Version 1 does not automatically create one generic repository interface per database table.

Avoid mechanical structures such as:

```text
INewsRepository
IActivityRepository
IDocumentRepository
IMediaRepository
```

when they provide no meaningful boundary.

Prefer capability-oriented abstractions when needed, for example:

```text
NewsStore
DocumentLookup
PublicSearchProjection
MediaStorage
```

The abstraction should reflect an Application/Domain need rather than ORM ceremony.

---

# 64. Module Public Entry Points

Each Server module exposes an intentional public entry point, conceptually:

```text
modules/documents-media/index.ts
```

Only contracts/capabilities intended for other modules are exported.

Allowed conceptual exports:

```text
DocumentLookup
DocumentReference
```

Internal persistence details remain private:

```text
DocumentSqlRepository
DocumentSqlMapper
DocumentTableRow
```

A consuming module imports the module boundary, not a deep implementation path.

---

# 65. Import and Dependency Boundaries

Cross-module imports must preserve the accepted ownership model.

Allowed:

```text
Citizen Services
→ Documents & Media public Application contract
```

Prohibited:

```text
Citizen Services
→ Documents & Media / infrastructure / SQL repository
```

Likewise, Domain code must not depend upward on HTTP/React/Application implementation details.

Normal conceptual direction remains:

```text
Presentation
     ↓
Application
     ↓
Domain

Infrastructure implements required persistence/technical boundaries
```

Architecture enforcement should use ordinary TypeScript/lint/dependency tooling where practical, not custom framework machinery.

---

# 66. Module Communication Remains In-Process

The lightweight workspace does not alter the previously accepted Modular Monolith rule.

Cross-module Server calls use explicit in-process contracts/functions/Application services.

The repository must not introduce internal REST/HTTP calls such as:

```text
localhost/api/internal/...
```

merely because modules live in separate folders/packages.

Package/folder separation is a code ownership tool, not a simulation of distributed services.

---

# 67. HTTP Layer and Route Composition

HTTP code is a transport boundary whose responsibilities are limited to concerns such as:

- route registration
- request parsing
- transport-level validation
- authentication context
- calling an Application capability
- mapping Application results/errors to transport responses

Business lifecycle/authorization logic does not live in controllers.

Feature-specific route definitions may live near their module for discoverability, while a central HTTP/bootstrap layer composes/registers routes for the running application.

Exact framework conventions are deferred to the Backend Framework decision.

---

# 68. Public and Admin API Representations

Public and Admin API representations may differ because their data-exposure and workflow responsibilities differ.

Public contracts expose only public-safe data.

Admin contracts may expose authorized workflow information such as:

- Draft fields
- validation issues
- schedule metadata
- allowed actions
- internal workflow state appropriate to the caller

The system does not return a single oversized Domain/ORM object and rely on React to hide restricted fields.

---

# 69. Public Web Structure Is Route/Feature-Oriented

Conceptual Public Web organization:

```text
apps/web/src/
├── routes/
├── features/
├── components/
├── layouts/
├── lib/
└── entry/
```

Feature groupings may include:

```text
news/
services/
health-content/
health-services/
ita/
search/
```

Frontend feature boundaries follow user experience and do not need to mirror Server modules one-for-one.

Exact route directory conventions may change if the selected rendering/router framework has a stronger appropriate convention.

---

# 70. Admin CMS Structure Is Feature-Oriented

Conceptual Admin structure:

```text
apps/admin/src/
├── routes/
├── features/
├── components/
├── layouts/
├── auth/
└── lib/
```

Feature examples:

```text
editorial/
documents/
personnel/
health-services/
services/
ita/
homepage/
users/
```

This prevents the Admin application from becoming one giant `pages/`, `components/`, `services/`, and `utils/` hierarchy with unrelated domains mixed together.

---

# 71. Typed API Client Boundary

Public/Admin components should not scatter raw API request construction throughout React components.

Each application uses a small typed client/data-access boundary, placed near the owning feature or a genuinely shared transport utility.

That boundary centralizes concerns such as:

- request/response DTOs
- query serialization
- authentication handling where applicable
- standardized transport errors
- runtime response assumptions where needed

This remains a browser transport concern and does not import backend Domain or persistence code.

---

# 72. Shared TypeScript Types Are Intentionally Limited

TypeScript makes over-sharing types easy. Version 1 explicitly resists using one `News`, `User`, `Document`, or `Service` type everywhere.

Share only what is genuinely a transport/protocol contract.

Do not share:

- ORM models
- database table row types
- backend Domain Entities
- repositories
- internal permission implementation details
- persistence-specific enums that are not API contracts

Different layers may have different representations of the same business resource where responsibilities differ.

---

# 73. Runtime Validation at Trust Boundaries

TypeScript compile-time types disappear at runtime and are not security validation.

External/browser/API input must be runtime-validated at the Server trust boundary.

The preferred model is conceptually:

```text
Runtime Schema
      +
TypeScript Type
```

where appropriate, allowing compile-time and runtime contracts to remain aligned.

The exact schema library (for example Zod, Valibot, framework-native schema, or another suitable choice) is deferred to technology selection.

---

# 74. Database Schema Changes Are Version Controlled

Database schema evolution is managed through version-controlled migration tooling associated with the Server/database layer.

Routine production schema changes are not performed manually through phpMyAdmin as the normal deployment process.

phpMyAdmin may remain an operational inspection/diagnostic tool when appropriate, but it is not the authoritative schema-change workflow.

The exact migration/ORM tool is deferred.

---

# 75. Schema Migration and Seed/Reference Data Are Separate

Database schema migrations and initial/reference data setup are separate concepts.

Examples of seed/bootstrap/reference concerns may include:

- initial CMS roles/module definitions
- controlled initial Admin creation/bootstrap
- geographic Area reference data
- other explicit master-data imports

These should not be hidden inside unrelated schema migrations merely for convenience.

Likewise, future legacy WordPress import is not treated as ordinary schema seed data.

---

# 76. Operational Commands Reuse the Application Core

The Server provides command/CLI entry points for non-HTTP operations such as:

- Scheduled Publish processing
- Search reconciliation/rebuild operations
- controlled Admin bootstrap/reset workflows where appropriate
- maintenance tasks justified by real operational need

Conceptually:

```text
server command
      ↓
Application capability
      ↓
Domain / persistence
```

Cron-triggered tasks reuse the same authoritative Application/Domain logic rather than reimplementing publication or eligibility rules in standalone scripts.

---

# 77. Root Scripts Are Not Production Business Logic

A repository-level `scripts/` directory may be used for developer/project automation such as:

- build helpers
- safe repository checks
- release preparation
- one-off controlled maintenance tooling

Core production behavior must not quietly live in miscellaneous scripts.

For example, production Scheduled Publish should be an application command/capability, not an independent `scripts/publish-scheduled-posts.ts` implementation path.

---

# 78. Runtime Configuration and Secrets

The codebase distinguishes build/developer configuration from runtime application configuration and secrets.

Server runtime configuration may include:

- database connection configuration
- session/security secrets
- storage paths
- canonical/base URL
- runtime environment
- logging configuration

Required runtime configuration is validated at startup. Missing critical configuration should fail clearly rather than silently falling back to unsafe defaults.

Local development may provide a committed `.env.example`, while actual `.env`/production secrets remain uncommitted.

---

# 79. Testing Organization

Tests are primarily colocated with their owning module/feature where this keeps behavior discoverable.

Conceptual layers:

```text
Unit
→ Domain/Application invariants

Integration
→ Database/storage/module integration

HTTP/API
→ transport/auth/validation contracts

End-to-End
→ critical Public/Admin journeys
```

Dedicated cross-module integration or E2E areas may exist for scenarios that genuinely span multiple modules.

Coverage percentage is not the product goal; high-value invariants, security boundaries, publishing lifecycle, permissions, and risky workflows receive priority.

---

# 80. Naming, File Conventions, and Path Aliases

Source identifiers and code names use clear English domain terminology such as:

```text
health-service
personnel
announcement
document
publication
```

Thai remains appropriate for authored content and UI labels.

Filename conventions should be simple and consistent (for example lowercase kebab-case) rather than introducing multiple naming schemes.

Path aliases may improve readability, but they may not be used to disguise prohibited deep/cross-module dependencies.

Exact formatting/lint conventions are implementation standards rather than Product architecture decisions.

---

# 81. Circular Dependencies and Shared Utility Smells

Circular module dependencies are treated as an architecture smell.

Example:

```text
Editorial → Documents
Documents → Editorial
```

may indicate unclear ownership or orchestration that belongs at a higher Application coordination point.

The normal response is to repair the ownership/contract boundary, not merely hide the cycle with lazy imports.

Similarly, giant files/areas named `utils`, `helpers`, `common`, or `constants` must not become dumping grounds for Domain behavior.

If code has business meaning, it belongs with its owning module.

---

# 82. Initial Logical Repository Shape

The initial logical repository shape is:

```text
website/
│
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── routes/
│   │       ├── features/
│   │       ├── components/
│   │       ├── layouts/
│   │       └── lib/
│   │
│   ├── admin/
│   │   └── src/
│   │       ├── routes/
│   │       ├── features/
│   │       ├── components/
│   │       ├── layouts/
│   │       ├── auth/
│   │       └── lib/
│   │
│   └── server/
│       └── src/
│           ├── modules/
│           │   ├── editorial/
│           │   ├── organization-directory/
│           │   ├── citizen-services/
│           │   ├── health-services-area/
│           │   ├── health-information/
│           │   ├── documents-media/
│           │   ├── ita/
│           │   ├── homepage/
│           │   ├── identity-access/
│           │   ├── publishing/
│           │   ├── search/
│           │   └── audit/
│           ├── foundation/
│           ├── http/
│           ├── commands/
│           └── bootstrap/
│
├── packages/
│   ├── contracts/
│   ├── ui/
│   └── config/
│
├── docs/
├── scripts/
└── package.json
```

This is a logical baseline, not a requirement that every directory exist on day one.

> **Create directories when they have code, not empty architecture theatre.**

---

# 83. Workspace and Monorepo Tooling Policy

The repository uses a workspace-capable package-management approach, but the exact package manager is deferred until implementation planning/deployment compatibility is checked.

No baseline requirement exists for:

- Nx
- Turborepo
- remote build cache
- custom workspace generators
- internal package registries
- independent package release orchestration

Ordinary package-manager workspaces are sufficient unless real build/developer complexity later justifies additional tooling.

---

# 84. Build Independence Without Independent Product Versioning

`web`, `admin`, and `server` should be able to typecheck/test/build with reasonably clear boundaries, even when production deployment packages them together.

However, Version 1 remains one coordinated application product. Internal packages do not require independent Semantic Versioning, publishing, Changesets-style release management, or separate release trains.

Repository boundaries exist to support maintainability, not to create artificial product independence.

---

# 85. Architecture Enforcement in Normal CI

Normal CI/tooling should enforce the most valuable repository invariants where practical, including:

- no frontend import of backend Domain/persistence implementation
- no deep cross-module infrastructure imports
- no Server dependency on Public/Admin application code
- no unintended circular dependencies
- typecheck
- lint
- relevant tests

Version 1 does not require a custom architecture compiler or enterprise dependency-governance platform.

Simple automated checks plus code ownership discipline are sufficient for the current scale.

---

# 86. Repository Structure Anti-Patterns

Version 1 explicitly avoids:

- separate repositories for Public Web/Admin/Server without an operational reason
- one giant unstructured package
- dozens of speculative internal packages
- backend Domain Entities shared directly to React
- ORM/database rows used as API DTOs
- universal Public/Admin components with excessive configuration merely to claim reuse
- global controller/service/repository/model folders as the primary server organization
- repository/interface-per-table ceremony
- cross-module deep imports
- internal HTTP between modules
- production business logic hidden in root scripts
- runtime secrets committed to the repository
- manual phpMyAdmin schema edits as normal deployment practice
- giant `shared`, `common`, `utils`, or `helpers` business-logic areas
- Nx/Turborepo/remote-cache/package-publishing infrastructure without proven need
- empty folder trees created only to mirror an architecture diagram

---

# 87. Accepted Repository & Codebase Structure

**Sections 51–86 = Accepted Repository & Codebase Structure.**

Accepted baseline:

- the project uses one repository with a lightweight workspace/monorepo structure rather than separate repositories for Public Web, Admin CMS, and Server.
- the primary applications are `apps/web`, `apps/admin`, and `apps/server`, with only a small number of genuinely reusable packages introduced as needed.
- the Server is organized module-first rather than globally grouping controllers, services, repositories, and models by technical type.
- Server modules use pragmatic Domain/Application/Infrastructure boundaries without ceremonial Clean Architecture layers for every small feature.
- Domain models remain server-owned and are never shared directly with frontend applications or exposed as transport responses.
- shared browser/server contracts are transport DTOs/runtime-validatable schemas, not ORM models, database rows, repositories, or backend Domain Entities.
- `packages/ui` contains neutral reusable presentation primitives only; application-specific Public/Admin features remain with their owning application.
- Public Web and Admin CMS may share primitives but are not forced into one universal component architecture because their UX responsibilities differ.
- each Server module exposes an intentional public entry point; consuming modules cannot import another module's persistence/internal implementation directly.
- internal module communication remains in-process through explicit Application capabilities/contracts, not localhost HTTP.
- HTTP layers parse/authenticate/runtime-validate/call Application capabilities/map responses; business rules do not live in controllers.
- Public and Admin representations remain separate contracts where visibility/workflow metadata differs.
- Public/Admin use typed API-client boundaries rather than scattering raw request construction across React components.
- shared TypeScript types are intentionally limited to genuine transport/protocol contracts.
- API/trust-boundary inputs receive runtime validation in addition to compile-time TypeScript types.
- database schema changes are version controlled through application/database migration tooling rather than routine manual production schema changes.
- schema migration, reference seed/bootstrap data, and future legacy content migration remain distinct concerns.
- operational commands such as scheduling and Search reconciliation reuse the same Application/Domain core instead of duplicating business logic in standalone scripts.
- runtime configuration/secrets remain outside source code, are validated at startup, and real production secrets are never committed.
- tests are primarily colocated with owning modules/features, with cross-module integration/E2E areas added only where useful; critical invariants matter more than coverage percentage alone.
- circular dependencies, giant Shared/Utils areas, deep cross-module imports, and frontend access to backend internals are architecture smells and are prevented through normal lint/typecheck/CI tooling where practical.
- the repository avoids speculative monorepo infrastructure such as internal package publishing, independent package versioning, Nx/Turborepo-style orchestration, remote caches, or custom architecture tooling until real need appears.
- the physical directory tree grows incrementally; empty architecture theatre is avoided.

This structure is considered the Version 1 best-practice baseline because it creates enforceable ownership and maintainability without adding infrastructure or abstraction beyond current requirements.

---

# 88. Next Discussion Topic

> **Backend Framework, API Style & Runtime Validation Strategy**

The next decisions should select the practical backend foundation for the accepted Modular Monolith, including:

- Fastify vs Express vs NestJS or another evidence-backed option
- framework structure versus application/domain structure
- REST/resource/capability API conventions
- request/response schema and runtime validation approach
- error model and HTTP mapping
- route composition for Public/Admin/Auth surfaces
- how framework plugins/middleware interact with module boundaries
- how much dependency injection is actually useful
- whether OpenAPI generation is worth including in Version 1
- how the selected framework runs cleanly on Bangmod Expert Hosting without making deployment architecture heavier than necessary

Technology selection must preserve the accepted `00–08` Product semantics and Sections 1–87 of this System Blueprint rather than forcing the architecture to fit a framework.


# 89. Backend Technology Baseline

Version 1 selects the following backend HTTP/runtime baseline:

```text
Backend Language
→ TypeScript

Runtime
→ Supported Node.js LTS

HTTP Framework
→ Fastify

API Style
→ Pragmatic REST
   + explicit Domain actions

Runtime Contracts
→ TypeBox / JSON Schema

Validation
→ Transport validation at the HTTP boundary
   + Domain/Application validation for business rules

API Documentation
→ OpenAPI generated from route schemas

Dependency Wiring
→ Explicit composition
   no DI container baseline
```

This technology choice implements the already accepted Modular Monolith. It does not replace the Module/Application/Domain architecture with framework-specific structure.

---

# 90. Why Fastify Is the Version 1 HTTP Framework

Fastify is selected because it provides a useful middle ground between a deliberately minimal middleware framework and a framework-heavy application platform.

For this project it provides the HTTP capabilities that are genuinely useful:

- structured route registration
- request/response schemas
- runtime validation
- response serialization
- TypeScript integration
- plugin encapsulation for HTTP/infrastructure concerns
- a practical path to OpenAPI documentation

without requiring the application to adopt a large framework-owned Domain architecture, decorator model, dependency-injection container, or generic module system.

The project already defines its own Business Modules and Application boundaries, so the HTTP framework should support those boundaries rather than redefine them.

---

# 91. Fastify Is an HTTP Adapter, Not the Application Architecture

The normal request path is:

```text
HTTP Request
    ↓
Fastify Route / Transport Adapter
    ↓
Transport Validation + Auth Context
    ↓
Application Capability
    ↓
Domain Rules
    ↓
Persistence / Infrastructure
```

Fastify routes/plugins do not become the place where authoritative publishing, permissions, lifecycle, concurrency, ITA, Search eligibility, or other Product rules live.

A Fastify plugin is also not automatically equivalent to a Business Module. HTTP composition may follow Module boundaries where useful, but Domain ownership remains defined by Sections 24–49.

---

# 92. TypeScript and Node.js Runtime Policy

Backend code is written in TypeScript.

Production uses a supported Node.js LTS release available on the target hosting environment. The exact major/minor runtime is locked by implementation/deployment configuration rather than frozen permanently into the architecture document.

This keeps production on a supported runtime without forcing the Blueprint to chase every Node.js release.

---

# 93. API Surface Separation

Version 1 keeps separate logical HTTP surfaces for different trust and visibility contexts:

```text
/api/public/...
/api/admin/...
/api/auth/...
```

These are namespaces inside the same backend application, not separate network services.

Responsibilities:

- `/api/public` exposes anonymous, public-safe representations only.
- `/api/admin` exposes authenticated CMS capabilities and workflow metadata only after backend authorization.
- `/api/auth` handles authentication/session lifecycle concerns.

A shared backend does not imply a shared DTO or shared visibility model between Public and Admin clients.

---

# 94. Pragmatic REST Baseline

Version 1 uses resource-oriented REST for ordinary resource operations and explicit Domain actions for meaningful business transitions.

Ordinary editing may conceptually use operations such as:

```text
GET    /api/admin/news/:id
POST   /api/admin/news
PATCH  /api/admin/news/:id
```

Business transitions are not represented as arbitrary status-field mutations.

Examples:

```text
POST /api/admin/news/:id/publish
POST /api/admin/news/:id/schedule
POST /api/admin/news/:id/archive
POST /api/admin/documents/:id/supersede
```

The exact route naming may be refined during implementation, but the architectural rule is stable:

> **CRUD for ordinary resource editing; explicit commands for meaningful Domain transitions.**

---

# 95. API Is Neither Generic CRUD nor RPC Everywhere

Version 1 rejects both extremes:

- a generic table/record CRUD API that exposes lifecycle as arbitrary field mutation
- an RPC-style endpoint for every individual field operation

The API should reflect the resource and Domain semantics already defined in the Frozen documents.

The backend therefore remains capability-oriented without inventing a custom command endpoint for every trivial edit.

---

# 96. Runtime Validation at Every External Trust Boundary

Every external HTTP input is untrusted until runtime validation succeeds.

```text
Browser / External Client
        ↓
Params / Query / Headers / JSON Body
        ↓
Runtime Schema Validation
        ↓
Validated Transport DTO
        ↓
Application Capability
```

TypeScript compile-time types alone are never treated as runtime request validation.

This applies to Public, Admin, and Auth surfaces.

---

# 97. TypeBox and JSON Schema as the HTTP Contract Baseline

Version 1 uses **TypeBox / JSON Schema** as the preferred HTTP transport-schema baseline because it aligns directly with Fastify's schema-driven validation and serialization model while retaining TypeScript inference.

A transport schema may serve as the authoritative definition for:

- runtime request validation
- runtime response serialization
- TypeScript transport types
- OpenAPI schema generation

Examples include:

- `SearchRequest`
- `LoginRequest`
- `UpdateNewsRequest`
- `NewsPublicResponse`
- `DocumentAdminResponse`

TypeBox is a transport-boundary tool, not a requirement to model every Domain Entity or aggregate as a schema object.

---

# 98. Transport Validation and Domain Validation Stay Separate

Transport validation answers questions such as:

```text
Is page an integer >= 1?
Is title a string?
Is the identifier structurally valid?
Is scheduledAt a valid timestamp representation?
```

Domain/Application validation answers questions such as:

```text
May this record be published now?
Does this user have the required capability and Module Scope?
May this Document supersede the selected predecessor?
Is this lifecycle transition valid?
Does this mutation violate optimistic concurrency?
```

Business rules are not pushed into JSON Schema merely because the HTTP framework supports schemas.

---

# 99. Explicit Response Schemas and Data Minimization

Public and Admin responses use explicit allowlisted response schemas rather than serializing ORM rows or Domain objects directly.

```text
Domain / Application Result
        ↓
Public or Admin DTO Mapper
        ↓
Response Schema
        ↓
JSON Response
```

This reduces accidental data exposure and reinforces the Frozen privacy/permission model.

For example, a Public Personnel response may expose public name/position/photo fields without exposing internal workflow, account, audit, or administrative metadata.

Frontend code is never relied on to hide fields that should not have left the server.

---

# 100. Public and Admin Contracts Are Deliberately Different

The same canonical resource may have different transport representations depending on context.

Public DTOs contain only fields that are legitimate for public delivery.

Admin DTOs may additionally contain authorized workflow information such as:

- Draft fields
- validation issues
- scheduling metadata
- lifecycle controls
- concurrency version

The backend remains authoritative over which representation a caller may receive.

---

# 101. Stable API Identity

Transport routes do not use mutable Titles or Slugs as authoritative resource identity.

Public routes/APIs may resolve resources through the Frozen Stable Public Identifier/canonical routing model, while Admin APIs may use stable internal identifiers appropriate to CMS operations.

A Title or Slug change must not silently change authoritative resource identity.

---

# 102. Canonical API Error Model

Version 1 uses one predictable error envelope for machine-readable client behavior.

Conceptually:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "...",
    "fields": []
  }
}
```

Stable error-code categories include, as needed:

- `VALIDATION_FAILED`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `BUSINESS_RULE_VIOLATION`

Internal stack traces, SQL errors, filesystem paths, table names, raw exceptions, or sensitive infrastructure details are not returned to clients.

---

# 103. HTTP Status Semantics

Version 1 uses consistent HTTP semantics across Modules.

Baseline mapping:

- `200` — successful read/update/action with response content
- `201` — resource created
- `204` — successful operation with intentionally empty response body
- `400` — malformed request or transport/schema validation failure
- `401` — authentication required or authentication invalid
- `403` — authenticated caller lacks authorization
- `404` — resource is unavailable/not found in the caller's allowed context
- `409` — optimistic-concurrency or current-state conflict
- `422` — structurally valid request that violates a Domain/business rule and is not better represented as `409`

For Public content, Hidden/Internal/otherwise non-public resources preserve the Frozen non-disclosure semantics rather than revealing their existence through a special error response.

---

# 104. Optimistic Concurrency Is Part of the API Contract

The Frozen Admin CMS optimistic-concurrency requirement is enforced by the backend API.

A write carries a version/concurrency token or equivalent expected state.

```text
Client expected version = 7
Canonical version       = 8
        ↓
409 Conflict
```

The backend does not silently overwrite a newer mutation merely because the submitted DTO is otherwise valid.

Frontend conflict UX supplements this rule but never replaces it.

---

# 105. Pagination Strategy

Version 1 uses simple predictable page-based pagination where listing/search use cases require pagination.

Conceptually:

```text
?page=2&pageSize=20
```

Search follows the Frozen `08` pagination semantics.

Cursor pagination is not a default platform abstraction in Version 1 and should be introduced only if a concrete high-volume/streaming use case requires it.

The server controls maximum/default page sizes.

---

# 106. Filtering and Sorting Are Allowlisted Capabilities

APIs expose only filters and sort choices that a real Product use case requires.

Version 1 does not expose arbitrary database columns, operators, raw predicates, regex expressions, or generic query-language parameters to clients.

Conceptually valid:

```text
?status=draft&page=2
```

Conceptually rejected:

```text
?sort=any_database_column
?filter[raw_condition]=...
```

This keeps API semantics predictable and limits coupling/security risk.

---

# 107. OpenAPI Is Generated from Runtime Route Schemas

Version 1 includes OpenAPI generation as developer-facing documentation derived from the same route/request/response schemas used by the application.

Primary uses:

- inspect API contracts
- development/testing support
- debugging integration behavior
- enable future typed-client generation if it becomes useful

OpenAPI does not become a code-generation architecture that creates Domain models, repositories, or Application logic from a large external YAML definition.

The runtime/Application architecture remains authoritative.

---

# 108. API Documentation Is Not a Public Production Feature

Swagger/OpenAPI developer UI is not exposed publicly in production by default, especially for Admin APIs.

The specification/UI may be available in development, testing, build artifacts, or a controlled operational environment as appropriate.

API documentation is a developer/operations capability, not part of the citizen-facing website.

---

# 109. Explicit Dependency Composition, No DI Container Baseline

Version 1 uses explicit dependency wiring/composition rather than introducing a dependency-injection container by default.

Conceptually:

```text
createPublishDocument({
  documentStore,
  auditRecorder,
  clock,
  transactionManager
})
```

This keeps dependencies visible in ordinary TypeScript code.

A DI container may be reconsidered only if the real dependency graph becomes difficult enough to justify the added indirection. Inversify/Awilix/TSyringe/custom service-locator infrastructure is not a baseline requirement.

---

# 110. Fastify Plugin Policy

Fastify plugins/hooks/decorators are appropriate for HTTP/infrastructure concerns such as:

- database connection/bootstrap integration
- authentication/session hooks
- request context
- logging/request correlation
- route registration
- shared transport behavior

They are not used to hide the complete Application dependency graph inside a global service locator.

Business/Application dependencies remain explicit whenever practical.

---

# 111. Framework Lock-In Is Kept at the Edge

Fastify-specific code should be concentrated around transport/bootstrap concerns.

Changing the HTTP framework in the future should primarily affect:

- route adapters
- request/response schemas/integration glue
- framework plugins/hooks
- bootstrap

It should not require rewriting:

- Publishing rules
- Document lifecycle
- Personnel/Organization rules
- ITA structure
- Search eligibility
- Domain permissions

The accepted Domain/Application architecture therefore remains more stable than the selected HTTP framework.

---

# 112. Backend/API Anti-Patterns

Version 1 explicitly avoids:

- Express-style unstructured middleware accumulation despite choosing Fastify
- framework-owned business architecture that replaces the accepted Module boundaries
- controllers/routes containing Domain rules
- raw table CRUD APIs
- generic `status` mutation for meaningful lifecycle transitions
- RPC endpoint-per-field editing
- ORM/Domain object serialization directly to clients
- TypeScript-only trust-boundary validation
- one DTO used for every Public/Admin context
- arbitrary client-defined filters/sorts/query operators
- raw internal exception/error exposure
- silent lost-update overwrites
- giant OpenAPI-first code generation that manufactures Domain/Application layers
- public production Swagger UI by default
- speculative DI-container/service-locator infrastructure
- Fastify decorators used as an invisible global dependency registry

---

# 113. Accepted Backend Framework, API Style & Runtime Validation Strategy

**Sections 89–112 = Accepted Backend Framework, API Style & Runtime Validation Strategy.**

Accepted baseline:

- backend language is TypeScript on a supported Node.js LTS runtime.
- Fastify is the Version 1 HTTP framework and remains an HTTP/transport adapter rather than the application architecture.
- the API uses pragmatic resource-oriented REST plus explicit endpoints/actions for meaningful Domain lifecycle transitions.
- generic raw-table CRUD APIs, arbitrary status mutation, and RPC-everywhere designs are rejected.
- Public/Admin/Auth surfaces are separated logically inside the same backend application.
- every external input receives runtime validation; TypeScript compile-time typing alone is never treated as request validation.
- TypeBox / JSON Schema is the preferred transport-schema baseline for Fastify request/response contracts and TypeScript inference.
- transport/schema validation remains distinct from Domain/Application business validation.
- explicit response schemas/DTO mappings act as an allowlist and prevent ORM/Domain/internal metadata from leaking to clients.
- Public and Admin representations may differ according to visibility/workflow requirements.
- mutable Titles/Slugs are not authoritative API identity.
- API errors use a predictable machine-readable envelope without infrastructure/internal exception leakage.
- HTTP status usage is standardized, including `400` for transport/schema failures, `409` for concurrency/current-state conflicts, and `422` for structurally valid Domain/business-rule violations where appropriate.
- optimistic concurrency is enforced by the backend API and conflicts are never silently overwritten.
- simple page-based pagination is the Version 1 default where needed; cursor pagination is requirement-driven rather than universal.
- filters and sorting are explicit allowlisted capabilities, not arbitrary database query exposure.
- OpenAPI is generated from runtime route schemas for development/integration documentation and does not drive Domain code generation.
- Swagger/OpenAPI UI is not a public production website feature by default.
- dependencies are wired through explicit composition; a DI container is not a Version 1 baseline dependency.
- Fastify plugins/hooks are used for HTTP/infrastructure concerns without turning the Fastify instance into a global service locator.
- framework-specific code stays near the transport/bootstrap edge so Domain/Application behavior remains framework-independent.

This selection is considered the Version 1 best-practice balance between structure, runtime safety, maintainability, and low framework ceremony for the accepted Modular Monolith.

---

# 114. Next Discussion Topic

> **Database Technology, Data Access & Transaction Strategy**

The next decisions should establish the persistence foundation for the accepted Modular Monolith, including:

- MySQL vs MariaDB on the actual Bangmod Expert Hosting environment
- ORM vs query builder vs direct SQL and how much abstraction is useful
- schema/data migration tooling
- table/key/identifier conventions
- repository/data-access implementation boundaries
- transaction ownership and cross-Module atomic operations
- optimistic-concurrency persistence strategy
- Document supersession and other critical multi-record mutations
- Audit participation in canonical transactions
- Search projection work outside the canonical transaction
- indexes, constraints, relational integrity, and JSON-column policy
- connection pooling and hosting-aware operational limits
- how to avoid allowing ORM/database convenience to redefine the Frozen Domain model

The database technology must support the accepted Domain invariants and transaction semantics while remaining simple enough to operate reliably on the selected hosting environment.

# 115. Database Technology Baseline

Version 1 uses the relational database service available on Bangmod Expert Hosting as a **MySQL-compatible relational database**.

The System Blueprint does **not** freeze the exact vendor/version as MySQL or MariaDB until the provisioned production/staging environment is inspected directly.

Baseline:

```text
Production Database
        ↓
MySQL-compatible relational database
provided by Bangmod Expert Hosting
        ↓
InnoDB
utf8mb4
        ↓
Exact vendor + version verified before deployment
```

This avoids designing against an assumed database edition that may not match the actual hosting environment.

The exact database vendor/version is a Deployment Standard decision, not a Domain Architecture decision.

---

# 116. InnoDB Is the Business-Table Storage Baseline

Business tables use **InnoDB**.

The accepted requirements need:

- ACID transactions
- foreign-key enforcement
- row-level locking
- concurrent editing
- atomic lifecycle transitions
- accountable Audit participation in critical mutations
- targeted pessimistic locking for selected workflows

Version 1 has no requirement for MyISAM or specialized storage engines.

---

# 117. Character Set and Thai Data Policy

`utf8mb4` is the character-set baseline for all application text.

The exact collation is selected only after the real database engine/version is known and Thai comparison/search behavior is tested.

Database collation must not silently become the Public Search behavior contract defined by Frozen `08-search.md`.

Search normalization/ranking/Thai matching remains owned by the Search design even when the database provides supporting indexes or text capabilities.

---

# 118. Data Access Baseline — Kysely

Version 1 uses **Kysely** as the preferred TypeScript data-access/query-builder baseline.

```text
Application / Domain
        ↓
Repository / Query Capability
        ↓
Kysely
        ↓
MySQL-compatible driver
        ↓
MySQL / MariaDB environment
```

The goal is to retain:

- visible and predictable SQL behavior
- TypeScript query/type safety
- explicit joins and transactions
- a lightweight abstraction boundary
- freedom to shape Domain models independently from persistence models

Kysely is used as a data-access tool, not as the application architecture.

---

# 119. Why a Heavy ORM Is Not the Version 1 Baseline

Version 1 does not adopt a heavy ORM as the architectural center of the application.

The accepted rule remains:

```text
Domain Model
≠
Database Model
≠
API DTO
```

A tool that encourages generated persistence models to become Application/API models would increase coupling to the persistence layer and weaken the accepted Module/Domain boundaries.

Prisma and similar ORMs remain valid technologies in general, but the current system does not require their additional model/runtime abstraction.

Drizzle remains a reasonable alternative if implementation evidence later demonstrates a better fit, but Kysely is the accepted Version 1 baseline because it stays closer to a type-safe SQL query-builder role.

---

# 120. Raw SQL Is Allowed Deliberately

Kysely does not prohibit direct/raw SQL where it is clearly the safest or most maintainable representation of a query.

Raw SQL may be used for:

- database-specific capabilities proven necessary
- complex reporting/query expressions where the builder reduces clarity
- carefully reviewed migration/maintenance operations
- performance-sensitive queries after evidence/profiling

Raw SQL must remain parameterized and localized in the appropriate infrastructure/query boundary.

Version 1 does not choose between the false extremes of "ORM for everything" and "raw SQL scattered everywhere".

---

# 121. Persistence Row, Domain Model, and DTO Are Separate Boundaries

Persistence representations may contain fields required for storage and concurrency that are not part of the public Domain representation.

Conceptually:

```text
Database Row
    ↓ map
Domain / Application Model
    ↓ map
Public/Admin DTO
```

For example, a persistence row may contain:

- internal primary key
- public identifier
- optimistic-concurrency version
- technical timestamps
- internal actor references

These fields are not automatically part of Public or Admin API contracts.

Mapping remains pragmatic; Version 1 does not require ceremony-heavy mapper classes for every trivial record.

---

# 122. Internal Primary Key Strategy

Canonical relational tables use an internal numeric primary key where appropriate:

```text
BIGINT UNSIGNED AUTO_INCREMENT
```

This internal key is optimized for:

- relational joins
- foreign keys
- operational debugging
- compact indexes
- a single-database Modular Monolith

Internal database IDs are not public identity and must not replace the Frozen stable-public-identifier contract.

---

# 123. Stable Public Identifier Strategy

Publicly addressable canonical resources use a separate stable `public_id` generated by the application.

Version 1 baseline:

```text
id         = internal BIGINT primary key
public_id  = UUIDv7, UNIQUE
```

Title and Slug remain mutable presentation/discovery fields and are never authoritative identity.

UUIDv7 is chosen as the stable public-identity direction because it provides globally unique, time-ordered identifiers without relying on database sequence values as public identifiers.

For Version 1 the UUID representation should favor operational readability/debuggability over premature binary-storage optimization.

---

# 124. Foreign Keys Are Real Integrity Constraints

Structural relationships that are true relational dependencies use database foreign keys where practical.

Examples include conceptual relationships such as:

```text
Homepage Placement → canonical content resource
ITA Evidence → Document / Media
Service → related Document
Personnel → Organization
Health Service → Area
```

Foreign keys verify structural existence/integrity.

They do **not** replace Domain/Application rules about whether a relationship is semantically valid for the current lifecycle or workflow state.

---

# 125. Delete Cascades Are Conservative

`ON DELETE CASCADE` is not a universal default.

Cascade deletion is appropriate only for strictly owned child data that has no independent lifecycle or reuse value.

Relationships to canonical resources such as Documents, Media, News, Services, or ITA evidence targets should normally prefer restrictive/no-implicit-delete semantics.

The architecture must prevent a deletion in one Module from silently destroying legitimate canonical resources or references in another Module.

---

# 126. Database Constraints as a Structural Safety Net

The database should enforce structural invariants using appropriate native constraints, including:

- `NOT NULL`
- `UNIQUE`
- `FOREIGN KEY`
- `CHECK` where the target engine/version supports the intended semantics reliably

Examples include unique `public_id`, unique account identifiers, and mandatory structural references.

Complex Domain lifecycle logic remains in Application/Domain code rather than being encoded as large database constraint expressions.

Principle:

> **The relational database enforces structural integrity, while the Domain/Application layer owns business meaning and lifecycle rules.**

---

# 127. Optimistic Concurrency Persistence Strategy

Editable canonical records that participate in concurrent CMS editing use an explicit integer `version` field.

Conceptual update:

```sql
UPDATE news
SET title = ?,
    version = version + 1
WHERE id = ?
  AND version = ?;
```

If no row is updated because the stored version has advanced, the Application resolves the result as a concurrency conflict and returns the accepted `409 Conflict` API behavior rather than silently overwriting another user's changes.

The database is therefore the final arbiter of the optimistic-concurrency compare-and-update operation.

---

# 128. Pessimistic Locking Is Targeted, Not Default

Ordinary editing uses optimistic concurrency.

Targeted row locking may be used only where a critical transition must serialize concurrent mutations, for example:

- Document supersession
- scheduler claim/execution coordination
- selected publication/approval transitions
- other multi-record invariants where concurrent execution could violate Domain truth

Conceptually:

```text
Ordinary editing
→ optimistic concurrency

Critical atomic transition
→ transaction + targeted row lock when required
```

Version 1 does not hold database locks while a user has an edit form open.

---

# 129. Application Use Case Owns the Transaction Boundary

Transactions are opened around authoritative Application use cases, not around HTTP requests indiscriminately and not inside arbitrary repository methods without coordination.

Example:

```text
PublishDocument
      ↓
BEGIN
      ↓
Authorize
Load / lock as required
Validate Domain rules
Persist authoritative lifecycle changes
Record accountable Audit
COMMIT
      ↓
Post-commit derived work
```

This preserves the accepted separation between canonical mutations and derived Search work.

---

# 130. Cross-Module Atomic Transactions Are Allowed Without Breaking Ownership

Because Version 1 is a Modular Monolith using one relational database, an Application use case may coordinate an atomic transaction across multiple Module capabilities when a true business invariant requires it.

This does **not** authorize one Module to bypass another Module and mutate its tables/repositories directly.

The rule remains:

```text
Application orchestration
→ explicit Module capability
→ shared transaction context where required
```

not:

```text
Module A
→ Module B tables directly
```

No distributed saga or distributed transaction platform is required for same-database Version 1 workflows.

---

# 131. Audit and Search Participation in Transactions

For accountable business mutations, required Audit recording joins the same canonical database transaction when practical.

Example:

```text
Authoritative mutation
+
required Audit event
→ same canonical commit
```

Search remains derived:

```text
Canonical transaction COMMIT
        ↓
Search projection refresh / reconciliation
```

A Search synchronization failure does not roll back a valid canonical publication, consistent with Frozen `08-search.md`.

---

# 132. Transactions Must Remain Short

Database transactions should contain only the database work needed to preserve the invariant.

Do not keep a transaction open while performing:

- large file uploads
- image processing
- external HTTP/API calls
- email sending
- long user interaction
- unrelated maintenance work

Short transactions reduce lock duration, contention, and operational failure surface.

---

# 133. Deadlock Handling Strategy

Concurrent transactional systems may experience database deadlocks even when the design is correct.

Version 1 treats a deadlock as a transactional concurrency condition, not as a reason to weaken data integrity.

The Application may retry a small, bounded number of times only when the operation is safe/idempotent to retry.

Repeated deadlocks must be observable and investigated rather than hidden behind unlimited generic retry behavior.

---

# 134. Relational-by-Default Data Model

Business data is relational by default.

Guideline:

```text
If we query it,
relate to it,
filter by it,
enforce it,
or use it as canonical business meaning
→ relational column/table
```

JSON is an exception for genuinely flexible/non-relational context, such as limited technical or append-oriented metadata where relational querying/integrity is not required.

Core relationships, permissions, lifecycle state, Documents, ITA structures, Areas, Services, and canonical content are not stored as opaque JSON blobs for convenience.

This also reduces unnecessary dependency on vendor-specific differences between MySQL and MariaDB JSON implementations.

---

# 135. No Universal Soft-Delete Framework

A universal `deleted_at` mechanism does not replace the Frozen Domain lifecycle semantics.

The system already distinguishes meaningful states such as:

- Archived
- Hidden
- Inactive
- Expired
- Superseded
- Closed
- Gone / Permanently Withdrawn where applicable

These states remain authoritative.

Technical soft deletion may be introduced for a specific resource only when a real requirement justifies it; it is not a generic Version 1 lifecycle abstraction.

---

# 136. Time and Timezone Strategy

Absolute timestamps are stored in a timezone-stable representation, with **UTC** as the persistence baseline.

Business/user interpretation uses the accepted timezone:

```text
Asia/Bangkok
```

Conceptually:

```text
User chooses 18:00 Asia/Bangkok
        ↓
Application resolves instant
        ↓
Database stores UTC
        ↓
Public/Admin renders Asia/Bangkok
```

Pure calendar/domain dates such as Activity Date, Document Date, Fiscal Year, or reporting period use semantic date fields rather than being forced through timezone conversion.

---

# 137. Technical Timestamps and Domain Dates Stay Separate

Technical fields such as:

```text
created_at
updated_at
```

must not be reused as substitutes for Domain dates such as:

- `published_at`
- `scheduled_at`
- Activity Date
- Announcement start/end
- Document Date
- reporting period
- review date

Technical history and Domain meaning remain distinct.

---

# 138. Index Strategy Is Query-Driven

Indexes are created from:

- primary/unique constraints
- foreign-key access paths
- known high-value query patterns
- common filters and ordering
- measured query-plan/performance evidence

Version 1 does not index every column "just in case".

Composite indexes should be driven by actual query shape and verified with database query plans when implementation begins.

Database index strategy supports operational querying; it does not define the Frozen Public Search ranking/matching contract.

---

# 139. Search and Database Indexing Remain Separate Concerns

The existence of a database text/full-text index does not automatically satisfy Frozen `08-search.md`.

Public Search must still implement the accepted:

- Thai normalization/matching behavior
- eligibility safety
- ranking
- lifecycle handling
- result suppression/de-duplication
- canonical destinations

If the verified MySQL/MariaDB environment can implement that simply enough, the Search Module may use database capabilities.

If not, a dedicated Search implementation can be introduced later without redefining canonical content storage.

---

# 140. Schema Migrations Are Version Controlled and Explicit

All schema evolution is represented by version-controlled migration files in the Server codebase/tooling.

Normal production flow is conceptualized as:

```text
review migration
→ backup/pre-deploy checks
→ execute migration explicitly
→ verify
→ start/reload compatible application
```

Version 1 does **not** auto-run production schema migrations every time the web application starts.

This keeps schema change failure visible and operationally controllable.

---

# 141. Applied Migrations Are Immutable History

After a migration has been applied to a shared/staging/production environment, it is not edited retrospectively to change history.

If a correction is required, create a new migration.

For destructive/incompatible changes, use staged compatible evolution where necessary:

```text
Expand
→ deploy compatible code
→ backfill / verify
→ Contract
```

This pattern is used when the risk justifies it; it is not mandatory ceremony for every small schema change.

---

# 142. Schema Migration, Seed Data, and WordPress Migration Stay Separate

These are distinct concerns:

```text
Schema Migration
≠
Reference / Bootstrap Seed
≠
Legacy WordPress Content Migration
```

Examples:

- schema migrations evolve tables/constraints/indexes
- seed/bootstrap processes may initialize Roles, Module definitions, Area masters, or controlled reference data
- the deferred WordPress migration concerns legacy content/media and is reopened only after real SQL + `wp-content/uploads` evidence exists

No legacy-content migration logic belongs in the normal schema-migration history.

---

# 143. Connection Pooling and Hosting-Aware Limits

The Node.js application uses a bounded database connection pool rather than opening a new connection per request.

The Blueprint does not freeze an arbitrary pool size before the real Expert Hosting connection/resource limits are known.

Exact values are deployment tuning based on:

- hosting limits
- application concurrency
- transaction duration
- observed workload
- database behavior

The application must fail clearly when configuration is invalid rather than silently creating an unbounded connection strategy.

---

# 144. Database Credential and Operational Access Policy

Runtime database credentials should follow least privilege as far as the hosting environment allows.

Preferred conceptual separation:

```text
Migration credential
→ schema-changing capability

Runtime application credential
→ ordinary application DML only
```

Exact privilege separation depends on DirectAdmin/hosting capabilities and is verified during deployment design.

`phpMyAdmin` remains acceptable for inspection, diagnostics, and the separate legacy WordPress export workflow, but it is not the normal schema deployment mechanism for the new system.

Manual production `ALTER TABLE` work without a corresponding migration artifact is an anti-pattern.

---

# 145. Database Strategy Anti-Patterns

Version 1 explicitly avoids:

- selecting MySQL vs MariaDB by assumption before inspecting the actual host
- allowing an ORM schema/model to become the Domain or API contract
- scattering unparameterized/raw SQL throughout Application/Domain code
- exposing numeric internal IDs as canonical public identity
- using Title/Slug as relational identity
- trusting application code alone for structural integrity that belongs in database constraints
- pervasive `ON DELETE CASCADE`
- pessimistic locking for ordinary CMS editing
- long transactions that include file/network/external work
- cross-Module direct table mutation merely because all Modules share one database
- storing canonical relational business data as opaque JSON for convenience
- universal soft-delete as a substitute for Domain lifecycle
- reusing technical timestamps as Domain dates
- indexing every field without a query requirement
- treating DB FULLTEXT/indexes as equivalent to the Frozen Search contract
- auto-running production schema migration on every application startup
- editing previously applied migration history
- mixing schema migration, seed/reference data, and future WordPress content migration
- unbounded connection pools
- routine manual phpMyAdmin schema changes outside version control

---

# 146. Accepted Database Technology, Data Access & Transaction Strategy

**Sections 115–145 = Accepted Database Technology, Data Access & Transaction Strategy.**

Accepted baseline:

- production persistence is a MySQL-compatible relational database supplied by Bangmod Expert Hosting; the exact MySQL/MariaDB vendor and version are verified and frozen at deployment time rather than guessed in architecture.
- business tables use InnoDB and `utf8mb4`; exact collation is engine/version/test driven and does not replace the Frozen Thai Search contract.
- **Kysely** is the Version 1 TypeScript data-access/query-builder baseline; SQL remains visible/predictable and the Domain stays independent from persistence models.
- direct/raw SQL remains permitted when deliberate, parameterized, localized, and clearer or technically necessary.
- Database Row, Domain/Application Model, and Public/Admin DTO are separate boundaries.
- canonical relational tables use internal numeric primary keys where appropriate, while publicly addressable resources use a separate stable UUIDv7 `public_id`; mutable Title/Slug are never identity.
- relational integrity uses real foreign keys, unique/not-null constraints, and targeted check constraints where reliable; complex lifecycle meaning remains in Domain/Application code.
- delete cascades are conservative and reserved for strictly owned child data.
- optimistic concurrency uses a persisted `version` compare-and-update baseline; targeted row locking is limited to critical serialized transitions.
- Application use cases own transaction boundaries; true cross-Module invariants may share one database transaction through explicit Module capabilities without direct cross-Module table access.
- accountable Audit writes join the canonical transaction when required/practical, while Search synchronization remains derived and post-commit.
- transactions remain short; deadlock retries are bounded and only used for safe/idempotent operations.
- canonical business data is relational by default; JSON and technical soft-delete are exceptions rather than generic data/lifecycle frameworks.
- absolute timestamps persist in UTC and are interpreted/displayed in `Asia/Bangkok`; semantic calendar dates remain separate Domain fields.
- database indexes follow constraints and actual query patterns, while Public Search remains a separate behavioral contract.
- schema migrations are version controlled and executed explicitly; production startup does not automatically apply migrations.
- applied migrations are immutable history; staged expand/backfill/contract evolution is used when incompatible changes justify it.
- schema migrations, seed/bootstrap/reference data, and deferred WordPress content migration remain separate workflows.
- connection pooling is bounded and tuned after real Expert Hosting limits are known; no arbitrary architecture-time pool number is frozen.
- database credentials follow least privilege where hosting permits; phpMyAdmin is not the normal schema deployment path for the new system.

This is considered the Version 1 best-practice balance between relational integrity, explicit SQL behavior, Domain independence, transactional correctness, and hosting-aware operational simplicity.

---

# 147. Next Discussion Topic

> **Authentication, Session & Security Architecture**

The next decisions should establish the security foundation for the Admin CMS and backend, including:

- Admin authentication model and account lifecycle
- password hashing and password policy
- cookie/session strategy vs token-based alternatives
- session storage and invalidation
- Secure / HttpOnly / SameSite cookie policy
- CSRF protection for same-origin Admin/API flows
- login/session expiry and logout semantics
- rate limiting and brute-force protection
- password reset/recovery design
- whether MFA is required in Version 1 or remains an upgrade path
- authorization enforcement of Frozen `06-roles-permissions.md`
- security headers / TLS assumptions / origin policy
- auditability of security-sensitive actions
- secret/configuration handling
- how to preserve staff usability without weakening backend-authoritative access control

The security architecture must protect authenticated administrative capabilities without importing an unnecessary external identity platform or token complexity unless the actual requirements justify it.

---

# 148. OWASP-Aligned Security Baseline

Version 1 treats application security as an architectural requirement rather than a late deployment hardening task.

Primary references:

```text
OWASP ASVS 5.0.0
→ verification / security-requirement baseline

OWASP Cheat Sheet Series
→ implementation guidance for specific controls

OWASP Top 10:2025
→ risk-awareness and review checklist
```

The project does **not** claim blanket ASVS certification or a verification level merely because these references are used. A formal level/claim is made only after the applicable requirements have actually been mapped, implemented, and verified.

Security requirements remain risk-based and proportional to this system: a public website plus an authenticated staff CMS that can alter official public information.

---

# 149. Risk-Based ASVS Profile

The Version 1 security profile follows this rule:

- all applicable OWASP ASVS 5.0.0 Level 1 requirements are treated as the minimum verification floor.
- selected Level 2 controls are adopted where the system's public-impact, account privilege, data exposure, or operational risk justifies them.
- any requirement declared not applicable or intentionally deferred must have an explicit rationale during implementation/security review.
- the system must not describe itself as `ASVS Level 2 compliant` unless every applicable Level 2 requirement has been verified.

This prevents two opposite failures:

```text
Security by checklist theatre
```

and

```text
Security by informal best effort
```

The Blueprint uses OWASP as a measurable control reference while preserving the project's **Simple — Structured — Sustainable** principle.

---

# 150. Authentication Boundary

Version 1 authentication is required only for the Admin CMS and authenticated administrative APIs.

```text
Public Website
→ anonymous public access

Admin CMS
→ authenticated CMS User
→ current Role
→ current Module Scope
→ backend-authorized capability
```

`Personnel` and `CMS User` remain separate identities with separate lifecycle and responsibilities.

The public site does not gain citizen accounts merely to reuse the Admin authentication system.

---

# 151. Server-Side Session Architecture

Browser authentication uses a server-controlled session rather than JWT access/refresh tokens as the default Admin browser mechanism.

```text
Admin Browser
    │
    └── opaque session cookie
             ↓
          Fastify
             ↓
       Session Store
          CMS SQL DB
             ↓
          CMS User
```

The session identifier is opaque and contains no trusted authorization state that the browser can modify.

The production session store is database-backed or another explicitly approved server-side store. An in-memory development store is not a production session store.

Stateless JWT browser sessions are not a Version 1 requirement because immediate account/session revocation and current Role/Scope enforcement are more important than token portability for this CMS.

---

# 152. Sessions Do Not Freeze Authorization

Session state is intentionally minimal.

It may identify:

- the session
- the CMS User
- authentication time
- creation / last-activity / expiry metadata
- limited security context required for session management

It does **not** make a cached Role/Module Scope authoritative for the entire lifetime of the session.

For authenticated actions, backend authorization uses the current account state.

Therefore:

```text
Publisher → Editor
Admin disables User
Module Scope removed
```

must affect subsequent protected requests without requiring the old session to expire naturally.

This preserves the Frozen `06-roles-permissions.md` rule that authorization changes apply to subsequent actions.

---

# 153. Session Cookie Policy

Production session cookies use a narrow and defensive policy:

```text
HttpOnly = true
Secure = true
SameSite = Lax
Path = /
Domain attribute = omitted unless a verified deployment need exists
```

A `__Host-` cookie prefix is preferred when the final deployment satisfies the prefix requirements.

The session identifier is never stored in `localStorage` or exposed to application JavaScript.

Cookie names should avoid unnecessary technology fingerprinting.

`SameSite` is defense in depth and does not replace explicit CSRF protection.

---

# 154. CSRF and Request-Origin Protection

Because Admin authentication is cookie-based, every state-changing Admin HTTP operation requires CSRF protection.

This applies to normal mutations and explicit Domain commands such as:

```text
POST
PUT
PATCH
DELETE
Publish
Schedule
Archive
Supersede
Role / Scope changes
Security-setting changes
```

The implementation may use a well-reviewed synchronizer/custom-header/token pattern appropriate to the React/Fastify same-origin architecture.

Additional Origin/Referer validation may be used as defense in depth where reliable.

`GET` and `HEAD` routes must remain side-effect free with respect to protected business mutations.

---

# 155. Password Hashing

CMS passwords are stored using **Argon2id**.

Password storage rules:

- unique salt per password through the password-hashing implementation
- no reversible password encryption
- no SHA-256/MD5/general-purpose hash as password storage
- no custom cryptographic construction
- no plaintext password logging

Parameters are benchmarked on the real production hosting and must meet or exceed the current OWASP Password Storage guidance accepted at implementation time.

The Blueprint does not freeze stronger values blindly if the production environment has not yet been benchmarked, but it also does not permit configuration below the accepted security floor merely for performance convenience.

---

# 156. Password Policy

Version 1 uses a modern passphrase-friendly policy rather than composition theatre.

Baseline:

- minimum 15 characters for password-only credentials
- support at least 64 characters
- allow spaces and normal Unicode input
- no mandatory uppercase/lowercase/number/symbol composition formula
- allow password managers and paste
- do not silently truncate or transform the password
- screen new/changed passwords against common/compromised password lists using a privacy-safe implementation
- no forced 30/60/90-day rotation without evidence of compromise or an explicit security requirement

Password policy is uniform enough to explain to staff and does not vary by arbitrary UI screen.

---

# 157. Login Abuse and Credential-Stuffing Protection

Authentication endpoints receive dedicated abuse controls.

Baseline includes:

- rate limiting / throttling
- account-aware and source-aware signals where practical
- increasing delay or temporary throttling after repeated failures
- security logging of suspicious authentication patterns
- bounded request/body sizes

The system does not use a naive permanent lockout such as:

```text
5 failures
→ account permanently locked
```

because an attacker could use that behavior to deny legitimate staff access.

Exact thresholds are operational configuration and are tested against real staff workflow rather than guessed in the architecture document.

---

# 158. Authentication Enumeration Resistance

Anonymous authentication/recovery responses must not unnecessarily reveal whether a username/email/account exists.

For login, use a generic user-facing failure such as:

```text
ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง
```

Internal security logs may record a more precise reason with appropriate access controls.

Response behavior should also avoid obvious enumeration channels in password-reset and account-recovery flows where practical.

---

# 159. Session Lifetime, Rotation, and Regeneration

Every authenticated session has server-enforced lifecycle controls:

```text
Idle timeout
+
Absolute lifetime
```

Exact values are configurable after usability/security testing rather than frozen arbitrarily in architecture.

The session identifier is regenerated after authentication and after security-sensitive privilege transitions where appropriate to prevent fixation.

The server, not the browser timer, is authoritative for session expiry.

The Admin UI may provide an expiry warning to reduce loss of unsaved work, but the warning does not extend an expired server session by itself.

---

# 160. Logout and Session Revocation

Logout must invalidate the server-side session and clear the client cookie.

The Identity & Access module supports security-relevant revocation actions such as:

- logout current session
- revoke all sessions for a CMS User
- disable account → invalidate active sessions
- password recovery/change after suspected compromise → revoke other sessions
- MFA reset/change → invalidate sessions as appropriate

A valid browser cookie must not remain sufficient after the authoritative server session has been revoked.

---

# 161. MFA Policy Is Risk-Based and Explicit

Version 1 supports MFA as a first-class Identity & Access capability.

Required baseline:

| CMS Role | Version 1 MFA Policy |
|---|---|
| Admin | **Required** |
| Publisher | **Required** |
| Editor | Supported and strongly encouraged; may be made mandatory by deployment policy |
| Viewer | Supported; may be made mandatory by deployment policy |

Why Publisher is included with Admin:

- Publisher can directly alter official public information.
- compromise has immediate public-impact potential even without system-administration rights.

This is an intentional selected higher-assurance control without falsely claiming that the whole application has been verified against every ASVS Level 2 requirement.

TOTP authenticator support is the practical Version 1 baseline. Phishing-resistant WebAuthn/passkeys remain a preferred future enhancement when operational readiness justifies them.

---

# 162. MFA Secrets and Recovery

MFA recovery must not create a weaker back door than MFA itself.

Recovery codes are:

- generated using a cryptographically secure random source
- shown to the user at controlled setup/recovery time
- single-use
- stored as non-reversible verification values rather than reusable plaintext where practical
- invalidated after use/regeneration

TOTP secrets, if stored, are treated as sensitive cryptographic material and protected appropriately at rest and in backups.

MFA disable/reset is a security-sensitive action and is audited.

---

# 163. Password Reset and Account Recovery

Version 1 does not require an external email provider merely to claim a complete-looking architecture.

If self-service password reset is enabled, reset tokens must be:

- cryptographically random
- single-purpose
- short-lived
- single-use
- stored/handled so disclosure of the database alone does not trivially reveal usable reset links where practical
- rate-limited
- invalidated after successful use

A successful compromise-recovery reset revokes other active sessions as appropriate.

Until reliable outbound email exists, controlled Admin-assisted or CLI-assisted recovery may be used operationally with auditability and identity verification procedures.

Security questions are not a Version 1 recovery mechanism.

---

# 164. Reauthentication for Sensitive Security Changes

Routine content work must remain usable; the CMS does not ask for a password/MFA code for every publish or edit action.

Step-up / reauthentication is reserved for genuinely security-sensitive operations such as:

- changing own password
- changing or resetting MFA
- resetting another user's MFA
- changing a user's Role or Module Scope
- disabling a privileged CMS User
- other credential/account-recovery operations

The exact factor required depends on the user's configured authentication methods and the risk of the action.

---

# 165. Backend Authorization Is Default-Deny

Authentication answers:

```text
Who is this CMS User?
```

Authorization separately answers:

```text
May this current CMS User perform this capability
in this Module and on this resource now?
```

Every protected Admin capability is enforced at a trusted backend Application/Domain boundary.

React may hide/disable controls for usability, but client-side checks are never authorization.

If no explicit permission/capability permits an action, the default is deny.

---

# 166. Function-, Resource-, and Field-Level Access

Authorization must cover more than route access.

Where the use case requires it, the backend verifies:

- function/capability permission
- Module Scope
- target resource/current lifecycle eligibility
- field exposure in Public/Admin DTOs

Stable IDs or knowledge of a URL never grant access by themselves.

This protects against object-level and field-level authorization failures while preserving the intentionally simple Frozen `06` model of one Role plus Module Scope rather than inventing row ownership or arbitrary per-user ACLs.

---

# 167. HTTPS, TLS, and Trusted Proxy Handling

Production Public/Admin/API traffic is HTTPS-only.

HTTP requests are redirected or rejected according to deployment configuration, and authentication cookies are never intentionally transported over plaintext HTTP.

Because Bangmod may place the application behind Nginx/DirectAdmin/proxy infrastructure, Fastify `trustProxy` and forwarded-header behavior must be configured only after the real proxy topology is verified.

The application must not blindly trust spoofable forwarded headers from arbitrary clients.

HSTS is enabled only after HTTPS/canonical-domain behavior is confirmed stable.

---

# 168. Security Headers and CSP

Version 1 uses reviewed security response headers, implemented through Fastify/hosting configuration as appropriate.

The baseline includes consideration of:

- `Content-Security-Policy`
- CSP `frame-ancestors` for clickjacking defense
- `X-Content-Type-Options`
- `Referrer-Policy`
- HSTS after HTTPS readiness
- restrictive caching for authenticated/sensitive Admin responses where appropriate

A CSP is constructed from actual application dependencies and external embeds.

The project does not copy a random restrictive CSP into production and then weaken it globally with broad `unsafe-*` exceptions merely to make the application work.

Security headers are verified in deployed responses, not assumed because a middleware package was installed.

---

# 169. Same-Origin and CORS Policy

The accepted same-origin deployment remains a security simplifier:

```text
Public Website
Admin CMS
API
→ same trusted origin where practical
```

CORS is therefore **not** opened broadly by default.

No baseline configuration uses wildcard origins together with credentialed Admin requests.

If a future external consumer requires cross-origin API access, that API receives a specific allowlisted CORS/security contract rather than weakening the entire Admin application.

---

# 170. Security Audit and Technical Security Logging

Security-sensitive events are recorded with enough context for investigation without recording secrets.

Examples:

- successful/failed authentication
- logout/session revocation
- password change/reset
- MFA enable/disable/reset
- account enable/disable
- Role/Module Scope change
- abnormal authentication throttling/security decisions where useful

Never log:

- plaintext passwords
- usable session identifiers
- CSRF secrets/tokens
- password-reset tokens
- MFA recovery codes
- reusable authentication secrets

Business Audit and technical security logs may overlap in event coverage but remain conceptually distinct: Audit supports accountable business/system actions, while technical security logs support detection/diagnosis and may have different retention/access requirements.

---

# 171. Secrets and Cryptographic Material

Secrets stay outside source code and normal logs.

This includes:

- session signing/encryption secrets where used
- database credentials
- password-reset cryptographic secrets
- TOTP/MFA protection keys where used
- external integration credentials

Secrets are provided through validated runtime configuration or a hosting-supported secure mechanism.

`.env.example` may document required variable names but never contains real production secrets.

Secret rotation/replacement must be possible without editing application source code.

---

# 172. Error Handling and Information Disclosure

Public/Admin HTTP errors use the accepted API error model and do not expose:

- stack traces
- SQL/database errors
- table/column names
- filesystem paths
- session/token internals
- cryptographic configuration
- server secrets

Detailed failure context belongs in access-controlled operational logging.

Security failures should fail closed when access/authorization/public eligibility cannot be established safely.

---

# 173. Dependency and Supply-Chain Security

Security best practice also applies to application dependencies, not only authentication code.

Version 1 requires a practical dependency-security workflow:

- lockfile committed to version control
- reproducible/controlled dependency installation
- dependency updates reviewed rather than blindly auto-deployed
- known high-impact vulnerabilities surfaced during CI/maintenance
- unused dependencies removed
- package scripts/native dependencies treated carefully
- framework/plugin versions kept within supported security-maintenance lines

This does not require an enterprise software-composition-analysis platform in Version 1; normal ecosystem tooling and disciplined review are sufficient until evidence requires more.

---

# 174. Security Verification Is Part of Delivery

The system does not treat `installed Helmet + Argon2 + CSRF plugin` as proof of security.

Before production release, security verification should map relevant implementation evidence to the accepted OWASP ASVS 5.0.0 profile and include, as applicable:

- authentication/session tests
- authorization tests, including direct API attempts
- CSRF verification
- XSS/output-encoding/CSP checks
- injection prevention/query parameterization
- security-header verification
- upload/file-security verification once Media architecture is defined
- rate-limit/abuse behavior
- secret/configuration review
- dependency vulnerability review
- error/information-disclosure review

Critical authorization and security invariants should have automated tests where practical.

A later Security Review/Release Checklist may reference ASVS requirement IDs with the exact ASVS version to keep verification traceable.

---

# 175. External Identity / SSO Is Not a Version 1 Dependency

Version 1 does not require:

- Keycloak
- Auth0
- a custom OAuth/OIDC identity server
- LDAP/Active Directory integration
- Google/Microsoft SSO

merely to claim modern security.

Identity & Access stays within the Modular Monolith for the current staff population and use case.

If the organization later has a real authoritative federation source, an OIDC/SSO adapter can be introduced without replacing Frozen Role/Module Scope authorization semantics.

Authentication source and application authorization remain separate concerns.

---

# 176. Security Values Are Configurable but Guardrailed

Operational values such as:

- login throttle thresholds
- session idle timeout
- session absolute lifetime
- reset-token lifetime
- password-hash work parameters

must be configurable where operational tuning is legitimate.

However, configurability must not create an easy path to disable core controls silently.

Security configuration is startup-validated and should reject clearly unsafe/missing production settings.

Exact production values are documented in deployment/security configuration after Expert Hosting behavior and staff workflow are tested.

---

# 177. Authentication and Security Anti-Patterns

Version 1 explicitly avoids:

- JWT access/refresh tokens for the normal same-origin Admin browser merely because JWT is popular
- storing session IDs/auth tokens in browser `localStorage`
- production in-memory sessions
- client-side authorization as a security boundary
- stale Role/Scope copied into a long-lived session as permanent authority
- permissive credentialed CORS
- SameSite cookie policy as the only CSRF defense
- weak/general-purpose password hashes or reversible password storage
- arbitrary password composition rules and routine forced password rotation
- permanent naive account lockout that can be abused for denial of service
- user-enumerating authentication/recovery messages
- sessions without idle/absolute expiry
- logout that clears only the browser cookie but leaves the server session valid
- recovery codes/reset tokens stored as reusable plaintext
- security questions
- MFA bypass through an easier recovery path
- role/permission changes enforced only after next login
- broad wildcard CSP exceptions adopted for convenience without review
- secrets committed to Git or printed to logs
- claiming OWASP/ASVS compliance without requirement-level verification
- importing an external Identity Platform before a real federation/operational need exists

---

# 178. Accepted Authentication, Session & Security Architecture

**Sections 148–177 = Accepted Authentication, Session & Security Architecture.**

Accepted baseline:

- OWASP ASVS 5.0.0 is the primary application-security verification baseline; the Cheat Sheet Series supplies implementation guidance and OWASP Top 10:2025 remains a risk-awareness checklist.
- Version 1 uses a documented risk-based ASVS profile: applicable Level 1 requirements form the minimum floor and selected Level 2 controls are adopted where justified; no blanket ASVS level/compliance claim is made without actual verification.
- Public Website remains anonymous; authentication applies to CMS Users/Admin APIs only, and Personnel remains separate from CMS identity.
- Admin browser authentication uses opaque cookie-based **server-side sessions**, not JWT access/refresh tokens as the Version 1 default.
- authoritative account/Role/Module Scope state is re-evaluated server-side for protected actions so privilege revocation is not frozen into a session.
- production cookies use Secure + HttpOnly + SameSite controls with narrow scope; authentication/session identifiers are never stored in `localStorage`.
- state-changing cookie-authenticated Admin operations require CSRF protection; same-origin/SameSite/origin controls are defense in depth rather than substitutes for one another.
- passwords are hashed with Argon2id using parameters that meet the accepted OWASP floor and are benchmarked on real hosting.
- password policy is passphrase-friendly: minimum 15 characters, support at least 64, no mandatory composition formula, no periodic forced rotation without cause, password-manager/paste friendly, and common/compromised password screening.
- login/recovery endpoints receive rate limiting/throttling and enumeration-resistant responses without naive permanent lockout.
- sessions have server-enforced idle + absolute expiry, session-ID regeneration, logout invalidation, and administrative/security revocation capabilities.
- **MFA is required for Admin and Publisher** because both can cause high-impact system/public changes; Editor/Viewer support MFA and deployment policy may strengthen this further.
- MFA/reset/recovery mechanisms use short-lived/single-use/protected secrets and cannot become a weaker bypass path; security questions are excluded.
- sensitive credential/Role/Scope/MFA changes may require reauthentication, while ordinary CMS editing/publishing is not burdened with repeated credential prompts.
- backend authorization is explicit/default-deny and covers capability, Module Scope, resource state, and field exposure where applicable; React controls remain UX only.
- production uses HTTPS, carefully configured proxy trust, security response headers, CSP based on real dependencies, and restrictive same-origin/CORS behavior.
- security-sensitive events are auditable/loggable without logging reusable secrets, and operational security logs remain distinct from business Audit where their purposes differ.
- secrets stay outside source code and normal logs; runtime security configuration is validated and guardrailed.
- dependency/supply-chain hygiene and ASVS-based security verification are part of delivery, not optional post-launch cleanup.
- external Identity/SSO infrastructure remains deferred until a real federation requirement exists.

This is the Version 1 security best-practice baseline: **OWASP-aligned, backend-authoritative, risk-proportionate, verifiable, and intentionally usable for staff.**

---

# 179. Next Discussion Topic

> **Media, File Storage & Upload Security Architecture**

The next decisions should define the authoritative design for images, PDFs, Documents, ITA Evidence, Health Reports, and other uploads, including:

- filesystem/storage boundary on Bangmod Expert Hosting
- storage keys and public URLs vs original filenames
- upload size and type allowlists
- MIME/content verification rather than extension trust
- image decoding/re-encoding and derivative strategy
- SVG policy
- PDF/document handling
- executable/scriptable content rejection or isolation
- storage outside executable web roots where practical
- filename/path traversal protection
- duplicate/hash strategy
- Media metadata and ownership/relationships
- private/internal vs public file delivery
- cache headers and content-disposition policy
- malware scanning practicality and fallback controls
- orphan cleanup and lifecycle
- backup/restore of media together with SQL metadata
- upload rate/resource abuse controls
- OWASP-aligned file-upload verification

The design should safely support the site's real media-heavy activity/news workflow without introducing object storage/CDN/enterprise media infrastructure before it is justified.

# 180. Media / File Handling Architecture Purpose

The Media, File Storage & Upload subsystem is a security-sensitive boundary, not merely an upload folder.

Its Version 1 goals are to:

- support the site's real image-heavy News/Activity workflow and PDF-heavy Document/ITA/Health Report workflow
- preserve canonical source assets while delivering efficient web representations
- prevent uploaded bytes from becoming public or executable merely because they exist on disk
- keep file security aligned with current Domain lifecycle/public eligibility
- follow OWASP ASVS File Handling and OWASP File Upload guidance without introducing premature enterprise media infrastructure

Core rule:

> **Store files safely, publish them deliberately, and optimize delivery automatically.**

---

# 181. Binary Storage vs Structured Metadata

Binary bytes and structured metadata remain separate responsibilities.

```text
SQL
├── Media / Document identity
├── original filename (display/audit metadata)
├── generated storage key
├── verified media type
├── file size
├── image dimensions when applicable
├── checksum
├── accessibility / descriptive metadata
├── relationships / ownership
└── timestamps / lifecycle references

Filesystem / Storage
└── actual binary bytes
```

Large images/PDFs are not stored as SQL BLOBs by default.

Filesystem paths are infrastructure details and never become canonical public identity.

---

# 182. Storage Outside the Public Webroot

Uploaded files are stored outside directly executable/public web roots wherever the hosting layout permits.

The application must not rely on a raw public directory such as:

```text
/public/uploads/<user-controlled-name>
```

as the security/publication boundary.

A file existing on disk does not make it public.

---

# 183. Controlled File Delivery Boundary

Public and Admin delivery is resolved through application-controlled Media/Document identity and current eligibility.

Conceptually:

```text
Browser
  ↓
/media/{stablePublicId}
  ↓
Application resolution
  ↓
Current Domain/public eligibility
  ├── allowed → safe file response
  └── denied  → Not Found / Forbidden as appropriate
```

The implementation may later optimize byte serving through the web server, but the authorization/public-eligibility decision remains application-owned.

---

# 184. Uploads Begin Private

New uploads begin in private temporary/staging storage.

```text
Upload
  ↓
Private staging
  ↓
Authorization + limits + format verification
  ↓
Security processing
  ↓
Finalize binary
  ↓
Create/update Media/Document relationship
```

An upload does not receive public eligibility merely because upload processing succeeded.

Draft/Hidden/Internal/unpublished parent resources remain non-public.

---

# 185. Purpose-Aware Upload Policies

Version 1 does not use one unrestricted generic upload policy.

The application understands why a file is being uploaded and applies a policy appropriate to that purpose, for example:

```text
EditorialImage
PublicDocument
HealthReportDocument
ITAEvidence
```

This purpose may be represented through one or several endpoints, but authorization, size limits, and accepted file types are purpose-aware.

---

# 186. Version 1 File-Type Allowlist

Baseline upload formats are deliberately small.

For ordinary public raster images:

- JPEG
- PNG
- WebP

For ordinary public documents:

- PDF

DOCX/XLSX/PPTX or other formats are enabled only when a specific accepted Domain use case requires them.

The architecture does not globally allow a file type merely because the platform can technically store it.

---

# 187. SVG and Archive Policy

User-uploaded SVG is not supported in Version 1.

Trusted SVG application assets may still be reviewed and deployed with source-controlled application assets.

Compressed archives such as ZIP/RAR/7z are also not supported in Version 1 without a future explicit use case and additional archive-specific validation/expansion controls.

This deliberately removes scriptable/archive processing attack surface that the current product does not need.

---

# 188. Multi-Signal File Verification

Client-provided extension or MIME type is never authoritative by itself.

Upload acceptance uses multiple checks as appropriate:

```text
allowed extension
+
declared MIME
+
detected file signature/content type
+
successful format/parser-level validation
```

Contradictory or unrecognized signals are rejected safely.

Renaming a file extension is never treated as format conversion.

---

# 189. Generated Storage Keys and Path Safety

The original filename is retained only as safe display/audit metadata where useful.

Physical storage names/keys are application-generated opaque values.

Users cannot choose:

- storage directories
- filesystem paths
- relative traversal segments
- executable/public-root destinations

All path construction remains internal to the storage adapter and normalized/validated before filesystem access.

---

# 190. Streaming and Resource Limits

Uploads are processed through bounded streaming rather than buffering arbitrary files completely in application memory.

Controls include, as applicable:

- request size limit
- per-file byte limit
- bounded multipart/file count
- temporary storage limits
- processing timeout/resource guardrails

Exact byte limits remain implementation tuning based on real staff files and verified hosting resources rather than arbitrary Blueprint constants.

---

# 191. Raster Image Decode and Processing Pipeline

Accepted raster images are decoded by a trusted image-processing library before derivatives are produced.

Conceptually:

```text
JPEG / PNG / WebP upload
        ↓
verify + decode
        ↓
normalize orientation
        ↓
validate dimensions / pixel count
        ↓
strip unnecessary public metadata
        ↓
resize for real UI presets
        ↓
encode optimized web derivatives
```

Failure to decode/verify cleanly causes rejection rather than storing a disguised binary as an image.

---

# 192. WebP Is the Default Public Image Delivery Format

Version 1 preserves an accepted canonical original while automatically generating optimized **WebP** derivatives for normal Public Website delivery.

Core rule:

> **Original is canonical; WebP is the default optimized web-delivery representation.**

A staff-uploaded multi-megabyte JPEG/PNG is therefore not served directly to ordinary cards/content pages by default.

CMS staff do not need to choose whether to convert to WebP; optimization is a system responsibility.

---

# 193. Responsive WebP Derivatives

Public pages use appropriately sized responsive WebP derivatives so browsers do not download a large source image when a smaller display size is sufficient.

The system may expose a deliberately small set of real UI presets, for example conceptually:

```text
thumbnail.webp
card.webp
content.webp
large.webp
```

Exact dimensions and encoder quality are selected through visual/performance testing during implementation.

The system does **not** reproduce WordPress-style generation of numerous unused image sizes.

---

# 194. Preserve Canonical Original, Rebuild Derivatives

The accepted original raster file is preserved as the canonical binary unless a future explicit retention policy states otherwise.

Generated WebP presentation variants are derived/reconstructible artifacts.

This allows future changes to:

- derivative dimensions
- WebP compression/quality
- responsive-image strategy
- image-processing library

without requiring an already-lossy derivative to become the new source of truth.

---

# 195. Image Metadata and Privacy

Public image derivatives remove unnecessary metadata such as device/location EXIF where it is not required for the public purpose.

Original-file metadata retention is governed by operational/privacy need and must not cause public exposure merely because the original contained it.

Metadata stripping is automatic; CMS staff are not asked to understand EXIF/security settings during routine publishing.

---

# 196. Image Dimension / Pixel Guardrails

Image validation limits both compressed byte size and decoded image complexity.

Controls include maximum width, height, and/or total pixel count so a deceptively small compressed file cannot force unbounded decode memory/CPU consumption.

Exact limits remain implementation/performance tuning.

---

# 197. PDF Handling Baseline

PDF is a first-class Version 1 document format for Documents, Health Reports, ITA Evidence, forms, and reports.

PDF upload handling includes:

- purpose authorization
- extension/type/signature validation
- file-size limits
- safe storage outside direct execution paths
- malware-scanning hook where available

The application does not parse, rewrite, or execute embedded PDF content by default merely to store/publish the document.

---

# 198. Malware Scanning Hook

The architecture supports a malware-scanning step for untrusted uploads when reliable hosting infrastructure is available.

A specific scanner such as ClamAV is **not** frozen in the Blueprint until real Bangmod Expert Hosting capabilities are verified.

The product must never claim that every upload is malware-scanned unless that control is actually enabled and operationally verified.

---

# 199. Content Disarm and Reconstruction

Content Disarm & Reconstruction (CDR) is a risk-based optional control rather than a Version 1 dependency.

The current uploader population is authenticated CMS staff; if future requirements introduce broad/public third-party uploads or higher-risk Office document formats, the threat model and CDR/scanning controls must be reviewed again.

---

# 200. Upload Authorization Does Not Replace File Validation

Only authenticated, active CMS Users with the required Module Scope/capability may upload or attach files for protected CMS use cases.

However:

> **Authenticated uploader does not mean trusted file.**

Every upload still passes technical file validation and resource controls.

---

# 201. Temporary File Lifecycle

Incomplete, rejected, abandoned, or failed uploads must not accumulate indefinitely.

Temporary storage has explicit cleanup/expiry behavior and cleanup operations are retry-safe.

Scheduled application maintenance may remove stale temporary files according to an implementation-defined safe age.

---

# 202. Storage and Database Coordination

Filesystem/object bytes and SQL cannot be treated as one distributed transaction.

Long file upload/processing is therefore not held inside a long SQL transaction.

Preferred flow:

```text
receive + verify temporary file
        ↓
finalize binary safely
        ↓
short SQL transaction
        ↓
create/update Media/Document relationship
        ↓
cleanup/reconciliation on partial failure
```

Operations are designed to be retry-safe and reconcilable.

---

# 203. Cryptographic Checksum Metadata

A cryptographic checksum such as SHA-256 is retained where practical for:

- integrity verification
- duplicate investigation
- backup/restore verification
- future legacy migration validation

Identical checksums may indicate duplicate bytes but do not automatically collapse distinct Domain resources.

---

# 204. Safe Download Headers and MIME Handling

File delivery uses verified server-known MIME types rather than blindly echoing client metadata.

Responses use safe/encoded display filenames where `Content-Disposition` is appropriate and apply anti-sniffing protections such as `X-Content-Type-Options: nosniff` through the accepted Security Headers baseline.

Raw original filenames are not interpolated unsafely into response headers.

---

# 205. Domain Lifecycle Controls File Visibility

Storage does not create a second independent public/private lifecycle.

Current owning Domain state and relationships remain authoritative.

Examples:

```text
Draft Document           → Admin only
Published Document       → Public when policy allows
Hidden Document          → no public delivery
Unpublished ITA Evidence → no public delivery
```

A previously known URL cannot bypass the current canonical eligibility decision.

---

# 206. Stable Opaque Public Media Identity

Public media/download URLs are based on stable opaque identifiers or canonical resource URLs rather than user filenames or physical directories.

Conceptually:

```text
/media/{publicId}
```

This keeps rename/storage-layout changes independent from public identity and reduces filename/path information leakage.

---

# 207. Reference-Safe Deletion

Hard deletion of permanent Media/Documents is never a blind filesystem delete from the UI.

Deletion requires:

- authorization
- reference/relationship checks
- Domain lifecycle eligibility
- appropriate Audit
- controlled physical cleanup

Canonical resources that are still referenced by News, ITA, Service, Health Report, Homepage, or other content cannot be silently removed underneath those relationships.

---

# 208. Orphan Handling

A zero-reference permanent Media record is not automatically assumed to be garbage.

The system distinguishes at least conceptually between:

- expired/abandoned temporary uploads
- valid permanent Media currently having zero references

Automatic cleanup targets safe temporary/orphan states; ambiguous permanent assets require a deliberate lifecycle/review rule.

---

# 209. Backup and Restore Unit

A restorable CMS requires both structured metadata and original binaries.

```text
Database
+
Original Media / Document files
+
required recovery configuration/process
```

A SQL backup without its original files is not considered a complete site backup.

Restore verification is required later in Deployment/Operations architecture rather than assuming backup existence equals recoverability.

---

# 210. Derivative Backup Policy

Because WebP presentation derivatives are reconstructible from canonical originals, they do not automatically require the same backup priority as originals.

The final operations policy may choose to back them up for faster recovery, but correctness depends on preserving original binaries and their metadata/relationships.

---

# 211. Storage Capacity and Abuse Controls

Version 1 includes practical safeguards such as:

- per-file limits
- total request limits
- bounded processing
- storage-capacity monitoring / safe failure behavior

A complex per-user quota platform is not required without a real business need.

---

# 212. File Security / Audit Events

Security-relevant file events are logged/audited at the appropriate layer, for example:

- upload accepted
- upload rejected for type/size/verification reason
- malware detection when scanning exists
- document file replaced
- permanent media deleted

Logs do not contain binary file bodies, reusable secrets, or sensitive internal filesystem paths in client-visible errors.

---

# 213. OWASP File-Handling Verification Baseline

Version 1 file handling is verified against the applicable requirements of **OWASP ASVS 5.0.0 File Handling** under the accepted risk-based ASVS profile.

The **OWASP File Upload Cheat Sheet** is implementation guidance for extension/type allowlists, generated filenames, storage isolation, upload authorization, size/resource limits, content verification, malware/CDR controls where applicable, and safe file serving.

Security middleware or a file-extension check alone is never treated as proof that the upload subsystem meets this baseline.

---

# 214. Explicit Version 1 Exclusions

Version 1 does not require the following without proven need:

- S3 / MinIO / dedicated object-storage platform
- CDN dependency
- separate Media microservice
- distributed storage cluster
- antivirus scanning cluster
- mandatory CDR platform
- arbitrary Office-document preview service
- SVG sanitizer for CMS uploads
- ZIP/archive extraction
- video transcoding
- public anonymous file upload
- automatic OCR
- enterprise Digital Asset Management platform

The initial filesystem/storage adapter remains replaceable if later evidence justifies object storage/CDN infrastructure.

---

# 215. Accepted Media, File Storage & Upload Security Architecture

**Sections 180–214 = Accepted Media, File Storage & Upload Security Architecture.**

Accepted baseline:

- binaries live outside directly public/executable web roots where practical; SQL owns structured identity/metadata/relationships while storage owns bytes
- file existence never implies public eligibility; file delivery is mediated by current Domain/public state
- every upload starts private and passes purpose-aware authorization, size/resource limits, extension allowlists, MIME/signature/content verification, and parser/format validation as appropriate
- storage keys/paths are application-generated; user filenames/MIME/path input are never authoritative
- Version 1 raster upload allowlist is JPEG/PNG/WebP and public-document baseline is PDF; user-uploaded SVG and archives are excluded absent a proven use case
- upload processing is streaming/bounded and image processing additionally limits decoded dimensions/pixel count
- accepted raster originals remain canonical while normal Public Website image delivery uses automatically generated optimized **WebP** derivatives
- responsive WebP presets are intentionally limited to real UI needs; staff do not configure compression/resize/metadata stripping during routine publishing
- public derivatives remove unnecessary metadata; canonical originals allow future derivative regeneration
- PDF handling remains storage/publication focused and does not introduce unnecessary active parsing/rewrite pipelines
- malware scanning is a supported hook enabled only when reliable infrastructure exists; CDR remains risk-based and no false scanning/compliance claim is allowed
- temporary-file lifecycle, storage/DB reconciliation, checksums, safe MIME/download headers, reference-safe deletion, orphan handling, and capacity safeguards are explicit concerns
- database metadata + canonical original binaries form the recoverable backup unit; derivatives may be regenerated
- applicable OWASP ASVS 5 File Handling controls and OWASP File Upload guidance are the security baseline
- S3/CDN/media services/DAM/video/OCR/archive/SVG-processing complexity remains deferred until justified

This baseline intentionally makes **WebP optimization a Version 1 delivery requirement, not a later optional performance enhancement**, while keeping the original asset authoritative and staff workflow simple.

---

# 216. Next Discussion Topic

> **Public Rendering, Routing, SEO & Caching Architecture**

The next decisions should define how the React + Vite Public Website renders and serves the Frozen Sitemap without turning the public site into a mandatory pure CSR SPA, including:

- SSR vs pre-render vs client rendering by route/use case
- server/public route composition with the Node Modular Monolith
- canonical URL and slug behavior
- title/meta/description/Open Graph/social metadata
- structured data where genuinely useful
- `sitemap.xml` and robots/noindex behavior
- Frozen `404 / 410 / redirect / Historical Public` semantics
- cache-control for HTML/API/media and safe invalidation
- responsive WebP delivery/cache behavior
- public Search route indexing/noindex rules from Frozen `08`
- performance/Core Web Vitals principles without premature CDN infrastructure

The goal is to make the public site **discoverable, fast, mobile-friendly, and cacheable while keeping canonical lifecycle/visibility rules authoritative.**

---

# 217. Public Rendering Objective

The Public Website is a server-rendered, progressively enhanced presentation surface over the canonical Application/Domain Core.

Primary public content must arrive as meaningful HTML on the initial response. Client-side React enhances navigation and interaction, but ordinary JavaScript execution is not required merely to discover or understand canonical public content.

> **Public canonical content should arrive as meaningful HTML from the server. Client-side React enhances the experience; it should not be required merely to discover or understand the primary public content.**

This supports the Frozen Citizen First, Mobile First, Accessibility, Search, and canonical-public-destination requirements without turning the Public Website into a mandatory pure CSR SPA.

---

# 218. Public Web Framework Baseline

Version 1 Public Web uses:

```text
React
+
React Router Framework Mode
+
Vite
```

React Router Framework Mode is the routing/rendering framework for the Public application while Fastify remains the primary application/HTTP runtime and accepted backend boundary.

This decision does not move Domain/Application logic into route components and does not replace the accepted Fastify API/security/application architecture.

The Admin CMS remains a separate CSR-oriented React + Vite application.

---

# 219. SSR-Oriented Hybrid Rendering

Public rendering is **SSR-oriented hybrid rendering**, not a mandate that every route use one rendering mode.

Baseline:

- CMS-driven canonical pages use SSR by default.
- truly deployment-static pages may be pre-rendered when doing so does not couple content publication to application deployment.
- client rendering is used for interaction/enhancement after the initial public response.
- Admin CMS remains CSR-oriented.

The architecture deliberately avoids requiring a frontend rebuild/deploy whenever an authorized CMS user publishes ordinary content.

---

# 220. Rendering Strategy by Surface

Default Version 1 rendering strategy:

| Public Surface | Default Rendering |
|---|---|
| Homepage | SSR |
| News / Activity / Announcement | SSR |
| Health Content / Health Report | SSR |
| Citizen Service | SSR |
| Health Service | SSR |
| Documents / ITA | SSR |
| About / Personnel / Organization / Contact | SSR |
| Public Search initial results | SSR + client enhancement |
| Truly deployment-static system content | Pre-render may be used |
| Admin CMS | CSR |

These are architectural defaults, not a requirement to force SSR where a page is genuinely static and safe to pre-render.

---

# 221. Pre-rendering Boundary

Pre-rendering is an optimization for content whose lifecycle is tied to application deployment or otherwise genuinely static.

It is not the default publication mechanism for CMS-managed content.

The following anti-pattern is rejected:

```text
Staff publishes News
→ frontend rebuild required
→ deployment required
→ News becomes visible
```

Normal CMS publication remains independent from frontend deployment.

---

# 222. React Server Components Are Not a Version 1 Requirement

Version 1 does not require React Server Components, Server Functions, islands architecture, partial-hydration platforms, or another server-component runtime.

Normal SSR + hydration + client navigation satisfies the accepted requirements with less runtime/framework complexity.

These technologies may be reconsidered only if a demonstrated performance or product need justifies the change.

---

# 223. SSR Reuses the Application Core Directly

Server-rendered Public route loaders/controllers call the same in-process Application capabilities used by the rest of the Modular Monolith.

Do not implement:

```text
Public SSR
→ localhost HTTP
→ Public API
→ Application
→ Database
```

when the renderer already runs inside the same trusted application process.

Preferred path:

```text
Public Route Loader
→ Public Application Query
→ Domain/Repository
```

Browser/external HTTP consumers use the Public API boundary separately.

---

# 224. Frozen Sitemap Is the Route Authority

`03-sitemap.md` remains authoritative for Public information architecture and public destinations.

Implementation routing follows the Frozen Sitemap; routing-library convenience does not create a parallel IA.

```text
Frozen Sitemap
→ Route Definitions
→ Canonical URL Generator
```

A developer route change that alters public IA requires the appropriate Product/Sitemap review rather than silently redefining the website through code.

---

# 225. Central Canonical URL Generation

Canonical public URLs are generated through one centralized route/URL policy rather than string concatenation scattered across Web, Search, Sitemap, Homepage, and API code.

Conceptually:

```text
PublicRoutes.news(resource)
PublicRoutes.activity(resource)
PublicRoutes.service(resource)
PublicRoutes.document(resource)
PublicRoutes.healthService(resource)
PublicRoutes.itaRequirement(resource)
```

The same canonical URL policy is reused by:

- public links
- Search destinations
- sitemap generation
- canonical metadata
- Open Graph URLs
- redirects

---

# 226. Slug and Public Identity Remain Separate

Stable Public Identity remains authoritative; mutable Title and Slug are not identity.

Changing a published Title does not automatically change a canonical public URL merely because a slug generator could produce a new value.

Canonical URL changes follow the Frozen URL/lifecycle rules and must preserve meaningful redirect/history semantics when a deliberate canonical move occurs.

---

# 227. Server-side HTTP Status Semantics

Public rendering returns truthful HTTP semantics rather than rendering an error component with `200 OK`.

Baseline:

```text
Existing eligible Public Resource
→ 200

Unavailable / Not Found
→ 404

Permanently Withdrawn with Gone semantics
→ 410

Permanent canonical move/successor
→ 301 (or equivalent accepted permanent redirect semantics)

Temporary redirect
→ 302/307 as appropriate
```

Frozen `03` and `07` lifecycle semantics determine which outcome is correct.

Soft-404 behavior is explicitly rejected.

---

# 228. Redirects Are Server-side

Canonical redirect decisions are executed as server-side HTTP redirects before ordinary React rendering.

Client-side `window.location` navigation is not the normal mechanism for permanent or temporary canonical moves.

Permanent redirects must target a meaningful successor/canonical destination; unrelated missing content is never redirected to Homepage merely to avoid a `404`.

---

# 229. Server-rendered SEO Metadata

Canonical public pages generate their primary metadata on the server from canonical resource data.

Baseline metadata includes where applicable:

- document `<title>`
- meta description
- canonical URL
- robots directive
- Open Graph title/description/image/url
- social-preview metadata
- meaningful publication/update dates where relevant

Client-side metadata changes may enhance navigation but are not the authoritative initial SEO mechanism.

---

# 230. Self-canonical for Indexable Canonical Pages

Every indexable canonical public page emits a self-referential canonical URL consistent with the route used in internal links and sitemap projection.

Canonical signals must not disagree across:

```text
HTML canonical
Internal links
Search destination
sitemap.xml
Structured metadata
```

Duplicate/alternate routes do not create competing canonical identities.

---

# 231. Robots, Noindex and Security Are Separate Concerns

`robots.txt`, `noindex`, authentication, and authorization serve different purposes.

- `robots.txt` provides crawler guidance.
- `noindex` provides indexing guidance for reachable pages.
- authentication/authorization provide access control.

No security decision depends on robots directives.

Draft, Hidden, Internal, withdrawn, Admin, or otherwise non-public resources remain protected by canonical eligibility/authentication rules even if a crawler ignores robots guidance.

---

# 232. Public Search Route Indexing Policy

Frozen `08` remains authoritative:

```text
/search?q=...
→ shareable/useful Public Search surface
→ noindex
→ excluded from sitemap.xml
```

Search-result pages are discovery interfaces, not canonical content destinations.

The route should not be blocked in a way that prevents the intended `noindex` directive from being observed by compliant crawlers.

Search query URLs never become canonical substitutes for News, Service, Document, Health Content, ITA, or other canonical resource pages.

---

# 233. sitemap.xml Is a Derived Public Projection

`sitemap.xml` is generated from current canonical public eligibility rather than manually maintained URL records.

It includes legitimate indexable canonical URLs and excludes at minimum:

- Draft
- Pending/Approved-but-unpublished
- Scheduled-before-publication
- Hidden
- Internal
- Preview URLs
- Admin URLs
- Search-result URLs

Legitimate Historical Public resources may remain in the sitemap when their Domain semantics support continued public discovery.

No generic per-record `show_in_sitemap` checkbox is introduced as a Version 1 baseline.

---

# 234. Structured Data Is Semantic, Not Decorative SEO

JSON-LD/structured data is used only where the public resource truthfully matches an established semantic type.

Potential examples include:

- Organization
- BreadcrumbList
- Article / NewsArticle where appropriate

The system does not apply numerous schemas to every page merely to increase SEO markup volume.

Structured data must reflect visible/canonical page meaning and is validated during implementation/release testing where applicable.

---

# 235. Cache by Mutability

Caching policy follows data mutability and security rather than one global TTL.

Baseline classes:

```text
Hashed Vite assets
→ long-lived immutable

Versioned responsive WebP derivatives
→ long-lived immutable

Public SSR HTML
→ conservative/revalidated caching

Public Search result pages/API
→ private/no-store baseline

Authenticated Admin/Auth/Preview responses
→ no-store
```

> **Caching may improve performance, but it must never weaken current public-eligibility, privacy, or lifecycle rules.**

---

# 236. Hashed Application Assets

Production JavaScript/CSS/static assets produced with content-hashed filenames may receive long-lived immutable cache directives because a content change creates a new asset URL.

Exact cache duration is a deployment tuning parameter rather than a Product architecture constant.

The HTML shell/reference layer must remain capable of pointing clients to the current hashed assets after deployment.

---

# 237. WebP Derivative Cache Identity

Responsive WebP derivatives created by the accepted Media architecture use versioned/content-stable URLs so that an immutable URL always represents the same bytes.

Conceptually:

```text
/media/{publicId}/{revision}/card.webp
```

or an equivalent opaque representation key.

When the canonical original or processing revision changes in a way that changes bytes, the derivative URL changes rather than relying on broad cache purges.

This permits aggressive caching of safe immutable WebP delivery without weakening current resource eligibility.

---

# 238. Public HTML Starts with Conservative Caching

Version 1 does not require a full-page application cache, Redis page cache, CDN HTML cache, or long-lived SSR HTML cache.

Public HTML initially prioritizes current canonical state:

```text
Public Request
→ current eligibility
→ current canonical data
→ SSR HTML
```

Conditional/revalidation mechanisms such as ETag or Last-Modified may be introduced where they preserve lifecycle correctness.

A cache may never cause a resource that has become Hidden/Internal/Withdrawn to remain publicly retrievable simply because an old HTML response has not expired.

---

# 239. Search and Authenticated Response Caching

Public Search query/results are treated conservatively because query text may itself be sensitive and because Search state is dynamic.

Baseline:

```text
Public Search result response
→ private / no-store

Admin/Auth/Preview/Draft response
→ no-store
```

Internal Search projection/query optimization remains independent from browser/shared HTTP caching policy.

---

# 240. Hydration and Client Navigation

SSR does not require full page reloads for every internal navigation.

Normal flow:

```text
Initial request
→ SSR HTML
→ hydration
→ React Router client navigation/enhancement
```

The browser can receive incremental route data after hydration while the first canonical response remains meaningful and crawlable HTML.

---

# 241. Primary Content Survives JavaScript Failure

The primary meaning of canonical public pages should remain readable from the SSR HTML when client JavaScript is slow, blocked, or temporarily fails.

This particularly applies to:

- article/news/activity text
- service instructions
- contact information
- health information
- document/report metadata
- ITA requirement/evidence context

Interactive enhancements may degrade, but ordinary content comprehension should not disappear.

---

# 242. Performance Strategy

Version 1 performance is achieved through several simple layers rather than relying on one infrastructure feature:

```text
Meaningful SSR HTML
+
route/code splitting
+
responsive WebP
+
hashed immutable assets
+
appropriate HTTP caching
+
minimal necessary client JavaScript
+
efficient Application/SQL queries and indexes
```

CDN, Redis page cache, edge rendering, ISR platforms, service-worker/PWA caches, and similar infrastructure are not introduced merely to obtain acceptable baseline performance.

---

# 243. Internal Public Search and External Search Engines Remain Separate

Frozen Public Search `/search` and external search-engine crawling/indexing are independent concerns.

```text
Internal Public Search
→ Frozen 08 ranking / eligibility / discovery behavior

External Search Engines
→ canonical public HTML / metadata / sitemap / HTTP semantics
```

SEO requirements do not redefine Search Units, ranking, Domain lifecycle, or canonical public eligibility.

---

# 244. Lifecycle Semantics Outrank SEO and Cache Optimization

SEO preservation and cache efficiency never override Frozen Domain/public semantics.

Examples:

- Published → eligible according to Domain rules.
- Superseded/Expired Historical Public → may remain indexable with explicit historical context.
- Hidden/Internal → public delivery denied.
- Permanent Withdrawal → Gone semantics where applicable.
- meaningful successor → redirect according to Frozen URL rules.

The system never keeps content publicly reachable merely to preserve ranking, backlinks, or cache hit rate.

---

# 245. Explicit Version 1 Rendering/SEO/Caching Exclusions

Version 1 does not require the following without measured/proven need:

- Next.js as an additional Public runtime alongside Fastify
- React Server Components architecture
- edge rendering
- CDN dependency for HTML
- Incremental Static Regeneration platform
- Redis/full-page application cache
- Nginx full-page microcache
- service worker / PWA offline cache
- AMP
- crawler-specific dynamic rendering
- generic SEO plugin framework
- publication-triggered frontend rebuilds for ordinary CMS content

These remain available future options only if the accepted architecture can no longer meet measured needs simply enough.

---

# 246. Accepted Public Rendering, Routing, SEO & Caching Architecture

**Sections 217–245 = Accepted Public Rendering, Routing, SEO & Caching Architecture.**

Accepted baseline:

- Public Web uses **React Router Framework Mode + React + Vite** while Fastify remains the primary backend/application HTTP runtime.
- the Public Website is SSR-oriented and hybrid; CMS-driven canonical pages SSR by default, pre-rendering is limited to genuinely deployment-static content, and Admin remains CSR-oriented.
- normal CMS publication does not require rebuilding/redeploying the Public frontend.
- SSR route loaders reuse in-process Application capabilities rather than calling the same application through localhost HTTP.
- Frozen Sitemap remains route authority and canonical URL generation is centralized.
- stable Public Identity remains separate from mutable Title/Slug.
- `200/404/410/redirect` semantics are returned truthfully server-side and unrelated missing resources are not redirected to generic destinations.
- canonical metadata, self-canonical URLs, Open Graph/social metadata, sitemap projection, robots/noindex rules, and structured data derive from canonical public state.
- `/search` remains `noindex` and outside sitemap; robots directives never replace access control.
- caching follows mutability: hashed application assets and versioned WebP derivatives may be long-lived immutable, while SSR HTML starts conservative/revalidated and Search/Admin/Auth sensitive responses are not shared-cacheable.
- cache correctness never outranks current visibility/lifecycle; Hidden/Internal/Withdrawn content cannot remain public because of stale cache.
- primary public content remains meaningful in SSR HTML before client JavaScript enhancement.
- performance starts with SSR, responsive WebP, code splitting, minimal client JS, appropriate HTTP caching, and efficient SQL rather than premature CDN/Redis/edge infrastructure.
- external SEO and Frozen internal Public Search remain separate concerns.
- Next.js/RSC/edge/ISR/full-page cache/PWA/AMP/dynamic-rendering complexity is not a Version 1 requirement.

This decision confirms the previously discussed technology direction: **Fastify + React Router Framework Mode + Vite** is chosen for architectural fit with the backend-centric Modular Monolith, not because Next.js is incapable of SSR/SEO.

---

# 247. Next Discussion Topic

> **Background Jobs, Scheduling & Reliability Architecture**

The next decisions should define how the accepted Cron/application-task baseline reliably handles non-request work without introducing a distributed queue platform prematurely, including:

- Scheduled Publish execution and overdue catch-up
- idempotency and duplicate execution protection
- concurrency/claiming rules for scheduled work
- post-commit Search synchronization/reconciliation
- Media temporary/orphan cleanup
- retry policy and dead-letter/failed-work visibility without building an enterprise queue
- job execution/audit vs technical operational logs
- timeout/resource limits
- deployment/restart behavior while jobs are due
- failure recovery and safe manual rerun
- when evidence would justify Redis/BullMQ or a dedicated worker process later

The goal is to make background work **predictable, retry-safe, observable, and operationally simple on Bangmod Expert Hosting** while preserving the Frozen Publishing/Search/Media semantics.

# 248. Background Jobs, Scheduling & Reliability Architecture

Version 1 treats hosting Cron/Scheduler as a **wake-up mechanism**, not as a second business-logic system.

Canonical SQL state determines what work is due, while Application/Domain capabilities remain authoritative for every business transition.

```text
Hosting Scheduler / Cron
        ↓
Application Command
        ↓
Discover Canonical Due Work
        ↓
Application Capability
        ↓
Domain + SQL Transaction
        ↓
Canonical Mutation + Audit
        ↓
Post-commit Derived Work
```

---

# 249. Cron Is a Wake-up Mechanism, Not Business State

Cron configuration must not become the Source of Truth for individual publication schedules or lifecycle state.

Version 1 uses a small recurring scheduler trigger, while content records keep their own canonical schedule metadata.

The system therefore avoids creating one Cron entry per News, Announcement, Document, or other scheduled resource.

---

# 250. Canonical Schedule State Lives with the Resource

Scheduled content keeps canonical fields such as publication lifecycle state and `scheduled_at` in SQL.

The scheduler asks the database which resources are due rather than duplicating that state in a second generic job record.

A generic `jobs` table is not required merely because scheduled publication exists.

---

# 251. Due Discovery Uses Catch-up Semantics

Due work is discovered using the semantic equivalent of:

```text
Scheduled
AND scheduled_at <= now
```

rather than requiring an exact minute match.

This guarantees that a missed scheduler tick, restart, deployment, or temporary outage does not permanently lose a scheduled publication.

---

# 252. Scheduled Publication Is Not an Exact-second SLA

Version 1 guarantees that due work is processed by the first successful scheduler execution after the requested time.

The product contract does not promise exact-to-the-second publication timing on shared/Expert Hosting.

Exact scheduler cadence is deployment configuration and may be tuned without changing Domain semantics.

---

# 253. Background Commands Reuse the Application Core

Background commands invoke the same Application/Domain capabilities used by interactive workflows.

They must not bypass validation, lifecycle rules, transaction rules, Audit, Search/public eligibility, or Module ownership through direct SQL scripts.

Root-level helper scripts are not a second implementation path for production business behavior.

---

# 254. Idempotency Is a Core Reliability Requirement

Repeated or overlapping execution must not create duplicate logical publication or duplicate canonical mutation.

A scheduled publication capability therefore re-checks current canonical state before mutation and safely returns if the intended transition is already complete or no longer applicable.

Idempotency belongs in the Application/Domain behavior and is not delegated to Cron, Redis, or a future queue product.

---

# 255. SQL-backed Scheduler Lease

Version 1 may use a deliberately small SQL-backed lease to prevent ordinary overlapping scheduler runs.

Conceptually, the lease records an owner token and expiration time so a crashed process cannot hold the scheduler indefinitely.

Lease acquisition failure means another scheduler instance is active and the new invocation exits safely.

---

# 256. Lease Does Not Replace Idempotency

Scheduler lease, current-state validation, transactions, and idempotent Application behavior are complementary safeguards.

Correctness must not depend on the assumption that a lock can never expire, overlap, or be misconfigured.

---

# 257. Targeted Row Locking for Critical Scheduled Transitions

Critical transitions may use targeted row locking inside short SQL transactions where concurrency must be serialized.

Examples include a Scheduler publishing while a Publisher cancels/reschedules the same record, or two overlapping executions reaching the same due resource.

Engine-specific multi-worker claiming techniques such as `SKIP LOCKED` are deferred until the exact database engine and real workload justify them.

---

# 258. Bounded Batch Processing

Due work is processed in deterministic, bounded batches rather than allowing one scheduler invocation to run without resource or time limits.

Oldest due work should generally be processed first using stable ordering.

Exact batch size and execution budget are operational tuning values, not Domain constants.

---

# 259. Failed Scheduled Publication Remains Scheduled

Infrastructure failure during scheduled publication does not create a new generic `Failed` content lifecycle state.

If the canonical transition does not commit, the resource remains Scheduled and therefore becomes overdue/retryable.

This preserves the Frozen Publishing Workflow model.

---

# 260. Overdue Is an Operational Condition

`Overdue` is derived from Scheduled state plus a due time that has already passed.

It is not persisted as a competing Domain lifecycle status.

This keeps operational health separate from canonical content meaning.

---

# 261. Persistent Failure Must Be Visible

Repeated failure must not remain silent.

Version 1 exposes a small actionable system-health view such as scheduler freshness, count of overdue scheduled items, and the oldest overdue age.

It does not require a full queue/job-management dashboard.

---

# 262. Scheduler Heartbeat

Operational state should retain a small scheduler heartbeat such as last started, completed, and successful run timestamps plus a sanitized failure summary where useful.

This helps distinguish "Cron did not run" from "Cron ran but one operation failed" without introducing a monitoring platform into the Domain model.

---

# 263. Scheduled Publication Audit Truthfulness

Audit must distinguish the human who created or changed a schedule from the system process that later executed it.

Conceptually:

```text
Schedule created
→ Human actor

Scheduled publication executed
→ System actor
→ linked to scheduling context / human initiator
```

The system must not falsely report that the original Publisher manually clicked Publish at the later execution time.

---

# 264. Accountable Audit Joins the Canonical Transaction

Successful scheduled publication and its required accountable Audit event commit together where practical.

The system must avoid a state where a high-impact canonical mutation succeeds but its required Audit event is merely best-effort background work.

---

# 265. Technical Retries Are Operational Logs, Not Publishing History

Infrastructure retries, transient database errors, and repeated scheduler attempts belong in operational logging/health.

They should not flood Publishing Audit with meaningless retry entries.

Business/accountability Audit records meaningful schedule, cancel, reschedule, and successful publication actions.

---

# 266. Search Synchronization Remains Post-commit

Search projection refresh remains derived work after canonical commit.

A Search synchronization failure never rolls back a valid publication.

Frozen Search reconciliation and current canonical public-eligibility checks remain the recovery/safety mechanisms.

---

# 267. Search Reconciliation Is a Periodic Repair Job

Search reconciliation periodically compares canonical public state with the derived Search projection and repairs missing, stale, or no-longer-eligible projection entries.

Normal incremental synchronization remains the primary path; reconciliation is a safety net rather than a full rebuild on every scheduler tick.

---

# 268. Media Temporary Cleanup Uses Explicit Lifecycle Rules

Scheduled maintenance may remove temporary upload/staging artifacts after a defined grace period.

Permanent Media is never automatically deleted merely because its current reference count is zero.

Permanent zero-reference Media requires explicit lifecycle/review policy rather than blind cleanup.

---

# 269. Version 1 Job Families Stay Small

Version 1 background work is intentionally limited to a small number of proven job families such as:

- Scheduled Publication
- Search reconciliation/recovery
- temporary Media cleanup
- small operational maintenance/health tasks

A generic job platform is not introduced simply to unify these under one abstraction.

---

# 270. Operational Commands Are Non-interactive

Scheduler and maintenance commands must be suitable for unattended hosting execution.

They use validated runtime configuration, structured logs, meaningful exit codes, bounded execution, and no interactive confirmation prompts.

---

# 271. Retry Only Transient Failures

Retry behavior distinguishes transient infrastructure failures from permanent Domain/configuration/invariant failures.

Transient work may be retried safely; permanent failures become visible operational issues rather than tight-loop retries.

Version 1 does not require a generic retry framework because Cron cadence already provides natural retry opportunities for recoverable work.

---

# 272. No Transactional Outbox Baseline Yet

Version 1 does not require a transactional Outbox merely because some work occurs after commit.

Current asynchronous concerns are either represented canonically in SQL or reconstructible/reconcilable:

- Scheduled publication remains represented by canonical schedule state.
- Search is reconstructible.
- temporary Media cleanup is repeatable.

An Outbox becomes justified only when future non-reconstructible external side effects must be delivered reliably from a canonical mutation.

---

# 273. Evidence Threshold for Redis / BullMQ

Redis and BullMQ are deferred until measured requirements justify independent workers or richer queue behavior, such as:

- high background-job volume or concurrency
- long-running processing
- independent worker scaling
- large image/video transformation workloads
- external API/email/notification workloads
- richer per-job retry/backoff or delayed work
- rate-limited external integrations

Scheduled Publish alone is not sufficient justification.

---

# 274. Future Queue Workers Must Reuse Application Capabilities

If Redis/BullMQ or another queue is introduced later, queue workers remain adapters that invoke the same idempotent Application capabilities.

Queue technology never becomes the owner of Domain semantics, lifecycle rules, authorization policy, or canonical state.

---

# 275. Scheduler Silent Failure Must Be Detectable

Version 1 does not require a highly available scheduler cluster, but a stopped scheduler must be operationally detectable through heartbeat, overdue detection, logging, and system-health status.

Reliability means visible and recoverable failure, not premature distributed infrastructure.

---

# 276. Downtime Recovery Is Automatic

After application or hosting downtime, the next successful scheduler run discovers all canonical records whose schedules are already due and processes them in stable order.

Human operators do not recreate lost jobs because individual schedules were never stored only in Cron or volatile memory.

---

# 277. Scheduling Time Uses Absolute UTC

Staff enter and view schedule times in the business timezone `Asia/Bangkok`.

The Application converts them to absolute UTC timestamps for persistence and comparison.

Scheduler correctness therefore does not depend on Linux, Cron, PHP, or hosting-local timezone defaults.

---

# 278. Application Clock Is Injectable

Time-sensitive Application/Domain behavior uses an injectable Clock abstraction rather than scattering direct current-time calls throughout business logic.

This makes due/not-due, expiry, catch-up, and concurrency behavior deterministic and testable.

---

# 279. Background Reliability Testing Focus

Tests should prove failure and concurrency semantics, including at minimum:

- normal scheduled execution
- repeated execution
- overlapping scheduler invocation
- missed schedule/downtime catch-up
- cancellation/reschedule before due time
- resource already transitioned
- canonical transaction failure
- Search post-commit failure and reconciliation

The project tests its own reliability semantics rather than attempting to test the hosting Cron implementation itself.

---

# 280. Background Work Security and Authorization Context

System-executed scheduled work does not bypass Domain invariants merely because no human request is currently active.

The scheduler executes only work that was previously committed through an authorized workflow and re-validates the current canonical state required for execution.

Administrative maintenance commands remain protected operational capabilities and are never exposed as anonymous public endpoints.

---

# 281. Explicit Version 1 Background Infrastructure Exclusions

Version 1 does not require the following without measured/proven need:

- Redis as a background-job dependency
- BullMQ
- RabbitMQ or Kafka
- dedicated worker fleet
- generic Job table/platform
- per-content Cron entries
- distributed lock service
- transactional Outbox
- dead-letter queue dashboard
- generic retry framework
- exact-second scheduling SLA
- highly available scheduler cluster

These remain future options that can be added without redefining Domain behavior when evidence justifies them.

---

# 282. Reliability Principle

The Version 1 reliability strategy is:

> **Canonical state is durable, execution is repeatable, transitions are idempotent, failures are visible, and recoverable work can be rediscovered.**

The architecture prefers reconstructible state and deterministic recovery over premature queue infrastructure.

---

# 283. Accepted Background Jobs, Scheduling & Reliability Architecture

**Sections 248–282 = Accepted Background Jobs, Scheduling & Reliability Architecture.**

Accepted baseline:

- Hosting Cron/Scheduler is a recurring wake-up mechanism; canonical SQL state determines what work is due.
- individual publication schedules remain on canonical resources rather than being duplicated into generic Job records or per-content Cron entries.
- due discovery uses `scheduled_at <= now`, providing automatic catch-up after missed runs or downtime.
- background business transitions reuse the same Application/Domain capabilities as interactive workflows.
- scheduled publication is idempotent, current-state-aware, and transaction-safe; repeated/overlapping execution cannot create duplicate logical publication.
- a small SQL-backed scheduler lease may prevent ordinary overlap, while idempotency remains the final correctness guarantee.
- critical transitions may use targeted row locks; engine-specific multi-worker claiming remains deferred.
- work is processed in deterministic bounded batches.
- failed execution leaves canonical content Scheduled/overdue and retryable rather than inventing a generic Failed lifecycle state.
- scheduler heartbeat and overdue indicators provide small actionable health visibility rather than a full job-management console.
- scheduled-publication Audit distinguishes the human scheduler/initiator from the System executor and joins the canonical transaction where required.
- technical retry noise belongs in operational logs, not Publishing Audit.
- Search synchronization remains post-commit and reconstructible through periodic reconciliation.
- temporary Media cleanup is lifecycle-aware and never blindly deletes permanent zero-reference assets.
- Cron/CLI commands are non-interactive adapters over the authoritative Application core.
- retries target transient failures; permanent failures become visible operational conditions.
- Transactional Outbox, Redis, BullMQ, dedicated workers, distributed locks, generic Job platforms, and exact-second scheduling are not Version 1 dependencies.
- Redis/BullMQ is introduced only when measured workload requires independent workers, high concurrency, long-running work, richer retry/backoff, or similar operational capabilities.
- any future queue worker still calls the same idempotent Application capabilities and never owns Domain semantics.
- schedule timestamps persist as UTC while staff interact through `Asia/Bangkok`.
- injectable Clock and explicit concurrency/failure tests make time-dependent behavior deterministic and verifiable.

---

# 284. Next Discussion Topic

> **Logging, Observability, Error Handling & System Health Architecture**

The next decisions should define:

- structured application/HTTP/background logging
- request/correlation IDs and operation context
- Audit versus operational/security logs
- safe error classification and client/server error boundaries
- sensitive-data/token/password redaction
- database, scheduler, Search, storage, and application health signals
- what Admin users should see versus what remains developer/operations detail
- log retention/rotation on Bangmod Expert Hosting
- alert thresholds without introducing an enterprise observability stack
- when external monitoring/log aggregation would become justified

The goal is to make failures **diagnosable, privacy-aware, actionable, and operationally simple** without requiring ELK/Grafana/Prometheus infrastructure in Version 1.

---

# 285. Logging & Observability Purpose

Version 1 logging and observability exist to make failures diagnosable and operations actionable without collecting more sensitive information than necessary.

> **Observability must help explain system behavior without becoming a shadow database of user content, credentials, or personal data.**

The baseline is intentionally small enough for a single-node Modular Monolith on Bangmod Expert Hosting while remaining structured enough to adopt stronger external monitoring later if evidence justifies it.

---

# 286. Three Distinct Logging Semantics

The system distinguishes three purposes even when some implementation infrastructure is shared:

1. **Business Audit** — accountable changes to business/system state.
2. **Operational/Application Logs** — software execution, failures, latency, scheduler and maintenance behavior.
3. **Security Event Logs** — authentication, authorization, validation, rate-limit, CSRF, MFA, upload-security and similar security-relevant events.

These records may reference common identifiers, but they are not interchangeable.

---

# 287. Business Audit Remains Durable Domain Accountability

Audit answers:

- who performed or initiated an accountable action
- what action occurred
- which resource/account/configuration was affected
- when it occurred
- whether the executor was a human or the System
- the minimum context required to understand the business/security change

Audit remains append-oriented, queryable and durable in canonical SQL. It is not subject to ordinary application-log rotation and continues to follow Frozen Roles & Permissions, including restricted `audit.view` access.

---

# 288. Operational/Application Logs

Operational logs explain software behavior such as:

- HTTP request completion/failure
- database or storage dependency failure
- scheduler execution
- Search synchronization/reconciliation
- Media processing
- startup/configuration failure
- unexpected exceptions
- bounded timing/performance diagnostics

They are technical operations data, not a public or CMS content history.

---

# 289. Security Event Logs

Security-relevant events include, where appropriate:

- login success/failure
- MFA success/failure/reset
- session revocation
- rate-limit activation
- CSRF validation failure
- forbidden capability attempts
- suspicious or disallowed file uploads
- server-side security validation failures
- account/credential security events

Security events are logged with enough context to investigate misuse while minimizing sensitive values.

---

# 290. Fastify + Pino Structured Logging Baseline

Fastify's Pino-based logger is the Version 1 general operational logger.

The architecture does not add a second general-purpose logging framework such as Winston merely for stylistic preference.

Production logging uses structured JSON so logs can be filtered, parsed, aggregated or exported later without changing application event semantics.

---

# 291. Production JSON, Developer-Friendly Local Output

Production logs are machine-readable structured records.

Local development may use human-friendly formatting/pretty printing, but the semantic fields and event names must remain compatible with production behavior.

A log record should favor explicit fields such as:

```text
event
level
module
requestId / operationId
resourceId when necessary
statusCode
durationMs
safe error classification
```

rather than encoding all context into one free-form sentence.

---

# 292. Stable Event Names

Important events use stable machine-readable names such as:

```text
authentication_failed
scheduled_publication_failed
search_reconciliation_completed
media_upload_rejected
request_completed
```

Free-form `message` text may supplement these fields but must not be the only way to classify events.

---

# 293. Server-Generated Request ID

Every HTTP request receives an opaque server-generated `requestId` used to correlate transport, Application and error logs for that request.

The same identifier may be returned as a safe error reference when an unexpected failure occurs so an administrator can report a problem without seeing the internal stack trace.

---

# 294. Untrusted Client Correlation IDs Are Not Authoritative

Version 1 does not trust an arbitrary external `requestId` header as the authoritative internal correlation identifier.

If trusted proxy/service correlation becomes necessary later, propagation must be explicitly validated and scoped rather than automatically accepting caller-controlled identifiers.

---

# 295. Background Operation IDs

Cron, scheduler, reconciliation, cleanup and other non-HTTP runs receive an opaque `operationId`.

All logs belonging to one execution can therefore be correlated without pretending that a background run is an HTTP request.

---

# 296. Correlation Identity Is Not Business Identity

`requestId`, `operationId`, Audit event ID, User ID and resource stable IDs serve different purposes.

The system does not overload one generic `correlation_id` to replace all business and operational identities.

---

# 297. Structured Safe Context

Operational logging records only context needed for diagnosis, such as:

- module/capability
- safe stable resource identifier
- HTTP method and route template
- status/result classification
- duration
- retry attempt when operationally meaningful
- dependency/error class

Context values are structured instead of manually concatenated into log strings.

---

# 298. No Whole-Payload Logging Baseline

Version 1 does not routinely log:

```text
request.body
entire User objects
entire Domain Entities
raw database rows
uploaded binary content
```

Wholesale object logging creates unnecessary privacy/security risk and makes redaction unreliable.

---

# 299. Sensitive Data Redaction

The application intentionally excludes/redacts secrets and authentication material from logs, including:

- plaintext passwords and password hashes
- Session IDs/cookies
- CSRF tokens
- MFA secrets
- MFA recovery codes
- password-reset tokens
- Authorization headers
- database passwords
- API keys/secrets
- cryptographic keys

Personal data is logged only where a documented operational/security purpose justifies it, and preferably through minimal identifiers rather than full values.

---

# 300. Search Query and URL Privacy

Raw Public Search queries are not recorded in routine operational access logs by default because queries can contain sensitive or identifying text.

Request logging should prefer the route template plus status/timing over storing full query strings.

Any future use of raw search terms for analytics requires a separate Product/Privacy review and is not an incidental logging feature.

---

# 301. Log Injection Resistance

User-controlled values such as filenames, user agents, usernames, Titles and request parameters are treated as untrusted data.

Structured logger serialization and validation/normalization are used so control characters or crafted input cannot safely redefine log structure or create misleading entries.

---

# 302. Log Level Semantics

Version 1 uses meaningful levels:

- `TRACE` / `DEBUG` — controlled developer diagnostics
- `INFO` — normal significant operational events
- `WARN` — abnormal but recoverable/degraded conditions
- `ERROR` — an operation failed or requires investigation
- `FATAL` — the process cannot safely continue

Everything is not treated as an error, and every function call is not treated as an information event.

---

# 303. Expected Outcomes Are Not Operational Incidents

Normal Domain/HTTP outcomes such as:

- validation rejection
- Not Found
- permission denial that is handled normally
- optimistic concurrency conflict
- empty Search result

are not automatically logged at `ERROR` level.

Security-relevant patterns may still create Security Events, but expected application behavior must not overwhelm operational monitoring.

---

# 304. Centralized Error Boundary and Mapping

Transport routes do not independently invent error responses.

Errors are mapped through centralized conventions covering:

```text
Transport validation
Authentication
Authorization
Not Found
Conflict / concurrency
Domain rule violation
Operational dependency failure
Unexpected exception
```

This mapping reuses the accepted canonical API error envelope and HTTP semantics.

---

# 305. Error Classification

Errors are conceptually classified as:

### Expected
- transport/schema validation failure
- authentication failure
- authorization failure
- Not Found
- conflict/concurrency
- Domain rule rejection

### Operational
- database unavailable
- storage failure
- Search projection/reconciliation failure
- other dependency failure

### Unexpected
- programming error
- invariant breach not represented as a normal Domain outcome
- unknown exception

Classification informs response mapping, log level, retry policy and health reporting.

---

# 306. Client-Safe Error Responses

Unexpected failures return generic client-safe messages and a safe reference identifier.

Public/Admin responses never expose:

- stack traces
- SQL statements/errors
- table/column details
- filesystem paths
- secret/configuration values
- internal implementation classes

Technical exception detail remains in protected operational logs.

---

# 307. Failure Is Never Silently Swallowed

Recoverable derived failures may deliberately avoid rolling back canonical state, but they must remain operationally visible.

For example:

```text
Publication COMMIT succeeds
Search projection refresh fails
→ Publication remains valid
→ Search failure is logged/health-visible
→ reconciliation can repair it later
```

A `catch {}` that silently discards meaningful failures is not an accepted reliability pattern.

---

# 308. Health Is Split into Liveness, Readiness and Operational Health

The system distinguishes:

### Liveness
Whether the Node process is alive.

### Readiness
Whether the application can safely serve its essential workload, including critical configuration/dependencies.

### Operational Health
Whether important supporting capabilities such as Scheduler, Search reconciliation and Storage are operating normally.

These concepts are not collapsed into one misleading boolean.

---

# 309. Minimal Public Health Endpoints

If health endpoints are exposed to infrastructure, they return the minimum information required.

Conceptual examples:

```text
/health/live  → ok / not ok
/health/ready → ready / not_ready
```

They do not disclose database hostnames, software versions, filesystem paths, environment variables, stack traces or dependency credentials.

---

# 310. Small Admin System Health Surface

Authorized Admin users may receive a small read-only/actionable System Health surface showing high-level status such as:

```text
Overall
Database
Scheduler
Scheduled Publishing / overdue count
Search
Storage
```

This surface is separate from the editorial/Admin Work Dashboard and is not a raw log viewer or DevOps console.

---

# 311. Health Status Vocabulary

Version 1 uses a small operational vocabulary:

```text
Healthy
Degraded
Unavailable
```

Exact thresholds are deployment/operations configuration based on real workload rather than arbitrary Blueprint constants.

---

# 312. Critical vs Degradable Dependencies

Dependencies are classified by impact.

Examples:

### Critical
- canonical CMS database
- required security/runtime configuration

### Degradable
- Search projection/reconciliation
- optional malware scanner
- derivative regeneration where originals remain safe

Failure of one optional/degradable subsystem does not automatically report the entire Public Website as unavailable.

---

# 313. Database Health

Database health uses lightweight connectivity/readiness checks appropriate to the deployment.

A health request does not run expensive integrity scans or broad production queries merely to determine whether the application is ready.

---

# 314. Scheduler Health

Scheduler health derives from the accepted Background Architecture, including signals such as:

- last start
- last completion
- last successful run
- overdue scheduled work

The goal is to distinguish "Cron did not run" from "Cron ran but one operation failed."

---

# 315. Search Health

Search health reflects availability and projection/reconciliation freshness without redefining Search as canonical state.

A degraded Search subsystem degrades Search functionality rather than making unrelated canonical Public pages unavailable.

---

# 316. Storage Health

Storage health verifies the minimum conditions needed for safe Media/Document operations and watches capacity risk without performing expensive write tests on every Public request.

Capacity and writeability checks may run periodically or through controlled readiness/maintenance logic.

---

# 317. Version 1 Observability Baseline

Version 1 deliberately starts with:

```text
Structured Logs
+ Request/Operation Correlation
+ Durable Audit
+ System Health
```

This is sufficient for the current single-node Modular Monolith architecture without requiring a separate observability platform from day one.

---

# 318. OpenTelemetry Is an Extension Point, Not a Baseline Dependency

Field naming and correlation should remain compatible with future OpenTelemetry instrumentation where practical.

Version 1 does not require an OpenTelemetry Collector, tracing backend or metrics backend merely to claim observability.

---

# 319. Distributed Tracing Is Deferred

The accepted architecture intentionally has:

- one primary Node.js Modular Monolith
- one canonical CMS SQL database
- no microservice fleet
- no broker
- no dedicated background worker fleet

Therefore distributed tracing infrastructure adds limited value in Version 1 and remains deferred until topology/operational evidence changes.

---

# 320. Timing and Performance Signals

Important durations can be recorded as structured fields where useful, for example:

```text
request.durationMs
scheduler.durationMs
search.durationMs
imageProcessing.durationMs
```

The system does not need Prometheus before it can detect and diagnose slow operations.

---

# 321. Raw SQL Logging Is Disabled by Default in Production

Production does not permanently log every SQL statement and parameter.

Raw query logging is noisy, can expose sensitive values, and adds I/O overhead.

Controlled temporary diagnostics may be enabled when needed, with minimization/redaction and a bounded duration.

---

# 322. Slow-Operation Diagnostics Are Evidence-Based

The system may identify slow requests/queries/media operations using measured thresholds.

Exact thresholds are not Frozen in the Blueprint and are established through deployment/performance testing rather than arbitrary numbers.

---

# 323. Purpose-Driven Bounded Retention

Operational, Security and Audit data have bounded/purpose-driven retention policies.

Their retention periods may differ because their purposes differ.

Exact durations are determined during Operations/Compliance planning using legal/policy, forensic, privacy, hosting-capacity and operational requirements rather than a guessed universal number.

---

# 324. Log Rotation and Capacity Protection

If logs are stored on local filesystem infrastructure, rotation/expiration and capacity protection are mandatory operational concerns.

A growing application log must never be allowed to consume all available disk and take the application offline.

Exact rotation tooling belongs to Deployment/Operations architecture.

---

# 325. Log Access Protection

Operational and Security logs are protected from public access and unauthorized modification/deletion.

- Editor/Publisher CMS access does not imply server-log access.
- `audit.view` does not imply permission to browse raw operational logs.
- filesystem/hosting permissions remain restricted.
- no Public HTTP route exposes raw application logs.

---

# 326. Admin CMS Does Not Expose Raw Server Logs in v1

Admin CMS displays derived health/actionable information rather than raw log lines, stack traces, SQL or infrastructure internals.

Technical operators use protected server/hosting tooling for raw operational diagnosis.

---

# 327. Alerting Must Be Actionable

Future alerts should focus on meaningful conditions such as:

- critical database/application unavailability
- Scheduler not running beyond a justified threshold
- overdue scheduled publication
- storage capacity risk
- persistent Search reconciliation failure
- sustained/relevant security anomaly

Ordinary 404s, single failed logins, zero Search results and other expected events are not incident alerts by themselves.

---

# 328. Public and Admin Error UX

Public unexpected errors use simple non-technical messaging and may provide a Reference ID.

Admin expected errors are presented at the appropriate workflow/field/action location.

Admin concurrency conflicts explain that data changed elsewhere and guide the user to refresh/review rather than silently overwriting.

Admin unexpected failures clearly state that the operation was not confirmed successful and provide a safe Reference ID.

---

# 329. Success Is Reported Only After Authoritative Commit

The API/UI does not report a business mutation as successful until its authoritative canonical transaction has committed successfully.

> **A success message represents authoritative completion, not merely that processing started.**

Derived follow-up work such as Search projection may still degrade separately according to its accepted reliability semantics.

---

# 330. Observability Is Not Citizen Analytics

Operational logging is not repurposed by default for behavioral analytics, profiling, content popularity scoring or personalized tracking.

Any future citizen analytics capability requires a separate Product/Privacy decision and does not emerge implicitly from operational logs.

---

# 331. OWASP-Aligned Logging & Error Verification

Implementation and review use applicable OWASP ASVS 5 Security Logging / Error Handling requirements plus OWASP Logging and Error Handling guidance as the security baseline.

The project does not claim blanket ASVS compliance without verifying the applicable requirements in the deployed system.

---

# 332. Accepted Logging, Observability, Error Handling & System Health Architecture

**Sections 285–331 = Accepted Logging, Observability, Error Handling & System Health Architecture.**

Accepted baseline:

- Version 1 distinguishes Business Audit, Operational/Application Logs and Security Event Logs by purpose.
- Fastify/Pino structured JSON logging is the general operational logging baseline; a second logger framework is not added without proven need.
- HTTP requests receive server-generated opaque Request IDs; background executions receive Operation IDs.
- correlation identifiers do not replace business/resource/Audit identities.
- stable machine-readable event names and structured safe context are preferred over free-form message parsing.
- whole request bodies, Domain objects and raw database rows are not routinely logged.
- passwords, password hashes, sessions/cookies, CSRF/MFA/recovery/reset material, authorization headers, database secrets and API/cryptographic secrets are never intentionally logged.
- personal data and raw Search queries are minimized and require a legitimate reviewed purpose before routine logging.
- structured encoding plus safe handling protects against log injection.
- expected Domain/HTTP outcomes are separated from true operational incidents.
- centralized error mapping produces canonical client-safe responses while technical detail remains in protected server logs.
- swallowed failures are prohibited; derived failures may degrade independently but remain observable and recoverable.
- health distinguishes Liveness, Readiness and Operational Health.
- public health endpoints expose minimal information; authorized Admin receives only a small read-only/actionable System Health view.
- Health uses `Healthy / Degraded / Unavailable` and distinguishes critical dependencies from degradable subsystems.
- Database, Scheduler, Search and Storage each expose only lightweight useful health signals.
- Version 1 observability is Structured Logs + Correlation + Audit + System Health.
- OpenTelemetry compatibility is an extension point; Collector/metrics/distributed-tracing infrastructure is not a Version 1 dependency.
- raw SQL query logging is disabled by default in production; slow-operation thresholds are evidence-based.
- Operational, Security and Audit records use bounded, purpose-driven retention with protected access and rotation/capacity controls.
- Admin CMS does not expose raw server logs in Version 1.
- alerts are reserved for sustained/actionable conditions rather than expected application noise.
- UI/API success is reported only after authoritative canonical commit.
- operational observability is not repurposed into citizen behavioral analytics without a separate Product/Privacy decision.
- applicable OWASP ASVS 5 Security Logging/Error Handling requirements and OWASP Logging/Error Handling guidance form the verification/implementation baseline without unsupported blanket compliance claims.

---

# 333. Next Discussion Topic

> **Deployment, Environment, Backup & Disaster Recovery Architecture**

The next decisions should define:

- `development`, `staging` and `production` boundaries
- Git/build/release/deploy workflow on Bangmod Expert Hosting
- Node process start/restart and zero/low-downtime expectations
- configuration/secrets/environment management
- explicit database migration sequence during release
- release verification and rollback criteria
- backup scope covering canonical SQL + original Media/Documents
- backup frequency/retention principles without inventing unsupported guarantees
- off-host/independent backup considerations
- restore testing and recovery runbooks
- RPO/RTO expectations appropriate to the real organizational risk
- disaster scenarios such as database loss, file-storage loss, bad deploy, corrupted migration and hosting outage
- when a move from Expert Hosting to VPS/other infrastructure would become justified

The goal is a deployment and recovery model that is **repeatable, reversible where practical, tested, and operationally simple** without introducing Docker/Kubernetes or enterprise DR infrastructure before the risk/workload requires it.

---
# 334. Environment Model

Version 1 uses three logical environments:

```text
Development
    ↓
Staging
    ↓
Production
```

Environment boundaries are explicit even when Staging and Production initially share one Expert Hosting account.

---

# 335. Development Environment

Development runs with local/developer-controlled resources:

- local application runtime
- local/development database
- local media/storage
- development-only configuration and secrets

Production credentials or production-only secrets are never required for ordinary local development.

---

# 336. Staging Environment

Staging is the pre-production verification environment for:

- release candidates
- schema migrations
- integration behavior
- deployment procedures
- smoke/E2E verification
- recovery exercises where appropriate

Staging must use its own application configuration, database, storage, sessions, and secrets.

---

# 337. Production Environment

Production is the authoritative environment for:

- the canonical Public Website
- Admin CMS
- production SQL data
- canonical Media/Documents
- production scheduler/background tasks
- authoritative runtime configuration

Only explicitly approved releases are activated in Production.

---

# 338. Initial Staging Placement on Expert Hosting

Staging may initially run within the same Bangmod Expert Hosting account when practical, provided logical isolation remains real.

A separate VPS/hosting subscription is not a Version 1 requirement merely to create Staging.

Staging protects against bad releases; it is not Disaster Recovery because a shared hosting/account failure may affect both environments.

---

# 339. Environment Isolation Is Mandatory

Staging never points to Production resources such as:

- Production database
- Production Media storage
- Production session store
- Production secrets
- Production scheduler state

Environment names alone do not constitute isolation.

---

# 340. Production Data in Non-production Environments

Production data is not copied blindly into Staging or developer machines.

When realistic production-like data is necessary for diagnosis or testing, the copy must be purpose-limited and sanitized/minimized as appropriate before use outside Production.

---

# 341. GitHub Is the Authoritative Code Source

Application source code, migrations, configuration templates, and deployment documentation are version-controlled in Git and hosted in the authoritative GitHub repository.

The deployment path is conceptually:

```text
Developer
   ↓
Git / GitHub
   ↓
Reviewed immutable commit/release
   ↓
Expert Hosting
```

Production is never the authoritative source of application code.

---

# 342. Direct Production Code Editing Is Not Normal Workflow

Editing application source directly through DirectAdmin File Manager, SSH editors, or other Production-side manual changes is not a normal release path.

Emergency changes, if unavoidable, must be reconciled immediately back into the authoritative Git history before further releases.

---

# 343. Every Production Release Has an Immutable Identity

Production must be traceable to an immutable source revision such as a Git commit and an operational release identifier.

The system/operator must be able to answer:

```text
Which exact release is Production running now?
```

Independent semantic versioning of every internal package is not required.

---

# 344. Controlled Release Rather Than Automatic Main-branch Deployment

Version 1 does not require every push/merge to `main` to deploy directly to Production.

The preferred flow is:

```text
Pull Request
→ Review
→ Automated Quality Checks
→ Merge
→ Approved Release
→ Staging
→ Production Approval
→ Production
```

Deployment speed does not outrank controlled release safety.

---

# 345. Continuous Integration Quality Checks

A deployable candidate should pass automated CI checks that include, as applicable:

- dependency installation from the committed lockfile
- TypeScript typecheck
- lint/static checks
- unit tests
- integration/API tests required by the change
- Public Web build
- Admin build
- Server build

CI validates release quality; CI does not imply mandatory automatic Production deployment.

---

# 346. Reproducible Dependency Installation

The selected workspace package manager lockfile is part of the release input.

Production installations use the locked dependency graph rather than resolving unconstrained dependency versions at deployment time.

---

# 347. Expert Hosting Runtime Boundary

Version 1 continues to target Bangmod Expert Hosting with the supported Node.js/Nginx Unit runtime, Git/SSH operational access, DirectAdmin database facilities, and Cron scheduling.

Docker is not required merely to run the Node application on this hosting model.

---

# 348. Production Deployment Sequence

The baseline release sequence is:

```text
Approved Commit / Release
        ↓
Pre-deploy checks
        ↓
Fetch candidate
        ↓
Install locked dependencies
        ↓
Build
        ↓
Release validation
        ↓
Pre-change backup when risk warrants
        ↓
Explicit database migration
        ↓
Activate / restart application
        ↓
Health checks
        ↓
Smoke tests
        ↓
Release complete
```

A deployment is not complete merely because repository files reached the server.

---

# 349. Build Before Activation

A release candidate should complete build and validation before becoming the active Production application.

Users should not be intentionally served from an application directory while dependencies/build artifacts are only partially prepared.

The exact activation/switch mechanism is verified against real DirectAdmin/Nginx Unit behavior during implementation.

---

# 350. No Unsupported Zero-downtime Claim

Version 1 does not promise zero-downtime deployment unless the real hosting/runtime deployment mechanism proves it reliably.

A brief controlled restart is preferable to fragile release machinery built only to claim zero downtime.

Blue/green, container orchestration, or equivalent deployment platforms are not baseline requirements.

---

# 351. Database Migration Is an Explicit Release Step

Schema migrations are executed intentionally as part of the release procedure and are not auto-run during ordinary application startup.

The deployed application and the current schema version must be compatible before the release is considered healthy.

---

# 352. Schema Changes Must Consider Application Rollback

Ordinary schema evolution favors backward/forward compatibility where practical.

New fields/tables may be introduced before old structures are removed so that a previous application release can still run during a controlled rollback window when appropriate.

---

# 353. Expand → Migrate → Contract for High-risk Changes

Destructive/high-risk schema evolution may use:

```text
Expand
→ deploy compatible code
→ migrate/backfill and verify
→ switch authoritative usage
→ Contract/remove old structure later
```

This is applied selectively where data-loss/rollback risk justifies it, not as ceremony for every small migration.

---

# 354. Application Rollback and Database Recovery Are Different

Rolling application code from release `N` to `N-1` is not equivalent to rolling the database backwards.

Database DOWN migrations are not treated as the default rollback strategy because reversal may destroy valid data.

Database incidents favor compatible forward fixes or verified backup recovery when required.

---

# 355. Release Health Gate

After activation/restart, the release must pass a health gate appropriate to the changed system, including core signals such as:

- process liveness
- application readiness
- database connectivity
- critical configuration availability
- storage availability
- scheduler/system state where relevant

A successful shell command alone is not proof of a successful deployment.

---

# 356. Production Smoke Tests

A small set of critical Production smoke tests verifies representative behavior after deployment, such as:

- Homepage/public canonical page response
- a known canonical content route
- liveness/readiness
- Admin login surface availability
- Public Search availability when applicable
- Media/WebP delivery

Full Production E2E execution is not required on every release when a smaller safe verification set is sufficient.

---

# 357. Environment-specific Secrets and Credentials

Development, Staging, and Production use separate secrets and credentials.

This includes, where applicable:

- database credentials
- session secrets
- MFA/encryption keys
- future SMTP/external API credentials

A credential compromise in one environment should not automatically compromise another environment.

---

# 358. Environment Configuration Is External to Git Secrets

The repository may include safe configuration templates such as `.env.example`, but real secrets are excluded from Git.

Required runtime configuration is validated at startup and supplied through the protected hosting/runtime configuration mechanism.

Secret handling follows the applicable OWASP secrets-management guidance without introducing a separate secrets platform before needed.

---

# 359. Backup Scope: Protect What Cannot Be Reconstructed

The canonical backup scope includes:

- CMS SQL data
- canonical original Media/Documents
- recovery information required to reconstruct protected runtime configuration/secrets

Reconstructible artifacts do not automatically require canonical backup, including:

- `node_modules`
- build output
- Search projections
- WebP derivatives
- temporary upload files

---

# 360. Database and Original Files Form One Recovery Set

A database-only backup is incomplete when the database references original uploaded files that are missing.

A file-only backup is likewise incomplete without the authoritative metadata/relationships in SQL.

Disaster recovery therefore treats canonical SQL + original Media/Documents + required configuration recovery as one logical recovery set.

---

# 361. Provider Backup Is a Layer, Not an Assumption

DirectAdmin/hosting backup capabilities may be used when verified for the actual Expert Hosting plan.

The architecture does not assume that backup frequency/retention documented for a different Bangmod hosting product automatically applies to Expert Hosting.

Provider guarantees are recorded only after they are verified for the purchased environment.

---

# 362. Organization-controlled Recovery Backup

At least one recovery layer is controlled by the organization/application recovery process rather than relying exclusively on an opaque provider-side backup policy.

Provider backup and organization-controlled backup may complement one another.

---

# 363. Off-host Backup Is a Baseline Requirement

At least one recoverable backup copy must be independent of the active Production hosting account/environment.

Conceptually:

```text
Production
    ↓
Backup
    ↓
Independent off-host recovery location
```

Loss, deletion, or compromise of the Production hosting account must not automatically destroy every recoverable copy.

---

# 364. Backup Encryption and Access Protection

Off-host backup data is encrypted in transit and protected/encrypted at rest where supported.

Access to backups is more restricted than ordinary CMS administration because backups may contain complete database, document, account, Audit, and security-relevant data.

---

# 365. Backup Frequency and Retention Are Evidence-based

The Blueprint does not invent a fixed backup interval or retention period before actual Production volume, provider limits, recovery needs, and organizational policy are known.

Backup frequency and retention are finalized before Go-live using measured risk and recovery requirements.

---

# 366. Recovery Point Objective (RPO)

RPO defines the maximum acceptable amount of recent authoritative data that may be lost in a disaster recovery scenario.

The final RPO must reflect real publishing/document/media/account-change activity and available backup capabilities rather than an arbitrary industry-looking number.

---

# 367. Recovery Time Objective (RTO)

RTO covers the end-to-end time required to restore usable service, including:

- incident recognition
- environment preparation
- database recovery
- original file recovery
- configuration/secret recovery
- application startup
- verification

Database import time alone is not the RTO.

---

# 368. Restore Drills Validate RPO/RTO Assumptions

Before Production Go-live, and periodically thereafter according to Operations policy, representative backups are restored into an isolated environment.

A restore is considered verified only when critical behavior can be exercised after recovery, including appropriate checks of:

- content/data
- original files
- permissions/authentication
- Audit integrity
- application startup
- Search reconstruction
- critical public/admin flows

Backup-file existence alone is not a successful recovery test.

---

# 369. Search Projection Is Reconstructed During Recovery

Search remains derived from canonical data.

Disaster recovery restores authoritative SQL/resources first and then rebuilds/reconciles Search rather than treating a potentially stale Search projection as a canonical backup asset.

---

# 370. WebP Derivatives Are Reconstructible Recovery Artifacts

Canonical original images are backed up; optimized WebP presentation derivatives may be regenerated from originals when recovery/storage trade-offs justify it.

A Disaster Recovery plan must never treat generated derivatives as the only recoverable copy of an image.

---

# 371. Routine Backup and Pre-change Snapshot Have Different Purposes

Routine backups provide continuing recovery protection.

A pre-change backup/snapshot may additionally be taken before a destructive or unusually high-risk migration/release.

Routine low-risk releases do not require an unnecessary full backup solely as ceremony when adequate current recovery points already exist.

---

# 372. Deployment Rollback Ladder

When a release creates a problem, the preferred escalation is conceptually:

```text
1. Safe feature/fallback mitigation where available
2. Roll back the application release when schema-compatible
3. Apply a forward database/data fix when appropriate
4. Restore verified backup for genuine data-recovery cases
```

Backup restore is not the default first response to every bad code deployment.

---

# 373. Disaster Scenarios Are Classified by Failure Type

Recovery planning distinguishes at least:

- bad application release
- bad/partial schema migration
- accidental content/data deletion or corruption
- Media/original-file loss
- hosting outage/loss
- hosting/account compromise
- credential/secret compromise

One generic recovery button/process is not assumed to solve every incident type.

---

# 374. Bad Application Release Recovery

When code is faulty but authoritative data remains healthy, the preferred recovery is an application rollback or forward code fix rather than an unnecessary database restore.

---

# 375. Canonical Data Corruption Recovery

When authoritative data is corrupted or deleted, recovery begins with scope assessment and may use:

- targeted forward repair
- selective resource recovery where technically safe
- verified backup restore

The system does not automatically overwrite healthy Production data with an old full backup without impact analysis.

---

# 376. Full Hosting Loss Recovery

Recovery from complete Expert Hosting loss requires assets independent of that host, including:

- authoritative Git repository
- off-host SQL backup
- off-host canonical originals
- secret/configuration recovery process
- deployment/runtime manifest

A replacement environment can then be provisioned, restored, started, and verified.

---

# 377. Git Is Not a Production Data Backup

Git/GitHub protects source code, migrations, safe templates, and documentation.

Production databases, uploaded originals, runtime secrets, or routine SQL dumps are not committed to Git as a substitute for data backup.

---

# 378. CMS Administration and Infrastructure Administration Stay Separate

CMS Admin capability does not automatically grant access to:

- DirectAdmin
- SSH
- Production database credentials
- deployment controls
- recovery backups
- backup encryption/recovery keys

Infrastructure/deployment/recovery access follows separate least-privilege responsibility.

---

# 379. SSH Is a Control Channel, Not the Release Methodology

Expert Hosting SSH/Terminal access may execute documented deployment/recovery commands, but Production releases should not depend on an operator remembering an undocumented sequence of ad-hoc shell commands.

Deployment actions are repeatable and documented.

---

# 380. Cron Configuration Is Part of Recoverable Production Configuration

Production scheduled commands and their intended cadence are documented/version-traceable, including applicable tasks such as:

- scheduler execution
- Search reconciliation
- temporary Media cleanup
- backup task when application-managed

A rebuilt hosting environment must not depend on institutional memory to recreate Cron configuration.

---

# 381. Infrastructure Configuration Manifest

The project maintains an operational deployment manifest/runbook describing the required environment, including at least:

- supported Node.js LTS requirement/exact deployed version
- application working directory and entry point
- base URLs
- required runtime variables
- database/storage requirements
- build command
- migration command
- start/restart procedure
- Cron tasks
- health endpoints
- recovery references

This is configuration knowledge required to reconstruct Production.

---

# 382. Full Infrastructure-as-Code Is Not Required in Version 1

Terraform, Ansible, Kubernetes, Helm, and Production Docker/Compose are not baseline requirements for Expert Hosting where the application does not own the underlying server/network provisioning layer.

Repeatable commands and accurate deployment/recovery documentation are sufficient until operational evidence justifies stronger Infrastructure-as-Code automation.

---

# 383. Production Release Record

Operational release history records enough information to correlate incidents and deployments, such as:

- release identifier
- Git commit
- deployment time
- deploying operator/process
- applied schema version
- outcome

This operational release record is distinct from business-content Audit history.

---

# 384. Public Version Disclosure Is Minimal

Technical operators may see the active release identifier through protected operational tooling/health information.

Public endpoints do not unnecessarily disclose exact Node.js, Fastify, database, filesystem, package, or infrastructure versions merely for convenience.

---

# 385. Evidence Threshold for Moving Beyond Expert Hosting

Expert Hosting remains the Version 1 deployment target until measured requirements justify greater control, such as:

- resource limits causing instability
- need for persistent/independent workers
- required system services/packages unavailable on hosting
- reliable malware scanning requirements unsupported by the plan
- advanced proxy/network/runtime control
- queue/broker infrastructure
- stronger isolation
- materially stronger backup/recovery requirements
- observability infrastructure that cannot reasonably run there

A VPS is not selected merely because it appears more sophisticated.

---

# 386. Accepted Deployment, Environment, Backup & Disaster Recovery Architecture

The following decisions are **Accepted** for the Version 1 System Blueprint:

- Development, Staging, and Production are separate logical environments; Staging may initially share the Expert Hosting account but never Production database/storage/sessions/secrets.
- GitHub is the authoritative code source and Production deploys from an explicitly approved immutable revision; direct Production editing is outside normal workflow.
- CI quality checks precede release, while automatic Production deployment on every `main` change is not required.
- Deployment includes controlled fetch/install/build/validation, explicit schema migration, activation/restart, health gates, and smoke tests.
- release candidates are built before activation and zero-downtime is not claimed until verified against real Expert Hosting/Nginx Unit behavior.
- schema migrations are explicit/version-controlled/rollback-aware; high-risk destructive evolution may use expand-migrate-contract techniques.
- application rollback and database recovery are separate; backup restore is reserved for actual data-recovery needs rather than routine bad-release rollback.
- environment credentials/secrets are separate and protected outside Git under OWASP-aligned secrets-management practices.
- canonical recovery covers SQL + original Media/Documents + required configuration/secret recovery information; Search/WebP/build/dependencies/temp files remain reconstructible.
- provider backup is one possible layer but no unverified Expert Hosting retention/frequency guarantee is assumed.
- at least one protected/encrypted recovery copy is independent of the Production hosting account.
- backup schedule/retention and RPO/RTO are finalized from real volume/risk and measured restore drills before Go-live.
- backups are trustworthy only after isolated restore verification of data, originals, application configuration and critical workflows.
- infrastructure/runtime/Cron configuration is documented as a reproducible deployment/recovery manifest; full Terraform/Ansible/Docker/Kubernetes infrastructure is not a Version 1 requirement.
- CMS administration does not imply SSH/DirectAdmin/deployment/backup privileges.
- Expert Hosting remains the target until actual resource/worker/service/isolation/network/backup/observability needs justify VPS or other infrastructure.

---

# 387. Next Discussion Topic

> **Testing, Quality Gates & Security Verification Strategy**

The next decisions should define:

- Unit, Integration, API/HTTP, E2E and concurrency test boundaries
- database and transaction-invariant testing
- Public SSR/routing/SEO/status-code verification
- Admin critical workflow testing
- Media/WebP/upload-security testing
- accessibility verification
- OWASP ASVS/security verification and dependency scanning
- static analysis/typecheck/lint quality gates
- test data/environment isolation
- merge vs release quality gates
- which checks must block a release and which are advisory
- evidence required before the System Blueprint can be Final Reviewed/Frozen

The goal is a **risk-based, repeatable quality strategy** that proves important invariants without turning the project into a coverage-percentage or enterprise testing bureaucracy.

---

# 388. Testing Strategy Purpose

Version 1 testing is **risk- and invariant-driven** rather than organized around test volume or an arbitrary coverage target.

The primary question for every important behavior is:

> **Which failure would materially harm correctness, security, public eligibility, data integrity, accessibility, or recoverability, and at which test layer can that invariant be proven most directly?**

Tests should verify externally meaningful behavior and critical Domain/Application invariants rather than mirror implementation details merely to increase coverage percentage.

---

# 389. Version 1 Testing Tooling Baseline

The preferred Version 1 baseline is:

```text
Domain / Application / Unit / Integration
→ Vitest

Fastify HTTP/API Integration
→ Vitest + fastify.inject()

Critical Browser / End-to-End
→ Playwright

Automated Accessibility
→ Playwright + axe-compatible accessibility checks

Security Verification
→ OWASP ASVS 5 requirement/evidence matrix
   + focused automated tooling where appropriate
```

Exact package versions remain implementation/deployment decisions and are not architecture constants.

---

# 390. Risk-Based Test Layers

The test suite uses several complementary layers rather than a ceremonial fixed test pyramid:

```text
Critical E2E Journeys
        ↑
HTTP / Integration
        ↑
Application / Domain
        ↑
Small Focused Unit Tests
```

A behavior is tested at the lowest layer that can prove the intended invariant without excessive mocking or implementation coupling.

Critical cross-boundary behavior may intentionally be proven at more than one layer.

---

# 391. Domain Tests

Pure Domain behavior should be tested without HTTP, database, filesystem, or framework dependencies where practical.

Representative targets include:

- Announcement Closed/Expired semantics
- Health Service lifecycle rules
- Document supersession eligibility
- publication eligibility
- Role/Module Scope decision rules
- lifecycle transition guards

Tests should read in business terms such as:

```text
Given Editor
When attempting a public-impact transition
Then the transition is denied
```

---

# 392. Application Use-Case Tests

Application tests verify orchestration around meaningful use cases such as:

- Publish News
- Schedule Announcement
- Supersede Document
- Disable CMS User
- update public Contact information

They should prove the behavior that matters, including authorization, validation, transaction participation, Audit requirements, and post-commit side-effect semantics.

Version 1 does not require mocking every internal function call when behavior can be verified more directly.

---

# 393. Database-Sensitive Integration Uses a Real MySQL-Compatible Engine

Database-sensitive integration tests must run against a real MySQL-compatible relational engine rather than SQLite or an in-memory substitute when behavior depends on:

- transactions
- foreign keys
- uniqueness
- row locks
- isolation/concurrency
- optimistic concurrency
- InnoDB-specific semantics

A lightweight substitute must not be allowed to create false confidence for behavior that Production depends on.

---

# 394. Test Database Aligns with the Verified Production Engine

The exact Production vendor/version remains unfrozen until the real Expert Hosting environment is inspected.

After it is known, CI/Staging integration testing should align with that engine family/version range as closely as practical.

The architecture must avoid a situation where tests pass under materially different MySQL/MariaDB semantics while Production fails under the actual engine.

---

# 395. Database Migration Verification

Schema migrations are tested as executable release artifacts.

At minimum, verification includes:

```text
Fresh Database
→ apply all migrations
→ expected schema works
```

and, for each release where relevant:

```text
Previous Release Schema/Data
→ apply new migration
→ current application works
```

Data-transforming migrations use representative pre-migration data and verify the resulting state rather than treating a successful SQL exit code as sufficient proof.

---

# 396. Fastify HTTP Integration Testing

Fastify `inject()` is the preferred HTTP integration mechanism where appropriate because it exercises the real Fastify routing/plugin/schema/error boundary without requiring an external network listener.

Representative API tests verify:

- authentication boundary
- CSRF requirements for state-changing cookie-authenticated requests
- authorization and Module Scope
- TypeBox/runtime input validation
- standardized status codes/error envelope
- optimistic-concurrency conflicts
- response DTO allowlists

---

# 397. Transport Contract Verification

Shared transport schemas are verified against actual Public/Admin responses.

Tests must help ensure that:

```text
Database Row
≠ Domain/Application Model
≠ Public/Admin DTO
```

and that Public responses never accidentally expose fields such as internal notes, workflow-only metadata, account/security information, technical identifiers, or infrastructure detail that are outside the explicit contract.

---

# 398. Authorization Regression Matrix

Authorization is a first-class regression suite, not a small collection of happy-path Admin tests.

Representative coverage spans:

- Viewer
- Editor
- Publisher
- Admin
- Module Scope
- relevant resource state
- public-impact vs Draft-only actions

The suite must preserve Frozen `06-roles-permissions.md` semantics, including the rule that Editor cannot perform live Published edits or public-impact publication actions and that Admin does not bypass Domain invariants.

---

# 399. Concurrency Is a First-Class Test Concern

Concurrency-sensitive behavior is tested explicitly, including at least:

- optimistic edit conflict
- concurrent Document supersession
- overlapping Scheduled Publication
- Cancel Schedule racing with Scheduler execution
- other critical lifecycle transitions that use row locking/version checks

The intended result must follow committed transaction order and must not permit silent overwrite, duplicate logical publication, or contradictory canonical state.

---

# 400. Transaction Atomicity Verification

Critical transaction tests intentionally simulate failure between mutation steps.

For example:

```text
Canonical mutation succeeds internally
Audit write fails
→ entire required transaction rolls back
```

or:

```text
Document supersession
→ predecessor state
→ successor state
→ relationship
→ required Audit
```

must either commit as one valid canonical outcome or leave the prior state intact.

---

# 401. Search Failure and Eligibility Regression Tests

Search tests preserve Frozen `08-search.md` reliability/security semantics.

They must prove both directions:

```text
Canonical Publish commits
Search incremental update fails
→ canonical publication remains valid
→ failure is observable
→ reconciliation can repair
```

and:

```text
Canonical content becomes Hidden/Internal/non-public
Search projection remains stale
→ Public Search still cannot expose the resource
```

Search freshness may be eventual; public eligibility may not be eventual.

---

# 402. Scheduler Reliability Tests

Scheduled Publication verification includes representative cases such as:

- before due time → no publication
- due/overdue → publication
- missed scheduler window → catch-up
- repeated execution → one logical publication
- overlapping scheduler runs → safe outcome
- transient database failure → resource remains Scheduled/retryable
- schedule cancelled before winning transaction → no publication
- already Published/non-Scheduled resource → safe no-op/rejection according to current state

Time-dependent tests use the injectable Clock rather than wall-clock sleeps where practical.

---

# 403. Media Upload Security Test Corpus

Media security behavior is tested with safe invalid/adversarial fixtures, such as:

- misleading extension/MIME combinations
- invalid/truncated raster data
- extreme dimensions/pixel counts
- oversized payloads
- path-like filenames
- unusual Unicode filenames
- unsupported SVG
- unsupported archives
- malformed/truncated PDF

The goal is to verify controls without requiring real malicious payloads in the normal test suite.

---

# 404. WebP Pipeline Verification

Image-pipeline tests verify the accepted Media architecture:

```text
Accepted Original
→ preserved as canonical original
→ responsive WebP derivatives generated
```

Verification includes, where relevant:

- output format is WebP
- derivative dimensions correspond to approved presets
- source revision changes derivative identity/version
- public derivative metadata is minimized/stripped according to policy
- decode/dimension failure does not create a falsely successful canonical Media record
- original is not replaced by a delivery derivative

---

# 405. Playwright Covers Critical User Journeys

End-to-end testing focuses on high-value workflows rather than every possible UI permutation.

Representative Public journeys include:

- Homepage → News → canonical article
- Search → result → canonical destination
- Service → related Document
- ITA Fiscal Year → Requirement → Evidence

Representative Admin journeys include:

- Login/MFA → Draft → Publish → verify Public result
- Schedule content and verify workflow state
- optimistic-concurrency conflict UX
- upload image and verify public optimized delivery

---

# 406. Cross-Browser Execution Is Tiered

Full multi-browser execution is not required on every developer edit or Pull Request.

A practical policy is:

```text
Pull Request
→ primary browser / critical E2E subset

Release Candidate or scheduled quality run
→ Chromium + Firefox + WebKit
   for critical journeys
```

This protects browser compatibility without turning every code change into a slow full release test.

---

# 407. Accessibility Verification Has Automated and Human Layers

Accessibility is not considered proven by a single automated scanner.

Version 1 combines:

```text
Automated accessibility checks
+
Targeted keyboard/manual review
```

because important interaction, focus, comprehension, language, and usability issues cannot be completely established through automation alone.

---

# 408. Automated Accessibility Regression Checks

Playwright with axe-compatible checks should cover representative critical pages/components such as:

- Homepage
- News/content page
- Search
- Service
- Health Service
- Admin forms
- navigation
- dialogs/modals

Automation is used to catch regressions such as missing accessible names, invalid ARIA patterns, contrast problems, duplicate IDs, and landmark/form issues where tooling can detect them reliably.

---

# 409. Keyboard and Focus Verification

Targeted tests/manual review verify at least:

- logical Tab order
- visible focus
- skip navigation where applicable
- keyboard-operable menus
- dialog focus management and close behavior
- accessible form errors
- no pointer/drag/hover-only critical action

Admin productivity features must remain operable without a mouse for essential workflows.

---

# 410. Responsive and Mobile Regression Verification

Representative Mobile, Tablet, and Desktop viewport classes are tested for critical surfaces.

Focus areas include:

- public navigation
- cards/listing templates
- tables transformed to responsive views
- Admin forms
- ITA hierarchy
- Search filters/results
- responsive images

The architecture does not require testing every physical device model.

---

# 411. SSR and SEO Are Tested at the HTTP/HTML Boundary

Public rendering verification must inspect server responses before client hydration.

Representative canonical pages verify that initial HTML contains:

- primary public content
- title
- description where applicable
- canonical URL
- Open Graph/social metadata where applicable
- robots directive
- structured data where supported

Primary information must not depend on JavaScript execution merely to exist in the initial response.

---

# 412. Public HTTP Lifecycle Semantics Are Regression-Tested

Tests preserve Frozen Sitemap/Publishing semantics such as:

```text
Eligible Published Public → 200
Not Found / unavailable → 404
Permanently Withdrawn without successor → 410
Meaningful permanent successor → permanent redirect
Hidden/Internal → non-public response
Scheduled-before-publication → non-public response
```

The suite must detect soft-404 regressions and accidental lifecycle leakage.

---

# 413. Sitemap Verification

`sitemap.xml` tests verify that only appropriate canonical indexable URLs are emitted.

The sitemap must exclude, as applicable:

- Draft
- Pending/Approved-unpublished
- Scheduled-before-publication
- Hidden/Internal
- Admin routes
- Preview routes
- `/search` query result pages

Canonical URLs in sitemap and page metadata must not contradict one another.

---

# 414. Public Search SEO Separation Is Tested

`/search` remains a functional/shareable Public Search surface while being excluded from indexable canonical content.

Tests verify that Search pages:

- work with shareable query/filter/page state
- carry the expected `noindex` behavior
- are not emitted in sitemap
- continue to link results to canonical public destinations

---

# 415. Performance Gates Are Evidence-Based

Version 1 does not make a volatile synthetic score such as a perfect Lighthouse score an unconditional architecture-level release requirement.

Instead, performance budgets are established from measured representative content and meaningful regressions, including where useful:

- Public JavaScript size
- image payload/derivative size
- initial HTML size
- critical page response behavior
- application/server processing latency

Exact thresholds are benchmarked rather than guessed.

---

# 416. Bundle Growth Is Monitored

The Public client bundle should have an explicit regression signal so major accidental growth is visible.

For example, a large unexplained jump in JavaScript payload should produce a warning or gate once evidence-based thresholds are defined.

SSR is not treated as permission for unlimited client JavaScript growth.

---

# 417. Coverage Percentage Is Diagnostic, Not the Goal

Vitest coverage reports may be used to identify blind spots and protect critical modules.

Version 1 does **not** freeze an arbitrary global target such as `80%` as the definition of quality.

A lower percentage with proven transaction/concurrency/security invariants is more valuable than a high percentage produced by tests that only execute trivial implementation lines.

---

# 418. Pull Request Merge Gates

Fast, deterministic Pull Request gates should include at least the applicable subset of:

```text
locked dependency install
TypeScript typecheck
lint
architecture/import-boundary checks
Unit/Application tests
core Integration/API tests
web/admin/server builds
secret detection
contract/schema generation validation
security/dependency checks suitable for PR feedback
```

Database integration may also be merge-blocking when runtime remains practical and reliable.

---

# 419. Architecture Boundaries Are Machine-Checked Where Practical

CI/lint/static rules should help prevent architectural regressions such as:

- frontend importing server Domain internals
- one Module deep-importing another Module's Infrastructure
- cross-Module persistence/table bypass
- forbidden circular dependencies
- accidental use of internal package paths outside approved entry points

Code review remains important, but critical boundaries should not rely only on memory.

---

# 420. Staging / Release-Candidate Quality Gates

Before Production, the release candidate adds deeper verification such as:

- production-like migration verification
- full integration suite
- critical Playwright E2E
- concurrency/transaction suites
- accessibility automation
- SSR/SEO/lifecycle checks
- Media/WebP/upload-security tests
- security-verification subset
- staging health/smoke checks

The exact split may evolve with runtime cost, but release confidence must be materially stronger than ordinary local/PR feedback.

---

# 421. Production Release Health Gate

After candidate activation, Production release validation reuses the Deployment/Observability architecture:

- Liveness
- Readiness
- critical Public routes
- Admin authentication surface
- database connectivity
- storage availability
- scheduler health
- Search availability/degraded state

A candidate that fails critical readiness is not considered a successful release merely because deployment commands completed.

---

# 422. Security Verification Uses Three Complementary Layers

Version 1 security assurance combines:

```text
Continuous automated controls
+
Release security verification
+
Periodic / pre-Go-live manual security review
```

No single vulnerability scanner or penetration test is treated as the complete security program.

---

# 423. OWASP ASVS 5 Verification Matrix

Security requirements are tracked through an engineering verification artifact that maps applicable ASVS requirements to:

- applicability/scope
- implementation/control
- verification method
- evidence/test/reference

The purpose is traceable verification rather than a marketing checklist.

---

# 424. ASVS Profile Follows the Accepted Risk-Based Policy

The previously accepted policy remains authoritative:

- applicable ASVS Level 1 requirements form the minimum verification floor
- selected Level 2 controls are applied where system risk justifies them
- the project does not claim blanket ASVS Level 2 compliance without requirement-level verification across the declared scope

Testing evidence should support this policy explicitly.

---

# 425. Dependency Vulnerability Scanning

The npm dependency graph/lockfile is subject to Software Composition Analysis or equivalent vulnerability checks.

Findings are triaged by factors such as:

- severity
- whether the vulnerable code is reachable/relevant
- Production exposure
- available fix
- compensating mitigation

A known release-relevant critical/high issue without an accepted mitigation may block release; not every scanner finding automatically becomes an architectural decision.

---

# 426. Secret Detection Is Merge-Blocking

Committed secrets such as database passwords, session secrets, API keys, private keys, or equivalent credentials are treated as serious security failures.

Detection should block merge/release as appropriate, and any secret that reached repository history must be considered exposed and rotated even if the latest commit deletes it.

`.env` examples may document variable names but never contain real Production values.

---

# 427. Static Security Analysis Is Advisory Until Triaged

SAST/static security tooling may be used to identify risky patterns, but raw scanner warnings are not blindly converted into release failures without review.

Findings are evaluated for:

- validity/false positive
- reachability
- severity
- current controls
- remediation/accepted mitigation

Automation supports security judgment; it does not replace it.

---

# 428. System-Specific Security Regression Tests

Security controls unique to this application receive direct regression tests, including representative checks that:

- Editor cannot publish
- Module Scope is enforced server-side
- Hidden/Internal content cannot be fetched publicly
- revoked/disabled users lose protected access
- invalid CSRF state-changing requests fail
- private files remain inaccessible through guessed/direct URLs
- Public/Admin response DTOs do not expose prohibited fields

These controls are too application-specific to delegate solely to generic scanners.

---

# 429. Authentication and Session Security Tests

Representative tests cover accepted authentication/session controls, including:

- generic enumeration-resistant authentication failures
- disabled/inactive account behavior
- session expiration/revocation
- MFA requirement for Publisher/Admin
- state-changing CSRF protection
- representative rate-limit behavior
- session regeneration on authentication as designed
- permission change/demotion taking effect on subsequent protected requests

Testing must not perform unsafe brute-force activity against Production.

---

# 430. File Delivery and Upload Security Regression Tests

Media/Document tests preserve security rules such as:

- allowlist and detected-content validation
- user filename not controlling physical storage paths
- traversal-like inputs rejected/neutralized
- unsupported SVG/archive upload rejection
- request/file/dimension limits
- non-public lifecycle resources denied publicly
- verified safe Content-Type/Content-Disposition behavior
- `nosniff`/security-header expectations where applicable

---

# 431. Backup and Restore Verification Is an Operational Quality Gate

Restore drills are not run on every Pull Request, but verified recovery is mandatory before Go-live and after material backup/storage/recovery architecture changes.

A backup remains unproven until an isolated restore demonstrates that the database, original files, required configuration/security material, permissions, and critical application flows can be reconstructed.

---

# 432. Test Data Is Synthetic by Default

Development/CI test fixtures are:

- synthetic
- deterministic
- minimal
- purpose-built for the scenario

Production personal/operational data is not the default test dataset.

Production-derived troubleshooting data requires explicit sanitization/minimization before use outside Production.

---

# 433. Test Isolation and Determinism

Integration/E2E tests should begin from a known state and avoid hidden ordering dependencies.

Tests must not require:

```text
Test B succeeds only because Test A happened first
```

Database/reset/transaction/fixture strategies may differ by layer, but the observable suite should remain repeatable and suitable for CI.

---

# 434. Flaky Tests Are Defects

Retries may be used temporarily for diagnosis or environmental stabilization, but they are not the permanent solution to deterministic flakiness.

The preferred response is:

```text
Flaky test
→ investigate cause
→ fix test/application/environment
→ temporary quarantine only when necessary and visible
```

Unlimited retry-until-green behavior is not an accepted quality strategy.

---

# 435. End-to-End Selector Policy

Playwright selectors should prefer stable user-facing/accessibility semantics such as role, label, and meaningful text where that represents the actual interaction contract.

Dedicated test IDs are appropriate when no stable semantic selector exists.

Tests should avoid brittle selectors tied unnecessarily to DOM structure, generated CSS classes, or presentation-only implementation details.

---

# 436. Visual Regression Is Targeted

Screenshot/visual regression testing is optional and targeted rather than universal.

It may be valuable for:

- critical shared UI primitives
- previously regressed layouts
- key responsive templates

Version 1 does not require pixel snapshots for every page where ordinary copy/content changes would create excessive maintenance noise.

---

# 437. Feature Definition of Done Includes Quality Behavior

A feature is not considered complete merely because its happy path works in one developer browser.

Definition of Done includes, as applicable:

- implementation
- appropriate automated tests
- authorization/security behavior
- validation/error states
- accessibility considerations
- migration/configuration implications
- operational/documentation changes where required

---

# 438. Merge Gates and Release Gates Are Intentionally Different

Developer feedback and Production assurance have different cost/latency needs.

Conceptually:

```text
Merge Gates
→ fast, deterministic, frequent

Release Gates
→ broader, slower, higher-confidence
```

This separation prevents every small edit from running the entire release-verification universe while still requiring deep checks before Production.

---

# 439. Manual Verification Remains Part of Release Readiness

Automation does not prove every requirement.

Before major release/Go-live and where changes justify it, human review covers representative concerns such as:

- CMS workflow usability
- Thai content rendering
- mobile usability
- keyboard/accessibility behavior
- permission scenarios
- file/document behavior
- security review
- recovery/runbook execution

Green automation is evidence, not absolute proof of system correctness.

---

# 440. Accepted Testing, Quality Gates & Security Verification Strategy

The following decisions are **Accepted** for the Version 1 System Blueprint:

- testing is risk/invariant-driven rather than based on arbitrary test counts or global coverage percentage.
- Vitest is the preferred Domain/Application/unit/integration baseline, Fastify `inject()` is preferred for in-process HTTP integration where appropriate, and Playwright is the primary critical-journey browser/E2E framework.
- database-sensitive behavior uses a real MySQL-compatible engine and aligns with the verified Production engine family once known.
- migrations, transaction atomicity, optimistic concurrency, Document supersession, Scheduled Publication idempotency, Search failure isolation, and authorization/Module Scope are first-class regression targets.
- Public/Admin transport tests verify runtime schemas, standardized errors, HTTP semantics, concurrency, authorization and explicit DTO field allowlists.
- critical E2E uses Playwright; full Chromium/Firefox/WebKit execution is primarily a release/scheduled gate rather than mandatory for every edit.
- accessibility combines automation with targeted keyboard/manual verification; responsive/mobile/Thai rendering remain explicit review concerns.
- SSR/SEO tests inspect actual server HTML/status/redirect/canonical/noindex/sitemap behavior before hydration.
- Media tests verify type/content/size/path/privacy controls plus canonical-original preservation and responsive WebP derivative behavior.
- Pull Request gates emphasize fast deterministic typecheck/lint/architecture/unit/core integration/build/secret/security checks, while Release Candidate gates add deeper migrations/E2E/concurrency/accessibility/SSR/SEO/Media/security/staging verification.
- OWASP ASVS 5 is tracked through an applicability/implementation/verification/evidence matrix under the already accepted risk-based L1 + selected-L2 policy, without unsupported blanket compliance claims.
- dependency/SAST findings are triaged by relevance/severity/reachability/mitigation; committed secrets are merge-blocking and exposed credentials are rotated.
- application-specific security controls receive direct regression tests rather than relying only on generic scanners.
- backup/restore drills remain an operational release-readiness requirement rather than a per-PR test.
- synthetic deterministic data is the testing default; Production-derived data requires sanitization/minimization.
- flaky tests are investigated rather than permanently hidden behind retries; visual regression remains targeted.
- Merge and Release gates intentionally differ in depth/cost, and manual workflow/accessibility/security/recovery verification remains necessary where automation cannot establish correctness.

---

# 441. Next Discussion Topic

> **System Blueprint Final Consistency Review**

No new architecture topic should be added by default before this review.

The next phase should compare the entire `10-system-blueprint.md` against Frozen `00–08` and verify at least:

- no contradiction with Frozen Product/Information Architecture
- every Frozen lifecycle/public-eligibility/permission/search/workflow requirement has a credible technical owner
- no accidental responsibility duplication across Modules, API, Search, Publishing, Media, Scheduler, Audit, or infrastructure
- no framework/hosting/tool choice has silently redefined the Product model
- cross-cutting transaction/security/privacy/error/recovery semantics remain consistent end-to-end
- deferred decisions remain explicitly deferred rather than accidentally treated as requirements
- Version 1 exclusions remain coherent and do not block Frozen requirements
- terminology and canonical identities are consistent throughout the document
- accepted architecture is implementable on the verified Bangmod Expert Hosting constraints without unproven infrastructure assumptions
- remaining gaps are classified as correction, controlled clarification, implementation detail, or future/deferred decision

If the consistency review passes after any necessary corrections, the next step is **Final Review → Freeze `10-system-blueprint.md` as Version 1.0**.

---

# 442. Final Consistency Refinement — Autosave, Recovery & Protected Preview

This refinement closes the Autosave/Recovery/Preview responsibilities intentionally deferred from Frozen `05-admin-cms.md` and `06-roles-permissions.md` without introducing revision branching, collaborative editing, offline authoring, or a second publishing model.

The governing rule is:

> **Canonical Save persists authoritative CMS state; Autosave only protects unfinished authoring work from accidental loss. Recovery data never silently becomes canonical content.**

---

# 443. Canonical, Recovery and Preview State Are Distinct

Version 1 distinguishes three concepts:

- **Canonical State** — the saved Draft/Published/etc. state governed by normal Domain lifecycle and optimistic concurrency.
- **Recovery State** — temporary author-specific working data used only to recover unsaved edits.
- **Preview State** — a temporary read-only rendering of current working/recovery data through the Public rendering system under Admin protection.

Neither Recovery nor Preview changes public lifecycle, Search eligibility, sitemap eligibility, canonical URL state, or publication authority.

---

# 444. Manual Save Is the Authoritative Persistence Action

Only a successful canonical Save converts working authoring data into persisted authoritative CMS state.

The Admin UI must not label a successful Autosave as equivalent to a canonical save. Conceptually:

```text
Canonical Save succeeded
→ “บันทึกแล้ว”

Recovery Autosave succeeded
→ “สำรองการแก้ไขล่าสุดเมื่อ …”
```

UI success for canonical Save is shown only after the authoritative transaction commits successfully.

---

# 445. Autosave Never Mutates Canonical Content Directly

Autosave does not repeatedly `UPDATE` the canonical resource while a user types.

This is especially important for already-Published resources: opening a Published item for authorized working changes and typing into the editor must not alter the currently public content until the user performs the appropriate explicit canonical Save/Publish action.

Autosave therefore writes only to the Recovery mechanism.

---

# 446. Recovery Uses Server-Side Ephemeral SQL Storage

Version 1 stores authoring Recovery server-side in the primary relational database rather than treating browser `localStorage`/IndexedDB as the authoritative recovery mechanism.

This provides:

- centralized expiry/cleanup
- current backend authorization on every request
- recovery across page refresh/browser restart when the same authorized user returns
- no Redis dependency
- no requirement to leave CMS working content indefinitely in browser storage

Recovery storage remains operational/ephemeral rather than a new business content resource.

---

# 447. Recovery Is Not Revision History

Recovery is intentionally **not**:

- revision history
- version branching
- collaborative editing state
- an approval revision package
- a historical timeline of every Autosave

Version 1 keeps only the latest meaningful recovery snapshot required for safe authoring continuity rather than persisting every keystroke interval indefinitely.

---

# 448. Recovery Identity and Minimum Context

The physical schema remains an implementation concern, but a Recovery record must have enough validated context to establish at least:

- CMS User identity
- Module/resource type
- canonical resource identity when one exists
- authoring-session identity for not-yet-created resources
- base canonical version
- recovery version
- allowlisted working payload
- updated timestamp
- expiry timestamp

Recovery identity is internal and is not a Public ID or public route identity.

---

# 449. Base Canonical Version Prevents Stale Recovery Overwrite

Recovery records retain the canonical version from which authoring began.

If:

```text
Recovery.base_version = 7
Current canonical.version = 8
```

then recovery must not silently overwrite Version 8.

The user may inspect/use the recovered information, but Version 1 does not automatically merge it into newer canonical state. Normal canonical optimistic-concurrency rules remain authoritative.

---

# 450. Recovery Has Lightweight Optimistic Concurrency

Recovery itself should use a lightweight recovery version so two tabs/sessions cannot silently overwrite each other's latest recovery snapshot.

Conceptually:

```text
Tab A and Tab B know recovery_version = 4
A autosaves → recovery_version = 5
B autosaves using version 4 → conflict
```

The system reports that another authoring session changed the recovery state rather than applying silent last-write-wins behavior.

Version 1 does not implement CRDT, operational transformation, or automatic three-way merge.

---

# 451. New Unsaved Resources Use an Authoring Session

Opening a “Create” form does not need to create an empty canonical Draft merely to support Autosave.

Before the first canonical Save, the backend may issue an opaque authoring-session identifier and bind Recovery to:

```text
CMS User
+ Module/resource type
+ Authoring Session
```

After the first successful canonical Save creates the real resource, the related temporary Recovery can be resolved/removed.

---

# 452. Autosave Is Dirty-Only, Debounced and Bounded

Autosave runs only when author-editable working data has changed.

It is debounced/bounded rather than fired on every keystroke, and exact timing remains an implementation/usability decision validated against real staff workflow and hosting load.

Browser lifecycle hooks may attempt best-effort recovery writes, but Version 1 does not claim that every last keystroke is guaranteed to survive a browser/process/network crash.

---

# 453. Autosave Failure Does Not Block Authoring

A Recovery write failure does not stop the user from continuing to edit the in-memory form.

The Admin UI should provide a clear but non-disruptive warning that the latest edits have not yet been safely backed up.

Canonical Manual Save remains independent and authoritative; successful canonical Save may succeed even after an earlier Autosave failure.

---

# 454. Offline CMS Authoring Is Not a Version 1 Requirement

Version 1 does not introduce:

- PWA/offline CMS mode
- IndexedDB canonical authoring store
- offline mutation queue
- background synchronization

When connectivity is unavailable, server Recovery and canonical Save cannot be guaranteed until connectivity returns.

---

# 455. Every Recovery Mutation Re-checks Current Authorization

Every Autosave/Recovery mutation is a protected backend request and re-checks current:

- authenticated session
- Active CMS User state
- Role
- Module Scope
- required authoring capability

A permission/session state captured when the editor page was first opened is never treated as durable authorization.

Disabling, demoting, or removing Module Scope therefore affects subsequent Autosave/Recovery requests immediately.

---

# 456. Recovery Authorization Does Not Grant Canonical Authority

Successful Autosave does not imply permission to Save, Publish, Schedule, Approve, Archive, or perform any other public-impact action.

Each canonical command performs its normal current authorization and Domain-state checks independently.

---

# 457. Recovery Payload Is Explicitly Allowlisted and Validated

The backend accepts only author-editable working fields appropriate to the relevant resource/schema.

Recovery does not persist arbitrary serialized frontend/application state and does not contain authentication/session/CSRF/MFA secrets, computed permission state, raw database rows, infrastructure metadata, or binary upload content.

Recovery payloads pass runtime schema validation at the server trust boundary.

---

# 458. Uploaded Files Remain Media/Document Resources

Autosave never embeds uploaded binary bytes or base64 content into Recovery payloads.

Uploads continue through the accepted private staging/file-validation pipeline. Recovery may reference only valid internal Media/Document identifiers that the current user is authorized to use.

Private/staged lifecycle rules remain authoritative.

---

# 459. Canonical Success Resolves Related Recovery

After a successful canonical Save or Publish, the associated obsolete Recovery may be marked resolved or removed.

Recovery is cleared **after** authoritative success, not before it.

If the canonical mutation fails, Recovery remains available so the user does not lose the working data they were trying to save.

---

# 460. Recovery Has Bounded Lifetime

Recovery records include expiry and are not retained indefinitely.

The exact Recovery TTL is an implementation/operations value chosen from real workflow, privacy, storage and usability evidence rather than frozen arbitrarily in this Blueprint.

Expired Recovery is safe ephemeral data and may be removed through periodic maintenance.

---

# 461. Recovery Cleanup Is a Safe Maintenance Responsibility

Background maintenance may delete only expired/explicitly-resolved authoring Recovery records according to the Recovery lifecycle.

This cleanup never deletes canonical Draft/Published resources, permanent Media originals, or business Audit history.

It does not require a distributed queue in Version 1.

---

# 462. Autosave Does Not Generate Business Audit Noise

Routine Autosave events are operational recovery mechanics and do not create one durable Business Audit event per Autosave interval.

Meaningful canonical actions such as Save where audit is required, Publish, Schedule, Archive, permission changes, and other accountable mutations continue to follow the accepted Audit policy.

Suspicious or denied Recovery attempts may still be represented in Security/Operational logs where useful.

---

# 463. Protected Preview Reuses the Public Renderer

Preview uses the same Public rendering components/presentation rules as the real website wherever practical so staff see a faithful representation rather than a separately implemented Admin-only renderer.

Conceptually:

```text
Admin Working/Recovery State
→ Preview Adapter/Application Query
→ Public Rendering Components
→ Protected Preview Response
```

Preview remains a protected presentation mode, not a second content lifecycle.

---

# 464. Preview Does Not Call the Application Through Localhost HTTP

Consistent with the accepted server architecture, server-side Preview uses Application capabilities directly inside the Modular Monolith rather than making unnecessary loopback HTTP calls to the application's own Public API.

Transport APIs remain available for browser navigation where appropriate, but internal SSR/Preview orchestration does not create an artificial network boundary.

---

# 465. Preview May Render Current Unsaved Working State

For an authorized editor, Preview may render the current validated working/recovery state even when it differs from canonical/public state.

Example:

```text
Canonical Published = A
Working authoring state = B

Public Website → A
Protected Preview → B
```

Previewing B never changes A and never publishes B.

---

# 466. Unsaved Recovery Is Author-Specific

Recovery belongs to the current authorized authoring user/session and is not treated as a shared collaborative Draft for other staff.

Shared organizational work begins from canonical saved state according to the normal Draft/approval/publishing rules.

Version 1 does not implement live multi-user unsaved editing.

---

# 467. Preview Is Authenticated and Non-shareable by Default

Protected Preview requires current CMS authentication, Active User state, appropriate Role/Module Scope, and access to the relevant resource.

Version 1 does not create anonymous/shareable public Preview tokens or secret URLs for users without CMS access.

If a future workflow requires external/unauthenticated reviewers, that requires a separate security/product decision.

---

# 468. Preview Re-checks Current Authorization

Every Preview request re-evaluates current authorization at the backend.

A user who is disabled, demoted, logged out, has their session revoked, or loses relevant Module Scope cannot continue viewing protected Preview merely because a browser tab was already open.

---

# 469. Preview Is Non-public by Cache, Search and SEO Policy

Protected Preview responses use private/non-cacheable behavior, conceptually including:

```text
Cache-Control: no-store
robots: noindex, nofollow
```

Preview URLs/data are excluded from:

- Public Search
- `sitemap.xml`
- canonical public URL generation
- public navigation

`noindex` is only an SEO safeguard; authentication/authorization remains the real security boundary.

---

# 470. Preview Does Not Publicize Private Media or Cause Side Effects

Draft/staged/private Media needed for Preview is delivered only through authenticated lifecycle-aware access. It is not changed to Public merely to make Preview work.

Preview is read-only with respect to business lifecycle: it does not Publish, Schedule, Approve, Archive, change canonical state, or create routine Business Audit events.

Preview rendering failure never mutates or rolls back valid canonical content.

---

# 471. Accepted Autosave, Recovery & Protected Preview Architecture

The following Final Consistency Refinement decisions are **Accepted** for Version 1:

- canonical Save, ephemeral Recovery, and protected Preview are separate concepts with separate responsibilities.
- Manual Save remains the authoritative persistence action; Autosave never silently writes working edits into canonical Draft/Published state.
- Recovery uses server-side ephemeral SQL storage and remains distinct from revision history, collaborative authoring, approval revisions, or offline CMS data.
- Recovery retains current user/target or authoring-session context, base canonical version, lightweight recovery version, validated allowlisted working payload, timestamps and expiry.
- base-version comparison prevents stale Recovery from silently overwriting newer canonical content; recovery concurrency prevents silent same-user multi-tab last-write-wins behavior.
- new not-yet-saved resources may use opaque authoring-session identity instead of creating abandoned empty canonical records solely for Autosave.
- Autosave is dirty-only, debounced and bounded; exact timing/TTL remains an evidence-based implementation value.
- Autosave failure does not block editing, and Version 1 does not require offline/PWA authoring.
- Autosave, Restore, Preview and canonical commands always re-check current session/User/Role/Module Scope/capability at the backend; prior page-load authorization is never sufficient.
- Recovery stores only allowlisted validated authoring data and references staged Media/Documents by internal identity rather than embedding file bytes.
- successful canonical Save/Publish resolves related Recovery only after authoritative success; failed canonical mutations preserve Recovery.
- expired Recovery is removed through safe periodic maintenance and routine Autosave does not generate Business Audit spam.
- Protected Preview reuses Public rendering components through direct in-process Application capabilities and may render current unsaved working state without changing canonical/public state.
- unsaved Recovery is author-specific; Version 1 does not provide collaborative unsaved editing or automatic merge.
- Preview is authenticated/current-permission-aware, `no-store`, `noindex`, excluded from Public Search/sitemap/canonical routing and has no anonymous/shareable token baseline.
- private/staged Media remains private during Preview and is delivered through authenticated lifecycle-aware access.
- Preview is read-only with respect to lifecycle/business mutation and preview failure never changes valid canonical content.

---

# 472. Next Final Consistency Refinement

> **Rich Text, XSS & Controlled Embed Architecture**

The next refinement should close the authoring/rendering security boundary deferred from Frozen Admin/Search requirements, including:

- canonical rich-text representation versus arbitrary HTML
- backend schema/allowlist validation
- safe Public rendering without trusting editor markup
- paste sanitization from Word/Google Docs
- safe link protocols and URL handling
- Media/Document references inside rich content
- tables/headings/lists/quotes within the allowed editor vocabulary
- controlled external embeds only when explicitly supported
- Search snippets/highlights derived from sanitized public text rather than raw editor markup
- keeping the editor library itself replaceable rather than freezing a vendor/framework prematurely

---
# 473. Rich Text Security Purpose

Rich Text is treated as a security-sensitive authoring boundary because CMS-authored content is persisted and later rendered to many anonymous Public users. Version 1 therefore treats author content as untrusted input even when the author is an authenticated CMS User.

The architecture follows the principle:

> **Rich Text is structured content, not trusted HTML.**

Security has priority over author-controlled presentation flexibility. The system may remain simple for staff while enforcing strict structure, validation and safe rendering behind the editor.

---

# 474. Canonical Rich Text Is Structured Data, Not Arbitrary HTML

Canonical Rich Text is stored as a structured, versioned document representation rather than an unrestricted HTML string.

Conceptually:

```text
CMS Editor
    ↓
Structured Document
    ↓
Runtime Validation
    ↓
Canonical Rich Text Data
    ↓
Controlled React Renderer
```

The exact database column/layout may be chosen during implementation, but arbitrary author-supplied HTML is not the canonical authoring contract.

---

# 475. Allowlisted Rich Text Vocabulary

The Version 1 authoring vocabulary is allowlist-based and follows the Frozen Admin requirements. Supported semantics may include:

- Paragraph
- approved Heading levels
- Bold / Italic
- Ordered / Unordered List
- Link
- Quote
- Table
- Media Reference
- Document Reference

Unknown or unsupported node/mark types are rejected rather than interpreted generically.

---

# 476. Backend Rich Text Validation Is Authoritative

The browser editor constrains normal authoring UX, but the backend remains authoritative.

Every canonical Rich Text write validates at least:

- allowed node and mark types
- allowed nesting/structure
- bounded payload size
- bounded node count/depth where relevant
- safe URLs/protocols
- valid referenced Media/Document identities
- context-specific restrictions such as allowed heading levels

Frontend editor controls are usability controls, not the security boundary.

---

# 477. Author-defined HTML, CSS, JavaScript and DOM Attributes Are Not Supported

Normal CMS authors, including Administrator users acting through the CMS, cannot supply executable/presentation primitives such as:

- raw HTML blocks
- `<script>`
- arbitrary `<iframe>`
- arbitrary CSS or inline styles
- custom classes/IDs/data attributes
- arbitrary event-handler attributes
- executable browser code

Administrator privilege does not convert untrusted author content into trusted application code.

---

# 478. Controlled Rendering Instead of Raw HTML Injection

Public and Preview Rich Text is rendered through a controlled React renderer that maps approved structured nodes to application-owned components.

Plain text remains text and is rendered through normal React text rendering/escaping semantics.

`dangerouslySetInnerHTML` is not the normal Rich Text rendering path for canonical Version 1 content.

Any future compatibility boundary that must process legacy HTML is isolated, explicitly sanitized/migrated, tested and never treated as a reason to weaken the new canonical content model.

---

# 479. Paste from Word, Google Docs and External Sources

Rich clipboard content is treated as untrusted input.

The editor may parse/sanitize/normalize clipboard HTML to preserve supported semantics such as paragraphs, lists, emphasis, tables and links while removing unsupported presentation or executable markup.

The original clipboard HTML is discarded after conversion to the allowlisted structured document. Backend validation still applies to the final submitted document.

---

# 480. Link Representation and Protocol Safety

Links are represented as structured marks/nodes and validated before canonical save.

Normal external links support approved web protocols such as `https:` and, where justified, `http:`. Dangerous or unsupported schemes such as `javascript:`, `vbscript:` and `file:` are rejected. General author-controlled `data:` URLs are not a Version 1 link baseline.

URL validation is context-aware rather than relying only on string escaping.

---

# 481. Internal CMS Resource References Are Preferred When Appropriate

When authors select canonical CMS resources such as News, Service, Document or other supported internal destinations, the system should prefer stable internal resource references rather than hard-coded public URLs where practical.

Canonical URL generation remains centralized in the Public Routing layer, so a title/slug change does not break identity relationships.

Validated ordinary URLs remain available where a resource reference does not fit the use case.

---

# 482. Media and Document References Use Canonical Resource Identity

Rich content references Media and Documents through canonical resource identity rather than embedding physical filesystem paths or raw upload URLs.

Media rendering continues through the accepted lifecycle-aware Media capability and responsive WebP delivery strategy. Document references continue to resolve to the canonical Document/public destination when eligible.

---

# 483. Parent Content Never Elevates Referenced Child Visibility

A Published parent resource does not make a referenced child Public.

For example, Published News referencing Hidden/private Media does not elevate that Media. The Public renderer re-checks current child eligibility and uses a safe component-specific unavailable/fallback behavior where necessary.

This preserves the Frozen rule that parent publication never elevates child lifecycle or permissions.

---

# 484. Heading Semantics Are Context-controlled

Rich Text headings express information hierarchy rather than arbitrary visual size.

The page template owns the primary page heading. Rich content may therefore restrict author-selectable heading levels by context so content does not introduce duplicate/inappropriate top-level headings merely for visual styling.

Exact allowed levels are implemented per template/editor context without making visual font-size controls part of canonical content.

---

# 485. Tables Are Structured Semantic Content

Tables, when enabled for a content type, use structured row/header/data-cell semantics rather than arbitrary HTML table attributes.

The application renderer owns responsive/accessibility presentation. Table size/complexity is bounded to protect editor/server/browser resources; exact numeric limits are implementation values based on representative content and testing.

---

# 486. Rich Text Resource Bounds

Structured content remains untrusted even without raw HTML. Backend limits protect against pathological payloads such as excessive nesting, huge node counts, extreme tables or oversized serialized content.

Exact byte/node/depth/table limits are evidence-based implementation/configuration values rather than arbitrary architecture constants.

---

# 487. Search Text Is Derived from Public-safe Structured Content

Public Search never builds snippets/highlights from raw editor markup.

Conceptually:

```text
Canonical Structured Rich Text
        ↓
Public-safe Plain Text Projection
        ↓
Search Projection / Snippet Source
```

Private/editor-only fields and unsupported markup never become Search text merely because they exist in an authoring payload.

---

# 488. SSR, Client Navigation and Preview Share the Same Rich Text Renderer

SSR initial rendering, hydrated/client navigation and authenticated Preview reuse the same controlled Rich Text component model where practical.

This reduces rendering/security drift and makes Preview representative of the eventual Public output while retaining the accepted Preview authentication, `no-store`, `noindex` and lifecycle rules.

---

# 489. Arbitrary External Embed Markup Is Not Supported

Authors cannot paste arbitrary third-party embed HTML, scripts or iframes into canonical content.

This applies even to common provider-generated snippets. A provider's copied `<iframe>` or `<script>` code is not trusted merely because it originates from a familiar website.

---

# 490. External Embeds Use Typed Controlled Components

If a real business requirement requires an external embed, Version 1 architecture supports a typed controlled model instead of arbitrary markup.

Conceptually:

```text
Approved Embed Type
├── Provider
├── Validated Resource ID / Canonical Source URL
└── Approved Safe Presentation Metadata
```

The application-owned renderer constructs the embed destination/HTML behavior from reviewed policy rather than storing author-supplied iframe markup.

---

# 491. No Third-party Embed Provider Is a Mandatory Version 1 Dependency

The architecture supports controlled embeds, but no provider is enabled merely because embedding may be useful someday.

If no approved use case exists, Version 1 may enable zero embedded providers and use ordinary external links instead.

This preserves the project's **Simple — Structured — Sustainable** principle and reduces unnecessary security/privacy/CSP surface.

---

# 492. Embed Provider Policy Is Code/Reviewed Configuration, Not Arbitrary CMS Settings

Supported embed providers and their constraints are controlled by reviewed application configuration/code rather than an unrestricted CMS field where staff can add arbitrary iframe domains.

Adding a provider is therefore an engineering/security decision, not a normal editorial setting.

---

# 493. Controlled Embed URLs Are Constructed by the Application

For an approved provider, the system parses/validates the provider-specific resource identity and constructs the final embed URL itself.

It does not simply accept an arbitrary author-supplied iframe `src` because the author selected a trusted provider label.

---

# 494. Embedded Browsing Contexts Use Least-privilege Browser Controls

When an approved provider requires an iframe, the renderer applies provider-appropriate least-privilege controls such as:

- HTTPS-only known source
- appropriate `sandbox` restrictions where compatible
- controlled `referrerPolicy`
- controlled feature/permission policy
- suitable lazy loading where appropriate

Exact iframe capabilities are reviewed per provider rather than granting broad permissions globally.

---

# 495. CSP Restricts Embedded Sources

The accepted Content Security Policy architecture is extended so enabled embed providers are reflected in the appropriate explicit CSP directives, including `frame-src` where an iframe source is required.

`frame-src` (what this site may embed) is not confused with `frame-ancestors` (who may embed this site).

Broad wildcard CSP exceptions are not introduced merely to make a third-party embed work quickly.

---

# 496. Enabling an Embed Provider Requires Cross-cutting Review

A new external embed provider is enabled only after review of:

- Security and XSS/browser isolation
- CSP changes
- Privacy/PDPA and cookie/tracking impact
- Accessibility
- availability/fallback behavior
- performance impact

Editorial convenience alone is insufficient to bypass these controls.

---

# 497. External Embeds Are Progressive Enhancements

Primary public information must not depend exclusively on a third-party embed.

Where meaningful, the page provides a safe fallback such as descriptive content and/or an external source link when the provider is unavailable, blocked by privacy settings, fails CSP or otherwise cannot load.

---

# 498. SEO Structured Data Comes from Canonical Resource Fields

SEO structured data such as Organization, Article/NewsArticle and Breadcrumb metadata is produced from canonical typed resource fields rather than by scraping/parsing arbitrary Rich Text markup.

Rich Text remains page content; SEO metadata remains explicit application-controlled output.

---

# 499. Rich Text Schema Is Versioned for Format Evolution

The structured Rich Text representation has an internal format/schema version so future node-model evolution can be handled deliberately.

Schema versioning is a serialization compatibility concern and does **not** create content revision history, branching or collaborative editing.

---

# 500. Unknown Rich Text Types Fail Safely

Canonical writes containing unknown node/mark types are rejected.

If a runtime encounters canonical structured content from a newer/unsupported schema, the renderer fails safely according to controlled compatibility behavior and records an operational problem; it never interprets unknown data as raw executable markup.

---

# 501. WordPress/Legacy HTML Migration Remains an Isolated Future Boundary

When Migration Plan work resumes from actual WordPress evidence, legacy HTML may require a migration-specific pipeline:

```text
Legacy HTML
    ↓
Migration Parser / Sanitizer
    ↓
Structured Rich Text Mapper
    ↓
Canonical Validation
```

Legacy compatibility does not weaken the normal authoring schema. Content that cannot be mapped safely is flagged for explicit remediation rather than silently accepted as unrestricted HTML.

---

# 502. Rich Text Security Testing Requirements

Testing must include stored-XSS and malformed-content regression cases such as:

- unsupported/raw HTML/script nodes rejected
- dangerous URL schemes rejected
- plain `<script>` text rendered as text
- malicious pasted markup normalized safely
- unsupported embed/provider rejected
- private/Hidden referenced resources not exposed publicly
- unknown structured nodes fail safely
- CSP/controlled embed behavior verified when a provider is enabled

These tests complement applicable OWASP ASVS 5 verification requirements rather than relying only on generic security scanners.

---

# 503. Rich Text Editor Library Remains Replaceable

Version 1 does not freeze TipTap, ProseMirror, Lexical, Slate, Editor.js or another specific editor library at architecture level.

The implementation choice must satisfy the frozen contract:

- structured deterministic document model
- constrained nodes/marks
- paste normalization
- React/Admin integration
- usable and accessible authoring behavior
- maintainable ecosystem
- ability to enforce the backend security model

Library selection is an implementation/prototyping decision, not a Product architecture dependency.

---

# 504. Security Takes Priority Over Rich Text Flexibility

Where rich-authoring convenience conflicts with a meaningful security boundary, Version 1 chooses the safer controlled model unless a reviewed business requirement justifies the added capability.

This does not mean maximizing complexity: the preferred security design is the simplest enforceable model that prevents unsafe author-controlled executable content and can be verified through tests and OWASP-aligned review.

---

# 505. Accepted Rich Text, XSS & Controlled Embed Architecture

The following Final Consistency Refinement decisions are **Accepted** for Version 1:

- canonical Rich Text is structured, versioned, allowlisted content rather than arbitrary author-controlled HTML.
- backend runtime validation is authoritative for node/mark types, nesting, bounds, URLs and resource references; editor UI constraints are not the security boundary.
- normal authors cannot inject custom HTML/CSS/JavaScript, arbitrary DOM attributes, event handlers, raw scripts or arbitrary iframes, including when the author has CMS Administrator privileges.
- normal Public/Preview rendering uses a controlled React renderer and does not require `dangerouslySetInnerHTML` for canonical Rich Text.
- paste from Word/Google Docs/web sources is treated as untrusted, normalized/sanitized at the input boundary and converted to the approved structured schema; source HTML is not retained as the canonical contract.
- links use context-aware protocol validation; dangerous executable schemes are rejected.
- canonical CMS resources, Media and Documents use stable references where appropriate; parent publication never elevates child visibility/lifecycle.
- headings/tables remain semantic and application-rendered, while payload complexity is bounded with exact limits determined from evidence.
- Search snippets/text are derived from public-safe structured/plain-text projections, never raw editor markup.
- SSR, client navigation and protected Preview reuse the controlled rendering model to reduce security/rendering drift.
- arbitrary third-party embed markup is unsupported; real embed needs use typed controlled provider components whose final URLs/browser behavior are generated by the application.
- no third-party embed provider is a mandatory Version 1 dependency; provider enablement requires reviewed Security/CSP/Privacy-Cookie/Accessibility/performance/fallback impact.
- supported provider policy is code/reviewed configuration, not unrestricted CMS domain-entry settings; CSP and iframe permissions remain least-privilege.
- Rich Text schema versioning supports format evolution but does not introduce Revision History; unknown content fails safely.
- future WordPress HTML migration remains an isolated parser/sanitizer/mapper boundary and cannot weaken the normal new-system schema.
- stored-XSS/content-validation regression tests and applicable OWASP ASVS 5 verification evidence are mandatory security quality checks.
- the Rich Text editor vendor/library remains replaceable and is selected later against this security/data-contract baseline.
- when authoring flexibility conflicts with a meaningful security control, the safer verified design takes precedence while still avoiding unnecessary infrastructure or architecture complexity.

---

# 506. Next Final Consistency Refinement

> **Identity, Administrator Safety & Authorization Edge Cases**

The next refinement should close the remaining identity/administrator protections deferred from Frozen Roles/Security requirements, including:

- one Active CMS User per authenticated login identity
- normalized unique login identity
- self-role/self-scope/self-disable restrictions
- last-Active-Administrator protection under concurrency
- no hidden permanent Super Administrator
- controlled break-glass/infrastructure recovery procedure
- current authorization re-check before upload finalization and other long-running operations
- preserving current Role/Scope revocation behavior across sessions and in-progress workflows

---

# 507. Identity and Administrator Safety Refinement Purpose

This refinement closes security-critical identity and authorization edge cases deferred from the Frozen Roles & Permissions and accepted Security Architecture.

Its objective is not to create a larger identity platform. It is to make the existing local CMS identity model precise enough that account ambiguity, privilege self-modification, administrator lockout, stale authorization and recovery paths cannot silently weaken the accepted security model.

> **Authentication establishes identity. Authorization must still evaluate the actor's current authority for the specific operation, resource and state at the authoritative boundary.**

---

# 508. Version 1 Uses One Canonical Login Identity per CMS User

Version 1 uses one canonical username as the primary local CMS authentication identity.

Conceptually:

```text
Entered Username
      ↓
Deterministic Normalization
      ↓
Canonical Login Name
      ↓
Exactly One CMS User
```

A single authenticated login identity must never resolve unintentionally to multiple Active CMS Users.

---

# 509. CMS Login Identity Remains Separate from Personnel and Display Identity

The following concepts remain distinct:

```text
CMS Username   → authentication identity
CMS User ID    → stable relational/security identity
Display Name   → human-readable Admin/Audit label
Personnel      → public organizational/personnel content
```

Changing a Personnel record or display label never silently changes authentication identity.

The accepted rule **Personnel ≠ CMS User** remains authoritative.

---

# 510. Email Is Not an Implicit Login Alias in Version 1

Email may be used for profile, recovery or notification purposes according to later operational policy, but Version 1 does not automatically create a second authentication namespace where either username or email can identify the account.

This keeps identity uniqueness, Audit attribution and account-recovery reasoning simple. Email-based login or federated identity may be added only through an explicit identity-mapping design.

---

# 511. Username Normalization Is Deterministic and Security-oriented

Username normalization uses one documented deterministic rule before uniqueness checks and authentication lookup.

The exact allowed character set is an implementation decision, but normalization must prevent visually/case-equivalent local identities from bypassing uniqueness rules.

Application validation provides user-friendly feedback; the canonical normalized representation is the value protected by persistence constraints.

---

# 512. Database Uniqueness Is the Final Local Identity Guard

The canonical login identity is protected by a database `UNIQUE` constraint rather than application-level "check then insert" logic alone.

This prevents concurrent provisioning requests from creating duplicate normalized identities.

Username is still not used as a foreign-key identity; stable internal `user_id` remains the relational reference.

---

# 513. Authentication Failure Messages Remain Enumeration-resistant

Login and recovery responses do not reveal whether a username exists, whether only a password was incorrect, or whether another internal identity state caused the failure when such detail would assist account enumeration.

Detailed causes belong only in protected operational/security evidence where appropriate.

---

# 514. Shared or Reusable Default Passwords Are Prohibited

New CMS accounts are never provisioned with a common reusable default password.

Provisioning uses a controlled account-setup mechanism so the credential established for one user is not a standing credential known to administrators or reused across accounts.

Plaintext passwords are never stored or recoverable by administrators.

---

# 515. New Accounts Use Controlled One-time Setup

Conceptually:

```text
Administrator creates account
        ↓
Account pending secure setup
        ↓
Short-lived one-time setup mechanism
        ↓
User establishes credential
        ↓
Required MFA enrollment
        ↓
Account ready for permitted access
```

The exact delivery channel is an implementation/operations decision and is not frozen before the deployment environment and communications requirements are known.

---

# 516. Setup, Reset and Recovery Credentials Are Short-lived and Single-use

Account-setup, password-reset and similar recovery credentials are high-entropy, short-lived and single-use.

They are stored/protected so disclosure of ordinary application data does not expose reusable recovery secrets. Successful use invalidates the credential immediately.

Security recovery must never become an authentication path weaker than the account policy it is recovering.

---

# 517. Privileged Roles Retain Mandatory MFA

The accepted baseline remains:

```text
Viewer         → MFA supported
Editor         → MFA supported
Publisher      → MFA required
Administrator  → MFA required
```

Role assignment does not weaken this policy.

---

# 518. Privileged Capabilities Stay Blocked Until Required MFA Is Ready

If an account is assigned a Role that requires MFA but enrollment is incomplete, privileged capabilities remain unavailable.

The user may access only the secure steps necessary to complete required security setup and other explicitly safe account functions.

There is no temporary "Administrator without MFA until later" window.

---

# 519. Role, Scope, Disable and Session Changes Take Effect on Subsequent Protected Requests

The backend uses current account security state as authoritative.

An existing browser session does not preserve obsolete Publisher/Administrator authority after demotion, Module Scope removal, account Disable, session revocation or equivalent security change.

Frontend state may improve UX but cannot extend revoked authority.

---

# 520. Normal CMS Administration Prohibits Self Role/Scope/Disable Mutation

Through normal CMS user administration, an Administrator cannot:

- change their own CMS Role
- change their own Module Scope
- Disable their own account

These restrictions are backend invariants, not merely disabled form controls.

They reduce accidental lockout and self-modification ambiguity while preserving clear multi-administrator accountability.

---

# 521. Safe Self-service Security Actions Remain Available

Users may perform appropriate self-service security actions such as:

- changing their own password through the secure flow
- enrolling/resetting their own MFA where policy permits
- regenerating recovery codes
- revoking/logging out other sessions
- updating explicitly safe profile fields

Sensitive actions may require re-authentication according to the accepted authentication/session policy.

---

# 522. At Least One Active Administrator Is a System Invariant

The system must preserve:

```text
Active Administrator Count >= 1
```

A mutation that would leave zero Active Administrators is invalid.

This applies to both Role demotion and account Disable.

---

# 523. Last-administrator Protection Is Transaction-safe

Last-Administrator validation occurs within an appropriate short transaction/locking strategy so concurrent administrator mutations cannot both observe a safe pre-state and commit a zero-administrator result.

The backend re-checks the invariant at the authoritative mutation boundary.

Client-side warnings are UX only.

---

# 524. Promotion to Privileged Roles Must Satisfy Security Readiness

Promotion to Publisher or Administrator is not sufficient by itself to grant usable privileged access.

The account must satisfy the relevant security setup, including the required MFA policy, before protected privileged capabilities succeed.

Exact enrollment UX may differ, but the invariant is fixed: **no privileged access without required security factors.**

---

# 525. There Is No Permanent Hidden Super Administrator

Version 1 does not create an undocumented `superadmin`, developer password, universal bypass account, MFA-bypass identity or other standing hidden privilege tier.

Administrator remains the highest normal CMS Role and remains subject to system invariants.

---

# 526. Break-glass Access Is a Controlled Recovery Procedure, Not a Standing Account

Emergency recovery for cases such as all administrators losing access uses a narrowly scoped infrastructure-controlled recovery procedure/CLI capability.

It is not exposed as a public HTTP endpoint and requires legitimate infrastructure access outside ordinary CMS authorization.

---

# 527. Break-glass Capability Is Narrow, Auditable and Secret-safe

Break-glass tooling is limited to the minimum recovery operations needed to restore legitimate administrative access, such as controlled Administrator recovery or MFA reset.

It does not become a general-purpose domain bypass for publishing, deleting or editing arbitrary business content.

Recovery creates appropriate Security/Operational/Audit evidence without logging passwords, reset secrets, MFA seeds or recovery codes.

---

# 528. MFA Recovery Is Targeted Rather Than Globally Disabled

A problem affecting one privileged user never justifies disabling MFA for all privileged accounts.

Administrative recovery targets the affected identity and forces secure re-enrollment where appropriate.

Administrators cannot view another user's existing MFA secret; they may only invoke approved reset/recovery actions.

---

# 529. Long-running and Staged Operations Re-check Authorization Before Canonical Finalization

Authorization at operation start does not guarantee authorization at commit time.

For uploads and other staged/long-running work:

```text
Initial authorization
      ↓
Private/staged processing
      ↓
Finalization boundary
      ↓
Re-check current session/account/Role/Scope/capability/resource state
      ↓
Commit OR deny + cleanup
```

Permission revocation during processing therefore takes effect before the authoritative mutation.

---

# 530. Current-authorization Re-check Applies Beyond File Uploads

The same principle applies wherever work may outlive the authorization decision that started it, including:

- protected Preview and Recovery operations
- future batch/import operations
- delayed administrative completion steps
- other staged processing

Authorization is evaluated at the authoritative mutation/access boundary rather than cached indefinitely from UI initiation.

---

# 531. Committed Scheduled Publication Is the Deliberate Exception

A valid Schedule that was already committed by an authorized Publisher remains valid after that human is later demoted or disabled, as accepted in Frozen Roles/Publishing Workflow.

At execution time the System actor re-checks current canonical resource state, due time and publication invariants, but does not re-authorize the historical human scheduler's current Role.

This distinction separates **authorization to commit a future business instruction** from an operation that has not yet reached canonical commitment.

---

# 532. Disabling a CMS User Preserves Historical Identity

Account Disable prevents future protected access and revokes/invalidate sessions according to security policy, but does not hard-delete the CMS User merely to remove access.

Historical Audit/workflow references remain attributable to the same stable `user_id` and may present an appropriate "disabled account" label in the Admin UI.

---

# 533. Canonical Local Usernames Are Not Reused

Once a canonical local username has been assigned to an activated account, it remains reserved even if that account is later Disabled.

Reusing the same login identity for a different human would create ambiguous historical security and Audit attribution and is therefore prohibited.

---

# 534. Canonical Username Is Immutable After Activation in Normal CMS Workflow

After account activation and meaningful activity, normal CMS administration does not rename the canonical login identity.

Safe display/profile data may change independently.

Exceptional identity correction, if ever required, is handled through a controlled security procedure with explicit evidence rather than ordinary profile editing.

---

# 535. Stable `user_id` Is the Real Internal Identity

Relationships, authorization context and Audit references use a stable internal CMS User identifier rather than username or display name as the relational identity.

Human-readable labels may be snapshotted/displayed for usability, but do not replace the stable identifier.

---

# 536. Password/MFA Recovery Has Explicit Session Consequences

Password reset, compromise recovery, MFA reset and comparable sensitive identity operations revoke/invalidate sessions as required by security policy so a previously compromised session cannot silently retain privileged access.

MFA reset is treated as a high-risk security event and requires appropriate administrator authority and evidence.

---

# 537. Authorization Uses One Server-side Decision Model

Conceptually, a protected action evaluates:

```text
Authenticated?
    ↓
User Active?
    ↓
Required MFA satisfied?
    ↓
Role capability?
    ↓
Module Scope?
    ↓
Resource/current-state rule?
    ↓
Special invariant?
    ↓
ALLOW / DENY
```

The default is deny when no explicit valid authorization path exists.

---

# 538. Administrator Does Not Bypass Security or Domain Invariants

Administrator authority never bypasses:

- required MFA
- current authorization checks
- last-Administrator protection
- validation/publication readiness
- file/media security controls
- Rich Text/XSS controls
- lifecycle/public-eligibility rules
- optimistic concurrency/transaction invariants
- Audit requirements

Administrator means broad CMS responsibility, not unrestricted execution.

---

# 539. Authorization Failure Responses and Security Logging Follow Existing Boundaries

Public resources whose existence must remain undisclosed continue to use the accepted Not Found/non-public semantics.

Authenticated Admin operations may return an appropriate `403` when that does not reveal protected information.

Repeated or materially suspicious denied operations may create structured Security events, while ordinary single authorization failures do not automatically trigger noisy alerts.

---

# 540. Identity and Administrator Edge Cases Are Mandatory Security Regression Tests

The Quality Strategy must prove representative cases including:

- duplicate normalized username rejected under concurrency
- Disabled username cannot be reused
- Administrator cannot change own Role/Scope or Disable self
- concurrent Administrator changes cannot leave zero Active Administrators
- privileged Role without completed MFA cannot use privileged capability
- demotion/Scope removal takes effect on subsequent protected request
- demotion during upload/staged processing blocks finalization
- Disabled/revoked session loses protected access
- targeted MFA recovery invalidates affected privileged access as policy requires
- break-glass capability is not exposed through normal HTTP routes
- Administrator cannot bypass file/Rich Text/lifecycle/security invariants

These cases map to applicable OWASP ASVS 5 authentication, session, authorization and logging verification evidence.

---

# 541. Accepted Identity, Administrator Safety & Authorization Edge Cases

The following Final Consistency Refinement decisions are **Accepted** for Version 1:

- one normalized canonical local username identifies one CMS User; database uniqueness is the final local identity guard.
- username, CMS User ID, display identity and Personnel remain separate concepts; email is not an implicit second login alias in Version 1.
- activated canonical usernames are not reused and are immutable through normal CMS administration, preserving unambiguous historical attribution.
- account provisioning uses controlled one-time setup/recovery rather than shared default passwords or administrator-known plaintext credentials.
- Publisher and Administrator privileges remain inaccessible until mandatory MFA requirements are satisfied.
- current Active state, MFA policy, Role capability, Module Scope, resource state and special invariants are re-evaluated server-side on protected operations; stale browser/session UI state never extends revoked authority.
- Administrators cannot change their own Role/Scope or Disable themselves through normal CMS administration, while safe self-service credential/MFA/session functions remain available under the accepted re-authentication policy.
- at least one Active Administrator is preserved transactionally under concurrent demotion/disable attempts.
- there is no permanent hidden Super Administrator or standing MFA-bypass identity; emergency access uses a narrow infrastructure-controlled break-glass recovery procedure with security evidence.
- Disabled users retain their stable historical identity/Audit references rather than being hard-deleted merely to remove access.
- staged/long-running operations re-check current authorization immediately before canonical finalization so permission revocation takes effect before commit.
- committed Scheduled Publication remains the intentional exception: later human demotion does not invalidate an already-authorized canonical schedule, while System execution still re-checks current resource/lifecycle conditions.
- Administrator authority never bypasses MFA, validation, file/Rich Text security, lifecycle, concurrency, transaction or Audit invariants.
- identity/administrator edge cases are first-class security regression tests and OWASP ASVS 5 verification evidence.

---

# 542. Next Final Consistency Refinement

> **Google OpenID Connect (OIDC) Authentication Integration**

A new user requirement has been introduced to support Google-based CMS sign-in. Before this is Accepted into the identity architecture, the next refinement must define the secure federation boundary, including:

- Google OIDC (OAuth 2.0-based authentication) rather than treating generic OAuth authorization as identity proof
- whether Google sign-in is an additional authentication method or the primary normal sign-in path
- account linking based on Google's stable subject identifier rather than mutable email alone
- explicit pre-provisioning / no automatic privilege creation
- Google Workspace domain restriction policy if organizational accounts are required
- ID-token issuer/audience/signature/expiry validation and anti-CSRF/state/nonce handling as applicable to the chosen flow
- interaction with the existing server-side session model
- interaction with mandatory Publisher/Administrator MFA policy
- local break-glass/recovery behavior if Google identity is unavailable
- minimal scopes and no Google API access unless a separate authorization requirement exists
- identity unlink/recovery, account disable and Audit implications

After Google OIDC is resolved, the remaining consistency refinements are Privacy/Cookie baseline; Announcement Expiry background processing; Public Search bounds/safe output; and redirect/Unicode URL clarifications.

---

# 543. Google Sign-in Is an OIDC Authentication Integration

Google-based CMS sign-in is implemented as **OpenID Connect (OIDC) authentication on top of OAuth 2.0**, not as generic OAuth authorization being treated as identity proof.

The integration proves an external Google identity and then resolves that identity to the CMS's existing local account/security model.

---

# 544. Google Authentication Does Not Own CMS Authorization

Google may establish who the external user is, but it does not decide CMS authority.

```text
Google OIDC
    ↓
Verified external identity
    ↓
CMS User
    ↓
Active state + MFA policy + Role + Module Scope + resource state
    ↓
Local authorization decision
```

Google account attributes, email domains or provider-side labels never directly create Publisher/Administrator privileges.

---

# 545. Version 1 Uses Explicit Pre-provisioning, Not Self-registration

A successful Google sign-in does **not** automatically create a CMS User.

Version 1 requires an existing/pre-provisioned local CMS account and a controlled identity-linking process. There is no public/JIT self-registration and no automatic privilege assignment from possession of a Google account.

---

# 546. External Identity Uses Provider + Stable Subject

The durable Google identity mapping is conceptually:

```text
provider = google
subject  = Google OIDC sub
        ↓
CMS user_id
```

The provider's stable subject identifier is the external identity key. Email is an attribute, not the relational identity key.

This keeps local Audit/authorization identity stable even if an email address or display name changes later.

---

# 547. Verified Email May Assist Controlled First Linking Only

A verified email may be used to assist an explicitly prepared first-link workflow when the Administrator has already provisioned the expected CMS account.

After the identity is linked, normal authentication resolves through `provider + subject → CMS user_id`; the application does not repeatedly identify the account by email alone.

Email matching never creates a new CMS User or grants Role/Module Scope automatically.

---

# 548. Google Workspace Restriction Is Optional and Explicit

If the organization later requires only managed Google Workspace identities, the integration may enforce an approved hosted-domain/organization policy using the provider claims intended for that purpose.

The exact Workspace domain is **not** frozen until the real organizational Google environment is verified.

A visual email suffix alone is not treated as sufficient organizational authorization.

---

# 549. Local Active State, Role and Module Scope Remain Authoritative

A valid Google account does not reactivate or elevate a CMS account.

```text
Google identity valid
+
CMS User Disabled
→ login denied
```

Likewise, local Role/Module Scope changes immediately govern subsequent protected requests under the already accepted current-state authorization model.

---

# 550. Publisher and Administrator MFA Policy Still Applies

Google OIDC authentication does not automatically satisfy the CMS's privileged MFA requirement.

Version 1 retains:

```text
Google OIDC
    ↓
Resolved CMS User
    ↓
Local CMS MFA when required
    ↓
Privileged server-side session
```

Publisher and Administrator privileges remain inaccessible until the CMS MFA policy is satisfied.

This is a deliberate defense-in-depth boundary and prevents federated sign-in from silently weakening the accepted privileged-access policy.

---

# 551. OIDC Ends in the Existing Local Server-side Session Model

Google tokens are not used as the browser's long-lived CMS session credential.

After successful identity verification and all applicable local security checks, the backend creates the same opaque server-side CMS session already defined by the Security Architecture.

Therefore existing session expiry, revocation, Disable, Role/Scope re-check, CSRF and secure-cookie controls continue to apply identically to local and Google sign-in.

---

# 552. Use a Server-oriented Authorization Code/OIDC Flow

The CMS backend is capable of protecting confidential configuration and maintaining server-side state, so Version 1 uses a server-oriented authorization-code/OIDC flow rather than a client-only token architecture.

The implementation uses a mature, maintained OIDC/OAuth library rather than custom protocol/cryptographic code.

---

# 553. State, Nonce and PKCE Bind the Authentication Flow

The chosen OIDC flow must use the protocol protections appropriate to the flow, including state/transaction binding, nonce validation and PKCE where supported/appropriate by the selected library/provider flow.

These controls belong to the authentication protocol boundary and are not reimplemented ad hoc inside React components.

---

# 554. Google Identity Assertions Are Verified Server-side

The backend verifies the provider response rather than merely decoding a JWT payload.

Verification includes the applicable protocol/provider requirements such as:

- cryptographic signature / trusted signing keys
- issuer
- audience/client identity
- expiry and time validity
- nonce/flow binding where applicable
- required identity claims used by the local linking policy

Failure at this boundary never creates a CMS session.

---

# 555. Google Scopes Follow Least Privilege

For sign-in-only use, the application requests only the identity scopes necessary to authenticate the user, conceptually `openid`, `email` and `profile` where required by the selected Google integration.

Version 1 does not request Gmail, Drive, Calendar or other Google API scopes merely because Google authentication is enabled.

---

# 556. No Long-lived Google API Token Storage Without a Separate Requirement

If Google is used only to establish identity, the CMS does not introduce a requirement to retain long-lived Google access/refresh tokens.

A later requirement to call Google APIs is a distinct OAuth authorization capability and must receive its own Security, Privacy, scope-minimization, token-storage and revocation design review before implementation.

---

# 557. Local Authentication Remains Available in Version 1

Google OIDC is an additional normal authentication method rather than the only possible access path in Version 1.

Local authentication remains available under the same security policy so loss/misconfiguration of the external identity provider does not automatically make the CMS administratively unrecoverable.

The narrow infrastructure-controlled break-glass procedure remains separate from both normal local and Google sign-in.

---

# 558. Multiple Authentication Methods Resolve to One CMS Identity

A local username/password path and a linked Google identity must resolve to the **same stable `CMS user_id`** when they belong to the same person/account.

The system does not create duplicate CMS Users merely because the same person uses two authentication methods.

Role, Module Scope, MFA state, Disable state and Audit attribution remain attached to the one local CMS User identity.

---

# 559. Linking, Unlinking and Relinking Are Security-sensitive Operations

Google identity linking/unlinking/replacement is not an ordinary profile edit.

The operation requires current authorization and appropriate re-authentication/security checks, records accountable evidence, and prevents accidental account lockout.

Before unlinking, the system must ensure that an approved remaining authentication/recovery path exists or require an explicit controlled recovery procedure.

---

# 560. Account Disable and Security Recovery Override Federated Availability

A Disabled CMS User cannot regain access simply because Google authentication succeeds.

MFA reset, identity relinking, account recovery and federated identity changes follow the same sensitive-security-operation principles already defined for local identities, including session consequences and targeted recovery rather than system-wide security relaxation.

---

# 561. OAuth/OIDC Client Configuration Is Environment-specific Secret Configuration

Development, Staging and Production use appropriately separated Google/OIDC client configuration and registered callback/redirect URIs.

Client secrets and other confidential provider configuration remain outside Git and are managed through the accepted environment/secrets architecture.

A Production credential is never copied into source control or treated as a frontend configuration constant.

---

# 562. Version 1 Uses Explicit Sign-in Rather Than One Tap by Default

The CMS baseline uses an explicit **Sign in with Google** action.

Google One Tap or similar ambient sign-in UX is not a Version 1 requirement because the Admin CMS does not need unsolicited third-party identity prompts, additional privacy surface or extra client behavior merely to support federated authentication.

It may be reconsidered only if a demonstrated usability need justifies it.

---

# 563. Google Identity Events Are Auditable Without Logging Tokens

Security-relevant identity events such as linking, unlinking, relinking, failed controlled-link attempts and privileged recovery are recorded through the accepted Audit/Security logging boundaries as appropriate.

The application never intentionally logs authorization codes, ID tokens, access/refresh tokens, client secrets, MFA secrets or other authentication credentials.

---

# 564. Google OIDC Is a Mandatory Security Regression Surface

Testing and ASVS verification must cover at least:

- successful pre-provisioned identity resolution
- unknown/unprovisioned Google identity denied
- invalid issuer/audience/signature/expiry/nonce or equivalent provider validation denied
- duplicate/existing subject mapping conflicts denied safely
- Disabled CMS User denied despite valid Google authentication
- Publisher/Administrator privileged access denied until required local MFA is satisfied
- Role/Module Scope changes applying to federated sessions immediately under current-state authorization
- linking/unlinking/relinking security controls and Audit evidence
- environment callback/configuration failures failing closed
- no Google API scopes/tokens introduced beyond the approved sign-in requirement

---

# 565. Accepted Google OpenID Connect Authentication Integration

The following Final Consistency Refinement decisions are **Accepted** for Version 1:

- Google-based CMS sign-in uses OpenID Connect on OAuth 2.0 as federated authentication, not generic OAuth authorization as identity proof.
- Google proves external identity; local CMS Active state, mandatory MFA policy, Role, Module Scope, resource state and Domain/security invariants remain authoritative for access.
- Version 1 has no Google-driven self-registration/JIT privilege creation; a CMS User must be explicitly pre-provisioned/approved.
- the stable external mapping is `provider + Google subject → CMS user_id`; verified email may assist controlled first linking but is not the durable identity key.
- optional Google Workspace restriction is explicit and verified against the real organizational environment before use; email suffix alone is not authorization.
- Publisher/Administrator privileged access continues to require the CMS MFA policy even after successful Google authentication.
- successful OIDC authentication ends in the existing opaque server-side CMS session model; Google tokens are not used as the browser's CMS session credential.
- the integration uses a maintained server-oriented OIDC/OAuth library with authorization-code flow protections such as state/nonce/PKCE as applicable and performs real server-side identity assertion validation.
- sign-in requests only identity scopes necessary for the approved use case; Google API scopes and long-lived API-token storage require a separate future authorization design review.
- local authentication remains available in Version 1 and both local/Google methods resolve to one stable CMS User/security identity.
- account Disable, Role/Scope changes, recovery and security invariants always override the availability of a valid Google identity.
- linking/unlinking/relinking and identity recovery are security-sensitive, re-authenticated/auditable operations that prevent accidental lockout.
- environment-specific OIDC client configuration/secrets remain outside Git; One Tap is not a Version 1 baseline requirement.
- Google OIDC identity and failure paths are explicit security regression and OWASP ASVS verification evidence.

---

# 566. Next Final Consistency Refinement

> **Privacy, Cookie & Third-party Technology Baseline**

The next refinement will define the Version 1 public privacy/cookie operating baseline, including:

- Privacy Notice, Cookie Policy and Accessibility Statement as required public content
- no behavioral/advertising tracking by default
- distinction between essential CMS/security cookies and optional/non-essential technologies
- why a Cookie Policy does not automatically require a consent-management platform/banner
- review gates before introducing analytics, third-party embeds or technologies that create new browser-side tracking/cookie behavior
- Security + Privacy/PDPA + CSP + Accessibility review for third-party technology
- no analytics/CMP/marketing platform dependency without a demonstrated need

After this refinement, the remaining consistency refinements are Announcement Expiry background processing; Public Search bounds/safe output; and redirect/Unicode URL clarifications.

---
# 567. Privacy-by-Default Objective

Version 1 follows a **Privacy by Default** operating model: collect and retain only data that has a defined service, security, legal, operational or accountability purpose.

The architecture does not introduce behavioral tracking, advertising technology, citizen profiling or third-party analytics merely because such tools are common on public websites.

> **Collect only what the service genuinely needs, protect it according to its sensitivity, and do not manufacture consent complexity for processing that does not exist.**

---

# 568. Anonymous Public Browsing Is Stateless Where Practical

Ordinary anonymous use of the Public Website should not receive an application cookie when the requested feature does not require browser state.

Typical public SSR flows such as reading News, Activities, Health Content, Services, ITA pages and public Documents remain usable without an authenticated account, personalization profile or tracking identifier.

This is an architectural default rather than a claim that browsers, hosting infrastructure or all external destinations never process technical network metadata.

---

# 569. Essential CMS Cookies Are Security Mechanisms, Not Tracking

The authenticated Admin CMS legitimately requires security/session state under the already accepted server-side session architecture.

The CMS session cookie is narrowly scoped, `Secure`, `HttpOnly`, uses an appropriate `SameSite` policy, and exists for authentication/session continuity and security rather than behavioral analytics.

Other short-lived browser state used strictly to bind authentication/security flows may also be treated according to its real purpose rather than being mislabeled as marketing or analytics technology.

---

# 570. Cookie Policy Documents Actual Technology

A Cookie Policy is required in Version 1 even when anonymous public browsing does not use non-essential tracking cookies.

The policy describes the technologies that **actually exist**, their purpose, relevant retention/lifetime characteristics and where they are used. It must not copy generic categories such as advertising, marketing or personalization cookies when the system does not use them.

The public Cookie Policy is therefore a transparency artifact, not evidence that every visitor must be shown a consent banner.

---

# 571. Privacy Notice, Cookie Policy and Accessibility Statement Are Required Public Basic Pages

The following institutional pages remain required Version 1 public content under the Frozen Content Model/Homepage decisions:

- Privacy Notice
- Cookie Policy
- Accessibility Statement

They are managed as canonical public **Basic Pages** through the normal publishing workflow rather than hard-coded solely into source code.

Their canonical placement/route remains stable while authorized staff can maintain the approved content through CMS workflow.

---

# 572. Privacy Notice Must Reflect Real Processing

The Privacy Notice describes the real processing activities implemented by the system, including only those that actually apply, such as:

- CMS administrator account and identity processing
- authentication/security/session operations
- Google OIDC identity processing when enabled
- operational/security logging where applicable
- contact/complaint or other public-submission processing when such features collect personal data
- uploaded or submitted information according to the relevant service workflow

A system change that materially changes personal-data processing triggers a Privacy Notice impact review before Production release.

---

# 573. No Behavioral or Advertising Tracking Baseline

Version 1 does **not** require the following on the Public Website:

- Google Analytics
- Meta Pixel
- advertising pixels
- retargeting
- behavioral profiling
- cross-site tracking
- user fingerprinting
- personalization profiles

A later analytics or measurement capability requires a separately approved purpose and privacy/security review rather than being enabled by default.

---

# 574. Google OIDC Does Not Authorize Broader Google Tracking or API Access

Google OIDC is an approved **CMS authentication dependency** only.

Its existence does not authorize or imply:

- Google Analytics
- Google Ads
- Google API access beyond the separately approved identity scopes
- public visitor tracking
- long-lived Google API token storage

The preferred Version 1 sign-in UX remains an explicit backend-initiated **Sign in with Google** flow; One Tap/ambient third-party identity scripts are not baseline dependencies.

---

# 575. Cookie Banner / CMP Is Not a Version 1 Requirement by Default

The architecture does not introduce a generic cookie-consent banner or Consent Management Platform merely because the site has a Cookie Policy or uses an essential CMS session cookie.

A consent-management capability is introduced only when actual processing/technology and the applicable legal/policy review establish a need for consent-dependent behavior.

The System Blueprint does not attempt to replace the agency's PDPA/DPO/legal determination of the appropriate processing basis for each real use case.

---

# 576. Third-party Technology Requires an Explicit Use Case

A new third-party script, SDK, widget, analytics tool, identity component, embed provider or similar browser/server integration is not added merely for convenience or popularity.

Before approval, the owning team must be able to state:

- the concrete user/operational purpose
- the minimum data required
- what data is transmitted externally
- storage/cookie/browser behavior
- retention and deletion expectations where relevant
- security implications
- privacy/PDPA implications
- availability/fallback behavior

If the purpose cannot justify the added dependency and data flow, the default decision is not to add it.

---

# 577. Third-party Technology Review Gate

Introducing or materially changing third-party browser/runtime technology requires a proportionate review covering, as applicable:

- **Security** — trust boundary, supply-chain risk, credentials/tokens, browser capability and attack surface
- **Privacy / PDPA** — personal-data purpose, minimization, processing parties and policy/notice impact
- **Cookie / Browser Storage** — cookies, local storage or equivalent client persistence
- **Data Transfer** — external endpoints and relevant organizational/legal review
- **CSP** — required `script-src`, `connect-src`, `frame-src`, image/media or other policy changes
- **Accessibility** — keyboard, semantics, alternative/fallback access
- **Performance** — third-party JavaScript/network cost and failure behavior

Approval of one provider/use case does not create a general wildcard approval for unrelated third-party technology.

---

# 578. Consent-dependent Technology Must Fail Closed

If a future approved feature genuinely requires consent before a non-essential technology may operate, the technology is not loaded or activated before the applicable decision is established.

Conceptually:

```text
consent unknown / declined
→ non-essential technology remains inactive

approved consent
→ approved technology may activate under its defined purpose
```

The system must not transmit the relevant non-essential data first and ask for consent afterward.

---

# 579. Non-essential Consent Cannot Gate Core Public Service

When a future technology is genuinely optional/non-essential, declining it must not prevent ordinary access to core public information and services that do not require that processing.

Examples such as reading public News, Health Content, Service information, ITA evidence or public Documents must not become conditional on accepting unrelated analytics/marketing technology.

If refusing a technology breaks a core function, the architecture/policy must reconsider whether that technology is truly optional and whether the processing design is appropriate.

---

# 580. Future Consent Design Must Support Change/Withdrawal

If consent-dependent processing is introduced later, the design must support an understandable way to revisit/withdraw the decision according to the approved policy rather than exposing only a one-way **Accept** action.

Consent evidence, if required, is treated as a dedicated privacy/compliance record with an appropriate purpose/lifecycle. It is not automatically stored as ordinary CMS Business Audit history.

Version 1 does not create a consent database when no consent-dependent technology exists.

---

# 581. No Dark-pattern Consent UX

Any future consent UI must accurately communicate the real purpose and choices.

The architecture rejects designs that intentionally obscure refusal, exaggerate the consequences of declining optional processing, or visually coerce users into an unrelated tracking choice.

Privacy choices must remain understandable and consistent with the actual technical behavior.

---

# 582. External Links and Third-party Embeds Are Different Trust Boundaries

A normal external link lets the user deliberately leave the site and navigate to another service.

A third-party embed may cause external code/resources/data transfer while the visitor remains on the agency page.

Therefore an embed is treated as third-party executable/integrated technology and receives the review required by the Rich Text/Controlled Embed and Privacy/Security architecture. Where embedding provides little user value, a normal external link is preferred.

---

# 583. Approved Third-party Dependencies Have a Lightweight Registry

Version 1 maintains a small engineering/deployment record of approved external dependencies and their purpose, for example:

```text
Google Identity
Purpose: CMS authentication
Public tracking: No
Google API access: identity scopes only
```

This registry belongs to engineering/deployment documentation rather than a new CMS Vendor Management module.

A full CMP, vendor-governance portal or tracker-management platform is not required without demonstrated operational/compliance need.

---

# 584. Operational Logging Remains Purpose-limited

The accepted Logging Architecture remains privacy-minimized:

- passwords, session credentials, MFA/recovery material and OAuth/OIDC tokens are never intentionally logged
- request bodies are not logged wholesale
- raw Public Search queries are not routine long-lived operational telemetry
- retention is bounded by purpose
- access to operational/security logs is restricted

Observability convenience is not sufficient justification to collect broad citizen behavioral histories.

---

# 585. IP Address, User-Agent and Security Metadata Are Purpose-bound

The architecture does not claim that technical network metadata is never processed.

Information such as IP address, User-Agent or request/security metadata may be needed proportionately for request handling, security, abuse prevention, rate limiting or investigation.

Where retained, it remains purpose-limited, access-controlled and bounded by the applicable retention policy rather than being repurposed into a permanent citizen behavioral profile.

---

# 586. Public Search Analytics Are Not a Version 1 Baseline

Version 1 does not require a citizen search-history/profile system or a dashboard of individually attributable search queries.

If aggregate search-quality measurement is later justified, it receives a separate privacy-minimization design rather than turning routine operational logs into an analytics database.

The Frozen Search rule that raw queries may be sensitive remains authoritative.

---

# 587. Security and Privacy Reinforce Each Other

Privacy minimization does not disable controls genuinely needed for security.

Necessary session state, CSRF defenses, authorization evidence, security events, abuse controls and proportionate forensic metadata may remain necessary even when the Public Website avoids tracking.

The operating principle is:

> **Collect the minimum needed to deliver and secure the service, then protect that data appropriately.**

---

# 588. Legal/PDPA Basis and Final Notice Language Are Production-go-live Responsibilities

The System Blueprint defines the technical privacy boundaries and review triggers; it does not invent the legal basis or final legal wording for each processing activity.

Before Production go-live, the agency's responsible PDPA/DPO/legal process must confirm the real processing inventory, applicable basis/obligations, Privacy Notice/Cookie Policy wording, third-party disclosures and any consent requirement against the implemented system.

Architecture and code must be brought back into alignment if that review identifies a mismatch.

---

# 589. Privacy Changes Participate in Release Review

A feature/change that adds or materially changes personal-data processing, third-party data transfer, browser storage, tracking/analytics behavior or identity integration is treated as a release-impacting change.

The Definition of Done / release review must identify whether it requires updates to:

- Privacy Notice / Cookie Policy
- third-party dependency registry
- CSP/security configuration
- data-retention handling
- security/privacy tests
- operational documentation

This keeps public transparency aligned with actual implementation over time.

---

# 590. Accepted Privacy, Cookie & Third-party Technology Baseline

The following Final Consistency Refinement decisions are **Accepted** for Version 1:

- anonymous Public Website usage is stateless/cookie-free where the feature does not require state; behavioral/advertising tracking, profiling and third-party analytics are not default dependencies
- authenticated CMS/security cookies remain narrowly scoped essential security mechanisms and are documented according to their actual purpose rather than treated as analytics/marketing technology
- Privacy Notice, Cookie Policy and Accessibility Statement remain required canonical public Basic Pages from Version 1 and must reflect the implemented system
- a Cookie Policy does not by itself require a generic cookie banner/CMP; consent-management capability is introduced only for an approved real use case that requires it under the agency's applicable privacy/PDPA review
- Google OIDC remains an authentication dependency only and does not implicitly authorize Google Analytics, advertising, broader Google API scopes, visitor tracking or unnecessary third-party identity scripts
- every new/materially changed third-party technology requires an explicit use case and proportionate Security + Privacy/PDPA + Cookie/Storage + Data Transfer + CSP + Accessibility + Performance review before Production use
- future consent-dependent non-essential technology must remain inactive until the applicable choice is established, must not gate unrelated core public service, and must support appropriate change/withdrawal without dark-pattern UX
- external links and embedded third-party technology are different trust boundaries; embedding is reviewed as executable/integrated third-party technology and normal links are preferred when embedding adds little value
- approved third-party dependencies are tracked in lightweight engineering/deployment documentation rather than a new CMS governance platform
- operational/security telemetry remains purpose-limited and privacy-minimized; technical metadata may be processed when needed for security/operations but does not become an unrestricted citizen behavior store
- Public Search analytics/history is not a Version 1 baseline and any future measurement capability requires a separate minimized privacy design
- Security and Privacy are complementary: the system collects the minimum needed to provide and secure the service, then protects that data according to its sensitivity and purpose
- final legal/PDPA basis, notice wording and any consent obligation are confirmed against the real Production processing inventory by the agency's responsible PDPA/DPO/legal process before go-live
- privacy-impacting implementation changes participate in release review so notices, CSP, third-party records, retention and verification stay aligned with real behavior

---

# 591. Next Final Consistency Refinement

> **Announcement Expiry & Domain-time Background Processing**

The next refinement will close the remaining Background Architecture gap for automatic `Published → Expired` Announcement transitions, including due discovery/catch-up, idempotency, transaction/Audit behavior, Search refresh and the explicit boundary that Announcement Expiry is **not** a generic Scheduled Unpublish feature.

After that, remaining refinements are Public Search bounds/safe output and redirect/Unicode URL clarifications before the final cross-document re-check.

---

# 592. Refinement Purpose — Announcement Expiry

This refinement closes the remaining background-processing responsibility for Announcement lifecycle timeouts. Automatic Announcement expiry is a **Domain-owned time-based lifecycle transition**, not a generic scheduler feature or generic unpublish mechanism.

The core rule is:

> **Cron wakes the system up; the Announcement domain decides whether a currently Published announcement is actually due to become Expired.**

---

# 593. Announcement Expiry Lifecycle Semantics

Announcement lifecycle semantics remain distinct:

- `Closed` represents an explicit business/editorial close action
- `Expired` represents reaching the configured expiry time
- `Archived` represents historical organization/retention and is not an expiry synonym

The system must not collapse these states into a generic `Unpublished` state.

---

# 594. Canonical Expiry Source

`expires_at` is canonical Announcement domain data. It is optional: an Announcement with no `expires_at` has no automatic expiry obligation.

Staff-facing date/time input is interpreted in `Asia/Bangkok`; persisted absolute time uses UTC according to the accepted time model.

Cron configuration or a separate job record is never the source of truth for an Announcement's expiry time.

---

# 595. Due Discovery and Catch-up

The due condition is conceptually:

```text
status = Published
AND expires_at IS NOT NULL
AND expires_at <= Clock.now()
```

Using `<= now` is required so downtime, a missed scheduler run, restart or delayed execution does not permanently skip an expiry transition.

---

# 596. Overdue Expiry Is Operational, Not a New Lifecycle State

An Announcement that is still `Published` while `expires_at <= now` is operationally overdue for expiry.

The system does **not** add `ExpiryOverdue`, `ExpiryFailed` or similar canonical states. The authoritative lifecycle changes to `Expired` only after a successful Domain transaction.

---

# 597. Shared Scheduler Infrastructure, Separate Domain Capability

Announcement expiry reuses the accepted Version 1 scheduler infrastructure:

- Hosting Cron / scheduler wake-up
- SQL-backed scheduler lease
- bounded due-work discovery
- injected Clock
- operational logging/health
- short database transactions

Business execution remains an explicit Announcement capability, conceptually `ExpireDueAnnouncement`, rather than a generic time-based status changer.

---

# 598. Current-state Re-check Before Expiry

Every expiry attempt re-reads and re-checks the current canonical Announcement state immediately before mutation.

At minimum the transition verifies that the Announcement:

- is still `Published`
- still has an expiry time
- is still due according to the current `expires_at`

A previously discovered candidate must not expire if a newer canonical edit moved or removed its expiry time.

---

# 599. Idempotent Expiry

Expiry is idempotent. Repeated scheduler runs, retries or overlapping wake-ups must yield one logical `Published → Expired` transition.

If the record is already `Expired`, `Closed`, `Archived` or otherwise no longer eligible, the expiry operation is a safe no-op/current-state result rather than a duplicate mutation.

---

# 600. Transaction and Race Safety

Critical expiry mutation occurs in a short transaction with targeted row-level concurrency protection where appropriate:

```text
BEGIN
  lock/read current Announcement
  re-check Published + expires_at <= now
  transition to Expired
  write required Audit event
COMMIT
```

This serializes races such as manual `Close` versus automatic `Expire` according to actual transaction order and prevents blind status overwrite.

---

# 601. Close / Expire Concurrency Semantics

If a manual `Close` commits before the expiry transaction, the scheduler observes that the Announcement is no longer `Published` and performs no expiry mutation.

If expiry commits first, a subsequent manual action must observe `Expired` and follow the valid current-state workflow rather than overwriting the lifecycle blindly.

---

# 602. No Generic Manual Expire Action Baseline

Version 1 does not require a generic **Expire Now** action. Staff-facing actions use their actual business meaning such as `Close` or `Archive`.

`Expired` remains primarily the semantic result of a configured expiry time being reached.

---

# 603. Expired Does Not Mean Archived, Hidden or Deleted

Automatic expiry performs only the `Published → Expired` lifecycle transition.

It does not automatically:

- Archive
- Hide
- Delete
- Permanently Withdraw
- redirect the resource

Expired Announcements may remain legitimate Historical Public content according to the Frozen Sitemap/Search semantics and should be presented with clear expired context.

---

# 604. Public Rendering and Historical Context

Where an Expired Announcement remains Historical Public, its canonical page may continue to return the appropriate normal public representation with an explicit expired indicator such as “ประกาศนี้หมดอายุแล้ว”.

Expiry does not automatically imply `404`, `410` or `noindex`; those behaviors remain governed by the accepted public lifecycle/indexability rules.

---

# 605. Homepage and Curated Surface Behavior

Homepage/curated placements never override current canonical lifecycle. Once a source becomes `Expired`, a placement must stop promoting it as current content and use the accepted invalid-source/fallback/hide behavior.

Staff do not need to remove every expired source manually merely to make the public surface lifecycle-correct.

---

# 606. Search Synchronization

After a successful canonical expiry commit, Search refresh occurs post-commit using the existing derived-projection architecture.

Search may continue to expose a legitimate Expired Historical Public result with clear lifecycle context and current-content preference rules from the Frozen Search baseline.

Search synchronization failure never rolls back a valid expiry transition; reconciliation remains the recovery path.

---

# 607. Audit Semantics

Successful automatic expiry records a meaningful Audit event distinguishing:

- actor type: `System`
- trigger: domain-time Announcement expiry
- configured expiry time

A human change that originally configured or edited `expires_at` remains a separate human Audit event. Technical retries do not create repetitive business Audit spam.

---

# 608. Failure and Retry Semantics

Infrastructure failure does not move the Announcement to a synthetic failure lifecycle state.

If expiry cannot commit, the Announcement remains canonically `Published`, is operationally overdue, and is retried by a later scheduler run through the normal `<= now` catch-up rule.

---

# 609. System Health Visibility

Operational health may report Announcement expiry health using actionable signals such as:

- overdue expiry count
- oldest overdue expiry age
- recent expiry-processing failure/degradation

This remains part of the small System Health surface and does not create a full generic job-management dashboard.

---

# 610. Bounded Processing and Due-query Indexing

Due work is discovered and processed in bounded batches, ordered deterministically by expiry time and stable identity where appropriate.

Database indexing should support the real due-discovery query (conceptually `status + expires_at`) after verification against the actual MySQL-compatible engine and query plan. Exact batch sizes and index details remain evidence-based implementation decisions.

---

# 611. No Generic Scheduled Actions Table

Version 1 does not create a generic `scheduled_actions` / time-event table merely for Announcement expiry.

`Announcement.status` and `Announcement.expires_at` already provide the canonical state and due-time source. Duplicating them into a generic job model would create unnecessary dual state.

---

# 612. No Generic Scheduled Unpublish Framework

Announcement expiry must not become a CMS feature that lets staff schedule arbitrary future `Unpublish`, `Hide`, `Archive`, `Delete`, `Close` or status changes across every content type.

The scheduler infrastructure is reusable; lifecycle meaning remains owned by each Domain.

---

# 613. Other Content Types Do Not Inherit Announcement Expiry

Sharing the same Clock/Cron/lease/transaction primitives does not imply shared business semantics.

For example:

- News Scheduled Publish does not imply News auto-expiry
- Health Content review due does not imply automatic unpublish
- Document lifecycle rules are governed by the Document domain

A new time-based transition is added only when that content type has a proven Domain requirement.

---

# 614. Announcement Expiry Verification Requirements

Testing must cover at least:

- future `expires_at` remains Published
- due `expires_at` becomes Expired
- downtime/missed tick catches up on the next run
- repeated/overlapping execution produces one logical expiry
- manual Close versus expiry produces a valid serialized outcome
- a changed/removed expiry time is respected before mutation
- non-Published records are safe no-ops
- database failure leaves the record retryable/overdue
- required Audit mutation is atomic with canonical expiry
- Search refresh failure does not roll back canonical expiry
- Homepage/current-surface behavior stops promoting Expired content

Tests use the injected Clock and the accepted real-database/concurrency testing strategy where transaction behavior matters.

---

# 615. Accepted Announcement Expiry & Domain-time Background Processing Architecture

The following Final Consistency Refinement decisions are **Accepted** for Version 1:

- automatic Announcement expiry is a Domain-owned `Published → Expired` transition driven by canonical `expires_at`; Cron/Scheduler is only the wake-up mechanism
- due discovery uses `Published` + `expires_at <= now`, providing deterministic overdue catch-up after missed runs or downtime
- overdue expiry is an operational condition, not a new canonical lifecycle state
- expiry execution is current-state-aware, idempotent, transaction-safe and race-safe with manual lifecycle actions
- expiry performs only the Expired transition and does not automatically Archive, Hide, Delete, Permanently Withdraw or generically unpublish the resource
- legitimate Expired content may remain Historical Public with explicit expired context according to the Frozen Sitemap/Search rules
- Homepage/curated surfaces must respect the updated canonical lifecycle and cannot keep expired content promoted as current merely because a placement still references it
- successful expiry writes accountable System/domain-time Audit atomically with the canonical mutation; technical retry noise remains operational logging
- Search refresh is post-commit and reconstructible; Search failure never invalidates a committed expiry
- scheduler health may expose overdue-expiry degradation without creating a generic job-management product
- Version 1 reuses shared Clock/Cron/lease/batching/transaction/logging primitives but does not introduce a generic scheduled-actions table, workflow engine or scheduled-unpublish feature
- other content types receive time-based lifecycle transitions only from their own proven Domain requirements
- Announcement expiry concurrency, catch-up, Audit, Search-failure and lifecycle-surface behavior are mandatory regression tests

---

# 616. Next Final Consistency Refinement

> **Public Search Bounds, Safe Snippets & Abuse Protection**

The next refinement will close the remaining Search security/operational boundary for bounded query input, pagination limits, safe text-only snippets/highlights, current eligibility enforcement and lightweight abuse throttling without introducing Redis, CAPTCHA, user profiling or an enterprise search gateway in Version 1.

After that, the final small refinement is redirect status + Thai/Unicode URL normalization semantics before the final cross-document re-check.

---

# 617. Public Search Security and Resource-Control Purpose

Public Search is a bounded public query capability, not a general-purpose database/query interface. The Version 1 Search surface must remain easy for citizens while preventing unbounded input, unbounded database work, unsafe snippet rendering, stale-publicity leakage and avoidable abuse.

The security path is intentionally layered:

```text
bounded input
    ↓
bounded execution
    ↓
current canonical eligibility
    ↓
safe bounded output
```

Search convenience never overrides the Frozen Search privacy, public-eligibility or canonical-destination rules.

---

# 618. Allowlisted Public Search Request Contract

The Public Search request accepts only explicitly supported fields such as:

- `q`
- the Frozen Search Group/filter
- page/pagination state
- any later filter only after it becomes an approved Product requirement

The client cannot supply arbitrary fields, raw sort expressions, regular expressions, scripts, SQL-like expressions, hidden/internal selectors or implementation-specific index instructions.

Transport/runtime schema validation rejects or normalizes malformed parameter shapes before they reach the Search application capability.

---

# 619. Server-enforced Query-length Bounds

The backend enforces a finite maximum Search query length before expensive normalization/execution.

Exact numeric limits are not frozen at architecture level. They are selected from representative Thai/English content, official-document names/numbers, usability tests and load measurements.

The invariant is fixed:

> A Public Search query has a server-enforced finite bound; client-side UI validation alone is never the resource-protection boundary.

---

# 620. Blank Query Is Not an All-content Listing

The Frozen Search rule remains authoritative:

```text
/search with no meaningful q
→ Search landing / empty-search state
```

It does not become a request to enumerate all public content.

This preserves Search semantics and avoids an accidental unbounded browse/export endpoint.

---

# 621. Deterministic Bounded Normalization

After transport validation, Search applies the accepted normalization rules in a bounded deterministic pipeline, including where applicable:

- Unicode normalization
- whitespace/punctuation normalization
- Latin case handling
- Thai/Arabic numeral handling
- Buddhist Era/Common Era conversion only in supported year contexts

Normalization must preserve user meaning and may not introduce unbounded expansion or expensive user-controlled computation.

---

# 622. Server-owned Pagination Bounds

Public pagination is server-controlled.

At minimum:

- page numbers must be valid positive values
- page/result size is fixed or constrained to an allowlisted range
- the browser cannot request arbitrarily large result sets
- response/result counts remain bounded regardless of client parameters

Exact page size remains an evidence-based Product/implementation constant rather than an arbitrary architecture number.

---

# 623. Deep-pagination Guardrail

A small page size alone is insufficient if a caller can request an extreme page/offset value.

Version 1 therefore defines a practical maximum result window/page depth appropriate to the chosen Search implementation. Requests beyond that supported window are rejected or safely constrained rather than generating unbounded deep-offset work.

The Public UI remains page-based as frozen in `08-search.md`; cursor pagination is not introduced merely for theoretical scale.

---

# 624. Filters and Ranking Modes Are Allowlists

Frozen Search Groups remain the public filter vocabulary. Unknown values such as internal modules, Audit, hidden resources or arbitrary persistence/index names cannot be mapped directly into Search execution.

Public ranking remains the accepted deterministic ranking model. Version 1 does not expose arbitrary `sortBy`, `orderBy`, field selection or expression parameters.

A future alternate sort/ranking mode must be an explicit Product capability with an allowlisted server-side implementation.

---

# 625. Public-safe Search Projection Only

The Search projection contains only fields deliberately approved for public discovery and result presentation.

It does not contain private/admin-only material such as:

- Draft or unpublished bodies
- Internal notes
- approval/workflow commentary
- hidden/private storage paths
- account/security metadata
- fields included only for Admin workflows

Projection minimization reduces impact if a Search query or projection implementation is faulty.

---

# 626. Current Canonical Eligibility Before Every Result

Projection safety does not replace current-state verification.

Every candidate selected from Search must satisfy current canonical public eligibility before it is returned:

```text
Search candidate
      ↓
resolve current canonical resource/state
      ↓
public eligible now?
  ├─ yes → may return
  └─ no  → suppress
```

A stale Search projection must never prolong visibility after a resource becomes Hidden, Internal, Withdrawn, unpublished or otherwise public-ineligible.

---

# 627. Search Freshness Security Invariant

The accepted Frozen Search rule is reaffirmed as a System Blueprint invariant:

> **Eventually fresh, never eventually secure.**

Search ranking/discovery metadata may be temporarily stale and repaired through incremental synchronization/reconciliation, but current public-eligibility/security decisions are always authoritative at response time.

---

# 628. Safe Plain-text Snippet Source

Search snippets derive from public-safe structured/plain-text projections rather than raw Rich Text, editor HTML or arbitrary stored markup.

Conceptually:

```text
Canonical structured content
        ↓
public-safe text projection
        ↓
bounded snippet extraction
        ↓
Search Result DTO
```

This keeps Search independent from unsafe HTML rendering and aligns with the accepted Rich Text/XSS architecture.

---

# 629. Safe Highlight Rendering

Search highlighting is represented as text or controlled text segments. The renderer creates highlight markup/components itself.

Version 1 does not construct trusted HTML by string replacement and does not use `dangerouslySetInnerHTML` to display query matches.

A query containing characters such as `<`, `>`, quotes or script-like text remains ordinary text and can never become executable browser content through Search highlighting.

---

# 630. Bounded Snippet and Response Size

Search results return only a bounded amount of context around a match rather than full source content.

Bounds apply to:

- snippet/context length
- number of results per page
- total supported result window
- response representation

Exact sizes are selected from Thai readability and performance tests. The architecture invariant is predictable bounded output.

---

# 631. Explicit Public Result DTO and Historical Context

Public Search returns an allowlisted result representation containing only fields required for discovery, such as:

- content/search group/type
- public title/name
- safe summary/snippet
- canonical public destination
- public-safe date/context metadata
- explicit historical/lifecycle context where applicable

Expired, Superseded or other legitimate Historical Public results remain clearly labelled so users are not misled into treating them as current content.

Domain entities/rows are never serialized wholesale as Search results.

---

# 632. Zero Results and Search Failure Are Different Outcomes

A successful query with zero matches is a normal Search result state.

A Search subsystem/database/execution failure is a separate operational error and must not be presented as “ไม่พบข้อมูล”.

This distinction applies to HTTP/API semantics, UI feedback, operational logging and health monitoring.

---

# 633. Search Privacy and Cache Baseline

Public Search continues the accepted Privacy and Caching rules:

- raw query values are omitted/minimized from routine operational logs by default
- `/search` responses use conservative `private` / `no-store` behavior
- shared caches must not persist potentially sensitive query state
- Search-result URLs remain `noindex` and excluded from sitemap destinations

Any future Search analytics collection requires a separate approved purpose/privacy review.

---

# 634. Lightweight Route-specific Throttling

Version 1 applies proportionate throttling to Public Search because Search is more computationally expensive than an ordinary cached public-content GET.

Rate/burst/window values are selected from measured traffic and hosting capacity rather than frozen arbitrarily.

A throttled request receives controlled `429 Too Many Requests` semantics without exposing unnecessary internal policy or infrastructure detail.

---

# 635. Privacy-aware Throttle Identity and Deployment Scope

Anonymous throttling may use short-lived network/security signals such as a trusted-proxy-aware source/IP-derived key where appropriate.

It must not require a persistent citizen tracking cookie, fingerprint or behavioral profile merely to enforce basic abuse limits.

A single-process limiter is acceptable for the Version 1 one-primary-application deployment, but it is not treated as a distributed guarantee. If deployment later becomes multi-instance, shared coordinated throttling is re-evaluated explicitly.

---

# 636. No Redis, CAPTCHA or Bot Platform Baseline

Version 1 does not introduce Redis solely for Search throttling and does not require:

- CAPTCHA on normal Search
- behavioral fingerprinting
- persistent device reputation
- enterprise bot-management infrastructure
- distributed anti-abuse services

These controls may be introduced only when real abuse/scale evidence justifies their UX, privacy and infrastructure cost.

---

# 637. No User-controlled Expensive Query Language

Public Search does not accept arbitrary regular expressions, leading-wildcard query languages, scripts, raw SQL fragments, user-selected persistence fields or similar execution primitives.

The user supplies a bounded keyword-oriented query; the application owns the actual execution strategy.

---

# 638. Execution Resource Guardrails

Search execution is bounded by the normal application infrastructure plus Search-specific controls, including where appropriate:

- bounded candidate/result retrieval
- bounded database connection pool usage
- execution/request timeout or cancellation support
- targeted indexes based on real queries
- HTTP/query input-size limits

Exact values are deployment/performance decisions, but no public request receives unlimited execution resources.

---

# 639. Safe Validation, Rate-limit and Failure Responses

Malformed Search input returns the canonical validation response without SQL/index/tokenizer details.

Rate-limited requests return controlled `429` behavior.

Unexpected Search/database failures use the accepted centralized error handling and generic client-safe response model; stack traces, query plans, schema names and infrastructure paths remain protected operational detail.

---

# 640. Privacy-safe Search Operational Monitoring

Operations may measure Search health using purpose-limited aggregate/technical signals such as:

- latency/duration
- error rate
- rate-limit events
- bounded result-count/zero-result aggregates where justified
- projection/reconciliation health

Raw citizen query history is not required for System Health and is not a Version 1 analytics baseline.

---

# 641. Parameter Pollution and Shape Ambiguity

Ambiguous repeated parameters such as:

```text
/search?q=a&q=b
/search?page=1&page=999
```

must not propagate unpredictably into Search logic.

Transport schemas define a deterministic single-value shape and reject or safely normalize malformed parameter pollution before application execution.

---

# 642. Unicode and Thai Search Input Safety

Search remains first-class for Thai and Unicode content while treating input as untrusted data.

Verification includes representative cases for:

- Thai combining characters
- Thai/Arabic numerals
- Latin and mixed Thai/English text
- unusual but valid Unicode
- malformed/unsupported encoding paths

Normalization must not turn user text into executable syntax or break the Frozen Thai-search usability contract.

Buddhist Era/Common Era handling remains contextual rather than blindly converting every numeric token.

---

# 643. Bounded Retrieval for Common/high-match Queries

A very common term may match many resources, but Search retrieves/ranks only the bounded candidate/result set needed for the requested page/window.

The application must not materialize all matching rows/documents in memory before pagination.

Query/index design is verified with representative high-match Thai terms and historical/current mixtures.

---

# 644. Search Maintenance Is Operational, Not Public/CMS Editorial

Search reconcile/rebuild/reindex capabilities remain operational application/CLI responsibilities.

They are not exposed as Public endpoints, and Editors/Publishers do not receive index-maintenance controls. An Admin Search Health view remains small/read-only/actionable under the Frozen Search/Admin rules rather than becoming a queue-management console.

---

# 645. Centralized Validated Search Security Configuration

Implementation constants such as maximum query length, page size/result window, request timeout and throttling values are defined centrally and validated rather than duplicated as route-level magic numbers.

These technical/security limits are deployment/application configuration, not ordinary CMS editorial Settings. CMS Administrators cannot weaken Search security limits through a generic settings form.

---

# 646. Same Search Security Policy for SSR and Client Navigation

Initial server-rendered `/search?q=...` requests and subsequent client-enhanced Search/navigation use the same Search Application capability and the same validation, bounds, eligibility and result-contract rules.

No client-side path is allowed to bypass the server policy.

Every Search result destination is generated through the canonical public-route mechanism and never points to preview/Admin/internal storage paths or a raw file when the Frozen canonical destination is a resource page.

---

# 647. Mandatory Search Security Regression Tests

Testing must cover at least:

- oversized query rejection
- blank/no-query behavior without all-content enumeration
- invalid/unknown Search Group rejection
- oversized/deep pagination bounds
- duplicate/query-parameter pollution behavior
- script/HTML-like query text remaining non-executable
- snippets/highlights using safe plain text
- stale projection candidates that are now Hidden/Internal/public-ineligible being suppressed
- legitimate Historical Public context remaining accurate
- Search failure differing from zero results
- throttling and controlled `429` behavior
- common/high-match query bounded retrieval
- canonical public destinations only

These tests complement the Frozen Search contract rather than replacing relevance/usability testing.

---

# 648. Evidence-based Search Performance and Limit Tuning

Before Production, representative tests include:

- common Thai terms
- long but valid Thai/English queries
- mixed numeric/year queries
- result-heavy groups
- current + Historical Public mixtures
- reasonable deep pages within the supported window

Results are used to tune query length, result/page limits, timeouts, indexes and throttling values. No arbitrary benchmark number is promoted into the architecture without evidence.

---

# 649. Accepted Public Search Bounds, Safe Snippets & Abuse Protection Architecture

The following Final Consistency Refinement decisions are **Accepted** for Version 1:

- Public Search is a bounded allowlisted query capability rather than a generic persistence/search-engine query language
- backend-enforced finite query, pagination/result-window and execution bounds protect the system; exact numeric values are selected from representative Thai usability/load evidence
- a missing/blank meaningful query remains a Search landing state and never becomes an all-content enumeration request
- ranking/filter/sort behavior is server-owned and allowlisted; clients cannot supply arbitrary fields, regex, scripts, SQL-like expressions or implementation-specific search instructions
- the Search projection contains only public-safe fields, but every candidate still passes current canonical public-eligibility verification immediately before response
- the Frozen **Eventually fresh, never eventually secure** rule is an explicit security invariant
- snippets/highlights derive from public-safe plain text/structured projections and never rely on raw editor HTML or `dangerouslySetInnerHTML`
- result/snippet/response sizes are bounded; Public Search uses explicit allowlisted DTOs and preserves clear Historical Public context
- Search errors remain distinct from valid zero-result outcomes
- raw Search queries remain minimized/omitted from routine operational logging; Search responses remain conservative `private/no-store` and `/search` remains `noindex`
- Version 1 uses lightweight route-specific throttling without persistent citizen tracking identities; one-process limits are not falsely treated as distributed guarantees
- Redis, CAPTCHA, enterprise bot management, device fingerprinting and user profiling are not baseline requirements and require real evidence before introduction
- user-controlled expensive query languages are unsupported; execution uses bounded retrieval, normal pool/resource limits, targeted indexes and evidence-based timeout controls
- parameter pollution, Unicode/Thai handling and contextual year normalization are explicit validation/test concerns
- Search maintenance remains an operational capability rather than a Public or editorial CMS feature
- Search security/performance constants are centralized/validated and are not ordinary CMS Settings
- SSR and client-enhanced Search paths use the same authoritative Application capability and canonical-destination rules
- Search bounds, stale-eligibility suppression, safe snippet/highlight rendering, throttling and high-match workload behavior are mandatory regression/performance verification areas

---

# 650. Next Final Consistency Refinement

> **Permanent Redirect Status, Thai Slug, Unicode Normalization & URL Safety**

This is the final planned refinement before the full `00–08 ↔ 10` cross-document consistency re-check.

It will close the remaining deferred routing details for permanent versus temporary redirect codes, Thai/Unicode slug normalization, safe URL construction/encoding, canonical slug handling and malformed/double-decoding/path-confusion protection without changing the already-accepted rule that stable Public ID — not Title/Slug — is the resource identity.

---

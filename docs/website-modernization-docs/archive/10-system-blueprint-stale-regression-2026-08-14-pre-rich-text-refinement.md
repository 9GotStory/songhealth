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

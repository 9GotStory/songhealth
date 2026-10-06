# Sitemap — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 03-sitemap
> **Status:** CLEAN REBASELINE v2.1 — CURRENT
> **Version:** 2.1
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`
> **Purpose:** กำหนด public navigation, canonical routes, URL rules, redirects และ public error behavior โดยใช้ slug-based URLs ที่เรียบง่าย

---

# 1. Principles

- Citizen-first navigation
- one canonical detail URL per public resource
- semantic stable route roots
- slug-based public URLs
- internal CMS ID is not a required public URL segment
- filters/query state do not create duplicate content ownership
- redirects preserve continuity, not hide poor IA

> **Simple public URLs; stable internal identity; redirects handle change.**

---

# 2. Global Navigation

```text
Main Navigation
├── หน้าแรก
├── เกี่ยวกับเรา
├── ข่าวสาร
├── บริการประชาชน
├── ข้อมูลสุขภาพ
├── เอกสารเผยแพร่
└── ITA

Utility
├── ค้นหา
└── ติดต่อเรา
```

Logo และหน้าแรกชี้ `/`. Footer/Quick Links reuse canonical destinations ไม่สร้าง sitemap อีกชุด.

---

# 3. URL Identity

Dynamic public content ใช้รูปแบบ:

```text
/{resource}/{slug}
```

ตัวอย่าง:

```text
/news/ประชุมคณะกรรมการ
/activities/วันมหิดล-2569
/services/ร้องเรียน-เสนอแนะ
/documents/แผนปฏิบัติการ-2569
```

Rules:

- slug เป็น public route identifier และต้อง unique ตามขอบเขตที่ CMS กำหนด
- Thai slug ใช้ได้
- staff ไม่ต้องกรอก internal content ID
- CMS content ID ใช้เป็น stable internal identity สำหรับ relations/automation
- ไม่สร้าง Songhealth Public ID อีกชุด
- เปลี่ยน published slug ต้องรักษา continuity ด้วย redirect จาก URL เก่า
- Title เปลี่ยนได้โดยไม่จำเป็นต้องเปลี่ยน slug
- ถ้าตั้งใจเปลี่ยน slug ให้เกิด canonical URL ใหม่อย่างควบคุมได้

Basic Page fallback:

```text
/pages/{slug}
```

ไม่มี `/pages` listing/navigation hub.

---

# 4. Homepage

`/` เป็น Homepage ตาม `04-homepage.md`.

Featured/priority content เป็น presentation ไม่ใช่ content type ใหม่.

---

# 5. About

```text
/about
├── /about/organization
├── /about/leadership
├── /about/personnel
├── /about/policies
├── /about/plans
└── /about/results
```

- `/about` = office information landing
- leadership/personnel reuse structured Personnel/Organization data
- Policies/Plans/Results reuse Document resources
- no per-person public route in Version 1 unless a real use case emerges

---

# 6. News, Activities and Announcements

```text
/news
├── /news/health
└── /news/{slug}

/activities
└── /activities/{slug}

/announcements
└── /announcements/{slug}
```

`/news/health` เป็น filtered News view ไม่ใช่ content type ใหม่.

Activity/Announcement ที่ถูกนำไปแสดงใน hub อื่นยังคง canonical URL ของตัวเอง.

---

# 7. Citizen Services

```text
/services
└── /services/{slug}
```

Service Catalog รวมช่องทางบริการจริงของสำนักงานทั้ง online/in-person/paper/telephone/hybrid/external.

คู่มือ/แบบฟอร์มเป็น Document resources. การค้นหาหน่วยบริการเป็น Health Service Directory ไม่ใช่ Service entity.

---

# 8. Health Service Directory

```text
/health-services
└── /health-services/{slug}
```

Directory รองรับ list/filter/map ตามข้อมูลที่มีคุณภาพจริง.

Health Service detail แสดงข้อมูล facility, contact, location, opening information, services offered และ service area ตาม Content Model.

ไม่เพิ่ม booking/queue/nearest-provider engine ใน Version 1.

---

# 9. Health Information

```text
/health
├── /health/content
│   └── /health/content/{slug}
├── /health/reports
│   └── /health/reports/{slug}
└── /dashboard
```

- Health Content = evergreen public-health knowledge
- Health Report = metadata page linked to Document/PDF
- Dashboard = separate analytical domain entry point
- Health Topic เป็น filter/taxonomy ก่อน ไม่สร้าง route hierarchy โดยอัตโนมัติ

---

# 10. Documents

```text
/documents
└── /documents/{slug}
```

`/documents` เป็น shared public document repository.

Document Type, Topic, Fiscal Year, Owner/Source และ Area เป็น filters/metadata ก่อน ไม่สร้าง route อัตโนมัติ.

Raw storage filename ไม่ใช่ canonical page URL.

---

# 11. ITA

```text
/ita
├── /ita/{fiscal-year}
└── /ita/{fiscal-year}/{section-key}
```

Requirement/Item แสดงใน section page; Version 1 ไม่ต้องมี detail route ต่อ item.

Document Evidence ใช้ canonical Document URL. Media/External URL อยู่ใน ITA context ตาม Content Model.

Historical fiscal years remain addressable.

---

# 12. Contact

`/contact` เป็น canonical office contact page และ reuse structured Contact Information.

ไม่สร้าง route แยกสำหรับ phone/address/map โดยไม่มี use case.

Complaint/feedback action เชื่อมไป Service Catalog; facility contacts อยู่ Health Service Directory.

---

# 13. Search

`/search` เป็น Global Search discovery surface ตาม `08-search.md`.

Query/group/page state ควรอยู่ใน URL query parametersเพื่อ share/back-forward ได้.

Search results linkไป canonical routes ข้างต้น.

---

# 14. Breadcrumb

Breadcrumb สะท้อน public information hierarchy ไม่ derive จาก URL segments แบบกลไก.

ตัวอย่าง:

```text
หน้าแรก > ข่าวสาร > ชื่อข่าว
หน้าแรก > บริการประชาชน > ชื่อบริการ
หน้าแรก > ข้อมูลสุขภาพ > ความรู้สุขภาพ > ชื่อเรื่อง
หน้าแรก > เอกสารเผยแพร่ > ชื่อเอกสาร
หน้าแรก > ITA > 2569 > MOIT 1
```

---

# 15. URL Conventions

- lowercase English system route segments
- Thai/English slug ตามชื่อ content ได้
- no file extension in canonical detail page
- no trailing slash baseline
- query parametersใช้สำหรับ filters/search/pagination ไม่ใช่ identity
- fragmentsใช้ deep-link ภายใน page เช่น ITA item ได้
- route rootsไม่เปลี่ยนตาม internal collection label โดยอัตโนมัติ

Canonical route table:

| Content | Canonical pattern |
|---|---|
| News | `/news/{slug}` |
| Activity | `/activities/{slug}` |
| Announcement | `/announcements/{slug}` |
| Service | `/services/{slug}` |
| Health Service | `/health-services/{slug}` |
| Health Content | `/health/content/{slug}` |
| Health Report | `/health/reports/{slug}` |
| Document | `/documents/{slug}` |
| Basic Page | `/pages/{slug}` |
| ITA Section | `/ita/{fiscal-year}/{section-key}` |

---

# 16. Redirects

Redirect requiredเมื่อมี meaningful old → new destination เช่น:

- published slug changed
- route moved
- legacy WordPress URL mapped to current content
- retired route has a direct successor

Rules:

- prefer permanent redirect for durable move
- no universal redirect-to-homepage
- avoid chains/loops
- old slug should redirect directly to latest canonical URL
- superseded historical Document ไม่ redirect อัตโนมัติถ้าประวัติยังมีคุณค่า
- external redirects are not a routine content feature

Version 1 ใช้ redirect capability/404 log ของ CMS/platform ก่อนสร้าง custom redirect manager.

---

# 17. 404, Gone and Unpublished

Public behavior:

| Condition | Public behavior |
|---|---|
| invalid/never existed URL | 404 |
| Draft/unpublished | 404-like non-disclosure |
| moved content with meaningful destination | redirect |
| permanently withdrawn with no successor when semantics justify it | 410 Gone may be used |
| published historical/superseded content intentionally retained | render page with clear status/context |
| missing binary referenced by a page | safe unavailable state; do not leak storage details |

Preview is separate authenticated/signed CMS behavior and does not turn Draft into a public URL.

---

# 18. Legacy WordPress URLs

`09-migration-plan.md` owns URL-by-URL migration mapping.

Before cutover:

1. inventory old public URLs
2. determine current canonical destination or Gone/404 outcome
3. create redirect rules for changed routes
4. crawl representative old URLs
5. inspect 404 log after launch

Legacy WordPress permalink structure never controls the new IA.

---

# 19. Consolidated Sitemap

```text
/
├── /about
│   ├── /about/organization
│   ├── /about/leadership
│   ├── /about/personnel
│   ├── /about/policies
│   ├── /about/plans
│   └── /about/results
├── /news
│   ├── /news/health
│   └── /news/{slug}
├── /activities/{slug}
├── /announcements/{slug}
├── /services
│   └── /services/{slug}
├── /health-services
│   └── /health-services/{slug}
├── /health
│   ├── /health/content/{slug}
│   ├── /health/reports/{slug}
│   └── /dashboard
├── /documents
│   └── /documents/{slug}
├── /pages/{slug}
├── /ita
│   ├── /ita/{fiscal-year}
│   └── /ita/{fiscal-year}/{section-key}
├── /search
└── /contact
```

---

# 20. Deferred Details

ยังไม่ Freeze:

- exact slug generation/transliteration UX
- exact Service Inventory/taxonomy values
- Dashboard sub-routes
- exact visual/navigation component design
- URL-by-URL WordPress redirect mapping

Search ranking/Thai search → `08`.
Publishing/visibility → `07`.
Implementation → `10`.

---

# 21. Decision

Clean Rebaseline v2.1 replaces the former Public-ID-first URL architecture with a **slug-first public URL + native stable content ID + redirect continuity** model.

> **Do not invent a second public identity system when the CMS already provides stable identity and safe slug change handling.**

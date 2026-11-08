# Sitemap — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 03-sitemap
> **Status:** CLEAN REBASELINE v2.6 — CURRENT native-first V1
> **Version:** 2.6
> **Last Updated:** 8 พฤศจิกายน 2569 (2026-11-08): Feature 007, phone breadcrumb presentation
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`
> **Purpose:** กำหนด public navigation, canonical routes, URL rules, redirects และ public error behavior โดยใช้ slug-based URLs ที่เรียบง่าย


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers unavailable Q3/Q4 enforcement from
> V1. Ordinary native content/Document/Media, publication, permissions and supported validation
> remain on EmDash 1.1.0. The reduced V1 scope is reflected in the reviewed Feature 002 Plan;
> deferral is not implementation or PASS. No upstream change, new subsystem or production action
> is authorized. The same decision deferred structured ITA; Feature 004 brought ITA into V1
> (below).

> **Feature 003 decision (Product Owner, 2026-10-29):** `/dashboard` is deferred from V1. It has
> no V1 route, navigation entry or Homepage shortcut. Dashboard stays a separate analytical domain
> (`00` §1.3), and a later Dashboard needs its own accepted scope. ITA stayed outside V1
> navigation (§11) until Feature 004 (below).

> **Feature 004 decision (Product Owner, 2026-11-02; spec #121):** "ITA" is the main navigation's
> last item (§2), with the V1 routes `/ita`, `/ita/{fiscal-year}` and `/ita/{slug}` (§11, §19).
> Only `/dashboard` stays deferred.

> **Feature 007 decision (Product Owner, 2026-11-07; #190 comment 6707205912):** Breadcrumb B
> below 640 px limits only the current-page label to one line with ellipsis when necessary
> (#192, §14). The public hierarchy, ancestor destinations and complete H1 remain.

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
└── /health/reports
    └── /health/reports/{slug}
```

- Health Content = evergreen public-health knowledge
- Health Report = metadata page linked to Document/PDF
- `/dashboard` = separate analytical domain entry point, **deferred from V1**: no V1 route or navigation entry
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
└── /ita/{slug}
```

- `/ita` = ITA landing: หัวข้อ "การประเมินคุณธรรมและความโปร่งใส (ITA)", คำอธิบายสั้นตาม `GLOSSARY.md` และการ์ดของทุกปีงบประมาณที่มี MOIT เผยแพร่อย่างน้อยหนึ่งรายการ เรียงปีใหม่ก่อน พร้อมจำนวน MOIT; เมื่อยังไม่มี MOIT เผยแพร่ แสดง "ยังไม่มีข้อมูล ITA"
- `/ita/{fiscal-year}` เช่น `/ita/2570` = MOIT ที่เผยแพร่ของปีนั้นเรียงตามเลข แต่ละรายการมี "MOIT n" ชื่อ จำนวน Evidence และ "ปรับปรุงล่าสุด" เมื่อตั้งไว้; ปีที่ไม่มี MOIT เผยแพร่ตอบ 404
- `/ita/{slug}` เช่น `/ita/moit-2-2570` = หน้า MOIT ตาม URL pattern ของ collection (`02` §18) ซึ่งมีปีอยู่ใน address ครั้งเดียว; การ์ด "ตัวชี้วัดก่อนหน้า" และ "ตัวชี้วัดถัดไป" ไปยัง MOIT ของปีงบประมาณเดียวกันเท่านั้น
- `{fiscal-year}` และ `{slug}` ใช้ path segment เดียวกัน: segment ที่เป็นตัวเลขเป็นหน้าปีเมื่อปีนั้นมี MOIT เผยแพร่ ดังนั้น MOIT ที่ slug เป็นตัวเลขล้วนเปิดได้เฉพาะเมื่อไม่มีหน้าปีนั้น; slug ตาม `moit-{number}-{fiscal_year}` ไม่ชนกับหน้าปี
- MOIT ที่เป็น draft หรือ slug ที่ไม่มีอยู่ตอบหน้า 404 ของเว็บไซต์ (§17); signed preview แสดง draft
- Breadcrumb: หน้าแรก > ITA > ปีงบประมาณ 2570 > MOIT 2 (§14)
- ไฟล์ Evidence ดาวน์โหลดตามที่ CMS ส่ง (attachment) ไม่เปิดใน browser; ไฟล์ที่ serve ไม่ได้แสดงสถานะไม่พร้อมให้บริการ (§17)
- การ redirect URL ITA เดิมบน WordPress เช่น `/moit-2-2569/` ไป `/ita/moit-2-2569` เป็นงานของ Feature 005 (§18, `09`)

---

# 12. Contact

`/contact` เป็น canonical office contact page และ reuse structured office/contact data จาก owner ที่ถูกต้อง; ไม่บังคับ standalone Contact collection.

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

หน้าปัจจุบันเป็นข้อความเต็มพร้อม `aria-current="page"` ไม่ใช่ลิงก์. ที่ความกว้างต่ำกว่า 640 px
แสดงเฉพาะ label ของหน้าปัจจุบันหนึ่งบรรทัด และใช้ ellipsis เมื่อข้อความเกินพื้นที่ โดยยังเก็บข้อความเต็มไว้
ในหน้าและให้เทคโนโลยีช่วยการเข้าถึงอ่านได้. Label สั้นที่พอดียังแสดงครบ. Ancestor ยังคงข้อความเต็ม ลิงก์
และลำดับชั้นเดิม และ breadcrumb ยังขึ้นบรรทัดใหม่ได้. H1 แสดงชื่อเต็มและตัดบรรทัดตามเดิม.
ตั้งแต่ 640 px breadcrumb ทุกส่วนตัดบรรทัดได้ตามเดิม (`docs/design/DESIGN.md` §7.5).

ตัวอย่าง:

```text
หน้าแรก > ข่าวสาร > ชื่อข่าว
หน้าแรก > บริการประชาชน > ชื่อบริการ
หน้าแรก > ข้อมูลสุขภาพ > ความรู้สุขภาพ > ชื่อเรื่อง
หน้าแรก > เอกสารเผยแพร่ > ชื่อเอกสาร
หน้าแรก > ITA > ปีงบประมาณ 2570 > MOIT 2
```

---

# 15. URL Conventions

- lowercase English system route segments
- Thai/English slug ตามชื่อ content ได้
- no file extension in canonical detail page
- no trailing slash baseline
- query parametersใช้สำหรับ filters/search/pagination ไม่ใช่ identity
- fragmentsใช้ deep-link ภายใน published page ได้ เช่น สารบัญ Requirement ของหน้า MOIT
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
| MOIT (ITA) | `/ita/{slug}` |

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

# 19. Consolidated V1 Sitemap

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
│   └── /health/reports/{slug}
├── /documents
│   └── /documents/{slug}
├── /ita
│   ├── /ita/{fiscal-year}
│   └── /ita/{slug}
├── /pages/{slug}
├── /search
└── /contact
```

**Deferred future scope — not an active V1 route (§9):**

```text
/dashboard
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

Clean Rebaseline v2.2 replaces the former Public-ID-first URL architecture with a **slug-first public URL + native stable content ID + redirect continuity** model.

> **Do not invent a second public identity system when the CMS already provides stable identity and safe slug change handling.**

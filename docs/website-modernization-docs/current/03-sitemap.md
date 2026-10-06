# Sitemap — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 03-sitemap
> **Status:** CLEAN REBASELINE v2.0 — CURRENT
> **Version:** 2.0
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`
> **Purpose:** กำหนด Public Sitemap, Main/Utility Navigation, Canonical Route Ownership, Breadcrumb, URL Convention, Redirect และ Public Error/Lifecycle Behavior ของเว็บไซต์สำนักงานรุ่นใหม่
> **Clean Rebaseline Rule:** เอกสารใน `current/` ต้องอธิบายคำตอบปัจจุบันเพียงชุดเดียว; ประวัติ implementation/architecture เก่าเก็บใน Git history/archival branch และไม่ใช้เป็น authority ของระบบใหม่
> **Technology Ownership:** Routes, canonical identity and public behavior are product contracts; router/framework implementation belongs to `10`.

---

## 1. Purpose

เอกสารนี้รวบรวมการตัดสินใจด้าน Public Sitemap ที่ผ่านการยืนยันแล้ว เพื่อใช้เป็นจุดอ้างอิงเดียวก่อนเดินหน้าส่วนที่เหลือ

หลักสำคัญ:

- Sitemap ≠ Content Model ≠ Information Domain
- Citizen First
- Mobile First
- Main Navigation ต้องกระชับ
- ไม่สร้าง Route เพียงเพราะมี Content Type
- Landing Page ใช้เพื่อ Navigate/Aggregate ไม่ทำข้อมูลซ้ำ
- หนึ่งรายการมีหนึ่ง Canonical URL
- Search และ Related Content สามารถพาผู้ใช้ไปยังข้อมูลที่ไม่อยู่ใน Main Navigation ได้
- Public Navigation สามารถรวมข้อมูลจากหลาย Model ได้ หากช่วย User Journey
- Complexity must be earned

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

Utility Navigation
├── ค้นหา
└── ติดต่อเรา
```

- `/` = Homepage
- Logo → `/`
- “หน้าแรก” → `/`
- Search และ Contact อยู่ Utility Navigation

## 2.1 Secondary / Footer Navigation Boundary

Footer Navigation, Quick Links และ Contextual Links สามารถชี้ไปยัง Canonical Routes ที่กำหนดใน Sitemap นี้ได้ แต่ไม่ควรสร้าง Information Architecture หรือ Repository ซ้ำอีกชุดหนึ่ง

รายละเอียดองค์ประกอบ Footer และ Quick Links ฉบับ Final จะพิจารณาใน `04-homepage.md` / UI Design ตามบริบท โดยยึดหลัก:

- reuse existing canonical destinations
- keep citizen tasks easy to discover
- do not turn the footer into a second full sitemap
- do not create new content ownership merely for footer presentation

---

# 3. URL Identity Policy

Dynamic content ใช้แนวคิด:

```text
/{resource}/{public-id}/{slug?}
```

ยืนยันหลัก:

- `Title ≠ Slug ≠ Public ID`
- Public ID เป็น Stable Identity ที่ระบบสร้าง
- Slug มีไว้เพื่อความอ่านง่าย
- Thai slug ใช้ได้
- ไม่บังคับเจ้าหน้าที่กรอก slug
- ก่อน Publish สามารถ regenerate slug จาก Title ได้
- หลัง Publish การเปลี่ยน Title ต้องไม่เปลี่ยน Canonical URL อัตโนมัติ
- หากเปลี่ยน Published Slug โดยตั้งใจ ต้อง Redirect URL เก่าไป Canonical URL ใหม่
- Implementation ของ Public ID ไปตัดสินใน `10-system-blueprint.md`
- Static/System Routes ใช้ semantic paths และไม่ต้องมี Public ID

> **System-first, Human-optional**

> **Generator dumb but predictable, not AI clever**

## 3.1 Supporting Basic Page Route

`Basic Page` remains a fallback content model only. A published Basic Page needs a stable canonical destination even though it does not have a public listing or navigation domain of its own.

Canonical fallback pattern:

```text
/pages/{public-id}/{slug?}
```

Rules:

- there is no required public `/pages` listing
- `/pages` is not a Main or Utility Navigation item
- Basic Page must not replace News, Activity, Announcement, Health Content, Service, Personnel, Organization, Health Service, Health Report, Document or ITA
- published Basic Pages may be discovered through Global Search or direct/contextual links
- when a structured content model fits, that model and its canonical route must be used instead

> **Basic Page has a canonical fallback route, not a public content hub.**

---

# 4. Homepage

```text
/
├── Header / Navigation / Search
├── Featured / Priority Content
├── Frequently Used Services
├── Latest News
├── Announcements / Health Information
├── Related Health Service Facilities
├── Activities
└── Contact / Map / Footer
```

- Featured เป็น Presentation/Curation Attribute ไม่ใช่ Content Type
- หลีกเลี่ยงองค์ประกอบที่ต้องดูแลรายวันโดยไม่มี Workflow จริง

---

# 5. เกี่ยวกับเรา

```text
/about
├── /about/organization
├── /about/leadership
├── /about/personnel
├── /about/policies
├── /about/plans
└── /about/results
```

`/about` เป็น Landing + Office Information รวม:
- ประวัติ
- วิสัยทัศน์
- พันธกิจ
- ค่านิยม
- หน้าที่
- พื้นที่รับผิดชอบ

ยืนยัน:
- Organization Chart เป็น Presentation ของ Organization Data
- Leadership = Personnel + Assignment + Role view
- `/about/personnel` = Personnel Directory
- v1 ยังไม่สร้าง Personnel Detail Route รายบุคคลโดยไม่มี Use Case จริง
- Policies / Plans / Results ใช้ Central Documents
- `/about/results` ไม่ใช่ Dashboard

Dropdown:

```text
เกี่ยวกับเรา
├── ข้อมูลสำนักงาน
├── โครงสร้างองค์กร
├── ผู้บริหาร
├── บุคลากร
├── นโยบายและยุทธศาสตร์
├── แผนงาน
└── ผลการดำเนินงาน
```

---

# 6. ข่าวสาร

```text
/news
├── /news/health
└── /news/{public-id}/{slug?}

/activities
└── /activities/{public-id}/{slug?}

/announcements
└── /announcements/{public-id}/{slug?}
```

ยืนยัน:
- `/news` = Communication Hub + News Listing
- `/news/health` = Filtered News View ตาม Health Topic ไม่ใช่ Content Type ใหม่
- Activity และ Announcement มี Canonical Root ของตัวเอง
- Activity ที่ถูกแสดงใน `/news` ยัง Canonical ที่ `/activities/...`
- Source/Network เป็น Filter ก่อน
- Year/Archive เป็น Filter ก่อน
- Listing ใช้ Pagination มากกว่า Infinite Scroll

Dropdown:

```text
ข่าวสาร
├── ข่าวประชาสัมพันธ์
├── กิจกรรม
├── ประกาศ
└── ข่าวสุขภาพ
```

> **Content may appear in many places, but has one canonical detail URL.**

---

# 7. บริการประชาชน

```text
/services
├── Service Catalog
├── คู่มือและแบบฟอร์ม
└── ค้นหาหน่วยบริการสุขภาพ
    └── /health-services
```

Service Catalog Discovery Groups:

```text
├── ร้องเรียนและเสนอแนะ
├── แจ้งปัญหาด้านสุขภาพ
├── บริการสำหรับ อสม.
├── การขอข้อมูลหรือเอกสารจากสำนักงาน
└── บริการที่เกี่ยวข้อง
```

Canonical Service Detail:

```text
/services/{public-id}/{slug?}
```

ยืนยัน:
- Complaint/Feedback เป็น Service entities
- Health Issue Reporting ต้องบอก receiver/operator/channel/preparation/next process ชัด
- บริการสำหรับ อสม. เป็น Audience/Group View ของ Service Catalog
- การขอข้อมูลหรือเอกสารจากสำนักงานยังอยู่ใน Service Catalog
- v1 ของการขอข้อมูล/เอกสาร = In-person guidance ไม่มี upload/case tracking/approval workflow
- ใช้ชื่อ “บริการที่เกี่ยวข้อง” มากกว่า “บริการออนไลน์”
- External services ต้องระบุเจ้าของบริการและ external destination ชัด
- คู่มือ/แบบฟอร์ม = Document Resource ไม่ใช่ Service
- ค้นหาหน่วยบริการ = Health Service Directory ไม่ใช่ Service Entity

Dropdown:

```text
บริการประชาชน
├── บริการทั้งหมด
├── ร้องเรียนและเสนอแนะ
├── แจ้งปัญหาด้านสุขภาพ
├── บริการสำหรับ อสม.
├── คู่มือและแบบฟอร์ม
└── ค้นหาหน่วยบริการสุขภาพ
```

> **Navigation groups are for discovery; individual services live in the Service Catalog.**

---

# 8. Health Service Directory

```text
/health-services
├── Search / Filter
│   ├── ประเภท
│   ├── พื้นที่
│   └── บริการที่มี
├── List View
├── Map View
└── /health-services/{public-id}/{slug?}
```

Directory ตอบคำถาม:
- ฉันควรไปที่ไหน?
- หน่วยบริการไหนอยู่ในพื้นที่ของฉัน?
- ที่ไหนมีบริการที่ฉันต้องการ?

Health Service Detail แสดงได้:
- ชื่อ
- ประเภท
- สังกัด
- ที่อยู่
- แผนที่
- ช่องทางติดต่อ
- เวลาทำการ
- บริการที่มี
- พื้นที่รับผิดชอบ
- ข้อมูลเกี่ยวข้อง

ยืนยัน:
- Affiliation เป็น profile data ไม่ใช่ navigation hierarchy
- `Health Service ↔ Service`
- Services Offered มาจาก Central Service Relationship ไม่เขียนซ้ำเป็น free text
- Location ≠ Service Area
- Public Area UX ควรง่ายกว่าความละเอียดของ Data Model
- Active / Temporarily Closed / Inactive / Hidden มี behavior ต่างกัน
- ไม่ลบ Record สำคัญเพียงเพราะสถานะเปลี่ยน

v1 ยังไม่รวม:
- นัดหมายออนไลน์
- Queue
- ตารางแพทย์รายวัน
- Waiting time real-time
- Patient Portal
- Rating / Review
- Open now real-time หากข้อมูลไม่เชื่อถือได้
- custom GPS engine
- automatic nearest-provider logic

> **Health Service Directory answers “where can I receive this service?”**

> **Health Service is a real-world service facility, not an organization menu item or Service entity.**

---

# 9. ข้อมูลสุขภาพ

```text
/health
├── /health/content
│   └── /health/content/{public-id}/{slug?}
├── /health/reports
│   └── /health/reports/{public-id}/{slug?}
└── /dashboard
```

ยืนยัน:
- `/health` = Health Information Hub
- Health Content = evergreen knowledge
- `/health/content/...` = Canonical Health Content
- Health News อยู่ `/news/...`
- Health Report Detail = Metadata Page ที่เชื่อม Document/PDF
- `/health/reports/...` = Canonical Report URL
- Raw PDF ไม่ใช่ Canonical Report URL
- `/dashboard` = Dashboard Entry Point
- Dashboard อยู่ใต้ “ข้อมูลสุขภาพ” ใน Public Navigation แต่แยก Data Domain / DB / API จาก CMS
- Dashboard sub-routes ยังไม่ Freeze
- Health Topic เป็น Filter/Taxonomy ก่อน ไม่สร้าง topic routes โดย default

Dropdown:

```text
ข้อมูลสุขภาพ
├── ภาพรวมข้อมูลสุขภาพ
├── ความรู้สุขภาพ
├── รายงานสุขภาพ
└── Dashboard
```

> **`/health` is a Health Information Hub, not a Content Listing.**

> **Health Content, Health Report, and Dashboard have different responsibilities and canonical routes.**

---

# 10. เอกสารเผยแพร่

```text
/documents
├── Search / Filter
└── /documents/{public-id}/{slug?}
    └── File / PDF Resource
```

Filter หลัก:
- Document Type
- Topic
- Fiscal Year
- Owner / Source
- Area (เมื่อเกี่ยวข้อง)

ยืนยัน:
- `/documents` = Canonical Public Repository สำหรับ reusable published documents
- Document Type เป็น Filter ก่อน ไม่ใช่ Route โดยอัตโนมัติ
- Friendly filtered route เพิ่มได้ภายหลังเมื่อมี real navigation need
- Document Detail เป็น Canonical Resource URL
- Storage filename ไม่ใช่ Public Identity
- Direct Download/Open File action ทำได้เมื่อ UX เหมาะสม
- Document Date ≠ Website Published Date
- Fiscal Year เป็น Filter ก่อน
- Document เดียว reuse ได้ใน About / Service / Health Report / ITA
- Health Report ยังคง Canonical ที่ `/health/reports/...`
- ITA journey ยังคงอยู่ `/ita/...`
- Published / Superseded / Expired / Archived เป็น lifecycle ที่แยกกัน
- Historical route ของเอกสารเก่าอาจคงไว้และชี้ไปฉบับปัจจุบัน

Dropdown:

```text
เอกสารเผยแพร่
├── เอกสารทั้งหมด
├── แบบฟอร์ม
├── คู่มือ / แนวทาง
├── แผนงาน
└── รายงาน
```

สี่รายการหลังเป็น Filtered/Curated Views ของ Document Center เดียวกัน

> **One document, one source of truth, many presentation contexts.**

---

# 11. ITA

> **ITA = Structured Yearly Evidence Directory**

```text
/ita
├── /ita/{fiscal-year}
└── /ita/{fiscal-year}/{section-key}
```

โครงเชิงความหมาย:

```text
/ita
├── ปีงบประมาณปัจจุบัน
└── ปีย้อนหลัง

/ita/{fiscal-year}
└── MOIT / Sections

/ita/{fiscal-year}/{section-key}
├── Requirement / Item
│   ├── Document Evidence
│   ├── Media Evidence
│   └── External URL
└── ...
```

ยืนยัน:
- Fiscal Year เป็น Sitemap Hierarchy จริง ไม่ใช่แค่ Filter
- Structure ของแต่ละปี Configurable ไม่ hard-code จำนวน MOIT
- MOIT / Section มี Route ได้
- Requirement / Item ยังไม่แยกเป็น Route ใน v1
- Deep Link ใช้ fragment ได้ เช่น `#item-3`
- Evidence ไม่ต้องมี Public Detail Route ของตัวเอง
- Document Evidence ใช้ Canonical Document URL
- Media Evidence แสดง/อ้างอิงภายใน ITA context ตาม Media public-eligibility และไม่สร้าง Public Detail Route ใหม่เพียงเพราะเป็น ITA Evidence
- `/ita` เป็น stable landing
- `/ita/current` ไม่ควรเป็น Canonical
- Historical year ต้องรักษาบริบท/evidence ของปีนั้น
- Public ITA ไม่แสดง internal compliance workflow/scoring โดย default

Dropdown:

```text
ITA
├── ภาพรวม ITA
├── ITA ปีงบประมาณปัจจุบัน
└── ข้อมูลย้อนหลัง
```

> **Preserve history; improve forward.**

---

# 12. ติดต่อเรา

```text
/contact
├── ข้อมูลสำนักงาน
├── ที่อยู่
├── ช่องทางติดต่อ
├── วันและเวลาทำการ
├── แผนที่
├── ช่องทางดิจิทัล
├── หน่วยงาน / ช่องทางที่เกี่ยวข้อง (เมื่อมีประโยชน์ต่อผู้ใช้)
└── Related Actions
    ├── ร้องเรียน / เสนอแนะ → Service
    └── ค้นหาหน่วยบริการ → /health-services
```

ยืนยัน:
- `/contact` = Canonical Contact Page ของ สสอ.สอง
- ใช้ Structured Contact Information กลาง
- Reuse ใน Homepage / Header / Footer / Service / Organization
- ไม่สร้าง `/contact/address`, `/contact/phone`, `/contact/map` โดยไม่มีเหตุผล
- Purpose/Label ของ phone/email ต้องชัดเมื่อมีหลายช่องทาง
- Workflow ร้องเรียนยังอยู่ Service Catalog
- Health Service contacts อยู่ `/health-services`
- หน่วยงาน/ช่องทางที่เกี่ยวข้องสามารถแสดงเป็น curated official links เมื่อช่วยให้ประชาชนไปต่อได้ แต่ไม่สร้าง Contact Repository ใหม่
- `/contact` ไม่ใช่ directory ของเบอร์ส่วนตัว/LINE ส่วนตัวของเจ้าหน้าที่
- แสดงเฉพาะ official and actively maintained digital channels

> **Contact information is structured reusable data, not page-specific copy.**

---


# 13. Global Search

Canonical utility route:

```text
/search
```

Utility Navigation:

```text
Utility Navigation
├── ค้นหา → /search
└── ติดต่อเรา → /contact
```

Global Search v1 searches public/published resources such as:
- News
- Activity
- Announcement
- Health Content
- Service
- Health Service
- Document
- Health Report
- Organization / Personnel เฉพาะข้อมูลที่เผยแพร่
- Basic Page
- ITA Requirement / Evidence context

Search must not expose:
- Draft
- Hidden
- Internal-only data
- Admin data
- Audit Log
- Unpublished resources
- Internal workflow state
- Dashboard raw analytical records

Dashboard อาจถูกค้นได้เฉพาะ Entry/Page Metadata ที่ตั้งใจเผยแพร่ ไม่ค้น raw analytical rows ใน v1

User-facing result groups:

```text
ทุกประเภท
ข่าวสาร
บริการประชาชน
ข้อมูลสุขภาพ
หน่วยบริการ
เอกสาร
ITA
เกี่ยวกับเรา
```

Search Group ไม่จำเป็นต้องตรง 1:1 กับ Content Type เช่น “ข่าวสาร” สามารถรวม News + Activity + Announcement

Conceptual query-driven URL:

```text
/search?q=ไข้เลือดออก
/search?q=ไข้เลือดออก&type=health
```

ชื่อ parameter จริงยังไม่ Freeze ใน Sitemap แต่ยืนยันว่า Query/Filter State ควรอยู่ใน URL เพื่อ share/back-forward ได้

Domain-specific scoped search/filter ยังคงมีได้ เช่น:
- `/documents`
- `/health-services`
- `/health/content`
- `/health/reports`
- `/services`

Search Result ต้องพาผู้ใช้ไป Canonical Destination ของข้อมูลจริง Search ไม่เป็นเจ้าของ Content

Personnel Search ใน v1 ใช้เฉพาะ Public Profile Fields และพาไป `/about/personnel` หรือ filtered/anchored directory โดยไม่สร้าง Personnel Detail Route เพียงเพื่อรองรับ Search

Organization Search เช่นเดียวกัน พาไป `/about/organization` เมื่อยังไม่มี Detail Route รายหน่วย

Search Result Presenter ใช้ metadata ตามธรรมชาติของประเภทข้อมูล เช่น News ใช้ Published Date, Document ใช้ Document Date, Health Content ใช้ Last Reviewed และ Health Service ไม่จำเป็นต้องเน้นวันที่

Empty Result ควรมี recovery guidance เช่น ปรับคำค้น เลือกทุกประเภท หรือ Quick Links ไป Services / Health Services / Documents / Contact

Ranking, weighting, synonym, typo tolerance, Thai segmentation, stemming, index refresh และ search technology ไปกำหนดใน `08-search.md`

Search Visibility ต้องไม่เกิน Public Visibility

> **`/search` is the global discovery route; it does not own canonical content.**

> **Global Search searches public, published website resources only.**

> **Search Groups are user-facing discovery categories and do not need to map 1:1 to Content Types.**

> **Domain-specific Search/Filter remains available for focused discovery.**

> **Search query/filter state should be shareable through the URL.**

> **Dashboard raw analytical data is outside the Global Search scope in v1.**

---


# 14. Breadcrumb Navigation

## 14.1 Core Principle

> **Breadcrumb represents the user-facing information hierarchy, not the technical URL structure.**

Breadcrumb must not be generated by blindly splitting URL segments.

Example:

```text
/activities/{public-id}/{slug?}
```

Public breadcrumb:

```text
หน้าแรก > ข่าวสาร > กิจกรรม > ชื่อกิจกรรม
```

rather than a technical route-derived label.

## 14.2 General Rules

- Homepage `/` has no breadcrumb.
- Internal pages with a meaningful hierarchy should have a breadcrumb.
- Breadcrumb follows public Information Architecture and Navigation.
- Query/filter state does not automatically create breadcrumb levels.
- Taxonomy/classification does not automatically create breadcrumb levels.
- Each canonical page has one deterministic breadcrumb hierarchy.
- Contextual “Back to...” navigation is separate from canonical breadcrumb.
- Current page is not clickable and should use appropriate current-page semantics/accessibility.
- Public-facing labels are used instead of technical route/model names.

## 14.3 Landing Pages

Examples:

```text
/about
หน้าแรก > เกี่ยวกับเรา

/services
หน้าแรก > บริการประชาชน

/health
หน้าแรก > ข้อมูลสุขภาพ
```

Do not duplicate the page label as another breadcrumb level.

## 14.4 Static Subpages

Examples:

```text
/about/organization
หน้าแรก > เกี่ยวกับเรา > โครงสร้างองค์กร

/about/personnel
หน้าแรก > เกี่ยวกับเรา > บุคลากร
```

## 14.5 News / Activity / Announcement

```text
/news/{public-id}/{slug?}
หน้าแรก > ข่าวสาร > ชื่อข่าว

/activities/{public-id}/{slug?}
หน้าแรก > ข่าวสาร > กิจกรรม > ชื่อกิจกรรม

/announcements/{public-id}/{slug?}
หน้าแรก > ข่าวสาร > ประกาศ > ชื่อประกาศ
```

`/news` is itself the News/Communication landing and News listing, so News Detail does not add a duplicate “ข่าวประชาสัมพันธ์” breadcrumb level. Activities and Announcements have their own listing routes, but their breadcrumb remains under the public “ข่าวสาร” hierarchy.

## 14.6 Filtered Views

Named/curated views with a real navigation identity may appear in breadcrumb.

Example:

```text
/news/health
หน้าแรก > ข่าวสาร > ข่าวสุขภาพ
```

Ordinary query/filter state does not become hierarchy.

Example:

```text
/documents?type=form&year=2569
```

Breadcrumb remains:

```text
หน้าแรก > เอกสารเผยแพร่
```

not:

```text
หน้าแรก > เอกสารเผยแพร่ > แบบฟอร์ม > 2569
```

Principle:

> **Filters change the view; they do not automatically create hierarchy.**

If a filtered view later gains a real public route/navigation identity such as `/documents/forms`, it may then appear as a breadcrumb level.

## 14.7 Service Detail

A Service may be discoverable through several categories/audiences.

Therefore its canonical breadcrumb should remain stable:

```text
หน้าแรก > บริการประชาชน > ชื่อบริการ
```

Do not dynamically insert category/audience as the parent simply because the user arrived through that filter.

> **One canonical hierarchy for one detail page.**

## 14.8 Health Service Detail

```text
/health-services/{public-id}/{slug?}

หน้าแรก > บริการประชาชน > ค้นหาหน่วยบริการสุขภาพ > ชื่อหน่วยบริการ
```

Health Service Type and Area remain classification/filter dimensions, not canonical breadcrumb levels.

## 14.9 Health Content

```text
/health/content/{public-id}/{slug?}

หน้าแรก > ข้อมูลสุขภาพ > ความรู้สุขภาพ > ชื่อเนื้อหา
```

Health Topic is not automatically inserted into breadcrumb.

## 14.10 Health Report

```text
/health/reports/{public-id}/{slug?}

หน้าแรก > ข้อมูลสุขภาพ > รายงานสุขภาพ > ชื่อรายงาน
```

Report Type, Area and Fiscal Year remain metadata/filter dimensions.

## 14.11 Document Detail

```text
/documents/{public-id}/{slug?}

หน้าแรก > เอกสารเผยแพร่ > ชื่อเอกสาร
```

Document Type and Fiscal Year are not automatically breadcrumb levels.

A Document reached from ITA, About, or Service still uses its canonical Document breadcrumb.

If useful, the UI may separately provide a contextual link such as:

```text
กลับไปยัง ITA MOIT 5
```

Principle:

> **Breadcrumb is canonical hierarchy; “Back to context” is navigation history/context. They are not the same thing.**

## 14.12 ITA Breadcrumb

ITA is a true hierarchical case.

```text
/ita/2569
หน้าแรก > ITA > ปีงบประมาณ 2569
```

```text
/ita/2569/moit-5
หน้าแรก > ITA > ปีงบประมาณ 2569 > MOIT 5
```

For:

```text
/ita/2569/moit-5#item-3
```

Breadcrumb remains:

```text
หน้าแรก > ITA > ปีงบประมาณ 2569 > MOIT 5
```

Requirement/Item does not become a breadcrumb level in v1 because it is not a Sitemap Node.

## 14.13 Search

```text
/search?q=ไข้เลือดออก
```

Breadcrumb:

```text
หน้าแรก > ค้นหา
```

The search query is page state, not hierarchy.

## 14.14 Contact

```text
/contact

หน้าแรก > ติดต่อเรา
```

## 14.15 Dashboard

```text
/dashboard

หน้าแรก > ข้อมูลสุขภาพ > Dashboard
```

This intentionally follows public information hierarchy rather than technical route nesting.

Future internal Dashboard sub-routes will be designed when concrete dashboard requirements exist.

## 14.16 Interaction / Accessibility

- Ancestor breadcrumb items are clickable.
- Current page is text/non-clickable.
- Current page should use appropriate current-page semantics such as `aria-current="page"`.
- Long detail titles may be visually truncated on small screens, while preserving meaningful accessible text.
- Breadcrumb presentation may adapt responsively without changing the semantic hierarchy.

## 14.17 Accepted Breadcrumb Principles

> **Breadcrumb shows where the page belongs, not necessarily how the user arrived there.**

> **Classification such as Topic, Area, Audience, Document Type, Fiscal Year outside ITA, and query filters do not automatically become breadcrumb levels.**

> **Each canonical page has one deterministic breadcrumb hierarchy.**



# 15. Formal URL Convention

## 15.1 Core Principle

Public URLs are a stable public contract and should remain more stable than titles, menu labels, or internal implementation names.

> **Path identifies stable resources or information hierarchy; query parameters represent view state.**

> **Public ID is the durable identity; slug is for humans.**

> **A value belongs in the path only when it is part of stable information hierarchy, not merely metadata.**

> **Every public resource has one deterministic canonical URL.**

## 15.2 Static Routes

Static/system/landing routes use stable semantic English paths.

Examples:

```text
/
/about
/about/organization
/news
/activities
/announcements
/services
/health-services
/health
/health/content
/health/reports
/dashboard
/documents
/ita
/contact
/search
```

Avoid implementation-oriented patterns such as:

```text
/page?id=12
/category/4
/module/news-list
```

Principle:

> **Static routes describe purpose, not implementation.**

## 15.3 Dynamic Resource Pattern

Dynamic public content uses:

```text
/{resource}/{public-id}/{slug?}
```

Examples:

```text
/news/N7K2P4/กิจกรรมรณรงค์ไข้เลือดออก
/activities/A9M4Q1/ประชุมคปสอ
/services/S8H3K2/ร้องเรียนการให้บริการ
/documents/D2P7M5/แผนปฏิบัติการประจำปี-2569
```

Meaning:

```text
Public ID = identity
Slug      = readability
```

## 15.4 Public ID

Accepted principles:

- Public ID is the stable identity used to resolve a public resource.
- Public ID is system-generated.
- Public ID is independent from Title and Slug.
- Database primary key must not automatically become the Public ID.
- Internal/sensitive identifiers must not be exposed as the Public ID.
- Exact implementation (UUID, ULID, opaque short ID, etc.) is deferred to `10-system-blueprint.md`.

```text
Database PK ≠ Public ID
```

## 15.5 Slug

Accepted behavior:

- Slug is descriptive/readability metadata.
- Slug is optional for route resolution.
- Canonical dynamic URLs should normally include a slug when a meaningful title exists.
- Thai slugs are allowed.
- English transliteration is not required.
- Latin characters are normalized to lowercase.
- Hyphen `-` is the preferred word separator.
- Staff are not required to manually manage slugs in normal publishing workflow.

Example:

```text
/documents/D8K2P1/แผนปฏิบัติการประจำปี-2569
```

## 15.6 Wrong, Old, or Missing Slug

If the Public ID resolves correctly but the slug is missing or does not match the current canonical slug:

```text
/news/N7K2P4/ชื่อเก่า
/news/N7K2P4
```

the system should resolve by Public ID and redirect to the current canonical URL:

```text
/news/N7K2P4/ชื่อปัจจุบัน
```

Principle:

> **Slug is optional for resolution, preferred for canonical presentation.**

## 15.7 One Canonical URL

A resource may appear in many contexts but has only one canonical URL.

Example:

```text
/documents/D8K2P1/แผนปฏิบัติการ-2569
```

may be surfaced from:

- `/about/plans`
- `/services/...`
- `/ita/2569/...`
- `/search`

without generating duplicate resource URLs such as:

```text
/about/plans/D8K2P1
/ita/document/D8K2P1
/service-document/D8K2P1
```

## 15.8 Language Policy

Static/system route keys use stable English paths.

Human-readable slugs may use Thai.

> **System routes use stable English keys; human-readable slugs may use Thai.**

This keeps public route contracts stable even if Thai menu labels change.

## 15.9 Case Policy

Canonical Latin route segments are lowercase.

Use:

```text
/health-services
/health/reports
```

not:

```text
/Health-Services
/Health/Reports
```

Requests using non-canonical case may be normalized/redirected.

## 15.10 Word Separator

Use hyphen `-`.

Preferred:

```text
health-services
annual-report
แผนปฏิบัติการประจำปี-2569
```

Avoid underscore, camelCase, or space-based route naming.

## 15.11 Trailing Slash

Canonical URLs do not use a trailing slash.

Preferred:

```text
/about
/news
/documents/D8K2P1/...
```

Non-canonical trailing-slash requests may redirect to the no-trailing-slash canonical form.

> **One URL style, one canonical representation.**

## 15.12 Query Parameters

Query parameters represent view state, not resource identity.

Examples:

```text
/search?q=ไข้เลือดออก
/documents?type=form
/documents?year=2569
/health-services?area=บ้านกลาง
/news?page=2
```

Avoid using query parameters as the identity of dynamic content where a resource route already exists.

```text
/news?id=N7K2P4
```

is not the preferred public detail pattern.

> **Path identifies resources; query parameters modify views.**

## 15.13 Filter State and Canonical Ownership

A filtered listing:

```text
/documents?type=form&year=2569
```

does not create a new Document Resource or canonical content item.

If a filtered view later gains a real navigation identity and dedicated route, that route can be defined explicitly.

## 15.14 Query Parameter Order

Parameter order does not define identity.

These represent the same view state:

```text
/documents?type=form&year=2569
/documents?year=2569&type=form
```

Implementation may normalize ordering later.

## 15.15 Default / Empty Query Parameters

Parameters that have no effect should not define distinct canonical views.

Example:

```text
/documents?type=all&page=1
```

should normalize conceptually to:

```text
/documents
```

An empty query such as:

```text
/search?q=
```

should represent the empty search state rather than a separate pseudo-resource.

## 15.16 Shareable View State

Search/filter state that materially affects a public view should be representable in the URL so it can be shared and restored.

Examples:

```text
/search?q=ไข้เลือดออก&type=health
/documents?year=2569&type=form
```

Important discovery state should not exist only in temporary client-side memory.

## 15.17 Fragment

Fragments represent an in-page location, not a new resource.

Example:

```text
/ita/2569/moit-5#item-3
```

A fragment may also be used for a meaningful section inside a page when appropriate.

It must not replace a real route for a section that already has its own navigation identity.

## 15.18 Fiscal Year Rule

ITA:

```text
/ita/2569
```

uses fiscal year as part of the path because fiscal year is a true ITA hierarchy.

Documents:

```text
/documents?year=2569
```

use fiscal year as a filter because it is metadata rather than primary document hierarchy.

## 15.19 Stable Route Segments

Once a public route segment is established, changing the visible menu label does not require changing the route.

For example, a future UI rename from:

```text
เอกสารเผยแพร่
```

to:

```text
คลังเอกสาร
```

does not require changing:

```text
/documents
```

## 15.20 Internal Model Names Do Not Control Public URLs

Renaming a backend/internal model does not automatically change the public URL.

Example:

```text
HealthService → Facility
```

does not require changing:

```text
/health-services
```

> **Public URLs should be more stable than internal implementation names.**

## 15.21 Duplicate Slugs

Duplicate slugs are allowed because Public ID is the identity.

Example:

```text
/news/N123/ประชุมคปสอ
/news/N456/ประชุมคปสอ
```

No artificial `-2`, `-3` suffix is required merely to guarantee uniqueness.

## 15.22 Sensitive/Internal Identifiers

Do not expose identifiers such as:

- database primary keys
- employee numbers
- internal case numbers
- other internal workflow identifiers

as public resource identity unless explicitly designed as public-safe identifiers.

## 15.23 Filename Is Not Public Identity

Document canonical URL:

```text
/documents/D82M1/แผนปฏิบัติการ-2569
```

is independent from the underlying filename or storage key.

Example file:

```text
plan-final-v3-approved.pdf
```

Storage details may change without changing the canonical Document URL.

## 15.24 File Extensions

Public page routes do not include page file extensions.

Use:

```text
/documents/D82M1/แผนปฏิบัติการ-2569
```

not:

```text
/documents/D82M1/แผนปฏิบัติการ-2569.html
```

Actual file/PDF resource URLs may use their normal file extension where appropriate.

## 15.25 Pagination

Pagination is view state.

Preferred:

```text
/news?page=2
/documents?page=3
```

rather than making pagination part of the primary information hierarchy.

## 15.26 Sorting

Sorting is view state.

Example:

```text
/documents?sort=latest
```

Do not create a dedicated route such as `/documents/latest` unless it later becomes a real curated navigation destination.

## 15.27 Canonical Route Patterns

```text
News
/news/{public-id}/{slug?}

Activity
/activities/{public-id}/{slug?}

Announcement
/announcements/{public-id}/{slug?}

Service
/services/{public-id}/{slug?}

Health Service
/health-services/{public-id}/{slug?}

Health Content
/health/content/{public-id}/{slug?}

Health Report
/health/reports/{public-id}/{slug?}

Document
/documents/{public-id}/{slug?}

Basic Page (fallback only)
/pages/{public-id}/{slug?}

ITA
/ita/{fiscal-year}
/ita/{fiscal-year}/{section-key}

Search
/search?q={query}
```

## 15.28 Deferred to System Blueprint

This Sitemap does not decide:

- UUID vs ULID vs other Public ID format
- Public ID length
- Base32/Base62 representation
- Router library
- URL encoding implementation
- Unicode normalization implementation
- reverse proxy rewrite details
- hosting-specific routing
- CDN behavior

These belong in:

```text
10-system-blueprint.md
```

## 15.29 Accepted URL Convention Summary

```text
URL Convention
├── Static routes = stable semantic English paths
├── Dynamic resources = /resource/{public-id}/{slug?}
├── Public ID = stable identity
├── Slug = readable metadata
├── Canonical dynamic URL normally includes slug
├── Wrong/missing slug resolves by ID then redirects canonical
├── Lowercase Latin paths
├── Hyphen word separators
├── No trailing slash canonical
├── Query = search/filter/pagination/sort state
├── Fragment = in-page location
├── Taxonomy/metadata do not become paths automatically
├── Database PK ≠ Public ID
├── Basic Page fallback = /pages/{public-id}/{slug?}, no public listing
└── Storage filename ≠ Public URL identity
```



# 16. Redirect Rules

## 16.1 Core Principles

> **Redirect only when there is a meaningful equivalent or successor.**

> **Same Public ID always resolves to the same canonical resource.**

> **Lifecycle replacement is not automatically URL replacement.**

> **Legacy WordPress URLs should be explicitly mapped during migration rather than redirected blindly to the homepage.**

> **Redirects should point directly to the current canonical destination whenever possible.**

> **Redirect chains and loops must be prevented.**

> **Redirects preserve continuity; they should not replace a clear sitemap.**

## 16.2 Slug Change with Same Public ID

If the Public ID is valid but the slug is old or incorrect:

```text
/news/N7K2P4/ชื่อข่าวเดิม
```

and the current canonical URL is:

```text
/news/N7K2P4/ข่าวประชาสัมพันธ์ใหม่
```

the resource should resolve by Public ID and redirect to the current canonical URL.

This is canonicalization, not a new resource.

## 16.3 Missing Slug

If a dynamic resource is requested without a slug:

```text
/news/N7K2P4
```

and the resource has a canonical slug, redirect to:

```text
/news/N7K2P4/ข่าวประชาสัมพันธ์ใหม่
```

## 16.4 Route Migration

If a public root/path changes, use an explicit redirect mapping.

Examples:

```text
/public-relations/N123/...
→ /news/N123/...
```

```text
/downloads/D456/...
→ /documents/D456/...
```

Concept:

```text
Old Path
→ New Canonical Path
```

## 16.5 Legacy WordPress URLs

Migration should not use a blanket rule such as:

```text
all legacy URLs → /
```

Instead:

```text
Legacy WordPress URL
        ↓
Find migrated record / meaningful successor
        ↓
Redirect → New canonical URL
```

Examples of legacy forms that may require mapping:

```text
?p=123
/YYYY/MM/DD/post-name/
/category/...
/wp-content/uploads/...
```

## 16.6 Legacy URL with No Exact Equivalent

Decision tree:

```text
Old URL
│
├── มี replacement ชัด
│   → Redirect ไป replacement
│
├── มี parent/category/landing ที่เป็น successor อย่างมีความหมาย
│   → Redirect เมื่อเหมาะสมจริง
│
└── ไม่มี replacement ที่เหมาะสม
    → 404 / Gone ตาม policy
```

Do not redirect unrelated legacy pages to the homepage merely to avoid 404.

## 16.7 Superseded Documents

Superseded documents should retain their historical public page by default.

Example:

```text
Document A
Status = Superseded
```

may remain accessible at its canonical URL with a clear notice:

```text
เอกสารฉบับนี้ถูกแทนที่แล้ว
[ดูฉบับปัจจุบัน]
```

linking to Document B.

Do not automatically redirect every superseded document to its replacement because historical context may matter for:

- ITA
- old news
- historical references
- public records

## 16.8 When a Superseded Resource May Redirect

A redirect may be appropriate as an exception when:

- the old record was created in error
- it is a true duplicate
- the old URL has no historical value
- migration cleanup requires consolidation

But:

```text
Superseded ≠ Redirect by default
```

## 16.9 Unpublished / Hidden Content

Redirect is not the default response when previously public content becomes unpublished or hidden.

Only redirect when there is a clear, meaningful public replacement.

Detailed behavior belongs to the following section:

```text
404 / Gone / Unpublished Behavior
```

## 16.10 Deleted Resource

If a resource is actually removed:

```text
Old URL
│
├── meaningful successor exists
│   → redirect
│
└── no meaningful successor
    → 404 / 410 according to policy
```

Important published content should generally not be hard-deleted without a lifecycle reason.

## 16.11 Redirect Chains

Avoid:

```text
A → B → C → D
```

Prefer:

```text
A → D
B → D
C → D
```

where D is the current canonical destination.

## 16.12 Redirect Loops

Mappings such as:

```text
A → B
B → A
```

or longer circular chains must be prevented.

Redirect configuration should be validated before activation.

## 16.13 One-Hop Canonicalization

Where practical, normalization should resolve directly to the final canonical URL in one redirect.

Example request:

```text
/NEWS/N123/Old-Slug/
```

should ideally normalize directly to:

```text
/news/N123/current-slug
```

rather than requiring multiple redirect hops.

## 16.14 Permanent vs Temporary Redirect

Permanent redirects are appropriate conceptually for:

- slug canonicalization
- permanently moved routes
- WordPress migration mappings
- permanent resource relocation

Temporary redirects should be reserved for genuinely temporary situations.

Exact HTTP status choice (for example 301 vs 308) is deferred to `10-system-blueprint.md`.

## 16.15 Query Parameter Canonicalization

Meaningless/default state may normalize to the clean listing URL.

Examples:

```text
/news?page=1
→ /news
```

```text
/documents?type=all&page=1
→ /documents
```

Meaningful filters remain intact:

```text
/documents?type=form&year=2569
```

## 16.16 Tracking Parameters

Tracking parameters do not create new resource identity.

Example:

```text
/news/N123/slug?utm_source=facebook
```

still represents the canonical resource:

```text
/news/N123/slug
```

Whether tracking parameters are retained during the request for analytics is an implementation concern.

## 16.17 External Redirects

Redirect Registry should primarily map public internal routes to internal canonical destinations.

Open-ended internal-to-external redirect creation should not be the default administrative behavior.

External destinations belong in their appropriate data models, such as:

- Service external destination
- ITA external evidence
- Document/external resource relationship

Restricted external redirect capability may be considered later if a concrete use case exists.

## 16.18 Redirect Registry

Conceptual fields:

```text
Old Path
Destination
Reason
Created At
Created By
Status
```

This does not require a complex redirect-management product.

Useful categories for v1:

```text
Automatic Canonical Redirects
Manual Redirects
Legacy Migration Redirects
```

Automatic slug/case/trailing-slash canonicalization does not need a manual registry row for every occurrence.

## 16.19 Redirect Priority

Conceptual resolution order:

```text
1. Exact canonical route
2. Dynamic resource resolution by Public ID
3. Canonicalize slug / case / trailing slash
4. Explicit Redirect Registry
5. Legacy migration mapping
6. Not-found handling
```

Exact runtime implementation is deferred to the System Blueprint.

## 16.20 WordPress Migration Process

Migration should include:

```text
1. Export legacy URL inventory
2. Map meaningful legacy URLs to new canonical destinations
3. Register redirects before production cutover
```

Legacy URLs should be categorized as:

```text
Direct migrated equivalent
Closest meaningful successor
No replacement
Legacy file/resource
```

Detailed migration procedure belongs in `09-migration-plan.md`.

## 16.21 Legacy Media / PDF URLs

For old WordPress file URLs such as:

```text
/wp-content/uploads/...
```

if the file is migrated into the Document model, map according to user intent and historical use.

Preferred default when the intent is to access a published document:

```text
old PDF URL
→ Document Detail
```

A direct file-to-file mapping may be retained where direct file access is materially important.

Specific mapping decisions belong in the Migration Plan.

## 16.22 Redirects Are Not an IA Substitute

Do not create large alias networks to compensate for unclear sitemap ownership.

> **Redirects preserve continuity; they should not replace clear Information Architecture.**

## 16.23 Accepted Redirect Summary

```text
Redirect Rules
├── Slug mismatch → canonical resource URL
├── Missing slug → canonical resource URL
├── Route moved → explicit permanent redirect
├── Legacy WordPress URL → mapped canonical destination
├── Superseded document → keep historical page by default
├── No meaningful successor → do not force redirect
├── Avoid redirect chains
├── Prevent redirect loops
├── Normalize to final canonical in one hop where possible
├── Query defaults may canonicalize
└── Redirects preserve continuity, not replace sitemap design
```



# 17. 404 / Gone / Unpublished Behavior

## 17.1 Core Principle

Not Found, Unpublished, Gone, Archived, Expired and Superseded are different states and must not be treated as the same thing.

Conceptual decision tree:

```text
Public URL Request
│
├── Resource exists and is Public
│   → Render normally
│
├── Resource moved to a meaningful successor
│   → Redirect
│
├── Never existed / invalid URL / Public ID not found
│   → 404 Not Found
│
├── Exists but Draft / Hidden / Internal / Temporarily Unpublished
│   → Public Not Found behavior
│
├── Permanently Withdrawn with no meaningful successor
│   → Gone
│
└── Historical resource should remain public
    → Render Historical Page with lifecycle status
```

## 17.2 404 Not Found

Unknown, invalid, or non-existent public URLs should return Not Found behavior.

Examples:

```text
/news/ABC999/...
/abc/xyz
```

Do not blindly redirect unknown URLs to the homepage.

> **Unknown is not the same as Home.**

## 17.3 Draft Content

Draft records must not reveal their existence through the public site.

Public requests to a draft resource should behave as Not Found.

Do not expose messages such as:

```text
This content is still Draft.
You do not have permission to view this content.
```

on the public website.

> **Unpublished content should not leak its existence through the public site.**

## 17.4 Hidden / Internal Content

Hidden/Internal content follows the same public behavior as Draft content.

Public users should receive neutral Not Found behavior rather than internal lifecycle or permission details.

## 17.5 403 Is Not the Default for Public CMS Content

Version 1 should not use 403 merely because a CMS record is Draft, Hidden, or Internal.

For public CMS content:

```text
Draft / Hidden / Internal
→ Not Found behavior
```

If a future authenticated Staff Portal exists, 401/403 behavior may be designed separately.

## 17.6 Authenticated CMS Preview

Staff preview of Draft content is separate from the public route.

Concept:

```text
Admin CMS
→ authenticated preview
→ Draft Content
```

Public routes must not expose Draft content through a simple unrestricted preview query parameter.

Preview authentication details belong in `05-admin-cms.md` and `10-system-blueprint.md`.

## 17.7 Gone / Permanently Withdrawn

A resource that was previously public but has been intentionally and permanently withdrawn with no meaningful successor may use Gone semantics.

Conceptually:

```text
404
= resource not found / unknown

Gone
= resource was known but has been permanently removed
```

Exact HTTP implementation may use `410 Gone`; implementation details belong in the System Blueprint.

## 17.8 Public Gone Message

Public messaging should remain neutral and should not reveal internal reason codes or admin details.

Example:

```text
เนื้อหานี้ไม่มีให้บริการแล้ว

เนื้อหาที่คุณเปิดอาจถูกนำออกหรือไม่มีการเผยแพร่แล้ว
```

Useful recovery actions may include:

- Global Search
- Homepage
- Documents
- Contact

If a meaningful successor exists, Redirect Rules take precedence.

## 17.9 Temporarily Unpublished vs Gone

Do not treat temporary unpublishing as permanent removal.

```text
Temporarily Unpublished
→ Public Not Found behavior

Permanently Withdrawn
→ Gone behavior
```

## 17.10 Archived

Archived does not mean removed.

Historical content may remain accessible through its canonical URL while being excluded from current/featured listings.

```text
Archived
≠ Unpublished
≠ Gone
```

## 17.11 Expired Document

Expired documents may retain their canonical page when historical value exists.

The page may display:

```text
เอกสารนี้หมดอายุแล้ว
```

and, where available:

```text
[ดูเอกสารฉบับปัจจุบัน]
```

Expired does not automatically mean 404 or redirect.

## 17.12 Superseded Document

Superseded documents may remain public as historical resources.

```text
เอกสารฉบับนี้ถูกแทนที่แล้ว
[ดูฉบับปัจจุบัน]
```

This follows the accepted Redirect Rules:

```text
Superseded ≠ Redirect by default
```

## 17.13 Health Service Status

### Temporarily Closed

```text
Status = Temporarily Closed
→ Detail Page remains public
→ Display status clearly
```

### Inactive

If historically public and still useful for references, an Inactive Health Service may retain a public detail page with a clear status.

A replacement facility may be linked when real data exists.

Do not 404 a previously public facility merely because service status changed.

## 17.14 Announcement Lifecycle

Closed or Expired Announcements may remain public.

Example:

```text
ปิดรับสมัครแล้ว
```

They should no longer appear as current announcements by default but remain useful for public transparency/history.

## 17.15 ITA Historical Content

Historical ITA years remain publicly accessible.

```text
/ita/{fiscal-year}
```

must not disappear merely because a new fiscal year begins.

> **Preserve history; improve forward.**

Removal should occur only for a legitimate reason such as incorrect/publicly inappropriate disclosure.

## 17.16 Withdrawn ITA Evidence

If an ITA Evidence Document becomes unavailable, the ITA page should not contain a broken link.

It may show neutral status such as:

```text
เอกสารรายการนี้ไม่มีให้บริการแล้ว
```

or link to a replacement when one exists.

Do not fabricate duplicate evidence solely to keep the directory visually complete.

## 17.17 Helpful 404 Page

The public 404 page should be a recovery page, not only an error code.

Recommended structure:

```text
ไม่พบหน้าที่คุณต้องการ

URL อาจไม่ถูกต้อง หรือหน้าอาจถูกย้าย/นำออก

[ค้นหาเว็บไซต์]

ทางลัด
├── หน้าแรก
├── บริการประชาชน
├── ค้นหาหน่วยบริการสุขภาพ
├── เอกสารเผยแพร่
└── ติดต่อเรา
```

## 17.18 Global Search on Error Pages

404/Gone recovery should prominently support Global Search so users arriving from legacy bookmarks or external links can continue their task.

## 17.19 Search Visibility

Search must respect public visibility.

Records in these states should not appear as normal public search results:

```text
Draft
Hidden
Internal
Temporarily Unpublished
Gone
```

Avoid unnecessary Search Result → 404 flows caused by stale internal indexing.

## 17.20 Response Semantics

A Not Found page must use Not Found response semantics rather than returning a successful page response with an error message.

Avoid Soft 404 behavior.

Likewise, a known permanently withdrawn resource may use Gone semantics rather than a successful page response.

Exact HTTP implementation belongs in `10-system-blueprint.md`.

## 17.21 Missing File Resource

If a Document Detail still exists but its underlying file is unavailable, the page should not show a broken Download action.

The public page should show an appropriate status or replacement relationship.

Storage consistency validation belongs in CMS/Blueprint design.

## 17.22 Public ID Reassignment Is Forbidden

A Public ID that has once been issued to a resource must never be reassigned to a different resource.

Example:

```text
/news/N123/...
```

once belonged to Resource A.

Even if A becomes Gone, `N123` must never be assigned to Resource B.

> **A public identity, once issued, must never be reassigned to another resource.**

Slug reuse remains allowed because Slug is not identity.

## 17.23 Retired Route / Section

If an entire route or section is retired:

```text
Old Route
│
├── meaningful successor exists
│   → Redirect
│
└── no meaningful successor
    → 404 / Gone according to known lifecycle
```

Do not blindly redirect a retired subtree to the homepage.

## 17.24 Public Security Boundary

Public error handling must not reveal:

- whether a Draft record exists
- hidden/internal lifecycle details
- admin workflow
- permission configuration
- hidden metadata

```text
Admin Lifecycle State
≠
Public Error Message
```

## 17.25 Admin Visibility

Admin CMS may show precise internal states such as:

```text
Draft
Hidden
Withdrawn
Removed
Superseded
Expired
```

Public responses do not need to expose those same labels.

## 17.26 Post-Migration 404 Monitoring

After WordPress migration, monitoring common 404 URLs is useful for discovering missed redirect mappings.

Detailed monitoring belongs in `09-migration-plan.md`; it is not a requirement to build a new analytics platform.

## 17.27 Status Vocabulary Boundary

คำอย่าง `Temporarily Unpublished` และ `Permanently Withdrawn` ในส่วนนี้เป็น **public-handling conditions / semantic conditions** สำหรับอธิบายพฤติกรรมของ URL ไม่ได้เป็นการบังคับเพิ่ม CMS lifecycle enum ใหม่ใน `02-content-model.md`

เช่นเดียวกัน สถานะการเปิด/ปิดของ Health Service ใน Sitemap นี้อธิบาย public behavior เชิงความหมาย ส่วนชื่อ Status/Enum ฉบับละเอียดของแต่ละ Content Type ยังคงเป็นเรื่องของ `05-admin-cms.md` / `10-system-blueprint.md` ตามข้อกำหนดจริง

ดังนั้น Sitemap Freeze นี้ไม่ยกเลิก Pending Decision เดิมของ Content Model เรื่อง **Detailed Status Rules ต่อ Content Type**.

## 17.28 Public Behavior Matrix

| Resource State / Public Condition | Public Behavior |
|---|---|
| Published / Active | แสดงปกติ |
| Archived | แสดง Historical Page |
| Expired | แสดงพร้อมสถานะหมดอายุ |
| Superseded | แสดงพร้อม Link ไปฉบับใหม่ |
| Temporarily Closed | แสดงพร้อมสถานะ |
| Draft | Not Found |
| Hidden / Internal | Not Found |
| Temporarily Unpublished | Not Found |
| Permanently Withdrawn | Gone |
| Never Existed | 404 |
| Moved with successor | Redirect |
| Deleted with successor | Redirect |
| Deleted without successor | Gone / 404 ตาม known lifecycle |

## 17.29 Deferred Implementation Details

The Sitemap does not decide:

- exact presentation component for public error states
- exact HTTP middleware implementation
- 404 logging technology
- 301 vs 308 specifics
- exact 410 implementation
- CDN caching behavior
- admin preview token format
- robots/canonical-tag implementation

These belong in:

```text
05-admin-cms.md
09-migration-plan.md
10-system-blueprint.md
```

as appropriate.

## 17.30 Accepted Error / Lifecycle Principles

> **Not Found, Unpublished, Gone, Archived, Expired and Superseded are different states and must not be treated as the same thing.**

> **Draft, Hidden and temporarily Unpublished content must not reveal their existence on the public website.**

> **Archived, Expired and Superseded resources may retain their canonical public pages when historical value exists.**

> **A permanently withdrawn resource with no meaningful successor may use Gone semantics rather than a misleading redirect.**

> **404 and Gone pages must provide useful recovery paths, especially Global Search, key services and Contact.**

> **Do not redirect unknown or removed URLs blindly to the homepage.**

> **A Public ID, once issued, must never be reassigned to another resource.**

> **Public error behavior must not expose internal CMS workflow or permissions.**


# 18. Consolidated Sitemap — Final

```text
/
│
├── /about
│   ├── /about/organization
│   ├── /about/leadership
│   ├── /about/personnel
│   ├── /about/policies
│   ├── /about/plans
│   └── /about/results
│
├── /news
│   ├── /news/health
│   └── /news/{public-id}/{slug?}
│
├── /activities
│   └── /activities/{public-id}/{slug?}
│
├── /announcements
│   └── /announcements/{public-id}/{slug?}
│
├── /services
│   └── /services/{public-id}/{slug?}
│
├── /health-services
│   └── /health-services/{public-id}/{slug?}
│
├── /health
│   ├── /health/content
│   │   └── /health/content/{public-id}/{slug?}
│   └── /health/reports
│       └── /health/reports/{public-id}/{slug?}
│
├── /dashboard
│
├── /documents
│   └── /documents/{public-id}/{slug?}
│
├── /pages/{public-id}/{slug?}    # Basic Page fallback only; no /pages listing
│
├── /ita
│   ├── /ita/{fiscal-year}
│   └── /ita/{fiscal-year}/{section-key}
│
├── /search
│
└── /contact
```

---

# 19. Final Consistency Review

ก่อน Freeze ได้ตรวจเทียบ Sitemap ฉบับนี้กับ Baseline ที่ Freeze แล้ว:

- `00-website-foundation.md`
- `01-information-architecture.md`
- `02-content-model.md`

ผลการตรวจ:

1. Main Navigation ยังคง Citizen First และไม่ map 1:1 กับ Information Domains หรือ Content Types
2. Health Service Directory เป็น Directory แยกจาก Organization และ Service Catalog
3. Service, Document Resource และ Health Service Discovery ไม่ถูกผสมเป็น Entity เดียวกัน
4. News, Activity, Announcement และ Health Content มี canonical ownership แยกกัน
5. “ข่าวสุขภาพ” ยังคงเป็น News View/Filter ไม่ใช่ Content Type ใหม่
6. Document Center ยังคง Single Source of Truth และรองรับ reuse ใน About, Service, Health Report และ ITA
7. Health Report ยังคงเป็น Metadata + Report Document และไม่กลายเป็น Analytical Dataset
8. Dashboard ยังคงเป็น Data Domain แยกที่ `/dashboard`; ไม่มี Health Metric CMS model ถูกเพิ่มกลับเข้ามา
9. ITA ยังคง Fiscal Year → MOIT / Section → Requirement / Item → Evidence และไม่เพิ่ม Compliance Engine
10. ITA Historical Evidence ยังคงเปิดดูได้ตามหลัก Preserve history; improve forward
11. Area, Topic, Audience, Source และ Fiscal Year นอก ITA ไม่ถูกยกเป็น URL hierarchy โดยอัตโนมัติ
12. Contact Information ยังคงเป็น structured reusable data
13. Search เป็น Cross-Content discovery และไม่เป็นเจ้าของ canonical content
14. Breadcrumb ใช้ public information hierarchy ไม่ derive จาก URL segments แบบตรงตัว
15. URL identity แยก Public ID ออกจาก Title/Slug และไม่ผูกกับ Database PK
16. Redirect ไม่ถูกใช้เพื่อกลบ IA ที่ไม่ชัด และ legacy WordPress URLs ต้อง map อย่างมีความหมาย
17. Archived / Expired / Superseded ไม่ถูกตีความเป็น Deleted โดยอัตโนมัติ
18. Draft / Hidden / Internal content ไม่เปิดเผย existence ผ่าน public error behavior
19. Basic Page มี canonical fallback route `/pages/{public-id}/{slug?}` แต่ไม่มี listing/navigation hub และยังคง fallback-only
20. Footer / Quick Links ไม่สร้าง route ownership หรือ repository ใหม่
21. Public error-handling conditions ไม่ถูกตีความเป็นการเพิ่ม CMS status enum ใหม่
22. ไม่มี route duplication ที่ทำให้ content record เดียวมี canonical detail URL หลายชุด

### Adjustments Made During Final Review

Final Review พบและแก้ไขประเด็นต่อไปนี้ก่อน Freeze:

- แก้ News Detail breadcrumb จาก `หน้าแรก > ข่าวสาร > ข่าวประชาสัมพันธ์ > ชื่อข่าว` เป็น `หน้าแรก > ข่าวสาร > ชื่อข่าว` เพราะ `/news` เป็นทั้ง Communication Hub และ News Listing อยู่แล้ว และไม่มี route “ข่าวประชาสัมพันธ์” แยกอีกชั้น
- เพิ่ม Basic Page canonical fallback route `/pages/{public-id}/{slug?}` โดยไม่มี `/pages` listing เพื่อให้ Basic Page ที่เผยแพร่และค้นเจอมี canonical destination โดยไม่ขยาย scope
- ระบุชัดว่า `Temporarily Unpublished` / `Permanently Withdrawn` เป็น public-handling conditions ไม่ใช่การเพิ่ม Content Model lifecycle enum
- เพิ่ม related official agencies/channels เป็น optional curated section ใน `/contact` เพื่อครอบคลุม IA Domain 8 โดยไม่สร้าง Contact Repository ใหม่
- กำหนด Footer / Quick Links เป็น presentation/navigation layer ที่ reuse canonical destinations และ defer composition ไป `04-homepage.md`
- ล้างรายการ Pending ที่ถูกปิดแล้วจาก Working Draft

### Review Result

**PASS — No blocking conflict remains between 00 / 01 / 02 and 03.**

ไม่มีการเพิ่ม Content Type ใหม่, Analytical Metric Model ใหม่, ITA Compliance Engine, Service Transaction Platform หรือ Navigation depth ที่เกินขอบเขต Version 1.

---

# 20. Decision Status / Freeze

## 20.1 Frozen Sitemap Decisions

Sitemap Baseline v2.0 ถือว่า Freeze แล้วในประเด็นต่อไปนี้:

- Main Navigation และ Utility Navigation
- Public route ownership
- Homepage route
- About routes
- News / Activity / Announcement routes
- Service Hub / Service Detail
- Health Service Directory
- Health Information / Health Content / Health Report
- Dashboard entry `/dashboard`
- Document Center
- ITA hierarchy
- Contact
- Global Search
- Breadcrumb hierarchy
- Public ID / Slug URL convention
- Query / Fragment conventions
- Redirect principles
- 404 / Gone / Unpublished public behavior
- Basic Page fallback route

## 20.2 Intentionally Deferred

การ Freeze Sitemap ไม่ได้ Freeze รายละเอียดต่อไปนี้:

- exact Public ID format (UUID / ULID / opaque ID)
- exact search ranking, synonyms, typo tolerance, Thai segmentation
- exact Service Inventory / category taxonomy
- exact Health Service status enum
- detailed status enum per Content Type
- exact HTTP redirect code choice (301 vs 308)
- exact preview authentication mechanism
- exact Footer link composition
- Dashboard internal route structure beyond `/dashboard`
- WordPress URL-by-URL migration mapping
- API / Database / Router implementation
- visual layout and responsive components

หัวข้อเหล่านี้จะถูกกำหนดในเอกสารลำดับถัดไปตามความเหมาะสม โดยต้องไม่ขัดกับ Sitemap Baseline นี้

## 20.3 Change Control

Freeze หมายถึง **Approved Baseline for downstream documents** ไม่ใช่ immutable forever.

หาก Requirement จริงเปลี่ยนในอนาคต:

1. เสนอ revision
2. ระบุเหตุผล
3. ทำ impact review ต่อ `00–03` และเอกสาร downstream ที่เกี่ยวข้อง
4. ออก version ใหม่เมื่อได้รับการยืนยัน

---

# 21. Sitemap Foundation Statement

> **The public sitemap is citizen-first, canonical by ownership, stable by identity, and intentionally simpler than the underlying data model.**

> **Navigation helps people discover information; canonical routes define where information belongs.**

> **Structured data may be reused across many public contexts without duplicating ownership or content.**

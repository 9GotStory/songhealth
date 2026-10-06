# Homepage — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 04-homepage
> **Status:** CLEAN REBASELINE v2.1 — CURRENT
> **Version:** 2.1
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`
> **Purpose:** กำหนด Content Architecture, Information Priority, Homepage Curation, Responsive Behavior, Fallback และ Accessibility ของหน้าแรกเว็บไซต์ โดยไม่ลงรายละเอียดระดับโค้ดหรือ Visual Design System
> **Clean Rebaseline Rule:** เอกสารใน `current/` ต้องอธิบายคำตอบปัจจุบันเพียงชุดเดียว; ประวัติ implementation/architecture เก่าเก็บใน Git history/archival branch และไม่ใช้เป็น authority ของระบบใหม่
> **Technology Ownership:** Homepage composition, eligibility and accessibility are presentation requirements independent of frontend framework.

---
## 1. Purpose

เอกสารนี้กำหนด Content Architecture และ Information Priority ของหน้าแรกเว็บไซต์ โดยยึด User Task และ Public Information Priority เป็นหลัก ไม่ยึด Content Type หรือโครงสร้างฐานข้อมูลเป็นตัวตั้ง

Homepage ไม่ใช่:

- Dashboard
- Archive
- Sitemap เต็มรูปแบบ
- หน้าแสดงทุก Content Type
- Portal รวมลิงก์จำนวนมากโดยไม่มีลำดับความสำคัญ

Core Role:

> **Homepage คือจุดเริ่มต้นสำหรับประชาชนในการ “ค้นหาเรื่องสำคัญ → เข้าถึงบริการ → รับรู้ข่าวสาร → ไปยังข้อมูลหรือหน่วยบริการที่ต้องการ”**

---

---

## 2. Homepage Principles

Accepted principles:

1. Citizen First
2. Mobile First
3. Search remains a First-Class Feature
4. Homepage surfaces priority; catalog/listing pages provide completeness
5. Featured is not a Content Type
6. Featured ≠ Latest
7. Public UX may group data from different backend models when useful
8. Reuse structured content; do not duplicate source data
9. Avoid maintenance-heavy homepage patterns without a real workflow
10. Avoid over-engineering and portal clutter
11. User Task has priority over institutional/internal structure
12. Homepage should remain Simple — Structured — Sustainable
13. Do not over-engineer; complexity must be justified by a real user need or operational requirement

---

---

## 3. Header / Navigation

Homepage header uses the current public navigation:

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

Accepted behavior:

- Logo links to `/`
- “หน้าแรก” explicitly links to `/`
- Search must remain easy to access
- On mobile, Search should not be buried unnecessarily deep inside navigation
- Header should remain concise and task-oriented

---

---

## 4. Homepage Anti-Patterns for v1

Do not include by default:

- auto-playing Hero Carousel
- visitor counter
- weather widget
- clock widget
- “ผู้เข้าชมวันนี้”
- stock ticker
- live social feed embed
- large external logo walls
- persistent popups on every visit
- chatbot
- large KPI/Dashboard strip
- full personnel directory
- full organization chart
- long PDF lists
- one homepage section for every content type

These may be reconsidered only if a real use case exists.

---

---

## 5. Homepage Priority Model

## Priority 1 — User Task

```text
Search
Services
Health Service Directory
Urgent / Featured Information
```

## Priority 2 — Current Information

```text
News
Announcements
Health Content
Activities
```

## Priority 3 — Institutional / Reference

```text
Documents
ITA
Dashboard
Contact
Related Digital Channels
```

This model guides what appears above the fold and what may appear lower on the homepage.

---

---

## 6. Homepage v1 Structure

```text
Homepage
│
├── Header
│   ├── Identity
│   ├── Main Navigation
│   ├── Search
│   └── Contact Utility
│
├── Urgent Alert (optional; normally off)
│
├── Featured / Priority
│   ├── Main Featured — 1 when section is rendered
│   └── Secondary Featured — 0–3
│
├── Frequently Used Services
│
├── Latest Communication
│   ├── Latest News
│   └── Announcements
│
├── Health Information
│   └── Curated Health Content
│
├── Health Service Discovery
│   ├── Search / Area Entry
│   └── Selected Related Facilities (optional)
│
├── Activities
│
├── Quick Access
│   ├── Documents
│   ├── ITA
│   ├── Dashboard
│   └── Related Digital Destination (optional)
│
├── Contact Summary / Map
│
└── Footer
```

This structure is fixed at the Information Architecture level for Version 1. Editors curate priority content; they do not rebuild or reorder the Homepage layout.

Dashboard remains a linked analytical destination and is not rebuilt as KPI widgets on the Homepage.

---

## 7. Featured / Priority Area

Accepted structure:

```text
Homepage
├── Urgent Alert (optional, normally off)
└── Featured / Priority Area
    ├── Main Featured Item — 1 item when the Featured Area is rendered
    └── Secondary Featured Items — 0–3 items
```

### 7.1 Featured Rules

- When the Featured Area is rendered, it has exactly one Main Featured item.
- Secondary Featured supports zero to three items.
- Featured is selective, not exhaustive.
- Featured is curation, not a Content Type.
- Featured changes presentation priority, not canonical ownership.
- Featured configuration references an existing public/eligible source rather than duplicating it.
- Primary candidates: News, Announcement, Health Content, Service, Activity.
- Conditional candidates: Health Report, Basic Page.
- Personnel, Organization, Contact, ITA Requirement, and raw Document resources are not Featured by default.

### 7.2 Canonical Ownership

Featured does not create `/featured/{id}` or duplicate public pages.

Examples:

```text
Announcement → /announcements/{slug}
Health Content → /health/content/{slug}
Service → /services/{slug}
```

### 7.3 CMS Curation

Preferred workflow:

```text
Select existing content
→ Set as Featured
→ Choose Main or Secondary
→ Optional schedule
→ Publish
```

Accepted conceptual configuration:

```text
Featured Configuration
├── Source Content
├── Position
├── Sort Order
├── Start At (optional)
├── End At (optional)
├── Display Title Override (optional)
├── Summary Override (optional)
├── Image Override (optional)
└── CTA Label Override (optional)
```

Destination remains the canonical source content URL.

### 7.4 Presentation Overrides

Homepage-only overrides may be used for Display Title, Short Summary, Featured Image, and CTA Label.

They do not alter canonical content.

CTA defaults should normally derive from content type.

### 7.5 Featured Image

Image priority:

```text
1. Featured Image Override
2. Source Cover Image
3. Default Content-Type Visual
```

Title, summary, and CTA should normally be HTML text rather than embedded inside images.

### 7.6 Scheduling and Staleness

- `Start At` and `End At` are optional.
- When `End At` is reached, Featured presentation stops; source content lifecycle remains unchanged.
- CMS may provide a lightweight stale-featured warning (for example after an unusually long period), but this is not an automatic removal rule or approval workflow.

### 7.7 Fallback

If no valid curated Main Featured exists, Homepage uses a deterministic and intentionally narrow fallback:

```text
Latest eligible News
```

The fallback News must be Published/Public/lifecycle-valid and suitable for presentation.

If no eligible News exists, hide the Featured Area rather than inventing a cross-type ranking rule.

Announcement, Health Content, Service, Activity, Health Report, and Basic Page may still be manually selected as Featured; they do not participate in automatic Main Featured fallback in Version 1.

Do not use AI ranking, random selection, or complex cross-type scoring.

Secondary slots do not need forced fallback content; layout adapts to 0–3 valid items.

> **Fallback should be predictable, not clever.**

### 7.8 Urgent Alert

Urgent Alert is separate from Featured:

```text
Urgent Alert = must be seen immediately
Featured = important content the office wants users to notice
```

Urgent Alert is normally off and activated only for genuine urgent conditions such as temporary closure, disaster/emergency notice, urgent public-health warning, or emergency service-channel change.

Urgent Alert is a Homepage presentation configuration that references an existing canonical public source (normally Announcement, Service, or News) and may use limited Homepage-only display overrides plus optional Start/End scheduling.

Do not create a separate `UrgentAlert` Content Type, independent content repository, or emergency workflow.

This does not create an Emergency Management System.

### 7.9 Mobile and Carousel

- Mobile preserves hierarchy: Main Featured first, then Secondary items.
- Main Featured retains title, useful summary, and CTA.
- Auto-rotating Hero Carousel is not part of Version 1.
- If a carousel is ever introduced later, it must be user-controlled, keyboard-accessible, pauseable, and should not auto-advance by default.

### 7.10 Source Visibility

Featured visibility can never exceed source-content visibility or lifecycle.

If source content becomes Hidden, Unpublished, Expired/Closed, or otherwise ineligible, it must disappear from active Homepage Featured presentation.

Avoid Featured card → 404 behavior.

### 7.11 Search and SEO

- Featured status does not automatically change Global Search ranking.
- Featured creates no additional canonical URL.
- Homepage links directly to canonical source content.

### 7.12 Slot Flexibility

Do not bind slots permanently by Content Type.

Slots remain flexible subject to Featured eligibility rules.

### 7.13 Accepted Principles

> **When the Featured Area is rendered, it has exactly one Main Featured item; Secondary Featured supports zero to three items.**

> **Featured is curation, not a content type.**

> **Featured changes presentation priority, not canonical ownership.**

> **Presentation overrides are optional and homepage-only.**

> **Scheduling is supported but not mandatory.**

> **Featured visibility can never exceed source-content visibility/lifecycle.**

> **Fallback is deterministic and simple.**

> **Urgent Alert is separate from Featured and normally off.**

> **Auto-rotating Hero Carousel is not part of Version 1.**

---

## 8. Frequently Used Services

### 8.1 Core Role

Frequently Used Services is homepage curation for user tasks, not a second Service Catalog.

> **Homepage groups by user intent; the data model remains domain-correct.**

The homepage may group together destinations from different backend models when they represent common citizen tasks.

### 8.2 Version 1 Scale

Use approximately four to six priority entries, with a maximum of six in Version 1.

```text
บริการประชาชน
“คุณต้องการทำอะไร?”

├── ร้องเรียน / เสนอแนะ
├── แจ้งปัญหาด้านสุขภาพ
├── บริการสำหรับ อสม.
├── ขอข้อมูลหรือเอกสารจากสำนักงาน
├── ค้นหาหน่วยบริการสุขภาพ
└── คู่มือและแบบฟอร์ม

[ดูบริการทั้งหมด]
```

Do not force all six positions to be filled.

### 8.3 User-Task Ownership

Homepage entries may point to different canonical destinations:

```text
ร้องเรียน / เสนอแนะ
→ Service

แจ้งปัญหาด้านสุขภาพ
→ Service

บริการสำหรับ อสม.
→ Service Catalog View

ขอข้อมูลหรือเอกสาร
→ Service

ค้นหาหน่วยบริการสุขภาพ
→ Health Service Directory

คู่มือและแบบฟอร์ม
→ Document Filtered View
```

Do not change backend ownership merely to make every homepage entry a Service record.

### 8.4 Naming

Do not label the whole section “บริการออนไลน์” because several useful citizen tasks are not fully online.

Preferred public framing:

```text
บริการประชาชน
คุณต้องการทำอะไร?
```

### 8.5 Curation Model

Manual curation is the default.

Do not automatically show:

- the six newest services
- click-popularity ranking
- AI-ranked services

Preferred configuration:

```text
Homepage Service Curation
├── Selected Entry
├── Sort Order
└── Active / Inactive
```

The selection should reflect citizen need rather than publication recency.

### 8.6 Initial Default Set

A configurable initial baseline may be:

```text
1. ร้องเรียน / เสนอแนะ
2. แจ้งปัญหาด้านสุขภาพ
3. ค้นหาหน่วยบริการสุขภาพ
4. บริการสำหรับ อสม.
5. คู่มือและแบบฟอร์ม
6. ขอข้อมูลหรือเอกสารจากสำนักงาน
```

This is an initial configuration, not a permanent hard-coded order.

### 8.7 Task-Oriented Ordering

Do not organize homepage services according to internal office structure such as administrative groups or technical divisions.

Use citizen language and action-oriented labels.

Examples:

```text
ฉันต้องการร้องเรียน
ฉันต้องการแจ้งปัญหาสุขภาพ
ฉันต้องการหาหน่วยบริการ
ฉันต้องการแบบฟอร์ม
```

### 8.8 Card Content

Homepage service/task cards should remain concise.

Preferred card:

```text
[Icon]

Task / Service Name

Short one-line description

→
```

The homepage card helps the user choose.

The destination page contains:

- detailed steps
- owner/provider
- channel
- required documents
- hours
- other operational guidance

> **Homepage card helps users choose; destination page helps users complete the task.**

### 8.9 Icons

Icons are visual cues, not the sole meaning of a card.

Every entry must have a clear text label.

Avoid icon-only navigation.

Use a consistent website icon system rather than making external service logos the default service-navigation style.

### 8.10 External Destinations

Internal destinations are preferred for the Version 1 priority set.

If an important entry opens an external service, indicate this clearly before the user clicks.

Example:

```text
เปิดบริการภายนอก ↗
```

External service ownership/provider should remain clear.

### 8.11 Scheduling

Frequently Used Services changes less often than Featured content.

Version 1 does not require scheduling complexity by default.

Accepted minimum:

```text
Selected
Sort Order
Active / Inactive
```

Temporary campaigns are better handled through Featured/Priority unless a real service-curation scheduling use case emerges.

### 8.12 Source Visibility and Validity

Homepage visibility can never exceed the source destination’s public availability.

If a selected Service becomes inactive/unpublished or a selected destination becomes unavailable, remove that entry from active homepage presentation.

Avoid homepage entry → 404 behavior.

### 8.13 No Forced Automatic Replacement

If one of six curated entries becomes unavailable, it is acceptable to show five entries.

Do not automatically fill the gap with the newest or unrelated service.

CMS may notify staff that a curated entry is unavailable so they can deliberately select a replacement.

> **Missing curated service is better than an irrelevant automatic replacement.**

### 8.14 “ดูบริการทั้งหมด”

The section always provides a clear path to the complete Service Hub:

```text
ดูบริการทั้งหมด →
/services
```

Homepage curation does not replace the Service Catalog.

### 8.15 Mobile Presentation

Priority services should remain directly visible on mobile.

Preferred options:

- two-column compact cards when labels/descriptions remain readable
- one-column cards when more explanatory text is needed

Do not rely on a horizontal carousel as the primary way to discover frequently used services.

### 8.16 Accepted Principles

> **Frequently Used Services contains approximately four to six entries, with a maximum of six in Version 1.**

> **Manual curation is the default; Latest, Popularity, or AI ranking is not used automatically.**

> **Homepage may group Service, Directory, and Document View destinations according to user tasks.**

> **Backend ownership remains domain-correct and is not changed for homepage convenience.**

> **The initial set is configurable, not permanently hard-coded.**

> **Cards use clear text labels, concise descriptions, icons, and canonical destinations.**

> **Internal destinations are preferred; external destinations are clearly indicated.**

> **There is no forced automatic fallback when a curated item becomes unavailable.**

> **Source visibility and destination validity remain authoritative.**

> **“ดูบริการทั้งหมด” always links to `/services`.**

> **Icon-only menus and horizontal service carousels are not the primary navigation pattern.**

---

## 9. Latest Communication

### 9.1 Core Role

Homepage communication separates:

```text
Latest Communication
├── ข่าวประชาสัมพันธ์ล่าสุด
│   └── News
└── ประกาศ
    └── Announcement
```

Activities remain a separate visual homepage section.

> **Homepage Communication should help users distinguish “what happened” from “what they need to know or act on.”**

### 9.2 News

Homepage News uses automated latest-published ordering rather than manual curation.

Preferred scale:

```text
ข่าวประชาสัมพันธ์ล่าสุด
├── News 1
├── News 2
├── News 3
└── News 4 (optional)

[ดูข่าวทั้งหมด]
```

Version 1 shows approximately 3–4 items.

Destination:

```text
/news
```

> **Featured is curated; Latest News is automated.**

### 9.3 Featured Deduplication

If a News item is already displayed in a higher-priority Featured position, do not repeat the same editorial item again in Latest News.

The same rule applies to:

- Announcement
- Health Content
- Activity

when the same item is already surfaced higher on the homepage.

### 9.4 Announcement

Announcement is distinct from News because it often communicates:

- an action
- a deadline
- an official notice
- a current service/status condition

Preferred scale:

```text
ประกาศ
├── Announcement 1
├── Announcement 2
├── Announcement 3
└── Announcement 4 (optional)

[ดูประกาศทั้งหมด]
```

Version 1 supports 0–4 current items.

### 9.5 Announcement Ordering

Homepage Announcement prioritizes current public relevance.

Concept:

```text
Current Published Announcements
        ↓
order by relevant/publication date
```

Closed or Expired Announcements do not appear in the current homepage block by default.

> **Announcements prioritize current public relevance, not merely publication recency.**

### 9.6 No Complex Announcement Ranking

Version 1 does not use:

- urgency scores
- AI ranking
- weighted deadline algorithms
- custom homepage sticky ranking

If an Announcement requires higher attention:

- use Featured
- or use Urgent Alert when genuinely urgent

### 9.7 Announcement Presentation

Announcement cards may emphasize:

- announcement type
- title
- published date
- deadline/end date when applicable
- current status

Announcement does not require a cover image.

A clean text/icon/category treatment is acceptable.

### 9.8 Health News

Health News remains News.

It may naturally appear in Latest News according to News ordering.

Do not create another homepage “Health News” section merely because `/news/health` exists.

Evergreen health knowledge remains in the separate Health Information section.

### 9.9 Announcement Type

Announcement Type is shown as metadata/badge where useful.

Examples:

```text
[รับสมัครงาน]
[จัดซื้อจัดจ้าง]
[ประกาศทั่วไป]
```

Do not split the homepage into multiple Announcement-type sections.

### 9.10 No Active Announcements

If no current Announcement is available, the homepage does not need to display a large empty block.

Preferred behavior:

- hide/collapse the Announcement sub-block
- allow the communication layout to adapt

Historical Announcements remain available through `/announcements`.

### 9.11 News Fallback

News does not have the same expiry behavior as Announcements.

If no very recent News exists, display the latest valid Published News available.

Use the label:

> **ข่าวประชาสัมพันธ์ล่าสุด**

not time-sensitive labels such as “ข่าววันนี้”.

### 9.12 Dates

Use clear absolute dates as the primary public date presentation.

News:

```text
เผยแพร่ 12 ส.ค. 2569
```

Announcement:

```text
เผยแพร่ 10 ส.ค. 2569
เปิดรับถึง 20 ส.ค. 2569
```

Relative dates such as “2 วันที่แล้ว” should not replace the official absolute date.

### 9.13 “New” Badge

Version 1 does not require a manually managed `NEW` badge.

Published dates are sufficient and lower maintenance.

If a New indicator is introduced later, it should be time-derived rather than manually left active indefinitely.

### 9.14 Canonical Ownership

Homepage cards link directly to canonical routes:

```text
News
→ /news/{slug}

Announcement
→ /announcements/{slug}
```

No homepage-specific detail routes are created.

### 9.15 Activities Remain Separate

Accepted separation:

```text
Latest Communication
= News + Announcement

Activities
= separate visual section
```

This reduces repetition and preserves the visual/gallery nature of Activity content.

### 9.16 Homepage Communication Layout

Conceptual layout:

```text
ข่าวสารและประกาศ
│
├── ข่าวประชาสัมพันธ์ล่าสุด
│   ├── News 1
│   ├── News 2
│   ├── News 3
│   └── News 4
│
│   [ดูข่าวทั้งหมด]
│
└── ประกาศ
    ├── Announcement 1
    ├── Announcement 2
    ├── Announcement 3
    └── Announcement 4

    [ดูประกาศทั้งหมด]
```

Desktop may use side-by-side areas.

Mobile presents a clear vertical reading order without requiring tabs.

### 9.17 Homepage Deduplication Rule

General editorial rule:

```text
If an editorial content item is already rendered
in a higher-priority homepage section,
do not unnecessarily render the same item again lower on the page.
```

Indicative homepage priority:

```text
Urgent Alert
↓
Featured
↓
Frequently Used Services
↓
Latest Communication
↓
Health Information
↓
Activities
↓
Quick Access
```

Exception:

A core Service task entry may remain in Frequently Used Services even when the same Service is Featured, because task navigation and promotional prominence serve different user intents.

### 9.18 No Additional Pinning Layer

Do not create separate homepage systems such as:

```text
Pinned News
Sticky News
Pinned Announcement
Homepage News Priority
```

Use Featured or Urgent Alert for deliberate higher priority.

### 9.19 Overall Content Volume

A reasonable communication volume is approximately:

```text
News:          3–4
Announcements: 0–4
Activities:    ~3
```

Do not add separate homepage blocks for every News subtype or source.

Listing pages provide completeness.

### 9.20 Accepted Principles

> **Featured is curated; Latest News is automated.**

> **Announcements prioritize current public relevance, not merely publication recency.**

> **Activities remain a separate visual homepage section rather than being mixed into the News feed.**

> **The same editorial content should not be unnecessarily repeated across multiple homepage sections.**

> **Homepage communication surfaces a concise current view; `/news`, `/activities`, and `/announcements` provide completeness.**

---

## 10. Health Information

### 10.1 Core Role

Homepage Health Information surfaces useful, timely public health knowledge rather than simply the newest health article.

> **Homepage Health Information should surface useful, timely health knowledge — not simply the newest health article.**

Primary source:

```text
Health Content
```

Health News remains part of News/Latest Communication.

### 10.2 Version 1 Scale

Preferred structure:

```text
ข้อมูลสุขภาพที่ควรรู้
├── Health Content 1
├── Health Content 2
├── Health Content 3
└── Health Content 4 (optional)

[ดูความรู้สุขภาพทั้งหมด]
```

Use approximately 3–4 items.

Do not force all four positions to be filled.

### 10.3 Curation Priority

Preferred logic:

```text
Curated Health Content
→ primary

Latest valid Health Content
→ fallback
```

Health Content relevance is not determined only by Published Date.

A seasonal or currently important topic may remain more useful than a newly published but less relevant article.

### 10.4 Manual / Seasonal Curation

Version 1 uses human-led editorial judgment.

Preferred configuration:

```text
Homepage Health Content
├── Selected Content
├── Sort Order
├── Active / Inactive
├── Start At (optional)
└── End At (optional)
```

Scheduling is optional.

Examples of seasonal relevance:

- ไข้เลือดออก
- โรคลมร้อน
- PM2.5
- น้ำท่วม / สุขภาพหลังภัยพิบัติ

> **Seasonal relevance is editorial judgment, not an automation problem in Version 1.**

### 10.5 No AI Seasonal Selection

Do not use AI to automatically select seasonal health topics in Version 1.

The system may support staff through:

- filtering by Health Topic
- optional scheduling
- stale/review warnings
- preview
- deterministic fallback

### 10.6 Health Topic

Health Topic may assist staff discovery/selection in the CMS.

Do not hard-code one homepage slot per Health Topic.

Homepage prominence follows current relevance rather than category quotas.

### 10.7 Deduplication

If a Health Content item is already displayed in Featured/Priority, do not repeat the same item in the Health Information section.

The Homepage Deduplication Rule remains authoritative.

### 10.8 Health News vs Health Content

Example:

```text
สถานการณ์ผู้ป่วยไข้เลือดออกเพิ่มขึ้นในอำเภอสอง
→ News

วิธีป้องกันไข้เลือดออกในครัวเรือน
→ Health Content
```

Homepage placement:

```text
Latest Communication
→ current health news

Health Information
→ reusable health knowledge
```

### 10.9 Card Content

Preferred Health Content card:

```text
[Image / Visual]

Title
Short Summary
Health Topic (optional)
Last Reviewed (optional)

[อ่านเพิ่มเติม]
```

Do not overload homepage cards with full taxonomy, internal ownership, authoring metadata, or document relationships.

### 10.10 Date Semantics

For evergreen Health Content, `Last Reviewed` is often more meaningful than original Published Date.

Example:

```text
ตรวจสอบข้อมูลล่าสุด: 10 ส.ค. 2569
```

It may be displayed when appropriate and should at minimum remain available on the detail page.

### 10.11 Review Overdue

Health Content that has passed its `Next Review` date may remain publicly available at its canonical page, but it is not eligible for Homepage prominence until it is reviewed again.

Concept:

```text
Review overdue
→ canonical public page may remain available
→ not eligible for Featured / Health Information fallback
→ Admin warning
```

Do not automatically unpublish content merely because Next Review has passed.

```text
Public lifecycle
≠ Review workflow
```

### 10.12 Fallback

If curated items are unavailable or insufficient:

```text
1. Use valid curated Health Content
2. Deduplicate higher-priority homepage items
3. Fill remaining positions from latest reviewed/lifecycle-valid Health Content
4. Do not force low-relevance items merely to fill slots
```

Fallback content should be:

- Published
- Public
- lifecycle-valid
- not hidden
- not review-overdue
- suitable for summary/card presentation
- not duplicated higher on the homepage

No AI recommendation is required.

### 10.13 No Forced Slot Filling

If only two or three relevant items are available, show two or three.

> **Quality of relevance is more important than filling every slot.**

### 10.14 Health Report Boundary

Health Report is not part of this homepage knowledge grid by default.

Health Reports belong in:

- Quick Access
- Health Reports destination
- other health-data/report context

Do not mix formal reports with public knowledge cards merely because both belong to the Health domain.

### 10.15 Dashboard Boundary

Dashboard is analytical content and remains separate from the Health Content homepage section.

Dashboard belongs in Quick Access or a health-data destination.

### 10.16 CTA

Preferred CTA:

```text
ดูความรู้สุขภาพทั้งหมด
→ /health/content
```

This is more precise than sending the user to the broader `/health` hub.

### 10.17 Section Label

Preferred section heading:

```text
ข้อมูลสุขภาพที่ควรรู้
```

Preferred CTA:

```text
ดูความรู้สุขภาพทั้งหมด
```

### 10.18 Visual Treatment

Do not turn the section into an infographic wall.

Use:

- cover visual
- cropped representative image
- illustration
- branded fallback

Full infographics belong on the detail page when necessary.

### 10.19 Accessibility

Health information must remain understandable without relying on text embedded inside images.

Title, summary, and key context should be real page text.

Image alt behavior will be finalized in the homepage accessibility section.

### 10.20 Mobile

Mobile may use:

- one-column cards
- or a readable two-column compact grid

Do not rely on a horizontal carousel as the primary Health Content discovery pattern.

### 10.21 Staff Maintenance

Homepage Health Information should not require staff to manually replace all items every week.

Preferred operating model:

```text
Curate when needed
+
deterministic fallback when not curated
```

### 10.22 Stale Curation Warning

CMS may provide lightweight warnings when:

- curation has not changed for a long period
- a selected item is review-overdue
- a selected source becomes unpublished/ineligible

Warnings assist staff but do not automatically rewrite homepage curation.

### 10.23 Accepted Structure

```text
Health Information
│
├── Curated Health Content
│   ├── Item 1
│   ├── Item 2
│   ├── Item 3
│   └── Item 4 (optional)
│
└── ดูความรู้สุขภาพทั้งหมด
    → /health/content
```

### 10.24 Accepted Principles

> **Homepage Health Information uses Health Content as its primary source, not Health News.**

> **Health Content is curated for current public relevance; Latest is only a fallback.**

> **Seasonal curation is human-led in Version 1, with optional scheduling rather than AI automation.**

> **Three to four items are sufficient; empty slots do not need forced filling.**

> **Health Content already Featured higher on the homepage should not be repeated.**

> **Overdue review status should reduce homepage prominence but should not automatically unpublish content.**

> **Health Report and Dashboard remain separate from the Health Content homepage section.**

> **The primary CTA is “ดูความรู้สุขภาพทั้งหมด” → `/health/content`.**

> **Health information must remain understandable without depending on text embedded inside images.**

---

## 11. Health Service Discovery

### 11.1 Core Role

> **Homepage starts the Health Service discovery journey; `/health-services` completes it.**

Homepage should help users begin the search quickly without duplicating the full directory experience.

### 11.2 Version 1 Structure

```text
Health Service Discovery
│
├── Heading
│   └── ค้นหาหน่วยบริการสุขภาพ
│
├── Search Entry
│   └── keyword / service / facility
│
├── Area Shortcut
│   └── Subdistrict
│
├── Selected Facilities (optional)
│   └── 0–4 facilities
│
└── CTA
    └── ค้นหาหน่วยบริการทั้งหมด
        → /health-services
```

The Homepage does not provide a full interactive Health Service Map View in Version 1.

### 11.3 One Directory, Multiple Entry Points

Homepage Health Service search uses the same underlying directory/search behavior as:

```text
/health-services
```

Do not create a second independent facility-search system.

> **One directory, multiple entry points.**

### 11.4 Search as Primary Interaction

Search is the primary interaction.

Conceptually support user intent such as:

- Health Service name
- offered Service
- Area/location keyword

Exact search behavior belongs in `08-search.md`.

### 11.5 Area Shortcuts

Area shortcuts are secondary to Search and should reflect the district context.

The public UX should not force:

```text
Province → District → Subdistrict → Village
```

on the homepage.

Use simple Subdistrict-level shortcuts derived from the shared Area Master.

Do not require staff to manually create/maintain each Area shortcut.

### 11.6 Selected Facilities

Selected Facilities are optional enhancement content.

Recommended scale:

```text
0–4 Health Services
```

Manual curation is preferred.

Do not use:

- popularity ranking
- ratings
- AI recommendation
- nearest-provider calculation
- click-based automatic promotion

without a real future requirement.

### 11.7 Selected Facility Labeling

Avoid labels that imply ranking or endorsement unless evidence supports them.

Preferred public language:

```text
หน่วยบริการสุขภาพที่เกี่ยวข้อง
```

rather than “แนะนำ”.

### 11.8 Facility Cards

Homepage cards remain concise.

Recommended fields:

- Health Service name
- type
- Area/Subdistrict
- concise hours/status when useful
- Detail action

Do not duplicate full profile fields such as:

- full service area
- every offered service
- full affiliation description
- every contact channel
- full address
- embedded map per card

Those belong on Health Service Detail.

### 11.9 No Homepage Directory Map

Version 1 does not embed the full Health Service Directory Map on the homepage.

Reasons:

- avoids duplicating `/health-services`
- reduces page weight
- avoids competing with the Office Contact Map
- keeps mobile UX simpler

### 11.10 No “Near Me” in Version 1

Do not add browser geolocation, nearest-provider calculations, or automatic distance-based recommendations in Version 1.

These require additional complexity and are outside current requirements.

### 11.11 Service Relationship

Search by service can reuse the existing:

```text
Health Service ↔ Service
```

relationship.

Do not duplicate Service keywords or offered-service metadata in Homepage configuration.

### 11.12 Transfer Search State

Search/filter state initiated on the Homepage should transfer into `/health-services` through the URL.

Conceptual examples:

```text
/health-services?q=เบาหวาน
/health-services?area=สะเอียบ
```

Exact parameter names/IDs are implementation details.

This preserves:

- Back behavior
- shareability
- deterministic state
- consistency with current URL conventions

### 11.13 No Large Inline Search Results

Version 1 should not turn the homepage into a full AJAX facility-results application.

Preferred flow:

```text
Input / Area Selection
→ Submit
→ /health-services
```

Autocomplete may be considered later only if a real use case emerges.

### 11.14 Source Status

Homepage prominence must respect Health Service status.

- Active → eligible
- Temporarily Closed → may be shown with clear status when intentionally selected
- Inactive → not selected as current homepage facility by default
- Hidden → not public

> **Homepage prominence cannot exceed source validity.**

### 11.15 Optional Selected Facilities

If no selected facilities are configured, the section remains useful with:

```text
Search
+
Area shortcuts
+
CTA
```

Do not force facility cards merely to fill layout.

### 11.16 CMS Curation

Accepted minimal configuration:

```text
Homepage Health Service Discovery
├── Selected Facility 1 (optional)
├── Selected Facility 2 (optional)
├── Selected Facility 3 (optional)
├── Selected Facility 4 (optional)
└── Sort Order
```

Do not duplicate Health Service profile data into Homepage settings.

### 11.17 Responsibility Split

```text
Search
→ System feature

Area shortcuts
→ Area Master

Selected Facilities
→ CMS curation
```

This keeps maintenance simple and avoids unnecessary configuration.

### 11.18 Mobile

Mobile presentation should prioritize:

```text
Search
→ Area selection
→ optional selected facilities
→ CTA
```

Do not rely on:

- map embeds
- horizontal facility carousel as primary discovery
- tables
- location permissions

### 11.19 Accepted Principles

> **Homepage starts the Health Service discovery journey; `/health-services` completes it.**

> **Health Service Discovery uses the same underlying directory/search logic as `/health-services`, not a separate search system.**

> **Search is the primary interaction; Area shortcuts are secondary.**

> **Area UX reflects the district context without unnecessary hierarchy.**

> **Selected Facilities are optional, manually curated, and limited to approximately zero to four items.**

> **The Homepage does not provide a full Health Service Map View in Version 1.**

> **“Near me” geolocation and nearest-provider calculations are outside Version 1.**

> **Search/filter state transfers into `/health-services` through the URL.**

> **Health Service data is always reused from the central Health Service master.**

> **The primary CTA is “ค้นหาหน่วยบริการทั้งหมด” → `/health-services`.**

### 11.20 Complexity Guardrail

All Homepage decisions must follow:

> **Simple — Structured — Sustainable**

> **Do not over-engineer. Add complexity only when a real user need, operational requirement, or evidence justifies it.**

This guardrail applies across the entire Homepage document, not only Health Service Discovery.

---

## 12. Activities

### 12.1 Core Role

> **Activities on the Homepage should visually show what the office has been doing, while the Activity Detail page provides the full story and gallery.**

Homepage Activities is a concise visual section, not a second News feed and not a full photo gallery.

### 12.2 Version 1 Scale

Preferred structure:

```text
กิจกรรมล่าสุด
├── Activity 1
├── Activity 2
└── Activity 3

[ดูกิจกรรมทั้งหมด]
```

Use approximately three Activity records.

### 12.3 Automatic Ordering

Activities are primarily selected automatically rather than manually curated.

Preferred logic:

```text
Published Activities
→ remove items already shown as Featured
→ order by Activity Date
→ use Published Date as fallback
→ take first 3
```

> **Activities should be mostly automatic, not another homepage curation workload.**

### 12.4 Deduplication

If an Activity is already displayed in Featured/Priority, do not repeat it in the Activities section.

### 12.5 Canonical Ownership

An Activity remains one Activity record:

```text
/activities/{slug}
```

Do not duplicate an Activity as a News record merely to make it appear on the homepage.

> **One activity, one Activity record, many presentation contexts.**

### 12.6 Activity Card

Recommended homepage card fields:

```text
[Cover Image]

Title
Activity Date
Location (optional)
Very short summary (optional)

[ดูรายละเอียด]
```

Detailed participant lists, full ceremonial wording, gallery, and related documents belong on Activity Detail.

### 12.7 Gallery Boundary

Homepage uses one representative image per Activity.

Do not render the full gallery in the homepage card.

A gallery-count indicator may be considered later if genuinely useful, but it is not required in Version 1.

### 12.8 Image Fallback

Accepted fallback chain:

```text
1. Activity Cover Image
2. First suitable Gallery Image
3. Default Activity Visual
```

Do not require staff to create new artwork solely to satisfy the homepage layout.

### 12.9 Simple Visual Treatment

Version 1 does not require:

- masonry layout
- animated photo wall
- multi-image activity carousel
- homepage lightbox
- complex hover galleries

A responsive three-card layout is sufficient.

### 12.10 Date

Activity Date is the preferred public date for homepage presentation.

Use clear absolute dates.

Published Date is a fallback when Activity Date is unavailable.

### 12.11 Location

Location may be displayed when it materially helps comprehension.

It is optional presentation metadata and does not need to appear on every card.

### 12.12 Summary

Desktop may show a concise one- or two-line summary.

Mobile may reduce presentation to:

- Title
- Activity Date
- optional image

when space is constrained.

The full description remains on Activity Detail.

### 12.13 CTA

Section CTA:

```text
ดูกิจกรรมทั้งหมด
→ /activities
```

Each Activity card links to its canonical Activity Detail URL.

### 12.14 Few or No Activities

If only one or two valid Activities are available, show what exists.

Do not force filler content merely to reach three cards.

If there are no valid Activities, the section may hide.

### 12.15 Homepage Placement

Activities remain lower priority than:

- Featured/Priority
- Frequently Used Services
- Latest Communication
- Health Information
- Health Service Discovery

This reflects their supporting/current-information role.

### 12.16 No Additional Activity Curation Layer

Version 1 does not add:

- Activity pinning
- activity popularity score
- separate homepage priority
- Activity-specific scheduling

If an Activity requires special prominence, use Featured.

### 12.17 Accepted Structure

```text
Activities
│
├── Latest Activity 1
├── Latest Activity 2
├── Latest Activity 3
│
└── ดูกิจกรรมทั้งหมด
    → /activities
```

### 12.18 Accepted Principles

> **Homepage Activities uses approximately three latest Activity records.**

> **Activities are mostly automated by Activity Date, not manually curated.**

> **An Activity already shown in Featured should not be repeated in the Activities section.**

> **Homepage uses one cover image per Activity; the full gallery belongs on the Activity Detail page.**

> **Missing images use a simple fallback chain rather than requiring staff to create new artwork.**

> **No masonry, multi-image carousel, photo wall, or other complex gallery interaction is needed in Version 1.**

> **Activity records remain canonical under `/activities/...`; do not duplicate them as News just to surface them on the homepage.**

> **If there are too few or no valid Activities, the section adapts or hides rather than forcing filler content.**

---

## 13. Quick Access

### 13.1 Core Role

> **Quick Access is a small set of high-value reference/system destinations, not a link directory.**

Quick Access is intentionally different from Frequently Used Services.

Frequently Used Services answers:

> “ฉันต้องการทำอะไร?”

Quick Access answers:

> “ฉันต้องการเข้าถึงข้อมูลหรือระบบสำคัญตรงไหน?”

### 13.2 Version 1 Scale

Version 1 should normally show approximately three core destinations and no more than five.

Preferred default:

```text
เข้าถึงข้อมูลสำคัญ
├── เอกสารเผยแพร่
├── ITA / คุณธรรมและความโปร่งใส
├── Dashboard ข้อมูลสุขภาพ
└── บริการดิจิทัลที่เกี่ยวข้อง (optional)
```

Do not add filler items merely to make the layout appear fuller.

### 13.3 Core Destinations

#### Documents

```text
เอกสารเผยแพร่
→ /documents
```

Suggested supporting text:

```text
แบบฟอร์ม คู่มือ แผนงาน และรายงาน
```

Quick Access links to Document Center rather than rendering recent-document lists inside this block.

#### ITA

```text
ITA / คุณธรรมและความโปร่งใส
→ /ita
```

`/ita` remains the stable landing page.

Do not hard-code the current fiscal year into Homepage configuration unless a future use case justifies it.

#### Dashboard

```text
Dashboard ข้อมูลสุขภาพ
→ /dashboard
```

Suggested supporting text:

```text
ดูภาพรวมข้อมูล แนวโน้ม และตัวชี้วัดสุขภาพ
```

> **Link to the Dashboard; do not rebuild the Dashboard on the homepage.**

Do not render a large KPI strip inside Quick Access.

### 13.4 External Digital Services

External digital services are optional and should be heavily curated.

Recommended limit:

```text
1–2 external destinations at most
```

Only include destinations with clear public value.

If the destination is genuinely an **External Digital Service**, Quick Access should reference the existing `Service` entity and its canonical Service destination; the Service record remains the owner of provider, channel, guidance, and external URL information.

A raw External URL in Quick Access is reserved for a reference/system destination that does not fit the Service model.

Do not create a large list of ministry/partner systems merely because URLs exist.

### 13.5 External Link Clarity

External destinations must be clearly identified.

Example:

```text
บริการภายนอก
ผู้ให้บริการ: ...
เปิดเว็บไซต์ภายนอก ↗
```

Users should know when they are leaving the สสอ.สอง website.

### 13.6 No Logo Wall

Do not use a large wall of unrelated external logos as the primary presentation.

Use a consistent website card/icon system.

Provider logos may appear only when they add useful identity/context.

### 13.7 Minimal Configuration

Preferred configuration:

```text
Quick Access
├── Destination
├── Label
├── Short Description
├── Icon
├── Sort Order
└── Active / Inactive
```

Version 1 does not require:

- popularity ranking
- AI recommendation
- click scoring
- scheduling
- approval workflow
- complex fallback logic

### 13.8 Internal Destination URLs

Internal destinations are system-defined.

Examples:

```text
Documents → /documents
ITA       → /ita
Dashboard → /dashboard
```

Staff should not manually type internal URLs for standard Quick Access items.

For external destinations, prefer an existing canonical Service when the destination is a Service. A raw External URL is used only for a reference/system destination that does not fit another structured model.

### 13.9 Avoid Duplicate Navigation

Do not repeat destinations already strongly represented elsewhere without a real reason.

Not included by default:

```text
คู่มือและแบบฟอร์ม
```

because it already exists in Frequently Used Services.

Also avoid duplicating:

- Contact
- Search
- Health Service Directory
- core Service tasks

unless future usage evidence justifies duplication.

> **Do not repeat navigation simply because the destination is important.**

### 13.10 Quick Access as Reference Layer

The baseline Quick Access layer is:

```text
Quick Access
├── เอกสารเผยแพร่
├── ITA
├── Dashboard ข้อมูลสุขภาพ
└── Related Digital Service (optional)
```

This keeps Quick Access focused on institutional/reference destinations rather than citizen-task navigation.

### 13.11 Adaptive Layout

If only three meaningful destinations exist, display three.

Desktop:

```text
3–4 cards in a row/grid
```

Mobile:

```text
1 column
or
2 columns when labels remain readable
```

Do not use a carousel.

### 13.12 No Fallback Algorithm

If an entry becomes inactive, remove it.

Do not automatically substitute unrelated destinations.

Quick Access is static curated navigation, not a dynamic content feed.

### 13.13 Accepted Principles

> **Quick Access is a small set of high-value reference/system destinations, not a link directory.**

> **Version 1 should normally show about three core items and no more than five.**

> **Documents, ITA, and Dashboard are the default core destinations.**

> **External digital services are optional and heavily curated.**

> **Quick Access should not repeat Services, Health Service Discovery, Search, or Contact without a real reason.**

> **Internal destination URLs are system-defined; staff should not manually type them.**

> **No popularity ranking, AI recommendation, scheduling, or complex fallback logic is needed.**

> **Use consistent navigation cards, not a logo wall.**

> **If only three meaningful destinations exist, show three—do not add filler.**

---

## 14. Contact Summary / Map

### 14.1 Core Role

> **Homepage Contact should provide immediate contact confidence; `/contact` provides the complete contact experience.**

The Homepage should answer two simple questions:

- How can I contact the office?
- Where is the office located?

It should not duplicate the full `/contact` page.

### 14.2 Version 1 Structure

```text
ติดต่อสำนักงานสาธารณสุขอำเภอสอง

├── ที่อยู่
├── โทรศัพท์หลัก
├── วันและเวลาทำการ
├── แผนที่สำนักงาน
└── Actions
    ├── โทร
    ├── ขอเส้นทาง
    └── ติดต่อเรา
```

Email may be shown when it is a meaningful public contact channel, but the Homepage does not need to display every contact method.

### 14.3 Single Source of Truth

Homepage Contact Summary reuses central structured Contact Information.

```text
Contact Information
        ↓
Homepage Contact Summary
        ↓
/contact
        ↓
Footer
```

> **Homepage Contact is a presentation of central Contact Information, not another contact record.**

Do not duplicate office address, phone, hours, or map details in Homepage-specific fields.

### 14.4 Primary Phone

Use the Primary Office Contact as the default Homepage phone action.

Do not display a large list of departmental or staff phone numbers.

Specialized contact channels belong in:

- `/contact`
- relevant Service Detail
- other context-specific destinations

### 14.5 Opening Hours

Homepage may show a concise structured summary such as:

```text
วันและเวลาทำการ
จันทร์–ศุกร์
08.30–16.30 น.
```

Actual values must come from central structured office/contact data.

### 14.6 Office Map Only

The Homepage Contact Map represents only:

```text
สำนักงานสาธารณสุขอำเภอสอง
```

Do not combine the office map with:

- hospital locations
- รพ.สต.
- สสช.
- partner organizations
- the Health Service Directory

Those belong in `/health-services`.

### 14.7 No Custom Navigation System

The Homepage may provide:

```text
ดูแผนที่
ขอเส้นทาง
```

through an appropriate map provider.

Version 1 does not build:

- route planning
- GPS navigation
- distance calculation
- live traffic
- custom map routing

### 14.8 Map Complexity

A simple single-location embedded/interactive map is sufficient when performance allows.

Do not add:

- marker categories
- map layers
- clustering
- map search
- geolocation
- complex custom controls

A lightweight preview plus external directions is also acceptable if it improves performance.

Exact implementation is deferred.

### 14.9 Primary Actions

Preferred maximum actions:

```text
[โทร]
[ขอเส้นทาง]
[ติดต่อเรา]
```

`ติดต่อเรา` links to:

```text
/contact
```

Do not overcrowd the section with many competing buttons.

### 14.10 Complaint Boundary

Do not repeat the full complaint/feedback workflow inside Contact Summary.

If useful, a concise contextual link may route users to the relevant Service entry.

The Service Catalog remains the owner of citizen-service workflows.

### 14.11 Social Channels

Official social channels may appear as secondary links when genuinely useful.

Keep them limited and lightweight.

A larger social/contact directory belongs in:

- Footer
- `/contact`

Do not turn Contact Summary into a social-media link wall.

### 14.12 Personal Contact Boundary

Do not expose personal staff contact details in Homepage Contact Summary.

Examples excluded by default:

- personal mobile numbers
- personal LINE accounts
- individual staff contact lists

Homepage Contact represents the Office, not a personnel directory.

### 14.13 Contact Summary vs Footer

Contact Summary is action-oriented:

```text
โทร
ไปสำนักงาน
ขอเส้นทาง
```

Footer is site-wide reference/navigation.

They may reuse the same underlying data but do not need identical presentation.

### 14.14 Mobile

Preferred Mobile order:

```text
ติดต่อสำนักงาน
ที่อยู่
เวลาทำการ

[โทร] [ขอเส้นทาง]

Map

[ดูข้อมูลติดต่อทั้งหมด]
```

Keep the mobile layout straightforward and readable.

### 14.15 Map Failure

The section must remain useful even when the map does not load.

Essential fallback remains:

```text
Address
Phone
Directions action
```

> **Map is an enhancement, not a dependency.**

### 14.16 Homepage Configuration

No separate Homepage contact-data configuration is required.

Do not create fields such as:

```text
Homepage Contact Address
Homepage Contact Phone
Homepage Contact Hours
Homepage Map Address
```

If a Homepage visibility toggle is ever needed, it may remain a simple presentation setting.

All actual contact data comes from the central Contact Information model.

### 14.17 Accepted Structure

```text
Contact Summary
│
├── Office Name
├── Address
├── Primary Phone
├── Opening Hours
│
├── Actions
│   ├── โทร
│   ├── ขอเส้นทาง
│   └── ติดต่อเรา
│
└── Office Map
    └── single office location
```

### 14.18 Accepted Principles

> **Homepage Contact Summary provides only the most useful office contact information; `/contact` remains the complete contact page.**

> **All contact details reuse central structured Contact Information and are never duplicated into Homepage configuration.**

> **Homepage Map represents the office location only; Health Service maps remain in `/health-services`.**

> **Primary actions are limited to โทร, ขอเส้นทาง, and ติดต่อเรา.**

> **No custom navigation, GPS, routing, geolocation, or complex map features are needed in Version 1.**

> **The Contact Summary remains useful even if the map fails to load.**

> **Personal staff contact details and full complaint workflows do not belong in this section.**

> **Map is an enhancement, not a dependency.**

---

## 15. Footer Information Architecture

### 15.1 Core Role

> **Footer should provide orientation, trust, and essential utility — not duplicate the entire website navigation.**

Footer is a global site component that provides:

- office identity
- essential navigation
- important information/reference destinations
- official digital channels
- privacy/accessibility/legal utilities

It should not become a second Sitemap or link portal.

### 15.2 Version 1 Structure

Preferred baseline:

```text
Footer
├── ข้อมูลสำนักงาน
├── ทางลัดสำคัญ
├── บริการและข้อมูล
├── ติดต่อ / ช่องทางดิจิทัล
└── Bottom Bar
```

Use approximately four logical groups plus a compact bottom utility layer.

### 15.3 Office Information

This group may include:

- Logo
- Office name
- Address
- Primary phone
- Opening hours
- Public email when applicable

All data reuses central Organization and Contact Information.

Do not create separate Footer-only copies of the same office data.

### 15.4 No Partner Logo Wall

Do not fill the Footer with logos of partner organizations or related agencies.

Footer is not a partner directory.

### 15.5 Important Links

Use only high-value destinations.

Examples:

```text
เกี่ยวกับเรา
บุคลากร
ข่าวสาร
บริการประชาชน
ค้นหาหน่วยบริการ
เอกสารเผยแพร่
ติดต่อเรา
```

Do not reproduce every submenu or every route.

### 15.6 Services and Information

A concise information/reference group may include:

```text
บริการประชาชน
ค้นหาหน่วยบริการสุขภาพ
ความรู้สุขภาพ
Dashboard ข้อมูลสุขภาพ
ITA
เอกสารเผยแพร่
```

Select only destinations that remain useful as global Footer shortcuts.

### 15.7 Contact and Digital Channels

May include:

- ติดต่อเรา
- ร้องเรียน / เสนอแนะ
- Facebook
- LINE Official when actively maintained
- Email

Only official channels that are genuinely maintained should appear.

### 15.8 External Links

External destinations must be clearly indicated.

Example:

```text
บริการภายนอก ↗
```

Users should understand when a link leaves the สสอ.สอง website.

### 15.9 Bottom Utility Layer

Version 1 should plan for:

```text
ประกาศความเป็นส่วนตัว
นโยบายคุกกี้
การเข้าถึงเว็บไซต์
Copyright
```

These are baseline planning requirements, not deferred implementation extras.

Where required by the final privacy/data-processing design, additional related legal/privacy information may be introduced without changing the Footer's core structure.

### 15.10 Privacy Baseline

The website plan must include from Version 1:

- **ประกาศความเป็นส่วนตัว (Privacy Notice)**
- **นโยบายคุกกี้ (Cookie Policy)**

These should be considered during:

- analytics decisions
- form/intake design
- complaint/contact workflows
- cookie/storage behavior
- third-party embeds
- consent requirements where applicable

Do not wait until implementation is complete before defining these obligations.

> **Privacy and cookie handling are planning requirements, not post-launch add-ons.**

#### Content Ownership

In Version 1:

```text
Privacy Notice
Cookie Policy
Accessibility Statement
→ Basic Page
→ canonical Basic Page route defined by `03-sitemap.md`
```

These are website/legal informational pages, not new Homepage-specific content types.

The existence of a Cookie Policy does not by itself require a complex consent subsystem. Cookie consent/banner behavior must follow the actual analytics, storage, third-party embed, and legal/privacy requirements defined during implementation.

### 15.11 Accessibility

Footer should include a concise Accessibility destination such as:

```text
การเข้าถึงเว็บไซต์
```

Accessibility itself must be built into the site.

Do not rely on a third-party accessibility widget as a substitute for accessible design.

> **Accessibility should be built into the site, not delegated to a footer widget.**

### 15.12 Optional Sitemap Link

An HTML Sitemap link may be added later if useful.

It is not mandatory in Version 1 when Navigation, Search, and Information Architecture already provide strong discovery.

### 15.13 Excluded Footer Elements

Version 1 does not include:

- visitor counters
- weather
- clocks
- calendars
- staff directory
- org chart
- live KPI metrics
- latest-news feed
- activity gallery
- large partner-logo walls
- social feeds
- browser/resolution notices
- full Sitemap duplication
- arbitrary custom HTML widgets

### 15.14 Search

A large second Search form is not required in the Footer.

Global Search remains primarily available through Header/navigation.

A simple Search link may be added only if useful.

### 15.15 Footer Contact vs Homepage Contact Summary

Homepage Contact Summary is action-oriented and may contain:

- Address
- Phone
- Hours
- Map
- Directions

Footer uses a smaller reference form and does not repeat the Map.

### 15.16 Global Component

Footer is site-wide and should remain consistent across:

- Homepage
- News
- Services
- Health
- Documents
- ITA
- Contact
- other public pages

The System Blueprint should later treat it as part of the Global Layout.

### 15.17 Configuration Strategy

Use a simple hybrid approach.

System destinations use known internal routes.

Optional external links and official channels may be configurable.

Do not create a drag-and-drop Footer Builder in Version 1.

### 15.18 Mobile Footer

Mobile may use either:

- simple stacked groups
- or lightweight accordion groups when the final link count makes it useful

Do not introduce accordion behavior merely because the viewport is small.

### 15.19 Link Volume Guardrail

A practical design target is roughly:

```text
12–18 links total
```

This is a design guardrail, not a hard system limit.

If the Footer grows toward 30–40 links, it is probably turning into a second Sitemap.

### 15.20 Accepted Baseline

```text
FOOTER

[สำนักงานสาธารณสุขอำเภอสอง]
ที่อยู่ / โทรศัพท์ / เวลาทำการ

ทางลัดสำคัญ
- เกี่ยวกับเรา
- ข่าวสาร
- บริการประชาชน
- ค้นหาหน่วยบริการ
- ติดต่อเรา

ข้อมูลและความโปร่งใส
- ความรู้สุขภาพ
- เอกสารเผยแพร่
- Dashboard
- ITA

ช่องทางดิจิทัล
- ร้องเรียน / เสนอแนะ
- Facebook
- LINE Official (ถ้ามี)

────────────────────

ประกาศความเป็นส่วนตัว
นโยบายคุกกี้
การเข้าถึงเว็บไซต์
© สำนักงานสาธารณสุขอำเภอสอง
```

### 15.21 Accepted Principles

> **Footer provides orientation, trust, and essential utility; it does not duplicate the entire Sitemap.**

> **Use approximately four logical groups plus a small bottom utility layer.**

> **Footer data reuses central Organization and Contact Information rather than duplicating office details.**

> **Footer navigation contains high-value destinations only, not every submenu.**

> **Official digital channels are limited to channels that are actively maintained.**

> **Privacy Notice and Cookie Policy are baseline Version 1 planning requirements.**

> **Accessibility belongs in the utility layer but must be built into the website itself.**

> **No visitor counters, weather, clocks, partner-logo walls, social feeds, browser notices, or dashboard metrics are needed.**

> **Footer structure is mostly fixed; Version 1 does not need a drag-and-drop Footer Builder.**

> **If the Footer starts behaving like a second Sitemap or portal directory, it has become too complex.**

---

## 16. Responsive / Mobile Priority Rules

### 16.1 Core Principle

> **Mobile is not a reduced website; it is a prioritized presentation of the same website.**

Version 1 uses the same content, Information Architecture, and CMS configuration across Desktop and Mobile.

Do not create separate Mobile Homepage content/configuration.

### 16.2 Shared Content and Configuration

Do not create duplicated fields such as:

```text
Desktop Featured
Mobile Featured

Desktop News
Mobile News

Desktop Services
Mobile Services
```

Preferred model:

```text
Same Content
Same CMS Configuration
        ↓
Responsive Presentation
```

Staff selects/configures content once.

### 16.3 Section Priority

The overall homepage hierarchy remains consistent across viewport sizes:

```text
1. Identity / Header
2. Search
3. Urgent Alert (if active)
4. Featured / Priority
5. Frequently Used Services
6. Latest Communication
7. Health Information
8. Health Service Discovery
9. Activities
10. Quick Access
11. Contact
12. Footer
```

Do not create a materially different Mobile Information Architecture without a real user need.

### 16.4 Mobile Header

Mobile Header should remain lean.

Preferred essentials:

```text
Logo / Office Identity
Menu
Search
```

Do not force the full Desktop navigation into the visible Mobile header.

### 16.5 Search

Search remains easy to reach on Mobile.

Do not bury Search several navigation levels deep.

A visible Search action in the Header is sufficient as the baseline.

### 16.6 Featured

Mobile Featured should not become an auto-rotating slider.

Preferred behavior:

```text
Main Featured
↓
Secondary Featured
```

Use responsive stacking/grid as appropriate.

### 16.7 Featured Height

Main Featured should remain visually prominent but should not consume an excessive portion of the Mobile viewport.

Avoid:

- full-screen Hero imagery by default
- excessive vertical padding
- long summaries
- oversized CTA blocks

Users should perceive that more content continues below.

### 16.8 Secondary Featured Density

Mobile may reduce secondary presentation details such as:

- summary length
- image size
- secondary descriptive text

Do not change the source content or destination.

### 16.9 Frequently Used Services

Frequently Used Services remains high in the page hierarchy.

Preferred Mobile layouts:

- compact two-column grid when labels remain readable
- one-column list when content needs more space

Do not use a horizontal carousel as the primary Service navigation.

### 16.10 Service Card Density

Mobile Service cards may reduce descriptive copy.

Core task/service name and clear action remain visible.

### 16.11 Latest Communication

Desktop may use side-by-side News/Announcement presentation.

Mobile uses a clear vertical order:

```text
ข่าวประชาสัมพันธ์ล่าสุด
↓
ประกาศ
```

Do not add Mobile-only tabs unless a real future requirement justifies them.

### 16.12 News on Mobile

Mobile News cards may reduce to:

```text
Thumbnail
Title
Date
```

Summary may be shortened or omitted when necessary.

Title and meaningful date remain visible.

### 16.13 Announcements on Mobile

Announcements are suitable for compact list presentation.

Keep important metadata such as:

- Announcement type
- Title
- date
- deadline/status where applicable

Do not hide deadline or lifecycle information merely to reduce height.

### 16.14 Health Information

Default Mobile presentation should prioritize readability.

A one-column layout is the safe baseline when cards include summaries.

Two columns may be considered only when final card density remains readable.

### 16.15 Health Service Discovery

Mobile priority:

```text
Search
↓
Area selection
↓
Selected Facilities (optional)
↓
CTA
```

Do not add map, geolocation, or complex autocomplete merely for Mobile.

### 16.16 Area Selection

The exact UI control may be:

- wrapping chips
- select/dropdown
- another simple accessible control

Do not freeze the component type during the concept phase.

Freeze the behavior:

> Users can choose a Subdistrict easily without navigating unnecessary geographic hierarchy.

### 16.17 Activities

Mobile Activities use a straightforward vertical presentation.

Minimum useful Activity card:

```text
Cover
Title
Activity Date
```

No horizontal carousel is required.

### 16.18 Quick Access

Quick Access may use:

- one-column list
- two-column compact grid when labels remain readable

No carousel is needed.

### 16.19 Contact Summary

Mobile Contact emphasizes actionable controls.

Key actions:

```text
โทร
ขอเส้นทาง
```

Address, opening hours, Map, and full Contact destination remain available in a clear reading order.

### 16.20 Map on Mobile

Map should not dominate the Mobile section.

A lightweight preview plus Directions action is acceptable when it improves performance.

No Mobile-specific map system is required.

### 16.21 Footer on Mobile

Use simple stacked groups by default.

Accordion behavior may be introduced only if final link volume makes it beneficial.

> **Complexity must be earned.**

### 16.22 What May Be Reduced

Responsive presentation may reduce:

- summary length
- optional metadata
- image size
- padding
- decorative elements
- secondary descriptive text

This is presentation reduction, not content duplication.

### 16.23 What May Be Hidden

Only secondary information may be hidden when necessary, for example:

- News summary
- Activity location
- optional Topic badge
- secondary descriptive copy

Do not hide information that materially affects user decisions.

### 16.24 What Must Remain Visible

Do not hide:

- Urgent Alert
- Featured title
- core Service task name
- Announcement deadline/status
- temporary closure status
- primary Contact action
- external-link indication
- other essential state/context

### 16.25 Touch Interaction

All primary Mobile actions must be comfortably tappable and must not rely on hover.

Exact touch-target dimensions belong in the later accessibility/design-system implementation.

### 16.26 Hover

Desktop hover may provide visual feedback.

No information or action should exist only on hover.

### 16.27 Responsive Images

Prefer:

```text
One source image
→ responsive sizing/crop
```

Do not require staff to upload separate Desktop and Mobile images by default.

If future art-direction needs are proven, they may be added later.

### 16.28 Text Inside Images

Important information should be real page text rather than baked into images.

This is particularly important on Mobile where embedded text becomes difficult to read.

### 16.29 Same Core Sections

Responsive design should not remove major homepage sections merely to make Mobile shorter.

Reduce information density before removing meaningful content.

### 16.30 Same Item Selection

Version 1 prefers:

```text
Same selected items
Same ordering
Different layout/detail density
```

Do not introduce separate Desktop/Mobile item counts without evidence that the difference is needed.

### 16.31 DOM / Reading Order

Visual order, DOM order, keyboard navigation order, and screen-reader reading order should remain logically aligned.

Avoid CSS reordering that creates a mismatch between visual and semantic order.

### 16.32 Breakpoints

Exact breakpoint values are not frozen in this concept document.

Breakpoints belong to implementation/design-system decisions.

This document freezes behavior and priority, not CSS numbers.

### 16.33 No Separate Tablet System

Do not create Desktop, Tablet, and Mobile as separate content/configuration systems.

Use responsive layout behavior based on available space.

### 16.34 Mobile Performance

Avoid unnecessarily heavy Mobile elements such as:

- multiple map embeds
- large hero video
- autoplay media
- large image galleries
- unnecessary JavaScript interactions
- live social embeds

### 16.35 Progressive Enhancement

Preferred approach:

```text
Core content + links work first
↓
Enhanced interaction when useful/supported
```

Example:

```text
Address + Directions
→ core

Interactive Map
→ enhancement
```

### 16.36 Accepted Mobile Structure

```text
Mobile Homepage

Header
├── Identity
├── Menu
└── Search

Urgent Alert (if active)

Featured
├── Main Featured
└── Secondary Featured

Frequently Used Services

Latest Communication
├── Latest News
└── Announcements

Health Information

Health Service Discovery
├── Search
├── Area
└── Optional Facilities

Activities

Quick Access

Contact
├── Phone / Directions
├── Contact Summary
└── Map

Footer
```

The Information Architecture remains the same as Desktop.

### 16.37 Accepted Principles

> **Mobile uses the same content, CMS configuration, and Information Architecture as Desktop.**

> **Responsive presentation changes layout and information density, not content ownership or meaning.**

> **Do not create separate Desktop/Mobile homepage configurations in Version 1.**

> **Primary user tasks remain high in the page hierarchy on all viewport sizes.**

> **Mobile reduces summaries and secondary metadata before removing entire sections.**

> **Core actions, deadlines, statuses, and important notices must never be hidden merely for visual simplicity.**

> **No horizontal carousel is required for primary navigation or core content in Version 1.**

> **Touch interactions must not depend on hover.**

> **One responsive image source is preferred over requiring separate Desktop/Mobile uploads.**

> **Visual order and DOM/read order should remain aligned.**

> **Exact breakpoints are deferred to implementation/design-system decisions.**

> **Mobile performance favors lightweight, progressively enhanced components.**

> **Responsive design should simplify presentation, not create a second website.**

---

## 17. Homepage Content Fallback Behavior

### 17.1 Core Principle

> **Fallback should preserve usefulness and layout stability without inventing content or creating complex replacement logic.**

> **Missing content is acceptable; irrelevant automatic replacement is not.**

Version 1 does not attempt to fill every visual slot at all costs.

### 17.2 Slot Count Is a Maximum

Section item counts are maximums, not quotas.

Examples:

```text
Secondary Featured = up to 3
Health Content = up to 4
Activities = up to 3
Selected Facilities = up to 4
```

If fewer valid items exist, display fewer.

> **Slot count is a maximum, not a quota.**

### 17.3 Source Validity Is Authoritative

Before rendering an item on the Homepage, validate the source.

Conceptual sequence:

```text
Source exists?
↓
Public?
↓
Published / Active?
↓
Lifecycle valid?
↓
Not Hidden?
↓
Allowed in this section?
↓
Render
```

Do not create a separate Homepage lifecycle.

> **Source status is authoritative.**

### 17.4 Main Featured Fallback

Main Featured uses a deliberately narrow deterministic fallback.

```text
Curated Main Featured
↓
if unavailable
Latest eligible News
↓
if none exists
hide Featured Area
```

Other eligible Featured source types remain available for manual curation, but they do not participate in automatic cross-type fallback in Version 1.

Do not use AI scoring, random selection, or complex priority weighting.

### 17.5 Secondary Featured

Secondary Featured has no automatic replacement logic.

```text
Configured valid items
→ display

Invalid / unavailable
→ skip
```

If none remain, hide Secondary Featured.

### 17.6 Frequently Used Services

Frequently Used Services is curated navigation.

If a selected Service/destination becomes unavailable, skip it.

Do not automatically substitute another Service.

> **Missing curated service is better than irrelevant automatic replacement.**

### 17.7 Latest News

News uses automatic feed behavior.

```text
latest eligible News
↓
remove Featured duplicates
↓
take next valid items
```

If fewer items exist, display fewer.

If no valid News exists, the News subsection may hide.

Do not replace News with Activity, Announcement, or Health Content.

### 17.8 Announcement

Homepage Announcement uses current/public relevance.

If no Active/Current Announcement exists:

```text
hide Announcement subsection
```

Do not bring Closed, Expired, or Archived Announcements back merely to fill space.

Do not substitute News.

### 17.9 Health Information

Accepted fallback:

```text
Curated valid Health Content
↓
if insufficient
fill from latest valid reviewed Health Content
↓
remove higher-page duplicates
↓
stop at section maximum
```

Do not force-fill with low-relevance or review-overdue content.

### 17.10 Health Service Discovery

Core functionality remains available even when no Selected Facilities exist.

```text
Search
+
Area
+
CTA
```

Selected Facilities are optional.

If selected facilities become unavailable, skip them.

Do not auto-select replacements.

### 17.11 Activities

Activities use automatic latest ordering.

```text
Latest valid Activities
↓
remove Featured duplicate
↓
take up to 3
```

If one or two exist, display them.

If none exist, hide the Activities section.

Do not substitute News or another content type.

### 17.12 Quick Access

Quick Access is static curated navigation.

```text
Active entry
→ show

Inactive / invalid
→ hide
```

No fallback algorithm is required.

Do not add unrelated destinations automatically.

### 17.13 Contact Summary

Contact is a core functional section.

If the Map is unavailable, essential information remains:

```text
Address
Phone
Hours
Directions
```

Optional Social links may simply hide if unavailable.

Missing Primary Office Contact data is treated as a data-quality issue, not something to solve through unrelated fallback content.

### 17.14 Footer

Core system routes do not require fallback.

Optional external/social links that become invalid should hide.

Do not substitute unrelated Footer destinations.

### 17.15 Empty Section Behavior

Use the following general rule:

```text
If section has meaningful core functionality
→ keep section

If section is purely optional content and has no valid items
→ hide section
```

Examples that remain:

- Health Service Discovery
- Contact

Examples that may hide when empty:

- Activities
- Announcements
- Secondary Featured
- Selected Facilities

### 17.16 Avoid Homepage Empty-State Noise

Do not fill the Homepage with large messages such as:

```text
ยังไม่มีข่าว
ยังไม่มีกิจกรรม
ยังไม่มีประกาศ
```

Listing/Admin pages may use explicit empty states.

Homepage should adapt quietly.

### 17.17 Flexible Layout

When an optional section is not rendered, the surrounding layout should reflow naturally.

Do not reserve large fixed empty spaces for missing sections.

### 17.18 Deduplication Before Fallback Fill

Accepted order:

```text
1. Validate source
2. Remove duplicates already rendered higher
3. Apply section ordering
4. Fill up to the section maximum
```

Deduplication happens before choosing lower-priority replacement items.

### 17.19 Deterministic Behavior

Fallback must be predictable.

```text
same content state
→ same Homepage output
```

Do not use random selection.

This improves:

- testing
- debugging
- staff confidence
- cache predictability

### 17.20 Same-Responsibility Fallback

By default:

> **Fallback stays within the same content responsibility.**

Do not use cross-type substitution such as:

```text
No Activity → News
No Announcement → Health Content
No Health Content → News
```

The intentional exception is Main Featured, because Featured is already designed as a cross-type presentation layer.

### 17.21 No Complex Fallback Matrix

Version 1 does not define a large cross-section fallback priority matrix.

Each section should use only the minimum logic required for its role.

This avoids over-engineering and preserves semantic boundaries.

### 17.22 Warn Before Automate

When important Homepage configuration needs attention, Admin may warn staff.

Examples:

- Main Featured has been using fallback for a long period
- Health curation source became invalid
- Featured source became unpublished
- Quick Access has lost an important destination

Do not automatically redesign/reconfigure the Homepage on behalf of staff.

> **Warn before automate.**

### 17.23 Fallback Does Not Mutate Canonical Content

Homepage fallback must not:

- publish content automatically
- change source status
- alter source ordering
- duplicate records
- change canonical URLs

Fallback is a presentation decision only.

### 17.24 Unified Version 1 Rule

```text
Homepage Section
        ↓
Validate configured / eligible source
        ↓
Remove unavailable items
        ↓
Remove duplicates already shown higher
        ↓
Apply simple section-specific ordering
        ↓
Use same-type fallback only where explicitly defined
        ↓
Render available items
        ↓
Hide optional empty section
```

This is sufficient for Version 1.

### 17.25 Section Summary

| Section | Fallback |
|---|---|
| Main Featured | Latest eligible News; otherwise hide Featured Area |
| Secondary Featured | None |
| Frequently Used Services | None |
| News | Next latest valid News |
| Announcement | None; hide if empty |
| Health Information | Latest valid reviewed Health Content |
| Health Service Selected Facilities | None |
| Activities | Next latest valid Activity |
| Quick Access | None |
| Contact Map | Address / Phone / Directions remain |
| Footer optional links | Hide invalid item |

### 17.26 Accepted Principles

> **Fallback exists to preserve usefulness, not to fill every visual slot.**

> **Source lifecycle and visibility remain authoritative.**

> **Slot counts are maximums, not quotas.**

> **Fallback remains within the same content responsibility except Main Featured, which is intentionally cross-type.**

> **Curated navigation such as Services, Selected Facilities, and Quick Access does not receive automatic replacements.**

> **Automatic content feeds such as News and Activities simply move to the next valid item.**

> **Optional empty content sections may hide instead of displaying empty states.**

> **Core functional sections such as Health Service Discovery and Contact remain available even when optional content is missing.**

> **Deduplication happens before fallback filling.**

> **Fallback must be deterministic; no random or AI-driven replacement is needed in Version 1.**

> **Admin warnings are preferred over automatic Homepage reconfiguration.**

> **Missing relevant content is acceptable; irrelevant automatic replacement is not.**

---

## 18. Homepage CMS Curation Rules

### 18.1 Core Principle

> **Homepage CMS should control priorities, not manually rebuild the homepage.**

> **Staff should curate only what truly needs editorial judgment; everything else should be derived from structured content.**

Version 1 keeps Homepage management intentionally simpler than a general-purpose page builder.

### 18.2 Three Management Modes

Homepage sections are divided into three groups.

#### A. Curated

Staff selects/configures:

```text
Featured
Frequently Used Services
Health Information
Selected Health Services
Quick Access
Urgent Alert (when needed)
```

#### B. Automatic

System derives content using accepted rules:

```text
Latest News
Announcements
Activities
```

#### C. System / Structured

These reuse existing system/master data:

```text
Header
Search
Health Service Search
Area Shortcuts
Contact Summary
Footer
```

This makes it clear what staff must actively manage and what they should not need to touch.

### 18.3 No Homepage Page Builder

Version 1 does not provide an unrestricted Homepage builder such as:

```text
Add Block
Move Section
Add HTML
Add Widget
Change Column
Insert Custom Script
```

> **Structure is fixed; content selection is configurable.**

This protects:

- visual consistency
- accessibility
- Mobile behavior
- maintainability
- predictable testing

### 18.4 Reuse Existing Content

Staff should select existing structured content rather than recreate it inside Homepage settings.

Example Featured flow:

```text
Select existing content
→ choose Main / Secondary
→ optional Homepage override
```

Do not duplicate the source record by re-entering all fields.

### 18.5 Homepage Overrides

Homepage-only overrides should remain limited to genuine presentation needs.

Featured may support optional:

- Display Title
- Display Summary
- Display Image
- CTA Label

Do not enable broad per-field overrides across every Homepage section.

### 18.6 Frequently Used Services

Minimal configuration:

```text
Selected Entry
Sort Order
Active / Inactive
```

Internal destinations reuse their canonical source/destination.

Do not duplicate Service title, URL, or metadata unnecessarily.

### 18.7 Health Information

Minimal configuration:

```text
Selected Health Content
Sort Order
Active / Inactive
Start At (optional)
End At (optional)
```

Do not introduce seasonal rule engines or automatic topic logic.

Human-led curation plus optional scheduling is sufficient.

### 18.8 Selected Health Services

Minimal configuration:

```text
Selected Health Service
Sort Order
```

Optional Active/Inactive may be used only if needed.

Facility name, address, phone, hours, affiliation, and status remain owned by the Health Service master.

### 18.9 Quick Access

Preferred configuration:

```text
Destination
Label
Short Description
Icon
Sort Order
Active / Inactive
```

Internal system destinations use system-defined routes.

For external destinations, prefer an existing canonical Service when the destination is a Service. A raw External URL is used only for a reference/system destination that does not fit another structured model.

### 18.10 Latest News

Do not add separate Homepage News curation.

Latest News remains automatic.

If a News item deserves special prominence:

```text
→ Featured
```

Do not create:

- Pin to Homepage
- Sticky News
- Homepage News Rank
- separate homepage-priority fields

### 18.11 Announcements

Announcements remain automatic according to current/public lifecycle rules.

If an Announcement requires more prominence:

- use Featured
- or Urgent Alert when genuinely urgent

Do not create another `Important Announcement` flag solely for Homepage use.

### 18.12 Activities

Activities remain automatic by accepted Activity ordering rules.

If an Activity deserves special prominence:

```text
→ Featured
```

No separate Homepage Activity curation is required.

### 18.13 Contact

Do not create a separate Homepage Contact editor.

Homepage Contact Summary reuses central Contact Information.

Staff updates contact data in one place.

### 18.14 Footer

Footer structure remains mostly fixed.

Staff may manage only practical optional items such as:

- official social channels
- optional external links
- visibility of selected optional entries

Do not build a drag-and-drop Footer Builder.

### 18.15 Homepage Admin as Curation Overview

The Homepage Admin should behave like a curation dashboard, not a visual canvas.

Concept:

```text
Homepage

Featured
[ Main Featured: ... ]
[ Secondary: 2 items ]

Frequently Used Services
[ 5 items configured ]

Health Information
[ 3 curated ]

Selected Health Services
[ 2 selected ]

Quick Access
[ 3 active ]

System Sections
✓ Latest News automatic
✓ Announcements automatic
✓ Activities automatic
✓ Contact from Contact Information
✓ Footer from global configuration
```

This gives staff visibility without requiring layout construction.

### 18.16 Preview

Homepage CMS should provide a simple Preview capability.

Use case:

```text
Change curation
→ Preview
→ Publish
```

A read-only preview is sufficient.

Version 1 does not need a complex WYSIWYG live page editor.

### 18.17 Draft and Publish

Homepage configuration may use:

```text
Draft
→ Preview
→ Publish
```

This prevents partially completed edits from immediately changing the public Homepage.

Mandatory Approval is not required.

### 18.18 Approval

Homepage curation follows the Foundation workflow baseline.

Approval remains optional/off by default.

Do not require:

```text
Draft
→ Review
→ Approve
→ Publish
```

for a small-team default workflow.

### 18.19 Scheduling

Scheduling is limited to places with a clear temporal use case.

Appropriate candidates:

- Urgent Alert
- Featured
- Health Information

Scheduling is not required by default for:

- Quick Access
- Selected Health Services
- Footer
- Contact
- Frequently Used Services

Add complexity only when a real use case appears.

### 18.20 Admin Warnings

CMS may warn staff about meaningful problems such as:

- Featured source unpublished
- Health Content review overdue
- Selected Health Service inactive
- external Quick Access URL fails validation when edited/saved
- selected source no longer eligible

Warnings should remain concise.

> **Warn before automate.**

### 18.21 Health Content Warning

If a curated Health Content item becomes:

- review-overdue
- hidden
- unpublished
- otherwise ineligible for Homepage prominence

CMS should make that state visible.

A review-overdue item may remain available on its canonical public page, but the Homepage does not render it in Featured or Health Information until it is reviewed again.

### 18.22 Deduplication Warning

If staff selects the same content in Featured and another curated section, CMS may explain:

```text
This item will be shown only in the higher-priority Homepage position
according to the deduplication rule.
```

Do not necessarily block the configuration, because the lower selection may become useful after Featured changes or expires.

### 18.23 Editors Should Not Handle IDs

Homepage selectors should use human-readable information such as:

- Title
- Content Type
- Status
- Date
- Search

Staff should not need to type internal content IDs.

### 18.24 Simple Admin Search / Filter

Selectors may provide lightweight discovery such as:

```text
Search by title
Filter by type
Show Published
```

Do not create an advanced query builder.

### 18.25 Eligible Content Only

Each selector should be constrained to eligible source types.

Examples:

```text
Featured
→ eligible Featured source types

Health Information
→ Health Content only

Selected Health Services
→ Health Service only
```

This reduces staff error.

### 18.26 Source Status Visibility

Selectors should make relevant source status visible.

Examples:

- Published
- Draft
- Expired
- Hidden
- Review overdue

Default selection experience should emphasize valid/public items.

### 18.27 Item Counts Are Not Editor Knobs

Do not expose arbitrary item-count configuration for every section.

Accepted Homepage scales remain system/design defaults, for example:

```text
News ≈ 3–4
Activities ≈ 3
Health Content ≈ 3–4
```

Do not turn every design decision into a CMS setting.

### 18.28 Automatic Ordering Remains Automatic

Staff should not manually reorder items within automatic sections such as:

- Latest News
- Announcements
- Activities

Their ordering follows accepted rules.

### 18.29 Section Visibility Toggles

Do not expose On/Off toggles for every Homepage section by default.

A toggle is appropriate only when the section is genuinely optional.

Example:

```text
Urgent Alert
→ On / Off
```

Core structural sections should not be easily disabled without a real requirement.

### 18.30 Homepage Section Order

Version 1 Homepage order remains fixed:

```text
Featured
Frequently Used Services
Latest Communication
Health Information
Health Service Discovery
Activities
Quick Access
Contact
```

Staff does not drag-and-drop section order.

The order reflects Information Architecture and user priority, not daily editorial preference.

### 18.31 Design Is Not CMS Content

Do not expose design-system decisions as editor settings.

Examples excluded:

```text
Hero Style A/B
Rounded/Square
Dark Theme
Gradient
Custom Card Style
Custom CSS
```

> **Content editors should not be responsible for visual system decisions.**

### 18.32 Media Handling

Use existing source Media when possible.

Featured may optionally override with an existing Media item.

Do not require duplicate image uploads for each Homepage use.

### 18.33 Permissions

Detailed permission design belongs in `06-roles-permissions.md`.

Homepage principle:

> Permission to edit source content does not automatically imply permission to change Homepage prominence.

Use a separate capability conceptually similar to:

```text
Manage Homepage
```

Do not create a separate Homepage-specific role unless later requirements justify it.

### 18.34 Change History

Homepage curation should use the same native revision/history evidence as other CMS-managed content/configuration where the platform supports it.

Version 1 does not require a Homepage-specific audit subsystem.

### 18.35 No Complex Rollback in Version 1

Version 1 does not require a dedicated visual rollback/revision system for Homepage configuration.

Auditability plus predictable configuration is sufficient initially.

Add revision restore only if a real operational need emerges.

### 18.36 Accepted Configuration Model

```text
Homepage Configuration
│
├── Urgent Alert
│   └── optional
│
├── Featured
│   ├── Main
│   └── Secondary 0–3
│
├── Frequently Used Services
│   └── 4–6 entries
│
├── Health Information
│   └── curated 0–4
│
├── Selected Health Services
│   └── 0–4
│
├── Quick Access
│   └── 3–5
│
└── System Sections
    ├── News → automatic
    ├── Announcement → automatic
    ├── Activities → automatic
    ├── Search → system
    ├── Area → Area Master
    ├── Contact → Contact Information
    └── Footer → global configuration
```

### 18.37 Accepted Admin UX

Conceptual Admin view:

```text
Homepage

[Featured]
Main: ...
Secondary: ...

[Frequently Used Services]
5 selected

[Health Information]
3 selected

[Health Service Discovery]
2 selected facilities

[Quick Access]
3 active

────────────────────

Automatic
✓ Latest News
✓ Announcements
✓ Activities

System Data
✓ Contact Information
✓ Area Master
✓ Footer

[Preview]
[Save Draft]
[Publish]
```

This is sufficient for Version 1.

### 18.38 Excluded from Version 1

Do not add:

- visual page builder
- drag-and-drop section order
- custom HTML blocks
- arbitrary widgets
- per-device content
- per-section custom CSS
- AI Homepage editor
- automatic popularity ranking
- visitor personalization
- A/B testing
- recommendation engine
- multiple Homepage variants
- complex visual revision rollback
- dynamic layout rules

These require a real future requirement before being introduced.

### 18.39 Accepted Principles

> **Homepage CMS controls priorities and curation, not layout construction.**

> **Homepage structure is fixed; content selection is configurable.**

> **Staff curates only Featured, Frequently Used Services, Health Information, Selected Health Services, Quick Access, and Urgent Alert when needed.**

> **News, Announcements, and Activities remain automatic according to their accepted rules.**

> **Search, Area, Contact, and Footer reuse system/master data and are not manually rebuilt on the Homepage.**

> **Homepage configuration should reuse source content rather than duplicate titles, URLs, contact data, or facility data.**

> **Preview + Draft + Publish is sufficient; mandatory approval is not required.**

> **Scheduling is limited to sections with a real temporal use case.**

> **Admin warnings are preferred over automatic correction.**

> **Homepage layout order, card style, and design-system decisions are not editor-configurable in Version 1.**

> **Homepage curation follows ordinary CMS edit/publish permissions; do not create a Homepage-specific role or audit subsystem in Version 1.**

> **No page builder, per-device content, AI ranking, A/B testing, or personalization is needed in Version 1.**

---

## 19. Accessibility-Specific Homepage Rules

### 19.1 Core Principle

> **Accessibility is a property of the Homepage itself, not an optional feature layered on afterward.**

> **Use accessible native patterns first; add special accessibility mechanisms only when a real need remains.**

Accessibility is designed into structure, content, interaction, responsive behavior, and components from the beginning.

### 19.2 Semantic Structure

Homepage should use meaningful semantic regions such as:

```text
Header
Navigation
Main
  Featured
  Services
  Latest Communication
  Health Information
  Health Service Discovery
  Activities
  Quick Access
  Contact
Footer
```

Do not build the entire page from non-semantic containers and attempt to repair accessibility later.

### 19.3 Heading Hierarchy

Headings must reflect document structure rather than visual styling.

The Homepage must have one logical page-level H1 and a consistent heading hierarchy.

Conceptually:

```text
H1: Page-level Homepage heading

H2: บริการประชาชน
H2: ข่าวสารและประกาศ
H2: ข้อมูลสุขภาพที่ควรรู้
H2: ค้นหาหน่วยบริการสุขภาพ
H2: กิจกรรมล่าสุด
H2: เข้าถึงข้อมูลสำคัญ
H2: ติดต่อสำนักงาน
```

Exact H1 copy is a Content/UI Design decision and is not frozen in this document.

Card headings use the appropriate next semantic level.

### 19.4 Skip Link

Provide a keyboard-accessible:

```text
ข้ามไปยังเนื้อหาหลัก
```

Skip Link.

This is a high-value, low-complexity accessibility feature.

### 19.5 Keyboard Navigation

All core Homepage functions must be operable with keyboard input.

This includes:

- Main Navigation
- Search
- Featured content
- Frequently Used Services
- News and Announcements
- Health Service Search
- Contact actions
- Footer links

Do not require pointer-only interaction.

### 19.6 Visible Focus

Keyboard focus must remain visibly apparent.

Do not remove browser focus indicators without providing an equally clear replacement.

Focus styling is part of the Design System.

### 19.7 Reading / Focus Order

> **Visual order, DOM order, keyboard order, and screen-reader reading order should tell the same story.**

Avoid CSS reordering that causes the visual and semantic sequences to diverge.

### 19.8 Mobile Navigation

Mobile Menu controls require meaningful accessible names and clear expanded/collapsed state.

Example:

```text
เปิดเมนูหลัก
```

Menu interaction should follow established accessible patterns rather than introducing a custom interaction framework without need.

### 19.9 Icons

Icons must not be the sole carrier of meaning.

For example, a telephone icon must have either:

- visible text such as `โทร`
- or an appropriate accessible name

Apply the same principle to Search, Menu, Directions, Downloads, and External Links.

### 19.10 Color

Color must not be the only way to communicate meaning.

Important states require text such as:

```text
เปิดรับสมัคร
ปิดรับสมัครแล้ว
ปิดให้บริการชั่วคราว
```

Do not communicate status only through red/green/gray styling.

### 19.11 Contrast

Text, links, controls, badges, status labels, and focus indicators must have sufficient contrast.

Contrast decisions belong in the Design System and should not be solved ad hoc per component.

### 19.12 Text Size and Layout

Do not reduce text to an uncomfortably small size merely to fit a layout.

If space becomes constrained:

- reduce secondary content
- allow wrapping
- adjust layout
- reduce decorative density

rather than shrinking important text excessively.

### 19.13 Text Resize

The Homepage must tolerate increased text size without:

- clipping
- overlap
- inaccessible fixed-height cards
- hidden controls
- broken navigation

Layouts should expand naturally.

### 19.14 Image Alternative Text

Images use alternative text according to their semantic role.

#### Informative image

Provide meaningful alt text.

#### Decorative image

Avoid redundant screen-reader announcement.

#### Logo

Use an appropriate organization identity description.

### 19.15 No Filename Alt Text

Do not use filenames such as:

```text
IMG_20260812_001.jpg
banner-final-2.jpg
```

as public alternative text.

CMS/Media workflows should make appropriate alt text easy to provide.

### 19.16 Important Text Outside Images

Important content remains real page text.

Preferred pattern:

```text
Image = visual support
Title = HTML
Summary = HTML
CTA = HTML
```

Do not depend on text embedded inside poster/banner images for essential meaning.

### 19.17 Card Link Behavior

Interactive cards should avoid multiple redundant focus targets pointing to the same destination.

Title, image, arrow, and CTA should not create unnecessary duplicate keyboard stops when one predictable card-link pattern is sufficient.

### 19.18 Meaningful Link Text

Avoid contextless link labels such as repeated:

```text
อ่านเพิ่มเติม
อ่านเพิ่มเติม
อ่านเพิ่มเติม
```

If a generic visual CTA is used, its accessible context must still identify the destination/topic.

Where the title already serves as the clear link, an additional duplicate CTA may not be necessary.

### 19.19 External Links

External links require a clear indication that the destination is outside the website.

The external-link icon must not be the only indication available to assistive technology.

### 19.20 Document Links

When useful, document links should identify file type.

Example:

```text
ดาวน์โหลดแบบฟอร์ม (PDF)
```

Avoid vague labels such as `คลิกที่นี่`.

Homepage does not need to display every file metadata field.

### 19.21 Form Labels

Search inputs and other Homepage forms require proper labels.

Placeholder text is a hint, not a replacement for a semantic label.

This applies to:

- Global Search
- Health Service Search
- other future Homepage form controls

### 19.22 Errors

Form errors must be communicated with text, not color alone.

Version 1 should use simple accessible validation rather than building a Homepage-specific validation framework.

### 19.23 Urgent Alert

Urgent Alert must be prominent and accessible without becoming disruptive.

Do not use:

- flashing animation
- autoplay sound
- forced modal popup
- repeated focus stealing

> **Urgency should be communicated clearly, not aggressively.**

### 19.24 Motion and Animation

Animation should remain optional visual enhancement.

Understanding or accessing content must not depend on animation.

### 19.25 No Autoplay Media in Version 1

Homepage Version 1 does not include:

- autoplay video
- autoplay audio
- animated hero video

This supports accessibility, performance, and simplicity.

### 19.26 No Core-Content Carousel Requirement

Core Homepage sections do not require carousels.

This avoids unnecessary complexity around:

- slide controls
- pause behavior
- keyboard interaction
- screen-reader announcements
- auto-rotation

### 19.27 Status Communication

Important operational states must appear as real text.

Examples:

```text
ปิดให้บริการชั่วคราว
หมดเขตรับสมัคร
บริการภายนอก
ประกาศหมดอายุ
```

Do not rely only on icon, color, or tooltip.

### 19.28 Touch Targets

Primary touch controls should be comfortably tappable with sufficient spacing.

Icon-only controls are used only where appropriate and require meaningful accessible names.

Exact dimensions belong to the later Design System.

### 19.29 Language

The website must declare its primary Thai language correctly for browsers and assistive technology.

English or other language fragments may receive appropriate language context where necessary.

This does not require a complex CMS language subsystem.

### 19.30 Plain Public Language

Homepage copy should favor language that citizens can understand.

Avoid unnecessary:

- bureaucratic phrasing
- unexplained acronyms
- technical terminology
- excessively long headings

Technical accessibility and understandable content both matter.

### 19.31 Date and Time Clarity

Use clear, contextual date/time formats.

Preferred examples:

```text
12 ส.ค. 2569
08.30–16.30 น.
รับสมัครถึง 20 ส.ค. 2569
```

Avoid ambiguous short numeric forms as the primary public presentation.

### 19.32 Map Alternative

Map remains an enhancement.

Users who cannot use the interactive Map must still be able to access:

- Address
- Phone
- Directions link

Do not require interaction with the Map canvas to obtain essential information.

### 19.33 Search Scope Boundary

Detailed accessibility behavior for full Search results, filters, and directory results belongs in:

- `08-search.md`
- relevant listing/detail specifications

`04-homepage.md` defines only Homepage entry behavior and accessibility principles.

### 19.34 Current / Expanded State

Navigation and interactive controls must expose meaningful state where applicable, including:

- focus
- expanded/collapsed menu
- current/active state

Do not rely on decorative animation to communicate state.

### 19.35 New-Tab Behavior

Do not force internal links to open new tabs/windows.

External links also follow normal browser behavior unless a specific requirement justifies a new browsing context.

If a new context is intentionally opened, that behavior should be communicated.

### 19.36 No Accessibility Toolbar Baseline

Version 1 does not require a floating accessibility toolbar such as:

```text
A+
A-
High Contrast
Grayscale
Read Aloud
```

Accessibility is provided primarily through:

- semantic structure
- keyboard access
- sufficient contrast
- scalable text
- proper labels
- responsive layout
- accessible content

Add specialized tools only when a real requirement remains after these fundamentals.

### 19.37 Accessible CMS Defaults

CMS and system components should make accessible output easier than inaccessible workarounds.

Examples:

- Media supports meaningful alt text
- heading structure is guided
- system components provide accessible labels/focus behavior
- Featured content uses real text rather than requiring text baked into images
- standard links/buttons use accessible defaults

> **Accessible defaults should require less effort than inaccessible workarounds.**

### 19.38 Accessibility Through the Delivery Lifecycle

Accessibility is treated as a quality requirement throughout:

```text
Design
→ Component
→ Content Entry
→ Development
→ QA
```

Do not create a separate mandatory Accessibility Approval workflow unless a future operational requirement justifies it.

### 19.39 Accepted Baseline

```text
Homepage Accessibility

Structure
├── Semantic regions
├── Logical headings
├── Skip link
└── Consistent DOM order

Interaction
├── Keyboard accessible
├── Visible focus
├── No hover dependency
├── Accessible menus/forms
└── No autoplay/carousel dependency

Content
├── Meaningful link text
├── Real text outside images
├── Clear status/deadlines
├── Image alt handling
└── Plain public language

Visual
├── Adequate contrast
├── Scalable text
├── Responsive layout
└── Touch-friendly controls

Fallback
├── Map alternatives
├── Image-independent meaning
└── Core functions remain usable
```

### 19.40 Accepted Principles

> **Accessibility is built into Homepage structure and components from the beginning, not added later as a widget.**

> **Semantic structure, logical headings, keyboard navigation, visible focus, and aligned DOM/visual order are baseline requirements.**

> **Core meaning must never rely only on color, icons, hover, images, or animation.**

> **Important text remains real HTML text rather than being baked into images.**

> **Forms use proper labels; placeholders do not replace labels.**

> **Urgent content is clearly communicated without flashing, autoplay, forced modal behavior, or unnecessary focus stealing.**

> **Homepage Version 1 does not require autoplay media, core-content carousels, or a floating accessibility toolbar.**

> **Maps and visual media are enhancements; essential information remains available without them.**

> **Editors should receive accessible defaults rather than being expected to manually solve accessibility on every content item.**

> **Accessibility is a quality requirement throughout design/development/QA, not a separate approval workflow.**

> **Exact visual measurements and component implementation belong to the later Design System/System Blueprint; `04-homepage.md` defines the current behavior and principles.**

---

## 20. Scope Boundary and Deferred Decisions

This document defines the current Homepage behavior, content ownership, priority, fallback, curation, responsive rules, and accessibility principles.

It does **not** define:

- exact visual styling, spacing, typography, color tokens, or breakpoints
- database tables or schema
- API contracts
- presentation component structure
- backend framework / ORM implementation
- exact Search ranking and indexing behavior (`08-search.md`)
- detailed CMS screens outside Homepage curation (`05-admin-cms.md`)
- detailed permission matrix (`06-roles-permissions.md`)
- detailed publishing workflow (`07-publishing-workflow.md`)
- migration mapping (`09-migration-plan.md`)
- system/deployment implementation (`10-system-blueprint.md`)
- cookie consent/banner mechanics beyond actual privacy/technology requirements
- continuous external-link monitoring
- advanced analytics, personalization, A/B testing, or recommendation systems

> **Complexity must be earned.**

Future requirements may revise this baseline through explicit impact review rather than by silently expanding Homepage responsibilities.

---

## 21. Clean Rebaseline — Homepage Baseline v2.1

**Status:** CLEAN REBASELINE v2.1 — CURRENT
**Version:** 2.1
**Rebaseline Date:** 6 ตุลาคม 2569 (2026-10-06)

This document is the current approved Homepage baseline for downstream design and implementation.

Current baseline means:

- downstream documents and implementation respect these decisions
- implementation may refine how the decisions are realized without changing Product behavior
- a genuine requirement change may revise the baseline through cross-document impact review
- convenience alone is not sufficient reason to bypass content ownership, canonical routing, accessibility, or complexity guardrails

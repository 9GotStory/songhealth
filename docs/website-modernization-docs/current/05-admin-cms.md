# Admin CMS — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 05-admin-cms  
> **Status:** FROZEN — Admin CMS Baseline  
> **Version:** 1.0  
> **Last Updated:** 14 สิงหาคม 2569  
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`, `04-homepage.md`  
> **Purpose:** กำหนดแนวทาง Admin CMS สำหรับเจ้าหน้าที่ โดยเน้น workflow ที่เรียบง่าย ใช้ Structured Content อย่างถูกต้อง และไม่เพิ่มความซับซ้อนเกินความจำเป็น

---

# 1. Purpose

Admin CMS ต้องทำให้เจ้าหน้าที่จัดการข้อมูลเว็บไซต์ได้ง่ายกว่าระบบเดิม โดยไม่ลดทอนความถูกต้องของโครงสร้างข้อมูล

หลักสำคัญ:

> **CMS should make the correct workflow the easiest workflow.**

> **Simple for Staff, Structured for the System.**

> **Best Practice by Default, but complexity must be earned.**

---

# 2. CMS Is Not a WordPress Clone

CMS ใหม่ไม่ควรกลับไปสู่แนวคิดทั่วไปแบบ:

```text
Posts
Pages
Media
Widgets
Plugins
```

แล้วให้เจ้าหน้าที่เป็นผู้ตีความเองว่าข้อมูลแต่ละชนิดควรอยู่ที่ใด

Admin UI ต้องพูดภาษางานจริงของสำนักงาน เช่น:

```text
ข่าวประชาสัมพันธ์
กิจกรรม
ประกาศ
ความรู้สุขภาพ
รายงานสุขภาพ
บริการประชาชน
หน่วยบริการสุขภาพ
เอกสารเผยแพร่
บุคลากร
ITA
```

ผู้ใช้งานไม่จำเป็นต้องเข้าใจ Database, Table, Relationship หรือ Content Architecture ภายใน

---

# 3. Proposed Admin Information Structure

แนวทางระดับ Foundation:

```text
Admin CMS
│
├── หน้าแรก
│
├── หน้าแรกเว็บไซต์
│
├── เนื้อหา
│   ├── ข่าวประชาสัมพันธ์
│   ├── กิจกรรม
│   ├── ประกาศ
│   ├── ความรู้สุขภาพ
│   ├── รายงานสุขภาพ
│   └── หน้าข้อมูลทั่วไป
│
├── บริการประชาชน
│
├── หน่วยบริการสุขภาพ
│
├── เอกสารเผยแพร่
│
├── ข้อมูลหน่วยงาน
│   ├── บุคลากร
│   ├── โครงสร้างหน่วยงาน
│   ├── หน่วยงานที่เกี่ยวข้อง
│   └── ข้อมูลติดต่อ
│
├── ITA
│
├── สื่อ
│
└── ระบบ
    ├── ผู้ใช้งานและสิทธิ์
    ├── Audit Log
    └── การตั้งค่าที่จำเป็น
```

ชื่อเมนูและ grouping ฉบับ Final จะพิจารณาในหัวข้อ Admin Navigation & Work Dashboard

---

# 4. Admin Home Is a Work Overview

Admin Home ไม่ใช่ BI Dashboard

หน้าหลัง Login ควรตอบคำถาม:

> **วันนี้มีอะไรที่ฉันควรจัดการ?**

แนวคิด:

```text
Admin Home

งานของฉัน
- Draft
- Scheduled
- Health Content ที่ถึงกำหนด Review

สถานะหน้าแรกเว็บไซต์
- Main Featured
- Health Information
- Urgent Alert

รายการล่าสุด
- ข่าว
- ประกาศ
- กิจกรรม

ทางลัด
[สร้างข่าว]
[สร้างกิจกรรม]
[อัปโหลดเอกสาร]
```

ไม่จำเป็นต้องมีกราฟหรือ KPI จำนวนมากโดยไม่มี requirement จริง

---

# 5. Content Creation

ไม่ควรบังคับให้เจ้าหน้าที่ใช้ generic `Create Content` แล้วเลือก Content Type จากรายการยาวทุกครั้ง

ควรมี entry point ที่ตรงกับงาน เช่น:

```text
+ ข่าวประชาสัมพันธ์
+ กิจกรรม
+ ประกาศ
+ ความรู้สุขภาพ
+ รายงานสุขภาพ
+ เอกสาร
```

หรือสร้างจากแต่ละ Module

---

# 6. Content-Type-Specific Forms

แต่ละ Content Type ใช้ Form ตามข้อมูลจริงของ Model

ตัวอย่าง News:

```text
ชื่อเรื่อง
สรุป
เนื้อหา
ภาพปก
หมวดหมู่ / Topic
พื้นที่
เอกสารที่เกี่ยวข้อง
การเผยแพร่
```

Activity:

```text
ชื่อกิจกรรม
วันที่
เวลา
สถานที่
ผู้เกี่ยวข้อง
รายละเอียด
ภาพปก
Gallery
พื้นที่
การเผยแพร่
```

Announcement:

```text
ชื่อประกาศ
ประเภท
รายละเอียด
เอกสาร
ช่วงเวลาที่มีผล
การเผยแพร่
```

ไม่ใช้ Form เดียวที่มี Field จำนวนมากสำหรับทุกชนิดข้อมูล

---

# 7. Form Organization

ใช้ Single Page Form ที่แบ่ง Section อย่างชัดเจน เช่น:

```text
ข้อมูลหลัก
รายละเอียด
การจัดหมวดหมู่
สื่อและเอกสาร
ความสัมพันธ์
การเผยแพร่
```

ไม่ใช้ Multi-step Wizard โดย default หาก workflow จริงไม่จำเป็น

---

# 8. Minimum Required Fields

Structured Content ต้องไม่กลายเป็นภาระกรอกข้อมูลเกินจำเป็น

> **Structure should improve consistency without turning data entry into bureaucracy.**

Required fields ให้มีเฉพาะสิ่งจำเป็นต่อ valid publication

Taxonomy หรือ relationship ที่ไม่จำเป็นควรเป็น optional หรือมี sensible default

---

# 9. Helpful Defaults

ใช้ Default เพื่อช่วยลดงานในกรณีที่สมเหตุสมผล เช่น:

```text
Source = สสอ.สอง
Audience = ประชาชนทั่วไป
Status = Draft
Language = ไทย
```

Default ต้องเป็น behavior ที่อธิบายได้และแก้ไขได้ตามสิทธิ์ ไม่ใช่ hidden magic

---

# 10. Publishing Foundation

ค่าเริ่มต้นตาม Foundation:

```text
Draft ON
Direct Publish ON
Scheduled Publish ON
Approval Workflow OFF
Audit Log ON
```

Workflow หลัก:

```text
Create
→ Draft
→ Preview
→ Publish / Schedule
→ Archive when appropriate
```

Approval เป็น optional capability ไม่ใช่ mandatory workflow

---

# 11. Draft Behavior

> **Draft should tolerate incompleteness; Publish should enforce validity.**

Draft สามารถบันทึกได้แม้ข้อมูลยังไม่ครบสำหรับเผยแพร่

Validation ที่จำเป็นต่อ public validity ใช้ตอน Publish

---

# 12. Autosave

Version 1 รองรับ lightweight autosave/recovery เพื่อป้องกันงานสูญหาย

ไม่ต้องเป็น real-time collaborative editor

แนวทาง:

```text
Manual Save Draft
+
lightweight autosave / recovery
```

---

# 13. Preview

Content ที่เหมาะสมควรรองรับ Preview ก่อนเผยแพร่

โดยเฉพาะ:

- News
- Activity
- Health Content
- Homepage

Preview เป็น read-only rendering ที่ใกล้เคียง Public presentation

ไม่ต้องเป็น visual page editor

---

# 14. Publishing Actions

Action หลักควรกระชับ เช่น:

```text
บันทึกร่าง
ดูตัวอย่าง
เผยแพร่
ตั้งเวลาเผยแพร่
เก็บถาวร
```

ไม่สร้าง action menu จำนวนมากโดยไม่มี use case

---

# 15. Delete and Lifecycle

Draft อาจ Delete ได้เมื่อมี confirmation

Published content ให้ prefer lifecycle action เช่น:

- Archive
- Hide
- Expire
- Supersede

มากกว่า Hard Delete

Hard Delete ของ Public content ต้องมีสิทธิ์และข้อจำกัดที่เหมาะสม

---

# 16. List Views

List View เป็น workflow หลักของแต่ละ Module

ควรแสดงเฉพาะข้อมูลที่ช่วยจัดการ เช่น:

```text
ชื่อเรื่อง
สถานะ
วันที่
ผู้แก้ไขล่าสุด
```

ไม่แสดงทุก field เป็น column

---

# 17. Admin Search and Filters

แต่ละ Module มี simple search/filter ตาม domain

ตัวอย่างทั่วไป:

```text
Search by title
Status
Type / Category
Date
```

Domain-specific filter:

- Activity → Date / Area
- Document → Document Type / Fiscal Year
- Health Service → Type / Area / Status

ไม่ต้องมี universal advanced query builder

---

# 18. Bulk Actions

Bulk Action ใช้เฉพาะสิ่งที่ปลอดภัยและมีประโยชน์จริง

เช่น:

```text
Archive selected
Change selected status
Add Topic
```

ไม่เปิด bulk delete หรือ bulk-edit ทุก field โดย default

---

# 19. Relationships

Relationship ต้องใช้ existing structured records ก่อน free-text เมื่อเหมาะสม

ตัวอย่าง:

```text
Activity
→ Internal Personnel = searchable selector
→ External Participants = free text when appropriate
```

เจ้าหน้าที่ไม่ต้องเข้าใจ foreign key หรือ internal IDs

---

# 20. Relationship Selectors

ใช้ searchable selector แบบตรงไปตรงมา

ตัวอย่าง:

- Related Health Service
- Related Document
- Related Organization
- Related Personnel

ไม่ใช้ nested modal หลายชั้นโดยไม่มีเหตุผล

---

# 21. Media Library

Media เป็น Shared Resource

Admin UX:

```text
เลือกจากคลัง
หรือ
อัปโหลดใหม่
```

Media Library ใช้สำหรับ Image, Logo และ Visual Asset

PDF / Document อยู่ใน Document Model

---

# 22. Image Metadata

เมื่อ Upload Image รองรับ:

```text
ไฟล์
Alt Text
Caption (optional)
Credit (optional)
```

ไม่บังคับ metadata ทุกช่องหากไม่จำเป็น

Alt Text อยู่ใน workflow ตาม Accessibility baseline

---

# 23. Image Delivery

ไม่สร้าง image editor ระดับ Photoshop ใน CMS

ใช้ delivery variants เช่น:

```text
Thumbnail
Card
Hero
Full
```

เป็น system-generated variants

Focal point หรือ advanced crop เพิ่มเฉพาะเมื่อมี use case จริง

---

# 24. Document Workflow

Document workflow ควรง่าย:

```text
Upload PDF
↓
ชื่อเอกสาร
ประเภท
วันที่เอกสาร
ปีงบประมาณ
Topic (ถ้ามี)
↓
Publish
```

Document กลาง reuse ได้กับ News, Service, Health Report, ITA, Plans และ context อื่น

ไม่ Upload ซ้ำในแต่ละ Module

---

# 25. ITA Admin UX

Data Model สามารถ Structured แต่ UX ต้องง่าย

ตัวอย่าง:

```text
ITA ปี 2569

MOIT 1
  ข้อ 1
    [เพิ่มหลักฐาน]
  ข้อ 2
    [เพิ่มหลักฐาน]
```

เจ้าหน้าที่สามารถเลือก Document เดิม หรือ Upload Document ผ่าน ITA UX

หาก Upload ผ่าน ITA UX ระบบสามารถสร้าง Document Resource กลางแล้วเชื่อมเป็น Evidence

> **Simple for Staff, Structured for the System.**

---

# 26. Personnel Admin Boundary

Personnel Admin ไม่ใช่ HRIS

ข้อมูลที่เหมาะสม:

```text
ชื่อ
ตำแหน่ง
หน่วยงาน
Role
Assignment
รูป
ข้อมูลติดต่อสาธารณะ
สถานะ
```

ไม่รวม HR data เช่น:

- เงินเดือน
- วันลา
- บัญชีธนาคาร
- ประเมินผล
- HR history เต็มระบบ

---

# 27. Health Service Admin Boundary

Health Service Admin เป็น Directory Data

ข้อมูลหลัก:

```text
ชื่อหน่วยบริการ
ประเภท
สังกัด
พื้นที่ตั้ง
พื้นที่บริการ
ที่อยู่
ข้อมูลติดต่อ
เวลาทำการ
บริการที่มี
สถานะ
```

ไม่เป็น HIS และไม่เก็บ Patient Data

---

# 28. Contact Information

Contact Information เป็น Shared Data

Admin จัดการ:

```text
ช่องทาง
ข้อมูลติดต่อ
วัตถุประสงค์
Public / Internal / Hidden
Primary
Status
```

Homepage, Footer, Service และ context อื่น reuse ข้อมูลกลาง

ไม่สร้าง Homepage Phone หรือ Footer Phone แยก

---

# 29. Human-Readable Status

Admin UI ใช้คำที่เจ้าหน้าที่เข้าใจ เช่น:

```text
เผยแพร่แล้ว
หมดอายุ
มีเอกสารใหม่แทน
ไม่ใช้งาน
ซ่อนจากสาธารณะ
```

Technical enum เป็น implementation detail

---

# 30. Validation

Validation message ต้องอธิบายปัญหาและวิธีแก้

ตัวอย่าง:

```text
กรุณาระบุชื่อเรื่อง
กรุณาเลือกวันที่กิจกรรม
ไม่สามารถเผยแพร่ได้ เนื่องจากไม่มีไฟล์เอกสาร
```

หลีกเลี่ยง generic `Validation failed`

---

# 31. Confirmation

Confirmation ใช้กับ action ที่มีความเสี่ยง เช่น:

- Delete
- Archive
- Replace Document
- Unpublish
- destructive bulk action

ไม่ถาม confirmation ในทุก Save

---

# 32. Unsaved Changes

ถ้าผู้ใช้แก้ไขข้อมูลแล้วออกจากหน้าโดยไม่บันทึก ระบบควรเตือนว่ามี unsaved changes

เป็น safety feature ที่เหมาะกับ Version 1

---

# 33. Permission-Aware UI

UI แสดง action ตาม capability ของผู้ใช้

ตัวอย่าง ผู้ใช้ที่ไม่มีสิทธิ์ Publish อาจเห็นเพียง:

```text
Save Draft
```

แทนการแสดง action ที่ใช้งานไม่ได้จำนวนมาก

Detailed Permission Matrix ไปกำหนดใน `06-roles-permissions.md`

---

# 34. Auditability

Audit Log เก็บโดยระบบ

อย่างน้อยรองรับ:

```text
ใคร
ทำอะไร
เมื่อไร
```

ไม่บังคับ editor กรอกเหตุผลทุกการแก้ไข

Reason/Note เพิ่มเฉพาะ action ที่มีความสำคัญจริง

---

# 35. Notifications

Version 1 ไม่ต้องมี Notification Center ซับซ้อน

แจ้งเฉพาะ actionable event เช่น:

- Health Content ถึงกำหนด Review
- Scheduled Publish สำเร็จ/ล้มเหลว
- Homepage source ใช้งานไม่ได้

ไม่ต้องส่ง Email ทุก event โดย default

---

# 36. Admin Search vs Public Search

Admin Search มีเป้าหมาย:

> ค้นหา Record เพื่อจัดการ/แก้ไข

Public Search มีเป้าหมาย:

> ค้นหาข้อมูลเพื่อใช้งาน

UX และ Permission จึงไม่จำเป็นต้องเหมือนกัน แม้อาจ reuse infrastructure บางส่วน

---

# 37. Settings Scope

Settings ต้องมี scope จำกัด

Version 1 ควรมีเฉพาะ:

```text
ข้อมูลพื้นฐานเว็บไซต์
ค่าที่ใช้เป็น default
Publishing defaults ที่จำเป็น
```

Master Data ควรมี Module ที่เหมาะสม ไม่ยัดทุกอย่างไว้ใน Settings

Official/Public Channels เป็นข้อมูลที่ Contact Information เป็นเจ้าของตามโครงสร้างที่ Freeze แล้ว ไม่ใช่ Settings.

---

# 38. No Custom Code for Normal Editors

Normal Editor ไม่ควรมี:

```text
Custom HTML
Custom CSS
JavaScript
Arbitrary Script Embed
```

External Embed ที่รองรับควรผ่าน system component ที่ควบคุมได้

---

# 39. Rich Text Editor

Rich Text Editor รองรับเฉพาะ formatting ที่มีเหตุผล เช่น:

- Paragraph
- Heading
- Bold / Italic
- List
- Link
- Quote
- Table when appropriate
- structured Media / Document insertion

ไม่ควรมี:

- arbitrary Font Family
- arbitrary Font Size
- arbitrary Text Color
- inline CSS
- custom HTML

Presentation เป็นหน้าที่ของ Design System

---

# 40. Copy / Paste

Editor ควร sanitize formatting จาก Word / Google Docs

รักษาเนื้อหาสำคัญ เช่น:

- Paragraph
- Bold
- List
- Link

และตัด formatting ที่สร้างปัญหา เช่น:

- hidden styles
- arbitrary fonts
- inline colors

---

# 41. Thai Content UX

Admin CMS ต้องรองรับภาษาไทยได้ดี

รวมถึง:

- text editing
- search
- wrapping
- Thai date presentation
- automatic slug generation

Staff ไม่ต้องกรอก slug ด้วยตัวเอง

---

# 42. Admin Responsive Strategy

> **Admin CMS = Desktop-first productivity, Responsive enough for light mobile tasks.**

Desktop เป็น primary working environment

Mobile สามารถใช้กับงานเบา เช่น:

- ดูรายการ
- quick edit บางส่วน
- publish content ที่จำเป็น
- review status

ไม่ต้อง optimize complex ITA/Data management ให้เทียบ Desktop ใน Version 1

ไม่สร้าง Mobile Admin อีกระบบหนึ่ง

---

# 43. No Offline-First Requirement

Version 1 ไม่ต้องมี:

- PWA offline editing
- offline drafts
- sync conflict engine
- background upload queue

Lightweight autosave/recovery เพียงพอ

---

# 44. No Real-Time Collaboration Requirement

Version 1 ไม่ต้องเป็น Google Docs-style collaborative editor

ไม่ต้องมี:

```text
ผู้ใช้ A กำลังแก้ย่อหน้าที่ 3
```

Concurrency/conflict handling แบบพอดีสามารถออกแบบใน System Blueprint

---

# 45. Proposed Admin CMS Architecture

```text
Admin CMS

├── Home / Work Overview
├── Homepage Curation
├── Editorial Content
│   ├── News
│   ├── Activities
│   ├── Announcements
│   ├── Health Content
│   └── Basic Pages
├── Citizen Services
├── Health Services
├── Documents
├── Organization Data
│   ├── Personnel
│   ├── Organization
│   └── Contact
├── ITA
├── Media
└── Administration
    ├── Users / Permissions
    ├── Audit Log
    └── Minimal Settings
```

---

# 46. Excluded from Admin CMS Version 1

Do not add without a real requirement:

- generic page builder
- plugin architecture
- theme editor
- custom CSS editor
- custom JavaScript editor
- arbitrary widgets
- real-time collaborative editing
- workflow designer
- full DMS
- HRIS
- CRM
- BI dashboard builder
- AI content generator as a core workflow
- personalization engine
- multilingual CMS subsystem without requirement
- offline-first editor
- dedicated Mobile Admin App
- complex notification center

---

# 47. Accepted Admin CMS Foundation Principles

> **CMS speaks the language of staff work, not database or technical concepts.**

> **Simple for Staff, Structured for the System.**

> **The correct structured workflow should be easier than creating duplicate or unstructured content.**

> **Each Content Type receives a form appropriate to its actual data model rather than one giant generic editor.**

> **Required fields are kept to the minimum necessary for valid publication.**

> **Draft tolerates incomplete work; Publish enforces validity.**

> **Preview, Draft, Direct Publish, Scheduled Publish, Archive, and Audit form the default publishing foundation.**

> **Approval remains optional and off by default.**

> **CMS reuses central Documents, Media, Personnel, Organizations, Health Services, Areas, and Contact data rather than asking staff to enter them repeatedly.**

> **Admin Homepage is a work overview, not a BI dashboard.**

> **Admin CMS is desktop-first for productivity but responsive enough for practical light mobile tasks.**

> **Editors control content; the Design System controls visual presentation.**

> **No generic page builder, plugin system, custom code editor, collaboration suite, workflow designer, or other enterprise-CMS complexity is needed in Version 1.**

---


# 48. Admin Navigation & Work Dashboard

## 48.1 Core Principles

> **Admin navigation should reflect staff tasks, not the internal data architecture.**

> **The Admin Home should help staff decide what to do next, not display everything the system knows.**

Admin navigation must remain understandable to staff without exposing database-oriented terminology.

## 48.2 Top-Level Navigation

Accepted top-level Admin navigation:

```text
ภาพรวมงาน
หน้าแรกเว็บไซต์
เนื้อหา
บริการประชาชน
หน่วยบริการสุขภาพ
เอกสารเผยแพร่
ข้อมูลหน่วยงาน
ITA
สื่อ
ระบบ
```

The navigation remains intentionally limited.

Do not expose every Content Type as a separate top-level menu when grouping improves usability.

## 48.3 “ภาพรวมงาน” vs “หน้าแรกเว็บไซต์”

Use:

```text
ภาพรวมงาน
```

for the Admin landing page after Login.

Use:

```text
หน้าแรกเว็บไซต์
```

for Homepage Curation.

These must remain separate concepts to avoid ambiguity.

## 48.4 Content Group

Accepted structure:

```text
เนื้อหา
├── ข่าวประชาสัมพันธ์
├── กิจกรรม
├── ประกาศ
├── ความรู้สุขภาพ
├── รายงานสุขภาพ
└── หน้าข้อมูลทั่วไป
```

`หน้าข้อมูลทั่วไป` is the staff-facing label for Basic Page.

Staff does not need to work with the architectural term `Basic Page`.

## 48.5 Citizen Services

`บริการประชาชน` remains a distinct top-level module because Service workflow differs materially from editorial content.

Version 1 does not require multiple Service taxonomy submenus by default.

Preferred starting point:

```text
บริการประชาชน
└── รายการบริการ
```

Category/filtering can remain within the module list unless future workflow justifies a dedicated taxonomy screen.

## 48.6 Health Services

`หน่วยบริการสุขภาพ` remains a distinct top-level module.

Preferred structure:

```text
หน่วยบริการสุขภาพ
└── รายการหน่วยบริการ
```

Do not create separate top-level menus for Hospital, รพ.สต., สสช., etc.

Use Health Service Type as filtering/classification.

## 48.7 Documents

`เอกสารเผยแพร่` remains a distinct top-level module because Document is the central shared resource for published files.

Preferred structure:

```text
เอกสารเผยแพร่
├── เอกสารทั้งหมด
└── เพิ่มเอกสาร
```

Do not create separate menus for PDF, Forms, Reports, Plans, etc.

Use Document Type, Topic, and Fiscal Year as structured filters.

## 48.8 Organization Data

Accepted group:

```text
ข้อมูลหน่วยงาน
├── บุคลากร
├── โครงสร้างหน่วยงาน
├── หน่วยงานที่เกี่ยวข้อง
└── ข้อมูลติดต่อ
```

Area does not become top-level navigation by default because it is lower-frequency shared master data.

## 48.9 ITA

ITA remains a top-level module because it has a materially distinct workflow.

Version 1 should prefer one primary ITA workspace:

```text
ITA
→ เลือกปีงบประมาณ
→ MOIT
→ Requirement
→ Evidence
```

Do not create a large permanent ITA submenu hierarchy unless actual usage requires it.

## 48.10 Media

Accepted structure:

```text
สื่อ
└── คลังสื่อ
```

Use this module for:

- Images
- Logos
- Visual Assets

Documents/PDFs remain in `เอกสารเผยแพร่`.

Staff mental model:

```text
ไฟล์เอกสาร → เอกสารเผยแพร่
รูปภาพ → สื่อ
```

## 48.11 System Administration

`ระบบ` is visually separated from normal editorial/content work.

Conceptual structure:

```text
ระบบ
├── ผู้ใช้งาน
├── สิทธิ์การใช้งาน
├── Audit Log
├── ข้อมูลอ้างอิง
└── การตั้งค่า
```

Detailed roles and permission behavior belongs in `06-roles-permissions.md`.

## 48.12 Reference Data Boundary

`ข้อมูลอ้างอิง` may contain shared low-frequency master/taxonomy data such as:

```text
พื้นที่
Topic
Audience
ประเภทหน่วยบริการ
ประเภทเอกสาร
หมวดหมู่ที่ใช้ร่วมกัน
```

Guardrail:

> Shared taxonomy/master data receives a management UI only when staff actually needs to maintain it.

Do not create a large generic Master Data Center merely because structured values exist.

## 48.13 Desktop Navigation Pattern

Preferred Desktop Admin layout:

```text
Left Sidebar
+
Top Bar
+
Main Content
```

Do not use:

- mega menu
- top navigation with many module tabs
- icon-only navigation by default
- dashboard tiles as the only navigation method

## 48.14 Sidebar Labels

Default Sidebar uses Icon + Text.

Icon-only collapsed navigation is not the default.

A collapsible sidebar may be added as a convenience if useful, but users should not be required to memorize icons.

## 48.15 Top Bar

Top Bar should remain minimal.

Preferred elements:

```text
Page Title / Breadcrumb
Admin Search (when available)
User Menu
ดูเว็บไซต์
```

Do not add non-required controls such as:

- notification bell without a real notification center
- chat
- calendar
- analytics shortcuts
- full-screen control
- unnecessary theme switcher

## 48.16 Public Website Shortcut

Provide a clear:

```text
ดูเว็บไซต์
```

action.

Published records may also offer a contextual:

```text
ดูหน้าจริง
```

action where appropriate.

## 48.17 Admin Breadcrumbs

Use breadcrumbs where hierarchy helps orientation.

Examples:

```text
เนื้อหา > ข่าวประชาสัมพันธ์ > แก้ไขข่าว
```

```text
ITA > ปี 2569 > MOIT 3
```

Top-level list screens do not require unnecessary breadcrumb depth.

Every page still requires a clear page title.

## 48.18 Work Dashboard Scope

The Admin landing page is not a BI dashboard.

Accepted four core blocks:

```text
ภาพรวมงาน

├── งานที่ต้องจัดการ
├── หน้าแรกเว็บไซต์
├── ทางลัด
└── รายการแก้ไขล่าสุด
```

## 48.19 Tasks Block

`งานที่ต้องจัดการ` may include actionable items such as:

```text
ร่างของฉัน
กำหนดเผยแพร่
ถึงกำหนด Review
รายการที่มี Warning
```

Only show items the current user can meaningfully act upon.

## 48.20 “ร่างของฉัน”

Draft summary should primarily mean Drafts owned/edited by the current user.

Do not use a large system-wide Draft count as the default dashboard signal.

The purpose is to help staff resume their work.

## 48.21 Scheduled Publishing

Scheduled content may be summarized as:

```text
กำหนดเผยแพร่
- ข่าว A — 14 ส.ค. 08:00
```

Show concise upcoming information or an actionable count.

Do not add a calendar widget solely for scheduled publishing.

## 48.22 Health Content Review Tasks

Because Health Content has review dates, the dashboard may show:

```text
ถึงกำหนดตรวจสอบ
ใกล้ถึงกำหนดตรวจสอบ
```

Use simple date-based status.

Do not introduce a scoring or priority algorithm.

## 48.23 No Separate Publishing KPI Block

A separate generic `สถานะการเผยแพร่` KPI block is not required in Version 1.

Relevant Draft, Scheduled, Review, and Warning states are already covered by `งานที่ต้องจัดการ`.

Avoid duplicate dashboard information.

## 48.24 Homepage Status Block

`หน้าแรกเว็บไซต์` shows only a concise operational summary, for example:

```text
Main Featured: ...
Urgent Alert: ปิด
Health Information: 3 รายการ
```

and:

```text
[จัดการหน้าแรกเว็บไซต์]
```

Do not embed a complete Homepage preview inside the Work Dashboard.

## 48.25 Quick Actions

Accepted Quick Actions should remain limited, approximately 4–5 items, for commonly used work.

Example:

```text
+ ข่าวประชาสัมพันธ์
+ กิจกรรม
+ ประกาศ
+ เอกสาร
+ ความรู้สุขภาพ
```

Quick Actions are permission-aware.

Users do not customize Quick Actions in Version 1.

## 48.26 Recent Items

Use:

```text
รายการแก้ไขล่าสุด
```

as a work-resumption tool.

Show a concise set of recent records, for example 5–8 items, with useful context such as:

- Type
- Title
- Status
- Last modified time/date

Do not turn this into an Audit Activity Feed.

## 48.27 Recent Items ≠ Audit Log

Do not show low-level events such as:

```text
User A logged in
User B changed field X
User C downloaded a PDF
```

in Recent Items.

Audit history belongs in Audit Log.

## 48.28 No User-Customizable Dashboard

Version 1 does not provide:

- drag-and-drop dashboard widgets
- per-user widget visibility settings
- per-user dashboard layout
- customizable dashboard cards

> **A well-designed default beats a customizable dashboard nobody needs.**

## 48.29 Permission-Aware Dashboard

Dashboard content derives from the user's capabilities.

Example:

A user who manages only News should not see unavailable create actions for ITA or User Management.

Do not create separate dashboard templates for every role.

Use capability-aware rendering.

## 48.30 Actionable Counts

Any count displayed on the dashboard should lead to relevant work.

Examples:

```text
ร่างของฉัน 3
ถึงกำหนด Review 2
กำหนดเผยแพร่ 1
```

These should link to filtered lists where appropriate.

Avoid decorative lifetime counts such as:

```text
ข่าวทั้งหมด 1,294
รูปทั้งหมด 7,829
```

without workflow value.

## 48.31 Admin Search

Module-level Search is required.

Global Admin Search is useful but not a Version 1 blocker.

Priority:

```text
Module Search = Required
Global Admin Search = Optional / may be deferred
```

Do not over-engineer Global Search before module workflows are proven.

## 48.32 Global Create Button

A permanent global `+ Create` menu is not required in Version 1.

Module-specific creation plus Dashboard Quick Actions are sufficient.

Add Global Create later only if usability testing shows clear benefit.

## 48.33 Sidebar Badges

Do not fill the Sidebar with counts/badges.

Sidebar badges are optional only for highly actionable states.

Prefer Work Dashboard as the primary warning/task surface.

## 48.34 Accepted Sidebar Order

```text
ภาพรวมงาน

หน้าแรกเว็บไซต์

เนื้อหา
บริการประชาชน
หน่วยบริการสุขภาพ
เอกสารเผยแพร่
ข้อมูลหน่วยงาน
ITA
สื่อ

────────

ระบบ
```

System Administration is visually separated from daily content work.

Minor ordering adjustments may be informed later by usability testing without changing the architectural grouping.

## 48.35 Mobile Navigation

Admin is Desktop-first.

On Mobile:

```text
Top Header
☰ Menu
Page Title
```

The Desktop Sidebar becomes a drawer/navigation panel.

Do not create a separate Mobile Admin navigation system or bottom navigation bar.

## 48.36 Mobile Work Dashboard

Mobile Dashboard stacks the same information.

Exact responsive ordering is deferred to the later Admin Responsive section.

Core content remains the same across Desktop and Mobile.

## 48.37 Empty Work Dashboard

If a user has no Drafts, Warnings, or scheduled tasks, show a useful empty state rather than a blank screen.

Example:

```text
ยังไม่มีงานที่ต้องจัดการ

เริ่มต้นงานใหม่
[สร้างข่าว]
[สร้างกิจกรรม]
[เพิ่มเอกสาร]
```

Actions remain permission-aware.

## 48.38 System Health Boundary

Do not show operational infrastructure metrics on the normal Editor Dashboard.

Excluded examples:

```text
Database Connected
Redis Status
Server CPU
Disk Usage
```

System Health belongs to a technical operations context if a future requirement emerges.

## 48.39 Analytics Boundary

Do not include public analytics in the Version 1 Admin Work Dashboard by default.

Excluded baseline examples:

- Page Views
- Visitors
- Popular News
- Traffic Sources

Analytics may be introduced later in a dedicated reporting context if a real requirement appears.

## 48.40 Accepted Navigation Baseline

```text
Admin CMS

├── ภาพรวมงาน
│
├── หน้าแรกเว็บไซต์
│
├── เนื้อหา
│   ├── ข่าวประชาสัมพันธ์
│   ├── กิจกรรม
│   ├── ประกาศ
│   ├── ความรู้สุขภาพ
│   ├── รายงานสุขภาพ
│   └── หน้าข้อมูลทั่วไป
│
├── บริการประชาชน
│
├── หน่วยบริการสุขภาพ
│
├── เอกสารเผยแพร่
│
├── ข้อมูลหน่วยงาน
│   ├── บุคลากร
│   ├── โครงสร้างหน่วยงาน
│   ├── หน่วยงานที่เกี่ยวข้อง
│   └── ข้อมูลติดต่อ
│
├── ITA
│
├── สื่อ
│
└── ระบบ
    ├── ผู้ใช้งาน
    ├── สิทธิ์การใช้งาน
    ├── Audit Log
    ├── ข้อมูลอ้างอิง
    └── การตั้งค่า
```

## 48.41 Accepted Work Dashboard

```text
ภาพรวมงาน

งานที่ต้องจัดการ
- ร่างของฉัน
- กำหนดเผยแพร่
- ถึงกำหนด Review
- Warnings

หน้าแรกเว็บไซต์
- Main Featured
- Urgent Alert
- Health Information
- [จัดการหน้าแรกเว็บไซต์]

ทางลัด
- + ข่าวประชาสัมพันธ์
- + กิจกรรม
- + ประกาศ
- + เอกสาร
- + ความรู้สุขภาพ

รายการแก้ไขล่าสุด
- recent editable records
```

## 48.42 Accepted Principles

> **Admin navigation is organized around staff tasks and content responsibilities, not database architecture.**

> **Use “ภาพรวมงาน” for the Admin landing page and “หน้าแรกเว็บไซต์” for Homepage Curation to avoid ambiguity.**

> **The primary navigation contains a limited set of clear modules; Content Types are grouped where it improves discoverability.**

> **Health Services, Documents, ITA, and Citizen Services remain distinct modules because their workflows differ materially from editorial content.**

> **Shared low-frequency master data belongs under a controlled reference-data area rather than becoming top-level navigation by default.**

> **Desktop uses a text-labelled sidebar; icon-only navigation is not the default.**

> **The Admin Work Dashboard contains only four core areas: Tasks, Homepage Status, Quick Actions, and Recent Items.**

> **Dashboard counts must be actionable and lead to filtered work lists.**

> **The Dashboard is permission-aware but does not require separate dashboard templates per role.**

> **No user-customizable dashboard, analytics widgets, system-health metrics, calendar dashboard, or BI charts are needed in Version 1.**

> **Module-level search is required; Global Admin Search is useful but may be deferred if it adds unnecessary Version 1 complexity.**

> **System administration is visually separated from normal content work.**



# 49. Content List / Search / Filter Behavior

## 49.1 Core Principles

> **A content list is a work surface, not a database table.**

> **Show only the information and controls that help staff find, understand, and act on records.**

All Admin modules should share a recognizable list/search/filter pattern while exposing only information that is useful for that domain.

## 49.2 Common List Pattern

Baseline:

```text
Page Title                         [+ สร้างรายการ]

Search [........................]

Filters
[สถานะ] [ประเภท/หมวด] [วันที่] [ตัวกรองเฉพาะ Module]

------------------------------------------------------
ชื่อ / รายการ            สถานะ       วันที่      แก้ไขล่าสุด
------------------------------------------------------
...
```

The interaction pattern remains consistent even when columns and filters differ by module.

> **Same interaction pattern, domain-specific information.**

## 49.3 Default Column Density

Default lists should normally expose only a small set of high-value columns.

Do not expose every Content Model field merely because it exists.

Aim for approximately 4–6 meaningful columns where practical.

## 49.4 News List

Preferred fields:

```text
ชื่อเรื่อง
สถานะ
หมวด / Topic
วันที่เผยแพร่
แก้ไขล่าสุด
```

Thumbnail is optional and not required if it harms density or performance.

## 49.5 Activity List

Activity list should prioritize event information.

Preferred fields:

```text
ชื่อกิจกรรม
วันที่กิจกรรม
สถานที่ / พื้นที่
สถานะ
แก้ไขล่าสุด
```

Activity Date is more useful than generic Published Date for this domain.

## 49.6 Announcement List

Preferred fields:

```text
ชื่อประกาศ
ประเภท
สถานะ
วันที่เผยแพร่
กำหนดสิ้นสุด / Deadline
```

Lifecycle context should be easy to scan.

## 49.7 Health Content List

Preferred fields:

```text
ชื่อเรื่อง
Topic
สถานะเผยแพร่
ตรวจสอบล่าสุด
กำหนดตรวจสอบครั้งถัดไป
```

Review state should remain visible when relevant.

## 49.8 Service List

Preferred fields:

```text
ชื่อบริการ
Ownership
ช่องทาง
สถานะ
แก้ไขล่าสุด
```

The UI should present human-readable Thai labels for Ownership and Channel rather than technical enum values.

## 49.9 Health Service List

Preferred fields:

```text
ชื่อหน่วยบริการ
ประเภท
ตำบล / พื้นที่
สังกัด
สถานะ
```

Do not force contact information into the default list if it reduces readability.

## 49.10 Document List

Preferred fields:

```text
ชื่อเอกสาร
ประเภท
วันที่เอกสาร
ปีงบประมาณ
สถานะ
```

A small File Type badge such as `PDF` may be shown when useful.

Do not use the physical filename as the content title.

## 49.10A Health Report List

Health Report is managed as metadata + a related report Document, not as extracted analytical metrics.

Preferred fields:

```text
ชื่อรายงาน
ประเภทรายงาน / Topic
ปีงบประมาณ / ช่วงรายงาน
สถานะ
วันที่เผยแพร่
```

Useful filters include Status, Report Type/Topic, Fiscal Year, and Reporting Period where applicable. The canonical public detail remains `/health/reports/{public-id}/{slug?}` and the PDF is a related Document resource.

## 49.11 Personnel List

Preferred fields:

```text
ชื่อ-นามสกุล
ตำแหน่ง
หน่วยงาน
บทบาทสำคัญ
สถานะ
```

Do not expose unnecessary personal contact information in the list.

## 49.12 Search Placement

Every primary module list should provide Search near the top of the work surface.

Examples:

```text
ค้นหาข่าว...
ค้นหากิจกรรม...
ค้นหาเอกสาร...
ค้นหาหน่วยบริการ...
```

Users should not need to open an advanced filter panel before basic searching.

## 49.13 Search Scope

Default module search should focus on identifiers staff realistically remembers.

At minimum:

```text
Title / Name
```

Additional high-value fields may be searchable where justified, for example:

```text
Document Number
```

for Documents.

Version 1 does not require full-text indexing of every field.

## 49.14 No Advanced Search Language

Do not provide enterprise-style query syntax such as:

```text
Title contains ...
AND Topic ...
OR Created By ...
NOT Area ...
```

Simple Search + Filters is sufficient.

## 49.15 Domain-Specific Filters

Accepted baseline:

| Module | Core Filters |
|---|---|
| News | Status, Category/Topic, Date |
| Activity | Status, Activity Date, Area |
| Announcement | Status, Type, Deadline/Date |
| Health Content | Status, Topic, Review State |
| Service | Status, Ownership, Channel |
| Health Service | Status, Type, Area |
| Document | Status, Type, Fiscal Year |
| Personnel | Status, Organization/Unit |

Filters should match real staff tasks rather than exposing every available field.

## 49.16 Filter Density

Default visible filters should normally remain limited to approximately 2–4 high-value controls.

Secondary filters may appear under a simple `ตัวกรองเพิ่มเติม` affordance if needed.

Do not create an Advanced Filter Builder.

## 49.17 Active Filter Visibility

Current filter state must be obvious.

Example:

```text
สถานะ: ร่าง
ปีงบประมาณ: 2569
```

Provide a clear:

```text
ล้างตัวกรอง
```

action.

Users should never have to guess why records disappeared from the list.

## 49.18 Filter State and URL

Where practical, search/filter/sort/page state should be reflected in URL/query state.

Benefits include:

- refresh preserves context
- browser Back/Forward works predictably
- filtered views can be bookmarked
- authorized users may share a filtered Admin URL

Exact query parameter design belongs to the later System Blueprint.

## 49.19 Natural Default Sorting

Do not apply `Created At DESC` to every domain.

Preferred intent:

```text
News
→ Published / Updated context

Activity
→ Activity Date DESC

Announcement
→ Current / Published context

Health Content
→ Updated / Review context

Document
→ Document Date DESC

Health Service
→ Name ASC

Personnel
→ Organization / Display Order / Name
```

Exact secondary sort details may be refined later.

## 49.20 Deterministic Sort

> **Same data state should produce the same list order.**

When primary sort values are equal, implementation should use a stable secondary order.

Do not use random or unstable ordering.

## 49.21 User-Selectable Sort

Expose sort options only where they materially help staff.

Examples:

Document:

```text
วันที่ใหม่สุด
ชื่อ A–Z
แก้ไขล่าสุด
```

Health Service:

```text
ชื่อ
ประเภท
พื้นที่
```

Do not make every column sortable by default.

## 49.22 Pagination

Use predictable pagination rather than infinite scroll.

Example:

```text
ก่อนหน้า
1 2 3 4
ถัดไป
```

This better supports:

- returning to a known position
- bulk selection
- navigating back from Edit
- stable work sessions

## 49.23 Page Size

Use a sensible system default, approximately 20–30 records per page.

Exact number belongs to UI implementation.

Do not require a configurable page-size preference in Version 1 without a demonstrated need.

## 49.24 Row Navigation

Primary Title / Name acts as the clear entry point to the record.

Preferred:

```text
Title / Name
→ Edit / Detail
```

Secondary actions may live in a concise row action menu.

Do not make the entire row an ambiguous click target when it interferes with selection or keyboard behavior.

## 49.25 Row Actions

Keep row actions limited.

Typical examples:

```text
แก้ไข
ดูตัวอย่าง / ดูหน้าจริง
เก็บถาวร
```

Destructive actions belong at the end of the menu and require appropriate confirmation.

## 49.26 Published Record Action

Published records should provide easy access to their public canonical page through an action such as:

```text
ดูหน้าจริง
```

Editing remains the primary row action.

## 49.27 Status Presentation

Status uses readable text and supporting visual treatment.

Examples:

```text
ร่าง
เผยแพร่แล้ว
ตั้งเวลาเผยแพร่
หมดอายุ
เก็บถาวร
ไม่ใช้งาน
```

Color may support meaning but is never the only indicator.

## 49.28 Status vs Warning

Lifecycle Status and operational Warning remain separate.

Example:

```text
สถานะ: เผยแพร่แล้ว
Warning: ถึงกำหนด Review
```

Do not redefine a Published Health Content record as `Review Overdue` lifecycle status.

## 49.29 Selection Checkboxes

Show row selection checkboxes only in modules where bulk actions provide real value.

Do not add checkboxes universally if no meaningful bulk workflow exists.

## 49.30 Bulk Actions

Bulk actions must remain intentionally limited and domain-safe.

Possible examples:

```text
Archive
Change Topic
Change Area
```

Availability depends on module and lifecycle rules.

## 49.31 No Bulk Publish by Default

> **Bulk Publish is not enabled by default in Version 1.**

Publishing has direct public impact and should remain a deliberate action.

Migration/import workflows may use separate administrative tooling later.

## 49.32 No Destructive Bulk Delete Baseline

Do not provide destructive bulk delete for Published content.

Archive/lifecycle actions are preferred.

Bulk Draft deletion may be considered later only if a real operational need appears.

## 49.33 Optional Bulk Taxonomy Assignment

Bulk taxonomy assignment may be useful for selected workflows such as migration cleanup.

Example:

```text
เลือก 10 ข่าว
→ เพิ่ม Topic: ไข้เลือดออก
```

This is an optional Version 1 capability, not a requirement for every module.

## 49.34 Empty State

When a module genuinely has no records:

```text
ยังไม่มีข่าวประชาสัมพันธ์

[สร้างข่าวประชาสัมพันธ์]
```

When records exist but current filters return none:

```text
ไม่พบข้อมูลตามตัวกรองนี้
[ล้างตัวกรอง]
```

These are distinct states and should not be presented identically.

## 49.35 Search No Results

Example:

```text
ไม่พบรายการที่ตรงกับ “ไข้เลือดออก”
```

Provide a clear way to clear or modify the search.

Do not silently search other modules.

## 49.36 Loading State

Use a simple, stable loading state while list data is loading.

Do not rely on complex animation.

## 49.37 Error State

If data cannot be loaded, show a user-oriented message such as:

```text
ไม่สามารถโหลดข้อมูลได้
[ลองอีกครั้ง]
```

Do not expose stack traces or technical implementation details to normal editors.

## 49.38 No Column Customization in Version 1

Do not provide:

- choose columns
- drag/reorder columns
- save column preferences
- custom list layout

A well-designed default view is sufficient initially.

## 49.39 No Saved Views in Version 1

Do not provide Saved Filters / Saved Views such as:

```text
My View
Monthly News
Old Documents
```

Add only if real usage later demonstrates repeated need.

## 49.40 No Universal “All / Mine” Tabs

Do not make `ทั้งหมด / ของฉัน` a mandatory pattern across every module.

Use owner/editor filters only where they improve workflow.

The Dashboard already provides `ร่างของฉัน`.

## 49.41 Date Filters

Date controls should use domain-appropriate behavior.

Examples:

- Activity may use an Activity Date range
- Document may rely primarily on Fiscal Year
- News may use publication date

Presets such as Today / This Month are optional and not required everywhere.

## 49.42 Fiscal Year

Document and ITA filtering must use the structured Fiscal Year field.

Do not infer Fiscal Year solely from Published Date.

## 49.43 Search + Filter Semantics

Search and active filters use predictable AND behavior.

Example:

```text
Search = "ไข้เลือดออก"
Topic = ควบคุมโรค
Status = Published
```

means the result must satisfy all active conditions.

Do not introduce opaque fuzzy filter combinations.

## 49.44 Search Matching

Admin Search does not require AI semantic search.

Version 1 should support practical matching such as:

```text
case-insensitive text search
Thai text support
partial Title / Name matching
```

Implementation details may vary by database/search technology.

## 49.45 Permission-Aware Results

Search and list results must always respect the user's permissions.

A user must not discover Draft, Internal, Hidden, or restricted records they are not authorized to access.

Detailed permission rules belong in `06-roles-permissions.md`.

## 49.46 Historical Records Remain Discoverable

Admin must retain access to historical lifecycle states where appropriate.

Examples:

```text
Archived
Expired
Inactive
Superseded
```

These records may be excluded from normal Public presentation while remaining available to authorized staff.

## 49.47 Default Current-Work Focus

Default lists may focus on current working states rather than mixing large historical archives into every first view.

Example News default may emphasize:

```text
Draft
Scheduled
Published
```

while `Archived` remains accessible through Status filtering.

Exact default status sets may vary by module.

## 49.48 Superseded Documents

Document list must clearly communicate:

```text
มีเอกสารใหม่แทน
```

when a document is Superseded.

Successor detail can be shown in the record rather than requiring a default list column.

## 49.49 Expired / Closed Announcements

Expired or Closed Announcements remain searchable in Admin.

Their absence from the Homepage does not remove them from administrative history.

## 49.50 Inactive Health Services

Inactive Health Services remain discoverable in Admin.

Do not hard-delete a Health Service merely because it is no longer active.

Default list presentation may emphasize Active services.

## 49.51 Preserve List Context

Important productivity behavior:

```text
Filter: Fiscal Year 2569
→ Edit Document
→ Save
→ Back
```

should return the user to the previous filtered list/page state where practical.

Do not unnecessarily reset the user to page 1 with cleared filters.

## 49.52 Action Result Feedback

After a list action, users should immediately understand what happened.

Example:

```text
Archive
→ success feedback
→ row/list reflects the new state
```

Exact frontend update method is deferred to implementation.

## 49.53 Success Feedback

Use concise feedback such as:

```text
เก็บข่าวไว้ในคลังแล้ว
บันทึกการเปลี่ยนแปลงแล้ว
```

Do not require modal dialogs for routine success messages.

Exact toast/inline presentation belongs to the Design System.

## 49.54 Common List Model

```text
Module List
│
├── Page Title
├── Primary Create Action
│
├── Search
├── Domain Filters
├── Active Filter Summary / Clear
│
├── Result List
│   ├── Human-readable primary identity
│   ├── Important domain metadata
│   ├── Status
│   └── Row Actions
│
├── Optional Bulk Selection
└── Pagination
```

## 49.55 Module Behavior Matrix

| Module | Primary Sort Intent | Core Filters |
|---|---|---|
| News | Published / Updated Date | Status, Category/Topic, Date |
| Activity | Activity Date | Status, Area, Date |
| Announcement | Current / Published Context | Status, Type, Deadline |
| Health Content | Updated / Review Context | Status, Topic, Review State |
| Service | Name / Updated | Status, Ownership, Channel |
| Health Service | Name | Status, Type, Area |
| Document | Document Date | Status, Type, Fiscal Year |
| Personnel | Organization / Name | Status, Organization |

This table defines intended staff behavior, not SQL query details.

## 49.56 Excluded from Version 1

Do not add without a real requirement:

- infinite scroll
- AI / semantic Admin Search
- advanced query builder
- saved views
- personalized columns
- drag-and-drop columns
- custom list layouts
- complex cross-module search as a blocker
- bulk publish by default
- destructive bulk actions
- automatic cross-module search fallback
- configurable page-size preference system without use case
- per-user filter presets

## 49.57 Accepted Principles

> **Admin lists are work surfaces, not database-table views.**

> **All modules share a consistent list/search/filter interaction pattern while exposing only domain-relevant fields.**

> **Default lists show a small set of high-value columns rather than every available field.**

> **Module-level search is mandatory and focuses on identifiers staff realistically remembers, especially Title/Name.**

> **Filters are domain-specific and limited to a small useful set.**

> **Filter state is visible, clearable, and should survive refresh/navigation through URL state where practical.**

> **Sorting follows the natural meaning of each domain rather than applying Created Date everywhere.**

> **Lists use predictable pagination rather than infinite scroll.**

> **Status and warnings remain separate concepts—for example Published + Review Overdue.**

> **Archived, Expired, Superseded, and Inactive records remain discoverable in Admin even when excluded from normal Public presentation.**

> **Bulk actions are deliberately limited; Bulk Publish and destructive Bulk Delete are not default Version 1 capabilities.**

> **Search and list results always respect permissions.**

> **No saved views, column customization, advanced query language, AI search, or other enterprise list-management complexity is required in Version 1.**



# 50. Content Editor / Form Interaction Rules

## 50.1 Core Principles

> **The editor should reveal complexity only when the content actually needs it.**

> **Common tasks stay obvious; uncommon fields stay secondary.**

> **The user experience should remain as simple as possible while the system preserves structured, reliable data underneath.**

This section prioritizes ease of use for staff. Complexity belongs in system structure and automation where appropriate, not in the normal data-entry path.

## 50.2 Purpose-Built Forms

Each Content Type uses a form appropriate to its actual data.

```text
News Editor ≠ Activity Editor
Activity Editor ≠ Announcement Editor
Service Editor ≠ Health Service Editor
```

However, all editors share the same interaction pattern so staff can transfer learning between modules.

## 50.3 Default Editor Pattern

```text
Page Header
↓
Main Information
↓
Type-Specific Information
↓
Content Body
↓
Media / Documents
↓
Classification / Relationships
↓
Publishing
```

The structure is consistent; the fields are domain-specific.

## 50.4 Single-Page Form Default

Version 1 uses:

```text
Single Page Form
+
Clearly Separated Sections
```

as the default.

Do not introduce multi-step wizards unless the actual workflow clearly benefits from them.

## 50.5 Section Order

Preferred conceptual order:

```text
1. ข้อมูลหลัก
2. รายละเอียด
3. ข้อมูลเฉพาะประเภท
4. สื่อและเอกสาร
5. การจัดหมวดหมู่ / ความสัมพันธ์
6. การเผยแพร่
```

Staff should begin with information they naturally know rather than technical metadata.

## 50.6 Primary Fields First

Examples:

News:

```text
ชื่อเรื่อง
สรุป
เนื้อหา
```

Activity:

```text
ชื่อกิจกรรม
วันที่
เวลา
สถานที่
รายละเอียด
```

Document:

```text
ชื่อเอกสาร
ไฟล์
วันที่เอกสาร
```

Primary identity/content fields appear before secondary classification and technical fields.

## 50.7 Technical Fields Stay Out of the Editing Path

Normal editors do not manually enter:

```text
Database ID
Public ID
Slug
Created At
Updated At
Canonical URL
Internal Key
```

These are system-managed.

Where useful, system metadata may be shown read-only in a secondary metadata area.

## 50.8 Automatic Slug

Staff does not manually enter a Slug in the default Version 1 workflow.

```text
Title
→ system-generated slug
```

Advanced slug override is not part of the baseline.

## 50.9 Required Field Communication

Required fields must be understandable without cluttering the form.

Do not turn the interface into a wall of mandatory markers.

Use clear labels and validation at the appropriate stage.

> **Draft can be incomplete; Publish cannot.**

## 50.10 Draft vs Publish Requirements

Save Draft may succeed even when publication-required fields are incomplete.

Example:

```text
Title = present
Activity Date = missing
→ Save Draft allowed
```

At Publish:

```text
Activity Date required
→ publication blocked until corrected
```

## 50.11 Inline Help

Use inline help only where it materially improves understanding.

Examples:

```text
สรุป
ข้อความสั้นสำหรับหน้าแรก รายการค้นหา และหน้ารวม
```

```text
วันที่เอกสาร
วันที่ที่ระบุบนเอกสาร ไม่ใช่วันที่อัปโหลดเว็บไซต์
```

Do not add explanatory text beneath every obvious field.

## 50.12 Tooltips

Tooltips are secondary assistance only.

Do not hide required field meaning or important instructions behind a `?` icon.

## 50.13 Labels

Every form control has a real visible/semantic label.

Placeholder text may give an example but never replaces the field label.

## 50.14 Appropriate Input Controls

Use controls that match the data:

```text
Date → Date control
Time → Time control
Status → Select / Radio where appropriate
Topic → Searchable selector
Boolean → Checkbox / Switch when appropriate
URL → URL input
```

Do not use generic text inputs for everything.

## 50.15 Radio vs Select

Use Radio when:

- options are few
- all options benefit from being visible
- the choice is important

Use Select/Searchable Selector when:

- options are numerous
- scanning every option would create clutter

## 50.16 Toggle Boundary

Toggle/Switch is appropriate only for a clear two-state condition.

Do not use toggle controls to represent multi-state lifecycle models.

## 50.17 Desktop Editor Layout

Conceptual Desktop layout:

```text
┌───────────────────────────────┬─────────────────┐
│ Main Form                     │ Publishing      │
│                               │ Status          │
│ Title                         │ Preview         │
│ Content                       │ Publish         │
│ Type-specific fields          │ Schedule        │
│ Media/Documents               │                 │
│ Relationships                 │                 │
└───────────────────────────────┴─────────────────┘
```

Exact dimensions and visual layout belong to the later Design System.

## 50.18 Publishing Controls

Publishing controls remain easy to find on long forms.

Typical controls:

```text
สถานะ
ดูตัวอย่าง
บันทึกร่าง
เผยแพร่
ตั้งเวลาเผยแพร่
```

Do not require users to search the bottom of a long form for the main publishing action.

## 50.19 Sticky Publishing UI

The behavioral requirement is:

> **Publishing actions should remain easy to reach on long forms.**

Whether implementation uses a sticky sidebar or sticky action bar is deferred to UI implementation.

## 50.20 Primary Action Hierarchy

The interface should present one clearly dominant primary action at a time based on record state and permission.

Do not present many equally weighted actions.

## 50.21 Save Does Not Implicitly Change Lifecycle

Saving a Draft must not silently Publish it.

Saving changes to Published content must clearly communicate that the record is currently public.

No hidden lifecycle transitions.

## 50.22 Editing Published Content

When editing a Published record, staff must be able to understand that:

```text
This content is currently public.
```

Saving changes may affect the live page according to the user's permission/workflow.

## 50.23 No Revision Branching Baseline

Version 1 does not require:

```text
Published Version
+
Separate Pending Revision Draft
```

as a full revision-branch workflow.

Baseline:

```text
Published content
→ authorized edit
→ Preview
→ Save changes
```

Audit Log records the change.

Add revision branching only if a later operational requirement justifies it.

## 50.24 Long-Form Editing

Rich text/content editing should provide enough working space for realistic office content.

Do not constrain long-form content to a small fixed-height text box.

## 50.25 Rich Text Toolbar

Allowed baseline:

```text
Paragraph
Heading
Bold
Italic
List
Link
Quote
Table when appropriate
Media / Document insertion
```

Excluded for normal editors:

```text
Arbitrary Font Family
Arbitrary Font Size
Arbitrary Text Color
Background Color
Inline CSS
Custom HTML Mode
```

The Design System controls presentation.

## 50.26 Heading Levels in Body Content

Normal content editors should not insert page-level H1 headings inside body content.

Offer only body-appropriate heading levels.

Exact HTML mapping is an implementation decision.

## 50.27 Paste Sanitization

When pasting from Word / Google Docs, preserve useful semantic structure such as:

- Paragraph
- Bold / Italic
- Lists
- Links
- basic tables when appropriate

Remove problematic formatting such as:

- arbitrary fonts
- font sizes
- inline colors
- Word-specific markup
- unnecessary inline styles

This sanitization should be automatic.

## 50.28 Summary

Summary remains a real authored field.

Do not automatically generate Summary from the Body and treat it as final content by default.

The system may provide guidance but the editor owns the final Summary.

## 50.29 Length Guidance

Use guidance rather than hard limits unless a real technical/business constraint exists.

Hard maximum lengths should not be invented merely for visual design convenience.

## 50.30 Character Counters

Character counters are optional and should appear only where they genuinely help staff.

Do not add counters to every text field.

## 50.31 Date and Time Inputs

Activity should represent the way staff thinks about the event:

```text
วันที่กิจกรรม
เวลาเริ่ม
เวลาสิ้นสุด (optional)
```

Do not force a single complex datetime input when separate Date/Time controls are clearer.

## 50.32 Domain-Specific Date Labels

Use meaningful labels:

```text
News → วันที่เผยแพร่
Activity → วันที่กิจกรรม
Document → วันที่เอกสาร
Health Content → ตรวจสอบล่าสุด / กำหนดตรวจสอบครั้งถัดไป
```

Avoid a generic `Date` label when the meaning differs by domain.

## 50.33 Area Selection

Area uses shared structured data while minimizing unnecessary user steps.

For the local office context, the editor may focus directly on:

```text
ตำบล
หมู่บ้าน (เมื่อจำเป็น)
```

without asking staff to repeatedly select fixed higher levels such as Province/District.

The system still preserves the full structured Area hierarchy underneath.

## 50.34 Taxonomy Guardrail

Topic, Audience, Area, and other taxonomies should be present only where they support a real use case such as:

- Search
- Filtering
- Related Content
- Homepage
- Navigation
- reporting/context

Do not require metadata merely because more metadata is possible.

## 50.35 Single vs Multi Select

A taxonomy supports multiple values only when the semantics genuinely allow multiple values.

Do not make every taxonomy multi-select by default.

## 50.36 Relationship Placement

Relationships appear after the primary content fields.

Examples:

```text
เอกสารที่เกี่ยวข้อง
หน่วยบริการที่เกี่ยวข้อง
บุคลากรที่เกี่ยวข้อง
```

Relationships should not obstruct the core editing flow.

## 50.37 Relationship Selector Pattern

Preferred behavior:

```text
ค้นหา Record
→ เลือก
→ แสดง Selected Items
```

Avoid giant static dropdowns containing hundreds of records.

Detailed interaction behavior is refined in the later Relationship / Shared Data section.

## 50.38 Inline Related-Record Creation

Inline creation is allowed only where the workflow is common, safe, and clearly beneficial.

Do not add inline create for every relationship because nested forms quickly become confusing.

## 50.39 Media Separation

Content forms distinguish:

```text
ภาพปก
Gallery
Documents
```

Do not combine images and PDFs into one generic Attachments area.

## 50.40 Featured Image

Preferred interaction:

```text
เลือกจากคลังสื่อ
หรือ
อัปโหลดภาพ
```

Staff sees a preview.

Staff does not manage Thumbnail/Card/Hero variants manually.

## 50.41 Gallery

Activity Gallery should support:

- selecting multiple images
- simple reordering
- removing an image relationship without deleting the shared Media asset

It is not a professional gallery editor.

## 50.42 Document Relationships

News, Service, ITA, and other modules link to Document Resources.

Do not upload hidden duplicate PDFs directly inside individual content records.

## 50.43 Conditional Fields

Conditional fields may simplify forms when based on obvious dependencies.

Examples:

```text
Channel = External Online
→ show External URL
```

```text
Ownership = Related Health Service
→ show Health Service selector
```

## 50.44 Conditional Logic Guardrail

Conditional logic should remain simple.

Preferred:

```text
one clear choice
→ show relevant field(s)
```

Avoid a general form-rule engine with complex combinations of state, role, date, and other conditions.

## 50.45 Hidden vs Read-Only

If a field is irrelevant to the current workflow, hide it.

If a field is relevant but cannot be edited because of state or permission, display it read-only with clear context.

Do not fill the page with disabled controls that have no value.

## 50.46 System Metadata

System metadata may be available in a secondary/collapsible area:

```text
สร้างเมื่อ
แก้ไขล่าสุด
ผู้สร้าง
ผู้แก้ไขล่าสุด
Public ID
```

It does not occupy the primary editing flow.

## 50.47 Audit History

Do not embed the full Audit Log inside every record editor.

Provide a contextual:

```text
ดูประวัติการเปลี่ยนแปลง
```

entry where useful.

## 50.48 Unsaved Changes

Warn users when they attempt to leave a form with unsaved meaningful changes.

Do not repeatedly warn when autosave has safely captured the latest state.

Exact autosave/dirty-state logic is deferred to implementation.

## 50.49 Validation Timing

Use three validation stages.

### During Editing

Only obvious/low-noise validation, such as:

- invalid URL format
- invalid date range

### Save Draft

Validate only what is necessary to preserve a usable Draft record.

### Publish

Validate all publication requirements.

Do not show many red errors merely because a new empty form has not yet been completed.

## 50.50 Inline Errors

Errors appear next to the relevant field.

Example:

```text
วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น
```

A page-level summary may complement field errors but does not replace them.

## 50.51 Publish Validation Summary

If Publish fails validation, show a concise summary such as:

```text
ยังเผยแพร่ไม่ได้

- กรุณาระบุวันที่กิจกรรม
- กรุณาเลือกสถานะหน่วยบริการ
```

Where practical, the user can jump/focus directly to the problematic field.

## 50.52 Warning vs Error

The system distinguishes:

```text
Error
→ must be corrected before publication

Warning
→ staff should review but publication is not automatically blocked
```

Warnings should not be upgraded into Errors without an actual business rule.

## 50.53 Destructive Action Placement

Delete, destructive lifecycle changes, and similar actions are visually separated from Publish/Save.

Avoid adjacent high-risk action placement.

## 50.54 Domain-Specific Lifecycle Language

Use lifecycle terminology that matches each domain.

Examples:

```text
News → Archive
Document → Archive / Supersede / Expire
Health Service → Inactive
Announcement → Closed / Expired / Archive
```

Do not use one generic `Deactivate` action for all record types.

## 50.55 After Save Draft

After Save Draft:

- remain in the editor
- preserve current form context
- do not reset fields
- show concise success feedback

Example:

```text
บันทึกร่างแล้ว
```

## 50.56 After Publish

After successful publication:

```text
เผยแพร่แล้ว
[ดูหน้าจริง]
```

> **Remain in the record context after Publish.**

Do not automatically return to the list unless future usability evidence favors that behavior.

## 50.57 Cancel / Exit

Do not expose several overlapping exit controls such as:

```text
Cancel
Back
Close
Exit
```

Use a clear navigation model.

If a Cancel action discards unsaved changes, that consequence must be clear.

## 50.58 No Duplicate / Clone Baseline

Version 1 does not provide generic Duplicate/Clone Content as a default capability.

This reduces accidental duplicate records and supports the project's reuse-before-duplication principle.

A future scoped `Create from...` workflow may be introduced only if a real repetitive use case emerges.

## 50.59 No Template Builder Baseline

Do not build a Content Template Builder for routine News/Activity content in Version 1.

Structured fields plus simple editor guidance are sufficient.

## 50.60 Helpful Defaults Must Be Visible

Defaults such as:

```text
Source = สสอ.สอง
Audience = ประชาชนทั่วไป
```

should be visible and changeable where appropriate.

> **Helpful defaults, not invisible assumptions.**

## 50.61 Keyboard Usability

Desktop forms should support normal keyboard interaction:

- logical Tab order
- Enter/Space activation
- keyboard-usable searchable selectors
- visible focus

A dedicated application keyboard-shortcut framework is not required in Version 1.

## 50.62 Responsive Form Behavior

On smaller screens:

- form becomes one column
- actions remain reachable
- no horizontal scrolling
- avoid dense side-by-side controls

Full complex editorial workflows remain Desktop-first.

## 50.63 Accessibility Baseline

Forms require:

- real labels
- logical grouping/headings
- associated error messages
- visible focus
- keyboard operability
- text-based status/validation
- no color-only meaning

No accessibility plugin is required.

## 50.64 Structured Guardrails

The editor should prevent obviously invalid structural choices.

Examples:

```text
PDF
→ handled through Document Resource
```

```text
Featured Image
→ accepts appropriate Media image asset
```

```text
External URL
→ appears only in workflows that support it
```

## 50.65 Do Not Over-Protect

Structured design must not force unnecessary master-data creation.

Example:

External Activity participants may remain free text when they are not reusable structured entities.

> **Structure where reuse matters; flexible text where reuse does not.**

## 50.66 Common Editor Model

```text
Content Editor

├── Page Header
│   ├── Content Type
│   ├── Record Title / New Record
│   └── Status
│
├── Main Information
├── Type-Specific Information
├── Content Body
├── Media / Documents
├── Classification / Relationships
├── Secondary Metadata
└── Publishing Controls
    ├── Save Draft
    ├── Preview
    ├── Publish / Save Changes
    └── Schedule when appropriate
```

## 50.67 News Editor Example

```text
ข่าวประชาสัมพันธ์ใหม่

ข้อมูลหลัก
- ชื่อเรื่อง
- สรุป
- เนื้อหา

สื่อ
- ภาพปก

การจัดหมวดหมู่
- Category
- Topic
- Area
- Audience

ข้อมูลที่เกี่ยวข้อง
- เอกสาร
- หน่วยบริการ
- บุคลากร

การเผยแพร่
- Draft
- Preview
- Publish / Schedule
```

## 50.68 Activity Editor Example

```text
กิจกรรมใหม่

ข้อมูลหลัก
- ชื่อกิจกรรม
- สรุป / รายละเอียด

ข้อมูลกิจกรรม
- วันที่
- เวลา
- สถานที่
- พื้นที่

ผู้เกี่ยวข้อง
- บุคลากรภายใน
- ผู้เข้าร่วมภายนอก
- หน่วยงานที่เกี่ยวข้อง

สื่อ
- ภาพปก
- Gallery

เอกสารที่เกี่ยวข้อง

การเผยแพร่
```

## 50.69 Document Editor Example

```text
เอกสารใหม่

ข้อมูลหลัก
- ชื่อเอกสาร
- ไฟล์

ข้อมูลเอกสาร
- ประเภท
- วันที่เอกสาร
- เลขที่เอกสาร
- ปีงบประมาณ

การจัดหมวดหมู่
- Topic
- Audience
- Area
- Owner / Source

Lifecycle
- Published
- Expiry
- Superseded By

การเผยแพร่
```

## 50.70 Health Content Editor Example

```text
ความรู้สุขภาพใหม่

ข้อมูลหลัก
- ชื่อเรื่อง
- สรุป
- เนื้อหา

Topic / Audience

สื่อ

Review
- ตรวจสอบล่าสุด
- กำหนดตรวจสอบครั้งถัดไป

ข้อมูลที่เกี่ยวข้อง

การเผยแพร่
```

Review workflow remains separate from public lifecycle.

## 50.70A Health Report Editor

```text
รายงานสุขภาพใหม่

ข้อมูลหลัก
- ชื่อรายงาน
- สรุป
- ประเภทรายงาน / Topic
- พื้นที่ (ถ้ามี)
- ปีงบประมาณ / ช่วงรายงาน
- วันที่เผยแพร่
- หน่วยงานเจ้าของ / แหล่งข้อมูล

ไฟล์รายงาน
- เลือก/อัปโหลด Document

การเผยแพร่
```

Health Report does not extract analytical datasets or related metrics in Version 1. Dashboard data remains a separate Data Platform/API concern.

## 50.71 Excluded from Version 1

Do not add without a real requirement:

- universal mega-form
- required taxonomy for every field
- generic workflow wizard
- custom HTML editor for normal users
- custom CSS controls
- per-record design controls
- AI autosuggest as baseline
- AI rewrite/generate as core workflow
- content-template builder
- clone/duplicate content by default
- nested inline creation for every relationship
- complex conditional form-rule engine
- published revision branching system
- real-time collaborative editing
- keyboard shortcut framework
- invisible auto-filled assumptions that staff cannot inspect

## 50.72 Accepted Principles

> **Each Content Type uses a purpose-built form built on a consistent Admin interaction pattern.**

> **Single-page forms with clear sections are the default; multi-step wizards require a real workflow reason.**

> **Primary content fields appear first; technical/system metadata stays out of the normal editing path.**

> **Draft may be incomplete; Publish enforces publication validity.**

> **Labels remain visible; placeholders and tooltips do not replace clear field descriptions.**

> **Input controls reflect the meaning of the data rather than using generic text boxes everywhere.**

> **Publishing actions are always easy to reach and clearly separated from destructive actions.**

> **Published-content editing remains simple in Version 1; a separate revision-branch workflow is not required.**

> **Rich Text formatting is intentionally constrained so the Design System, not individual editors, controls presentation.**

> **Relationships reuse shared records where reuse matters; free text remains acceptable where creating master data would add unnecessary complexity.**

> **Conditional fields are allowed only for simple, obvious dependencies—not as a general form-rule engine.**

> **Errors block invalid publication; warnings inform staff without unnecessarily blocking work.**

> **The editor should make invalid structured content difficult to create without making legitimate work unnecessarily rigid.**

> **No template builder, duplicate/clone workflow, AI editor, custom-code controls, revision branching, or other enterprise editing complexity is needed in Version 1.**

> **The overall priority is maximum practical ease of use for staff while the system keeps structure and consistency behind the scenes.**



# 51. Media & Document Management UX

## 51.1 Core Principle

> **Separate resources by their meaning and lifecycle, not by where they are allowed to appear.**

In staff-facing language:

> **แยกคลัง แต่ไม่กั้นการใช้งาน**

Media and Document remain separate shared resources because their metadata, lifecycle, and editing behavior are genuinely different. However, any module may reference the resource types it legitimately needs.

## 51.2 Shared Resource Model

```text
Shared Resources

Media
├── Image
├── Logo
└── Visual Asset

Document
├── PDF
├── Form
├── Report
└── Other Published Document
```

Modules may reuse these resources according to real content meaning.

Example:

```text
News
├── Media
└── Document

Activity
├── Media
└── Document

Service
├── Media when useful
└── Document

Health Service
└── Media

ITA
├── Document Evidence
├── Media Evidence
└── External URL Evidence
```

## 51.3 Resource Type ≠ Module Permission

Do not encode rules such as:

```text
ITA may use Documents only
Service may never use Media
```

unless a real domain requirement requires such a restriction.

The content model defines what the resource is; relationships define where it is used.

## 51.4 Media vs Document Responsibility

Media is optimized for visual assets and accessibility metadata.

Typical Media concerns:

```text
Preview
Alt Text
Decorative
Caption
Gallery
Image Variants
```

Document is a published informational resource with its own metadata and lifecycle.

Typical Document concerns:

```text
Document Date
Document Number
Fiscal Year
Document Type
Expiry
Superseded By
```

Do not merge these into one generic File model merely to make the architecture look simpler.

## 51.5 Staff Mental Model

The staff-facing distinction remains simple:

```text
รูปภาพ / โลโก้ / ภาพประกอบ
→ สื่อ

PDF / แบบฟอร์ม / รายงาน / เอกสารเผยแพร่
→ เอกสารเผยแพร่
```

The user does not need to understand internal resource relationships.

## 51.6 Upload Once, Reuse Where Appropriate

> **Upload once, reuse where appropriate.**

A shared resource can appear in multiple contexts without duplicate uploads.

Example Document:

```text
เอกสารเดียว
├── เอกสารเผยแพร่
├── ข่าวประชาสัมพันธ์
├── บริการประชาชน
├── Health Report
├── ITA Evidence
└── แผนงาน
```

Example Media:

```text
ภาพเดียว
├── ข่าว
├── กิจกรรม
├── Featured
├── หน่วยบริการ
└── ITA when used as evidence/presentation
```

## 51.7 Resource Access from the Current Workflow

Staff should not be forced to leave their current task and open a library first.

News image workflow:

```text
[เลือกจากคลังสื่อ]
[อัปโหลดภาพใหม่]
```

ITA evidence workflow:

```text
[เลือกเอกสาร/รูปภาพที่มีอยู่]
[อัปโหลดใหม่]
```

Newly uploaded resources still become central shared resources.

## 51.8 Media Upload Flow

Preferred basic flow:

```text
เลือกไฟล์ภาพ
↓
Preview
↓
Alt Text / Decorative
↓
บันทึก
```

Additional metadata such as Caption, Credit, Source, or Usage Note should remain secondary unless required.

## 51.9 Document Upload Flow

Preferred basic flow:

```text
เลือกไฟล์
↓
ชื่อเอกสาร
↓
ประเภทเอกสาร
↓
วันที่เอกสาร
↓
ปีงบประมาณ (เมื่อเกี่ยวข้อง)
↓
บันทึก / เผยแพร่
```

Optional structured fields may include:

- Document Number
- Topic
- Audience
- Area
- Owner / Source

## 51.10 Public Title ≠ Filename

The system may suggest a title from the uploaded filename, but staff owns the public-facing Document Title.

Example:

```text
final_report_2569_v2.pdf
```

is not a suitable public title by itself.

Use a meaningful title such as:

```text
รายงานผลการดำเนินงาน ประจำปีงบประมาณ พ.ศ. 2569
```

## 51.11 File Validation

Server-side validation must verify allowed file types rather than trusting the browser extension alone.

Exact allowed MIME types, size limits, and security implementation belong to `10-system-blueprint.md`.

The staff-facing behavior is:

- invalid file types are rejected clearly
- technical server errors are not exposed as the primary message
- file rules are communicated before or during upload when practical

## 51.12 File Size Feedback

If upload size limits exist, communicate them clearly.

Do not make staff discover limits only through messages such as:

```text
413 Request Entity Too Large
```

Use a human-readable message instead.

## 51.13 Upload Progress

For uploads that take noticeable time, show that the upload is in progress.

This prevents accidental repeated submissions.

Exact progress UI is an implementation detail.

## 51.14 Upload Failure

If an upload fails:

```text
อัปโหลดไม่สำเร็จ
[ลองอีกครั้ง]
```

The system should preserve already-entered metadata where practical.

## 51.15 Drag and Drop

Drag-and-drop may be supported as an enhancement.

A normal file picker remains the baseline and must work without drag-and-drop.

## 51.16 No Media Folder Tree

Do not require staff to classify Media through manual folder hierarchy such as:

```text
2026
└── August
    └── News
        └── Dengue
```

Use Search and structured metadata instead.

## 51.17 No Document Folder Tree

Document Center already has structured metadata such as:

- Document Type
- Topic
- Fiscal Year
- Owner
- Status

Do not create a second organizational hierarchy through folders.

## 51.18 Media Search

Media Library should support practical Search by Label/Name.

Useful lightweight filters may include:

```text
Image
Logo
Visual Asset
```

AI image search is not required in Version 1.

## 51.19 Document Search

Document Search should support:

```text
ชื่อเอกสาร
เลขที่เอกสาร
```

and structured filters such as:

```text
ประเภท
ปีงบประมาณ
Topic
สถานะ
```

## 51.20 Media Presentation

Media Library is naturally visual and may use a Thumbnail Grid.

Document Center is naturally metadata-driven and should primarily use List View.

> **Consistent interaction does not mean identical presentation.**

## 51.21 Media Item Preview

Media detail/selection should expose the information staff actually needs, such as:

- Preview
- Label
- Default Alt Text
- Decorative state
- optional Caption/Credit
- Used In

Technical metadata remains secondary.

## 51.22 Document Preview

PDF preview may be provided when the browser/platform supports it.

Preview is an enhancement, not a dependency.

Staff must still be able to open/download and inspect document metadata without a custom PDF viewer.

## 51.23 Default Alt Text

Media stores a reusable default Alt Text where appropriate.

Do not use the filename as Alt Text.

## 51.24 Decorative Media

Media may be explicitly marked Decorative when it truly conveys no information.

Decorative status should not be used merely to avoid writing appropriate Alt Text.

## 51.25 Context-Specific Alt Override

Version 1 uses the Media Default Alt Text as the normal reusable value.

A usage-specific Alt Text override may be allowed only when the same image has a meaningfully different purpose in a particular context.

Do not require staff to rewrite Alt Text every time an image is reused.

## 51.26 Caption ≠ Alt Text

UI must clearly distinguish:

```text
Alt Text
→ accessibility / image meaning

Caption
→ visible supporting text when appropriate
```

These are separate concepts.

## 51.27 Gallery Workflow

Activity and other gallery-capable content may:

```text
[เพิ่มภาพ]
```

then:

```text
เลือกหลายภาพจากคลัง
หรือ
อัปโหลดหลายภาพ
```

New uploads become central Media resources automatically.

## 51.28 Gallery Ordering

Gallery is an ordered relationship.

Support simple reordering.

Do not add collage builders, slideshow transitions, masonry editors, or other presentation authoring controls.

## 51.29 Remove from Gallery ≠ Delete Media

Removing an image from a Gallery removes the relationship only.

It does not delete the Media resource.

The UI must use language that makes this distinction clear.

## 51.30 Media Usage Tracking

Before a destructive Media action, the system should know where the resource is referenced.

Example:

```text
กำลังใช้งานใน:
- ข่าว A
- กิจกรรม B
- Featured
- ITA Evidence
```

A simple usage list is sufficient.

## 51.31 Media Delete Safety

> **Do not hard-delete a Media asset that is still referenced by default.**

Staff should first remove or replace active relationships.

Unused Media may be deleted according to permission.

## 51.32 No Silent Media Binary Replacement

Because one Media resource may be reused in many contexts, replacing the underlying image could unexpectedly change all of them.

Version 1 therefore prefers:

```text
Upload new Media
→ replace the relationship only where needed
```

rather than silent in-place binary replacement.

## 51.33 Advanced Media Replacement

A controlled underlying-file replacement may be considered later if a real workflow requires it.

It is not a Version 1 baseline feature.

## 51.34 Document Is More Than a File

Document identity includes:

```text
Metadata
+
Document File
+
Lifecycle
```

A new file does not automatically mean the old Document should be overwritten.

## 51.35 Draft Document File Replacement

Before publication:

```text
Draft Document
→ uploaded file may be replaced
```

without creating an unnecessary new public-history record.

## 51.36 Genuine Published Document Revision

When a genuinely new official document replaces a published document:

```text
Document A
→ Superseded

Document B
→ Published
```

and:

```text
A → Superseded By → B
```

This preserves public and administrative history.

## 51.37 Published Document Upload Correction

A separate practical case exists when staff uploaded the wrong binary file but the official document itself did not change.

Version 1 may provide a controlled action such as:

```text
แก้ไขไฟล์ที่อัปโหลดผิด
```

subject to appropriate permission, warning, and Audit Log.

This is an operational correction, not a new official revision.

## 51.38 Revision vs Correction UX

Staff should not need to understand technical version-control terminology.

A simple choice may be:

```text
คุณกำลังทำอะไร?

○ แก้ไฟล์ที่อัปโหลดผิด
○ มีเอกสารฉบับใหม่มาแทน
```

The system applies the correct lifecycle behavior underneath.

> **Simple for Staff, Structured for the System.**

## 51.39 Document Delete Safety

Unused Draft Documents may be deleted according to permission.

Published Documents normally use lifecycle actions such as:

```text
Archive
Expire
Supersede
Hide
```

rather than Hard Delete.

## 51.40 Document Usage Tracking

Before destructive or replacement actions, show where the Document is used.

Example:

```text
ใช้งานใน:
- บริการประชาชน A
- ข่าว B
- ITA 2569 / MOIT 4
```

## 51.41 ITA Evidence Types

ITA Evidence in Version 1 may use:

```text
Evidence
├── Document
├── Media
└── External URL
```

The UI should use human-readable labels such as:

```text
เอกสาร
รูปภาพ
ลิงก์ภายนอก
```

The Evidence relationship remains structured underneath.

## 51.42 ITA Media Evidence

A Media resource may represent actual ITA evidence, for example:

- activity photograph
- notice/poster image
- screenshot
- other visual proof

In this case:

```text
ITA Requirement
└── Evidence
    └── Media
```

The Media is evidence, not merely decoration.

## 51.43 ITA Presentation Media

ITA may also use Media for presentation, for example a banner/illustration.

That usage is distinct from Evidence:

```text
ITA Page / View
└── Presentation
    └── Media
```

Do not confuse presentation imagery with compliance evidence.

## 51.44 ITA Add Evidence UX

Preferred workflow:

```text
เพิ่มหลักฐาน

○ เอกสาร
○ รูปภาพ
○ ลิงก์ภายนอก
```

If `เอกสาร`:

```text
[เลือกเอกสารที่มีอยู่]
[อัปโหลดเอกสารใหม่]
```

If `รูปภาพ`:

```text
[เลือกจากคลังสื่อ]
[อัปโหลดรูปภาพใหม่]
```

If `ลิงก์ภายนอก`:

```text
URL
ชื่อ/คำอธิบายหลักฐาน
```

## 51.45 ITA Historical Integrity

Evidence for an earlier fiscal year must remain historically correct.

If Document A used by ITA 2569 later becomes Superseded by Document B:

```text
ITA 2569
→ remains linked to Document A
```

unless staff intentionally updates the historical evidence for a legitimate reason.

## 51.46 No Automatic Successor Rewrite

> **A successor does not automatically rewrite historical references.**

Current operational content such as a Service may receive a warning that a linked Document has a newer successor.

The system should not automatically rewrite relationships behind staff's back.

## 51.47 Document Picker Status Context

Document selection should expose enough context to avoid selecting the wrong record:

```text
ชื่อเอกสาร
ประเภท
ปีงบประมาณ
สถานะ
```

Superseded/Archived documents should not dominate normal current-work results, while still remaining searchable for historical workflows such as ITA.

## 51.48 Reuse vs Upload

Resource pickers should make both actions obvious:

```text
ค้นหา/เลือก Resource ที่มีอยู่
หรือ
อัปโหลด Resource ใหม่
```

Reuse should be encouraged but not made more difficult than doing the work.

## 51.49 Quick Document Creation

Document is a relationship where simple in-context creation may provide high value.

Example from News:

```text
เอกสารที่เกี่ยวข้อง
[ค้นหาเอกสาร]

ไม่พบ?
[เพิ่มเอกสารใหม่]
```

A simplified Document form may create the central resource and link it back automatically.

## 51.50 ITA In-Context Resource Creation

ITA should support adding evidence without forcing staff to leave the ITA workspace.

New uploads create Media/Document resources centrally and attach them as Evidence automatically.

## 51.51 Service Resources

Service may reference Documents and Media where meaningful.

Examples:

```text
Service
├── Guide / Form → Document
└── explanatory visual → Media when useful
```

Resource type is chosen by meaning, not by a blanket module restriction.

## 51.52 News Resources

News may use both Media and Documents.

PDFs attached to News remain references to Document Resources, not hidden private attachments.

## 51.53 Duplicate File Warning

If the system can reliably identify a likely duplicate, it may warn:

```text
พบไฟล์ที่อาจซ้ำกับ Resource ที่มีอยู่
[ดู Resource เดิม]
[อัปโหลดต่อ]
```

Do not automatically block uploads based solely on filename similarity.

## 51.54 Duplicate Image Detection Boundary

Exact duplicate detection may be useful.

Visual-similarity AI is not required in Version 1.

## 51.55 File Security Boundary

Baseline behavior:

- server-side file validation
- reject disallowed types
- avoid exposing internal server paths
- handle uploaded files through controlled system logic

Specific malware scanning/storage technology is deferred to `10-system-blueprint.md`.

## 51.56 Original Filename

Original filename may be retained as technical metadata.

It is not the Public Title and staff does not manage the storage filename.

## 51.57 Download Filename

Where practical, public Document downloads should use a meaningful filename.

Exact normalization rules are deferred to implementation.

## 51.58 Resource Identity and URL Stability

Document identity is the Document record/Public ID, not its physical filename.

A controlled uploaded-file correction should not require changing the canonical Document URL.

Media delivery paths are likewise technical details rather than content identity.

## 51.59 Storage Architecture Boundary

This document does not decide:

```text
/uploads/...
local disk
S3-compatible storage
object storage
```

Storage architecture belongs in `10-system-blueprint.md`.

## 51.60 Multiple Image Upload

Multiple image upload is supported where it clearly helps real workflows such as Activity Gallery.

Do not turn this into a generalized enterprise asset-ingestion system.

## 51.61 No General Bulk Document Upload Baseline

General bulk Document upload is not a Version 1 requirement because each Document needs useful structured metadata.

Migration/import tooling can be handled separately when required.

## 51.62 Image Optimization

Staff should not need to manually prepare:

```text
Thumbnail
Card size
Hero size
Mobile version
WebP
```

The system handles delivery variants/optimization according to later technical design.

## 51.63 Media Quality Warning

A lightweight warning may be shown when an image is clearly unsuitable for a requested usage, for example extremely low resolution for a Featured placement.

Do not build a generalized quality-scoring system.

## 51.64 Image Editing Boundary

Version 1 does not require a full image editor.

Simple focal point/crop behavior may be added later only if real editorial use demonstrates a need.

## 51.65 Dependency Visibility

Before Archive/Delete/replacement actions on shared resources, staff should be able to see usage impact.

A simple:

```text
กำลังถูกใช้ 3 แห่ง
[ดูรายการ]
```

is sufficient.

No complex dependency graph visualization is required.

## 51.66 Media Lifecycle Boundary

Media does not need the same lifecycle complexity as Document.

Keep Media state as simple as its real operational needs allow.

Do not mirror Document lifecycle merely for consistency.

## 51.67 Document Lifecycle Language

Document lifecycle remains domain-specific:

```text
Draft
Published
Expired
Superseded
Archived
Hidden
```

The Admin UI displays human-readable Thai labels.

## 51.68 Shared Resource Picker

Common resource-selection behavior:

```text
Search
Filters
Results
Preview / Context
Select
```

Picker presentation may use modal, drawer, or dedicated screen depending on UI design.

Avoid nested hierarchy and multi-level modal chains.

## 51.69 Recent Resources

A `ใช้ล่าสุด` convenience section may be added if it proves useful.

It is not required for the baseline; reliable Search matters more.

## 51.70 No Personal File Space

Do not provide:

```text
My Files
Shared Files
Personal Folder
```

The CMS is not personal cloud storage.

Resources belong to the website/content system.

## 51.71 No Check-In / Check-Out

Do not add document check-in/check-out or enterprise document-locking workflow in Version 1.

## 51.72 No Separate File Approval Workflow

Media/Document publishing uses the relevant CMS publishing/permission model.

Do not create an independent approval pipeline merely because a file is involved.

## 51.73 Proposed Media UX

```text
Media Library

Search

[Thumbnail Grid]

Media Item
├── Preview
├── Label
├── Default Alt Text
├── Decorative
├── Caption / Credit (optional)
└── Used In

Actions
├── Select
├── Edit Metadata
└── Delete only when safe
```

## 51.74 Proposed Document UX

```text
Documents

Search
Filters: Type / Fiscal Year / Status

Document
├── Title
├── File
├── Type
├── Document Date
├── Fiscal Year
├── Owner / Source
├── Status
└── Used In

Lifecycle Actions
├── Publish
├── Correct Uploaded File
├── Supersede with New Document
├── Expire
├── Archive
└── Hide when appropriate
```

## 51.75 Excluded from Version 1

Do not add without a real requirement:

- Media folder tree
- Document folder tree
- Full DAM
- Full DMS
- Photoshop-style image editor
- visual-similarity AI
- automatic semantic tagging
- personal file spaces
- check-in/check-out
- separate document approval system
- generalized bulk Document ingestion
- automatic successor rewriting
- silent binary replacement of reused Media
- complex dependency graph visualization
- enterprise file-version branching
- staff-managed storage paths or internal filenames

## 51.76 Accepted Principles

> **Media and Documents are separate shared resources because their meaning, metadata, and lifecycles differ.**

> **Resource separation must not become a restriction on which modules may legitimately use those resources.**

> **Staff can select an existing resource or upload a new one directly from the workflow they are currently performing.**

> **Uploading from News, Service, ITA, or another module creates/reuses the same central resource rather than a hidden duplicate attachment.**

> **Media uses a visual library; Documents use structured list/search/filter behavior.**

> **Media stores default accessibility metadata, while context-specific Alt Text override is permitted only when genuinely necessary.**

> **Removing an image from a Gallery removes the relationship, not the Media asset.**

> **Shared Media that is still in use is not hard-deleted by default.**

> **Reused Media is not silently replaced in-place because the same asset may be used in multiple contexts.**

> **Draft Document files may be replaced freely; Published Documents distinguish an upload correction from a genuine new official revision.**

> **A genuine new Document revision creates a successor and preserves the historical record instead of overwriting it.**

> **ITA Evidence may reference Document, Media, or External URL resources.**

> **ITA presentation Media and ITA Evidence Media are distinct usages even though both use the shared Media resource.**

> **Historical references, particularly ITA Evidence, do not automatically move to a successor Document.**

> **Document and Media usage is visible before destructive actions.**

> **Duplicate detection may warn and encourage reuse but does not become an AI/file-management subsystem.**

> **Image optimization and delivery variants are handled by the system rather than requiring staff to prepare multiple files manually.**

> **No folder hierarchy, DAM, DMS, personal file storage, check-in/out, advanced image editor, or enterprise version-control workflow is needed in Version 1.**

> **The governing usability rule is: separate resources by meaning, but never make correct cross-module reuse unnecessarily difficult.**

# 52. Relationship / Shared Data Selection UX

> **Search first, browse second, create only when necessary.**

> **Shared data should feel easy to reuse, not like database relationships.**

Version 1 uses human-readable searchable selectors for shared data. Removing a relationship never deletes the shared resource. Area selection may simplify the local workflow (for example Subdistrict → Village) while preserving the full shared Area model underneath. Internal participants use Personnel selectors; one-off external participants may remain free text, while reusable External Organization records are created only when repetition justifies it.

Current/active records are emphasized first; historical/inactive/superseded records remain searchable where a historical workflow needs them and carry clear warnings. Inline creation is limited to safe, frequent relationships such as Document and Media. Nested creation of Personnel, Organization, Health Service, or other master data is excluded from routine content editing. Stable identifiers remain system-managed and never appear as staff-facing foreign keys.

---

# 53. ITA Admin Workflow

The primary staff mental model is:

```text
Fiscal Year → MOIT / Section → Requirement → Evidence
```

Current year is the default; historical years remain selectable. Evidence supports Document, Media, and External URL. Staff may select an existing resource or upload/create a new eligible Document/Media from the ITA workflow, while the result remains a shared central resource. Evidence order may be managed; removing evidence removes the relationship, not the underlying resource.

Completion counts may support work management (for example 38/42) but are **operational completeness, not compliance scoring**. Missing evidence is a Warning by default, not an assumed publication blocker. Fiscal Year is the publication unit. Published ITA remains directly editable by authorized staff with Preview + Audit Log under the v1 no-revision-branching baseline. New fiscal years may reuse/copy structure only; Evidence is never copied automatically. Historical Evidence never automatically follows a successor resource.

Structure Management, Evidence Management, and ITA Publish may be permission-separated. Version 1 excludes a compliance engine, workflow/template designer, automatic evidence carry-forward, continuous link-monitoring subsystem, and revision branching.

---

# 54. Publishing / Validation / Scheduling UX

Publishing uses explicit actions: Save Draft, Preview, Publish, Schedule, and Save Changes. Draft tolerates incomplete work; Publish/Schedule enforce publication validity. Validation is domain-specific and distinguishes blocking Errors from non-blocking Warnings. Preview is encouraged but never a mandatory gate.

Scheduling uses a simple Thailand date/time model (`Asia/Bangkok`) with one-time future publishing only. Scheduled failure never masquerades as Published and is surfaced as actionable work; there is no generic Failed lifecycle state. Version 1 has no recurring schedule, cron expression UI, or generic scheduled unpublish.

Published content remains directly editable by authorized Publisher-level users with explicit `Save Changes`; v1 does not create a separate revision branch. Approval remains optional and OFF by default. Permission-aware UI hides irrelevant actions. Health Content review status remains separate from public lifecycle and never auto-unpublishes otherwise valid content.

---

# 55. Draft / Autosave / Preview / Conflict Handling

Manual Save is explicit; Autosave is a recovery safety net. Autosave never publishes, changes lifecycle, or silently overwrites canonical state. Published content keeps live state separate from in-progress recovery until authorized `Save Changes` succeeds.

Recovery is offered with timestamps rather than silently applied. Unsaved-change warnings appear only when meaningful work is actually at risk. Preview may render current working data without requiring a redundant Manual Save first, remains protected/read-only, and is clearly marked non-public.

Optimistic concurrency prevents silent last-writer-wins behavior. A conflict preserves the current user's work and the latest canonical record; v1 does not add record locks, live presence, CRDT/OT, automatic merge, force-overwrite, full diff viewer, or offline-first sync. Autosave/recovery events do not flood the normal Audit Log. Exact autosave intervals/storage/recovery lifetime and conflict implementation belong to `10-system-blueprint.md`.

---

# 56. Admin Responsive / Accessibility Rules

Admin CMS is desktop-first for productivity, not desktop-only. Wide layouts may use sidebar/table patterns; medium layouts may collapse navigation; narrow/mobile layouts use drawer navigation, single-column forms, and compact card/list patterns where dense tables no longer fit. The same Admin app and workflow semantics are preserved across viewports.

Primary Save/Publish actions remain reachable on small screens. No essential workflow depends on hover, drag, swipe, or pointer precision alone; drag interactions require accessible alternatives when used. Forms use semantic/native controls, real labels, clear error text, keyboard focus, sufficient contrast, and status communication that does not rely on color alone. Dialogs, toasts, loading states, and focus movement must remain accessible. Thai long names, Buddhist Era dates, zoom/text enlargement, and practical touch targets are part of QA.

Version 1 excludes an accessibility toolbar, special accessibility mode, mandatory Dark Mode, native mobile app, and offline PWA.

---

# 57. Admin Notifications / Warnings

Notifications exist only when staff can act. Four meanings are used: Error, Warning, Information, Success. Messages are placed at the nearest useful context: Field → Record → Module → Work Dashboard.

The Work Dashboard is an unresolved/actionable work queue, not a notification inbox or social feed. Conditions such as Health Content Review Due/Overdue, Scheduled Publish Failure, or invalid Homepage curation may surface there when action is needed. Duplicate/similar conditions should be aggregated. ITA missing evidence remains primarily in the ITA workspace; local validation/upload/autosave/conflict issues remain local to the editor.

Persistent items disappear when the underlying condition is resolved; there is no read/unread state or `Mark Read` workflow. Successful routine saves/publishes use temporary feedback rather than persistent notifications. Audit Log remains separate. Version 1 excludes a Notification Center/bell, unread counts, preference center, task assignment, email/LINE/SMS/push defaults, and AI prioritization.

---

# 58. Settings & Global Configuration Boundary

> **Settings configure the system; they do not become a second place to edit website content.**

> **If something has its own meaning, lifecycle, reuse, or users, it belongs in its own module rather than Settings.**

Ownership remains explicit: Contact data → Contact Information; Personnel/Leadership → Personnel; Internal Organization → Organization; reusable External Organization → Related Organization; Homepage curation → Homepage; ITA → ITA; images → Media; PDF/forms/reports → Document; Area → Reference Data; Privacy/Cookie/Accessibility pages → Basic Page.

Version 1 Settings remain intentionally small: site identity, a few useful defaults, and read-only system information. Reference Data is separate and receives management UI only where staff genuinely maintain it. Stable lifecycle values, URL/Public-ID rules, security/file rules, new-record Draft behavior, and Audit ON are system invariants rather than arbitrary toggles. Timezone is `Asia/Bangkok` baseline. Public channels remain owned by Contact Information. Secrets and infrastructure configuration stay outside normal CMS UI.

No menu/footer/page builder, feature-flag console, arbitrary status editor, JSON/custom-code editor, search-weight console, MIME/security policy editor, audit toggle, infrastructure-secret UI, or mega-settings page is included in Version 1.

---

# 59. Final Admin CMS Consistency Review

Final review against Frozen `00–04` and Content Model v1.1 identified and corrected five blocking consistency issues before Freeze:

1. Health Report management is present and staff-facing `ความรู้สุขภาพ` is distinct from `รายงานสุขภาพ`.
2. Reusable External Organization management is represented by `หน่วยงานที่เกี่ยวข้อง`.
3. ITA Evidence consistently supports Document / Media / External URL.
4. Official/public channels belong to Contact Information, not Settings.
5. Scheduled Publish Failure is actionable; normal success remains Published state + feedback/Audit rather than a persistent notification.

Cross-document result: Foundation PASS, IA PASS, Content Model v1.1 PASS, Sitemap PASS, Homepage PASS, shared resource/ITA boundaries PASS, responsive/accessibility PASS, permission handoff boundary PASS, and over-engineering review PASS.

Deferred intentionally: detailed Roles/Permissions → `06`; Publishing Workflow → `07`; Public Search → `08`; Migration → `09`; implementation/infra → `10`; exact visual Design System/breakpoints remain later design work.

---

# 60. Freeze — Admin CMS Baseline v1.0

**Sections 1–59 = FROZEN Admin CMS Baseline.**

Status:

```text
FROZEN — Admin CMS Baseline
Version 1.0
```

Future changes require Impact Review and, where appropriate, Controlled Amendment under `PROJECT-INDEX.md` version rules.

---

# Controlled Amendment — 05 Admin CMS v1.1 — Surgical Overlay

> **Status:** REVIEW CANDIDATE — NOT FROZEN  
> **Amends:** Frozen `05-admin-cms.md` v1.0  
> **Mutation model:** APPEND-ONLY CONTROLLED AMENDMENT  
> **Frozen sections retained:** `1–60` IN FULL  
> **Deletion from Frozen v1.0:** NONE  
> **Implementation Authorization:** NONE  
> **T051+:** NOT AUTHORIZED

## A05.1 Lossless Preservation Rule

Frozen sections `1–59` remain normative staff-facing Admin CMS requirements.

Frozen section `60` remains the historical v1.0 Freeze record.

This amendment changes **implementation ownership**, not the accepted admin behavior.

Therefore all detailed Frozen requirements remain in force unless this amendment explicitly translates the mechanism used to satisfy them, including:

- Admin navigation and work dashboard;
- domain-specific forms;
- required fields and validation;
- Draft behavior;
- manual save;
- autosave/recovery;
- Preview;
- publishing/scheduling;
- Published editing;
- lifecycle/delete/archive semantics;
- list/search/filter/bulk behavior;
- relationships/selectors;
- media/image/document workflows;
- ITA administration;
- permission-aware UI;
- audit visibility;
- conflict/concurrency handling;
- responsive/accessibility/Thai-language UX;
- accepted warnings, confirmations and non-goals.

No requirement is removed merely because WordPress Core supplies part of the mechanism.

## A05.2 WordPress Is Infrastructure, Not the Staff Mental Model

Frozen section `2. CMS Is Not a WordPress Clone` is reinterpreted as:

> Do not reproduce the **legacy/generic WordPress mental model** for staff. This is not a prohibition on using a clean WordPress Core runtime.

Staff-facing information structure continues to use Songhealth domain language.

The target is:

```text
wp-admin
+ domain-specific configuration and bounded extensions from songhealth-core
```

not:

```text
generic Posts / Pages / Plugins mental model
```

and not:

```text
a second custom Admin React CMS
```

## A05.3 Admin Runtime Ownership

WordPress Core owns commodity admin infrastructure:

- authenticated admin shell;
- editor primitives;
- media library;
- persistence primitives;
- Draft/Publish/Future primitives;
- revisions/autosave primitives;
- users and capability primitives.

`songhealth-core` owns the Songhealth layer necessary to satisfy Frozen `05`:

- content-type registration and labels;
- structured fields/panels;
- domain validation;
- capability-aware actions;
- lifecycle guards;
- Public ID display/control;
- relationship selectors where Core is insufficient;
- domain-specific warnings/confirmation;
- audit surfaces/records where Frozen requirements exceed Core;
- hiding or constraining irrelevant native surfaces;
- bounded admin enhancements necessary for Frozen UX.

Native capability should be used before custom UI **only when it satisfies the Frozen requirement**.

## A05.4 No Silent Requirement Downgrade

The following rule is mandatory:

```text
WordPress Core lacks an exact Frozen UX/behavior
        ↓
DO NOT silently drop the requirement
        ↓
first use bounded songhealth-core extension
        ↓
if still disproportionate, propose an explicit Product Controlled Amendment
```

Implementation convenience cannot weaken Frozen `05`.

## A05.5 Autosave and Revisions

WordPress native autosave/revisions may satisfy the commodity storage/recovery mechanism.

Frozen semantics still govern:

- manual Save remains meaningful;
- autosave does not masquerade as a successful public-impact action;
- recovery must not silently overwrite confirmed state;
- conflict/concurrency rules remain;
- revisions/autosaves are not a substitute for audit where Frozen audit requires actor/action/public-impact evidence.

No custom generic revision engine is baseline.

## A05.6 Published Editing

Frozen Published-editing behavior remains authoritative:

```text
Published
→ authorized Publisher edits working state
→ Public remains last valid Published state
→ Preview
→ Save Changes / Update
→ new public state
```

WordPress-native behavior may be used only if the implementation proves this semantic is preserved.

If standard WordPress behavior cannot satisfy it without disproportionate custom staging complexity, that is a Product amendment question for Frozen `07`; it must not be changed silently in implementation.

## A05.7 Headless Preview

Because public presentation is React, Frozen Preview must be preserved through an authenticated, bounded bridge:

```text
Authorized wp-admin user
→ Preview action
→ authenticated/authorized preview context
→ React public presentation
→ candidate Draft / working state
```

Required invariants:

- no anonymous Draft preview bypass;
- server-side authorization;
- Draft preview data excluded from normal public/search/cache output;
- React receives no WordPress administrator credentials;
- exact nonce/token/session mechanics are a Plan/security-contract decision.

## A05.8 Roles and Permission-aware UI

Frozen `06` remains the Product authority.

WordPress capabilities are implementation primitives only.

Admin implementation must preserve:

- one Songhealth role per CMS user;
- no Product-level multi-role union;
- no scattered per-user capability override model;
- no self-escalation;
- protected last Administrator;
- privileged/audited permission changes;
- `CMS User ≠ Personnel`;
- permission-aware UI and server-side enforcement.

## A05.9 Media / Documents / ITA

Frozen sections covering media, images, documents and ITA remain normative in full.

WordPress Media Library may provide binary/media infrastructure, but it does not cancel Songhealth requirements for:

- metadata and relationships;
- usage visibility;
- safe delete behavior;
- duplicate/reuse guidance;
- published document correction/revision semantics;
- ITA evidence integrity;
- file validation/security;
- stable resource identity;
- accessibility metadata;
- domain-specific pickers and status context.

Binary delivery remains governed by the Frozen lifecycle and current-eligibility contract.

In particular:

- an uploaded file does not become public merely because it exists in WordPress Media Library;
- newly uploaded binaries remain non-public until the associated Songhealth lifecycle makes them eligible for public delivery;
- Draft Documents are Admin-only;
- Hidden Documents have no public delivery;
- unpublished ITA Evidence has no public delivery;
- possession or discovery of a binary URL must not bypass the current eligibility decision;
- changing a record from public-eligible to non-public must remove public delivery according to the Frozen lifecycle rules.

WordPress Media Library is therefore a storage/management primitive, not public-delivery authority.

The exact protected-delivery mechanism is a later security/Plan decision and may use the smallest suitable WordPress, `songhealth-core`, web-server, or hosting control, but it must enforce the Frozen current-eligibility contract.

## A05.10 Lists, Search, Filters and Bulk Actions

Frozen admin list/search/filter/bulk requirements remain.

WordPress native list tables/search may be reused when sufficient.

Where native behavior cannot express the Frozen domain semantics, `songhealth-core` adds the smallest bounded extension needed.

No separate admin search service is baseline.

## A05.11 Accessibility and Language

All Frozen responsive, keyboard, label, contrast, validation-message and Thai-content UX requirements remain.

Using `wp-admin` does not waive accessibility requirements.

## A05.12 Implementation Non-Goals

Version 1 does not build by default:

- custom Admin SPA;
- custom CMS framework;
- custom authentication/user store;
- custom generic media library;
- custom generic revisions platform;
- generic workflow engine;
- real-time collaboration;
- offline-first CMS;
- personal file space;
- general enterprise DAM.

These non-goals do not remove Frozen domain-specific behavior.

## A05.13 Acceptance Rule

The lossless test for this amendment is:

> If a Frozen `05` behavior is not explicitly superseded as an implementation mechanism above, it remains required.

No canonical mutation occurs until an independent reviewer verifies this overlay against Frozen `05`.


---

## Canonical Freeze Binding — 29 สิงหาคม 2569

> **Human Acceptance:** PASS  
> **Independent Review:** Phase G Round 2 — PASS  
> **Canonical Controlled-Amendment Version:** v1.1  
> **Canonical Status:** FROZEN  
> **Implementation Authorization:** NONE  
> **T051+:** NOT AUTHORIZED

The embedded Surgical Overlay above is preserved byte-for-byte from the independently reviewed Round 2 artifact. Its pre-integration metadata `REVIEW CANDIDATE — NOT FROZEN` records the state of that artifact **before** Human Acceptance and is superseded by this binding **only for canonical status**.

No normative overlay text is changed by this binding. Frozen pre-amendment content remains preserved in full as the prefix of this canonical document; the later Controlled Amendment has precedence only where it explicitly changes an implementation mechanism.

This Freeze does not authorize application implementation, T051+, importer implementation, Trial Migration, Production Import, Production Cutover, or legacy retirement.

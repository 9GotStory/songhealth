# Content Model — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 02-content-model  
> **Status:** FROZEN — Content Model Baseline  
> **Version:** 1.0  
> **Last Updated:** 13 สิงหาคม 2569  
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`  
> **Purpose:** กำหนดชนิดข้อมูลหลักของเว็บไซต์ ความหมาย ขอบเขต ข้อมูลสำคัญ และความสัมพันธ์ระหว่างข้อมูล โดยยังไม่ลงรายละเอียดระดับ Database Schema, API, ORM หรือโค้ด

---

## 1. Purpose

เอกสารฉบับนี้กำหนด Content Model ของเว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

เป้าหมายคือให้ข้อมูลของระบบ:

- มีความหมายชัดเจน
- แยกตามธรรมชาติของข้อมูล
- ไม่ปะปนทุกอย่างเป็น Post
- ไม่สร้างข้อมูลซ้ำโดยไม่จำเป็น
- เชื่อมโยงกันได้
- ใช้ข้อมูลกลางร่วมกันได้
- รองรับ Search, Homepage, ITA, Service Directory และ CMS
- ดูแลและพัฒนาต่อได้ในระยะยาว
- ไม่ขยายเว็บไซต์ให้กลายเป็นระบบงานประเภทอื่นโดยไม่จำเป็น

หลักสำคัญ:

> **Structured enough to be reliable, simple enough to be maintainable.**

> **Create once, manage once, publish everywhere.**

> **Reuse before duplication.**

---

## 2. Content Model Groups

Content Model แบ่งออกเป็น 4 กลุ่มหลัก

```text
1. Editorial & Website Content
   ├── Basic Page
   ├── News
   ├── Activity
   ├── Announcement
   └── Health Content

2. Organizational Data
   ├── Personnel
   ├── Organization
   ├── Health Service
   ├── Area
   └── Contact Information

3. Service & Resource
   ├── Service
   ├── Document
   └── Media

4. Compliance & Health Information
   ├── Health Report
   └── ITA
```

Content Model ทั้ง 4 กลุ่มผ่าน Cross-Model Review และ Final Consistency Review แล้ว และถูก Freeze เป็น Content Model Baseline v1.0

---

## 3. Common Content Principles

Content แต่ละประเภทไม่จำเป็นต้องมี Field เหมือนกัน แต่ควรใช้แนวคิดกลางร่วมกันเมื่อเหมาะสม

### 3.1 Identity
- ชื่อ
- ชื่อเรื่อง
- ชื่อที่ใช้แสดง
- สถานะ

### 3.2 Classification
- Topic
- Category
- Audience
- Area
- Organization / Source

### 3.3 Relationships

ข้อมูลควรอ้างอิง Master Data หรือ Content อื่นแทนการคัดลอกข้อมูลซ้ำ

```text
Activity
   └── Health Service

News
   └── Area

Service
   └── Document

ITA
   └── Evidence
```

### 3.4 Lifecycle

Lifecycle ต้องเหมาะกับธรรมชาติของข้อมูล

Editorial Content อาจใช้:

```text
Draft → Published → Archived
```

Directory Data อาจใช้:

```text
Draft → Active → Inactive
```

ไม่ควรบังคับ Content ทุกชนิดให้ใช้ Workflow เดียวกัน

### 3.5 Auditability

ข้อมูลสำคัญควรรองรับการตรวจสอบว่าใครสร้าง ใครแก้ไข แก้ไขเมื่อใด และใครเผยแพร่หรือเปลี่ยนสถานะ

---

# PART I — EDITORIAL & WEBSITE CONTENT

## 4. Basic Page

### 4.1 Definition

Basic Page คือหน้าเนื้อหาพื้นฐานสำหรับข้อมูลเว็บไซต์ที่ไม่มี Structured Content Model อื่นรองรับอย่างเหมาะสม

ตัวอย่าง:

- Privacy / PDPA Page
- Accessibility Statement
- เนื้อหาอธิบายเฉพาะของสำนักงาน
- หน้า Static / Semi-static ที่ไม่มี Domain Model เฉพาะ

> **Use Basic Page only when no specific structured content model fits.**

### 4.2 Model

```text
Basic Page
│
├── Identity
│   ├── Title
│   ├── Summary (optional)
│   └── Status
│
├── Content
│   └── Body
│
└── Resources
    ├── Media (optional)
    └── Documents (optional)
```

### 4.3 Guardrails

Basic Page ไม่ควรใช้แทน:

- News
- Activity
- Announcement
- Health Content
- Service
- Personnel
- Organization
- Health Service
- Health Report
- ITA

หากข้อมูลมี Structured Model ที่เหมาะสมกว่า ต้องใช้ Model นั้นเป็น Source of Truth

---

## 5. News

### 5.1 Definition

News คือเนื้อหาข่าวสารหรือการประชาสัมพันธ์ที่มีลักษณะเป็นเรื่องราวและมีช่วงเวลาการเผยแพร่

คำว่า “ข่าวสุขภาพ” ใน Public Website เป็น View / Filter ของ News ที่เชื่อมกับ Health Topic ไม่ใช่ Content Type แยก

ความรู้สุขภาพที่มีอายุการใช้งานยาวกว่าให้ใช้ Health Content

ไม่ใช่:
- Activity
- Announcement
- Health Content

### 5.2 Model

```text
News
│
├── Identity
│   ├── Title
│   ├── Summary
│   └── Body
│
├── Media
│   └── Featured Image
│
├── Classification
│   ├── News Category
│   ├── Topic
│   ├── Area
│   ├── Audience
│   └── Source
│
├── Relationships
│   ├── Health Service
│   ├── Personnel
│   ├── Documents
│   ├── Media
│   └── Related Content
│
└── Publishing
    ├── Draft
    ├── Published
    ├── Archived
    ├── Published Date
    └── Scheduled Publish
```

### 5.3 News Category ≠ Topic

ตัวอย่าง:

```text
Content Type: News
News Category: ข่าวประชาสัมพันธ์
Topic: ควบคุมโรค
Health Topic: ไข้เลือดออก
Area: ตำบลสะเอียบ
Audience: ประชาชนทั่วไป
Source: สสอ.สอง
```

### 5.4 Featured / Homepage

คำว่า ข่าวเด่น, ข่าวหน้าแรก, Featured เป็น Presentation Attribute ไม่ใช่ Content Type ใหม่

---

## 6. Activity

### 6.1 Definition

Activity คือบันทึกกิจกรรม เหตุการณ์ การประชุม การลงพื้นที่ หรือการเข้าร่วมกิจกรรมของสำนักงานและเครือข่าย

Activity ไม่ต้องถูกสร้างซ้ำเป็น News

### 6.2 Model

```text
Activity
│
├── Identity
│   ├── Title
│   ├── Summary
│   └── Description
│
├── Event Information
│   ├── Date
│   ├── Time
│   └── Location
│
├── People / Organizations
│   ├── Internal Personnel
│   ├── External Participants
│   ├── Related Organizations
│   └── Host / Chair / Context
│
├── Classification
│   ├── Topic
│   ├── Area
│   ├── Audience
│   └── Activity Type
│
├── Media
│   ├── Featured Image
│   └── Gallery
│
├── Documents
│
└── Publishing
    ├── Draft
    ├── Published
    └── Archived
```

### 6.3 Location

รองรับทั้ง:
- Linked Location เช่น Health Service / Organization / Known Place
- Free-text Location เมื่อไม่มีเหตุผลต้องสร้าง Master Record

### 6.4 Internal vs External Participants

บุคลากรภายในใช้ Personnel Relationship ส่วนบุคคลภายนอกไม่ควรถูกสร้างเป็น Personnel Master ทุกครั้ง

---

## 7. Announcement

### 7.1 Definition

Announcement คือข้อมูลที่หน่วยงานประกาศอย่างเป็นทางการ หรือข้อมูลที่มีผลต่อการรับทราบ การสมัคร การดำเนินการ หรือสิทธิของผู้เกี่ยวข้อง

### 7.2 Model

```text
Announcement
│
├── Identity
│   ├── Title
│   ├── Summary
│   └── Details
│
├── Classification
│   ├── Announcement Type
│   ├── Topic
│   ├── Audience
│   └── Organization
│
├── Important Dates
│   ├── Announcement Date
│   ├── Publish Start
│   ├── Publish End
│   ├── Application Start (optional)
│   └── Application End (optional)
│
├── Resources
│   └── Documents
│
└── Lifecycle
    ├── Draft
    ├── Published
    ├── Closed / Expired
    └── Archived
```

### 7.3 Expired ≠ Archived

ประกาศหมดเขตไม่จำเป็นต้องหายจากเว็บไซต์ แต่สามารถเข้าสู่ Closed / Expired ก่อน Archived

---

## 8. Health Content

### 8.1 Definition

Health Content คือเนื้อหาความรู้สุขภาพที่มีคุณค่าในการอ่านระยะยาว ไม่จำเป็นต้องผูกกับเหตุการณ์หรือวันที่ข่าว

### 8.2 Model

```text
Health Content
│
├── Identity
│   ├── Title
│   ├── Summary
│   └── Body
│
├── Classification
│   ├── Health Topic
│   ├── Audience
│   └── Risk / Condition
│
├── Editorial Information
│   ├── Author / Source
│   ├── Published Date
│   ├── Last Reviewed Date
│   └── Next Review Date
│
├── Media
│
└── Relationships
    ├── News
    ├── Documents
    └── Services
```

### 8.3 Review Lifecycle

Health Content ควรรองรับการทบทวนเนื้อหาเพื่อป้องกันข้อมูลสุขภาพล้าสมัย โดยไม่จำเป็นต้องสร้าง Approval Workflow ซับซ้อน

---

# PART II — ORGANIZATIONAL DATA

## 9. Personnel

### 9.1 Definition

Personnel คือข้อมูลบุคลากรที่ใช้เป็น Directory และ Master Data สำหรับเว็บไซต์

> **Personnel Directory is not an HR system.**

### 9.2 Model

```text
Personnel
│
├── Identity
│   ├── Prefix
│   ├── First Name
│   ├── Last Name
│   ├── Display Name
│   └── Profile Image
│
├── Assignment
│   ├── Position
│   ├── Role
│   ├── Organizational Unit
│   ├── Start Date
│   └── End Date
│
├── Public Contact
├── Visibility / Status
│
└── Relationships
    ├── Organization
    ├── Activity
    └── Related Content
```

### 9.3 Person, Position, Role, Assignment

```text
Person
   ↓
Assignment
   ├── Position
   ├── Role
   └── Organizational Unit
```

Position ไม่เท่ากับ Role

### 9.4 Executives

ผู้บริหารเป็น Role / Assignment ไม่ใช่ Personnel Type

### 9.5 Acting Assignment

รองรับบทบาทชั่วคราว เช่น รักษาราชการแทน ปฏิบัติราชการแทน หรือปฏิบัติหน้าที่เพิ่มเติม

### 9.6 Historical Accuracy

Assignment ควรมีช่วงเวลาเพื่อรองรับ Activity ในอดีต การเปลี่ยนตำแหน่ง การเปลี่ยนผู้บริหาร และ Historical Content Reference

### 9.7 Status

```text
Draft
Active
Inactive
Hidden
```

### 9.8 Privacy

ไม่ควรเก็บหรือเผยแพร่ข้อมูลส่วนตัวเกินความจำเป็น เช่น เลขประจำตัวประชาชน ที่อยู่บ้าน วันเดือนปีเกิด เบอร์ส่วนตัว หรือข้อมูล HR ที่ไม่เกี่ยวกับเว็บไซต์

---

## 10. Organization

### 10.1 Core Concepts

ต้องแยก:
- Internal Organization
- External Organization
- Health Service
- Affiliation

### 10.2 Internal Organization

ใช้แนวคิด Organizational Unit และรองรับ Unit Type เช่น Office, Group, Section, Work Area, Other

### 10.3 Organizational Unit Model

```text
Organizational Unit
│
├── Name
├── Unit Type
├── Description
├── Responsibilities
├── Contact
├── Status
└── Relationships
    ├── Personnel Assignments
    ├── Activity
    └── Documents
```

รายชื่อบุคลากรต้องมาจาก Personnel Assignment ไม่ควรกรอกซ้ำเป็นข้อความ

### 10.4 External Organization

ใช้กับองค์กรภายนอกที่เว็บไซต์ต้องอ้างอิงซ้ำ โดยไม่จำเป็นต้องสร้าง Master Record ให้ทุกหน่วยงานที่ปรากฏเพียงครั้งเดียว

### 10.5 Affiliation

สังกัดควรเป็น Relationship เมื่อมีการใช้ซ้ำ

### 10.6 History

รองรับ Active / Inactive / Hidden และช่วงเวลาเมื่อจำเป็น เพื่อรักษา Historical Reference

---

## 11. Area Master Data

### 11.1 Purpose

```text
Area
├── Province
├── District
├── Subdistrict
└── Village
```

Area Master ชุดเดียวใช้ร่วมกับ Health Service, Service Area, News และ Activity ภายใน CMS

### 11.2 Relationship Meaning

```text
News
└── Related Area

Activity
└── Activity Area

Health Service
└── Service Area

```

---

## 12. Health Service

### 12.1 Definition

Health Service คือหน่วยบริการสุขภาพที่มีตัวตนจริงและมีบทบาทในการให้บริการสุขภาพแก่ประชาชน

> **Health Service Directory is not a HIS.**  
> **Health Service Directory is not an organizational hierarchy.**

### 12.2 Model

```text
Health Service
│
├── Identity
│   ├── Official Name
│   ├── Display Name
│   ├── Service Code
│   ├── Type
│   └── Status
│
├── Affiliation
│
├── Location
│   ├── Address
│   └── Map Location
│
├── Service Area
│   └── Area Relationships
│
├── Contact
├── Opening Hours
├── Services Offered
├── Media
│
└── Relationships
    ├── News
    ├── Activity
    ├── Documents
    ├── Services
    └── Organization
```

### 12.3 Health Service Type

ตัวอย่าง:
- โรงพยาบาล
- โรงพยาบาลส่งเสริมสุขภาพตำบล
- สถานบริการสาธารณสุขชุมชน
- Other

### 12.4 Official Name / Display Name

รองรับชื่อทางการและชื่อย่อที่ใช้แสดง

### 12.5 Location ≠ Service Area

Location คือที่ตั้ง ส่วน Service Area คือพื้นที่รับผิดชอบ

### 12.6 Service Area — Version 1

Service Area เป็นส่วนหนึ่งของ Version 1 และอ้างอิง Area Master Data

ระดับรายละเอียดสามารถแตกต่างตามประเภทหน่วยบริการ

### 12.7 Services Offered

บริการที่หน่วยบริการมีต้องเชื่อมกับ Service Model กลาง

### 12.8 Scope Boundary

ไม่รวม HIS, EMR, นัดหมายผู้ป่วย, ตารางแพทย์ละเอียด, คิว, ข้อมูลผู้ป่วย, สต๊อกยา, Billing หรือ Clinical Records

---

## 13. Contact Information

### 13.1 Definition

Contact Information คือข้อมูลช่องทางที่ใช้ติดต่อ Organization, Personnel, Health Service, Service และ Office / Website

### 13.2 Model

```text
Contact Information
│
├── Communication Channel
│   ├── Phone
│   ├── Email
│   ├── Website
│   ├── Social
│   └── Other
│
├── Physical Address
├── Purpose / Label
├── Visibility
├── Primary / Secondary
├── Status
│
└── Relationships
    ├── Organization
    ├── Personnel
    ├── Health Service
    └── Service
```

### 13.3 Purpose / Label

Contact ต้องบอกได้ว่าใช้เพื่ออะไร เช่น โทรศัพท์สำนักงาน งานร้องเรียน อีเมลกลาง หรือ Fax

### 13.4 Visibility

```text
Public
Internal
Hidden
```

### 13.5 Contact Inheritance

> **Use specific contact when needed; otherwise inherit from the owning entity.**

### 13.6 Address / Map / Opening Hours

Address, Map Location และ Opening Hours เป็นคนละแนวคิด แม้จะแสดงร่วมกันบ่อย

### 13.7 Scope Boundary

Contact Information ไม่ใช่ CRM, Contact Center, Messaging System หรือ Personal Address Book

---

# PART III — SERVICE & RESOURCE

## 14. Service

### 14.1 Definition

Service คือบริการหรือกระบวนการที่ผู้ใช้สามารถเข้าถึง ขอรับ ติดต่อ หรือดำเนินการกับหน่วยงานหรือหน่วยบริการที่เกี่ยวข้อง

> **Citizen Service ≠ Online Service.**

> **Service Model supports service discovery, not full transactional government workflow.**

### 14.2 Model

```text
Service
│
├── Identity
│   ├── Name
│   ├── Display Name
│   ├── Summary
│   └── Status
│
├── Classification
│   ├── Service Category
│   ├── Topic
│   └── Audience
│
├── Ownership
│   ├── Ownership Type
│   └── Owner / Provider
│
├── Delivery
│   ├── Channels
│   ├── Locations
│   ├── Opening Hours
│   └── Contact
│
├── Guidance
│   ├── Eligibility
│   ├── Steps
│   ├── Required Documents
│   ├── Duration
│   ├── Fees
│   └── Notes
│
├── Resources
│   ├── Forms
│   ├── Documents
│   └── External URL
│
└── Relationships
    ├── Health Services
    ├── Organizations
    └── Related Content
```

### 14.3 Ownership Type

1. Direct Service
2. Coordinated Service
3. Related Health Service
4. External Digital Service

### 14.4 Service Channel

- Online
- In-person
- Paper-based
- Telephone
- Hybrid
- External Online Service

Ownership และ Channel ต้องแยกกัน

### 14.5 Audience vs Eligibility

Audience คือกลุ่มผู้ใช้กว้าง ส่วน Eligibility คือเงื่อนไขเฉพาะของผู้มีสิทธิใช้บริการ

### 14.6 Service Steps

ขั้นตอนบริการเป็นข้อมูลอธิบายกระบวนการ ไม่ใช่ Workflow Engine หรือ Case Tracking

### 14.7 Required Documents

รองรับทั้ง Requirement Text และ Downloadable Resource ที่เชื่อมกับ Document Model

### 14.8 Service — Health Service Relationship

Relationship เดียวใช้ได้ทั้ง Services Offered ของหน่วยบริการ และรายชื่อหน่วยบริการที่มีบริการนั้น

### 14.9 Confirmed Offline Example

การยืนยันสิทธิการรักษาพยาบาลของ อสม. เป็น Direct Service แบบ Paper-based / In-person และไม่เป็น Online Transaction ใน Version 1

### 14.10 Official Information / Document Request

การขอข้อมูลหรือเอกสารจากสำนักงานอย่างเป็นทางการให้มาติดต่อสำนักงานโดยตรง เว็บไซต์ให้ข้อมูลขั้นตอนและช่องทางเท่านั้นใน Version 1

### 14.11 Quick Service

Quick Service เป็น Presentation Attribute ไม่ใช่ Content Type

### 14.12 Service vs Resource / Discovery

สิ่งต่อไปนี้สามารถแสดงร่วมกับ Service Catalog ใน Public UX แต่ไม่ควรถูกสร้างเป็น Service Entity โดยตัวมันเอง:

- คู่มือ / แบบฟอร์ม → Document Resource
- การค้นหาหน่วยบริการ → Health Service Directory / Discovery
- Contact / Map → Contact Information / Location

> **A public entry point is not automatically a Service entity.**

### 14.13 Scope Boundary

ไม่รวม Workflow Engine, Full Case Management, Payment, Digital Signature, Queue, Appointment, SLA Engine หรือ Online Application สำหรับทุกบริการ

---

## 15. Document

### 15.1 Definition

Document คือทรัพยากรเอกสารที่สามารถถูกค้นหา อ้างอิง แนบ หรือเผยแพร่ในหลายบริบทของเว็บไซต์ได้

> **Document Center is the single source of truth for published files.**

### 15.2 Model

```text
Document
│
├── Identity
│   ├── Title
│   ├── Summary
│   ├── Type
│   └── File
│
├── Classification
│   ├── Topic
│   ├── Audience
│   ├── Area
│   ├── Owner / Source
│   └── Fiscal Year
│
├── Document Metadata
│   ├── Document Date
│   ├── Document Number
│   ├── Version / Revision
│   ├── Language
│   ├── File Type
│   └── File Size
│
├── Lifecycle
│   ├── Status
│   ├── Published Date
│   ├── Expiry
│   └── Superseded By
│
└── Relationships
    ├── News
    ├── Announcement
    ├── Service
    ├── Health Report
    ├── ITA Evidence
    └── Related Documents
```

### 15.3 Document Type ≠ Topic

เช่น Type = รายงาน, Topic = NCD

### 15.4 Document Date ≠ Published Date

วันที่เอกสารและวันที่เผยแพร่บนเว็บไซต์เป็นคนละข้อมูล

### 15.5 Fiscal Year

ปีงบประมาณเป็น Structured Metadata

### 15.6 Version / Revision

รองรับการเปลี่ยนแปลงเอกสารโดยไม่ Upload ทับจนประวัติสูญหาย โดยไม่ต้องเป็น Full DMS Version Control

### 15.7 Lifecycle

```text
Draft
Published
Superseded
Expired
Archived
Hidden
```

### 15.8 Reuse

Document เดียวสามารถใช้กับ Document Center, Announcement, Service, About / Plans, Health Report และ ITA Evidence

### 15.9 Document Owner / Source

Published by Website ไม่เท่ากับ Document Owner

### 15.10 Scope Boundary

Document Model ไม่ใช่ระบบสารบรรณ, Digital Signature, Workflow เสนอเซ็น, Internal File Sharing หรือ Enterprise DMS

---

## 16. Media

### 16.1 Definition

Media คือทรัพยากรสื่อที่ใช้ประกอบ Content หรือข้อมูลอื่นในเว็บไซต์

Version 1 เน้น Image, Logo, Other Visual Asset และ External Video Reference ตามความเหมาะสม

PDF และไฟล์เอกสารอยู่ใน Document Model

### 16.2 Model

```text
Media
│
├── Identity
│   ├── Label
│   ├── Type
│   └── Status
│
├── Accessibility
│   ├── Alt Text
│   └── Decorative
│
├── Description
│   ├── Caption
│   ├── Description
│   ├── Credit
│   └── Source
│
├── Rights
│   ├── Ownership
│   └── Usage Note
│
├── Technical Metadata
│   ├── File Type
│   ├── File Size
│   ├── Width
│   └── Height
│
└── Relationships
    ├── News
    ├── Activity
    ├── Personnel
    ├── Organization
    ├── Health Service
    └── Presentation
```

### 16.3 Asset ≠ Usage Role

Featured Image, Gallery Image, Profile Image และ Hero Image เป็น Usage Role ของ Media

### 16.4 Alt Text

Alt Text เป็น First-Class Metadata และต้องแยกจาก Caption

### 16.5 Gallery

Gallery เป็น Ordered Relationship ระหว่าง Content กับ Media ไม่ใช่เพียง Folder เก็บไฟล์

### 16.6 Media Reuse

Media เดียวสามารถถูกใช้หลายบริบท และระบบควรรู้ว่า Media ถูกใช้อยู่ที่ใดก่อนอนุญาตให้ลบ

### 16.7 Image Variants

Thumbnail / Card / Hero / Full เป็น Delivery Variant ไม่ใช่ Content ใหม่ที่ Admin ต้อง Upload เอง

### 16.8 Source / Credit / Rights

รองรับ Source, Credit, Ownership และ Usage Note ในระดับพอดี

### 16.9 Video

Version 1 ใช้ External Video Platform เป็นค่าเริ่มต้นสำหรับวิดีโอขนาดใหญ่

### 16.10 Scope Boundary

Media Model ไม่ใช่ Full DAM, Video Streaming Platform, Professional Photo Editor หรือ Rights Licensing Workflow เต็มระบบ

---

# PART IV — COMPLIANCE & HEALTH INFORMATION

## 17. Health Report

### 17.1 Definition

Health Report คือข้อมูลเผยแพร่รายงานด้านสุขภาพหรือสาธารณสุข โดยเว็บไซต์ทำหน้าที่ช่วยให้ผู้ใช้ค้นหา จำแนก และเข้าถึงรายงานฉบับเต็มได้ง่าย

> **Health Report = Metadata + Report Document**

> **Health Report is not an analytical dataset.**

รายงานฉบับเต็ม เช่น รายงานสถานการณ์โรค รายงานผลการดำเนินงาน หรือรายงานประจำปี ให้เผยแพร่ผ่าน Document Resource กลาง โดยทั่วไปเป็น PDF

### 17.2 Model

```text
Health Report
│
├── Identity
│   ├── Title
│   ├── Summary
│   └── Status
│
├── Classification
│   ├── Report Type
│   ├── Health Topic
│   ├── Area
│   └── Fiscal Year
│
├── Reporting
│   ├── Reporting Period
│   └── Published Date
│
├── Ownership
│   ├── Owner / Source
│   └── Responsible Unit (optional)
│
└── Resource
    └── Report Document
            ↓
         Document
```

### 17.3 Report Type ≠ Health Topic

ตัวอย่าง:

```text
Report Type: Situation Report
Health Topic: ไข้เลือดออก
```

ไม่ควรสร้าง Report Type แยกตามทุกโรคหรือทุกประเด็นสุขภาพ

### 17.4 Reporting Period ≠ Published Date

ช่วงเวลาที่ข้อมูลในรายงานครอบคลุม และวันที่เผยแพร่รายงานบนเว็บไซต์ เป็นคนละข้อมูล

ตัวอย่าง:

```text
Reporting Period: 1–31 กรกฎาคม 2569
Published Date: 5 สิงหาคม 2569
```

### 17.5 Fiscal Year

ปีงบประมาณเป็น Structured Metadata เมื่อรายงานนั้นอ้างอิงปีงบประมาณ

ไม่บังคับใช้กับรายงานทุกประเภท

### 17.6 Area

Health Report ใช้ Area Master Data ของ CMS เพื่อช่วยจัดหมวดหมู่และค้นหารายงานตามพื้นที่

ตัวอย่าง:

```text
Health Report
└── Area
    └── อำเภอสอง
```

ไม่ควรสร้าง Area List ใหม่เฉพาะ Health Report

### 17.7 Summary

Summary ควรเป็นคำอธิบายสั้น ๆ เพื่อช่วยให้ผู้ใช้เข้าใจว่ารายงานเกี่ยวกับอะไร และช่วย Search / Listing / Card

ไม่จำเป็นต้องคัดลอกเนื้อหารายงานหรือสรุป Key Findings ทั้งหมดจาก PDF

> **Web metadata should help discovery; the PDF remains the primary report content.**

### 17.8 Report Document

รายงานฉบับเต็มเชื่อมกับ Document Resource กลาง

```text
Health Report
      │
      └── Report Document
               ↓
            Document
```

ไฟล์เดียวกันสามารถถูกอ้างอิงจาก Document Center, ITA หรือบริบทอื่นได้โดยไม่ Upload ซ้ำ

### 17.9 Health Report และ Dashboard

Health Report ไม่มี Dependency กับ Dashboard หรือ Analytical Metrics โดย Default

ไม่ต้องแตกตัวเลข ตาราง หรือกราฟภายใน PDF ออกมาเป็น Content Entity ใน CMS

```text
Health Report
→ Metadata + PDF

Dashboard
→ SQL / Analytical Data → API → Dashboard UI
```

สองส่วนสามารถนำเสนออยู่บนเว็บไซต์เดียวกันได้ แต่มี Data Responsibility แยกกัน

### 17.10 Scope Boundary

Health Report Version 1 ไม่รวม:

- Health Metric Extraction
- Raw Dataset Management
- Patient-level Data
- BI Report Builder
- Dashboard Builder
- Automated Epidemiological Analysis
- Structured statistics extracted from PDF

---

## 18. Dashboard / Analytical Data Boundary

> **Dashboard and analytical metrics are outside the CMS Content Model.**

Dashboard จะเป็น Module / Data Platform แยกต่างหาก แม้สามารถแสดงผลภายใต้ path ของเว็บไซต์ เช่น:

```text
/dashboard
/dashboard/ncd
/dashboard/dengue
```

### 18.1 Architecture Principle

```text
Operational / Health Data
          ↓
 Dashboard Database
          ↓
    Dashboard API
          ↓
    /dashboard UI
```

CMS ไม่เป็น Data Source หลักของ Dashboard และ Dashboard ไม่ควรอ่าน CMS Database โดยตรง

### 18.2 Database Separation

CMS Database และ Dashboard Database ต้องแยกกันอย่างน้อยในระดับ Logical Database และ Credentials

```text
CMS API                         Dashboard API
   │                                 │
   ▼                                 ▼
CMS Database                    Dashboard Database
Content / Directory             Analytics / Time Series / KPI
```

การแยก Database ไม่ได้หมายความว่าต้องใช้ Database Server คนละเครื่องใน Version 1

### 18.3 Separate Credentials / Least Privilege

```text
cms_app_user
→ CMS Database only

dashboard_api_user
→ Dashboard Database only
```

แต่ละ Application Component ควรเข้าถึงเฉพาะข้อมูลที่จำเป็นต่อหน้าที่ของตน

### 18.4 No Default Cross-Database Join

ไม่ควรทำให้การเชื่อม CMS และ Dashboard ขึ้นกับ Cross-Database Join เป็นกลไกหลัก

หากต้องเชื่อมข้อมูลข้าม Domain ให้ใช้:

- Stable / Canonical Identifier
- API
- Controlled reference-data synchronization เมื่อมีเหตุผล

### 18.5 Area and Health Service Identifiers

Dashboard สามารถมี Geographic Dimension และ Facility Reference ของตัวเอง แต่ควรใช้รหัสมาตรฐานที่สอดคล้องกับ CMS

ตัวอย่าง:

```text
CMS Area Master                  Dashboard Geographic Dimension
       │                                      │
       └──── canonical area code ─────────────┘

CMS Health Service              Dashboard Facility Dimension
       │                                      │
       └──── facility/service code ───────────┘
```

ไม่จำเป็นต้องแชร์ Table หรือ Database เดียวกัน

### 18.6 Content Model Impact

`Health Metric` ถูกถอดออกจาก CMS Content Model ใน Version 1

หากในอนาคตพบ Use Case ที่ต้องมี CMS-managed metric จริง จึงค่อยออกแบบใหม่จาก Requirement ที่เกิดขึ้นจริง

> **Future Dashboard requirements must not force analytical complexity into today’s CMS.**

---

## 19. ITA Model

### 19.1 Definition

ITA ของเว็บไซต์เป็น **Structured Yearly Evidence Directory** สำหรับจัดหลักฐานการเปิดเผยข้อมูลตามเกณฑ์ของแต่ละปีงบประมาณ

> **Simple for staff, structured for the system, adaptable year by year.**

ITA Version 1 ไม่ใช่ Compliance Engine และไม่ควรทำให้ Workflow การเผยแพร่หลักฐานซับซ้อนกว่างานจริง

### 19.2 Core Structure

```text
ITA
└── Fiscal Year
    └── MOIT / Section
        └── Requirement / Item
            └── Evidence
                ├── PDF Document
                └── External URL (optional)
```

แกนหลักมีเพียง:

```text
Fiscal Year
    ↓
MOIT / Section
    ↓
Requirement / Item
    ↓
Evidence
```

### 19.3 Fiscal Year

Fiscal Year เป็น Root ของ ITA เพื่อให้เกณฑ์แต่ละปีสามารถเปลี่ยนได้โดยไม่กระทบข้อมูลย้อนหลัง

ตัวอย่าง:

```text
ITA 2569
├── MOIT 1
├── MOIT 2
└── ...

ITA 2570
├── MOIT 1
├── MOIT 2
├── MOIT ใหม่
└── ...
```

จำนวน MOIT ชื่อหัวข้อ จำนวนข้อย่อย และรายละเอียดต้องเป็นข้อมูลที่ Configurable ไม่ Hard-code ตามปีใดปีหนึ่ง

### 19.4 ITA Fiscal Year Model

```text
ITA Fiscal Year
├── Fiscal Year
├── Title
├── Description (optional)
├── Status
└── Display Order
```

Lifecycle ระดับปีใช้แนวทางเรียบง่าย:

```text
Draft
Published
Archived
```

Archived ไม่ได้หมายถึงลบหรือซ่อน เพราะ ITA ปีย้อนหลังควรยังเปิดดูได้

### 19.5 MOIT / Section

```text
MOIT / Section
├── Code
├── Title
├── Description (optional)
└── Display Order
```

MOIT / Section ต้องสามารถกำหนดใหม่ได้ตามเกณฑ์ของแต่ละปี

### 19.6 Requirement / Item

```text
Requirement / Item
├── Code / Number
├── Title
├── Description
└── Display Order
```

หนึ่ง MOIT สามารถมี Requirement / Item ได้ตามโครงสร้างของปีนั้น โดยไม่ผูกกับจำนวนตายตัว

### 19.7 Evidence

Evidence ใน Version 1 รองรับหลัก:

```text
Evidence
├── Document
├── External URL (optional)
├── Label (optional)
└── Display Order
```

PDF / Document เป็น Evidence หลักตาม Workflow จริงของงาน ITA

External URL ใช้เมื่อหลักฐานอยู่ภายนอกจริงและมีความจำเป็น

### 19.8 Document Integration

ITA ใช้ Document Resource กลางเป็นแหล่งไฟล์ แต่ UX หลังบ้านต้องเรียบง่าย

ผู้ใช้ควรสามารถ:

```text
เพิ่มหลักฐาน

○ อัปโหลด PDF ใหม่
○ เลือกเอกสารที่มีอยู่
○ เพิ่มลิงก์ภายนอก
```

หากอัปโหลด PDF ใหม่จากหน้า ITA ระบบสามารถสร้าง Document Resource และเชื่อม Evidence ให้อัตโนมัติ

ผู้ใช้ไม่ควรถูกบังคับให้เข้า Document Center ก่อนทุกครั้ง

> **Architecture can be structured without making the workflow complicated.**

### 19.9 Reuse Policy

ใช้หลัก:

> **Reuse when practical; don't make reuse harder than the work itself.**

หาก Document มีอยู่แล้วสามารถเลือกมาใช้ซ้ำได้

หากเป็นหลักฐานใหม่ เจ้าหน้าที่สามารถ Upload จากหน้า ITA ได้โดยตรง และระบบจัดการ Resource Relationship เบื้องหลัง

### 19.10 Historical Accuracy

ITA Version 1 ไม่ผูกแบบ Dynamic โดยตรงกับ Personnel, Organization, Service หรือข้อมูลปัจจุบันอื่นเพื่อสร้างหลักฐานย้อนหลัง

หลักฐานของปีนั้นถูกเก็บผ่าน Published Evidence Document / URL ของปีนั้นเป็นหลัก

```text
ITA 2569
→ Evidence PDF ปี 2569

ITA 2570
→ Evidence PDF ปี 2570
```

วิธีนี้รักษาประวัติได้เรียบง่ายและลดความจำเป็นของ Snapshot Engine

### 19.11 Migration Principle

สำหรับ ITA เดิม:

> **Preserve history; improve forward.**

ไม่จำเป็นต้อง Normalize ข้อมูลย้อนหลังทั้งหมดใหม่หากไม่มีประโยชน์ต่อการใช้งานจริง

โครงสร้างขั้นต่ำที่ต้องรักษา:

```text
Fiscal Year
→ MOIT / Section
→ Requirement / Item
→ Evidence PDF / URL
```

### 19.12 Scope Boundary

ITA Model Version 1 ไม่รวม:

- ITA Document Repository แยกอีกชุด
- Full Compliance Workflow Engine
- Automated Scoring Engine
- Automatic Legal Interpretation
- Complex Approval Chains
- Full Snapshot Engine
- Dynamic Personnel / Organization / Service Evidence Binding
- ITA-specific Personnel Directory
- ITA-specific Organization Structure
- ITA-specific Service Catalog

### 19.13 Foundation Decisions

- ITA เป็น Structured Yearly Evidence Directory
- PDF / Document เป็น Evidence หลักของ Version 1
- External URL รองรับเมื่อจำเป็น
- Fiscal Year → MOIT → Requirement → Evidence เป็นโครงสร้างหลัก
- MOIT และ Requirement Configurable ตามแต่ละปี
- ไม่ Hard-code จำนวนหรือรายละเอียด MOIT
- ITA ปีย้อนหลังยังเปิดดูได้
- Document เดิม Reuse ได้เมื่อเหมาะสม
- UX ต้องไม่บังคับ Workflow การ Reuse ที่ซับซ้อน
- ไม่ผูก ITA แบบ Dynamic กับ Personnel / Organization / Service ใน Version 1
- Historical ITA รักษาผ่าน Evidence ของปีนั้นเป็นหลัก
- ไม่สร้าง Compliance Engine เกินความจำเป็น

---

## 20. Cross-Model Relationships

```text
Basic Page
   ├── Document
   └── Media

Personnel
   ├── Organization
   └── Activity

Organization
   ├── Personnel
   ├── Health Service
   └── Contact

Area
   ├── News
   ├── Activity
   └── Health Service

Health Service
   ├── Organization / Affiliation
   ├── Service
   ├── Area / Service Area
   ├── Contact
   ├── Activity
   └── Documents

Service
   ├── Organization
   ├── Health Service
   ├── Contact
   └── Document

Document
   ├── Announcement
   ├── Service
   ├── Health Report
   └── ITA Evidence

Media
   ├── News
   ├── Activity
   ├── Personnel
   └── Health Service

ITA
   └── Evidence
       ├── Document
       └── External URL
```

> **No content model should become an isolated island.**

---

## 21. Accepted Content Model Decisions

### Editorial & Website Content
- Basic Page ใช้เฉพาะเมื่อไม่มี Structured Content Model ที่เหมาะสมกว่า
- Basic Page ไม่ใช้แทน News, Activity, Announcement, Service, Personnel, Health Service, Health Report หรือ ITA
- News, Activity, Announcement และ Health Content เป็นคนละ Content Type
- “ข่าวสุขภาพ” เป็น View / Filter ของ News ตาม Health Topic ไม่ใช่ Content Type ใหม่
- Activity ไม่ต้องสร้างซ้ำเป็น News
- Health Content ไม่ใช่ News
- Summary เป็นข้อมูลจริง
- Featured เป็น Presentation Attribute
- Health Content รองรับ Review Date

### Personnel
- Person, Position, Role และ Assignment แยกแนวคิดกัน
- ผู้บริหารเป็น Role / Assignment ไม่ใช่ Personnel Type
- รองรับ Acting Assignment
- เก็บ Historical Assignment เมื่อจำเป็น
- Personnel Directory ไม่ใช่ HRIS

### Organization
- Internal Organization, External Organization, Health Service และ Affiliation แยกแนวคิดกัน
- Organizational Unit เชื่อม Personnel ผ่าน Assignment
- ไม่กรอกรายชื่อบุคลากรซ้ำเป็นข้อความ
- Historical Relationship ควรถูกเก็บเมื่อมีผลต่อข้อมูลเผยแพร่หรือ Historical Reference ที่มี Use Case จริง

### Area
- มี Area Master Data กลาง
- Service Area อยู่ใน Version 1
- Location และ Service Area เป็นคนละแนวคิด
- Area Master reuse กับ News, Activity และ Health Service ภายใน CMS; Dashboard ใช้ Geographic Dimension ของตนเองโดยอาศัยรหัสพื้นที่มาตรฐานร่วมกัน

### Health Service
- Health Service เป็น Master Data แยกจาก Organization
- Affiliation เป็น Relationship
- Services Offered เชื่อมกับ Service Model กลาง
- Directory ตอบได้ทั้ง “อยู่ที่ไหน” และ “มีบริการอะไร”
- Health Service Directory ไม่ใช่ HIS
- Health Service Directory ไม่ใช่ Org Chart

### Contact
- Contact Information เป็นข้อมูลกลาง
- Contact Point ต้องมี Purpose / Label
- Public / Internal / Hidden แยกกัน
- Service สามารถ inherit Contact จาก Owner ได้
- Contact Model ไม่ใช่ CRM

### Service
- Ownership, Channel และ Audience แยกกัน
- Citizen Service ไม่เท่ากับ Online Service
- Service Model เน้น Discovery + Guidance
- Service ไม่ใช่ Transaction Platform เต็มรูปแบบ
- แบบฟอร์มและเอกสารเป็น Resource ของ Service
- Quick Service เป็น Presentation Attribute
- คู่มือ / แบบฟอร์มเป็น Document Resources และการค้นหาหน่วยบริการเป็น Directory / Discovery Function ไม่ใช่ Service Entity โดยตัวมันเอง
- การยืนยันสิทธิการรักษาพยาบาล อสม. เป็น Paper-based / In-person
- การขอข้อมูลหรือเอกสารจากสำนักงานอย่างเป็นทางการให้มาติดต่อสำนักงานใน Version 1

### Health Report / Dashboard
- Health Report = Metadata + PDF Report
- PDF เป็นแหล่งเนื้อหารายงานหลัก
- ไม่แตกข้อมูลภายในรายงานเป็น Health Metrics ใน CMS
- Health Metric ถูกถอดออกจาก CMS Content Model ใน Version 1
- Dashboard เป็น Data Platform แยกจาก CMS
- CMS Database และ Dashboard Database แยกกันอย่างน้อยในระดับ Logical Database + Credentials
- Dashboard ใช้ SQL / Analytical Data → API → `/dashboard`
- ไม่ใช้ Cross-Database Join เป็นกลไกหลักระหว่าง CMS กับ Dashboard
- การเชื่อมข้าม Domain ใช้ Stable Identifier, API หรือ Controlled Sync

### Document
- Document Center เป็น Single Source of Truth
- Document Type และ Topic แยกกัน
- Document Date และ Published Date แยกกัน
- Fiscal Year เป็น Structured Metadata
- เอกสารใหม่ที่มาแทนเอกสารเดิมไม่ควรทำให้ประวัติสูญหาย
- Expired, Superseded และ Archived มีความหมายต่างกัน
- Content อื่น Reference Document กลาง ไม่ Upload ซ้ำ
- Document Model ไม่ใช่ DMS หรือ e-Saraban

### Media
- Media เป็น Resource กลาง
- Usage Role ไม่ใช่ Media Type โดยอัตโนมัติ
- Alt Text เป็น First-Class Metadata
- File Name ไม่ใช่ Content Title
- รองรับ Source, Credit และ Usage Rights
- ระบบควรรู้ Media Usage ก่อนลบ
- Media reuse ได้หลายบริบท
- Video ขนาดใหญ่ใช้ External Platform เป็นค่าเริ่มต้น
- Media Library ไม่ใช่ Full DAM

### ITA
- ITA เป็น Structured Yearly Evidence Directory
- โครงสร้างหลักคือ Fiscal Year → MOIT / Section → Requirement / Item → Evidence
- PDF / Document เป็น Evidence หลักของ Version 1
- รองรับ External URL เมื่อจำเป็น
- MOIT และ Requirement Configurable ตามแต่ละปี
- ไม่ Hard-code เกณฑ์ของปีใดปีหนึ่ง
- ITA ปีย้อนหลังยังเปิดดูได้
- Reuse Document เมื่อเหมาะสม แต่ UX ต้องไม่ซับซ้อน
- สามารถ Upload PDF จากหน้า ITA แล้วให้ระบบสร้าง Document Resource เบื้องหลัง
- ไม่ผูก ITA แบบ Dynamic กับ Personnel / Organization / Service ใน Version 1
- Historical Accuracy รักษาผ่าน Evidence ของปีนั้นเป็นหลัก
- Preserve history; improve forward
- ITA Model ไม่ใช่ Compliance Workflow / Scoring Engine

---

## 22. Pending Decisions

รายละเอียดต่อไปนี้ยังไม่จำเป็นต้อง Freeze ในระดับ Content Model Foundation และจะกำหนดในขั้นที่เหมาะสม:

- Final Taxonomy Set
- Final Service Category Set
- Final Audience Taxonomy
- Final Health Service Type List
- Area Master Detail / Village Structure
- Document Type Final List
- Media Type Final List
- Detailed Status Rules ต่อ Content Type

---

## 23. Scope Boundary

เอกสารนี้ไม่กำหนด:
- Database Tables
- SQL Types
- Foreign Keys
- API Contracts
- ORM
- Framework
- Code Structure
- Deployment
- UI Components
- Detailed Permission Matrix
- Storage Architecture

---

## 24. Next Step

Content Model ถูก Freeze เป็น **Content Model Baseline v1.0**

ขั้นตอนถัดไป:

1. ใช้ Content Model Baseline v1.0 เป็นข้อกำหนดสำหรับ Sitemap
2. เริ่ม `03-sitemap.md`
3. ไม่สร้าง Page หรือ Route ที่ทำให้เกิด Content Type ซ้ำกับ Model ที่ Freeze ไว้ เว้นแต่มี Requirement ใหม่ที่ชัดเจนและผ่านการทบทวนผลกระทบ

## 25. Content Model Foundation Statement

ระบบเว็บไซต์ใหม่ต้องไม่กลับไปสู่รูปแบบที่ทุกอย่างเป็น Post ทุกหน้ามีข้อมูลของตัวเอง และทุก Module Upload ไฟล์ของตัวเอง

แต่ต้องเป็น:

> **Structured Content + Shared Master Data + Explicit Relationships**

หลักสำคัญ:

> **Create once, manage once, publish everywhere.**

> **Reuse before duplication.**

> **Structured enough to be reliable, simple enough to be maintainable.**

> **No content model should become an isolated island.**

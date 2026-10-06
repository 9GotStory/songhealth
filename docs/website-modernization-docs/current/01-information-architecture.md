# Information Architecture — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 01-information-architecture
> **Status:** CLEAN REBASELINE v2.0 — CURRENT
> **Version:** 2.0
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md`
> **Purpose:** กำหนดโครงสร้างสารสนเทศ ความสัมพันธ์ของข้อมูล และแนวทางการจัดกลุ่มข้อมูลของเว็บไซต์สำนักงานรุ่นใหม่ โดยยังไม่ลงรายละเอียดระดับ Content Schema, Sitemap ฉบับ Final, UI หรือโค้ด
> **Clean Rebaseline Rule:** เอกสารใน `current/` ต้องอธิบายคำตอบปัจจุบันเพียงชุดเดียว; ประวัติ implementation/architecture เก่าเก็บใน Git history/archival branch และไม่ใช้เป็น authority ของระบบใหม่
> **Technology Ownership:** Information Architecture is implementation-neutral.

---

## 1. Purpose

เอกสารฉบับนี้กำหนด Information Architecture (IA) ของเว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

เป้าหมายคือทำให้ข้อมูลทั้งหมดของเว็บไซต์:

- มีโครงสร้างที่ชัดเจน
- ค้นหาได้ง่าย
- ใช้คำที่ประชาชนเข้าใจ
- ไม่สร้างข้อมูลซ้ำโดยไม่จำเป็น
- เชื่อมโยงกันได้
- รองรับการนำข้อมูลเดียวกันไปใช้หลายบริบท
- รองรับการพัฒนาเว็บไซต์และระบบข้อมูลต่อในอนาคต
- ไม่ผูกโครงสร้างเว็บไซต์กับข้อจำกัดของ WordPress เดิม

IA ในเอกสารนี้เน้นคำถามว่า:

> **ข้อมูลอะไรควรมี อยู่ใน Domain ใด และสัมพันธ์กับข้อมูลอื่นอย่างไร**

ไม่ใช่คำถามว่า:

> **หน้าเว็บต้องวาง Layout อย่างไร หรือใช้เทคโนโลยีอะไร**

---

## 2. IA Core Principles

Information Architecture ต้องสอดคล้องกับหลักใน `00-website-foundation.md`

หลักที่มีผลโดยตรงต่อ IA ได้แก่:

### 2.1 Citizen First

โครงสร้างข้อมูลและ Navigation ต้องเริ่มจากสิ่งที่ผู้ใช้ต้องการหา ไม่ใช่จากโครงสร้างกลุ่มงานภายในของสำนักงานเพียงอย่างเดียว

### 2.2 Single Source of Truth

ข้อมูลหนึ่งชุดต้องมีแหล่งข้อมูลหลักเพียงแห่งเดียว และสามารถถูกนำไปใช้ในหลายบริบทได้

> **Create once, manage once, publish everywhere.**

### 2.3 Structured Content

ข่าว กิจกรรม ประกาศ เอกสาร บุคลากร หน่วยบริการ บริการประชาชน และข้อมูลสุขภาพต้องถูกมองเป็นข้อมูลคนละประเภทตามธรรมชาติของข้อมูล

### 2.4 Content ≠ Presentation

ข้อมูลและตำแหน่งที่นำไปแสดงต้องแยกออกจากกัน

ตัวอย่าง:

- ข่าว คือ Content
- “เรื่องเด่นหน้าแรก” คือ Presentation

### 2.5 Public IA ≠ Admin IA

โครงสร้างเมนูของเว็บไซต์ประชาชนและโครงสร้างเมนูของ Admin CMS ไม่จำเป็นต้องเหมือนกัน

Public Website ตอบคำถาม:

> ผู้ใช้ต้องการหาอะไร

Admin CMS ตอบคำถาม:

> เจ้าหน้าที่ต้องจัดการอะไร

### 2.6 Reuse Before Duplication

ก่อนสร้างข้อมูลใหม่ ต้องพิจารณาก่อนว่าข้อมูลนั้นมีอยู่ในระบบแล้วหรือไม่ และสามารถเชื่อมมาใช้ได้หรือไม่

การ Reuse ต้องไม่ทำให้ Workflow ของเจ้าหน้าที่ซับซ้อนเกินประโยชน์ที่ได้รับ

> **Reuse when practical; don't make reuse harder than the work itself.**

### 2.7 CMS Content ≠ Analytical Data

ข้อมูลเชิงเนื้อหาและข้อมูลเชิงวิเคราะห์เป็นคนละ Data Domain

- Health Content และ Health Report อยู่ใน CMS
- Dashboard / Analytical Metrics อยู่ใน Data Platform แยก
- Dashboard สามารถแสดงอยู่ภายใต้ `/dashboard` ของเว็บไซต์ได้โดยไม่ต้องเป็น Content Type ใน CMS

Public IA สามารถเชื่อมประสบการณ์ของผู้ใช้ระหว่างสองส่วนได้ แต่ไม่ควรบังคับให้ใช้ Data Model หรือ Database เดียวกัน

### 2.8 Complexity Must Be Earned

ไม่สร้าง Domain, Content Type, Category หรือ Workflow ใหม่ หากสามารถแก้ปัญหาได้ด้วยโครงสร้างเดิมอย่างเหมาะสม

---

## 3. Information Domains

IA ระดับบนของเว็บไซต์แบ่งออกเป็น 8 Information Domains

```text
สำนักงานสาธารณสุขอำเภอสอง
│
├── 1. เกี่ยวกับเรา
├── 2. ข่าวสารและการสื่อสาร
├── 3. บริการประชาชน
├── 4. หน่วยบริการสุขภาพที่เกี่ยวข้อง
├── 5. ข้อมูลสุขภาพ
├── 6. เอกสารและข้อมูลเผยแพร่
├── 7. ITA / คุณธรรมและความโปร่งใส
└── 8. ติดต่อและช่องทางดิจิทัล
```

Domain เหล่านี้เป็นโครงสร้างเชิงข้อมูล

**ไม่จำเป็นต้องกลายเป็น Main Navigation แบบหนึ่งต่อหนึ่ง**

Main Navigation จะพิจารณาอีกครั้งในขั้นตอน Sitemap และ Navigation Design

---

# 4. Domain 1 — เกี่ยวกับเรา

Domain นี้ตอบคำถามว่า:

> สำนักงานคือใคร มีหน้าที่อะไร มีโครงสร้างอย่างไร และดำเนินงานไปในทิศทางใด

โครงสร้างเบื้องต้น:

```text
เกี่ยวกับเรา
│
├── ข้อมูลสำนักงาน
│   ├── ประวัติและความเป็นมา
│   ├── วิสัยทัศน์
│   ├── พันธกิจ
│   ├── ค่านิยม
│   ├── บทบาทหน้าที่และอำนาจ
│   └── พื้นที่รับผิดชอบ
│
├── โครงสร้างองค์กร
├── ผู้บริหาร
├── บุคลากร
├── นโยบาย
├── ยุทธศาสตร์
├── แผนปฏิบัติราชการ / แผนงาน
└── ผลการดำเนินงาน
```

### 4.1 Personnel Reuse

“ผู้บริหาร” และ “บุคลากร” ไม่ควรเป็นข้อมูลคนละชุด

ควรมี Personnel Data กลาง และนำมาแสดงตามบริบท

```text
Personnel
   │
   ├── ผู้บริหาร
   ├── บุคลากรทั้งหมด
   └── กลุ่มงาน / บทบาท
```

### 4.2 Plans and Reports Reuse

แผนงาน รายงาน และเอกสารทางราชการควรเก็บใน Document Center แล้วเชื่อมมาแสดงใน “เกี่ยวกับเรา”

```text
Document Center
      │
      └── แผนปฏิบัติการประจำปี
                 │
                 ├── เกี่ยวกับเรา / แผนงาน
                 └── ITA / Evidence
```

ไม่ควรอัปโหลดไฟล์เดียวกันซ้ำหลายพื้นที่

---

# 5. Domain 2 — ข่าวสารและการสื่อสาร

Domain นี้ใช้สำหรับข้อมูลที่มีลักษณะเป็นการสื่อสารกับประชาชนหรือเครือข่าย

โครงสร้างเบื้องต้น:

```text
ข่าวสารและการสื่อสาร
│
├── ข่าวประชาสัมพันธ์
├── กิจกรรมสำนักงาน
├── ข่าวสุขภาพ (News View / Filter)
├── ประกาศ
│   ├── ประกาศทั่วไป
│   ├── รับสมัครงาน
│   ├── จัดซื้อจัดจ้าง
│   └── ประกาศทางราชการ
└── ข่าวจากเครือข่าย
```

### 5.1 News Source

“ข่าวจากเครือข่าย” ไม่จำเป็นต้องเป็น Content Type ใหม่

ควรใช้ข้อมูลแหล่งที่มา เช่น:

```text
Source
├── สสอ.สอง
├── โรงพยาบาลสอง
├── รพ.สต.
├── สสจ.แพร่
├── อบจ.แพร่
└── หน่วยงานอื่น
```

จากนั้นระบบสามารถ Filter หรือสร้างมุมมอง “ข่าวจากเครือข่าย” ได้

### 5.2 Activity Is Not News

กิจกรรมควรถูกแยกจากข่าวประชาสัมพันธ์ เนื่องจากมีข้อมูลเฉพาะ เช่น:

- วันที่
- สถานที่
- ผู้เข้าร่วม
- ภาพกิจกรรม
- หน่วยงานที่เกี่ยวข้อง

แต่กิจกรรมยังสามารถถูกนำไปแสดงร่วมในหน้า “ข่าวสาร” ได้

### 5.3 Health News View vs Health Content

คำว่า “ข่าวสุขภาพ” ใน Public IA เป็นมุมมองของ `News` ที่สัมพันธ์กับ Health Topic ไม่ใช่ Content Type แยก

```text
ข่าวหรือเหตุการณ์สุขภาพปัจจุบัน
→ News + Health Topic

ความรู้สุขภาพที่ใช้ได้ระยะยาว
→ Health Content
```

แนวทางนี้ป้องกันการสร้าง News และ Health Content ซ้ำจากเรื่องเดียวกัน

---

# 6. Domain 3 — บริการประชาชน

บริการประชาชนต้องถูกออกแบบในรูปแบบ **Service Directory** ไม่ใช่หน้ารวมลิงก์

คำถามหลักคือ:

> ผู้ใช้ต้องการทำอะไร

ไม่ใช่:

> สำนักงานมีกลุ่มงานอะไร

---

## 6.1 Service Ownership

แต่ละ Service ควรถูกจำแนกตามเจ้าของกระบวนงานอย่างน้อย 4 ประเภท

### Direct Service

สสอ.สองรับคำขอและดำเนินการเอง

### Coordinated Service

สสอ.สองรับเรื่องหรือประสาน แต่มีหน่วยงานอื่นร่วมดำเนินการ

### Related Health Service

โรงพยาบาล รพ.สต. หรือหน่วยบริการสุขภาพเป็นผู้ให้บริการจริง

### External Digital Service

เป็นบริการของกระทรวงหรือหน่วยงานภายนอกที่เว็บไซต์ช่วยเชื่อมต่อ

---

## 6.2 Service Channel

Citizen Service ไม่จำเป็นต้องเป็น Online Service

แต่ละบริการควรสามารถระบุช่องทาง เช่น:

- Online
- In-person
- Paper-based
- Telephone
- Hybrid
- External Online Service

> **Citizen Service ≠ Online Service**

> **Technology should support the workflow, not distort it.**

---

## 6.3 Service Catalog, Resources and Discovery

พื้นที่ “บริการประชาชน” ใน Public IA สามารถรวมสิ่งที่ประชาชนต้องใช้ไว้ด้วยกัน แต่ภายในต้องแยกความหมายของข้อมูลให้ถูกต้อง

```text
บริการประชาชน
│
├── Service Catalog
│   ├── ร้องเรียน / เสนอแนะ
│   │   ├── ร้องเรียนการปฏิบัติงานหรือการให้บริการ
│   │   ├── ร้องเรียนการทุจริตและประพฤติมิชอบ
│   │   ├── แสดงความคิดเห็น / ข้อเสนอแนะ
│   │   └── สอบถามข้อมูลทั่วไป
│   │
│   ├── แจ้งปัญหาด้านสุขภาพ
│   │   ├── ปัญหาด้านสุขภาพ
│   │   ├── สิ่งแวดล้อมที่กระทบสุขภาพ
│   │   └── ผลิตภัณฑ์สุขภาพ
│   │
│   ├── ขอข้อมูล / เอกสารจากสำนักงาน
│   ├── บริการสำหรับ อสม.
│   └── บริการออนไลน์ที่เกี่ยวข้อง
│
├── คู่มือ / แบบฟอร์ม
│   └── Document Resources
│
└── ค้นหาหน่วยบริการสุขภาพ
    └── Health Service Directory
```

ดังนั้น “คู่มือ”, “แบบฟอร์ม” และ “ค้นหาหน่วยบริการ” ไม่ควรถูกสร้างเป็น Service Entity เพียงเพื่อให้ปรากฏในพื้นที่บริการประชาชน

รายการ Service เฉพาะด้านอื่นยังสามารถสำรวจและเพิ่มเมื่อมี Workflow จริงรองรับ

---

## 6.4 ขอข้อมูล / เอกสารจากสำนักงาน

การขอข้อมูลหรือเอกสารจากสำนักงานอย่างเป็นทางการเป็นบริการที่ผู้ขอต้องมาติดต่อสำนักงานโดยตรงใน Version 1

เว็บไซต์ไม่ควรพัฒนาเป็นระบบ:

- ยื่นคำขอออนไลน์
- Upload เอกสารคำขอ
- Workflow อนุมัติคำขอ
- ติดตามคำขอแบบ Transactional

บทบาทของเว็บไซต์ควรจำกัดอยู่ที่:

- อธิบายขั้นตอน
- ระบุสถานที่ติดต่อ
- ระบุวันและเวลาทำการ
- ระบุสิ่งที่ควรเตรียม หากมี
- ระบุช่องทางสอบถามเบื้องต้น

แนวทางนี้ช่วยควบคุม Scope ของเว็บไซต์ และหลีกเลี่ยงการขยายไปเป็นระบบรับคำขอราชการเต็มรูปแบบก่อนมีความจำเป็นจริง

---

## 6.5 Confirmed Offline Example — สิทธิการรักษาพยาบาลของ อสม.

การยืนยันสิทธิการรักษาพยาบาลของ อสม. เป็นตัวอย่างบริการที่ไม่ควรถูกเปลี่ยนเป็น Online Transaction

กระบวนงานจริงต้องใช้:

- เอกสารจากโรงพยาบาลหรือ รพ.สต.
- การตรวจสอบ
- การลงนามจริงจากผู้เกี่ยวข้อง
- กระบวนการเอกสารตามขั้นตอนราชการ

ดังนั้นเว็บไซต์ควรทำหน้าที่เพียง:

- อธิบายสิทธิ
- แสดงเงื่อนไข
- แสดงเอกสารที่ต้องเตรียม
- อธิบายขั้นตอน
- ระบุสถานที่ติดต่อ
- ระบุช่องทางสอบถาม
- ให้ดาวน์โหลดแบบฟอร์ม หากมี

และไม่ควรสร้าง Online Approval Workflow ใน Version 1

---

## 6.6 Health Service Routing

บริการรักษาพยาบาล เช่น:

- ตรวจรักษา
- วัคซีน
- ฝากครรภ์
- NCD Clinic
- ทันตกรรม
- Telemedicine
- รับยา

ไม่ควรถูกนำเสนอว่าเป็น Direct Service ของ สสอ.สอง หากผู้ให้บริการจริงคือโรงพยาบาลหรือ รพ.สต.

Flow ควรเป็น:

```text
ประชาชน
   ↓
บริการประชาชน
   ↓
ต้องการรับบริการสุขภาพ
   ↓
ค้นหาหน่วยบริการที่ให้บริการ
   ↓
Health Service Directory
```

---

# 7. Domain 4 — หน่วยบริการสุขภาพที่เกี่ยวข้อง

ใช้คำว่า:

> **หน่วยบริการสุขภาพที่เกี่ยวข้อง**

แทน “หน่วยบริการในพื้นที่”

เพื่อไม่สร้างความเข้าใจผิดเรื่องสังกัด

โครงสร้างเบื้องต้น:

```text
หน่วยบริการสุขภาพที่เกี่ยวข้อง
│
├── โรงพยาบาล
├── โรงพยาบาลส่งเสริมสุขภาพตำบล
├── สถานบริการสาธารณสุขชุมชน
└── หน่วยบริการ / เครือข่ายอื่น
```

ข้อมูลทุกแห่งควรอยู่ใน Health Service Directory ชุดเดียว

ข้อมูลพื้นฐานที่ควรมีในระดับ IA เช่น:

- ชื่อหน่วยบริการ
- ประเภท
- สังกัด
- ที่ตั้ง
- พื้นที่
- ช่องทางติดต่อ
- เวลาทำการ
- บริการสำคัญ
- สถานะ
- Location / Map

รายละเอียด Field จะกำหนดใน `02-content-model.md`

---

## 7.1 Affiliation

สังกัดต้องเป็นข้อมูลของหน่วยบริการ ไม่ใช่โครงสร้างเมนูหลัก

ตัวอย่าง:

```text
โรงพยาบาลสอง
สังกัด: กระทรวงสาธารณสุข

รพ.สต. ...
สังกัด: องค์การบริหารส่วนจังหวัดแพร่
```

---

## 7.2 Relationships

หน่วยบริการสามารถสัมพันธ์กับข้อมูลอื่นได้ เช่น:

```text
Health Service
   │
   ├── Services
   ├── News
   ├── Activities
   ├── Documents
   └── Contact
```

จึงไม่ควรต้อง Copy ข่าวหรือเอกสารไปสร้างใหม่ใน Profile ของหน่วยบริการ

---

# 8. Domain 5 — ข้อมูลสุขภาพ

ข้อมูลสุขภาพสำหรับผู้ใช้สาธารณะมี 3 รูปแบบการเข้าถึง แต่มีเพียง 2 รูปแบบแรกที่เป็น CMS Content

```text
ข้อมูลสุขภาพ
│
├── 1. Health Content
├── 2. Health Reports
└── 3. Dashboard
```

---

## 8.1 Health Content

เป็นเนื้อหาความรู้และการสื่อสารด้านสุขภาพ เช่น:

- โรคและภัยสุขภาพ
- NCD
- สุขภาพผู้สูงอายุ
- แม่และเด็ก
- ส่งเสริมสุขภาพ
- ควบคุมโรค
- อนามัยสิ่งแวดล้อม
- คุ้มครองผู้บริโภคด้านสุขภาพ

Health Content เป็น Structured Content ใน CMS และควรรองรับการทบทวนเนื้อหาตามความเหมาะสม

---

## 8.2 Health Reports

ใช้สำหรับรายงานสุขภาพหรือรายงานสถานการณ์ เช่น:

- รายงานสถานการณ์โรค
- รายงานผลการดำเนินงาน
- รายงานประจำปี
- รายงานข้อมูลสุขภาพพื้นที่

แนวทาง Version 1:

```text
Health Report
├── Metadata สำหรับค้นหา / จัดหมวด
└── Report Document → PDF / Document Resource
```

Health Report ไม่ต้องแตกตัวเลข ตาราง หรือกราฟภายใน PDF มาเป็น Health Metrics ใน CMS

ไฟล์จริงอยู่ใน Document Center / Document Resource กลาง และ Health Report เชื่อมไปยังไฟล์นั้น

---

## 8.3 Dashboard

Dashboard เป็น Public Data Module สำหรับข้อมูลเชิงตัวเลข แนวโน้ม KPI และ Visualization แต่ **ไม่ใช่ CMS Content Type**

แนวทางเชิง IA:

```text
ข้อมูลสุขภาพ
   └── Dashboard
         └── /dashboard
```

แนวทาง Data Responsibility:

```text
Dashboard Database
        ↓
   Dashboard API
        ↓
   /dashboard UI
```

หลักสำคัญ:

- CMS Database และ Dashboard Database แยกกัน
- Dashboard ไม่ใช้ Health Report หรือ PDF เป็นแหล่ง Metric
- Health Metric ไม่เป็น CMS Content Type ใน Version 1
- Public Website สามารถเชื่อมจาก Health Content หรือ Health Reports ไปยัง Dashboard ที่เกี่ยวข้องผ่าน Navigation/Link ได้ตามความเหมาะสม
- ตำแหน่ง Dashboard ใน Main Navigation จะพิจารณาใน Sitemap / Navigation Design ภายหลัง

---

# 9. Domain 6 — เอกสารและข้อมูลเผยแพร่

Document Center เป็นคลังเอกสารกลางของระบบ

โครงสร้างเบื้องต้น:

```text
เอกสารและข้อมูลเผยแพร่
│
├── แบบฟอร์ม
├── คู่มือ / แนวทาง
├── แผนงาน
├── รายงาน
├── เอกสารประชุม
├── เอกสารเผยแพร่
└── เอกสารอื่นตามบริบท
```

---

## 9.1 Documents Are Reusable Resources

เอกสารหนึ่งไฟล์สามารถถูกใช้ในหลายบริบท เช่น:

```text
Document
   │
   ├── Document Center
   ├── ข่าว / เอกสารแนบ
   ├── ประกาศ / เอกสารแนบ
   ├── เกี่ยวกับเรา / แผนงาน
   ├── Health Reports
   └── ITA Evidence
```

ไม่ควร Upload ไฟล์เดียวกันหลายชุด

---

## 9.2 Announcement vs Document

ประกาศและเอกสารไม่ใช่สิ่งเดียวกัน

ตัวอย่าง:

```text
Announcement
   │
   └── Attachments
           │
           ▼
        Documents
```

Announcement เป็น Content สำหรับการเผยแพร่

Document เป็น Resource ที่สามารถแนบหรือถูกเรียกใช้ในหลายบริบท

---

# 10. Domain 7 — ITA / คุณธรรมและความโปร่งใส

ITA เป็น Domain สำคัญของเว็บไซต์ และควรออกแบบให้ **เรียบง่ายสำหรับเจ้าหน้าที่ แต่ Structured และปรับได้ตามเกณฑ์ของแต่ละปี**

> **ITA = Structured Yearly Evidence Directory.**

---

## 10.1 Fiscal Year Structure

Fiscal Year เป็น Root ของ ITA

```text
ITA
│
├── 2570
├── 2569
├── 2568
└── ...
```

แต่ละปีมีโครงสร้างของตนเองเพื่อรองรับการเปลี่ยนแปลงของเกณฑ์โดยไม่กระทบข้อมูลย้อนหลัง

---

## 10.2 Yearly Structure

โครงสร้างหลัก:

```text
Fiscal Year
    ↓
MOIT / Section
    ↓
Requirement / Item
    ↓
Evidence
```

MOIT / Section และ Requirement / Item ต้องเป็นข้อมูลที่ Configurable ตามปี ไม่ Hard-code จำนวนหรือรายละเอียดของปีใดปีหนึ่งไว้ในระบบ

---

## 10.3 Evidence

Evidence ใน Version 1 รองรับหลัก:

```text
Evidence
├── PDF / Document
├── Media (รูปภาพ / screenshot / visual evidence)
└── External URL (optional)
```

PDF / Document ยังคงเป็น Evidence หลักตาม Workflow จริงของงาน ITA และรองรับ Media เมื่อรูปภาพ, screenshot หรือ visual evidence เป็นหลักฐานจริง

ITA ไม่จำเป็นต้องผูกแบบ Dynamic โดยตรงกับ Personnel, Organization, News หรือ Service เพื่อสร้างหลักฐานใน Version 1

---

## 10.4 Document Integration

Document ยังคงเป็น Resource กลางของระบบ แต่ UX หลังบ้านต้องไม่บังคับให้เจ้าหน้าที่ทำขั้นตอนหลายหน้าจอเพื่อรักษา Single Source of Truth

หน้า ITA ควรรองรับ:

```text
เพิ่มหลักฐาน

○ อัปโหลด PDF ใหม่
○ เลือกเอกสารที่มีอยู่
○ อัปโหลด / เลือก Media ที่เป็นหลักฐานจริง
○ เพิ่มลิงก์ภายนอก
```

หากอัปโหลด PDF หรือ Media ใหม่ ระบบสามารถสร้าง Shared Document / Media Resource ที่เหมาะสมและเชื่อม Evidence ให้อัตโนมัติ

> **Architecture can be structured without making the workflow complicated.**

---

## 10.5 Historical ITA

ประวัติของแต่ละปีรักษาผ่าน Evidence ของปีนั้นเป็นหลัก

```text
ITA 2569 → Evidence ของปี 2569
ITA 2570 → Evidence ของปี 2570
```

ไม่จำเป็นต้องสร้าง Full Snapshot Engine หรือ Dynamic Historical Binding กับ Master Data ใน Version 1

สำหรับข้อมูลเก่าใช้หลัก:

> **Preserve history; improve forward.**

---

## 10.6 ITA Reuse Principle

Document ที่มีอยู่แล้วสามารถนำกลับมาใช้เป็น ITA Evidence ได้เมื่อเหมาะสม แต่ไม่ควรบังคับการ Reuse จน Workflow ยุ่งยากกว่าการทำงานจริง

> **Reuse when practical; don't make reuse harder than the work itself.**

---

# 11. Domain 8 — ติดต่อและช่องทางดิจิทัล

ข้อมูลติดต่อควรเป็น Structured Information ไม่ใช่ข้อความที่ Copy ไว้หลายหน้า

โครงสร้างเบื้องต้น:

```text
ติดต่อเรา
│
├── สำนักงานสาธารณสุขอำเภอสอง
│   ├── ที่อยู่
│   ├── โทรศัพท์
│   ├── อีเมล
│   ├── เวลาทำการ
│   └── แผนที่
│
├── ช่องทาง Social / Digital
├── ช่องทางร้องเรียน
└── หน่วยงานที่เกี่ยวข้อง
```

หากข้อมูล เช่น เบอร์โทรศัพท์ เปลี่ยน ควรแก้จากแหล่งข้อมูลกลางเพียงครั้งเดียว

---

# 12. Classification & Shared Dimensions

ระบบใช้ทั้ง Taxonomy และ Shared Master Data เพื่อช่วยจัดกลุ่ม ค้นหา และเชื่อมข้อมูล โดยไม่ควรเหมารวมทุกอย่างเป็น Tag

---

## 12.1 Topic / Category — Taxonomy

ตัวอย่าง:

- ส่งเสริมสุขภาพ
- ควบคุมโรค
- NCD
- อนามัยสิ่งแวดล้อม
- คุ้มครองผู้บริโภค
- สุขภาพดิจิทัล
- บริหารงาน

Topic / Category ใช้เพื่อการจัดกลุ่มและ Filter และไม่ควรเพิ่มจำนวนมากเกิน Use Case จริง

---

## 12.2 Audience — Taxonomy

ตัวอย่าง:

- ประชาชนทั่วไป
- อสม.
- ผู้สูงอายุ
- เด็ก
- หญิงตั้งครรภ์
- เจ้าหน้าที่
- ผู้ประกอบการ
- เครือข่ายสุขภาพ

---

## 12.3 Area — Master Data

Area ไม่ใช่ Free-form Taxonomy แต่เป็น Shared Master Data ที่มีโครงสร้างเชิงพื้นที่

```text
Province
  ↓
District
  ↓
Subdistrict
  ↓
Village
```

CMS ใช้ Area Master ชุดเดียวกับ:

- News → Related Area
- Activity → Activity Area
- Health Service → Service Area

Dashboard / Data Platform มี Geographic Dimension ของตนเอง และเชื่อมเชิงความหมายด้วยรหัสพื้นที่มาตรฐานร่วมกัน ไม่ใช้ตาราง CMS โดยตรง

---

## 12.4 Organization / Source — Relationship / Master Data

Organization / Source ควรอ้างอิง Organization Master เมื่อเป็นหน่วยงานที่ใช้ซ้ำ เช่น:

- สสอ.สอง
- โรงพยาบาลสอง
- สสจ.แพร่
- อบจ.แพร่
- หน่วยบริการที่เกี่ยวข้อง

กรณีแหล่งข้อมูลที่เกิดขึ้นครั้งเดียวและไม่มีประโยชน์ต่อการ Reuse สามารถใช้ Source Text ตามบริบทได้ เพื่อไม่ให้ Master Data โตโดยไม่จำเป็น

---

## 12.5 Classification Principle

Classification หรือ Master Data ใหม่ควรถูกเพิ่มเมื่อ:

- ช่วย Search
- ช่วย Filter
- ช่วยสร้างมุมมองที่มีประโยชน์
- ช่วยเชื่อมข้อมูลที่มีการใช้ซ้ำ
- มีการใช้งานจริง

ไม่ควรสร้างเพียงเพราะสามารถสร้างได้

> **Use taxonomy for classification; use master data for real reusable entities.**

---

# 13. Content Relationships

ระบบใหม่ต้องให้ความสำคัญกับความสัมพันธ์ของข้อมูลมากกว่าการสร้าง Page แบบแยกส่วน แต่ Relationship ต้องเกิดจาก Use Case จริงและไม่เพิ่มความซับซ้อนโดยไม่จำเป็น

ตัวอย่าง:

```text
Personnel
   └── About / บุคลากร / ผู้บริหาร

Document
   ├── Document Center
   ├── About / แผนงาน
   ├── Health Reports
   └── ITA Evidence

News / Activity
   ├── News & Communication
   ├── Homepage
   └── Health Service Profile

Health Service
   ├── Health Service Directory
   ├── Citizen Services
   └── Related Content

Service
   ├── Citizen Services
   ├── Homepage Quick Service
   └── Search

ITA
   └── Evidence
       ├── Document / PDF
       ├── Media
       └── External URL
```

Dashboard เป็น Data Domain แยก จึงไม่ต้องสร้าง Relationship เชิง Content กับ Health Report/Health Metric เพื่อป้อนข้อมูลให้ Dashboard

หลักการ:

> **ไม่มี Content Domain ใดควรเป็นเกาะข้อมูลของตัวเอง แต่ไม่ใช่ทุก Domain ต้องเชื่อมกันโดยตรง**

---

# 14. Homepage as a Curated View

หน้าแรกไม่ควรมี Content Store แยกของตัวเอง

หน้าแรกควรดึงข้อมูลจากระบบกลาง เช่น:

```text
Content Layer
   │
   ├── News
   ├── Activity
   ├── Announcement
   ├── Service
   ├── Health Information
   └── Health Service
          │
          ▼
        Homepage
```

---

## 14.1 Featured Content

“เรื่องเด่น” เป็น Presentation Layer

ข่าว กิจกรรม หรือประกาศที่มีอยู่แล้วสามารถถูกเลือกมาแสดงเป็นเรื่องเด่นได้

```text
News / Activity / Announcement
              │
              ▼
        Featured Content
              │
              ▼
           Homepage
```

ไม่สร้าง Content Type ใหม่ชื่อ “เรื่องเด่น”

---

# 15. Supporting Content — Basic Page

Basic Page เป็น Supporting Content สำหรับหน้าเนื้อหาที่ไม่เข้ากับ Structured Model อื่นอย่างเหมาะสม

ตัวอย่าง:

- Privacy / PDPA page
- Accessibility statement
- เนื้อหาเฉพาะของสำนักงานที่ไม่มี Model อื่นรองรับ

หลัก:

> **Use Basic Page only when no specific structured content model fits.**

Basic Page ไม่ควรใช้แทน News, Activity, Announcement, Service, Personnel, Health Service, Document, Health Report หรือ ITA

---

# 16. Public IA vs Admin CMS IA

Public Website และ Admin CMS ใช้ Information Architecture คนละมุมมอง

---

## 16.1 Public Website

Draft IA:

```text
หน้าหลัก

เกี่ยวกับเรา

ข่าวสาร

บริการประชาชน

หน่วยบริการสุขภาพ

ข้อมูลสุขภาพ

เอกสาร

ITA

ติดต่อเรา
```

Main Navigation นี้ยัง **ไม่ Freeze**

---

## 16.2 Admin CMS

Draft IA:

```text
Admin Dashboard

เนื้อหา
├── ข่าว
├── กิจกรรม
├── ประกาศ
├── เอกสาร
├── Health Content
├── Health Reports
└── หน้าเว็บไซต์ (Basic Page)

องค์กร
├── บุคลากร
├── หน่วยบริการสุขภาพที่เกี่ยวข้อง
└── ข้อมูลสำนักงาน

บริการประชาชน
└── Service Catalog

ITA
├── ปีงบประมาณ
├── MOIT / Section
├── Requirement / Item
└── Evidence

หน้าแรก
├── เรื่องเด่น
├── บริการที่ใช้บ่อย
└── การจัดลำดับส่วนหน้าแรก

สื่อ

ผู้ใช้งานและสิทธิ์

Audit Log

ตั้งค่าระบบ
```

Dashboard ข้อมูลสุขภาพที่ `/dashboard` เป็น Data Platform แยก ไม่ใช่ Module สำหรับกรอก Health Metrics ใน CMS

โครงสร้าง Admin นี้ยังเป็น Initial Direction

---

# 17. Navigation Direction

Main Navigation ต้อง:

- ใช้คำที่ประชาชนเข้าใจ
- จำกัดจำนวนเมนูระดับบน
- ไม่สะท้อนโครงสร้างฝ่ายงานภายในมากเกินไป
- ไม่สร้างเมนูจากทุก Content Type
- ไม่ใช้ Navigation เป็นพื้นที่วางทุก Link ที่หน่วยงานมี

สิ่งที่ไม่ควรอยู่ Main Navigation โดยไม่มีเหตุผล:

- Login เจ้าหน้าที่
- Admin Dashboard / Dashboard ภายในสำหรับเจ้าหน้าที่
- Facebook / YouTube
- Link ระบบงานจำนวนมาก
- กลุ่มงานภายในทุกกลุ่ม
- Banner
- OIT/ITA รายปีย่อยทั้งหมด
- Category ย่อยจำนวนมาก

รายการเหล่านี้ควรอยู่ใน Context ที่เหมาะสม เช่น Footer, Quick Links, Service Directory หรือ Landing Page

---

# 18. Search and Discoverability

Search ต้องเป็น Cross-Content Search

ในระยะที่เหมาะสมควรค้นได้จาก:

- ข่าว
- กิจกรรม
- ประกาศ
- เอกสาร
- บุคลากร
- หน่วยบริการ
- บริการประชาชน
- ข้อมูลสุขภาพ
- ITA ที่เหมาะสม

Search ควรใช้ Taxonomy และ Relationships ช่วย Filter และค้นหา

ตัวอย่าง:

```text
ค้นหา: "ไข้เลือดออก"

ผลลัพธ์:
- ข่าว
- Health Content
- รายงาน
- เอกสาร
- กิจกรรม
```

ไม่ควรจำกัดอยู่เฉพาะ Post

---

# 19. Information Reuse Examples

ตัวอย่างการใช้ข้อมูลเดียวกันในหลายบริบท

---

## 19.1 แผนปฏิบัติการ

```text
Document: แผนปฏิบัติการประจำปี
        │
        ├── Document Center
        ├── เกี่ยวกับเรา / แผนงาน
        └── ITA Evidence (เมื่อเหมาะสม)
```

---

## 19.2 บุคลากร

```text
Personnel
   ├── เกี่ยวกับเรา / บุคลากร
   └── ผู้บริหาร
```

ITA Version 1 ไม่จำเป็นต้อง Dynamic Bind ไปยัง Personnel โดยตรง หากหลักฐานจริงเป็น PDF ของปีนั้น

---

## 19.3 ข่าวกิจกรรม

```text
Activity
   ├── ข่าวสารและการสื่อสาร
   ├── Homepage
   ├── หน่วยบริการที่เกี่ยวข้อง
   └── Search
```

---

## 19.4 คู่มือ / แบบฟอร์มบริการ

```text
Document
   ├── Document Center
   └── Service Resource
```

หากเอกสารเดียวกันถูกใช้เป็นหลักฐาน ITA สามารถเลือก Document เดิมได้โดยไม่ Upload ซ้ำ

---

## 19.5 Health Report

```text
Health Report Metadata
        │
        └── Report Document (PDF)
                    │
                    └── Document Center
```

Dashboard ไม่ดึง Metric จาก Health Report/PDF แต่ใช้ Dashboard Database + API ของตนเอง

---

# 20. Decision Status

## 20.1 Accepted IA Decisions

แนวทางต่อไปนี้ถือว่าตกลงร่วมกันแล้วในระดับ IA:

- ใช้ 8 Information Domains เป็นโครงสร้างระดับบน
- “เกี่ยวกับเรา” รวมแผนงานและยุทธศาสตร์
- ใช้ Structured Content แทนแนวคิด Post แบบรวมทุกอย่าง
- ข้อมูลบุคลากรมีแหล่งข้อมูลกลาง
- ข่าวจากเครือข่ายใช้ Source/Organization เป็นหลักก่อนสร้าง Content Type ใหม่
- กิจกรรมแยกจากข่าว
- บริการประชาชนเป็น Service Directory
- Service Ownership แยกเป็น Direct, Coordinated, Related Health Service และ External Digital Service
- Citizen Service ไม่เท่ากับ Online Service
- Service Channel ต้องสะท้อน Workflow จริง
- การยืนยันสิทธิการรักษาพยาบาลของ อสม. เป็น Paper-based / In-person
- การขอข้อมูลหรือเอกสารจากสำนักงานอย่างเป็นทางการเป็น In-person Service ใน Version 1 เว็บไซต์ให้ข้อมูลขั้นตอนและช่องทางเท่านั้น
- กลุ่มแจ้งปัญหาด้านสุขภาพ สิ่งแวดล้อมที่กระทบสุขภาพ และผลิตภัณฑ์สุขภาพเป็นส่วนหนึ่งของ Service Directory
- การรักษาพยาบาลไม่ใช่ Direct Service ของ สสอ.สอง
- แบบฟอร์มและคู่มือเป็น Document Resources ที่เชื่อมกับ Service ไม่ใช่ Service แยกโดยตัวมันเอง
- External Online Service แสดงเฉพาะบริการที่เกี่ยวข้องกับผู้ใช้จริง และต้องระบุเจ้าของบริการอย่างชัดเจน
- ใช้คำว่า “หน่วยบริการสุขภาพที่เกี่ยวข้อง”
- หน่วยบริการทุกแห่งอยู่ใน Health Service Directory กลาง
- ข้อมูลสุขภาพสำหรับผู้ใช้ประกอบด้วย Health Content, Health Reports และ Dashboard
- Health Content และ Health Reports เป็น CMS Content ส่วน Dashboard เป็น Data Module แยก
- Health Report ใช้ Metadata + PDF / Document และไม่แตกข้อมูลภายในรายงานเป็น CMS Metrics
- Health Metric ไม่เป็น CMS Content Type ใน Version 1
- Dashboard ใช้ Database แยกจาก CMS และเข้าถึงข้อมูลผ่าน API
- Dashboard สามารถนำเสนอภายใต้ `/dashboard` โดยตำแหน่ง Navigation ยังพิจารณาภายหลัง
- Document Center เป็นแหล่ง Document Resource กลาง
- เอกสารหนึ่งไฟล์สามารถถูกใช้ในหลายบริบท
- ITA เป็น Domain ของตัวเองและแยกตามปีงบประมาณ
- ITA ใช้โครงสร้าง Fiscal Year → MOIT / Section → Requirement / Item → Evidence
- PDF / Document เป็น ITA Evidence หลักใน Version 1, รองรับ Media เมื่อรูปภาพ / screenshot / visual evidence เป็นหลักฐานจริง และ External URL ใช้เมื่อจำเป็น
- MOIT / Requirement ปรับได้ตามแต่ละปีและไม่ Hard-code
- ITA ไม่ Dynamic Bind กับ Personnel / Organization / Service ใน Version 1
- Reuse Document สำหรับ ITA เมื่อเหมาะสม แต่ UX ต้องไม่ซับซ้อน
- ITA ย้อนหลังรักษาผ่าน Evidence ของปีนั้นเป็นหลัก
- หน้าแรกเป็น Curated View
- “เรื่องเด่น” เป็น Presentation ไม่ใช่ Content Type
- Public IA และ Admin IA ไม่จำเป็นต้องเหมือนกัน
- Search ต้องรองรับข้อมูลหลายประเภท
- Topic / Category และ Audience ใช้ Taxonomy ตาม Use Case
- Area เป็น Shared Master Data ไม่ใช่ Free-form Taxonomy
- Organization / Source ใช้ Relationship / Master Data เมื่อมีการ Reuse
- Basic Page ใช้เฉพาะเมื่อไม่มี Structured Content Model ที่เหมาะสมกว่า
- “ข่าวสุขภาพ” เป็น News View / Filter ตาม Health Topic ไม่ใช่ Content Type ใหม่
- คู่มือและแบบฟอร์มเป็น Document Resources ส่วนการค้นหาหน่วยบริการเป็น Health Service Directory / Discovery Function ไม่ใช่ Service Entity โดยตัวมันเอง
- Relationship ต้องเกิดจาก Use Case จริง ไม่จำเป็นต้องเชื่อมทุก Domain เข้าหากันโดยตรง

---

## 20.2 Configurable / Evidence-Driven Data Still Open

IA ownership is settled, while exact operational/reference values may continue to evolve without changing the IA model:
- Service Inventory ของ สสอ.สอง
- Service Ownership และ Service Channel รายบริการ
- กลุ่มบริการ อสม. ที่มีหลักฐานการใช้งานจริง
- Category / Topic / Audience taxonomy values
- Area Master / Village reference values
- Quick Links / Footer composition within canonical route ownership
- exact Search filter presentation within `08-search.md`

การเปลี่ยนค่าเหล่านี้ต้องไม่สร้าง Information Domain, route ownership หรือ Content Type ใหม่โดยปริยาย

---

# 21. Scope Boundary

Information Architecture นี้ไม่กำหนดรายละเอียดต่อไปนี้:

- Database Schema
- API
- ORM
- Framework
- Code Structure
- Deployment
- UI Components
- Visual Design
- Responsive Breakpoints
- Detailed Permission Matrix

หัวข้อเหล่านี้จะอยู่ในเอกสารลำดับถัดไปตามความเหมาะสม

---

# 22. Relationship to the Current Document Set

เอกสารนี้เป็นฐานร่วมกับเอกสารต่อไปนี้ใน `current/`:

```text
00-website-foundation.md
          │
          ▼
01-information-architecture.md
          │
          ├────────► 02-content-model.md
          │
          ├────────► 03-sitemap.md
          │
          ├────────► 04-homepage.md
          │
          ├────────► 05-admin-cms.md
          │
          └────────► 08-search.md
```

`02-content-model.md` จะตอบว่า:

> แต่ละ Content Type ต้องมีข้อมูลอะไรบ้าง

`03-sitemap.md` จะตอบว่า:

> เว็บไซต์ต้องมีหน้าอะไร และแต่ละหน้าอยู่ตรงไหน

ดังนั้น IA ไม่ควรลงรายละเอียดจนทำหน้าที่แทนเอกสารทั้งสอง

---

# 23. Clean Rebaseline Status

Information Architecture ผ่าน Clean Rebaseline v2.0 โดยยังคงหลัก Citizen First, explicit information ownership, reusable structured information และ separation ระหว่าง public navigation กับ underlying data model

Main Navigation, route ownership, Homepage, Admin CMS และ Search ถูกกำหนดต่อใน `03`, `04`, `05` และ `08` ตามลำดับ; ไม่มี historical phase state ใดมี precedence เหนือเอกสาร current เหล่านั้น

# 24. IA Foundation Statement

Information Architecture ของเว็บไซต์สำนักงานรุ่นใหม่ต้องไม่สร้างระบบแบบ:

> **แต่ละหน้าเก็บข้อมูลของตัวเอง**

แต่ต้องสร้างระบบแบบ:

> **ข้อมูลมีแหล่งข้อมูลกลาง แล้วถูกเชื่อมไปใช้ตามบริบท**

เป้าหมายคือให้เว็บไซต์สามารถเติบโตจากเว็บไซต์ประชาสัมพันธ์ไปสู่ Digital Public Portal โดยไม่สูญเสียความเรียบง่ายในการดูแล

หลักสำคัญ:

> **Structured information, connected by relationships.**

> **Reuse before duplication.**

> **Create once, manage once, publish everywhere.**

และ:

> **No information domain should become an isolated island.**

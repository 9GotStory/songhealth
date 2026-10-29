# Website Foundation — สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 00-website-foundation
> **Status:** CLEAN REBASELINE v2.3 — CURRENT native-first V1
> **Version:** 2.3
> **Last Updated:** 14 ตุลาคม 2569 (2026-10-14)
> **Purpose:** เอกสารหลักสำหรับบันทึกหลักการ ขอบเขต และ Architecture Decisions ระดับ Foundation ที่เอกสาร Information Architecture, Content Model, Sitemap, CMS และ System Blueprint ต้องยึดร่วมกัน
> **Clean Rebaseline Rule:** เอกสารใน `current/` ต้องอธิบายคำตอบปัจจุบันเพียงชุดเดียว; ประวัติ implementation/architecture เก่าเก็บใน Git history/archival branch และไม่ใช้เป็น authority ของระบบใหม่
> **Technology Ownership:** `00–09` define Product/behavior requirements; technology/runtime decisions belong to `10-system-blueprint.md`.


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers structured ITA historical-evidence
> management and unavailable Q3/Q4 enforcement from V1. Ordinary native content/Document/Media,
> publication, permissions and supported validation remain on EmDash 1.1.0. The reduced V1 scope is reflected in the reviewed Feature 002 Plan; deferral is not implementation or PASS. No upstream
> change, new subsystem, replacement ITA workflow or production action is authorized.

---

## 1. Project Context

สำนักงานสาธารณสุขอำเภอสองมีแผนปรับปรุงเว็บไซต์สำนักงานจากระบบเดิมที่พัฒนาด้วย WordPress ไปสู่เว็บไซต์รุ่นใหม่ที่ออกแบบให้เหมาะกับบริบทการใช้งานของสำนักงานในระยะยาว

โครงการนี้ **ไม่ใช่การแปลงระบบ WordPress เดิมแบบตรงตัว** และไม่ใช่การนำโครงสร้าง เมนู ข้อจำกัด หรือ technical debt ของระบบเดิมมาสร้างซ้ำในระบบใหม่

เป้าหมายคือการออกแบบเว็บไซต์และระบบจัดการเนื้อหาใหม่จากพื้นฐาน โดยพิจารณาจาก:

- ความต้องการของประชาชนและผู้ใช้งานจริง
- รูปแบบการทำงานของสำนักงาน
- ความสะดวกของเจ้าหน้าที่ผู้ดูแลเว็บไซต์
- โครงสร้างข้อมูลที่ชัดเจน
- ความมั่นคงปลอดภัยและการตรวจสอบย้อนหลัง
- ความสามารถในการดูแลและพัฒนาต่อในระยะยาว
- การหลีกเลี่ยงความซับซ้อนที่ไม่จำเป็น

### 1.1 Delivery and Hosting Principle

Foundation ไม่ Freeze ผู้ให้บริการ Hosting, control panel, container platform หรือ deployment topology รายใดรายหนึ่ง

Production environment ต้องถูกเลือกจากความสามารถที่ระบบปัจจุบันต้องใช้จริง โดยอย่างน้อยต้อง:
- รองรับ runtime และ persistence ที่กำหนดใน `10-system-blueprint.md`
- รองรับ HTTPS, request routing/reverse proxy และ secret separation ที่ปลอดภัย
- มี persistent data/media ตาม requirement
- มี backup + restore ที่ทดสอบได้
- มี staging/verification path ที่เหมาะสม
- ไม่บังคับ Product requirement ให้ลดลงเพื่อให้พอดีกับข้อจำกัดของผู้ให้บริการ

การเลือกผู้ให้บริการจริงเป็น Deployment decision ที่ต้องมี evidence แยกต่างหาก

### 1.2 Technology Neutrality

เอกสาร `00–09` อธิบาย **สิ่งที่ Songhealth ต้องทำ** ไม่ใช่ implementation recipe

Framework, CMS, database engine, runtime, hosting provider, API topology และ code structure เป็นหน้าที่ของ `10-system-blueprint.md` และ implementation plan

> **Technology may satisfy a requirement; technology does not redefine the requirement.**

หากเทคโนโลยีที่เลือกไม่สามารถรักษา Product semantics ได้ ต้องเปลี่ยนหรือขยาย implementation อย่างมีเหตุผล ไม่ใช่ลด requirement แบบเงียบ ๆ

### 1.3 CMS and Dashboard / Data Platform Separation

เว็บไซต์สามารถมี Dashboard สำหรับข้อมูลสุขภาพหรือข้อมูลเชิงวิเคราะห์ได้ แต่ Dashboard ต้องเป็น **Data Domain แยกจาก CMS/Public Content**

แนวคิดระดับ Foundation:

```text
Public Content Domain              Analytical / Dashboard Domain
         │                                   │
         └──── stable references / bounded integration ────┘
```

หลักสำคัญ:
- CMS/Public Content ไม่เป็นแหล่งเก็บ Analytical Metrics หลักของ Dashboard
- Dashboard มี data ownership และ persistence ของตนเองตามความเหมาะสม
- การเชื่อมข้อมูลข้าม Domain ใช้ Stable Identifier หรือ bounded integration ที่ตรวจสอบได้
- หลีกเลี่ยง shared mutable tables หรือ cross-domain joins ที่ไม่มี ownership ชัดเจน
- Dashboard สามารถนำเสนอภายใต้ public path เช่น `/dashboard` โดยไม่ทำให้ CMS กลายเป็น analytical platform

> **Separate responsibilities first; add infrastructure only when evidence requires it.**

---

## 2. Project Goal

เว็บไซต์ใหม่ควรพัฒนาไปสู่การเป็น **Digital Public Portal ของสำนักงาน** มากกว่าการเป็นเพียงเว็บไซต์ประชาสัมพันธ์แบบเดิม

เว็บไซต์ควรทำหน้าที่หลัก 4 ด้าน

### 2.1 เว็บไซต์ประชาสัมพันธ์ของหน่วยงาน

ใช้เผยแพร่:

- ข่าวประชาสัมพันธ์
- กิจกรรมของสำนักงาน
- ประกาศ
- ข่าวหรือประเด็นสุขภาพตามเหตุการณ์
- ข้อมูลหรือประเด็นที่ประชาชนควรรับทราบ

### 2.2 ศูนย์ข้อมูลของสำนักงาน

ใช้เป็นแหล่งข้อมูลที่เชื่อถือได้เกี่ยวกับ:

- ข้อมูลสำนักงาน
- โครงสร้างองค์กร
- บุคลากร
- หน่วยบริการสุขภาพที่เกี่ยวข้อง
- เอกสาร
- แผนงาน
- รายงาน
- ข้อมูลสุขภาพ
- ข้อมูลเปิดเผยของภาครัฐตามความเหมาะสม

### 2.3 ช่องทางบริการประชาชน

ช่วยให้ประชาชนเข้าถึงสิ่งที่ต้องการได้ง่าย เช่น:

- ค้นหาหน่วยบริการสุขภาพ
- ข้อมูลการติดต่อ
- ช่องทางร้องเรียนหรือเสนอแนะ
- แบบฟอร์มและเอกสารดาวน์โหลด
- ช่องทางบริการสุขภาพ

### 2.4 ระบบเผยแพร่ข้อมูลสำหรับเจ้าหน้าที่

มี Admin CMS ที่ช่วยให้เจ้าหน้าที่สามารถ:

- เพิ่มและแก้ไขข่าว
- เพิ่มกิจกรรม
- เพิ่มประกาศ
- จัดการเอกสาร
- จัดการข้อมูลเว็บไซต์
- จัดการสื่อ
- ควบคุมการเผยแพร่เนื้อหา

โดยไม่ต้องมีความรู้ด้านการพัฒนาเว็บไซต์

---

## 3. Core Design Principles

หลักการต่อไปนี้ถือเป็นแนวทางพื้นฐานของโครงการ

### 3.1 Best Practice by Default

การออกแบบระบบควรเลือกแนวทางที่เป็นมาตรฐาน เหมาะสม ปลอดภัย และดูแลรักษาได้ในระยะยาวเป็นค่าเริ่มต้น

อย่างไรก็ตาม Best Practice ต้องไม่ถูกตีความว่าเป็นการเพิ่มระบบหรือขั้นตอนจำนวนมากโดยไม่มีความจำเป็น

> **Best Practice ≠ Maximum Complexity**

---

### 3.2 Simple — Structured — Sustainable

ระบบควรมีคุณสมบัติหลัก 3 ประการ

**Simple**
ใช้งานง่ายสำหรับประชาชนและเจ้าหน้าที่

**Structured**
ข้อมูลมีโครงสร้างชัดเจน ไม่กระจัดกระจายหรือซ้ำซ้อน

**Sustainable**
สามารถดูแล พัฒนา และส่งต่อให้ผู้ดูแลระบบในอนาคตได้

---

### 3.3 Citizen First

โครงสร้างเว็บไซต์ควรออกแบบจากสิ่งที่ผู้ใช้งานต้องการค้นหา ไม่ใช่ออกแบบจากโครงสร้างภายในของหน่วยงานเพียงอย่างเดียว

ตัวอย่างคำถามของประชาชน เช่น:

- ติดต่อสำนักงานอย่างไร
- หน่วยบริการอยู่ที่ไหน
- มีประกาศอะไรล่าสุด
- มีข่าวเตือนสุขภาพอะไร
- ดาวน์โหลดเอกสารจากที่ใด
- ร้องเรียนหรือเสนอแนะผ่านช่องทางใด

ผู้ใช้ไม่ควรจำเป็นต้องเข้าใจโครงสร้างงานภายในของสำนักงานก่อนจึงจะค้นหาข้อมูลได้

---

### 3.4 Mobile First

เว็บไซต์ต้องออกแบบโดยถือว่าการใช้งานผ่านโทรศัพท์มือถือเป็นกรณีหลัก ไม่ใช่เป็นเพียงรูปแบบรองจาก Desktop

ข้อมูลและบริการสำคัญต้องค้นหาและใช้งานได้สะดวกบนหน้าจอขนาดเล็ก

---

### 3.5 Accessibility by Default

การเข้าถึงสำหรับผู้ใช้งานทุกกลุ่มต้องถูกพิจารณาตั้งแต่ขั้นตอนออกแบบ ไม่ใช่เป็นงานแก้ไขภายหลัง

รวมถึง:

- ความสามารถในการอ่าน
- ขนาดตัวอักษร
- Contrast
- โครงสร้างเนื้อหาที่เหมาะสม
- การใช้งานด้วย Keyboard
- Alternative Text สำหรับรูปภาพ
- การใช้งานบนอุปกรณ์หลายรูปแบบ

---

### 3.6 Single Source of Truth

ข้อมูลหนึ่งชุดควรมีแหล่งข้อมูลหลักเพียงแห่งเดียว

ตัวอย่าง:

ข่าวหนึ่งชิ้นควรถูกสร้างครั้งเดียว แล้วสามารถนำไปแสดงใน:

- หน้าแรก
- หน้าข่าว
- หมวดหมู่
- ผลการค้นหา
- เรื่องเด่น

โดยไม่ต้องคัดลอกข้อมูลซ้ำ

> **Create once, manage once, publish everywhere.**

---

### 3.7 Content First, Presentation Second

ระบบต้องแยกให้ชัดระหว่าง:

- **Content** — ข้อมูลคืออะไร
- **Presentation** — ข้อมูลนั้นจะแสดงที่ใดและอย่างไร

ตัวอย่างสำคัญ:

**“เรื่องเด่นบนหน้าแรก” ไม่ใช่ Content Type**

แต่เป็นการเลือก Content ที่มีอยู่แล้ว เช่น:

- ข่าว รวมถึง News ที่สัมพันธ์กับ Health Topic
- กิจกรรม
- ประกาศ
- Health Content

ให้นำมาแสดงในพื้นที่เด่นของหน้าแรก

---

### 3.8 Structured Content

ข้อมูลแต่ละประเภทต้องมีโครงสร้างที่เหมาะกับบริบทของตนเอง

ไม่ควร flatten ข้อมูลหลายประเภทให้กลายเป็น generic record แบบเดียวจนสูญเสีย domain meaning

ตัวอย่าง Content Type ที่ควรแยกจากกัน:

- ข่าว
- กิจกรรม
- ประกาศ
- เอกสาร
- บุคลากร
- หน่วยบริการสุขภาพที่เกี่ยวข้อง
- ข้อมูลสุขภาพ
- ข้อมูลสำนักงาน
- บริการประชาชน

---

### 3.9 Clear Information Architecture

เมนูและโครงสร้างเว็บไซต์ต้อง:

- เข้าใจง่าย
- ไม่ซ้ำซ้อน
- ไม่แตกเมนูย่อยเกินความจำเป็น
- ใช้คำที่ประชาชนเข้าใจ
- สะท้อนความสัมพันธ์ของข้อมูลอย่างถูกต้อง

Information Architecture จะถูกออกแบบโดยละเอียดในเอกสารลำดับถัดไป

---

### 3.10 Search as a First-Class Feature

ระบบค้นหาควรถูกมองเป็นฟังก์ชันหลักของเว็บไซต์ ไม่ใช่เพียงช่องค้นหาข่าว

ในอนาคต Search ควรสามารถค้นหาข้อมูลหลายประเภทได้ตามความเหมาะสม เช่น:

- ข่าว
- ประกาศ
- เอกสาร
- บุคลากร
- หน่วยบริการ
- ข้อมูลสุขภาพ

---

### 3.11 CMS Must Be Simple for Staff

ระบบ Admin CMS ใหม่ต้องใช้งานง่ายกว่าระบบเดิมสำหรับงานของสำนักงาน และใช้ภาษางานจริงแทนศัพท์เทคนิคของแพลตฟอร์ม

เจ้าหน้าที่ควรเห็นเมนูตามภารกิจจริง เช่น:

- เพิ่มข่าว
- เพิ่มกิจกรรม
- เพิ่มประกาศ
- เพิ่มเอกสาร
- จัดการบุคลากร
- จัดการหน่วยบริการ
- จัดการหน้าแรก

ไม่ควรมีเมนูหรือแนวคิดทางเทคนิคที่เจ้าหน้าที่ไม่จำเป็นต้องเข้าใจ

---

### 3.12 Access Control

Admin CMS ต้องใช้ role/permission model ของ platform เป็น baseline และยึด least privilege.

Product requirement หลักคือ:

- ผู้ที่เขียน Draft ไม่จำเป็นต้องมีสิทธิ์ Publish
- ผู้ที่จัดการ content ของผู้อื่นต้องมีสิทธิ์สูงกว่า
- schema/users/settings/plugins/import/backup เป็น administrator-level work
- client-side visibility ไม่ใช่ security boundary

Version 1 **ไม่สร้าง Songhealth-specific role hierarchy หรือ Module Scope** หาก native CMS permissions เพียงพอ.

---

### 3.13 Publishing Workflow

Publishing ใช้ native CMS lifecycle เป็น baseline:

```text
Draft → Publish / Schedule → Published
```

Published content อาจมี pending draft changes โดย public version เดิมยังคงอยู่จน Publish changes.

Version 1 **ไม่มี formal Approval Workflow, Pending Review หรือ Approved state ของ Songhealth**. ผู้มี Native RBAC publish authority สามารถเผยแพร่หรือกำหนดเวลาได้โดยตรง ไม่ต้องส่งบทความให้ตรวจสอบ ขออนุมัติ หรือยืนยันผ่านขั้นตอนของ Songhealth; ผู้ไม่มีสิทธิ์ Publish สามารถบันทึก Draft ได้ตามสิทธิ์ โดยไม่มีระบบส่งคำขออนุมัติ.

เพิ่ม approval workflow เฉพาะเมื่อมี workflow/ข้อกำกับจริงที่ native permission boundary รองรับไม่ได้.

---

### 3.14 Traceability

Version 1 ใช้ native authorship, timestamps, revisions/history และ operational logs เป็น baseline evidence.

ไม่สร้าง Central Audit Log subsystem จนกว่าจะมี requirement ด้านกฎหมาย/กำกับดูแลที่ระบุเหตุการณ์และ retention ซึ่ง native evidence ไม่รองรับ.

---

### 3.15 Security by Design

Security ต้องถูกพิจารณาตั้งแต่การออกแบบระบบ

ไม่ควรพึ่งการแก้ปัญหาหลังเปิดใช้งาน หรือใช้ Plugin จำนวนมากเพื่ออุดช่องโหว่ในภายหลัง

รายละเอียด Security Architecture จะถูกกำหนดใน Blueprint ที่เกี่ยวข้อง

---

### 3.16 Privacy / PDPA by Design

ระบบต้องพิจารณา:

- ข้อมูลใดเผยแพร่ต่อสาธารณะได้
- ข้อมูลใดควรจำกัดสิทธิ์
- ข้อมูลใดไม่ควรถูกเก็บ
- ข้อมูลส่วนบุคคลใดต้องได้รับการปกป้อง

โดยใช้หลักเก็บข้อมูลเท่าที่จำเป็นต่อวัตถุประสงค์

---

### 3.17 Data Lifecycle

ข้อมูลควรมีวงจรชีวิตที่ชัดเจน เช่น:

- Draft
- Published
- Archived

เนื้อหาบางประเภทอาจรองรับ:

- วันที่เริ่มเผยแพร่
- วันที่สิ้นสุดการเผยแพร่
- Scheduled Publish

เพื่อให้เว็บไซต์ไม่เต็มไปด้วยข้อมูลหรือประกาศที่หมดอายุแต่ยังถูกนำเสนอเป็นข้อมูลปัจจุบัน

---

### 3.18 Avoid Hard Delete for Important Content

ข้อมูลสำคัญไม่ควรถูกลบถาวรโดยง่าย

ควรใช้แนวทาง:

- Archive
- Soft Delete
- Restore

ก่อนพิจารณาการลบถาวร

---

### 3.19 Separation of Concerns

ส่วนต่าง ๆ ของระบบต้องมีหน้าที่ชัดเจน เช่น:

- Public Website
- Admin CMS
- Content
- Media
- Users & Permissions
- Search
- Audit
- Site Settings

แม้ผู้ใช้จะมองเห็นเป็นเว็บไซต์เดียวกัน แต่โครงสร้างภายในต้องไม่ผูกทุกอย่างเข้าด้วยกันจนดูแลยาก

---

### 3.20 Maintainability Over Cleverness

หากมีหลายวิธีที่แก้ปัญหาได้เหมือนกัน ควรเลือกแนวทางที่:

- เข้าใจง่ายกว่า
- ดูแลต่อได้ง่ายกว่า
- มีมาตรฐานกว่า
- ส่งต่อให้ผู้พัฒนาคนอื่นได้ง่ายกว่า

มากกว่าแนวทางที่ซับซ้อนเพียงเพราะดูทันสมัยหรือมีเทคนิคมากกว่า

---

### 3.21 Avoid Over-Engineering

ระบบต้องไม่เพิ่ม Feature, Workflow หรือ Infrastructure เพียงเพราะสามารถทำได้

> **Complexity must be earned.**

ความซับซ้อนควรถูกเพิ่มเมื่อมีปัญหาหรือความต้องการจริงรองรับเท่านั้น

---

### 3.22 Service Delivery Must Reflect Real Workflow

รูปแบบบริการบนเว็บไซต์ต้องสะท้อนกระบวนงานจริงของหน่วยงาน

การที่ระบบสามารถทำงานออนไลน์ได้ ไม่ได้หมายความว่าทุกบริการควรถูกเปลี่ยนเป็น Online Transaction โดยอัตโนมัติ

บริการบางประเภทอาจจำเป็นต้องใช้:

- เอกสารต้นฉบับ
- การลงนามจริง
- การตรวจสอบหรือรับรองจากหลายหน่วยงาน
- การยืนยันตัวตน
- การดำเนินการแบบพบหน้า
- ขั้นตอนภายนอกที่เว็บไซต์ไม่ควรจำลองขึ้นมาใหม่

ในกรณีดังกล่าว เว็บไซต์ควรทำหน้าที่ช่วยให้ผู้ใช้:

- เข้าใจบริการ
- ทราบคุณสมบัติหรือเงื่อนไข
- ทราบเอกสารที่ต้องเตรียม
- ทราบขั้นตอน
- ดาวน์โหลดแบบฟอร์มที่เกี่ยวข้อง
- ทราบสถานที่และช่องทางติดต่อ

โดยไม่จำเป็นต้องสร้างระบบยื่นคำขอออนไลน์

> **Citizen Service ≠ Online Service**

Online Service เป็นเพียงหนึ่งในช่องทางการให้บริการ ไม่ใช่ข้อบังคับของทุก Citizen Service

> **Technology should support the workflow, not distort it.**

แต่ละบริการควรสามารถระบุช่องทางการให้บริการได้ เช่น:

- Online
- In-person
- Paper-based
- Telephone
- Hybrid
- External Online Service

---

### 3.23 Simple for Staff, Structured for the System

โครงสร้างข้อมูลภายในสามารถมีความสัมพันธ์และมาตรฐานที่ดีได้ โดยไม่ควรทำให้ Workflow ของเจ้าหน้าที่ซับซ้อนตามไปด้วย

V1 example: staff select one existing Document from an Announcement or Service through native selectors. Structured ITA upload/evidence maintenance is deferred (§7.10); ordinary reuse does not guarantee historical immutability.

> **Architecture can be structured without making the workflow complicated.**

---

### 3.24 Data Domains Must Stay Separated

CMS และระบบข้อมูลเชิงวิเคราะห์มีหน้าที่ต่างกัน จึงต้องรักษาขอบเขตความรับผิดชอบให้ชัดเจน

- CMS รับผิดชอบ Content, Directory, Services, Documents และ native Media ใน V1; structured ITA history/evidence is deferred
- Dashboard / Data Platform รับผิดชอบ Metrics, Time Series, KPI และ Analytical Data
- การนำเสนอสามารถอยู่ในเว็บไซต์เดียวกันได้ แต่ไม่ควรบังคับให้ใช้ Data Model หรือ Database เดียวกัน

หลักนี้ช่วยป้องกันไม่ให้ CMS ขยายตัวเป็นระบบ BI หรือ Data Warehouse โดยไม่จำเป็น

---

## 4. Primary User Groups

เว็บไซต์ต้องคำนึงถึงผู้ใช้หลายกลุ่ม

### 4.1 ประชาชนทั่วไป

ต้องสามารถเข้าถึง:

- ข่าวสุขภาพ
- ประกาศ
- ข้อมูลสำนักงาน
- หน่วยบริการ
- ช่องทางติดต่อ
- เอกสารและบริการที่เกี่ยวข้อง

ได้อย่างรวดเร็วและเข้าใจง่าย

### 4.2 เจ้าหน้าที่และเครือข่ายสุขภาพ

อาจต้องการ:

- เอกสาร
- แนวทาง
- แบบฟอร์ม
- ข่าวหรือประกาศ
- ข้อมูลกิจกรรม
- ลิงก์ระบบงานที่เกี่ยวข้อง

### 4.3 เจ้าหน้าที่ผู้ดูแลเว็บไซต์

ต้องสามารถจัดการ Content ผ่าน CMS ที่ง่ายและตรงกับงานจริง

### 4.4 ผู้บริหารและผู้กำกับดูแล

อาจเข้าถึง:

- ข้อมูลหน่วยงาน
- รายงาน
- ผลงาน
- แผนงาน
- ข้อมูลเปิดเผย
- ข้อมูลสุขภาพที่เหมาะสมต่อการเผยแพร่

---

## 5. Initial Website Scope

Version 1 ควรประกอบด้วย Module หลักดังต่อไปนี้

1. Home
2. About / Organization
3. Personnel
4. Health Service Directory
5. News & Activities
6. Announcements
7. Document Center
8. Health Information
9. Citizen Services
10. ITA / คุณธรรมและความโปร่งใส — **deferred from V1** (§7.10)
11. Contact & Digital Channels
12. Admin CMS

ระบบกลางที่สนับสนุน Module เหล่านี้ ได้แก่:

- Search
- Media
- Users
- Roles & Permissions
- Audit Log
- Site Settings

รายละเอียดยังสามารถเปลี่ยนแปลงได้หลังจากออกแบบ Information Architecture และ Sitemap

---

## 6. Homepage Principles

หน้าแรกต้องเป็น **Curated View** ของข้อมูลในระบบ ไม่ใช่พื้นที่ที่สร้างข้อมูลซ้ำอีกชุดหนึ่ง

แนวทางเริ่มต้น:

```text
Header / Navigation / Search

เรื่องเด่น / ประเด็นสำคัญ

บริการที่ใช้บ่อย

ข่าวล่าสุด

ประกาศ / ข้อมูลสุขภาพ

หน่วยบริการสุขภาพที่เกี่ยวข้อง

กิจกรรม

Contact / Map / Footer
```

โครงสร้างนี้ยังเป็น Draft และจะออกแบบรายละเอียดในเอกสาร Homepage โดยเฉพาะ

### 6.1 เรื่องเด่น

“เรื่องเด่น” คือพื้นที่ Presentation บนหน้าแรก

ไม่ใช่ Content Type แยกต่างหาก

Content ที่มีอยู่ เช่น ข่าว กิจกรรม หรือประกาศ สามารถถูกเลือกมาแสดงเป็นเรื่องเด่นได้

เรื่องเด่นอาจมี:

- ระยะเวลาเริ่มแสดง
- ระยะเวลาสิ้นสุด
- ลำดับความสำคัญ

หากไม่มีเรื่องเด่นที่กำหนดไว้ ระบบควรมีแนวทาง Fallback ที่เหมาะสม เพื่อไม่ให้พื้นที่สำคัญของหน้าแรกว่างเปล่า

### 6.2 หน่วยบริการสุขภาพที่เกี่ยวข้อง

ใช้คำว่า:

**หน่วยบริการสุขภาพที่เกี่ยวข้อง**

แทน:

**หน่วยบริการในพื้นที่**

เพื่อสะท้อนความสัมพันธ์ของหน่วยบริการอย่างถูกต้อง โดยไม่ทำให้เข้าใจว่าเป็นหน่วยงานในสังกัดเดียวกันทั้งหมด

ตัวอย่าง:

- โรงพยาบาลสอง — สังกัดกระทรวงสาธารณสุข
- รพ.สต. — สังกัดองค์การบริหารส่วนจังหวัดแพร่
- หน่วยบริการหรือเครือข่ายอื่นตามบริบท

รายละเอียดสังกัดควรแสดงใน Profile ของแต่ละหน่วยบริการ

---

## 7. Content Model — Foundation Direction

ระบบใหม่ควรแยก Content ตามลักษณะข้อมูลจริง

ประเภทข้อมูลเบื้องต้น ได้แก่:

### 7.1 Basic Page / หน้าเนื้อหาพื้นฐาน

ใช้สำหรับเนื้อหาเว็บไซต์ที่มีลักษณะเป็นหน้าเนื้อหาคงที่หรือกึ่งคงที่ และไม่เข้ากับ Structured Content Type อื่นอย่างเหมาะสม

ตัวอย่างที่อาจใช้ Basic Page:

- นโยบายความเป็นส่วนตัว
- Accessibility Statement
- เนื้อหาอธิบายเฉพาะที่ไม่มี Model อื่นรองรับ

หลักสำคัญ:

> **Use Basic Page only when no specific structured content model fits.**

ไม่ควรใช้ Basic Page แทนข่าว กิจกรรม ประกาศ บริการ บุคลากร หน่วยบริการ ITA หรือข้อมูลที่มี Structured Model ของตนเอง

### 7.2 ข่าว

ใช้สำหรับข่าวประชาสัมพันธ์ ข่าวตามเหตุการณ์ หรือข่าวที่เกี่ยวข้องกับประเด็นสุขภาพ

คำว่า “ข่าวสุขภาพ” ในมุมมองสาธารณะควรเป็น View / Filter ของ News ที่สัมพันธ์กับ Health Topic ไม่ใช่ Content Type ใหม่

ส่วนความรู้สุขภาพที่มีอายุการใช้งานยาวกว่าให้ใช้ Health Content

### 7.3 กิจกรรม

ใช้สำหรับกิจกรรมที่สำนักงานหรือเครือข่ายเข้าร่วม/ดำเนินการ

ควรสามารถเก็บข้อมูลที่เหมาะกับกิจกรรม เช่น:

- ชื่อกิจกรรม
- วันที่
- สถานที่
- รายละเอียด
- ภาพกิจกรรม

### 7.4 ประกาศ

ใช้สำหรับเนื้อหาที่มีลักษณะเป็นประกาศอย่างเป็นทางการ เช่น:

- ประกาศทั่วไป
- รับสมัครงาน
- จัดซื้อจัดจ้าง
- ประกาศทางราชการ

### 7.5 เอกสาร

ใช้เป็นคลังเอกสารส่วนกลาง เช่น:

- แบบฟอร์ม
- คู่มือ
- แนวทาง
- แผนงาน
- รายงาน
- เอกสารประชุม
- เอกสารเผยแพร่

### 7.6 บุคลากร

ข้อมูลบุคลากรควรเป็น Structured Data ไม่ใช่หน้า HTML ที่ต้องแก้ไขด้วยตนเองทั้งหมด

### 7.7 หน่วยบริการสุขภาพที่เกี่ยวข้อง

แต่ละหน่วยบริการควรมี Profile ของตนเอง เช่น:

- ชื่อ
- ประเภท
- สังกัด
- ที่ตั้ง
- ช่องทางติดต่อ
- เวลาทำการ
- บริการที่สำคัญ
- ข้อมูลอื่นตามความเหมาะสม

### 7.8 ข้อมูลสุขภาพ

ข้อมูลสุขภาพใน CMS แบ่งบทบาทหลักเป็น:

- **Health Content** — ความรู้สุขภาพที่เผยแพร่เป็นเนื้อหาเว็บไซต์
- **Health Report** — Metadata สำหรับการค้นหา/จัดหมวด พร้อมรายงานฉบับเต็มที่เชื่อมไปยัง Document โดยทั่วไปเป็น PDF

Health Report ไม่ต้องแตกตัวเลข ตาราง หรือกราฟจาก PDF มาเป็น Health Metrics ใน CMS

Dashboard และ Analytical Metrics ไม่ใช่ CMS Content แต่เป็น Data Module แยก ซึ่งสามารถนำเสนอผ่าน `/dashboard` ได้

```text
Health Information
├── Health Content        → CMS
├── Health Report         → CMS Metadata + PDF Document
└── Dashboard             → Separate analytical ownership → Public Dashboard UI
```

### 7.9 บริการประชาชน

ใช้เป็นจุดเข้าถึงบริการและทรัพยากรที่ประชาชนต้องใช้ โดยต้องแยกความหมายภายในให้ชัดเจนว่า:

- **Service** — บริการหรือกระบวนงานจริง
- **Document Resource** — คู่มือ แบบฟอร์ม และเอกสารประกอบ
- **Health Service Directory** — การค้นหาหน่วยบริการและสถานที่รับบริการ
- **Contact Data** — ช่องทางติดต่อที่เป็นเจ้าของโดย Office / Service / Health Service / Personnel ตามบริบท

Public UX สามารถนำสิ่งเหล่านี้มาแสดงร่วมกันใน “บริการประชาชน” ได้ แต่ไม่ควรสร้างเป็น Service Entity ทั้งหมด

### 7.10 ITA / คุณธรรมและความโปร่งใส — Deferred from V1

The structured Fiscal Year → MOIT/Section → Requirement/Item → Evidence model and its historical
public retention, immutable-target/preservation and traceable correction guarantees are deferred
from the reduced V1 scope. They are not implemented/passed by ordinary Document/Media reuse,
native revisions or staff maintenance precautions. No ITA workspace/upload journey, generic-page
substitute, snapshot subsystem or upstream change is required in V1.

Future ITA requirements remain year-configurable structure, reusable Document/media/URL evidence,
no automatic carry-forward and preserved historical context. Re-entry requires a separate accepted
scope/capability decision. See `02-content-model.md` §18 and Feature 002 D-ITA/D-REF for traceability.
This deferral authorizes no deletion, migration, withdrawal or cutover of existing public ITA material.

---

## 8. Citizen Services — Service Inventory Foundation

ส่วน “บริการประชาชน” ต้องถูกออกแบบจากบริการและกระบวนงานจริงของสำนักงาน ไม่ใช่จากรายการระบบหรือกลุ่มงานภายใน

### 8.1 Service Ownership

แต่ละบริการควรถูกจำแนกตามบทบาทของหน่วยงานอย่างน้อย 4 ระดับ:

1. **Direct Service** — สสอ.สองรับคำขอและดำเนินการเอง
2. **Coordinated Service** — สสอ.สองรับเรื่องหรือประสาน แต่มีหน่วยงานอื่นร่วมดำเนินการ
3. **Related Health Service** — โรงพยาบาล รพ.สต. หรือหน่วยบริการสุขภาพเป็นผู้ให้บริการจริง
4. **External Digital Service** — เป็นบริการของกระทรวงหรือหน่วยงานภายนอกที่เว็บไซต์เชื่อมต่อให้ผู้ใช้เข้าถึง

แนวทางนี้ใช้เพื่อป้องกันไม่ให้ประชาชนเข้าใจผิดว่า สสอ.สองเป็นผู้ให้บริการทุกบริการที่ปรากฏบนเว็บไซต์

### 8.2 Service Directory

“บริการประชาชน” ควรทำหน้าที่เป็น Service Directory มากกว่าหน้ารวมลิงก์

Service Catalog ที่ยืนยันเป็นแนวทางสำหรับ Version 1:

- ร้องเรียนการปฏิบัติงานหรือการให้บริการ
- ร้องเรียนการทุจริตและประพฤติมิชอบ
- เสนอแนะ / แสดงความคิดเห็น
- สอบถามข้อมูลทั่วไป
- แจ้งปัญหาด้านสุขภาพ
- แจ้งปัญหาสิ่งแวดล้อมที่กระทบสุขภาพ
- แจ้งปัญหาผลิตภัณฑ์สุขภาพ
- ขอข้อมูลหรือเอกสารจากสำนักงาน
- บริการสำหรับ อสม.
- บริการออนไลน์ของหน่วยงานภายนอกที่เกี่ยวข้องจริง

สิ่งที่แสดงร่วมในพื้นที่บริการประชาชน แต่ **ไม่ใช่ Service Entity โดยตัวมันเอง**:

- คู่มือและขั้นตอนการรับบริการ → Document Resource
- แบบฟอร์มสำหรับประชาชน → Document Resource
- ค้นหาหน่วยบริการสุขภาพ → Health Service Directory / Discovery

สำหรับ **การขอข้อมูลหรือเอกสารจากสำนักงานอย่างเป็นทางการ** เว็บไซต์ควรให้ข้อมูลช่องทางและขั้นตอนเท่านั้น โดยผู้ขอต้องมาติดต่อสำนักงานโดยตรงใน Version 1 ไม่พัฒนาเป็นระบบยื่นคำขอออนไลน์

รายการบริการเฉพาะด้านอื่น ๆ ยังสามารถสำรวจเพิ่มเติมได้ใน Service Inventory โดยไม่ขยายขอบเขตของเว็บไซต์เกินความจำเป็น

### 8.3 Offline / Paper-based Services

บริการที่จำเป็นต้องใช้กระบวนการเอกสารและการลงนามจริงยังคงถือเป็น Citizen Service ได้ แม้ไม่รองรับการทำธุรกรรมออนไลน์

ตัวอย่างที่ยืนยันแล้วในบริบทของสำนักงาน:

**การยืนยันสิทธิการรักษาพยาบาลของ อสม.**

กระบวนการนี้ต้องใช้เอกสารจากโรงพยาบาลหรือ รพ.สต. และมีการลงนามรับรองจริงจากผู้เกี่ยวข้อง จึงไม่ควรถูกพัฒนาเป็น Online Approval Workflow ใน Version 1

บทบาทของเว็บไซต์สำหรับบริการนี้ควรจำกัดอยู่ที่:

- อธิบายสิทธิและเงื่อนไข
- แสดงเอกสารที่ต้องเตรียม
- อธิบายขั้นตอน
- ระบุสถานที่ติดต่อ
- ระบุช่องทางสอบถาม
- ให้ดาวน์โหลดแบบฟอร์ม หากมี

### 8.4 การขอข้อมูลหรือเอกสารจากสำนักงาน

การขอข้อมูลหรือเอกสารจากสำนักงานอย่างเป็นทางการ **ไม่ใช่ Online Transaction ใน Version 1**

เว็บไซต์ควรทำหน้าที่:

- อธิบายช่องทางการขอข้อมูล
- ระบุสถานที่ติดต่อ
- ระบุวันและเวลาทำการ
- ระบุเอกสารหรือข้อมูลที่ควรเตรียม หากมี
- ระบุช่องทางสอบถามเบื้องต้น

การยื่นคำขอจริงให้ดำเนินการโดยมาติดต่อสำนักงานโดยตรง เพื่อไม่ขยายเว็บไซต์ไปเป็นระบบรับคำขอราชการเต็มรูปแบบก่อนมีความจำเป็นจริง

---

### 8.5 Service Information Structure

Service แต่ละรายการควรสามารถอธิบายข้อมูลอย่างเป็นระบบ เช่น:

- ชื่อบริการ
- คำอธิบาย
- กลุ่มผู้ใช้
- เจ้าของบริการ
- ประเภทบริการ
- ช่องทางให้บริการ
- ขั้นตอน
- เอกสารที่ต้องใช้
- ระยะเวลา
- ค่าธรรมเนียม หากมี
- เวลาทำการ
- ช่องทางติดต่อ
- หน่วยบริการที่เกี่ยวข้อง
- บริการออนไลน์หรือ URL ภายนอก หากมี
- เอกสารหรือคู่มือที่เกี่ยวข้อง
- สถานะการให้บริการ

รายละเอียด Final Service Model จะพิจารณาใน Content Model และ Service Inventory ภายหลัง

---

## 9. Admin CMS — Foundation

Admin CMS ต้องออกแบบจากงานของเจ้าหน้าที่ ไม่ใช่จากแนวคิดทางเทคนิคของระบบ

โครงสร้างเบื้องต้น:

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

Deferred future scope: ITA
└── Fiscal Year / Section / Requirement / Evidence (not V1 Admin)

Media Library
└── รูปภาพ / Logo / Visual Assets

หน้าแรก
├── เรื่องเด่น
├── แบนเนอร์
├── บริการที่ใช้บ่อย
└── การจัดลำดับส่วนหน้าแรก

ระบบ
├── ผู้ใช้งาน
├── ผู้ใช้งานและสิทธิ์ตาม platform
└── ตั้งค่าเว็บไซต์
```

Dashboard ข้อมูลสุขภาพภายใต้ `/dashboard` ไม่ใช่เมนู Content Management ของ CMS และควรจัดการผ่าน Data Platform / Dashboard Domain แยก

โครงสร้างนี้เป็น Initial Direction และจะได้รับการทบทวนในขั้นตอนออกแบบ Admin CMS

### 9.1 Homepage Management

หน้า “เรื่องเด่น” ใน CMS ไม่ควรสร้าง Content ใหม่

หน้าดังกล่าวควรใช้สำหรับ:

- เลือก Content ที่มีอยู่
- จัดลำดับ
- กำหนดระยะเวลาการแสดง
- นำ Content ออกจากเรื่องเด่น

เพื่อรักษาหลัก Single Source of Truth

---

## 10. Publishing Workflow — Initial Policy

ค่าเริ่มต้นสำหรับสำนักงานขนาดเล็ก:

| Feature | Default |
|---|---|
| Draft | ON |
| Publish ตาม native role/ownership | ON |
| Scheduled Publish | ON |
| Revisions / Preview | ON where useful |
| Trash / Restore | ON |
| Formal Approval Workflow | NOT BASELINE |
| Custom Audit subsystem | NOT BASELINE |

ใช้ native CMS behavior ก่อน. Custom workflow เพิ่มเมื่อ requirement จริงพิสูจน์ว่าจำเป็น.

---

## 11. Scope Guardrails

เว็บไซต์ควรเป็นแกนกลางข้อมูลและบริการสาธารณะของสำนักงาน แต่ไม่ควรพยายามรวมระบบงานภายในทุกประเภทไว้ใน Version 1

สิ่งที่ **ไม่รวมเป็น Core Scope ใน Version 1** ได้แก่:

- ระบบ HR
- ระบบสารบรรณเต็มรูปแบบ
- ระบบประชุม
- Social Network ภายในองค์กร
- AI Chatbot
- Mobile Application
- การทำ CMS ให้เป็น Dashboard / BI Platform เต็มรูปแบบ
- ระบบ Dashboard ทุกประเภทที่ไม่มี Requirement จริงใน Version 1
- ระบบงานเฉพาะทางทุกประเภท
- ระบบภายในที่ไม่ได้เกี่ยวข้องโดยตรงกับเว็บไซต์สาธารณะ

ระบบเหล่านี้สามารถเชื่อมโยงหรือพัฒนาแยกได้เมื่อมีความต้องการจริง โดย Dashboard/Data Platform ที่มี Requirement ชัดเจนให้พัฒนาเป็น Domain แยกจาก CMS ตามหลัก Database + API Separation

---

## 12. Migration Principle

ข้อมูลจาก WordPress เดิมต้องได้รับการสำรวจและคัดเลือกก่อนย้าย

ไม่ควรใช้แนวทาง:

> ย้ายทุกอย่างจาก WordPress เดิมเข้าสู่ระบบใหม่โดยอัตโนมัติ

ควรพิจารณา:

- Content ใดควรย้าย
- Content ใดล้าสมัย
- Content ใดซ้ำซ้อน
- URL ใดต้องรักษา
- Media ใดต้องเก็บ
- เอกสารใดควรจัดหมวดใหม่

Legacy WordPress audit และการย้ายข้อมูลถูกกำกับโดย `09-migration-plan.md`; WordPress ยังคงเป็นเพียง migration source และไม่กำหนด target architecture.

---

## 13. Decision Status

### Accepted Principles

แนวทางต่อไปนี้ถือว่าตกลงร่วมกันแล้ว ณ เวอร์ชันปัจจุบัน:

- Hosting/Deployment ต้องเลือกจาก capability ที่ System Blueprint และ Production evidence ต้องการ ไม่ Freeze ผู้ให้บริการไว้ใน Product Foundation
- ระบบใหม่ไม่ใช่การ Copy WordPress เดิม
- ใช้แนวคิด Digital Public Portal
- Citizen First
- Mobile First
- Accessibility by Default
- Single Source of Truth
- Content First, Presentation Second
- Structured Content
- CMS ต้องเรียบง่ายสำหรับเจ้าหน้าที่และใช้ภาษางานของสำนักงาน
- ใช้ native role/permission model และ least privilege
- Draft authoring แยกจาก publish authority ได้โดยไม่สร้าง approval engine
- ใช้ native revisions/history/operational evidence ก่อน custom audit subsystem
- ใช้ native Draft / Published / Scheduled / Trash lifecycle เป็น baseline
- เรื่องเด่นเป็น Presentation ไม่ใช่ Content Type
- หน้าแรกเป็น Curated View
- ใช้คำว่า “หน่วยบริการสุขภาพที่เกี่ยวข้อง”
- หลีกเลี่ยง Over-Engineering
- ให้ความสำคัญกับ Maintainability
- Version 1 ต้องมี Scope ที่ควบคุมได้
- Citizen Service ไม่จำเป็นต้องเป็น Online Service
- รูปแบบการให้บริการต้องสะท้อน Workflow จริง
- บริการสามารถเป็น Online, In-person, Paper-based, Telephone, Hybrid หรือ External Online Service ได้
- การยืนยันสิทธิการรักษาพยาบาลของ อสม. เป็นบริการแบบ Paper-based / ติดต่อสำนักงาน และไม่ควรถูกทำเป็น Online Approval Workflow ใน Version 1
- การขอข้อมูลหรือเอกสารจากสำนักงานอย่างเป็นทางการให้มาติดต่อสำนักงานโดยตรงใน Version 1 เว็บไซต์ให้ข้อมูลขั้นตอนและช่องทางเท่านั้น
- กลุ่มแจ้งปัญหาด้านสุขภาพ สิ่งแวดล้อมที่กระทบสุขภาพ และผลิตภัณฑ์สุขภาพควรมีใน Service Directory
- การรักษาพยาบาลไม่ใช่ Direct Service ของ สสอ.สอง และต้องเชื่อมไปยังหน่วยบริการที่เป็นผู้ให้บริการจริง
- Health Report ใช้แนวทาง Metadata + PDF / Document และไม่แตกข้อมูลใน PDF เป็น Metrics ใน CMS
- Health Metric ไม่เป็น CMS Content Type ใน Version 1
- Dashboard / Analytical Data เป็น Data Domain แยกจาก CMS และสามารถนำเสนอผ่าน `/dashboard`
- Public Content/CMS และ Dashboard ต้องมี data ownership และ access boundary แยกกัน; exact physical database topology เป็นเรื่องของ System Blueprint/ระบบ Dashboard
- Dashboard integration ใช้ bounded interface ที่มี ownership ชัดเจน และไม่ใช้ CMS/Public Content persistence เป็น Analytical Data Source หลัก
- Structured yearly ITA evidence and historical-preservation guarantees are deferred from V1 (§7.10)
- Ordinary native Document/Media reuse remains; no immutable targets, required-reference deletion vetoes or cross-record atomicity is claimed
- No upstream EmDash change or custom history/media/relationship-locking subsystem is pursued
- Basic Page ใช้เฉพาะเมื่อไม่มี Structured Content Model ที่เหมาะสมกว่า
- “ข่าวสุขภาพ” เป็น View / Filter ของ News ตาม Health Topic ส่วนความรู้สุขภาพใช้ Health Content
- คู่มือและแบบฟอร์มเป็น Document Resources และการค้นหาหน่วยบริการเป็น Directory Function ไม่ใช่ Service Entity โดยตัวมันเอง

### Clean Rebaseline Open Decisions

หลัง Clean Rebaseline v2.2 ประเด็นที่ยังอาจต้องตัดสินเชิง implementation/operations แยกต่างหาก ได้แก่:
- exact Visual Design tokens / component implementation
- exact reference-data values และ service inventory ที่เปลี่ยนตามข้อมูลจริง
- production hosting/provider และ deployment evidence
- exact dependency/version pinning

Songhealth-specific code organization ไม่ Freeze เป็น Domain/Policy layer. `10-system-blueprint.md` ใช้ platform-native architecture และอนุญาต feature-local helper/hook เฉพาะ gap ที่พิสูจน์แล้ว; Media/Contact/Search/Auth/Publishing ใช้ native platform capability ก่อน.

---

## 14. Current Documentation Set and Change Flow

เอกสาร `current/` ทั้ง 11 ไฟล์เป็น Source of Truth ชุดเดียวกัน:

```text
00 Website Foundation
01 Information Architecture
02 Content Model
03 Sitemap
04 Homepage
05 Admin CMS
06 Roles & Permissions
07 Publishing Workflow
08 Search
09 Migration Plan
10 System Blueprint
```

การเปลี่ยน requirement หลัง Clean Rebaseline ใช้ flow:

```text
New evidence / requirement
        ↓
Impact Review
        ↓
Update owning current document
        ↓
Cross-document consistency review
        ↓
Human acceptance
        ↓
Downstream specification / implementation update
```

Git history/archival branches เก็บ provenance ของ baseline เก่า; `current/` ไม่สะสม implementation-specific append-only overlays อีกต่อไป.

---

## 15. Clean Rebaseline Status

เอกสาร `00–10` เป็นชุด Source of Truth เดียวกันสำหรับ Songhealth รุ่นใหม่

```text
Product / Information / Content / UX / Workflow requirements
                         ↓
                 System Blueprint
                         ↓
              Specification / Plan
                         ↓
                  Implementation
```

ไม่มี code, framework, CMS extension หรือ Delivery เก่าที่มีสิทธิ์ override เอกสาร Product โดยอัตโนมัติ

Clean Rebaseline เอง **ไม่ใช่ implementation authorization**. หลังทั้ง 11 เอกสารผ่าน consistency review แล้วจึงทำ Post-Rebaseline Architecture Review และสร้าง Spec Kit baseline ใหม่

## 16. Foundation Statement

เว็บไซต์สำนักงานรุ่นใหม่ต้องไม่ถูกสร้างขึ้นเพียงเพื่อให้ “ทันสมัยกว่า WordPress เดิม”

แต่ต้องเป็นระบบที่:

> **ใช้ง่ายสำหรับประชาชน
> จัดการง่ายสำหรับเจ้าหน้าที่
> มีโครงสร้างข้อมูลที่ชัดเจน
> ปลอดภัยและตรวจสอบได้
> และสามารถดูแลต่อได้ในระยะยาว**

หลักการสำคัญของโครงการ:

> **Simple — Structured — Sustainable**

และ:

> **Create once, manage once, publish everywhere.**

รวมถึง:

> **Complexity must be earned.**

---

# Roles & Permissions — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 06-roles-permissions
> **Status:** CLEAN REBASELINE v2.0 — CURRENT
> **Version:** 2.0
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`, `04-homepage.md`, `05-admin-cms.md`
> **Purpose:** กำหนดแนวคิด Role, Capability, ขอบเขตสิทธิ์ และ Security/Usability Guardrails ของ Admin CMS โดยยังไม่ลงรายละเอียดระดับ Database Schema, Authorization Library, API Middleware หรือโค้ด
> **Clean Rebaseline Rule:** เอกสารใน `current/` ต้องอธิบายคำตอบปัจจุบันเพียงชุดเดียว; ประวัติ implementation/architecture เก่าเก็บใน Git history/archival branch และไม่ใช้เป็น authority ของระบบใหม่
> **Technology Ownership:** Roles, Module Scope and authorization semantics are product rules independent of the authentication/CMS implementation.

---

# 1. Purpose

เอกสารนี้กำหนดว่า **ผู้ใช้งาน Admin CMS คนใดควรทำอะไรได้บ้าง** โดยยึดความรับผิดชอบใน CMS เป็นหลัก ไม่ผูกสิทธิ์กับชื่อตำแหน่งราชการโดยตรง

เป้าหมายคือให้ Permission Model:

- เข้าใจง่ายสำหรับสำนักงานขนาดเล็ก
- รองรับงานจริงของเจ้าหน้าที่
- ให้สิทธิ์เท่าที่จำเป็นต่อหน้าที่
- แยก Edit ออกจาก Public-impact actions
- ไม่ผูก Permission กับ Approval Workflow
- ตรวจสอบย้อนหลังได้
- ไม่ขยายเป็น Enterprise IAM โดยไม่มี requirement

หลักสำคัญ:

> **Permissions should reflect real responsibilities, not organizational titles.**

> **Give users enough access to complete their work, but no more than they need.**

> **Permission ≠ Approval.**

---

# 2. Role Model Principle

## 2.1 Role ไม่เท่ากับตำแหน่งราชการ

Role ของ CMS ไม่ควรตั้งตามตำแหน่ง เช่น นักวิชาการสาธารณสุข นักวิชาการคอมพิวเตอร์ หรือเจ้าพนักงานธุรการ เพราะตำแหน่งราชการไม่ได้บอกหน้าที่ที่บุคคลนั้นทำในระบบเว็บไซต์โดยตรง

Role ต้องสะท้อน **CMS Responsibility**

## 2.2 Version 1 Role Baseline

Version 1 เริ่มจาก 4 Role ที่เข้าใจง่าย:

```text
Viewer
Editor
Publisher
Administrator
```

ยังไม่เพิ่ม Reviewer, Content Manager, Media Manager, ITA Manager, Webmaster หรือ Role เฉพาะทางอื่นจนกว่าจะมีความจำเป็นจริง

> **Roles are understandable permission bundles; authorization is based on explicit capabilities.**

---

# 3. Viewer

Viewer ใช้สำหรับผู้ที่ต้องเปิดดูข้อมูลหลังบ้าน แต่ไม่ต้องเปลี่ยนแปลงข้อมูล

โดยหลัก Viewer สามารถ:

- ดูรายการที่ได้รับอนุญาต
- ดูรายละเอียด
- ดูสถานะ
- ใช้ Preview ที่มีสิทธิ์เข้าถึง

Viewer ไม่ได้รับโดยอัตโนมัติ:

- Create
- Edit
- Publish
- Schedule
- Archive / Close / Deactivate
- Hard Delete
- Settings / Users / Permission management

Viewer เป็น Role ที่ระบบรองรับ แต่ไม่จำเป็นต้องมีผู้ใช้จริงหากสำนักงานไม่มี use case

---

# 4. Editor

Editor คือ Role ทำงานหลักด้านการสร้างและแก้ไขข้อมูลใน Module ที่ได้รับอนุญาต

Editor อาจสามารถ:

- สร้าง Draft
- แก้ไข Draft
- ใช้ Shared Resources ตามสิทธิ์
- Upload Media / Document ผ่าน workflow ที่รองรับ
- Preview candidate state

แต่:

> **Create/Edit permission does not imply Publish permission.**

Editor ไม่ควรได้สิทธิ์ทำให้ข้อมูลเปลี่ยนบน Public Website เพียงเพราะแก้ไขข้อมูลได้

---

# 5. Publisher

Publisher คือผู้ที่ได้รับอำนาจให้ทำ **Public-impact actions** ใน Module ที่กำหนด

Publisher ไม่ได้หมายความว่า Publish ได้ทุก Module

ตัวอย่าง:

```text
Publisher A
├── News           Publish
├── Activity       Publish
├── Announcement   Publish
├── ITA            No Access
└── Settings       No Access
```

Publisher จึงเป็น Role ด้านความรับผิดชอบ ไม่ใช่ Super User

---

# 6. Administrator

Administrator ดูแล Admin CMS ในระดับระบบ เช่น:

- Users
- Role / Permission assignment ตาม policy
- Reference Data ที่เปิดให้ดูแล
- Site Settings ที่อนุญาต
- Audit Log access
- administrative modules ตาม capability

Administrator ไม่ได้มีสิทธิ์แก้ system-controlled safeguards ตามใจ เช่น:

- ปิด Audit Log
- เปลี่ยน Public ID rule
- เปลี่ยน URL identity rule
- bypass file/security policy
- ดูหรือแก้ infrastructure secrets ผ่าน CMS UI

> **Administrator is privileged, but architectural safeguards remain system-controlled.**

---

# 7. Capability-Based Authorization

Role เป็นชุดสิทธิ์ที่อ่านง่าย แต่ authorization ควรตัดสินจาก **Capability**

แนวคิด:

```text
CMS User
→ CMS Role
→ Capabilities
```

Capability ใช้แนวคิดหลัก:

```text
Module + Meaningful Action
```

ตัวอย่างเชิงแนวคิด:

```text
News
├── View
├── Create
├── Edit
├── Publish
└── Archive
```

ชื่อ identifier ทางเทคนิค เช่น `news.publish` เป็นเพียงตัวอย่าง รูปแบบชื่อจริงเป็น implementation detail ของ System Blueprint

---

# 8. Meaningful Actions ≠ Generic CRUD Everywhere

ไม่บังคับทุก Module ใช้ Create / Read / Update / Delete เหมือนกันทั้งหมด

แต่ละ Domain ใช้ action ที่ตรงกับความหมายจริง

ตัวอย่าง Document:

```text
View
Create
Edit
Publish
Supersede
Correct Published File
Archive
```

ตัวอย่าง Personnel:

```text
View
Create
Edit
Activate
Deactivate
```

Lifecycle action จึงเป็นสิทธิ์ที่มีความหมาย ไม่ใช่การแปลงทุกอย่างเป็น CRUD แบบเดียวกัน

---

# 9. Permission Granularity Boundary

Version 1 ใช้ Permission ระดับ Module + Action เป็นหลัก

ไม่ทำ Field-level Permission เช่น:

```text
แก้ Title ได้
แก้ Summary ไม่ได้
แก้ Area ได้
แก้ Published Date ไม่ได้
```

ยกเว้นมี requirement จริงในอนาคต

> **Version 1 favors understandable module/action permissions over field-level security.**

---

# 10. Delete Boundary

Edit ไม่ได้หมายความว่า Hard Delete ได้

ข้อมูลสำคัญใช้ lifecycle-first ตาม current Foundation/Admin CMS baseline:

- Archive
- Close / Expire
- Inactive
- Supersede
- Restore / Reactivate เมื่อ domain รองรับ

Hard Delete หากมี ต้องแยกเป็น privileged action และใช้เฉพาะกรณีที่ปลอดภัย เช่น Draft ที่ไม่ถูกอ้างอิง

---

# 11. Public-Impact Capabilities

Public-impact actions ได้แก่การกระทำที่ทำให้ Public Website เปลี่ยนทันทีหรือเปลี่ยนแผนการเผยแพร่

Baseline:

```text
Publish Now
Schedule Publish
Change Schedule
Cancel Schedule
Save Changes to already Published content
Domain lifecycle action ที่กระทบ Public visibility
```

> **Publishing, scheduling, and saving changes to already Published content are public-impact capabilities.**

---

# 12. Publish vs Schedule

Version 1 ไม่แยก Schedule เป็น permission ใหม่โดยไม่มีเหตุผล

Publish capability ของ Module ครอบคลุมโดยหลัก:

```text
Publish Now
Schedule Publish
Change Schedule
Cancel Schedule
```

หากภายหลังเกิด requirement ว่าผู้ใช้บางคนตั้งเวลาได้แต่ Publish Now ไม่ได้ จึงค่อยพิจารณาแยก capability

> **Do not create permission distinctions before the workflow actually needs them.**

---

# 13. Editing Published Content

จาก Admin CMS Baseline การกด `บันทึกการแก้ไข` บน Published record อัปเดต Public page โดยตรง

ดังนั้น:

- Edit capability ครอบคลุม Draft editing
- การ Commit การแก้ไข Published record ต้องใช้ Publish/Public-impact capability

ผู้ใช้ที่มี Edit แต่ไม่มี Publish:

- ดู Published record ได้เมื่อมี View
- ไม่แก้ Published record ผ่าน workflow ที่ทำให้เกิด live change

Version 1 ไม่สร้าง hidden revision branch เพื่อรองรับกรณีนี้

หาก Approval Workflow เปิดในอนาคตจึงค่อยเพิ่ม proposed-change workflow ตาม requirement

---

# 14. Approval Extension Boundary

Default v1:

```text
Approval Workflow = OFF
```

Permission Model ต้องไม่พึ่ง Approval เพื่อทำงานได้

หากเปิด Approval ภายหลัง อาจเพิ่ม capability เช่น:

```text
Submit for Review
Review
Approve
Return for Revision
```

แต่ capability เหล่านี้ **ยังไม่อยู่ใน baseline v1 matrix**

> **Permission and Approval remain separate extension layers.**

---

# 15. Record Scope / Ownership Boundary

Version 1 ไม่สร้าง row-level security ตามผู้สร้าง ตำบล หมู่บ้าน หรือหน่วยบริการโดย default

ผู้ใช้ที่มี permission ของ Module เห็น records ของ Module นั้นตามสิทธิ์ที่กำหนด

`Created By` / `Updated By` ใช้เพื่อ:

- traceability
- audit
- recent work / convenience views

ไม่ใช่ private ownership

> **Organizational content belongs to the organization, not permanently to the user who created it.**

หากผู้สร้างย้ายงาน/ลาออก ผู้ใช้คนอื่นที่มี permission ต้องสามารถดูแล record ต่อได้

---

# 16. “My Drafts” Boundary

`ร่างของฉัน` หากมี เป็น convenience view เท่านั้น

ไม่ถือเป็น Security Boundary และไม่ควรสร้าง assumption ว่า Draft ของผู้ใช้อื่นถูกซ่อนโดย architecture

หากมี requirement เรื่อง Draft ownership จริงในอนาคต ต้องผ่าน Impact Review ก่อนเพิ่ม row-level restrictions

---

# 17. Shared Media Permission Model

เพื่อให้ Editor ทำงานง่ายโดยไม่กลายเป็น Media Administrator ให้แยก capability เชิงความหมายอย่างน้อย:

```text
Media
├── Use
├── Create
└── Manage
```

ความหมาย:

- **Use** — เลือก Media ที่มีอยู่มาใช้
- **Create** — Upload/Create Media ใหม่จาก workflow ที่รองรับ
- **Manage** — จัดการ metadata/resource จาก Media Library

Editor ข่าวจึงสามารถ upload ภาพได้โดยไม่ต้องได้สิทธิ์จัดการ Media Library ทั้งหมด

---

# 18. Shared Document Permission Model

Document ใช้แนวคิดเดียวกับ Media:

```text
Document
├── Use
├── Create
└── Manage
```

โดย action ที่มี lifecycle/public impact เช่น Publish, Supersede หรือ Published File Correction อาจต้อง capability เพิ่มตาม Matrix ที่จะกำหนดภายหลัง

การ Reuse Document กลางต้องไม่ถูกทำให้ยุ่งยากเพราะ permission design

---

# 19. ITA Permission Boundary

ITA มีความแตกต่างของผลกระทบจริง จึงรองรับการแยก capability อย่างน้อยเชิงความรับผิดชอบ:

```text
ITA
├── Evidence Management
├── Structure Management
└── Publish
```

เหตุผล:

- ผู้เพิ่มหลักฐานไม่จำเป็นต้องแก้ MOIT / Requirement structure
- ผู้จัดโครงสร้างไม่จำเป็นต้อง Publish
- Publish มี public/compliance impact สูงกว่า evidence entry

นี่เป็น complexity ที่มีเหตุผลจาก workflow จริง ไม่ใช่ permission explosion

---

# 20. Homepage Permission Boundary

Homepage Curation เป็น publication surface ของตัวเองและไม่สืบทอด permission จาก News

Baseline concept:

```text
Homepage
├── Manage
└── Publish
```

- Manage = จัด curation/config Draft
- Publish = ทำ Homepage configuration ให้มีผลบนหน้าเว็บ

เพราะ Homepage มี Draft → Preview → Publish lifecycle ที่ Freeze ไว้แล้ว

---

# 21. Personnel / Organization Permission Boundary

News Editor ไม่ได้รับสิทธิ์แก้ Personnel หรือ Organization โดยอัตโนมัติ

Personnel และ Organization เป็น structured organizational data ที่ต้องมี capability แยกจาก Editorial Content

ไม่ต้องทำ field-level privacy permission ใน v1 เพราะ Content Model เองต้องจำกัดข้อมูลส่วนบุคคลให้อยู่ในขอบเขตที่เหมาะกับเว็บไซต์อยู่แล้ว

---

# 22. Administrative Capabilities

Version 1 แยก capability เชิงแนวคิดสำหรับ administrative domains อย่างน้อย:

```text
Users Manage
Permissions Manage
Audit View
Settings Manage
Reference Data Manage
```

Administrator อาจได้รับทั้งหมดตาม Default Role Mapping แต่แนวคิดเหล่านี้แยกกันเพื่อไม่ผูก architecture กับ Super User เพียงแบบเดียว

---

# 23. User & Permission Management

`Users Manage` และ `Permissions Manage` เป็นคนละ capability เชิงแนวคิด

เหตุผล:

- การเปิด/ปิด account และแก้ user identity ไม่เท่ากับการเปลี่ยน authorization
- ระบบควรสามารถแยกความรับผิดชอบได้ในอนาคตโดยไม่รื้อ model

Version 1 ยังไม่จำเป็นต้องสร้าง workflow แยกหลายชั้นสำหรับสิ่งนี้

---

# 24. Audit Log Access

Full Audit Log ไม่จำเป็นต้องเปิดให้ทุก Editor

ใช้ capability เช่น:

```text
Audit View
```

สำหรับ Administrator หรือผู้ได้รับมอบหมาย

แต่ metadata ระดับ record เช่น `แก้ไขล่าสุดโดย...` สามารถแสดงตามสิทธิ์ดู record ได้โดยไม่ถือเป็น Full Audit access

---

# 25. Settings Permission

Version 1 ใช้ capability ระดับสูงเพียง:

```text
Settings Manage
```

ไม่แตก permission ตามแต่ละ field ใน Settings เพราะ current Settings Boundary ตั้งใจให้เล็กอยู่แล้ว

---

# 26. Reference Data Permission

Baseline ใช้:

```text
Reference Data Manage
```

สำหรับ Master/Reference Data ที่เปิดให้ staff ดูแลจริง

หากอนาคตพบว่า Area หรือ Reference Type ใดมีผลกระทบสูงกว่ากลุ่มอื่นอย่างมีนัยสำคัญ จึงค่อยพิจารณาแยก capability

---

# 27. Default Role Templates

Version 1 ใช้ 4 system role templates:

```text
Viewer
Editor
Publisher
Administrator
```

ยังไม่สร้าง arbitrary custom role builder

Exact default capability mapping ของแต่ละ Role จะกำหนดในหัวข้อถัดไป

---

# 28. One User = One CMS Role in Version 1

Version 1 กำหนด:

```text
One CMS User
→ One CMS Role
```

ไม่รองรับ multi-role union/inheritance โดย default

เหตุผล:

- อธิบายสิทธิ์ได้ง่าย
- Audit/Support ง่าย
- ลด permission interaction ที่คาดเดายาก
- เพียงพอกับบริบทสำนักงานขนาดเล็ก

หากอนาคตมี use case จริงจึงค่อยพิจารณา multi-role

---

# 29. No Per-User Permission Overrides in Version 1

ไม่ใช้ pattern:

```text
Role = Editor
+ news.publish สำหรับ User A
- activity.edit สำหรับ User B
```

Permission ต้องมาจาก Role ที่ถูก assign ไม่ใช่ข้อยกเว้นกระจัดกระจายราย user

> **Avoid permission behavior that can only be understood by inspecting one user's exceptions.**

---

# 30. User Lifecycle

User account มี lifecycle แยกจาก Role:

```text
Active
Disabled
```

เมื่อเจ้าหน้าที่ลาออก ย้าย หรือไม่ควรเข้าระบบแล้ว:

- Disable account
- ไม่ Hard Delete user โดย default
- Audit history ต้องยังอ้างอิง user เดิมได้

---

# 31. CMS User ≠ Personnel

ต้องแยกแนวคิด:

```text
Personnel
→ public / organizational profile

CMS User
→ authentication / authorization identity
```

อาจมี relationship กัน แต่:

- ไม่ใช่ Personnel ทุกคนต้องมี CMS User
- CMS User ไม่จำเป็นต้องเป็น Public Personnel profile เสมอ

---

# 32. Permission Changes Are Audited

การเปลี่ยน Role/Permission assignment เป็น privileged action และต้อง Audit อย่างน้อย:

- ใครเป็นผู้เปลี่ยน
- เปลี่ยนให้ใคร
- จาก Role/สิทธิ์ใด
- เป็น Role/สิทธิ์ใด
- เมื่อไร

ไม่บังคับ Approval หรือ Reason ทุกครั้งใน v1 เว้นแต่ policy ภายหลังต้องการ

---

# 33. Self-Escalation Protection

ผู้ใช้ที่ไม่มี `Permissions Manage` ต้องไม่สามารถเปลี่ยน Role/Permission ของตนเองเพื่อเพิ่มสิทธิ์ได้

และ UI ไม่ควรแสดง action ที่นำไปสู่ privilege escalation โดยไม่มีสิทธิ์

> **Unauthorized self-escalation is a security invariant, not a UI preference.**

รายละเอียด enforcement ไป `10-system-blueprint.md`

---

# 34. Last Administrator Protection

ระบบควรป้องกันการ Disable หรือ Demote Administrator คนสุดท้ายโดยง่ายจนไม่มีบัญชีที่สามารถบริหารระบบได้

Exact recovery/break-glass mechanism ไปกำหนดใน Security/System Blueprint

Version 1 ไม่ต้องสร้าง enterprise privileged-access-management subsystem

---

# 35. Permission-Aware UX

Admin CMS ต้องใช้ permission เพื่อปรับ UI อย่างสม่ำเสมอ:

- ซ่อน action ที่ผู้ใช้ไม่มีสิทธิ์เมื่อเหมาะสม
- ไม่แสดง disabled clutter โดยไม่มีประโยชน์
- Direct URL/API access ยังต้องตรวจ authorization ฝั่งระบบ
- หาก permission เปลี่ยนระหว่าง session ให้ fail safely

ตัวอย่างข้อความ:

```text
คุณไม่มีสิทธิ์เข้าถึงส่วนนี้
```

ห้ามเผยข้อมูลของ record ที่ user ไม่มีสิทธิ์เห็น

> **UI visibility improves usability; backend authorization remains authoritative.**

---

# 36. Role/Permission UI Language

Staff ไม่ควรต้องอ่าน technical permission identifiers

UI ใช้ภาษางาน เช่น:

```text
ข่าวประชาสัมพันธ์
☑ ดู
☑ เพิ่ม
☑ แก้ไข
☑ เผยแพร่
☐ เก็บถาวร
```

Backend อาจใช้ stable identifiers แต่ชื่อและรูปแบบทางเทคนิคไม่ได้ Freeze ในเอกสารนี้

---

# 37. Excluded from Version 1

ไม่เพิ่มโดยไม่มี requirement จริง:

- ABAC / policy engine
- field-level permissions
- row-level ownership security
- permission ตามตำบล/หมู่บ้านโดย default
- multiple role inheritance
- nested roles
- user-specific allow/deny overrides
- temporary permissions
- time-based permissions
- IP-based editorial permissions
- permission request workflow
- arbitrary custom role builder
- real-time permission sync framework
- enterprise SSO role mapping
- full Separation-of-Duties engine
- enterprise privileged-access-management system

---

# 38. Accepted Foundation Decisions

แนวทางต่อไปนี้ถือเป็น **Accepted Roles & Permissions Foundation**:

> **Roles represent CMS responsibilities, not government job titles.**

> **Version 1 starts with four simple roles: Viewer, Editor, Publisher, and Administrator.**

> **Roles are understandable permission bundles; authorization itself is based on explicit capabilities.**

> **Capabilities are primarily Module + Meaningful Action rather than generic CRUD or field-level permissions.**

> **Create/Edit never automatically grants Publish.**

> **Publishing, scheduling, and saving changes to already Published content are public-impact capabilities.**

> **A Publish capability applies only to the modules granted to that role; Publisher does not mean “publish everything.”**

> **User ownership is for traceability, not private ownership of organizational content.**

> **One CMS user has one role in Version 1; per-user overrides and multi-role inheritance are excluded unless a real need emerges.**

> **Shared Media and Documents distinguish Use/Create/Manage so editors can work naturally without receiving full library-administration permission.**

> **ITA separates Evidence Management, Structure Management, and Publish because these responsibilities have materially different impact.**

> **Homepage Curation has its own Manage/Publish capability rather than inheriting News permissions.**

> **Personnel, Users, Permissions, Audit, Settings, and Reference Data remain independently permissioned administrative domains.**

> **Disabled users are preserved for audit history; CMS User and public Personnel records are separate concepts.**

> **Permission changes are audited and the system prevents unauthorized self-escalation.**

> **Version 1 deliberately excludes field-level security, row ownership rules, ABAC, role inheritance, user-specific overrides, temporary permissions, and enterprise policy engines.**

---

---

# 39. Module Capability Matrix & Default Role Mapping

## 39.1 Core Model — One Role + Module Scope

Version 1 ใช้โมเดล:

```text
CMS User
├── One CMS Role
│   ├── Viewer
│   ├── Editor
│   ├── Publisher
│   └── Administrator
└── Module Scope
    └── Modules ที่ผู้ใช้ได้รับมอบหมาย
```

Role ตอบคำถามว่า **ผู้ใช้มีระดับความรับผิดชอบเท่าใด** ส่วน Module Scope ตอบว่า **ความรับผิดชอบนั้นใช้กับส่วนงานใด**

> **Role answers “what level of responsibility?” Module Scope answers “where does that responsibility apply?”**

Module Scope เป็น whole-module access ไม่ใช่ row-level, ownership-based หรือ Area-based security.

Administrator ได้ All Modules โดย default และไม่ต้องเลือก Module Scope ทีละรายการใน Version 1.

## 39.2 Capability Family

Capabilities ใช้แนวคิด **Module + Meaningful Action** ไม่บังคับ Universal CRUD กับทุก Domain.

Action family ที่ใช้เมื่อเหมาะสม ได้แก่:

- View
- Create
- Edit
- Public Impact เช่น Publish / Activate / Save Published Changes
- Lifecycle เช่น Archive / Close / Deactivate / Supersede
- Specialized Action เฉพาะ Domain ที่มีผลกระทบต่างกันจริง

> **Any action that changes what the public currently sees requires Publisher-level authority for that Module, regardless of the button label.**

## 39.3 Editorial Content

News, Activity, Announcement, Health Content, Health Report และ Basic Page ใช้ pattern หลัก:

| Action | Viewer | Editor | Publisher | Administrator |
|---|---:|---:|---:|---:|
| View | ✓ | ✓ | ✓ | ✓ |
| Create | — | ✓ | ✓ | ✓ |
| Edit Draft | — | ✓ | ✓ | ✓ |
| Publish / Schedule | — | — | ✓ | ✓ |
| Save Published Changes | — | — | ✓ | ✓ |
| Archive / Domain Lifecycle | — | — | ✓ | ✓ |

Announcement Closed / Expired และ Health Content Review State ยังคงเป็น Domain semantics ไม่สร้าง permission แยกรายสถานะโดยไม่จำเป็น.

## 39.4 Service

Service ใช้ public-impact pattern เดียวกับ Editorial Content:

- View
- Create
- Edit
- Publish
- Archive / Lifecycle

การแก้ขั้นตอนบริการ ช่องทาง หรือข้อมูลที่ประชาชนใช้งานจริงบน Published Service เป็น Public-impact action.

## 39.5 Health Service

Health Service เป็น Directory/Master Data จึงใช้ความหมายตาม Domain:

- View
- Create
- Edit Draft
- Activate
- Manage Public Status เช่น Temporarily Closed / Inactive / Hidden ตาม lifecycle ที่รองรับ

Editor เตรียมข้อมูลได้ แต่การทำให้สถานะมีผลต่อ Public Directory ต้องเป็น Publisher-level authority.

## 39.6 Personnel

Personnel ใช้:

- View
- Create
- Edit
- Activate
- Deactivate

การทำให้บุคลากรปรากฏหรือหายจาก Public Directory เป็น Public-impact action และไม่สร้าง field-level permission ใน Version 1.

## 39.7 Organization / External Organization

Organization และหน่วยงานที่เกี่ยวข้องใช้:

- View
- Create
- Edit
- Activate
- Deactivate

ไม่แยก Internal / External Organization เป็น permission family เพิ่มใน Version 1.

## 39.8 Contact Information

Contact Information เป็น Shared Source สำหรับ Contact Page, Homepage, Footer และ Service context.

ใช้:

- View
- Edit
- Commit / Publish Public Changes

การแก้ข้อมูลติดต่อที่มีผลต่อ Public Site ต้องใช้ Publisher-level authority. ไม่แตก permission เป็นรายเบอร์โทร อีเมล หรือ Social Channel.

## 39.9 Document

Document มี specialized lifecycle ที่แตกต่างจริง:

| Action | Viewer | Editor | Publisher | Administrator |
|---|---:|---:|---:|---:|
| View / Use | ✓ | ✓ | ✓ | ✓ |
| Create | — | ✓ | ✓ | ✓ |
| Edit Draft | — | ✓ | ✓ | ✓ |
| Publish | — | — | ✓ | ✓ |
| Supersede | — | — | ✓ | ✓ |
| Archive | — | — | ✓ | ✓ |
| Correct Published File | — | — | — | ✓ |

Published File Correction เป็น Administrator-only default เพราะเป็น exceptional correction; genuine new revision ใช้ Supersede เพื่อรักษาประวัติ.

## 39.10 Media

Media ไม่ต้องมี publication lifecycle แยก ใช้:

- Use — เลือก resource ที่มีอยู่
- Create — Upload/Create resource ใหม่จาก workflow ที่อนุญาต
- Manage — จัดการ metadata และ Shared Media Library

Editor สามารถ Use/Create Media ในงานที่ได้รับอนุญาตได้โดยไม่ต้องได้รับ Media Library Management ทั้งหมด.

## 39.11 Homepage

Homepage มี lifecycle ของ configuration เอง:

- View
- Manage Draft Curation
- Publish Homepage Configuration

`news.publish` หรือ permission ของ source content ไม่ให้ `homepage.publish` โดยอัตโนมัติ.

## 39.12 ITA

ITA แยก responsibility ที่มีผลกระทบต่างกันจริงเพียงเท่าที่จำเป็น:

| Action | Viewer | Editor | Publisher | Administrator |
|---|---:|---:|---:|---:|
| View | ✓ | ✓ | ✓ | ✓ |
| Manage Evidence | — | ✓ | ✓ | ✓ |
| Publish Fiscal Year | — | — | ✓ | ✓ |
| Manage Structure | — | — | — | ✓ |

Evidence Management, Structure Management และ Publish ไม่ถูกยุบเป็น permission เดียว และไม่แตกเป็น permission ย่อยต่อ MOIT/Requirement โดยไม่จำเป็น.

## 39.13 Reference Data and System Capabilities

Version 1 ใช้ administrative capabilities ที่เรียบง่าย:

```text
reference_data.manage
users.manage
permissions.manage
audit.view
settings.manage
```

Administrator ได้ capabilities เหล่านี้โดย default. Role semantics ยังคง system-controlled; ไม่มี arbitrary custom-role builder.

---

# 40. Role Assignment / Module Scope Administration UX

## 40.1 Core Principle

> **Assign responsibility in human terms; enforce authorization in capabilities behind the scenes.**

> **The permission UI should explain who can work where, not expose the entire security model.**

User administration เริ่มจาก “ผู้ใช้งาน” ไม่ใช่ permission-code matrix.

## 40.2 User List

รายการผู้ใช้แสดงเฉพาะข้อมูลที่มีประโยชน์ เช่น:

- ชื่อ
- Role
- Module Scope แบบ human-readable
- Account Status
- Last Login เมื่อมีประโยชน์

ไม่แสดง permission count หรือ raw capability codes เป็นข้อมูลหลัก.

## 40.3 User Form

Version 1 ใช้ single-page form:

```text
ข้อมูลผู้ใช้งาน
- Identity / Account reference

สิทธิ์การใช้งาน
- Role
- Module Scope

สถานะ
- Active / Disabled

[บันทึก]
```

Authentication mechanism เช่น password, OAuth หรือ invitation ไม่ถูก Freeze ในเอกสารนี้.

## 40.4 Role Selector

Role มี 4 ค่าและแสดงคำอธิบายภาษาคน:

- Viewer — ดูข้อมูลในส่วนที่ได้รับมอบหมาย
- Editor — สร้างและแก้ไขข้อมูลที่ยังไม่ทำ Public-impact action
- Publisher — Editor + Public-impact actions ใน Module ที่ได้รับมอบหมาย
- Administrator — ดูแลทุก Module และ System Administration

Role definitions เป็น system-controlled ใน Version 1.

## 40.5 Module Scope Selection

Viewer / Editor / Publisher ต้องมี Module Scope อย่างน้อย 1 Module ก่อน Active. Administrator ได้รับ All Modules โดย definition และไม่ต้องเลือก Module Scope ทีละรายการก่อน Active.

Module Scope จัดกลุ่มตามภาษางาน เช่น:

```text
เนื้อหา
- ข่าวประชาสัมพันธ์
- กิจกรรม
- ประกาศ
- ความรู้สุขภาพ
- รายงานสุขภาพ
- หน้าข้อมูลทั่วไป

บริการและข้อมูลประชาชน
- บริการประชาชน
- หน่วยบริการสุขภาพ

ทรัพยากร
- เอกสารเผยแพร่
- สื่อ

ข้อมูลหน่วยงาน
- บุคลากร
- ข้อมูลหน่วยงาน / หน่วยงานที่เกี่ยวข้อง
- ข้อมูลติดต่อ

งานเฉพาะ
- ITA
- หน้าแรกเว็บไซต์
```

Module Scope เป็นทั้ง Module ไม่ใช่ row-level scope.

## 40.6 Supporting Resource Access

การมีสิทธิ์ทำงานใน Module อาจให้ minimal Use/Create access ต่อ Shared Media, Document หรือ Reference ที่ workflow ต้องใช้ โดยไม่ให้ Full Library/Module Management โดยอัตโนมัติ.

> **Using a shared resource inside permitted work does not automatically grant full management access to the resource library.**

## 40.7 Specialized Modules Derived from Role

ITA และ Homepage specialized capabilities derive จาก Role + Module Scope ตาม current Matrix ไม่ให้ Administrator ติ๊ก capability ย่อยราย User.

## 40.8 Permission Summary and Impact Preview

ก่อน Save ควรแสดง summary ภาษาคน เช่น Role, Modules ที่ได้รับมอบหมาย และผลของ Role change.

Routine changes ใช้ explicit Save โดยไม่ต้อง confirmation ทุกครั้ง. High-impact actions เช่น Promote/Demote Administrator หรือ Disable User ใช้ stronger confirmation พร้อม impact summary.

## 40.9 Permissions Reference Page

เมนู `สิทธิ์การใช้งาน` ใน Version 1 เป็น read-only reference ของ Role/Capability semantics ไม่ใช่ Role Builder.

ไม่มี:

- Create Custom Role
- Clone Role
- arbitrary capability editing
- per-user allow/deny overrides

## 40.10 Administrator Scope

เมื่อ Role = Administrator ให้แสดงขอบเขตเป็น `ทุกส่วนของระบบ` และไม่ใช้ module checkbox รายรายการ.

เมื่อ Demote Administrator ต้องเลือก Module Scope ใหม่ก่อน Save; ไม่ silently เปลี่ยน `All Modules` เป็น Publisher/Editor ที่มีสิทธิ์กว้างทุก Module.

## 40.11 Responsive and Accessibility

User/Role administration ใช้ responsive one-column behavior บน narrow screens, native/accessible controls, fieldset/labels ที่ชัดเจน และไม่สื่อสถานะด้วยสีอย่างเดียว.

---

# 41. User & Role Administration Rules / Guardrails

## 41.1 Authorization-Level User Lifecycle

Version 1 ใช้เพียง:

```text
Active ↔ Disabled
```

Authentication-specific states เช่น Locked, Invited, Expired หรือ Pending ไม่ถูกกำหนดใน `06`.

Active non-Administrator ต้องมี One Role + Module Scope อย่างน้อย 1 Module. ไม่สร้าง Draft User lifecycle.

## 41.2 Provisioning Boundary

CMS access ถูก provision โดย Administrator; ไม่มี public self-registration หรือ access-request workflow ใน Version 1.

หนึ่ง authenticated identity ต้องไม่ map ไปหลาย Active CMS users โดยไม่ตั้งใจ; exact identity key เป็น System Blueprint decision.

## 41.3 CMS User ≠ Personnel

CMS User และ Personnel แยก lifecycle และหน้าที่:

- สร้าง CMS User ไม่สร้าง Personnel อัตโนมัติ
- Disable CMS User ไม่ทำให้ Personnel Inactive
- Personnel ทุกคนไม่จำเป็นต้องมี CMS User
- CMS User ไม่จำเป็นต้องเป็น public Personnel profile

## 41.4 Organizational Content Ownership

Content เป็นทรัพย์สินของหน่วยงาน. Disable/Role change ไม่ Archive content, ไม่ลบ Draft, ไม่ rewrite Created By/Updated By และไม่ต้องมี Transfer Ownership workflow.

> **Authorship is historical metadata, not an access-control ownership boundary.**

## 41.5 Disable Behavior

เมื่อ Active → Disabled:

- effective CMS access ถูกถอด
- Role/Module Scope เดิมยังเก็บไว้
- content, relationships, authorship และ Audit history ไม่เปลี่ยน

Disable ต้องส่งผลต่อ effective authorization อย่างรวดเร็ว รวมถึง existing authenticated sessions. Exact session/token mechanism ไป System Blueprint.

## 41.6 Authorization Changes During Active Sessions

Role หรือ Module Scope change ต้องใช้ current authorization state กับ request ถัดไป ไม่พึ่ง permission snapshot ที่ฝังจากเวลา login อย่างเดียว.

> **Hidden UI is usability; server-side authorization is security.**

## 41.7 User and Permission Management Semantics

`users.manage` และ `permissions.manage` แยกความหมายเชิง architecture แม้ Administrator v1 จะได้ทั้งคู่:

- users.manage → identity/profile/status
- permissions.manage → Role/Module Scope

Role definition เองไม่ถูกแก้ผ่าน User Management.

## 41.8 Administrator Guardrails

- Administrator promotion ใช้ explicit high-impact confirmation
- Demote Administrator ต้องเลือก Role/Module Scope ใหม่และ confirm impact
- Administrator ไม่สามารถเปลี่ยน Role ของตนเองผ่าน normal CMS administration
- User ไม่สามารถ Disable ตนเองผ่าน normal CMS administration
- Last Active Administrator ห้าม Disable หรือ Demote
- system requirement คือ Active Administrator ≥ 1 ไม่บังคับ ≥ 2
- ไม่มี Super Administrator หรือ hidden break-glass CMS role

## 41.9 Reactivation

Disabled User เมื่อ Re-enable ให้เก็บ Role/Module Scope เดิมเพื่อประวัติ แต่ต้องแสดง summary ให้ Administrator review ก่อน Activate.

Re-enable account ที่ Role = Administrator ต้องแสดง stronger confirmation ว่าจะคืนสิทธิ์ Administrator/All Modules.

## 41.10 No Normal User Delete

Version 1 ไม่มี normal User hard-delete workflow. Disabled เป็น lifecycle สำหรับ former/non-active users เพื่อรักษา Audit และ historical attribution.

ไม่มี automatic disable จาก inactivity; Last Login เป็น information ไม่ใช่ authorization rule.

## 41.11 Permission Changes Are Prospective

การเอา Module Scope ออกหรือเปลี่ยน Role มีผลต่อ future access แต่ไม่เปลี่ยน historical authorship, relationships หรือ Audit.

Active non-Administrator ห้ามเหลือ Module Scope = 0; ให้เลือกอย่างน้อย 1 Module หรือ Disable account.

## 41.12 Supporting Reference Access

Reference/Use Access แยกจาก Module Management Access. ผู้ใช้สามารถเลือก Personnel, Health Service, Area, Topic, Audience, Media, Document หรือ shared data ที่ workflow ต้องใช้ได้ในขอบเขตขั้นต่ำ โดยไม่รับสิทธิ์จัดการ Master/Module นั้นโดยอัตโนมัติ.

## 41.13 Permission-Aware Admin Surfaces

Work Dashboard, Admin Search, navigation, actions, relationship pickers และ Quick Actions ต้อง respect authorization และไม่เปิดเผย counts/records ของ Module ที่ไม่มีสิทธิ์.

## 41.14 Explicit Save and Concurrency

Role/Scope/Status administration ใช้ explicit Save ไม่ autosave ทีละ checkbox.

Authorization records ใช้ optimistic concurrency สำหรับ meaningful writes เพื่อไม่ให้ Administrator หลายคน silent-overwrite การเปลี่ยน security state ของกันและกัน. Exact implementation token/version strategy ไป System Blueprint.

## 41.15 Authorization Administration Audit

Audit meaningful events อย่างน้อย:

- User creation
- Active / Disabled change
- Role change
- Module Scope change
- Actor
- Target User
- Previous/New values ที่เปลี่ยนจริง
- Timestamp

ไม่บังคับ Reason ทุกครั้งใน Version 1.

Login/security-event logging เป็น System Blueprint concern แยกจาก authorization administration Audit.

## 41.16 My Permissions

User อาจดู read-only human-readable summary ของ Role และ Module Scope ของตนเองได้ แต่ไม่แก้ authorization จากหน้านี้.

---

# 42. Permission Denied / Authorization Edge Cases

## 42.1 Authorization Decision Order

ทุก protected action ใช้ conceptual order:

```text
1. Account Status
2. Module / Reference Access
3. Required Capability
4. Current Domain State
5. Validation / Concurrency
6. Execute
```

> **Permission ≠ Lifecycle ≠ Validation ≠ Conflict.**

## 42.2 Failure Meanings

CMS แยกอย่างน้อย:

- Authentication/Account unavailable
- Permission Denied
- Action unavailable in current state
- Validation/Conflict
- Not Found

Exact HTTP/API status เช่น 401/403/404 ไป System Blueprint; `06` defines user-facing semantics และ security behavior.

## 42.3 Action Visibility

- ไม่มี capability → normally hide action
- มี capability แต่ current state ทำ action ไม่ได้ → hide/disable พร้อม context ตาม UX ที่เหมาะสม

Disabled controls ไม่ถูกใช้เป็น security boundary; backend ตรวจซ้ำทุกครั้ง.

## 42.4 Direct URL / Preview / API

Direct URL, Preview, Admin Search, Dashboard, Quick Actions, upload/autosave และ API request ไม่ bypass authorization.

ไม่ redirect Permission Denied กลับ Dashboard แบบเงียบ ๆ และไม่ expose raw permission code หรือ unauthorized record details เป็น primary UX.

## 42.5 Draft Ownership

Draft เป็น organizational work ไม่ใช่ private document. ผู้ใช้ที่มี Edit capability ใน Module เดียวกันสามารถทำงาน Draft ที่ผู้อื่นสร้างต่อได้.

`ร่างของฉัน` หากมีเป็น convenience filter ไม่ใช่ Security Boundary.

## 42.6 Published Content

Editor ที่ไม่มี Public-impact authority:

- ดู Published record ได้เมื่อมี View
- ไม่ edit live Published content

Publisher ที่มี Module Scope สามารถ Save Published Changes ตาม lifecycle/validation.

Administrator ไม่ bypass lifecycle, validation, concurrency, historical integrity หรือ required fields.

## 42.7 Permission Revocation During Work

ถ้า Role/Scope ถูกลดหรือ Account Disabled หลังเปิด editor:

- subsequent Save ถูก re-authorize และอาจ denied
- Autosave/Preview recheck current authorization
- server ไม่ persist unauthorized changes

ไม่สร้าง temporary “save one last time” permission; security precedence สูงกว่า recovery.

## 42.8 Reference Access ≠ Management Access

Workflow อาจ expose minimal reference data จาก Personnel, Health Service, Area, Organization, Media, Document หรือ shared resources โดยไม่ให้ access เข้า management surface หรือแก้ master record.

Reference picker แสดงเฉพาะ context ที่จำเป็นต่อการเลือก.

## 42.9 Parent Publication Never Elevates Child Resources

การ Publish parent เช่น News/ITA ไม่ silently Publish, Activate, Supersede หรือ elevate related Document/Resource ที่ผู้ใช้ไม่มี authority.

ตัวอย่าง News Publisher ที่ไม่มี Document Publish authority ไม่สามารถทำให้ Draft Document ถูก Published เพียงเพราะแนบกับ News.

## 42.10 Historical / Inactive References

Inactive/Superseded shared records อาจคงอยู่ใน historical relationships. ระบบไม่ rewrite relationship อัตโนมัติ และงานใหม่อาจ de-emphasize resource ที่ไม่เหมาะใช้งานต่อ.

## 42.11 Permission vs Conflict / Validation / Lifecycle

- record ถูกผู้อื่นแก้หลังเปิด → Conflict
- required data ขาด → Validation Error
- state ไม่รองรับ action → State/Lifecycle message
- ไม่มี authorization → Permission Denied ก่อนเปิดเผย record state

## 42.12 Upload Race

ถ้า permission ถูกถอนระหว่าง upload final commit ต้อง recheck current authorization. Temporary storage cleanup เป็น System Blueprint concern.

## 42.13 Scheduled Publication after Authorization Change

Schedule ที่ถูก authorize และ committed อย่างถูกต้องแล้วเป็น **organizational publication state**.

ดังนั้น:

- Disable scheduler ไม่ cancel schedule อัตโนมัติ
- Role/Scope change ภายหลังไม่ cancel schedule อัตโนมัติ
- Published content ไม่ถูก unpublish เมื่อ creator/scheduler Disabled
- scheduled Homepage placements/campaign-like curation ที่ `04-homepage.md` อนุญาต ใช้หลักเดียวกัน

Audit ควรรักษา attribution ว่าใคร Schedule และระบบ Publish ตามกำหนดเมื่อใด.

หาก UX สามารถแสดง scheduled items ที่เกี่ยวข้องขณะ Disable ได้โดยต้นทุนเหมาะสม ให้เป็น Information ไม่ใช่ blocker.

> **Permission changes are prospective; they do not silently undo previously committed organizational actions.**

## 42.14 Audit / Notification Boundary

Ordinary authorization denial ไม่ flood staff Audit Log หรือ Notification system.

Security-event logging, repeated-denial detection หรือ incident monitoring เป็น System Blueprint/Operations concern.

## 42.15 Effective Access Support

Administrator ที่มีสิทธิ์อาจดู read-only effective-access summary ของ User เพื่อ support/debug ได้ โดยไม่กลายเป็น editable capability matrix.

## 42.16 Backend Authority

> **Client-side controls improve usability; authoritative authorization must be enforced by the trusted server/system boundary.**

Client-provided Role/Module Scope ไม่เป็น Source of Truth และ Version 1 ไม่มี Force Override / Ignore Permission / Bypass Lifecycle ใน normal CMS UX.

---

# 43. Final Roles & Permissions Consistency Review

Clean Rebaseline review against current `00–05` confirms the Version 1 authorization model with the following clarifications:

1. Any edit to an already Public/Active record that changes public output requires Publisher-level authority in that Module; Editor-level edit authority remains for Draft/non-public work.
2. `audit.view` remains a separate architectural capability but is Administrator-only by default in Version 1.
3. Hard Delete is Administrator-only by default and only where Admin CMS lifecycle/reference safety rules explicitly allow deletion (primarily safe unused Draft/unreferenced records).
4. Every Active non-Administrator account must have at least one Module Scope; Administrator receives All Modules by definition.
5. CMS Role is separate from public Personnel Role/Position/Assignment and must never be inferred from job title.
6. One Role level applies uniformly across all assigned Module Scopes in Version 1. Mixed responsibility levels per module require future Impact Review/versioned cross-document update rather than silently over-granting or adding per-user overrides.

Consistency result: Foundation PASS, IA PASS, Content Model v2.0 PASS, Sitemap v2.0 PASS, Homepage v2.0 PASS, Admin CMS v2.0 PASS, ITA/Document/shared-resource boundaries PASS, security guardrails PASS, and over-engineering review PASS.

---

# 44. Clean Rebaseline — Roles & Permissions Baseline v2.0

**Sections 1–43 = CLEAN REBASELINE Roles & Permissions v2.0.**

Status:

```text
CLEAN REBASELINE — Roles & Permissions Baseline
Version 2.0
```

Future changes require cross-document Impact Review and a versioned update to the consolidated `current/` baseline.

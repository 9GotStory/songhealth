# Roles & Permissions — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 06-roles-permissions  
> **Status:** WORKING DRAFT  
> **Version:** 0.1  
> **Last Updated:** 14 สิงหาคม 2569  
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md` v1.1, `03-sitemap.md`, `04-homepage.md`, `05-admin-cms.md` v1.0  
> **Purpose:** กำหนดแนวคิด Role, Capability, ขอบเขตสิทธิ์ และ Security/Usability Guardrails ของ Admin CMS โดยยังไม่ลงรายละเอียดระดับ Database Schema, Authorization Library, API Middleware หรือโค้ด

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

ข้อมูลสำคัญใช้ lifecycle-first ตาม Frozen Foundation/Admin CMS:

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

ไม่แตก permission ตามแต่ละ field ใน Settings เพราะ Frozen Settings Boundary ตั้งใจให้เล็กอยู่แล้ว

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

# 39. Remaining Decisions Before Freeze

หัวข้อที่ยังต้องกำหนดใน `06-roles-permissions.md`:

1. **Module Capability Matrix & Default Role Mapping**
2. Public-impact / Lifecycle Capability Mapping by Module
3. Shared Resource Permission Mapping
4. ITA / Homepage / Administrative Permission Mapping
5. User & Role Administration Rules
6. Permission UX / Edge Cases
7. Final Roles & Permissions Consistency Review

---

# 40. Working Draft Status

**Sections 1–38 = Accepted Decisions So Far**

**Section 39 = Remaining Design Work**

เอกสารนี้ยังเป็น **WORKING DRAFT** และยังไม่ถือว่า Freeze

ขั้นตอนถัดไป:

> **Module Capability Matrix & Default Role Mapping**

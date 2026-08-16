# Publishing Workflow — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 07-publishing-workflow  
> **Status:** WORKING DRAFT  
> **Version:** 0.1  
> **Last Updated:** 14 สิงหาคม 2569  
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md` v1.1, `03-sitemap.md`, `04-homepage.md`, `05-admin-cms.md` v1.0, `06-roles-permissions.md` v1.0  
> **Purpose:** กำหนด Publishing Workflow, publication lifecycle, scheduling, validation, optional approval boundary และ domain lifecycle semantics ของ Admin CMS ให้สอดคล้องกันทั้งระบบ โดยยังไม่ลงรายละเอียด implementation ระดับ queue, cron, database state machine, token/session หรือ code

---

# 1. Purpose

เอกสารนี้กำหนดว่าเนื้อหาและข้อมูลที่มีผลต่อ Public Website เคลื่อนผ่านสถานะและ action อย่างไร ตั้งแต่การทำงานแบบ Draft ไปจนถึง Publish, Scheduled Publish, Published Changes และ domain-specific lifecycle actions.

เป้าหมายคือให้ Publishing Workflow:

- เข้าใจง่ายสำหรับเจ้าหน้าที่
- ทำให้การเผยแพร่เป็น action ที่ตั้งใจและตรวจสอบได้
- แยก Draft/Edit ออกจาก Public-impact action
- ใช้ permission baseline จาก `06-roles-permissions.md`
- รักษาความถูกต้องของ Published state และ historical lifecycle
- รองรับ Direct Publish และ Scheduled Publish โดยไม่บังคับ Approval ใน Version 1
- ไม่สร้าง revision/workflow engine ที่ซับซ้อนเกิน requirement

หลักสำคัญ:

> **Draft tolerates incompleteness; Publish enforces validity.**

> **Publishing is a deliberate public-impact action, not a side effect of editing.**

> **Permission determines who may publish; workflow determines how publishing happens.**

> **Approval remains optional and must not make routine publishing harder when it is not required.**

---

# 2. Scope of This Document

เอกสารนี้ครอบคลุม:

- Draft / Published / Scheduled publication behavior
- Publish Now และ Scheduled Publish
- Editing Published content
- publication validation
- Error vs Warning semantics
- optional Approval boundary
- Archive / Close / Inactive / Superseded และ domain-specific lifecycle
- scheduling ownership and continuity
- Audit events ที่เกี่ยวกับ publication
- Version 1 workflow exclusions

เอกสารนี้ **ไม่**กำหนดรายละเอียด implementation เช่น:

- database schema / enum implementation
- job queue / worker / cron implementation
- exact retry algorithm
- API status codes
- transaction strategy
- authentication/session implementation
- event bus / notification transport

รายละเอียดดังกล่าว defer ไป `10-system-blueprint.md`.

---

# 3. Draft Is the Working State

Draft เป็น working state หลักสำหรับข้อมูลที่ยังไม่พร้อมเผยแพร่.

Draft สามารถไม่สมบูรณ์ได้ตาม workflow ของแต่ละ Content Type เช่น:

- required publication fields อาจยังไม่ครบ
- relationships อาจยังไม่ครบ
- Media/Document บางรายการอาจยังอยู่ระหว่างเตรียม
- classification/metadata ที่จำเป็นต่อ Publish อาจยังขาดได้

การบันทึก Draft ต้องไม่ทำให้ Public Website เปลี่ยนแปลง.

> **Save Draft never publishes.**

Autosave/Recovery ที่นิยามใน `05-admin-cms.md` เป็น safety mechanism และไม่ใช่ publication action.

---

# 4. Publish Is Explicit

การเผยแพร่ต้องเกิดจาก action ที่ผู้ใช้ตั้งใจทำอย่างชัดเจน เช่น:

```text
Publish
Schedule
Save Published Changes
Activate
Commit Public Changes
```

ชื่อ action จริงขึ้นอยู่กับ Domain แต่ security/public-impact semantics ใช้หลักเดียวกัน.

Publish ต้องไม่เกิดจาก:

- Save Draft
- Autosave
- Preview
- การเลือก relationship
- การ upload resource เฉย ๆ
- การแก้ field โดยยังไม่ได้ commit public-impact action

> **Public state changes only through an explicit authorized public-impact action.**

---

# 5. Create / Edit Does Not Imply Publish

Publishing Workflow ใช้ permission baseline จาก `06-roles-permissions.md`:

- Viewer → ดูตามสิทธิ์
- Editor → สร้าง/แก้ Draft หรือ Non-public state ตาม Domain
- Publisher → Editor + Public-impact actions ใน Module Scope ที่ได้รับมอบหมาย
- Administrator → system-level administration + Publisher-level public-impact authority โดยยังต้องผ่าน lifecycle/validation/integrity rules

> **Create/Edit ≠ Publish.**

การแก้ข้อมูลที่ Public/Active อยู่แล้วและทำให้สิ่งที่ประชาชนเห็นเปลี่ยน ต้องใช้ Publisher-level authority แม้ Domain นั้นไม่ได้ใช้คำว่า `Publish`.

---

# 6. Direct Publish Is the Default Version 1 Workflow

Version 1 baseline:

```text
Draft              ON
Direct Publish     ON
Scheduled Publish  ON
Approval Workflow  OFF
Audit Log          ON
```

Authorized Publisher-level usersสามารถ Publish โดยตรงโดยไม่ต้องผ่าน mandatory reviewer/approver.

เหตุผลคือบริบทสำนักงานขนาดเล็กไม่ควรถูกบังคับให้เพิ่ม handoff ที่ไม่จำเป็น.

> **Direct Publish support does not mean every Editor can publish; it means authorized users may publish without a mandatory approval layer.**

---

# 7. Scheduled Publish Is Part of Publish Authority

Scheduled Publish เป็นส่วนหนึ่งของ Publish/Public-impact authority โดยไม่สร้าง permission แยกใน Version 1.

ผู้ที่มี Publish authority ใน Module สามารถโดยหลัก:

- Publish Now
- Schedule Publish
- เปลี่ยนเวลาที่ Schedule
- Cancel Schedule

หากในอนาคตมี requirement จริงว่าผู้ใช้บางคน Schedule ได้แต่ Publish Now ไม่ได้ จึงค่อยทำ Impact Review/Controlled Amendment.

---

# 8. Published Content Remains Live While Being Edited

สำหรับผู้ที่มี Publisher-level authority:

```text
Published
→ Edit working state
→ Preview
→ Save Changes
```

ระหว่างการแก้ไข Public Website ยังคงแสดง **last valid Published state** จนกว่าจะกด `Save Changes` สำเร็จ.

ดังนั้น:

```text
Public = last valid saved Published state
Editor Working State = proposed changes
```

การเปิด Published record มาแก้ไม่ควรทำให้หน้า Public หายหรือกลายเป็น Draft.

---

# 9. Editor Cannot Edit Live Published Content in Version 1

Editor ที่ไม่มี Publish/Public-impact capability:

- ดู Published record ได้เมื่อมี View permission
- ไม่แก้ live Published content ผ่าน workflow ที่จะเปลี่ยน Public Website

เหตุผลคือ Version 1 ยังไม่มี proposed revision / review branch สำหรับให้ Editor เตรียมการเปลี่ยน Published record แล้วส่งต่อ Publisher.

หาก Approval/revision workflow ถูกเปิดในอนาคต จึงค่อยออกแบบ proposed-change behavior ใน Controlled Amendment/Version ถัดไป.

> **Do not create a hidden revision workflow merely to make Editor editing Published content appear possible.**

---

# 10. Domain Lifecycle Is Not a Generic Status Dropdown

แต่ละ Domain มี lifecycle ตามความหมายจริงของข้อมูล เช่น:

```text
Announcement → Closed / Expired
Document     → Superseded
Personnel    → Inactive
Health Service → Inactive / Temporarily Closed
General published content → Archived where appropriate
```

ไม่บังคับทุก Domain ให้ใช้สถานะเดียวกันแบบ:

```text
Draft / Published / Archived
```

หากความหมายของข้อมูลต่างกัน.

> **Lifecycle actions follow domain meaning; publication status is not a free-form dropdown.**

Admin UI ใช้ action ที่มีความหมาย เช่น `เผยแพร่`, `ปิด`, `เก็บถาวร`, `แทนที่ด้วยฉบับใหม่`, `ปิดใช้งาน` แทนการให้ user เลือก status arbitrary.

---

# 11. Approval Is Optional Workflow, Not Permission

`Permission ≠ Approval` ตาม `06-roles-permissions.md`.

Version 1 ไม่เปิด Approval Workflow โดย default.

หากเปิดในอนาคต workflow อาจเป็นแนวทางเช่น:

```text
Draft
→ Pending Review
→ Approved
→ Published
```

และอาจมี action เช่น:

```text
Submit for Review
Approve
Return for Revision
```

แต่ Approval ต้องเป็น extension layer ที่เพิ่มเฉพาะเมื่อ operational requirement จริงเกิดขึ้น.

การเปิด Approval ในอนาคตต้องไม่ทำให้ Role/Capability baseline เดิมถูกตีความว่า Approval = Permission.

---

# 12. Parent Publication Never Silently Publishes Related Resources

การ Publish parent record ต้องไม่ bypass lifecycle/permission ของ related resource.

ตัวอย่าง:

```text
News (Ready)
└── Document (Draft)
```

ระบบต้องไม่ silently Publish Document เพียงเพราะ News ถูก Publish.

หาก resource ที่สัมพันธ์ยังไม่ publication-valid:

```text
Publish Parent
→ Block / validation message
→ resolve related resource first
```

> **Publishing a parent record never silently publishes, activates, supersedes, or elevates a related resource.**

หลักนี้ใช้กับ Document, Media lifecycle where applicable, ITA Evidence, Health Service reference และ shared resources อื่นตาม Domain.

---

# 13. Scheduled Publication Is Organizational State

Schedule ที่ถูก authorized และ commit อย่างถูกต้องแล้วถือเป็น **organizational publication state** ไม่ใช่งานส่วนตัวของ scheduler.

ดังนั้น:

```text
User Disabled
or
Role / Module Scope later reduced
```

ไม่ทำให้ valid schedule ที่ commit แล้วถูก Cancel อัตโนมัติ.

> **Permission changes are prospective; they do not silently undo previously committed organizational publishing actions.**

ผู้มีสิทธิ์ปัจจุบันยังสามารถตรวจสอบ แก้ Schedule หรือ Cancel ตาม workflow.

Audit ต้องรักษา attribution ว่าใครเป็นผู้ Schedule และระบบทำ publication เมื่อใด.

---

# 14. Publication Validation Is Stricter Than Draft Validation

Draft สามารถไม่ครบได้ แต่ Publish/Schedule ต้องผ่าน publication-validity rules ของ Content Type/Domain นั้น.

Validation อาจครอบคลุม:

- required content fields
- required relationships
- valid dates / lifecycle consistency
- required Media/Document availability
- publication statusของ related resources
- URL/external resource validityที่ตรวจได้ ณ workflow stage
- domain-specific constraints

Publish Now และ Scheduled Publish ใช้ authoritative publication-validity rules ชุดเดียวกัน.

> **Schedule is not a way to bypass Publish validation.**

---

# 15. Errors and Warnings Are Different

ระบบต้องแยก:

## Error

ปัญหาที่ทำให้ record ไม่ publication-valid.

```text
Error
→ Block Publish / Schedule
```

## Warning

ข้อมูลที่ควรให้ผู้ใช้รับทราบ แต่ไม่ทำให้ publication invalid โดยอัตโนมัติ.

```text
Warning
→ Explain clearly
→ Allow authorized user to proceed where Domain permits
```

ตัวอย่าง Warning อาจเป็น Health Content review nearing due date หรือ historical/quality concern ที่ไม่ทำให้ข้อมูล public invalid.

ไม่ควรเปลี่ยนทุก Warning ให้เป็น blocker เพราะจะทำให้ workflow แข็งเกินความจำเป็น.

---

# 16. Reversibility Follows Domain Meaning

Publishing ต้อง reversible **เฉพาะในรูปแบบที่ Domain รองรับ**.

ไม่สร้าง generic:

```text
Undo Publish
```

สำหรับทุกชนิดข้อมูล.

ใช้ lifecycle action ที่เหมาะสม เช่น:

- Archive
- Close
- Expire
- Inactivate
- Supersede
- Replace through controlled correction where explicitly permitted

> **Reversibility is domain lifecycle, not a universal rollback button.**

---

# 17. No Revision Branching in Version 1

Version 1 ไม่รวม:

- multiple concurrent drafts of one published record
- editorial branches
- revision tree
- visual diff as required publishing gate
- merge/rebase of content revisions
- parallel proposed versions

Published content ใช้ simple model:

```text
Published = last valid public state
Authorized working edit = proposed current changes
Save Changes = commit new public state
```

Version history/audit needs that are technically required may exist internally butไม่ถูกยกระดับเป็น editorial branching workflow โดย default.

---

# 18. No Recurring Publishing Schedule

Version 1 รองรับ one-time future scheduling เช่น:

```text
Publish at 20 สิงหาคม 2569 09:00
```

ไม่รองรับ:

- recurring schedule
- cron-like rule builder
- every Monday publishing
- campaign recurrence engine

หากมี recurring content need ให้สร้าง/จัดการ records ตาม workflow จริงก่อน ไม่สร้าง scheduling engine ล่วงหน้า.

---

# 19. No Generic Scheduled Unpublish

Version 1 ไม่สร้าง field กลาง:

```text
Unpublish At
```

ให้ทุก Content Type.

ถ้า Domain มี expiry จริง เช่น Announcement ใช้ domain-specific lifecycle เช่น `Expired` / deadline behavior ตาม Content Model.

> **Do not add generic scheduled unpublish where domain lifecycle already carries the correct meaning.**

---

# 20. Meaningful Publishing Events Are Audited

เหตุการณ์ publication ที่มีความหมายต้องอยู่ใน Audit boundary เช่น:

- Publish Now
- Schedule Publish
- Change Schedule
- Cancel Schedule
- Save Published Changes
- Archive / Close / Inactivate / Supersede ตาม Domain
- Approval events หาก Approval เปิดในอนาคต

Autosave ไม่ควรสร้าง Audit noise.

Audit ต้องตอบได้อย่างน้อยเชิง product semantics ว่าใครทำ public-impact action อะไร และเมื่อใด โดยรายละเอียด storage/schema defer ไป System Blueprint.

---

# 21. Publishing Timezone

Website/Admin publishing timezone baseline คือ:

```text
Asia/Bangkok
```

UI แสดงวัน/เวลาในบริบทไทยอย่างชัดเจน และไม่เปิด per-user timezone configuration ใน Version 1.

Exact UTC storage, conversion, scheduler/worker execution และ clock strategy defer ไป `10-system-blueprint.md`.

---

# 22. Version 1 Exclusions

Publishing Workflow Version 1 ไม่รวม:

- mandatory Approval Workflow
- complex reviewer chains
- generic workflow designer
- arbitrary status editor
- per-record workflow customization
- multiple revision branches
- content merge workflow
- recurring publishing schedule
- generic scheduled unpublish for every Content Type
- publication campaign engine
- bulk publish by default
- silent publishing of related resources
- automatic publication caused by Autosave
- automatic unpublish when creator/scheduler is Disabled
- per-user timezone configuration
- cron expression UI
- AI auto-publish / AI approval decisions

Complexity เหล่านี้ต้องมี requirement จริงก่อนเพิ่ม.

---

# 23. Accepted Publishing Workflow Foundation

**Sections 1–22 = Accepted Publishing Workflow Foundation**

Current accepted baseline:

- Draft is the incomplete working state and never changes Public Website by itself.
- Publish is explicit and deliberate.
- Create/Edit permission does not imply Publish/Public-impact authority.
- Direct Publish and Scheduled Publish are enabled by default for authorized users.
- Approval Workflow is optional and OFF by default.
- Schedule authority follows Publish authority in Version 1.
- Published content stays live at its last valid state while an authorized Publisher edits a working state.
- Editor without Publish authority does not edit live Published content in Version 1.
- lifecycle uses domain-specific actions rather than one generic status dropdown.
- parent publication never silently publishes or elevates related resources.
- committed schedules survive later user Disable/Role/Scope changes unless explicitly changed by an authorized user.
- Publish and Schedule share authoritative publication validation.
- Errors block; Warnings inform and may allow continuation where Domain permits.
- reversibility follows Domain lifecycle semantics.
- no revision branching, recurring scheduling, or generic scheduled unpublish in Version 1.
- meaningful public-impact publishing events are audited; Autosave is not audit noise.
- publishing timezone baseline is `Asia/Bangkok`.

---

# 24. Next Discussion

Next topic:

> **Canonical Publishing State Model**

Next discussion will define which states/transitions are truly shared across publishing-capable records and which remain Domain-specific, without forcing News, Announcement, Document, Personnel, ITA, Homepage, and other resources into one artificial universal state machine.

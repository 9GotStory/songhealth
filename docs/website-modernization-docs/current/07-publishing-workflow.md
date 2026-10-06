# Publishing Workflow — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 07-publishing-workflow
> **Status:** CLEAN REBASELINE v2.0 — CURRENT
> **Version:** 2.0
> **Last Updated:** 6 ตุลาคม 2569 (2026-10-06)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`, `04-homepage.md`, `05-admin-cms.md`, `06-roles-permissions.md`
> **Purpose:** กำหนด Publishing Workflow, publication lifecycle, scheduling, validation, optional approval boundary และ domain lifecycle semantics ของ Admin CMS ให้สอดคล้องกันทั้งระบบ โดยยังไม่ลงรายละเอียด implementation ระดับ queue, cron, database state machine, token/session หรือ code
> **Clean Rebaseline Rule:** เอกสารใน `current/` ต้องอธิบายคำตอบปัจจุบันเพียงชุดเดียว; ประวัติ implementation/architecture เก่าเก็บใน Git history/archival branch และไม่ใช้เป็น authority ของระบบใหม่
> **Technology Ownership:** Lifecycle, approval, scheduling, concurrency and audit semantics are product contracts; scheduler/storage mechanics belong to `10`.

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

หากในอนาคตมี requirement จริงว่าผู้ใช้บางคน Schedule ได้แต่ Publish Now ไม่ได้ จึงค่อยทำ Impact Review/versioned cross-document update.

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
Authorized Working Changes = proposed changes
```

การเปิด Published record มาแก้ไม่ควรทำให้หน้า Public หายหรือกลายเป็น Draft.

---

# 9. Editor Cannot Edit Live Published Content in Version 1

Editor ที่ไม่มี Publish/Public-impact capability:

- ดู Published record ได้เมื่อมี View permission
- ไม่แก้ live Published content ผ่าน workflow ที่จะเปลี่ยน Public Website

เหตุผลคือ Version 1 ยังไม่มี proposed revision / review branch สำหรับให้ Editor เตรียมการเปลี่ยน Published record แล้วส่งต่อ Publisher.

หาก Approval/revision workflow ถูกเปิดในอนาคต จึงค่อยออกแบบ proposed-change behavior ใน versioned cross-document update/Version ถัดไป.

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

# 24. Canonical Publishing Semantics

Publication behavior may reuse **shared publishing semantics** where the semantics are genuinely common, while each content/domain lifecycle remains specific to the meaning defined in `02-content-model.md` and `03-sitemap.md`. This is a Product-level reuse rule, not a requirement for a particular code layer or Domain architecture.

> **Share semantics only where they are truly common; preserve each domain’s real lifecycle.**

> **A status represents business/public meaning, not implementation convenience.**

## 24.1 Shared Publishing Semantics

Where applicable:

```text
Draft
Scheduled
Published
```

- **Draft** — incomplete/non-public working state.
- **Scheduled** — publication-ready committed future publication state.
- **Published** — current public state.

There is no generic `Unpublished` status.

## 24.2 Editorial Content

News, Activity, Health Content, Health Report, Basic Page, and Service generally use:

```text
Draft → Published / Scheduled → Published
Published → Archived
```

Archived is historical/current-use lifecycle, not deletion. Activity does not become Expired merely because Event Date is in the past. Health Content review status remains separate from publishing lifecycle and does not auto-unpublish otherwise valid content.

## 24.3 Announcement

```text
Draft / Scheduled / Published / Closed / Expired / Archived
```

`Closed` is an explicit operational decision; `Expired` follows meaningful domain expiry. Either may retain historical public detail where appropriate.

## 24.4 Health Service

```text
Draft
Active
Temporarily Closed
Inactive
Hidden
```

- **Temporarily Closed** remains current directory information with clear closure context.
- **Inactive** is removed from current service discovery but historical relationships remain.
- **Hidden** is intentional non-public visibility and is distinct from Draft/Inactive. Public access uses neutral Not Found semantics; staff may still manage the record according to authorization.

## 24.5 Personnel and Organization

```text
Draft
Active
Inactive
Hidden
```

Inactive/Hidden never rewrite historical assignments/relationships. Hidden means intentionally non-public; it is not Hard Delete.

## 24.6 Contact Information

Contact Information remains the structured reusable model defined by `02-content-model.md`, including Visibility (`Public / Internal / Hidden`), Status, Purpose/Label, Primary/Secondary, and relationships.

It is **not** modeled as one singleton Published Configuration or a hidden revision branch.

- Editor-level users may create/edit non-public Contact records according to Module Scope.
- Any change to an already Public Contact record that changes public output requires Publisher-level authority.
- `Internal/Hidden → Public`, `Public → Internal/Hidden`, and changes to public values are public-impact transitions.

Homepage/Footer continue to reuse central Contact Information rather than keeping duplicated contact copies.

## 24.7 Document

```text
Draft
Scheduled
Published
Superseded
Expired
Archived
Hidden
```

- **Superseded** — a successor officially replaces the document.
- **Expired** — the document has a real meaningful expiry condition/date; this is domain-driven, not age-based cleanup.
- **Archived** — not in current use without requiring a successor.
- **Hidden** — intentionally non-public while the record/history remains administratively managed.

Superseded, Expired, Archived, and Hidden are distinct. A successor relationship never silently overwrites historical identity/file/reference.

## 24.8 Media

Media has no editorial Draft/Published lifecycle in Version 1. Technical processing states remain implementation concerns.

## 24.9 Homepage

Homepage Configuration uses:

```text
Draft → Preview → Published
```

There is no whole-Homepage `Scheduled` configuration state in Version 1. Scheduling belongs only to Homepage placements with a demonstrated temporal use case from current `04-homepage.md`, currently such as Urgent Alert, Featured, and Health Information.

Current Published Homepage remains valid while Draft configuration is prepared. Placement scheduling must never blank or partially replace the Homepage.

## 24.10 ITA Fiscal Year

```text
Draft
Published
Archived
```

Fiscal Year is the publication unit. Scheduled ITA publication is excluded from Version 1. Evidence resources keep their own lifecycle.

## 24.11 Scheduled Is a Committed State

Scheduled records must have passed full publication readiness and have a future date/time. Cancel Schedule returns to Draft; Reschedule remains Scheduled.

When Approval is **OFF**, an authorized Publisher may edit a Scheduled record and revalidate it in place.

When Approval is **ON**, an Approved/Scheduled publication package is content-locked. Substantive content changes require:

```text
Cancel Schedule → Draft → Edit → Submit → Approve again → Publish/Schedule
```

Rescheduling only changes publication time and does not invalidate Approval.

## 24.12 No Generic Unpublish or Status Mutation

Public/current use ends through Domain actions such as Archive, Close, Expire, Supersede, Inactivate, Hide, or controlled Permanent Withdrawal. UI uses meaningful verbs rather than a universal status dropdown.

## 24.13 Canonical State Families

| Domain | Version 1 State Model |
|---|---|
| News | Draft / Scheduled / Published / Archived |
| Activity | Draft / Scheduled / Published / Archived |
| Announcement | Draft / Scheduled / Published / Closed / Expired / Archived |
| Health Content | Draft / Scheduled / Published / Archived |
| Health Report | Draft / Scheduled / Published / Archived |
| Basic Page | Draft / Scheduled / Published / Archived |
| Service | Draft / Scheduled / Published / Archived |
| Health Service | Draft / Active / Temporarily Closed / Inactive / Hidden |
| Personnel | Draft / Active / Inactive / Hidden |
| Organization | Draft / Active / Inactive / Hidden |
| Contact Information | Structured records with Public / Internal / Hidden visibility + Status |
| Document | Draft / Scheduled / Published / Superseded / Expired / Archived / Hidden |
| Media | No editorial publishing lifecycle |
| Homepage Configuration | Draft / Published; selected placements may have their own scheduling |
| ITA Fiscal Year | Draft / Published / Archived |

## 24.14 Version 1 Guardrail

The system does not provide a universal workflow/state-machine configurator. State families remain fixed by Domain semantics and Frozen baselines.

---

# 25. Accepted Canonical Publishing State Model

**Section 24 = Accepted Canonical Publishing State Model, including Final Review corrections.**

Accepted baseline:

- Shared publication core remains Draft / Scheduled / Published only where genuinely applicable.
- Domain states preserve current Content Model/Sitemap semantics, including `Hidden` for Health Service, Personnel, Organization, and Document, and meaningful `Expired` for Document.
- Contact Information remains structured reusable records, not singleton Published Configuration + hidden working-copy workflow.
- Homepage Configuration is Draft / Published; scheduling is limited to eligible temporal placements rather than the whole Homepage package.
- Scheduled is committed and publication-ready; Approval OFF allows revalidated in-place edits while Approval ON locks the approved package until Cancel → Draft → Review again.
- No generic Unpublished, universal Unpublish, universal Restore, or arbitrary status dropdown exists.
- Historical relationships and identities remain stable through lifecycle transitions.

---

# 26. Publishing Transition Rules & Action Semantics

Workflow action แสดง **user intent**; state transition เป็น **system result** หลัง authorization, state, validation และ concurrency checks ผ่านครบ.

> **A workflow action expresses user intent; a state transition is the system result of that action.**

> **Every public-impact transition rechecks current authorization and current publish validity at the moment it is committed.**

## 26.1 Canonical Transition Evaluation Order

```text
User Action
   ↓
Current Authorization
   ↓
Current Record State
   ↓
Transition Allowed?
   ↓
Validation
   ↓
Concurrency Check
   ↓
Commit
   ↓
Audit
   ↓
User Feedback
```

Frontend action visibility ไม่ใช่ authorization boundary; backend ต้อง recheck ณ commit time.

## 26.2 Save Draft

```text
New Record → Save Draft → Draft
Draft      → Save Draft → Draft
```

- Save Draft ไม่มี public impact.
- ใช้ Draft validation.
- feedback: `บันทึกร่างแล้ว`.
- routine Draft saves ไม่สร้าง publishing Audit noise.

## 26.3 Publish Now

```text
Draft → Publish → Published
```

ก่อน commit ต้องผ่าน:

- current Publisher-level authority
- current Module Scope
- full publication validation
- relationship/resource validity
- concurrency check

ปกติไม่ต้อง confirmation modal เพราะ action `Publish` ชัดเจนอยู่แล้ว.

หลังสำเร็จให้ feedback `เผยแพร่แล้ว` และ public link เมื่อมี.

## 26.4 Publish Now from Scheduled

```text
Scheduled → Publish Now → Published
```

schedule เดิมสิ้นสุดทันทีและไม่ execute ซ้ำ.

Audit รักษาข้อมูลว่าเดิมถูก Scheduled และถูก Publish ก่อนกำหนดโดยใคร.

## 26.5 Schedule Publish

```text
Draft → Schedule → Scheduled
```

Schedule ใช้ Publish authority และ full publication validation เช่นเดียวกับ Publish Now.

Baseline:

```text
scheduled_at > current time
Timezone = Asia/Bangkok
```

ถ้าเวลาที่เลือกผ่านไปแล้วระหว่าง Save ให้ Error และให้เลือกเวลาใหม่หรือ Publish Now; ห้าม silent auto-publish.

## 26.6 Scheduled Means Publication-Ready

Scheduled ไม่ใช่ Draft + date.

Record ที่ยังไม่ผ่าน full publication validation ไม่สามารถเข้าสู่ Scheduled.

## 26.7 Editing Scheduled Content

When Approval is OFF, Publisher-level users within Module Scope may:

```text
Scheduled → Edit / Save Scheduled Changes → Scheduled
```

Every Save revalidates publication readiness; invalid scheduled changes are blocked rather than leaving an invalid Scheduled record.

When Approval is ON, an Approved/Scheduled publication package is content-locked. Substantive edits require `Cancel Schedule → Draft → Edit → Submit/Approve again`; Reschedule remains available without invalidating Approval.

Editor ที่ไม่มี Publish authority เป็น read-only สำหรับ committed Scheduled content ใน Version 1.

## 26.8 Reschedule

```text
Scheduled → Reschedule → Scheduled
```

ต้อง recheck current Publish authority, future time และ publication readiness.

Audit เก็บ old schedule → new schedule.

## 26.9 Cancel Schedule

```text
Scheduled → Cancel Schedule → Draft
```

ไม่มี `Cancelled` content state.

Cancellation เป็น meaningful Audit event.

## 26.10 Scheduled Execution

เมื่อถึงเวลาระบบ execute:

```text
Scheduled → Published
```

ต้อง recheck integrity/validity ที่ยังเกี่ยวข้อง ณ execution time; system actor ไม่ bypass invariants.

## 26.11 Scheduled Publish Failure

หาก execute ไม่สำเร็จ:

```text
Scheduled
+ Publish Failure condition
```

- ไม่เปลี่ยนเป็น Published.
- ไม่ silently กลับ Draft.
- Dashboard แสดง actionable warning ตาม `05-admin-cms.md`.
- ไม่มี business lifecycle state `Failed`.

หลังแก้สาเหตุ Publisher สามารถ Save/Reschedule ต่อใน Scheduled หรือ Publish Now หากพร้อม.

## 26.12 Save Changes to Published Content

Published record ไม่กลับ Draft เมื่อเปิดแก้:

```text
Published
  + working changes
       ↓
  Save Changes
       ↓
Published updated
```

`Save Changes` เป็น public-impact action และต้อง Publisher-level authority.

Public website ใช้ last valid Published state จนกว่า Save Changes จะ commit สำเร็จ.

การ Cancel/Leave ก่อน Save ไม่เปลี่ยน Public content.

## 26.13 Editor and Published Content

Editor without Publish authority:

```text
Published Record
→ View ✓
→ Edit Live ✗
```

Version 1 ไม่มี proposed revision workflow จึงไม่สร้าง hidden revision system.

## 26.14 Archive

สำหรับ Domain ที่รองรับ:

```text
Published → Archive → Archived
```

Archive เป็น public-impact lifecycle action และควรมี confirmation ที่อธิบาย public consequence.

Draft ไม่ใช้ `Draft → Archived` เป็น normal workflow.

Scheduled ต้อง Cancel Schedule → Draft ก่อน ไม่ใช้ shortcut `Scheduled → Archived`.

Archived content ที่จะกลับมาใช้ใหม่ต้องผ่าน preparation + publication validation; ไม่มี generic one-click restore-to-live.

## 26.15 Announcement Close

```text
Published → Close → Closed
```

Close เป็น explicit Publisher-level action สำหรับการปิด public process เช่นปิดรับสมัคร/ความคิดเห็น.

Closed may remain publicly accessible as historical/status information.

## 26.16 Announcement Expiry

หาก Domain มี meaningful `expiry_at`:

```text
Published → expiry reached → Expired
```

Expiry เป็น domain-driven automatic transition ไม่ใช่ generic scheduled unpublish.

Expired page อาจยัง public และต้องแสดง meaning เช่น `หมดเขตรับสมัครแล้ว`.

Schedule validation ต้อง block เมื่อ:

```text
expiry_at <= scheduled_publish_at
```

## 26.17 Announcement Reopen

เมื่อมี operational reason จริง เช่นขยายเวลารับสมัคร:

```text
Closed / Expired → Reopen → Published
```

ต้อง:

- Publisher-level authority
- update relevant dates/content where needed
- pass current publication validation
- Audit Reopen

ไม่ใช้ generic unarchive semantics.

## 26.18 Announcement Archive

```text
Closed  → Archive → Archived
Expired → Archive → Archived
```

ไม่บังคับ Archive ทันทีเมื่อ Expired.

## 26.19 Document Publish

```text
Draft Document → Publish → Published
```

ต้องผ่าน file validity, metadata, security validation และ publication readiness.

## 26.20 Document Supersede

Document replacement ใช้ semantic transition แบบ atomic:

```text
Document B (Draft)
→ Publish as Replacement for Document A
```

ผลที่ต้อง commit พร้อมกัน:

```text
Document B → Published
Document A → Superseded
Document A.successor → Document B
```

> **A replacement document becomes current at the same moment the previous document becomes Superseded.**

ไม่ Supersede A ก่อนที่ B จะ Publish สำเร็จ.

## 26.21 Scheduled Document Replacement

ก่อนเวลา:

```text
A = Published
B = Scheduled replacement
```

เมื่อเวลา reached และ B Publish สำเร็จ:

```text
B → Published
A → Superseded
A.successor → B
```

ถ้า B Publish ล้มเหลว:

```text
A remains Published
B remains Scheduled + failure
```

partial transition ที่ทำให้ไม่มี current valid Document เป็นสิ่งต้องห้าม.

## 26.22 Document Archive

```text
Published → Archive → Archived
```

ใช้เมื่อเลิก current use โดยไม่มี direct successor.

ถ้ามี replacement จริงต้องใช้ Supersede.

## 26.23 Correct Published File

```text
Published → Correct Published File → Published
```

เป็น exceptional Administrator-only corrective action ตาม `06-roles-permissions.md`.

ต้อง confirmation + stronger Audit และไม่ใช้แทน normal successor/Supersede workflow.

## 26.24 Health Service Activate

```text
Draft → Activate → Active
```

ต้อง Publisher-level authority และ directory publication validation.

UI ใช้ `เปิดใช้งาน` ไม่ใช้ `Publish`.

## 26.25 Health Service Temporarily Close and Reopen

```text
Active → Temporarily Close → Temporarily Closed
Temporarily Closed → Reopen → Active
```

Reopen ต้อง revalidate essential public fields ก่อนกลับ Active.

## 26.26 Health Service Inactivate and Reactivate

```text
Active / Temporarily Closed → Inactivate → Inactive
Inactive → Reactivate → Active
```

Inactivate ควรมี confirmation เพราะนำ entity ออกจาก current directory usage.

Reactivate ต้องผ่าน current validation ใหม่.

Historical relationships ไม่ถูก rewrite.

## 26.27 Personnel / Organization Activate and Inactivate

```text
Draft → Activate → Active
Active → Inactivate → Inactive
Inactive → Reactivate → Active
```

การแก้ Active record ที่เปลี่ยน public output ต้อง Publisher-level authority ตาม `06`.

Reactivation ต้องผ่าน current required-data validation และไม่ rewrite historical assignments/relationships.

## 26.28 Contact Information

Contact actions follow the structured Contact model rather than a singleton configuration lifecycle.

- New/non-public Contact records may be prepared by Editor-level users according to scope.
- Changes to a Public Contact record that alter public output require Publisher-level authority.
- Visibility transitions involving `Public` are explicit public-impact actions and revalidate current required fields/relationships.
- Homepage/Footer continue to read central Contact Information after successful commit.

## 26.29 Homepage

Homepage Configuration uses:

```text
Draft Configuration → Preview → Publish → Published Configuration
```

The current Published Homepage remains in effect until the Draft configuration publishes successfully. Version 1 does not schedule the whole Homepage Configuration.

Eligible temporal placements such as Urgent Alert / Featured / Health Information may be scheduled independently. If a scheduled placement is invalid at activation time, that placement fails safely using the accepted fallback/hide behavior and an actionable warning; the rest of the Published Homepage remains valid.

## 26.30 ITA Fiscal Year

Version 1:

```text
Draft → Publish → Published
Published → Archive → Archived
```

ไม่มี Scheduled ITA.

Publication unit คือทั้ง Fiscal Year ไม่ใช่ individual Requirement.

Published ITA ใช้ working changes + Publisher `Save Changes` โดยยังคง Published state; Editor without public-impact authority จัดการ Evidence ใน Draft Fiscal Year แต่ไม่แก้ live Published ITA ใน Version 1.

## 26.31 Parent and Related Resource Publication Boundary

> **Every resource must reach its own valid public state through its own authorized lifecycle.**

ตัวอย่าง News อ้าง Draft Document ที่ต้อง public:

```text
News Publish → BLOCK
```

ระบบแจ้งว่า related Document ยังไม่พร้อม และห้าม auto-publish Document.

Parent publish ไม่ elevate related-resource authority.

## 26.32 Semantic Atomicity

Atomic transition ใช้เฉพาะเมื่อ partial result จะสร้าง invalid public state เช่น Document replacement:

```text
Publish successor
+
Supersede predecessor
```

ต้อง commit พร้อมกันเชิง semantic.

รายละเอียด transaction implementation defer ไป `10-system-blueprint.md`.

## 26.33 Confirmation Policy

Baseline:

| Action | Confirmation |
|---|---|
| Save Draft | ไม่ต้อง |
| Publish | ปกติไม่ต้อง |
| Schedule | ปกติไม่ต้อง |
| Reschedule | ไม่ต้อง |
| Cancel Schedule | ไม่จำเป็นเมื่อผลชัด |
| Save Published Changes | ไม่ต้อง |
| Archive | ควรมี |
| Close | ควรมีเมื่อกระทบ public process |
| Supersede | ควรมี |
| Inactivate | ควรมี |
| Normal Activate / Reactivate | ปกติไม่ต้อง |
| Correct Published File | ต้องมี |

> **Confirm materially disruptive or exceptional intent, not routine work.**

## 26.34 Success Feedback

Feedback ต้องสื่อผลจริง เช่น:

- `บันทึกร่างแล้ว`
- `เผยแพร่แล้ว`
- `กำหนดเผยแพร่วันที่ ... เวลา ...`
- `ยกเลิกกำหนดเผยแพร่แล้ว`
- `เก็บเป็นข้อมูลย้อนหลังแล้ว`
- `ปิดประกาศแล้ว`
- `เปิดใช้งานหน่วยบริการแล้ว`
- `เอกสารฉบับใหม่เผยแพร่และแทนที่ฉบับเดิมแล้ว`

หลีกเลี่ยง generic `บันทึกสำเร็จ` เมื่อผล public/lifecycle สำคัญ.

## 26.35 Audit Semantics

Meaningful events ที่ต้อง Audit ได้แก่:

- Publish
- Schedule
- Reschedule
- Cancel Schedule
- Publish Now from Scheduled
- Save Changes to Published content
- Archive
- Close / Reopen
- Expire (system-driven event)
- Supersede
- Activate
- Temporarily Close / Reopen Service
- Inactivate / Reactivate
- Correct Published File

automatic transition ใช้ `Actor = System` ตาม semantics ที่เหมาะสม แต่รักษา historical creator/publisher attribution.

Routine Draft save / Autosave ไม่สร้าง publishing Audit noise.

## 26.36 System Actor Does Not Bypass Invariants

Scheduled execution หรือ automatic Expiry ต้อง obey authorization-independent Domain invariants, validation และ integrity rules.

`System` เป็น actor ของ transition ไม่ใช่ bypass role.

## 26.37 Canonical Transition Summary

| Current | Action | Result |
|---|---|---|
| Draft | Save Draft | Draft |
| Draft | Publish | Published |
| Draft | Schedule | Scheduled |
| Scheduled | Edit / Save | Scheduled |
| Scheduled | Reschedule | Scheduled |
| Scheduled | Cancel Schedule | Draft |
| Scheduled | Publish Now | Published |
| Scheduled | Time Reached | Published |
| Published | Save Changes | Published |
| Published | Archive | Archived |
| Announcement Published | Close | Closed |
| Announcement Published | Expiry Reached | Expired |
| Closed / Expired Announcement | Reopen | Published |
| Document A Published + B Draft | Publish B as Replacement | A Superseded / B Published |
| Health Service Draft | Activate | Active |
| Health Service Active | Temporarily Close | Temporarily Closed |
| Health Service Temporarily Closed | Reopen | Active |
| Health Service Active / Temporarily Closed | Inactivate | Inactive |
| Personnel / Organization Draft | Activate | Active |
| Personnel / Organization Active | Inactivate | Inactive |
| Inactive Entity | Reactivate | Active |
| ITA Draft | Publish | Published |
| ITA Published | Archive | Archived |

---

# 27. Accepted Publishing Transition Rules & Action Semantics

**Section 26 = Accepted Publishing Transition Rules & Action Semantics**

Accepted baseline:

- Every publishing/public-impact action rechecks current authorization, current state, validation, and concurrency at commit time.
- Save Draft never has public impact.
- Publish and Schedule require Publisher-level authority.
- Scheduled content is publication-ready and committed; Approval OFF permits revalidated in-place edits, while Approval ON locks approved content and Reschedule alone preserves Approval.
- Cancel Schedule returns to Draft; no Cancelled lifecycle state.
- Published records remain Published while working changes are prepared; Save Changes commits updated public content without Published → Draft.
- Archive, Close, Supersede, Activate, Temporarily Close, Inactivate, Reopen, and Reactivate are explicit Domain actions.
- Announcement Expiry may be system-driven from a meaningful expiry date and does not automatically remove historical public access.
- Announcement can be Reopened when a real operational extension occurs, with current validation and Publisher authority.
- Document replacement is atomic: successor Published and predecessor Superseded occur together.
- Scheduled replacement never Supersedes the current Document until successor publication succeeds.
- Correct Published File remains exceptional Administrator-only correction, not normal replacement workflow.
- Entity directories use lifecycle actions matching Domain meaning.
- Publishing a parent never silently publishes/elevates related resources.
- Atomicity is required only where partial transition would create an invalid public state.
- Meaningful public-state changes are audited; routine Draft saves/Autosave do not create publishing Audit noise.
- Confirmation is reserved for materially disruptive/exceptional actions rather than routine publishing.

---

# 28. Publishing Validation & Readiness Rules

Publishing validation แยกความหมายของ “บันทึกงานได้” ออกจาก “พร้อมทำให้ข้อมูลมีผลต่อ Public Website” อย่างชัดเจน.

หลักสำคัญ:

> **Draft validation protects the editor from losing work. Publish validation protects the public from incomplete or invalid content.**

> **Validation should be strict at the boundary where information becomes public, not while staff are still working.**

## 28.1 Three Validation Layers

Version 1 แยก validation เป็น 3 ระดับ:

```text
Draft Validation
Publish Readiness
Runtime / Transition Validation
```

- **Draft Validation** ตรวจ structural safety ที่จำเป็นต่อการบันทึกงาน โดยยอมให้ publication data ยังไม่ครบ.
- **Publish Readiness** ตรวจ requirement ทั้งหมดที่จำเป็นก่อน Public-impact transition.
- **Runtime / Transition Validation** ตรวจ current invariants อีกครั้งตอน transition จริง เช่น Scheduled execution, Supersede, Activate หรือ Reopen.

## 28.2 Draft Validation Is Permissive but Structurally Safe

Save Draft ไม่บังคับ publication-required fields ทั้งหมด เช่น Summary, Cover Image, Topic หรือ related resources ที่ยังอยู่ระหว่างเตรียม หาก Domain อนุญาตให้ขาดระหว่างทำงาน.

แต่ Draft ต้องไม่กลายเป็น structurally invalid record. Draft validation ยัง block กรณีเช่น:

- invalid data format
- malformed/forbidden URL
- impossible relationship
- unsupported/corrupted file
- duplicate system identity ที่ต้อง unique
- invalid technical constraint ที่ทำให้ record เก็บอย่างปลอดภัยไม่ได้

> **Draft is permissive, not structurally invalid.**

## 28.3 Publish Readiness Follows the Content Model

Publish/Schedule validation ต้องอิง `02-content-model.md` และ Domain semantics ไม่ใช่ field ที่ UI designer รู้สึกว่า “ควรมี”.

Readiness แบ่ง conceptual rule เป็น:

```text
Core Rules
+
Domain Rules
+
Relationship / Resource Rules
```

Core Rules เช่น:

- identity/title ที่จำเป็น valid
- public URL identity resolvable
- current transition allowed
- user ยัง authorized
- ไม่มี blocking validation error

Domain Rules และ Relationship/Resource Rules แตกต่างตามชนิดข้อมูล.

## 28.4 Error vs Warning

**Error** block Public-impact transition.

ตัวอย่าง:

- required field ขาด
- schedule time อยู่ในอดีต
- required public Document ยัง Draft
- invalid successor/predecessor relation
- Announcement expiry ไม่สมเหตุสมผลกับ publication time
- required public relation/resource ทำให้ public state ใช้งานไม่ได้

**Warning** ให้ข้อมูลเพื่อประกอบ judgment แต่ไม่ block โดย default.

ตัวอย่าง:

- optional image ไม่มี
- summary สั้นผิดปกติแต่ยัง valid
- Health Content ใกล้ review date
- external URL format ถูกต้องแต่ remote site ตรวจ availability ไม่สำเร็จ
- optional relationship ไม่มี

> **Warnings should inform judgment; Errors protect invariants.**

Warning ห้ามใช้แทน requirement ที่จำเป็นต่อ correctness.

## 28.5 Readiness UI

CMS ควรแสดง readiness แบบ human-readable เช่น:

```text
พร้อมเผยแพร่
✓ ข้อมูลหลักครบ
✓ เอกสารที่เกี่ยวข้องพร้อม
✓ URL ถูกต้อง
✓ วันเวลาถูกต้อง

คำเตือน
! ยังไม่มีภาพประกอบ
```

ไม่ใช้ percentage/quality score เช่น `82% ready`.

Validation message ควรอยู่ใกล้ field/relationship ที่ผิด และอาจมี summary ด้านบนเพื่อช่วย navigate.

## 28.6 Backend Revalidation at Commit

แม้ UI จะแสดงว่า “พร้อมเผยแพร่” Backend ต้อง validate ซ้ำตอน Publish/Schedule/Save Changes เพราะระหว่างนั้น permission, relation, resource state, concurrency version หรือเวลาอาจเปลี่ยน.

Frontend readiness เป็น UX; Backend validation เป็น authority.

## 28.7 Publish and Schedule Use the Same Full Readiness Rules

`Draft → Schedule` ต้องผ่าน readiness เท่ากับ `Draft → Publish` เพราะ Scheduled เป็น committed publication-ready state.

ห้ามใช้ Schedule เป็นวิธี bypass incomplete Draft validation.

## 28.8 Scheduled Execution Rechecks Current Runtime Invariants

เมื่อถึงเวลาที่ Scheduled publication ต้อง execute ระบบ recheck เฉพาะ runtime invariants ที่อาจเปลี่ยนและจำเป็นต่อ valid public state เช่น:

- record ยังอยู่ Scheduled
- required related resources ยัง available/public-valid
- current relation integrity ยังถูกต้อง
- ไม่มี blocking Domain state change
- public dependency ที่จำเป็นยังพร้อม

ไม่จำเป็นต้อง re-run optional editorial-quality warnings ทุกชนิด.

ถ้า execution fail record ยังคง Scheduled + actionable failure condition ตาม Transition baseline และต้องแสดงสาเหตุด้วยภาษางาน เช่น “เอกสารที่เกี่ยวข้องไม่อยู่ในสถานะพร้อมเผยแพร่”.

## 28.9 Required / Optional / Conditional Relationships

Relationship ถูกแบ่งเป็น:

- **Required** — ไม่มีไม่ได้; publication Error
- **Optional** — ไม่มีได้; ไม่ warning โดย default
- **Conditional Required** — จำเป็นเมื่อ field/choice อื่นทำให้ relation นั้นมีความหมาย

ตัวอย่าง Service:

```text
Channel = External Online
→ External URL required
```

## 28.10 Related Resource State Follows Public Meaning

ไม่ตั้งกฎว่า related resource ทุกตัวต้อง Published เสมอ. ตรวจตามความหมายของ relation ว่าประชาชนต้องใช้ resource นั้นจาก public record หรือไม่.

- public PDF attachment → Document ต้องอยู่ public-valid state
- decorative Media → asset available/valid ก็เพียงพอ
- internal-only/reference-only resource → ไม่ควรกลายเป็น public dependency โดยปริยาย

Parent publication ไม่ auto-publish related resource.

## 28.11 Media Validation

Public Media validation โดยหลักตรวจ:

- file valid / supported
- upload/processing complete
- asset available
- informational image มี meaningful Alt Text
- decorative image ถูก mark decorative แทนการสร้าง alt ที่ไร้ความหมาย

## 28.12 Document Validation

ก่อน Publish Document ตรวจอย่างน้อย:

- file exists and upload complete
- allowed file type / security validation ผ่าน
- required metadata ครบ
- public identity/filename handling valid
- replacement relation ไม่เสีย
- successor/predecessor consistency ถูกต้อง

Document ที่เป็น required public dependency ของ parent ต้องอยู่ใน public-valid lifecycle state.

## 28.13 External URL Validation

Publish-time validation ตรวจ syntax, permitted scheme และ basic security restrictions.

Third-party timeout/unavailability **ไม่ block โดย default** หาก URL syntax/security ผ่าน เพราะ uptime อยู่นอกการควบคุมของ CMS; สามารถเป็น Warning ได้.

Version 1 ไม่มี continuous external-link monitoring.

## 28.14 Announcement Validation

นอกจาก Core Rules ต้องตรวจ chronology เช่น start/end/expiry และต้องไม่ Schedule/Publish รายการที่ `expiry_at <= effective publication time`.

Closed/Expired/Reopen actions ต้องผ่าน lifecycle-specific validation; Reopen ต้องมี period ที่สมเหตุสมผลถ้า Domain ใช้ expiry/end date.

## 28.15 Activity Validation

Activity Date ในอดีตไม่ใช่ Error เพราะ Activity สามารถ publish เป็น historical communication ได้.

Validation ตรวจเฉพาะ required Activity fields/relations ตาม Content Model ไม่ auto-expire จาก Event Date.

## 28.16 Health Content Validation

ตรวจ core content metadata และ review metadata ตาม Content Model.

Review Overdue ของ content ที่ Published อยู่แล้ว:

- ไม่ auto-unpublish
- ไม่ทำให้ public page invalid โดยตัวมันเอง
- เป็น operational warning/state

สำหรับ new Publish หาก required review metadata ขาดหรือ invalid จึง block ตาม Content Model.

## 28.17 Health Report Validation

ก่อน Publish Health Report ตรวจ:

- required metadata
- Report Type / Fiscal Year / Reporting Period consistency
- Owner / Source ตาม model
- Report Document public-ready
- published/reporting dates สมเหตุสมผล

ไม่ extract analytical metrics เพื่อ validate report; Dashboard data เป็นคนละ Domain.

## 28.18 Basic Page Validation

ตรวจ title/content/public identity และ system-required relation ตาม model.

Privacy Notice, Cookie Policy, Accessibility Statement หรือ system-required pages อาจมี stronger lifecycle rule เช่นห้ามนำ current page ออกจาก public use โดยไม่มี valid successor; นี่เป็น lifecycle/system invariant ไม่ใช่ generic required field.

## 28.19 Service Validation

Validation เป็น conditional ตาม service channel เช่น:

- Online → URL required
- Telephone → phone required
- In-person → location/contact required
- Paper-based → required Form/Document relation
- External Online → external owner + URL

ไม่บังคับ field ที่ไม่เกี่ยวกับ channel นั้น.

## 28.20 Health Service Validation

ก่อน Activate/Reopen/Reactivate ตรวจ essential current directory data ตาม Content Model เช่น official/display name, type, affiliation where required, location/area และ public contact ที่จำเป็น.

ไม่บังคับ optional service details ทั้งหมดเพียงเพื่อให้ Active.

## 28.21 Personnel Validation

ก่อน Activate/Reactivate ตรวจ public identity, role/position/assignment, organization relation และ public-display fields ที่จำเป็น.

ไม่เพิ่ม HR/private fields นอก Content Model.

## 28.22 Organization Validation

ก่อน Activate/Reactivate ตรวจ display name, type/domain identity, status และ required relation ตามความหมายของ Internal/External Organization.

External Organization ไม่ถูกบังคับให้มี metadata เทียบเท่า Internal Organization หาก use case ไม่ต้องใช้.

## 28.23 Contact Information Validation

ก่อน Publisher commit `Save Changes` ตรวจเฉพาะ public fields ที่ใช้งานจริง เช่น phone/email/URL format, office-hours structure, map/reference และ complaint channel consistency.

ไม่บังคับทุกช่องให้มีค่า หากหน่วยงานไม่ได้ใช้ช่องนั้น.

## 28.24 Homepage Validation

ก่อน Publish Homepage Configuration ตรวจ curated source ปัจจุบัน เช่น:

- Featured Main ยัง Published/eligible
- Frequently Used Service ยัง public-valid
- Selected Health Service ยัง Active
- Quick Access source ยัง accessible
- Urgent Alert ที่เปิดใช้งานมี valid content/timing

Optional section ที่สามารถ auto-hide safely ไม่ควรทำให้ Homepage publish fail ทั้งหน้า.

Validation ต้องแยก required invariant ออกจาก optional/auto-hide section.

## 28.25 ITA Validation

ก่อน Publish Fiscal Year ตรวจ:

- Fiscal Year / MOIT / Requirement structure valid
- Evidence relationship ไม่ corrupted
- required publication metadata ครบ
- Evidence resource ที่ผูกไว้ available ตามชนิด resource
- External URL format/security valid

Missing Evidence เป็น **Warning by default** ใน Version 1 ไม่ใช่ automatic publication blocker และไม่กลายเป็น compliance score.

> **Operational completeness ≠ Compliance scoring.**

## 28.26 Cross-Record Validation Must Stay Local

การ Publish record ตรวจ:

- record ปัจจุบัน
- direct required relations/resources
- invariants ที่จำเป็นต่อ transition

ไม่ scan CMS ทั้งระบบหรือทำ global health check ก่อน Publish.

## 28.27 Deterministic Validation

Validation ต้อง deterministic: rule เดียวกัน + data เดียวกัน → result เดียวกัน.

Version 1 ไม่มี AI quality gate, readability/SEO score gate, tone score, factuality score หรือ subjective automated publish blocker.

## 28.28 Warning Override

Warnings ที่ non-blocking ให้ Publisher ดำเนินการต่อได้โดยไม่ต้องกรอก Reason ทุกครั้ง.

ถ้าอนาคต warning บางประเภทต้อง acknowledgement จริง ให้เพิ่มเฉพาะ use case นั้นผ่าน review แทนการสร้าง universal warning-override workflow.

## 28.29 No Force Publish

Error ไม่มี `Publish Anyway`, `Ignore Errors` หรือ Administrator override.

Administrator ยังต้องผ่าน Domain/public integrity invariants. หาก validation rule ผิดให้แก้ rule ผ่าน controlled design change ไม่ใช่ bypass.

## 28.30 Human-Readable Validation Messages

Primary UI ใช้ข้อความงาน เช่น:

```text
เอกสารที่แนบยังไม่เผยแพร่
```

ไม่ใช่ raw code เช่น `document.status != PUBLISHED`.

Backend สามารถใช้ internal error code ได้ แต่ UI map เป็นข้อความที่ staff เข้าใจ.

## 28.31 Error / Warning Summary

เมื่อมีหลาย issue CMS อาจแสดง:

```text
ไม่สามารถเผยแพร่ได้

ข้อผิดพลาด 2 รายการ
- ...
- ...

คำเตือน 1 รายการ
- ...
```

พร้อม focus/navigation ไปจุดที่แก้ได้.

## 28.32 Readiness Is Derived, Not Stored Truth

ไม่ใช้ permanent `is_publish_ready = true` เป็น authority เพราะ data/relations เปลี่ยนได้.

Readiness เป็น derived result; อาจ cache เพื่อ UX ได้ แต่ public-impact commit ต้องคำนวณจาก current state ใหม่.

## 28.33 Scheduled Execution Uses Current Valid State

Scheduled execution ใช้ current scheduled record/version และ current required resource state ไม่เชื่อ stale readiness snapshot.

รายละเอียด storage/version strategy defer ไป `10-system-blueprint.md`.

## 28.34 Concurrency, Authorization and Lifecycle Remain Separate

ก่อน commit:

- stale record → Conflict
- ไม่มี authority → Permission Denied
- transition ไม่ allowed → Lifecycle/State Error
- data ไม่พร้อม → Validation Error

ห้ามรวมทั้งหมดเป็น “Validation Failed”.

## 28.35 Conceptual Validation Order

Baseline:

```text
1. Authentication / Account
2. Authorization
3. Current State / Transition
4. Concurrency
5. Structural Validation
6. Domain Validation
7. Relationship / Resource Validation
8. Commit
```

Exact optimization orderใน implementationปรับได้ตราบใดที่ semantics/security ไม่เปลี่ยน.

## 28.36 Validation Audit Boundary

Validation failure ปกติไม่สร้าง staff Audit event ทุกครั้ง.

Meaningful successful public/lifecycle transitionยัง Audit ตาม Section 26.

Security/risk logging ของ repeated invalid/forbidden requests defer ไป System Blueprint.

## 28.37 Version 1 Exclusions

Version 1 ไม่รวม:

- publish readiness percentage/score
- AI quality/SEO/factuality/tone publish gate
- global CMS health scan before Publish
- Force Publish / validation override
- mandatory Reason for normal warnings
- dynamic/admin-editable validation rule builder
- custom validation scripts/workflow designer
- continuous external-link monitoring
- automatic repair of broken relationships
- auto-publish related resources
- background quality-approval engine

---

# 29. Accepted Publishing Validation & Readiness Rules

**Section 28 = Accepted Publishing Validation & Readiness Rules**

Accepted baseline:

- Version 1 separates Draft Validation, Publish Readiness, and Runtime/Transition Validation.
- Draft may be incomplete but may not be structurally invalid.
- Publish and Schedule use the same full publication-readiness rules.
- Scheduled execution rechecks current runtime invariants before public commit.
- Validation rules derive from the Content Model and Domain semantics, not presentation preferences.
- Errors block public-impact transitions; Warnings inform judgment and remain non-blocking by default.
- Warnings never weaken invariants required for a valid public state.
- Readiness is derived from current state; backend validation is authoritative at commit time.
- Required, Optional, and Conditional relationships are distinguished explicitly.
- Related resources are validated according to public meaning; parent publication never auto-publishes a related resource.
- External URL remote availability failures are Warnings by default when syntax/security validation passes.
- Health Content review status remains operational metadata and does not automatically unpublish valid content.
- ITA missing Evidence remains a Warning by default in Version 1 and does not become a compliance score/publication blocker.
- Homepage validation distinguishes required invariants from optional sections that can safely hide.
- Administrator cannot Force Publish through validation errors.
- Validation messages are human-readable and located near the problem with concise Error/Warning summaries where useful.
- Validation remains deterministic and does not use AI, readiness scoring, dynamic rule builders, or subjective automated gates in Version 1.

---

# 30. Scheduled Publishing Execution & Failure Recovery

Scheduled Publishing ใน Version 1 ต้องมี reliability เท่าที่จำเป็นต่อ public-impact workflow โดยไม่ยกระดับ CMS ให้กลายเป็น general-purpose queue platform.

หลักสำคัญ:

> **Scheduling commits publication intent; execution must be safe, idempotent, and recoverable.**

> **A failed scheduled publish must never create a partially published public state.**

## 30.1 Eligible Scheduled Records

Scheduler ประมวลผลเฉพาะ record ที่ current state เป็น `Scheduled` และ `scheduled_at <= now`.

Draft ที่มีวันที่อยู่ใน field หรือ Published record ที่เคยถูก Schedule มาก่อนไม่ถือเป็น due work.

`Scheduled` เป็น conceptual source of truth ของ publication intent ที่รอ execution.

## 30.2 Timezone and Timing Precision

Publishing intent ใช้ timezone baseline `Asia/Bangkok` ตาม Section 21.

Version 1 ไม่รับประกัน second-level precision. Scheduled Publishing ต้อง timely และ predictable แต่ไม่ใช่ realtime system.

ตัวอย่าง: รายการที่ตั้งไว้ 09:00 และถูก execute 09:01–09:02 หลัง scheduler รอบถัดไปยังถือเป็น normal successful execution.

รายละเอียดว่าจะ persist UTC หรือ timezone-aware timestamp แบบใด defer ไป `10-system-blueprint.md`.

## 30.3 Catch-Up After Downtime

Due selection ต้องใช้เงื่อนไข `scheduled_at <= now` ไม่ใช่ “เวลาเท่ากับนาทีปัจจุบัน”.

ดังนั้นหากระบบหยุดช่วงหนึ่ง เมื่อกลับมาทำงาน Scheduled record ที่เลยเวลาแล้วยังต้องถูกประมวลผลแบบ catch-up และไม่ถูกลืม.

## 30.4 Idempotent Execution Boundary

Scheduled publication ต้องป้องกัน duplicate public commit แม้มี overlapping scheduler run หรือ execution ถูกเรียกซ้ำ.

Conceptual requirement:

```text
Scheduled record X
→ overlapping execution attempts
→ at most one valid Scheduled → Published transition
```

ไม่ assume ว่า Cron/process จะไม่มีวัน overlap.

Exact locking/transaction/idempotency technique defer ไป System Blueprint.

## 30.5 Current State Is Rechecked at Commit

การเลือก record ว่า due ไม่ทำให้ execution มีสิทธิ์ publish โดยอัตโนมัติ.

ก่อน public commit ระบบต้องอ่าน/ตรวจ current committed state อีกครั้ง.

ถ้า Publisher ยกเลิก Schedule สำเร็จก่อน commit:

```text
Scheduled → Cancel Schedule → Draft
```

execution เก่าต้องไม่ Publish.

> **The most recently committed valid state controls execution.**

## 30.6 Cancel / Reschedule Race Semantics

ถ้า Cancel หรือ Reschedule commit ก่อน publication commit การเปลี่ยนนั้นต้องชนะ.

ถ้า publication commit สำเร็จก่อน:

- record เป็น Published แล้ว
- Cancel Schedule / Reschedule ที่อิง Scheduled state ต้อง fail ด้วย current-state/concurrency semantics
- ระบบไม่ rollback Published state เพียงเพราะ UI อีกหน้าหนึ่งยังเปิดข้อมูลเก่าอยู่

Reschedule ใช้หลักเดียวกัน: schedule เวลาใหม่ที่ commit แล้วต้องป้องกัน execution จากเวลาเก่า.

## 30.7 Runtime Invariants Are Revalidated

ก่อน `Scheduled → Published` ระบบ recheck เฉพาะ runtime/public-state invariants ที่ยังเปลี่ยนได้ เช่น:

- record ยังเป็น Scheduled
- scheduled time ถึงกำหนดแล้ว
- required related resources ยัง public-valid/available
- required relationships ยัง consistent
- transition ยัง allowed
- current scheduled record ยังผ่าน blocking readiness rules
- concurrency/current version ยังถูกต้อง

ไม่จำเป็นต้อง rerun non-blocking editorial warnings เพื่อสร้าง notification ซ้ำ.

## 30.8 Successful Execution

เมื่อ validation และ current-state checks ผ่าน:

```text
Scheduled
→ Published
```

public commit ต้องเกิดครบถ้วน แล้วจึง:

- บันทึก actual publication timestamp
- จบ pending schedule semantics
- สร้าง meaningful Audit event
- รักษา attribution ว่าใครเป็นผู้ตั้ง Schedule

ไม่ต้องมี business lifecycle state `Publishing...`.

## 30.9 Failure Remains Scheduled

ถ้า Scheduled execution ไม่สำเร็จ:

```text
Scheduled
+ Operational Failure Condition
```

record **ไม่** เปลี่ยนเป็น:

- Draft
- Published
- `Failed` lifecycle state

เพราะ publication intent ยังไม่ได้ถูกยกเลิก.

## 30.10 Failure Must Be Atomic and Safe

Failure ห้ามสร้าง partial public state.

ตัวอย่าง Document Replacement:

```text
A = Published current Document
B = Scheduled successor
```

ถ้า B publish ไม่สำเร็จ:

```text
A remains Published
B remains Scheduled + failure
```

ห้ามให้ A กลายเป็น Superseded ก่อน B สำเร็จ.

Homepage scheduling applies only to eligible temporal placements. A failed placement activation never invalidates or partially replaces the current Published Homepage; the placement follows accepted fallback/hide behavior and surfaces an actionable warning.

## 30.11 Retry Is Bounded and Operationally Calm

Version 1 อาจ retry Scheduled record ที่ยัง due ใน scheduler รอบถัดไป แต่ไม่สร้าง rapid/unbounded retry loop.

Requirements:

- automatic retry อาจมีได้
- ต้องมี bound/threshold ที่เหมาะสม
- repeated attempts ไม่สร้าง staff-facing noise อย่างต่อเนื่อง
- exact cadence/count/backoff เป็น implementation detailใน System Blueprint

ไม่มี configurable retry policy ใน CMS Settings.

## 30.12 Failure Visibility

Scheduled failure ต้อง surfaced เป็น actionable operational condition ตาม Notification baseline ของ `05-admin-cms.md`.

UI ควรแสดง human-readable reason เช่น:

> ไม่สามารถเผยแพร่ตามกำหนดได้ — เอกสารที่เกี่ยวข้องไม่อยู่ในสถานะพร้อมเผยแพร่

พร้อมทางเปิด record เพื่อแก้สาเหตุ.

ไม่แสดง stack trace หรือ internal error code เป็น primary staff UX.

## 30.13 No Job / Queue Administration UI

Version 1 ไม่ต้องมี:

- Retry Job
- Requeue Job
- Force Job
- worker dashboard
- queue administration
- attempt-history console

staff แก้ที่ record/workflow เดิม:

- Fix + Save Scheduled Changes
- Reschedule
- Publish Now
- Cancel Schedule

## 30.14 Fix the Cause, Not the Notification

Operational failure warning ควรหายเมื่อ underlying cause ถูกแก้และ record กลับมาอยู่ใน valid scheduled condition.

ไม่ต้องมี `Mark Resolved` สำหรับ Scheduled Publish failure.

## 30.15 Manual Recovery Actions

Publisher ที่ยังมี authority สามารถเลือก:

```text
Scheduled + failure → Publish Now → Published
```

ถ้า current validation ผ่าน.

หรือ:

```text
Scheduled + failure → Cancel Schedule → Draft
```

หรือ:

```text
Scheduled + failure → Reschedule → Scheduled
```

successful Save/Reschedule ควร clear stale operational failure condition ที่ไม่ตรงกับ current state แล้ว.

## 30.16 Scheduler Does Not Repair Content

Scheduler มีหน้าที่:

```text
Validate current state
→ Publish safely
or
→ Fail safely
```

ห้าม auto-repair เช่น:

- เติม required field
- ลบ broken relation
- auto-publish related Document
- ignore validation error
-เปลี่ยน user intent เพื่อให้ execution ผ่าน

## 30.17 Failure Does Not Auto-Cancel Intent

แม้ execution fail ซ้ำ ระบบไม่เปลี่ยน `Scheduled → Draft` หรือยกเลิก schedule โดยอัตโนมัติ.

การ Cancel Schedule เป็น explicit user/publication decision.

## 30.18 Scheduled Attribution Survives User Changes

ควรรักษา conceptual metadataที่ตอบได้ว่า:

- Scheduled By
- Scheduled At
- Scheduled For
- Actual Published At
- execution outcome

เมื่อ automatic execution สำเร็จ System เป็น execution actor ได้ แต่ต้องไม่ทำให้ human scheduling attribution หาย.

## 30.19 Disabled Scheduler Does Not Cancel Work

ยืนยัน baseline จาก `06-roles-permissions.md`:

- User ถูก Disabled ภายหลัง → valid committed schedule ยังคงอยู่
- Role/Module Scope ถูกลดภายหลัง → valid committed schedule ยังคงอยู่

schedule เป็น organizational state ไม่ใช่งานส่วนตัวของ user.

ผู้มี authority ปัจจุบันสามารถ Cancel/Reschedule ได้ผ่าน workflow ปกติ.

## 30.20 Current Scheduled Record Is Published, Not an Old Snapshot

Scheduled execution ใช้ current valid Scheduled record/version ที่ผ่าน validation ล่าสุด.

Version 1 ไม่สร้าง scheduled revision tree หรือ snapshot chain แยกสำหรับทุก edit.

รายละเอียด persistence/version implementation defer ไป System Blueprint.

## 30.21 Catch-Up Ordering Is Simple

เมื่อมีหลาย due records หลัง downtime ระบบสามารถประมวลผลตาม deterministic/simple ordering ที่ implementation เลือกได้.

ไม่ต้องรักษา millisecond ordering และไม่ต้องสร้าง arbitrary dependency graph ระหว่าง scheduled content.

Exception มีเฉพาะ Domain semantics ที่ต้อง atomic จริง เช่น Document replacement.

## 30.22 Document Replacement Dependency

Scheduled successor Document ใช้ semantic transaction เดียวกับ Section 26:

ก่อน publish:

```text
A = Published
B = Scheduled replacement
```

เมื่อ B สำเร็จ:

```text
B → Published
A → Superseded
A.successor → B
```

ทั้งหมดต้อง commit ใน public-valid transition เดียว.

ถ้า B fail → A ไม่เปลี่ยน.

## 30.23 Idempotency Does Not Require a Queue Platform

Requirement เรื่อง duplicate prevention / race safety ไม่ได้บังคับให้ Version 1 ใช้:

- Redis queue
- RabbitMQ
- Kafka
- worker fleet

Simple scheduler/job runner ที่เหมาะกับ hostingยังใช้ได้ ถ้ารักษา behavior requirements ได้.

Infrastructure choice defer ไป `10-system-blueprint.md`.

## 30.24 Staff-Facing Failure History Remains Minimal

UI ปกติไม่ต้องแสดง attempt #1/#2/#3 แบบ job console.

แสดงเพียงข้อมูลที่ staffใช้ตัดสินใจได้ เช่น:

- failure ล่าสุด
- เวลา
- human-readable reason
- action เปิด record

retry count และ technical attempt logs อาจเป็น internal operational data.

## 30.25 Success Is Quiet; Failure Is Actionable

Scheduled successไม่สร้าง persistent notificationทุกครั้ง.

เมื่อสำเร็จ:

- state/recordแสดง Published
- Audit บันทึก execution

เมื่อ fail:

- Dashboard/recordแสดง actionable failure condition

สอดคล้องกับ Notification rule ใน `05-admin-cms.md`.

## 30.26 Expiry Automation Is a Separate Semantic Transition

Announcement automatic Expiry:

```text
Published → Expired
```

เป็น Domain lifecycle automation คนละความหมายกับ:

```text
Scheduled → Published
```

แม้ implementation อาจใช้ scheduling mechanismร่วมกันได้.

ห้ามรวม Audit/action semantics สองประเภทเข้าด้วยกัน.

## 30.27 Expiry Must Also Be Idempotent

ถ้า scheduler/systemตรวจ Announcement เดิมหลายครั้ง `Published → Expired` ต้องเกิดเชิง lifecycleครั้งเดียวและไม่สร้าง duplicate Audit eventทุก run.

ถ้า automatic expiry executionขัดข้อง public pageต้องไม่ถูก partial delete/hide; systemสามารถ catch up ในรอบถัดไป.

## 30.28 Audit Boundary for Scheduled Work

Meaningful eventsที่ควร Audit ได้แก่:

- Schedule Created
- Schedule Rescheduled
- Schedule Cancelled
- Scheduled Publication Succeeded
- meaningful Scheduled Publication Failure
- Manual Publish Now from Scheduled
- system-driven Expiry transition

Repeated retriesที่เกิดจากสาเหตุเดิมไม่ควร flood normal Audit Log.

Technical retry detailsอยู่ใน operational/security logsตาม implementation.

## 30.29 Content/Domain Failure vs System Failure

CMS ต้องแยกอย่างน้อยเชิง UX:

**Content/Domain Failure** — staffแก้ข้อมูลได้ เช่น required Document ไม่พร้อม.

**System/Execution Failure** — infrastructure/serviceขัดข้องและ staffทั่วไปอาจแก้ไม่ได้.

System failureไม่ทำให้ contentกลายเป็น invalid state และ recordยัง Scheduled เพื่อ catch-up/retry เมื่อระบบกลับมาทำงาน.

## 30.30 No Hidden System Bypass

System actor ไม่ใช่ Administrator override.

Scheduled Publish และ Expiry ที่ทำโดยระบบต้อง obey current state/integrity invariants เช่นเดียวกับ manual public-impact action.

## 30.31 Version 1 Exclusions

Version 1 deliberately excludes:

- realtime / second-perfect scheduler guarantees
- recurring schedules
- job/queue admin UI
- manual requeue console
- worker dashboard
- priority queues
- arbitrary scheduled-content dependency graphs
- scheduled batch/campaign platform
- CMS-configurable retry policies
- custom retry policy per Module
- end-user technical job logs
- automatic content repair
- automatic schedule cancellation after failure
- automatic schedule reassignment when scheduler user is Disabled
- persistent external notification for every successful schedule

Exact Cron cadence, queue technology, database locking, transaction mechanics, retry count/backoff และ worker topology defer ไป `10-system-blueprint.md`.

---

# 31. Accepted Scheduled Publishing Execution & Failure Recovery

**Section 30 = Accepted Scheduled Publishing Execution & Failure Recovery**

Accepted baseline:

- Version 1 processes only records currently in Scheduled state whose scheduled time is due or overdue.
- Due selection supports catch-up after downtime and does not depend on matching an exact minute/second.
- Scheduled publishing must be idempotent and safe against overlapping execution.
- Current committed state is rechecked at execution time; Cancel/Reschedule committed first prevents old execution from publishing.
- If publication commits first, later Cancel/Reschedule fails against Published state rather than rolling publication back.
- Scheduled execution revalidates current runtime/public invariants before commit.
- Failure leaves the record Scheduled with an actionable failure condition; no Draft fallback and no separate Failed lifecycle state.
- Failed execution cannot create a partial public state; current Document remains valid until successor publication succeeds, and Homepage placement activation fails safely without disturbing the valid Published Homepage.
- Retry may be automatic but is bounded, calm, and implementation-defined; Version 1 has no job/retry management console.
- Fixing the cause clears stale failure conditions; staff do not manually mark scheduler warnings resolved.
- Disabled schedulers and later Role/Scope changes do not cancel previously committed organizational schedules.
- Execution publishes the current valid Scheduled record, not an obsolete snapshot/revision tree.
- Document replacement preserves atomic successor Published + predecessor Superseded semantics.
- Expiry automation is semantically separate from scheduled publication and is idempotent.
- Audit preserves human scheduling attribution and system execution while repetitive retries remain technical logs rather than Audit noise.
- System actor never bypasses lifecycle, validation, concurrency, or integrity invariants.
- Scheduler infrastructure details remain deferred to `10-system-blueprint.md`.

---

# 32. Optional Approval Workflow & Direct Publish Coexistence

Approval Workflow เป็น optional publishing path ไม่ใช่ authorization system ชุดใหม่ และต้องไม่ทำให้ workflow ปกติซับซ้อนขึ้นเมื่อไม่ได้ใช้งาน.

หลักสำคัญ:

> **Approval is an optional publishing path, not a second authorization system.**

> **When Approval is disabled, the CMS should behave as if the approval workflow does not exist.**

## 32.1 Default Remains Direct Publish

Version 1 baseline:

```text
Approval Workflow = OFF
```

เมื่อ Approval ปิด:

```text
Editor
→ Save Draft

Publisher
→ Save Draft
→ Publish
→ Schedule
```

UI ไม่แสดง Pending Review, Approve, Return for Revision หรือ Review Queue โดยไม่มีความจำเป็น.

## 32.2 Approval Is Configuration, Not Workflow Builder

Approval สามารถเปิด/ปิดได้อย่างชัดเจน แต่ Version 1 ไม่มี multi-stage workflow designer, routing rule หรือ approval chain แบบ enterprise.

เมื่อเปิด Approval ใช้ workflow ระดับเดียว:

```text
Draft
→ Submit for Review
→ Pending Review
   ├── Return for Revision → Draft
   └── Approve → Approved
                  ├── Publish → Published
                  └── Schedule → Scheduled
```

## 32.3 Approved Is a Workflow State, Not a Public State

`Approved` หมายถึง publication package ผ่านการตรวจและ publish-ready ณ เวลาที่ Approve แต่ยังไม่ Public.

```text
Approved ≠ Published
```

เชิง architecture ให้แยกความหมายของ Editorial Workflow ออกจาก Public Publishing Lifecycle แม้ UI จะสรุปสถานะให้ staff อ่านง่าย.

## 32.4 Submit for Review

User ที่มี Edit authority ใน Module สามารถ Submit Draft ได้ โดย baseline คือ Editor และ Publisher ที่มี Module Scope.

Submit for Review ไม่ใช่ public-impact action จึงไม่ต้องใช้ Publish authority.

Submission Validation ตรวจว่า record มีสาระและโครงสร้างเพียงพอให้ review ได้ แต่ไม่จำเป็นต้องเท่ากับ full Publish Readiness ทุกจุด.

## 32.5 Review / Return / Approve

Version 1 ไม่สร้าง Role `Reviewer` หรือ `Approver` เพิ่ม.

เมื่อ Approval เปิด:

```text
Editor
→ prepare
→ submit

Publisher
→ submit
→ review
→ return for revision
→ approve
→ publish / schedule

Administrator
→ same within all Modules
```

Approval actions derive จาก Role semantics เดิมและ Module Scope ไม่ใช่ per-user override.

## 32.6 No Mandatory Different-Person Rule in Version 1

Version 1 ไม่บังคับว่า Submitted By ต้องต่างจาก Approved By และไม่ claim ว่า Approval นี้เป็น formal segregation-of-duties control.

ถ้าหน่วยงานมี operational policy ให้คนอื่นเป็นผู้ตรวจ สามารถใช้กระบวนการทำงานจริงได้ แต่ระบบยังไม่ enforce two-person rule.

Requirement เรื่อง mandatory dual control หรือ self-approval prohibition หากเกิดขึ้นจริงในอนาคตต้องเป็น versioned cross-document update.

## 32.7 Pending Review Is Stable for Review

Pending Review ไม่ควรถูกแก้ content ตรง ๆ ระหว่าง reviewer กำลังตรวจ.

หากต้องแก้:

```text
Pending Review
→ Return for Revision
→ Draft
```

หรือผู้มี Edit authority ถอนการส่ง:

```text
Pending Review
→ Withdraw Submission
→ Draft
```

เพื่อให้ reviewer ไม่ตรวจ package ที่เปลี่ยนไปโดยไม่รู้ตัว.

## 32.8 Return for Revision Requires a Concise Reason

`Return for Revision` ควรบังคับ reason/comment แบบสั้นเพื่อบอกผู้แก้ว่าต้องปรับอะไร.

เหตุผลไม่ต้องบังคับสำหรับ routine actions เช่น Submit, Approve, Publish หรือ Schedule.

## 32.9 Approval Requires Full Publish Readiness

เมื่อ `Pending Review → Approve` ระบบต้อง recheck current authorization, state, concurrency และ full Publish Readiness.

ดังนั้นคำว่า `Approved` มีความหมายว่า:

> **publication-ready at approval time**

Approval ไม่ใช่การรับรอง record ที่ยังขาด blocking requirement.

## 32.10 Editing After Approval Invalidates Approval

Any persisted content change หลัง Approval ที่มีผลต่อ publication package ทำให้ Approval เดิมสิ้นผล.

```text
Approved
→ Reopen for Editing
→ Draft
```

Version 1 ไม่แบ่ง minor/major edit และไม่พยายามคง Approval สำหรับ typo หรือ field บางประเภท.

Technical metadata ที่ระบบเปลี่ยนเองและไม่ใช่ publication content ไม่ถือเป็น content edit.

## 32.11 Approved Still Revalidates at Publish/Schedule Commit

Approved ไม่ใช่ cache ของ readiness.

```text
Approved
→ Publish
→ current authorization + readiness + concurrency check
→ Published
```

และ:

```text
Approved
→ Schedule
→ current authorization + readiness + future-time check
→ Scheduled
```

Related resources อาจเปลี่ยนระหว่าง Approve และ Publish จึงต้อง validate ซ้ำ ณ commit.

## 32.12 Approval Metadata After Scheduling

เมื่อ Approved item กลายเป็น Scheduled current lifecycle คือ Scheduled.

ระบบยังเก็บ attribution เช่น:

- Approved By
- Approved At
- Scheduled By
- Scheduled For

แต่ไม่ต้องแสดง `Approved + Scheduled` เป็นสอง primary states พร้อมกัน.

Scheduled execution ไม่ต้อง Approve ซ้ำถ้า package ไม่กลับ Draft.

## 32.13 Cancel Schedule Invalidates Prior Approval

ตาม baseline เดิม:

```text
Scheduled
→ Cancel Schedule
→ Draft
```

เมื่อกลับ Draft Approval เดิมสิ้นผลด้วย เพื่อหลีกเลี่ยง ambiguity ว่าการแก้หลัง Cancel ยังครอบคลุมด้วย Approval เดิมหรือไม่.

หาก Approval Workflow ยังเปิดอยู่ การ Publish/Schedule ใหม่ต้องผ่าน Submit/Review/Approve ใหม่.

`Scheduled → Publish Now` ยังไม่ต้อง Approve ใหม่เพราะไม่กลับ Draft.

## 32.14 Direct Publish and Approval Must Not Be Ambiguous

เมื่อ Approval OFF:

```text
Draft
→ Publish / Schedule
```

สำหรับ Publisher.

เมื่อ Approval ON สำหรับ Module:

```text
Draft
→ Submit for Review
→ Pending Review
→ Approved
→ Publish / Schedule
```

Publisher ไม่ควรมี Draft → Publish shortcut ที่ bypass Approval ใน Module เดียวกัน มิฉะนั้น Approval configuration จะไม่มีความหมาย.

## 32.15 Approval Is Configured Per Eligible Module

Version 1 ใช้ **Per-Module Approval Toggle** ไม่ใช่ per-user และไม่ใช่ per-record.

เหตุผลคือบาง Domain อาจต้องตรวจ แต่บาง Domain ต้อง Direct Publish เพื่อความคล่องตัว.

Approval eligibility baseline:

- News
- Activity
- Announcement
- Health Content
- Health Report
- Basic Page
- Service
- Document
- Homepage Configuration
- ITA Fiscal Year

Version 1 ไม่ใช้ Approval Workflow กับ entity/configuration lifecycles เช่น:

- Personnel
- Health Service
- Organization
- Contact Information

กลุ่มดังกล่าวยังใช้ Publisher-level Activate/Save Changes/Inactive semantics ตาม `06` และ Sections ก่อนหน้า.

## 32.16 Approval Is Never Per Record

Editor/Publisher ไม่มี checkbox เช่น `ต้องอนุมัติรายการนี้` เพื่อเปิด/ปิด workflow เอง.

Approval requirement มาจาก Module configuration เพื่อป้องกันการ bypass policy โดยผู้แก้ record.

## 32.17 Document Approval

Document สามารถใช้ Approval เมื่อ Module toggle เปิด:

```text
Draft Document
→ Submit
→ Pending Review
→ Approved
→ Publish
```

สำหรับ successor replacement:

```text
Draft Successor
→ Review
→ Approved
→ Publish as Replacement
```

atomic Published successor + Superseded predecessor semantics ยังคงเหมือนเดิม.

## 32.18 ITA Approval

Publication unit ของ ITA คือ Fiscal Year package ไม่ใช่ Evidence หรือ Requirement ทีละรายการ.

```text
ITA Fiscal Year Draft
→ Submit
→ Pending Review
→ Approved
→ Publish
```

Editor ยังจัด Evidence ใน Draft ได้ตาม permission เดิม.

## 32.19 Homepage Approval

Homepage Draft Configuration สามารถใช้ Approval เช่นเดียวกับ publishable package:

```text
Draft
→ Submit
→ Pending Review
→ Approved
→ Publish
```

Approval ของ Homepage ไม่ได้ Approve source content เช่น News หรือ Service ซ้ำ; แต่ละ resource รักษา lifecycle ของตัวเอง. Placement-level scheduling (Urgent Alert / Featured / Health Information where enabled) remains separate from whole-Homepage approval/publishing.

## 32.20 Approval Never Cascades

> **Approving a parent does not approve related resources.**

ตัวอย่าง News ที่อ้าง Draft Document ยังไม่สามารถ Approved/Published แบบ bypass Document lifecycle ได้หาก Document ต้อง public-ready.

ไม่มี auto-approve หรือ auto-publish related resource.

## 32.21 Lightweight Review Queue

เมื่อ Approval เปิด Work Dashboard อาจแสดง actionable counts เช่น:

```text
รอตรวจ
- ข่าวประชาสัมพันธ์ 3
- ความรู้สุขภาพ 2
```

เฉพาะ Publisher/Administrator ที่มีสิทธิ์ใน Module นั้น.

ไม่สร้าง enterprise workflow inbox, assignment queue หรือ work orchestration subsystem.

## 32.22 No Reviewer Assignment or Claiming in Version 1

Pending Review อยู่ใน Module queue และ Publisher คนใดที่มี Module Scope สามารถ Review ได้.

Version 1 ไม่มี:

- named reviewer assignment
- reassignment
- reviewer workload
- review due date / SLA
- escalation
- claim / lock ownership

Optimistic concurrency ใช้แก้กรณี reviewer สองคนทำ action พร้อมกัน.

## 32.23 Approval Notifications Remain Minimal

- Submit for Review → actionable Dashboard item
- Return for Revision → actionable Dashboard itemแก่ผู้เกี่ยวข้อง
- Approve success → ไม่ต้อง persistent notification
- Publish/Schedule success → ไม่ต้อง persistent notification

Version 1 ไม่มี email/LINE/SMS/push approval routing.

## 32.24 Approval Comment Is Not Collaboration Chat

Return reason เป็น concise workflow note.

ไม่สร้าง comment thread, mentions, reactions, attachments-on-comments หรือ reviewer chat.

## 32.25 Published Changes When Approval Is Enabled

Version 1 Approval ครอบคลุม publication package จาก Draft แต่ **ไม่สร้าง proposed revision branch สำหรับ already Published content**.

ดังนั้นเมื่อ Approval ON:

```text
Published
→ Publisher edits
→ Save Changes
→ Published updated
```

ยังคงใช้ direct Publisher-level public-impact action ตาม baseline เดิม.

นี่เป็น deliberate Version 1 limitation เพื่อไม่แอบสร้าง revision workflow ครึ่งระบบ.

## 32.26 Known Version 1 Approval Limitation

Approval Workflow v1 ไม่ใช่ formal change-control system สำหรับแก้ live content.

หาก requirement ในอนาคตคือ:

> การแก้ Published content ทุกครั้งต้องมี reviewer อนุมัติก่อนขึ้นเว็บ

ต้องเพิ่ม model แบบ:

```text
Published Version
+ Proposed Revision
→ Review
→ Approve
→ Replace Published Version
```

ซึ่งเป็น revision-approval workflow จริงและต้องผ่าน versioned cross-document update.

## 32.27 Changing Approval Configuration Is Prospective

การเปิด Approval:

- Draft เดิมยัง Draft แต่ต้องเข้าสู่ Approval path ก่อน Publish ในครั้งถัดไป
- Published เดิมไม่เปลี่ยน
- Scheduled ที่ commit ก่อนเปิด Approval ไม่ถูกยกเลิก

การเปลี่ยน configuration ไม่ rewrite committed publication history.

## 32.28 Approval Cannot Be Disabled with Unresolved Review Work

ถ้า Module ยังมี Pending Review หรือ Approved item ที่ยังไม่ Publish/Schedule ระบบไม่ควรปิด Approval toggle ทันที.

CMS แจ้งให้จัดการรายการค้างก่อน เพื่อหลีกเลี่ยง automatic state migration ที่ตีความยาก.

Committed Scheduled items ที่เคยผ่าน Approval ยัง execute ตามปกติ.

## 32.29 Workflow Capabilities Derive from Existing Role Semantics

Conceptually backend อาจมี actions เช่น:

- submit_for_review
- review
- return_for_revision
- approve

แต่ Version 1 ไม่ expose เป็น per-user capability matrix และไม่สร้าง custom role definitions.

Editor/Publisher/Administrator semantics เป็นผู้กำหนด actions เหล่านี้ร่วมกับ Module Scope.

## 32.30 Approval Audit Boundary

Meaningful Approval events ต้อง Audit:

- Submitted for Review
- Submission Withdrawn
- Returned for Revision
- Approved
- Approval Invalidated / Reopened for Editing
- Published or Scheduled after Approval

Return reason ถูกเก็บร่วมกับ transition event.

Routine view/review activity ไม่สร้าง Audit noise.

## 32.31 Version 1 Exclusions

Version 1 deliberately excludes:

- multi-stage approval
- named reviewer assignment
- reviewer groups
- mandatory two-person approval
- self-approval prohibition
- field-level approval
- per-record approval toggle
- workflow builder
- SLA / deadlines / escalation
- reviewer discussion threads
- mentions / chat
- approval via email/LINE/SMS/push
- approval delegation / temporary approver
- bulk approve
- auto-approve
- AI approval/scoring
- published revision branches
- compare/merge revisions
- formal segregation-of-duties engine

---

# 33. Accepted Optional Approval Workflow & Direct Publish Coexistence

**Section 32 = Accepted Optional Approval Workflow & Direct Publish Coexistence**

Accepted baseline:

- Approval Workflow is optional, OFF by default, and invisible in normal staff workflow while disabled.
- Approval is a publishing path, not a replacement for Roles, Permissions, or public-impact authorization.
- Version 1 uses one lightweight stage: Draft → Pending Review → Approved → Publish/Schedule where that Module supports scheduling; Homepage Configuration itself ends in Publish while eligible placements may schedule independently.
- Editors and Publishers may Submit; Publishers and Administrators may Review, Return, and Approve within their authorized Module Scope.
- Version 1 does not enforce different-person approval and does not claim formal segregation-of-duties compliance.
- Pending Review is not edited in place; it is Withdrawn or Returned to Draft before content editing.
- Return for Revision requires a concise reason; routine workflow actions do not require mandatory reasons.
- Approval requires full Publish Readiness so Approved means publication-ready at approval time.
- Any persisted publication-content edit after Approval invalidates Approval and returns the package to Draft; no minor/major edit distinction in Version 1.
- Publish/Schedule still recheck current authorization, readiness, state, and concurrency after Approval.
- Cancel Schedule returns to Draft and invalidates the prior Approval; Publish Now from Scheduled does not require re-approval.
- Approval requirements are configured per eligible publishable Module, never per User or per Record.
- Personnel, Health Service, Organization, and Contact configuration lifecycles remain outside Approval Workflow in Version 1.
- Approval never cascades to related resources; every resource retains its own lifecycle and authority.
- Review work is surfaced as lightweight actionable Dashboard work; no reviewer assignment, claim, SLA, or enterprise workflow inbox.
- Approval notifications remain minimal and in-CMS; no external routing channels in Version 1.
- Version 1 Approval governs publication from Draft but does not create proposed-revision approval for already Published content; Published edits remain Publisher-level direct Save Changes.
- Approval configuration changes are prospective and never cancel/rewrite already committed Published or Scheduled states.
- Approval cannot be disabled while unresolved Pending Review/Approved work remains.
- Approval actions may have internal capability names, but they derive from fixed Role semantics and are not configurable per user.
- Meaningful Approval transitions are audited; reviewer discussion/collaboration features are deliberately excluded.

---

# 34. Archival, Expiry, Supersession & Historical Visibility Rules

หลักสำคัญ:

> **Not current does not automatically mean not public.**

> **Historical information should remain available when it still has legitimate public value, but it must never be presented as current information.**

> **Lifecycle state and public discoverability are related, but they are not the same thing.**

## 34.1 Conceptual Visibility Classes

Version 1 แยกความหมายเชิงพฤติกรรมเป็น 3 กลุ่ม โดยไม่สร้าง universal visibility status เพิ่ม:

```text
Current Public
→ ข้อมูลปัจจุบันที่ควรปรากฏใน current surfaces

Historical Public
→ ยังเข้าถึงได้เพื่อประวัติ/อ้างอิง
→ ต้องไม่ถูกนำเสนอเหมือนข้อมูลปัจจุบัน

Non-Public
→ ไม่เปิดเผยต่อ Public Website
```

ตัวอย่าง:

```text
News Published → Current Public
News Archived  → Historical Public
News Draft     → Non-Public
```

`Historical Public` เป็น derived behavior จาก Domain + Lifecycle ไม่ใช่ field/status ใหม่.

## 34.2 Current Public Surfaces

Current surfaces เช่น Homepage, current listings, Featured, Frequently Used Services, current directories และ automatic recommendations ใช้เฉพาะ current-valid records โดย default.

Archived / Closed / Expired / Superseded / Inactive / Hidden records ต้องไม่กลับขึ้น current surfaces โดยไม่ตั้งใจ. `Hidden` is always Non-Public rather than Historical Public unless a separate public successor/record supplies the user-facing history.

## 34.3 Historical Page Presentation

Historical detail page ต้องแสดงสถานะตามภาษาของ Domain เช่น:

- `ข้อมูลย้อนหลัง`
- `ประกาศนี้หมดเขตแล้ว`
- `ประกาศนี้ปิดแล้ว`
- `เอกสารฉบับนี้ถูกแทนที่แล้ว`
- `บริการนี้ไม่ได้เปิดให้บริการในรูปแบบนี้แล้ว`

ไม่ใช้ generic label เดียวกับทุก Domain.

## 34.4 Canonical Identity Through Lifecycle

Archive / Close / Expire / Supersede ตามปกติไม่เปลี่ยน Public ID หรือ Canonical URL.

ไม่สร้าง `/archive/...` URL ใหม่เพียงเพราะ lifecycle เปลี่ยน และ lifecycle transition ไม่ได้แปลว่าต้อง redirect.

## 34.5 News and Activity

News / Activity ที่ Archived:

- detail page อาจยัง public เป็น historical information
- ออกจาก current listing
- ไม่ eligible สำหรับ Homepage / Featured
- อาจยัง discoverable เชิง historical ตาม Search policy ภายหลัง

Activity Date ที่ผ่านไปแล้วไม่ทำให้ Activity Archive/Expire อัตโนมัติ.

## 34.6 Announcement Closed / Expired / Archived

`Closed` และ `Expired` ยังคง Public Detail ได้เพื่อให้ประชาชนเข้าใจสถานะของกระบวนการเดิม.

```text
Closed  → แสดงว่า “ปิดแล้ว”
Expired → แสดงว่า “หมดเขตแล้ว”
```

ทั้งสองถูกตัดออกจาก current/open announcement surfaces แต่ไม่ auto-delete/auto-404.

ภายหลังสามารถ Archive ได้โดยยังรักษา historical identity.

## 34.7 Health Content Historical Safety

Archived Health Content อาจคง Historical Public ได้เมื่อยังมีคุณค่าด้านอ้างอิง แต่:

- ออกจาก current Health Content listing
- ออกจาก Homepage / Featured
- ไม่ถูก recommend เป็น current guidance
- ต้องมี context ชัดว่าเป็นข้อมูลย้อนหลัง / ควรตรวจสอบข้อมูลปัจจุบัน

ถ้า Archive เพราะข้อมูลผิด, unsafe, privacy/legal issue หรืออาจทำให้ประชาชนเข้าใจผิดอย่างมีนัยสำคัญ ให้ใช้ Permanent Withdrawal แทน normal Archive.

## 34.8 Health Report

Health Report ที่ Archived ยังคง Historical Public ได้โดย default เพราะรายงานย้อนหลังมี public-reference value สูง.

รายงานปีเก่าไม่ควรหายเพียงเพราะมีรายงานปีใหม่.

## 34.9 Basic Page

Basic Page ที่เลิกใช้สามารถ Historical Public ได้เมื่อมีเหตุผล แต่ system-required current pages เช่น Privacy Notice / Cookie Policy ต้องไม่ถูกทำให้ระบบไม่มี valid current page โดยไม่มี successor.

กฎนี้เป็น validation/lifecycle rule ไม่ใช่ state ใหม่.

## 34.10 Service

Archived Service:

- ออกจาก current Service Directory
- ออกจาก Frequently Used Services / current promotion
- historical detail อาจยัง public เพื่อรองรับ old links
- ต้องแสดงชัดว่าไม่ใช่บริการปัจจุบัน
- ถ้ามีบริการทดแทนควร link ไป current service อย่างมีความหมาย

## 34.11 Health Service Directory

`Temporarily Closed` ยังคงเป็น Current Public information เพราะประชาชนจำเป็นต้องรู้ว่าสถานบริการยังมีอยู่แต่หยุดชั่วคราว.

`Inactive`:

- ออกจาก current directory / current selection
- ไม่ถูกเสนอเป็น available service location
- historical relationships ยังคงอยู่
- historical public detail ถ้ามี ต้องไม่แสดงเหมือน current service

Exact search/filter behavior defer ไป `08-search.md`.

## 34.12 Personnel

เมื่อ Personnel เป็น `Inactive`:

- ออกจาก current Personnel view
- ออกจาก Leadership view
- ไม่ถูกเสนอเป็นบุคลากรปัจจุบัน
- historical News/Activity/Assignments ยังรักษาชื่อและ relation เดิม

Version 1 ไม่บังคับให้มี public profile ของอดีตบุคลากร หากไม่มี real use case; แนวทางนี้สอดคล้องกับ data minimization.

## 34.13 Organization

Inactive Internal/External Organization:

- ไม่ถูกเสนอเป็น current organization / default new-work choice
- historical relationships ยังคง render ได้
- ไม่ rewrite relation ของ content ย้อนหลัง

## 34.14 Contact Information

Public Website uses only Contact Information records whose current Visibility/Status permit Public presentation. `Internal` and `Hidden` Contact records are non-public and must not leak through Homepage/Footer/Contact rendering.

Contact changes preserve Audit attribution, but Version 1 does not create a public historical archive of old contact values by default. Historical references elsewhere are not rewritten merely because a Contact record changes lifecycle/visibility.

## 34.15 Superseded Documents

Superseded Document เป็น Historical Public โดยตั้งใจ:

```text
Document A (Published)
→ Superseded by Document B
```

หน้า A ต้อง:

- รักษา identity / URL / file เดิม
- แสดงชัดว่า `เอกสารฉบับนี้ถูกแทนที่แล้ว`
- link ไป current successor B อย่างชัดเจน

ห้าม silently replace A file ด้วย B file.

## 34.16 No Automatic Redirect for Superseded Documents

แม้มี successor, Document A ไม่ auto-redirect ไป B เพราะผู้ใช้/ITA/history อาจอ้างฉบับ A โดยเฉพาะ.

นี่เป็น deliberate exception จาก normal successor-routing semantics.

## 34.17 Archived Documents

Published Document ที่เลิกใช้โดยไม่มี successor สามารถเป็น Archived Historical Public ได้เมื่อยังมี legitimate historical value และต้องแสดงว่าไม่ใช่ฉบับปัจจุบัน.

## 34.18 ITA Fiscal Year

Historical ITA years ต้องยัง public/discoverable ตามโครง `/ita/{fiscal-year}`.

Current fiscal year และ historical years แยก presentation แต่ historical evidence ไม่ถูกลบเพียงเพราะขึ้นปีใหม่.

## 34.19 Homepage

Homepage configuration รุ่นก่อนไม่มี Public Historical Page.

Public website ใช้ latest valid Published configuration; previous configuration อยู่ใน Admin/Audit history ตาม implementation.

Historical/Archived sources ต้องไม่กลับเข้า Homepage eligibility โดยอัตโนมัติ.

## 34.20 Related Content

Automatic related/recommendation surfaces ใช้ Current Public เป็น default.

Archived / Expired / Superseded / other historical records ไม่ถูก recommend เป็น current content โดยอัตโนมัติ; historical relation ต้อง intentional/contextual.

## 34.21 Public Search Boundary

`07` Freeze เพียงหลักว่า eligible Historical Public content **อาจ** searchable ได้เมื่อ historical discovery มีคุณค่า แต่ต้องแยกจาก current contentอย่างชัดเจน.

Exact inclusion, ranking, filter, labels และ current-first ordering defer ไป `08-search.md`.

Draft / Pending Review / Approved / pre-publication Scheduled และ Non-Public domain states ต้องไม่ออก Public Search.

## 34.22 Permanent Withdrawal

Permanent Withdrawal เป็น exceptional public disposition สำหรับกรณีเช่น:

- privacy / PDPA
- legal takedown
- security-sensitive disclosure
- materially incorrect / unsafe information
- content ที่ไม่ควรเปิด public ต่อ

Permanent Withdrawal แตกต่างจาก normal Archive.

Version 1 ไม่สร้าง universal `Withdrawn` lifecycle state ให้ทุก Domain; exact storage/action implementation defer ได้ แต่ semantics ต้องรักษาไว้.

## 34.23 Not Found / Gone / Redirect Semantics

สอดคล้องกับ current Sitemap:

**Not Found** ใช้กับ record ที่ไม่มีจริงหรือไม่เคย public และ public userไม่ควรรู้ว่ามี เช่น Draft / Pending Review / Approved / Scheduled before publication.

**Gone semantics** ใช้เมื่อ record เคย Public แล้วถูกถอนถาวรและไม่มี meaningful successor.

**Redirect** ใช้เมื่อมี canonical/current destination ที่ตอบ user intent เดิมจริง เช่น legacy/canonical routing หรือ safe successor disposition.

ห้าม redirect withdrawn/old content ไป Homepage แบบ blanket.

Superseded Document ยังคง historical pageและไม่ auto-redirect.

## 34.24 Historical Metadata Integrity

Lifecycle transitions ห้าม rewrite:

- original Created By
- original Published By
- original Published At
- original identity / Public ID
- historical relationships

เพิ่ม lifecycle event เช่น Archived At / Superseded At ผ่าน workflow/Audit ตามความเหมาะสมแทน.

## 34.25 Historical Relationships Never Auto-Follow Successors

ตัวอย่าง ITA 2568 อ้าง Document A แล้ว A ถูก Superseded โดย B:

```text
ITA 2568 → Document A
```

ยังคงเดิม.

record ใหม่สามารถ prefer B ใน picker แต่ historical content ไม่ rewrite.

## 34.26 Inactive Master Data and Historical Rendering

Inactive Personnel / Organization / Health Service ที่เคยถูกอ้างใน historical content ต้องยัง render historical relationship ได้ ไม่กลายเป็น broken raw ID เพียงเพราะ entity ไม่ current.

## 34.27 Hard Delete Boundary

Previously Public content ไม่ใช่ normal Hard Delete candidate.

ใช้ lifecycle / Permanent Withdrawal ก่อน.

Hard Delete ยังจำกัดตาม `05-admin-cms.md` / `06-roles-permissions.md` สำหรับ safe unused Draft / unreferenced resource ตาม permission.

## 34.28 Archive Is Not Retention

```text
Archive ≠ retention expiry ≠ automatic deletion
```

Data retention เป็น compliance/operations concern แยกต่างหาก.

Version 1 ไม่มี auto-delete เพราะ Archived มานาน.

## 34.29 No Automatic Archive by Age

Version 1 ไม่ auto-archive News/Report/Content เพียงเพราะอายุเกินจำนวนวัน/ปี.

Announcement automatic Expiry เป็นข้อยกเว้นเพราะมี explicit domain meaning จาก expiry date.

## 34.30 Historical Visibility Summary

| Domain / State | Current Surfaces | Historical Public | Homepage Current Eligibility |
|---|---:|---:|---:|
| News Archived | ✗ | ✓ | ✗ |
| Activity Archived | ✗ | ✓ | ✗ |
| Announcement Closed | ✗ open/current | ✓ | ✗ |
| Announcement Expired | ✗ open/current | ✓ | ✗ |
| Health Content Archived | ✗ | ✓ with historical context | ✗ |
| Health Report Archived | ✗ current | ✓ | ✗ |
| Service Archived | ✗ | ✓ with non-current context | ✗ |
| Document Superseded | ✗ current | ✓ | ✗ |
| Document Expired | ✗ current | ✓ when historical access is legitimate | ✗ |
| Document Archived | ✗ current | ✓ | ✗ |
| Document Hidden | ✗ | ✗ | ✗ |
| ITA Historical/Archived Year | ✗ current year | ✓ | ✗ |
| Health Service Temporarily Closed | ✓ | current-status page | only if intentionally curated |
| Health Service Inactive | ✗ | historical-reference dependent | ✗ |
| Health Service Hidden | ✗ | ✗ public detail by default | ✗ |
| Personnel Inactive | ✗ | historical relations by default | ✗ |
| Personnel Hidden | ✗ | ✗ public profile by default | ✗ |
| Organization Inactive | ✗ | historical relations retained | ✗ |
| Organization Hidden | ✗ | ✗ current/public presentation | ✗ |

## 34.31 No Universal Archive Center / Restore

Version 1 ไม่สร้าง `/archive` กลางสำหรับทุก Domain และไม่สร้าง universal `Restore` action.

ใช้ Domain-specific paths/actions เช่น:

- Announcement → Reopen
- Health Service / Personnel / Organization → Reactivate
- Archived Editorial → prepare as Draft → Publish
- ITA → historical fiscal-year navigation

---

# 35. Accepted Archival, Expiry, Supersession & Historical Visibility Rules

**Section 34 = Accepted Archival, Expiry, Supersession & Historical Visibility Rules**

Accepted baseline:

- Version 1 conceptually distinguishes Current Public, Historical Public, and Non-Public without adding a universal visibility state.
- Not-current lifecycle states do not automatically mean deleted/non-public; historical visibility follows Domain meaning.
- Historical content leaves current/Homepage operational surfaces and must be visibly identified as non-current.
- Canonical Public ID and URL remain stable through ordinary Archive/Close/Expire/Supersede transitions.
- News, Activity, Health Report, historical Documents, Superseded Documents, and historical ITA years may retain public historical detail.
- Archived Health Content and Service may remain historical only with clear non-current context and no current promotion/recommendation.
- Temporarily Closed Health Services remain current directory information; Inactive services do not.
- Inactive Personnel leave current Personnel/Leadership surfaces while historical relations remain intact.
- Superseded Documents retain their own file/identity and link to successor; they are never silently replaced or auto-redirected.
- Historical ITA Evidence and other historical relationships never auto-follow resource successors.
- Search may include eligible Historical Public content, but search inclusion/ranking/filter UX is deferred to `08-search.md`.
- Permanent Withdrawal is exceptional and distinct from Archive for privacy/legal/security/materially incorrect content.
- Permanently withdrawn previously-public content without meaningful successor uses Gone semantics; unpublished/nonexistent content uses Not Found; meaningful successor routing uses Redirect where appropriate.
- Lifecycle transitions preserve original publication dates, authorship, Public ID, files, and historical relationships.
- Previously Public content is lifecycle-first rather than Hard Delete.
- Archive is not a retention/deletion policy; Version 1 has no age-based automatic archival/deletion except domain-driven Announcement Expiry.
- Version 1 has no universal Archive Center or universal Restore action.

---

# 36. Publishing Audit, Attribution & Workflow History

Publishing audit ต้องตอบคำถามได้ว่า **ใครทำอะไร กับ record ใด เมื่อไร และผลของ workflow คืออะไร** โดยไม่เปลี่ยน Admin CMS ให้กลายเป็น revision-control หรือ activity-feed platform.

หลักสำคัญ:

> **Audit records accountability; record history explains the publishing story.**

> **Audit must preserve who acted, what changed in workflow, and when — without turning every edit or autosave into noise.**

## 36.1 Three Distinct Concepts

Version 1 แยกสามเรื่องออกจากกัน:

```text
Record Metadata
→ สรุปสถานะ/ผู้กระทำล่าสุดของ record

Workflow History
→ เหตุการณ์ publishing/workflow สำคัญของ record นั้น

Central Audit Log
→ หลักฐานระดับระบบสำหรับการตรวจสอบย้อนหลังหลาย Module / หลาย User
```

ทั้งสามเกี่ยวข้องกันแต่ไม่ใช่ feature เดียวกัน.

## 36.2 Record Metadata

record ใช้ metadata เท่าที่ workflow ต้องการจริง เช่น:

```text
Created By / Created At
Updated By / Updated At
Published By / Published At
```

และตาม workflow อาจมี:

```text
Scheduled By / Scheduled At / Scheduled For
Approved By / Approved At
Archived By / Archived At
```

ไม่สร้างทุก field ให้ทุก Domain หาก lifecycle นั้นไม่ใช้.

## 36.3 Attribution Semantics

- **Created By** = ผู้สร้าง record ครั้งแรก และไม่เปลี่ยนเพราะ edit, disable, archive หรือ supersede.
- **Updated By** = ผู้ที่ commit canonical record ล่าสุด; Autosave Recovery ไม่เปลี่ยนค่าจนกว่าจะมี actual successful save.
- **Published By** = ผู้กด Publish Now; สำหรับ scheduled execution อาจเป็น `System` แต่ต้องรักษา `Scheduled By` ไว้.
- **Approved By** แสดงเฉพาะเมื่อ Approval Workflow ใช้งาน และเป็น Admin metadata โดย default.

User account lifecycle ไม่ rewrite historical attribution.

## 36.4 Scheduled Publication Attribution

Scheduled publication ต้องตอบได้ว่า:

- ใครตั้งเวลา
- ตั้งเมื่อไร
- กำหนดเผยแพร่เมื่อไร
- ระบบ execute จริงเมื่อไร
- สำเร็จหรือล้มเหลว

conceptually:

```text
Scheduled By = User A
Executed By = System
Published At = execution time
```

System actor ไม่กลบ human intent.

## 36.5 Return for Revision Reason

`Return for Revision` ต้องเก็บ concise internal reason พร้อม actor/time:

```text
Returned for Revision
By: ...
At: ...
Reason: ...
```

เหตุผลนี้เป็น internal editorial information ไม่ใช่ Public content.

## 36.6 Meaningful Workflow History Only

Record Workflow History แสดงเฉพาะ event ที่มีความหมาย เช่น:

- Created
- Submitted for Review
- Withdrawn from Review
- Returned for Revision
- Approved
- Approval Invalidated
- Scheduled
- Rescheduled
- Schedule Cancelled
- Scheduled Publish Succeeded / Failed
- Published
- Published Changes Saved
- Archived
- Closed / Expired / Reopened
- Superseded
- Activated / Temporarily Closed / Reactivated / Inactivated
- Corrected Published File
- Permanently Withdrawn

ไม่เก็บ preview, page open, list filter, autosave, validation error หรือ routine clicks เป็น timeline noise.

## 36.7 Draft Save and Autosave Boundary

Routine `Save Draft` ไม่สร้าง Workflow History item ทุกครั้ง.

`Updated By / Updated At` เพียงพอสำหรับการทำงานประจำ และ Autosave Recovery ไม่ควรกลายเป็น Audit spam.

## 36.8 Published Changes Are Auditable

`Published → Save Changes → Published` แม้ state ไม่เปลี่ยน แต่ public content เปลี่ยน จึงถือเป็น meaningful public-impact event และต้อง Audit.

Version 1 ยังไม่เก็บ field-level before/after diff สำหรับทุก save.

## 36.9 Record History vs Central Audit Log

**Record History** เป็น contextual history ของ record เดียวและอ่านง่ายสำหรับผู้ที่เข้าถึง record นั้นได้.

**Central Audit Log** เป็น system-wide governance view สำหรับ Administrator baseline (`audit.view`) และรองรับการค้น/กรองตาม Actor, Module, Action, Date และ Target ตามที่ implementation รองรับ.

Record History ไม่ถือเป็น bypass ของ `audit.view` เพราะไม่เปิด cross-system audit scope.

## 36.10 Central Audit Is Read-Only

Version 1 ไม่มี:

```text
audit.edit
audit.delete
```

ผ่าน normal CMS workflow.

Audit Log อ่านได้แต่แก้หรือเคลียร์ประวัติไม่ได้.

## 36.11 Minimal Audit Event Structure

conceptual event structure:

```text
Actor
Action
Target Type
Target Stable ID
Timestamp

Optional:
Previous State
New State
Reason
Workflow Context
Related Target
Display Snapshot
```

Audit identity ใช้ stable identifier ไม่พึ่ง Title หรือ Slug ที่เปลี่ยนได้.

## 36.12 Display Snapshot Without Identity Confusion

ระบบอาจเก็บ title/display-name snapshot ของ event เพื่อให้อ่านง่าย แต่ stable ID ยังคงเป็น identity หลัก.

Title/Slug rename ภายหลังต้องไม่ทำให้ audit event เดิมอ้างผิด record.

## 36.13 Stable Actor Identity

Audit attribution ต้องรอดจาก:

- user ถูก Disabled
- user เปลี่ยน display name
- Personnel profile เปลี่ยน

UI อาจแสดงชื่อปัจจุบันหรือ snapshot ประกอบ แต่ actor identity ต้องไม่เปลี่ยนคน.

## 36.14 System-Driven Events

Automatic transitions เช่น:

```text
Scheduled → Published
Published → Expired
```

ใช้ `System` เป็น execution actor ได้ แต่ยังเก็บ originating human attribution เมื่อมี เช่น `Scheduled By`.

## 36.15 Document Supersession History

Document replacement ต้อง trace ได้สองทิศทาง:

```text
Document A
→ Superseded by Document B

Document B
→ Published as replacement for Document A
```

implementation ไม่จำเป็นต้อง duplicate payload หาก derive relationship ได้ แต่ staff ต้องตรวจย้อนกลับได้.

## 36.16 Published File Correction — Stronger Audit

`Correct Published File` เป็น exceptional Administrator-only action จึงต้องมี stronger audit context อย่างน้อย:

```text
Actor
Timestamp
Target Document
Previous File Reference
New File Reference
Reason
```

**Reason required** และ action นี้ไม่ใช้แทน normal Supersede workflow.

## 36.17 Permanent Withdrawal — Stronger Audit

Permanent Withdrawal ต้อง Audit อย่างน้อย:

```text
Actor
Timestamp
Target
Reason
Successor (if any)
Public Disposition
```

**Reason required** เพราะอาจเกี่ยวกับ privacy, legal, security หรือ materially incorrect content.

## 36.18 Reasons Are Selective, Not Universal

Version 1 ไม่บังคับ reason ทุก action:

- Archive → ไม่บังคับ
- Close Announcement → optional โดย default
- Inactivate entity → ไม่บังคับ
- Return for Revision → required
- Correct Published File → required
- Permanent Withdrawal → required

ใช้ reason เมื่อเพิ่ม accountability จริง ไม่สร้าง form fatigue.

## 36.19 Approval History Is Not a Discussion System

Approval history เก็บ event + Return reason เท่านั้น.

Version 1 ไม่มี comment thread, mentions, reactions, reviewer chat หรือ attachment discussion.

## 36.20 Record History UX

Record-level history ควร concise เช่นล่าสุด 5–10 meaningful events และมี `ดูประวัติทั้งหมด` เมื่อจำเป็น.

Routine draft metadata เช่น “แก้ไขล่าสุดโดย...” แสดงเป็น metadata มากกว่าทำ timeline ทุก save.

## 36.21 Permission-Aware History

- User ที่ไม่มีสิทธิ์เข้าถึง record → ไม่มีสิทธิ์ดู history ของ record.
- User ที่เข้าถึง record → ดู contextual workflow history ของ record ได้.
- Central Audit Log → Administrator baseline ตาม `06-roles-permissions.md`.

History ไม่เปิดเผย security/user data เกินความจำเป็น.

## 36.22 Internal Reasons Are Not Public Transparency Data

Return reason, correction reason, withdrawal reason และ internal actor attribution ไม่ render สู่ Public Website โดย default.

หากต้องสื่อสารเหตุผลกับประชาชน ต้องมี public-facing status/content แยกตาม Domain.

## 36.23 Public Last Updated Semantics

หาก Public Website แสดง `Last Updated` ต้องสะท้อน meaningful public-content change ไม่ใช่ technical touch เช่น autosave, reindex หรือ metadata processing.

CMS `Updated At` และ public-facing meaningful update concept อาจต่างกัน; exact field design defer ไป implementation/Content Model amendment หากจำเป็น.

## 36.24 Migration Attribution Boundary

`09-migration-plan.md` ต้องรักษา original dates/attribution ที่เชื่อถือได้จากระบบเดิมเท่าที่ทำได้.

หาก legacy actor ไม่ทราบ:

```text
Original actor unavailable
```

หรือ equivalent.

ห้าม fabricate actor หรือใช้ migration date ทำเหมือนเป็น original Published At.

## 36.25 Time Display

Admin UX แสดงเวลาตาม `Asia/Bangkok` และรูปแบบวันที่ไทย/พ.ศ. ตาม UX baseline.

storage/time normalization และ technical timestamp architecture defer ไป `10-system-blueprint.md`.

## 36.26 Failed Actions and Audit Noise

- normal validation failure → ไม่เข้า Workflow History
- normal permission denial → ไม่เข้า normal Audit ทุกครั้ง
- concurrency conflict → ไม่ใช่ workflow event
- meaningful Scheduled Publish failure → บันทึก meaningful event ได้
- repetitive retry details → technical logs, ไม่ flood Audit/record history

Security-event logging แยกไป System Blueprint.

## 36.27 Audit Retention / Export Deferred

`07` ไม่กำหนด retention years, purge, partition, export หรือ signed reports.

Version 1 baseline ไม่ต้องมี CSV/PDF Audit export หรือ Audit retention UI จนกว่าจะมี requirement จริง.

## 36.28 No Activity Feed / Revision Control

Version 1 ไม่สร้าง:

- social/activity feed
- full revision history
- field-by-field diff
- restore previous version
- revision branching/merge
- user productivity analytics

Audit มีไว้เพื่อ accountability ไม่ใช่ version-control platform.

## 36.29 Conceptual Event Classes

เพื่อให้ architecture แยกความหมายได้ อาจจัด event เป็นกลุ่ม:

```text
Content Lifecycle Events
Workflow Approval Events
Scheduling Events
Entity Lifecycle Events
Exceptional Corrective Events
Authorization Administration Events
```

`07` สนใจ publishing/content side; authorization administration ถูกกำหนดไว้ใน `06`.

## 36.30 State and History Consistency

Current State และ Workflow History ต้องสอดคล้องกัน.

ห้ามมี lifecycle state เปลี่ยนโดยไม่มี meaningful event ที่อธิบายได้.

เช่น `Published → Archived` ต้องมี corresponding archival event; ถ้ามีการกลับมาใช้ใหม่ต้องมี transition/event ใหม่ตาม Domain semantics.

## 36.31 Public-Impact Transition + Audit Is One Logical Operation

สำหรับ meaningful public-impact transition ไม่ควรเกิดสถานการณ์:

```text
Public transition succeeds
Audit event disappears silently
```

requirement:

> **Meaningful public-impact transitions and their Audit records are one logical operation.**

exact transaction/outbox/atomic mechanism defer ไป `10-system-blueprint.md`.

## 36.32 User Lifecycle Never Rewrites History

Disable, rename หรือ role change ของ user ภายหลังไม่ rewrite historical Created/Published/Scheduled/Approved attribution.

Audit history บอกว่าใครทำ event นั้น ณ เวลานั้นและยังคง trace ได้.

## 36.33 Version 1 Exclusions

Version 1 deliberately excludes:

- full revision history
- field-by-field diff
- revision restore/rollback
- branching/merge
- comment/review threads
- activity feeds
- audit modification/deletion through CMS
- audit scoring
- user productivity analytics
- public staff audit log
- audit export baseline
- audit-retention configuration UI
- blockchain/signed audit ledger
- event-sourcing architecture requirement
- AI audit summarization

---

# 37. Accepted Publishing Audit, Attribution & Workflow History

**Section 36 = Accepted Publishing Audit, Attribution & Workflow History**

Accepted baseline:

- Version 1 separates Record Metadata, record-level Workflow History, and Central Audit Log.
- Created/Updated/Published/Scheduled/Approved attribution retains distinct meanings and appears only where the workflow uses it.
- Routine Draft saves and Autosave do not flood Workflow History; meaningful public-impact/workflow transitions do.
- Scheduled publication preserves both human scheduling attribution and System execution attribution.
- Return for Revision requires and records a concise internal reason.
- Published Changes remain auditable even when lifecycle state stays Published.
- Version 1 provides accountability without full revision diff, restore, branching, or version control.
- Record-level history is available contextually to authorized record users; system-wide Central Audit remains Administrator-level in Version 1.
- Record and actor audit identity use stable identifiers so title/slug/account-status/display-name changes do not destroy attribution.
- Document Supersession, Published File Correction, and Permanent Withdrawal carry stronger contextual audit; correction and permanent withdrawal require reasons.
- Internal workflow reasons and administrative attribution are not Public transparency data by default.
- System-driven transitions preserve originating human intent when relevant rather than replacing all attribution with `System`.
- Legacy migration preserves trustworthy original dates/attribution where available and never fabricates missing actors.
- Normal validation, permission, and concurrency failures do not create Audit noise; meaningful scheduled failures may be recorded while repetitive retries stay technical.
- Meaningful public-impact transition and its Audit event are treated as one logical operation; implementation mechanics remain deferred to the System Blueprint.
- Version 1 excludes revision history, activity feeds, audit editing/deletion, public staff audit logs, productivity analytics, and enterprise audit/reporting features.

---

# 38. Publishing Workflow UX & Action Presentation

## 38.1 UX Principle

Publishing UX presents the **next meaningful action**, not the underlying state machine.

> **Show the next meaningful action, not the whole state machine.**

> **Routine actions stay obvious; exceptional lifecycle actions stay secondary and deliberate.**

The Admin CMS reuses the frozen editor/list/accessibility patterns from `05-admin-cms.md`; this section defines publishing action semantics and presentation only, not a second editor design.

## 38.2 Stable Publishing Action Area

Every editor uses one predictable publishing action region.

- Desktop may use a compact sticky header/sidebar/action region so long forms do not require scrolling back to the top.
- Mobile uses the same workflow through a compact primary-action + overflow pattern rather than a separate mobile workflow.
- Save, Preview, Publish/Schedule, and lifecycle actions are not scattered across unrelated tabs or distant page regions.

## 38.3 Draft — Approval OFF

For an Editor:

```text
[บันทึกร่าง]   [ดูตัวอย่าง]
```

For a Publisher:

```text
[บันทึกร่าง]   [ดูตัวอย่าง]   [เผยแพร่ ▾]
                                      └ กำหนดเวลาเผยแพร่
```

`Publish` is the primary public-impact action. `Schedule` is a nearby secondary path with the same Publisher-level authority and readiness requirements.

## 38.4 Draft — Approval ON

When Approval is enabled for the Module, Draft does not expose direct Publish/Schedule.

```text
[บันทึกร่าง]   [ดูตัวอย่าง]   [ส่งตรวจ]
```

This applies to Editors and Publishers alike. Approval-off Modules do not show review terminology at all.

## 38.5 Pending Review

Pending Review is read-only for editorial content until it is returned/withdrawn.

For an Editor/submitting user:

```text
[ดูตัวอย่าง]   [ถอนกลับมาแก้ไข]
```

For a Publisher/Reviewer:

```text
[ดูตัวอย่าง]   [ส่งกลับแก้ไข]   [อนุมัติ]
```

`ส่งกลับแก้ไข` opens a small reason dialog. The reason is required and remains internal workflow metadata; no comment thread is created.

## 38.6 Approved

Approved records show a clear human-readable state:

```text
สถานะ: อนุมัติแล้ว
```

Publisher actions:

```text
[เผยแพร่]   [กำหนดเวลาเผยแพร่]
```

A secondary `นำกลับมาแก้ไข` action may return the item to Draft, with clear notice that the existing Approval becomes invalid.

## 38.7 Published

Published records never show `Publish` again.

For an authorized Publisher:

```text
[บันทึกการแก้ไข]   [ดูหน้าเว็บไซต์]
                              ⋯ เก็บเป็นข้อมูลย้อนหลัง
```

`Save Changes` is a public-impact action. Lifecycle actions such as Archive/Close/Inactivate remain secondary and deliberate.

Editors without public-impact authority see Published records read-only rather than a disabled Save Changes control.

## 38.8 Scheduled

Scheduled records clearly expose the committed schedule:

```text
สถานะ: กำหนดเผยแพร่
18 สิงหาคม 2569 เวลา 09.00 น.

[เผยแพร่ตอนนี้] [เปลี่ยนเวลา] [ยกเลิกกำหนด]
```

The UI does not expose a generic status editor.

If scheduled execution fails, the item remains Scheduled and shows an actionable failure condition with a human-readable cause and a path to open/fix the record. Version 1 does not expose `Retry Job`, `Requeue`, or queue administration controls.

## 38.9 Readiness Presentation

Readiness is displayed as errors/warnings rather than a score.

Example:

```text
ความพร้อมในการเผยแพร่
✓ ข้อมูลหลักครบ
✓ เอกสารพร้อม
✓ วันเวลาถูกต้อง

คำเตือน
! ยังไม่มีภาพประกอบ
```

Readiness may appear when opening the publishing area, after validation, or before a public-impact action; it does not need to dominate the editor continuously.

## 38.10 Errors and Warnings

- Errors appear near the field/problem and may also appear in a concise summary with focus/navigation to the issue.
- Warnings remain visible but non-blocking by default.
- State and readiness remain separate concepts, e.g. `สถานะ: ร่าง` plus `ข้อผิดพลาด 2 รายการ`, not a synthetic status such as “ร่างไม่พร้อมเผยแพร่”.
- Approval workflow state and public lifecycle also remain conceptually separate even when the UI simplifies the presentation.

## 38.11 Action Hierarchy

### Primary

- Publish
- Submit for Review
- Approve
- Save Changes

### Secondary

- Save Draft
- Preview
- Schedule / Reschedule
- Withdraw from Review

### Deliberate Lifecycle / Exceptional

- Archive
- Close
- Inactivate
- Supersede
- Permanent Withdrawal
- Correct Published File

Archive or other opposing/high-impact actions are not placed beside Publish with equal visual weight.

## 38.12 Domain-Language Actions

Buttons use meaningful verbs rather than lifecycle labels or raw enums.

Examples:

- บันทึกร่าง
- ส่งตรวจ
- อนุมัติ
- ส่งกลับแก้ไข
- เผยแพร่
- กำหนดเวลาเผยแพร่
- เก็บเป็นข้อมูลย้อนหลัง
- ปิดประกาศ
- เปิดใช้งาน
- ปิดชั่วคราว
- เปิดให้บริการอีกครั้ง
- ทำให้ไม่ใช้งาน
- เผยแพร่เป็นฉบับแทน

No arbitrary `Status` dropdown is introduced.

## 38.13 Archive and Permanent Withdrawal Placement

Archive is a secondary lifecycle action with confirmation where appropriate; it is not placed beside Publish as a peer routine action.

Permanent Withdrawal is an exceptional action kept outside the routine action bar. It requires a reason, confirmation, and clear explanation of its public consequence.

## 38.14 Document Supersession UX

Document replacement is presented as a meaningful replacement action, e.g.:

```text
[เผยแพร่เป็นฉบับแทน]
```

The UI clearly summarizes the successor and predecessor before confirmation:

```text
เอกสารใหม่: B
จะแทนที่: A
```

The semantic atomic transition from `07` remains authoritative.

## 38.15 Correct Published File UX

`Correct Published File` is Administrator-only by default and appears under an additional/exceptional action area rather than the routine publishing bar.

It includes a clear warning that it is for correcting the existing published file without creating a successor, and a reason is required.

## 38.16 Entity Lifecycle UX

Entity directories use domain language rather than Publish/Archive terminology.

Health Service:

```text
Draft                → เปิดใช้งาน
Active               → ปิดชั่วคราว / ทำให้ไม่ใช้งาน
Temporarily Closed   → เปิดให้บริการอีกครั้ง / ทำให้ไม่ใช้งาน
Inactive             → เปิดใช้งานอีกครั้ง
```

Personnel / Organization:

```text
Draft    → เปิดใช้งาน
Active   → ทำให้ไม่ใช้งาน
Inactive → เปิดใช้งานอีกครั้ง
```

Public-impact edits to Active records still require Publisher-level authority as defined in `06-roles-permissions.md`.

## 38.17 Announcement UX

Published Announcement may expose `บันทึกการแก้ไข` as the primary authorized edit action and keep `ปิดประกาศ` / `เก็บเป็นข้อมูลย้อนหลัง` as lifecycle actions.

Closed/Expired records show their state clearly; `เปิดอีกครั้ง` is available only when the domain transition is valid and the user has authority.

## 38.18 Human-Readable Status

UI states use Thai human-readable language such as:

- ร่าง
- รอตรวจ
- อนุมัติแล้ว
- กำหนดเผยแพร่
- เผยแพร่แล้ว
- ปิดแล้ว
- หมดอายุ
- ถูกแทนที่
- ไม่ใช้งาน

Raw enum/capability values are not primary staff-facing labels.

## 38.19 Preview Presentation

Preview remains:

- read-only
- protected by current authorization
- based on current working content
- non-public
- state-neutral

Preview should clearly identify itself, for example:

> ตัวอย่างก่อนเผยแพร่ — หน้านี้ยังไม่เปิดให้ประชาชนเข้าถึง

Published records use a separate `ดูหน้าเว็บไซต์` link to the actual public page.

## 38.20 Permission-Aware Actions

The current `06` behavior remains authoritative:

```text
No capability
→ normally hide the action

Has capability, but current state prevents the action
→ hide or disable with useful state context
```

The UI does not become cluttered with lock icons or disabled controls for actions a user can never perform.

## 38.21 Approval UI Must Disappear When Disabled

For Modules with Approval OFF:

- no Pending Review terminology
- no Approve/Return controls
- no Review Queue entry
- no “Approval disabled” section

For Modules with Approval ON, the review workflow appears only in that Module.

## 38.22 Lightweight Review Queue

Pending Review work may surface in the existing Work Dashboard, for example:

```text
รอตรวจ
ข่าว 2
ความรู้สุขภาพ 3
```

Selecting it opens the relevant Module list filtered to Pending Review. Version 1 does not introduce a separate enterprise workflow inbox.

## 38.23 List Status and Warnings

List views show meaningful lifecycle/workflow state.

Example:

```text
กำหนดเผยแพร่
⚠ เผยแพร่ตามกำหนดไม่สำเร็จ
```

Failure remains a warning/condition, not a synthetic `Failed` lifecycle status.

## 38.24 List Quick Actions and Bulk Actions

Version 1 keeps list quick actions conservative, such as Preview/Edit/Open where appropriate.

Publish is not a routine one-click list/bulk action because readiness and public-impact context belong in the record editor.

Bulk Archive (or another domain-safe lifecycle action) may exist only in Modules where the action is clearly safe, useful, permission-aware, and compatible with that Domain lifecycle. Bulk Publish and destructive Bulk Delete remain excluded from the Version 1 baseline.

## 38.25 Confirmation Policy

Routine actions normally do not require confirmation:

- Save Draft
- routine Publish
- Schedule / Reschedule
- Save Changes
- Approve

Materially disruptive/exceptional actions may require confirmation:

- Archive
- Supersede
- Inactivate
- Permanent Withdrawal
- Correct Published File
- risky historical changes where the domain requires it

Close uses confirmation according to its actual public consequence.

> **Confirm irreversible or materially disruptive intent, not routine work.**

## 38.26 Success and Failure Feedback

Success feedback describes the real workflow/public outcome rather than a generic “saved successfully”.

Examples:

- บันทึกร่างแล้ว
- เผยแพร่แล้ว
- กำหนดเผยแพร่วันที่ 18 สิงหาคม 2569 เวลา 09.00 น. แล้ว
- ยกเลิกกำหนดเผยแพร่แล้ว
- เก็บรายการเป็นข้อมูลย้อนหลังแล้ว
- เอกสารฉบับใหม่เผยแพร่และแทนที่ฉบับเดิมแล้ว

Failures preserve current working data, show human-readable causes, and focus/navigate to issues where possible.

## 38.27 Current Working Data on Public-Impact Actions

Publish/Schedule operate on the user's current valid working data and do not require a redundant Save immediately beforehand.

Conceptually:

```text
Current working changes
→ validate
→ commit content + transition
```

`Save Draft` remains available separately for users who are not ready to publish.

## 38.28 Published Working Changes

For authorized Publisher editing a Published record:

```text
Current public version remains live
+ working changes remain non-public
→ Save Changes
→ new public content commits
```

Leaving/canceling without commit does not alter the public version. Autosave recovery never becomes public by itself.

## 38.29 Unsaved-Change Warning

Browser/navigation leave warnings appear only when meaningful unsaved changes are genuinely at risk.

Preview, status refresh, history viewing, or system metadata do not create false unsaved-change warnings.

## 38.30 Publishing Metadata and History Placement

Status and publishing metadata such as Published/Scheduled/Approved attribution belong near the publishing action area.

Record Workflow History remains a secondary, optionally expandable contextual area rather than occupying the main form or becoming an activity feed.

## 38.31 Public / Historical Links

- Published current records expose `ดูหน้าเว็บไซต์` where a public URL exists.
- Draft/Pending/Approved/Scheduled-before-public records use Preview rather than a public URL that would return Not Found.
- Historical Public Archived/Superseded records may still expose `ดูหน้าเว็บไซต์`, with clear historical state in Admin.
- Permanently Withdrawn records no longer expose a public-page link; successor/disposition information is shown where applicable.

## 38.32 Responsive Behavior

Desktop may keep actions persistently available without dominating content.

Mobile uses a compact primary action plus overflow/action sheet rather than placing many actions in one row. The workflow semantics remain identical across viewport sizes.

Touch targets, dialog layout, and error navigation remain usable on small screens.

## 38.33 Accessibility

Publishing action UX follows the current `05` accessibility baseline:

- keyboard-accessible controls
- predictable focus order
- focus management in confirmation/reason dialogs
- error summaries that focus/navigate to invalid fields
- statuses never communicated by color alone
- screen-reader-friendly loading/results
- descriptive text button labels rather than icon-only critical actions

## 38.34 Submission / Loading Safety

During a public-impact request the UI shows an in-progress state such as `กำลังเผยแพร่…` and prevents duplicate submission.

The frontend may reduce duplicate clicks, but backend idempotency/concurrency remains authoritative.

The UI does not optimistically declare Published/Scheduled/etc. before the server confirms the committed state.

After success, the editor refreshes from the authoritative current server state rather than deriving the new lifecycle purely from the clicked button.

## 38.35 Version 1 Exclusions

Version 1 deliberately excludes:

- workflow wizard
- giant state-machine/timeline graphic in every editor
- bulk publishing
- bulk destructive lifecycle changes
- list-level routine one-click public-impact transitions
- quality/readiness percentage or score
- SEO/content quality dashboard as publication gate
- AI quality presentation
- lock-icon-heavy permission UI
- separate mobile publishing workflow
- duplicated editor design specific to publishing

---

# 39. Accepted Publishing Workflow UX & Action Presentation

**Section 38 = Accepted Publishing Workflow UX & Action Presentation**

Accepted baseline:

- Version 1 presents a small set of meaningful next actions rather than exposing the state machine.
- Publishing actions use one stable, prominent but unobtrusive action region; routine actions remain visually separate from exceptional lifecycle actions.
- Action labels are domain-language verbs rather than arbitrary status mutation.
- Approval UX disappears completely when disabled for a Module.
- Users without an action capability normally do not see it; state-unavailable actions may be hidden or disabled with useful context.
- Published records use `Save Changes`; Editors without public-impact authority see Published content read-only in Version 1.
- Scheduled records expose scheduled date/time plus Publish Now / Reschedule / Cancel actions rather than generic status controls.
- Readiness presents Errors and Warnings without scores, quality meters, or AI assessment.
- Public-impact actions commit current valid working data and do not require a redundant Save immediately before Publish/Schedule.
- Archive, Supersede, Inactivate, Permanent Withdrawal, and Correct Published File remain deliberate/secondary actions with confirmation only where warranted.
- Document replacement and entity lifecycle actions use domain-specific human language.
- Record lists do not provide Bulk Publish or routine one-click Publish; domain-safe Bulk Archive may exist only where current Admin CMS rules justify it.
- Success feedback states the real workflow/public consequence; failures preserve working data and direct staff to the actual problem.
- Preview remains protected, read-only, non-public, and clearly distinct from the public page.
- Record Workflow History remains secondary contextual information, not an activity feed.
- Desktop and mobile preserve the same workflow semantics through responsive action presentation rather than separate workflows.
- Server-confirmed state remains authoritative; the UI never optimistically declares a public-impact transition complete before commit succeeds.
- Version 1 excludes workflow wizards, giant state diagrams, bulk publishing, quality dashboards, lock-heavy permission UI, and publishing-specific editor redesign duplication.

---

# 40. Publishing Edge Cases & Cross-Workflow Consistency

> **When workflows collide, the latest valid committed state wins; no workflow silently bypasses another workflow's invariants.**

## 40.1 Scheduled Editing + Approval

Approval OFF:

```text
Scheduled → Edit → Revalidate → Scheduled
```

Approval ON:

```text
Approved → Scheduled
→ content package locked
```

Substantive change requires `Cancel Schedule → Draft → Edit → Submit → Approve again`. Reschedule alone does not invalidate Approval.

## 40.2 Dependencies after Approval

Approval records publication readiness at approval time, not permanent readiness. Publish/Schedule execution always revalidates current dependencies, relationships, target predecessor, state, authorization, and concurrency. A dependency becoming Superseded/Inactive is not globally invalid: relationship semantics decide whether it blocks current use (for example current Service form) or remains valid historical evidence (for example prior-year ITA).

## 40.3 Expiry vs Stale Editing

If a Published Announcement reaches meaningful expiry while an older editing session remains open, Expiry wins. The stale Save must fail with state/conflict context and cannot silently restore Published. Draft/Pending/Approved announcements do not auto-expire merely because `expiry_at` passes; Publish becomes invalid until dates are corrected and, where Approval is ON, reviewed again.

Reopen of already-public Closed/Expired Announcement remains a Publisher-level lifecycle action in Version 1 and does not introduce a hidden published-revision approval branch.

## 40.4 User/Permission Changes during Workflow

Disabling a submitter or changing a reviewer role does not cancel organizational Pending Review/Approved/Scheduled state. The next action rechecks current authorization. Previously committed organizational decisions remain valid; permission changes are prospective.

## 40.5 Archive Boundaries

Pending Review, Approved, and Scheduled records do not jump directly to Archived. They return through Draft semantics where appropriate (`Withdraw/Return/Reopen`, or `Cancel Schedule → Draft`). Already-public records use their real lifecycle actions.

Domain-safe Bulk Archive may be provided where `05-admin-cms.md` permits it, but every selected record must still satisfy authorization/current-state rules; Bulk Publish and destructive Bulk Delete remain excluded.

## 40.6 Concurrent Lifecycle Changes

A stale edit/action never reverses a newer committed Archive, Close, Expire, Inactivate, Hide, Supersede, Reactivate, or other lifecycle transition. Optimistic concurrency/current-state validation applies equally to manual and automatic transitions. Double-click/concurrent approval/return actions produce only one valid transition and meaningful Audit event.

## 40.7 Homepage Source Invalidation

For an already Published Homepage, a curated source that becomes ineligible is removed/hidden/falls back according to current Homepage eligibility rules without turning the entire Homepage into Draft or failed state. CMS surfaces an actionable warning.

For placement-level scheduling, if an eligible scheduled placement becomes invalid before activation, that placement does not activate; fallback/hide behavior protects the current Homepage and no whole-Homepage Scheduled replacement state is created.

## 40.8 Document Replacement Race

A scheduled/approved successor always revalidates the intended predecessor at commit. If another successor has already replaced the predecessor, the stale replacement is blocked; the system never guesses a new replacement chain or silently supersedes the newer document.

## 40.9 Withdrawal / Relationship Non-Cascade

Permanent Withdrawal, Hide, Archive, Inactivate, Expire, and Supersede do not cascade automatically to parent/child/related resources. Each record/resource keeps its own lifecycle and authorization. A related resource becoming invalid may surface warnings or block a future commit, but already-Published parent content is not auto-unpublished by default unless the Domain explicitly defines such lifecycle automation.

## 40.10 Historical Integrity

Archived, Expired, Superseded, Hidden, and other historical/non-current records are not treated like ordinary Drafts. Historical identity, dates, attribution, files, and relationships remain stable; exceptional corrections use explicit privileged workflows.

## 40.11 Presentation Is Not Workflow Authority

Search, Homepage, listings, related-content components, and other presentation surfaces consume lifecycle/visibility eligibility. They do not create ad-hoc controls that override Domain lifecycle (for example “keep Archived item featured” or “hide from search instead of fixing lifecycle”). Exact Search discoverability behavior is deferred to `08-search.md`.

---

# 41. Accepted Publishing Edge Cases & Cross-Workflow Consistency

**Section 40 = Accepted Edge-Case Baseline, including Final Review corrections.**

Accepted baseline:

- Latest valid committed state wins across Approval, Schedule, lifecycle, concurrency, and authorization collisions.
- Approval OFF allows revalidated Scheduled edits; Approval ON locks Approved/Scheduled content until Cancel → Draft → Review again; Reschedule preserves Approval.
- Approval remains point-in-time readiness; dependencies and Document predecessor are revalidated at commit/execution.
- Announcement Expiry overrides stale Published editing; Reopen remains Publisher-level in Version 1.
- User Disable/Role change does not cancel organizational workflow; current authorization governs subsequent actions.
- Pending/Approved/Scheduled records do not directly Archive; Domain/Draft semantics are restored first where appropriate.
- Stale edits/actions never reverse newer lifecycle transitions.
- Domain-safe Bulk Archive may exist where justified; Bulk Publish/destructive Bulk Delete remain excluded.
- Homepage uses source eligibility/fallback and placement-level scheduling only; invalid placement activation cannot disturb the current valid Homepage.
- Document replacement never guesses a changed predecessor chain.
- Lifecycle/Withdrawal changes never cascade automatically across related resources.
- Permission changes are prospective and never rewrite previous commits.
- Manual/automatic repeated actions commit only one valid transition/Audit event.
- Historical integrity is stronger than editing convenience; presentation surfaces consume lifecycle eligibility rather than override it.

---

# 42. Final Publishing Workflow Consistency Review

Clean Rebaseline cross-document review was performed against current `00–06`.

Initial result was **CONDITIONAL PASS** with no critical architecture blocker and four consistency correction groups plus two clarifications. All accepted corrections have now been applied across affected sections:

1. Confirmed lifecycle semantics: `Hidden` for Health Service / Personnel / Organization / Document and meaningful `Expired` for Document.
2. Replaced the incorrect singleton Contact Configuration model with the structured reusable Contact Information model and Publisher-level public-impact rules.
3. Removed whole-Homepage Scheduled Configuration; Homepage Configuration is Draft/Published while only eligible temporal placements may schedule.
4. Aligned list/bulk behavior with current Admin CMS: Bulk Publish/destructive Bulk Delete remain excluded, while domain-safe Bulk Archive may exist where justified.
5. Clarified Scheduled editing under Approval OFF vs Approval ON content-lock semantics.
6. Replaced ambiguous `Editor Working State` wording with `Authorized Working Changes` so the formal Editor Role is not misrepresented.

Additional verification result:

- Foundation / Direct Publish / Approval boundary — PASS
- Roles & Permissions / public-impact authority — PASS
- Validation / readiness / no Force Publish — PASS
- Scheduling / idempotency / catch-up / safe failure — PASS
- Approval / one-stage optional workflow — PASS
- Documents / atomic replacement / historical identity — PASS
- Historical visibility / Not Found-Gone-Redirect boundary — PASS
- Homepage source eligibility / placement scheduling — PASS
- Audit / attribution / logical atomicity requirement — PASS
- Responsive publishing UX / server-authoritative state — PASS
- Over-engineering guardrails — PASS

No unresolved Product/workflow blocker remains. Exact transaction/locking/scheduler infrastructure, storage representation, transport status codes, retry cadence, and other implementation mechanics belong to `10-system-blueprint.md`; Public Search inclusion/ranking for historical content is governed by `08-search.md`.

---

# 43. Clean Rebaseline — Publishing Workflow Baseline v2.0

**Sections 1–42 = CLEAN REBASELINE Publishing Workflow v2.0.**

Status:

```text
CLEAN REBASELINE — Publishing Workflow Baseline
Version 2.0
```

Key boundary retained in the current baseline:

- Direct Publish and Scheduled Publish are available to authorized Publisher-level users by default.
- Approval Workflow is optional and OFF by default.
- Create/Edit never implies public-impact authority.
- State/lifecycle semantics follow Domain meaning and current Content Model/Sitemap.
- Homepage whole-configuration scheduling is not part of Version 1; only eligible temporal placements may schedule.
- Published-revision branching, workflow designers, multi-stage approval, reviewer assignment, recurring scheduling, AI quality gates, universal state-machine configuration, and enterprise workflow infrastructure are excluded from Version 1.

Future changes require cross-document Impact Review and a versioned update to the consolidated `current/` baseline.


Current relationship:

> **`08-search.md` consumes the lifecycle/public-eligibility semantics defined here; `10-system-blueprint.md` chooses the smallest mechanism that can satisfy them.**

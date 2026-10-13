# Publishing Workflow — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 07-publishing-workflow
> **Status:** CLEAN REBASELINE v2.3 — V1 scope revision for Independent Review / Human Acceptance
> **Version:** 2.3
> **Last Updated:** 14 ตุลาคม 2569 (2026-10-14)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`, `04-homepage.md`, `05-admin-cms.md`, `06-roles-permissions.md`
> **Purpose:** กำหนด publishing semantics ที่ Songhealth ต้องการโดยใช้ lifecycle ของ CMS เป็น baseline และไม่สร้าง workflow engine ซ้ำ


> **V1 scope decision:** Product Owner comment `01a135e9-23e0-78c3-bcea-c752516828a8`
> (2026-10-13, Songhealth Feature 002 Plan Phase 0) defers structured ITA historical-evidence
> management and unavailable Q3/Q4 enforcement from V1. Ordinary native content/Document/Media,
> publication, permissions and supported validation remain on EmDash 1.1.0. This revision awaits
> independent review and human acceptance; deferral is not implementation or PASS. No upstream
> change, new subsystem, replacement ITA workflow or production action is authorized.

---

# 1. Principle

> **Native publishing lifecycle first. Domain metadata stays domain-specific.**

Version 1 ไม่สร้าง universal Songhealth state machine.

---

# 2. Core Editorial Lifecycle

Baseline editorial lifecycle ต้องรองรับ:

```text
Draft
  ↓
Publish now / Schedule
  ↓
Published
```

และ:

- Published content อาจมี pending draft changes โดย public version เดิมยังคง live จน publish changes
- Unpublish ทำให้ content ไม่อยู่ใน public query แต่ยังแก้ไขต่อได้
- Trash เป็น soft-delete boundary
- permanent deletion เป็น privileged destructive action

ใช้ lifecycle ที่ CMS มีอยู่ ไม่สร้าง `Pending Review`, `Approved`, `Publishing`, `Failed`, `Archived` หรือ state กลางของ Songhealth เว้นแต่ domain นั้นมีความหมายทางธุรกิจจริงและ native metadata ไม่พอ.

---

# 3. No Formal Approval Workflow in Version 1

Version 1 ไม่มี Approval Workflow engine.

กรณีผู้เขียนไม่ควร Publish เอง ให้ใช้ access-control boundary:

```text
Draft-only author
      ↓
ผู้มี publish authority ตรวจ
      ↓
Publish
```

ไม่ต้องมี:

- Submit for Review
- Pending Review
- Approved
- Reviewer assignment
- Approval queue
- self-approval rules
- multi-stage workflow

เปิด requirement เหล่านี้ใหม่ได้เมื่อมี workflow จริงของหน่วยงานหรือข้อกำกับที่ต้องพิสูจน์การอนุมัติอย่างเป็นทางการ.

---

# 4. Published Changes

การแก้ content ที่เผยแพร่แล้วต้องไม่ทำให้ draft edit ออกสู่ public โดยอัตโนมัติเมื่อ platform รองรับ live + draft revisions.

Staff ควรสามารถ:

- Save draft changes
- Preview pending changes
- Compare/review revision เมื่อจำเป็น
- Publish changes
- Discard pending draft เมื่อจำเป็น

ไม่สร้าง proposed-revision subsystem ของ Songhealth หาก platform มี behavior นี้อยู่แล้ว.

---

# 5. Scheduling

Version 1 รองรับ one-time future publishing ผ่าน native scheduler.

ต้อง:

- แสดง timezone ชัดเจน
- ไม่เผยแพร่ก่อนเวลาที่กำหนด
- เก็บ current live revision ไว้จน scheduled update สำเร็จ
- แสดง overdue/failure ให้ผู้ดูแลตรวจได้ตาม platform capability

ไม่สร้าง:

- recurring schedules
- cron-expression UI
- queue console
- custom retry manager
- scheduled-unpublish engine

หาก content type มีวันหมดอายุ ให้ model เป็น domain metadata ก่อน และเลือกกลไกที่เล็กที่สุดใน implementation.

---

# 6. Domain-specific Lifecycle Metadata

บางข้อมูลมี business state ที่ไม่ใช่ publishing state เช่น:

- Announcement: วันที่เริ่ม/สิ้นสุดความเกี่ยวข้อง
- Health Service: operational status เช่น active / temporarily closed / inactive
- Document: current / superseded / expired ตามความหมายของเอกสาร
- Personnel: current public assignment/visibility; assignment history is outside V1 (Q2)
- ITA: fiscal-year historical evidence semantics are deferred from V1

กฎเหล่านี้อยู่ใน Content Model/domain feature ที่เกี่ยวข้อง ไม่สร้าง universal workflow engine.

หาก record ต้องไม่ public อีกต่อไป ให้ prefer native unpublish/visibility mechanism เมื่อความหมายตรง. หากต้องคง historical public page ให้เก็บ Published และแสดง domain status อย่างชัดเจน.

---

# 7. Validation

ใช้ field required/unique/validation และ relation constraints ก่อน.

Use supported native publication hooks only for retained action-specific validation that schema
constraints cannot express, notably Q1 incomplete drafts versus publication-required values.
Do not infer an atomic cross-resource dependency gate from a before-hook: EmDash 1.1.0 executes
policy reads before the mutation transaction. Q4 guaranteed target availability at commit,
published-required-reference removal vetoes and cross-record locking are deferred from V1.

Validation ต้อง deterministic และ human-readable.

Version 1 ไม่มี AI quality gate, readiness score หรือ generic rule builder.

---

# 8. Preview

ใช้ secure native preview ของ CMS.

Public route ต้องไม่เปิด Draft ผ่าน query parameter ที่ไม่มีการยืนยันสิทธิ์.

ไม่สร้าง preview token system ของ Songhealth หาก platform มี signed/time-limited preview อยู่แล้ว.

---

# 9. Revisions, Autosave, Locking and Concurrency

ใช้ native capability เมื่อเปิดให้ collection:

- autosave
- revision history
- live/draft comparison
- restore revision
- edit lock
- optimistic concurrency/version token

These are native entry-level protections, not cross-record atomicity. Pending-draft guarantees
cover data the platform actually stages in the content revision; shared media bytes, linked records
and separately maintained taxonomy/SEO/byline metadata are not assumed to be frozen together.
Remaining Plan research must identify those native boundaries and their V1 validation implications;
no blanket pending-change or cross-resource PASS is inferred.

Songhealth ไม่สร้าง revision tables, locking service หรือ conflict protocol แยก.

Automation/agent writes ต้องใช้ concurrency precondition ที่ platform รองรับเมื่อมี เพื่อไม่ overwrite งานใหม่กว่า.

---

# 10. Delete and Restore

ใช้ Trash/Restore เป็นค่าเริ่มต้นแทน hard delete.

Permanent content delete จำกัดเฉพาะ privileged administrator through native permissions and the native
already-trashed precondition. Staff should consider usage/retention and repair references before
destructive maintenance. This is an operational precaution, not a server-enforced dependency veto:
the pinned native purge path does not invoke the trash before-delete hook or refuse published
backlinks. Media deletion/replacement likewise lacks historical/required-reference policy vetoes.
The unavailable Q3/Q4 guarantees are deferred, not passed through permissions or staff review.

ไม่สร้าง custom Archive Center หาก native Trash + domain status เพียงพอ.

---

# 11. Traceability

Version 1 ใช้:

- author/owner
- created/updated/published timestamps
- revision history
- native operational logs

เป็น baseline evidence for ordinary native editing. Native revisions are finite/prunable and
do not retain overwritten media bytes; V1 promises no immutable historical-evidence/audit archive.

ไม่สร้าง Central Audit Log ของ Songhealth เว้นแต่ requirement ด้านกฎหมาย/กำกับดูแลระบุเหตุการณ์และ retention ที่ native evidence ไม่ครอบคลุม.

---

# 12. Homepage and Deferred ITA

Homepage curation reuses ordinary native content publication. Structured ITA history/evidence is
deferred (`02` §18), not a V1 publishing journey. No Homepage/ITA workflow engine or snapshot
subsystem is created. A missing linked target is omitted or represented as safely unavailable in
public reads, without exposing editorial content; native lifecycle permission alone does not
guarantee linked-record availability or immutability.

---

# 13. Failure Semantics

หาก Save/Publish/Schedule ล้มเหลว UI ต้องไม่แสดงว่าการเปลี่ยนแปลงสำเร็จ.

หลัง network uncertainty ให้ re-read current state ก่อน retry action ที่มีผลต่อ lifecycle.

ใช้ native scheduler/publish failure behavior ก่อน; custom retry/state model เพิ่มเฉพาะเมื่อ operational evidence พิสูจน์ว่าจำเป็น.

---

# 14. Explicit Non-Goals

Version 1 ไม่มี:

- custom workflow engine
- formal approval state machine
- reviewer assignment
- multi-stage approval
- custom scheduler
- custom revision system
- custom lock service
- queue/retry dashboard
- universal archive/restore state machine
- AI publishing gates

---

# 15. Acceptance

Publishing baseline ผ่านเมื่อ:

- Draft ไม่ public
- Published edits เก็บ draft แยกจาก live version
- Preview ปลอดภัย
- publish/schedule ใช้ permission ของ platform
- scheduled publishing ทำงานตาม timezone
- stale/concurrent writes ไม่ overwrite แบบเงียบ
- Trash/restore ทำงานได้
- domain status ไม่ถูกปนกับ CMS publishing state
- ไม่มี custom approval/revision/scheduler infrastructure ที่ซ้ำ platform

> **Use the platform lifecycle; customize only real domain meaning.**

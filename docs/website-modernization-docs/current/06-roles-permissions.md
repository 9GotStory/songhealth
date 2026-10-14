# Roles & Permissions — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 06-roles-permissions
> **Status:** CLEAN REBASELINE v2.3 — CURRENT native-first V1
> **Version:** 2.3
> **Last Updated:** 14 ตุลาคม 2569 (2026-10-14)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`, `04-homepage.md`, `05-admin-cms.md`
> **Purpose:** กำหนด access-control requirements ที่จำเป็นต่อ Songhealth โดยไม่สร้าง role/permission model ซ้ำกับ CMS

---

# 1. Principle

> **Use native RBAC first. Add custom authorization only for a demonstrated gap.**

Songhealth ต้อง enforce least privilege ที่ trusted server/system boundary แต่ Version 1 ไม่กำหนด custom role hierarchy, Module Scope หรือ per-user capability matrix ของตนเอง.

---

# 2. Product Access Requirements

ระบบต้องแยกอย่างน้อยความสามารถต่อไปนี้ตามที่ CMS รองรับ:

1. อ่าน public content โดยไม่ต้องเข้า Admin
2. เข้าถึง draft/editorial content สำหรับผู้ที่ได้รับอนุญาต
3. สร้าง/แก้ไข draft
4. Publish/Schedule content
5. จัดการ content ของผู้อื่นเมื่อได้รับสิทธิ์สูงกว่า
6. จัดการ schema/users/settings/plugins/backup/import เฉพาะ administrator-level access

ไม่จำเป็นต้องสร้างชื่อ Role ของ Songhealth หาก native role model ครอบคลุม responsibility เหล่านี้อยู่แล้ว.

---

# 3. Draft Authoring vs Publishing

ความต้องการสำคัญของ Songhealth คือ:

> **สิทธิ์เขียน Draft ไม่จำเป็นต้องเท่ากับสิทธิ์ Publish.**

ผู้ที่มี native publish authority เผยแพร่หรือกำหนดเวลาบทความได้โดยตรงโดยไม่ต้องผ่านการตรวจบทความ การยืนยัน หรือการอนุมัติเพิ่มเติม. ผู้ที่ไม่มีสิทธิ์ Publish สร้าง/แก้ Draft ได้ตาม native permissions แต่ไม่มี workflow ส่งตรวจหรือขออนุมัติ.

นี่เป็น permission boundary ไม่ใช่เหตุผลให้สร้าง Approval Workflow หรือ Pending Review state แยก.

---

# 4. Ownership

หาก native CMS รองรับ ownership-based permissions ให้ใช้เป็น baseline:

- ผู้เขียนอาจจัดการ content ของตนเอง
- ผู้มีสิทธิ์สูงกว่าสามารถจัดการ content ของผู้อื่น

Songhealth ไม่เพิ่ม row-level ownership rules ตามตำบล หมู่บ้าน หน่วยบริการ หรือผู้สร้างจนกว่าจะมีกรณีใช้งานจริง.

---

# 5. Collection / Module Scope

**Module Scope ไม่เป็น Version 1 requirement.**

ไม่มีหลักฐานปัจจุบันว่าต้องจำกัด Editor คนหนึ่งให้แก้ได้เฉพาะ News แต่ห้ามแก้ ITA หรือจำกัดตาม collection อื่นแบบละเอียด.

ดังนั้น:

- ไม่สร้าง collection-level ACL
- ไม่สร้าง Module Scope table
- ไม่สร้าง Module Scope admin UI
- ไม่สร้าง permission inheritance ของ Songhealth

หากภายหลังมี requirement จริง เช่นหน่วยงานหลายทีมต้องแยกขอบเขต content อย่างเข้มงวด ให้เปิด architecture review เฉพาะเรื่องนั้นก่อนเพิ่ม custom authorization.

---

# 6. CMS Account vs Personnel

CMS account และข้อมูล Personnel เป็นคนละเรื่องกัน.

- ตำแหน่งราชการไม่กำหนด CMS permission อัตโนมัติ
- การออกจากตำแหน่ง Personnel ไม่ลบ historical authorship
- ผู้ดูแลระบบเป็นผู้ provision/disable account ตาม workflow ที่เลือก

Version 1 ไม่มี public self-registration สำหรับ Admin CMS.

---

# 7. Administrator Boundary

การเปลี่ยนแปลงที่กระทบ infrastructure/schema/security เช่น:

- users/access
- content model/schema
- plugins
- site-wide authentication/settings
- backups/import/transfer
- permanent content deletion (native administrator-only purge after trash)

ต้องถูกจำกัดด้วย native administrator-level permission ของ platform.

ไม่สร้าง super-admin/override role เพิ่มเอง.

V1 scope decision `01a135e9-23e0-78c3-bcea-c752516828a8` (2026-10-13): native media deletion
uses its separate media/ownership permissions; it is not a trash-first content purge or an
administrator-only guarantee for every raw asset. Authorization of an actor does not establish
published-required-reference or historical-retention enforcement. Those unavailable Q3/Q4
guarantees are deferred from V1 under `02` §18/20 and `07` §10, not implemented or passed.
This is the current V1 boundary; no custom RBAC or editorial approval flow.

---

# 8. Client UI Is Not Security

การซ่อนปุ่มหรือเมนูช่วย usability แต่ไม่ใช่ authorization boundary.

Direct request, plugin action, API/MCP/CLI operation และ scheduled action ต้องผ่าน permission checks ของ trusted platform.

---

# 9. No Custom Approval Permission Model

Version 1 ไม่มี Reviewer/Approver role, `approve` capability หรือ self-approval rule ของ Songhealth.

Draft authoring + native publish permission เพียงพอสำหรับ baseline สำนักงานขนาดเล็ก.

หากมีข้อกำกับจริงที่ต้อง formal approval/separation of duties ให้เพิ่มเป็น Product requirement ใหม่พร้อม evidence.

---

# 10. No Custom Audit Permission Family

Version 1 ไม่สร้าง `audit.view` หรือ Audit Administrator subsystem.

Revision/history/operational evidence ใช้ตาม platform capability; dedicated immutable audit access จะเพิ่มเฉพาะเมื่อ governance requirement พิสูจน์ว่าจำเป็น.

---

# 11. Explicit Non-Goals

Version 1 ไม่สร้าง:

- Songhealth-specific role hierarchy
- Module Scope
- per-user permission overrides
- custom role builder
- field-level security
- ABAC
- row-level policy by area/facility
- temporary permissions
- approval roles
- permission workflow engine

---

# 12. Acceptance

Access baseline ผ่านเมื่อ:

- draft-only usersไม่สามารถ publish
- users ที่ publish ได้ทำได้ตาม native ownership/role rules
- admin-only operations ถูก server-side enforce
- disabled/unauthorized usersไม่สามารถ bypass ผ่าน direct request
- Personnel dataไม่ถูกใช้เป็น authorization source
- ไม่มี custom permission model ที่ยังไม่มี use case

> **Least privilege without inventing a second RBAC system.**

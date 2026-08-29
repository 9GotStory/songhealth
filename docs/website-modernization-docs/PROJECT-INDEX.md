# Project Documentation Index — Website Modernization

> **Purpose:** จุดอ้างอิงเดียวสำหรับเอกสารโครงการเว็บไซต์สำนักงานสาธารณสุขอำเภอสอง  
> **Rule:** ใช้ไฟล์ใน `current/` เป็น Canonical Source เท่านั้น  
> **Last Updated:** 29 สิงหาคม 2569

---

## 1. กติกาการจัดเก็บใหม่

ตั้งแต่จุดนี้เป็นต้นไป ใช้โครงสร้างเดียว:

```text
website-modernization-docs/
├── PROJECT-INDEX.md
├── CHANGELOG.md
├── current/
│   ├── 00-website-foundation.md
│   ├── 01-information-architecture.md
│   ├── 02-content-model.md
│   ├── 03-sitemap.md
│   ├── 04-homepage.md
│   ├── 05-admin-cms.md
│   ├── 06-roles-permissions.md
│   ├── 07-publishing-workflow.md
│   ├── 08-search.md
│   ├── 09-migration-plan.md
│   └── 10-system-blueprint.md
├── reviews/
│   ├── admin-cms-freeze-review.md
│   ├── content-model-amendment-v1.1.md
│   ├── foundation-freeze-review.md
│   ├── homepage-freeze-review.md
│   ├── publishing-workflow-freeze-review.md
│   ├── roles-permissions-freeze-review.md
│   ├── search-freeze-review.md
│   ├── sitemap-freeze-review.md
│   ├── system-blueprint-freeze-review.md
│   ├── system-blueprint-amendment-v1.1-podman-environment-review.md
│   ├── migration-plan-reactivation-review-2026-08-28.md
│   └── canonical-integrity-repair-2026-08-14.md
└── archive/
    ├── 02-content-model-v1.0.md
    ├── 05-admin-cms-pre-repair-2026-08-14.md
    ├── 05-admin-cms-stale-current-detected-2026-08-14-final-search-review.md
    ├── 05-admin-cms-stale-current-detected-2026-08-14.md
    ├── 05-admin-cms-v0.1-pre-freeze.md
    ├── 06-roles-permissions-pre-final-review-repair-2026-08-14.md
    ├── 06-roles-permissions-stale-current-detected-2026-08-14-final-search-review.md
    ├── 06-roles-permissions-stale-current-detected-2026-08-14.md
    ├── 06-roles-permissions-v0.1-pre-freeze.md
    ├── 07-publishing-workflow-pre-state-transition-repair-2026-08-14.md
    ├── 07-publishing-workflow-pre-ux-2026-08-14.md
    ├── 07-publishing-workflow-stale-current-detected-2026-08-14-final-search-review.md
    ├── 07-publishing-workflow-v0.1-pre-edge-cases-2026-08-14.md
    ├── 07-publishing-workflow-v0.1-pre-freeze.md
    ├── 08-search-stale-current-detected-2026-08-14-final-search-review.md
    ├── 08-search-v0.1-pre-final-review-2026-08-14.md
    ├── 08-search-v0.1-pre-freshness-2026-08-14.md
    ├── 08-search-v0.1-pre-matching-2026-08-14.md
    ├── 08-search-v0.1-pre-operations-2026-08-14.md
    ├── 08-search-v0.1-pre-ranking-2026-08-14.md
    ├── 08-search-v0.1-pre-results-ux-2026-08-14.md
    ├── 08-search-v0.1-pre-search-unit-model-2026-08-14.md
    ├── 08-search-v0.1-pre-security-2026-08-14.md
    ├── 09-migration-plan-paused-2026-08-14.md
    ├── 09-migration-plan-v0.1-pre-decision-retention-dedup-2026-08-14.md
    ├── 09-migration-plan-v0.1-pre-inventory-mapping-2026-08-14.md
    ├── PROJECT-INDEX-pre-09-reactivation-2026-08-28.md
    ├── CHANGELOG-pre-09-reactivation-2026-08-28.md
    ├── 10-system-blueprint-v0.1-pre-application-boundaries-2026-08-14.md
    ├── 10-system-blueprint-v1.0-pre-podman-environment-amendment-2026-08-15.md
    ├── CHANGELOG-pre-10-application-boundaries-2026-08-14.md
    ├── CHANGELOG-pre-09-defer-2026-08-14.md
    ├── CHANGELOG-pre-07-final-review-integrity-2026-08-14.md
    ├── CHANGELOG-pre-08-freeze-2026-08-14.md
    ├── CHANGELOG-pre-09-init-2026-08-14.md
    ├── CHANGELOG-pre-10-init-2026-08-14.md
    ├── PROJECT-INDEX-pre-07-final-review-integrity-2026-08-14.md
    ├── PROJECT-INDEX-pre-08-freeze-2026-08-14.md
    ├── PROJECT-INDEX-pre-09-defer-2026-08-14.md
    ├── PROJECT-INDEX-pre-09-init-2026-08-14.md
    ├── PROJECT-INDEX-pre-10-application-boundaries-2026-08-14.md
    └── PROJECT-INDEX-pre-10-init-2026-08-14.md
```

> **หมายเหตุ:** รายชื่อไฟล์ใน `reviews/` และ `archive/` ที่แสดงใน tree ด้านบนเป็นภาพโครงสร้าง/ตัวอย่างและไม่จำเป็นต้องเป็น exhaustive listing ของ snapshot ทุกไฟล์ใน Canonical ZIP; `current/` เท่านั้นที่เป็น Canonical Source of Truth.

### ความหมาย

- `current/` = **ไฟล์ปัจจุบันที่ใช้อ้างอิงจริง**
- `reviews/` = รายงาน Freeze, Review, Amendment
- `archive/` = เวอร์ชันเก่าที่ถูกแทนที่ แต่เก็บเพื่อประวัติ
- ไม่สร้างโฟลเดอร์ `working`, `frozen`, `amended` แยกตาม phase อีก
- Filename ของเอกสารหลัก **ไม่เปลี่ยนตามสถานะ**
- สถานะและเวอร์ชันเปลี่ยนใน Header ของไฟล์แทน
- สำหรับ append-only Controlled Amendment, metadata ด้านบนของ Frozen prefix เป็นประวัติเดิม; **Canonical Freeze Binding ท้ายไฟล์ + Current Canonical Documents ใน Index นี้** เป็น authority ของ effective status/version ปัจจุบัน

ตัวอย่าง:

```text
05-admin-cms.md
Status: WORKING DRAFT
Version: 0.1
```

เมื่อ Freeze:

```text
05-admin-cms.md
Status: FROZEN
Version: 1.0
```

ชื่อไฟล์ยังคงเป็น `05-admin-cms.md`

### Distribution Rule — ไฟล์ที่แนะนำให้ดาวน์โหลด

เพื่อป้องกันเอกสารในเครื่องผู้ใช้คนละ revision กัน ให้ถือกติกาการแจกจ่ายดังนี้:

- **ไฟล์หลักที่แนะนำให้ดาวน์โหลดและเก็บในเครื่องคือ `website-modernization-docs-current.zip` เพียงไฟล์เดียว**
- Canonical ZIP เป็น snapshot ของ `PROJECT-INDEX.md`, `CHANGELOG.md`, `current/`, `reviews/` และ `archive/` ที่สัมพันธ์กัน ณ จุดเวลาเดียวกัน
- ลิงก์ `.md` รายไฟล์มีไว้สำหรับเปิดอ่าน ตรวจสอบ หรือดาวน์โหลดเฉพาะกิจเท่านั้น และ **ไม่ควรถูกถือเป็นชุดเอกสารที่ synchronize แยกจาก Canonical ZIP**
- เมื่อ Canonical ZIP ใหม่ถูกสร้าง ให้แทนที่ชุด `current` ในเครื่องด้วยชุดจาก ZIP ใหม่ทั้งชุด แทนการ copy `.md` บางไฟล์ทับทีละไฟล์
- ผู้ใช้สามารถเก็บ ZIP รุ่นก่อนหน้าไว้เป็น local history ได้ตามต้องการ แต่ Source of Truth ปัจจุบันยังคงเป็น Canonical ZIP ล่าสุดและ `current/` ภายในแพ็กเกจนั้น
- ทุกครั้งที่เอกสารใดใน canonical workspace เปลี่ยน จะต้อง rebuild และตรวจสอบ Canonical ZIP ก่อนถือว่ารอบเอกสารนั้นเสร็จสมบูรณ์

> **Recommended download artifact:** `website-modernization-docs-current.zip`  
> **Individual Markdown files:** inspection/convenience only

---

## 2. Current Canonical Documents

| ID | Document | Status | Version | Canonical File |
|---|---|---|---:|---|
| 00 | Website Foundation | FROZEN | 1.1 | `current/00-website-foundation.md` |
| 01 | Information Architecture | FROZEN | 1.0 | `current/01-information-architecture.md` |
| 02 | Content Model | FROZEN | 1.1 | `current/02-content-model.md` |
| 03 | Sitemap | FROZEN | 1.0 | `current/03-sitemap.md` |
| 04 | Homepage | FROZEN | 1.0 | `current/04-homepage.md` |
| 05 | Admin CMS | FROZEN | 1.1 | `current/05-admin-cms.md` |
| 06 | Roles & Permissions | FROZEN | 1.0 | `current/06-roles-permissions.md` |
| 07 | Publishing Workflow | FROZEN | 1.0 | `current/07-publishing-workflow.md` |
| 08 | Public Search / Search & Discovery | FROZEN | 1.0 | `current/08-search.md` |
| 09 | Migration Plan | FROZEN | 1.1 | `current/09-migration-plan.md` |
| 10 | System Blueprint | FROZEN | 1.2 | `current/10-system-blueprint.md` |

---

## 3. Current Canonical Status

Canonical Headless WordPress integration was persisted at
`b818aac7be76a74c6845e336900cf1f13966fcf7` and post-integration verification at
`2677e783d782c4ffd28d4d4fa6a0be2bf0cb3a30`.

Effective versions:

```text
00 v1.1 | 01 v1.0 | 02 v1.1 | 03 v1.0 | 04 v1.0
05 v1.1 | 06 v1.0 | 07 v1.0 | 08 v1.0 | 09 v1.1 | 10 v1.2
```

For `00/05/09/10`, pre-amendment Frozen bytes remain preserved as historical prefixes. Their final
Canonical Freeze Bindings govern effective status/version; Surgical Overlays supersede only the
implementation mechanisms they explicitly change.

Current architecture:

```text
React Public Website
        │
Songhealth Public REST Contract
        │
songhealth-core WordPress Plugin
        │
WordPress Core
        │
WordPress Database + Media Library
```

- WordPress Core is commodity CMS infrastructure.
- `songhealth-core` owns Songhealth-specific semantics, validation, immutable Public ID, capabilities,
  public eligibility, REST projection and bounded extensions/audit.
- React owns public presentation/canonical routes/accessibility/SEO/Search UX.
- `wp-admin` is the Version 1 Admin baseline.
- standalone Node.js/Fastify/Kysely CMS/runtime and custom Admin React are superseded for future implementation.
- Bangmod Expert Hosting / DirectAdmin remains the Production baseline.
- Delivery 001 remains historical/accepted through T050; T051+ must not continue.
- importer, Trial Migration, Production Import/Cutover remain unauthorized.
- implementation remains NOT AUTHORIZED.

Freeze/reconciliation evidence:

- `reviews/headless-wordpress-phase-g-r2-human-acceptance-freeze-2026-08-29.md`
- `reviews/headless-wordpress-post-integration-verification-2026-08-29.md`
- `reviews/headless-wordpress-metadata-reconciliation-2026-08-29.md`

## 4. Version Change Rule

เมื่อมีการแก้ไขเอกสารที่ Freeze แล้ว:

```text
1. Impact Review
2. ถ้าเป็นการแก้เล็กที่ไม่รื้อ architecture → Controlled Amendment
3. อัปเดตไฟล์ชื่อเดิมใน current/
4. เพิ่ม Version เช่น 1.0 → 1.1
5. เก็บเวอร์ชันเดิมไว้ใน archive/
6. บันทึกเหตุผลใน reviews/ และ CHANGELOG.md
```

ไม่สร้างชื่อเช่น:

```text
02-content-model-final-final-v2-new.md
02-content-model-amended.md
```

---

## 5. Working Document Rule

เอกสารที่ยังไม่ Freeze ใช้ชื่อจริงตั้งแต่แรก เช่น:

```text
05-admin-cms.md
```

ไม่ใช้:

```text
05-admin-cms-working-draft.md
05-admin-cms-updated.md
05-admin-cms-final-draft.md
```

สถานะ `WORKING DRAFT` อยู่ใน Header ของเอกสารเพียงพอ

---

## 6. Source of Truth

> **ถ้าพบไฟล์ชื่อเดียวกันหรือเวอร์ชันเก่าที่อื่น ให้ยึด `website-modernization-docs/current/` เป็นหลักเสมอ**

โฟลเดอร์เก่าภายใต้ `/mnt/data` ถือเป็น Historical Working Artifacts เท่านั้นและไม่ควรนำมาอ้างอิงในการตัดสินใจใหม่



## Migration Plan Freeze v1.0 — 28 สิงหาคม 2569

- Human Acceptance: `reviews/migration-plan-human-acceptance-2026-08-28.md`
- Freeze Review: `reviews/migration-plan-freeze-review-v1.0-2026-08-28.md`
- `current/09-migration-plan.md`: FROZEN v1.0
- Importer implementation / Trial Migration / Production Cutover: NOT AUTHORIZED


## Post-Freeze Semantic Corrective Review — 28 สิงหาคม 2569

- corrected two stale status sentences left from the reactivation phase;
- `current/09-migration-plan.md` remains FROZEN v1.0 byte-for-byte unchanged;
- Frozen `00–08` and Frozen `10-system-blueprint.md` v1.1 remain unchanged;
- importer implementation, Trial Migration and Production Cutover remain unauthorized.

# Content Model Controlled Amendment Review — v1.1

> **Document:** `02-content-model.md`  
> **Previous Version:** 1.0  
> **New Version:** 1.1  
> **Date:** 13 สิงหาคม 2569  
> **Status:** ACCEPTED / APPLIED

## Reason

ระหว่างออกแบบ `05-admin-cms.md` มีการยืนยัน requirement ว่า ITA Evidence อาจเป็นรูปภาพหรือ screenshot ได้ ไม่ได้จำกัดเฉพาะ PDF/Document และ External URL

## Amendment

```text
Before
ITA Evidence
├── Document
└── External URL

After
ITA Evidence
├── Document
├── Media
└── External URL
```

Document และ Media ยังคงเป็น Shared Resource คนละชนิด ไม่สร้าง Generic File Model ใหม่

## Guardrails

- Media Evidence คือ Media ที่ตัวมันเองเป็นหลักฐาน
- Presentation Media ของหน้า ITA ไม่ถือเป็น Evidence โดยอัตโนมัติ
- Staff เลือก Resource เดิมหรือ Upload ใหม่จาก ITA workflow ได้
- Historical ITA Evidence ไม่ถูกเปลี่ยนไปหา successor Document อัตโนมัติ
- ไม่เพิ่ม Compliance Engine, DAM, DMS, File Version Branching หรือ Route ใหม่

## Impact Review

- `00-website-foundation.md` — No conflict
- `01-information-architecture.md` — No structural conflict
- `02-content-model.md` — Updated to v1.1
- `03-sitemap.md` — No route change required
- `04-homepage.md` — No structural change required

## Over-Engineering Review

**PASS** — ใช้ Media Resource ที่มีอยู่แล้วแทนการสร้าง Content Type/File subsystem ใหม่

## Result

**Content Model v1.1 is the current downstream baseline.**

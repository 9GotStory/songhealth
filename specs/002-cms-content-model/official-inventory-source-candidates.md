# Feature 002 — Official Inventory Source Candidates (Discovery Register)

**Status**: documentary candidate-source register ONLY, authored under PO Human Gate
[6391559154](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6391559154)
(2026-10-25, Asia/Bangkok). Immutable baseline `212f8253c4200c4e1272c6004e6c7519faee8d20`
(tip of `prep/002-cms-offline-source-evidence-index`, re-verified unchanged at execution);
this file is the one and only new tracked path on branch `prep/002-official-inventory-source-discovery`,
created from that commit only. Codex Lead preflight for the baseline/branch/path/allowlist:
**CONFIRMED** (independent read-only re-verification, 2026-10-25; scratch log
`/tmp/t032g8-preflight-codex2.log`, temporary). This register serves the pending inventories
recorded in the accepted offline evidence index (§C "Official facility/Area inventory
population — PENDING") and grounds `02-content-model.md` §§10–11 / FR-012/FR-013.
**Nothing here approves a source or its license, ingests or populates any data, claims any
geographic or facility coverage, or changes any task marker, dependency edge, PR, or PO
standing decision (T022/T032/T033 statuses unchanged).**

Inspection date for every INSPECTED item: **2026-10-25 (Asia/Bangkok)**, static public
webpage/document inspection from one development workstation. No authentication, no API
keys, no bulk or record-level downloads, no scraping, no dataset extraction; commercial
search engines were used only to *locate* first-party landing pages, and only first-party
URLs are cited below.

## 0. Evidence classes

- **INSPECTED** — resource fetched and actually read this run (method recorded per item).
- **PUBLISHER STATEMENT** — assertion made on an INSPECTED first-party page about another
  resource (e.g., a menu link naming a sibling system).
- **NOT INSPECTED / UNKNOWN** — not verifiable this run; content is never implied to be read.

## 1. Candidate F — official facility / health-service register (1 of max 1)

### F-1 มาตรฐานข้อมูลด้านสุขภาพ 43 แฟ้ม + ระบบรหัสหน่วยบริการสุขภาพ (HCODE) — กระทรวงสาธารณสุข

| Attribute | Recorded value (evidence class) |
| --- | --- |
| Purpose / category | National health-data standard (43 files) and its health-facility code system; candidate source of the official facility/service code required by `02` §11 and FR-012 |
| Publisher / custodian | กองยุทธศาสตร์และแผนงาน สำนักงานปลัดกระทรวงสาธารณสุข (contact 02-590-1388, นนทบุรี) — shown on the inspected landing page (**INSPECTED**) |
| Landing URL | `https://hdata.moph.go.th/site` (**INSPECTED**: page, menus, announcements) |
| Facility-code system | `https://hcode.moph.go.th/` — named "รหัสหน่วยบริการสุขภาพ" in the hdata main-menu (**PUBLISHER STATEMENT**). Direct fetch from this environment: **HTTP 403 Forbidden** → **NOT INSPECTED**: whether it offers public search/download, its record schema, coverage and rights are all **UNKNOWN** |
| Version / dates observed | Operations manual "Version 2.4.1 ปีงบประมาณ 2568" (PDF `43-file-Structure_Version-2.4.128.04.68.pdf`; PDF metadata 2025-04-23); site announcements dated 2564–2569 incl. "แจ้งปรับปรุงรหัส Provider 04-11-2568" and หนังสือ 0209.12-10371 re HCODE 9 หลัก dated 21-04-2568 (**INSPECTED** as page entries) |
| Verified relevant content | Manual text extraction (**INSPECTED**, glyph-level extraction imperfect — quoted field names only): 52 files listed (PERSON … POLICY); field `HOSPCODE` type C length 5, captioned "รหัสหน่วยบริการ ตามมาตรฐานกองยุทธศาสตร์และแผนงาน"; `HOSPCODE9` (9-character facility code) fields also defined, consistent with the HCODE-9 announcement. The 43-file code-list page (`?page_id=84`, **INSPECTED**) lists 200+ standard code sets with per-code update dates but no facility-register entry — the facility register itself lives at hcode per the menu |
| Facility identity vs `02` §11 | Facility **code** (HOSPCODE/HOSPCODE9) is evidenced as a standard field. Official name / organizational identity / type / operational status / physical location / public service or coverage area per facility: **UNKNOWN** (the registry's own record schema is NOT INSPECTED — 403). No presumption that the register contains the correct or currently active อ.สอง / จ.แพร่ facility inventory |
| Access / reuse terms | No license or terms-of-use statement found on the inspected hdata pages (footer credit only) → **UNKNOWN / PENDING RIGHTS CONFIRMATION**. Public availability ≠ permission to ingest or republish |

## 2. Candidate A — official Area code / hierarchy source (1 of max 1)

### A-1 กรมการปกครอง (DOPA) — รหัสมาตรฐานเขตการปกครองของไทย + ระบบเปิดเผยข้อมูล DOPA

| Attribute | Recorded value (evidence class) |
| --- | --- |
| Purpose / category | Official administrative-area codes and hierarchy (จังหวัด → อำเภอ → ตำบล → หมู่บ้าน) required by `02` §10 / FR-013; custodian of ทำเนียบท้องที่ and area open data |
| Publisher / custodian | กรมการปกครอง กระทรวงมหาดไทย (page "ข้อมูลพื้นฐานการปกครองท้องที่" under สำนักบริหารการปกครองท้องที่) (**INSPECTED**) |
| Landing URLs | `https://multi.dopa.go.th/pab/news/cate9/view46` (**INSPECTED**); open-data catalog `https://catalog.dopa.go.th/dataset` and dataset pages `/dataset/gis-01`, `/dataset/11` (**INSPECTED** — see TLS caveat) |
| Hierarchy observed | ทำเนียบท้องที่ counts: จังหวัด 76 / อำเภอ 878 / ตำบล 7,255 / หมู่บ้าน 75,142, "ข้อมูล ณ เดือนมกราคม 2567" (page dated 9 ก.พ. 2567); second table for areas with appointed กำนัน/ผู้ใหญ่บ้าน. Catalog dataset "ข้อมูลที่ตั้งและสภาพทั่วไปของหมู่บ้านใน 76 จังหวัด" (gis-01) carries tags เขตพื้นที่การปกครอง / หมู่บ้าน / ตำบล / อำเภอ / จังหวัด — i.e., **village level is present**, not absent (**INSPECTED**) |
| Code structure per level | **NOT VERIFIED** — digit lengths/structure of the standard codes were not evidenced on inspected pages (the governing instrument is a scanned image; see below). Level-structure facts stay UNKNOWN pending an authorized document read |
| Legal instrument | ประกาศกระทรวงมหาดไทย เรื่อง รหัสมาตรฐานเขตการปกครองของไทย: first-party URL `https://multi.dopa.go.th/pasd/official_letter/download/75` returns a one-page PDF that is a **scanned image with no text layer** (**INSPECTED** as a file; **content NOT INSPECTED**). Its asserted date (17 เมษายน 2562) and coverage reached this register only as catalog/first-party context (**PUBLISHER STATEMENT**). The ministry page `moi.go.th/moi/รหัสมาตรฐานเขตการปกครอง` returned 404 in this environment (**NOT INSPECTED**) |
| Currency | Catalog dataset pages show update dates in 2568–2569 (e.g., dataset 11: 7 พ.ค. 2569); ทำเนียบท้องที่ page is as of ม.ค. 2567 (**INSPECTED** as page statements) |
| Local scope | อ.สอง / จ.แพร่ enumeration **NOT VERIFIED** — verifying district-level contents would require dataset acquisition, which this gate forbids |
| Access / reuse terms | Catalog dataset pages declare "สัญญาอนุญาตให้ใช้ข้อมูล: **Open Data Common**" (dataset 11 adds "ไม่มีการจำกัดการเข้าถึงข้อมูล") (**INSPECTED**) — the exact Open Data Commons variant/link is not stated → variant **UNKNOWN**. Non-catalog DOPA pages show plain copyright "©2558 ลิขสิทธ์ 1. กรมการปกครอง กระทรวงมหาดไทย"; the linked ข้อกำหนดการใช้งาน page (`multi.dopa.go.th/pab/main/termuse`) renders navigation/footer only, no policy body (**INSPECTED** as empty-body) → precise reuse terms for non-catalog artifacts **UNKNOWN / PENDING RIGHTS CONFIRMATION** |
| TLS caveat | `catalog.dopa.go.th` presents an incomplete certificate chain (verification fails in standard tooling); catalog pages were fetched with certificate verification relaxed to complete static inspection. Recorded as an environment caveat; the cited content is the catalog's own HTML |

## 3. Bounded search boundary and set-aside alternatives

Boundary: Thai-language public-web searches for (a) facility registries ("ทะเบียน/รหัสหน่วยบริการ",
"ขึ้นทะเบียนสถานพยาบาล", "43 แฟ้ม HCODE") and (b) area codes ("รหัสพื้นที่", "รหัสมาตรฐานเขตการปกครอง",
"ทำเนียบท้องที่"); first-party landings then inspected directly. Stopped at one candidate per category.

Examined and set aside (not nominated):

- **สบส. / hss.moph.go.th** (**INSPECTED** homepage `index2.php`): public verification service
  "ตรวจสอบสถานพยาบาลเอกชนที่ได้รับอนุญาต" (`hosp.hss.moph.go.th`) and owning division
  กองสถานพยาบาลและการประกอบโรคศิลปะ. Set aside: public-facing scope is explicitly **private**
  licensed facilities under พ.ร.บ.สถานพยาบาล — coverage of district public facilities (รพ.สต.,
  สสอ.) is unproven; footer states "สงวนสิทธิ์ทุกประการ" (no open license observed).
- **สปสช./NHSO registries, HDC portal, data.go.th** — not inspected this round (bounded
  one-candidate rule; data.go.th is a national aggregator, not the first-party custodian).
- **moi.go.th area-code page** — HTTP 404 in this environment; NOT INSPECTED, no content inferred.

## 4. PO decision list (required before ANY record-level acquisition, ingestion, population or UI/data claims)

1. Authoritativeness/custodianship: confirm F-1 (กองยุทธศาสตร์และแผนงาน สปส.) and A-1 (กรมการปกครอง)
   as the accepted official sources for Songhealth's facility codes and Area codes respectively.
2. Geographic scope: verify actual อ.สอง / จ.แพร่ content (facilities incl. รพ.สต.; Area tree to village)
   under a separately authorized inspection — this register deliberately did not open any dataset.
3. Date/currency: pick the governing version (e.g., manual v2.4.1 FY2568; latest catalog revision).
4. Code mapping per level incl. village tier: structure/lengths still NOT VERIFIED (scanned ประกาศ มท.;
   unreadable; needs an authorized document read or OCR).
5. Facility identity and eligibility: which facility types/attributes (name, type, status, location,
   service area) enter Health Service, given the registry schema itself is UNKNOWN (hcode 403).
6. License/reuse rights: resolve hcode terms; exact Open Data Commons variant for catalog datasets;
   terms for non-catalog DOPA artifacts; public availability is not ingestion permission.
7. Content stewardship: who owns and refreshes canonical copies inside Songhealth.
8. Future authorization: a separate PO gate is required before any download/ingestion/population,
   schema/taxonomy population, or public UI claim based on these sources.

## 5. Provenance and verification log (all 2026-10-25, Asia/Bangkok)

| Resource | Method | Result / class |
| --- | --- | --- |
| `https://hss.moph.go.th/index2.php` | fetch+read | INSPECTED (menus, links, copyright) |
| `https://hdata.moph.go.th/site` | fetch+read | INSPECTED (publisher, manual link, announcements) |
| `https://hdata.moph.go.th/site/?page_id=84` | fetch+read | INSPECTED (code-list entries + dates) |
| 43-file manual PDF v2.4.1 | fetch + `pdftotext` | INSPECTED (field tables; glyph caveat noted) |
| `https://hcode.moph.go.th/` | fetch (2 UAs) | **403 → NOT INSPECTED** |
| `https://multi.dopa.go.th/pab/news/cate9/view46` | fetch+read | INSPECTED (counts, dates, ©2558) |
| `https://multi.dopa.go.th/pab/main/termuse` | fetch+read | INSPECTED (body does not render; nav/footer only) |
| `https://multi.dopa.go.th/pasd/official_letter/download/75` | fetch | file received; scanned image PDF → content **NOT INSPECTED** |
| `https://catalog.dopa.go.th/dataset` (+2 dataset pages, 2 searches) | fetch (TLS caveat) + read | INSPECTED (titles, tags, dates, license fields) |
| `https://moi.go.th/moi/รหัสมาตรฐานเขตการปกครอง` | fetch | **404 → NOT INSPECTED** |

**Declarations**: no record-level data copied, extracted or downloaded; no login/credentials used;
no outreach to publishers; no runtime/DB/controller/PAT access; no changes to PR #28/#36/#37,
task markers, or any tracked path other than this file; no PR created. An honestly recorded
"UNKNOWN / NOT INSPECTED" is deliberate, not an omission. This register is a candidate list for
PO decision only — it is not source-of-truth approval, not data intake, and not a feature
acceptance step.

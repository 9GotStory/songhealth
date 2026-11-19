# #346 evidence: Feature 011 (the Health Information hub, the Health Reports, Services and Health Services pages) on the development runtime

Feature 011's evidence round (spec #338), run on 2026-11-19 by Claude Code at `9f31dc0`, the head
of `011-health-reports-services-health-services`, and the Product Owner's walkthrough of
2026-11-19. This is a self-run record, not an independent review, and not the Product Owner's
acceptance, which the Product Owner gives on #338.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`. It served `92638bc`
  (#345's merge); the round promoted `9f31dc0`, the merge of #345's retro (PR #361), with a backup
  (`20261119T011110Z`). No window held it. `dev-runtime-verify.sh` reported VERIFY: PASS at
  `9f31dc0f43f70a3cbb6b949363f686ebef92ce44` after the promotion (01:11Z) and
  after the walkthrough (02:39Z).
- **Code under test:** `9f31dc0`. #346's branch adds documents over it, so its head has
  `9f31dc0`'s application code. Node 26.13.0, npm 12.2.1.
- **Content:** the demo dataset, 56 entries, all published, and each capture's and each measure's
  own synthetic fixtures, which it removes.

## Checks

The browser suites ran at `9f31dc0` between 01:11Z and 01:47Z on 2026-11-19, T021 at 01:47Z, the
captures between 01:48Z and 01:51Z and the measures between 01:51Z and 02:25Z, and one more at
02:26Z. The local checks ran on
#346's working tree between 02:27Z and 02:31Z, before the review. The pull request states the checks at its head.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | exit 0: 0 errors, 0 warnings, 2 hints |
| Node seam | `npm run test:node` | 827 of 827 passed |
| Build | `npm run build:check` | exit 0; `check-built-styles: PASS (2 stylesheets, the reveal in 1)` |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | each exit 0; jscpd's baseline unchanged at 21 clones |
| Browser seam | `scripts/dev-runtime-env.sh npm run test:browser` | 717 passed, 14 skipped, in 35.6 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | source identity verified at `9f31dc0`; 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 46 misses, all synthetic; 56 entries, 0 not published; 0 database connection errors in the last hour |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | cleared before the walkthrough (02:31Z), 46 entries, none without the synthetic marks |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator;
the coordinator ran those 14 at 01:47Z. No test of the full run failed. The run's near-timeout
report named two tests at 60 % or more of their 30 s, `public-demo-dataset.spec.ts`'s axe and
focus case on the dataset's list pages, 20.7 s at the mobile width and 19.5 s at the desktop width;
both passed.

## Screenshots

After, at `9f31dc0`, with reduced motion preferred, so the pages show at rest, by
`.tmp/346/capture-after.sh` on the development host:

```text
node scripts/capture-screenshots.mjs <dir> after-<name>-<width>=<path>@<width>   # the demo dataset
LIST=<list> LIST_COUNT=<n> scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/lists-by-count.ts <dir>                               # the synthetic lists
scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/service-page.ts <dir>                                 # and health-service-page.ts
```

Before: the feature's first ticket's, the 100 images on `evidence/011-339-screenshots` at
`22026c3`, taken at `0d55a16` on `main` before the feature's first promotion with the same
commands, targets and counts (the note from #339), and the Homepage's ten on
`evidence/011-340-screenshots` at `08eba5d` (the note from #340). This round captured the same 22
cases at the same five widths: the seven addresses on the demo dataset (`/health`,
`/health/reports`, the dengue report's page, `/services`, the flu-vaccine Service's page,
`/health-services` and Ban Klang's page); with `lists-by-count.ts` one, two, four and 24 Services
(and the second page), 40 Health Services (and the second page, and the pages of an inactive one
and of one without coordinates) and 40 Health Reports (and the second page, and the pages of a
report without a fiscal year and of one whose Document is unpublished); and the Homepage whole and
its Frequently Used Services up close, after decision 20. It also captured ten cases after only,
whose before images are on their tickets' branches (`evidence/011-343-screenshots` at `944b46f`,
`evidence/011-344-screenshots` at `23218aa` and `evidence/011-345-screenshots` at `a328319`): the demo dataset's report
without a report date (`health-report-no-date`), its complaint and health-rights Services
(`service-complaint`, `service-external`), Song hospital (`health-service-song-hospital`) and
Huai Mai, closed for now (`health-service-closed`); `lists-by-count.ts`'s report whose file is gone
(`health-report-file-gone`); `service-page.ts`'s Service with two categories and one with no card;
and `health-service-page.ts`'s Health Service without a location and one with no detail. The demo
dataset did not change between `0d55a16` and `9f31dc0`; the synthetic titles and slugs are made
again on each run.

`scripts/evidence-branch.sh` put the 270 images (110 before, 160 after) and their `captures.txt`
on the image-only branch `evidence/011-346-screenshots`, at
`86de6c9ffb4a210b19cc7c2a44a57dbb08253e69`. Page heights in pixels, the table that script printed
from the PNGs (a `-list-<n>` case is `lists-by-count.ts` with that many entries; a page with 900 px
at every width is shorter than the window):

| Page | | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `health` | before | 900 | 900 | 900 | 900 | 969 |
| | after | 900 | 900 | 900 | 900 | 900 |
| `health-report` | before | 1,127 | 1,127 | 1,147 | 1,411 | 1,567 |
| | after | 1,022 | 1,022 | 1,042 | 1,328 | 1,530 |
| `health-report-document-unpublished` | before | 1,003 | 1,003 | 1,023 | 1,171 | 1,387 |
| | after | 1,054 | 1,054 | 1,074 | 1,240 | 1,456 |
| `health-report-file-gone` | after | 1,050 | 1,050 | 1,070 | 1,232 | 1,418 |
| `health-report-no-date` | after | 1,042 | 1,042 | 1,030 | 1,264 | 1,466 |
| `health-report-no-fiscal-year` | before | 1,229 | 1,253 | 1,211 | 1,359 | 1,579 |
| | after | 1,192 | 1,192 | 1,130 | 1,340 | 1,564 |
| `health-reports` | before | 1,099 | 1,099 | 1,131 | 1,421 | 1,627 |
| | after | 1,079 | 1,079 | 1,207 | 1,207 | 1,373 |
| `health-reports-list-40` | before | 4,061 | 4,061 | 4,093 | 5,619 | 6,445 |
| | after | 3,755 | 3,755 | 3,793 | 4,327 | 4,673 |
| `health-reports-list-40-page-2` | before | 3,963 | 3,963 | 3,995 | 5,429 | 6,195 |
| | after | 3,701 | 3,701 | 3,739 | 4,347 | 4,853 |
| `health-service` | before | 1,043 | 1,043 | 1,075 | 1,361 | 1,511 |
| | after | 1,306 | 1,306 | 1,324 | 1,502 | 1,652 |
| `health-service-bare` | after | 900 | 900 | 900 | 900 | 900 |
| `health-service-closed` | after | 962 | 962 | 994 | 1,250 | 1,434 |
| `health-service-inactive` | before | 903 | 903 | 923 | 1,119 | 1,303 |
| | after | 978 | 978 | 998 | 1,186 | 1,404 |
| `health-service-no-location` | after | 1,167 | 1,167 | 1,185 | 1,367 | 1,551 |
| `health-service-no-map` | before | 1,045 | 1,045 | 1,003 | 1,199 | 1,383 |
| | after | 1,140 | 1,140 | 1,078 | 1,266 | 1,450 |
| `health-service-song-hospital` | after | 1,316 | 1,316 | 1,334 | 1,508 | 1,684 |
| `health-services` | before | 1,425 | 1,425 | 1,517 | 1,771 | 2,105 |
| | after | 1,393 | 1,393 | 1,715 | 2,021 | 2,221 |
| `health-services-list-40` | before | 3,971 | 3,971 | 4,063 | 5,315 | 5,779 |
| | after | 3,793 | 3,793 | 5,011 | 5,865 | 6,191 |
| `health-services-list-40-page-2` | before | 3,917 | 3,917 | 4,009 | 5,377 | 5,741 |
| | after | 3,759 | 3,759 | 4,921 | 5,683 | 6,003 |
| `home` | before | 5,541 | 5,704 | 7,557 | 6,344 | 6,866 |
| | after | 5,541 | 5,704 | 7,557 | 6,344 | 6,866 |
| `home-services` | before | 362 | 444 | 606 | 750 | 848 |
| | after | 362 | 444 | 606 | 750 | 848 |
| `service` | before | 1,345 | 1,345 | 1,377 | 1,623 | 1,889 |
| | after | 1,415 | 1,415 | 1,601 | 1,871 | 2,043 |
| `service-categories` | after | 1,493 | 1,493 | 1,567 | 1,819 | 2,075 |
| `service-complaint` | after | 2,097 | 2,097 | 2,073 | 2,331 | 2,581 |
| `service-external` | after | 913 | 913 | 913 | 1,103 | 1,277 |
| `service-no-card` | after | 900 | 900 | 900 | 900 | 900 |
| `services` | before | 1,499 | 1,553 | 2,015 | 3,057 | 3,373 |
| | after | 1,365 | 1,499 | 1,829 | 1,953 | 2,199 |
| `services-list-1` | before | 1,015 | 1,015 | 1,047 | 1,169 | 1,363 |
| | after | 1,013 | 1,013 | 1,051 | 1,121 | 1,247 |
| `services-list-2` | before | 1,151 | 1,219 | 1,217 | 1,591 | 1,873 |
| | after | 1,133 | 1,253 | 1,231 | 1,375 | 1,591 |
| `services-list-24` | before | 1,847 | 1,915 | 2,383 | 4,055 | 4,877 |
| | after | 1,683 | 1,803 | 2,207 | 2,379 | 2,865 |
| `services-list-24-page-2` | before | 1,929 | 2,065 | 2,547 | 4,071 | 4,433 |
| | after | 1,829 | 2,009 | 2,319 | 2,679 | 3,045 |
| `services-list-4` | before | 1,403 | 1,471 | 1,469 | 2,007 | 2,343 |
| | after | 1,331 | 1,481 | 1,429 | 1,571 | 1,829 |

The Homepage's heights, whole and its Frequently Used Services, are the same as before at every
width, as the note from #340 found at `08eba5d`.

## Contrast

`scripts/measure-text-contrast.ts --all-text --fold <path> main` at `9f31dc0`, at 1,440, 1,024, 768,
375 and 320 px, every run exit 0, between 01:51Z and 02:25Z: every text in `main` on twelve demo
addresses, the Homepage's Frequently Used Services, and fourteen synthetic cases. Small text needs
4.5:1 and large text 3:1 (WCAG 2.2 SC 1.4.3). No run named a text it could not read. The lowest
reading of any text is 4.69:1, the pager's "หน้า 1" under the catalog's last row (decision 21);
the breadcrumb's link to the directory on a Health Service's page reads 4.88:1 at 375 px, and every
other text 4.94:1 or more. Each run's closing lines follow whole: a text, its lowest reading over
the five widths and the widths that read it; a line ending "(N texts)" folds texts whose words
differ only in their numbers, written "#".

Every reading Feature 011's tickets recorded in `DESIGN.md` is read the same at `9f31dc0`: the
lists' field (§3.2, §7.8; #339 at `06b4b58`), the catalog's cards and the Homepage's (§7.8, §8.4;
#340 at `fad2249`), the Health Service row (§7.3; #341 at `bf2b3d4`), the Health Report row and its
tile's fiscal year (§3.2, §7.3; #342 at `7b49b6e`), and a Health Report's, a Service's and a Health
Service's page (§9.6 to §9.8; #343 at `a683d48`, #344 at `e5ea613`, #345 at `2b24bb8`).

### The four lists and the Homepage's Frequently Used Services, on the demo dataset

`/health`:

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
span "ข้อมูลสุขภาพ"  9.47:1 at 320 px
p "สุขภาพ"  8.84:1 at 320 px
h1 "ข้อมูลสุขภาพ"  7.70:1 at 320 px
p "ความรู้สุขภาพสำหรับประชาชน และ"  6.45:1 at 768, 375 and 320 px
h2 "ความรู้สุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "รายงานสุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`/health/reports`:

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
a "ข้อมูลสุขภาพ"  9.46:1 at 320 px
span "รายงานสุขภาพ"  6.79:1 at 320 px
p "สุขภาพ"  8.84:1 at 320 px
h1 "รายงานสุขภาพ"  7.49:1 at 320 px
p "รายงานด้านสุขภาพของสำนักงานสาธ"  6.45:1 at 768, 375 and 320 px
span "#"  5.60:1 at 768, 375 and 320 px (3 texts)
span "รายงานสถานการณ์โรค"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (6 texts)
time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
h2 "[ตัวอย่าง] รายงานสถานการณ์โรคไ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "จำนวนผู้ป่วย อัตราป่วย และการด"  4.97:1 at 1440, 1024 and 768 px
p "ช่วงเวลาของรายงาน: กรกฎาคม – ก"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "รายงานผลการดำเนินงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] รายงานผลการดำเนินงา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สรุปผลการดำเนินงานตามตัวชี้วัด"  4.97:1 at 1440, 1024 and 768 px
p "ช่วงเวลาของรายงาน: ตุลาคม #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
time "# ส.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] รายงานความครอบคลุมก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ความครอบคลุมการได้รับวัคซีนพื้"  4.97:1 at 1440, 1024 and 768 px
p "ช่วงเวลาของรายงาน: เมษายน – มิ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`/services`:

```text
a "หน้าแรก"  10.85:1 at 320 px
span "บริการประชาชน"  9.86:1 at 320 px
p "บริการ"  9.46:1 at 320 px
h1 "บริการประชาชน"  8.14:1 at 320 px
p "บริการที่สำนักงานสาธารณสุขอำเภ"  6.45:1 at 768 px
a "ค้นหาหน่วยบริการสุขภาพที่เกี่ย"  6.45:1 at 320 px
a "คู่มือและแบบฟอร์ม"  6.72:1 at 320 px
label "หมวดบริการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
button "แสดงผล"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] ขอข้อมูลหรือเอกสารจ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ขั้นตอนและช่องทางการขอข้อมูลข่"  5.07:1 at 1024 px
h2 "[ตัวอย่าง] แจ้งปัญหาด้านสุขภาพ"  14.82:1 at 320 px
p "แจ้งปัญหาสุขภาพในชุมชน เพื่อให"  5.66:1 at 1440, 1024 and 768 px
h2 "[ตัวอย่าง] แจ้งปัญหาสิ่งแวดล้อ"  14.82:1 at 320 px
p "แจ้งเหตุรำคาญ กลิ่น ควัน น้ำเส"  5.07:1 at 768 px
h2 "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ"  14.82:1 at 320 px
p "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที"  5.66:1 at 1440, 1024 and 768 px
h2 "[ตัวอย่าง] ตรวจสอบสิทธิหลักประ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ตรวจสอบสิทธิการรักษาพยาบาลของต"  5.66:1 at 1440, 1024 and 768 px
h2 "[ตัวอย่าง] บริการสำหรับ อสม."  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ข้อมูล แบบฟอร์ม และช่องทางติดต"  5.66:1 at 1440, 1024 and 768 px
h2 "[ตัวอย่าง] ร้องเรียนการปฏิบัติ"  14.82:1 at 375 px
p "แจ้งเรื่องที่ไม่ได้รับความสะดว"  5.07:1 at 1440 and 1024 px
h2 "[ตัวอย่าง] สอบถามข้อมูลทั่วไป"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ช่องทางสอบถามข้อมูลบริการและกา"  5.66:1 at 1440, 1024 and 768 px
h2 "[ตัวอย่าง] เสนอแนะ / แสดงความค"  14.82:1 at 375 and 320 px
p "เสนอแนะเพื่อพัฒนาการให้บริการข"  5.66:1 at 1440, 1024 and 768 px
```

`/health-services`:

```text
a "หน้าแรก"  10.85:1 at 375 and 320 px
a "บริการประชาชน"  9.73:1 at 375 and 320 px
span "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  5.07:1 at 375 px
p "หน่วยบริการ"  8.84:1 at 320 px
h1 "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  6.99:1 at 320 px
p "ค้นหาโรงพยาบาล รพ.สต. และหน่วย"  6.45:1 at 768, 375 and 320 px
label "พื้นที่รับผิดชอบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
label "ชื่อหน่วยบริการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
button "แสดงผล"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "โรงพยาบาลส่งเสริมสุขภาพตำบล"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "ตำบลบ้านกลาง"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] รพ.สต.บ้านกลาง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
p "# หมู่ # ตำบลบ้านกลาง อำเภอสอ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] รพ.สต.บ้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "ตำบลสะเอียบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] รพ.สต.สะเอียบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลสะเอียบ อำเภอสอง "  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] รพ.สต.สะ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "ตำบลห้วยหม้าย"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ปิดให้บริการชั่วคราว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] รพ.สต.ห้วยหม้าย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลห้วยหม้าย อำเภอสอ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] รพ.สต.ห้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "โรงพยาบาลชุมชน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] โรงพยาบาลสอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลบ้านกลาง อำเภอส"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] โรงพยาบา"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`/`, the Frequently Used Services' section (`section[aria-labelledby="home-services"]`):

```text
p "บริการ"  7.38:1 at 768 px
h2 "บริการประชาชน"  7.19:1 at 375 and 320 px
span "ทั้งหมด"  5.81:1 at 768 px
h3 "[ตัวอย่าง] ร้องเรียนการปฏิบัติ"  14.82:1 at 375 px
p "แจ้งเรื่องที่ไม่ได้รับความสะดว"  5.07:1 at 1440 and 1024 px
h3 "[ตัวอย่าง] เสนอแนะ / แสดงความค"  14.82:1 at 375 and 320 px
p "เสนอแนะเพื่อพัฒนาการให้บริการข"  5.66:1 at 1440, 1024 and 768 px
h3 "[ตัวอย่าง] แจ้งปัญหาด้านสุขภาพ"  14.82:1 at 320 px
p "แจ้งปัญหาสุขภาพในชุมชน เพื่อให"  5.66:1 at 1440, 1024 and 768 px
h3 "[ตัวอย่าง] ขอข้อมูลหรือเอกสารจ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ขั้นตอนและช่องทางการขอข้อมูลข่"  5.07:1 at 1024 px
h3 "[ตัวอย่าง] บริการสำหรับ อสม."  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ข้อมูล แบบฟอร์ม และช่องทางติดต"  5.66:1 at 1440, 1024 and 768 px
h3 "[ตัวอย่าง] สอบถามข้อมูลทั่วไป"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ช่องทางสอบถามข้อมูลบริการและกา"  5.66:1 at 1440, 1024 and 768 px
```

### The lists' synthetic states (`lists-by-count.ts`)

`/services` with one Service (`LIST=services LIST_COUNT=1`):

```text
a "หน้าแรก"  10.85:1 at 320 px
span "บริการประชาชน"  9.86:1 at 320 px
p "บริการ"  9.46:1 at 320 px
h1 "บริการประชาชน"  8.14:1 at 320 px
p "บริการที่สำนักงานสาธารณสุขอำเภ"  6.45:1 at 768 px
a "ค้นหาหน่วยบริการสุขภาพที่เกี่ย"  6.45:1 at 320 px
a "คู่มือและแบบฟอร์ม"  6.72:1 at 320 px
label "หมวดบริการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
button "แสดงผล"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] ขอรับคำปรึกษาด้านสุ"  14.82:1 at 320 px
p "บริการของสำนักงานสาธารณสุขอำเภ"  5.07:1 at 1024 and 768 px
```

`/services` with a full first page of twelve and a pager (`LIST_COUNT=24`):

```text
a "หน้าแรก"  10.85:1 at 320 px
span "บริการประชาชน"  9.86:1 at 320 px
p "บริการ"  9.46:1 at 320 px
h1 "บริการประชาชน"  8.14:1 at 320 px
p "บริการที่สำนักงานสาธารณสุขอำเภ"  6.45:1 at 768 px
a "ค้นหาหน่วยบริการสุขภาพที่เกี่ย"  6.45:1 at 320 px
a "คู่มือและแบบฟอร์ม"  6.72:1 at 320 px
label "หมวดบริการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
button "แสดงผล"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] ขอรับคำปรึกษาด้านสุ"  16.54:1 at 1440, 1024, 768, 375 and 320 px (6 texts)
p "บริการของสำนักงานสาธารณสุขอำเภ"  5.07:1 at 1024 and 768 px (12 texts)
h2 "[ตัวอย่าง] ขอสำเนาเอกสารของสำน"  14.82:1 at 375 and 320 px (6 texts)
li "หน้า #"  4.69:1 at 1440, 1024, 768, 375 and 320 px
a "หน้าถัดไป"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`/health-services` with eight (closed, inactive and unmapped rows; `LIST=health-services LIST_COUNT=8`):

```text
a "หน้าแรก"  10.85:1 at 375 and 320 px
a "บริการประชาชน"  9.73:1 at 375 and 320 px
span "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  5.07:1 at 375 px
p "หน่วยบริการ"  8.84:1 at 320 px
h1 "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  6.99:1 at 320 px
p "ค้นหาโรงพยาบาล รพ.สต. และหน่วย"  6.45:1 at 768, 375 and 320 px
label "พื้นที่รับผิดชอบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
label "ชื่อหน่วยบริการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
button "แสดงผล"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "สถานีอนามัย"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (8 texts)
span "ตำบลตัวอย่างใต้"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
a "[ตัวอย่าง] คลินิกชุมชนอบอุ่นตั"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "# หมู่ # ตำบลตัวอย่าง อำเภอสอ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (7 texts)
a "เปิดแผนที่ [ตัวอย่าง] คลินิกชุ"  6.45:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "โรงพยาบาลส่งเสริมสุขภาพตำบล"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "ตำบลตัวอย่างเหนือ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "ปิดให้บริการชั่วคราว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุ"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "เปิดแผนที่ [ตัวอย่าง] โรงพยาบา"  6.45:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ไม่เปิดให้บริการแล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] ศูนย์สุขภาพชุมชนตัว"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "เปิดแผนที่ [ตัวอย่าง] ศูนย์สุข"  6.45:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ศูนย์สุขภาพชุมชน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] สถานีอนามัยบ้านตัวอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] สถานีอนา"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] สำนักงานสาธารณสุขอำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`/health/reports` with eight (no fiscal year, no report date; `LIST=health-reports LIST_COUNT=8`):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
a "ข้อมูลสุขภาพ"  9.46:1 at 320 px
span "รายงานสุขภาพ"  6.79:1 at 320 px
p "สุขภาพ"  8.84:1 at 320 px
h1 "รายงานสุขภาพ"  7.49:1 at 320 px
p "รายงานด้านสุขภาพของสำนักงานสาธ"  6.45:1 at 768, 375 and 320 px
span "#"  5.60:1 at 375 and 320 px (7 texts)
span "รายงานสถานการณ์โรค"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (15 texts)
time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (8 texts)
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (7 texts)
h2 "[ตัวอย่าง] รายงานสถานการณ์โรคป"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "สรุปสถานการณ์และผลการดำเนินงาน"  4.97:1 at 1440, 1024 and 768 px (6 texts)
p "ช่วงเวลาของรายงาน: ตุลาคม #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (8 texts)
h2 "[ตัวอย่าง] รายงานความครอบคลุมก"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "รายงานผลการดำเนินงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
h2 "[ตัวอย่าง] สำนักงานสาธารณสุขอำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] รายงานการเฝ้าระวังโ"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h2 "[ตัวอย่าง] รายงานผลการดำเนินงา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

### A Health Report's page

`/health/reports/demo-report-dengue-q4` (every field):

```text
a "หน้าแรก"  10.85:1 at 375 and 320 px
a "ข้อมูลสุขภาพ"  9.73:1 at 375 and 320 px
a "รายงานสุขภาพ"  6.98:1 at 320 px
span "[ตัวอย่าง] รายงานสถานการณ์โรคไ"  5.41:1 at 375 px
span "วันที่รายงาน # พ.ย. #"  7.75:1 at 1440, 1024, 768, 375 and 320 px
span "รายงานสถานการณ์โรค"  6.70:1 at 375 px
h1 "[ตัวอย่าง] รายงานสถานการณ์โรคไ"  6.45:1 at 1024, 768 and 320 px
p "จำนวนผู้ป่วย อัตราป่วย และการด"  6.45:1 at 768, 375 and 320 px
span "PDF"  5.68:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารรายงาน"  12.21:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] เอกสารรายงานสถานการ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "PDF, # KB"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ดาวน์โหลดเอกสาร (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "รายงานสถานการณ์โรค"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "วันที่รายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
time "# พ.ย. #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่วงเวลาของรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "กรกฎาคม – กันยายน #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ปีงบประมาณ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "#"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "เจ้าของ/แหล่งที่มา"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สำนักงานสาธารณสุขอำเภอสอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`/health/reports/demo-report-performance-2569` (no report date):

```text
a "หน้าแรก"  10.85:1 at 375 and 320 px
a "ข้อมูลสุขภาพ"  9.73:1 at 375 and 320 px
a "รายงานสุขภาพ"  6.98:1 at 320 px
span "[ตัวอย่าง] รายงานผลการดำเนินงา"  5.34:1 at 375 px
span "รายงานผลการดำเนินงาน"  8.84:1 at 375 and 320 px
h1 "[ตัวอย่าง] รายงานผลการดำเนินงา"  6.45:1 at 768 px
p "สรุปผลการดำเนินงานตามตัวชี้วัด"  6.45:1 at 768, 375 and 320 px
span "PDF"  5.68:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารรายงาน"  12.21:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] เอกสารรายงานผลการดำ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "PDF, # KB"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ดาวน์โหลดเอกสาร (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "รายงานผลการดำเนินงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่วงเวลาของรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "ตุลาคม # – กันยายน #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ปีงบประมาณ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "#"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "เจ้าของ/แหล่งที่มา"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สำนักงานสาธารณสุขอำเภอสอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`fixture:health-report-no-fiscal-year` (`LIST=health-reports LIST_COUNT=4`):

```text
a "หน้าแรก"  11.00:1 at 375 and 320 px
a "ข้อมูลสุขภาพ"  10.01:1 at 375 px
a "รายงานสุขภาพ"  7.27:1 at 320 px
span "[ตัวอย่าง] สำนักงานสาธารณสุขอำ"  5.48:1 at 375 px
span "วันที่รายงาน # พ.ย. #"  7.75:1 at 1440, 1024, 768, 375 and 320 px
span "รายงานผลการดำเนินงาน"  6.44:1 at 375 px
h1 "[ตัวอย่าง] สำนักงานสาธารณสุขอำ"  6.45:1 at 768 and 320 px
p "สรุปสถานการณ์และผลการดำเนินงาน"  6.45:1 at 1024, 768, 375 and 320 px
span "PDF"  5.68:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารรายงาน"  12.21:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] เอกสารรายงานฉบับเต็"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "PDF, # KB"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ดาวน์โหลดเอกสาร (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "รายงานผลการดำเนินงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "วันที่รายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
time "# พ.ย. #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่วงเวลาของรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "ตุลาคม # – กันยายน #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "เจ้าของ/แหล่งที่มา"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สำนักงานสาธารณสุขอำเภอสอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`fixture:health-report-document-unpublished` (the same):

```text
a "หน้าแรก"  10.70:1 at 320 px
a "ข้อมูลสุขภาพ"  9.60:1 at 375 and 320 px
a "รายงานสุขภาพ"  6.80:1 at 320 px
span "[ตัวอย่าง] รายงานความครอบคลุมก"  6.01:1 at 320 px
span "รายงานสถานการณ์โรค"  8.72:1 at 320 px
h1 "[ตัวอย่าง] รายงานความครอบคลุมก"  6.27:1 at 375 px
p "สรุปสถานการณ์และผลการดำเนินงาน"  6.45:1 at 768, 375 and 320 px
h2 "เอกสารรายงาน"  12.21:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารรายงานไม่พร้อมให้บริการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
p "หากต้องการเอกสารนี้ โปรดติดต่อ"  5.07:1 at 1440, 1024, 768, 375 and 320 px
a "ติดต่อเรา"  5.78:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "รายงานสถานการณ์โรค"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่วงเวลาของรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "ตุลาคม # – กันยายน #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ปีงบประมาณ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "#"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "เจ้าของ/แหล่งที่มา"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สำนักงานสาธารณสุขอำเภอสอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`fixture:health-report-file-gone` (the same):

```text
a "หน้าแรก"  10.56:1 at 375 and 320 px
a "ข้อมูลสุขภาพ"  9.34:1 at 375 and 320 px
a "รายงานสุขภาพ"  6.61:1 at 320 px
span "[ตัวอย่าง] รายงานการเฝ้าระวังโ"  7.48:1 at 320 px
span "วันที่รายงาน # พ.ย. #"  7.75:1 at 1440, 1024, 768, 375 and 320 px
span "รายงานผลการดำเนินงาน"  5.79:1 at 375 px
h1 "[ตัวอย่าง] รายงานการเฝ้าระวังโ"  6.19:1 at 375 px
h2 "เอกสารรายงาน"  12.21:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารรายงานไม่พร้อมให้บริการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
p "หากต้องการเอกสารนี้ โปรดติดต่อ"  5.07:1 at 1440, 1024, 768, 375 and 320 px
a "ติดต่อเรา"  5.78:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "รายงานผลการดำเนินงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "วันที่รายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
time "# พ.ย. #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่วงเวลาของรายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "ตุลาคม # – กันยายน #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ปีงบประมาณ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "#"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "เจ้าของ/แหล่งที่มา"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สำนักงานสาธารณสุขอำเภอสอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

### A Service's page

`/services/demo-service-flu-vaccine` (three offering Health Services):

```text
a "หน้าแรก"  10.70:1 at 320 px
a "บริการประชาชน"  9.34:1 at 320 px
span "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ"  8.37:1 at 320 px
span "แจ้งปัญหาสุขภาพ"  8.96:1 at 320 px
h1 "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ"  6.62:1 at 1024 px
p "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที"  6.45:1 at 375 and 320 px
dt "ผู้ให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "หมวดบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "แจ้งปัญหาสุขภาพ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "ช่องทางรับบริการ"  10.22:1 at 768, 375 and 320 px
li "ติดต่อหน่วยบริการสุขภาพที่ให้บ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "หน่วยบริการ"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "หน่วยบริการสุขภาพที่ให้บริการน"  15.47:1 at 375 and 320 px
span "โรงพยาบาลส่งเสริมสุขภาพตำบล"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "ตำบลบ้านกลาง"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] รพ.สต.บ้านกลาง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "# หมู่ # ตำบลบ้านกลาง อำเภอสอ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] รพ.สต.บ้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "ตำบลสะเอียบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] รพ.สต.สะเอียบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลสะเอียบ อำเภอสอง "  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] รพ.สต.สะ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "โรงพยาบาลชุมชน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] โรงพยาบาลสอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลบ้านกลาง อำเภอส"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] โรงพยาบา"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`/services/demo-service-complaint` (every guidance field, a related Document):

```text
a "หน้าแรก"  10.70:1 at 320 px
a "บริการประชาชน"  9.34:1 at 320 px
span "[ตัวอย่าง] ร้องเรียนการปฏิบัติ"  5.55:1 at 320 px
span "ร้องเรียนและเสนอแนะ"  8.71:1 at 320 px
h1 "[ตัวอย่าง] ร้องเรียนการปฏิบัติ"  6.36:1 at 375 px
p "แจ้งเรื่องที่ไม่ได้รับความสะดว"  6.45:1 at 768, 375 and 320 px
dt "ผู้ให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สำนักงานสาธารณสุขอำเภอสองให้บร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "หมวดบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ร้องเรียนและเสนอแนะ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "ช่องทางรับบริการ"  10.22:1 at 768, 375 and 320 px
li "ยื่นเรื่องด้วยตนเองที่สำนักงาน"  15.61:1 at 1440, 1024, 768, 375 and 320 px
a "โทรศัพท์ # # # ในวันและเ"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "คุณสมบัติและเงื่อนไข"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ประชาชนทั่วไปที่ได้รับผลกระทบจ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "ขั้นตอนการรับบริการ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "กรอกแบบคำร้องเรียนพร้อมรายละเอ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "ยื่นแบบคำร้องต่อเจ้าหน้าที่ หร"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "สำนักงานแจ้งผลการพิจารณาให้ผู้"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารที่ต้องเตรียม"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "สำเนาบัตรประจำตัวประชาชน และหล"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "สถานที่และช่องทางติดต่อ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "งานบริหารทั่วไป สำนักงานสาธารณ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "ระยะเวลาดำเนินการ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "แจ้งผลภายใน # วันทำการ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "ค่าธรรมเนียม"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ไม่มีค่าธรรมเนียม"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "หมายเหตุ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "สำนักงานเก็บข้อมูลผู้ร้องเรียน"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารเผยแพร่"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารที่เกี่ยวข้อง"  15.47:1 at 375 and 320 px
span "PDF"  5.60:1 at 320 px
span "แบบฟอร์ม"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] แบบคำร้องเรียนการปฏ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "แบบคำร้องสำหรับแจ้งเรื่องร้องเ"  4.97:1 at 1440, 1024 and 768 px
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`/services/demo-service-health-rights` (the external link):

```text
a "หน้าแรก"  10.70:1 at 320 px
a "บริการประชาชน"  9.34:1 at 320 px
span "[ตัวอย่าง] ตรวจสอบสิทธิหลักประ"  7.19:1 at 320 px
span "ขอข้อมูลและบริการอื่น"  8.71:1 at 320 px
h1 "[ตัวอย่าง] ตรวจสอบสิทธิหลักประ"  6.36:1 at 320 px
p "ตรวจสอบสิทธิการรักษาพยาบาลของต"  6.45:1 at 375 and 320 px
dt "ผู้ให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "หน่วยงานภายนอกให้บริการทางออนไ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "หน่วยงานผู้ให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สำนักงานหลักประกันสุขภาพแห่งชา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "หมวดบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ขอข้อมูลและบริการอื่น"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "ไปยังเว็บไซต์ของบริการ (เว็บไซ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "ลิงก์นี้พาออกจากเว็บไซต์ของสำน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`fixture:service-categories` (`service-page.ts`: two categories, an inactive and a closed offering Health Service):

```text
a "หน้าแรก"  10.70:1 at 320 px
a "บริการประชาชน"  9.34:1 at 320 px
span "[ตัวอย่าง] ตรวจคัดกรองสุขภาพปร"  8.36:1 at 320 px
span "ขอข้อมูลและบริการอื่น"  8.60:1 at 320 px
span "แจ้งปัญหาสุขภาพ"  6.53:1 at 320 px
h1 "[ตัวอย่าง] ตรวจคัดกรองสุขภาพปร"  6.63:1 at 1024 px
p "ตรวจคัดกรองโรคเรื้อรังตามสิทธิ"  6.45:1 at 375 and 320 px
dt "ผู้ให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "หมวดบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ขอข้อมูลและบริการอื่น"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "แจ้งปัญหาสุขภาพ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "ช่องทางรับบริการ"  10.22:1 at 768, 375 and 320 px
li "ติดต่อหน่วยบริการสุขภาพที่ให้บ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "ขั้นตอนการรับบริการ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "นำบัตรประจำตัวประชาชนไปที่หน่ว"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "รับการตรวจตามนัด"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "หน่วยบริการ"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "หน่วยบริการสุขภาพที่ให้บริการน"  15.47:1 at 375 and 320 px
span "โรงพยาบาลส่งเสริมสุขภาพตำบล"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ตำบลตัวอย่างเหนือ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ปิดให้บริการชั่วคราว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] รพ.สต.บ้านตัวอย่าง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลตัวอย่าง อำเภอสอ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "เปิดแผนที่ [ตัวอย่าง] รพ.สต.บ้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "ไม่เปิดให้บริการแล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] สถานีอนามัยบ้านตัวอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`fixture:service-no-card` (the same module: no details, no external link):

```text
a "หน้าแรก"  10.27:1 at 320 px
a "บริการประชาชน"  8.49:1 at 320 px
span "[ตัวอย่าง] สอบถามขั้นตอนการรับ"  7.29:1 at 320 px
h1 "[ตัวอย่าง] สอบถามขั้นตอนการรับ"  5.86:1 at 375 px
h2 "ระยะเวลาดำเนินการ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ตอบกลับภายใน # วันทำการ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
```

### A Health Service's page

`/health-services/demo-health-service-song-hospital` (every location detail):

```text
a "หน้าแรก"  10.42:1 at 320 px
a "บริการประชาชน"  8.96:1 at 320 px
a "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  4.94:1 at 375 px
span "[ตัวอย่าง] โรงพยาบาลสอง"  7.49:1 at 768 px
span "โรงพยาบาลชุมชน"  8.14:1 at 320 px
h1 "[ตัวอย่าง] โรงพยาบาลสอง"  6.45:1 at 320 px
dt "ที่ตั้ง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลบ้านกลาง อำเภอส"  16.54:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] โรงพยาบา"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "เวลาทำการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้ป่วยนอก จันทร์–ศุกร์ #–"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "โทร # # # เหตุฉุกเฉิน โท"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทหน่วยบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "โรงพยาบาลชุมชน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สังกัด"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สำนักงานสาธารณสุขจังหวัดแพร่ ก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สถานะการให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "เปิดให้บริการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
dt "พื้นที่รับผิดชอบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ตำบลบ้านกลาง"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "บริการ"  5.40:1 at 768, 375 and 320 px
h2 "บริการที่ให้"  15.20:1 at 768, 375 and 320 px
h3 "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ"  14.82:1 at 320 px
p "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที"  5.66:1 at 1440, 1024 and 768 px
```

`/health-services/demo-health-service-ban-klang` (a display name):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
a "บริการประชาชน"  9.22:1 at 320 px
a "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  5.00:1 at 375 px
span "[ตัวอย่าง] รพ.สต.บ้านกลาง"  7.60:1 at 768 px
span "โรงพยาบาลส่งเสริมสุขภาพตำบล"  7.70:1 at 320 px
h1 "[ตัวอย่าง] รพ.สต.บ้านกลาง"  6.54:1 at 320 px
p "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุ"  6.45:1 at 375 and 320 px
dt "ที่ตั้ง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลบ้านกลาง อำเภอสอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] รพ.สต.บ้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "เวลาทำการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "จันทร์–ศุกร์ #–# น."  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "โทร # # #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทหน่วยบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "โรงพยาบาลส่งเสริมสุขภาพตำบล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สังกัด"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "องค์การบริหารส่วนจังหวัดแพร่"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สถานะการให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "เปิดให้บริการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
dt "พื้นที่รับผิดชอบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ตำบลบ้านกลาง"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "บริการ"  5.40:1 at 768, 375 and 320 px
h2 "บริการที่ให้"  15.20:1 at 768, 375 and 320 px
h3 "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ"  14.82:1 at 320 px
p "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที"  5.66:1 at 1440, 1024 and 768 px
```

`/health-services/demo-health-service-huai-mai` (closed for now):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
a "บริการประชาชน"  9.34:1 at 375 px
a "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  5.00:1 at 375 px
span "[ตัวอย่าง] รพ.สต.ห้วยหม้าย"  7.60:1 at 768 px
span "โรงพยาบาลส่งเสริมสุขภาพตำบล"  7.91:1 at 320 px
span "ปิดให้บริการชั่วคราว"  7.75:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h1 "[ตัวอย่าง] รพ.สต.ห้วยหม้าย"  6.45:1 at 320 px
p "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุ"  6.45:1 at 375 and 320 px
dt "ที่ตั้ง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลห้วยหม้าย อำเภอสอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] รพ.สต.ห้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "เวลาทำการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "ปิดปรับปรุงอาคารชั่วคราว ติดต่"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทหน่วยบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "โรงพยาบาลส่งเสริมสุขภาพตำบล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สังกัด"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "องค์การบริหารส่วนจังหวัดแพร่"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สถานะการให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dt "พื้นที่รับผิดชอบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ตำบลห้วยหม้าย"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`fixture:health-service-inactive` of `lists-by-count.ts` (`LIST=health-services LIST_COUNT=2`):

```text
a "หน้าแรก"  10.56:1 at 375 px
a "บริการประชาชน"  9.22:1 at 375 and 320 px
a "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  4.94:1 at 375 px
span "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุ"  5.71:1 at 320 px
span "โรงพยาบาลส่งเสริมสุขภาพตำบล"  7.70:1 at 320 px
span "ไม่เปิดให้บริการแล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h1 "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุ"  6.19:1 at 375 px
dt "ที่ตั้ง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลตัวอย่าง อำเภอสอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ [ตัวอย่าง] โรงพยาบา"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "เวลาทำการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "จันทร์–ศุกร์ #–# น."  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "โทร # # #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทหน่วยบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "โรงพยาบาลส่งเสริมสุขภาพตำบล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สถานะการให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dt "พื้นที่รับผิดชอบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ตำบลตัวอย่างเหนือ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`fixture:health-service-no-map` of the same (no coordinates):

```text
a "หน้าแรก"  10.85:1 at 375 and 320 px
a "บริการประชาชน"  9.73:1 at 375 and 320 px
a "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  5.07:1 at 375 px
span "[ตัวอย่าง] สำนักงานสาธารณสุขอำ"  5.41:1 at 375 px
span "สถานีอนามัย"  9.34:1 at 320 px
h1 "[ตัวอย่าง] สำนักงานสาธารณสุขอำ"  6.45:1 at 1024, 768, 375 and 320 px
dt "ที่ตั้ง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลตัวอย่าง อำเภอสอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "เวลาทำการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "จันทร์–ศุกร์ #–# น."  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "โทร # # #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทหน่วยบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สถานีอนามัย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สถานะการให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "เปิดให้บริการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
dt "พื้นที่รับผิดชอบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ตำบลตัวอย่างใต้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`fixture:health-service-inactive` of `health-service-page.ts` (inactive, three Services):

```text
a "หน้าแรก"  10.70:1 at 375 px
a "บริการประชาชน"  9.34:1 at 375 px
a "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  5.00:1 at 375 px
span "[ตัวอย่าง] สอ.บ้านตัวอย่างเหนื"  7.49:1 at 768 px
span "โรงพยาบาลส่งเสริมสุขภาพตำบล"  8.14:1 at 375 and 320 px
span "ไม่เปิดให้บริการแล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h1 "[ตัวอย่าง] สอ.บ้านตัวอย่างเหนื"  6.54:1 at 375 px
p "[ตัวอย่าง] สถานีอนามัยเฉลิมพระ"  6.45:1 at 375 and 320 px
dt "ที่ตั้ง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "# หมู่ # ตำบลตัวอย่างเหนือ อำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "เวลาทำการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "ย้ายการให้บริการไปที่ รพ.สต.บ้"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "โทร # # #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "รหัสหน่วยบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "#"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทหน่วยบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "โรงพยาบาลส่งเสริมสุขภาพตำบล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สังกัด"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "องค์การบริหารส่วนจังหวัดแพร่"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สถานะการให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dt "พื้นที่รับผิดชอบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ตำบลตัวอย่างใต้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "ตำบลตัวอย่างเหนือ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "บริการ"  5.40:1 at 768, 375 and 320 px
h2 "บริการที่ให้"  15.20:1 at 768, 375 and 320 px
h3 "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ"  14.82:1 at 320 px
p "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที"  5.66:1 at 1440, 1024 and 768 px
h3 "[ตัวอย่าง] แจ้งปัญหาด้านสุขภาพ"  14.82:1 at 320 px
p "แจ้งปัญหาสุขภาพในชุมชน เพื่อให"  5.66:1 at 1440, 1024 and 768 px
h3 "[ตัวอย่าง] ร้องเรียนการปฏิบัติ"  14.82:1 at 375 px
p "แจ้งเรื่องที่ไม่ได้รับความสะดว"  5.20:1 at 768 px
```

`fixture:health-service-no-location` of the same:

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
a "บริการประชาชน"  9.34:1 at 375 px
a "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  5.00:1 at 375 px
span "[ตัวอย่าง] รพ.สต.บ้านตัวอย่างใ"  7.39:1 at 768 px
span "โรงพยาบาลส่งเสริมสุขภาพตำบล"  7.91:1 at 320 px
h1 "[ตัวอย่าง] รพ.สต.บ้านตัวอย่างใ"  6.28:1 at 375 px
p "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุ"  6.45:1 at 375 and 320 px
dt "รหัสหน่วยบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "#"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทหน่วยบริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "โรงพยาบาลส่งเสริมสุขภาพตำบล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สังกัด"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "องค์การบริหารส่วนจังหวัดแพร่"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สถานะการให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "เปิดให้บริการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
dt "พื้นที่รับผิดชอบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ตำบลตัวอย่างใต้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "บริการ"  5.40:1 at 768, 375 and 320 px
h2 "บริการที่ให้"  15.20:1 at 768, 375 and 320 px
h3 "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ"  14.82:1 at 320 px
p "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที"  5.66:1 at 1440, 1024 and 768 px
h3 "[ตัวอย่าง] บริการสำหรับ อสม."  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ข้อมูล แบบฟอร์ม และช่องทางติดต"  5.66:1 at 1440, 1024 and 768 px
```

`fixture:health-service-bare` of the same (no card):

```text
a "หน้าแรก"  10.27:1 at 320 px
a "บริการประชาชน"  8.72:1 at 320 px
a "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  4.88:1 at 375 px
span "[ตัวอย่าง] หน่วยบริการสุขภาพบ้"  6.54:1 at 768 px
h1 "[ตัวอย่าง] หน่วยบริการสุขภาพบ้"  5.78:1 at 375 px
```

**Focus rings**, `scripts/measure-focus-contrast.ts` at `9f31dc0`, with the selectors #339 to #342
read, the lowest contrast beside the ring with focus (WCAG 2.2 SC 1.4.11, 3:1), with the share of
the ring's neighbours under 3:1:

- `/health`, the two tiles over the field's edge: beside the ring, with its band, 0 % under 3:1 at
  every width, the lowest 5.22:1 at 1,024 px and, at 375 px, 3.29:1 and 2.80:1 on a few blended
  pixels, where 22 and 35 px of the ring are not in its colour; under the ring alone the field reads under 3:1 on
  56 to 61 % of its pixels, which the band answers (§7.3, §7.8).
- `/services`, the first card: its ring lies on the card's white, under it 5.78:1 and beside it
  4.35:1 (1,440 px) and 5.34:1 or more at the other widths, 0 % under 3:1.
- `/`, the first Frequently Used Service card (unchanged code): under the ring 5.51:1 (1,440 to
  768 px) and 5.73:1 (375 and 320 px), 0 % under 3:1; beside it 2 % (1,440 to 768 px) and 3 %
  (375 and 320 px) of its neighbours under 3:1, where its rounded corners meet the field (the
  note from #340; §10).
- `/health-services`, the first row: the name's ring 6.45:1 under and beside it; "เปิดแผนที่"'s
  6.45:1 under it and 6.07:1 or more beside it, every width.
- `/health/reports`, the first row over the field's edge: under the ring 1.00:1 on 45 to 51 % of
  it, beside it with the band 5.43:1 or more, 0 % under 3:1; the second row 5.39:1 under it and
  6.07:1 beside it, every width.

## Spec #338's decisions and the decisions made while the tickets were built

Spec #338 lists twenty-one decisions the Product Owner made before it (#338 comment 6941491587,
each answered "ตามที่แนะนำ"); `docs/design/DESIGN.md` §10 lists them. Every decision made while the
tickets were built has a recorded answer on its ticket, and §10 and §13 cite each one that decides
what a page shows:

| Ticket | Decision | Answer |
| --- | --- | --- |
| #339 | A `/health` tile's label: an H2 there; the Homepage's tiles | A, "H2 บน /health เท่านั้น (แนะนำ)": the Homepage's tiles keep no heading (comment 6941979791) |
| #339 | The tiles ending on the field's edge from 640 px; the links under `/services`' lead under the pointer and in motion; a tile H2's wrapping | A on all four: as built, no hover change, shown at once, no `text-balance` (comment 6943764346) |
| #340 | The detector's overlay; the cards' short last lines; the Homepage Service card's focus ring | A on all three: the hand measurement stands for the overlay, as built, recorded and not changed (comment 6947302659) |
| #341 | "เปิดแผนที่" in a row; the facts line's separator | Semibold with the 20 px `map-pin`, as the prototype; `MetaLine`'s "•" (comment 6966593423) |
| #341 | The name's hover; a row without coordinates from 1,024 px; the gate's taste items | A on all three: on its own link only; the text runs on into the map's place; no change (comment 6967772153) |
| #342 | The title's colour under the pointer; hover cues under focus; balanced wrapping; the facts line's dot at a line's end | A on all four; the dot to #353, outside Feature 011 (comment 6971829798) |
| #343 | The report Document's title link, a text line high | "A คงตามที่ทำ (แนะนำ)" (comment 6975126191) |
| #344 | The offering Health Services' order; a Service with several categories | By name, as before; one outlined pill per category (comment 6979384685) |
| #344 | "ไปยังเว็บไซต์ของบริการ"'s ↗ alone on a line at 375 and 320 px | A, kept, with no change to `ContentLink` and no issue (comment 6981324830) |
| #345 | An inactive Health Service's Services; the official name's label; four shared or earlier details | 1A, 2A, and the four as they are with no issue (comment 6995945811) |

Still open:

- **#353**, a wrapped facts line ending a line with its dot (`MetaLine`), outside the feature.
- **#277**, the redesigned pages on a real phone and in browsers other than Chromium, inside
  #238's UAT window: Feature 011's pages join that visit.

## The tickets' frontend gates

Each ticket's gate (CLAUDE.md "Frontend Design & Quality") is self-review, recorded in its pull
request; this round ran none again, as #346 changes no page:

- #339 (PR #347): critique 25/32, audit 19/20; the detector's only finding the deep field's
  `radial-halo`, which `.impeccable/critique/ignore.md` drops (§7.8).
- #340 (PR #349): critique 25/32, audit 18/20; the overlay did not run (the session's classifier
  denied its server), and its two advisories were measured by hand, which the Product Owner
  accepted (#340 comment 6947302659, item 1).
- #341 (PR #351): critique 29/40, audit 20/20; the overlay did not run; `detect` `[]` on the source.
- #342 (PR #354): critique 21/28, audit with no P0 or P1; the overlay did not run; the URL scan's
  `low-contrast` on the tile's fiscal year
  reads the gradient's lightest stop, measured 5.60:1, and is in `ignore.md`.
- #343 (PR #356): critique and audit with no P0 or P1; the overlay's three findings out of scope
  (the tile's "PDF" measured 5.68:1, `radial-halo`, the H1's accepted wrap).
- #344 (PR #358): critique Nielsen 28/36, audit 18/20; the overlay's two false positives.
- #345 (PR #360): critique Nielsen 21/28, audit 19/20; the overlay's `radial-halo` only.

Two pieces the notes name for the record (the note from #345): `HomeServiceCard` has a third kind,
`kind="section"` (an H3 under a section heading, the `card` shadow at rest), which a Health
Service's page uses; and `readHeaderOnField` in `tests/browser/public.helpers.ts` reads every
header on the field for a Service's, a Health Report's and a Health Service's page.

## Walkthrough

After the 404 log was cleared (02:31Z), the Product Owner was given these steps in the session,
each with its full address, with the list under "What the evidence does not cover" in the same
question:

1. `/health` on a desktop with motion allowed: the heading on the field and the two tiles;
2. `/health/reports`, then the dengue report (`/health/reports/demo-report-dengue-q4`: the file
   first in the card, the download, the Document's link) and the report without a report date
   (`/health/reports/demo-report-performance-2569`);
3. `/services`, its two links under the lead and a category filter, then the flu-vaccine Service
   (`/services/demo-service-flu-vaccine`: the card, its Health Services as rows), the complaint
   Service (`/services/demo-service-complaint`: the guidance, the related Document) and the
   health-rights Service (`/services/demo-service-health-rights`: the external link);
4. `/health-services`, its form, rows and "เปิดแผนที่", then Song hospital
   (`/health-services/demo-health-service-song-hospital`), Ban Klang (`…-ban-klang`: the official
   name under the H1) and Huai Mai (`…-huai-mai`: closed for now);
5. `/`, the Frequently Used Services after decision 20;
6. steps 1 to 5 at 375 px in the browser's device mode;
7. the before and after screenshots on `evidence/011-346-screenshots`.

The Product Owner chose all three groups (steps 1 to 5, step 6, step 7) as opened, answered "ผ่าน
ไม่มีอะไรต้องแก้ (แนะนำถ้าไม่เจอปัญหา)" and accepted every coverage gap below, "A รับตามนี้ (แนะนำ)"
(#346 comment 6997998925).

**What the app's log shows of the walkthrough** (`scripts/dev-runtime-opened.ts` from 02:31:48Z
with `--expect` and the thirteen addresses the steps gave, read at 02:37Z): 18 page requests
between 02:33:32Z and 02:36:28Z, every one 200, and the Homepage beyond the health check; two of
the thirteen unopened, `/health-services` and Song hospital's page. Asked again with their links,
the Product Owner answered "เปิดตอนนี้แล้ว ผ่าน (แนะนำ)", and the log from 02:36:57Z held both, 7
page requests between 02:37:23Z and 02:38:48Z, every one 200 (the same comment, item 4). The log
holds no query string, so it shows neither the filters chosen nor a window width; those rest on
the Product Owner's answer. After the answers residue reported RESIDUE: NONE with 0 unmarked
misses and the 56 demo entries published, and verify VERIFY: PASS at `9f31dc0` (02:39Z).

## What the evidence does not cover

Written before the walkthrough was asked for, listed whole before its question, and accepted in
it, "A รับตามนี้ (แนะนำ)" (#346 comment 6997998925, item 3):

- Browsers other than Chromium, and a real phone or touch: every suite, capture and measure ran in
  Playwright's Chromium, and the runtime answers on `127.0.0.1` only, so the phone steps are the
  browser's device mode. #277 visits the redesigned pages inside #238's UAT window.
- Real content: Feature 005 imported no Service, Health Service or Health Report from the Legacy
  site, so the runtime holds the demo dataset's 9 Services, 4 Health Services (one closed for now,
  all with coordinates) and 3 Health Reports (one without a report date) (spec #338 "Further
  Notes"). A full page, a second page, an inactive Health Service, one without coordinates, a
  location or any detail, a report without a fiscal year or whose Document is unpublished or whose
  file is gone, a Service with two categories or with no card, and long names are seen only through
  the synthetic fixtures of `scripts/screenshot-fixtures/lists-by-count.ts`, `service-page.ts` and
  `health-service-page.ts`.
- Motion on the built, minified pages: the runtime serves the stylesheet unminified, and the suites
  read it there. `npm run build:check` reads the built stylesheets; the look of a built page with
  motion allowed is due with the feature's first production image
  (`scripts/production-image-check.sh`, #276).
- The before screenshots as a control of this round: they are #339's at `0d55a16` on `main`,
  taken before the feature's first promotion (the note from #339), and the Homepage's are #340's
  (the note from #340). The demo dataset did not change between `0d55a16` and `9f31dc0`
  (`git log 0d55a16..9f31dc0 -- scripts/demo-dataset scripts/demo-dataset.ts` is empty). The pages
  the later tickets added to the round's set (the demo dataset's report without a report date, its
  complaint and health-rights Services, Song hospital and Huai Mai, and the fixtures of
  `service-page.ts` and `health-service-page.ts`) have their before images on their tickets'
  evidence branches only (#343, #344, #345), taken at those tickets' bases.
- The deep field's large focus ring from 1,024 px on these pages: no suite reads it, as on `/news`
  (the note from #339).
- The Homepage's first Service card's focus ring, unchanged code: beside the ring 2 to 3 % of its
  neighbours read under 3:1 at its rounded corners over the field, which the Product Owner chose to
  record, not change (the note from #340; #340 comment 6947302659, item 3).
- Keyboard passes by hand: the gates tabbed through the flu-vaccine Service's page and Song
  hospital's page at 1,440 px only (every ring visible); the complaint and health-rights Services
  and Ban Klang's and Huai Mai's pages were not tabbed through by hand. The suites' axe and focus
  checks (`expectVisibleFocusOnEveryStop`, desktop and mobile) run on the synthetic pages their
  spec files make (the notes from #344 and #345).
- A wrapped facts line can end a line with its dot (`MetaLine`), left to #353 outside the feature
  (#342 comment 6971829798, item 4).
- The H1's lone last word on a page with `PostHeader`, now also on a Health Report's, a Service's
  and a Health Service's page, as on an Announcement's and a Document's (§10).
- "ติดต่อเรา" in the unavailable notice on a Health Report's page is the Document page's link
  about 22 px high inside its sentence (`UnavailableNotice`, §10).
- Reduced motion in the walkthrough, and print: the suites prefer reduced motion on every page but
  the tests of motion (`DESIGN.md` §8.12), and no run of the round prints a page.
- The Admin: the feature changes no model, field or Admin screen, so the walkthrough has no Admin
  step.

## What was kept as it is

Each on the Product Owner's answer, with no follow-up issue:

- "ไปยังเว็บไซต์ของบริการ" in a Service's card: its ↗ takes a line of its own at 375 and 320 px (the
  note from #344; #344 comment 6981324830).
- From #345 (comment 6995945811, item 3): the Service card's `transition` also animates its colour
  and shadow; on a Health Service's card `DetailItem`'s term sits about 3 px above its value from
  640 px; `/favicon.ico` answers 404 on the development runtime, whose settings hold no favicon;
  "น." alone on a line at 320 px in the demo dataset's opening hours.
- A directory row without coordinates lets its text run on into the map's place from 1,024 px
  (#341 comment 6967772153, item 2).

## The prototype

The prototype is on the branch `prototype/health-reports-services-health-services` at `a6a5c14`
(the picks at `fd82f59`, then decisions 20 and 21), outside `main`: its builder scripts and its
record, `docs/prototypes/health-reports-services-health-services.md`. Its pages, screenshots and
sheets stay on the development host. Spec #338 "How this differs from the prototype" names four
differences the spec decided (a directory row's address at every width, a facts line that wraps
between facts, a Health Service page's Services two to a row at any count, and the catalog card's
summary colour and resting shadow); the built pages keep each. Every further difference was
decided on its ticket (the decisions table above).

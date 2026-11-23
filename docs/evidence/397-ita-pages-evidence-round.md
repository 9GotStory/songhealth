# #397 evidence: Feature 013 (the ITA landing, a fiscal year's page and a MOIT's page) on the development runtime

Feature 013's evidence round (spec #392), run on 2026-11-23 by Claude Code at `ed0d0bb`, the head
of `013-ita-pages`, and the Product Owner's walkthrough of 2026-11-23. This is a self-run record,
not an independent review, and not the Product Owner's acceptance, which the Product Owner gives
on #392.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`. It served `a067a6e`,
  #396's merge (PR #405), from which `ed0d0bb` changes no file under `src` (#396's retro merged
  `main`: a pre-commit hook line, `CODING_STANDARDS.md` and a node test). No window held it. The
  round promoted `ed0d0bb` with its backup at 02:43Z, and `dev-runtime-verify.sh` reported VERIFY:
  PASS at `ed0d0bb25cc3e7fa277790b7e961c7922e97efa6` at 02:43Z. For the Document pages' before
  images alone the runtime served `15b519f` from 03:20Z to 03:21Z (#397 comment 7090321604, below),
  and verify reported VERIFY: PASS at `ed0d0bb` again at 03:21Z, before the after screenshots.
- **Code under test:** `ed0d0bb`. #397's branch adds documents over it, so its head has
  `ed0d0bb`'s application code. Node 26.13.0, npm 12.2.1.
- **Content:** the demo dataset, 56 entries, all published, and each capture's and each measure's
  own synthetic fixtures, which it removes.

## Checks

The local checks ran at `ed0d0bb` between 02:44Z and 02:45Z on 2026-11-23, the browser suites
between 02:45Z and 03:19Z, T021 and residue at 03:19Z and 03:20Z, the captures between 03:21Z and
03:24Z, and the measures between 03:24Z and 03:54Z. The pull request states the checks at its head.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | exit 0: 0 errors, 0 warnings, 2 hints |
| Node seam | `npm run test:node` | 858 of 858 passed |
| Build | `npm run build:check` | exit 0; `check-built-styles: PASS (2 stylesheets, the reveal in 1)` |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | each exit 0; jscpd's baseline unchanged at 21 clones |
| Browser seam | `scripts/dev-runtime-env.sh npm run test:browser` | 810 passed, 14 skipped, in 34.0 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | source identity verified at `ed0d0bb`; 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 46 misses, all synthetic; 56 entries, 0 not published; 0 database connection errors in the last hour |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | cleared before the walkthrough (03:56Z), 46 entries, none without the synthetic marks |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator;
the coordinator ran those 14 at 03:19Z. No test of the full run failed. The run's near-timeout
report named one test at 60 % or more of its 30 s, `public-demo-dataset.spec.ts`' axe and focus
case on the dataset's list pages at the desktop width, 18.0 s; it passed, and it is not a Feature
013 page.

## Screenshots

After, at `ed0d0bb`, with reduced motion preferred, so the pages show at rest, by
`.tmp/397/capture-after.sh` on the development host, between 03:21Z and 03:24Z:

```text
node scripts/capture-screenshots.mjs <dir> <name>-<width>=<path>@<width>        # the demo dataset
CASE=<content|none> scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/ita-cases.ts <dir>                                  # the synthetic cases
scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/homepage-quick-access.ts <dir> 'section[aria-labelledby="home-quick-access"]'
```

Before, three sets, each at Feature 013's base or at a commit whose `src` is the base's:

- the ITA pages: the feature's first ticket's, the 65 images on `evidence/013-393-screenshots` at
  `55a200b`, taken at `15b519f` on `main` before the feature's first promotion with the same
  targets and module (the note from #393): `/ita`, `/ita/2570` and the demo dataset's two MOITs,
  and with `ita-cases.ts` three fiscal years on the landing (`ita-three-years`), a year of one MOIT
  (`ita-year-one`) and of 22 (`ita-year-22`), a MOIT at the published content's largest sizes
  (`moit-published-sizes`), without a summary, without a Requirement and without Evidence, a draft
  MOIT of a year without a page through its signed preview link (`moit-no-year-page`), and the
  landing with no published MOIT (`ita-none`);
- the Homepage whole and its Quick Access up close (`homepage-quick-access.ts`' three shortcuts,
  which the demo dataset's empty menu hides), `/about` (the Quick Link's list form),
  `/about/personnel` (a unit panel's soft tile) and `/about/policies` (the file tile's rows):
  `after-*` of `evidence/012-372-screenshots` at `59ea661`, taken at `7077100`, Feature 012's head,
  whose `src` is `15b519f`'s (`git diff 7077100 15b519f -- src` is empty), renamed `before-*`;
- a Document's page (`/documents/demo-document-vhv-application`), a superseded Document's page
  (`/documents/demo-document-plan-2569`) and `/documents`: taken in this round by
  `.tmp/397/capture-before-documents.sh` at 03:20Z, with the runtime promoted to `15b519f` for them
  alone, since no earlier capture of these pages is at the base (Product Owner, #397 comment
  7090321604: "Promote ย้อนชั่วคราว (Recommended)").

The demo dataset did not change between `7077100` and `ed0d0bb` (`git log 7077100..ed0d0bb --
scripts/demo-dataset scripts/demo-dataset.ts` lists no commit); the synthetic titles and slugs are
made again on each run, and the preview link's signed token is replaced by `<signed token>` in
every list that went to the branch.

**The pieces the ITA pages share.** The ITA pages share `FileTile`'s gradient box (now `RowTile`)
with a Document's row and page, `PostHeader` (with two new props that every other page leaves at
their defaults) with every Post page, `SoftTile` with `/about/personnel`'s unit panels, and
`ListBody` with every list; the year card takes the gradient of the Homepage section heading's
tile, and #393 changed only a comment in the Quick Link (`HomeQuickLink`), the Homepage's Quick
Access tile and `/about`'s list form. The after images of `/about`,
`/about/personnel`, `/about/policies`, both Document pages and `/documents` are byte for byte their
before images at all five widths (`cmp`). Quick Access up close is byte for byte its before image
at 1,440, 1,024, 768 and 320 px; at 375 px 11 pixels of the first tile's lower shadow edge differ
by 2 in a colour channel at most, the anti-aliasing of the shadow. The Homepage whole differs at
all five widths in one place, which the clock moved and the code did not: the demo Announcement
"[ตัวอย่าง] เปิดรับสมัครผู้เข้าร่วมโครงการเลิกบุหรี่ รุ่นที่ 2/2570" opens ten days after the demo
dataset was added (`opens_at: ahead(10)`), on 23 พ.ย. 2569, the day of the round, so its row reads
"เปิดอยู่" where the before image read "ยังไม่เปิด" with its start date; at 375 and 320 px the row
loses the start date's line and the page is 24 px shorter. The Homepage's `src` changed only in
comments since `15b519f` (`HomeQuickLink.astro`, `global.css`).

`scripts/evidence-branch.sh` put the 210 images (105 before, 105 after) and their `captures.txt` on
the image-only branch `evidence/013-397-screenshots`, at
`37ef3ec4e9c91d93eda15673962c6550db9b0abc`. Page heights in pixels, the table that script printed
from the PNGs (a page with 900 px at every width is shorter than the window; a close-up is its
section's height):

| Page | | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `about` | before | 1,813 | 1,813 | 1,921 | 2,035 | 2,221 |
| | after | 1,813 | 1,813 | 1,921 | 2,035 | 2,221 |
| `document` | before | 974 | 974 | 994 | 1,170 | 1,312 |
| | after | 974 | 974 | 994 | 1,170 | 1,312 |
| `document-superseded` | before | 1,176 | 1,176 | 1,130 | 1,422 | 1,590 |
| | after | 1,176 | 1,176 | 1,130 | 1,422 | 1,590 |
| `documents` | before | 2,309 | 2,441 | 3,141 | 3,141 | 3,297 |
| | after | 2,309 | 2,441 | 3,141 | 3,141 | 3,297 |
| `home` | before | 5,541 | 5,704 | 7,557 | 6,344 | 6,866 |
| | after | 5,541 | 5,704 | 7,557 | 6,320 | 6,842 |
| `home-quick-access` | before | 279 | 301 | 369 | 302 | 340 |
| | after | 279 | 301 | 369 | 302 | 340 |
| `ita` | before | 900 | 900 | 900 | 900 | 1,029 |
| | after | 900 | 900 | 985 | 985 | 1,209 |
| `ita-2570` | before | 900 | 900 | 900 | 938 | 1,154 |
| | after | 900 | 900 | 909 | 1,001 | 1,209 |
| `ita-none` | before | 900 | 900 | 900 | 900 | 1,027 |
| | after | 900 | 900 | 900 | 900 | 1,105 |
| `ita-three-years` | before | 900 | 900 | 921 | 1,131 | 1,317 |
| | after | 900 | 900 | 1,243 | 1,469 | 1,693 |
| `ita-year-22` | before | 2,764 | 2,764 | 2,826 | 3,578 | 4,414 |
| | after | 3,711 | 3,711 | 3,771 | 3,733 | 4,487 |
| `ita-year-one` | before | 900 | 900 | 900 | 900 | 935 |
| | after | 900 | 900 | 900 | 900 | 997 |
| `moit-demo-1` | before | 1,407 | 1,463 | 1,643 | 2,223 | 2,585 |
| | after | 1,463 | 1,583 | 1,671 | 2,175 | 2,585 |
| `moit-demo-2` | before | 5,115 | 5,675 | 5,569 | 8,915 | 10,095 |
| | after | 5,649 | 6,233 | 6,109 | 9,183 | 10,445 |
| `moit-no-evidence` | before | 900 | 900 | 900 | 1,075 | 1,307 |
| | after | 900 | 900 | 900 | 1,057 | 1,285 |
| `moit-no-requirement` | before | 900 | 903 | 931 | 1,217 | 1,471 |
| | after | 900 | 909 | 1,005 | 1,221 | 1,449 |
| `moit-no-summary` | before | 931 | 1,003 | 1,163 | 1,381 | 1,631 |
| | after | 966 | 992 | 1,200 | 1,388 | 1,638 |
| `moit-no-year-page` | before | 900 | 900 | 987 | 1,103 | 1,281 |
| | after | 900 | 900 | 1,022 | 1,106 | 1,254 |
| `moit-published-sizes` | before | 6,431 | 6,563 | 6,713 | 8,247 | 9,331 |
| | after | 7,602 | 7,658 | 7,810 | 8,774 | 10,512 |
| `personnel` | before | 1,348 | 1,348 | 1,470 | 1,640 | 1,866 |
| | after | 1,348 | 1,348 | 1,470 | 1,640 | 1,866 |
| `policies` | before | 900 | 900 | 1,039 | 1,023 | 1,149 |
| | after | 900 | 900 | 1,039 | 1,023 | 1,149 |

The heights the note from #394 gives for a fiscal year's page (a year of 22 MOITs, the demo year
and a year of one) are this table's `ita-year-22`, `ita-2570` and `ita-year-one` after rows.

## Contrast

`scripts/measure-text-contrast.ts --all-text --fold <path> main` at `ed0d0bb`, at 1,440, 1,024, 768,
375 and 320 px, every run exit 0, by `.tmp/397/contrast-run.sh` between 03:24Z and 03:53Z: every
text in `main` on the four ITA addresses of the demo dataset and on the nine `ita-cases.ts` cases.
Small text needs 4.5:1 and large text 3:1 (WCAG 2.2 SC 1.4.3). No run named a text it could not
read. The lowest reading of any text is 4.63:1, "ตัวชี้วัดก่อนหน้า" on the demo's MOIT 2 at 1,440 and
1,024 px, as #396 recorded (§9.11); then 4.69:1, the landing's H1 at 1,024 px (large text, where
the list field's ring runs behind it, as the prototype read it) and "MOIT" on a row's gradient
tile at 375 and 320 px (§3.2); then "ปีงบประมาณ" on a year card, 4.83:1; every other text reads
4.97:1 or more. Each run's closing lines follow whole: a text, its lowest reading over the five
widths and the widths that read it; a line ending "(N texts)" folds texts whose words differ only
in their numbers, written "#".

Every reading Feature 013's tickets took is read the same at `ed0d0bb`, each run's closing lines
equal to its ticket's own output, but a MOIT's header, which reads the same or higher:

- the landing (#393 at `6ec76f0`: the demo year, three years and none) and a fiscal year's page
  (#394 at `f77e864`, the demo year): every closing line equal;
- a MOIT's body (#396 at `fce6996`: the table of contents' panel, the first card and the neighbour
  links of the demo's two MOITs and `moit-published-sizes`, and `moit-no-requirement`'s Evidence
  card): every reading of the ticket's output is in this round's at the same width and ratio. This
  round reads all of `main`, so its folded lines gather more texts, such as the second card's
  dashed pill for a file that cannot be served, "2.3 ฟอร์มเผยแพร่", 4.97:1, on MOIT 1;
- a MOIT's header (#395 at `4405549`, read on the field before #396 moved the body over its edge):
  on the same four pages every text reads the same or higher at `ed0d0bb`: the breadcrumb's links
  8.48:1 then 8.71:1, its current page 6.35:1 then 6.52:1, the fiscal year's pill 8.26:1 then
  8.49:1, "MOIT n" in the H1 5.46:1 then 5.61:1 (`moit-no-summary` at 320 px), the H1's title
  6.02:1 then 6.27:1 (the demo's MOIT 2 at 375 px), the summary and the counts line 6.45:1 both.
  `DESIGN.md` §9.11 adds these readings to #395's.

The cases new to this round, without a ticket's reading, are a year of one MOIT and of 22, a MOIT
without Evidence and the draft MOIT of a year without a page. Their lowest readings are "MOIT" on a
row's tile, 4.69:1 at 375 and 320 px, on both years, and 4.97:1 on both MOITs; a MOIT's header on
`moit-no-evidence` reads its current page's crumb 6.44:1 at 375 px, the round's lowest for that
crumb.

### The demo dataset

`/ita` (the demo dataset's one fiscal year, 2570):

```text
a "หน้าแรก"  10.85:1 at 375 px
span "ITA"  10.41:1 at 375 px
p "ITA"  9.60:1 at 375 px
h1 "การประเมินคุณธรรมและความโปร่งใ"  4.69:1 at 1024 px
p "การประเมินคุณธรรมและความโปร่งใ"  6.45:1 at 768, 375 and 320 px
p "ปีงบประมาณ"  4.83:1 at 1440, 1024, 768, 375 and 320 px
h2 "#"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ตัวชี้วัด # รายการ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`/ita/2570` (two MOITs):

```text
a "หน้าแรก"  10.70:1 at 320 px
a "ITA"  10.13:1 at 320 px
span "ปีงบประมาณ #"  8.60:1 at 320 px
p "ITA"  9.22:1 at 320 px
h1 "ITA ปีงบประมาณ พ.ศ. #"  6.62:1 at 375 px
p "ตัวชี้วัด MOIT # รายการของปีงบ"  6.45:1 at 768, 375 and 320 px
span "MOIT"  4.69:1 at 375 and 320 px (2 texts)
span "#"  8.70:1 at 1440, 1024, 768 and 375 px (2 texts)
a "MOIT # [ตัวอย่าง] หน่วยงานมีกา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "หลักฐาน # รายการ · ปรับปรุงล่า"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "หลักฐาน # รายการ · ปรับปรุงล่"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`/ita/demo-moit-1-2570` (2 Requirements, 7 Evidence, one file that cannot be served):

```text
a "หน้าแรก"  11.00:1 at 1440, 375 and 320 px
a "ITA"  10.55:1 at 375 and 320 px
a "ปีงบประมาณ #"  9.33:1 at 320 px
span "MOIT #"  6.01:1 at 320 px (2 texts)
span "ITA ปีงบประมาณ พ.ศ. #"  9.22:1 at 320 px
h1 "MOIT # [ตัวอย่าง] หน่วยงานมีกา"  6.44:1 at 375 px
p "คำสั่งหรือประกาศที่กำหนดกรอบแน"  6.45:1 at 768, 375 and 320 px
p "หลักฐาน # รายการ ใน # ข้อ · ไฟ"  6.45:1 at 768, 375 and 320 px
p "สารบัญ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "#"  5.78:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "คำสั่ง / ประกาศ ที่ระบุกรอบแนว"  12.21:1 at 1440 and 1024 px
span "# รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "รายงานการกำกับติดตามการเผยแพร่"  12.21:1 at 1440 and 1024 px
h2 "#. คำสั่ง / ประกาศ ที่ระบุกรอบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "# บันทึกข้อความเสนอ ผบห. และ"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "PDF, # KB"  5.07:1 at 1440, 1024, 768, 375 and 320 px (6 texts)
span "# คำสั่ง / ประกาศ โดย ผบห.สู"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "# กรอบแนวทางการเผยแพร่ข้อมูล"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "# ฟอร์มเผยแพร่"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h2 "#. รายงานการกำกับติดตามการเผยแ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "# รายงานผลการกำกับติดตามการเ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "ไฟล์ไม่พร้อมให้บริการ"  12.21:1 at 1440, 1024, 768, 375 and 320 px
a "ติดต่อเรา"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "ตัวชี้วัดถัดไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "MOIT # [ตัวอย่าง] หน่วยงานมีกา"  12.21:1 at 1440, 1024, 768, 375 and 320 px
```

`/ita/demo-moit-2-2570` (18 Requirements, 4 sub-Requirements, 41 Evidence):

```text
a "หน้าแรก"  10.98:1 at 375 and 320 px
a "ITA"  10.42:1 at 375 and 320 px
a "ปีงบประมาณ #"  9.09:1 at 375 and 320 px
span "MOIT #"  5.85:1 at 320 px (2 texts)
span "ITA ปีงบประมาณ พ.ศ. #"  8.96:1 at 320 px
h1 "MOIT # [ตัวอย่าง] หน่วยงานมีกา"  6.27:1 at 375 px
p "ข้อมูลพื้นฐาน กฎหมายและแผนที่เ"  6.45:1 at 768 and 375 px
p "หลักฐาน # รายการ ใน # ข้อ · "  6.45:1 at 375 and 320 px
p "สารบัญ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "#"  5.78:1 at 1440, 1024, 768, 375 and 320 px (36 texts)
span "ข้อมูลพื้นฐานที่เป็นปัจจุบัน"  12.21:1 at 1440 and 1024 px
span "# รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (36 texts)
span "วิสัยทัศน์ พันธกิจ ค่านิยม MOP"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "พระราชบัญญัติมาตรฐานทางจริยธรร"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ประมวลจริยธรรมข้าราชการพลเรือน"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ข้อกำหนดจริยธรรมเจ้าหน้าที่ของ"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ยุทธศาสตร์ชาติ จำนวน # ระดับ"  12.21:1 at 1440 and 1024 px
span "แผนปฏิบัติราชการด้านการป้องกัน"  12.21:1 at 1440 and 1024 px
span "นโยบายและยุทธศาสตร์ของหน่วยงาน"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "แผนปฏิบัติการประจำปีของหน่วยงา"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "รายงานผลการดำเนินงานตามแผนปฏิบ"  10.94:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "แผนการใช้จ่ายงบประมาณประจำปีขอ"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "คู่มือการปฏิบัติงานการร้องเรีย"  10.94:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "คู่มือการปฏิบัติงานตามภารกิจหล"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "คู่มือขั้นตอนการให้บริการ (ภาร"  12.21:1 at 1440 and 1024 px
span "รายงานผลการดำเนินงานเกี่ยวกับเ"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "รายงานผลการดำเนินการเกี่ยวกับเ"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ข้อมูลการจัดซื้อจัดจ้าง"  12.21:1 at 1440 and 1024 px
h2 "#. ข้อมูลพื้นฐานที่เป็นปัจจุบั"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "# ข้อมูลผู้บริหาร แสดงรายนาม"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "หน้าเว็บของสำนักงาน"  5.07:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "ข้อมูลปัจจุบัน"  7.75:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "# นโยบายของผู้บริหาร"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "PDF, # KB"  5.07:1 at 1440, 1024, 768, 375 and 320 px (36 texts)
span "# โครงสร้างหน่วยงาน"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "# หน้าที่และอำนาจของหน่วยงาน"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "# กฎหมายที่เกี่ยวข้องกับการด"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "stopcorruption.moph.go.th (เว็"  5.07:1 at 1440, 1024, 768, 375 and 320 px
span "# ข่าวประชาสัมพันธ์ ที่เกิดข"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "# ข้อมูลการติดต่อหน่วยงาน"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "# ช่องทางการรับฟังความคิดเห็"  10.94:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. วิสัยทัศน์ พันธกิจ ค่านิยม "  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. พระราชบัญญัติมาตรฐานทางจริย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. ประมวลจริยธรรมข้าราชการพลเร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. ข้อกำหนดจริยธรรมเจ้าหน้าที่"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. ยุทธศาสตร์ชาติ จำนวน # ระดั"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "# แผนระดับที่ # ยุทธศาสตร์ชา"  10.94:1 at 1440, 1024, 768, 375 and 320 px
h3 "# แผนระดับที่ #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "แผนแม่บทภายใต้ยุทธศาสตร์ชาติ ("  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "แผนพัฒนาเศรษฐกิจและสังคมแห่งชา"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "นโยบายและแผนระดับชาติว่าด้วยคว"  10.94:1 at 1440, 1024, 768, 375 and 320 px
h3 "# แผนระดับที่ # ที่เกี่ยวข้อ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "แผนปฏิบัติการด้านการต่อต้านการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "แผนปฏิบัติการด้านการส่งเสริมคุ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "ยุทธศาสตร์ด้านมาตรฐานทางจริยธร"  10.94:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. แผนปฏิบัติราชการด้านการป้อง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "# แผนปฏิบัติราชการด้านการป้อ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "# แผนปฏิบัติราชการด้านส่งเสร"  10.94:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. นโยบายและยุทธศาสตร์ของหน่วย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. แผนปฏิบัติการประจำปีของหน่ว"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. รายงานผลการดำเนินงานตามแผน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "รอบ # เดือน"  12.21:1 at 1440, 1024, 768, 375 and 320 px (7 texts)
h2 "#. แผนการใช้จ่ายงบประมาณประจำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ผลการใช้จ่ายงบประมาณประจำปีของ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "แผนและผลการใช้จ่ายงบประมาณประจ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. คู่มือการปฏิบัติงานการร้อง"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h2 "#. คู่มือการปฏิบัติงานตามภารก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. คู่มือขั้นตอนการให้บริการ "  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "คู่มือขั้นตอนการให้บริการ (อย."  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "www.fda.moph.go.th (เว็บไซต์ภา"  5.07:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. รายงานผลการดำเนินงานเกี่ยว"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. รายงานผลการดำเนินการเกี่ยว"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "#. ข้อมูลการจัดซื้อจัดจ้าง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "# การวิเคราะห์ผลการจัดซื้อจ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "# แผนการจัดซื้อจัดจ้างและกา"  10.94:1 at 1440, 1024, 768, 375 and 320 px
h3 "# ผลการดำเนินการตามแผนการจั"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ผลการดำเนินงานตามแผน (บันทึก +"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h3 "# ประกาศสำนักงานปลัดกระทรวง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ประกาศสำนักงานปลัดกระทรวงสาธาร"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "แบบแสดงความบริสุทธิ์ใจในการจัด"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ตัวชี้วัดก่อนหน้า"  4.63:1 at 1440 and 1024 px
span "MOIT # [ตัวอย่าง] หน่วยงานมีกา"  12.11:1 at 1440 and 1024 px
```

### The synthetic cases (`ita-cases.ts`)

`ita-three-years` (`/ita` with 2570, 2569 and 2568):

```text
a "หน้าแรก"  10.85:1 at 375 px
span "ITA"  10.41:1 at 375 px
p "ITA"  9.60:1 at 375 px
h1 "การประเมินคุณธรรมและความโปร่งใ"  4.69:1 at 1024 px
p "การประเมินคุณธรรมและความโปร่งใ"  6.45:1 at 768, 375 and 320 px
p "ปีงบประมาณ"  4.83:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
h2 "#"  16.54:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "ตัวชี้วัด # รายการ"  6.45:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
```

`ita-year-one` (`/ita/2569`, one MOIT):

```text
a "หน้าแรก"  10.70:1 at 320 px
a "ITA"  10.13:1 at 320 px
span "ปีงบประมาณ #"  8.60:1 at 320 px
p "ITA"  9.22:1 at 320 px
h1 "ITA ปีงบประมาณ พ.ศ. #"  6.62:1 at 375 px
p "ตัวชี้วัด MOIT # รายการของปีงบ"  6.45:1 at 768, 375 and 320 px
span "MOIT"  4.69:1 at 375 and 320 px
span "#"  8.70:1 at 768 px
a "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "หลักฐาน # รายการ · ปรับปรุงล่า"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`ita-year-22` (`/ita/2568`, 22 MOITs):

```text
a "หน้าแรก"  10.70:1 at 320 px
a "ITA"  10.13:1 at 320 px
span "ปีงบประมาณ #"  8.60:1 at 320 px
p "ITA"  9.22:1 at 320 px
h1 "ITA ปีงบประมาณ พ.ศ. #"  6.62:1 at 375 px
p "ตัวชี้วัด MOIT # รายการของปีง"  6.45:1 at 768, 375 and 320 px
span "MOIT"  4.69:1 at 375 and 320 px (22 texts)
span "#"  8.36:1 at 1440, 1024 and 768 px (22 texts)
a "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  16.54:1 at 1440, 1024, 768, 375 and 320 px (9 texts)
p "หลักฐาน # รายการ · ปรับปรุงล่"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "หลักฐาน # รายการ · ปรับปรุงล่า"  4.97:1 at 1440, 1024, 768, 375 and 320 px (21 texts)
a "MOIT # [ตัวอย่าง] ตัวชี้วัดสม"  16.54:1 at 1440, 1024, 768, 375 and 320 px (13 texts)
```

`ita-none` (`/ita` with no published MOIT, `CASE=none`):

```text
a "หน้าแรก"  10.85:1 at 375 px
span "ITA"  10.41:1 at 375 px
p "ITA"  9.60:1 at 375 px
h1 "การประเมินคุณธรรมและความโปร่งใ"  4.69:1 at 1024 px
p "การประเมินคุณธรรมและความโปร่งใ"  6.45:1 at 768, 375 and 320 px
p "ยังไม่มีข้อมูล ITA"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`moit-published-sizes` (a title of 175 characters, 37 Requirements, a Requirement title of 238 characters):

```text
a "หน้าแรก"  11.00:1 at 1440, 375 and 320 px
a "ITA"  10.42:1 at 375 px
a "ปีงบประมาณ #"  9.22:1 at 375 px
span "MOIT #"  6.01:1 at 320 px (2 texts)
span "ITA ปีงบประมาณ พ.ศ. #"  9.22:1 at 320 px
h1 "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  6.45:1 at 768, 375 and 320 px
p "หลักฐาน # รายการ ใน # ข้อ · "  6.45:1 at 375 and 320 px
p "สารบัญ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "#"  5.78:1 at 1440, 1024, 768, 375 and 320 px (74 texts)
span "[ตัวอย่าง] ข้อกำหนดสมมุติสำหรั"  12.21:1 at 1440 and 1024 px
span "# รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (74 texts)
span "ข้อกำหนดสมมุติข้อที่ #"  12.21:1 at 1440 and 1024 px (36 texts)
h2 "#. [ตัวอย่าง] ข้อกำหนดสมมุติสำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "# หลักฐานสมมุติ"  10.94:1 at 1440, 1024, 768, 375 and 320 px (37 texts)
span "หน้าเว็บของสำนักงาน"  5.07:1 at 1440, 1024, 768, 375 and 320 px (37 texts)
h2 "#. ข้อกำหนดสมมุติข้อที่ #"  16.54:1 at 1440, 1024, 768, 375 and 320 px (36 texts)
span "ตัวชี้วัดถัดไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  12.21:1 at 1440, 1024, 768, 375 and 320 px
```

`moit-no-summary`:

```text
a "หน้าแรก"  10.71:1 at 320 px
a "ITA"  10.14:1 at 320 px
a "ปีงบประมาณ #"  8.71:1 at 320 px
span "MOIT #"  5.61:1 at 320 px (2 texts)
span "ITA ปีงบประมาณ พ.ศ. #"  8.49:1 at 320 px
h1 "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  6.35:1 at 375 px
p "หลักฐาน # รายการ ใน # ข้อ · ปร"  6.45:1 at 375 and 320 px
p "สารบัญ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "#"  5.78:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ข้อกำหนดสมมุติข้อแรก"  12.21:1 at 1440 and 1024 px
span "# รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h2 "#. ข้อกำหนดสมมุติข้อแรก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "# หลักฐานสมมุติ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "หน้าเว็บของสำนักงาน"  5.07:1 at 1440, 1024, 768, 375 and 320 px
span "ตัวชี้วัดก่อนหน้า"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  12.21:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ตัวชี้วัดถัดไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`moit-no-requirement` (Evidence alone, in its card over the field's edge):

```text
a "หน้าแรก"  10.85:1 at 375 and 320 px
a "ITA"  10.28:1 at 375 px
a "ปีงบประมาณ #"  8.96:1 at 320 px
span "MOIT #"  5.77:1 at 320 px (2 texts)
span "ITA ปีงบประมาณ พ.ศ. #"  8.84:1 at 320 px
h1 "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  6.44:1 at 375 px
p "สรุปสมมุติของตัวชี้วัด สำหรับภ"  6.45:1 at 375 and 320 px
p "หลักฐาน # รายการ · ปรับปรุงล่า"  6.45:1 at 375 and 320 px
span "หลักฐานสมมุติก่อนข้อกำหนด"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "หน้าเว็บของสำนักงาน"  5.07:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "หลักฐานสมมุติชิ้นที่สอง"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "ตัวชี้วัดก่อนหน้า"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  12.21:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ตัวชี้วัดถัดไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`moit-no-evidence` (the page ends with its field):

```text
a "หน้าแรก"  10.85:1 at 375 and 320 px
a "ITA"  10.15:1 at 375 px
a "ปีงบประมาณ #"  8.72:1 at 320 px
span "MOIT #"  5.61:1 at 320 px (2 texts)
span "ITA ปีงบประมาณ พ.ศ. #"  8.60:1 at 320 px
h1 "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  6.27:1 at 375 px
p "สรุปสมมุติของตัวชี้วัด สำหรับภ"  6.45:1 at 375 and 320 px
p "หลักฐาน # รายการ · ปรับปรุงล่า"  6.45:1 at 375 and 320 px
span "ตัวชี้วัดก่อนหน้า"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  12.21:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ตัวชี้วัดถัดไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`moit-no-year-page` (a draft MOIT of 2567 through its signed preview link):

```text
a "หน้าแรก"  10.85:1 at 320 px
a "ITA"  10.27:1 at 320 px
span "MOIT #"  5.92:1 at 320 px (2 texts)
span "ITA ปีงบประมาณ พ.ศ. #"  8.97:1 at 320 px
h1 "MOIT # [ตัวอย่าง] ตัวชี้วัดสมม"  6.62:1 at 375 px
p "สรุปสมมุติของตัวชี้วัด สำหรับภ"  6.45:1 at 320 px
p "หลักฐาน # รายการ ใน # ข้อ · ปร"  6.45:1 at 375 and 320 px
p "สารบัญ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "#"  5.78:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ข้อกำหนดสมมุติข้อแรก"  12.21:1 at 1440 and 1024 px
span "# รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h2 "#. ข้อกำหนดสมมุติข้อแรก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "# หลักฐานสมมุติ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "หน้าเว็บของสำนักงาน"  5.07:1 at 1440, 1024, 768, 375 and 320 px
```

### Focus rings

`scripts/measure-focus-contrast.ts` at `ed0d0bb`, at the five widths, with the selectors #393,
#394 and #396 read, between 03:53Z and 03:54Z, every run exit 0, each output equal line for line to
its ticket's:

- **A year card on `/ita`** (`main ul a >> nth=0`, on the demo dataset and on `ita-three-years`):
  under the ring alone 1.00:1 to 1.21:1 at its lowest, 39 to 45 % of its pixels under 3:1, where
  it crosses the field's edge; beside it, with focus and its white band, 4.38:1 at 1,440 px and
  5.47:1 or more below, 0 % under 3:1 at every width.
- **A MOIT row's title on `/ita/2570`** (`main ol article h2 a >> nth=0`): the ring lies on the
  row's white, 6.45:1 under and beside it at every width, 0 % under 3:1.
- **A MOIT's first table-of-contents link** (the demo's two MOITs): on the white panel, 6.45:1
  under it and 5.73:1 or more beside it at every width.
- **A MOIT's first card head** (`main details summary >> nth=0`): at 1,440 and 1,024 px it meets the
  field, 1.00:1 under it on the field's side (53 to 55 % of its pixels under 3:1) and 4.89:1 or
  more beside it with its white band; at 768, 375 and 320 px 4.54:1 or more under it and 4.93:1 or
  more beside it, 0 % under 3:1.

## Spec #392's decisions and the decisions made while the tickets were built

Spec #392 lists thirteen decisions, the last three the prototype's picks, that the Product Owner
made before it (#392 comment 7075910252: the grill's questions each answered "ตามที่แนะนำ", the
picks through the session's question tool, P1 changed in the session from A to B);
`docs/design/DESIGN.md` §10 lists them. Every decision made while the tickets were built has a
recorded answer on its ticket, and §10 and §13 cite each one that decides what a page shows:

| Ticket | Decision | Answer |
| --- | --- | --- |
| #393 | The Homepage Quick Link's list form (`/health`, `/about`) losing its focus band under the pointer, as the year card did before `46ef218` | (a) a small ticket of its own after Feature 013, "ตามที่แนะนำ" (comment 7076682722); #408 |
| #395 | A date that `DateText` splits across two lines; "หน่วยงาน" breaking inside the word in a MOIT's H1 | 1 "ออก issue ต่อหลัง F013 (แนะนำ)", #409; 2 "ออก issue เพิ่มคำทีหลัง (แนะนำ)", #410 (comment 7079177230) |
| #396 | A MOIT whose Requirements hold no Evidence; the chevron of a card's head below 640 px | 1 over the field's edge, as every MOIT with a card; 2 centred on the number's tile, or on the title's first line without one (comment 7080124411) |
| #396 | A one-line title's head below 640 px; a focus ring 1–7 px below the window while tabbing; the gate's taste suggestions | 1 as built, the pill 8 px under the tile's line; 2 a site-wide ticket after Feature 013, #411; 3 kept as P3 B (comment 7081797338) |
| #397 | A Document's page without a before screenshot at `15b519f`; when to open the four follow-ups | 1 "Promote ย้อนชั่วคราว (Recommended)"; 2 "เปิดตอนนี้ใน #397 (Recommended)", #408 to #411 (comment 7090321604) |
| #397 | The walkthrough's two changes: a light row tile, and `/health`'s and `/about`'s cards as `/services`' | "ทุกที่ที่ใช้ tile นี้ (Recommended)"; "Feature ใหม่หลัง F013 (Recommended)", #412 (comment 7091473095) |

#394 had no pending confirmation; its pull request answers each of its gate's taste notes by the
spec, a precedent or a shared component (PR #399).

Still open, each outside Feature 013:

- **#408**, the Homepage Quick Link's list form on `/health` and `/about` loses its focus band under
  the pointer.
- **#409**, `DateText` keeps a date whole on one line wherever it renders.
- **#410**, "หน่วยงาน" joins `ThaiTitle`'s list.
- **#411**, a focused element's ring can end below the window while tabbing forward.
- **#412**, the row tile light wherever it shows (the Document's file tile, a MOIT's row, a Health
  Report's row) and `/health`'s and `/about`'s cards as `/services`', a feature of its own.
- **#277**, the redesigned pages on a real phone and in browsers other than Chromium, inside
  #238's UAT window: Feature 013's pages join that visit.

## The tickets' frontend gates

Each ticket's gate (CLAUDE.md "Frontend Design & Quality") is self-review, recorded in its pull
request; this round ran none again, as #397 changes no page:

- #393 (PR #398): critique 26/36 with no defect in scope, its taste notes each meeting a decision
  of the spec; audit and Playwright MCP at 1,440, 768, 375 and 320 px with one defect, the focus
  band lost under the pointer, fixed in `46ef218`; the guidelines with no finding; `impeccable
  detect` `[]`, the overlay's `radial-halo` the deep field's glow.
- #394 (PR #399): critique 30/40, audit and the guidelines with no finding, `detect` `[]` on the
  files; the overlay's `low-contrast` on "MOIT" (the detector takes the gradient's lighter stop;
  measured 4.69:1 or more, §3.2) and `radial-halo`, both known; Playwright MCP with no sideways
  scroll from 320 to 1,440 px and each ring whole with its band.
- #395 (PR #402): critique 24/32, audit 20/20, `detect` `[]`, the guidelines with no defect; the
  overlay did not run; Playwright MCP at eight widths with no sideways scroll; two items to the
  Product Owner, now #409 and #410.
- #396 (PR #405): critique 28/40, audit 18/20, `detect` 0 on the five files, the guidelines with no
  anti-pattern; Playwright MCP at the five widths: no overflow, the panel's places, the sticky
  panel, the Tab order with whole rings, the band under the pointer.

## Walkthrough

After the 404 log was cleared (03:56Z), the Product Owner was given these steps in the session,
each with its full address, with the list under "What the evidence does not cover" in the same
message as the question:

1. `/ita`: the heading on the field and the year card over its edge;
2. `/ita/2570`: a white row per MOIT with its "MOIT n" tile, its Evidence count and its date;
3. `/ita/demo-moit-1-2570`: the header, the table of contents' panel, the Requirement cards with
   their number tiles, the dashed pill of a file that cannot be served, and "ตัวชี้วัดถัดไป";
4. `/ita/demo-moit-2-2570`: 18 Requirements, the table of contents that stays in view from 1,024
   px, the sub-Requirements, a card closed and opened, a link of the table of contents;
5. the shared pieces, unchanged: `/`, `/documents/demo-document-vhv-application` and `/about`;
6. steps 1 to 4 at 375 px in the browser's device mode;
7. the before and after screenshots on `evidence/013-397-screenshots`.

The Product Owner chose all four groups (steps 1 to 4, 5, 6, 7) as opened, answered "มีจุดที่ต้องแก้"
and accepted every coverage gap below, "A รับตามรายการ (Recommended)". The points were two changes
to the look, given in the session: `/health`'s and `/about`'s cards to look like the other pages'
cards, such as `/services`', and the dark gradient row tile (`RowTile`, the Document row's "PDF"
tile and a MOIT row's "MOIT n" tile) to turn light. Asked where they go, the Product Owner chose
the tile "ทุกที่ที่ใช้ tile นี้ (Recommended)" and the work "Feature ใหม่หลัง F013 (Recommended)":
Feature 013 is handed off as built, and #412 holds the request (#397 comment 7091473095).

**What the app's log shows of the walkthrough** (`scripts/dev-runtime-opened.ts` from 03:56:36Z
with `--expect` and the seven addresses the steps gave, read at 04:06Z): 9 page requests between
04:01:31Z and 04:05:31Z, every one 200: the four ITA addresses, the Document's page and `/about`
once each, and `/news`, `/services` and `/health`, and the Homepage beyond the health check at
04:03:22Z; "0 of 7 addresses not shown as opened". The log holds no query string or window width,
so it shows no second visit for step 6; that step rests on the Product Owner's answer.

## What the evidence does not cover

Written before the walkthrough was asked for, and listed whole beside its question; the Product
Owner accepted it (#397 comment 7091473095, item 3):

- Browsers other than Chromium, and a real phone or touch: every suite, capture and measure ran in
  Playwright's Chromium, and the runtime answers on `127.0.0.1` only, so the phone steps are the
  browser's device mode. #277 visits the redesigned pages inside #238's UAT window.
- Real content: the runtime holds the demo dataset, one fiscal year (2570) with two MOITs (spec
  #392 "Testing Decisions"). Three fiscal years, a year of 22 MOITs and a year of one, a MOIT at
  the published content's largest sizes (a title of 175 characters, 37 Requirements, a
  Requirement title of 238 characters), a MOIT without a summary, without a Requirement or without
  Evidence, a draft MOIT of a year without a page, and a landing with no published MOIT are seen
  only through the synthetic fixtures of `scripts/screenshot-fixtures/ita-cases.ts`, whose titles
  are made up at the export's lengths. The office's own MOITs reach the runtime only with the
  migration.
- Two states that no capture or contrast run of this round shows, which the suites read
  (`public-ita.spec.ts`): Evidence before the first Requirement with Requirements after it (the
  white card first in the cards' column; neither demo MOIT has such Evidence, and the
  `moit-no-requirement` case shows the card alone: the note from #396), and a MOIT whose
  Requirements hold no Evidence, lying over the field's edge (#396 comment 7080124411).
- The Admin's preview: the draft MOIT's page is read through the signed preview link a fixture
  makes (`moit-no-year-page`); no step opens the Admin's own preview, and the feature changes no
  model, field or Admin screen, so the walkthrough has no Admin step.
- The 404s of a missing, draft or trashed MOIT and of a year without a published MOIT, and
  `/search`'s MOIT row: unchanged in look and read by the suites (`public-ita.spec.ts`,
  `public-ita-years.spec.ts`, `public-search.spec.ts`); no capture of this round shows them.
- A focus ring that ends 1 to 7 px below the window while tabbing forward, on a MOIT's page and on
  `/health/reports`: left to #411 for the whole site (#396 comment 7081797338, item 2).
- The Homepage Quick Link's list form on `/health` and `/about` losing its focus band under the
  pointer: left to #408 (#393 comment 7076682722). The round's captures show the tiles at rest.
- A date that `DateText` splits between its month and year, as on the demo's MOIT 2 at 375 px,
  left to #409, and "หน่วยงาน" breaking inside the word in a title, as in MOIT 1's H1 at 640 px,
  left to #410 (#395 comment 7079177230). The captures at 375 px show the first; no capture is at
  640 px.
- Text at 200 % on a fiscal year's page: at 320 px a one-line row's title column is 44 px wide, as
  on a Document row, which also scrolls sideways there; WCAG's reflow at 320 px passes (the note
  from #394, #394's frontend gate). No run of this round enlarges text.
- Forced colours (Windows High Contrast): no run of this round emulates them.
- Motion on the built, minified pages: the runtime serves the stylesheet unminified, and the suites
  read it there. `npm run build:check` reads the built stylesheets; the look of a built page with
  motion allowed is due with the feature's first production image
  (`scripts/production-image-check.sh`, #276).
- Keyboard passes by hand: each ticket's frontend gate tabbed through its own pages at its own
  head; this round runs the suites' axe and focus checks (`expectVisibleFocusOnEveryStop`, desktop
  and mobile) and no pass by hand.
- Reduced motion in the walkthrough, and print: the suites prefer reduced motion on every page but
  the tests of motion (`DESIGN.md` §8.12), and no run of the round prints a page.
- The before screenshots as a control of this round: the ITA pages' are #393's at `15b519f` on
  `main`, taken before the feature's first promotion (the note from #393); the Homepage's, `/about`'s,
  `/about/personnel`'s and `/about/policies`' are #372's at `7077100`, whose `src` is `15b519f`'s;
  the Document pages' and `/documents`' were taken in this round with the runtime promoted back to
  `15b519f` for them alone (#397 comment 7090321604). The demo dataset did not change between
  `7077100` and `ed0d0bb` (`git log 7077100..ed0d0bb -- scripts/demo-dataset scripts/demo-dataset.ts`
  is empty).

## What was kept as it is

Each on the Product Owner's answer or a ticket's record, with no follow-up issue:

- A Requirement card's head with a one-line title below 640 px, the title centred on the tile and
  the count's pill 8 px under the tile's line (#396 comment 7081797338, item 1; `DESIGN.md` §9.11).
- The gate's taste suggestions on a MOIT's page: the next MOIT's card from the page's midpoint from
  1,024 px, numbers alone in the table of contents below 1,024 px, a sticky panel taller than the
  window ending flush, no pointer change on a card's head beyond the cursor, and the counts without
  `tabular-nums` (#396 comment 7081797338, item 3).
- `HealthReportRow` (Feature 011) keeps its own copy of the gradient tile's box, which `RowTile` now
  holds for `FileTile` and the MOIT row; moving it was outside #394 (the note from #394).

## The prototype

The prototype is on the branch `prototype/ita-redesign` at `a59b8f5` (`c625b57` the build,
`6087b81` the changed P1, `a59b8f5` the case at the published content's largest sizes), outside
`main`: its builder scripts and its record, `docs/prototypes/ita-redesign.md`. Its pages,
screenshots and sheets stay on the development host. Spec #392 "How this differs from the
prototype" names six differences (a MOIT without Evidence, the row's tile hidden with "MOIT n" in
the link, the Requirement head's tile hidden with the number in the H2, the table of contents'
edge from 1,024 px, the prototype's content and reads, and its sizes on tokens); the built pages
keep each. Every further difference was decided on its ticket (the decisions table above).

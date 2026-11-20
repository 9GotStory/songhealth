# #372 evidence: Feature 012 (the About pages, the Contact page and a Basic Page) on the development runtime

Feature 012's evidence round (spec #365), run on 2026-11-20 by Claude Code at `7077100`, the head
of `012-about-contact-pages`, and the Product Owner's walkthrough of 2026-11-20. This is a self-run
record, not an independent review, and not the Product Owner's acceptance, which the Product Owner
gives on #365.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`. It already served
  `7077100`, the merge of #369's retro (PR #388), so the round promoted nothing; no window held it.
  `dev-runtime-verify.sh` reported VERIFY: PASS at `7077100c5ca9c0d8710cbb266ceab5720228989d` before
  the round (14:07Z) and after the walkthrough (15:30Z).
- **Code under test:** `7077100`. #372's branch adds documents over it, so its head has
  `7077100`'s application code. Node 26.13.0, npm 12.2.1.
- **Content:** the demo dataset, 56 entries, all published, and each capture's and each measure's
  own synthetic fixtures, which it removes.

## Checks

The browser suites ran at `7077100` between 14:08Z and 14:45Z on 2026-11-20, T021 and residue at
14:46Z, the captures between 14:46Z and 14:49Z, and the measures between 14:49Z and 15:14Z, with
`/about` measured again at 15:15Z. The local checks ran on #372's working tree between 15:18Z and 15:19Z, before the
review. The pull request states the checks at its head.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | exit 0: 0 errors, 0 warnings, 2 hints |
| Node seam | `npm run test:node` | 844 of 844 passed |
| Build | `npm run build:check` | exit 0; `check-built-styles: PASS (2 stylesheets, the reveal in 1)` |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | each exit 0; jscpd's baseline unchanged at 21 clones |
| Browser seam | `scripts/dev-runtime-env.sh npm run test:browser` | 784 passed, 14 skipped, in 37.8 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | source identity verified at `7077100`; 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 46 misses, all synthetic; 56 entries, 0 not published; 0 database connection errors in the last hour |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | cleared before the walkthrough (15:18Z), 46 entries, none without the synthetic marks |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator;
the coordinator ran those 14 at 14:46Z. No test of the full run failed. The run's near-timeout
report named two tests at 60 % or more of their 30 s, `public-services.spec.ts`' "a filtered
catalog pages through with its filter kept", 26.7 s, and `public-demo-dataset.spec.ts`' axe and
focus case on the dataset's list pages at the desktop width, 19.8 s; both passed, and neither is a
Feature 012 page.

## Screenshots

After, at `7077100`, with reduced motion preferred, so the pages show at rest, by
`.tmp/372/capture-after.sh` on the development host, between 14:46Z and 14:49Z:

```text
node scripts/capture-screenshots.mjs <dir> after-<name>-<width>=<path>@<width>   # the demo dataset
CASE=<case> scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/about-contact-cases.ts <dir>                          # the synthetic cases
scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/homepage-quick-access.ts <dir> 'section[aria-labelledby="home-quick-access"]'
```

Before: the feature's first ticket's, the 100 images on `evidence/012-366-screenshots` at
`f17c4bd`, taken at `00ab334` on `main` before the feature's first promotion with the same commands,
targets and counts (the note from #366), and the Homepage's five, `after-home-*` of
`evidence/011-346-screenshots` at `86de6c9`, taken at `9f31dc0`, Feature 011's head, from which
`00ab334` changes no file under `src`. This round captured the same 20 cases at the same five
widths: the nine addresses on the demo dataset (`/about`, `/about/organization`,
`/about/leadership`, `/about/personnel`, `/about/policies`, `/about/plans`, `/about/results`,
`/contact` and `/pages/privacy`); with `about-contact-cases.ts` a full first page of plans and its
second page (`plans-full`), six leaders and 22 staff in five units, three without one (`people`),
one leader (`leadership-one`), a Basic Page without a summary, one with its title alone, one with
related Documents and `/about` without its Basic Page (`pages`), Office Contact with nothing set
(`contact-empty`) and without a channel (`contact-no-channels`); and the Homepage whole. It also
captured two Homepage pieces up close, after only: the Leadership strip with the demo dataset's
two leaders (`home-leadership`), and Quick Access with `homepage-quick-access.ts`' three shortcuts
(`home-quick-access`), which the demo dataset's empty menu hides, so no before image shows it. The
Homepage's after images are byte for byte its before images at all five widths (`cmp`), the strip
on `PersonPicture` (#367) and the tile with its `kind` (#371) unchanged on the Homepage. The demo
dataset did not change between `00ab334` and `7077100`; the synthetic titles and slugs are made
again on each run.

`scripts/evidence-branch.sh` put the 220 images (105 before, 115 after) and their `captures.txt` on
the image-only branch `evidence/012-372-screenshots`, at
`59ea661c55e948e4ecf7f0a4f32cb7e5e955daa9`. Page heights in pixels, the table that script printed
from the PNGs (a page with 900 px at every width is shorter than the window; a close-up is its
section's height):

| Page | | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `about` | before | 1,857 | 1,857 | 1,831 | 2,471 | 2,727 |
| | after | 1,813 | 1,813 | 1,921 | 2,035 | 2,221 |
| `about-no-page` | before | 900 | 900 | 905 | 1,219 | 1,345 |
| | after | 900 | 900 | 900 | 900 | 945 |
| `contact` | before | 1,419 | 1,419 | 1,451 | 1,639 | 1,821 |
| | after | 1,437 | 1,437 | 1,495 | 2,003 | 2,289 |
| `contact-empty` | before | 900 | 900 | 900 | 900 | 1,009 |
| | after | 935 | 935 | 931 | 1,205 | 1,395 |
| `contact-no-channels` | before | 1,201 | 1,201 | 1,173 | 1,331 | 1,469 |
| | after | 1,235 | 1,235 | 1,239 | 1,677 | 1,919 |
| `home` | before | 5,541 | 5,704 | 7,557 | 6,344 | 6,866 |
| | after | 5,541 | 5,704 | 7,557 | 6,344 | 6,866 |
| `home-leadership` | after | 188 | 188 | 353 | 301 | 307 |
| `home-quick-access` | after | 279 | 301 | 369 | 302 | 340 |
| `leadership` | before | 900 | 900 | 900 | 979 | 1,191 |
| | after | 1,039 | 1,115 | 1,097 | 1,185 | 1,397 |
| `leadership-one` | before | 900 | 900 | 900 | 900 | 993 |
| | after | 900 | 900 | 900 | 973 | 1,163 |
| `leadership-six` | before | 951 | 1,051 | 1,225 | 1,693 | 2,169 |
| | after | 1,265 | 1,417 | 1,581 | 1,945 | 2,395 |
| `organization` | before | 905 | 905 | 937 | 1,127 | 1,307 |
| | after | 961 | 961 | 985 | 1,167 | 1,347 |
| `page-no-summary` | before | 900 | 900 | 900 | 900 | 900 |
| | after | 900 | 900 | 900 | 900 | 925 |
| `page-privacy` | before | 900 | 900 | 900 | 900 | 987 |
| | after | 900 | 900 | 900 | 900 | 1,027 |
| `page-related` | before | 1,143 | 1,143 | 1,117 | 1,299 | 1,465 |
| | after | 1,305 | 1,305 | 1,317 | 1,403 | 1,529 |
| `page-title-only` | before | 900 | 900 | 900 | 900 | 900 |
| | after | 900 | 900 | 900 | 900 | 900 |
| `personnel` | before | 1,243 | 1,307 | 1,417 | 1,757 | 2,103 |
| | after | 1,348 | 1,348 | 1,470 | 1,640 | 1,866 |
| `personnel-many` | before | 2,723 | 3,087 | 3,845 | 5,805 | 6,545 |
| | after | 2,533 | 2,625 | 3,053 | 4,055 | 5,081 |
| `plans` | before | 900 | 900 | 927 | 1,071 | 1,297 |
| | after | 900 | 900 | 1,037 | 1,051 | 1,177 |
| `plans-full` | before | 4,005 | 4,005 | 4,037 | 5,127 | 5,473 |
| | after | 3,569 | 3,569 | 4,727 | 4,549 | 4,675 |
| `plans-full-page-2` | before | 900 | 900 | 900 | 951 | 1,077 |
| | after | 900 | 900 | 900 | 927 | 1,053 |
| `policies` | before | 900 | 900 | 925 | 1,129 | 1,295 |
| | after | 900 | 900 | 1,039 | 1,023 | 1,149 |
| `results` | before | 900 | 900 | 900 | 900 | 1,013 |
| | after | 900 | 900 | 900 | 900 | 959 |

The heights `DESIGN.md` §7.8 records for the About Document pages (#366), `/about/leadership` (#367)
and `/about/personnel` (#370), before and after, are this table's, and so are the heights the notes
from #371 and #369 give (`/about` at 375 px 2,471 then 2,035; `/contact` at 320 px 1,821 then 2,289,
and with nothing set 1,009 then 1,395).


## Contrast

`scripts/measure-text-contrast.ts --all-text --fold <path> main` at `7077100`, at 1,440, 1,024, 768,
375 and 320 px, every run exit 0, by `.tmp/372/contrast-run.sh` between 14:49Z and 15:13Z, and `/about` again at 15:15Z: every
text in `main` on the nine addresses and a page past the last of `/about/policies` on the demo
dataset, eleven synthetic cases, and the Homepage's Leadership strip and Quick Access. Small text
needs 4.5:1 and large text 3:1 (WCAG 2.2 SC 1.4.3). No run named a text it could not read. The
lowest reading of any text is 4.69:1, the pager's "หน้า 1" under the last row of the full page of
plans and on its second page; then `/about`'s summary 4.85:1 at 1,024 px, where the field's large
ring runs behind it; every other text reads 4.97:1 or more. Each run's closing lines follow whole:
a text, its lowest reading over the five widths and the widths that read it; a line ending "(N
texts)" folds texts whose words differ only in their numbers, written "#".

Every reading Feature 012's tickets recorded in `DESIGN.md` is read the same at `7077100`, each
run's closing lines equal to its ticket's own output: the About Document pages (§7.8; #366 at
`7dd9722`), Leadership (§7.8; #367 at `81dc941`), Personnel (§7.8; #370 at `fbc27a6`), a Basic
Page (§9.9; #368 at `b020cc4`), `/about` (§9.9; #371 at `36e0770`) and `/contact` (§9.10; #369 at
`cd80cb9`). Two things differ in the outputs and in no reading: the full page of plans folds 18
and 2 dates where #366's folded 17 and 3, as the synthetic dates follow the day of the run; and
the round's first run of `/about` read its H1 5.93:1 at 320 px, where the second, at 15:15Z, read
5.86:1, #371's reading, with every other line of the two runs the same and no change to `/about`'s
code since `36e0770`. The table below takes the second run. The cases new to this round, without a
ticket's reading in `DESIGN.md`, are a Basic Page without a summary (its breadcrumb's current page
5.13:1 at 320 px, under the 5.27:1 §9.9 gives for its three pages and over 4.5:1), one with its
title alone, `/contact` without a channel, and the Homepage's two pieces.

### The nine addresses on the demo dataset

`/about` (the demo dataset's `about` page, two related Documents; the round's second run of it, below):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
span "เกี่ยวกับเรา"  9.60:1 at 320 px
h1 "[ตัวอย่าง] เกี่ยวกับสำนักงานสา"  5.86:1 at 320 px
p "สำนักงานสาธารณสุขอำเภอสอง จังห"  4.85:1 at 1024 px
h2 "โครงสร้างองค์กร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "ผู้บริหาร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "บุคลากร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "นโยบาย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "แผนงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "ผลการดำเนินงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "หน้าที่และอำนาจ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ประสานงานและสนับสนุนการดำเนินง"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "พื้นที่รับผิดชอบ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ครอบคลุม # ตำบลของอำเภอสอง จัง"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "วิสัยทัศน์"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ประชาชนอำเภอสองมีสุขภาพดี ด้วย"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารเผยแพร่"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารที่เกี่ยวข้อง"  15.47:1 at 375 and 320 px
span "PDF"  5.60:1 at 375 px (2 texts)
span "นโยบาย"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] นโยบายการบริหารงานส"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ทิศทางและนโยบายการดำเนินงานด้า"  4.97:1 at 1440, 1024 and 768 px
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "แผนงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024 and 768 px
```

`/about/organization`:

```text
a "หน้าแรก"  10.41:1 at 320 px
a "เกี่ยวกับเรา"  9.09:1 at 320 px
span "[ตัวอย่าง] โครงสร้างองค์กร"  5.86:1 at 375 px
h1 "[ตัวอย่าง] โครงสร้างองค์กร"  5.79:1 at 320 px
p "การแบ่งส่วนงานภายในของสำนักงาน"  6.19:1 at 375 px
h2 "กลุ่มงานบริหารทั่วไป"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "งานธุรการ การเงินและบัญชี พัสด"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "กลุ่มงานส่งเสริมสุขภาพและป้องก"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "งานส่งเสริมสุขภาพทุกกลุ่มวัย ง"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "กลุ่มงานคุ้มครองผู้บริโภคและเภ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "งานคุ้มครองผู้บริโภคด้านผลิตภั"  15.61:1 at 1440, 1024, 768, 375 and 320 px
```

`/pages/privacy`:

```text
a "หน้าแรก"  10.27:1 at 320 px
span "[ตัวอย่าง] นโยบายความเป็นส่วนต"  6.19:1 at 320 px
h1 "[ตัวอย่าง] นโยบายความเป็นส่วนต"  5.34:1 at 375 px
p "วิธีที่เว็บไซต์นี้ดูแลข้อมูลขอ"  6.45:1 at 375 and 320 px
p "เว็บไซต์นี้ไม่ใช้คุกกี้ติดตามแ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "การติดต่อสำนักงาน"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ข้อมูลส่วนบุคคลที่ท่านให้เมื่อ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
```

`/about/leadership` (two leaders, both with a picture):

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "ผู้บริหาร"  8.60:1 at 320 px
p "บุคลากร"  8.60:1 at 320 px
h1 "ผู้บริหาร"  8.03:1 at 320 px
p "ผู้บริหารของสำนักงานสาธารณสุขอ"  6.36:1 at 320 px
h2 "[ตัวอย่าง] สมชาย ใจดี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สาธารณสุขอำเภอสอง"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "กลุ่มงานบริหารทั่วไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "โทร # # # ต่อ #"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h2 "[ตัวอย่าง] วิภาวดี แสงทอง"  16.12:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้ช่วยสาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "กลุ่มงานส่งเสริมสุขภาพและป้องก"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`/about/personnel` (six Personnel in three units):

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "บุคลากร"  8.60:1 at 320 px
p "เกี่ยวกับเรา"  8.48:1 at 320 px
h1 "บุคลากร"  8.03:1 at 320 px
p "บุคลากรของสำนักงานสาธารณสุขอำเ"  6.36:1 at 320 px
h2 "กลุ่มงานคุ้มครองผู้บริโภคและเภ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] เกศินี วงศ์ใหญ่"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เภสัชกรชำนาญการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
p "โทร # # # ต่อ #"  16.54:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
h2 "กลุ่มงานบริหารทั่วไป"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] กาญจนา มีสุข"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "นักจัดการงานทั่วไปชำนาญการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] สมชาย ใจดี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h2 "กลุ่มงานส่งเสริมสุขภาพและป้องก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] ธนพล รักษ์ดี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "นักวิชาการสาธารณสุขชำนาญการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] ปิยะพงษ์ ศรีสุข"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "นักวิชาการสาธารณสุข (ทันตสาธาร"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] วิภาวดี แสงทอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้ช่วยสาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`/about/policies`:

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "นโยบาย"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
p "เกี่ยวกับเรา"  8.48:1 at 320 px
h1 "นโยบาย"  8.14:1 at 320 px
p "เอกสารนโยบายของสำนักงานสาธารณส"  6.36:1 at 320 px
span "PDF"  5.60:1 at 375 px (2 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] นโยบายการบริหารงานส"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ทิศทางและนโยบายการดำเนินงานด้า"  4.97:1 at 1440, 1024 and 768 px
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
time "# ก.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] นโยบายคุ้มครองข้อมู"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "หลักการเก็บรวบรวม ใช้ และเปิดเ"  4.97:1 at 1440, 1024 and 768 px
```

`/about/plans` (one superseded):

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "แผนงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
p "เกี่ยวกับเรา"  8.48:1 at 320 px
h1 "แผนงาน"  7.92:1 at 320 px
p "เอกสารแผนงานของสำนักงานสาธารณส"  6.45:1 at 375 px
span "PDF"  5.60:1 at 375 and 320 px (2 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024 and 768 px (2 texts)
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ถูกแทนที่แล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
```

`/about/results`:

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "ผลการดำเนินงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "เกี่ยวกับเรา"  8.48:1 at 320 px
h1 "ผลการดำเนินงาน"  6.80:1 at 320 px
p "เอกสารผลการดำเนินงานของสำนักงา"  6.45:1 at 320 px
span "PDF"  5.60:1 at 375 px
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] รายงานผลการดำเนินงา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สรุปผลการดำเนินงานตามตัวชี้วัด"  4.97:1 at 1440, 1024 and 768 px
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`/about/policies?page=2`, a page past the last:

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "นโยบาย"  8.60:1 at 320 px
p "เกี่ยวกับเรา"  8.48:1 at 320 px
h1 "นโยบาย"  8.14:1 at 320 px
p "เอกสารนโยบายของสำนักงานสาธารณส"  6.36:1 at 320 px
p "ไม่พบเอกสารในหน้านี้"  16.54:1 at 1440, 1024, 768, 375 and 320 px
a "กลับไปหน้าแรกของรายการ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`/contact` (Office Contact in full, three channels):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
span "ติดต่อเรา"  9.73:1 at 375 and 320 px
p "ติดต่อ"  5.81:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h1 "ติดต่อเรา"  8.14:1 at 375 and 320 px
p "ที่อยู่ เวลาทำการ และช่องทางติ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
dt "ที่ตั้ง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "[ตัวอย่าง] # หมู่ # ตำบลบ้านก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ (เปิดในแท็บใหม่)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "โทรศัพท์"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "# # #"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "อีเมล"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "contact@example.invalid"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "เวลาทำการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "จันทร์–ศุกร์ #–# น. เว"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "ช่องทางทางการ"  15.47:1 at 375 and 320 px
a "Facebook (เว็บไซต์ภายนอก) (เปิ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "LINE (เว็บไซต์ภายนอก) (เปิดในแ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "YouTube (เว็บไซต์ภายนอก) (เปิด"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "ร้องเรียนและเสนอแนะ"  16.06:1 at 1440, 1024, 768, 375 and 320 px
p "ขั้นตอนและช่องทางการร้องเรียน "  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ดูบริการประชาชน"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "ติดต่อหน่วยบริการสุขภาพ"  15.93:1 at 1440, 1024, 768, 375 and 320 px
a "ดูหน่วยบริการสุขภาพที่เกี่ยวข้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

### The synthetic cases (`about-contact-cases.ts`)

`plans-full`: a full first page of twenty-one plans:

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "แผนงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (21 texts)
p "เกี่ยวกับเรา"  8.48:1 at 320 px
h1 "แผนงาน"  7.92:1 at 320 px
p "เอกสารแผนงานของสำนักงานสาธารณส"  6.45:1 at 375 px
span "PDF"  5.60:1 at 375 and 320 px (20 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (34 texts)
time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (18 texts)
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (14 texts)
a "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (5 texts)
p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024 and 768 px (15 texts)
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px (20 texts)
a "[ตัวอย่าง] แผนยุทธศาสตร์การพัฒ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] แผนป้องกันและควบคุม"  16.54:1 at 1440, 1024, 768, 375 and 320 px (5 texts)
a "[ตัวอย่าง] แผนส่งเสริมสุขภาพผู"  16.54:1 at 1440, 1024, 768, 375 and 320 px (5 texts)
span "ถูกแทนที่แล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
a "[ตัวอย่าง] แผนพัฒนาระบบบริการส"  16.54:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
li "หน้า #"  4.69:1 at 1440, 1024, 768, 375 and 320 px
a "หน้าถัดไป"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`plans-full-page-2`: its second page:

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "แผนงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "เกี่ยวกับเรา"  8.48:1 at 320 px
h1 "แผนงาน"  7.92:1 at 320 px
p "เอกสารแผนงานของสำนักงานสาธารณส"  6.45:1 at 375 px
span "PDF"  5.60:1 at 320 px
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024 and 768 px
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "หน้าก่อนหน้า"  6.45:1 at 1440, 1024, 768, 375 and 320 px
li "หน้า #"  4.69:1 at 1440, 1024, 768, 375 and 320 px
```

`leadership-six`: six leaders, two without a picture:

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "ผู้บริหาร"  8.60:1 at 320 px
p "บุคลากร"  8.60:1 at 320 px
h1 "ผู้บริหาร"  8.03:1 at 320 px
p "ผู้บริหารของสำนักงานสาธารณสุขอ"  6.36:1 at 320 px
h2 "นาย[ตัวอย่าง] อรุณี ศรีสุข"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สาธารณสุขอำเภอสอง"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "กลุ่มงานบริหารทั่วไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
p "โทร #-#-# ต่อ #"  16.54:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
h2 "นาง[ตัวอย่าง] ประเสริฐ บุญมา"  16.12:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้ช่วยสาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "กลุ่มงานส่งเสริมสุขภาพและป้องก"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "นาย[ตัวอย่าง] สุนันทา แก้วใส"  16.12:1 at 1440, 1024 and 768 px
p "กลุ่มงานคุ้มครองผู้บริโภคและเภ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "นาง[ตัวอย่าง] วีระพงษ์ ทองดี"  16.12:1 at 1440 and 1024 px
p "หัวหน้ากลุ่มงานส่งเสริมสุขภาพแ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "กลุ่มงานพัฒนาระบบบริการสุขภาพป"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "นาย[ตัวอย่าง] จันทร์เพ็ญ สายบั"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "หัวหน้ากลุ่มงานคุ้มครองผู้บริโ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "กลุ่มงานควบคุมโรคไม่ติดต่อและส"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "นาง[ตัวอย่าง] ณัฐวุฒิ ศรีสุข"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "หัวหน้ากลุ่มงานบริหารทั่วไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`leadership-one`: one leader:

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "ผู้บริหาร"  8.60:1 at 320 px
p "บุคลากร"  8.60:1 at 320 px
h1 "ผู้บริหาร"  8.03:1 at 320 px
p "ผู้บริหารของสำนักงานสาธารณสุขอ"  6.36:1 at 320 px
h2 "นาง[ตัวอย่าง] อรุณี ศรีสุข"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สาธารณสุขอำเภอสอง"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "กลุ่มงานบริหารทั่วไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "โทร #-#-# ต่อ # อีเมล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`personnel-many`: 22 staff in five units, three without one:

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "บุคลากร"  8.60:1 at 320 px
p "เกี่ยวกับเรา"  8.48:1 at 320 px
h1 "บุคลากร"  8.03:1 at 320 px
p "บุคลากรของสำนักงานสาธารณสุขอำเ"  6.36:1 at 320 px
h2 "กลุ่มงานควบคุมโรคไม่ติดต่อและส"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาย[ตัวอย่าง] จันทร์เพ็ญ สายบั"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "หัวหน้ากลุ่มงานคุ้มครองผู้บริโ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "ช่องทางติดต่อ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (8 texts)
p "โทร #-#-# ต่อ #"  16.54:1 at 1440, 1024, 768, 375 and 320 px (8 texts)
h3 "นางสาว[ตัวอย่าง] ณัฐวุฒิ บุญมา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เจ้าพนักงานสาธารณสุขชำนาญงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (11 texts)
h3 "นาง[ตัวอย่าง] วีระพงษ์ บุญมา #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "นักวิชาการสาธารณสุขปฏิบัติการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (11 texts)
h3 "นาย[ตัวอย่าง] อรุณี บุญมา #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "กลุ่มงานคุ้มครองผู้บริโภคและเภ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาง[ตัวอย่าง] ณัฐวุฒิ สายบัว #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นางสาว[ตัวอย่าง] ประเสริฐ สายบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาง[ตัวอย่าง] พรทิพย์ สายบัว #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาย[ตัวอย่าง] วีระพงษ์ สายบัว "  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาย[ตัวอย่าง] สุนันทา แก้วใส"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้ช่วยสาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h2 "กลุ่มงานบริหารทั่วไป"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นางสาว[ตัวอย่าง] จันทร์เพ็ญ แก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาง[ตัวอย่าง] ณัฐวุฒิ ศรีสุข"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "หัวหน้ากลุ่มงานบริหารทั่วไป"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาง[ตัวอย่าง] ประเสริฐ แก้วใส "  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาย[ตัวอย่าง] พรทิพย์ แก้วใส #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นางสาว[ตัวอย่าง] วีระพงษ์ แก้ว"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาย[ตัวอย่าง] อรุณี ศรีสุข"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h2 "กลุ่มงานพัฒนาระบบบริการสุขภาพป"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาง[ตัวอย่าง] จันทร์เพ็ญ ศรีสุ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นางสาว[ตัวอย่าง] พรทิพย์ ศรีสุ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาง[ตัวอย่าง] วีระพงษ์ ทองดี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "หัวหน้ากลุ่มงานส่งเสริมสุขภาพแ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาย[ตัวอย่าง] สุนันทา ศรีสุข #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นางสาว[ตัวอย่าง] อรุณี ศรีสุข "  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "กลุ่มงานส่งเสริมสุขภาพและป้องก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาย[ตัวอย่าง] จันทร์เพ็ญ ทองดี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาย[ตัวอย่าง] ณัฐวุฒิ ทองดี #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาง[ตัวอย่าง] ประเสริฐ บุญมา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นางสาว[ตัวอย่าง] สุนันทา ทองดี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาง[ตัวอย่าง] อรุณี ทองดี #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "ไม่ระบุหน่วยงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาย[ตัวอย่าง] ประเสริฐ บุญมา #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นางสาว[ตัวอย่าง] วีระพงษ์ ทองด"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "นาง[ตัวอย่าง] สุนันทา แก้วใส #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`about-no-page`: `/about` without its Basic Page:

```text
a "หน้าแรก"  10.27:1 at 320 px
span "เกี่ยวกับเรา"  8.96:1 at 320 px
h1 "เกี่ยวกับเรา"  8.36:1 at 320 px
h2 "โครงสร้างองค์กร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "ผู้บริหาร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "บุคลากร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "นโยบาย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "แผนงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "ผลการดำเนินงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

`page-no-summary`: a Basic Page without a summary:

```text
a "หน้าแรก"  10.14:1 at 320 px
span "[ตัวอย่าง] แนวทางการให้บริการป"  5.13:1 at 320 px
h1 "[ตัวอย่าง] แนวทางการให้บริการป"  5.71:1 at 375 px
h2 "หลักการ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "สำนักงานสาธารณสุขอำเภอสองเผยแพ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
```

`page-title-only`: a Basic Page with its title alone:

```text
a "หน้าแรก"  10.14:1 at 375 and 320 px
span "[ตัวอย่าง] หน้าที่มีเพียงชื่อเ"  6.99:1 at 320 px
h1 "[ตัวอย่าง] หน้าที่มีเพียงชื่อเ"  5.86:1 at 320 px
```

`page-related`: a Basic Page with two related Documents, one superseded:

```text
a "หน้าแรก"  10.42:1 at 320 px
span "[ตัวอย่าง] แผนงานประจำปีของสำน"  5.27:1 at 320 px
h1 "[ตัวอย่าง] แผนงานประจำปีของสำน"  6.02:1 at 320 px
p "สรุปแผนงานประจำปีและเอกสารที่เ"  6.45:1 at 375 and 320 px
h2 "หลักการ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "สำนักงานสาธารณสุขอำเภอสองเผยแพ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารเผยแพร่"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารที่เกี่ยวข้อง"  15.47:1 at 375 and 320 px
span "PDF"  5.60:1 at 375 and 320 px (2 texts)
span "แผนงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024 and 768 px
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ถูกแทนที่แล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
```

`contact-empty`: Office Contact with nothing set:

```text
a "หน้าแรก"  10.55:1 at 375 and 320 px
span "ติดต่อเรา"  9.46:1 at 320 px
p "ติดต่อ"  8.71:1 at 320 px
h1 "ติดต่อเรา"  7.81:1 at 320 px
p "ที่อยู่ เวลาทำการ และช่องทางติ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h2 "ร้องเรียนและเสนอแนะ"  16.06:1 at 1440, 1024, 768, 375 and 320 px
p "ขั้นตอนและช่องทางการร้องเรียน "  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ดูบริการประชาชน"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "ติดต่อหน่วยบริการสุขภาพ"  15.93:1 at 1440, 1024, 768, 375 and 320 px
a "ดูหน่วยบริการสุขภาพที่เกี่ยวข้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`contact-no-channels`: every detail and no channel:

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
span "ติดต่อเรา"  9.73:1 at 375 and 320 px
p "ติดต่อ"  8.96:1 at 320 px
h1 "ติดต่อเรา"  8.14:1 at 375 and 320 px
p "ที่อยู่ เวลาทำการ และช่องทางติ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
dt "ที่ตั้ง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "[ตัวอย่าง] # หมู่ # ตำบลบ้านก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
a "เปิดแผนที่ (เปิดในแท็บใหม่)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "โทรศัพท์"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "# # #"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "อีเมล"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "contact@example.invalid"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "เวลาทำการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "จันทร์–ศุกร์ #:#–#:# น. เว"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "ร้องเรียนและเสนอแนะ"  16.06:1 at 1440, 1024, 768, 375 and 320 px
p "ขั้นตอนและช่องทางการร้องเรียน "  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "ดูบริการประชาชน"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "ติดต่อหน่วยบริการสุขภาพ"  15.93:1 at 1440, 1024, 768, 375 and 320 px
a "ดูหน่วยบริการสุขภาพที่เกี่ยวข้"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

### The Homepage's shared pieces

The Leadership strip (`section[aria-labelledby="home-leadership"]`, the demo dataset's two leaders):

```text
p "บุคลากร"  6.40:1 at 1440 and 1024 px
h2 "ผู้บริหาร"  16.40:1 at 768 px
span "ทั้งหมด"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] สมชาย ใจดี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] วิภาวดี แสงทอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้ช่วยสาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

Quick Access (`section[aria-labelledby="home-quick-access"]`, `homepage-quick-access.ts`' three shortcuts):

```text
p "เข้าถึงข้อมูล"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "ข้อมูลและเอกสารสำคัญ"  15.47:1 at 375 and 320 px
span "เอกสารเผยแพร่"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ข้อมูลสุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ข่าวสุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

### Focus rings

`scripts/measure-focus-contrast.ts` at `7077100`, at the five widths, with the selectors #366 and
#371 read, between 15:13Z and 15:14Z, every run exit 0:

- **The About Document pages** (`"main article a >> nth=0"` and `nth=1`, the first row's title and
  its download, on `/about/policies`, `/about/plans` and `/about/results`): both rings lie on the
  row's white, under them 6.45:1 (the title on `/about/results` 5.04:1 at 1,440, 1,024 and 768 px),
  0 % of pixels under 3:1 under or beside them at any width; beside the results title's ring a few
  blended pixels read 1.44:1 at 1,440, 1,024 and 768 px, as #366 recorded (§7.8).
- **`/about`'s tiles** (`main a[href='/about/organization']`, `…/leadership`, `…/policies`): beside
  each ring, with focus, 0 % of pixels under 3:1 at all five widths, the lowest blended pixel 2.80:1
  at 375 px; under the rings of "โครงสร้างองค์กร" and "ผู้บริหาร", which cross the field's edge, up to
  61 % read under 3:1, and the white band beside them carries the ring, as #371 recorded (§9.9).

Leadership's cards and Personnel's rows hold no link or control, and no ring on `/contact` meets
the field (the note from #369), so the round read no ring there.

## Spec #365's decisions and the decisions made while the tickets were built

Spec #365 lists thirteen decisions and four prototype picks the Product Owner made before it
(#365 comment 7000119315, each answered "ตามที่แนะนำ" or the recommended option);
`docs/design/DESIGN.md` §10 lists them. Every decision made while the tickets were built has a
recorded answer on its ticket, and §10 and §13 cite each one that decides what a page shows:

| Ticket | Decision | Answer |
| --- | --- | --- |
| #366 | An About Document row's facts line opening with the Document Type; its title clamped at two lines on a phone; the type's empty state without a link onward or a year filter | Each kept, "ตามที่แนะนำ" (comment 7003590828) |
| #367 | A leader's name and position wrapping at a word boundary; the featured leader's picture loading lazily; the second of two leaders alone in its row | (a) keep on all three, "ตามที่แนะนำ" (comment 7006867147) |
| #370 | A long unit name beside its 40 px tile below 640 px, three lines at 320 px | "Keep as built (Recommended)"; §10 names it among the kept limits (comment 7010716854) |
| #368 | A body that opens with a heading; a summary with an unbroken run of characters; the gate's taste notes | 1 A, kept and #380 opened; 2 A, `wrap-anywhere` on `PostHeader`'s summary on every Post page; 3 A, kept (comment 7028435491) |
| #371 | The Quick Access tile under forced colours | C1 A, kept, tracked in #383 (comment 7031308188) |
| #369 | The route buttons' weight and arrow; a telephone number that is not one number | 1 A, semibold with the 16 px `arrow-right`; 2 A, H3 size and semibold in `text-primary` (comment 7034812318) |
| #369 | The route cards and the filled pill under forced colours; the gate's design suggestions | C1 A, joined to #383; C2 A, kept (comment 7037025716) |

Still open:

- **#380**, a rich-text body that opens with a heading starts lower under the field, outside
  Feature 012.
- **#383**, the Quick Access tile's, `/contact`'s route cards' and the filled pill's outlines under
  forced colours, outside Feature 012.
- **#277**, the redesigned pages on a real phone and in browsers other than Chromium, inside
  #238's UAT window: Feature 012's pages join that visit.

## The tickets' frontend gates

Each ticket's gate (CLAUDE.md "Frontend Design & Quality") is self-review, recorded in its pull
request; this round ran none again, as #372 changes no page:

- #366 (PR #373): critique 24/32, audit 18/20, the guidelines with no finding in scope; the
  detector's `low-contrast` on the file tile's "PDF" and `radial-halo`, both settled in
  `.impeccable/critique/ignore.md`; Playwright MCP with no sideways scroll at 320 px and each ring
  whole.
- #367 (PR #375): critique 20/28, audit 17/20, the guidelines with no finding in scope; the
  detector's `radial-halo` only; Playwright MCP: no stop inside a card, the strip's rings as before.
- #370 (PR #377): critique 20/28, audit 18/20, `impeccable detect` `[]` on the source, the
  guidelines with no defect; Playwright MCP with no sideways scroll from 320 to 1,440 px and no stop
  inside a panel.
- #368 (PR #381): critique 28/36, audit 19/20, the guidelines with no defect; `detect` 0 on the
  source; the overlay did not run.
- #371 (PR #384): critique 26/32, audit 18/20, the guidelines with no change; `detect` 0 on the
  source; forced colours to the Product Owner (#383); the overlay did not run.
- #369 (PR #387): critique 28/36, audit 18/20, the guidelines with no change; `detect` 0 on the
  source, its 320 px `cramped-padding` fixed and `icon-tile-stack` settled in `ignore.md`; the
  overlay did not run.

## Walkthrough

After the 404 log was cleared (15:18Z), the Product Owner was given these steps in the session,
each with its full address, with the list under "What the evidence does not cover" in the same
question:

1. `/about`: the header on the field, the six tiles over its edge, the body and the related
   Documents;
2. `/about/organization` and `/pages/privacy`: a Basic Page's header;
3. `/about/leadership`: the featured first leader and the other cards;
4. `/about/personnel`: a white panel per unit;
5. `/about/policies`, `/about/plans` and `/about/results`: the rows, their downloads and
   "ถูกแทนที่แล้ว" on `/about/plans`;
6. `/contact`: the details card, the channels' pills and the two route cards;
7. `/`: the Leadership strip, unchanged;
8. steps 1 to 7 at 375 px in the browser's device mode;
9. the before and after screenshots on `evidence/012-372-screenshots`.

The Product Owner chose all three groups (steps 1 to 7, step 8, step 9) as opened, answered "ผ่าน
ไม่มีอะไรต้องแก้ (Recommended)" and accepted every coverage gap below, "A รับตามรายการ
(Recommended)" (#372 comment 7043481056).

**What the app's log shows of the walkthrough** (`scripts/dev-runtime-opened.ts` from 15:19:03Z
with `--expect` and the ten addresses the steps gave, read at 15:30Z): 11 page requests between
15:28:22Z and 15:29:44Z, every one 200, the nine addresses other than the Homepage once each and a
Document's page (`/documents/demo-document-result-2569`) twice, and the Homepage beyond the health
check from 15:29:38Z to 15:29:54Z; "0 of 10
addresses not shown as opened". The log holds no query string or window width, so it shows no
second visit for step 8; that step rests on the Product Owner's answer. After the answers residue
reported RESIDUE: NONE with 0 unmarked misses and the 56 demo entries published, and verify
VERIFY: PASS at `7077100` (15:30Z).

## What the evidence does not cover

Written before the walkthrough was asked for, and listed whole in its question; the Product Owner
accepted it (#372 comment 7043481056, item 3):

- Browsers other than Chromium, and a real phone or touch: every suite, capture and measure ran in
  Playwright's Chromium, and the runtime answers on `127.0.0.1` only, so the phone steps are the
  browser's device mode. #277 visits the redesigned pages inside #238's UAT window.
- Real content: the runtime holds the demo dataset, six Personnel in three units (two Leadership),
  two policies, two plans, one result, four Basic Pages and a full Office Contact (spec #365
  "Testing Decisions"). Six leaders, 22 staff in five units, three without a unit, a full page of
  plans and a second page, a Basic Page without a summary, with its title alone or with related
  Documents, `/about` without its Basic Page, and Office Contact with nothing set or without a
  channel are seen only through the synthetic fixtures of
  `scripts/screenshot-fixtures/about-contact-cases.ts`.
- A real portrait's crop: the demo dataset's pictures and the fixtures' are colour fields without a
  face (spec #365 "Further Notes"), so the ringed circle's crop of a face is not seen.
- The empty states of an About Document type without a Document, Leadership and Personnel: the
  suites read them over the field's edge with their words, axe and reflow (`public-about.spec.ts`,
  `public-personnel.spec.ts`), but no capture or contrast run of this round shows them; the round
  reads only a page past the last (`/about/policies?page=2`).
- The Homepage's Quick Access before Feature 012: the demo dataset's Quick Access menu is empty, so
  no before image shows the tile; the round's close-up of it is after only, with
  `homepage-quick-access.ts`' three shortcuts. `public-homepage.spec.ts`' Quick Access tests read
  it at the head. The Homepage's other before images are #346's at `9f31dc0` (Feature 011's head;
  no `src` change from it to `00ab334`).
- The before screenshots as a control of this round: they are #366's at `00ab334` on `main`, taken
  before the feature's first promotion (the note from #366). The demo dataset did not change
  between `00ab334` and `7077100` (`git log 00ab334..7077100 -- scripts/demo-dataset
  scripts/demo-dataset.ts` is empty).
- The 404 of an unpublished `organization`: unchanged in code (`src/pages/about/organization.astro`,
  `Astro.rewrite("/404")`), and no suite reads it, since the suite borrows the runtime's own
  published page (the note from #368).
- `/about` with a body alone, or with related Documents alone: the slug `about` is reserved and
  unique, and the runtime holds the demo dataset's own page, so neither can be staged on `/about`;
  `BasicPageText` is read in those states on `/pages/{slug}` (the note from #371).
- A summary with an unbroken run of characters on a Post page or a Basic Page: the demo dataset
  holds none, so no screenshot shows `PostHeader`'s `wrap-anywhere`; `public-about.spec.ts` reads
  such a summary inside the window at 375 and 320 px on a fixture (the note from #368; #368 comment
  7028435491, item 2).
- Focus rings on `/contact`: no ring there meets the field, so `scripts/measure-focus-contrast.ts`
  was not run on it; the suite reads `unbanded: []`, and the telephone link's ring lies on the
  card's white (the note from #369). Leadership's cards and Personnel's rows hold no link, so no
  ring of theirs meets the field (§7.8).
- Forced colours (Windows High Contrast): the Quick Access tile, `/contact`'s route cards and its
  filled pill lose their outlines, kept for #383 (the notes from #371 and #369); no run of this
  round emulates forced colours.
- A rich-text body that opens with a heading starts 64 / 72 px under the field on a Basic Page and
  80 px under the tiles on `/about`, kept for #380 (the notes from #368 and #371).
- Motion on the built, minified pages: the runtime serves the stylesheet unminified, and the suites
  read it there. `npm run build:check` reads the built stylesheets; the look of a built page with
  motion allowed is due with the feature's first production image
  (`scripts/production-image-check.sh`, #276).
- Keyboard passes by hand: each ticket's frontend gate tabbed through its own pages at its own
  head; this round runs the suites' axe and focus checks (`expectVisibleFocusOnEveryStop`, desktop
  and mobile) and no pass by hand.
- Reduced motion in the walkthrough, and print: the suites prefer reduced motion on every page but
  the tests of motion (`DESIGN.md` §8.12), and no run of the round prints a page.
- The Admin: the feature changes no model, field or Admin screen, so the walkthrough has no Admin
  step; a Basic Page's signed preview link and `noindex` are read by `public-about.spec.ts` alone.

## What was kept as it is

Each on the Product Owner's answer, with no follow-up issue:

- An About Document row's facts line opening with the Document Type, its title clamped at two
  lines on a phone, and the type's empty state without a link onward (#366 comment 7003590828).
- A leader's or a person's name and position wrapping at a word boundary, the featured leader's
  picture loading lazily, and the second of two leaders alone in its row (#367 comment 7006867147).
- A long unit name in three lines at 320 px (#370 comment 7010716854; `DESIGN.md` §10).
- The related Documents' H2 larger than a Basic Page's body headings, two related Documents alike
  at 320 px under the row's two-line clamp, and the H1 without balanced wrapping (#368 comment
  7028435491, item 3).
- `/contact`'s gate's design suggestions (#369 comment 7037025716, C2), and "ดูหน่วยบริการสุขภาพที่เกี่ยวข้อง"
  wrapping to two lines in its card at 320 and 640 px, centred 8 px inside its pill as the picked
  prototype P4 A wraps it (the note from #369; `DESIGN.md` §9.10).

## The prototype

The prototype is on the branch `prototype/about-contact-pages` at `e666f30` (the picks recorded over
`d69caed`), outside `main`: its builder scripts and its record, `docs/prototypes/about-contact-pages.md`.
Its pages, screenshots and sheets stay on the development host. Spec #365 "How this differs from
the prototype" names three differences the spec decided (Personnel's "ช่องทางติดต่อ" line,
`/contact`'s rows with icons new to the site, and the six tiles' labels read from the demo
dataset); the built pages keep each. Every further difference was decided on its ticket (the
decisions table above).

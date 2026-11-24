# #421 evidence: Feature 014 (the light row tile, and `/health`'s and `/about`'s cards) on the development runtime

Feature 014's evidence round (spec #417), run on 2026-11-24 (UTC 2026-11-23 to 2026-11-24) by
Claude Code at `96b84c4`, the head of `014-light-tile-cards`, and the Product Owner's walkthrough
of 2026-11-24. This is a self-run record, not an independent review, and not the Product Owner's
acceptance, which the Product Owner gives on #417.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`. It already served
  `96b84c4`, #420's retro merge (PR #427), when the round began: `dev-runtime-verify.sh` reported
  VERIFY: PASS at `96b84c474c3ec22a9382f1e6731975ec4240e4cb` at 23:24Z on 2026-11-23, and again at
  00:07Z after the suites. No window held it, and the round promoted nothing: #421's branch adds
  documents alone over `96b84c4`, so its head has `96b84c4`'s application code, and the
  walkthrough has no Admin step that would change data.
- **Code under test:** `96b84c4`. Node 26.13.0, npm 12.2.1.
- **Content:** the demo dataset, 56 entries, all published, and each capture's and each measure's
  own synthetic fixtures, which it removes.

## Checks

The local checks ran at `96b84c4` between 23:25Z and 23:27Z on 2026-11-23, the browser suites
between 23:27Z and 00:07Z, T021 and residue at 00:07Z on 2026-11-24, the captures between 00:07Z
and 00:09Z, and the measures between 00:10Z and 00:48Z. The pull request states the checks at its
head.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | exit 0: 0 errors, 0 warnings, 2 hints |
| Node seam | `npm run test:node` | 879 of 879 passed |
| Build | `npm run build:check` | exit 0; `check-built-styles: PASS (2 stylesheets, the reveal in 1)` |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | each exit 0; jscpd's baseline unchanged at 21 clones |
| Browser seam | `scripts/dev-runtime-env.sh npm run test:browser` | 812 passed, 14 skipped, in 39.1 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | source identity verified at `96b84c4`; 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 46 misses, all synthetic; 56 entries, 0 not published; 0 database connection errors in the last hour |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | cleared before the walkthrough (00:50Z), 46 entries, none without the synthetic marks |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator;
the coordinator ran those 14 at 00:07Z. No test of the full run failed. Another project's
browser tests were running on the host when the suite started (load average 14.55); #420's full
suite at `facf46e` took 32.6 minutes (#420's evidence log). The run's near-timeout report named two tests at 60 % or more of their time, both passed and neither of a
Feature 014 page's tiles or cards: `public-homepage.spec.ts`' case on the space each Homepage
section takes, 57.6 s of its 60 s, and `public-demo-dataset.spec.ts`' axe and focus case on the
dataset's list pages at the desktop width, 22.8 s of 30 s.

## Screenshots

After, at `96b84c4`, with reduced motion preferred, so the pages show at rest, by
`.tmp/421/capture-after.sh` on the development host, between 00:07Z and 00:09Z on 2026-11-24. It
reruns, as they are, the scripts that took the feature's before images: #418's
(`.tmp/418/capture.sh`) and #419's (`.tmp/419/capture.sh`, its fixture cases):

```text
node scripts/capture-screenshots.mjs <dir> <name>-<width>=<path>@<width>        # the demo dataset
LIST=<documents|health-reports|announcements> LIST_COUNT=<3|4|21> scripts/dev-runtime-env.sh \
  node scripts/capture-with-fixtures.ts scripts/screenshot-fixtures/lists-by-count.ts <dir>
CASE=<no-organization|pages> scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/about-contact-cases.ts <dir>
scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/homepage-announcements.ts <dir>
```

The round took 145 after images, 29 cases at each of the five widths:

- the 26 cases of the feature's before set, the 130 images on `evidence/014-418-screenshots` at
  `d73bee1`, taken at `9a29f44` on `main` before the feature's first promotion (the note from
  #418):
  - the demo dataset's fourteen addresses in spec #417's scope: `/`, `/documents`, a Document's
    page, `/about/plans`, `/about`, `/health`, `/health/reports`, a Health Report's page,
    `/ita/2570`, `/health-services`, a Service with related Documents and one with Health
    Services, an Announcement's page and `/announcements`;
  - with `lists-by-count.ts`: three Documents, the second expired and the third's file not
    served (`documents-list-3`, and their pages `document-expired` and `document-file-gone`), and
    four Health Reports, the second without a fiscal year, the third's Document unpublished and
    the fourth's file deleted (`health-reports-list-4`, and their pages
    `health-report-no-fiscal-year`, `health-report-document-unpublished` and
    `health-report-file-gone`);
  - with `about-contact-cases.ts`: `/about` without a published `organization` page
    (`about-no-organization`) and without its `about` page (`about-no-page`), and Basic Pages
    with related Documents, without a summary and with a title only;
- #419's three fixture cases, each with its own before images on `evidence/014-419-screenshots`
  at `48e0611`, taken at `be1c832`, where an Announcement's tile was still the gradient one (the
  note from #419): `/announcements` with 21 Announcements, a closed one alone on page 2
  (`announcements-list-21`, `announcements-list-21-page-2`), and the Homepage's Current
  Announcements with each status (`home-announcements`).

#420's set (`.tmp/420/capture.sh`: the Homepage, `/about`, `/health` and `about-no-organization`)
lies inside #418's. `scripts/evidence-branch.sh --before-from evidence/014-418-screenshots` put
the 290 images (145 before, 145 after) and their `captures.txt` on the image-only branch
`evidence/014-421-screenshots`, at `306bb4f5450ed6befbf97e968a3af77d15ecca42`; the list holds no
preview link. Page heights in pixels, the table that script printed from the PNGs (a page with 900
px at every width is shorter than the window):

| Page | | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `about` | before | 1,813 | 1,813 | 1,921 | 2,035 | 2,221 |
| | after | 1,925 | 1,933 | 2,089 | 2,305 | 2,491 |
| `about-no-organization` | before | 1,813 | 1,813 | 1,921 | 2,035 | 2,221 |
| | after | 1,925 | 1,933 | 2,089 | 2,305 | 2,491 |
| `about-no-page` | before | 900 | 900 | 900 | 900 | 945 |
| | after | 900 | 900 | 1,027 | 1,089 | 1,215 |
| `about-plans` | before | 900 | 900 | 1,037 | 1,051 | 1,177 |
| | after | 900 | 900 | 1,037 | 1,051 | 1,177 |
| `announcement` | before | 1,449 | 1,449 | 1,501 | 1,769 | 1,925 |
| | after | 1,449 | 1,449 | 1,501 | 1,769 | 1,925 |
| `announcements` | before | 1,297 | 1,297 | 1,361 | 1,355 | 1,607 |
| | after | 1,297 | 1,297 | 1,361 | 1,355 | 1,607 |
| `announcements-list-21` | before | 3,529 | 3,529 | 3,567 | 3,677 | 4,217 |
| | after | 3,529 | 3,529 | 3,567 | 3,677 | 4,217 |
| `announcements-list-21-page-2` | before | 900 | 900 | 900 | 905 | 1,085 |
| | after | 900 | 900 | 900 | 905 | 1,085 |
| `document` | before | 1,070 | 1,070 | 1,032 | 1,298 | 1,440 |
| | after | 1,070 | 1,070 | 1,032 | 1,298 | 1,440 |
| `document-expired` | before | 1,230 | 1,230 | 1,168 | 1,370 | 1,530 |
| | after | 1,230 | 1,230 | 1,168 | 1,370 | 1,530 |
| `document-file-gone` | before | 1,016 | 1,016 | 990 | 1,176 | 1,302 |
| | after | 1,016 | 1,016 | 990 | 1,176 | 1,302 |
| `documents` | before | 2,309 | 2,441 | 3,141 | 3,141 | 3,297 |
| | after | 2,309 | 2,441 | 3,141 | 3,141 | 3,297 |
| `documents-list-3` | before | 1,203 | 1,263 | 1,473 | 1,577 | 1,733 |
| | after | 1,203 | 1,263 | 1,473 | 1,577 | 1,733 |
| `health` | before | 900 | 900 | 900 | 900 | 900 |
| | after | 900 | 900 | 900 | 900 | 985 |
| `health-report` | before | 1,022 | 1,022 | 1,042 | 1,328 | 1,530 |
| | after | 1,022 | 1,022 | 1,042 | 1,328 | 1,530 |
| `health-report-document-unpublished` | before | 1,054 | 1,054 | 1,028 | 1,240 | 1,422 |
| | after | 1,054 | 1,054 | 1,028 | 1,240 | 1,422 |
| `health-report-file-gone` | before | 1,050 | 1,050 | 1,024 | 1,232 | 1,418 |
| | after | 1,050 | 1,050 | 1,024 | 1,232 | 1,418 |
| `health-report-no-fiscal-year` | before | 1,192 | 1,192 | 1,130 | 1,340 | 1,564 |
| | after | 1,192 | 1,192 | 1,130 | 1,340 | 1,564 |
| `health-reports` | before | 1,079 | 1,079 | 1,207 | 1,207 | 1,373 |
| | after | 1,079 | 1,079 | 1,207 | 1,207 | 1,373 |
| `health-reports-list-4` | before | 1,251 | 1,251 | 1,289 | 1,365 | 1,571 |
| | after | 1,251 | 1,251 | 1,289 | 1,365 | 1,571 |
| `health-services` | before | 1,393 | 1,393 | 1,715 | 2,021 | 2,221 |
| | after | 1,393 | 1,393 | 1,715 | 2,021 | 2,221 |
| `home` | before | 5,541 | 5,704 | 7,557 | 6,320 | 6,842 |
| | after | 5,541 | 5,704 | 7,557 | 6,320 | 6,842 |
| `home-announcements` | before | 5,567 | 5,678 | 7,557 | 6,344 | 6,866 |
| | after | 5,567 | 5,678 | 7,557 | 6,344 | 6,866 |
| `ita-2570` | before | 900 | 900 | 909 | 1,001 | 1,209 |
| | after | 900 | 900 | 909 | 1,001 | 1,209 |
| `page-no-summary` | before | 900 | 900 | 900 | 900 | 925 |
| | after | 900 | 900 | 900 | 900 | 925 |
| `page-related` | before | 1,305 | 1,305 | 1,317 | 1,403 | 1,529 |
| | after | 1,305 | 1,305 | 1,317 | 1,403 | 1,529 |
| `page-title-only` | before | 900 | 900 | 900 | 900 | 900 |
| | after | 900 | 900 | 900 | 900 | 900 |
| `service-documents` | before | 2,097 | 2,097 | 2,073 | 2,331 | 2,581 |
| | after | 2,097 | 2,097 | 2,073 | 2,331 | 2,581 |
| `service-health-services` | before | 1,415 | 1,415 | 1,601 | 1,871 | 2,043 |
| | after | 1,415 | 1,415 | 1,601 | 1,871 | 2,043 |

**Where only a tile changed, no page changed height:** every page of the table but `/about`'s and
`/health`'s is as high before as after at the five widths. `/about`, with or without its
`organization` page, is taller at every width; `/about` without its `about` page is taller at 768,
375 and 320 px and shorter than the window, 900 px, at 1,440 and 1,024 px before and after; and
`/health` is 85 px taller at 320 px alone, where its two cards stand one to a row. Spec #417
"Measured in the prototype" gave `/about` these heights at the five widths and `/health` 985 px at
320 px; its `/health` at 375 px, 800 px then 859 px, is the document's own height, under the 900 px
window that every capture takes at the least.

**Which pairs differ, and where** (the `pairs:` lines of `scripts/evidence-branch.sh`): 15 of the
145 pairs are identical, the three cases with no row tile or card in view
(`health-report-document-unpublished`, `page-no-summary`, `page-title-only`) at the five widths.
Every other pair but the cards' pages differs in the tiles' bands, 92 px high from 640 px and 68
px below it, one per tile in view; the fixture pages differ also in narrower bands, their synthetic
dates (next paragraph), and `document-file-gone` and `health-report-file-gone`, whose card holds no
file tile, in those alone. On the cards' pages the pairs read: `/about` and `about-no-organization`
"rows 0–403 the same" at 1,440 px, 0–60 at 1,024, 0–333 at 768, 0–335 at 375 and 0–353 at 320, each
then taller; `about-no-page` differs in rows 274–579 at 1,440 px and 274–587 at 1,024 px and is
taller below; `/health` differs in one band, rows 382–523 at 1,440 and 1,024 px, 376–521 at 768 and
338–533 at 375, and at 320 px is taller after "rows 0–355 the same". The Homepage's demo Announcements
kept their states between the before and the after images: `home` differs in its four tiles'
bands at 1,440, 1,024 and 768 px and in three at 375 and 320 px, at the same height.

**Against the tickets' own after images** (`.tmp/421/cmp-tickets.sh`, each after image against
the newest earlier ticket's of the same name, #420 retro): every demo dataset page is byte for byte
its ticket's after image at the five widths, the Homepage, `/about` and `/health` #420's,
`/announcements` #419's, and the rest #418's; so are `home-announcements` (#419's),
`about-no-organization` (#420's) and the fixture pages without a row whose date moves
(`health-report-document-unpublished`, `page-no-summary`, `page-title-only`, #418's). The other fixture pages differ from their tickets'
after images only in bands 10 to 26 px high, their synthetic dates: the fixtures date their
content from the day they run, and the round ran a day after #418 and #419 ("วันที่เอกสาร 19 พ.ย.
2569" then "20 พ.ย. 2569" on `document-file-gone`, "วันที่รายงาน 18 พ.ย. 2569" then "19 พ.ย. 2569" on
`health-report-file-gone`, "24 ต.ค. 2569" then "25 ต.ค. 2569" on `page-related`, at 1,440 px).
`about-no-page` differs from #418's after image by #420's cards, which #420 did not capture on it.

## Contrast

`scripts/measure-text-contrast.ts --all-text --fold <path> main` at `96b84c4`, at 1,440, 1,024, 768,
375 and 320 px, every run exit 0, by `.tmp/421/contrast.sh` between 00:10Z and 00:48Z on
2026-11-24. The script reruns, as they are, the three tickets' own scripts
(`.tmp/418/contrast.sh`, `.tmp/419/contrast.sh`, `.tmp/420/contrast.sh`), so every surface a
ticket read is read again, each output beside the ticket's of the same name: the eleven demo
addresses whose rows or cards hold the light tile and `/documents` with a file that cannot be
served (#418), the Homepage and `/announcements` on the demo dataset and with their fixtures
(#419), and `/health`, `/about` and `/about` without its `organization` page (#420). `/about` is
read by #418's script and by #420's, and their closing lines are the same (`diff`). Small text
needs 4.5:1 and large text 3:1 (WCAG 2.2 SC 1.4.3).

**The round's lowest readings** (`node scripts/contrast-compare.ts --lowest 12` over the twenty
text outputs), whole:

```text
not read: home-announcements.txt  span "สาธารณสุข"
not read: home-announcements.txt  span "อำเภอสอง"
not read: home.txt  span "สาธารณสุข"
not read: home.txt  span "อำเภอสอง"
3.07:1  home-announcements.txt  span "ด้านสุขภาพ"  at 768 px
3.07:1  home.txt  span "ด้านสุขภาพ"  at 768 px
3.22:1  home-announcements.txt  span "#"  at 1024 px (6 texts)
3.22:1  home.txt  span "#"  at 1024 px (6 texts)
4.69:1  announcements-21-page-1.txt  li "หน้า #"  at 1440, 1024, 768, 375 and 320 px
4.69:1  announcements-21-page-2.txt  li "หน้า #"  at 1440, 1024, 768, 375 and 320 px
4.74:1  home-announcements.txt  p "ข้อมูลที่อาจมีวันสิ้นสุดหรือกา"  at 768 px
4.74:1  home.txt  p "ข้อมูลที่อาจมีวันสิ้นสุดหรือกา"  at 768 px
4.85:1  about.txt  p "สำนักงานสาธารณสุขอำเภอสอง จังห"  at 1024 px
4.85:1  about-no-organization.txt  p "สำนักงานสาธารณสุขอำเภอสอง จังห"  at 1024 px
4.85:1  about.txt  p "สำนักงานสาธารณสุขอำเภอสอง จังห"  at 1024 px
4.97:1  about-plans.txt  span "แผนงาน"  at 1440, 1024, 768, 375 and 320 px (3 texts)
```

The first eight lines are the Homepage's hero and its Health Service Discovery band, outside the
feature and in large text: the hero's headline runs "สาธารณสุข" and "อำเภอสอง" the script cannot
read (spec #417 "Measured in the prototype" says the same), its "ด้านสุขภาพ" 3.07:1 at 768 px and
the band's counts 3.22:1 at 1,024 px, as the note from #419 gives them; large text needs 3:1.
Then the list's pager "หน้า n" 4.69:1 (§7.8) and the Current Announcements' lead over the band's
glow 4.74:1 at 768 px (§8.7), both recorded, and `/about`'s summary over its ring 4.85:1 at 1,024
px (§9.9). Every other text reads 4.97:1 or more.

**Each reading against its ticket's** (`node scripts/contrast-compare.ts <ticket's output> <round's
output>`, one run per file):

- #418's twelve outputs, read at `2d2b027`: every one of the ticket's folded lines is the same in
  the round, and every per-width reading at the same width and ratio but six, of two texts: on
  `documents-file-gone` the synthetic Document's date, "19 พ.ย. 2569" at 4.97:1, is not in the
  round at any of the five widths (164 of 169), which reads its next day's date (the fixtures date
  their content from the day they run); on a Service with Health Services "แจ้งปัญหาสุขภาพ" reads
  10.14:1 at 768 px for 10.13:1 (169 of 170). `/about`'s
  six lines new to the round are the cards' summaries #420 added.
- #419's five outputs, read at `404bffc`: `/announcements`' 20 folded lines and 170 readings the
  same; the 21 Announcements' 25 and 14 folded lines the same, their per-width readings moved by
  the fixtures' dates a day later (which day sits on a current tile and which on a closed one moved
  with them, the readings themselves 5.78:1 and 4.97:1 as before); the Homepage's folded lines 91
  of 92 the same, "พื้นที่" 6.53:1 at 1,440 px for 6.52:1, and among its per-width readings also
  "แจ้งเรื่องที่ไม่ได้รับความสะดว…" 5.20:1 at 768 px for 5.14:1, whose folded 5.07:1 is the same
  (553 of 555); with each status, 96 of 97 folded lines the same, "ของประชาชนในอำเภอสอง จังหวัดแพ…"
  7.01:1 at 768 px alone where the ticket also read 7.01:1 at 1,024 px, now 7.02:1 there (553 of
  554).
- #420's three outputs, read at `2b70970`: `/health`'s 9 and `/about`'s 35 folded lines the same,
  each reading at the same width and ratio; without the `organization` page 33 of 34 the same,
  the H1 on the field 5.86:1 at 320 px for 5.93:1, the reading §9.9 records for that H1 since #371.

So three of the tickets' folded lines differ, each by 0.07:1 at most, and five per-width
readings besides the fixtures' dates. All of them lie on four pages whose after images
are byte for byte their tickets' (a Service with Health Services, the Homepage with and without the
fixture, `/about` without its `organization` page; "Screenshots"), so they show the script's own
variance from one run to the next, not a change of the page; none is a row tile's or a card's on
`/health` or `/about`.

So every reading `DESIGN.md` records for Feature 014's tiles and cards is read the same at
`96b84c4`: the light tile's "PDF", "ไฟล์", "MOIT", a report's fiscal year and an Announcement's
month and year 10.94:1, a MOIT's number and a current Announcement's day 5.78:1, a closed
Announcement's lines 4.97:1 and its "ปิดแล้ว" 13.85:1, the cards' names 16.54:1 and their
summaries 5.07:1 at the lowest (768 px on `/health`, 1,024 px on `/about`).

Each run's closing lines follow whole: a text, its lowest reading over the five widths and the
widths that read it; a line ending "(N texts)" folds texts whose words differ only in their
numbers, written "#".

### The light row tile (#418's pages)

`/documents` (the demo dataset's Documents):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
span "เอกสารเผยแพร่"  9.33:1 at 320 px
p "เข้าถึงข้อมูล"  8.60:1 at 375 and 320 px
h1 "เอกสารเผยแพร่"  7.39:1 at 320 px
p "แบบฟอร์ม คู่มือ แผนงาน รายงาน "  6.27:1 at 375 px
label "ประเภทเอกสาร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
label "ประเด็นสุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
label "ปีงบประมาณ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
button "แสดงผล"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "PDF"  10.94:1 at 1440, 1024, 768, 375 and 320 px (11 texts)
span "แบบฟอร์ม"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (22 texts)
time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (11 texts)
a "[ตัวอย่าง] ใบสมัครอาสาสมัครสาธ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ใบสมัครสำหรับผู้สนใจเป็นอาสาสม"  4.97:1 at 1440, 1024 and 768 px
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px (11 texts)
span "รายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
a "[ตัวอย่าง] เอกสารรายงานสถานการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "จำนวนผู้ป่วย อัตราป่วย และการด"  4.97:1 at 1440, 1024 and 768 px
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (7 texts)
a "[ตัวอย่าง] แบบฟอร์มขอรับวัคซีน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "กรอกแบบฟอร์มแล้วยื่นที่โรงพยาบ"  4.97:1 at 1440, 1024 and 768 px
a "[ตัวอย่าง] เอกสารรายงานผลการดำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สรุปผลการดำเนินงานตามตัวชี้วัด"  4.97:1 at 1440, 1024 and 768 px (2 texts)
span "ผลการดำเนินงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] รายงานผลการดำเนินงา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "นโยบาย"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] นโยบายการบริหารงานส"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ทิศทางและนโยบายการดำเนินงานด้า"  4.97:1 at 1440, 1024 and 768 px
span "แผนงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024 and 768 px (2 texts)
a "[ตัวอย่าง] แบบคำร้องเรียนการปฏ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "แบบคำร้องสำหรับแจ้งเรื่องร้องเ"  4.97:1 at 1440, 1024 and 768 px
time "# ส.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] เอกสารรายงานความครอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ความครอบคลุมการได้รับวัคซีนพื้"  4.97:1 at 1440, 1024 and 768 px
time "# ก.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] นโยบายคุ้มครองข้อมู"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "หลักการเก็บรวบรวม ใช้ และเปิดเ"  4.97:1 at 1440, 1024 and 768 px
span "ถูกแทนที่แล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
```

`/documents` with three synthetic Documents, the third without a served file (`lists-by-count.ts`, `LIST=documents LIST_COUNT=3`):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
span "เอกสารเผยแพร่"  9.33:1 at 320 px
p "เข้าถึงข้อมูล"  8.60:1 at 375 and 320 px
h1 "เอกสารเผยแพร่"  7.39:1 at 320 px
p "แบบฟอร์ม คู่มือ แผนงาน รายงาน "  6.27:1 at 375 px
label "ประเภทเอกสาร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
label "ประเด็นสุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
label "ปีงบประมาณ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
button "แสดงผล"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "PDF"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "แบบฟอร์ม"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (5 texts)
time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] แบบฟอร์มขอรับบริการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารเผยแพร่ของสำนักงานสาธารณ"  4.97:1 at 1440, 1024 and 768 px (3 texts)
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "รายงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "หมดอายุแล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] สำนักงานสาธารณสุขอำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ไฟล์"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "คู่มือ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] คู่มือการดูแลผู้สูง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ไฟล์ไม่พร้อมให้บริการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

a Document's page (`/documents/demo-document-plan-2570`):

```text
a "หน้าแรก"  10.85:1 at 375 and 320 px
a "เอกสารเผยแพร่"  9.60:1 at 320 px
span "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  5.48:1 at 375 px
span "แผนงาน"  9.73:1 at 320 px
h1 "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  6.45:1 at 768 px
p "แผนงานและโครงการด้านสุขภาพของเ"  6.45:1 at 1024, 768, 375 and 320 px
span "PDF"  10.94:1 at 1440, 1024, 768, 375 and 320 px
h2 "ไฟล์เอกสาร"  12.21:1 at 1440, 1024, 768, 375 and 320 px
p "PDF, # KB"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ดาวน์โหลดเอกสาร (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
dt "ประเภทเอกสาร"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "แผนงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "วันที่เอกสาร"  4.97:1 at 1440, 1024, 768, 375 and 320 px
time "# ต.ค. #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "ปีงบประมาณ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "#"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "เจ้าของ/แหล่งที่มา"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "สำนักงานสาธารณสุขอำเภอสอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สถานะเอกสาร"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ฉบับปัจจุบัน"  10.94:1 at 1440, 1024, 768, 375 and 320 px
```

`/about/plans`, an About Document page:

```text
a "หน้าแรก"  10.55:1 at 320 px
a "เกี่ยวกับเรา"  9.34:1 at 320 px
span "แผนงาน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
p "เกี่ยวกับเรา"  8.48:1 at 320 px
h1 "แผนงาน"  7.92:1 at 320 px
p "เอกสารแผนงานของสำนักงานสาธารณส"  6.45:1 at 375 px
span "PDF"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024 and 768 px (2 texts)
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ถูกแทนที่แล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
```

`/health/reports`:

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
a "ข้อมูลสุขภาพ"  9.46:1 at 320 px
span "รายงานสุขภาพ"  6.79:1 at 320 px
p "สุขภาพ"  8.84:1 at 320 px
h1 "รายงานสุขภาพ"  7.49:1 at 320 px
p "รายงานด้านสุขภาพของสำนักงานสาธ"  6.45:1 at 768, 375 and 320 px
span "#"  10.94:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
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

a Health Report's page (`/health/reports/demo-report-dengue-q4`):

```text
a "หน้าแรก"  10.85:1 at 375 and 320 px
a "ข้อมูลสุขภาพ"  9.73:1 at 375 and 320 px
a "รายงานสุขภาพ"  6.98:1 at 320 px
span "[ตัวอย่าง] รายงานสถานการณ์โรคไ"  5.41:1 at 375 px
span "วันที่รายงาน # พ.ย. #"  7.75:1 at 1440, 1024, 768, 375 and 320 px
span "รายงานสถานการณ์โรค"  6.70:1 at 375 px
h1 "[ตัวอย่าง] รายงานสถานการณ์โรคไ"  6.45:1 at 1024, 768 and 320 px
p "จำนวนผู้ป่วย อัตราป่วย และการด"  6.45:1 at 768, 375 and 320 px
span "PDF"  10.94:1 at 1440, 1024, 768, 375 and 320 px
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

`/ita/2570`:

```text
a "หน้าแรก"  10.70:1 at 320 px
a "ITA"  10.13:1 at 320 px
span "ปีงบประมาณ #"  8.60:1 at 320 px
p "ITA"  9.22:1 at 320 px
h1 "ITA ปีงบประมาณ พ.ศ. #"  6.62:1 at 375 px
p "ตัวชี้วัด MOIT # รายการของปีงบ"  6.45:1 at 768, 375 and 320 px
span "MOIT"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "#"  5.78:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
a "MOIT # [ตัวอย่าง] หน่วยงานมีกา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
p "หลักฐาน # รายการ · ปรับปรุงล่า"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "หลักฐาน # รายการ · ปรับปรุงล่"  4.97:1 at 1440, 1024, 768, 375 and 320 px
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

a Service with related Documents (`/services/demo-service-complaint`):

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
span "PDF"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "แบบฟอร์ม"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] แบบคำร้องเรียนการปฏ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "แบบคำร้องสำหรับแจ้งเรื่องร้องเ"  4.97:1 at 1440, 1024 and 768 px
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

a Service with Health Services (`/services/demo-service-flu-vaccine`):

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

an Announcement's page with related Documents (`/announcements/demo-announcement-vhv-recruitment`):

```text
a "หน้าแรก"  10.56:1 at 320 px
a "ข่าวสาร"  9.60:1 at 320 px
a "ประกาศ"  8.84:1 at 320 px
span "[ตัวอย่าง] รับสมัครอาสาสมัครสา"  5.27:1 at 375 px
span "เผยแพร่ # พ.ย. #"  7.75:1 at 1440, 1024, 768, 375 and 320 px
span "รับสมัคร"  7.60:1 at 320 px
h1 "[ตัวอย่าง] รับสมัครอาสาสมัครสา"  6.45:1 at 1024, 375 and 320 px
dt "ประเภทประกาศ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dd "รับสมัคร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "วันที่ประกาศ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
dt "วันที่เริ่มต้น"  4.97:1 at 1440, 1024, 768, 375 and 320 px
dt "วันที่สิ้นสุด"  4.97:1 at 1440, 1024, 768, 375 and 320 px
time "# ธ.ค. #"  16.54:1 at 1440, 1024, 768, 375 and 320 px
dt "สถานะ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "เปิดอยู่"  6.45:1 at 1440, 1024, 768, 375 and 320 px
p "สำนักงานสาธารณสุขอำเภอสองรับสม"  13.59:1 at 768 px
h2 "คุณสมบัติผู้สมัคร"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "อายุ # ปีขึ้นไป มีภูมิลำเนาใน"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "วิธีสมัคร"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ยื่นใบสมัครพร้อมสำเนาบัตรประจำ"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารเผยแพร่"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารที่เกี่ยวข้อง"  15.47:1 at 375 and 320 px
span "PDF"  10.94:1 at 1440, 1024, 768, 375 and 320 px
span "แบบฟอร์ม"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
span "ปีงบประมาณ #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "[ตัวอย่าง] ใบสมัครอาสาสมัครสาธ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ใบสมัครสำหรับผู้สนใจเป็นอาสาสม"  4.97:1 at 1440, 1024 and 768 px
span "ดาวน์โหลด (PDF, # KB)"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

`/about` follows with #420's pages.

### The date tile and the closed tile (#419's pages)

`/announcements` (the demo dataset: its one closed Announcement on page 1):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
a "ข่าวสาร"  9.73:1 at 320 px
span "ประกาศ"  8.97:1 at 320 px
p "แจ้งให้ทราบ"  8.60:1 at 375 and 320 px
h1 "ประกาศ"  8.26:1 at 320 px
p "ประกาศของสำนักงานสาธารณสุขอำเภ"  6.36:1 at 375 px
span "#"  4.97:1 at 1440, 1024, 768, 375 and 320 px (5 texts)
span "พ.ย. #"  10.94:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "รับสมัคร"  5.78:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
h2 "[ตัวอย่าง] เปิดรับสมัครผู้เข้า"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "เปิดอยู่"  6.45:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "วันที่สิ้นสุด # ธ.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "ประชาสัมพันธ์"  5.78:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h2 "[ตัวอย่าง] งดให้บริการคลินิกทั"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] รับสมัครอาสาสมัครสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] เชิญชวนผู้สูงอายุแล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "มิ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] รับสมัครผู้เข้าร่วม"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ปิดแล้ว"  13.85:1 at 1440, 1024, 768, 375 and 320 px
span "วันที่สิ้นสุด # ก.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
```

`/announcements` with 21 synthetic Announcements, four of them closed (`lists-by-count.ts`, `LIST=announcements LIST_COUNT=21`):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
a "ข่าวสาร"  9.73:1 at 320 px
span "ประกาศ"  8.97:1 at 320 px
p "แจ้งให้ทราบ"  8.60:1 at 375 and 320 px
h1 "ประกาศ"  8.26:1 at 320 px
p "ประกาศของสำนักงานสาธารณสุขอำเภ"  6.36:1 at 375 px
span "#"  4.97:1 at 1440, 1024, 768, 375 and 320 px (20 texts)
span "พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (20 texts)
span "จัดซื้อจัดจ้าง"  7.43:1 at 1440, 1024, 768, 375 and 320 px (6 texts)
h2 "[ตัวอย่าง] ประกวดราคาจัดซื้อวั"  16.54:1 at 1440, 1024, 768, 375 and 320 px (6 texts)
span "เปิดอยู่"  6.45:1 at 1440, 1024, 768, 375 and 320 px (10 texts)
span "วันที่สิ้นสุด # ธ.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (10 texts)
span "รับสมัครงาน"  7.75:1 at 1440, 1024, 768, 375 and 320 px (7 texts)
h2 "[ตัวอย่าง] สำนักงานสาธารณสุขอำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ประกาศทั่วไป"  5.78:1 at 1440, 1024, 768, 375 and 320 px (7 texts)
h2 "[ตัวอย่าง] แจ้งปิดปรับปรุงห้อง"  16.54:1 at 1440, 1024, 768, 375 and 320 px (5 texts)
h2 "[ตัวอย่าง] รับสมัครอาสาสมัครสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "ยังไม่เปิด"  7.75:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "วันที่เริ่มต้น # ธ.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "วันที่สิ้นสุด # ม.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
h2 "[ตัวอย่าง] เชิญชวนเข้าร่วมโครง"  16.54:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "ปิดแล้ว"  13.85:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "วันที่สิ้นสุด # พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
li "หน้า #"  4.69:1 at 1440, 1024, 768, 375 and 320 px
a "หน้าถัดไป"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

its second page, a closed Announcement alone (`/announcements?page=2`):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
a "ข่าวสาร"  9.73:1 at 320 px
span "ประกาศ"  8.97:1 at 320 px
p "แจ้งให้ทราบ"  8.60:1 at 375 and 320 px
h1 "ประกาศ"  8.26:1 at 320 px
p "ประกาศของสำนักงานสาธารณสุขอำเภ"  6.36:1 at 375 px
span "#"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "จัดซื้อจัดจ้าง"  7.43:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] เชิญชวนเข้าร่วมโครง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ปิดแล้ว"  13.85:1 at 1440, 1024, 768, 375 and 320 px
span "วันที่สิ้นสุด # พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
a "หน้าก่อนหน้า"  6.45:1 at 1440, 1024, 768, 375 and 320 px
li "หน้า #"  4.69:1 at 1440, 1024, 768, 375 and 320 px
```

`/` (the demo dataset):

```text
p "เว็บไซต์ทางการ · กระทรวงสาธารณ"  5.98:1 at 320 px
span "สาธารณสุข"  not read at any width
span "อำเภอสอง"  not read at any width
span "ศูนย์กลางข้อมูล บริการ"  7.90:1 at 320 px
span "และการประสานงานด้านสุขภาพ"  7.58:1 at 375 px
span "ด้านสุขภาพ"  3.07:1 at 768 px
span "ของประชาชนในอำเภอสอง จังหวัดแพ"  7.01:1 at 1024 and 768 px
p "เรื่องเด่น · # พ.ย. #"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] ชวนประชาชนอายุ # ป"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "บริการ"  7.38:1 at 768 px
h2 "บริการประชาชน"  7.19:1 at 375 and 320 px
span "ทั้งหมด"  5.81:1 at 768 px (6 texts)
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
p "บุคลากร"  6.40:1 at 1440 and 1024 px
h2 "ผู้บริหาร"  16.40:1 at 768 px
h3 "[ตัวอย่าง] สมชาย ใจดี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] วิภาวดี แสงทอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้ช่วยสาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "ข่าวสาร"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "ข่าวประชาสัมพันธ์"  15.47:1 at 375 and 320 px
time "# พ.ย. #"  6.45:1 at 1440, 1024, 768, 375 and 320 px (6 texts)
h3 "[ตัวอย่าง] มหกรรมสุขภาพอำเภอสอ"  7.54:1 at 1440 and 1024 px (2 texts)
h3 "[ตัวอย่าง] อสม. อำเภอสองสำรวจล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] คณะกรรมการ พชอ. สอง"  8.85:1 at 375 and 320 px (2 texts)
time "# ต.ค. #"  6.45:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
h3 "[ตัวอย่าง] เริ่มให้บริการวัคซี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] มอบเกียรติบัตรหมู่บ"  16.54:1 at 1440, 1024 and 768 px
p "แจ้งให้ทราบ"  5.86:1 at 1440 px
h2 "ประกาศ"  14.82:1 at 1440 px
p "ข้อมูลที่อาจมีวันสิ้นสุดหรือกา"  4.74:1 at 768 px
span "#"  3.22:1 at 1024 px (6 texts)
span "พ.ย. #"  10.94:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "รับสมัคร"  5.78:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h3 "[ตัวอย่าง] เปิดรับสมัครผู้เข้า"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "เปิดอยู่"  6.45:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "วันที่สิ้นสุด # ธ.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
span "ประชาสัมพันธ์"  5.78:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
h3 "[ตัวอย่าง] งดให้บริการคลินิกทั"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] รับสมัครอาสาสมัครสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] เชิญชวนผู้สูงอายุแล"  16.54:1 at 1440, 1024 and 768 px
p "สุขภาพ"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "ความรู้สุขภาพ"  15.47:1 at 375 and 320 px
a "ไข้เลือดออก"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "บุหรี่และเครื่องดื่มแอลกอฮอล์"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "ผู้สูงอายุ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "โรคไม่ติดต่อเรื้อรัง"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "วัคซีนและการสร้างเสริมภูมิคุ้ม"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "ไข้เลือดออก"  7.75:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] # เก็บ ป้องกัน # โร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เก็บบ้าน เก็บขยะ เก็บน้ำ ตัดวง"  4.97:1 at 1440, 1024 and 768 px
p "อ่านต่อ"  6.45:1 at 1440, 1024 and 768 px (4 texts)
span "โรคไม่ติดต่อเรื้อรัง"  7.75:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] กินอย่างไรให้ห่างไก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ลดหวาน มัน เค็ม เพิ่มผักผลไม้ "  4.97:1 at 1440, 1024 and 768 px
span "วัคซีนและการสร้างเสริมภูมิคุ้ม"  7.75:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] วัคซีนไข้หวัดใหญ่ ใ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้สูงอายุ ผู้มีโรคเรื้อรัง แล"  4.97:1 at 1440, 1024 and 768 px
span "ผู้สูงอายุ"  7.75:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] ป้องกันการหกล้มในผู"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "จัดบ้านให้ปลอดภัย เพิ่มแสงสว่า"  4.97:1 at 1440, 1024 and 768 px
p "หน่วยบริการ"  7.00:1 at 1440 px
h2 "หน่วยบริการสุขภาพในอำเภอสอง"  6.99:1 at 1440 px
p "เลือกตำบลหรือพิมพ์ชื่อ เพื่อดู"  5.79:1 at 1024 px
span "หน่วยบริการ"  5.20:1 at 1024 px
span "พื้นที่"  6.53:1 at 1440 px
label "พื้นที่รับผิดชอบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
label "ชื่อหน่วยบริการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
button "ค้นหา"  7.75:1 at 1440, 1024, 768, 375 and 320 px
p "ภาพกิจกรรม"  5.40:1 at 375 and 320 px
h2 "กิจกรรม"  15.34:1 at 375 and 320 px
h3 "[ตัวอย่าง] ลงพื้นที่คัดกรองภาว"  8.47:1 at 320 px
h3 "[ตัวอย่าง] อบรมฟื้นฟูความรู้ อ"  11.28:1 at 375 and 320 px
h3 "[ตัวอย่าง] ตรวจสุขภาพช่องปากแล"  8.60:1 at 375 and 320 px
p "ติดต่อ"  6.68:1 at 1024, 375 and 320 px
h2 "ติดต่อสำนักงาน"  9.32:1 at 1024 px
a "# # #"  5.68:1 at 320 px
p "[ตัวอย่าง] # หมู่ # ตำบลบ้านก"  8.12:1 at 320 px
a "เปิดแผนที่ (เปิดในแท็บใหม่)"  8.47:1 at 1024 px
p "จันทร์–ศุกร์ #–# น. เว"  7.58:1 at 320 px
a "ข้อมูลติดต่อทั้งหมด"  7.75:1 at 1440, 1024, 768, 375 and 320 px
```

`/` with an Announcement of each status (`homepage-announcements.ts`):

```text
p "เว็บไซต์ทางการ · กระทรวงสาธารณ"  5.98:1 at 320 px
span "สาธารณสุข"  not read at any width
span "อำเภอสอง"  not read at any width
span "ศูนย์กลางข้อมูล บริการ"  7.90:1 at 320 px
span "และการประสานงานด้านสุขภาพ"  7.58:1 at 375 px
span "ด้านสุขภาพ"  3.07:1 at 768 px
span "ของประชาชนในอำเภอสอง จังหวัดแพ"  7.01:1 at 768 px
p "เรื่องเด่น · # พ.ย. #"  6.45:1 at 1440, 1024, 768, 375 and 320 px
h2 "[ตัวอย่าง] ชวนประชาชนอายุ # ป"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "บริการ"  7.38:1 at 768 px
h2 "บริการประชาชน"  7.19:1 at 375 and 320 px
span "ทั้งหมด"  5.81:1 at 768 px (6 texts)
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
p "บุคลากร"  6.40:1 at 1440 and 1024 px
h2 "ผู้บริหาร"  16.40:1 at 768 px
h3 "[ตัวอย่าง] สมชาย ใจดี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "สาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] วิภาวดี แสงทอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้ช่วยสาธารณสุขอำเภอสอง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
p "ข่าวสาร"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "ข่าวประชาสัมพันธ์"  15.47:1 at 375 and 320 px
time "# พ.ย. #"  6.45:1 at 1440, 1024, 768, 375 and 320 px (6 texts)
h3 "[ตัวอย่าง] มหกรรมสุขภาพอำเภอสอ"  7.54:1 at 1440 and 1024 px (2 texts)
h3 "[ตัวอย่าง] อสม. อำเภอสองสำรวจล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] คณะกรรมการ พชอ. สอง"  8.85:1 at 320 px (2 texts)
time "# ต.ค. #"  6.45:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
h3 "[ตัวอย่าง] เริ่มให้บริการวัคซี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] มอบเกียรติบัตรหมู่บ"  16.54:1 at 1440, 1024 and 768 px
p "แจ้งให้ทราบ"  5.86:1 at 1440 px
h2 "ประกาศ"  14.82:1 at 1440 px
p "ข้อมูลที่อาจมีวันสิ้นสุดหรือกา"  4.74:1 at 768 px
span "#"  3.22:1 at 1024 px (6 texts)
span "ม.ค. #"  10.94:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
span "จัดซื้อจัดจ้าง"  7.43:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] ประกวดราคาจัดซื้อคร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "เปิดอยู่"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "วันที่สิ้นสุด # มี.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "รับสมัครงาน"  7.75:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] รับสมัครอาสาสมัครตั"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "ยังไม่เปิด"  7.75:1 at 1440, 1024, 768, 375 and 320 px
span "วันที่เริ่มต้น # มิ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "วันที่สิ้นสุด # มิ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
span "ประกาศทั่วไป"  5.78:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] แจ้งปิดปรับปรุงอาคา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
span "[ตัวอย่าง] รับฟังความคิดเห็น"  5.78:1 at 1440, 1024 and 768 px
h3 "[ตัวอย่าง] เชิญร่วมแสดงความคิด"  16.54:1 at 1440, 1024 and 768 px
p "สุขภาพ"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "ความรู้สุขภาพ"  15.47:1 at 375 and 320 px
a "ไข้เลือดออก"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "บุหรี่และเครื่องดื่มแอลกอฮอล์"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "ผู้สูงอายุ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "โรคไม่ติดต่อเรื้อรัง"  6.45:1 at 1440, 1024, 768, 375 and 320 px
a "วัคซีนและการสร้างเสริมภูมิคุ้ม"  6.45:1 at 1440, 1024, 768, 375 and 320 px
span "ไข้เลือดออก"  7.75:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] # เก็บ ป้องกัน # โร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เก็บบ้าน เก็บขยะ เก็บน้ำ ตัดวง"  4.97:1 at 1440, 1024 and 768 px
p "อ่านต่อ"  6.45:1 at 1440, 1024 and 768 px (4 texts)
span "โรคไม่ติดต่อเรื้อรัง"  7.75:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] กินอย่างไรให้ห่างไก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ลดหวาน มัน เค็ม เพิ่มผักผลไม้ "  4.97:1 at 1440, 1024 and 768 px
span "วัคซีนและการสร้างเสริมภูมิคุ้ม"  7.75:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] วัคซีนไข้หวัดใหญ่ ใ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้สูงอายุ ผู้มีโรคเรื้อรัง แล"  4.97:1 at 1440, 1024 and 768 px
span "ผู้สูงอายุ"  7.75:1 at 1440, 1024, 768, 375 and 320 px
h3 "[ตัวอย่าง] ป้องกันการหกล้มในผู"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "จัดบ้านให้ปลอดภัย เพิ่มแสงสว่า"  4.97:1 at 1440, 1024 and 768 px
p "หน่วยบริการ"  7.00:1 at 1440 px
h2 "หน่วยบริการสุขภาพในอำเภอสอง"  6.99:1 at 1440 px
p "เลือกตำบลหรือพิมพ์ชื่อ เพื่อดู"  5.78:1 at 1024 px
span "หน่วยบริการ"  5.20:1 at 1024 px
span "พื้นที่"  6.52:1 at 1440 px
label "พื้นที่รับผิดชอบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
label "ชื่อหน่วยบริการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
button "ค้นหา"  7.75:1 at 1440, 1024, 768, 375 and 320 px
p "ภาพกิจกรรม"  5.40:1 at 375 and 320 px
h2 "กิจกรรม"  15.34:1 at 375 and 320 px
h3 "[ตัวอย่าง] ลงพื้นที่คัดกรองภาว"  8.47:1 at 320 px
h3 "[ตัวอย่าง] อบรมฟื้นฟูความรู้ อ"  11.28:1 at 375 and 320 px
h3 "[ตัวอย่าง] ตรวจสุขภาพช่องปากแล"  8.60:1 at 375 and 320 px
p "ติดต่อ"  6.60:1 at 1024 px
h2 "ติดต่อสำนักงาน"  9.32:1 at 1024 px
a "# # #"  5.68:1 at 320 px
p "[ตัวอย่าง] # หมู่ # ตำบลบ้านก"  8.12:1 at 320 px
a "เปิดแผนที่ (เปิดในแท็บใหม่)"  8.47:1 at 1024 px
p "จันทร์–ศุกร์ #–# น. เว"  7.58:1 at 320 px
a "ข้อมูลติดต่อทั้งหมด"  7.75:1 at 1440, 1024, 768, 375 and 320 px
```

### The cards (#420's pages)

`/health`:

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
span "ข้อมูลสุขภาพ"  9.47:1 at 320 px
p "สุขภาพ"  8.84:1 at 320 px
h1 "ข้อมูลสุขภาพ"  7.70:1 at 320 px
p "ความรู้สุขภาพสำหรับประชาชน และ"  6.45:1 at 768, 375 and 320 px
h2 "ความรู้สุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ความรู้ด้านสุขภาพสำหรับประชาชน"  5.07:1 at 768 px
h2 "รายงานสุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "รายงานด้านสุขภาพของสำนักงานสาธ"  5.07:1 at 768 px
```

`/about`:

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
span "เกี่ยวกับเรา"  9.60:1 at 320 px
h1 "[ตัวอย่าง] เกี่ยวกับสำนักงานสา"  5.93:1 at 320 px
p "สำนักงานสาธารณสุขอำเภอสอง จังห"  4.85:1 at 1024 px
h2 "โครงสร้างองค์กร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "การแบ่งส่วนงานภายในของสำนักงาน"  5.07:1 at 1024 px
h2 "ผู้บริหาร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้บริหารของสำนักงานสาธารณสุขอ"  5.66:1 at 1440, 1024 and 768 px
h2 "บุคลากร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "บุคลากรของสำนักงานสาธารณสุขอำเ"  5.07:1 at 1024 px
h2 "นโยบาย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารนโยบายของสำนักงานสาธารณส"  5.07:1 at 1024 px
h2 "แผนงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารแผนงานของสำนักงานสาธารณส"  5.07:1 at 1024 px
h2 "ผลการดำเนินงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารผลการดำเนินงานของสำนักงา"  5.66:1 at 1440, 1024 and 768 px
h2 "หน้าที่และอำนาจ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ประสานงานและสนับสนุนการดำเนินง"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "พื้นที่รับผิดชอบ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ครอบคลุม # ตำบลของอำเภอสอง จัง"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "วิสัยทัศน์"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ประชาชนอำเภอสองมีสุขภาพดี ด้วย"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารเผยแพร่"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารที่เกี่ยวข้อง"  15.47:1 at 375 and 320 px
span "PDF"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
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

`/about` without a published `organization` page (`about-contact-cases.ts`, `CASE=no-organization`):

```text
a "หน้าแรก"  10.70:1 at 375 and 320 px
span "เกี่ยวกับเรา"  9.60:1 at 320 px
h1 "[ตัวอย่าง] เกี่ยวกับสำนักงานสา"  5.86:1 at 320 px
p "สำนักงานสาธารณสุขอำเภอสอง จังห"  4.85:1 at 1024 px
h2 "โครงสร้างองค์กร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
h2 "ผู้บริหาร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "ผู้บริหารของสำนักงานสาธารณสุขอ"  5.66:1 at 1440, 1024 and 768 px
h2 "บุคลากร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "บุคลากรของสำนักงานสาธารณสุขอำเ"  5.07:1 at 1024 px
h2 "นโยบาย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารนโยบายของสำนักงานสาธารณส"  5.07:1 at 1024 px
h2 "แผนงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารแผนงานของสำนักงานสาธารณส"  5.07:1 at 1024 px
h2 "ผลการดำเนินงาน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารผลการดำเนินงานของสำนักงา"  5.66:1 at 1440, 1024 and 768 px
h2 "หน้าที่และอำนาจ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ประสานงานและสนับสนุนการดำเนินง"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "พื้นที่รับผิดชอบ"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ครอบคลุม # ตำบลของอำเภอสอง จัง"  15.61:1 at 1440, 1024, 768, 375 and 320 px
h2 "วิสัยทัศน์"  11.52:1 at 1440, 1024, 768, 375 and 320 px
p "ประชาชนอำเภอสองมีสุขภาพดี ด้วย"  15.61:1 at 1440, 1024, 768, 375 and 320 px
p "เอกสารเผยแพร่"  6.09:1 at 1440, 1024, 768, 375 and 320 px
h2 "เอกสารที่เกี่ยวข้อง"  15.47:1 at 375 and 320 px
span "PDF"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
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

### Focus rings

`scripts/measure-focus-contrast.ts` at `96b84c4`, at the five widths, with the selectors #420
read (`/health`'s two cards, `/about`'s first and fourth), between 00:47Z and 00:48Z, both runs
exit 0, each output equal line for line to #420's (`diff`): under the ring 5.78:1 at the lowest at
every width, 0 % of its pixels under 3:1, as the ring lies on the card's white inside its edge;
beside it, where the first row's ring meets the field's edge, 1 to 2 % of the pixels under 3:1 at
the rounded corners, the limit §10 keeps for the Service card (spec #417 decision 7).

## Spec #417's decisions and the decisions made while the tickets were built

Spec #417 lists fifteen decisions, the last four the prototype's picks and the seams, that the
Product Owner made before it (#417 comment 7094711736: the grill's questions each answered
"ตามที่แนะนำ", the picks and the seams through the session's question tool, each the
"(Recommended)" option); `docs/design/DESIGN.md` §10 lists them. Every decision made while the
tickets were built has a recorded answer on its ticket; §10 cites each one, and §13 the one that
changed what a page shows (#419 comment 7100237929):

| Ticket | Decision | Answer |
| --- | --- | --- |
| #418 | The light tile's edge on a white row; `tabular-nums` on its numbers | 1 A, no hairline; 2 A, left as it is (comment 7096650557) |
| #419 | An Announcement's date tile, which the rows' tile hides from assistive technology elsewhere | read by assistive technology, as before, the "(Recommended)" option before the build (comment 7100237929) |
| #419 | No assertion pins a closed Announcement's tile on the list's first page | A, as the suite reads it through `gotoListing`, "ตามที่แนะนำ" (comment 7102628698) |
| #420 | The gate's `touch-action: manipulation` and the room under `/health`'s two cards at 1,440 px | "ไม่ทำใน #420 (แนะนำ)", option A, both left out of #420 and listed in its pull request (comment 7106846593); the note from #420 on #421 keeps them outside Feature 014 |

Still open, each outside Feature 014:

- **#383**, the Homepage's Quick Access tile, and `/contact`'s route cards and its filled pill,
  losing their outlines under forced colours; `/health`'s and `/about`'s cards left its scope with
  #420.
- **#409**, **#410**, **#411** and **#353**, kept by Features 011 and 013 and out of spec #417's
  scope.
- **#277**, the redesigned pages on a real phone and in browsers other than Chromium, inside
  #238's UAT window: Feature 014's pages join that visit.

#412 and #408 close with the feature (spec #417), on the Product Owner's word after the
acceptance.

## The tickets' frontend gates

Each ticket's gate (CLAUDE.md "Frontend Design & Quality") is self-review, recorded in its pull
request; this round ran none again, as #421 changes no page:

- #418 (PR #422): critique 15/20 with no provable defect in scope and no conflict with
  `DESIGN.md`; audit 19/20; the guidelines, applied from memory, with no defect; `impeccable detect` `[]` on the five
  components; the overlay's one finding per page `radial-halo` on the deep field, which
  `.impeccable/critique/ignore.md` drops; Playwright MCP with no overflow at 320 px, the tile's
  colours the same at rest, under the pointer and under focus, and the focus ring visible.
- #419 (PR #424): critique 20/24, audit 20/20, `detect` `[]` on both components, the guidelines
  passed; Playwright MCP at 320, 639, 640 and 1,440 px: the colours, sizes, edge and
  `aria-hidden` as specified, unchanged under the pointer and focus, no overflow, the focus ring
  visible. The closed tile's faint edge on white and the overlay's `nested-cards` ("Card inside
  card") on it are the treatment decision 13 picked; `nested-cards` is not in
  `.impeccable/critique/ignore.md` (the note from #419).
- #420 (PR #426): critique 26/32, audit 19/20, `detect` `[]` on the changed files, the guidelines
  with no defect (`touch-action` to the Product Owner, above); Playwright MCP on `/health` and
  `/about` from 320 to 1,440 px: no sideways scroll, the rows, gaps and tile sizes as specified, the
  keyboard's order through the cards, the ring 3 px at −4 px, the colours and `deep` shadow under
  the pointer, and the reveal and the 8 px lift with motion allowed; the overlay's `radial-halo`
  (ignored) and a `straggler` advisory in `/about`'s body, outside the feature.

## Walkthrough

After the 404 log was cleared (00:50Z), the Product Owner was given these steps in the session,
each with its full address, with the list under "What the evidence does not cover" in the same
question:

1. the light file tile: `/documents`, a Document's page (`/documents/demo-document-plan-2570`, the
   tile in its card) and `/about/plans`;
2. the MOIT rows: `/ita/2570`;
3. the Health Reports: `/health/reports` and `/health/reports/demo-report-dengue-q4`;
4. the hospital tile and the related Documents: `/health-services`,
   `/services/demo-service-flu-vaccine`, `/services/demo-service-complaint` and
   `/announcements/demo-announcement-vhv-recruitment`;
5. the date tiles: `/announcements`, its closed Announcement's white tile, and the Homepage's
   Current Announcements (`/`);
6. the cards: `/health` and `/about`, under the pointer and with Tab;
7. steps 1 to 6 at 375 px in the browser's device mode;
8. the before and after screenshots on `evidence/014-421-screenshots`.

The Product Owner chose all four groups (steps 1 to 4, 5 and 6, 7, 8) as opened, answered "Pass"
and accepted every coverage gap below, "Accept as listed (Recommended)" (#421 comment
7118897822).

**What the app's log shows of the walkthrough** (`scripts/dev-runtime-opened.ts` from 00:50:49Z
with `--expect` and the fourteen addresses the steps gave, read at 01:09Z): 17 page requests
between 01:07:27Z and 01:09:34Z, every one 200, the thirteen addresses other than the Homepage,
three of them twice, and `/documents/demo-document-vhv-application`; "1 of 14 addresses not shown
as opened", the Homepage. Asked about it, the Product Owner answered "Opening it now (Recommended)",
then "Opened, pass"; read again at 01:13Z, the log shows `/` beyond the health check between
01:13:02Z and 01:13:18Z, "0 of 1 addresses not shown as opened". The log holds no window width, so
it shows no second visit for step 7; that step rests on the Product Owner's answer.

## What the evidence does not cover

Written before the walkthrough was asked for, and listed whole beside its question; the Product
Owner accepted it (#421 comment 7118897822):

- Browsers other than Chromium, and a real phone or touch: every suite, capture and measure ran in
  Playwright's Chromium, and the runtime answers on `127.0.0.1` only, so the phone steps are the
  browser's device mode. #277 visits the redesigned pages inside #238's UAT window.
- Real content: the runtime holds the demo dataset (spec #417 "Testing Decisions"). A Document
  whose file cannot be served, a Health Report without a fiscal year, `/about` without a published
  `organization` page, a Basic Page with related Documents, 21 Announcements with a closed one
  alone on the list's second page, and the Homepage's Current Announcements with each status are
  seen only through the synthetic fixtures of `scripts/screenshot-fixtures/lists-by-count.ts`,
  `about-contact-cases.ts` and `homepage-announcements.ts`. The office's own content reaches the
  runtime only with the migration.
- The pointer and focus: the captures show every page at rest. The tile kept still under the
  pointer and under focus on each row, and the cards' `brand-primary` under the pointer, their lift
  and their ring inside the edge, are read by the suites (`public.helpers.ts` `rowTileStates`,
  `unchangedTileStates`, `expectDestinationCardsUnderPointer`); no capture of this round shows
  them. The focus rings measured in this round are the cards' on `/health` and `/about` alone,
  with the selectors #420 read.
- A closed Announcement's tile on the list's first page: the suite reads it through
  `gotoListing`, with no assertion on the page it lands on (#419 comment 7102628698); the demo
  dataset's `/announcements`, whose first page holds its one closed Announcement, shows it in this
  round's captures and readings.
- The Admin: the feature changes no model, field or Admin screen, so the walkthrough has no Admin
  step and the round no Admin capture.
- Search, the 404 page and the signed preview of a draft: the feature changes none of them (spec
  #417 "Scope of the change"); the suites read them, and no capture of this round shows them.
- Forced colours (Windows High Contrast): no run of this round emulates them. `/health`'s and
  `/about`'s cards behave as `/services`' since #420, and #383 keeps the Homepage's Quick Access
  and `/contact` (§10).
- Text at 200 %: no run of this round enlarges text.
- Motion on the built, minified pages: the runtime serves the stylesheet unminified, and the suites
  read it there (the cards' reveal and lift). `npm run build:check` reads the built stylesheets;
  the look of a built page with motion allowed is due with the feature's first production image
  (`scripts/production-image-check.sh`, #276).
- Keyboard passes by hand: each ticket's frontend gate tabbed through its own pages at its own
  head; this round runs the suites' axe and focus checks (`expectVisibleFocusOnEveryStop`, desktop
  and mobile) and no pass by hand.
- Reduced motion in the walkthrough, and print: the suites prefer reduced motion on every page but
  the tests of motion (`DESIGN.md` §8.12), and no run of the round prints a page.
- The frontend gate: each ticket ran its own on its promoted commit (below); this round runs none
  again, as #421 changes no page.
- The before screenshots as a control of this round: the 26 cases of the feature's before set are
  #418's, taken at `9a29f44` on `main` before the feature's first promotion (the note from #418);
  #419's three fixture cases have their own before images, taken at `be1c832`, where an
  Announcement's tile was still the gradient one (the note from #419). Both sets were taken on
  2026-11-23, a day before the round, and the fixtures date their content from the day they run, so
  the synthetic pages' dates are a day later in the after images; the demo dataset's dates count
  from its load, and its Announcements kept their states (see "Screenshots").
- Under 4.5:1 on the Homepage, outside the rows and in large text, unchanged by the feature: the
  hero's "ด้านสุขภาพ" at 768 px and the Health Service Discovery counts at 1,024 px (the note from
  #419); large text needs 3:1.

## What was kept as it is

Each on the Product Owner's answer or a decision of spec #417, with no follow-up issue:

- The light tile on a white row without a hairline at its edge, and its numbers without
  `tabular-nums` (#418 comment 7096650557, items 1 and 2).
- A closed Announcement's faint `border-default` edge on white, which Impeccable's overlay reports
  as `nested-cards` ("Card inside card") on `/announcements`: the treatment decision 13 picked,
  kept out of `.impeccable/critique/ignore.md` (the note from #419; PR #424).
- `touch-action: manipulation`, set nowhere on the site, and the room under `/health`'s two cards
  at 1,440 px, from the page's length (#420 comment 7106846593).
- Five of `/about`'s six summaries ending "ของสำนักงานสาธารณสุขอำเภอสอง" (decision 14); the
  โครงสร้างองค์กร card with nothing under its name while the `organization` page is not published
  (decision 5); and a summary's last line that can hold one word alone, the card's H2 without
  `text-balance` (decision 7, the catalog's card whole; `DESIGN.md` §4.1 keeps titles only), each
  named as settled by its decision in #420 comment 7105447692.

#420's §13 entry, "v1.8 `/health`'s and `/about`'s cards", stays its own beside #421's, as
`CODING_STANDARDS.md` "Documents" asks (a ticket's decisions in §13, one entry per ticket with its
authority) and as v1.7 kept #393's to #396's entries beside #397's. The note from #420 on #421
(comment 7116512155) had this ticket fold it into the feature's entry; that note is not followed.

## The prototype

The prototype is on the branch `prototype/light-tile-cards` at `46daee8`, outside `main`: its
builder scripts and its record, `docs/prototypes/light-tile-cards.md`. Its pages, screenshots,
sheets, close-ups and contrast readings stay on the development host. Spec #417 "How this differs
from the prototype" names four differences (one tile and one card built from the rules in place of
rewritten markup, the organization card's summary read from its page, `/about`'s related Documents
shown in A only, every colour and size a token's); the built pages keep them.

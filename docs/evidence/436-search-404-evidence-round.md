# #436 evidence: Feature 015 (Search and the 404 page) on the development runtime

Feature 015's evidence round (spec #432), run on 2026-11-24 by Claude Code, first at `6c9731d`, the
head of `015-search-404`, then, after the Product Owner's walkthrough asked for the search field's
focus ring to change, again at `0015f4f`, #436's head with that change. This is a self-run record,
not an independent review, and not the Product Owner's acceptance, which the Product Owner gives
on #432.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`. It served `6c9731d`,
  #435's merge (PR #441), when the round began: `dev-runtime-verify.sh` reported VERIFY: PASS at
  `6c9731de12ff46f9a0d319c18da4e1dc06af795d` at 12:13Z, and no window held it. #436 then promoted
  `8595394` at 13:32Z and `0015f4f` at 13:49Z, each with VERIFY: PASS at its full commit
  (`85953940e3e7b7dd47b1a0af6af21a531d04be35`, `0015f4f18d2b05f5a021ecc48af7031eea3c0c22`).
- **Code under test:** `6c9731d` for the first round and the walkthrough; `0015f4f` for the second
  round, which differs from `6c9731d` in `src/components/SearchPill.astro`'s classes and comment and
  in a comment of `src/styles/global.css` (`git diff 6c9731d 0015f4f -- src`). Node 26.13.0, npm
  12.2.1.
- **Content:** the demo dataset, 56 entries, all published, and each capture's and each measure's
  own synthetic fixtures, which it removes.

## Checks

The local checks ran at `6c9731d` between 12:14Z and 12:16Z, and at `0015f4f` with #436's documents
between 14:50Z and 14:53Z; the browser suites at `6c9731d` between 12:15Z and 12:50Z and at
`0015f4f` between 13:50Z and 14:27Z, T021 and the residue after each, the captures and the
measures after those. The pull request states the checks at its head.

| Check | Command | `6c9731d` | `0015f4f` |
| --- | --- | --- | --- |
| Types | `npm run typecheck` | exit 0: 0 errors, 0 warnings, 2 hints | the same |
| Node seam | `npm run test:node` | 891 of 891 passed | 891 of 891 passed |
| Build | `npm run build:check` | exit 0; `check-built-styles: PASS (2 stylesheets, the reveal in 1)` | the same |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | each exit 0; jscpd's baseline unchanged at 21 clones | the same |
| Browser seam | `scripts/dev-runtime-env.sh npm run test:browser` | 839 passed, 14 skipped, in 34.0 minutes | 839 passed, 14 skipped, in 36.2 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | source identity verified at `6c9731d`; 14 of 14 passed, no owned-fixture residue | source identity verified at `0015f4f`; 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 52 misses, all synthetic; 56 entries, 0 not published; 0 database connection errors in the last hour | RESIDUE: NONE; 73 misses, all synthetic; 56 entries, 0 not published; 0 database connection errors |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | cleared before the walkthrough (13:11Z), 54 entries, none without the synthetic marks | cleared after the frontend gate (14:59Z), 76 entries, none without the synthetic marks |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator;
the coordinator ran those 14 after each run. No test of either full run failed. #435's full suite
at `89e7933` took 41.2 minutes (the note from #435). The first run's near-timeout report named one
test at 60 % or more of its time, `public-demo-dataset.spec.ts`' axe and focus check of the
dataset's list pages at the desktop width (18.1 s of 30 s), outside Feature 015's pages; the second
named none. Every suite that reads the 404 page, a draft's, an unpublished or a trashed entry's
address among them, reads its whole `main` against `NOT_FOUND_CONTENT` (`expectSiteNotFound`, the
note from #435).

Between the rounds, the walkthrough's change was built test first: red at `6c9731d`
(`public-search.spec.ts`' "the search pill is the Homepage hero's…", `public-shell.spec.ts`' "its
search pill is the site's…" and `public-homepage-curation.spec.ts`' "the hero's search has an
accessible name…", each failing at its last assertion on the field's own `brand-primary` ring and
no ring around the pill), then green with `/search`'s axe and focus walks at `8595394` (7 passed in
52.7 s) and at `0015f4f` (7 passed in 48.3 s). A first second round at `8595394` was stopped after
287 tests of its full suite, none failed, when the frontend gate found the field's reset applied
in every browser (`38a25b0`); its residue after the stop read RESIDUE: NONE.

## Screenshots

After, with reduced motion preferred, so the pages show at rest, by `.tmp/436/capture.sh` on the
development host at `6c9731d` (12:50Z to 12:51Z), and again by `.tmp/436/capture-2.sh`, the same
script into another folder, at `0015f4f` (14:27Z). It reruns #433's capture script as
it is, the one that took the feature's before images:

```text
CASE=demo scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/search-cases.ts <dir>
CASE=content scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/search-cases.ts <dir>
```

Each round took 55 after images, 11 cases at each of the five widths, the cases of the feature's
before set, the 55 images on `evidence/015-433-screenshots` at `34283d7`, taken at `0c8d3b7` on
`main` before the feature's first promotion (the note from #433; `comm` of the two case lists
printed nothing):

- `/search` from the demo dataset in each state the runtime can show: at start (`search-start`),
  a query too short (`search-too-short`, "ก"), nothing found (`search-nothing`, "zzzzqq"), found
  ("สุขภาพ", `search-found`, its page 2 `search-found-page-2`, a group at 0 `search-group-empty`
  and a page past the last `search-past-last`) and every kind ("ตัวอย่าง", `search-kinds`);
- the rows the demo dataset lacks, from synthetic content (`search-rows`): a result without a
  snippet, a 175-character title and an expired Document;
- the site's 404 page on a missing address (`not-found`) and the Homepage (`home`).

A failed search is not among them: the runtime cannot make a read fail ("What the evidence does
not cover").

`scripts/evidence-branch.sh --before-from evidence/015-433-screenshots` put the first round's 110
images (55 before, 55 after) and their `captures.txt` on the image-only branch
`evidence/015-436-screenshots`, at `7b95d7fa9b9d1b586bfa5a4f84cff02ce9d4fc9d`, pushed before the
walkthrough. Page heights in pixels, the table that script printed from the PNGs (a page with 900
px at every width is shorter than the window):

| Page | | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `home` | before | 5,541 | 5,704 | 7,557 | 6,320 | 6,842 |
| | after | 5,541 | 5,704 | 7,557 | 6,320 | 6,842 |
| `not-found` | before | 900 | 900 | 900 | 900 | 900 |
| | after | 900 | 900 | 900 | 900 | 961 |
| `search-found` | before | 3,879 | 3,879 | 4,041 | 5,529 | 6,043 |
| | after | 3,735 | 3,735 | 4,263 | 4,679 | 5,425 |
| `search-found-page-2` | before | 1,727 | 1,805 | 1,915 | 2,499 | 2,793 |
| | after | 1,715 | 1,715 | 1,999 | 2,253 | 2,615 |
| `search-group-empty` | before | 1,019 | 1,019 | 1,103 | 1,239 | 1,395 |
| | after | 995 | 995 | 1,085 | 1,161 | 1,339 |
| `search-kinds` | before | 3,999 | 4,025 | 4,213 | 5,951 | 6,659 |
| | after | 3,845 | 3,863 | 4,607 | 5,229 | 6,071 |
| `search-nothing` | before | 973 | 973 | 1,061 | 1,231 | 1,387 |
| | after | 909 | 909 | 1,003 | 1,113 | 1,239 |
| `search-past-last` | before | 1,019 | 1,019 | 1,103 | 1,239 | 1,395 |
| | after | 995 | 995 | 1,085 | 1,161 | 1,339 |
| `search-rows` | before | 1,291 | 1,291 | 1,405 | 1,687 | 1,929 |
| | after | 1,267 | 1,267 | 1,387 | 1,513 | 1,817 |
| `search-start` | before | 900 | 900 | 900 | 900 | 907 |
| | after | 900 | 900 | 900 | 900 | 935 |
| `search-too-short` | before | 900 | 900 | 919 | 951 | 1,133 |
| | after | 900 | 900 | 900 | 900 | 985 |

**The Homepage is unchanged:** `pairs by case:` reads "identical at every width (1): home", and the
five `home` pairs are the only identical ones, "5 of 55 pairs identical". Every `/search` page with
results or an empty state is shorter after at 1,440, 1,024, 375 and 320 px, and the found pages
and every kind taller at 768 px; the start
state and the 404 page are shorter than the window, 900 px, at every width but 320 px (935 and 961
px after), and the too-short state at every width but 320 px (985 px).

**Which pairs differ, and where** (the `pairs:` lines of `scripts/evidence-branch.sh`): the
pages of a different height read "rows 0–60 the same" (at 1,440 and 1,024 px on the found pages),
0–62 (the group at 0 and the page past the last at 320 px), 0–44 (too short at 375 px), 0–68 at 375
px and 0–84 or 0–86 at the other widths, the header, which stays; those of the same height differ
from row 85 at 1,440, 1,024 and 768 px, or 69 at 375 px, down to row 539 on the 404 page, 493 on
`/search` at start and 635 on the too-short state, the field and what lies on it.

**Against the tickets' own after images** (`node scripts/evidence-pairs.ts --against`, each after
image against the newest earlier ticket's of the same name, #435's, #434's, then #433's): "55 of
55 after images identical to the earlier ticket's", the ten `/search` and Homepage cases #434's
("identical to origin/evidence/015-434-screenshots at every width (10)") and `not-found` #435's
("identical to origin/evidence/015-435-screenshots at every width (1)").

**The second round's images against the first's** (`node scripts/evidence-pairs.ts --against
.tmp/436/after-2-named origin/evidence/015-436-screenshots`): "identical to
origin/evidence/015-436-screenshots at every width (11): home, not-found, search-found,
search-found-page-2, search-group-empty, search-kinds, search-nothing, search-past-last,
search-rows, search-start, search-too-short", "55 of 55 after images identical to the earlier
ticket's". The pill's focus ring, the one change between the rounds, shows only with focus, and
every capture is at rest, so the evidence branch's after images stand for `0015f4f` too.

**Where the first result starts** for "สุขภาพ" on the demo dataset (`.tmp/436/first-result.mjs`:
`main`'s first `article`, the element `public-search.spec.ts`' 706 px case reads, from the page's
top, in the windows spec #432 "Measured in the prototype" used), beside `main` at `0c8d3b7`:

| Width (window) | First round, `6c9731d` | Second round, `0015f4f` | `main` at `0c8d3b7` |
| --- | ---: | ---: | ---: |
| 1,440 px (1440×900) | 536 px | 536 px | 560 px |
| 1,024 px (1024×900) | 536 px | 536 px | 560 px |
| 375 px (375×812) | 628 px | 628 px | 706 px |
| 320 px (320×640) | 698 px | 698 px | 754 px |

Each answered 200 with 20 rows, the first "[ตัวอย่าง] มหกรรมสุขภาพอำเภอสอง ประจำปี 2569
ประชาชนร่วมตรวจสุขภาพกว่า 300 คน". At 375 px the first result lies 78 px higher than in `main`,
inside spec #432 decision 4's 706 px; #434 read 536, 628 and 698 px and not 1,024 px (the note from
#434).

## Contrast

`scripts/measure-text-contrast.ts --all-text --fold <path> main` at 1,440, 1,024, 768, 375 and 320
px, through each ticket's own contrast script rerun as it is with the output folder set to the
round's (`.tmp/436/contrast.sh` at `6c9731d`, 12:51Z to 13:10Z; `.tmp/436/contrast-2.sh` at
`0015f4f`, 14:28Z to 14:46Z), every run exit 0: #433's on `/search` at start, found ("สุขภาพ") and
nothing found; #434's on "สุขภาพ" pages 1 and 2, every kind ("ตัวอย่าง") and the content rows
(`fixture:search-rows`), then the first two rows' focus rings; #435's on the 404 page's `main`. Each
output's closing lines, quoted whole below, fold each text to its lowest reading over the five
widths.

**Against each ticket's own readings** (`scripts/contrast-compare.ts --folders`, first round, at
`6c9731d`):

```text
433/contrast-found.txt  folded 45 of 62 the same; per-width 490 of 590
433/contrast-nothing.txt  folded 11 of 11 the same; per-width 55 of 55
433/contrast-start.txt  folded 5 of 5 the same; per-width 25 of 25
434/focus.txt  the round's alone
434/found-page-2.txt  folded 35 of 35 the same; per-width 239 of 240
434/found.txt  folded 62 of 62 the same; per-width 589 of 590
434/kinds.txt  folded 61 of 61 the same; per-width 589 of 590
434/rows.txt  folded 23 of 23 the same; per-width 130 of 130
435/not-found.txt  folded 5 of 5 the same; per-width 25 of 25
folded lines: 247 of 264 the same in 8 outputs; differing in 1: 433/contrast-found.txt; the round's alone in 1: 433/contrast-found.txt
per-width readings: 2142 of 2245 in the round at the same width and ratio
```

#433's found page read the result cards #434 replaced: its 17 folded lines not in the round are
their title links (`a "[ตัวอย่าง] …"`, 12.21:1), and the round's 17 alone are the rows' H2 titles
(`h2 "[ตัวอย่าง] …"`, 16.54:1). Of the 103 per-width readings not in the round at the same width and
ratio, 100 are those titles, 20 at each width, and three the H1 "ค้นหาข้อมูล" on the field, by 0.11:1 at most, on pages whose after images are byte for byte #434's: 375 px 7.92:1
(#434) and 8.03:1 (the round) on page 2, 1,440 px 9.21:1 and 9.22:1 on page 1, and 9.22:1 and
9.21:1 on every kind.

**The second round against the first** (`scripts/contrast-compare.ts --folders`, at `0015f4f`):

```text
433/contrast-found.txt  folded 62 of 62 the same; per-width 590 of 590
433/contrast-nothing.txt  folded 11 of 11 the same; per-width 55 of 55
433/contrast-start.txt  folded 5 of 5 the same; per-width 25 of 25
434/focus.txt  line for line the same
434/found-page-2.txt  folded 35 of 35 the same; per-width 239 of 240
434/found.txt  folded 62 of 62 the same; per-width 589 of 590
434/kinds.txt  folded 61 of 61 the same; per-width 589 of 590
434/rows.txt  folded 23 of 23 the same; per-width 130 of 130
435/not-found.txt  folded 5 of 5 the same; per-width 25 of 25
folded lines: 264 of 264 the same in 8 outputs
per-width readings: 2242 of 2245 in the round at the same width and ratio
line for line: 1 of 1 output the same
```

The three per-width lines are the same H1's, the other way round: 1,440 px 9.22:1 then 9.21:1 on
"สุขภาพ" page 1, 375 px 8.03:1 then 7.92:1 on page 2 and every kind, on pages whose after images
are byte for byte the first round's.

**The lowest readings** of the eight text outputs at `0015f4f` (`--lowest 12`, the same lines as
the first round's), nothing under 4.5:1:

```text
4.69:1  contrast-found.txt  li "หน้า #"  at 1440, 1024, 768, 375 and 320 px
4.69:1  found.txt  li "หน้า #"  at 1440, 1024, 768, 375 and 320 px
4.69:1  found-page-2.txt  li "หน้า #"  at 1440, 1024, 768, 375 and 320 px
4.69:1  kinds.txt  li "หน้า #"  at 1440, 1024, 768, 375 and 320 px
4.97:1  contrast-found.txt  p "พบ # รายการ"  at 1440, 1024, 768, 375 and 320 px
4.97:1  contrast-found.txt  span "ข่าว"  at 1440, 1024, 768, 375 and 320 px (3 texts)
4.97:1  contrast-found.txt  span "•"  at 1440, 1024, 768, 375 and 320 px (12 texts)
4.97:1  contrast-found.txt  time "# พ.ย. #"  at 1440, 1024, 768, 375 and 320 px (4 texts)
4.97:1  contrast-found.txt  p "…เปิดจุดตรวจคัดกรองเบาหวาน ควา"  at 1440, 1024, 768, 375 and 320 px (2 texts)
4.97:1  contrast-found.txt  span "กิจกรรม"  at 1440, 1024, 768, 375 and 320 px (3 texts)
4.97:1  contrast-found.txt  p "ติดตามผลการดำเนินงานด้านสุขภาพ"  at 1440, 1024, 768, 375 and 320 px
4.97:1  contrast-found.txt  p "หัวหน้าส่วนราชการและผู้นำชุมชน"  at 1440, 1024, 768, 375 and 320 px
```

**`/search` at start (#433's script)**, `/search`, `contrast-2/433/contrast-start.txt`, 5 closing lines:

```text
folded  a "หน้าแรก"  10.71:1 at 320 px
folded  span "ค้นหา"  10.14:1 at 375 and 320 px
folded  p "ค้นหา"  9.22:1 at 320 px
folded  h1 "ค้นหาข้อมูล"  8.14:1 at 320 px
folded  p "ค้นหาข่าวสาร บริการประชาชน ข้อ"  6.45:1 at 768, 375 and 320 px
```

**"สุขภาพ" found (#433's script)**, `/search?q=สุขภาพ`, `contrast-2/433/contrast-found.txt`, 62 closing lines:

```text
folded  a "หน้าแรก"  10.56:1 at 320 px
folded  span "ค้นหา"  9.87:1 at 320 px
folded  p "ค้นหา"  8.84:1 at 320 px
folded  h1 "ค้นหาข้อมูล"  7.70:1 at 320 px
folded  a "ทุกประเภท # รายการ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข่าวสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "บริการประชาชน # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข้อมูลสุขภาพ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน่วยบริการ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เอกสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เกี่ยวกับเรา # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ITA # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  p "พบ # รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ข่าว"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (12 texts)
folded  time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  h2 "[ตัวอย่าง] มหกรรมสุขภาพอำเภอสอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  p "…เปิดจุดตรวจคัดกรองเบาหวาน ควา"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  mark "สุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px (18 texts)
folded  span "กิจกรรม"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  h2 "[ตัวอย่าง] คณะกรรมการ พชอ. สอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  p "ติดตามผลการดำเนินงานด้านสุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  p "หัวหน้าส่วนราชการและผู้นำชุมชน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (8 texts)
folded  h2 "[ตัวอย่าง] ตรวจสุขภาพช่องปากแล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ทันตบุคลากรตรวจฟันและสอนแปรงฟั"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "บริการประชาชน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  h2 "[ตัวอย่าง] ตรวจสอบสิทธิหลักประ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ตรวจสอบสิทธิการรักษาพยาบาลของต"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แจ้งปัญหาสิ่งแวดล้อ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "แจ้งเหตุรำคาญ กลิ่น ควัน น้ำเส"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แจ้งปัญหาด้านสุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "แจ้งปัญหาสุขภาพในชุมชน เพื่อให"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "หน่วยบริการสุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  h2 "[ตัวอย่าง] รพ.สต.สะเอียบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "# หมู่ # ตำบลสะเอียบ อำเภอสอง "  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] รพ.สต.บ้านกลาง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "# หมู่ # ตำบลบ้านกลาง อำเภอสอ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] รพ.สต.ห้วยหม้าย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "# หมู่ # ตำบลห้วยหม้าย อำเภอสอ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ปิดให้บริการชั่วคราว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] เริ่มให้บริการวัคซี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ผู้สูงอายุ ผู้มีโรคเรื้อรัง หญ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "เอกสารเผยแพร่"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  h2 "[ตัวอย่าง] แบบฟอร์มขอรับวัคซีน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "กรอกแบบฟอร์มแล้วยื่นที่โรงพยาบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ความรู้สุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] วัคซีนไข้หวัดใหญ่ ใ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ผู้สูงอายุ ผู้มีโรคเรื้อรัง แล"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] รายงานผลการดำเนินงา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  p "สรุปผลการดำเนินงานตามตัวชี้วัด"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  span "รายงานสุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] เอกสารรายงานผลการดำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "หน้าข้อมูล"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] เกี่ยวกับสำนักงานสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "สำนักงานสาธารณสุขอำเภอสอง จังห"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  li "หน้า #"  4.69:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน้าถัดไป"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

**Nothing found (#433's script)**, `/search?q=zzzzqq`, `contrast-2/433/contrast-nothing.txt`, 11 closing lines:

```text
folded  a "หน้าแรก"  10.56:1 at 320 px
folded  span "ค้นหา"  9.87:1 at 320 px
folded  p "ค้นหา"  8.84:1 at 320 px
folded  h1 "ค้นหาข้อมูล"  7.70:1 at 320 px
folded  p "ไม่พบข้อมูลที่ตรงกับ “zzzzqq”"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ตรวจสอบตัวสะกด ลองใช้คำที่สั้น"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  a "บริการประชาชน"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน่วยบริการสุขภาพที่เกี่ยวข้อง"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เอกสารเผยแพร่"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข่าวสาร"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข้อมูลสุขภาพ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

**"สุขภาพ" found (#434's script)**, `/search?q=สุขภาพ`, `contrast-2/434/found.txt`, 62 closing lines:

```text
folded  a "หน้าแรก"  10.56:1 at 320 px
folded  span "ค้นหา"  9.87:1 at 320 px
folded  p "ค้นหา"  8.84:1 at 320 px
folded  h1 "ค้นหาข้อมูล"  7.70:1 at 320 px
folded  a "ทุกประเภท # รายการ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข่าวสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "บริการประชาชน # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข้อมูลสุขภาพ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน่วยบริการ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เอกสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เกี่ยวกับเรา # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ITA # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  p "พบ # รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ข่าว"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (12 texts)
folded  time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  h2 "[ตัวอย่าง] มหกรรมสุขภาพอำเภอสอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  p "…เปิดจุดตรวจคัดกรองเบาหวาน ควา"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  mark "สุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px (18 texts)
folded  span "กิจกรรม"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  h2 "[ตัวอย่าง] คณะกรรมการ พชอ. สอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  p "ติดตามผลการดำเนินงานด้านสุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  p "หัวหน้าส่วนราชการและผู้นำชุมชน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (8 texts)
folded  h2 "[ตัวอย่าง] ตรวจสุขภาพช่องปากแล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ทันตบุคลากรตรวจฟันและสอนแปรงฟั"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "บริการประชาชน"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  h2 "[ตัวอย่าง] ตรวจสอบสิทธิหลักประ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ตรวจสอบสิทธิการรักษาพยาบาลของต"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แจ้งปัญหาสิ่งแวดล้อ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "แจ้งเหตุรำคาญ กลิ่น ควัน น้ำเส"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แจ้งปัญหาด้านสุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "แจ้งปัญหาสุขภาพในชุมชน เพื่อให"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "หน่วยบริการสุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  h2 "[ตัวอย่าง] รพ.สต.สะเอียบ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "# หมู่ # ตำบลสะเอียบ อำเภอสอง "  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] รพ.สต.บ้านกลาง"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "# หมู่ # ตำบลบ้านกลาง อำเภอสอ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] รพ.สต.ห้วยหม้าย"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "# หมู่ # ตำบลห้วยหม้าย อำเภอสอ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ปิดให้บริการชั่วคราว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] เริ่มให้บริการวัคซี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ผู้สูงอายุ ผู้มีโรคเรื้อรัง หญ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "เอกสารเผยแพร่"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  h2 "[ตัวอย่าง] แบบฟอร์มขอรับวัคซีน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "กรอกแบบฟอร์มแล้วยื่นที่โรงพยาบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ความรู้สุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] วัคซีนไข้หวัดใหญ่ ใ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ผู้สูงอายุ ผู้มีโรคเรื้อรัง แล"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] รายงานผลการดำเนินงา"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  p "สรุปผลการดำเนินงานตามตัวชี้วัด"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  span "รายงานสุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] เอกสารรายงานผลการดำ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "รับวัคซีนไข้หวัดใหญ่ตามสิทธิที"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "หน้าข้อมูล"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] เกี่ยวกับสำนักงานสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "สำนักงานสาธารณสุขอำเภอสอง จังห"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  li "หน้า #"  4.69:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน้าถัดไป"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

**Its page 2 (#434's script)**, `/search?q=สุขภาพ&page=2`, `contrast-2/434/found-page-2.txt`, 35 closing lines:

```text
folded  a "หน้าแรก"  10.56:1 at 320 px
folded  span "ค้นหา"  9.87:1 at 320 px
folded  p "ค้นหา"  8.84:1 at 320 px
folded  h1 "ค้นหาข้อมูล"  7.70:1 at 320 px
folded  a "ทุกประเภท # รายการ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข่าวสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "บริการประชาชน # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข้อมูลสุขภาพ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน่วยบริการ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เอกสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เกี่ยวกับเรา # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ITA # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  p "พบ # รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "เอกสารเผยแพร่"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แผนปฏิบัติการด้านสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "แผนงานและโครงการด้านสุขภาพของเ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  mark "สุขภาพ"  16.54:1 at 1440, 1024, 768, 375 and 320 px (7 texts)
folded  span "ถูกแทนที่แล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ข่าว"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  h2 "[ตัวอย่าง] ชวนประชาชนอายุ # ป"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "…สาธารณสุขอำเภอสองร่วมกับโรงพย"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ประกาศ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  h2 "[ตัวอย่าง] รับสมัครอาสาสมัครสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "…น้อยกว่า # เดือน และสมัครใจปฏ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "เปิดอยู่"  10.94:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  h2 "[ตัวอย่าง] เชิญชวนผู้สูงอายุแล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ผู้มีอายุ # ปีขึ้นไปและผู้ป่ว"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "หน้าข้อมูล"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] โครงสร้างองค์กร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "…พัสดุ และบริหารงานบุคคล กลุ่ม"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน้าก่อนหน้า"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  li "หน้า #"  4.69:1 at 1440, 1024, 768, 375 and 320 px
```

**Every kind (#434's script)**, `/search?q=ตัวอย่าง`, `contrast-2/434/kinds.txt`, 61 closing lines:

```text
folded  a "หน้าแรก"  10.56:1 at 320 px
folded  span "ค้นหา"  9.87:1 at 320 px
folded  p "ค้นหา"  8.84:1 at 320 px
folded  h1 "ค้นหาข้อมูล"  7.70:1 at 320 px
folded  a "ทุกประเภท # รายการ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข่าวสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "บริการประชาชน # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข้อมูลสุขภาพ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน่วยบริการ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เอกสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เกี่ยวกับเรา # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ITA # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  p "พบ # รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ข่าว"  4.97:1 at 1440, 1024, 768, 375 and 320 px (5 texts)
folded  span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (20 texts)
folded  time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (16 texts)
folded  h2 "[ตัวอย่าง] มหกรรมสุขภาพอำเภอสอ"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  p "สำนักงานสาธารณสุขอำเภอสองร่วมก"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  span "ประกาศ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  h2 "[ตัวอย่าง] เปิดรับสมัครผู้เข้า"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ผู้สนใจเลิกบุหรี่สมัครได้ที่ ร"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "เปิดอยู่"  10.94:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  h2 "[ตัวอย่าง] ชวนประชาชนอายุ # ป"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "รพ.สต. ทุกแห่งในอำเภอสองเปิดจุ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "กิจกรรม"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  h2 "[ตัวอย่าง] งดให้บริการคลินิกทั"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "คลินิกทันตกรรม รพ.สต.บ้านกลาง "  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] ลงพื้นที่คัดกรองภาว"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ทีมสาธารณสุขอำเภอร่วมกับ อสม. "  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ความรู้สุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  h2 "[ตัวอย่าง] # เก็บ ป้องกัน # โร"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "เก็บบ้าน เก็บขยะ เก็บน้ำ ตัดวง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] อสม. อำเภอสองสำรวจล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "อาสาสมัครสาธารณสุขประจำหมู่บ้า"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] รับสมัครอาสาสมัครสา"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "สำนักงานสาธารณสุขอำเภอสองรับสม"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "เอกสารเผยแพร่"  4.97:1 at 1440, 1024, 768, 375 and 320 px (3 texts)
folded  h2 "[ตัวอย่าง] ใบสมัครอาสาสมัครสาธ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ใบสมัครสำหรับผู้สนใจเป็นอาสาสม"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "รายงานสุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] รายงานสถานการณ์โรคไ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "จำนวนผู้ป่วย อัตราป่วย และการด"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  h2 "[ตัวอย่าง] เอกสารรายงานสถานการ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] คณะกรรมการ พชอ. สอง"  16.54:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  p "ติดตามผลการดำเนินงานด้านสุขภาพ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  p "หัวหน้าส่วนราชการและผู้นำชุมชน"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] กินอย่างไรให้ห่างไก"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ลดหวาน มัน เค็ม เพิ่มผักผลไม้ "  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] เชิญชวนผู้สูงอายุแล"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ผู้มีอายุ # ปีขึ้นไปและผู้ป่ว"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  time "# ต.ค. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (4 texts)
folded  h2 "[ตัวอย่าง] เริ่มให้บริการวัคซี"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ผู้สูงอายุ ผู้มีโรคเรื้อรัง หญ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แบบฟอร์มขอรับวัคซีน"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "กรอกแบบฟอร์มแล้วยื่นที่โรงพยาบ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] อบรมฟื้นฟูความรู้ อ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ทบทวนแนวทางการเฝ้าระวังและรายง"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] วัคซีนไข้หวัดใหญ่ ใ"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "ผู้สูงอายุ ผู้มีโรคเรื้อรัง แล"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  li "หน้า #"  4.69:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน้าถัดไป"  6.45:1 at 1440, 1024, 768, 375 and 320 px
```

**The content rows (#434's script, `fixture:search-rows`)**, `search-cases.ts` `CASE=content`, `contrast-2/434/rows.txt`, 23 closing lines:

```text
folded  a "หน้าแรก"  10.56:1 at 320 px
folded  span "ค้นหา"  9.87:1 at 320 px
folded  p "ค้นหา"  8.84:1 at 320 px
folded  h1 "ค้นหาข้อมูล"  7.70:1 at 320 px
folded  a "ทุกประเภท # รายการ"  6.45:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข่าวสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "บริการประชาชน # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ข้อมูลสุขภาพ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "หน่วยบริการ # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เอกสาร # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "เกี่ยวกับเรา # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  a "ITA # รายการ"  10.94:1 at 1440, 1024, 768, 375 and 320 px
folded  p "พบ # รายการ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "เอกสารเผยแพร่"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แถวสาธิตผลค้นหา แนว"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "เอกสารสมมุติที่หมดอายุ สำหรับแ"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  span "หมดอายุแล้ว"  7.75:1 at 1440, 1024, 768, 375 and 320 px
folded  span "ข่าว"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  span "•"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  time "# พ.ย. #"  4.97:1 at 1440, 1024, 768, 375 and 320 px (2 texts)
folded  h2 "[ตัวอย่าง] แถวสาธิตผลค้นหา หัว"  16.54:1 at 1440, 1024, 768, 375 and 320 px
folded  p "สรุปข่าวสมมุติสำหรับแถวที่มีชื"  4.97:1 at 1440, 1024, 768, 375 and 320 px
folded  h2 "[ตัวอย่าง] แถวสาธิตผลค้นหา ข่า"  16.54:1 at 1440, 1024, 768, 375 and 320 px
```

**The 404 page (#435's script)**, `/songhealth-unknown-436-contrast`, `contrast-2/435/not-found.txt`, 5 closing lines:

```text
folded  p "ขออภัย"  9.60:1 at 375 and 320 px
folded  h1 "ไม่พบหน้าที่คุณต้องการ"  6.27:1 at 375 px
folded  p "ที่อยู่นี้อาจพิมพ์ไม่ถูกต้อง ห"  6.36:1 at 375 px
folded  a "กลับไปหน้าแรก"  6.81:1 at 320 px
folded  a "ติดต่อเรา"  6.63:1 at 375 and 320 px
```

### Focus rings

`scripts/measure-focus-contrast.ts` at the five widths, every run exit 0.

**The rows' rings** (#434's selectors, `main article a >> nth=0` and `nth=1` on "สุขภาพ"): in the
first round, at `6c9731d`, equal line for line to #434's own (`diff`, 0 lines), and in the second,
at `0015f4f`, to the first round's (0 lines):
under the ring 5.39:1 at the lowest at every width, 0 % of its pixels under 3:1; beside it 6.07:1,
and 5.96:1 for the second row at 375 px.

**The search pill's ring** (#436; `main form[role=search] input` and `… button` on
`/search?q=สุขภาพ`, `/` and `/songhealth-unknown-436-focus-ring`; the script reads the ring an
ancestor draws around an element without its own since `0015f4f`, `.tmp/436/runs/focus-ring-pill-2.txt`),
the same lines as at `8595394` (`.tmp/436/runs/focus-ring-pill.txt`) but the Homepage's at 320 px,
whose lowest readings under and beside the ring swap, 4.65:1 and 4.70:1:

- the pill's `accent-warm` ring with the field focused, against the field under it: 4.09:1 at the
  lowest (`/search` at 375 px), 0 % of its pixels under 3:1 on every page at every width;
- beside it, with focus: 3.66:1 or more on `/search`, 3.67:1 on the 404 page, 3.36:1 on the
  Homepage at 768 px and 4.65:1 or more at 375 and 320 px; on the Homepage at 1,440 and 1,024 px
  2.13:1 and 2.17:1, 0 % and 1 % of the ring's neighbours under 3:1, with 32 and 38 px of the ring
  not in its colour: there the pill lies at a fractional position in the window the script scrolls
  it to (465.70 and 466.39 px down), so its white edge blends into the 2 px between it and the
  ring (at 375 px at 344 px, and on `/search` at 1,440 px at 350 px);
- the button's own `brand-primary` ring: 6.45:1 under it everywhere; beside it 6.07:1 or more but
  on the Homepage at 1,440, 1,024 and 768 px, 3.91:1, 3.32:1 and 3.57:1, 0 % under 3:1.

`DESIGN.md` §3.2 records these readings.

## Spec #432's decisions and the decisions made while the tickets were built

Spec #432 lists eleven decisions and the seams that the Product Owner made before it (#432 comment
7121642793: the grill's eleven questions, in two rounds, each answered "ตามที่แนะนำ"; the
prototype's three picks and the seams through the session's question tool, each the
"(Recommended)" option); `docs/design/DESIGN.md` §10 lists them. Every decision made while the
tickets were built has a recorded answer on its ticket, and §10 cites each one:

| Ticket | Decision | Answer |
| --- | --- | --- |
| #433 | The label over a heading draws its slashes in CSS, and assistive technology reads them ("/ค้นหา/"), on every page since Feature 008 | option ก, "ตามที่แนะนำ": no Feature 015 ticket changes it, and a separate issue opens after the feature's release to hide the slashes across the site (comment 7123324643) |
| #434 | A result's row under the pointer with reduced motion preferred | as the Health Report row, "(Recommended)": the title and the circle change, the `card` shadow stays and the row keeps still (comment 7124814084, item 1) |
| #434 | The row that is one link | one shared row (`LinkRow`) for the Announcement's, the Health Report's and a result's rows, each looking as it did, "(Recommended)" (comment 7124814084, item 2) |
| #436 | The search field's border under focus, which the Product Owner asked to fix in the walkthrough | option A, "(Recommended)": the field shows no ring of its own and the whole pill takes the `accent-warm` ring 2 px outside it, the button keeping its `brand-primary` ring; fixed in #436 before the hand-off, "(Recommended)" (comment 7135305142) |

#435 had no decision of its own: it followed spec #432's and #433's (PR #441 "Decisions").

Still open, each outside Feature 015:

- **The label's slashes:** the issue #433 comment 7123324643 asks for opens after the feature's
  release; `DESIGN.md` §10 keeps the limit until then.
- **#277**, the redesigned pages on a real phone and in browsers other than Chromium, inside
  #238's UAT window: Feature 015's pages join that visit.
- **#353**, **#322**, **#409**, **#410**, **#411**, **#380** and **#383**, kept by earlier features
  and out of spec #432's scope ("Out of Scope").
- **A site-wide 500 page**, decided with the production track (spec #432 decision 7).

With this feature every public page follows the Homepage as built, which the Product Owner set as
the condition for the production track on 2026-11-15 (spec #432 "Further Notes").

## The tickets' frontend gates

Each ticket's gate (CLAUDE.md "Frontend Design & Quality") is self-review, recorded in its pull
request. This round ran none of #433's to #435's again; #436's own gate covers the pill's focus
ring, the one page change #436 makes:

- #433 (PR #437), at `29a266d`: critique 28/40, audit 16/20, the guidelines with no defect;
  `impeccable detect` `[]` on `search.astro`, `SearchPill`, `ListHeading` and `HomeHero`; the
  overlay's `radial-halo` on the deep field, which `.impeccable/critique/ignore.md` drops, a
  `straggler` in the nothing-found hint, whose words decision 1 keeps, and two on the result cards
  #434 replaced; Playwright MCP: the focus order from the skip link through the field, its button,
  the eight group links and the results, each stop's ring visible; no sideways scroll at 320 or
  375 px in the start, found, nothing-found, too-short and group-at-0 states and with a
  100-character query; the first result at 628 px at 375 px; the pill 540 px wide at 1,023 px and
  640 px at 1,024 px; Enter sending `/search?q=…` alone.
- #434 (PR #439), at `6361458`: critique 20/28 with three heuristics not applicable, audit 17/20,
  the guidelines with no defect in scope; `detect` `[]` on the five changed components; the
  overlay's `radial-halo` (ignored), four `unbalanced-heading` on result titles at 375 px and three
  `straggler` on snippets, short last lines the Product Owner kept as built (#339 comment
  6943764346, #340 comment 6947302659, #368 comment 7028435491); Playwright MCP: each row one tab
  stop named by its title, its ring the lists' banded one; no sideways scroll at 320 or 375 px; the
  first result at 628 px at 375 px; under the pointer with reduced motion the colours alone, with
  motion allowed the 10 px move and the `deep` shadow; presses on the tile and the lower corner
  open the result; the Homepage's Announcement rows and `/health/reports`' rows as they were.
- #435 (PR #441), at `0fed055`: critique 31/40, audit 19/20 (its one point, the optional
  `crumbs`, fixed in `89e7933`), the guidelines with no defect in scope; `detect` `[]` on
  `404.astro`, `ListHeading` and `FieldLinks`; the overlay's `radial-halo` alone (ignored);
  Playwright MCP at 320, 375, 639, 640, 1,023, 1,024 and 1,440 px: every gap the spec gives, the
  pill as wide as its column up to 540 and 640 px, the two links on one row, 24 px apart and 44 px
  high, the tab order from the pill's field to its button and the two links, each ring visible and
  whole, no sideways scroll at 320 or 375 px, and Enter on "วัคซีน" opening `/search?q=วัคซีน`.
- #436, at `8595394` (agent A: critique, audit and the guidelines) and at `0015f4f` (agent B:
  `impeccable detect` and Playwright MCP): critique, scoped to the ring, 14/16; audit 19/20; the
  guidelines with one defect in scope, the field's reset applied in every browser while the pill's
  ring needs `:has()`, so a browser without it showed no indicator on the field, fixed in `38a25b0`
  (`supports-[selector(:has(a))]:`); the field without `autocomplete`, a placeholder without "…" and
  Chromium's blue cancel "×", each before #436, kept; `detect` `[]` on `SearchPill.astro`, and on
  `/`, `/search` with and without a query the overlay's `radial-halo` alone (ignored), with on `/`
  two `straggler`, two `nested-cards` and a `low-contrast` 4.1:1 on the Services label "บริการ",
  none of them the ring's (the label reads 7.38:1 or more by its pixels, `surface-base` on the
  field); the CLI does not scan a page that answers 404, and the overlay found `radial-halo` alone
  there; Playwright MCP at 320, 375, 768, 1,024 and 1,440 px on the four pages: the pill's ring 3
  px wide and 2 px outside it, whole all round, from Tab and from a click, nothing clipping it, the
  button's own ring and none around the pill when it has focus, the tab order unchanged, no
  sideways scroll at 320 or 375 px with the field focused, and no content within the ring's band.

## Walkthrough

After the 404 log was cleared (13:11Z), the Product Owner was given these steps in the session,
each with its full address, with the list under "What the evidence does not cover" in the same
question:

1. `/search` at start;
2. "สุขภาพ" found, its page 2, a group at 0 (`&group=ita`) and a page past the last (`&page=9`);
3. every kind, "ตัวอย่าง";
4. too short, "ก", and nothing found, "zzzzqq";
5. the 404 page on `/songhealth-unknown-436-walkthrough`, a search from its pill, and its two links;
6. steps 1 to 5 at 375 px in the browser's device mode;
7. the before and after screenshots on `evidence/015-436-screenshots`.

The Product Owner chose all four groups (steps 1 to 4, 5, 6, 7) as opened, with the note "ช่วยแก้ไข
เรื่อง input focus แล้วมีขอบ border" (fix the border the field shows under focus), answered "ผ่าน"
(pass) and accepted every coverage gap below, "ยอมรับตามรายการ (Recommended)" (#436 comment
7135305142).

**The field's border under focus.** The search pill's field, on the Homepage, `/search` and the
404 page, drew the page's `brand-primary` ring around its text box inside the white pill, on a
click as on Tab. The Product Owner was shown close-ups at 1,440 and 375 px on the three pages of
the ring as built and of two looks added in the browser, A (the field's ring gone and the whole
pill taking the `accent-warm` ring of the other parts on the field, 2 px outside it) and B (the
field's ring gone and the pill's edge drawn in `brand-primary` inside its white), and chose A,
fixed in #436 before the hand-off, each the "(Recommended)" option. #436 built it test first: red
at `6c9731d`, the three cases failing at their last assertion on the field's own ring; green at
`8595394` and again at `0015f4f`, with `/search`'s axe and focus walks (7 passed each time). The
second round ran at `0015f4f`.

**What the app's log shows of the walkthrough** (`scripts/dev-runtime-opened.ts` from 13:11:56Z
with `--expect /search /songhealth-unknown-436-walkthrough / /contact`, read at 13:17:45Z): nine
`/search` requests between 13:15:00Z and 13:15:55Z, then the 404 page at 13:16:10Z; neither `/`
beyond the health check nor `/contact` after it, and no `/search` after the 404 page. (The script
lists the 404 page as "not opened" both times: it does not count a 404 answer as opened, and its
lines show the answers.)
Asked, the Product Owner answered "จะเปิดตอนนี้ (Recommended)" (opening them now); read again at
13:31:07Z, the log shows the 404 page at 13:21:53Z, `/contact` at 13:21:57Z and `/` beyond the
health check between 13:21:49Z and 13:22:05Z. No `/search` follows the 404 page, so the search from
its pill is not shown as opened; `public-shell.spec.ts`' "its search pill is the site's…" sends a
query from it by Enter and by the button in every full run. The log holds no query string and no
window width, so it shows neither which `/search` states were opened nor a second visit for step 6;
those rest on the Product Owner's answer.

## What the evidence does not cover

Written before the walkthrough was asked for, and listed whole beside its question; the Product
Owner accepted it (#436 comment 7135305142):

- **The failed search.** A search whose read fails answers 500 and shows "ขออภัย
  ระบบค้นหาขัดข้องชั่วคราว" with its hint and the five browse links. The development runtime cannot
  make a read fail, so no capture, reading or walkthrough step of this round shows it. Its outcome
  is driven in node:test, `tests/node/public-search.test.ts` "searchOutcome": "fails the whole
  search when a collection's read answers an error, rather than show the rest", "fails the search
  when a read throws" and "fails the search when matching fails" (CODING_STANDARDS "Tests"; spec
  #432 "Testing Decisions"). Its look is the nothing-found block's: `src/pages/search.astro` gives
  both states one `EmptyState` over the field's edge with the same links, each state its own two
  sentences, and the nothing-found state is in this round's captures and readings.
- **Browsers other than Chromium, and a real phone or touch:** every suite, capture and measure ran
  in Playwright's Chromium, and the runtime answers on `127.0.0.1` only, so the phone steps are the
  browser's device mode. #277 visits the redesigned pages inside #238's UAT window.
- **Real content:** the runtime holds the demo dataset (spec #432 "Testing Decisions"). A result
  without a snippet, a 175-character title and an expired Document are seen only through
  `scripts/screenshot-fixtures/search-cases.ts`' `content` case (`search-rows`), and the 404 page
  on the address `/no-such-page` alone. The office's own content reaches the runtime only with the
  migration, and with it the first result's place for "สุขภาพ", which this round measured on the
  demo dataset.
- **The shared pieces on pages outside the captures:** since #434 the Announcement rows on
  `/announcements` and the Health Report rows on `/health/reports` render through the same row as
  a result's (`LinkRow`), and since #435 `/services`' links under its lead through the 404 page's
  (`FieldLinks`). The round's captures hold neither `/announcements`, `/health/reports` nor
  `/services` (the note from #434); `public-announcements.spec.ts`, `public-health.spec.ts` and
  `public-services.spec.ts` read them in this round's full run. The Homepage's Current
  Announcements, which share the row too, are in the `home` captures.
- **Every address that answers the 404:** the captures and readings show an unknown address. A
  draft's, an unpublished and a trashed entry's address show the same page: every suite's case of
  them reads the 404 page's whole `main` against `NOT_FOUND_CONTENT` through `expectSiteNotFound`
  (the note from #435), in this round's full run.
- **The pointer and focus:** the captures show every page at rest. A row under the pointer (the
  title and the circle, and with motion allowed the `deep` shadow and the 10 px move), the
  groups' links under the pointer, the pill's button growing, and every focus ring are read by the
  suites (`public-search.spec.ts`, `public-shell.spec.ts`); no capture of this round shows them.
  The focus rings measured in this round are the first two result rows' on "สุขภาพ", with the
  selectors #434 read.
- **Motion:** the captures prefer reduced motion. The heading block, the lead or the 404 page's
  sentence and the pill rising in, and the rows' reveal, are read by the suites' motion cases. The
  runtime serves the stylesheet unminified; `npm run build:check` reads the built stylesheets, and
  the look of a built page with motion allowed is due with the feature's first production image
  (`scripts/production-image-check.sh`, #276).
- **Without JavaScript:** both pages whole and the pill sending its query are read by the suites'
  cases with JavaScript off (`public-search.spec.ts`, `public-shell.spec.ts`); the walkthrough
  runs with it on.
- **A screen reader:** no run of this round uses one. The suites read the landmarks, the headings,
  the names and the order from the accessibility tree, and axe each state at both viewports; the
  label over a heading reads with its slashes there ("/ค้นหา/", "/ขออภัย/"), as on every page since
  Feature 008 (#433 comment 7123324643, "What was kept as it is").
- **The Admin:** the feature changes no model, field or Admin screen, so the walkthrough has no
  Admin step and the round no Admin capture.
- **Forced colours** (Windows High Contrast): no run of this round emulates them.
- **Text at 200 %:** no run of this round enlarges text.
- **Keyboard passes by hand:** each ticket's frontend gate tabbed through its own pages at its own
  promoted commit; this round runs the suites' axe and focus checks and no pass by hand.
- **Print:** no run of the round prints a page.
- **The frontend gate:** each ticket ran its own on its promoted commit; this round runs none
  again, as #436 changes no page.
- **The before screenshots as a control of this round:** the 11 cases of the feature's before set
  are #433's, taken at `0c8d3b7` on `main` before the feature's first promotion (the note from
  #433).

**After the walkthrough.** The change the walkthrough asked for alters two of these lines, and
adds two:

- **The pointer and focus** and **the frontend gate:** #436 now changes a page, the search pill's
  focus ring on the Homepage, `/search` and the 404 page, so its own gate ran on it ("The tickets'
  frontend gates"), and close-ups of the ring focused by the keyboard on the three pages at
  1,440, 1,024, 375 and 320 px were taken at `8595394` (`.tmp/436/focus-options/built.mjs`); the
  ring's contrast was measured ("Focus rings"). The captures still show every page at rest.
- **The ring on the built pages:** the Product Owner chose it from close-ups of a prototype (CSS
  added in the browser to the pages at `6c9731d`) and did not walk through it on the built pages;
  the suites read it (`public-search.spec.ts`, `public-shell.spec.ts`,
  `public-homepage-curation.spec.ts`, through `searchPillRings`).
- **A browser without `:has()`:** there the pill draws no ring and the field keeps its own
  (`38a25b0`). No suite runs such a browser; the fallback is read from the built stylesheet alone,
  `@supports selector(:has(a))` holding the field's reset.

## What was kept as it is

Each on the Product Owner's answer or a decision of spec #432, with no follow-up issue but the
first:

- The label over a heading with its CSS slashes, read by assistive technology (#433 comment
  7123324643): the issue after the release takes it up.
- The page's colour between the field and the footer on a window taller than the page: 167 px at
  1,440 px on the 404 page, the page's own 80 px with the rest of the window that the layout's
  `main` fills, as in the prototype's P3 A the Product Owner picked (decision 11; PR #441); `/search`'s
  start state shows it too (the note from #435).
- The gate's findings each ticket's pull request lists as settled by a decision of spec #432 or a
  standing one: on `/search` the group links on four or five rows on a phone, no spinner, no
  visible label and an arrow-only button, the placeholder cut below `sm` and the entrance on every
  search (PR #437); a row about 1,000 px wide from 1,024 px, its title heard as both its H2 and its
  link's name, the shadow moving with the row and no hover colours under keyboard focus (PR #439);
  on the 404 page "กลับไปหน้าแรก" as an underlined link, the links keeping their colour under the
  pointer and showing at once while the pill rises in (PR #441).
- "ประถม|ศึกษา" breaking inside the compound in a demo title at 375 px (PR #439): `ThaiTitle`'s list
  does not hold it, the limit `DESIGN.md` §10 "Thai titles" keeps; a new word is its own request.
- `touch-action: manipulation`, set nowhere on the site, as Feature 014 left it (#420 comment
  7106846593; PR #439).
- #436's gate's findings that were there before #436: the field without `autocomplete` (decision
  1, PR #437) and the placeholder without "…" (spec #432 "The search pill", PR #441); on the
  Homepage the overlay's two `straggler` and two `nested-cards`, the pill's among them, none the
  ring's. Chromium's own cancel "×" in a filled field, in the browser's blue, shows as it did in the
  close-ups the Product Owner chose the ring from; no decision records it, and it goes to the
  Product Owner with the hand-off.

## The prototype

The prototype is on the branch `prototype/search-404` at `15b653e`, outside `main`: its builder
scripts and its record, `docs/prototypes/search-404.md`. Its pages, screenshots, sheets, crops and
contrast readings stay on the development host. Spec #432 "How this differs from the prototype"
names its differences (the states it did not show follow decision 8, the 404 page built on
`/search`'s shell there keeps its own head and status, four widths for its screenshots, every size
a token's); the built pages keep them.

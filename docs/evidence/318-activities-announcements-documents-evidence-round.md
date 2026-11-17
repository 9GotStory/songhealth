# #318 evidence: Feature 010 (the Activities, Announcements and Documents pages) on the development runtime

Feature 010's evidence round (spec #311), run on 2026-11-17 by Claude Code at `47fc28a`, the head
of `010-activities-announcements-documents`, and the Product Owner's walkthrough of 2026-11-17.
This is a self-run record, not an independent review, and not the Product Owner's acceptance,
which the Product Owner gives on #311.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`. It already served
  `47fc28a`, the merge of #317's retro (PR #333), so this round promoted nothing. No window held it.
  `dev-runtime-verify.sh` reported VERIFY: PASS at `47fc28a533c9b276189ed1a080dfa15d52cdcda5`
  before the round (00:20Z) and after the walkthrough (02:15Z).
- **Code under test:** `47fc28a`. #318's branch adds documents over it, so its head has
  `47fc28a`'s application code. Node 26.13.0.
- **Content:** the demo dataset, 56 entries, all published, and each capture's and each measure's
  own synthetic fixtures, which it removes.

## Checks

The browser suites ran at `47fc28a` between 00:20Z and 00:51Z on 2026-11-17, T021 at 00:51Z, the
captures between 00:52Z and 00:55Z and the measures between 00:56Z and 01:19Z, and one more at 02:16Z. The local checks ran on #318's
working tree at 02:17Z, before the review. The pull request
states the checks at its head.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | exit 0: 0 errors, 0 warnings, 2 hints |
| Node seam | `npm run test:node` | 815 of 815 passed |
| Build | `npm run build:check` | exit 0; `check-built-styles: PASS (2 stylesheets, the reveal in 1)` |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | each exit 0; jscpd's baseline unchanged at 21 clones |
| Browser seam | `scripts/dev-runtime-env.sh npm run test:browser` | 659 passed, 14 skipped, in 30.7 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | source identity verified at `47fc28a`; 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 46 misses, all synthetic; 56 entries, 0 not published; 0 database connection errors in the last hour |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | cleared before the walkthrough (01:21Z) |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator;
the coordinator ran those 14 at 00:51Z. No test of the full run failed. The run's near-timeout
report named one test at 60 % or more of its 30 s, `public-demo-dataset.spec.ts`'s axe and focus
case on the dataset's list pages at the desktop width, at 21.0 s; it passed. The note from #316
records a full run of that ticket in which one Homepage suite failed on Office Contact values an
earlier run had left; #316's retro made the demo dataset's `add` repair them (`8e35c98`), and this
round's run had no such failure.

## Screenshots

After, at `47fc28a`, with reduced motion preferred, so the pages show at rest:

```text
node scripts/capture-screenshots.mjs <dir> after-<name>-<width>=<path>@<width>   # the demo dataset
LIST=<list> LIST_COUNT=<n> scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/lists-by-count.ts <dir>                               # the synthetic cases
```

Before: the feature's first ticket's, the 90 images on `evidence/010-312-screenshots` at
`1bae97a`, taken at `bd3c33f` on `main` before the feature's first promotion with the same
commands, targets and counts (the note from #312). This round captured the same 18 cases at the
same five widths: the five addresses on the demo dataset (`/activities`, `/announcements`,
`/documents`, an open and a closed Announcement's page, a current and a superseded Document's
page), and with `lists-by-count.ts` one, two, four and 24 Activities (and the second page), 40
Announcements (and the second page), and 40 Documents (and the second page, and the pages of an
expired Document and of one whose file cannot be served). Between `bd3c33f` and `47fc28a` the demo
dataset's content did not change: `bf70e05` and `8e35c98` changed a comment and how `add` repairs
Office Contact. The synthetic titles and slugs are made again on each run.

`scripts/evidence-branch.sh` put the 180 images and their `captures.txt` on the image-only branch
`evidence/010-318-screenshots`, at `29f5171afa63dc020802a6e85190f9d0923c98f5`. Page heights in
pixels, the table that script printed from the PNGs (a `-list-<n>` case is `lists-by-count.ts`
with that many entries; `document-expired` and `document-file-gone` are its synthetic pages):

| Page | | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `activities` | before | 1,493 | 1,469 | 1,991 | 2,928 | 3,117 |
| | after | 1,801 | 1,785 | 1,825 | 1,573 | 1,729 |
| `activities-list-1` | before | 966 | 924 | 978 | 1,007 | 1,158 |
| | after | 1,041 | 1,041 | 1,019 | 957 | 1,113 |
| `activities-list-2` | before | 1,102 | 1,128 | 1,148 | 1,587 | 1,767 |
| | after | 1,015 | 993 | 1,437 | 1,111 | 1,267 |
| `activities-list-24` | before | 2,477 | 2,478 | 3,355 | 5,789 | 6,046 |
| | after | 2,723 | 2,593 | 3,402 | 2,685 | 2,841 |
| `activities-list-24-page-2` | before | 2,341 | 2,308 | 3,219 | 5,653 | 5,876 |
| | after | 2,285 | 2,197 | 3,018 | 2,525 | 2,681 |
| `activities-list-4` | before | 1,475 | 1,459 | 1,560 | 2,346 | 2,525 |
| | after | 1,781 | 1,695 | 1,775 | 1,363 | 1,555 |
| `announcement-closed` | before | 900 | 900 | 905 | 1,049 | 1,209 |
| | after | 907 | 907 | 919 | 1,055 | 1,215 |
| `announcement-open` | before | 1,355 | 1,355 | 1,405 | 1,759 | 1,935 |
| | after | 1,449 | 1,449 | 1,501 | 1,769 | 1,925 |
| `announcements` | before | 1,231 | 1,231 | 1,263 | 1,469 | 1,685 |
| | after | 1,297 | 1,297 | 1,361 | 1,379 | 1,631 |
| `announcements-list-40` | before | 3,377 | 3,377 | 3,409 | 4,211 | 4,547 |
| | after | 3,529 | 3,529 | 3,567 | 3,649 | 4,165 |
| `announcements-list-40-page-2` | before | 3,407 | 3,407 | 3,439 | 4,109 | 4,385 |
| | after | 3,503 | 3,503 | 3,541 | 3,633 | 4,197 |
| `document` | before | 917 | 917 | 937 | 1,085 | 1,211 |
| | after | 974 | 974 | 994 | 1,170 | 1,312 |
| `document-expired` | before | 1,129 | 1,153 | 1,111 | 1,285 | 1,445 |
| | after | 1,230 | 1,230 | 1,168 | 1,370 | 1,530 |
| `document-file-gone` | before | 965 | 965 | 985 | 1,107 | 1,293 |
| | after | 1,016 | 1,016 | 1,036 | 1,176 | 1,336 |
| `document-superseded` | before | 1,111 | 1,111 | 1,073 | 1,337 | 1,489 |
| | after | 1,176 | 1,176 | 1,130 | 1,422 | 1,590 |
| `documents` | before | 2,623 | 2,683 | 2,743 | 3,689 | 4,095 |
| | after | 2,309 | 2,441 | 3,141 | 3,141 | 3,297 |
| `documents-list-40` | before | 4,143 | 4,203 | 4,263 | 5,531 | 5,997 |
| | after | 3,693 | 3,753 | 4,915 | 4,821 | 4,977 |
| `documents-list-40-page-2` | before | 4,111 | 4,171 | 4,231 | 5,439 | 5,885 |
| | after | 3,647 | 3,707 | 4,893 | 4,797 | 4,953 |

The after heights of an Announcement's two pages equal the note from #316's, and those of 40
Documents at 1,440, 375 and 320 px the note from #315's.

## Contrast

`scripts/measure-text-contrast.ts --all-text <path> main` at `47fc28a`, at 1,440, 1,024, 768, 375
and 320 px, every run exit 0: every text in `main` on the seven demo addresses below and on five
synthetic cases, 18 to 109 texts a run. Small text needs 4.5:1 and large text 3:1 (WCAG 2.2 SC
1.4.3). The lowest reading of every text on every run is 4.97:1 or more. The tables give each kind
of text's lowest reading over the run's items, from the runs' closing `lowest` lines, with the
width it was read at; "every" is all five.

**On the field under a list's heading**, the demo dataset:

| Text | `/activities` | `/announcements` | `/documents` |
| --- | ---: | ---: | ---: |
| The breadcrumb's links | 9.73 (320) | 9.73 (320) | 10.70 (375, 320) |
| The breadcrumb's current page | 8.96 (320) | 8.97 (320) | 9.33 (320) |
| The label | 8.48 (320) | 8.49 (320) | 8.60 (375, 320) |
| The H1 | 8.14 (320) | 8.26 (320) | 7.39 (320) |
| The lead | 6.44 (320) | 6.36 (375) | 6.27 (375) |

`/documents`' filter form: its labels 16.54 and "แสดงผล" 6.45, every width.

**The Activities list's cards**, the demo dataset's five Activities, and the newest over a white
picture (`--fixtures scripts/screenshot-fixtures/activities-list-light-picture.ts`) and without one
(the same with `ACTIVITY_PICTURE=none`):

| Text | Demo dataset | White picture | No picture |
| --- | ---: | ---: | ---: |
| The large card's date pill | 7.75 (every) | 7.75 (every) | 7.75 (every) |
| The large card's place | 7.17 (768) | 6.24 (1,440, 768) | 11.15 (768) |
| The large card's title | 7.06 (1,440) | 6.74 (1,440, 768) | 11.12 (768) |
| The large card's summary (from 640 px) | 8.84 | 8.98 | 11.73 (768) |
| A small card's date | 6.45 (every) | 6.45 | 6.45 |
| A small card's dot and place | 4.97 (every) | 4.97 | 4.97 |
| A small card's title | 16.54 | 16.54 | 16.54 |
| A small card's summary (from 640 px) | 4.97 | 4.97 | 4.97 |

**The Announcements list's rows**, the demo dataset and `lists-by-count.ts` with
`LIST=announcements LIST_COUNT=8` (open, not yet open, closed and undated rows, the three
badges):

| Text | Lowest |
| --- | ---: |
| A current tile's day | 7.79 (375, 320) |
| A current tile's month and year | 5.37 (375, 320) |
| A closed tile's month and year, and "ปิดแล้ว" | 13.85 (every) |
| The type badges | 5.78 to 7.75 (every) |
| The title | 16.54 (every) |
| "เปิดอยู่" / "ยังไม่เปิด" | 6.45 / 7.75 (every) |
| The status line's dates | 4.97 (every) |

**The Documents list's rows**, the demo dataset's eleven and `lists-by-count.ts` with
`LIST=documents LIST_COUNT=8` (current, expired and file-gone rows):

| Text | Lowest |
| --- | ---: |
| The tile's "PDF" / "ไฟล์" | 5.60 (375, 320) / 5.68 (every) |
| The facts line (type, dots, date, fiscal year) | 4.97 (every) |
| "หมดอายุแล้ว" / "ถูกแทนที่แล้ว" | 7.75 (every) |
| The title | 16.54 (every) |
| The summary (from 640 px) | 4.97 (1,440 to 768) |
| The download's words | 6.45 (every) |
| "ไฟล์ไม่พร้อมให้บริการ" | 4.97 (every) |

**An Announcement's and a Document's page**, the demo dataset's open and closed Announcement, a
current and a superseded Document, and `lists-by-count.ts`'s expired and file-gone Documents
(`LIST=documents LIST_COUNT=3`, `fixture:document-expired`, `fixture:document-file-gone`):

| Text | Open | Closed | Current | Superseded | Expired | File gone |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| The breadcrumb's links | 8.84 (320) | 8.84 (375, 320) | 9.34 (320) | 9.60 (320) | 9.87 (375, 320) | 9.34 (320) |
| The breadcrumb's current page | 5.27 (375) | 5.34 (320) | 5.48 (320) | 5.48 (375) | 5.48 (375) | 5.86 (320) |
| The pills | 7.71 (320) | 7.60 (320) | 9.34 (320) | 7.75 (every) | 7.75 (every) | 9.73 (320) |
| The H1 | 6.45 (1,024, 375, 320) | 6.36 (320) | 6.27 (320) | 6.45 (768) | 6.45 (768, 320) | 6.45 (768) |
| The summary | — | — | 6.45 (375, 320) | 6.45 | 6.45 | 6.45 |
| The card's terms / values | 4.97 / 16.54 | 4.97 / 16.54 | 4.97 / 16.54 | 4.97 / 16.54 | 4.97 / 16.54 | 4.97 / 16.54 |
| The status in the card | 6.45 | 13.85 | — | — | — | — |
| "ไฟล์เอกสาร", its type and size | — | — | 12.21, 4.97 | 12.21, 4.97 | 12.21, 4.97 | 12.21 |
| The tile's "PDF" / the download's words | 5.60 (375, 320) / 6.45 | — | 5.60 / 6.45 | 5.60 (768) / 6.45 | 5.60 (375, 320) / 6.45 | — |

"เผยแพร่" and its date read 7.75 on both Announcements, every width. On the open one, "เอกสารที่เกี่ยวข้อง"'s
label reads 6.09 and its H2 15.47 (375, 320), and the related row's texts are the Document row's.
The file-gone page's notice reads 10.94, its sentence 5.07 and its link "ติดต่อเรา" 5.78; the
superseded page's successor note 10.56 and its link 5.58 (768, 375, 320). A Post page's body text
on the Announcement reads 11.52 or more.

Every text reading the notes on #318 give is read the same at `47fc28a`: #312's field at `8643ef1`,
#313's cards at `bf70e05`, #314's rows at `2cb2e11`, #315's rows at `fac3acd`, #316's pages at
`9ad820f` and #317's at `b42cb51`. Of the notes' focus readings, the form select's ring (6.45:1, the note
from #312) was not read again, and the breadcrumb's second link on an Announcement's page reads
6.01:1 at 320 px, under the note from #316's "Focus rings read 6.07:1 or more"; `DESIGN.md` §9.4 now gives it.

**Focus rings**, `scripts/measure-focus-contrast.ts` at `47fc28a`, the lowest contrast beside the
ring with focus (WCAG 2.2 SC 1.4.11, 3:1), with the share of the ring's neighbours under 3:1:

- `/activities`, the first card (over the field's edge): 5.51 (1,440), 4.06 (1,024), 5.47 (768, 375,
  320), 0 % under 3:1; the second card: 5.47, **2.97 (1,024, 24 px of the ring not in its colour)**,
  5.09, 6.20, 6.07, 0 % under 3:1. Under the ring alone the field reads down to 1.00:1, which the
  band is for;
- `/announcements` (`LIST_COUNT=8`), the first row: 5.40 to 5.47, the second 6.07, every width;
- `/documents` (`LIST_COUNT=8`), the first row's title 6.45 and its download 6.07 (6.45 under the
  ring), every width;
- the open Announcement's related row: its title 6.45 and its download 6.07 (6.45 under the ring),
  every width; the breadcrumb's first two links, whose `accent-warm` rings lie on the field, 6.61
  and 6.01 or more;
- a Document's page, the download: 5.38 (1,024) or more, 6.45 under the ring;
- the superseded Document's successor link, unchanged by the feature: 4.83 to 5.42 under the ring;
  beside it 1.00 to 1.21 at its lowest, with 0 % (1,440 to 768), 1 % (375) and 2 % (320) of its
  neighbours under 3:1, where the link's own text meets the ring.

## Spec #311's decisions and the decisions made while the tickets were built

Spec #311 listed no pending confirmation. Every decision made while the tickets were built has a
recorded answer on its ticket, and `docs/design/DESIGN.md` §10 and §13 cite each one that decides
what a page shows:

| Ticket | Decision | Answer |
| --- | --- | --- |
| #312 | The white band beside the focus ring of an Activity card over the field | Kept, as a News card has it (comment 6897891014) |
| #313 | The second list card's ring at 1,024 px, partly covered on `/activities` and `/news` | B: left as built, followed up in #322 outside the feature (comment 6903865541) |
| #313 | After the critique: a small card's place below 640 px, a mark before the place, the large card's layouts | One line; no mark; as `/news` (comment 6905240669) |
| #314 | A closed row's type badge | "A. คงสีเดิม (แนะนำ)" (comment 6906496480) |
| #315 | The row's title colour and size; where the pointer changes it | `text-primary` as the Announcement row's; on its own link only (comment 6908747140) |
| #315 | The download on a superseded or expired row | "A. Keep it as built", the full pill (comment 6909993217) |
| #316 | The field's height with no card | "40 / 48 px (แนะนำ)" (comment 6912742335) |
| #316 | A closed Announcement's status, the card's details, "เอกสารที่เกี่ยวข้อง"'s heading; the stopped-short reporter | A on each; the reporter to #329 (comment 6913757888) |
| #317 | The successor's note, the status in two places, the H2 above the unavailable notice, a download on two lines | A on all four (comment 6918054121) |

Still open:

- **#322**, the second list card's focus ring at 1,024 px on `/activities` and `/news` (the
  Contrast section), outside the feature.
- **#277**, the redesigned pages on a real phone and in browsers other than Chromium, inside
  #238's UAT window: Feature 010's pages join that visit.

## The tickets' frontend gates

Each ticket's gate (CLAUDE.md "Frontend Design & Quality") is self-review, recorded on its ticket
or in its pull request; this round ran none again, as #318 changes no page:

- #313: run after its merge (#313 comment 6905240669), critique 32/40 and audit 17/20; the
  detector's `radial-halo` on the deep field is a false positive against §7.8 and is listed in
  `.impeccable/critique/ignore.md`. From #314 on the gate ran inside each ticket before its review.
- #314: `impeccable detect`'s `low-contrast` on a current tile's month reads the gradient's lightest
  stop, 4.1:1, where the measure reads 5.37:1; it is in `ignore.md` (the note from #314).
- #315: critique 22/32, audit 17/20, and the same detector finding on the tile's type (the note
  from #315).
- #316: critique 24/32, audit 20/20 (the note from #316).
- #317: its critique and audit, and the limits they found, are in the note from #317 and under
  "What the evidence does not cover".

## Walkthrough

After the 404 log was cleared (01:21Z), the Product Owner was given these steps in the session,
each with its full address, with the list under "What the evidence does not cover" and the
follow-up of `DocumentDownload.astro` (the note from #317) in the same question:

1. `/activities` on a desktop with motion allowed: the heading on the field, the large card, the
   cards' reveal and hover;
2. `/announcements`, a closed row in grey, then the open Announcement
   (`/announcements/demo-announcement-vhv-recruitment`: the card over the field's edge, the related
   Documents and their download) and the closed one (`/announcements/demo-announcement-quit-smoking-1`);
3. `/documents`, the filter form over the field's edge, the rows, a filter by type, then a current
   Document (`/documents/demo-document-vhv-application`, its file first in the card) and the
   superseded one (`/documents/demo-document-plan-2569`, its successor);
4. steps 1 to 3 at 375 px in the browser's device mode;
5. the before and after screenshots of the synthetic cases on `evidence/010-318-screenshots`.

The Product Owner chose all three groups (steps 1 to 3, step 4, step 5) as opened, answered "ผ่าน
ไม่มีอะไรต้องแก้ (แนะนำถ้าไม่เจอปัญหา)", accepted every coverage gap below, "A รับตามนี้ (แนะนำ)", and
chose "A เปิด issue needs-triage (แนะนำ)" for `DocumentDownload.astro`, opened as #334 (#318 comment
6935876072).

**What the app's log shows of the walkthrough** (`scripts/dev-runtime-opened.ts` from 01:21:04Z
with `--expect` and the seven addresses the steps gave, read at 02:15Z): 14 page requests between
02:12:16Z and 02:14:18Z, every one 200: `/activities`, an Activity
(`/activities/demo-activity-health-fair`), `/announcements`, the closed and the open Announcement
and a third (`demo-announcement-flu-vaccine`), `/documents` (five times),
`/documents/demo-document-vhv-application` (twice) and `/documents/demo-document-plan-2569`; none
of the seven addresses unopened. The log holds no query string, so it shows neither the filter
chosen nor a window width; those rest on the Product Owner's answer. After the answers residue
reported RESIDUE: NONE with 0 unmarked misses and the 56 demo entries published, and verify
VERIFY: PASS at `47fc28a` (02:15Z).

## What the evidence does not cover

Written before the walkthrough was asked for, and accepted in its question, "A รับตามนี้ (แนะนำ)"
(#318 comment 6935876072, item 3), where the session listed the last two as one:

- Browsers other than Chromium, and a real phone or touch: every suite, capture and measure ran in
  Playwright's Chromium, and the runtime answers on `127.0.0.1` only, so the phone steps are the
  browser's device mode. #277 visits the redesigned pages inside #238's UAT window.
- The migrated Legacy content: the development runtime holds the demo dataset only, 5 Activities,
  5 Announcements (one closed) and 11 Documents (one superseded), with no expired Document, no file
  that cannot be served, no full page and no second page. Those states, and long titles and places,
  are seen here only through the synthetic fixtures of `scripts/screenshot-fixtures/lists-by-count.ts`
  and `activities-list-light-picture.ts`; a Legacy Activity's portrait One Page is seen through the
  demo dataset's sheets.
- Motion on the built, minified pages: the runtime serves the stylesheet unminified, and the suites
  read it there. `npm run build:check` reads the built stylesheets; the look at a built page with
  motion allowed is due with the feature's first production image (`scripts/production-image-check.sh`,
  #276).
- The before screenshots as a control of this round: they are #312's at `bd3c33f` on `main`, taken
  before the feature's first promotion. Between `bd3c33f` and `47fc28a` the demo dataset changed in
  comments and in how `add` repairs Office Contact (`bf70e05`, `8e35c98`), not in what the five
  pages show.
- The second list card's focus ring at 1,024 px on `/activities` and `/news`: 24 px of the ring are
  not in its colour, 2.97:1 at the lowest, a known limit #322 takes up outside the feature (the
  note from #313; #313 comment 6903865541).
- A place name that the ellipsis cuts below 640 px where its end tells two places apart: no place
  in the demo dataset shows it (the second note from #313; #313 comment 6905240669).
- The H1's lone last word on a page with `PostHeader` (Impeccable `unbalanced-heading`), on an
  Announcement's and a Document's page as on a Post page (the note from #317).
- "ติดต่อเรา" in the unavailable notice on a Document's page is a link about 22 px high inside its
  sentence, as before Feature 010 (the note from #317).
- The successor's link on a superseded Document's page, unchanged by the feature: its ring reads
  4.83:1 against the page under it and 1.00:1 at a few pixels beside it (the note from #317).
- Reduced motion in the walkthrough, and print: the suites prefer reduced motion on every page but
  the tests of motion (`DESIGN.md` §8.12), and no run of the round prints a page.
- The Admin: the feature changes no model, field or Admin screen, so the walkthrough has no Admin
  step.

## The prototype

The prototype is on the branch `prototype/activities-announcements-documents` at `4b8aa22`,
outside `main`: its builder scripts and its record,
`docs/prototypes/activities-announcements-documents.md`. Its data, pages, pictures and screenshots
hold Legacy site content and stay on the development host. Spec #311 "How this differs from the
prototype" names five differences the spec decided (the row's two links, the page's
"ดาวน์โหลดเอกสาร", a current Document's "ฉบับปัจจุบัน" in the card, a small Activity card's line held
to two lines, the download under the text below 1,024 px); the built pages keep each. The spec's
and #313's "16:10" for the old Activity card was a slip: that card cropped 16:9 at every width,
and the list card crops 16:9 from 640 px and 4:3 below (the note from #313). Every further
difference was decided on its ticket (the decisions table above).

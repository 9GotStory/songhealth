# Feature 015 prototype: `/search` and the 404 page

A throwaway prototype for Feature 015, built on 2026-11-24 against `main` at `0c8d3b7`. It lives on
the branch `prototype/search-404` only; `main` keeps the decisions, not the code. It is static HTML
built by a script from the development runtime's own rendering of `/search` (GET requests only), and
the runtime never served it. The 404 page is built on `/search`'s shell, so the prototype made no
request for a missing page (EmDash's 404 log keeps each one).

**It is the source of the look, not of behaviour.** Each rule of the built pages belongs in the
feature's spec, `docs/design/DESIGN.md` and the code, ported from the spec with a test.

## The question

`/search` and the 404 page are the last two public pages not yet in the Bold Modern look of
Features 008 to 014: what should they look like?

The grill before it (Product Owner, 2026-11-24, Q1 to Q11, both rounds answered "ตามที่แนะนำ"):

- presentation only: the matching, ranking, the 8 groups with their counts, `?q=` `?group=`
  `?page=`, 20 per page, `noindex`, the canonical address, the 500 of a failed search, every
  state's words, the snippet's marks, the 404's status and non-disclosure, the model and the Admin
  as they are; `PageHeading` goes once `/search` leaves it (Q1);
- `/search` headed on the deep field as every list: label "ค้นหา", H1 "ค้นหาข้อมูล", `search`, its
  breadcrumb on the field; the head's title and the breadcrumb still read "ค้นหา" (Q2);
- a result is one link over its whole row, as an Announcement's and a Health Report's (Q9);
- the start state shows the heading and the field alone (Q5); with a query the lead is left out,
  and at 375 px the first result starts no lower than its 706 px at `0c8d3b7` (Q10);
- the 404 page takes the site search in place of its "ค้นหาข้อมูล" link and keeps
  "กลับไปหน้าแรก" and "ติดต่อเรา" (Q6), its H1 and sentence, no breadcrumb (Q7), under the label
  "ขออภัย" with `search-x` (Q11);
- a site-wide 500 page is out of scope (Q8); no new `GLOSSARY.md` term, no ADR.

## What was built

`build.mjs` builds five pages, each the runtime's `/search` with its `<main>` once per variant,
switched by `?variant=` and a floating bar:

| Page | Variants |
| --- | --- |
| `/search` start, found ("สุขภาพ", 25 results, 20 on the first page) and nothing ("zzzzqq") | `now` (`main`); **A** the form on a white card over the field's lower edge, as a filter form, holding the groups and the count under a rule once there are results; **B** the Homepage hero's white pill on the field under the heading, the groups and the count on a white card over the edge, the empty state over the edge, nothing over the edge in the start state; found only: **B2** B with the groups on the page's ground and nothing over the edge, **AN** A with rows without the tile |
| every kind's row (14 rows: each kind and each status the demo dataset shows) | **T** the light row tile with the kind's list heading icon (a Basic Page, which has none, `info`); **N** no tile |
| the 404 page | `now` (`main`); **A** a list's heading on the field, the hero's pill, the two links as `/services`' links under the lead; **B** A with a large still "404" on the field in place of the ring |

The row is `HealthReportRow`'s: one link over the whole row, the 20 px arrow from `sm`, the
`deep` shadow and the 10 px shift under the pointer, with the result's facts line, title, snippet
and status as `SearchResultRow` shows them.

- `shoot-all.mjs` captures every page in each variant at 1,440, 1,024, 375 and 320 px with its
  height, any overflow, where the field ends and where the first result starts; `sheets.mjs` lays
  the variants side by side; `crops.mjs` the rows of every kind close up; `contrast.sh` reads every
  text's contrast at the five widths.

The builders ran from `.tmp/prototypes/search-404/` of the clone, where the pages, screenshots,
sheets, crops and readings stay; this branch holds the builders and this record.

## The content

The demo dataset's alone, as the runtime renders it. No Legacy site content.

## Seen while building

From `shots/measures.json` (64 screenshots, none overflowing the window):

- **The first result** (Q10's measure; `now` 560, 706 and 754 px at 1,440, 375 and 320 px): A 553,
  661 and 731; B 536, 628 and 698; B2 544, 628 and 646. Each variant meets Q10.
- **A full first page of results** at 375 px: `now` 5,529 px, A 4,712, B 4,679, AN 4,282. The tile
  costs 430 px over 20 rows there: beside it a title wraps one line more on a phone.
- **The 404 page** at 320 px: A 961 px, B 1,073; below `lg` B's numeral sits above the heading.
- **The search field below `sm`**: A's field sits beside its button and shows the placeholder's
  first words alone; B's pill shows more of it. Neither shows it whole at 375 px, nor does `main`.
- **B's field has no visible label**, as the Homepage hero's: the pill is named "ค้นหาในเว็บไซต์",
  with the search icon and the placeholder; A keeps the visible "คำค้นหา".
- **B on 404** puts a decoration on the field beyond the glow and the ring, which the standing
  decision on a list's field rules out (#281 comment 6847783611, item 2); the 404 is not a list.

From `contrast/` (`scripts/measure-text-contrast.ts --all-text --fold`, the five widths; start,
found and nothing in A and B, the 404 in A and B), the lowest reading of each text:

- **On the field:** the lead 6.45:1 (375 and 320 px), the H1 "ค้นหาข้อมูล" 7.10:1 (found A,
  320 px), the label 8.37:1 (nothing A, 320 px), the breadcrumb's links 10.27:1 and its current page
  9.60:1. The 404: its H1 6.18:1 (A, 375 px), its sentence 6.36:1 (A, 375 px), "ขออภัย" 8.72:1 (B),
  "กลับไปหน้าแรก" and "ติดต่อเรา" 6.63:1. B's "404" is white at 14 % alpha, which the script does
  not read; it is hidden from assistive technology.
- **On white:** a row's facts line and snippet 4.97:1, a title 16.54:1, the group pills 10.94:1 and
  the current one 6.45:1, the empty state's hint 4.97:1 and its links 6.45:1, "หน้าถัดไป" 6.45:1;
  "หน้า 1" on the page's ground 4.69:1. B's field has no text of its own beside the query.
- **A's button "ค้นหา"** reads 6.45:1 in the found and nothing states at every width, but 2.31:1 in
  the start state at 375 and 320 px, where the card's button lies across the field's lower edge;
  its close-up there shows white on `brand-primary` (`rgb(11, 107, 87)`). The low reading is
  unexplained; a built A measures it again.

## The Product Owner's picks

Asked through AskUserQuestion on 2026-11-24, each answer the "(Recommended)" option:

- **P1, the search field's place: B**, the Homepage hero's white pill on the field under the
  heading; with results, the groups and the count on a white card over the field's lower edge; with
  nothing found, the empty state over the edge; in the start state nothing over the edge. Its field
  has no visible label, as the hero's.
- **P2, a result's row: with the tile**, the light row tile holding the kind's list heading icon
  (`info` for a Basic Page).
- **P3, the 404 page: A**, a list's heading on the field ("ขออภัย", `search-x`), the hero's pill,
  and "กลับไปหน้าแรก" and "ติดต่อเรา" as `/services`' links under the lead, without the "404"
  numeral.

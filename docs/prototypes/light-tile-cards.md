# Feature 014 prototype: the light row tile, and `/health`'s and `/about`'s cards

A throwaway prototype for #412, built on 2026-11-23 against `main` at `9a29f44`. It lives on the
branch `prototype/light-tile-cards` only; `main` keeps the decisions, not the code. It is static
HTML built by a script from the development runtime's own rendering (GET requests only), and the
runtime never served it.

**It is the source of the look, not of behaviour.** Each rule of the built pages belongs in the
feature's spec, `docs/design/DESIGN.md` and the code, ported from the spec with a test.

## The question

What should the row's tile look like once it turns light, everywhere it shows, and how do
`/health`'s and `/about`'s destinations look as `/services`' cards (#412)?

The grill before it (Product Owner, 2026-11-23, Q1 to Q11, each round answered "ตามที่แนะนำ"):

- every 68/92 px gradient row tile turns light and shares `RowTile`: FileTile, ItaMoitRow,
  HealthReportRow's copy, AnnouncementRow's open date tile (the Homepage's too) and
  HealthServiceMapRow's hospital; the 48 px gradient tiles of ContentCard's and HomeHealthCard's
  picture-less visual stay (Q1);
- the tile's size and radii stay; it does not change under the pointer (Q3, Q10);
- the cards: HomeServiceCard `kind="list"` as a whole (brand-primary under the pointer, the lift,
  the circle, the tile turning accent-warm, the ring inside, `scroll-reveal`) (Q7); each card's
  icon is its destination's heading icon, `network` for โครงสร้างองค์กร (Q4); a summary, if shown,
  is the destination's lead, the `organization` Basic Page's summary for โครงสร้างองค์กร (Q5);
  `/about` 1/2/3 as `/services`, `/health` 1 below `sm` and 2 from `sm` (Q6);
- the Homepage's Quick Access keeps its tile; `HomeQuickLink`'s list form goes and #408 closes
  with the feature (Q8);
- no new `GLOSSARY.md` term, no ADR.

## What was built

`build.mjs` builds thirteen pages, each the runtime's page with its `<main>` once per variant,
switched by `?variant=` and a floating bar:

| Pages | Variants |
| --- | --- |
| the Homepage, an Announcement's related Documents, `/documents`, a Document, `/about/policies`, `/health/reports`, a Health Report, `/ita/2570`, `/health-services`, a Service's Health Services | `now` (today's gradient); **A** flat `surface-soft`, icon/number/day `brand-primary`, second line `brand-dark`; **B** A's lines on a light gradient `surface-soft` → `plain-visual-to`; **C** A's ground, the second line a `brand-dark` pill on `accent-warm` |
| `/announcements` (open and closed) | as above, a closed tile white with a `border-default` edge and `text-secondary` lines; **A2**, **B2**, **C2** the same with the closed tile kept in `status-closed` |
| `/health`, `/about` | `now` (the Quick Link tiles); **S** the cards with the summary; **N** without; the related Documents' tiles in A |

- `shoot-all.mjs` captures every page in each variant at 1,440, 1,024, 768, 375 and 320 px with
  its height and any overflow; `sheets.mjs` lays the variants side by side; `crops.mjs` the first
  rows or cards close up; `tiles.mjs` one sheet of every tile family per variant at 2×.
- `contrast.sh` reads every text's contrast.

The builders ran from `.tmp/prototypes/light-tile-cards/` of the clone, where the pages,
screenshots, sheets, crops and readings stay; this branch holds the builders and this record.

## The content

The demo dataset's alone, as the runtime renders it. No Legacy site content.

## Seen while building

Readings from `contrast/` (`--all-text --fold`, the five widths) and `shots/measures.json`:

- **A**: the icon, a MOIT's number and an Announcement's day `brand-primary` on `surface-soft`, 5.78:1;
  the second line ("PDF", "MOIT", a report's year, an Announcement's month and year) `brand-dark`,
  10.94:1, at every width.
- **B**: on the light gradient the lowest is a MOIT's number at 375 px, 5.39:1 (an Announcement's
  day 5.41:1); the second line 9.99:1 at the lowest. The gradient barely shows on a white row.
- **C**: the pill's text 7.75:1. Below `sm` the Announcement's 68 px date tile cannot hold its
  "พ.ย. 2569" pill: it wraps to two lines and runs past the tile's lower edge
  (`crops/tiles-375.png`).
- A closed Announcement's tile, white with a `border-default` edge: its day and month in
  `text-secondary` read 4.97:1. Kept in `status-closed` (A2, B2, C2) its text reads 13.85:1, while
  its ground is 1.07:1 from the open tile's `surface-soft`.
- The cards: a summary in `text-secondary-on-soft` reads 5.07:1 at the lowest. Without a summary a
  card from `sm` keeps `/services`' least height, 144 px, and is empty under its name; with one, five
  of `/about`'s six summaries end "ของสำนักงานสาธารณสุขอำเภอสอง". Below `sm` both are the short row
  without a summary.
- The Homepage reads a "4" at 3.26:1 at 1,024 px, outside the tiles (every tile's day reads 5.78:1
  in A); the variants do not change it.
- No page overflows the window at any of the five widths (265 screenshots).

## The Product Owner's picks

Asked through AskUserQuestion on 2026-11-23, each answer the "(Recommended)" option:

- **P1, the tile: A**, flat `surface-soft`, the icon, number or day `brand-primary`, the second
  line `brand-dark`, on every family.
- **P2, a closed Announcement's tile: white with a `border-default` edge**, its lines
  `text-secondary`.
- **P3, `/health`'s and `/about`'s cards: with the summary**, the destination's lead, from `sm`.

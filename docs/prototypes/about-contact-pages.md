# Feature 012 prototype: the About pages, Contact and a Basic Page

A throwaway prototype of the redesign of `/about`, `/about/leadership`, `/about/personnel`,
`/about/policies`, `/about/plans`, `/about/results`, `/about/organization`, `/contact` and
`/pages/{slug}`, built on 2026-11-19. It lives on the branch `prototype/about-contact-pages` only;
`main` keeps the decisions, not the code. It is static HTML built by a script, and the development
runtime never served it.

**It is the source of the look, not of behaviour.** Each rule of the built pages belongs in the
feature's spec, `docs/design/DESIGN.md` and the code, ported from the spec with a test, not from
this code.

## The question

What should the nine routes look like after the Homepage and Features 008 to 011's pages as they
are built in `main` (`DESIGN.md` §7.8, §8, §9)?

The grill before it settled everything but four looks (Product Owner, 2026-11-19, Q1 to Q15, each
answer "ตามที่แนะนำ"):

- the look changes, and every read, order, page size (an About Document page 20), canonical
  address, head tag, preview, 404, the 301 of `/pages/about` and `/pages/organization`, `/about`
  without its Basic Page, the breadcrumbs and the empty states' words stay; the shell, the footer,
  `/ita`'s `QuickLinkCard`, ITA, Search, the 404 page and #353 are out (Q1);
- a Basic Page (`/pages/{slug}`, `/about/organization`, and `/about`, Q8) takes the Post page's
  header on the field (§9.1) with no pills, tile or frame, its body in the 48 rem text column (Q2),
  and its related Documents as Feature 010's section with the downloads, which retires the old
  form and the `downloads` flag (Q3);
- each list page and `/contact` take `ListHeading` (Q4): Leadership "บุคลากร" / "ผู้บริหาร" /
  `user-round`, Personnel "เกี่ยวกับเรา" / "บุคลากร" / `users-round`, Policies, Plans and Results
  "เกี่ยวกับเรา" with `scroll-text`, `clipboard-list`, `chart-column`, Contact "ติดต่อ" / "ติดต่อเรา"
  / `headset`;
- the About Document pages take `DocumentDownloadRow` over the field's edge as `/documents`, with
  no filter form, which retires `DocumentRow` (Q5);
- a plain grid of three, two and one at every count (Q14); a list's empty state over the field's
  edge, and nothing over it where nothing white follows (Q15);
- motion as the lists': the heading rises, tiles, person cards, Document rows and unit panels
  reveal, the rest shows at once (Q13).

## What was built

`build.mjs` builds twenty-three pages, one per case, each holding its variants switched by
`?variant=` and a floating bar:

| Pages | A | B | C |
| --- | --- | --- | --- |
| `/about` (Q9) | the six tiles over the field's edge, then the body and the Documents | the body, then the tiles under a Homepage section heading (`building`, "เกี่ยวกับเรา", "ข้อมูลเกี่ยวกับสำนักงาน"), then the Documents | |
| `/about/leadership` (Q10) | a white card across, the Homepage strip's ringed circle, the first one `accent-warm` | a portrait card, the picture 4:5 on top | the first leader a featured card across the row, the others as A |
| `/about/personnel` (Q11) | a white panel per unit, its people as compact rows inside | the unit's H2 with a `brand-primary` bar, cards as Leadership A, nothing over the edge | as B with portrait cards |
| `/contact` (Q12) | a white card over the edge, a row per detail with a 20 px icon on a soft tile (§9.8) | the Homepage's Contact Summary card with the email and no button, a white ring around it on the field | |

Both `/contact` variants go on with the official channels as white pills under a Homepage section
heading, and the two routes ("ร้องเรียนและเสนอแนะ", "ติดต่อหน่วยบริการสุขภาพ") as white cards side by side
from `sm`. The About Document pages and the Basic Pages have one look each.

The cases: `/about` with the demo page and without one; Leadership 1, 2 (the demo's), 3, 6 and
none; Personnel the demo's 6 in 3 units, 28 in 5 units and none; Policies 2, Plans 2 (one
superseded), Plans a first page of 20 with a next page, Results 1 and none; Contact in full,
without channels and with Office Contact empty; `/about/organization`, `/pages/privacy`, a Basic
Page with related Documents, without a summary, and with neither body nor Documents.

The markup copies the built components' classes (`ListHeading`, `SectionHeading`, `HomeQuickLink`,
`DocumentDownloadRow`, `HomeLeadershipStrip`, `HomeContactCard`, the Post page's header); the
stylesheet is `main`'s `src/styles/global.css` compiled by Tailwind CSS over the built pages
(`@tailwindcss/node` `compile` and `@tailwindcss/oxide` `Scanner`). The header and footer are the
runtime's own markup.

- `extract.mjs` reads the demo dataset (`scripts/demo-dataset/content.ts`) into `data.json`, and
  from the runtime's public pages, with GET requests, each person's picture (saved beside the
  pages, since a `file://` page cannot load the runtime's), each Document's file label, each Basic
  Page's rendered body, the channels and the shell.
- `shoot-all.mjs` captures every case in each variant at 1,440, 1,024, 768, 375 and 320 px with
  each page's height and any overflow (`WIDTHS=` narrows it); `sheets.mjs` lays the variants side
  by side.

## The content

The demo dataset's alone (grill Q6): no Legacy site content. Filler to reach a count is marked
`MADE_UP` in `build.mjs`, every name and title of it "[ตัวอย่าง]": 22 Personnel named "บุคลากรลำดับที่
N" over five units and none (one with the longest name and position), four Leadership "ผู้บริหารลำดับที่
N", eighteen plans; their pictures are the demo's three.

## Seen while building

- The demo's pictures are colour fields without a face, so the circles and the portrait frames
  show colour only; a real portrait crops differently, from its top or its focal point.
- The portrait cards are tall in one column: Leadership's six read 4,180 px at 375 px against
  1,731 px for A, and Personnel's 28 read 17,056 px (C) against 3,851 px (A) and 5,317 px (B).
- Personnel A writes a person's contact under the position without the "ช่องทางติดต่อ" line the
  cards keep.
- `/contact`'s channels heading takes `share-2` and the label "ติดต่อ"; neither was asked in the
  grill.
- `/contact` B's green card lies on the green field, so it has a 4 px white ring to part them.
- No case overflows the window at any of the five widths (`shots/measures.json`).

## The Product Owner's picks

Asked through the session's question tool on 2026-11-19, each answer the option marked
"(Recommended)":

- **P1 `/about`: A**, the six tiles over the field's edge first, then the body and the Documents.
- **P2 Leadership: C**, the first leader in a featured card across the row, the others in card A.
- **P3 Personnel: A**, a white panel per unit with its people as compact rows, with the
  "ช่องทางติดต่อ" line put back over a person's public contact (the builder now writes it).
- **P4 `/contact`: A**, the white card with a row per detail and its icon; the channels' heading
  takes `share-2` and the label "ติดต่อ".

## Contrast of the picks

`contrast.sh` runs `scripts/measure-text-contrast.ts --all-text --fold` at the five widths on
seventeen pages of the picked variants. No text reads under 4.5:1. The lowest: a Basic Page's
summary on the field 4.92:1 (`/about` at 1,024 px, where the list field's ring runs behind it), the
pager's "หน้า N" 4.69:1, the secondary texts on white 4.97:1, a Basic Page's H1 5.34:1 and a
section heading's label on the page's colour 5.76:1.

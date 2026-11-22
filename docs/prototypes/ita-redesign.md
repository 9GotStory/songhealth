# Feature 013 prototype: the ITA landing, a fiscal year's page and a MOIT's page

A throwaway prototype of the redesign of `/ita`, `/ita/{fiscal-year}` and `/ita/{slug}`, built on 2026-11-22 against `main` at `15b519f`. It lives on the branch `prototype/ita-redesign` only; `main` keeps the decisions, not the code. It is static HTML built by a script, and the development runtime never served it.

**It is the source of the look, not of behaviour.** Each rule of the built pages belongs in the feature's spec, `docs/design/DESIGN.md` and the code, ported from the spec with a test, not from this code.

## The question

What should the three ITA pages look like after the Homepage and Features 008 to 012's pages as they are built in `main` (`DESIGN.md` §7.8, §8, §9)?

The grill before it settled everything but four looks (Product Owner, 2026-11-22, Q1 to Q13, each round answered "ตามที่แนะนำ"):

- the look changes, and every read, order, the words of each H1, lead, title and description, canonical address, preview and `noindex`, 404, the rule that tells a year from a slug, the breadcrumbs, the table of contents, the Requirement cards that are open at first and close without JavaScript, the neighbour links within one fiscal year, the empty state's words and how Evidence and unavailable files are counted stay; Search, the 404 page, the shell, the footer and #353 are out; `QuickLinkCard` has no page left and goes (Q1);
- `/ita` and a year's page take `ListHeading` on the list's field: the label "ITA" on both, `shield-check` and `calendar-check`, no pill link (Q2);
- a MOIT's page takes the Post page's header on the post's field (§9.1), keeping the year, "MOIT n" with the title as its H1, the summary and the counts line (Q3); its small text is `surface-base`, and "MOIT n" keeps `accent-warm` only where it reads 3:1 or more at the five widths (Q10, CODING_STANDARDS "Public pages");
- the Evidence pills keep their look (Q4);
- a plain grid of three, two and one for the year tiles at every count, "ยังไม่มีข้อมูล ITA" as a white card over the field's edge, and a MOIT without a Requirement card showing its Evidence after the header (Q9);
- the year in each tile is an H2; the other heading levels stay (Q12);
- motion as the lists': the three headers rise, the year tiles and the MOIT rows reveal, and the MOIT page's body shows at once, since the table of contents jumps into it (Q8);
- the existing seams (`public-ita.spec.ts`, `public-ita-years.spec.ts`, `public-breadcrumb.spec.ts`, `public-homepage.spec.ts` for a shared Homepage piece, node:test on `src/lib`), no new `GLOSSARY.md` term and no ADR (Q7, Q13).

## What was built

`build.mjs` builds ten pages, one per case, each holding its variants switched by `?variant=` and a floating bar:

| Pages | A | B | C | D | E |
| --- | --- | --- | --- | --- | --- |
| `/ita` (Q5) | the Homepage's Quick Access tile over the field's edge, holding "ปีงบประมาณ", the year as an H2 and "ตัวชี้วัด n รายการ" | a large white card: the section heading's gradient tile with `calendar-check`, the year at H2 size, the count in `brand-primary` with an arrow | | | |
| `/ita/{fiscal-year}` (Q5) | a white row per MOIT, as the Document repository's, "MOIT" and its number on the file tile's gradient | today's one white card with divider lines, over the field's edge, the badge a `surface-soft` tile | | | |
| `/ita/{slug}` (Q10, Q11) | today's body under the field; the year a plain `surface-base` label | the table of contents in a white panel and the first card over the field's edge; a Requirement's number on a `surface-soft` tile, a rule under an open card's head; the Evidence before the first Requirement in a white card | B with the year in the Post page header's outlined pill | B with the H1 no larger than H2 size | the pick: B with the pill and the H1 no larger than H2 size |

The cases: `/ita` with one year (the demo's), three years and none; a year with the demo's two MOITs, one MOIT and twenty-two; a MOIT's page for the demo's MOIT 1 (2 Requirements, 7 Evidence, one file unavailable, the first of its year) and MOIT 2 (18 Requirements, 41 Evidence, sub-Requirements, a table of contents taller than the window, the last of its year), a MOIT without a Requirement or a summary, between two neighbours, and a MOIT with the longest title, no year crumb, no neighbour and no date.

The markup copies the built components' classes (`ListHeading`, `SectionHeading`, `HomeQuickLink`, `DocumentDownloadRow`, `UnitPanel`, the Post page's header, today's `MoitPage`); the stylesheet is `main`'s `src/styles/global.css` compiled by Tailwind CSS over the built pages (`@tailwindcss/node` `compile` and `@tailwindcss/oxide` `Scanner`). The header and footer are the runtime's own markup.

- `extract.mjs` reads the demo dataset's two MOITs from the runtime's public pages, with GET requests, as the pages render them (each header, each Requirement with its count, the Evidence pills as HTML) into `data.json`, and the shell into `shell.json`.
- `shoot-all.mjs` captures every case in each variant at 1,440, 1,024, 768, 375 and 320 px with each page's height and any overflow (`WIDTHS=` narrows it); `sheets.mjs` lays the variants side by side.
- `contrast.sh` reads every text's contrast (`PAGES=` narrows it).

The builders ran from `.tmp/prototypes/ita-redesign/` of the clone, where their pages, data, screenshots, sheets, crops and contrast readings stay; this branch holds the builders and this record.

## The content

The demo dataset's alone (grill Q6): no Legacy site content, and no wording of the MOPH manual beyond what the demo dataset already holds. Filler to reach a count is marked `MADE_UP` in `build.mjs`, every title of it "[ตัวอย่าง]": fiscal year 2569 with twenty-two MOITs named "ตัวชี้วัดลำดับที่ N" (one with the longest title) and 2568 with one, and the four Evidence pills of the MOIT without a Requirement.

## Seen while building

- A long MOIT title at the Post page's H1 size (46 px from `lg`) runs to six lines at 1,440 px and fills the window above the first Requirement; at H2 size (34 px, the size today's header band uses) it runs to five shorter lines, and the page reads 1,393 px against 1,511 px. Variant D was added for it, and the Product Owner picked the smaller H1.
- A year of twenty-two MOITs reads 3,711 px at 1,440 px as rows (A) against 2,720 px as one card (B); at 375 px A is the shorter, 4,101 px against 4,448 px.
- Three years on `/ita` read 1,121 px at 375 px as tiles (A) against 1,469 px as large cards (B).
- A row's tile is hidden from assistive technology, so its link starts with "MOIT n" for a screen reader alone, as today's link holds the badge; a Requirement's number on its tile is hidden the same way and stays in its H2's words.
- In B the neighbour links keep today's cards and chevrons and gain a `brand-primary` edge under the pointer.
- "MOIT n" in `accent-warm` inside the H1 reads 5.38:1 at the lowest (the MOIT without a Requirement, variant A, 320 px), over the 3:1 a text of 24 px or more needs, so it keeps its colour (Q10).
- No case overflows the window at any of the five widths (`shots/measures.json`).

## The Product Owner's picks

Asked through the session's question tool on 2026-11-22, each answer the option marked "(Recommended)":

- **P1 `/ita`: A**, the Quick Access tile over the field's edge.
- **P2 a year's page: A**, a white row per MOIT with its gradient tile.
- **P3 a MOIT's body: B**, the table of contents' panel and the first card over the field's edge.
- **P4 a MOIT's header: the year in the outlined pill, and the H1 no larger than H2 size** (H3 size below `sm`, H2 size from `sm`, as today's band). This changes grill Q3, which gave the H1 the Post page's sizes and the year as a plain line.

Variant E holds P3 and P4 together.

## Contrast of the picks

`contrast.sh` runs `scripts/measure-text-contrast.ts --all-text --fold` at the five widths; the picks are ten pages (`/ita` A in its three cases, a year's page A in its three, a MOIT's page E in its four). No text reads under 4.5:1, and the script named no text as not read.

| Text | Lowest |
| --- | ---: |
| A list's H1 on the field (`/ita`) | 4.69:1 (1,024 px, where the list field's ring runs behind it) |
| A list's lead on the field | 6.45:1 |
| The label above a list's H1 | 9.22:1 |
| The breadcrumb's links on the field / its current page | 8.36:1 / 6.18:1 |
| A year tile's "ปีงบประมาณ" and "ตัวชี้วัด n รายการ" | 4.97:1 |
| A year tile's year | 16.54:1 |
| "MOIT" on a row's gradient tile | 4.75:1 (375 and 320 px) |
| A row's number on its tile | 8.35:1 |
| A row's title | 16.54:1 |
| A row's facts line | 4.97:1 |
| A MOIT's year in its pill on the field | 8.37:1 |
| A MOIT's H1 on the field / "MOIT n" in it | 5.94:1 / 5.54:1 |
| A MOIT's summary and its counts line on the field | 6.45:1 |
| "สารบัญ" in its panel | 6.45:1 |
| A Requirement's number on its tile, and in the table of contents | 5.78:1 |
| A Requirement's count, "ตัวชี้วัดถัดไป" | 4.97:1 |
| "ตัวชี้วัดก่อนหน้า" | 4.63:1 (MOIT 2, 1,440 and 1,024 px; 4.97:1 elsewhere) |
| The Evidence pills (unchanged): a label / a file's type and size, a host | 10.94:1 / 5.07:1 |

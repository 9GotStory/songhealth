# Feature 011 prototype: Health Reports, Services, Health Services and `/health`

A throwaway prototype of the redesign of `/health`, the Health Reports list and a Health Report's
page, the Service catalog and a Service's page, and the Health Service Directory and a Health
Service's page, built on 2026-11-17. It lives on the branch
`prototype/health-reports-services-health-services` only; `main` keeps the decisions, not the code.
It is static HTML built by a script, and the development runtime never served it.

**It is the source of the look, not of behaviour.** Each rule of the built pages belongs in the
feature's spec, `docs/design/DESIGN.md` and the code, ported from the spec with a test, not from
this code.

## The question

What should the seven pages look like after the Homepage and Features 009 and 010's pages as they
are built in `main` (`DESIGN.md` §7.8, §8, §9)?

The grill before it settled everything but four looks (Product Owner, 2026-11-17, Q1 to Q17, each
answer "ตามที่แนะนำ"):

- the seven routes in one feature; the look changes, and every read, order, page size (Health
  Reports 20, Services 12, Health Services 20), filter, canonical address, head tag, 404 and
  preview behaviour stays; no new field, address or section; the model and the Admin unchanged;
- two links are added: a directory row's "เปิดแผนที่" when the Health Service has coordinates, its
  accessible name naming the Health Service (Q13), and a Health Report's download as a Document's
  page has it (`FileTile`, `FileDownloadLink`), which retires `DocumentDownload.astro` (#334, Q4);
- the new pieces show on these pages only: the new Health Service row on the directory and under a
  Service's "หน่วยบริการสุขภาพที่ให้บริการนี้", a Service's related Documents as Feature 010's; a Basic
  Page, the About pages and search keep theirs, and `QuickLinkCard` stays on `/about` and `/ita`;
- each list's heading on the deep field as `ListHeading`: Health Reports "สุขภาพ" / "รายงานสุขภาพ" /
  `file-chart-column`, Services "บริการ" / "บริการประชาชน" / `users`, the directory "หน่วยบริการ" /
  "หน่วยบริการสุขภาพที่เกี่ยวข้อง" / `hospital`, `/health` "สุขภาพ" / "ข้อมูลสุขภาพ" / `heart-pulse`;
  `FilterForm` over the field's edge; the Homepage's motion and tokens;
- the three pages take the header on the field and one card over its edge (§9.4, §9.5), with the
  pills and the card's parts of Q9 to Q11;
- the catalog a plain grid of three, two and one at any count; `/health`'s two tiles side by side
  at every width; rows one column (Q15);
- the Homepage's H2 "หน่วยบริการสุขภาพในอำเภอสอง" against `GLOSSARY.md` (a Health Service is related
  to the district, not always in it): a note in the spec, not changed (Q17).

## What was built

`build.mjs` builds twenty-one pages, one per case, each holding its variants switched by
`?variant=` and a floating bar:

| Pages | A | B | C | D |
| --- | --- | --- | --- | --- |
| `/services` | the Homepage's card, the two links as pills | the card, the links under the lead | a row, pills | a row, links under the lead |
| `/health-services` | a row: the tile, type and Area, the name, the address, the map at the right | a card, three to a row from `lg` | | |
| `/health/reports` | a row with the `file-chart-column` tile and the fiscal year | a row with the date's tile, as an Announcement's | | |
| `/health` | the Homepage's Quick Access tiles | | | |
| the three pages | a Service's offering Health Services as rows, a Health Service's Services as cards | the other way round | | |

The cases: Services a first page of twelve with the pager, a category of four, of two and of one;
the directory a first page of twenty, the demo's four (one closed for now), an Area of two and a
name of one; Health Reports a first page of twenty, the demo's three (one without a report date),
two and one; a Health Report's page in full, without a report date, and with its Document
unavailable; a Service's page with every guidance section and a related Document, with three
offering Health Services, and with an external link alone; a Health Service's page for the
hospital with three Services, and for the one closed for now without a contact.

The markup copies the built components' classes (`ListHeading`, `SectionHeading`,
`HomeServiceCard`, `HomeQuickLink`, `FileTile`, `FileDownloadLink`, `DocumentDownloadRow`, the
Post page's header); the stylesheet is `main`'s `src/styles/global.css` compiled by Tailwind CSS
over the built pages (`@tailwindcss/node` `compile` and `@tailwindcss/oxide` `Scanner`). The
header and footer are the runtime's own markup.

- `extract.mjs` reads the demo dataset (`scripts/demo-dataset/content.ts`) into `data.json`, and
  each Document's file label and the shell from the runtime's public pages, with GET requests.
- `shoot-all.mjs` captures every case in each variant at 1,440, 1,024, 768, 375 and 320 px with
  each page's height and any overflow (`WIDTHS=` narrows it); `sheets.mjs` lays the variants side
  by side.

## The content

The demo dataset's alone (grill Q14): no Legacy site content, since Feature 005 imported none of
these kinds. Filler to reach a full page is marked `MADE_UP` in `build.mjs`, every title of it
"[ตัวอย่าง]": three Services (one with the longest name), sixteen Health Services named
"ตัวอย่างที่ N" (every fourth without coordinates, one no longer in service), seventeen monthly
reports; and a category of one, an unavailable report Document and two more Services the hospital
offers.

## Seen while building

- At 768 px the two pills beside the heading push the lead to three lines (`services-two-768`).
- Reports B dates a report without a report date by its publication (the demo's performance
  report reads "26 ต.ค. 2569"), as the list orders it; A shows the fiscal year on the tile and the
  date in the facts line.
- No case overflows the window at any of the five widths (`shots/measures.json`).

## The Product Owner's picks (2026-11-17, "ตามที่แนะนำ")

- P1 `/services`: B, the Homepage's card (`HomeServiceCard`, shared), with the two related links
  under the lead as white underlined links. The pills beside the heading pushed the lead to three
  lines at 768 px, and Feature 010's lists have no pill link.
- P2 `/health-services`: A, rows, with "เปิดแผนที่" at the right from `lg`, as a Document row's
  download.
- P3 `/health/reports`: A, the `file-chart-column` tile with the fiscal year. B's date tile shows a
  report without a report date by its publication date, which reads as the report's own date.
- P4 the two pages' lists: A, a Health Service's Services as the catalog's cards and a Service's
  offering Health Services as the directory's rows, as P1 and P2.

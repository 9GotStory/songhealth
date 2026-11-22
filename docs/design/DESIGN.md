# Songhealth — Design System & Public UI Contract

> **Status:** v1.7, current. Feature 006's design was accepted on #144; Feature 007's
> bounded refinements follow spec #190, implemented by #191–#198, and were accepted on #190
> (Product Owner, 2026-11-10: #190 comment 6759434955). Feature 008's redesign follows spec #239,
> implemented by #240–#250, and was accepted on #239 (Product Owner, 2026-11-13: #239 comment
> 6841960594). Feature 009's redesign of the News lists and the Post page follows spec #280,
> implemented by #281–#287, and was accepted on #280 (Product Owner, 2026-11-15: #280 comment
> 6891402807). Feature 010's redesign of the Activities, Announcements and Documents pages follows
> spec #311, implemented by #312–#318, and was accepted on #311 (Product Owner, 2026-11-17: #311
> comment 6936494700). Feature 011's redesign of the Health Information hub, the Health Reports,
> Services and Health Services pages follows spec #338, implemented by #339–#346, and was accepted
> on #338 (Product Owner, 2026-11-19: #338 comment 6999055380). Feature 012's redesign of the
> About pages, the Contact page and a Basic Page follows spec #365, implemented by #366–#372, and
> was accepted on #365 (Product Owner, 2026-11-21: #365 comment 7060805067). Feature 013's
> redesign of the ITA pages follows spec #392, implemented by #393–#397.
> **Updated:** 2026-11-22 (#394); first drafted 2026-10-30
> **Target:** Songhealth public website (Astro SSR + integrated EmDash)
> **Repository path:** `docs/design/DESIGN.md`
> **Source of the design:** the code (the tokens in `src/styles/global.css` and the components in
> `src/components/`) with this document (`docs/adr/0007`)
> **History:** the Figma file "Songhealth — Homepage Concept v1", kept unchanged and described in
> `docs/design/homepage-concept-v1.md`
> **Design policy:** Tailwind CSS **v4 only**, Astro-first, Lucide vector icons, no emoji as UI
> iconography.

> **Feature 007 decision (Product Owner, 2026-11-07; #190 comment 6707205912):**
> Header B below 1024 px uses compact Search/Contact utility links and a 44×44 px icon-only
> native menu. The released space belongs to the identity at its existing type size (§7.4).
> Breadcrumb B below 640 px limits only the current label to one line with ellipsis when needed;
> its full text, ancestor hierarchy and H1 remain (§7.5). Shared ContentCard, ServiceCard and
> ActivityCard use whole-card native links and the green hover edge/title (§7.3).
> Quick Access B below 640 px keeps two cards to a row, with the label above and the arrow on a
> separate lower-right row; the accepted taller cards replace the crowding limit (§7.3, §10).
> Titles also keep "ร้องเรียน" on one line, through the shared list and its existing scope (§4.1).
> Pagination B below 640 px centers the page number above Previous-left and Next-right; the height
> it adds where one row fit is an accepted tradeoff (§7.6).
> FilterForm B makes "ล้างตัวกรอง" an outlined soft secondary pill, as tall as "แสดงผล" at every width;
> it stays a native link to the unfiltered list, shown only for applied filters (§7.7).
> Empty Post page row B: a News or Health Content post with no body, source or topics ends with
> whichever of its header and its picture's link ends lower, without the empty row and its 2 rem
> gap; the rest of the post layout remains (§9.1, §10).
> This amendment implements #191–#198.

> **Feature 008 decision (Product Owner, 2026-11-10 and 2026-11-11; spec #239, #239 comments
> 6786536858 and 6786631899):** the public site is redesigned page by page in the "bold modern"
> look the Product Owner chose from a prototype, the Homepage first, on the existing colours, radii
> and Noto Sans Thai. Every page takes the new shell at once (§7.4): one sticky header row with a
> round search link and no utility bar, no header link to `/contact`, and the deep green footer with
> the official channels as pills. Five colours join the tokens (§3.1). The direction is §2's, in
> place of "Evolve Concept v1; add no new style" and "Neutral surfaces first". #240 to #249
> implement the shell and the Homepage (§7.4, §8), each with its own decisions in §13's change
> history, and #250 the direction, the measures and the limits (§2, §6, §8.2, §10). Every other
> page keeps its content's design under the new shell until its own feature.

> **Feature 009 decision (Product Owner, 2026-11-13; spec #280):** the News, Health News and Health
> Content lists and the Post page of a News, Activity or Health Content item are redesigned after
> the Homepage as it is built, "เราจะต้องเป็นไปแนวทางเดียวกันของหน้าแรกนะ", in the look the Product
> Owner picked from a prototype's variant C. A page's heading lies on the deep green field with its
> breadcrumb in white, and what follows starts over the field's lower edge (§7.8). `/news` is headed
> "ข่าวประชาสัมพันธ์" under the label "ข่าวสาร"; its title in the head, the menu and the breadcrumb
> stay "ข่าวสาร". Every address, read and behaviour stays, and no colour, type size, radius or
> shadow joins the tokens. #281 to #286 implement the three lists and the Post page (§7.3, §7.8,
> §9), each with its own decisions in §13's change history, and #287 the documents, the measures
> and the limits (§2, §3.2, §6, §10). Every page outside the feature keeps its design.

> **Feature 010 decision (Product Owner, 2026-11-15; spec #311, #311 comment 6895825492):** the
> Activities list, the Announcements list and an Announcement's page, and the Document repository
> and a Document's page are redesigned after the Homepage and Feature 009's pages as they are
> built, in the look the Product Owner picked from a prototype. Each list is headed on the deep
> field as Feature 009's lists are (§7.8): `/activities` under the label "ภาพกิจกรรม",
> `/announcements` under "แจ้งให้ทราบ" and `/documents` under "เข้าถึงข้อมูล"; their H1s, leads,
> titles in the head, menu items and breadcrumbs stay. Every address, read and behaviour stays, and
> no colour, type size, radius or shadow joins the tokens. #312 to #317 implement the five pages,
> each with its own decisions in §13's change history, and #318 the documents, the measures and the
> limits. Every page outside the feature keeps its design.

> **Feature 011 decision (Product Owner, 2026-11-17; spec #338, #338 comment 6941491587):** the
> Health Information hub (`/health`), the Health Reports list and a Health Report's page, the
> Service catalog and a Service's page, and the Health Service Directory and a Health Service's
> page are redesigned after the Homepage and Features 009 and 010's pages as they are built, in the
> look the Product Owner picked from a prototype. Each list is headed on the deep field as Feature
> 009's lists are (§7.8): `/health` and `/health/reports` under the label "สุขภาพ", `/services`
> under "บริการ" with its two related links under the lead, and `/health-services` under
> "หน่วยบริการ"; their H1s, leads, titles in the head, menu items and breadcrumbs stay. `/health`
> shows its two destinations as the Homepage's Quick Access tiles (§7.3, §8.11). Every address,
> read and behaviour stays, and no colour, type size, radius or shadow joins the tokens. #339 to
> #345 implement the seven pages, each with its own decisions in §13's change history, and #346
> the documents, the measures and the limits. Every page outside the feature keeps its design.

> **Feature 012 decision (Product Owner, 2026-11-19; spec #365, #365 comment 7000119315):** the
> About pages (`/about`, `/about/organization`, `/about/leadership`, `/about/personnel`,
> `/about/policies`, `/about/plans`, `/about/results`), the Contact page and a Basic Page are
> redesigned after the Homepage and Features 009 to 011's pages as they are built, in the look the
> Product Owner picked from a prototype. The About Document pages and `/about/personnel` are
> headed on the deep field as the other lists are (§7.8) under the label "เกี่ยวกับเรา",
> `/about/leadership` under "บุคลากร" and `/contact` under "ติดต่อ"; a Basic Page, on
> `/pages/{slug}`, `/about/organization` and `/about`, opens on the field with the Post page's
> header (§9.9). Over the field's edge the About Document pages show the Document repository's
> rows with their downloads, Leadership a featured first leader and white cards and Personnel a
> white panel per unit, both with the Homepage Leadership strip's ringed circle (§7.3, §8.5),
> `/about` its six sub-pages as the Homepage's Quick Access tiles (§8.11), and `/contact` Office
> Contact's details in a white card (§9.10). Every address, read and behaviour stays, and no colour, type size,
> radius or shadow joins the tokens. #366 to #371 implement the pages, each with its own decisions
> in §13's change history, and #372 the documents, the measures and the limits. Every page outside
> the feature keeps its design.

> **Feature 013 decision (Product Owner, 2026-11-22; spec #392, #392 comment 7075910252):** the
> ITA landing (`/ita`), a fiscal year's page (`/ita/{fiscal-year}`) and a MOIT's page
> (`/ita/{slug}`) are redesigned after the Homepage and Features 009 to 012's pages as they are
> built, in the look the Product Owner picked from a prototype. The landing is headed on the deep
> field as the lists are (§7.8), under the label "ITA", with each fiscal year as a large white card
> over the field's edge (§8.3). Every address, read and behaviour stays, and no colour, type size,
> radius or shadow joins the tokens. #393 to #396 implement the pages, each with its own decisions
> in §13's change history, and #397 the documents, the measures and the limits. Every page outside
> the feature keeps its design.

## 1. Scope, authority and status

This document records the public presentation of Songhealth: its tokens, its components, the
layouts of its pages and the rules they follow. It creates no content type, route or CMS
behaviour.

Higher-priority sources prevail:

1. Product Owner decisions.
2. `docs/website-modernization-docs/current/00`–`09` (product/behavior) and
   `current/10-system-blueprint.md` (architecture).
3. `GLOSSARY.md` and accepted decisions in `docs/adr/`.
4. Specs and tickets.

With the code, this document is the design's source (ADR 0007). A design change is made in the
code and recorded here in the same pull request. A page that departs from this document is a
pending confirmation for the Product Owner (CODING_STANDARDS "Public pages"). The Figma file is
history: it is not edited, and no page is built from a fresh read of it.

Engineering baseline: one server-rendered Astro 7.3.5 application with EmDash 1.1.0 as its
integrated CMS, TypeScript, PostgreSQL 18.6. The public UI creates no second frontend application,
custom CMS or page builder.

## 2. Design direction

**Bold modern, on the site's own colours:** citizen-first, useful, credible and accessible, in a
layered look that reads as a current official site and stays recognizably connected to the local
health-service network.

- **A redesign, page by page, the Homepage first** (spec #239). The Product Owner found the site
  too plain, "ตอนนี้ฉันอยากปรับปรุง design frontend ทั้งหมด เนื่องจากมันดูเรียบง่ายเกินไป" (2026-11-10),
  and asked for a new design: "รอบนี้ออกแบบใหม่เลย". The Homepage and the shell every page shares
  have it (§7.4, §8). Feature 009 brings it to the News, Health News and Health Content lists and
  the Post page of a News, Activity or Health Content item (spec #280): a list has its heading on
  the deep field (§7.8), and over the field's edge, after the filter form on Health News and
  Health Content (§7.7), the Homepage's News cards, the newest large on a first page that no
  Health Topic narrows (§7.3); a Post page has its header on the field, its picture in a white
  frame and its text on the page's colour (§9). Feature 010 brings the list's heading to the
  Activities, Announcements and Documents lists (spec #311; §7.8), and over the field's edge
  `/activities` shows the News lists' cards, its newest large on a first page, each with its date
  and place (§7.3; #313), `/announcements` the Homepage's Announcement rows, a closed one greyed
  (§8.7; #314), and `/documents`, after its filter form, rows with the file's type on a tile, the
  title linking to the Document's page and the file's own download (§7.3; #315). An
  Announcement's page opens on the field with the Post page's header and lays its details in one
  white card over the field's edge, then its text and its related Documents with their downloads
  (§9.4; #316). A Document's page opens on the same field with the same header, its type and a
  superseded or expired status in pills, and lays its file first in one white card over the
  field's edge, then its details (§9.5; #317). Feature 011 brings the list's heading to the
  Health Information hub, the Health Reports list, the Service catalog and the Health Service
  Directory (spec #338; §7.8; #339): `/services` with its two related links under the lead, and
  `/health` with its two destinations as the Homepage's Quick Access tiles over the field's edge
  (§7.3, §8.11). `/services` shows the Homepage's Frequently Used Service cards (§8.4; #340), and
  `/health-services` rows with the Health Service's tile, its name, its address and "เปิดแผนที่" in
  the row (§7.3; #341), and `/health/reports` rows with the report's tile carrying its fiscal
  year, each one link over the whole row (§7.3; #342). A Health Report's page opens on the field
  with the Post page's header, its report date and type in pills, and lays its report Document's
  file first in one white card over the field's edge, then its details (§9.6; #343). A Service's
  page opens on the field with its categories in pills, lays its details and external link in the
  card, and follows them with its guidance, its related Documents and the Health Services that
  offer it as the directory's rows (§9.7; #344). A Health Service's page opens on the field with
  its Facility Type and, when out of service, its status in pills and its official name under the
  H1, lays its location first in the card, then its details, and follows them with the Services it
  offers as the catalog's cards (§9.8; #345). Feature 012 brings the list's heading to the About
  Document pages, `/about/policies`, `/about/plans` and `/about/results` (spec #365; §7.8; #366),
  under the label "เกี่ยวกับเรา", and over the field's edge the Document repository's rows with
  their downloads (§7.3). `/about/leadership` is headed the same way under the label "บุคลากร",
  with the first leader in a featured card across the row and the others in white cards over the
  field's edge, each with the Leadership strip's ringed circle (§7.3, §8.5; #367).
  `/about/personnel` is headed the same way under the label "เกี่ยวกับเรา", with a white panel per
  organizational unit over the field's edge, its people inside as compact rows with the same
  ringed circle (§7.3, §8.5; #370). A Basic Page, on `/pages/{slug}` and `/about/organization`,
  opens on the field with the Post page's header, its title and summary, then its body in the text
  column and its related Documents with their downloads under the Homepage's section heading (§9.9;
  #368). `/about` opens on a list's field with the same header, its six sub-pages as the Homepage's
  Quick Access tiles over the field's edge, then its body and related Documents (§7.3, §8.11, §9.9;
  #371). `/contact` is headed as a list under the label "ติดต่อ", with Office Contact's details in a
  white card over the field's edge, a row per detail with its icon, then the official channels as
  pills under the Homepage's section heading and the two routes onward as white cards (§7.8, §9.10;
  #369). Feature 013 brings the list's heading to the ITA landing (spec #392; §7.8; #393), under
  the label "ITA", with each fiscal year that has a published MOIT as a large white card over the
  field's edge, its year as an H2 beside a gradient calendar tile (§8.3), and to a fiscal year's
  page (#394), under the same label, with each of the year's MOITs as a white row over the edge,
  its number on the Document row's gradient tile (§8.3).
  Every page outside these features keeps its design under the new shell until its own
  feature.
- **Its sources:** variant H, "bold modern", of the Homepage prototype, which the Product Owner
  picked on 2026-11-11, "แบบนี้สิ ดูดีขึ้นมาเยอะเลย", after turning down a flat, hairline variant,
  "มันยังดูธรรมดา เรียบง่ายเกินไป ไม่ได้ดูทันสมัย หรือ สมัยใหม่เลย", and naming two sites as the look
  to aim for, <https://spss.up.ac.th/default> and <https://www.up.ac.th/>. The prototype is a
  throwaway on the branch `prototype/home-redesign` (`docs/prototypes/home-redesign.md` there): it
  shows the look, and each rule is in this document and the code.
- **The identity stays:** the tokens' colours and radii and Noto Sans Thai ("สีควรใช้สีเดิมของระบบ
  design token ของเราดีอยู่แล้ว", "ใช้ Noto Sans Thai และมุมโค้งตาม token เดิม"). A colour or a type
  size the look needs beyond them is a named token or utility with its source (§3 rule 6, §3.1).
- **Brand-colour fields and layered cards.** Green is a surface as well as an accent: the deep
  green field under the hero and the Services and under a list's heading or a post's header, the
  green bands and the footer. White cards with soft shadows lie on them and over a section's edge,
  and a section opens with an icon tile and a large heading (§7.8, §8). Buttons, badges and chips
  are pills.
- **The page moves, and never to say something:** an entrance, a reveal, a hover and a loading
  state, all off under the visitor's reduced-motion setting, and nothing that moves without end
  (§8.12).
- **Prioritize tasks and content**, not decorative dashboard statistics or giant portal menus. A
  number on a page is read from content, as the Health Service directory's counts are (§8.9).
- **Clear reading hierarchy:** the office's summary and a useful search first, prominent Featured
  content, visible service choices, who leads the office, recent News and Announcements, health
  knowledge and contact details.
- **Imagery:** genuine, permitted local imagery. Most of the office's pictures are One Pages
  (GLOSSARY): a page shows one whole, and a card shows its middle, or the part around a focal
  point staff set (§7.3, §8.1, §9). A gradient
  visual stands in where an item has no picture; it never replaces an editorial image.
- **Content-driven cards:** never invent CMS records to fill a grid; show fewer cards or hide an
  optional section, as `04-homepage.md` requires.

## 3. Technology and styling rules

1. **Tailwind CSS v4 only** for the public UI, through the official `@tailwindcss/vite` plugin
   (ADR 0001).
2. The tokens are `@theme` variables in `src/styles/global.css`, which clears Tailwind's default
   colours, type scale, radii and shadows, so a template can use only these tokens (§3.1).
3. Templates style with utility classes in Astro components. The global stylesheet holds only the
   tokens, the base styles (the page gutter and the focus ring), the utilities (`page-container`;
   `focus-ring-on-dark`, `focus-ring-on-light` and `focus-ring-banded`; the header's `header-title` and
   `header-nav-item`; the Homepage's `deep-field`, `deep-band`, `deep-visual`, `plain-visual`, `hero-headline`,
   `hero-headline-alone` and `section-title`; the Homepage's motion, §8.12: `hero-enter`,
   `featured-card-enter`, `featured-sheet-enter`, `scroll-reveal` and `picture-shimmer`, with the keyframes they run) and the `.rich-text` typography of Portable Text
   bodies, which EmDash renders as plain HTML that takes no utility classes. A list's heading
   uses `deep-field`, `section-title` and `hero-enter` too (§7.8), a Post page's header and frame
   `deep-field` and `hero-enter` (§9.1), the heading of an Activity's
   photos `section-title` (§9.2), and a list's cards
   `plain-visual`, `deep-visual` (the large card's, on a first page), `scroll-reveal` and
   `picture-shimmer` (§7.3).
4. No other plain CSS selectors for component styling, no CSS Modules, Astro `<style>` blocks or
   CSS-in-JS, and no Tailwind v3 setup or `tailwind.config.js`. An inline `style` carries only a
   value computed from content: the shell's `--menu-height` from its number of menu items (§7.4).
5. States and widths use Tailwind's variants (`hover:`, `focus-visible:`, `group-*`, `max-sm:`,
   `supports-[…]:`, `group-data-*:` and the breakpoints of §6). Pages work without client
   JavaScript (§11).
6. A colour or type style the tokens lack becomes a named token with its source, and §3.1 records
   it. An arbitrary value is for a measured detail only, such as the post picture's `28rem`
   column.
7. These rules cover the public presentation. EmDash's Admin and its Edit mode are not restyled.

### 3.1 Tokens

The tokens began as Concept v1's variables and keep their names. Colours:

| Token | Value | Use |
| --- | --- | --- |
| `brand-primary` | `#0b6b57` | links, primary buttons, the focus ring on light surfaces |
| `brand-dark` | `#123c33` | headings, the deep green field, dark bands |
| `accent-warm` | `#f3c95f` | a status that needs attention, the skip link, the focus ring and eyebrows on dark surfaces; on the Homepage, the words the hero's headline marks, the search's submit button, the sheet behind the Featured card, a section heading's icon tile, a Service card's tile under the pointer, the ring of the first person in the Leadership strip and, on `/about/leadership`, of the featured first leader (§7.3), the large News card's date pill and the tile of its visual, and on an Announcement row (the Current Announcements and the Announcements list) the month and year on a current one's date tile, the recruitment badge, a status that is not open yet and the arrow's circle under the pointer; on a Document row on `/documents` and in an Announcement's related Documents, and in the card on a Document's and a Health Report's page, the file's type on its tile (§7.3, §9.4, §9.5, §9.6); on the field under a list's heading, the heading's icon tile and its link under the pointer (§7.8); on `/services`, as on the Homepage, a Service card's tile under the pointer (§8.4; Feature 011 #340); on a list's large card, as on the Homepage's, its date pill and the tile of its visual (§7.3); on a Post page's and an Announcement's header, the pill of "เผยแพร่" and the date (§9.1, §9.4), on a Document's header the pill of a superseded or expired status (§9.5), and on a Health Report's header the pill of "วันที่รายงาน" and the report date (§9.6); on a fiscal year's card on the ITA landing, the `calendar-check` on its gradient tile, and on a MOIT's row on a fiscal year's page, "MOIT" over the number on its tile (§8.3) |
| `text-primary` | `#16211d` | body text |
| `text-secondary` | `#65736d` | leads, meta lines |
| `bg-page` | `#f6f9f7` | the page |
| `surface-base` | `#ffffff` | cards, white bands |
| `surface-soft` | `#eaf5f0` | soft bands, the Current Announcements' band and its general category badge |
| `border-default` | `#dce7e2` | borders |
| `topic-blue` | `#f0f5fc` | the procurement Announcement badge's fill (§8.7); `topic-green`, the old Health Information cards' other fill, left the tokens with them (#246), `contact-visual-from` and `-to`, the map stand-in's fill, with it (#247), and `activity-visual-from` and `-to`, the old Activity card's fill without a picture, with that card (#313) |
| `divider` | `#dbe8e3` | separators inside a white box: the line above a post's topics; the rule in the card on a Document's and a Health Report's page is `border-default` (§9.5, §9.6) |
| `hero-chip`, `hero-secondary-fill`, `hero-secondary-border` | white at 12 %, 6 %, 28 % | the hero's chip; a secondary link on a dark surface |
| `text-secondary-on-soft` | `#5d6a64` | secondary text on `surface-soft` (contrast fix, #51) |
| `border-input` | `#7a8a83` | input boundaries (contrast fix, #51) |
| `procurement-text`, `procurement-border` | `#1d4f91`, `#c9dbf3` | the procurement Announcement badge's text and border, on `topic-blue` (Feature 008, #239) |
| `status-closed` | `#e7ecea` | a closed Announcement's status label and date tile on the Announcements list, and its status label on its page (Feature 008, #239; Feature 010, #314, #316) |
| `deep-highlight` | `#0f8a70` | the highlight in the deep green field's gradient and in the deep visual's (Feature 008, #239) |
| `plain-visual-to` | `#d6ece2` | the plain visual's second stop, after `surface-soft` (Feature 008, #239) |

The Homepage's hero uses `deep-highlight`, in the `deep-field` utility's gradient, and
`plain-visual-to`, in the `plain-visual` utility that stands in for a missing picture (§8.1).
Latest News uses both again (§8.6): `plain-visual` on a small card without a picture, and
`deep-highlight` in the `deep-visual` utility on the large one; so do the cards of the News,
Health News and Health Content lists (§7.3). The
Current Announcements use `procurement-text` and `procurement-border` on the procurement badge
(§8.7). `status-closed` is the fill of a closed Announcement's dotted status label and date tile,
which the Announcements list shows (§8.7; Feature 010 #314), and of the label in the details card
on its page (§9.4; #316): the Homepage lists current Announcements only. Some fills are a token at an opacity, not a token of their own: the hero's decorations and
chip (`accent-warm` at 28 %, 30 %, 38 % and 50 %, `surface-soft` at 16 %, `surface-base` at 18 %
and 22 %), the header's
surface, `surface-base` at 90 %, the footer's quiet text, pills and rule, `surface-base` at
70 %, 85 %, 20 %, 15 % and 10 %, the label pill on a list's large card, its outline
`surface-base` at 40 % and its fill `brand-dark` at 40 % (§7.3), the category pill on a Post
page's header, its outline `surface-base` at 40 % (§9.1), and the breadcrumb's separators on the
deep field, `surface-base` at 75 % (§7.5).

Type, Noto Sans Thai, as size / line height / weight in px:

| Token | Style | Token | Style |
| --- | --- | --- | --- |
| `display` | 60 / 72 / 700, used by no template | `body-large` | 18 / 30 / 400 |
| `h1` | 46 / 58 / 700 | `body` | 16 / 26 / 400 |
| `h2` | 34 / 46 / 600 | `label` | 14 / 22 / 500 |
| `h3` | 24 / 34 / 600 | `small` | 13 / 20 / 400 |
| `telephone` | 40 / 52 / 700, the office's telephone number on the Homepage's contact card from 640 px (spec #239 "Tokens"; §8.11) | | |

Two header styles scale with the window from 1,024 px and are utilities, not steps of the scale
(§7.4): `header-title`, 16 to 18 px on a 24 px line, and `header-nav-item`, 15 to 16 px on a 26 px
line. Below 640 px the site title is `body` at 700 on `label`'s 22 px line.

Three Homepage styles are utilities beyond the scale too (spec #239 "Tokens"), each at 700 with
-0.01 em letter spacing:
`hero-headline`, 29 / 42 below 640 px, 34 / 48 from 640 px, and from 1,024 px 34 to 44 px with the
window on a line of 1.42; `hero-headline-alone`, the headline with nothing Featured, 29 / 42, then
38 / 54 from 640 px and 52 / 74 from 1,024 px; and `section-title`, a Homepage section's H2, 26 /
38, then 36 / 48 from 640 px and 42 / 54 from 1,024 px. A list page's H1 on the deep field is
`section-title` too (§7.8), and so is the H2 over an Activity's photos (§9.2).

Radii are named by their size in px: 14, 16, 18, 20, 22, 24, 26 and 32, and `pill` (999 px). Four
shadows: `card`, `0 10px 15px rgb(13 46 36 / 0.08)`; `header`, the sticky header's lower edge,
a 1 px `border-default` hairline with `0 8px 24px -16px rgb(13 46 36 / 0.25)`; `deep`, a card on
the deep green field or a Post page's frame over it, `0 30px 60px -20px rgb(13 46 36 / 0.35)`; and `tile`, a section heading's
icon tile on a light surface, `0 14px 26px -12px rgb(11 107 87 / 0.7)`. One container,
`content`: 75 rem (1,200 px). One length, `--header-offset`: the room the sticky header takes at
the top of the window, 88 px below 640 px and 84 px from 640 px (§7.4).

### 3.2 Contrast

The ratios of the pairs the pages use, computed from the token values (WCAG 2.2 AA: 4.5:1 for text,
3:1 for large text, input boundaries and focus indicators):

| Pair | Ratio |
| --- | ---: |
| `text-primary` on `surface-base` | 16.54:1 |
| `surface-base` on `brand-dark` | 12.21:1 |
| `brand-primary` on `surface-base`, or `surface-base` on `brand-primary` | 6.45:1 |
| `brand-primary` on `bg-page` | 6.09:1 |
| `brand-primary` on `surface-soft` | 5.78:1 |
| `text-secondary` on `surface-base` | 4.97:1 |
| `text-secondary` on `bg-page` | 4.69:1 |
| `text-secondary-on-soft` on `surface-soft` (`text-secondary` there would be 4.45:1) | 5.07:1 |
| `border-input` on `surface-base`, `bg-page`, `surface-soft` | 3.63, 3.42, 3.25:1 |
| `accent-warm` focus ring on `brand-dark`, `brand-primary` | 7.75, 4.10:1 |
| `accent-warm` text on `brand-dark`; on `brand-primary` and the deep field, where small text is `surface-base` instead (§8.4) | 7.75:1; 4.10:1 or less |
| `text-secondary-on-soft` (the tagline) on the header's surface over `brand-dark`, the darkest fill a page scrolls under it (`text-secondary` there would be 4.15:1) | 4.73:1 |
| `brand-primary` on the header's surface over `brand-dark` | 5.39:1 |
| `surface-base` at 70 % (the footer's quiet text) on `brand-dark` | 6.83:1 |
| `accent-warm` (the month and year) on a current Announcement's date tile, on the Homepage and the Announcements list, where they sit on its `brand-primary` to `brand-dark` gradient: measured, one of the two exceptions to the row above (§8.7; #245 comment 6812837231) | 5.45:1 or more on the Homepage; 5.37:1 or more on the list (#314) |
| `accent-warm` (the file's type, "PDF") on the file tile (`FileTile`) of a Document row on `/documents` and in an Announcement's related Documents (§9.4), and in the card on a Document's and a Health Report's page (§9.5, §9.6), the same gradient at the same sizes: measured, the other exception (§7.3; spec #311 "The Document repository"), and "ไฟล์" there when the file cannot be served; the fiscal year on a Health Report row's tile on `/health/reports`, its own tile of the file tile's size and gradient with `file-chart-column` (§7.3; #342); "MOIT" over the number on a MOIT's row on a fiscal year's page, on the same tile (`RowTile`, §8.3; #394) | 5.60:1 or more ("PDF" at 375 and 320 px); "ไฟล์" 5.68:1 (#315); on a Document's page 5.60:1 or more (#317); a report row's fiscal year 5.60:1 or more (#342); on a Health Report's page 5.68:1 (#343); "MOIT" 4.69:1 or more (375 and 320 px, `/ita/2570` at `f77e864`, #394) |
| `procurement-text` on `topic-blue` (the procurement badge, §8.7) | 7.43:1 |
| `brand-dark` on `accent-warm` (the recruitment badge, a status that is not open yet) | 7.75:1 |
| `text-primary` on `status-closed` (a closed Announcement's dotted label and date tile, §8.7, and the label on its page, §9.4) | 13.85:1 |
| `text-secondary-on-soft` on `surface-base`, the lightest the Current Announcements' glow makes the band under its lead | 5.66:1 |
| `surface-base` (the label, the lead and the counts' words) on the Health Service Discovery band's gradient: measured (§8.9) | 5.20:1 or more |
| `surface-base` (the breadcrumb, the label, the H1 and the lead) on the field under a list's heading (`/news`, Health News, Health Content at `fb11b3e`, #287; `/activities`, `/announcements`, `/documents` at `8643ef1`, #312; `/health`, `/health/reports`, `/services` with its links under the lead, `/health-services` at `06b4b58`, #339): measured with `scripts/measure-text-contrast.ts` at the five widths (§7.8) | 6.27:1 or more; the breadcrumb's current page 5.07:1 on `/health-services` at 375 px (#339) |
| `surface-base` (the breadcrumb, the H1, the summary, a category's words in its outlined pill and Health Content's review date) on the field under a Post page's header, and `brand-dark` on the `accent-warm` pill of "เผยแพร่" and the date: measured at `fb11b3e` with `scripts/measure-text-contrast.ts` on seven demo posts and one synthetic post at the five widths (§9.1, #287) | 5.34:1 or more (the breadcrumb's current page); the date pill 7.75:1 |
| `brand-primary` focus ring of a list's card against what lies beside it, its `surface-base` band, over the field's lower edge or the page (`focus-ring-banded`, §7.3): measured at `fb11b3e` with `scripts/measure-focus-contrast.ts` on `/news` at the five widths (#283, #287) | 5.09:1 or more; a few blended pixels at the cards' fractional edges at 1,024 and 768 px down to 2.77:1, under 0.5 % of the ring's neighbours |
| `surface-base` text on a list's large card over a white picture, the least gradient behind it: the title, the summary and the label's words on its `brand-dark` 40 % fill, measured at `fb11b3e` with `scripts/measure-text-contrast.ts` and `scripts/screenshot-fixtures/news-list-light-picture.ts` on `/news` at the five widths (§7.3, #284, #287) | the title 6.74:1, the summary 8.98:1, the label 6.35:1 or more; on a large card without a picture, over its `deep-visual`, 11.12:1 or more |
| `brand-primary` focus ring of a list's large card on `/news`, over the field's edge, against what lies beside it with its band: measured at `fb11b3e` with `scripts/measure-focus-contrast.ts` at the five widths (#284, #287) | 4.06:1 or more (1,024 px; 5.47:1 or more at the others), none of the ring's neighbours under 3:1; the field's edge under the ring alone reads down to 1.00:1, which the band is for |
| `accent-warm` (the counts' numbers, large text) on the band's gradient, over its glow: measured (§8.9) | 3.22:1 or more |
| `accent-warm` on `surface-base` | 1.58:1: a fill or decoration, never text |

There is no alert colour: a status is stated in text, and colour supports it.

## 4. Typography

- **Typeface:** Noto Sans Thai, self-hosted through Astro's Fonts API (`astro.config.mjs`,
  `src/assets/fonts/README.md`).
- **Headings:** a page's H1 is H3 size below `sm`, H2 size from `sm` and H1 size from `lg`; the H1
  of a list page on the deep field (the News, Health News, Health Content, Activities,
  Announcements and Documents lists) is
  `section-title` instead, under its label (§7.8). A Homepage section's H2 is `section-title` (§3.1), under a label at label size between slashes, and so is
  the H2 over an Activity's photos (§9.2). The
  Homepage's H1, the site title, is out of sight: the hero's headline shows in its place (§8.1).
  The Leadership strip's H2 is H3 size in bold, its compact heading (§8.5). Keep the `h1` → `h2`
  → `h3` order whatever the visual size.
- **Sizes beyond the scale** are the Homepage's (§3.1), and one of them a list heading's:
  `hero-headline` and
  `hero-headline-alone` for the hero's headline, up to 44 px beside a Featured card and 52 px
  without one; `section-title`, up to 42 / 54, also a list page's H1 on the deep field (§7.8) and the H2 over an Activity's photos (§9.2); and `telephone`, 40 / 52, on the contact card from 640 px. The
  header's title and navigation items scale with the window from 1,024 px (§7.4).
- **Copy:** concise, natural Thai. Dates and categories sit below the title in emphasis, wherever
  they come: on the News cards and a Post page's header the publication date and the category
  come before it, and Health Content's review date after the summary (§7.3, §8.6, §9.1).
  Colour is never the only cue. No hard-coded dates, opening hours, news, phone numbers or service status.

### 4.1 Thai titles keep compound words whole

The dictionary the browser uses (ICU) splits Thai compound words, such as "เบา|หวาน",
"ความ|ดัน|โลหิต", "ปฏิบัติ|งาน" and "อำเภอ|สอง" (spec #144 "Problem Statement" and "Version-specific
evidence"). A title therefore keeps the words of a curated list on one line:

- **The list:** 27 words in `src/lib/thai-title.ts`: spec #144's 26 and "ร้องเรียน" (spec #190
  "Thai-title word").
- **Matching:**
  - the longest listed word wins at each place ("ความดันโลหิตสูง" over "ความดันโลหิต");
  - every occurrence is kept;
  - two listed words side by side stay two runs, so a line can still break between them;
  - a listed word is 1 to 15 characters (Unicode code points), so it fits the narrowest card
    column; an empty or longer word is refused.
- **Rendering:** `src/components/ThaiTitle.astro` renders a kept run as a `whitespace-nowrap`
  span. The text is unchanged, so copied text and search read the title as written.
- **Where it applies:** every page's H1, every section heading (a rich-text body's own headings
  excepted), every card and row title, the Featured title, and the site title in the header and
  the footer.
- **Where it does not:** body text, summaries and labels, such as the menu, the breadcrumb, the
  MOIT page's table of contents, Evidence pills, eyebrows, meta lines and link labels.
- **The header:** the site title uses the space beside the logo, before the search link and the
  menu button, at §7.4's sizes. Its line count depends on the configured title, logo and tagline;
  it has no fixed line count. ThaiTitle still keeps listed words whole.
- **Rejected** (spec #144): `word-break: keep-all`, which in Thai breaks only at spaces and
  overflows; `text-wrap: pretty` alone; a word joiner, which would end up in copied text and in
  search; a segmentation library, a new dependency.

Its limits are in §10.

## 5. Iconography — mandatory no-emoji rule

**No emoji, text glyphs or Unicode arrows as UI icons**, and no symbol pretending to be an official
logo. The icons are Lucide's (`@lucide/astro`, `docs/agents/lucide-astro-1.59.0.md`), each from its
own module.

- **Sizes by role** (Product Owner, 2026-10-31: #105 comment 6536890963): 16 px for a direction
  icon beside label or small text (onward and external links, pagination, the breadcrumb); 20 px
  for an icon that shows the action itself at the start of its button (the menu, a download);
  24 px on a card (a Quick Link card's corner, a Service card's icon in its tile).
- **Direction:** an onward link on this site ends in `chevron-right`, and a link that leaves it in
  `arrow-up-right` (Product Owner, #51 comments 6536026977, 6536052180). On the Homepage, a round
  button, a section heading's link and a card take `arrow-right` instead (Product Owner,
  2026-11-11: #241 comment 6791096480, item 1), and so does the link of a list's heading on the
  deep field, at 16 px (§7.8; spec #280 "List heading"): 16 px in the heading's link and in the links under `/services`' lead, 20 px in the search's
  submit button, on the Featured card, on a Homepage Service card and in the circle at the end of a Current Announcement's row (§8.7), and 16 px after a Health Content card's "อ่านต่อ" (§8.8). The Health Service Discovery form's button opens with a 20 px `search` icon (§8.9). On the contact card a detail opens with a 20 px icon that stands for its name (`map-pin`, `clock`), the telephone number with a 24 px `phone`, and its button ends in a 20 px `arrow-right`; a Quick Access card keeps a 24 px arrow, `arrow-right` (§8.11). The hero's search field opens with a 20 px `search`
  icon, and a section heading's tile and a visual's tile hold a 24 px icon: the plain visual's, and the deep visual's on the large News card (`heart` on both in Latest News, `heart-pulse` on a Health Content card's; on a list's cards, small and large, `message-square` on `/news` and `heart-pulse` on Health News and Health Content, §7.3; in a
  list heading's tile `heart` on `/activities`, `file-text` on `/announcements` and `folder-open` on
  `/documents`, §7.8), and so does a Document row's file tile on `/documents`, with `file-text`
  (§7.3), and a Health Service row's tile on `/health-services`, with `hospital`, whose
  "เปิดแผนที่" opens with a 20 px `map-pin` and ends in the 16 px `arrow-up-right` (§7.3; Feature
  011 #341), and a Health Report row's tile on `/health/reports`, with `file-chart-column`, whose
  round arrow holds the Announcement row's 20 px `arrow-right` (§7.3; #342). A Service card shows
  the Service's icon (below).
- **Service icons** (Product Owner, 2026-11-12: #248 comment 6826430670): a Service card's tile
  shows the icon staff chose for the Service in the Service editor, on the Homepage (§8.4) and in
  the Service catalog (`ServiceIcon`). Without a choice it shows the standard icon, `hand-heart`,
  and so does a Service whose stored name the set no longer has. The set is fixed at 18, and the
  editor offers each by a Thai name for its picture, which is the stored value
  (`src/lib/service-icon.ts`, the Service `icon` field in `seed/seed.json`):

  | Name in the editor | Lucide icon |
  | --- | --- |
  | มือประคองหัวใจ (the standard icon) | `hand-heart` |
  | ข้อความแจ้งเตือน | `message-square-warning` |
  | ตาชั่ง | `scale` |
  | หลอดไฟ | `lightbulb` |
  | เครื่องหมายคำถาม | `circle-question-mark` |
  | หัวใจและชีพจร | `heart-pulse` |
  | ใบไม้ | `leaf` |
  | เม็ดยา | `pill` |
  | เอกสาร | `file-text` |
  | กลุ่มคน | `users` |
  | ลูกโลก | `globe` |
  | เข็มฉีดยา | `syringe` |
  | โล่ | `shield-check` |
  | หูฟังแพทย์ | `stethoscope` |
  | เด็กเล็ก | `baby` |
  | โทรศัพท์ | `phone` |
  | แผ่นรายการ | `clipboard-list` |
  | โทรโข่ง | `megaphone` |
- **Accessibility:** an icon is decorative. Lucide hides it from assistive technology, the text
  names the link or button, and an icon-only action has an accessible name. Every icon takes
  `shrink-0`, and its colour is a token through `currentColor`.
- `tests/node/public-icons.test.ts` checks the mechanics: no typed mark or hand-drawn `<svg>`, and
  each icon from its own module at 16, 20 or 24 px with `shrink-0`.

**A logo is not an icon.** The header's logo is the site setting's file (Admin → Settings), and
production sets the office's approved file: the MOPH emblem, as the legacy site shows it (grill of
2026-11-04, Q5). Until one is set, the header shows a decorative placeholder mark.

## 6. Layout, breakpoints and spacing

- **Mobile-first**, with the same routes and content at every width; phones show them more
  compactly (`04` §15, §8.2).
- **Breakpoints:** Tailwind's own, with no custom one.
  - below `sm` (640 px): phones;
  - `sm`, from 640 px: wider phones and tablets. On the Homepage the Featured card sits beside
    the hero's headline (§8.1), the Services, the small News cards and the Health Content cards
    go two to a row, and the Services' grid overlaps the deep field's edge (§8.4). A list's
    heading has its link at its right, and the field under it or under a post's header the small
    glow in its corner (§7.8, §9.1); a list's small cards go two to a row, each with its picture
    above its text and its summary, and its large card spans the row (§7.3); a Document row's, a
    Health Service row's and a Health Report row's tile grows from 68 to 92 px, and the row's name
    or title from body to body-large size, and a Health Report row shows its summary and its round
    arrow (§7.3);
  - `lg`, from 1,024 px: desktop, with the main navigation in the header (§7.4), the two-column
    layouts (the post pages, the MOIT page's table of contents) and, on the Homepage, up to
    three Services and four Health Content cards to a row, the Leadership strip in one row, the large
    News card and the large Activity tile beside their small ones, and the Current Announcements'
    heading beside their rows (§8.4 to §8.11). The field under a list's heading has its ring
    (§7.8), a list's small cards go three to a row and its large card takes two columns or the
    whole row by the number of items (§7.3), a Document row's download and a Health Service
    row's "เปิดแผนที่" sit beside its text at the row's right, where from `sm` to `lg` each is
    under the text at its start and below `sm` across the row (§7.3), and a
    Post page's frame starts on the field beside the text and stays in view while the text is the
    longer (§9.1, §10).
  - `md` and `xl` are not used.
- **Widths checked:** 1,440 px (desktop), 375 px (a common phone) and 320 px (reflow, WCAG 2.2
  SC 1.4.10). A rule from a breakpoint is checked on both sides of it, as at 1,023 and 1,024 px
  (CODING_STANDARDS "Tests"). The Homepage and the shell are also measured and captured at
  1,024 and 768 px, the five widths of Feature 008 (spec #239 "Testing Decisions"; §8.2), and so
  are Feature 009's to Feature 012's pages (spec #280, spec #311, spec #338 and spec #365
  "Testing Decisions"; §7.8).
- **Container:** the 1,200 px content column, centred (`page-container`), with a gutter of 16 px
  below `sm` and 24 px from `sm`, so a 1,440 px window has 120 px either side.
- **Spacing:** the 4/8/12/16/24/32/48/64/80 px rhythm. Between two Homepage sections after the deep
  field there is one space of 32 px below `sm`, 64 px from `sm` and 80 px from `lg`; the Leadership
  strip has its own smaller space above it (§8, §8.5).
- No horizontal carousel for primary content and no fixed-height text container: Thai text, 200 %
  zoom and changed text spacing reflow.

## 7. Components

### 7.1 Shared components

Pages reuse the shared pieces in `src/components/` (CODING_STANDARDS "Public pages"). The ones
this document names:

| Area | Components |
| --- | --- |
| Shell | `src/layouts/SiteLayout.astro`: the sticky header with the identity (`SiteLogo`), the main navigation, the search link and the mobile menu; the footer |
| Headings | `PageHeading` (`/search` alone since Feature 013 #394), `SectionHeading`, `ListHeading` on its `DeepField` with `ListBody` after it, or with `overEdge={false}` and nothing over the field's edge (`/contact` without Office Contact, §7.8, §9.10), `ThaiTitle` |
| Cards | `ContentCard` (the Homepage's Latest News; the News, Health News, Health Content and Activities lists, in `ListCardGrid` through `ContentCardGrid` and `ActivityCardGrid`, §7.3), `HomeServiceCard` (the Homepage's Frequently Used Services; `kind="list"`, the Service catalog; and `kind="section"`, a Health Service's "บริการที่ให้", §8.4, §9.8), `HomeQuickLink` (the Homepage's Quick Access; `kind="list"`, `/health`'s and `/about`'s tiles, §7.3, §8.11), `ItaYearCard` (a fiscal year's card on the ITA landing, §8.3), `LeaderCard` (`/about/leadership`, §7.3), `UnitPanel` (an organizational unit's panel with its people's rows, `/about/personnel`, §7.3), `OfficeContactDetails` (Office Contact's card on `/contact`, a row per detail with its icon, §9.10); a person's picture in its ring, `PersonPicture`, which `LeaderCard`, `UnitPanel` and the Homepage's Leadership strip share (§8.5), and a person's public contact, `PublicContact`, which `LeaderCard` and `UnitPanel` share |
| Homepage | `HomeHero`; `SearchForm` on `/search` |
| Fields | `DeepField`: the deep green field under the Homepage's hero and Services (§8.1, §8.4), a list's heading (§7.8), a Post page's header (§9.1), an Announcement's (§9.4), a Document's (§9.5), a Health Report's (§9.6), a Service's (§9.7), a Health Service's (§9.8), a Basic Page's (§9.9), and `/about`'s, a list's field under a Basic Page's header (§9.9) |
| Posts | `PostHeader`, `PostColumns`, `PostBody` with `TopicPills`, `ActivityPhotos`, `RichText`; `CardOverField`, an Announcement's, a Document's, a Health Report's, a Service's and a Health Service's page under a Post page's header (§9.4 to §9.8), with `FileBlock`, the file first in the card of a Document's and a Health Report's page (§9.5, §9.6); `BasicPageContent`, a Basic Page on `/pages/{slug}` and `/about/organization`, its header in `PostColumns` without a picture, and `BasicPageText`, its body and related Documents, which `/about` shares after its tiles; `PostHeader` heads `/about` too, on a list's field (§9.9) |
| Chips | `TopicChip`: a Health Topic chip, on the Homepage's Health Information (§8.8) and a post's Health Topics (§9.1) |
| Links | `ActionLink` (buttons; with `arrow`, semibold with a 16 px `arrow-right`, `/contact`'s routes, §9.10), `ArrowLink` (onward links), `Pagination`, `Breadcrumb`; `ContentLink`'s `compact` form, the footer's official channels and `/contact`'s pills (§9.10) |
| Lists | `FilterForm`; `DocumentDownloadRow`, the Document row on `/documents`, on the About Document pages and in an Announcement's, a Service's and a Basic Page's related Documents (§7.3, §7.8, §9.4, §9.7, §9.9), with `FileTile` and `FileDownloadLink`, which a Document's and a Health Report's page share through `FileBlock` (§9.5, §9.6); `HealthServiceMapRow`, the Health Service row on `/health-services` and under a Service's "หน่วยบริการสุขภาพที่ให้บริการนี้", with `MapLink`'s row pill (§7.3, §9.7); `HealthReportRow`, the Health Report row on `/health/reports`, the Announcement row's look without its badge (§7.3); `ItaMoitRow`, a MOIT's row on a fiscal year's page (§8.3); `RowTile`, the gradient tile of 68 px and 92 px from `sm`, which `FileTile` and `ItaMoitRow` share, each with its own lines; `RelatedDocuments` |

### 7.2 Component rules

- Native `<a>` for navigation and `<button>` or `<summary>` for actions; a real focus order.
- **News and Announcement:** News is editorial and leads with its headline; an Announcement states
  its current relevance. Both link to their canonical page.
- **Health knowledge** reads differently from action links and from Health Reports.
- **Quick Access** links only to existing V1 destinations, curated in the CMS: no second sitemap.
- Hover is an enhancement: a link is understandable without it.
- Loading, empty, expired, failed and unavailable states never render a dead link.
- A section with nothing to show is left out or compacted, never filled with placeholder content.

### 7.3 Cards and their pictures

- **Whole-card navigation** (#193; Product Owner, #190 comment 6707205912): each shared
  ContentCard (the News, Health News, Health Content and Activities lists) and the Service card
  (the Homepage's and the catalog's, §8.4) has one native link named by its title alone. The
  picture/fallback, icon, metadata, summary and padding all open its original destination.
  H2 titles on lists and H3 under Homepage sections name a full-surface native link through
  `aria-labelledby`. Other content stays outside the link's visible label and remains readable,
  with no nested anchors or another focus stop. Enter, modified clicks and new-tab actions work.
- **Interaction:** each card keeps its own: the Service card (§8.4), News cards (§8.6), Health
  Content cards (§8.8), Activity tiles (§8.10) and multi-action cards. No card has a hover ring:
  the catalog's own Service card, with its 2 px `brand-primary` ring under the pointer, left with
  Feature 011 #340.
- **The Service catalog's card** (Feature 011 #340; spec #338 "The Service catalog", decisions 13,
  20 and 21) is the Homepage's Frequently Used Service card (§8.4), `HomeServiceCard` with
  `kind="list"`: its name an H2, at rest the `card` shadow and under the pointer `deep`, as the
  lists' cards. `/services` lays the cards in a plain grid, three to a row from `lg`, two from `sm`
  and one below at any count from one to twelve, 20 px apart from `sm` and 12 px below, without
  the Homepage's rule for four or its overhang below the field; each card reveals as it comes into
  the window (§8.12). The cards follow the filter form over the field's edge (§7.8), and their
  focus ring lies on the card's white, inside its edge, so it needs no band. A Health Service's
  "บริการที่ให้" shows the same card, `kind="section"`: its name an H3 under the section's H2, the
  `card` shadow at rest and `deep` under the pointer, two to a row from `sm` and one below at any
  count, shown at once (§9.8; Feature 011 #345).
- **The list card**, on the News, Health News and Health Content lists (Feature 009 #283; spec
  #280 "The cards", decisions 4, 10 and 15) and the Activities list (Feature 010 #313; spec #311
  "The Activities list", decisions 6 and 12), is the Homepage's small News card (§8.6),
  `ContentCard` with `kind="list"`: white, radius 22, the `card` shadow. From `sm` a 16:9 picture above its text;
  below `sm` a row with a 120 px picture at 4:3, radius 14, 10 px inside the card, which leaves
  the title 130 px at 320 px. Under the picture one line with the date (13 / 20 semibold,
  `brand-primary`), a dot and the label (regular, `text-secondary`): the News category on `/news`
  and the first Health Topic on Health News and Health Content, the date alone without one. Below
  `sm`, where the row holds no label beside the date, the whole label goes on the next line
  without the dot (Product Owner, 2026-11-13: #283 comment 6855983271); from `sm` a label longer
  than its column runs onto the next line. On `/activities` the date is when the Activity was
  held, else its publication, the date the list orders by, and the label is its place
  (`location_text`), held to its lines (`clampLabel`): from `sm` the line is two lines at most,
  and below `sm` the place one line, each cut with an ellipsis. Then
  the title, an H2, body size semibold below `sm` and body-large from `sm`, three lines at most;
  from `sm` the summary at label size in `text-secondary`, two lines at most, and none below `sm`.
  Without a picture, or when its media item was deleted, the `plain-visual` with the 48 px
  gradient tile and the list's 24 px icon: `message-square` on `/news`, `heart-pulse` on Health
  News and Health Content, `heart` on `/activities`. The cards go three to a row from `lg`, two from `sm` and in rows below, 24 px apart from
  `sm` and 14 px below; a last row may hold fewer, and no cell is filled. Under the pointer, with
  motion allowed, the picture grows by 6 % inside its box and the card lifts 6 px with the `deep`
  shadow, with no ring and the title in its colour; the link still covers the card's
  resting place. Each card reveals as it comes into the window, and its picture's box shimmers as
  the page opens (§8.12). Keyboard focus is the global 3 px outline with a `surface-base` band
  2 px wide on both sides (`focus-ring-banded`): a card of the first row of `/news` and of
  `/activities` lies over the deep field's lower edge (§7.8), where the ring alone reads 1.00:1 on half its length at 375 px, and
  with the band what lies beside the ring reads 5.09:1 or more, and beside the large card 4.06:1 at
  1,024 px (Product Owner, 2026-11-13: #283 comment 6854670042; measured at `fb11b3e` with
  `scripts/measure-focus-contrast.ts` on `/news`, §3.2, and at `47fc28a` on `/activities`, #318). On
  the page's colour the band hardly
  shows. On `/activities`, as on `/news` with the same layout, the band leaves none of a card's
  ring beside a colour under 3:1 at the five widths, but for the second card at 1,024 px, where 24
  px of its ring are covered and not in its colour, 2.97:1 at the lowest on both lists, which #322 follows up (Product Owner, 2026-11-16: #313 comment 6903865541); and with `--all-text` at the
  five widths every text of a card reads 4.97:1 or more, the place and the summary in
  `text-secondary` the lowest; the large card's text over a white picture 6.24:1 or more, its
  place the lowest, and over the deep visual 11.12:1 or more (#313; measured at `bf70e05` with
  `scripts/measure-text-contrast.ts` and `scripts/screenshot-fixtures/activities-list-light-picture.ts`).
- **The large card on a list's first page** (Feature 009 #284; spec #280 "The cards", "The
  first page", decisions 2 and 11): on a first page of `/news`, Health News or Health Content
  that no Health Topic narrows, and on every first page of `/activities`, which has no filter
  (Feature 010 #313), the newest item is the Homepage's large News card (§8.6),
  `ContentCard` with `kind="list"` and `large`. Its picture covers it, radius 24, from its middle
  or around its focal point, under the `brand-dark` gradient from its foot. Over the gradient: the
  date in an `accent-warm` pill and, when the item has one, its label in an outlined pill
  (`surface-base` words, a 1 px `surface-base` outline at 40 % and a `brand-dark` fill at 40 %, so
  its words keep 4.5:1 where the gradient is lightest: Product Owner, 2026-11-14: #284 comment
  6870867641, item 1), beside the date or, when it is too long for the line, under it where the
  date starts, never cut (Product Owner, 2026-11-14, #284 comment 6871942671), but for an
  Activity's place, one line at most, cut with an ellipsis (spec #311 "The Activities list"); the title,
  an H2, in `surface-base` at H3 size and body-large semibold below `sm`, three lines at most; and
  from `sm` the summary in `surface-base` at body size, two lines at most. Without a picture, or
  when its media item was deleted, the
  `deep-visual` with the 72 px `accent-warm` tile and the list's 24 px icon. One link named by the
  title covers it, with the lists' `focus-ring-banded`. Under the pointer, with motion allowed,
  the picture grows by 6 % inside its box and the card stays in its place; it reveals as it comes
  into the window and its picture's box shimmers as the page opens (§8.12). The layout by the
  number of items the page shows (`src/lib/list-first-page.ts`):

  | Items | From `lg` (three columns) | From `sm` (two columns) | Below `sm` |
  | --- | --- | --- | --- |
  | 1 | across the row, 440 px high or more | across the row, 380 px or more | 300 px or more |
  | 2 | two columns wide, as high as the card beside it and 380 px or more | across the row, the other under it | the large card, then a row |
  | 3 or more | two columns wide and two rows high, 520 px or more, beside the next two; the rest three to a row | across the row; the rest two to a row | the large card, then rows |

  A full page of twelve at two columns ends with one card alone (decision 11). A later page, and
  a list narrowed by a Health Topic, show the small cards alone. Its picture's `sizes` is two of
  the container's three columns from `lg` (all three with one item) and the row below.
- **The Document row** on `/documents` (Feature 010 #315; spec #311 "The Document repository",
  decisions 2, 8, 16 and 17), and under an Announcement's "เอกสารที่เกี่ยวข้อง" with its title an H3
  (§9.4; #316), `DocumentDownloadRow`: a white row, radius 22, the `card` shadow,
  14 px apart, after the filter form. It holds the file's tile, the Announcement row's date tile
  in size and gradient (68 px, radius 14, below `sm`; 92 px, radius 18, from `sm`; §8.7), with the
  24 px `file-text` and under it the file's type ("PDF") at small size, semibold, in
  `accent-warm` (§3.2), or "ไฟล์" when the file cannot be served or carries no type in its name;
  it is decorative. Beside the
  tile: the facts line as before (`MetaLine`: type, Document date, "ปีงบประมาณ" and the year);
  a superseded or expired Document's `accent-warm` attention label on its own line; the title,
  an H2, `text-primary`, semibold, body size below `sm` and body-large from `sm`, two lines at
  most (Product Owner, 2026-11-16: #315 comment 6908747140, item 1), linking to the Document's
  page; and from `sm` the summary at label size in `text-secondary`, two lines at most. Then the
  download, the same for a superseded or expired Document, whose label above the title states its
  status (Product Owner, 2026-11-16: #315 comment 6909993217): a `brand-primary` pill 44 px high,
  with the 20 px `download` icon, "ดาวน์โหลด" semibold and the file's type and size in parentheses
  in regular weight, linking to the file at EmDash's media URL under the uploaded file's name, as
  the Document's page does. Its
  accessible name adds the Document's title after the visible words, for assistive technology
  only, so the downloads of a page are told apart (WCAG 2.2 SC 2.4.4, 2.5.3). A file that cannot
  be served shows "ไฟล์ไม่พร้อมให้บริการ" at small size, semibold, in `text-secondary`, in its
  place, and no link. The download sits at the row's right, beside the text, from `lg`; under
  the text at its start from `sm`; across the row under the tile and the text below `sm`
  (decision 17); its type and size stay whole on one line, and words that do not fit one line take
  two, centred 8 px inside the pill (`FileDownloadLink`, §9.5; #317). **No link covers the row**,
  unlike a whole card: the title and the download are
  its two links and its two focus stops, and a press elsewhere on it opens nothing (decision 16).
  Under the pointer the title turns `brand-primary` and underlined on its own link only (#315
  comment 6908747140, item 2), and the row takes the `deep` shadow, only with motion allowed;
  the download's fill turns `brand-dark`. Each row reveals as it comes into the window and shows
  whole while it holds the keyboard's focus (§8.12); under an Announcement's, a Service's and a
  Basic Page's "เอกสารที่เกี่ยวข้อง" it shows at once (§9.7, §9.9; Feature 011 #344; Feature 012
  #368). The About Document pages show
  the same row, titles H2, over the field's edge, as `/documents` without its filter form (§7.8;
  Feature 012 #366), and search results keep their own; a Health Report's
  page shows its one Document
  as a Document's page shows its file (§9.6; Feature 011 #343). With
  `--all-text` at the five widths every text of a row reads 4.97:1 or more, the facts line, the
  summary and "ไฟล์ไม่พร้อมให้บริการ" in `text-secondary` the lowest; the tile's "PDF" 5.60:1 or
  more, the download's words 6.45:1, the attention label 7.75:1 and the title 16.54:1. Both
  links' rings lie on the row's white: under each ring 6.45:1 at the five widths, beside the
  download's 6.07:1 or more (#315; measured at `fac3acd` with `scripts/measure-text-contrast.ts`,
  `scripts/measure-focus-contrast.ts` and `scripts/screenshot-fixtures/lists-by-count.ts`).
- **The Health Service row** on `/health-services` (Feature 011 #341; spec #338 "The Health
  Service Directory", decisions 12 and 16), `HealthServiceMapRow`: the Document row's white row,
  radius 22, the `card` shadow and padding, 14 px apart, after the filter form, in one column at
  any count (decision 13). It holds the Document row's tile in size and gradient (68 px, radius
  14, below `sm`; 92 px, radius 18, from `sm`) with the 24 px `hospital` in `accent-warm`; it is
  decorative. Beside the tile: the facts line (`MetaLine`: the Facility Type and the Area,
  separated by "•", at small size in `text-secondary`), which wraps between facts and inside a fact
  only when that fact alone is wider than the line (Product Owner, 2026-11-18: #341 comment
  6966593423, item 2); a temporarily closed or inactive Health Service's `accent-warm` attention
  label on its own line, and none for an active one; the shown name, an H2, `text-primary`,
  semibold, body size below `sm` and body-large from `sm`, two lines at most, linking to the Health
  Service's page; the official name when the display name differs, at small size in
  `text-secondary`; and the address with the line breaks staff typed, at label size in
  `text-secondary`, two lines at most at every width. Then "เปิดแผนที่" when the Health Service has
  valid coordinates: the outlined pill (`border-input` edge, `brand-primary` label, 44 px high),
  semibold as the prototype's (#341 comment 6966593423, item 1), with the 20 px `map-pin` before the
  words and the 16 px `arrow-up-right` after, linking to the map address its coordinates build
  (`src/lib/map-link.ts`) in a new tab. Its accessible name adds the shown name after the visible
  words, then "(เปิดในแท็บใหม่)", for assistive technology only. A Health Service without both
  coordinates shows no map link, and its place stays empty. The map sits as the Document row's
  download: at the row's right, beside the text, from `lg`; under the text at its start from `sm`;
  across the row under the tile and the text below `sm`, its words centred. **No link covers the
  row:** the name and the map are its two links and its two focus stops, and a press elsewhere on
  it opens nothing. Under the pointer the name turns `brand-primary` and underlined on its own
  link only, and the row takes the `deep` shadow, only with motion allowed. Each row reveals as it
  comes into the window and shows whole while it holds the keyboard's focus (§8.12). Under a
  Service's "หน่วยบริการสุขภาพที่ให้บริการนี้" the same row shows at once, its name an H3 (§9.7;
  Feature 011 #344). "เปิดแผนที่" in a Health Service's page's card (§9.8) and on `/contact` keeps
  its look without the `map-pin`.
  With `--all-text` at the five widths every text of a row reads 4.97:1 or more, the facts line,
  the official name and the address in `text-secondary` the lowest; "เปิดแผนที่" 6.45:1, the
  attention label 7.75:1 and the name 16.54:1. Both links' rings lie on the row's white: under each
  ring 6.45:1 at the five widths, beside the map's 6.07:1 or more (#341; measured at `bf2b3d4` with
  `scripts/measure-text-contrast.ts` on the demo dataset's directory and with
  `scripts/screenshot-fixtures/health-services.ts`, and `scripts/measure-focus-contrast.ts`).
- **The Health Report row** on `/health/reports` (Feature 011 #342; spec #338 "The Health Reports
  list", decisions 1 and 12), `HealthReportRow`: the Announcement row (§8.7) without its badge, a
  white row, radius 22, the `card` shadow and the Announcement row's padding, 14 px apart, over
  the field's edge, in one column at any count. It holds the Document row's tile in size and
  gradient (68 px, radius 14, below `sm`; 92 px, radius 18, from `sm`) with the 24 px
  `file-chart-column` in `surface-base` and under it the fiscal year at small size, semibold, in
  `accent-warm`, as the file tile's "PDF" (§3.2), or the icon alone for a report without a fiscal
  year; it is decorative. Beside the tile, 4 px apart: the facts line (`MetaLine`: the Report
  Type, the date the list orders by, the report date or else the publication, and "ปีงบประมาณ" with
  the year, separated by "•", at small size in `text-secondary`), which wraps between facts and
  inside a fact only when that fact alone is wider than the line; the title, an H2,
  `text-primary`, semibold, body size below `sm` and body-large from `sm`, two lines at most, cut
  with an ellipsis; from `sm` the summary at label size in `text-secondary`, two lines at most;
  and the reporting period, "ช่วงเวลาของรายงาน:" and the period, at small size in `text-secondary`.
  Each part shows only when set. From `sm` the Announcement row's round `arrow-right` ends the
  row. **One link**, named by the title, covers the row, with the lists' `focus-ring-banded`, the
  first row lying over the field's edge; the facts and the period stay outside its name. A report
  row has no download: the list does not read its Document (decision 1). Under the pointer the
  title turns `brand-primary` and the arrow's circle `accent-warm` with a `brand-dark` arrow; with
  motion allowed the row also moves 10 px to the right with the `deep` shadow, and the link
  reaches back over the strip it left, as the Announcement row's. Each row reveals as it comes
  into the window and shows whole while it holds the keyboard's focus (§8.12). With `--all-text`
  at the five widths every text of a row reads 4.97:1 or more, the facts line, the summary and the
  period in `text-secondary` the lowest; the tile's fiscal year 5.60:1 or more and the title
  16.54:1. The first row's ring, over the field's edge, reads 1.00:1 under it on about half its
  length, and with the band 5.43:1 or more beside it, none under 3:1; a later row's 5.39:1 under
  it and 6.07:1 beside it (#342; measured at `7b49b6e` with `scripts/measure-text-contrast.ts` on
  the demo dataset's list and with `scripts/screenshot-fixtures/lists-by-count.ts`, and
  `scripts/measure-focus-contrast.ts`).
- **Crops:** a list's card, a News, Health Content or Activity card, crops its picture to 16:9
  from `sm` and 4:3 below (`ContentCard.astro`), as the Homepage's small News card does; the
  Homepage's Health Content
  cards and its Activity tiles have their own boxes (§8.8, §8.10), an Activity's photos are
  squares (§9.2), and a person's portrait is a circle inside its ring (`PersonPicture.astro`) on a
  leader's card, in a unit's panel and in the Homepage's Leadership strip (§8.5). Every picture a
  page crops keeps in view the focal point that its field's value carries: its `object-position`
  is that point. Without a focal point a card, a tile and a photo show the picture's middle, and
  a portrait its top, where the face is (#284 comment 6870867641, item 2; #298 comment
  6892189972, decisions 1 and 2). EmDash's placeholder would drop the focal point, so every
  cropped picture takes none, which `tests/node/public-media.test.ts` checks. A One Page in a
  card therefore shows its middle, where its photo collage is, unless staff set a focal point
  (Product Owner: "คงครอปกลางภาพแบบเดิม (แนะนำ)"; spec #144 names the 16:9 crop, exact then for
  Activity cards only).
- Without a picture, or when its media item was deleted, a card shows a plain visual that keeps
  the grid even.
- **The Homepage's Quick Access card** (`HomeQuickLink`; §8.11) is compact below 640 px:
  - its side padding is 12 px, a measured fit: a card keeps 112 px for a label at 320 px, and
    "ความดันโลหิตสูง" is 107 px at body size, semibold;
  - its label lies across the card's content width, and its 24 px arrow on a row of its own at
    the lower right, at least 8 px below the label. The card grows with its label, with no one
    fixed height, and the cards of a row share one height. One line of label makes it 82 px tall
    (a 26 px line, the 8 px gap, the arrow and 24 px of padding), the taller proportions the
    Product Owner accepted (#190 comment 6707205912, Quick Access B).
  - The ITA landing has a card of its own for each fiscal year, `ItaYearCard` (§8.3).
  - `/health` shows its two destinations, "ความรู้สุขภาพ" then "รายงานสุขภาพ", with it (Feature 011
    #339; spec #338 "`/health`"), `kind="list"`: over the field's lower edge (§7.8), two to a row
    at every width, 12 px apart below `sm` and 20 px from `sm`, the compact card below 640 px.
    There its label is an H2, the page's tiles being a list's under no other heading, where the
    Homepage's label is plain text under its section's H2 (Product Owner, 2026-11-17: #339
    comment 6941979791), and its link's focus ring has the lists' `surface-base` band
    (`focus-ring-banded`, §3). Each tile reveals as it comes into the window (§8.12).
  - `/about` shows its six sub-pages with it the same way (Feature 012 #371; spec #365 "`/about`",
    decisions 8 and 10), in `01` §3 order (โครงสร้างองค์กร, ผู้บริหาร, บุคลากร, นโยบาย, แผนงาน,
    ผลการดำเนินงาน): over the field's lower edge, two to a row below `lg` and three from `lg`,
    12 px apart below `sm` and 20 px from `sm`, the compact card below 640 px, each label an H2 and
    each focus ring banded (§9.9). The page's earlier H2 "ข้อมูลเกี่ยวกับสำนักงาน" over the links
    goes.
- **A leader's card** (`LeaderCard`; Feature 012 #367; spec #365 "Leadership", decision 11) shows a
  leader on `/about/leadership`, over the field's lower edge (§7.8), and links nowhere: Personnel
  has no page of its own (`03` §5).
  - **The featured card** holds the first leader by Leadership order, across the row: white, the
    `deep` shadow, radius 24, 24 px of padding, 32 px from `sm` and 32 by 40 px from `lg`; the
    picture in its ringed circle (`PersonPicture`, §8.5) at 96 px, 128 px from `sm`, with a 6 px
    gap and the 3 px `accent-warm` ring; the shown name as an H2 at H3 size, H2 size from `sm`, in
    `text-primary`; the position at body-large in `brand-primary`; the unit at small size in
    `text-secondary`; the public contact under "ช่องทางติดต่อ" (`PublicContact`). Below `sm` the
    picture lies above the text, 20 px over it; from `sm` beside it, 32 px away, the two centred
    on each other. From `sm` a decorative `surface-soft` circle of 240 px lies at the lower right,
    cut by the card's edge.
  - **The others' cards** follow 32 px under it, three to a row from `lg`, two from `sm` and one
    below, 20 px apart from `sm` and 16 px below, the cards of a row one height: white, the `card`
    shadow, radius 24, 20 px of padding; the ringed circle at 60 px, 76 px from `sm`, with a 4 px
    gap and the 2 px `border-default` ring, as the strip's people after the first; beside it, 16 px
    away and 20 px from `sm`, from its top, the name as an H2 at body-large, semibold, in
    `text-primary`, the position in `text-secondary`, the unit at small size in `brand-primary` and
    the public contact under "ช่องทางติดต่อ".
  - Each part shows only when it is set. A picture is decorative and covers its circle from its top
    or around its focal point, with no placeholder; without one, or with one whose media item was
    deleted, the circle is plain `surface-soft`. With one leader the featured card shows alone.
    The leaders stay one ordered list. Each card, the featured one too, reveals as it comes into
    the window (§8.12); no card holds a link or a control, so none takes the keyboard's focus.
- **A unit's panel** (`UnitPanel`; Feature 012 #370; spec #365 "Personnel", decision 12) shows an
  organizational unit and its people on `/about/personnel`, over the field's lower edge (§7.8),
  one panel per unit in the units' Thai order, the Personnel without a unit last under
  "ไม่ระบุหน่วยงาน", 24 px apart.
  - **The panel:** white, the `card` shadow, radius 24, 20 px of padding and 28 px from `sm`. Its
    head is a 40 px `surface-soft` tile of radius 14 with the 20 px `users-round` in
    `brand-primary`, decorative, and 12 px beside it the unit's name as an H2 at H3 size in
    `text-primary`, the two centred on each other; a 1 px `border-default` rule lies 16 px under
    them.
  - **Its people,** 20 px under the rule, by name, one to a row below `sm`, two from `sm` and three
    from `lg`, 24 px across and 20 px down, each a compact row that links nowhere: the picture in
    its ringed circle (`PersonPicture`, §8.5) at 52 px, 60 px from `sm`, with a 2 px gap and the
    2 px `border-default` ring; beside it, 14 px away, from its top, the shown name as an H3 at
    body size, semibold, in `text-primary`, the position at label size, regular, in
    `text-secondary`, 2 px apart, and the public contact under "ช่องทางติดต่อ" (`PublicContact`,
    10 px under them: its own 8 px and the row's 2 px). The panel names the unit, so a row leaves it out.
  - Each part shows only when it is set; the picture as a leader's card has it (above). Each panel
    reveals as it comes into the window (§8.12); no row holds a link or a control. With no one the
    list's empty state lies over the edge.

### 7.4 Header and navigation

`src/layouts/SiteLayout.astro` (#240; spec #239 "Header (every page)", "Footer (every page)";
Product Owner, #239 comment 6786536858). It replaces Feature 007's Header B (#191), whose native
menu, screen-reader labels and identity roles it keeps:

- **One sticky row** on `surface-base` at 90 % with a backdrop blur and the `header` shadow: the
  logo or placeholder mark, the site title, the optional tagline, the main navigation from
  1,024 px, and a round 48 px search link to `/search` at every width, named "ค้นหา" for assistive
  technology. The row is 84 px tall from 640 px and at least 68 px below.
- **No utility bar.** No header link goes to `/contact`: the footer links there on every page.
- **Navigation from 1,024 px:** the same order, destinations and current-section marks as before.
  The current item is a `surface-soft` pill with `brand-primary` semibold text; the others are
  medium weight and take the pill on hover.
- **Text that scales from 1,024 px,** so the row fits at 1,024 px without a third breakpoint: the
  title is `clamp(16px, 1.3vw, 18px)` on a 24 px line, and a navigation item
  `clamp(15px, 1.15vw, 16px)` with `clamp(8px, 0.9vw, 12px)` either side. Below 1,024 px the title
  is 18 px, and below 640 px 16 px on a 22 px line.
- **Below 1,024 px** the navigation is the native `<details>` menu, with no client JavaScript. Its
  48×48 px button, with 14 px corners, shows a 20 px Lucide menu icon while closed and X while open,
  when it turns `brand-primary`; screen-reader-only "เปิดเมนู" / "ปิดเมนู" labels name its state. The
  panel lists the same items as full-width 56 px rows, each ending in `chevron-right`, the current
  one on `surface-soft`. The same button closes it; there is no Escape handler.
- **The open menu is part of the header's flow.** At the top of the page it pushes the page down.
  It stays with the header while the page scrolls, no taller than the window below the row, and
  scrolls inside itself when it is.
- **Nothing is left under the header.** `scroll-padding-top` keeps what focus or an anchor link
  scrolls to below `--header-offset`, and below the open menu too, whose height the shell sets as
  `--menu-height` from its number of items. A sticky box elsewhere (a post's picture, the MOIT
  page's table of contents) sits `--header-offset` plus 24 px from the top.
- **The skip link** is the header's first link and shows under the header's lower edge when it
  takes focus, as an `accent-warm` pill.
- **The title wraps** rather than push a button off the row. The office's own name is three lines
  at 320 px, which makes the header 86 px tall, and two at 375 px, within the 68 px. A longer
  configured title takes more lines at any width, and the row grows with it (§10).
- **Focus rings:** `brand-primary` in the header, `accent-warm` in the footer.

**Footer.** `brand-dark` with 32 px top corners (24 px below 640 px): the logo or placeholder mark
(`accent-warm` here; a configured logo sits on a white tile) and the site title, with
"จังหวัดแพร่ · กระทรวงสาธารณสุข" under it; "ช่องทางทางการ" before the official channels, each a pill
that ends in `arrow-up-right`; then, under a rule, the published policy pages and "ติดต่อเรา". The
channels, the policy pages and their sources are as before (#62, `src/lib/basic-pages.ts`).

The header's heights were read on the development runtime at `67340c9`, with the office's own
name as the title and no tagline, from `scripts/capture-screenshots.mjs` close-ups of `header` on
`/news` and `/` at 1,440, 1,280, 1,024, 1,023, 768, 640, 639, 375 and 320 px: 84 px from 640 px,
68 px at 639 and 375 px, 86 px at 320 px. The public-shell suite
checks the search link and the absent utility bar on two pages, the sticky header, the footer, the
menu without JavaScript, both sides of 1,024 and 640 px, reflow at 375 and 320 px, keyboard order,
the focus rings, axe, and the configured and fallback identities, restoring settings in `finally`.

### 7.5 Breadcrumb

`src/components/Breadcrumb.astro` (#192; spec #190 “Breadcrumb below 640 px”; Product Owner,
#190 comment 6707205912, Breadcrumb B) follows Sitemap `03` §14's public hierarchy:

- Ancestors remain full-text links, root first; the trail can wrap across rows.
- The current page is text with `aria-current="page"`. Below 640 px its label occupies one line,
  with ellipsis only when it exceeds its available width. The underlying text remains complete
  for assistive technology; a short label that fits shows in full.
- The H1 keeps its full text, type and wrapping. From 640 px the current breadcrumb label wraps
  as before. Breadcrumb labels remain outside ThaiTitle's word-keeping scope (§4.1).
- The public-browser suite covers long and short labels at 320/375/639/640/1440 px, ancestor
  destinations, H1, clipping, keyboard navigation, axe, reflow and JavaScript-disabled pages.
- On the deep field under a page's heading (§7.8) or a post's header (§9.1) the links and the current page are
  `surface-base` and the separators `surface-base` at 75 %, with the field's `accent-warm` focus
  ring. The page shows the breadcrumb on its field in place of the shell's, with the same items,
  markup and one-line rule; a link there keeps its underline and does not change under the pointer.

### 7.6 Pagination

`src/components/Pagination.astro` (#196; spec #190 “Pagination”; Product Owner, #190 comment
6707205912, Pagination B) serves every paged list and search:

- Below 640 px, “หน้า N” is centered on a row of its own. Below it, Previous starts at the left
  and Next ends at the right, in two columns sized to their contents, so both labels keep one line
  at 320 px with `text-label` type, 20 px side padding and the 44 px height. The pager is 82 px
  tall (a 22 px line, the 16 px gap and the links), where one row is 44 px; that height is the
  accepted tradeoff for the same placement at every phone width.
- From 640 px the number and links share one row, with Previous at the left, Next at the right and
  even space around the number.
- Previous appears only after page 1, and Next only when another page exists; page 1 with no other
  page has no pager. The pager has no disabled link and no total page count, since a list knows
  only whether a further page exists.
- The links are native and work without JavaScript. Each keeps the page's other query parameters
  and changes only `page`, and page 1's address carries no page number (`src/lib/pagination.ts`).
- The public-browser suite goes through a filtered list's real first, middle and last pages at
  320, 375, 639, 640, 768, 1,023, 1,024 and 1,440 px. It covers single-page results at 320 and
  1,440 px, search at 320 and 640 px, keyboard use, axe, reflow, and JavaScript-disabled pages at
  320 and 640 px.

### 7.7 Filter form

`src/components/FilterForm.astro` (#197; spec #190 “FilterForm clear action”; Product Owner, #190
comment 6707205912, FilterForm B) serves Services, Documents, Health News, Health Content and the
Health Service Directory:

- “แสดงผล” is the solid `brand-primary` submit button. “ล้างตัวกรอง” beside it is an outlined pill: a
  1 px `border-input` edge, a `surface-soft` fill and a `brand-primary` label, turning `surface-base`
  on hover. That is the reverse of `ActionLink`'s secondary, which is white at rest and soft on
  hover. Both actions are at least 44 px tall and the same height at every width.
- The clear link is a native anchor to the list's own address, not a reset button: it drops every
  filter and any page number. It shows only for a filter the server applied. A draft change in a
  field does not show it, nor does a blank value or one the list sets aside, such as a Document
  fiscal year that is no number. An applied value that matches nothing still shows it.
- The form is a plain GET form that works without JavaScript. Its field names, options and values
  stay in the address, which reproduces the results. It carries no page number, so submitting starts
  the list from its first page.
- Below 640 px the fields stack above the actions, each as wide as the form. From 640 px a field is
  288 px wide, and fields and actions wrap inside the form.
- On Health News, Health Content and Documents the form is the first block over the deep field's lower edge,
  under the list's heading, with the cards or the empty state 32 px under it (§7.8). It keeps its
  look there: its white card carries its own text and the page's `brand-primary` focus ring.
- The public-browser suite goes through all five lists, with Documents' three selects and the
  directory's Area and name fields. The applied and draft states, the first-page restart and the
  keyboard run at 320 px, and JavaScript-disabled pages at 320 and 1,440 px. Target height, look and
  fit run at 320, 375, 639, 640, 768, 1,023, 1,024 and 1,440 px, hover at 1,440 px, and axe, focus
  and reflow at 320, 375 and 1,440 px.

### 7.8 List heading on the deep field

`ListHeading` (Feature 009 #281, #282; spec #280 "The field under a heading", "List heading")
heads `/news`, Health News (`/news/health`) and the Health Content list (`/health/content`),
since Feature 010 #312 (spec #311 "Decisions", 3 and 4) the Activities list (`/activities`), the
Announcements list (`/announcements`) and the Document repository (`/documents`), and since
Feature 011 #339 (spec #338 "Decisions", 5, 6 and 15) the Health Information hub (`/health`), the
Health Reports list (`/health/reports`), the Service catalog (`/services`) and the Health Service
Directory (`/health-services`), and since Feature 012 #366 (spec #365 decisions 4 and 5) the
About Document pages (`/about/policies`, `/about/plans` and `/about/results`), and since #367
(spec #365 decisions 4 and 11) the Leadership page (`/about/leadership`), and since #370 (spec
#365 decisions 4 and 12) the Personnel page (`/about/personnel`), and since #369 (spec #365
decisions 4, 9 and 13) the Contact page (`/contact`), and since Feature 013 #393 (spec #392
decisions 2, 7 and 11) the ITA landing (`/ita`), and since #394 (spec #392 decisions 2 and 12) a
fiscal year's page (`/ita/{fiscal-year}`).

- **The field** is the Homepage's deep green field (`DeepField` with `kind="list"`, the
  `deep-field` utility; §8.1): lower corners of radius 32 (24 below `sm`), `surface-base` text and
  the `accent-warm` focus ring. What lies on it differs, each from a measure on the prototype (spec
  #280 "Measured in the prototype": with the Homepage's glows and rings a list's lead read 3.42:1
  and an outlined link's words 2.47:1):
  - from `sm` its glow is small, 28 % of the field's width by 12 rem at the upper right corner;
    below `sm` it is the utility's phone glow;
  - it has the large ring alone, from `lg`;
  - it has no `accent-warm` glow and no small ring, and no `surface-soft` glow either, as the
    prototype's field (Product Owner, 2026-11-13: #281 comment 6847783611, item 2).
- **On it, in this order:** the breadcrumb (§7.5), 24 px under the header; the Homepage's section
  heading block (§8) with the page's H1 in `section-title` (§4), an `accent-warm` icon tile with a
  `brand-dark` 24 px icon and the slashed label; and the lead at body-large, 16 px under the
  heading. The breadcrumb and the heading are 24 px apart below `sm` and 32 px from `sm`. Every
  text is solid `surface-base`: `scripts/measure-text-contrast.ts` cannot read text at 90 % white,
  which Tailwind writes as `color-mix`.
- **`/news`** is headed as the Homepage's Latest News (`NEWS_HEADING`, `src/lib/news.ts`): the
  label "ข่าวสาร", the H1 "ข่าวประชาสัมพันธ์" and the `message-square` icon. Its title in the head,
  its menu item and its breadcrumb read "ข่าวสาร" (spec #280 "Decisions", 3).
- **The link.** `/news` has one, to Health News: a white pill, 52 px high from `sm` and 44 px
  below, with "ข่าวสุขภาพ" in `brand-primary` at body size, semibold, and a 16 px `arrow-right`;
  under the pointer it is `accent-warm` with `brand-dark` words. From `sm` it sits at the
  heading's right, level with the heading's top; below `sm` it follows the lead, 20 px under it.
  That is the prototype's place for it, where spec #280 says "on the lead's baseline" (Product
  Owner, 2026-11-13: #281 comment 6846855734).
- **Health News** is labelled "ข่าวสาร", the News section's label (`NEWS_HEADING`), over its H1
  "ข่าวสุขภาพ"; **Health Content** is labelled "สุขภาพ", the Homepage's Health Information label,
  over its H1 "ความรู้สุขภาพ". Each has the `heart-pulse` icon and no link, and keeps its lead, its
  title in the head and its breadcrumb (spec #280 "Decisions", 3).
- **`/activities`** is labelled "ภาพกิจกรรม" over its H1 "กิจกรรม", with the `heart` icon, and
  **`/announcements`** "แจ้งให้ทราบ" over "ประกาศ", with `file-text`, as their Homepage sections
  (§8.7, §8.10); both breadcrumbs go through ข่าวสาร. **`/documents`** is labelled "เข้าถึงข้อมูล",
  the Homepage's Quick Access label (§8.11), over "เอกสารเผยแพร่", with `folder-open`, its
  breadcrumb under หน้าแรก. None has a link, and each keeps its lead, its title in the head and its
  breadcrumb (spec #311 "Decisions", 3).
- **`/health`** and **`/health/reports`** are labelled "สุขภาพ", as Health Content, over their H1s
  "ข้อมูลสุขภาพ" and "รายงานสุขภาพ", with `heart-pulse` and `file-chart-column`; **`/services`**
  "บริการ" over "บริการประชาชน", with `users`, as the Homepage's Frequently Used Services (§8.4); and
  **`/health-services`** "หน่วยบริการ" over "หน่วยบริการสุขภาพที่เกี่ยวข้อง", with `hospital`, as the
  Homepage's Health Service band (§8.9), whose H2 it does not take (spec #338 "Decisions", 14).
  None has a pill link, and each keeps its lead, its title in the head and its breadcrumb (spec
  #338 "Decisions", 5).
- **The About Document pages** are labelled "เกี่ยวกับเรา", the About section's title, over their
  H1s "นโยบาย", "แผนงาน" and "ผลการดำเนินงาน", with `scroll-text`, `clipboard-list` and
  `chart-column`, their breadcrumbs through เกี่ยวกับเรา. None has a pill link or links under the
  lead, and each keeps its lead, its title in the head and its breadcrumb (spec #365 decision 4).
- **`/about/leadership`** is labelled "บุคลากร", the Homepage Leadership strip's label (§8.5), over
  its H1 "ผู้บริหาร", with `user-round`, its breadcrumb through เกี่ยวกับเรา. It has no link, and
  keeps its lead, its title in the head and its breadcrumb (spec #365 decision 4; Feature 012
  #367).
- **`/about/personnel`** is labelled "เกี่ยวกับเรา" over its H1 "บุคลากร", with `users-round`, its
  breadcrumb through เกี่ยวกับเรา. It has no link, and keeps its lead, its title in the head and its
  breadcrumb (spec #365 decision 4; Feature 012 #370).
- **`/contact`** is labelled "ติดต่อ", the Homepage Contact Summary's label (§8.11), over its H1
  "ติดต่อเรา", with `headset`, its breadcrumb under หน้าแรก, as it belongs to no section. It has no
  link, and keeps its lead, its title in the head and its breadcrumb (spec #365 decision 4; Feature
  012 #369). Its details card lies over the field's edge; with no Office Contact detail set nothing
  does, and the field ends 40 px under the lead below `sm` and 48 px from `sm`, as a header's field
  without a card (§9.4; `ListHeading`'s `overEdge={false}`; spec #365 decision 9; §9.10).
- **`/ita`** is labelled "ITA", the main navigation's word, over its H1
  "การประเมินคุณธรรมและความโปร่งใส (ITA)", with `shield-check`, its breadcrumb ending at ITA. It has no pill link or links
  under the lead, and keeps its lead, its title in the head and its breadcrumb (spec #392 decision
  2; Feature 013 #393). Its year cards lie over the field's edge, or with no published MOIT its
  empty state (§8.3).
- **A fiscal year's page** (`/ita/{fiscal-year}`) is labelled "ITA" over its H1 "ITA ปีงบประมาณ
  พ.ศ. YYYY", with `calendar-check`, its breadcrumb หน้าแรก › ITA › ปีงบประมาณ YYYY. It has no pill
  link or links under the lead, and keeps its lead, its title in the head and its breadcrumb (spec
  #392 decision 2; Feature 013 #394). Its MOIT rows lie over the field's edge; a year's page
  always holds a MOIT, so it has no empty state (§8.3).
- **The links under the lead.** `/services` has two, "ค้นหาหน่วยบริการสุขภาพที่เกี่ยวข้อง" to the
  directory and "คู่มือและแบบฟอร์ม" to `/documents`, its related pages that are not Services (spec
  #338 "The Service catalog", decision 15): 16 px under the lead, `surface-base` words, semibold,
  at label size and underlined, each with a 16 px `arrow-right`, 44 px high, 24 px apart across
  and 4 px down where they wrap. Under the pointer they keep their colour, as the breadcrumb's
  links on the field: `accent-warm` small text is below 4.5:1 there (§3.2; #339 comment
  6941979791).
- **What follows the heading** lies over the field's lower edge: the field's content ends 128 px
  above the edge from `sm` and 96 px below, and the block that follows (`ListBody`) starts 88 px
  above it from `sm` and 64 px below. On `/news` that block is the cards (§7.3) or the empty state,
  then the pager (§7.6); on Health News, Health Content and `/documents` the filter form (§7.7)
  comes first. They are 32 px apart, and each keeps its content and behaviour. On `/activities`
  the block is the list cards, as on `/news` (§7.3; Feature 010 #313), whose first row lies over
  the field with the lists' `focus-ring-banded`; on `/announcements` the block is the Homepage's
  Announcement rows (§8.7; Feature 010 #314), 14 px apart, each one link over the whole row, whose
  ring lies around the row and over the field in the first row, with the same band; on
  `/documents` the filter form is the block over the edge, its ring on its own white card, and the
  Document rows follow it (§7.3; Feature 010 #315), 14 px apart, each with two links, its title
  and its download, whose rings lie on the row's white, 6.45:1 (§7.3). On `/services` and
  `/health-services` the filter form is the block over the edge, then the Service cards (§7.3,
  §8.4; Feature 011 #340) or the Health Service rows (§7.3; #341), 14 px apart, each with two
  links, its name and its map, whose rings lie on the row's white; on `/health/reports` the
  Health Report rows are the block (§7.3; Feature 011 #342), 14 px apart, each one link over the
  whole row, whose ring lies around the row and over the field in the first row, with the lists'
  band, as on `/announcements`. On `/health` the
  block is the two Quick Access tiles (§7.3), their rings with the lists' band (Feature 011
  #339). On the About Document pages the block is the Document rows of `/documents` without its
  filter form (§7.3; Feature 012 #366), 14 px apart, each with its title and its download, whose
  rings lie on the row's white in the first row too; then the pager, or the type's empty state
  or, past the last page, its way back. On `/about/leadership` the block is the leaders' list
  (§7.3; Feature 012 #367), the featured first leader across the row and the others' cards 32 px
  under it, or the empty state; it has no pager, and no card holds a link, so no focus ring meets
  the field. On `/about/personnel` the block is the units' panels (§7.3; Feature 012 #370), 24 px
  apart, or the empty state; it has no pager, and no row holds a link. The cards are the
  Homepage's News
  cards: the small one, and on a first page that no Health Topic narrows the large one first
  (§7.3). On `/news` the first row lies over the field, where the global `brand-primary`
  ring alone was faint, so a card's ring has a `surface-base` band on both sides
  (`focus-ring-banded`, §7.3; Product Owner, 2026-11-13: #281 comment 6847783611, item 1, and
  #283 comment 6854670042).
- **Motion** (§8.12): with motion allowed the heading block rises in as the page opens, and the
  lead 0.1 s after it. Each card reveals as it comes into the window (§7.3), and on
  `/announcements`, `/documents` and the About Document pages each row (§7.3, §8.7; Feature 012
  #366), on `/health` each tile (§7.3), on `/about/leadership` each leader's card, the
  featured one too (§7.3; Feature 012 #367), and on `/about/personnel` each unit's panel (§7.3;
  #370). The
  breadcrumb, the link, the links under the lead, the filter form, the empty state and the pager
  show at once; `/services`' cards reveal as the other lists' cards do (#340), `/health-services`'
  rows as the Documents' (#341), and `/health/reports`' rows as the Announcements' (#342).
- **Measured** on the development runtime at `fb11b3e`, the head of `009-news-post-redesign`,
  with the demo dataset's six News and five Health Content (#287,
  `docs/evidence/287-news-post-redesign-evidence-round.md`):
  - `scripts/measure-text-contrast.ts` on `/news`, `/news/health` and `/health/content` at 1,440,
    1,024, 768, 375 and 320 px, the lowest reading of each text over the three lists: the lead
    6.45:1 (Health News at 768, 375 and 320 px, Health Content at 375 and 320 px; `/news` 6.63:1 at
    375 px), the H1 6.99:1 (`/news`, 320 px), the breadcrumb's current page 7.00:1 (Health
    Content, 320 px), the label 8.72:1 (Health Content, 320 px) and the breadcrumb's links 9.34:1
    (Health Content, 320 px). The link's words are `brand-primary` on `surface-base`, 6.45:1
    (§3.2). The large card's text over the demo pictures: the date pill 7.75:1, the label's words
    7.17:1 or more, the title 7.06:1 or more and the summary 8.84:1 or more; over a white picture,
    §3.2's row; and without a picture, over its `deep-visual`, the label's words 11.15:1, the title
    11.12:1 and the summary 11.59:1 or more.
  - At `8643ef1` (#312), `scripts/measure-text-contrast.ts --all-text` on the deep field of
    `/activities`, `/announcements` and `/documents` at the five widths, the lowest reading of each
    text over the three lists: the lead 6.27:1 (Documents, 375 px; Announcements 6.36:1 at 375 px,
    Activities 6.44:1 at 320 px), the H1 7.39:1 (Documents, 320 px), the label 8.48:1 (Activities,
    320 px), the breadcrumb's current page 8.96:1 (Activities, 320 px) and its links 9.73:1
    (320 px).
  - At `06b4b58` (#339), `scripts/measure-text-contrast.ts --all-text --fold` on the deep field of
    `/health/reports`, `/services` and `/health-services` and on the whole of `/health` at the five
    widths, the lowest reading of each text: the lead 6.45:1 (each page, at 768 px or below), the
    links under `/services`' lead 6.45:1 (320 px), the H1 6.99:1 (`/health-services`, 320 px), the
    label 8.84:1 (320 px), the breadcrumb's links 9.46:1 (`/health/reports`, 320 px) and its
    current page 5.07:1 (`/health-services`, 375 px), and `/health`'s tiles' H2s 16.54:1.
    `scripts/measure-focus-contrast.ts` on `/health`'s two tiles: beside the ring, with its band,
    no pixel under 3:1 at any width, the lowest 5.22:1 from 768 px and 2.80:1 on a few blended
    pixels at 375 px; the ring alone over the field read under 3:1 on 56 to 61 % of its pixels,
    which the band answers.
  - At `fad2249` (#340), the same on the whole of `/services`, with the demo dataset's nine Services
    and with a full first page of twelve synthetic ones (`lists-by-count.ts`, `LIST_COUNT=24`): a
    Service card's summary 5.07:1 where it crosses the corner circle (1,024 and 768 px) and 5.66:1
    on the card's white, its name 14.82:1 (375 and 320 px), the form's button 6.45:1 and the
    pager's "หน้า 1" under the last row 4.69:1 (each width). `scripts/measure-focus-contrast.ts` on
    the first card: its ring lies on the card's white, under it 5.78:1 at the lowest and beside it
    4.35:1 (1,440 px), no pixel under 3:1 at any width.
  - At `7dd9722` (Feature 012 #366), `scripts/measure-text-contrast.ts --all-text --fold` on the
    whole of `/about/policies`, `/about/plans`, `/about/results` and `/about/policies?page=2` with
    the demo dataset's Documents, and of `/about/plans` with a full first page of twenty-one
    synthetic plans and its second page (`scripts/screenshot-fixtures/about-contact-cases.ts`,
    `CASE=plans-full`), at the five widths, the lowest reading of each text: the lead 6.36:1
    (`/about/policies`, 320 px), the H1 6.80:1 (`/about/results`, 320 px), the label 8.48:1
    (320 px), the breadcrumb's links 9.34:1 and its current page 6.52:1 (`/about/results`,
    320 px); a row's facts line and summary 4.97:1, the tile's "PDF" 5.60:1, the download's words
    6.45:1, "ถูกแทนที่แล้ว" 7.75:1 and the title 16.54:1, as on `/documents` (§7.3); the pager's
    "หน้า 1" under the last row 4.69:1 and its links 6.45:1; a page past the last, the empty
    state's message 16.54:1 and "กลับไปหน้าแรกของรายการ" 6.45:1. `scripts/measure-focus-contrast.ts`
    on the first row's title and download on each page: both rings lie on the row's white, under
    them 6.45:1 (the title on `/about/results` 5.04:1 from 768 px) and no pixel under 3:1 at any
    width, beside them 4.69:1 or more but a few blended pixels at the title's ring on
    `/about/results` from 768 px, 1.44:1. `scripts/capture-screenshots.mjs`, the pages' heights in
    px at 1,440, 1,024, 768, 375 and 320 px with the demo dataset: `/about/policies` 900, 900,
    1,039, 1,023 and 1,149, where it was 900, 900, 925, 1,129 and 1,295 at `00ab334` (#366's before
    screenshots); `/about/plans` 900, 900, 1,037, 1,051 and 1,177, where it was 900, 900, 927, 1,071
    and 1,297; `/about/results` 900, 900, 900, 900 and 959, where it was 900, 900, 900, 900 and
    1,013; the full first page of plans 3,569, 3,569, 4,727, 4,549 and 4,675, where it was 4,005,
    4,005, 4,037, 5,127 and 5,473.
  - At `81dc941` (Feature 012 #367), `scripts/measure-text-contrast.ts --all-text --fold` on the
    whole of `/about/leadership` with the demo dataset's two leaders, both with a picture, and with
    `scripts/screenshot-fixtures/about-contact-cases.ts`' `leadership-six` (six leaders, two
    without a picture) and `leadership-one`, at the five widths, the lowest reading of each text:
    the lead 6.36:1, the H1 8.03:1, the label 8.60:1, the breadcrumb's links 9.34:1 and its
    current page 8.60:1 (320 px); the featured card's name 16.54:1, its position 6.45:1 and its
    unit 4.97:1; another card's name 16.12:1, its position 4.97:1 and its unit 6.45:1; "ช่องทางติดต่อ"
    4.97:1 and the contact 16.54:1 (every width). No card holds a link or a control, so no focus
    ring meets the field. `scripts/capture-screenshots.mjs`, the page's heights in px at 1,440,
    1,024, 768, 375 and 320 px: with the demo dataset 1,039, 1,115, 1,097, 1,185 and 1,397, where it
    was 900, 900, 900, 979 and 1,191 at `00ab334` (Feature 012's before screenshots);
    `leadership-six` 1,265, 1,417, 1,581, 1,945 and 2,395, where it was 951, 1,051, 1,225, 1,693 and
    2,169; `leadership-one` 900, 900, 900, 973 and 1,163, where it was 900, 900, 900, 900 and 993.
  - At `fbc27a6` (Feature 012 #370), `scripts/measure-text-contrast.ts --all-text --fold` on the
    whole of `/about/personnel` with the demo dataset's six Personnel in three units and with
    `scripts/screenshot-fixtures/about-contact-cases.ts`' `personnel-many` (22 staff in five units,
    three without one), at the five widths, the lowest reading of each text: the lead 6.36:1, the
    H1 8.03:1, the label 8.48:1, the breadcrumb's links 9.34:1 and its current page 8.60:1
    (320 px); a unit's H2 and a name 16.54:1, a position 4.97:1, "ช่องทางติดต่อ" 4.97:1 and the
    contact 16.54:1 (every width). No row holds a link or a control, so no focus ring meets the
    field. `scripts/capture-screenshots.mjs`, the page's heights in px at 1,440, 1,024, 768, 375
    and 320 px: with the demo dataset 1,348, 1,348, 1,470, 1,640 and 1,866, where it was 1,243,
    1,307, 1,417, 1,757 and 2,103 at `00ab334` (Feature 012's before screenshots);
    `personnel-many` 2,533, 2,625, 3,053, 4,055 and 5,081, where it was 2,723, 3,087, 3,845, 5,805
    and 6,545.
  - `scripts/capture-screenshots.mjs`, the pages' heights in px at 1,440, 1,024, 768, 375 and
    320 px: `/news` 1,801, 1,765, 2,242, 1,791 and 1,917, where it was 1,501, 1,494, 2,030, 3,447
    and 3,449 at `668d3e5` (#281's before screenshots); Health News 1,945, 1,909, 1,969, 1,777 and
    1,973, where it was 1,607, 1,600, 2,110, 3,131 and 3,217; Health Content 1,885, 1,819, 1,939,
    1,673 and 1,943, where it was 1,551, 1,540, 2,024, 2,929 and 3,011. A first page at the widths
    below 640 px is shorter than it was, since a card is a compact row there (§7.3).
  - `scripts/capture-with-fixtures.ts` with `scripts/screenshot-fixtures/news-list.ts`, `/news`
    with synthetic News, the same five widths: a first page of twelve with a second page after it 2,703,
    2,583, 3,462, 2,709 and 2,835 px, and that second page 2,345, 2,237, 3,078, 2,549 and 2,675;
    twelve News alone, with no pager, 2,627, 2,507, 3,386, 2,595 and 2,721; three 1,373, 1,289, 1,437, 1,309 and 1,435; two 1,015, 981, 1,437, 1,155 and
    1,281; one 1,041, 1,041, 1,019, 1,021 and 1,147.
- `tests/browser/public-news.spec.ts` reads the heading's parts, their order and colours, the
  head's title, the link's place and height on both sides of 640 px, the H1's size on both sides
  of 640 and 1,024 px, what follows the heading with each empty state, the keyboard's order with
  the focus ring, the motion (the pager and an empty state show at once too) and the page without
  JavaScript. Health News, there, and Health Content, in `public-health.spec.ts`, take the same
  cases but the head's title and the link, which they lack, from `testFilteredListOnField`
  (`tests/browser/public.helpers.ts`): it adds the heading's icon, the filter form first over the
  edge with its ring on its white card, and a page past the last and a Health Topic that matches
  nothing 32 px under the form. Each suite's own first test reads the list with no item at all.
  `public-activities.spec.ts`, `public-announcements.spec.ts` and `public-documents.spec.ts` take
  `testListOnField`, which shares the heading's cases with `testFilteredListOnField`
  (`testHeadingOnField`) and adds the list with no item, what follows over the edge with each empty
  state, the keyboard from the breadcrumb, the motion and the page without JavaScript;
  `public-filter-form.spec.ts` reads the form over the edge on the three lists that have it there.
  Since Feature 011 #339 `public-services.spec.ts`, `public-health-services.spec.ts` and, for
  `/health/reports`, `public-health.spec.ts` take `testListOnField` too, `/services` with its links
  under the lead (`leadLinks`: on the field after the lead, in the keyboard's order after the
  breadcrumb, shown at once), and `public-filter-form.spec.ts` reads their forms over the edge;
  `/health` takes `testHeadingOnField` alone, with its own cases for its tiles over the edge, their
  layout at seven widths, their reveal and the page without JavaScript. Since Feature 012 #366
  `public-about.spec.ts` takes `testListOnField` for each About Document page, with its own cases
  for the field's ring on both sides of 1,024 px and the rows' parts, attention labels and
  downloads. Since #367 `public-personnel.spec.ts` takes `testHeadingOnField` for
  `/about/leadership`, with its own cases for the field's glow and ring (`readListField`, which
  the About Document pages' case shares), the cards over the edge, the cards by count and width,
  their reveal, the empty state over the edge and the page without JavaScript. Since #370 it takes
  `testHeadingOnField` for `/about/personnel` too, with its own cases for the field's glow and
  ring, the panels over the edge, the panels and their rows by count and width, a panel's and a
  row's look, their reveal, the empty state over the edge and the page without JavaScript.

## 8. Homepage

Source: `current/04-homepage.md` v2.7 and `current/03-sitemap.md` v2.7. The sections, in `04` §3's
order:

1. Header / navigation / reachable search.
2. Featured (optional; one item, not an autoplay carousel).
3. Frequently Used Services (curated, up to 6).
4. Leadership (the first three by Leadership order, in one strip; §8.5).
5. Latest News (the five newest, the first as a large card; §8.6), then the Current Announcements
   (the four newest, as dated rows; §8.7).
6. Health Information (Health Topic chips, then the latest 4 Health Content items; §8.8).
7. Health Service Discovery (a band with the directory's counts and a form into
   `/health-services`, no directory on the Homepage; §8.9).
8. Activities (the latest five, by when they were held, as picture tiles; §8.10).
9. Quick Access (optional, up to 4 shortcuts to canonical destinations; §8.11).
10. Contact Summary (one card with the office's telephone, address and hours; §8.11).
11. Footer.

Each section after the hero, except the Leadership strip with its own
compact heading (§8.5), opens with `SectionHeading` (spec #239
"Section headings"): an icon tile (72 px, 52 px below `sm`; a `brand-primary` to `brand-dark`
gradient with an `accent-warm` icon, or `accent-warm` with a `brand-dark` icon on a dark surface),
a label between slashes, and the H2. The label is `brand-primary`, `accent-warm` on `brand-dark`,
and `surface-base` on the deep field (§8.4). Frequently Used Services, the Current Announcements,
Health Information and Activities are named as their lists are ("บริการประชาชน", "ประกาศ",
"ความรู้สุขภาพ", "กิจกรรม"), and Latest News is "ข่าวประชาสัมพันธ์" (spec #239 "Section headings").
Each of these headings holds a pill link to the section's list that reads "ทั้งหมด", named
"ดู…ทั้งหมด" with the section's name; below `sm` it is a round 44 px arrow button with the same
name (`SectionListLink`). A heading has no lead; the Current Announcements show their lead and
their link beside it (§8.7), and the Health Service Discovery band its lead under it (§8.9). Quick
Access is "ข้อมูลและเอกสารสำคัญ" under the label "เข้าถึงข้อมูล", and the Contact Summary
"ติดต่อสำนักงาน" under "ติดต่อ" (§8.11).

**The space between sections.** Between two neighbours after the deep field there is exactly one
space: 80 px from `lg`, 64 px from `sm` and 32 px below. `src/lib/homepage-spacing.ts` decides
which of the two has it, from the sections the page shows, and
`tests/node/public-homepage-spacing.test.ts` reads every combination (Product Owner, 2026-11-12:
#247 comment 6820010972). A section on the page's colour has the space below it, and above it only
where what precedes it leaves none: the deep field, or the Current Announcements, a band with its
space inside it. The Leadership strip has its own smaller space above and hands its space below
to Latest News (§8.5).

### 8.1 Hero and Featured

The hero (`HomeHero`; spec #239 "Hero and Featured") opens the page on the deep green field
(`DeepField`), which it shares with the Frequently Used Services (§8.4) and whose lower
corners are radius 32 (24 below `sm`):

- **The chip** reads "เว็บไซต์ทางการ · กระทรวงสาธารณสุข".
- **The headline** is the office summary sentence, with "ด้านสุขภาพ" in `accent-warm`, in
  `hero-headline` (§3.1). From `lg` it breaks into three fixed lines; below `lg` it wraps with the
  window. It is a paragraph that names the hero; the page's H1 is the site title, out of sight.
- **The search** is a white pill, 68 px high (60 px below `sm`) and at most 540 px wide, with a
  round `accent-warm` submit button of 52 px (44 px below `sm`). Its field and its form are
  labelled "ค้นหาในเว็บไซต์", and it submits to `/search`.
- **The Featured card** is one link to the item, at most 400 px wide (340 px below `sm`): a white
  card tilted 2° over an `accent-warm` sheet, which straightens on hover and on focus. It holds
  the picture's frame, 360 px high (260 px below `sm`), then "เรื่องเด่น" with the date the item's
  own list shows it by (a Service has none), the title as the card's H2, and an arrow. From `sm` it
  sits beside the headline, and below `sm` under the search, centred (Product Owner, 2026-11-11:
  #241 comment 6791096480, item 2).
- **The picture** shows whole in the frame, never cropped: the office's landscape pictures are
  text banners, and its portrait ones are One Pages. Behind it the frame shows a blurred copy of
  the picture that covers the frame, a second image. An item without a picture shows the plain
  visual with an icon tile.
- **With nothing Featured** the hero is one column: no card, the headline in
  `hero-headline-alone`, which is larger from `sm` (#241 comment 6791096480, item 3), and from
  `lg` the search up to 640 px wide.
- The hero shows no summary of the Featured item, no telephone number and no hours.
- White text on the field's lightest part, `deep-highlight`, is 4.30:1, so the field carries the
  headline, which is large text, and smaller text at its darker left. Focus rings on the field are
  `accent-warm`, the Featured card's link among them, and `brand-primary` inside the white search.
- The card's tilt and the submit button's growth on hover move only without a reduced-motion
  preference.

### 8.2 Phones

Below 640 px every section keeps its order (Product Owner: "โอเค เฉพาะหน้าแรก"; `04` §15).

- The space between two sections is 32 px (§8).
- Quick Access goes two to a row, 12 px apart, in compact cards (§7.3). The Frequently Used
  Services go one to a row (§8.4).
- The Activities show the large tile across the row and the others two by two, a small tile
  without its date (§8.10).
- Health Information shows its four Health Content items as compact rows (§8.8).
- Latest News shows the large card and three compact rows (§8.6).
- The Current Announcements show three rows (§8.7).

The Homepage's height with the demo dataset, measured on 2026-11-13 on the development runtime at
`94b8621`, the head of `008-homepage-redesign`, with `scripts/capture-screenshots.mjs`: 5,541 px at
1,440 px, 5,704 px at 1,024 px, 7,557 px at 768 px, 6,344 px at 375 px and 6,866 px at 320 px, with
the dataset's two Leadership in the strip (§8.5), five News (§8.6), four Current Announcements
(§8.7), five Health Topic chips and four Health Content items without pictures (§8.8), four
Health Services in three Areas (§8.9), five Activities and no Quick Access shortcut (§8.10,
§8.11).

The Product Owner accepted a longer phone and tablet Homepage with the prototype: 6,319 px at
390 px and 7,390 px at 768 px (spec #239 "Measured in the prototype"). The built page is 6,344 px
at 375 px and 7,557 px at 768 px, 167 px above the tablet figure, which the Product Owner accepted
on 2026-11-13 (#250 comment 6841312242, item 3). The height moves with the titles
and the number of items: without a current Announcement it is 4,747 px at 1,440 px and 5,694 px at
375 px, and with three Quick Access shortcuts 5,819 and 6,646 px, measured at the same commit with
`scripts/capture-with-fixtures.ts` and `scripts/screenshot-fixtures/homepage-no-announcements.ts`
and `homepage-quick-access.ts`.

### 8.3 ITA in V1; Dashboard deferred

ITA is in V1 (spec #121, ADR 0006). Dashboard stays deferred, and **deferred ≠ removed or
cancelled**: it remains in Songhealth's longer-term direction, and its concepts stay in the Figma
file, which is kept unchanged (ADR 0007).

| Area | V1 live/public version | Future state |
| --- | --- | --- |
| ITA | `/ita`, `/ita/{fiscal-year}` and `/ita/{slug}`; "ITA" is the main navigation's last item; Quick Access may point to `/ita`; no Homepage section of its own (`03` §2 and §11, `04` §10.1) | None: the pages below are live |
| Dashboard | No V1 `/dashboard` route, main navigation link or Homepage shortcut | Its Figma concepts, for a separately approved future scope |

**The ITA pages have no Figma concept.** They use the site's tokens and components (§3.1, §7), and
the MOIT page follows variant C, "สารบัญและการ์ด", of the ITA prototype
(`docs/prototypes/ita-moit-page.md` on the branch `prototype/ita`):

- **Landing `/ita`** (Feature 013 #393; spec #392 "The ITA landing", decisions 2, 7, 9 and 11;
  prototype P1 B): the list heading on the deep field (§7.8), the label "ITA" and `shield-check`
  over the H1 "การประเมินคุณธรรมและความโปร่งใส (ITA)", and the GLOSSARY lead. Over the field's
  lower edge, a card per fiscal year that has a published MOIT, newest first (`ItaYearCard`): one
  to a row below `sm`, two from `sm` and three from `lg` at any count, 12 px apart below `sm` and
  20 px from `sm`, the cards of a row one height. A card is one link, white with the `card` shadow
  and the `deep` shadow under the pointer, radius 24, 24 px of padding and 28 px from `sm`, its
  parts 20 px apart from top to bottom:
  - a 52 px tile on the section heading's gradient (`brand-primary` to `brand-dark`, radius 16, the
    `tile` shadow) with the 24 px `calendar-check` in `accent-warm`;
  - "ปีงบประมาณ" at label size in `text-secondary`, and under it the year as an H2 at H2 size in
    `text-primary`, `brand-primary` under the pointer;
  - "ตัวชี้วัด n รายการ" at label size, semibold, in `brand-primary`, with a 20 px `arrow-right` at
    the row's right end at every width;
  - a 160 px `surface-soft` circle at the lower right corner, 48 px past the card's right edge and
    56 px past its lower edge, which cut it.

  The tile, the icons and the circle are decorative: the link is named by "ปีงบประมาณ", the year
  and its count. Its focus ring has the lists' `surface-base` band (`focus-ring-banded`, §3), which
  the `deep` shadow leaves in place under the pointer. Each card reveals as it comes into the window (§8.12). While no MOIT is published, the empty state
  "ยังไม่มีข้อมูล ITA" lies over the field's edge and shows at once.
- **Year `/ita/{fiscal-year}`** (Feature 013 #394; spec #392 "A fiscal year's page", decisions 2
  and 12; prototype P2 A): the list heading on the deep field (§7.8), the label "ITA" and
  `calendar-check` over the H1 "ITA ปีงบประมาณ พ.ศ. YYYY", and the lead. Over the field's lower
  edge, the year's published MOITs by number in an ordered list, a row each (`ItaMoitRow`), 14 px
  apart. A row is white with the `card` shadow and the `deep` shadow under the pointer, radius
  22, 12 px of padding and from `sm` 18 px above, below and at the left and 22 px at the right.
  Its parts lie in one line at every width, 14 px apart and 22 px from `sm`:
  - the Document row's gradient tile (`RowTile`, §7.3: 68 px with radius 14 below `sm`, 92 px
    with radius 18 from `sm`) with "MOIT" at small size, semibold, in `accent-warm` (§3.2) over
    the number at H3 size, H2 size from `sm`, in `surface-base`;
  - the title as an H2 at body size, body-large from `sm`, semibold, shown whole on as many lines
    as it needs, a link as wide as its words that is underlined and `brand-primary` under the
    pointer; 4 px under it the facts line at small size in `text-secondary`, "หลักฐาน n รายการ",
    then " · ปรับปรุงล่าสุด" and the date when staff set it, wrapping where the column ends;
  - from `sm` a 20 px `arrow-right` in `brand-primary` at the row's right end; below `sm` none.

  The tile and the arrow are decorative: the title's link carries "MOIT n" for assistive
  technology alone, so it is named "MOIT n" and the title, as the badge inside it was. Only the
  title is a link, as in a Document's row, and its focus ring has the lists' `surface-base` band
  (`focus-ring-banded`, §3), which the row's shadow leaves in place under the pointer. Each row
  reveals as it comes into the window (§8.12).
- **MOIT `/ita/{slug}`:**
  - a brand-dark header band: "ITA ปีงบประมาณ พ.ศ. YYYY", the H1 "MOIT n" and the title, the
    summary, the Evidence count (and how many files cannot be served), and "ปรับปรุงล่าสุด" when
    staff set it;
  - a table of contents of the top-level Requirements with their counts: sticky beside the cards
    on desktop, a horizontal row above them on phones;
  - one card per top-level Requirement: a native disclosure, open at first, that closes without
    JavaScript, with its title as the heading inside the toggle and a 16 px chevron; each
    sub-Requirement is a section inside the card;
  - Evidence as pills: the Round tag unless the Round is "ไม่ระบุรอบ", the label (a file's note
    follows it in parentheses), then what it is: a file's type and size after a download icon,
    "หน้าเว็บของสำนักงาน" with a chevron for a page of this site, the host with "(เว็บไซต์ภายนอก)"
    and an arrow-up-right for another website, or the email address or phone number. A link
    marked current carries "ข้อมูลปัจจุบัน". A file that cannot be served is a dashed pill with
    "ไฟล์ไม่พร้อมให้บริการ" and a "ติดต่อเรา" link;
  - "ตัวชี้วัดก่อนหน้า" and "ตัวชี้วัดถัดไป" cards below the Requirements, each with "MOIT n" and the
    title, within the same fiscal year only.

**Release rule:** a deferred card, such as Dashboard's, is never an enabled link in a V1 build,
and no placeholder route is invented. Its public activation needs the Product Owner's
authorization and the matching updates to the higher-priority product and IA documents.

The search field and the Featured text represent real product journeys, not a second search or
static marketing content.

### 8.4 Frequently Used Services

The Frequently Used Services (`HomeServiceCard`; spec #239 "Frequently Used Services") follow the
hero on the same deep field, under the section heading with its "ทั้งหมด" link in the dark form:

- **The grid** holds up to 6 cards: three to a row from `lg`, two from `sm` and one below `sm`,
  20 px apart (12 px below `sm`). Four Services go two to a row from `lg` too, so no cell is empty.
- **From `sm` the grid's lower 110 px lie below the field** (`--field-overhang`), on the page, and
  the field leaves that room under it, so the next section starts below the cards. A card is
  144 px high or more there, so the last row starts on the field, with one row as with two. Below
  `sm` the cards end inside the field, 40 px above its edge. With no Service the section is left
  out and the field ends under the hero, with no room left under it.
- **A card** is white, radius 22, with the `deep` shadow and 24 px of padding (16 px below `sm`).
  It holds the Service's icon (§5), 24 px, in a `surface-soft` tile of 56 px (48 px below `sm`),
  the name as an H3 at 18 / 30 semibold, the summary at 14 / 22 in `text-secondary-on-soft`,
  clamped to three lines and hidden below `sm`, and a 20 px `arrow-right`. A `surface-soft` circle
  shows in its lower right corner, and the summary can lie over it, where `text-secondary` read
  4.45:1 (spec #338 decision 20; Feature 011 #340). At `fad2249` (#340), `--all-text --fold` on
  the section with the demo dataset's six Services read each summary 5.07:1 at the lowest, where
  it crosses the corner circle (1,440 and 1,024 px), and each name 14.82:1 at the lowest (375 and
  320 px).
- **The Service catalog shares the card** (`kind="list"`, §7.3; Feature 011 #340): its name an
  H2, and at rest the `card` shadow, taking `deep` under the pointer (spec #338 decision 21), where
  the Homepage's cards keep `deep` at rest on the field. A Health Service's page shares it under
  its "บริการที่ให้" (`kind="section"`, §9.8; Feature 011 #345), its name an H3 with the catalog's
  shadows. The link, the pointer and the focus ring's colours below hold for all three; the
  catalog's and a Health Service's cards lie on the page, so there the ring lies on the card's
  white alone (§7.3).
- **One link** named by the Service's name covers the card, as on the shared cards (§7.3).
- **Under the pointer** the card and its circle turn `brand-primary`, its name, summary and arrow
  `surface-base`, and its tile `accent-warm` with a `brand-dark` icon. Without a reduced-motion
  preference the card also rises 8 px inside its place, the tile turns, and the circle grows.
- **The focus ring** lies inside the card's edge, because from `sm` the Homepage's card lies
  partly on the field and partly on the page: `brand-primary` on the white card, and `accent-warm` while the
  card is `brand-primary` under the pointer.
- **The heading's label is `surface-base`**: under it the field is about as light as
  `brand-primary`, where `accent-warm` would be 4.10:1 (§3.2), below the 4.5:1 its small text
  needs. `scripts/measure-text-contrast.ts` read the label at 6.19:1 at its lowest on the runtime
  at `75e1765`, at 1,440, 1,024, 768, 375 and 320 px, with a Featured card and without one.

### 8.5 Leadership strip

The Leadership strip (`HomeLeadershipStrip`; spec #239 "Leadership strip") follows the deep field,
in the page colour:

- **The people** are the first three Leadership in Leadership order, with the Leadership page's
  tie rule (`src/lib/personnel-directory.ts` `homepageLeadership`), and fewer when fewer exist.
  With none the section is left out.
- **The strip** is one white surface, radius 24, with the `card` shadow and 20 px of padding
  (24 px from `sm`, 24 by 32 px from `lg`).
- **Its heading** is compact, without an icon tile (Product Owner, 2026-11-12: #243 comment
  6809325869, item 1): the H2, "ผู้บริหาร", at H3 size in bold, and a
  text link that reads "ทั้งหมด" with a 16 px `arrow-right`, named "ดูผู้บริหารทั้งหมด", to
  `/about/leadership`, 44 px high. From `lg` the label "บุคลากร" between slashes shows above the H2.
- **A person** shows the picture in a circle of 76 px (60 px below `sm`), cropped from its top or
  around its focal point (§7.3), the shown name as an H3
  at 16 / 26 semibold and the current assignment at 14 / 22 in `text-secondary`. Unit and public
  contact are not shown, and no person is a link. Around the picture, 4 px away, the first person
  has a 3 px `accent-warm` ring, its only mark (#243 comment 6809325869, item 2), and the others a
  2 px `border-default` one. Without a picture the
  circle is `surface-soft`. The circle and its ring are `PersonPicture`, which the Leadership
  page's cards and the Personnel page's rows share, each place at its own size, gap and ring
  (§7.3; Feature 012 #367, #370); the
  strip keeps the measures above (`public-homepage.spec.ts` "the Leadership strip shows …",
  `ringedCircle`).
- **From `lg`** the strip is one row: the heading at the left, ended by a `border-default` line,
  then the people, who divide the rest of the row equally, three, two or one. **Below `lg`** the
  heading lies above, with the link at its right over a `border-default` line. **From `sm`** the
  first person takes a row and the others share the next. **Below `sm`** everyone stacks.
- **Space:** 32 px above the strip below `sm` and 40 px from `sm`, after the room the field leaves
  under it (§8.4). The space above Latest News, which follows it on the page colour, comes next.
  While Latest News is left out, the strip takes the same space below itself (32, 64 and 80 px),
  also before the Current Announcements' band (§8.7).

### 8.6 Latest News

Latest News (`ContentCard` with `kind="home"`; spec #239 "Latest News") follows the Leadership strip, under the
section heading "ข่าวประชาสัมพันธ์" with its "ทั้งหมด" link to `/news`:

- **The News** are the five newest published News in the lists' order, after the Featured item is
  removed (`04` §7). With none the section is left out.
- **The large card** is the newest: its picture covering the card, radius 24, with the date in an
  `accent-warm` pill (13 / 20 semibold, `brand-dark`) and the title in `surface-base` at H3 size
  (18 / 30 semibold below `sm`), three lines at most, over a `brand-dark` gradient from the card's
  foot (Product Owner, 2026-11-12: #244 comment 6809892992, item 1, for the date). The gradient is
  96 % `brand-dark` at the foot and 80 % at 60 % of its height, with 96 px of it above the pill, so
  the title's lines lie where it is 80 % or more. Over a white picture, with a title of three
  lines, `scripts/measure-text-contrast.ts` with
  `scripts/screenshot-fixtures/homepage-news-light-picture.ts` read the title at 7.30:1 at 1,440,
  1,024 and 768 px and 7.54:1 at 375 and 320 px, and the pill's date at 7.75:1, at the application
  code of `2aaaa6a`. Without a picture the card shows the deep
  green visual, `deep-visual`: `brand-primary` to `brand-dark` with the `deep-highlight` glow (item
  2), and near its top a 72 px `accent-warm` tile with a 24 px `brand-dark` icon (#244 comment
  6810203896: the prototype's 120 px heart is outside §5's sizes).
- **A small card** is white, radius 22, with the `card` shadow: a 16:9 picture, the date at 13 / 20
  semibold in `brand-primary`, and the title at 18 / 30 semibold in two lines at most. **Below
  `sm`** it is a compact row: a 120 px picture at 4:3, radius 14, 10 px inside the card, with the
  date and the title, at body size, beside it (item 3). At 320 px the title has 130 px: the row's 288 px less the picture's 140 px
  and 18 px of padding, above the 107 px of "ความดันโลหิตสูง" (§7.3), which the Homepage suite
  checks.
  Without a picture it shows the plain visual with a 48 px tile, the section heading's gradient,
  and its 24 px icon.
- **Every picture** covers its box from its middle, or around its focal point (§7.3), and is
  decorative. The title is an H3
  that names one link over the whole card; the date stays outside the link's name.
- **The grid, five News:** from `lg` the large card at the left, 520 px high or more, in a column
  1.25 times the others, beside the four small cards two by two, 24 px apart. From `sm` the large
  card spans the row, 380 px high or more, above the four two by two. Below `sm` the large card,
  300 px high or more, then three rows, 14 px apart; the fifth News is not shown.
- **Fewer than five:** two columns from `sm`, and the large card spans the row when the others are
  an even number, so no cell is empty: one alone, two side by side, three with the large card
  above two, four two by two with the large card as the first. Below `sm` they stack.
- **Under the pointer** a picture grows by 6 % inside its box and a small card lifts 6 px with the
  `deep` shadow, only under `prefers-reduced-motion: no-preference`. Keyboard focus is the global
  3 px outline around the card. A News card shows no arrow.

### 8.7 Current Announcements

The Current Announcements (`AnnouncementRow`; spec #239 "Current Announcements") follow Latest
News as a section of their own. Their row is also the Announcements list's (below):

- **The Announcements** are the four newest current ones by announcement date, in the
  Announcements list's order, after the Featured item is removed (`04` §7). Below `sm` the fourth
  is not shown. With none the section is left out, and Latest News keeps its space before Health
  Information.
- **The band** is `surface-soft` with a `surface-base` glow fading from its upper left corner, a
  decoration that takes no pointer events, and has the sections' space above and below inside it
  (80, 64 and 32 px). The Leadership strip keeps its own space below when the band follows it
  without Latest News (Product Owner, 2026-11-12: #245 comment 6812117246, item 1).
- **The heading** is the section heading ("แจ้งให้ทราบ", "ประกาศ") with the lead
  "ข้อมูลที่อาจมีวันสิ้นสุดหรือการดำเนินการ" in `text-secondary-on-soft` (18 / 30, 16 / 26 below
  `sm`) and the link to `/announcements`, a solid `brand-primary` pill with `surface-base` text and
  the `tile` shadow, `brand-dark` under the pointer (item 2). From `lg` they are the left column,
  0.8 to the rows' 1.6 with 56 px between, the link under the lead, and stay in view while the rows
  scroll, 24 px below the sticky header (`--header-offset`, §7.4). Below `lg` the link is at the
  heading's right, a round 44 px arrow button below `sm`, and the lead is under both.
- **A row** is white, radius 22, with the `card` shadow, 14 px from the next:
  - the date tile, 92 px with radius 18 (68 px and 14 below `sm`), a `brand-primary` to
    `brand-dark` gradient: the day in `surface-base` at 34 / 38 bold (24 / 28 below `sm`), the
    month and year under it at 13 / 20 in `accent-warm`. The widest month and year, "เม.ย." with
    a year, is 57 px in the 68 px tile. On the gradient under the month and year,
    `scripts/measure-text-contrast.ts` with
    `scripts/screenshot-fixtures/homepage-announcements.ts` read `accent-warm` at 5.60:1 at 1,440,
    1,024 and 768 px and 5.45:1 at 375 and 320 px, the day at 7.58:1 or more, and the lead over
    the glow at 4.74:1 or more, at the application code of `e298e78`;
  - the category, the first `announcement_type` term, as a pill badge at 13 / 20 semibold:
    procurement in `procurement-text` on `topic-blue` with a 1 px `procurement-border` edge,
    recruitment in `brand-dark` on `accent-warm`, any other, and one added later, in
    `brand-primary` on `surface-soft` (`src/lib/announcement-category.ts`, by the seed's slugs
    `procurement` and `recruitment`; §3.2). An Announcement without a category shows no badge;
  - the title at 18 / 30 semibold (16 / 26 below `sm`) in two lines at most;
  - the status line, for an Announcement with open or close dates: the label after a 7 px dot at
    13 / 20 semibold, open in `surface-base` on `brand-primary`, not open yet in `brand-dark` on
    `accent-warm`, then the dates. The words and the dot state the status. The label's closed
    state, `text-primary` on `status-closed` (spec #239), does not show here: a closed
    Announcement is not current;
  - from `sm`, a 40 px `surface-soft` circle with a 20 px `arrow-right`.
- **The link:** the title is an H3 that names one link over the whole row; the date, the category
  and the status stay outside the link's name.
- **Under the pointer** the circle turns `accent-warm` with a `brand-dark` arrow, and the row moves
  10 px to the right with the `deep` shadow, only under `prefers-reduced-motion: no-preference`.
  Keyboard focus is the global 3 px outline around the row.
- **On the Announcements list** (`/announcements`; Feature 010 #314, spec #311 "The Announcements
  list") the row is the same, over the field's lower edge (§7.8), with three differences:
  - the title is an H2 under the page's H1;
  - a closed Announcement, which the list shows after every current one, has its date tile in
    `status-closed` with its day and its month and year in `text-primary` (13.85:1), and its
    label "ปิดแล้ว" after the dot in `status-closed` with `text-primary`, so the closed rows read
    grey where they begin (Product Owner, 2026-11-15: spec #311 "Decisions", 13, variant B); its
    type's badge keeps its colour, as variant B showed, so the types still differ by colour on a
    closed row (Product Owner, 2026-11-16: #314 comment 6906496480); a current one's tile keeps
    the gradient with the month and year in `accent-warm`;
  - the link's focus ring has the lists' `surface-base` band on both sides (`focus-ring-banded`,
    §7.3), since the first row's ring lies over the field (#283 comment 6854670042); the
    Homepage's ring, on its band, has none.

  The rows are 14 px apart, as here, in the list's order and page size (20), and each reveals as
  it comes into the window and shows whole while it holds the keyboard's focus (§8.12).
  Measured at `2cb2e11` on `/announcements` with `scripts/screenshot-fixtures/lists-by-count.ts`
  (`LIST=announcements LIST_COUNT=8`: the three badges, open, not yet open, closed and undated
  rows) at 1,440, 1,024, 768, 375 and 320 px: `scripts/measure-text-contrast.ts --all-text` read
  a current tile's month and year at 5.52:1 or more from 768 px and 5.37:1 at 375 and 320 px, its
  day at 7.79:1 or more; a closed tile's day, month and year and its "ปิดแล้ว" 13.85:1; the
  badges 7.43:1 (procurement), 7.75:1 (recruitment) and 5.78:1 (any other); "เปิดอยู่" 6.45:1,
  "ยังไม่เปิด" 7.75:1, the status line's dates 4.97:1 and the titles 16.54:1.
  `scripts/measure-focus-contrast.ts` read the first row's ring, over the field's edge, at 5.40:1
  or more beside it with its band, none of it under 3:1, at every width; without the band, about
  half of the ring's pixels lie on the field under 3:1. An
  Announcement's page shows the dotted label in its details card (§9.4), and a search
  result keeps the earlier label, closed in `brand-dark` on `accent-warm` (`StatusLabel`). `tests/browser/public-announcements.spec.ts` reads the row's
  parts, a closed row against a current one, the hover, the keyboard and the order across pages;
  `public-homepage.spec.ts` reads the Homepage's rows.

### 8.8 Health Information

Health Information (`HomeHealthCard`; spec #239 "Health Information") follows the Current
Announcements on the page's colour:

- **The space:** the sections' space below (80, 64 and 32 px), and the same above only after a
  band: the Current Announcements, or the deep field when neither the Leadership strip nor Latest
  News stands between. After Latest News or the Leadership strip it takes theirs.
- **The chips:** one for each Health Topic the Health Content list's filter offers
  (`src/lib/terms.ts` `offeredTerms`), in the filter's order, as a list named "ประเด็นสุขภาพ".
  Each is a pill link to `/health/content?topic=<slug>`, the list narrowed to that topic:
  `brand-primary` on `surface-base` with a 1.5 px `border-default` edge at 14 / 22 medium (13 / 20
  below `sm`), `surface-base` on `brand-primary` under the pointer; 36 px high, 30 px below `sm` (measured),
  above the 24 px a link's target needs (spec #239 "Accessibility").
  The row wraps, 10 px apart (8 px below `sm`). With no topic offered the row is left out. The
  chip is `TopicChip`, which a post's Health Topics share at 44 px high (§9.1).
- **The cards** are the latest 4 Health Content items, four to a row from `lg` and two from `sm`,
  24 px apart. A card is white, radius 22, with the `card` shadow and 10 px of padding:
  - the picture, radius 14, at 4:3 from `lg` and 16:9 from `sm`, covering its box from its middle,
    or around its focal point (§7.3), and decorative; without one, the `plain-visual` with a green
    tile and a 24 px
    `heart-pulse`;
  - the first Health Topic as a pill badge at 13 / 20 semibold, `brand-dark` on `accent-warm`
    (7.75:1), 13 px over the picture's lower edge. It wraps, so a long topic is fully readable (the
    prototype cut it with an ellipsis). A Health Content item without a topic shows no badge;
  - the title at 18 / 30 semibold, the summary at 14 / 22 in `text-secondary` in three lines at
    most, and "อ่านต่อ" at 14 / 22 semibold in `brand-primary` with a 16 px `arrow-right`, at the
    card's lower edge.
- **Below `sm`** a card is a compact row, 12 px from the next: a 112 px picture at 4:3 at the
  left, then the badge and the title at 16 / 26 semibold, without the summary and "อ่านต่อ". At
  320 px that leaves 142 px for the title, above the 107 px of "ความดันโลหิตสูง" (§7.3).
- **The link:** the title is an H3 that names one link over the whole card; the topic and the
  summary stay outside the link's name, and "อ่านต่อ" with its arrow is decoration, hidden from
  assistive technology.
- **Under the pointer** the card rises 6 px with the `deep` shadow and the arrow moves 4 px to the
  right, only under `prefers-reduced-motion: no-preference`. Keyboard focus is the global 3 px
  outline around the card.

### 8.9 Health Service Discovery

Health Service Discovery (spec #239 "Health Service Discovery") is a band inside the page's
container, on the page's colour. With no published Health Service it is left out.

- **The space** above and below it is the sections' (§8).
- **The band** is the `deep-band` utility: `brand-primary` to `brand-dark` at 120°, with the
  `deep-highlight` glow from its lower left corner, radius 32 (24 below `sm`) and the `deep`
  shadow; 56 px of padding from `lg`, 40 px from `sm`, 28 px above and below and 20 px at the
  sides under it. From `lg` a 340 px ring in `accent-warm` at 45 % lies at its upper right corner,
  behind the form; below `lg` it is left out, where it would cross the heading and the lead. It
  takes no pointer events.
- **The heading** is the section heading with its icon tile (Product Owner, 2026-11-12: #246
  comment 6816725778, item 1): the label "หน่วยบริการ" in `surface-base`, as on the deep field
  (§8.4; the prototype's `accent-warm` read 4.26:1 at 1,440 px and 2.28:1 at 320 px there), and
  the H2 "หน่วยบริการสุขภาพในอำเภอสอง". Under it the lead "เลือกตำบลหรือพิมพ์ชื่อ
  เพื่อดูข้อมูลติดต่อ เวลาเปิดบริการ และแผนที่" at 18 / 30 (16 / 26 below `sm`).
- **The counts**, read from the directory: the number of published Health Services with
  "หน่วยบริการ", and the number of Areas the directory's filter offers with "พื้นที่", the
  directory's word (item 2). The second is left out when no Health Service has an Area. A number
  is `accent-warm` at the h1 size bold from `sm` and the h2 size below; its word is `surface-base`
  at 16 / 26.
- **The form** is the directory's (§7.7): the Area select ("พื้นที่รับผิดชอบ", "ทุกพื้นที่" first)
  and the name field ("ชื่อหน่วยบริการ"), a GET form to `/health-services` with the directory's
  parameters `area` and `name`. It lies in a white card, radius 24, with the `deep` shadow, at
  the band's right from `lg` and under the counts below. A field is 52 px high, radius 14, with a
  1.5 px `border-input` edge; the button is an `accent-warm` pill, 52 px high, that reads "ค้นหา"
  in `brand-dark` after a 20 px `search` icon. The focus ring in the card is `brand-primary`.
- **Measured** with `scripts/measure-text-contrast.ts` on the demo dataset at the application
  code of `ebce012`, at 1,440, 1,024, 768, 375 and 320 px: the label 7.00:1 or more, the
  H2 6.99:1, the lead 5.79:1, the counts' words 5.20:1, and the numbers, which are
  large text over the glow, 3.22:1 (§3.2). A change to the band's gradient or to the counts'
  place needs a new measure.

**The submit state** (spec #239 "Motion and loading"; `SubmitStateIcon`): after submit, the
button of the hero's site search and of this form shows a spinner in place of its icon, a 20 px
ring in the button's text colour with one quarter open, and a further submit is ignored until the
page changes (item 3). The mark is taken off when the page is shown again from history, as after
the browser's back button, and after ten seconds, so a result that never opens in the window (a
stopped load, one opened in another tab) does not leave the form shut. The spinner turns only under `prefers-reduced-motion: no-preference`.
This is the site's one script, inline at the end of the Homepage; without JavaScript both forms
submit as plain forms. Forms on other pages are unchanged.

### 8.10 Activities

The Activities (`HomeActivityTile`; spec #239 "Activities") show the latest five by when they were
held, at every width, fewer when fewer exist; with none the section is left out.

- **A tile** is its picture, radius 22 with the `card` shadow, covering its box from its middle,
  or around its focal point (§7.3), and decorative. Over its lower part lies a `brand-dark`
  gradient, 96 % at the lower edge
  and 85 % up to 65 % of its height, with the date in an `accent-warm` pill (13 / 20 semibold,
  `brand-dark`) and the title in `surface-base`, semibold, in two lines at most: 16 / 26 on a
  small tile (14 / 22 below `sm`), 24 / 34 on the large one from `lg` (18 / 30 below). The date
  is when the Activity was held, else its publication. A small tile, half the row wide, shows no
  date below `sm` (Product Owner, 2026-11-12: #247 comment 6820125241, item 2); a tile across the
  row shows it at every width, the large one and the first of one or three.
- **The picture's `sizes`** is the tile's box (`activityPictureSizes`): its share of the 1,200 px
  container from `lg`, the large tile two of the four, and below `lg` the row for a tile across
  it, else half the row.
- **Without a picture** a tile shows the `deep-visual` with an `accent-warm` tile near its top
  holding a 24 px `heart`: 72 px, radius 22, on the large tile and 48 px, radius 14, on a small
  one (#244 comment 6810203896). It takes no pointer events.
- **Five** are one large tile, two rows high, and four small ones two by two
  (`src/lib/homepage-activities.ts`). From `lg` the grid has four columns, 20 px apart, in rows of
  230 px, the large tile at the right; below `lg` two columns in rows of 200 px (170 px and 12 px
  apart below `sm`), the large tile across the row above the others, two rows high there too
  (420 px, 352 px below `sm`).
- **Fewer** are equal tiles in one row of 300 px from `lg`. Below `lg` they go two to a row, and
  the first spans the row only when the others are an even number, so no cell is empty: one
  alone, two side by side, three with the first across, four two by two (Product Owner,
  2026-11-12: #247 comment 6820174924).
- **The link:** the title is an H3 that names one link over the whole tile; the date stays outside
  the link's name. Keyboard focus is the global 3 px outline around the tile: a layer inside the
  tile clips the picture, and the link lies beside it, so the ring is whole.
- **Under the pointer** the picture grows by 6 %, only under
  `prefers-reduced-motion: no-preference`.
- **Measured** with `scripts/measure-text-contrast.ts` and
  `scripts/screenshot-fixtures/homepage-activities.ts`, whose pictures are white all over, at the
  application code of `1faa861`, at the five widths: the large tile's title 8.55:1 or more, a
  small tile's 8.15:1, and one on the visual 11.28:1. A small tile keeps 114 px for its title at
  320 px, above the 96 px of "ความดันโลหิตสูง" at 14 px, semibold (measured on the runtime). A long title's end is out of sight
  after two lines, as on a Latest News card (§8.6).

### 8.11 Quick Access and the Contact Summary

**Quick Access** (`HomeQuickLink`; spec #239 "Quick Access"; on `/health` too since Feature 011
#339 and on `/about` since Feature 012 #371, §7.3) shows up to four shortcuts from its
menu before the Contact Summary, and is left out while the menu is empty, as the demo dataset
leaves it (`scripts/demo-dataset/content.ts`; spec #239). Under the section heading its cards go
four to a row from `lg` and two below, 24 px apart (12 px below `sm`). A card is the Homepage's
card surface, white with the `card` shadow and no border, radius 22 (18 below `sm`): the label at
the h3 size (a plain label here, an H2 on `/health` and `/about`, §7.3) and a 24 px `arrow-right`, the whole card one link named by the label. Under the
pointer the label turns `brand-primary` and the shadow `deep`. Below `sm` it is compact (§7.3).

**The Contact Summary** (`HomeContactCard`; spec #239 "Contact Summary") is one card inside the
page's container, always shown:

- **The card** is `brand-dark` to `brand-primary` at 140°, radius 24, with the `deep` shadow and
  56 px of padding at its sides from `lg` (40 px from `sm`, 24 px below). From `lg` it has two
  columns and a 260 px ring in `accent-warm` at 45 % at its lower right corner, which takes no
  pointer events; below `lg` it is one column without the ring, which would cross the opening
  hours there (4.16:1 at 320 px in the prototype).
- **At the left**, the section heading with its icon tile, the label "ติดต่อ" in `accent-warm` and
  the H2 "ติดต่อสำนักงาน" (Product Owner, 2026-11-12: #247 comment 6820125241, item 1), then the
  telephone number after a 24 px `phone` icon, in `accent-warm` at the `telephone` size (the h2
  size, bold, below `sm`). It is a link while it is one number, and plain text otherwise.
- **At the right**, the address after a 20 px `map-pin` with the "เปิดแผนที่" link under it, the
  opening hours after a 20 px `clock`, both icons in `accent-warm`, and the button
  "ข้อมูลติดต่อทั้งหมด" to `/contact`: an `accent-warm` pill, 52 px high, with a 20 px
  `arrow-right`. "เปิดแผนที่" is `surface-base`, underlined, 44 px high: `accent-warm` small
  text is 4.10:1 on the card's `brand-primary` end (§3.2).
- **The details** are Office Contact's, each only when set; the email stays on `/contact`. Each is
  a pair of a `<dl>` whose name ("โทรศัพท์", "ที่ตั้ง", "เวลาทำการ") only assistive technology
  reads. No map is embedded, and no stand-in for one is shown; the office summary is the page's
  description and is not repeated here.
- **Measured** on the demo dataset at the application code of `1faa861`, lowest of the five
  widths: the label 6.60:1, the H2 9.32:1, the telephone 5.68:1, the address 8.12:1 and the
  hours 7.58:1.

### 8.12 Motion and loading

Source: spec #239 "Motion and loading"; the Product Owner took the prototype's motion as it was
(#239 comment 6786631899). It is CSS alone, in `src/styles/global.css`: the page's one script
stays the submit state (§8.9).

- **The hero's entrance.** As the page opens, the chip, the headline and the search rise 28 px
  into place while they fade in, over 0.8 s, starting at 0, 0.1 and 0.22 s. The Featured card
  turns into its tilt from 0.25 s and the sheet behind it from 0.45 s, over 0.9 s each.
- **A section's reveal.** A section's heading and each of its cards, rows or tiles rise 28 px and
  fade in as they come into the window, over the first 60 % of their way in (90 % for a Service
  card, which is partly in the window when the page opens). The Leadership strip, the Health Topic
  chips, the Health Service Discovery band and the contact card each reveal as one piece, and the
  Current Announcements' heading with its lead and link as one. The reveal runs only where the
  browser has scroll-driven animation (`@supports (animation-timeline: view())`); elsewhere every
  section shows whole from the start. A part that holds the keyboard's focus shows whole at once:
  focus scrolls a link only just into the window, where a tall piece such as the Leadership strip
  on a phone has barely begun its reveal. The stylesheet writes the reveal as longhands: lightningcss
  1.33.0, the build's minifier, folds `animation-timeline` into an `animation` shorthand, which
  Chromium 153 drops whole (`npm run build:check` with the reveal written as a shorthand, then the built
  stylesheet loaded in Playwright's Chromium, 2026-11-12: `CSS.supports("animation", "linear
  backwards rise-in view()")` is false, and with the longhands the computed `animation-timeline`
  is `view()`). The browser suites cannot see this: the development runtime serves the stylesheet
  unminified. `npm run build:check` reads the built stylesheets for it
  (`scripts/check-built-styles.ts`).
- **The decorations stand still.** The deep field's glows and the three rings do not move, in
  place of the prototype's drifting glows and turning rings: nothing on the page moves by itself
  for longer than five seconds, so the page needs no control that stops it (WCAG 2.2 SC 2.2.2;
  Product Owner, 2026-11-13: #249 comment 6838503280, item 1).
- **A loading picture.** The box of a News, Health Content or Activity picture is `surface-soft`
  with a lighter band of `bg-page` that crosses it three times, every 1.6 s, as the page opens;
  before and after, the box is plain `surface-soft`. The loaded picture covers it. CSS cannot tell that a picture has loaded, so the
  shimmer runs on the page's clock: a picture that loads later, below the window, has the resting
  box behind it. A missing picture's visual has no shimmer, nor has the Featured picture, which
  has its blurred copy behind it (§8.1), or a Leadership portrait in its ring (§8.5) (Product
  Owner: the same comment, item 2).
- **A list's motion.** On `/news`, Health News, Health Content, `/activities`, `/announcements`,
  `/documents`, since Feature 011 #339 `/health`, `/health/reports`, `/services` and
  `/health-services`, since Feature 012 #366 the About Document pages, since #367
  `/about/leadership`, since #370 `/about/personnel` and since #369 `/contact`, the heading block
  rises in as the hero's parts do, starting at 0 s, and the lead at 0.1 s (§7.8). Each card
  reveals as a section's card does and shows whole while it holds the keyboard's focus, and its
  picture's box shimmers as the page opens; a missing picture's visual does not (§7.3; Feature
  009 #283). The breadcrumb, the link, the filter form, the empty state and the pager show at once
  (`public-news.spec.ts` "/news moves only when motion is allowed: …",
  `testFilteredListOnField`'s motion case for the other two, and `testListOnField`'s for the
  Activities, Announcements and Documents lists: the Activities list's cards move as `/news`'s
  since Feature 010 #313, the Announcements' rows reveal as the Homepage's do since #314, without a
  picture to shimmer, and the Documents' rows as the Announcements' since #315; `/health`'s
  tiles reveal since Feature 011 #339 (`public-health.spec.ts` "/health moves only when motion is
  allowed: …"), `/services`' cards without a picture since #340, `/health-services`' rows since
  #341, `/health/reports`' rows since #342 and the About Document pages' rows since Feature 012
  #366, `testListOnField`'s `itemsMove`; `/about/leadership`'s cards, the featured one too, since
  #367, `public-personnel.spec.ts` "with motion allowed each leader's card …", and
  `/about/personnel`'s panels since #370, "with motion allowed each unit's panel …", each without a
  picture's shimmer, as the Leadership strip's portraits; `/about`'s tiles since #371, under a
  Basic Page's header, below; `/ita`'s year cards since Feature 013 #393, as `/health`'s tiles,
  with its empty state at once, `public-ita-years.spec.ts` "/ita moves only when motion is allowed:
  …", and a fiscal year's MOIT rows since #394, "a fiscal year's page moves only when motion is
  allowed: …"). On `/contact` nothing reveals: its breadcrumb, details card,
  channels and two routes show at once (§9.10; #369; `public-contact.spec.ts` "/contact moves only
  when motion is allowed: …").
- **A Post page's motion.** On a News, Activity or Health Content post the header's text rises in
  as the hero's parts do, starting at 0 s, and the frame at 0.25 s, as the Featured card does
  (§9.1; Feature 009 #285). The breadcrumb, the text, an Activity's details card and its photos
  show at once (`public-posts.spec.ts` "a post moves only when motion is allowed: …"). A Basic
  Page's header rises in the same way, and its breadcrumb, body and related Documents show at once
  (§9.9; Feature 012 #368; `public-about.spec.ts` "with motion allowed the header rises in as the
  page opens, while the breadcrumb, the body and the related Documents show at once; …"). On
  `/about` the same header rises in, each of its tiles reveals as `/health`'s do and shows whole
  while it holds the keyboard's focus, and its breadcrumb, body and related Documents show at once
  (§9.9; #371; "/about moves only when motion is allowed: …").
- **An Announcement's, a Document's, a Health Report's, a Service's and a Health Service's page's
  motion.** The header's text rises in as a Post page's does, starting at 0 s, and the card at
  0.25 s, as a Post page's frame (§9.4 to §9.8; Feature 010 #316, #317; Feature 011 #343 to #345).
  The breadcrumb, an Announcement's details text and related Documents, a Document's successor
  note, a Service's guidance and its two sections, and a Health Service's "บริการที่ให้" with its
  cards show at once
  (`public-announcements.spec.ts` "with motion allowed the header rises in as the page opens and
  the card after it, …"; a Document's, a Health Report's, a Service's and a Health Service's page
  have the same `CardOverField` and `PostHeader`, and `public-health.spec.ts`,
  `public-services.spec.ts` and `public-health-services.spec.ts` read a Health Report's, a
  Service's and a Health Service's).
- **Hover** ships with each section (§8.1, §8.4, §8.6 to §8.10).
- **Reduced motion and paper.** All of it runs only on a screen under
  `prefers-reduced-motion: no-preference`. With reduced motion preferred, and in print, nothing
  moves: every part shows whole in its place and a loading picture's box is plain
  `surface-soft`.
- **No effect moves layout.** A part changes its opacity, `translate`, `rotate` and `scale`, and a
  loading picture's box its background; none of these moves layout. An effect
  holds a part back only before it runs: once over, the part has its own styles again, so a
  card's hover and the Announcements' heading that stays in view behave as without motion. The
  page's height and each section's place are the same with and without motion
  (`public-homepage.spec.ts` "the page moves only when motion is allowed: …").
- **The suites and the screenshots** read the page with reduced motion preferred
  (`playwright.config.ts`, `scripts/capture-screenshots.mjs`), since a reveal holds back what lies
  below the window; a test of motion allows it for its page (CODING_STANDARDS "Tests"; Product
  Owner: the same comment, item 3).

## 9. Post pages: News, Activity and Health Content

### 9.1 The header on the field, the frame and the text

Feature 009 #285 (spec #280 "Post page: the header", "Post page: the picture", "Post page: the
text"; Product Owner, #285 comment 6877659654).

- **The field** is the Homepage's deep green field (`DeepField` with `kind="post"`, the
  `deep-field` utility; §8.1) across the window, with lower corners of radius 32 (24 below `sm`),
  `surface-base` text and the `accent-warm` focus ring. As under a list's heading (§7.8) its glow
  is small, 28 % of its width by 12 rem at the upper right corner from `sm`, and the utility's
  phone glow below; it has no ring and no other decoration, since the ring crossed the summary of
  a post without a picture at 4.35:1 (spec #280 "Measured in the prototype"). It is as high as the
  header: it reaches 40 px under it below `sm` and 48 px from `sm`, and 80 px below `lg` where the
  frame follows.
- **The header** (`PostHeader.astro`), on the field, in the text column, 48 rem wide at most: the
  breadcrumb in white (§7.5), 24 px under the shell's header; 24 px under it a row with "เผยแพร่"
  and the publication date in an `accent-warm` pill with `brand-dark` words at 13 / 20 semibold,
  and for a News item with a category the category in a pill outlined in `surface-base` at 40 %;
  the title as the page's one H1, H3 below `sm`, H2 from `sm` and H1 from `lg`; the summary at
  body-large with the line breaks staff typed, an unbroken run of characters in it, such as a long
  web address, wrapping anywhere rather than passing the field's edge (#368 comment 7028435491,
  item 2); and Health Content's "ทบทวนล่าสุด" date at small
  size, all 12 px apart and in `surface-base`. A part the post lacks is left out, and so is the row
  with neither pill, as on a draft's preview. Every News and Activity states its story in words, at
  least its summary, as a One Page's text is an image (grill Q14; `05` §5.1). The page gives the
  shell no crumbs and shows its breadcrumb here, as a list's heading does.
- **The frame** (`PostColumns.astro`): the picture whole, at its own aspect ratio with corners of
  radius 18, in a white frame of radius 24 with 10 px of padding and the `deep` shadow, with
  "เปิดภาพขนาดเต็ม" and its `chevron-right` inside the frame under the picture at every width
  (Product Owner, #147 comment 6634124888 item 1), a link to the file as it was uploaded. The link
  keeps the page's `brand-primary` focus ring on the white frame.
- **From `lg`, a post with a picture reads in two columns:** the text column, 44 rem at most, a
  3 rem gap and the frame's column, 28 rem, at the right of the page's column. The frame starts on
  the field, 4.25 rem under its top, level with the row of pills while the breadcrumb takes one
  line (a breadcrumb that wraps moves the row down, and the frame keeps its place), and runs over
  the field's lower edge when it is the taller. It is sticky 1.5 rem below the header (`--header-offset` plus 1.5 rem
  from the top, §7.4): it stays in view while the text scrolls and stops at the end of the two
  columns. Anything full width, such as an Activity's photos, comes after them, so the frame never
  covers it.
- **Below `lg`**, one column: the header on the field, the frame, 48 rem wide at most, starting
  48 px above the field's lower edge, then the text (an Activity's details card after the frame:
  #285 comment 6877659654, item 1). A post without a picture keeps one column, its field as high as
  its header.
- **The text**, on the page's colour in the text column, starts 32 px under the field below `lg`
  and 40 px from `lg`, or 32 px under the frame where the frame comes before it (#285 comment
  6877659654, item 2). Its parts are 2 rem apart, each only when the post has it: an Activity's
  details card, white with the `card` shadow; or a News or Health Content post's body in the
  body's typography, its source line and its Health Topics.
- **A post's Health Topics** (`TopicPills`) follow its body and source under "ประเด็นสุขภาพ" at
  label size and a `divider` rule, as Homepage chips (`TopicChip`, §8.8): `brand-primary` words on
  `surface-base` with a 1.5 px `border-default` edge, at 13 / 20 medium below `sm` and 14 / 22 from
  `sm`, `surface-base` on `brand-primary` under the pointer, 44 px high, in a row 8 px apart and
  10 px from `sm`. Each opens Health News narrowed to its topic from a News item, and the Health
  Content list narrowed to it from Health Content. They show at once, with no effect (Feature 009
  #286; spec #280 "Post page: the text"; Product Owner, #286 comment 6876267675, item 1).
- **A post with a picture and no text** ends with whichever of its field and its frame ends
  lower; one without a picture ends with its field. No empty row or gap follows (#190 comment
  6707205912, Empty Post page row B). A difference in height between the frame and the text, and
  the shell's minimum page height, still leave their own space.
- **Motion** (§8.12): with motion allowed the header's text rises in as the page opens, as the
  hero's does, and the frame 0.25 s after it, as the Featured card follows the hero's text. The
  breadcrumb, the text, the details card and the photos show at once.
- `tests/browser/public-posts.spec.ts` reads the header's parts, their order, colours and the
  title's sizes on both sides of 640 and 1,024 px; the field's glow, corners and room under the
  header; the frame, its columns at 1,024 and 1,440 px and its one column at 320, 375, 768 and
  1,023 px; the frame in view while the text scrolls; the text's parts and spaces; the motion; and
  the pages without JavaScript.
- **Measured** on the development runtime at `fb11b3e`, the head of `009-news-post-redesign`
  (#287, `docs/evidence/287-news-post-redesign-evidence-round.md`):
  - `scripts/measure-text-contrast.ts` at 1,440, 1,024, 768, 375 and 320 px on seven demo posts
    (four News, one of them without a picture; the Activity; two Health Content, one with its
    review date) and one synthetic Health Content post without a picture, the lowest reading of
    each text: the breadcrumb's current page 5.34:1 (a News post without a picture, 375 px) and
    its links 7.28:1 (the third link of a Health Content post, 320 px); the H1 6.19:1 (the synthetic post, 375 px; 6.27:1 on the demo posts); the
    summary 6.45:1 (at 768 px and below, and at 1,024 px on the News post without a picture); a category's words 6.71:1 (320 px); the review date 6.45:1
    (the synthetic post, 320 px; 6.63:1 on the demo post); and `brand-dark` on the date's
    `accent-warm` pill 7.75:1.
  - `scripts/capture-screenshots.mjs`, the pages' heights in px at 1,440, 1,024, 768, 375 and
    320 px: the News post `/news/demo-news-flu-vaccine` 1,196, 1,278, 1,612, 1,544 and 1,636, where
    it was 1,168, 1,226, 1,634, 1,566 and 1,658 at `668d3e5`; the Activity
    `/activities/demo-activity-health-fair` 1,974, 1,923, 2,983, 2,345 and 2,372, where it was
    1,893, 1,781, 2,901, 2,293 and 2,320; the Health Content post `/health/content/demo-health-dengue`
    1,018, 1,102, 1,476, 1,360 and 1,538, where it was 956, 1,016, 1,464, 1,348 and 1,526. A News
    post with a picture alone (`scripts/screenshot-fixtures/post-empty-row.ts`, a landscape
    picture) is 900, 929, 1,183, 1,163 and 1,261 px, and a Health Content post without a picture
    900, 900, 900, 900 and 913 px, the shell's minimum height.
- An Announcement's, a Document's, a Health Report's, a Service's and a Health Service's page take
  this header on this field, though none is a Post page (§9.4 to §9.8).

### 9.2 An Activity's photos

`src/components/ActivityPhotos.astro` (Product Owner's decisions: #148 comment 6649367649):

- **The heading** is the Homepage's section heading (`SectionHeading`, §8): the gradient tile with
  a 24 px `images` icon, the label "กิจกรรม" and the H2 "ภาพกิจกรรม" in `section-title`, 24 px
  above the photos and 28 px from `sm`, as Latest News is above its cards. The section starts
  48 px under the columns and 64 px from `sm`, and shows at once, with no effect. An Activity
  without photos has neither (Feature 009 #286; spec #280 "Post page: the text"; Product Owner,
  #286 comment 6876267675, item 2).

- Square thumbnails, four to a row from `lg` and three below, each a link to the photo's file,
  with its caption under it on at most two lines and in full to a screen reader.
- The first eight show. The rest are in the same list, so they carry on its rows, and show while
  the outlined-pill control after the list is open. It reads "ดูรูปทั้งหมด (N รูป)" while closed
  and "ซ่อนรูป M รูป" while open. With eight photos or fewer there is no control.
- No JavaScript: a native `<details>` and a `:has()` rule. A browser without `:has()` shows every
  photo and no control.
- A link is named by the photo's alt text from the media library, else its caption, else "ภาพที่ N".
- The crop is the middle of the photo, or around the focal point that the field's value carries
  (§7.3).
- An Activity page with twenty photos is 2,259 px tall on a 375 px phone while they are folded,
  under its section heading, and 2,903 px with them open (`scripts/screenshot-fixtures/activity-photos.ts`
  at `fb11b3e`, #287).

### 9.3 A gallery in a News body

A gallery block in a body stays EmDash's own rendering: square thumbnails in the columns the block
sets (3 by default, 2 at 640 px and narrower), every photo shown, with no link per photo (emdash
1.1.0 `src/components/Gallery.astro`; spec #144). Large photo sets belong on an Activity, and
EmDash's Edit mode shows the block as a placeholder (`05` §5.1).

### 9.4 An Announcement's page: the header on the field and the card over its edge

Feature 010 #316 (spec #311 "An Announcement's page and a Document's page: the header", "The card
over the field's edge", "Motion", decisions 9, 10 and 15; Product Owner, #316 comment 6912742335).
A Document's page takes the same header and card (§9.5).

- **The header** is a Post page's (`PostHeader`, §9.1) on the `post` field, without a ring, 48 rem
  wide at most, though an Announcement is not a Post page (GLOSSARY): the breadcrumb in white; 24 px
  under it "เผยแพร่" and the publication date in the `accent-warm` pill and the Announcement's type
  (every type's label, as the details row joins them) in the outlined white pill, 13 / 20
  semibold, each with its 1 px edge; then the title as the page's one H1, H3 below `sm`, H2 from
  `sm` and H1 from `lg`. A pill the Announcement lacks is left out, and so is the row without a
  pill, as on a draft's preview without a type; a typed draft's preview shows its type alone. The
  page gives the shell no crumbs.
- **The card over the field's edge** (`CardOverField`): the header ends 80 px above the field's
  lower edge below `sm` and 96 px from `sm`, and the card starts 48 px above the edge below `sm`
  and 56 px from `sm`, in the text column, 48 rem wide at most: white, radius 24, the `deep`
  shadow, 20 px inside. It holds the details (type, announcement date, open date, close
  date, status), each row only when set, with the status as the Announcements list's dotted label
  (§8.7): "เปิดอยู่" `surface-base` on `brand-primary`, "ยังไม่เปิด" `brand-dark` on `accent-warm`,
  "ปิดแล้ว" `text-primary` on `status-closed`, at small size. **An Announcement with no details
  row** (no type and no date) has no card, and its field reaches 40 px under the header below `sm`
  and 48 px from `sm`, as a Post page's without a picture (Product Owner, #316 comment
  6912742335).
- **The text**, on the page's colour in the text column, starts 32 px under the card, or under the
  field, below `lg` and 40 px from `lg`: the details in the body's typography (`RichText`), then
  "เอกสารที่เกี่ยวข้อง", 32 px apart, each only when the Announcement has it.
- **"เอกสารที่เกี่ยวข้อง"** (`RelatedDocuments`) opens with the Homepage's section
  heading on the page's colour (§8): the gradient tile with the 24 px `folder-open`, the label
  "เอกสารเผยแพร่" and the H2 in `section-title`. The Document rows with their downloads (§7.3)
  follow 24 px under it below `sm` and 28 px from `sm`, as an Activity's photos under theirs
  (§9.2), titles H3, in the order staff attached them, 14 px apart. A Service's page has the same
  section (§9.7; spec #338 decision 3), and so has every Basic Page (§9.9; spec #365 decision 3).
- **Motion** (§8.12): with motion allowed the header's text rises in as the page opens and the card
  0.25 s after it; the breadcrumb, the details' text and the related Documents show at once.
- `tests/browser/public-announcements.spec.ts` reads the header's parts in order on the field,
  their colours and the title's sizes on both sides of 640 and 1,024 px; the card's place over the
  edge at 320, 375, 639, 640 and 1,440 px, its look and the three dotted labels; the page without
  a card; the text's and the related Documents' spaces at seven widths, their heading and their
  rows' H3s and downloads; and the motion.
- **Measured** on the development runtime at `6e429c5` (#316), `scripts/measure-text-contrast.ts
  --all-text` at 1,440, 1,024, 768, 375 and 320 px on `/announcements/demo-announcement-vhv-recruitment`
  (open, one related Document) and `/announcements/demo-announcement-quit-smoking-1` (closed), the
  lowest of each text: the breadcrumb's links 8.84:1 and its current page 5.27:1 (375 px); "เผยแพร่"
  and the date 7.75:1; the type's words 7.60:1 (320 px); the H1 6.36:1 (320 px); the card's terms
  4.97:1 and values 16.54:1; "เปิดอยู่" 6.45:1 and "ปิดแล้ว" 13.85:1; the label "เอกสารเผยแพร่"
  6.09:1 and the H2 15.47:1; a related row's "PDF" 5.60:1, facts and summary 4.97:1, title 16.54:1
  and download 6.45:1. `scripts/measure-focus-contrast.ts` read the row's title link and download
  rings at 6.45:1 under them and 6.07:1 or more beside them, and the breadcrumb's `accent-warm` ring
  on the field at 6.61:1 or more, none under 3:1; at `47fc28a` the second link's ring read 6.01:1
  at 320 px (#318).

### 9.5 A Document's page: its file first in the card over the field's edge

Feature 010 #317 (spec #311 "An Announcement's page and a Document's page: the header", "The card
over the field's edge", "Motion", decisions 8, 9 and 15). The page takes §9.4's field, header and
card (`PostHeader`, `CardOverField`). A Health Report's page holds its report Document's file the
same way (`FileBlock`, §9.6).

- **The header**, as §9.4's: the breadcrumb in white; 24 px under it the Document's type (every
  type's label, as the details row joins them) in the outlined white pill, then "ถูกแทนที่แล้ว" or
  "หมดอายุแล้ว" in the `accent-warm` pill (`PostHeader`'s `attention`), 13 / 20 semibold, each with
  its 1 px edge; the title as the page's one H1 in its sizes; and the summary at body-large with
  the line breaks staff typed. No publication date, as before. A pill the Document lacks is left
  out, and so is the row without a pill; a current Document shows its type alone, since its
  "ฉบับปัจจุบัน" stays in the details. With no room left on the row, the status's pill starts the
  next row 8 px under the type's.
- **The card** over the field's edge, as §9.4's in place and look, holds first the file:
  `FileTile` (the Document row's tile, §7.3: 68 px below `sm`, 92 px from `sm`, the gradient,
  `file-text` and the type in `accent-warm`, decorative); 16 px beside it the H2 "ไฟล์เอกสาร" at
  body-large, semibold, `brand-dark`, with the file's type and size under it at small size in
  `text-secondary`; and the download, `FileDownloadLink` in the row's look with today's words,
  "ดาวน์โหลดเอกสาร" semibold and the type and size in regular weight, linking to the file at
  EmDash's media URL under the uploaded file's name. From `sm` the download sits at the card's
  right, beside the text, 52 px high; below `sm` it runs across the card 16 px under the tile and
  the text, 44 px high, or, where its words do not fit one line (as "ดาวน์โหลดเอกสาร (PDF, 11.8
  KB)" at 320 px), on two lines centred 8 px inside it, the type and size kept whole on one
  (`FileDownloadLink`, the row's too). It is the same for a superseded or expired Document (#315
  comment 6909993217). **A file that cannot be served** shows the H2 and the unavailable notice
  (`UnavailableNotice`: "ไฟล์ไม่พร้อมให้บริการ", "หากต้องการเอกสารนี้ โปรดติดต่อสำนักงาน", "ติดต่อเรา"
  to `/contact`), and no tile. Then, 20 px apart, a 1 px `border-default` rule and the details
  (type, Document date, fiscal year, owner or source, status with "ฉบับปัจจุบัน", the health topics
  linking to the filtered repository), each row only when set. **A Document with no details row**
  has its card all the same, holding the file alone, without the rule.
- **The successor's note**, on a superseded Document whose successor is published, follows the
  card on the page's colour, as before, 32 px under it below `lg` and 40 px from `lg` (§9.4's
  text).
- **Motion** (§8.12): with motion allowed the header's text rises in and the card 0.25 s after it;
  the breadcrumb and the successor's note show at once.
- `tests/browser/public-documents.spec.ts` "a Document's page on the field" reads the header's
  parts in order on the field, their pills and colours, the title's sizes on both sides of 640 and
  1,024 px and the summary's line break; the card's place over the edge at 320, 375, 639, 640 and
  1,440 px with the file and details, the file alone and the unavailable notice; and the file
  block, the rule and the details at seven widths. The top-level Document page tests read the
  details in the card, the card without details, the successor's note under the card and the
  unavailable notice first in it.
- **Measured** on the development runtime at `b42cb51` (#317), `scripts/measure-text-contrast.ts
  --all-text` at 1,440, 1,024, 768, 375 and 320 px on the field and in the card of
  `/documents/demo-document-vhv-application` (current), `/documents/demo-document-plan-2569`
  (superseded, with its successor's note), `/documents/demo-document-flu-vaccine-form` (a health
  topic), `/documents/demo-document-plan-2570` (current, its status in the details) and an expired
  Document's and a file-gone Document's page (`scripts/screenshot-fixtures/lists-by-count.ts`,
  `LIST=documents`), the lowest of each text: the breadcrumb's links 9.34:1 (320 px) and its
  current page 5.48:1 (375 and 320 px); the type's pill 9.34:1 (320 px) and the status's 7.75:1;
  the H1 6.27:1 (320 px) and the summary 6.45:1; the tile's "PDF" 5.60:1; the H2 12.21:1, the type
  and size 4.97:1 and the download's words 6.45:1; the details' terms 4.97:1, values 16.54:1,
  "ฉบับปัจจุบัน" 10.94:1, the attention labels 7.75:1 and a topic's link 6.45:1; the notice's
  "ไฟล์ไม่พร้อมให้บริการ" 10.94:1, its line 5.07:1 and "ติดต่อเรา" 5.78:1; the successor's note
  10.56:1 and its link 5.58:1. `scripts/measure-focus-contrast.ts` read the download's and a
  topic link's rings on the card's white at 6.45:1 under them and 5.38:1 or more beside them; the
  successor's link, unchanged, 4.83:1 or more under its ring.

### 9.6 A Health Report's page: its report Document first in the card over the field's edge

Feature 011 #343 (spec #338 "The three pages: the header", "The card over the field's edge",
"Motion", decisions 4, 8 and 9). The page takes §9.4's field, header and card (`PostHeader`,
`CardOverField`), though a Health Report is not a Post page, and §9.5's file block (`FileBlock`).

- **The header**, as §9.4's: the breadcrumb in white; 24 px under it "วันที่รายงาน" and the report
  date in the `accent-warm` pill (`PostHeader`'s `date` with `dateWords`), only when the report has
  a report date, never its publication date; then its Report Type (every type's label, as the
  details row joins them) in the outlined white pill, 13 / 20 semibold, each with its 1 px edge;
  the title as the page's one H1 in its sizes; and the summary at body-large with the line breaks
  staff typed. A pill the report lacks is left out, and so is the row without a pill. The report
  date shows in the details too.
- **The card** over the field's edge, as §9.4's in place and look, holds first the report
  Document, as §9.5's file: `FileTile`, centred on the text beside it, which the Document's title
  makes the taller (as in the prototype); 16 px beside it the H2 "เอกสารรายงาน" at body-large,
  semibold, `brand-dark`, the Document's title under it as a semibold `brand-primary` underlined
  link to `/documents/<slug>`, text-line high, as a Document row's title (24 px a line; Product
  Owner, #343 comment 6975126191), and the file's type and size at small size in `text-secondary`; and
  the download "ดาวน์โหลดเอกสาร" with the type and size (`FileDownloadLink`), linking to the file
  at EmDash's media URL under the uploaded file's name, at the card's right and 52 px high from
  `sm`, across the card 16 px under the tile and the text below `sm`. **A Document that is not
  published, or whose file cannot be served,** shows the H2 and the unavailable notice
  (`UnavailableNotice`: "เอกสารรายงานไม่พร้อมให้บริการ", "หากต้องการเอกสารนี้ โปรดติดต่อสำนักงาน",
  "ติดต่อเรา" to `/contact`), with no tile, no download and no link to the Document. Then, 20 px
  apart, a 1 px `border-default` rule and the details (Report Type, report date, reporting period,
  fiscal year, owner or source), each row only when set. **A report with no details row** has its
  card all the same, holding the file alone, without the rule.
- **Motion** (§8.12): with motion allowed the header's text rises in and the card 0.25 s after it;
  the breadcrumb shows at once.
- `tests/browser/public-health.spec.ts` "a Health Report's page on the field" reads the header's
  parts in order on the field, their pills and colours, the title's sizes on both sides of 640 and
  1,024 px and the summary's line break, a report without a report date (the type's pill alone,
  no date), one without a type and one with neither; the card's place over the edge at 320, 375,
  639, 640 and 1,440 px with nothing past the window at 375 and 320 px; the file block, the
  Document's link, the rule and the details at seven widths; the unavailable notice for an
  unpublished Document and for a file that cannot be served; and the motion. Its top-level report
  test reads the details, the download's address and file name, the breadcrumb and the canonical
  address, and "/health without JavaScript" the page whole without JavaScript.
- **Measured** on the development runtime at `a683d48` (#343), `scripts/measure-text-contrast.ts
  --all-text --fold` at 1,440, 1,024, 768, 375 and 320 px on `main` of
  `/health/reports/demo-report-dengue-q4` (every field), `/health/reports/demo-report-performance-2569`
  (no report date) and two synthetic reports (`scripts/screenshot-fixtures/lists-by-count.ts`,
  `LIST=health-reports`: the report Document unpublished, and its file deleted), the lowest of each
  text: the breadcrumb's links 6.61:1 and its current page 5.34:1 (375 px); "วันที่รายงาน" and the
  date 7.75:1; the type's pill 5.79:1 (375 px); the H1 6.19:1 (375 px) and the summary 6.45:1; the
  tile's "PDF" 5.68:1; the H2 12.21:1, the Document's title 6.45:1, the type and size 4.97:1 and
  the download's words 6.45:1; the details' terms 4.97:1 and values 16.54:1; the notice's
  "เอกสารรายงานไม่พร้อมให้บริการ" 10.94:1, its line 5.07:1 and "ติดต่อเรา" 5.78:1.

### 9.7 A Service's page: its details in the card over the field's edge, then its guidance

Feature 011 #344 (spec #338 "The three pages: the header", "The card over the field's edge",
"Motion", decisions 3, 8 and 10; Product Owner, #344 comment 6979384685). The page takes §9.4's
field, header and card (`PostHeader`, `CardOverField`), though a Service is not a Post page.

- **The header**, as §9.4's: the breadcrumb in white; 24 px under it each Service Category in its
  own outlined white pill, as text, in the order the card's "หมวดบริการ" row lists them (item 2),
  13 / 20 semibold with its 1 px edge, the next pill 8 px beside it or 8 px under it where the row
  wraps; the title as the page's one H1 in its sizes; and the summary at body-large with the line
  breaks staff typed. No icon of the Service shows in the header. A Service without a category has
  no row of pills.
- **The card** over the field's edge, as §9.4's in place and look, holds the Service's details
  (ผู้ให้บริการ, หน่วยงานผู้ให้บริการ, หมวดบริการ with each category linking to the catalog filtered
  by it), each row only when set, then 20 px under them the external link "ไปยังเว็บไซต์ของบริการ"
  (the `brand-primary` pill, 44 px high, marked as leaving the site) and its note
  "ลิงก์นี้พาออกจากเว็บไซต์ของสำนักงานไปยัง {host}". **A Service with neither** details
  nor an external link has no card, and its field reaches 40 px under the header below `sm` and
  48 px from `sm`, as §9.4's.
- **The text**, on the page's colour in the text column, starts 32 px under the card, or under the
  field, below `lg` and 40 px from `lg`, each part 32 px apart: the guidance in its order
  (channels, eligibility, steps, documents to prepare, contact and location, duration, fees,
  notes), each section only when it holds something, under its H2 in `text-h3` `brand-dark`,
  without an icon (`DetailSection`); then "เอกสารที่เกี่ยวข้อง" as §9.4's, with each Document's
  download, in the order staff attached them; then "หน่วยบริการสุขภาพที่ให้บริการนี้" under the
  Homepage's section heading on the page's colour (the gradient tile with the 24 px `hospital`,
  the label "หน่วยบริการ" in `brand-primary` and the H2 in `section-title`), its rows 24 px under
  it below `sm` and 28 px from `sm`, 14 px apart: the directory's Health Service row (§7.3), its
  name an H3, with "เปิดแผนที่" at the row's right from `lg` in the text column, under the text from
  `sm` and across the row below `sm`. The Health Services follow by name: the relation
  is linked from the Health Service's side, so the Service's side has no order staff set
  (item 1).
- **Motion** (§8.12): with motion allowed the header's text rises in and the card 0.25 s after it;
  the breadcrumb, the guidance and both sections show at once, their rows without a reveal.
- `tests/browser/public-services.spec.ts` "a Service's page on the field" reads the header's parts
  in order on the field, the pills' look and order, the title's sizes on both sides of 640 and
  1,024 px, the summary's line break, the header without an icon and a Service without a
  category; the card's place over the edge at 320, 375, 639, 640 and 1,440 px with the details
  and the link, the details alone and the link alone, nothing past the window at 375 and 320 px,
  the link 20 px under the details, and a Service with neither; the text's spaces, the guidance's
  H2s and the two sections' headings and rows at seven widths; a row's map by width; and the
  motion. Its top-level tests read the details for each ownership type, the guidance's order, the
  external link and the two sections' rows with their downloads and maps, and "a Service's page
  without JavaScript" the page whole without JavaScript.
- **Measured** on the development runtime at `e5ea613` (#344), `scripts/measure-text-contrast.ts
  --all-text --fold` at 1,440, 1,024, 768, 375 and 320 px on `main` of
  `/services/demo-service-flu-vaccine` (three offering Health Services),
  `/services/demo-service-complaint` (every guidance field and a related Document),
  `/services/demo-service-health-rights` (the external link) and two synthetic Services
  (`scripts/screenshot-fixtures/service-page.ts`: two categories with a closed and an inactive
  Health Service, and one without a card), the lowest of each text: the breadcrumb's links 8.49:1
  and its current page 5.55:1 (320 px); a category's pill 6.53:1 (320 px); the H1 5.86:1 (375 px)
  and the summary 6.45:1; the card's terms 4.97:1 and values 16.54:1, the category links 6.45:1,
  "ไปยังเว็บไซต์ของบริการ" 6.45:1 and its note 4.97:1; the guidance's H2s 10.22:1, its text
  15.61:1 and a channel's link 6.09:1; the labels "เอกสารเผยแพร่" and "หน่วยบริการ" 6.09:1 and
  their H2s 15.47:1; a Document row's "PDF" 5.60:1, facts and summary 4.97:1, title 16.54:1 and
  download 6.45:1; a Health Service row's facts, official name and address 4.97:1, name 16.54:1,
  "เปิดแผนที่" 6.45:1, and "ปิดให้บริการชั่วคราว" and "ไม่เปิดให้บริการแล้ว" 7.75:1.

### 9.8 A Health Service's page: its location first in the card over the field's edge

Feature 011 #345 (spec #338 "The three pages: the header", "The card over the field's edge",
"Motion", decisions 8, 11, 13, 18 and 21). The page takes §9.4's field, header and card
(`PostHeader`, `CardOverField`), though a Health Service is not a Post page.

- **The header**, as §9.4's: the breadcrumb in white; 24 px under it its Facility Type in an
  outlined white pill, one pill each, as a Service's categories (§9.7), then, only when it is
  temporarily closed or inactive, "ปิดให้บริการชั่วคราว" or "ไม่เปิดให้บริการแล้ว" in the
  `accent-warm` pill (`PostHeader`'s `attention`), 13 / 20 semibold with their 1 px edges, 8 px
  apart; its shown name as the page's one H1 in its sizes; and, when its display name differs, its
  official name under it at body-large, where a Post page has its summary. An open Health Service
  has no status pill, and one without a type or status has no row of pills.
- **The card** over the field's edge, as §9.4's in place and look, holds first its location:
  "ที่ตั้ง" with the address, with the line breaks staff typed, and "เปิดแผนที่" 12 px under it,
  today's outlined pill without the `map-pin` (§7.3), 44 px high, named with the Health Service's
  shown name as a directory row's (`MapLink`'s `context`); "เวลาทำการ" and "ช่องทางติดต่อ" with
  the line breaks staff typed. Then 20 px under them a 1 px `border-default` rule, and 20 px under
  it its details: รหัสหน่วยบริการ, ประเภทหน่วยบริการ, สังกัด, สถานะการให้บริการ (the
  `accent-warm` attention label when out of service, the `surface-soft` plain label for
  "เปิดให้บริการ") and พื้นที่รับผิดชอบ, each Area a 44 px link to the directory filtered by it. Each
  row shows only when set. The rule shows only between the two: without a location the card holds
  the details alone, and without details the location alone. **A Health Service with neither**
  has no card, and its field reaches 40 px under the header below `sm` and 48 px from `sm`, as
  §9.4's. The official name leaves the card for the header.
- **"บริการที่ให้"** follows on the page's colour in the text column, 32 px under the card, or under
  the field, below `lg` and 40 px from `lg`: the Homepage's section heading (the gradient tile with
  the 24 px `users`, the label "บริการ" in `brand-primary`, the H2 in `section-title`), then 24 px
  under it below `sm` and 28 px from `sm` the catalog's Service cards (§7.3, §8.4;
  `HomeServiceCard kind="section"`), names H3, in the order staff linked them: two to a row from
  `sm` and one below at any count, 20 px apart from `sm` and 12 px below, the `card` shadow at
  rest and `deep` under the pointer, the focus ring inside the card's edge on its white.
- **Motion** (§8.12): with motion allowed the header's text rises in and the card 0.25 s after it;
  the breadcrumb and "บริการที่ให้" with its cards show at once, the cards without a reveal.
- `tests/browser/public-health-services.spec.ts` "a Health Service's page on the field" reads the
  header (`readHeaderOnField` in `public.helpers.ts`, which the Health Report's and the Service's
  header tests share) with each status and without one, the official name under the H1 and none
  when the names agree; the card's place over the edge at 320, 375, 639, 640 and 1,440 px with the
  location and the details, the details alone and the location alone, the rows' order, the rule
  between them, the map's name, place and height, the status labels and the Area links, nothing
  past the window at 375 and 320 px, and a Health Service with neither; "บริการที่ให้"'s place,
  heading, rows per count at 320, 639, 640, 1,023, 1,024 and 1,440 px and its cards' shadows,
  link and ring; and the motion. "a Health Service's page without JavaScript" reads each part
  whole without JavaScript.
- **Measured** on the development runtime at `2b24bb8` (#345), `scripts/measure-text-contrast.ts
  --all-text --fold` at 1,440, 1,024, 768, 375 and 320 px on `main` of
  `/health-services/demo-health-service-song-hospital` (every location detail, one Service),
  `-ban-klang` (a display name) and `-huai-mai` (closed for now, no contact, no Service), and three
  synthetic Health Services (`scripts/screenshot-fixtures/health-service-page.ts`: inactive
  without a map and with three Services, details without a location, and one without a card), the
  lowest of each text: the breadcrumb's links 4.88:1 (375 px) and its current page 6.54:1; the
  Facility Type's pill 7.70:1 and the status's pill 7.75:1 (320 px and up); the H1 5.78:1 (375 px)
  and the official name under it 6.45:1; the card's terms 4.97:1 and values 16.54:1, "เปิดแผนที่"
  and the Area links 6.45:1, "ปิดให้บริการชั่วคราว" and "ไม่เปิดให้บริการแล้ว" 7.75:1 and
  "เปิดให้บริการ" 10.94:1; the label "บริการ" 5.40:1 and the H2 15.20:1; a Service card's name
  14.82:1 and its summary 5.20:1 (768 px, over the corner circle).

### 9.9 A Basic Page: the Post page's header on the field, its body and its related Documents

Feature 012 #368 (spec #365 "A Basic Page", decisions 2, 3 and 9, "Motion"). A Basic Page on
`/pages/{slug}` and `/about/organization` (`BasicPageContent`); `/about` takes the same header, on
a list's field before its tiles, with the same body and related Documents after them (#371;
`BasicPageText`; "`/about`" below).

- **The field** is a Post page's (`DeepField kind="post"` in `PostColumns` without a picture,
  §9.1): the small glow and no ring, as high as the header plus 40 px below `sm` and 48 px from
  `sm`.
- **On it,** the Post page's header (`PostHeader`, §9.1), 48 rem wide at most: the breadcrumb in
  white (หน้าแรก and the title; on `/about/organization` through เกี่ยวกับเรา), then
  24 px under it the page's title as its one H1 in the Post page's sizes (H3 below `sm`, H2 from
  `sm`, H1 from `lg`), and the summary at body-large with the line breaks staff typed, a long web
  address in it wrapping anywhere (§9.1). There is no
  row of pills, no icon tile and no frame; a page without a summary has no lead.
- **The body** follows on the page's colour in the 48 rem text column, 32 px under the field
  below `lg` and 40 px from `lg`, in the body's typography (`RichText`).
- **"เอกสารที่เกี่ยวข้อง"** follows 48 px under the body, or where the body would start, in the
  same column: Feature 010's section (§9.4), the Homepage's section heading with the gradient
  `folder-open` tile, the label "เอกสารเผยแพร่" and the H2, then the Document rows with their
  downloads (§7.3), titles H3, 14 px apart.
- **The page's end:** the page's own 64 px, 80 px from `lg`, before the footer. A page with neither
  body nor related Documents ends with its field and that room, with no empty row (spec #365
  decision 9).
- **Motion** (§8.12): with motion allowed the header's title and summary rise in as the page opens;
  the breadcrumb, the body and the related Documents show at once.
- The 404 of a missing Basic Page and of an unpublished `organization`, the 301 of `/pages/about`
  and `/pages/organization` with the query string, the signed preview link and its `noindex`, the
  canonical address and the head's title are unchanged.
- `tests/browser/public-about.spec.ts` "a Basic Page on the field" reads the header on the field at
  320, 375 and 1,440 px, the title's sizes on both sides of 640 and 1,024 px, the field's glow and
  reach, a page without a summary; the body's and the related Documents' places and column at six
  widths, their heading, rows and downloads; a page with its title alone; a draft's preview; the
  motion; and the page without JavaScript.
- **Measured** on the development runtime at `b020cc4` (#368), `scripts/measure-text-contrast.ts
  --all-text --fold` at 1,440, 1,024, 768, 375 and 320 px on `/pages/privacy`,
  `/about/organization` and the `page-related` case of
  `scripts/screenshot-fixtures/about-contact-cases.ts` (a summary, a body and two related
  Documents, one superseded), the lowest of each text: the breadcrumb's links 9.09:1 and its
  current page 5.27:1 (320 px); the H1 5.34:1 (`/pages/privacy`, 375 px) and the summary 6.19:1;
  the body's headings 11.52:1 and text 15.61:1; the label "เอกสารเผยแพร่" 6.09:1 and the H2
  15.47:1; a row's facts and summary 4.97:1, its title 16.54:1, "PDF" 5.60:1, the download
  6.45:1 and "ถูกแทนที่แล้ว" 7.75:1.

**`/about`** (Feature 012 #371; spec #365 "`/about`", decisions 2, 3, 8 and 10, "Motion"; P1 A):

- **The field** is a list's (`DeepField kind="list"`, §7.8): the small glow, and the large ring
  from `lg`. Its content ends 96 px above its lower edge below `sm` and 128 px from `sm`, as a
  list heading's.
- **On it,** a Basic Page's header (`PostHeader`, as above), 48 rem wide at most: the breadcrumb
  in white, ending at the section, หน้าแรก then เกี่ยวกับเรา, whatever the page's title; the `about`
  Basic Page's title as the H1 and its summary; without a published `about` page the H1
  "เกี่ยวกับเรา" and no lead. The shell shows no breadcrumb of its own above it.
- **Over its edge** (`ListBody`), starting 64 px above it below `sm` and 88 px from `sm`, the six
  sub-pages as the Homepage's Quick Access tiles (`HomeQuickLink kind="list"`, §7.3, §8.11): each
  label an H2, two to a row below `lg` and three from `lg`, 12 px apart below `sm` and 20 px from
  `sm`, the compact card below 640 px, each focus ring with the lists' band.
- **48 px under the tiles** the body in the 48 rem column, then 48 px under it "เอกสารที่เกี่ยวข้อง"
  (`BasicPageText`, as above); a part the page lacks is left out with its room, and without the
  page the tiles are the last part. A body that opens with a heading starts 32 px lower, its
  heading's own margin, as on every Basic Page (#380). Then the page's own 64 px, 80 px from `lg`.
- **Motion** (§8.12): the header's title and summary rise in as the page opens; each tile reveals
  as it comes into the window and shows whole while it holds the keyboard's focus; the breadcrumb,
  the body and the related Documents show at once.
- The canonical address, the head's title and description, the signed preview of the `about` page
  through `/pages/about` and its `noindex` are unchanged.
- `tests/browser/public-about.spec.ts` "/about on the field" reads the tiles in order with their
  addresses and H2s, their rows, gaps, form and surface at 320, 375, 639, 640, 1,023, 1,024 and
  1,440 px, the field's look, where the header ends and the tiles start against the field's edge
  and their focus rings; the header with and without the page and the preview; the body and the
  related Documents after the tiles at six widths; the motion; and the page without JavaScript.
- **Measured** on the development runtime at `36e0770` (#371), `scripts/measure-text-contrast.ts
  --all-text --fold` on `main` at 1,440, 1,024, 768, 375 and 320 px, on `/about` (the demo
  dataset's `about` page) and the `about-no-page` case of
  `scripts/screenshot-fixtures/about-contact-cases.ts`, the lowest of each text: the breadcrumb's
  links 10.27:1 and its current page 8.96:1 (320 px); the H1 5.86:1 (320 px), and "เกี่ยวกับเรา"
  8.36:1 without the page; the summary 4.85:1 (1,024 px, where the large ring runs behind it; the
  prototype read 4.92:1); the tiles' labels 16.54:1; the body's headings 11.52:1 and text 15.61:1;
  "เอกสารเผยแพร่" 6.09:1, a row's facts and summary 4.97:1, "PDF" 5.60:1 and the download 6.45:1.
  `scripts/measure-focus-contrast.ts` on the tiles of the first row, which meet the field, and of
  the second: beside the ring, with focus, no pixel under 3:1 at any of the five widths, where the
  ring alone over the field reads 1.00:1.

### 9.10 The Contact page: Office Contact's card over the field's edge, the channels and the routes

Feature 012 #369 (spec #365 "`/contact`", decisions 4, 8, 9 and 13, "Motion"; P4 A). The page
takes a list's field and heading (§7.8), though it lists nothing.

- **The heading** on the field, as §7.8's: the breadcrumb in white under หน้าแรก, the label
  "ติดต่อ" (the Homepage's Contact Summary's, §8.11), the H1 "ติดต่อเรา" with the `headset` tile,
  and the lead.
- **The details card** (`OfficeContactDetails`) over the field's edge, starting 64 px above it
  below `sm` and 88 px from `sm`, as a list's block (`ListBody`), at the column's start and 64 rem
  wide at most: white, the `deep` shadow, radius 24, 20 px inside and 32 px from `sm`. Its rows
  run in one column below `sm` and two from `sm`, ที่ตั้ง and โทรศัพท์ in the first row, อีเมล and
  เวลาทำการ in the second, 24 px apart and 40 px across. A row has a 44 px `surface-soft` tile,
  radius 14, with the 20 px icon in `brand-primary` (`map-pin`, `phone`, `mail`, `clock`),
  decorative, then 16 px from it the term at label size in `text-secondary` and 2 px under it the
  value, as the prototype has them (the spec gives neither gap). The address keeps the line
  breaks staff typed, with "เปิดแผนที่" 12 px under it, the outlined pill (§7.3). The telephone
  number is at H3 size and semibold: while it is one number a link in `brand-primary`, underlined
  and 44 px high, and otherwise plain text in `text-primary` without the underline, so it does not
  read as a link (Product Owner, 2026-11-20: #369 comment 7034812318, item 2). The email is a
  link while it is one address, and the opening hours keep their line breaks. Each row shows only
  while its detail is set (`officeContactShown`, `src/lib/office-contact-settings.ts`, for the
  card as a whole). **With no detail set** there is no card, nothing lies over the field's edge,
  and the field ends under the lead (§7.8).
- **"ช่องทางทางการ"** follows 48 px under the card, or 32 px under the field below `lg` and 40 px
  from `lg` when there is no card: the Homepage's section heading (the gradient tile with the
  24 px `share-2`, the label "ติดต่อ" in `brand-primary`, the H2 in `section-title`), then 24 px
  under it, 28 px from `sm`, the channels as pills: white, a 1.5 px `border-default` edge, the
  network's name at body size, semibold, in `brand-primary`, and the 16 px `arrow-up-right`;
  `brand-primary` with white words under the pointer; 44 px high and 20 px across inside, 10 px
  apart, wrapping. Each opens in a new tab and says for assistive technology alone that it leaves
  the site and opens a new tab (`ContentLink`'s `compact`), as the footer's channel links (Product
  Owner, #62 comment 6516956505), so "(เว็บไซต์ภายนอก)" leaves the visible text. No section
  without a channel.
- **The two routes** 48 px under the channels, or under the card, or under the field as the
  channels would be: white cards with the `card` shadow and radius 24, side by side from `sm` and
  stacked below, 16 px apart and 20 px from `sm`, 24 px inside and 28 px from `sm`, their parts
  16 px apart, as the prototype has them. Each holds a 52 px gradient tile with its 24 px icon
  (`message-square`, `hospital`), decorative; its H2 at H3 size, "ร้องเรียนและเสนอแนะ" and
  "ติดต่อหน่วยบริการสุขภาพ"; today's sentence in `text-secondary`; and today's button
  (`ActionLink` with `arrow`), semibold with a 16 px `arrow-right` as the prototype draws it
  (Product Owner, 2026-11-20: #369 comment 7034812318, item 1), 44 px high: "ดูบริการประชาชน"
  filled to the Service catalog, "ดูหน่วยบริการสุขภาพที่เกี่ยวข้อง" outlined to the Health Service
  Directory. A label that wraps, as the second does in the narrow card at 320 and 640 px, keeps
  its lines centred 8 px inside the pill, as a download's (§7.3).
- No map is embedded, as before (approved Q3 of Feature 003).
- **Motion** (§8.12): the heading's block and its lead rise in as the page opens; the breadcrumb,
  the card, the channels and the routes show at once.
- The H1, the lead, the terms, the H2s, the sentences, the buttons' words, the head's title and the
  breadcrumb are unchanged; the label "ติดต่อ" is new, on the field and over "ช่องทางทางการ".
- `tests/browser/public-contact.spec.ts` reads the heading at the five widths and on both sides of
  640 and 1,024 px (`testHeadingOnField`); the card's place over the edge, width, look, rows and
  gaps at 320, 639, 640, 1,023, 1,024 and 1,440 px and its links' focus rings; each row's tile,
  term and value, the telephone and the email as links and as plain text, each row with and
  without its detail, and no card with nothing set, the field then ending under the lead; the
  channels' heading, pills, places, names and new tabs, and no section without a channel; the two
  routes' places, look, headings, sentences and buttons, each button's words 8 px inside its pill,
  its lines centred, at the six widths; the motion; and the page without
  JavaScript. `tests/node/public-contact.test.ts` holds `officeContactShown`.
- **Measured** on the development runtime at `cd80cb9` (#369), `scripts/measure-text-contrast.ts
  --all-text --fold` on `main` at 1,440, 1,024, 768, 375 and 320 px, on `/contact` (the demo
  dataset's full Office Contact and three channels) and the `contact-empty` case of
  `scripts/screenshot-fixtures/about-contact-cases.ts` (nothing set, no channel), the lowest of
  each text: the breadcrumb's link 10.55:1 and its current page 9.46:1 (320 px, empty); the label
  "ติดต่อ" on the field 8.71:1 and the H1 7.81:1 (320 px, empty); the lead 6.45:1 (768 px and
  below); the card's terms 4.97:1, its address and opening hours 16.54:1, "เปิดแผนที่", the
  telephone and the email 6.45:1; the label "ติดต่อ" over "ช่องทางทางการ" 5.81:1 and the H2
  15.47:1; the pills 6.45:1; the routes' H2s 15.93:1, their sentences 4.97:1 and both buttons
  6.45:1.

## 10. Acceptance and known limits

**What the Product Owner picked for the Homepage and the shell** on the Feature 008 prototype
(spec #239 "Decisions the Product Owner made"):

- a new design, page by page, in variant H's look, on the tokens' colours and radii and Noto Sans
  Thai (§2);
- the Leadership strip before Latest News, compact ("เห็นด้วยกับแบบที่ 2"), with the first three
  Leadership;
- a header without "ติดต่อเรา" ("เอาปุ่ม ติดต่อเรา ใน header ออกด้วย"), with a search link and no
  utility bar (#239 comment 6786536858);
- Quick Access out of view, by an empty menu ("ฉันคิดว่าทางลัดสามารถตัดออกได้เลย");
- the Announcements' category badges in separate colours ("bage ของประกาศควรแยกสีนะ"), and five
  Activities;
- the new colours and type sizes, the tablet range from 640 px, the new copy, no map stand-in, the
  Service's icon and the prototype's motion (#239 comments 6786536858 and 6786631899), then
  decorations that stand still (#249 comment 6838503280).

The prototype's variant H, on the branch `prototype/home-redesign`, is the visual reference
(`docs/prototypes/home-redesign.md` there). Each ticket's decisions are on #240 to #249 and in
§13. The Product Owner accepted the feature on #239 (comment 6841960594),
with the evidence round of #250 (`docs/evidence/250-homepage-redesign-evidence-round.md`), which
names what the evidence does not cover.

**What the Product Owner picked for the News lists and the Post page** on the Feature 009
prototype, after the Homepage as it is built and not its prototype ("design หน้าแรก (ปัจจุบัน)"),
each answered "ตามที่แนะนำ" or picked from offered options on 2026-11-13 (spec #280 "Decisions the
Product Owner made", whose numbers these are):

- the scope: the three lists and the Post page of all three kinds, `/activities` and every other
  page left for their own features; every earlier behaviour, address and read as it is; no new
  field, address or section; and the Homepage's motion with no new effect;
- the lists' heading on the deep field with the cards over its edge (1, 12), and the newest item
  large on a first page that no Health Topic narrows, laid out by the number of items (2, 13);
- `/news` headed as the Homepage's section, "ข่าวสาร" and "ข่าวประชาสัมพันธ์", its head, menu and
  breadcrumb still "ข่าวสาร" (3), with a pill link to Health News (5);
- a small card's date, dot and label on one line (4), titles in three lines at most and summaries
  in two from 640 px (10), a full page at two columns ending with one card alone (11), and the
  Homepage's hover in place of #193's ring and green underlined title (15);
- the Post page's header on the field and its picture in a white frame over the field's edge (6),
  its text on the page's colour (7), its Health Topics as the Homepage's chips (8), an Activity's
  photos under a section heading (9), and "เผยแพร่" before the date (16);
- what moves (14): a heading and a Post page's frame rise in, a list's cards reveal and lift.

**What the Product Owner decided while the tickets were built,** each on its ticket:

- the link to Health News at the heading's upper right from 640 px, as the prototype has it
  (#281 comment 6846855734), and no `surface-soft` glow on the field (#281 comment 6847783611);
- a list card's focus ring with a white band (#283 comment 6854670042), the label under the date
  below 640 px (#283 comment 6855983271), and `05` §5.1's crop amended for staff (#283 comment
  6855158989);
- the large card's label pill filled `brand-dark` at 40 % and `ContentCard`'s pictures without a
  placeholder (#284 comment 6870867641), and a long label under the date, never cut (#284 comment
  6871942671);
- a post's chips as the Homepage's chip whole, 44 px high, and the photos' heading 24 / 28 px
  above them (#286 comment 6876267675);
- an Activity's details card after the frame below 1,024 px and the text 32 px under the frame
  (#285 comment 6877659654), and the frame 4.25 rem under the field's top when the breadcrumb wraps
  and the breadcrumb shown at once (#285 comment 6878495201).

The prototype's variant C, on the branch `prototype/news-post-redesign` at `427f5c8`, is the
visual reference (`docs/prototypes/news-post-redesign.md` there). Each ticket's decisions are on
#281 to #286 and in §13. The evidence round of #287
(`docs/evidence/287-news-post-redesign-evidence-round.md`) measures the pages and names what the
evidence does not cover. The Product Owner accepted the feature on #280 (comment 6891402807).

**What the Product Owner picked for the Activities, Announcements and Documents pages** on the
Feature 010 prototype, after the Homepage and Feature 009's pages as they are built, each answered
"ตามที่แนะนำ" on 2026-11-15 (spec #311 "Decisions the Product Owner made", whose numbers these
are; #311 comment 6895825492):

- the scope: the five pages in one feature; every read, order, page size, filter, address, head
  tag, 404 and preview behaviour as it is; no new field, address or section; and the Homepage's
  motion with no new effect (1, 5);
- the new Document row on `/documents` and under an Announcement's "เอกสารที่เกี่ยวข้อง" only, and
  every other page's Document row as it is until its own feature (2);
- each list headed as Feature 009's lists, with its label, H1 and icon and no pill link (3), and
  `/documents`' filter form over the field's edge (4);
- `/activities` with Feature 009's list cards, not the Homepage's tiles, the newest large on a
  first page by count, and a card's line of the date, a dot and the place (6, 12);
- the Announcements list with the Homepage's Announcement row, a closed one's tile and label in
  `status-closed` (7, 13);
- `/documents` with rows, not cards (14): the download, or "ไฟล์ไม่พร้อมให้บริการ", and a status label
  only on a superseded or expired Document (8); the title and the download as two links, no link
  over the row (16); the download under the text below 1,024 px (17);
- an Announcement's and a Document's page with the Post page's header on the field and one card
  over its lower edge (9, 15), and "เอกสารที่เกี่ยวข้อง" with the Homepage's section heading (10);
- **Current Announcement** in `GLOSSARY.md` (11).

**What the Product Owner decided while the tickets were built,** each on its ticket:

- the white band beside the focus ring of a card over the field (#312 comment 6897891014), which
  the list card has had since #313;
- the second list card's ring at 1,024 px left to #322, outside the feature (#313 comment
  6903865541); a small card's place on one line below 640 px, no mark before the place, and the
  large card's layouts as `/news` has them (#313 comment 6905240669);
- a closed Announcement row's type badge in its colour (#314 comment 6906496480);
- a Document row's title in `text-primary`, `brand-primary` and underlined under the pointer on its
  own link only (#315 comment 6908747140), and the full download on a superseded or expired
  Document's row (#315 comment 6909993217);
- an Announcement without a details row: no card, and the field 40 / 48 px under the header (#316
  comment 6912742335); its status in the card only, the card's full details, and the Homepage's
  section heading over the related Documents (#316 comment 6913757888);
- a Document's successor note after the card, its status in the header's pill and in the details,
  the H2 "ไฟล์เอกสาร" above the unavailable notice, and a download whose words take two lines,
  centred, when one cannot hold them (#317 comment 6918054121).

The prototype's variants, on the branch `prototype/activities-announcements-documents` at
`4b8aa22`, are the visual reference (`docs/prototypes/activities-announcements-documents.md`
there). Each ticket's decisions are on #312 to #317 and in §13. The evidence round of #318
(`docs/evidence/318-activities-announcements-documents-evidence-round.md`) measures the pages and
names what the evidence does not cover, which the Product Owner accepted after the walkthrough
(#318 comment 6935876072). The Product Owner accepted the feature on #311 (comment 6936494700).

**What the Product Owner picked for the Health Information hub, the Health Reports, Services and
Health Services pages** on the Feature 011 prototype, after the Homepage and Features 009 and 010's
pages as they are built, each answered "ตามที่แนะนำ" on 2026-11-17 (spec #338 "Decisions the
Product Owner made", whose numbers these are; #338 comment 6941491587):

- the scope: the seven pages in one feature, `/health` among them; every read, order, page size,
  filter, address, head tag, 404 and preview behaviour as it is; no new field, address or section;
  the model and the Admin as they are; and the Homepage's motion with no new effect (1, 2, 7);
- the new Health Service row on the directory and under a Service's "หน่วยบริการสุขภาพที่ให้บริการนี้",
  Feature 010's related Documents on a Service's page, and every other page's rows and
  the ITA landing's card as they are until their own feature (2, 3);
- a Health Report's file as a Document's page holds its file, and `DocumentDownload.astro` gone
  (4, #334);
- each list headed as Feature 009's lists, with its label, H1 and icon (5), and `/services`' and
  `/health-services`' filter forms over the field's edge (6);
- `/health`'s two destinations as the Homepage's Quick Access tiles, side by side at every width
  (13);
- `/services` with the Homepage's Frequently Used Service card, shared, in a plain grid of three,
  two and one at any count, and its two related links under the lead (13, 15); the card's summary
  in `text-secondary-on-soft`, on the Homepage too (20), and the `card` shadow at rest off the
  field (21);
- `/health-services` with rows, not cards (16), and "เปิดแผนที่" in a row when the Health Service has
  coordinates, named with the Health Service, as a Document row's download (12);
- `/health/reports` with a row whose tile holds the fiscal year, never dating a report by its
  publication, and no download (1, 17);
- the three pages with the Post page's header on the field and one card over its lower edge,
  holding first what a citizen came for: the report's file, the Service's provider, the Health
  Service's location (8 to 11); a Health Service's Services as the catalog's cards and a Service's
  Health Services as the directory's rows (18);
- the Homepage's H2 "หน่วยบริการสุขภาพในอำเภอสอง" as it is, and no new term in `GLOSSARY.md` (14).

**What the Product Owner decided while the tickets were built,** each on its ticket:

- a `/health` tile's label an H2 there only, the Homepage's tiles with no heading (#339 comment
  6941979791); the tiles ending on the field's edge from 640 px, the links under `/services`' lead
  keeping their colour under the pointer and showing at once, and no balanced wrapping on a tile's
  H2 (#339 comment 6943764346);
- the Service cards' short last lines as built, and the Homepage's Service card's focus ring as
  Feature 008 accepted it, its reading recorded (#340 comment 6947302659);
- a directory row's "เปิดแผนที่" semibold with a 20 px `map-pin`, and its facts line with
  `MetaLine`'s "•" (#341 comment 6966593423); the name underlined on its own link only, and a row
  without coordinates whose text runs on into the map's place from 1,024 px (#341 comment
  6967772153);
- a Health Report row's title turning at once under the pointer, the banded ring alone under the
  keyboard's focus, and a facts line's dot at a line's end left to #353, outside the feature (#342
  comment 6971829798);
- the report Document's title link a text line high (#343 comment 6975126191);
- a Service's offering Health Services by name, as before, and one outlined pill per Service
  Category (#344 comment 6979384685); "ไปยังเว็บไซต์ของบริการ"'s arrow on a line of its own at 375 and
  320 px (#344 comment 6981324830);
- an inactive Health Service still listing its Services, its official name under the H1 with no
  label, and four shared or earlier details as they are (#345 comment 6995945811).

The prototype's variants, on the branch `prototype/health-reports-services-health-services` at
`a6a5c14` (the picks at `fd82f59`, then decisions 20 and 21), are the visual reference (`docs/prototypes/health-reports-services-health-services.md`
there). Each ticket's decisions are on #339 to #345 and in §13. The evidence round of #346
(`docs/evidence/346-health-reports-services-health-services-evidence-round.md`) measures the pages
and names what the evidence does not cover, which the Product Owner accepted after the walkthrough
(#346 comment 6997998925). The Product Owner accepted the feature on #338 (comment 6999055380).

**What the Product Owner picked for the About pages, the Contact page and a Basic Page** on the
Feature 012 prototype, after the Homepage and Features 009 to 011's pages as they are built, the
grill's fifteen questions each answered "ตามที่แนะนำ" and the prototype's four picks each the
recommended option, on 2026-11-19 (spec #365 "Decisions the Product Owner made", whose numbers
these are; #365 comment 7000119315):

- the scope: the nine routes, look only; every read, order, page size, canonical address, head
  tag, preview, 404, the 301s of `/pages/about` and `/pages/organization`, `/about` without its
  Basic Page, the breadcrumbs and the empty states' words as they are; no new field, address or
  section; the model and the Admin as they are (1); the prototype's content and the seams under
  spec #365 "Testing Decisions" (6);
- a Basic Page, on `/pages/{slug}`, `/about/organization` and `/about`, with the Post page's
  header on the field, no pill, tile or frame, its body in the 48 rem text column, and `/about`
  without its page under the H1 "เกี่ยวกับเรา" with no lead (2);
- every Basic Page's related Documents as Feature 010's section with their downloads, the old
  heading, rows and the option between them gone (3);
- the list pages and `/contact` headed as the other lists, each with its label, H1 and icon, and
  no pill link or links under the lead (4); the About Document pages with the Document
  repository's rows over the field's edge and no filter form, `DocumentRow` gone (5);
- the motion of Features 009 to 011's pages, with no new effect (7); a plain grid at every count,
  and no channels section without a channel (8); a list's empty state over the field's edge,
  `/contact` with nothing set ending its field under the lead, and a Basic Page with neither body
  nor related Documents ending with its field (9);
- `/about` with its six sub-pages as `/health`'s tiles over the field's edge, each label an H2,
  then its body and related Documents (10, P1 A);
- Leadership with the first leader in a featured card across the row and the others in white
  cards (11, P2 C), and Personnel with a white panel per unit, its people as compact rows with
  "ช่องทางติดต่อ" over their public contact (12, P3 A), both with the Leadership strip's ringed
  circle;
- `/contact` with Office Contact's details in a white card over the field's edge, a row per detail
  with its icon, and the channels under `share-2` and the label "ติดต่อ" (13, P4 A);
- no new term in `GLOSSARY.md` and no ADR.

**What the Product Owner decided while the tickets were built,** each on its ticket:

- an About Document row's facts line opening with the Document Type, its title clamped at two
  lines on a phone, and the type's empty state without a link onward or a year filter (#366
  comment 7003590828);
- a leader's name and position wrapping at a word boundary in the card's text column, the featured
  leader's picture loading lazily, and the second of two leaders alone in its row (#367 comment
  7006867147);
- a long unit name beside its tile below 640 px (#370 comment 7010716854, below);
- a Basic Page's body that opens with a heading starting lower than 32 / 40 px under the field,
  left to #380; `PostHeader`'s summary wrapping an unbroken run of characters anywhere, on every
  Post page; and the gate's taste notes as built: the related Documents' H2 larger than the body's
  headings, two related Documents alike at 320 px under the row's two-line clamp, the H1 without
  balanced wrapping (#368 comment 7028435491);
- the Quick Access tile's outline under forced colours left to #383, on `/about` as on the Homepage
  and `/health` (#371 comment 7031308188);
- `/contact`'s route buttons semibold with the 16 px `arrow-right`, and a telephone number that is
  not one number shown as plain text at H3 size, semibold, in `text-primary` (#369 comment
  7034812318); the route cards'
  and the filled pill's outlines under forced colours left to #383, and the gate's design
  suggestions as built (#369 comment 7037025716).

The prototype's variants, on the branch `prototype/about-contact-pages` at `e666f30` (the picks
recorded over `d69caed`), are the visual reference (`docs/prototypes/about-contact-pages.md`
there). Each ticket's decisions are on #366 to #371 and in §13. The evidence round of #372
(`docs/evidence/372-about-contact-basic-page-evidence-round.md`) measures the pages and names what
the evidence does not cover, which the Product Owner accepted after the walkthrough (#372 comment
7043481056). The Product Owner accepted the feature on #365 (comment 7060805067).

**What the Product Owner picked** on the Feature 006 prototype, with the legacy site's real
content (spec #144 Further Notes). The picks for posts, cards and titles stand; on the Homepage,
Feature 008's picks above take the place of the smaller Featured title and the shorter phone page:

- the current design over three new variants: "ฉันคิดว่าแบบเดิมที่เราทำมันยังดีกว่าที่คุณเสนอมาอีกนะ";
- the Featured picture whole and a smaller Featured title, titles that keep Thai words whole, and
  a shorter phone Homepage ("โอเค เฉพาะหน้าแรก");
- cards that keep the centre crop ("คงครอปกลางภาพแบบเดิม (แนะนำ)");
- posts in two columns ("สองคอลัมน์"), with a picture that stays in view ("ลอยตาม (แนะนำ)");
- an Activity's photos as folding thumbnails ("รูปย่อ + พับส่วนเกิน (แนะนำ)").

The prototype's variant 4, "ปัจจุบัน + แก้จุด", on the branch `prototype/design`, is the visual
reference (`docs/prototypes/design-variants.md` there). Each ticket's decisions are on #145 to
#149, and its screenshots are in its pull request. The Product Owner accepts the design with
Feature 006, after walking through the Homepage on a phone and a desktop, a News post, an Activity
with many photos and a Health Content post (spec #144 "Evidence, not gates").

**Known limits**, each kept by the Product Owner:

- **Thai titles** (#145 comment 6625100804):
  - the list is curated, so a compound it does not name can still break, and a new word needs a
    code change;
  - summaries still break inside words, such as "ออกกำลัง / กาย";
  - a configured header title can occupy multiple lines; its space and type follow §7.4;
  - `--header-offset` is a fixed 88 or 84 px (§3.1), so under a header made taller than that by a
    long configured title or a tagline below 640 px, what focus scrolls to can sit partly under the
    header (Product Owner, #240 comment 6788678539).
- **A compact Quick Link card's height** grows with its label (§7.3), the taller proportions
  accepted with Quick Access B (#190 comment 6707205912).
- **The Homepage's height** moves with the titles and the number of items (§8.2).
- **The Homepage's motion** (#249 comment 6838503280):
  - a section's reveal runs only in a browser with scroll-driven animation; elsewhere the page
    shows whole from the start (§8.12);
  - a loading picture's shimmer runs on the page's clock, so a picture that loads later has the
    resting box behind it.
- **Post pages** (#147 comment 6634124888 item 2):
  - the frame follows only while the text is the longer;
  - a frame taller than the window shows its lower part as the block ends;
  - from 1,024 px the frame is level with the row of pills only while the breadcrumb takes one
    line; a breadcrumb that wraps moves the row down 24 px (#285 comment 6878495201, item 1).
- **The News lists** (spec #280, decision 11): a full first page of twelve that no Health Topic
  narrows, at two columns from 640 px to 1,023 px, ends with one card alone, after the large card across the row (§7.3).
- **The Activities list** (#313 comment 6905240669): below 640 px a small card's place takes one
  line, so its ellipsis can cut the end of a place name that tells two places apart; an Activity's
  page shows the place whole. With one Activity or four, the large card's layouts are `/news`'s: a
  long band alone, or one small card alone under the large one (§7.3).
- **A list card's focus ring at 1,024 px:** on `/activities` and `/news` 24 px of the second card's
  ring are not in its colour, at 2.97:1 at the lowest (`scripts/measure-focus-contrast.ts` at
  `bf70e05` and `47fc28a`; §7.3; #313 comment 6903865541), which #322
  takes up outside Feature 010.
- **A Document's download** takes two lines below 640 px when its words do not fit one, on
  `/documents` and on a Document's page, its type and size kept whole (§7.3, §9.5; #317 comment
  6918054121).
- **The header on the field** of a Post page, an Announcement's, a Document's, a Health Report's,
  a Service's and a Health Service's page and a Basic Page can end its H1 with one word on its
  last line (`PostHeader`; #318 comment 6935876072, item 3; for Feature 011's three pages, #346
  comment 6997998925, item 3; for a Basic Page, #368 comment 7028435491, item 3).
- **"ติดต่อเรา" in the unavailable notice** on a Document's page is a link about 22 px high inside
  its sentence, as it was before Feature 010 (read on #317's page: the note from #317, #318 comment
  6919234068; the same comment), and so is it on a Health Report's page, which shows the same
  notice since Feature 011 #343 (52 × 22 px at the five widths, measured at `9f31dc0` with `scripts/capture-with-fixtures.ts`'s close-up on the report pages of `scripts/screenshot-fixtures/lists-by-count.ts`, `docs/evidence/346-health-reports-services-health-services-evidence-round.md`; #346 comment 6997998925, item 3).
- **A Service card's focus ring on the Homepage:** beside the ring 2 to 3 % of its neighbours read
  under 3:1 at its rounded corners over the field; on the card it lies on it reads 5.51:1 or more,
  as Feature 008 accepted it (#242 comment 6797113372, item 2; #340 comment 6947302659, item 3).
- **"ไปยังเว็บไซต์ของบริการ"** in a Service's card takes its ↗ on a line of its own at 375 and
  320 px, the link as before in a narrower box (§9.7; #344 comment 6981324830).
- **A facts line** (`MetaLine`) that wraps can end a line with its dot, on the Health Service and
  Health Report rows as on the Document row; #353 takes it up outside Feature 011 (#342 comment
  6971829798, item 4).
- **A Health Service's page** (#345 comment 6995945811, item 3): the Service card's `transition`
  also animates its colour and shadow, and `DetailItem`'s term sits about 3 px above its value
  from 640 px, both shared and as before.
- **A unit's name on `/about/personnel`** below 640 px sits beside its 40 px tile in 196 px at
  320 px, so a long name takes three lines and Thai breaks it inside a compound ("สุข|ภาพ",
  "ผู้|บริโภค"); nothing overflows (§7.3; #370 comment 7010716854). A leader's or a person's name
  and position wrap at a word boundary in their text column (#367 comment 7006867147, item 1).
- **A rich-text body that opens with a heading** starts 64 px under the field below 1,024 px and
  72 px from 1,024 px on a Basic Page, and 80 px under the tiles on `/about`, in place of 32 / 40
  and 48 px, from the heading's own top margin, as on a News or Health Content post; #380 takes it
  up outside Feature 012 (#368 comment 7028435491, item 1; the note from #371).
- **Under forced colours** (Windows High Contrast) the Quick Access tile on the Homepage, `/health`
  and `/about`, and `/contact`'s route cards and its filled "ดูบริการประชาชน" pill lose their
  outlines, while their labels and arrows stay links; #383 takes them up outside Feature 012 (#371
  comment 7031308188; #369 comment 7037025716, C1).
- **A gallery in a News body** does not fold, and EmDash's Edit mode shows it as a placeholder
  (§9.3).
- **A focal point or alt text** set in the media library after staff picked a picture may not
  reach it until they pick the picture again (`05` §5.1).

## 11. Accessibility and QA

- Semantic landmarks (`header`, `nav`, `main`, `footer`), a heading hierarchy, and a logical
  reading and tab order.
- Every link and button shows its focus: a 3 px `brand-primary` ring, `accent-warm` on dark
  surfaces. No keyboard trap.
- Pages work without client JavaScript. The mobile menu, the MOIT page's Requirements and an
  Activity's folded photos are native disclosures that name their state. The one script, the
  Homepage's submit state, adds to forms that submit without it (§8.9).
- Touch targets of about 44×44 CSS px, with room between them. On the Homepage every link and control
  in view is 24 px high or more (spec #239 "Accessibility"; read on the runtime at `94b8621` at 1,440,
  1,024, 768, 375 and 320 px, `docs/evidence/250-homepage-redesign-evidence-round.md`), and the
  header's search link and menu button are 48 px and the open menu's rows 56 px (§7.4).
- Contrast: WCAG 2.2 AA (§3.2).
- An informative image has alt text, a decorative one empty alt. A card's or the Featured picture
  is decorative, as its title names the link. An icon-only button has a name, and the search input
  a label.
- No autoplay of media or of a carousel, and no motion that carries meaning. Nothing moves by
  itself for longer than five seconds, and the Homepage's motion stops with the visitor's
  reduced-motion setting (§8.12).
- The public suites check each template at 1,440 and 320 px with axe (WCAG 2.2 AA tags), focus on
  every stop and no sideways scrolling at 320 px, and at 375 px where a spec names it
  (CODING_STANDARDS "Tests"). There are no pixel tests: the look is the Product Owner's review of
  each pull request's screenshots at 1,440, 375 and 320 px, and for the Homepage, the shell and
  Feature 009's to Feature 012's pages at 1,024 and 768 px too (§6).

## 12. Developer and agent handoff rules

- Before a public UI ticket, read the current `00`–`10`, the spec or ticket, `CLAUDE.md`, this
  document and `src/styles/global.css`. No Figma read is needed.
- Build with Astro SSR and Tailwind CSS v4. EmDash owns content and the Admin. A React island needs
  a demonstrated interactive need.
- Reuse canonical CMS data and routes: no second Homepage database, copied content, page builder
  or mobile-only data.
- Add no UI dependency, CSS framework, private asset, animation engine or new architecture
  silently, and verify a version-specific integration before proposing one.
- Never claim browser or accessibility QA from reading code or pictures: verify the rendered pages
  on the development runtime.
- The Product Owner approves a design change that affects content hierarchy, route scope,
  institutional identity or technical direction, and the change updates this document with the
  code (§1).
- Before amending this document, read `CODING_STANDARDS.md` "Documents": its Citers, History,
  Facts and Amendments rules say what the body, a decision banner and §13's change history each
  hold (#194 retro).

## 13. References and change history

- Product/behavior: `docs/website-modernization-docs/current/04-homepage.md` (v2.7, 2026-11-13);
  `03-sitemap.md` (v2.7, 2026-11-13); staff guidance in `05` §5.1.
- Architecture: `docs/website-modernization-docs/current/10-system-blueprint.md` (v2.9,
  2026-11-09); `README.md`; `CLAUDE.md`.
- Decisions: ADR 0001 (Tailwind CSS v4), ADR 0003 (CMS images in production), ADR 0007 (the
  design's source).
- Feature 006: spec #144 and tickets #145 to #151.
- Feature 009: spec #280 and tickets #281 to #287.
- Feature 010: spec #311 and tickets #312 to #318.
- Feature 011: spec #338 and tickets #339 to #346.
- Feature 012: spec #365 and tickets #366 to #372.
- Figma, as history: [Songhealth — Homepage Concept v1](https://www.figma.com/design/Lxdfd1dBgNNO28Rx62zGYO),
  described in `docs/design/homepage-concept-v1.md`.
- Tailwind official: [Astro installation](https://tailwindcss.com/docs/installation/framework-guides/astro),
  [Theme variables](https://tailwindcss.com/docs/theme),
  [State variants](https://tailwindcss.com/docs/hover-focus-and-other-states).
- **v0.1 draft (2026-10-30):** Tailwind-v4-only public styling, the Lucide/no-emoji policy, a token
  proposal from Figma, V1 scope reconciliation, responsive and QA gates.
- **v0.1 clarification (Product Owner):** ITA and Dashboard were deferred from V1, not removed;
  Feature 004 brought ITA into V1.
- **v0.2 recheck (2026-10-30):** the V1/Future State separation, the Tailwind v4 token namespaces
  checked upstream, and the contrast failures of the proposed palette.
- **v0.2 updates:** the icon sizes the Product Owner decided on #105 (2026-10-31); ITA in V1 and
  its page patterns (2026-11-03, Feature 004 #127).
- **v1.0 (2026-11-05, Feature 006 #150):** the design's source is the code with this document (ADR
  0007). It records the tokens and contrast as the code holds them, the Thai keep-together rule, the
  breakpoints, the card crops, the Featured rules, the phone Homepage with its measured heights,
  the post layout, an Activity's photos, a News body's gallery and the known limits. §10's Figma
  cleanup checklist, written for a file that is no longer edited, gave way to the accepted design.
  Before the phone Homepage, at `b52ff09` with the demo dataset of the time, the Homepage measured
  5,864, 9,326 and 9,817 px at 1,440, 375 and 320 px (#146's pull request), and an Activity page
  with twenty photos 7,054 px at 375 px (#148's pull request).

- **v1.1 (2026-11-07, Feature 007 #191):** compact phone/tablet Header B, its icon-only native
  menu, utility targets, unchanged title sizes and setting-dependent title wrapping (§4.1, §7.4,
  §10). Authority: #190 comment 6707205912. Earlier v1.0 citations record Feature 006's adoption;
  current header behavior is §7.4.
- **v1.1 breadcrumb refinement (2026-11-08, Feature 007 #192):** the phone current label's
  single line and ellipsis, with full underlying text, H1 and ancestor hierarchy (§7.5), following
  #190 comment 6707205912. Sitemap §14 and its version citations reflect the same rule.

- **v1.1 shared-card refinement (2026-11-08, Feature 007 #193):** title-named whole-card
  links, the 2 px green hover edge and title underline, and whole-card keyboard focus (§7.3),
  following #190 comment 6707205912. Crops, fallbacks, compact spacing/summary rules and the
  Homepage's four/three Activities across 1024 px remain.
- **v1.1 Quick Access refinement (2026-11-09, Feature 007 #194):** the compact Quick Link card's
  label across the top and arrow on a lower-right row of its own, with the accepted taller cards
  (§7.3): one line of label makes a card 84 px tall where it was 56 px. This replaces the crowding
  limit §10 held from #146 comment 6626919820 item 1, where a label holding a listed word wider
  than the 80 px beside its arrow ran into the arrow below about 342 to 374 px. It follows #190
  comment 6707205912, and `04` §15 records the same rule. From 640 px, and the full cards on
  `/about`, `/health` and `/ita`, remain.
- **v1.1 Thai-title word (2026-11-09, Feature 007 #195):** "ร้องเรียน" joins §4.1's list, which
  had held spec #144's 26 words, following #190 comment 6707205912 (Q22). Matching, characters and
  where the rule applies remain.
- **v1.1 pagination refinement (2026-11-09, Feature 007 #196):** below 640 px the page number's
  centered row above Previous-left and Next-right, in content-sized columns (§7.6), following #190
  comment 6707205912, Pagination B. Below 640 px the pager had been one row where it fit, wrapping
  otherwise; the phone height tradeoff is in #196's pull request. Which links show, their query
  handling and the layout from 640 px remain.
- **v1.1 filter form clear action (2026-11-10, Feature 007 #197):** "ล้างตัวกรอง" as the outlined soft
  secondary pill beside the solid primary (§7.7), following #190 comment 6707205912, FilterForm B.
  It had been an underlined text link. When it shows, where it goes, the GET query and the form's
  wrapping remain.
- **v1.1 Post page empty row (2026-11-10, Feature 007 #198):** a News or Health Content post with
  no body, source or topics leaves out its trailing row and the 2 rem gap before it (§9.1),
  following #190 comment 6707205912, Empty Post page row B. This replaces the limit §10 held from
  #147 comment 6634124888 item 4, where such a post kept an empty row and its gap: 32 px after its
  last part at 320 px, and at 1440 px where the header was taller than the picture, which #198's
  `tests/browser/public-posts.spec.ts` measured on the runtime at `33ecdf0` (#198's pull request).
  The two columns from 1024 px, the 28 rem picture column, the whole picture, "เปิดภาพขนาดเต็ม", the
  sticky picture and an Activity's photos remain.

- **v1.2 (2026-11-11, Feature 008 #240):** the new shell on every page (§7.4): one sticky header
  row with a round search link, a pill for the current item, text that scales from 1,024 px, a
  48 px menu button and full-width menu rows, the skip link under the header, and the `brand-dark`
  footer with the channels as pills. The utility bar, its office label and the header's "ติดต่อเรา"
  are gone. §3.1 gains five colours, the `header` shadow and `--header-offset`; §3.2 the pairs on
  the header's translucent surface. Authority: spec #239 and #239 comments 6786536858 and
  6786631899. The header had been Feature 007's Header B: a `brand-dark` utility bar over a white
  row, a 44 px menu pill, and a 24 px title from 1,024 px. Sticky boxes on other pages moved down by
  the header's height; nothing else on those pages changed.
- **v1.2 Homepage hero and section heading (2026-11-11, Feature 008 #241):** the hero on the deep
  green field (§8.1): the office summary as the headline, the site search, and the Featured item
  as a tilted white card with its whole picture, "เรื่องเด่น" with its date, and its title. It
  replaces the `brand-dark` Featured hero with the item's title at H1 size, its lead and two
  buttons, the band with the site title and tagline that stood in for it, and the Homepage's Search
  section. The Homepage section heading (§8) replaces the eyebrow, H2 and lead: the Frequently Used
  Services, Health Information and Activities take their lists' names and a "ทั้งหมด" link in the
  heading in place of the link under their cards. §3.1 loses `hero-visual-from` and `-to` and
  gains the `deep` and `tile` shadows and three type utilities. Authority: spec #239 "Hero and
  Featured", "Section headings" and "Tokens", and #241 comment 6791096480 (arrow-right on the Homepage, the
  card beside the headline from 640 px, the larger headline's sizes, the heading on every section).
  Which item is Featured, its address, and what each
  section lists remain.
- **v1.2 Homepage Services (2026-11-11, Feature 008 #242):** the Frequently Used Services as white
  cards on the hero's deep field (§8.4): three, two and one to a row, four as two to a row, the
  grid's lower part below the field from 640 px, and a card that turns `brand-primary` under the
  pointer. They replace the shared Service card on a white section, two to a row below 640 px in
  its compact form, which §7.3 and §8.2 no longer list; the Service catalog's card is unchanged.
  The section heading's label is `surface-base` on the deep field. Authority: spec #239
  "Frequently Used Services", the notes on #242, and #242 comment 6797113372 (the white label, the
  focus ring inside the card, a card of 144 px or more). Which Services show, their order and their
  addresses remain.
- **v1.2 Homepage Leadership strip (2026-11-11, Feature 008 #243):** a new Homepage section after
  the Frequently Used Services (§8, §8.5): the first three Leadership in one white strip with a
  compact heading, the first person ringed in `accent-warm`, one row from 1,024 px, the first
  person across the row from 640 px and everyone stacked below. `04` v2.7 lists the section (§3,
  §6.1). Authority: spec #239 "Leadership strip", the note on #243 (comment 6798581211) and #243 comment
  6809325869 (the compact heading, the ring alone). The
  Leadership page and its order remain.
- **v1.2 Homepage Latest News (2026-11-12, Feature 008 #244):** Latest News is a section of its own
  (§8, §8.6): the five newest News after the Featured item, the newest as a large picture card
  with its date and title over a gradient, then four small cards, compact rows below 640 px; the
  `deep-visual` for a large card without a picture. The Current Announcements become the next
  section under their own heading, their rows unchanged until #245. Authority: spec #239 "Latest
  News", the notes on #244 (comments 6791841635 and 6809555807) and #244 comment 6809892992 (the
  date on the large card, the deep green visual, the 4:3 picture in a compact row, the
  Announcements' section) and comment 6810203896 (a tile with a 24 px icon on a visual). Which News show, their order and their addresses remain.
- **v1.2 Homepage Current Announcements (2026-11-12, Feature 008 #245):** the Current Announcements
  are four dated rows in a `surface-soft` band (§8, §8.7): a date tile, the category badge in its
  own colour, the title, the status line after a dot and an arrow, beside a heading with its lead
  and a solid link that stay in view from 1,024 px. `SectionListLink` holds a section's link to its
  list. Authority: spec #239 "Current Announcements", the notes on #245 and #245 comment
  6812117246 (the band and its glow, the solid link). Which Announcements show, their order and
  their addresses remain; four show where three did.
- **v1.2 Homepage Health Information and Health Service Discovery (2026-11-12, Feature 008
  #246):** Health Information shows a row of Health Topic chips, each a link to the Health Content
  list narrowed to its topic, and its own cards with a picture and the topic as a badge, compact
  rows below 640 px (§8.8). Health Service Discovery is a rounded green band with the directory's
  counts and form (§8.9), and the Homepage's two forms show a spinner after submit, the site's one
  script (§8.9, §11). Authority: spec #239 "Health Information", "Health Service Discovery" and
  "Motion and loading", the notes on #246 and #246 comment 6816725778 (the heading with its icon
  tile, "พื้นที่", both forms). Which Health Content shows, the form's parameters and each
  address remain.
- **v1.2 Homepage Activities, Quick Access and Contact Summary (2026-11-12, Feature 008 #247):**
  the Activities are the latest five at every width, as picture tiles with the date and the title
  over a gradient, one large beside four small (§8.10). The Contact Summary is one green card
  under "ติดต่อสำนักงาน" with the telephone large, without the map stand-in and the office
  summary, and Quick Access has the Homepage's card surface and hides with the demo dataset's
  empty menu (§8.11). One function decides the space between sections (§8). The `telephone` size
  joins the tokens, and `contact-visual-from` and `-to` leave them (§3.1). `04` v2.7 now states the
  five Activities and the Contact Summary without a stand-in (§10, §11, §15). Authority: spec #239
  "Activities", "Quick Access" and "Contact Summary", the notes on #247 and #247 comments
  6820010972, 6820125241 and 6820174924. Which Activities show, their order, Office Contact's
  source and each address remain.
- **v1.2 Service icons (2026-11-12, Feature 008 #248):** a Service card shows the icon staff chose
  for the Service from a fixed set of 18, each offered by a Thai name for its picture, on the
  Homepage and in the Service catalog; without a choice it shows `hand-heart`, which until now
  every Service card showed (§5, §8.4). Authority: spec #239 "Frequently Used Services", #239
  comment 6786631899 (the field goes ahead), the note on #248 and #248 comment 6826430670 (the set
  and its names). The cards' layout, colours and link remain.
- **v1.2 Homepage motion (2026-11-12, Feature 008 #249):** the hero's parts enter one after
  another as the page opens, each section's parts reveal as they come into the window where the
  browser has scroll-driven animation, and a loading picture's box shimmers for under five
  seconds; the decorations stand still, and with reduced motion preferred, and on paper, the
  page stands still and whole (§8.12). Authority: spec #239 "Motion and loading", #239 comment
  6786631899 (the prototype's motion), the notes on #249 and #249 comment 6838503280 (no
  decoration that moves without end, which pictures shimmer, the suites' reduced motion). The page's content, layout and heights remain.
- **v1.2 direction, measures and limits (2026-11-13, Feature 008 #250):** §2 states the redesign's
  direction and its sources. It had read "Modern Local Health Civic", with "Evolve Concept v1; add
  no new style", after the Product Owner's "เราควรต่อยอดจาก Concept v1 ไม่ใช่การสร้างรูปแบบใหม่แบบนี้"
  (spec #144), and "Neutral surfaces first; health green is a meaningful accent, not an all-green
  interface". §4 names the sizes beyond the scale, §6 what each breakpoint changes on the Homepage
  and the two further widths it is measured at, and §10 what the Product Owner picked for Feature
  008 and the motion's limits. §8.2's heights are measured at the integration head `94b8621` and
  equal #247's at `1faa861`; the phone Homepage the Product Owner had accepted for Feature 006 was
  5,771 px at 375 px with that prototype's data (spec #144). The Feature 008 banner names the
  tickets. `04` v2.7 and `03` v2.7 now place "ค้นหา" in the header and "ติดต่อเรา" in the footer
  (`04` §4, `03` §2). Authority: spec #239 "Documents" and "Decisions the Product Owner made",
  #239 comments 6786536858 and 6786631899, and the notes on #250. No page changed.

- **v1.3 list heading on the deep field (2026-11-13, Feature 009 #281):** `/news` opens on the deep
  green field (§7.8): its breadcrumb in white, the label "ข่าวสาร", the H1 "ข่าวประชาสัมพันธ์" in the
  section title's type, its lead, and a white pill link "ข่าวสุขภาพ"; its cards, empty states and
  pager start over the field's lower edge, and the heading rises in as the page opens (§8.12). It
  replaces the page heading on the page's colour, with the H1 "ข่าวสาร" and the text link
  "ดูเฉพาะข่าวสุขภาพ", under the shell's breadcrumb. `DeepField` takes the place of
  `HomeDeepField` and serves both fields, and §2, §3, §3.2, §5, §6, §7.1 and §7.5 name the list
  heading. Authority: spec #280 "The field under a heading", "List heading" and "Motion", and #281
  comment 6846855734 (the link at the heading's upper right from 640 px, as the prototype has it)
  and comment 6847783611 (a card's ring over the field waits for the cards; no `surface-soft` glow).
  What the page lists, its order, its cards, its empty states' messages, its pager, its head and
  its addresses remain, and so does every other page.
- **v1.3 list heading on Health News and Health Content (2026-11-13, Feature 009 #282):** Health
  News and the Health Content list open on the deep field as `/news` does (§7.8), under the labels
  "ข่าวสาร" and "สุขภาพ", each with the `heart-pulse` icon and no link, and their filter form is the
  first block over the field's lower edge, before the cards or the empty state and the pager (§7.7).
  They replace `PageHeading` on the page's colour under the shell's breadcrumb. Their H1s, leads,
  heads, forms, cards, empty states' messages, pagers and addresses remain. §2, §3.2, §4, §7.7, §7.8,
  §8.12 and §10 name the two lists. Authority: spec #280 "List heading" and "What follows a list's
  heading".
- **v1.3 the lists' card (2026-11-13, Feature 009 #283):** the cards of `/news`, Health News and
  Health Content are the Homepage's small News card (§7.3): a 16:9 picture from 640 px and a row
  with a 120 px picture at 4:3 below, the date with a dot and the label on one line from 640 px
  and the label under the date below, the title in
  three lines at most and from 640 px the summary in two, the list's icon on a missing picture's
  visual, the Homepage's hover in place of #193's ring and green underlined title, a reveal and a
  shimmer (§8.12), and a focus ring with a white band, `focus-ring-banded` (§3). `ContentCard`
  takes `HomeNewsCard`'s place on the Homepage, with `kind="home"`, and the Homepage's cards show
  as before. The crop was 16:10, the label came before the date, the summary showed three lines at
  every width and the visual was a plain `surface-soft` box. What each list reads, its order, its
  page size, its whole-card link and its addresses remain. Authority: spec #280 "The cards",
  "Motion" and decisions 4, 10 and 15, #283 comment 6854670042 (the ring's band) and #283 comment
  6855983271 (the label under the date below 640 px).
- **v1.3 the lists' large card (2026-11-14, Feature 009 #284):** on a first page of `/news`, Health
  News or Health Content that no Health Topic narrows, the newest item is the Homepage's large
  card (§7.3), with its label in an outlined pill filled `brand-dark` at 40 % beside the date and
  from 640 px its summary,
  laid out by the number of items: across the row with one, two columns wide with two, and two
  columns wide and two rows high beside the next two with three or more, from 1,024 px. The first
  page had shown the small cards alone. A later page, a narrowed list, what each list reads, its
  order and its page size remain. `ContentCard`'s pictures, on the lists and in Latest News,
  take no placeholder, so they crop around a focal point, which EmDash's placeholder had dropped
  (the other cards: #298). Authority: spec #280 "The cards", "The first page" and decisions 2 and
  11, #283 comment 6854670042 (the ring's band), #284 comment 6870867641 (the pill's fill, the
  placeholder).
- **v1.3 a post's Health Topics and an Activity's photos (2026-11-14, Feature 009 #286):** a News
  or Health Content post's Health Topics are the Homepage's chips (`TopicChip`, shared with Health
  Information) at 44 px high, in place of `surface-soft` pills with `brand-dark` words underlined
  under the pointer; an Activity's photos open under the Homepage's section heading, the
  gradient tile with `images`, the label "กิจกรรม" and the H2 "ภาพกิจกรรม" in `section-title`,
  48 px under the columns and 64 px from 640 px, in place of an H3-size heading 2 rem under them
  (§9.1, §9.2). Where the chips link, the photos' fold and every word remain. Authority: spec #280
  "Post page: the text" and decisions 8 and 9, #286 comment 6876267675 (the chip's sizes, the
  heading's space above the photos).
- **v1.3 the Post page on the deep field (2026-11-14, Feature 009 #285):** a News, Activity or
  Health Content post opens on the deep field (`DeepField` with `kind="post"`): its breadcrumb in
  white, a row of "เผยแพร่" and the date in an `accent-warm` pill beside a News item's category in an
  outlined pill, the title, the summary and Health Content's review date in `surface-base`; its
  picture is in a white frame that starts on the field and stays in view from 1,024 px, and over
  the field's lower edge below; its text lies on the page's colour, 32 px under the field below
  1,024 px and 40 px from it, or 32 px under the frame below 1,024 px; the header rises in and the
  frame after it (§9.1, §8.12). The date and the category came after and before the title in
  secondary text on the page's colour, the shell showed the breadcrumb, the picture had no frame,
  and below 1,024 px an Activity's details card came before the picture. The two columns, the
  frame in view while the text scrolls, "เปิดภาพขนาดเต็ม" at every width, no empty row after a post
  without text and every word remain. Authority: spec #280 "Post page: the header", "Post page: the
  picture", "Post page: the text", "Motion" and decisions 6, 7 and 16, #285 comment 6877659654 (the
  details card after the frame, the text under the frame).
- **v1.3 documents, measures and limits (2026-11-15, Feature 009 #287):** the Status line and the
  Feature 009 banner name every ticket and the acceptance due on #280. §2 names the lists and the
  Post page as built, where it had said "so far" and that every other page kept the design of §7
  and §9; §4 says that the publication date and the category lead the title on the News cards and a Post
  page, where it had them below the title; §6 says what each breakpoint changes on the lists and the
  Post page; §7.1 names `ContentCardGrid` and `DeepField`; §3.1 names the Post page's pills and
  the breadcrumb's separators on the field. §3.2, §7.3, §7.8, §9.1 and §9.2 hold the heights and
  the contrast read at the integration head `fb11b3e`, where they had held each ticket's own
  commit: §7.8's at `3fe6f6b` and `fcbba51`, the card's ring at `5fb6b4a`, the large card's text
  and ring at `f4ba6fb`, whose readings the new ones equal, and §9.2's Activity with twenty photos,
  2,263 px at 375 px at #286's head and 2,259 px now. §3.2 gains a row for the Post page's field
  and the large card without a picture. §9.2 says that a focal point does not reach an Activity's
  photos, where it had said the crop went around one (§7.3; #284 comment 6870867641, item 2; #298). §10 lists what the Product Owner picked for Feature 009,
  with each decision's source, and two kept limits. Authority: spec #280 "Documents" and
  "Decisions the Product Owner made", the decisions on #281 to #286, and the notes on #287. No page
  changed.
- **v1.3 a focal point on every cropped picture (2026-11-15, #298):** every picture a public page
  crops keeps its focal point in view: an Activity's card, its photos and its Homepage tile, a
  Health Content card on the Homepage and a person's portrait in the Leadership strip and on a
  personnel card, as the News cards and the lists' large card already did. Those six had cropped
  on the picture's middle, or a portrait's top, whatever the focal point, because EmDash's
  placeholder dropped it; they now take no placeholder. Without a focal point each crops as
  before, a portrait from its top (§7.3, §8.5, §8.6, §8.8, §8.10, §9.2). No box, size or layout
  changed, and nothing a page showed is gone: the placeholder never showed
  (`docs/agents/emdash-1.1.0.md` "Media"). `05` §5.1 tells staff how a person's picture crops
  (v2.10). Authority: #298 comment 6892189972, decision 1 (no placeholder in our code, no
  dependency upgrade) and decision 2 (a portrait follows its focal point), and #298 comment 6893006429
  (the sentence for staff in `05`).
- **v1.4 documents, measures and limits (2026-11-17, Feature 010 #318):** the Status line names
  the acceptance due on #311. §10 lists what the Product Owner picked for Feature 010 and decided
  on #312 to #317, with each decision's source, and six kept limits in five bullets: a place name's ellipsis on
  a small Activity card, the large card's layouts at one and four items, the second list card's
  ring at 1,024 px (#322), a download on two lines, the H1's lone last word on the field and the
  22 px "ติดต่อเรา" link. §6 and §11 name Feature 010's pages among those measured and captured at
  1,024 and 768 px, and §3.1's `divider` row says that the rule in a Document's card is
  `border-default` (§9.5). The readings in §3.2, §7.3, §7.8, §8.7, §9.4 and §9.5, each taken at its
  ticket's commit, were read again at the integration head `47fc28a` and are the same, but for
  §9.5's readings on two demo Documents the round did not read, a health topic's link and
  "ฉบับปัจจุบัน", and for three focus-ring readings this round read lower than their sections had them: §7.3 now
  gives the large card's 4.06:1 at 1,024 px beside the small cards' 5.09:1, and the second card's
  2.97:1 as 24 px of covered ring, where it said blended pixels; §9.4 gives the breadcrumb's second
  link 6.01:1 (`docs/evidence/318-activities-announcements-documents-evidence-round.md`). §8.12 already named
  the five pages that move. Authority: spec #311 "Documents" and "Decisions the Product Owner
  made", the decisions on #312 to #317, the notes on #318, and #318 comment 6935876072. No page
  changed.
- **v1.4 a Document's page (2026-11-16, Feature 010 #317):** a Document's page opens on the
  deep field with the Post page's header (§9.1, §9.5): its type in the outlined white pill and a
  superseded or expired status in the `accent-warm` pill above the H1, and the summary in white
  with staff's line breaks, where the title was `brand-dark` and the summary `text-secondary` on
  the page's colour. One white card over the field's edge holds first the file, the tile with the
  file's type, the H2 "ไฟล์เอกสาร" with the type and size, and the download "ดาวน์โหลดเอกสาร" in the
  Document row's pill, at the card's right from `sm` and across it below, 52 px high from `sm`,
  where the H2 and the download followed the details and the successor's note; or the H2 and the
  unavailable notice. A rule and the details follow in the card, and the successor's note after
  it. `FileTile` and `FileDownloadLink` come out of the Document row (§7.1), `PostHeader` takes
  `attention`, and the tile's `accent-warm` type joins the page (§3.1, §3.2). §2 and §8.12 name
  the page. Authority: spec #311 "An Announcement's page and a Document's page: the header", "The
  card over the field's edge", decisions 8, 9 and 15, and #311 comment 6895825492.
- **v1.4 an Announcement's page (2026-11-16, Feature 010 #316):** an Announcement's page opens on
  the deep field with the Post page's header (§9.1, §9.4): "เผยแพร่" and the publication date in
  the `accent-warm` pill and the type in the outlined white pill above the H1, where the date was a
  line under the title and the title `brand-dark` on the page's colour. Its details lie in one white
  card over the field's lower edge with the `deep` shadow, the status as the list's dotted label,
  where a closed one was `accent-warm` (§3.1, §3.2, §8.7); an Announcement with no details row has
  no card and a field as high as its header (#316 comment 6912742335). "เอกสารที่เกี่ยวข้อง" takes
  the Homepage's section heading with the label "เอกสารเผยแพร่" and the Document rows with their
  downloads, titles H3 (§7.3). `CardOverField` is new and `RelatedDocuments` takes `downloads`
  (§7.1). §2 and §8.12 name the page. Authority: spec #311 "An Announcement's page and a
  Document's page: the header", "The card over the field's edge", decisions 9, 10 and 15, and
  #311 comment 6895825492.
- **v1.4 the Document row on `/documents` (2026-11-16, Feature 010 #315):** `/documents` shows
  the Document row with its download (§7.3), `DocumentDownloadRow`, in place of the earlier row:
  the file's tile with `file-text` and the file's type, the facts line, a superseded or expired
  Document's attention label on its own line, the title as an H2 linking to its page, from `sm`
  the summary, and the download pill, or "ไฟล์ไม่พร้อมให้บริการ" without a link; the file's type
  and size no longer show as a line of text without a link. No link covers the row: the title and
  the download are its two links. The download sits beside the text from `lg` and under it below
  (§6), and the rows are 14 px apart and reveal as they come into the window (§7.8, §8.12). The
  file's type on its tile is the second measured `accent-warm` exception on a gradient tile
  (§3.1, §3.2), and the tile's `file-text` joins §5. Every other page that lists Documents keeps
  `DocumentRow` (§7.1). §2 names the row. Authority: spec #311 "The Document repository",
  decisions 2, 8, 16 and 17, #311 comment 6895825492, and #315 comment 6908747140.
- **v1.4 the Announcements list's rows (2026-11-16, Feature 010 #314):** `/announcements` shows
  the Homepage's Announcement row in place of its earlier row (§8.7): the date tile, the type's
  badge in its colour, the title as an H2 in two lines at most, the status after a dot and from
  `sm` the round arrow, one link over the row, 14 px apart, with the row's hover and its reveal;
  a closed Announcement's tile and label are `status-closed` with `text-primary`, the first time
  a page shows that token (§3.1, §3.2), and the first row's ring takes `focus-ring-banded` over
  the field (§7.8). The type and date no longer show as a line of facts above the title, and the
  closed label is no longer `accent-warm` on the list. `AnnouncementRow` is now the Homepage's
  row, shared by both pages, and `HomeAnnouncementRow` is gone. §2 and §8.12 name the list's
  rows. The Homepage's Current Announcements are unchanged. Authority: spec #311 "The
  Announcements list", decisions 7 and 13, and #311 comment 6895825492.
- **v1.4 the Activities list's cards (2026-11-16, Feature 010 #313):** `/activities` shows the
  list card in place of the Activity card (§7.3): on a first page the newest Activity large, laid
  out by the count as on `/news`, and on a later page even cards; each card's line is the date the
  list orders by, a dot and the Activity's place, the date alone without one, the line held to
  two lines from `sm` and the place to one below, and to one line in the large card's pill, each cut with an
  ellipsis, where a News label is never cut; the `heart` icon on a missing picture's visual; the
  crop 16:9 from `sm` and 4:3 below, where it was 16:9 at every width; the list card's hover, reveal
  and shimmer in place of the ring and the green underlined title (§7.3, §7.8, §8.12). The card
  no longer says "กิจกรรม" before its date. `ListCardGrid` holds the grid for both lists, and
  `ActivityCard` and the tokens `activity-visual-from` and `-to`, its fill without a picture, are
  gone (§3.1, §7.1). §2 names the Activities list's cards. An Activity's page and its photos keep
  their look. Authority: spec #311 "The Activities list", decisions 6 and 12, and #311 comment
  6895825492.
- **v1.4 the list heading on three more lists (2026-11-15, Feature 010 #312):** `/activities`,
  `/announcements` and `/documents` open on the deep field with the list heading (§7.8): the
  labels "ภาพกิจกรรม", "แจ้งให้ทราบ" and "เข้าถึงข้อมูล" and the icons `heart`, `file-text` and
  `folder-open` are new, and the H1s, the leads, the titles in the head, the menu and the
  breadcrumbs stay. What follows the heading lies over the field's edge: on `/documents` the filter
  form first (§7.7), then today's cards or rows, empty states and pager, which keep their look until
  #313 to #315; the Activity card's link takes `focus-ring-banded` where its first row lies over
  the field (§7.3, §7.8). §2, §4, §5, §7.7, §7.8 and §8.12 name the three lists, and the Status
  line and a Feature 010 banner name the feature. Authority: spec #311
  "Decisions", 3, 4 and 5, and #311 comment 6895825492.
- **v1.5 the list heading on four more lists (2026-11-17, Feature 011 #339):** `/health`, `/health/reports`, `/services` and `/health-services` open on the deep field
  with the list heading (§7.8): the labels "สุขภาพ", "บริการ" and "หน่วยบริการ" and the icons
  `heart-pulse`, `file-chart-column`, `users` and `hospital` are new to these pages, and the H1s,
  the leads, the titles in the head, the menu and the breadcrumbs stay. `ListHeading` takes links
  under the lead, `/services`' two related links, white and underlined with a 16 px `arrow-right`.
  What follows lies over the field's edge: on `/services` and `/health-services` the filter form
  first (§7.7), then today's cards or rows, empty states and pager, which keep their look until
  #340 to #342. `/health` shows its two destinations as the Homepage's Quick Access tiles
  (`HomeQuickLink kind="list"`, an H2 label and the lists' banded ring; the Homepage's tiles
  unchanged), two to a row at every width (§7.3, §8.11). §2, §7.3, §7.8, §8.11 and §8.12 name the
  pages, and the Status line and a Feature 011 banner name the feature. Authority: spec #338
  "Decisions", 2, 5, 6, 13 and 15, #338 comment 6941491587, and #339 comment 6941979791.
- **v1.5 the Service catalog's cards (2026-11-17, Feature 011 #340):** `/services` shows the
  Homepage's Frequently Used Service card, shared (`HomeServiceCard kind="list"`): the name an H2,
  the `card` shadow at rest and `deep` under the pointer, in a plain grid of three from `lg`, two
  from `sm` and one below at any count, each card revealed as it comes into the window. The
  catalog's own card, `ServiceCard`, and its 2 px ring hover are gone. The summary takes
  `text-secondary-on-soft` on the Homepage too, the one change there. §2, §3.1, §7.1, §7.3, §7.8,
  §8.4 and §8.12 name it. Authority: spec #338 "The Service catalog" and decisions 13, 15, 20 and
  21, and #338 comment 6941491587.
- **v1.5 the Health Service row (2026-11-18, Feature 011 #341):** `/health-services` shows the
  Health Service row with its map (`HealthServiceMapRow`): the Document row's white row and tile,
  with `hospital`; the facts line, the attention label on its own line, the name an H2 in
  `text-primary`, the official name and the address in two lines at most at every width; and
  "เปิดแผนที่", semibold with a 20 px `map-pin`, named with the Health Service's shown name, placed
  as the Document row's download. No link covers the row; each row reveals as it comes into the
  window. A Service's page keeps `HealthServiceRow` until #344. §2, §5, §6, §7.1, §7.3, §7.8 and
  §8.12 name it. Authority: spec #338 "The Health Service Directory" and decisions 12, 13 and 16,
  #338 comment 6941491587, and #341 comment 6966593423.
- **v1.5 the Health Report row (2026-11-18, Feature 011 #342):** `/health/reports` shows the
  Health Report row (`HealthReportRow`): the Announcement row without its badge, with a tile of the
  file tile's size and gradient holding `file-chart-column` and the fiscal year in `accent-warm`
  (the icon alone without one); the facts line, the title an H2 in two lines at most, from `sm` the
  summary and the round arrow, and the reporting period. One link named by the title covers the
  row, with the lists' banded ring; a report row has no download. Under the pointer the title
  turns `brand-primary`, and with motion allowed the row moves 10 px with the `deep` shadow; each
  row reveals as it comes into the window. §2, §3.1, §3.2, §5, §6, §7.1, §7.3, §7.8 and §8.12 name
  it, and `CODING_STANDARDS.md` "Public pages" the tile's measured `accent-warm`. Authority: spec #338
  "The Health Reports list" and decisions 1 and 12, and #338 comment 6941491587.
- **v1.5 a Health Report's page (2026-11-18, Feature 011 #343):** a Health Report's page opens on
  the deep field with the Post page's header (§9.1, §9.6): "วันที่รายงาน" and its report date in
  the `accent-warm` pill only when it has one, its Report Type in the outlined white pill, the H1
  and the summary. One white card over the field's edge holds first its report Document as a
  Document's page holds its file (`FileBlock`, shared with §9.5): the tile, the H2 "เอกสารรายงาน",
  the Document's title linking to its page, the type and size and the download; or, when the
  Document is unpublished or its file cannot be served, the H2 and "เอกสารรายงานไม่พร้อม
  ให้บริการ". Then the rule and the details. Before, a report whose Document's file could not be
  served showed the Document's row with "ไฟล์ไม่พร้อมให้บริการ". `DocumentDownload.astro`, which
  served this page alone, is removed (#334). `PostHeader`'s date pill takes its words
  (`dateWords`). §2, §3.1, §3.2, §7.1, §7.3, §8.12, §9.1, §9.5 and §9.6 name it. Authority: spec #338 "The three pages: the
  header", "The card over the field's edge" and decisions 4, 8 and 9, and #338 comment
  6941491587.
- **v1.5 a Service's page (2026-11-18, Feature 011 #344):** a Service's page opens on the deep
  field with the Post page's header (§9.1, §9.7): an outlined pill for each Service Category, as
  text, the H1 and the summary, with no icon. One white card over the field's edge holds its
  details and its external link with the leaving note, and a Service with neither has no card.
  The guidance follows on the page's colour with its H2s, then "เอกสารที่เกี่ยวข้อง" with each
  Document's download as an Announcement's page has it (§9.4), and "หน่วยบริการสุขภาพที่ให้บริการนี้"
  under the Homepage's section heading with the directory's rows, names H3, still by name.
  `PostHeader` takes a list of outlined pills, and `HealthServiceRow`, which this page alone used,
  is removed. §2, §7.1, §7.3, §8.12, §9.1, §9.4 and §9.7 name it. Authority: spec #338 "The three
  pages: the header", "The card over the field's edge" and decisions 3, 8 and 10, #338 comment
  6941491587, and #344 comment 6979384685.
- **v1.5 a Health Service's page (2026-11-18, Feature 011 #345):** a Health Service's page opens
  on the deep field with the Post page's header (§9.1, §9.8): its Facility Type in an outlined
  pill and, only when it is temporarily closed or inactive, its status in the `accent-warm` pill,
  the H1, and its official name under it when the display name differs, which leaves the card.
  One white card over the field's edge holds first its location (the address with "เปิดแผนที่"
  named with the Health Service, the opening hours, the public contact), then a rule and its
  details, and a Health Service with neither has no card. "บริการที่ให้" follows under the
  Homepage's section heading with the catalog's Service cards, names H3, two to a row from `sm`,
  in place of a list of links (`HomeServiceCard kind="section"`), whose card titles keep their
  compound words whole where the links' labels did not (§4.1). §2, §4.1, §7.1, §7.3, §8.4, §8.12,
  §9.1 and §9.8 name it. Authority: spec #338 "The three pages: the header", "The card over the
  field's edge" and decisions 8, 11, 13, 18 and 21, #338 comment 6941491587, and #341 comment
  6966593423 (the map's pill).
- **v1.5 documents, measures and limits (2026-11-19, Feature 011 #346):** the Status line names
  the acceptance due on #338. §10 lists what the Product Owner picked for Feature 011 and decided
  on #339 to #345, with each decision's source, and adds four kept limits: the Homepage's Service
  card's focus ring at its corners over the field, the external link's ↗ on a line of its own in
  a Service's card, a facts line's dot at a line's end (#353), and two shared details of a Health
  Service's page; its limits on the H1's lone last word and the 22 px "ติดต่อเรา" link now name
  Feature 011's pages. §8.12 names `/health`'s tiles among the parts that reveal, and §6 and §11
  name Feature 011's pages among those measured and captured at 1,024 and 768 px. The readings Feature 011's tickets recorded in §3.2, §7.3, §7.8,
  §8.4 and §9.6 to §9.8 were read again at the integration head `9f31dc0` and are the same
  (`docs/evidence/346-health-reports-services-health-services-evidence-round.md`). Authority: spec
  #338 "Documents" and "Decisions the Product Owner made", the decisions on #339 to #345, the notes
  on #346, and #346 comment 6997998925. No page changed.
- **v1.6 the About Document pages (2026-11-19, Feature 012 #366):** `/about/policies`,
  `/about/plans` and `/about/results` open on the deep field with the list heading (§7.8): the
  label "เกี่ยวกับเรา" and the icons `scroll-text`, `clipboard-list` and `chart-column` are new to
  these pages, and the H1s, the leads, the titles in the head and the breadcrumbs stay. Over the
  field's edge they show the Document repository's rows with their downloads
  (`DocumentDownloadRow`, titles H2, 14 px apart, each revealed as it comes into the window), the
  pager 32 px under them, and the type's empty state or a page past the last with its way back;
  there is no filter form. The About Document page's `PageHeading` and `DocumentRow` go from
  these pages; `DocumentRow` stays for a Basic Page's related Documents. §2, §7.1, §7.3, §7.8 and
  §8.12 name the pages, and the Status line and a Feature 012 banner name the feature. Authority:
  spec #365 "The About Document pages", "Motion" and decisions 4 and 5, and #365 comment
  7000119315.
- **v1.6 the Leadership page (2026-11-19, Feature 012 #367):** `/about/leadership` opens on the
  deep field with the list heading (§7.8): the label "บุคลากร" and the icon `user-round` are new to
  the page, and the H1, the lead, the title in the head, the breadcrumb and the empty state's words
  stay. Over the field's edge the first leader by Leadership order takes a featured card across the
  row and the others follow in white cards, three to a row from `lg`, two from `sm` and one below
  (`LeaderCard`, §7.3), each revealed as it comes into the window; with none the empty state lies
  over the edge. The Homepage Leadership strip's ringed circle becomes `PersonPicture`, which the
  strip and the cards share, each at its own size, gap and ring (§8.5); the strip's look is
  unchanged. The Leadership page's `PageHeading` and `PersonCard` go from it; `PersonCard` stays on
  `/about/personnel` until #370. §2, §3.1 (`accent-warm`), §7.1, §7.3, §7.8, §8.5 and §8.12 name the
  page. Authority: spec #365 "Leadership", "Motion" and decisions 4, 8, 9 and 11, and #365 comment
  7000119315.
- **v1.6 the Personnel page (2026-11-19, Feature 012 #370):** `/about/personnel` opens on the deep
  field with the list heading (§7.8): the label "เกี่ยวกับเรา" and the icon `users-round` are new to
  the page, and the H1, the lead, the units' headings, "ไม่ระบุหน่วยงาน", the title in the head,
  the breadcrumb and the empty state's words stay. Over the field's edge each organizational unit
  takes a white panel, its head a `surface-soft` tile beside the unit's H2 over a rule, its people
  inside as compact rows, three to a row from `lg`, two from `sm` and one below (`UnitPanel`,
  §7.3), each panel revealed as it comes into the window; with no one the empty state lies over
  the edge. `PersonPicture` takes a third size, 52 px and 60 px from `sm` with a 2 px gap, for the
  rows (§8.5). The page's `PageHeading` and `PersonCard`, which has no page left, go. §2, §7.1,
  §7.3, §7.8, §8.5 and §8.12 name the page. Authority: spec #365 "Personnel", "Motion" and
  decisions 4, 8, 9 and 12, and #365 comment 7000119315.
- **v1.6 a Basic Page (2026-11-20, Feature 012 #368):** `/pages/{slug}` and `/about/organization`
  open on the deep field with the Post page's header (§9.9): the breadcrumb in white, the title as
  the H1 in the Post page's sizes and the summary, with no pill, tile or frame; the field is a Post
  page's, without a ring. The body follows in the 48 rem text column, then 48 px under it the
  related Documents as Feature 010's section with their downloads (§9.4); a page with its title
  alone ends with its field. The label "เอกสารเผยแพร่" and the downloads are new to a Basic Page;
  the H1, the summary, the breadcrumb, the head's title, the addresses and the reads stay. Every
  Post page's header wraps an unbroken run of characters in its summary, such as a long web
  address, anywhere, where the field clipped it (§9.1; Product Owner, #368 comment 7028435491,
  item 2). `RelatedDocuments` loses the option that chose
  between its two forms, and `DocumentRow`, which has no page left, goes; `/about` takes the new
  related Documents and keeps its heading until #371. §2, §7.1, §7.3, §8.12, §9.4 and §9.9 name
  the page. Authority: spec #365 "A Basic Page", "Motion" and decisions 2, 3 and 9, and #365
  comment 7000119315.
- **v1.6 `/about` (2026-11-20, Feature 012 #371):** `/about` opens on a list's deep field with a
  Basic Page's header (§9.9): the `about` page's title as the H1 and its summary, or the H1
  "เกี่ยวกับเรา" and no lead without the page, the breadcrumb ending at เกี่ยวกับเรา as before. Its
  six sub-pages follow over the field's edge as the Homepage's Quick Access tiles, each label an
  H2, two to a row below `lg` and three from `lg`, each revealed as it comes into the window
  (`HomeQuickLink kind="list"`, §7.3, §8.11), then its body and related Documents. The H2
  "ข้อมูลเกี่ยวกับสำนักงาน" and `/about`'s `QuickLinkCard` go; `QuickLinkCard` stays on the ITA
  landing alone. The tiles' labels, the H1, the summary, the head's title and the breadcrumb stay.
  §2, §7.1, §7.3, §8.11, §8.12 and §9.9 name the page. Authority: spec #365 "`/about`", "Motion"
  and decisions 2, 3, 8 and 10, and #365 comment 7000119315.
- **v1.6 `/contact` (2026-11-20, Feature 012 #369):** `/contact` opens on a list's deep field with
  the list heading under the label "ติดต่อ" (§7.8), and Office Contact's details lie in a white card
  over the field's edge, a row per detail with its icon tile (`OfficeContactDetails`, §9.10); with
  no detail set there is no card and the field ends under the lead (`ListHeading`'s
  `overEdge={false}`). The official channels follow as pills under the Homepage's section heading
  (`share-2`, "ติดต่อ"), "(เว็บไซต์ภายนอก)" leaving their visible text for their accessible names,
  and the two routes as white cards with `ActionLink`'s new `arrow`. The page's `PageHeading`,
  `DetailSection`s and its plain details list go. A telephone number that is not one number is
  plain text at H3 size in `text-primary`, and the buttons are semibold (Product Owner, #369
  comment 7034812318). §2, §7.1, §7.8, §8.12 and §9.10 name the page. Authority: spec #365
  "`/contact`", "Motion" and decisions 4, 8, 9 and 13, and #365 comment 7000119315.
- **v1.6 documents, measures and limits (2026-11-20, Feature 012 #372):** the Status line names
  the acceptance due on #365, and Feature 012's banner names every page of the feature as built,
  in place of the sentences #366 and #367 added to it. §10 lists what the Product Owner picked for
  Feature 012 and decided on #366 to #371, with each decision's source, and adds three kept limits:
  a long unit name beside its tile on `/about/personnel`, a body that opens with a heading (#380),
  and the outlines under forced colours (#383); its limit on the H1's lone last word now names a
  Basic Page. §8.12 gives `/contact`'s motion with the lists', where its heading rises, and §6 and
  §11 name Feature 012's pages among those measured and captured at 1,024 and 768 px. The
  readings Feature 012's tickets recorded in §7.8, §9.9 and §9.10 were read again at the
  integration head `7077100` and are the same
  (`docs/evidence/372-about-contact-basic-page-evidence-round.md`). Authority: spec #365
  "Documents" and "Decisions the Product Owner made", the decisions on #366 to #371, the notes on
  #372, and #372 comment 7043481056. No page changed.
- **v1.7 the ITA landing (2026-11-22, Feature 013 #393):** `/ita` opens on the deep field with the
  list heading (§7.8): the label "ITA" and the icon `shield-check` are new to the page, and the
  H1, the lead, the title in the head, the breadcrumb and the empty state's words stay. Over the
  field's edge each fiscal year that has a published MOIT takes a large white card, three to a row
  from `lg`, two from `sm` and one below, with a gradient tile holding `calendar-check`,
  "ปีงบประมาณ" over the year as an H2, where the earlier card had no heading, and the count with
  its arrow (`ItaYearCard`, §8.3), each revealed as it comes into the window; with none the empty
  state lies over the edge. The landing's `PageHeading` goes, and `QuickLinkCard`, which has no
  page left, goes. The Status line and a Feature 013 banner name the feature, and §2, §3.1
  (`accent-warm`), §7.1, §7.3, §7.8, §8.3 and §8.12 name the page. Authority: spec #392 "The ITA
  landing", "Motion" and decisions 2, 7, 9 and 11, and #392 comment 7075910252. A fiscal year's
  page follows (#394): it opens on the deep field with the list heading, the label "ITA" and
  `calendar-check` new to it, and the H1, the lead, the titles, the facts line's words, the title
  in the head and the breadcrumb stay. Its MOITs lie over the field's edge as white rows in an
  ordered list, each with "MOIT" over its number on the Document row's gradient tile (`RowTile`,
  which `FileTile` now shares), the title as the row's one link, the facts line and from `sm` an
  arrow (`ItaMoitRow`, §8.3), each revealed as it comes into the window. "MOIT n" moves from the
  badge inside the link onto the tile, and the link carries it for assistive technology alone.
  The year page's `PageHeading` and its one card with divider lines go, and the `divider` token
  loses the year's rows. §2, §3.1 (`accent-warm`, `divider`), §3.2, §7.1, §7.8, §8.3 and §8.12
  name the page. Authority: spec #392 "A fiscal year's page", "Motion" and decisions 2 and 12.

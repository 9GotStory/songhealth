# Songhealth — Design System & Public UI Contract

> **Status:** v1.3, current. Feature 006's design was accepted on #144; Feature 007's
> bounded refinements follow spec #190, implemented by #191–#198, and were accepted on #190
> (Product Owner, 2026-11-10: #190 comment 6759434955). Feature 008's redesign follows spec #239,
> implemented by #240–#250, and was accepted on #239 (Product Owner, 2026-11-13: #239 comment
> 6841960594). Feature 009's redesign of the News lists and the Post page follows spec #280,
> implemented by #281–#287; its acceptance is still to come.
> **Updated:** 2026-11-13 (Feature 009 #283); first drafted 2026-10-30
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
> shadow joins the tokens. #281 to #287 implement it, each with its own decisions in §13's change
> history. Every page outside the feature keeps its design.

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
  the Post pages (spec #280): so far the three lists have their heading on the deep field (§7.8),
  with the Homepage's small News card under it (§7.3), and on Health News and Health Content the
  filter form (§7.7) before them. Every other page keeps the design of §7 and §9 under the new shell until its own
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
  green field under the hero and the Services, the green bands and the footer. White cards with
  soft shadows lie on them and over a section's edge, and a section opens with an icon tile and a
  large heading (§8). Buttons, badges and chips are pills.
- **The page moves, and never to say something:** an entrance, a reveal, a hover and a loading
  state, all off under the visitor's reduced-motion setting, and nothing that moves without end
  (§8.12).
- **Prioritize tasks and content**, not decorative dashboard statistics or giant portal menus. A
  number on a page is read from content, as the Health Service directory's counts are (§8.9).
- **Clear reading hierarchy:** the office's summary and a useful search first, prominent Featured
  content, visible service choices, who leads the office, recent News and Announcements, health
  knowledge and contact details.
- **Imagery:** genuine, permitted local imagery. Most of the office's pictures are One Pages
  (GLOSSARY): a page shows one whole, and a card shows its middle (§7.3, §8.1, §9). A gradient
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
   uses `deep-field`, `section-title` and `hero-enter` too (§7.8), and a list's cards
   `plain-visual`, `scroll-reveal` and `picture-shimmer` (§7.3).
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
| `accent-warm` | `#f3c95f` | a status that needs attention, the skip link, the focus ring and eyebrows on dark surfaces; on the Homepage, the words the hero's headline marks, the search's submit button, the sheet behind the Featured card, a section heading's icon tile, a Service card's tile under the pointer, the ring of the first person in the Leadership strip, the large News card's date pill and the tile of its visual, and in the Current Announcements the month and year on a date tile, the recruitment badge, a status that is not open yet and the arrow's circle under the pointer; on the field under a list's heading, the heading's icon tile and its link under the pointer (§7.8) |
| `text-primary` | `#16211d` | body text |
| `text-secondary` | `#65736d` | leads, meta lines |
| `bg-page` | `#f6f9f7` | the page |
| `surface-base` | `#ffffff` | cards, white bands |
| `surface-soft` | `#eaf5f0` | soft bands, the Current Announcements' band and its general category badge |
| `border-default` | `#dce7e2` | borders |
| `topic-blue` | `#f0f5fc` | the procurement Announcement badge's fill (§8.7); `topic-green`, the old Health Information cards' other fill, left the tokens with them (#246) |
| `divider` | `#dbe8e3` | separators inside a white box: the ITA year's rows, the line above a post's topics |
| `activity-visual-from`, `-to` | `#bfdcce`, `#e8f0d9` | an Activity card without a picture, on the Activities list; `contact-visual-from` and `-to`, the map stand-in's fill, left the tokens with it (#247) |
| `hero-chip`, `hero-secondary-fill`, `hero-secondary-border` | white at 12 %, 6 %, 28 % | the hero's chip; a secondary link on a dark surface |
| `text-secondary-on-soft` | `#5d6a64` | secondary text on `surface-soft` (contrast fix, #51) |
| `border-input` | `#7a8a83` | input boundaries (contrast fix, #51) |
| `procurement-text`, `procurement-border` | `#1d4f91`, `#c9dbf3` | the procurement Announcement badge's text and border, on `topic-blue` (Feature 008, #239) |
| `status-closed` | `#e7ecea` | a closed Announcement status label's fill (Feature 008, #239) |
| `deep-highlight` | `#0f8a70` | the highlight in the deep green field's gradient and in the deep visual's (Feature 008, #239) |
| `plain-visual-to` | `#d6ece2` | the plain visual's second stop, after `surface-soft` (Feature 008, #239) |

The Homepage's hero uses `deep-highlight`, in the `deep-field` utility's gradient, and
`plain-visual-to`, in the `plain-visual` utility that stands in for a missing picture (§8.1).
Latest News uses both again (§8.6): `plain-visual` on a small card without a picture, and
`deep-highlight` in the `deep-visual` utility on the large one; so do the cards of the News,
Health News and Health Content lists (§7.3). The
Current Announcements use `procurement-text` and `procurement-border` on the procurement badge
(§8.7). `status-closed` is the fill of the dotted status label's closed state, which no page shows
yet: the Homepage lists current Announcements only. Some fills are a token at an opacity, not a token of their own: the hero's decorations and
chip (`accent-warm` at 28 %, 30 %, 38 % and 50 %, `surface-soft` at 16 %, `surface-base` at 18 %
and 22 %), the header's
surface, `surface-base` at 90 %, and the footer's quiet text, pills and rule, `surface-base` at
70 %, 85 %, 20 %, 15 % and 10 %.

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
`section-title` too (§7.8).

Radii are named by their size in px: 14, 16, 18, 20, 22, 24, 26 and 32, and `pill` (999 px). Four
shadows: `card`, `0 10px 15px rgb(13 46 36 / 0.08)`; `header`, the sticky header's lower edge,
a 1 px `border-default` hairline with `0 8px 24px -16px rgb(13 46 36 / 0.25)`; `deep`, a card on
the deep green field, `0 30px 60px -20px rgb(13 46 36 / 0.35)`; and `tile`, a section heading's
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
| `accent-warm` (the month and year) on a Current Announcement's date tile, where they sit on its `brand-primary` to `brand-dark` gradient: measured, the one exception to the row above (§8.7; #245 comment 6812837231) | 5.45:1 or more |
| `procurement-text` on `topic-blue` (the procurement badge, §8.7) | 7.43:1 |
| `brand-dark` on `accent-warm` (the recruitment badge, a status that is not open yet) | 7.75:1 |
| `text-primary` on `status-closed` (the dotted label's closed state, which no page shows yet) | 13.85:1 |
| `text-secondary-on-soft` on `surface-base`, the lightest the Current Announcements' glow makes the band under its lead | 5.66:1 |
| `surface-base` (the label, the lead and the counts' words) on the Health Service Discovery band's gradient: measured (§8.9) | 5.20:1 or more |
| `surface-base` (the breadcrumb, the label, the H1 and the lead) on the field under a list's heading (`/news`, Health News, Health Content): measured (§7.8) | 6.45:1 or more |
| `accent-warm` (the counts' numbers, large text) on the band's gradient, over its glow: measured (§8.9) | 3.22:1 or more |
| `accent-warm` on `surface-base` | 1.58:1: a fill or decoration, never text |

There is no alert colour: a status is stated in text, and colour supports it.

## 4. Typography

- **Typeface:** Noto Sans Thai, self-hosted through Astro's Fonts API (`astro.config.mjs`,
  `src/assets/fonts/README.md`).
- **Headings:** a page's H1 is H3 size below `sm`, H2 size from `sm` and H1 size from `lg`; the H1
  of a list page on the deep field (the News, Health News and Health Content lists) is
  `section-title` instead, under its label (§7.8). A Homepage section's H2 is `section-title` (§3.1), under a label at label size between slashes. The
  Homepage's H1, the site title, is out of sight: the hero's headline shows in its place (§8.1).
  The Leadership strip's H2 is H3 size in bold, its compact heading (§8.5). Keep the `h1` → `h2`
  → `h3` order whatever the visual size.
- **Sizes beyond the scale** are the Homepage's (§3.1), and one of them a list heading's:
  `hero-headline` and
  `hero-headline-alone` for the hero's headline, up to 44 px beside a Featured card and 52 px
  without one; `section-title`, up to 42 / 54, also a list page's H1 on the deep field (§7.8); and `telephone`, 40 / 52, on the contact card from 640 px. The
  header's title and navigation items scale with the window from 1,024 px (§7.4).
- **Copy:** concise, natural Thai. Dates and categories sit below the title in emphasis, and colour
  is never the only cue. No hard-coded dates, opening hours, news, phone numbers or service status.

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
  MOIT page's table of contents, Evidence pills, eyebrows, meta lines, link labels and the
  "บริการที่ให้" link list.
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
  24 px on a card (Service and Quick Link cards).
- **Direction:** an onward link on this site ends in `chevron-right`, and a link that leaves it in
  `arrow-up-right` (Product Owner, #51 comments 6536026977, 6536052180). On the Homepage, a round
  button, a section heading's link and a card take `arrow-right` instead (Product Owner,
  2026-11-11: #241 comment 6791096480, item 1), and so does the link of a list's heading on the
  deep field, at 16 px (§7.8; spec #280 "List heading"): 16 px in the heading's link, 20 px in the search's
  submit button, on the Featured card, on a Homepage Service card and in the circle at the end of a Current Announcement's row (§8.7), and 16 px after a Health Content card's "อ่านต่อ" (§8.8). The Health Service Discovery form's button opens with a 20 px `search` icon (§8.9). On the contact card a detail opens with a 20 px icon that stands for its name (`map-pin`, `clock`), the telephone number with a 24 px `phone`, and its button ends in a 20 px `arrow-right`; a Quick Access card keeps a 24 px arrow, `arrow-right` (§8.11). The hero's search field opens with a 20 px `search`
  icon, and a section heading's tile and a visual's tile hold a 24 px icon: the plain visual's, and the deep visual's on the large News card (`heart` on both in Latest News, `heart-pulse` on a Health Content card's). A Service card shows
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
    heading has its link at its right, and its field the small glow in its corner (§7.8);
  - `lg`, from 1,024 px: desktop, with the main navigation in the header (§7.4), the two-column
    layouts (the post pages, the MOIT page's table of contents) and, on the Homepage, up to
    three Services and four Health Content cards to a row, the Leadership strip in one row, the large
    News card and the large Activity tile beside their small ones, and the Current Announcements'
    heading beside their rows (§8.4 to §8.11). The field under a list's heading has its ring
    (§7.8).
  - `md` and `xl` are not used.
- **Widths checked:** 1,440 px (desktop), 375 px (a common phone) and 320 px (reflow, WCAG 2.2
  SC 1.4.10). A rule from a breakpoint is checked on both sides of it, as at 1,023 and 1,024 px
  (CODING_STANDARDS "Tests"). The Homepage and the shell are also measured and captured at
  1,024 and 768 px, the five widths of Feature 008 (spec #239 "Testing Decisions"; §8.2), and so
  are Feature 009's pages (spec #280 "Testing Decisions"; §7.8).
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
| Headings | `PageHeading`, `SectionHeading`, `ListHeading` on its `DeepField` with `ListBody` after it (§7.8), `ThaiTitle` |
| Cards | `ContentCard` (the Homepage's Latest News; the News, Health News and Health Content lists), `ActivityCard`, `ServiceCard`, `QuickLinkCard`, `PersonCard` |
| Homepage | `HomeHero`; `SearchForm` on `/search` |
| Posts | `PostHeader`, `PostColumns`, `PostBody`, `ActivityPhotos`, `RichText` |
| Links | `ActionLink` (buttons), `ArrowLink` (onward links), `Pagination`, `Breadcrumb` |
| Lists | `FilterForm` |

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
  ContentCard (the News, Health News and Health Content lists), ServiceCard (the catalog)
  and ActivityCard (the Activities list) has one native link named by its title alone. The
  picture/fallback, icon, metadata, summary and padding all open its original destination.
  H2 titles on lists and H3 under Homepage sections name a full-surface native link through
  `aria-labelledby`. Other content stays outside the link's visible label and remains readable,
  with no nested anchors or another focus stop. Enter, modified clicks and new-tab actions work.
- **Interaction:** on a ServiceCard and an ActivityCard, hover adds a 2 px `brand-primary` ring
  without moving/resizing the card and makes its title green and underlined. The resting
  border/shadow remains; keyboard focus uses the global 3 px outline around the whole card. The
  Homepage's own Service cards (§8.4), News cards (§8.6), Health Content cards (§8.8) and Activity
  tiles (§8.10), and multi-action cards, keep their own interactions.
- **The News, Health News and Health Content lists' card** (Feature 009 #283; spec #280 "The
  cards", decisions 4, 10 and 15) is the Homepage's small News card (§8.6), `ContentCard` with
  `kind="list"`: white, radius 22, the `card` shadow. From `sm` a 16:9 picture above its text;
  below `sm` a row with a 120 px picture at 4:3, radius 14, 10 px inside the card, which leaves
  the title 130 px at 320 px. Under the picture one line with the date (13 / 20 semibold,
  `brand-primary`), a dot and the label (regular, `text-secondary`): the News category on `/news`
  and the first Health Topic on Health News and Health Content, the date alone without one. Then
  the title, an H2, body size semibold below `sm` and body-large from `sm`, three lines at most;
  from `sm` the summary at label size in `text-secondary`, two lines at most, and none below `sm`.
  Without a picture, or when its media item was deleted, the `plain-visual` with the 48 px
  gradient tile and the list's 24 px icon: `message-square` on `/news`, `heart-pulse` on the other
  two. The cards go three to a row from `lg`, two from `sm` and in rows below, 24 px apart from
  `sm` and 14 px below; a last row may hold fewer, and no cell is filled. Under the pointer, with
  motion allowed, the picture grows by 6 % inside its box and the card lifts 6 px with the `deep`
  shadow, in place of the ring and the green underlined title; the link still covers the card's
  resting place. Each card reveals as it comes into the window, and its picture's box shimmers as
  the page opens (§8.12). Keyboard focus is the global 3 px outline with a `surface-base` band
  2 px wide on both sides (`focus-ring-banded`): a card of `/news`'s first row lies over the deep
  field's lower edge (§7.8), where the ring alone read 1.00:1 on half its length on the
  prototype's page at 375 px, and with the band what lies beside the ring reads 5.40:1 or more
  (Product Owner, 2026-11-13: #283 comment 6854670042). On the page's colour the band hardly
  shows.
- **Crops:** an Activity card crops its picture to 16:9 (`ActivityCard.astro`), and a News or
  Health Content card in a list to 16:9 from `sm` and 4:3 below (`ContentCard.astro`; 16:10
  until Feature 009 #283), as the Homepage's small News card does; the Homepage's Health Content
  cards and its Activity tiles have their own boxes (§8.8, §8.10). Every crop centres on the middle, or around the focal point
  that the field's value carries. A One Page in a card therefore shows its middle, where its photo
  collage is (Product Owner: "คงครอปกลางภาพแบบเดิม (แนะนำ)"; spec #144 names the 16:9 crop, exact
  for Activity cards only).
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
  - `/about`, `/health` and `/ita` keep `QuickLinkCard`, the full card with its border.

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
- On the deep field under a page's heading (§7.8) the links and the current page are
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
- On Health News and Health Content the form is the first block over the deep field's lower edge,
  under the list's heading, with the cards or the empty state 32 px under it (§7.8). It keeps its
  look there: its white card carries its own text and the page's `brand-primary` focus ring.
- The public-browser suite goes through all five lists, with Documents' three selects and the
  directory's Area and name fields. The applied and draft states, the first-page restart and the
  keyboard run at 320 px, and JavaScript-disabled pages at 320 and 1,440 px. Target height, look and
  fit run at 320, 375, 639, 640, 768, 1,023, 1,024 and 1,440 px, hover at 1,440 px, and axe, focus
  and reflow at 320, 375 and 1,440 px.

### 7.8 List heading on the deep field

`ListHeading` (Feature 009 #281, #282; spec #280 "The field under a heading", "List heading")
heads `/news`, Health News (`/news/health`) and the Health Content list (`/health/content`).

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
- **What follows the heading** lies over the field's lower edge: the field's content ends 128 px
  above the edge from `sm` and 96 px below, and the block that follows (`ListBody`) starts 88 px
  above it from `sm` and 64 px below. On `/news` that block is the cards (§7.3) or the empty state,
  then the pager (§7.6); on Health News and Health Content the filter form (§7.7) comes first. They
  are 32 px apart, and each keeps its content and behaviour. The cards are the Homepage's small
  News card (§7.3). On `/news` the first row lies over the field, where the global `brand-primary`
  ring alone was faint, so a card's ring has a `surface-base` band on both sides
  (`focus-ring-banded`, §7.3; Product Owner, 2026-11-13: #281 comment 6847783611, item 1, and
  #283 comment 6854670042).
- **Motion** (§8.12): with motion allowed the heading block rises in as the page opens, and the
  lead 0.1 s after it. Each card reveals as it comes into the window (§7.3). The breadcrumb, the
  link, the filter form, the empty state and the pager show at once.
- **Measured** on the development runtime at `3fe6f6b`, the demo dataset's six News:
  - `scripts/measure-text-contrast.ts /news` at 1,440, 1,024, 768, 375 and 320 px, the lowest
    reading of each text: the lead 6.63:1 (375 px), the H1 6.99:1 (320 px), the label 8.97:1
    (320 px), the breadcrumb's current page 10.00:1 and its link 10.70:1 (320 px). The link's
    words are `brand-primary` on `surface-base`, 6.45:1 (§3.2).
  - `scripts/capture-screenshots.mjs`: the page is 1,507, 1,500, 2,042, 3,509 and 3,511 px high at
    1,440, 1,024, 768, 375 and 320 px, where it was 1,501, 1,494, 2,030, 3,447 and 3,449 px at
    `668d3e5` (#281's before screenshots).
- **Measured** on the development runtime at `fcbba51` (#282), the demo dataset:
  `scripts/measure-text-contrast.ts` on `/news/health` and `/health/content` at the same five
  widths, the lowest reading of each text over both: the lead 6.45:1 (both lists at 375 and 320 px,
  and Health News at 768 px), the breadcrumb's current page 7.00:1 (Health Content, 320 px), the H1
  7.39:1 (Health Content, 320 px), the label 8.72:1 (Health Content, 320 px) and the breadcrumb's
  links 9.34:1 (Health Content, 320 px).
- `tests/browser/public-news.spec.ts` reads the heading's parts, their order and colours, the
  head's title, the link's place and height on both sides of 640 px, the H1's size on both sides
  of 640 and 1,024 px, what follows the heading with each empty state, the keyboard's order with
  the focus ring, the motion (the pager and an empty state show at once too) and the page without
  JavaScript. Health News, there, and Health Content, in `public-health.spec.ts`, take the same
  cases but the head's title and the link, which they lack, from `testFilteredListOnField`
  (`tests/browser/public.helpers.ts`): it adds the heading's icon, the filter form first over the
  edge with its ring on its white card, and a page past the last and a Health Topic that matches
  nothing 32 px under the form. Each suite's own first test reads the list with no item at all.

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

- **Landing `/ita`:** the heading "การประเมินคุณธรรมและความโปร่งใส (ITA)" with the GLOSSARY lead,
  then a Quick Link card per fiscal year, newest first: "ปีงบประมาณ", the year and "ตัวชี้วัด n
  รายการ". While no MOIT is published it says "ยังไม่มีข้อมูล ITA".
- **Year `/ita/{fiscal-year}`:** the heading "ITA ปีงบประมาณ พ.ศ. YYYY", then one card that lists
  the year's MOITs by number between divider lines. Each row is a heading link, a "MOIT n" badge
  and the title, over "หลักฐาน n รายการ · ปรับปรุงล่าสุด date".
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
  the name as an H3 at 18 / 30 semibold, the summary at 14 / 22 in `text-secondary`, clamped to
  three lines and hidden below `sm`, and a 20 px `arrow-right`. A `surface-soft` circle shows in
  its lower right corner. The Service catalog keeps `ServiceCard` (§7.3).
- **One link** named by the Service's name covers the card, as on the shared cards (§7.3).
- **Under the pointer** the card and its circle turn `brand-primary`, its name, summary and arrow
  `surface-base`, and its tile `accent-warm` with a `brand-dark` icon. Without a reduced-motion
  preference the card also rises 8 px inside its place, the tile turns, and the circle grows.
- **The focus ring** lies inside the card's edge, because from `sm` the card lies partly on the
  field and partly on the page: `brand-primary` on the white card, and `accent-warm` while the
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
- **A person** shows the picture in a circle of 76 px (60 px below `sm`), the shown name as an H3
  at 16 / 26 semibold and the current assignment at 14 / 22 in `text-secondary`. Unit and public
  contact are not shown, and no person is a link. Around the picture, 4 px away, the first person
  has a 3 px `accent-warm` ring, its only mark (#243 comment 6809325869, item 2), and the others a
  2 px `border-default` one. Without a picture the
  circle is `surface-soft`, as on `PersonCard`.
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
- **Every picture** covers its box from its middle (§7.3) and is decorative. The title is an H3
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

The Current Announcements (`HomeAnnouncementRow`; spec #239 "Current Announcements") follow Latest
News as a section of their own:

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
  - the Announcements list's status line, for an Announcement with open or close dates: the label
    after a 7 px dot at 13 / 20 semibold, open in `surface-base` on `brand-primary`, not open yet
    in `brand-dark` on `accent-warm`, then the dates. The words and the dot state the status; the
    Announcements list keeps its own label. The label's closed state, `text-primary` on
    `status-closed` (spec #239), does not show here: a closed Announcement is not current;
  - from `sm`, a 40 px `surface-soft` circle with a 20 px `arrow-right`.
- **The link:** the title is an H3 that names one link over the whole row; the date, the category
  and the status stay outside the link's name.
- **Under the pointer** the circle turns `accent-warm` with a `brand-dark` arrow, and the row moves
  10 px to the right with the `deep` shadow, only under `prefers-reduced-motion: no-preference`.
  Keyboard focus is the global 3 px outline around the row.

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
  The row wraps, 10 px apart (8 px below `sm`). With no topic offered the row is left out.
- **The cards** are the latest 4 Health Content items, four to a row from `lg` and two from `sm`,
  24 px apart. A card is white, radius 22, with the `card` shadow and 10 px of padding:
  - the picture, radius 14, at 4:3 from `lg` and 16:9 from `sm`, covering its box from its middle
    (§7.3) and decorative; without one, the `plain-visual` with a green tile and a 24 px
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

- **A tile** is its picture, radius 22 with the `card` shadow, covering its box from its middle
  (§7.3) and decorative. Over its lower part lies a `brand-dark` gradient, 96 % at the lower edge
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

**Quick Access** (`HomeQuickLink`; spec #239 "Quick Access") shows up to four shortcuts from its
menu before the Contact Summary, and is left out while the menu is empty, as the demo dataset
leaves it (`scripts/demo-dataset/content.ts`; spec #239). Under the section heading its cards go
four to a row from `lg` and two below, 24 px apart (12 px below `sm`). A card is the Homepage's
card surface, white with the `card` shadow and no border, radius 22 (18 below `sm`): the label at
the h3 size and a 24 px `arrow-right`, the whole card one link named by the label. Under the
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
- **A list's motion.** On `/news`, Health News and Health Content the heading block rises in as
  the hero's parts do, starting at 0 s, and the lead at 0.1 s (§7.8). Each card reveals as a
  section's card does and shows whole while it holds the keyboard's focus, and its picture's box
  shimmers as the page opens; a missing picture's visual does not (§7.3; Feature 009 #283). The
  breadcrumb, the link, the filter form, the empty state and the pager show at once
  (`public-news.spec.ts` "/news moves only when motion is allowed: …", and
  `testFilteredListOnField`'s motion case for the other two).
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

### 9.1 The header and two columns

- **The header** (`PostHeader.astro`): a News item's category, the title as the page's one H1, the
  summary under it with the line breaks staff typed, and the publication date; Health Content's
  review date follows. Every News and Activity states its story in words, at least its summary,
  as a One Page's text is an image (grill Q14; `05` §5.1).
- **From `lg`, a post with a picture reads in two columns** (`PostColumns.astro`):
  - on the left, the page's text in its order: the header, then an Activity's details card, or a
    News or Health Content post's body, source and topics, each only when the post has it, 2 rem
    under the header;
  - on the right, a 28 rem column, 48 px from the text, with the picture whole and
    "เปิดภาพขนาดเต็ม", a link to the file as it was uploaded;
  - the picture is sticky 1.5 rem below the header (`--header-offset` plus 1.5 rem from the top, §7.4): it stays in view while the left column scrolls and
    stops at the end of the two columns. Anything full width, such as an Activity's photos, comes
    after them, so the picture never covers it.
- **Below `lg`**, one column in the page's order: the header, the picture, then the body, source
  and topics the post has, 2 rem apart (News, Health Content); the header, the details, the
  picture, then the photos (Activity). "เปิดภาพขนาดเต็ม" shows at every width (Product Owner, #147
  comment 6634124888 item 1). A post without a picture keeps one column.
- **A News or Health Content post with no body, source or topics** ends with whichever of its
  header and its picture's link ends lower; below `lg` that is the link, which follows the header.
  No empty row or 2 rem gap follows (#190 comment 6707205912, Empty Post page row B). A difference
  in height between the picture and the text, and the shell's minimum page height, still leave
  their own space.
- The other detail templates, such as Announcement, Document and Service, keep their layout.

### 9.2 An Activity's photos

`src/components/ActivityPhotos.astro`, under the heading "ภาพกิจกรรม" (Product Owner's decisions:
#148 comment 6649367649):

- Square thumbnails, four to a row from `lg` and three below, each a link to the photo's file,
  with its caption under it on at most two lines and in full to a screen reader.
- The first eight show. The rest are in the same list, so they carry on its rows, and show while
  the outlined-pill control after the list is open. It reads "ดูรูปทั้งหมด (N รูป)" while closed
  and "ซ่อนรูป M รูป" while open. With eight photos or fewer there is no control.
- No JavaScript: a native `<details>` and a `:has()` rule. A browser without `:has()` shows every
  photo and no control.
- A link is named by the photo's alt text from the media library, else its caption, else "ภาพที่ N".
- The crop is the middle of the photo, or the part around a focal point that the field's value
  carries (`05` §5.1).
- An Activity page with twenty photos is 2,266 px tall on a 375 px phone while they are folded
  (#148's pull request).

### 9.3 A gallery in a News body

A gallery block in a body stays EmDash's own rendering: square thumbnails in the columns the block
sets (3 by default, 2 at 640 px and narrower), every photo shown, with no link per photo (emdash
1.1.0 `src/components/Gallery.astro`; spec #144). Large photo sets belong on an Activity, and
EmDash's Edit mode shows the block as a placeholder (`05` §5.1).

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
prototype (spec #280 "Decisions the Product Owner made"), after the Homepage as it is built and
not its prototype ("design หน้าแรก (ปัจจุบัน)"):

- the lists' heading on the deep field with the cards over its edge, and the newest item large on
  a first page that no Health Topic narrows;
- `/news` headed as the Homepage's section, "ข่าวสาร" and "ข่าวประชาสัมพันธ์", with a pill link to
  Health News;
- the Post page's header on the field, its picture in a white frame over the field's edge, its
  text on the page's colour, its Health Topics as chips and an Activity's photos under a section
  heading;
- every earlier behaviour, address and read as it is, and the Homepage's motion with no new
  effect.

The prototype's variant C, on the branch `prototype/news-post-redesign`, is the visual reference
(`docs/prototypes/news-post-redesign.md` there). Each ticket's decisions are on #281 to #287 and in
§13; of these picks the code holds the heading of the three lists (§7.8). The feature's acceptance
is still to come.

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
  - the picture follows only while the left column is the longer;
  - a picture taller than the window shows its lower part as the block ends.
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
  Feature 009's pages at 1,024 and 768 px too (§6).

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
  with a 120 px picture at 4:3 below, the date with a dot and the label on one line, the title in
  three lines at most and from 640 px the summary in two, the list's icon on a missing picture's
  visual, the Homepage's hover in place of #193's ring and green underlined title, a reveal and a
  shimmer (§8.12), and a focus ring with a white band, `focus-ring-banded` (§3). `ContentCard`
  takes `HomeNewsCard`'s place on the Homepage, with `kind="home"`, and the Homepage's cards show
  as before. The crop was 16:10, the label came before the date, the summary showed three lines at
  every width and the visual was a plain `surface-soft` box. What each list reads, its order, its
  page size, its whole-card link and its addresses remain. Authority: spec #280 "The cards",
  "Motion" and decisions 4, 10 and 15, and #283 comment 6854670042 (the ring's band).

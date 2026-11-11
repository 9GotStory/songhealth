# Songhealth — Design System & Public UI Contract

> **Status:** v1.2, current. Feature 006's design was accepted on #144; Feature 007's
> bounded refinements follow spec #190, implemented by #191–#198, and were accepted on #190
> (Product Owner, 2026-11-10: #190 comment 6759434955). Feature 008's redesign follows spec #239,
> ticket by ticket from #240, and awaits the Product Owner's acceptance on #239.
> **Updated:** 2026-11-11 (Feature 008 #242); first drafted 2026-10-30
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
> the official channels as pills. Five colours join the tokens (§3.1). #240 implements the shell,
> and #241 the Homepage's hero on the deep green field and the Homepage section heading (§8, §8.1);
> the sections of this document they do not name still describe the pages as they are until their
> own tickets.

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

**Modern Local Health Civic:** citizen-first, useful, credible, accessible, calm, editorial, and
recognizably connected to the local health-service network.

- **Evolve Concept v1; add no new style.** Its palette, Noto Sans Thai and its composition are the
  base. Feature 006 put the legacy site's real content on the built design and changed only what
  that content showed wrong (spec #144). New palettes, typefaces and an agency look were turned
  down: "เราควรต่อยอดจาก Concept v1 ไม่ใช่การสร้างรูปแบบใหม่แบบนี้".
- **Prioritize tasks and content**, not decorative dashboard statistics or giant portal menus.
- **Neutral surfaces first**; health green is a meaningful accent, not an all-green interface.
- **Clear reading hierarchy:** prominent Featured content, useful search, visible service choices,
  recent News, health knowledge and contact details.
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
   `focus-ring-on-dark` and `focus-ring-on-light`; the header's `header-title` and
   `header-nav-item`; the Homepage's `deep-field`, `plain-visual`, `hero-headline`,
   `hero-headline-alone` and `section-title`) and the `.rich-text` typography of Portable Text
   bodies, which EmDash renders as plain HTML that takes no utility classes.
4. No other plain CSS selectors for component styling, no CSS Modules, Astro `<style>` blocks or
   CSS-in-JS, and no Tailwind v3 setup or `tailwind.config.js`. An inline `style` carries only a
   value computed from content: the shell's `--menu-height` from its number of menu items (§7.4).
5. States and widths use Tailwind's variants (`hover:`, `focus-visible:`, `group-*`, `max-sm:`,
   `supports-[…]:` and the breakpoints of §6). Pages work without client JavaScript (§11).
6. A colour or type style the tokens lack becomes a named token with its source, and §3.1 records
   it. An arbitrary value is for a measured detail only, such as the post picture's `28rem`
   column.
7. These rules cover the public presentation. EmDash's Admin and its Edit mode are not restyled.

### 3.1 Tokens

The tokens began as Concept v1's variables and keep their names. Colours:

| Token | Value | Use |
| --- | --- | --- |
| `brand-primary` | `#0b6b57` | links, primary buttons, the News card, the focus ring on light surfaces |
| `brand-dark` | `#123c33` | headings, the deep green field, dark bands |
| `accent-warm` | `#f3c95f` | a status that needs attention, the skip link, the focus ring and eyebrows on dark surfaces; on the Homepage, the words the hero's headline marks, the search's submit button, the sheet behind the Featured card, a section heading's icon tile, and a Service card's tile under the pointer |
| `text-primary` | `#16211d` | body text |
| `text-secondary` | `#65736d` | leads, meta lines |
| `bg-page` | `#f6f9f7` | the page |
| `surface-base` | `#ffffff` | cards, white bands |
| `surface-soft` | `#eaf5f0` | soft bands, the Contact Summary |
| `border-default` | `#dce7e2` | borders |
| `topic-green`, `topic-blue` | `#ebf7f0`, `#f0f5fc` | Health Information cards |
| `divider` | `#dbe8e3` | Announcement list separators |
| `activity-visual-from`, `-to` | `#bfdcce`, `#e8f0d9` | an Activity card without a picture |
| `contact-visual-from`, `-to` | `#d1ebde`, `#e8f0cc` | the Contact Summary's map stand-in |
| `hero-chip`, `hero-secondary-fill`, `hero-secondary-border` | white at 12 %, 6 %, 28 % | the hero's chip; a secondary link on a dark surface |
| `text-secondary-on-soft` | `#5d6a64` | secondary text on `surface-soft` (contrast fix, #51) |
| `border-input` | `#7a8a83` | input boundaries (contrast fix, #51) |
| `procurement-text`, `procurement-border` | `#1d4f91`, `#c9dbf3` | the procurement Announcement badge's text and border, on `topic-blue` (Feature 008, #239) |
| `status-closed` | `#e7ecea` | a closed Announcement status label's fill (Feature 008, #239) |
| `deep-highlight` | `#0f8a70` | the highlight in the deep green field's gradient (Feature 008, #239) |
| `plain-visual-to` | `#d6ece2` | the plain visual's second stop, after `surface-soft` (Feature 008, #239) |

The Homepage's hero uses `deep-highlight`, in the `deep-field` utility's gradient, and
`plain-visual-to`, in the `plain-visual` utility that stands in for a missing picture (§8.1). The
other three Feature 008 colours are defined by name for the tickets that follow; no page uses them
yet. Some fills are a token at an opacity, not a token of their own: the hero's decorations and
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

Two header styles scale with the window from 1,024 px and are utilities, not steps of the scale
(§7.4): `header-title`, 16 to 18 px on a 24 px line, and `header-nav-item`, 15 to 16 px on a 26 px
line. Below 640 px the site title is `body` at 700 on `label`'s 22 px line.

Three Homepage styles are utilities beyond the scale too (spec #239 "Tokens"), each at 700 with
-0.01 em letter spacing:
`hero-headline`, 29 / 42 below 640 px, 34 / 48 from 640 px, and from 1,024 px 34 to 44 px with the
window on a line of 1.42; `hero-headline-alone`, the headline with nothing Featured, 29 / 42, then
38 / 54 from 640 px and 52 / 74 from 1,024 px; and `section-title`, a Homepage section's H2, 26 /
38, then 36 / 48 from 640 px and 42 / 54 from 1,024 px.

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
| `text-secondary-on-soft` (the tagline) on the header's surface over `brand-dark`, the darkest fill a page scrolls under it (`text-secondary` there would be 4.15:1) | 4.73:1 |
| `brand-primary` on the header's surface over `brand-dark` | 5.39:1 |
| `surface-base` at 70 % (the footer's quiet text) on `brand-dark` | 6.83:1 |
| `accent-warm` on `surface-base` | 1.58:1: a fill or decoration, never text |

There is no alert colour: a status is stated in text, and colour supports it.

## 4. Typography

- **Typeface:** Noto Sans Thai, self-hosted through Astro's Fonts API (`astro.config.mjs`,
  `src/assets/fonts/README.md`).
- **Headings:** a page's H1 is H3 size below `sm`, H2 size from `sm` and H1 size from `lg`. A
  Homepage section's H2 is `section-title` (§3.1), under a label at label size between slashes. The
  Homepage's H1, the site title, is out of sight: the hero's headline shows in its place (§8.1).
  Keep the `h1` → `h2` → `h3` order whatever the visual size.
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
  excepted), every card and row title, the Featured title, and the site title in the header, the
  footer and the Contact Summary.
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
  2026-11-11: #241 comment 6791096480, item 1): 16 px in the heading's link, 20 px in the search's
  submit button, on the Featured card and on a Homepage Service card. The hero's search field opens with a 20 px `search`
  icon, and a section heading's tile and the plain visual's tile hold a 24 px icon. Every Service card shows
  the one Service icon, `hand-heart`.
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
  - `sm`, from 640 px: wider phones and tablets, where the Homepage's hero takes two columns;
  - `lg`, from 1,024 px: desktop, with the two-column layouts (News beside
    Announcements, the post pages, the MOIT page's table of contents).
  - `md` and `xl` are not used.
- **Widths checked:** 1,440 px (desktop, Concept v1's frame), 375 px (a common phone, where the
  phone Homepage is measured) and 320 px (reflow, WCAG 2.2 SC 1.4.10). A rule from `lg` is checked
  at 1,023 and 1,024 px (CODING_STANDARDS "Tests").
- **Container:** the 1,200 px content column, centred (`page-container`), with a gutter of 16 px
  below `sm` and 24 px from `sm`, so a 1,440 px window has 120 px either side.
- **Spacing:** the 4/8/12/16/24/32/48/64/80 px rhythm. A Homepage section has 32 px above and below
  it below `sm`, 64 px from `sm` and, for most, 80 px from `lg`.
- No horizontal carousel for primary content and no fixed-height text container: Thai text, 200 %
  zoom and changed text spacing reflow.

## 7. Components

### 7.1 Shared components

Pages reuse the shared pieces in `src/components/` (CODING_STANDARDS "Public pages"). The ones
this document names:

| Area | Components |
| --- | --- |
| Shell | `src/layouts/SiteLayout.astro`: the sticky header with the identity (`SiteLogo`), the main navigation, the search link and the mobile menu; the footer |
| Headings | `PageHeading`, `SectionHeading`, `ThaiTitle` |
| Cards | `ContentCard` (News, Health Content), `ActivityCard`, `ServiceCard`, `QuickLinkCard`, `PersonCard` |
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
  ContentCard (News, Health News and Health Content lists), ServiceCard (the catalog)
  and ActivityCard (list and Homepage) has one native link named by its title alone. The
  picture/fallback, icon, metadata, summary and padding all open its original destination.
  H2 titles on lists and H3 under Homepage sections name a full-surface native link through
  `aria-labelledby`. Other content stays outside the link's visible label and remains readable,
  with no nested anchors or another focus stop. Enter, modified clicks and new-tab actions work.
- **Interaction:** hover adds a 2 px `brand-primary` ring without moving/resizing the card and
  makes its title green and underlined. The resting border/shadow remains; keyboard focus uses
  the global 3 px outline around the whole card. The Homepage's separately composed News and
  Health Information cards, its Service cards (§8.4), and multi-action cards, keep their own
  interactions.
- **Crops:** an Activity card crops its picture to 16:9 (`ActivityCard.astro`), and a News or
  Health Content card in a list to 16:10 (`ContentCard.astro`); the Homepage's News and Health
  Information cards show no picture. Both crops centre on the middle, or around the focal point
  that the field's value carries. A One Page in a card therefore shows its middle, where its photo
  collage is (Product Owner: "คงครอปกลางภาพแบบเดิม (แนะนำ)"; spec #144 names the 16:9 crop, exact
  for Activity cards only).
- Without a picture, or when its media item was deleted, a card shows a plain visual that keeps
  the grid even.
- **Compact cards**, the Homepage's below 640 px (§8.2):
  - their side padding is 12 px, a measured fit: a card keeps 112 px for a title at 320 px, and
    "ความดันโลหิตสูง" is 107 px at body size, semibold;
  - the title is at body size, semibold, and the Health Content cards leave out their summary;
  - a Quick Link card's label lies across the card's content width, and its 24 px arrow on a row
    of its own at the lower right, at least 8 px below the label. The card grows with its label,
    with no one fixed height, and the cards of a row share one height. One line of label makes it
    84 px tall (a 26 px line, the 8 px gap, the arrow, 24 px of padding and a 2 px border), the
    taller proportions the Product Owner accepted (#190 comment 6707205912, Quick Access B).
  - `compact` is a prop only the Homepage passes: `/about`, `/health`, `/ita` and the Activities
    list keep the full cards.

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
- The public-browser suite goes through all five lists, with Documents' three selects and the
  directory's Area and name fields. The applied and draft states, the first-page restart and the
  keyboard run at 320 px, and JavaScript-disabled pages at 320 and 1,440 px. Target height, look and
  fit run at 320, 375, 639, 640, 768, 1,023, 1,024 and 1,440 px, hover at 1,440 px, and axe, focus
  and reflow at 320, 375 and 1,440 px.

## 8. Homepage

Source: `current/04-homepage.md` v2.6 and `current/03-sitemap.md` v2.6. The sections, in `04` §3's
order:

1. Header / navigation / reachable search.
2. Featured (optional; one item, not an autoplay carousel).
3. Frequently Used Services (curated, up to 6).
4. Latest News + Current Announcements.
5. Health Information (the latest 4 Health Content items).
6. Health Service Discovery (a form into `/health-services`, no directory on the Homepage).
7. Activities (the latest, by when they were held).
8. Quick Access (optional, up to 4 shortcuts to canonical destinations).
9. Contact Summary (the office's address, telephone and hours; a static map stand-in).
10. Footer.

Each section between the hero and the Contact Summary opens with `SectionHeading` (spec #239
"Section headings"): an icon tile (72 px, 52 px below `sm`; a `brand-primary` to `brand-dark`
gradient with an `accent-warm` icon, or `accent-warm` with a `brand-dark` icon on a dark surface),
a label between slashes, and the H2. The label is `brand-primary`, `accent-warm` on `brand-dark`,
and `surface-base` on the deep field (§8.4). Frequently Used Services, Health Information and Activities
are named as their lists are ("บริการประชาชน", "ความรู้สุขภาพ", "กิจกรรม"), and their heading holds
a pill link to that list that reads "ทั้งหมด", named "ดู…ทั้งหมด" with the section's name; below `sm`
it is a round 44 px arrow button with the same name. A heading has no lead; the News and
Announcements, Health Service Discovery and Quick Access sections take the heading now and keep
their titles until their own tickets (#241 comment 6791096480, item 4).

From `lg`, Health Information shows 4 to a row, Activities 3 and Quick Access 4. Below `lg` each
shows 2 to a row, 12 px apart below `sm` and 24 px from `sm`. The Frequently Used Services have
their own grid (§8.4).

### 8.1 Hero and Featured

The hero (`HomeHero`; spec #239 "Hero and Featured") opens the page on the deep green field
(`HomeDeepField`), which it shares with the Frequently Used Services (§8.4) and whose lower
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

Below 640 px the Homepage is shorter, with every section kept in its order (Product Owner: "โอเค
เฉพาะหน้าแรก"; `04` §15). From `sm` it is as before, except that tablets show 4 Activities.

- Each section after the deep field has 32 px of space above and below it.
- The Contact Summary's lead and the map stand-in are hidden.
- Health Information, Activities and Quick Access go two to a row, 12 px apart, in compact cards
  (§7.3). The Frequently Used Services go one to a row (§8.4).
- The News card's summary is clamped to three lines.
- Phones and tablets show the latest 4 Activities, two by two; a desktop row shows 3.

The Homepage's height with the demo dataset, measured on 2026-11-11 at the application code of
`feat/008-242-services-cards` `75e1765` with `scripts/capture-screenshots.mjs`: 4,825 px at
1,440 px, 5,696 px at 375 px and 6,301 px at 320 px.

The Product Owner accepted the phone Homepage at 5,771 px at 375 px with the prototype's data, in
place of the grill's target of about 5,000 px (spec #144). The height moves with the titles and the
number of items.

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
  It holds the Service icon, `hand-heart`, in a `surface-soft` tile of 56 px (48 px below `sm`),
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

**What the Product Owner picked** on the Feature 006 prototype, with the legacy site's real content
(spec #144 Further Notes):

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
- **The phone Homepage's height** moves with the titles and the number of items (§8.2).
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
  Activity's folded photos are native disclosures that name their state.
- Touch targets of about 44×44 CSS px, with room between them.
- Contrast: WCAG 2.2 AA (§3.2).
- An informative image has alt text, a decorative one empty alt. A card's or the Featured picture
  is decorative, as its title names the link. An icon-only button has a name, and the search input
  a label.
- No autoplay and no motion that carries meaning.
- The public suites check each template at 1,440 and 320 px with axe (WCAG 2.2 AA tags), focus on
  every stop and no sideways scrolling at 320 px, and at 375 px where a spec names it
  (CODING_STANDARDS "Tests"). There are no pixel tests: the look is the Product Owner's review of
  each pull request's screenshots at 1,440, 375 and 320 px.

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

- Product/behavior: `docs/website-modernization-docs/current/04-homepage.md` (v2.6, 2026-11-09);
  `03-sitemap.md` (v2.6, 2026-11-08); staff guidance in `05` §5.1.
- Architecture: `docs/website-modernization-docs/current/10-system-blueprint.md` (v2.9,
  2026-11-09); `README.md`; `CLAUDE.md`.
- Decisions: ADR 0001 (Tailwind CSS v4), ADR 0003 (CMS images in production), ADR 0007 (the
  design's source).
- Feature 006: spec #144 and tickets #145 to #151.
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

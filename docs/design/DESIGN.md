# Songhealth — Design System & Public UI Contract

> **Status:** v1.1, current. Feature 006's design was accepted on #144; Feature 007's
> bounded refinements follow spec #190 as its tickets are implemented. Feature 007 acceptance
> remains the Product Owner's decision.
> **Updated:** 2026-11-08 (Feature 007 #191–#193); first drafted 2026-10-30
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
> This amendment implements #191–#193;
> the other selected refinements follow in their tickets.

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
   tokens, the base styles (the page gutter and the focus ring), two utilities (`page-container`
   and `focus-ring-on-dark`) and the `.rich-text` typography of Portable Text bodies, which EmDash
   renders as plain HTML that takes no utility classes.
4. No other plain CSS selectors for component styling, no CSS Modules, Astro `<style>` blocks or
   CSS-in-JS, and no Tailwind v3 setup or `tailwind.config.js`. An inline `style` carries only a
   value computed from content: the Featured picture's width from its stored size (§8.1).
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
| `brand-dark` | `#123c33` | headings, the Featured hero, dark bands |
| `accent-warm` | `#f3c95f` | a status that needs attention, the skip link, the focus ring and eyebrows on dark surfaces |
| `text-primary` | `#16211d` | body text |
| `text-secondary` | `#65736d` | leads, meta lines |
| `bg-page` | `#f6f9f7` | the page |
| `surface-base` | `#ffffff` | cards, white bands |
| `surface-soft` | `#eaf5f0` | soft bands, the Contact Summary |
| `border-default` | `#dce7e2` | borders |
| `topic-green`, `topic-blue` | `#ebf7f0`, `#f0f5fc` | Health Information cards |
| `divider` | `#dbe8e3` | Announcement list separators |
| `hero-visual-from`, `-to` | `#bae0cf`, `#f2d17a` | the Featured visual without a picture |
| `activity-visual-from`, `-to` | `#bfdcce`, `#e8f0d9` | an Activity card without a picture |
| `contact-visual-from`, `-to` | `#d1ebde`, `#e8f0cc` | the Contact Summary's map stand-in |
| `hero-chip`, `hero-secondary-fill`, `hero-secondary-border` | white at 12 %, 6 %, 28 % | the Featured eyebrow chip and secondary link |
| `text-secondary-on-soft` | `#5d6a64` | secondary text on `surface-soft` (contrast fix, #51) |
| `border-input` | `#7a8a83` | input boundaries (contrast fix, #51) |

Type, Noto Sans Thai, as size / line height / weight in px:

| Token | Style | Token | Style |
| --- | --- | --- | --- |
| `display` | 60 / 72 / 700, used by no template | `body-large` | 18 / 30 / 400 |
| `h1` | 46 / 58 / 700 | `body` | 16 / 26 / 400 |
| `h2` | 34 / 46 / 600 | `label` | 14 / 22 / 500 |
| `h3` | 24 / 34 / 600 | `small` | 13 / 20 / 400 |

Radii are named by their size in px: 14, 16, 18, 20, 22, 24, 26 and 32, and `pill` (999 px). One
shadow, `card`: `0 10px 15px rgb(13 46 36 / 0.08)`. One container, `content`: 75 rem (1,200 px).

### 3.2 Contrast

The ratios of the pairs the pages use, computed from the token values (WCAG 2.2 AA: 4.5:1 for text,
3:1 for large text, input boundaries and focus indicators):

| Pair | Ratio |
| --- | ---: |
| `text-primary` on `surface-base` | 16.54:1 |
| `surface-base` on `brand-dark` | 12.21:1 |
| `brand-primary` on `surface-base`, or `surface-base` on `brand-primary` | 6.45:1 |
| `brand-primary` on `bg-page` | 6.09:1 |
| `text-secondary` on `surface-base` | 4.97:1 |
| `text-secondary` on `bg-page` | 4.69:1 |
| `text-secondary-on-soft` on `surface-soft` (`text-secondary` there would be 4.45:1) | 5.07:1 |
| `border-input` on `surface-base`, `bg-page`, `surface-soft` | 3.63, 3.42, 3.25:1 |
| `accent-warm` focus ring on `brand-dark`, `brand-primary` | 7.75, 4.10:1 |
| `accent-warm` on `surface-base` | 1.58:1: a fill or decoration, never text |

There is no alert colour: a status is stated in text, and colour supports it.

## 4. Typography

- **Typeface:** Noto Sans Thai, self-hosted through Astro's Fonts API (`astro.config.mjs`,
  `src/assets/fonts/README.md`).
- **Headings:** a page's H1 is H3 size below `sm`, H2 size from `sm` and H1 size from `lg`. A
  section heading is H3 size and H2 size from `lg` (H1 size on a dark band), under an eyebrow at
  label size. Keep the `h1` → `h2` → `h3` order whatever the visual size.
- **Copy:** concise, natural Thai. Dates and categories sit below the title in emphasis, and colour
  is never the only cue. No hard-coded dates, opening hours, news, phone numbers or service status.

### 4.1 Thai titles keep compound words whole

The dictionary the browser uses (ICU) splits Thai compound words, such as "เบา|หวาน",
"ความ|ดัน|โลหิต", "ปฏิบัติ|งาน" and "อำเภอ|สอง" (spec #144 "Problem Statement" and "Version-specific
evidence"). A title therefore keeps the words of a curated list on one line:

- **The list:** spec #144's 26 words, in `src/lib/thai-title.ts`.
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
- **The compact header:** the site title uses the space beside the logo and icon-only menu at
  its existing type size (§7.4; #190 comment 6707205912). Its line count depends on the configured
  title, logo and tagline; it has no fixed line count. ThaiTitle still keeps listed words whole.
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
  `arrow-up-right` (Product Owner, #51 comments 6536026977, 6536052180). Every Service card shows
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
  - `sm`, from 640 px: wider phones and tablets;
  - `lg`, from 1,024 px: desktop, with the two-column layouts (the Featured hero, News beside
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
| Shell | `src/layouts/SiteLayout.astro`: utility bar, header, main navigation, the mobile menu, footer |
| Headings | `PageHeading`, `SectionHeading`, `ThaiTitle` |
| Cards | `ContentCard` (News, Health Content), `ActivityCard`, `ServiceCard`, `QuickLinkCard`, `PersonCard` |
| Homepage | `FeaturedHero`, `SearchForm` |
| Posts | `PostHeader`, `PostColumns`, `PostBody`, `ActivityPhotos`, `RichText` |
| Links | `ActionLink` (buttons), `ArrowLink` (onward links), `Pagination`, `Breadcrumb` |

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
  ContentCard (News, Health News and Health Content lists), ServiceCard (catalog and Homepage)
  and ActivityCard (list and Homepage) has one native link named by its title alone. The
  picture/fallback, icon, metadata, summary and padding all open its original destination.
  H2 titles on lists and H3 under Homepage sections remain inside the link, without nested
  anchors or another focus stop. Enter, modified clicks and native new-tab actions work.
- **Interaction:** hover adds a 2 px `brand-primary` ring without moving/resizing the card and
  makes its title green and underlined. The resting border/shadow remains; keyboard focus uses
  the global 3 px outline around the whole card. The Homepage's separately composed News and
  Health Information cards, and multi-action cards, keep their own interactions.
- **Crops:** an Activity card crops its picture to 16:9 (`ActivityCard.astro`), and a News or
  Health Content card in a list to 16:10 (`ContentCard.astro`); the Homepage's News and Health
  Information cards show no picture. Both crops centre on the middle, or around the focal point
  that the field's value carries. A One Page in a card therefore shows its middle, where its photo
  collage is (Product Owner: "คงครอปกลางภาพแบบเดิม (แนะนำ)"; spec #144 names the 16:9 crop, exact
  for Activity cards only).
- Without a picture, or when its media item was deleted, a card shows a plain visual that keeps
  the grid even.
- **Compact cards**, the Homepage's below 640 px (§8.2):
  - their side padding is 12 px, a measured fit: a Service card keeps 112 px for a title at
    320 px, and "ความดันโลหิตสูง" is 107 px at body size, semibold;
  - the title is at body size, semibold, and the Service and Health Content cards leave out their
    summary;
  - a Service card's icon box is 36 px, and a Quick Link card is 56 px tall.
  - `compact` is a prop only the Homepage passes: the Service catalog, `/about`, `/health`, `/ita`
    and the Activities list keep the full cards.

### 7.4 Header and navigation

`src/layouts/SiteLayout.astro` (#191; spec #190 “Header below 1024 px”; Product Owner,
#190 comment 6707205912, Header B):

- Below 1024 px, the utility bar shows only “ค้นหา” and “ติดต่อเรา”, to `/search` and `/contact`.
  Each link has a minimum 44 px target height. The repeated office/province label is hidden.
- The native `<details>` menu opens in the page flow without client JavaScript. Its 44×44 px
  pill shows a 20 px Lucide menu icon while closed and X while open, with no visible text.
  Screen-reader-only “เปิดเมนู” / “ปิดเมนู” labels name its state; the browser supplies the native
  expanded state and Enter/Space operation. The same control closes it; it adds no Escape handler.
- The identity reserves 64 px for the 44 px control and the gap. Its title takes the released
  space beside the logo; text remains 16 px below 640 px, 18 px from 640 px and 24 px from 1024 px.
  The logo or decorative placeholder, optional tagline and ThaiTitle rendering keep their roles.
- From 1024 px, the full utility bar, office/province label and desktop navigation remain.
  The same navigation order, destinations and current-section marks serve both presentations.
- Before/after evidence records the runtime-verified commit and the title/logo/tagline settings.
  Line counts are observations of those settings, never a universal requirement. The existing
  public-shell suite verifies 320/375 px reflow, both sides of 1024 px, keyboard/focus, axe,
  JavaScript-disabled navigation and configured/fallback identities, restoring settings in `finally`.

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

## 8. Homepage

Source: `current/04-homepage.md` v2.5 and `current/03-sitemap.md` v2.6. The sections, in `04` §3's
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

From `lg`, Frequently Used Services show 3 to a row, Health Information 4, Activities 3 and Quick
Access 4. Below `lg` each shows 2 to a row, 12 px apart below `sm` and 24 px from `sm`.

### 8.1 Featured

- **The picture** shows whole at its own aspect ratio, never cropped, at most 408 px tall at every
  width: the office's landscape pictures are text banners, and its portrait ones are One Pages. A
  narrower picture, such as a One Page, is centred on the band. Its width cap comes from the size
  EmDash stores with the image, so the image's box is the picture itself. An item without a picture
  shows the gradient visual.
- **The title** is H3 size, H2 size from `sm` and H1 size (46/58) from `lg`, with `text-balance`,
  so the hero leaves room on the first screen (Product Owner: "หัวข้อเรื่องเด่นเล็กลง").
- **The lead** shows four lines at most, three below 640 px.
- With nothing Featured, a dark band holds the site title and tagline.

### 8.2 Phones

Below 640 px the Homepage is shorter, with every section kept in its order (Product Owner: "โอเค
เฉพาะหน้าแรก"; `04` §15). From `sm` it is as before, except that tablets show 4 Activities, and on
a desktop only the Featured hero changed.

- Each section has 32 px of space above and below it.
- The section headings' leads, the Contact Summary's lead and the map stand-in are hidden.
- The Frequently Used Services, Health Information, Activities and Quick Access go two to a row,
  12 px apart, in compact cards (§7.3).
- The News card's summary is clamped to three lines, as the Featured lead is.
- Phones and tablets show the latest 4 Activities, two by two; a desktop row shows 3.

The Homepage's height with the demo dataset, measured on 2026-11-05 at the application code of
`006-frontend-design` `571b222` with `scripts/capture-screenshots.mjs`: 5,736 px at 1,440 px,
5,821 px at 375 px and 6,196 px at 320 px.

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

## 9. Post pages: News, Activity and Health Content

### 9.1 The header and two columns

- **The header** (`PostHeader.astro`): a News item's category, the title as the page's one H1, the
  summary under it with the line breaks staff typed, and the publication date; Health Content's
  review date follows. Every News and Activity states its story in words, at least its summary,
  as a One Page's text is an image (grill Q14; `05` §5.1).
- **From `lg`, a post with a picture reads in two columns** (`PostColumns.astro`):
  - on the left, the page's text in its order: the header, then an Activity's details card, or a
    News or Health Content post's body, source and topics;
  - on the right, a 28 rem column, 48 px from the text, with the picture whole and
    "เปิดภาพขนาดเต็ม", a link to the file as it was uploaded;
  - the picture is sticky 1.5 rem from the top: it stays in view while the left column scrolls and
    stops at the end of the two columns. Anything full width, such as an Activity's photos, comes
    after them, so the picture never covers it.
- **Below `lg`**, one column in the page's order: the header, the picture, then the body, source
  and topics (News, Health Content); the header, the details, the picture, then the photos
  (Activity). "เปิดภาพขนาดเต็ม" shows at every width (Product Owner, #147 comment 6634124888
  item 1). A post without a picture keeps one column.
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
  - a configured header title can occupy multiple lines; its space and type follow §7.4.
- **A compact Quick Link card's label** has about 80 px beside its arrow at 320 px. Six listed words
  are wider at body size, semibold: ความดันโลหิตสูง 107 px, ตรวจคัดกรอง 91, ออกกำลังกาย 90,
  ประชาสัมพันธ์ 89, ความดันโลหิต 89 and ประจำหมู่บ้าน 87. A label holding one of them runs into
  the arrow below about 342 px, and one holding ความดันโลหิตสูง below about 374 px (#146 comment
  6626919820 item 1).
- **The phone Homepage's height** moves with the titles and the number of items (§8.2).
- **Post pages** (#147 comment 6634124888 items 2 and 4):
  - the picture follows only while the left column is the longer;
  - a picture taller than the window shows its lower part as the block ends;
  - a News or Health Content post with no body, source or topics keeps an empty row and its 2 rem
    gap, seen only when its header is taller than its picture.
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

## 13. References and change history

- Product/behavior: `docs/website-modernization-docs/current/04-homepage.md` (v2.5, 2026-11-05);
  `03-sitemap.md` (v2.6, 2026-11-08); staff guidance in `05` §5.1.
- Architecture: `docs/website-modernization-docs/current/10-system-blueprint.md` (v2.8,
  2026-11-05); `README.md`; `CLAUDE.md`.
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

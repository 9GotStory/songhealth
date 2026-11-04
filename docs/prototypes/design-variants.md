# Feature 006 prototype: three design variants

A throwaway prototype of the Feature 006 frontend-design grill (2026-11-04, Q1–Q14), built on
2026-11-04. It lives on the branch `prototype/design` only; `main` keeps the decisions, not the
code. The development runtime served it while the Product Owner reviewed it.

## The question

What should the public site look like? The grill named what fails now (a template look, no
identity, a Featured hero that fills the first screen, Thai lines that break inside words, detail
pages that use 768 of 1,200 px on desktop, and a Homepage of about 9,300 px at 375 px) and asked
for three code variants and two ways to show a One Page.

## What was built

- `?variant=0|1|2|3` on the existing routes, kept across links by a cookie (`src/middleware.ts`,
  `src/lib/prototype-design.ts`), with a floating switcher (`DesignSwitcher.astro`). Variant 0 is
  the current design.
  - **1, ต่อยอด Concept v1**: the Concept v1 palette and Noto Sans Thai, lists and dividers instead
    of most cards, a smaller Featured band, section headings on one row with their "all" link, and
    a side column on the Activity page.
  - **2, หน่วยงานราชการ**: the MOPH emblem's green #006838 on white, Sarabun, an agency header (a
    green band with the emblem in a white disc, the office's name, "กระทรวงสาธารณสุข" and a search
    field), dense lists led by their dates, square corners, underlined links and a yellow focus
    highlight.
  - **3, ชุมชน เน้นภาพ**: pictures lead, leaf green with light yellow, large Mitr headings over
    Noto Sans Thai Looped, and a magazine spread on the Activity page.
- `?onepage=frame|text` in every variant: **A** shows the One Page whole in a portrait frame on
  cards; **B** leads with the title and the Summary and shows a small One Page or none. The detail
  page shows the One Page in full either way.
- Pages: the shell with the mobile menu, the Homepage, `/activities`, one Activity page and
  `/documents`. Other pages keep their Feature 003 layout inside each variant's shell, with the
  Feature 003 tokens remapped to the variant's palette.
- `scripts/prototype-design.ts add|remove <dir>`: the stand-ins on the development runtime only,
  from files kept outside the repository. They are 12 legacy One Pages published as 4 News items
  and 8 Activities, each with a Summary typed from the One Page. A legacy landscape banner is
  published as a Featured News item in the Featured menu. The MOPH emblem is set as the site
  logo. `remove` puts the logo and the Featured menu back as `add` found them.
- Fonts: OFL builds from Fontsource 5.3.0 under `public/prototype/fonts/`, with their licences.

## What was learned

- The legacy site's landscape pictures (its homepage slider) are text banners too: a No Gift Policy
  declaration and a policy infographic. A Featured picture must show whole: no crop, no panel
  over it, and a Summary in words as for a One Page.
- ICU, which the browser uses to break Thai lines, splits compound words: "เบา|หวาน",
  "ความ|ดัน|โลหิต", "ปฏิบัติ|งาน", "อำเภอ|สอง" (Node 26.13.0 `Intl.Segmenter("th")` gives the
  same). The prototype keeps a short list of words on one line (`thaiTitleHtml`) as one way to fix
  it; the spec decides the real one.
- The Homepage at 375 px, with the same data, against the Q11 target of about 5,000 px: now
  9,246 px; variant 1 4,974 (A) and 4,930 (B); variant 2 5,020 and 4,829; variant 3 5,509 and
  5,509, which needs a further cut to reach the target.
- The office's name needs two lines in the phone header, so variants 1 and 3 move the phone
  search into the menu (the Homepage keeps its own search).
- Demo entries with landscape gradient pictures show as a band inside an A frame; a real landscape
  photo would show the same way.
- New behaviour the variants tried: a direct download from the Document list (2, 3), 4 News items
  on the Homepage (2), and the line "กระทรวงสาธารณสุข" under the office's name (2).

## The verdict

Pending the Product Owner's pick on the comparison page, a private claude.ai Artifact
(https://claude.ai/artifact/W7DrUZ4NXbFs7r5LhHcX4e).

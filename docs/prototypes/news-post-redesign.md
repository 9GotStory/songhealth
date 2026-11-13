# Feature 009 prototype: the News list and the Post page

A throwaway prototype of the redesign of the News, Health News and Health Content lists and of
the Post page (GLOSSARY: the page of one News, Activity or Health Content item), built on
2026-11-13. It lives on the branch `prototype/news-post-redesign` only; `main` keeps the
decisions, not the code. It is static HTML built by a script, and the development runtime never
served it.

**It is the source of the look, not of behaviour.** Each rule of the built pages belongs in the
feature's spec, `docs/design/DESIGN.md` and the code, ported from the spec with a test, not from
this code.

## The question

What should the News list and the Post page look like after the Homepage as it is built in `main`
(Feature 008, `DESIGN.md` §8)? The Product Owner's constraint: "เราจะต้องเป็นไปแนวทางเดียวกันของ
หน้าแรกนะ", with the reference "design หน้าแรก (ปัจจุบัน)" (2026-11-13).

The grill before it settled the scope (Product Owner, 2026-11-13, each answer "ตามที่แนะนำ"):

- the Post page of all three kinds, and the lists `/news`, `/news/health` and `/health/content`,
  which share one card grid; the Activities list waits for its own feature;
- a new heading for the redesigned pages only; the other pages keep `PageHeading`;
- every earlier behaviour stays: the two columns with the whole picture that stays in view,
  "เปิดภาพขนาดเต็ม", no empty trailing row (#198), the whole-card link (#193), and the pager, the
  filter form and the breadcrumb of Feature 007. The filter form, the pager, the empty state, the
  breadcrumb and a body's typography keep their look;
- no new field, address or section; twelve to a page, newest first;
- the Homepage's motion rules (`DESIGN.md` §8.12), with no new effect.

## What was built

`build.mjs` builds sixteen pages, one per case, each holding three variants switched by
`?variant=` and a floating bar:

- **A, "ตามหน้าแรกเต็มที่":** the heading on the deep green field, white cards over its lower
  edge, the newest item as the Homepage's large News card; a Post page's header on the field, its
  picture in a white frame over the field's edge.
- **B, "เบากว่า":** the heading on the page's colour in the section heading's block, even cards; a
  Post page's picture in a white frame and its text in a white card.
- **C, the Product Owner's picks** (below): A, with B's date and label line on a card and the
  field as measured.

The cases: a full first page of twelve with the pager, a second page, one, two, three and four
News, Health News before and after a Health Topic is chosen, no result, and the Health Content
list; a News post with a portrait One Page and a long body, with a landscape picture, without a
picture, and with a picture alone; an Activity with its details and twelve photos; a Health Content
post with its review date.

The stylesheet is `main`'s `src/styles/global.css` at `668d3e5`, compiled by Tailwind CSS 4.3.3
over the built pages (`@tailwindcss/node` `compile` and `@tailwindcss/oxide` `Scanner`, from the
installed packages), so every colour, radius, type size and utility is the built Homepage's. The
header and footer are the runtime's own markup.

- `extract.mjs` reads the content into `data.json`, `img/` and `shell.json`: the Legacy site's
  News and Activities from the migration's import plan and media archive
  (`~/.local/state/songhealth-migration/`, read only), and the demo dataset's cards and the shell
  from the runtime's public pages, with GET requests.
- `shoot-all.mjs` captures every case at 1,440, 1,024, 768, 375 and 320 px with each page's height
  and any overflow; `sheets.mjs` lays two variants side by side; `shoot.mjs` captures one address.

## What the branch holds

The builder scripts, as they ran from `.tmp/prototypes/news-post-redesign/` in the working clone,
which their headers and paths still name. The data they read, the pages they built, the pictures
and the screenshots are not here: they hold Legacy site content, and this repository is public
(Product Owner, 2026-11-13, F4). They stay in that folder on the development host.

The content mixed three sources, since the real content lacks several cases (Product Owner,
2026-11-13: "หรือเพิ่มรูปเองเลยก็ได้ ถ้าของจริงมันไม่ครบตามที่ทดสอบ"):

- the Legacy site's 41 News, 39 of them daily PM 2.5 reports with one One Page, no summary and no
  category, which is what a second page of News looks like after the migration;
- the demo dataset's News and Health Content, whose titles start "[ตัวอย่าง]", with Legacy
  Activities' One Pages as their pictures; the Legacy site has no Health Content;
- made-up text where a case needed it: a long title, a body with headings, a list, a link and a
  quotation, an Activity's details and captions. The Activity's twelve photos are One Pages
  standing in for photographs.

## The verdict (Product Owner, 2026-11-13)

On variants A and B, each answer "ตามที่แนะนำ":

1. The lists take A: the heading on the deep field, the cards over its edge, the newest item
   large.
2. The large card shows only on the first page of a list no Health Topic narrows, on all three
   lists; a later page and a narrowed list show even cards.
3. `/news` is headed as the Homepage's section: the label "ข่าวสาร" and the H1 "ข่าวประชาสัมพันธ์",
   where the H1 was "ข่าวสาร"; the menu and the breadcrumb keep "ข่าวสาร". Health News is "ข่าวสาร"
   and "ข่าวสุขภาพ", Health Content "สุขภาพ" and "ความรู้สุขภาพ".
4. A small card writes its date, a dot and its label on one line, B's, in place of A's pill over
   the picture's edge.
5. "ดูเฉพาะข่าวสุขภาพ" becomes a pill link, "ข่าวสุขภาพ" with an arrow, beside the heading.
6. The Post page takes A: the header on the deep field with the breadcrumb in white, the picture
   in a white frame over the field's edge, in view as today.
7. A post's text lies on the page's colour, not in a white card.
8. Its Health Topics are the Homepage's chips.
9. "ภาพกิจกรรม" is a section heading with its icon tile and the label "กิจกรรม".
10. A card's title shows three lines at most and its summary two, the summary from 640 px only.
11. A full page at two columns ends with one card alone, which is accepted.

On variant C:

- **The field under a heading** differs from the Homepage's in four ways, each from a measure
  (below): a small glow in its upper right corner from 640 px and the Homepage's phone glow below;
  no accent-warm glow and no small ring; the large ring from 1,024 px on a list and none on a Post
  page; the heading's link as a white pill; and its text in solid white.
- **The first page by count.** From 1,024 px, three columns: one item is the large card across the
  row; two are the large card, two columns wide, beside the other; three or more are the large
  card, two columns wide and two rows high, beside the next two, and the rest three to a row. From
  640 px the large card spans the row and the rest go two to a row. Below, the large card and then
  rows.
- **What moves:** a heading rises in as the page opens, as the hero's text does; a list's cards
  reveal as they come into the window, lift under the pointer, and their pictures grow and shimmer
  while loading; a Post page's header and picture frame rise in, and its text shows at once.

## What was measured

Variant C, with reduced motion preferred, full content, no element past the window at any of the
five widths in 80 captures. Heights in px:

| Case                  | 1,440 | 1,024 |   768 |   375 |   320 |
| --------------------- | ----: | ----: | ----: | ----: | ----: |
| `list-news-1`         | 2,643 | 2,523 | 3,362 | 2,599 | 2,855 |
| `list-news-2`         | 2,085 | 1,917 | 2,718 | 2,429 | 2,555 |
| `list-news-one`       | 1,041 | 1,041 | 1,019 | 1,021 | 1,147 |
| `list-news-two`       |   985 |   981 | 1,437 | 1,155 | 1,301 |
| `list-news-few`       | 1,393 | 1,369 | 1,437 | 1,289 | 1,455 |
| `list-news-four`      | 1,801 | 1,765 | 1,855 | 1,423 | 1,609 |
| `list-health-all`     | 1,925 | 1,859 | 2,256 | 1,851 | 2,107 |
| `list-health-topic`   | 1,467 | 1,383 | 1,802 | 1,517 | 1,773 |
| `list-health-none`    |   961 |   961 |   999 | 1,047 | 1,203 |
| `list-content`        | 1,885 | 1,819 | 1,939 | 1,665 | 1,923 |
| `post-news-portrait`  | 2,712 | 3,214 | 3,737 | 4,239 | 4,741 |
| `post-news-landscape` |   900 | 1,017 | 1,197 | 1,125 | 1,284 |
| `post-news-nopic`     | 1,388 | 1,388 | 1,400 | 1,680 | 1,896 |
| `post-news-onlypic`   |   923 |   923 | 1,321 | 1,036 | 1,107 |
| `post-activity`       | 1,979 | 1,867 | 2,928 | 2,261 | 2,336 |
| `post-health`         | 1,418 | 1,620 | 1,890 | 1,910 | 2,148 |

Today's pages on the development runtime at `668d3e5`, with the demo dataset: `/news` with six
News is 1,501 px at 1,440 px and 3,447 px at 375 px; a News post is 1,168 and 1,566 px.

The contrast of white text on the field, read with `main`'s `scripts/measure-text-contrast.ts`
(its copy with the import paths of the prototype's folder) at the five widths:

- With the Homepage's field as it is, a list's lead read 3.42:1 at 1,440 px, a Post page's H1
  2.89:1 and its summary 3.85:1 at 1,024 px, and the words of an outlined pill link 2.47:1 at
  1,440 px. Where the Homepage's large ring remained from 1,024 px, it crossed the summary of a
  post without a picture, 4.35:1.
- Text at 90 % white could not be read by the script: Tailwind writes it as `color-mix`.
- Variant C's lowest readings: the breadcrumb's current page 5.13:1 (a News post at 375 px), a
  Post page's H1 5.94:1, a list's lead 6.36:1, a post's summary 6.45:1, the pill link's words
  6.45:1, the review date 6.63:1, a list's H1 6.99:1 and its label 8.72:1. On the large card, over
  a One Page, the title read 7.18:1 and the summary 8.84:1.

## Where the built pages will differ

- The prototype lays variant A's Post page out with a `<style>` block and a grid whose first row
  is the field; the built page uses utilities alone (`DESIGN.md` §3 rule 4), and its measures
  (a 44 rem text column, a 3 rem gap, a 28 rem picture, the frame 4.25 rem under the field's top
  from 1,024 px and 3 rem over its edge below) are the prototype's, to be restated in the spec.
- The filter form, the pager's links and the control that unfolds an Activity's photos are
  pictures of themselves here; the built pages keep the components' behaviour.
- Titles do not keep Thai compound words whole (`ThaiTitle`), and pictures are files, not EmDash's
  renditions.
- The switching bar needs JavaScript; the built pages need none.
- Motion was not captured: the screenshots prefer reduced motion, and only a list's cards carry
  the reveal's class.

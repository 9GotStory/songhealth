# Feature 010 prototype: the Activities list, Announcements and Documents

A throwaway prototype of the redesign of the Activities list, the Announcements list and an
Announcement's page, and the Document repository and a Document's page, built on 2026-11-15. It
lives on the branch `prototype/activities-announcements-documents` only; `main` keeps the
decisions, not the code. It is static HTML built by a script, and the development runtime never
served it.

**It is the source of the look, not of behaviour.** Each rule of the built pages belongs in the
feature's spec, `docs/design/DESIGN.md` and the code, ported from the spec with a test, not from
this code.

## The question

What should `/activities`, `/announcements` with its pages and `/documents` with its pages look like
after the Homepage and Feature 009's pages as they are built in `main` (`DESIGN.md` §7.8, §8, §9)?

The grill before it settled everything but four looks (Product Owner, 2026-11-15, Q1 to Q16, each
answer "ตามที่แนะนำ"):

- the five routes in one feature; the look changes, and every read, order, page size, filter,
  canonical address, head tag, 404 and preview behaviour stays; no new field, address or section;
- the Document row's new look on `/documents` and under an Announcement's related Documents only;
  the other pages that show it, and an Activity page's photos, keep today's look;
- each list's heading on the deep field as `ListHeading`: Activities "ภาพกิจกรรม" / "กิจกรรม" /
  `heart`, Announcements "แจ้งให้ทราบ" / "ประกาศ" / `file-text`, as on the Homepage, and Documents
  "เข้าถึงข้อมูล" / "เอกสารเผยแพร่" / `folder-open`; no pill link; the Documents filter form over the
  field's edge; the Homepage's motion and tokens;
- `/activities` takes `/news`'s first-page rule by count, and a card's line reads the date, a dot
  and the Activity's place, the date alone without one;
- the Announcements list takes the Homepage's row, current Announcements first as today;
- a Document shows its download, or "ไฟล์ไม่พร้อมให้บริการ" when its file cannot be served, and a
  status pill only when superseded or expired;
- an Announcement's and a Document's page take the Post page's header on the field, though
  neither is a Post page: an Announcement's pills are "เผยแพร่" with its date and its type, a
  Document's its type and a superseded or expired status, without its publication date;
- "เอกสารที่เกี่ยวข้อง" takes the Homepage's section heading, label "เอกสารเผยแพร่";
- `GLOSSARY.md` gains **Current Announcement**.

## What was built

`build.mjs` builds seventeen pages, one per case, each holding two variants switched by
`?variant=` and a floating bar:

| Pages | A | B |
| --- | --- | --- |
| `/activities` | Feature 009's cards, the newest large | the Homepage's Activity tiles |
| `/announcements` | a closed one's status label in `status-closed` | its date tile in `status-closed` too |
| `/documents` | rows: the file's tile, the facts, the download at the right | cards, three to a row from `lg` |
| an Announcement's or a Document's page | a card over the field's lower edge | below the header; a Document's download on the field |

The cases: Activities a first page of twelve with the pager, a second page, one, two and four;
Announcements a first page of twenty and a second page ending with the closed ones; Documents a
first and a second page, narrowed by a type, and a filter that matches nothing; an Announcement
with dates, status, details and two Documents, and one from the Legacy site, closed and without
details; a Document with every field, a superseded one with its successor, one from the Legacy
site without a summary or a type, and one whose file cannot be served.

The markup is the built components', read from the development runtime's pages; the stylesheet is
`main`'s `src/styles/global.css` at `bd3c33f`, compiled by Tailwind CSS over the built pages
(`@tailwindcss/node` `compile` and `@tailwindcss/oxide` `Scanner`), so every colour, radius, type
size and utility is the built pages'. The header and footer are the runtime's own markup.

- `extract.mjs` reads the content into `data.json`, `img/` and `shell.json`: the Legacy site's
  Activities, Announcements and Documents from the migration's import plan and media archive
  (`~/.local/state/songhealth-migration/`, read only), and the demo dataset's items and the shell
  from the runtime's public pages, with GET requests. The demo pictures are saved locally.
- `shoot-all.mjs` captures every case at 1,440, 1,024, 768, 375 and 320 px with each page's height
  and any overflow (`WIDTHS=` narrows it); `sheets.mjs` lays A and B side by side; `clean.mjs`
  prints a saved page's `<main>` without dev attributes.

## What the branch holds

The builder scripts, as they ran from `.tmp/prototypes/activities-announcements-documents/` in the
working clone, which their headers and paths still name. The data they read, the pages they built,
the pictures and the screenshots are not here: they hold Legacy site content, and this repository
is public. They stay in that folder on the development host.

The content mixes the Legacy site's items, the demo dataset's (titles that start "[ตัวอย่าง]") and
what the prototype invents where a case needs it, each marked `MADE_UP` in `build.mjs`: a place on
every third Legacy Activity, past open and close dates on four Legacy Announcements, one expired
Legacy Document and one whose file cannot be served.

## Measured

Chromium, reduced motion preferred. No element is past the window at any of the five widths in any
of the 170 captures. Text contrast, `scripts/measure-text-contrast.ts --all-text` on the
prototype's pages at the five widths: the lists' heading and lead on the field 6.45:1 or more; an
Activity's date pill 7.75:1, its place and title over a picture 6.97:1 or more (A's large card at
1,440 px) and 8.69:1 or more on B's tiles; a Document's "PDF" on its tile 5.68:1, its facts line
4.97:1, its download 6.45:1, an attention pill 7.75:1; on a page's field the H1 6.28:1 or more, a
breadcrumb's current page 5.20:1 or more, B's download 7.75:1 and its file size 6.63:1; a closed
Announcement's status label 13.85:1 and its end date 4.97:1. B's grey date tile first wrote its
month in `text-secondary`, 4.16:1, and was changed to `text-primary`, 13.85:1, before the pick.

## The verdict (Product Owner, 2026-11-15)

On variants A and B, each answer "ตามที่แนะนำ":

1. `/activities` takes A, Feature 009's cards: a Legacy Activity's picture is a portrait One Page
   that B's tile crops to a strip, and B's small tile shows neither date nor place below 640 px.
2. A closed Announcement takes B: its status label and its date tile in `status-closed`, the month
   in `text-primary`.
3. `/documents` takes A, rows, as an Announcement's related Documents do.
4. An Announcement's and a Document's page take A: one card over the field's lower edge, holding a
   Document's file and download above its details, and an Announcement's details.

Known: the download on a Document's row is new; today's row names the file's type and size without
a link to it (grill Q6).

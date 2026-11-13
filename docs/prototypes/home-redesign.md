# Feature 008 prototype: the Homepage redesign

A throwaway prototype of the Homepage redesign (Feature 008, spec #239), built on 2026-11-10 and
2026-11-11. It lives on the branch `prototype/home-redesign` only; `main` keeps the decisions,
not the code. It is static HTML built by a script from what the development runtime's public
pages showed, and the runtime never served it.

**It is the source of the look, not of behaviour.** Each rule of the built page is in spec #239,
`docs/design/DESIGN.md` §8 and the code, ported from the spec with a test, not from this code
(spec #239 "Further Notes").

## The question

What should a redesigned Homepage look like? The Product Owner found the site too plain,
"ตอนนี้ฉันอยากปรับปรุง design frontend ทั้งหมด เนื่องจากมันดูเรียบง่ายเกินไป อยากให้เป็นแนวทาง modern
minimal ไม่รก แต่ข้อมูลพื้นที่ใช้อย่างมีประโยชน์ คุ้มค่า ไม่ปล่อยให้ว่างเปล่าจนโล่ง", and asked for a
new design rather than fixes to the current one: "รอบนี้ออกแบบใหม่เลย" (2026-11-10).

## What was built

Every variant keeps the section order of `04-homepage.md` §3, the tokens' colours and radii and
Noto Sans Thai, and shows the content the development runtime held at `cba17a4`.

- `docs/prototypes/home-redesign/build.mjs` builds `home-redesign.html`: three structurally different
  Homepages, switched by `?variant=A|B|C` and a floating bar.
- `build-gov.mjs` builds `home-gov.html`: variant **G**, "modern
  government, minimal", flat surfaces and hairlines.
- `build-bold.mjs` builds `home-bold.html` and `home-bold-empty.html`:
  variant **H**, "bold modern", with full content and with content missing (nothing Featured, no
  current Announcement, four Services, three Activities, items without pictures). It also takes
  the screenshots of both.
- `extract.mjs` reads the runtime's public pages into `data.json`, with read-only requests;
  `fit.mjs` measures each page's height, overflow, header height and small targets at 1,440,
  1,280, 1,024, 1,023, 768, 640, 639, 390, 375 and 320 px; `shoot.mjs`, `crop*.mjs`,
  `check-focus.mjs`, `check-load.mjs`, `overflow.mjs` and `probe.mjs` take the close-ups the
  session looked at; `ref-shoot.mjs` and `ref-shoot-up.mjs` capture the two reference sites.

## What the branch holds

The builder scripts, as they ran from `.tmp/prototypes/home-redesign/` in the working clone,
which their headers and paths still name. The data they read (`data.json`), the pages they built,
the pictures, the screenshots and the captures of the two reference sites are not here: they hold
Legacy site content and other organisations' pages, and this repository is public (Product Owner,
2026-11-13: #250 comment 6841312242, item 4). `extract.mjs` read the Homepage as it was at
`cba17a4`, so it no longer matches the built Homepage's markup.

## The verdict (Product Owner)

- Variant G was turned down on 2026-11-11: "มันยังดูธรรมดา เรียบง่ายเกินไป ไม่ได้ดูทันสมัย หรือ
  สมัยใหม่เลย", with <https://spss.up.ac.th/default> and <https://www.up.ac.th/> named as the look
  to aim for.
- Variant **H** was accepted as the direction: "แบบนี้สิ ดูดีขึ้นมาเยอะเลย".
- On variant H the Product Owner then decided: a Leadership strip before Latest News, compact
  ("เห็นด้วยกับแบบที่ 2"); no "ติดต่อเรา" in the header; Quick Access out of view; the
  Announcements' category badges in separate colours; five Activities; and the longer phone and
  tablet page. Spec #239 "Decisions the Product Owner made" quotes each.

## What was measured

Spec #239 "Measured in the prototype" holds the table: variant H is 5,537 px high at 1,440 px,
7,322 px at 768 px and 6,319 px at 375 px with full content, with no element past the window at
any of the ten widths. The prototype was built at 720 and 1,100 px breakpoints first and then
moved to 640 and 1,024 px; the measures are of the moved version.

## Where the built page differs

The built Homepage is the spec's, with the decisions each ticket recorded (#240 to #249, and
`docs/design/DESIGN.md` §13). Among them: the menu below 1,024 px is a native `<details>`, where
the prototype toggles it with a script; onward links end in `arrow-right` at the icon sizes of
`DESIGN.md` §5, where the prototype has a 120 px heart on a card without a picture; the Leadership
strip's heading has no icon tile; a Health Topic badge wraps, where the prototype cuts it; the
section labels on the deep field and the bands are white, where the prototype's `accent-warm`
measured too low; and the decorations stand still, where the prototype's glows drift and its rings
turn (#249 comment 6838503280).

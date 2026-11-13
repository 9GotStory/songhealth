# #250 evidence: Feature 008 (the Homepage redesign) on the development runtime

Feature 008's evidence round (spec #239), run on 2026-11-13 by Claude Code at `94b8621`, the head
of `008-homepage-redesign`, and the Product Owner's walkthrough of the same day. This is a
self-run record, not an independent review, and not the Product Owner's acceptance, which the
Product Owner gives on #239.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`. It already served
  `94b8621`, promoted after #249's retro, so this round promoted nothing. No window held it.
  `dev-runtime-verify.sh` reported VERIFY: PASS at `94b8621e6f37594a3cf6faab5be0568a98aa5941`
  before the round (01:10Z) and after the walkthrough (01:43Z).
- **Code under test:** `94b8621`. #250's branch adds documents and one screenshot fixture
  (`scripts/screenshot-fixtures/homepage-no-leadership.ts`) over it, so its head has `94b8621`'s
  application code. Node 26.13.0.
- **Content:** the demo dataset, 56 entries, all published, and each suite's and each capture's
  own synthetic fixtures, which it removes.

## Checks

The runtime checks ran at `94b8621` between 01:10Z and 01:37Z. The local checks ran on #250's
working tree between 01:38Z and 01:42Z, before the record was written, and again at the commit
that holds this record.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | exit 0: 0 errors, 0 warnings, 2 hints |
| Node seam | `npm run test:node` | 742 of 742 passed |
| Build | `npm run build:check` | exit 0 |
| The other CI checks | `npm run format:check`, `knip`, `jscpd`, `lint:shell` | each exit 0; jscpd's baseline unchanged at 21 clones |
| Browser seam | `scripts/dev-runtime-env.sh npm run test:browser` | 537 passed, 14 skipped, in 22.1 minutes |
| T021 public reads | `scripts/dev-runtime-env.sh node tests/browser/run-cms-public-reads.mjs` | 14 of 14 passed, no owned-fixture residue |
| Residue | `scripts/dev-runtime-residue.sh` | RESIDUE: NONE; the 404 log held 189 misses, all synthetic; 0 database connection errors in the last hour |
| 404 log | `scripts/dev-runtime-residue.sh --clear-404-log` | cleared before the walkthrough |

The 14 skipped tests are T021's `cms-public-reads.spec.ts`, which skips outside its coordinator;
the coordinator ran those 14 next. No test of the full run failed, the two that return the
runtime's content to draft among them (the note from #249).

**Targets.** A scratch script read every visible link, button, select, input and summary under
24 px high, with reduced motion preferred, at 1,440, 1,024, 768, 375 and 320 px. `/` has none at
any of the five. `/news` has two at each, both in the page's content and neither in the header or
the footer: the breadcrumb's "หน้าแรก" (20 px) and "ดูเฉพาะข่าวสุขภาพ" (21 px).

## Screenshots

After, at `94b8621`, with reduced motion preferred, so the pages show at rest:

```text
node scripts/capture-screenshots.mjs <dir> \
  after-home-<width>=/@<width> after-news-<width>=/news@<width>     # five widths each
scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
  scripts/screenshot-fixtures/<module>.ts <dir>                      # each module below
```

Before: this round captured none. `before-home-<width>` and `before-news-<width>` are #240's, from
the image branch `evidence/008-240-screenshots` at `696706d`, taken at `cba17a4` on `main` before
the feature's first promotion (PR #251). Since then the runtime's database took Feature 008's
model, the Service's icon (#248); promoting `main` again needs `--replace` and leaves verify's
content-model check failing (`docs/operations/development-quadlet.md` "Promote a new commit").
Between the two, #247 emptied the demo dataset's Quick Access menu (`DESIGN.md` §8.11) and #248
gave its Services their icons (the note from #248), so the before and the after differ by more
than the design.

`scripts/evidence-branch.sh` put the 70 images on the image-only branch
`evidence/008-250-screenshots`, at `488552158ba1d8dc3eafb5ab9cb484771d6032ee`.

Page heights in pixels: the after as the capture scripts printed them, the before from #240's
files.

| Page | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | --- | --- | --- | --- | --- |
| Homepage, before (`cba17a4`) | 5,736 | 6,016 | 7,105 | 5,835 | 6,164 |
| Homepage, after (`after-home`) | 5,541 | 5,704 | 7,557 | 6,344 | 6,866 |
| News list, before (`cba17a4`) | 1,534 | 1,527 | 2,069 | 3,472 | 3,426 |
| News list, after (`after-news`) | 1,501 | 1,494 | 2,030 | 3,447 | 3,449 |

The Homepage's heights after equal those `DESIGN.md` §8.2 held from #247 at `1faa861`; §8.2 now
names `94b8621`.

The missing-content cases, each the demo dataset's Homepage with one change, which the run takes
back:

| Case | Module, file prefix | 1,440 px | 1,024 px | 768 px | 375 px | 320 px |
| --- | --- | --- | --- | --- | --- | --- |
| Nothing Featured | `homepage-no-featured`, `home-no-featured` | 5,437 | 5,570 | 7,339 | 5,902 | 6,394 |
| No current Announcement | `homepage-no-announcements`, `home-no-announcements` | 4,747 | 4,832 | 6,639 | 5,694 | 6,168 |
| No Service | `homepage-no-services`, `home-no-services` | 5,069 | 5,150 | 6,841 | 5,594 | 6,018 |
| Four Services | `homepage-four-services`, `home-four-services` | 5,495 | 5,588 | 7,359 | 6,136 | 6,658 |
| No Leadership | `homepage-no-leadership`, `home-no-leadership` | 5,353 | 5,516 | 7,204 | 6,043 | 6,559 |
| Three Leadership, the third without a picture | `homepage-leadership`, `home-leadership-three` | 5,541 | 5,704 | 7,557 | 6,430 | 6,952 |
| Three Activities | `homepage-three-activities`, `home-three-activities` | 5,361 | 5,524 | 7,117 | 5,980 | 6,502 |
| Two News without a picture | `homepage-news`, `home-news-no-picture` | 5,541 | 5,704 | 7,557 | 6,344 | 6,866 |
| Three Quick Access shortcuts | `homepage-quick-access`, `home-quick-access` | 5,819 | 6,004 | 7,925 | 6,646 | 7,206 |
| A Featured item without a picture | `homepage-featured-visual`, `home-featured-visual` | 5,541 | not captured | not captured | 6,344 | 6,866 |

Two Leadership and an empty Quick Access menu are the demo dataset's own state, in `after-home`.
The Featured item without a picture was also captured with the menu open at 375 and 320 px.

## Spec #239's pending confirmations

Every one has a recorded answer; none is open.

| # | Confirmation | Answer |
| --- | --- | --- |
| 1 | The Service `icon` field | The field goes ahead (#239 comment 6786631899); built by #248 with a fixed set of 18 (#248 comment 6826430670). The ticket was not closed as not planned, so no document says every Service shows the standard icon. |
| 2 | The header's search link, no utility bar | Accepted (#239 comment 6786536858). |
| 3 | Four more colours, three type sizes | Accepted (#239 comment 6786536858). |
| 4 | New copy | Used as written (#239 comment 6786631899). |
| 5 | The tablet range from 640 px | Accepted (#239 comment 6786536858). |
| 6 | No map stand-in | Removed; the link stays (#239 comment 6786631899). |
| 7 | Motion | The prototype's motion (#239 comment 6786631899), then decorations that stand still, in place of the spec's "slowly drifting glows and rotating rings" (#249 comment 6838503280, item 1). The timing as built was accepted in this round's walkthrough (#250 comment 6841312242, item 2). |

## Walkthrough

After the 404 log was cleared, the Product Owner was given these steps, with the list under "What
the evidence does not cover" (#250 comment 6841248421):

1. the Homepage on a desktop, `http://127.0.0.1:4324/`, in a browser with motion allowed: the
   hero's entrance, each section's reveal, the hover effects;
2. the Homepage at 375 px in the browser's device mode;
3. the Homepage at 768 px in the browser's device mode;
4. `http://127.0.0.1:4324/news` under the new shell;
5. the missing-content screenshots above.

The Product Owner chose all four groups (steps 1, 2 and 3, 4, 5) as opened with nothing to fix,
and decided (#250 comment 6841312242):

- **the motion's timing:** "A รับตามที่สร้าง";
- **the tablet Homepage's height and the coverage below:** "A รับตามนี้". The built page is
  7,557 px at 768 px, 167 px above the prototype's 7,390 px accepted in spec #239, and 6,344 px at
  375 px against the prototype's 6,319 px at 390 px. A real phone and other browsers see the pages
  again before go-live;
- **the prototype:** "A builder + บันทึก" (below).

**What the app's log shows of the walkthrough.** Read at 01:43Z from 01:42Z: `/news` and
`/news/demo-news-health-fair` answered 200. The log's lines for `/` cannot be told from the
container's health check, and the log holds no window width, so it shows neither the Homepage
steps nor the widths; those rest on the Product Owner's answer. After the answers the 404 log held
no miss, residue reported RESIDUE: NONE with the 56 demo entries published, and verify VERIFY:
PASS at `94b8621`. The steps were public pages, read anonymously.

## What the evidence does not cover

- Browsers other than Chromium: every suite, capture and measure ran in Playwright's Chromium.
- A real phone or touch: the runtime answers on `127.0.0.1` only, so the phone and tablet steps
  were the browser's device mode.
- Real Leadership pictures: the demo dataset has two Leadership.
- Real Announcement dates and categories: the dataset's Announcements have none, so every badge is
  the general colour and no row shows a status line (the note from #245, which names its fixture
  for each colour and the status line). The closed status fill shows on no page (the same note).
- Health Content with pictures: the dataset's has none (the note from #246, which names the suite's
  card with one). The prototype's dots on the Health Service Discovery band were not built (the
  same note).
- Activities with dark or busy pictures: the dataset's are light (the note from #247, which names
  the fixture that measured the contrast over a white picture).
- The MOIT page's table of contents under the sticky header: #240 measured nothing there (the note
  from #240). The full run's keyboard walk of every page passed.
- A built, minified stylesheet seen in a browser with motion allowed. By the note from #249 the
  runtime serves the stylesheet unminified and `npm run build:check` reads the built one, which
  exited 0 here; the look at a built page is due with the first production image of this feature.
- A browser without scroll-driven animation: none is installed (the note from #249).
- A real return from the browser's back/forward cache after a form's submit.
- A telephone text that is not one number at widths other than 320 px, a contact card without a
  telephone, and a real map opened from "เปิดแผนที่".
- The Quick Access section on the runtime's own Homepage: the dataset leaves its menu empty, and
  the fixture's screenshot shows it.
- The before screenshots as a control of this round: they are #240's.

## The prototype

The Homepage prototype is on the branch `prototype/home-redesign`, a child of `94b8621` outside
`main`: its sixteen builder scripts under `docs/prototypes/home-redesign/` and its record,
`docs/prototypes/home-redesign.md`. `scripts/migration.ts leak-check` passes those files. It
reports Legacy site content in the prototype's `data.json`, `home-bold.html` and
`home-bold-empty.html`, so the data, the built pages, the pictures, the screenshots and the
captures of the two reference sites stay off the public branch, on the Product Owner's word (#250
comment 6841312242, item 4). The branch's commit was made with `git commit-tree`, with the
pre-commit checks run by hand on its files; its `knip.jsonc` ignores `docs/prototypes/**`.
